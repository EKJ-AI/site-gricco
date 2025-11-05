import React from 'react';
import Navbar from '../../../shared/components/NavbarOLD';
import { useLanguage } from '../../../shared/contexts/LanguageContext';
import { useTranslation } from '../../../shared/i18n';
import '../../../shared/styles/Form.css';
import { useTheme } from '../../../shared/contexts/ThemeContext';

export default function SettingsPage() {
  const { language, changeLanguage } = useLanguage();
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <Navbar />
      <div className="form-container">
        <h2>{t('settings')}</h2>        
        <div>
          <label>{t('language')}:</label>
          <select value={language} onChange={(e) => changeLanguage(e.target.value)}>
            <option value="pt">🇧🇷 Português</option>
            <option value="en">🇺🇸 English</option>
          </select>
        </div>

        <div>
            <label>{t('theme')}:</label>
            <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                <option value="light">☀️ {t('light')}</option>
                <option value="dark">🌙 {t('dark')}</option>
            </select>
        </div>
      </div>
    </div>
  );
}
