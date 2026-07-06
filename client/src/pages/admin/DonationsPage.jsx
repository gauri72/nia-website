import { useEffect, useState } from 'react';
import { Heart, Euro, Search } from 'lucide-react';
import adminApi from '../../services/adminApi';
import StatusBadge from '../../components/admin/StatusBadge';
import StatCard from '../../components/admin/StatCard';
import PageHeader from '../../components/admin/PageHeader';
import Table from '../../components/admin/Table';
import Button from '../../components/admin/Button';

const inputCls = 'w-full rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20';

function formatCause(cause) {
  return cause.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

export default function DonationsPage() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');

  function load() {
    setData(null);
    adminApi.get('/admin/donations', { params: { search: search || undefined } }).then((r) => setData(r.data));
  }
  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader title="Donations" description="Paid donations made through the public website." />

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <StatCard icon={Heart} label="Paid Donations" value={data.summary.paidCount} tone="orange" />
          <StatCard icon={Euro} label="Total Raised" value={`€${data.summary.revenue.toFixed(2)}`} tone="green" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-nia-text-faint text-xs" />
          <input
            className={`${inputCls} pl-8`}
            placeholder="Search name, email…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
        </div>
        <Button variant="secondary" onClick={load}>Search</Button>
      </div>

      <Table>
        <Table.Head>
          <Table.HeaderRow>
            <Table.Th>Reference</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Cause</Table.Th>
            <Table.Th align="right">Amount</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Date</Table.Th>
          </Table.HeaderRow>
        </Table.Head>
        <Table.Body>
          {!data && <Table.Skeleton colSpan={7} />}
          {data && data.items.length === 0 && <Table.Empty colSpan={7}>No paid donations found.</Table.Empty>}
          {data?.items.map((d) => (
            <Table.Row key={d._id}>
              <Table.Cell className="font-mono text-xs text-nia-text-faint">{d.referenceNumber}</Table.Cell>
              <Table.Cell className="font-medium text-nia-navy-dark">{d.name}</Table.Cell>
              <Table.Cell className="text-nia-text-faint">{d.email}</Table.Cell>
              <Table.Cell className="text-nia-text-muted">{formatCause(d.cause)}</Table.Cell>
              <Table.Cell align="right" className="font-semibold text-nia-navy-dark tabular-nums">€{d.amount.toFixed(2)}</Table.Cell>
              <Table.Cell><StatusBadge status={d.donation_status} /></Table.Cell>
              <Table.Cell className="text-nia-text-faint">{new Date(d.paid_at || d.createdAt).toLocaleDateString()}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
}
