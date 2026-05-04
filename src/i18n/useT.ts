import { useMemo } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { Lang, StringKey, TParams, translate } from './strings';

const numberFormatters = new Map<Lang, Intl.NumberFormat>();

const nfFor = (lang: Lang): Intl.NumberFormat => {
  let f = numberFormatters.get(lang);
  if (!f) {
    f = new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US');
    numberFormatters.set(lang, f);
  }
  return f;
};

export type Translator = {
  t: (key: StringKey, params?: TParams) => string;
  formatNumber: (n: number) => string;
  formatBestTime: (sec: number | null) => string;
  formatDuration: (sec: number) => string;
  lang: Lang;
};

const formatMMSS = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
};

const buildTranslator = (lang: Lang): Translator => {
  const t: Translator['t'] = (key, params) => translate(lang, key, params);
  const formatNumber: Translator['formatNumber'] = (n) => nfFor(lang).format(n);
  const formatBestTime: Translator['formatBestTime'] = (sec) =>
    sec === null ? '—' : formatMMSS(sec);
  const formatDuration: Translator['formatDuration'] = (sec) => {
    if (sec < 60) return t('duration.seconds', { n: sec });
    const minutes = Math.floor(sec / 60);
    if (minutes < 60) return t('duration.minutes', { n: minutes });
    const h = Math.floor(minutes / 60);
    return t('duration.hoursMinutes', { h, m: minutes % 60 });
  };
  return { t, formatNumber, formatBestTime, formatDuration, lang };
};

export const useT = (): Translator => {
  const lang = useSettingsStore((s) => s.settings.language);
  return useMemo(() => buildTranslator(lang), [lang]);
};
