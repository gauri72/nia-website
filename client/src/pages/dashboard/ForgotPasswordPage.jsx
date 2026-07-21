import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import memberApi from '../../services/memberApi';
import { translateApiError } from '../../i18n/translateApiError';
import '../../styles/auth.css';

export default function ForgotPasswordPage() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await memberApi.post('/member-auth/forgot-password', { email });
      setMessage(data.message);
    } catch (err) {
      setError(translateApiError(err.response?.data?.error, i18n.language) || t('dashboardAuth.forgotPassword.errorDefault'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">NIA <span>{t('dashboardAuth.memberPortal')}</span></div>
        <h1 className="auth-card__title">{t('dashboardAuth.forgotPassword.title')}</h1>
        <p className="auth-card__sub">{t('dashboardAuth.forgotPassword.sub')}</p>

        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}

        {!message && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="email">{t('dashboardAuth.login.email')}</label>
              <input id="email" type="email" className="auth-field__input" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? t('dashboardAuth.forgotPassword.sending') : t('dashboardAuth.forgotPassword.sendResetLink')}
            </button>
          </form>
        )}

        <div className="auth-card__footer">
          <Link to="/dashboard/login">{t('dashboardAuth.forgotPassword.backToLogin')}</Link>
        </div>
      </div>
    </div>
  );
}
