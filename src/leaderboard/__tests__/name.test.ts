import { describe, expect, it } from 'vitest';
import { NAME_WORDS, normalizeName, suggestName } from '../name';

describe('normalizeName', () => {
  it.each([
    ['Renard Agile', 'Renard Agile'],
    ['  Zoé   la  Brave ', 'Zoé la Brave'],
    ["O'Neil_42", "O'Neil_42"],
    ['山田太郎', '山田太郎'],
    ['Ｆｕｌｌｗｉｄｔｈ', 'Fullwidth'],
  ])('accepts %j as %j', (raw, expected) => {
    expect(normalizeName(raw)).toBe(expected);
  });

  it.each([
    ['a non-string', 42],
    ['an empty name', '   '],
    ['a single character', 'A'],
    ['more than 20 characters', 'A'.repeat(21)],
    ['markup', '<b>bold</b>'],
    ['a control character', 'Bob\u0007by'],
    ['a zero-width character', 'Bob​by'],
    ['a bidi override', 'Bob‮by'],
    ['a leading separator', '-Bobby'],
    ['an emoji', 'Bobby \u{1f0a1}'],
  ])('rejects %s', (_label, raw) => {
    expect(normalizeName(raw)).toBeNull();
  });
});

describe('suggestName', () => {
  it.each(['en', 'fr'] as const)('every %s combination is an acceptable name', (lang) => {
    const { adjectives, animals } = NAME_WORDS[lang];
    for (let a = 0; a < adjectives.length; a++) {
      for (let n = 0; n < animals.length; n++) {
        // Drive the two picks deterministically: adjective first, then animal.
        const picks = [a / adjectives.length, n / animals.length];
        const name = suggestName(lang, () => picks.shift()!);
        expect(normalizeName(name)).toBe(name);
      }
    }
  });

  it('orders the words per language', () => {
    expect(suggestName('en', () => 0)).toBe('Swift Fox');
    expect(suggestName('fr', () => 0)).toBe('Renard Agile');
  });

  it('stays in range when the random source returns its upper bound', () => {
    expect(normalizeName(suggestName('en', () => 1))).not.toBeNull();
  });
});
