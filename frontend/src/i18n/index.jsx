import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import en from './en';
import uz from './uz';

const dictionaries = { uz, en };
export const LANGUAGES = [
  { code: 'uz', label: 'Oʻzbekcha', short: 'UZ' },
  { code: 'en', label: 'English', short: 'EN' },
];

const I18nContext = createContext(null);

function read(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem('eschool.lang') || 'uz'; } catch { return 'uz'; }
  });

  const setLang = useCallback((code) => {
    setLangState(code);
    try { localStorage.setItem('eschool.lang', code); } catch { /* ignore */ }
    document.documentElement.lang = code;
  }, []);

  const t = useCallback(
    (key) => read(dictionaries[lang], key) ?? read(dictionaries.en, key) ?? key,
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
