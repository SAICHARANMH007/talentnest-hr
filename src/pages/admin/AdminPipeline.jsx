import { useState, useEffect, useCallback, useRef } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Badge from '../../components/ui/Badge.jsx';
import UserDetailDrawer from '../../components/shared/UserDetailDrawer.jsx';
import { STAGES, SM } from '../../constants/stages.js';
import { btnP, btnG, btnD, card, inp } from '../../constants/styles.js';
import { api, downloadBlob } from '../../api/api.js';

// ── Styles outside component ───────────────────────────────────────────────────
const S = {
  board: { display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12, minHeight: 200 },
  col: { minWidth: 220, width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0, scrollSnapAlign: 'start' },
  colHead: { padding: '10px 14px', borderRadius: '10px 10px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  colBody: { background: '#F3F2F2', borderRadius: '0 0 10px 10px', padding: 8, display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 100 },
  appCard: { background: '#fff', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'transform 0.15s, box-shadow 0.15s' },
  scoreBar: { height: 4, borderRadius: 2, marginTop: 6 },
  filters: { display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  emptyCol: { textAlign: 'center', padding: '24px 8px', color: '#9E9D9B', fontSize: 11 },
};

const STAGE_COLORS = {
  'Applied': '#706E6B', 'Screening': '#F59E0B', 'Shortlisted': '#0176D3',
  'Interview Round 1': '#a78bfa', 'Interview Round 2': '#7c3aed',
  'Offer': '#10b981', 'Hired': '#34d399', 'Rejected': '#BA0517',
};

function scoreColor(s) {
  if (s >= 75) return '#34d399';
  if (s >= 50) return '#F59E0B';
  return '#BA0517';
}

function toId(v) { if (!v) return ''; if (typeof v === 'object') return v.id || v._id?.toString() || ''; return String(v); }

function SkeletonCard() {
  return <div className="tn-skeleton" style={{ height: 76, borderRadius: 10 }} />;
}

export default function AdminPipeline({ user }) {
  const [apps,    setApps]    = useState([]);
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [toast,   setToast]   = useState('');
  const [jobFilter,  setJobFilter]  = useState('');
  const [stageFilter,setStageFilter]= useState('');
  const [drawerApp,  setDrawerApp]  = useState(null);
  const [movingId,   setMovingId]   = useState('');
  const dragId = useRef(null);

  const load = useCallback(() => {
    setLoading(true); setError('');
    const jobQ = jobFilter ? `?jobId=${jobFilter}` : '';
    Promise.all([
      api.getApplications(jobFilter ? { jobId: jobFilter } : {}),
      api.getJobs(),
    ]).then(([a, j]) => {
      setApps(Array.isArray(a) ? a : (a?.data || []));
      setJobs(Array.isArray(j) ? j : (j?.data || []));
    }).catch(e => { setError(e.message); setApps([]); setJobs([]); })
      .finally(() => setLoading(false));
  }, [jobFilter]);

  useEffect(() => { load(); }, [load]);

  const moveStage = async (appId, newStage) => {
    setMovingId(appId);
    try {
      await api.updateStage(appId, newStage, 'Moved by admin');
      setApps(prev => prev.map(a => (a.id || a._id?.toString()) === appId ? { ...a, stage: newStage } : a));
      setToast(`✅ Moved to ${SM[newStage]?.label || newStage}`);
    } catch (e) {
      setToast(`❌ ${e.message}`);
    }
    setMovingId('');
  };

  // Drag-and-drop handlers
  const onDragStart = (e, appId) => { dragId.current = appId; e.dataTransfer.effectAllowed = 'move'; };
  const onDragOver  = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const onDrop      = (e, stage) => { e.preventDefault(); if (dragId.current) { moveStage(dragId.current, stage); dragId.current = null; } };

  const displayedStages = stageFilter ? [SM[stageFilter]].filter(Boolean) : STAGES;
  const filteredApps = stageFilter ? apps.filter(a => (a.stage || a.currentStage) === stageFilter) : apps;

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      <PageHeader title="⚡ Pipeline" subtitle="Kanban view across all jobs" action={
        <button onClick={async () => {
          try {
            const blob = await downloadBlob('/applications/export');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'pipeline-export.xlsx'; a.click();
            URL.revokeObjectURL(url);
          } catch { setToast('❌ Export failed'); }
        }} style={{ ...btnG, fontSize: 12, padding: '7px 14px' }}>⬇ Export Pipeline</button>
      } />

      {/* Filters */}
      <div style={S.filters}>
        <select value={jobFilter} onChange={e => setJobFilter(e.target.value)} style={{ ...inp, width: 220 }}>
          <option value="">All Jobs</option>
          {jobs.map(j => <option key={j.id || j._id} value={j.id || j._id}>{j.title}</option>)}
        </select>
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} style={{ ...inp, width: 180 }}>
          <option value="">All Stages</option>
          {STAGES.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
        </select>
        <button onClick={load} style={btnG}>↻ Refresh</button>
        <span style={{ marginLeft: 'auto', color: '#706E6B', fontSize: 13 }}>{filteredApps.length} applications</span>
      </div>

      {error && (
        <div style={{ ...card, background: 'rgba(186,5,23,0.06)', border: '1px solid rgba(186,5,23,0.2)', color: '#BA0517', marginBottom: 16 }}>
          ❌ {error} <button onClick={load} style={{ ...btnG, marginLeft: 12 }}>Retry</button>
        </div>
      )}

      {/* Board */}
      <div style={S.board}>
        {displayedStages.map(stage => {
          const stageId = stage.id;
          const stageApps = filteredApps.filter(a => (a.stage || a.currentStage) === stageId);
          const color = stage.color || '#706E6B';
          return (
            <div key={stageId} style={S.col}>
              <div style={{ ...S.colHead, background: color }}>
                <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{stage.icon} {stage.label}</span>
                <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 10, padding: '1px 8px' }}>{stageApps.length}</span>
              </div>
              <div style={S.colBody} onDragOver={onDragOver} onDrop={e => onDrop(e, stageId)}>
                {loading ? (
                  [1,2].map(i => <SkeletonCard key={i} />)
                ) : stageApps.length === 0 ? (
                  <div style={S.emptyCol}>Drop here</div>
                ) : stageApps.map(a => {
                  const cName = a.candidateId?.name || a.candidate?.name || a.candidateName || 'Candidate';
                  const jTitle = a.jobId?.title || jobs.find(j => toId(j) === toId(a.jobId))?.title || '';
                  const score = a.aiMatchScore || 0;
                  const isMoving = movingId === (a.id || a._id?.toString());
                  return (
                    <div
                      key={a.id || a._id}
                      style={{ ...S.appCard, opacity: isMoving ? 0.5 : 1 }}
                      draggable
                      onDragStart={e => onDragStart(e, a.id || a._id?.toString())}
                      onClick={() => setDrawerApp(a)}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#181818', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cName}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: scoreColor(score), flexShrink: 0, marginLeft: 4 }}>{score}%</div>
                      </div>
                      {jTitle && <div style={{ fontSize: 11, color: '#706E6B', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{jTitle}</div>}
                      <div style={{ ...S.scoreBar, width: '100%', background: '#F3F2F2' }}>
                        <div style={{ ...S.scoreBar, width: `${score}%`, background: scoreColor(score) }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Candidate Detail Drawer */}
      {drawerApp && (
        <UserDetailDrawer
          user={drawerApp.candidateId || drawerApp.candidate}
          app={drawerApp}
          onClose={() => setDrawerApp(null)}
        />
      )}
    </div>
  );
}
