import { createContext, useContext, useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('imax-theme');
      if (savedTheme) {
        setTheme(savedTheme);
        console.log(`[iMAX-Theme] ✅ Tema carregado do localStorage: ${savedTheme}`);
      } else {
        console.log('[iMAX-Theme] ⚠️ Nenhum tema salvo, usando padrão "light"');
      }
    } catch (error) {
      console.warn('[iMAX-Theme] ⚠️ Erro ao acessar localStorage', error);
    }
  }, []);

  useEffect(() => {
    try {
      document.body.className = theme;
      localStorage.setItem('imax-theme', theme);
      console.log(`[iMAX-Theme] 🌗 Tema aplicado: ${theme}`);
    } catch (error) {
      console.error('[iMAX-Theme] ❌ Erro ao salvar tema no localStorage', error);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      <Navbar></Navbar>
        {children}
      <Footer></Footer>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
