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
  const [pullTarget,setPullTarget]= useState(null);
  const [selJob,    setSelJob]    = useState('');
  const [pulling,   setPulling]   = useState(false);
  const [search,    setSearch]    = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.getTalentPool(), api.getJobs()])
      .then(([poolRes, jobsRes]) => {
        setPool(Array.isArray(poolRes) ? poolRes : (poolRes?.data || []));
        const rawJobs = Array.isArray(jobsRes) ? jobsRes : (jobsRes?.data || []);
        setJobs(rawJobs.map(j => ({ ...j, id: j.id || j._id?.toString() })));
      })
      .catch(e => setToast(`❌ ${e.message}`))
      .finally(() => setLoading(false));
  }, []);

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
      await api.parkApplication(pullTarget.id || pullTarget._id?.toString());
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
      <PageHeader title="🅿️ Talent Pool" subtitle="Parked candidates available for future opportunities" />

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
                const cName = p.candidateId?.name  || 'Candidate';
                const email = p.candidateId?.email || '';
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
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => { setPullTarget(p); setSelJob(''); }}
                          style={{ ...btnP, fontSize: 12, padding: '6px 14px' }}>
                          ➕ Pull into Job
                        </button>
                        <button
                          onClick={() => handleUnpark(id)}
                          style={{ ...btnD, fontSize: 12 }}>
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
          title={`➕ Pull ${pullTarget.candidateId?.name || 'Candidate'} into a Job`}
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
    </div>
  );
}
