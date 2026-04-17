import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { btnG, card, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';

// ── Styles outside component ───────────────────────────────────────────────────
const S = {
  row: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #F3F2F2' },
  td: { padding: '11px 14px', fontSize: 12.5, color: '#181818', borderBottom: '1px solid #F3F2F2', verticalAlign: 'top' },
  empty: { textAlign: 'center', padding: '60px 24px', color: '#706E6B', fontSize: 14 },
  actionColor: {
    login: '#34d399', logout: '#706E6B', job_created: '#0176D3', job_updated: '#0176D3',
    job_archived: '#F59E0B', invite_sent: '#a78bfa', stage_changed: '#0176D3',
    email_opened: '#10b981', application_submitted: '#0176D3', offer_signed: '#34d399',
    candidate_created: '#0176D3', default: '#706E6B',
  },
};

function SkeletonRow() {
  return (
    <tr>
      {[1,2,3,4,5].map(i => (
        <td key={i} style={S.td}>
          <div className="tn-skeleton" style={{ height: 14, borderRadius: 6, width: i === 3 ? '90%' : '60%' }} />
        </td>
      ))}
    </tr>
  );
}

function actionColor(action) {
  return S.actionColor[action] || S.actionColor.default;
}

function fmt(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function SuperAdminAuditLogs() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [toast,   setToast]   = useState('');
  const [search,  setSearch]  = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    const params = new URLSearchParams();
    if (search)       params.set('search', search);
    if (actionFilter) params.set('action', actionFilter);
    if (dateFrom)     params.set('from', dateFrom);
    if (dateTo)       params.set('to', dateTo);
    api.getAuditLogs(params.toString())
      .then(r => setLogs(Array.isArray(r) ? r : (r?.data || [])))
      .catch(e => { setError(e.message); setLogs([]); })
      .finally(() => setLoading(false));
  }, [search, actionFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, []);

  const uniqueActions = [...new Set(logs.map(l => l.action).filter(Boolean))].sort();

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      <PageHeader title="📋 Audit Logs" subtitle="System-wide activity log — all tenants" />

      {/* Filters */}
      <div style={S.row}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search user / entity…"
          style={{ ...inp, flex: '1 1 140px', minWidth: 0 }}
        />
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} style={{ ...inp, flex: '1 1 120px', minWidth: 0 }}>
          <option value="">All Actions</option>
          {uniqueActions.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inp, flex: '1 1 130px', minWidth: 0 }} />
        <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   style={{ ...inp, flex: '1 1 130px', minWidth: 0 }} />
        <button onClick={load} style={{ ...btnG, whiteSpace: 'nowrap' }}>🔍 Search</button>
      </div>

      {error && (
        <div style={{ ...card, background: 'rgba(186,5,23,0.06)', border: '1px solid rgba(186,5,23,0.2)', color: '#BA0517', marginBottom: 16 }}>
          ❌ {error} <button onClick={load} style={{ ...btnG, marginLeft: 12 }}>Retry</button>
        </div>
      )}

      <div style={{ ...card, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ ...S.table, minWidth: 560 }}>
          <thead>
            <tr>
              {['Time','Action','Entity','User','Details'].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3,4,5,6,7,8].map(i => <SkeletonRow key={i} />)
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', padding: '60px 24px', color: '#706E6B' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
                <div style={{ fontWeight: 600 }}>No audit logs found</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>Try adjusting your filters</div>
              </td></tr>
            ) : logs.map((log, i) => (
              <tr key={log.id || log._id || i}
                onMouseEnter={e => e.currentTarget.style.background='#FAFAF9'}
                onMouseLeave={e => e.currentTarget.style.background=''}>
                <td style={S.td}><div style={{ whiteSpace: 'nowrap', color: '#706E6B' }}>{fmt(log.createdAt || log.timestamp)}</div></td>
                <td style={S.td}>
                  <Badge label={(log.action || 'unknown').replace(/_/g, ' ')} color={actionColor(log.action)} />
                </td>
                <td style={S.td}>
                  <div style={{ fontWeight: 600 }}>{log.entity || '—'}</div>
                  {log.entityId && <div style={{ fontSize: 11, color: '#9E9D9B', fontFamily: 'monospace' }}>{String(log.entityId).slice(0, 16)}…</div>}
                </td>
                <td style={S.td}>
                  {log.userId ? (
                    <div>
                      <div style={{ fontWeight: 600 }}>{log.userId?.name || String(log.userId).slice(0, 12)}</div>
                      {log.userId?.email && <div style={{ fontSize: 11, color: '#706E6B' }}>{log.userId.email}</div>}
                    </div>
                  ) : <span style={{ color: '#9E9D9B' }}>System</span>}
                </td>
                <td style={{ ...S.td, maxWidth: 300 }}>
                  {log.details ? (
                    <div style={{ fontSize: 11, color: '#3E3E3C', wordBreak: 'break-word' }}>
                      {typeof log.details === 'object' ? Object.entries(log.details).map(([k,v]) => `${k}: ${v}`).join(' · ') : String(log.details)}
                    </div>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
