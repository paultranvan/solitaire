// Typed string dictionary for the two supported locales. The English column
// is the source of truth: TypeScript enforces that French has every key.
// Keep keys flat and namespaced by component so the call sites read well.

export type Lang = 'en' | 'fr';

const en = {
  'topbar.time': 'time',
  'topbar.moves': 'moves',
  'topbar.undo': 'undo',
  'topbar.hint': 'hint',
  'topbar.menu': 'menu',

  'stock.draw': 'draw',
  'stock.recycle': 'recycle',

  'sheet.close': 'close',

  'menu.title': 'Menu',
  'menu.newGame': 'New Game',
  'menu.restart': 'Restart',

  'stats.title': 'Statistics',
  'stats.wins': 'Wins',
  'stats.winRate': 'Win rate',
  'stats.streak': 'Streak',
  'stats.best': 'Best',
  'stats.draw': 'Draw {n}',
  'stats.played': 'Played',
  'stats.won': 'Won',
  'stats.bestScore': 'Best score',
  'stats.bestTime': 'Best time',
  'stats.minMoves': 'Min moves',
  'stats.totalTime': 'Total time at table',
  'stats.resetButton': 'Reset stats…',
  'stats.resetPrompt': 'Reset all statistics?',
  'stats.resetYes': 'Yes, reset',
  'stats.resetNo': 'Cancel',

  'settings.title': 'Settings',
  'settings.drawCount': 'Draw count',
  'settings.drawCountHint': 'next game',
  'settings.layout': 'Layout',
  'settings.rightHanded': 'Right-handed',
  'settings.leftHanded': 'Left-handed',
  'settings.rightHandedTitle': 'Stock on the left, foundations on the right',
  'settings.leftHandedTitle': 'Stock on the right, foundations on the left',
  'settings.sound': 'Sound effects',
  'settings.haptics': 'Haptic feedback',
  'settings.animations': 'Animations',
  'settings.requireWinnable': 'Solvable deals only',
  'settings.language': 'Language',

  'win.title': 'You won!',
  'win.heading': 'Congratulations',
  'win.subtitle': 'You cleared the board.',
  'win.score': 'Score',
  'win.newBest': 'New best!',
  'win.best': 'Best',
  'win.time': 'Time',
  'win.moves': 'Moves',
  'win.draw': 'Draw',
  'win.playAgain': 'Play again',
  'win.close': 'Close',

  'autoComplete.title': 'Well played!',
  'autoComplete.heading': 'You’ve almost won 🎉',
  'autoComplete.subtitle': 'Shall we lay down the rest of the cards?',
  'autoComplete.accept': 'Finish for me ✅',
  'autoComplete.decline': 'Let me enjoy it ➡️',

  'board.shuffling': 'Finding a solvable deal…',

  // Coarse duration suffixes (formatDuration). French stays short to fit the
  // same compact slot; "min" is preferred over "m" because "m" reads as
  // metres in French stat contexts.
  'duration.seconds': '{n}s',
  'duration.minutes': '{n}m',
  'duration.hoursMinutes': '{h}h {m}m',
} as const;

export type StringKey = keyof typeof en;

const fr: Record<StringKey, string> = {
  'topbar.time': 'temps',
  'topbar.moves': 'coups',
  'topbar.undo': 'annuler',
  'topbar.hint': 'indice',
  'topbar.menu': 'menu',

  'stock.draw': 'piocher',
  'stock.recycle': 'recycler',

  'sheet.close': 'fermer',

  'menu.title': 'Menu',
  'menu.newGame': 'Nouvelle partie',
  'menu.restart': 'Recommencer',

  'stats.title': 'Statistiques',
  'stats.wins': 'Victoires',
  'stats.winRate': 'Taux de victoire',
  'stats.streak': 'Série',
  'stats.best': 'Record',
  'stats.draw': 'Pioche {n}',
  'stats.played': 'Parties',
  'stats.won': 'Gagnées',
  'stats.bestScore': 'Meilleur score',
  'stats.bestTime': 'Meilleur temps',
  'stats.minMoves': 'Coups min.',
  'stats.totalTime': 'Temps total de jeu',
  'stats.resetButton': 'Réinitialiser…',
  'stats.resetPrompt': 'Tout réinitialiser ?',
  'stats.resetYes': 'Oui, réinitialiser',
  'stats.resetNo': 'Annuler',

  'settings.title': 'Paramètres',
  'settings.drawCount': 'Cartes par pioche',
  'settings.drawCountHint': 'prochaine partie',
  'settings.layout': 'Disposition',
  'settings.rightHanded': 'Droitier',
  'settings.leftHanded': 'Gaucher',
  'settings.rightHandedTitle': 'Pioche à gauche, fondations à droite',
  'settings.leftHandedTitle': 'Pioche à droite, fondations à gauche',
  'settings.sound': 'Effets sonores',
  'settings.haptics': 'Retour haptique',
  'settings.animations': 'Animations',
  'settings.requireWinnable': 'Parties gagnables uniquement',
  'settings.language': 'Langue',

  'win.title': 'Gagné !',
  'win.heading': 'Félicitations',
  'win.subtitle': 'Vous avez vidé le plateau.',
  'win.score': 'Score',
  'win.newBest': 'Nouveau record !',
  'win.best': 'Record',
  'win.time': 'Temps',
  'win.moves': 'Coups',
  'win.draw': 'Pioche',
  'win.playAgain': 'Rejouer',
  'win.close': 'Fermer',

  'autoComplete.title': 'Bien joué !',
  'autoComplete.heading': 'C’est presque gagné 🎉',
  'autoComplete.subtitle': 'On pose le reste des cartes ?',
  'autoComplete.accept': 'Termine pour moi ✅',
  'autoComplete.decline': 'Laisse-moi profiter ➡️',

  'board.shuffling': 'Recherche d’une donne gagnable…',

  'duration.seconds': '{n} s',
  'duration.minutes': '{n} min',
  'duration.hoursMinutes': '{h} h {m} min',
};

export const STRINGS: Record<Lang, Record<StringKey, string>> = { en, fr };

export type TParams = Record<string, string | number>;

const interpolate = (template: string, params?: TParams): string => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    params[k] === undefined ? `{${k}}` : String(params[k]),
  );
};

export const translate = (lang: Lang, key: StringKey, params?: TParams): string =>
  interpolate(STRINGS[lang][key] ?? STRINGS.en[key] ?? key, params);

// First-run detection: only used as the default value of the language
// setting. Once the user picks a language explicitly, the persisted choice
// wins over navigator.language.
export const detectInitialLang = (): Lang => {
  if (typeof navigator === 'undefined') return 'en';
  const tag = (navigator.language ?? '').toLowerCase();
  return tag.startsWith('fr') ? 'fr' : 'en';
};
