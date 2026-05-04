// Web Worker entry: runs the solver off the main thread so retry loops
// (deal → solve → reshuffle) don't freeze the UI. One request → one
// response, correlated by a numeric id supplied by the caller.
import { solve } from './solver';
import { createInitialState } from './state';

type ProveRequest = {
  id: number;
  seed: string;
  drawCount: 1 | 3;
  deadlineMs: number;
  maxNodes?: number;
};

type ProveResponse = {
  id: number;
  seed: string;
  status: 'solvable' | 'unsolvable' | 'unknown';
};

self.onmessage = (e: MessageEvent<ProveRequest>) => {
  const { id, seed, drawCount, deadlineMs, maxNodes } = e.data;
  const state = createInitialState({ drawCount, seed });
  const r = solve(state, { deadlineMs, maxNodes });
  const reply: ProveResponse = { id, seed, status: r.status };
  (self as unknown as { postMessage: (m: ProveResponse) => void }).postMessage(reply);
};
