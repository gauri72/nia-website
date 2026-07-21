import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import memberApi from '../../services/memberApi';
import { translateApiError } from '../../i18n/translateApiError';
import '../../styles/auth.css';

export default function ResetPasswordPage() {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await memberApi.post('/member-auth/reset-password', { token, password });
      setSuccess(data.message);
      setTimeout(() => navigate('/dashboard/login'), 2000);
    } catch (err) {
      setError(translateApiError(err.response?.data?.error, i18n.language) || t('dashboardAuth.resetPassword.errorDefault'));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="auth-error">{t('dashboardAuth.resetPassword.missingLink')}</div>
          <div className="auth-card__footer"><Link to="/dashboard/forgot-password">{t('dashboardAuth.resetPassword.requestNewLink')}</Link></div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">NIA <span>{t('dashboardAuth.memberPortal')}</span></div>
        <h1 className="auth-card__title">{t('dashboardAuth.resetPassword.title')}</h1>
        <p className="auth-card__sub">{t('dashboardAuth.resetPassword.sub')}</p>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        {!success && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="password">{t('dashboardAuth.resetPassword.newPassword')}</label>
              <input id="password" type="password" className="auth-field__input" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('dashboardAuth.register.passwordPlaceholder')} />
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? t('dashboardAuth.resetPassword.resetting') : t('dashboardAuth.resetPassword.resetPasswordBtn')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
