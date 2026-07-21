import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import memberApi from '../../services/memberApi';
import { translateApiError } from '../../i18n/translateApiError';
import '../../styles/auth.css';

export default function VerifyEmailPage() {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage(t('dashboardAuth.verifyEmail.missingToken'));
      return;
    }
    memberApi.get(`/member-auth/verify-email?token=${token}`)
      .then((res) => {
        setStatus('success');
        setMessage(res.data.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(translateApiError(err.response?.data?.error, i18n.language) || t('dashboardAuth.verifyEmail.errorDefault'));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-card__logo">NIA <span>{t('dashboardAuth.memberPortal')}</span></div>
        <h1 className="auth-card__title">{t('dashboardAuth.verifyEmail.title')}</h1>

        {status === 'verifying' && <p className="auth-card__sub">{t('dashboardAuth.verifyEmail.verifying')}</p>}
        {status === 'success' && <div className="auth-success">{message}</div>}
        {status === 'error' && <div className="auth-error">{message}</div>}

        {status !== 'verifying' && (
          <div className="auth-card__footer">
            <Link to="/dashboard/login">{t('dashboardAuth.verifyEmail.goToLogin')}</Link>
          </div>
        )}
      </div>
    </div>
  );
}
