import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Toast from '../../components/ui/Toast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import UserDetailDrawer from '../../components/shared/UserDetailDrawer.jsx';
import ResumeCard from '../../components/shared/ResumeCard.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { btnP, btnG, card, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';
import { matchCandidatesToJob, enrichWithPlatformSignals } from '../../api/matching.js';
import PresenceBadge from '../../components/shared/PresenceBadge.jsx';

export default function RecruiterTalentMatch({ user }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [selJob, setSelJob] = useState("");
  const [selJobTitle, setSelJobTitle] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const [showJobList, setShowJobList] = useState(false);
  const [candSearch, setCandSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoad] = useState(false);
  const [toast, setToast] = useState("");
  const [actionLoading, setActionLoading] = useState({});
  const [jobsLoading, setJobsLoad] = useState(true);
  const [profileCandidate, setProfileCandidate] = useState(null);
  const [resumeCandidate, setResumeCandidate] = useState(null);
  const jobPickerRef = useRef(null);

  useEffect(() => {
    if (!showJobList) return;
    const h = e => { if (jobPickerRef.current && !jobPickerRef.current.contains(e.target)) setShowJobList(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showJobList]);

  useEffect(() => {
    const jobParam = searchParams.get('job');
    api.getJobs({ recruiterId: user.id, limit: 200 })
      .then(j => {
        const list = Array.isArray(j) ? j : (j?.data || []);
        setJobs(list);
        if (jobParam) {
          const found = list.find(jj => String(jj.id || jj._id) === jobParam);
          if (found) {
            setSelJob(jobParam);
            setSelJobTitle(`${found.title} @ ${found.companyName || found.company || ''}`);
            setJobSearch(`${found.title} @ ${found.companyName || found.company || ''}`);
          }
        }
      })
      .catch(() => { })
      .finally(() => setJobsLoad(false));
  }, [user.id, searchParams]);

  const run = async (jobId = selJob) => {
    if (!jobId) { setResults([]); return; }
    setLoad(true);
    try {
      const [jobRes, candsRes] = await Promise.all([
        api.getJob(jobId),
        api.getUsers("candidate")
      ]);
      const job = jobRes?.data || jobRes;
      const rawCands = Array.isArray(candsRes) ? candsRes : (candsRes?.data || []);
      if (!rawCands.length) {
        setToast("No candidates found in the system.");
        setLoad(false);
        return;
      }
      // Tier B: enrich candidates with platform behavioral signals before scoring
      const { req: apiReq } = await import('../../api/client.js');
      const enriched = await enrichWithPlatformSignals(rawCands, apiReq);
      setResults(matchCandidatesToJob(job, enriched));
    } catch (e) {
      setToast(`Matching failed: ${e.message}`);
    }
    setLoad(false);
  };

  useEffect(() => {
    if (selJob) run(selJob);
  }, [selJob]);

  const performAction = async (candidateId, action) => {
    setActionLoading(prev => ({ ...prev, [candidateId + action]: true }));
    try {
      await api.talentMatchAction(candidateId, selJob, action);
      
      const successMsg = action === 'shortlist' ? "⭐ Shortlisted successfully!" : 
                        action === 'park' ? "📌 Candidate parked for later." : 
                        "🎯 Reach-out sent successfully!";
      
      setToast(successMsg);
      
      setResults(prev => prev.map(r => {
        if (r.candidate?.id === candidateId || r.candidate?._id === candidateId) {
          if (action === 'shortlist') return { ...r, _shortlisted: true, _parked: false };
          if (action === 'park') return { ...r, _parked: true, _shortlisted: false };
          if (action === 'interest') return { ...r, _reachedOut: true };
        }
        return r;
      }));
    } catch (e) {
      setToast(`Action failed: ${e.message}`);
    }
    setActionLoading(prev => ({ ...prev, [candidateId + action]: false }));
  };

  const rc = { "Exceptional Match": "#2E844A", "Strong Match": "#0176D3", "Good Match": "#A07E00", "Possible Match": "#706E6B" };

  const filteredJobs = jobs.filter(j => {
    const q = jobSearch.toLowerCase();
    return !q || j.title?.toLowerCase().includes(q) || (j.companyName || j.company || '').toLowerCase().includes(q) || j.location?.toLowerCase().includes(q);
  });

  const filteredResults = candSearch
    ? results.filter(r =>
        r.candidate?.name?.toLowerCase().includes(candSearch.toLowerCase()) ||
        r.candidate?.email?.toLowerCase().includes(candSearch.toLowerCase()) ||
        r.candidate?.title?.toLowerCase().includes(candSearch.toLowerCase())
      )
    : results;

  const selectJob = (j) => {
    const jid = String(j.id || j._id);
    const label = `${j.title} @ ${j.companyName || j.company || ''}`;
    setSelJob(jid);
    setSelJobTitle(label);
    setJobSearch(label);
    setShowJobList(false);
    run(jid);
  };

  return (
    <div style={{ paddingBottom: 60, animation: 'tn-fadein 0.3s ease both' }}>
      <Toast msg={toast} onClose={() => setToast("")} />
      {profileCandidate && (
        <UserDetailDrawer
          user={profileCandidate}
          onClose={() => setProfileCandidate(null)}
          onUpdated={() => setProfileCandidate(null)}
        />
      )}

      {/* ── Inline Resume Modal ── */}
      {resumeCandidate && (
        <div style={{ position:'fixed', inset:0, background:'rgba(5,13,26,0.78)', backdropFilter:'blur(8px)', zIndex:10001, display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'20px 16px' }}>
          <div style={{ width:'100%', maxWidth:900, margin:'auto 0', borderRadius:20, overflow:'hidden', boxShadow:'0 32px 64px rgba(0,0,0,0.35)' }}>
            <div style={{ background:'#032D60', padding:'12px 20px', display:'flex', alignItems:'center', gap:12 }}>
              <button onClick={() => setResumeCandidate(null)} style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontSize:13, fontWeight:600 }}>✕ Close</button>
              <div style={{ flex:1, color:'#fff', fontWeight:700, fontSize:15, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>📋 Resume — {resumeCandidate.name || resumeCandidate.email?.split('@')[0] || '—'}</div>
              <button onClick={() => window.print()} style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.25)', color:'#fff', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontSize:13, fontWeight:600 }}>🖨️ Print / Save PDF</button>
            </div>
            <div style={{ background:'#F3F2F2', padding:'24px 16px 40px' }}><ResumeCard candidate={resumeCandidate} /></div>
          </div>
        </div>
      )}

      <PageHeader title="Job Match" subtitle="Pick a job below and instantly rank the best-fit candidates." />

      {/* ── Search / filter bar ── */}
      <div style={{ ...card, marginBottom: 16, padding: '16px 20px', background: 'linear-gradient(135deg,#fff,#f8fbff)', border: '1px solid #e0e8f5' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            <input
              type="text"
              value={jobSearch}
              onChange={e => { setJobSearch(e.target.value); setSelJob(''); setSelJobTitle(''); setResults([]); setCandSearch(''); }}
              placeholder={jobsLoading ? 'Loading jobs…' : `Search ${jobs.length} jobs by title, company or location…`}
              disabled={jobsLoading}
              style={{ ...inp, height: 44, borderRadius: 10, border: `2px solid ${selJob ? '#0176D3' : '#e0e8f5'}`, fontSize: 14, paddingRight: 36, width: '100%', boxSizing: 'border-box' }}
            />
            {jobSearch && (
              <button onClick={() => { setJobSearch(''); setSelJob(''); setSelJobTitle(''); setResults([]); setCandSearch(''); }}
                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:16, color:'#94a3b8' }}>✕</button>
            )}
          </div>
          {selJob && (
            <button onClick={() => run()} disabled={loading}
              style={{ ...btnP, height:44, padding:'0 20px', borderRadius:10, display:'flex', alignItems:'center', gap:6, opacity:loading ? 0.6 : 1 }}>
              {loading ? <><Spinner /> Matching…</> : <>🔄 Re-run</>}
            </button>
          )}
        </div>
        {selJob && (
          <div style={{ marginTop: 10, padding:'8px 12px', background:'rgba(1,118,211,0.06)', borderRadius:8, fontSize:13, color:'#0176D3', fontWeight:600 }}>
            ✅ Selected: {selJobTitle}
          </div>
        )}
      </div>

      {/* ── Job cards grid ── */}
      {!selJob && (
        <div style={{ marginBottom: 24 }}>
          {jobsLoading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:48 }}><Spinner size={36} color="#0176D3" /></div>
          ) : filteredJobs.length === 0 ? (
            <div style={{ ...card, textAlign:'center', padding:'48px 24px', color:'#94a3b8', fontSize:14 }}>
              {jobSearch ? `No jobs match "${jobSearch}"` : 'No job postings available yet.'}
            </div>
          ) : (
            <>
              <div style={{ fontSize:12, color:'#64748b', fontWeight:600, marginBottom:10 }}>
                {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} — click any card to run candidate match
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
                {filteredJobs.slice(0, 60).map(j => {
                  const jid = String(j.id || j._id);
                  const isOpen = j.status === 'active' || j.status === 'open';
                  return (
                    <button key={jid} onClick={() => selectJob(j)}
                      style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:14, padding:'16px 18px', textAlign:'left', cursor:'pointer', transition:'all 0.18s', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='#0176D3'; e.currentTarget.style.boxShadow='0 6px 20px rgba(1,118,211,0.12)'; e.currentTarget.style.transform='translateY(-2px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)'; e.currentTarget.style.transform='none'; }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                        <div style={{ fontWeight:800, fontSize:14, color:'#0F172A', lineHeight:1.3, flex:1, marginRight:8 }}>{j.title}</div>
                        <span style={{ flexShrink:0, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:isOpen ? 'rgba(5,150,105,0.1)' : 'rgba(107,114,128,0.1)', color:isOpen ? '#059669' : '#6B7280' }}>
                          {isOpen ? 'Open' : (j.status || 'Draft')}
                        </span>
                      </div>
                      <div style={{ fontSize:12, color:'#64748b', marginBottom:4 }}>{j.companyName || j.company || '—'}</div>
                      {j.location && <div style={{ fontSize:11, color:'#94a3b8' }}>📍 {j.location}</div>}
                      <div style={{ marginTop:10, fontSize:11, color:'#0176D3', fontWeight:700 }}>Click to match candidates →</div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spinner size={40} color="#0176D3" />
          <p style={{ marginTop: 16, color: '#0176D3', fontWeight: 600, letterSpacing: 0.5 }}>IDENTIFYING THE BEST TALENT...</p>
        </div>
      )}

      {!loading && results.length === 0 && selJob && (
        <div style={{ ...card, textAlign: "center", padding: '80px 40px', borderStyle: 'dashed' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔎</div>
          <h3 style={{ color: "#181818", margin: '0 0 8px 0' }}>Analysis Required</h3>
          <p style={{ color: "#706E6B", fontSize: 14, margin: 0 }}>Click "Run Analysis" to find the best matching candidates from the database.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          {/* Candidate search + results summary row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
              <input
                type="text"
                value={candSearch}
                onChange={e => setCandSearch(e.target.value)}
                placeholder="Filter candidates by name, email or title…"
                style={{ ...inp, height: 42, borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, paddingRight: 34, width: '100%', boxSizing: 'border-box' }}
              />
              {candSearch && (
                <button onClick={() => setCandSearch("")}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#94a3b8' }}>
                  ✕
                </button>
              )}
            </div>
            <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
              {candSearch ? `${filteredResults.length} of ${results.length}` : results.length} candidate{results.length !== 1 ? 's' : ''} matched
            </span>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
          {filteredResults.map((r, i) => (
              <div 
                key={r.candidate?.id || r.candidate?._id || i} 
                style={{ 
                  ...card, 
                  padding: '24px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  border: `1px solid ${rc[r.recommendation] || "#0176D3"}25`,
                  borderLeft: `6px solid ${rc[r.recommendation] || "#0176D3"}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  background: '#fff'
                }}
                onMouseEnter={e => { 
                  e.currentTarget.style.transform = 'translateY(-3px)'; 
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(1,118,211,0.12)'; 
                  e.currentTarget.style.borderColor = `${rc[r.recommendation] || "#0176D3"}60`;
                }}
                onMouseLeave={e => { 
                  e.currentTarget.style.transform = 'none'; 
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)'; 
                  e.currentTarget.style.borderColor = `${rc[r.recommendation] || "#0176D3"}25`;
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: rc[r.recommendation] || "#0176D3", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 900, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>{i + 1}</div>
                      <span style={{ color: "#181818", fontSize: 19, fontWeight: 800, letterSpacing: '-0.3px' }}>{r.candidate.name}</span>
                      <PresenceBadge userId={r.candidate.id || r.candidate?._id} showLabel={false} />
                      {r.candidate.bgvVerified && (
                        <span title="BGV Verified" style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', fontSize: 10, fontWeight: 900, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.6px', boxShadow: '0 2px 6px rgba(16,185,129,0.2)' }}>🏅 VERIFIED</span>
                      )}
                      <Badge label={`${r.matchScore}% Score`} color={r.matchScore >= 80 ? "#2E844A" : "#A07E00"} />
                      <Badge label={r.recommendation} color={rc[r.recommendation] || "#0176D3"} />
                      {r._shortlisted && <Badge label="Shortlisted" color="#2E844A" />}
                      {r._parked && <Badge label="Parked" color="#706E6B" />}
                      {r._reachedOut && <Badge label="Reach Out Sent" color="#0176D3" />}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: "#475569", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>📍 <span style={{ color: '#1E293B' }}>{r.candidate.location || "Remote"}</span></span>
                      <span style={{ opacity: 0.3 }}>|</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>💼 <span style={{ color: '#1E293B' }}>{r.candidate.title || "Professional"}</span></span>
                      <span style={{ opacity: 0.3 }}>|</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>📅 <span style={{ color: '#1E293B' }}>{r.candidate.experience || 0} Yrs</span></span>
                    </div>

                    {/* ── Match Analysis Panel ── */}
                    <div style={{ margin: '0 0 16px 0', borderRadius: 14, border: '1px solid rgba(1,118,211,0.12)', overflow: 'hidden' }}>
                      {/* Header row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'linear-gradient(135deg,rgba(1,118,211,0.08),rgba(1,68,134,0.04))' }}>
                        <span style={{ color: '#0176D3', fontSize: 11, fontWeight: 800, letterSpacing: 0.8 }}>🎯 MATCH ANALYSIS</span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {r.confidenceLevel && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: r.confidenceLevel === 'High' ? 'rgba(5,150,105,0.12)' : r.confidenceLevel === 'Medium' ? 'rgba(245,158,11,0.12)' : 'rgba(100,116,139,0.12)', color: r.confidenceLevel === 'High' ? '#059669' : r.confidenceLevel === 'Medium' ? '#A07E00' : '#64748B' }}>
                              {r.confidenceLevel === 'High' ? '● ' : '◐ '}{r.confidenceLevel} Confidence
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Score bar */}
                      <div style={{ padding: '10px 14px', background: '#fff' }}>
                        <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                          {r.matchVector && Object.entries(r.matchVector).filter(([,v]) => v > 0).map(([k, v]) => {
                            const VCOL = { skills:'#0176D3', experience:'#7c3aed', location:'#F59E0B', title:'#059669', careerLevel:'#e11d48', domain:'#06b6d4', ctcFit:'#10b981', portfolio:'#f97316', synergy:'#8b5cf6', recency:'#94a3b8' };
                            return (
                              <div key={k} title={`${k}: ${v}pts`} style={{ height: 5, borderRadius: 3, flex: v, background: VCOL[k] || '#0176D3', minWidth: 4 }} />
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {(r.matchInsights || []).filter(ins => ins.score > 0).map((ins, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F8FAFF', border: '1px solid rgba(1,118,211,0.1)', borderRadius: 8, padding: '4px 10px' }}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 }}>{ins.vector}</span>
                              <span style={{ fontSize: 10, color: '#64748B' }}>·</span>
                              <span style={{ fontSize: 11, color: '#0F172A' }}>{ins.signal}</span>
                            </div>
                          ))}
                        </div>
                        {/* Missing skills warning */}
                        {r.missingSkills && r.missingSkills.length > 0 && (
                          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'rgba(186,5,23,0.04)', borderRadius: 8, border: '1px solid rgba(186,5,23,0.1)' }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#BA0517' }}>GAPS:</span>
                            {r.missingSkills.map(s => (
                              <span key={s} style={{ fontSize: 10, fontWeight: 700, color: '#BA0517', background: 'rgba(186,5,23,0.08)', padding: '1px 7px', borderRadius: 20 }}>{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Matched skill tags */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(r.highlights || []).map((h, j) => (
                        <span key={j} style={{ background: 'rgba(1,118,211,0.05)', color: '#0176D3', padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: '1px solid rgba(1,118,211,0.12)', transition: 'all 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(1,118,211,0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(1,118,211,0.05)'}>
                          ✦ {h}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 170 }}>
                    <button
                      onClick={() => performAction(r.candidate.id || r.candidate?._id, 'shortlist')}
                      disabled={actionLoading[(r.candidate.id || r.candidate?._id) + 'shortlist'] || r._shortlisted}
                      style={{ 
                        ...btnP, 
                        height: 40, 
                        fontSize: 13, 
                        fontWeight: 800,
                        background: r._shortlisted ? '#2E844A' : 'linear-gradient(135deg,#0176D3,#032D60)',
                        boxShadow: r._shortlisted ? 'none' : '0 4px 12px rgba(1,118,211,0.25)',
                        opacity: (actionLoading[(r.candidate.id || r.candidate?._id) + 'shortlist']) ? 0.7 : 1 
                      }}
                    >
                      {actionLoading[(r.candidate.id || r.candidate?._id) + 'shortlist'] ? <Spinner size={16} /> : (r._shortlisted ? "✓ Shortlisted" : "⭐ Shortlist")}
                    </button>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => performAction(r.candidate.id || r.candidate?._id, 'park')}
                        disabled={actionLoading[(r.candidate.id || r.candidate?._id) + 'park'] || r._parked}
                        style={{ flex: 1, height: 40, background: r._parked ? '#F3F4F6' : '#fff', border: `1.5px solid ${r._parked ? '#D1D5DB' : '#E2E8F0'}`, color: '#374151', fontSize: 12, borderRadius: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { if(!r._parked) e.currentTarget.style.borderColor = '#0176D3'; }}
                        onMouseLeave={e => { if(!r._parked) e.currentTarget.style.borderColor = '#E2E8F0'; }}
                      >
                        {actionLoading[(r.candidate.id || r.candidate?._id) + 'park'] ? <Spinner size={14} /> : (r._parked ? "📌 Parked" : "Park")}
                      </button>
                      <button
                        onClick={() => performAction(r.candidate.id || r.candidate?._id, 'interest')}
                        disabled={actionLoading[(r.candidate.id || r.candidate?._id) + 'interest'] || r._reachedOut}
                        style={{ flex: 1, height: 40, background: r._reachedOut ? '#F0F9FF' : '#fff', border: `1.5px solid ${r._reachedOut ? '#0176D3' : '#E2E8F0'}`, color: '#0176D3', fontSize: 12, borderRadius: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                      >
                        {actionLoading[(r.candidate.id || r.candidate?._id) + 'interest'] ? <Spinner size={14} /> : (r._reachedOut ? "✓ Sent" : "Reach Out")}
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setResumeCandidate(r.candidate)}
                        style={{ flex: 1, height: 40, background: '#F8FAFF', border: '1px solid rgba(1,118,211,0.15)', color: '#0176D3', fontSize: 11, borderRadius: 10, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#0176D3'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFF'; e.currentTarget.style.borderColor = 'rgba(1,118,211,0.15)'; }}
                      >
                        📄 VIEW RESUME
                      </button>
                      <button
                        onClick={() => setProfileCandidate({ ...r.candidate, role: 'candidate', id: r.candidate.id || r.candidate?._id })}
                        style={{ flex: 1, height: 40, background: '#F8FAFF', border: '1px solid rgba(1,118,211,0.15)', color: '#0176D3', fontSize: 11, borderRadius: 10, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#0176D3'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFF'; e.currentTarget.style.borderColor = 'rgba(1,118,211,0.15)'; }}
                      >
                        👤 PROFILE
                      </button>
                    </div>
                  </div>
                </div>
              </div>
          ))}
          </div>
        </>
      )}
    </div>
  );
}
