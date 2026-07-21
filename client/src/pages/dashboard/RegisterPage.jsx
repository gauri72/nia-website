import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import memberApi from '../../services/memberApi';
import { translateApiError } from '../../i18n/translateApiError';
import '../../styles/auth.css';

export default function DashboardRegisterPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await memberApi.post('/member-auth/register', form);
      setSuccess(data.message);
      setTimeout(() => navigate('/dashboard/login'), 3000);
    } catch (err) {
      setError(translateApiError(err.response?.data?.error, i18n.language) || t('dashboardAuth.register.errorDefault'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">NIA <span>{t('dashboardAuth.memberPortal')}</span></div>
        <h1 className="auth-card__title">{t('dashboardAuth.register.title')}</h1>
        <p className="auth-card__sub">{t('dashboardAuth.register.sub')}</p>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        {!success && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-row">
              <div className="auth-field">
                <label className="auth-field__label" htmlFor="firstName">{t('dashboardAuth.register.firstName')}</label>
                <input id="firstName" className="auth-field__input" required value={form.firstName} onChange={update('firstName')} />
              </div>
              <div className="auth-field">
                <label className="auth-field__label" htmlFor="lastName">{t('dashboardAuth.register.lastName')}</label>
                <input id="lastName" className="auth-field__input" required value={form.lastName} onChange={update('lastName')} />
              </div>
            </div>
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="email">{t('dashboardAuth.login.email')}</label>
              <input id="email" type="email" className="auth-field__input" required value={form.email} onChange={update('email')} />
            </div>
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="phone">{t('dashboardAuth.register.phone')} <span style={{ fontWeight: 400, color: '#999' }}>{t('dashboardAuth.register.optional')}</span></label>
              <input id="phone" className="auth-field__input" value={form.phone} onChange={update('phone')} />
            </div>
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="password">{t('dashboardAuth.login.password')}</label>
              <input id="password" type="password" className="auth-field__input" required minLength={8} value={form.password} onChange={update('password')} placeholder={t('dashboardAuth.register.passwordPlaceholder')} />
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? t('dashboardAuth.register.creatingAccount') : t('dashboardAuth.register.createAccountBtn')}
            </button>
          </form>
        )}

        <div className="auth-card__footer">
          {t('dashboardAuth.register.alreadyMember')} <Link to="/dashboard/login">{t('dashboardAuth.register.logInLink')}</Link>
        </div>
      </div>
    </div>
  );
}
