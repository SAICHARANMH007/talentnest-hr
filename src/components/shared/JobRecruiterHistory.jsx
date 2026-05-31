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
const fmtStage = s => (s || '').replace(/_/g, ' ');

const STAGE_COLOR = {
  applied: '#0176D3', screening: '#7C3AED', shortlisted: '#0369A1',
  interview_scheduled: '#F59E0B', interview_completed: '#10B981',
  offer_extended: '#D97706', selected: '#059669', rejected: '#BA0517',
  // also handle capitalised variants from the app model
  Applied: '#0176D3', Screening: '#7C3AED', Shortlisted: '#0369A1',
  'Interview Round 1': '#F59E0B', 'Interview Round 2': '#a78bfa',
  Offer: '#059669', Hired: '#2E844A', Rejected: '#BA0517',
};

const STAGE_ORDER = [
  'Applied','applied','Screening','screening','Shortlisted','shortlisted',
  'Interview Round 1','interview_scheduled','Interview Round 2','interview_completed',
  'Offer','offer_extended','Hired','selected','Rejected','rejected',
];

// ── Candidates list (reused in per-recruiter drill-down) ─────────────────────
function CandidateList({ candidates, emptyMsg, entry, effectiveEndDate }) {
  if (!candidates.length)
    return <p style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', margin: '10px 0' }}>{emptyMsg}</p>;

  // Use effectiveEndDate (removedAt || nextRecruiter.assignedAt) as the boundary.
  // This handles recruiters with no removedAt who were later superseded by another recruiter.
  const getStageAtTenureEnd = (app) => {
    if (!effectiveEndDate) return app.currentStage || app.stage || 'Applied';
    const endDate = new Date(effectiveEndDate);
    const hist = (app.stageHistory || [])
      .filter(h => { const ts = h.movedAt || h.changedAt || h.date; return ts && new Date(ts) <= endDate; })
      .sort((a, b) => new Date(b.movedAt || b.changedAt || b.date) - new Date(a.movedAt || a.changedAt || a.date));
    return hist[0]?.stageId || hist[0]?.stage || app.currentStage || app.stage || 'Applied';
  };

  return (
    <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
      {candidates.map((a, i) => {
        const name         = a.candidate?.name || a.candidateName || '?';
        const tenureStage  = getStageAtTenureEnd(a);
        const currentStage = a.currentStage || a.stage || 'Applied';
        const movedAfter   = !!(effectiveEndDate && tenureStage !== currentStage);
        const color        = STAGE_COLOR[tenureStage]  || '#64748B';
        const nowColor     = STAGE_COLOR[currentStage] || '#64748B';
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: '#fff', borderRadius: 8, border: `1px solid ${color}22` }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
              {(name[0] || '?').toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
              <div style={{ fontSize: 10, color: '#94A3B8' }}>Applied {fmt(a.createdAt || a.appliedAt)}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}15`, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                {fmtStage(tenureStage)}
              </span>
              {movedAfter && (
                <span style={{ fontSize: 9, color: '#94A3B8', whiteSpace: 'nowrap' }}>
                  → <span style={{ color: nowColor, fontWeight: 700 }}>{fmtStage(currentStage)}</span> after tenure
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Stage-changes log ────────────────────────────────────────────────────────
function PipelineLog({ events, emptyMsg, recruiterMap = {} }) {
  if (!events.length)
    return <p style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', margin: '10px 0' }}>{emptyMsg}</p>;
  return (
    <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
      {events.map((ev, i) => {
        const color     = STAGE_COLOR[ev.stageId || ev.stage] || '#64748B';
        const moverName = ev.movedBy ? (recruiterMap[String(ev.movedBy)] || null) : null;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: '#fff', borderRadius: 8, border: `1px solid ${color}22` }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 11, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ev.candidateName} <span style={{ color: '#C9C7C5' }}>→</span>{' '}
                <span style={{ color }}>{fmtStage(ev.stage || ev.stageId) || '—'}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px', marginTop: 2 }}>
                {moverName && (
                  <span style={{ fontSize: 10, color: '#706E6B' }}>
                    👤 moved by <strong style={{ color: '#0176D3' }}>{moverName}</strong>
                  </span>
                )}
                {ev.isCrossRecruiter && ev.appliedDuringName && (
                  <span style={{ fontSize: 10, color: '#92400E', background: 'rgba(245,158,11,0.08)', padding: '1px 6px', borderRadius: 10, border: '1px solid rgba(245,158,11,0.25)' }}>
                    📋 applied during <strong>{ev.appliedDuringName}</strong>'s tenure
                  </span>
                )}
              </div>
              {ev.note && <div style={{ fontSize: 10, color: '#94A3B8', fontStyle: 'italic', marginTop: 1 }}>"{ev.note}"</div>}
            </div>
            <span style={{ fontSize: 10, color: '#94A3B8', flexShrink: 0, whiteSpace: 'nowrap' }}>{fmtDT(ev._ts)}</span>
          </div>
        );
      })}
    </div>
  );
}

const TABS = [
  { key: 'applied',  label: '👤 Applied During Tenure',  tip: 'Candidates who submitted applications while this recruiter was assigned' },
  { key: 'pipeline', label: '🔄 Active Candidates',      tip: "Candidates who had any stage change during this recruiter's tenure" },
  { key: 'log',      label: '📋 Every Stage Change',     tip: 'Full log of every pipeline move that happened during this period' },
];

// ── Single recruiter timeline entry ─────────────────────────────────────────
function RecruiterEntry({ entry, isCurrent, isRepeat, days, isLast, ensureApps, recruiterMap, history, effectiveEndDate }) {
  const [open,    setOpen]    = useState(false);
  const [tab,     setTab]     = useState('applied');
  const [data,    setData]    = useState({});
  const [loading, setLoading] = useState(false);

  const from = entry.assignedAt ? new Date(entry.assignedAt) : null;
  // Use effectiveEndDate (not raw removedAt) so that recruiters with no removedAt
  // still get a proper upper bound when a successor was assigned.
  const to   = effectiveEndDate ? new Date(effectiveEndDate) : null;

  // No date constraints (synthetic/null entry) → include everything
  const inWindow = ts => {
    if (!from && !to) return true;
    if (!ts) return false;
    const t = new Date(ts);
    return (!from || t >= from) && (!to || t <= to);
  };

  // True when this candidate "belongs" to this tenure (applied during it).
  // Candidates with unknown appliedAt are included to avoid false negatives.
  const belongsToTenure = a => {
    const ts = a.createdAt || a.appliedAt;
    if (!from && !to) return true;
    if (!ts) return true;
    return inWindow(ts);
  };

  const loadTab = async (key) => {
    setTab(key);
    if (data[key] !== undefined) return;
    setLoading(true);
    const apps = await ensureApps();
    let result;
    if (key === 'applied') {
      // Candidates who applied during this recruiter's effective tenure
      result = apps.filter(a => belongsToTenure(a));
    } else if (key === 'pipeline') {
      // Tenure-era candidates who have any stage history (shows ongoing journey)
      result = apps.filter(a =>
        belongsToTenure(a) &&
        Array.isArray(a.stageHistory) &&
        a.stageHistory.length > 0
      );
    } else if (key === 'log') {
      // Helper: which recruiter owned the job when this candidate applied, using
      // effective end dates so null-removedAt recruiters don't bleed past their successor.
      const whoOwned = (appliedAt) => {
        if (!appliedAt) return null;
        const t = new Date(appliedAt);
        return (history || []).find((r, rIdx) => {
          const f   = r.assignedAt ? new Date(r.assignedAt) : null;
          const nxt = history[rIdx + 1];
          const eff = r.removedAt || nxt?.assignedAt || null;
          const toR = eff ? new Date(eff) : null;
          if (!f && !toR) return true;
          if (!f) return !toR || t <= toR;
          if (!toR) return t >= f;
          return t >= f && t <= toR;
        }) || null;
      };

      const events = [];
      const seen   = new Set(); // deduplicate by appId+ts+stage
      apps.forEach(a => {
        const cName     = a.candidate?.name || a.candidateName || '—';
        const appliedAt = a.createdAt || a.appliedAt;
        const ownerRec  = whoOwned(appliedAt);
        const appliedDuringName = ownerRec?.recruiterName || null;
        const isCrossRecruiter  = !!(appliedDuringName && appliedDuringName !== entry.recruiterName);

        // Include events for candidates applied during this tenure
        // OR stage changes made by this recruiter (cross-tenure contributions)
        const tenureCandidate = belongsToTenure(a);

        (a.stageHistory || []).forEach(h => {
          const ts  = h.movedAt || h.changedAt || h.date;
          const movedByThisRecruiter = entry.recruiterId &&
            h.movedBy && String(h.movedBy) === String(entry.recruiterId);

          if (!tenureCandidate && !movedByThisRecruiter) return;
          if (!ts) return;

          const uid = `${String(a._id)}-${ts}-${h.stage || h.stageId}`;
          if (seen.has(uid)) return;
          seen.add(uid);

          events.push({ ...h, _ts: ts, candidateName: cName, appliedDuringName, isCrossRecruiter });
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
    if (next && data['applied'] === undefined) await loadTab('applied');
  };

  const borderColor = isCurrent ? 'rgba(5,150,105,0.3)' : '#E2E8F0';
  const bg          = isCurrent ? 'rgba(5,150,105,0.05)' : '#FAFBFF';

  return (
    <div style={{ position: 'relative' }}>
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
        style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', background: bg, border: `1px solid ${borderColor}`, borderRadius: open ? '12px 12px 0 0' : 12, cursor: 'pointer', transition: 'box-shadow 0.15s', userSelect: 'none' }}
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
            {entry.assignedAt ? (
              isCurrent ? (
                <>📅 <strong style={{ color: '#374151' }}>{fmt(entry.assignedAt)}</strong> → <strong style={{ color: '#059669' }}>Present (ongoing)</strong></>
              ) : (
                <>📅 <strong style={{ color: '#374151' }}>{fmt(entry.assignedAt)}</strong> → <strong style={{ color: '#374151' }}>{fmt(entry.removedAt)}</strong></>
              )
            ) : (
              <span style={{ color: '#94A3B8' }}>📅 Assignment date not recorded</span>
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
        <div style={{ padding: '14px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderTop: 'none', borderRadius: '0 0 12px 12px' }}>

          {/* Tab buttons */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {TABS.map(t => (
              <button
                key={t.key}
                title={t.tip}
                onClick={() => loadTab(t.key)}
                style={{
                  padding: '5px 13px', borderRadius: 20, border: 'none', fontSize: 11, cursor: 'pointer', fontWeight: 700, transition: 'all 0.12s',
                  background: tab === t.key ? '#0176D3' : '#fff',
                  color:      tab === t.key ? '#fff'    : '#64748B',
                  boxShadow:  tab === t.key ? '0 2px 8px rgba(1,118,211,0.25)' : '0 1px 3px rgba(0,0,0,0.08)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#94A3B8', fontSize: 12 }}>Loading…</div>
          ) : (
            <>
              {tab === 'applied'  && data.applied  !== undefined && (
                <CandidateList candidates={data.applied}  emptyMsg="No candidates applied during this recruiter's tenure." entry={entry} effectiveEndDate={effectiveEndDate} />
              )}
              {tab === 'pipeline' && data.pipeline !== undefined && (
                <CandidateList candidates={data.pipeline} emptyMsg="No pipeline activity during this period." entry={entry} effectiveEndDate={effectiveEndDate} />
              )}
              {tab === 'log'      && data.log      !== undefined && (
                <PipelineLog   events={data.log}          emptyMsg="No stage changes logged during this period." recruiterMap={recruiterMap} />
              )}
            </>
          )}

          {/* Count line */}
          {!loading && (
            <div style={{ marginTop: 10, fontSize: 10, color: '#94A3B8' }}>
              {tab === 'applied'  && data.applied  !== undefined && `${data.applied.length} candidate${data.applied.length !== 1 ? 's' : ''} applied while ${entry.recruiterName} was assigned`}
              {tab === 'pipeline' && data.pipeline !== undefined && `${data.pipeline.length} candidate${data.pipeline.length !== 1 ? 's' : ''} had pipeline activity during this period`}
              {tab === 'log'      && data.log      !== undefined && `${data.log.length} stage move${data.log.length !== 1 ? 's' : ''} recorded during this period`}
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

// ── Full pipeline section: ALL candidates for the job, grouped by stage ──────
function FullPipelineSection({ ensureApps, history }) {
  const [apps,    setApps]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && apps === null) {
      setLoading(true);
      const data = await ensureApps();
      setApps(data);
      setLoading(false);
    }
  };

  // Which recruiter was handling the job when this application came in
  const getRecruiterForApp = (app) => {
    const ts = app.createdAt || app.appliedAt;
    if (!ts || !history.length) return null;
    const t = new Date(ts);
    const match = history.find(r => {
      const f  = r.assignedAt ? new Date(r.assignedAt) : null;
      const to = r.removedAt  ? new Date(r.removedAt)  : null;
      return (!f || t >= f) && (!to || t <= to);
    });
    return match?.recruiterName || null;
  };

  const total = apps?.length ?? 0;

  // Group by current stage, preserving stage order
  const byStage = {};
  (apps || []).forEach(a => {
    const s = a.currentStage || a.stage || 'applied';
    if (!byStage[s]) byStage[s] = [];
    byStage[s].push(a);
  });
  const sortedStages = [
    ...STAGE_ORDER.filter(s => byStage[s]),
    ...Object.keys(byStage).filter(s => !STAGE_ORDER.includes(s)),
  ];

  return (
    <div style={{ marginBottom: 14, border: '1px solid #CBD5E1', borderRadius: 12, overflow: 'hidden' }}>
      {/* Toggle header */}
      <div
        onClick={toggle}
        style={{
          padding: '11px 14px', cursor: 'pointer', userSelect: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: open ? '#EFF6FF' : '#F8FAFC',
          borderBottom: open ? '1px solid #CBD5E1' : 'none',
          transition: 'background 0.12s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#0A1628' }}>👥 All Candidates in Pipeline</span>
          {apps !== null && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0176D3', background: 'rgba(1,118,211,0.12)', padding: '2px 9px', borderRadius: 20 }}>
              {total}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {apps !== null && sortedStages.length > 0 && (
            <div style={{ display: 'flex', gap: 4 }}>
              {sortedStages.slice(0, 4).map(s => (
                <div key={s} title={fmtStage(s)} style={{ width: 8, height: 8, borderRadius: '50%', background: STAGE_COLOR[s] || '#94A3B8' }} />
              ))}
              {sortedStages.length > 4 && <span style={{ fontSize: 10, color: '#94A3B8' }}>+{sortedStages.length - 4}</span>}
            </div>
          )}
          <span style={{ fontSize: 12, color: '#94A3B8' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Content */}
      {open && (
        <div style={{ padding: '14px 14px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 12, padding: 16 }}>Loading candidates…</div>
          ) : total === 0 ? (
            <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 12, padding: 16 }}>No candidates have applied to this job yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {sortedStages.map(stage => {
                const list  = byStage[stage];
                const color = STAGE_COLOR[stage] || '#64748B';
                return (
                  <div key={stage}>
                    {/* Stage heading */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                      <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                        {fmtStage(stage)}
                      </span>
                      <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>({list.length})</span>
                    </div>

                    {/* Candidate rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 16 }}>
                      {list.map((a, i) => {
                        const name          = a.candidate?.name || a.candidateName || '?';
                        const email         = a.candidate?.email || a.email || '';
                        const recruiterName = getRecruiterForApp(a);
                        const interviewCnt  = Array.isArray(a.interviewRounds) ? a.interviewRounds.length : 0;
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#fff', borderRadius: 8, border: `1px solid ${color}20` }}>
                            {/* Avatar */}
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                              {(name[0] || '?').toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 12, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                              <div style={{ fontSize: 10, color: '#94A3B8', display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                                {email && <span>{email}</span>}
                                <span>Applied {fmt(a.createdAt || a.appliedAt)}</span>
                                {recruiterName && <span style={{ color: '#059669', fontWeight: 600 }}>👤 {recruiterName}</span>}
                                {interviewCnt > 0 && <span style={{ color: '#D97706', fontWeight: 600 }}>🗓 {interviewCnt} interview{interviewCnt !== 1 ? 's' : ''}</span>}
                              </div>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}15`, padding: '2px 8px', borderRadius: 20, flexShrink: 0, whiteSpace: 'nowrap' }}>
                              {fmtStage(stage)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Root component ───────────────────────────────────────────────────────────
export default function JobRecruiterHistory({ jobId, jobTitle, fallbackHistory = [], currentRecruiterName, currentRecruiterId, isAdmin = false, onRecruiterChanged }) {
  const [history,       setHistory]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [allApps,       setAllApps]       = useState(null);
  const fetchedRef = useRef(false);

  // Recruiter assignment state
  const [assignMode,         setAssignMode]         = useState(false);
  const [recruiters,         setRecruiters]         = useState([]);
  const [loadingRecruiters,  setLoadingRecruiters]  = useState(false);
  const [selectedRid,        setSelectedRid]        = useState('');
  const [assigning,          setAssigning]          = useState(false);
  const [assignError,        setAssignError]        = useState('');

  const parseHistory = r => {
    // Try every shape the backend might return
    const raw = r?.data?.history
      || r?.history
      || r?.data?.recruiterHistory
      || r?.recruiterHistory
      || (Array.isArray(r?.data) ? r.data : null)
      || (Array.isArray(r) ? r : []);
    return Array.isArray(raw) ? raw : [];
  };

  const loadHistory = () => {
    if (!jobId) { setLoading(false); return; }
    setLoading(true);
    api.getJobRecruiterHistory(jobId)
      .then(r => {
        const hist = parseHistory(r);
        if (hist.length > 0) {
          setHistory(hist);
          setUsingFallback(false);
        } else if (fallbackHistory.length > 0) {
          setHistory(fallbackHistory);
          setUsingFallback(true);
        } else if (currentRecruiterName) {
          setHistory([{ recruiterName: currentRecruiterName, recruiterId: currentRecruiterId, assignedAt: null, removedAt: null, _synthetic: true }]);
          setUsingFallback(true);
        } else {
          setHistory([]);
        }
      })
      .catch(() => {
        if (fallbackHistory.length > 0) {
          setHistory(fallbackHistory);
          setUsingFallback(true);
        } else if (currentRecruiterName) {
          setHistory([{ recruiterName: currentRecruiterName, recruiterId: currentRecruiterId, assignedAt: null, removedAt: null, _synthetic: true }]);
          setUsingFallback(true);
        } else {
          setHistory([]);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchedRef.current = false;
    setAllApps(null);
    setUsingFallback(false);
    setAssignMode(false);
    setSelectedRid('');
    setAssignError('');
    loadHistory();
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAssignMode = async () => {
    setAssignMode(true);
    setAssignError('');
    if (recruiters.length === 0) {
      setLoadingRecruiters(true);
      try {
        const res = await api.getUsers({ role: 'recruiter', limit: 200 });
        const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        setRecruiters(list);
      } catch { setRecruiters([]); }
      setLoadingRecruiters(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedRid) return;
    setAssigning(true);
    setAssignError('');
    try {
      await api.assignRecruiterToJob(jobId, selectedRid);
      await loadHistory();
      setAssignMode(false);
      setSelectedRid('');
      onRecruiterChanged?.();
    } catch (e) {
      setAssignError(e.message || 'Assignment failed. Please try again.');
    }
    setAssigning(false);
  };

  // Shared lazy loader — fetches once, cached in state
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
  if (loading) return <div style={{ color: '#94A3B8', fontSize: 12, padding: '16px 0', textAlign: 'center' }}>Loading recruiter history…</div>;
  if (!history.length) return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>👤</div>
      <div style={{ color: '#374151', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>No recruiter assigned yet</div>
      <div style={{ color: '#94A3B8', fontSize: 12 }}>Once a recruiter is assigned to this job, their history will appear here.</div>
    </div>
  );

  // Sorted oldest → newest
  const sorted = [...history].sort((a, b) => new Date(a.assignedAt || 0) - new Date(b.assignedAt || 0));

  // Map recruiterId → recruiterName for "moved by" attribution in stage logs
  const recruiterMap = {};
  sorted.forEach(r => { if (r.recruiterId) recruiterMap[String(r.recruiterId)] = r.recruiterName; });

  // Detect "again" — same recruiter appearing more than once
  const nameTally = {};
  sorted.forEach(r => { nameTally[r.recruiterName] = (nameTally[r.recruiterName] || 0) + 1; });
  const nameSeen = {};

  const currentRec = sorted.find(r => !r.removedAt);
  const totalDays  = calcDays(sorted[0]?.assignedAt);
  const handoffs   = sorted.filter(r => r.removedAt).length;

  return (
    <div>
      {/* ── Summary bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12, padding: '9px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#374151' }}>
          👥 {sorted.length} recruiter{sorted.length !== 1 ? 's' : ''} assigned
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

      {/* ── Assign / Change Recruiter (admin only) ── */}
      {isAdmin && (
        <div style={{ marginBottom: 12 }}>
          {!assignMode ? (
            <button
              onClick={openAssignMode}
              style={{ background: 'rgba(1,118,211,0.08)', border: '1px solid rgba(1,118,211,0.25)', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 700, color: '#0176D3', cursor: 'pointer', width: '100%' }}
            >
              🔄 {history.length > 0 ? 'Change Recruiter' : 'Assign Recruiter'}
            </button>
          ) : (
            <div style={{ background: 'rgba(1,118,211,0.04)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 10, padding: 14 }}>
              <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 800, color: '#0176D3' }}>
                👤 {history.length > 0 ? 'Change Recruiter for this Job' : 'Assign Recruiter to this Job'}
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={selectedRid}
                  onChange={e => setSelectedRid(e.target.value)}
                  disabled={loadingRecruiters || assigning}
                  style={{ flex: 1, minWidth: 180, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #DDDBDA', fontSize: 12, fontWeight: 600 }}
                >
                  <option value="">{loadingRecruiters ? 'Loading recruiters…' : 'Select a recruiter…'}</option>
                  {recruiters.map(r => {
                    const rid = r.id || r._id?.toString();
                    return <option key={rid} value={rid}>{r.name}{r.email ? ` — ${r.email}` : ''}</option>;
                  })}
                </select>
                <button
                  onClick={handleAssign}
                  disabled={!selectedRid || assigning || loadingRecruiters}
                  style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: (!selectedRid || assigning) ? '#E2E8F0' : '#0176D3', color: (!selectedRid || assigning) ? '#94A3B8' : '#fff', fontSize: 12, fontWeight: 800, cursor: (!selectedRid || assigning) ? 'not-allowed' : 'pointer' }}
                >
                  {assigning ? 'Assigning…' : 'Confirm'}
                </button>
                <button
                  onClick={() => { setAssignMode(false); setSelectedRid(''); setAssignError(''); }}
                  disabled={assigning}
                  style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', fontSize: 12, fontWeight: 700, color: '#64748B', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
              {assignError && (
                <p style={{ margin: '8px 0 0', fontSize: 11, color: '#BA0517' }}>❌ {assignError}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Fallback notice ── */}
      {usingFallback && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', marginBottom: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8 }}>
          <span style={{ fontSize: 13 }}>ℹ️</span>
          <span style={{ fontSize: 11, color: '#92400E' }}>Showing recruiter data from job record — full assignment audit log is being built by the server.</span>
        </div>
      )}

      {/* ── All candidates in pipeline (collapsible) ── */}
      <FullPipelineSection ensureApps={ensureApps} history={sorted} />

      {/* ── Tap hint ── */}
      <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 10, fontStyle: 'italic' }}>
        Tap any recruiter below to see candidates and pipeline activity during their tenure
      </div>

      {/* ── Recruiter timeline ── */}
      <div style={{ position: 'relative', paddingLeft: 28 }}>
        {sorted.length > 1 && (
          <div style={{ position: 'absolute', left: 9, top: 24, bottom: 24, width: 2, background: '#E2E8F0', borderRadius: 2 }} />
        )}

        {sorted.map((entry, i) => {
          const isCurrent = !entry.removedAt;
          const days = calcDays(entry.assignedAt, entry.removedAt);
          nameSeen[entry.recruiterName] = (nameSeen[entry.recruiterName] || 0) + 1;
          const isRepeat = nameTally[entry.recruiterName] > 1 && nameSeen[entry.recruiterName] > 1;
          const isLast   = i === sorted.length - 1;
          const next     = sorted[i + 1];
          // Use the next recruiter's assignedAt as the effective tenure end when this entry
          // has no removedAt (e.g. bulk-assigned recruiter with no recorded removal date).
          const effectiveEndDate = entry.removedAt || next?.assignedAt || null;

          return (
            <div key={i}>
              <RecruiterEntry
                entry={entry}
                isCurrent={isCurrent}
                isRepeat={isRepeat}
                days={days}
                isLast={isLast}
                ensureApps={ensureApps}
                recruiterMap={recruiterMap}
                history={sorted}
                effectiveEndDate={effectiveEndDate}
              />
              {!isLast && next && (
                <HandoffConnector from={entry.recruiterName} to={next.recruiterName} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
