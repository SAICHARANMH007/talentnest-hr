import { useState, useEffect } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Field from '../../components/ui/Field.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ResumeCard from '../../components/shared/ResumeCard.jsx';
import { btnP, btnG, btnD, card, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';

// ── Styles outside component ───────────────────────────────────────────────────
const S = {
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #F3F2F2' },
  td: { padding: '12px 14px', fontSize: 13, color: '#181818', borderBottom: '1px solid #F3F2F2', verticalAlign: 'middle' },
  empty: { textAlign: 'center', padding: '60px 24px', color: '#706E6B', fontSize: 14 },
  statusColors: { pending: '#F59E0B', in_progress: '#0176D3', fulfilled: '#34d399', cancelled: '#706E6B' },
  urgencyColors: { low: '#34d399', medium: '#0176D3', high: '#F59E0B', critical: '#BA0517' },
};

const URGENCY_OPTS = ['low', 'medium', 'high', 'critical'];
const EMPTY_FORM   = { roleTitle: '', requirements: '', urgency: 'medium', budget: '', jobId: '' };

function SkeletonRow() {
  return (
    <tr>
      {[1,2,3,4,5].map(i => (
        <td key={i} style={S.td}>
          <div className="tn-skeleton" style={{ height: 14, borderRadius: 6, width: '75%' }} />
        </td>
      ))}
    </tr>
  );
}

export default function AdminCandidateRequest({ user }) {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [toast,    setToast]    = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [submitting,setSubmitting]= useState(false);
  const [detail,           setDetail]           = useState(null);
  const [selectedCandidate,setSelectedCandidate] = useState(null); // candidate detail modal
  const [selectedRequest,  setSelectedRequest]   = useState(null); // which request owns the selected candidate
  const [addingToPipeline, setAddingToPipeline]  = useState(false);
  const [jobs,             setJobs]              = useState([]); // active jobs for selector

  const load = () => {
    setLoading(true); setError('');
    api.getCandidateRequests()
      .then(r => setRequests(Array.isArray(r) ? r : (r?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Load active jobs for the job selector in the form
  useEffect(() => {
    api.getJobs({ status: 'active', limit: 10000000 })
      .then(r => setJobs(Array.isArray(r) ? r : (r?.data || [])))
      .catch(() => setJobs([]));
  }, []);

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.roleTitle.trim()) { setToast('❌ Role title is required'); return; }
    setSubmitting(true);
    try {
      await api.createCandidateRequest(form);
      setToast('✅ Request submitted! Our team will get back to you shortly.');
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e) {
      setToast(`❌ ${e.message}`);
    }
    setSubmitting(false);
  };

  const handleCancel = async (id) => {
    try {
      await api.cancelCandidateRequest(id);
      setToast('✅ Request cancelled');
      load();
    } catch (e) {
      setToast(`❌ ${e.message}`);
    }
  };

  const openCandidate = (candidate, request) => {
    setSelectedCandidate(candidate);
    setSelectedRequest(request);
  };

  const handleAddToPipeline = async () => {
    const req = selectedRequest || detail;
    const jobId = req?.jobId?._id || req?.jobId?.id || req?.jobId;
    const cid   = selectedCandidate?.id || selectedCandidate?._id?.toString();
    if (!jobId) { setToast('❌ This request has no linked job. Please link a job first.'); return; }
    if (!cid)   { setToast('❌ Cannot identify candidate ID.'); return; }
    setAddingToPipeline(true);
    try {
      await api.applyToJob(jobId, cid);
      setToast(`✅ ${selectedCandidate.name} added to job pipeline!`);
      setSelectedCandidate(null); setSelectedRequest(null);
    } catch (e) {
      const msg = e.message || '';
      if (msg.toLowerCase().includes('already')) {
        setToast(`⚠️ ${selectedCandidate.name} is already in the pipeline for this job.`);
      } else {
        setToast(`❌ ${msg}`);
      }
    }
    setAddingToPipeline(false);
  };

  // Full-page detail view for a request
  if (detail) {
    const hasCandidates = Array.isArray(detail.submittedCandidates) && detail.submittedCandidates.length > 0;
    return (
      <div>
        <Toast msg={toast} onClose={() => setToast('')} />
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <button onClick={() => setDetail(null)} style={{ ...btnG, display:'flex', alignItems:'center', gap:6 }}>
            ← Back
          </button>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'#0176D3', textTransform:'uppercase', letterSpacing:1 }}>Candidate Request</div>
            <h2 style={{ margin:0, fontSize:19, fontWeight:900, color:'#0A1628' }}>{detail.roleTitle}</h2>
            <div style={{ fontSize:12, color:'#706E6B', marginTop:2 }}>Submitted {new Date(detail.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
          </div>
        </div>

        {/* Requirements */}
        <div style={{ ...card, marginBottom:16, padding:'16px 20px' }}>
          <div style={{ fontWeight:700, fontSize:11, color:'#475569', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>Requirements</div>
          <div style={{ fontSize:14, color:'#374151', lineHeight:1.7 }}>{detail.requirements || 'No specific requirements.'}</div>
          {detail.adminNotes && (
            <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(1,118,211,0.07)', borderRadius:8, fontSize:13, color:'#0176D3', fontWeight:600 }}>
              📝 Note from TalentNest: {detail.adminNotes}
            </div>
          )}
        </div>

        {/* Submitted candidates */}
        <div style={card}>
          {!hasCandidates ? (
            <div style={{ textAlign:'center', padding:'40px 20px', color:'#706E6B' }}>
              <div style={{ fontSize:36, marginBottom:10 }}>⏳</div>
              <div style={{ fontWeight:600, marginBottom:6 }}>Awaiting Candidates</div>
              <div style={{ fontSize:13 }}>TalentNest is sourcing candidates for this role. You'll receive a notification when they're ready.</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize:13, fontWeight:800, color:'#059669', marginBottom:16, textTransform:'uppercase', letterSpacing:0.5 }}>
                👥 {detail.submittedCandidates.length} Candidate{detail.submittedCandidates.length !== 1 ? 's' : ''} Submitted by TalentNest
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {detail.submittedCandidates.map(c => {
                  const cid = c.id || c._id?.toString();
                  return (
                    <div
                      key={cid}
                      onClick={() => setSelectedCandidate(c)}
                      style={{ background:'#F8FAFF', borderRadius:12, padding:'14px 18px', border:'1px solid #E2E8F0', display:'flex', gap:14, alignItems:'flex-start', flexWrap:'wrap', cursor:'pointer', transition:'box-shadow 0.15s,border-color 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow='0 4px 16px rgba(1,118,211,0.12)'; e.currentTarget.style.borderColor='#0176D3'; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor='#E2E8F0'; }}
                    >
                      <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#0176D3,#014486)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:16, flexShrink:0 }}>
                        {(c.name || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:800, fontSize:14, color:'#0A1628' }}>{c.name}</div>
                        <div style={{ fontSize:12, color:'#64748B', marginTop:2 }}>
                          {c.title && `${c.title}`}{c.currentCompany ? ` · ${c.currentCompany}` : ''}
                          {c.experience ? ` · ${c.experience}y exp` : ''}
                        </div>
                        <div style={{ fontSize:12, color:'#94A3B8', marginTop:1 }}>
                          {c.email}{c.phone ? ` · 📞 ${c.phone}` : ''}{c.location ? ` · 📍 ${c.location}` : ''}
                        </div>
                        {c.skills?.length > 0 && (
                          <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:6 }}>
                            {c.skills.slice(0,6).map(s => (
                              <span key={s} style={{ background:'rgba(1,118,211,0.08)', color:'#0176D3', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ display:'flex', gap:8, flexShrink:0, alignSelf:'center' }}>
                        <span style={{ fontSize:11, fontWeight:700, color:'#059669', background:'rgba(5,150,105,0.08)', padding:'4px 10px', borderRadius:20 }}>✓ TalentNest Verified</span>
                        <span style={{ fontSize:11, fontWeight:700, color:'#0176D3', background:'rgba(1,118,211,0.08)', padding:'4px 10px', borderRadius:20 }}>View Profile →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── Candidate Detail Modal ──────────────────────────────────── */}
        {selectedCandidate && (() => {
          const c = selectedCandidate;
          const hasLinkedJob = !!(detail?.jobId?._id || detail?.jobId?.id || (typeof detail?.jobId === 'string' && detail.jobId));
          const skillsArr = Array.isArray(c.skills) ? c.skills : (typeof c.skills === 'string' ? c.skills.split(',').map(s=>s.trim()).filter(Boolean) : []);
          return (
            <Modal
              title={`👤 ${c.name}`}
              onClose={() => setSelectedCandidate(null); setSelectedRequest(null)}
              footer={
                <div style={{ display:'flex', gap:10, justifyContent:'flex-end', flexWrap:'wrap' }}>
                  <button onClick={() => setSelectedCandidate(null); setSelectedRequest(null)} style={btnG}>Close</button>
                  {hasLinkedJob ? (
                    <button onClick={handleAddToPipeline} disabled={addingToPipeline} style={{ ...btnP, minWidth:160 }}>
                      {addingToPipeline ? 'Adding…' : '➕ Add to Pipeline'}
                    </button>
                  ) : (
                    <span style={{ fontSize:12, color:'#94A3B8', alignSelf:'center' }}>No linked job — cannot add to pipeline</span>
                  )}
                </div>
              }
            >
              {/* Profile overview */}
              <div style={{ display:'flex', gap:16, alignItems:'flex-start', marginBottom:20, flexWrap:'wrap' }}>
                <div style={{ width:64, height:64, borderRadius:16, background:'linear-gradient(135deg,#0176D3,#014486)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:24, flexShrink:0 }}>
                  {(c.name || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:900, fontSize:18, color:'#0A1628' }}>{c.name}</div>
                  {c.title && <div style={{ fontSize:13, color:'#0176D3', fontWeight:700, marginTop:2 }}>{c.title}{c.currentCompany ? ` @ ${c.currentCompany}` : ''}</div>}
                  <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:6, fontSize:12, color:'#64748B' }}>
                    {c.location && <span>📍 {c.location}</span>}
                    {c.experience && <span>💼 {c.experience} yr{c.experience !== 1 ? 's' : ''} experience</span>}
                    {c.availability && <span>🕐 {c.availability}</span>}
                  </div>
                </div>
                <span style={{ fontSize:11, fontWeight:700, color:'#059669', background:'rgba(5,150,105,0.08)', padding:'6px 12px', borderRadius:20, flexShrink:0 }}>✓ TalentNest Verified</span>
              </div>

              {/* Contact info */}
              <div style={{ background:'#F8FAFF', borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', gap:24, flexWrap:'wrap' }}>
                {c.email && <div><span style={{ fontSize:11, fontWeight:700, color:'#706E6B', display:'block', marginBottom:2 }}>EMAIL</span><span style={{ fontSize:13 }}>{c.email}</span></div>}
                {c.phone && <div><span style={{ fontSize:11, fontWeight:700, color:'#706E6B', display:'block', marginBottom:2 }}>PHONE</span><span style={{ fontSize:13 }}>📞 {c.phone}</span></div>}
                {c.currentCTC && <div><span style={{ fontSize:11, fontWeight:700, color:'#706E6B', display:'block', marginBottom:2 }}>CURRENT CTC</span><span style={{ fontSize:13 }}>{c.currentCTC}</span></div>}
                {c.expectedCTC && <div><span style={{ fontSize:11, fontWeight:700, color:'#706E6B', display:'block', marginBottom:2 }}>EXPECTED CTC</span><span style={{ fontSize:13 }}>{c.expectedCTC}</span></div>}
              </div>

              {/* Summary */}
              {c.summary && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#706E6B', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>Summary</div>
                  <div style={{ fontSize:13, color:'#374151', lineHeight:1.7 }}>{c.summary}</div>
                </div>
              )}

              {/* Skills */}
              {skillsArr.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#706E6B', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>Skills</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {skillsArr.map(s => (
                      <span key={s} style={{ background:'rgba(1,118,211,0.08)', color:'#0176D3', fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Resume */}
              <div style={{ borderTop:'1px solid #F1F5F9', paddingTop:16 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#706E6B', textTransform:'uppercase', letterSpacing:0.5, marginBottom:12 }}>Resume</div>
                <ResumeCard candidate={c} />
              </div>
            </Modal>
          );
        })()}
      </div>
    );
  }

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      <PageHeader
        title="🙋 Candidate Requests"
        subtitle="Request emergency staffing support from TalentNest"
        action={<button onClick={() => setShowForm(true)} style={btnP}>+ New Request</button>}
      />

      {error && (
        <div style={{ ...card, background: 'rgba(186,5,23,0.06)', border: '1px solid rgba(186,5,23,0.2)', color: '#BA0517', marginBottom: 16 }}>
          ❌ {error} <button onClick={load} style={{ ...btnG, marginLeft: 12 }}>Retry</button>
        </div>
      )}

      <div style={card}>
        {loading ? (
          <table style={S.table}>
            <thead><tr>{['Role','Urgency','Budget','Status','Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{[1,2,3].map(i => <SkeletonRow key={i} />)}</tbody>
          </table>
        ) : requests.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🙋</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>No requests yet</div>
            <div style={{ fontSize: 12, marginBottom: 20 }}>Submit a staffing request and our team will source candidates for you</div>
            <button onClick={() => setShowForm(true)} style={btnP}>+ Submit First Request</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {requests.map(r => {
              const hasCandidates = Array.isArray(r.submittedCandidates) && r.submittedCandidates.length > 0;
              return (
                <div key={r.id || r._id} style={{ border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
                  {/* Request header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 20px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#0A1628' }}>{r.roleTitle}</div>
                      {r.requirements && <div style={{ fontSize: 12, color: '#706E6B', marginTop: 3, lineHeight: 1.5 }}>{r.requirements.slice(0,120)}{r.requirements.length > 120 ? '…' : ''}</div>}
                      {r.adminNotes && <div style={{ fontSize: 12, color: '#0176D3', marginTop: 6, background: 'rgba(1,118,211,0.07)', borderRadius: 6, padding: '4px 10px', display: 'inline-block' }}>📝 {r.adminNotes}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
                      <Badge label={r.urgency} color={S.urgencyColors[r.urgency] || '#706E6B'} />
                      <Badge label={(r.status || 'pending').replace('_', ' ')} color={S.statusColors[r.status] || '#706E6B'} />
                      {r.budget && <span style={{ fontSize: 12, color: '#64748B' }}>💰 {r.budget}</span>}
                      <button onClick={() => setDetail(r)} style={{ ...btnG, padding: '5px 14px', fontSize: 12, display:'flex', alignItems:'center', gap:4 }}>
                        {hasCandidates ? `👥 View ${r.submittedCandidates.length} Candidates` : 'View Details →'}
                      </button>
                      {r.status === 'pending' && (
                        <button onClick={() => handleCancel(r.id || r._id)} style={{ ...btnD, padding: '5px 12px', fontSize: 12 }}>Cancel</button>
                      )}
                    </div>
                  </div>

                  {/* Submitted candidates section — shown when TalentNest has assigned candidates */}
                  {hasCandidates && (
                    <div style={{ borderTop: '1px solid #F1F5F9', background: '#F8FAFF', padding: '14px 20px' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#059669', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        👥 {r.submittedCandidates.length} Candidate{r.submittedCandidates.length !== 1 ? 's' : ''} Submitted by TalentNest
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {r.submittedCandidates.map(c => {
                          const cid = c.id || c._id?.toString();
                          return (
                            <div
                              key={cid}
                              onClick={() => openCandidate(c, r)}
                              style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 10, padding: '10px 14px', border: '1px solid #E2E8F0', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = '#0176D3'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(1,118,211,0.1)'; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0176D3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                                {(c.name || '?')[0].toUpperCase()}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>{c.name}</div>
                                <div style={{ fontSize: 11, color: '#64748B' }}>
                                  {c.title && `${c.title} · `}{c.email || ''}{c.phone ? ` · 📞 ${c.phone}` : ''}
                                  {c.experience ? ` · ${c.experience}y exp` : ''}
                                </div>
                                {c.skills?.length > 0 && (
                                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                                    {c.skills.slice(0, 4).map(s => (
                                      <span key={s} style={{ background: 'rgba(1,118,211,0.08)', color: '#0176D3', fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20 }}>{s}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#0176D3', background: 'rgba(1,118,211,0.08)', padding: '3px 10px', borderRadius: 20, flexShrink: 0 }}>View Profile →</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Candidate Detail Modal (from list view) ── */}
      {selectedCandidate && (() => {
        const c = selectedCandidate;
        const req = selectedRequest || detail;
        const hasLinkedJob = !!(req?.jobId?._id || req?.jobId?.id || (typeof req?.jobId === 'string' && req.jobId));
        const skillsArr = Array.isArray(c.skills) ? c.skills : (typeof c.skills === 'string' ? c.skills.split(',').map(s=>s.trim()).filter(Boolean) : []);
        return (
          <Modal
            title={`👤 ${c.name}`}
            onClose={() => { setSelectedCandidate(null); setSelectedRequest(null); }}
            footer={
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end', flexWrap:'wrap' }}>
                <button onClick={() => { setSelectedCandidate(null); setSelectedRequest(null); }} style={btnG}>Close</button>
                {hasLinkedJob
                  ? <button onClick={handleAddToPipeline} disabled={addingToPipeline} style={{ ...btnP, minWidth:160 }}>{addingToPipeline ? 'Adding…' : '➕ Add to Pipeline'}</button>
                  : <span style={{ fontSize:12, color:'#94A3B8', alignSelf:'center' }}>No linked job — cannot add to pipeline</span>
                }
              </div>
            }
          >
            <div style={{ display:'flex', gap:16, alignItems:'flex-start', marginBottom:16, flexWrap:'wrap' }}>
              <div style={{ width:52, height:52, borderRadius:16, background:'linear-gradient(135deg,#0176D3,#014486)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:20, flexShrink:0 }}>
                {(c.name||'?')[0].toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:900, fontSize:17, color:'#0A1628' }}>{c.name}</div>
                {c.title && <div style={{ fontSize:13, color:'#0176D3', fontWeight:700, marginTop:2 }}>{c.title}{c.currentCompany ? ` @ ${c.currentCompany}` : ''}</div>}
                <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:4, fontSize:12, color:'#64748B' }}>
                  {c.location && <span>📍 {c.location}</span>}
                  {c.experience && <span>💼 {c.experience}y exp</span>}
                </div>
              </div>
              <span style={{ fontSize:11, fontWeight:700, color:'#059669', background:'rgba(5,150,105,0.08)', padding:'5px 12px', borderRadius:20 }}>✓ TalentNest Verified</span>
            </div>
            <div style={{ background:'#F8FAFF', borderRadius:10, padding:'10px 14px', marginBottom:14, display:'flex', gap:20, flexWrap:'wrap' }}>
              {c.email && <div><span style={{ fontSize:11, fontWeight:700, color:'#706E6B', display:'block' }}>EMAIL</span><span style={{ fontSize:13 }}>{c.email}</span></div>}
              {c.phone && <div><span style={{ fontSize:11, fontWeight:700, color:'#706E6B', display:'block' }}>PHONE</span><span style={{ fontSize:13 }}>📞 {c.phone}</span></div>}
              {c.currentCTC && <div><span style={{ fontSize:11, fontWeight:700, color:'#706E6B', display:'block' }}>CURRENT CTC</span><span style={{ fontSize:13 }}>{c.currentCTC}</span></div>}
              {c.expectedCTC && <div><span style={{ fontSize:11, fontWeight:700, color:'#706E6B', display:'block' }}>EXPECTED CTC</span><span style={{ fontSize:13 }}>{c.expectedCTC}</span></div>}
            </div>
            {c.summary && <div style={{ fontSize:13, color:'#374151', lineHeight:1.7, marginBottom:14 }}>{c.summary}</div>}
            {skillsArr.length > 0 && (
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
                {skillsArr.map(s => <span key={s} style={{ background:'rgba(1,118,211,0.08)', color:'#0176D3', fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>{s}</span>)}
              </div>
            )}
            <div style={{ borderTop:'1px solid #F1F5F9', paddingTop:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#706E6B', textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>Resume</div>
              <ResumeCard candidate={c} />
            </div>
          </Modal>
        );
      })()}

      {/* New Request Modal */}
      {showForm && (
        <Modal title="🙋 Submit Staffing Request" onClose={() => { setShowForm(false); setForm(EMPTY_FORM); }} footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} style={btnG}>Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} style={btnP}>{submitting ? 'Submitting…' : 'Submit Request'}</button>
          </div>
        }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Job selector — pick from active jobs */}
            <div>
              <label style={{ fontSize: 11, color: '#706E6B', fontWeight: 600, display: 'block', marginBottom: 6 }}>LINKED JOB (optional — pick from your active jobs)</label>
              <select
                value={form.jobId}
                onChange={e => {
                  const jid = e.target.value;
                  const job = jobs.find(j => (j._id || j.id) === jid);
                  sf('jobId', jid);
                  if (job && !form.roleTitle) sf('roleTitle', job.title || '');
                }}
                style={{ ...inp, width: '100%' }}
              >
                <option value="">— Select a job (or leave blank to describe manually) —</option>
                {jobs.map(j => {
                  const jid = j._id || j.id;
                  return <option key={jid} value={jid}>{j.title}{j.companyName || j.company ? ` @ ${j.companyName || j.company}` : ''}{j.location ? ` · ${j.location}` : ''}</option>;
                })}
              </select>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 0' }}>Linking a job helps TalentNest source candidates that exactly match your requirements.</p>
            </div>
            <Field label="Role / Position Title *" value={form.roleTitle} onChange={v => sf('roleTitle', v)} placeholder="e.g. Senior React Developer" />
            <Field label="Requirements" value={form.requirements} onChange={v => sf('requirements', v)} type="textarea" placeholder="Skills needed, experience level, team size, key technologies…" />
            <div>
              <label style={{ fontSize: 11, color: '#706E6B', fontWeight: 600, display: 'block', marginBottom: 6 }}>URGENCY</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {URGENCY_OPTS.map(u => (
                  <button
                    key={u}
                    onClick={() => sf('urgency', u)}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer', border: form.urgency === u ? `2px solid ${S.urgencyColors[u]}` : '1px solid #EAF5FE', background: form.urgency === u ? `${S.urgencyColors[u]}20` : '#fff', color: form.urgency === u ? S.urgencyColors[u] : '#706E6B', textTransform: 'capitalize' }}
                  >{u}</button>
                ))}
              </div>
            </div>
            <Field label="Budget Range" value={form.budget} onChange={v => sf('budget', v)} placeholder="e.g. ₹8–12 LPA or ₹80/hr" />
          </div>
        </Modal>
      )}
    </div>
  );
}
