#!/usr/bin/env node
// Rasterizes resources/*.svg into the PNGs that @capacitor/assets expects,
// then propagates the favicon assets into public/. The capacitor-assets
// invocation is added in a later task.

import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

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

// If a Capacitor native shell exists, regenerate its icon/splash assets.
const hasIos = existsSync(resolve(root, 'ios'));
const hasAndroid = existsSync(resolve(root, 'android'));

if (hasIos || hasAndroid) {
  console.log(`Generating Capacitor assets (ios=${hasIos}, android=${hasAndroid})...`);
  const result = spawnSync(
    'npx',
    [
      'capacitor-assets',
      'generate',
      '--iconBackgroundColor', '#0f3818',
      '--iconBackgroundColorDark', '#0f3818',
      '--splashBackgroundColor', '#0f3818',
      '--splashBackgroundColorDark', '#0f3818',
    ],
    { stdio: 'inherit', cwd: root },
  );
  if (result.status !== 0) {
    console.error('capacitor-assets generate failed');
    process.exit(result.status ?? 1);
  }
}

if (hasAndroid) {
  /* capacitor-assets 3.x writes adaptive-icon foreground/background PNGs
     at the LEGACY launcher icon sizes (e.g. 192px at xxxhdpi). Android's
     adaptive icon spec wants them 3x larger — the visible 108dp safe area
     × density factor — so the Android 12+ Splash Screen API has enough
     pixels when it renders the icon at 192dp inside a 288dp circle on
     high-DPI screens. Re-rasterize the correct sizes over capacitor-assets'
     output. Sizes: 81/108/162/216/324/432 for ldpi…xxxhdpi. */
  console.log('Upscaling Android adaptive-icon mipmaps to spec sizes...');
  const adaptiveIconBuckets = [
    { dir: 'mipmap-ldpi',    size: 81 },
    { dir: 'mipmap-mdpi',    size: 108 },
    { dir: 'mipmap-hdpi',    size: 162 },
    { dir: 'mipmap-xhdpi',   size: 216 },
    { dir: 'mipmap-xxhdpi',  size: 324 },
    { dir: 'mipmap-xxxhdpi', size: 432 },
  ];
  for (const bucket of adaptiveIconBuckets) {
    const outDir = `android/app/src/main/res/${bucket.dir}`;
    rasterize(
      resolve(root, 'resources/icon-foreground.svg'),
      resolve(root, `${outDir}/ic_launcher_foreground.png`),
      bucket.size,
    );
    rasterize(
      resolve(root, 'resources/icon-background.svg'),
      resolve(root, `${outDir}/ic_launcher_background.png`),
      bucket.size,
    );
  }
}

if (!hasIos && !hasAndroid) {
  console.log('No ios/ or android/ found; skipping capacitor-assets.');
}

console.log('Done.');
