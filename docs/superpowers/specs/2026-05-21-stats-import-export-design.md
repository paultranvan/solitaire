# Stats Import / Export — Design

## Goal

Let a player back up their game history to a file and restore it later — for
moving devices, surviving a browser-data wipe, or merging stats from two
installs. Lives behind two buttons in the existing Settings sheet.

## Scope

In scope:

- Export the contents of the `Stats` store to a downloadable JSON file.
- Import such a file and merge it into the local `Stats` store.

Out of scope:

- Settings or saved-game export. The feature is "scores," not full profile.
- A Replace-on-import mode. Merge is non-destructive by construction; a
  Replace mode would need a confirmation dialog and is not currently needed.
- Cloud sync / accounts. This is local file I/O only.
- Native share-sheet integration via `@capacitor/share` /
  `@capacitor/filesystem`. The web `Blob`-download + `<input type="file">`
  pair works inside the Capacitor WebView too and avoids new dependencies.

## File format

A self-contained JSON envelope:

```json
{
  "kind": "solitaire-stats",
  "schemaVersion": 1,
  "exportedAt": 1716300000000,
  "data": {
    "schemaVersion": 1,
    "byMode": { "1": { ... }, "3": { ... } },
    "currentStreak": 5,
    "longestStreak": 12,
    "totalSecondsPlayed": 73821,
    "games": [ /* GameRecord[] */ ]
  }
}
```

- `kind: "solitaire-stats"` lets the importer reject the wrong kind of JSON
  (a settings export, a saved game, an unrelated file).
- The outer `schemaVersion` is the envelope format. The inner
  `data.schemaVersion` is `Stats.schemaVersion`. Both currently `1`. Bumping
  either is a deliberate migration step in the future.
- `exportedAt` is `Date.now()` at export time. Informational only.
- The full `Stats` object is embedded, **but on import only `data.games` is
  trusted.** Aggregates (`byMode`, `currentStreak`, `longestStreak`,
  `totalSecondsPlayed`) are re-derived from the merged log so the post-import
  state is consistent regardless of file age or hand-editing.

Default filename: `solitaire-stats-YYYY-MM-DD.json`.

## Architecture

### `src/persistence/statsTransfer.ts` — pure module

No DOM, no IO; matches the `game/`-layer testability discipline.

```ts
export type ExportEnvelope = {
  kind: 'solitaire-stats';
  schemaVersion: 1;
  exportedAt: number;
  data: Stats;
};

export function buildExportEnvelope(stats: Stats): ExportEnvelope;
export function serializeExport(stats: Stats): string; // pretty-printed JSON

export type ParseResult =
  | { ok: true; games: GameRecord[] }
  | { ok: false; reason: 'not-json' | 'wrong-kind' | 'unsupported-version' | 'malformed' };

export function parseImport(text: string): ParseResult;
```

`parseImport` is tolerant within a record: an individual `GameRecord`
missing required fields is dropped silently; the import as a whole only
fails on envelope-level problems. This keeps a partially-corrupt file
useful.

### `useStatsStore.mergeImported`

```ts
mergeImported(records: GameRecord[]): { added: number; skipped: number };
```

Semantics:

1. Compute the existing dedupe key set: `${seed}|${dateMs}|${outcome}`.
2. Filter incoming records: drop ones whose key already exists, and drop
   ones that fail a shape check.
3. Concat existing + new, sort by `dateMs` ascending.
4. Re-derive everything else from the sorted log:
   - `byMode[mode].played`, `won`, `bestTimeSec`, `fewestMovesWin`, `bestScore`
   - `currentStreak` (run of consecutive wins ending at the latest game)
   - `longestStreak` (max streak seen across the log)
   - `totalSecondsPlayed` (sum of `durationSec`)
5. Persist via the existing `persist()` helper.
6. Return `{ added, skipped }` for UI feedback. `skipped` counts records
   filtered out for *any* reason — duplicates or malformed shape.

Determinism: importing into an empty store reproduces the source aggregates
exactly. Merging the same file twice is a no-op. Merging two overlapping
backups in either order converges to the same state.

### UI in `MenuSheet → StatsSection`

A new "Backup" subgroup placed **above** the existing "Reset stats" row so
the destructive action stays at the bottom of the section.

```
[ Export scores ]   [ Import scores ]
```

Two ghost buttons, side by side.

**Export** handler:

1. `const json = serializeExport(stats)`
2. `const blob = new Blob([json], { type: 'application/json' })`
3. Create an object URL, click an invisible `<a download="…">`, then
   `URL.revokeObjectURL`.

Works identically in web and inside the Capacitor Android WebView (the
browser handles the download; file lands in the device's Downloads).

**Import** handler:

1. Hidden `<input type="file" accept="application/json,.json" />` ref'd
   from the button.
2. Button onClick → `inputRef.current?.click()`.
3. Input onChange → `await file.text()` → `parseImport(text)` →
   - On `ok: true` → `mergeImported(games)` → show inline success.
   - On `ok: false` → show inline error mapped from `reason`.
4. After handling, `input.value = ''` so re-picking the same file works.

**Inline feedback** replaces the button row for ~4 s, then auto-hides:

- `added > 0`: `"Imported {added} new games · {skipped} already present"`
  (omit the trailing clause if `skipped === 0`).
- `added === 0 && skipped > 0`: `"No new games to import"`.
- Error mapping:
  - `not-json` / `malformed` → `"Couldn't read this file"`
  - `wrong-kind` → `"This isn't a solitaire stats file"`
  - `unsupported-version` → `"File is from an incompatible version"`

No confirmation modal — merge can't lose data.

### i18n

New keys in `src/i18n/strings.ts` (English + French):

- `stats.exportButton` — "Export scores" / "Exporter les scores"
- `stats.importButton` — "Import scores" / "Importer les scores"
- `stats.importResultAdded` — "Imported {added} new games" /
  "{added} parties importées"
- `stats.importResultSkipped` — " · {skipped} already present" /
  " · {skipped} déjà présentes"
- `stats.importNoNew` — "No new games to import" /
  "Aucune nouvelle partie à importer"
- `stats.importErrorRead` — "Couldn't read this file" /
  "Impossible de lire ce fichier"
- `stats.importErrorKind` — "This isn't a solitaire stats file" /
  "Ce fichier n'est pas un export de scores"
- `stats.importErrorVersion` — "File is from an incompatible version" /
  "Fichier d'une version incompatible"

Final wording will be polished during implementation; the above is the
shape of the keys.

## Testing

**`src/persistence/__tests__/statsTransfer.test.ts`** (new):

- `serializeExport` → `parseImport` round-trips the `games` array unchanged.
- `parseImport` rejects with the expected `reason`:
  - non-JSON text → `not-json`
  - valid JSON missing `kind` → `wrong-kind`
  - wrong `kind` value → `wrong-kind`
  - `schemaVersion` neither `1` nor backwards-compatible → `unsupported-version`
  - missing `data` or `data.games` not an array → `malformed`
- A single `GameRecord` missing `dateMs` is dropped, the rest import.

**`src/store/__tests__/statsStore.test.ts`** (extend):

- `mergeImported` on an empty store reproduces source aggregates byte-for-byte.
- Overlapping import dedupes by `seed|dateMs|outcome`, returns correct counts.
- `mergeImported` recomputes `currentStreak` / `longestStreak` from the
  time-sorted log (covers a backup with an older abandon that should reset
  a stale streak).
- Per-mode `bestTimeSec`, `fewestMovesWin`, `bestScore` are recomputed.
- After `mergeImported`, the persisted IDB value matches the in-memory state.

UI: no new `MenuSheet` test coverage. The component currently has no
dedicated test, and the file-IO bits (Blob URL, `<input type="file">`) are
awkward to assert against in jsdom without giving up real coverage. The
pure module gets the load-bearing tests.

## Files touched

New:

- `src/persistence/statsTransfer.ts`
- `src/persistence/__tests__/statsTransfer.test.ts`

Modified:

- `src/store/statsStore.ts` — add `mergeImported` action and
  aggregate-recompute helper.
- `src/store/__tests__/statsStore.test.ts` — extend with merge tests.
- `src/ui/MenuSheet.tsx` — add Backup row to `StatsSection`.
- `src/ui/MenuSheet.css` — styles for the backup row and inline feedback.
- `src/i18n/strings.ts` — new keys (en + fr).

## Risks and edge cases

- **Schema evolution.** Today `Stats.schemaVersion` is `1`. If we bump it
  later, importing an old envelope should run the same migration path as
  `hydrateStatsFromStorage`. Plan: extract the existing `normalizeStats`
  into a helper and call it inside `parseImport` so both code paths share
  migration logic.
- **Streak recomputation discards historical signal.** If the player had a
  current streak of 7 going from games played today, and they import an
  older backup that ends on an `abandoned` record dated *after* today's
  latest win, the merged-log streak walk will reset the streak. This is
  technically correct (the merged history says they did abandon after
  winning) but might surprise the user. Acceptable for v1; document inline.
- **File size.** A few thousand games is still well under a megabyte of
  JSON. No streaming or chunking needed.
- **Capacitor WebView quirks.** Anchor-triggered downloads work in modern
  Android System WebView; if a future device fails, fallback is to
  `window.open(url)` with the JSON inline. Not building this fallback
  preemptively.
