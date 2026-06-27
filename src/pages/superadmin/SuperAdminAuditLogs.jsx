import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { btnG, btnP, card, inp } from '../../constants/styles.js';
import CapLimitBanner from '../../components/ui/CapLimitBanner.jsx';
import { api } from '../../api/api.js';

const S = {
  row: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #F3F2F2' },
  td: { padding: '11px 14px', fontSize: 12.5, color: '#181818', borderBottom: '1px solid #F3F2F2', verticalAlign: 'top' },
  actionColor: {
    login:'#34d399', logout:'#706E6B', job_created:'#0176D3', job_updated:'#0176D3',
    job_archived:'#F59E0B', invite_sent:'#a78bfa', stage_changed:'#0176D3',
    email_opened:'#10b981', application_submitted:'#0176D3', offer_signed:'#34d399',
    candidate_created:'#0176D3', default:'#706E6B',
  },
};

function SkeletonRow() {
  return <tr>{[1,2,3,4,5].map(i => (
    <td key={i} style={S.td}><div className="tn-skeleton" style={{ height:14, borderRadius:6, width: i===3?'90%':'60%' }} /></td>
  ))}</tr>;
}

function actionColor(a) { return S.actionColor[a] || S.actionColor.default; }

function fmt(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

const PAGE_SIZE = 100;

export default function SuperAdminAuditLogs({ user }) {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [toast,   setToast]   = useState('');
  const [search,  setSearch]  = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [page,    setPage]    = useState(1);
  const [pagination, setPagination] = useState({ total:0, pages:1 });

  const load = useCallback(() => {
    setLoading(true); setError('');
    const params = new URLSearchParams();
    if (search)       params.set('search', search);
    if (actionFilter) params.set('action', actionFilter);
    if (dateFrom)     params.set('from', dateFrom);
    if (dateTo)       params.set('to', dateTo);
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    api.getAuditLogs(params.toString())
      .then(r => {
        const data = Array.isArray(r) ? r : (r?.data || []);
        setLogs(data);
        if (r?.pagination) setPagination(r.pagination);
        else setPagination({ total: data.length, pages: 1 });
      })
      .catch(e => { setError(e.message); setLogs([]); })
      .finally(() => setLoading(false));
  }, [search, actionFilter, dateFrom, dateTo, page]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); setSearch(searchInput.trim()); };

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      <PageHeader title="📋 Audit Logs"
        subtitle={`${user?.role === 'super_admin' ? 'Platform-wide' : 'Your org'} activity log · ${pagination.total.toLocaleString()} total events`} />

      {/* Filters */}
      <form onSubmit={handleSearch} style={S.row}>
        <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
          placeholder="Search user / action / entity…"
          style={{ ...inp, flex:'1 1 160px', minWidth:0 }} />
        <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          style={{ ...inp, flex:'1 1 130px', minWidth:0 }}>
          <option value="">All Actions</option>
          {['login','logout','job_created','job_updated','stage_changed','application_submitted',
            'invite_sent','offer_signed','candidate_created','user_updated'].map(a => (
            <option key={a} value={a}>{a.replace(/_/g,' ')}</option>
          ))}
        </select>
        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
          style={{ ...inp, flex:'1 1 130px', minWidth:0 }} />
        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
          style={{ ...inp, flex:'1 1 130px', minWidth:0 }} />
        <button type="submit" style={{ ...btnP, whiteSpace:'nowrap' }}>🔍 Search</button>
        {(search || actionFilter || dateFrom || dateTo) && (
          <button type="button" style={{ ...btnG, whiteSpace:'nowrap' }}
            onClick={() => { setSearchInput(''); setSearch(''); setActionFilter(''); setDateFrom(''); setDateTo(''); setPage(1); }}>
            Clear
          </button>
        )}
      </form>

      <CapLimitBanner total={pagination.total} fetched={logs.length} entity="audit logs" role={user?.role} />
      {error && (
        <div style={{ ...card, background:'rgba(186,5,23,0.06)', border:'1px solid rgba(186,5,23,0.2)', color:'#BA0517', marginBottom:16 }}>
          ❌ {error} <button onClick={load} style={{ ...btnG, marginLeft:12 }}>Retry</button>
        </div>
      )}

      <div style={{ ...card, overflowX:'auto', WebkitOverflowScrolling:'touch', padding:0 }}>
        <table style={{ ...S.table, minWidth:560 }}>
          <thead>
            <tr>{['Time','Action','Entity','User','Details'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3,4,5,6,7,8,9,10].map(i => <SkeletonRow key={i} />)
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} style={{ ...S.td, textAlign:'center', padding:'60px 24px', color:'#706E6B' }}>
                <div style={{ fontSize:36, marginBottom:10 }}>📋</div>
                <div style={{ fontWeight:600 }}>No audit logs found</div>
                <div style={{ fontSize:12, marginTop:6 }}>Try adjusting your filters</div>
              </td></tr>
            ) : logs.map((log, i) => (
              <tr key={log.id || log._id || i}
                onMouseEnter={e => e.currentTarget.style.background='#FAFAF9'}
                onMouseLeave={e => e.currentTarget.style.background=''}>
                <td style={S.td}><div style={{ whiteSpace:'nowrap', color:'#706E6B' }}>{fmt(log.createdAt || log.timestamp)}</div></td>
                <td style={S.td}><Badge label={(log.action||'unknown').replace(/_/g,' ')} color={actionColor(log.action)} /></td>
                <td style={S.td}>
                  <div style={{ fontWeight:600 }}>{log.entity || log.resource || '—'}</div>
                  {log.entityId && <div style={{ fontSize:11, color:'#9E9D9B', fontFamily:'monospace' }}>{String(log.entityId).slice(0,16)}…</div>}
                </td>
                <td style={S.td}>
                  {log.userId ? (
                    <div>
                      <div style={{ fontWeight:600 }}>{log.userId?.name || log.userName || String(log.userId).slice(0,12)}</div>
                      {log.userId?.email && <div style={{ fontSize:11, color:'#706E6B' }}>{log.userId.email}</div>}
                    </div>
                  ) : <span style={{ color:'#9E9D9B' }}>System</span>}
                </td>
                <td style={{ ...S.td, maxWidth:300 }}>
                  {log.details ? (
                    <div style={{ fontSize:11, color:'#3E3E3C', wordBreak:'break-word' }}>
                      {typeof log.details === 'object'
                        ? Object.entries(log.details).map(([k,v]) => `${k}: ${v}`).join(' · ')
                        : String(log.details)}
                    </div>
                  ) : log.detail ? <div style={{ fontSize:11, color:'#3E3E3C' }}>{log.detail}</div> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:12, marginTop:16, flexWrap:'wrap' }}>
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
            style={{ ...btnG, padding:'7px 16px', opacity: page===1 ? 0.4 : 1 }}>← Prev</button>
          <span style={{ fontSize:13, color:'#64748B' }}>
            Page {page} of {pagination.pages} · {pagination.total.toLocaleString()} logs
          </span>
          <button onClick={() => setPage(p => Math.min(pagination.pages, p+1))} disabled={page >= pagination.pages}
            style={{ ...btnG, padding:'7px 16px', opacity: page>=pagination.pages ? 0.4 : 1 }}>Next →</button>
        </div>
      )}
    </div>
  );
}
