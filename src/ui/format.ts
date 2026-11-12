// Formats a duration in seconds as MM:SS, zero-padding both fields.
export const formatMMSS = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
};

// Win rate as a whole-percent string, or an em-dash when nothing's been played.
export const formatWinPct = (won: number, played: number): string =>
  played === 0 ? '—' : `${Math.round((won / played) * 100)}%`;

// "1st", "2nd", "3rd", "21st", "26th"… in English; "1re", "2e"… in French.
export const formatOrdinal = (n: number, lang: 'en' | 'fr'): string => {
  if (lang === 'fr') return n === 1 ? '1re' : `${n}e`;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
};

// Formats an epoch-ms timestamp as zero-padded DD/MM/YYYY (fixed for all locales).
export const formatDMY = (ms: number): string => {
  const d = new Date(ms);
  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};
