# Stats Leaderboard & Win-Screen Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-mode Top-10 leaderboard (Records sheet) and show each win's rank — with top-3 medal celebrations — on the win screen.

**Architecture:** Store a `WinRecord` per won game inside `ModeStats.wins`. Pure ranking helpers in `src/store/records.ts` compute leaderboard and rank. The win flow reads back the updated `wins` and threads a `Ranking` into `WinSheet`. A new `RecordsSheet` opens from the menu's Stats section.

**Tech Stack:** React 18, TypeScript strict, Zustand + immer, Vitest + jsdom, motion/react.

Spec: `docs/superpowers/specs/2026-05-17-stats-leaderboard-design.md`

---

## File Structure

- `src/store/statsStore.ts` — modify: add `WinRecord` type, `wins` field, append in `recordGame`.
- `src/store/records.ts` — create: pure `topScores` + `rankWin` helpers, `Ranking` type.
- `src/store/__tests__/records.test.ts` — create.
- `src/store/__tests__/statsStore.test.ts` — modify: cover `wins`.
- `src/ui/format.ts` — modify: add `formatDMY`.
- `src/ui/__tests__/format.test.ts` — create.
- `src/i18n/strings.ts` — modify: add/remove keys.
- `src/ui/WinSheet.tsx` + `WinSheet.css` — modify: rank line / banner / medal tiles.
- `src/ui/Board.tsx` — modify: compute `Ranking`, change `WinSheet` props.
- `src/ui/RecordsSheet.tsx` + `RecordsSheet.css` — create.
- `src/ui/MenuSheet.tsx` + `MenuSheet.css` — modify: "Records" button + sheet.
- `src/ui/__tests__/RecordsSheet.test.tsx` — create.
- `src/ui/__tests__/Board.test.tsx` — modify if it asserts removed `WinSheet` props.

---

## Task 1: Data model — `WinRecord` and `wins`

**Files:**
- Modify: `src/store/statsStore.ts`
- Test: `src/store/__tests__/statsStore.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/store/__tests__/statsStore.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';

describe('statsStore.recordGame — win records', () => {
  beforeEach(() => {
    useStatsStore.setState({ stats: defaultStats() });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T10:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('appends a WinRecord on a win with score', () => {
    useStatsStore.getState().recordGame({
      mode: 1, outcome: 'won', durationSec: 192, moves: 142, score: 8420,
    });
    const wins = useStatsStore.getState().stats.byMode['1'].wins;
    expect(wins).toHaveLength(1);
    expect(wins[0]).toEqual({
      score: 8420, durationSec: 192, moves: 142,
      dateMs: new Date('2026-05-14T10:00:00Z').getTime(),
    });
  });

  it('does not append a WinRecord for an abandoned game', () => {
    useStatsStore.getState().recordGame({
      mode: 1, outcome: 'abandoned', durationSec: 30, moves: 5,
    });
    expect(useStatsStore.getState().stats.byMode['1'].wins).toHaveLength(0);
  });

  it('does not append a WinRecord for a win with no score', () => {
    useStatsStore.getState().recordGame({
      mode: 1, outcome: 'won', durationSec: 100, moves: 50,
    });
    expect(useStatsStore.getState().stats.byMode['1'].wins).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/__tests__/statsStore.test.ts -t "win records"`
Expected: FAIL — `wins` is `undefined`.

- [ ] **Step 3: Implement**

In `src/store/statsStore.ts`:

Add the type and extend `ModeStats`:

```ts
export type WinRecord = {
  score: number;
  durationSec: number;
  moves: number;
  dateMs: number;
};

export type ModeStats = {
  played: number;
  won: number;
  bestTimeSec: number | null;
  fewestMovesWin: number | null;
  bestScore: number | null;
  wins: WinRecord[];
};
```

Extend `emptyMode`:

```ts
const emptyMode = (): ModeStats => ({
  played: 0,
  won: 0,
  bestTimeSec: null,
  fewestMovesWin: null,
  bestScore: null,
  wins: [],
});
```

`normalizeMode` already spreads `emptyMode()` first, so old saves without
`wins` are filled — leave it as is.

In `recordGame`, inside the `if (outcome === 'won') { ... }` block, after the
`bestScore` update, append the record only when a score is present:

```ts
if (score !== undefined) {
  m.wins.push({ score, durationSec, moves, dateMs: Date.now() });
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/store/__tests__/statsStore.test.ts`
Expected: PASS (all, including pre-existing tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/statsStore.ts src/store/__tests__/statsStore.test.ts
git commit -m "feat(stats): record per-win history in ModeStats.wins"
```

---

## Task 2: Pure ranking helpers — `records.ts`

**Files:**
- Create: `src/store/records.ts`
- Test: `src/store/__tests__/records.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/store/__tests__/records.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { WinRecord } from '../statsStore';
import { rankWin, topScores } from '../records';

const w = (score: number, durationSec: number, moves: number): WinRecord => ({
  score, durationSec, moves, dateMs: 0,
});

describe('topScores', () => {
  it('returns up to n wins sorted by score descending', () => {
    const wins = [w(100, 0, 0), w(300, 0, 0), w(200, 0, 0)];
    expect(topScores(wins, 10).map((r) => r.score)).toEqual([300, 200, 100]);
  });

  it('caps at n', () => {
    const wins = Array.from({ length: 15 }, (_, i) => w(i, 0, 0));
    expect(topScores(wins, 10)).toHaveLength(10);
    expect(topScores(wins, 10)[0].score).toBe(14);
  });

  it('returns an empty array for no wins', () => {
    expect(topScores([], 10)).toEqual([]);
  });
});

describe('rankWin', () => {
  it('ranks the top score #1 of total', () => {
    const wins = [w(100, 200, 150), w(300, 100, 120), w(200, 150, 130)];
    const r = rankWin(wins, { score: 300, durationSec: 100, moves: 120 });
    expect(r.rank).toBe(1);
    expect(r.total).toBe(3);
  });

  it('ranks a mid score correctly', () => {
    const wins = [w(100, 0, 0), w(300, 0, 0), w(200, 0, 0)];
    expect(rankWin(wins, { score: 200, durationSec: 0, moves: 0 }).rank).toBe(2);
  });

  it('gives tied scores the same (competition) rank', () => {
    const wins = [w(300, 0, 0), w(300, 0, 0), w(100, 0, 0)];
    expect(rankWin(wins, { score: 300, durationSec: 0, moves: 0 }).rank).toBe(1);
    expect(rankWin(wins, { score: 100, durationSec: 0, moves: 0 }).rank).toBe(3);
  });

  it('awards time and moves medals for top-3 placement', () => {
    const wins = [w(0, 100, 120), w(0, 200, 200), w(0, 300, 300)];
    const r = rankWin(wins, { score: 0, durationSec: 100, moves: 120 });
    expect(r.timeMedal).toBe(1);
    expect(r.movesMedal).toBe(1);
  });

  it('gives no medal outside the top 3', () => {
    const wins = [w(0, 10, 10), w(0, 20, 20), w(0, 30, 30), w(0, 40, 40)];
    const r = rankWin(wins, { score: 0, durationSec: 40, moves: 40 });
    expect(r.timeMedal).toBe(0);
    expect(r.movesMedal).toBe(0);
  });

  it('handles a sole win — rank 1 of 1, both medals gold', () => {
    const wins = [w(500, 90, 100)];
    const r = rankWin(wins, { score: 500, durationSec: 90, moves: 100 });
    expect(r).toEqual({ rank: 1, total: 1, timeMedal: 1, movesMedal: 1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/__tests__/records.test.ts`
Expected: FAIL — cannot find module `../records`.

- [ ] **Step 3: Implement**

Create `src/store/records.ts`:

```ts
import type { WinRecord } from './statsStore';

/** Top n wins by score, highest first. Ties keep their relative order. */
export const topScores = (wins: WinRecord[], n = 10): WinRecord[] =>
  [...wins].sort((a, b) => b.score - a.score).slice(0, n);

export type Ranking = {
  /** 1-based position by score (count of strictly-higher scores + 1). */
  rank: number;
  /** Total wins in this mode. */
  total: number;
  /** 1-3 for a top-3 fastest time, 0 otherwise. */
  timeMedal: 0 | 1 | 2 | 3;
  /** 1-3 for a top-3 fewest-moves count, 0 otherwise. */
  movesMedal: 0 | 1 | 2 | 3;
};

const medal = (placement: number): 0 | 1 | 2 | 3 =>
  placement <= 3 ? (placement as 1 | 2 | 3) : 0;

/**
 * Rank a just-won game. `game` is assumed already present in `wins`
 * (recordGame runs before this). Lower time / moves is better.
 */
export const rankWin = (
  wins: WinRecord[],
  game: { score: number; durationSec: number; moves: number },
): Ranking => ({
  rank: wins.filter((w) => w.score > game.score).length + 1,
  total: wins.length,
  timeMedal: medal(wins.filter((w) => w.durationSec < game.durationSec).length + 1),
  movesMedal: medal(wins.filter((w) => w.moves < game.moves).length + 1),
});
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/store/__tests__/records.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/records.ts src/store/__tests__/records.test.ts
git commit -m "feat(stats): add pure topScores and rankWin helpers"
```

---

## Task 3: Date helper — `formatDMY`

**Files:**
- Modify: `src/ui/format.ts`
- Test: `src/ui/__tests__/format.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/ui/__tests__/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatDMY, formatMMSS } from '../format';

describe('formatMMSS', () => {
  it('zero-pads minutes and seconds', () => {
    expect(formatMMSS(5)).toBe('00:05');
    expect(formatMMSS(192)).toBe('03:12');
  });
});

describe('formatDMY', () => {
  it('formats an epoch-ms timestamp as zero-padded DD/MM/YYYY', () => {
    // 2026-05-09 local time
    const ms = new Date(2026, 4, 9, 12, 0, 0).getTime();
    expect(formatDMY(ms)).toBe('09/05/2026');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/__tests__/format.test.ts`
Expected: FAIL — `formatDMY` is not exported.

- [ ] **Step 3: Implement**

Append to `src/ui/format.ts`:

```ts
// Formats an epoch-ms timestamp as zero-padded DD/MM/YYYY (fixed for all locales).
export const formatDMY = (ms: number): string => {
  const d = new Date(ms);
  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/ui/__tests__/format.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/format.ts src/ui/__tests__/format.test.ts
git commit -m "feat(ui): add formatDMY date helper"
```

---

## Task 4: i18n strings

**Files:**
- Modify: `src/i18n/strings.ts`

- [ ] **Step 1: Edit strings**

In `src/i18n/strings.ts`, in the `en` object: **remove** `'win.newBest'`,
`'win.best'`, and `'win.draw'`. **Add** these keys (place them near the other
`win.*` keys):

```ts
  'win.rankLine': 'Your {rank} best of {total} wins',
  'win.rankOutOf': 'out of {total} wins',
  'win.bannerGold': '🥇 A new best score! Your finest game yet.',
  'win.bannerSilver': '🥈 Your 2nd best score ever!',
  'win.bannerBronze': '🥉 Your 3rd best score ever!',
  'win.medalTime1': '🥇 Fastest',
  'win.medalTime2': '🥈 2nd fastest',
  'win.medalTime3': '🥉 3rd fastest',
  'win.medalMoves1': '🥇 Fewest moves',
  'win.medalMoves2': '🥈 2nd fewest',
  'win.medalMoves3': '🥉 3rd fewest',
  'records.title': 'Records',
  'records.open': 'Records & leaderboard',
  'records.topScores': 'Top 10 scores',
  'records.empty': 'No wins yet — your best games will appear here.',
  'records.moves': '{n} moves',
```

In the `fr` object: **remove** the same three keys and **add** the French
translations:

```ts
  'win.rankLine': 'Votre {rank} meilleure sur {total} parties gagnées',
  'win.rankOutOf': 'sur {total} parties gagnées',
  'win.bannerGold': '🥇 Nouveau record ! Votre plus belle partie.',
  'win.bannerSilver': '🥈 Votre 2e meilleur score !',
  'win.bannerBronze': '🥉 Votre 3e meilleur score !',
  'win.medalTime1': '🥇 Plus rapide',
  'win.medalTime2': '🥈 2e plus rapide',
  'win.medalTime3': '🥉 3e plus rapide',
  'win.medalMoves1': '🥇 Moins de coups',
  'win.medalMoves2': '🥈 2e moins de coups',
  'win.medalMoves3': '🥉 3e moins de coups',
  'records.title': 'Records',
  'records.open': 'Records & classement',
  'records.topScores': 'Top 10 des scores',
  'records.empty': "Aucune victoire — vos meilleures parties s'afficheront ici.",
  'records.moves': '{n} coups',
```

`StringKey` is derived from `keyof typeof en` and `fr` is typed
`Record<StringKey, string>`, so TypeScript fails the build if either column is
missing a key — Step 2 catches that.

- [ ] **Step 2: Verify the build typechecks**

Run: `npx tsc --noEmit`
Expected: errors ONLY in `WinSheet.tsx` / `MenuSheet.tsx` for the removed keys
(`win.newBest`, `win.best`, `win.draw`) — those are fixed in Tasks 5 and 8. No
errors inside `strings.ts` itself.

- [ ] **Step 3: Commit**

```bash
git add src/i18n/strings.ts
git commit -m "feat(i18n): add records & win-rank strings, drop old win keys"
```

---

## Task 5: WinSheet — rank line, banner, medal tiles

**Files:**
- Modify: `src/ui/WinSheet.tsx`, `src/ui/WinSheet.css`

- [ ] **Step 1: Rewrite the WinSheet component body**

In `src/ui/WinSheet.tsx`:

Add the import:

```ts
import type { Ranking } from '@/store/records';
```

Replace the props interface — remove `isNewBest`, `bestScore`, `drawCount`;
add `ranking`:

```ts
export function WinSheet({
  open,
  onClose,
  onPlayAgain,
  durationSec,
  moves,
  score,
  ranking,
  showConfetti = true,
}: {
  open: boolean;
  onClose: () => void;
  onPlayAgain: () => void;
  durationSec: number;
  moves: number;
  score: number;
  ranking: Ranking | null;
  showConfetti?: boolean;
}) {
```

Add an English ordinal helper above the component:

```ts
// "1st", "2nd", "3rd", "21st", "26th"… English only; French uses "{n}e".
const ordinalEn = (n: number): string => {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
};
const ordinal = (n: number, lang: 'en' | 'fr'): string =>
  lang === 'fr' ? (n === 1 ? '1re' : `${n}e`) : ordinalEn(n);
```

Inside the component, after `const { t, formatNumber } = useT();` (add `lang`):

```ts
  const { t, formatNumber, lang } = useT();

  const bannerKey =
    ranking === null || ranking.rank > 3
      ? null
      : (['win.bannerGold', 'win.bannerSilver', 'win.bannerBronze'] as const)[
          ranking.rank - 1
        ];

  const medalLabel = (kind: 'Time' | 'Moves', placement: 0 | 1 | 2 | 3) =>
    placement === 0 ? null : t(`win.medal${kind}${placement}` as const);
```

Replace the score block markup (the `win__score` div's inner `win__score-best`
/ `win__score-badge` lines) so the score block is just value + label, and add
the rank/banner block right after the closing `</div>` of `win__score`:

```tsx
          <div className="win__score">
            <div className="win__score-value">{formatNumber(score)}</div>
            <div className="win__score-label">{t('win.score')}</div>
          </div>

          {ranking !== null && bannerKey === null && (
            <p className="win__rank">
              {t('win.rankLine', {
                rank: ordinal(ranking.rank, lang),
                total: formatNumber(ranking.total),
              })}
            </p>
          )}
          {ranking !== null && bannerKey !== null && (
            <div className="win__banner">
              <span className="win__banner-msg">{t(bannerKey)}</span>
              <span className="win__banner-sub">
                {t('win.rankOutOf', { total: formatNumber(ranking.total) })}
              </span>
            </div>
          )}
```

Replace the stats grid — drop the "Draw" stat, and apply medal modifiers to
the Time and Moves tiles:

```tsx
          <div className="win__stats win__stats--pair">
            <div
              className={`win__stat${ranking && ranking.timeMedal ? ' win__stat--medal' : ''}`}
            >
              <div className="win__stat-value">{formatMMSS(durationSec)}</div>
              <div className="win__stat-label">
                {medalLabel('Time', ranking?.timeMedal ?? 0) ?? t('win.time')}
              </div>
            </div>
            <div
              className={`win__stat${ranking && ranking.movesMedal ? ' win__stat--medal' : ''}`}
            >
              <div className="win__stat-value">{formatNumber(moves)}</div>
              <div className="win__stat-label">
                {medalLabel('Moves', ranking?.movesMedal ?? 0) ?? t('win.moves')}
              </div>
            </div>
          </div>
```

- [ ] **Step 2: Update WinSheet.css**

In `src/ui/WinSheet.css`: delete the `.win__score-best` and
`.win__score-badge` rules. Add:

```css
.win__rank {
  margin: -8px 0 18px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.66);
  font-variant-numeric: tabular-nums;
}

.win__banner {
  margin: -6px 0 18px;
  padding: 10px 14px;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(250, 204, 21, 0.2), rgba(250, 204, 21, 0.08));
  border: 1px solid rgba(250, 204, 21, 0.4);
}

.win__banner-msg {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #fde68a;
}

.win__banner-sub {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  font-variant-numeric: tabular-nums;
}

.win__stats--pair {
  grid-template-columns: repeat(2, 1fr);
}

.win__stat--medal {
  background: rgba(250, 204, 21, 0.14);
  border: 1px solid rgba(250, 204, 21, 0.38);
}

.win__stat--medal .win__stat-label {
  color: rgba(253, 230, 138, 0.85);
}
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: errors now ONLY in `Board.tsx` (passes removed props) and
`MenuSheet.tsx` (`win.draw` etc. not used there — only `Board.tsx` for
`WinSheet`). Fixed in Tasks 6 and 8.

- [ ] **Step 4: Commit**

```bash
git add src/ui/WinSheet.tsx src/ui/WinSheet.css
git commit -m "feat(ui): show rank line, top-3 banner and medal tiles on win"
```

---

## Task 6: Board — compute and pass `Ranking`

**Files:**
- Modify: `src/ui/Board.tsx`

- [ ] **Step 1: Update imports and refs**

In `src/ui/Board.tsx` add the import:

```ts
import { rankWin, type Ranking } from '@/store/records';
```

Replace the two refs `winIsNewBestRef` and `winBestScoreRef` with one:

```ts
  // Ranking of the current win (null for cheat wins — no record was kept).
  const winRankingRef = useRef<Ranking | null>(null);
```

- [ ] **Step 2: Update the win effect**

In the win effect (around `Board.tsx:181-205`), delete the `priorBest` /
`winIsNewBestRef` / `winBestScoreRef` lines. After the `recordGame({ ... })`
call, add:

```ts
      if (!isCheat) {
        const mWins = useStatsStore.getState().stats.byMode[
          String(state.drawCount) as '1' | '3'
        ].wins;
        winRankingRef.current = rankWin(mWins, { score, durationSec, moves });
      } else {
        winRankingRef.current = null;
      }
```

Keep `recordGame` guarded by `!isCheat` exactly as it is today. The
`winScoreRef` / `winDurationRef` / `winMovesRef` assignments stay.

- [ ] **Step 3: Update the WinSheet usage**

Replace the `<WinSheet .../>` props `isNewBest`, `bestScore`, `drawCount`
with `ranking`:

```tsx
        <WinSheet
          open={winOpen}
          onClose={() => setWinOpen(false)}
          onPlayAgain={() => {
            setWinOpen(false);
            handleNewGame();
          }}
          durationSec={winDurationRef.current}
          moves={winMovesRef.current}
          score={winScoreRef.current}
          ranking={winRankingRef.current}
          showConfetti={animationsOn}
        />
```

- [ ] **Step 4: Verify typecheck and tests**

Run: `npx tsc --noEmit`
Expected: PASS (no errors), unless `Board.test.tsx` references removed props —
if so, fix the test to pass `ranking={null}` or a `Ranking` object.

Run: `npx vitest run src/ui/__tests__/Board.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Board.tsx src/ui/__tests__/Board.test.tsx
git commit -m "feat(ui): compute win ranking and pass it to WinSheet"
```

---

## Task 7: RecordsSheet component

**Files:**
- Create: `src/ui/RecordsSheet.tsx`, `src/ui/RecordsSheet.css`
- Test: `src/ui/__tests__/RecordsSheet.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/ui/__tests__/RecordsSheet.test.tsx`:

```tsx
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RecordsSheet } from '../RecordsSheet';
import { defaultStats, useStatsStore, type WinRecord } from '@/store/statsStore';

const win = (score: number): WinRecord => ({
  score, durationSec: 200, moves: 150, dateMs: new Date(2026, 4, 9).getTime(),
});

afterEach(cleanup);

const seed = (mode: '1' | '3', scores: number[]) => {
  const stats = defaultStats();
  stats.byMode[mode].wins = scores.map(win);
  useStatsStore.setState({ stats });
};

describe('RecordsSheet', () => {
  it('shows the empty state when a mode has no wins', () => {
    seed('1', []);
    render(<RecordsSheet open onClose={() => {}} />);
    expect(screen.getByText(/no wins yet/i)).toBeInTheDocument();
  });

  it('renders at most 10 rows, sorted by score descending', () => {
    seed('1', Array.from({ length: 12 }, (_, i) => (i + 1) * 100));
    render(<RecordsSheet open onClose={() => {}} />);
    expect(screen.getByText('1,200')).toBeInTheDocument();
    expect(screen.queryByText('200')).not.toBeInTheDocument();
  });

  it('switches mode when the Draw-3 tab is clicked', () => {
    const stats = defaultStats();
    stats.byMode['1'].wins = [win(500)];
    stats.byMode['3'].wins = [win(999)];
    useStatsStore.setState({ stats });
    render(<RecordsSheet open onClose={() => {}} />);
    expect(screen.queryByText('999')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /draw 3/i }));
    expect(screen.getByText('999')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/__tests__/RecordsSheet.test.tsx`
Expected: FAIL — cannot find module `../RecordsSheet`.

- [ ] **Step 3: Implement the component**

Create `src/ui/RecordsSheet.tsx`:

```tsx
import { useState } from 'react';
import { useStatsStore } from '@/store/statsStore';
import { useT } from '@/i18n/useT';
import { topScores } from '@/store/records';
import { Sheet } from './Sheet';
import { formatDMY, formatMMSS } from './format';
import './RecordsSheet.css';

const MEDALS = ['🥇', '🥈', '🥉'];

export function RecordsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const stats = useStatsStore((s) => s.stats);
  const { t, formatNumber } = useT();
  const [tab, setTab] = useState<'1' | '3'>('1');

  const rows = topScores(stats.byMode[tab].wins, 10);

  return (
    <Sheet open={open} onClose={onClose} title={t('records.title')}>
      <div className="records">
        <div className="seg records__tabs">
          {(['1', '3'] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`seg__btn${tab === m ? ' is-active' : ''}`}
              onClick={() => setTab(m)}
            >
              {t('stats.draw', { n: m })}
            </button>
          ))}
        </div>

        <h3 className="records__heading">{t('records.topScores')}</h3>

        {rows.length === 0 ? (
          <p className="records__empty">{t('records.empty')}</p>
        ) : (
          <ol className="records__list">
            {rows.map((r, i) => (
              <li
                key={`${r.dateMs}-${i}`}
                className={`lbrow${i < 3 ? ' lbrow--medal' : ''}`}
              >
                <span className="lbrow__rank">{i < 3 ? MEDALS[i] : i + 1}</span>
                <span className="lbrow__main">
                  <span className="lbrow__score">{formatNumber(r.score)}</span>
                  <span className="lbrow__meta">
                    {formatDMY(r.dateMs)} · {formatMMSS(r.durationSec)} ·{' '}
                    {t('records.moves', { n: formatNumber(r.moves) })}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Sheet>
  );
}
```

- [ ] **Step 4: Create the stylesheet**

Create `src/ui/RecordsSheet.css`:

```css
.records {
  padding: 4px 0 8px;
}

.records__tabs {
  margin-bottom: 18px;
}

.records__heading {
  margin: 0 0 8px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-quiet);
}

.records__empty {
  text-align: center;
  padding: 32px 12px;
  color: var(--ink-quiet);
  font-size: 14px;
}

.records__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.lbrow {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 4px;
  border-bottom: 1px solid var(--rule);
}

.lbrow:last-child {
  border-bottom: 0;
}

.lbrow__rank {
  width: 30px;
  flex: none;
  text-align: center;
  font-size: 15px;
  color: var(--ink-quiet);
  font-variant-numeric: tabular-nums;
}

.lbrow--medal .lbrow__rank {
  font-size: 19px;
}

.lbrow__main {
  flex: 1;
  min-width: 0;
}

.lbrow__score {
  display: block;
  font-size: 18px;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.lbrow__meta {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--ink-quiet);
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/ui/__tests__/RecordsSheet.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/RecordsSheet.tsx src/ui/RecordsSheet.css src/ui/__tests__/RecordsSheet.test.tsx
git commit -m "feat(ui): add RecordsSheet with per-mode top-10 leaderboard"
```

---

## Task 8: Menu integration

**Files:**
- Modify: `src/ui/MenuSheet.tsx`, `src/ui/MenuSheet.css`

- [ ] **Step 1: Wire the Records button into StatsSection**

In `src/ui/MenuSheet.tsx`:

Add imports:

```ts
import { RecordsSheet } from './RecordsSheet';
```

(`useState` is already imported.)

Inside `StatsSection`, add local state near the top of the function:

```ts
  const [recordsOpen, setRecordsOpen] = useState(false);
```

Add the button immediately after the `mode-pair` `<div>` (before the
`m-row m-row--quiet` total-time row):

```tsx
      <button
        type="button"
        className="records-link"
        onClick={() => setRecordsOpen(true)}
      >
        <span className="records-link__label">🏆 {t('records.open')}</span>
        <span className="records-link__chev" aria-hidden="true">
          ›
        </span>
      </button>
```

Add the sheet at the end of the `StatsSection` JSX, just before the closing
`</section>`:

```tsx
      <RecordsSheet open={recordsOpen} onClose={() => setRecordsOpen(false)} />
```

- [ ] **Step 2: Style the button**

Append to `src/ui/MenuSheet.css`:

```css
.records-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin: 14px 0 4px;
  padding: 13px 14px;
  border: 1px solid var(--rule-strong);
  border-radius: 10px;
  background: var(--gold-soft);
  color: var(--ink);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.records-link__chev {
  color: var(--gold);
  font-size: 18px;
}
```

- [ ] **Step 3: Verify build and full test run**

Run: `npx tsc --noEmit`
Expected: PASS — no errors.

Run: `npm run test:run`
Expected: PASS — all tests.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/ui/MenuSheet.tsx src/ui/MenuSheet.css
git commit -m "feat(ui): open RecordsSheet from the menu stats section"
```

---

## Task 9: Manual smoke test in the browser

- [ ] **Step 1: Build and run**

Run: `npm run build` — expect a clean build.
Run: `npm run dev` — open http://localhost:5173.

- [ ] **Step 2: Verify**

- Open the menu → Stats section shows the "🏆 Records & leaderboard" button.
- Click it → Records sheet opens over the menu with Draw 1 / Draw 3 tabs.
- With no wins, the empty state shows for both tabs.
- Win a game (use the auto-complete / cheat path) → the win screen shows the
  rank line, or a gold banner + medal tiles when the win places top-3.
- After a real win, reopen Records → the game appears in the leaderboard with
  the correct DD/MM/YYYY date, time, and moves.

Fix any visual or behavioural issues found, re-running `npm run test:run`
after each fix.

---

## Self-Review notes

- Spec §1 data model → Task 1. §2 helpers → Task 2. §3 win flow → Task 6.
  §4 WinSheet → Task 5. §5 RecordsSheet → Task 7. §6 menu → Task 8.
  §7 dates → Task 3. §8 i18n → Task 4. Testing → tests in Tasks 1-7 + Task 9.
- `Ranking` type defined in Task 2, consumed identically in Tasks 5 and 6.
- `WinRecord` defined in Task 1, imported in Tasks 2 and 7.
- Removed i18n keys (`win.newBest`, `win.best`, `win.draw`) — Task 4 removes,
  Task 5 removes their only call sites in `WinSheet.tsx`. Confirmed no other
  references via `grep`.
