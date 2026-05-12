import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { btnP, btnG, card } from '../../constants/styles.js';
import { api } from '../../api/api.js';
import { matchJobsToCandidate } from '../../api/matching.js';

/**
 * CandidateJobMatch — Uses deterministic RegEx heuristics to match your 
 * profile against all open positions in real-time.
 */
export default function CandidateJobMatch({ user }) {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoad] = useState(false);
  const [toast, setToast] = useState("");
  const [expanded, setExpanded] = useState(null);   // jobId of expanded card
  const [applied, setApplied] = useState(new Set()); // track applied jobs
  const [assessments, setAssessments] = useState({}); // jobId → assessment (null = none, obj = found)
  const [filters, setFilters] = useState({ location: "", type: "all", urgency: "all", department: "all", industry: "all" });
  const [sortBy, setSortBy] = useState("match"); // match, newest, urgency

  useEffect(() => {
    api.getPublicJobs('?limit=200').then(r => setJobs(Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : [])));
    // load already-applied jobs for this candidate via the /mine endpoint
    api.getMyApplications().then(apps => {
      setApplied(new Set(apps.map(a => a.jobId?.id || a.jobId?._id?.toString?.() || (typeof a.jobId === 'string' ? a.jobId : '')).filter(Boolean)));
    }).catch(() => { });
  }, [user.id]);

  const run = async (currentQuery = query, currentFilters = filters) => {
    setLoad(true);
    try {
      const profileRes = await api.getUser(user.id);
      const profile = profileRes.data || profileRes;
      
      let matched = matchJobsToCandidate(profile, jobs, currentQuery);
      
      // Apply Advanced Filters
      if (currentFilters.location) {
        matched = matched.filter(r => r.job.location?.toLowerCase().includes(currentFilters.location.toLowerCase()));
      }
      if (currentFilters.type !== 'all') {
        matched = matched.filter(r => r.job.jobType === currentFilters.type || (currentFilters.type === 'remote' && r.job.location?.toLowerCase().includes('remote')));
      }
      if (currentFilters.department !== 'all') {
        matched = matched.filter(r => r.job.department?.toLowerCase().includes(currentFilters.department.toLowerCase()));
      }
      if (currentFilters.industry !== 'all') {
        matched = matched.filter(r => r.job.industry?.toLowerCase().includes(currentFilters.industry.toLowerCase()));
      }
      if (currentFilters.urgency !== 'all') {
        matched = matched.filter(r => r.job.urgency === currentFilters.urgency);
      }

      // Apply Advanced Sorting
      if (sortBy === 'newest') {
        matched.sort((a, b) => new Date(b.job.createdAt) - new Date(a.job.createdAt));
      } else if (sortBy === 'urgency') {
        const order = { 'High': 3, 'Medium': 2, 'Low': 1 };
        matched.sort((a, b) => (order[b.job.urgency] || 0) - (order[a.job.urgency] || 0));
      }

      setResults(matched);
    } catch (e) { setToast(`❌ Matching failed: ${e.message}`); }
    setLoad(false);
  };

  // Auto-run when jobs, filters, or sortBy changes
  useEffect(() => {
    if (jobs.length > 0) run(query, filters);
  }, [jobs, filters, sortBy]);

  // Debounced search for query only
  useEffect(() => {
    if (jobs.length === 0) return;
    const timer = setTimeout(() => run(query, filters), 400);
    return () => clearTimeout(timer);
  }, [query]);

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
    <div style={{ animation: 'tn-fadein 0.3s ease both' }}>
      <Toast msg={toast} onClose={() => setToast("")} />
      <PageHeader 
        title="Job Match & Career Explorer" 
        subtitle="Our deterministic matching engine analyzes your profile against every open position to find your perfect next role." 
      />

      {/* ── Search Hero Section ── */}
      <div style={{ 
        background: 'linear-gradient(135deg,#032D60,#0176D3)', 
        padding: '40px 24px', 
        borderRadius: 20, 
        textAlign: 'center', 
        position: 'relative', 
        overflow: 'hidden',
        marginBottom: 24,
        boxShadow: '0 10px 30px rgba(1,118,211,0.2)'
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px', pointerEvents: 'none' }} />
        <h2 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 900, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
          Find Your Next Great Role
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: '0 0 24px' }}>
          Searching across <strong style={{ color: '#00C2CB' }}>{jobs.length}</strong> active opportunities
        </p>
        
        <form 
          onSubmit={e => { e.preventDefault(); run(query, filters); }}
          style={{ maxWidth: 700, margin: '0 auto', position: 'relative', display: 'flex', gap: 10 }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: 18 }}>🔍</span>
            <input 
              value={query} 
              onChange={e => setQuery(e.target.value)} 
              placeholder="Search by role, skills (e.g. .NET, React), or company…"
              style={{ 
                width: '100%', 
                boxSizing: 'border-box', 
                padding: '16px 20px 16px 48px', 
                borderRadius: 16, 
                border: 'none', 
                fontSize: 16, 
                outline: 'none', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                background: '#fff',
                color: '#1E293B'
              }} 
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            style={{ 
              background: 'linear-gradient(135deg,#00C2CB,#0891B2)', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 16, 
              padding: '0 32px', 
              fontWeight: 800, 
              fontSize: 15, 
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,194,203,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? '...' : 'Search Jobs'}
          </button>
        </form>
      </div>

      {/* ── Filters & Sorting Bar ── */}
      <div style={{ ...card, marginBottom: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          
          <div style={{ flex: '1 1 180px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14 }}>📍</span>
            <input 
              value={filters.location}
              onChange={e => setFilters(p => ({ ...p, location: e.target.value }))}
              placeholder="All Locations"
              style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none', background: '#F8FAFC' }}
            />
          </div>

          <select 
            value={filters.department}
            onChange={e => setFilters(p => ({ ...p, department: e.target.value }))}
            style={{ flex: '1 1 160px', padding: '9px 12px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#1E293B', background: '#F8FAFC', outline: 'none' }}
          >
            <option value="all">🏢 All Departments</option>
            {[...new Set(jobs.map(j => j.department).filter(Boolean))].sort().map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select 
            value={filters.industry}
            onChange={e => setFilters(p => ({ ...p, industry: e.target.value }))}
            style={{ flex: '1 1 160px', padding: '9px 12px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#1E293B', background: '#F8FAFC', outline: 'none' }}
          >
            <option value="all">🏭 All Industries</option>
            {[...new Set(jobs.map(j => j.industry).filter(Boolean))].sort().map(i => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>

          <select 
            value={filters.type}
            onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}
            style={{ flex: '1 1 140px', padding: '9px 12px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#1E293B', background: '#F8FAFC', outline: 'none' }}
          >
            <option value="all">💼 All Job Types</option>
            <option value="full-time">Full-time</option>
            <option value="remote">Remote Only</option>
            <option value="contract">Contract</option>
          </select>

          <select 
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ flex: '1 1 180px', padding: '9px 12px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 13, color: '#1E293B', background: '#F8FAFC', outline: 'none' }}
          >
            <option value="match">📊 Sort by Match Score</option>
            <option value="newest">📅 Sort by Newest</option>
            <option value="urgency">⚡ Sort by Urgency</option>
          </select>

      {/* ── Search Status / Results Count ── */}
      {(query || filters.location !== "" || filters.department !== "all" || filters.industry !== "all" || filters.type !== "all") && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '0 4px' }}>
          <div style={{ color: '#64748B', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0176D3', display: 'inline-block' }} />
            <span>Showing <b style={{ color: '#1E293B' }}>{results.length}</b> matches {query && <>for "<b style={{ color: '#0176D3' }}>{query}</b>"</>}</span>
          </div>
          <button 
            onClick={() => { setQuery(""); setFilters({ location: "", type: "all", urgency: "all", department: "all", industry: "all" }); }}
            style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#475569', cursor: 'pointer' }}
          >
            Clear All
          </button>
        </div>
      )}

      {results.length === 0 && !loading && jobs.length > 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '40px 20px', color: '#706E6B' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#3E3E3C', marginBottom: 6 }}>No matches found</p>
          <p style={{ fontSize: 13 }}>Try adjusting your search or updating your profile to see more roles.</p>
        </div>
      )}
      {loading && (
        <div style={{ ...card, textAlign: 'center', padding: '24px 20px', color: '#706E6B', border: '1.5px dashed rgba(1,118,211,0.2)', marginBottom: 12 }}>
          <Spinner size={24} />
          <p style={{ fontSize: 13, fontWeight: 600, color: '#3E3E3C', marginTop: 8 }}>Searching for best matches...</p>
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
                <p style={{ color: "#706E6B", fontSize: 12, marginTop: 6, marginBottom: 0, lineHeight: '1.5' }}>{r.reasoning}</p>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12, marginBottom: 14 }}>
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
                      onClick={() => { navigate(`/app/assessment/${assessments[r.jobId].id || assessments[r.jobId]._id}`); }}
                      style={{ ...btnP, padding: '7px 18px', fontSize: 12, background: '#0176D3' }}
                    >
                      📝 Take Assessment
                    </button>
                  </div>
                )}
                <div style={{ paddingTop: 14, borderTop: '1px solid #F3F2F2', display: 'flex', gap: 10 }}>
                  {isApplied ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#2E844A', fontSize: 13, fontWeight: 600 }}>✓ You've already applied</span>
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
    <style>{`
        @keyframes tn-fadein {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
