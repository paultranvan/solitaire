import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Content-Security-Policy for the shipped bundle. The app is fully static and
// offline: everything it needs (scripts, the solver worker, styles, the font)
// is served from its own origin, so the policy allows that and nothing else.
// If a script-injection bug ever slips in, the injected code can't run inline,
// can't pull code from elsewhere, and can't phone home — which matters most in
// the Capacitor shell, where the page can reach the native bridge.
//
// Delivered as a <meta> tag because neither GitHub Pages nor the Capacitor
// WebView lets us set response headers. Build-only: the dev server relies on
// an inline React-refresh preamble and a websocket that this would block.
// `style-src 'unsafe-inline'` is required by motion and React, which write
// inline style attributes; `data:` covers assets Vite inlines below its size
// threshold.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "worker-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

const contentSecurityPolicy = (): Plugin => ({
  name: 'solitaire:content-security-policy',
  apply: 'build',
  transformIndexHtml: () => [
    {
      tag: 'meta',
      attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
      injectTo: 'head-prepend',
    },
  ],
});

export default defineConfig({
  base: './',
  plugins: [react(), contentSecurityPolicy()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { host: true, port: 5173 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
