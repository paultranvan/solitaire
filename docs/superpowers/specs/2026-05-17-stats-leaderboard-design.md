# Stats leaderboard & win-screen ranking — design

Date: 2026-05-17

## Goal

Enrich the stats from three aggregate numbers (best score, best time, min
moves) into a per-mode **Top-10 leaderboard**, and tell the player, on every
win, **where that game ranks** among all their wins.

Two player-facing additions:

1. A **Records** sheet with a Top-10 leaderboard per mode (Draw-1, Draw-3).
   Each row shows score, date, time, and moves; the top 3 get 🥇🥈🥉 medals.
2. The **win screen** shows this game's rank ("Your 26th best of 123 wins")
   and celebrates top-3 achievements with a gold banner and medal tiles.

## Decisions (settled during brainstorming)

- **Leaderboard scope:** separate per mode. Draw-1 and Draw-3 each get their
  own Top-10. Consistent with how stats are already split, and avoids Draw-3's
  doubled scores dominating a combined list.
- **Rank denominator:** rank is computed among won games of the *same mode*.
  "26/123" means 123 total wins in that mode, this game placed 26th by score.
- **Row layout:** stacked rows — score is the hero, with `date · time · moves`
  on a quiet sub-line. Top 3 rows show 🥇🥈🥉 in place of the rank number.
- **Placement:** a dedicated **Records** sheet, opened from a button in the
  menu's Stats section, with a Draw-1 / Draw-3 tab. Keeps the menu short.
- **Win screen:** the low-value "Draw" tile is removed. Rank shows as a line
  under the score; a top-3 score replaces that line with a gold banner; a
  top-3 time or moves count turns its tile gold with a medal label.
- **Date format:** `DD/MM/YYYY`, fixed for both locales (user preference).
- **Mode is never named** in the win-screen rank line or banner — "of 123
  wins", not "of 123 Draw-1 wins".

## Architecture

The change sits entirely in the outer layers. `src/game/` (the pure Klondike
engine) is untouched — scoring already lives in `game/score.ts` and is not
affected. New ranking logic is pure but depends on the `WinRecord` type, which
is a stats concept, so it lives in `src/store/`, not `src/game/`.

### 1. Data model — `src/store/statsStore.ts`

Each mode stores a record of every won game.

```ts
export type WinRecord = {
  score: number;
  durationSec: number;
  moves: number;
  dateMs: number; // Date.now() at the moment the win was recorded
};

export type ModeStats = {
  played: number;
  won: number;
  bestTimeSec: number | null;
  fewestMovesWin: number | null;
  bestScore: number | null;
  wins: WinRecord[]; // NEW — every won game, appended newest-last
};
```

**No `schemaVersion` bump.** `normalizeMode` already spreads `emptyMode()`
defaults over loaded data, so saves written before this change load with
`wins: []`. `emptyMode()` gains `wins: []`. This is exactly how `bestScore`
was introduced.

The existing aggregate fields (`bestTimeSec`, `fewestMovesWin`, `bestScore`)
are **kept as-is**. They still drive the Stats-section hero numbers, and
keeping them avoids reworking that section. They are derivable from `wins`,
but the redundancy is cheap and the migration is simpler.

`recordGame` change: inside the `outcome === 'won'` branch, after the existing
aggregate updates, push a `WinRecord`:

```ts
m.wins.push({ score, durationSec, moves, dateMs: Date.now() });
```

The record is only pushed for real wins with a defined `score`. Cheat wins
already skip `recordGame` entirely (Board guards on `cheatWinRef`), so they
leave no record — no extra guard needed. `Date.now()` is called inside the
producer; tests use `vi.setSystemTime` to control it.

Unbounded growth is acceptable: a `WinRecord` is four numbers (~50 bytes
serialized); even thousands of wins stay well under 100 KB in IndexedDB. No
cap is added — a cap would make the rank denominator wrong for old games.

### 2. Pure ranking helpers — `src/store/records.ts` (new)

```ts
import type { WinRecord } from './statsStore';

/** Top n wins by score, highest first. Ties keep insertion order. */
export const topScores = (wins: WinRecord[], n = 10): WinRecord[];

export type Ranking = {
  rank: number;   // 1-based position by score (count scoring strictly higher + 1)
  total: number;  // wins.length
  timeMedal: 0 | 1 | 2 | 3;   // 0 = outside top 3
  movesMedal: 0 | 1 | 2 | 3;
};

/**
 * Rank a just-won game. `game` is assumed already present in `wins`
 * (recordGame runs before this). `total` is wins.length.
 */
export const rankWin = (
  wins: WinRecord[],
  game: { score: number; durationSec: number; moves: number },
): Ranking;
```

- **rank** = `wins.filter(w => w.score > game.score).length + 1`. Ties share a
  rank (standard competition ranking).
- **timeMedal** = position of `game.durationSec` in ascending time order:
  `wins.filter(w => w.durationSec < game.durationSec).length + 1`, clamped to
  `0` when greater than 3.
- **movesMedal** = same, ascending by `moves`.
- The **score medal** is not a separate field — the banner uses `rank`
  directly (`rank <= 3`).

Pure functions, no store or React dependency — directly unit-testable.

### 3. Win flow — `src/ui/Board.tsx`

Current refs `winIsNewBestRef` and `winBestScoreRef` are removed. A new
`winRankingRef = useRef<Ranking | null>(null)` replaces them.

In the win effect, the order becomes:

1. `recordGame({ ... })` — appends the `WinRecord`.
2. Read the updated array:
   `useStatsStore.getState().stats.byMode[mode].wins`.
3. `winRankingRef.current = rankWin(wins, { score, durationSec, moves })`.

For **cheat wins**, `recordGame` is skipped, so step 2/3 are skipped and
`winRankingRef.current` is set to `null` — the win sheet then shows no rank
line or banner (same spirit as today's suppressed new-best badge).

The prior-best read at `Board.tsx:192` is deleted (no longer needed).

### 4. `src/ui/WinSheet.tsx` + `WinSheet.css`

Props change:

- **Removed:** `isNewBest`, `bestScore`, `drawCount`.
- **Added:** `ranking: Ranking | null`.

Render rules:

- **Score block:** unchanged big score + "Score" label. The old
  `win__score-best` / `win__score-badge` lines are removed.
- **Rank presentation** (below the score):
  - `ranking === null` → nothing.
  - `ranking.rank > 3` → quiet line: "Your `{rank}`th best of `{total}` wins".
  - `ranking.rank <= 3` → gold banner: 🥇/🥈/🥉 + message, with an
    "out of `{total}` wins" sub-line.
- **Stat tiles:** Time and Moves only (the "Draw" tile is deleted). When
  `ranking.timeMedal` is 1–3, the Time tile gets the `win__stat--medal`
  modifier and its label becomes the medal label; same for `movesMedal` and
  the Moves tile.

Ordinal handling for the rank line ("26th", "1st", "2nd", "3rd", "21st"…) is
English-only; French uses an invariant form ("26e"). Both come from i18n
(see §6), so no ordinal logic lives in the component.

### 5. Records sheet — `src/ui/RecordsSheet.tsx` + `RecordsSheet.css` (new)

A standalone component wrapping the existing `Sheet`:

```ts
function RecordsSheet({ open, onClose }: { open: boolean; onClose: () => void });
```

- Reads `stats` from `useStatsStore`.
- Local state `tab: '1' | '3'` (defaults to `'1'`), a two-button segmented
  control reusing the existing `.seg` / `.seg__btn` styles.
- Renders `topScores(stats.byMode[tab].wins, 10)` as stacked rows. Each row:
  rank cell (🥇🥈🥉 for indexes 0–2, otherwise the number), score, and a
  `date · time · moves` sub-line. Date via `formatDMY`, time via `formatMMSS`.
- **Empty state:** when the active mode has no wins, a centered message
  ("No wins yet — your best games will appear here.").

Stacking: `RecordsSheet` is rendered as a sibling after the menu's content;
`Sheet` uses fixed-position backdrop + stage, and the later DOM node paints on
top, so it correctly overlays the open `MenuSheet`. (Verify during
implementation; if z-index conflicts, bump `RecordsSheet`'s backdrop/stage.)

### 6. Menu integration — `src/ui/MenuSheet.tsx`

`StatsSection` gains local state `recordsOpen` and:

- A button "🏆 Records & leaderboard" rendered after the mode blocks (styled
  like the existing `.menubtn` row pattern, gold chevron).
- `<RecordsSheet open={recordsOpen} onClose={() => setRecordsOpen(false)} />`.

The existing Stats hero grid, mode blocks, total-time row, and reset control
are unchanged.

### 7. Dates — `src/ui/format.ts`

Add:

```ts
/** Formats an epoch-ms timestamp as zero-padded DD/MM/YYYY. */
export const formatDMY = (ms: number): string;
```

Fixed format for both locales, per the user's explicit request. Lives in
`format.ts` alongside `formatMMSS` rather than `useT` because it is not
locale-dependent.

### 8. i18n — `src/i18n/strings.ts`

New keys (English source of truth; French column required by the type).
Removed: `win.draw`, `win.best`, `win.newBest` (the badge/best lines are gone).

| Key | English | French |
| --- | --- | --- |
| `win.rankLine` | `Your {rank} best of {total} wins` | `Votre {rank} meilleure sur {total} parties gagnées` |
| `win.rankOutOf` | `out of {total} wins` | `sur {total} parties gagnées` |
| `win.bannerGold` | `A new best score! Your finest game yet.` | `Nouveau record ! Votre plus belle partie.` |
| `win.bannerSilver` | `Your 2nd best score ever!` | `Votre 2e meilleur score !` |
| `win.bannerBronze` | `Your 3rd best score ever!` | `Votre 3e meilleur score !` |
| `win.medalTime1/2/3` | `Fastest` / `2nd fastest` / `3rd fastest` | `Plus rapide` / `2e plus rapide` / `3e plus rapide` |
| `win.medalMoves1/2/3` | `Fewest moves` / `2nd fewest` / `3rd fewest` | `Moins de coups` / `2e moins` / `3e moins` |
| `records.title` | `Records` | `Records` |
| `records.open` | `Records & leaderboard` | `Records & classement` |
| `records.topScores` | `Top 10 scores` | `Top 10 des scores` |
| `records.empty` | `No wins yet — your best games will appear here.` | `Aucune victoire — vos meilleures parties s'afficheront ici.` |
| `records.moves` | `{n} moves` | `{n} coups` |

`{rank}` is interpolated as a pre-formatted ordinal string. English ordinals
("1st"…"26th") are produced by a small helper in `WinSheet.tsx`; French passes
`{n}e` (with "1re" as the sole special case). The helper is local to the
component, kept out of `game/`.

## Testing

- **`src/store/__tests__/records.test.ts`** (new): `topScores` — fewer than
  10 wins, exactly 10, more than 10, score-tie ordering, empty. `rankWin` —
  rank 1 / mid / last, score ties sharing a rank, time/moves medal boundaries
  (1st/3rd/4th), and a game that medals in score, time, and moves at once.
- **`src/store/__tests__/statsStore.test.ts`** (extend): `recordGame` appends
  a `WinRecord` with the right fields on a win and appends nothing on an
  abandoned game; `normalizeStats` fills `wins: []` for a pre-`wins` save;
  `dateMs` captured under `vi.setSystemTime`.
- **`src/ui/__tests__/WinSheet.test.tsx`** (new or folded into `Board.test`):
  renders the quiet rank line for `rank > 3`; renders the gold banner for
  rank 1/2/3; applies the medal modifier + label to the Time and Moves tiles;
  renders nothing rank-related when `ranking` is `null`.
- **`src/ui/__tests__/RecordsSheet.test.tsx`** (new): renders up to 10 rows
  with 🥇🥈🥉 on the first three; switches mode on tab click; shows the empty
  state for a mode with no wins.
- Existing `Board.test.tsx` is updated for the changed `WinSheet` props.

## Out of scope

- No combined / cross-mode leaderboard.
- No leaderboard for abandoned games or non-score metrics beyond time/moves.
- No export/share of records.
- No cap or pruning of the `wins` array.
- No change to the scoring formula (`game/score.ts`).
