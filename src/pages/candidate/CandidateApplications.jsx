import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { SM } from '../../constants/stages.js';
import { card } from '../../constants/styles.js';
import { api } from '../../api/api.js';

// ── helpers ──────────────────────────────────────────────────────────────────
const getJobField = (a, field) => a.jobId?.[field] || a.job?.[field] || '';
const getJobId    = (a) => a.jobId?.id || a.jobId?._id?.toString?.() || (typeof a.jobId === 'string' ? a.jobId : '') || a.job?.id || '';

const fmtD = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

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

  const stageDates = {};
  if (Array.isArray(app.stageHistory)) {
    app.stageHistory.forEach(h => {
      const key = h.stageId || h.stage;
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
    <nav aria-label="Application progress" className="tn-app-stepper" style={{ marginTop: 14, marginBottom: 4, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <ol role="list" style={{ display: 'flex', alignItems: 'center', minWidth: 'max-content', gap: 0, listStyle: 'none', margin: 0, padding: '0 0 2px' }}>
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
  const [withdrawReason, setWithdrawReason] = useState('');
  const [toast, setToast]         = useState('');
  const [assessments, setAssessments] = useState({});
  const [mySubmissions, setMySubs]    = useState({});
  const [stageFilter, setStageFilter] = useState('all');
  const [invites, setInvites]         = useState([]);
  const [activeTab, setActiveTab]     = useState('applications');

  const [myOffers, setMyOffers] = useState([]);
  const [driveRegs, setDriveRegs] = useState([]);
  const [driveRegsLoading, setDriveRegsLoading] = useState(false);

  const [selectedApp,    setSelectedApp]    = useState(null);
  const [selectedInvite, setSelectedInvite] = useState(null);
  const [selectedDrive,  setSelectedDrive]  = useState(null);

  useEffect(() => {
    setDriveRegsLoading(true);
    api.getMyDriveRegistrations()
      .then(r => setDriveRegs(Array.isArray(r) ? r : (r?.data || [])))
      .catch(() => setDriveRegs([]))
      .finally(() => setDriveRegsLoading(false));
  }, [user.id]);

  useEffect(() => {
    const loadApplications = (silent = false) => {
      if (!silent) setLoad(true);
      api.getMyApplications()
        .then(raw => {
          const appList = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
          setApps(appList);

          const jobIds = [...new Set(appList.map(getJobId).filter(Boolean))];
          Promise.all(
            jobIds.map(jid => api.getAssessmentForJob(jid).then(a => [jid, a]).catch(() => null))
          ).then(results => {
            const map = {};
            results.forEach(r => { if (r && r[1]) map[r[0]] = r[1]; });
            setAssessments(map);
          });

          api.getMyAssessments().then(subs => {
            const map = {};
            const list = Array.isArray(subs) ? subs : (subs?.data || []);
            list.forEach(s => { map[s.assessmentId || s.assessment?.id] = s; });
            setMySubs(map);
          }).catch(() => {});
        })
        .catch(() => { if (!silent) setApps([]); })
        .finally(() => { if (!silent) setLoad(false); });

      api.getMyOffers().then(r => {
        const list = Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : []);
        setMyOffers(list);
      }).catch(() => {});

      api.getMyInvites()
        .then(data => setInvites(Array.isArray(data) ? data : (data?.data || [])))
        .catch(() => {});
    };

    loadApplications();

    const handler = () => loadApplications(true);
    window.addEventListener('tn:stageChanged', handler);
    return () => window.removeEventListener('tn:stageChanged', handler);
  }, [user.id]);

  const handleWithdraw = async (appId) => {
    setConfirm(null);
    setWith(p => ({ ...p, [appId]: true }));
    try {
      await api.withdrawApplication(appId, withdrawReason);
      setWithdrawReason('');
      setApps(prev => {
        const next = prev.filter(a => (a.id || a._id) !== appId);
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
          : activeTab === 'drives'
          ? `${driveRegs.length} campus drive${driveRegs.length !== 1 ? 's' : ''}`
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
      <div style={{ background: '#F1F5F9', borderRadius: 16, padding: 5, marginBottom: 20, display: 'flex', gap: 4, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
        {[
          { id: 'applications', emoji: '📋', label: 'Applications', count: apps.length },
          { id: 'drives',       emoji: '🏫', label: 'Campus Drives', count: driveRegs.length },
          { id: 'invites',      emoji: '📧', label: 'Invitations',  count: invites.length, badge: pendingInvites.length },
        ].map(t => {
          const isActive = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              flex: 1, minWidth: 'fit-content', whiteSpace: 'nowrap', flexShrink: 0,
              padding: '10px 14px', border: 'none', cursor: 'pointer', borderRadius: 12,
              fontSize: 12, fontWeight: isActive ? 800 : 600,
              background: isActive ? '#fff' : 'transparent',
              color: isActive ? '#0176D3' : '#706E6B',
              boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.10)' : 'none',
              transition: 'all 0.18s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
              <span style={{ fontSize: 14 }}>{t.emoji}</span>
              <span>{t.label}</span>
              <span style={{
                background: isActive ? '#0176D3' : '#CBD5E1',
                color: '#fff',
                borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 800,
                lineHeight: '16px',
              }}>{t.count}</span>
              {t.badge > 0 && (
                <span style={{ background: '#BA0517', color: '#fff', borderRadius: 20, padding: '1px 6px', fontSize: 10, fontWeight: 800, lineHeight: '16px' }}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── CAMPUS DRIVES TAB ── */}
      {activeTab === 'drives' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {driveRegsLoading ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}><Spinner /></div>
          ) : driveRegs.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8ECF0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden', textAlign: 'center', padding: '48px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏫</div>
              <p style={{ color: '#706E6B', fontSize: 14, margin: 0 }}>No campus drive registrations yet.</p>
              <p style={{ color: '#0176D3', fontSize: 13, marginTop: 6 }}>Register for placement drives from the Opportunities section!</p>
            </div>
          ) : (
            driveRegs.map(reg => {
              const DRIVE_STATUS = {
                registered:  { color: '#0176D3', bg: 'rgba(1,118,211,0.08)',   label: '📋 Registered',   icon: '📋', step: 0 },
                shortlisted: { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)',  label: '⭐ Shortlisted',  icon: '⭐', step: 1 },
                selected:    { color: '#2E844A', bg: 'rgba(46,132,74,0.08)',   label: '🏆 Selected',     icon: '🏆', step: 2 },
                rejected:    { color: '#BA0517', bg: 'rgba(186,5,23,0.08)',    label: '❌ Not Selected', icon: '❌', step: -1 },
              };
              const STEPS = [
                { id: 'registered',  label: 'Registered',  icon: '📋' },
                { id: 'shortlisted', label: 'Shortlisted', icon: '⭐' },
                { id: 'selected',    label: 'Selected',    icon: '🏆' },
              ];
              const st = DRIVE_STATUS[reg.myStatus] || DRIVE_STATUS.registered;
              const isRejectedDrive = reg.myStatus === 'rejected';
              const currentStep = isRejectedDrive ? -1 : st.step;

              return (
                <div key={reg.driveId} onClick={() => setSelectedDrive(reg)} style={{ background: '#fff', borderRadius: 16, border: `1.5px solid ${st.color}22`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', cursor: 'pointer' }}>
                  {/* Top band */}
                  <div style={{ background: `linear-gradient(135deg,${st.color}12,${st.color}05)`, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${st.color}15` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{st.icon}</span>
                      <span style={{ fontWeight: 700, fontSize: 12, color: st.color }}>{st.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {reg.driveType && <span style={{ background: 'rgba(1,118,211,0.1)', color: '#0176D3', borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 700 }}>{reg.driveType === 'placement' ? '🎓 Placement' : reg.driveType === 'internship' ? '💼 Internship' : reg.driveType}</span>}
                      <span style={{ color: '#CBD5E1', fontSize: 18 }}>›</span>
                    </div>
                  </div>
                  {/* Body */}
                  <div style={{ padding: '12px 16px 14px' }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#0A1628', marginBottom: 3 }}>{reg.title || reg.driveName || 'Campus Drive'}</div>
                    <div style={{ fontSize: 12, color: '#0176D3', marginBottom: 6 }}>{reg.companyName}</div>
                    <div style={{ fontSize: 11, color: '#64748B', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {reg.collegeName && <span>🏛 {reg.collegeName}</span>}
                      {reg.driveDate && <span>📅 {fmtD(reg.driveDate)}</span>}
                    </div>
                    {/* Mini 3-step bar */}
                    {!isRejectedDrive && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                        {STEPS.map((step, i) => {
                          const active = i === currentStep, past = i < currentStep;
                          return <div key={step.id} style={{ flex: 1, height: 3, borderRadius: 2, background: (active || past) ? st.color : '#E8ECF0', opacity: active ? 1 : past ? 0.65 : 0.25 }} />;
                        })}
                      </div>
                    )}
                    {isRejectedDrive && <div style={{ marginTop: 8, fontSize: 11, color: '#fca5a5', fontWeight: 600 }}>Not selected for this drive</div>}
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>Tap to view full details</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

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
              interested: { color: '#2E844A', bg: 'rgba(46,132,74,0.08)',  label: '⭐ Shortlisted / Interested' },
              declined:   { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', label: '👋 Declined' },
              failed:     { color: '#BA0517', bg: 'rgba(186,5,23,0.08)',   label: '🚫 Failed to Send' },
            };
            const st = INVITE_STATUS[inv.status] || INVITE_STATUS.sent;
            const job = inv.jobId || inv.job;
            return (
              <div key={inv.id || inv._id} onClick={() => setSelectedInvite(inv)} style={{ background: '#fff', borderRadius: 16, border: `1.5px solid ${st.color}22`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', cursor: 'pointer' }}>
                {/* Top band */}
                <div style={{ background: `linear-gradient(135deg,${st.color}12,${st.color}05)`, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${st.color}15` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: st.color }}>{st.label}</span>
                    {inv.type === 'talent_match' && <span style={{ background: 'linear-gradient(135deg,#0176D3,#014486)', color: '#fff', fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.5px' }}>TALENT MATCH</span>}
                  </div>
                  <span style={{ color: '#CBD5E1', fontSize: 18 }}>›</span>
                </div>
                {/* Body */}
                <div style={{ padding: '12px 16px 14px' }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#0A1628', marginBottom: 3 }}>{job?.title || inv.jobTitle || 'Job Invitation'}</div>
                  {job && <div style={{ fontSize: 12, color: '#0176D3', marginBottom: 6 }}>{job.companyName || job.company}{job.location ? ` · ${job.location}` : ''}</div>}
                  <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: inv.message ? 8 : 0 }}>
                    {inv.type === 'talent_match' ? 'Matched' : 'Invited'} {inv.sentAt || inv.createdAt ? fmtD(inv.sentAt || inv.createdAt) : ''}
                  </div>
                  {inv.message && (
                    <div style={{ fontSize: 12, color: '#475569', background: '#F0F7FF', borderLeft: '3px solid #0176D3', padding: '7px 10px', borderRadius: 4, fontStyle: 'italic', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      "{inv.message}"
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>Tap to view job details &amp; respond</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── APPLICATIONS TAB ── */}
      {activeTab === 'applications' && (
        <>
          {/* HR-assigned jobs alert banner */}
          {!loading && apps.filter(a => a.source === 'admin_assign' && a.stage === 'applied').length > 0 && (
            <div style={{ background: 'linear-gradient(135deg,rgba(1,118,211,0.08),rgba(1,68,134,0.04))', border: '1.5px solid rgba(1,118,211,0.3)', borderRadius: 14, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>🎯</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#032D60' }}>
                  HR added you to {apps.filter(a => a.source === 'admin_assign' && a.stage === 'applied').length} job pipeline{apps.filter(a => a.source === 'admin_assign' && a.stage === 'applied').length > 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: 12, color: '#706E6B', marginTop: 2 }}>
                  These roles have been handpicked for you. Review and keep or withdraw.
                </div>
              </div>
            </div>
          )}

          {/* Stats summary */}
          {!loading && apps.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Total',       count: apps.length,                                                                                             color: '#0176D3', icon: '📋' },
                { label: 'Active',      count: apps.filter(a => !['rejected','withdrawn'].includes(a.stage)).length,                                    color: '#059669', icon: '🔄' },
                { label: 'Shortlisted', count: apps.filter(a => ['shortlisted','interview_scheduled','interview_completed','offer_extended'].includes(a.stage)).length, color: '#F59E0B', icon: '⭐' },
                { label: 'Hired',       count: apps.filter(a => a.stage === 'selected').length,                                                         color: '#2E844A', icon: '🏆' },
              ].map(stat => (
                <div key={stat.label} style={{ flex: 1, background: '#fff', borderRadius: 12, border: `1px solid ${stat.color}22`, padding: '10px 8px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: stat.color, lineHeight: 1 }}>{stat.count}</div>
                  <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600, marginTop: 3 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Stage filter pills — horizontally scrollable */}
          {!loading && apps.length > 0 && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4, scrollbarWidth: 'none', marginBottom: 14 }}>
              {STAGE_TABS.map(({ id, label, color }) => {
                const cnt = id === 'all' ? apps.length : apps.filter(a => a.stage === id).length;
                if (id !== 'all' && cnt === 0) return null;
                const active = stageFilter === id;
                return (
                  <button key={id} onClick={() => setStageFilter(id)} style={{
                    padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    flexShrink: 0, whiteSpace: 'nowrap',
                    border: `1px solid ${active ? (color || '#0176D3') : '#E8ECF0'}`,
                    background: active ? `${(color || '#0176D3')}15` : '#F9FAFB',
                    color: active ? (color || '#0176D3') : '#706E6B',
                    transition: 'all 0.15s',
                  }}>
                    {label} <span style={{ fontWeight: 800 }}>({cnt})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Withdraw confirmation modal */}
          {confirmId && (
            <div className="tn-drill-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: '24px 16px' }}>
              <div className="tn-confirm-modal" style={{ background: '#fff', borderRadius: 20, maxWidth: 420, width: '100%', maxHeight: 'calc(100dvh - 48px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
                <div style={{ background: 'linear-gradient(135deg,#BA0517,#9B0514)', padding: '20px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>⚠️</div>
                  <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 800, margin: 0 }}>Withdraw Application?</h3>
                </div>
                <div style={{ padding: '20px 24px 24px' }}>
                  <p style={{ color: '#374151', fontSize: 13, margin: '0 0 16px', lineHeight: 1.6 }}>This action cannot be undone. You will be removed from the hiring process for this position.</p>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>Reason for withdrawing (optional)</label>
                    <select value={withdrawReason} onChange={e => setWithdrawReason(e.target.value)} style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
                      <option value="">Select a reason…</option>
                      <option value="Accepted another offer">Accepted another offer</option>
                      <option value="Role not a fit">Role not a fit</option>
                      <option value="Salary expectations not met">Salary expectations not met</option>
                      <option value="Location / remote policy">Location / remote policy</option>
                      <option value="Applied by mistake">Applied by mistake</option>
                      <option value="Personal reasons">Personal reasons</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => { setConfirm(null); setWithdrawReason(''); }} style={{ flex: 1, background: '#F8FAFF', border: '1.5px solid #E2E8F0', borderRadius: 10, color: '#374151', fontSize: 13, fontWeight: 600, padding: '10px 0', cursor: 'pointer' }}>Keep Application</button>
                    <button onClick={() => handleWithdraw(confirmId)} style={{ flex: 1, background: 'linear-gradient(135deg,#BA0517,#9B0514)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, padding: '10px 0', cursor: 'pointer' }}>Yes, Withdraw</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}><Spinner /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {apps.length === 0 && (
                <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8ECF0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden', textAlign: 'center', padding: '48px 20px' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                  <p style={{ color: '#706E6B', fontSize: 14, margin: 0 }}>No applications yet.</p>
                  <p style={{ color: '#0176D3', fontSize: 13, marginTop: 6 }}>Explore jobs and apply to get started!</p>
                </div>
              )}
              {displayApps.map(a => {
                const s = SM[a.stage] || { color: '#0176D3', label: a.stage, icon: '•' };
                const jobTitle    = getJobField(a, 'title')       || 'Job';
                const jobCompany  = getJobField(a, 'companyName') || getJobField(a, 'company') || 'Company';
                const jobLocation = getJobField(a, 'location');
                const appId       = a.id || a._id;
                const isRejectedApp = a.stage === 'rejected' || a.stage === 'withdrawn';
                const initials    = jobCompany.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
                const avatarGrad  = isRejectedApp
                  ? 'linear-gradient(135deg,#94A3B8,#64748B)'
                  : `linear-gradient(135deg,${s.color},${s.color}cc)`;
                const sc = a.talentMatchScore ?? 0;
                const hasMScore = a.talentMatchScore != null;
                const mc = sc >= 75 ? '#059669' : sc >= 50 ? '#D97706' : '#DC2626';
                const ml = sc >= 75 ? 'Strong' : sc >= 50 ? 'Good' : 'Partial';

                return (
                  <div key={appId} onClick={() => setSelectedApp(a)} style={{ background: '#fff', borderRadius: 16, border: `1.5px solid ${isRejectedApp ? '#E8ECF0' : s.color + '30'}`, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.1s', active: false }}>

                    {/* Top accent line */}
                    <div style={{ height: 3, background: isRejectedApp ? '#E2E8F0' : `linear-gradient(90deg,${s.color},${s.color}88)` }} />

                    <div style={{ padding: '14px 16px 14px' }}>
                      {/* Row 1: Avatar + Title/Badge + Chevron */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        {/* Company avatar */}
                        <div style={{ width: 46, height: 46, borderRadius: 12, background: avatarGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 15, flexShrink: 0, letterSpacing: '-0.5px', boxShadow: `0 4px 12px ${isRejectedApp ? '#94A3B833' : s.color + '44'}` }}>
                          {initials || '?'}
                        </div>

                        {/* Middle: title + company */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                            <div style={{ fontWeight: 800, fontSize: 14, color: isRejectedApp ? '#94A3B8' : '#0A1628', lineHeight: 1.3, flex: 1, minWidth: 0 }}>{jobTitle}</div>
                            {/* Stage badge */}
                            <span style={{ flexShrink: 0, background: isRejectedApp ? '#F1F5F9' : `${s.color}15`, color: isRejectedApp ? '#94A3B8' : s.color, borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap', border: `1px solid ${isRejectedApp ? '#E2E8F0' : s.color + '30'}` }}>
                              {s.icon} {s.label}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: '#0176D3', marginTop: 3, fontWeight: 600 }}>
                            {jobCompany}{jobLocation ? <span style={{ color: '#94A3B8', fontWeight: 400 }}> · {jobLocation}</span> : ''}
                          </div>
                        </div>

                        {/* Chevron */}
                        <div style={{ color: '#CBD5E1', fontSize: 20, lineHeight: 1, flexShrink: 0, alignSelf: 'center' }}>›</div>
                      </div>

                      {/* Row 2: Tags (date, source) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, color: '#94A3B8', background: '#F8FAFC', border: '1px solid #E8ECF0', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>
                          Applied {fmtD(a.createdAt)}
                        </span>
                        {a.source === 'admin_assign' && (
                          <span style={{ fontSize: 10, color: '#0176D3', background: 'rgba(1,118,211,0.08)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>🎯 HR Added</span>
                        )}
                        {a.source === 'referral' && (
                          <span style={{ fontSize: 10, color: '#7C3AED', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>👥 Referral</span>
                        )}
                        {(!a.source || a.source === 'career_page' || a.source === 'self_applied') && (
                          <span style={{ fontSize: 10, color: '#059669', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>🌐 Career Page</span>
                        )}
                      </div>

                      {/* Row 3: Progress bar or rejected state */}
                      <div style={{ marginTop: 10 }}>
                        {!isRejectedApp ? (
                          <>
                            <div style={{ display: 'flex', gap: 3 }}>
                              {STEPPER_STAGES.map((stage, i) => {
                                const ci = STEPPER_STAGES.findIndex(st => st.id === a.stage);
                                const active = i === ci, past = i < ci;
                                return (
                                  <div key={stage.id} style={{ flex: 1, height: 4, borderRadius: 2, background: (active || past) ? s.color : '#E8ECF0', opacity: active ? 1 : past ? 0.7 : 0.25, transition: 'all 0.3s' }} />
                                );
                              })}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                              <span style={{ fontSize: 10, color: '#94A3B8' }}>Applied</span>
                              <span style={{ fontSize: 10, color: s.color, fontWeight: 700 }}>{s.label}</span>
                              <span style={{ fontSize: 10, color: '#94A3B8' }}>Hired</span>
                            </div>
                          </>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#FFF5F5', borderRadius: 8, border: '1px solid #FECACA' }}>
                            <span style={{ fontSize: 12 }}>⛔</span>
                            <span style={{ fontSize: 11, color: '#BA0517', fontWeight: 600 }}>
                              {a.stage === 'withdrawn' ? 'You withdrew this application' : 'Application not progressed'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Row 4: Match score inline bar */}
                      {hasMScore && (
                        <div style={{ marginTop: 10, padding: '8px 10px', background: `${mc}08`, borderRadius: 10, border: `1px solid ${mc}20` }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: mc }}>🎯 Resume Match</span>
                            <span style={{ fontSize: 12, fontWeight: 900, color: mc }}>{ml} · {Math.round(sc)}%</span>
                          </div>
                          <div style={{ height: 5, borderRadius: 4, background: `${mc}20` }}>
                            <div style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg,${mc}88,${mc})`, width: `${Math.min(sc, 100)}%`, transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                      )}
                    </div>
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

      {/* ── APPLICATION DETAIL DRAWER ── */}
      {selectedApp && (() => {
        const a = selectedApp;
        const s = SM[a.stage] || { color: '#0176D3', label: a.stage, icon: '•' };
        const jobTitle    = getJobField(a, 'title')       || 'Job';
        const jobCompany  = getJobField(a, 'companyName') || getJobField(a, 'company') || 'Company';
        const jobLocation = getJobField(a, 'location');
        const jobId       = getJobId(a);
        const appId       = a.id || a._id;
        const iv          = a.interviewRounds?.[0] || {};
        const ivDate      = iv.scheduledAt ? new Date(iv.scheduledAt) : null;
        const asmt        = assessments[jobId];
        const sub         = asmt ? (mySubmissions[asmt.id] || mySubmissions[asmt._id]) : null;
        const stageMsg    = {
          applied:             '📬 Your application is under review.',
          screening:           '🔍 A recruiter is screening your profile.',
          shortlisted:         '⭐ Great news — you\'ve been shortlisted!',
          interview_scheduled: '📅 Interview scheduled. Prepare well!',
          interview_completed: '✅ Interview completed. Decision pending.',
          offer_extended:      '🎉 An offer has been extended to you!',
          selected:            '🏆 Congratulations — you\'ve been hired!',
          rejected:            '📩 This application did not progress further.',
          withdrawn:           '↩️ You withdrew this application.',
        }[a.stage] || '';
        const appIdStr    = String(a.id || a._id || '');
        const matchedOffer = myOffers.find(o => String(o.applicationId) === appIdStr);

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 20000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} onClick={e => { if (e.target === e.currentTarget) setSelectedApp(null); }}>
            <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', maxHeight: '92dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Drag handle */}
              <div style={{ padding: '10px 0 6px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: 40, height: 4, background: '#E2E8F0', borderRadius: 2 }} />
              </div>
              {/* Scrollable body */}
              <div style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
                {/* Header */}
                <div style={{ padding: '0 20px 16px', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 17, color: '#0A1628', lineHeight: 1.3, marginBottom: 3 }}>{jobTitle}</div>
                      <div style={{ fontSize: 13, color: '#0176D3', marginBottom: 8 }}>{jobCompany}{jobLocation ? ` · ${jobLocation}` : ''}</div>
                      <span style={{ background: `${s.color}18`, color: s.color, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>{s.icon} {s.label}</span>
                    </div>
                    <button onClick={() => setSelectedApp(null)} style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, color: '#64748B', flexShrink: 0 }}>×</button>
                  </div>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  {/* Stage message */}
                  {stageMsg && (
                    <div style={{ background: `${s.color}0d`, border: `1px solid ${s.color}22`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: s.color, fontWeight: 600 }}>
                      {stageMsg}
                    </div>
                  )}

                  {/* Pipeline Stepper */}
                  <ApplicationStepper app={a} />

                  {/* Interview details */}
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

                  {/* Interview Prep Tips */}
                  {(a.stage === 'interview_scheduled') && (() => {
                    const jobSkills = a.jobId?.skills || a.job?.skills || [];
                    const tips = [
                      `Review fundamentals of: ${jobSkills.slice(0, 3).join(', ') || 'your key skills'}`,
                      'Research the company — values, products, recent news',
                      'Prepare 2–3 examples using the STAR method (Situation, Task, Action, Result)',
                      'Have questions ready to ask the interviewer',
                      'Test your audio/video if it\'s a virtual interview',
                    ];
                    return (
                      <div style={{ marginTop: 10, padding: '12px 14px', background: 'rgba(139,92,246,0.06)', borderRadius: 10, border: '1px solid rgba(139,92,246,0.2)' }}>
                        <p style={{ color: '#7C3AED', fontSize: 12, fontWeight: 700, margin: '0 0 8px' }}>💡 Interview Prep Tips</p>
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {tips.map((t, i) => (
                            <li key={i} style={{ color: '#374151', fontSize: 12, marginBottom: 4, lineHeight: 1.5 }}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}

                  {/* Resume Match Score Feedback */}
                  {(a.talentMatchScore != null || a.matchBreakdown) && (() => {
                    const score = a.talentMatchScore ?? 0;
                    const bd    = a.matchBreakdown || {};
                    const color = score >= 75 ? '#059669' : score >= 50 ? '#D97706' : '#DC2626';
                    const label = score >= 75 ? 'Strong Match' : score >= 50 ? 'Good Match' : 'Partial Match';
                    const items = [
                      { k: 'Skills',     v: bd.skillScore },
                      { k: 'Experience', v: bd.experienceScore },
                      { k: 'Location',   v: bd.locationScore },
                    ].filter(x => x.v != null);
                    return (
                      <div style={{ marginTop: 10, padding: '10px 14px', background: `${color}0d`, borderRadius: 10, border: `1px solid ${color}33` }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: items.length ? 8 : 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color }}>🎯 Resume Match — {label}</span>
                          <span style={{ fontSize: 18, fontWeight: 900, color }}>{Math.round(score)}%</span>
                        </div>
                        {items.length > 0 && (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {items.map(item => (
                              <div key={item.k} style={{ flex: 1, minWidth: 70 }}>
                                <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 2 }}>{item.k}</div>
                                <div style={{ height: 4, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                                  <div style={{ width: `${Math.min(100, item.v)}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s' }} />
                                </div>
                                <div style={{ fontSize: 10, color, fontWeight: 700, marginTop: 2 }}>{Math.round(item.v)}%</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Assigned Recruiter */}
                  {(() => {
                    const recruiters = a.job?.assignedRecruiters || a.jobId?.assignedRecruiters || [];
                    if (!recruiters.length || typeof recruiters[0] !== 'object') return null;
                    const rec = recruiters[0];
                    return (
                      <div style={{ marginTop: 10, padding: '10px 14px', background: 'linear-gradient(135deg,rgba(1,118,211,0.05),rgba(1,68,134,0.03))', borderRadius: 10, border: '1px solid rgba(1,118,211,0.18)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#0176D3,#014486)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                          {(rec.name || '?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 120, overflow: 'hidden' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>Your Recruiter</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1628', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.name}</div>
                          {rec.title && <div style={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.title}</div>}
                        </div>
                        {rec.email && (
                          <a href={`mailto:${rec.email}`} style={{ fontSize: 11, color: '#0176D3', fontWeight: 700, textDecoration: 'none', background: 'rgba(1,118,211,0.08)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, padding: '4px 10px', flexShrink: 0, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            ✉ {rec.email}
                          </a>
                        )}
                      </div>
                    );
                  })()}

                  {/* Offer info */}
                  {(a.stage === 'offer_extended' || a.stage === 'selected') && (
                    <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(46,132,74,0.06)', borderRadius: 10, border: '1px solid rgba(46,132,74,0.3)' }}>
                      {matchedOffer ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                          <p style={{ color: '#2E844A', fontSize: 12, margin: 0, fontWeight: 600 }}>
                            🎉 {matchedOffer.status === 'signed' ? 'You signed this offer!' : 'Your offer letter is ready to review & sign!'}
                          </p>
                          <button
                            onClick={() => navigate(`/offer/${matchedOffer.id || matchedOffer._id}`)}
                            style={{ background: '#2E844A', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                          >
                            {matchedOffer.status === 'signed' ? '📄 View Signed Offer' : '✍️ View & Sign Offer'}
                          </button>
                        </div>
                      ) : (
                        <p style={{ color: '#2E844A', fontSize: 12, margin: 0, fontWeight: 600 }}>🎉 Offer Extended! Your offer letter will be emailed to you shortly.</p>
                      )}
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

                  {/* Recruiter notes */}
                  {a.notes && (
                    <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(1,118,211,0.04)', borderRadius: 10, border: '1px solid rgba(1,118,211,0.12)' }}>
                      <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 600, margin: '0 0 2px' }}>Recruiter Notes</p>
                      <p style={{ color: '#706E6B', fontSize: 12, margin: 0 }}>{a.notes}</p>
                    </div>
                  )}
                </div>
              </div>
              {/* Bottom action bar */}
              <div style={{ padding: '12px 20px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, flexShrink: 0 }}>
                <button onClick={() => setSelectedApp(null)} style={{ flex: 1, background: '#F8FAFF', border: '1px solid #E2E8F0', borderRadius: 12, color: '#374151', fontSize: 13, fontWeight: 600, padding: '11px 0', cursor: 'pointer' }}>← Back</button>
                {canWithdraw(a.stage) && (
                  <button onClick={() => { setSelectedApp(null); setConfirm(appId); }} style={{ flex: 1, background: 'transparent', border: '1.5px solid rgba(186,5,23,0.4)', borderRadius: 12, color: '#BA0517', fontSize: 13, fontWeight: 700, padding: '11px 0', cursor: 'pointer' }}>✕ Withdraw</button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── INVITE DETAIL DRAWER ── */}
      {selectedInvite && (() => {
        const inv = selectedInvite;
        const INVITE_STATUS = {
          sent:       { color: '#0176D3', bg: 'rgba(1,118,211,0.08)',  label: '📨 Pending Response' },
          opened:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', label: '👁 Opened' },
          interested: { color: '#2E844A', bg: 'rgba(46,132,74,0.08)',  label: '⭐ Shortlisted / Interested' },
          declined:   { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', label: '👋 Declined' },
          failed:     { color: '#BA0517', bg: 'rgba(186,5,23,0.08)',   label: '🚫 Failed to Send' },
        };
        const st = INVITE_STATUS[inv.status] || INVITE_STATUS.sent;
        const job = inv.jobId || inv.job;

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 20000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} onClick={e => { if (e.target === e.currentTarget) setSelectedInvite(null); }}>
            <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', maxHeight: '92dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Drag handle */}
              <div style={{ padding: '10px 0 6px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: 40, height: 4, background: '#E2E8F0', borderRadius: 2 }} />
              </div>
              {/* Scrollable body */}
              <div style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
                {/* Header */}
                <div style={{ padding: '0 20px 16px', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 17, color: '#0A1628', lineHeight: 1.3, marginBottom: 3 }}>{job?.title || inv.jobTitle || 'Job Invitation'}</div>
                      {job && <div style={{ fontSize: 13, color: '#0176D3', marginBottom: 8 }}>{job.companyName || job.company}{job.location ? ` · ${job.location}` : ''}</div>}
                      <span style={{ background: st.bg, color: st.color, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>{st.label}</span>
                    </div>
                    <button onClick={() => setSelectedInvite(null)} style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, color: '#64748B', flexShrink: 0 }}>×</button>
                  </div>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  {/* Talent match banner */}
                  {inv.type === 'talent_match' && (
                    <div style={{ background: 'linear-gradient(135deg,rgba(1,118,211,0.08),rgba(1,68,134,0.04))', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#0176D3', fontWeight: 600 }}>
                      ⚡ You were matched to this role based on your profile
                    </div>
                  )}

                  {/* Job details grid */}
                  {job && (job.type || job.location || job.salary) && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                      {job.type && <span style={{ background: '#F1F5F9', color: '#475569', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>💼 {job.type}</span>}
                      {job.location && <span style={{ background: '#F1F5F9', color: '#475569', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>📍 {job.location}</span>}
                      {job.salary && <span style={{ background: '#F1F5F9', color: '#475569', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>💰 {job.salary}</span>}
                    </div>
                  )}

                  {/* Full invite message */}
                  {inv.message && (
                    <div style={{ fontSize: 13, color: '#475569', background: '#F0F7FF', borderLeft: '3px solid #0176D3', padding: '10px 14px', borderRadius: 4, fontStyle: 'italic', lineHeight: 1.6, marginBottom: 14 }}>
                      "{inv.message}"
                    </div>
                  )}

                  {/* Date info */}
                  <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6 }}>
                    {inv.type === 'talent_match' ? 'Matched' : 'Invited'}: {fmtD(inv.sentAt || inv.createdAt)}
                  </div>
                </div>
              </div>
              {/* Bottom action bar */}
              <div style={{ padding: '12px 20px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, flexShrink: 0 }}>
                {['sent', 'opened'].includes(inv.status) ? (
                  <a
                    href={`/invite/${inv.token}`}
                    target="_blank" rel="noreferrer"
                    style={{ flex: 1, textAlign: 'center', background: 'linear-gradient(135deg,#0176D3,#014486)', color: '#fff', textDecoration: 'none', padding: '11px 0', borderRadius: 12, fontSize: 13, fontWeight: 700, display: 'block' }}
                  >
                    ✅ View &amp; Respond
                  </a>
                ) : (
                  <button
                    onClick={() => { setSelectedInvite(null); setActiveTab('applications'); }}
                    style={{ flex: 1, background: 'rgba(46,132,74,0.1)', border: '1px solid rgba(46,132,74,0.3)', color: '#2E844A', padding: '11px 0', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  >
                    📊 View Application Progress
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── DRIVE DETAIL DRAWER ── */}
      {selectedDrive && (() => {
        const reg = selectedDrive;
        const DRIVE_STATUS = {
          registered:  { color: '#0176D3', bg: 'rgba(1,118,211,0.08)',   label: '📋 Registered',   icon: '📋', step: 0 },
          shortlisted: { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)',  label: '⭐ Shortlisted',  icon: '⭐', step: 1 },
          selected:    { color: '#2E844A', bg: 'rgba(46,132,74,0.08)',   label: '🏆 Selected',     icon: '🏆', step: 2 },
          rejected:    { color: '#BA0517', bg: 'rgba(186,5,23,0.08)',    label: '❌ Not Selected', icon: '❌', step: -1 },
        };
        const STEPS = [
          { id: 'registered',  label: 'Registered',  icon: '📋' },
          { id: 'shortlisted', label: 'Shortlisted', icon: '⭐' },
          { id: 'selected',    label: 'Selected',    icon: '🏆' },
        ];
        const st = DRIVE_STATUS[reg.myStatus] || DRIVE_STATUS.registered;
        const isRejectedDrive = reg.myStatus === 'rejected';
        const currentStep = isRejectedDrive ? -1 : st.step;

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 20000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} onClick={e => { if (e.target === e.currentTarget) setSelectedDrive(null); }}>
            <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', maxHeight: '92dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Drag handle */}
              <div style={{ padding: '10px 0 6px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: 40, height: 4, background: '#E2E8F0', borderRadius: 2 }} />
              </div>
              {/* Scrollable body */}
              <div style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
                {/* Header */}
                <div style={{ padding: '0 20px 16px', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 17, color: '#0A1628', lineHeight: 1.3, marginBottom: 3 }}>{reg.title || reg.driveName || 'Campus Drive'}</div>
                      <div style={{ fontSize: 13, color: '#0176D3', marginBottom: 8 }}>{reg.companyName}</div>
                      <span style={{ background: st.bg, color: st.color, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>{st.icon} {st.label}</span>
                    </div>
                    <button onClick={() => setSelectedDrive(null)} style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, color: '#64748B', flexShrink: 0 }}>×</button>
                  </div>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  {/* Drive info */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    {reg.driveType && <span style={{ background: 'rgba(1,118,211,0.1)', color: '#0176D3', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>{reg.driveType === 'placement' ? '🎓 Placement' : reg.driveType === 'internship' ? '💼 Internship' : reg.driveType}</span>}
                    {reg.collegeName && <span style={{ background: '#F1F5F9', color: '#475569', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>🏛 {reg.collegeName}</span>}
                    {reg.driveDate && <span style={{ background: '#F1F5F9', color: '#475569', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>📅 {fmtD(reg.driveDate)}</span>}
                  </div>

                  {/* 3-step stepper */}
                  {isRejectedDrive ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#BA0517', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 800, flexShrink: 0 }}>✕</div>
                      <span style={{ color: '#fca5a5', fontSize: 12, fontWeight: 600 }}>Not selected for this drive</span>
                    </div>
                  ) : (
                    <nav aria-label="Drive status" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: 10 }}>
                      <ol role="list" style={{ display: 'flex', alignItems: 'center', minWidth: 'max-content', gap: 0, listStyle: 'none', margin: 0, padding: '0 0 4px' }}>
                        {STEPS.map((step, i) => {
                          const done = i < currentStep;
                          const active = i === currentStep;
                          const lineColor = done ? '#0176D3' : '#DDDBDA';
                          let dotBg = '#F3F2F2', dotBorder = '2px solid #DDDBDA', dotFg = '#C9C7C5', labelColor = '#9E9D9B';
                          if (done)   { dotBg = '#0176D3'; dotBorder = '2px solid #0176D3'; dotFg = '#fff'; labelColor = '#0176D3'; }
                          if (active) { dotBg = '#fff'; dotBorder = '2.5px solid #0176D3'; dotFg = '#0176D3'; labelColor = '#0176D3'; }
                          return (
                            <React.Fragment key={step.id}>
                              {i > 0 && <div aria-hidden="true" style={{ width: 32, height: 2, background: lineColor, flexShrink: 0 }} />}
                              <li style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                <div style={{
                                  width: 30, height: 30, borderRadius: '50%',
                                  background: dotBg, border: dotBorder,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: active ? 14 : 13, color: dotFg, fontWeight: 700, flexShrink: 0,
                                  ...(active ? { boxShadow: '0 0 0 4px rgba(1,118,211,0.15)' } : {}),
                                }}>
                                  {active ? step.icon : done ? '✓' : step.icon}
                                </div>
                                <span style={{ color: labelColor, fontSize: 10, fontWeight: active ? 700 : 400, whiteSpace: 'nowrap' }}>{step.label}</span>
                              </li>
                            </React.Fragment>
                          );
                        })}
                      </ol>
                    </nav>
                  )}

                  {/* Recruiter notes */}
                  {reg.notes && (
                    <div style={{ padding: '8px 12px', background: 'rgba(1,118,211,0.04)', borderRadius: 10, border: '1px solid rgba(1,118,211,0.12)', marginTop: 4 }}>
                      <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 600, margin: '0 0 2px' }}>Recruiter Notes</p>
                      <p style={{ color: '#706E6B', fontSize: 12, margin: 0 }}>{reg.notes}</p>
                    </div>
                  )}

                  {/* Selected congratulations */}
                  {reg.myStatus === 'selected' && (
                    <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(46,132,74,0.06)', borderRadius: 10, border: '1px solid rgba(46,132,74,0.3)' }}>
                      <p style={{ color: '#2E844A', fontSize: 12, fontWeight: 700, margin: 0 }}>🎉 Congratulations! You have been selected through this campus drive. The recruiter will reach out with next steps.</p>
                    </div>
                  )}
                </div>
              </div>
              {/* Bottom action bar */}
              <div style={{ padding: '12px 20px 24px', borderTop: '1px solid #F1F5F9', flexShrink: 0 }}>
                <button onClick={() => setSelectedDrive(null)} style={{ width: '100%', background: '#F8FAFF', border: '1px solid #E2E8F0', borderRadius: 12, color: '#374151', fontSize: 13, fontWeight: 600, padding: '11px 0', cursor: 'pointer' }}>← Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
