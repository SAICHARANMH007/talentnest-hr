import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api/api.js';
import Spinner from '../../components/ui/Spinner.jsx';

// ── Urgency config ────────────────────────────────────────────────────────────
const URGENCY_COLOR  = { High: '#BA0517', Medium: '#F59E0B', Low: '#10B981', '': '#0176D3' };
const URGENCY_LABEL  = { High: '🔥 Emergency', Medium: '⚡ High Priority', Low: '📌 Normal', '': '📋 Open' };

// ── Apply Modal (lightweight, embedded-safe) ──────────────────────────────────
function ApplyModal({ job, orgName, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', title: '', currentCompany: '', experience: '', availability: '', coverLetter: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.name.trim())  { setError('Full name is required.'); return; }
    if (!form.email.trim()) { setError('Email is required.'); return; }
    if (!form.phone.trim()) { setError('Mobile number is required.'); return; }
    setSubmitting(true); setError('');
    try {
      await api.applyPublic(job.id || job._id, { ...form });
      setDone(true);
    } catch (e) { setError(e.message || 'Submission failed. Please try again.'); }
    setSubmitting(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ background: 'linear-gradient(135deg,#032D60,#0176D3)', padding: '20px 24px', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700 }}>APPLY NOW</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{job.title}</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>{orgName} · {job.location}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: '#fff', width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: '24px' }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
              <h3 style={{ color: '#065f46', fontWeight: 800, margin: '0 0 8px' }}>Application Submitted!</h3>
              <p style={{ color: '#64748B', fontSize: 14 }}>Thank you, {form.name}! The team at {orgName} will be in touch within 48 hours.</p>
              <button onClick={onClose} style={{ marginTop: 16, background: '#0176D3', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>Close</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {error && <div style={{ background: 'rgba(186,5,23,0.08)', border: '1px solid rgba(186,5,23,0.2)', borderRadius: 8, padding: '10px 14px', color: '#BA0517', fontSize: 13 }}>{error}</div>}
              {[['Full Name *', 'name', 'text', 'Jane Smith'], ['Email *', 'email', 'email', 'jane@example.com'], ['Mobile Number *', 'phone', 'tel', '+91 99999 99999']].map(([label, key, type, ph]) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>{label}</label>
                  <input type={type} value={form[key]} onChange={e => sf(key, e.target.value)} placeholder={ph}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Current Title</label>
                  <input value={form.title} onChange={e => sf('title', e.target.value)} placeholder="e.g. Developer"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Availability</label>
                  <select value={form.availability} onChange={e => sf('availability', e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff', boxSizing: 'border-box', outline: 'none' }}>
                    <option value="">Select…</option>
                    <option value="immediate">Immediate</option>
                    <option value="15 days">15 Days Notice</option>
                    <option value="30 days">30 Days Notice</option>
                    <option value="45 days">45 Days Notice</option>
                    <option value="60 days">60 Days Notice</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Cover Letter (optional)</label>
                <textarea value={form.coverLetter} onChange={e => sf('coverLetter', e.target.value)} rows={3} placeholder="Tell us why you're a great fit…"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={submit} disabled={submitting}
                  style={{ flex: 1, background: 'linear-gradient(135deg,#0176D3,#014486)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 800, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? '⏳ Submitting…' : '🚀 Submit Application'}
                </button>
                <button onClick={onClose} style={{ padding: '12px 20px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main embeddable careers page ──────────────────────────────────────────────
export default function OrgCareersPage() {
  const { orgSlug } = useParams();
  const [searchParams] = useSearchParams();
  const embed = searchParams.get('embed') === '1'; // when embedded as iframe

  const [org, setOrg]         = useState(null);
  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [urgency, setUrgency] = useState('All');
  const [location, setLocation] = useState('All');
  const [applying, setApplying] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!orgSlug) return;
    setLoading(true);
    api.getOrgPublicJobs(orgSlug)
      .then(res => {
        if (!res.success) { setError('Organisation not found or career page not available.'); return; }
        setOrg(res.org);
        setJobs(Array.isArray(res.data) ? res.data : []);
        document.title = `${res.org?.name || 'Careers'} — Open Positions`;
      })
      .catch(() => setError('Could not load jobs. Please try again later.'))
      .finally(() => setLoading(false));
  }, [orgSlug]);

  const locations = ['All', ...new Set(jobs.map(j => j.location).filter(Boolean))];
  const filtered  = jobs.filter(j => {
    const q = search.toLowerCase();
    const matchSearch = !q || (j.title||'').toLowerCase().includes(q) || (j.company||'').toLowerCase().includes(q) || (j.skills||[]).join(',').toLowerCase().includes(q);
    const matchUrgency   = urgency === 'All' || j.urgency === urgency;
    const matchLocation  = location === 'All' || j.location === location;
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
      <h2 style={{ color: '#0A1628', fontWeight: 800 }}>Career Page Not Found</h2>
      <p style={{ color: '#64748B', maxWidth: 400 }}>{error}</p>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", minHeight: embed ? 'auto' : '100vh', background: '#F7F8FC' }}>
      {applying && <ApplyModal job={applying} orgName={org?.name} onClose={() => setApplying(null)} />}

      {/* Header — hidden when embedded */}
      {!embed && (
        <div style={{ background: 'linear-gradient(135deg,#032D60,#0176D3)', padding: '32px 24px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />
          {org?.logoUrl && (
            <img src={org.logoUrl} alt={org.name} style={{ height: 48, objectFit: 'contain', borderRadius: 10, background: '#fff', padding: '4px 10px', marginBottom: 16, display: 'block', margin: '0 auto 16px' }} />
          )}
          <h1 style={{ color: '#fff', fontSize: 'clamp(1.6rem,4vw,2.4rem)', fontWeight: 900, margin: '0 0 10px' }}>
            {org?.name} — Open Positions
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: '0 0 28px' }}>
            {jobs.length} role{jobs.length !== 1 ? 's' : ''} available • Apply directly below
          </p>
          {/* Search */}
          <div style={{ maxWidth: 520, margin: '0 auto', position: 'relative' }}>
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: 16 }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roles, skills…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '14px 18px 14px 44px', borderRadius: 12, border: 'none', fontSize: 14, outline: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} />
          </div>
        </div>
      )}

      {/* Compact search header for embedded mode */}
      {embed && (
        <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '14px 20px', display: 'flex', gap: 10, alignItems: 'center' }}>
          {org?.logoUrl && <img src={org.logoUrl} alt={org.name} style={{ height: 28, borderRadius: 6, objectFit: 'contain' }} />}
          <span style={{ fontWeight: 800, color: '#032D60', fontSize: 14 }}>{org?.name}</span>
          <span style={{ color: '#64748B', fontSize: 12, marginLeft: 4 }}>({jobs.length} roles)</span>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12 }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roles…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px 8px 28px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, outline: 'none' }} />
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '12px 20px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', overflowX: 'auto' }}>
        {['All', 'High', 'Medium', 'Low'].map(u => (
          <button key={u} onClick={() => setUrgency(u)}
            style={{ padding: '6px 16px', borderRadius: 50, border: '1.5px solid', borderColor: urgency === u ? accentColor : '#E2E8F0', background: urgency === u ? accentColor : '#fff', color: urgency === u ? '#fff' : '#64748B', fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
            {u === 'All' ? '🌐 All' : URGENCY_LABEL[u]}
          </button>
        ))}
        {locations.length > 1 && (
          <select value={location} onChange={e => setLocation(e.target.value)}
            style={{ padding: '6px 14px', border: '1.5px solid #E2E8F0', borderRadius: 50, fontSize: 12, color: '#64748B', background: '#F7F8FC', outline: 'none' }}>
            {locations.map(l => <option key={l} value={l}>{l === 'All' ? '📍 All Locations' : l}</option>)}
          </select>
        )}
        <span style={{ marginLeft: 'auto', color: '#64748B', fontSize: 12, whiteSpace: 'nowrap' }}>
          <b style={{ color: accentColor }}>{filtered.length}</b> role{filtered.length !== 1 ? 's' : ''} found
        </span>
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
                        <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#0A1628' }}>{j.title}</h3>
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', color: '#64748B', fontSize: 13 }}>
                          {j.location && <span>📍 {j.location}</span>}
                          {j.jobType  && <span>💼 {j.jobType}</span>}
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
                      </div>
                      {/* CTA */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                        <button onClick={e => { e.stopPropagation(); setApplying(j); }}
                          style={{ background: 'linear-gradient(135deg,#0176D3,#014486)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 800, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Apply Now →
                        </button>
                        <span style={{ color: '#94A3B8', fontSize: 11 }}>{isOpen ? '▲ Hide' : '▼ Details'}</span>
                      </div>
                    </div>
                  </div>
                  {/* Expanded description */}
                  {isOpen && j.description && (
                    <div style={{ padding: '0 22px 18px', borderTop: '1px solid #F1F5F9' }}>
                      <p style={{ color: '#374151', fontSize: 13, lineHeight: 1.7, margin: '14px 0 0', whiteSpace: 'pre-wrap' }}>{j.description}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer credit (only in standalone mode) */}
      {!embed && (
        <div style={{ textAlign: 'center', padding: '24px', color: '#94A3B8', fontSize: 12 }}>
          Powered by <a href="https://www.talentnesthr.com" target="_blank" rel="noopener noreferrer" style={{ color: '#0176D3', fontWeight: 700, textDecoration: 'none' }}>TalentNest HR</a>
        </div>
      )}
    </div>
  );
}
