import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Toast from '../../components/ui/Toast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import UserDetailDrawer from '../../components/shared/UserDetailDrawer.jsx';
import ResumeCard from '../../components/shared/ResumeCard.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { btnP, btnG, card, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';
import { matchCandidatesToJob } from '../../api/matching.js';
import PresenceBadge from '../../components/shared/PresenceBadge.jsx';

export default function RecruiterTalentMatch({ user }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [selJob, setSelJob] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoad] = useState(false);
  const [toast, setToast] = useState("");
  const [actionLoading, setActionLoading] = useState({});
  const [jobsLoading, setJobsLoad] = useState(true);
  const [profileCandidate, setProfileCandidate] = useState(null);
  const [resumeCandidate, setResumeCandidate] = useState(null); // shown in inline modal

  useEffect(() => {
    const jobParam = searchParams.get('job');
    api.getJobs({ recruiterId: user.id, limit: 200 })
      .then(j => {
        const list = Array.isArray(j) ? j : (j?.data || []);
        setJobs(list);
        if (jobParam && list.some(jj => String(jj.id || jj._id) === jobParam)) {
          setSelJob(jobParam);
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
      const cands = Array.isArray(candsRes) ? candsRes : (candsRes?.data || []);
      if (!cands.length) {
        setToast("No candidates found in the system.");
        setLoad(false);
        return;
      }
      setResults(matchCandidatesToJob(job, cands));
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

      {/* ── Inline Resume Modal — uses data already in memory, no fetch needed ── */}
      {resumeCandidate && (
        <div style={{ position:'fixed', inset:0, background:'rgba(5,13,26,0.78)', backdropFilter:'blur(8px)', zIndex:10001, display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'20px 16px' }}>
          <div style={{ width:'100%', maxWidth:900, margin:'auto 0', borderRadius:20, overflow:'hidden', boxShadow:'0 32px 64px rgba(0,0,0,0.35)' }}>
            {/* Toolbar */}
            <div style={{ background:'#032D60', padding:'12px 20px', display:'flex', alignItems:'center', gap:12 }}>
              <button
                onClick={() => setResumeCandidate(null)}
                style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}
              >
                ✕ Close
              </button>
              <div style={{ flex:1, color:'#fff', fontWeight:700, fontSize:15, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                📋 Resume — {resumeCandidate.name || 'Candidate'}
              </div>
              <button
                onClick={() => window.print()}
                style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.25)', color:'#fff', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontSize:13, fontWeight:600 }}
              >
                🖨️ Print / Save PDF
              </button>
            </div>
            {/* Resume content */}
            <div style={{ background:'#F3F2F2', padding:'24px 16px 40px' }}>
              <ResumeCard candidate={resumeCandidate} />
            </div>
          </div>
        </div>
      )}
      <PageHeader 
        title="AI-Powered Talent Match" 
        subtitle="Rank your best internal and external candidates instantly using high-precision heuristics."
      />

      <div style={{ ...card, marginBottom: 24, padding: '24px', background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)', border: '1px solid #e0e8f5' }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <label style={{ color: "#0176D3", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Target Job Opportunity</label>
            <select 
              value={selJob} 
              onChange={e => { setSelJob(e.target.value); }} 
              style={{ ...inp, height: 48, borderRadius: 12, border: '2px solid #e0e8f5', fontSize: 14 }}
            >
              <option value="">— Select a job posting —</option>
              {jobs.map(j => <option key={j.id || j._id} value={j.id || j._id}>{j.title} @ {j.companyName || j.company}</option>)}
            </select>
          </div>
          <button 
            onClick={() => run()} 
            disabled={!selJob || loading} 
            style={{ 
              ...btnP, 
              height: 48, 
              padding: '0 24px', 
              borderRadius: 12, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              boxShadow: '0 4px 12px rgba(1, 118, 211, 0.2)',
              opacity: (!selJob || loading) ? 0.6 : 1 
            }}
          >
            {loading ? <><Spinner /> Matching...</> : <><span style={{fontSize:18}}>🎯</span> Run AI Analysis</>}
          </button>
        </div>
        
        {!jobsLoading && jobs.length === 0 && (
          <div style={{ marginTop: 16, padding: "16px", background: "#fdf4f4", borderRadius: 12, border: "1px solid #facaca" }}>
            <p style={{ color: "#c23934", fontSize: 13, margin: 0 }}>
              <b>No job postings available.</b> You need an active job post to match candidates.
            </p>
          </div>
        )}
      </div>

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
          <p style={{ color: "#706E6B", fontSize: 14, margin: 0 }}>Click "Run AI Analysis" to start matching candidates from the database.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div style={{ display: 'grid', gap: 16 }}>
          {results.map((r, i) => (
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

                    <div style={{ color: "#475569", fontSize: 14, lineHeight: 1.6, margin: '0 0 18px 0', padding: '16px', background: '#f8fbff', borderRadius: 14, border: '1px solid rgba(1,118,211,0.08)', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: -10, left: 16, background: '#fff', padding: '0 8px', color: '#0176D3', fontSize: 11, fontWeight: 800, borderRadius: 6, border: '1px solid rgba(1,118,211,0.1)' }}>MATCH ANALYSIS</div>
                      {r.reasoning}
                    </div>

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
      )}
    </div>
  );
}
