// Base URL of the leaderboard worker (worker/), injected at build time through
// VITE_LEADERBOARD_URL. When it is unset the whole feature is off: nothing is
// offered, shown or sent, and the build's Content-Security-Policy keeps
// blocking every outbound request.
const raw: unknown = import.meta.env.VITE_LEADERBOARD_URL;

export const LEADERBOARD_URL: string | null =
  typeof raw === 'string' && raw.trim() !== '' ? raw.trim().replace(/\/+$/, '') : null;
