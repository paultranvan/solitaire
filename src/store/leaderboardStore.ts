import { create } from 'zustand';
import type { Move } from '@/game/moves';
import { parseMoveLog } from '@/game/replay';
import {
  submitPastWins,
  submitScore,
  type ScoreSubmission,
  type SubmitOutcome,
} from '@/leaderboard/api';
import { LEADERBOARD_URL } from '@/leaderboard/config';
import { normalizeName } from '@/leaderboard/name';
import { MAX_PAST_WINS, parsePastWin, selectPastWins, type PastWin } from '@/leaderboard/pastWins';
import { KEY_LEADERBOARD, loadKey, saveKey } from '@/persistence/db';
import { useSettingsStore } from './settingsStore';
import { useStatsStore } from './statsStore';

// A finished game as the board hands it over: everything a submission needs
// except the display name, which comes from settings (or the publish prompt).
export type WonGame = Omit<ScoreSubmission, 'name'>;

export type WinStatus =
  // Waiting for the player to answer the one-time publish prompt.
  | { kind: 'prompt' }
  | { kind: 'sending' }
  // `accepted: false` means this deal was already on the board; the rank is
  // the stored entry's.
  | { kind: 'ranked'; accepted: boolean; rank: number; total: number }
  // Couldn't reach the server — parked in the queue for a later attempt.
  | { kind: 'queued' }
  | { kind: 'rejected' };

type CurrentWin = { game: WonGame; status: WinStatus };

// What survives a restart (see sanitizeQueue / sanitizePastWins).
type Stored = Pick<LeaderboardStore, 'queue' | 'pastPending' | 'pastDone'>;

type LeaderboardStore = {
  // Shared-leaderboard state of the most recent win, shown on the win sheet.
  // null when there is nothing to show (feature off, opted out, or the game
  // has no move log to verify).
  current: CurrentWin | null;
  // Verified-pending submissions that couldn't be delivered yet. Persisted.
  queue: ScoreSubmission[];
  // The one-time import of wins from before the leaderboard existed (they
  // have no move log to replay — see leaderboard/pastWins.ts).
  // `pastPending` is null until the batch has been picked, then holds it until
  // it is delivered; `pastDone` closes the matter for good. Both persisted.
  pastPending: PastWin[] | null;
  pastDone: boolean;
  // Called by the board on every win. `moves: null` = unverifiable game.
  offerWin: (game: (Omit<WonGame, 'moves'> & { moves: Move[] | null }) | null) => void;
  // Answers to the publish prompt.
  publish: (name: string) => boolean;
  decline: () => void;
  flushQueue: () => Promise<void>;
  hydrate: (stored: Stored) => void;
};

// A handful of offline wins is plausible; a long backlog isn't worth keeping
// (oldest entries are dropped first).
const MAX_QUEUE = 20;
const MAX_SEED_LENGTH = 64;

const sameDeal = (a: { seed: string; drawCount: number }, b: { seed: string; drawCount: number }) =>
  a.seed === b.seed && a.drawCount === b.drawCount;

const statusFor = (outcome: SubmitOutcome): WinStatus => {
  switch (outcome.kind) {
    case 'ranked':
      return {
        kind: 'ranked',
        accepted: outcome.accepted,
        rank: outcome.rank,
        total: outcome.total,
      };
    case 'retry':
      return { kind: 'queued' };
    case 'rejected':
      return { kind: 'rejected' };
  }
};

let flushing = false;
let sendingPastWins = false;

export const useLeaderboardStore = create<LeaderboardStore>()((set, get) => {
  const persist = () => {
    const { queue, pastPending, pastDone } = get();
    void saveKey(KEY_LEADERBOARD, 1, { schemaVersion: 1, queue, pastPending, pastDone });
  };

  // Reflect a delivery result on the win sheet, but only if that win is still
  // the one on screen — the player may have moved on to another game.
  const setStatusFor = (game: { seed: string; drawCount: number }, status: WinStatus) => {
    const { current } = get();
    if (current && sameDeal(current.game, game)) set({ current: { ...current, status } });
  };

  const enqueue = (submission: ScoreSubmission) => {
    const queue = [...get().queue.filter((q) => !sameDeal(q, submission)), submission].slice(
      -MAX_QUEUE,
    );
    set({ queue });
    persist();
  };

  const send = async (submission: ScoreSubmission) => {
    setStatusFor(submission, { kind: 'sending' });
    const outcome = await submitScore(submission);
    if (outcome.kind === 'retry') enqueue(submission);
    setStatusFor(submission, statusFor(outcome));
  };

  // Delivers the player's best past wins, once. Like everything else here it
  // only ever runs for a player who is taking part ('on', with a name) — so
  // nothing leaves before the publish prompt has been answered.
  const sendPastWins = async () => {
    if (sendingPastWins || LEADERBOARD_URL === null || get().pastDone) return;
    const { leaderboard, playerName } = useSettingsStore.getState().settings;
    const name = normalizeName(playerName);
    if (leaderboard !== 'on' || name === null) return;
    sendingPastWins = true;
    try {
      let pending = get().pastPending;
      if (pending === null) {
        // Pick the batch once and keep it, so a retry sends the same games.
        // The win on screen and the queued ones are going in verified.
        const { current, queue } = get();
        const skip = current ? [current.game, ...queue] : queue;
        pending = selectPastWins(useStatsStore.getState().stats.games, skip);
        set({ pastPending: pending });
      }
      if (pending.length > 0 && (await submitPastWins(name, pending)) === 'retry') {
        persist();
        return;
      }
      set({ pastPending: null, pastDone: true });
      persist();
    } finally {
      sendingPastWins = false;
    }
  };

  return {
    current: null,
    queue: [],
    pastPending: null,
    pastDone: false,

    offerWin: (game) => {
      if (LEADERBOARD_URL === null || game === null || game.moves === null) {
        set({ current: null });
        return;
      }
      const won: WonGame = { ...game, moves: game.moves };
      const { leaderboard, playerName } = useSettingsStore.getState().settings;
      if (leaderboard === 'off') {
        set({ current: null });
        return;
      }
      const name = normalizeName(playerName);
      if (leaderboard === 'ask' || name === null) {
        set({ current: { game: won, status: { kind: 'prompt' } } });
        return;
      }
      set({ current: { game: won, status: { kind: 'sending' } } });
      void send({ ...won, name });
      void sendPastWins();
    },

    publish: (rawName) => {
      const name = normalizeName(rawName);
      const { current } = get();
      if (name === null || current === null) return false;
      useSettingsStore.getState().update({ leaderboard: 'on', playerName: name });
      void send({ ...current.game, name });
      void sendPastWins();
      return true;
    },

    decline: () => {
      useSettingsStore.getState().update({ leaderboard: 'off' });
      set({ current: null });
    },

    flushQueue: async () => {
      if (flushing || LEADERBOARD_URL === null) return;
      flushing = true;
      let reachable = true;
      try {
        // Oldest first; stop at the first one that still can't be delivered so
        // an outage costs one request, not one per queued game.
        for (;;) {
          const next = get().queue[0];
          if (next === undefined) break;
          const outcome = await submitScore(next);
          if (outcome.kind === 'retry') {
            reachable = false;
            break;
          }
          const queue = get().queue.filter((q) => !sameDeal(q, next));
          set({ queue });
          persist();
          setStatusFor(next, statusFor(outcome));
        }
      } finally {
        flushing = false;
      }
      if (reachable) await sendPastWins();
    },

    hydrate: (stored) => set(stored),
  };
});

// The persisted queue is untrusted like every other stored blob: rebuild each
// entry from validated fields and drop anything that doesn't hold up.
export const sanitizeQueue = (raw: unknown): ScoreSubmission[] => {
  if (typeof raw !== 'object' || raw === null) return [];
  const list = (raw as Record<string, unknown>).queue;
  if (!Array.isArray(list)) return [];
  const out: ScoreSubmission[] = [];
  for (const entry of list) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { seed, drawCount, name, durationSec, moves } = entry as Record<string, unknown>;
    if (typeof seed !== 'string' || seed.length === 0 || seed.length > MAX_SEED_LENGTH) continue;
    if (drawCount !== 1 && drawCount !== 3) continue;
    const cleanName = normalizeName(name);
    if (cleanName === null) continue;
    if (typeof durationSec !== 'number' || !Number.isInteger(durationSec) || durationSec < 0) {
      continue;
    }
    const cleanMoves = parseMoveLog(moves);
    if (cleanMoves === null || cleanMoves.length === 0) continue;
    out.push({ seed, drawCount, name: cleanName, durationSec, moves: cleanMoves });
  }
  return out.slice(-MAX_QUEUE);
};

// Same for the past-wins import state. Anything unreadable falls back to "not
// started", which at worst picks the batch again — the server ignores deals
// it already holds.
export const sanitizePastWins = (
  raw: unknown,
  nowMs: number = Date.now(),
): Pick<Stored, 'pastPending' | 'pastDone'> => {
  const notStarted = { pastPending: null, pastDone: false };
  if (typeof raw !== 'object' || raw === null) return notStarted;
  const { pastPending, pastDone } = raw as Record<string, unknown>;
  if (pastDone === true) return { pastPending: null, pastDone: true };
  if (!Array.isArray(pastPending)) return notStarted;
  const wins: PastWin[] = [];
  for (const entry of pastPending.slice(0, MAX_PAST_WINS)) {
    const win = parsePastWin(entry, nowMs);
    if (win) wins.push(win);
  }
  return { pastPending: wins, pastDone: false };
};

let listening = false;

// Boot-time wiring: restore the pending work, try to deliver it, and try
// again whenever the device comes back online. A no-op when the feature is off.
export const hydrateLeaderboardFromStorage = async (): Promise<void> => {
  if (LEADERBOARD_URL === null) return;
  const store = useLeaderboardStore.getState();
  const stored = await loadKey<unknown>(KEY_LEADERBOARD);
  store.hydrate({ queue: sanitizeQueue(stored), ...sanitizePastWins(stored) });
  if (!listening && typeof window !== 'undefined') {
    listening = true;
    window.addEventListener('online', () => void useLeaderboardStore.getState().flushQueue());
  }
  void store.flushQueue();
};
