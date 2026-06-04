import useLangStore from '../store/langStore';
import { t as translate } from '../i18n/translations';

/**
 * Returns { t, lang, isRtl }
 * t(key) — translates the key to the current language
 */
export function useT() {
  const lang = useLangStore(s => s.lang);

  const t = (key) => translate(key, lang);

  return { t, lang, isRtl: lang !== 'en' };
}
