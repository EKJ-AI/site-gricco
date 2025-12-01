import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import { useLanguage } from '../contexts/LanguageContext';

const CACHE_KEY = 'imax-i18n-cache-v1';
//const DEFAULT_FALLBACK = 'en';
// fallback correto = en-US (temos culturas 'pt-BR' e 'en-US' no backend)
const DEFAULT_FALLBACK = 'en-US';

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
function saveCache(cache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
}

/**
 * Hook de tradução que carrega do backend e aplica fallback (ex.: pt -> en).
 * Mantém cache em localStorage.
 */
export function useTranslation() {
  const { language } = useLanguage();
  const [dictPrimary, setDictPrimary] = useState({});
  const [dictFallback, setDictFallback] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchDicts() {
      setReady(false);
      const cache = loadCache();

      // Preload de cache para evitar flicker
      if (cache[language]) setDictPrimary(cache[language]);
      if (cache[DEFAULT_FALLBACK]) setDictFallback(cache[DEFAULT_FALLBACK]);
      if (cache[language] && cache[DEFAULT_FALLBACK]) setReady(true);

      try {
        const [resPrimary, resFallback] = await Promise.all([
          api.get(`/api/public/i18n/${language}`),
          language !== DEFAULT_FALLBACK
            ? api.get(`/api/public/i18n/${DEFAULT_FALLBACK}`)
            : Promise.resolve({ data: { data: {} } }),
        ]);

        const dataPrimary = resPrimary?.data?.data || {};
        const dataFallback = language !== DEFAULT_FALLBACK ? (resFallback?.data?.data || {}) : {};

        if (mounted) {
          //console.log("@@ ", dataPrimary);
          setDictPrimary(dataPrimary);
          setDictFallback(dataFallback);
          setReady(true);

          const c = loadCache();
          c[language] = dataPrimary;
          if (language !== DEFAULT_FALLBACK) c[DEFAULT_FALLBACK] = dataFallback;
          saveCache(c);
        }
      } catch {
        // Se falhar, pelo menos continua com o cache que já carregamos (se houver)
        if (mounted) setReady(true);
      }
    }
    fetchDicts();
    return () => { mounted = false; };
  }, [language]);

  const t = useMemo(() => {
    return (key) => (dictPrimary?.[key] ?? dictFallback?.[key] ?? key);
  }, [dictPrimary, dictFallback]);

  //console.log("-------------: ", dictPrimary, ready)

  return { t, ready };
}
