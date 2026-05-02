import { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import Toast from '../../components/ui/Toast.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

const STATUS_COLORS = {
  pending:     { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)',  text: '#B45309' },
  in_progress: { bg: 'rgba(1,118,211,0.08)',   border: 'rgba(1,118,211,0.25)',   text: '#0176D3' },
  completed:   { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)', text: '#065f46' },
  cancelled:   { bg: 'rgba(158,157,155,0.08)', border: 'rgba(158,157,155,0.25)',text: '#706E6B' },
};
const STATUS_LABELS = { pending: '⏳ Pending', in_progress: '🔄 In Progress', completed: '✅ Completed', cancelled: '🚫 Cancelled' };

const CATEGORY_ICONS = { document: '📄', training: '📚', it_setup: '💻', policy: '📋', orientation: '🤝', other: '📌' };

const card = { background: '#fff', border: '1px solid rgba(1,118,211,0.12)', borderRadius: 16, padding: 24 };

const VERIFY_COLOR = { not_uploaded:'#94A3B8', pending_review:'#F59E0B', verified:'#10B981', rejected:'#EF4444', resubmission_required:'#F97316' };
const VERIFY_LABEL = { not_uploaded:'Not Uploaded', pending_review:'Pending Review', verified:'Verified ✅', rejected:'Rejected ❌', resubmission_required:'Resubmit 🔄' };

function TaskRow({ task, pbId, onToggle, onVerify }) {
  const done    = !!task.completedAt;
  const isDoc   = task.category === 'document';
  const vs      = task.verifyStatus || 'not_uploaded';
  const hasFile = !!task.fileUrl;
  const [verifying, setVerifying] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [showReject, setShowReject] = useState(false);

  const verify = async (action, notes) => {
    setVerifying(true);
    try { await onVerify(task._id, action, notes); } catch {}
    setVerifying(false); setShowReject(false); setRejectNote('');
  };

  const downloadFile = () => {
    const a = document.createElement('a');
    a.href = task.fileUrl; a.download = task.fileName || 'document'; a.click();
  };

  return (
    <div style={{ borderBottom:'1px solid #F3F2F2' }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 0' }}>
        <button onClick={() => onToggle(task._id, !done)}
          style={{ width:20, height:20, borderRadius:4, border:`2px solid ${done?'#10b981':'#DDDBDA'}`, background:done?'#10b981':'#fff', cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, marginTop:1 }}>
          {done && '✓'}
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:12, color:done?'#9E9D9B':'#181818', textDecoration:done?'line-through':'none' }}>
              {CATEGORY_ICONS[task.category]||'📌'} {task.title}
              {task.isRequired && !done && <span style={{ color:'#ef4444', fontSize:10, marginLeft:4 }}>*</span>}
            </span>
            {isDoc && <span style={{ fontSize:10, fontWeight:700, color:VERIFY_COLOR[vs]||'#94A3B8', background:`${VERIFY_COLOR[vs]}18`, padding:'1px 7px', borderRadius:10 }}>{VERIFY_LABEL[vs]||vs}</span>}
          </div>
          {/* File info */}
          {hasFile && (
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6, flexWrap:'wrap' }}>
              <button onClick={downloadFile} style={{ fontSize:11, color:'#0176D3', background:'none', border:'1px solid #0176D3', borderRadius:6, padding:'3px 10px', cursor:'pointer' }}>
                ⬇️ {task.fileName||'Download'} {task.fileSize?`(${(task.fileSize/1024).toFixed(0)}KB)`:''}
              </button>
              {task.fileUploadedAt && <span style={{ fontSize:10, color:'#94A3B8' }}>Uploaded {new Date(task.fileUploadedAt).toLocaleDateString('en-IN')}</span>}
              {/* Verify/Reject buttons for HR */}
              {isDoc && vs==='pending_review' && !verifying && (
                <>
                  <button onClick={()=>verify('approve','')} style={{ fontSize:11, background:'#10B981', color:'#fff', border:'none', borderRadius:6, padding:'3px 10px', cursor:'pointer', fontWeight:700 }}>✅ Approve</button>
                  <button onClick={()=>setShowReject(p=>!p)} style={{ fontSize:11, background:'#EF4444', color:'#fff', border:'none', borderRadius:6, padding:'3px 10px', cursor:'pointer', fontWeight:700 }}>❌ Reject</button>
                  <button onClick={()=>verify('request_resubmission','')} style={{ fontSize:11, background:'#F97316', color:'#fff', border:'none', borderRadius:6, padding:'3px 10px', cursor:'pointer', fontWeight:700 }}>🔄 Resubmit</button>
                </>
              )}
              {verifying && <span style={{ fontSize:11, color:'#94A3B8' }}>⏳ Updating…</span>}
              {isDoc && vs==='verified' && <span style={{ fontSize:11, color:'#10B981', fontWeight:700 }}>✅ Verified {task.verifiedAt?`on ${new Date(task.verifiedAt).toLocaleDateString('en-IN')}`:''}</span>}
            </div>
          )}
          {/* Rejection note input */}
          {showReject && (
            <div style={{ display:'flex', gap:6, marginTop:6 }}>
              <input value={rejectNote} onChange={e=>setRejectNote(e.target.value)} placeholder="Reason for rejection…"
                style={{ flex:1, padding:'5px 10px', borderRadius:6, border:'1px solid #E2E8F0', fontSize:12, outline:'none' }} />
              <button onClick={()=>verify('reject',rejectNote)} style={{ background:'#EF4444', color:'#fff', border:'none', borderRadius:6, padding:'5px 12px', cursor:'pointer', fontSize:12, fontWeight:700 }}>Send</button>
            </div>
          )}
        </div>
        {done && !isDoc && <span style={{ fontSize:10, color:'#10b981', flexShrink:0 }}>{task.completedBy==='hr'?'HR':'Cand.'} · {new Date(task.completedAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</span>}
      </div>
    </div>
  );
}

function DetailModal({ record, onClose, onUpdate }) {
  const [sending, setSending] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [toast, setToast] = useState('');

  const pct = (() => {
    if (!record.tasks?.length) return 0;
    const done = record.tasks.filter(t => t.completedAt).length;
    return Math.round((done / record.tasks.length) * 100);
  })();

  const toggleTask = async (taskId, completed) => {
    try {
      const r = await api.updatePreBoardingTask(record._id || record.id, taskId, { completed });
      onUpdate(r?.data || r);
    } catch (e) { setToast('❌ ' + e.message); }
  };

  const verifyDocument = async (taskId, action, notes) => {
    try {
      const r = await api.verifyPreBoardingDocument(record._id || record.id, taskId, action, notes);
      onUpdate(r?.data || r);
      setToast(action === 'approve' ? '✅ Document approved' : action === 'reject' ? '❌ Document rejected' : '🔄 Resubmission requested');
    } catch (e) { setToast('❌ ' + e.message); }
  };

  const sendKit = async () => {
    setSending(true);
    try {
      await api.sendPreBoardingWelcomeKit(record._id || record.id);
      setToast('✅ Welcome kit sent!');
      onUpdate({ ...record, welcomeKitSentAt: new Date() });
    } catch (e) { setToast('❌ ' + e.message); }
    setSending(false);
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    setAddingTask(true);
    try {
      const r = await api.addPreBoardingTask(record._id || record.id, { title: newTask.trim() });
      onUpdate(r?.data || r);
      setNewTask('');
    } catch (e) { setToast('❌ ' + e.message); }
    setAddingTask(false);
  };

  const sc = STATUS_COLORS[record.status] || STATUS_COLORS.pending;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#032D60,#0176D3)', padding: '20px 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Pre-boarding</div>
              <h2 style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 800 }}>{record.candidateName}</h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '4px 0 0' }}>{record.designation}</p>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 16, cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
          {/* Progress */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Checklist Progress</span>
              <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{pct}%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10b981' : '#fff', borderRadius: 3, transition: 'width 0.4s' }} />
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {toast && <div style={{ background: toast.startsWith('❌') ? 'rgba(186,5,23,0.07)' : 'rgba(16,185,129,0.07)', border: `1px solid ${toast.startsWith('❌') ? 'rgba(186,5,23,0.3)' : 'rgba(16,185,129,0.3)'}`, borderRadius: 8, padding: '8px 12px', color: toast.startsWith('❌') ? '#BA0517' : '#065f46', fontSize: 13, marginBottom: 12 }}>{toast}</div>}

          {/* Info row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              ['Joining Date', record.joiningDate ? new Date(record.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'],
              ['Status', STATUS_LABELS[record.status] || record.status],
              ['Confirmed', record.joiningConfirmed ? '✅ Yes' : '❌ No'],
              ['Welcome Kit', record.welcomeKitSentAt ? '✅ Sent' : '⏳ Not sent'],
            ].map(([l, v]) => (
              <div key={l} style={{ background: '#FAFAF9', border: '1px solid #F1F5F9', borderRadius: 8, padding: '8px 12px', flex: '1 1 120px' }}>
                <div style={{ fontSize: 10, color: '#9E9D9B', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 13, color: '#181818', fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <button onClick={sendKit} disabled={sending} style={{ background: 'rgba(1,118,211,0.08)', border: '1px solid rgba(1,118,211,0.25)', borderRadius: 8, color: '#0176D3', fontWeight: 600, fontSize: 12, padding: '7px 14px', cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.6 : 1 }}>
              {sending ? '…' : '📧 ' + (record.welcomeKitSentAt ? 'Resend' : 'Send') + ' Welcome Kit'}
            </button>
          </div>

          {/* Tasks */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#032D60', marginBottom: 8 }}>📋 Checklist ({record.tasks?.filter(t => t.completedAt).length || 0}/{record.tasks?.length || 0})</div>
            {(record.tasks || []).map(task => (
              <TaskRow key={task._id} task={task} pbId={record._id || record.id} onToggle={toggleTask} onVerify={verifyDocument} />
            ))}
          </div>

          {/* Add task */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="Add a custom task…"
              style={{ flex: 1, padding: '8px 12px', border: '1px solid rgba(1,118,211,0.25)', borderRadius: 8, fontSize: 13, outline: 'none' }}
            />
            <button onClick={addTask} disabled={addingTask || !newTask.trim()} style={{ background: '#0176D3', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12, padding: '8px 14px', cursor: 'pointer' }}>
              {addingTask ? '…' : '+ Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminOnboarding({ user }) {
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [toast, setToast]       = useState('');

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: 50, ...(statusFilter && { status: statusFilter }) }).toString();
      const r = await api.getPreBoardings(qs);
      setRecords(Array.isArray(r?.data) ? r.data : []);
    } catch { setRecords([]); }
    setLoading(false);
  };

  const handleUpdate = (updated) => {
    const id = updated._id?.toString() || updated.id;
    setRecords(prev => prev.map(r => (r._id?.toString() === id || r.id === id) ? { ...r, ...updated } : r));
    setSelected(prev => prev ? { ...prev, ...updated } : null);
  };

  const filtered = records.filter(r => !search || r.candidateName?.toLowerCase().includes(search.toLowerCase()) || r.designation?.toLowerCase().includes(search.toLowerCase()));

  const stats = {
    total:       records.length,
    pending:     records.filter(r => r.status === 'pending').length,
    in_progress: records.filter(r => r.status === 'in_progress').length,
    completed:   records.filter(r => r.status === 'completed').length,
  };

  return (
    <div>
      {selected && <DetailModal record={selected} onClose={() => setSelected(null)} onUpdate={handleUpdate} />}
      <Toast msg={toast} onClose={() => setToast('')} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#181818', fontSize: 24, fontWeight: 800, margin: 0 }}>🎯 Pre-boarding</h1>
          <p style={{ color: '#706E6B', fontSize: 14, margin: '4px 0 0' }}>Track new hire joining checklists and welcome kits</p>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total', value: stats.total,       color: '#0176D3', bg: 'rgba(1,118,211,0.06)' },
          { label: 'Pending', value: stats.pending,   color: '#B45309', bg: 'rgba(245,158,11,0.06)' },
          { label: 'In Progress', value: stats.in_progress, color: '#0176D3', bg: 'rgba(1,118,211,0.06)' },
          { label: 'Completed', value: stats.completed,color: '#065f46', bg: 'rgba(16,185,129,0.06)' },
        ].map(k => (
          <div key={k.label} style={{ ...card, background: k.bg, border: `1px solid ${k.color}33`, textAlign: 'center', padding: '16px 12px' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 12, color: '#706E6B', fontWeight: 600, marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or role…"
          style={{ flex: 1, minWidth: 200, padding: '9px 14px', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 10, fontSize: 13, outline: 'none' }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '9px 12px', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 10, fontSize: 13, outline: 'none', background: '#fff' }}>
          <option value="">All Statuses</option>
          <option value="pending">⏳ Pending</option>
          <option value="in_progress">🔄 In Progress</option>
          <option value="completed">✅ Completed</option>
          <option value="cancelled">🚫 Cancelled</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '60px 24px', color: '#9E9D9B' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>No pre-boarding records found</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Records are created automatically when candidates sign their offer letters.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(r => {
            const sc = STATUS_COLORS[r.status] || STATUS_COLORS.pending;
            const tasks = r.tasks || [];
            const done  = tasks.filter(t => t.completedAt).length;
            const pct   = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
            const daysLeft = r.joiningDate ? Math.ceil((new Date(r.joiningDate) - new Date()) / 86400000) : null;

            return (
              <div key={r._id || r.id} onClick={() => setSelected(r)} style={{ ...card, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', transition: 'box-shadow 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(1,118,211,0.12)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#032D60,#0176D3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                  {(r.candidateName || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#181818' }}>{r.candidateName || '—'}</div>
                  <div style={{ fontSize: 12, color: '#706E6B' }}>{r.designation || '—'}{r.joiningDate && ` · Joining ${new Date(r.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}</div>
                </div>
                {/* Progress bar */}
                <div style={{ width: 80, flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: '#706E6B', textAlign: 'right', marginBottom: 3 }}>{pct}%</div>
                  <div style={{ height: 5, background: '#F3F2F2', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10b981' : '#0176D3', borderRadius: 3 }} />
                  </div>
                </div>
                {daysLeft !== null && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: daysLeft <= 3 ? '#ef4444' : daysLeft <= 7 ? '#B45309' : '#706E6B', flexShrink: 0, width: 60, textAlign: 'center' }}>
                    {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? 'Today!' : 'Joined'}
                  </div>
                )}
                <span style={{ ...sc, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, flexShrink: 0 }}>
                  {STATUS_LABELS[r.status] || r.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
