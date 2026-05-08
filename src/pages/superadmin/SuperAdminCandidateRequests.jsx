import { useState, useEffect, useCallback, useRef } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { btnP, btnG, btnD, card, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const ff = "'Plus Jakarta Sans','Segoe UI',sans-serif";
const STATUS_COLORS = {
  pending    : { bg:'rgba(245,158,11,0.12)', text:'#F59E0B',   label:'Pending' },
  in_progress: { bg:'rgba(1,118,211,0.12)',  text:'#0176D3',   label:'In Review' },
  fulfilled  : { bg:'rgba(34,197,94,0.1)',   text:'#16a34a',   label:'Fulfilled' },
  cancelled  : { bg:'rgba(112,110,107,0.1)', text:'#706E6B',   label:'Cancelled' },
};
const URGENCY_COLORS = { critical:'#BA0517', high:'#F59E0B', medium:'#0176D3', low:'#34d399' };

// ── Search filter panel ────────────────────────────────────────────────────────
function SearchPanel({ onSearch, loading }) {
  const [f, setF] = useState({ skills:'', experienceLevel:'', location:'', jobType:'', noticePeriod:'', keyword:'' });
  const sf = (k, v) => setF(p => ({ ...p, [k]: v }));
  const submit = () => {
    const qs = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v) qs.set(k, v); });
    onSearch(qs.toString());
  };
  return (
    <div style={{ padding:'16px', background:'#F8FAFC', borderRadius:12, marginBottom:16, border:'1px solid #E2E8F0' }}>
      <div style={{ fontWeight:800, fontSize:13, color:'#0A1628', marginBottom:12 }}>🔍 Advanced Candidate Search</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:10, marginBottom:10 }}>
        <input placeholder="Skills (comma-separated)" value={f.skills} onChange={e=>sf('skills',e.target.value)} style={{ ...inp, fontSize:12 }} />
        <select value={f.experienceLevel} onChange={e=>sf('experienceLevel',e.target.value)} style={{ ...inp, fontSize:12 }}>
          <option value="">Experience Level</option>
          {['fresher','junior','mid','senior','lead'].map(l=><option key={l} value={l}>{l}</option>)}
        </select>
        <input placeholder="Location" value={f.location} onChange={e=>sf('location',e.target.value)} style={{ ...inp, fontSize:12 }} />
        <select value={f.jobType} onChange={e=>sf('jobType',e.target.value)} style={{ ...inp, fontSize:12 }}>
          <option value="">Job Type Preference</option>
          {['full-time','part-time','contract','internship','freelance'].map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <select value={f.noticePeriod} onChange={e=>sf('noticePeriod',e.target.value)} style={{ ...inp, fontSize:12 }}>
          <option value="">Notice Period</option>
          {['immediate','15days','30days','60days','90days'].map(n=><option key={n} value={n}>{n}</option>)}
        </select>
        <input placeholder="Keyword (name, title…)" value={f.keyword} onChange={e=>sf('keyword',e.target.value)} style={{ ...inp, fontSize:12 }} />
      </div>
      <button onClick={submit} disabled={loading} style={{ ...btnP, fontSize:12 }}>{loading?'Searching…':'Search Candidates'}</button>
    </div>
  );
}

// ── Candidate card ──────────────────────────────────────────────────────────
function CandCard({ cand, selected, onToggle, matchScore }) {
  const isSelected = selected.has(String(cand._id || cand.id));
  return (
    <div onClick={() => onToggle(String(cand._id || cand.id))}
      style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px', borderRadius:10, border:`1.5px solid ${isSelected?'#1B4FD8':'#E2E8F0'}`, background:isSelected?'rgba(27,79,216,0.06)':'#fff', cursor:'pointer', marginBottom:8, transition:'all 0.15s' }}>
      <div style={{ width:36, height:36, borderRadius:10, background: matchScore ? 'linear-gradient(135deg,#1B4FD8,#3B7FE8)' : '#F1F5F9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color: matchScore?'#fff':'#706E6B', flexShrink:0 }}>
        {(cand.name||'?')[0].toUpperCase()}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ fontWeight:700, fontSize:13, color:'#0A1628' }}>{cand.name||'—'}</div>
          {matchScore && <span style={{ background:'rgba(27,79,216,0.1)', color:'#1B4FD8', fontSize:10, fontWeight:800, padding:'2px 7px', borderRadius:20 }}>{matchScore}% match</span>}
          {isSelected && <span style={{ color:'#1B4FD8', fontSize:16 }}>✓</span>}
        </div>
        <div style={{ color:'#706E6B', fontSize:11, marginTop:1 }}>{cand.title||''}{cand.currentCompany?` · ${cand.currentCompany}`:''}</div>
        <div style={{ color:'#94A3B8', fontSize:11, marginTop:2 }}>{cand.location||''}{cand.noticePeriod?` · ${cand.noticePeriod}`:''}  </div>
        {Array.isArray(cand.skills) && cand.skills.length>0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginTop:4 }}>
            {cand.skills.slice(0,4).map(s=><span key={s} style={{ background:'rgba(27,79,216,0.07)', color:'#1B4FD8', fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:20 }}>{s}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Full-page detail view (replaces the drawer) ──────────────────────────────
function DetailPage({ request, onClose, onSaved }) {
  const [suggested,    setSuggested]    = useState([]);
  const [searched,     setSearched]     = useState([]);
  const [loading,      setLoading]      = useState({ suggested:false, search:false, save:false });
  const [selected,     setSelected]     = useState(new Set((request.submittedCandidates||[]).map(c=>String(c._id||c))));
  const [attachNote,   setAttachNote]   = useState('');
  const [newStatus,    setNewStatus]    = useState(request.status);
  const [toast,        setToast]        = useState('');

  useEffect(() => {
    setLoading(l=>({...l,suggested:true}));
    api.getSuggestedCandidatesForRequest(request._id||request.id)
      .then(r=>setSuggested(Array.isArray(r?.data)?r.data:[]))
      .catch(()=>setSuggested([]))
      .finally(()=>setLoading(l=>({...l,suggested:false})));
  }, [request._id||request.id]);

  const handleSearch = async (qs) => {
    setLoading(l=>({...l,search:true}));
    try {
      const r = await api.searchCandidatesAdvanced(qs);
      setSearched(Array.isArray(r?.data)?r.data:[]);
    } catch { setSearched([]); }
    setLoading(l=>({...l,search:false}));
  };

  const toggleCandidate = (id) => setSelected(prev=>{
    const next=new Set(prev);
    next.has(id)?next.delete(id):next.add(id);
    return next;
  });

  const handleAttach = async () => {
    if (selected.size===0) return;
    setLoading(l=>({...l,save:true}));
    try {
      await api.attachCandidatesToRequest(request._id||request.id, { candidateIds:[...selected], note:attachNote });
      if (newStatus!==request.status) await api.updateCandidateRequest(request._id||request.id,{status:newStatus});
      setToast('✅ Candidates attached and request updated!');
      onSaved();
    } catch(e){setToast(`❌ ${e.message}`);}
    setLoading(l=>({...l,save:false}));
  };

  return (
    <div style={{ fontFamily:ff, animation:'tn-fadein 0.2s ease both' }}>
      <Toast msg={toast} onClose={()=>setToast('')} />

      {/* Back button + header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <button onClick={onClose} style={{ ...btnG, display:'flex', alignItems:'center', gap:6, padding:'8px 16px' }}>
          ← Back to Requests
        </button>
        <div>
          <div style={{ fontSize:10, fontWeight:800, color:'#0176D3', letterSpacing:1.5, textTransform:'uppercase' }}>Candidate Request</div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:900, color:'#0A1628' }}>{request.roleTitle}</h2>
          <div style={{ fontSize:12, color:'#706E6B', marginTop:2 }}>{request.tenantId?.name||'Org'} · {new Date(request.createdAt).toLocaleDateString('en-IN')}</div>
        </div>
      </div>

      {/* Requirements card */}
      <div style={{ ...card, marginBottom:20, padding:'16px 20px' }}>
        <div style={{ fontWeight:700, fontSize:12, color:'#475569', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>Requirements</div>
        <div style={{ fontSize:14, color:'#374151', lineHeight:1.7 }}>{request.requirements||'No specific requirements noted.'}</div>
      </div>

      {/* Status + note section */}
      <div style={{ ...card, marginBottom:20, padding:'16px 20px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Update Status</label>
            <select value={newStatus} onChange={e=>setNewStatus(e.target.value)} style={{ ...inp, width:'100%' }}>
              {['pending','in_progress','fulfilled','cancelled'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Attach Note (optional)</label>
            <input value={attachNote} onChange={e=>setAttachNote(e.target.value)} placeholder="Note for the org admin…" style={{ ...inp, width:'100%', boxSizing:'border-box' }} />
          </div>
        </div>

        {selected.size>0 && (
          <div style={{ background:'rgba(27,79,216,0.08)', border:'1px solid rgba(27,79,216,0.2)', borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'#1B4FD8' }}>{selected.size} candidate{selected.size!==1?'s':''} selected</span>
            <button onClick={handleAttach} disabled={loading.save} style={{ ...btnP, padding:'8px 18px', fontSize:12 }}>
              {loading.save?'Attaching…':'Attach & Notify Admin'}
            </button>
          </div>
        )}
      </div>

      {/* Candidates section */}
      <div style={{ ...card, padding:'20px' }}>
          {/* Suggested candidates */}
          <div style={{ fontWeight:800, fontSize:14, color:'#0A1628', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
            <span>⭐ Suggested Matches</span>
            {loading.suggested && <Spinner size={14} />}
          </div>
          {!loading.suggested && suggested.length===0 && (
            <div style={{ color:'#94A3B8', fontSize:12, marginBottom:16, padding:'12px 14px', background:'#F8FAFC', borderRadius:8 }}>
              No suggested candidates found based on the role requirements. Use the search below.
            </div>
          )}
          {suggested.map(c=>(
            <CandCard key={c.id||c._id} cand={c} selected={selected} onToggle={toggleCandidate} matchScore={c.matchScore} />
          ))}

          {/* Advanced search */}
          <div style={{ marginTop:24, borderTop:'1px solid #F1F5F9', paddingTop:20 }}>
            <SearchPanel onSearch={handleSearch} loading={loading.search} />
            {loading.search && <div style={{ textAlign:'center', padding:20 }}><Spinner size={28} /></div>}
            {!loading.search && searched.length>0 && (
              <div>
                <div style={{ fontWeight:700, fontSize:13, color:'#374151', marginBottom:10 }}>Search Results ({searched.length})</div>
                {searched.map(c=>(
                  <CandCard key={c.id||c._id} cand={c} selected={selected} onToggle={toggleCandidate} />
                ))}
              </div>
            )}
          </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function SuperAdminCandidateRequests() {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [toast,    setToast]    = useState('');
  const [filter,   setFilter]   = useState('');
  const [detail,   setDetail]   = useState(null);

  const load = useCallback(() => {
    setLoading(true); setError('');
    const qs = filter ? `status=${filter}` : '';
    api.getCandidateRequests(qs)
      .then(r => setRequests(Array.isArray(r)?r:(r?.data||[])))
      .catch(e => setError(e.message))
      .finally(()=>setLoading(false));
  }, [filter]);

  useEffect(()=>{load();},[load]);

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';

  // When a request is open, show the full-page detail view instead of the list
  if (detail) {
    return <DetailPage request={detail} onClose={()=>setDetail(null)} onSaved={()=>{setDetail(null);load();setToast('✅ Updated!');}} />;
  }

  return (
    <div style={{ fontFamily:ff }}>
      <Toast msg={toast} onClose={()=>setToast('')} />

      <PageHeader title="🙋 Candidate Requests" subtitle="Staffing requests from all organisations" />

      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <select value={filter} onChange={e=>setFilter(e.target.value)} style={{ ...inp, width:180 }}>
          <option value="">All Statuses</option>
          {['pending','in_progress','fulfilled','cancelled'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <button onClick={load} style={btnG}>↻ Refresh</button>
      </div>

      {error && (
        <div style={{ ...card, background:'rgba(186,5,23,0.06)', border:'1px solid rgba(186,5,23,0.2)', color:'#BA0517', marginBottom:16 }}>
          ❌ {error} <button onClick={load} style={{ ...btnG, marginLeft:12 }}>Retry</button>
        </div>
      )}

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner size={32} /></div>
      ) : requests.length===0 ? (
        <div style={{ ...card, textAlign:'center', padding:'60px 40px' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
          <div style={{ fontWeight:700, marginBottom:6 }}>No requests found</div>
          <div style={{ fontSize:12, color:'#706E6B' }}>Candidate requests from organisations will appear here</div>
        </div>
      ) : (
        <div style={{ ...card, padding:0, overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:600 }}>
              <thead>
                <tr style={{ background:'#F8FAFC' }}>
                  {['Organisation','Role','Urgency','Status','Submitted','Actions'].map(h=>(
                    <th key={h} style={{ padding:'11px 14px', textAlign:'left', fontSize:11, fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:0.5, borderBottom:'2px solid #E2E8F0', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map(r=>{
                  const sc = STATUS_COLORS[r.status] || STATUS_COLORS.pending;
                  return (
                    <tr key={r._id||r.id} style={{ borderBottom:'1px solid #F1F5F9' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#FAFAFA'}
                      onMouseLeave={e=>e.currentTarget.style.background=''}>
                      <td style={{ padding:'13px 14px' }}>
                        <div style={{ fontWeight:700, fontSize:13 }}>{r.tenantId?.name||'—'}</div>
                        <div style={{ fontSize:11, color:'#94A3B8' }}>{r.requestedBy?.name||''}</div>
                      </td>
                      <td style={{ padding:'13px 14px' }}>
                        <div style={{ fontWeight:600, fontSize:13, color:'#0A1628' }}>{r.roleTitle||'—'}</div>
                        {r.submittedCandidates?.length>0 && (
                          <div style={{ fontSize:11, color:'#059669', marginTop:2 }}>✓ {r.submittedCandidates.length} candidate{r.submittedCandidates.length!==1?'s':''} attached</div>
                        )}
                      </td>
                      <td style={{ padding:'13px 14px' }}>
                        <span style={{ fontSize:11, fontWeight:700, color:URGENCY_COLORS[r.urgency]||'#706E6B', background:`${URGENCY_COLORS[r.urgency]||'#706E6B'}18`, padding:'3px 10px', borderRadius:20 }}>
                          {r.urgency||'—'}
                        </span>
                      </td>
                      <td style={{ padding:'13px 14px' }}>
                        <span style={{ fontSize:11, fontWeight:700, color:sc.text, background:sc.bg, padding:'3px 10px', borderRadius:20 }}>{sc.label}</span>
                      </td>
                      <td style={{ padding:'13px 14px', color:'#64748B', fontSize:12, whiteSpace:'nowrap' }}>{fmtDate(r.createdAt)}</td>
                      <td style={{ padding:'13px 14px' }}>
                        <button onClick={()=>setDetail(r)} style={{ ...btnP, padding:'7px 14px', fontSize:12 }}>Open →</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
