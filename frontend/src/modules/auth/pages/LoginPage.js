import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../../../shared/i18n';
import '../styles/Login.css';
import { useLayout } from '../../../shared/contexts/LayoutContext';
import btnVoltar from '../../../shared/assets/images/btnVoltar.svg';
import iconFacebook from '../../../shared/assets/images/iconFacebook.svg';
import iconInstagram from '../../../shared/assets/images/iconInstagram.svg';
import iconYoutube from '../../../shared/assets/images/iconYoutube.svg';
import iconLinkedin from '../../../shared/assets/images/iconLinkedin.svg';
import logo from '../../../shared/assets/images/lgGricco_bluedark.svg';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const { setLayout, resetLayout } = useLayout();

  useEffect(() => {
    // ao entrar na página
    setLayout({
      transparentNavbar: false,
      pageTitle: t('Login'), // título na topbar
      showTopBar: false,
      showBottomBar: false,
      showLeftSidebar: true,
      showRightPanel: true, // ex.: painel lateral com filtros
    });

    // ao sair da página (volta pro default)
    return () => {
      resetLayout();
    };
  }, [setLayout, resetLayout, t]);

  // ✅ Validação forte
  const validate = () => {
    if (!email.includes('@')) {
      setError(t('invalid.email'));
      return false;
    }
    if (!password) {
      setError(t('password.required'));
      return false;
    }
    if (password.length < 8) {
      setError(t('password.too.short'));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    setLoading(true);

    try {
      // 👉 Agora usamos o login do AuthContext, que já chama /auth/login,
      // salva token, usuário, permissões e devolve o user completo.
      const user = await login(email, password);
      const portalCtx = user?.portalContext;

      console.log('Logged in user:', user, portalCtx);

      // if (portalCtx?.companyId && portalCtx?.establishmentId) {
      //   // Colaborador de portal → vai direto para documentos do estabelecimento
      //   navigate(
      //     //`/companies/${portalCtx.companyId}/establishments/${portalCtx.establishmentId}/documents`
      //     `/companies/${portalCtx.companyId}`
      //   );
      // } else if (user?.isCompanyAdmin || user?.isGlobalAdmin) {
      //   navigate('/dashboard');
      // } else {
        // Usuário "admin" / normal → dashboard padrão
        navigate('/dashboard');
      //}
    } catch (err) {
      console.error(err);
      setError(
        t('login_error') ||
          'Falha no login. Verifique as credenciais.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="lgGricco"></div>
      <div className="login-form">
        <div className="login-barra-superior">
          <div className="login-voltar">
            <Link to="/">
              <img src={btnVoltar} alt="Voltar ao site da Gricco" />
            </Link>
          </div>
          <div className="login-redes-sociais">
            <img src={iconFacebook} alt="" />
            <img src={iconInstagram} alt="" />
            <img src={iconYoutube} alt="" />
            <img src={iconLinkedin} alt="" />
          </div>
        </div>

        <div className="login-inputs">
          <h2>{t('login')}</h2>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <input
                type="email"
                placeholder={t('contact.form.mail.placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <input
                type="password"
                placeholder={t('password.placeholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? t('loading') : t('login.btnEnter')}
            </button>

            {error && <div className="error-message">{error}</div>}

            <div className="forgot-password-link">
              <Link to="/forgot-password">
                {t('forgot.password') || 'Esqueci minha senha'}
              </Link>
            </div>
          </form>
        </div>

        <div className="login-barra-inferior">
          <img src={logo} alt={t('footer_logo_alt')} />
          <p>{t('footer.copyright')}</p>
        </div>
      </div>
    </div>
  );
}
