# Card-back Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the player pick one of three pure-CSS card-back designs from the settings menu, persisted across sessions.

**Architecture:** A new `cardBack` setting drives a per-variant CSS class on the card's back face. `src/game/` is untouched. The settings store carries the value and the canonical `CARD_BACKS` list; `Card.tsx` applies the variant class and renders a transient fade-out overlay when the design changes; `MenuSheet.tsx` adds a swatch picker.

**Tech Stack:** React 18, TypeScript (strict), Zustand + immer, Vitest + Testing Library, plain CSS.

---

## File Structure

| File | Responsibility | Change |
|------|----------------|--------|
| `src/store/settingsStore.ts` | Settings shape, defaults, persistence | Add `cardBack` field, `CardBack` type, `CARD_BACKS` const |
| `src/store/__tests__/settingsStore.test.ts` | Unit tests for the store | New file |
| `src/ui/Card.css` | Card visuals | Split `.card--back` into structural + 3 variant classes; add fade overlay + keyframes |
| `src/ui/Card.tsx` | Card component | Apply variant class to the back face; render crossfade overlay |
| `src/i18n/strings.ts` | UI copy | Add `settings.cardBack` (en + fr) |
| `src/ui/MenuSheet.tsx` | Settings menu | Add swatch picker row |
| `src/ui/MenuSheet.css` | Settings menu styles | Add `.swatches` / `.swatch` rules |

Build sequence: store → CSS variants → `Card.tsx` → i18n → `MenuSheet`. Each task ends with a commit.

---

## Task 1: Add `cardBack` to the settings store

**Files:**
- Modify: `src/store/settingsStore.ts`
- Test: `src/store/__tests__/settingsStore.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/store/__tests__/settingsStore.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { CARD_BACKS, defaultSettings, Settings, useSettingsStore } from '../settingsStore';

describe('settingsStore — cardBack', () => {
  beforeEach(() => {
    useSettingsStore.setState({ settings: defaultSettings() });
  });

  it('defaults cardBack to navy', () => {
    expect(defaultSettings().cardBack).toBe('navy');
  });

  it('CARD_BACKS lists the three designs in order', () => {
    expect(CARD_BACKS).toEqual(['navy', 'crimson', 'emerald']);
  });

  it('update() patches cardBack', () => {
    useSettingsStore.getState().update({ cardBack: 'crimson' });
    expect(useSettingsStore.getState().settings.cardBack).toBe('crimson');
  });

  it('hydrate() of a payload without cardBack falls back to navy', () => {
    const legacy = {
      schemaVersion: 1,
      drawCount: 1,
      sound: true,
      haptics: true,
      animations: true,
      handedness: 'right',
      requireWinnable: false,
      language: 'en',
    } as unknown as Settings;
    useSettingsStore.getState().hydrate(legacy);
    expect(useSettingsStore.getState().settings.cardBack).toBe('navy');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/store/__tests__/settingsStore.test.ts`
Expected: FAIL — `CARD_BACKS` is not exported / `cardBack` does not exist on `Settings`.

- [ ] **Step 3: Add the type, constant, and field**

In `src/store/settingsStore.ts`, after the imports add the type and constant:

```ts
export type CardBack = 'navy' | 'crimson' | 'emerald';

// Canonical order — shared by the picker UI and tests.
export const CARD_BACKS: CardBack[] = ['navy', 'crimson', 'emerald'];
```

In the `Settings` type, add the field (place it after `handedness`):

```ts
  handedness: 'right' | 'left';
  // Chosen card-back design. See CARD_BACKS / Card.css variant classes.
  cardBack: CardBack;
```

In `defaultSettings()`, add the default (after `handedness`):

```ts
  handedness: 'right',
  cardBack: 'navy',
```

No `schemaVersion` bump: `hydrate` already spreads `defaultSettings()` under loaded values, so saves written before this change deserialize with `cardBack: 'navy'`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/store/__tests__/settingsStore.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/store/settingsStore.ts src/store/__tests__/settingsStore.test.ts
git commit -m "feat(settings): add cardBack setting with three designs"
```

---

## Task 2: Card-back CSS — split structural rules from design variants

**Files:**
- Modify: `src/ui/Card.css`

No unit test — this is pure CSS, verified by `npm run build` here and the manual smoke test after Task 3.

- [ ] **Step 1: Replace the `.card--back` rule with structural + variant classes**

In `src/ui/Card.css`, find the current `.card--back` rule:

```css
.card--back {
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.18), transparent 50%),
    repeating-linear-gradient(45deg, var(--card-back) 0 4px, #2d4ea8 4px 8px);
  border: 1.5px solid #fff;
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.4),
    0 1px 3px rgba(0, 0, 0, 0.35);
}
```

Replace it entirely with:

```css
/* Structural rules shared by every back design. The chosen design's
   background comes from a .card--back--<id> variant class applied
   alongside this one (see Card.tsx). */
.card--back {
  border: 1.5px solid #fff;
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.4),
    0 1px 3px rgba(0, 0, 0, 0.35);
}

/* Design variants — background only. Defined after .card so they win the
   cascade over .card's --card-bg fill. */
.card--back--navy {
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.18), transparent 50%),
    repeating-linear-gradient(45deg, var(--card-back) 0 4px, #2d4ea8 4px 8px);
}

.card--back--crimson {
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.16), transparent 55%),
    repeating-linear-gradient(45deg, transparent 0 10px, rgba(0, 0, 0, 0.22) 10px 12px),
    repeating-linear-gradient(-45deg, transparent 0 10px, rgba(0, 0, 0, 0.22) 10px 12px),
    linear-gradient(#9c2727, #7d1a1a);
}

.card--back--emerald {
  background:
    radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.16), transparent 55%),
    radial-gradient(rgba(255, 255, 255, 0.28) 1.6px, transparent 2px),
    linear-gradient(#15663a, #0e4a2a);
  background-size: auto, 12px 12px, auto;
}

/* Crossfade overlay: the outgoing design, painted on top of the new back
   and faded out. A keyframe animation (not a transition) so it plays on
   mount with no double-render trick. Removed on animationend by Card.tsx. */
.card--back-fade {
  position: absolute;
  inset: 0;
  border-radius: var(--card-radius);
  pointer-events: none;
  animation: card-back-fade-out 220ms ease forwards;
}

@keyframes card-back-fade-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
```

- [ ] **Step 2: Verify the build still compiles**

Run: `npm run build`
Expected: PASS — `tsc --noEmit` clean, `vite build` writes `dist/` with no CSS errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/Card.css
git commit -m "refactor(card): split card-back CSS into design variants"
```

---

## Task 3: Apply the chosen back and crossfade in `Card.tsx`

**Files:**
- Modify: `src/ui/Card.tsx`

No unit test — the project keeps UI tests limited to `Board.test.tsx`, and the crossfade is animation behavior. Verified by `npm run build` / `npm run lint` and the manual smoke test in Step 6.

- [ ] **Step 1: Widen the React import**

In `src/ui/Card.tsx`, change:

```ts
import { createContext, useContext } from 'react';
```

to:

```ts
import { createContext, useContext, useEffect, useRef, useState } from 'react';
```

- [ ] **Step 2: Import the `CardBack` type**

Change:

```ts
import { useSettingsStore } from '@/store/settingsStore';
```

to:

```ts
import { useSettingsStore, CardBack } from '@/store/settingsStore';
```

- [ ] **Step 3: Read `cardBack` and set up the crossfade state**

In `CardView`, immediately after the existing line
`const animationsOn = useSettingsStore((s) => s.settings.animations);`
add:

```ts
  const cardBack = useSettingsStore((s) => s.settings.cardBack);

  // Crossfade backs: when the chosen design changes, paint the previous
  // design as an overlay that fades out over the new base. Using a CSS
  // keyframe (see .card--back-fade) means it plays on mount with no
  // double-render dance. With animations off the swap is instant.
  const prevBackRef = useRef(cardBack);
  const [fadingBack, setFadingBack] = useState<CardBack | null>(null);
  useEffect(() => {
    if (prevBackRef.current !== cardBack) {
      if (animationsOn) setFadingBack(prevBackRef.current);
      prevBackRef.current = cardBack;
    }
  }, [cardBack, animationsOn]);
```

- [ ] **Step 4: Apply the variant class and render the overlay**

In `CardView`'s returned JSX, find the back face — currently a self-closing div:

```tsx
        <div
          className="card-flip__face card-flip__back card card--back"
          aria-hidden={card.faceUp}
        />
```

Replace it with a container that carries the variant class and the fade overlay:

```tsx
        <div
          className={`card-flip__face card-flip__back card card--back card--back--${cardBack}`}
          aria-hidden={card.faceUp}
        >
          {fadingBack && (
            <div
              key={fadingBack}
              className={`card--back-fade card--back--${fadingBack}`}
              onAnimationEnd={() => setFadingBack(null)}
              aria-hidden
            />
          )}
        </div>
```

The `key={fadingBack}` forces a fresh node if the design changes again mid-fade, so the keyframe restarts cleanly.

- [ ] **Step 5: Verify lint and build**

Run: `npm run lint && npm run build`
Expected: PASS — no unused-symbol errors (all of `useEffect`, `useRef`, `useState`, `CardBack` are used), `tsc` clean.

- [ ] **Step 6: Manual smoke test**

Run: `npm run dev`, open the app. Confirm:
- Face-down cards (stock, tableau) show the navy weave back as before.
- Draw a card and drag a stack — no animation flicker (per CLAUDE.md's flicker-prone checklist).

The picker UI does not exist yet, so back-switching is verified at the end of Task 5.

- [ ] **Step 7: Commit**

```bash
git add src/ui/Card.tsx
git commit -m "feat(card): render the selected card-back design"
```

---

## Task 4: Add the `settings.cardBack` label

**Files:**
- Modify: `src/i18n/strings.ts`

- [ ] **Step 1: Add the English key**

In `src/i18n/strings.ts`, in the English map, add after the `'settings.layout'` line:

```ts
  'settings.cardBack': 'Card back',
```

- [ ] **Step 2: Add the French key**

In the French map, add after the `'settings.layout'` line:

```ts
  'settings.cardBack': 'Dos des cartes',
```

- [ ] **Step 3: Verify the build (string-map types stay in sync)**

Run: `npm run build`
Expected: PASS — both language maps share the same key type; a key missing from one map would fail `tsc`.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/strings.ts
git commit -m "i18n: add card-back setting label"
```

---

## Task 5: Add the swatch picker to the settings menu

**Files:**
- Modify: `src/ui/MenuSheet.tsx`
- Modify: `src/ui/MenuSheet.css`

- [ ] **Step 1: Import `CARD_BACKS`**

In `src/ui/MenuSheet.tsx`, change:

```ts
import { useSettingsStore, Settings } from '@/store/settingsStore';
```

to:

```ts
import { useSettingsStore, Settings, CARD_BACKS } from '@/store/settingsStore';
```

- [ ] **Step 2: Add the picker row**

In the `SettingsSection` component, find the language `m-row` block (the one containing the English/Français `seg`). Immediately after that closing `</div>` and before the first `<Toggle …>`, add:

```tsx
      <div className="m-row">
        <span>{t('settings.cardBack')}</span>
        <div className="swatches">
          {CARD_BACKS.map((id) => (
            <button
              key={id}
              type="button"
              aria-label={id}
              aria-pressed={settings.cardBack === id}
              className={`swatch card--back--${id}${
                settings.cardBack === id ? ' is-active' : ''
              }`}
              onClick={() => set({ cardBack: id })}
            />
          ))}
        </div>
      </div>
```

This reuses the `.card--back--<id>` classes from `Card.css` (already imported globally) so each swatch shows the real design.

- [ ] **Step 3: Add the swatch styles**

Append to `src/ui/MenuSheet.css`:

```css
.swatches {
  display: inline-flex;
  gap: 8px;
}

.swatch {
  width: 34px;
  height: 48px;
  padding: 0;
  border-radius: 5px;
  border: 1.5px solid rgba(255, 255, 255, 0.55);
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
  transition: transform 0.12s;
}

.swatch:hover {
  transform: translateY(-1px);
}

.swatch.is-active {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}
```

- [ ] **Step 4: Verify lint and build**

Run: `npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 5: Run the full test suite**

Run: `npm run test:run`
Expected: PASS — all existing tests plus the 4 new `settingsStore` tests; nothing regressed.

- [ ] **Step 6: Manual smoke test**

Run: `npm run dev`, open the app, open the menu (Settings section). Confirm:
- A "Card back" row shows three swatches; the navy one has a gold ring.
- Tapping crimson or emerald rings that swatch and crossfades every face-down card on the board behind the sheet (~220 ms).
- Toggle "Animations" off, switch backs — the swap is instant, no fade.
- Pick crimson, reload the page — the talon/stock still show the crimson back (persistence).
- After a draw and a stack drag, the drag overlay card shows the chosen back.

- [ ] **Step 7: Commit**

```bash
git add src/ui/MenuSheet.tsx src/ui/MenuSheet.css
git commit -m "feat(menu): add card-back design picker"
```

---

## Self-Review Notes

- **Spec coverage:** setting + default (Task 1), three CSS designs (Task 2), variant rendering + crossfade (Tasks 2–3), drag-overlay inheritance (Task 3, via shared `CardView`), swatch picker (Task 5), i18n (Task 4), `settingsStore` test (Task 1). All spec sections map to a task.
- **Type consistency:** `CardBack` and `CARD_BACKS` are defined once in `settingsStore.ts` (Task 1) and consumed by `Card.tsx` (Task 3) and `MenuSheet.tsx` (Task 5). Variant class name `card--back--<id>` is identical in `Card.css`, `Card.tsx`, and `MenuSheet.tsx`. Fade class `.card--back-fade` and keyframe `card-back-fade-out` match between `Card.css` and `Card.tsx`.
- **No placeholders:** every code step shows complete content.
