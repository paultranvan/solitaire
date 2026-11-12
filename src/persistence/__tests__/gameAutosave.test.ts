import { describe, expect, it } from 'vitest';
import { createInitialState, GameState } from '@/game/state';
import { applyMove } from '@/game/moves';
import { parseSavedGame } from '../gameAutosave';

// What the autosave writes: the state minus history, after a structured clone.
const saved = (state: GameState): Record<string, unknown> => {
  const { history: _h, ...rest } = state;
  return JSON.parse(JSON.stringify(rest));
};

describe('parseSavedGame', () => {
  const fresh = () => createInitialState({ drawCount: 3, seed: 'autosave-test' });

  it('round-trips a real in-progress game with an empty history', () => {
    const state = applyMove(fresh(), { kind: 'draw' });
    const restored = parseSavedGame(saved(state));
    expect(restored).toEqual({ ...state, history: [] });
  });

  it('defaults counters that pre-date their introduction', () => {
    const blob = saved(fresh());
    delete blob.activeMs;
    delete blob.undosUsed;
    delete blob.hintsUsed;
    expect(parseSavedGame(blob)).toMatchObject({ activeMs: 0, undosUsed: 0, hintsUsed: 0 });
  });

  it('resumes as unverifiable (null log) when the log is missing, invalid or out of step', () => {
    const state = applyMove(fresh(), { kind: 'draw' });

    const missing = saved(state);
    delete missing.moveLog;
    expect(parseSavedGame(missing)).toMatchObject({ moveLog: null, movesMade: 1 });

    const invalid = { ...saved(state), moveLog: [{ kind: 'teleport' }] };
    expect(parseSavedGame(invalid)).toMatchObject({ moveLog: null });

    const outOfStep = { ...saved(state), moveLog: [] };
    expect(parseSavedGame(outOfStep)).toMatchObject({ moveLog: null });
  });

  it('drops unknown keys, including on cards', () => {
    const blob = saved(fresh());
    blob.extra = 'x';
    (blob.stock as Record<string, unknown>[])[0].extra = 'y';
    const restored = parseSavedGame(blob);
    expect(restored).not.toBeNull();
    expect(restored).not.toHaveProperty('extra');
    expect(restored!.stock[0]).not.toHaveProperty('extra');
  });

  it.each([
    ['null', () => null],
    ['a string', () => 'game'],
    ['a wrong schema version', () => ({ ...saved(fresh()), schemaVersion: 2 })],
    ['an invalid draw count', () => ({ ...saved(fresh()), drawCount: 2 })],
    ['a non-string seed', () => ({ ...saved(fresh()), seed: 42 })],
    ['a non-finite counter', () => ({ ...saved(fresh()), movesMade: Infinity })],
    ['a missing pile', () => ({ ...saved(fresh()), talon: undefined })],
    [
      'too few tableau columns',
      () => {
        const blob = saved(fresh());
        const tableau = blob.tableau as unknown[][];
        (blob.stock as unknown[]).push(...tableau.pop()!);
        return blob;
      },
    ],
    [
      'a missing card',
      () => {
        const blob = saved(fresh());
        (blob.stock as unknown[]).pop();
        return blob;
      },
    ],
    [
      'a duplicated card',
      () => {
        const blob = saved(fresh());
        const stock = blob.stock as unknown[];
        stock[0] = stock[1];
        return blob;
      },
    ],
    [
      'a card whose id does not match its suit and rank',
      () => {
        const blob = saved(fresh());
        (blob.stock as Record<string, unknown>[])[0].id = 'zz';
        return blob;
      },
    ],
    [
      'a non-card pile entry',
      () => {
        const blob = saved(fresh());
        (blob.stock as unknown[])[0] = null;
        return blob;
      },
    ],
  ])('rejects %s', (_label, make) => {
    expect(parseSavedGame(make())).toBeNull();
  });
});
