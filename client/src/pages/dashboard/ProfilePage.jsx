import { useState } from 'react';
import memberApi from '../../services/memberApi';
import { useMemberAuth } from '../../context/MemberAuthContext';

const inputCls = 'w-full rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20';
const btnPrimary = 'rounded-nia-btn bg-nia-orange px-4 py-2 text-sm font-semibold text-white hover:bg-nia-orange-dark transition-colors disabled:bg-nia-border disabled:text-nia-text-faint';
const btnDanger = 'rounded-nia-btn border border-nia-error px-4 py-2 text-sm font-semibold text-nia-error hover:bg-red-50 transition-colors';
const label = 'text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-1 block';

export default function DashboardProfilePage() {
  const { member, setMember, logout } = useMemberAuth();
  const [form, setForm] = useState({ firstName: member?.firstName || '', lastName: member?.lastName || '', phone: member?.phone || '', address: member?.address || '' });
  const [prefs, setPrefs] = useState(member?.communicationPrefs || { newsletter: true, eventReminders: true, promotional: true });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState({}); const [err, setErr] = useState({});
  const [saving, setSaving] = useState({});

  function setBusy(key, val) { setSaving((s) => ({ ...s, [key]: val })); }
  function setMessage(key, val) { setMsg((s) => ({ ...s, [key]: val })); setErr((s) => ({ ...s, [key]: '' })); }
  function setError(key, val) { setErr((s) => ({ ...s, [key]: val })); setMsg((s) => ({ ...s, [key]: '' })); }

  async function handleSaveProfile(e) {
    e.preventDefault(); setBusy('profile', true);
    try {
      const { data } = await memberApi.patch('/member/profile', form);
      setMember(data);
      setMessage('profile', 'Profile updated');
    } catch (error) {
      setError('profile', error.response?.data?.error || 'Failed to update');
    } finally { setBusy('profile', false); }
  }

  async function handleSavePrefs() {
    setBusy('prefs', true);
    try {
      await memberApi.patch('/member/profile/communication-prefs', prefs);
      setMessage('prefs', 'Preferences saved');
    } catch (error) {
      setError('prefs', 'Failed to save preferences');
    } finally { setBusy('prefs', false); }
  }

  async function handleUnsubscribe() {
    setBusy('prefs', true);
    try {
      await memberApi.post('/member/profile/unsubscribe');
      setPrefs((p) => ({ ...p, newsletter: false, promotional: false }));
      setMessage('prefs', 'You have been unsubscribed from broadcast emails');
    } finally { setBusy('prefs', false); }
  }

  async function handleChangePassword(e) {
    e.preventDefault(); setBusy('password', true);
    try {
      await memberApi.post('/member/profile/change-password', pwForm);
      setMessage('password', 'Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (error) {
      setError('password', error.response?.data?.error || 'Failed to change password');
    } finally { setBusy('password', false); }
  }

  async function handleDeleteAccount() {
    if (!window.confirm('Are you sure you want to delete your account? This cannot be undone.')) return;
    await memberApi.delete('/member/profile');
    logout();
  }

  return (
    <div className="max-w-xl flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-nia-navy-dark">Profile</h1>

      <form onSubmit={handleSaveProfile} className="rounded-nia-card border border-nia-border bg-white p-5 flex flex-col gap-3">
        <h2 className="font-bold text-nia-navy-dark">Personal Details</h2>
        {msg.profile && <div className="rounded bg-green-50 border-l-4 border-nia-success px-3 py-2 text-sm text-green-700">{msg.profile}</div>}
        {err.profile && <div className="rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{err.profile}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>First Name</label><input className={inputCls} value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} /></div>
          <div><label className={label}>Last Name</label><input className={inputCls} value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} /></div>
        </div>
        <div><label className={label}>Email</label><input className={inputCls + ' bg-nia-panel-alt'} value={member?.email || ''} disabled /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>Phone</label><input className={inputCls} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
          <div><label className={label}>Address</label><input className={inputCls} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></div>
        </div>
        <div className="flex justify-end"><button type="submit" disabled={saving.profile} className={btnPrimary}>{saving.profile ? 'Saving…' : 'Save'}</button></div>
      </form>

      <div className="rounded-nia-card border border-nia-border bg-white p-5 flex flex-col gap-3">
        <h2 className="font-bold text-nia-navy-dark">Communication Preferences</h2>
        {msg.prefs && <div className="rounded bg-green-50 border-l-4 border-nia-success px-3 py-2 text-sm text-green-700">{msg.prefs}</div>}
        {err.prefs && <div className="rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{err.prefs}</div>}
        <label className="flex items-center gap-2 text-sm text-nia-text-muted"><input type="checkbox" checked={prefs.newsletter} onChange={(e) => setPrefs((p) => ({ ...p, newsletter: e.target.checked }))} /> Newsletter emails</label>
        <label className="flex items-center gap-2 text-sm text-nia-text-muted"><input type="checkbox" checked={prefs.eventReminders} onChange={(e) => setPrefs((p) => ({ ...p, eventReminders: e.target.checked }))} /> Event reminder emails</label>
        <label className="flex items-center gap-2 text-sm text-nia-text-muted"><input type="checkbox" checked={prefs.promotional} onChange={(e) => setPrefs((p) => ({ ...p, promotional: e.target.checked }))} /> Promotional / broadcast emails</label>
        <div className="flex justify-between items-center">
          <button onClick={handleUnsubscribe} className="text-sm text-nia-error hover:underline">Unsubscribe from all broadcast emails</button>
          <button onClick={handleSavePrefs} disabled={saving.prefs} className={btnPrimary}>Save Preferences</button>
        </div>
      </div>

      <form onSubmit={handleChangePassword} className="rounded-nia-card border border-nia-border bg-white p-5 flex flex-col gap-3">
        <h2 className="font-bold text-nia-navy-dark">Change Password</h2>
        {msg.password && <div className="rounded bg-green-50 border-l-4 border-nia-success px-3 py-2 text-sm text-green-700">{msg.password}</div>}
        {err.password && <div className="rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{err.password}</div>}
        <div><label className={label}>Current Password</label><input type="password" className={inputCls} required value={pwForm.currentPassword} onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))} /></div>
        <div><label className={label}>New Password</label><input type="password" minLength={8} className={inputCls} required value={pwForm.newPassword} onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))} /></div>
        <div className="flex justify-end"><button type="submit" disabled={saving.password} className={btnPrimary}>{saving.password ? 'Changing…' : 'Change Password'}</button></div>
      </form>

      <div className="rounded-nia-card border border-nia-error/40 bg-white p-5 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-nia-error">Delete Account</h2>
          <p className="text-sm text-nia-text-faint">This will deactivate your account permanently.</p>
        </div>
        <button onClick={handleDeleteAccount} className={btnDanger}>Delete Account</button>
      </div>
    </div>
  );
}
