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

  it('hydrate() ignores values it would never have written and drops unknown keys', () => {
    const tampered = {
      schemaVersion: 1,
      drawCount: 7,
      sound: 'yes',
      handedness: 'up',
      cardBack: 'navy x-injected',
      language: 'zz',
      requireWinnable: true,
      extra: { nested: true },
    } as unknown as Settings;
    useSettingsStore.getState().hydrate(tampered);
    // Valid field kept, everything else back to its default.
    expect(useSettingsStore.getState().settings).toEqual({
      ...defaultSettings(),
      requireWinnable: true,
    });
  });

  it('hydrate() survives a payload that is not an object', () => {
    useSettingsStore.getState().hydrate('nope' as unknown as Settings);
    expect(useSettingsStore.getState().settings).toEqual(defaultSettings());
  });
});
