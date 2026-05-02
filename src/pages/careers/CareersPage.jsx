import React, { useState, useEffect, useCallback, Component } from 'react';
import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { api } from '../../api/api.js';
import Spinner from '../../components/ui/Spinner.jsx';
import Toast from '../../components/ui/Toast.jsx';
import MarketingFooter from '../marketing/MarketingFooter.jsx';
import Field from '../../components/ui/Field.jsx';
import Modal from '../../components/ui/Modal.jsx';
import MarketingNav from '../marketing/MarketingNav.jsx';

function ApplyModal({ job, onClose }) {
  // Pre-fill from sessionStorage if user is logged in
  const prefill = (() => {
    try {
      const u = sessionStorage.getItem('tn_user');
      if (u) { const parsed = JSON.parse(u); return { name: parsed.name || '', email: parsed.email || '' }; }
    } catch {}
    return { name: '', email: '' };
  })();

  const questions = job.screeningQuestions || [];
  const [form, setForm] = useState({ name: prefill.name, email: prefill.email, phone: '', coverLetter: '' });
  const [answers, setAnswers] = useState(() => Object.fromEntries(questions.map((_, i) => [i, ''])));
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const isPreFilled = !!(prefill.name || prefill.email);

  const submit = async () => {
    if (!form.name || !form.email) { setError('Name and email are required.'); return; }
    if (!form.phone?.trim()) { setError('Mobile number is required to apply.'); return; }
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (phoneDigits.length < 7) { setError('Please enter a valid mobile number.'); return; }
    // Validate required screening questions
    for (let i = 0; i < questions.length; i++) {
      if (questions[i].required && !answers[i]?.trim()) {
        setError(`Please answer: "${questions[i].question}"`);
        return;
      }
    }
    const screeningAnswers = questions.map((q, i) => ({ question: q.question, answer: answers[i] || '' }));
    setSubmitting(true);
    setError('');
    try {
      await api.applyPublic(job.id, { ...form, screeningAnswers });
      setDone(true);
      // External job: redirect to company's careers page after saving candidate data
      if (job.externalUrl) {
        setTimeout(() => window.open(job.externalUrl, '_blank', 'noopener,noreferrer'), 1200);
      }
    } catch (e) {
      setError(e.message);
    }
    setSubmitting(false);
  };

  if (done) return (
    <Modal title={job.externalUrl ? '✅ Profile Saved!' : 'Application Submitted!'} onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>{job.externalUrl ? '🚀' : '🎉'}</div>
        <p style={{ color: '#0f172a', fontSize: 17, fontWeight: 700 }}>Thank you, {form.name}!</p>
        {job.externalUrl ? (
          <>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
              Your profile for <b>{job.title}</b> at <b>{job.company}</b> has been saved with us.
            </p>
            <div style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.08),rgba(245,158,11,0.04))', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '12px 16px', marginTop: 12 }}>
              <p style={{ color: '#92400e', fontSize: 13, margin: 0, fontWeight: 600 }}>
                🌐 Redirecting you to {job.company}'s careers page…
              </p>
              <p style={{ color: '#78716c', fontSize: 11, margin: '6px 0 0', lineHeight: 1.5 }}>
                Complete your application there. A new tab should open automatically.
              </p>
              <a href={job.externalUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', marginTop: 10, background: 'linear-gradient(135deg,#F59E0B,#d97706)', color: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                Open Careers Page →
              </a>
            </div>
          </>
        ) : (
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
            Your application for <b>{job.title}</b> at <b>{job.company}</b> has been received.
            The recruiting team will be in touch within 48 hours.
          </p>
        )}
        <div style={{ background: 'linear-gradient(135deg,rgba(1,118,211,0.06),rgba(1,118,211,0.03))', border:'1px solid rgba(1,118,211,0.2)', borderRadius:10, padding:'14px 18px', marginTop:14, textAlign:'left' }}>
          <p style={{ color:'#032D60', fontSize:13, fontWeight:700, margin:'0 0 6px' }}>📬 Check your inbox!</p>
          <p style={{ color:'#374151', fontSize:12, margin:'0 0 12px', lineHeight:1.6 }}>
            We've sent a confirmation to <b>{form.email}</b>. Create a free account to track your application live.
          </p>
          <a href={`/login?email=${encodeURIComponent(form.email)}&name=${encodeURIComponent(form.name)}&ref=career_apply`}
            style={{ display:'inline-block', background:'linear-gradient(135deg,#0176D3,#014486)', color:'#fff', borderRadius:8, padding:'9px 18px', fontSize:13, fontWeight:700, textDecoration:'none' }}>
            🚀 Create Account & Track Application →
          </a>
          <p style={{ color:'#94A3B8', fontSize:11, margin:'8px 0 0' }}>Your application data will be linked automatically using your email.</p>
        </div>
        <button onClick={onClose} className="btn btn-secondary" style={{ marginTop: 14, width:'100%' }}>Close</button>
      </div>
    </Modal>
  );

  return (
    <Modal title={`Apply — ${job.title} @ ${job.company}`} onClose={onClose}>
      {isPreFilled && (
        <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(1,118,211,0.06)', borderRadius: 8, border: '1px solid rgba(1,118,211,0.2)' }}>
          <p style={{ color: '#0154A4', margin: 0, fontSize: 12 }}>✓ Details pre-filled from your account. Edit if needed.</p>
        </div>
      )}
      {error && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(186,5,23,0.08)', borderRadius: 8, border: '1px solid rgba(186,5,23,0.2)' }}>
          <p style={{ color: '#BA0517', margin: 0, fontSize: 13 }}>{error}</p>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Full Name *" value={form.name} onChange={v => sf('name', v)} placeholder="Jane Smith" />
        <Field label="Email *" value={form.email} onChange={v => sf('email', v)} type="email" placeholder="jane@example.com" />
        <Field label="Mobile Number *" value={form.phone} onChange={v => sf('phone', v)} placeholder="+91 99999 99999" />
        <Field label="Cover Letter (optional)" value={form.coverLetter} onChange={v => sf('coverLetter', v)} rows={4} placeholder="Tell us why you're a great fit…" />
        {questions.length > 0 && (
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
            <p style={{ color: '#0176D3', fontSize: 12, fontWeight: 700, margin: '0 0 10px' }}>📋 Screening Questions</p>
            {questions.map((q, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', color: '#374151', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  {q.question} {q.required && <span style={{ color: '#e53e3e' }}>*</span>}
                </label>
                {q.type === 'yesno' ? (
                  <div style={{ display: 'flex', gap: 12 }}>
                    {['Yes', 'No'].map(opt => (
                      <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="radio" name={`sq_${i}`} value={opt} checked={answers[i] === opt}
                          onChange={() => setAnswers(p => ({ ...p, [i]: opt }))} style={{ accentColor: '#0176D3' }} />
                        <span style={{ fontSize: 13 }}>{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : q.type === 'multiple' ? (
                  <select value={answers[i] || ''} onChange={e => setAnswers(p => ({ ...p, [i]: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #DDDBDA', fontSize: 13 }}>
                    <option value="">Select an option…</option>
                    {(q.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <textarea value={answers[i] || ''} onChange={e => setAnswers(p => ({ ...p, [i]: e.target.value }))}
                    rows={2} placeholder="Your answer…"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #DDDBDA', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button onClick={submit} disabled={submitting} className="btn btn-primary" style={{ flex: 1, opacity: submitting ? 0.6 : 1, justifyContent: 'center' }}>
          {submitting ? <><Spinner /> Submitting…</> : '🚀 Submit Application'}
        </button>
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
      </div>
      <p style={{ color: '#706E6B', fontSize: 11, marginTop: 12, textAlign: 'center' }}>
        Already have an account?{' '}
        <a href="/login" style={{ color: '#014486', textDecoration: 'none', fontWeight: 600 }}>Sign in</a>
        {' '}to track your application status.
      </p>
    </Modal>
  );
}

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

export default function CareersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { companySlug } = useParams();
  const [brand, setBrand] = useState(null); // { name, logoUrl, brandColor }
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [applying, setApplying] = useState(null);
  const [totalJobs, setTotalJobs] = useState(0);
  const [toast, setToast] = useState('');
  const initialCompanyFilter = searchParams.get('company') || '';
  const initialSearch = searchParams.get('search') || '';

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
    const qs = companySlug ? `?slug=${companySlug}` : '';
    api.getPublicJobs(qs)
      .then(res => {
        const arr = Array.isArray(res) ? res : (res?.data || []);
        setJobs(arr);
        setTotalJobs(res?.pagination?.total || arr.length);

        // ── Inject JSON-LD for Googlebot's JS indexer ──────────────────────
        // Remove any previously injected job JSON-LD tags first
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

        // Auto-open job from invite link (?job=<id>)
        const jobParam = searchParams.get('job');
        if (jobParam) {
          const found = arr.find(j => String(j._id || j.id) === jobParam);
          if (found) setApplying(found);
        }
        if (!jobParam && initialCompanyFilter) {
          setSearch(initialCompanyFilter);
        } else if (initialSearch) {
          setSearch(initialSearch);
        }
      })
      .catch(() => setToast('❌ Could not load jobs.'))
      .finally(() => setLoading(false));
  }, [companySlug, initialCompanyFilter, initialSearch, searchParams]);

  const locations = ['All', ...new Set(jobs.map(j => j.location).filter(Boolean))];

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    const skillsStr = Array.isArray(j.skills) ? j.skills.join(',') : (j.skills || '');
    const matchSearch = !q || (j.title||'').toLowerCase().includes(q) || (j.company||'').toLowerCase().includes(q) || skillsStr.toLowerCase().includes(q);
    const matchUrgency = urgencyFilter === 'All' || j.urgency === urgencyFilter;
    const matchLocation = locationFilter === 'All' || j.location === locationFilter;
    return matchSearch && matchUrgency && matchLocation;
  });

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
              <span className="tn-label">Open Positions</span>
              <h1 className="tn-mobile-center" style={{ color: '#ffffff', fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 900, margin: '16px 0 20px', lineHeight: 1.1 }}>
                Find Your{' '}
                <span style={{ background: 'linear-gradient(135deg,#0176D3,#00C2CB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Dream Job
                </span>
              </h1>
              <p className="tn-mobile-center" style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1.05rem', maxWidth: 480, margin: '0 0 36px', lineHeight: 1.7 }}>
                Browse hand-picked opportunities across IT, cybersecurity, finance and more. Apply in minutes — we respond within 48 hours.
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
                  { icon: '⚡', num: (Array.isArray(jobs) ? jobs : []).filter(j => j.urgency === 'High').length, label: 'Urgent Hiring' },
                  { icon: '🏢', num: new Set((Array.isArray(jobs) ? jobs : []).map(j => j.company)).size, label: 'Companies' },
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
                        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 1 }}>{job.company || job.companyName} · {job.location || 'India'}</div>
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
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '16px 0', position: 'sticky', top: 70, zIndex: 90, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div className="tn-container">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Urgency filter pills */}
            {['All', 'High', 'Medium', 'Low'].map(u => (
              <button key={u} onClick={() => setUrgencyFilter(u)} style={{ padding: '8px 18px', borderRadius: 50, border: '1.5px solid', borderColor: urgencyFilter === u ? '#0176D3' : '#E2E8F0', background: urgencyFilter === u ? 'linear-gradient(135deg,#0176D3,#014486)' : 'transparent', color: urgencyFilter === u ? '#fff' : '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                {u === 'All' ? 'All Urgency' : `⚡ ${u}`}
              </button>
            ))}
            <select
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
              style={{ padding: '8px 14px', border: '1.5px solid #E2E8F0', borderRadius: 50, fontSize: 13, color: '#64748B', background: '#F7F8FC', outline: 'none', cursor: 'pointer' }}
            >
              {(Array.isArray(locations) ? locations : []).map(l => <option key={l} value={l}>{l === 'All' ? 'All Locations' : l}</option>)}
            </select>
            <span style={{ marginLeft: 'auto', color: '#64748B', fontSize: 13 }}>
              <b style={{ color: '#0176D3' }}>{filtered.length}</b> roles found
            </span>
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
                {(Array.isArray(filtered) ? filtered : []).map(j => (
                  <div
                    key={j.id}
                    style={{ background: '#fff', borderRadius: 16, padding: '24px 28px', borderLeft: `4px solid ${TYPE_COLOR[j.urgency] || '#0176D3'}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', transition: 'all 0.22s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.06)'; }}
                  >
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
                               aria-label={`View ${j.title} at ${j.company} job details`}>
                              {j.title}
                            </a>
                          </h3>
                        </div>

                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: '#64748B', fontSize: '0.85rem', marginBottom: 10 }}>
                          <span>🏢 {j.company}</span>
                          <span>📍 {j.location || 'Remote'}</span>
                          <span>🗓 {j.experience || 'Any'} exp</span>
                        </div>

                        {j.description && (
                          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: '0 0 12px', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{j.description}</p>
                        )}

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                          {(Array.isArray(j.skills) ? j.skills : (j.skills || '').split(',')).filter(Boolean).slice(0, 5).map(s => (
                            <span key={s} style={{ background: 'rgba(1,118,211,0.08)', color: '#0176D3', fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(1,118,211,0.15)' }}>
                              {s.trim()}
                            </span>
                          ))}
                        </div>

                        <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                          Posted {j.postedAt ? new Date(j.postedAt).toLocaleDateString() : 'recently'} · {j.applicantsCount || 0} applicants
                        </div>
                      </div>

                      {/* CTA */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', paddingTop: 4 }}>
                        <button onClick={() => setApplying({ ...j, id: j._id || j.id })} className="tn-btn tn-btn-primary" style={{ whiteSpace: 'nowrap', fontSize: 13, padding: '10px 20px' }}>
                          {j.externalUrl ? '🌐 Apply on Company Site →' : 'Apply Now →'}
                        </button>
                        {j.externalUrl && (
                          <span style={{ color: '#94a3b8', fontSize: '0.7rem', textAlign: 'right', maxWidth: 160, lineHeight: 1.4 }}>
                            We save your profile, then redirect you
                          </span>
                        )}
                        <button onClick={() => navigate('/login')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F7F8FC', color: '#64748B', fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Sign In to Track
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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

      {applying && <ApplyModal job={applying} onClose={() => setApplying(null)} />}
    </div>
  );
}
