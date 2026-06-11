import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { btnP, btnG, card } from '../../constants/styles.js';

const TABS = [
  { id: 'placement', icon: '🎯', label: 'Placements' },
  { id: 'internship', icon: '💼', label: 'Internships' },
  { id: 'exam', icon: '📝', label: 'Exams & Tests' },
  { id: 'training', icon: '📚', label: 'Training Resources' },
  { id: 'courses', icon: '📈', label: 'Recommended Courses' },
];

const STATUS_COLORS = {
  upcoming: { bg: 'rgba(1,118,211,0.1)', color: '#0176D3' },
  ongoing: { bg: 'rgba(245,158,11,0.12)', color: '#B45309' },
  completed: { bg: 'rgba(22,163,74,0.1)', color: '#16A34A' },
  cancelled: { bg: 'rgba(186,5,23,0.08)', color: '#BA0517' },
};

const REG_COLORS = {
  registered: { bg: '#F1F5F9', color: '#475569' },
  shortlisted: { bg: 'rgba(245,158,11,0.12)', color: '#B45309' },
  selected: { bg: 'rgba(22,163,74,0.1)', color: '#16A34A' },
  rejected: { bg: 'rgba(186,5,23,0.08)', color: '#BA0517' },
};

function OpportunityCard({ opp, onRegister, registering }) {
  const navigate = useNavigate();
  const sc = STATUS_COLORS[opp.status] || STATUS_COLORS.upcoming;
  const rc = opp.myStatus ? REG_COLORS[opp.myStatus] : null;

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#181818' }}>{opp.title}</h3>
          <div style={{ fontSize: 13, color: '#706E6B', marginTop: 2 }}>{opp.companyName || 'In-house'}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: sc.bg, color: sc.color, textTransform: 'capitalize' }}>{opp.status}</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 12, color: '#706E6B' }}>
        <span>🗓️ {new Date(opp.driveDate).toLocaleDateString()}</span>
        <span>• {opp.mode}</span>
        {opp.location && <span>• 📍 {opp.location}</span>}
        {opp.opportunityType === 'exam' && opp.examProvider && <span>• {opp.examProvider}</span>}
      </div>

      {opp.description && <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>{opp.description}</p>}

      {!opp.isEligible && (
        <div style={{ fontSize: 12, color: '#BA0517', fontWeight: 600 }}>You don't meet the eligibility criteria for this opportunity.</div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
        {opp.myStatus ? (
          <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 8, background: rc.bg, color: rc.color, textTransform: 'capitalize' }}>
            Status: {opp.myStatus}
          </span>
        ) : opp.isEligible && (
          <button style={{ ...btnP, opacity: registering ? 0.6 : 1 }} disabled={registering} onClick={() => onRegister(opp.id)}>
            {registering ? 'Registering...' : '✅ Register'}
          </button>
        )}

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

  if (loading) return <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10 }}><Spinner /> Loading...</div>;
  if (error) return <div style={{ color: '#BA0517', padding: 40 }}>{error}</div>;
  if (resources.length === 0) {
    return (
      <div style={{ ...card, color: '#706E6B', padding: 40, textAlign: 'center', fontSize: 14 }}>
        No training resources have been added by your placement office yet.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
      {resources.map(r => (
        <div key={r.id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#181818' }}>{r.title}</h4>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0176D3', background: 'rgba(1,118,211,0.08)', borderRadius: 999, padding: '2px 10px' }}>{r.category}</span>
          </div>
          {r.description && <div style={{ fontSize: 12, color: '#706E6B' }}>{r.description}</div>}
          <a href={r.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#0176D3', fontWeight: 700, wordBreak: 'break-all' }}>{r.url}</a>
        </div>
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
      .catch(e => setError(e.message || 'Failed to load course recommendations'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10 }}><Spinner /> Loading...</div>;
  if (error) return <div style={{ color: '#BA0517', padding: 40 }}>{error}</div>;

  const recs = data?.recommendations || [];
  if (recs.length === 0) {
    return (
      <div style={{ ...card, color: '#706E6B', padding: 40, textAlign: 'center', fontSize: 14 }}>
        You're already covering the most in-demand skills on the platform. Check back later for new recommendations.
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: '#706E6B', margin: '0 0 12px' }}>
        Skills most requested by active jobs on TalentNest that aren't yet on your profile — sorted by how many open roles want them. Add courses to your skillset to unlock more matching jobs.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {recs.map(g => (
          <div key={g.skill} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#181818' }}>{g.skill}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0176D3', background: 'rgba(1,118,211,0.08)', borderRadius: 999, padding: '2px 10px' }}>
                {g.demandCount} job{g.demandCount === 1 ? '' : 's'} want this
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(g.courses || []).map((c, i) => (
                <a key={i} href={c.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#0176D3', textDecoration: 'none' }}>
                  📘 {c.title} — {c.provider}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CandidateOpportunities() {
  const [tab, setTab] = useState('placement');
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registering, setRegistering] = useState({});

  const load = () => {
    setLoading(true);
    api.getCandidateOpportunities()
      .then(r => setOpportunities(r?.data || []))
      .catch(e => setError(e.message || 'Failed to load opportunities'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const register = async (id) => {
    setRegistering(prev => ({ ...prev, [id]: true }));
    try {
      await api.registerForOpportunity(id);
      setOpportunities(prev => prev.map(o => o.id === id ? { ...o, myStatus: 'registered' } : o));
    } catch (e) {
      window.alert(e.message || 'Failed to register');
    } finally {
      setRegistering(prev => ({ ...prev, [id]: false }));
    }
  };

  const filtered = opportunities.filter(o => (o.opportunityType || 'placement') === tab);

  return (
    <div>
      <PageHeader
        title="🎯 Opportunities"
        subtitle="Placement drives, internships, exams and training resources curated by your college's placement office."
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ ...btnG, background: tab === t.id ? 'var(--app-primary,#0176D3)' : '#fff', color: tab === t.id ? '#fff' : '#0176D3' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'training' ? (
        <TrainingResourcesTab />
      ) : tab === 'courses' ? (
        <RecommendedCoursesTab />
      ) : loading ? (
        <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10 }}><Spinner /> Loading...</div>
      ) : error ? (
        <div style={{ color: '#BA0517', padding: 40 }}>{error}</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, color: '#706E6B', padding: 40, textAlign: 'center', fontSize: 14 }}>
          No {TABS.find(t => t.id === tab)?.label.toLowerCase()} available right now. Check back soon.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map(opp => (
            <OpportunityCard key={opp.id} opp={opp} onRegister={register} registering={!!registering[opp.id]} />
          ))}
        </div>
      )}
    </div>
  );
}
