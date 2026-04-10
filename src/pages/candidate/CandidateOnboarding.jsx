import { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import Spinner from '../../components/ui/Spinner.jsx';

const CATEGORY_ICONS = { document: '📄', training: '📚', it_setup: '💻', policy: '📋', orientation: '🤝', other: '📌' };
const CATEGORY_LABELS = { document: 'Document', training: 'Training', it_setup: 'IT Setup', policy: 'Policy', orientation: 'Orientation', other: 'Other' };

const STATUS_COLORS = {
  pending:     { color: '#B45309', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)' },
  in_progress: { color: '#0176D3', bg: 'rgba(1,118,211,0.08)',   border: 'rgba(1,118,211,0.25)' },
  completed:   { color: '#065f46', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)' },
};

function RingProgress({ pct, size = 100 }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F3F2F2" strokeWidth={8} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={pct === 100 ? '#10b981' : '#0176D3'} strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.5s' }} />
    </svg>
  );
}

export default function CandidateOnboarding({ user }) {
  const [record,  setRecord]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState('');
  const [toggling, setToggling] = useState('');

  const candidateId = user?.candidateId || user?.id || user?._id;

  useEffect(() => {
    if (!candidateId) { setLoading(false); return; }
    api.getMyPreBoarding(candidateId)
      .then(r => setRecord(r?.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [candidateId]);

  const toggleTask = async (taskId, completed) => {
    if (!record) return;
    setToggling(taskId);
    try {
      const r = await api.updatePreBoardingTask(record._id || record.id, taskId, { completed });
      setRecord(r?.data || r);
      if (completed) setToast('✅ Task marked complete!');
    } catch (e) { setToast('❌ ' + e.message); }
    setToggling('');
  };

  const confirmJoining = async () => {
    if (!record) return;
    try {
      const r = await api.updatePreBoarding(record._id || record.id, { joiningConfirmed: true });
      setRecord(r?.data || r);
      setToast('✅ Joining confirmed! We\'re excited to have you.');
    } catch (e) { setToast('❌ ' + e.message); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>;

  if (!record) return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
      <h2 style={{ color: '#181818', fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>No Active Pre-boarding</h2>
      <p style={{ color: '#706E6B', fontSize: 14 }}>Your pre-boarding checklist will appear here once your offer is signed.</p>
    </div>
  );

  const tasks   = record.tasks || [];
  const done    = tasks.filter(t => t.completedAt).length;
  const pct     = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const sc      = STATUS_COLORS[record.status] || STATUS_COLORS.pending;

  const joiningDateStr = record.joiningDate
    ? new Date(record.joiningDate).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  const daysLeft = record.joiningDate
    ? Math.ceil((new Date(record.joiningDate) - new Date()) / 86400000)
    : null;

  // Group tasks by category
  const grouped = tasks.reduce((acc, t) => {
    const cat = t.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: 700 }}>
      {toast && (
        <div style={{ background: toast.startsWith('❌') ? 'rgba(186,5,23,0.07)' : 'rgba(16,185,129,0.07)', border: `1px solid ${toast.startsWith('❌') ? 'rgba(186,5,23,0.3)' : 'rgba(16,185,129,0.3)'}`, borderRadius: 10, padding: '10px 16px', color: toast.startsWith('❌') ? '#BA0517' : '#065f46', fontSize: 13, marginBottom: 16 }}>
          {toast}
        </div>
      )}

      {/* Hero Card */}
      <div style={{ background: 'linear-gradient(135deg,#032D60,#0176D3)', borderRadius: 20, padding: '28px 32px', marginBottom: 24, color: '#fff', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Pre-boarding</div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>Welcome, {(record.candidateName || user?.name || 'there').split(' ')[0]}! 🎉</h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>{record.designation}</p>
          {joiningDateStr && (
            <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 14px', display: 'inline-block' }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                📅 Joining: {joiningDateStr}
                {daysLeft !== null && daysLeft >= 0 && <span style={{ marginLeft: 8, color: 'rgba(255,255,255,0.7)' }}>({daysLeft === 0 ? 'Today!' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} away`})</span>}
              </span>
            </div>
          )}
        </div>
        {/* Ring progress */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <RingProgress pct={pct} size={100} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{pct}%</span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>DONE</span>
          </div>
        </div>
      </div>

      {/* Status + Confirm joining */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ ...sc, padding: '8px 14px', borderRadius: 10, border: `1px solid ${sc.border}`, fontSize: 13, fontWeight: 700 }}>
          {{pending:'⏳ Not started', in_progress:'🔄 In progress', completed:'✅ Completed'}[record.status] || record.status}
        </div>
        {!record.joiningConfirmed && joiningDateStr && (
          <button onClick={confirmJoining} style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, color: '#065f46', fontWeight: 700, fontSize: 13, padding: '8px 16px', cursor: 'pointer' }}>
            ✅ Confirm I'll join on {new Date(record.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </button>
        )}
        {record.joiningConfirmed && (
          <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, color: '#065f46', fontWeight: 700, fontSize: 13, padding: '8px 16px' }}>
            ✅ Joining confirmed
          </div>
        )}
      </div>

      {/* Task Groups */}
      {Object.entries(grouped).map(([cat, catTasks]) => (
        <div key={cat} style={{ background: '#fff', border: '1px solid rgba(1,118,211,0.12)', borderRadius: 16, marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ background: 'rgba(1,118,211,0.04)', padding: '12px 20px', borderBottom: '1px solid rgba(1,118,211,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{CATEGORY_ICONS[cat]}</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#032D60' }}>{CATEGORY_LABELS[cat]}</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9E9D9B' }}>
              {catTasks.filter(t => t.completedAt).length}/{catTasks.length}
            </span>
          </div>
          <div style={{ padding: '8px 20px' }}>
            {catTasks.map(task => {
              const isDone = !!task.completedAt;
              const isToggling = toggling === task._id;
              return (
                <div key={task._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F8FAFC' }}>
                  <button
                    onClick={() => !isDone && toggleTask(task._id, true)}
                    disabled={isDone || isToggling}
                    style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${isDone ? '#10b981' : '#DDDBDA'}`, background: isDone ? '#10b981' : '#fff', cursor: isDone ? 'default' : 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', transition: 'all 0.2s' }}
                  >
                    {isToggling ? '…' : isDone ? '✓' : ''}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isDone ? '#9E9D9B' : '#181818', textDecoration: isDone ? 'line-through' : 'none' }}>
                      {task.title}
                      {task.isRequired && !isDone && <span style={{ color: '#ef4444', fontSize: 10, marginLeft: 4 }}>Required</span>}
                    </div>
                    {task.description && <div style={{ fontSize: 11, color: '#9E9D9B', marginTop: 2 }}>{task.description}</div>}
                  </div>
                  {isDone && (
                    <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600, flexShrink: 0 }}>
                      ✅ Done · {new Date(task.completedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {pct === 100 && (
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 16, padding: '20px 24px', textAlign: 'center', marginTop: 8 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎊</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#065f46', marginBottom: 4 }}>All done! You're ready for Day 1.</div>
          <div style={{ fontSize: 13, color: '#047857' }}>Your HR team has been notified. See you on {joiningDateStr || 'joining day'}!</div>
        </div>
      )}
    </div>
  );
}
