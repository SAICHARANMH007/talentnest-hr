import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api/api.js';
import Spinner from '../../components/ui/Spinner.jsx';
import { requestGeolocation } from '../../utils/geolocation.js';
import MarketingNav from '../marketing/MarketingNav.jsx';
import MarketingFooter from '../marketing/MarketingFooter.jsx';

// Slug that identifies TalentNest HR's own org — gets full marketing header/footer
const MAIN_ORG_SLUG = 'talentnesthr';
import { getCompanyCareerUrl } from '../../utils/url.js';

// ── Urgency config ────────────────────────────────────────────────────────────
const URGENCY_COLOR = { High: '#BA0517', Medium: '#F59E0B', Low: '#10B981', '': '#0176D3' };
const URGENCY_LABEL = { High: '🔥 Emergency', Medium: '⚡ High Priority', Low: '📌 Normal', '': '📋 Open' };

import { Link } from 'react-router-dom';
import PublicApplyModal from '../../components/modals/PublicApplyModal.jsx';
import ReferEarnModal from '../../components/modals/ReferEarnModal.jsx';


// ── Main embeddable careers page ──────────────────────────────────────────────
export default function OrgCareersPage() {
  const { orgSlug } = useParams();
  const [searchParams] = useSearchParams();
  const embed    = searchParams.get('embed') === '1'; // when embedded as iframe
  const refToken = searchParams.get('ref') || '';
  // TalentNest HR's own career page gets full Marketing nav + footer
  const isMainOrg = orgSlug === MAIN_ORG_SLUG;

  const [org, setOrg] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [employerBrand, setEmployerBrand] = useState(null);
  const [brandColors, setBrandColors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [urgency, setUrgency] = useState('All');
  const [location, setLocation] = useState('All');
  const [applying, setApplying] = useState(null);
  const [referJob, setReferJob] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', pros: '', cons: '', role: '', isAnonymous: true });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

  useEffect(() => {
    if (!orgSlug) return;
    setLoading(true);
    api.getOrgPublicJobs(orgSlug)
      .then(res => {
        if (!res.success) { setError('Organisation not found or career page not available.'); return; }
        setOrg(res.org);
        setJobs(Array.isArray(res.data) ? res.data : []);
        setEmployerBrand(res.employerBrand || null);
        setBrandColors(res.brandColors || {});
        const orgName  = res.org?.name || 'Company';
        const siteUrl  = window.location.origin;
        const pageUrl  = window.location.href;
        const logoUrl  = res.employerBrand?.bannerImageUrl || `${siteUrl}/favicon.svg`;
        const jobCount = (Array.isArray(res.data) ? res.data : []).length;
        const desc     = res.employerBrand?.about
          ? res.employerBrand.about.slice(0, 160)
          : `${orgName} is hiring! Browse ${jobCount} open position${jobCount !== 1 ? 's' : ''} and apply today.`;

        document.title = `${orgName} — ${jobCount} Open Position${jobCount !== 1 ? 's' : ''}`;

        const setMetaTag = (sel, attr, val) => {
          let el = document.head.querySelector(sel);
          if (!el) { el = document.createElement('meta'); document.head.appendChild(el); }
          el.setAttribute(attr, val);
        };
        setMetaTag('meta[name="description"]',        'content', desc);
        setMetaTag('meta[property="og:title"]',       'property', 'og:title');
        document.head.querySelector('meta[property="og:title"]')?.setAttribute('content', `${orgName} Careers — Open Positions`);
        setMetaTag('meta[property="og:description"]', 'property', 'og:description');
        document.head.querySelector('meta[property="og:description"]')?.setAttribute('content', desc);
        setMetaTag('meta[property="og:url"]',         'property', 'og:url');
        document.head.querySelector('meta[property="og:url"]')?.setAttribute('content', pageUrl);
        setMetaTag('meta[property="og:image"]',       'property', 'og:image');
        document.head.querySelector('meta[property="og:image"]')?.setAttribute('content', logoUrl);
        setMetaTag('meta[property="og:type"]',        'property', 'og:type');
        document.head.querySelector('meta[property="og:type"]')?.setAttribute('content', 'website');
        setMetaTag('meta[name="twitter:card"]',       'name', 'twitter:card');
        document.head.querySelector('meta[name="twitter:card"]')?.setAttribute('content', 'summary_large_image');
        setMetaTag('meta[name="twitter:title"]',      'name', 'twitter:title');
        document.head.querySelector('meta[name="twitter:title"]')?.setAttribute('content', `${orgName} Careers`);

        let canon = document.head.querySelector('link[rel="canonical"]');
        if (!canon) { canon = document.createElement('link'); canon.rel = 'canonical'; document.head.appendChild(canon); }
        canon.href = pageUrl;

        // Inject Organization JSON-LD for Google Knowledge Graph
        const existingLd = document.getElementById('org-career-ld');
        if (existingLd) existingLd.remove();
        const ldScript = document.createElement('script');
        ldScript.id = 'org-career-ld';
        ldScript.type = 'application/ld+json';
        ldScript.text = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: orgName,
          url: pageUrl,
          logo: logoUrl,
          description: desc,
          ...(res.employerBrand?.website ? { sameAs: [res.employerBrand.website] } : {}),
        });
        document.head.appendChild(ldScript);
      })
      .catch(() => setError('Could not load jobs. Please try again later.'))
      .finally(() => setLoading(false));

    // Load reviews in parallel (non-blocking)
    api.getPublicReviews(orgSlug).then(r => {
      if (r?.success) { setReviews(r.data || []); setAvgRating(r.avgRating); }
    }).catch(() => {});
  }, [orgSlug]);

  const locations = ['All', ...new Set(jobs.map(j => j.location).filter(Boolean))];
  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    const matchSearch = !q || (j.title || '').toLowerCase().includes(q) || (j.company || '').toLowerCase().includes(q) || (j.skills || []).join(',').toLowerCase().includes(q);
    const matchUrgency = urgency === 'All' || j.urgency === urgency;
    const matchLocation = location === 'All' || j.location === location;
    return matchSearch && matchUrgency && matchLocation;
  });

  const accentColor = '#0176D3';

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: embed ? 300 : '100vh', background: '#F7F8FC' }}>
      <Spinner size={40} />
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: embed ? 300 : '100vh', background: '#F7F8FC', fontFamily: "'Plus Jakarta Sans',sans-serif", textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>😕</div>
      <h2 style={{ color: '#0A1628', fontWeight: 800, marginBottom: 10 }}>Career Page Not Found</h2>
      <p style={{ color: '#64748B', maxWidth: 420, marginBottom: 20, lineHeight: 1.6 }}>
        {error} This could be a temporary issue — try again in a moment.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={() => window.location.reload()}
          style={{ background: 'linear-gradient(135deg,#0176D3,#00C2CB)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          🔄 Try Again
        </button>
        <a href="/careers" style={{ background: '#F1F5F9', color: '#374151', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 22px', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
          Browse All Jobs
        </a>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", minHeight: embed ? 'auto' : '100dvh', background: '#F7F8FC' }}>
      <style>{`
        @media (max-width: 640px) {
          .org-career-cta { width: 100% !important; align-items: stretch !important; }
          .org-career-cta button { width: 100% !important; justify-content: center !important; }
        }
      `}</style>
      {applying && <PublicApplyModal job={applying} orgName={org?.name} refToken={refToken} onClose={() => setApplying(null)} />}
      {referJob && <ReferEarnModal job={referJob} onClose={() => setReferJob(null)} />}

      {/* Full Marketing nav — only for TalentNest HR's own career page */}
      {isMainOrg && !embed && <MarketingNav active="careers" />}

      {/* TalentNest HR hero header — full-width branded section */}
      {isMainOrg && !embed && (
        <div style={{ background: 'linear-gradient(135deg,#032D60,#0176D3)', padding: 'clamp(64px,8vw,100px) clamp(16px,5vw,60px) 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />
          {org?.logoUrl && (
            <img src={org.logoUrl} alt={org.name} style={{ height: 52, objectFit: 'contain', borderRadius: 12, background: '#fff', padding: '6px 14px', display: 'block', margin: '0 auto 20px' }} />
          )}
          <h1 style={{ color: '#fff', fontSize: 'clamp(1.8rem,4.5vw,2.8rem)', fontWeight: 900, margin: '0 0 10px', letterSpacing: '-0.03em' }}>
            {org?.name} — Open Positions
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, margin: '0 0 28px' }}>
            {jobs.length} open role{jobs.length !== 1 ? 's' : ''} · Apply directly below
          </p>
          <div style={{ maxWidth: 520, margin: '0 auto', position: 'relative' }}>
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: 16 }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roles, skills…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '14px 18px 14px 44px', borderRadius: 14, border: 'none', fontSize: 15, outline: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', WebkitAppearance: 'none' }} />
          </div>
        </div>
      )}

      {/* Minimal top bar — shown for external orgs; hidden for TalentNest HR (uses MarketingNav) and for embedded mode */}
      {!(isMainOrg && !embed) && <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: embed ? '12px 16px' : '14px 20px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
        {org?.logoUrl && (
          <img src={org.logoUrl} alt={org.name} style={{ height: 32, borderRadius: 6, objectFit: 'contain', flexShrink: 0 }} />
        )}
        <div style={{ flexShrink: 0 }}>
          <span style={{ fontWeight: 800, color: '#032D60', fontSize: 15 }}>{org?.name}</span>
          <span style={{ color: '#94A3B8', fontSize: 12, marginLeft: 8 }}>{jobs.length} open role{jobs.length !== 1 ? 's' : ''}</span>
        </div>
        <div style={{ flex: 1, minWidth: 140, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#94A3B8' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roles, skills…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 32px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 14, outline: 'none', background: '#F8FAFC', WebkitAppearance: 'none' }} />
        </div>
      </div>}

      {/* Employer Brand Section — shown for external orgs when brand data exists */}
      {!isMainOrg && !embed && employerBrand && (employerBrand.about || employerBrand.perks?.length > 0 || employerBrand.tagline) && (() => {
        const accent = employerBrand.accentColor || brandColors?.primary || '#0176D3';
        return (
          <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
            {/* Hero banner */}
            {employerBrand.bannerImageUrl ? (
              <div style={{ height: 200, background: `url(${employerBrand.bannerImageUrl}) center/cover no-repeat`, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.5))', display: 'flex', alignItems: 'flex-end', padding: '24px 32px' }}>
                  <div>
                    {org?.logoUrl && <img src={org.logoUrl} alt={org.name} style={{ height: 40, borderRadius: 8, background: '#fff', padding: '4px 10px', marginBottom: 8, display: 'block' }} />}
                    {employerBrand.tagline && <p style={{ color: '#fff', fontWeight: 700, fontSize: 18, margin: 0, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{employerBrand.tagline}</p>}
                  </div>
                </div>
              </div>
            ) : employerBrand.tagline ? (
              <div style={{ background: `linear-gradient(135deg, ${accent}, ${accent}CC)`, padding: '24px 28px' }}>
                {org?.logoUrl && <img src={org.logoUrl} alt={org.name} style={{ height: 36, borderRadius: 8, background: '#fff', padding: '4px 10px', marginBottom: 10, display: 'block' }} />}
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 17, margin: 0 }}>{employerBrand.tagline}</p>
              </div>
            ) : null}

            <div style={{ padding: '24px 28px', maxWidth: 900, margin: '0 auto' }}>
              {/* About */}
              {employerBrand.about && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ color: '#111827', fontSize: 16, fontWeight: 800, margin: '0 0 10px' }}>About Us</h3>
                  <p style={{ color: '#374151', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{employerBrand.about}</p>
                </div>
              )}

              {/* Perks */}
              {employerBrand.perks?.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ color: '#111827', fontSize: 16, fontWeight: 800, margin: '0 0 14px' }}>Perks & Benefits</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                    {employerBrand.perks.map((p, i) => (
                      <div key={i} style={{ background: '#F8FAFC', borderRadius: 12, padding: '14px 16px', border: '1px solid #E5E7EB' }}>
                        <div style={{ fontWeight: 700, color: '#111827', fontSize: 13, marginBottom: 4 }}>{p.title}</div>
                        {p.description && <div style={{ color: '#6B7280', fontSize: 12, lineHeight: 1.5 }}>{p.description}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Testimonials */}
              {employerBrand.testimonials?.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ color: '#111827', fontSize: 16, fontWeight: 800, margin: '0 0 14px' }}>Life at {org?.name}</h3>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {employerBrand.testimonials.map((t, i) => (
                      <div key={i} style={{ flex: '1 1 260px', background: '#F8FAFC', borderRadius: 12, padding: '16px 18px', border: `1px solid ${accent}22`, borderLeft: `4px solid ${accent}` }}>
                        <p style={{ color: '#374151', fontSize: 13, fontStyle: 'italic', margin: '0 0 10px', lineHeight: 1.6 }}>"{t.text}"</p>
                        <div style={{ fontWeight: 700, color: '#111827', fontSize: 12 }}>{t.name}</div>
                        {t.role && <div style={{ color: '#9CA3AF', fontSize: 11 }}>{t.role}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Social links */}
              {(employerBrand.website || employerBrand.linkedIn || employerBrand.twitter) && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {employerBrand.website && <a href={/^https?:\/\//.test(employerBrand.website) ? employerBrand.website : `https://${employerBrand.website}`} target="_blank" rel="noreferrer" style={{ color: accent, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>🌐 Website</a>}
                  {employerBrand.linkedIn && <a href={employerBrand.linkedIn} target="_blank" rel="noreferrer" style={{ color: '#0A66C2', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>💼 LinkedIn</a>}
                  {employerBrand.twitter  && <a href={employerBrand.twitter} target="_blank" rel="noreferrer" style={{ color: '#1DA1F2', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>🐦 Twitter</a>}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Filter pills — professional scrollable row */}
      <div style={{ 
        background: '#fff', 
        borderBottom: '1px solid #E2E8F0', 
        padding: '14px 20px', 
        display: 'flex', 
        gap: 10, 
        alignItems: 'center', 
        overflowX: 'auto', 
        position: 'sticky',
        top: isMainOrg && !embed ? 66 : (embed ? -1 : 0),
        zIndex: 110,
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch'
      }}>
        <style>{`.filter-row::-webkit-scrollbar { display: none; }`}</style>
        <div className="filter-row" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'nowrap' }}>
          {['All', 'High', 'Medium', 'Low'].map(u => (
            <button key={u} onClick={() => setUrgency(u)}
              style={{ 
                padding: '8px 16px', 
                borderRadius: 50, 
                border: '1.5px solid', 
                borderColor: urgency === u ? (URGENCY_COLOR[u] || accentColor) : '#E2E8F0', 
                background: urgency === u ? (URGENCY_COLOR[u] || accentColor) : '#fff', 
                color: urgency === u ? '#fff' : '#64748B', 
                fontWeight: 700, 
                fontSize: 12, 
                cursor: 'pointer', 
                whiteSpace: 'nowrap', 
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0,
                boxShadow: urgency === u ? `0 4px 12px ${URGENCY_COLOR[u] || accentColor}33` : 'none'
              }}>
              {u === 'All' ? 'All' : (u === 'High' ? '🔥 High' : (u === 'Medium' ? '⚡ Med' : '🌱 Low'))}
            </button>
          ))}
          
          <div style={{ width: 1, height: 20, background: '#E2E8F0', margin: '0 4px', flexShrink: 0 }} />

          {locations.length > 1 && (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <select value={location} onChange={e => setLocation(e.target.value)}
                style={{ 
                  padding: '8px 28px 8px 12px', 
                  border: '1.5px solid #E2E8F0', 
                  borderRadius: 50, 
                  fontSize: 12, 
                  fontWeight: 600,
                  color: location === 'All' ? '#64748B' : accentColor, 
                  background: '#F8FAFC', 
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none'
                }}>
                {locations.map(l => <option key={l} value={l}>{l === 'All' ? 'All Locations' : l}</option>)}
              </select>
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 9 }}>▼</span>
            </div>
          )}
        </div>
      </div>

      {/* Job listings */}
      <div style={{ maxWidth: embed ? 'none' : 860, margin: '0 auto', padding: embed ? '16px' : '28px 20px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: 15 }}>No roles match your search. Try clearing the filters.</p>
            <button onClick={() => { setSearch(''); setUrgency('All'); setLocation('All'); }}
              style={{ marginTop: 12, padding: '8px 20px', background: accentColor, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
              Clear Filters
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filtered.map(j => {
              const urg = j.urgency || '';
              const urgColor = URGENCY_COLOR[urg] || accentColor;
              const isOpen = expanded === (j.id || j._id);
              return (
                <div key={j.id || j._id}
                  style={{ background: '#fff', borderRadius: 14, borderLeft: `4px solid ${urgColor}`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden', transition: 'box-shadow 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'}>
                  <div style={{ padding: '18px 22px', cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : (j.id || j._id))}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Urgency + hiring badges */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          {urg && (
                            <span style={{ background: `${urgColor}18`, color: urgColor, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50, border: `1px solid ${urgColor}30` }}>
                              {URGENCY_LABEL[urg] || urg}
                            </span>
                          )}
                          <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50, border: '1px solid rgba(16,185,129,0.25)' }}>
                            ● Actively Hiring
                          </span>
                          {j.numberOfOpenings > 1 && (
                            <span style={{ background: 'rgba(1,118,211,0.08)', color: accentColor, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50 }}>
                              {j.numberOfOpenings} openings
                            </span>
                          )}
                        </div>
                        <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#0A1628' }}>
                          <a href={j.canonicalUrl || `/careers/job/${j.seoSlug || j._id || j.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                            {j.title}
                          </a>
                        </h3>
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', color: '#64748B', fontSize: 13 }}>
                          {j.location && <span>📍 {j.location}</span>}
                          {j.jobType && <span>💼 {j.jobType}</span>}
                          {j.experience && <span>🗓 {j.experience} exp</span>}
                          {(j.salaryMin || j.salaryMax) && (
                            <span style={{ color: '#10B981', fontWeight: 700 }}>
                              ₹{j.salaryMin ? `${j.salaryMin}` : ''}
                              {j.salaryMin && j.salaryMax ? '–' : ''}
                              {j.salaryMax ? `${j.salaryMax} LPA` : 'LPA+'}
                            </span>
                          )}
                        </div>
                        {/* Skills */}
                        {j.skills?.length > 0 && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                            {j.skills.slice(0, 6).map(s => (
                              <span key={s} style={{ background: 'rgba(1,118,211,0.07)', color: accentColor, fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20 }}>{s}</span>
                            ))}
                          </div>
                        )}
                        {/* Description & requirements — inside info col so they appear before CTA on mobile */}
                        {isOpen && (j.description || j.requirements) && (
                          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
                            {j.description && <p style={{ color: '#374151', fontSize: 13, lineHeight: 1.7, margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{j.description}</p>}
                            {j.requirements && (
                              <div style={{ marginTop: j.description ? 8 : 0 }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: '#0176D3', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Requirements</div>
                                <p style={{ color: '#374151', fontSize: 13, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{j.requirements}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {/* CTA */}
                      <div className="org-career-cta" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                        <button onClick={e => { e.stopPropagation(); setApplying(j); }}
                          style={{ background: 'linear-gradient(135deg,#0176D3,#014486)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 800, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {getCompanyCareerUrl(j.externalUrl) ? '🌐 Apply on Company Site →' : 'Apply Now →'}
                        </button>
                        {j.referralEnabled !== false && (
                          <button onClick={e => { e.stopPropagation(); setReferJob(j); }}
                            style={{ background: '#FEF3C7', border: '1px solid #F59E0B', color: '#92400E', borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            🤝 Refer{j.referralReward ? ` ₹${j.referralReward?.toLocaleString()}` : ' & Earn'}
                          </button>
                        )}
                        {getCompanyCareerUrl(j.externalUrl) && (
                          <span style={{ color: '#94a3b8', fontSize: '0.7rem', textAlign: 'right', maxWidth: 160, lineHeight: 1.4 }}>
                            We save your profile, then redirect you
                          </span>
                        )}
                        <span style={{ color: '#94A3B8', fontSize: 11 }}>{isOpen ? '▲ Hide' : '▼ Details'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Employee Reviews Widget ── */}
      {!embed && (
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>⭐ Employee Reviews</h3>
              {avgRating && <span style={{ fontSize: 13, color: '#6B7280' }}>{avgRating}/5 average from {reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>}
            </div>
            {!showReviewForm && !reviewDone && (
              <button onClick={() => setShowReviewForm(true)}
                style={{ background: '#0176D3', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Write a Review
              </button>
            )}
          </div>

          {showReviewForm && !reviewDone && (
            <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '20px 24px', marginBottom: 20, border: '1px solid #E5E7EB' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Share your experience</h4>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Rating</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setReviewForm(f => ({ ...f, rating: n }))}
                      style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', opacity: reviewForm.rating >= n ? 1 : 0.3 }}>⭐</button>
                  ))}
                </div>
              </div>
              {[
                { key: 'role',  label: 'Your Role / Position', placeholder: 'e.g. Software Engineer' },
                { key: 'title', label: 'Review Title', placeholder: 'Summary of your experience' },
                { key: 'pros',  label: 'What did you like? (Pros)', placeholder: 'Great culture, flexible hours…' },
                { key: 'cons',  label: 'What could be better? (Cons)', placeholder: 'Limited growth opportunities…' },
              ].map(({ key, label, placeholder }) => (
                <div key={key} style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 3 }}>{label}</label>
                  {key === 'pros' || key === 'cons' ? (
                    <textarea rows={2} style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: 12, boxSizing: 'border-box', resize: 'vertical' }}
                      value={reviewForm[key]} onChange={e => setReviewForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
                  ) : (
                    <input style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: 12, boxSizing: 'border-box' }}
                      value={reviewForm[key]} onChange={e => setReviewForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
                  )}
                </div>
              ))}
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={reviewForm.isAnonymous} onChange={e => setReviewForm(f => ({ ...f, isAnonymous: e.target.checked }))} />
                Post anonymously
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowReviewForm(false)} style={{ background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                <button disabled={reviewSubmitting} style={{ background: '#0176D3', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  onClick={async () => {
                    setReviewSubmitting(true);
                    try {
                      const r = await api.submitReview(orgSlug, reviewForm);
                      if (r?.success) { setReviewDone(true); setShowReviewForm(false); }
                    } catch {}
                    setReviewSubmitting(false);
                  }}>
                  {reviewSubmitting ? 'Submitting…' : 'Submit Review'}
                </button>
              </div>
            </div>
          )}

          {reviewDone && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '14px 18px', marginBottom: 16, fontSize: 13, color: '#166534' }}>
              ✅ Thank you! Your review has been submitted for approval.
            </div>
          )}

          {reviews.length === 0 && !showReviewForm ? (
            <p style={{ color: '#9CA3AF', fontSize: 13 }}>No reviews yet. Be the first to share your experience!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reviews.map((r, i) => (
                <div key={r._id || i} style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', border: '1px solid #E5E7EB', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>{'⭐'.repeat(r.rating)}</span>
                    {r.title && <span style={{ fontWeight: 700, fontSize: 13 }}>{r.title}</span>}
                  </div>
                  {r.role && <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>{r.reviewerName || 'Anonymous'} · {r.role}</div>}
                  {r.pros && <p style={{ fontSize: 12, color: '#374151', margin: '0 0 4px' }}><span style={{ color: '#16A34A', fontWeight: 700 }}>👍 </span>{r.pros}</p>}
                  {r.cons && <p style={{ fontSize: 12, color: '#374151', margin: 0 }}><span style={{ color: '#DC2626', fontWeight: 700 }}>👎 </span>{r.cons}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Full Marketing footer — only for TalentNest HR's own career page */}
      {isMainOrg && !embed && <MarketingFooter />}
    </div>
  );
}
