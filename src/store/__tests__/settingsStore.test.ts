import { beforeEach, describe, expect, it } from 'vitest';
import { CARD_BACKS, defaultSettings, Settings, useSettingsStore } from '../settingsStore';

describe('settingsStore — cardBack', () => {
  beforeEach(() => {
    useSettingsStore.setState({ settings: defaultSettings() });
  });

  it('defaults cardBack to navy', () => {
    expect(defaultSettings().cardBack).toBe('navy');
  });

  it('CARD_BACKS lists the three designs in order', () => {
    expect(CARD_BACKS).toEqual(['navy', 'crimson', 'emerald']);
  });

  it('update() patches cardBack', () => {
    useSettingsStore.getState().update({ cardBack: 'crimson' });
    expect(useSettingsStore.getState().settings.cardBack).toBe('crimson');
  });

  it('hydrate() of a payload without cardBack falls back to navy', () => {
    const legacy = {
      schemaVersion: 1,
      drawCount: 1,
      sound: true,
      haptics: true,
      animations: true,
      handedness: 'right',
      requireWinnable: false,
      language: 'en',
    } as unknown as Settings;
    useSettingsStore.getState().hydrate(legacy);
    expect(useSettingsStore.getState().settings.cardBack).toBe('navy');
  });
});
