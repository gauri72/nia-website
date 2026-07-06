import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Bot } from 'lucide-react';
import adminApi from '../../services/adminApi';
import EmailBroadcastingNav from '../../components/admin/EmailBroadcastingNav';
import PageHeader from '../../components/admin/PageHeader';
import Card from '../../components/admin/Card';
import Button from '../../components/admin/Button';

const inputCls = 'w-full rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20';
const label = 'text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-1 block';

const STEPS = ['Template', 'Audience', 'Personalize', 'Schedule', 'Review'];
const TIMEZONES = ['Europe/Amsterdam', 'Europe/London', 'America/New_York', 'Asia/Kolkata', 'UTC'];

export default function BroadcastComposerPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [broadcastId, setBroadcastId] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [audience, setAudience] = useState({ type: 'all_members', tierIds: [], eventId: '' });
  const [recipientCount, setRecipientCount] = useState(null);
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testStatus, setTestStatus] = useState('');
  const [scheduleType, setScheduleType] = useState('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [timezone, setTimezone] = useState('Europe/Amsterdam');

  useEffect(() => {
    adminApi.get('/email-templates').then((r) => setTemplates(r.data));
    adminApi.get('/admin/membership-tiers').then((r) => setTiers(r.data));
    adminApi.get('/admin/events', { params: { status: 'published', limit: 100 } }).then((r) => setEvents(r.data.events));
  }, []);

  useEffect(() => {
    if (step !== 1) return;
    adminApi.post('/broadcasts/estimate-audience', { audience }).then((r) => setRecipientCount(r.data.count));
  }, [audience, step]);

  async function goToAudience() {
    setError(''); setBusy(true);
    try {
      const { data } = await adminApi.post('/broadcasts', {
        name: selectedTemplate.name, templateId: selectedTemplate._id,
        subject: selectedTemplate.subject, audience,
      });
      setBroadcastId(data._id);
      setSubject(selectedTemplate.subject);
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start broadcast');
    } finally {
      setBusy(false);
    }
  }

  async function saveAudienceAndContinue() {
    setError(''); setBusy(true);
    try {
      await adminApi.patch(`/broadcasts/${broadcastId}`, { audience });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save audience');
    } finally {
      setBusy(false);
    }
  }

  async function savePersonalizeAndContinue() {
    setError(''); setBusy(true);
    try {
      await adminApi.patch(`/broadcasts/${broadcastId}`, { subject, previewText });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save details');
    } finally {
      setBusy(false);
    }
  }

  async function handleSendTest() {
    setTestStatus('sending');
    try {
      await adminApi.post(`/broadcasts/${broadcastId}/send-test`, { email: testEmail });
      setTestStatus('sent');
    } catch {
      setTestStatus('error');
    }
  }

  async function handleConfirm() {
    setError(''); setBusy(true);
    try {
      const body = scheduleType === 'schedule' && scheduledAt ? { scheduledAt } : {};
      await adminApi.post(`/broadcasts/${broadcastId}/send`, body);
      navigate('/admin/broadcasting/history');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send broadcast');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <EmailBroadcastingNav />
      <PageHeader title="Compose Broadcast" />

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < step ? 'bg-nia-success text-white' : i === step ? 'bg-nia-orange text-white' : 'bg-nia-panel-alt text-nia-text-faint'}`}>
              {i < step ? <Check className="text-[10px]" /> : i + 1}
            </div>
            <span className={`text-xs font-semibold ${i === step ? 'text-nia-navy-dark' : 'text-nia-text-faint'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-nia-border" />}
          </div>
        ))}
      </div>

      {error && <div className="mb-4 rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}

      <Card>
        {/* Step 0 — Template */}
        {step === 0 && (
          <div>
            <h2 className="font-bold text-nia-navy-dark mb-3">Select a Template</h2>
            {templates.length === 0 && (
              <p className="text-sm text-nia-text-faint mb-3">No templates yet. <Link to="/admin/broadcasting/generate" className="text-nia-orange font-semibold">Generate one with AI</Link>.</p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {templates.map((t) => (
                <button
                  key={t._id} onClick={() => setSelectedTemplate(t)}
                  className={`text-left rounded-nia-btn border-2 p-3 transition-colors bg-white ${selectedTemplate?._id === t._id ? 'border-nia-orange bg-nia-orange/5' : 'border-nia-border hover:border-nia-text-faint'}`}
                >
                  <p className="font-semibold text-sm text-nia-navy-dark">{t.name}</p>
                  <p className="text-xs text-nia-text-faint">{t.type.replace('_', ' ')}</p>
                </button>
              ))}
            </div>
            <Link to="/admin/broadcasting/generate" className="inline-flex items-center gap-1.5 text-sm text-nia-orange font-semibold mb-4"><Bot />Generate a new template with AI</Link>
            <div className="flex justify-end">
              <Button variant="primary" onClick={goToAudience} disabled={!selectedTemplate || busy}>{busy ? 'Starting…' : 'Continue'}</Button>
            </div>
          </div>
        )}

        {/* Step 1 — Audience */}
        {step === 1 && (
          <div>
            <h2 className="font-bold text-nia-navy-dark mb-3">Define Audience</h2>
            <div className="flex flex-col gap-3 mb-4">
              {[
                { value: 'all_members', label: 'All Members' },
                { value: 'tier', label: 'By Membership Tier' },
                { value: 'event_attendees', label: 'Event Attendees' },
                { value: 'custom_list', label: 'Custom Segment (join date range)' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="audienceType" checked={audience.type === opt.value} onChange={() => setAudience((a) => ({ ...a, type: opt.value }))} />
                  {opt.label}
                </label>
              ))}
            </div>

            {audience.type === 'tier' && (
              <div className="flex flex-wrap gap-3 mb-4">
                {tiers.map((t) => (
                  <label key={t._id} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox" checked={audience.tierIds?.includes(t._id)}
                      onChange={(e) => setAudience((a) => ({ ...a, tierIds: e.target.checked ? [...(a.tierIds || []), t._id] : a.tierIds.filter((id) => id !== t._id) }))}
                    /> {t.name}
                  </label>
                ))}
              </div>
            )}

            {audience.type === 'event_attendees' && (
              <select className={inputCls + ' mb-4'} value={audience.eventId} onChange={(e) => setAudience((a) => ({ ...a, eventId: e.target.value }))}>
                <option value="">Select an event…</option>
                {events.map((e) => <option key={e._id} value={e._id}>{e.title}</option>)}
              </select>
            )}

            {audience.type === 'custom_list' && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div><label className={label}>Joined After</label><input type="date" className={inputCls} onChange={(e) => setAudience((a) => ({ ...a, joinedAfter: e.target.value }))} /></div>
                <div><label className={label}>Joined Before</label><input type="date" className={inputCls} onChange={(e) => setAudience((a) => ({ ...a, joinedBefore: e.target.value }))} /></div>
              </div>
            )}

            <div className="rounded-nia-btn bg-nia-panel px-4 py-3 mb-4 text-sm font-semibold text-nia-navy-dark">
              Estimated recipients: <span className="text-nia-orange text-lg">{recipientCount ?? '…'}</span>
            </div>

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(0)}>Back</Button>
              <Button variant="primary" onClick={saveAudienceAndContinue} disabled={busy}>Continue</Button>
            </div>
          </div>
        )}

        {/* Step 2 — Personalize */}
        {step === 2 && (
          <div>
            <h2 className="font-bold text-nia-navy-dark mb-3">Personalize</h2>
            <div className="flex flex-col gap-3 mb-4">
              <div><label className={label}>Subject Line</label><input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
              <div><label className={label}>Preview Text</label><input className={inputCls} value={previewText} onChange={(e) => setPreviewText(e.target.value)} placeholder="Shown in the inbox preview" /></div>
            </div>
            <div className="rounded-nia-btn bg-nia-panel px-4 py-3 mb-4 text-xs text-nia-text-muted">
              Available personalization tokens (already in the template if AI-generated): <code>{'{{first_name}}'}</code> <code>{'{{membership_tier}}'}</code> <code>{'{{expiry_date}}'}</code>
            </div>
            <div className="flex items-end gap-2 mb-4">
              <div className="flex-1"><label className={label}>Send a test to yourself</label><input type="email" className={inputCls} value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@niaonline.org" /></div>
              <Button variant="secondary" onClick={handleSendTest} disabled={!testEmail || testStatus === 'sending'}>{testStatus === 'sending' ? 'Sending…' : 'Send Test'}</Button>
            </div>
            {testStatus === 'sent' && <p className="text-sm text-nia-success mb-3">Test email sent!</p>}
            {testStatus === 'error' && <p className="text-sm text-nia-error mb-3">Failed to send test email.</p>}

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
              <Button variant="primary" onClick={savePersonalizeAndContinue} disabled={busy || !subject.trim()}>Continue</Button>
            </div>
          </div>
        )}

        {/* Step 3 — Schedule */}
        {step === 3 && (
          <div>
            <h2 className="font-bold text-nia-navy-dark mb-3">Schedule</h2>
            <div className="flex flex-col gap-3 mb-4">
              <label className="flex items-center gap-2 text-sm"><input type="radio" checked={scheduleType === 'now'} onChange={() => setScheduleType('now')} /> Send Immediately</label>
              <label className="flex items-center gap-2 text-sm"><input type="radio" checked={scheduleType === 'schedule'} onChange={() => setScheduleType('schedule')} /> Schedule for later</label>
            </div>
            {scheduleType === 'schedule' && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div><label className={label}>Date & Time</label><input type="datetime-local" className={inputCls} value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} /></div>
                <div>
                  <label className={label}>Timezone</label>
                  <select className={inputCls} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
              <Button variant="primary" onClick={() => setStep(4)} disabled={scheduleType === 'schedule' && !scheduledAt}>Continue</Button>
            </div>
          </div>
        )}

        {/* Step 4 — Review */}
        {step === 4 && (
          <div>
            <h2 className="font-bold text-nia-navy-dark mb-4">Review & Confirm</h2>
            <dl className="grid grid-cols-2 gap-y-3 text-sm mb-6">
              <dt className="text-nia-text-muted">Template</dt><dd className="font-semibold text-nia-navy-dark">{selectedTemplate?.name}</dd>
              <dt className="text-nia-text-muted">Audience Size</dt><dd className="font-semibold text-nia-navy-dark">{recipientCount} recipients</dd>
              <dt className="text-nia-text-muted">Subject</dt><dd className="font-semibold text-nia-navy-dark">{subject}</dd>
              <dt className="text-nia-text-muted">Timing</dt>
              <dd className="font-semibold text-nia-navy-dark">
                {scheduleType === 'now' ? 'Send immediately' : `${new Date(scheduledAt).toLocaleString()} (${timezone})`}
              </dd>
            </dl>
            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(3)}>Back</Button>
              <Button variant="primary" onClick={handleConfirm} disabled={busy}>
                {busy ? 'Sending…' : scheduleType === 'now' ? 'Confirm & Send' : 'Confirm & Schedule'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
