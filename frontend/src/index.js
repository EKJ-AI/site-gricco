import { LanguageProvider } from './shared/contexts/LanguageContext';
import I18nGate from './shared/i18n/I18nGate';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<LanguageProvider><I18nGate fallback={null}><App /></I18nGate></LanguageProvider>);
