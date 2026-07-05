import { useEffect, useState } from 'react';
import adminApi from '../../services/adminApi';
import EmailBroadcastingNav from '../../components/admin/EmailBroadcastingNav';
import StatusBadge from '../../components/admin/StatusBadge';
import Modal from '../../components/admin/Modal';

const btnSecondary = 'rounded-nia-btn border border-nia-border bg-white px-3 py-1.5 text-xs font-semibold text-nia-navy-dark hover:bg-nia-panel transition-colors';

export default function BroadcastHistoryPage() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [recipients, setRecipients] = useState([]);

  function load() {
    setLoading(true);
    adminApi.get('/broadcasts').then((r) => setBroadcasts(r.data)).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function openDetail(b) {
    const [{ data: analytics }, { data: recipientList }] = await Promise.all([
      adminApi.get(`/broadcasts/${b._id}/analytics`),
      adminApi.get(`/broadcasts/${b._id}/recipients`),
    ]);
    setDetail({ ...b, analytics });
    setRecipients(recipientList);
  }

  async function handleCancel(b) {
    if (!window.confirm('Cancel this scheduled broadcast?')) return;
    await adminApi.post(`/broadcasts/${b._id}/cancel`);
    load();
  }

  async function handleResend(b) {
    if (!window.confirm('Resend to everyone who has not opened this broadcast?')) return;
    const { data } = await adminApi.post(`/broadcasts/${b._id}/resend`);
    alert(data.message);
    load();
  }

  async function handleDuplicate(b) {
    await adminApi.post(`/broadcasts/${b._id}/duplicate`);
    load();
  }

  return (
    <div>
      <EmailBroadcastingNav />
      <h1 className="text-2xl font-extrabold text-nia-navy-dark mb-5">Broadcast History</h1>

      <div className="rounded-nia-card border border-nia-border bg-white overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-nia-panel-alt text-left text-xs font-bold uppercase tracking-wide text-nia-text-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Audience</th>
              <th className="px-4 py-3">Sent / Scheduled</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {!loading && broadcasts.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-nia-text-faint">No broadcasts yet.</td></tr>
            )}
            {broadcasts.map((b) => (
              <tr key={b._id} className="border-t border-nia-border hover:bg-nia-panel/40">
                <td className="px-4 py-3 font-medium">
                  <button onClick={() => openDetail(b)} className="text-nia-navy-dark hover:text-nia-orange hover:underline text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-nia-orange/40 rounded">{b.name}</button>
                </td>
                <td className="px-4 py-3 text-nia-text-muted">{b.subject}</td>
                <td className="px-4 py-3 text-nia-text-muted">{b.stats.totalRecipients}</td>
                <td className="px-4 py-3 text-nia-text-muted whitespace-nowrap">
                  {b.sentAt ? new Date(b.sentAt).toLocaleString() : b.scheduledAt ? new Date(b.scheduledAt).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="flex gap-1.5 justify-end">
                    {b.status === 'scheduled' && <button onClick={() => handleCancel(b)} className="rounded-nia-btn border border-nia-error px-3 py-1.5 text-xs font-semibold text-nia-error hover:bg-red-50">Cancel</button>}
                    {b.status === 'sent' && <button onClick={() => handleResend(b)} className={btnSecondary}>Resend to Unopened</button>}
                    <button onClick={() => handleDuplicate(b)} className={btnSecondary}>Duplicate</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)} width="max-w-2xl">
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              ['Sent', detail.analytics.sent],
              ['Opened', `${detail.analytics.opened} (${detail.analytics.openRate}%)`],
              ['Clicked', `${detail.analytics.clicked} (${detail.analytics.clickRate}%)`],
              ['Bounced', detail.analytics.bounced],
              ['Unsubscribed', detail.analytics.unsubscribed],
              ['Failed', detail.analytics.failed],
            ].map(([lbl, val]) => (
              <div key={lbl} className="rounded-nia-btn bg-nia-panel p-3 text-center">
                <p className="text-lg font-extrabold text-nia-navy-dark">{val}</p>
                <p className="text-xs text-nia-text-faint">{lbl}</p>
              </div>
            ))}
          </div>
          <h3 className="font-bold text-nia-navy-dark mb-2 text-sm">Recipients</h3>
          <div className="max-h-64 overflow-y-auto border border-nia-border rounded-nia-btn">
            <table className="w-full text-xs">
              <thead><tr className="bg-nia-panel-alt text-left"><th className="px-3 py-2">Email</th><th className="px-3 py-2">Status</th></tr></thead>
              <tbody>
                {recipients.map((r) => (
                  <tr key={r._id} className="border-t border-nia-border">
                    <td className="px-3 py-2">{r.email}</td>
                    <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}
