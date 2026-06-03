# Solitaire

A simple Klondike solitaire that runs on the web, iOS, and Android from a single codebase.

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


## License

Licensed under the **GNU Affero General Public License v3.0 or later**
(AGPL-3.0-or-later) — see [LICENSE](LICENSE) for the full text.

Copyright (C) 2026 Paul Tran-Van
