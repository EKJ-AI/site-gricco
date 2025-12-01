import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../../shared/contexts/LanguageContext';
import { useTranslation } from '../../../shared/i18n';
import '../../../shared/styles/Form.css';
import api from '../../../api/axios';

export default function SettingsPage() {
  const { language, changeLanguage } = useLanguage();
  const { t } = useTranslation();

  const [cultures, setCultures] = useState([]);
  const [loadingCultures, setLoadingCultures] = useState(false);

  // Carrega culturas do backend
  useEffect(() => {
    let mounted = true;

    async function loadCultures() {
      setLoadingCultures(true);
      try {
        const res = await api.get('/api/public/i18n/cultures');
        const items = res?.data?.data || [];

        if (!mounted) return;

        const normalized = items.map(c => ({
          ...c,
          icon:
            c.icon ||
            (c.id.toLowerCase().startsWith('pt')
              ? '🇧🇷'
              : c.id.toLowerCase().startsWith('en')
                ? '🇺🇸'
                : ''),
        }));

        setCultures(normalized);
      } catch (err) {
        console.warn(
          '[Settings] Falha ao carregar culturas públicas; usando fallback estático.',
          err?.message || err
        );
      } finally {
        if (mounted) setLoadingCultures(false);
      }
    }

    loadCultures();
    return () => {
      mounted = false;
    };
  }, []);

  // Normaliza o value atual para bater com as cultures
  const resolvedValue = (() => {
    const val = String(language || '').trim();
    if (cultures?.some(c => c.id === val)) return val;

    const low = val.toLowerCase();
    if (cultures?.some(c => c.id === 'pt-BR') && (low === 'pt' || low === 'pt-br')) return 'pt-BR';
    if (cultures?.some(c => c.id === 'en-US') && (low === 'en' || low === 'en-us')) return 'en-US';

    return val || (cultures?.[0]?.id ?? 'pt-BR');
  })();

  const renderLanguageOptions = () => {
    if (cultures && cultures.length) {
      return cultures.map(c => (
        <option key={c.id} value={c.id}>
          {c.icon ? `${c.icon} ` : ''}{c.description || c.id}
        </option>
      ));
    }

    // fallback se API falhar
    return (
      <>
        <option value="pt-BR">🇧🇷 Português (Brasil)</option>
        <option value="en-US">🇺🇸 English (US)</option>
      </>
    );
  };

  return (
    <div>
      <div className="form-container">
        <h2>{t('settings')}</h2>
        <div>
          <label>{t('language')}:</label>
          <select
            value={resolvedValue}
            onChange={e => changeLanguage(e.target.value)}
            disabled={loadingCultures}
          >
            {renderLanguageOptions()}
          </select>
        </div>

        {/* 
        <div>
          <label>{t('theme')}:</label>
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="light">☀️ {t('light')}</option>
            <option value="dark">🌙 {t('dark')}</option>
          </select>
        </div> 
        */}
      </div>
    </div>
  );
}
