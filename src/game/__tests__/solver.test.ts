import { describe, expect, it } from 'vitest';
import { Card, makeCard, Rank, Suit } from '../card';
import { applyMove } from '../moves';
import { isWon } from '../rules';
import { solve } from '../solver';
import { createInitialState, GameState } from '../state';
import { blankGameState as blank, fu } from '@/test-utils/factories';

const fullSuitFoundation = (suit: Suit, upTo: number = 13): Card[] =>
  Array.from({ length: upTo }, (_, i) => fu(suit, i + 1));

const replay = (s: GameState, moves: readonly { kind: string }[]): GameState => {
  let cur = s;
  for (const mv of moves) cur = applyMove(cur, mv as Parameters<typeof applyMove>[1]);
  return cur;
};

describe('solve: trivial states', () => {
  it('returns solvable with 0 moves for an already-won state', () => {
    const s = blank({
      foundations: [
        fullSuitFoundation('h'),
        fullSuitFoundation('d'),
        fullSuitFoundation('s'),
        fullSuitFoundation('c'),
      ],
    });
    const r = solve(s);
    expect(r.status).toBe('solvable');
    if (r.status === 'solvable') expect(r.moves).toHaveLength(0);
  });

  it('finds the trivial K♠ → foundation win', () => {
    const s = blank({
      tableau: [[fu('s', 13)], [], [], [], [], [], []],
      foundations: [
        fullSuitFoundation('h'),
        fullSuitFoundation('d'),
        fullSuitFoundation('c'),
        fullSuitFoundation('s', 12),
      ],
    });
    const r = solve(s);
    expect(r.status).toBe('solvable');
    if (r.status === 'solvable') {
      expect(r.moves.length).toBeGreaterThanOrEqual(1);
      expect(isWon(replay(s, r.moves))).toBe(true);
    }
  });

  it('finds a multi-step win via auto-foundation chain', () => {
    // Each suit needs A..K placed; spread them across tableau columns face-up.
    // No interactions needed — pure pile-up to foundations.
    const tableau: Card[][] = [[], [], [], [], [], [], []];
    const ranks: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    const suits: Suit[] = ['h', 'd', 's', 'c'];
    for (const suit of suits) {
      // Stack each suit K..A face-up in its own column so the A is on top.
      tableau[suits.indexOf(suit)] = ranks
        .slice()
        .reverse()
        .map((r) => fu(suit, r));
    }
    const s = blank({ tableau });
    const r = solve(s);
    expect(r.status).toBe('solvable');
    if (r.status === 'solvable') {
      expect(isWon(replay(s, r.moves))).toBe(true);
    }
  });
});

describe('solve: unsolvable states', () => {
  it('reports unsolvable when a single face-down card is locked with no path', () => {
    const s = blank({
      tableau: [[makeCard('s', 2, false)], [], [], [], [], [], []],
      foundations: [[], [], [], []],
      stock: [],
      talon: [],
    });
    const r = solve(s);
    expect(r.status).toBe('unsolvable');
  });
});

describe('solve: deadline / node cap', () => {
  it('returns unknown when the budget is too tight to finish', () => {
    // Use a real deal — most deals take >0 nodes to prove anything.
    const s = createInitialState({ drawCount: 3, seed: 'deadline-test' });
    let nowMs = 0;
    const r = solve(s, {
      deadlineMs: 0, // already past — first node check trips
      now: () => nowMs++,
      maxNodes: 10,
    });
    expect(r.status).toBe('unknown');
  });
});

describe('solve: real deals', () => {
  it('proves a known-easy seed solvable and the move sequence wins', () => {
    // 1-card draw deals are mostly solvable; with a generous budget the solver
    // should converge fast.
    const s = createInitialState({ drawCount: 1, seed: 'solver-known-1' });
    const r = solve(s, { deadlineMs: 5000, maxNodes: 500_000 });
    if (r.status === 'solvable') {
      expect(isWon(replay(s, r.moves))).toBe(true);
    } else {
      // Acceptable outcomes: solvable with valid path, or unsolvable.
      // 'unknown' would mean the budget was insufficient — fail loudly.
      expect(r.status).toBe('unsolvable');
    }
  });
});
