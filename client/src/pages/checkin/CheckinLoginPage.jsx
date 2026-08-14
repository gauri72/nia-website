import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import '../../styles/auth.css';

export default function CheckinLoginPage() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
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
      navigate('/checkin', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page" style={{ background: '#0f1f4b' }}>
      <div className="auth-card">
        <div className="auth-card__logo">NIA <span>Check-In</span></div>
        <h1 className="auth-card__title">Team Sign In</h1>
        <p className="auth-card__sub">Sign in with your NIA admin account to start scanning.</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-field__label" htmlFor="email">Email</label>
            <input
              id="email" type="email" autoComplete="username" className="auth-field__input" required
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@niaonline.org"
            />
          </div>
          <div className="auth-field">
            <label className="auth-field__label" htmlFor="password">Password</label>
            <input
              id="password" type="password" autoComplete="current-password" className="auth-field__input" required
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
