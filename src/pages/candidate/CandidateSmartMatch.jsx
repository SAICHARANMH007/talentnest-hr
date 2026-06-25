import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { btnP, btnG, card } from '../../constants/styles.js';
import Field from '../../components/ui/Field.jsx';
import { api } from '../../api/api.js';
import { matchJobsToCandidate } from '../../api/matching.js';

export default function CandidateSmartMatch({ user }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoad] = useState(true);
  const [totalJobs, setTotalJobs] = useState(0);
  const [toast, setToast] = useState("");
  const [expanded, setExpanded] = useState(null);   // jobId of expanded card
  const [applied, setApplied] = useState(new Set()); // track applied jobs
  const [assessments, setAssessments] = useState({}); // jobId → assessment (null = none, obj = found)
  const [companyInfo, setCompanyInfo] = useState({}); // companyName → org data
  const [companyReviews, setCompanyReviews] = useState({}); // companyName → reviews array
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterIndustry, setFilterIndustry] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [displayLimit, setDisplayLimit] = useState(100);

  const extractJobs = (res) =>
    Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      api.getUser(user.id),
      api.getPublicJobs(),
      api.getMyApplications(),
      api.getMyOrgReviews(),
    ]).then(([profRes, jobsRes, appsRes, reviewsRes]) => {
      if (cancelled) return;
      const p = profRes.status === 'fulfilled' ? (profRes.value?.data || profRes.value) : null;
      if (p) setProfile(p);

      const allJobs = jobsRes.status === 'fulfilled' ? extractJobs(jobsRes.value) : [];
      const total = jobsRes.status === 'fulfilled' ? (jobsRes.value?.total || allJobs.length) : 0;
      setTotalJobs(total);
      setJobs(allJobs);

      if (appsRes.status === 'fulfilled') {
        const apps = appsRes.value || [];
        setApplied(new Set(apps.map(a => a.jobId?.id || a.jobId?._id?.toString?.() || (typeof a.jobId === 'string' ? a.jobId : '')).filter(Boolean)));
      }
      if (reviewsRes.status === 'fulfilled') {
        const allReviews = reviewsRes.value?.data || [];
        const byCompany = {};
        allReviews.forEach(rv => {
          const cn = (rv.companyName || '').trim();
          if (cn) { if (!byCompany[cn]) byCompany[cn] = []; byCompany[cn].push(rv); }
        });
        setCompanyReviews(byCompany);
      }
    });
    return () => { cancelled = true; };
  }, [user.id]);

  const run = (currentQuery = query, jobList = jobs, prof = profile) => {
    if (!prof || jobList.length === 0) return;
    setLoad(true);
    // Run matching in next tick to avoid blocking the UI thread
    setTimeout(() => {
      try {
        setResults(matchJobsToCandidate(prof, jobList, currentQuery));
      } catch (e) { setToast(`❌ Matching failed: ${e.message}`); }
      setLoad(false);
    }, 0);
  };

  // Auto-run once both jobs and profile are ready
  useEffect(() => {
    if (jobs.length > 0 && profile) {
      run(query, jobs, profile);
    }
  }, [jobs, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search on query change
  useEffect(() => {
    if (jobs.length === 0 || !profile) return;
    const timer = setTimeout(() => {
      run(query, jobs, profile);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  // When arriving from the dashboard with ?job=<id>, auto-expand that card once results load.
  useEffect(() => {
    const jobParam = searchParams.get('job');
    if (!jobParam || results.length === 0) return;
    const match = results.find(r => String(r.jobId) === String(jobParam));
    if (!match) return;
    // Only auto-expand if nothing is already open (avoid clobbering a manual selection)
    setExpanded(prev => prev !== null ? prev : match.jobId);
  }, [results]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll the expanded card into view whenever it changes
  useEffect(() => {
    if (!expanded) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`job-card-${expanded}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120); // slight delay to let React render the expanded content first
    return () => clearTimeout(timer);
  }, [expanded]);

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

  // Derive unique filter options from loaded jobs
  const companyOptions = useMemo(() => {
    const s = new Set(jobs.map(j => (j.companyName || j.company || '').trim()).filter(Boolean));
    return [...s].sort();
  }, [jobs]);
  const industryOptions = useMemo(() => {
    const s = new Set(jobs.map(j => (j.industry || '').trim()).filter(Boolean));
    return [...s].sort();
  }, [jobs]);
  const departmentOptions = useMemo(() => {
    const s = new Set(jobs.map(j => (j.department || '').trim()).filter(Boolean));
    return [...s].sort();
  }, [jobs]);

  // Apply secondary filters on top of match results
  const filteredResults = useMemo(() => {
    // Always strip jobs the candidate has already applied to — they belong in
    // My Applications, not in job suggestions.
    let out = results.filter(r => !applied.has(String(r.jobId)));
    if (filterCompany !== 'all') out = out.filter(r => (r.job?.companyName || r.job?.company || '') === filterCompany);
    if (filterIndustry !== 'all') out = out.filter(r => (r.job?.industry || '').toLowerCase().includes(filterIndustry.toLowerCase()));
    if (filterDepartment !== 'all') out = out.filter(r => (r.job?.department || '').toLowerCase().includes(filterDepartment.toLowerCase()));
    return out;
  }, [results, applied, filterCompany, filterIndustry, filterDepartment]);

  // Reset display limit when the filtered set changes
  useEffect(() => { setDisplayLimit(100); }, [filteredResults]);

  const displayResults = filteredResults.slice(0, displayLimit);

  const selStyle = { flex: '1 1 160px', padding: '9px 12px', borderRadius: 12, border: '1.5px solid var(--app-card-border, #E2E8F0)', fontSize: 13, background: 'var(--app-input-bg, #F8FAFC)', color: 'var(--app-text, #181818)', outline: 'none' };

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast("")} />
      <PageHeader title="Smart Job Search" subtitle="Jobs selected for you based on your skills, experience, and preferences" />

      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <Field
            value={query}
            onChange={v => setQuery(v)}
            placeholder="Search by role, skill, or location..."
            style={{ flex: 1 }}
          />
          <button onClick={() => run(query, jobs, profile)} disabled={loading} style={{ ...btnP, opacity: loading ? 0.6 : 1 }}>
            {loading ? <><Spinner /> Matching…</> : "📊 Refresh Match"}
          </button>
        </div>
        {/* Filters row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} style={selStyle}>
            <option value="all">🏢 All Companies</option>
            {companyOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)} style={selStyle}>
            <option value="all">🏭 All Industries</option>
            {industryOptions.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} style={selStyle}>
            <option value="all">📂 All Departments</option>
            {departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        {jobs.length > 0 && (
          <p style={{ color: 'var(--app-text-muted, #64748b)', fontSize: 11, marginTop: 8, marginBottom: 0 }}>
            Searching across {jobs.length} open positions · showing {displayResults.length}{filteredResults.length > displayLimit ? ` of ${filteredResults.length}` : ''} matches
          </p>
        )}
      </div>

      {displayResults.length === 0 && !loading && jobs.length > 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '40px 20px', color: 'var(--app-text-sec, #706E6B)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--app-text, #3E3E3C)', marginBottom: 6 }}>No matches found</p>
          <p style={{ fontSize: 13 }}>Try adjusting the filters, search keyword, or updating your profile.</p>
        </div>
      )}
      {jobs.length === 0 && loading && (
        <div style={{ ...card, textAlign: 'center', padding: '40px 20px', color: 'var(--app-text-sec, #706E6B)' }}>
          <Spinner size={32} />
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--app-text, #3E3E3C)', marginTop: 12 }}>Loading open positions...</p>
        </div>
      )}

      {displayResults.map((r, i, arr) => {
        const isOpen = expanded === r.jobId;
        const isApplied = applied.has(String(r.jobId));
        const j = r.job;
        if (!j) return null;

        return (
          <div key={r.jobId} id={`job-card-${r.jobId}`} style={{ ...card, marginBottom: 12, border: `1px solid ${r.matchScore >= 80 ? 'rgba(34,197,94,0.3)' : 'rgba(1,118,211,0.25)'}` }}>

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
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--app-card-border, #FAFAF9)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12, marginBottom: 14 }}>
                  {[
                    ['🏢 Company', j.companyName || j.company],
                    ['📍 Location', j.location || '—'],
                    ['🧑‍💼 Experience', j.experience || '—'],
                    ['⚡ Urgency', j.urgency || '—'],
                  ].map(([label, val]) => (
                    <div key={label} style={{ background: 'var(--app-input-bg, #FAFAFA)', borderRadius: 10, padding: '10px 14px', border: '1px solid var(--app-card-border, transparent)' }}>
                      <div style={{ color: 'var(--app-primary, #0176D3)', fontSize: 10, marginBottom: 3 }}>{label}</div>
                      <div style={{ color: 'var(--app-text, #181818)', fontSize: 13, fontWeight: 500 }}>{val}</div>
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
                    <p style={{ color: 'var(--app-text-sec, #706E6B)', fontSize: 13, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{j.description}</p>
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
                {/* Company Overview */}
                {(j.companyName || j.company) && (
                  <div style={{ marginBottom: 14, background: 'var(--app-input-bg, #F8FAFC)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--app-card-border, #E5E7EB)' }}>
                    <div style={{ color: '#0176D3', fontSize: 11, fontWeight: 700, marginBottom: 10 }}>🏢 ABOUT {(j.companyName || j.company || '').toUpperCase()}</div>
                    {/* Always-visible basics from job fields */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                      {(j.hqCity || j.location) && <span style={{ fontSize: 12, color: '#374151' }}>📍 {j.hqCity ? `${j.hqCity}${j.hqCountry ? `, ${j.hqCountry}` : ''}` : j.location}</span>}
                      {j.industry && <span style={{ fontSize: 12, color: '#374151' }}>🏭 {j.industry}</span>}
                      {j.foundedYear && <span style={{ fontSize: 12, color: '#374151' }}>📅 Founded {j.foundedYear}</span>}
                      {j.employeeCount && <span style={{ fontSize: 12, color: '#374151' }}>👥 {j.employeeCount} employees</span>}
                      {j.website && <a href={j.website.startsWith('http') ? j.website : `https://${j.website}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#0176D3', textDecoration: 'none', fontWeight: 600 }}>🌐 Website ↗</a>}
                    </div>
                    {j.companyDescription && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{j.companyDescription}</div>
                      </div>
                    )}
                    {j.productsServices && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 3 }}>PRODUCTS & SERVICES</div>
                        <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{j.productsServices}</div>
                      </div>
                    )}
                    {j.cultureNotes && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 3 }}>CULTURE & ENVIRONMENT</div>
                        <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{j.cultureNotes}</div>
                      </div>
                    )}
                    {j.successStories && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 3 }}>ACHIEVEMENTS & MILESTONES</div>
                        <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{j.successStories}</div>
                      </div>
                    )}
                    {!j.companyDescription && !j.productsServices && !j.cultureNotes && !j.successStories && !j.foundedYear && !j.employeeCount && !j.website && (
                      <div style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>Company details not yet provided by the recruiter.</div>
                    )}
                  </div>
                )}

                {/* Company Reviews */}
                {(() => {
                  const cName = j.companyName || j.company;
                  const reviews = cName ? companyReviews[cName] : undefined;
                  if (!reviews || reviews.length === 0) return null;
                  const avg = reviews.reduce((s, rv) => s + (rv.rating || 0), 0) / reviews.length;
                  const stars = '★'.repeat(Math.round(avg)) + '☆'.repeat(5 - Math.round(avg));
                  return (
                    <div style={{ marginBottom: 14, background: '#FFFBEB', borderRadius: 12, padding: '14px 16px', border: '1px solid #FDE68A' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <span style={{ color: '#92400E', fontSize: 11, fontWeight: 700 }}>⭐ COMPANY REVIEWS</span>
                        <span style={{ color: '#F59E0B', fontSize: 14, fontWeight: 800 }}>{stars}</span>
                        <span style={{ fontSize: 12, color: '#78350F', fontWeight: 700 }}>{avg.toFixed(1)} / 5</span>
                        <span style={{ fontSize: 11, color: '#92400E' }}>({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {reviews.slice(0, 3).map((rv, idx) => (
                          <div key={idx} style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: '1px solid #FDE68A' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{rv.reviewerName || 'Anonymous'}</span>
                              <span style={{ color: '#F59E0B', fontSize: 12 }}>{'★'.repeat(rv.rating || 0)}{'☆'.repeat(5 - (rv.rating || 0))}</span>
                            </div>
                            {rv.comment && <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>{rv.comment}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

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

      {filteredResults.length > displayLimit && (
        <div style={{ textAlign: 'center', marginTop: 16, marginBottom: 8 }}>
          <button
            onClick={() => setDisplayLimit(prev => prev + 100)}
            style={{ ...btnG, padding: '10px 28px', fontSize: 13, borderColor: 'rgba(1,118,211,0.4)', color: '#0176D3' }}
          >
            Load more ({filteredResults.length - displayLimit} remaining)
          </button>
        </div>
      )}
    </div>
  );
}