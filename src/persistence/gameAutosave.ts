import { useEffect, useRef } from 'react';
import { Card, cardId, RANKS, Rank, Suit, SUITS } from '@/game/card';
import { GameState } from '@/game/state';
import { isWon } from '@/game/rules';
import { KEY_GAME, loadKey, removeKey, saveKey } from './db';

const SAVE_DEBOUNCE_MS = 250;

// Autosave doesn't persist history — undo doesn't survive reloads, and
// keeping it would write up to 200 prior snapshots on every move.
type SavedGame = Omit<GameState, 'history'>;

const stripHistory = (state: GameState): SavedGame => {
  const { history: _h, ...rest } = state;
  return rest;
};

export const useGameAutosave = (state: GameState): void => {
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);

    if (isWon(state)) {
      // Game complete — clear the in-progress save.
      removeKey(KEY_GAME);
      return;
    }

    timer.current = window.setTimeout(() => {
      saveKey(KEY_GAME, state.schemaVersion, stripHistory(state));
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [state]);
};

const TABLEAU_COLUMNS = 7;
const FOUNDATION_PILES = 4;
const DECK_SIZE = 52;
const MAX_SEED_LENGTH = 128;

const isCounter = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0;

// Copies a pile out of untrusted storage, or returns null if any entry isn't a
// real card. `seen` collects ids across piles to catch duplicates.
const readPile = (raw: unknown, seen: Set<string>): Card[] | null => {
  if (!Array.isArray(raw)) return null;
  const pile: Card[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) return null;
    const { id, suit, rank, faceUp } = entry as Record<string, unknown>;
    if (!SUITS.includes(suit as Suit) || !RANKS.includes(rank as Rank)) return null;
    if (id !== cardId(suit as Suit, rank as Rank) || typeof faceUp !== 'boolean') return null;
    if (seen.has(id)) return null;
    seen.add(id);
    pile.push({ id, suit: suit as Suit, rank: rank as Rank, faceUp });
  }
  return pile;
};

const readPiles = (raw: unknown, count: number, seen: Set<string>): Card[][] | null => {
  if (!Array.isArray(raw) || raw.length !== count) return null;
  const piles: Card[][] = [];
  for (const p of raw) {
    const pile = readPile(p, seen);
    if (!pile) return null;
    piles.push(pile);
  }
  return piles;
};

// Validates whatever IndexedDB handed back as a resumable game and rebuilds it
// from known fields only. The stored blob is untrusted — it can be stale,
// hand-edited, or written by another app sharing the origin — and a malformed
// one would otherwise crash the board on every launch, since it is reloaded
// each boot. Returns null (→ fresh deal) unless the shape is right and the
// piles hold exactly one full deck.
export const parseSavedGame = (raw: unknown): GameState | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (o.schemaVersion !== 1) return null;
  if (o.drawCount !== 1 && o.drawCount !== 3) return null;
  if (typeof o.seed !== 'string' || o.seed.length > MAX_SEED_LENGTH) return null;
  if (!isCounter(o.startedAt) || !isCounter(o.movesMade) || !isCounter(o.redealCount)) {
    return null;
  }

  const seen = new Set<string>();
  const tableau = readPiles(o.tableau, TABLEAU_COLUMNS, seen);
  const foundations = readPiles(o.foundations, FOUNDATION_PILES, seen);
  const stock = readPile(o.stock, seen);
  const talon = readPile(o.talon, seen);
  if (!tableau || !foundations || !stock || !talon || seen.size !== DECK_SIZE) return null;

  return {
    schemaVersion: 1,
    tableau,
    foundations,
    stock,
    talon,
    drawCount: o.drawCount,
    startedAt: o.startedAt,
    // activeMs was added after launch; pre-migration saves have no field. Default
    // to 0 (player loses already-elapsed time on a resumed deal — acceptable
    // tradeoff vs. inheriting an inflated wall-clock duration).
    activeMs: isCounter(o.activeMs) ? o.activeMs : 0,
    movesMade: o.movesMade,
    redealCount: o.redealCount,
    // undosUsed / hintsUsed were added later — default for pre-migration saves.
    undosUsed: isCounter(o.undosUsed) ? o.undosUsed : 0,
    hintsUsed: isCounter(o.hintsUsed) ? o.hintsUsed : 0,
    seed: o.seed,
    history: [],
  };
};

export const loadSavedGame = async (): Promise<GameState | null> => {
  const restored = parseSavedGame(await loadKey<unknown>(KEY_GAME));
  if (!restored) return null;
  // Belt-and-braces: the autosave clears on win, but defend in case a stale
  // won state survives (downgrade, manual IDB write, etc.).
  if (isWon(restored)) return null;
  return restored;
};
