# Full Game Log & Skill Instrumentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the wins-only `WinRecord` list with a flat `GameRecord` log that records *every* game (won and abandoned) with all data future stats could need — including per-game hints-used and undos-used.

**Architecture:** Add `undosUsed` / `hintsUsed` counters to `GameState` (persisted, like `movesMade`). Generalise `WinRecord` → `GameRecord` and move it to a flat top-level `Stats.games` log. `recordGame` appends one record per game. Old `byMode[m].wins` arrays migrate into `games` on load. The leaderboard filters the log.

**Tech Stack:** React 18, TypeScript strict, Zustand + immer, Vitest.

## Design

`GameRecord` — one per finished game:

| Field | Notes |
|---|---|
| `outcome` | `'won' \| 'abandoned'` |
| `score` | `number \| null` (null unless a scored win) |
| `durationSec`, `moves` | as today |
| `dateMs` | `Date.now()` when recorded |
| `drawCount` | `1 \| 3` — explicit, so the flat log is self-describing |
| `seed` | the deal's seed |
| `redealCount` | stock recycles |
| `hintsUsed`, `undosUsed` | new per-game counters |

`Stats.games: GameRecord[]` is a flat log (not per-mode) — maximally queryable. The per-mode aggregates (`played`, `won`, `bestScore`, streaks, …) stay as a cache; streak logic is untouched. No `schemaVersion` bump — `normalizeStats` migrates legacy `wins`.

`undosUsed` / `hintsUsed` live on `GameState` so they survive autosave (same rationale as `movesMade`). `GameState.schemaVersion` stays 1; `loadSavedGame` defaults the new fields for old saves.

---

## Task 1: GameState counters

**Files:** `src/game/state.ts`, `src/test-utils/factories.ts`

- [ ] Add to the `GameState` type, after `redealCount`:

```ts
  // Per-game assistance counters — persisted so they survive autosave.
  undosUsed: number;
  hintsUsed: number;
```

- [ ] In `createInitialState`'s returned object, after `redealCount: 0,`:

```ts
    undosUsed: 0,
    hintsUsed: 0,
```

- [ ] In `src/test-utils/factories.ts`, add to `blankGameState`'s object, after `redealCount: 0,`:

```ts
  undosUsed: 0,
  hintsUsed: 0,
```

- [ ] Verify: `npx tsc --noEmit` — only errors should be where `GameState` is otherwise built (none expected beyond Task 2-3 files).

---

## Task 2: undo carries counters + `hint` reducer action

**Files:** `src/game/moves.ts`, `src/store/gameReducer.ts`, tests.

- [ ] In `src/game/moves.ts`, change `undo` so the restored snapshot keeps the
  monotonic counters (the popped snapshot holds stale, lower values):

```ts
export const undo = (state: GameState): GameState => {
  if (state.history.length === 0) return state;
  const prior = state.history[state.history.length - 1];
  return {
    ...prior,
    history: state.history.slice(0, -1),
    undosUsed: state.undosUsed + 1,
    hintsUsed: state.hintsUsed,
  };
};
```

- [ ] In `src/store/gameReducer.ts`, add `| { type: 'hint' }` to `GameAction`, and a case:

```ts
    case 'hint':
      // A hint doesn't change the board or push history — it only bumps the
      // per-game counter so stats can track assistance use.
      return { ...state, hintsUsed: state.hintsUsed + 1 };
```

- [ ] Add tests to `src/game/__tests__/moves.test.ts` inside `describe('undo')`:

```ts
  it('counts each undo and does not let it revert the counter', () => {
    const s = blank({
      tableau: [[makeCard('s', 7, true)], [makeCard('h', 6, true)], [], [], [], [], []],
    });
    const after = applyMove(s, { kind: 'tableauToTableau', from: 1, cardIndex: 0, to: 0 });
    const back = undo(after);
    expect(back.undosUsed).toBe(1);
  });
```

- [ ] Run: `npx vitest run src/game/__tests__/moves.test.ts` — expect PASS.

---

## Task 3: persistence defaults

**Files:** `src/persistence/gameAutosave.ts`

- [ ] In `loadSavedGame`, in the `restored` object literal, add (alongside the
  existing `activeMs` default):

```ts
    undosUsed: typeof loaded.undosUsed === 'number' ? loaded.undosUsed : 0,
    hintsUsed: typeof loaded.hintsUsed === 'number' ? loaded.hintsUsed : 0,
```

- [ ] Verify: `npx tsc --noEmit`.

---

## Task 4: Board — count hints

**Files:** `src/ui/Board.tsx`

- [ ] In `handleHint`, dispatch the counter action once a hint actually exists:

```ts
  const handleHint = () => {
    const move = bestNextMove(state);
    if (move === null) return;
    dispatch({ type: 'hint' });
    setHint(moveToHint(move));
  };
```

(Undo is already `dispatch({ type: 'undo' })` — the reducer now counts it.)

---

## Task 5: GameRecord model + flat log + migration

**Files:** `src/store/statsStore.ts`, `src/store/__tests__/statsStore.test.ts`

- [ ] Replace the `WinRecord` type with:

```ts
export type GameRecord = {
  outcome: 'won' | 'abandoned';
  score: number | null;
  durationSec: number;
  moves: number;
  dateMs: number;
  drawCount: 1 | 3;
  seed: string;
  redealCount: number;
  hintsUsed: number;
  undosUsed: number;
};
```

- [ ] Remove `wins: WinRecord[]` from `ModeStats`. Add `games: GameRecord[]` to
  the `Stats` type (top level, after `totalSecondsPlayed`).

- [ ] Remove `wins: []` from `emptyMode()`. Rewrite `normalizeMode` to build the
  object explicitly (so a legacy `wins` field is dropped, not spread through):

```ts
const normalizeMode = (m: Partial<ModeStats> | undefined): ModeStats => ({
  played: m?.played ?? 0,
  won: m?.won ?? 0,
  bestTimeSec: m?.bestTimeSec ?? null,
  fewestMovesWin: m?.fewestMovesWin ?? null,
  bestScore: m?.bestScore ?? null,
});
```

- [ ] Add `games: []` to `defaultStats()`.

- [ ] Replace `normalizeStats` with a version that migrates legacy per-mode
  `wins` into the flat log:

```ts
type LegacyMode = { wins?: Omit<GameRecord, 'outcome' | 'drawCount' | 'seed' | 'redealCount' | 'hintsUsed' | 'undosUsed'>[] };

const migrateLegacyWins = (s: Stats): GameRecord[] => {
  const out: GameRecord[] = [];
  for (const dc of [1, 3] as const) {
    const legacy = (s.byMode?.[String(dc) as '1' | '3'] as LegacyMode | undefined)?.wins;
    if (Array.isArray(legacy)) {
      for (const w of legacy) {
        out.push({
          outcome: 'won',
          score: w.score,
          durationSec: w.durationSec,
          moves: w.moves,
          dateMs: w.dateMs,
          drawCount: dc,
          seed: '',
          redealCount: 0,
          hintsUsed: 0,
          undosUsed: 0,
        });
      }
    }
  }
  return out.sort((a, b) => a.dateMs - b.dateMs);
};

const normalizeStats = (s: Stats): Stats => ({
  schemaVersion: 1,
  byMode: { '1': normalizeMode(s.byMode?.['1']), '3': normalizeMode(s.byMode?.['3']) },
  currentStreak: s.currentStreak ?? 0,
  longestStreak: s.longestStreak ?? 0,
  totalSecondsPlayed: s.totalSecondsPlayed ?? 0,
  games: Array.isArray(s.games) ? s.games : migrateLegacyWins(s),
});
```

- [ ] Extend `RecordGameInput` — keep `score?` optional, add the rest optional
  (the sole caller, Board, always passes them; optional spares test churn):

```ts
export type RecordGameInput = {
  mode: 1 | 3;
  outcome: 'won' | 'abandoned';
  durationSec: number;
  moves: number;
  score?: number;
  seed?: string;
  redealCount?: number;
  hintsUsed?: number;
  undosUsed?: number;
};
```

- [ ] In `recordGame`, destructure the new fields with defaults and append a
  `GameRecord` for **every** game (inside `set`, after the win/abandon branch):

```ts
    recordGame: ({
      mode, outcome, durationSec, moves, score,
      seed = '', redealCount = 0, hintsUsed = 0, undosUsed = 0,
    }) => {
      set((state) => {
        const m = state.stats.byMode[String(mode) as '1' | '3'];
        m.played += 1;
        state.stats.totalSecondsPlayed += durationSec;
        if (outcome === 'won') {
          m.won += 1;
          if (m.bestTimeSec === null || durationSec < m.bestTimeSec) m.bestTimeSec = durationSec;
          if (m.fewestMovesWin === null || moves < m.fewestMovesWin) m.fewestMovesWin = moves;
          if (score !== undefined && (m.bestScore === null || score > m.bestScore)) {
            m.bestScore = score;
          }
          state.stats.currentStreak += 1;
          if (state.stats.currentStreak > state.stats.longestStreak) {
            state.stats.longestStreak = state.stats.currentStreak;
          }
        } else {
          state.stats.currentStreak = 0;
        }
        state.stats.games.push({
          outcome,
          score: score ?? null,
          durationSec,
          moves,
          dateMs: Date.now(),
          drawCount: mode,
          seed,
          redealCount,
          hintsUsed,
          undosUsed,
        });
      });
      persist(useStatsStore.getState().stats);
    },
```

- [ ] Update `src/store/__tests__/statsStore.test.ts`: in the
  `describe('statsStore.recordGame — win records')` block, replace `.wins`
  references with `.games`:
  - `appends a WinRecord on a win with score` → assert
    `useStatsStore.getState().stats.games` has length 1 and
    `games[0]` deep-equals `{ outcome:'won', score:8420, durationSec:192,
    moves:142, dateMs:<the time>, drawCount:1, seed:'', redealCount:0,
    hintsUsed:0, undosUsed:0 }`.
  - `does not append a WinRecord for an abandoned game` → rename to
    `appends an abandoned GameRecord` and assert `games` length 1 with
    `games[0].outcome === 'abandoned'` and `games[0].score === null`.
  - `does not append a WinRecord for a win with no score` → assert
    `games` length 1 with `games[0].score === null`.
  - Add a test: a `recordGame` with `seed:'abc', redealCount:2, hintsUsed:3,
    undosUsed:1` stores those values on the record.

- [ ] Run: `npx vitest run src/store/__tests__/statsStore.test.ts` — PASS.

---

## Task 6: records.ts — operate on the game log

**Files:** `src/store/records.ts`, `src/store/__tests__/records.test.ts`

- [ ] Rewrite `src/store/records.ts`:

```ts
import type { GameRecord } from './statsStore';

/** A game record known to be a scored win. */
export type WonRecord = GameRecord & { score: number };

/** Won, scored records for one draw mode — newest-appended order preserved. */
export const modeWins = (games: GameRecord[], drawCount: 1 | 3): WonRecord[] =>
  games.filter(
    (g): g is WonRecord =>
      g.drawCount === drawCount && g.outcome === 'won' && g.score !== null,
  );

/** Top n wins by score, highest first. Ties keep their relative order. */
export const topScores = (wins: WonRecord[], n = 10): WonRecord[] =>
  [...wins].sort((a, b) => b.score - a.score).slice(0, n);

export type Ranking = {
  rank: number;
  total: number;
  timeMedal: 0 | 1 | 2 | 3;
  movesMedal: 0 | 1 | 2 | 3;
};

const medal = (placement: number): 0 | 1 | 2 | 3 =>
  placement <= 3 ? (placement as 1 | 2 | 3) : 0;

/** Rank a just-won game; `game` is assumed already present in `wins`. */
export const rankWin = (
  wins: WonRecord[],
  game: { score: number; durationSec: number; moves: number },
): Ranking => ({
  rank: wins.filter((w) => w.score > game.score).length + 1,
  total: wins.length,
  timeMedal: medal(wins.filter((w) => w.durationSec < game.durationSec).length + 1),
  movesMedal: medal(wins.filter((w) => w.moves < game.moves).length + 1),
});
```

- [ ] Rewrite `src/store/__tests__/records.test.ts`: the `w()` helper builds a
  full `GameRecord`. Add `modeWins` tests (filters by mode, drops abandoned,
  drops null-score) and keep the existing `topScores` / `rankWin` cases (their
  inputs are now `WonRecord[]`):

```ts
import { describe, expect, it } from 'vitest';
import type { GameRecord } from '../statsStore';
import { modeWins, rankWin, topScores } from '../records';

const won = (
  score: number, durationSec: number, moves: number, drawCount: 1 | 3 = 1,
): GameRecord => ({
  outcome: 'won', score, durationSec, moves, dateMs: 0,
  drawCount, seed: '', redealCount: 0, hintsUsed: 0, undosUsed: 0,
});
const abandoned = (drawCount: 1 | 3 = 1): GameRecord => ({
  outcome: 'abandoned', score: null, durationSec: 10, moves: 3, dateMs: 0,
  drawCount, seed: '', redealCount: 0, hintsUsed: 0, undosUsed: 0,
});

describe('modeWins', () => {
  it('keeps only scored wins of the requested mode', () => {
    const games = [won(100, 0, 0, 1), abandoned(1), won(200, 0, 0, 3), won(300, 0, 0, 1)];
    expect(modeWins(games, 1).map((g) => g.score)).toEqual([100, 300]);
    expect(modeWins(games, 3).map((g) => g.score)).toEqual([200]);
  });
  it('returns an empty array when there are no wins', () => {
    expect(modeWins([abandoned(1)], 1)).toEqual([]);
  });
});

describe('topScores', () => {
  it('returns up to n wins sorted by score descending', () => {
    expect(topScores(modeWins([won(100,0,0), won(300,0,0), won(200,0,0)], 1)).map((r) => r.score))
      .toEqual([300, 200, 100]);
  });
  it('caps at n', () => {
    const wins = modeWins(Array.from({ length: 15 }, (_, i) => won(i, 0, 0)), 1);
    expect(topScores(wins, 10)).toHaveLength(10);
    expect(topScores(wins, 10)[0].score).toBe(14);
  });
  it('returns an empty array for no wins', () => {
    expect(topScores([], 10)).toEqual([]);
  });
});

describe('rankWin', () => {
  it('ranks the top score #1 of total', () => {
    const wins = modeWins([won(100,200,150), won(300,100,120), won(200,150,130)], 1);
    const r = rankWin(wins, { score: 300, durationSec: 100, moves: 120 });
    expect(r.rank).toBe(1);
    expect(r.total).toBe(3);
  });
  it('ranks a mid score correctly', () => {
    const wins = modeWins([won(100,0,0), won(300,0,0), won(200,0,0)], 1);
    expect(rankWin(wins, { score: 200, durationSec: 0, moves: 0 }).rank).toBe(2);
  });
  it('gives tied scores the same (competition) rank', () => {
    const wins = modeWins([won(300,0,0), won(300,0,0), won(100,0,0)], 1);
    expect(rankWin(wins, { score: 300, durationSec: 0, moves: 0 }).rank).toBe(1);
    expect(rankWin(wins, { score: 100, durationSec: 0, moves: 0 }).rank).toBe(3);
  });
  it('awards time and moves medals for top-3 placement', () => {
    const wins = modeWins([won(0,100,120), won(0,200,200), won(0,300,300)], 1);
    const r = rankWin(wins, { score: 0, durationSec: 100, moves: 120 });
    expect(r.timeMedal).toBe(1);
    expect(r.movesMedal).toBe(1);
  });
  it('gives no medal outside the top 3', () => {
    const wins = modeWins([won(0,10,10), won(0,20,20), won(0,30,30), won(0,40,40)], 1);
    const r = rankWin(wins, { score: 0, durationSec: 40, moves: 40 });
    expect(r.timeMedal).toBe(0);
    expect(r.movesMedal).toBe(0);
  });
  it('handles a sole win — rank 1 of 1, both medals gold', () => {
    const wins = modeWins([won(500,90,100)], 1);
    expect(rankWin(wins, { score: 500, durationSec: 90, moves: 100 }))
      .toEqual({ rank: 1, total: 1, timeMedal: 1, movesMedal: 1 });
  });
});
```

- [ ] Run: `npx vitest run src/store/__tests__/records.test.ts` — PASS.

---

## Task 7: Board — pass full data, rank from the log

**Files:** `src/ui/Board.tsx`

- [ ] Update the import: `import { modeWins, rankWin, type Ranking } from '@/store/records';`

- [ ] In the win effect, the `recordGame` call gains the new fields, and the
  ranking is computed from the flat log:

```ts
      recordGame({
        mode: state.drawCount,
        outcome: 'won',
        durationSec,
        moves: state.movesMade,
        score,
        seed: state.seed,
        redealCount: state.redealCount,
        hintsUsed: state.hintsUsed,
        undosUsed: state.undosUsed,
      });
      // recordGame appended this win — rank it against the mode's win log.
      const wins = modeWins(useStatsStore.getState().stats.games, state.drawCount);
      winRankingRef.current = rankWin(wins, { score, durationSec, moves: state.movesMade });
```

- [ ] In `handleNewGame`, the abandoned-game `recordGame` call gains the fields:

```ts
      recordGame({
        mode: state.drawCount,
        outcome: 'abandoned',
        durationSec: Math.max(0, Math.floor(liveActiveMs() / 1000)),
        moves: state.movesMade,
        seed: state.seed,
        redealCount: state.redealCount,
        hintsUsed: state.hintsUsed,
        undosUsed: state.undosUsed,
      });
```

- [ ] Verify: `npx tsc --noEmit`.

---

## Task 8: RecordsSheet — read the log

**Files:** `src/ui/RecordsSheet.tsx`, `src/ui/__tests__/RecordsSheet.test.tsx`

- [ ] In `RecordsSheet.tsx`, update the import to add `modeWins`, and replace
  the `rows` computation:

```ts
import { modeWins, topScores } from '@/store/records';
```

```ts
  const mode = stats.byMode[tab];
  const rows = topScores(modeWins(stats.games, Number(tab) as 1 | 3), 10);
```

(The summary still reads `mode.bestScore` / `mode.bestTimeSec` /
`mode.fewestMovesWin` — unchanged.)

- [ ] In `RecordsSheet.test.tsx`, rewrite the `seed` helper to populate
  `stats.games` with `GameRecord`s instead of `byMode[m].wins`:

```ts
import { defaultStats, useStatsStore, type GameRecord } from '@/store/statsStore';

const won = (score: number, drawCount: 1 | 3 = 1): GameRecord => ({
  outcome: 'won', score, durationSec: 200, moves: 150,
  dateMs: new Date(2026, 4, 9).getTime(),
  drawCount, seed: '', redealCount: 0, hintsUsed: 0, undosUsed: 0,
});

const seed = (drawCount: 1 | 3, scores: number[]) => {
  const stats = defaultStats();
  stats.games = scores.map((s) => won(s, drawCount));
  useStatsStore.setState({ stats });
};
```

  Update the three existing tests to call `seed(1, …)` / `seed(3, …)`; the
  `switches mode` test seeds `stats.games = [won(500,1), won(999,3)]`. The
  summary test seeds `stats.byMode['1'].bestScore` etc. as before.

- [ ] Run: `npx vitest run src/ui/__tests__/RecordsSheet.test.tsx` — PASS.

---

## Task 9: Full verification

- [ ] `npx tsc --noEmit` — clean.
- [ ] `npm run lint` — clean.
- [ ] `npm run test:run` — all pass.
- [ ] `npm run build` — clean.
- [ ] Browser smoke test: seed a legacy `{ byMode: { '1': { wins: [...] } } }`
  stats object in IndexedDB, reload, confirm the leaderboard still shows those
  wins (migration works). Win a game using a hint and an undo; confirm the new
  `GameRecord` carries `hintsUsed`/`undosUsed`/`seed`. Abandon a game; confirm
  an `abandoned` record is appended.

---

## Self-review

- Every-game logging → Task 5 (`recordGame` appends unconditionally).
- Hints/undos instrumentation → Tasks 1, 2, 4.
- Migration of legacy `wins` → Task 5 (`migrateLegacyWins`).
- `GameRecord` type used identically across Tasks 5/6/7/8.
- `GameState` built in only two sites (`createInitialState`, `blankGameState`)
  — both updated in Task 1; the cheat-win spread inherits the fields.
