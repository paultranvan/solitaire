import { useT } from '@/i18n/useT';
import { useLeaderboardStore } from '@/store/leaderboardStore';
import type { Ranking } from '@/store/records';
import { Confetti } from './Confetti';
import { Crown } from './Crown';
import { PublishStep } from './PublishStep';
import { Sheet } from './Sheet';
import { formatMMSS, formatOrdinal } from './format';
import { WorldRank } from './WorldRank';
import './WinSheet.css';

export function WinSheet({
  open,
  onClose,
  onNewGame,
  onReplay,
  durationSec,
  moves,
  score,
  ranking,
  showConfetti = true,
}: {
  open: boolean;
  onClose: () => void;
  onNewGame: () => void;
  onReplay: () => void;
  durationSec: number;
  moves: number;
  score: number;
  ranking: Ranking | null;
  showConfetti?: boolean;
}) {
  const { t, formatNumber, lang } = useT();
  const world = useLeaderboardStore((s) => s.current);

  // The first time a win could go to the shared leaderboard, the sheet opens
  // on that question alone; the results follow once it is answered.
  const asking = world !== null && world.status.kind === 'prompt';
  // The best score in the world earns a second, all-gold shower.
  const worldRecord =
    world !== null &&
    world.status.kind === 'ranked' &&
    world.status.accepted &&
    world.status.rank === 1;

  const bannerKey =
    ranking === null || ranking.rank > 3
      ? null
      : (['win.bannerGold', 'win.bannerSilver', 'win.bannerBronze'] as const)[ranking.rank - 1];

  const medalLabel = (kind: 'Time' | 'Moves', placement: 0 | 1 | 2 | 3) =>
    placement === 0 ? null : t(`win.medal${kind}${placement}` as const);

  return (
    <>
      {open && showConfetti && <Confetti />}
      {open && showConfetti && worldRecord && <Confetti palette="gold" pieces={90} />}
      <Sheet open={open} onClose={onClose} title={t('win.title')}>
        {asking ? (
          <div key="publish" className="win win-step">
            <PublishStep score={score} />
          </div>
        ) : (
          <div key="results" className="win win-step">
            <div className="sheet-hero" aria-hidden="true">
              <Crown className="win__crown" />
            </div>
            <h2 className="sheet-headline">{t('win.heading')}</h2>
            <p className="sheet-sub">{t('win.subtitle')}</p>

            <div className="win__score">
              <div className="win__score-value">{formatNumber(score)}</div>
              <div className="win__score-label">{t('win.score')}</div>
            </div>

            {/* Standing on the shared leaderboard — a banner for a world
                top-ten, a line otherwise. Renders nothing when the feature is
                off or this win isn't eligible. */}
            <WorldRank />

            {ranking !== null && bannerKey === null && (
              <p className="win__rank">
                {t('win.rankLine', {
                  rank: formatOrdinal(ranking.rank, lang),
                  total: formatNumber(ranking.total),
                })}
              </p>
            )}
            {ranking !== null && bannerKey !== null && (
              <div className="win__banner">
                <span className="win__banner-msg">{t(bannerKey)}</span>
                <span className="win__banner-sub">
                  {t('win.rankOutOf', { total: formatNumber(ranking.total) })}
                </span>
              </div>
            )}

            <div className="win__stats win__stats--pair">
              <div
                className={`win__stat${ranking && ranking.timeMedal ? ' win__stat--medal' : ''}`}
              >
                <div className="win__stat-value">{formatMMSS(durationSec)}</div>
                <div className="win__stat-label">
                  {medalLabel('Time', ranking?.timeMedal ?? 0) ?? t('win.time')}
                </div>
              </div>
              <div
                className={`win__stat${ranking && ranking.movesMedal ? ' win__stat--medal' : ''}`}
              >
                <div className="win__stat-value">{formatNumber(moves)}</div>
                <div className="win__stat-label">
                  {medalLabel('Moves', ranking?.movesMedal ?? 0) ?? t('win.moves')}
                </div>
              </div>
            </div>

            <div className="win__actions">
              <button type="button" className="btn btn--primary" onClick={onNewGame}>
                {t('win.newGame')}
              </button>
              <button type="button" className="btn btn--ghost" onClick={onReplay}>
                {t('win.replay')}
              </button>
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                {t('win.close')}
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}
