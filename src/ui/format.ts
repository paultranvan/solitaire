// Formats a duration in seconds as MM:SS, zero-padding both fields.
export const formatMMSS = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
};
