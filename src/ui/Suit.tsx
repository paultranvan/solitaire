import { Suit as SuitT } from '@/game/card';

/* SVG suit glyphs. Inline so the look is identical on every platform —
   unicode ♥♦♠♣ resolve to whatever symbol font the OS supplies (DejaVu
   Sans on Linux, Noto Sans Symbols on Android, Apple Symbols on iOS),
   each with a different weight and proportion. The shapes below mimic
   the classical Liberation/Times-style suits desktop Chrome rendered.
   Filled with currentColor so red/black inherits from .card--red/black. */

// Each suit is one path so it paints in a single fill operation. This matters
// for the semi-transparent foundation hint: the club's three lobes and stem
// overlap, and as separate shapes their alpha would stack into darker seams.
// As subpaths of one <path> the overlaps union (nonzero fill rule) and the
// glyph reads at a uniform opacity, like the other suits.
const PATHS: Record<SuitT, string> = {
  h: 'M50 86 C50 86 10 60 10 32 C10 18 21 8 33 8 C41 8 47 13 50 21 C53 13 59 8 67 8 C79 8 90 18 90 32 C90 60 50 86 50 86 Z',
  d: 'M50 6 L86 50 L50 94 L14 50 Z',
  s: 'M50 6 C50 6 12 36 12 60 C12 74 22 83 33 83 C40 83 46 80 50 75 C49 84 45 92 38 95 L62 95 C55 92 51 84 50 75 C54 80 60 83 67 83 C78 83 88 74 88 60 C88 36 50 6 50 6 Z',
  // Three round lobes (top, left, right; the side lobes just touch and the top
  // lobe overlaps each enough to leave no gap) plus a stem that bridges the gap
  // above the side-lobe touch point and flares to a wider foot.
  c:
    'M28 28 A22 22 0 1 0 72 28 A22 22 0 1 0 28 28 Z' +
    'M6 55 A22 22 0 1 0 50 55 A22 22 0 1 0 6 55 Z' +
    'M50 55 A22 22 0 1 0 94 55 A22 22 0 1 0 50 55 Z' +
    'M44 46 L44 82 C44 90 36 94 22 96 L78 96 C64 94 56 90 56 82 L56 46 Z',
};

export function Suit({ suit, className }: { suit: SuitT; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[suit]} />
    </svg>
  );
}
