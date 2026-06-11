import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { card, btnG } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const REG_STATUSES = ['registered', 'shortlisted', 'selected', 'rejected'];
const REG_COLORS = {
  registered: { bg: '#F1F5F9', color: '#475569' },
  shortlisted: { bg: 'rgba(245,158,11,0.12)', color: '#B45309' },
  selected: { bg: 'rgba(22,163,74,0.1)', color: '#16A34A' },
  rejected: { bg: 'rgba(186,5,23,0.08)', color: '#BA0517' },
};

const OPPORTUNITY_TYPE_LABELS = {
  placement: '🎯 Placement Drive',
  internship: '💼 Internship',
  exam: '📝 Exam / Test',
};

export default function CollegeDriveDetail() {
  const { driveId } = useParams();
  const navigate = useNavigate();
  const [drive, setDrive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.getPlacementDrive(driveId)
      .then(r => setDrive(r?.data || null))
      .catch(e => setError(e.message || 'Failed to load drive'))
      .finally(() => setLoading(false));
  }, [driveId]);

  const updateStatus = async (candidateId, status) => {
    setDrive(d => ({ ...d, registrations: d.registrations.map(r => r.candidateId === candidateId ? { ...r, status } : r) }));
    try {
      await api.updatePlacementDriveRegistration(driveId, candidateId, { status });
    } catch { /* optimistic — already updated locally */ }
  };

  const regs = (drive?.registrations || []).filter(r => !filter || r.status === filter);
  const typeLabel = drive ? (OPPORTUNITY_TYPE_LABELS[drive.opportunityType] || OPPORTUNITY_TYPE_LABELS.placement) : '';

  return (
    <div>
      <button onClick={() => navigate('/app/drives')} style={{ ...btnG, marginBottom: 12 }}>← Back to Placement Drives</button>

      {loading ? (
        <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10, justifyContent: 'center' }}><Spinner /> Loading...</div>
      ) : error ? (
        <div style={{ color: '#BA0517', padding: 40 }}>{error}</div>
      ) : !drive ? (
        <div style={{ color: '#706E6B', padding: 40 }}>Placement drive not found.</div>
      ) : (
        <>
          <PageHeader
            title={drive.title}
            subtitle={typeLabel}
          />

          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: drive.description ? 8 : 0, fontSize: 13, color: '#706E6B' }}>
              <span>🗓️ {new Date(drive.driveDate).toLocaleDateString()}</span>
              <span>• {drive.mode}</span>
              {drive.companyName && <span>• 🏢 {drive.companyName}</span>}
              {drive.location && <span>• 📍 {drive.location}</span>}
              {drive.examProvider && <span>• {drive.examProvider}</span>}
            </div>
            {drive.description && <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>{drive.description}</p>}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <button onClick={() => setFilter('')} style={{ ...btnG, padding: '4px 12px', fontSize: 12, background: !filter ? 'var(--app-primary,#0176D3)' : '#fff', color: !filter ? '#fff' : '#0176D3' }}>All ({drive.registrations.length})</button>
            {REG_STATUSES.map(s => {
              const count = drive.registrations.filter(r => r.status === s).length;
              return (
                <button key={s} onClick={() => setFilter(s)} style={{ ...btnG, padding: '4px 12px', fontSize: 12, textTransform: 'capitalize', background: filter === s ? 'var(--app-primary,#0176D3)' : '#fff', color: filter === s ? '#fff' : '#0176D3' }}>{s} ({count})</button>
              );
            })}
          </div>

          <div style={card}>
            {regs.length === 0 ? (
              <div style={{ color: '#706E6B', padding: 40, textAlign: 'center', fontSize: 14 }}>No eligible students found for this drive's criteria.</div>
            ) : regs.map(r => {
              const rc = REG_COLORS[r.status];
              return (
                <div key={r.candidateId} style={{ padding: '12px 0', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#181818' }}>{r.name || r.email}</div>
                    <div style={{ fontSize: 12, color: '#706E6B' }}>{r.email}{r.branch ? ` · ${r.branch}` : ''}{r.year ? ` (${r.year})` : ''}</div>
                  </div>
                  <select value={r.status} onChange={e => updateStatus(r.candidateId, e.target.value)}
                    style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8, border: 'none', background: rc.bg, color: rc.color, textTransform: 'capitalize', cursor: 'pointer' }}>
                    {REG_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
