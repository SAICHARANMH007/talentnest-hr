import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { card } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const STAT_S = {
  background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12,
  padding: 20, display: 'flex', flexDirection: 'column', gap: 6,
};

export default function CollegeOverview({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCollegeOverview()
      .then(r => setData(r?.data || r))
      .catch(e => setError(e.message || 'Failed to load overview'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10 }}><Spinner /> Loading...</div>;
  if (error) return <div style={{ color: '#BA0517', padding: 40 }}>{error}</div>;

  return (
    <div>
      <PageHeader
        title={`🎓 ${data?.collegeName || 'Campus'} — Placement Overview`}
        subtitle="Track your students, their job applications, and placement outcomes across the TalentNest platform."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={STAT_S}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Students</span>
          <span style={{ fontSize: 32, fontWeight: 800, color: '#181818' }}>{data?.totalStudents ?? 0}</span>
        </div>
        <div style={STAT_S}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Applications</span>
          <span style={{ fontSize: 32, fontWeight: 800, color: '#181818' }}>{data?.totalApplications ?? 0}</span>
        </div>
        <div style={STAT_S}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Placements</span>
          <span style={{ fontSize: 32, fontWeight: 800, color: '#181818' }}>{data?.totalPlacements ?? 0}</span>
        </div>
        <div style={STAT_S}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Placement Rate</span>
          <span style={{ fontSize: 32, fontWeight: 800, color: '#181818' }}>{data?.placementRate ?? 0}%</span>
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
