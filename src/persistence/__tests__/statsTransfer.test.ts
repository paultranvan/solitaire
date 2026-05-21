import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildExportEnvelope,
  parseImport,
  serializeExport,
} from '../statsTransfer';
import { defaultStats, type GameRecord } from '@/store/statsStore';

const sampleGame = (over: Partial<GameRecord> = {}): GameRecord => ({
  outcome: 'won',
  score: 1234,
  durationSec: 90,
  moves: 60,
  dateMs: 1716000000000,
  drawCount: 1,
  seed: 'abc',
  redealCount: 0,
  hintsUsed: 0,
  undosUsed: 0,
  ...over,
});

describe('statsTransfer.buildExportEnvelope', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-21T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('wraps stats in a kind-tagged envelope with exportedAt and matching schema version', () => {
    const stats = defaultStats();
    const env = buildExportEnvelope(stats);
    expect(env.kind).toBe('solitaire-stats');
    expect(env.schemaVersion).toBe(1);
    expect(env.exportedAt).toBe(new Date('2026-05-21T12:00:00Z').getTime());
    expect(env.data).toEqual(stats);
  });
});

describe('statsTransfer.serializeExport', () => {
  it('produces pretty-printed JSON that parses back to the envelope', () => {
    const stats = defaultStats();
    const text = serializeExport(stats);
    expect(text).toContain('\n');
    const parsed = JSON.parse(text);
    expect(parsed.kind).toBe('solitaire-stats');
    expect(parsed.data).toEqual(stats);
  });
});

describe('statsTransfer.parseImport', () => {
  it('round-trips serializeExport: returns the original games array', () => {
    const games = [
      sampleGame({ seed: 'a' }),
      sampleGame({ seed: 'b', outcome: 'abandoned', score: null }),
    ];
    const text = serializeExport({
      schemaVersion: 1,
      byMode: {
        '1': { played: 1, won: 1, bestTimeSec: 90, fewestMovesWin: 60, bestScore: 1234 },
        '3': {
          played: 1,
          won: 0,
          bestTimeSec: null,
          fewestMovesWin: null,
          bestScore: null,
        },
      },
      currentStreak: 0,
      longestStreak: 1,
      totalSecondsPlayed: 180,
      games,
    });
    const result = parseImport(text);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.games).toEqual(games);
  });

  it('rejects non-JSON text with reason "not-json"', () => {
    expect(parseImport('not actually json {')).toEqual({ ok: false, reason: 'not-json' });
  });

  it('rejects JSON missing the kind field with reason "wrong-kind"', () => {
    expect(
      parseImport(JSON.stringify({ schemaVersion: 1, data: { games: [] } })),
    ).toEqual({ ok: false, reason: 'wrong-kind' });
  });

  it('rejects JSON with a different kind value with reason "wrong-kind"', () => {
    expect(
      parseImport(
        JSON.stringify({ kind: 'solitaire-settings', schemaVersion: 1, data: { games: [] } }),
      ),
    ).toEqual({ ok: false, reason: 'wrong-kind' });
  });

  it('rejects a future schema version with reason "unsupported-version"', () => {
    expect(
      parseImport(
        JSON.stringify({ kind: 'solitaire-stats', schemaVersion: 99, data: { games: [] } }),
      ),
    ).toEqual({ ok: false, reason: 'unsupported-version' });
  });

  it('rejects missing data.games with reason "malformed"', () => {
    expect(
      parseImport(JSON.stringify({ kind: 'solitaire-stats', schemaVersion: 1, data: {} })),
    ).toEqual({ ok: false, reason: 'malformed' });
  });

  it('rejects data.games that is not an array with reason "malformed"', () => {
    expect(
      parseImport(
        JSON.stringify({ kind: 'solitaire-stats', schemaVersion: 1, data: { games: 'nope' } }),
      ),
    ).toEqual({ ok: false, reason: 'malformed' });
  });

  it('drops individual records that fail shape check but keeps the rest', () => {
    const good = sampleGame({ seed: 'g' });
    const text = JSON.stringify({
      kind: 'solitaire-stats',
      schemaVersion: 1,
      data: {
        games: [
          good,
          { outcome: 'won' },
          { ...good, dateMs: 'not a number' },
        ],
      },
    });
    const result = parseImport(text);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.games).toEqual([good]);
  });
});
