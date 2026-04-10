import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { SM } from '../../constants/stages.js';
import { card } from '../../constants/styles.js';
import { api } from '../../api/api.js';

// ── helpers ──────────────────────────────────────────────────────────────────
// Backend populates 'jobId' with job object — normalize normalizes it.
// So app.jobId = { id, title, companyName, location, type, ... }
const getJobField = (a, field) => a.jobId?.[field] || a.job?.[field] || '';
const getJobId    = (a) => a.jobId?.id || a.jobId?._id?.toString?.() || (typeof a.jobId === 'string' ? a.jobId : '') || a.job?.id || '';

// Ordered pipeline stages for the stepper
const STEPPER_STAGES = [
  { id: 'applied',            label: 'Applied',    icon: '📝' },
  { id: 'screening',          label: 'Screening',  icon: '🔍' },
  { id: 'shortlisted',        label: 'Shortlisted',icon: '⭐' },
  { id: 'interview_scheduled',label: 'Interview',  icon: '📅' },
  { id: 'interview_completed',label: 'Completed',  icon: '✅' },
  { id: 'offer_extended',     label: 'Offered',    icon: '🎉' },
  { id: 'selected',           label: 'Hired',      icon: '🏆' },
];

function ApplicationStepper({ app }) {
  const isRejected = app.stage === 'rejected' || app.stage === 'withdrawn';
  const currentIndex = isRejected ? -1 : STEPPER_STAGES.findIndex(s => s.id === app.stage);

  // stageHistory uses changedAt (NOT date)
  const stageDates = {};
  if (Array.isArray(app.stageHistory)) {
    app.stageHistory.forEach(h => {
      const key = h.stageId || h.stage; // stageId is the normalized frontend ID added by normalizeApp
      if (key && (h.changedAt || h.movedAt || h.date)) {
        stageDates[key] = h.changedAt || h.movedAt || h.date;
      }
    });
  }

  const visitedStages = new Set(Object.keys(stageDates));
  visitedStages.add(app.stage);

  if (isRejected) {
    const label = app.stage === 'withdrawn' ? 'You withdrew this application' : 'Application not progressed';
    return (
      <div style={{ marginTop: 12, marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#BA0517', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700, flexShrink: 0 }}>✕</div>
          <span style={{ color: '#fca5a5', fontSize: 12, fontWeight: 600 }}>{label}</span>
        </div>
      </div>
    );
  }

  return (
    <nav aria-label="Application progress" style={{ marginTop: 14, marginBottom: 4, overflowX: 'auto' }}>
      <ol role="list" style={{ display: 'flex', alignItems: 'center', minWidth: 'max-content', gap: 0, listStyle: 'none', margin: 0, padding: 0 }}>
        {STEPPER_STAGES.map((stage, i) => {
          const isVisited = visitedStages.has(stage.id) && i <= currentIndex;
          const isCurrent = stage.id === app.stage;
          const lineColor = isVisited && i > 0 ? '#0176D3' : '#DDDBDA';

          let dotBg     = '#F3F2F2';
          let dotBorder = '2px solid #DDDBDA';
          let dotFg     = '#C9C7C5';
          let labelColor = '#9E9D9B';

          if (isVisited && !isCurrent) {
            dotBg = '#0176D3'; dotBorder = '2px solid #0176D3';
            dotFg = '#fff'; labelColor = '#0176D3';
          }
          if (isCurrent) {
            dotBg = '#fff'; dotBorder = '2.5px solid #0176D3';
            dotFg = '#0176D3'; labelColor = '#0176D3';
          }

          return (
            <React.Fragment key={stage.id}>
              {i > 0 && <div aria-hidden="true" style={{ width: 24, height: 2, background: lineColor, flexShrink: 0, transition: 'background 0.3s' }} />}
              <li aria-current={isCurrent ? 'step' : undefined} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: dotBg, border: dotBorder,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isVisited && !isCurrent ? 13 : 14, color: dotFg, fontWeight: 700, flexShrink: 0,
                  ...(isCurrent ? { boxShadow: '0 0 0 4px rgba(1,118,211,0.15)' } : {}),
                  transition: 'all 0.2s',
                }}>
                  {isCurrent ? stage.icon : isVisited ? '✓' : stage.icon}
                </div>
                <span style={{ color: labelColor, fontSize: 9, fontWeight: isCurrent ? 700 : 400, whiteSpace: 'nowrap' }}>
                  {stage.label}
                </span>
                {stageDates[stage.id] && (
                  <span style={{ color: 'rgba(1,118,211,0.55)', fontSize: 8, whiteSpace: 'nowrap' }}>
                    {new Date(stageDates[stage.id]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export default function CandidateApplications({ user }) {
  const navigate = useNavigate();
  const [apps, setApps]           = useState([]);
  const [loading, setLoad]        = useState(true);
  const [withdrawing, setWith]    = useState({});
  const [confirmId, setConfirm]   = useState(null);
  const [toast, setToast]         = useState('');
  const [assessments, setAssessments] = useState({});  // jobId → assessment
  const [mySubmissions, setMySubs]    = useState({});  // assessmentId → submission
  const [stageFilter, setStageFilter] = useState('all');
  const [invites, setInvites]         = useState([]);
  const [activeTab, setActiveTab]     = useState('applications');

  useEffect(() => {
    setLoad(true);
    api.getApplications({ candidateId: user.id })
      .then(raw => {
        const appList = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        setApps(appList);

        // Load assessments for each job
        const jobIds = [...new Set(appList.map(getJobId).filter(Boolean))];
        Promise.all(
          jobIds.map(jid => api.getAssessmentForJob(jid).then(a => [jid, a]).catch(() => null))
        ).then(results => {
          const map = {};
          results.forEach(r => { if (r && r[1]) map[r[0]] = r[1]; });
          setAssessments(map);
        });

        // Load my submissions
        api.getMyAssessments().then(subs => {
          const map = {};
          const list = Array.isArray(subs) ? subs : (subs?.data || []);
          list.forEach(s => { map[s.assessmentId || s.assessment?.id] = s; });
          setMySubs(map);
        }).catch(() => {});
      })
      .catch(() => setApps([]))
      .finally(() => setLoad(false));

    api.getMyInvites()
      .then(data => setInvites(Array.isArray(data) ? data : (data?.data || [])))
      .catch(() => {});
  }, [user.id]);

  const handleWithdraw = async (appId) => {
    setConfirm(null);
    setWith(p => ({ ...p, [appId]: true }));
    try {
      await api.withdrawApplication(appId);
      setApps(prev => {
        const next = prev.filter(a => (a.id || a._id) !== appId);
        // Reset filter if the current filtered view becomes empty
        if (stageFilter !== 'all' && next.filter(a => a.stage === stageFilter).length === 0) setStageFilter('all');
        return next;
      });
      setToast('Application withdrawn successfully.');
      setTimeout(() => setToast(''), 3000);
    } catch (e) {
      setToast('❌ ' + (e.message || 'Failed to withdraw'));
      setTimeout(() => setToast(''), 4000);
    }
    setWith(p => { const n = { ...p }; delete n[appId]; return n; });
  };

  const canWithdraw = (stage) => ['applied', 'screening'].includes(stage);

  const STAGE_TABS = [
    { id: 'all',                label: 'All' },
    { id: 'applied',            label: 'Applied',     color: '#0176D3' },
    { id: 'screening',          label: 'Screening',   color: '#A07E00' },
    { id: 'shortlisted',        label: 'Shortlisted', color: '#F59E0B' },
    { id: 'interview_scheduled',label: 'Interview',   color: '#0176D3' },
    { id: 'interview_completed',label: 'Completed',   color: '#7c3aed' },
    { id: 'offer_extended',     label: 'Offered',     color: '#2E844A' },
    { id: 'selected',           label: 'Hired',       color: '#2E844A' },
    { id: 'rejected',           label: 'Rejected',    color: '#BA0517' },
    { id: 'withdrawn',          label: 'Withdrawn',   color: '#706E6B' },
  ];

  const displayApps = stageFilter === 'all' ? apps : apps.filter(a => a.stage === stageFilter);
  const pendingInvites = invites.filter(i => !['interested', 'declined'].includes(i.status));

  return (
    <div>
      <PageHeader
        title="My Applications & Invitations"
        subtitle={activeTab === 'applications'
          ? `${apps.length} application${apps.length !== 1 ? 's' : ''}`
          : `${invites.length} invitation${invites.length !== 1 ? 's' : ''}`}
      />
      {toast && (
        <div style={{
          background: toast.startsWith('❌') ? 'rgba(186,5,23,0.1)' : 'rgba(34,197,94,0.1)',
          border: `1px solid ${toast.startsWith('❌') ? 'rgba(186,5,23,0.3)' : 'rgba(34,197,94,0.3)'}`,
          borderRadius: 10, padding: '10px 16px',
          color: toast.startsWith('❌') ? '#fca5a5' : '#3BA755',
          fontSize: 13, marginBottom: 16
        }}>{toast}</div>
      )}

      {/* Main tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #DDDBDA' }}>
        {[
          { id: 'applications', label: '📋 Applications', count: apps.length },
          { id: 'invites',      label: '📧 Invitations',  count: invites.length, badge: pendingInvites.length },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 13,
            fontWeight: activeTab === t.id ? 700 : 500,
            background: 'transparent',
            color: activeTab === t.id ? '#0176D3' : '#706E6B',
            borderBottom: activeTab === t.id ? '2px solid #0176D3' : '2px solid transparent',
            marginBottom: -2, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {t.label}
            <span style={{ background: activeTab === t.id ? '#0176D3' : '#DDDBDA', color: activeTab === t.id ? '#fff' : '#706E6B', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{t.count}</span>
            {t.badge > 0 && <span style={{ background: '#BA0517', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 800 }}>{t.badge} new</span>}
          </button>
        ))}
      </div>

      {/* ── INVITATIONS TAB ── */}
      {activeTab === 'invites' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {invites.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#706E6B' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
              <div style={{ fontWeight: 600 }}>No invitations yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Recruiters will invite you to apply for matching roles</div>
            </div>
          )}
          {invites.map(inv => {
            const INVITE_STATUS = {
              sent:       { color: '#0176D3', bg: 'rgba(1,118,211,0.08)',  label: '📨 Pending Response' },
              opened:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', label: '👁 Opened' },
              interested: { color: '#2E844A', bg: 'rgba(46,132,74,0.08)',  label: '✅ Interested' },
              declined:   { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', label: '👋 Declined' },
              failed:     { color: '#BA0517', bg: 'rgba(186,5,23,0.08)',   label: '🚫 Failed to Send' },
            };
            const st = INVITE_STATUS[inv.status] || INVITE_STATUS.sent;
            // Invite has jobId populated as job data
            const job = inv.jobId || inv.job;
            return (
              <div key={inv.id || inv._id} style={{ ...card, border: `1px solid ${st.color}33` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#181818', fontWeight: 700, fontSize: 14 }}>{job?.title || inv.jobTitle || 'Job Invitation'}</div>
                    {job && <div style={{ color: '#0176D3', fontSize: 12, marginTop: 2 }}>{job.companyName || job.company}{job.location ? ` · ${job.location}` : ''}</div>}
                    <div style={{ color: '#706E6B', fontSize: 11, marginTop: 3 }}>Invited {inv.sentAt ? new Date(inv.sentAt).toLocaleDateString() : ''}</div>
                    {inv.message && (
                      <div style={{ color: '#374151', fontSize: 12, marginTop: 6, background: '#f0f7ff', borderLeft: '3px solid #0176D3', padding: '8px 12px', borderRadius: 4, fontStyle: 'italic' }}>
                        "{inv.message}"
                      </div>
                    )}
                  </div>
                  <span style={{ background: st.bg, color: st.color, borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{st.label}</span>
                </div>
                {['sent', 'opened'].includes(inv.status) && (
                  <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid #F3F2F2' }}>
                    <a
                      href={`/invite/${inv.token}`}
                      target="_blank" rel="noreferrer"
                      style={{ flex: 1, textAlign: 'center', background: 'linear-gradient(135deg,#0176D3,#014486)', color: '#fff', textDecoration: 'none', padding: '9px 0', borderRadius: 8, fontSize: 12, fontWeight: 700 }}
                    >
                      ✅ View & Respond
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── APPLICATIONS TAB ── */}
      {activeTab === 'applications' && (
        <>
          {/* Stage filter tabs */}
          {!loading && apps.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {STAGE_TABS.map(({ id, label, color }) => {
                const cnt = id === 'all' ? apps.length : apps.filter(a => a.stage === id).length;
                if (id !== 'all' && cnt === 0) return null;
                const active = stageFilter === id;
                return (
                  <button key={id} onClick={() => setStageFilter(id)} style={{
                    padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    border: `1px solid ${active ? (color || '#0176D3') : '#DDDBDA'}`,
                    background: active ? `${(color || '#0176D3')}18` : 'transparent',
                    color: active ? (color || '#0176D3') : '#706E6B',
                  }}>
                    {label} <span style={{ fontWeight: 700 }}>({cnt})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Withdraw confirmation modal */}
          {confirmId && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: '24px 16px' }}>
              <div style={{ background: '#fff', borderRadius: 20, maxWidth: 400, width: '100%', maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', textAlign: 'center', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
                <div style={{ background: 'linear-gradient(135deg,#BA0517,#9B0514)', padding: '20px 24px' }}>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>⚠️</div>
                  <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 800, margin: 0 }}>Withdraw Application?</h3>
                </div>
                <div style={{ padding: '20px 24px 24px' }}>
                  <p style={{ color: '#374151', fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>This action cannot be undone. You will be removed from the hiring process for this position.</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setConfirm(null)} style={{ flex: 1, background: '#F8FAFF', border: '1.5px solid #E2E8F0', borderRadius: 10, color: '#374151', fontSize: 13, fontWeight: 600, padding: '10px 0', cursor: 'pointer' }}>Keep Application</button>
                    <button onClick={() => handleWithdraw(confirmId)} style={{ flex: 1, background: 'linear-gradient(135deg,#BA0517,#9B0514)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, padding: '10px 0', cursor: 'pointer' }}>Yes, Withdraw</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}><Spinner /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {apps.length === 0 && (
                <div style={{ ...card, textAlign: 'center', padding: '48px 20px' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                  <p style={{ color: '#706E6B', fontSize: 14, margin: 0 }}>No applications yet.</p>
                  <p style={{ color: '#0176D3', fontSize: 13, marginTop: 6 }}>Explore jobs and apply to get started!</p>
                </div>
              )}
              {displayApps.map(a => {
                const s = SM[a.stage] || { color: '#0176D3', label: a.stage, icon: '•' };
                const jobTitle   = getJobField(a, 'title')      || 'Job';
                const jobCompany = getJobField(a, 'companyName') || getJobField(a, 'company') || 'Company';
                const jobLocation= getJobField(a, 'location');
                const jobId      = getJobId(a);
                const appId      = a.id || a._id;

                // Interview details from interviews[] array (NOT flat fields)
                const iv = a.interviews?.[0] || {};
                const ivDate = iv.scheduledAt ? new Date(iv.scheduledAt) : null;

                // Assessment for this job
                const asmt = assessments[jobId];
                const sub  = asmt ? (mySubmissions[asmt.id] || mySubmissions[asmt._id]) : null;

                return (
                  <div key={appId} style={{ ...card, border: `1px solid ${s.color}22` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#181818', fontWeight: 700, fontSize: 15 }}>{jobTitle}</div>
                        <div style={{ color: '#0176D3', fontSize: 12, marginTop: 2 }}>
                          {jobCompany}{jobLocation ? ` · ${jobLocation}` : ''}
                        </div>
                        <div style={{ color: '#706E6B', fontSize: 11, marginTop: 3 }}>
                          Applied {a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          {a.source && a.source !== 'direct' && <span style={{ marginLeft: 8, color: '#A07E00', fontWeight: 600 }}>via {a.source}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <Badge label={`${s.icon} ${s.label}`} color={s.color} />
                        {canWithdraw(a.stage) && (
                          <button
                            onClick={() => setConfirm(appId)}
                            disabled={!!withdrawing[appId]}
                            style={{ background: 'none', border: '1px solid rgba(186,5,23,0.3)', borderRadius: 8, color: '#FE5C4C', fontSize: 10, fontWeight: 600, padding: '3px 10px', cursor: 'pointer', opacity: withdrawing[appId] ? 0.5 : 1 }}
                          >
                            {withdrawing[appId] ? 'Withdrawing…' : '✕ Withdraw'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Pipeline Stepper */}
                    <ApplicationStepper app={a} />

                    {/* Interview details from interviews[] array */}
                    {(a.stage === 'interview_scheduled' || a.stage === 'interview_completed') && iv.scheduledAt && (
                      <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(245,158,11,0.08)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.3)' }}>
                        <p style={{ color: '#F59E0B', fontSize: 12, margin: 0, fontWeight: 600 }}>
                          📅 {ivDate?.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}{' '}
                          at {ivDate?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          {iv.type && ` · ${iv.type === 'video' ? '📹 Video' : iv.type === 'phone' ? '📞 Phone' : iv.type === 'technical' ? '💻 Technical' : '🏢 In-Person'}`}
                        </p>
                        {iv.meetLink && (
                          <a href={iv.meetLink} target="_blank" rel="noreferrer"
                            style={{ color: '#0176D3', fontSize: 12, display: 'inline-block', marginTop: 4 }}>
                            🔗 Join Interview Link
                          </a>
                        )}
                        {iv.notes && <p style={{ color: '#706E6B', fontSize: 11, margin: '4px 0 0' }}>💬 {iv.notes}</p>}
                      </div>
                    )}

                    {/* Offer info */}
                    {a.stage === 'offer_extended' && (
                      <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(46,132,74,0.06)', borderRadius: 10, border: '1px solid rgba(46,132,74,0.3)' }}>
                        <p style={{ color: '#2E844A', fontSize: 12, margin: 0, fontWeight: 600 }}>🎉 Offer Extended! Contact your recruiter for offer details.</p>
                      </div>
                    )}

                    {/* Rejection reason */}
                    {a.stage === 'rejected' && a.rejectionReason && (
                      <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(186,5,23,0.06)', borderRadius: 10 }}>
                        <p style={{ color: '#fca5a5', fontSize: 12, margin: 0 }}>Feedback: {a.rejectionReason}</p>
                      </div>
                    )}

                    {/* Recruiter feedback */}
                    {a.feedback && (
                      <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(1,118,211,0.05)', borderRadius: 10, border: '1px solid rgba(1,118,211,0.15)' }}>
                        <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 600, margin: '0 0 4px' }}>
                          Interview Feedback — {'★'.repeat(a.feedback.rating || 0)}<span style={{ color: '#C9C7C5' }}>{'★'.repeat(5 - (a.feedback.rating || 0))}</span>
                        </p>
                        {a.feedback.strengths && <p style={{ color: '#706E6B', fontSize: 11, margin: 0 }}>Strengths: {a.feedback.strengths}</p>}
                        <p style={{ color: a.feedback.recommendation ? '#34d399' : '#FE5C4C', fontSize: 11, margin: '2px 0 0', fontWeight: 600 }}>
                          {a.feedback.recommendation ? '✓ Recommended to move forward' : '✕ Not recommended'}
                        </p>
                      </div>
                    )}

                    {/* Notes from recruiter */}
                    {a.notes && (
                      <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(1,118,211,0.04)', borderRadius: 10, border: '1px solid rgba(1,118,211,0.12)' }}>
                        <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 600, margin: '0 0 2px' }}>Recruiter Notes</p>
                        <p style={{ color: '#706E6B', fontSize: 12, margin: 0 }}>{a.notes}</p>
                      </div>
                    )}

                    {/* Assessment CTA */}
                    {asmt && asmt.isActive !== false && (() => {
                      if (sub?.status === 'submitted') {
                        const res = sub.result;
                        const rc = res === 'pass' ? '#34d399' : res === 'fail' ? '#FE5C4C' : '#F59E0B';
                        return (
                          <div style={{ marginTop: 10, padding: '10px 14px', background: `${rc}10`, border: `1px solid ${rc}33`, borderRadius: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                            <span style={{ fontSize: 16 }}>{res === 'pass' ? '✅' : res === 'fail' ? '❌' : '⏳'}</span>
                            <div>
                              <p style={{ color: rc, fontSize: 12, fontWeight: 700, margin: 0 }}>Assessment {res === 'pass' ? 'Passed' : res === 'fail' ? 'Not Passed' : 'Under Review'}</p>
                              {sub.percentage != null && <p style={{ color: '#706E6B', fontSize: 11, margin: '2px 0 0' }}>Score: {sub.percentage}%</p>}
                              {sub.recruiterReview && <p style={{ color: '#706E6B', fontSize: 11, margin: '4px 0 0' }}>Feedback: {sub.recruiterReview}</p>}
                            </div>
                          </div>
                        );
                      }
                      if (sub?.status === 'in_progress') {
                        return (
                          <div style={{ marginTop: 10 }}>
                            <button
                              onClick={() => navigate(`/app/assessment/${asmt.id || asmt._id}`)}
                              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 10, color: '#F59E0B', padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                            >
                              ⏱ Resume Assessment — In Progress
                            </button>
                          </div>
                        );
                      }
                      if (sub?.status === 'expired') {
                        return (
                          <div style={{ marginTop: 10, padding: '8px 14px', background: 'rgba(186,5,23,0.08)', borderRadius: 10, border: '1px solid rgba(186,5,23,0.2)' }}>
                            <p style={{ color: '#FE5C4C', fontSize: 12, margin: 0 }}>⌛ Assessment session expired. Contact the recruiter.</p>
                          </div>
                        );
                      }
                      // Not started
                      return (
                        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => navigate(`/app/assessment/${asmt.id || asmt._id}`)}
                            style={{ background: 'linear-gradient(135deg,rgba(1,118,211,0.15),rgba(37,99,235,0.1))', border: '1px solid rgba(1,118,211,0.4)', borderRadius: 10, color: '#0176D3', padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                          >
                            📝 Take Screening Assessment
                          </button>
                          <span style={{ color: '#C9C7C5', fontSize: 11 }}>
                            {asmt.timeLimitMins > 0 ? `${asmt.timeLimitMins} min limit · ` : ''}{(asmt.questions || []).length} questions
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
              {displayApps.length === 0 && apps.length > 0 && (
                <p style={{ color: '#706E6B', textAlign: 'center', padding: '24px 0' }}>No applications in this stage.</p>
              )}
            </div>
          )}
        </>
      )}
      {/* pulse keyframes moved to index.css */}
    </div>
  );
}
