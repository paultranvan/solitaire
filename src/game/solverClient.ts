import { randomSeed } from './state';
import SolverWorker from './solver.worker.ts?worker';

// Lazy singleton: spin the worker up on first use, keep it alive for the
// lifetime of the tab so subsequent reshuffles don't pay the worker-boot cost.
let worker: Worker | null = null;
let nextId = 1;

const getWorker = (): Worker => {
  if (worker === null) worker = new SolverWorker();
  return worker;
};

type ProveStatus = 'solvable' | 'unsolvable' | 'unknown';

export type ProveResult = { seed: string; status: ProveStatus };

export const proveSolvable = (
  req: { seed: string; drawCount: 1 | 3; deadlineMs: number; maxNodes?: number },
  signal?: AbortSignal,
): Promise<ProveResult> => {
  const id = nextId++;
  const w = getWorker();
  return new Promise<ProveResult>((resolve, reject) => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.id !== id) return;
      w.removeEventListener('message', onMessage);
      if (signal) signal.removeEventListener('abort', onAbort);
      resolve({ seed: e.data.seed, status: e.data.status });
    };
    const onAbort = () => {
      w.removeEventListener('message', onMessage);
      // We can't actually cancel a single solve in flight (the worker is
      // running synchronous JS), but the caller will ignore this result by
      // virtue of the rejected promise. Worst case: ~deadlineMs of wasted
      // background CPU before the worker frees up.
      reject(new DOMException('Aborted', 'AbortError'));
    };
    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }
    w.addEventListener('message', onMessage);
    w.postMessage({ id, ...req });
  });
};

// Try up to `maxAttempts` random seeds, returning the first that proves
// solvable within `deadlineMs` per attempt. If every attempt is unknown or
// unsolvable, returns the last seed tried alongside that final status — the
// caller can decide whether to use it anyway (we do, so the new-game button
// always produces a deal even on pathological budgets).
export const findWinnableSeed = async (
  opts: { drawCount: 1 | 3; deadlineMs: number; maxAttempts: number },
  signal?: AbortSignal,
): Promise<ProveResult> => {
  let last: ProveResult = { seed: randomSeed(), status: 'unknown' };
  for (let i = 0; i < opts.maxAttempts; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const seed = randomSeed();
    last = await proveSolvable(
      { seed, drawCount: opts.drawCount, deadlineMs: opts.deadlineMs },
      signal,
    );
    if (last.status === 'solvable') return last;
  }
  return last;
};
