import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { card, btnP, btnG, btnD, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const ff = "'Plus Jakarta Sans','Segoe UI',sans-serif";

const DOC_STATUS = {
  uploaded:     { bg:'rgba(1,118,211,0.1)',   text:'#0176D3',  label:'Uploaded',     icon:'📤' },
  under_review: { bg:'rgba(245,158,11,0.1)',  text:'#F59E0B',  label:'Under Review', icon:'⏳' },
  verified:     { bg:'rgba(16,185,129,0.1)',  text:'#10B981',  label:'Verified',     icon:'✅' },
  rejected:     { bg:'rgba(186,5,23,0.08)',   text:'#BA0517',  label:'Rejected',     icon:'❌' },
};

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
}
function fmtSize(b) {
  if (!b) return '';
  if (b < 1024) return `${b}B`;
  if (b < 1048576) return `${(b/1024).toFixed(0)}KB`;
  return `${(b/1048576).toFixed(1)}MB`;
}

// ── Per-candidate document row ─────────────────────────────────────────────────
function CandidateRow({ row, onVerify }) {
  const [open,    setOpen]    = useState(false);
  const [preview, setPreview] = useState(null); // { docId, loading, fileUrl, mimeType }
  const [toast,   setToast]   = useState('');
  const [verifying, setVerifying] = useState('');

  const allVerified   = row.verifiedDocs === row.totalDocs;
  const anyPending    = row.pendingDocs  > 0;
  const anyRejected   = row.rejectedDocs > 0;

  const rowBg = allVerified ? 'rgba(16,185,129,0.04)' : anyPending ? 'rgba(245,158,11,0.03)' : anyRejected ? 'rgba(186,5,23,0.03)' : '#fff';

  const handlePreview = async (docId) => {
    setPreview({ docId, loading: true });
    try {
      const r = await api.getBgvDocumentFile(docId);
      setPreview({ docId, loading: false, fileUrl: r?.data?.fileUrl, mimeType: r?.data?.mimeType });
    } catch {
      setPreview(null);
      setToast('❌ Could not load document');
    }
  };

  const handleVerify = async (docId, status) => {
    setVerifying(docId + status);
    try {
      await api.verifyBgvDocument(docId, { status });
      setToast(`✅ Document marked as ${status}`);
      onVerify(); // refresh parent
    } catch (e) { setToast(`❌ ${e.message}`); }
    setVerifying('');
  };

  return (
    <div style={{ border:`1px solid ${allVerified ? 'rgba(16,185,129,0.3)' : '#E2E8F0'}`, borderRadius:14, overflow:'hidden', background:rowBg, marginBottom:12 }}>
      <Toast msg={toast} onClose={()=>setToast('')} />

      {/* Header row */}
      <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', cursor:'pointer', flexWrap:'wrap' }}
        onClick={() => setOpen(o => !o)}>
        {/* Avatar */}
        <div style={{ width:42, height:42, borderRadius:12, background: allVerified ? 'linear-gradient(135deg,#10B981,#059669)' : 'linear-gradient(135deg,#0176D3,#014486)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:16, flexShrink:0 }}>
          {(row.name || '?')[0].toUpperCase()}
        </div>

        {/* Info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontWeight:800, fontSize:14, color:'#0A1628' }}>{row.name}</span>
            {row.bgvVerified && (
              <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:'linear-gradient(135deg,#10B981,#059669)', color:'#fff', fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:20, letterSpacing:0.5 }}>
                🏅 TalentNest Verified
              </span>
            )}
          </div>
          <div style={{ fontSize:12, color:'#64748B', marginTop:1 }}>{row.email}{row.phone ? ` · ${row.phone}` : ''}</div>
        </div>

        {/* Doc counts */}
        <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, fontWeight:700, color:'#10B981', background:'rgba(16,185,129,0.1)', padding:'3px 10px', borderRadius:20 }}>
            ✅ {row.verifiedDocs}/{row.totalDocs} verified
          </span>
          {row.pendingDocs > 0 && (
            <span style={{ fontSize:11, fontWeight:700, color:'#F59E0B', background:'rgba(245,158,11,0.1)', padding:'3px 10px', borderRadius:20 }}>
              ⏳ {row.pendingDocs} pending
            </span>
          )}
          {row.rejectedDocs > 0 && (
            <span style={{ fontSize:11, fontWeight:700, color:'#BA0517', background:'rgba(186,5,23,0.08)', padding:'3px 10px', borderRadius:20 }}>
              ❌ {row.rejectedDocs} rejected
            </span>
          )}
          <span style={{ fontSize:11, color:'#94A3B8' }}>Last: {fmtDate(row.latestUpload)}</span>
          <span style={{ color:'#94A3B8', fontSize:14 }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Documents expanded */}
      {open && (
        <div style={{ borderTop:'1px solid #F1F5F9', padding:'16px 18px' }}>
          {row.docs.length === 0 ? (
            <div style={{ color:'#94A3B8', fontSize:13, textAlign:'center', padding:16 }}>No documents</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {row.docs.map(doc => {
                const st = DOC_STATUS[doc.status] || DOC_STATUS.uploaded;
                const isVerifying = verifying.startsWith(doc.id);
                return (
                  <div key={doc.id} style={{ display:'flex', alignItems:'center', gap:12, background:'#fff', borderRadius:10, padding:'10px 14px', border:'1px solid #E2E8F0', flexWrap:'wrap' }}>
                    <div style={{ fontSize:20, flexShrink:0 }}>
                      {doc.mimeType?.includes('pdf') ? '📄' : doc.mimeType?.includes('image') ? '🖼️' : '📑'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:13, color:'#0A1628' }}>{doc.docName}</div>
                      <div style={{ fontSize:11, color:'#94A3B8', marginTop:1 }}>
                        {doc.docTypeLabel}{doc.fileSize ? ` · ${fmtSize(doc.fileSize)}` : ''} · {fmtDate(doc.createdAt)}
                      </div>
                      {doc.rejectNote && (
                        <div style={{ fontSize:11, color:'#BA0517', marginTop:2 }}>Note: {doc.rejectNote}</div>
                      )}
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color:st.text, background:st.bg, padding:'3px 10px', borderRadius:20, flexShrink:0 }}>{st.icon} {st.label}</span>
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <button onClick={() => handlePreview(doc.id)}
                        style={{ ...btnG, fontSize:11, padding:'5px 12px' }}>Preview</button>
                      {doc.status !== 'verified' && (
                        <button onClick={() => handleVerify(doc.id, 'verified')}
                          disabled={!!isVerifying}
                          style={{ background:'#10B981', border:'none', borderRadius:8, color:'#fff', fontSize:11, fontWeight:700, padding:'5px 12px', cursor:'pointer', opacity: isVerifying ? 0.7 : 1 }}>
                          {verifying === doc.id + 'verified' ? '…' : '✓ Verify'}
                        </button>
                      )}
                      {doc.status !== 'rejected' && (
                        <button onClick={() => handleVerify(doc.id, 'rejected')}
                          disabled={!!isVerifying}
                          style={{ ...btnD, fontSize:11, padding:'5px 12px', opacity: isVerifying ? 0.7 : 1 }}>
                          {verifying === doc.id + 'rejected' ? '…' : '✗ Reject'}
                        </button>
                      )}
                      {doc.status !== 'under_review' && doc.status !== 'verified' && (
                        <button onClick={() => handleVerify(doc.id, 'under_review')}
                          disabled={!!isVerifying}
                          style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:8, color:'#F59E0B', fontSize:11, fontWeight:700, padding:'5px 12px', cursor:'pointer' }}>
                          Review
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div style={{ position:'fixed', inset:0, zIndex:9100, background:'rgba(5,13,26,0.75)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={() => setPreview(null)}>
          <div style={{ background:'#fff', borderRadius:16, padding:20, maxWidth:820, width:'100%', maxHeight:'90vh', overflow:'auto', position:'relative' }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreview(null)}
              style={{ position:'absolute', top:14, right:14, background:'#F1F5F9', border:'none', width:32, height:32, borderRadius:8, cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            <h3 style={{ margin:'0 0 14px', fontSize:15, fontWeight:800 }}>Document Preview</h3>
            {preview.loading ? (
              <div style={{ display:'flex', justifyContent:'center', padding:40 }}><Spinner size={32} /></div>
            ) : preview.fileUrl ? (
              preview.mimeType?.includes('pdf')
                ? <iframe src={preview.fileUrl} style={{ width:'100%', height:'70vh', border:'none', borderRadius:8 }} title="Preview" />
                : <img src={preview.fileUrl} alt="Document" style={{ maxWidth:'100%', borderRadius:8 }} />
            ) : (
              <div style={{ textAlign:'center', padding:40, color:'#706E6B' }}>Unable to preview this document.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function SuperAdminBgvTracker() {
  const [rows,     setRows]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('');
  const [search,   setSearch]   = useState('');
  const [toast,    setToast]    = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  const load = useCallback((page = 1) => {
    setLoading(true);
    const qs = new URLSearchParams({ page, limit: 50 });
    if (filter) qs.set('status', filter);
    api.getAllBgvSubmissions(qs.toString())
      .then(r => {
        setRows(Array.isArray(r?.data) ? r.data : []);
        if (r?.pagination) setPagination(r.pagination);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(1); }, [load]);

  const filtered = search
    ? rows.filter(r => r.name?.toLowerCase().includes(search.toLowerCase()) || r.email?.toLowerCase().includes(search.toLowerCase()))
    : rows;

  const totalCands    = pagination.total;
  const verifiedCands = rows.filter(r => r.bgvVerified).length;
  const pendingCands  = rows.filter(r => r.pendingDocs > 0).length;

  return (
    <div style={{ fontFamily:ff, animation:'tn-fadein 0.3s ease both' }}>
      <Toast msg={toast} onClose={()=>setToast('')} />

      <PageHeader
        title="🛡️ BGV Document Tracker"
        subtitle="Review and verify background verification documents submitted by candidates"
      />

      {/* What is BGV Verified badge — info card */}
      <div style={{ ...card, marginBottom:20, padding:'16px 20px', background:'linear-gradient(135deg,rgba(16,185,129,0.06),rgba(5,150,105,0.03))', border:'1px solid rgba(16,185,129,0.25)' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:14, flexWrap:'wrap' }}>
          <span style={{ fontSize:28, flexShrink:0 }}>🏅</span>
          <div>
            <div style={{ fontWeight:800, fontSize:14, color:'#065f46', marginBottom:4 }}>TalentNest Verified Badge</div>
            <div style={{ fontSize:12, color:'#374151', lineHeight:1.7, maxWidth:600 }}>
              When you verify <strong>all</strong> documents submitted by a candidate, they automatically receive the <strong>TalentNest Verified</strong> badge on their profile. Verified candidates appear as more trustworthy to recruiters and get <strong>higher visibility</strong> in recruiter searches and talent match results.
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:14, marginBottom:20 }}>
        {[
          { icon:'👥', label:'Candidates Submitted', value:totalCands, color:'#0176D3' },
          { icon:'🏅', label:'Fully Verified',       value:verifiedCands, color:'#10B981' },
          { icon:'⏳', label:'Pending Review',        value:pendingCands,  color:'#F59E0B' },
        ].map(k => (
          <div key={k.label} style={{ ...card, textAlign:'center', padding:'16px 12px' }}>
            <div style={{ fontSize:28, marginBottom:4 }}>{k.icon}</div>
            <div style={{ fontWeight:900, fontSize:26, color:k.color }}>{k.value}</div>
            <div style={{ fontSize:11, color:'#706E6B', fontWeight:600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search by name or email…"
          style={{ ...inp, flex:1, minWidth:200 }} />
        <select value={filter} onChange={e=>setFilter(e.target.value)} style={{ ...inp, width:180 }}>
          <option value="">All Document Statuses</option>
          <option value="uploaded">Uploaded (Unreviewed)</option>
          <option value="under_review">Under Review</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <button onClick={() => load(1)} style={btnG}>↻ Refresh</button>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign:'center', padding:'60px 40px' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🛡️</div>
          <div style={{ fontWeight:700, marginBottom:6 }}>{search || filter ? 'No matches found' : 'No BGV submissions yet'}</div>
          <div style={{ fontSize:12, color:'#706E6B' }}>
            {search || filter ? 'Try adjusting your filters.' : 'Candidates will appear here once they upload their BGV documents.'}
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize:12, color:'#706E6B', marginBottom:12 }}>
            Showing {filtered.length} candidate{filtered.length !== 1 ? 's' : ''} · Click any row to expand documents
          </div>
          {filtered.map(row => (
            <CandidateRow key={String(row.userId)} row={row} onVerify={() => load(pagination.page)} />
          ))}
          {pagination.pages > 1 && (
            <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:20, flexWrap:'wrap' }}>
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => load(p)}
                  style={{ padding:'7px 14px', borderRadius:8, border:`1.5px solid ${p === pagination.page ? '#0176D3' : '#E2E8F0'}`, background: p === pagination.page ? '#0176D3' : '#fff', color: p === pagination.page ? '#fff' : '#374151', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
