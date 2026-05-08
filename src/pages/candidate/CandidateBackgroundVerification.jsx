import { useState, useEffect, useRef } from 'react';
import { api } from '../../api/api.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { card, btnP, btnG, btnD, inp } from '../../constants/styles.js';

const DOC_TYPES = [
  { value: 'aadhaar',          label: 'Aadhaar Card' },
  { value: 'pan',              label: 'PAN Card' },
  { value: 'passport',         label: 'Passport' },
  { value: 'degree',           label: 'Educational Certificate / Degree' },
  { value: 'salary_slip',      label: 'Salary Slip (3 months)' },
  { value: 'exp_letter',       label: 'Experience Letter' },
  { value: 'relieving_letter', label: 'Relieving Letter' },
  { value: 'address_proof',    label: 'Address Proof (Utility Bill / Rent Agmt)' },
  { value: 'bank_details',     label: 'Bank Details / Cancelled Cheque' },
  { value: 'reference',        label: 'Reference Contact Details' },
  { value: 'other',            label: 'Other Document' },
];

const STATUS_STYLE = {
  uploaded:     { bg: 'rgba(1,118,211,0.08)',   text: '#0176D3',  label: '📤 Uploaded' },
  under_review: { bg: 'rgba(245,158,11,0.1)',   text: '#F59E0B',  label: '⏳ Under Review' },
  verified:     { bg: 'rgba(16,185,129,0.1)',   text: '#10B981',  label: '✅ Verified' },
  rejected:     { bg: 'rgba(186,5,23,0.08)',    text: '#BA0517',  label: '❌ Rejected' },
};

function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
}

export default function CandidateBackgroundVerification({ user }) {
  const [docs,      setDocs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toast,     setToast]     = useState('');
  const [preview,   setPreview]   = useState(null);  // { docId, loading }
  const [showUpload,setShowUpload] = useState(false);
  const [form,      setForm]      = useState({ docType: 'aadhaar', docName: '' });
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.getBgvDocuments();
      setDocs(Array.isArray(r?.data) ? r.data : []);
    } catch { setDocs([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { setToast('❌ Please select a file to upload'); return; }
    if (!form.docType) { setToast('❌ Please select the document type'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('docType', form.docType);
      fd.append('docName', form.docName || DOC_TYPES.find(t => t.value === form.docType)?.label || 'Document');
      await api.uploadBgvDocument(fd);
      setToast('✅ Document uploaded successfully!');
      setShowUpload(false);
      setForm({ docType: 'aadhaar', docName: '' });
      if (fileRef.current) fileRef.current.value = '';
      load();
    } catch (e) {
      setToast(`❌ ${e.message}`);
    }
    setUploading(false);
  };

  const handlePreview = async (docId) => {
    setPreview({ docId, loading: true, fileUrl: null });
    try {
      const r = await api.getBgvDocumentFile(docId);
      setPreview({ docId, loading: false, fileUrl: r?.data?.fileUrl, mimeType: r?.data?.mimeType });
    } catch {
      setPreview(null);
      setToast('❌ Could not load document preview');
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Remove this document from your BGV profile?')) return;
    try {
      await api.deleteBgvDocument(docId);
      setToast('✅ Document removed');
      setDocs(prev => prev.filter(d => d.id !== docId));
    } catch (e) { setToast(`❌ ${e.message}`); }
  };

  const bgvVerified = user?.bgvVerified;
  const verifiedCount = docs.filter(d => d.status === 'verified').length;
  const pendingCount  = docs.filter(d => ['uploaded', 'under_review'].includes(d.status)).length;

  return (
    <div style={{ animation: 'tn-fadein 0.3s ease both', fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif" }}>
      <Toast msg={toast} onClose={() => setToast('')} />

      <PageHeader
        title="🛡️ Background Verification"
        subtitle="Upload your KYC and employment documents once — reuse them for any job application"
        action={<button onClick={() => setShowUpload(true)} style={btnP}>+ Upload Document</button>}
      />

      {/* Status banner */}
      {bgvVerified ? (
        <div style={{ ...card, background: 'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(5,150,105,0.05))', border: '1px solid rgba(16,185,129,0.3)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
          <span style={{ fontSize: 36 }}>🏅</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#065f46' }}>BGV Verified by TalentNest HR</div>
            <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>Your background verification is complete. This badge is visible to recruiters who view your profile.</div>
          </div>
        </div>
      ) : docs.length > 0 && (
        <div style={{ ...card, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 20, padding: '14px 18px', fontSize: 13 }}>
          <b>⏳ Verification In Progress</b> — {verifiedCount} of {docs.length} documents verified.
          {pendingCount > 0 && ` ${pendingCount} under review.`} HR will notify you once completed.
        </div>
      )}

      {/* Info box */}
      <div style={{ ...card, marginBottom: 20, padding: '14px 20px', background: 'rgba(1,118,211,0.04)', border: '1px solid rgba(1,118,211,0.15)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>💡</span>
        <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
          <b>Upload once, use everywhere.</b> When you're hired for a job, your recruiter can access these documents directly — no need to re-submit the same documents for each employer. All documents are encrypted and only shared with HR teams during the hiring process.
        </div>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div style={{ ...card, marginBottom: 20, padding: '20px', border: '2px solid #0176D3' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 800, color: '#0A1628' }}>📤 Upload BGV Document</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Document Type *</label>
              <select value={form.docType} onChange={e => setForm(f => ({ ...f, docType: e.target.value }))} style={{ ...inp, width: '100%' }}>
                {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Custom Label (optional)</label>
              <input value={form.docName} onChange={e => setForm(f => ({ ...f, docName: e.target.value }))}
                placeholder={DOC_TYPES.find(t => t.value === form.docType)?.label || ''}
                style={{ ...inp, width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Select File * (PDF, JPG, PNG, DOCX — max 10MB)</label>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.docx"
              style={{ fontSize: 13, color: '#374151', width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleUpload} disabled={uploading} style={btnP}>
              {uploading ? <><Spinner size={14} /> Uploading…</> : '📤 Upload'}
            </button>
            <button onClick={() => setShowUpload(false)} style={btnG}>Cancel</button>
          </div>
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <div style={{ ...card, display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={28} /></div>
      ) : docs.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>🗂️</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>No Documents Yet</div>
          <div style={{ fontSize: 13, color: '#706E6B', marginBottom: 20, maxWidth: 420, margin: '0 auto 20px' }}>
            Upload your KYC and employment documents to speed up the hiring process. Once verified by HR, your profile gets a BGV badge trusted by recruiters.
          </div>
          <button onClick={() => setShowUpload(true)} style={btnP}>+ Upload First Document</button>
        </div>
      ) : (
        <div style={card}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#0A1628', marginBottom: 16 }}>
            My BGV Documents ({docs.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {docs.map(d => {
              const st = STATUS_STYLE[d.status] || STATUS_STYLE.uploaded;
              return (
                <div key={d.id} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 16px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(1,118,211,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {d.mimeType?.includes('pdf') ? '📄' : d.mimeType?.includes('image') ? '🖼️' : '📑'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>{d.docName}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                      {d.docTypeLabel}{d.fileSize ? ` · ${fmtSize(d.fileSize)}` : ''} · Uploaded {fmtDate(d.createdAt)}
                    </div>
                    {d.rejectNote && (
                      <div style={{ fontSize: 11, color: '#BA0517', marginTop: 3 }}>Note: {d.rejectNote}</div>
                    )}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: st.text, background: st.bg, padding: '4px 12px', borderRadius: 20, flexShrink: 0 }}>{st.label}</span>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => handlePreview(d.id)} style={{ ...btnG, fontSize: 11, padding: '5px 12px' }}>Preview</button>
                    {d.status !== 'verified' && (
                      <button onClick={() => handleDelete(d.id)} style={{ ...btnD, fontSize: 11, padding: '5px 12px' }}>Delete</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Document preview modal */}
      {preview && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(5,13,26,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setPreview(null)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 20, maxWidth: 800, width: '100%', maxHeight: '90vh', overflow: 'auto', position: 'relative' }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreview(null)} style={{ position: 'absolute', top: 14, right: 14, background: '#F1F5F9', border: 'none', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            {preview.loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size={32} /></div>
            ) : preview.fileUrl ? (
              preview.mimeType?.includes('pdf')
                ? <iframe src={preview.fileUrl} style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 8 }} title="Document Preview" />
                : <img src={preview.fileUrl} alt="Document" style={{ maxWidth: '100%', borderRadius: 8 }} />
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#706E6B' }}>Unable to preview this document.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
