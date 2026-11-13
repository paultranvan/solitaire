// Which celebration a world rank earns: one each for the three podium places,
// one shared by the rest of the top ten, and none beyond it.
export type WorldTier = 'gold' | 'silver' | 'bronze' | 'top10';

export const WORLD_TOP = 10;

export const worldTier = (rank: number): WorldTier | null => {
  if (!Number.isInteger(rank) || rank < 1 || rank > WORLD_TOP) return null;
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return 'top10';
};
