// Shape of a deal identifier the leaderboard accepts. Seeds the app generates
// are short base-36 strings; hyphens are allowed for named deals. Imported by
// both the app and the worker (worker/), so this file stays dependency-free.
export const SEED_PATTERN = /^[0-9a-z-]{1,64}$/;
