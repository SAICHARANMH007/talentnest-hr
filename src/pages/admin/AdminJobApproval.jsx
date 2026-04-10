import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { card, btnP } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const STATUS_COLORS = {
  pending:  { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', text: '#F59E0B', label: '⏳ Pending' },
  approved: { bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)',   text: '#3BA755', label: '✓ Approved' },
  rejected: { bg: 'rgba(186,5,23,0.1)',   border: 'rgba(186,5,23,0.3)',   text: '#FE5C4C', label: '✕ Rejected' },
};

function RejectModal({ job, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: '24px 16px' }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 460, maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.22)' }}>
        <div style={{ background: 'linear-gradient(135deg,#7f1d1d,#dc2626)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>Job Approval</div>
            <h3 style={{ color: '#fff', margin: 0, fontSize: 16, fontWeight: 800 }}>✕ Reject Job Posting</h3>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
          <p style={{ color: '#706E6B', fontSize: 13, margin: '0 0 16px', lineHeight: 1.5 }}>Provide a reason so the recruiter can revise and resubmit.</p>
          <div style={{ background: '#FEF2F2', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
            <div style={{ color: '#181818', fontSize: 14, fontWeight: 600 }}>{job.title}</div>
            <div style={{ color: '#dc2626', fontSize: 12 }}>{job.company}</div>
          </div>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Job description is too vague. Please add requirements, salary range, and benefits."
            rows={4}
            style={{ width: '100%', padding: '10px 14px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, color: '#181818', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ flexShrink: 0, padding: '14px 24px', borderTop: '1px solid #F1F5F9', background: '#fff', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: '#F3F2F2', border: '1px solid #DDDBDA', borderRadius: 10, color: '#706E6B', fontSize: 13, fontWeight: 600, padding: '11px 0', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => reason.trim() && onConfirm(reason)} disabled={!reason.trim()} style={{ flex: 1, background: reason.trim() ? 'linear-gradient(135deg,#7f1d1d,#dc2626)' : '#F3F2F2', border: 'none', borderRadius: 10, color: reason.trim() ? '#fff' : '#9E9D9B', fontSize: 13, fontWeight: 700, padding: '11px 0', cursor: reason.trim() ? 'pointer' : 'not-allowed', boxShadow: reason.trim() ? '0 4px 12px rgba(220,38,38,0.3)' : 'none' }}>
            ✕ Reject Job
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminJobApproval({ user }) {
  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('pending');
  const [acting, setActing]   = useState({});
  const [rejectJob, setRejectJob] = useState(null);
  const [toast, setToast]     = useState('');

  useEffect(() => {
    api.getPendingJobs().then(data => {
      const raw = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      setJobs(raw.map(j => ({ ...j, id: j.id || j._id?.toString() || String(j._id || '') })));
    }).catch(() => setJobs([])).finally(() => setLoading(false));
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleApprove = async (job) => {
    setActing(p => ({ ...p, [job.id]: 'approving' }));
    try {
      await api.approveJob(job.id, 'approved');
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, approvalStatus: 'approved', status: 'Open' } : j));
      showToast('✅ Job approved and published!');
    } catch (e) { showToast('❌ ' + e.message); }
    setActing(p => { const n = { ...p }; delete n[job.id]; return n; });
  };

  const handleReject = async (job, reason) => {
    setRejectJob(null);
    setActing(p => ({ ...p, [job.id]: 'rejecting' }));
    try {
      await api.approveJob(job.id, 'rejected', reason);
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, approvalStatus: 'rejected', rejectionReason: reason, status: 'Closed' } : j));
      showToast('Job rejected. Recruiter will be notified.');
    } catch (e) { showToast('❌ ' + e.message); }
    setActing(p => { const n = { ...p }; delete n[job.id]; return n; });
  };

  const TABS = [
    { id: 'pending',  label: 'Pending', filter: j => !j.approvalStatus || j.approvalStatus === 'pending' },
    { id: 'approved', label: 'Approved', filter: j => j.approvalStatus === 'approved' },
    { id: 'rejected', label: 'Rejected', filter: j => j.approvalStatus === 'rejected' },
    { id: 'all',      label: 'All Jobs', filter: () => true },
  ];

  const activeTab = TABS.find(t => t.id === tab);
  const filtered  = activeTab ? jobs.filter(activeTab.filter) : jobs;

  const counts = TABS.reduce((acc, t) => { acc[t.id] = jobs.filter(t.filter).length; return acc; }, {});

  return (
    <div>
      <PageHeader title="Job Approvals" subtitle="Review and approve job postings before they go live" />

      {/* Toast */}
      {toast && (
        <div style={{ background: toast.startsWith('✅') ? 'rgba(34,197,94,0.12)' : 'rgba(186,5,23,0.1)', border: `1px solid ${toast.startsWith('✅') ? 'rgba(34,197,94,0.3)' : 'rgba(186,5,23,0.3)'}`, borderRadius: 10, padding: '10px 16px', color: toast.startsWith('✅') ? '#3BA755' : '#fca5a5', fontSize: 13, marginBottom: 20 }}>
          {toast}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: '#FFFFFF', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: tab === t.id ? '#0176D3' : 'transparent', color: tab === t.id ? '#fff' : '#706E6B', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}>
            {t.label}
            {counts[t.id] > 0 && <span style={{ background: tab === t.id ? 'rgba(255,255,255,0.25)' : 'rgba(1,118,211,0.2)', color: tab === t.id ? '#fff' : '#0176D3', borderRadius: 20, minWidth: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, padding: '0 5px' }}>{counts[t.id]}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: '#706E6B' }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#706E6B' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{tab === 'pending' ? '🎉' : '📋'}</div>
          <p style={{ margin: 0, fontSize: 14 }}>{tab === 'pending' ? 'All caught up! No pending approvals.' : `No ${tab} jobs.`}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(j => {
            const status = j.approvalStatus || 'pending';
            const sc     = STATUS_COLORS[status] || STATUS_COLORS.pending;
            const isActing = !!acting[j.id];
            const skills = j.skills ? (Array.isArray(j.skills) ? j.skills : j.skills.split(',').map(s => s.trim()).filter(Boolean)) : [];

            return (
              <div key={j.id} style={{ ...card, border: `1px solid ${sc.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ color: '#181818', fontWeight: 700, fontSize: 15 }}>{j.title}</span>
                      <span style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 20, padding: '2px 9px', fontSize: 10, fontWeight: 700 }}>{sc.label}</span>
                      {j.type && <span style={{ color: '#706E6B', background: '#F3F2F2', border: '1px solid #DDDBDA', borderRadius: 6, padding: '2px 7px', fontSize: 10 }}>{j.type}</span>}
                    </div>
                    <div style={{ color: '#0176D3', fontSize: 13 }}>{j.company}{j.location ? ` · ${j.location}` : ''}</div>

                    <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
                      {j.salary && <span style={{ color: '#706E6B', fontSize: 12 }}>💰 {j.salary}</span>}
                      {j.experience && <span style={{ color: '#706E6B', fontSize: 12 }}>🎓 {j.experience}</span>}
                      {j.recruiterName && <span style={{ color: '#706E6B', fontSize: 12 }}>👤 {j.recruiterName}</span>}
                      <span style={{ color: '#64748b', fontSize: 11 }}>Posted {new Date(j.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>

                    {skills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                        {skills.slice(0, 6).map(s => <span key={s} style={{ fontSize: 10, color: '#0176D3', background: 'rgba(1,118,211,0.1)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 6, padding: '2px 7px' }}>{s}</span>)}
                      </div>
                    )}

                    {j.description && (
                      <p style={{ color: '#64748b', fontSize: 12, marginTop: 8, lineHeight: 1.5, margin: '8px 0 0' }}>
                        {j.description.slice(0, 160)}{j.description.length > 160 ? '…' : ''}
                      </p>
                    )}

                    {j.rejectionReason && (
                      <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(186,5,23,0.08)', borderRadius: 8, border: '1px solid rgba(186,5,23,0.2)' }}>
                        <p style={{ color: '#fca5a5', fontSize: 12, margin: 0 }}>Rejection reason: {j.rejectionReason}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {status === 'pending' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => handleApprove(j)}
                        disabled={isActing}
                        style={{ ...btnP, fontSize: 12, padding: '8px 18px', opacity: isActing ? 0.6 : 1, background: 'linear-gradient(135deg,#2E844A,#16a34a)' }}
                      >
                        {acting[j.id] === 'approving' ? 'Approving…' : '✓ Approve'}
                      </button>
                      <button
                        onClick={() => setRejectJob(j)}
                        disabled={isActing}
                        style={{ background: 'rgba(186,5,23,0.12)', border: '1px solid rgba(186,5,23,0.3)', borderRadius: 10, color: '#FE5C4C', fontSize: 12, fontWeight: 700, padding: '8px 18px', cursor: 'pointer', opacity: isActing ? 0.6 : 1 }}
                      >
                        {acting[j.id] === 'rejecting' ? 'Rejecting…' : '✕ Reject'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rejectJob && (
        <RejectModal
          job={rejectJob}
          onConfirm={(reason) => handleReject(rejectJob, reason)}
          onClose={() => setRejectJob(null)}
        />
      )}
    </div>
  );
}
