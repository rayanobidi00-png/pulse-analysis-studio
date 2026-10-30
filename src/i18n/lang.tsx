import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'ar';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Pick the string for the current language. */
  L: (en: string, ar: string) => string;
  dir: 'ltr' | 'rtl';
}

const Ctx = createContext<LangCtx | null>(null);

function initialLang(): Lang {
  try {
    return localStorage.getItem('pulse-lang') === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = lang === 'ar' ? 'PULSE | استوديو التحليل' : 'PULSE Analysis Studio';
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('pulse-lang', l);
    } catch {
      /* storage unavailable: keep the choice for this visit only */
    }
  }, []);
  const value = useMemo<LangCtx>(
    () => ({ lang, setLang, L: (en, ar) => (lang === 'ar' ? ar : en), dir: lang === 'ar' ? 'rtl' : 'ltr' }),
    [lang, setLang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useLang outside LangProvider');
  return c;
}

/** Inline bilingual text: <T en="Import" ar="استيراد" />. */
export function T({ en, ar }: { en: string; ar: string }) {
  const { L } = useLang();
  return <>{L(en, ar)}</>;
}
