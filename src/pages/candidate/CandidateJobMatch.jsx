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
  const [assessments, setAssessments] = useState({}); // jobId → assessment
  const [filters, setFilters] = useState({ location: "", type: "all", urgency: "all", department: "all", industry: "all" });
  const [sortBy, setSortBy] = useState("match"); // match, newest, urgency
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // Fetch the entire pool (10k cap) to ensure 100% coverage matching career page visibility
    api.getPublicJobs('?limit=10000').then(r => setJobs(Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : [])));
    api.getMyApplications().then(apps => {
      setApplied(new Set(apps.map(a => a.jobId?.id || a.jobId?._id?.toString?.() || (typeof a.jobId === 'string' ? a.jobId : '')).filter(Boolean)));
    }).catch(() => { });
    api.getUser(user.id).then(r => setProfile(r.data || r)).catch(() => {});
  }, [user.id]);

  const run = (currentQuery = query, currentFilters = filters) => {
    if (!jobs.length) return;
    setLoad(true);
    try {
      let matched = matchJobsToCandidate(profile || {}, jobs, currentQuery);
      
      // Advanced Filters
      const qLocation = (currentFilters.location || '').toLowerCase();
      if (qLocation) matched = matched.filter(r => (r.job.location || '').toLowerCase().includes(qLocation));
      
      if (currentFilters.type !== 'all') {
        const type = currentFilters.type;
        matched = matched.filter(r => r.job.jobType === type || (type === 'remote' && (r.job.location || '').toLowerCase().includes('remote')));
      }
      
      if (currentFilters.department !== 'all') {
        const dep = currentFilters.department.toLowerCase();
        matched = matched.filter(r => (r.job.department || '').toLowerCase().includes(dep));
      }

      // Sorting
      if (sortBy === 'newest') matched.sort((a, b) => new Date(b.job.createdAt) - new Date(a.job.createdAt));
      else if (sortBy === 'urgency') {
        const order = { 'High': 3, 'Medium': 2, 'Low': 1 };
        matched.sort((a, b) => (order[b.job.urgency] || 0) - (order[a.job.urgency] || 0));
      } else {
        matched.sort((a, b) => b.matchScore - a.matchScore);
      }

      setResults(matched);
    } catch (e) { console.error(e); }
    setLoad(false);
  };

  useEffect(() => { run(query, filters); }, [jobs, filters, sortBy, profile]);
  useEffect(() => {
    const timer = setTimeout(() => run(query, filters), 300);
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
          style={{ maxWidth: 800, margin: '0 auto', position: 'relative', display: 'flex', gap: 12, flexDirection: isMobile ? 'column' : 'row' }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: '#0176D3', fontSize: 20 }}>🔍</span>
            <input 
              value={query} 
              onChange={e => setQuery(e.target.value)} 
              placeholder="Search by role, skills, or job details…"
              style={{ 
                width: '100%', 
                boxSizing: 'border-box', 
                padding: '18px 24px 18px 54px', 
                borderRadius: 18, 
                border: 'none', 
                fontSize: 16, 
                outline: 'none', 
                boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                background: '#fff',
                color: '#1E293B',
                fontWeight: 500
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
              borderRadius: 18, 
              padding: isMobile ? '16px' : '0 40px', 
              fontWeight: 900, 
              fontSize: 16, 
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(0,194,203,0.4)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              opacity: loading ? 0.7 : 1,
              whiteSpace: 'nowrap'
            }}
          >
            {loading ? <Spinner size={20} /> : 'Search Positions'}
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
            style={{ flex: '1 1 160px', padding: '9px 12px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 13, background: '#F8FAFC' }}
          >
            <option value="all">🏢 All Departments</option>
            {[...new Set(jobs.map(j => j.department).filter(Boolean))].sort().map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select 
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ flex: '1 1 180px', padding: '9px 12px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 13, background: '#F8FAFC' }}
          >
            <option value="match">📊 Sort by Match Score</option>
            <option value="newest">📅 Sort by Newest</option>
            <option value="urgency">⚡ Sort by Urgency</option>
          </select>
        </div>
      </div>

      {/* ── Search Status ── */}
      {results.length === 0 && !loading && jobs.length > 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ color: '#706E6B' }}>No matches found. Try adjusting your search.</p>
        </div>
      )}
      {loading && <div style={{ textAlign: 'center', padding: 24 }}><Spinner /></div>}

      {/* ── Results List ── */}
      {results.map((r, i) => {
        const isOpen = expanded === r.jobId;
        const isApplied = applied.has(String(r.jobId));
        const j = r.job;
        if (!j) return null;

        return (
          <div key={r.jobId} style={{ ...card, marginBottom: 12, border: `1px solid ${r.matchScore >= 80 ? 'rgba(34,197,94,0.3)' : 'rgba(1,118,211,0.25)'}` }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: 'wrap' }}>
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

              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <button onClick={() => toggleExpand(r.jobId)} style={{ ...btnG, padding: "6px 14px", fontSize: 12 }}>
                  {isOpen ? '▲ Hide' : '▼ Details'}
                </button>
                <button onClick={() => apply(r.jobId)} disabled={isApplied} style={{ ...btnP, padding: "6px 14px", fontSize: 12, opacity: isApplied ? 0.5 : 1 }}>
                  {isApplied ? '✓ Applied' : 'Apply Now'}
                </button>
              </div>
            </div>

            {/* skill highlights */}
            {(r.highlights || []).length > 0 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
                {r.highlights.map((h, k) => <Badge key={k} label={`✓ ${h}`} color="#014486" />)}
              </div>
            )}

            {/* expanded details */}
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

                {j.description && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ color: '#0176D3', fontSize: 11, marginBottom: 6, fontWeight: 600 }}>JOB DESCRIPTION</div>
                    <p style={{ color: '#706E6B', fontSize: 13, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{j.description}</p>
                  </div>
                )}

                {assessments[r.jobId] && (
                  <div style={{ background: 'rgba(1,118,211,0.06)', border: '1px solid rgba(1,118,211,0.25)', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ color: '#0176D3', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>📝 ASSESSMENT REQUIRED</div>
                    <p style={{ color: '#3E3E3C', fontSize: 13, margin: '0 0 10px' }}>{assessments[r.jobId].title || 'Skills Assessment'}</p>
                    <button onClick={() => navigate(`/app/assessment/${assessments[r.jobId].id || assessments[r.jobId]._id}`)} style={{ ...btnP, fontSize: 12 }}>Take Assessment</button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes tn-fadein { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
