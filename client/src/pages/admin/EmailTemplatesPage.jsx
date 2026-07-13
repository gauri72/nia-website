import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, Pencil, Copy, Trash2, Bot, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import adminApi from '../../services/adminApi';
import Modal from '../../components/admin/Modal';
import EmailBroadcastingNav from '../../components/admin/EmailBroadcastingNav';
import PageHeader from '../../components/admin/PageHeader';
import Card from '../../components/admin/Card';
import Button from '../../components/admin/Button';

// PDF export is a static handout, not a real send — personalization tokens
// have no real recipient to resolve against, so they're replaced with a
// generic greeting instead of being left as literal "{{first_name}}" text.
function renderForPdf(html) {
  return html
    .replaceAll('{{first_name}}', 'NIA Family Member')
    .replaceAll('{{last_name}}', '')
    .replaceAll('{{membership_tier}}', '')
    .replaceAll('{{expiry_date}}', '')
    .replaceAll('{{unsubscribe_url}}', '#');
}

// Renders the template in an off-screen iframe (same isolation the Preview
// modal already relies on via srcDoc, since these are full HTML documents
// with their own <style> blocks that would otherwise clash with the admin
// panel's own CSS), then hands the live DOM to jsPDF's html() plugin —
// NOT a manual html2canvas-screenshot-then-slice-into-fixed-page-heights
// approach, which produced duplicated/cut rows at arbitrary page breaks and
// only ever outputs a flat image with no clickable content. html() paginates
// around real element boundaries (autoPaging: 'text') and walks the DOM to
// add genuine link annotations for every <a href> (enableLinks: true).
async function downloadTemplateAsPdf(template) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '700px';
  iframe.style.height = '100px';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  try {
    await new Promise((resolve) => {
      iframe.onload = resolve;
      iframe.srcdoc = renderForPdf(template.htmlContent);
    });
    // Let images inside the iframe finish loading before measuring/capturing.
    await new Promise((resolve) => setTimeout(resolve, 400));

    const doc = iframe.contentDocument;
    iframe.style.height = `${doc.documentElement.scrollHeight}px`;

    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();

    await pdf.html(doc.body, {
      x: 0,
      y: 0,
      width: pageWidth,
      windowWidth: 700,
      autoPaging: 'text',
      enableLinks: true,
      html2canvas: { scale: 2, useCORS: true },
    });

    pdf.save(`${template.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`);
  } finally {
    document.body.removeChild(iframe);
  }
}

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
  const [downloadingId, setDownloadingId] = useState(null);

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

  async function handleDownloadPdf(t) {
    setDownloadingId(t._id);
    try {
      await downloadTemplateAsPdf(t);
    } catch {
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloadingId(null);
    }
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
                <Button variant="secondary" size="sm" disabled={downloadingId === t._id} onClick={() => handleDownloadPdf(t)}>
                  <Download /> {downloadingId === t._id ? 'Generating…' : 'PDF'}
                </Button>
                <Button variant="danger" size="sm" icon onClick={() => handleDelete(t)}><Trash2 /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {previewTemplate && (
        <Modal title={previewTemplate.name} onClose={() => setPreviewTemplate(null)} width="max-w-2xl">
          <div className="flex justify-end mb-2">
            <Button variant="secondary" size="sm" disabled={downloadingId === previewTemplate._id} onClick={() => handleDownloadPdf(previewTemplate)}>
              <Download /> {downloadingId === previewTemplate._id ? 'Generating…' : 'Download PDF'}
            </Button>
          </div>
          <iframe title="preview" srcDoc={previewTemplate.htmlContent} className="w-full h-[70vh] border border-nia-border rounded-nia-btn" />
        </Modal>
      )}
    </div>
  );
}
