import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { ScanLine, CheckCircle2, XCircle, AlertTriangle, LogOut, Ticket, IdCard } from 'lucide-react';
import adminApi from '../../services/adminApi';
import Button from '../../components/admin/Button';
import { useAdminAuth } from '../../context/AdminAuthContext';

const READER_ID = 'nia-checkin-reader';

// Mobile-first standalone scanner for door staff — same lookup/check-in
// endpoints and logic as the full admin ScanPage.jsx, stripped of every
// other admin page/nav so this can be installed and opened straight into
// scanning. See client/src/pages/admin/ScanPage.jsx for the source of truth
// this was ported from.
export default function CheckinScanPage() {
  const { admin, logout } = useAdminAuth();
  const [manualCode, setManualCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState(null);
  const scannerRef = useRef(null);
  const resultRef = useRef(null);

  useEffect(() => { resultRef.current = result; }, [result]);

  const loadStats = useCallback(() => {
    adminApi.get('/admin/scan/stats').then((r) => setStats(r.data)).catch(() => {});
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
      setResult({ kind: 'error', code, message: err.response?.data?.error || 'Lookup failed — check your connection and try again' });
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      READER_ID,
      { fps: 10, qrbox: 240, supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA], rememberLastUsedCamera: true },
      false,
    );
    scanner.render(
      (decodedText) => {
        if (resultRef.current && resultRef.current.code === decodedText.trim()) return;
        handleCode(decodedText);
      },
      () => {},
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
      setResult({ kind: 'error', code: result.code, message: err.response?.data?.error || 'Check-in failed — check your connection and try again' });
    } finally {
      setBusy(false);
    }
  }

  function scanNext() {
    setResult(null);
  }

  return (
    <div className="min-h-screen bg-nia-panel flex flex-col">
      <div className="bg-nia-navy-dark text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="font-bold text-sm leading-tight">NIA Check-In</p>
          <p className="text-xs text-white/70 leading-tight">{admin?.email}</p>
        </div>
        <button onClick={logout} className="text-white/80 hover:text-white p-2" aria-label="Log out">
          <LogOut />
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-2 px-3 pt-3 flex-shrink-0">
          <StatTile icon={Ticket} label="Attendees In" value={`${stats.checkedInTickets} / ${stats.totalTickets}`} />
          <StatTile icon={IdCard} label="Member Scans" value={stats.memberScans} />
        </div>
      )}

      <div className="flex-1 px-3 py-3 flex flex-col gap-3">
        {result ? (
          <ResultCard result={result} busy={busy} onConfirm={handleConfirmCheckIn} onNext={scanNext} />
        ) : (
          <>
            <div className="rounded-nia-card border border-nia-border bg-white p-3">
              <h3 className="font-bold text-nia-navy-dark text-sm mb-2 flex items-center gap-2"><ScanLine className="text-nia-orange" /> Scan a QR Code</h3>
              <div id={READER_ID} />
            </div>

            <form onSubmit={handleManualSubmit} className="rounded-nia-card border border-nia-border bg-white p-3 flex gap-2">
              <input
                className="w-full rounded-nia-btn border border-nia-border py-2.5 px-3 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20"
                placeholder="Or type ticket # / member ID"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
              <Button type="submit" variant="secondary" disabled={busy || !manualCode.trim()}>Go</Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-nia-card border border-nia-border bg-white p-3 flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-nia-orange/10 flex items-center justify-center flex-shrink-0">
        <Icon className="text-nia-orange text-base" />
      </div>
      <div className="min-w-0">
        <p className="text-base font-extrabold text-nia-navy-dark leading-tight truncate">{value}</p>
        <p className="text-[11px] text-nia-text-faint leading-tight">{label}</p>
      </div>
    </div>
  );
}

function ResultCard({ result, busy, onConfirm, onNext }) {
  if (result.kind === 'error') {
    return (
      <StatusPanel tone="red" icon={XCircle} title="Not Found" subtitle={result.message}>
        <Button variant="secondary" onClick={onNext} className="w-full mt-3">Scan Next</Button>
      </StatusPanel>
    );
  }

  if (result.kind === 'checked-in') {
    const tone = result.alreadyCheckedIn ? 'amber' : 'green';
    const title = result.alreadyCheckedIn ? 'Already Checked In' : 'Checked In';
    return (
      <StatusPanel tone={tone} icon={result.alreadyCheckedIn ? AlertTriangle : CheckCircle2} title={title}>
        <AttendeeDetails type={result.type} data={result.data} />
        <Button variant="secondary" onClick={onNext} className="w-full mt-3">Scan Next</Button>
      </StatusPanel>
    );
  }

  if (!result.valid) {
    return (
      <StatusPanel tone="red" icon={XCircle} title="Invalid" subtitle={result.reason}>
        <AttendeeDetails type={result.type} data={result.data} />
        <Button variant="secondary" onClick={onNext} className="w-full mt-3">Scan Next</Button>
      </StatusPanel>
    );
  }

  if (result.alreadyCheckedIn) {
    return (
      <StatusPanel tone="amber" icon={AlertTriangle} title="Already Checked In" subtitle={result.data?.checkedInAt ? `at ${new Date(result.data.checkedInAt).toLocaleTimeString()}` : undefined}>
        <AttendeeDetails type={result.type} data={result.data} />
        <Button variant="secondary" onClick={onNext} className="w-full mt-3">Scan Next</Button>
      </StatusPanel>
    );
  }

  return (
    <StatusPanel tone="green" icon={CheckCircle2} title={result.type === 'ticket' ? 'Valid Ticket' : 'Valid Member'}>
      <AttendeeDetails type={result.type} data={result.data} />
      <div className="flex flex-col gap-2 mt-3">
        <Button variant="primary" onClick={onConfirm} disabled={busy} className="w-full">{busy ? 'Checking In…' : 'Confirm Check-In'}</Button>
        <Button variant="secondary" onClick={onNext} className="w-full">Cancel</Button>
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
    <div className={`rounded-nia-card border-2 ${t.border} ${t.bg} p-4`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`${t.text} text-xl`} />
        <h3 className={`font-extrabold text-lg ${t.text}`}>{title}</h3>
      </div>
      {subtitle && <p className="text-sm text-nia-text-muted mb-2">{subtitle}</p>}
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

          {data.scannedUnit && (
            <p className="text-xs font-semibold text-nia-navy-dark mt-2 bg-nia-panel rounded px-2 py-1">
              This code: {data.scannedUnit.attendeeName || data.scannedUnit.ticketType} ({data.scannedUnit.ticketType})
            </p>
          )}

          {data.unitsTotal != null && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-nia-navy-dark">
                {data.unitsCheckedIn} of {data.unitsTotal} attendees checked in
              </p>
              <ul className="mt-1 text-xs text-nia-text-muted">
                {data.units.map((u) => (
                  <li key={u.unitNumber} className="flex items-center justify-between">
                    <span>{u.attendeeName || u.ticketType} &middot; {u.ticketType}</span>
                    <span className={u.checkedInAt ? 'text-nia-success font-semibold' : 'text-nia-text-faint'}>
                      {u.checkedInAt ? 'In' : 'Not yet'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
