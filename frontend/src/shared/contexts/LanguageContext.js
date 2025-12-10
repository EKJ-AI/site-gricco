// src/shared/contexts/LanguageContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  // cultureId padrão: 'pt-BR'
  const [language, setLanguage] = useState('pt-BR');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('imax-language');
      if (saved) {
        setLanguage(saved);
        //console.log(`[iMAX-Language] ✅ Carregado do localStorage: ${saved}`);
      } else {
        //console.log('[iMAX-Language] ⚠️ Nenhum idioma salvo, usando padrão "pt-BR"');
      }
    } catch (error) {
      //console.warn('[iMAX-Language] ⚠️ Erro ao carregar idioma do localStorage', error);
    }
  }, []);

  const changeLanguage = (lang) => {
    try {
      setLanguage(lang);
      localStorage.setItem('imax-language', lang);
      //console.log(`[iMAX-Language] 🌐 Idioma alterado para: ${lang}`);
    } catch (error) {
      //console.error('[iMAX-Language] ❌ Erro ao salvar idioma no localStorage', error);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
