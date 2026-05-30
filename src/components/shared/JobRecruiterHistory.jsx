import { useState, useEffect } from 'react';
import { api } from '../../api/api.js';

/**
 * Shows the full recruiter handoff timeline for a job.
 * Used in Pipeline, Applicant Records, and Job Detail views.
 * Props: jobId (required), jobTitle (optional, for display)
 */
export default function JobRecruiterHistory({ jobId, jobTitle }) {
  const [history,  setHistory]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!jobId) { setLoading(false); return; }
    setLoading(true);
    api.getJobRecruiterHistory(jobId)
      .then(r => { setHistory(r?.data?.history || []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [jobId]);

  if (!jobId) return null;
  if (loading) return <div style={{ color:'#94A3B8', fontSize:12, padding:'8px 0' }}>Loading history…</div>;
  if (error)   return <div style={{ color:'#BA0517', fontSize:12, padding:'8px 0' }}>⚠️ {error}</div>;
  if (!history.length) return (
    <div style={{ color:'#94A3B8', fontSize:12, padding:'8px 0', textAlign:'center' }}>
      No recruiter history yet for this job.
    </div>
  );

  const active  = history.filter(h => !h.removedAt);
  const past    = history.filter(h =>  h.removedAt);
  const visible = expanded ? past : past.slice(0, 2);

  const fmt = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
  const initials = name => (name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  const calcDays = (from, to) => {
    if (!from) return null;
    const diff = Math.round((new Date(to || Date.now()) - new Date(from)) / 86400000);
    return diff > 0 ? diff : 1;
  };

  const RecruiterCard = ({ entry, isCurrent }) => {
    const days = calcDays(entry.assignedAt, entry.removedAt);
    return (
    <div style={{
      display:'flex', gap:12, alignItems:'flex-start',
      padding:'12px 14px',
      background: isCurrent ? 'rgba(5,150,105,0.06)' : '#F8FAFF',
      border: `1px solid ${isCurrent ? 'rgba(5,150,105,0.25)' : '#E2E8F0'}`,
      borderRadius:12,
      position:'relative',
    }}>
      {/* Avatar */}
      <div style={{
        width:38, height:38, borderRadius:'50%', flexShrink:0,
        background: isCurrent ? 'linear-gradient(135deg,#059669,#065F46)' : 'linear-gradient(135deg,#64748B,#475569)',
        display:'flex', alignItems:'center', justifyContent:'center',
        color:'#fff', fontWeight:800, fontSize:13,
      }}>
        {initials(entry.recruiterName)}
      </div>

      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span style={{ fontWeight:800, fontSize:13, color:'#0A1628' }}>{entry.recruiterName || 'Unknown'}</span>
          {isCurrent ? (
            <span style={{ fontSize:10, fontWeight:800, color:'#059669', background:'rgba(5,150,105,0.1)', padding:'2px 8px', borderRadius:20 }}>● ACTIVE</span>
          ) : (
            <span style={{ fontSize:10, fontWeight:700, color:'#94A3B8', background:'#F1F5F9', padding:'2px 8px', borderRadius:20 }}>PAST</span>
          )}
          {days != null && (
            <span style={{ fontSize:10, fontWeight:800, color: isCurrent ? '#0176D3' : '#706E6B', background: isCurrent ? 'rgba(1,118,211,0.08)' : '#F8FAFC', border: `1px solid ${isCurrent ? 'rgba(1,118,211,0.2)' : '#E2E8F0'}`, padding:'2px 10px', borderRadius:20 }}>
              {isCurrent ? `${days}d active` : `${days}d on job`}
            </span>
          )}
        </div>

        {/* Contact */}
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:4 }}>
          {entry.recruiterEmail && (
            <a href={`mailto:${entry.recruiterEmail}`} style={{ fontSize:11, color:'#0176D3', textDecoration:'none' }}>✉️ {entry.recruiterEmail}</a>
          )}
          {entry.recruiterPhone && (
            <a href={`tel:${entry.recruiterPhone}`} style={{ fontSize:11, color:'#059669', textDecoration:'none' }}>📞 {entry.recruiterPhone}</a>
          )}
        </div>

        {/* Dates */}
        <div style={{ fontSize:11, color:'#94A3B8', marginTop:3 }}>
          {isCurrent
            ? <>Assigned {fmt(entry.assignedAt)}{entry.assignedByName && <span> · by <strong style={{ color:'#706E6B' }}>{entry.assignedByName}</strong></span>}</>
            : <>{fmt(entry.assignedAt)} → {fmt(entry.removedAt)}{entry.assignedByName && <span> · assigned by <strong style={{ color:'#706E6B' }}>{entry.assignedByName}</strong></span>}</>
          }
        </div>
      </div>
    </div>
  );
  };

  const firstEver = history.length > 0 ? history[history.length - 1]?.assignedAt : null;
  const totalHandoffs = past.length;

  return (
    <div>
      {/* Summary bar */}
      {history.length > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', marginBottom:10, padding:'8px 12px', background:'#F8FAFC', borderRadius:10, border:'1px solid #E2E8F0' }}>
          <span style={{ fontSize:11, fontWeight:700, color:'#374151' }}>
            👥 {history.length} recruiter{history.length !== 1 ? 's' : ''} total
          </span>
          {totalHandoffs > 0 && (
            <span style={{ fontSize:11, color:'#706E6B' }}>· {totalHandoffs} handoff{totalHandoffs !== 1 ? 's' : ''}</span>
          )}
          {firstEver && (
            <span style={{ fontSize:11, color:'#94A3B8' }}>· First assigned {fmt(firstEver)}</span>
          )}
        </div>
      )}

      {/* Currently active recruiters */}
      {active.length > 0 && (
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:10, fontWeight:800, color:'#059669', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>
            Currently Assigned
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {active.map((h, i) => <RecruiterCard key={i} entry={h} isCurrent />)}
          </div>
        </div>
      )}

      {/* Past recruiters */}
      {past.length > 0 && (
        <div>
          <div style={{ fontSize:10, fontWeight:800, color:'#706E6B', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>
            Previous Recruiters ({past.length})
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {visible.map((h, i) => <RecruiterCard key={i} entry={h} isCurrent={false} />)}
          </div>
          {past.length > 2 && (
            <button
              onClick={() => setExpanded(p => !p)}
              style={{ marginTop:6, background:'none', border:'none', color:'#0176D3', fontSize:12, fontWeight:700, cursor:'pointer', padding:'4px 0' }}
            >
              {expanded ? '▲ Show less' : `▼ Show ${past.length - 2} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
