import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { card, btnP } from '../../constants/styles.js';
import { api } from '../../api/api.js';
import JobAlertsManager from '../../components/candidate/JobAlertsManager.jsx';

// ── Job Detail Modal ─────────────────────────────────────────────────────────
function JobDetailModal({ job, applied, applying, onApply, onClose }) {
  const urgencyColor = { High: '#BA0517', Medium: '#F59E0B', Low: '#2E844A' };
  const typeColor = { 'Full-Time': '#014486', 'Part-Time': '#0176D3', 'Contract': '#F59E0B', 'Remote': '#10b981', 'Internship': '#8b5cf6' };
  const uc  = urgencyColor[job.urgency] || '#706E6B';
  const tc  = typeColor[job.type] || '#64748b';
  const skills = job.skills ? (Array.isArray(job.skills) ? job.skills : job.skills.split(',').map(s => s.trim()).filter(Boolean)) : [];

  const toList = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean);
    return val.split(/\n|;/).map(s => s.trim()).filter(Boolean);
  };
  const requirements = toList(job.requirements);
  const benefits     = toList(job.benefits);

  // Close on overlay click
  const handleOverlay = (e) => { if (e.target === e.currentTarget) onClose(); };

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const isApplied  = !!applied[String(job._id || job.id)];
  const isApplying = !!applying[String(job._id || job.id)];

  return (
    <div
      onClick={handleOverlay}
      style={{
        position: 'fixed', inset: 0, zIndex: 10001,
        background: 'rgba(5,13,26,0.72)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        overflowY: 'auto', padding: '24px 16px',
      }}
    >
      <div style={{
        background: '#fff',
        borderRadius: 20, maxWidth: 700, width: '100%', margin: 'auto 0',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#032D60,#0176D3)', padding: '20px 24px', position: 'sticky', top: 0, zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, paddingRight: 16 }}>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Job Details</div>
              <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: '0 0 4px' }}>{job.title}</h2>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600 }}>
                {job.company}{job.location ? ` · ${job.location}` : ''}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
          </div>
          {/* Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
            {job.urgency && (
              <span style={{ fontSize: 10, fontWeight: 700, color: uc, background: `${uc}18`, border: `1px solid ${uc}44`, borderRadius: 20, padding: '3px 10px' }}>
                {job.urgency.toUpperCase()} URGENCY
              </span>
            )}
            {job.type && (
              <span style={{ fontSize: 10, fontWeight: 700, color: tc, background: `${tc}18`, border: `1px solid ${tc}44`, borderRadius: 20, padding: '3px 10px' }}>
                {job.type.toUpperCase()}
              </span>
            )}
            {job.experience && (
              <span style={{ fontSize: 10, fontWeight: 600, color: '#706E6B', background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 20, padding: '3px 10px' }}>
                {job.experience} experience
              </span>
            )}
            {job.externalUrl && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 20, padding: '3px 10px' }}>
                🌐 EXTERNAL OPENING
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 28px' }}>
          {/* Key Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 24 }}>
            {job.salary && (
              <div style={{ background: 'rgba(1,118,211,0.07)', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 12, padding: '12px 16px' }}>
                <div style={{ color: '#706E6B', fontSize: 10, fontWeight: 600, marginBottom: 4, letterSpacing: '0.5px' }}>SALARY</div>
                <div style={{ color: '#0176D3', fontSize: 15, fontWeight: 700 }}>{job.salary}</div>
              </div>
            )}
            {job.location && (
              <div style={{ background: 'rgba(1,118,211,0.07)', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 12, padding: '12px 16px' }}>
                <div style={{ color: '#706E6B', fontSize: 10, fontWeight: 600, marginBottom: 4, letterSpacing: '0.5px' }}>LOCATION</div>
                <div style={{ color: '#181818', fontSize: 13, fontWeight: 600 }}>{job.location}</div>
              </div>
            )}
            {job.applicationDeadline && (
              <div style={{ background: 'rgba(186,5,23,0.07)', border: '1px solid rgba(186,5,23,0.2)', borderRadius: 12, padding: '12px 16px' }}>
                <div style={{ color: '#706E6B', fontSize: 10, fontWeight: 600, marginBottom: 4, letterSpacing: '0.5px' }}>APPLY BEFORE</div>
                <div style={{ color: '#fca5a5', fontSize: 13, fontWeight: 600 }}>
                  {new Date(job.applicationDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            )}
            {job.recruiterName && (
              <div style={{ background: 'rgba(1,118,211,0.07)', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 12, padding: '12px 16px' }}>
                <div style={{ color: '#706E6B', fontSize: 10, fontWeight: 600, marginBottom: 4, letterSpacing: '0.5px' }}>POSTED BY</div>
                <div style={{ color: '#181818', fontSize: 13, fontWeight: 600 }}>{job.recruiterName}</div>
              </div>
            )}
          </div>

          {/* Description */}
          {job.description && (
            <section style={{ marginBottom: 22 }}>
              <h4 style={{ color: '#0176D3', fontSize: 12, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', margin: '0 0 10px' }}>About the Role</h4>
              <p style={{ color: '#706E6B', fontSize: 13, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{job.description}</p>
            </section>
          )}

          {/* Requirements */}
          {requirements.length > 0 && (
            <section style={{ marginBottom: 22 }}>
              <h4 style={{ color: '#0176D3', fontSize: 12, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', margin: '0 0 10px' }}>Requirements</h4>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {requirements.map((r, i) => (
                  <li key={i} style={{ color: '#706E6B', fontSize: 13, lineHeight: 1.6, display: 'flex', gap: 10, marginBottom: 6 }}>
                    <span style={{ color: '#0176D3', flexShrink: 0, marginTop: 2 }}>▸</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Benefits */}
          {benefits.length > 0 && (
            <section style={{ marginBottom: 22 }}>
              <h4 style={{ color: '#0176D3', fontSize: 12, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', margin: '0 0 10px' }}>Benefits & Perks</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {benefits.map((b, i) => (
                  <span key={i} style={{ fontSize: 12, color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 20, padding: '4px 12px' }}>✓ {b}</span>
                ))}
              </div>
            </section>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h4 style={{ color: '#0176D3', fontSize: 12, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', margin: '0 0 10px' }}>Skills Required</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {skills.map(s => (
                  <span key={s} style={{ fontSize: 11, color: '#0176D3', background: 'rgba(1,118,211,0.1)', border: '1px solid rgba(1,118,211,0.25)', borderRadius: 8, padding: '4px 10px', fontWeight: 500 }}>
                    {s}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Apply CTA */}
          <div style={{ borderTop: '1px solid rgba(1,118,211,0.12)', paddingTop: 20, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button onClick={onClose} style={{ background: '#F3F2F2', border: '1px solid #DDDBDA', borderRadius: 10, color: '#706E6B', fontSize: 13, fontWeight: 600, padding: '10px 20px', cursor: 'pointer' }}>
              Close
            </button>
            {job.externalUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <button
                  onClick={() => { onApply(job._id || job.id); }}
                  disabled={isApplying}
                  style={{ ...btnP, fontSize: 13, padding: '10px 24px', background: 'linear-gradient(135deg,#F59E0B,#d97706)', boxShadow: '0 4px 14px rgba(245,158,11,0.35)', opacity: isApplying ? 0.7 : 1 }}
                >
                  {isApplying ? 'Saving your profile…' : '🌐 Apply on Company Site →'}
                </button>
                <span style={{ color: '#706E6B', fontSize: 10 }}>Your profile is saved, then you're redirected to the employer's page</span>
              </div>
            ) : isApplied ? (
              <span style={{ fontSize: 13, fontWeight: 700, color: '#2E844A', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: '10px 20px' }}>
                ✓ Applied Successfully
              </span>
            ) : (
              <button
                onClick={() => onApply(job._id || job.id)}
                disabled={isApplying}
                style={{ ...btnP, fontSize: 13, padding: '10px 28px', opacity: isApplying ? 0.7 : 1 }}
              >
                {isApplying ? 'Applying…' : 'Apply Now →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function CandidateExploreJobs({ user }) {
  const navigate = useNavigate();
  const [jobs, setJobs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [applied, setApplied]       = useState({});
  const [applying, setApplying]     = useState({});
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [assessmentPrompt, setAssessmentPrompt] = useState(null); // { jobId, jobTitle, assessment }
  const [screeningModal, setScreeningModal] = useState(null); // { jobId, questions }
  const [screeningAnswers, setScreeningAnswers] = useState({});
  const [showAlerts, setShowAlerts] = useState(false);
  const [toast, setToast] = useState('');
  const [saved, setSaved]           = useState(() => {
    try { return JSON.parse(localStorage.getItem('tn_saved_jobs') || '{}'); } catch { return {}; }
  });

  useEffect(() => {
    Promise.all([
      api.getPublicJobs(),
      api.getApplications({ candidateId: user.id }),
    ]).then(([j, apps]) => {
      setJobs(Array.isArray(j) ? j : (j.data || []));
      const map = {};
      const appList = Array.isArray(apps) ? apps : (apps.data || []);
      appList.forEach(a => { map[String(a.jobId)] = true; });
      setApplied(map);
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [user.id]);

  const handleApply = async (jobId, providedAnswers) => {
    if (!jobId) {
      setToast('❌ Could not apply. Please refresh.');
      return;
    }
    const job = jobs.find(j => String(j._id || j.id) === String(jobId));
    const questions = job?.screeningQuestions || [];

    // If job has screening questions and we haven't answered them yet, show modal
    if (questions.length > 0 && !providedAnswers) {
      setScreeningAnswers({});
      setScreeningModal({ jobId, questions });
      return;
    }

    setApplying(p => ({ ...p, [jobId]: true }));
    setError('');
    try {
      const screeningAnswersList = questions.map((q, i) => ({ question: q.question, answer: (providedAnswers || {})[i] || '' }));
      await api.applyToJob(jobId, user.id, screeningAnswersList.length > 0 ? screeningAnswersList : undefined);
      setApplied(p => ({ ...p, [jobId]: true }));
      setScreeningModal(null);
      setToast('✅ Application submitted!');
      if (job?.externalUrl) {
        setSelectedJob(null);
        window.open(job.externalUrl, '_blank', 'noopener,noreferrer');
      } else {
        api.getAssessmentForJob(jobId).then(asmt => {
          if (asmt && asmt.isActive) {
            setAssessmentPrompt({ jobId, jobTitle: job?.title || '', assessment: asmt });
            setSelectedJob(null);
          }
        }).catch(() => {});
      }
    } catch (e) {
      if (e.message?.includes('already')) {
        setApplied(p => ({ ...p, [jobId]: true }));
        setToast('ℹ️ You have already applied for this job.');
      } else {
        setError(e.message);
      }
    } finally {
      setApplying(p => ({ ...p, [jobId]: false }));
    }
  };

  const toggleSave = (jobId) => {
    setSaved(prev => {
      const next = { ...prev };
      if (next[String(jobId)]) delete next[String(jobId)];
      else next[String(jobId)] = true;
      localStorage.setItem('tn_saved_jobs', JSON.stringify(next));
      return next;
    });
  };

  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [locFilter, setLocFilter] = useState('');

  const urgencyColor = { High: '#BA0517', Medium: '#F59E0B', Low: '#2E844A' };
  const typeColor = { 'Full-Time': '#014486', 'Part-Time': '#0176D3', 'Contract': '#F59E0B', 'Remote': '#10b981', 'Internship': '#8b5cf6' };
  const allTypes = [...new Set(jobs.map(j => j.type).filter(Boolean))];
  const allLocations = [...new Set(jobs.map(j => j.location).filter(Boolean))];

  const filtered = jobs.filter(j => {
    if (typeFilter && j.type !== typeFilter) return false;
    if (urgencyFilter && j.urgency !== urgencyFilter) return false;
    if (locFilter && j.location !== locFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      j.title?.toLowerCase().includes(q) ||
      j.company?.toLowerCase().includes(q) ||
      j.location?.toLowerCase().includes(q) ||
      (Array.isArray(j.skills) ? j.skills.join(',') : (j.skills || '')).toLowerCase().includes(q)
    );
  });

  const savedCount = Object.keys(saved).length;

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      <PageHeader title="Explore Jobs" subtitle={`${filtered.length} open position${filtered.length !== 1 ? 's' : ''}${savedCount > 0 ? ` · ${savedCount} saved` : ''}`}
        action={<button onClick={() => setShowAlerts(true)} style={{ ...btnP, fontSize: 12, padding: '7px 14px' }}>🔔 Job Alerts</button>} />

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24, alignItems: 'center' }}>
        <input
          placeholder="Search by title, company, location, skills…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1 1 280px', minWidth: 200, maxWidth: 440, padding: '10px 16px',
            background: '#F3F2F2', border: '1px solid rgba(1,118,211,0.25)',
            borderRadius: 12, color: '#181818', fontSize: 13, outline: 'none', boxSizing: 'border-box',
          }}
        />
        {allTypes.length > 0 && (
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{ padding: '10px 14px', background: '#F3F2F2', border: '1px solid rgba(1,118,211,0.25)', borderRadius: 12, color: typeFilter ? '#0176D3' : '#706E6B', fontSize: 13, outline: 'none', cursor: 'pointer' }}
          >
            <option value="">All Types</option>
            {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <select
          value={urgencyFilter}
          onChange={e => setUrgencyFilter(e.target.value)}
          style={{ padding: '10px 14px', background: '#F3F2F2', border: '1px solid rgba(1,118,211,0.25)', borderRadius: 12, color: urgencyFilter ? '#0176D3' : '#706E6B', fontSize: 13, outline: 'none', cursor: 'pointer' }}
        >
          <option value="">All Urgency</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        {allLocations.length > 0 && (
          <select
            value={locFilter}
            onChange={e => setLocFilter(e.target.value)}
            style={{ padding: '10px 14px', background: '#F3F2F2', border: '1px solid rgba(1,118,211,0.25)', borderRadius: 12, color: locFilter ? '#0176D3' : '#706E6B', fontSize: 13, outline: 'none', cursor: 'pointer' }}
          >
            <option value="">All Locations</option>
            {allLocations.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        )}
        {(search || typeFilter || urgencyFilter || locFilter) && (
          <button
            onClick={() => { setSearch(''); setTypeFilter(''); setUrgencyFilter(''); setLocFilter(''); }}
            style={{ background: 'none', border: 'none', color: '#BA0517', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {error && <p style={{ color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>{error}</p>}

      {loading ? (
        <div style={{ color: '#706E6B' }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#706E6B' }}>No open jobs found{search ? ' matching your search' : ''}.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(j => {
            const isApplied  = !!applied[String(j._id || j.id)];
            const isApplying = !!applying[String(j._id || j.id)];
            const isSaved    = !!saved[String(j._id || j.id)];
            const uc         = urgencyColor[j.urgency] || '#706E6B';
            const tc         = typeColor[j.type] || null;
            const skills     = j.skills ? (Array.isArray(j.skills) ? j.skills : j.skills.split(',').map(s => s.trim()).filter(Boolean)) : [];

            return (
              <div key={String(j._id || j.id)} style={{ ...card, border: '1px solid rgba(1,118,211,0.18)', transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(1,118,211,0.4)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(1,118,211,0.18)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  {/* Left info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ color: '#181818', fontWeight: 700, fontSize: 15 }}>{j.title}</span>
                      {j.urgency && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: uc, background: `${uc}18`, border: `1px solid ${uc}44`, borderRadius: 6, padding: '2px 7px', letterSpacing: '0.5px' }}>
                          {j.urgency.toUpperCase()}
                        </span>
                      )}
                      {j.type && tc && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: tc, background: `${tc}18`, border: `1px solid ${tc}44`, borderRadius: 6, padding: '2px 7px' }}>
                          {j.type}
                        </span>
                      )}
                    </div>
                    <div style={{ color: '#0176D3', fontSize: 12, marginTop: 3 }}>
                      {j.company}{j.location ? ` · ${j.location}` : ''}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                      {j.experience && <span style={{ color: '#706E6B', fontSize: 11 }}>🎓 {j.experience}</span>}
                      {j.salary && <span style={{ color: '#706E6B', fontSize: 11 }}>💰 {j.salary}</span>}
                      {j.applicationDeadline && (
                        <span style={{ color: '#fca5a5', fontSize: 11 }}>
                          ⏰ Deadline: {new Date(j.applicationDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                    {skills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                        {skills.slice(0, 5).map(s => (
                          <span key={s} style={{ fontSize: 10, color: '#0176D3', background: 'rgba(1,118,211,0.1)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 6, padding: '2px 7px' }}>
                            {s}
                          </span>
                        ))}
                        {skills.length > 5 && <span style={{ fontSize: 10, color: '#706E6B' }}>+{skills.length - 5} more</span>}
                      </div>
                    )}
                  </div>

                  {/* Right actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                    {j.externalUrl ? (
                      <button
                        onClick={() => handleApply(j._id || j.id)}
                        disabled={isApplying}
                        title="We save your profile then open the company's careers page"
                        style={{ ...btnP, fontSize: 12, padding: '7px 16px', opacity: isApplying ? 0.7 : 1, background: 'linear-gradient(135deg,#F59E0B,#d97706)', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}
                      >
                        {isApplying ? 'Saving…' : '🌐 Apply on Site →'}
                      </button>
                    ) : isApplied ? (
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#2E844A', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '6px 12px' }}>
                        ✓ Applied
                      </span>
                    ) : (
                      <button
                        onClick={() => handleApply(j._id || j.id)}
                        disabled={isApplying}
                        style={{ ...btnP, fontSize: 12, padding: '7px 16px', opacity: isApplying ? 0.7 : 1 }}
                      >
                        {isApplying ? 'Applying…' : 'Quick Apply'}
                      </button>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => toggleSave(j._id || j.id)}
                        title={isSaved ? 'Remove from saved' : 'Save job'}
                        style={{ background: isSaved ? 'rgba(1,118,211,0.15)' : 'none', border: `1px solid ${isSaved ? 'rgba(1,118,211,0.4)' : '#FAFAF9'}`, color: isSaved ? '#0176D3' : '#64748b', fontSize: 14, cursor: 'pointer', borderRadius: 8, padding: '4px 8px', transition: 'all 0.2s' }}
                      >
                        {isSaved ? '🔖' : '📌'}
                      </button>
                      <button
                        onClick={() => setSelectedJob(j)}
                        style={{ background: 'rgba(1,118,211,0.08)', border: '1px solid rgba(1,118,211,0.2)', color: '#0176D3', fontSize: 11, cursor: 'pointer', borderRadius: 8, padding: '4px 12px', fontWeight: 600 }}
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Job Detail Modal */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          applied={applied}
          applying={applying}
          onApply={handleApply}
          onClose={() => setSelectedJob(null)}
        />
      )}

      {/* Job Alerts Manager Modal */}
      {showAlerts && <JobAlertsManager onClose={() => setShowAlerts(false)} />}

      {/* Screening Questions Modal */}
      {screeningModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: '24px 16px' }}>
          <div style={{ background: '#fff', borderRadius: 20, maxWidth: 520, width: '100%', maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.22)' }}>
            <div style={{ background: 'linear-gradient(135deg,#032D60,#0176D3)', padding: '24px 28px 20px' }}>
              <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: '0 0 4px' }}>📋 Screening Questions</h3>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, margin: 0 }}>Please answer before submitting your application</p>
            </div>
            <div style={{ padding: '20px 28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {screeningModal.questions.map((q, i) => (
                <div key={i}>
                  <label style={{ display: 'block', color: '#374151', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    {q.question} {q.required && <span style={{ color: '#e53e3e' }}>*</span>}
                  </label>
                  {q.type === 'yesno' ? (
                    <div style={{ display: 'flex', gap: 16 }}>
                      {['Yes', 'No'].map(opt => (
                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                          <input type="radio" name={`sqm_${i}`} value={opt} checked={screeningAnswers[i] === opt}
                            onChange={() => setScreeningAnswers(p => ({ ...p, [i]: opt }))} style={{ accentColor: '#0176D3' }} />
                          <span style={{ fontSize: 13 }}>{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : q.type === 'multiple' ? (
                    <select value={screeningAnswers[i] || ''} onChange={e => setScreeningAnswers(p => ({ ...p, [i]: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #DDDBDA', fontSize: 13 }}>
                      <option value="">Select…</option>
                      {(q.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <textarea value={screeningAnswers[i] || ''} onChange={e => setScreeningAnswers(p => ({ ...p, [i]: e.target.value }))}
                      rows={2} placeholder="Your answer…"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #DDDBDA', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 28px 24px', display: 'flex', gap: 10, borderTop: '1px solid #e2e8f0' }}>
              <button
                onClick={() => {
                  for (let i = 0; i < screeningModal.questions.length; i++) {
                    if (screeningModal.questions[i].required && !screeningAnswers[i]?.trim()) {
                      setToast(`❌ Please answer: "${screeningModal.questions[i].question}"`);
                      return;
                    }
                  }
                  handleApply(screeningModal.jobId, screeningAnswers);
                }}
                style={{ ...btnP, flex: 1, justifyContent: 'center' }}
              >
                🚀 Submit Application
              </button>
              <button onClick={() => setScreeningModal(null)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #DDDBDA', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assessment Prompt Modal — shown after applying if job has assessment */}
      {assessmentPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: '24px 16px' }}>
          <div style={{ background: '#fff', borderRadius: 20, maxWidth: 460, width: '100%', maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.22)', textAlign: 'center' }}>
            <div style={{ background: 'linear-gradient(135deg,#032D60,#0176D3)', padding: '24px 24px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
              <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: '0 0 4px' }}>Applied Successfully!</h3>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, margin: 0 }}>{assessmentPrompt.jobTitle}</p>
            </div>

            <div style={{ padding: '20px 24px 0' }}>
            <div style={{ background: 'rgba(1,118,211,0.06)', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, textAlign: 'left' }}>
              <p style={{ color: '#0176D3', fontSize: 12, fontWeight: 700, margin: '0 0 6px' }}>📝 SCREENING ASSESSMENT REQUIRED</p>
              <p style={{ color: '#706E6B', fontSize: 12, margin: '0 0 10px', lineHeight: 1.5 }}>
                This job has a screening assessment. Complete it to strengthen your application.
              </p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {assessmentPrompt.assessment.timeLimitMins > 0 && (
                  <span style={{ color: '#181818', fontSize: 12 }}>⏱ {assessmentPrompt.assessment.timeLimitMins} min</span>
                )}
                <span style={{ color: '#181818', fontSize: 12 }}>❓ {(assessmentPrompt.assessment.questions || []).length} questions</span>
                {assessmentPrompt.assessment.passingScore > 0 && (
                  <span style={{ color: '#181818', fontSize: 12 }}>🎯 Pass: {assessmentPrompt.assessment.passingScore}%</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setAssessmentPrompt(null)}
                style={{ flex: 1, background: '#F3F2F2', border: '1px solid #DDDBDA', borderRadius: 12, color: '#706E6B', fontSize: 13, fontWeight: 600, padding: '12px 0', cursor: 'pointer' }}
              >
                Later
              </button>
              <button
                onClick={() => { setAssessmentPrompt(null); navigate(`/app/assessment/${assessmentPrompt.jobId}`); }}
                style={{ flex: 2, background: 'linear-gradient(135deg,#0176D3,#032D60)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, padding: '12px 0', cursor: 'pointer', boxShadow: '0 4px 12px rgba(1,118,211,0.3)' }}
              >
                Take Assessment Now →
              </button>
            </div>
            </div>{/* /padding wrapper */}
          </div>
        </div>
      )}
    </div>
  );
}
