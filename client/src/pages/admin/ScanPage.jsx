import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { ScanLine, CheckCircle2, XCircle, AlertTriangle, Search, Ticket, IdCard, Clock } from 'lucide-react';
import adminApi from '../../services/adminApi';
import PageHeader from '../../components/admin/PageHeader';
import Button from '../../components/admin/Button';

const READER_ID = 'nia-scan-reader';

export default function ScanPage() {
  const [manualCode, setManualCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { kind: 'lookup'|'checked-in'|'error', type, valid, alreadyCheckedIn, reason, data, message }
  const [stats, setStats] = useState(null);
  const [recentLog, setRecentLog] = useState([]);
  const scannerRef = useRef(null);
  const resultRef = useRef(null); // mirrors `result` so the scan callback (captured once) always sees the latest value

  useEffect(() => { resultRef.current = result; }, [result]);

  const loadStats = useCallback(() => {
    adminApi.get('/admin/scan/stats').then((r) => setStats(r.data)).catch(() => {});
    adminApi.get('/admin/scan/log', { params: { limit: 10 } }).then((r) => setRecentLog(r.data)).catch(() => {});
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const handleCode = useCallback(async (rawCode) => {
    const code = rawCode.trim();
    if (!code) return;
    setBusy(true);
    try {
      const { data } = await adminApi.post('/admin/scan/lookup', { code });
      setResult({ kind: 'lookup', code, ...data });
    } catch (err) {
      setResult({ kind: 'error', code, message: err.response?.data?.error || 'Lookup failed' });
    } finally {
      setBusy(false);
    }
  }, []);

  // Mount the camera scanner once — html5-qrcode owns this DOM region and
  // manages its own camera-permission UI, so this only needs to run on
  // mount/unmount, not on every render.
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      READER_ID,
      { fps: 10, qrbox: 250, supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA], rememberLastUsedCamera: true },
      false,
    );
    scanner.render(
      (decodedText) => {
        // Ignore repeat frames of the same code while a result is already
        // on screen — otherwise every frame re-triggers a lookup.
        if (resultRef.current && resultRef.current.code === decodedText.trim()) return;
        handleCode(decodedText);
      },
      () => {}, // per-frame "no code found" callback — expected constantly, nothing to do
    );
    scannerRef.current = scanner;

    return () => {
      scannerRef.current?.clear().catch(() => {});
    };
  }, [handleCode]);

  async function handleManualSubmit(e) {
    e.preventDefault();
    await handleCode(manualCode);
    setManualCode('');
  }

  async function handleConfirmCheckIn() {
    if (!result?.code) return;
    setBusy(true);
    try {
      const { data } = await adminApi.post('/admin/scan/check-in', { code: result.code });
      setResult({ kind: 'checked-in', code: result.code, ...data });
      loadStats();
    } catch (err) {
      setResult({ kind: 'error', code: result.code, message: err.response?.data?.error || 'Check-in failed' });
    } finally {
      setBusy(false);
    }
  }

  function scanNext() {
    setResult(null);
  }

  return (
    <div>
      <PageHeader title="Ticket & Membership Scanning" description="Scan a ticket QR code or member ID to check attendees in at the door." />

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatTile icon={Ticket} label="Tickets Checked In" value={`${stats.checkedInOrders} / ${stats.totalOrders}`} />
          <StatTile icon={CheckCircle2} label="Seats Sold" value={stats.totalTickets} />
          <StatTile icon={IdCard} label="Member Scans" value={stats.memberScans} />
          <StatTile icon={Clock} label="Last Scan" value={recentLog[0] ? new Date(recentLog[0].scannedAt).toLocaleTimeString() : '—'} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <div className="rounded-nia-card border border-nia-border bg-white p-4 mb-4">
            <h3 className="font-bold text-nia-navy-dark text-sm mb-3 flex items-center gap-2"><ScanLine className="text-nia-orange" /> Camera Scanner</h3>
            <div id={READER_ID} />
          </div>

          <form onSubmit={handleManualSubmit} className="rounded-nia-card border border-nia-border bg-white p-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-nia-text-faint text-xs" />
              <input
                className="w-full rounded-nia-btn border border-nia-border py-2 pl-8 pr-3 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20"
                placeholder="Type ticket # or member ID (e.g. NIA-TKT-XXXXXXXX)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary" disabled={busy || !manualCode.trim()}>Look Up</Button>
          </form>
        </div>

        <div>
          {result ? (
            <ResultCard result={result} busy={busy} onConfirm={handleConfirmCheckIn} onNext={scanNext} />
          ) : (
            <div className="rounded-nia-card border border-dashed border-nia-border bg-nia-panel p-8 text-center text-nia-text-faint text-sm">
              Scan a code or enter one manually to see attendee details here.
            </div>
          )}

          <div className="rounded-nia-card border border-nia-border bg-white p-4 mt-4">
            <h3 className="font-bold text-nia-navy-dark text-sm mb-3">Recent Scans</h3>
            {recentLog.length === 0 && <p className="text-xs text-nia-text-faint">No scans yet.</p>}
            <div className="flex flex-col gap-2">
              {recentLog.map((entry) => (
                <div key={entry._id} className="flex items-center justify-between text-sm border-b border-nia-border last:border-0 pb-2 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium text-nia-navy-dark truncate">{entry.name || entry.email}</p>
                    <p className="text-xs text-nia-text-faint">{entry.type === 'ticket' ? 'Ticket' : 'Member'} &middot; {entry.code}</p>
                  </div>
                  <span className="text-xs text-nia-text-faint whitespace-nowrap ml-2">{new Date(entry.scannedAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-nia-card border border-nia-border bg-white p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-nia-orange/10 flex items-center justify-center flex-shrink-0">
        <Icon className="text-nia-orange text-base" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-extrabold text-nia-navy-dark leading-tight truncate">{value}</p>
        <p className="text-xs text-nia-text-faint">{label}</p>
      </div>
    </div>
  );
}

function ResultCard({ result, busy, onConfirm, onNext }) {
  if (result.kind === 'error') {
    return (
      <StatusPanel tone="red" icon={XCircle} title="Not Found" subtitle={result.message}>
        <Button variant="secondary" onClick={onNext}>Scan Next</Button>
      </StatusPanel>
    );
  }

  if (result.kind === 'checked-in') {
    const tone = result.alreadyCheckedIn ? 'amber' : 'green';
    const title = result.alreadyCheckedIn ? 'Already Checked In' : 'Checked In';
    return (
      <StatusPanel tone={tone} icon={result.alreadyCheckedIn ? AlertTriangle : CheckCircle2} title={title}>
        <AttendeeDetails type={result.type} data={result.data} />
        <Button variant="secondary" onClick={onNext} className="mt-3">Scan Next</Button>
      </StatusPanel>
    );
  }

  // kind === 'lookup'
  if (!result.valid) {
    return (
      <StatusPanel tone="red" icon={XCircle} title="Invalid" subtitle={result.reason}>
        <AttendeeDetails type={result.type} data={result.data} />
        <Button variant="secondary" onClick={onNext} className="mt-3">Scan Next</Button>
      </StatusPanel>
    );
  }

  if (result.alreadyCheckedIn) {
    return (
      <StatusPanel tone="amber" icon={AlertTriangle} title="Already Checked In" subtitle={result.data?.checkedInAt ? `at ${new Date(result.data.checkedInAt).toLocaleTimeString()}` : undefined}>
        <AttendeeDetails type={result.type} data={result.data} />
        <Button variant="secondary" onClick={onNext} className="mt-3">Scan Next</Button>
      </StatusPanel>
    );
  }

  return (
    <StatusPanel tone="green" icon={CheckCircle2} title={result.type === 'ticket' ? 'Valid Ticket' : 'Valid Member'}>
      <AttendeeDetails type={result.type} data={result.data} />
      <div className="flex gap-2 mt-3">
        <Button variant="primary" onClick={onConfirm} disabled={busy}>{busy ? 'Checking In…' : 'Confirm Check-In'}</Button>
        <Button variant="secondary" onClick={onNext}>Cancel</Button>
      </div>
    </StatusPanel>
  );
}

const TONES = {
  green: { bg: 'bg-nia-success/10', border: 'border-nia-success', text: 'text-nia-success' },
  amber: { bg: 'bg-nia-warning/10', border: 'border-nia-warning', text: 'text-nia-warning' },
  red: { bg: 'bg-nia-error/10', border: 'border-nia-error', text: 'text-nia-error' },
};

function StatusPanel({ tone, icon: Icon, title, subtitle, children }) {
  const t = TONES[tone];
  return (
    <div className={`rounded-nia-card border-2 ${t.border} ${t.bg} p-5`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`${t.text} text-xl`} />
        <h3 className={`font-extrabold text-lg ${t.text}`}>{title}</h3>
      </div>
      {subtitle && <p className="text-sm text-nia-text-muted mb-3">{subtitle}</p>}
      {children}
    </div>
  );
}

function AttendeeDetails({ type, data }) {
  if (!data) return null;
  return (
    <div className="bg-white/70 rounded-nia-btn p-3 mt-2 text-sm">
      <p className="font-bold text-nia-navy-dark">{data.name}</p>
      <p className="text-nia-text-muted">{data.email}</p>
      {type === 'ticket' && (
        <>
          <p className="text-xs text-nia-text-faint mt-1">{data.ticketNumber}</p>
          <ul className="mt-2 text-xs text-nia-text-muted">
            {data.lines?.map((l, i) => (
              <li key={i}>{l.ticket_type} &times; {l.quantity}</li>
            ))}
          </ul>
          {data.attendeeNames && <p className="text-xs text-nia-text-faint mt-1">Attendees: {data.attendeeNames}</p>}
        </>
      )}
      {type === 'member' && (
        <>
          <p className="text-xs text-nia-text-faint mt-1">{data.memberId}</p>
          <p className="text-xs text-nia-text-muted mt-1">{data.membershipTier || 'No tier'} &middot; {data.membershipStatus}</p>
        </>
      )}
    </div>
  );
}
