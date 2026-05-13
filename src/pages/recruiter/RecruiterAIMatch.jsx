import React, { useState, useEffect } from 'react';
import Toast from '../../components/ui/Toast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { btnP, card, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';
import { matchCandidatesToJob } from '../../api/matching.js';
import PresenceBadge from '../../components/shared/PresenceBadge.jsx';

export default function RecruiterAIMatch({ user }) {
  const [jobs, setJobs] = useState([]);
  const [selJob, setSelJob] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoad] = useState(false);
  const [toast, setToast] = useState("");
  const [actionLoading, setActionLoading] = useState({});
  const [jobsLoading, setJobsLoad] = useState(true);

  useEffect(() => {
    api.getJobs(user.id)
      .then(j => setJobs(Array.isArray(j) ? j : (j?.data || [])))
      .catch(() => { })
      .finally(() => setJobsLoad(false));
  }, [user.id]);

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
      // Re-run matching with the updated engine
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
      // action can be 'shortlist', 'interest' (Reach Out), or 'park'
      await api.talentMatchAction(candidateId, selJob, action);
      
      const successMsg = action === 'shortlist' ? "⭐ Shortlisted successfully!" : 
                        action === 'park' ? "📌 Candidate parked for later." : 
                        "🎯 Reach-out sent successfully!";
      
      setToast(successMsg);
      
      // Update local state to show status
      setResults(prev => prev.map(r => {
        if (r.candidate?.id === candidateId) {
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
    <div style={{ paddingBottom: 60 }}>
      <Toast msg={toast} onClose={() => setToast("")} />
      <PageHeader 
        title="AI-Powered Talent Matching" 
        subtitle="Our high-precision matching engine finds the best candidates based on skills, experience, and role alignment."
      />

      <div style={{ ...card, marginBottom: 24, padding: '24px', background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)', border: '1px solid #e0e8f5' }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <label style={{ color: "#0176D3", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8 }}>TARGET JOB POSTING</label>
            <select 
              value={selJob} 
              onChange={e => { setSelJob(e.target.value); }} 
              style={{ ...inp, height: 48, borderRadius: 12, border: '2px solid #e0e8f5', fontSize: 14 }}
            >
              <option value="">— Choose a job to run analysis —</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title} @ {j.company || 'Internal'}</option>)}
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
            {loading ? <><Spinner /> ANALYZING...</> : <><span style={{fontSize:18}}>🔄</span> Run Match Analysis</>}
          </button>
        </div>
        
        {!jobsLoading && jobs.length === 0 && (
          <div style={{ marginTop: 16, padding: "16px", background: "#fdf4f4", borderRadius: 12, border: "1px solid #facaca" }}>
            <p style={{ color: "#c23934", fontSize: 13, margin: 0 }}>
              <b>No active jobs found.</b> Please post a job first to enable AI matching.
            </p>
          </div>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spinner size={40} color="#0176D3" />
          <p style={{ marginTop: 16, color: '#0176D3', fontWeight: 600, letterSpacing: 0.5 }}>IDENTIFYING TOP TALENT...</p>
        </div>
      )}

      {!loading && results.length === 0 && selJob && (
        <div style={{ ...card, textAlign: "center", padding: '80px 40px', borderStyle: 'dashed' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
          <h3 style={{ color: "#181818", margin: '0 0 8px 0' }}>Ready to Match</h3>
          <p style={{ color: "#706E6B", fontSize: 14, margin: 0 }}>Click "Run Match Analysis" to find candidates that best fit this role.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div style={{ display: 'grid', gap: 16 }}>
          {results.map((r, i) => (
            <div 
              key={r.candidate?.id ?? i} 
              style={{ 
                ...card, 
                padding: '24px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s',
                border: `1px solid ${rc[r.recommendation] || "#0176D3"}33`,
                borderLeft: `6px solid ${rc[r.recommendation] || "#0176D3"}`
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: rc[r.recommendation] || "#0176D3", display: "flex", alignItems: "center", justify: "center", color: "#fff", fontSize: 12, fontWeight: 800 }}>{i + 1}</div>
                    <span style={{ color: "#181818", fontSize: 18, fontWeight: 700 }}>{r.candidate.name}</span>
                    <PresenceBadge userId={r.candidate.id} showLabel={false} />
                    <Badge label={`${r.matchScore}% Score`} color={r.matchScore >= 80 ? "#2E844A" : "#A07E00"} />
                    <Badge label={r.recommendation} color={rc[r.recommendation] || "#0176D3"} />
                    {r._shortlisted && <Badge label="Shortlisted" color="#2E844A" />}
                    {r._parked && <Badge label="Parked" color="#706E6B" />}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: "#0176D3", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                    <span>📍 {r.candidate.location || "Remote"}</span>
                    <span>•</span>
                    <span>💼 {r.candidate.title || "Professional"}</span>
                    <span>•</span>
                    <span>🎓 {r.candidate.experience || 0} Years Exp</span>
                  </div>

                  <p style={{ color: "#444", fontSize: 14, lineHeight: 1.5, margin: '0 0 16px 0', padding: '12px', background: '#f8fbff', borderRadius: 8, border: '1px solid #eef4ff' }}>
                    <span style={{color:'#0176D3', fontWeight:700}}>Why this match: </span>{r.reasoning}
                  </p>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(r.highlights || []).map((h, j) => (
                      <span key={j} style={{ background: '#eef4ff', color: '#014486', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: '1px solid #d0e0ff' }}>
                        ✓ {h}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 160 }}>
                  <button
                    onClick={() => performAction(r.candidate.id, 'shortlist')}
                    disabled={actionLoading[r.candidate.id + 'shortlist'] || r._shortlisted}
                    style={{ ...btnP, height: 36, fontSize: 12, opacity: (r._shortlisted) ? 0.6 : 1 }}
                  >
                    {actionLoading[r.candidate.id + 'shortlist'] ? <Spinner size={16} /> : (r._shortlisted ? "✅ Shortlisted" : "⭐ Shortlist")}
                  </button>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => performAction(r.candidate.id, 'park')}
                      disabled={actionLoading[r.candidate.id + 'park'] || r._parked}
                      style={{ flex: 1, height: 36, background: '#fff', border: '1px solid #d0d5dd', color: '#344054', fontSize: 12, borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                    >
                      {actionLoading[r.candidate.id + 'park'] ? <Spinner size={14} /> : (r._parked ? "📌 Parked" : "Park")}
                    </button>
                    <button
                      onClick={() => performAction(r.candidate.id, 'interest')}
                      disabled={actionLoading[r.candidate.id + 'interest'] || r._reachedOut}
                      style={{ flex: 1, height: 36, background: '#fff', border: '1px solid #d0d5dd', color: '#0176D3', fontSize: 12, borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                    >
                      {actionLoading[r.candidate.id + 'interest'] ? <Spinner size={14} /> : "Reach Out"}
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => r.candidate.resumeUrl ? window.open(r.candidate.resumeUrl, '_blank') : setToast("No resume uploaded")}
                      style={{ flex: 1, height: 36, background: '#f0f7ff', border: '1px solid #c0d8f0', color: '#014486', fontSize: 11, borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
                    >
                      📄 Resume
                    </button>
                    <button
                      onClick={() => window.open(`/app/candidate/${r.candidate.id || r.candidate._id}`, '_blank')}
                      style={{ flex: 1, height: 36, background: '#f0f7ff', border: '1px solid #c0d8f0', color: '#014486', fontSize: 11, borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
                    >
                      👤 Profile
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
