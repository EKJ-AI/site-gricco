import React from 'react';
import { useTranslation } from './index';

export default function I18nGate({ children, fallback = null }) {
  const { ready } = useTranslation();
  if (!ready) return fallback;
  //console.log("i18n", ready);
  return children;
}
