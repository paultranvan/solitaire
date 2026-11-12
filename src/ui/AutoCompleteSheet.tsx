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
        <div className="sheet-hero" aria-hidden="true">
          {/* Three four-point sparkles: the cards are about to fly home. */}
          <svg className="autocomplete__sparkle" viewBox="0 0 48 48" focusable="false">
            <path d="M22 6 L25.2 18.8 L38 22 L25.2 25.2 L22 38 L18.8 25.2 L6 22 L18.8 18.8 Z" />
            <path d="M38 28 L39.6 34.4 L46 36 L39.6 37.6 L38 44 L36.4 37.6 L30 36 L36.4 34.4 Z" />
            <path d="M39 4 L40.2 8.8 L45 10 L40.2 11.2 L39 16 L37.8 11.2 L33 10 L37.8 8.8 Z" />
          </svg>
        </div>
        <h2 className="sheet-headline">{t('autoComplete.heading')}</h2>
        <p className="sheet-sub">{t('autoComplete.subtitle')}</p>
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
