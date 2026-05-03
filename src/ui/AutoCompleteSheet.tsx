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
  return (
    <Sheet open={open} onClose={onDecline} title="auto-complete?">
      <div className="autocomplete">
        <div className="autocomplete__hero">✨</div>
        <h2 className="autocomplete__title">Ready to finish</h2>
        <p className="autocomplete__subtitle">
          All face-down cards are revealed. Auto-resolve the rest to the foundations?
        </p>
        <div className="autocomplete__actions">
          <button type="button" className="btn btn--primary" onClick={onAccept}>
            Auto-complete
          </button>
          <button type="button" className="btn btn--ghost" onClick={onDecline}>
            Keep playing
          </button>
        </div>
      </div>
    </Sheet>
  );
}
