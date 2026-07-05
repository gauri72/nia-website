import { useEffect, useRef, useState } from 'react';
import { FaUpload, FaTrash, FaCopy, FaFilePdf } from 'react-icons/fa';
import adminApi from '../../services/adminApi';

const btnPrimary = 'rounded-nia-btn bg-nia-orange px-4 py-2 text-sm font-semibold text-white hover:bg-nia-orange-dark transition-colors disabled:bg-nia-border disabled:text-nia-text-faint';

function isImage(filename) {
  return /\.(jpe?g|png|gif|webp|svg)$/i.test(filename);
}

export default function MediaManagerPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [copiedUrl, setCopiedUrl] = useState('');
  const fileInputRef = useRef(null);

  function load() {
    setLoading(true);
    adminApi.get('/admin/media').then((r) => setFiles(r.data)).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError(''); setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await adminApi.post('/admin/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(file) {
    if (!window.confirm(`Delete "${file.filename}"?`)) return;
    await adminApi.delete(`/admin/media/${file.filename}`);
    load();
  }

  function handleCopy(url) {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(''), 1500);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-extrabold text-nia-navy-dark">Media Manager</h1>
        <label className={btnPrimary + ' cursor-pointer'}>
          <FaUpload className="inline mr-1.5" />{uploading ? 'Uploading…' : 'Upload File'}
          <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleUpload} disabled={uploading} className="hidden" />
        </label>
      </div>

      {error && <div className="mb-4 rounded bg-red-50 border-l-4 border-nia-error px-3 py-2 text-sm text-red-700">{error}</div>}

      {!loading && files.length === 0 && (
        <div className="rounded-nia-card border border-nia-border bg-white p-8 text-center text-nia-text-faint">No media uploaded yet. Use images here for event covers, content sections, and email templates.</div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {files.map((f) => (
          <div key={f.filename} className="rounded-nia-card border border-nia-border bg-white overflow-hidden flex flex-col">
            <div className="h-28 bg-nia-panel-alt flex items-center justify-center overflow-hidden">
              {isImage(f.filename) ? (
                <img src={f.url} alt={f.filename} className="w-full h-full object-cover" />
              ) : (
                <FaFilePdf className="text-4xl text-nia-text-faint" />
              )}
            </div>
            <div className="p-2.5 flex flex-col gap-1.5">
              <p className="text-xs text-nia-text-muted truncate" title={f.filename}>{f.filename}</p>
              <p className="text-[10px] text-nia-text-faint">{(f.size / 1024).toFixed(0)} KB</p>
              <div className="flex gap-1.5">
                <button onClick={() => handleCopy(f.url)} className="flex-1 rounded-nia-btn border border-nia-border px-2 py-1 text-[11px] font-semibold text-nia-navy-dark hover:bg-nia-panel">
                  <FaCopy className="inline mr-1" />{copiedUrl === f.url ? 'Copied!' : 'Copy URL'}
                </button>
                <button onClick={() => handleDelete(f)} className="rounded-nia-btn border border-nia-error px-2 py-1 text-nia-error hover:bg-red-50"><FaTrash className="text-[11px]" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
