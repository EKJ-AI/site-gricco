import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import { useTranslation } from '../../../shared/i18n';
import "../styles/ForgotPassword.css"

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirm) {
      setMessage('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await api.post('/api/password/reset', { token, newPassword });
      navigate('/reset-success');
    } catch (err) {
      if (err.response?.data?.message) {
        setMessage(err.response.data.message);
      } else {
        setMessage('Erro ao redefinir senha.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
    <div className="form-container">
      <h2>{t('reset_password')}</h2>
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label>{t('new_password')}</label>
          <input
            type="password"
            placeholder={t('new_password_placeholder')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>{t('confirm_new_password')}</label>
          <input
            type="password"
            placeholder={t('confirm_new_password_placeholder')}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? t('loading') : t('change_password')}
        </button>
      </form>
      {message && <div className="message">{message}</div>}
    </div>
    </div>
  );
}
