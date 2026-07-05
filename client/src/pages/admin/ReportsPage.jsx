import { useEffect, useState } from 'react';
import { FaDownload, FaFilePdf } from 'react-icons/fa';
import adminApi from '../../services/adminApi';

const TABS = [
  { key: 'membership', label: 'Membership' },
  { key: 'events', label: 'Events' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'broadcasts', label: 'Broadcasts' },
];
const btnSecondary = 'rounded-nia-btn border border-nia-border bg-white px-3 py-1.5 text-xs font-semibold text-nia-navy-dark hover:bg-nia-panel transition-colors';

export default function ReportsPage() {
  const [tab, setTab] = useState('membership');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(null);
    adminApi.get(`/admin/reports/${tab}`).then((r) => setData(r.data)).finally(() => setLoading(false));
  }, [tab]);

  function download(format) {
    const token = localStorage.getItem('nia_admin_token');
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/admin/reports/${tab}/export?format=${format}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.blob()).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${tab}-report.${format}`; a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-extrabold text-nia-navy-dark">Reports</h1>
        <div className="flex gap-2">
          <button onClick={() => download('csv')} className={btnSecondary}><FaDownload className="inline mr-1.5" />Export CSV</button>
          <button onClick={() => download('pdf')} className={btnSecondary}><FaFilePdf className="inline mr-1.5" />Export PDF</button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-nia-border mb-5">
        {TABS.map((t) => (
          <button
            key={t.key} onClick={() => { setData(null); setTab(t.key); }}
            className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === t.key ? 'border-nia-orange text-nia-navy-dark' : 'border-transparent text-nia-text-muted hover:text-nia-navy-dark'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-nia-text-faint">Loading…</p>}

      {!loading && data && tab === 'membership' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="rounded-nia-card border border-nia-border bg-white p-5">
            <h2 className="font-bold text-nia-navy-dark mb-3">Members by Tier</h2>
            {data.tierBreakdown.map((t) => (
              <div key={t.tier} className="flex justify-between py-1.5 border-b border-nia-border last:border-0 text-sm">
                <span className="text-nia-text-muted">{t.tier}</span><span className="font-semibold text-nia-navy-dark">{t.activeMembers}</span>
              </div>
            ))}
          </div>
          <div className="rounded-nia-card border border-nia-border bg-white p-5">
            <h2 className="font-bold text-nia-navy-dark mb-3">Members by Status</h2>
            {data.statusBreakdown.map((s) => (
              <div key={s.status} className="flex justify-between py-1.5 border-b border-nia-border last:border-0 text-sm capitalize">
                <span className="text-nia-text-muted">{s.status}</span><span className="font-semibold text-nia-navy-dark">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && data && tab === 'events' && (
        <div className="rounded-nia-card border border-nia-border bg-white overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-nia-panel-alt text-left text-xs font-bold uppercase text-nia-text-muted"><th className="px-4 py-3">Title</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Tickets Sold</th><th className="px-4 py-3">Revenue</th></tr></thead>
            <tbody>
              {data.events.map((e, i) => (
                <tr key={i} className="border-t border-nia-border">
                  <td className="px-4 py-2.5 font-medium text-nia-navy-dark">{e.title}</td>
                  <td className="px-4 py-2.5 text-nia-text-muted">{e.category}</td>
                  <td className="px-4 py-2.5 text-nia-text-muted capitalize">{e.status}</td>
                  <td className="px-4 py-2.5 text-nia-text-muted">{e.ticketsSold}</td>
                  <td className="px-4 py-2.5 text-nia-text-muted">€{e.revenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && data && tab === 'revenue' && (
        <div className="rounded-nia-card border border-nia-border bg-white p-5">
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-nia-btn bg-nia-panel p-3 text-center"><p className="text-lg font-extrabold text-nia-navy-dark">€{data.bookingRevenue.toFixed(2)}</p><p className="text-xs text-nia-text-faint">Ticket Revenue</p></div>
            <div className="rounded-nia-btn bg-nia-panel p-3 text-center"><p className="text-lg font-extrabold text-nia-navy-dark">€{data.membershipRevenue.toFixed(2)}</p><p className="text-xs text-nia-text-faint">Membership Revenue</p></div>
            <div className="rounded-nia-btn bg-nia-panel p-3 text-center"><p className="text-lg font-extrabold text-nia-orange">€{data.total.toFixed(2)}</p><p className="text-xs text-nia-text-faint">Total</p></div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs font-bold uppercase text-nia-text-muted"><th className="py-2">Month</th><th className="py-2">Revenue</th></tr></thead>
            <tbody>{data.monthly.map((m) => <tr key={m.month} className="border-t border-nia-border"><td className="py-2">{m.month}</td><td className="py-2">€{m.amount.toFixed(2)}</td></tr>)}</tbody>
          </table>
        </div>
      )}

      {!loading && data && tab === 'broadcasts' && (
        <div className="rounded-nia-card border border-nia-border bg-white overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-nia-panel-alt text-left text-xs font-bold uppercase text-nia-text-muted"><th className="px-4 py-3">Name</th><th className="px-4 py-3">Sent</th><th className="px-4 py-3">Open Rate</th><th className="px-4 py-3">Click Rate</th></tr></thead>
            <tbody>
              {data.broadcasts.map((b, i) => (
                <tr key={i} className="border-t border-nia-border">
                  <td className="px-4 py-2.5 font-medium text-nia-navy-dark">{b.name}</td>
                  <td className="px-4 py-2.5 text-nia-text-muted">{b.sent}</td>
                  <td className="px-4 py-2.5 text-nia-text-muted">{b.openRate}%</td>
                  <td className="px-4 py-2.5 text-nia-text-muted">{b.clickRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
