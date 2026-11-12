import { Card } from './card';
import { dealKlondike } from './deck';
import type { Move } from './moves';

export type GameState = {
  schemaVersion: 1;
  tableau: Card[][];
  foundations: Card[][];
  stock: Card[];
  talon: Card[];
  drawCount: 1 | 3;
  startedAt: number;
  // Accumulated active play time. Ticked from the UI layer when the tab is
  // visible and the game isn't won; drives stats and the on-screen timer.
  // Wall-clock since startedAt is unreliable (tab hidden, app killed).
  activeMs: number;
  movesMade: number;
  redealCount: number;
  // Per-game assistance counters — persisted so they survive autosave.
  undosUsed: number;
  hintsUsed: number;
  seed: string;
  // Every move applied since the deal, in order. Undo drops the last entry (it
  // restores a snapshot taken before that move), so replaying the log from
  // `seed` always reproduces the current position — that is what lets a third
  // party verify a win (see replay.ts). null means the log is unavailable (a
  // save from before it existed, or a game too long to keep logging) and the
  // game can't be verified.
  moveLog: Move[] | null;
  history: GameState[];
};

export const randomSeed = (): string =>
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
    activeMs: 0,
    movesMade: 0,
    redealCount: 0,
    undosUsed: 0,
    hintsUsed: 0,
    seed,
    moveLog: [],
    history: [],
  };
};
