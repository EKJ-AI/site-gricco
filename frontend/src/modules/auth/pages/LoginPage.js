import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../../../api/axios';
import { useTranslation } from '../../../shared/i18n';
import "../styles/Login.css"

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  // ✅ Validação forte
  const validate = () => {
    if (!email.includes('@')) {
      setError(t('invalid_email'));
      return false;
    }
    if (!password) {
      setError(t('password_required'));
      return false;
    }
    if (password.length < 8) {
      setError(t('password_too_short'));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    setLoading(true);
    console.log('Tentando login com:', { email, password });

    try {
      console.log('Enviando requisição de login...');
      const res = await api.post('/api/auth/login', { email, password });
      console.log('Resposta recebida:', res.data);

      const token = res.data.accessToken;
      if (!token) throw new Error('Token não retornado.');

      await login(token);
      navigate('/dashboard');
      console.log('Login bem-sucedido:', res.data);
    } catch (err) {
      console.error(err);
      setError(t('login_error') || 'Falha no login. Verifique as credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
    <div className="form-container">
      <h2>{t('login')}</h2>
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="email">{t('contact_form_mail')}</label>
          <input
            type="email"
            placeholder={t("contact_form_mail_placeholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">{t('password_label')}</label>
          <input
            type="password"
            placeholder={t('password_placeholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
          <button type="submit" disabled={loading}>
            {loading ? t('loading') : t('login')}
          </button>
        {error && <div className="error-message">{error}</div>}
        <div className="forgot-password-link">
          <Link to="/forgot-password">
            {t('forgot_password') || 'Esqueci minha senha'}
          </Link>
        </div>
      </form>
    </div>
    </div>
  );
}
