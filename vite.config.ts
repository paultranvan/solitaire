import { configDefaults, defineConfig } from 'vitest/config';
import { loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Content-Security-Policy for the shipped bundle. The app is fully static:
// everything it needs (scripts, the solver worker, styles, the font) is served
// from its own origin, so the policy allows that and nothing else. If a
// script-injection bug ever slips in, the injected code can't run inline,
// can't pull code from elsewhere, and can't phone home — which matters most in
// the Capacitor shell, where the page can reach the native bridge.
//
// The one exception is the shared leaderboard: when the build is given
// VITE_LEADERBOARD_URL, that single origin is added to `connect-src` so the
// app can talk to its worker. Without it, no outbound request is possible.
//
// Delivered as a <meta> tag because neither GitHub Pages nor the Capacitor
// WebView lets us set response headers. Build-only: the dev server relies on
// an inline React-refresh preamble and a websocket that this would block.
// `style-src 'unsafe-inline'` is required by motion and React, which write
// inline style attributes; `data:` covers assets Vite inlines below its size
// threshold.
const contentSecurityPolicyFor = (leaderboardUrl: string | undefined): string => {
  const connect = ["'self'"];
  if (leaderboardUrl) {
    // new URL() throws on a malformed value — fail the build rather than ship
    // a policy that silently blocks (or mis-scopes) the leaderboard.
    const { protocol, origin } = new URL(leaderboardUrl);
    if (protocol !== 'https:' && protocol !== 'http:') {
      throw new Error(`VITE_LEADERBOARD_URL must be an http(s) URL, got "${leaderboardUrl}"`);
    }
    connect.push(origin);
  }
  return [
    "default-src 'self'",
    "script-src 'self'",
    "worker-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connect.join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');
};

const contentSecurityPolicy = (leaderboardUrl: string | undefined): Plugin => ({
  name: 'solitaire:content-security-policy',
  apply: 'build',
  transformIndexHtml: () => [
    {
      tag: 'meta',
      attrs: {
        'http-equiv': 'Content-Security-Policy',
        content: contentSecurityPolicyFor(leaderboardUrl),
      },
      injectTo: 'head-prepend',
    },
  ],
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, 'VITE_');
  return {
    base: './',
    plugins: [react(), contentSecurityPolicy(env.VITE_LEADERBOARD_URL?.trim() || undefined)],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: { host: true, port: 5173 },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test-setup.ts'],
      // Agent worktrees under .claude/ hold full copies of the repo (and their
      // own node_modules); don't collect their tests.
      exclude: [...configDefaults.exclude, '.claude/**'],
    },
  };
});
