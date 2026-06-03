import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Field from '../../components/ui/Field.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { btnP, btnG, btnD, card } from '../../constants/styles.js';
import { fmtDateShort } from '../../utils/india.js';
import { api } from '../../api/api.js';
import UserDetailDrawer from '../../components/shared/UserDetailDrawer.jsx';

// ── Styles outside component ───────────────────────────────────────────────────
const S = {
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', borderBottom: '2px solid #F3F2F2' },
  td: { padding: '12px 14px', fontSize: 13, color: '#181818', borderBottom: '1px solid #F3F2F2', verticalAlign: 'middle' },
  empty: { textAlign: 'center', padding: '60px 24px', color: '#706E6B', fontSize: 14 },
};

export default function TalentPool({ user }) {
  const [pool,      setPool]      = useState([]);
  const [jobs,      setJobs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState('');
  const [orgPools,  setOrgPools]  = useState([]);
  const [orgPoolsLoading, setOrgPoolsLoading] = useState(true);
  const [expandedPool, setExpandedPool] = useState(null);
  const [activeTab, setActiveTab] = useState('org'); // 'org' | 'parked'
  const [pullTarget,setPullTarget]= useState(null);
  const [selJob,    setSelJob]    = useState('');
  const [pulling,   setPulling]   = useState(false);
  const [search,    setSearch]    = useState('');
  const [detailUser,setDetailUser]= useState(null);
  const [addToPoolTarget, setAddToPoolTarget] = useState(null); // parked app to add to org pool
  const [selPool,   setSelPool]   = useState('');
  const [addingToPool, setAddingToPool] = useState(false);
  const [syncing,   setSyncing]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.getParkedCandidates(), api.getJobs()])
      .then(([poolRes, jobsRes]) => {
        setPool(Array.isArray(poolRes) ? poolRes : (poolRes?.data || []));
        const rawJobs = Array.isArray(jobsRes) ? jobsRes : (jobsRes?.data || []);
        setJobs(rawJobs.map(j => ({ ...j, id: j.id || j._id?.toString() })));
      })
      .catch(e => setToast(`❌ ${e.message}`))
      .finally(() => setLoading(false));
  }, []);

  const loadOrgPools = (showSpinner = true) => {
    if (showSpinner) setOrgPoolsLoading(true);
    return api.getTalentPools()
      .then(data => setOrgPools(Array.isArray(data) ? data : []))
      .catch(() => setOrgPools([]))
      .finally(() => setOrgPoolsLoading(false));
  };

  useEffect(() => { loadOrgPools(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    await Promise.all([
      loadOrgPools(false),
      new Promise(resolve => {
        setLoading(true);
        Promise.all([api.getParkedCandidates(), api.getJobs()])
          .then(([poolRes, jobsRes]) => {
            setPool(Array.isArray(poolRes) ? poolRes : (poolRes?.data || []));
            const rawJobs = Array.isArray(jobsRes) ? jobsRes : (jobsRes?.data || []);
            setJobs(rawJobs.map(j => ({ ...j, id: j.id || j._id?.toString() })));
          })
          .catch(e => setToast(`❌ ${e.message}`))
          .finally(() => { setLoading(false); resolve(); });
      }),
    ]);
    setSyncing(false);
    setToast('✅ Talent pool synced');
  };

  const handleAddToPool = async () => {
    if (!addToPoolTarget || !selPool) return;
    setAddingToPool(true);
    try {
      const candidateId = addToPoolTarget.candidateId?._id || addToPoolTarget.candidateId?.id;
      await api.addTalentPoolMember(selPool, { candidateId });
      setToast('✅ Candidate added to org pool');
      setAddToPoolTarget(null);
      setSelPool('');
      loadOrgPools(false);
    } catch (e) { setToast(`❌ ${e.message}`); }
    setAddingToPool(false);
  };

  useEffect(() => { load(); }, [load]);

  const handleUnpark = async (appId) => {
    try {
      await api.parkApplication(appId);
      setToast('✅ Candidate removed from talent pool');
      load();
    } catch (e) { setToast(`❌ ${e.message}`); }
  };

  const handlePull = async () => {
    if (!pullTarget || !selJob) return;
    setPulling(true);
    try {
      const candidateId = pullTarget.candidateId?.id || pullTarget.candidateId?._id?.toString();
      await api.applyToJob(selJob, candidateId);
      if (!pullTarget._fromOrgPool) {
        await api.parkApplication(pullTarget.id || pullTarget._id?.toString());
      }
      setToast('✅ Candidate pulled into pipeline');
      setPullTarget(null);
      setSelJob('');
      load();
    } catch (e) { setToast(`❌ ${e.message}`); }
    setPulling(false);
  };

  const filtered = pool.filter(p => {
    const q = search.toLowerCase();
    if (!q) return true;
    const name  = (p.candidateId?.name  || '').toLowerCase();
    const email = (p.candidateId?.email || '').toLowerCase();
    const title = (p.jobId?.title       || '').toLowerCase();
    return name.includes(q) || email.includes(q) || title.includes(q);
  });

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12, marginBottom:4 }}>
        <PageHeader title="Talent Pool" subtitle="Org-curated talent pools and your parked candidates" />
        <button onClick={handleSync} disabled={syncing}
          style={{ ...btnG, display:'flex', alignItems:'center', gap:6, height:38, padding:'0 16px', fontSize:13, flexShrink:0, marginTop:4 }}>
          {syncing ? <><Spinner size={14} /> Syncing…</> : <>🔄 Sync</>}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #E2E8F0' }}>
        {[
          { id: 'org', label: `🏢 Org Pools${orgPools.length ? ` (${orgPools.length})` : ''}` },
          { id: 'parked', label: `🅿️ My Parked${pool.length ? ` (${pool.length})` : ''}` },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: '10px 20px', border: 'none', borderBottom: `3px solid ${activeTab === t.id ? '#0176D3' : 'transparent'}`, background: 'none', fontSize: 14, fontWeight: activeTab === t.id ? 700 : 500, color: activeTab === t.id ? '#0176D3' : '#64748b', cursor: 'pointer', marginBottom: -2 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Org Talent Pools tab ── */}
      {activeTab === 'org' && (
        <div>
          {orgPoolsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
          ) : orgPools.length === 0 ? (
            <div style={{ ...card, ...S.empty }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
              <div style={{ fontWeight: 600 }}>No org talent pools yet</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>Admins can create curated talent pools from the admin panel</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
              {orgPools.map(op => (
                <div key={op._id} style={{ ...card, padding: 20, cursor: 'pointer', border: expandedPool?._id === op._id ? '2px solid #0176D3' : '1px solid #E2E8F0' }}
                  onClick={() => setExpandedPool(expandedPool?._id === op._id ? null : op)}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#0F172A', marginBottom: 6 }}>{op.name}</div>
                  {op.description && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10, lineHeight: 1.5 }}>{op.description}</div>}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {(op.tags || []).map(t => <span key={t} style={{ background: '#EFF6FF', color: '#2563EB', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>{t}</span>)}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{op.members?.length || 0} candidate{op.members?.length !== 1 ? 's' : ''}</div>
                </div>
              ))}
            </div>
          )}
          {/* Expanded pool members */}
          {expandedPool && (
            <div style={{ ...card, marginTop: 20, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#0F172A' }}>{expandedPool.name} — Members</div>
                <button onClick={() => setExpandedPool(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}>✕</button>
              </div>
              {(!expandedPool.members || expandedPool.members.length === 0) ? (
                <div style={{ ...S.empty }}>
                  <div>No candidates in this pool yet.</div>
                </div>
              ) : (
                <table style={S.table}>
                  <thead>
                    <tr>{['Candidate','Title','Notes','Action'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {expandedPool.members.map(m => {
                      const cand = m.candidateId || {};
                      const cName = cand.name || cand.email?.split('@')[0] || '—';
                      return (
                        <tr key={m._id || cand._id}
                          onMouseEnter={e => e.currentTarget.style.background = '#FAFAF9'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}>
                          <td style={S.td}>
                            <div style={{ fontWeight: 600 }}>{cName}</div>
                            {cand.email && <div style={{ fontSize: 11, color: '#706E6B' }}>{cand.email}</div>}
                          </td>
                          <td style={S.td}>{cand.title || '—'}</td>
                          <td style={S.td}><span style={{ fontSize: 12, color: '#64748b' }}>{m.notes || '—'}</span></td>
                          <td style={S.td}>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                onClick={() => setDetailUser({ ...cand, role: 'candidate', _partial: true })}
                                style={{ ...btnG, fontSize: 12, padding: '6px 12px' }}>
                                👁️ View
                              </button>
                              <button
                                onClick={() => { setPullTarget({ candidateId: cand, _fromOrgPool: true }); setSelJob(''); }}
                                style={{ ...btnP, fontSize: 12, padding: '6px 14px' }}>
                                ➕ Pull into Job
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Parked Candidates tab ── */}
      {activeTab === 'parked' && (<>
      <div style={{ ...card, marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email or role…"
          style={{ width: '100%', padding: '9px 12px', border: '1px solid #DDDBDA', borderRadius: 4, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
        />
      </div>

      <div style={card}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🅿️</div>
            <div style={{ fontWeight: 600 }}>No candidates in talent pool</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Park candidates from the pipeline to hold them for future roles</div>
          </div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>{['Candidate','Last Applied For','Parked On','Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const id    = p.id || p._id?.toString();
                const email = p.candidateId?.email || '';
                const cName = p.candidateId?.name  || (email ? email.split('@')[0] : '—');
                const jTitle= p.jobId?.title || '—';
                const parkedAt = p.stageHistory?.findLast?.(h => h.stage === 'Talent Pool')?.movedAt || p.updatedAt;
                return (
                  <tr key={id}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFAF9'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600 }}>{cName}</div>
                      {email && <div style={{ fontSize: 11, color: '#706E6B' }}>{email}</div>}
                    </td>
                    <td style={S.td}>{jTitle}</td>
                    <td style={S.td}>{fmtDateShort(parkedAt)}</td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setDetailUser({ ...p.candidateId, role: 'candidate', _partial: true })}
                          style={{ ...btnG, fontSize: 12, padding: '6px 12px' }}>
                          👁️ View
                        </button>
                        <button
                          onClick={() => { setPullTarget(p); setSelJob(''); }}
                          style={{ ...btnP, fontSize: 12, padding: '6px 12px' }}>
                          ➕ Pull into Job
                        </button>
                        {orgPools.length > 0 && (
                          <button
                            onClick={() => { setAddToPoolTarget(p); setSelPool(''); }}
                            style={{ fontSize:12, padding:'6px 12px', background:'#fff', border:'1.5px solid #7C3AED', color:'#7C3AED', borderRadius:6, fontWeight:700, cursor:'pointer' }}>
                            🏢 Add to Pool
                          </button>
                        )}
                        <button
                          onClick={() => handleUnpark(id)}
                          style={{ ...btnD, fontSize: 12, padding: '6px 10px' }}>
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {pullTarget && (
        <Modal
          title={`➕ Pull ${pullTarget.candidateId?.name || pullTarget.candidateId?.email?.split('@')[0] || 'candidate'} into a Job`}
          onClose={() => setPullTarget(null)}
          footer={
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setPullTarget(null)} style={btnG}>Cancel</button>
              <button onClick={handlePull} disabled={!selJob || pulling} style={{ ...btnP, opacity: (!selJob || pulling) ? 0.5 : 1 }}>
                {pulling ? 'Pulling…' : '➕ Pull into Pipeline'}
              </button>
            </div>
          }>
          <div>
            <p style={{ color: '#706E6B', fontSize: 13, marginBottom: 16 }}>
              Select an active job to move this candidate into the Applied stage.
            </p>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 6 }}>SELECT JOB *</label>
            <select
              value={selJob}
              onChange={e => setSelJob(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #DDDBDA', borderRadius: 4, fontSize: 13, outline: 'none' }}>
              <option value="">— Choose a job —</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title} {j.company ? `@ ${j.company}` : ''}</option>)}
            </select>
          </div>
        </Modal>
      )}
      {addToPoolTarget && (
        <Modal
          title={`🏢 Add ${addToPoolTarget.candidateId?.name || addToPoolTarget.candidateId?.email?.split('@')[0] || 'candidate'} to Org Pool`}
          onClose={() => { setAddToPoolTarget(null); setSelPool(''); }}
          footer={
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => { setAddToPoolTarget(null); setSelPool(''); }} style={btnG}>Cancel</button>
              <button onClick={handleAddToPool} disabled={!selPool || addingToPool}
                style={{ background:'#7C3AED', color:'#fff', border:'none', borderRadius:8, padding:'8px 20px', fontWeight:700, fontSize:13, cursor:!selPool||addingToPool?'not-allowed':'pointer', opacity:!selPool||addingToPool?0.5:1 }}>
                {addingToPool ? 'Adding…' : '🏢 Add to Pool'}
              </button>
            </div>
          }>
          <div>
            <p style={{ color:'#706E6B', fontSize:13, marginBottom:16 }}>Select an org talent pool to add this candidate to.</p>
            <label style={{ fontSize:11, fontWeight:700, color:'#706E6B', display:'block', marginBottom:6 }}>SELECT POOL *</label>
            <select value={selPool} onChange={e => setSelPool(e.target.value)}
              style={{ width:'100%', padding:'9px 12px', border:'1px solid #DDDBDA', borderRadius:4, fontSize:13, outline:'none' }}>
              <option value="">— Choose a pool —</option>
              {orgPools.map(op => <option key={op._id} value={op._id}>{op.name}{op.members?.length ? ` (${op.members.length} members)` : ''}</option>)}
            </select>
          </div>
        </Modal>
      )}

      {detailUser && (
        <UserDetailDrawer
          user={detailUser}
          onClose={() => setDetailUser(null)}
          onUpdated={load}
        />
      )}
      </>)}
    </div>
  );
}
