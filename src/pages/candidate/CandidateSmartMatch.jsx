import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [jobs, setJobs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoad] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalJobs, setTotalJobs] = useState(0);
  const [toast, setToast] = useState("");
  const [expanded, setExpanded] = useState(null);   // jobId of expanded card
  const [applied, setApplied] = useState(new Set()); // track applied jobs
  const [assessments, setAssessments] = useState({}); // jobId → assessment (null = none, obj = found)
  const [companyInfo, setCompanyInfo] = useState({}); // companyName → org data
  const [companyReviews, setCompanyReviews] = useState({}); // companyName → reviews array

  const extractJobs = (res) =>
    Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);

  useEffect(() => {
    let cancelled = false;
    const BATCH = 200;

    Promise.allSettled([
      api.getUser(user.id),
      api.getPublicJobs(`?limit=${BATCH}&page=1`),
      api.getMyApplications(),
      api.getMyOrgReviews(),
    ]).then(([profRes, jobsRes, appsRes, reviewsRes]) => {
      if (cancelled) return;
      const p = profRes.status === 'fulfilled' ? (profRes.value?.data || profRes.value) : null;
      if (p) setProfile(p);

      const firstBatch = jobsRes.status === 'fulfilled' ? extractJobs(jobsRes.value) : [];
      const total = jobsRes.status === 'fulfilled' ? (jobsRes.value?.total || firstBatch.length) : 0;
      setTotalJobs(total);
      setJobs(firstBatch);

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

      // Background-load remaining pages so all jobs eventually appear
      if (total > BATCH) {
        const totalPages = Math.ceil(total / BATCH);
        setLoadingMore(true);
        const pagePromises = [];
        for (let pg = 2; pg <= totalPages; pg++) {
          pagePromises.push(api.getPublicJobs(`?limit=${BATCH}&page=${pg}`).then(extractJobs).catch(() => []));
        }
        Promise.all(pagePromises).then(pages => {
          if (cancelled) return;
          const allExtra = pages.flat();
          if (allExtra.length > 0) {
            setJobs(prev => {
              const combined = [...prev, ...allExtra];
              return combined;
            });
          }
          setLoadingMore(false);
        });
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
        {jobs.length > 0 && (
          <p style={{ color: '#64748b', fontSize: 11, marginTop: 8, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            Searching across {jobs.length}{totalJobs > jobs.length ? `/${totalJobs}` : ''} open positions · Real-time smart matching based on your profile
            {loadingMore && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#0176D3', fontWeight: 600 }}><span style={{ width: 10, height: 10, border: '2px solid #BFDBFE', borderTopColor: '#0176D3', borderRadius: '50%', animation: 'tn-sm-spin 0.8s linear infinite', display: 'inline-block' }} />Loading more…</span>}
          </p>
        )}
        <style>{`@keyframes tn-sm-spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {results.length === 0 && !loading && jobs.length > 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '40px 20px', color: '#706E6B' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#3E3E3C', marginBottom: 6 }}>No exact matches found</p>
          <p style={{ fontSize: 13 }}>Try adjusting your search keyword or updating your profile to see more roles.</p>
        </div>
      )}
      {jobs.length === 0 && loading && (
        <div style={{ ...card, textAlign: 'center', padding: '40px 20px', color: '#706E6B' }}>
          <Spinner size={32} />
          <p style={{ fontSize: 15, fontWeight: 600, color: '#3E3E3C', marginTop: 12 }}>Loading open positions...</p>
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
    </div>
  );
}