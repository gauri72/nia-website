import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import '../../styles/auth.css';

export default function AdminLoginPage() {
  const { login } = useAdminAuth();
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
      navigate(location.state?.from || '/admin', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page" style={{ background: '#0f1f4b' }}>
      <div className="auth-card">
        <div className="auth-card__logo">NIA <span>Admin Panel</span></div>
        <h1 className="auth-card__title">Admin Sign In</h1>
        <p className="auth-card__sub">Manage members, events, tickets and broadcasts.</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-field__label" htmlFor="email">Email</label>
            <input
              id="email" type="email" className="auth-field__input" required
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@niaonline.org"
            />
          </div>
          <div className="auth-field">
            <label className="auth-field__label" htmlFor="password">Password</label>
            <input
              id="password" type="password" className="auth-field__input" required
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Logging in…' : 'Log In'}
          </button>
        </form>

        <div className="auth-links" style={{ justifyContent: 'center' }}>
          <Link to="/admin/forgot-password">Forgot password?</Link>
        </div>
      </div>
    </div>
  );
}
