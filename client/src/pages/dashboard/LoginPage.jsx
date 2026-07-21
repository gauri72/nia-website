import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMemberAuth } from '../../context/MemberAuthContext';
import { translateApiError } from '../../i18n/translateApiError';
import '../../styles/auth.css';

export default function DashboardLoginPage() {
  const { t, i18n } = useTranslation();
  const { login } = useMemberAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(translateApiError(err.response?.data?.error, i18n.language) || t('dashboardAuth.login.errorDefault'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">NIA <span>{t('dashboardAuth.memberPortal')}</span></div>
        <h1 className="auth-card__title">{t('dashboardAuth.login.title')}</h1>
        <p className="auth-card__sub">{t('dashboardAuth.login.sub')}</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-field__label" htmlFor="email">{t('dashboardAuth.login.email')}</label>
            <input
              id="email" type="email" className="auth-field__input" required
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
            />
          </div>
          <div className="auth-field">
            <label className="auth-field__label" htmlFor="password">{t('dashboardAuth.login.password')}</label>
            <input
              id="password" type="password" className="auth-field__input" required
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? t('dashboardAuth.login.loggingIn') : t('dashboardAuth.login.logIn')}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/dashboard/forgot-password">{t('dashboardAuth.login.forgotPassword')}</Link>
        </div>

        <div className="auth-card__footer">
          {t('dashboardAuth.login.newToNia')} <Link to="/dashboard/register">{t('dashboardAuth.login.createAccount')}</Link>
        </div>
      </div>
    </div>
  );
}
