// Formats a duration in seconds as MM:SS, zero-padding both fields.
export const formatMMSS = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
};

// Like formatMMSS but renders an em-dash for null (e.g. unrecorded best time).
export const formatBestTime = (sec: number | null): string =>
  sec === null ? '—' : formatMMSS(sec);

// Coarse "time at table" formatter — seconds, then minutes, then hours+minutes.
export const formatDuration = (sec: number): string => {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};
