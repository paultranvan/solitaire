import { useT } from '@/i18n/useT';
import { formatOrdinal } from './format';
import { worldTier } from './worldTier';
import './WorldCelebration.css';

// Emblems are inline SVG, like the crown and the suits: identical on every
// platform and same-origin for the CSP. Colours come from the tier's CSS.

function Trophy() {
  return (
    <svg className="wcel__art" viewBox="0 0 64 64" focusable="false">
      <path className="wcel__art-line" d="M18 15 H10 C10 25 14 30 21 31" />
      <path className="wcel__art-line" d="M46 15 H54 C54 25 50 30 43 31" />
      <path d="M17 9 H47 V23 C47 33 40.5 39 32 39 C23.5 39 17 33 17 23 Z" />
      <rect x="29" y="38" width="6" height="9" />
      <rect x="22" y="46" width="20" height="5" rx="1.5" />
      <rect x="17" y="51" width="30" height="6" rx="2" />
      <path
        className="wcel__art-cut"
        d="M32 14 L34.4 19.6 L40.4 20.1 L35.8 24 L37.2 29.9 L32 26.7 L26.8 29.9 L28.2 24 L23.6 20.1 L29.6 19.6 Z"
      />
    </svg>
  );
}

function Medal({ place }: { place: 2 | 3 }) {
  return (
    <svg className="wcel__art" viewBox="0 0 64 64" focusable="false">
      <path className="wcel__art-ribbon wcel__art-ribbon--back" d="M45 2 H35 L27 25 H37 Z" />
      <path className="wcel__art-ribbon" d="M19 2 H29 L37 25 H27 Z" />
      <circle cx="32" cy="42" r="17" />
      <circle className="wcel__art-ring" cx="32" cy="42" r="12.5" />
      <text className="wcel__art-num" x="32" y="49" textAnchor="middle">
        {place}
      </text>
    </svg>
  );
}

function StarBadge() {
  return (
    <svg className="wcel__art" viewBox="0 0 64 64" focusable="false">
      <circle className="wcel__art-disc" cx="32" cy="32" r="27" />
      <path d="M32 13 L37.6 25.2 L51 26.8 L41.1 36 L43.8 49.2 L32 42.6 L20.2 49.2 L22.9 36 L13 26.8 L26.4 25.2 Z" />
    </svg>
  );
}

function Sparkle({ slot }: { slot: 'a' | 'b' | 'c' }) {
  return (
    <svg className={`wcel__spark wcel__spark--${slot}`} viewBox="0 0 44 44" focusable="false">
      <path d="M22 6 L25.2 18.8 L38 22 L25.2 25.2 L22 38 L18.8 25.2 L6 22 L18.8 18.8 Z" />
    </svg>
  );
}

// The banner a win gets when it lands in the world's top ten. Each podium
// place has its own entrance — a trophy rising in front of turning rays for
// the record, a medal swinging in for second, one dropping and bouncing for
// third — and the rest of the top ten share a star that pops with a ripple.
// All of it is CSS (WorldCelebration.css), and none of it runs when
// animations are off or reduced motion is requested.
export function WorldCelebration({ rank, total }: { rank: number; total: number }) {
  const { t, formatNumber, lang } = useT();
  const tier = worldTier(rank);
  if (tier === null) return null;

  const count = formatNumber(total);
  const title =
    tier === 'gold'
      ? t('world.top1')
      : tier === 'silver'
        ? t('world.top2')
        : tier === 'bronze'
          ? t('world.top3')
          : t('world.top10');
  const sub =
    tier === 'gold'
      ? t('world.top1Sub', { total: count })
      : tier === 'top10'
        ? t('world.top10Sub', { rank: formatOrdinal(rank, lang), total: count })
        : t('world.podiumSub', { total: count });

  return (
    <div className={`wcel wcel--${tier}`} role="status">
      <div className="wcel__emblem" aria-hidden="true">
        {tier === 'gold' && <span className="wcel__rays" />}
        {tier === 'top10' && <span className="wcel__ring" />}
        {tier === 'gold' && <Trophy />}
        {tier === 'silver' && <Medal place={2} />}
        {tier === 'bronze' && <Medal place={3} />}
        {tier === 'top10' && <StarBadge />}
      </div>
      {(tier === 'bronze' || tier === 'top10') && (
        <span aria-hidden="true">
          <Sparkle slot="a" />
          <Sparkle slot="b" />
          <Sparkle slot="c" />
        </span>
      )}
      <span className="wcel__title">{title}</span>
      <span className="wcel__sub">{sub}</span>
    </div>
  );
}
