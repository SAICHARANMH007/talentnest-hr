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


// ── Main embeddable careers page ──────────────────────────────────────────────
export default function OrgCareersPage() {
  const { orgSlug } = useParams();
  const [searchParams] = useSearchParams();
  const embed = searchParams.get('embed') === '1'; // when embedded as iframe
  // TalentNest HR's own career page gets full Marketing nav + footer
  const isMainOrg = orgSlug === MAIN_ORG_SLUG;

  const [org, setOrg] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
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
    <div style={{ fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", minHeight: embed ? 'auto' : '100vh', background: '#F7F8FC' }}>
      {applying && <PublicApplyModal job={applying} orgName={org?.name} onClose={() => setApplying(null)} />}

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

      {/* Filter pills */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '12px 20px', display: 'flex', gap: 8, flexWrap: 'nowrap', alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
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
                      </div>
                      {/* CTA */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                        <button onClick={e => { e.stopPropagation(); setApplying(j); }}
                          style={{ background: 'linear-gradient(135deg,#0176D3,#014486)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 800, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {getCompanyCareerUrl(j.externalUrl) ? '🌐 Apply on Company Site →' : 'Apply Now →'}
                        </button>
                        {getCompanyCareerUrl(j.externalUrl) && (
                          <span style={{ color: '#94a3b8', fontSize: '0.7rem', textAlign: 'right', maxWidth: 160, lineHeight: 1.4 }}>
                            We save your profile, then redirect you
                          </span>
                        )}
                        <span style={{ color: '#94A3B8', fontSize: 11 }}>{isOpen ? '▲ Hide' : '▼ Details'}</span>
                      </div>
                    </div>
                  </div>
                  {/* Expanded description */}
                  {isOpen && (j.description || j.requirements) && (
                    <div style={{ padding: '0 22px 18px', borderTop: '1px solid #F1F5F9' }}>
                      {j.description && <p style={{ color: '#374151', fontSize: 13, lineHeight: 1.7, margin: '14px 0 0', whiteSpace: 'pre-wrap' }}>{j.description}</p>}
                      {j.requirements && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#0176D3', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Requirements</div>
                          <p style={{ color: '#374151', fontSize: 13, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{j.requirements}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Marketing footer — only for TalentNest HR's own career page */}
      {isMainOrg && !embed && <MarketingFooter />}
    </div>
  );
}
