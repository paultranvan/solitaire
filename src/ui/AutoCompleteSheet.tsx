import { useT } from '@/i18n/useT';
import { Sheet } from './Sheet';
import './AutoCompleteSheet.css';

export function AutoCompleteSheet({
  open,
  onAccept,
  onDecline,
}: {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { t } = useT();
  return (
    <Sheet open={open} onClose={onDecline} title={t('autoComplete.title')}>
      <div className="autocomplete">
        <div className="autocomplete__hero">✨</div>
        <h2 className="autocomplete__title">{t('autoComplete.heading')}</h2>
        <p className="autocomplete__subtitle">{t('autoComplete.subtitle')}</p>
        <div className="autocomplete__actions">
          <button type="button" className="btn btn--primary" onClick={onAccept}>
            {t('autoComplete.accept')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onDecline}>
            {t('autoComplete.decline')}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
