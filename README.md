# Solitaire

A polished Klondike solitaire that runs on the web, iOS, and Android from a single codebase.

## Stack

- **React 18 + TypeScript** with **Vite 5** for the build.
- **dnd-kit** for touch-friendly drag-and-drop.
- **Motion** (formerly Framer Motion) for `layoutId`-driven layout tweens, springy
  drag-pickup, and card-flip animations.
- **Zustand + immer** for stats and settings stores.
- **idb-keyval** for IndexedDB-backed auto-resume + persistence.
- **Web Audio** for synth-based SFX (no asset files), with a clean abstraction
  for swapping in sampled audio later.
- **Capacitor 8** for native iOS + Android shells. Web is the source of truth;
  see `docs/superpowers/specs/native-build-notes.md` for the iOS/Android setup.

## Project layout

```
src/
  game/         pure logic (zero React); fully unit-tested
  store/        Zustand stores + reducer for the active game
  persistence/  IDB autosave + load helpers
  dnd/          dnd-kit drag/drop translation
  motion/       shared spring presets
  audio/        synth-based SFX
  haptics/      Capacitor + Vibration API wrapper
  native/       Capacitor lifecycle init
  ui/           React components (Board, Card, Tableau, sheets, …)
docs/superpowers/   design spec + per-phase plans (kept under git)
```

The `game/` module imports nothing from elsewhere in `src/`; it's a pure
library you could lift into another project unchanged.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run test       # vitest watcher
npm run test:run   # single-shot
npm run lint
npm run build      # tsc --noEmit + vite build
```

## Native shells

Web build is the source of truth. To produce iOS / Android apps, follow
`docs/superpowers/specs/native-build-notes.md`. Short version:

```bash
npm run build
npx cap add ios
npx cap add android
npx cap sync
npx cap open ios       # builds in Xcode
npx cap open android   # builds in Android Studio
```

## Features

- Klondike with draw-1 or draw-3, unlimited redeals.
- Drag a single card or a contiguous descending alternating-color stack.
- Double-tap to auto-move (best legal target).
- Auto-flip the top of any column whose face-up card moves away.
- Auto-complete cascade when the board is solvable.
- Hint button with pulsing source/target highlights.
- Unlimited undo, capped at 200 history entries.
- Live timer + move counter.
- Auto-save mid-game; close the tab and resume exactly where you left off.
- Stats: per-mode played/won/best-time/fewest-moves, current and longest
  win streak, total time played.
- Right- or left-handed layout (mirrors stock/talon and foundations).
- Sound, haptics, and animations all toggle in settings.
- Win celebration with confetti + a stats sheet.

## Test coverage

Comprehensive unit + component tests — primary focus on the pure game engine:
every `Move` kind (legal + illegal), undo round-trips, history-cap enforcement,
hint correctness on canned positions, auto-move targeting, integration deals,
and the stats store's win/abandon bookkeeping.

## Design + plans

- `docs/superpowers/specs/native-build-notes.md` — iOS/Android setup steps.
- `docs/superpowers/archive/` — historical brainstorm spec and the phase-1
  TDD plan that built the engine. Kept for context only; not maintained.

## License

Private project; no public license.
