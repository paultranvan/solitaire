import { describe, expect, it } from 'vitest';
import { applyMove, MAX_MOVE_LOG, Move, undo } from '../moves';
import { parseMove, parseMoveLog, replayGame } from '../replay';
import { isAutoCompletable, isWon } from '../rules';
import { nextAutoCompleteMove } from '../auto';
import { solve } from '../solver';
import { createInitialState } from '../state';

// Deals the solver cracks in a few thousand nodes, so the budget is node-bound
// (deterministic) rather than time-bound.
const solved = (seed: string, drawCount: 1 | 3): Move[] => {
  const r = solve(createInitialState({ drawCount, seed }), { maxNodes: 20_000 });
  if (r.status !== 'solvable') throw new Error(`fixture ${seed} no longer solvable`);
  return r.moves;
};

describe('move log', () => {
  it('records every applied move and replays to the same position', () => {
    let s = createInitialState({ drawCount: 3, seed: 'replay-fixture-5' });
    for (const move of solved('replay-fixture-5', 3).slice(0, 40)) s = applyMove(s, move);
    expect(s.moveLog).toHaveLength(40);
    expect(s.moveLog).toHaveLength(s.movesMade);

    let again = createInitialState({ drawCount: 3, seed: 'replay-fixture-5' });
    for (const move of s.moveLog!) again = applyMove(again, move);
    expect(again.tableau).toEqual(s.tableau);
    expect(again.stock).toEqual(s.stock);
    expect(again.talon).toEqual(s.talon);
    expect(again.foundations).toEqual(s.foundations);
  });

  it('undo drops the undone move from the log', () => {
    const s0 = createInitialState({ drawCount: 1, seed: 'log-undo' });
    const s1 = applyMove(s0, { kind: 'draw' });
    const s2 = applyMove(s1, { kind: 'draw' });
    expect(s2.moveLog).toEqual([{ kind: 'draw' }, { kind: 'draw' }]);
    const back = undo(s2);
    expect(back.moveLog).toEqual([{ kind: 'draw' }]);
    expect(back.movesMade).toBe(1);
  });

  it('undo keeps accumulated play time instead of rewinding it', () => {
    const s0 = createInitialState({ drawCount: 1, seed: 'log-undo' });
    const s1 = applyMove(s0, { kind: 'draw' });
    const later = { ...s1, activeMs: 90_000 };
    expect(undo(later).activeMs).toBe(90_000);
  });

  it('stops logging (null) once the log is full, and stays null', () => {
    const full = {
      ...createInitialState({ drawCount: 1, seed: 'log-cap' }),
      moveLog: Array.from({ length: MAX_MOVE_LOG }, (): Move => ({ kind: 'draw' })),
    };
    const next = applyMove(full, { kind: 'draw' });
    expect(next.moveLog).toBeNull();
    expect(applyMove(next, { kind: 'draw' }).moveLog).toBeNull();
  });
});

describe('parseMove', () => {
  it.each<Move>([
    { kind: 'draw' },
    { kind: 'draw', count: 1 },
    { kind: 'recycle' },
    { kind: 'tableauToTableau', from: 0, cardIndex: 3, to: 6 },
    { kind: 'tableauToFoundation', from: 6, foundationIdx: 3 },
    { kind: 'talonToTableau', to: 2 },
    { kind: 'talonToFoundation', foundationIdx: 0 },
    { kind: 'foundationToTableau', foundationIdx: 1, to: 4 },
  ])('accepts $kind', (move) => {
    expect(parseMove(JSON.parse(JSON.stringify(move)))).toEqual(move);
  });

  it.each([
    ['null', null],
    ['a string', 'draw'],
    ['an unknown kind', { kind: 'teleport' }],
    ['a bad draw count', { kind: 'draw', count: 2 }],
    ['a column out of range', { kind: 'talonToTableau', to: 7 }],
    ['a negative column', { kind: 'talonToTableau', to: -1 }],
    ['a fractional index', { kind: 'tableauToTableau', from: 0, cardIndex: 1.5, to: 1 }],
    ['a string index', { kind: 'tableauToFoundation', from: '0', foundationIdx: 0 }],
    ['a foundation out of range', { kind: 'talonToFoundation', foundationIdx: 4 }],
    ['a missing field', { kind: 'foundationToTableau', foundationIdx: 0 }],
  ])('rejects %s', (_label, raw) => {
    expect(parseMove(raw)).toBeNull();
  });

  it('drops unknown keys', () => {
    expect(parseMove({ kind: 'recycle', extra: 1, from: 3 })).toEqual({ kind: 'recycle' });
  });
});

describe('parseMoveLog', () => {
  it('rejects the whole log if any entry is invalid or it is too long', () => {
    expect(parseMoveLog([{ kind: 'draw' }, { kind: 'nope' }])).toBeNull();
    expect(parseMoveLog('[]')).toBeNull();
    expect(parseMoveLog([{ kind: 'draw' }, { kind: 'draw' }], 1)).toBeNull();
    expect(parseMoveLog([{ kind: 'draw' }], 1)).toEqual([{ kind: 'draw' }]);
  });
});

describe('replayGame', () => {
  it.each([
    ['replay-fixture-1', 1],
    ['replay-fixture-5', 3],
  ] as const)('verifies a real winning game (%s, draw %i)', (seed, drawCount) => {
    const moves = solved(seed, drawCount);
    const result = replayGame({ seed, drawCount, moves });
    expect(result).toMatchObject({ ok: true, movesMade: moves.length });
  });

  it('rejects the same moves against a different deal or draw mode', () => {
    const moves = solved('replay-fixture-1', 1);
    expect(replayGame({ seed: 'replay-fixture-2', drawCount: 1, moves }).ok).toBe(false);
    expect(replayGame({ seed: 'replay-fixture-1', drawCount: 3, moves }).ok).toBe(false);
  });

  it('rejects a game that stops short of a win', () => {
    const moves = solved('replay-fixture-1', 1).slice(0, -1);
    expect(replayGame({ seed: 'replay-fixture-1', drawCount: 1, moves })).toEqual({
      ok: false,
      reason: 'not-won',
    });
  });

  it('reports the index of the first illegal move', () => {
    const moves = solved('replay-fixture-1', 1).slice();
    moves.splice(5, 0, { kind: 'foundationToTableau', foundationIdx: 0, to: 0 });
    const result = replayGame({ seed: 'replay-fixture-1', drawCount: 1, moves });
    expect(result).toEqual({ ok: false, reason: 'illegal-move', index: 5 });
  });

  it('rejects single-card draws in a draw-3 game before auto-complete is available', () => {
    const result = replayGame({
      seed: 'replay-fixture-5',
      drawCount: 3,
      moves: [{ kind: 'draw', count: 1 }],
    });
    expect(result).toEqual({ ok: false, reason: 'illegal-move', index: 0 });
  });

  it('accepts the single-card draws the auto-complete loop makes', () => {
    // Play the solution until the tableau is fully face-up, then finish the way
    // the app does: nextAutoCompleteMove, which draws one card at a time.
    const seed = 'replay-fixture-5';
    let s = createInitialState({ drawCount: 3, seed });
    for (const move of solved(seed, 3)) {
      if (isAutoCompletable(s)) break;
      s = applyMove(s, move);
    }
    expect(isAutoCompletable(s)).toBe(true);
    let sawSingleDraw = false;
    for (let guard = 0; !isWon(s) && guard < 2000; guard++) {
      const move = nextAutoCompleteMove(s);
      if (move === null) break;
      if (move.kind === 'draw' && move.count === 1) sawSingleDraw = true;
      s = applyMove(s, move);
    }
    expect(isWon(s)).toBe(true);
    expect(sawSingleDraw).toBe(true);
    expect(replayGame({ seed, drawCount: 3, moves: s.moveLog! })).toMatchObject({
      ok: true,
      movesMade: s.movesMade,
    });
  });
});
