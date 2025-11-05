import pt from './pt.json';
import en from './en.json';
import { useLanguage } from '../contexts/LanguageContext';

const translations = {
  pt,
  en
};

export function useTranslation() {
  const { language } = useLanguage();

  const t = (key) => translations[language]?.[key] || key;

  return { t };
}
