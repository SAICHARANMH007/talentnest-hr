import { useMemo } from 'react';

const STAGE_META = {
  applied:             { label: 'Application Received', icon: '📥', color: '#0176D3' },
  screening:           { label: 'Screening',            icon: '🔍', color: '#7C3AED' },
  shortlisted:         { label: 'Shortlisted',          icon: '⭐', color: '#0369A1' },
  interview_scheduled: { label: 'Interview Scheduled',  icon: '📅', color: '#F59E0B' },
  interview_completed: { label: 'Interview Completed',  icon: '✅', color: '#10B981' },
  offer_extended:      { label: 'Offer Extended',       icon: '📄', color: '#D97706' },
  selected:            { label: 'Hired / Selected',     icon: '🏆', color: '#059669' },
  rejected:            { label: 'Rejected',             icon: '❌', color: '#BA0517' },
  parked:              { label: 'Moved to Talent Pool', icon: '🅿️', color: '#706E6B' },
};

const fmt = d =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime = d =>
  d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

function getTs(entry) {
  return entry.movedAt || entry.changedAt || entry.date;
}

function recruiterAtTime(ts, history) {
  if (!history?.length) return null;
  // No timestamp — return current active recruiter or last known
  if (!ts) return history.find(r => !r.removedAt) || history[history.length - 1];
  const t = new Date(ts).getTime();
  // Exact tenure match
  for (const r of history) {
    const from = r.assignedAt ? new Date(r.assignedAt).getTime() : 0;
    const to   = r.removedAt  ? new Date(r.removedAt).getTime()  : Date.now();
    if (t >= from && t <= to) return r;
  }
  // Fallback: most recently assigned recruiter before this event
  const before = history
    .filter(r => r.assignedAt && new Date(r.assignedAt).getTime() <= t)
    .sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt));
  if (before.length) return before[0];
  // Last resort: whoever was assigned first (event predates all recruiter assignments)
  return history[0];
}

function RecruiterBadge({ recruiter }) {
  if (!recruiter) return null;
  const isCurrent = !recruiter.removedAt;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: isCurrent ? 'rgba(5,150,105,0.1)' : '#F1F5F9',
      color:      isCurrent ? '#059669'              : '#64748B',
      fontSize: 10, fontWeight: 700,
      padding: '2px 8px', borderRadius: 20,
    }}>
      👤 {recruiter.recruiterName}{isCurrent ? ' (current)' : ' (past)'}
    </span>
  );
}

function TimelineEntry({ ev, recruiterHistory, isLast }) {
  const meta = STAGE_META[ev.stageId] || { label: ev.label || ev.stageId || 'Stage Change', icon: '•', color: '#64748B' };
  const rec  = recruiterAtTime(ev.ts, recruiterHistory);

  return (
    <div style={{ position: 'relative', marginBottom: isLast ? 0 : 20 }}>
      {/* Dot */}
      <div style={{
        position: 'absolute', left: -20, top: 4,
        width: 12, height: 12, borderRadius: '50%',
        background: meta.color,
        border: '2.5px solid #fff',
        boxShadow: `0 0 0 2px ${meta.color}44`,
        zIndex: 1,
      }} />

      <div style={{
        background: ev.type === 'applied' ? 'rgba(1,118,211,0.05)' : '#FAFAFA',
        border: `1px solid ${meta.color}25`,
        borderRadius: 10,
        padding: '10px 12px',
      }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: meta.color }}>
            {meta.icon} {meta.label}
          </span>
          {ev.type === 'interview' && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', background: 'rgba(245,158,11,0.1)', padding: '1px 8px', borderRadius: 20 }}>
              Round {ev.round} · {ev.format === 'video' ? 'Video' : ev.format === 'phone' ? 'Phone' : 'In-Person'}
            </span>
          )}
        </div>

        {/* Meta row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 11, color: '#94A3B8' }}>
          <span>{fmt(ev.ts)}{ev.ts && fmtTime(ev.ts) ? ` · ${fmtTime(ev.ts)}` : ''}</span>
          <RecruiterBadge recruiter={rec} />
          {ev.interviewerName && (
            <span style={{ color: '#475569' }}>Interviewer: <strong style={{ color: '#374151' }}>{ev.interviewerName}</strong></span>
          )}
        </div>

        {/* Note */}
        {ev.note && (
          <div style={{ marginTop: 7, fontSize: 11, color: '#475569', fontStyle: 'italic', background: 'rgba(0,0,0,0.03)', padding: '5px 9px', borderRadius: 6, borderLeft: `2.5px solid ${meta.color}77` }}>
            "{ev.note}"
          </div>
        )}

        {/* Interview link */}
        {ev.videoLink && (
          <div style={{ marginTop: 6 }}>
            <a
              href={/^https?:\/\//i.test(ev.videoLink) ? ev.videoLink : `https://${ev.videoLink}`}
              target="_blank" rel="noreferrer"
              style={{ fontSize: 11, color: '#0176D3', fontWeight: 600, textDecoration: 'none' }}
            >
              🔗 Interview Link →
            </a>
          </div>
        )}
        {/* Kit scores summary */}
        {ev.kitScores?.length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ev.kitScores.map((ks, ki) => (
              <span key={ki} style={{ background: 'rgba(124,58,237,0.08)', color: '#7C3AED', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>
                {ks.competency}: {ks.score || 0}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CandidateActivityTimeline({ app, recruiterHistory = [] }) {
  const events = useMemo(() => {
    const list = [];

    list.push({ type: 'applied', ts: app.createdAt, stageId: 'applied', label: 'Application Received' });

    (app.stageHistory || []).forEach(h => {
      const sid = (h.stageId || h.stage || '').toLowerCase();
      if (sid === 'applied') return; // already added explicitly above
      const ts = getTs(h);
      list.push({ type: 'stage', ts, stageId: h.stageId || h.stage, label: h.stage, note: h.note || null });
    });

    (app.interviewRounds || []).forEach((r, i) => {
      if (r.scheduledAt) {
        list.push({
          type: 'interview', ts: r.scheduledAt,
          stageId: 'interview_scheduled',
          round: i + 1,
          format: r.format,
          interviewerName: r.interviewerName || null,
          videoLink: r.videoLink || null,
          kitScores: r.kitScores || [],
        });
      }
    });

    list.sort((a, b) => new Date(a.ts || 0) - new Date(b.ts || 0));
    return list;
  }, [app]);

  const stars = n => '★'.repeat(n || 0) + '☆'.repeat(5 - (n || 0));

  return (
    <div style={{ borderTop: '1.5px solid #E2E8F0', paddingTop: 14, marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: '#0176D3', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          📜 Full Activity History
        </span>
        {recruiterHistory.length > 0 && (
          <span style={{ fontSize: 10, color: '#059669', background: 'rgba(5,150,105,0.08)', padding: '2px 9px', borderRadius: 20, fontWeight: 600 }}>
            👤 {recruiterHistory.length} recruiter{recruiterHistory.length !== 1 ? 's' : ''} on this job
          </span>
        )}
        {recruiterHistory.length === 0 && (
          <span style={{ fontSize: 10, color: '#94A3B8', fontStyle: 'italic' }}>recruiter attribution not available</span>
        )}
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: 26 }}>
        <div style={{ position: 'absolute', left: 9, top: 0, bottom: 0, width: 2, background: '#E2E8F0', borderRadius: 2 }} />
        {events.length === 0 ? (
          <p style={{ fontSize: 12, color: '#94A3B8' }}>No activity recorded yet.</p>
        ) : (
          events.map((ev, i) => (
            <TimelineEntry
              key={i}
              ev={ev}
              recruiterHistory={recruiterHistory}
              isLast={i === events.length - 1}
            />
          ))
        )}
      </div>

      {/* Feedback */}
      {app.feedback && (
        <div style={{ marginTop: 18, padding: '14px 14px', background: 'rgba(1,118,211,0.04)', border: '1.5px solid rgba(1,118,211,0.15)', borderRadius: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#0176D3', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
            🎯 Interview Feedback
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 18, color: '#F59E0B', letterSpacing: 1 }}>{stars(app.feedback.rating)}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{app.feedback.rating || 0}/5</span>
            <span style={{
              fontSize: 11, fontWeight: 800,
              background: app.feedback.recommendation ? 'rgba(5,150,105,0.12)'  : 'rgba(186,5,23,0.1)',
              color:      app.feedback.recommendation ? '#059669'                : '#BA0517',
              padding: '3px 12px', borderRadius: 20,
            }}>
              {app.feedback.recommendation ? '✓ Recommended to Proceed' : '✕ Not Recommended'}
            </span>
          </div>
          {app.feedback.strengths && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#059669', textTransform: 'uppercase', marginBottom: 3 }}>Strengths</div>
              <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.55, background: 'rgba(5,150,105,0.05)', padding: '6px 10px', borderRadius: 8, borderLeft: '2.5px solid #059669' }}>
                {app.feedback.strengths}
              </div>
            </div>
          )}
          {app.feedback.weaknesses && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#BA0517', textTransform: 'uppercase', marginBottom: 3 }}>Areas for Improvement</div>
              <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.55, background: 'rgba(186,5,23,0.04)', padding: '6px 10px', borderRadius: 8, borderLeft: '2.5px solid #BA0517' }}>
                {app.feedback.weaknesses}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recruiter Notes */}
      {app.recruiterNotes && (
        <div style={{ marginTop: 12, padding: '10px 12px', background: '#FFFBF0', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#D97706', textTransform: 'uppercase', marginBottom: 4 }}>📝 Recruiter Notes</div>
          <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{app.recruiterNotes}</div>
        </div>
      )}
    </div>
  );
}
