import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Toast from '../../components/ui/Toast.jsx';
import { btnP, btnG, card, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const STAGE_COLOR = {
  Applied:'#0176D3', Screening:'#7c3aed', Shortlisted:'#f59e0b',
  'Interview Round 1':'#06b6d4', 'Interview Round 2':'#8b5cf6',
  Offer:'#10b981', Hired:'#059669', Rejected:'#ef4444',
};
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';

// Expanded row showing all jobs the candidate applied for
function CandidateAppsRow({ candidate, onClose }) {
  return (
    <div style={{ padding:'16px 20px', background:'#F8FAFC', borderTop:'1px solid #E2E8F0' }}>
      <div style={{ fontSize:11, fontWeight:800, color:'#0176D3', letterSpacing:1, textTransform:'uppercase', marginBottom:12 }}>
        All Applications — {candidate.applications?.length || 0} job{candidate.applications?.length !== 1 ? 's' : ''}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
        {(candidate.applications || []).map(app => (
          <div key={app.id} style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:10, padding:'12px 14px' }}>
            <div style={{ fontWeight:700, fontSize:13, color:'#0A1628', marginBottom:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{app.jobTitle}</div>
            {app.jobCompany && <div style={{ fontSize:11, color:'#64748B', marginBottom:6 }}>{app.jobCompany}{app.location ? ` · ${app.location}` : ''}</div>}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, fontWeight:700, color: STAGE_COLOR[app.stage] || '#64748B', background:`${STAGE_COLOR[app.stage] || '#64748B'}14`, padding:'2px 8px', borderRadius:20 }}>{app.stage}</span>
              <span style={{ fontSize:11, color:'#94A3B8' }}>{fmtDate(app.appliedAt)}</span>
            </div>
            {app.appliedFrom?.lat && app.appliedFrom?.lng && (
              <a href={`https://www.google.com/maps?q=${app.appliedFrom.lat},${app.appliedFrom.lng}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, color:'#059669', marginTop:6, textDecoration:'none', fontWeight:600 }}>
                📍 {app.appliedFrom.city || 'View location'}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SuperAdminUnregisteredCandidates() {
  const [loading, setLoading]   = useState(true);
  const [rows, setRows]         = useState([]);
  const [search, setSearch]     = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage]         = useState(1);
  const [pagination, setPagination] = useState({ total:0, pages:1 });
  const [toast, setToast]       = useState('');
  const [expanded, setExpanded] = useState(null); // email of expanded row
  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getUnregisteredCandidates({ page, limit: LIMIT, search });
      const data = Array.isArray(r?.data) ? r.data : [];
      setRows(data);
      setPagination(r?.pagination || { total: data.length, pages: 1 });
    } catch { setRows([]); }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      <PageHeader
        title="👤 Guest Applicants"
        subtitle="Candidates who applied without a TalentNest account — deduplicated by email"
        action={
          <div style={{ fontSize:13, color:'#64748B', fontWeight:600 }}>
            {pagination.total} unique candidate{pagination.total !== 1 ? 's' : ''}
          </div>
        }
      />

      {/* Info banner */}
      <div style={{ ...card, background:'rgba(1,118,211,0.05)', border:'1px solid rgba(1,118,211,0.2)', padding:'12px 18px', marginBottom:20, display:'flex', alignItems:'flex-start', gap:12 }}>
        <span style={{ fontSize:18, flexShrink:0 }}>ℹ️</span>
        <div style={{ fontSize:13, color:'#0176D3', lineHeight:1.6 }}>
          These candidates applied via career pages but have not created a TalentNest account yet.
          Each row shows ONE candidate even if they applied to multiple jobs — all their applications are listed inside.
          Once a candidate creates an account, they move to <strong>Registered Users</strong> automatically.
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
        <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
          placeholder="Search by name, email, phone, title…"
          style={{ ...inp, flex:1, minWidth:220, padding:'10px 14px', fontSize:14 }} />
        <button type="submit" style={{ ...btnP, padding:'10px 20px' }}>Search</button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
            style={{ ...btnG, padding:'10px 16px' }}>Clear</button>
        )}
      </form>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner /></div>
      ) : rows.length === 0 ? (
        <div style={{ ...card, textAlign:'center', padding:60, color:'#94A3B8' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>👤</div>
          <div style={{ fontWeight:700, fontSize:15 }}>{search ? 'No results found' : 'No unregistered applicants yet'}</div>
          <div style={{ fontSize:13, marginTop:6 }}>When candidates apply without creating an account, they appear here.</div>
        </div>
      ) : (
        <div style={{ ...card, overflow:'hidden', padding:0 }}>
          {/* Table header */}
          <div style={{ background:'#F8FAFC', borderBottom:'1px solid #E2E8F0', display:'grid', gridTemplateColumns:'2fr 1.5fr 1fr 1fr 1fr 80px', gap:0 }}>
            {['Candidate','Email / Phone','Title / Company','Applied','Jobs',''].map(h => (
              <div key={h} style={{ padding:'10px 14px', fontSize:11, fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:0.8 }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {rows.map(row => (
            <div key={row.email} style={{ borderBottom:'1px solid #F1F5F9' }}>
              <div
                style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 1fr 1fr 1fr 80px', gap:0, cursor:'pointer', transition:'background 0.15s' }}
                onClick={() => setExpanded(prev => prev === row.email ? null : row.email)}
                onMouseEnter={e => e.currentTarget.style.background='#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background=''}>
                {/* Name */}
                <div style={{ padding:'12px 14px' }}>
                  <div style={{ fontWeight:800, fontSize:13, color:'#0A1628' }}>{row.name || '—'}</div>
                  <div style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>
                    {row.source === 'career_page' ? '🌐 Career Page' : row.source || 'Guest'}
                  </div>
                </div>
                {/* Email/Phone */}
                <div style={{ padding:'12px 14px' }}>
                  <div style={{ fontSize:12, color:'#374151' }}>{row.email}</div>
                  <div style={{ fontSize:12, color:'#64748B', marginTop:2 }}>{row.phone || '—'}</div>
                </div>
                {/* Title/Company */}
                <div style={{ padding:'12px 14px' }}>
                  <div style={{ fontSize:12, color:'#374151' }}>{row.title || '—'}</div>
                  <div style={{ fontSize:11, color:'#64748B', marginTop:2 }}>{row.currentCompany || '—'}</div>
                </div>
                {/* First applied */}
                <div style={{ padding:'12px 14px', fontSize:12, color:'#64748B' }}>{fmtDate(row.firstAppliedAt)}</div>
                {/* Job count */}
                <div style={{ padding:'12px 14px' }}>
                  <span style={{ background:'rgba(1,118,211,0.1)', color:'#0176D3', fontWeight:800, fontSize:12, padding:'3px 10px', borderRadius:20 }}>
                    {row.jobCount} job{row.jobCount !== 1 ? 's' : ''}
                  </span>
                </div>
                {/* Expand toggle */}
                <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ color:'#94A3B8', fontSize:14, fontWeight:700 }}>
                    {expanded === row.email ? '▲' : '▼'}
                  </span>
                </div>
              </div>
              {/* Expanded applications */}
              {expanded === row.email && (
                <CandidateAppsRow candidate={row} onClose={() => setExpanded(null)} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:12, marginTop:20 }}>
          <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
            style={{ ...btnG, padding:'8px 16px', opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
          <span style={{ fontSize:13, color:'#64748B' }}>Page {page} of {pagination.pages} · {pagination.total} total</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.pages}
            style={{ ...btnG, padding:'8px 16px', opacity: page >= pagination.pages ? 0.4 : 1 }}>Next →</button>
        </div>
      )}
    </div>
  );
}
