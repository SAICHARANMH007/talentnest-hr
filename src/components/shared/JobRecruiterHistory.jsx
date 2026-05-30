import { useState, useEffect, useRef } from 'react';
import { api } from '../../api/api.js';

const fmt = d =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDT = d =>
  d ? `${new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ${new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}` : '—';
const calcDays = (from, to) => {
  if (!from) return null;
  const d = Math.round((new Date(to || Date.now()) - new Date(from)) / 86400000);
  return d > 0 ? d : 1;
};
const initials = name => (name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

const STAGE_COLOR = {
  applied: '#0176D3', screening: '#7C3AED', shortlisted: '#0369A1',
  interview_scheduled: '#F59E0B', interview_completed: '#10B981',
  offer_extended: '#D97706', selected: '#059669', rejected: '#BA0517',
};

// ── Candidates-during-tenure list ───────────────────────────────────────────
function CandidateList({ candidates, emptyMsg }) {
  if (!candidates.length)
    return <p style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', margin: '10px 0' }}>{emptyMsg}</p>;
  return (
    <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
      {candidates.map((a, i) => {
        const name  = a.candidate?.name || a.candidateName || '?';
        const stage = a.stage || 'applied';
        const color = STAGE_COLOR[stage] || '#64748B';
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: '#fff', borderRadius: 8, border: `1px solid ${color}22` }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
              {name[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
              <div style={{ fontSize: 10, color: '#94A3B8' }}>Applied {fmt(a.createdAt)}</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}15`, padding: '2px 8px', borderRadius: 20, flexShrink: 0, whiteSpace: 'nowrap' }}>{stage}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Stage-changes log ────────────────────────────────────────────────────────
function PipelineLog({ events, emptyMsg }) {
  if (!events.length)
    return <p style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', margin: '10px 0' }}>{emptyMsg}</p>;
  return (
    <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
      {events.map((ev, i) => {
        const color = STAGE_COLOR[ev.stageId || ev.stage] || '#64748B';
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: '#fff', borderRadius: 8, border: `1px solid ${color}22` }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 11, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ev.candidateName} <span style={{ color: '#C9C7C5' }}>→</span>{' '}
                <span style={{ color }}>{ev.stage || ev.stageId || '—'}</span>
              </div>
              {ev.note && <div style={{ fontSize: 10, color: '#94A3B8', fontStyle: 'italic' }}>"{ev.note}"</div>}
            </div>
            <span style={{ fontSize: 10, color: '#94A3B8', flexShrink: 0, whiteSpace: 'nowrap' }}>{fmtDT(ev._ts)}</span>
          </div>
        );
      })}
    </div>
  );
}

const TABS = [
  { key: 'applied',  label: '👤 Applied During Tenure',     tip: 'Candidates who submitted applications while this recruiter was assigned' },
  { key: 'pipeline', label: '🔄 Active Candidates',         tip: 'Candidates who had any stage change during this recruiter\'s tenure' },
  { key: 'log',      label: '📋 Every Stage Change',        tip: 'Full log of every pipeline move that happened during this period' },
];

// ── Single recruiter timeline entry ─────────────────────────────────────────
function RecruiterEntry({ entry, isCurrent, isRepeat, days, isLast, ensureApps }) {
  const [open,     setOpen]     = useState(false);
  const [tab,      setTab]      = useState('applied');
  const [data,     setData]     = useState({});  // keyed by tab
  const [loading,  setLoading]  = useState(false);

  const from = entry.assignedAt ? new Date(entry.assignedAt) : null;
  const to   = entry.removedAt  ? new Date(entry.removedAt)  : null;

  const inWindow = ts => {
    if (!ts) return false;
    const t = new Date(ts);
    return (!from || t >= from) && (!to || t <= to);
  };

  const loadTab = async (key) => {
    setTab(key);
    if (data[key]) return;
    setLoading(true);
    const apps = await ensureApps();
    let result;
    if (key === 'applied') {
      result = apps.filter(a => inWindow(a.createdAt));
    } else if (key === 'pipeline') {
      result = apps.filter(a =>
        Array.isArray(a.stageHistory) &&
        a.stageHistory.some(h => inWindow(h.movedAt || h.changedAt || h.date))
      );
    } else if (key === 'log') {
      const events = [];
      apps.forEach(a => {
        const cName = a.candidate?.name || a.candidateName || '—';
        (a.stageHistory || []).forEach(h => {
          const ts = h.movedAt || h.changedAt || h.date;
          if (inWindow(ts)) events.push({ ...h, _ts: ts, candidateName: cName });
        });
      });
      events.sort((a, b) => new Date(a._ts) - new Date(b._ts));
      result = events;
    }
    setData(prev => ({ ...prev, [key]: result }));
    setLoading(false);
  };

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !data['applied']) await loadTab('applied');
  };

  const borderColor = isCurrent ? 'rgba(5,150,105,0.3)' : '#E2E8F0';
  const bg          = isCurrent ? 'rgba(5,150,105,0.05)' : '#FAFBFF';

  return (
    <div style={{ position: 'relative', marginBottom: isLast ? 0 : 0 }}>
      {/* Timeline dot */}
      <div style={{
        position: 'absolute', left: -25, top: 16,
        width: 14, height: 14, borderRadius: '50%',
        background: isCurrent ? '#059669' : '#94A3B8',
        border: '2.5px solid #fff',
        boxShadow: `0 0 0 3px ${isCurrent ? 'rgba(5,150,105,0.2)' : 'rgba(148,163,184,0.2)'}`,
        zIndex: 2,
      }} />

      {/* Main card */}
      <div
        onClick={toggle}
        style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', background: bg, border: `1px solid ${borderColor}`, borderRadius: 12, cursor: 'pointer', transition: 'box-shadow 0.15s', userSelect: 'none' }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
      >
        {/* Avatar */}
        <div style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
          background: isCurrent ? 'linear-gradient(135deg,#059669,#065F46)' : 'linear-gradient(135deg,#64748B,#475569)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 800, fontSize: 13,
          boxShadow: isCurrent ? '0 3px 10px rgba(5,150,105,0.3)' : 'none',
        }}>
          {initials(entry.recruiterName)}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontWeight: 900, fontSize: 14, color: '#0A1628' }}>{entry.recruiterName || 'Unknown'}</span>
            {isRepeat && (
              <span style={{ fontSize: 9, fontWeight: 800, color: '#7C3AED', background: 'rgba(124,58,237,0.1)', padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.5 }}>again</span>
            )}
            {isCurrent ? (
              <span style={{ fontSize: 10, fontWeight: 800, color: '#059669', background: 'rgba(5,150,105,0.12)', padding: '2px 10px', borderRadius: 20 }}>● CURRENT</span>
            ) : (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', background: '#F1F5F9', padding: '2px 8px', borderRadius: 20 }}>PAST</span>
            )}
            {days != null && (
              <span style={{ fontSize: 10, fontWeight: 800, color: isCurrent ? '#0176D3' : '#706E6B', background: isCurrent ? 'rgba(1,118,211,0.08)' : '#F8FAFC', border: `1px solid ${isCurrent ? 'rgba(1,118,211,0.2)' : '#E2E8F0'}`, padding: '2px 10px', borderRadius: 20 }}>
                {days}d {isCurrent ? 'active' : 'on job'}
              </span>
            )}
          </div>

          {/* Contact */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 3 }}>
            {entry.recruiterEmail && (
              <a href={`mailto:${entry.recruiterEmail}`} onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: '#0176D3', textDecoration: 'none' }}>
                ✉️ {entry.recruiterEmail}
              </a>
            )}
            {entry.recruiterPhone && (
              <a href={`tel:${entry.recruiterPhone}`} onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: '#059669', textDecoration: 'none' }}>
                📞 {entry.recruiterPhone}
              </a>
            )}
          </div>

          {/* Date range */}
          <div style={{ fontSize: 11, color: '#94A3B8' }}>
            {isCurrent ? (
              <>📅 <strong style={{ color: '#374151' }}>{fmt(entry.assignedAt)}</strong> → <strong style={{ color: '#059669' }}>Present (ongoing)</strong></>
            ) : (
              <>📅 <strong style={{ color: '#374151' }}>{fmt(entry.assignedAt)}</strong> → <strong style={{ color: '#374151' }}>{fmt(entry.removedAt)}</strong></>
            )}
            {entry.assignedByName && (
              <span> · assigned by <strong style={{ color: '#706E6B' }}>{entry.assignedByName}</strong></span>
            )}
          </div>
        </div>

        {/* Expand chevron */}
        <div style={{ fontSize: 14, color: '#94A3B8', flexShrink: 0, marginTop: 2 }}>{open ? '▲' : '▼'}</div>
      </div>

      {/* Drill-down panel */}
      {open && (
        <div style={{ margin: '4px 0 0 0', padding: '14px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderTop: 'none', borderRadius: '0 0 12px 12px' }}>

          {/* Summary chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {TABS.map(t => (
              <button
                key={t.key}
                title={t.tip}
                onClick={() => loadTab(t.key)}
                style={{
                  padding: '5px 13px', borderRadius: 20, border: 'none', fontSize: 11, cursor: 'pointer', fontWeight: 700, transition: 'all 0.12s',
                  background: tab === t.key ? '#0176D3' : '#fff',
                  color:      tab === t.key ? '#fff'     : '#64748B',
                  boxShadow:  tab === t.key ? '0 2px 8px rgba(1,118,211,0.25)' : '0 1px 3px rgba(0,0,0,0.08)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#94A3B8', fontSize: 12 }}>Loading…</div>
          ) : (
            <>
              {tab === 'applied'  && data.applied  && (
                <CandidateList
                  candidates={data.applied}
                  emptyMsg="No candidates applied during this recruiter's tenure."
                />
              )}
              {tab === 'pipeline' && data.pipeline && (
                <CandidateList
                  candidates={data.pipeline}
                  emptyMsg="No pipeline activity during this period."
                />
              )}
              {tab === 'log'      && data.log      && (
                <PipelineLog
                  events={data.log}
                  emptyMsg="No stage changes logged during this period."
                />
              )}
            </>
          )}

          {/* Count summary */}
          {!loading && (
            <div style={{ marginTop: 10, fontSize: 10, color: '#94A3B8' }}>
              {tab === 'applied'  && data.applied  && `${data.applied.length} candidates applied while ${entry.recruiterName} was assigned`}
              {tab === 'pipeline' && data.pipeline && `${data.pipeline.length} candidates had pipeline activity during this period`}
              {tab === 'log'      && data.log      && `${data.log.length} stage moves recorded during this period`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Handoff connector ────────────────────────────────────────────────────────
function HandoffConnector({ from, to }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0 4px 14px', position: 'relative' }}>
      <div style={{ width: 2, height: 28, background: 'linear-gradient(#E2E8F0,#CBD5E1)', borderRadius: 2, position: 'absolute', left: -19, top: 0 }} />
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 20, padding: '3px 12px', letterSpacing: 0.3 }}>
        ↕ Handoff — {from} → {to}
      </div>
    </div>
  );
}

// ── Root component ───────────────────────────────────────────────────────────
export default function JobRecruiterHistory({ jobId, jobTitle, fallbackHistory = [] }) {
  const [history,      setHistory]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [allApps,      setAllApps]      = useState(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    fetchedRef.current = false;
    setAllApps(null);
    setUsingFallback(false);
    if (!jobId) { setLoading(false); return; }
    setLoading(true);
    api.getJobRecruiterHistory(jobId)
      .then(r => {
        const hist = r?.data?.history || r?.history || [];
        if (hist.length > 0) {
          setHistory(hist);
        } else if (fallbackHistory.length > 0) {
          setHistory(fallbackHistory);
          setUsingFallback(true);
        } else {
          setHistory([]);
        }
      })
      .catch(() => {
        if (fallbackHistory.length > 0) {
          setHistory(fallbackHistory);
          setUsingFallback(true);
        } else {
          setHistory([]);
        }
      })
      .finally(() => setLoading(false));
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Shared lazy loader — called by entries, caches result
  const ensureApps = async () => {
    if (fetchedRef.current && allApps !== null) return allApps;
    fetchedRef.current = true;
    try {
      const res  = await api.getApplications({ jobId, limit: 100000 });
      const list = Array.isArray(res) ? res : (res?.data || []);
      setAllApps(list);
      return list;
    } catch {
      setAllApps([]);
      return [];
    }
  };

  if (!jobId) return null;
  if (loading) return <div style={{ color: '#94A3B8', fontSize: 12, padding: '8px 0' }}>Loading recruiter history…</div>;
  if (!history.length) return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>👤</div>
      <div style={{ color: '#374151', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>No recruiter assigned yet</div>
      <div style={{ color: '#94A3B8', fontSize: 12 }}>Once a recruiter is assigned to this job, their history will appear here.</div>
    </div>
  );

  // Sort oldest → newest
  const sorted = [...history].sort((a, b) => new Date(a.assignedAt || 0) - new Date(b.assignedAt || 0));

  // Detect "again" — same recruiter name appearing more than once
  const nameTally = {};
  sorted.forEach(r => { nameTally[r.recruiterName] = (nameTally[r.recruiterName] || 0) + 1; });
  const nameSeen = {};

  const currentRec = sorted.find(r => !r.removedAt);
  const totalDays  = calcDays(sorted[0]?.assignedAt);
  const handoffs   = sorted.filter(r => r.removedAt).length;

  return (
    <div>
      {/* ── Summary bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14, padding: '9px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#374151' }}>
          👥 {sorted.length} recruiter assignment{sorted.length !== 1 ? 's' : ''}
        </span>
        {handoffs > 0 && (
          <span style={{ fontSize: 11, color: '#706E6B' }}>· {handoffs} handoff{handoffs !== 1 ? 's' : ''}</span>
        )}
        {sorted[0]?.assignedAt && (
          <span style={{ fontSize: 11, color: '#94A3B8' }}>· Since {fmt(sorted[0].assignedAt)}</span>
        )}
        {currentRec && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: 'rgba(5,150,105,0.1)', padding: '2px 10px', borderRadius: 20 }}>
            ● {currentRec.recruiterName} now active
          </span>
        )}
        {totalDays && (
          <span style={{ fontSize: 11, color: '#94A3B8' }}>· {totalDays}d total job age</span>
        )}
      </div>

      {/* ── Fallback notice ── */}
      {usingFallback && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', marginBottom: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8 }}>
          <span style={{ fontSize: 14 }}>ℹ️</span>
          <span style={{ fontSize: 11, color: '#92400E' }}>Showing recruiter data from job record — full assignment audit log is being built by the server.</span>
        </div>
      )}

      {/* ── Tap hint ── */}
      <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 10, fontStyle: 'italic' }}>
        Tap any recruiter to see candidates and pipeline activity during their tenure
      </div>

      {/* ── Timeline ── */}
      <div style={{ position: 'relative', paddingLeft: 28 }}>
        {/* Vertical line connecting all entries */}
        {sorted.length > 1 && (
          <div style={{ position: 'absolute', left: 9, top: 24, bottom: 24, width: 2, background: '#E2E8F0', borderRadius: 2 }} />
        )}

        {sorted.map((entry, i) => {
          const isCurrent = !entry.removedAt;
          const days = calcDays(entry.assignedAt, entry.removedAt);
          nameSeen[entry.recruiterName] = (nameSeen[entry.recruiterName] || 0) + 1;
          const isRepeat = nameTally[entry.recruiterName] > 1 && nameSeen[entry.recruiterName] > 1;
          const isLast = i === sorted.length - 1;
          const next = sorted[i + 1];

          return (
            <div key={i}>
              <RecruiterEntry
                entry={entry}
                isCurrent={isCurrent}
                isRepeat={isRepeat}
                days={days}
                isLast={isLast}
                ensureApps={ensureApps}
              />
              {/* Handoff connector between consecutive entries */}
              {!isLast && next && (
                <HandoffConnector
                  from={entry.recruiterName}
                  to={next.recruiterName}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
