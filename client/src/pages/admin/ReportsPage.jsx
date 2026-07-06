import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import adminApi from '../../services/adminApi';
import PageHeader from '../../components/admin/PageHeader';
import Tabs from '../../components/admin/Tabs';
import Table from '../../components/admin/Table';
import Card from '../../components/admin/Card';
import Button from '../../components/admin/Button';

const TABS = [
  { key: 'membership', label: 'Membership' },
  { key: 'events', label: 'Events' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'broadcasts', label: 'Broadcasts' },
];

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
      <PageHeader
        title="Reports"
        actions={(
          <>
            <Button variant="secondary" size="sm" onClick={() => download('csv')}><Download /> Export CSV</Button>
            <Button variant="secondary" size="sm" onClick={() => download('pdf')}><FileText /> Export PDF</Button>
          </>
        )}
      />

      <Tabs tabs={TABS} active={tab} onChange={(key) => { setData(null); setTab(key); }} />

      {loading && <p className="text-nia-text-faint">Loading…</p>}

      {!loading && data && tab === 'membership' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Card>
            <h2 className="font-bold text-nia-navy-dark mb-3">Members by Tier</h2>
            {data.tierBreakdown.map((t) => (
              <div key={t.tier} className="flex justify-between py-1.5 border-b border-nia-border last:border-0 text-sm">
                <span className="text-nia-text-muted">{t.tier}</span><span className="font-semibold text-nia-navy-dark">{t.activeMembers}</span>
              </div>
            ))}
          </Card>
          <Card>
            <h2 className="font-bold text-nia-navy-dark mb-3">Members by Status</h2>
            {data.statusBreakdown.map((s) => (
              <div key={s.status} className="flex justify-between py-1.5 border-b border-nia-border last:border-0 text-sm capitalize">
                <span className="text-nia-text-muted">{s.status}</span><span className="font-semibold text-nia-navy-dark">{s.count}</span>
              </div>
            ))}
          </Card>
        </div>
      )}

      {!loading && data && tab === 'events' && (
        <Table>
          <Table.Head>
            <Table.HeaderRow>
              <Table.Th>Title</Table.Th>
              <Table.Th>Category</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Tickets Sold</Table.Th>
              <Table.Th align="right">Revenue</Table.Th>
            </Table.HeaderRow>
          </Table.Head>
          <Table.Body>
            {data.events.map((e, i) => (
              <Table.Row key={i}>
                <Table.Cell className="font-medium text-nia-navy-dark">{e.title}</Table.Cell>
                <Table.Cell className="text-nia-text-muted">{e.category}</Table.Cell>
                <Table.Cell className="text-nia-text-muted capitalize">{e.status}</Table.Cell>
                <Table.Cell className="text-nia-text-muted">{e.ticketsSold}</Table.Cell>
                <Table.Cell align="right" className="font-semibold text-nia-navy-dark tabular-nums">€{e.revenue.toFixed(2)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      {!loading && data && tab === 'revenue' && (
        <Card>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-nia-btn bg-nia-panel p-3 text-center"><p className="text-lg font-extrabold text-nia-navy-dark">€{data.bookingRevenue.toFixed(2)}</p><p className="text-xs text-nia-text-faint">Ticket Revenue</p></div>
            <div className="rounded-nia-btn bg-nia-panel p-3 text-center"><p className="text-lg font-extrabold text-nia-navy-dark">€{data.membershipRevenue.toFixed(2)}</p><p className="text-xs text-nia-text-faint">Membership Revenue</p></div>
            <div className="rounded-nia-btn bg-nia-panel p-3 text-center"><p className="text-lg font-extrabold text-nia-orange">€{data.total.toFixed(2)}</p><p className="text-xs text-nia-text-faint">Total</p></div>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs font-semibold uppercase tracking-wide text-nia-text-faint border-b border-nia-border"><th className="py-2">Month</th><th className="py-2 text-right">Revenue</th></tr></thead>
            <tbody>{data.monthly.map((m) => <tr key={m.month} className="border-t border-nia-border/60"><td className="py-2">{m.month}</td><td className="py-2 font-semibold text-nia-navy-dark text-right tabular-nums">€{m.amount.toFixed(2)}</td></tr>)}</tbody>
          </table>
        </Card>
      )}

      {!loading && data && tab === 'broadcasts' && (
        <Table>
          <Table.Head>
            <Table.HeaderRow>
              <Table.Th>Name</Table.Th>
              <Table.Th>Sent</Table.Th>
              <Table.Th>Open Rate</Table.Th>
              <Table.Th>Click Rate</Table.Th>
            </Table.HeaderRow>
          </Table.Head>
          <Table.Body>
            {data.broadcasts.map((b, i) => (
              <Table.Row key={i}>
                <Table.Cell className="font-medium text-nia-navy-dark">{b.name}</Table.Cell>
                <Table.Cell className="text-nia-text-muted">{b.sent}</Table.Cell>
                <Table.Cell className="text-nia-text-muted">{b.openRate}%</Table.Cell>
                <Table.Cell className="text-nia-text-muted">{b.clickRate}%</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </div>
  );
}
