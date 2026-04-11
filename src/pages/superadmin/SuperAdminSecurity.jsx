import { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import Toast from '../../components/ui/Toast.jsx';
import { API_BASE_URL } from '../../api/config.js';
import { getToken, setToken, clearToken } from '../../api/client.js';
import { logAudit, getAuditLog } from '../../utils/audit.js';

const glass = { background: '#FFFFFF', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 16, padding: 24 };

const FEATURE_FLAGS = [
  { key: 'aiJobMatch',       label: 'AI Job Matching',        icon: '🤖', desc: 'Gemini-powered candidate-job matching' },
  { key: 'bulkEmail',        label: 'Bulk Email',             icon: '📧', desc: 'Send emails to multiple candidates' },
  { key: 'customPipeline',   label: 'Custom Pipeline Stages', icon: '🔄', desc: 'Configure org-level pipeline stages' },
  { key: 'apiAccess',        label: 'API Access',             icon: '🔌', desc: 'REST API access for integrations' },
  { key: 'whiteLabel',       label: 'White-Label Branding',   icon: '🎨', desc: 'Custom logo, colors, domain' },
  { key: 'analyticsExport',  label: 'Analytics CSV Export',   icon: '📊', desc: 'Export pipeline & hiring reports' },
  { key: 'advancedReports',  label: 'Advanced Reporting',     icon: '📈', desc: 'Time-to-hire, source analytics' },
  { key: 'jobApproval',      label: 'Job Approval Workflow',  icon: '✅', desc: 'Require admin approval before posting' },
  { key: 'screeningQ',       label: 'Screening Questions',    icon: '❓', desc: 'Attach questions to job applications' },
  { key: 'calendarSync',     label: 'Google Calendar Sync',   icon: '📅', desc: 'Sync interviews with Google Calendar' },
  { key: 'candidateRanking', label: 'AI Candidate Ranking',   icon: '⭐', desc: 'Auto-rank candidates by fit score' },
  { key: 'sso',              label: 'Single Sign-On (SSO)',   icon: '🔐', desc: 'SAML/OAuth enterprise SSO' },
];

const PLAN_ORDER  = ['free', 'trial', 'starter', 'growth', 'enterprise'];
const PLAN_COLORS = { free: '#64748b', trial: '#F59E0B', starter: '#0176D3', growth: '#014486', enterprise: '#7c3aed' };

const DEFAULT_FLAGS = {
  free:       { aiJobMatch: true,  bulkEmail: false, customPipeline: false, apiAccess: false, whiteLabel: false, analyticsExport: false, advancedReports: false, jobApproval: false, screeningQ: false, calendarSync: false, candidateRanking: false, sso: false },
  trial:      { aiJobMatch: true,  bulkEmail: true,  customPipeline: true,  apiAccess: false, whiteLabel: false, analyticsExport: true,  advancedReports: false, jobApproval: true,  screeningQ: true,  calendarSync: false, candidateRanking: true,  sso: false },
  starter:    { aiJobMatch: true,  bulkEmail: true,  customPipeline: true,  apiAccess: false, whiteLabel: false, analyticsExport: true,  advancedReports: true,  jobApproval: true,  screeningQ: true,  calendarSync: false, candidateRanking: true,  sso: false },
  growth:     { aiJobMatch: true,  bulkEmail: true,  customPipeline: true,  apiAccess: true,  whiteLabel: false, analyticsExport: true,  advancedReports: true,  jobApproval: true,  screeningQ: true,  calendarSync: true,  candidateRanking: true,  sso: false },
  enterprise: { aiJobMatch: true,  bulkEmail: true,  customPipeline: true,  apiAccess: true,  whiteLabel: true,  analyticsExport: true,  advancedReports: true,  jobApproval: true,  screeningQ: true,  calendarSync: true,  candidateRanking: true,  sso: true  },
};

const DEFAULT_SECURITY = {
  sessionTimeout: '7d',
  minPasswordLength: 8,
  require2FA: false,
  requireStrongPassword: true,
  ipWhitelist: '',
  maxLoginAttempts: 5,
  lockoutDuration: 30,
  allowedDomains: '',
  ssoEnabled: false,
  auditLogRetention: 90,
};

function Toggle({ checked, onChange, color = '#0176D3' }) {
  return (
    <div 
      onClick={() => onChange(!checked)}
      style={{ 
        width: 40, 
        height: 20, 
        borderRadius: 20, 
        background: checked ? color : '#E2E8F0', 
        cursor: 'pointer', 
        position: 'relative', 
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
        margin: '0 auto', 
        display: 'block',
        flexShrink: 0,
        boxShadow: checked ? `0 2px 8px ${color}40` : 'inset 0 1px 3px rgba(0,0,0,0.1)'
      }}
    >
      <div style={{ 
        position: 'absolute', 
        top: 2, 
        left: checked ? 22 : 2, 
        width: 16, 
        height: 16, 
        borderRadius: '50%', 
        background: '#fff', 
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }} />
    </div>
  );
}

// ── Audit Log (real events from localStorage) ─────────────────────────────
function AuditLogTab() {
  const [events, setEvents] = useState([]);
  const [levelFilter, setLevelFilter] = useState('all');

  const reload = () => setEvents(getAuditLog(20));
  useEffect(() => { reload(); }, []);

  const filtered = levelFilter === 'all' ? events : events.filter(e => e.level === levelFilter);
  const levelColor = { info: '#0176D3', warning: '#F59E0B', error: '#BA0517' };
  const roleColor  = { candidate: '#0176D3', recruiter: '#014486', admin: '#F59E0B', super_admin: '#7c3aed' };

  const exportCsv = () => {
    const rows = [['Timestamp','User','Role','Action','Resource','Detail','Level'], ...events.map(e => [e.time, e.user, e.role, e.action, e.resource, e.detail, e.level])];
    const csv = rows.map(r => r.map(v => `"${(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'audit_log.csv'; a.click();
  };

  return (
    <div style={glass}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ color: '#181818', fontSize: 15, fontWeight: 700, margin: 0 }}>Audit Log</h3>
          <p style={{ color: '#706E6B', fontSize: 12, margin: '3px 0 0' }}>Last {events.length} recorded events (most recent 20 shown)</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} style={{ padding: '6px 10px', background: '#F3F2F2', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, color: '#181818', fontSize: 12, outline: 'none' }}>
            <option value="all">All Levels</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
          <button onClick={reload} style={{ background: 'rgba(1,118,211,0.1)', border: '1px solid rgba(1,118,211,0.25)', borderRadius: 8, color: '#0176D3', fontSize: 12, fontWeight: 600, padding: '6px 12px', cursor: 'pointer' }}>↻ Refresh</button>
          {events.length > 0 && <button onClick={exportCsv} style={{ background: '#F3F2F2', border: '1px solid #DDDBDA', borderRadius: 8, color: '#706E6B', fontSize: 12, fontWeight: 600, padding: '6px 12px', cursor: 'pointer' }}>↓ CSV</button>}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#706E6B' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>No audit events yet</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Events are recorded when users log in, change settings, or perform key actions</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr>
                {['Timestamp','User','Role','Action','Resource','Detail'].map(h => (
                  <th key={h} style={{ textAlign: 'left', color: '#64748b', fontSize: 11, fontWeight: 700, padding: '0 0 12px 0', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr key={e.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)' }}>
                  <td style={{ color: '#64748b', fontSize: 11, padding: '9px 0', whiteSpace: 'nowrap' }}>{new Date(e.time).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td style={{ color: '#181818', fontSize: 12, padding: '9px 8px 9px 0', fontWeight: 500 }}>{e.user}</td>
                  <td style={{ padding: '9px 8px 9px 0' }}><span style={{ background: `${roleColor[e.role]||'#64748b'}20`, color: roleColor[e.role]||'#64748b', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{e.role}</span></td>
                  <td style={{ padding: '9px 8px 9px 0' }}><span style={{ background: `${levelColor[e.level]||'#0176D3'}15`, color: levelColor[e.level]||'#0176D3', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{e.action}</span></td>
                  <td style={{ color: '#706E6B', fontSize: 11, padding: '9px 8px 9px 0' }}>{e.resource}</td>
                  <td style={{ color: '#64748b', fontSize: 11, padding: '9px 0', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Impersonation ─────────────────────────────────────────────────────────
function ImpersonateTab({ users }) {
  const [search, setSearch]   = useState('');
  const [toast, setToast]     = useState('');
  const [loading, setLoading] = useState('');

  const isImpersonating = !!sessionStorage.getItem('tn_sa_backup');

  const filtered = (users || []).filter(u => u.role !== 'super_admin' && (
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  ));

  const roleColor = { candidate: '#0176D3', recruiter: '#014486', admin: '#F59E0B' };

  const handleImpersonate = async (u) => {
    if (!window.confirm(`⚠️ Impersonate "${u.name}" (${u.email})?\nRole: ${u.role}\n\nYou will be logged in as this user. Click "Exit Impersonation" in the top bar to return to your super admin session.`)) return;
    const targetId = u._id?.toString() || u.id;
    if (!targetId) { setToast('❌ Cannot impersonate: user has no valid ID'); return; }
    setLoading(targetId);
    try {
      const res = await api.impersonate(targetId);
      // Save only the user profile as backup (not the token — it can expire).
      // On exit, initAuth() uses the HTTP-only refresh cookie to restore the
      // super admin session cleanly without relying on a stale backup token.
      const backup = { user: sessionStorage.getItem('tn_user') };
      sessionStorage.setItem('tn_sa_backup', JSON.stringify(backup));
      setToken(res.token); // set impersonated user's token in memory
      sessionStorage.setItem('tn_user', JSON.stringify(res.user));
      logAudit('Impersonation Started', 'Auth', `Super admin impersonating ${u.name} (${u.role})`, 'warning');
      window.location.href = '/app';
    } catch (e) {
      setToast(`❌ ${e.message || 'Impersonation failed'}`);
    } finally {
      setLoading('');
    }
  };

  const handleExitImpersonation = () => {
    try {
      const backup = JSON.parse(sessionStorage.getItem('tn_sa_backup') || '{}');
      // Restore cached user profile so UI shows correct name after redirect
      if (backup.user) sessionStorage.setItem('tn_user', backup.user);
      // Clear impersonated token — initAuth() on App.jsx mount will silently
      // issue a fresh super admin token from the HTTP-only refresh cookie
      clearToken();
      sessionStorage.removeItem('tn_sa_backup');
      logAudit('Impersonation Ended', 'Auth', 'Returned to super admin session', 'info');
      window.location.href = '/app';
    } catch { window.location.href = '/app'; }
  };

  return (
    <div style={glass}>
      <h3 style={{ color: '#181818', fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>User Impersonation</h3>
      <p style={{ color: '#706E6B', fontSize: 12, margin: '0 0 16px' }}>Temporarily log in as any user to debug or provide support. All impersonation sessions are logged.</p>

      {isImpersonating && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#F59E0B', fontWeight: 600, fontSize: 13 }}>⚠️ Active impersonation session detected</span>
          <button onClick={handleExitImpersonation} style={{ background: '#F59E0B', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, padding: '6px 14px', cursor: 'pointer' }}>
            Exit Impersonation →
          </button>
        </div>
      )}

      {toast && <div style={{ background: 'rgba(186,5,23,0.08)', border: '1px solid rgba(186,5,23,0.25)', borderRadius: 10, padding: '10px 14px', color: '#BA0517', fontSize: 12, marginBottom: 16 }}>{toast}</div>}

      <input
        placeholder="Search by name or email…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', padding: '10px 14px', background: '#F3F2F2', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 10, color: '#181818', fontSize: 13, outline: 'none', marginBottom: 16, boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.slice(0, 15).map(u => {
          const uid = u._id?.toString() || u.id || '';
          return (
          <div key={uid || u.email} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', background: '#FAFAFA', borderRadius: 10, border: '1px solid #F3F2F2' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${roleColor[u.role]||'#64748b'}20`, border: `1px solid ${roleColor[u.role]||'#64748b'}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: roleColor[u.role]||'#64748b', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
              {(u.name||'?')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#181818', fontSize: 13, fontWeight: 600 }}>{u.name}</div>
              <div style={{ color: '#64748b', fontSize: 11, marginTop: 1 }}>{u.email}</div>
            </div>
            <span style={{ background: `${roleColor[u.role]||'#64748b'}20`, color: roleColor[u.role]||'#64748b', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{u.role}</span>
            <button
              onClick={() => handleImpersonate(u)}
              disabled={!!loading}
              style={{ background: loading === uid ? 'rgba(1,118,211,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${loading === uid ? 'rgba(1,118,211,0.3)' : 'rgba(245,158,11,0.3)'}`, borderRadius: 8, color: loading === uid ? '#0176D3' : '#F59E0B', fontSize: 11, fontWeight: 700, padding: '6px 14px', cursor: loading ? 'not-allowed' : 'pointer', flexShrink: 0, whiteSpace: 'nowrap', opacity: loading && loading !== uid ? 0.5 : 1 }}
            >
              {loading === uid ? '⏳ Switching…' : '👤 Login As'}
            </button>
          </div>
          );
        })}
        {filtered.length === 0 && <p style={{ color: '#9E9D9B', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No users found.</p>}
      </div>
    </div>
  );
}

// ── Security Settings (localStorage persisted) ────────────────────────────
function SecurityTab() {
  const [settings, setSettings] = useState(() => {
    try { return { ...DEFAULT_SECURITY, ...JSON.parse(localStorage.getItem('tn_security_settings') || '{}') }; } catch { return DEFAULT_SECURITY; }
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.savePlatformSecurity(settings);
      localStorage.setItem('tn_security_settings', JSON.stringify(settings));
      logAudit('Security Settings Updated', 'Security', `Session timeout: ${settings.sessionTimeout}, 2FA: ${settings.require2FA}`, 'warning');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setToast(`❌ Failed to save: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const testSetting = (key) => {
    let msg = '';
    if (key === 'ipWhitelist') {
      const ips = settings.ipWhitelist.trim().split('\n').filter(Boolean);
      const invalid = ips.filter(ip => !/^[\d./]+$/.test(ip.trim()));
      msg = invalid.length ? `❌ Invalid IP(s): ${invalid.join(', ')}` : ips.length ? `✅ ${ips.length} valid IP range(s)` : '⚪ Empty (all IPs allowed)';
    } else if (key === 'allowedDomains') {
      const domains = settings.allowedDomains.split(',').map(d => d.trim()).filter(Boolean);
      const invalid = domains.filter(d => !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(d));
      msg = invalid.length ? `❌ Invalid domain(s): ${invalid.join(', ')}` : domains.length ? `✅ ${domains.length} domain restriction(s) set` : '⚪ Empty (all domains allowed)';
    } else if (key === 'sessionTimeout') {
      msg = `✅ Sessions will expire after: ${settings.sessionTimeout}`;
    } else if (key === 'maxLoginAttempts') {
      msg = `✅ Lock after ${settings.maxLoginAttempts} failed attempts`;
    } else if (key === 'lockoutDuration') {
      msg = `✅ Account locked for ${settings.lockoutDuration} minutes`;
    } else if (key === 'minPasswordLength') {
      msg = `✅ Minimum ${settings.minPasswordLength} characters required`;
    } else if (key === 'require2FA') {
      msg = settings.require2FA ? '✅ 2FA enforcement is ON' : '⚪ 2FA is optional';
    } else if (key === 'requireStrongPassword') {
      msg = settings.requireStrongPassword ? '✅ Strong passwords enforced' : '⚪ Basic password policy';
    } else if (key === 'ssoEnabled') {
      msg = settings.ssoEnabled ? '✅ SSO is enabled (configure SAML in org settings)' : '⚪ SSO disabled';
    } else {
      msg = `✅ Value: ${settings[key]}`;
    }
    setToast(msg);
  };

  const S = (key, val) => setSettings(p => ({ ...p, [key]: val }));

  const toggleRow = [
    { key: 'require2FA',           label: 'Require Two-Factor Authentication (2FA)', desc: 'All users must set up 2FA on next login' },
    { key: 'requireStrongPassword', label: 'Enforce Strong Passwords',               desc: 'Min 8 chars, uppercase, number, symbol' },
    { key: 'ssoEnabled',           label: 'Enable SSO (Enterprise)',                desc: 'Allow login via SAML/OAuth provider' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Toast msg={toast} onClose={() => setToast('')} />
      <div style={glass}>
        <h3 style={{ color: '#181818', fontSize: 15, fontWeight: 700, margin: '0 0 20px' }}>Session & Authentication</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {[
            { key: 'sessionTimeout',   label: 'Session Timeout',              type: 'select', opts: [['1h','1 Hour'],['8h','8 Hours'],['24h','24 Hours'],['7d','7 Days'],['30d','30 Days']] },
            { key: 'maxLoginAttempts', label: 'Max Login Attempts',           type: 'number', min: 3, max: 10 },
            { key: 'lockoutDuration',  label: 'Lockout Duration (minutes)',   type: 'number', min: 5, max: 120 },
            { key: 'minPasswordLength',label: 'Min Password Length',          type: 'number', min: 6, max: 24 },
          ].map(f => (
            <div key={f.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <label style={{ color: '#706E6B', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px' }}>{f.label.toUpperCase()}</label>
              </div>
              {f.type === 'select' ? (
                <select value={settings[f.key]} onChange={e => S(f.key, e.target.value)} style={{ width: '100%', padding: '9px 12px', background: '#F3F2F2', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 10, color: '#181818', fontSize: 13, outline: 'none' }}>
                  {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ) : (
                <input type="number" value={settings[f.key]} min={f.min} max={f.max} onChange={e => S(f.key, +e.target.value)} style={{ width: '100%', padding: '9px 12px', background: '#F3F2F2', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 10, color: '#181818', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
          {toggleRow.map(t => (
            <div key={t.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 10, background: settings[t.key] ? 'rgba(1,118,211,0.04)' : 'transparent', border: `1px solid ${settings[t.key] ? 'rgba(1,118,211,0.15)' : '#F3F2F2'}`, transition: 'all 0.2s' }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#181818', fontSize: 13, fontWeight: 600 }}>{t.label}</div>
                <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{t.desc}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 16 }}>
                <Toggle checked={settings[t.key]} onChange={v => S(t.key, v)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={glass}>
        <h3 style={{ color: '#181818', fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>Access Control</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <label style={{ color: '#706E6B', fontSize: 11, fontWeight: 700 }}>IP WHITELIST</label>
              <span style={{ color: '#64748b', fontSize: 10, fontWeight: 400 }}>(one per line, empty = allow all)</span>
            </div>
            <textarea value={settings.ipWhitelist} onChange={e => S('ipWhitelist', e.target.value)} placeholder={"192.168.1.0/24\n10.0.0.0/8"} rows={3} style={{ width: '100%', padding: '10px 12px', background: '#F3F2F2', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 10, color: '#181818', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'monospace' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <label style={{ color: '#706E6B', fontSize: 11, fontWeight: 700 }}>ALLOWED EMAIL DOMAINS</label>
              <span style={{ color: '#64748b', fontSize: 10 }}>(restrict registration)</span>
            </div>
            <input value={settings.allowedDomains} onChange={e => S('allowedDomains', e.target.value)} placeholder="example.com, company.org" style={{ width: '100%', padding: '10px 12px', background: '#F3F2F2', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 10, color: '#181818', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ color: '#706E6B', fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6 }}>AUDIT LOG RETENTION (days)</label>
            <input type="number" value={settings.auditLogRetention} min={30} max={365} onChange={e => S('auditLogRetention', +e.target.value)} style={{ width: 120, padding: '10px 12px', background: '#F3F2F2', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 10, color: '#181818', fontSize: 13, outline: 'none' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button onClick={() => { setSettings(DEFAULT_SECURITY); }} style={{ background: '#F3F2F2', border: '1px solid #DDDBDA', borderRadius: 10, color: '#706E6B', fontSize: 14, fontWeight: 600, padding: '12px 24px', cursor: 'pointer' }}>
          Reset to Defaults
        </button>
        <button onClick={handleSave} disabled={saving} style={{ background: saved ? 'rgba(34,197,94,0.15)' : '#0176D3', border: saved ? '1px solid rgba(34,197,94,0.4)' : 'none', borderRadius: 10, color: saved ? '#22c55e' : '#fff', fontSize: 14, fontWeight: 700, padding: '12px 28px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'all 0.2s' }}>
          {saving ? 'Saving…' : saved ? '✓ Settings Saved to Platform' : 'Save Security Settings'}
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function SuperAdminSecurity() {
  const [tab, setTab]       = useState('flags');
  const [flags, setFlags]   = useState(() => {
    try { return { ...DEFAULT_FLAGS, ...JSON.parse(localStorage.getItem('tn_feature_flags') || '{}') }; } catch { return DEFAULT_FLAGS; }
  });
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [orgs, setOrgs]     = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE_URL}/users?limit=1000`, {
        headers: { 'Authorization': `Bearer ${getToken()}`, 'X-Requested-With': 'TalentNest' },
        credentials: 'include',
      }).then(r => r.json()).then(r => r.data || r).catch(() => []),
      api.getOrgs().catch(() => []),
      api.getPlatformConfig().catch(() => ({})),
    ]).then(([u, o, config]) => {
      setUsers(Array.isArray(u) ? u : (u.data || []));
      setOrgs(Array.isArray(o) ? o : (o.data || []));
      // If backend has security settings, use them (overrides localStorage)
      if (config?.security) {
        localStorage.setItem('tn_security_settings', JSON.stringify(config.security));
      }
      if (config?.featureFlags) {
        localStorage.setItem('tn_feature_flags', JSON.stringify(config.featureFlags));
        setFlags(prev => ({ ...prev, ...config.featureFlags }));
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleFlagChange = (plan, key, val) => {
    setFlags(prev => ({ ...prev, [plan]: { ...prev[plan], [key]: val } }));
    setSaved(false);
  };

  const handleSaveFlags = async () => {
    setSaving(true);
    try {
      if (selectedOrg) {
        const org = orgs.find(o => o.id === selectedOrg);
        const currentSettings = org?.settings || {};
        await api.updateOrg(selectedOrg, { settings: { ...currentSettings, featureFlags: flags } });
      } else {
        await api.savePlatformFlags(flags);
        localStorage.setItem('tn_feature_flags', JSON.stringify(flags));
      }
      logAudit('Feature Flags Updated', 'Platform Settings', `Flags saved${selectedOrg ? ' for org' : ' as platform defaults'}`, 'warning');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setToast(`❌ Failed to save flags: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const TABS = [
    { id: 'flags',       label: '🚩 Feature Flags' },
    { id: 'audit',       label: '📋 Audit Log' },
    { id: 'impersonate', label: '👤 Impersonate' },
    { id: 'security',    label: '🔐 Security' },
  ];

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: '#181818', fontSize: 24, fontWeight: 800, margin: 0 }}>Security & Control</h1>
        <p style={{ color: '#706E6B', fontSize: 13, marginTop: 4 }}>Feature flags, audit logs, impersonation and platform security</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 28, background: '#FFFFFF', borderRadius: 12, padding: 4, width: 'fit-content', border: '1px solid #F3F2F2', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: tab === t.id ? '#0176D3' : 'transparent', color: tab === t.id ? '#fff' : '#706E6B', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Feature Flags */}
      {tab === 'flags' && (
        <div>
          {orgs.length > 0 && (
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ color: '#706E6B', fontSize: 12, fontWeight: 600 }}>View flags for org:</label>
              <select value={selectedOrg} onChange={e => setSelectedOrg(e.target.value)} style={{ padding: '7px 12px', background: '#F3F2F2', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, color: '#181818', fontSize: 13, outline: 'none' }}>
                <option value="">Platform defaults</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              {selectedOrg && <span style={{ color: '#706E6B', fontSize: 11 }}>Showing platform defaults (org overrides coming soon)</span>}
            </div>
          )}
          <div style={glass}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ color: '#181818', fontSize: 15, fontWeight: 700, margin: 0 }}>Feature Flags by Plan</h3>
                <p style={{ color: '#706E6B', fontSize: 12, margin: '4px 0 0' }}>Control which features are available on each subscription tier. Changes are saved to the platform.</p>
              </div>
              <button onClick={handleSaveFlags} disabled={saving} style={{ background: saved ? 'rgba(34,197,94,0.15)' : '#0176D3', border: saved ? '1px solid rgba(34,197,94,0.4)' : 'none', borderRadius: 10, color: saved ? '#22c55e' : '#fff', fontSize: 14, fontWeight: 700, padding: '12px 24px', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : saved ? '✓ Saved to Platform' : 'Save Flags'}
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', color: '#64748b', fontSize: 11, fontWeight: 700, padding: '0 0 14px', letterSpacing: '0.5px', width: '30%' }}>FEATURE</th>
                    {PLAN_ORDER.map(p => (
                      <th key={p} style={{ textAlign: 'center', padding: '0 0 14px 8px' }}>
                        <span style={{ background: `${PLAN_COLORS[p]}25`, color: PLAN_COLORS[p], border: `1px solid ${PLAN_COLORS[p]}50`, borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700 }}>{p.toUpperCase()}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_FLAGS.map((f, i) => (
                    <tr key={f.key} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)', transition: 'background 0.15s' }}>
                      <td style={{ padding: '10px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{f.icon}</span>
                          <div>
                            <div style={{ color: '#181818', fontSize: 12, fontWeight: 600 }}>{f.label}</div>
                            <div style={{ color: '#64748b', fontSize: 10, marginTop: 1 }}>{f.desc}</div>
                          </div>
                        </div>
                      </td>
                      {PLAN_ORDER.map(p => (
                        <td key={p} style={{ textAlign: 'center', padding: '10px 8px' }}>
                          <Toggle checked={flags[p]?.[f.key] || false} onChange={v => handleFlagChange(p, f.key, v)} color={PLAN_COLORS[p]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'audit'       && <AuditLogTab />}
      {tab === 'impersonate' && !loading && <ImpersonateTab users={users} />}
      {tab === 'impersonate' && loading  && <div style={{ textAlign: 'center', color: '#706E6B', padding: 40 }}>Loading users…</div>}
      {tab === 'security'    && <SecurityTab />}
    </div>
  );
}
