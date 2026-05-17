import { Card, color, Suit } from './card';
import { Move } from './moves';
import { GameState } from './state';

// A bounded Klondike solver. DFS with a transposition table and forced
// safe-foundation auto-play before each branch. The caller supplies a
// `deadlineMs` and/or `maxNodes` budget; on exhaustion we return 'unknown'
// rather than continuing — the "winnable-only" feature treats unknown the
// same as unsolvable (reshuffle).
//
// Soundness rule: when `solve` returns 'solvable', the move list MUST drive
// the input state to a won state. Speed is best-effort. The TT may collapse
// states aggressively (we never reverse a foundation move), so very rare
// "Klondike-pathological wins that require un-foundationing" are missed —
// that's fine for this use case.

export type SolveResult =
  | { status: 'solvable'; moves: Move[] }
  | { status: 'unsolvable' }
  | { status: 'unknown' };

export type SolveOptions = {
  deadlineMs?: number;
  maxNodes?: number;
  now?: () => number;
};

const DEFAULT_MAX_NODES = 200_000;

type Mini = {
  tableau: Card[][];
  foundations: Card[][];
  stock: Card[];
  talon: Card[];
  drawCount: 1 | 3;
};

const fromState = (s: GameState): Mini => ({
  tableau: s.tableau.map((c) => c.slice()),
  foundations: s.foundations.map((p) => p.slice()),
  stock: s.stock.slice(),
  talon: s.talon.slice(),
  drawCount: s.drawCount,
});

const cloneMini = (m: Mini): Mini => ({
  tableau: m.tableau.map((c) => c.slice()),
  foundations: m.foundations.map((p) => p.slice()),
  stock: m.stock.slice(),
  talon: m.talon.slice(),
  drawCount: m.drawCount,
});

const isWonMini = (m: Mini): boolean => m.foundations.every((p) => p.length === 13);

const foundationFor = (m: Mini, card: Card): number | null => {
  for (let i = 0; i < 4; i++) {
    const p = m.foundations[i];
    const t = p[p.length - 1];
    if (t === undefined) {
      if (card.rank === 1) return i;
    } else if (t.suit === card.suit && t.rank === card.rank - 1) {
      return i;
    }
  }
  return null;
};

// A card is safe to send to the foundation when no future tableau move could
// ever need it as a target. Tableau placement requires rank-1 of the opposite
// color, so once both opposite-color cards of rank R-1 are on a foundation,
// nothing in play wants to land on this card. Aces and 2s are always safe.
const isSafeToFoundation = (m: Mini, card: Card): boolean => {
  if (card.rank <= 2) return true;
  const oppSuits: Suit[] = color(card.suit) === 'red' ? ['s', 'c'] : ['h', 'd'];
  const need = card.rank - 1;
  for (const suit of oppSuits) {
    let ok = false;
    for (const p of m.foundations) {
      const t = p[p.length - 1];
      if (t && t.suit === suit && t.rank >= need) {
        ok = true;
        break;
      }
    }
    if (!ok) return false;
  }
  return true;
};

const flipTopIfNeeded = (col: Card[]): void => {
  const t = col[col.length - 1];
  if (t && !t.faceUp) col[col.length - 1] = { ...t, faceUp: true };
};

// Apply every safe-foundation move available; loop to fixpoint because each
// move may unlock another. Returns the moves applied (in order) so the
// caller can append them to its solution path.
const autoFoundation = (m: Mini): Move[] => {
  const out: Move[] = [];
  while (true) {
    let progressed = false;
    for (let c = 0; c < m.tableau.length; c++) {
      const col = m.tableau[c];
      const t = col[col.length - 1];
      if (!t || !t.faceUp) continue;
      if (!isSafeToFoundation(m, t)) continue;
      const fIdx = foundationFor(m, t);
      if (fIdx === null) continue;
      col.pop();
      m.foundations[fIdx].push(t);
      flipTopIfNeeded(col);
      out.push({ kind: 'tableauToFoundation', from: c, foundationIdx: fIdx });
      progressed = true;
    }
    const tt = m.talon[m.talon.length - 1];
    if (tt && isSafeToFoundation(m, tt)) {
      const fIdx = foundationFor(m, tt);
      if (fIdx !== null) {
        m.talon.pop();
        m.foundations[fIdx].push(tt);
        out.push({ kind: 'talonToFoundation', foundationIdx: fIdx });
        progressed = true;
      }
    }
    if (!progressed) break;
  }
  return out;
};

const generateMoves = (m: Mini): Move[] => {
  const moves: Move[] = [];
  // Tableau-to-tableau: every face-up suffix of every column to every legal
  // destination. (The existing rules guarantee tableau face-up runs are
  // already valid alt-color descending stacks — autoFlipTop only flips one
  // card at a time after a move out of the column.)
  for (let from = 0; from < m.tableau.length; from++) {
    const col = m.tableau[from];
    if (col.length === 0) continue;
    let firstFaceUp = -1;
    for (let i = 0; i < col.length; i++) {
      if (col[i].faceUp) {
        firstFaceUp = i;
        break;
      }
    }
    if (firstFaceUp === -1) continue;

    for (let i = firstFaceUp; i < col.length; i++) {
      const moving = col[i];
      for (let to = 0; to < m.tableau.length; to++) {
        if (to === from) continue;
        const dst = m.tableau[to];
        const dstTop = dst[dst.length - 1];
        if (dstTop === undefined) {
          if (moving.rank !== 13) continue;
          // Pointless: shifting a King that already heads its column to an
          // empty column reveals nothing. (Catches both the no-face-down case
          // and the case where the K sits on a face-down stack — the latter
          // would still flip a card, so allow it.)
          if (i === 0) continue;
        } else {
          if (!dstTop.faceUp) continue;
          if (color(moving.suit) === color(dstTop.suit)) continue;
          if (moving.rank !== dstTop.rank - 1) continue;
        }
        moves.push({ kind: 'tableauToTableau', from, cardIndex: i, to });
      }
    }
  }
  // Talon-to-tableau.
  const tt = m.talon[m.talon.length - 1];
  if (tt) {
    for (let to = 0; to < m.tableau.length; to++) {
      const dst = m.tableau[to];
      const dstTop = dst[dst.length - 1];
      if (dstTop === undefined) {
        if (tt.rank !== 13) continue;
      } else {
        if (!dstTop.faceUp) continue;
        if (color(tt.suit) === color(dstTop.suit)) continue;
        if (tt.rank !== dstTop.rank - 1) continue;
      }
      moves.push({ kind: 'talonToTableau', to });
    }
    // Talon to foundation (auto-foundation didn't take it — unsafe).
    const fIdx = foundationFor(m, tt);
    if (fIdx !== null) moves.push({ kind: 'talonToFoundation', foundationIdx: fIdx });
  }
  // Tableau-to-foundation (unsafe — auto-foundation didn't take it).
  for (let from = 0; from < m.tableau.length; from++) {
    const col = m.tableau[from];
    const t = col[col.length - 1];
    if (!t || !t.faceUp) continue;
    const fIdx = foundationFor(m, t);
    if (fIdx === null) continue;
    moves.push({ kind: 'tableauToFoundation', from, foundationIdx: fIdx });
  }
  // Stock cycling. Try non-stock moves first (above) so the solver only
  // touches the stock when nothing else helps.
  if (m.stock.length > 0) {
    moves.push({ kind: 'draw' });
  } else if (m.talon.length > 0) {
    moves.push({ kind: 'recycle' });
  }
  return moves;
};

const applyInPlace = (m: Mini, move: Move): void => {
  switch (move.kind) {
    case 'draw': {
      const count = Math.min(move.count ?? m.drawCount, m.stock.length);
      const drawn = m.stock.splice(m.stock.length - count, count);
      for (let i = drawn.length - 1; i >= 0; i--) {
        m.talon.push({ ...drawn[i], faceUp: true });
      }
      break;
    }
    case 'recycle': {
      m.stock = m.talon
        .slice()
        .reverse()
        .map((c) => ({ ...c, faceUp: false }));
      m.talon = [];
      break;
    }
    case 'tableauToTableau': {
      const src = m.tableau[move.from];
      const stack = src.splice(move.cardIndex, src.length - move.cardIndex);
      m.tableau[move.to].push(...stack);
      flipTopIfNeeded(m.tableau[move.from]);
      break;
    }
    case 'tableauToFoundation': {
      const src = m.tableau[move.from];
      const card = src.pop()!;
      m.foundations[move.foundationIdx].push(card);
      flipTopIfNeeded(src);
      break;
    }
    case 'talonToTableau': {
      const card = m.talon.pop()!;
      m.tableau[move.to].push(card);
      break;
    }
    case 'talonToFoundation': {
      const card = m.talon.pop()!;
      m.foundations[move.foundationIdx].push(card);
      break;
    }
    case 'foundationToTableau': {
      // Solver never generates these (they only ever loosen progress) but the
      // Move union includes the kind, so support it for completeness.
      const card = m.foundations[move.foundationIdx].pop()!;
      m.tableau[move.to].push(card);
      break;
    }
  }
};

// Canonical state key. Tableau columns are interchangeable as a multiset
// (any K can fill any empty column); foundations are too (any suit goes on
// any pile). Sort both. Stock and talon order matters — preserve it.
const keyMini = (m: Mini): string => {
  const cols = m.tableau
    .map((c) => c.map((card) => `${card.id}${card.faceUp ? '+' : '-'}`).join(','))
    .slice()
    .sort()
    .join('|');
  const fnd = m.foundations
    .map((p) => (p.length === 0 ? '' : p[p.length - 1].id))
    .slice()
    .sort()
    .join(',');
  const stk = m.stock.map((c) => c.id).join(',');
  const tln = m.talon.map((c) => c.id).join(',');
  return `T${cols};F${fnd};S${stk};L${tln}`;
};

export function solve(initial: GameState, opts: SolveOptions = {}): SolveResult {
  const now = opts.now ?? (() => performance.now());
  const deadlineAt = now() + (opts.deadlineMs ?? Number.POSITIVE_INFINITY);
  const maxNodes = opts.maxNodes ?? DEFAULT_MAX_NODES;
  const visited = new Set<string>();
  const path: Move[] = [];
  let nodes = 0;
  let timedOut = false;

  // dfs returns 'solvable' (path holds the solution at return), 'unsolvable'
  // (this subtree has no win), or 'unknown' (budget exhausted; sibling and
  // parent searches should bail too).
  const dfs = (m: Mini): 'solvable' | 'unsolvable' | 'unknown' => {
    nodes++;
    if ((nodes & 1023) === 0 && (now() > deadlineAt || nodes > maxNodes)) {
      timedOut = true;
      return 'unknown';
    }

    const autoStart = path.length;
    const autos = autoFoundation(m);
    for (const a of autos) path.push(a);

    if (isWonMini(m)) return 'solvable';

    const key = keyMini(m);
    if (visited.has(key)) {
      path.length = autoStart;
      return 'unsolvable';
    }
    visited.add(key);

    const moves = generateMoves(m);
    for (const mv of moves) {
      const next = cloneMini(m);
      applyInPlace(next, mv);
      path.push(mv);
      const r = dfs(next);
      if (r === 'solvable') return 'solvable';
      path.pop();
      if (r === 'unknown') {
        path.length = autoStart;
        return 'unknown';
      }
    }
    path.length = autoStart;
    return 'unsolvable';
  };

  const r = dfs(fromState(initial));
  if (r === 'solvable') return { status: 'solvable', moves: path.slice() };
  if (timedOut || r === 'unknown') return { status: 'unknown' };
  return { status: 'unsolvable' };
}
