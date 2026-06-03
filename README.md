# Solitaire

A polished Klondike solitaire that runs on the web, iOS, and Android from a single codebase.

## Stack

- **React 18 + TypeScript** with **Vite 7** for the build.
- **dnd-kit** for touch-friendly drag-and-drop.
- **Motion** (formerly Framer Motion) for `layoutId`-driven layout tweens, springy
  drag-pickup, and card-flip animations.
- **Zustand + immer** for stats and settings stores.
- **idb-keyval** for IndexedDB-backed auto-resume + persistence.
- **Web Audio** for synth-based SFX (no asset files), with a clean abstraction
  for swapping in sampled audio later.
- **Web Worker** running a bounded Klondike solver for winnable-only deals.
- **Capacitor 8** for native iOS + Android shells. Web is the source of truth.

## Project layout

```
src/
  game/         pure logic (zero React); rules, deal, hints, solver, scoring
  store/        Zustand stores + reducer for the active game + records
  persistence/  IDB autosave + load + stats backup helpers
  dnd/          dnd-kit drag/drop translation
  motion/       shared spring presets
  audio/        synth-based SFX
  haptics/      Capacitor + Vibration API wrapper
  i18n/         English + French strings, locale auto-detection
  native/       Capacitor lifecycle init
  ui/           React components (Board, Card, Tableau, sheets, …)
  assets/       bundled fonts
```

The `game/` module imports nothing from elsewhere in `src/`; it's a pure
library you could lift into another project unchanged.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173 (host:true — reachable on the LAN)
npm run test       # vitest watcher
npm run test:run   # single-shot
npm run lint
npm run build      # tsc --noEmit + vite build
```

## Native shells

Web build is the source of truth. To produce iOS / Android apps:

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
- Optional **winnable-only deals** — a bounded solver runs in a Web Worker and
  reshuffles until it finds a deal it can prove is solvable.
- Drag a single card or a contiguous descending alternating-color stack.
- Double-tap to auto-move (best legal target).
- Auto-flip the top of any column whose face-up card moves away.
- Auto-complete cascade when the board is solvable.
- Hint button with pulsing source/target highlights.
- Unlimited undo, capped at 200 history entries.
- Live timer + move counter.
- Auto-save mid-game; close the tab and resume exactly where you left off.
- Per-win **score** (time + move-efficiency, doubled for draw-3) with a
  records panel: top-10 leaderboard, rank, and best-time / fewest-moves medals.
- Stats: per-mode played/won/best-time/fewest-moves, current and longest
  win streak, total time played — with export / import for backup.
- Right- or left-handed layout (mirrors stock/talon and foundations).
- Three card-back designs (navy, crimson, emerald).
- English + French, auto-detected from the browser locale.
- Sound, haptics, and animations all toggle in settings.
- Win celebration with confetti + a stats sheet.

## Test coverage

Comprehensive unit + component tests — primary focus on the pure game engine:
every `Move` kind (legal + illegal), undo round-trips, history-cap enforcement,
hint correctness on canned positions, auto-move targeting, solver soundness,
scoring, integration deals, the stats store's win/abandon bookkeeping, and
stats backup round-trips.

## License

Private project; no public license.
