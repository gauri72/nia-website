import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import memberApi from '../../services/memberApi';
import '../../styles/auth.css';

export default function ResetPasswordPage() {
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
      setError(err.response?.data?.error || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="auth-error">Missing or invalid reset link.</div>
          <div className="auth-card__footer"><Link to="/dashboard/forgot-password">Request a new link</Link></div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">NIA <span>Member Portal</span></div>
        <h1 className="auth-card__title">Reset Password</h1>
        <p className="auth-card__sub">Choose a new password for your account.</p>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        {!success && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="password">New Password</label>
              <input id="password" type="password" className="auth-field__input" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
