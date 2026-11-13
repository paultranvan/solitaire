import { useT } from '@/i18n/useT';
import { useLeaderboardStore } from '@/store/leaderboardStore';
import { formatOrdinal } from './format';
import { WorldCelebration } from './WorldCelebration';
import { worldTier } from './worldTier';
import './WorldRank.css';

// Where the win just played stands on the shared leaderboard, shown in the
// win sheet's results: a celebration banner when it enters the world's top
// ten, a plain line otherwise (still sending, ranked lower, queued, refused).
// Self-contained — it reads the leaderboard store, so the sheet needs no
// extra props — and renders nothing when there is nothing to say: feature
// off, opted out, a game that can't be verified, or the publish question
// still unanswered (that is PublishStep's turn).
export function WorldRank() {
  const current = useLeaderboardStore((s) => s.current);
  const { t, formatNumber, lang } = useT();
  if (current === null) return null;

  const { status } = current;
  if (status.kind === 'prompt') return null;

  // Only a newly stored entry is celebrated: "already ranked" is the standing
  // of an earlier game on the same deal, not something this win achieved.
  if (status.kind === 'ranked' && status.accepted && worldTier(status.rank) !== null) {
    return <WorldCelebration rank={status.rank} total={status.total} />;
  }

  let line: string;
  switch (status.kind) {
    case 'sending':
      line = t('world.sending');
      break;
    case 'ranked':
      line = t(status.accepted ? 'world.ranked' : 'world.alreadyRanked', {
        rank: formatOrdinal(status.rank, lang),
        total: formatNumber(status.total),
      });
      break;
    case 'queued':
      line = t('world.queued');
      break;
    case 'rejected':
      line = t('world.rejected');
      break;
  }
  return (
    <p className={`world world--status world--${status.kind}`} role="status">
      {line}
    </p>
  );
}
