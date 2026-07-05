import { useState } from 'react';
import adminApi from '../../services/adminApi';
import { useAdminAuth } from '../../context/AdminAuthContext';

const inputCls = 'w-full rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20';
const btnPrimary = 'rounded-nia-btn bg-nia-orange px-4 py-2 text-sm font-semibold text-white hover:bg-nia-orange-dark transition-colors disabled:bg-nia-border disabled:text-nia-text-faint';
const label = 'text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-1 block';

export default function AdminProfilePage() {
  const { admin, setAdmin } = useAdminAuth();
  const [form, setForm] = useState({ firstName: admin?.firstName || '', lastName: admin?.lastName || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setErr(''); setMsg(''); setSaving(true);
    try {
      const { data } = await adminApi.patch('/admin/profile', form);
      setAdmin(data);
      setMsg('Profile updated');
    } catch (error) {
      setErr(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwErr(''); setPwMsg(''); setChangingPw(true);
    try {
      await adminApi.post('/admin/profile/change-password', pwForm);
      setPwMsg('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (error) {
      setPwErr(error.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPw(false);
    }
  }

  return (
    <div className="max-w-xl flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-nia-navy-dark">Profile</h1>

      <form onSubmit={handleSaveProfile} className="rounded-nia-card border border-nia-border bg-white p-5 flex flex-col gap-3">
        <h2 className="font-bold text-nia-navy-dark">Your Details</h2>
        {msg && <div className="rounded bg-green-50 border-l-4 border-nia-success px-3 py-2 text-sm text-green-700">{msg}</div>}
        {err && <div className="rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{err}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>First Name</label><input className={inputCls} value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} /></div>
          <div><label className={label}>Last Name</label><input className={inputCls} value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} /></div>
        </div>
        <div><label className={label}>Email</label><input className={inputCls + ' bg-nia-panel-alt'} value={admin?.email || ''} disabled /></div>
        <div><label className={label}>Role</label><input className={inputCls + ' bg-nia-panel-alt capitalize'} value={admin?.role?.replace('_', ' ') || ''} disabled /></div>
        <div className="flex justify-end"><button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Save'}</button></div>
      </form>

      <form onSubmit={handleChangePassword} className="rounded-nia-card border border-nia-border bg-white p-5 flex flex-col gap-3">
        <h2 className="font-bold text-nia-navy-dark">Change Password</h2>
        {pwMsg && <div className="rounded bg-green-50 border-l-4 border-nia-success px-3 py-2 text-sm text-green-700">{pwMsg}</div>}
        {pwErr && <div className="rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{pwErr}</div>}
        <div><label className={label}>Current Password</label><input type="password" className={inputCls} required value={pwForm.currentPassword} onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))} /></div>
        <div><label className={label}>New Password</label><input type="password" minLength={8} className={inputCls} required value={pwForm.newPassword} onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))} /></div>
        <div className="flex justify-end"><button type="submit" disabled={changingPw} className={btnPrimary}>{changingPw ? 'Changing…' : 'Change Password'}</button></div>
      </form>
    </div>
  );
}
