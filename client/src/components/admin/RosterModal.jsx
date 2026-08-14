import { useEffect, useState } from 'react';
import { CheckCircle2, Undo2 } from 'lucide-react';
import adminApi from '../../services/adminApi';
import Modal from './Modal';
import Button from './Button';

// Backs every clickable stat tile on both scan pages (admin dashboard +
// check-in PWA) — fetches /admin/scan/roster?type=X, splits into checked-in
// vs not, and lets an admin check someone in or undo a mistake straight
// from the list without needing to scan/type their code.
export default function RosterModal({ title, type, onClose, onChanged }) {
  const [rows, setRows] = useState(null);
  const [busyCode, setBusyCode] = useState(null);
  const [error, setError] = useState('');

  function load() {
    adminApi.get('/admin/scan/roster', { params: { type } }).then((r) => setRows(r.data)).catch(() => setRows([]));
  }
  useEffect(() => { load(); }, [type]);

  async function checkIn(code) {
    setError(''); setBusyCode(code);
    try {
      await adminApi.post('/admin/scan/check-in', { code });
      load();
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Check-in failed');
    } finally {
      setBusyCode(null);
    }
  }

  async function undo(code) {
    setError(''); setBusyCode(code);
    try {
      await adminApi.post('/admin/scan/undo', { code });
      load();
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Undo failed');
    } finally {
      setBusyCode(null);
    }
  }

  const checkedIn = rows?.filter((r) => r.checkedInAt) || [];
  const notCheckedIn = rows?.filter((r) => !r.checkedInAt) || [];

  return (
    <Modal title={title} onClose={onClose} width="max-w-lg">
      {error && <div className="mb-3 rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}

      {rows === null && <p className="text-sm text-nia-text-faint text-center py-6">Loading…</p>}
      {rows?.length === 0 && <p className="text-sm text-nia-text-faint text-center py-6">Nobody here yet.</p>}

      {rows && rows.length > 0 && (
        <div className="flex flex-col gap-5 max-h-[65vh] overflow-y-auto">
          <div>
            <h3 className="text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-2">Not Yet Checked In ({notCheckedIn.length})</h3>
            {notCheckedIn.length === 0 ? (
              <p className="text-sm text-nia-text-faint">Everyone's checked in.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {notCheckedIn.map((r) => (
                  <div key={r.code} className="flex items-center justify-between gap-2 px-3 py-2 rounded-nia-btn border border-nia-border">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-nia-navy-dark truncate">{r.name}</p>
                      {r.subtitle && <p className="text-xs text-nia-text-faint truncate">{r.subtitle}</p>}
                    </div>
                    <Button variant="secondary" size="sm" disabled={busyCode === r.code} onClick={() => checkIn(r.code)}>
                      {busyCode === r.code ? '…' : 'Check In'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-2">Checked In ({checkedIn.length})</h3>
            {checkedIn.length === 0 ? (
              <p className="text-sm text-nia-text-faint">Nobody yet.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {checkedIn.map((r) => (
                  <div key={r.code} className="flex items-center justify-between gap-2 px-3 py-2 rounded-nia-btn border border-nia-success/30 bg-nia-success/5">
                    <div className="min-w-0 flex items-center gap-2">
                      <CheckCircle2 className="text-nia-success flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-nia-navy-dark truncate">{r.name}</p>
                        <p className="text-xs text-nia-text-faint truncate">{r.subtitle ? `${r.subtitle} · ` : ''}{new Date(r.checkedInAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" disabled={busyCode === r.code} onClick={() => undo(r.code)}>
                      {busyCode === r.code ? '…' : <><Undo2 /> Undo</>}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
