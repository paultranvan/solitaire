# Leaderboard worker

Cloudflare Worker + D1 database behind the shared (cross-player) leaderboard.
The app sends a finished game as `seed + draw mode + move list + duration +
display name`; the worker re-deals from the seed, replays the moves through the
app's own engine (`../src/game`), and stores the entry only if the replay ends
in a win. The score is always computed here, never taken from the client.

## API

| Request                                 | Purpose                                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /v1/scores`                       | Submit a game. `201` + `{accepted: true, score, rank, total}` when stored, `200` + `accepted: false` if that deal was already on the board. |
| `POST /v1/past-scores`                  | Submit up to 10 past wins (`{name, entries: [{seed, drawCount, durationSec, moves, dateMs}]}`). `200` + `{accepted: <how many were new>}`.  |
| `GET /v1/leaderboard?draw=1\|3&limit=N` | Top scores for a draw mode (default 50, max 100).                                                                                           |

Rejections are `{error: "<reason>"}`: `400` malformed (`bad-seed`, `bad-name`,
`bad-moves`, …), `403` past scores closed, `413` body over 256 KB, `415` not
JSON, `422` well-formed but not accepted (`illegal-move`, `not-won`,
`too-fast`), `429` rate-limited.

## What is and isn't verified

- **Verified:** the game is a real win on that deal, and the move count.
- **Not verifiable:** the duration, which the client reports. A floor per
  hand-played move rejects the physically implausible; a solver replayed at
  human pace is indistinguishable from a strong player.
- One entry per deal and draw mode — the first verified submission stands.
- Display names are restricted to letters, digits and a few separators, but
  there is no profanity filter. Remove an entry by hand if needed (below).

## Past wins

Games won before the leaderboard existed have no move list — the app only kept
their duration and move count — so they cannot be replayed. To carry over what
the app's first players had achieved, the first time a player publishes the
app sends their three best past wins per draw mode to `/v1/past-scores`, once.
Players see these entries like any other. **Nothing in such an entry is
proven**; anyone can post one by hand. What limits the damage:

- Only wins dated before 1 December 2026 (UTC) are taken — later ones have a
  move log and go through `/v1/scores`. The date is declared, so this bounds
  what the import is for, not who can use it.
- The score is computed here from the declared duration and move count, both
  held to what a real game can produce (at least 30 s; at least 76 moves in
  draw 1, 60 in draw 3). That caps what an invented entry can claim at roughly
  a very good real score.
- Entries are stored with `verified = 0`. The flag is never sent to the app;
  it exists so these rows can be found and removed.
- Such an entry never displaces an existing one, and a verified win on the
  same deal replaces it.
- A tighter rate limit (`PAST_LIMITER`), 10 entries per request.
- `PAST_SCORES` in `wrangler.jsonc`: set it to anything but `"on"` and redeploy
  to stop accepting them. The rules themselves live in
  `../src/leaderboard/pastWins.ts`, shared with the app.

Once the existing players have updated, or if that door gets abused, close it
(and, in the second case, delete what came through it — see Moderation).

## Local development

```bash
(cd .. && npm ci)          # the engine's own dependencies (the seeded shuffle)
npm install
npm run db:migrate:local   # creates the local SQLite database
npm run dev                # http://localhost:8787
npm run typecheck
```

The worker bundles files from `../src`, which resolve their imports in the
repo root's `node_modules` — hence the root install, for `dev` and `deploy`
alike.

Unit tests for the validation logic live in `src/__tests__` and run with the
app's suite (`npm run test:run` from the repo root).

## Deployment

The worker is live at <https://solitaire-leaderboard.ptranvan.workers.dev>. Its
D1 database is in Western Europe (the id is in `wrangler.jsonc`).

**CI deploys it.** The `worker` job of `.github/workflows/deploy-pages.yml`
runs on every push to `master`, after lint and tests and before the web app is
published. When the push touched the worker or anything it bundles (listed
under "Keeping the worker in step with the app"), the job typechecks the
worker, applies pending migrations and deploys. Otherwise it does nothing. If
it fails, the web app is not published either, so the app never ships ahead of
its server.

The job needs two repository secrets (Settings → Secrets and variables →
Actions → Secrets):

- `CLOUDFLARE_ACCOUNT_ID` — the account id printed by `npx wrangler whoami`.
- `CLOUDFLARE_API_TOKEN` — created in the Cloudflare dashboard (My Profile →
  API Tokens → Create Token) from the "Edit Cloudflare Workers" template, with
  one permission added: Account · D1 · Edit, which the migrations need. Limit
  it to this account. Then `gh secret set CLOUDFLARE_API_TOKEN` and paste it
  at the prompt, so it never lands in a shell history.

Without them the job stops with a message saying so. A token that lacks a
permission fails later, in the migration or deploy step, with an
authentication error; fix the permission in the dashboard (the token's value
does not change) and re-run the job.

To deploy by hand instead — CI unavailable, or trying a branch:

```bash
npx wrangler login         # once per machine
npm run db:migrate:remote  # only when migrations/ has a new file
npm run deploy             # prints the worker's https://….workers.dev URL
```

The URL is baked into every app build, so the account's `workers.dev`
subdomain (`ptranvan`) must not be renamed: installed Android versions would
lose the leaderboard.

To rebuild from nothing instead (another account, a lost database): run
`npx wrangler d1 create solitaire-leaderboard --location weur`, replace
`database_id` in `wrangler.jsonc` with the one it prints, then migrate and
deploy as above.

`ALLOWED_ORIGINS` in `wrangler.jsonc` lists the origins whose pages may call
the API from a browser.

## Keeping the worker in step with the app

The worker is a snapshot of this repository taken at its last deploy: it
carries its own copy of the game engine and of the shared rules, and keeps
running that copy until the next one. So a change to the game is not live on
the server until the worker has been redeployed.

### When a deploy is needed

After any change to:

- `worker/` itself — code, `wrangler.jsonc`, a new migration;
- `src/game/` — the rules, the moves, the deal, the score formula. Everything
  `replay.ts` and `score.ts` reach is bundled;
- `src/leaderboard/name.ts`, `seed.ts`, `pastWins.ts` — the rules both sides
  apply;
- the root `package-lock.json` — it pins `seedrandom`, which the deal depends
  on.

**For pushes to `master`, CI takes care of it**: those are exactly the paths
the `worker` job watches (the list lives in the workflow — keep the two in
sync if the worker starts bundling something else). A push that changes none
of them leaves the worker alone. Running the workflow by hand from the Actions
tab always deploys.

What CI does not do:

- **Android releases.** They are built from a tag by other workflows, which do
  not touch the worker. Tag a commit that is already on `master` and whose
  deploy run is green; then the worker it needs is already live.
- **Anything deployed by hand from a branch** — the next `master` deploy
  replaces it.
- **Rescoring** after a score formula change, and **keeping old app versions
  working** — both below.

To see whether the live worker is behind, look at the last run of the workflow,
or compare the last deployment with the last commit that touched those paths
(from the repo root):

```bash
(cd worker && npx wrangler deployments list)   # "Created:" of the newest entry
git log -1 --format='%cd  %h %s' -- worker src/game package-lock.json \
  src/leaderboard/name.ts src/leaderboard/seed.ts src/leaderboard/pastWins.ts
```

### What goes wrong when the worker is behind

This is what the job ordering prevents, and what a hand deploy done in the
wrong order would cause:

- **A rule or move changed:** games from the new app build are replayed with
  the old rules and refused (`bad-moves`, `illegal-move`, `not-won`). The app
  does not retry a refusal — the player reads "The leaderboard did not accept
  this score" and that win is lost to the leaderboard for good.
- **The score formula changed:** the worker keeps computing the old one, so the
  world ranking and the score shown on the win screen disagree.
- **A name or past-win rule changed:** the app accepts input the server then
  refuses, or the reverse.

### Order of operations

CI follows it; do the same by hand:

1. Apply the migrations, if `migrations/` has a new file. Write migrations
   the running worker can live with (add columns, don't rename or drop them),
   since it keeps serving until step 2.
2. Deploy the worker.
3. Only then release the app build that relies on the change (the Pages
   deploy for the web, the Android release).

The reverse matters just as much: **the worker must keep accepting what
released app versions send.** The web app updates at once, but Android players
keep an old build for weeks, with its own copy of the engine. So never remove
or rename a request field, never tighten what an existing build sends, and
keep engine changes replay-compatible (an old build's winning game must still
replay as a win). A change that can't meet that needs a new route (`/v2/…`)
next to the old one.

### After a score formula change

Stored rows keep the score they were given; nothing recomputes them. The app
rescores its local history on every load (`normalizeStats`), so do the same
for the board once the new worker is live. The score is a pure function of
three stored columns — for the formula as of this writing:

```bash
npx wrangler d1 execute solitaire-leaderboard --remote --command "
  UPDATE scores SET score =
    (500 + MAX(0, 6000 - 10 * duration_sec) + MAX(0, 6000 - 20 * moves))
    * CASE draw_count WHEN 3 THEN 2 ELSE 1 END"
```

Rewrite that expression to match `src/game/score.ts` before running it.

### Wrangler itself

Wrangler is pinned to an exact version in `package.json`: it runs with the
Cloudflare login and can change the database, so it is upgraded on purpose,
not by a stray `npm install`. To upgrade, bump the version, `npm install`,
`npm run typecheck`, try `npm run dev`, then deploy. `compatibility_date` in
`wrangler.jsonc` freezes the runtime's behaviour and only needs moving when a
newer runtime feature is wanted.

## Switching the app on

The app only talks to the worker when it is built with its URL:

```bash
VITE_LEADERBOARD_URL=https://solitaire-leaderboard.ptranvan.workers.dev npm run build
```

That switches the leaderboard UI on and adds the worker's origin to the app's
Content-Security-Policy. Without the variable the feature stays off.

The GitHub workflows (Pages, Android release, Firebase distribution) read it
from the repository variable `LEADERBOARD_URL` (Settings → Secrets and
variables → Actions → Variables), so:

```bash
gh variable set LEADERBOARD_URL --body https://solitaire-leaderboard.ptranvan.workers.dev
```

turns the feature on for every build that follows, and deleting the variable
turns it back off. Before the first build with it set, the privacy policy
(`public/privacy-policy.html`) and the Play Console "Data safety" form must
describe the leaderboard.

To try the whole flow locally, run `npm run dev -- --port 8799` here and build
the app with `VITE_LEADERBOARD_URL=http://127.0.0.1:8799`.

## Moderation

```bash
# One entry
npx wrangler d1 execute solitaire-leaderboard --remote \
  --command "DELETE FROM scores WHERE id = 123"

# Look at the unverified entries, newest arrivals first
npx wrangler d1 execute solitaire-leaderboard --remote \
  --command "SELECT id, name, draw_count, score, duration_sec, moves, created_at FROM scores WHERE verified = 0 ORDER BY created_at DESC LIMIT 50"

# Every unverified entry that arrived after a given moment (ms since epoch)
npx wrangler d1 execute solitaire-leaderboard --remote \
  --command "DELETE FROM scores WHERE verified = 0 AND created_at > 1800000000000"
```

`created_at` is when a row reached the server; for a past win (`verified = 0`)
the date shown to players is `played_at`, which the player declared.
