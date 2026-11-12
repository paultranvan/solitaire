/* Gold crown emblem for the win sheet's medallion. Inline SVG for the same
   reason as Suit.tsx — identical on every platform, and same-origin for the
   CSP. Colour, outline and size come from the caller's class. */
export function Crown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 50" aria-hidden="true" focusable="false">
      <path d="M10 40 L5 15 L27 27 L50 5 L73 27 L95 15 L90 40 Z" />
      <circle cx="5" cy="12" r="5" />
      <circle cx="50" cy="6" r="6" />
      <circle cx="95" cy="12" r="5" />
      <rect x="9" y="38" width="82" height="9" rx="2.5" />
    </svg>
  );
}
