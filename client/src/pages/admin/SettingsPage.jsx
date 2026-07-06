import { useEffect, useState } from 'react';
import { Plug, CheckCircle2 } from 'lucide-react';
import adminApi from '../../services/adminApi';
import PageHeader from '../../components/admin/PageHeader';
import Card from '../../components/admin/Card';
import Button from '../../components/admin/Button';

const inputCls = 'w-full rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20';
const label = 'text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-1 block';

export default function AdminSettingsPage() {
  const [status, setStatus] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  function loadStatus() {
    adminApi.get('/admin/mollie/status').then((r) => setStatus(r.data)).catch(() => {});
  }

  useEffect(() => { loadStatus(); }, []);

  async function handleConnect(e) {
    e.preventDefault();
    setConnecting(true);
    setError('');
    try {
      await adminApi.post('/admin/mollie/connect', { apiKey });
      setApiKey('');
      loadStatus();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not connect to Mollie');
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div>
      <PageHeader title="Settings" description="Organization and integration settings." />

      <Card className="max-w-xl">
        <h2 className="font-bold text-nia-navy-dark mb-1 flex items-center gap-2"><Plug /> Mollie Integration</h2>
        <p className="text-xs text-nia-text-faint mb-4">Connect a Mollie API key to enable transaction import and the real-time payment webhook.</p>

        {status?.connected && (
          <div className="mb-4 rounded-nia-btn bg-nia-success/10 border border-nia-success/30 px-3 py-2.5 text-sm text-nia-navy-dark flex items-start gap-2">
            <CheckCircle2 className="text-nia-success mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Connected — {status.accountName}</p>
              <p className="text-xs text-nia-text-muted capitalize">{status.mode} mode · connected {new Date(status.connectedAt).toLocaleString()}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleConnect} className="flex flex-col gap-3">
          <div>
            <label className={label}>Mollie API Key</label>
            <input
              className={inputCls}
              type="password"
              placeholder="live_... or test_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
            <p className="text-[11px] text-nia-text-faint mt-1">Stored encrypted at rest — never shown again after saving. Mode (live/test) is detected automatically from the key prefix.</p>
          </div>
          {error && <p className="text-sm text-nia-error">{error}</p>}
          <Button type="submit" variant="primary" disabled={connecting} className="self-start">
            {connecting ? 'Connecting…' : status?.connected ? 'Update Connection' : 'Test & Connect'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
