import { Move } from '@/game/moves';
import { play } from '@/audio/sounds';
import { haptic } from '@/haptics/haptics';

export type FeedbackKind = 'pickup' | 'dropValid' | 'dropInvalid' | 'foundation';

// Fires the matching sound + haptic together. The two channels are gated
// independently in their stores; this just keeps callers from forgetting one.
export const feedback = (kind: FeedbackKind): void => {
  play(kind);
  haptic(kind);
};

export const isFoundationMove = (move: Move): boolean =>
  move.kind === 'tableauToFoundation' || move.kind === 'talonToFoundation';

export const feedbackForMove = (move: Move): FeedbackKind =>
  isFoundationMove(move) ? 'foundation' : 'dropValid';
