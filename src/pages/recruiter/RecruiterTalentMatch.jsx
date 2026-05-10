import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Toast from '../../components/ui/Toast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { btnP, card, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';
import { matchCandidatesToJob } from '../../api/matching.js';
import PresenceBadge from '../../components/shared/PresenceBadge.jsx';

/**
 * RecruiterTalentMatch — Uses deterministic RegEx heuristics to match candidates
 * to specific job requirements based on skills, experience, and location.
 */
export default function RecruiterTalentMatch({ user }) {
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [selJob, setSelJob] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoad] = useState(false);
  const [toast, setToast] = useState("");
  const [shortlisting, setShortlisting] = useState({});
  const [jobsLoading, setJobsLoad] = useState(true);

  useEffect(() => {
    const jobParam = searchParams.get('job');
    api.getJobs(user.id)
      .then(j => {
        const list = Array.isArray(j) ? j : (j?.data || []);
        setJobs(list);
        // Pre-select job when navigated from Pipeline → "Find Matching Candidates"
        if (jobParam && list.some(jj => String(jj.id || jj._id) === jobParam)) {
          setSelJob(jobParam);
        }
      })
      .catch(() => { })
      .finally(() => setJobsLoad(false));
  }, [user.id, searchParams]);

  const run = async (jobId = selJob) => {
    if (!jobId) { setResults([]); return; }
    setLoad(true); setResults([]);
    try {
      const [jobRes, candsRes] = await Promise.all([api.getJob(jobId), api.getUsers("candidate")]);
      const job = jobRes?.data || jobRes;
      const cands = Array.isArray(candsRes) ? candsRes : (candsRes?.data || []);
      if (!cands.length) { setToast("No candidates in the system yet."); setLoad(false); return; }
      
      // The matching engine uses deterministic heuristics (talentMatchScore)
      setResults(matchCandidatesToJob(job, cands));
    } catch (e) { setToast(`Matching failed: ${e.message}`); }
    setLoad(false);
  };

  useEffect(() => {
    if (selJob) run(selJob);
  }, [selJob]);

  const handleAction = async (candidateId, action) => {
    setShortlisting(s => ({ ...s, [`${candidateId}-${action}`]: true }));
    try {
      await api.talentMatchAction(candidateId, selJob, action);
      setToast(action === 'shortlist' ? "✅ Shortlisted successfully! Invitation added to candidate dashboard." : "🎯 Interest shown! Notification sent to candidate.");
      setResults(prev => prev.map(r => r.candidate?.id === candidateId ? { ...r, [`_${action}`]: true, _shortlisted: action === 'shortlist' || r._shortlisted } : r));
    } catch (e) { 
      setToast(`❌ Action failed: ${e.message}`); 
    }
    setShortlisting(s => ({ ...s, [`${candidateId}-${action}`]: false }));
  };

  const rc = { "Strong Match": "#2E844A", "Good Match": "#0176D3", "Possible Match": "#A07E00" };

  return (
    <div style={{ animation: 'tn-fadein 0.3s ease both' }}>
      <Toast msg={toast} onClose={() => setToast("")} />
      <PageHeader 
        title="Talent Match" 
        subtitle="Deterministic heuristics ranking best candidates for any job based on core skills and requirements"
      />
      
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ color: "#0176D3", fontSize: 11, display: "block", marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Select a Job to Analyze</label>
            <select value={selJob} onChange={e => { setSelJob(e.target.value); }} style={inp}>
              <option value="">— Choose a job —</option>
              {jobs.map(j => <option key={j.id || j._id} value={j.id || j._id}>{j.title} @ {j.companyName || j.company}</option>)}
            </select>
          </div>
          <button onClick={() => run()} disabled={!selJob || loading} style={{ ...btnP, opacity: (!selJob || loading) ? 0.6 : 1 }}>
            {loading ? <><Spinner /> Matching...</> : "Run Talent Match"}
          </button>
        </div>
        {!jobsLoading && jobs.length === 0 && (
          <div style={{ marginTop: 14, padding: "12px 14px", background: "rgba(1,118,211,0.06)", borderRadius: 12, border: "1px solid rgba(1,118,211,0.2)" }}>
            <p style={{ color: "#0176D3", fontSize: 12, margin: 0 }}>You have no job postings yet. Go to <b>My Jobs</b> and post a job first.</p>
          </div>
        )}
      </div>

      {!loading && results.length === 0 && selJob && (
        <div style={{ ...card, textAlign: "center", padding: 40 }}>
          <p style={{ color: "#9E9D9B", fontSize: 14, margin: 0 }}>Click "Run Talent Match" to analyze candidate pool</p>
        </div>
      )}

      {results.map((r, i) => (
        <div key={r.candidate?.id ?? i} style={{ ...card, marginBottom: 12, border: `1px solid ${rc[r.recommendation] || "#0176D3"}44` }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyItems: "space-between", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#0176D3", display: "flex", alignItems: "center", justifyCenter: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>{i + 1}</div>
                <span style={{ color: "#181818", fontWeight: 600 }}>{r.candidate.name}</span>
                <PresenceBadge userId={r.candidate.id} showLabel={false} />
                {r.candidate.bgvVerified && (
                  <span title="BGV documents verified by TalentNest HR" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.4px' }}>🏅 VERIFIED</span>
                )}
                <Badge label={`${r.matchScore}%`} color={r.matchScore >= 80 ? "#2E844A" : "#A07E00"} />
                <Badge label={r.recommendation} color={rc[r.recommendation] || "#0176D3"} />
                {r._shortlisted && <Badge label="Shortlisted" color="#2E844A" />}
                {r._interest && <Badge label="Interest Shown" color="#0176D3" />}
              </div>
              <div style={{ color: "#0176D3", fontSize: 12 }}>{r.candidate.title} · {r.candidate.experience || 0}y exp · {r.candidate.location || "—"}</div>
              <p style={{ color: "#706E6B", fontSize: 12, marginTop: 6, lineHeight: '1.5' }}>{r.reasoning}</p>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                {(r.highlights || []).map((h, j) => <Badge key={j} label={"✓ " + h} color="#014486" />)}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => handleAction(r.candidate.id, 'shortlist')}
                disabled={shortlisting[`${r.candidate.id}-shortlist`] || r._shortlisted}
                style={{ ...btnP, padding: '6px 12px', fontSize: 12, opacity: (shortlisting[`${r.candidate.id}-shortlist`] || r._shortlisted) ? 0.5 : 1 }}>
                {shortlisting[`${r.candidate.id}-shortlist`] ? <><Spinner /></> : r._shortlisted ? "Shortlisted" : "Shortlist"}
              </button>
              <button
                onClick={() => handleAction(r.candidate.id, 'interest')}
                disabled={shortlisting[`${r.candidate.id}-interest`] || r._interest || r._shortlisted}
                style={{ ...btnP, background: '#fff', color: '#0176D3', border: '1px solid #0176D3', padding: '6px 12px', fontSize: 12, opacity: (shortlisting[`${r.candidate.id}-interest`] || r._interest || r._shortlisted) ? 0.5 : 1 }}>
                {shortlisting[`${r.candidate.id}-interest`] ? <><Spinner /></> : r._interest ? "Interest Shown" : "Show Interest"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
