import { useEffect, useState } from 'react';
import { Download, CheckCircle2 } from 'lucide-react';
import memberApi from '../../services/memberApi';
import { useMemberAuth } from '../../context/MemberAuthContext';
import StatusBadge from '../../components/admin/StatusBadge';
import PageHeader from '../../components/admin/PageHeader';
import Card from '../../components/admin/Card';
import Button from '../../components/admin/Button';
import Table from '../../components/admin/Table';

function goToCheckout(paymentId, checkoutUrl) {
  sessionStorage.setItem('nia_pending_payment_id', paymentId);
  window.location.href = checkoutUrl;
}

export default function MyMembershipPage() {
  const { refresh } = useMemberAuth();
  const [status, setStatus] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function load() {
    memberApi.get('/member/membership').then((r) => setStatus(r.data));
    memberApi.get('/membership-tiers').then((r) => setTiers(r.data));
  }
  useEffect(() => { load(); }, []);

  async function handleRenew() {
    setBusy(true); setError('');
    try {
      const { data } = await memberApi.post('/member/membership/renew');
      goToCheckout(data.paymentId, data.checkoutUrl);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start renewal');
      setBusy(false);
    }
  }

  async function handleJoinOrUpgrade(tierId) {
    setBusy(true); setError('');
    try {
      const { data } = await memberApi.post('/member/membership/upgrade', { tierId });
      goToCheckout(data.paymentId, data.checkoutUrl);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start payment');
      setBusy(false);
    }
  }

  async function toggleAutoRenew() {
    const { data } = await memberApi.patch('/member/membership/auto-renew', { autoRenew: !status.autoRenew });
    setStatus((s) => ({ ...s, autoRenew: data.autoRenew }));
    refresh();
  }

  function downloadCard() {
    const token = localStorage.getItem('nia_member_token');
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5050/api'}/member/membership/card.pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.blob()).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'NIA-Membership-Card.pdf'; a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (!status) return <div className="text-nia-text-muted">Loading…</div>;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My Membership" />
      {error && <div className="rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}

      {status.membershipTier ? (
        <Card>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div>
              <p className="text-xs font-semibold text-nia-text-faint uppercase">Current Tier</p>
              <p className="text-2xl font-extrabold text-nia-navy">{status.membershipTier.name}</p>
            </div>
            <StatusBadge status={status.membershipStatus} />
          </div>
          {status.membershipExpiresAt && (
            <p className="text-sm text-nia-text-muted mb-3">Valid until <strong>{new Date(status.membershipExpiresAt).toLocaleDateString()}</strong></p>
          )}
          <label className="flex items-center gap-2 text-sm text-nia-text-muted mb-4">
            <input type="checkbox" checked={status.autoRenew} onChange={toggleAutoRenew} /> Auto-renewal enabled
          </label>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" disabled={busy} onClick={handleRenew}>Renew Membership</Button>
            <Button variant="secondary" onClick={downloadCard}><Download />Download Card</Button>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-nia-text-muted">You don't have an active membership yet. Choose a tier below to join.</p>
        </Card>
      )}

      <div>
        <h2 className="font-bold text-nia-navy-dark mb-3">{status.membershipTier ? 'Upgrade Your Tier' : 'Available Tiers'}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiers.filter((t) => t._id !== status.membershipTier?._id).map((t) => (
            <Card key={t._id} className="flex flex-col gap-2" style={{ borderTop: `4px solid ${t.color}` }}>
              <h3 className="font-bold text-nia-navy-dark">{t.name}</h3>
              <p className="text-2xl font-extrabold text-nia-orange">€{t.price}<span className="text-sm font-medium text-nia-text-faint">/{t.billingPeriod === 'annual' ? 'yr' : 'mo'}</span></p>
              <p className="text-sm text-nia-text-muted">{t.description}</p>
              <ul className="text-sm text-nia-text-muted flex flex-col gap-1 flex-1">
                {t.benefits.map((b, i) => <li key={i} className="flex items-start gap-1.5"><CheckCircle2 className="text-nia-success mt-0.5 flex-shrink-0 text-xs" />{b}</li>)}
              </ul>
              <Button variant="primary" disabled={busy} onClick={() => handleJoinOrUpgrade(t._id)} className="mt-2">
                {status.membershipTier ? 'Upgrade' : 'Join'}
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {status.history.length > 0 && (
        <Card padded={false}>
          <div className="p-5 pb-0">
            <h2 className="font-bold text-nia-navy-dark mb-3">Membership History</h2>
          </div>
          <Table bare>
            <Table.Head>
              <Table.HeaderRow>
                <Table.Th>Tier</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th align="right">Amount</Table.Th>
                <Table.Th>Date</Table.Th>
              </Table.HeaderRow>
            </Table.Head>
            <Table.Body>
              {status.history.map((h) => (
                <Table.Row key={h._id}>
                  <Table.Cell>{h.membershipTier?.name}</Table.Cell>
                  <Table.Cell className="capitalize text-nia-text-muted">{h.type}</Table.Cell>
                  <Table.Cell align="right" className="font-semibold text-nia-navy-dark tabular-nums">€{h.amount.toFixed(2)}</Table.Cell>
                  <Table.Cell className="text-nia-text-faint">{new Date(h.paid_at).toLocaleDateString()}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card>
      )}
    </div>
  );
}
