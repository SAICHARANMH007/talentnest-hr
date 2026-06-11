import { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { card } from '../../constants/styles.js';

const STATUS_COLORS = {
  upcoming: { bg: 'rgba(1,118,211,0.1)', color: '#0176D3' },
  ongoing: { bg: 'rgba(245,158,11,0.12)', color: '#B45309' },
  completed: { bg: 'rgba(22,163,74,0.1)', color: '#16A34A' },
  cancelled: { bg: 'rgba(186,5,23,0.08)', color: '#BA0517' },
};

const OPPORTUNITY_TYPE_LABELS = {
  placement: '🎯 Placement Drive',
  internship: '💼 Internship',
  exam: '📝 Exam / Test',
};

export default function CompanyCollegeDrives() {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCompanyCollegeDrives()
      .then(r => setDrives(r?.data || []))
      .catch(e => setError(e.message || 'Failed to load college drives'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="🎓 College Placement Drives"
        subtitle="Placement drives, internships and exams your organization is conducting across colleges."
      />

      {loading && <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10 }}><Spinner /> Loading...</div>}
      {error && <div style={{ color: '#BA0517', padding: 40 }}>{error}</div>}

      {!loading && !error && (
        drives.length === 0 ? (
          <div style={{ ...card, color: '#706E6B', padding: 40, textAlign: 'center', fontSize: 14 }}>
            No placement drives found for your organization yet. When a college schedules a drive with your company name, it will show up here.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {drives.map(d => {
              const sc = STATUS_COLORS[d.status] || STATUS_COLORS.upcoming;
              return (
                <div key={d.id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#181818' }}>{d.title}</h3>
                      <div style={{ fontSize: 13, color: '#706E6B', marginTop: 2 }}>🎓 {d.collegeName || 'College'}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: sc.bg, color: sc.color, textTransform: 'capitalize' }}>{d.status}</span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0176D3', background: 'rgba(1,118,211,0.08)', borderRadius: 999, padding: '2px 10px' }}>
                      {OPPORTUNITY_TYPE_LABELS[d.opportunityType] || OPPORTUNITY_TYPE_LABELS.placement}
                    </span>
                    {d.examProvider && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#B45309', background: 'rgba(245,158,11,0.12)', borderRadius: 999, padding: '2px 10px' }}>{d.examProvider}</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 12, color: '#706E6B' }}>
                    <span>🗓️ {new Date(d.driveDate).toLocaleDateString()}</span>
                    <span>• {d.mode}</span>
                    {d.location && <span>• 📍 {d.location}</span>}
                  </div>

                  {d.description && <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>{d.description}</p>}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#181818' }}>👥 {d.registeredCount} registered</span>
                    {d.shortlistedCount > 0 && <span style={{ fontSize: 12, color: '#B45309' }}>📋 {d.shortlistedCount} shortlisted</span>}
                    {d.selectedCount > 0 && <span style={{ fontSize: 12, color: '#16A34A' }}>✅ {d.selectedCount} selected</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
