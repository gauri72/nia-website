import { useEffect, useState } from 'react';
import adminApi from '../../services/adminApi';
import EmailBroadcastingNav from '../../components/admin/EmailBroadcastingNav';
import StatusBadge from '../../components/admin/StatusBadge';
import Modal from '../../components/admin/Modal';
import PageHeader from '../../components/admin/PageHeader';
import Table from '../../components/admin/Table';
import Button from '../../components/admin/Button';

// Each stat tile maps to the set of recipient statuses that make up its
// number — e.g. "Sent" counts everyone who successfully received the email,
// whether or not they went on to open/click it, so its filter has to include
// those statuses too or the filtered list would look like it disagrees with
// the tile's own count.
const STAT_FILTERS = {
  sent: ['sent', 'opened', 'clicked'],
  opened: ['opened', 'clicked'],
  clicked: ['clicked'],
  bounced: ['bounced'],
  unsubscribed: ['unsubscribed'],
  failed: ['failed'],
};

export default function BroadcastHistoryPage() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [statusFilter, setStatusFilter] = useState(null);
  const [scanningBounces, setScanningBounces] = useState(false);

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
    setStatusFilter(null);
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

  async function handleResendFailed(b) {
    if (!window.confirm(`Retry sending to the ${b.stats.failed} recipient(s) whose send failed?`)) return;
    const { data } = await adminApi.post(`/broadcasts/${b._id}/resend-failed`);
    alert(data.message);
    load();
  }

  async function handleDuplicate(b) {
    await adminApi.post(`/broadcasts/${b._id}/duplicate`);
    load();
  }

  async function handleScanBounces() {
    setScanningBounces(true);
    try {
      const { data } = await adminApi.post('/broadcasts/scan-bounces');
      alert(data.message);
      load();
      if (detail) openDetail(detail);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to check for bounces');
    } finally {
      setScanningBounces(false);
    }
  }

  return (
    <div>
      <EmailBroadcastingNav />
      <PageHeader
        title="Broadcast History"
        actions={(
          <Button variant="secondary" onClick={handleScanBounces} disabled={scanningBounces}>
            {scanningBounces ? 'Checking…' : 'Check for Bounces'}
          </Button>
        )}
      />

      <Table>
        <Table.Head>
          <Table.HeaderRow>
            <Table.Th>Name</Table.Th>
            <Table.Th>Subject</Table.Th>
            <Table.Th>Audience</Table.Th>
            <Table.Th>Sent / Scheduled</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th></Table.Th>
          </Table.HeaderRow>
        </Table.Head>
        <Table.Body>
          {loading && <Table.Skeleton colSpan={6} />}
          {!loading && broadcasts.length === 0 && <Table.Empty colSpan={6}>No broadcasts yet.</Table.Empty>}
          {broadcasts.map((b) => (
            <Table.Row key={b._id}>
              <Table.Cell className="font-medium">
                <button onClick={() => openDetail(b)} className="border-0 bg-transparent text-nia-navy-dark hover:text-nia-orange hover:underline text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-nia-orange/40 rounded">{b.name}</button>
              </Table.Cell>
              <Table.Cell className="text-nia-text-muted">{b.subject}</Table.Cell>
              <Table.Cell className="text-nia-text-muted">{b.stats.totalRecipients}</Table.Cell>
              <Table.Cell className="text-nia-text-muted whitespace-nowrap">
                {b.sentAt ? new Date(b.sentAt).toLocaleString() : b.scheduledAt ? new Date(b.scheduledAt).toLocaleString() : '—'}
              </Table.Cell>
              <Table.Cell>
                <button onClick={() => openDetail(b)} className="border-0 bg-transparent p-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-nia-orange/40 rounded-full">
                  <StatusBadge status={b.status} />
                </button>
              </Table.Cell>
              <Table.Cell align="right" className="whitespace-nowrap">
                <div className="flex gap-1.5 justify-end">
                  {b.status === 'scheduled' && <Button variant="danger" size="sm" onClick={() => handleCancel(b)}>Cancel</Button>}
                  {b.status === 'sent' && <Button variant="secondary" size="sm" onClick={() => handleResend(b)}>Resend to Unopened</Button>}
                  {b.status === 'sent' && b.stats.failed > 0 && <Button variant="secondary" size="sm" onClick={() => handleResendFailed(b)}>Retry Failed ({b.stats.failed})</Button>}
                  <Button variant="secondary" size="sm" onClick={() => handleDuplicate(b)}>Duplicate</Button>
                </div>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      {detail && (() => {
        const filteredRecipients = statusFilter
          ? recipients.filter((r) => STAT_FILTERS[statusFilter].includes(r.status))
          : recipients;

        return (
          <Modal title={detail.name} onClose={() => setDetail(null)} width="max-w-2xl">
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                ['sent', 'Sent', detail.analytics.sent],
                ['opened', 'Opened', `${detail.analytics.opened} (${detail.analytics.openRate}%)`],
                ['clicked', 'Clicked', `${detail.analytics.clicked} (${detail.analytics.clickRate}%)`],
                ['bounced', 'Bounced', detail.analytics.bounced],
                ['unsubscribed', 'Unsubscribed', detail.analytics.unsubscribed],
                ['failed', 'Failed', detail.analytics.failed],
              ].map(([key, lbl, val]) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter((f) => (f === key ? null : key))}
                  className={`rounded-nia-btn p-3 text-center cursor-pointer border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-nia-orange/40 ${
                    statusFilter === key ? 'bg-nia-orange/10 border-nia-orange' : 'bg-nia-panel border-transparent hover:border-nia-border'
                  }`}
                >
                  <p className="text-lg font-extrabold text-nia-navy-dark">{val}</p>
                  <p className="text-xs text-nia-text-faint">{lbl}</p>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-nia-navy-dark text-sm">
                Recipients {statusFilter && <span className="font-normal text-nia-text-faint">— {statusFilter} ({filteredRecipients.length})</span>}
              </h3>
              {statusFilter && (
                <button onClick={() => setStatusFilter(null)} className="text-xs text-nia-orange border-0 bg-transparent cursor-pointer hover:underline focus:outline-none">
                  Clear filter
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto">
              <Table bare>
                <Table.Head>
                  <Table.HeaderRow>
                    <Table.Th className="text-xs">Email</Table.Th>
                    <Table.Th className="text-xs">Status</Table.Th>
                  </Table.HeaderRow>
                </Table.Head>
                <Table.Body>
                  {filteredRecipients.length === 0 && <Table.Empty colSpan={2}>No recipients match this filter.</Table.Empty>}
                  {filteredRecipients.map((r) => (
                    <Table.Row key={r._id}>
                      <Table.Cell className="text-xs">{r.email}</Table.Cell>
                      <Table.Cell className="text-xs"><StatusBadge status={r.status} /></Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
