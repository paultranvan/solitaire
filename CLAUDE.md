# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # vite dev server on http://localhost:5173 (host:true, accessible on LAN)
npm run test       # vitest in watch mode
npm run test:run   # single-shot vitest run (use this for CI / scripted checks)
npm run lint       # eslint . (TS + react-hooks rules)
npm run build      # tsc --noEmit + vite build (writes to dist/)
npm run format     # prettier --write .
```

Run a single test file: `npx vitest run src/game/__tests__/moves.test.ts`
Run a single test by name: `npx vitest run -t "tableau to foundation"`

Path alias `@/*` resolves to `src/*` (configured in both `tsconfig.json` and `vite.config.ts`).

The README documents the high-level stack, project layout, feature set, and the
native (iOS/Android) build flow; don't duplicate that here.

## Architecture

### Layered design — `game/` is a pure library

`src/game/` imports nothing from elsewhere in `src/`. It's a standalone Klondike
engine: types (`card`, `state`), pure rules (`rules`, `canApply`), the
`Move`-applying reducer (`moves.applyMove`), the seeded deal (`deck`), the
hint / auto-move planners (`hints`, `auto`), the bounded winnability solver
(`solver`, plus its `solver.worker` entry and `solverClient` host wrapper),
and the win `score` formula. Everything else (stores, UI, dnd, persistence)
sits on top and treats `game/` as a black box.

Outer layers:

- `store/gameReducer.ts` — thin React reducer wrapper around `applyMove`. Catches
  `InvalidMoveError` and returns the prior state; rethrows everything else.
- `store/{statsStore,settingsStore}.ts` — Zustand + immer stores, each
  hydrated from and persisted to IndexedDB. `store/records.ts` is a pure
  helper (not a store) that derives the leaderboard / rankings / medals from
  the stats store's game log.
- `persistence/db.ts` — `idb-keyval` wrapped with an `{ schemaVersion, data }`
  envelope per key (`KEY_GAME`, `KEY_STATS`, `KEY_SETTINGS`). All reads return
  `null` on schema mismatch / parse failure rather than throwing.
- `persistence/gameAutosave.ts` — 250 ms debounced autosave hook; clears the
  saved game on win (`isWon`).
- `dnd/` — translates dnd-kit drag source + drop target into a `Move`. Drop ids
  are short strings: `t:<col>` for tableau, `f:<idx>` for foundation
  (`parseDropId`). `resolveMove` only builds the candidate Move; `applyMove`
  enforces game rules.
- `src/App.tsx` (the root component, not under `ui/`) boots: hydrate stores →
  load saved game or deal a new one → render `<Board>`.
- `ui/` — React components. `Board.tsx` is the orchestrator: reducer + dnd
  context + auto-complete loop + win detection + sheets. `i18n/` backs all
  user-facing strings (`useT`); English + French, locale-auto-detected.

### Game state is immutable; history lives inside it

`GameState.history: GameState[]` holds prior snapshots, capped at
`HISTORY_CAP = 200` (see `moves.ts`). `applyMove` returns a fresh state via
`cloneState` (which crucially clears `history` on the snapshot to prevent
geometric blow-up), then pushes the prior state onto `next.history`. `undo`
pops the last snapshot. **Anywhere you mint a new `GameState` outside
`applyMove` (`createInitialState`, `handleNewGame`, `handleRestart`) you must
keep `schemaVersion: 1` and reset `history: []`** — otherwise loaded saves and
stats can drift.

### Foundations are NOT pre-assigned to suits

The 4 foundation slots accept any suit; the visual suit hint on empty piles is
decorative. Auto-move (`game/auto.ts`) and hints (`game/hints.ts`) both scan
all 4 piles for a legal landing via `findFoundationFor` in `rules.ts`. This
invariant has caused regressions before; read the comment at the top of
`auto.ts` before touching foundation routing.

### Animation contract (motion/react + layoutId)

Shared-element animation between piles works via `layoutId={card.id}`. The
non-obvious rules:

- `<LayoutGroup id={state.seed}>` in `Board.tsx` is keyed by the deal's seed.
  A new deal contains all 52 ids again, so the group must reset — without the
  key, layout transitions bridge between games.
- `Card.tsx` sets `key={card.id}` on the `motion.div`. Without this, when a
  parent slot's `card` prop swaps (e.g. the talon top after a draw), motion
  reuses the same node and its shared-layout crossfade fades the new card
  _into_ the old one. See the inline comment.
- After a drag-drop, `Board` flips `skipLayoutAnim` true for one render via a
  context provider so the dropped card doesn't fly from the source slot
  (visually it was at the cursor, not the slot). Auto-moves keep the
  animation, so `handleAutoMove` wraps `dispatch` in `flushSync` — without
  it, multi-card layout tweens flicker because some cards paint at the
  destination one frame before the layoutId transform pulls them back.
- Card flip uses plain CSS (`Card.css`) rather than a motion value, because
  motion's `resetSkewAndRotation` step strips `rotateY` for 1–2 ms during
  every layout measurement. The browser can paint that gap, flashing card
  backs across the whole board.

If you change animation behavior, smoke-test: draw a card, drag a stack onto a
column, double-tap a card to auto-move to a foundation, and start a new game
mid-animation. All four are flicker-prone.

### Board sizing and the fan squeeze (CSS-only)

Everything on the board is sized off `--card-w` (`ui/theme.css`); don't size
board elements in px. The non-obvious couplings:

- `--card-w` is the smaller of a width fit and a height fit, so on
  desktop / landscape the top row plus a 4.6-card-tall tableau (a full
  king-to-ace run at the tightest fan) always fits under the top bar and play
  never needs page scrolling. Phones are width-bound and unaffected.
- The height fit needs the top bar's real height. `--topbar-total` mirrors
  `.topbar`'s box model (`--topbar-h`, unless the padding is taller — which is
  the case on native, where `native/lifecycle.ts` raises `--safe-top` and
  `--topbar-pad-bottom`). Change one, change the other.
- Long columns squeeze instead of running off-screen: `TableauColumn.tsx` sets
  `--n-down` / `--n-up` on the column, and `TableauColumn.css` derives
  `--fan-up-col` / `--fan-down-col`, clamped between `--fan-*-min` and the
  defaults so the column fits `--tableau-avail`. The rank's size and offset in
  `Card.css` are tuned so the 0.30·card-h minimum strip still clears it.
- The drag overlay can't inherit a per-column fan, so `measureColumnFan` in
  `Board.tsx` reads the live step at drag start and hands it to `DragLayer`.
- The page scrollbar is hidden (the page can still scroll in the rare overflow
  case): a classic scrollbar popping in would shift the centred board sideways.
- Card-back designs (`.card--back--<id>`) are `background`-only, because the
  same classes are used bare on the menu swatches and the crossfade overlay.
  The felt grain and back emblem are inline SVG data URIs — same-origin, so
  they pass the CSP.

### Drag/drop collision and activation

`Board.tsx` uses a custom `CollisionDetection`: `pointerWithin` first, falling
back to `closestCenter` when the pointer is in a gap. `pointerWithin` handles
the heavy negative margins between stacked tableau cards better than
`rectIntersection` (which would prefer the source column). PointerSensor
activates after 5 px of movement; TouchSensor uses a 200 ms delay + 6 px
tolerance to coexist with single-tap auto-move (anything below ~150 ms
swallows clicks on real devices).

### Persistence / hydration order

`App.tsx` hydrates settings + stats _before_ loading the saved game, because
the new-game default `drawCount` comes from settings. The saved-game loader
returns `null` on schema mismatch _and_ on a fully-foundation-stacked state
(belt-and-braces — the autosave clears on win, but defend anyway).

### Stored and imported data is untrusted

Anything read back from IndexedDB or from an imported backup file is validated
and rebuilt field-by-field before it reaches a store: `parseSavedGame`
(`persistence/gameAutosave.ts`, requires exactly one full deck),
`sanitizeGameRecord` (`store/statsStore.ts`, used by both hydration and
`parseImport`), and `sanitizeSettings` (`store/settingsStore.ts`). Invalid
input falls back to defaults / is dropped rather than thrown. On GitHub Pages
the origin is shared with other projects, so these blobs can be written by
code that isn't ours — and a bad one is reloaded on every boot. When you add a
persisted field, add it to the matching sanitizer or it will be silently
discarded on load.

### Content-Security-Policy

`vite.config.ts` injects a strict CSP `<meta>` into the production
`index.html` only (the dev server needs inline scripts). Everything must be
same-origin: no inline `<script>`, no remote scripts/fonts/images, no network
calls. If a new dependency needs more, widen the specific directive there
rather than dropping the policy, and re-check the built app's console for
violations.

### Winnable-only deals run off the main thread

When the `requireWinnable` setting is on, `handleNewGame` in `Board.tsx` calls
`findWinnableSeed` (`game/solverClient.ts`), which drives the bounded solver
inside a lazily-spawned Web Worker (`solver.worker.ts`) so the hunt for a
provably-solvable seed never blocks the UI. The solver is budget-bounded
(`deadlineMs` / `maxNodes`) and may return `unknown`; the feature treats
`unknown` as unsolvable and reshuffles. Successive new-game clicks must abort
the in-flight request — `Board` tracks and cancels it (and on unmount). If you
touch new-game routing, preserve that cancellation or stale deals can land.

### Native shell

Capacitor 8 wraps the web build (`webDir: dist`). `src/native/lifecycle.ts`
guards everything with `Capacitor.isNativePlatform()` so the same bundle runs
on web. `android/` is committed and built by the `release-android` GitHub
workflow, which on each published release signs both an APK (attached to the
release) and an AAB (a workflow artifact — the Play Store only accepts
bundles). The keystore in the repo secrets is Play's registered _upload_ key,
so it must not be rotated casually. `ios/` is still gitignored until
signing/icons are final.

## Tests

Vitest + jsdom (`vite.config.ts → test`); setup at `src/test-setup.ts` pulls in
`@testing-library/jest-dom` matchers. Tests live next to their subject in
`__tests__/` directories. Shared factories live in `src/test-utils/`. The
bulk of coverage is on `src/game/` — every `Move` kind has legal/illegal
cases, undo round-trips, history-cap enforcement, solver soundness, scoring,
and integration coverage — with further suites across `store/` (reducer,
stats, settings, records), `persistence/` (stats backup round-trips), and
`dnd/`. UI tests cover `Board`, `RecordsPanel`, and the `format` / card-rank
helpers.

## Conventions

- TypeScript strict mode, `noUnusedLocals` and `noUnusedParameters` on. Prefix
  intentionally-unused names with `_` (matches the eslint rule).
- ESLint ignores `dist`, `node_modules`, `ios`, `android`, `.superpowers`.
- React 18 StrictMode is enabled (`main.tsx`) — every effect runs twice in
  dev. The autosave debounce, audio prime listener, and timers all tolerate
  this; new effects must too.
- Prettier formatting is the source of truth (`.prettierrc.json`). Run
  `npm run format` before committing if unsure.
