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
