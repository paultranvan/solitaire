// Final score for a won game. Time is the dominant component (decays smoothly
// past 30s); a flat efficiency bonus rewards low move counts; draw-3 doubles
// the result since it is materially harder. Always positive on a real win.
export type ScoreInput = {
  durationSec: number;
  moves: number;
  drawCount: 1 | 3;
};

const TIME_FLOOR_SEC = 30;
const TIME_NUMERATOR = 1_000_000;
const EFFICIENCY_BUDGET = 5_000;
const EFFICIENCY_PER_MOVE = 20;

export const computeScore = ({ durationSec, moves, drawCount }: ScoreInput): number => {
  const safeTime = Math.max(TIME_FLOOR_SEC, durationSec);
  const safeMoves = Math.max(0, moves);
  const timeBonus = TIME_NUMERATOR / safeTime;
  const efficiencyBonus = Math.max(0, EFFICIENCY_BUDGET - EFFICIENCY_PER_MOVE * safeMoves);
  const base = Math.floor(timeBonus + efficiencyBonus);
  return drawCount === 3 ? base * 2 : base;
};
