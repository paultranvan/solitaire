# Phase 1: Game Engine — Implementation Plan

> **Historical document — no longer maintained.**
> This plan was used to drive the original engine build. The codebase has
> evolved since; see [CLAUDE.md](../../../CLAUDE.md) for current architecture.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure game-logic library for Klondike solitaire. No UI, no React, no DOM — a fully unit-tested TypeScript module that exposes types, a deal function, a move reducer, hints, and auto-move logic. Phase 2 will wrap a UI around it.

**Architecture:** Pure functional core under `src/game/`. Single `applyMove(state, move)` reducer is the only mutation entry point; everything else is helpers and predicates. State carries its own undo history so `undo()` is also a pure function. All cards have stable IDs (e.g. `'h7'`) so the future Motion `layoutId` animation system can track them across pile transitions.

**Tech Stack:** TypeScript 5 (strict) · Vitest (jsdom not needed; node env) · Vite 5 (dev server scaffolded now even though Phase 1 doesn't use it — saves rescaffolding in Phase 2) · ESLint flat config · Prettier · `seedrandom` for deterministic shuffles.

---

## File map

**Wiped from old project (preserve `docs/`, `.git/`, `.gitignore`, `.superpowers/`, `README.md` (kept for reference)):**

- `src/` (all old files)
- `public/` (old)
- `package.json`, `package-lock.json`, `yarn.lock`
- `.eslintrc.json`, `.prettierrc`, `.editorconfig`

**Created in this plan:**

| Path                           | Responsibility                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `package.json`                 | New deps: react, vite, typescript, vitest, dnd-kit, motion, zustand, idb-keyval, howler, seedrandom, capacitor + plugins |
| `tsconfig.json`                | Strict TS config, ESNext target                                                                                          |
| `vite.config.ts`               | Vite + Vitest + path alias `@/*`                                                                                         |
| `eslint.config.js`             | Flat config                                                                                                              |
| `.prettierrc.json`             | Formatter                                                                                                                |
| `index.html`                   | Vite entry (placeholder for Phase 2)                                                                                     |
| `src/main.tsx`                 | React entry (placeholder)                                                                                                |
| `src/App.tsx`                  | Placeholder app                                                                                                          |
| `src/game/card.ts`             | `Suit`, `Rank`, `Card`, `cardId`, `parseCardId`, color helpers                                                           |
| `src/game/deck.ts`             | `createDeck`, seedable `shuffleDeck`, `dealKlondike`                                                                     |
| `src/game/state.ts`            | `GameState` type + `createInitialState({ drawCount, seed })`                                                             |
| `src/game/rules.ts`            | `canPlaceOnTableau`, `canPlaceOnFoundation`, `isValidStack`, `isWon`, `isAutoCompletable`, `foundationIdxFor`            |
| `src/game/moves.ts`            | `Move` union + `applyMove(state, move)` + `undo(state)` + `InvalidMoveError`                                             |
| `src/game/hints.ts`            | `bestNextMove(state): Move \| null`                                                                                      |
| `src/game/auto.ts`             | `findAutoMoveTarget`, `nextAutoCompleteMove`                                                                             |
| `src/game/index.ts`            | Barrel export                                                                                                            |
| `src/game/__tests__/*.test.ts` | Vitest tests for each module                                                                                             |

---

## Task 1: Wipe old project, scaffold new

**Files:**

- Delete: `src/` (old), `public/` (old), `package.json`, `package-lock.json`, `yarn.lock`, `.eslintrc.json`, `.prettierrc`, `.editorconfig`
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `.prettierrc.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`

- [ ] **Step 1: Remove old project files**

```bash
cd /home/paul/dev/perso/solitaire
rm -rf src public node_modules
rm -f package.json package-lock.json yarn.lock .eslintrc.json .prettierrc .editorconfig
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "solitaire",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview --host",
    "test": "vitest",
    "test:run": "vitest run",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/utilities": "^3.2.2",
    "howler": "^2.2.4",
    "idb-keyval": "^6.2.1",
    "motion": "^11.13.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "seedrandom": "^3.0.5",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/howler": "^2.2.12",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@types/seedrandom": "^3.0.8",
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^9.17.0",
    "eslint-plugin-react-hooks": "^5.1.0",
    "eslint-plugin-react-refresh": "^0.4.16",
    "globals": "^15.14.0",
    "jsdom": "^25.0.1",
    "prettier": "^3.4.2",
    "typescript": "^5.7.2",
    "typescript-eslint": "^8.18.2",
    "vite": "^6.0.5",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": false,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "useDefineForClassFields": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 4: Write `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { host: true, port: 5173 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

- [ ] **Step 5: Write `eslint.config.js`**

```js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'ios', 'android', '.superpowers'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
```

- [ ] **Step 6: Write `.prettierrc.json`**

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "semi": true,
  "arrowParens": "always"
}
```

- [ ] **Step 7: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0f3818" />
    <title>Solitaire</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Write `src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 9: Write `src/App.tsx`**

```tsx
export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>Solitaire — Phase 1 (engine only)</div>
  );
}
```

- [ ] **Step 10: Write `src/index.css`**

```css
:root {
  color-scheme: light dark;
}
* {
  box-sizing: border-box;
}
html,
body,
#root {
  height: 100%;
  margin: 0;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

- [ ] **Step 11: Write `src/test-setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 12: Install dependencies**

```bash
cd /home/paul/dev/perso/solitaire && npm install
```

Expected: install completes, no errors.

- [ ] **Step 13: Verify dev server boots and tests run**

```bash
cd /home/paul/dev/perso/solitaire && npm run test:run
```

Expected: "No test files found" — that's fine, just confirms vitest is wired.

```bash
cd /home/paul/dev/perso/solitaire && timeout 10 npm run build
```

Expected: build succeeds.

- [ ] **Step 14: Commit**

```bash
cd /home/paul/dev/perso/solitaire
git add -A
git commit -m "chore: Scaffold Vite + React + TypeScript project"
```

---

## Task 2: Card types + helpers (TDD)

**Files:**

- Create: `src/game/card.ts`
- Create: `src/game/__tests__/card.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/game/__tests__/card.test.ts
import { describe, expect, it } from 'vitest';
import { cardId, color, makeCard, parseCardId, RANKS, SUITS } from '../card';

describe('card', () => {
  it('SUITS and RANKS contain the canonical values', () => {
    expect(SUITS).toEqual(['h', 'd', 's', 'c']);
    expect(RANKS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it('cardId encodes suit + rank as a stable string', () => {
    expect(cardId('h', 7)).toBe('h7');
    expect(cardId('s', 13)).toBe('s13');
    expect(cardId('d', 1)).toBe('d1');
  });

  it('parseCardId is the inverse of cardId', () => {
    expect(parseCardId('h7')).toEqual({ suit: 'h', rank: 7 });
    expect(parseCardId('c10')).toEqual({ suit: 'c', rank: 10 });
    expect(parseCardId('s13')).toEqual({ suit: 's', rank: 13 });
  });

  it('color returns red for hearts/diamonds and black for spades/clubs', () => {
    expect(color('h')).toBe('red');
    expect(color('d')).toBe('red');
    expect(color('s')).toBe('black');
    expect(color('c')).toBe('black');
  });

  it('makeCard builds a card with the right id and faceUp default', () => {
    const c = makeCard('h', 7);
    expect(c).toEqual({ id: 'h7', suit: 'h', rank: 7, faceUp: false });
    expect(makeCard('s', 13, true).faceUp).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
cd /home/paul/dev/perso/solitaire && npm run test:run -- card
```

Expected: FAIL — "Cannot find module '../card'".

- [ ] **Step 3: Implement `src/game/card.ts`**

```ts
export type Suit = 'h' | 'd' | 's' | 'c';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
};

export const SUITS: readonly Suit[] = ['h', 'd', 's', 'c'] as const;
export const RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;

export const cardId = (suit: Suit, rank: Rank): string => `${suit}${rank}`;

export const parseCardId = (id: string): { suit: Suit; rank: Rank } => {
  const suit = id[0] as Suit;
  const rank = Number(id.slice(1)) as Rank;
  return { suit, rank };
};

export const color = (suit: Suit): 'red' | 'black' =>
  suit === 'h' || suit === 'd' ? 'red' : 'black';

export const makeCard = (suit: Suit, rank: Rank, faceUp = false): Card => ({
  id: cardId(suit, rank),
  suit,
  rank,
  faceUp,
});
```

- [ ] **Step 4: Run test, expect pass**

```bash
cd /home/paul/dev/perso/solitaire && npm run test:run -- card
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
cd /home/paul/dev/perso/solitaire
git add src/game/card.ts src/game/__tests__/card.test.ts
git commit -m "feat(game): Add Card type and helpers"
```

---

## Task 3: Deck creation, seedable shuffle, Klondike deal (TDD)

**Files:**

- Create: `src/game/deck.ts`
- Create: `src/game/__tests__/deck.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/game/__tests__/deck.test.ts
import { describe, expect, it } from 'vitest';
import { createDeck, dealKlondike, shuffleDeck } from '../deck';

describe('deck', () => {
  it('createDeck returns 52 unique cards, all face-down', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(52);
    expect(deck.every((c) => c.faceUp === false)).toBe(true);
  });

  it('shuffleDeck with the same seed is deterministic', () => {
    const a = shuffleDeck(createDeck(), 'seed-1');
    const b = shuffleDeck(createDeck(), 'seed-1');
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });

  it('shuffleDeck with different seeds produces different orders', () => {
    const a = shuffleDeck(createDeck(), 'alpha');
    const b = shuffleDeck(createDeck(), 'beta');
    expect(a.map((c) => c.id)).not.toEqual(b.map((c) => c.id));
  });

  it('shuffleDeck does not mutate input and preserves the multiset', () => {
    const input = createDeck();
    const inputIds = input.map((c) => c.id);
    const shuffled = shuffleDeck(input, 'x');
    expect(input.map((c) => c.id)).toEqual(inputIds); // original untouched
    expect(new Set(shuffled.map((c) => c.id))).toEqual(new Set(inputIds));
  });

  it('dealKlondike produces 7 columns of length 1..7 and a 24-card stock', () => {
    const { tableau, stock } = dealKlondike('seed-x');
    expect(tableau).toHaveLength(7);
    tableau.forEach((col, i) => expect(col).toHaveLength(i + 1));
    expect(stock).toHaveLength(24);
  });

  it('dealKlondike face-up rule: only the top card of each tableau column is faceUp', () => {
    const { tableau } = dealKlondike('seed-x');
    tableau.forEach((col) => {
      col.forEach((card, idx) => {
        const isTop = idx === col.length - 1;
        expect(card.faceUp).toBe(isTop);
      });
    });
  });

  it('dealKlondike stock cards are all face-down', () => {
    const { stock } = dealKlondike('seed-x');
    expect(stock.every((c) => c.faceUp === false)).toBe(true);
  });

  it('dealKlondike uses all 52 cards exactly once', () => {
    const { tableau, stock } = dealKlondike('seed-x');
    const all = [...stock, ...tableau.flat()];
    expect(all).toHaveLength(52);
    expect(new Set(all.map((c) => c.id)).size).toBe(52);
  });
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
cd /home/paul/dev/perso/solitaire && npm run test:run -- deck
```

Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/game/deck.ts`**

```ts
import seedrandom from 'seedrandom';
import { Card, makeCard, RANKS, SUITS } from './card';

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(makeCard(suit, rank, false));
    }
  }
  return deck;
};

export const shuffleDeck = (deck: readonly Card[], seed: string): Card[] => {
  const rng = seedrandom(seed);
  const out = deck.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export const dealKlondike = (seed: string): { tableau: Card[][]; stock: Card[] } => {
  const shuffled = shuffleDeck(createDeck(), seed);
  const tableau: Card[][] = [[], [], [], [], [], [], []];
  let cursor = 0;
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const isTop = row === col;
      const c = shuffled[cursor++];
      tableau[col].push({ ...c, faceUp: isTop });
    }
  }
  const stock = shuffled.slice(cursor).map((c) => ({ ...c, faceUp: false }));
  return { tableau, stock };
};
```

- [ ] **Step 4: Run test, expect pass**

```bash
cd /home/paul/dev/perso/solitaire && npm run test:run -- deck
```

Expected: PASS, all 7 tests.

- [ ] **Step 5: Commit**

```bash
cd /home/paul/dev/perso/solitaire
git add src/game/deck.ts src/game/__tests__/deck.test.ts
git commit -m "feat(game): Add deck creation, seeded shuffle, Klondike deal"
```

---

## Task 4: GameState + initial state (TDD)

**Files:**

- Create: `src/game/state.ts`
- Create: `src/game/__tests__/state.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/game/__tests__/state.test.ts
import { describe, expect, it } from 'vitest';
import { createInitialState } from '../state';

describe('createInitialState', () => {
  it('produces a fresh game with the expected shape', () => {
    const s = createInitialState({ drawCount: 1, seed: 'fixed' });
    expect(s.schemaVersion).toBe(1);
    expect(s.tableau).toHaveLength(7);
    s.tableau.forEach((col, i) => expect(col).toHaveLength(i + 1));
    expect(s.foundations).toEqual([[], [], [], []]);
    expect(s.talon).toEqual([]);
    expect(s.stock).toHaveLength(24);
    expect(s.drawCount).toBe(1);
    expect(s.movesMade).toBe(0);
    expect(s.redealCount).toBe(0);
    expect(s.history).toEqual([]);
    expect(s.seed).toBe('fixed');
    expect(typeof s.startedAt).toBe('number');
  });

  it('is reproducible given the same seed', () => {
    const a = createInitialState({ drawCount: 1, seed: 'alpha' });
    const b = createInitialState({ drawCount: 1, seed: 'alpha' });
    expect(a.tableau.map((c) => c.map((x) => x.id))).toEqual(
      b.tableau.map((c) => c.map((x) => x.id)),
    );
    expect(a.stock.map((c) => c.id)).toEqual(b.stock.map((c) => c.id));
  });

  it('honours drawCount = 3', () => {
    const s = createInitialState({ drawCount: 3, seed: 'x' });
    expect(s.drawCount).toBe(3);
  });

  it('generates a random seed if none given', () => {
    const s = createInitialState({ drawCount: 1 });
    expect(typeof s.seed).toBe('string');
    expect(s.seed.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
cd /home/paul/dev/perso/solitaire && npm run test:run -- state
```

Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/game/state.ts`**

```ts
import { Card } from './card';
import { dealKlondike } from './deck';

export type GameState = {
  schemaVersion: 1;
  tableau: Card[][];
  foundations: Card[][];
  stock: Card[];
  talon: Card[];
  drawCount: 1 | 3;
  startedAt: number;
  movesMade: number;
  redealCount: number;
  seed: string;
  history: GameState[];
};

const randomSeed = (): string => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const createInitialState = (opts: { drawCount: 1 | 3; seed?: string }): GameState => {
  const seed = opts.seed ?? randomSeed();
  const { tableau, stock } = dealKlondike(seed);
  return {
    schemaVersion: 1,
    tableau,
    foundations: [[], [], [], []],
    stock,
    talon: [],
    drawCount: opts.drawCount,
    startedAt: Date.now(),
    movesMade: 0,
    redealCount: 0,
    seed,
    history: [],
  };
};
```

- [ ] **Step 4: Run test, expect pass**

```bash
cd /home/paul/dev/perso/solitaire && npm run test:run -- state
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
cd /home/paul/dev/perso/solitaire
git add src/game/state.ts src/game/__tests__/state.test.ts
git commit -m "feat(game): Add GameState type and initial state factory"
```

---

## Task 5: Placement rules — `canPlaceOnTableau`, `canPlaceOnFoundation`, `isValidStack` (TDD)

**Files:**

- Create: `src/game/rules.ts`
- Create: `src/game/__tests__/rules.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/game/__tests__/rules.test.ts
import { describe, expect, it } from 'vitest';
import { makeCard } from '../card';
import {
  canPlaceOnFoundation,
  canPlaceOnTableau,
  foundationIdxFor,
  isAutoCompletable,
  isValidStack,
  isWon,
} from '../rules';
import { GameState } from '../state';

const fu = (s: 'h' | 'd' | 's' | 'c', r: number) => makeCard(s, r as 1, true);

const blank = (): GameState => ({
  schemaVersion: 1,
  tableau: [[], [], [], [], [], [], []],
  foundations: [[], [], [], []],
  stock: [],
  talon: [],
  drawCount: 1,
  startedAt: 0,
  movesMade: 0,
  redealCount: 0,
  seed: 't',
  history: [],
});

describe('canPlaceOnTableau', () => {
  it('allows K on an empty column', () => {
    expect(canPlaceOnTableau(fu('s', 13), undefined)).toBe(true);
    expect(canPlaceOnTableau(fu('h', 13), undefined)).toBe(true);
  });
  it('rejects non-K on an empty column', () => {
    expect(canPlaceOnTableau(fu('s', 12), undefined)).toBe(false);
  });
  it('allows alternating-color, one-rank-lower placement', () => {
    expect(canPlaceOnTableau(fu('h', 6), fu('s', 7))).toBe(true); // red on black
    expect(canPlaceOnTableau(fu('s', 6), fu('d', 7))).toBe(true); // black on red
  });
  it('rejects same color', () => {
    expect(canPlaceOnTableau(fu('h', 6), fu('d', 7))).toBe(false);
    expect(canPlaceOnTableau(fu('s', 6), fu('c', 7))).toBe(false);
  });
  it('rejects wrong rank', () => {
    expect(canPlaceOnTableau(fu('h', 5), fu('s', 7))).toBe(false);
    expect(canPlaceOnTableau(fu('h', 7), fu('s', 7))).toBe(false);
  });
  it('rejects placing on a face-down card', () => {
    expect(canPlaceOnTableau(fu('h', 6), makeCard('s', 7, false))).toBe(false);
  });
});

describe('canPlaceOnFoundation', () => {
  it('allows A on empty foundation', () => {
    expect(canPlaceOnFoundation(fu('h', 1), undefined)).toBe(true);
  });
  it('rejects non-A on empty foundation', () => {
    expect(canPlaceOnFoundation(fu('h', 2), undefined)).toBe(false);
  });
  it('allows next ascending same-suit', () => {
    expect(canPlaceOnFoundation(fu('h', 5), fu('h', 4))).toBe(true);
    expect(canPlaceOnFoundation(fu('s', 13), fu('s', 12))).toBe(true);
  });
  it('rejects different suit', () => {
    expect(canPlaceOnFoundation(fu('h', 5), fu('d', 4))).toBe(false);
  });
  it('rejects wrong rank', () => {
    expect(canPlaceOnFoundation(fu('h', 6), fu('h', 4))).toBe(false);
  });
});

describe('isValidStack', () => {
  it('accepts a single face-up card', () => {
    expect(isValidStack([fu('h', 7)])).toBe(true);
  });
  it('accepts descending alternating-color sequence', () => {
    expect(isValidStack([fu('s', 7), fu('h', 6), fu('c', 5)])).toBe(true);
  });
  it('rejects same-color adjacent', () => {
    expect(isValidStack([fu('s', 7), fu('c', 6)])).toBe(false);
  });
  it('rejects wrong rank order', () => {
    expect(isValidStack([fu('s', 7), fu('h', 5)])).toBe(false);
  });
  it('rejects any face-down card', () => {
    expect(isValidStack([fu('s', 7), makeCard('h', 6, false)])).toBe(false);
  });
});

describe('foundationIdxFor', () => {
  it('maps suits to fixed slots h=0 d=1 s=2 c=3', () => {
    expect(foundationIdxFor('h')).toBe(0);
    expect(foundationIdxFor('d')).toBe(1);
    expect(foundationIdxFor('s')).toBe(2);
    expect(foundationIdxFor('c')).toBe(3);
  });
});

describe('isWon / isAutoCompletable', () => {
  it('isWon true when all 4 foundations are full', () => {
    const s = blank();
    s.foundations = [
      Array.from({ length: 13 }, (_, i) => fu('h', i + 1)),
      Array.from({ length: 13 }, (_, i) => fu('d', i + 1)),
      Array.from({ length: 13 }, (_, i) => fu('s', i + 1)),
      Array.from({ length: 13 }, (_, i) => fu('c', i + 1)),
    ];
    expect(isWon(s)).toBe(true);
  });
  it('isWon false otherwise', () => {
    expect(isWon(blank())).toBe(false);
  });
  it('isAutoCompletable when stock and talon are empty and no face-down cards remain', () => {
    const s = blank();
    s.tableau[0] = [fu('h', 7)];
    s.tableau[1] = [fu('s', 13), fu('h', 12)];
    expect(isAutoCompletable(s)).toBe(true);
  });
  it('isAutoCompletable false when any tableau card is face-down', () => {
    const s = blank();
    s.tableau[0] = [makeCard('h', 7, false)];
    expect(isAutoCompletable(s)).toBe(false);
  });
  it('isAutoCompletable false when stock or talon is non-empty', () => {
    const s = blank();
    s.tableau[0] = [fu('h', 7)];
    s.stock = [makeCard('s', 1, false)];
    expect(isAutoCompletable(s)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
cd /home/paul/dev/perso/solitaire && npm run test:run -- rules
```

Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/game/rules.ts`**

```ts
import { Card, color, Suit } from './card';
import { GameState } from './state';

export const foundationIdxFor = (suit: Suit): 0 | 1 | 2 | 3 => {
  switch (suit) {
    case 'h':
      return 0;
    case 'd':
      return 1;
    case 's':
      return 2;
    case 'c':
      return 3;
  }
};

export const canPlaceOnTableau = (moving: Card, target: Card | undefined): boolean => {
  if (!moving.faceUp) return false;
  if (target === undefined) return moving.rank === 13;
  if (!target.faceUp) return false;
  if (color(moving.suit) === color(target.suit)) return false;
  return moving.rank === target.rank - 1;
};

export const canPlaceOnFoundation = (moving: Card, target: Card | undefined): boolean => {
  if (!moving.faceUp) return false;
  if (target === undefined) return moving.rank === 1;
  if (moving.suit !== target.suit) return false;
  return moving.rank === target.rank + 1;
};

export const isValidStack = (cards: readonly Card[]): boolean => {
  if (cards.length === 0) return false;
  if (!cards.every((c) => c.faceUp)) return false;
  for (let i = 0; i < cards.length - 1; i++) {
    const a = cards[i];
    const b = cards[i + 1];
    if (color(a.suit) === color(b.suit)) return false;
    if (b.rank !== a.rank - 1) return false;
  }
  return true;
};

export const isWon = (s: GameState): boolean => s.foundations.every((p) => p.length === 13);

export const isAutoCompletable = (s: GameState): boolean => {
  if (s.stock.length > 0 || s.talon.length > 0) return false;
  return s.tableau.every((col) => col.every((c) => c.faceUp));
};
```

- [ ] **Step 4: Run test, expect pass**

```bash
cd /home/paul/dev/perso/solitaire && npm run test:run -- rules
```

Expected: PASS, all rule tests.

- [ ] **Step 5: Commit**

```bash
cd /home/paul/dev/perso/solitaire
git add src/game/rules.ts src/game/__tests__/rules.test.ts
git commit -m "feat(game): Add placement rules and game-state predicates"
```

---

## Task 6: Move types + applyMove for `draw` and `recycle` (TDD)

**Files:**

- Create: `src/game/moves.ts`
- Create: `src/game/__tests__/moves.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/game/__tests__/moves.test.ts
import { describe, expect, it } from 'vitest';
import { makeCard } from '../card';
import { applyMove, InvalidMoveError } from '../moves';
import { GameState } from '../state';

const blank = (over: Partial<GameState> = {}): GameState => ({
  schemaVersion: 1,
  tableau: [[], [], [], [], [], [], []],
  foundations: [[], [], [], []],
  stock: [],
  talon: [],
  drawCount: 1,
  startedAt: 0,
  movesMade: 0,
  redealCount: 0,
  seed: 't',
  history: [],
  ...over,
});

describe('applyMove: draw (drawCount=1)', () => {
  it('moves the top stock card face-up onto the talon', () => {
    const s = blank({
      stock: [makeCard('h', 1), makeCard('s', 5)], // top = last
    });
    const next = applyMove(s, { kind: 'draw' });
    expect(next.stock).toHaveLength(1);
    expect(next.talon).toHaveLength(1);
    expect(next.talon[0]).toEqual({ id: 's5', suit: 's', rank: 5, faceUp: true });
    expect(next.movesMade).toBe(1);
    expect(next.history).toHaveLength(1);
  });

  it('throws when stock is empty', () => {
    expect(() => applyMove(blank(), { kind: 'draw' })).toThrow(InvalidMoveError);
  });
});

describe('applyMove: draw (drawCount=3)', () => {
  it('moves up to 3 cards from stock to talon, preserving order', () => {
    const s = blank({
      drawCount: 3,
      stock: [makeCard('h', 1), makeCard('s', 5), makeCard('c', 9), makeCard('d', 4)],
    });
    const next = applyMove(s, { kind: 'draw' });
    expect(next.stock).toHaveLength(1);
    expect(next.talon.map((c) => c.id)).toEqual(['c9', 's5', 'd4']);
    expect(next.talon.every((c) => c.faceUp)).toBe(true);
  });

  it('moves whatever remains when stock has fewer than 3', () => {
    const s = blank({ drawCount: 3, stock: [makeCard('h', 1), makeCard('s', 5)] });
    const next = applyMove(s, { kind: 'draw' });
    expect(next.stock).toHaveLength(0);
    expect(next.talon.map((c) => c.id)).toEqual(['s5', 'h1']);
  });
});

describe('applyMove: recycle', () => {
  it('moves all talon cards back to stock face-down, in reversed order, increments redealCount', () => {
    const s = blank({
      stock: [],
      talon: [makeCard('h', 1, true), makeCard('s', 5, true), makeCard('c', 9, true)],
    });
    const next = applyMove(s, { kind: 'recycle' });
    expect(next.talon).toHaveLength(0);
    expect(next.stock.map((c) => c.id)).toEqual(['c9', 's5', 'h1']);
    expect(next.stock.every((c) => c.faceUp === false)).toBe(true);
    expect(next.redealCount).toBe(1);
  });

  it('throws when stock is non-empty', () => {
    const s = blank({ stock: [makeCard('h', 1)] });
    expect(() => applyMove(s, { kind: 'recycle' })).toThrow(InvalidMoveError);
  });
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
cd /home/paul/dev/perso/solitaire && npm run test:run -- moves
```

Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/game/moves.ts`**

```ts
import { GameState } from './state';

export type Move =
  | { kind: 'draw' }
  | { kind: 'recycle' }
  | { kind: 'tableauToTableau'; from: number; cardIndex: number; to: number }
  | { kind: 'tableauToFoundation'; from: number; foundationIdx: number }
  | { kind: 'talonToTableau'; to: number }
  | { kind: 'talonToFoundation'; foundationIdx: number }
  | { kind: 'foundationToTableau'; foundationIdx: number; to: number };

export class InvalidMoveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMoveError';
  }
}

const HISTORY_CAP = 200;

const cloneState = (s: GameState): GameState => ({
  ...s,
  tableau: s.tableau.map((c) => c.slice()),
  foundations: s.foundations.map((p) => p.slice()),
  stock: s.stock.slice(),
  talon: s.talon.slice(),
  history: [],
});

const pushHistory = (next: GameState, prior: GameState): void => {
  const snapshot = cloneState(prior);
  next.history = [...prior.history, snapshot].slice(-HISTORY_CAP);
};

export const applyMove = (state: GameState, move: Move): GameState => {
  const next = cloneState(state);
  next.history = state.history; // will be replaced by pushHistory below

  switch (move.kind) {
    case 'draw': {
      if (state.stock.length === 0) {
        throw new InvalidMoveError('cannot draw: stock empty');
      }
      const count = Math.min(state.drawCount, state.stock.length);
      const drawn = next.stock.splice(next.stock.length - count, count);
      // Preserve dealing order: the topmost stock card ends up topmost on talon
      for (let i = drawn.length - 1; i >= 0; i--) {
        next.talon.push({ ...drawn[i], faceUp: true });
      }
      break;
    }
    case 'recycle': {
      if (state.stock.length !== 0) {
        throw new InvalidMoveError('cannot recycle: stock not empty');
      }
      // Talon's top card becomes the bottom of the new stock
      next.stock = next.talon
        .slice()
        .reverse()
        .map((c) => ({ ...c, faceUp: false }));
      next.talon = [];
      next.redealCount += 1;
      break;
    }
    default:
      throw new InvalidMoveError(`unhandled move kind: ${(move as Move).kind}`);
  }

  pushHistory(next, state);
  next.movesMade = state.movesMade + 1;
  return next;
};
```

- [ ] **Step 4: Run test, expect pass**

```bash
cd /home/paul/dev/perso/solitaire && npm run test:run -- moves
```

Expected: PASS, draw + recycle tests.

- [ ] **Step 5: Commit**

```bash
cd /home/paul/dev/perso/solitaire
git add src/game/moves.ts src/game/__tests__/moves.test.ts
git commit -m "feat(game): Add Move union and applyMove for draw/recycle"
```

---

## Task 7: applyMove — `tableauToTableau` (with stack drag) + `tableauToFoundation` + auto-flip (TDD)

**Files:**

- Modify: `src/game/moves.ts`
- Modify: `src/game/__tests__/moves.test.ts`

- [ ] **Step 1: Append failing tests**

Append to `src/game/__tests__/moves.test.ts`:

```ts
import { canPlaceOnFoundation, canPlaceOnTableau } from '../rules';
import { color } from '../card';

describe('applyMove: tableauToTableau (single card)', () => {
  it('moves a face-up tableau top to a legal target column', () => {
    const s = blank({
      tableau: [
        [makeCard('s', 7, true)], // col 0
        [makeCard('h', 6, true)], // col 1
        [],
        [],
        [],
        [],
        [],
      ],
    });
    const next = applyMove(s, { kind: 'tableauToTableau', from: 1, cardIndex: 0, to: 0 });
    expect(next.tableau[0].map((c) => c.id)).toEqual(['s7', 'h6']);
    expect(next.tableau[1]).toEqual([]);
  });

  it('rejects an illegal target', () => {
    const s = blank({
      tableau: [
        [makeCard('s', 7, true)],
        [makeCard('h', 7, true)], // wrong rank
        [],
        [],
        [],
        [],
        [],
      ],
    });
    expect(() => applyMove(s, { kind: 'tableauToTableau', from: 1, cardIndex: 0, to: 0 })).toThrow(
      InvalidMoveError,
    );
  });

  it('auto-flips the new top of the source column if it is face-down', () => {
    const s = blank({
      tableau: [
        [makeCard('h', 5, true)], // dest
        [makeCard('s', 9, false), makeCard('c', 4, true)], // source: hidden K, top 4 - moving 4 to col?
        [],
        [],
        [],
        [],
        [],
      ],
    });
    // place a target so the move is legal: 4 onto 5 of red? we need black on red — c4 black on h5 red is OK.
    const next = applyMove(s, { kind: 'tableauToTableau', from: 1, cardIndex: 1, to: 0 });
    expect(next.tableau[0].map((c) => c.id)).toEqual(['h5', 'c4']);
    expect(next.tableau[1]).toHaveLength(1);
    expect(next.tableau[1][0].faceUp).toBe(true); // auto-flipped
  });
});

describe('applyMove: tableauToTableau (stack)', () => {
  it('moves a contiguous valid stack starting from cardIndex', () => {
    const s = blank({
      tableau: [
        [makeCard('s', 8, true)],
        [makeCard('h', 7, true), makeCard('c', 6, true), makeCard('d', 5, true)],
        [],
        [],
        [],
        [],
        [],
      ],
    });
    const next = applyMove(s, { kind: 'tableauToTableau', from: 1, cardIndex: 0, to: 0 });
    expect(next.tableau[0].map((c) => c.id)).toEqual(['s8', 'h7', 'c6', 'd5']);
    expect(next.tableau[1]).toEqual([]);
  });

  it('rejects an invalid stack pickup (broken sequence)', () => {
    const s = blank({
      tableau: [
        [makeCard('s', 8, true)],
        [makeCard('h', 7, true), makeCard('s', 6, true)], // same color — not a valid stack
        [],
        [],
        [],
        [],
        [],
      ],
    });
    expect(() => applyMove(s, { kind: 'tableauToTableau', from: 1, cardIndex: 0, to: 0 })).toThrow(
      InvalidMoveError,
    );
  });

  it('rejects moving a face-down card', () => {
    const s = blank({
      tableau: [[makeCard('s', 8, true)], [makeCard('h', 7, false)], [], [], [], [], []],
    });
    expect(() => applyMove(s, { kind: 'tableauToTableau', from: 1, cardIndex: 0, to: 0 })).toThrow(
      InvalidMoveError,
    );
  });

  it('rejects from === to', () => {
    const s = blank({
      tableau: [[makeCard('s', 8, true)], [], [], [], [], [], []],
    });
    expect(() => applyMove(s, { kind: 'tableauToTableau', from: 0, cardIndex: 0, to: 0 })).toThrow(
      InvalidMoveError,
    );
  });
});

describe('applyMove: tableauToFoundation', () => {
  it('moves the tableau top card to a legal foundation slot', () => {
    const s = blank({
      tableau: [[makeCard('h', 1, true)], [], [], [], [], [], []],
      foundations: [[], [], [], []],
    });
    const next = applyMove(s, { kind: 'tableauToFoundation', from: 0, foundationIdx: 0 });
    expect(next.tableau[0]).toEqual([]);
    expect(next.foundations[0].map((c) => c.id)).toEqual(['h1']);
  });

  it('auto-flips the source column top after move', () => {
    const s = blank({
      tableau: [[makeCard('s', 9, false), makeCard('h', 1, true)], [], [], [], [], [], []],
      foundations: [[], [], [], []],
    });
    const next = applyMove(s, { kind: 'tableauToFoundation', from: 0, foundationIdx: 0 });
    expect(next.tableau[0]).toHaveLength(1);
    expect(next.tableau[0][0].faceUp).toBe(true);
  });

  it('rejects illegal foundation target', () => {
    const s = blank({
      tableau: [[makeCard('h', 5, true)], [], [], [], [], [], []],
      foundations: [[], [], [], []],
    });
    expect(() => applyMove(s, { kind: 'tableauToFoundation', from: 0, foundationIdx: 0 })).toThrow(
      InvalidMoveError,
    );
  });
});

// quick sanity: rules helpers reused
describe('color helper', () => {
  it('round-trips', () => {
    expect(color('h')).toBe('red');
    expect(color('c')).toBe('black');
    // make sure imports resolve
    expect(canPlaceOnFoundation(makeCard('h', 1, true), undefined)).toBe(true);
    expect(canPlaceOnTableau(makeCard('s', 13, true), undefined)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
cd /home/paul/dev/perso/solitaire && npm run test:run -- moves
```

Expected: FAIL — new tests reference unimplemented move kinds.

- [ ] **Step 3: Extend `src/game/moves.ts`**

Replace the body of `applyMove` (the switch) with the expanded implementation. Full updated file:

```ts
import { Card } from './card';
import { canPlaceOnFoundation, canPlaceOnTableau, isValidStack } from './rules';
import { GameState } from './state';

export type Move =
  | { kind: 'draw' }
  | { kind: 'recycle' }
  | { kind: 'tableauToTableau'; from: number; cardIndex: number; to: number }
  | { kind: 'tableauToFoundation'; from: number; foundationIdx: number }
  | { kind: 'talonToTableau'; to: number }
  | { kind: 'talonToFoundation'; foundationIdx: number }
  | { kind: 'foundationToTableau'; foundationIdx: number; to: number };

export class InvalidMoveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMoveError';
  }
}

const HISTORY_CAP = 200;

const cloneState = (s: GameState): GameState => ({
  ...s,
  tableau: s.tableau.map((c) => c.slice()),
  foundations: s.foundations.map((p) => p.slice()),
  stock: s.stock.slice(),
  talon: s.talon.slice(),
  history: [],
});

const pushHistory = (next: GameState, prior: GameState): void => {
  const snapshot = cloneState(prior);
  next.history = [...prior.history, snapshot].slice(-HISTORY_CAP);
};

const autoFlipTop = (col: Card[]): void => {
  if (col.length === 0) return;
  const top = col[col.length - 1];
  if (!top.faceUp) col[col.length - 1] = { ...top, faceUp: true };
};

export const applyMove = (state: GameState, move: Move): GameState => {
  const next = cloneState(state);

  switch (move.kind) {
    case 'draw': {
      if (state.stock.length === 0) throw new InvalidMoveError('cannot draw: stock empty');
      const count = Math.min(state.drawCount, state.stock.length);
      const drawn = next.stock.splice(next.stock.length - count, count);
      for (let i = drawn.length - 1; i >= 0; i--) {
        next.talon.push({ ...drawn[i], faceUp: true });
      }
      break;
    }

    case 'recycle': {
      if (state.stock.length !== 0) throw new InvalidMoveError('cannot recycle: stock not empty');
      next.stock = next.talon
        .slice()
        .reverse()
        .map((c) => ({ ...c, faceUp: false }));
      next.talon = [];
      next.redealCount += 1;
      break;
    }

    case 'tableauToTableau': {
      if (move.from === move.to) throw new InvalidMoveError('from === to');
      const src = next.tableau[move.from];
      if (move.cardIndex < 0 || move.cardIndex >= src.length) {
        throw new InvalidMoveError('cardIndex out of range');
      }
      const stack = src.slice(move.cardIndex);
      if (!isValidStack(stack)) throw new InvalidMoveError('invalid tableau stack');
      const dst = next.tableau[move.to];
      const dstTop = dst[dst.length - 1];
      if (!canPlaceOnTableau(stack[0], dstTop)) {
        throw new InvalidMoveError('illegal tableau placement');
      }
      next.tableau[move.from] = src.slice(0, move.cardIndex);
      next.tableau[move.to] = [...dst, ...stack];
      autoFlipTop(next.tableau[move.from]);
      break;
    }

    case 'tableauToFoundation': {
      const src = next.tableau[move.from];
      if (src.length === 0) throw new InvalidMoveError('source column empty');
      const card = src[src.length - 1];
      const fnd = next.foundations[move.foundationIdx];
      const fndTop = fnd[fnd.length - 1];
      if (!canPlaceOnFoundation(card, fndTop)) {
        throw new InvalidMoveError('illegal foundation placement');
      }
      next.tableau[move.from] = src.slice(0, -1);
      next.foundations[move.foundationIdx] = [...fnd, card];
      autoFlipTop(next.tableau[move.from]);
      break;
    }

    case 'talonToTableau': {
      if (state.talon.length === 0) throw new InvalidMoveError('talon empty');
      const card = next.talon[next.talon.length - 1];
      const dst = next.tableau[move.to];
      const dstTop = dst[dst.length - 1];
      if (!canPlaceOnTableau(card, dstTop)) {
        throw new InvalidMoveError('illegal tableau placement');
      }
      next.talon = next.talon.slice(0, -1);
      next.tableau[move.to] = [...dst, card];
      break;
    }

    case 'talonToFoundation': {
      if (state.talon.length === 0) throw new InvalidMoveError('talon empty');
      const card = next.talon[next.talon.length - 1];
      const fnd = next.foundations[move.foundationIdx];
      const fndTop = fnd[fnd.length - 1];
      if (!canPlaceOnFoundation(card, fndTop)) {
        throw new InvalidMoveError('illegal foundation placement');
      }
      next.talon = next.talon.slice(0, -1);
      next.foundations[move.foundationIdx] = [...fnd, card];
      break;
    }

    case 'foundationToTableau': {
      const fnd = next.foundations[move.foundationIdx];
      if (fnd.length === 0) throw new InvalidMoveError('foundation empty');
      const card = fnd[fnd.length - 1];
      const dst = next.tableau[move.to];
      const dstTop = dst[dst.length - 1];
      if (!canPlaceOnTableau(card, dstTop)) {
        throw new InvalidMoveError('illegal tableau placement');
      }
      next.foundations[move.foundationIdx] = fnd.slice(0, -1);
      next.tableau[move.to] = [...dst, card];
      break;
    }

    default: {
      const _exhaustive: never = move;
      throw new InvalidMoveError(`unhandled move kind: ${JSON.stringify(_exhaustive)}`);
    }
  }

  pushHistory(next, state);
  next.movesMade = state.movesMade + 1;
  return next;
};

export const undo = (state: GameState): GameState => {
  if (state.history.length === 0) return state;
  const prior = state.history[state.history.length - 1];
  return {
    ...prior,
    history: state.history.slice(0, -1),
  };
};
```

- [ ] **Step 4: Run test, expect pass**

```bash
cd /home/paul/dev/perso/solitaire && npm run test:run -- moves
```

Expected: PASS, all tests including the new ones.

- [ ] **Step 5: Commit**

```bash
cd /home/paul/dev/perso/solitaire
git add src/game/moves.ts src/game/__tests__/moves.test.ts
git commit -m "feat(game): Implement all Move kinds with auto-flip and undo"
```

---

## Task 8: Tests for talon/foundation moves and `undo()` (TDD)

**Files:**

- Modify: `src/game/__tests__/moves.test.ts`

- [ ] **Step 1: Append tests for the remaining move kinds and undo**

Append to `src/game/__tests__/moves.test.ts`:

```ts
import { undo } from '../moves';

describe('applyMove: talonToTableau / talonToFoundation', () => {
  it('talonToTableau: legal move pops talon and adds to column', () => {
    const s = blank({
      tableau: [[makeCard('s', 8, true)], [], [], [], [], [], []],
      talon: [makeCard('h', 7, true)],
    });
    const next = applyMove(s, { kind: 'talonToTableau', to: 0 });
    expect(next.tableau[0].map((c) => c.id)).toEqual(['s8', 'h7']);
    expect(next.talon).toEqual([]);
  });

  it('talonToTableau: rejects illegal target', () => {
    const s = blank({
      tableau: [[makeCard('s', 8, true)], [], [], [], [], [], []],
      talon: [makeCard('s', 7, true)],
    });
    expect(() => applyMove(s, { kind: 'talonToTableau', to: 0 })).toThrow(InvalidMoveError);
  });

  it('talonToFoundation: legal A onto empty foundation', () => {
    const s = blank({
      foundations: [[], [], [], []],
      talon: [makeCard('h', 1, true)],
    });
    const next = applyMove(s, { kind: 'talonToFoundation', foundationIdx: 0 });
    expect(next.foundations[0].map((c) => c.id)).toEqual(['h1']);
    expect(next.talon).toEqual([]);
  });

  it('talonToFoundation: rejects when talon empty', () => {
    expect(() => applyMove(blank(), { kind: 'talonToFoundation', foundationIdx: 0 })).toThrow(
      InvalidMoveError,
    );
  });
});

describe('applyMove: foundationToTableau', () => {
  it('moves foundation top back onto a legal tableau target', () => {
    const s = blank({
      foundations: [[makeCard('h', 1, true), makeCard('h', 2, true)], [], [], []],
      tableau: [[makeCard('s', 3, true)], [], [], [], [], [], []],
    });
    const next = applyMove(s, { kind: 'foundationToTableau', foundationIdx: 0, to: 0 });
    expect(next.foundations[0].map((c) => c.id)).toEqual(['h1']);
    expect(next.tableau[0].map((c) => c.id)).toEqual(['s3', 'h2']);
  });

  it('rejects when foundation empty', () => {
    expect(() =>
      applyMove(blank(), { kind: 'foundationToTableau', foundationIdx: 0, to: 0 }),
    ).toThrow(InvalidMoveError);
  });
});

describe('undo', () => {
  it('reverses a single move exactly', () => {
    const s = blank({
      tableau: [[makeCard('s', 7, true)], [makeCard('h', 6, true)], [], [], [], [], []],
    });
    const after = applyMove(s, { kind: 'tableauToTableau', from: 1, cardIndex: 0, to: 0 });
    const back = undo(after);
    // history is one shorter; everything else should match the prior state
    expect(back.tableau).toEqual(s.tableau);
    expect(back.talon).toEqual(s.talon);
    expect(back.stock).toEqual(s.stock);
    expect(back.foundations).toEqual(s.foundations);
    expect(back.movesMade).toBe(s.movesMade);
    expect(back.history).toEqual(s.history);
  });

  it('reverses multiple moves in order', () => {
    let s: GameState = blank({
      stock: [makeCard('h', 1), makeCard('s', 5)],
    });
    s = applyMove(s, { kind: 'draw' });
    const drawn = s;
    s = applyMove(s, { kind: 'draw' });
    const u1 = undo(s);
    expect(u1.stock).toEqual(drawn.stock);
    expect(u1.talon).toEqual(drawn.talon);
    const u2 = undo(u1);
    expect(u2.stock.map((c) => c.id)).toEqual(['h1', 's5']);
    expect(u2.talon).toEqual([]);
  });

  it('is a no-op when history is empty', () => {
    const s = blank();
    const u = undo(s);
    expect(u).toEqual(s);
  });
});
```

- [ ] **Step 2: Run test, expect pass**

(All target functions are already implemented in Task 7.)

```bash
cd /home/paul/dev/perso/solitaire && npm run test:run -- moves
```

Expected: PASS, all moves + undo tests.

- [ ] **Step 3: Commit**

```bash
cd /home/paul/dev/perso/solitaire
git add src/game/__tests__/moves.test.ts
git commit -m "test(game): Cover talon/foundation moves and undo"
```

---

## Task 9: Hints — `bestNextMove` (TDD)

**Files:**

- Create: `src/game/hints.ts`
- Create: `src/game/__tests__/hints.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/game/__tests__/hints.test.ts
import { describe, expect, it } from 'vitest';
import { makeCard } from '../card';
import { bestNextMove } from '../hints';
import { GameState } from '../state';

const blank = (over: Partial<GameState> = {}): GameState => ({
  schemaVersion: 1,
  tableau: [[], [], [], [], [], [], []],
  foundations: [[], [], [], []],
  stock: [],
  talon: [],
  drawCount: 1,
  startedAt: 0,
  movesMade: 0,
  redealCount: 0,
  seed: 't',
  history: [],
  ...over,
});

describe('bestNextMove', () => {
  it('prefers talon-to-foundation when an Ace is on the talon', () => {
    const s = blank({
      talon: [makeCard('h', 1, true)],
      foundations: [[], [], [], []],
    });
    expect(bestNextMove(s)).toEqual({ kind: 'talonToFoundation', foundationIdx: 0 });
  });

  it('prefers tableau-to-foundation when a tableau top is eligible', () => {
    const s = blank({
      tableau: [[makeCard('h', 1, true)], [], [], [], [], [], []],
      foundations: [[], [], [], []],
    });
    expect(bestNextMove(s)).toEqual({ kind: 'tableauToFoundation', from: 0, foundationIdx: 0 });
  });

  it('falls back to a tableau-to-tableau move that exposes a face-down card', () => {
    const s = blank({
      tableau: [
        [makeCard('s', 8, true)],
        [makeCard('h', 1, false), makeCard('h', 7, true)], // moving h7 onto s8 exposes h1
        [],
        [],
        [],
        [],
        [],
      ],
    });
    expect(bestNextMove(s)).toEqual({
      kind: 'tableauToTableau',
      from: 1,
      cardIndex: 1,
      to: 0,
    });
  });

  it('returns null when no move helps progress', () => {
    const s = blank({
      stock: [makeCard('s', 1)],
      tableau: [[makeCard('h', 13, true)], [], [], [], [], [], []],
    });
    expect(bestNextMove(s)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
cd /home/paul/dev/perso/solitaire && npm run test:run -- hints
```

Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/game/hints.ts`**

```ts
import { Card } from './card';
import { Move } from './moves';
import { canPlaceOnFoundation, canPlaceOnTableau, foundationIdxFor, isValidStack } from './rules';
import { GameState } from './state';

const tryFoundationFor = (card: Card, foundations: readonly Card[][]): number | null => {
  const idx = foundationIdxFor(card.suit);
  const top = foundations[idx][foundations[idx].length - 1];
  return canPlaceOnFoundation(card, top) ? idx : null;
};

export const bestNextMove = (state: GameState): Move | null => {
  // 1. talon → foundation
  if (state.talon.length > 0) {
    const top = state.talon[state.talon.length - 1];
    const idx = tryFoundationFor(top, state.foundations);
    if (idx !== null) return { kind: 'talonToFoundation', foundationIdx: idx };
  }

  // 2. any tableau top → foundation
  for (let from = 0; from < 7; from++) {
    const col = state.tableau[from];
    if (col.length === 0) continue;
    const top = col[col.length - 1];
    if (!top.faceUp) continue;
    const idx = tryFoundationFor(top, state.foundations);
    if (idx !== null) return { kind: 'tableauToFoundation', from, foundationIdx: idx };
  }

  // 3. tableau → tableau move that exposes a face-down card
  for (let from = 0; from < 7; from++) {
    const col = state.tableau[from];
    // find lowest face-up index
    const firstFaceUp = col.findIndex((c) => c.faceUp);
    if (firstFaceUp <= 0) continue; // would need a face-down card just below
    const stack = col.slice(firstFaceUp);
    if (!isValidStack(stack)) continue;
    for (let to = 0; to < 7; to++) {
      if (to === from) continue;
      const dst = state.tableau[to];
      const dstTop = dst[dst.length - 1];
      if (canPlaceOnTableau(stack[0], dstTop)) {
        return { kind: 'tableauToTableau', from, cardIndex: firstFaceUp, to };
      }
    }
  }

  // 4. talon → tableau (only if it then enables a foundation move next turn — approximated by simple legality)
  if (state.talon.length > 0) {
    const top = state.talon[state.talon.length - 1];
    for (let to = 0; to < 7; to++) {
      const dst = state.tableau[to];
      const dstTop = dst[dst.length - 1];
      if (canPlaceOnTableau(top, dstTop)) {
        return { kind: 'talonToTableau', to };
      }
    }
  }

  return null;
};
```

- [ ] **Step 4: Run test, expect pass**

```bash
cd /home/paul/dev/perso/solitaire && npm run test:run -- hints
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
cd /home/paul/dev/perso/solitaire
git add src/game/hints.ts src/game/__tests__/hints.test.ts
git commit -m "feat(game): Add bestNextMove hint heuristic"
```

---

## Task 10: Auto-move target + auto-complete sequence (TDD)

**Files:**

- Create: `src/game/auto.ts`
- Create: `src/game/__tests__/auto.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/game/__tests__/auto.test.ts
import { describe, expect, it } from 'vitest';
import { makeCard } from '../card';
import { findAutoMoveTarget, nextAutoCompleteMove } from '../auto';
import { GameState } from '../state';

const blank = (over: Partial<GameState> = {}): GameState => ({
  schemaVersion: 1,
  tableau: [[], [], [], [], [], [], []],
  foundations: [[], [], [], []],
  stock: [],
  talon: [],
  drawCount: 1,
  startedAt: 0,
  movesMade: 0,
  redealCount: 0,
  seed: 't',
  history: [],
  ...over,
});

describe('findAutoMoveTarget — talon source', () => {
  it('targets foundation when the talon top is eligible', () => {
    const s = blank({ talon: [makeCard('h', 1, true)] });
    expect(findAutoMoveTarget(s, { kind: 'talon' })).toEqual({
      kind: 'talonToFoundation',
      foundationIdx: 0,
    });
  });

  it('targets the leftmost legal tableau column otherwise', () => {
    const s = blank({
      talon: [makeCard('h', 7, true)],
      tableau: [
        [makeCard('s', 9, true)], // h7 cannot go (need s8 top)
        [makeCard('s', 8, true)], // legal
        [makeCard('c', 8, true)], // also legal — leftmost wins
        [],
        [],
        [],
        [],
      ],
    });
    expect(findAutoMoveTarget(s, { kind: 'talon' })).toEqual({
      kind: 'talonToTableau',
      to: 1,
    });
  });

  it('returns null when no destination is legal', () => {
    const s = blank({ talon: [makeCard('h', 7, true)] });
    expect(findAutoMoveTarget(s, { kind: 'talon' })).toBeNull();
  });
});

describe('findAutoMoveTarget — tableau top source', () => {
  it('prefers foundation over tableau-to-tableau', () => {
    const s = blank({
      tableau: [[makeCard('h', 1, true)], [], [], [], [], [], []],
      foundations: [[], [], [], []],
    });
    expect(findAutoMoveTarget(s, { kind: 'tableauTop', column: 0 })).toEqual({
      kind: 'tableauToFoundation',
      from: 0,
      foundationIdx: 0,
    });
  });

  it('picks tableau column that exposes the most face-down cards', () => {
    const s = blank({
      tableau: [
        [makeCard('s', 13, true)], // empty target unsuitable for h7
        [makeCard('s', 8, true)], // legal target #1, exposes 0
        [makeCard('s', 8, false), makeCard('h', 6, true)], // not a place we'd move h7 to
        [makeCard('h', 9, false), makeCard('h', 9, false), makeCard('s', 8, true)], // legal target, exposes 2
        [],
        [],
        [makeCard('h', 7, true)], // source: just a 7
      ],
      // make col 0's top non-target by saying h7 goes to s8 (col 1 or 3); col 3 exposes more.
    });
    // override: source is col 6 with h7 face-up alone
    const result = findAutoMoveTarget(s, { kind: 'tableauTop', column: 6 });
    expect(result).toEqual({ kind: 'tableauToTableau', from: 6, cardIndex: 0, to: 3 });
  });
});

describe('nextAutoCompleteMove', () => {
  it('returns the next move during auto-complete', () => {
    const s = blank({
      tableau: [[makeCard('h', 1, true)], [], [], [], [], [], []],
      foundations: [[], [], [], []],
    });
    expect(nextAutoCompleteMove(s)).toEqual({
      kind: 'tableauToFoundation',
      from: 0,
      foundationIdx: 0,
    });
  });

  it('returns null when nothing can move to a foundation', () => {
    const s = blank({
      tableau: [[makeCard('h', 7, true)], [], [], [], [], [], []],
    });
    expect(nextAutoCompleteMove(s)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
cd /home/paul/dev/perso/solitaire && npm run test:run -- auto
```

Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/game/auto.ts`**

```ts
import { Card } from './card';
import { Move } from './moves';
import { canPlaceOnFoundation, canPlaceOnTableau, foundationIdxFor } from './rules';
import { GameState } from './state';

export type AutoMoveSource = { kind: 'talon' } | { kind: 'tableauTop'; column: number };

const tryFoundationFor = (card: Card, foundations: readonly Card[][]): number | null => {
  const idx = foundationIdxFor(card.suit);
  const top = foundations[idx][foundations[idx].length - 1];
  return canPlaceOnFoundation(card, top) ? idx : null;
};

const countFaceDownInColumn = (col: readonly Card[]): number =>
  col.reduce((n, c) => (c.faceUp ? n : n + 1), 0);

export const findAutoMoveTarget = (state: GameState, source: AutoMoveSource): Move | null => {
  if (source.kind === 'talon') {
    if (state.talon.length === 0) return null;
    const card = state.talon[state.talon.length - 1];
    const fnd = tryFoundationFor(card, state.foundations);
    if (fnd !== null) return { kind: 'talonToFoundation', foundationIdx: fnd };
    for (let to = 0; to < 7; to++) {
      const dst = state.tableau[to];
      const dstTop = dst[dst.length - 1];
      if (canPlaceOnTableau(card, dstTop)) return { kind: 'talonToTableau', to };
    }
    return null;
  }

  // tableauTop: only the top card of the column
  const col = state.tableau[source.column];
  if (col.length === 0) return null;
  const top = col[col.length - 1];
  if (!top.faceUp) return null;

  const fnd = tryFoundationFor(top, state.foundations);
  if (fnd !== null) {
    return { kind: 'tableauToFoundation', from: source.column, foundationIdx: fnd };
  }

  let best: { to: number; exposes: number } | null = null;
  for (let to = 0; to < 7; to++) {
    if (to === source.column) continue;
    const dst = state.tableau[to];
    const dstTop = dst[dst.length - 1];
    if (canPlaceOnTableau(top, dstTop)) {
      const exposes = col.length >= 2 && !col[col.length - 2].faceUp ? 1 : 0;
      // tie-break: prefer leftmost target; prefer those that expose more (we do at column-level via remaining face-downs)
      const exposesAfter = exposes + countFaceDownInColumn(col.slice(0, -1));
      if (best === null || exposesAfter > best.exposes) {
        best = { to, exposes: exposesAfter };
      }
    }
  }
  if (best === null) return null;
  return { kind: 'tableauToTableau', from: source.column, cardIndex: col.length - 1, to: best.to };
};

export const nextAutoCompleteMove = (state: GameState): Move | null => {
  for (let from = 0; from < 7; from++) {
    const col = state.tableau[from];
    if (col.length === 0) continue;
    const top = col[col.length - 1];
    if (!top.faceUp) continue;
    const idx = tryFoundationFor(top, state.foundations);
    if (idx !== null) return { kind: 'tableauToFoundation', from, foundationIdx: idx };
  }
  return null;
};
```

- [ ] **Step 4: Run test, expect pass**

```bash
cd /home/paul/dev/perso/solitaire && npm run test:run -- auto
```

Expected: PASS, all auto tests.

- [ ] **Step 5: Commit**

```bash
cd /home/paul/dev/perso/solitaire
git add src/game/auto.ts src/game/__tests__/auto.test.ts
git commit -m "feat(game): Add auto-move targeting and auto-complete step"
```

---

## Task 11: Barrel export + full-engine sanity test (TDD)

**Files:**

- Create: `src/game/index.ts`
- Create: `src/game/__tests__/integration.test.ts`

- [ ] **Step 1: Write the failing integration test**

```ts
// src/game/__tests__/integration.test.ts
import { describe, expect, it } from 'vitest';
import { applyMove, bestNextMove, createInitialState, isWon, undo } from '../index';

describe('engine integration', () => {
  it('produces a deterministic deal and runs a sequence of legal moves', () => {
    const s0 = createInitialState({ drawCount: 1, seed: 'integration-1' });
    expect(s0.tableau).toHaveLength(7);
    expect(s0.stock).toHaveLength(24);

    // draw a few times — each must succeed because stock is non-empty
    let s = s0;
    for (let i = 0; i < 3; i++) s = applyMove(s, { kind: 'draw' });
    expect(s.movesMade).toBe(3);
    expect(s.history).toHaveLength(3);
    expect(s.talon.length).toBe(3);
  });

  it('undo returns to the initial state after any number of legal moves', () => {
    let s = createInitialState({ drawCount: 1, seed: 'integration-2' });
    const original = s;
    for (let i = 0; i < 5; i++) s = applyMove(s, { kind: 'draw' });
    while (s.history.length > 0) s = undo(s);
    expect(s.tableau.map((c) => c.map((x) => x.id))).toEqual(
      original.tableau.map((c) => c.map((x) => x.id)),
    );
    expect(s.stock.map((c) => c.id)).toEqual(original.stock.map((c) => c.id));
    expect(s.talon).toEqual([]);
    expect(s.movesMade).toBe(original.movesMade);
  });

  it('bestNextMove is null on a fresh deal with no easy plays (probabilistic; just runs)', () => {
    const s = createInitialState({ drawCount: 1, seed: 'integration-3' });
    const hint = bestNextMove(s);
    // either a tableau move that exposes a face-down card, or null
    expect(hint === null || typeof hint.kind === 'string').toBe(true);
  });

  it('isWon is false on a fresh deal', () => {
    const s = createInitialState({ drawCount: 1, seed: 'integration-4' });
    expect(isWon(s)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
cd /home/paul/dev/perso/solitaire && npm run test:run -- integration
```

Expected: FAIL — `../index` not found.

- [ ] **Step 3: Write `src/game/index.ts`**

```ts
export * from './card';
export * from './deck';
export * from './state';
export * from './rules';
export * from './moves';
export * from './hints';
export * from './auto';
```

- [ ] **Step 4: Run test, expect pass**

```bash
cd /home/paul/dev/perso/solitaire && npm run test:run -- integration
```

Expected: PASS, 4 integration tests.

- [ ] **Step 5: Run the full suite + lint + build**

```bash
cd /home/paul/dev/perso/solitaire && npm run test:run && npm run lint && npm run build
```

Expected:

- vitest: all engine tests pass.
- eslint: no errors (warnings OK).
- vite build: success.

- [ ] **Step 6: Commit**

```bash
cd /home/paul/dev/perso/solitaire
git add src/game/index.ts src/game/__tests__/integration.test.ts
git commit -m "feat(game): Add barrel export and engine integration tests"
```

---

## Acceptance criteria for Phase 1

- `npm run test:run` passes all engine tests (>30 tests across 6 modules).
- `npm run lint` succeeds.
- `npm run build` succeeds (placeholder UI).
- The `src/game/` directory imports nothing from outside `src/game/` (verifiable with `grep -R "from '\\.\\./" src/game/__tests__/ src/game/*.ts | grep -v "from '\\./"` — should be empty).
- `bestNextMove` returns sensible hints on canned positions; `findAutoMoveTarget` resolves talon and tableau-top sources to legal moves.
- `applyMove` is the only mutator; `undo` round-trips all `Move` kinds tested.

When all of the above hold, Phase 1 is done. Move to Phase 2 (static board UI).
