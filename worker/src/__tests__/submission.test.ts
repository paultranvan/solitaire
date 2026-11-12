import { describe, expect, it } from 'vitest';
import { computeScore } from '../../../src/game/score';
import { solve } from '../../../src/game/solver';
import { createInitialState } from '../../../src/game/state';
import { MAX_PAST_WINS } from '../../../src/leaderboard/pastWins';
import {
  MAX_DURATION_SEC,
  MAX_SUBMISSION_MOVES,
  parsePastWins,
  parseSubmission,
  verifySubmission,
} from '../submission';

// A deal the solver cracks within a small node budget (deterministic).
const SEED = 'replay-fixture-1';
const winningMoves = () => {
  const r = solve(createInitialState({ drawCount: 1, seed: SEED }), { maxNodes: 20_000 });
  if (r.status !== 'solvable') throw new Error('fixture no longer solvable');
  return r.moves;
};

const body = (over: Record<string, unknown> = {}) => ({
  seed: SEED,
  drawCount: 1,
  name: 'Renard Agile',
  durationSec: 600,
  moves: winningMoves(),
  ...over,
});

describe('parseSubmission', () => {
  it('accepts a well-formed submission and keeps only the known fields', () => {
    const parsed = parseSubmission({ ...body(), score: 999_999, extra: { nested: true } });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(Object.keys(parsed.value).sort()).toEqual([
      'drawCount',
      'durationSec',
      'moves',
      'name',
      'seed',
    ]);
  });

  it.each([
    ['bad-request', null],
    ['bad-request', [body()]],
    ['bad-seed', body({ seed: '' })],
    ['bad-seed', body({ seed: 'Has Spaces' })],
    ['bad-seed', body({ seed: 'x'.repeat(65) })],
    ['bad-seed', body({ seed: 12 })],
    ['bad-draw-count', body({ drawCount: 2 })],
    ['bad-draw-count', body({ drawCount: '1' })],
    ['bad-name', body({ name: '<script>' })],
    ['bad-duration', body({ durationSec: -1 })],
    ['bad-duration', body({ durationSec: 12.5 })],
    ['bad-duration', body({ durationSec: MAX_DURATION_SEC + 1 })],
    ['bad-duration', body({ durationSec: '600' })],
    ['bad-moves', body({ moves: [] })],
    ['bad-moves', body({ moves: 'draw' })],
    ['bad-moves', body({ moves: [{ kind: 'teleport' }] })],
    [
      'bad-moves',
      body({ moves: Array.from({ length: MAX_SUBMISSION_MOVES + 1 }, () => ({ kind: 'draw' })) }),
    ],
  ])('rejects with %s', (reason, raw) => {
    expect(parseSubmission(raw)).toEqual({ ok: false, reason });
  });
});

describe('verifySubmission', () => {
  const submission = (over: Record<string, unknown> = {}) => {
    const parsed = parseSubmission(body(over));
    if (!parsed.ok) throw new Error(`fixture rejected: ${parsed.reason}`);
    return parsed.value;
  };

  it('accepts a genuine win and computes the score itself', () => {
    const moves = winningMoves();
    const verified = verifySubmission(submission({ score: 999_999 }));
    expect(verified).toEqual({
      ok: true,
      value: {
        seed: SEED,
        drawCount: 1,
        name: 'Renard Agile',
        durationSec: 600,
        moves: moves.length,
        score: computeScore({ durationSec: 600, moves: moves.length, drawCount: 1 }),
      },
    });
  });

  it('rejects a game that is not won', () => {
    expect(verifySubmission(submission({ moves: winningMoves().slice(0, -3) }))).toEqual({
      ok: false,
      reason: 'not-won',
    });
  });

  it('rejects an illegal move', () => {
    const moves = [{ kind: 'recycle' }, ...winningMoves()];
    expect(verifySubmission(submission({ moves }))).toEqual({
      ok: false,
      reason: 'illegal-move',
    });
  });

  it('rejects a winning log claimed against another deal', () => {
    expect(verifySubmission(submission({ seed: 'another-deal' })).ok).toBe(false);
  });

  it('rejects a duration no human could have played the manual moves in', () => {
    expect(verifySubmission(submission({ durationSec: 3 }))).toEqual({
      ok: false,
      reason: 'too-fast',
    });
  });
});

describe('parsePastWins', () => {
  const NOW = Date.UTC(2026, 10, 12);
  const PLAYED = Date.UTC(2026, 6, 1);
  const entry = (over: Record<string, unknown> = {}) => ({
    seed: 'k3j9x0aq1mb2c',
    drawCount: 1,
    durationSec: 200,
    moves: 120,
    dateMs: PLAYED,
    ...over,
  });
  const batch = (entries: unknown, over: Record<string, unknown> = {}) => ({
    name: 'Renard Agile',
    entries,
    ...over,
  });

  it('computes the score itself and keeps the declared date apart', () => {
    const parsed = parsePastWins(batch([{ ...entry(), score: 999_999, verified: true }]), NOW);
    expect(parsed).toEqual({
      ok: true,
      value: [
        {
          seed: 'k3j9x0aq1mb2c',
          drawCount: 1,
          name: 'Renard Agile',
          durationSec: 200,
          moves: 120,
          score: computeScore({ durationSec: 200, moves: 120, drawCount: 1 }),
          playedAt: PLAYED,
        },
      ],
    });
  });

  it('drops the entries that do not hold up and keeps the rest', () => {
    const parsed = parsePastWins(
      batch([
        entry({ seed: 'good-one' }),
        entry({ seed: 'too-fast', durationSec: 5 }),
        entry({ seed: 'too-few-moves', moves: 30 }),
        entry({ seed: 'from-the-future', dateMs: NOW + 3 * 24 * 60 * 60 * 1000 }),
        'not an entry',
        entry({ seed: 'good-two', drawCount: 3 }),
      ]),
      NOW,
    );
    expect(parsed.ok && parsed.value.map((s) => s.seed)).toEqual(['good-one', 'good-two']);
  });

  it('keeps a deal once per batch', () => {
    const parsed = parsePastWins(batch([entry(), entry({ durationSec: 90 })]), NOW);
    expect(parsed.ok && parsed.value).toHaveLength(1);
    // The same seed in the other draw mode is a different deal.
    const both = parsePastWins(batch([entry(), entry({ drawCount: 3 })]), NOW);
    expect(both.ok && both.value).toHaveLength(2);
  });

  it('accepts a batch whose entries all fail, as an empty list', () => {
    expect(parsePastWins(batch([entry({ moves: 1 })]), NOW)).toEqual({ ok: true, value: [] });
  });

  it.each([
    ['bad-request', null],
    ['bad-request', [batch([entry()])]],
    ['bad-name', batch([entry()], { name: '<script>' })],
    ['bad-name', batch([entry()], { name: undefined })],
    ['bad-entries', batch('nope')],
    ['bad-entries', batch([])],
    ['bad-entries', batch(Array.from({ length: MAX_PAST_WINS + 1 }, () => entry()))],
  ])('rejects the whole batch with %s', (reason, raw) => {
    expect(parsePastWins(raw, NOW)).toEqual({ ok: false, reason });
  });
});
