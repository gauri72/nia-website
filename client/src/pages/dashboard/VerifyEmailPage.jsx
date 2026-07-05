import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import memberApi from '../../services/memberApi';
import '../../styles/auth.css';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }
    memberApi.get(`/member-auth/verify-email?token=${token}`)
      .then((res) => {
        setStatus('success');
        setMessage(res.data.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed.');
      });
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div className="auth-card__logo">NIA <span>Member Portal</span></div>
        <h1 className="auth-card__title">Email Verification</h1>

        {status === 'verifying' && <p className="auth-card__sub">Verifying your email…</p>}
        {status === 'success' && <div className="auth-success">{message}</div>}
        {status === 'error' && <div className="auth-error">{message}</div>}

        {status !== 'verifying' && (
          <div className="auth-card__footer">
            <Link to="/dashboard/login">Go to Login</Link>
          </div>
        )}
      </div>
    </div>
  );
}
