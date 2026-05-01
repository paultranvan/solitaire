# Solitaire Reboot — Design Spec

**Date:** 2026-05-02
**Branch:** `2026-reboot`
**Status:** Approved (brainstorm) — ready for implementation planning

## Goal

Rebuild the existing React 17 + Redux + react-dnd Klondike solitaire from scratch with:

- High visual polish (cards, table, drag-and-drop, animations)
- First-class mobile experience (touch + responsive)
- Distribution on web, iOS, and Android from a single codebase
- Local stats tracking
- Fast cold start and smooth in-game performance

The previous app stays accessible on `master`; the rebuild lives on `2026-reboot`.

## Decisions locked in (from brainstorming)

| Topic | Decision |
| --- | --- |
| Platform | Web + iOS + Android via **Capacitor** (single web codebase, native shells) |
| Stack | **React 18 + TypeScript + Vite**; PWA via `vite-plugin-pwa` |
| Drag-and-drop | **dnd-kit** (PointerSensor + TouchSensor + KeyboardSensor) |
| Animations | **Motion** (formerly Framer Motion); springy personality |
| State management | **Zustand** with `immer` middleware |
| Persistence | **IndexedDB** via `idb-keyval` |
| Visual style | Classic felt (green table, serif card faces) |
| Mobile layout | Fit all 7 tableau columns at phone width (no horizontal scroll) |
| Game variant | Klondike, player picks draw 1 or draw 3 at New Game |
| Redeals | Unlimited |
| QoL features | Auto-flip top of column · auto-move on double-tap · auto-complete cascade · hint button · unlimited undo · timer · move counter |
| Stats v1 | Per-mode played/won/best-time/fewest-moves, current/longest streak, total time. Local-only, history-ready schema. |
| Auto-resume | Yes — closing mid-game restores exact state on reopen |
| Audio | SFX on by default; mute toggle in settings |
| Haptics | Native on iOS/Android via `@capacitor/haptics`; Vibration API fallback on web |
| Settings | sound · haptics · animations · draw count · auto-move on tap · L/R-handed (mirrors top row) |
| First launch | Drop directly into a fresh game (no menu) |
| Out of scope (v2+) | Daily challenge · cloud sync / accounts · other variants (FreeCell, Spider…) · achievements · alternate themes · tutorial · E2E tests |

## Tech stack — concrete versions and roles

- `react` 18, `react-dom` 18
- `typescript` 5.x, strict mode
- `vite` 5.x with `@vitejs/plugin-react`
- `vite-plugin-pwa` for service worker + manifest
- `zustand` + `immer` middleware (Zustand's built-in middleware)
- `@dnd-kit/core`, `@dnd-kit/utilities`
- `motion` (the new package; formerly `framer-motion`)
- `idb-keyval` for IndexedDB
- `howler` for SFX
- `vitest` + `@testing-library/react` + `@testing-library/user-event` + `jsdom`
- `eslint` (flat config) + `prettier`
- Capacitor: `@capacitor/core`, `@capacitor/cli`, plus plugins `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/preferences`, `@capacitor/app`, `@capacitor/splash-screen`

## Module layout

```
src/
  game/                pure logic, no React, no DOM
    card.ts            Card / Suit / Rank types and helpers
    deck.ts            seedable shuffle + Klondike deal
    state.ts           GameState type + initial state factory
    rules.ts           canPlaceOnTableau / canPlaceOnFoundation / isWon / isAutoCompletable
    moves.ts           Move union + applyMove(state, move) reducer
    hints.ts           bestNextMove(state)
    auto.ts            findAutoMoveTarget / autoCompleteSequence
    __tests__/         vitest unit tests

  store/               Zustand stores (depend on game/)
    gameStore.ts       current GameState + undo history; exposes actions that wrap moves
    statsStore.ts      lifetime stats
    settingsStore.ts   preferences

  persistence/         IndexedDB read/write
    db.ts              idb-keyval wrapper with schemaVersion envelopes
    autosave.ts        debounced game save subscriber

  ui/                  React components
    App.tsx            theme + boot sequence
    Board.tsx          layout root, CSS var sizing, dnd-kit context
    TopBar.tsx         timer / moves / undo / hint / menu
    Stock.tsx          + Talon.tsx
    Foundations.tsx
    Tableau.tsx        + TableauColumn.tsx
    Card.tsx           single card, faces front/back, drag handle
    DragOverlay.tsx    Motion-driven floating stack during drag
    WinSheet.tsx       celebration + stats summary
    StatsSheet.tsx
    SettingsSheet.tsx
    NewGameSheet.tsx   draw-count picker

  dnd/                 dnd-kit setup
    sensors.ts
    collision.ts       rectangle-intersection biased to column tops

  motion/              shared spring presets, layoutId helpers
    presets.ts

  audio/               SFX
    sounds.ts          Howler instance + sprite map
    play.ts

  haptics/             native + web wrapper
    haptics.ts

  app.tsx, main.tsx, index.css
```

**Hard rule:** `game/` imports nothing else from `src/`. It is a self-contained library. Tests for `game/` run with no DOM and no React.

## Game model

### Types

```ts
type Suit = 'h' | 'd' | 's' | 'c';
type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

type Card = {
  id: string;          // stable: `${suit}${rank}` — used as Motion layoutId
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
};

type GameState = {
  schemaVersion: 1;
  tableau: Card[][];           // 7 columns; last item = top of pile
  foundations: Card[][];       // 4 piles, indexed 0..3 by suit slot
  stock: Card[];               // face-down, last = next-to-deal
  talon: Card[];               // face-up, last = visible top
  drawCount: 1 | 3;
  startedAt: number;           // ms epoch
  movesMade: number;
  redealCount: number;
  seed: string;
  history: GameState[];        // for undo, capped at ~200; never includes its own .history
};
```

### Move union

```ts
type Move =
  | { kind: 'draw' }
  | { kind: 'recycle' }                                        // talon back to stock
  | { kind: 'tableauToTableau'; from: number; cardIndex: number; to: number }
  | { kind: 'tableauToFoundation'; from: number; foundationIdx: number }
  | { kind: 'talonToTableau'; to: number }
  | { kind: 'talonToFoundation'; foundationIdx: number }
  | { kind: 'foundationToTableau'; foundationIdx: number; to: number }
  | { kind: 'flip'; column: number };                          // auto-flip new top of tableau column
```

`applyMove(state, move)` is a pure function:

1. Validate against rules; throw `InvalidMoveError` if illegal (callers in UI should pre-validate).
2. Push prior state (without `.history`) to history, capped.
3. Mutate via Immer.
4. After any tableau-affecting move, if the new top of an affected column is face-down, automatically chain a `flip` move (still one logical history entry).
5. Increment `movesMade`.

`undo(state)` pops the last history entry. If there is no history, it's a no-op.

### Validation rules (`rules.ts`)

- **Tableau drop**: target empty → only K is allowed; otherwise dragged card must be one less rank, alternating color from the column's top.
- **Foundation drop**: dragged card must be the next ascending rank of the same suit; empty foundation accepts only A.
- **Stack drag from tableau**: cards from `cardIndex` to top must already form a valid descending alternating-color run; that's enforced when picking up, not on drop.
- **Recycle**: only allowed when stock is empty.
- **isWon**: all foundations have 13 cards.
- **isAutoCompletable**: all face-down counts are 0 *and* talon + stock are empty.

### Hints (`hints.ts`)

`bestNextMove(state): Move | null` — strategy:

1. Any move from talon/tableau to foundation (prefer suits that are most behind).
2. Any tableau-to-tableau move that exposes a face-down card.
3. Any tableau-to-tableau move that opens an empty column (non-K bottom).
4. Talon to tableau if it enables a future foundation move.
5. Otherwise null.

Hint UI: highlights the source card with a pulse ring and the destination with a glow. Does not auto-execute.

### Auto-move (`auto.ts`)

Given a card the user double-tapped, pick the best legal target:

1. Foundation if eligible.
2. A tableau column whose move exposes the maximum face-down cards (or, in case of ties, the leftmost column).
3. Otherwise null.

Auto-complete sequence: while `isAutoCompletable(state)`, find any tableau-top-to-foundation move and dispatch it on a 70ms stagger.

## State management

Three Zustand stores, each with `immer` middleware.

### `gameStore`

```ts
type GameStore = {
  state: GameState;
  // actions
  newGame(opts: { drawCount: 1 | 3; seed?: string }): void;
  applyMove(move: Move): void;
  undo(): void;
  drawFromStock(): void;          // wraps applyMove({kind:'draw'}) or recycle if needed
  autoMoveFrom(source: AutoMoveSource): void;
  hydrate(state: GameState): void;
};
```

UI components subscribe via narrow selectors (e.g. `useGameStore(s => s.state.tableau[i])`) so unrelated changes don't re-render.

### `statsStore`

```ts
type Stats = {
  schemaVersion: 1;
  byMode: { '1': ModeStats; '3': ModeStats };
  currentStreak: number;
  longestStreak: number;
  totalSecondsPlayed: number;
};
type ModeStats = {
  played: number;
  won: number;
  bestTimeSec: number | null;
  fewestMovesWin: number | null;
};
```

Updated only on game-end (win or "abandon when starting a new game over an active one").

- Win: `played++, won++, recompute bests, currentStreak++, totalSecondsPlayed += elapsed`.
- Abandon/loss: `played++, currentStreak = 0, totalSecondsPlayed += elapsed`.

Schema is intentionally extensible — adding a `history: GameRecord[]` later won't break older saves (handled by `migrate()`).

### `settingsStore`

```ts
type Settings = {
  schemaVersion: 1;
  drawCount: 1 | 3;
  sound: boolean;
  haptics: boolean;
  animations: boolean;
  autoMoveOnDoubleTap: boolean;
  handedness: 'right' | 'left';
};
```

Defaults: drawCount 1, sound on, haptics on, animations on, autoMove on, handedness right.

## Persistence

`persistence/db.ts` wraps `idb-keyval` with three keys: `'game'`, `'stats'`, `'settings'`. Every blob has `{ schemaVersion, data }`. Reads run through `migrate()`, which knows how to upgrade older versions and falls back to defaults on unknown ones.

`persistence/autosave.ts` subscribes the three stores:

- gameStore: writes debounced 250ms after any state change.
- statsStore: writes immediately.
- settingsStore: writes immediately.

On boot:

1. Read `'settings'` and `'stats'` → hydrate stores synchronously (or display a thin splash until ready).
2. Read `'game'` → if present and `!isWon(state)`, `gameStore.hydrate(state)`. Otherwise `gameStore.newGame({ drawCount: settings.drawCount })`.

On game-end: clear `'game'`, recompute stats, write `'stats'`.

## UI / layout

### Sizing

A single CSS variable `--card-w` is computed at the `<Board>` level:

```
--card-w: clamp(38px, calc((100vw - 32px) / 7.5), 80px);
--card-h: calc(var(--card-w) * 1.4);
```

Every card, slot, and gap is expressed in `var(--card-w)`. Board re-flows automatically at any viewport.

### Layout zones

```
┌──────────────────────────────────────────────────────────────┐
│  ⏱ 00:42   ♠ 17                            ↺  💡  ☰        │  TopBar
├──────────────────────────────────────────────────────────────┤
│  ┌──┐ ┌──┐               ┌──┐ ┌──┐ ┌──┐ ┌──┐                │
│  │S │ │T │               │F1│ │F2│ │F3│ │F4│               │  StockTalon + Foundations
│  └──┘ └──┘               └──┘ └──┘ └──┘ └──┘                │
│                                                              │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                         │
│  │  │ │▒▒│ │▒▒│ │▒▒│ │▒▒│ │▒▒│ │▒▒│                         │  Tableau (7 columns,
│  └──┘ │▒▒│ │▒▒│ │▒▒│ │▒▒│ │▒▒│ │▒▒│                         │  fanned vertically)
│       └──┘ │▒▒│ │▒▒│ │▒▒│ │▒▒│ │▒▒│                         │
│            └──┘ │▒▒│ │▒▒│ │▒▒│ │▒▒│                         │
│                  ...                                         │
└──────────────────────────────────────────────────────────────┘
```

When `handedness === 'left'`, the top row mirrors so the stock/talon are on the right.

### Components

- `<Board>`: top-level CSS grid; sets `--card-w`; mounts `<DndContext>`. Manages safe-area padding on iOS via `env(safe-area-inset-*)`.
- `<TopBar>`: `position: sticky` at top; menu button opens a bottom sheet route.
- `<StockArea>`: stock + talon side by side. Tapping stock dispatches `draw` (or `recycle` when empty).
- `<Foundations>`: 4 droppable slots.
- `<Tableau>`: 7 `<TableauColumn>`s.
- `<TableauColumn>`: renders cards in a vertical fan; each card is a draggable.
- `<Card>`: handles face-up/face-down rendering, flip animation, double-tap detection (custom — pointerdown timing because click events fight drag activation).
- `<DragOverlay>`: dnd-kit's overlay portal; renders the picked stack with the springy lift.
- `<WinSheet>` / `<StatsSheet>` / `<SettingsSheet>` / `<NewGameSheet>`: bottom sheets, the same component shell with different content.

## Drag-and-drop

### Sensors

- `PointerSensor` activation: `{ distance: 5 }`
- `TouchSensor` activation: `{ delay: 100, tolerance: 6 }` — keeps short taps free for double-tap auto-move.
- `KeyboardSensor` for accessibility.

### Drag data

```ts
type DragSource =
  | { kind: 'tableauStack'; column: number; fromIndex: number }
  | { kind: 'talonTop' }
  | { kind: 'foundationTop'; foundationIdx: number };

type DragData = {
  source: DragSource;
  cards: Card[];   // 1+ cards (only tableauStack can be >1)
};
```

### Droppables

- 7 tableau columns (id `t-0`..`t-6`)
- 4 foundations (id `f-0`..`f-3`)

(Stock is not a droppable; foundations cannot accept multi-card stacks.)

### Collision detection

Custom strategy: rectangle-intersection, but the column's effective rect extends to include all its fanned cards (not just the top). Closest pile wins ties.

### onDragEnd

1. Translate `(source, target)` into a `Move`.
2. Run `rules.canApply(state, move)`. If invalid, do nothing — Motion's layoutId animates the dragged stack home.
3. Otherwise dispatch `applyMove(move)`.
4. Play SFX + haptic.

## Animation system

### Spring presets (`motion/presets.ts`)

```ts
export const SPRING_DEFAULT = { type: 'spring', stiffness: 500, damping: 32, mass: 0.7 } as const;
export const SPRING_LIFT    = { type: 'spring', stiffness: 350, damping: 22, mass: 0.6 } as const;
export const SPRING_DROP    = { type: 'spring', stiffness: 600, damping: 28, mass: 0.7 } as const;
```

When the `animations` setting is off, all springs are replaced with `{ duration: 0 }` via a context-level provider.

### Layout animations

Every `<Card>` declares `layoutId={card.id}`. State changes that move a card to a new pile cause Motion to interpolate position automatically. This is the workhorse — covers drops, auto-moves, undo, recycling.

### Explicit animations

- **Card flip**: 300ms `rotateY(0 → 180)` with the face swapped at 50%.
- **Drag pickup overlay**: `scale: 1 → 1.06`, `boxShadow` grow, slight `rotate: ±2°` on lift.
- **Snap-back on invalid drop**: layoutId default — no extra code.
- **Auto-complete cascade**: 70ms staggered moves; the springs naturally chain.
- **Win celebration**: detach all face-up cards and spawn each with random horizontal velocity + bottom-edge bounce; then a `<WinSheet>` slides in.

### Haptics map

| Event | Native (iOS/Android) | Web fallback |
| --- | --- | --- |
| Pickup | `Haptics.impact({ style: 'light' })` | `navigator.vibrate(8)` |
| Valid drop | `impact({ style: 'medium' })` | `vibrate(12)` |
| Invalid drop | `notification({ type: 'warning' })` | `vibrate([8, 40, 8])` |
| Foundation success | `impact({ style: 'medium' })` + chime SFX | `vibrate(20)` |
| Win | `notification({ type: 'success' })` | `vibrate([30, 60, 30])` |

All gated on the `haptics` setting.

## Audio

`audio/sounds.ts` builds one Howl instance from a single sprite (`/sounds/sfx.mp3` + `.webm`). Sprite map: `pickup`, `dropValid`, `dropInvalid`, `chime`, `deal`, `winCascade`. Total weight target: <40KB. `play(name)` is a no-op when the `sound` setting is off.

## Capacitor

```bash
npm install @capacitor/core @capacitor/cli
npx cap init solitaire com.paultranvan.solitaire --web-dir=dist
npm install @capacitor/ios @capacitor/android
npx cap add ios && npx cap add android
npm install @capacitor/haptics @capacitor/status-bar @capacitor/preferences @capacitor/app @capacitor/splash-screen
npx cap sync
```

- StatusBar configured to overlay with light text.
- App listener: on `pause`, force-flush autosave + pause timer; on `resume`, restart timer.
- Splash: short (1s), then fade into the dealt board.
- iOS minimum: iOS 15. Android minSdk: 23.

This session: scaffold Capacitor projects but do not run native simulators. Web build is the source of truth.

## Testing

- **Vitest** unit tests for `game/` — primary correctness layer. Aim >90% line coverage of `game/`.
  - Deal reproducibility (seeded).
  - Every `Move` kind: legal cases, illegal cases, post-conditions.
  - Undo invariants: `apply(s, m); undo(s) === s` for all valid `m`.
  - `isWon`, `isAutoCompletable`, `bestNextMove` against canned positions.
- **Testing Library + jsdom** component tests for: drag-from-talon-to-foundation, multi-card stack drag, double-tap auto-move, undo button, win sheet.
- **Manual browser QA via Chrome devtools MCP** for visual + touch behavior on web (mobile emulation).
- **No E2E** this session.

A dev-only cheat panel (gated by `import.meta.env.DEV`) lets us jump to near-win states for animation tuning.

## Implementation phases

Mapped to writing-plans. Each phase ends in a runnable, verifiable state.

1. **Engine** — `game/` with full unit-test coverage. No UI.
2. **Skeleton + static board** — Vite project, theme, render a deal, no interaction.
3. **Drag-and-drop** — dnd-kit wired, valid moves, springy lift overlay.
4. **Layout animations + flip** — `layoutId` tweens, card flip, auto-flip on column top.
5. **UX polish** — auto-move on double-tap, auto-complete cascade, hint, undo, top bar.
6. **Data layer** — Zustand stores + IDB persistence + auto-resume.
7. **Stats + settings sheets** — UI for both, new-game flow, abandon counting.
8. **Audio + haptics + win celebration** — sprite, SFX gating, win cascade animation, win sheet.
9. **Capacitor wrap** — iOS + Android scaffolding, splash, icon, status bar, safe areas. Web stays primary.
10. **Polish & ship** — bundle audit, lighthouse, manual QA in Chrome (incl. mobile emulation).

## Out of scope (v2 candidates)

- Daily challenge with shared seed and completion calendar.
- Cloud sync / accounts.
- FreeCell, Spider, Yukon, etc.
- Achievements / badges.
- Alternate themes (dark, neon, glass).
- Tutorial / first-run hints.
- E2E tests.
- App Store / Play Store actual submission.
