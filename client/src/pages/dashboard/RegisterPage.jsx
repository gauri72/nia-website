import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import memberApi from '../../services/memberApi';
import '../../styles/auth.css';

export default function DashboardRegisterPage() {
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
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">NIA <span>Member Portal</span></div>
        <h1 className="auth-card__title">Create Your Account</h1>
        <p className="auth-card__sub">Join the Netherlands India Association community.</p>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        {!success && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-row">
              <div className="auth-field">
                <label className="auth-field__label" htmlFor="firstName">First Name</label>
                <input id="firstName" className="auth-field__input" required value={form.firstName} onChange={update('firstName')} />
              </div>
              <div className="auth-field">
                <label className="auth-field__label" htmlFor="lastName">Last Name</label>
                <input id="lastName" className="auth-field__input" required value={form.lastName} onChange={update('lastName')} />
              </div>
            </div>
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="email">Email</label>
              <input id="email" type="email" className="auth-field__input" required value={form.email} onChange={update('email')} />
            </div>
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="phone">Phone <span style={{ fontWeight: 400, color: '#999' }}>(optional)</span></label>
              <input id="phone" className="auth-field__input" value={form.phone} onChange={update('phone')} />
            </div>
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="password">Password</label>
              <input id="password" type="password" className="auth-field__input" required minLength={8} value={form.password} onChange={update('password')} placeholder="At least 8 characters" />
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="auth-card__footer">
          Already a member? <Link to="/dashboard/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
