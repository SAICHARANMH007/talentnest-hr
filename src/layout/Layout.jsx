import React, { useEffect, useState, Suspense } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { api } from '../api/api.js';
import ChangePasswordModal from '../components/shared/ChangePasswordModal.jsx';
import EmailSettingsModal from '../components/shared/EmailSettingsModal.jsx';
import QuickActionMenu from '../components/ui/QuickActionMenu.jsx';
import Logo from '../components/Logo.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import { useLogo } from '../context/LogoContext.jsx';
import useHeartbeat from '../hooks/useHeartbeat.js';
import OnlinePanel from '../components/shared/OnlinePanel.jsx';
import ChatPanel from '../components/shared/ChatPanel.jsx';

// ── Page Loader (Skeletal) ───────────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Skeleton height="40px" width="300px" style={{ marginBottom: 20 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        <Skeleton height="200px" />
        <Skeleton height="200px" />
        <Skeleton height="200px" />
      </div>
      <Skeleton height="400px" style={{ marginTop: 20 }} />
    </div>
  );
}

// ── Nav definitions ────────────────────────────────────────────────────────────
const NAVS = {
  candidate:  [{id:"dashboard",icon:"🏠",label:"Dashboard"},{id:"ai-match",icon:"🤖",label:"Explore Jobs"},{id:"applications",icon:"📋",label:"My Applications"},{id:"job-alerts",icon:"🔔",label:"Job Alerts"},{id:"onboarding",icon:"🎯",label:"Pre-boarding"},{id:"profile",icon:"👤",label:"My Profile"}],
  recruiter:  [{id:"dashboard",icon:"📊",label:"Dashboard"},{id:"applicants",icon:"📇",label:"Applicants"},{id:"jobs",icon:"💼",label:"My Jobs"},{id:"add-candidate",icon:"➕",label:"Add Candidate"},{id:"candidates",icon:"🧑‍💼",label:"My Candidates"},{id:"assigned-candidates",icon:"🎯",label:"Assigned to Me"},{id:"ai-match",icon:"🤖",label:"AI Match"},{id:"pipeline",icon:"🔄",label:"Pipeline"},{id:"talent-pool",icon:"🅿️",label:"Talent Pool"},{id:"interviews",icon:"📅",label:"Interviews"},{id:"offers",icon:"📄",label:"Offers"},{id:"onboarding",icon:"🎯",label:"Pre-boarding"},{id:"assessments",icon:"📝",label:"Assessments"},{id:"outreach",icon:"📣",label:"Outreach"},{id:"candidate-requests",icon:"📨",label:"Candidate Requests"},{id:"profile",icon:"👤",label:"My Profile"}],
  admin:      [{id:"analytics",icon:"📈",label:"Overview"},{id:"applicants",icon:"📇",label:"Applicants"},{id:"job-approvals",icon:"✅",label:"Job Approvals"},{id:"add-candidate",icon:"➕",label:"Add Candidate"},{id:"candidates",icon:"👤",label:"Candidates"},{id:"outreach",icon:"📣",label:"Outreach"},{id:"assessments",icon:"📝",label:"Assessments"},{id:"onboarding",icon:"🎯",label:"Pre-boarding"},{id:"contact-leads",icon:"📞",label:"Contact Enquiries"},{id:"candidate-requests",icon:"📨",label:"Candidate Requests"},{id:"assigned-candidates",icon:"🎯",label:"Assignments"},{id:"recruiters",icon:"🧑‍💼",label:"Recruiters"},{id:"jobs",icon:"💼",label:"All Jobs"},{id:"automation",icon:"⚡",label:"Automation"},{id:"custom-fields",icon:"🧩",label:"Custom Fields"},{id:"org-settings",icon:"⚙️",label:"Org Settings"},{id:"billing",icon:"💳",label:"Billing"},{id:"profile",icon:"👤",label:"My Profile"}],
  superadmin: [{id:"analytics",icon:"📈",label:"Overview"},{id:"applicants",icon:"📇",label:"Applicants"},{id:"platform",icon:"🌐",label:"Platform"},{id:"organisations",icon:"🏢",label:"Organisations"},{id:"billing",icon:"💳",label:"Billing"},{id:"security",icon:"🛡️",label:"Security"},{id:"permissions",icon:"🔐",label:"Permissions"},{id:"import-candidates",icon:"📥",label:"Import & Assign"},{id:"candidates",icon:"👤",label:"Candidates"},{id:"recruiters",icon:"🧑‍💼",label:"Recruiters"},{id:"admins",icon:"🔑",label:"Admins"},{id:"jobs",icon:"💼",label:"All Jobs"},{id:"assessments",icon:"📝",label:"Assessments"},{id:"onboarding",icon:"🎯",label:"Pre-boarding"},{id:"automation",icon:"⚡",label:"Automation"},{id:"customizations",icon:"⚙️",label:"Customizations"},{id:"outreach",icon:"📣",label:"Outreach"},{id:"contact-leads",icon:"📞",label:"Contact Enquiries"},{id:"candidate-requests",icon:"📨",label:"Candidate Requests"},{id:"playbooks",icon:"📚",label:"Playbooks"},{id:"blogs",icon:"✍️",label:"Blog Manager"},{id:"profile",icon:"👤",label:"My Profile"}],
  client:     [{id:"dashboard",icon:"🏢",label:"Dashboard"},{id:"shortlists",icon:"🌟",label:"Shortlists"},{id:"interviews",icon:"📅",label:"Interviews"},{id:"placements",icon:"🏆",label:"Placements"},{id:"profile",icon:"👤",label:"My Profile"}],
  hiring_manager: [{id:"dashboard",icon:"📊",label:"Dashboard"},{id:"pipeline",icon:"🔄",label:"Pipeline"},{id:"interviews",icon:"📅",label:"Interviews"},{id:"profile",icon:"👤",label:"My Profile"}],
};

// ── Relative time helper ───────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800)return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ── Notification Bell ──────────────────────────────────────────────────────────
function NotificationBell({ userRole, compact = false }) {
  const [notifs,   setNotifs]   = React.useState([]);
  const [open,     setOpen]     = React.useState(false);
  const [tab,      setTab]      = React.useState('unread');
  const [detail,   setDetail]   = React.useState(null);   // selected notification for drill-down
  const [loading,  setLoading]  = React.useState(false);
  const btnRef                  = React.useRef(null);
  const [pos,      setPos]      = React.useState({ top: 0, left: 0 });
  const navigate                = useNavigate();
  const summaryFetched          = React.useRef(false);

  const load = React.useCallback(async () => {
    try {
      const d = await api.getNotifications();
      setNotifs(Array.isArray(d) ? d : []);
    } catch {}
  }, []);

  React.useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [load]);

  const unread = notifs.filter(n => !n.read).length;

  React.useEffect(() => {
    document.title = unread > 0 ? `(${unread}) TalentNest HR` : 'TalentNest HR';
  }, [unread]);

  const openPanel = async () => {
    if (btnRef.current) {
      const rect   = btnRef.current.getBoundingClientRect();
      const panelW = Math.min(380, window.innerWidth - 24);
      const left   = Math.max(8, Math.min(rect.left, window.innerWidth - panelW - 8));
      setPos({ top: rect.bottom + 8, left });
    }
    setOpen(true);

    // For super_admin: auto-generate platform summary on first open
    if (userRole === 'super_admin' && !summaryFetched.current) {
      summaryFetched.current = true;
      setLoading(true);
      try {
        const fresh = await api.generatePlatformNotifications();
        if (Array.isArray(fresh)) setNotifs(fresh);
      } catch { await load(); }
      setLoading(false);
    } else {
      await load();
    }
  };

  const markOne  = async (id) => {
    if (!id) return;
    try {
      await api.markRead(id);
      setNotifs(p => p.map(n => (n._id === id || n.id === id) ? { ...n, read: true } : n));
    } catch {}
  };
  const markAll  = async () => {
    try { await api.markAllRead(); setNotifs(p => p.map(n => ({ ...n, read: true }))); } catch {}
  };
  const clearAll = async () => {
    try { await api.clearAllNotifications(); setNotifs([]); setOpen(false); } catch {}
  };

  const TYPE_MAP = {
    application: 'pipeline', stage_update: 'pipeline', stage_change: 'pipeline',
    interview: 'interviews', offer: 'offers', system: 'analytics',
    assessment_submitted: 'assessments', job_approved: 'jobs', job_rejected: 'jobs',
    invite_interested: 'candidates',
  };
  const TYPE_ICONS  = { application:'📋', stage_update:'🔄', stage_change:'🔄', interview:'📅', offer:'🎉', system:'⚙️', assessment_submitted:'📊', job_approved:'✅', job_rejected:'❌', invite_interested:'🙋' };
  const TYPE_LABELS = { application:'Application', stage_update:'Stage Update', stage_change:'Stage Update', interview:'Interview', offer:'Offer', system:'System', assessment_submitted:'Assessment', job_approved:'Approved', job_rejected:'Rejected', invite_interested:'Interest' };

  // Open detail modal — mark read + store for display
  const openDetail = async (n) => {
    const nid = n._id || n.id;
    if (!n.read) {
      setNotifs(p => p.map(x => (x._id || x.id) === nid ? { ...x, read: true } : x));
      await markOne(nid);
    }
    setDetail(n);
  };

  // Navigate after viewing detail
  const goToDetail = (n) => {
    setDetail(null);
    setOpen(false);
    const candidateId = n.metadata?.candidateId || n.data?.candidateId;
    if (candidateId) {
      sessionStorage.setItem('tn_open_candidate_id', candidateId);
      navigate('/app/candidates');
    } else {
      navigate(`/app/${TYPE_MAP[n.type] || 'analytics'}`);
    }
  };

  React.useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (!e.target.closest('[data-notif-panel]') && !e.target.closest('[data-notif-btn]')) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const displayed = tab === 'unread' ? notifs.filter(n => !n.read) : notifs;
  const panelW    = Math.min(380, window.innerWidth - 24);

  const iconButtonSize = compact ? 36 : 40;

  return (
    <>
      {/* Detail drill-down modal */}
      {detail && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.6)', backdropFilter: 'blur(4px)', zIndex: 10002, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setDetail(null); }}
        >
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 460, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            {/* Modal header */}
            <div style={{ background: 'linear-gradient(135deg,#032D60,#0176D3)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {TYPE_ICONS[detail.type] || '🔔'}
                </div>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 }}>
                    {TYPE_LABELS[detail.type] || detail.type}
                  </div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, lineHeight: 1.3 }}>{detail.title}</div>
                </div>
              </div>
              <button onClick={() => setDetail(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '20px 24px' }}>
              {(detail.body || detail.message) && (
                <div style={{ background: '#F8FAFF', border: '1px solid #E8F0FE', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                  <p style={{ color: '#374151', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{detail.body || detail.message}</p>
                </div>
              )}

              {/* Metadata chips */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <span style={{ fontSize: 11, color: '#706E6B', background: '#F3F4F6', borderRadius: 20, padding: '3px 10px' }}>
                  🕐 {timeAgo(detail.createdAt)}
                </span>
                <span style={{ fontSize: 11, color: '#0176D3', background: 'rgba(1,118,211,0.08)', borderRadius: 20, padding: '3px 10px', fontWeight: 600 }}>
                  {TYPE_LABELS[detail.type] || detail.type}
                </span>
                {detail.metadata?.orgName && (
                  <span style={{ fontSize: 11, color: '#059669', background: 'rgba(5,150,105,0.08)', borderRadius: 20, padding: '3px 10px' }}>
                    🏢 {detail.metadata.orgName}
                  </span>
                )}
                {detail.metadata?.totalUsers !== undefined && (
                  <span style={{ fontSize: 11, color: '#7c3aed', background: 'rgba(124,58,237,0.08)', borderRadius: 20, padding: '3px 10px' }}>
                    👥 {detail.metadata.totalUsers} users
                  </span>
                )}
                {detail.metadata?.pendingInvites !== undefined && (
                  <span style={{ fontSize: 11, color: '#d97706', background: 'rgba(217,119,6,0.08)', borderRadius: 20, padding: '3px 10px' }}>
                    📧 {detail.metadata.pendingInvites} pending
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => goToDetail(detail)}
                  style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg,#0176D3,#0154A4)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                >
                  View Details →
                </button>
                <button
                  onClick={() => setDetail(null)}
                  style={{ padding: '11px 18px', background: '#F8FAFF', border: '1.5px solid #E2E8F0', borderRadius: 10, color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bell button */}
      <button
        ref={btnRef}
        data-notif-btn="true"
        className="tn-app-icon-btn"
        onClick={() => open ? setOpen(false) : openPanel()}
        aria-label={`Notifications${unread > 0 ? ` — ${unread} unread` : ''}`}
        style={{ background: open ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, cursor: 'pointer', color: '#FFFFFF', fontSize: compact ? 14 : 16, position: 'relative', padding: 0, transition: 'all 0.15s', width: iconButtonSize, minWidth: iconButtonSize, height: iconButtonSize, minHeight: iconButtonSize, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, flexShrink: 0 }}
      >
        🔔
        {unread > 0 && <span style={{ position: 'absolute', top: -2, right: -2, background: '#BA0517', color: '#fff', borderRadius: '50%', minWidth: 17, height: 17, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, padding: '0 3px' }}>{unread > 99 ? '99+' : unread}</span>}
      </button>

      {/* Notification panel */}
      {open && (
        <div data-notif-panel="true" style={{
          position: 'fixed', top: pos.top, left: pos.left, width: panelW,
          maxHeight: 'min(520px, calc(100vh - 120px))',
          background: '#fff', border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: 16, zIndex: 9999,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Panel header */}
          <div style={{ padding: '13px 16px 0', flexShrink: 0, borderBottom: '1px solid #F3F2F2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ color: '#181818', fontWeight: 800, fontSize: 14 }}>
                🔔 Notifications
                {unread > 0 && <span style={{ background: '#BA0517', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, marginLeft: 7, fontWeight: 700 }}>{unread} new</span>}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {userRole === 'super_admin' && (
                  <button
                    onClick={async () => {
                      setLoading(true);
                      try { const f = await api.generatePlatformNotifications(); if (Array.isArray(f)) setNotifs(f); } catch {}
                      setLoading(false);
                    }}
                    title="Refresh platform summary"
                    style={{ background: 'none', border: 'none', color: '#0176D3', fontSize: 11, cursor: 'pointer', fontWeight: 600, padding: 0 }}
                  >
                    🔄 Refresh
                  </button>
                )}
                {unread > 0 && <button onClick={markAll} style={{ background: 'none', border: 'none', color: '#0176D3', fontSize: 11, cursor: 'pointer', fontWeight: 600, padding: 0 }}>Mark all read</button>}
                <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#706E6B', fontSize: 18, cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>✕</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 0 }}>
              {['unread', 'all'].map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tab === t ? '#0176D3' : '#706E6B', fontWeight: tab === t ? 700 : 400, fontSize: 12, padding: '6px 14px 8px', borderBottom: tab === t ? '2px solid #0176D3' : '2px solid transparent', marginBottom: -1, transition: 'all 0.15s' }}>
                  {t === 'unread' ? `Unread${unread > 0 ? ` (${unread})` : ''}` : `All (${notifs.length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Panel body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {loading ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#706E6B', fontSize: 13 }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
                Loading platform data…
              </div>
            ) : displayed.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🔕</div>
                <div style={{ color: '#3E3E3C', fontSize: 13, fontWeight: 600 }}>
                  {tab === 'unread' ? 'All caught up!' : 'No notifications yet'}
                </div>
                <div style={{ color: '#706E6B', fontSize: 11, marginTop: 5 }}>
                  {tab === 'unread' ? 'Switch to "All" to see past notifications' : "You'll see updates here when things happen"}
                </div>
                {userRole === 'super_admin' && tab !== 'unread' && (
                  <button
                    onClick={async () => {
                      setLoading(true);
                      try { const f = await api.generatePlatformNotifications(); if (Array.isArray(f)) { setNotifs(f); setTab('all'); } } catch {}
                      setLoading(false);
                    }}
                    style={{ marginTop: 14, padding: '8px 18px', background: 'linear-gradient(135deg,#0176D3,#0154A4)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                  >
                    🔄 Load Platform Summary
                  </button>
                )}
              </div>
            ) : (
              displayed.map(n => (
                <div
                  key={n.id || n._id}
                  onClick={() => openDetail(n)}
                  style={{ padding: '11px 16px', borderBottom: '1px solid #F3F2F2', background: n.read ? '#FFFFFF' : 'rgba(1,118,211,0.05)', cursor: 'pointer', display: 'flex', gap: 11, alignItems: 'flex-start', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8F9FA'}
                  onMouseLeave={e => e.currentTarget.style.background = n.read ? '#FFFFFF' : 'rgba(1,118,211,0.05)'}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: n.read ? '#F3F4F6' : 'rgba(1,118,211,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {TYPE_ICONS[n.type] || '🔔'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 3 }}>
                      <span style={{ color: n.read ? '#374151' : '#181818', fontSize: 12, fontWeight: n.read ? 500 : 700, lineHeight: 1.4, flex: 1 }}>{n.title}</span>
                      {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#0176D3', flexShrink: 0, marginTop: 3 }} />}
                    </div>
                    {(n.body || n.message) && (
                      <div style={{ color: '#6B7280', fontSize: 11, lineHeight: 1.5, marginBottom: 5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {n.body || n.message}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#9CA3AF', fontSize: 10 }}>{timeAgo(n.createdAt)}</span>
                      {n.type && <span style={{ color: '#0176D3', fontSize: 10, background: 'rgba(1,118,211,0.08)', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>{TYPE_LABELS[n.type] || n.type}</span>}
                      <span style={{ color: '#0176D3', fontSize: 10, marginLeft: 'auto' }}>View →</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifs.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid #F3F2F2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: '#FAFAFA' }}>
              <span style={{ color: '#9CA3AF', fontSize: 11 }}>{notifs.length} total · {unread} unread</span>
              <button onClick={clearAll} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 11, cursor: 'pointer', padding: 0 }}>Clear all</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Sidebar Content ────────────────────────────────────────────────────────────
function SidebarContent({ nav, orgLogo, user, rk, onLogout, setMobileOpen, setShowChangePwd, setShowEmailSettings, setShowOnline, setShowInbox, unreadMsgs }) {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const sidebarText = '#F8FBFF';
  const sidebarMuted = 'rgba(248,251,255,0.78)';
  const sidebarLine = 'rgba(255,255,255,0.12)';
  const activeBg = 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.1))';
  const activeBorder = '1px solid rgba(255,255,255,0.16)';
  const hoverBg = 'rgba(255,255,255,0.1)';
  const sidebarActionBtn = {
    width: 36,
    minWidth: 36,
    height: 36,
    minHeight: 36,
    borderRadius: 8,
    padding: 0,
    cursor: 'pointer',
    fontSize: 14,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative',
  };

  useEffect(() => {
    if (!profileOpen) return;
    const h = (e) => { if (!e.target.closest('[data-profile-menu]')) setProfileOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [profileOpen]);

  return (
    <>
      {/* Logo + quick controls */}
      <div style={{ padding: '18px 16px 16px', borderBottom: `1px solid ${sidebarLine}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', minHeight: 42, overflow: 'hidden', minWidth: 0, flex: 1 }}>
            <Logo size="md" variant="full" theme="dark" customLogoUrl={orgLogo} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, height: 36 }}>
            <NotificationBell userRole={user?.role} compact />
            <button className="tn-app-icon-btn" onClick={() => setShowInbox?.(true)} title="Messages" aria-label="Messages" style={{ ...sidebarActionBtn, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
              💬
              {unreadMsgs > 0 && <span style={{ position: 'absolute', top: 2, right: 2, background: '#ef4444', borderRadius: '50%', width: 12, height: 12, fontSize: 8, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadMsgs > 9 ? '9+' : unreadMsgs}</span>}
            </button>
            <button className="tn-app-icon-btn" onClick={() => setShowOnline?.(true)} title="Who's Online" aria-label="Who's Online" style={{ ...sidebarActionBtn, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>🟢</button>
          </div>
        </div>
        <div style={{ color: sidebarMuted, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{(user.role || '').toUpperCase()}</div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {nav.map(n => (
          <NavLink key={n.id} to={`/app/${n.id}`} onClick={() => setMobileOpen?.(false)}
            data-label={n.label}
            title={n.label}
            style={({ isActive }) => ({
              width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12,
              border: isActive ? activeBorder : '1px solid transparent',
              background: isActive ? activeBg : 'transparent',
              color: sidebarText, fontSize: 13, fontWeight: isActive ? 800 : 700,
              cursor: 'pointer', marginBottom: 4, textAlign: 'left', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', textDecoration: 'none',
              boxShadow: isActive ? '0 10px 24px rgba(0,0,0,0.18)' : 'none',
            })}
            onMouseEnter={e => {
              if (!e.currentTarget.classList.contains('active')) {
                e.currentTarget.style.background = hoverBg;
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.transform = 'translateX(6px)';
              }
            }}
            onMouseLeave={e => {
              if (!e.currentTarget.classList.contains('active')) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.transform = 'translateX(0)';
              }
            }}
          >
            {({ isActive }) => (
              <>
                <span style={{ fontSize: 18, flexShrink: 0, opacity: isActive ? 1 : 0.92 }}>{n.icon}</span>
                <span className="tn-nav-label" style={{ opacity: isActive ? 1 : 0.96, color: isActive ? '#FFFFFF' : sidebarMuted }}>{n.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${sidebarLine}`, padding: '14px 16px', flexShrink: 0 }}>
        {/* Profile row — click to expand menu inline */}
        <button onClick={() => setProfileOpen(p => !p)} data-profile-menu="true"
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: profileOpen ? hoverBg : 'rgba(255,255,255,0.04)', border: `1px solid ${profileOpen ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, padding: '10px 10px', cursor: 'pointer', marginBottom: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0176D3', border: '2px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 14, flexShrink: 0 }}>
            {(user.name || '?')[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
            <div style={{ color: sidebarText, fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
            <span style={{ background: 'rgba(255,255,255,0.16)', color: sidebarText, fontSize: 10, borderRadius: 10, padding: '3px 8px', fontWeight: 700, display: 'inline-block', marginTop: 4 }}>{(user.role || '').replace('_', ' ')}</span>
          </div>
          <span style={{ color: sidebarMuted, fontSize: 12, flexShrink: 0 }}>{profileOpen ? '▲' : '▼'}</span>
        </button>
        {/* Inline expanded menu — no fixed positioning, always visible */}
        {profileOpen && (
          <div data-profile-menu="true" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden', marginTop: 6 }}>
            {[
              { icon: '👤', label: 'My Profile', action: () => { navigate('/app/profile'); setMobileOpen?.(false); setProfileOpen(false); } },
              { icon: '🔒', label: 'Change Password', action: () => { setShowChangePwd(true); setProfileOpen(false); } },
              ...(rk !== 'candidate' ? [{ icon: '📧', label: 'Email Settings', action: () => { setShowEmailSettings(true); setProfileOpen(false); } }] : []),
              { icon: '🚪', label: 'Sign Out', action: onLogout, danger: true },
            ].map(item => (
              <button key={item.label} onClick={item.action}
                style={{ width: '100%', padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: item.danger ? '#FFD0D0' : sidebarText, textAlign: 'left', transition: 'background 0.12s', fontWeight: item.danger ? 800 : 700 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <span>{item.icon}</span><span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── Main Layout ────────────────────────────────────────────────────────────────
export default function Layout({ user, onLogout }) {
  const rk                               = user.role === 'super_admin' ? 'superadmin' : user.role;
  const nav                              = NAVS[rk] || NAVS.candidate;
  const [mobileOpen, setMobileOpen]      = useState(false);
  const [showChangePwd, setShowChangePwd]= useState(false);
  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [orgLogo, setOrgLogo]            = useState(null);
  const [trialDays, setTrialDays]        = useState(null);
  const [online, setOnline]              = useState(true);
  const { customLogoUrl }                = useLogo();

  useEffect(() => {
    const check = () => setOnline(navigator.onLine);
    window.addEventListener('online', check);
    window.addEventListener('offline', check);
    return () => { window.removeEventListener('online', check); window.removeEventListener('offline', check); };
  }, []);

  useEffect(() => {
    if (user.orgId) {
      api.getOrgs().then(orgs => {
        const org = orgs.find(o => String(o.id || o._id) === String(user.orgId));
        if (org?.logoUrl) setOrgLogo(org.logoUrl);
      }).catch(() => {});
    }
  }, [user.orgId]);

  useEffect(() => {
    if (rk === 'admin') {
      api.getBillingUsage().then(u => {
        if (u?.plan === 'trial' && u.trialEndsAt) {
          const diff = new Date(u.trialEndsAt) - new Date();
          setTrialDays(Math.max(0, Math.ceil(diff / 86400000)));
        }
      }).catch(() => {});
    }
  }, [rk]);

  const [showOnline, setShowOnline]   = useState(false);
  const [showInbox,  setShowInbox]    = useState(false);
  const [unreadMsgs, setUnreadMsgs]   = useState(0);
  const [chatRecipient, setChatRecipient] = useState(null);
  useHeartbeat(user);

  useEffect(() => {
    if (!user?.role) return;
    const load = () => api.getUnreadMessageCount().then(r => setUnreadMsgs(r?.data?.count || 0)).catch(() => {});
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [user?.role]);

  const sidebarProps = { nav, user, rk, onLogout, setMobileOpen, orgLogo: customLogoUrl || orgLogo, setShowChangePwd, setShowEmailSettings, setShowOnline, setShowInbox, unreadMsgs };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: '#F3F2F2', fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", paddingTop: 'env(safe-area-inset-top, 0px)', paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }}>
      {showChangePwd && <ChangePasswordModal user={user} onClose={() => setShowChangePwd(false)} />}
      {showEmailSettings && <EmailSettingsModal user={user} onClose={() => setShowEmailSettings(false)} />}
      <OnlinePanel user={user} open={showOnline} onClose={() => setShowOnline(false)} onMessage={u => { setShowOnline(false); setChatRecipient(u); setShowInbox(true); }} />
      <ChatPanel open={showInbox} onClose={() => { setShowInbox(false); setUnreadMsgs(0); setChatRecipient(null); }} myUser={user} initialRecipient={chatRecipient} />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        ::-webkit-scrollbar { width: 4px; height: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: rgba(1,118,211,0.3); border-radius: 2px }
        .tn-app-icon-btn { aspect-ratio: 1 / 1; line-height: 1; place-items: center; }
        .tn-app-icon-btn > span:first-child { line-height: 1; }
      `}</style>

      {/* Trial Banner */}
      {trialDays !== null && (
        <div style={{ background: '#FFF3CD', borderBottom: '1px solid #F59E0B', padding: '8px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, fontSize: 12, flexShrink: 0 }}>
          <span style={{ color: '#92400E', fontWeight: 600 }}>⏰ {trialDays} days left in your trial</span>
          <button onClick={() => window.dispatchEvent(new CustomEvent('tn_nav', { detail: 'billing' }))} style={{ background: '#F59E0B', border: 'none', borderRadius: 4, color: '#fff', fontWeight: 700, fontSize: 11, padding: '4px 12px', cursor: 'pointer' }}>Upgrade now →</button>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {/* Desktop Sidebar — fixed position via CSS */}
        <div className="tn-sidebar"><SidebarContent {...sidebarProps} /></div>

        {/* Mobile overlay */}
        {mobileOpen && <div className="tn-mobile-overlay" onClick={() => setMobileOpen(false)} />}

        {/* Mobile Sidebar */}
        <div className={`tn-sidebar-mobile${mobileOpen ? ' open' : ''}`}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 12px 0' }}>
            <button onClick={() => setMobileOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
          <SidebarContent {...sidebarProps} />
        </div>

        {/* Main Content */}
        <div className="tn-main-content" style={{ flex: 1, overflow: 'auto', padding: '24px', background: '#F3F2F2', minWidth: 0, paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', minHeight: '100dvh', boxSizing: 'border-box' }}>
          {/* Mobile Hamburger Header */}
          <div className="tn-hamburger" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, background: '#032D60', borderRadius: 12, padding: '10px 14px' }}>
            <button className="tn-app-icon-btn" onClick={() => setMobileOpen(true)} aria-label="Open navigation menu" style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1, minHeight: 40, minWidth: 40, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>☰</button>
            <div className="tn-hamburger-logo" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}><Logo size="sm" variant="full" theme="dark" customLogoUrl={customLogoUrl || orgLogo} /></div>
            <NotificationBell userRole={user?.role} />
            <button className="tn-app-icon-btn" onClick={() => { setShowInbox(true); setUnreadMsgs(0); }} title="Messages" aria-label="Messages" style={{ position: 'relative', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: 8, padding: 0, cursor: 'pointer', fontSize: 16, minHeight: 40, minWidth: 40, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                💬
                {unreadMsgs > 0 && <span style={{ position: 'absolute', top: 4, right: 4, background: '#ef4444', borderRadius: '50%', width: 14, height: 14, fontSize: 9, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadMsgs > 9 ? '9+' : unreadMsgs}</span>}
              </button>
            <button className="tn-app-icon-btn" onClick={() => setShowOnline(true)} title="Who's Online" aria-label="Who's Online" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: 8, padding: 0, cursor: 'pointer', fontSize: 16, minHeight: 40, minWidth: 40, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
              🟢
            </button>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 10, minWidth: 10, fontSize: 10, color: online ? '#10B981' : '#BA0517', fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: online ? '#10B981' : '#BA0517', display: 'inline-block' }} />
            </span>
            <button className="tn-app-icon-btn" onClick={onLogout} title="Sign Out" aria-label="Sign Out" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: 8, padding: 0, cursor: 'pointer', fontSize: 16, minHeight: 40, minWidth: 40, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🚪</button>
          </div>

          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </div>

      <QuickActionMenu user={user} />
    </div>
  );
}
