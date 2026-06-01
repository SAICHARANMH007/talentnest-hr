import { useState, useEffect } from 'react';
import { api } from '../../api/api.js';

const fmt = d =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime = d =>
  d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

function TimelineItem({ ev, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = ev.strengths || ev.weaknesses || ev.kitScores?.length > 0;

  return (
    <div style={{ position: 'relative', marginBottom: isLast ? 0 : 20 }}>
      {/* Dot */}
      <div style={{
        position: 'absolute', left: -20, top: 5,
        width: 12, height: 12, borderRadius: '50%',
        background: ev.color || '#64748B',
        border: '2.5px solid #fff',
        boxShadow: `0 0 0 2px ${(ev.color || '#64748B')}44`,
        zIndex: 1,
      }} />

      <div
        style={{
          background: '#FAFAFA',
          border: `1px solid ${(ev.color || '#64748B')}20`,
          borderRadius: 10,
          padding: '10px 12px',
          cursor: hasDetail ? 'pointer' : 'default',
        }}
        onClick={() => hasDetail && setExpanded(p => !p)}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: ev.color || '#374151' }}>
              {ev.icon} {ev.title}
            </span>
            {ev.jobTitle && ev.type !== 'application' && ev.type !== 'profile_created' && (
              <span style={{ marginLeft: 8, fontSize: 10, background: 'rgba(0,0,0,0.06)', color: '#64748B', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>{ev.jobTitle}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{fmt(ev.ts)}{ev.ts ? ` · ${fmtTime(ev.ts)}` : ''}</span>
            {hasDetail && <span style={{ fontSize: 11, color: '#9CA3AF' }}>{expanded ? '▲' : '▼'}</span>}
          </div>
        </div>
        {ev.detail && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>{ev.detail}</div>}

        {expanded && (
          <div style={{ marginTop: 10, borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>
            {ev.strengths && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', textTransform: 'uppercase', marginBottom: 3 }}>Strengths</div>
                <div style={{ fontSize: 12, color: '#334155', background: 'rgba(5,150,105,0.05)', padding: '6px 10px', borderRadius: 8, borderLeft: '2.5px solid #059669' }}>{ev.strengths}</div>
              </div>
            )}
            {ev.weaknesses && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#BA0517', textTransform: 'uppercase', marginBottom: 3 }}>Areas for Improvement</div>
                <div style={{ fontSize: 12, color: '#334155', background: 'rgba(186,5,23,0.04)', padding: '6px 10px', borderRadius: 8, borderLeft: '2.5px solid #BA0517' }}>{ev.weaknesses}</div>
              </div>
            )}
            {ev.kitScores?.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', marginBottom: 6 }}>Interview Kit Scores</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ev.kitScores.map((ks, i) => (
                    <span key={i} style={{ background: 'rgba(124,58,237,0.08)', color: '#7C3AED', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                      {ks.competency}: {ks.score || 0}{ks.notes ? ` — ${ks.notes}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CandidateCRMTimeline({ candidateId }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [filter, setFilter]   = useState('all');

  useEffect(() => {
    if (!candidateId) return;
    setLoading(true);
    api.getCandidateFullTimeline(candidateId)
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [candidateId]);

  const EVENT_TYPES = [
    { id: 'all',          label: 'All' },
    { id: 'application',  label: 'Applications' },
    { id: 'stage_change', label: 'Stage Changes' },
    { id: 'interview',    label: 'Interviews' },
    { id: 'feedback',     label: 'Feedback' },
    { id: 'offer',        label: 'Offers' },
  ];

  const events = (data?.events || []).filter(ev => filter === 'all' || ev.type === filter);

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>⏳ Loading timeline…</div>;
  if (error)   return <div style={{ padding: 16, color: '#EF4444', fontSize: 13 }}>⚠️ {error}</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 900, color: '#0176D3', textTransform: 'uppercase', letterSpacing: 0.8 }}>🗂️ Full CRM Timeline</span>
          <span style={{ marginLeft: 8, fontSize: 11, color: '#9CA3AF' }}>{data?.applications || 0} application{data?.applications !== 1 ? 's' : ''} · {data?.events?.length || 0} events</span>
        </div>
        <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', padding: '3px 4px', borderRadius: 10 }}>
          {EVENT_TYPES.map(t => (
            <button key={t.id} onClick={() => setFilter(t.id)}
              style={{ padding: '4px 10px', borderRadius: 8, border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer', background: filter === t.id ? '#fff' : 'transparent', color: filter === t.id ? '#0176D3' : '#64748B', boxShadow: filter === t.id ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {events.length === 0 ? (
        <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '20px 0' }}>No events found for this filter.</p>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 26 }}>
          <div style={{ position: 'absolute', left: 9, top: 0, bottom: 0, width: 2, background: '#E2E8F0', borderRadius: 2 }} />
          {events.map((ev, i) => (
            <TimelineItem key={i} ev={ev} isLast={i === events.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}
