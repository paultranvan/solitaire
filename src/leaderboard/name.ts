// Display-name rules for the shared leaderboard, plus the generator behind the
// suggested name. Imported by both the app and the worker (worker/), so this
// file stays dependency-free: no `@/` alias, no DOM, no React.

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 20;

// Letters and digits from any script, plus a few separators. Excludes control,
// zero-width and bidi characters, which is what makes a name safe to show in a
// shared list.
const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} _.'-]*$/u;

// Canonical form of a display name, or null if it isn't acceptable: Unicode
// compatibility-normalized, whitespace collapsed, length counted in code points.
export const normalizeName = (raw: unknown): string | null => {
  if (typeof raw !== 'string' || raw.length > NAME_MAX_LENGTH * 8) return null;
  const name = raw.normalize('NFKC').replace(/\s+/g, ' ').trim();
  const length = [...name].length;
  if (length < NAME_MIN_LENGTH || length > NAME_MAX_LENGTH) return null;
  return NAME_PATTERN.test(name) ? name : null;
};

// English reads "Swift Fox"; French puts the adjective last ("Renard Agile").
// The French adjectives are all epicene (same form for both genders), so any
// of them agrees with any animal and the lists can be combined freely.
export const NAME_WORDS = {
  en: {
    adjectives: [
      'Swift',
      'Clever',
      'Brave',
      'Calm',
      'Lucky',
      'Bold',
      'Quiet',
      'Witty',
      'Jolly',
      'Nimble',
      'Patient',
      'Steady',
      'Daring',
      'Gentle',
      'Bright',
      'Sly',
    ],
    animals: [
      'Fox',
      'Otter',
      'Heron',
      'Lynx',
      'Badger',
      'Falcon',
      'Hare',
      'Owl',
      'Wolf',
      'Stag',
      'Marten',
      'Raven',
      'Seal',
      'Finch',
      'Beaver',
      'Crane',
    ],
  },
  fr: {
    adjectives: [
      'Agile',
      'Habile',
      'Rapide',
      'Calme',
      'Brave',
      'Sage',
      'Tranquille',
      'Fidèle',
      'Intrépide',
      'Tenace',
      'Modeste',
      'Lucide',
      'Espiègle',
      'Stoïque',
      'Solide',
      'Sincère',
    ],
    animals: [
      'Renard',
      'Loutre',
      'Héron',
      'Lynx',
      'Blaireau',
      'Faucon',
      'Lièvre',
      'Hibou',
      'Loup',
      'Cerf',
      'Martre',
      'Corbeau',
      'Phoque',
      'Pinson',
      'Castor',
      'Grue',
    ],
  },
} as const;

const pick = <T>(list: readonly T[], random: () => number): T =>
  list[Math.min(list.length - 1, Math.floor(random() * list.length))];

// A friendly default the player can keep, re-roll or overwrite. Always a name
// normalizeName accepts.
export const suggestName = (lang: 'en' | 'fr', random: () => number = Math.random): string => {
  const { adjectives, animals } = NAME_WORDS[lang];
  const adjective = pick(adjectives, random);
  const animal = pick(animals, random);
  return lang === 'fr' ? `${animal} ${adjective}` : `${adjective} ${animal}`;
};
