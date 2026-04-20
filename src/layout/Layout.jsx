import React, { useEffect, useState, Suspense } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { api } from '../api/api.js';
import ChangePasswordModal from '../components/shared/ChangePasswordModal.jsx';
import EmailSettingsModal from '../components/shared/EmailSettingsModal.jsx';
import QuickActionMenu from '../components/ui/QuickActionMenu.jsx';
import Logo from '../components/Logo.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import { useLogo } from '../context/LogoContext.jsx';

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
  candidate:  [{id:"dashboard",icon:"🏠",label:"Dashboard"},{id:"explore-jobs",icon:"🔍",label:"Explore Jobs"},{id:"ai-match",icon:"🤖",label:"AI Job Search"},{id:"applications",icon:"📋",label:"My Applications"},{id:"job-alerts",icon:"🔔",label:"Job Alerts"},{id:"onboarding",icon:"🎯",label:"Pre-boarding"},{id:"profile",icon:"👤",label:"My Profile"}],
  recruiter:  [{id:"dashboard",icon:"📊",label:"Dashboard"},{id:"jobs",icon:"💼",label:"My Jobs"},{id:"add-candidate",icon:"➕",label:"Add Candidate"},{id:"candidates",icon:"🧑‍💼",label:"My Candidates"},{id:"assigned-candidates",icon:"🎯",label:"Assigned to Me"},{id:"ai-match",icon:"🤖",label:"AI Match"},{id:"pipeline",icon:"🔄",label:"Pipeline"},{id:"talent-pool",icon:"🅿️",label:"Talent Pool"},{id:"interviews",icon:"📅",label:"Interviews"},{id:"offers",icon:"📄",label:"Offers"},{id:"onboarding",icon:"🎯",label:"Pre-boarding"},{id:"assessments",icon:"📝",label:"Assessments"},{id:"outreach",icon:"📣",label:"Outreach"},{id:"profile",icon:"👤",label:"My Profile"}],
  admin:      [{id:"analytics",icon:"📈",label:"Overview"},{id:"job-approvals",icon:"✅",label:"Job Approvals"},{id:"add-candidate",icon:"➕",label:"Add Candidate"},{id:"candidates",icon:"👤",label:"Candidates"},{id:"outreach",icon:"📣",label:"Outreach"},{id:"assessments",icon:"📝",label:"Assessments"},{id:"onboarding",icon:"🎯",label:"Pre-boarding"},{id:"contact-leads",icon:"📞",label:"Contact Enquiries"},{id:"candidate-requests",icon:"📨",label:"Candidate Requests"},{id:"assigned-candidates",icon:"🎯",label:"Assignments"},{id:"recruiters",icon:"🧑‍💼",label:"Recruiters"},{id:"jobs",icon:"💼",label:"All Jobs"},{id:"automation",icon:"⚡",label:"Automation"},{id:"custom-fields",icon:"🧩",label:"Custom Fields"},{id:"org-settings",icon:"⚙️",label:"Org Settings"},{id:"billing",icon:"💳",label:"Billing"},{id:"profile",icon:"👤",label:"My Profile"}],
  superadmin: [{id:"analytics",icon:"📈",label:"Overview"},{id:"platform",icon:"🌐",label:"Platform"},{id:"organisations",icon:"🏢",label:"Organisations"},{id:"billing",icon:"💳",label:"Billing"},{id:"security",icon:"🛡️",label:"Security"},{id:"permissions",icon:"🔐",label:"Permissions"},{id:"import-candidates",icon:"📥",label:"Import & Assign"},{id:"candidates",icon:"👤",label:"Candidates"},{id:"recruiters",icon:"🧑‍💼",label:"Recruiters"},{id:"admins",icon:"🔑",label:"Admins"},{id:"jobs",icon:"💼",label:"All Jobs"},{id:"assessments",icon:"📝",label:"Assessments"},{id:"onboarding",icon:"🎯",label:"Pre-boarding"},{id:"automation",icon:"⚡",label:"Automation"},{id:"customizations",icon:"⚙️",label:"Customizations"},{id:"outreach",icon:"📣",label:"Outreach"},{id:"contact-leads",icon:"📞",label:"Contact Enquiries"},{id:"candidate-requests",icon:"📨",label:"Candidate Requests"},{id:"playbooks",icon:"📚",label:"Playbooks"},{id:"blogs",icon:"✍️",label:"Blog Manager"},{id:"profile",icon:"👤",label:"My Profile"}],
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
function NotificationBell() {
  const [notifs, setNotifs]   = React.useState([]);
  const [open,   setOpen]     = React.useState(false);
  const [tab,    setTab]      = React.useState('unread');
  const btnRef                = React.useRef(null);
  const [pos,    setPos]      = React.useState({ top: 0, left: 0 });
  const navigate              = useNavigate();

  const load = async () => {
    try { const d = await api.getNotifications(); setNotifs(Array.isArray(d) ? d : []); } catch {}
  };

  React.useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv); }, []);

  const unread = notifs.filter(n => !n.read).length;

  // Keep browser tab title in sync with unread count
  React.useEffect(() => {
    document.title = unread > 0 ? `(${unread}) TalentNest HR` : 'TalentNest HR';
  }, [unread]);

  const openPanel = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const panelW = Math.min(360, window.innerWidth - 32);
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - panelW - 8));
      setPos({ top: rect.bottom + 8, left });
    }
    setOpen(true); load();
  };

  const markOne  = async (id) => { try { await api.markRead(id); setNotifs(p => p.map(n => n._id === id || n.id === id ? { ...n, read: true } : n)); } catch {} };
  const markAll  = async () => { try { await api.markAllRead(); setNotifs(p => p.map(n => ({ ...n, read: true }))); } catch {} };
  const clearAll = async () => { try { await api.clearAllNotifications(); setNotifs([]); setOpen(false); } catch {} };

  const TYPE_MAP = { application: 'pipeline', stage_update: 'pipeline', interview: 'interviews', offer: 'offers', system: 'dashboard', assessment_submitted: 'assessments' };

  const handleClick = async (n) => {
    if (!n.read) { setNotifs(p => p.map(x => x.id === n.id ? { ...x, read: true } : x)); await markOne(n.id); }
    setOpen(false);
    const candidateId = n.metadata?.candidateId || n.data?.candidateId;
    if (candidateId) { sessionStorage.setItem('tn_open_candidate_id', candidateId); navigate('/app/candidates'); }
    else navigate(`/app/${TYPE_MAP[n.type] || 'dashboard'}`);
  };

  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (!e.target.closest('[data-notif-panel]') && !e.target.closest('[data-notif-btn]')) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const TYPE_ICONS  = { application:'📋', stage_update:'🔄', interview:'📅', offer:'🎉', system:'⚙️', assessment_submitted:'📊', job_approved:'✅', job_rejected:'❌' };
  const TYPE_LABELS = { application:'Applied', stage_update:'Stage Update', interview:'Interview', offer:'Offer', system:'System', assessment_submitted:'Submitted', job_approved:'Approved', job_rejected:'Rejected' };
  const displayed   = tab === 'unread' ? notifs.filter(n => !n.read) : notifs;
  const panelW      = Math.min(360, window.innerWidth - 32);

  return (
    <>
      <button ref={btnRef} data-notif-btn="true" onClick={() => open ? setOpen(false) : openPanel()}
        aria-label={`Notifications${unread > 0 ? ` — ${unread} unread` : ''}`}
        aria-haspopup="true" aria-expanded={open}
        style={{ background: open ? 'rgba(255,255,255,0.2)' : 'none', border: '1px solid transparent', borderRadius: 6, cursor: 'pointer', color: '#FFFFFF', fontSize: 17, position: 'relative', padding: '5px 8px', transition: 'all 0.15s', minHeight: 36 }}>
        🔔
        {unread > 0 && <span style={{ position: 'absolute', top: -2, right: -2, background: '#BA0517', color: '#fff', borderRadius: '50%', minWidth: 17, height: 17, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, padding: '0 3px' }}>{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        <div data-notif-panel="true" style={{ 
          position: 'fixed', 
          top: pos.top, 
          left: pos.left, 
          width: panelW, 
          maxHeight: 'calc(100vh - 120px)', 
          background: 'rgba(255, 255, 255, 0.82)', 
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 0, 0, 0.08)', 
          borderRadius: 16, 
          zIndex: 9999, 
          boxShadow: '0 20px 48px rgba(0,0,0,0.22)', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          animation: 'tn-modal-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both'
        }}>
          {/* Header */}
          <div style={{ padding: '13px 16px 0', flexShrink: 0, borderBottom: '1px solid #DDDBDA' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ color: '#181818', fontWeight: 800, fontSize: 14 }}>
                Notifications {unread > 0 && <span style={{ background: '#BA0517', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, marginLeft: 7, fontWeight: 700 }}>{unread} new</span>}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {unread > 0 && <button onClick={markAll} style={{ background: 'none', border: 'none', color: '#0176D3', fontSize: 11, cursor: 'pointer', fontWeight: 600, padding: 0 }}>Mark all read</button>}
                <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#706E6B', fontSize: 16, cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>✕</button>
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
          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {displayed.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🔕</div>
                <div style={{ color: '#3E3E3C', fontSize: 13, fontWeight: 600 }}>{tab === 'unread' ? 'All caught up!' : 'No notifications yet'}</div>
                <div style={{ color: '#706E6B', fontSize: 11, marginTop: 5 }}>{tab === 'unread' ? 'Switch to "All" to see past notifications' : "You'll see updates here when things happen"}</div>
              </div>
            ) : displayed.map(n => (
              <div key={n.id} onClick={() => handleClick(n)}
                style={{ padding: '11px 16px', borderBottom: '1px solid #F3F2F2', background: n.read ? '#FFFFFF' : 'rgba(1,118,211,0.06)', cursor: 'pointer', display: 'flex', gap: 11, alignItems: 'flex-start' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F3F2F2'}
                onMouseLeave={e => e.currentTarget.style.background = n.read ? '#FFFFFF' : 'rgba(1,118,211,0.06)'}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: n.read ? '#F3F2F2' : 'rgba(1,118,211,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{TYPE_ICONS[n.type] || '🔔'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ color: n.read ? '#3E3E3C' : '#181818', fontSize: 12, fontWeight: n.read ? 500 : 700, lineHeight: 1.4, flex: 1, minWidth: 0 }}>{n.title}</span>
                    {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#0176D3', flexShrink: 0 }} />}
                  </div>
                  {n.body && <div style={{ color: '#3E3E3C', fontSize: 11, lineHeight: 1.45, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.body}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#706E6B', fontSize: 10 }}>{timeAgo(n.createdAt)}</span>
                    {n.type && <span style={{ color: '#0176D3', fontSize: 10, background: 'rgba(1,118,211,0.08)', borderRadius: 4, padding: '1px 5px' }}>{TYPE_LABELS[n.type] || n.type}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {notifs.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '1px solid #DDDBDA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: '#F3F2F2' }}>
              <span style={{ color: '#706E6B', fontSize: 11 }}>{notifs.length} total</span>
              <button onClick={clearAll} style={{ background: 'none', border: 'none', color: '#706E6B', fontSize: 11, cursor: 'pointer', padding: 0 }}>Clear all</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Sidebar Content ────────────────────────────────────────────────────────────
function SidebarContent({ nav, orgLogo, user, rk, onLogout, setMobileOpen, setShowChangePwd, setShowEmailSettings }) {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const sidebarText = '#F8FBFF';
  const sidebarMuted = 'rgba(248,251,255,0.78)';
  const sidebarLine = 'rgba(255,255,255,0.12)';
  const activeBg = 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.1))';
  const activeBorder = '1px solid rgba(255,255,255,0.16)';
  const hoverBg = 'rgba(255,255,255,0.1)';

  useEffect(() => {
    if (!profileOpen) return;
    const h = (e) => { if (!e.target.closest('[data-profile-menu]')) setProfileOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [profileOpen]);

  return (
    <>
      {/* Logo + Bell */}
      <div style={{ padding: '18px 16px 16px', borderBottom: `1px solid ${sidebarLine}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', minHeight: 38 }}>
            <Logo size="md" variant="full" theme="dark" customLogoUrl={orgLogo} />
          </div>
          <div style={{ color: sidebarMuted, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em' }}>{(user.role || '').toUpperCase()}</div>
        </div>
        <NotificationBell />
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

  const sidebarProps = { nav, user, rk, onLogout, setMobileOpen, orgLogo: customLogoUrl || orgLogo, setShowChangePwd, setShowEmailSettings };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: '#F3F2F2', fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", paddingTop: 'env(safe-area-inset-top, 0px)', paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }}>
      {showChangePwd && <ChangePasswordModal user={user} onClose={() => setShowChangePwd(false)} />}
      {showEmailSettings && <EmailSettingsModal user={user} onClose={() => setShowEmailSettings(false)} />}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        ::-webkit-scrollbar { width: 4px; height: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: rgba(1,118,211,0.3); border-radius: 2px }
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
            <button onClick={() => setMobileOpen(true)} aria-label="Open navigation menu" style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', padding: '4px 6px', lineHeight: 1, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>☰</button>
            <div style={{ flex: 1 }}><Logo size="sm" variant="full" theme="dark" customLogoUrl={customLogoUrl || orgLogo} /></div>
            <NotificationBell />
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: online ? '#10B981' : '#BA0517', fontWeight: 600, marginLeft: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: online ? '#10B981' : '#BA0517', display: 'inline-block' }} />
            </span>
            <button onClick={onLogout} title="Sign Out" aria-label="Sign Out" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 16, minHeight: 40, minWidth: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🚪</button>
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
