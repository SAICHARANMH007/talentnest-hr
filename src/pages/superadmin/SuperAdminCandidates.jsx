import React, { useState, useEffect, useCallback, useRef } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Toast from '../../components/ui/Toast.jsx';
import { btnP, btnG, btnD, card, inp } from '../../constants/styles.js';
import { api, downloadBlob } from '../../api/api.js';
import UserDetailDrawer from '../../components/shared/UserDetailDrawer.jsx';

// DB-format stage names + colours
const PIPELINE_STAGES = ['Applied','Screening','Shortlisted','Interview Round 1','Interview Round 2','Offer','Hired','Rejected'];
const STAGE_COLOR = {
  Applied:'#0176D3', Screening:'#7c3aed', Shortlisted:'#f59e0b',
  'Interview Round 1':'#06b6d4', 'Interview Round 2':'#8b5cf6',
  Offer:'#10b981', Hired:'#059669', Rejected:'#ef4444',
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';

export default function SuperAdminCandidates() {
  const [loading, setLoading]         = useState(true);
  const [candidates, setCandidates]   = useState([]);
  const [search, setSearch]           = useState('');
  const [tab, setTab]                 = useState('all');
  const [page, setPage]               = useState(1);
  const [limit]                       = useState(50);
  const [pagination, setPagination]   = useState({ total:0, pages:1 });
  const [stats, setStats]             = useState({ total:0, applied:0, platform:0 });
  const [drawerUser, setDrawerUser]   = useState(null);
  const [pipelineCandidate, setPipelineCandidate] = useState(null);
  const [stageChanging, setStageChanging] = useState(null);
  const [exporting, setExporting]     = useState(false);
  const [toast, setToast]             = useState('');
  const [sortCol, setSortCol]         = useState('');
  const statsLoaded = useRef(false); // load stats only once per tab/search change

  // ── Load table data ────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, search };
      if (tab === 'applied')  params.appliedOnly    = true;
      if (tab === 'platform') params.registeredOnly = true;

      const res = await api.getCandidateRecords(params);
      const data = Array.isArray(res?.data) ? res.data : [];
      setCandidates(data.map(c => ({
        ...c,
        // Normalise id so UserDetailDrawer can look up the full record
        id: c.candidateId || c.id || c._id,
        _id: c.candidateId || c._id,
        isApplied: (c.applicationCount || 0) > 0,
        isPlatformUser: !!c.userId,
        // Ensure allApplications is always an array
        allApplications: Array.isArray(c.allApplications) ? c.allApplications : [],
        latestStage: Array.isArray(c.allApplications) && c.allApplications.length > 0
          ? c.allApplications[0].stage : '',
        latestApplied: Array.isArray(c.allApplications) && c.allApplications.length > 0
          ? c.allApplications[0].appliedAt : null,
      })));

      if (res?.pagination) setPagination(res.pagination);
      else setPagination({ total: data.length, pages: 1 });
    } catch (err) {
      setToast('Failed to load: ' + err.message);
    }
    setLoading(false);
  }, [page, search, tab]);

  // ── Load stats (once per tab+search change, not on pagination) ───────────
  const loadStats = useCallback(async () => {
    try {
      const [allCount, regCount, appCount] = await Promise.all([
        api.getCandidateRecords({ limit: 1 }),
        api.getCandidateRecords({ limit: 1, registeredOnly: true }),
        api.getCandidateRecords({ limit: 1, appliedOnly: true }),
      ]);
      setStats({
        total:    allCount?.pagination?.total   ?? 0,
        platform: regCount?.pagination?.total   ?? 0,
        applied:  appCount?.pagination?.total   ?? 0,
      });
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reload stats only when tab or search changes (not on page change)
  useEffect(() => { loadStats(); }, [tab, search, loadStats]);

  const handleTabChange = (t) => { setTab(t); setPage(1); };

  // ── Stage change ──────────────────────────────────────────────────────────
  const changeStage = async (appId, newStage) => {
    setStageChanging(appId);
    try {
      await api.updateStage(appId, newStage);
      setPipelineCandidate(prev => prev ? {
        ...prev,
        allApplications: prev.allApplications.map(a => a.id === appId ? { ...a, stage: newStage } : a),
      } : prev);
      // Refresh count in table without full reload
      setCandidates(prev => prev.map(c => {
        if (c.allApplications?.some(a => a.id === appId)) {
          return {
            ...c,
            latestStage: newStage,
            allApplications: c.allApplications.map(a => a.id === appId ? { ...a, stage: newStage } : a),
          };
        }
        return c;
      }));
      setToast(`✅ Moved to ${newStage}`);
    } catch (e) { setToast('❌ ' + e.message); }
    setStageChanging(null);
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const doExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ limit: 10000 });
      if (tab === 'applied')  params.set('appliedOnly', 'true');
      if (tab === 'platform') params.set('registeredOnly', 'true');
      if (search) params.set('search', search);
      await downloadBlob(`/dashboard/candidate-records/export?${params.toString()}`, 'candidates.xlsx');
    } catch (e) { setToast('❌ Export failed: ' + e.message); }
    setExporting(false);
  };

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sorted = sortCol
    ? [...candidates].sort((a, b) => {
        if (sortCol === 'name')  return (a.name||'').localeCompare(b.name||'');
        if (sortCol === 'apps')  return (b.applicationCount||0) - (a.applicationCount||0);
        if (sortCol === 'stage') return (a.latestStage||'').localeCompare(b.latestStage||'');
        if (sortCol === 'date')  return (b.latestApplied||0) > (a.latestApplied||0) ? 1 : -1;
        return 0;
      })
    : candidates;

  const Th = ({ col, label }) => (
    <th style={thS} onClick={() => setSortCol(sortCol === col ? '' : col)}>
      {label} {sortCol === col ? '↑' : <span style={{opacity:0.3}}>↕</span>}
    </th>
  );

  return (
    <div style={{ padding:'24px 32px', maxWidth:1500, margin:'0 auto' }}>
      <PageHeader
        title="Unified Talent Database"
        subtitle="All candidates — career page applicants + registered platform users"
        actions={
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={doExport} disabled={exporting} style={{ ...btnG, opacity: exporting ? 0.7 : 1 }}>
              {exporting ? '⏳ Exporting…' : '⬇️ Export Excel'}
            </button>
            <button onClick={() => { load(); loadStats(); }} style={btnG}>🔄 Refresh</button>
          </div>
        }
      />

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:14, marginBottom:24 }}>
        <StatCard label="Total Talent Pool"      value={stats.total}    icon="👥" color="#0176D3" />
        <StatCard label="Career Page Applicants" value={stats.applied}  icon="📝" color="#10b981" />
        <StatCard label="Platform Registered"    value={stats.platform} icon="🌐" color="#7c3aed" />
      </div>

      {/* Tabs + Search */}
      <div style={{ ...card, padding:'12px 18px', marginBottom:18, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {[
            { key:'all',      label:'All Records',       count: stats.total },
            { key:'applied',  label:'Career Applicants', count: stats.applied },
            { key:'platform', label:'Registered Users',  count: stats.platform },
          ].map(t => (
            <button key={t.key} onClick={() => handleTabChange(t.key)}
              style={{ padding:'7px 14px', borderRadius:10, border:'none', background: tab===t.key?'#0176D3':'transparent', color: tab===t.key?'#fff':'#64748B', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
              {t.label}
              <span style={{ background: tab===t.key?'rgba(255,255,255,0.2)':'#F1F5F9', padding:'1px 7px', borderRadius:6, fontSize:11 }}>{t.count}</span>
            </button>
          ))}
        </div>
        <input placeholder="Search name, email, phone…" value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ padding:'8px 14px', borderRadius:10, border:'1px solid #E2E8F0', fontSize:13, outline:'none', width:260, boxSizing:'border-box' }} />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign:'center', padding:80 }}><Spinner size={36} /></div>
      ) : (
        <>
          <div style={{ ...card, overflow:'auto', marginBottom:16 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', textAlign:'left', minWidth:900 }}>
              <thead>
                <tr style={{ background:'#F8FAFC', borderBottom:'1px solid #E2E8F0' }}>
                  <Th col="name"  label="Candidate" />
                  <th style={thS}>Contact</th>
                  <th style={thS}>Type / Source</th>
                  <Th col="apps"  label="Applications" />
                  <Th col="stage" label="Latest Stage" />
                  <Th col="date"  label="Last Applied" />
                  <th style={thS}>Organisation</th>
                  <th style={thS}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign:'center', padding:60, color:'#94A3B8' }}>No candidates found.</td></tr>
                ) : sorted.map(c => (
                  <tr key={c.id || c.candidateId} style={{ borderBottom:'1px solid #F1F5F9', transition:'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background='#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background=''}>

                    {/* Candidate */}
                    <td style={tdS}>
                      <div style={{ fontWeight:700, color:'#0A1628', fontSize:13 }}>{c.name || c.candidateName || 'Anonymous'}</div>
                      <div style={{ fontSize:11, color:'#706E6B', marginTop:1 }}>{c.title || c.currentCompany || '—'}</div>
                    </td>

                    {/* Contact */}
                    <td style={tdS}>
                      <div style={{ fontSize:12, color:'#374151' }}>{c.email || '—'}</div>
                      <div style={{ fontSize:11, color:'#64748B', marginTop:1 }}>{c.phone || '—'}</div>
                    </td>

                    {/* Type */}
                    <td style={tdS}>
                      <Badge label={c.isApplied ? 'Applicant' : 'Registered'} color={c.isApplied ? '#10b981' : '#7c3aed'} />
                      {c.isPlatformUser && <Badge label="Has Account" color="#0176D3" style={{ marginLeft:4 }} />}
                      <div style={{ fontSize:10, color:'#94A3B8', marginTop:3 }}>{c.source || 'platform'}</div>
                    </td>

                    {/* Applications count — clickable */}
                    <td style={tdS}>
                      <button
                        onClick={() => c.applicationCount > 0 && setPipelineCandidate(c)}
                        disabled={!(c.applicationCount > 0)}
                        style={{ fontWeight:800, fontSize:16, color: c.applicationCount > 0 ? '#0176D3':'#94A3B8', background:'none', border:'none', cursor: c.applicationCount > 0 ? 'pointer':'default', textDecoration: c.applicationCount > 0 ? 'underline':'none', padding:0 }}
                        title={c.applicationCount > 0 ? `View ${c.applicationCount} application(s)` : 'No applications'}
                      >{c.applicationCount || 0}</button>
                      <div style={{ fontSize:10, color:'#94A3B8' }}>application{c.applicationCount !== 1 ? 's' : ''}</div>
                    </td>

                    {/* Latest stage */}
                    <td style={tdS}>
                      {c.latestStage ? (
                        <span style={{ background:`${STAGE_COLOR[c.latestStage]||'#64748B'}15`, color: STAGE_COLOR[c.latestStage]||'#64748B', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>
                          {c.latestStage}
                        </span>
                      ) : <span style={{ color:'#94A3B8', fontSize:11 }}>—</span>}
                    </td>

                    {/* Last applied date */}
                    <td style={tdS}>
                      <div style={{ fontSize:12, color:'#374151' }}>{fmtDate(c.latestApplied)}</div>
                    </td>

                    {/* Organisation */}
                    <td style={tdS}>
                      <div style={{ fontSize:12, color:'#706E6B' }}>{c.organisation || c.orgName || '—'}</div>
                    </td>

                    {/* Actions */}
                    <td style={tdS}>
                      <button onClick={() => setDrawerUser({
                        ...c,
                        id: c.candidateId || c.id || c._id,
                        _id: c.candidateId || c._id,
                        role: 'candidate',
                      })} style={{ ...btnG, padding:'4px 12px', fontSize:11 }}>
                        Deep Dive
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:10 }}>
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} style={{ ...btnG, opacity: page===1?0.5:1 }}>← Prev</button>
              <span style={{ fontSize:13, fontWeight:700, color:'#64748B' }}>Page {page} of {pagination.pages} · {pagination.total} total</span>
              <button onClick={() => setPage(p => Math.min(pagination.pages, p+1))} disabled={page===pagination.pages} style={{ ...btnG, opacity: page===pagination.pages?0.5:1 }}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* ── Pipeline Modal ────────────────────────────────────────────────────── */}
      {pipelineCandidate && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:10001, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={e => e.target === e.currentTarget && setPipelineCandidate(null)}>
          <div style={{ background:'#fff', borderRadius:18, width:'100%', maxWidth:700, maxHeight:'88vh', overflow:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.25)' }}>
            {/* Header */}
            <div style={{ background:'linear-gradient(135deg,#032D60,#0176D3)', padding:'22px 28px', borderRadius:'18px 18px 0 0', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ color:'rgba(255,255,255,0.75)', fontSize:11, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Candidate Pipeline</div>
                <h2 style={{ color:'#fff', margin:'6px 0 2px', fontSize:19, fontWeight:800 }}>
                  {pipelineCandidate.name || pipelineCandidate.candidateName}
                </h2>
                <div style={{ color:'rgba(255,255,255,0.8)', fontSize:13 }}>
                  {pipelineCandidate.email}{pipelineCandidate.phone ? ` · ${pipelineCandidate.phone}` : ''}
                </div>
              </div>
              <button onClick={() => setPipelineCandidate(null)} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, color:'#fff', fontSize:18, cursor:'pointer', width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>

            {/* Body */}
            <div style={{ padding:'20px 28px' }}>
              {pipelineCandidate.allApplications.length === 0 ? (
                <div style={{ textAlign:'center', padding:48, color:'#94A3B8' }}>
                  <div style={{ fontSize:36, marginBottom:8 }}>📋</div>
                  <p>No application records found for this candidate.</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {pipelineCandidate.allApplications.map((app, i) => (
                    <div key={app.id || i} style={{ border:'1px solid #E2E8F0', borderRadius:14, padding:'18px 22px', background:'#FAFAFA' }}>
                      {/* Job info */}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8, marginBottom:14 }}>
                        <div>
                          <div style={{ fontWeight:800, fontSize:14, color:'#0A1628' }}>{app.jobTitle || 'Unknown Job'}</div>
                          <div style={{ fontSize:12, color:'#64748B', marginTop:3 }}>Applied: {fmtDate(app.appliedAt)}</div>
                          {app.status && app.status !== 'active' && (
                            <div style={{ fontSize:11, color:'#94A3B8', marginTop:1 }}>Status: {app.status}</div>
                          )}
                        </div>
                        <span style={{ background:`${STAGE_COLOR[app.stage]||'#64748B'}18`, color: STAGE_COLOR[app.stage]||'#64748B', padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:800, border:`1px solid ${STAGE_COLOR[app.stage]||'#64748B'}40`, whiteSpace:'nowrap' }}>
                          {app.stage || 'Applied'}
                        </span>
                      </div>

                      {/* Stage change buttons */}
                      <div style={{ borderTop:'1px solid #F1F5F9', paddingTop:12 }}>
                        <div style={{ fontSize:11, color:'#64748B', fontWeight:700, marginBottom:8 }}>MOVE PIPELINE STAGE:</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                          {PIPELINE_STAGES.map(stage => {
                            const isCurrent = stage === app.stage;
                            const isLoading = stageChanging === app.id;
                            return (
                              <button key={stage} disabled={isCurrent || isLoading}
                                onClick={() => changeStage(app.id, stage)}
                                style={{ padding:'5px 12px', borderRadius:8, fontSize:11, fontWeight:700, cursor: isCurrent ? 'default' : 'pointer',
                                  border:`1.5px solid ${STAGE_COLOR[stage]||'#E2E8F0'}`,
                                  background: isCurrent ? (STAGE_COLOR[stage]||'#0176D3') : '#fff',
                                  color: isCurrent ? '#fff' : (STAGE_COLOR[stage]||'#374151'),
                                  opacity: isLoading && !isCurrent ? 0.5 : 1,
                                  transform: isCurrent ? 'scale(1.05)' : 'scale(1)',
                                  transition:'all 0.15s',
                                }}>
                                {isLoading && !isCurrent ? '⏳' : isCurrent ? '✓ ' + stage : stage}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Rejection reason */}
                      {app.rejectionReason && (
                        <div style={{ marginTop:10, background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#991B1B' }}>
                          Rejection reason: {app.rejectionReason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deep Dive drawer */}
      {drawerUser && (
        <UserDetailDrawer user={drawerUser} isSuperAdmin={true} onClose={() => setDrawerUser(null)}
          onUpdated={() => { setDrawerUser(null); load(); }} />
      )}

      <Toast msg={toast} onClose={() => setToast('')} />
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{ ...card, padding:'18px 20px', display:'flex', alignItems:'center', gap:14 }}>
      <div style={{ width:46, height:46, borderRadius:13, background:`${color}14`, color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:21, flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:0.5 }}>{label}</div>
        <div style={{ fontSize:24, fontWeight:900, color:'#0F172A', marginTop:2 }}>{value.toLocaleString()}</div>
      </div>
    </div>
  );
}

const thS = { padding:'11px 18px', fontSize:11, fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:0.5, cursor:'pointer', userSelect:'none', whiteSpace:'nowrap' };
const tdS = { padding:'13px 18px', verticalAlign:'middle' };
