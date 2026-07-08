import { useEffect, useState, useCallback } from 'react';
import adminApi from '../../services/adminApi';
import EmailBroadcastingNav from '../../components/admin/EmailBroadcastingNav';
import StatusBadge from '../../components/admin/StatusBadge';
import PageHeader from '../../components/admin/PageHeader';
import Table from '../../components/admin/Table';
import Button from '../../components/admin/Button';

const selectFilterCls = 'rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20 w-auto';

const REASON_OPTIONS = ['unsubscribed', 'bounced', 'complained', 'manual'];

export default function SuppressionListPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.get('/suppression-list', { params: { reason: reason || undefined, archived: showArchived } })
      .then((r) => setEntries(r.data))
      .finally(() => setLoading(false));
  }, [reason, showArchived]);

  useEffect(() => { load(); }, [load]);

  async function handleResubscribe(entry) {
    if (!window.confirm(`Resubscribe ${entry.email}? This removes them from the suppression list entirely.`)) return;
    await adminApi.post(`/suppression-list/${entry._id}/resubscribe`);
    load();
  }

  async function handleArchive(entry) {
    await adminApi.post(`/suppression-list/${entry._id}/archive`);
    load();
  }

  async function handleUnarchive(entry) {
    await adminApi.post(`/suppression-list/${entry._id}/unarchive`);
    load();
  }

  return (
    <div>
      <EmailBroadcastingNav />
      <PageHeader title="Suppression List" description="Members and addresses excluded from all future broadcasts." />

      <div className="flex flex-wrap gap-3 mb-4">
        <select className={selectFilterCls} value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">All reasons</option>
          {REASON_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className={selectFilterCls} value={showArchived ? 'archived' : 'active'} onChange={(e) => setShowArchived(e.target.value === 'archived')}>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <Table>
        <Table.Head>
          <Table.HeaderRow>
            <Table.Th>Email</Table.Th>
            <Table.Th>Member</Table.Th>
            <Table.Th>Reason</Table.Th>
            <Table.Th>Broadcast</Table.Th>
            <Table.Th>Suppressed On</Table.Th>
            <Table.Th></Table.Th>
          </Table.HeaderRow>
        </Table.Head>
        <Table.Body>
          {loading && <Table.Skeleton colSpan={6} />}
          {!loading && entries.length === 0 && (
            <Table.Empty colSpan={6}>{showArchived ? 'No archived entries.' : 'No suppressed addresses.'}</Table.Empty>
          )}
          {entries.map((e) => (
            <Table.Row key={e._id}>
              <Table.Cell className="font-medium text-nia-navy-dark">{e.email}</Table.Cell>
              <Table.Cell className="text-nia-text-muted">{e.member ? `${e.member.firstName} ${e.member.lastName}` : '—'}</Table.Cell>
              <Table.Cell><StatusBadge status={e.reason} /></Table.Cell>
              <Table.Cell className="text-nia-text-muted">{e.broadcast?.name || '—'}</Table.Cell>
              <Table.Cell className="text-nia-text-faint">{new Date(e.suppressedAt).toLocaleDateString()}</Table.Cell>
              <Table.Cell align="right" className="whitespace-nowrap">
                <div className="flex gap-1.5 justify-end">
                  {showArchived ? (
                    <Button variant="secondary" size="sm" onClick={() => handleUnarchive(e)}>Unarchive</Button>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => handleArchive(e)}>Archive</Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => handleResubscribe(e)}>Resubscribe</Button>
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
}
