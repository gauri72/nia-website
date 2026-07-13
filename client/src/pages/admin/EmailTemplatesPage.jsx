import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, Pencil, Copy, Trash2, Bot, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
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

// jsPDF's own html() plugin turned out to be the wrong tool: its native PDF
// text renderer has no glyphs for the emoji these templates use (rendered as
// garbage bytes) and its width scaling clipped content off the page edge.
// This instead rasterizes the real browser-rendered DOM via html2canvas
// (correct emoji, gradients, everything — it's a literal screenshot), then
// slices that single tall image into pages itself, snapping each page break
// to the nearest <tr> boundary instead of a blind fixed pixel offset, so a
// row is never split/duplicated across two pages. Links are re-added as
// invisible clickable annotations positioned over the flattened image, since
// an image has no notion of a clickable region on its own.
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
    const fullHeightPx = doc.documentElement.scrollHeight;
    iframe.style.height = `${fullHeightPx}px`;
    const bodyTop = doc.body.getBoundingClientRect().top;

    // Safe page-break points: the bottom edge of every table row, in CSS px
    // relative to the top of the document — a break landing here never cuts
    // through the middle of a row.
    const safeBreaksPx = Array.from(doc.querySelectorAll('tr'))
      .map((r) => r.getBoundingClientRect().bottom - bodyTop)
      .filter((y) => y > 0 && y < fullHeightPx)
      .sort((a, b) => a - b);

    // Captured before rasterizing — the flattened image has no clickable
    // regions of its own, so these get overlaid as PDF link annotations.
    const links = Array.from(doc.querySelectorAll('a[href]')).map((a) => {
      const r = a.getBoundingClientRect();
      return { url: a.href, top: r.top - bodyTop, left: r.left, width: r.width, height: r.height };
    });

    const RENDER_SCALE = 2; // sharper output; must match the value passed to html2canvas below
    const canvas = await html2canvas(doc.body, {
      width: 700, windowWidth: 700, height: fullHeightPx, scale: RENDER_SCALE, useCORS: true,
    });

    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidthPt = pdf.internal.pageSize.getWidth();
    const pageHeightPt = pdf.internal.pageSize.getHeight();
    const ptPerPx = pageWidthPt / 700; // the 700px-wide render maps to the page's full width
    const maxSlicePx = pageHeightPt / ptPerPx;

    const pageRanges = [];
    let cursor = 0;
    while (cursor < fullHeightPx - 0.5) {
      const target = cursor + maxSlicePx;
      let end = target >= fullHeightPx ? fullHeightPx : safeBreaksPx.slice().reverse().find((b) => b > cursor && b <= target);
      if (!end || end <= cursor) end = Math.min(target, fullHeightPx); // no safe break in range — fall back to a hard cut
      pageRanges.push({ startPx: cursor, endPx: end });
      cursor = end;
    }

    pageRanges.forEach((range, i) => {
      const sliceHeightPx = range.endPx - range.startPx;
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.min(Math.round(sliceHeightPx * RENDER_SCALE), canvas.height - Math.round(range.startPx * RENDER_SCALE));
      sliceCanvas.getContext('2d').drawImage(
        canvas,
        0, Math.round(range.startPx * RENDER_SCALE), canvas.width, sliceCanvas.height,
        0, 0, canvas.width, sliceCanvas.height,
      );

      if (i > 0) pdf.addPage();
      pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidthPt, sliceHeightPx * ptPerPx);

      links.forEach((link) => {
        const linkCenter = link.top + link.height / 2;
        if (linkCenter >= range.startPx && linkCenter < range.endPx) {
          pdf.link(link.left * ptPerPx, (link.top - range.startPx) * ptPerPx, link.width * ptPerPx, link.height * ptPerPx, { url: link.url });
        }
      });
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
