#!/usr/bin/env node
// Rasterizes resources/*.svg into the PNGs that @capacitor/assets expects,
// then propagates the favicon assets into public/. The capacitor-assets
// invocation is added in a later task.

import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function rasterize(svgPath, outPath, width) {
  const svg = readFileSync(svgPath);
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: true, defaultFontFamily: 'serif' },
  })
    .render()
    .asPng();
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, png);
  console.log(`  rendered ${outPath} (${width}px)`);
}

const targets = [
  // Source-of-truth SVG → PNG that @capacitor/assets reads
  { svg: 'resources/icon.svg',            png: 'resources/icon.png',            width: 1024 },
  { svg: 'resources/icon-foreground.svg', png: 'resources/icon-foreground.png', width: 1024 },
  { svg: 'resources/icon-background.svg', png: 'resources/icon-background.png', width: 1024 },
  { svg: 'resources/splash.svg',          png: 'resources/splash.png',          width: 2732 },
  // Web favicon PNG fallbacks
  { svg: 'resources/icon.svg',            png: 'public/favicon-32.png',         width: 32 },
  { svg: 'resources/icon.svg',            png: 'public/favicon-16.png',         width: 16 },
];

console.log('Rasterizing SVG sources...');
for (const t of targets) {
  rasterize(resolve(root, t.svg), resolve(root, t.png), t.width);
}

// Vector favicon for the web build — copy the master SVG verbatim.
mkdirSync(resolve(root, 'public'), { recursive: true });
copyFileSync(resolve(root, 'resources/icon.svg'), resolve(root, 'public/favicon.svg'));
console.log('  copied public/favicon.svg');

console.log('Done.');
