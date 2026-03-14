import { createContext, useContext, useState } from 'react';

const LangContext = createContext({ lang: 'zh', t: (zh) => zh, setLang: () => {} });

/**
 * Language provider — wrap the app root with this.
 * Components call useLang() to get { lang, setLang, t }.
 * t(zh, en) returns zh when lang==='zh', en otherwise.
 */
export function LangProvider({ children }) {
  const [lang, setLang] = useState('zh');
  const t = (zh, en) => lang === 'zh' ? zh : (en ?? zh);
  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
