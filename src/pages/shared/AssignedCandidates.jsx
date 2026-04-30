import { useState, useEffect } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Badge from '../../components/ui/Badge.jsx';
import UserDetailDrawer from '../../components/shared/UserDetailDrawer.jsx';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import { btnG, card } from '../../constants/styles.js';

const STAGE_COLOR = {
  Applied: '#64748b', Screening: '#0176D3', Shortlisted: '#7C3AED',
  'Interview Round 1': '#F59E0B', 'Interview Round 2': '#a78bfa',
  Offer: '#059669', Hired: '#2E844A', Rejected: '#e53e3e',
};
const STAGES = Object.keys(STAGE_COLOR);

export default function AssignedCandidates({ user }) {
  const navigate   = useNavigate();
  const [jobs,     setJobs]    = useState([]);
  const [apps,     setApps]    = useState([]);
  const [requests, setRequests]= useState([]);
  const [loading,  setLoad]    = useState(true);
  const [search,   setSearch]  = useState('');
  const [drawer,   setDrawer]  = useState(null);

  const isAdmin = ['admin', 'super_admin'].includes(user?.role);

  useEffect(() => {
    const fetches = [
      api.getJobs({}).catch(() => []),
      api.getApplications({ limit: 500 }).catch(() => []),
    ];
    if (!isAdmin) {
      // Recruiter: also fetch their own candidate requests that have been fulfilled
      fetches.push(api.getCandidateRequests().catch(() => []));
    }

    Promise.all(fetches).then(([j, a, r]) => {
      const allJobs = Array.isArray(j) ? j : (Array.isArray(j?.data) ? j.data : []);
      const allApps = Array.isArray(a) ? a : (Array.isArray(a?.data) ? a.data : []);

      if (isAdmin) {
        // Admin: show all jobs + all apps
        setJobs(allJobs);
        setApps(allApps);
      } else {
        // Recruiter: getJobs() already returns only assigned jobs for recruiter role
        const myJobIds = new Set(allJobs.map(j => String(j._id || j.id)));
        // Show only apps that belong to jobs assigned to me
        const myApps = allApps.filter(a => myJobIds.has(String(a.jobId?._id || a.jobId)));
        setJobs(allJobs);
        setApps(myApps);
        if (r) {
          const reqArr = Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : []);
          setRequests(reqArr.filter(req => req.status === 'in_progress' || req.status === 'fulfilled'));
        }
      }
    }).finally(() => setLoad(false));
  }, [user?.id, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredApps = apps.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    const c = a.candidateId || a.candidate || {};
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (a.jobId?.title || '').toLowerCase().includes(q)
    );
  });

  const changeStage = async (app, stage) => {
    try {
      const appId = app.id || app._id;
      await api.updateStage(appId, stage);
      setApps(prev => prev.map(a => (a.id || a._id) === appId
        ? { ...a, currentStage: stage, stage }
        : a));
    } catch (_e) {
      // Keep the page quiet; the Pipeline page still exposes the full error path.
    }
  };

  // Group apps by job
  const byJob = {};
  filteredApps.forEach(a => {
    const jid = String(a.jobId?._id || a.jobId || 'unknown');
    if (!byJob[jid]) byJob[jid] = { job: a.jobId, apps: [] };
    byJob[jid].apps.push(a);
  });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <Spinner />
    </div>
  );

  return (
    <div>
      {drawer && <UserDetailDrawer user={drawer} onClose={() => setDrawer(null)} />}

      <PageHeader
        title={isAdmin ? '🎯 Assignments Overview' : '🎯 Assigned to Me'}
        subtitle={isAdmin
          ? `${jobs.length} job${jobs.length !== 1 ? 's' : ''} · ${apps.length} application${apps.length !== 1 ? 's' : ''} across your organisation`
          : `${jobs.length} job${jobs.length !== 1 ? 's' : ''} assigned to you · ${apps.length} candidate${apps.length !== 1 ? 's' : ''}`}
      />

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by candidate name, email or job title…"
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 16px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, outline: 'none', background: '#F8FAFC' }}
        />
      </div>

      {/* Recruiter: show fulfilled candidate requests */}
      {!isAdmin && requests.length > 0 && (
        <div style={{ ...card, marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#0176D3', margin: '0 0 12px', letterSpacing: 1 }}>
            📨 YOUR STAFFING REQUESTS — CANDIDATES ASSIGNED
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {requests.map(r => (
              <div key={r.id || r._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{r.roleTitle}</div>
                  <div style={{ fontSize: 11, color: '#706E6B', marginTop: 2 }}>
                    {(r.submittedCandidates || []).length} candidate{(r.submittedCandidates || []).length !== 1 ? 's' : ''} assigned
                    {r.adminNotes && <span> · 📝 {r.adminNotes}</span>}
                  </div>
                </div>
                <Badge label={r.status.replace('_', ' ')} color={r.status === 'fulfilled' ? '#34d399' : '#0176D3'} />
              </div>
            ))}
          </div>
        </div>
      )}

      {jobs.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '60px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
          <h3 style={{ color: '#181818', fontWeight: 700, margin: '0 0 8px' }}>No assignments yet</h3>
          <p style={{ color: '#706E6B', fontSize: 14, margin: '0 0 20px' }}>
            {isAdmin ? 'Jobs and candidates will appear here once created.' : 'When an admin assigns jobs to you, they will appear here.'}
          </p>
          {isAdmin && (
            <button onClick={() => navigate('/app/candidates')} style={{ ...btnG, padding: '10px 20px', fontSize: 13 }}>
              Go to Candidates →
            </button>
          )}
        </div>
      ) : Object.keys(byJob).length === 0 && search ? (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#9E9D9B', fontSize: 13 }}>No candidates match "{search}".</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Jobs with no apps yet */}
          {!search && jobs.filter(j => !byJob[String(j._id || j.id)]).map(j => (
            <div key={j._id || j.id} style={{ ...card }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0A1628' }}>{j.title}</div>
                  <div style={{ fontSize: 12, color: '#706E6B', marginTop: 2 }}>{j.location} · {j.type} · <span style={{ color: '#9E9D9B' }}>0 applicants</span></div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Badge label={j.status || 'active'} color={j.status === 'active' ? '#34d399' : '#706E6B'} />
                  <button onClick={() => navigate('/app/pipeline')} style={{ ...btnG, padding: '5px 12px', fontSize: 11 }}>Pipeline →</button>
                </div>
              </div>
            </div>
          ))}

          {/* Jobs with applications */}
          {Object.entries(byJob).map(([jid, { job, apps: jobApps }]) => (
            <div key={jid} style={card}>
              {/* Job header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#0A1628' }}>
                    {job?.title || 'Unknown Job'}
                  </div>
                  <div style={{ fontSize: 12, color: '#706E6B', marginTop: 2 }}>
                    {job?.location && <span>📍 {job.location} · </span>}
                    {jobApps.length} candidate{jobApps.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <button onClick={() => navigate('/app/pipeline')} style={{ ...btnG, padding: '5px 14px', fontSize: 12 }}>
                  View Pipeline →
                </button>
              </div>

              {/* Candidate rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {jobApps.map(a => {
                  const c = a.candidateId || a.candidate || {};
                  const name = c.name || a.candidateName || 'Unknown';
                  const stage = a.currentStage || a.stage || 'Applied';
                  const stageColor = STAGE_COLOR[stage] || '#64748b';
                  return (
                    <div
                      key={a._id || a.id}
                      onClick={() => c._id && setDrawer(c)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, cursor: c._id ? 'pointer' : 'default', transition: 'all 0.15s' }}
                      onMouseEnter={e => { if (c._id) { e.currentTarget.style.borderColor = '#0176D3'; e.currentTarget.style.background = '#EFF6FF'; } }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#F8FAFC'; }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#032D60,#0176D3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                        {name[0]?.toUpperCase() || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#181818' }}>{name}</div>
                        <div style={{ fontSize: 11, color: '#706E6B' }}>
                          {c.email || ''}{c.phone ? ` · ${c.phone}` : ''}{c.title ? ` · ${c.title}` : ''}
                        </div>
                      </div>
                      <select
                        value={stage}
                        onClick={e => e.stopPropagation()}
                        onChange={e => changeStage(a, e.target.value)}
                        style={{ background: `${stageColor}18`, color: stageColor, border: `1px solid ${stageColor}40`, borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', outline: 'none', cursor: 'pointer' }}
                      >
                        {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
