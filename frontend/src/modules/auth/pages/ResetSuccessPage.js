import React from 'react';
import { useTranslation } from '../../../shared/i18n';
import { useNavigate } from 'react-router-dom';
import "../styles/ResetSucess.css"

export default function ResetSuccessPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="success-container">
      <div className="success-card">
        <div className="success-icon">✅</div>
        <h2>{t('reset_password')}</h2>
        <p>{t('password_reset_success_message')}</p>
        <button onClick={handleBackToLogin}>{t('back_to_login')}</button>
      </div>
    </div>
  );
}
