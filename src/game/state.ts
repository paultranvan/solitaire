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

const randomSeed = (): string =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

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
