import { describe, expect, it } from 'vitest';
import {
  MAX_PAST_DURATION_SEC,
  MAX_PAST_MOVES,
  MIN_PAST_DURATION_SEC,
  PAST_CUTOFF_MS,
  PAST_EPOCH_MS,
  minWinMoves,
  parsePastWin,
  selectPastWins,
  type LoggedGame,
} from '../pastWins';

const NOW = Date.UTC(2026, 10, 12);
const DAY = 24 * 60 * 60 * 1000;

const win = (over: Record<string, unknown> = {}) => ({
  seed: 'k3j9x0aq1mb2c',
  drawCount: 1,
  durationSec: 200,
  moves: 120,
  dateMs: Date.UTC(2026, 6, 1),
  ...over,
});

describe('minWinMoves', () => {
  it('counts 52 foundation moves plus the draws needed to empty the stock', () => {
    expect(minWinMoves(1)).toBe(76);
    expect(minWinMoves(3)).toBe(60);
  });
});

describe('parsePastWin', () => {
  it('accepts a plausible win and keeps only the known fields', () => {
    expect(parsePastWin({ ...win(), score: 999_999, name: 'x' }, NOW)).toEqual(win());
  });

  it('accepts the boundary values', () => {
    expect(parsePastWin(win({ durationSec: MIN_PAST_DURATION_SEC }), NOW)).not.toBeNull();
    expect(parsePastWin(win({ moves: minWinMoves(1) }), NOW)).not.toBeNull();
    expect(parsePastWin(win({ drawCount: 3, moves: minWinMoves(3) }), NOW)).not.toBeNull();
    expect(parsePastWin(win({ dateMs: PAST_EPOCH_MS }), NOW)).not.toBeNull();
  });

  it('only takes wins dated before 1 December 2026, whenever they are sent', () => {
    expect(PAST_CUTOFF_MS).toBe(Date.UTC(2026, 11, 1));
    // A player updating months later still gets their old wins in…
    const later = Date.UTC(2027, 5, 1);
    expect(parsePastWin(win({ dateMs: PAST_CUTOFF_MS - 1 }), later)).not.toBeNull();
    // …but nothing won from the cutoff on, which should have a move log.
    expect(parsePastWin(win({ dateMs: PAST_CUTOFF_MS }), later)).toBeNull();
    expect(parsePastWin(win({ dateMs: Date.UTC(2027, 0, 15) }), later)).toBeNull();
  });

  it.each([
    ['not an object', null],
    ['an empty seed', win({ seed: '' })],
    ['a seed with other characters', win({ seed: 'Has Spaces' })],
    ['an unknown draw mode', win({ drawCount: 2 })],
    ['a duration no one plays a game in', win({ durationSec: MIN_PAST_DURATION_SEC - 1 })],
    ['a fractional duration', win({ durationSec: 200.5 })],
    ['an absurdly long duration', win({ durationSec: MAX_PAST_DURATION_SEC + 1 })],
    ['fewer moves than a draw-1 win can take', win({ moves: minWinMoves(1) - 1 })],
    ['fewer moves than a draw-3 win can take', win({ drawCount: 3, moves: minWinMoves(3) - 1 })],
    ['too many moves', win({ moves: MAX_PAST_MOVES + 1 })],
    ['a date before the app existed', win({ dateMs: PAST_EPOCH_MS - 1 })],
    ['a date in the future', win({ dateMs: NOW + 2 * DAY })],
    ['a date that is not a number', win({ dateMs: '2026-07-01' })],
  ])('rejects %s', (_label, raw) => {
    expect(parsePastWin(raw, NOW)).toBeNull();
  });
});

describe('selectPastWins', () => {
  const game = (over: Partial<LoggedGame> = {}): LoggedGame => ({
    outcome: 'won',
    seed: 'deal-a',
    drawCount: 1,
    durationSec: 200,
    moves: 120,
    dateMs: Date.UTC(2026, 6, 1),
    ...over,
  });

  it('returns nothing for an empty log', () => {
    expect(selectPastWins([], [], NOW)).toEqual([]);
  });

  it('keeps the three best wins of each draw mode, best first', () => {
    const games = [
      game({ seed: 'slow', durationSec: 500 }),
      game({ seed: 'fast', durationSec: 100 }),
      game({ seed: 'mid', durationSec: 300 }),
      game({ seed: 'slower', durationSec: 550 }),
      game({ seed: 'three', drawCount: 3, durationSec: 400 }),
    ];
    const picked = selectPastWins(games, [], NOW);
    expect(picked.map((w) => `${w.drawCount}:${w.seed}`)).toEqual([
      '1:fast',
      '1:mid',
      '1:slow',
      '3:three',
    ]);
  });

  it('ignores abandoned games and wins that are not plausible', () => {
    const games = [
      game({ seed: 'abandoned', outcome: 'abandoned' }),
      game({ seed: 'too-fast', durationSec: 4 }),
      game({ seed: 'too-few-moves', moves: 40 }),
      game({ seed: 'ancient', dateMs: Date.UTC(2021, 0, 1) }),
      game({ seed: 'fine' }),
    ];
    expect(selectPastWins(games, [], NOW).map((w) => w.seed)).toEqual(['fine']);
  });

  it('leaves out wins dated from the cutoff on', () => {
    const later = Date.UTC(2027, 5, 1);
    const games = [
      game({ seed: 'before', dateMs: PAST_CUTOFF_MS - DAY }),
      game({ seed: 'after', dateMs: PAST_CUTOFF_MS + DAY, durationSec: 60 }),
    ];
    expect(selectPastWins(games, [], later).map((w) => w.seed)).toEqual(['before']);
  });

  it('sends a deal once, with its best win', () => {
    const games = [
      game({ seed: 'replayed', durationSec: 400 }),
      game({ seed: 'replayed', durationSec: 150 }),
    ];
    expect(selectPastWins(games, [], NOW)).toEqual([
      { seed: 'replayed', drawCount: 1, durationSec: 150, moves: 120, dateMs: games[1].dateMs },
    ]);
  });

  it('leaves out the deals that are going in verified', () => {
    const games = [game({ seed: 'just-won' }), game({ seed: 'older' })];
    const skip = [{ seed: 'just-won', drawCount: 1 as const }];
    expect(selectPastWins(games, skip, NOW).map((w) => w.seed)).toEqual(['older']);
    // Same seed in the other draw mode is a different deal.
    const other = [{ seed: 'just-won', drawCount: 3 as const }];
    expect(selectPastWins(games, other, NOW)).toHaveLength(2);
  });

  it('gives a record without a usable seed a stable stand-in', () => {
    const games = [game({ seed: '' }), game({ seed: 'Imported Backup!', dateMs: NOW - DAY })];
    const first = selectPastWins(games, [], NOW);
    expect(first).toHaveLength(2);
    for (const w of first) expect(w.seed).toMatch(/^past-[0-9a-z]+-120$/);
    expect(first[0].seed).not.toBe(first[1].seed);
    expect(selectPastWins(games, [], NOW)).toEqual(first);
  });

  it('floors a fractional duration from an imported backup', () => {
    expect(selectPastWins([game({ durationSec: 200.9 })], [], NOW)[0].durationSec).toBe(200);
  });
});
