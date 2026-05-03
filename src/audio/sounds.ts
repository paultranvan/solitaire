// Web Audio synth-based SFX. Lightweight (no asset files), gated on settings.sound.

import { useSettingsStore } from '@/store/settingsStore';

let ctx: AudioContext | null = null;

const getCtx = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
};

const tone = (
  freq: number,
  durationMs: number,
  gain = 0.05,
  type: OscillatorType = 'sine',
  delayMs = 0,
) => {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delayMs / 1000;
  const t1 = t0 + durationMs / 1000;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t1);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t1 + 0.02);
};

const sweep = (from: number, to: number, durationMs: number, gain = 0.06) => {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime;
  const t1 = t0 + durationMs / 1000;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(from, t0);
  osc.frequency.exponentialRampToValueAtTime(to, t1);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t1);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t1 + 0.02);
};

export type Sfx = 'pickup' | 'dropValid' | 'dropInvalid' | 'foundation' | 'flip' | 'winCascade';

const enabled = (): boolean => useSettingsStore.getState().settings.sound;

export const play = (kind: Sfx): void => {
  if (!enabled()) return;
  switch (kind) {
    case 'pickup':
      tone(660, 60, 0.04, 'sine');
      break;
    case 'dropValid':
      tone(520, 50, 0.05, 'sine');
      tone(660, 70, 0.05, 'sine', 30);
      break;
    case 'dropInvalid':
      tone(180, 100, 0.05, 'square');
      break;
    case 'foundation':
      tone(660, 60, 0.05, 'sine');
      tone(880, 80, 0.05, 'sine', 50);
      break;
    case 'flip':
      tone(420, 40, 0.03, 'triangle');
      break;
    case 'winCascade': {
      // ascending C major scale, 80ms per note
      const notes = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
      notes.forEach((f, i) => tone(f, 100, 0.05, 'sine', i * 70));
      sweep(523.25, 1046.5, 320, 0.04);
      break;
    }
  }
};

/** Some browsers (Safari) require a user gesture before audio can play. */
export const primeAudioOnFirstGesture = (): void => {
  const handler = () => {
    const c = getCtx();
    if (c && c.state === 'suspended') c.resume();
    window.removeEventListener('pointerdown', handler);
    window.removeEventListener('keydown', handler);
  };
  window.addEventListener('pointerdown', handler, { once: false });
  window.addEventListener('keydown', handler, { once: false });
};
