/**
 * JobDetailPage — /careers/job/:slug
 *
 * Dedicated page for each job posting. Serves as the canonical URL for:
 *  - Google for Jobs rich results
 *  - NaukriBot, IndeedBot, LinkedInBot
 *  - Social sharing (og:title, og:description)
 *
 * Fetches the job from GET /api/jobs/public?slug={slug} (no auth).
 * If job has externalUrl, shows a redirect notice after applying.
 */
import { useEffect, useState, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/api.js';
import MarketingNav from '../marketing/MarketingNav.jsx';
import MarketingFooter from '../marketing/MarketingFooter.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { useMarketingTheme } from '../../context/MarketingThemeContext.jsx';
import { btnP, btnG } from '../../constants/styles.js';
import Modal from '../../components/ui/Modal.jsx';

const ApplyModal = lazy(() => import('../careers/CareersPage.jsx').then(m => ({ default: m.ApplyModal || (() => null) })));

const SITEURL = 'https://www.talentnesthr.com';
const ff = "'Plus Jakarta Sans','Segoe UI',sans-serif";

function fmtSalary(min, max, currency = 'INR') {
  if (!min && !max) return null;
  const fmt = n => n >= 100000 ? `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L` : `₹${(n / 1000).toFixed(0)}K`;
  return min && max ? `${fmt(min)} – ${fmt(max)}` : min ? `From ${fmt(min)}` : `Up to ${fmt(max)}`;
}

export default function JobDetailPage() {
  const { slug }       = useParams();
  const navigate       = useNavigate();
  const { theme }      = useMarketingTheme();
  const [job, setJob]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [searchParams] = useSearchParams();
  const [applying, setApplying] = useState(false);
  const explicitOrg = searchParams.get('org');
  const [isLoggedIn] = useState(!!sessionStorage.getItem('tn_token'));

  useEffect(() => {
    if (!document.getElementById('marketing-css')) {
      const link = document.createElement('link');
      link.id = 'marketing-css'; link.rel = 'stylesheet'; link.href = '/marketing.css';
      document.head.appendChild(link);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    // Fetch by careerPageSlug
    api.getPublicJobs(`slug=${encodeURIComponent(slug)}&limit=1`)
      .then(res => {
        const arr = Array.isArray(res) ? res : (res?.data || []);
        if (arr.length === 0) { setError('Job not found or has been filled.'); return; }
        const j = arr[0];
        setJob(j);

        // ── Set page meta ──────────────────────────────────────────────
        document.title = `${j.title} — ${j.location || 'India'} | TalentNest HR`;

        // Inject/update Open Graph & canonical tags dynamically
        const setMeta = (name, content, prop = false) => {
          const sel = prop ? `meta[property="${name}"]` : `meta[name="${name}"]`;
          let el = document.head.querySelector(sel);
          if (!el) {
            el = document.createElement('meta');
            if (prop) el.setAttribute('property', name);
            else el.setAttribute('name', name);
            document.head.appendChild(el);
          }
          el.setAttribute('content', content);
        };
        const canonical = `${SITEURL}/careers/job/${slug}`;
        const desc = `${j.title} opening at ${explicitOrg || 'TalentNest HR'} in ${j.location || 'India'}. ${j.description ? j.description.slice(0, 120).replace(/\n/g, ' ') + '…' : ''}`;

        setMeta('description', desc);
        setMeta('og:title',       `${j.title} — ${j.location} | TalentNest HR`, true);
        setMeta('og:description', desc, true);
        setMeta('og:url',         canonical, true);
        setMeta('og:type',        'website', true);

        // Canonical link
        let canonEl = document.head.querySelector('link[rel="canonical"]');
        if (!canonEl) { canonEl = document.createElement('link'); canonEl.rel = 'canonical'; document.head.appendChild(canonEl); }
        canonEl.href = canonical;

        // ── JSON-LD JobPosting schema for Google for Jobs ──────────────
        const existingLd = document.getElementById('job-detail-ld');
        if (existingLd) existingLd.remove();
        const parts = (j.location || '').split(',').map(s => s.trim());
        const mapType = t => {
          const s = (t || '').toLowerCase();
          if (s.includes('part')) return 'PART_TIME';
          if (s.includes('contract') || s.includes('c2c')) return 'CONTRACTOR';
          if (s.includes('intern')) return 'INTERN';
          return 'FULL_TIME';
        };
        const ld = {
          '@context': 'https://schema.org',
          '@type': 'JobPosting',
          title: j.title,
          description: j.description || `${j.title} opening at ${isLoggedIn ? (j.company || 'TalentNest HR') : (explicitOrg || 'TalentNest HR')} in ${j.location || 'India'}.`,
          datePosted: j.createdAt || new Date().toISOString(),
          validThrough: new Date(Date.now() + 60 * 86400000).toISOString(),
          employmentType: mapType(j.jobType),
          hiringOrganization: {
            '@type': 'Organization',
            name: isLoggedIn ? (j.company || 'TalentNest HR') : (explicitOrg || 'TalentNest HR'),
            sameAs: SITEURL,
          },
          jobLocation: {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              addressLocality: parts[0] || 'India',
              addressRegion:   parts[1] || '',
              addressCountry:  'IN',
            },
          },
          identifier: {
            '@type': 'PropertyValue',
            name: isLoggedIn ? (j.company || 'TalentNest HR') : (explicitOrg || 'TalentNest HR'),
            value: slug,
          },
          url: canonical,
          directApply: !j.externalUrl,
          ...(j.salaryMin || j.salaryMax ? {
            baseSalary: {
              '@type': 'MonetaryAmount',
              currency: j.salaryCurrency || 'INR',
              value: {
                '@type': 'QuantitativeValue',
                unitText: 'YEAR',
                ...(j.salaryMin ? { minValue: j.salaryMin } : {}),
                ...(j.salaryMax ? { maxValue: j.salaryMax } : {}),
              },
            },
          } : {}),
          ...(j.skills?.length ? { skills: Array.isArray(j.skills) ? j.skills.join(', ') : j.skills } : {}),
          ...(j.experience    ? { experienceRequirements: j.experience } : {}),
          ...(j.workMode === 'Remote' ? { jobLocationType: 'TELECOMMUTE' } : {}),
        };
        const ldScript = document.createElement('script');
        ldScript.id = 'job-detail-ld';
        ldScript.type = 'application/ld+json';
        ldScript.textContent = JSON.stringify(ld);
        document.head.appendChild(ldScript);
      })
      .catch(() => setError('Could not load job details. Please try again.'))
      .finally(() => setLoading(false));

    return () => {
      // Clean up injected LD on unmount
      const el = document.getElementById('job-detail-ld');
      if (el) el.remove();
    };
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div style={{ fontFamily: ff, minHeight: '100vh', background: 'var(--mkt-section-bg,#F8FAFC)' }}>
      <MarketingNav active="careers" />
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spinner size={40} />
      </div>
    </div>
  );

  if (error || !job) return (
    <div style={{ fontFamily: ff, minHeight: '100vh', background: 'var(--mkt-section-bg,#F8FAFC)' }}>
      <MarketingNav active="careers" />
      <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>😕</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A1628', marginBottom: 12 }}>Job Not Available</h1>
        <p style={{ color: '#64748B', marginBottom: 24, lineHeight: 1.6 }}>
          {error || 'This job has been filled or removed. Browse our other open positions.'}
        </p>
        <Link to="/careers" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#0176D3,#00C2CB)', color: '#fff', padding: '12px 28px', borderRadius: 12, fontWeight: 700, textDecoration: 'none' }}>
          Browse All Jobs →
        </Link>
      </div>
      <MarketingFooter />
    </div>
  );

  const salary = fmtSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const skills = Array.isArray(job.skills) ? job.skills : (job.skills ? String(job.skills).split(',').map(s => s.trim()) : []);

  return (
    <div style={{ fontFamily: ff, background: 'var(--mkt-section-bg,#F8FAFC)', minHeight: '100vh' }}>
      <MarketingNav active="careers" />

      {/* Hero */}
      <div style={{ background: 'linear-gradient(160deg,#020817,#012456)', padding: 'clamp(80px,10vw,120px) clamp(16px,5vw,60px) clamp(40px,6vw,64px)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px,transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 860, margin: '0 auto', position: 'relative' }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            <Link to="/" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Home</Link>
            <span>/</span>
            <Link to="/careers" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Jobs</Link>
            <span>/</span>
            <span style={{ color: 'rgba(255,255,255,0.85)' }}>{job.title}</span>
          </div>

          <h1 style={{ fontSize: 'clamp(24px,4.5vw,42px)', fontWeight: 900, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            {job.title}
          </h1>

          {/* Meta row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginBottom: 28, alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: 600 }}>🏢 {isLoggedIn ? (job.company || 'TalentNest HR') : (explicitOrg || 'TalentNest HR')}</span>
            {job.jobType && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>💼 {job.jobType}</span>}
            {job.workMode && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>🏠 {job.workMode}</span>}
            {job.experience && <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>⏱ {job.experience}</span>}
            {salary && <span style={{ color: '#00C2CB', fontSize: 14, fontWeight: 700 }}>💰 {salary} p.a.</span>}
          </div>

          {/* Skills */}
          {skills.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
              {skills.map(sk => (
                <span key={sk} style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', padding: '4px 12px', borderRadius: 50, fontSize: 12, fontWeight: 600 }}>{sk}</span>
              ))}
            </div>
          )}

          {/* CTA */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {job.externalUrl ? (
              <a href={job.externalUrl} target="_blank" rel="noopener noreferrer"
                style={{ background: 'linear-gradient(135deg,#0176D3,#00C2CB)', color: '#fff', padding: '13px 28px', borderRadius: 12, fontWeight: 800, fontSize: 15, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                🚀 Apply on Company Site →
              </a>
            ) : (
              <button onClick={() => setApplying(true)}
                style={{ background: 'linear-gradient(135deg,#0176D3,#00C2CB)', color: '#fff', border: 'none', padding: '13px 28px', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
                🚀 Apply Now →
              </button>
            )}
            <Link to="/careers" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.2)', padding: '13px 20px', borderRadius: 12, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
              ← All Jobs
            </Link>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(32px,5vw,56px) clamp(16px,5vw,24px)', display: 'grid', gridTemplateColumns: '1fr clamp(200px,28%,280px)', gap: 32, alignItems: 'start' }}>

        {/* Left: description */}
        <div style={{ minWidth: 0 }}>
          {job.description && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 'clamp(20px,4vw,32px)', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0A1628', margin: '0 0 14px' }}>About the Role</h2>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>{job.description}</p>
            </div>
          )}

          {job.requirements && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 'clamp(20px,4vw,32px)', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0A1628', margin: '0 0 14px' }}>Requirements</h2>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>{job.requirements}</p>
            </div>
          )}

          {job.benefits && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 'clamp(20px,4vw,32px)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0A1628', margin: '0 0 14px' }}>Benefits</h2>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.75, margin: 0 }}>{job.benefits}</p>
            </div>
          )}
        </div>

        {/* Right: sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick apply */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 10, lineHeight: 1.5 }}>
              Interested in this role?
            </div>
            {job.externalUrl ? (
              <a href={job.externalUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', width: '100%', boxSizing: 'border-box', background: 'linear-gradient(135deg,#0176D3,#00C2CB)', color: '#fff', padding: '12px', borderRadius: 10, fontWeight: 800, fontSize: 14, textDecoration: 'none', textAlign: 'center' }}>
                Apply on Company Site →
              </a>
            ) : (
              <button onClick={() => setApplying(true)}
                style={{ width: '100%', background: 'linear-gradient(135deg,#0176D3,#00C2CB)', color: '#fff', border: 'none', padding: '12px', borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                Apply Now →
              </button>
            )}
          </div>

          {/* Job details */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 14px' }}>Job Details</h3>
            {[
              ['Company',     isLoggedIn ? (job.company || 'TalentNest HR') : (explicitOrg || 'TalentNest HR')],
              ['Location',    job.location],
              ['Job Type',    job.jobType],
              ['Work Mode',   job.workMode],
              ['Experience',  job.experience],
              ['Department',  job.department],
              ['Salary',      salary],
              ['Openings',    job.numberOfOpenings],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
                <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 12, color: '#0A1628', fontWeight: 700, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
              </div>
            ))}
          </div>

          <Link to="/careers" style={{ display: 'block', textAlign: 'center', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '11px 16px', color: '#0176D3', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            ← View All Jobs
          </Link>
        </div>
      </div>

      {/* Apply modal */}
      {applying && !job.externalUrl && (
        <Modal
          title="Apply for Job"
          onClose={() => setApplying(false)}
          footer={
            <Link 
              to={`/careers?job=${job.id || job._id}`}
              style={{ 
                ...btnP,
                width: '100%',
                justifyContent: 'center',
                textDecoration: 'none',
                minHeight: 48
              }}
            >
              🚀 Continue to Full Application →
            </Link>
          }
        >
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ background: 'rgba(1,118,211,0.06)', padding: '20px', borderRadius: 20, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 18, border: '1px solid rgba(255,255,255,0.1)' }}>
                  {(isLoggedIn ? (job.company || 'T') : (explicitOrg || 'T')).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 style={{ fontSize: 'clamp(20px, 4vw, 32px)', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.03em' }}>{job.title}</h1>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 6, color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 500 }}>
                    <span>🏢 {isLoggedIn ? (job.company || 'TalentNest HR') : (explicitOrg || 'TalentNest HR')}</span>
                    <span>📍 {job.location || 'India'}</span>
                    <span>⏱ {job.jobType || 'Full-time'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <p style={{ color: '#374151', fontSize: 15, lineHeight: 1.6, marginBottom: 12 }}>
              To ensure the best matching for this role, please complete our structured application form.
            </p>
            <p style={{ color: '#64748B', fontSize: 13 }}>
              You'll be able to pre-fill your details if you've applied before.
            </p>
          </div>
        </Modal>
      )}

      <MarketingFooter />
    </div>
  );
}
