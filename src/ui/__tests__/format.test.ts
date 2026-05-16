import { describe, expect, it } from 'vitest';
import { formatDMY, formatMMSS } from '../format';

describe('formatMMSS', () => {
  it('zero-pads minutes and seconds', () => {
    expect(formatMMSS(5)).toBe('00:05');
    expect(formatMMSS(192)).toBe('03:12');
  });
});

describe('formatDMY', () => {
  it('formats an epoch-ms timestamp as zero-padded DD/MM/YYYY', () => {
    const ms = new Date(2026, 4, 9, 12, 0, 0).getTime();
    expect(formatDMY(ms)).toBe('09/05/2026');
  });
});
