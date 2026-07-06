import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, Pencil, Copy, Trash2, Bot } from 'lucide-react';
import adminApi from '../../services/adminApi';
import Modal from '../../components/admin/Modal';
import EmailBroadcastingNav from '../../components/admin/EmailBroadcastingNav';
import PageHeader from '../../components/admin/PageHeader';
import Card from '../../components/admin/Card';
import Button from '../../components/admin/Button';

const TYPES = ['event_announcement', 'newsletter', 'membership_update', 'promotional', 'welcome', 'general'];
const selectFilterCls = 'rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20 w-auto';

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
      <PageHeader
        title="Email Templates"
        actions={<Button as={Link} to="/admin/broadcasting/generate" variant="primary"><Bot /> Generate with AI</Button>}
      />

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
        <Card className="text-center text-nia-text-faint">
          No templates yet. <Link to="/admin/broadcasting/generate" className="text-nia-orange font-semibold">Generate one with AI</Link>.
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => (
          <Card key={t._id} padded={false} className="flex flex-col">
            <div className="h-28 bg-nia-panel-alt overflow-hidden relative">
              <iframe title={t.name} srcDoc={t.htmlContent} className="w-[600px] h-[280px] origin-top-left scale-[0.22] pointer-events-none border-0" />
            </div>
            <div className="p-4 flex flex-col gap-1.5 flex-1">
              <span className="text-xs font-bold uppercase tracking-wide text-nia-orange">{typeLabel(t.type)}</span>
              <h3 className="font-bold text-nia-navy-dark">{t.name}</h3>
              <p className="text-xs text-nia-text-faint">Edited {new Date(t.updatedAt).toLocaleDateString()}</p>
              <div className="flex-1" />
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Button variant="secondary" size="sm" onClick={() => setPreviewTemplate(t)}><Eye /> Preview</Button>
                <Button as={Link} to={`/admin/broadcasting/generate?templateId=${t._id}`} variant="secondary" size="sm"><Pencil /> Edit</Button>
                <Button variant="secondary" size="sm" onClick={() => handleDuplicate(t)}><Copy /> Duplicate</Button>
                <Button variant="danger" size="sm" icon onClick={() => handleDelete(t)}><Trash2 /></Button>
              </div>
            </div>
          </Card>
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
