# Card-back picker — design

**Date:** 2026-05-17
**Status:** Approved for planning

## Goal

Let the player choose between three card-back designs from the settings menu.
The choice persists across sessions and applies to every face-down card,
including the drag overlay.

## Scope

In scope:

- A new `cardBack` setting with three values.
- Three pure-CSS card-back designs.
- A swatch picker in the `MenuSheet` settings section.
- A brief crossfade when the back changes.
- English + French label.

Out of scope:

- Any change to `src/game/` (engine untouched — no game-logic tests needed).
- Image- or SVG-based backs (pure CSS only, for cross-platform consistency
  with the project's existing inline-SVG / self-hosted-font philosophy).
- Per-deal or random backs.

## The three designs

All pure CSS, layered on the shared structural `.card--back` rules (size,
white border, inset+drop shadow). Approved via visual mockup.

1. **Classic Navy** (`navy`) — the current back, unchanged. Diagonal weave:
   `repeating-linear-gradient(45deg, …)` over a soft radial highlight. Default.
2. **Crimson Lattice** (`crimson`) — deep-red vertical gradient with two
   crossed `repeating-linear-gradient`s forming a diamond crosshatch.
3. **Emerald Dots** (`emerald`) — green vertical gradient with a
   `radial-gradient` polka-dot grid (`background-size: 15px 15px`).

Reference CSS (final values tuned during implementation):

```css
.card--back--navy {
  background:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), transparent 50%),
    repeating-linear-gradient(45deg, var(--card-back) 0 4px, #2d4ea8 4px 8px);
}
.card--back--crimson {
  background:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,0.16), transparent 55%),
    repeating-linear-gradient(45deg, transparent 0 10px, rgba(0,0,0,0.22) 10px 12px),
    repeating-linear-gradient(-45deg, transparent 0 10px, rgba(0,0,0,0.22) 10px 12px),
    linear-gradient(#9c2727, #7d1a1a);
}
.card--back--emerald {
  background:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,0.16), transparent 55%),
    radial-gradient(rgba(255,255,255,0.28) 1.6px, transparent 2px),
    linear-gradient(#15663a, #0e4a2a);
  background-size: auto, 12px 12px, auto;
}
```

## Architecture

`src/game/` is untouched. The change is confined to settings, the `Card`
component, CSS, the menu UI, and i18n.

### Setting

`Settings` (in `store/settingsStore.ts`) gains:

```ts
cardBack: 'navy' | 'crimson' | 'emerald';
```

`defaultSettings()` returns `cardBack: 'navy'`. **No `schemaVersion` bump** —
`hydrate` already spreads `defaultSettings()` under loaded values, so saves
written before this change deserialize with `cardBack: 'navy'`.

Export a `CardBack` type alias and an ordered `CARD_BACKS: CardBack[]` constant
(`['navy', 'crimson', 'emerald']`) so the picker and any tests share one source
of truth.

### Rendering — `Card.css` / `Card.tsx`

`Card.css` splits today's `.card--back`:

- `.card--back` keeps the **shared structural rules**: border, box-shadow.
  (Size comes from `.card`; `.card--back` only carries the white border +
  shadow today.)
- Three **background-only** classes: `.card--back--navy` (today's gradient,
  moved verbatim), `.card--back--crimson`, `.card--back--emerald`.

`Card.tsx` already subscribes to the settings store (for `animations`). It
reads `cardBack` the same way and appends `card--back--${cardBack}` to the
back face's `className`. The drag overlay reuses `CardView`, so it inherits the
choice with no extra work.

### Crossfade on change

A real crossfade between two CSS gradients cannot be a `transition`
(`background-image` is not interpolable). It is done with a transient overlay
layer inside the back face:

- The back face renders its current variant as the base layer.
- `CardView` keeps the previously-rendered `cardBack` in a ref. When the
  setting changes, it renders an extra absolutely-positioned overlay div
  carrying the **old** variant class on top of the new base, then fades that
  overlay `opacity: 1 → 0` over ~220 ms via a CSS transition.
- `onTransitionEnd` clears the overlay from state, so steady state is a single
  back layer with zero overhead.
- The overlay is suppressed when `settings.animations` is off (instant swap),
  consistent with how `Card.tsx` already gates `layoutTransition`.

This keeps the crossfade self-contained in `CardView` with one `useState` +
one `useRef`; no board-level coordination, no engine involvement.

### Picker UI — `MenuSheet.tsx`

A new row in `SettingsSection`, placed after the `language` row. Instead of the
text `seg` control, three **swatch buttons**: small rounded chips
(~`2.4 × card-ratio`) each rendering the real back via the `.card--back--*`
classes. The active one gets a highlight ring (reuse the `seg__btn.is-active`
visual language or a dedicated `.swatch.is-active` rule).

Markup sketch:

```tsx
<div className="m-row">
  <span>{t('settings.cardBack')}</span>
  <div className="swatches">
    {CARD_BACKS.map((id) => (
      <button
        key={id}
        type="button"
        aria-label={id}
        className={`swatch card--back card--back--${id}${
          settings.cardBack === id ? ' is-active' : ''
        }`}
        onClick={() => set({ cardBack: id })}
      />
    ))}
  </div>
</div>
```

New `.swatch` / `.swatches` rules go in `MenuSheet.css`.

### i18n — `strings.ts`

One new key in both maps:

- `en`: `'settings.cardBack': 'Card back'`
- `fr`: `'settings.cardBack': 'Dos des cartes'`

## Testing

`src/game/` is untouched, so no engine tests change.

- Add `src/store/__tests__/settingsStore.test.ts` (none exists today):
  `defaultSettings()` returns `cardBack: 'navy'`; `update({ cardBack })`
  patches the value; `hydrate` of a pre-`cardBack` payload falls back to
  `'navy'`.
- `Board.test.tsx` is the only UI test and needs no change.

Manual smoke test (per CLAUDE.md's animation-sensitive checklist): open the
menu, switch backs and confirm the crossfade, close the menu, draw a card and
drag a stack to confirm the chosen back shows on stock/talon and the drag
overlay, reload to confirm persistence.

## Files touched

| File | Change |
|------|--------|
| `store/settingsStore.ts` | `cardBack` field, default, `CardBack` type, `CARD_BACKS` const |
| `ui/Card.tsx` | read `cardBack`, apply variant class, crossfade overlay |
| `ui/Card.css` | split `.card--back` into structural + 3 variant classes |
| `ui/MenuSheet.tsx` | swatch picker row |
| `ui/MenuSheet.css` | `.swatch` / `.swatches` styles |
| `i18n/strings.ts` | `settings.cardBack` (en + fr) |
| `store/__tests__/settingsStore.test.ts` | new test file |
