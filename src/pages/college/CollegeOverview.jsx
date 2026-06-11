import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { card } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const STAT_S = {
  background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12,
  padding: 20, display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden',
};

const STAT_LABEL = { fontSize: 12, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: '0.04em' };
const STAT_VALUE = { fontSize: 32, fontWeight: 800, color: '#181818' };

const STATS = [
  { key: 'totalStudents',     label: 'Total Students',     icon: '🎓', color: '#0176D3', to: '/app/candidates' },
  { key: 'currentStudents',   label: 'Current Students',   icon: '📚', color: '#16A34A', to: '/app/candidates?type=student' },
  { key: 'alumniCount',       label: 'Alumni',              icon: '🧑‍🎓', color: '#7C3AED', to: '/app/candidates?type=alumni' },
  { key: 'totalApplications', label: 'Total Applications',  icon: '📝', color: '#0891B2', to: '/app/applicants' },
  { key: 'totalPlacements',   label: 'Placements',          icon: '💼', color: '#D97706', to: '/app/applicants?stage=Hired' },
  { key: 'placementRate',     label: 'Placement Rate',      icon: '📈', color: '#16A34A', suffix: '%', to: '/app/applicants?stage=Hired' },
  { key: 'upcomingInterviews',label: 'Upcoming Interviews', icon: '🗓️', color: '#DB2777', to: '/app/applicants?stage=Interview' },
];

const inputS = { width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit' };
const btnP = { background: '#0176D3', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, padding: '10px 24px', cursor: 'pointer', fontSize: 13 };

export default function CollegeOverview({ user }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [announcement, setAnnouncement] = useState({ title: '', message: '', link: '' });
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState('');
  const [sendError, setSendError] = useState('');

  const [skillGaps, setSkillGaps] = useState([]);
  const [skillGapsLoading, setSkillGapsLoading] = useState(true);

  useEffect(() => {
    api.getCollegeOverview()
      .then(r => setData(r?.data || r))
      .catch(e => setError(e.message || 'Failed to load overview'))
      .finally(() => setLoading(false));

    api.getCollegeSkillGaps()
      .then(r => setSkillGaps((r?.data || r) || []))
      .catch(() => setSkillGaps([]))
      .finally(() => setSkillGapsLoading(false));
  }, []);

  const sendAnnouncement = async () => {
    if (!announcement.title.trim() || !announcement.message.trim()) return;
    setSending(true); setSendResult(''); setSendError('');
    try {
      const res = await api.sendCollegeAnnouncement(announcement.title.trim(), announcement.message.trim(), announcement.link.trim() || undefined);
      setSendResult(res?.message || `Sent to ${res?.recipients ?? 0} student${res?.recipients === 1 ? '' : 's'}.`);
      setAnnouncement({ title: '', message: '', link: '' });
    } catch (e) {
      setSendError(e.message || 'Failed to send announcement');
    }
    setSending(false);
  };

  if (loading) return <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10 }}><Spinner /> Loading...</div>;
  if (error) return <div style={{ color: '#BA0517', padding: 40 }}>{error}</div>;

  const maxDept = Math.max(1, ...(data?.departmentBreakdown || []).map(d => d.count));
  const maxYear = Math.max(1, ...(data?.yearBreakdown || []).map(y => y.count));

  return (
    <div>
      <PageHeader
        title={`🎓 ${data?.collegeName || 'Campus'} — Placement Overview`}
        subtitle="Track your students, their job applications, and placement outcomes across the TalentNest platform."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        {STATS.map(s => (
          <div
            key={s.key}
            style={{ ...STAT_S, cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s' }}
            onClick={() => navigate(s.to)}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
            title="Click to view details"
          >
            <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 56, opacity: 0.08 }}>{s.icon}</div>
            <span style={STAT_LABEL}>{s.icon} {s.label}</span>
            <span style={{ ...STAT_VALUE, color: s.color }}>{data?.[s.key] ?? 0}{s.suffix || ''}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* Department breakdown */}
        <div style={card}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#181818' }}>Students by Department</h3>
          {(data?.departmentBreakdown || []).length === 0 && <p style={{ margin: 0, fontSize: 13, color: '#9E9D9B' }}>No department data yet.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(data?.departmentBreakdown || []).map(d => (
              <div
                key={d.name}
                onClick={() => navigate(`/app/candidates?dept=${encodeURIComponent(d.name)}`)}
                style={{ cursor: 'pointer' }}
                title={`View students in ${d.name}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#181818', marginBottom: 4 }}>
                  <span>{d.name}</span><span style={{ fontWeight: 700 }}>{d.count}</span>
                </div>
                <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(d.count / maxDept) * 100}%`, background: '#0176D3', borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Batch / passing year breakdown */}
        <div style={card}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#181818' }}>Students by Batch (Passing Year)</h3>
          {(data?.yearBreakdown || []).length === 0 && <p style={{ margin: 0, fontSize: 13, color: '#9E9D9B' }}>No batch data yet.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(data?.yearBreakdown || []).map(y => (
              <div
                key={y.year}
                onClick={() => navigate(`/app/candidates?year=${encodeURIComponent(y.year)}`)}
                style={{ cursor: 'pointer' }}
                title={`View students from batch ${y.year}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#181818', marginBottom: 4 }}>
                  <span>{y.year}</span><span style={{ fontWeight: 700 }}>{y.count}</span>
                </div>
                <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(y.count / maxYear) * 100}%`, background: '#16A34A', borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Placement rate by batch */}
        <div style={card}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#181818' }}>Placement Rate by Batch</h3>
          {(data?.placementRateByBatch || []).length === 0 && <p style={{ margin: 0, fontSize: 13, color: '#9E9D9B' }}>No batch data yet.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(data?.placementRateByBatch || []).map(b => (
              <div
                key={b.year}
                onClick={() => navigate(`/app/candidates?year=${encodeURIComponent(b.year)}`)}
                style={{ cursor: 'pointer' }}
                title={`View students from batch ${b.year}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#181818', marginBottom: 4 }}>
                  <span>{b.year}</span>
                  <span style={{ fontWeight: 700 }}>{b.placed}/{b.total} placed · {b.rate}%</span>
                </div>
                <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${b.rate}%`, background: '#D97706', borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* Recent placements */}
        <div style={card}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#181818' }}>Recent Placements</h3>
          {(data?.recentPlacements || []).length === 0 && <p style={{ margin: 0, fontSize: 13, color: '#9E9D9B' }}>No placements recorded yet.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(data?.recentPlacements || []).map((p, i) => (
              <div
                key={i}
                onClick={() => navigate(`/app/applicants?stage=Hired${p.studentName ? `&q=${encodeURIComponent(p.studentName)}` : ''}`)}
                style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: 8, cursor: 'pointer' }}
                title="View placement record"
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#181818' }}>{p.studentName || '—'}</div>
                <div style={{ fontSize: 12, color: '#706E6B' }}>{p.jobTitle || 'Role'} @ {p.company || 'Company'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top hiring companies */}
        <div style={card}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#181818' }}>Top Hiring Companies</h3>
          {(data?.topCompanies || []).length === 0 && <p style={{ margin: 0, fontSize: 13, color: '#9E9D9B' }}>No hiring data yet.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(data?.topCompanies || []).map(c => (
              <div
                key={c.name}
                onClick={() => navigate(`/app/applicants?stage=Hired&company=${encodeURIComponent(c.name)}`)}
                style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#181818', cursor: 'pointer' }}
                title={`View students placed at ${c.name}`}
              >
                <span>{c.name}</span>
                <span style={{ fontWeight: 700, color: '#0176D3' }}>{c.count} hire{c.count === 1 ? '' : 's'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent signups */}
        <div style={card}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#181818' }}>Recently Joined Students</h3>
          {(data?.recentStudents || []).length === 0 && <p style={{ margin: 0, fontSize: 13, color: '#9E9D9B' }}>No students yet.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(data?.recentStudents || []).map((s, i) => (
              <div
                key={i}
                onClick={() => navigate(`/app/candidates?q=${encodeURIComponent(s.email || s.name || '')}`)}
                style={{ fontSize: 13, color: '#181818', cursor: 'pointer' }}
                title="View student profile"
              >
                <strong>{s.name || '—'}</strong>
                <div style={{ fontSize: 11, color: '#9E9D9B' }}>{s.email}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Skill gap analysis & course recommendations */}
      <div style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#181818' }}>📊 Skill Gap Analysis &amp; Course Recommendations</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#706E6B' }}>
          Skills most in-demand across active jobs on TalentNest, compared with how many of your students currently have them. Share these courses with students to help close the gap.
        </p>
        {skillGapsLoading ? (
          <div style={{ color: '#706E6B', display: 'flex', gap: 10 }}><Spinner /> Loading...</div>
        ) : skillGaps.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: '#9E9D9B' }}>No skill gap data available yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {skillGaps.map(g => (
              <div key={g.skill} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#181818' }}>{g.skill}</span>
                  <span style={{ fontSize: 11, color: '#9E9D9B' }}>{g.demandCount} job{g.demandCount === 1 ? '' : 's'} want this</span>
                </div>
                <div style={{ fontSize: 12, color: '#706E6B', marginBottom: 8 }}>
                  Only <strong>{g.coveragePct}%</strong> of your students ({g.studentsWithSkill}) list this skill.
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
        )}
      </div>

      {/* Announcement composer */}
      <div style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#181818' }}>📢 Send Announcement to Your Students</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#706E6B' }}>
          Broadcast a notification to every student and alumnus registered under "{data?.collegeName}". They'll see it in their notifications feed.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520 }}>
          <input style={inputS} placeholder="Title" value={announcement.title} onChange={e => setAnnouncement(a => ({ ...a, title: e.target.value }))} />
          <textarea style={{ ...inputS, resize: 'vertical' }} rows={3} placeholder="Message" value={announcement.message} onChange={e => setAnnouncement(a => ({ ...a, message: e.target.value }))} />
          <input style={inputS} placeholder="Link (optional, e.g. /app/feed)" value={announcement.link} onChange={e => setAnnouncement(a => ({ ...a, link: e.target.value }))} />
          <div>
            <button
              style={{ ...btnP, opacity: (!announcement.title.trim() || !announcement.message.trim() || sending) ? 0.6 : 1 }}
              disabled={!announcement.title.trim() || !announcement.message.trim() || sending}
              onClick={sendAnnouncement}
            >
              {sending ? '⏳ Sending...' : '📨 Send Announcement'}
            </button>
          </div>
          {sendResult && <div style={{ color: '#16A34A', fontSize: 13 }}>{sendResult}</div>}
          {sendError && <div style={{ color: '#BA0517', fontSize: 13 }}>{sendError}</div>}
        </div>
      </div>

      <div style={{ ...card }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#181818' }}>Getting Started</h3>
        <p style={{ margin: 0, fontSize: 13, color: '#706E6B', lineHeight: 1.6 }}>
          Students show up here automatically once they register on TalentNest and enter
          "<strong>{data?.collegeName}</strong>" as their College / School Name during sign-up
          or in their profile. Use the <strong>Students</strong> tab to view your registered
          students and the <strong>Placement Records</strong> tab to track their applications
          and placement status across companies hiring on the platform.
        </p>
      </div>
    </div>
  );
}
