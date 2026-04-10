import React, { useState, useEffect } from 'react';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { btnP, btnG, card } from '../../constants/styles.js';
import Field from '../../components/ui/Field.jsx';
import { api } from '../../api/api.js';
import { matchJobsToCandidate } from '../../api/matching.js';

export default function CandidateAIMatch({ user }) {
  const [jobs, setJobs] = useState([]);
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoad] = useState(false);
  const [toast, setToast] = useState("");
  const [expanded, setExpanded] = useState(null);   // jobId of expanded card
  const [applied, setApplied] = useState(new Set()); // track applied jobs
  const [assessments, setAssessments] = useState({}); // jobId → assessment (null = none, obj = found)

  useEffect(() => {
    api.getPublicJobs().then(r => setJobs(Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : [])));
    // load already-applied jobs for this candidate
    api.getApplications({ candidateId: user.id }).then(res => {
      const apps = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setApplied(new Set(apps.map(a => a.jobId?.id || a.jobId?._id?.toString?.() || (typeof a.jobId === 'string' ? a.jobId : '')).filter(Boolean)));
    });
  }, [user.id]);

  const run = async () => {
    setLoad(true); setResults([]);
    try {
      const profileRes = await api.getUser(user.id);
      const profile = profileRes.data || profileRes;
      setResults(matchJobsToCandidate(profile, jobs, query));
    } catch (e) { setToast(`❌ Matching failed: ${e.message}`); }
    setLoad(false);
  };

  const apply = async (jobId) => {
    if (!jobId) return;
    try {
      await api.applyToJob(jobId, user.id);
      setApplied(prev => new Set([...prev, String(jobId)]));
      setToast("✅ Applied successfully!");
    } catch (e) { setToast(`❌ ${e.message}`); }
  };

  const toggleExpand = (jobId) => {
    setExpanded(prev => prev === jobId ? null : jobId);
    if (assessments[jobId] === undefined) {
      api.getAssessmentForJob(jobId)
        .then(r => setAssessments(prev => ({ ...prev, [jobId]: r?.data || r || null })))
        .catch(() => setAssessments(prev => ({ ...prev, [jobId]: null })));
    }
  };

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast("")} />
      <PageHeader title="AI Job Search" subtitle="Your resume powers the search" />

      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <Field
            value={query}
            onChange={v => setQuery(v)}
            placeholder="Keyword e.g. React, Python, Hyderabad (optional)"
            style={{ flex: 1 }}
          />
          <button onClick={run} disabled={loading} style={{ ...btnP, opacity: loading ? 0.6 : 1 }}>
            {loading ? <><Spinner /> Matching…</> : "🤖 Find Jobs"}
          </button>
        </div>
        {jobs.length > 0 && <p style={{ color: '#64748b', fontSize: 11, marginTop: 8, marginBottom: 0 }}>
          Searching across {jobs.length} open positions · Click any job to view full details before applying
        </p>}
      </div>

      {results.length === 0 && !loading && (
        <div style={{ ...card, textAlign: 'center', padding: '40px 20px', color: '#706E6B' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#3E3E3C', marginBottom: 6 }}>Find your best-fit jobs</p>
          <p style={{ fontSize: 13 }}>Click "Find Jobs" to match your profile against all open positions. Add a keyword to narrow results.</p>
        </div>
      )}

      {results.map((r, i) => {
        const isOpen = expanded === r.jobId;
        const isApplied = applied.has(String(r.jobId));
        const j = r.job;
        if (!j) return null;

        return (
          <div key={r.jobId} style={{ ...card, marginBottom: 12, border: `1px solid ${r.matchScore >= 80 ? 'rgba(34,197,94,0.3)' : 'rgba(1,118,211,0.25)'}` }}>

            {/* ── Header row ── */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => toggleExpand(r.jobId)}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ color: "#706E6B", fontSize: 11, fontWeight: 700 }}>#{i + 1}</span>
                  <span style={{ color: "#181818", fontWeight: 600, fontSize: 15 }}>{j.title}</span>
                  <Badge label={`${r.matchScore}% match`} color={r.matchScore >= 80 ? "#2E844A" : r.matchScore >= 60 ? "#A07E00" : "#BA0517"} />
                  {j.urgency === 'High' && <Badge label="⚡ Urgent" color="#BA0517" />}
                  {isApplied && <Badge label="✓ Applied" color="#014486" />}
                </div>
                <div style={{ color: "#0176D3", fontSize: 12, marginTop: 3 }}>
                  {j.companyName || j.company} · {j.location}{j.experience ? ` · ${j.experience}` : ''}
                </div>
                <p style={{ color: "#706E6B", fontSize: 12, marginTop: 6, marginBottom: 0 }}>{r.reasoning}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                <button
                  onClick={() => toggleExpand(r.jobId)}
                  style={{ ...btnG, padding: "6px 14px", fontSize: 12 }}
                >
                  {isOpen ? '▲ Hide' : '▼ View Details'}
                </button>
                {isApplied ? (
                  <button disabled style={{ ...btnP, padding: "6px 14px", fontSize: 12, opacity: 0.5, cursor: 'not-allowed' }}>
                    ✓ Applied
                  </button>
                ) : (
                  <button onClick={() => apply(r.jobId)} style={{ ...btnP, padding: "6px 14px", fontSize: 12 }}>
                    Apply Now
                  </button>
                )}
              </div>
            </div>

            {/* ── Skill match badges ── */}
            {(r.highlights || []).length > 0 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
                {r.highlights.map((h, k) => <Badge key={k} label={`✓ ${h}`} color="#014486" />)}
              </div>
            )}

            {/* ── Expanded job details ── */}
            {isOpen && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #FAFAF9' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  {[
                    ['🏢 Company', j.companyName || j.company],
                    ['📍 Location', j.location || '—'],
                    ['🧑‍💼 Experience', j.experience || '—'],
                    ['⚡ Urgency', j.urgency || '—'],
                  ].map(([label, val]) => (
                    <div key={label} style={{ background: '#FAFAFA', borderRadius: 10, padding: '10px 14px' }}>
                      <div style={{ color: '#0176D3', fontSize: 10, marginBottom: 3 }}>{label}</div>
                      <div style={{ color: '#181818', fontSize: 13, fontWeight: 500 }}>{val}</div>
                    </div>
                  ))}
                </div>

                {j.skills && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ color: '#0176D3', fontSize: 11, marginBottom: 8, fontWeight: 600 }}>REQUIRED SKILLS</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(Array.isArray(j.skills) ? j.skills : (j.skills || '').split(',').map(s => s.trim()).filter(Boolean)).map(s => <Badge key={s} label={s.trim()} color="#0176D3" />)}
                    </div>
                  </div>
                )}

                {j.description && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ color: '#0176D3', fontSize: 11, marginBottom: 6, fontWeight: 600 }}>JOB DESCRIPTION</div>
                    <p style={{ color: '#706E6B', fontSize: 13, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{j.description}</p>
                  </div>
                )}

                {assessments[r.jobId] && (
                  <div style={{ background: 'rgba(1,118,211,0.06)', border: '1px solid rgba(1,118,211,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
                    <div style={{ color: '#0176D3', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>📝 ASSESSMENT REQUIRED</div>
                    <p style={{ color: '#3E3E3C', fontSize: 13, margin: '0 0 10px' }}>{assessments[r.jobId].title || 'Skills Assessment'} · {assessments[r.jobId].questions?.length || '?'} questions</p>
                    <button
                      onClick={() => { window.dispatchEvent(new CustomEvent('take-assessment', { detail: { assessmentId: assessments[r.jobId].id || assessments[r.jobId]._id, jobId: r.jobId } })); setToast('Opening assessment...'); }}
                      style={{ ...btnP, padding: '7px 18px', fontSize: 12, background: '#0176D3' }}
                    >
                      📝 Take Assessment
                    </button>
                  </div>
                )}
                <div style={{ paddingTop: 14, borderTop: '1px solid #F3F2F2', display: 'flex', gap: 10 }}>
                  {isApplied ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#2E844A', fontSize: 13, fontWeight: 600 }}>✓ You've already applied for this position</span>
                      <span style={{ color: '#706E6B', fontSize: 12 }}>— check My Applications for status</span>
                    </div>
                  ) : (
                    <button onClick={() => apply(r.jobId)} style={{ ...btnP, padding: '9px 24px' }}>
                      Apply for {j.title}
                    </button>
                  )}
                  <button onClick={() => toggleExpand(r.jobId)} style={{ ...btnG, padding: '9px 16px' }}>
                    ▲ Collapse
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}