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
npm install
npm run db:migrate:local   # creates the local SQLite database
npm run dev                # http://localhost:8787
npm run typecheck
```

Unit tests for the validation logic live in `src/__tests__` and run with the
app's suite (`npm run test:run` from the repo root).

## Deployment

The worker is live at <https://solitaire-leaderboard.ptranvan.workers.dev>. Its
D1 database is in Western Europe (the id is in `wrangler.jsonc`) and has the
schema applied. To publish a change to the worker:

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
