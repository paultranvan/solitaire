// Final score for a won game. Two linear, decaying bonuses — one for time, one
// for move count — sit on top of a flat win bonus, then draw-3 doubles the
// result. Linear (rather than the old 1/time curve) so the two components are
// directly comparable: a move costs MOVE_COST_PER_MOVE, a second costs
// TIME_COST_PER_SEC, and a move is deliberately worth more than a second so
// efficiency is rewarded as much as speed. Always positive on a real win (the
// win bonus is the floor).
export type ScoreInput = {
  durationSec: number;
  moves: number;
  drawCount: 1 | 3;
};

const WIN_BONUS = 500;
const TIME_BUDGET = 6_000;
const TIME_COST_PER_SEC = 10;
const MOVE_BUDGET = 6_000;
const MOVE_COST_PER_MOVE = 20;

export const computeScore = ({ durationSec, moves, drawCount }: ScoreInput): number => {
  const safeTime = Math.max(0, durationSec);
  const safeMoves = Math.max(0, moves);
  const timeBonus = Math.max(0, TIME_BUDGET - TIME_COST_PER_SEC * safeTime);
  const moveBonus = Math.max(0, MOVE_BUDGET - MOVE_COST_PER_MOVE * safeMoves);
  const base = Math.floor(WIN_BONUS + timeBonus + moveBonus);
  return drawCount === 3 ? base * 2 : base;
};
