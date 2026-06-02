import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../api/api.js';
import { card } from '../../constants/styles.js';
import Toast from '../../components/ui/Toast.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

// ── Tiny helpers ─────────────────────────────────────────────────────────────
const btnP = { background: 'linear-gradient(135deg,#0176D3,#014486)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const btnG = { background: '#F1F5F9', color: '#374151', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const inp  = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13, boxSizing: 'border-box', outline: 'none' };

function KPI({ icon, label, value, color = '#0176D3', sub }) {
  return (
    <div style={{ ...card, textAlign: 'center', padding: '18px 12px', flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value ?? <span style={{ color: '#9CA3AF', fontSize: 18 }}>—</span>}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Bar({ label, value, max, color = '#0176D3' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, color: '#6B7280' }}>{value.toLocaleString()} ({pct}%)</span>
      </div>
      <div style={{ background: '#F3F4F6', borderRadius: 4, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

// ── Tab: Command Center ───────────────────────────────────────────────────────
function CommandTab({ counts, health, orgs, onNavigate, onImpersonate }) {
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [healthData, setHealthData] = useState(health);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [impersonating, setImpersonating] = useState(false);

  const checkHealth = async () => {
    setLoadingHealth(true);
    try { setHealthData(await api.getSystemHealth()); }
    catch { }
    setLoadingHealth(false);
  };

  const globalSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const [users, jobs, orgsRes] = await Promise.all([
        api.getUsers({ search: searchQ, limit: 5, platform: true }).catch(() => ({ data: [] })),
        api.getJobs({ search: searchQ, limit: 5, platform: true }).catch(() => ({ data: [] })),
        api.getOrgs().catch(() => []),
      ]);
      const uList = Array.isArray(users) ? users : (users?.data || []);
      const jList = Array.isArray(jobs) ? jobs : (jobs?.data || jobs?.jobs || []);
      const oList = (Array.isArray(orgsRes) ? orgsRes : (orgsRes?.data || [])).filter(o =>
        o.name?.toLowerCase().includes(searchQ.toLowerCase()) || o.slug?.toLowerCase().includes(searchQ.toLowerCase())
      ).slice(0, 5);
      setSearchResults({ users: uList.slice(0, 5), jobs: jList.slice(0, 5), orgs: oList });
    } catch {}
    setSearching(false);
  };

  const doImpersonate = async (userId) => {
    setImpersonating(true);
    try {
      const r = await api.impersonate(userId);
      if (r?.token) {
        const { setToken } = await import('../../api/client.js');
        setToken(r.token);
        sessionStorage.setItem('tn_token', r.token);
        sessionStorage.setItem('tn_user', JSON.stringify(r.user || {}));
        window.location.href = '/app/dashboard';
      }
    } catch (e) { alert('Impersonation failed: ' + e.message); }
    setImpersonating(false);
  };

  const quickActions = [
    { icon: '🏢', label: 'Create Org', action: () => onNavigate?.('create-org') },
    { icon: '📋', label: 'Job Approvals', action: () => onNavigate?.('job-approvals') },
    { icon: '📥', label: 'Import Candidates', action: () => onNavigate?.('import-candidates') },
    { icon: '📝', label: 'Audit Logs', action: () => onNavigate?.('audit-logs') },
    { icon: '🛡️', label: 'BGV Tracker', action: () => onNavigate?.('bgv-tracker') },
    { icon: '📊', label: 'Analytics', action: () => onNavigate?.('analytics') },
  ];

  return (
    <div>
      {/* Quick Search */}
      <div style={{ ...card, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>🔍 Global Search</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: searchResults ? 16 : 0 }}>
          <input style={{ ...inp, flex: 1 }} value={searchQ} onChange={e => setSearchQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && globalSearch()}
            placeholder="Search users, jobs, organisations…" />
          <button style={btnP} onClick={globalSearch} disabled={searching}>
            {searching ? '…' : 'Search'}
          </button>
        </div>
        {searchResults && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 12 }}>
            {searchResults.users.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase' }}>Users ({searchResults.users.length})</div>
                {searchResults.users.map(u => (
                  <div key={u._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: '#F8FAFC', borderRadius: 6, marginBottom: 4 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{u.name}</div>
                      <div style={{ fontSize: 10, color: '#9CA3AF' }}>{u.email} · {u.role}</div>
                    </div>
                    <button onClick={() => doImpersonate(u._id || u.id)} disabled={impersonating}
                      style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', color: '#0176D3', fontWeight: 600 }}>
                      Impersonate
                    </button>
                  </div>
                ))}
              </div>
            )}
            {searchResults.jobs.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase' }}>Jobs ({searchResults.jobs.length})</div>
                {searchResults.jobs.map(j => (
                  <div key={j._id} style={{ padding: '6px 8px', background: '#F8FAFC', borderRadius: 6, marginBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{j.title}</div>
                    <div style={{ fontSize: 10, color: '#9CA3AF' }}>{j.company || j.companyName} · {j.status}</div>
                  </div>
                ))}
              </div>
            )}
            {searchResults.orgs.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase' }}>Orgs ({searchResults.orgs.length})</div>
                {searchResults.orgs.map(o => (
                  <div key={o._id} style={{ padding: '6px 8px', background: '#F8FAFC', borderRadius: 6, marginBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{o.name}</div>
                    <div style={{ fontSize: 10, color: '#9CA3AF' }}>{o.plan} · {o.slug}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ ...card, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>⚡ Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
          {quickActions.map(a => (
            <button key={a.label} onClick={a.action} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 8px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#0176D3'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#E2E8F0'}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{a.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{a.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* System Health */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>💚 System Health</h3>
          <button style={btnG} onClick={checkHealth} disabled={loadingHealth}>
            {loadingHealth ? '⏳ Checking…' : '🔄 Refresh'}
          </button>
        </div>
        {healthData ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 10 }}>
            {[
              { label: 'Database', status: healthData.db?.status || 'ok', latency: healthData.db?.latencyMs },
              { label: 'Email Service', status: healthData.email?.status || 'ok' },
              { label: 'Memory', status: healthData.memory?.status || 'ok', detail: healthData.memory ? `${Math.round(healthData.memory.usedMB)}MB / ${Math.round(healthData.memory.totalMB)}MB` : null },
              { label: 'API', status: healthData.api?.status || 'ok', detail: healthData.api ? `${healthData.api.latencyMs}ms` : null },
            ].map(h => (
              <div key={h.label} style={{ background: h.status === 'ok' ? '#F0FDF4' : '#FEF2F2', borderRadius: 8, padding: '10px 12px', border: `1px solid ${h.status === 'ok' ? '#BBF7D0' : '#FECACA'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: h.status === 'ok' ? '#16A34A' : '#DC2626', display: 'inline-block', animation: h.status === 'ok' ? 'pulse 2s infinite' : 'none' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: h.status === 'ok' ? '#166534' : '#DC2626' }}>{h.label}</span>
                </div>
                {h.latency && <div style={{ fontSize: 10, color: '#6B7280' }}>{h.latency}ms</div>}
                {h.detail  && <div style={{ fontSize: 10, color: '#6B7280' }}>{h.detail}</div>}
              </div>
            ))}
          </div>
        ) : (
          <button style={btnG} onClick={checkHealth}>Check System Health</button>
        )}
      </div>

      {/* Recent orgs */}
      {orgs.length > 0 && (
        <div style={{ ...card }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>🏢 Recent Organisations</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['Name', 'Plan', 'Status', 'Created', 'Action'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...orgs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8).map((o, i) => (
                  <tr key={o._id} style={{ background: i % 2 === 0 ? '#fff' : '#F9FAFB' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{o.name}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ background: { free: '#F3F4F6', trial: '#FEF3C7', starter: '#EFF6FF', growth: '#F0FDF4', enterprise: '#F5F3FF' }[o.plan] || '#F3F4F6', color: { free: '#6B7280', trial: '#92400E', starter: '#1D4ED8', growth: '#166534', enterprise: '#6D28D9' }[o.plan] || '#6B7280', padding: '2px 7px', borderRadius: 4, fontWeight: 700, fontSize: 10, textTransform: 'capitalize' }}>{o.plan || 'free'}</span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ color: o.isActive !== false ? '#16A34A' : '#DC2626', fontSize: 11, fontWeight: 700 }}>{o.isActive !== false ? '● Active' : '● Inactive'}</span>
                    </td>
                    <td style={{ padding: '8px 10px', color: '#9CA3AF' }}>{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <button onClick={() => onNavigate?.('organisations')} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer', color: '#0176D3', fontWeight: 600 }}>Manage</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

// ── Tab: Broadcast Studio ─────────────────────────────────────────────────────
const TEMPLATES = {
  announcement: { emoji: '📢', label: 'Announcement', bg: 'linear-gradient(135deg,#032D60,#0176D3)', desc: 'General platform news and updates' },
  warning      : { emoji: '⚠️', label: 'Warning',       bg: 'linear-gradient(135deg,#92400E,#B45309)', desc: 'Maintenance, downtime, urgent notices' },
  celebration  : { emoji: '🎉', label: 'Celebration',   bg: 'linear-gradient(135deg,#065F46,#059669)', desc: 'Milestones, achievements, good news' },
  update       : { emoji: '🔄', label: 'Feature Update', bg: 'linear-gradient(135deg,#3730A3,#6D28D9)', desc: 'New features, changes to the platform' },
  info         : { emoji: 'ℹ️', label: 'Information',    bg: 'linear-gradient(135deg,#0E7490,#0284C7)', desc: 'FYI notices and general information' },
};

const ROLE_OPTIONS = [
  { value: 'all',       label: 'Everyone', desc: 'Admins + Recruiters + Candidates', icon: '🌐' },
  { value: 'admin',     label: 'Admins',   desc: 'Org administrators only',          icon: '🔑' },
  { value: 'recruiter', label: 'Recruiters', desc: 'All recruiters',                 icon: '🧑‍💼' },
  { value: 'candidate', label: 'Candidates', desc: 'Registered candidates',          icon: '👤' },
];

function BroadcastStudio({ onToast }) {
  const [form, setForm] = useState({ subject: '', message: '', templateStyle: 'announcement', targetRoles: ['admin'], sendEmail: true });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const tpl = TEMPLATES[form.templateStyle];

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleRole = (r) => {
    if (r === 'all') { sf('targetRoles', ['all']); return; }
    setForm(p => {
      const prev = p.targetRoles.filter(x => x !== 'all');
      return { ...p, targetRoles: prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r] };
    });
  };

  const send = async () => {
    if (!form.subject.trim() || !form.message.trim()) { onToast('❌ Subject and message are required.'); return; }
    setSending(true);
    try {
      const r = await api.broadcastAnnouncement({
        subject: form.subject, message: form.message,
        targetRoles: form.targetRoles, templateStyle: form.templateStyle, sendEmail: form.sendEmail,
      });
      setResult(r?.data || r);
      onToast(`✅ Broadcast sent to ${r?.data?.total || 0} users`);
    } catch (e) { onToast('❌ ' + e.message); }
    setSending(false);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
      {/* Left: compose */}
      <div>
        {/* Template style */}
        <div style={{ ...card, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>1. Choose Template Style</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
            {Object.entries(TEMPLATES).map(([key, t]) => (
              <button key={key} onClick={() => sf('templateStyle', key)} style={{ background: form.templateStyle === key ? '#EFF6FF' : '#F8FAFC', border: `2px solid ${form.templateStyle === key ? '#0176D3' : '#E2E8F0'}`, borderRadius: 10, padding: '10px 8px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{t.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: form.templateStyle === key ? '#0176D3' : '#374151' }}>{t.label}</div>
                <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Target audience */}
        <div style={{ ...card, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>2. Target Audience</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: 8 }}>
            {ROLE_OPTIONS.map(r => {
              const active = form.targetRoles.includes(r.value) || (r.value === 'all' && form.targetRoles.includes('all'));
              return (
                <button key={r.value} onClick={() => toggleRole(r.value)} style={{ background: active ? '#EFF6FF' : '#F8FAFC', border: `2px solid ${active ? '#0176D3' : '#E2E8F0'}`, borderRadius: 10, padding: '10px 8px', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, marginBottom: 3 }}>{r.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: active ? '#0176D3' : '#374151' }}>{r.label}</div>
                  <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2 }}>{r.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Compose */}
        <div style={{ ...card, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>3. Compose Message</h3>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Subject / Title *</label>
            <input style={inp} value={form.subject} onChange={e => sf('subject', e.target.value)} placeholder="e.g. Scheduled maintenance on Sunday 2–4 AM" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Message *</label>
            <textarea style={{ ...inp, minHeight: 120, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
              value={form.message} onChange={e => sf('message', e.target.value)}
              placeholder="Write your message here…" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#374151', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.sendEmail} onChange={e => sf('sendEmail', e.target.checked)} style={{ accentColor: '#0176D3' }} />
            Also send email to admins
          </label>
        </div>

        {result && (
          <div style={{ ...card, background: '#F0FDF4', border: '1px solid #BBF7D0', marginBottom: 16 }}>
            <p style={{ margin: 0, fontWeight: 700, color: '#166534' }}>✅ Broadcast Sent Successfully!</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#374151' }}>
              In-app notifications: <strong>{result.notificationsSent}</strong> ·
              Emails: <strong>{result.emailSent}</strong> ·
              Total reached: <strong>{result.total}</strong>
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnG} onClick={() => setShowPreview(p => !p)}>{showPreview ? 'Hide Preview' : '👁️ Preview'}</button>
          <button style={btnP} onClick={send} disabled={sending || !form.subject.trim() || !form.message.trim()}>
            {sending ? '⏳ Sending…' : `📢 Send Broadcast`}
          </button>
        </div>
      </div>

      {/* Right: preview */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase' }}>Live Preview</div>
        <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #E2E8F0' }}>
          <div style={{ background: tpl.bg, padding: '20px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 22 }}>{tpl.emoji}</span>
              <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 800 }}>{tpl.label}</span>
            </div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, lineHeight: 1.3 }}>
              {form.subject || <span style={{ opacity: 0.5 }}>Subject / Title…</span>}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 4 }}>From Platform Admin · {new Date().toLocaleDateString()}</div>
          </div>
          <div style={{ padding: '16px 18px', background: '#F8FAFC' }}>
            <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap', minHeight: 60 }}>
              {form.message || <span style={{ color: '#9CA3AF' }}>Message body…</span>}
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 6 }}>
              <div style={{ background: '#E2E8F0', borderRadius: 8, padding: '6px 12px', fontSize: 11, color: '#374151', fontWeight: 600 }}>Got it! ✓</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 11, color: '#9CA3AF', lineHeight: 1.5 }}>
          Users will see this as a modal when they open the platform. It stays until dismissed.
        </div>

        {form.targetRoles.length > 0 && (
          <div style={{ ...card, marginTop: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Sending to:</div>
            {form.targetRoles.map(r => (
              <div key={r} style={{ fontSize: 11, color: '#6B7280', marginBottom: 3 }}>
                {ROLE_OPTIONS.find(o => o.value === r)?.icon} {ROLE_OPTIONS.find(o => o.value === r)?.label || r}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab: Org Intelligence ─────────────────────────────────────────────────────
function OrgIntelligence({ orgs, orgHealth }) {
  const [sortBy, setSortBy] = useState('name');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  const sorted = [...orgs]
    .filter(o => {
      if (filterPlan !== 'all' && o.plan !== filterPlan) return false;
      if (filterStatus === 'active' && o.isActive === false) return false;
      if (filterStatus === 'inactive' && o.isActive !== false) return false;
      if (search && !o.name?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'plan') return (a.plan || '').localeCompare(b.plan || '');
      if (sortBy === 'created') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      return 0;
    });

  const planCounts = orgs.reduce((acc, o) => { acc[o.plan || 'free'] = (acc[o.plan || 'free'] || 0) + 1; return acc; }, {});
  const PLAN_COLORS = { free: '#9CA3AF', trial: '#F59E0B', starter: '#0176D3', growth: '#059669', enterprise: '#7C3AED' };

  return (
    <div>
      {/* Plan distribution */}
      <div style={{ ...card, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>📊 Plan Distribution</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          {Object.entries(planCounts).map(([plan, count]) => (
            <div key={plan} style={{ flex: 1, minWidth: 100, textAlign: 'center', background: '#F8FAFC', borderRadius: 10, padding: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: PLAN_COLORS[plan] || '#6B7280' }}>{count}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'capitalize' }}>{plan}</div>
            </div>
          ))}
        </div>
        {Object.entries(planCounts).map(([plan, count]) => (
          <Bar key={plan} label={plan.charAt(0).toUpperCase() + plan.slice(1)} value={count} max={orgs.length} color={PLAN_COLORS[plan] || '#6B7280'} />
        ))}
      </div>

      {/* Org health scorecard */}
      {orgHealth.length > 0 && (
        <div style={{ ...card, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>💪 Org Health Scorecard</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['Organisation', 'Active Jobs', 'Applications', 'Hires', 'Health Score'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orgHealth.slice(0, 10).map((o, i) => {
                  const score = Math.min(100, Math.round(((o.activeJobs || 0) * 5 + (o.totalApplications || 0) * 0.5 + (o.hiredCount || 0) * 10)));
                  const color = score >= 70 ? '#16A34A' : score >= 40 ? '#F59E0B' : '#DC2626';
                  return (
                    <tr key={o._id || i} style={{ background: i % 2 === 0 ? '#fff' : '#F9FAFB' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{o.name}</td>
                      <td style={{ padding: '8px 10px' }}>{o.activeJobs || 0}</td>
                      <td style={{ padding: '8px 10px' }}>{o.totalApplications?.toLocaleString() || 0}</td>
                      <td style={{ padding: '8px 10px' }}>{o.hiredCount || 0}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, background: '#F3F4F6', borderRadius: 3, height: 6 }}>
                            <div style={{ width: `${score}%`, background: color, height: '100%', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 800, color, minWidth: 28, textAlign: 'right' }}>{score}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Org list with filters */}
      <div style={{ ...card }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, flex: 1 }}>🏢 All Organisations ({sorted.length})</h3>
          <input style={{ ...inp, width: 180 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" />
          <select style={{ ...inp, width: 'auto' }} value={filterPlan} onChange={e => setFilterPlan(e.target.value)}>
            <option value="all">All plans</option>
            {['free','trial','starter','growth','enterprise'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select style={{ ...inp, width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select style={{ ...inp, width: 'auto' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="created">Newest first</option>
            <option value="name">Name A–Z</option>
            <option value="plan">By plan</option>
          </select>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                {['Name', 'Slug', 'Plan', 'Status', 'Created'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((o, i) => (
                <tr key={o._id || i} style={{ background: i % 2 === 0 ? '#fff' : '#F9FAFB' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>{o.name}</td>
                  <td style={{ padding: '8px 10px', color: '#9CA3AF' }}>{o.slug}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ background: '#F3F4F6', color: PLAN_COLORS[o.plan] || '#6B7280', padding: '2px 7px', borderRadius: 4, fontWeight: 700, fontSize: 10, textTransform: 'capitalize' }}>{o.plan || 'free'}</span>
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ color: o.isActive !== false ? '#16A34A' : '#DC2626', fontSize: 11, fontWeight: 700 }}>{o.isActive !== false ? '● Active' : '● Inactive'}</span>
                  </td>
                  <td style={{ padding: '8px 10px', color: '#9CA3AF' }}>{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sorted.length === 0 && <p style={{ textAlign: 'center', color: '#9CA3AF', padding: 24 }}>No organisations match the filter.</p>}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Revenue Intelligence ─────────────────────────────────────────────────
function RevenueIntelligence({ revenue, orgs }) {
  const PLAN_PRICES = { free: 0, trial: 0, starter: 2999, growth: 7999, enterprise: 19999 };

  const mrr = orgs.reduce((sum, o) => sum + (PLAN_PRICES[o.plan] || 0), 0);
  const arr  = mrr * 12;

  const planRevenue = ['free','trial','starter','growth','enterprise'].map(p => ({
    plan: p, count: orgs.filter(o => o.plan === p).length,
    revenue: orgs.filter(o => o.plan === p).length * PLAN_PRICES[p],
  }));

  const maxRev = Math.max(...planRevenue.map(p => p.revenue), 1);

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ ...card, flex: 1, minWidth: 160, textAlign: 'center', padding: '20px 12px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>MRR</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#0176D3' }}>₹{mrr.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Monthly Recurring Revenue</div>
        </div>
        <div style={{ ...card, flex: 1, minWidth: 160, textAlign: 'center', padding: '20px 12px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>ARR</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#059669' }}>₹{arr.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Annual Recurring Revenue</div>
        </div>
        <div style={{ ...card, flex: 1, minWidth: 160, textAlign: 'center', padding: '20px 12px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Paying Orgs</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#7C3AED' }}>{orgs.filter(o => (PLAN_PRICES[o.plan] || 0) > 0).length}</div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Out of {orgs.length} total</div>
        </div>
        <div style={{ ...card, flex: 1, minWidth: 160, textAlign: 'center', padding: '20px 12px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>ARPU</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#F59E0B' }}>₹{orgs.length > 0 ? Math.round(mrr / orgs.length).toLocaleString() : 0}</div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Avg Revenue Per Org</div>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>💰 Revenue by Plan</h3>
        {planRevenue.map(p => p.revenue > 0 ? (
          <div key={p.plan} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>{p.plan} ({p.count} orgs)</span>
              <span style={{ fontSize: 12, color: '#6B7280' }}>₹{p.revenue.toLocaleString()}/mo</span>
            </div>
            <div style={{ background: '#F3F4F6', borderRadius: 4, height: 10, overflow: 'hidden' }}>
              <div style={{ width: `${(p.revenue / maxRev) * 100}%`, background: 'linear-gradient(90deg,#0176D3,#00C2CB)', height: '100%', borderRadius: 4 }} />
            </div>
          </div>
        ) : null)}
      </div>

      {revenue && Array.isArray(revenue.monthlyTrend) && revenue.monthlyTrend.length > 0 && (
        <div style={{ ...card }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>📈 Monthly Revenue Trend</h3>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 80 }}>
            {revenue.monthlyTrend.map((m, i) => {
              const maxVal = Math.max(...revenue.monthlyTrend.map(x => x.value || 0), 1);
              const h = Math.max(((m.value || 0) / maxVal) * 80, 4);
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 600 }}>₹{(m.value || 0).toLocaleString()}</div>
                  <div style={{ width: '100%', height: h, background: 'linear-gradient(180deg,#0176D3,#0EA5E9)', borderRadius: '4px 4px 0 0' }} />
                  <div style={{ fontSize: 9, color: '#9CA3AF', textAlign: 'center', wordBreak: 'break-word' }}>{m.label || ''}</div>
                </div>
              );
            })}
          </div>
          {(revenue.totalPayments > 0 || revenue.avgPayment > 0) && (
            <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
              {revenue.totalPayments > 0 && <div style={{ background: '#F0FDF4', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}><span style={{ fontWeight: 700 }}>Total Payments:</span> {revenue.totalPayments}</div>}
              {revenue.avgPayment > 0 && <div style={{ background: '#EFF6FF', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}><span style={{ fontWeight: 700 }}>Avg Payment:</span> ₹{revenue.avgPayment?.toLocaleString()}</div>}
            </div>
          )}
        </div>
      )}

      <div style={{ ...card, marginTop: 20, background: '#FFF9F0', border: '1px solid #FDE68A' }}>
        <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#92400E' }}>💡 Revenue Insights</h4>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#374151', lineHeight: 1.8 }}>
          <li>Upgrade {orgs.filter(o => o.plan === 'free' || o.plan === 'trial').length} free/trial orgs to Starter to add ₹{(orgs.filter(o => o.plan === 'free' || o.plan === 'trial').length * PLAN_PRICES.starter).toLocaleString()}/mo</li>
          <li>If 20% of Starter orgs upgrade to Growth: +₹{(Math.round(orgs.filter(o => o.plan === 'starter').length * 0.2) * (PLAN_PRICES.growth - PLAN_PRICES.starter)).toLocaleString()}/mo</li>
          <li>ARR at current trajectory: ₹{arr.toLocaleString()}/year</li>
        </ul>
      </div>
    </div>
  );
}

// ── Tab: Platform Analytics ───────────────────────────────────────────────────
function PlatformAnalytics({ counts, orgs }) {
  const activeOrgs   = orgs.filter(o => o.isActive !== false).length;
  const inactiveOrgs = orgs.length - activeOrgs;

  const monthlyOrgs = (() => {
    const buckets = {};
    orgs.forEach(o => {
      if (!o.createdAt) return;
      const key = new Date(o.createdAt).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      buckets[key] = (buckets[key] || 0) + 1;
    });
    return Object.entries(buckets).slice(-12);
  })();
  const maxMonth = Math.max(...monthlyOrgs.map(([, v]) => v), 1);

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <KPI icon="🏢" label="Total Orgs"       value={counts.orgs}  color="#0176D3" />
        <KPI icon="👥" label="Total Users"       value={counts.users ? counts.users.toLocaleString() : '—'} color="#F59E0B" />
        <KPI icon="💼" label="Total Jobs"        value={counts.jobs ? counts.jobs.toLocaleString() : '—'}  color="#7C3AED" />
        <KPI icon="📋" label="Total Applications" value={counts.apps ? counts.apps.toLocaleString() : '—'} color="#059669" />
      </div>

      {/* Org growth chart */}
      {monthlyOrgs.length > 0 && (
        <div style={{ ...card, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>📈 Org Growth (by sign-up month)</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100, overflowX: 'auto', paddingBottom: 4 }}>
            {monthlyOrgs.map(([month, val]) => (
              <div key={month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 40 }}>
                <span style={{ fontSize: 9, color: '#374151', fontWeight: 700 }}>{val}</span>
                <div title={`${month}: ${val} orgs`} style={{ width: 30, background: 'linear-gradient(180deg,#0176D3,#00C2CB)', borderRadius: '3px 3px 0 0', height: `${Math.max(4, (val / maxMonth) * 80)}px`, transition: 'height 0.4s ease' }} />
                <span style={{ fontSize: 8, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.2 }}>{month}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ ...card }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>🏢 Org Status</h3>
          <Bar label="Active" value={activeOrgs} max={orgs.length} color="#16A34A" />
          <Bar label="Inactive" value={inactiveOrgs} max={orgs.length} color="#DC2626" />
        </div>
        <div style={{ ...card }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700 }}>📊 Key Ratios</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Users per Org',   value: orgs.length > 0 ? (counts.users / orgs.length).toFixed(1) : '—' },
              { label: 'Jobs per Org',    value: orgs.length > 0 ? (counts.jobs / orgs.length).toFixed(1) : '—' },
              { label: 'Apps per Job',    value: counts.jobs > 0 ? (counts.apps / counts.jobs).toFixed(1) : '—' },
              { label: 'Active Org Rate', value: orgs.length > 0 ? `${Math.round((activeOrgs/orgs.length)*100)}%` : '—' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F3F4F6' }}>
                <span style={{ fontSize: 12, color: '#374151' }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#0176D3' }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'command',    icon: '⚡', label: 'Command Center' },
  { id: 'broadcast',  icon: '📢', label: 'Broadcast Studio' },
  { id: 'orgs',       icon: '🏢', label: 'Org Intelligence' },
  { id: 'revenue',    icon: '💰', label: 'Revenue Insights' },
  { id: 'analytics',  icon: '📊', label: 'Platform Analytics' },
];

export default function SuperAdminCommandCenter({ onNavigate }) {
  const [tab, setTab]         = useState('command');
  const [toast, setToast]     = useState('');
  const [loading, setLoading] = useState(true);
  const [counts, setCounts]   = useState({ orgs: 0, users: 0, jobs: 0, apps: 0 });
  const [orgs, setOrgs]       = useState([]);
  const [orgHealth, setOrgHealth] = useState([]);
  const [revenue, setRevenue]     = useState(null);
  const [health, setHealth]       = useState(null);

  useEffect(() => {
    Promise.all([
      api.getOrgs().catch(() => []),
      api.getUserCount().catch(() => 0),
      api.getJobs({ limit: 1, platform: true }).then(r => r?.pagination?.total ?? 0).catch(() => 0),
      api.getApplications({ limit: 1, platform: true }).then(r => r?.pagination?.total ?? 0).catch(() => 0),
      api.getOrgHealth().catch(() => ({ data: [] })),
      api.getPlatformRevenue().catch(() => null),
    ]).then(([o, uCount, jCount, aCount, oh, rev]) => {
      const orgList = Array.isArray(o) ? o : (o?.data || []);
      setOrgs(orgList);
      setCounts({
        orgs : orgList.length,
        users: typeof uCount === 'number' ? uCount : (uCount?.total || 0),
        jobs : typeof jCount === 'number' ? jCount : 0,
        apps : typeof aCount === 'number' ? aCount : 0,
      });
      setOrgHealth(Array.isArray(oh?.data) ? oh.data : []);
      setRevenue(rev?.data || null);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}><Spinner /></div>;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Toast msg={toast} onClose={() => setToast('')} />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>⚡ Command Center</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>Full platform control — search, broadcast, analytics, and revenue in one place.</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, overflowX: 'auto', paddingBottom: 2 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '9px 16px', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 13,
            cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
            background: tab === t.id ? 'linear-gradient(135deg,#0176D3,#014486)' : '#F1F5F9',
            color: tab === t.id ? '#fff' : '#374151',
            boxShadow: tab === t.id ? '0 4px 12px rgba(1,118,211,0.25)' : 'none',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'command'   && <CommandTab counts={counts} health={health} orgs={orgs} onNavigate={onNavigate} />}
      {tab === 'broadcast' && <BroadcastStudio onToast={setToast} />}
      {tab === 'orgs'      && <OrgIntelligence orgs={orgs} orgHealth={orgHealth} />}
      {tab === 'revenue'   && <RevenueIntelligence revenue={revenue} orgs={orgs} />}
      {tab === 'analytics' && <PlatformAnalytics counts={counts} orgs={orgs} />}
    </div>
  );
}
