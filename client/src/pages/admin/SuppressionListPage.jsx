import { useEffect, useState } from 'react';
import adminApi from '../../services/adminApi';
import EmailBroadcastingNav from '../../components/admin/EmailBroadcastingNav';
import StatusBadge from '../../components/admin/StatusBadge';
import PageHeader from '../../components/admin/PageHeader';
import Table from '../../components/admin/Table';
import Button from '../../components/admin/Button';

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
      <PageHeader title="Suppression List" description="Members and addresses excluded from all future broadcasts." />

      <Table>
        <Table.Head>
          <Table.HeaderRow>
            <Table.Th>Email</Table.Th>
            <Table.Th>Member</Table.Th>
            <Table.Th>Reason</Table.Th>
            <Table.Th>Suppressed On</Table.Th>
            <Table.Th></Table.Th>
          </Table.HeaderRow>
        </Table.Head>
        <Table.Body>
          {loading && <Table.Skeleton colSpan={5} />}
          {!loading && entries.length === 0 && <Table.Empty colSpan={5}>No suppressed addresses.</Table.Empty>}
          {entries.map((e) => (
            <Table.Row key={e._id}>
              <Table.Cell className="font-medium text-nia-navy-dark">{e.email}</Table.Cell>
              <Table.Cell className="text-nia-text-muted">{e.member ? `${e.member.firstName} ${e.member.lastName}` : '—'}</Table.Cell>
              <Table.Cell><StatusBadge status={e.reason} /></Table.Cell>
              <Table.Cell className="text-nia-text-faint">{new Date(e.suppressedAt).toLocaleDateString()}</Table.Cell>
              <Table.Cell align="right"><Button variant="secondary" size="sm" onClick={() => handleResubscribe(e)}>Resubscribe</Button></Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
}
