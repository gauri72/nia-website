import { useState } from 'react';
import { Link } from 'react-router-dom';
import adminApi from '../../services/adminApi';
import '../../styles/auth.css';

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await adminApi.post('/admin-auth/forgot-password', { email });
      setMessage(data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page" style={{ background: '#0f1f4b' }}>
      <div className="auth-card">
        <div className="auth-card__logo">NIA <span>Admin Panel</span></div>
        <h1 className="auth-card__title">Forgot Password</h1>
        <p className="auth-card__sub">Enter your admin email and we'll send you a reset link.</p>

        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}

        {!message && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="email">Email</label>
              <input id="email" type="email" className="auth-field__input" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div className="auth-card__footer">
          <Link to="/admin/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
