import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { card } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const STAT_S = {
  background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12,
  padding: 20, display: 'flex', flexDirection: 'column', gap: 6,
};

const STAT_LABEL = { fontSize: 12, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: '0.04em' };
const STAT_VALUE = { fontSize: 32, fontWeight: 800, color: '#181818' };

const inputS = { width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit' };
const btnP = { background: '#0176D3', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, padding: '10px 24px', cursor: 'pointer', fontSize: 13 };

export default function CollegeOverview({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [announcement, setAnnouncement] = useState({ title: '', message: '', link: '' });
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState('');
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    api.getCollegeOverview()
      .then(r => setData(r?.data || r))
      .catch(e => setError(e.message || 'Failed to load overview'))
      .finally(() => setLoading(false));
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
        <div style={STAT_S}>
          <span style={STAT_LABEL}>Total Students</span>
          <span style={STAT_VALUE}>{data?.totalStudents ?? 0}</span>
        </div>
        <div style={STAT_S}>
          <span style={STAT_LABEL}>Current Students</span>
          <span style={STAT_VALUE}>{data?.currentStudents ?? 0}</span>
        </div>
        <div style={STAT_S}>
          <span style={STAT_LABEL}>Alumni</span>
          <span style={STAT_VALUE}>{data?.alumniCount ?? 0}</span>
        </div>
        <div style={STAT_S}>
          <span style={STAT_LABEL}>Total Applications</span>
          <span style={STAT_VALUE}>{data?.totalApplications ?? 0}</span>
        </div>
        <div style={STAT_S}>
          <span style={STAT_LABEL}>Placements</span>
          <span style={STAT_VALUE}>{data?.totalPlacements ?? 0}</span>
        </div>
        <div style={STAT_S}>
          <span style={STAT_LABEL}>Placement Rate</span>
          <span style={STAT_VALUE}>{data?.placementRate ?? 0}%</span>
        </div>
        <div style={STAT_S}>
          <span style={STAT_LABEL}>Upcoming Interviews</span>
          <span style={STAT_VALUE}>{data?.upcomingInterviews ?? 0}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* Department breakdown */}
        <div style={card}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#181818' }}>Students by Department</h3>
          {(data?.departmentBreakdown || []).length === 0 && <p style={{ margin: 0, fontSize: 13, color: '#9E9D9B' }}>No department data yet.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(data?.departmentBreakdown || []).map(d => (
              <div key={d.name}>
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
              <div key={y.year}>
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
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* Recent placements */}
        <div style={card}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#181818' }}>Recent Placements</h3>
          {(data?.recentPlacements || []).length === 0 && <p style={{ margin: 0, fontSize: 13, color: '#9E9D9B' }}>No placements recorded yet.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(data?.recentPlacements || []).map((p, i) => (
              <div key={i} style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
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
              <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#181818' }}>
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
              <div key={i} style={{ fontSize: 13, color: '#181818' }}>
                <strong>{s.name || '—'}</strong>
                <div style={{ fontSize: 11, color: '#9E9D9B' }}>{s.email}</div>
              </div>
            ))}
          </div>
        </div>
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
