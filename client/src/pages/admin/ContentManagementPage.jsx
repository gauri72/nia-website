import { useEffect, useState } from 'react';
import adminApi from '../../services/adminApi';

const inputCls = 'w-full rounded-nia-btn border border-nia-border px-3 py-2 text-sm focus:border-nia-orange focus:outline-none focus:ring-2 focus:ring-nia-orange/20';
const btnPrimary = 'rounded-nia-btn bg-nia-orange px-4 py-2 text-sm font-semibold text-white hover:bg-nia-orange-dark transition-colors disabled:bg-nia-border disabled:text-nia-text-faint';
const label = 'text-xs font-semibold text-nia-text-muted uppercase tracking-wide mb-1 block';

const SECTIONS = [
  { key: 'homepage_hero', section: 'homepage_hero', title: 'Homepage Hero', fields: [
    { name: 'headline', label: 'Headline', type: 'text' },
    { name: 'subheadline', label: 'Subheadline', type: 'text' },
  ] },
  { key: 'about', section: 'about', title: 'About Section', fields: [
    { name: 'body', label: 'About Text', type: 'textarea' },
  ] },
  { key: 'mission', section: 'mission', title: 'Mission Statement', fields: [
    { name: 'statement', label: 'Mission Statement', type: 'textarea' },
  ] },
  { key: 'announcements', section: 'announcements', title: 'Announcements & News', fields: [
    { name: 'text', label: 'Latest Announcement', type: 'textarea' },
  ] },
  { key: 'footer', section: 'footer', title: 'Footer & Contact Details', fields: [
    { name: 'address', label: 'Address', type: 'text' },
    { name: 'email', label: 'Contact Email', type: 'text' },
    { name: 'phone', label: 'Phone', type: 'text' },
  ] },
];

export default function ContentManagementPage() {
  const [blocks, setBlocks] = useState({});
  const [saving, setSaving] = useState({});
  const [message, setMessage] = useState({});

  useEffect(() => {
    adminApi.get('/admin/content').then((r) => {
      const map = {};
      r.data.forEach((b) => { map[b.key] = b.data; });
      setBlocks(map);
    });
  }, []);

  function updateField(key, field, value) {
    setBlocks((b) => ({ ...b, [key]: { ...(b[key] || {}), [field]: value } }));
  }

  async function handleSave(sectionDef) {
    setSaving((s) => ({ ...s, [sectionDef.key]: true }));
    try {
      await adminApi.put(`/admin/content/${sectionDef.key}`, { section: sectionDef.section, data: blocks[sectionDef.key] || {} });
      setMessage((m) => ({ ...m, [sectionDef.key]: 'Saved!' }));
      setTimeout(() => setMessage((m) => ({ ...m, [sectionDef.key]: '' })), 2000);
    } finally {
      setSaving((s) => ({ ...s, [sectionDef.key]: false }));
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-nia-navy-dark mb-2">Content Management</h1>
      <p className="text-sm text-nia-text-faint mb-5">Edit homepage sections, announcements and footer content stored for the site.</p>

      <div className="flex flex-col gap-5 max-w-2xl">
        {SECTIONS.map((sectionDef) => (
          <div key={sectionDef.key} className="rounded-nia-card border border-nia-border bg-white p-5">
            <h2 className="font-bold text-nia-navy-dark mb-3">{sectionDef.title}</h2>
            <div className="flex flex-col gap-3 mb-3">
              {sectionDef.fields.map((f) => (
                <div key={f.name}>
                  <label className={label}>{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea className={inputCls} rows={3} value={blocks[sectionDef.key]?.[f.name] || ''} onChange={(e) => updateField(sectionDef.key, f.name, e.target.value)} />
                  ) : (
                    <input className={inputCls} value={blocks[sectionDef.key]?.[f.name] || ''} onChange={(e) => updateField(sectionDef.key, f.name, e.target.value)} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => handleSave(sectionDef)} disabled={saving[sectionDef.key]} className={btnPrimary}>
                {saving[sectionDef.key] ? 'Saving…' : 'Save'}
              </button>
              {message[sectionDef.key] && <span className="text-sm text-nia-success font-semibold">{message[sectionDef.key]}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
