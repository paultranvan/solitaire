import { sanitizeGameRecord, type GameRecord, type Stats } from '@/store/statsStore';

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

// Backups are small (a few hundred bytes per game), so anything past this is
// not one of ours. Checked before parsing so an oversized or hostile file
// can't exhaust memory in JSON.parse or bloat IndexedDB once merged.
export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

export type ParseResult =
  | { ok: true; games: GameRecord[] }
  | {
      ok: false;
      reason: 'not-json' | 'wrong-kind' | 'unsupported-version' | 'malformed' | 'too-large';
    };

// The file is untrusted input: only the game log is read, and every record is
// rebuilt field-by-field by sanitizeGameRecord. The envelope's own aggregates
// are ignored (mergeImported re-derives them from the log).
export function parseImport(text: string): ParseResult {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, reason: 'too-large' };
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
  const clean: GameRecord[] = [];
  for (const g of games) {
    const record = sanitizeGameRecord(g);
    if (record) clean.push(record);
  }
  return { ok: true, games: clean };
}
