import { useState, useEffect } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Toast from '../../components/ui/Toast.jsx';
import { card, btnG, btnP } from '../../constants/styles.js';
import { api } from '../../api/api.js';

// ── Colour helpers ────────────────────────────────────────────────────────────
const ROLE_COLOR = {
  super_admin: { bg: 'linear-gradient(135deg,#7C3AED,#5B21B6)', label: 'Super Admin', badge: '#7C3AED' },
  admin:       { bg: 'linear-gradient(135deg,#0176D3,#014486)', label: 'Admin',       badge: '#0176D3' },
  recruiter:   { bg: 'linear-gradient(135deg,#059669,#065F46)', label: 'Recruiter',   badge: '#059669' },
};

// ── Single person card ────────────────────────────────────────────────────────
function PersonCard({ user: u, isCurrentUser }) {
  const rc = ROLE_COLOR[u.role] || ROLE_COLOR.recruiter;
  const initials = (u.name || '?').split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
  return (
    <div style={{
      background: '#fff',
      border: isCurrentUser ? '2px solid #0176D3' : '1px solid #E2E8F0',
      borderRadius: 14,
      padding: '16px 18px',
      minWidth: 180,
      maxWidth: 220,
      textAlign: 'center',
      boxShadow: isCurrentUser ? '0 4px 20px rgba(1,118,211,0.18)' : '0 2px 8px rgba(0,0,0,0.06)',
      position: 'relative',
      transition: 'box-shadow 0.2s',
      flex: '0 0 auto',
    }}>
      {isCurrentUser && (
        <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', background:'#0176D3', color:'#fff', fontSize:9, fontWeight:800, padding:'2px 10px', borderRadius:20, whiteSpace:'nowrap', letterSpacing:0.5 }}>
          YOU
        </div>
      )}
      {/* Avatar */}
      <div style={{ width:52, height:52, borderRadius:'50%', background:rc.bg, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:18, margin:'0 auto 10px', boxShadow:'0 4px 12px rgba(0,0,0,0.15)' }}>
        {initials}
      </div>
      {/* Online dot */}
      <div style={{ position:'absolute', top:16, right:16, width:10, height:10, borderRadius:'50%', background: u.isActive !== false ? '#34d399' : '#9CA3AF', border:'2px solid #fff' }} title={u.isActive !== false ? 'Active' : 'Inactive'} />
      {/* Name */}
      <div style={{ fontWeight:800, fontSize:13, color:'#0A1628', lineHeight:1.3, marginBottom:4 }}>{u.name || 'Unknown'}</div>
      {/* Title/Email */}
      {(u.title || u.jobRole) && <div style={{ fontSize:11, color:'#0176D3', fontWeight:600, marginBottom:3 }}>{u.title || u.jobRole}</div>}
      <div style={{ fontSize:11, color:'#94A3B8', marginBottom:8, wordBreak:'break-all' }}>{u.email}</div>
      {/* Role badge */}
      <span style={{ fontSize:10, fontWeight:800, color:'#fff', background:rc.badge, padding:'2px 10px', borderRadius:20, letterSpacing:0.3 }}>{rc.label}</span>
      {/* Stats row — only shown on recruiter cards (leaderboard data) */}
      {u.role === 'recruiter' && (
        <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:10, flexWrap:'wrap' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontWeight:900, fontSize:15, color:'#0A1628' }}>{u._jobCount ?? 0}</div>
            <div style={{ fontSize:9, color:'#94A3B8', fontWeight:600, textTransform:'uppercase' }}>Jobs</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontWeight:900, fontSize:15, color:'#0176D3' }}>{u._appCount ?? 0}</div>
            <div style={{ fontSize:9, color:'#94A3B8', fontWeight:600, textTransform:'uppercase' }}>Applicants</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontWeight:900, fontSize:15, color:'#059669' }}>{u._hired ?? 0}</div>
            <div style={{ fontSize:9, color:'#94A3B8', fontWeight:600, textTransform:'uppercase' }}>Hired</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Connector line (vertical) ────────────────────────────────────────────────
function VLine({ height = 32 }) {
  return <div style={{ width:2, height, background:'linear-gradient(to bottom,#CBD5E1,#E2E8F0)', margin:'0 auto', borderRadius:1 }} />;
}

// ── Horizontal connector spanning the cards ───────────────────────────────────
function HConnector({ count }) {
  if (count <= 1) return <VLine height={16} />;
  return (
    <div style={{ position:'relative', height:32 }}>
      {/* Vertical drop from parent */}
      <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:2, height:16, background:'#CBD5E1', borderRadius:1 }} />
      {/* Horizontal bar */}
      <div style={{ position:'absolute', top:16, left:0, right:0, height:2, background:'#CBD5E1', borderRadius:1 }} />
    </div>
  );
}

export default function OrgChart({ user }) {
  const [org,            setOrg]            = useState(null);
  const [admins,         setAdmins]         = useState([]);
  const [recruiters,     setRecruiters]     = useState([]);
  const [jobs,           setJobs]           = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [toast,          setToast]          = useState('');
  const [redistributing, setRedistributing] = useState(false);
  const [redistResult,   setRedistResult]   = useState(null);

  useEffect(() => {
    setLoading(true); setError('');
    Promise.all([
      api.getMyOrg().catch(() => null),
      api.getUsers({ role: 'admin',     limit: 200, isActive: true }).catch(() => []),
      api.getUsers({ role: 'recruiter', limit: 200, isActive: true }).catch(() => []),
      // Active jobs — used for KPI tile count only
      api.getJobs({ limit: 10000, status: 'active' }).catch(() => []),
      // Leaderboard — server-side aggregation of actual applications per recruiter (accurate counts)
      api.getRecruiterLeaderboard().catch(() => []),
    ]).then(([orgData, adminData, recruiterData, jobData, leaderboard]) => {
      setOrg(orgData);
      setAdmins(Array.isArray(adminData) ? adminData : []);

      // Normalise job array (handles paginated and flat responses)
      const jobArr = Array.isArray(jobData) ? jobData : (Array.isArray(jobData?.data) ? jobData.data : []);
      setJobs(jobArr);

      // Build a leaderboard lookup: recruiterId → { jobs, candidates, hired }
      const lbArr = Array.isArray(leaderboard) ? leaderboard : (Array.isArray(leaderboard?.data) ? leaderboard.data : []);
      const lbMap = {};
      lbArr.forEach(entry => {
        const id = entry.recruiterId?.toString() || entry._id?.toString() || entry.id?.toString() || '';
        if (id) lbMap[id] = entry;
      });

      // Enrich each recruiter with accurate stats from the leaderboard aggregation
      const enriched = (Array.isArray(recruiterData) ? recruiterData : []).map(r => {
        const rid = r._id?.toString() || r.id?.toString() || '';
        const lb  = lbMap[rid] || {};
        return {
          ...r,
          _jobCount: lb.jobs       ?? 0,
          _appCount: lb.candidates ?? 0,
          _hired:    lb.hired      ?? 0,
        };
      });
      setRecruiters(enriched);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeader title="🏢 Org Chart" subtitle="Your organisation's team hierarchy" />
        <div style={{ ...card, textAlign:'center', padding:'60px 24px', color:'#706E6B' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
          <div style={{ fontWeight:600 }}>Loading org chart…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="🏢 Org Chart" subtitle="Your organisation's team hierarchy" />
        <div style={{ ...card, background:'rgba(186,5,23,0.05)', border:'1px solid rgba(186,5,23,0.2)', color:'#BA0517', padding:20 }}>
          ❌ {error}
        </div>
      </div>
    );
  }

  const orgName    = org?.name || user?.orgName || 'Your Organisation';
  const orgPlan    = org?.plan || 'starter';
  const totalUsers = admins.length + recruiters.length;

  const handleRedistribute = async () => {
    if (!window.confirm(`Redistribute all active jobs equally across ${recruiters.length} recruiter${recruiters.length !== 1 ? 's' : ''}?\n\nThis will reassign every job in round-robin order. Existing assignments will be replaced.`)) return;
    setRedistributing(true); setRedistResult(null);
    try {
      const r = await api.redistributeJobs();
      setRedistResult(r);
      setToast(`✅ ${r.total} jobs redistributed across ${recruiters.length} recruiters`);
      // Refresh recruiter stats
      api.getRecruiterLeaderboard().then(lb => {
        const lbArr = Array.isArray(lb) ? lb : (Array.isArray(lb?.data) ? lb.data : []);
        const lbMap = {};
        lbArr.forEach(e => { const id = e.recruiterId?.toString() || e.id?.toString() || ''; if (id) lbMap[id] = e; });
        setRecruiters(prev => prev.map(r => {
          const rid = r._id?.toString() || r.id?.toString() || '';
          const lb = lbMap[rid] || {};
          return { ...r, _jobCount: lb.jobs ?? r._jobCount, _appCount: lb.candidates ?? r._appCount, _hired: lb.hired ?? r._hired };
        }));
      }).catch(() => {});
    } catch (e) {
      setToast(`❌ ${e.message}`);
    }
    setRedistributing(false);
  };

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      <PageHeader
        title="🏢 Org Chart"
        subtitle={`${orgName} · ${totalUsers} member${totalUsers !== 1 ? 's' : ''}`}
        action={
          recruiters.length > 0 && (
            <button onClick={handleRedistribute} disabled={redistributing} style={{ ...btnP, opacity: redistributing ? 0.7 : 1 }}>
              {redistributing ? 'Redistributing…' : '⚖️ Redistribute Jobs Equally'}
            </button>
          )
        }
      />

      {/* Redistribution result */}
      {redistResult && (
        <div style={{ ...card, marginBottom:20, background:'rgba(5,150,105,0.06)', border:'1px solid rgba(5,150,105,0.2)' }}>
          <div style={{ fontWeight:800, fontSize:13, color:'#059669', marginBottom:10 }}>
            ✅ {redistResult.total} jobs distributed equally across {redistResult.summary?.length} recruiters
          </div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {(redistResult.summary || []).map(s => (
              <div key={s.recruiterId} style={{ background:'#fff', borderRadius:10, padding:'8px 16px', border:'1px solid #D1FAE5', fontSize:13 }}>
                <span style={{ fontWeight:700, color:'#0A1628' }}>{s.name}</span>
                <span style={{ color:'#059669', fontWeight:800, marginLeft:8 }}>{s.jobsAssigned} jobs</span>
              </div>
            ))}
          </div>
          <button onClick={() => setRedistResult(null)} style={{ ...btnG, marginTop:10, fontSize:12 }}>Dismiss</button>
        </div>
      )}

      {/* Legend */}
      <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginBottom:24 }}>
        {[
          { color:'#7C3AED', label:'Super Admin' },
          { color:'#0176D3', label:'Admin' },
          { color:'#059669', label:'Recruiter' },
          { color:'#34d399', label:'Active' },
          { color:'#9CA3AF', label:'Inactive' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#64748B', fontWeight:600 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:color }} />
            {label}
          </div>
        ))}
      </div>

      {/* ── Tree container ─────────────────────────────────────────────────── */}
      <div style={{ overflowX:'auto', paddingBottom:24 }}>
        <div style={{ minWidth: 600, display:'flex', flexDirection:'column', alignItems:'center' }}>

          {/* ── Level 0: Org node ──────────────────────────────────────────── */}
          <div style={{ background:'linear-gradient(135deg,#0A1628,#1e3a5f)', borderRadius:18, padding:'18px 32px', color:'#fff', textAlign:'center', boxShadow:'0 8px 32px rgba(10,22,40,0.3)', minWidth:260 }}>
            <div style={{ fontSize:32, marginBottom:6 }}>🏢</div>
            <div style={{ fontWeight:900, fontSize:20, letterSpacing:0.5, marginBottom:4 }}>{orgName}</div>
            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap', marginTop:8 }}>
              <span style={{ fontSize:11, background:'rgba(255,255,255,0.12)', padding:'3px 12px', borderRadius:20, fontWeight:700 }}>
                {admins.length} Admin{admins.length !== 1 ? 's' : ''}
              </span>
              <span style={{ fontSize:11, background:'rgba(255,255,255,0.12)', padding:'3px 12px', borderRadius:20, fontWeight:700 }}>
                {recruiters.length} Recruiter{recruiters.length !== 1 ? 's' : ''}
              </span>
              <span style={{ fontSize:11, background:'rgba(255,255,255,0.12)', padding:'3px 12px', borderRadius:20, fontWeight:700, textTransform:'capitalize' }}>
                {orgPlan} Plan
              </span>
            </div>
          </div>

          {/* ── Connector: Org → Admins ────────────────────────────────────── */}
          {admins.length > 0 && (
            <>
              <VLine height={28} />
              <div style={{ fontSize:11, fontWeight:800, color:'#706E6B', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>Administration</div>
            </>
          )}

          {/* ── Level 1: Admins ──────────────────────────────────────────────── */}
          {admins.length > 0 && (
            <div style={{ display:'flex', gap:20, flexWrap:'wrap', justifyContent:'center', alignItems:'flex-start' }}>
              {admins.map(a => {
                const isMe = (a._id?.toString() || a.id) === (user?._id?.toString() || user?.id || user?.userId);
                return (
                  <PersonCard key={a._id || a.id} user={a} isCurrentUser={isMe} />
                );
              })}
            </div>
          )}

          {/* ── Connector: Admins → Recruiters ────────────────────────────── */}
          {recruiters.length > 0 && (
            <>
              <VLine height={28} />
              <div style={{ fontSize:11, fontWeight:800, color:'#706E6B', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>Recruitment Team</div>
            </>
          )}

          {/* ── Level 2: Recruiters ──────────────────────────────────────────── */}
          {recruiters.length > 0 && (
            <div style={{ display:'flex', gap:16, flexWrap:'wrap', justifyContent:'center', alignItems:'flex-start' }}>
              {recruiters.map(r => (
                <PersonCard key={r._id || r.id} user={r} isCurrentUser={false} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {admins.length === 0 && recruiters.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px 20px', color:'#706E6B' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>👥</div>
              <div style={{ fontWeight:600, marginBottom:6 }}>No team members found</div>
              <div style={{ fontSize:13 }}>Invite admins and recruiters from Org Settings to build your team.</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Summary stats ──────────────────────────────────────────────────── */}
      {(admins.length > 0 || recruiters.length > 0) && (
        <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginTop:8 }}>
          {[
            { label:'Total Members',   value: totalUsers,                                                            color:'#0176D3' },
            { label:'Admins',          value: admins.length,                                                         color:'#7C3AED' },
            { label:'Recruiters',      value: recruiters.length,                                                     color:'#059669' },
            { label:'Active Members',  value: [...admins,...recruiters].filter(u => u.isActive === true || u.isActive === undefined).length, color:'#34d399' },
            { label:'Active Jobs',     value: jobs.length,                                                           color:'#F59E0B' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ ...card, flex:'1 1 130px', textAlign:'center', padding:'14px 10px', borderTop:`3px solid ${color}` }}>
              <div style={{ fontWeight:900, fontSize:22, color:'#0A1628' }}>{value}</div>
              <div style={{ fontSize:11, color:'#706E6B', fontWeight:600, marginTop:2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
