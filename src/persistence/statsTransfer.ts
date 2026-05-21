import type { GameRecord, Stats } from '@/store/statsStore';

export type ExportEnvelope = {
  kind: 'solitaire-stats';
  schemaVersion: 1;
  exportedAt: number;
  data: Stats;
};

export function buildExportEnvelope(stats: Stats): ExportEnvelope {
  return {
    kind: 'solitaire-stats',
    schemaVersion: 1,
    exportedAt: Date.now(),
    data: stats,
  };
}

export function serializeExport(stats: Stats): string {
  return JSON.stringify(buildExportEnvelope(stats), null, 2);
}

export type ParseResult =
  | { ok: true; games: GameRecord[] }
  | { ok: false; reason: 'not-json' | 'wrong-kind' | 'unsupported-version' | 'malformed' };

const isValidOutcome = (v: unknown): v is GameRecord['outcome'] =>
  v === 'won' || v === 'abandoned';

const isValidDrawCount = (v: unknown): v is GameRecord['drawCount'] => v === 1 || v === 3;

const isValidRecord = (r: unknown): r is GameRecord => {
  if (typeof r !== 'object' || r === null) return false;
  const o = r as Record<string, unknown>;
  return (
    isValidOutcome(o.outcome) &&
    (o.score === null || typeof o.score === 'number') &&
    typeof o.durationSec === 'number' &&
    typeof o.moves === 'number' &&
    typeof o.dateMs === 'number' &&
    isValidDrawCount(o.drawCount) &&
    typeof o.seed === 'string' &&
    typeof o.redealCount === 'number' &&
    typeof o.hintsUsed === 'number' &&
    typeof o.undosUsed === 'number'
  );
};

export function parseImport(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'not-json' };
  }
  if (typeof raw !== 'object' || raw === null) return { ok: false, reason: 'wrong-kind' };
  const env = raw as Record<string, unknown>;
  if (env.kind !== 'solitaire-stats') return { ok: false, reason: 'wrong-kind' };
  if (env.schemaVersion !== 1) return { ok: false, reason: 'unsupported-version' };
  const data = env.data;
  if (typeof data !== 'object' || data === null) return { ok: false, reason: 'malformed' };
  const games = (data as Record<string, unknown>).games;
  if (!Array.isArray(games)) return { ok: false, reason: 'malformed' };
  return { ok: true, games: games.filter(isValidRecord) };
}
