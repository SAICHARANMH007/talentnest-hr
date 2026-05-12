import React, { useState, useEffect, useCallback, Component } from 'react';
import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { api } from '../../api/api.js';
import Spinner from '../../components/ui/Spinner.jsx';
import Toast from '../../components/ui/Toast.jsx';
import MarketingFooter from '../marketing/MarketingFooter.jsx';
import Field from '../../components/ui/Field.jsx';
import Modal from '../../components/ui/Modal.jsx';
import MarketingNav from '../marketing/MarketingNav.jsx';
import { requestGeolocation } from '../../utils/geolocation.js';
import PublicApplyModal from '../../components/modals/PublicApplyModal.jsx';
import { getCompanyCareerUrl } from '../../utils/url.js';

const TYPE_COLOR = { High: '#BA0517', Medium: '#F59E0B', Low: '#10b981' };

class CareersErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err, info) { console.error('Careers page error:', err, info); }
  render() {
    if (this.state.hasError) return (
      <div style={{ textAlign: 'center', padding: '80px 20px', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <h2 style={{ color: '#0A1628', fontWeight: 700 }}>Something went wrong loading jobs.</h2>
        <p style={{ color: '#64748B', marginBottom: 24 }}>Please refresh the page or try again later.</p>
        <button onClick={() => window.location.reload()} style={{ background: '#0176D3', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Reload Page
        </button>
      </div>
    );
    return this.props.children;
  }
}

// ── Job Share Bar — rendered at the bottom of every job card ─────────────────
function JobShareBar({ job }) {
  const [copied, setCopied] = React.useState(false);
  const jid     = job._id || job.id;
  const slug    = job.seoSlug || job.careerPageSlug || jid;
  const jobUrl  = `${window.location.origin}/careers/job/${slug}`;
  const displayCompany = (!!sessionStorage.getItem('tn_token')) ? (job.company || 'TalentNest HR') : 'TalentNest HR';
  const title   = `${job.title} @ ${displayCompany}`;
  const loc     = job.location ? ` · ${job.location}` : '';
  const waText  = encodeURIComponent(`🚀 Job Opening: ${title}${loc}\n\n${jobUrl}`);
  const liUrl   = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(jobUrl)}`;
  const twUrl   = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`🚀 Hiring: ${title}\n👉 Apply: ${jobUrl}\n#Hiring #Jobs`)}`;

  const copyLink = () => {
    navigator.clipboard.writeText(jobUrl)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => {});
  };

  const shareNative = () => {
    if (navigator.share) {
      navigator.share({ title, text: `Job Opening: ${title}`, url: jobUrl }).catch(() => {});
    }
  };

  return (
    <div style={{
      borderTop: '2px solid #EEF2FF',
      padding: '12px 28px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
      background: 'linear-gradient(135deg,#F8FAFF,#EEF2FF)',
    }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: '#6366F1', letterSpacing: '0.3px', flexShrink: 0 }}>🔗 Share this job:</span>
      <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 20, background: '#25D366', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
        💬 WhatsApp
      </a>
      <a href={liUrl} target="_blank" rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 20, background: '#0A66C2', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
        💼 LinkedIn
      </a>
      <a href={twUrl} target="_blank" rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 20, background: '#1DA1F2', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
        🐦 Twitter
      </a>
      <button onClick={copyLink}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 20, background: copied ? '#10B981' : '#6366F1', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', flexShrink: 0, transition: 'background 0.2s' }}>
        {copied ? '✓ Copied!' : '🔗 Copy Link'}
      </button>
      {typeof navigator.share === 'function' && (
        <button onClick={shareNative}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 20, background: '#F59E0B', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', flexShrink: 0 }}>
          ↗ More
        </button>
      )}
    </div>
  );
}

export default function CareersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { companySlug } = useParams();
  const [brand, setBrand] = useState(null); // { name, logoUrl, brandColor }
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const initialCompanyFilter = searchParams.get('company') || '';
  const initialSearch = searchParams.get('search') || '';
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isLoggedIn, setIsLoggedIn] = useState(!!sessionStorage.getItem('tn_token'));
  
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  
  const [search, setSearch] = useState(initialCompanyFilter || initialSearch || '');
  const [debouncedSearch, setDebouncedSearch] = useState(initialCompanyFilter || initialSearch || '');
  const [urgencyFilter, setUrgencyFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [applying, setApplying] = useState(null);
  const [totalJobs, setTotalJobs] = useState(0);
  const [stats, setStats] = useState({ urgent: 0, companies: 0 });
  const [toast, setToast] = useState('');
  const [viewingJob, setViewingJob] = useState(null); // job whose JSON-LD is injected
  const [sharedJob, setSharedJob] = useState(null); // job featured at top when coming from a shared link
  const [sharePopover, setSharePopover] = useState(null); // job id whose share popover is open
  const [expanded, setExpanded] = useState(null); // id of job whose details are expanded

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [urgencyFilter, locationFilter]);

  // Phase 3 — Google for Jobs JSON-LD: inject/remove on active job view
  useEffect(() => {
    const id = 'tn-job-schema';
    let el = document.getElementById(id);
    if (viewingJob && viewingJob.status === 'active') {
      if (!el) { el = document.createElement('script'); el.id = id; el.type = 'application/ld+json'; document.head.appendChild(el); }
      const company  = viewingJob.companyName || viewingJob.company || 'TalentNest Partner';
      const parts    = (viewingJob.location || '').split(',').map(s => s.trim());
      const siteUrl  = 'https://www.talentnesthr.com';
      const slug     = viewingJob.careerPageSlug || viewingJob._id || viewingJob.id;
      const mapType  = t => { const s=(t||'').toLowerCase(); if(s.includes('part')) return 'PART_TIME'; if(s.includes('contract')||s.includes('c2c')) return 'CONTRACTOR'; if(s.includes('intern')) return 'INTERN'; return 'FULL_TIME'; };
      const schema   = {
        '@context': 'https://schema.org/', '@type': 'JobPosting',
        title: viewingJob.title, datePosted: new Date(viewingJob.createdAt).toISOString(),
        description: (viewingJob.description||'') + (viewingJob.requirements ? '\n\nRequirements:\n'+viewingJob.requirements : ''),
        employmentType: mapType(viewingJob.jobType),
        hiringOrganization: { '@type': 'Organization', name: company },
        jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: parts[0]||'', addressRegion: parts[1]||'', addressCountry: 'IN' } },
        identifier: { '@type': 'PropertyValue', name: company, value: String(viewingJob._id||viewingJob.id||'') },
        url: `${siteUrl}/careers/job/${slug}`,
        ...(viewingJob.salaryMin ? { baseSalary: { '@type':'MonetaryAmount', currency:'INR', value: { '@type':'QuantitativeValue', minValue: viewingJob.salaryMin, ...(viewingJob.salaryMax ? {maxValue: viewingJob.salaryMax} : {}), unitText:'YEAR' } } } : {}),
        ...(viewingJob.skills?.length ? { skills: Array.isArray(viewingJob.skills) ? viewingJob.skills.join(', ') : viewingJob.skills } : {}),
        ...(viewingJob.experience ? { experienceRequirements: viewingJob.experience } : {}),
      };
      el.textContent = JSON.stringify(schema);
    } else if (el) {
      el.remove();
    }
    return () => { const s = document.getElementById(id); if (s) s.remove(); };
  }, [viewingJob]);

  useEffect(() => {
    if (!document.getElementById('marketing-css')) {
      const link = document.createElement('link');
      link.id = 'marketing-css'; link.rel = 'stylesheet'; link.href = '/marketing.css';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    // Load brand if company slug present
    if (companySlug) {
      fetch(`/api/orgs/brand/${companySlug}`)
        .then(r => r.json())
        .then(r => { if (r.success) setBrand(r.data); })
        .catch(() => {});
    }
  }, [companySlug]);

  useEffect(() => {
    let active = true;
    if (page === 1) setLoading(true);
    else setLoadingMore(true);

    const params = new URLSearchParams();
    if (companySlug) params.append('slug', companySlug);
    if (debouncedSearch) params.append('search', debouncedSearch);
    if (urgencyFilter !== 'All') params.append('urgency', urgencyFilter);
    if (locationFilter !== 'All') params.append('location', locationFilter);
    params.append('page', page);
    params.append('limit', 20);

    api.getPublicJobs('?' + params.toString())
      .then(res => {
        if (!active) return;
        let arr = Array.isArray(res) ? res : (res?.data || []);
        
        // ── Dynamic Shuffling — makes the board look "live" and fresh on every refresh ──
        if (page === 1 && !debouncedSearch && urgencyFilter === 'All' && locationFilter === 'All') {
          arr = [...arr].sort(() => Math.random() - 0.5);
        }

        setJobs(prev => page === 1 ? arr : [...prev, ...arr]);
        setTotalJobs(res?.pagination?.total || (page === 1 ? arr.length : totalJobs));
        if (res?.stats) setStats(res.stats);
        setHasMore(res?.pagination?.hasNext || arr.length === 20);

        // ── Inject JSON-LD for Googlebot's JS indexer ──────────────────────
        if (page === 1) {
          document.querySelectorAll('script[data-tn-job-ld]').forEach(el => el.remove());
          const BASE = window.location.origin;
          arr.slice(0, 50).forEach(j => {
            const company = j.companyName || j.company || 'TalentNest HR';
            const remote  = (j.location || '').toLowerCase().includes('remote');
            const ld = {
              '@context': 'https://schema.org',
              '@type':    'JobPosting',
              title:       j.title,
              description: j.description || `${j.title} opening at ${company}.`,
              datePosted:  j.createdAt || new Date().toISOString(),
              validThrough: new Date(Date.now() + 60 * 864e5).toISOString(),
              hiringOrganization: { '@type': 'Organization', name: company, sameAs: BASE },
              employmentType: 'FULL_TIME',
              jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: j.location || 'India', addressCountry: 'IN' } },
              url: j.canonicalUrl || `${BASE}/careers/job/${j.seoSlug || j._id || j.id}`,
              directApply: true,
              ...(remote ? { jobLocationType: 'TELECOMMUTE' } : {}),
              ...(j.skills?.length ? { skills: j.skills.join(', ') } : {}),
              ...(j.salaryMin || j.salaryMax ? { baseSalary: { '@type': 'MonetaryAmount', currency: j.salaryCurrency || 'INR', value: { '@type': 'QuantitativeValue', unitText: 'YEAR', ...(j.salaryMin ? { minValue: j.salaryMin } : {}), ...(j.salaryMax ? { maxValue: j.salaryMax } : {}) } } } : {}),
            };
            const tag = document.createElement('script');
            tag.type = 'application/ld+json';
            tag.setAttribute('data-tn-job-ld', j._id || j.id);
            tag.textContent = JSON.stringify(ld);
            document.head.appendChild(tag);
          });

          // Auto-highlight + open job from shared/invite link (?job=<id>)
          const jobParam = searchParams.get('job');
          if (jobParam) {
            const found = arr.find(j => String(j._id || j.id) === jobParam || String(j.id) === jobParam);
            if (found) {
              setSharedJob(found);
              setApplying(found);
            } else {
              // Job not in current page — fetch it directly from public API
              api.getPublicJobById(jobParam)
                .then(r => {
                  const sj = r?.data || r;
                  if (sj && (sj._id || sj.id)) {
                    const normalized = { ...sj, id: sj.id || sj._id?.toString() };
                    setSharedJob(normalized);
                    setApplying(normalized);
                  }
                })
                .catch(() => {});
            }
          }
        }
      })
      .catch(() => {
        if (active) setToast('❌ Could not load jobs.');
      })
      .finally(() => {
        if (active) { setLoading(false); setLoadingMore(false); }
      });
  }, [companySlug, debouncedSearch, urgencyFilter, locationFilter, page, searchParams]);

  const baseLocs = ['Delhi NCR', 'Bangalore', 'Mumbai', 'Kolkata', 'Hyderabad', 'Pune', 'Chennai', 'Noida', 'Gurgaon', 'Ahmedabad', 'Bhubaneswar', 'Kochi', 'Remote', 'Hybrid'];
  const fetchedLocs = jobs.map(j => j.location).filter(Boolean);
  const locations = ['All', ...new Set([...baseLocs, ...fetchedLocs])];

  const filtered = jobs;

  // ── Share a job (Web Share API on mobile, fallback to platform links) ────────
  const shareJob = async (j) => {
    const jid  = j.id || j._id;
    const slug = j.seoSlug || j.careerPageSlug || jid;
    const jobUrl = `${window.location.origin}/careers/job/${slug}`;
    const title = `${j.title}${j.company ? ` @ ${j.company}` : ''}`;
    const text  = `🚀 Job Opening: ${title}${j.location ? ` · ${j.location}` : ''}`;

    // Use native Web Share API (mobile shows WhatsApp, Instagram, etc. automatically)
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: jobUrl });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return; // user cancelled
      }
    }

    // Desktop fallback — open WhatsApp Web
    const waText = encodeURIComponent(`${text}\n\n${jobUrl}`);
    window.open(`https://wa.me/?text=${waText}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", minHeight: '100vh', background: '#F7F8FC' }}>
      <Toast msg={toast} onClose={() => setToast('')} />
      <MarketingNav active="careers" />

      {/* Brand header strip for company-specific pages */}
      {brand && (
        <div style={{ background: brand.brandColor || '#0176D3', padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          {brand.logoUrl && <img src={brand.logoUrl} alt={brand.name} style={{ height: 36, objectFit: 'contain', borderRadius: 6, background: '#fff', padding: '2px 6px' }} />}
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{brand.name} — Open Positions</span>
        </div>
      )}

      {/* ── HERO ── */}
      <section style={{
        backgroundImage: "linear-gradient(rgba(10,22,40,0.92), rgba(10,22,40,0.88)), url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&auto=format&fit=crop&q=85')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        paddingTop: brand ? 100 : 130,
        paddingBottom: 80,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Dot grid overlay */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(0,194,203,0.08) 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 80%, rgba(1,118,211,0.18) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div className="tn-container" style={{ position: 'relative' }}>
          <div className="tn-responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
            {/* LEFT — text */}
            <div className="tn-mobile-center" style={{ textAlign: 'left' }}>
              <span className="tn-label">TalentNest HR — The Global Job Board</span>
              <h1 className="tn-mobile-center" style={{ color: '#ffffff', fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 900, margin: '16px 0 20px', lineHeight: 1.1 }}>
                Find Your{' '}
                <span style={{ background: 'linear-gradient(135deg,#0176D3,#00C2CB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Next Career
                </span>
              </h1>
              <p className="tn-mobile-center" style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1.05rem', maxWidth: 480, margin: '0 0 36px', lineHeight: 1.7 }}>
                Discover hand-picked opportunities across IT, cybersecurity, finance and more. TalentNest connects top candidates with world-class companies.
              </p>

              {/* Large search bar */}
              <div style={{ position: 'relative', marginBottom: 36 }}>
                <span style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1.1rem' }}>🔍</span>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search roles, skills, companies…"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '16px 20px 16px 50px', border: 'none', borderRadius: 12, fontSize: '1rem', color: '#0A1628', outline: 'none', background: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
                />
              </div>

              {/* Stats */}
              <div className="tn-mobile-center-flex" style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                {[
                  { icon: '💼', num: totalJobs, label: 'Open Roles' },
                  { icon: '⚡', num: stats.urgent || (Array.isArray(jobs) ? jobs : []).filter(j => j.urgency === 'High').length, label: 'Urgent Hiring' },
                  { icon: '🏢', num: stats.companies || new Set((Array.isArray(jobs) ? jobs : []).map(j => j.company)).size, label: 'Companies' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#00C2CB' }}>{s.num}</div>
                    <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', marginTop: 2 }}>{s.icon} {s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — floating job cards mockup (desktop only) */}
            <div className="tn-desktop" style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 360 }}>
                {/* Glow */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 300, height: 300, background: 'radial-gradient(circle,rgba(1,118,211,0.2),transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
                {(jobs.length > 0 ? jobs.slice(0, 4) : [
                  { title: 'Senior React Developer', company: 'FinTech Corp', location: 'Hyderabad', urgency: 'High', color: '#BA0517', icon: '💻', salary: '₹18–25 LPA' },
                  { title: 'Cybersecurity Analyst', company: 'SecureNet Ltd', location: 'Bangalore', urgency: 'High', color: '#0176D3', icon: '🔐', salary: '₹12–18 LPA' },
                  { title: 'DevOps Engineer', company: 'CloudScale Inc', location: 'Remote', urgency: 'Medium', color: '#10B981', icon: '⚙️', salary: '₹15–22 LPA' },
                  { title: 'Data Scientist', company: 'Analytics Hub', location: 'Mumbai', urgency: 'Medium', color: '#F5A623', icon: '📊', salary: '₹20–30 LPA' },
                ]).map((job, idx) => (
                  <div
                    key={job.title + idx}
                    style={{
                      position: 'relative',
                      background: 'rgba(15,31,53,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 14,
                      padding: '14px 18px',
                      marginBottom: 12,
                      backdropFilter: 'blur(16px)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                      animation: `tn-float ${5 + idx}s ease-in-out infinite`,
                      animationDelay: `${idx * 0.5}s`,
                      borderLeft: `3px solid ${job.color || (idx % 2 === 0 ? '#0176D3' : '#10B981')}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: `${job.color || '#0176D3'}20`, border: `1px solid ${job.color || '#0176D3'}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                        {job.icon || '💼'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: 'white', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</div>
                        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 1 }}>{isLoggedIn ? (job.company || job.companyName) : 'TalentNest HR'} · {job.location || 'India'}</div>
                      </div>
                      <span style={{ background: `${(job.urgency === 'High' ? '#BA0517' : (job.urgency === 'Medium' ? '#F59E0B' : '#10b981'))}22`, color: (job.urgency === 'High' ? '#BA0517' : (job.urgency === 'Medium' ? '#F59E0B' : '#10b981')), fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 100, flexShrink: 0 }}>{job.urgency || 'New'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#00C2CB', fontSize: 11, fontWeight: 700 }}>{job.salary || (job.salaryMin ? `₹${job.salaryMin} LPA+` : 'Best in Industry')}</span>
                      <span style={{ background: 'rgba(1,118,211,0.15)', color: '#60a5fa', fontSize: 9, fontWeight: 600, padding: '3px 10px', borderRadius: 6 }}>View Details →</span>
                    </div>
                  </div>
                ))}
                {/* Floating badge */}
                <div style={{ position: 'absolute', top: -20, right: -20, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: '8px 14px', backdropFilter: 'blur(12px)' }}>
                  <div style={{ color: '#10B981', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 2 }}>● LIVE</div>
                  <div style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>48hr Response</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FILTER BAR ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: isMobile ? '12px 0' : '16px 0', position: 'sticky', top: isMobile ? 66 : 66, zIndex: 90, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', transition: 'all 0.2s' }}>
        <div className="tn-container">
          <div style={{ display: 'flex', gap: isMobile ? 10 : 12, flexWrap: isMobile ? 'nowrap' : 'wrap', alignItems: 'center', overflowX: isMobile ? 'auto' : 'visible', paddingBottom: isMobile ? 6 : 0, WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {/* Urgency filter pills */}
            {['All', 'High', 'Medium', 'Low'].map(u => {
              const active = urgencyFilter === u;
              const color = u === 'High' ? '#BA0517' : u === 'Medium' ? '#F59E0B' : u === 'Low' ? '#10B981' : '#0176D3';
              return (
                <button 
                  key={u} 
                  onClick={() => setUrgencyFilter(u)} 
                  style={{ 
                    padding: '8px 20px', 
                    borderRadius: 100, 
                    border: '1px solid', 
                    borderColor: active ? color : '#E2E8F0', 
                    background: active ? color : '#F8FAFF', 
                    color: active ? '#fff' : '#475569', 
                    fontWeight: 700, 
                    fontSize: 13, 
                    cursor: 'pointer', 
                    transition: 'all 0.2s ease', 
                    whiteSpace: 'nowrap',
                    boxShadow: active ? `0 4px 12px ${color}33` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {u === 'All' ? 'All Priority' : <><span style={{ fontSize: 14 }}>{u === 'High' ? '🔥' : u === 'Medium' ? '⚡' : '🌱'}</span> {u}</>}
                </button>
              );
            })}
            <select
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
              style={{ padding: '8px 16px', border: '1px solid #E2E8F0', borderRadius: 100, fontSize: 13, fontWeight: 600, color: '#475569', background: '#fff', outline: 'none', cursor: 'pointer', minWidth: 140, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            >
              {(Array.isArray(locations) ? locations : []).map(l => <option key={l} value={l}>{l === 'All' ? '📍 All Locations' : l}</option>)}
            </select>
            <div style={{ marginLeft: isMobile ? 0 : 'auto', color: '#64748B', fontSize: 13, whiteSpace: 'nowrap', paddingRight: isMobile ? 12 : 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              <b style={{ color: '#1E293B' }}>{filtered.length}</b> positions found
            </div>
          </div>
        </div>
      </div>

      {/* ── JOB LISTINGS ── */}
      <section style={{ background: '#F7F8FC', padding: '40px 0 80px' }}>
        <div className="tn-container">
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 80 }}><Spinner /></div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 80 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <p style={{ color: '#64748B', fontSize: 15 }}>No jobs match your search. Try clearing the filters.</p>
                <button onClick={() => { setSearch(''); setUrgencyFilter('All'); setLocationFilter('All'); }} className="tn-btn tn-btn-primary" style={{ marginTop: 16 }}>
                  Clear Filters
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Featured shared job — shown at top when arriving from a shared link */}
                {sharedJob && !filtered.some(j => String(j.id || j._id) === String(sharedJob.id || sharedJob._id)) && (
                  <div style={{ background: 'linear-gradient(135deg,rgba(1,118,211,0.06),rgba(1,68,134,0.04))', borderRadius: 16, padding: '20px 24px', border: '2px solid rgba(1,118,211,0.3)', boxShadow: '0 4px 24px rgba(1,118,211,0.12)', marginBottom: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#0176D3', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      🔗 Shared Job
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: '#0A1628', marginBottom: 4 }}>{sharedJob.title}</div>
                    <div style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>🏢 {isLoggedIn ? sharedJob.company : 'TalentNest HR'}{sharedJob.location ? ` · 📍 ${sharedJob.location}` : ''}</div>
                    <button onClick={() => { setApplying(sharedJob); setViewingJob(sharedJob); }}
                      className="tn-btn tn-btn-primary" style={{ fontSize: 13, padding: '10px 22px' }}>
                      Apply Now →
                    </button>
                  </div>
                )}

                {(Array.isArray(filtered) ? filtered : []).map(j => (
                  <div
                    key={j.id}
                    style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', borderLeft: `4px solid ${TYPE_COLOR[j.urgency] || '#0176D3'}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', transition: 'all 0.22s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.06)'; }}
                  >
                    {(() => {
                      const isOpen = expanded === (j.id || j._id);
                      return (
                        <>
                    <div style={{ padding: '24px 28px', cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : (j.id || j._id))}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 260 }}>
                        {/* Badges */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                          <span style={{ background: `${TYPE_COLOR[j.urgency] || '#0176D3'}20`, color: TYPE_COLOR[j.urgency] || '#0176D3', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50, border: `1px solid ${TYPE_COLOR[j.urgency] || '#0176D3'}40` }}>
                            ⚡ {j.urgency} Priority
                          </span>
                          {(j.status === 'Open' || j.status === 'active') && (
                            <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50, border: '1px solid rgba(16,185,129,0.3)' }}>
                              ● Actively Hiring
                            </span>
                          )}
                          {j.externalUrl && (
                            <span style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50, border: '1px solid rgba(245,158,11,0.3)' }}>
                              🌐 External Opening
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#0176D3,#014486)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                            {(j.company || 'T').charAt(0).toUpperCase()}
                          </div>
                          {/* Crawlable link to the SSR canonical page for non-JS bots */}
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0A1628', margin: 0 }}>
                            <a href={j.canonicalUrl || `/careers/job/${j.seoSlug || j._id || j.id}`}
                               style={{ color: 'inherit', textDecoration: 'none' }}
                               aria-label={`View ${j.title} at ${isLoggedIn ? j.company : 'TalentNest HR'} job details`}>
                              {j.title}
                            </a>
                          </h3>
                        </div>

                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: '#64748B', fontSize: '0.85rem', marginBottom: 10 }}>
                          <span>🏢 {isLoggedIn ? j.company : 'TalentNest HR'}</span>
                          <span>📍 {j.location || 'Remote'}</span>
                          <span>🗓 {j.experience || 'Any'} exp</span>
                        </div>

                        {j.description && (
                          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: '0 0 12px', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: isOpen ? 'unset' : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{j.description}</p>
                        )}

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                          {(Array.isArray(j.skills) ? j.skills : (j.skills || '').split(',')).filter(Boolean).slice(0, 5).map(s => (
                            <span key={s} style={{ background: 'rgba(1,118,211,0.08)', color: '#0176D3', fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(1,118,211,0.15)' }}>
                              {s.trim()}
                            </span>
                          ))}
                        </div>

                        <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                          {(() => {
                            const d = j.createdAt || j.postedAt;
                            if (!d) return 'Posted recently';
                            const days = Math.floor((Date.now() - new Date(d)) / 86400000);
                            if (days < 1) return 'Posted today';
                            if (days < 7) return `Posted ${days} day${days > 1 ? 's' : ''} ago`;
                            if (days < 30) return `Posted ${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
                            return `Posted on ${new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
                          })()} · {j.applicantsCount || 0} applicants
                        </div>
                      </div>

                      {/* CTA */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', paddingTop: 4, flexShrink: 0 }}>
                        <button onClick={() => { const jj = { ...j, id: j._id || j.id }; setApplying(jj); setViewingJob(jj); }} className="tn-btn tn-btn-primary" style={{ whiteSpace: 'nowrap', fontSize: 13, padding: '10px 20px' }}>
                          {getCompanyCareerUrl(j.externalUrl) ? '🌐 Apply on Company Site →' : 'Apply Now →'}
                        </button>
                        {getCompanyCareerUrl(j.externalUrl) && (
                          <span style={{ color: '#94a3b8', fontSize: '0.7rem', textAlign: 'right', maxWidth: 160, lineHeight: 1.4 }}>
                            We save your profile, then redirect you
                          </span>
                        )}
                        <button onClick={() => navigate('/login')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F7F8FC', color: '#64748B', fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Sign In to Track
                        </button>
                        <span style={{ color: '#94a3b8', fontSize: 11 }}>{isOpen ? '▲ Hide' : '▼ Details'}</span>
                      </div>
                    </div>
                    </div>

                    {/* Expanded details */}
                    {isOpen && j.requirements && (
                      <div style={{ padding: '0 28px 20px', borderTop: '1px solid #F1F5F9' }}>
                        <div style={{ marginTop: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#0176D3', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Requirements</div>
                          <p style={{ color: '#374151', fontSize: 13, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{j.requirements}</p>
                        </div>
                      </div>
                    )}

                    {/* ── Share bar ── */}
                    <JobShareBar job={j} />
                    </>
                    );
                    })()}
                  </div>
                ))}

                {hasMore && (
                  <div style={{ textAlign: 'center', marginTop: 24, marginBottom: 24 }}>
                    <button 
                      onClick={() => setPage(p => p + 1)} 
                      disabled={loadingMore}
                      style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 50, padding: '12px 32px', color: '#0176D3', fontWeight: 700, fontSize: 14, cursor: loadingMore ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: loadingMore ? 0.7 : 1, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    >
                      {loadingMore ? 'Loading...' : 'Load More Jobs ↓'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: 'linear-gradient(135deg,#0176D3,#00C2CB)', padding: '80px 0', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', top: -200, left: -100, pointerEvents: 'none' }} />
        <div className="tn-container" style={{ position: 'relative' }}>
          <h2 style={{ color: '#ffffff', fontSize: 'clamp(1.8rem,4vw,2.5rem)', fontWeight: 900, marginBottom: 16 }}>Not Seeing the Right Role?</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 36, maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.7 }}>
            Submit your profile and we'll reach out the moment the perfect opportunity opens up.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/contact" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', color: '#0176D3', padding: '13px 28px', borderRadius: 8, fontWeight: 800, fontSize: 14, textDecoration: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>Send Your Profile →</Link>
            <button onClick={() => navigate('/login')} style={{ padding: '13px 28px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Sign In to HR Portal</button>
          </div>
        </div>
      </section>

      <MarketingFooter />

      {applying && <PublicApplyModal job={applying} onClose={() => setApplying(null)} />}

      {/* ── Crawler-visible content (noscript + paginated links) ────────────
           Bots that don't execute JS see this static HTML with real job links.
           NaukriBot, IndeedBot, Googlebot all follow these <a href> links.
           Users never see this section (visually hidden). ──────────────── */}
      <noscript>
        <section aria-label="Job listings for search engine crawlers" style={{ display: 'block' }}>
          <h2>Open Job Positions — TalentNest HR</h2>
          {jobs.slice(0, 100).map(j => (
            <article key={j.id || j._id}>
              <h3><a href={j.canonicalUrl || `/careers/job/${j.seoSlug || j._id || j.id}`}>{j.title}</a></h3>
              <p>{j.company || j.companyName} · {j.location} · {j.jobType}</p>
              {(j.createdAt) && <time dateTime={new Date(j.createdAt).toISOString()}>Posted {new Date(j.createdAt).toLocaleDateString('en-IN')}</time>}
              {j.description && <p>{j.description.slice(0, 200)}</p>}
            </article>
          ))}
        </section>
      </noscript>

      {/* Bot-followable paginated links — hidden from users, readable by all crawlers */}
      <div aria-hidden="true" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
        <nav aria-label="Job listing pages for crawlers">
          {Array.from({ length: Math.ceil(totalJobs / 20) }, (_, i) => i + 1).slice(0, 100).map(p => (
            <a key={p} href={`/careers?page=${p}`} rel={p > 1 ? 'next' : undefined}>Page {p}</a>
          ))}
        </nav>
        <div>
          {jobs.slice(0, 50).map(j => (
            <a key={j.id || j._id} href={j.canonicalUrl || `/careers/job/${j.seoSlug || j._id || j.id}`}>
              {j.title} — {j.company} — {j.location}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
