import { useEffect, useState } from 'react';
import adminApi from '../../services/adminApi';
import EmailBroadcastingNav from '../../components/admin/EmailBroadcastingNav';
import StatusBadge from '../../components/admin/StatusBadge';

const btnSecondary = 'rounded-nia-btn border border-nia-border bg-white px-3 py-1.5 text-xs font-semibold text-nia-navy-dark hover:bg-nia-panel transition-colors';

export default function SuppressionListPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    adminApi.get('/suppression-list').then((r) => setEntries(r.data)).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function handleResubscribe(entry) {
    if (!window.confirm(`Resubscribe ${entry.email}?`)) return;
    await adminApi.post(`/suppression-list/${entry._id}/resubscribe`);
    load();
  }

  return (
    <div>
      <EmailBroadcastingNav />
      <h1 className="text-2xl font-extrabold text-nia-navy-dark mb-5">Suppression List</h1>
      <p className="text-sm text-nia-text-faint mb-4">Members and addresses excluded from all future broadcasts.</p>

      <div className="rounded-nia-card border border-nia-border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-nia-panel-alt text-left text-xs font-bold uppercase tracking-wide text-nia-text-muted">
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Suppressed On</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {!loading && entries.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-nia-text-faint">No suppressed addresses.</td></tr>
            )}
            {entries.map((e) => (
              <tr key={e._id} className="border-t border-nia-border">
                <td className="px-4 py-3 text-nia-navy-dark font-medium">{e.email}</td>
                <td className="px-4 py-3 text-nia-text-muted">{e.member ? `${e.member.firstName} ${e.member.lastName}` : '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={e.reason} /></td>
                <td className="px-4 py-3 text-nia-text-muted">{new Date(e.suppressedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right"><button onClick={() => handleResubscribe(e)} className={btnSecondary}>Resubscribe</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
