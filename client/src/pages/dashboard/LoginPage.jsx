import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useMemberAuth } from '../../context/MemberAuthContext';
import '../../styles/auth.css';

export default function DashboardLoginPage() {
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
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">NIA <span>Member Portal</span></div>
        <h1 className="auth-card__title">Welcome Back</h1>
        <p className="auth-card__sub">Log in to manage your membership, events and tickets.</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-field__label" htmlFor="email">Email</label>
            <input
              id="email" type="email" className="auth-field__input" required
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
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

        <div className="auth-links">
          <Link to="/dashboard/forgot-password">Forgot password?</Link>
        </div>

        <div className="auth-card__footer">
          New to NIA? <Link to="/dashboard/register">Create a member account</Link>
        </div>
      </div>
    </div>
  );
}
