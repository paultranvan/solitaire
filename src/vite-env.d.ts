/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Base URL of the leaderboard worker. Unset = leaderboard feature off.
  readonly VITE_LEADERBOARD_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
