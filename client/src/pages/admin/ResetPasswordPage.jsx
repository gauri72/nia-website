import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import '../../styles/auth.css';

export default function AdminResetPasswordPage() {
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
      const { data } = await adminApi.post('/admin-auth/reset-password', { token, password });
      setSuccess(data.message);
      setTimeout(() => navigate('/admin/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-page" style={{ background: '#0f1f4b' }}>
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="auth-error">Missing or invalid reset link.</div>
          <div className="auth-card__footer"><Link to="/admin/forgot-password">Request a new link</Link></div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page" style={{ background: '#0f1f4b' }}>
      <div className="auth-card">
        <div className="auth-card__logo">NIA <span>Admin Panel</span></div>
        <h1 className="auth-card__title">Reset Password</h1>
        <p className="auth-card__sub">Choose a new password for your admin account.</p>

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
