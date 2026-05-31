import React, { useEffect, useState, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { api, setToken as setApiToken } from '../api/api.js';
import ChangePasswordModal from '../components/shared/ChangePasswordModal.jsx';
import EmailSettingsModal from '../components/shared/EmailSettingsModal.jsx';
import QuickActionMenu from '../components/ui/QuickActionMenu.jsx';
import Logo from '../components/Logo.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import { useLogo } from '../context/LogoContext.jsx';
import useHeartbeat from '../hooks/useHeartbeat.js';
import { usePlatformSocket } from '../hooks/usePlatformSocket.js';
import OnlinePanel from '../components/shared/OnlinePanel.jsx';
import ChatPanel from '../components/shared/ChatPanel.jsx';
// Direct import (not lazy) so socket connects immediately on app load.
// Previously lazy + ErrorBoundary was silently swallowing errors and preventing
// the call socket from ever connecting for some users.
import CallManager from '../components/calling/CallManager.jsx';

function AppIcon({ name, size = 18, color = 'currentColor' }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
    focusable: 'false',
    style: { display: 'block' },
  };
  if (name === 'bell') {
    return (
      <svg {...common}>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
    );
  }
  if (name === 'message') {
    return (
      <svg {...common}>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        <path d="M8 9h8" />
        <path d="M8 13h5" />
      </svg>
    );
  }
  if (name === 'online') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" fill="#22c55e" stroke="none" />
        <path d="M5 12a7 7 0 0 1 14 0" opacity="0.7" />
        <path d="M2.5 12a9.5 9.5 0 0 1 19 0" opacity="0.45" />
      </svg>
    );
  }
  return null;
}

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
  candidate:  [{id:"dashboard",icon:"🏠",label:"Dashboard"},{id:"job-match",icon:"🎯",label:"Job Match"},{id:"applications",icon:"📋",label:"My Applications"},{id:"job-alerts",icon:"🔔",label:"Job Alerts"},{id:"onboarding",icon:"🎯",label:"Pre-boarding"},{id:"background-verification",icon:"🛡️",label:"BGV Documents"},{id:"profile",icon:"👤",label:"My Profile"}],
  recruiter:  [{id:"dashboard",icon:"📊",label:"Dashboard"},{id:"applicants",icon:"📇",label:"Applicants"},{id:"jobs",icon:"💼",label:"My Jobs"},{id:"candidates",icon:"🧑‍💼",label:"My Candidates"},{id:"assigned-candidates",icon:"🎯",label:"Assigned to Me"},{id:"talent-match",icon:"🎯",label:"Talent Match"},{id:"pipeline",icon:"🔄",label:"Pipeline"},{id:"talent-pool",icon:"🅿️",label:"Talent Pool"},{id:"interviews",icon:"📅",label:"Interviews"},{id:"offers",icon:"📄",label:"Offers"},{id:"onboarding",icon:"🎯",label:"Pre-boarding"},{id:"assessments",icon:"📝",label:"Assessments"},{id:"outreach",icon:"📣",label:"Outreach"},{id:"candidate-requests",icon:"📨",label:"Candidate Requests"},{id:"profile",icon:"👤",label:"My Profile"}],
  admin:      [{id:"analytics",icon:"📈",label:"Overview"},{id:"insights",icon:"🔍",label:"Insights"},{id:"applicants",icon:"📇",label:"Applicants"},{id:"job-approvals",icon:"✅",label:"Job Approvals"},{id:"candidates",icon:"👤",label:"Candidates"},{id:"outreach",icon:"📣",label:"Outreach"},{id:"assessments",icon:"📝",label:"Assessments"},{id:"onboarding",icon:"🎯",label:"Pre-boarding"},{id:"candidate-requests",icon:"📨",label:"Candidate Requests"},{id:"assigned-candidates",icon:"🎯",label:"Assignments"},{id:"recruiters",icon:"🧑‍💼",label:"Recruiters"},{id:"org-chart",icon:"🏢",label:"Org Chart"},{id:"jobs",icon:"💼",label:"All Jobs"},{id:"automation",icon:"⚡",label:"Automation"},{id:"custom-fields",icon:"🧩",label:"Custom Fields"},{id:"org-settings",icon:"⚙️",label:"Org Settings"},{id:"billing",icon:"💳",label:"Billing"},{id:"profile",icon:"👤",label:"My Profile"}],
  superadmin: [{id:"analytics",icon:"📈",label:"Overview"},{id:"candidates",icon:"👤",label:"Registered Users"},{id:"unregistered-candidates",icon:"🕵️",label:"Guest Applicants"},{id:"all-candidates",icon:"🗂️",label:"Candidate Database"},{id:"applicants",icon:"📄",label:"Application Records"},{id:"platform",icon:"🌐",label:"Platform"},{id:"organisations",icon:"🏢",label:"Organisations"},{id:"job-approvals",icon:"✅",label:"Job Approvals"},{id:"billing",icon:"💳",label:"Billing"},{id:"security",icon:"🛡️",label:"Security"},{id:"permissions",icon:"🔐",label:"Permissions"},{id:"import-candidates",icon:"📥",label:"Import & Assign"},{id:"recruiters",icon:"🧑‍💼",label:"Recruiters"},{id:"admins",icon:"🔑",label:"Admins"},{id:"jobs",icon:"💼",label:"All Jobs"},{id:"assessments",icon:"📝",label:"Assessments"},{id:"onboarding",icon:"🎯",label:"Pre-boarding"},{id:"bgv-tracker",icon:"🛡️",label:"BGV Tracker"},{id:"automation",icon:"⚡",label:"Automation"},{id:"customizations",icon:"⚙️",label:"Customizations"},{id:"outreach",icon:"📣",label:"Outreach"},{id:"contact-leads",icon:"📞",label:"Contact Enquiries"},{id:"candidate-requests",icon:"📨",label:"Candidate Requests"},{id:"playbooks",icon:"📚",label:"Playbooks"},{id:"blogs",icon:"✍️",label:"Blog Manager"},{id:"profile",icon:"👤",label:"My Profile"}],
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
  const [detail,   setDetail]   = React.useState(null);
  const [loading,  setLoading]  = React.useState(false);
  const btnRef                  = React.useRef(null);
  const [pos,         setPos]         = React.useState({ top: 0, left: 0 });
  const [lastRefresh, setLastRefresh] = React.useState(null);
  const navigate                      = useNavigate();
  const summaryFetched                = React.useRef(false);
  const readIds                       = React.useRef(new Set());
  const isAdminOrSA = userRole === 'super_admin' || userRole === 'admin';
  const [isMobile, setIsMobile]  = React.useState(() => window.innerWidth < 768);
  React.useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h, { passive: true });
    return () => window.removeEventListener('resize', h);
  }, []);

  // Admin-only: build a live feed from real current data (recent apps + smart alerts)
  const buildAdminFeed = React.useCallback(async () => {
    const items = [];

    // Recent applications — newest first
    try {
      const resp = await api.getApplications({ limit: 25 });
      const apps = Array.isArray(resp) ? resp : (Array.isArray(resp?.data) ? resp.data : []);
      [...apps]
        .sort((a, b) => new Date(b.createdAt || b.appliedAt || 0) - new Date(a.createdAt || a.appliedAt || 0))
        .forEach(a => {
          const cand  = a.candidateId || a.candidate || {};
          const job   = a.jobId || {};
          const rawId = a._id || a.id;
          const jobId = job._id || job.id || a.jobId;
          if (!rawId) return;
          const id = `live_app_${rawId}`;
          items.push({
            _id: id, type: 'application',
            title: 'New Application',
            body: `${cand.name || a.candidateName || 'Candidate'} applied for: ${job.title || a.jobTitle || 'a position'}`,
            createdAt: a.createdAt || a.appliedAt || new Date().toISOString(),
            read: readIds.current.has(id), live: true,
            link: jobId ? `/app/pipeline?jobId=${jobId}` : '/app/pipeline',
            metadata: { applicationId: String(rawId), candidateId: String(cand._id || cand.id || ''), jobId: String(jobId || '') },
          });
        });
    } catch {}

    // Smart alerts — stale jobs, stuck candidates, pending offers
    try {
      const alerts = await api.getSmartAlerts();
      (alerts?.pendingOffers || []).slice(0, 5).forEach(o => {
        const id = `live_offer_${o.id}`;
        items.push({ _id: id, type: 'offer', title: 'Offer Letter Pending',
          body: `${o.candidateName} — unsigned for ${o.daysPending} days`,
          createdAt: new Date().toISOString(), read: readIds.current.has(id), live: true,
          link: '/app/offers', metadata: { candidateId: String(o.id || '') } });
      });
      (alerts?.stuckCandidates || []).slice(0, 5).forEach(c => {
        const id = `live_stuck_${c.id}`;
        items.push({ _id: id, type: 'stage_change', title: 'Candidate Stuck in Pipeline',
          body: `${c.candidateName} stuck in ${c.stage} for ${c.daysStuck} days — ${c.jobTitle}`,
          createdAt: new Date().toISOString(), read: readIds.current.has(id), live: true,
          link: c.jobId ? `/app/pipeline?jobId=${c.jobId}` : '/app/pipeline',
          metadata: { candidateId: String(c.id || ''), jobId: String(c.jobId || '') } });
      });
      (alerts?.staleJobs || []).slice(0, 5).forEach(j => {
        const id = `live_stale_${j.id}`;
        items.push({ _id: id, type: 'system', title: 'Job Open Too Long',
          body: `${j.title} — open ${j.daysOpen} days with no hire`,
          createdAt: new Date().toISOString(), read: readIds.current.has(id), live: true,
          link: '/app/jobs', metadata: { jobId: String(j.id || '') } });
      });
    } catch {}

    return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, []);

  const load = React.useCallback(async () => {
    try {
      const d = await api.getNotifications();
      const raw = Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
      // Deduplicate by ID + keep locally-marked-read state across polls
      const seen = new Set();
      const merged = raw
        .filter(n => { const id = n._id || n.id; if (!id || seen.has(id)) return false; seen.add(id); return true; })
        .map(n => { const id = n._id || n.id; return readIds.current.has(id) ? { ...n, read: true } : n; });
      setNotifs(merged);
      setLastRefresh(new Date());
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
      const panelW = Math.min(380, window.innerWidth - 16);
      const left   = Math.max(8, Math.min(rect.left, window.innerWidth - panelW - 8));
      // On mobile, if panel would go off the bottom, show it above the button
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const maxH  = Math.min(520, window.innerHeight - 140);
      const top   = spaceBelow >= Math.min(300, maxH)
        ? rect.bottom + 8
        : Math.max(8, rect.top - Math.min(480, maxH) - 8);
      setPos({ top, left });
    }
    setOpen(true);

    // Admin: always build live feed from real data (bypasses stale stored notifications)
    if (userRole === 'admin') {
      setLoading(true);
      try {
        const feed = await buildAdminFeed();
        setNotifs(feed);
        setLastRefresh(new Date());
      } catch { await load(); }
      setLoading(false);
    // Super admin: auto-generate platform summary on first open
    } else if (userRole === 'super_admin' && !summaryFetched.current) {
      summaryFetched.current = true;
      setLoading(true);
      try {
        const fresh = await api.generatePlatformNotifications();
        if (Array.isArray(fresh) && fresh.length > 0) {
          const seen = new Set();
          const merged = fresh
            .filter(n => { const id = n._id || n.id; if (!id || seen.has(id)) return false; seen.add(id); return true; })
            .map(n => { const id = n._id || n.id; return readIds.current.has(id) ? { ...n, read: true } : n; });
          setNotifs(merged);
          setLastRefresh(new Date());
        } else {
          await load();
        }
      } catch { await load(); }
      setLoading(false);
    } else {
      await load();
    }
  };

  // Manual refresh — admin gets live feed rebuild, super_admin regenerates summary
  const refreshNotifs = React.useCallback(async () => {
    setLoading(true);
    try {
      if (userRole === 'admin') {
        const feed = await buildAdminFeed();
        setNotifs(feed);
        setLastRefresh(new Date());
      } else {
        const fresh = await api.generatePlatformNotifications();
        if (Array.isArray(fresh) && fresh.length > 0) {
          const seen = new Set();
          const merged = fresh
            .filter(n => { const id = n._id || n.id; if (!id || seen.has(id)) return false; seen.add(id); return true; })
            .map(n => { const id = n._id || n.id; return readIds.current.has(id) ? { ...n, read: true } : n; });
          setNotifs(merged);
          setLastRefresh(new Date());
        } else {
          await load();
        }
      }
    } catch { await load(); }
    setLoading(false);
  }, [load, buildAdminFeed, userRole]);

  const markOne  = async (id) => {
    if (!id) return;
    readIds.current.add(id);
    try {
      await api.markRead(id);
      setNotifs(p => p.map(n => (n._id === id || n.id === id) ? { ...n, read: true } : n));
    } catch {}
  };
  const markAll  = async () => {
    setNotifs(p => {
      p.forEach(n => { const id = n._id || n.id; if (id) readIds.current.add(id); });
      return p.map(n => ({ ...n, read: true }));
    });
    try { await api.markAllRead(); } catch {}
  };
  const clearAll = async () => {
    readIds.current.clear();
    try { await api.clearAllNotifications(); setNotifs([]); setOpen(false); } catch {}
  };

  const TYPE_MAP = {
    application: 'pipeline', stage_update: 'pipeline', stage_change: 'pipeline',
    interview: 'interviews', offer: 'offers', system: 'analytics',
    assessment: 'assessments', assessment_submitted: 'assessments', assessment_reviewed: 'assessments',
    job_approved: 'jobs', job_rejected: 'jobs',
    job_approval_request: 'job-approvals',
    job_assignment: 'pipeline',
    invite_interested: 'candidates', invite: 'analytics', mention: 'analytics'
  };
  const TYPE_ICONS  = {
    application:'📋', stage_update:'🔄', stage_change:'🔄', interview:'📅', offer:'🎉', system:'⚙️',
    assessment:'📝', assessment_submitted:'📊', assessment_reviewed:'⭐',
    job_approved:'✅', job_rejected:'❌', job_approval_request:'⏳', job_assignment:'💼',
    invite_interested:'🙋', invite:'📨', mention:'💬', task:'📌'
  };
  const TYPE_LABELS = {
    application:'Application', stage_update:'Stage Update', stage_change:'Stage Update', interview:'Interview', offer:'Offer', system:'System',
    assessment:'Assessment', assessment_submitted:'Assessment', assessment_reviewed:'Assessment Review',
    job_approved:'Approved', job_rejected:'Rejected', job_approval_request:'Approval Request', job_assignment:'Job Assignment',
    invite_interested:'Interest', invite:'Invitation', mention:'Mention', task:'Task'
  };

  // Open detail modal — mark read + store for display
  const openDetail = async (n) => {
    const nid = n._id || n.id;
    if (!n.read) {
      setNotifs(p => p.map(x => (x._id || x.id) === nid ? { ...x, read: true } : x));
      await markOne(nid);
    }
    setDetail(n);
  };

  // Navigate after viewing detail — resolve the best deep-link from notification data
  const goToDetail = (n) => {
    setDetail(null);
    setOpen(false);

    const meta  = n.metadata || n.data || {};
    const jobId = meta.jobId;

    // Build best possible link from metadata before falling back to stored link
    if (n.type === 'job_assignment' && jobId) {
      navigate(`/app/pipeline?jobId=${jobId}`);
      return;
    }
    if ((n.type === 'application' || n.type === 'stage_update' || n.type === 'stage_change') && jobId) {
      navigate(`/app/pipeline?jobId=${jobId}`);
      return;
    }
    if (n.type === 'offer') {
      navigate('/app/offers');
      return;
    }
    if (n.type === 'interview') {
      navigate('/app/interviews');
      return;
    }
    if ((n.type === 'assessment' || n.type === 'assessment_submitted' || n.type === 'assessment_reviewed')) {
      navigate('/app/assessments');
      return;
    }
    if (n.type === 'job_approved' || n.type === 'job_rejected') {
      navigate('/app/jobs');
      return;
    }
    if (n.type === 'job_approval_request') {
      navigate('/app/job-approvals');
      return;
    }

    // Prefer the stored link — normalize any legacy route prefixes before navigating
    if (n.link && n.link.trim()) {
      const raw = n.link.trim();
      if (raw.startsWith('http')) {
        window.open(raw, '_blank', 'noopener');
        return;
      }
      const normalized = raw
        .replace(/^\/recruiter\//, '/app/')
        .replace(/^\/admin\//, '/app/')
        .replace(/^\/hr\//, '/app/')
        .replace(/^\/client\//, '/app/')
        .replace(/^\/hiring_manager\//, '/app/')
        .replace(/^\/candidate\//, '/app/');
      navigate(normalized);
      return;
    }

    // Last resort: TYPE_MAP generic routing
    const candidateId = meta.candidateId;
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
    // Support both mouse and touch close-on-outside
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h, { passive: true });
    return () => {
      document.removeEventListener('mousedown', h);
      document.removeEventListener('touchstart', h);
    };
  }, [open]);

  const displayed = tab === 'unread' ? notifs.filter(n => !n.read) : notifs;
  const panelW    = Math.min(380, window.innerWidth - 24);

  const iconButtonSize = compact ? 36 : 40;

  return (
    <>
      {/* Detail drill-down modal */}
      {detail && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 100000, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 16 }}
          onClick={e => { if (e.target === e.currentTarget) setDetail(null); }}
        >
          <div style={{ background: '#fff', borderRadius: isMobile ? '24px 24px 0 0' : 20, width: '100%', maxWidth: isMobile ? '100%' : 460, maxHeight: isMobile ? '90dvh' : 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.35)', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: isMobile ? 'notifSlideUp 0.3s cubic-bezier(0.32,0.72,0,1) both' : 'none', paddingBottom: isMobile ? 'max(16px, env(safe-area-inset-bottom, 16px))' : 0 }}>
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
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
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
              <div style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
                <button
                  onClick={() => goToDetail(detail)}
                  style={{ flex: 1, padding: isMobile ? '15px' : '11px', background: 'linear-gradient(135deg,#0176D3,#0154A4)', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: isMobile ? 16 : 14, cursor: 'pointer', minHeight: 48 }}
                >
                  View Details →
                </button>
                <button
                  onClick={() => setDetail(null)}
                  style={{ padding: isMobile ? '14px' : '11px 18px', background: '#F8FAFF', border: '1.5px solid #E2E8F0', borderRadius: 12, color: '#374151', fontWeight: 600, fontSize: isMobile ? 15 : 14, cursor: 'pointer', minHeight: 48 }}
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
        <AppIcon name="bell" size={compact ? 16 : 18} />
        {unread > 0 && <span style={{ position: 'absolute', top: -2, right: -2, background: '#BA0517', color: '#fff', borderRadius: '50%', minWidth: 17, height: 17, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, padding: '0 3px' }}>{unread > 99 ? '99+' : unread}</span>}
      </button>

      {/* Notification panel */}
      {open && (
        <>
          {/* Backdrop — always shown on mobile, blocks interaction outside panel */}
          {isMobile && (
            <div
              data-notif-panel="true"
              onClick={() => setOpen(false)}
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(5,13,26,0.5)',
                backdropFilter: 'blur(2px)',
                zIndex: 99998,
                WebkitBackdropFilter: 'blur(2px)',
              }}
            />
          )}

          {/* Panel container */}
          {open && createPortal(
            <div
              data-notif-panel="true"
            style={isMobile ? {
              /* ── MOBILE: bottom-sheet ── */
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              width: '100vw',
              maxHeight: '75dvh',
              background: '#fff',
              borderRadius: '24px 24px 0 0',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
              zIndex: 10001,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'notifSlideUp 0.3s cubic-bezier(0.32,0.72,0,1) both',
              paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
              transform: 'translateZ(0)',
            } : {
              /* ── DESKTOP: floating dropdown ── */
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              width: panelW,
              maxHeight: 'min(520px, calc(100vh - 120px))',
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: 16,
              zIndex: 99999,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
          {/* Drag handle — mobile only */}
          {isMobile && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#D1D5DB' }} />
            </div>
          )}

          {/* Panel header */}
          <div style={{ padding: isMobile ? '8px 16px 0' : '13px 16px 0', flexShrink: 0, borderBottom: '1px solid #F3F2F2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ color: '#181818', fontWeight: 800, fontSize: isMobile ? 16 : 14 }}>
                🔔 Notifications
                {unread > 0 && <span style={{ background: '#BA0517', color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 11, marginLeft: 7, fontWeight: 700 }}>{unread} new</span>}
              </span>
              <div style={{ display: 'flex', gap: isMobile ? 12 : 8, alignItems: 'center' }}>
                {isAdminOrSA && (
                  <button
                    onClick={refreshNotifs}
                    title="Refresh notifications"
                    style={{ background: 'none', border: 'none', color: '#0176D3', fontSize: 12, cursor: 'pointer', fontWeight: 700, padding: '4px 8px', minHeight: 36 }}
                  >🔄</button>
                )}
                {unread > 0 && (
                  <button onClick={markAll}
                    style={{ background: 'none', border: 'none', color: '#0176D3', fontSize: 12, cursor: 'pointer', fontWeight: 700, padding: '4px 8px', minHeight: 36, whiteSpace: 'nowrap' }}>
                    ✓ Mark all
                  </button>
                )}
                <button onClick={() => setOpen(false)}
                  style={{ background: '#F3F4F6', border: 'none', color: '#374151', fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1, width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  ✕
                </button>
              </div>
            </div>
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 0 }}>
              {['unread', 'all'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ flex: isMobile ? 1 : 'none', background: 'none', border: 'none', cursor: 'pointer', color: tab === t ? '#0176D3' : '#706E6B', fontWeight: tab === t ? 700 : 500, fontSize: isMobile ? 14 : 12, padding: isMobile ? '10px 0' : '6px 14px 8px', borderBottom: tab === t ? '2.5px solid #0176D3' : '2px solid transparent', marginBottom: -1, transition: 'all 0.15s', textAlign: 'center', minHeight: isMobile ? 44 : 'auto' }}>
                  {t === 'unread' ? `Unread${unread > 0 ? ` (${unread})` : ''}` : `All (${notifs.length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Panel body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0', WebkitOverflowScrolling: 'touch' }}>
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
                {isAdminOrSA && (
                  <button
                    onClick={refreshNotifs}
                    style={{ marginTop: 14, padding: '8px 18px', background: 'linear-gradient(135deg,#0176D3,#0154A4)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                  >
                    🔄 Refresh Notifications
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Stale notifications warning — shown when newest notification is > 14 days old */}
                {(() => {
                  const newest = notifs.reduce((latest, n) => {
                    const t = new Date(n.createdAt || 0).getTime();
                    return t > latest ? t : latest;
                  }, 0);
                  const daysOld = newest ? Math.floor((Date.now() - newest) / 86400000) : null;
                  if (!daysOld || daysOld < 14) return null;
                  return (
                    <div style={{ margin: '8px 12px', padding: '10px 14px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 2 }}>
                          Notifications are {daysOld} days old
                        </div>
                        <div style={{ fontSize: 11, color: '#B45309', lineHeight: 1.5 }}>
                          Recent activity (stage changes, hires, interviews) is not appearing here. Your backend notification service may not be recording new events. Contact your system administrator.
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {displayed.map(n => (
                <div
                  key={n.id || n._id}
                  onClick={() => openDetail(n)}
                  style={{
                    padding: isMobile ? '14px 16px' : '11px 16px',
                    borderBottom: '1px solid #F3F2F2',
                    background: n.read ? '#FFFFFF' : 'rgba(1,118,211,0.05)',
                    cursor: 'pointer',
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    minHeight: isMobile ? 64 : 'auto',
                    WebkitTapHighlightColor: 'rgba(1,118,211,0.08)',
                  }}
                >
                  <div style={{ width: isMobile ? 42 : 36, height: isMobile ? 42 : 36, borderRadius: 12, background: n.read ? '#F3F4F6' : 'rgba(1,118,211,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 20 : 16, flexShrink: 0, marginTop: 1 }}>
                    {TYPE_ICONS[n.type] || '🔔'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                      <span style={{ color: n.read ? '#374151' : '#181818', fontSize: isMobile ? 14 : 12, fontWeight: n.read ? 500 : 700, lineHeight: 1.4, flex: 1 }}>{n.title}</span>
                      {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0176D3', flexShrink: 0, marginTop: 4 }} />}
                    </div>
                    {(n.body || n.message) && (
                      <div style={{ color: '#6B7280', fontSize: isMobile ? 13 : 11, lineHeight: 1.55, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {n.body || n.message}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ color: '#9CA3AF', fontSize: isMobile ? 12 : 10 }}>{timeAgo(n.createdAt)}</span>
                      {n.type && <span style={{ color: '#0176D3', fontSize: isMobile ? 12 : 10, background: 'rgba(1,118,211,0.08)', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>{TYPE_LABELS[n.type] || n.type}</span>}
                      {n.live && <span style={{ color: '#059669', fontSize: 9, background: 'rgba(5,150,105,0.1)', borderRadius: 4, padding: '1px 5px', fontWeight: 800, letterSpacing: 0.3 }}>LIVE</span>}
                      <span style={{ color: '#0176D3', fontSize: isMobile ? 12 : 10, marginLeft: 'auto', fontWeight: 700 }}>View →</span>
                    </div>
                  </div>
                </div>
              ))}
              </>
            )}
          </div>

          <div style={{ padding: isMobile ? '10px 16px' : '8px 16px', borderTop: '1px solid #F3F2F2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: '#FAFAFA', gap: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {notifs.length > 0 && (
                <span style={{ color: '#9CA3AF', fontSize: isMobile ? 12 : 10 }}>{notifs.length} total · {unread} unread</span>
              )}
              {lastRefresh && (
                <span style={{ color: '#CBD5E1', fontSize: 9, fontStyle: 'italic' }}>
                  Updated {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {isAdminOrSA && (
                <button onClick={refreshNotifs}
                  style={{ background: 'rgba(1,118,211,0.08)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 6, color: '#0176D3', fontSize: isMobile ? 12 : 10, cursor: 'pointer', padding: isMobile ? '6px 10px' : '3px 8px', fontWeight: 700, minHeight: isMobile ? 36 : 'auto' }}>
                  🔄 Refresh
                </button>
              )}
              {notifs.length > 0 && (
                <button onClick={clearAll}
                  style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: isMobile ? 12 : 10, cursor: 'pointer', padding: isMobile ? '6px 10px' : '3px 8px', minHeight: isMobile ? 36 : 'auto' }}>
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>, document.body)}
        </>
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
      <div style={{ padding: '16px 16px 14px', borderBottom: `1px solid ${sidebarLine}`, display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', minHeight: 38, maxHeight: 44, overflow: 'hidden', minWidth: 0, width: '100%', flexShrink: 0 }}>
          <Logo size="md" variant="full" theme="dark" customLogoUrl={orgLogo} style={{ maxWidth: '100%', minWidth: 0, overflow: 'hidden' }} />
        </div>
        <div style={{ color: sidebarMuted, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, width: '100%', flexShrink: 0 }}>{(user.role || '').replace('_', ' ').toUpperCase()}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, minHeight: 36, width: '100%' }}>
          <NotificationBell userRole={user?.role} compact />
          <button className="tn-app-icon-btn" onClick={() => setShowInbox?.(true)} title="Messages" aria-label="Messages" style={{ ...sidebarActionBtn, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <AppIcon name="message" size={16} />
            {unreadMsgs > 0 && <span style={{ position: 'absolute', top: 2, right: 2, background: '#ef4444', borderRadius: '50%', width: 12, height: 12, fontSize: 8, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadMsgs > 9 ? '9+' : unreadMsgs}</span>}
          </button>
          <button className="tn-app-icon-btn" onClick={() => setShowOnline?.(true)} title="Who's Online" aria-label="Who's Online" style={{ ...sidebarActionBtn, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}><AppIcon name="online" size={17} /></button>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {nav.map(n => (
          <NavLink key={n.id} to={`/app/${n.id}`} onClick={() => setMobileOpen?.(false)}
            data-label={n.label}
            data-tour-id={n.id}
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

// ── Impersonation Banner ───────────────────────────────────────────────────────
function ImpersonationBanner() {
  const checkImpersonation = () => {
    const backup = !!sessionStorage.getItem('tn_sa_backup');
    if (!backup) return false;
    // Cross-verify with the actual token payload to avoid "ghost" banners after logout
    try {
      const token = sessionStorage.getItem('tn_token');
      if (!token) return false;
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return !!payload.originalUserId;
    } catch (e) {
      return false;
    }
  };

  const [impersonating, setImpersonating] = useState(checkImpersonation);

  useEffect(() => {
    const check = () => setImpersonating(checkImpersonation());
    window.addEventListener('tn_impersonate_change', check);
    window.addEventListener('storage', check); // Handle cross-tab changes
    return () => {
      window.removeEventListener('tn_impersonate_change', check);
      window.removeEventListener('storage', check);
    };
  }, []);

  if (!impersonating) return null;

  const currentUser = (() => {
    try { return JSON.parse(sessionStorage.getItem('tn_user') || '{}'); } catch { return {}; }
  })();

  const handleExit = async () => {
    try {
      // 1. Call backend to restore the original SA session cookie
      const res = await api.stopImpersonate();
      
      // 2. Clear ALL auth state from sessionStorage to force a fresh restore on reload
      sessionStorage.removeItem('tn_impersonate_token');
      sessionStorage.removeItem('tn_sa_backup');
      sessionStorage.removeItem('tn_token');
      sessionStorage.removeItem('tn_user');
      
      // 3. Update local state with restored user data if returned (pre-emptive for smoother reload)
      if (res?.user) {
        sessionStorage.setItem('tn_user', JSON.stringify(res.user));
        setApiToken(res.token);
      }
      
      // 4. Hard reload to SA dashboard
      window.location.href = '/app/security';
    } catch (err) {
      console.error('Exit impersonation failed:', err);
      // Fallback: clear everything and go to login if API fails
      sessionStorage.clear();
      window.location.href = '/login';
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
      borderBottom: '2px solid #ef4444',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexShrink: 0,
      zIndex: 9999,
      flexWrap: 'wrap',
    }}>
      <span style={{ color: '#fef2f2', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ background: '#ef4444', borderRadius: '50%', width: 10, height: 10, display: 'inline-block', animation: 'pulse-dot 1.4s ease-in-out infinite' }} />
        Impersonating: <b style={{ color: '#fff' }}>{currentUser.name || currentUser.email || 'Unknown User'}</b>
        {currentUser.role && <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, color: '#fecaca', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{currentUser.role.replace('_', ' ')}</span>}
      </span>
      <button onClick={handleExit} style={{
        background: '#ef4444',
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: 8,
        color: '#fff',
        fontWeight: 800,
        fontSize: 12,
        padding: '7px 16px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        minHeight: 34,
        letterSpacing: '0.02em',
      }}>
        ✕ Exit Impersonation
      </button>
    </div>
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
    if (user.orgId || user.tenantId) {
      api.getMyOrg().then(org => {
        if (org?.logoUrl) setOrgLogo(org.logoUrl);
      }).catch(() => {});
    }
  }, [user.orgId, user.tenantId]);

  // Inject org brand colors as CSS variables so the whole app respects them
  useEffect(() => {
    if (!user.tenantId && !user.orgId) return;
    api.getCustomizations().then(r => {
      const bc = r?.data?.brandColors;
      if (!bc) return;
      const root = document.documentElement;
      if (bc.primary)   root.style.setProperty('--tn-blue',    bc.primary);
      if (bc.secondary) root.style.setProperty('--tn-navy',    bc.secondary);
      if (bc.accent)    root.style.setProperty('--tn-teal',    bc.accent);
      if (bc.bgCard)    root.style.setProperty('--tn-surface', bc.bgCard);
      if (bc.bgPage)    root.style.setProperty('--tn-off',     bc.bgPage);
    }).catch(() => {});
  }, [user.tenantId, user.orgId]);

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

  // Platform-wide real-time sync — dispatch a browser event so any page can
  // listen and refresh its data when a stage change happens anywhere in the tenant
  usePlatformSocket((data) => {
    window.dispatchEvent(new CustomEvent('tn:stageChanged', { detail: data }));
  });

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
        @keyframes pulse-dot { 0%,80%,100% { transform: scale(0.6); opacity: 0.4 } 40% { transform: scale(1); opacity: 1 } }
        ::-webkit-scrollbar { width: 4px; height: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: rgba(1,118,211,0.3); border-radius: 2px }
        .tn-app-icon-btn { aspect-ratio: 1 / 1; line-height: 1; place-items: center; overflow: hidden; }
        .tn-app-icon-btn svg { flex: 0 0 auto; }
      `}</style>

      {/* Impersonation Banner — visible on every page when SA is impersonating */}
      <ImpersonationBanner />

      {/* Offline Status */}
      {!online && (
        <div style={{ background: '#BA0517', color: '#fff', padding: '10px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, fontSize: 13, fontWeight: 700, zIndex: 10000, position: 'sticky', top: 0 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span>Connection Lost. You are currently offline. Changes may not be saved.</span>
        </div>
      )}

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
          <div className="tn-hamburger" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, background: '#032D60', borderRadius: 12, padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, width: '100%' }}>
              <button className="tn-app-icon-btn" onClick={() => setMobileOpen(true)} aria-label="Open navigation menu" style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1, minHeight: 40, minWidth: 40, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>☰</button>
              <div className="tn-hamburger-logo" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}><Logo size="sm" variant="full" theme="dark" customLogoUrl={customLogoUrl || orgLogo} /></div>
              <button className="tn-app-icon-btn" onClick={onLogout} title="Sign Out" aria-label="Sign Out" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: 8, padding: 0, cursor: 'pointer', fontSize: 16, minHeight: 40, minWidth: 40, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🚪</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, width: '100%' }}>
              <NotificationBell userRole={user?.role} />
              <button className="tn-app-icon-btn" onClick={() => { setShowInbox(true); setUnreadMsgs(0); }} title="Messages" aria-label="Messages" style={{ position: 'relative', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: 8, padding: 0, cursor: 'pointer', fontSize: 16, minHeight: 40, minWidth: 40, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AppIcon name="message" size={18} />
                {unreadMsgs > 0 && <span style={{ position: 'absolute', top: 4, right: 4, background: '#ef4444', borderRadius: '50%', width: 14, height: 14, fontSize: 9, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadMsgs > 9 ? '9+' : unreadMsgs}</span>}
              </button>
              <button className="tn-app-icon-btn" onClick={() => setShowOnline(true)} title="Who's Online" aria-label="Who's Online" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: 8, padding: 0, cursor: 'pointer', fontSize: 16, minHeight: 40, minWidth: 40, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
                <AppIcon name="online" size={18} />
              </button>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 10, minWidth: 10, fontSize: 10, color: online ? '#10B981' : '#BA0517', fontWeight: 600 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: online ? '#10B981' : '#BA0517', display: 'inline-block' }} />
              </span>
            </div>
          </div>

          <Suspense fallback={<PageLoader />}>
            <div key={window.location.pathname} className="tn-page-transition">
              <Outlet />
            </div>
          </Suspense>
        </div>
      </div>

      <QuickActionMenu user={user} />
      <CallManager user={user} />
    </div>
  );
}
