import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/* The card rank index (A/J/Q/K and digits) must render identically on web,
   iOS, and Android. A system serif stack does not: Android's WebView falls
   back to Noto Serif, whose bold `J`/`Q` carry large descenders, so face
   cards render visibly taller than number cards. The rank must therefore use
   a self-hosted font bundled with the app, not a platform serif. */

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const cardCss = read('../Card.css');
const themeCss = read('../theme.css');

describe('card rank font', () => {
  it('declares a self-hosted @font-face for the rank font', () => {
    expect(themeCss).toMatch(/@font-face\s*{[^}]*Tinos[^}]*}/s);
    expect(themeCss).toMatch(/\.woff2/);
  });

  it('renders the rank with the bundled font, not a platform serif', () => {
    const rule = cardCss.match(/\.card__rank\s*{[^}]*}/s);
    expect(rule, '.card__rank rule must exist').not.toBeNull();
    const family = rule![0].match(/font-family:\s*([^;]+);/);
    expect(family, '.card__rank must set font-family').not.toBeNull();
    // The bundled font must be the first (preferred) family.
    expect(family![1].trim()).toMatch(/^'Tinos'/);
  });
});
