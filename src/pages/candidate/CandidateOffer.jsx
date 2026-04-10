import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Spinner from '../../components/ui/Spinner.jsx';
import Toast from '../../components/ui/Toast.jsx';
import { btnP, btnG, card } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const DOCUMENT_CHECKLIST = [
  { type: 'aadhaar',            label: 'Aadhaar Card' },
  { type: 'pan',                label: 'PAN Card' },
  { type: 'salary_slip_1',      label: 'Salary Slip (Month 1)' },
  { type: 'salary_slip_2',      label: 'Salary Slip (Month 2)' },
  { type: 'salary_slip_3',      label: 'Salary Slip (Month 3)' },
  { type: 'experience_letter',  label: 'Experience Letter' },
  { type: 'relieving_letter',   label: 'Relieving Letter' },
  { type: 'marksheet_10',       label: '10th Marksheet' },
  { type: 'marksheet_12',       label: '12th Marksheet' },
  { type: 'degree_certificate', label: 'Degree Certificate' },
  { type: 'passport_photo',     label: 'Passport Photo' },
  { type: 'bank_details',       label: 'Bank Details' },
  { type: 'cancelled_cheque',   label: 'Cancelled Cheque' },
];

function DocumentLocker({ candidateId }) {
  const [docs, setDocs]         = useState([]);
  const [uploading, setUploading] = useState('');
  const [toast, setToast]       = useState('');
  const fileRefs = useRef({});

  useEffect(() => {
    if (!candidateId) return;
    api.getCandidateDocuments(candidateId).then(r => setDocs(Array.isArray(r?.data) ? r.data : [])).catch(() => {});
  }, [candidateId]);

  const getDocForType = (type) => docs.find(d => d.documentType === type);

  const handleUpload = async (type, label, file) => {
    if (!file) return;
    setUploading(type);
    try {
      const fd = new FormData();
      fd.append('document', file);
      fd.append('documentType', type);
      await api.uploadCandidateDocument(candidateId, fd);
      const refreshed = await api.getCandidateDocuments(candidateId);
      setDocs(Array.isArray(refreshed?.data) ? refreshed.data : []);
      setToast(`✅ ${label} uploaded!`);
    } catch (e) { setToast(`❌ ${e.message}`); }
    setUploading('');
  };

  const uploaded = docs.length;
  const pct = Math.round((uploaded / DOCUMENT_CHECKLIST.length) * 100);

  return (
    <div style={{ marginTop: 28 }}>
      {toast && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '8px 14px', color: '#34d399', fontSize: 13, marginBottom: 12 }}>{toast}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#032D60' }}>📁 Joining Documents</div>
        <span style={{ fontSize: 12, color: '#706E6B' }}>{uploaded}/{DOCUMENT_CHECKLIST.length} uploaded ({pct}%)</span>
      </div>
      {/* Progress bar */}
      <div style={{ height: 6, background: '#F3F2F2', borderRadius: 3, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10b981' : '#0176D3', borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DOCUMENT_CHECKLIST.map(({ type, label }) => {
          const existing = getDocForType(type);
          const isUploading = uploading === type;
          const statusColor = existing?.verificationStatus === 'verified' ? '#10b981' : existing?.verificationStatus === 'needs_resubmission' ? '#ef4444' : existing ? '#F59E0B' : '#9E9D9B';
          const statusIcon  = existing?.verificationStatus === 'verified' ? '✅' : existing?.verificationStatus === 'needs_resubmission' ? '⚠️' : existing ? '⏳' : '📄';
          return (
            <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: existing ? 'rgba(1,118,211,0.04)' : '#FAFAF9', borderRadius: 10, border: `1px solid ${existing ? 'rgba(1,118,211,0.15)' : '#F1F5F9'}` }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#181818' }}>{statusIcon} {label}</span>
                {existing?.verificationNote && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>⚠️ {existing.verificationNote}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {existing && <a href={existing.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#0176D3' }}>View</a>}
                <input
                  ref={el => fileRefs.current[type] = el}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  style={{ display: 'none' }}
                  onChange={e => handleUpload(type, label, e.target.files[0])}
                />
                <button
                  onClick={() => fileRefs.current[type]?.click()}
                  disabled={isUploading}
                  style={{ background: existing ? '#F3F2F2' : '#0176D3', color: existing ? '#706E6B' : '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: isUploading ? 0.6 : 1 }}
                >
                  {isUploading ? '…' : existing ? 'Replace' : 'Upload'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Styles outside component ───────────────────────────────────────────────────
const S = {
  page: { minHeight: '100vh', background: '#F3F2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  container: { background: '#fff', borderRadius: 20, maxWidth: 700, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.1)', overflow: 'hidden' },
  header: { background: 'linear-gradient(135deg,#032D60,#0176D3)', padding: '28px 32px' },
  body: { padding: '28px 32px' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F3F2F2', fontSize: 13 },
  label: { color: '#706E6B', fontWeight: 600 },
  value: { color: '#181818', fontWeight: 600, textAlign: 'right', maxWidth: '60%' },
  signBox: { background: 'rgba(1,118,211,0.05)', border: '2px dashed rgba(1,118,211,0.3)', borderRadius: 12, padding: '20px 24px', marginTop: 24 },
  inp: { width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(1,118,211,0.3)', fontSize: 14, fontFamily: "'Georgia', serif", color: '#181818', background: '#fff', outline: 'none', boxSizing: 'border-box', marginTop: 8 },
  signedBadge: { background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#065f46', borderRadius: 10, padding: '12px 20px', fontSize: 13, fontWeight: 600, textAlign: 'center' },
};

export default function CandidateOffer({ user }) {
  const { offerId } = useParams();
  const [offer,    setOffer]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [toast,    setToast]    = useState('');
  const [typedName,setTypedName]= useState('');
  const [signing,  setSigning]  = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!offerId) return;
    setLoading(true);
    api.getOffer(offerId)
      .then(r => setOffer(r?.data || r))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [offerId]);

  const handleSign = async () => {
    if (!typedName.trim()) { setToast('❌ Please type your full name to sign'); return; }
    if (typedName.trim().length < 3) { setToast('❌ Name too short'); return; }
    setSigning(true);
    try {
      const result = await api.signOffer(offerId, typedName.trim());
      setOffer(result?.data || result);
      setToast('✅ Offer signed! Welcome to the team 🎉');
    } catch (e) { setToast(`❌ ${e.message}`); }
    setSigning(false);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await api.downloadOfferPdf(offerId);
    } catch (e) { setToast(`❌ ${e.message}`); }
    setDownloading(false);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center' }}><Spinner /><p style={{ color: '#706E6B', marginTop: 12 }}>Loading offer…</p></div>
    </div>
  );

  if (error) return (
    <div style={{ textAlign: 'center', padding: '60px 24px', color: '#BA0517' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontWeight: 600 }}>{error}</div>
    </div>
  );

  if (!offer) return null;

  const d = offer.templateData || {};
  const isSigned = offer.status === 'signed';
  const canSign  = offer.status === 'sent';

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      <div style={S.container}>
        {/* Header */}
        <div style={S.header}>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Offer Letter</div>
          <h2 style={{ color: '#fff', margin: 0, fontSize: 22, fontWeight: 800 }}>📨 {d.designation || 'Employment Offer'}</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '6px 0 0' }}>{d.companyName || 'TalentNest HR'}</p>
        </div>

        <div style={S.body}>
          {/* Details */}
          <div style={{ marginBottom: 20 }}>
            {[
              ['Position', d.designation],
              ['Company',  d.companyName],
              ['Annual CTC', d.ctc ? `₹ ${d.ctc}` : undefined],
              ['Date of Joining', d.joiningDate],
              ['Signatory', d.signatoryName ? `${d.signatoryName}${d.signatoryDesignation ? ` · ${d.signatoryDesignation}` : ''}` : undefined],
            ].filter(([,v]) => v).map(([label, value]) => (
              <div key={label} style={S.row}>
                <span style={S.label}>{label}</span>
                <span style={S.value}>{value}</span>
              </div>
            ))}
          </div>

          {d.customClauses && (
            <div style={{ background: '#F3F2F2', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#706E6B', marginBottom: 8 }}>SPECIAL TERMS</div>
              <div style={{ fontSize: 13, color: '#3E3E3C', lineHeight: 1.7 }}>{d.customClauses}</div>
            </div>
          )}

          {/* Signed state */}
          {isSigned && (
            <>
              <div style={S.signedBadge}>
                ✅ You signed this offer on {new Date(offer.signedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                <div style={{ marginTop: 12 }}>
                  <button onClick={handleDownload} disabled={downloading} style={{ ...btnP, fontSize: 13 }}>
                    {downloading ? 'Downloading…' : '⬇ Download Signed PDF'}
                  </button>
                </div>
              </div>
              <DocumentLocker candidateId={offer.candidateId} />
            </>
          )}

          {/* Pending sign */}
          {offer.status === 'draft' && (
            <div style={{ ...S.signBox, background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.3)' }}>
              <div style={{ fontSize: 13, color: '#706E6B' }}>⏳ This offer has not been sent yet. Your recruiter will send it shortly.</div>
            </div>
          )}

          {canSign && (
            <div style={S.signBox}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#032D60', marginBottom: 6 }}>✍️ Accept & Sign This Offer</div>
              <div style={{ fontSize: 12, color: '#706E6B', lineHeight: 1.7, marginBottom: 16 }}>
                By typing your full name below and clicking Accept, you confirm that you have read and agree to all the terms of this offer letter.
              </div>
              <label style={{ fontSize: 11, color: '#706E6B', fontWeight: 600 }}>TYPE YOUR FULL NAME (as it appears on your ID)</label>
              <input
                value={typedName}
                onChange={e => setTypedName(e.target.value)}
                placeholder="e.g. Sai Charan Madhusudhana"
                style={S.inp}
                autoComplete="name"
              />
              <div style={{ fontSize: 11, color: '#9E9D9B', marginTop: 8, marginBottom: 16 }}>
                Your IP address and timestamp will be recorded as part of the electronic signature.
              </div>
              <button onClick={handleSign} disabled={signing || !typedName.trim()} style={{ ...btnP, width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, opacity: !typedName.trim() ? 0.5 : 1 }}>
                {signing ? 'Signing…' : '✅ Accept & Sign Offer'}
              </button>
            </div>
          )}

          {/* Declined state */}
          {offer.status === 'declined' && (
            <div style={{ ...S.signBox, background: 'rgba(186,5,23,0.05)', borderColor: 'rgba(186,5,23,0.3)' }}>
              <div style={{ fontSize: 13, color: '#BA0517' }}>❌ This offer was declined.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
