import { useState, useEffect, useCallback } from 'react';
import Toast from '../../components/ui/Toast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { btnG } from '../../constants/styles.js';
import { api } from '../../api/api.js';

// ── Shared helpers ─────────────────────────────────────────────────────────────
function timeAgo(d) {
  if (!d) return '—';
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function KpiCard({ icon, value, label, color, bg, active, onClick }) {
  return (
    <button onClick={onClick}
      style={{ background: active ? bg : '#fff', border: `1.5px solid ${active ? color : '#e8ecf0'}`,
        borderRadius: 14, padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
        transition: 'all 0.18s', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', flex: '1 1 120px' }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ color, fontSize: 24, fontWeight: 800 }}>{value}</div>
      <div style={{ color: '#6b7280', fontSize: 11, fontWeight: 600, marginTop: 2 }}>{label}</div>
    </button>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ position: 'relative', flex: '1 1 160px', minWidth: 140 }}>
      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 13 }}>🔍</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: 20, border: `1.5px solid ${value ? '#0176D3' : '#e2e8f0'}`,
          background: '#f8fafc', color: '#181818', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
    </div>
  );
}

function Pill({ children, active, color = '#0176D3', onClick }) {
  return (
    <button onClick={onClick}
      style={{ padding: '7px 16px', borderRadius: 20, border: `1.5px solid ${active ? color : '#e2e8f0'}`,
        background: active ? color : '#fff', color: active ? '#fff' : '#374151',
        fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer', outline: 'none',
        transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
      {children}
    </button>
  );
}

// ── Tab 1: Invite Outreach ─────────────────────────────────────────────────────
const INVITE_STATUS = {
  sent:       { label: 'Sent',       color: '#6b7280', bg: '#f3f4f6', icon: '📨' },
  opened:     { label: 'Opened',     color: '#f59e0b', bg: '#fffbeb', icon: '👁' },
  interested: { label: 'Interested', color: '#22c55e', bg: '#f0fdf4', icon: '✅' },
  declined:   { label: 'Declined',   color: '#ef4444', bg: '#fef2f2', icon: '❌' },
  failed:     { label: 'Failed',     color: '#dc2626', bg: '#fff1f2', icon: '🚫' },
};

function InviteTab({ setToast }) {
  const [invites, setInvites]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatus] = useState('');
  const [jobFilter, setJob]       = useState('');
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [resending, setResending] = useState({});
  const PAGE_SIZE = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getInvites();
      const raw = Array.isArray(res) ? res : (res?.data || []);
      setInvites(raw.map(i => ({ ...i, id: i.id || String(i._id || '') })));
    } catch { setInvites([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const allJobs = [...new Set(invites.map(i => i.jobTitle).filter(Boolean))].sort();

  const filtered = invites.filter(i => {
    if (statusFilter && i.status !== statusFilter) return false;
    if (jobFilter && i.jobTitle !== jobFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!i.candidateName?.toLowerCase().includes(q) && !i.candidateEmail?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const pages     = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stat = (key) => invites.filter(i => i.status === key).length;
  const delivered = invites.filter(i => i.status !== 'failed').length;
  const openRate  = delivered ? Math.round((stat('opened') + stat('interested') + stat('declined')) / delivered * 100) : 0;
  const intRate   = delivered ? Math.round(stat('interested') / delivered * 100) : 0;

  const markStatus = async (inv, status) => {
    try {
      await api.updateInviteStatus(inv.id, status);
      setInvites(prev => prev.map(i => i.id === inv.id ? { ...i, status, respondedAt: new Date().toISOString() } : i));
      setToast(`✅ Marked as ${status}`);
    } catch (e) { setToast(`❌ ${e.message}`); }
  };

  const doResend = async (inv) => {
    setResending(r => ({ ...r, [inv.id]: true }));
    try {
      await api.resendInvite(inv.id);
      setToast(`✅ Resent to ${inv.candidateEmail}`);
      setInvites(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'sent', emailError: null } : i));
    } catch (e) { setToast(`❌ ${e.message}`); }
    finally { setResending(r => ({ ...r, [inv.id]: false })); }
  };

  const delInvite = async (id) => {
    if (!confirm('Delete this invite record?')) return;
    try { await api.deleteInvite(id); setToast('✅ Deleted'); load(); } catch (e) { setToast(`❌ ${e.message}`); }
  };

  return (
    <div>
      {/* KPI row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        {Object.entries(INVITE_STATUS).map(([key, s]) => (
          <KpiCard key={key} icon={s.icon} value={stat(key)} label={s.label} color={s.color} bg={s.bg}
            active={statusFilter === key} onClick={() => { setStatus(statusFilter === key ? '' : key); setPage(1); }} />
        ))}
        <KpiCard icon="📊" value={`${intRate}%`} label="Interest Rate" color="#0176D3" bg="#eff6ff" active={statusFilter === 'interested'} onClick={() => { setStatus(statusFilter === 'interested' ? '' : 'interested'); setPage(1); }} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, background: '#fff', borderRadius: 14, border: '1px solid #e8ecf0', padding: '12px 16px' }}>
        <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search candidate name or email…" />
        <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }}
          style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${statusFilter ? '#0176D3' : '#e2e8f0'}`,
            background: statusFilter ? '#0176D3' : '#fff', color: statusFilter ? '#fff' : '#374151',
            fontSize: 13, cursor: 'pointer', outline: 'none', appearance: 'none' }}>
          <option value="">All Statuses</option>
          {Object.entries(INVITE_STATUS).map(([k, s]) => <option key={k} value={k}>{s.icon} {s.label}</option>)}
        </select>
        {allJobs.length > 0 && (
          <select value={jobFilter} onChange={e => { setJob(e.target.value); setPage(1); }}
            style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${jobFilter ? '#0176D3' : '#e2e8f0'}`,
              background: jobFilter ? '#0176D3' : '#fff', color: jobFilter ? '#fff' : '#374151',
              fontSize: 13, cursor: 'pointer', outline: 'none', appearance: 'none', maxWidth: 220 }}>
            <option value="">All Jobs</option>
            {allJobs.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
        )}
        {(statusFilter || jobFilter || search) && (
          <button onClick={() => { setStatus(''); setJob(''); setSearch(''); setPage(1); }}
            style={{ background: 'none', border: 'none', color: '#BA0517', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>✕ Clear</button>
        )}
        <span style={{ marginLeft: 'auto', color: '#6b7280', fontSize: 12, alignSelf: 'center' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        <button onClick={load} style={{ ...btnG, fontSize: 12, padding: '6px 14px' }}>↻ Refresh</button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <p style={{ fontSize: 14 }}>{invites.length === 0 ? 'No invites sent yet.' : 'No invites match your filters.'}</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf0', overflowX: 'auto', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ minWidth: 780 }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1.2fr 1fr minmax(170px,auto)', gap: 10,
              padding: '10px 20px', background: '#f8fafc', borderBottom: '1px solid #e8ecf0',
              fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px' }}>
              {['CANDIDATE', 'JOB', 'TYPE', 'STATUS', 'SENT BY', 'SENT', ''].map(h => <span key={h}>{h}</span>)}
            </div>
            {paginated.map((inv, idx) => {
              const s = INVITE_STATUS[inv.status] || INVITE_STATUS.sent;
              const isFailed = inv.status === 'failed';
              const isShare  = inv.type === 'job_share';
              return (
                <div key={inv.id} style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1.2fr 1fr minmax(170px,auto)', gap: 10,
                    padding: '13px 20px', alignItems: 'center',
                    background: isFailed ? '#fff8f8' : 'transparent', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = isFailed ? '#fff1f2' : '#fafbfc'}
                    onMouseLeave={e => e.currentTarget.style.background = isFailed ? '#fff8f8' : 'transparent'}>
                    {/* Candidate */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: isFailed ? '#dc2626' : isShare ? '#7c3aed' : '#0176D3',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>
                        {(inv.candidateName || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#181818', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {inv.candidateName || inv.candidateEmail?.split('@')[0] || '—'}
                        </div>
                        <div style={{ color: '#9ca3af', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {inv.candidateEmail || '—'}
                        </div>
                      </div>
                    </div>
                    {/* Job */}
                    <div style={{ color: '#374151', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={inv.jobTitle || '—'}>
                      {inv.jobTitle || '—'}
                    </div>
                    {/* Type */}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: isShare ? '#f5f3ff' : '#eff6ff', color: isShare ? '#7c3aed' : '#1d4ed8',
                      border: `1px solid ${isShare ? '#ddd6fe' : '#bfdbfe'}`,
                      borderRadius: 20, padding: '2px 9px', fontSize: 10, fontWeight: 700 }}>
                      {isShare ? '📣 Share' : '✉️ Invite'}
                    </span>
                    {/* Status */}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: s.bg, color: s.color, border: `1px solid ${s.color}30`,
                      borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                      {s.icon} {s.label}
                    </span>
                    {/* Sent By */}
                    <div style={{ color: '#374151', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inv.sentByName || inv.sentBy?.name || 'System'}
                    </div>
                    {/* Sent */}
                    <div style={{ color: '#6b7280', fontSize: 12 }}>{timeAgo(inv.sentAt)}</div>
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {['sent', 'opened', 'failed'].includes(inv.status) && (
                        <button onClick={() => markStatus(inv, 'interested')}
                          style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '5px 9px', fontSize: 11, cursor: 'pointer', color: '#22c55e', fontWeight: 700 }}>✅ Interested</button>
                      )}
                      {['sent', 'opened', 'failed'].includes(inv.status) && (
                        <button onClick={() => markStatus(inv, 'declined')}
                          style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '5px 9px', fontSize: 11, cursor: 'pointer', color: '#ef4444', fontWeight: 700 }}>✕ Declined</button>
                      )}
                      <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/invite/${inv.token}`).catch(()=>{}); setToast('✅ Invite link copied!'); }}
                        style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '5px 9px', fontSize: 11, cursor: 'pointer', color: '#374151' }}>🔗</button>
                      <button onClick={() => delInvite(inv.id)}
                        style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, padding: '5px 9px', fontSize: 11, cursor: 'pointer', color: '#ef4444' }}>🗑</button>
                    </div>
                  </div>
                  {/* Failed error + resend */}
                  {isFailed && (
                    <div style={{ margin: '0 20px 10px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#dc2626', fontFamily: 'monospace', lineHeight: 1.5 }}>
                        ⚠️ {inv.emailError || 'Delivery failed — click Resend to retry'}
                      </div>
                      <button onClick={() => doResend(inv)} disabled={resending[inv.id]}
                        style={{ padding: '7px 14px', borderRadius: 8, background: resending[inv.id] ? '#e2e8f0' : '#0176D3',
                          color: resending[inv.id] ? '#9ca3af' : '#fff', border: 'none', fontSize: 12, fontWeight: 700,
                          cursor: resending[inv.id] ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {resending[inv.id] ? '⏳…' : '🔄 Resend'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ ...btnG, padding: '6px 14px', opacity: page === 1 ? 0.4 : 1 }}>‹ Prev</button>
          <span style={{ color: '#6b7280', fontSize: 13, alignSelf: 'center' }}>Page {page} of {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} style={{ ...btnG, padding: '6px 14px', opacity: page === pages ? 0.4 : 1 }}>Next ›</button>
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Mail Queue (Email Delivery Logs) ────────────────────────────────────
const MAIL_STATUS = {
  sent:   { bg: '#dcfce7', color: '#15803d', label: '✅ Sent' },
  failed: { bg: '#fee2e2', color: '#dc2626', label: '❌ Failed' },
};
const PROVIDER_LABEL = { resend: '⚡ Resend', smtp: '📨 SMTP', dev: '🖥 Dev' };

function MailTab({ setToast }) {
  const [logs,     setLogs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('all');
  const [search,   setSearch]   = useState('');
  const [resending, setResending] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (search.trim()) params.set('search', search.trim());
      const data = await api.getEmailLogs(params.toString());
      setLogs(Array.isArray(data) ? data : (data?.data || []));
    } catch (e) { setToast('⚠️ ' + e.message); }
    setLoading(false);
  }, [filter, search]);

  useEffect(() => { load(); }, [filter]);

  const handleResend = async (log) => {
    setResending(r => ({ ...r, [log.id]: true }));
    try {
      await api.resendEmail(log.id);
      setToast(`✅ Resent to ${log.to}`);
      setLogs(prev => prev.map(l => l.id === log.id ? { ...l, status: 'sent', retryCount: (l.retryCount || 0) + 1, error: null } : l));
    } catch (e) { setToast('❌ Resend failed: ' + e.message); }
    finally { setResending(r => ({ ...r, [log.id]: false })); }
  };

  const total  = logs.length;
  const sent   = logs.filter(l => l.status === 'sent').length;
  const failed = logs.filter(l => l.status === 'failed').length;

  return (
    <div>
      {/* KPI */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        {[
          { icon: '📬', value: total,  label: 'Total Emails',  color: '#0176D3', bg: '#eff6ff' },
          { icon: '✅', value: sent,   label: 'Delivered',     color: '#15803d', bg: '#dcfce7' },
          { icon: '❌', value: failed, label: 'Failed',        color: '#dc2626', bg: '#fee2e2' },
          { icon: '📈', value: total ? `${Math.round(sent / total * 100)}%` : '—', label: 'Delivery Rate', color: '#7c3aed', bg: '#ede9fe' },
        ].map(c => (
          <KpiCard key={c.label} icon={c.icon} value={c.value} label={c.label} color={c.color} bg={c.bg} active={false} onClick={() => {}} />
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', background: '#fff', borderRadius: 14, border: '1px solid #e8ecf0', padding: '12px 16px' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search email, subject, or error…" />
        <div style={{ display: 'flex', gap: 4, background: '#f8fafc', borderRadius: 20, padding: 4 }}>
          {['all', 'sent', 'failed'].map(f => (
            <Pill key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'sent' ? '✅ Sent' : '❌ Failed'}
            </Pill>
          ))}
        </div>
        <button onClick={load} style={{ ...btnG, fontSize: 12, padding: '6px 14px' }}>↻ Refresh</button>
        <button onClick={() => load()} style={{ background: 'none', border: 'none', color: '#0176D3', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
          onKeyDown={e => e.key === 'Enter' && load()}>Enter ↵ to search</button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}><Spinner /></div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <p style={{ fontSize: 14 }}>No email logs found.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf0', overflowX: 'auto', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ minWidth: 680 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 2fr 100px 100px 80px 110px', gap: 0,
              padding: '10px 20px', background: '#f8fafc', borderBottom: '1px solid #e8ecf0',
              fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px' }}>
              {['RECIPIENT', 'SUBJECT', 'STATUS', 'PROVIDER', 'RETRIES', 'SENT'].map(h => <span key={h}>{h}</span>)}
            </div>
            {logs.map((log, i) => {
              const st = MAIL_STATUS[log.status] || MAIL_STATUS.sent;
              return (
                <div key={log.id || i} style={{ borderBottom: i < logs.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 2fr 100px 100px 80px 110px', gap: 0,
                    padding: '12px 20px', alignItems: 'center' }}>
                    <div style={{ fontSize: 12, color: '#181818', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.to || '—'}</div>
                    <div style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>{log.subject || '—'}</div>
                    <span style={{ background: st.bg, color: st.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, display: 'inline-block' }}>{st.label}</span>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{PROVIDER_LABEL[log.provider] || log.provider || '—'}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>{log.retryCount || 0}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{timeAgo(log.createdAt)}</div>
                  </div>
                  {log.status === 'failed' && (
                    <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ flex: 1, background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#dc2626', fontFamily: 'monospace', lineHeight: 1.5 }}>
                        ⚠️ {log.error || 'Unknown error'}
                      </div>
                      <button onClick={() => handleResend(log)} disabled={resending[log.id]}
                        style={{ padding: '7px 14px', borderRadius: 8, background: resending[log.id] ? '#e2e8f0' : '#0176D3',
                          color: resending[log.id] ? '#9ca3af' : '#fff', border: 'none', fontSize: 12, fontWeight: 700,
                          cursor: resending[log.id] ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {resending[log.id] ? '⏳…' : '🔁 Resend'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Interested Candidates ──────────────────────────────────────────────
const PIPELINE_STAGES = [
  { id: 'applied',             label: 'Applied',     color: '#6b7280', icon: '📝' },
  { id: 'screening',           label: 'Screening',   color: '#f59e0b', icon: '🔍' },
  { id: 'shortlisted',         label: 'Shortlisted', color: '#0176D3', icon: '⭐' },
  { id: 'interview_scheduled', label: 'Interview',   color: '#7c3aed', icon: '📅' },
  { id: 'interview_completed', label: 'Completed',   color: '#0284c7', icon: '✅' },
  { id: 'offer_extended',      label: 'Offered',     color: '#d97706', icon: '🎉' },
  { id: 'selected',            label: 'Hired',       color: '#15803d', icon: '🏆' },
  { id: 'rejected',            label: 'Rejected',    color: '#dc2626', icon: '❌' },
];
const stageInfo = (id) => PIPELINE_STAGES.find(s => s.id === id) || { label: id, color: '#6b7280', icon: '•' };

function CandidatePipelineModal({ candidate, invite, onClose, setToast }) {
  const [apps, setApps]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving]   = useState(null);

  useEffect(() => {
    api.getApplications({ candidateId: candidate.id || candidate._id }).then(r => {
      setApps(Array.isArray(r) ? r : (r?.data || []));
    }).catch(() => setApps([])).finally(() => setLoading(false));
  }, []);

  const moveStage = async (app, stage) => {
    setMoving(app.id || app._id);
    try {
      await api.updateStage(app.id || app._id, stage);
      setApps(prev => prev.map(a => (a.id || a._id) === (app.id || app._id) ? { ...a, stage } : a));
      setToast(`✅ Moved to ${stageInfo(stage).label}`);
    } catch (e) { setToast(`❌ ${e.message}`); }
    setMoving(null);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.72)', backdropFilter: 'blur(6px)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#032D60,#0176D3)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 3 }}>Interested Candidate</div>
            <h3 style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 800 }}>{candidate.name || candidate.candidateName || '—'}</h3>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 3 }}>{candidate.email || candidate.candidateEmail || '—'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 34, height: 34, borderRadius: 8, cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>✕</button>
        </div>

        {/* Invite context */}
        {invite && (
          <div style={{ padding: '12px 24px', background: '#f0fdf4', borderBottom: '1px solid #dcfce7', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div><span style={{ color: '#6b7280', fontSize: 11, fontWeight: 600 }}>JOB THEY LIKED: </span><span style={{ color: '#181818', fontSize: 13, fontWeight: 700 }}>{invite.jobTitle || '—'}</span></div>
            <div><span style={{ color: '#6b7280', fontSize: 11, fontWeight: 600 }}>INTERESTED ON: </span><span style={{ color: '#181818', fontSize: 12 }}>{timeAgo(invite.respondedAt || invite.sentAt)}</span></div>
            <div><span style={{ color: '#6b7280', fontSize: 11, fontWeight: 600 }}>SENT BY: </span><span style={{ color: '#181818', fontSize: 12 }}>{invite.sentByName || 'System'}</span></div>
          </div>
        )}

        {/* Applications pipeline */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#032D60', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>📋 Active Pipeline</div>
          {loading ? <div style={{ textAlign: 'center', padding: 32 }}><Spinner /></div>
          : apps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <p style={{ fontSize: 13 }}>No applications yet — candidate has not applied through the portal.</p>
              <p style={{ fontSize: 12, color: '#0176D3', marginTop: 4 }}>Share the job link or guide them to apply on the careers page.</p>
            </div>
          ) : apps.map(app => {
            const si = stageInfo(app.stage);
            const jobTitle = app.jobId?.title || app.job?.title || app.jobTitle || '—';
            const isBusy = moving === (app.id || app._id);
            return (
              <div key={app.id || app._id} style={{ background: '#f8fafc', border: `1px solid ${si.color}30`, borderRadius: 14, padding: '16px 20px', marginBottom: 12 }}>
                {/* Job + current stage */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div>
                    <div style={{ color: '#181818', fontWeight: 700, fontSize: 14 }}>{jobTitle}</div>
                    {app.jobId?.company && <div style={{ color: '#6b7280', fontSize: 12 }}>{app.jobId.company}</div>}
                  </div>
                  <span style={{ background: si.color + '15', color: si.color, border: `1px solid ${si.color}30`, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {si.icon} {si.label}
                  </span>
                </div>
                {/* Pipeline stepper */}
                <div style={{ overflowX: 'auto', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 'max-content' }}>
                    {PIPELINE_STAGES.filter(s => s.id !== 'rejected').map((s, idx, arr) => {
                      const stages = PIPELINE_STAGES.filter(x => x.id !== 'rejected').map(x => x.id);
                      const curIdx = stages.indexOf(app.stage);
                      const sIdx   = stages.indexOf(s.id);
                      const done   = sIdx < curIdx;
                      const curr   = sIdx === curIdx;
                      return (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center' }}>
                          {idx > 0 && <div style={{ width: 20, height: 2, background: done ? '#0176D3' : '#e2e8f0' }} />}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                            <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                              background: curr ? '#0176D3' : done ? '#0176D310' : '#f1f5f9',
                              border: `2px solid ${curr ? '#0176D3' : done ? '#0176D3' : '#e2e8f0'}`,
                              color: curr ? '#fff' : done ? '#0176D3' : '#9ca3af',
                              boxShadow: curr ? '0 0 0 3px rgba(1,118,211,0.15)' : 'none' }}>
                              {done ? '✓' : s.icon}
                            </div>
                            <span style={{ fontSize: 8, color: curr ? '#0176D3' : done ? '#0176D3' : '#9ca3af', fontWeight: curr ? 700 : 400, whiteSpace: 'nowrap' }}>{s.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Move stage buttons */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ color: '#6b7280', fontSize: 11, fontWeight: 600 }}>Move to:</span>
                  {PIPELINE_STAGES.filter(s => s.id !== app.stage).map(s => (
                    <button key={s.id} onClick={() => moveStage(app, s.id)} disabled={isBusy}
                      style={{ background: '#fff', border: `1px solid ${s.color}40`, borderRadius: 8, padding: '4px 10px', fontSize: 11, cursor: isBusy ? 'not-allowed' : 'pointer', color: s.color, fontWeight: 600, opacity: isBusy ? 0.6 : 1 }}>
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InterestedTab({ setToast }) {
  const [invites, setInvites]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [jobFilter, setJobFilter] = useState('');
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState(null); // { candidate, invite }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getInvites({ status: 'interested' });
      const raw = Array.isArray(res) ? res : (res?.data || []);
      setInvites(raw.map(i => ({ ...i, id: i.id || String(i._id || '') })));
    } catch { setInvites([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const allJobs = [...new Set(invites.map(i => i.jobTitle).filter(Boolean))].sort();

  const filtered = invites.filter(i => {
    if (jobFilter && i.jobTitle !== jobFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (i.candidateName || '').toLowerCase().includes(q) || (i.candidateEmail || '').toLowerCase().includes(q);
    }
    return true;
  });

  // Group by job for the breakdown
  const byJob = allJobs.map(j => ({ job: j, count: invites.filter(i => i.jobTitle === j).length }))
    .sort((a, b) => b.count - a.count);

  return (
    <div>
      {/* Breakdown by job */}
      {byJob.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#032D60', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Interested by Job</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <KpiCard icon="✅" value={invites.length} label="Total Interested" color="#22c55e" bg="#f0fdf4"
              active={!jobFilter} onClick={() => setJobFilter('')} />
            {byJob.map(j => (
              <KpiCard key={j.job} icon="💼" value={j.count} label={j.job.length > 18 ? j.job.slice(0, 18) + '…' : j.job}
                color="#0176D3" bg="#eff6ff" active={jobFilter === j.job} onClick={() => setJobFilter(jobFilter === j.job ? '' : j.job)} />
            ))}
          </div>
        </div>
      )}

      {/* Search + filter bar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, background: '#fff', borderRadius: 14, border: '1px solid #e8ecf0', padding: '12px 16px' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search candidate name or email…" />
        {allJobs.length > 1 && (
          <select value={jobFilter} onChange={e => setJobFilter(e.target.value)}
            style={{ padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${jobFilter ? '#0176D3' : '#e2e8f0'}`,
              background: jobFilter ? '#0176D3' : '#fff', color: jobFilter ? '#fff' : '#374151',
              fontSize: 13, cursor: 'pointer', outline: 'none', appearance: 'none', maxWidth: 240 }}>
            <option value="">All Jobs ({invites.length})</option>
            {byJob.map(j => <option key={j.job} value={j.job}>{j.job} ({j.count})</option>)}
          </select>
        )}
        {(jobFilter || search) && (
          <button onClick={() => { setJobFilter(''); setSearch(''); }}
            style={{ background: 'none', border: 'none', color: '#BA0517', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>✕ Clear</button>
        )}
        <span style={{ marginLeft: 'auto', color: '#6b7280', fontSize: 12, alignSelf: 'center' }}>{filtered.length} candidates</span>
        <button onClick={load} style={{ ...btnG, fontSize: 12, padding: '6px 14px' }}>↻ Refresh</button>
      </div>

      {/* Candidate cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🤝</div>
          <p style={{ fontSize: 14 }}>{invites.length === 0 ? 'No candidates have marked interest yet.' : 'No candidates match your filter.'}</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf0', overflowX: 'auto', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ minWidth: 640 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 2fr 1.5fr 1fr auto', gap: 12, padding: '10px 20px',
              background: '#f8fafc', borderBottom: '1px solid #e8ecf0', fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px' }}>
              {['CANDIDATE', 'INTERESTED IN', 'SENT BY', 'RESPONDED', 'ACTION'].map(h => <span key={h}>{h}</span>)}
            </div>
            {filtered.map((inv, idx) => (
              <div key={inv.id} style={{ display: 'grid', gridTemplateColumns: '2.5fr 2fr 1.5fr 1fr auto', gap: 12,
                padding: '13px 20px', alignItems: 'center',
                borderBottom: idx < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                background: 'transparent', transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {/* Candidate */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                    {(inv.candidateName || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#181818', fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inv.candidateName || inv.candidateEmail?.split('@')[0] || '—'}
                    </div>
                    <div style={{ color: '#9ca3af', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inv.candidateEmail || '—'}
                    </div>
                  </div>
                </div>
                {/* Job */}
                <div style={{ color: '#374151', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.jobTitle || '—'}</div>
                {/* Sent by */}
                <div style={{ color: '#6b7280', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.sentByName || 'System'}</div>
                {/* Time */}
                <div style={{ color: '#9ca3af', fontSize: 12 }}>{timeAgo(inv.respondedAt || inv.sentAt)}</div>
                {/* Action */}
                <button
                  onClick={() => setSelected({ candidate: { id: inv.candidateId?.id || inv.candidateId?._id || inv.candidateId, name: inv.candidateName, email: inv.candidateEmail }, invite: inv })}
                  style={{ background: '#0176D3', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  View Pipeline →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline modal */}
      {selected && (
        <CandidatePipelineModal
          candidate={selected.candidate}
          invite={selected.invite}
          onClose={() => setSelected(null)}
          setToast={setToast}
        />
      )}
    </div>
  );
}

// ── Root: tabbed shell ─────────────────────────────────────────────────────────
export default function OutreachTracker() {
  const [tab, setTab]   = useState('invites');
  const [toast, setToast] = useState('');

  const TAB_CONFIG = [
    { key: 'invites',    label: '📣 Outreach & Invites', sub: 'Every invite sent + open/decline/interested responses' },
    { key: 'interested', label: '✅ Interested',          sub: 'Candidates who clicked Interested — view pipeline' },
    { key: 'mail',       label: '📬 Mail Queue',          sub: 'Email delivery logs — failures and resend' },
  ];

  const active = TAB_CONFIG.find(t => t.key === tab);

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 0, background: '#fff', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 14, overflow: 'hidden', marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        {TAB_CONFIG.map((t, i) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, padding: '13px 18px', border: 'none', cursor: 'pointer', textAlign: 'left',
              background: tab === t.key ? 'linear-gradient(135deg,#032D60,#0176D3)' : '#fff',
              color: tab === t.key ? '#fff' : '#374151', transition: 'all 0.2s',
              borderRight: i < TAB_CONFIG.length - 1 ? '1px solid rgba(1,118,211,0.12)' : 'none' }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{t.label}</div>
            <div style={{ fontSize: 10, opacity: 0.75, marginTop: 2 }}>{t.sub}</div>
          </button>
        ))}
      </div>

      <PageHeader title={active.label} subtitle={active.sub} />

      {tab === 'invites'    && <InviteTab    setToast={setToast} />}
      {tab === 'interested' && <InterestedTab setToast={setToast} />}
      {tab === 'mail'       && <MailTab      setToast={setToast} />}
    </div>
  );
}
