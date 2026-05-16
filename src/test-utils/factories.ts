import { makeCard, Suit } from '@/game/card';
import { GameState } from '@/game/state';

export const blankGameState = (over: Partial<GameState> = {}): GameState => ({
  schemaVersion: 1,
  tableau: [[], [], [], [], [], [], []],
  foundations: [[], [], [], []],
  stock: [],
  talon: [],
  drawCount: 1,
  startedAt: 0,
  activeMs: 0,
  movesMade: 0,
  redealCount: 0,
  undosUsed: 0,
  hintsUsed: 0,
  seed: 't',
  history: [],
  ...over,
});

export const fu = (suit: Suit, rank: number) => makeCard(suit, rank as 1, true);
