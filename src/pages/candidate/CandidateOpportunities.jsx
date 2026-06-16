import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { btnP, btnG, card } from '../../constants/styles.js';
import { usePlatformEvents } from '../../hooks/usePlatformSocket.js';

const TYPE_CFG = {
  placement: { icon: '🎯', label: 'Placements', gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', color: '#1D4ED8', pill: 'PLACEMENT' },
  internship: { icon: '💼', label: 'Internships', gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#059669', pill: 'INTERNSHIP' },
  exam:       { icon: '📝', label: 'Exams & Tests', gradient: 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)', color: '#7C3AED', pill: 'EXAM' },
};

const STATUS_CFG = {
  registered:  { label: '📋 Registered',   bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  shortlisted: { label: '🌟 Shortlisted',  bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
  selected:    { label: '🎉 Selected!',    bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
  rejected:    { label: '✕ Not Selected', bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
};

function daysUntil(date) {
  const d = new Date(date);
  const now = new Date();
  return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
}

function EligibilityBreakdown({ opp }) {
  const e = opp.eligibility || {};
  const d = opp.eligibilityDetails || {};
  const items = [];
  if (Array.isArray(e.degrees) && e.degrees.length) items.push({ label: `Degree: ${e.degrees.join(', ')}`, pass: d.degree });
  if (Array.isArray(e.branches) && e.branches.length) items.push({ label: `Branch: ${e.branches.join(', ')}`, pass: d.branch });
  if (Array.isArray(e.passingYears) && e.passingYears.length) items.push({ label: `Batch: ${e.passingYears.join(', ')}`, pass: d.year });
  if (e.minCGPA != null) items.push({ label: `Min CGPA: ${e.minCGPA}`, pass: d.cgpa });
  if (Array.isArray(e.skills) && e.skills.length) items.push({ label: `Skills: ${e.skills.join(', ')}`, pass: d.skills });
  if (!items.length) return null;
  return (
    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 12px', marginTop: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#DC2626', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Eligibility Check</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ fontSize: 13, lineHeight: 1 }}>{it.pass ? '✅' : '❌'}</span>
            <span style={{ color: it.pass ? '#065F46' : '#991B1B', fontWeight: it.pass ? 600 : 700 }}>{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OpportunityCard({ opp, onRegister, onWithdraw, registering, withdrawing }) {
  const navigate = useNavigate();
  const cfg = TYPE_CFG[opp.opportunityType] || TYPE_CFG.placement;
  const regCfg = opp.myStatus ? STATUS_CFG[opp.myStatus] : null;
  const driveDays = daysUntil(opp.driveDate);
  const deadlineDays = opp.registrationDeadline ? daysUntil(opp.registrationDeadline) : null;
  const canRegister = (opp.isEligible || opp.notifiedOverride) && !opp.myStatus && !opp.deadlinePassed && opp.status !== 'cancelled' && opp.status !== 'completed';
  const canWithdraw = opp.myStatus === 'registered';

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${cfg.color}25`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', background: '#fff' }}>
      {/* Type banner header */}
      <div style={{ background: cfg.gradient, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.2))' }}>{cfg.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{cfg.label}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opp.title}</div>
          {opp.companyName && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.82)', marginTop: 1 }}>{opp.companyName}</div>}
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 20, padding: '4px 10px', letterSpacing: '0.04em', flexShrink: 0, backdropFilter: 'blur(4px)', whiteSpace: 'nowrap' }}>
          {opp.status.toUpperCase()}
        </span>
      </div>

      {/* Card body */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Meta */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12.5, color: '#6B7280' }}>
          <span>🗓️ {new Date(opp.driveDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <span>• {opp.mode}</span>
          {opp.location && <span>• 📍 {opp.location}</span>}
          {opp.opportunityType === 'exam' && opp.examProvider && <span>• {opp.examProvider}</span>}
        </div>

        {/* Countdown + deadline */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {driveDays > 0 && driveDays <= 30 && (
            <span style={{ fontSize: 11, fontWeight: 700, background: driveDays <= 3 ? '#FEF2F2' : '#EFF6FF', color: driveDays <= 3 ? '#DC2626' : '#1D4ED8', borderRadius: 20, padding: '3px 10px', border: `1px solid ${driveDays <= 3 ? '#FECACA' : '#BFDBFE'}` }}>
              ⏱ Drive in {driveDays} day{driveDays !== 1 ? 's' : ''}
            </span>
          )}
          {opp.deadlinePassed ? (
            <span style={{ fontSize: 11, fontWeight: 700, background: '#FEF2F2', color: '#DC2626', borderRadius: 20, padding: '3px 10px', border: '1px solid #FECACA' }}>🔒 Registration Closed</span>
          ) : deadlineDays != null && deadlineDays <= 7 ? (
            <span style={{ fontSize: 11, fontWeight: 700, background: '#FFFBEB', color: '#B45309', borderRadius: 20, padding: '3px 10px', border: '1px solid #FDE68A' }}>
              ⚡ Register by {new Date(opp.registrationDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ({deadlineDays}d left)
            </span>
          ) : opp.registrationDeadline ? (
            <span style={{ fontSize: 11, color: '#6B7280', borderRadius: 20, padding: '3px 10px', background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              📋 Register by {new Date(opp.registrationDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          ) : null}
          {opp.registeredCount > 0 && (
            <span style={{ fontSize: 11, color: '#6B7280', borderRadius: 20, padding: '3px 10px', background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              👥 {opp.registeredCount} registered
            </span>
          )}
        </div>

        {opp.description && (
          <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.55 }}>{opp.description}</p>
        )}

        {/* Eligibility / Status section */}
        {opp.notifiedOverride && !opp.myStatus && (
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#1D4ED8', fontWeight: 700 }}>
            📬 You were personally invited by your placement office for this opportunity.
          </div>
        )}
        {opp.isEligible && !opp.notifiedOverride && !opp.myStatus && (
          <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#065F46', fontWeight: 700 }}>
            ✅ You meet all eligibility criteria for this opportunity.
          </div>
        )}
        {!opp.isEligible && !opp.notifiedOverride && <EligibilityBreakdown opp={opp} />}

        {/* Registration status / action buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 2 }}>
          {regCfg ? (
            <>
              <span style={{ fontSize: 12.5, fontWeight: 800, padding: '6px 14px', borderRadius: 8, background: regCfg.bg, color: regCfg.color, border: `1.5px solid ${regCfg.border}` }}>
                {regCfg.label}
              </span>
              {canWithdraw && (
                <button
                  disabled={withdrawing}
                  onClick={() => onWithdraw(opp.id)}
                  style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: withdrawing ? 0.6 : 1 }}>
                  {withdrawing ? 'Withdrawing…' : 'Withdraw'}
                </button>
              )}
            </>
          ) : canRegister ? (
            <button
              disabled={registering}
              onClick={() => onRegister(opp.id)}
              style={{ ...btnP, fontSize: 13, padding: '8px 20px', opacity: registering ? 0.7 : 1, boxShadow: '0 2px 8px rgba(1,118,211,0.25)' }}>
              {registering ? 'Registering…' : '✅ Register Now'}
            </button>
          ) : opp.deadlinePassed && !opp.myStatus ? (
            <span style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>Registration period has ended.</span>
          ) : null}

          {opp.opportunityType === 'exam' && opp.assessmentId && (
            <button style={btnG} onClick={() => navigate(`/app/assessment/${opp.assessmentId}`)}>📝 Take Test</button>
          )}
          {opp.opportunityType === 'exam' && opp.registrationLink && (
            <a href={opp.registrationLink} target="_blank" rel="noreferrer">
              <button style={btnG}>🔗 External Registration</button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function TrainingResourcesTab() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCandidateTrainingResources()
      .then(r => setResources(r?.data || []))
      .catch(e => setError(e.message || 'Failed to load training resources'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, display: 'flex', gap: 10, color: '#706E6B' }}><Spinner /> Loading resources…</div>;
  if (error) return <div style={{ color: '#BA0517', padding: 40 }}>{error}</div>;
  if (!resources.length) return (
    <div style={{ ...card, textAlign: 'center', padding: 48, color: '#706E6B' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>📚</div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>No resources yet</div>
      <div style={{ fontSize: 13 }}>Your placement office hasn't added any training resources yet. Check back soon.</div>
    </div>
  );

  const CATEGORY_ICONS = { Aptitude: '🔢', Coding: '💻', Verbal: '📖', Reasoning: '🧠', Interview: '🎤', Other: '📎' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
      {resources.map(r => (
        <a key={r.id} href={r.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer', transition: 'box-shadow 0.15s', border: '1px solid #E5E7EB' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>{CATEGORY_ICONS[r.category] || '📎'}</span>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#181818' }}>{r.title}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#0176D3', background: '#EFF6FF', borderRadius: 20, padding: '2px 10px', flexShrink: 0 }}>{r.category}</span>
            </div>
            {r.description && <div style={{ fontSize: 12, color: '#706E6B', lineHeight: 1.5 }}>{r.description}</div>}
            <div style={{ fontSize: 11, color: '#0176D3', fontWeight: 700, marginTop: 4 }}>Open Resource →</div>
          </div>
        </a>
      ))}
    </div>
  );
}

function RecommendedCoursesTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCandidateSkillRecommendations()
      .then(r => setData(r?.data || null))
      .catch(e => setError(e.message || 'Failed to load recommendations'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, display: 'flex', gap: 10, color: '#706E6B' }}><Spinner /> Loading recommendations…</div>;
  if (error) return <div style={{ color: '#BA0517', padding: 40 }}>{error}</div>;

  const recs = data?.recommendations || [];
  if (!recs.length) return (
    <div style={{ ...card, textAlign: 'center', padding: 48, color: '#706E6B' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🌟</div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>You're ahead of the curve!</div>
      <div style={{ fontSize: 13 }}>You're already covering the most in-demand skills on TalentNest. Check back as new jobs are posted.</div>
    </div>
  );

  return (
    <div>
      <p style={{ fontSize: 13, color: '#706E6B', margin: '0 0 16px', lineHeight: 1.6 }}>
        Skills most requested by active jobs on TalentNest that aren't yet on your profile — sorted by demand. Add them to unlock more matching opportunities.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {recs.map(g => (
          <div key={g.skill} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#181818' }}>{g.skill}</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#0176D3', background: '#EFF6FF', borderRadius: 20, padding: '3px 10px', border: '1px solid #BFDBFE' }}>
                {g.demandCount} job{g.demandCount === 1 ? '' : 's'} want this
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(g.courses || []).map((c, i) => (
                <a key={i} href={c.url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: '#0176D3', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #E5E7EB' }}>
                  <span style={{ fontSize: 14 }}>📘</span>
                  <span><strong>{c.title}</strong> — {c.provider}</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const TABS = [
  { id: 'placement', icon: '🎯', label: 'Placements' },
  { id: 'internship', icon: '💼', label: 'Internships' },
  { id: 'exam', icon: '📝', label: 'Exams & Tests' },
  { id: 'training', icon: '📚', label: 'Training' },
  { id: 'courses', icon: '📈', label: 'Courses' },
];

export default function CandidateOpportunities() {
  const [tab, setTab] = useState('placement');
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registering, setRegistering] = useState({});
  const [withdrawing, setWithdrawing] = useState({});

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    api.getCandidateOpportunities()
      .then(r => setOpportunities(r?.data || []))
      .catch(e => { if (!silent) setError(e.message || 'Failed to load opportunities'); })
      .finally(() => { if (!silent) setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);
  usePlatformEvents({ 'drive:registrationChanged': () => load(true) });

  const register = async (id) => {
    setRegistering(prev => ({ ...prev, [id]: true }));
    try {
      const res = await api.registerForOpportunity(id);
      setOpportunities(prev => prev.map(o => o.id === id ? { ...o, myStatus: 'registered', registeredCount: (o.registeredCount || 0) + 1 } : o));
      if (res?.data?.application?.jobTitle) {
        window.alert(`✅ Registered! You've also been added to the "${res.data.application.jobTitle}" pipeline. Track it under My Applications.`);
      }
    } catch (e) {
      window.alert(e.message || 'Registration failed. Please try again.');
    } finally {
      setRegistering(prev => ({ ...prev, [id]: false }));
    }
  };

  const withdraw = async (id) => {
    if (!window.confirm('Withdraw your registration for this opportunity?')) return;
    setWithdrawing(prev => ({ ...prev, [id]: true }));
    try {
      await api.withdrawFromOpportunity(id);
      setOpportunities(prev => prev.map(o => o.id === id ? { ...o, myStatus: null, registeredCount: Math.max(0, (o.registeredCount || 1) - 1) } : o));
    } catch (e) {
      window.alert(e.message || 'Failed to withdraw. Please try again.');
    } finally {
      setWithdrawing(prev => ({ ...prev, [id]: false }));
    }
  };

  const oppTabs = ['placement', 'internship', 'exam'];
  const counts = {};
  opportunities.forEach(o => { const t = o.opportunityType || 'placement'; counts[t] = (counts[t] || 0) + 1; });

  const filtered = opportunities.filter(o => (o.opportunityType || 'placement') === tab);

  const EMPTY_MSGS = {
    placement: { icon: '🎯', title: 'No placement drives yet', sub: 'Your placement office will post campus drives here. You\'ll get a notification when one goes live.' },
    internship: { icon: '💼', title: 'No internship drives yet', sub: 'Internship opportunities from companies will appear here once your placement office creates them.' },
    exam: { icon: '📝', title: 'No exams scheduled', sub: 'TCS NQT, AMCAT, and other exam registrations will appear here when your placement office schedules them.' },
  };

  return (
    <div>
      <PageHeader
        title="🎯 Opportunities"
        subtitle="Placement drives, internships, exams and resources curated by your placement office."
      />

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => {
          const count = counts[t.id];
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 20, border: tab === t.id ? 'none' : '1.5px solid #E5E7EB', background: tab === t.id ? '#0176D3' : '#fff', color: tab === t.id ? '#fff' : '#374151', fontSize: 13, fontWeight: tab === t.id ? 700 : 500, cursor: 'pointer', transition: 'all 0.12s' }}>
              {t.icon} {t.label}
              {count != null && oppTabs.includes(t.id) && (
                <span style={{ fontSize: 10, fontWeight: 800, background: tab === t.id ? 'rgba(255,255,255,0.3)' : '#F3F4F6', color: tab === t.id ? '#fff' : '#6B7280', borderRadius: 20, padding: '1px 7px', marginLeft: 2 }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'training' ? <TrainingResourcesTab /> :
       tab === 'courses' ? <RecommendedCoursesTab /> :
       loading ? (
        <div style={{ padding: 40, display: 'flex', gap: 10, color: '#706E6B' }}><Spinner /> Loading opportunities…</div>
       ) : error ? (
        <div style={{ color: '#BA0517', padding: 40 }}>{error}</div>
       ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 56, maxWidth: 480, margin: '0 auto' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{EMPTY_MSGS[tab]?.icon || '📋'}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#181818', marginBottom: 6 }}>{EMPTY_MSGS[tab]?.title}</div>
          <div style={{ fontSize: 13, color: '#706E6B', lineHeight: 1.6 }}>{EMPTY_MSGS[tab]?.sub}</div>
        </div>
       ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map(opp => (
            <OpportunityCard
              key={opp.id}
              opp={opp}
              onRegister={register}
              onWithdraw={withdraw}
              registering={!!registering[opp.id]}
              withdrawing={!!withdrawing[opp.id]}
            />
          ))}
        </div>
       )
      }
    </div>
  );
}
