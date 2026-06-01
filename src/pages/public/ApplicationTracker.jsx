import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { req } from '../../api/client.js';

const STAGES = [
  { id: 'Applied',             label: 'Applied',            icon: '📝' },
  { id: 'Screening',           label: 'Screening',          icon: '🔍' },
  { id: 'Shortlisted',         label: 'Shortlisted',        icon: '⭐' },
  { id: 'Interview Scheduled', label: 'Interview',          icon: '📅' },
  { id: 'Interview Completed', label: 'Completed',          icon: '✅' },
  { id: 'Offer Extended',      label: 'Offer Extended',     icon: '🎉' },
  { id: 'Hired',               label: 'Hired',              icon: '🏆' },
];

const STATUS_COLORS = {
  active   : { bg: '#D1FAE5', color: '#065F46', label: 'Active' },
  hired    : { bg: '#D1FAE5', color: '#065F46', label: '🏆 Hired!' },
  rejected : { bg: '#FEE2E2', color: '#991B1B', label: 'Not Selected' },
  withdrawn: { bg: '#F3F4F6', color: '#6B7280', label: 'Withdrawn' },
};

export default function ApplicationTracker() {
  const { token } = useParams();
  const [data, setData]     = useState(null);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (!token) { setError('Invalid tracker link.'); setLoad(false); return; }
    req('GET', `/applications/status/${token}`)
      .then(r => { setData(r); setLoad(false); })
      .catch(() => { setError('Application not found or link expired.'); setLoad(false); });
  }, [token]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <div style={{ color: '#6B7280' }}>Loading your application status…</div>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h2 style={{ color: '#0A1628', marginBottom: 8 }}>Link Not Found</h2>
        <p style={{ color: '#6B7280' }}>{error}</p>
      </div>
    </div>
  );

  const statusInfo = STATUS_COLORS[data.status] || STATUS_COLORS.active;
  const currentIdx = STAGES.findIndex(s => s.id.toLowerCase() === (data.currentStage || '').toLowerCase());
  const isTerminal = data.status === 'rejected' || data.status === 'withdrawn' || data.status === 'hired';

  const stageMap = {};
  (data.stageHistory || []).forEach(h => { stageMap[h.stage?.toLowerCase()] = h.movedAt; });

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Plus Jakarta Sans',Arial,sans-serif" }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #032D60, #0176D3)', padding: '28px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>Application Status</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', margin: '6px 0 0', fontSize: 14 }}>
          {data.job.title} · {data.job.company}
        </p>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        {/* Job info card */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#0A1628' }}>{data.job.title}</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                {[data.job.company, data.job.location, data.job.type].filter(Boolean).join(' · ')}
              </div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                Applied {new Date(data.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <span style={{ background: statusInfo.bg, color: statusInfo.color, borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700 }}>
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* Stage timeline */}
        {!isTerminal || data.status === 'hired' ? (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '20px 24px', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Progress</h3>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 'max-content', gap: 0 }}>
                {STAGES.map((stage, i) => {
                  const isCompleted = i < currentIdx;
                  const isCurrent   = i === currentIdx;
                  const dateKey     = stage.id.toLowerCase();
                  const dt          = stageMap[dateKey];
                  return (
                    <React.Fragment key={stage.id}>
                      {i > 0 && (
                        <div style={{ width: 28, height: 2, background: isCompleted ? '#0176D3' : '#E5E7EB', flexShrink: 0, marginTop: 14 }} />
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: isCompleted ? '#0176D3' : isCurrent ? '#fff' : '#F3F4F6',
                          border: isCurrent ? '2.5px solid #0176D3' : isCompleted ? '2px solid #0176D3' : '2px solid #E5E7EB',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700,
                          color: isCompleted ? '#fff' : isCurrent ? '#0176D3' : '#9CA3AF',
                          boxShadow: isCurrent ? '0 0 0 4px rgba(1,118,211,0.15)' : 'none',
                        }}>
                          {isCompleted ? '✓' : stage.icon}
                        </div>
                        <span style={{ fontSize: 9, color: isCompleted || isCurrent ? '#0176D3' : '#9CA3AF', fontWeight: isCurrent ? 700 : 400, whiteSpace: 'nowrap' }}>
                          {stage.label}
                        </span>
                        {dt && (
                          <span style={{ fontSize: 8, color: 'rgba(1,118,211,0.55)', whiteSpace: 'nowrap' }}>
                            {new Date(dt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: data.status === 'rejected' ? '#FEF2F2' : '#F3F4F6', borderRadius: 12, border: `1px solid ${data.status === 'rejected' ? '#FECACA' : '#E5E7EB'}`, padding: '24px', marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{data.status === 'rejected' ? '😔' : '👋'}</div>
            <div style={{ fontWeight: 700, color: data.status === 'rejected' ? '#991B1B' : '#6B7280', fontSize: 16 }}>
              {data.status === 'rejected' ? 'Application Not Progressed' : 'Application Withdrawn'}
            </div>
            <p style={{ color: '#6B7280', fontSize: 13, margin: '8px 0 0' }}>
              {data.status === 'rejected'
                ? 'The team has decided not to move forward with your application at this time. We wish you the best in your search.'
                : 'You withdrew your application for this role.'}
            </p>
          </div>
        )}

        {/* Stage history */}
        {(data.stageHistory || []).length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '20px 24px', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Timeline</h3>
            {[...data.stageHistory].reverse().map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 12, borderBottom: i < data.stageHistory.length - 1 ? '1px solid #F1F5F9' : 'none', marginBottom: i < data.stageHistory.length - 1 ? 12 : 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0176D3', flexShrink: 0, marginTop: 5 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#0A1628' }}>{h.stage}</div>
                  {h.movedAt && <div style={{ fontSize: 12, color: '#9CA3AF' }}>{new Date(h.movedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12 }}>
          Powered by <strong>TalentNest HR</strong> · This link is private to you — do not share it.
        </p>
      </div>
    </div>
  );
}
