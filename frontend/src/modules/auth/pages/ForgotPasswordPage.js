import React, { useState } from 'react';
import { useTranslation } from '../../../shared/i18n';
import api from '../../../api/axios';
import "../styles/ForgotPassword.css"

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await api.post('/api/password/forgot', { email });
      setMessage(t('link_sent'));
    } catch (err) {
      setMessage('Erro ao solicitar redefinição.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
    <div className="form-container">
      <h2>{t('forgot_password')}</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">{t('contact_form_mail')}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder={t("contact_form_mail_placeholder")}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? t('loading') : t('send_link')}
        </button>
      </form>
      {message && <div className="message">{message}</div>}
    </div>
  </div>
  );
}
