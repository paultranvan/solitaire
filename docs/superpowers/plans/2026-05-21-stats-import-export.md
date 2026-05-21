# Stats Import / Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a two-button Backup row in the Settings sheet that exports the stats game log to a JSON file and imports such a file, merging by dedup key and re-deriving all aggregates from the merged log.

**Architecture:** A pure module `src/persistence/statsTransfer.ts` handles envelope build / serialize / parse with no DOM dependency. The existing `useStatsStore` gains a `mergeImported` action that dedupes by `seed|dateMs|outcome` and re-derives every aggregate from the time-sorted log. The UI sits in `MenuSheet`'s existing `StatsSection`, using a plain `Blob`-download + hidden `<input type="file">` so the same code works in the Capacitor WebView.

**Tech Stack:** TypeScript, Zustand + immer, Vitest + jsdom, React 18, plain web file APIs (no new deps).

**Spec:** `docs/superpowers/specs/2026-05-21-stats-import-export-design.md`

---

## File Structure

- New: `src/persistence/statsTransfer.ts` — `ExportEnvelope` type, `buildExportEnvelope`, `serializeExport`, `parseImport`, `ParseResult` type.
- New: `src/persistence/__tests__/statsTransfer.test.ts` — round-trip + error-case coverage.
- Modified: `src/store/statsStore.ts` — extract `recomputeAggregates(games)` helper, add `mergeImported` action returning `{ added: number; skipped: number }`.
- Modified: `src/store/__tests__/statsStore.test.ts` — new describe block for `mergeImported`.
- Modified: `src/i18n/strings.ts` — 7 new `stats.*` keys (en + fr).
- Modified: `src/ui/MenuSheet.tsx` — Backup row inside `StatsSection`, above the Reset block; hidden file input; inline feedback state.
- Modified: `src/ui/MenuSheet.css` — `.m-backup-row`, `.m-backup-feedback`, error/success modifiers.

---

## Task 1: Pure transfer module — `buildExportEnvelope` + `serializeExport`

**Files:**
- Create: `src/persistence/statsTransfer.ts`
- Create: `src/persistence/__tests__/statsTransfer.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/persistence/__tests__/statsTransfer.test.ts
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { buildExportEnvelope, serializeExport } from '../statsTransfer';
import { defaultStats } from '@/store/statsStore';

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
    expect(text).toContain('\n'); // pretty printed
    const parsed = JSON.parse(text);
    expect(parsed.kind).toBe('solitaire-stats');
    expect(parsed.data).toEqual(stats);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/persistence/__tests__/statsTransfer.test.ts`
Expected: FAIL — cannot resolve `../statsTransfer`.

- [ ] **Step 3: Implement the module**

```ts
// src/persistence/statsTransfer.ts
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

export function parseImport(_text: string): ParseResult {
  // implemented in Task 2
  return { ok: false, reason: 'not-json' };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/persistence/__tests__/statsTransfer.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/persistence/statsTransfer.ts src/persistence/__tests__/statsTransfer.test.ts
git commit -m "feat(stats): export envelope builder and serializer"
```

---

## Task 2: `parseImport` — validation and tolerant-record parsing

**Files:**
- Modify: `src/persistence/statsTransfer.ts`
- Modify: `src/persistence/__tests__/statsTransfer.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/persistence/__tests__/statsTransfer.test.ts`:

```ts
import { parseImport } from '../statsTransfer';
import type { GameRecord } from '@/store/statsStore';

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

describe('statsTransfer.parseImport', () => {
  it('round-trips serializeExport: returns the original games array', () => {
    const games = [sampleGame({ seed: 'a' }), sampleGame({ seed: 'b', outcome: 'abandoned', score: null })];
    const text = serializeExport({
      schemaVersion: 1,
      byMode: { '1': { played: 1, won: 1, bestTimeSec: 90, fewestMovesWin: 60, bestScore: 1234 }, '3': { played: 1, won: 0, bestTimeSec: null, fewestMovesWin: null, bestScore: null } },
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
    expect(parseImport(JSON.stringify({ schemaVersion: 1, data: { games: [] } }))).toEqual({
      ok: false,
      reason: 'wrong-kind',
    });
  });

  it('rejects JSON with a different kind value with reason "wrong-kind"', () => {
    expect(
      parseImport(JSON.stringify({ kind: 'solitaire-settings', schemaVersion: 1, data: { games: [] } })),
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
          { outcome: 'won' }, // missing dateMs etc — drop
          { ...good, dateMs: 'not a number' }, // wrong type — drop
        ],
      },
    });
    const result = parseImport(text);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.games).toEqual([good]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/persistence/__tests__/statsTransfer.test.ts`
Expected: FAIL — `parseImport` stub returns `not-json` for everything.

- [ ] **Step 3: Implement `parseImport`**

Replace the stub in `src/persistence/statsTransfer.ts`:

```ts
const isValidOutcome = (v: unknown): v is GameRecord['outcome'] => v === 'won' || v === 'abandoned';
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/persistence/__tests__/statsTransfer.test.ts`
Expected: PASS (all parseImport tests + the two from Task 1).

- [ ] **Step 5: Commit**

```bash
git add src/persistence/statsTransfer.ts src/persistence/__tests__/statsTransfer.test.ts
git commit -m "feat(stats): parseImport with envelope and per-record validation"
```

---

## Task 3: `mergeImported` store action with aggregate recompute

**Files:**
- Modify: `src/store/statsStore.ts`
- Modify: `src/store/__tests__/statsStore.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/store/__tests__/statsStore.test.ts`:

```ts
import type { GameRecord } from '../statsStore';

const rec = (over: Partial<GameRecord> = {}): GameRecord => ({
  outcome: 'won',
  score: 1000,
  durationSec: 100,
  moves: 70,
  dateMs: 1716000000000,
  drawCount: 1,
  seed: 's1',
  redealCount: 0,
  hintsUsed: 0,
  undosUsed: 0,
  ...over,
});

describe('statsStore.mergeImported', () => {
  beforeEach(() => {
    useStatsStore.setState({ stats: defaultStats() });
  });

  it('on an empty store, reproduces source aggregates exactly', () => {
    const games: GameRecord[] = [
      rec({ seed: 'a', dateMs: 1, drawCount: 1, outcome: 'won', durationSec: 90, moves: 50, score: 2000 }),
      rec({ seed: 'b', dateMs: 2, drawCount: 1, outcome: 'won', durationSec: 120, moves: 80, score: 1500 }),
      rec({ seed: 'c', dateMs: 3, drawCount: 3, outcome: 'abandoned', score: null, durationSec: 30, moves: 5 }),
    ];
    const result = useStatsStore.getState().mergeImported(games);
    expect(result).toEqual({ added: 3, skipped: 0 });
    const s = useStatsStore.getState().stats;
    expect(s.games).toHaveLength(3);
    expect(s.byMode['1'].played).toBe(2);
    expect(s.byMode['1'].won).toBe(2);
    expect(s.byMode['1'].bestTimeSec).toBe(90);
    expect(s.byMode['1'].fewestMovesWin).toBe(50);
    expect(s.byMode['1'].bestScore).toBe(2000);
    expect(s.byMode['3'].played).toBe(1);
    expect(s.byMode['3'].won).toBe(0);
    expect(s.totalSecondsPlayed).toBe(240);
    expect(s.currentStreak).toBe(0); // last game is abandoned
    expect(s.longestStreak).toBe(2);
  });

  it('dedupes by seed|dateMs|outcome and reports skipped count', () => {
    const a = rec({ seed: 'a', dateMs: 1, outcome: 'won' });
    const b = rec({ seed: 'b', dateMs: 2, outcome: 'won' });
    useStatsStore.getState().mergeImported([a, b]);
    const result = useStatsStore.getState().mergeImported([a, b, rec({ seed: 'c', dateMs: 3, outcome: 'won' })]);
    expect(result).toEqual({ added: 1, skipped: 2 });
    expect(useStatsStore.getState().stats.games).toHaveLength(3);
  });

  it('time-sorted streak walk: an abandoned game later than wins resets currentStreak', () => {
    useStatsStore.getState().mergeImported([
      rec({ seed: 'w1', dateMs: 100, outcome: 'won' }),
      rec({ seed: 'w2', dateMs: 200, outcome: 'won' }),
    ]);
    expect(useStatsStore.getState().stats.currentStreak).toBe(2);
    useStatsStore.getState().mergeImported([
      rec({ seed: 'a1', dateMs: 300, outcome: 'abandoned', score: null }),
    ]);
    const s = useStatsStore.getState().stats;
    expect(s.currentStreak).toBe(0);
    expect(s.longestStreak).toBe(2);
  });

  it('per-mode bestScore, bestTime, fewestMoves recomputed across merged log', () => {
    useStatsStore.getState().mergeImported([
      rec({ seed: 'a', dateMs: 1, drawCount: 3, outcome: 'won', durationSec: 200, moves: 100, score: 500 }),
    ]);
    useStatsStore.getState().mergeImported([
      rec({ seed: 'b', dateMs: 2, drawCount: 3, outcome: 'won', durationSec: 80, moves: 40, score: 9000 }),
    ]);
    const m = useStatsStore.getState().stats.byMode['3'];
    expect(m.bestTimeSec).toBe(80);
    expect(m.fewestMovesWin).toBe(40);
    expect(m.bestScore).toBe(9000);
  });

  it('null scores in wins are ignored for bestScore', () => {
    useStatsStore.getState().mergeImported([
      rec({ seed: 'a', dateMs: 1, outcome: 'won', score: null }),
    ]);
    expect(useStatsStore.getState().stats.byMode['1'].bestScore).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store/__tests__/statsStore.test.ts`
Expected: FAIL — `mergeImported` is not a function.

- [ ] **Step 3: Add `mergeImported` and `recomputeAggregates` to `statsStore.ts`**

In `src/store/statsStore.ts`, add this helper above the `useStatsStore` definition:

```ts
const dedupeKey = (r: GameRecord): string => `${r.seed}|${r.dateMs}|${r.outcome}`;

// Re-derive every cached aggregate from the time-sorted game log so the
// post-merge state is independent of insert order or the imported file's
// own aggregate values.
const recomputeAggregates = (games: GameRecord[]): Omit<Stats, 'schemaVersion' | 'games'> => {
  const sorted = [...games].sort((a, b) => a.dateMs - b.dateMs);
  const byMode: Stats['byMode'] = { '1': emptyMode(), '3': emptyMode() };
  let totalSecondsPlayed = 0;
  let currentStreak = 0;
  let longestStreak = 0;
  for (const g of sorted) {
    const m = byMode[String(g.drawCount) as '1' | '3'];
    m.played += 1;
    totalSecondsPlayed += g.durationSec;
    if (g.outcome === 'won') {
      m.won += 1;
      if (m.bestTimeSec === null || g.durationSec < m.bestTimeSec) m.bestTimeSec = g.durationSec;
      if (m.fewestMovesWin === null || g.moves < m.fewestMovesWin) m.fewestMovesWin = g.moves;
      if (g.score !== null && (m.bestScore === null || g.score > m.bestScore)) m.bestScore = g.score;
      currentStreak += 1;
      if (currentStreak > longestStreak) longestStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }
  return { byMode, currentStreak, longestStreak, totalSecondsPlayed };
};
```

Extend the `StatsStore` type and `create()` body:

```ts
type StatsStore = {
  stats: Stats;
  hydrate: (s: Stats) => void;
  recordGame: (input: RecordGameInput) => void;
  mergeImported: (records: GameRecord[]) => { added: number; skipped: number };
  reset: () => void;
};
```

Inside `create<StatsStore>()(immer((set) => ({ ... })))`, add after `recordGame`:

```ts
mergeImported: (records) => {
  const existing = useStatsStore.getState().stats.games;
  const keys = new Set(existing.map(dedupeKey));
  const fresh: GameRecord[] = [];
  let skipped = 0;
  for (const r of records) {
    const k = dedupeKey(r);
    if (keys.has(k)) {
      skipped += 1;
      continue;
    }
    keys.add(k);
    fresh.push(r);
  }
  const merged = [...existing, ...fresh].sort((a, b) => a.dateMs - b.dateMs);
  const aggs = recomputeAggregates(merged);
  set((state) => {
    state.stats = {
      schemaVersion: 1,
      games: merged,
      ...aggs,
    };
  });
  persist(useStatsStore.getState().stats);
  return { added: fresh.length, skipped };
},
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/store/__tests__/statsStore.test.ts`
Expected: PASS (existing tests still green + new `mergeImported` describe block).

- [ ] **Step 5: Commit**

```bash
git add src/store/statsStore.ts src/store/__tests__/statsStore.test.ts
git commit -m "feat(stats): mergeImported action with aggregate recompute"
```

---

## Task 4: i18n strings

**Files:**
- Modify: `src/i18n/strings.ts`

- [ ] **Step 1: Add English keys**

In `src/i18n/strings.ts`, inside the `en` object, add right after the existing `'stats.resetNo'` line:

```ts
  'stats.backupTitle': 'Backup',
  'stats.exportButton': 'Export scores',
  'stats.importButton': 'Import scores',
  'stats.importResultAdded': 'Imported {added} new games',
  'stats.importResultSkipped': ' · {skipped} already present',
  'stats.importNoNew': 'No new games to import',
  'stats.importErrorRead': "Couldn't read this file",
  'stats.importErrorKind': "This isn't a solitaire stats file",
  'stats.importErrorVersion': 'File is from an incompatible version',
```

- [ ] **Step 2: Add French keys**

Inside the `fr` object, after the corresponding `'stats.resetNo'` line:

```ts
  'stats.backupTitle': 'Sauvegarde',
  'stats.exportButton': 'Exporter les scores',
  'stats.importButton': 'Importer les scores',
  'stats.importResultAdded': '{added} parties importées',
  'stats.importResultSkipped': ' · {skipped} déjà présentes',
  'stats.importNoNew': 'Aucune nouvelle partie à importer',
  'stats.importErrorRead': 'Impossible de lire ce fichier',
  'stats.importErrorKind': "Ce fichier n'est pas un export de scores",
  'stats.importErrorVersion': 'Fichier d’une version incompatible',
```

- [ ] **Step 3: Run typecheck to verify the en/fr key sets match**

Run: `npm run build`
Expected: PASS (the `Record<StringKey, string>` constraint on `fr` will fail compilation if any key is missing).

- [ ] **Step 4: Commit**

```bash
git add src/i18n/strings.ts
git commit -m "i18n: strings for stats import/export"
```

---

## Task 5: Backup row UI in `MenuSheet`

**Files:**
- Modify: `src/ui/MenuSheet.tsx`

- [ ] **Step 1: Add the `BackupRow` component**

In `src/ui/MenuSheet.tsx`, add this component above `StatsSection`. It owns the export click, the file-input ref, the import handler, and the inline feedback state.

```tsx
import { useRef, useState } from 'react';
import { serializeExport, parseImport, type ParseResult } from '@/persistence/statsTransfer';

type ImportFeedback =
  | { kind: 'success'; added: number; skipped: number }
  | { kind: 'noNew' }
  | { kind: 'error'; reason: Exclude<ParseResult, { ok: true }>['reason'] };

function BackupRow() {
  const stats = useStatsStore((s) => s.stats);
  const mergeImported = useStatsStore((s) => s.mergeImported);
  const { t } = useT();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [feedback, setFeedback] = useState<ImportFeedback | null>(null);
  const timerRef = useRef<number | null>(null);

  const showFeedback = (f: ImportFeedback) => {
    setFeedback(f);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setFeedback(null), 4000);
  };

  const handleExport = () => {
    const json = serializeExport(stats);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const today = new Date().toISOString().slice(0, 10);
    a.download = `solitaire-stats-${today}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => inputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      showFeedback({ kind: 'error', reason: 'not-json' });
      return;
    }
    const result = parseImport(text);
    if (!result.ok) {
      showFeedback({ kind: 'error', reason: result.reason });
      return;
    }
    const { added, skipped } = mergeImported(result.games);
    if (added === 0) {
      showFeedback({ kind: 'noNew' });
    } else {
      showFeedback({ kind: 'success', added, skipped });
    }
  };

  const renderFeedback = () => {
    if (!feedback) return null;
    if (feedback.kind === 'success') {
      const head = t('stats.importResultAdded', { added: feedback.added });
      const tail = feedback.skipped > 0 ? t('stats.importResultSkipped', { skipped: feedback.skipped }) : '';
      return <div className="m-backup-feedback m-backup-feedback--ok">{head + tail}</div>;
    }
    if (feedback.kind === 'noNew') {
      return <div className="m-backup-feedback m-backup-feedback--ok">{t('stats.importNoNew')}</div>;
    }
    const key =
      feedback.reason === 'wrong-kind'
        ? 'stats.importErrorKind'
        : feedback.reason === 'unsupported-version'
          ? 'stats.importErrorVersion'
          : 'stats.importErrorRead';
    return <div className="m-backup-feedback m-backup-feedback--err">{t(key)}</div>;
  };

  return (
    <div className="m-backup">
      <div className="m-backup-row">
        <button type="button" className="btn btn--ghost" onClick={handleExport}>
          {t('stats.exportButton')}
        </button>
        <button type="button" className="btn btn--ghost" onClick={handleImportClick}>
          {t('stats.importButton')}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="m-backup-input"
          onChange={handleFile}
        />
      </div>
      {renderFeedback()}
    </div>
  );
}
```

- [ ] **Step 2: Mount `BackupRow` inside `StatsSection`**

In the existing `StatsSection` function, place `<BackupRow />` directly above the `<div className="m-section__action">…</div>` block (i.e., between the `m-row--quiet` total-time row and the reset action).

- [ ] **Step 3: Verify build and tests still pass**

Run in parallel:
- `npm run build` — expected PASS.
- `npm run lint` — expected PASS.
- `npm run test:run` — expected PASS (no UI test regressions; the existing `Board.test.tsx` doesn't open the menu).

- [ ] **Step 4: Commit**

```bash
git add src/ui/MenuSheet.tsx
git commit -m "feat(stats): backup row with export and import handlers"
```

---

## Task 6: CSS for the Backup row

**Files:**
- Modify: `src/ui/MenuSheet.css`

- [ ] **Step 1: Append backup-specific styles**

Append at the end of `src/ui/MenuSheet.css`:

```css
/* ---- Backup (export / import) ---- */

.m-backup {
  margin-top: 18px;
}

.m-backup-row {
  display: flex;
  gap: 10px;
}

.m-backup-row .btn {
  flex: 1;
}

.m-backup-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.m-backup-feedback {
  margin-top: 10px;
  font-family: var(--font-sans);
  font-size: 12.5px;
  letter-spacing: 0.02em;
  text-align: center;
}

.m-backup-feedback--ok {
  color: var(--ink-soft);
}

.m-backup-feedback--err {
  color: #c98686;
}
```

- [ ] **Step 2: Smoke-test in the dev server**

Run: `npm run dev` (background) — open http://localhost:5173, open the Menu sheet, click Export (expect a `solitaire-stats-YYYY-MM-DD.json` download), then click Import and re-import the same file (expect `"No new games to import"`).

- [ ] **Step 3: Commit**

```bash
git add src/ui/MenuSheet.css
git commit -m "style(menu): backup row layout and feedback line"
```

---

## Task 7: Final verification

- [ ] **Step 1: Run the full check suite**

Run in parallel:
- `npm run lint` — expected PASS.
- `npm run test:run` — expected PASS (all tests).
- `npm run build` — expected PASS.

- [ ] **Step 2: Manual smoke test**

Run `npm run dev`, exercise:
1. Open menu → Export scores → verify file downloads and JSON has `kind`, `schemaVersion`, `exportedAt`, `data.games`.
2. Reset stats, then Import the file just exported → verify all wins/aggregates restored and toast reads `"Imported N new games"`.
3. Import the same file again → verify toast reads `"No new games to import"`.
4. Import a non-JSON file (any `.txt`) → verify toast reads `"Couldn't read this file"`.
5. Import a JSON file with `{ "kind": "other" }` → verify toast reads `"This isn't a solitaire stats file"`.

- [ ] **Step 3: No commit if no changes**

No commit unless smoke-test surfaced a bug requiring a fix.

---

## Self-Review

**Spec coverage:**
- File format envelope: Task 1 (build), Task 2 (parse).
- Merge dedup by `seed|dateMs|outcome`: Task 3.
- Aggregate recompute (incl. streaks): Task 3.
- Tolerant per-record parsing: Task 2 (test + impl).
- Web `Blob` download + hidden file input: Task 5.
- Inline feedback with ~4 s timeout: Task 5.
- Error mapping (not-json/wrong-kind/unsupported-version): Task 5 renderFeedback.
- i18n keys (en + fr): Task 4.
- UI placement above Reset block: Task 5 step 2.
- Tests in `src/persistence/__tests__/statsTransfer.test.ts` and extension of `statsStore.test.ts`: Tasks 1–3.
- No new `MenuSheet` test: matches spec ("UI: no new MenuSheet test coverage").

**Placeholder scan:** No TBDs, no "add appropriate error handling" — every step shows code or exact commands.

**Type consistency:** `ParseResult`, `ExportEnvelope`, `mergeImported` signature, `ImportFeedback` discriminated union all referenced consistently. `dedupeKey` reused in step 3 & step 4 of Task 3. `recomputeAggregates` return type `Omit<Stats, 'schemaVersion' | 'games'>` aligns with the destructured spread in `mergeImported`.

**One risk noted in spec:** Streak recomputation may surprise users when importing an old abandoned record. Acceptable for v1 per spec; not blocking.
