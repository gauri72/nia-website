import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Eye, Pencil, Copy, Trash2, Bot } from 'lucide-react';
import adminApi from '../../services/adminApi';
import Modal from '../../components/admin/Modal';
import EmailBroadcastingNav from '../../components/admin/EmailBroadcastingNav';

const TYPES = ['event_announcement', 'newsletter', 'membership_update', 'promotional', 'welcome', 'general'];
const selectFilterCls = 'rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20 w-auto';
const btnPrimary = 'rounded-nia-btn bg-nia-orange px-4 py-2 text-sm font-semibold text-white hover:bg-nia-orange-dark transition-colors';
const btnSecondary = 'rounded-nia-btn border border-nia-border bg-white px-3 py-1.5 text-xs font-semibold text-nia-navy-dark hover:bg-nia-panel transition-colors';

function typeLabel(t) {
  return t.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  function load() {
    setLoading(true);
    adminApi.get('/email-templates', { params: { search, type } }).then((r) => setTemplates(r.data)).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [search, type]);

  async function handleDuplicate(t) {
    await adminApi.post(`/email-templates/${t._id}/duplicate`);
    load();
  }

  async function handleDelete(t) {
    if (!window.confirm(`Delete template "${t.name}"?`)) return;
    await adminApi.delete(`/email-templates/${t._id}`);
    load();
  }

  return (
    <div>
      <EmailBroadcastingNav />
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-extrabold text-nia-navy-dark">Email Templates</h1>
        <Link to="/admin/broadcasting/generate" className={btnPrimary}><Bot className="inline mr-1.5" />Generate with AI</Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-nia-text-faint text-xs" />
          <input
            className="w-full rounded-nia-btn border border-nia-border py-2 pl-8 pr-3 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20"
            placeholder="Search templates…" value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={selectFilterCls} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
        </select>
      </div>

      {!loading && templates.length === 0 && (
        <div className="rounded-nia-card border border-nia-border bg-white p-8 text-center text-nia-text-faint">
          No templates yet. <Link to="/admin/broadcasting/generate" className="text-nia-orange font-semibold">Generate one with AI</Link>.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => (
          <div key={t._id} className="rounded-nia-card border border-nia-border bg-white overflow-hidden flex flex-col">
            <div className="h-28 bg-nia-panel-alt overflow-hidden relative">
              <iframe title={t.name} srcDoc={t.htmlContent} className="w-[600px] h-[280px] origin-top-left scale-[0.22] pointer-events-none border-0" />
            </div>
            <div className="p-4 flex flex-col gap-1.5 flex-1">
              <span className="text-xs font-bold uppercase tracking-wide text-nia-orange">{typeLabel(t.type)}</span>
              <h3 className="font-bold text-nia-navy-dark">{t.name}</h3>
              <p className="text-xs text-nia-text-faint">Edited {new Date(t.updatedAt).toLocaleDateString()}</p>
              <div className="flex-1" />
              <div className="flex flex-wrap gap-1.5 mt-2">
                <button onClick={() => setPreviewTemplate(t)} className={btnSecondary}><Eye className="inline mr-1" />Preview</button>
                <Link to={`/admin/broadcasting/generate?templateId=${t._id}`} className={btnSecondary}><Pencil className="inline mr-1" />Edit</Link>
                <button onClick={() => handleDuplicate(t)} className={btnSecondary}><Copy className="inline mr-1" />Duplicate</button>
                <button onClick={() => handleDelete(t)} className="rounded-nia-btn border border-nia-error px-3 py-1.5 text-xs font-semibold text-nia-error hover:bg-red-50"><Trash2 /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {previewTemplate && (
        <Modal title={previewTemplate.name} onClose={() => setPreviewTemplate(null)} width="max-w-2xl">
          <iframe title="preview" srcDoc={previewTemplate.htmlContent} className="w-full h-[70vh] border border-nia-border rounded-nia-btn" />
        </Modal>
      )}
    </div>
  );
}
