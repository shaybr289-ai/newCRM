import { create } from 'zustand';

const STORAGE_KEY = '_biz_lang';

function applyDirection(lang) {
  const dir = lang === 'en' ? 'ltr' : 'rtl';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : 'he');
  document.body.style.direction = dir;
  document.body.style.textAlign = lang === 'en' ? 'left' : 'right';
}

const useLangStore = create((set) => ({
  lang: localStorage.getItem(STORAGE_KEY) || 'he',

  setLang: (lang) => {
    localStorage.setItem(STORAGE_KEY, lang);
    applyDirection(lang);
    set({ lang });
  },

  initLang: () => {
    const lang = localStorage.getItem(STORAGE_KEY) || 'he';
    applyDirection(lang);
    set({ lang });
  },
}));

export default useLangStore;
