import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaMagic, FaRedo, FaCopy, FaSave } from 'react-icons/fa';
import adminApi from '../../services/adminApi';
import Modal from '../../components/admin/Modal';

const TYPES = [
  { value: 'event_announcement', label: 'Event Announcement' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'membership_update', label: 'Membership Update' },
  { value: 'promotional', label: 'Promotional' },
  { value: 'welcome', label: 'Welcome' },
  { value: 'general', label: 'General' },
];
const COLOR_SCHEMES = [
  { value: 'default', label: 'NIA Brand Colors (default)' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'minimal', label: 'Minimal' },
];

const inputCls = 'w-full rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20';
const btnPrimary = 'rounded-nia-btn bg-nia-orange px-4 py-2 text-sm font-semibold text-white hover:bg-nia-orange-dark transition-colors disabled:bg-nia-border disabled:text-nia-text-faint';
const btnSecondary = 'rounded-nia-btn border border-nia-border bg-white px-4 py-2 text-sm font-semibold text-nia-navy-dark hover:bg-nia-panel transition-colors disabled:opacity-40';
const label = 'text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-1 block';

export default function AITemplateGeneratorPage() {
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('templateId');
  const navigate = useNavigate();

  const [prompt, setPrompt] = useState('');
  const [type, setType] = useState('event_announcement');
  const [colorScheme, setColorScheme] = useState('default');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSave, setShowSave] = useState(false);

  useEffect(() => {
    if (!templateId) return;
    adminApi.get(`/email-templates/${templateId}`).then((r) => {
      setSubject(r.data.subject);
      setHtml(r.data.htmlContent);
      setType(r.data.type);
      setColorScheme(r.data.colorScheme || 'default');
      setPrompt(r.data.aiPrompt || '');
    });
  }, [templateId]);

  async function handleGenerate() {
    setError(''); setGenerating(true);
    try {
      const { data } = await adminApi.post('/ai/generate-template', { prompt, type, colorScheme });
      setSubject(data.subject);
      setHtml(data.html);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate template');
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col h-full">
      <Link to="/admin/broadcasting" className="inline-flex items-center gap-1.5 text-sm text-nia-text-muted hover:text-nia-navy-dark mb-4">
        <FaArrowLeft /> Back to Email Broadcasting
      </Link>

      <h1 className="text-2xl font-extrabold text-nia-navy-dark mb-5">AI Template Generator</h1>

      <div className="rounded-nia-card border border-nia-border bg-white p-5 mb-5">
        {error && <div className="mb-3 rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}
        <label className={label}>Describe the email you want</label>
        <textarea
          className={inputCls} rows={3}
          placeholder='e.g. "Create an event announcement for our Summer Cultural Festival" or "Write a membership renewal reminder for our VIP members"'
          value={prompt} onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <div>
            <label className={label}>Template Type</label>
            <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Color Scheme</label>
            <select className={inputCls} value={colorScheme} onChange={(e) => setColorScheme(e.target.value)}>
              {COLOR_SCHEMES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={handleGenerate} disabled={generating || !prompt.trim()} className={btnPrimary + ' w-full'}>
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Generating…
                </span>
              ) : (
                <><FaMagic className="inline mr-1.5" />Generate Template</>
              )}
            </button>
          </div>
        </div>
      </div>

      {html && (
        <>
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className={label}>Subject Line</label>
              <input className={inputCls + ' font-semibold'} value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-[500px]">
            <div className="rounded-nia-card border border-nia-border bg-nia-panel-alt overflow-hidden flex flex-col">
              <div className="px-3 py-2 bg-white border-b border-nia-border text-xs font-bold uppercase text-nia-text-muted">Live Preview</div>
              <iframe title="Email preview" srcDoc={html} className="flex-1 w-full border-0 bg-white" />
            </div>
            <div className="rounded-nia-card border border-nia-border overflow-hidden flex flex-col">
              <div className="px-3 py-2 bg-nia-navy-dark text-xs font-bold uppercase text-white">Editable Code</div>
              <textarea
                className="flex-1 w-full p-3 font-mono text-xs bg-[#0f1f4b] text-[#e8edf5] resize-none outline-none"
                value={html} onChange={(e) => setHtml(e.target.value)} spellCheck={false}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            <button onClick={handleGenerate} disabled={generating} className={btnSecondary}><FaRedo className="inline mr-1.5" />Regenerate</button>
            <button onClick={handleCopy} className={btnSecondary}><FaCopy className="inline mr-1.5" />{copied ? 'Copied!' : 'Copy HTML'}</button>
            <button onClick={() => setShowSave(true)} className={btnPrimary}><FaSave className="inline mr-1.5" />Save to Library</button>
          </div>
        </>
      )}

      {showSave && (
        <SaveTemplateModal
          templateId={templateId} subject={subject} html={html} type={type} colorScheme={colorScheme} prompt={prompt}
          onClose={() => setShowSave(false)}
          onSaved={() => navigate('/admin/broadcasting')}
        />
      )}
    </div>
  );
}

function SaveTemplateModal({ templateId, subject, html, type, colorScheme, prompt, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSaving(true);
    const payload = {
      name, type, subject, htmlContent: html, colorScheme,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      generatedByAI: true, aiPrompt: prompt,
    };
    try {
      if (templateId) await adminApi.put(`/email-templates/${templateId}`, payload);
      else await adminApi.post('/email-templates', payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Save to Library" onClose={onClose}>
      {error && <div className="mb-3 rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div><label className={label}>Template Name</label><input className={inputCls} required value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className={label}>Tags (comma separated)</label><input className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="festival, summer, 2026" /></div>
        <div className="flex justify-end gap-2 mt-2">
          <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
          <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}
