import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import KpiCard from '../../components/charts/KpiCard.jsx';
import FunnelChart from '../../components/charts/FunnelChart.jsx';
import RingProgress from '../../components/charts/RingProgress.jsx';
import HorizBar from '../../components/charts/HorizBar.jsx';
import AreaChart from '../../components/charts/AreaChart.jsx';
import VertBarChart from '../../components/charts/VertBarChart.jsx';
import ActivityDot from '../../components/misc/ActivityDot.jsx';
import TimeAgo from '../../components/misc/TimeAgo.jsx';
import UserDetailDrawer from '../../components/shared/UserDetailDrawer.jsx';
import ErrorReportBoundary from '../../components/shared/ErrorReportBoundary.jsx';
import { STAGES, SM } from '../../constants/stages.js';
import { btnP, btnG, card } from '../../constants/styles.js';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';

// Helper: extract string ID from populated or raw field
const toId = (v) => { if (!v) return ''; if (typeof v === 'object') return v.id || v._id?.toString() || ''; return String(v); };

// Optimization: Job and Application lookup maps to prevent O(N*M) complexity

const SkeletonCard = () => (
  <div style={{background:'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.5s infinite',borderRadius:'12px',height:'80px',width:'100%'}} />
);

export default function RecruiterDashboard({ user }) {
  const navigate = useNavigate();
  const [stats,  setStats]  = useState(null);
  const [loading, setLoad]  = useState(true);
  const [drawerUser, setDrawerUser] = useState(null);
  const [drillDown, setDrillDown]   = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // Single aggregated call — backend computes all counts + pipeline in parallel.
    // No raw record dumps. Dashboard is instant regardless of candidate volume.
    api.getRecruiterStats()
      .then(r => {
        if (!cancelled) { setStats(r?.data || r); setError(null); }
      })
      .catch(e => { if (!cancelled) setError(e.message || 'Failed to connect to server'); })
      .finally(() => { if (!cancelled) setLoad(false); });
    return () => { cancelled = true; };
  }, [user.id]);

  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:300}}><Spinner /></div>;

  if (error) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:300, gap:16, background:'#fff', borderRadius:16, border:'1px solid #fee2e2', padding:24 }}>
      <span style={{ fontSize:32 }}>⚠️</span>
      <div style={{ textAlign:'center' }}>
        <h3 style={{ margin:0, color:'#991b1b' }}>Dashboard Sync Failed</h3>
        <p style={{ margin:'4px 0 0', color:'#b91c1c', fontSize:13 }}>{error}</p>
      </div>
      <button onClick={() => window.location.reload()} style={{ ...btnP, padding:'8px 24px' }}>↻ Retry Connection</button>
    </div>
  );

  // ── All values come from server-side aggregation — no raw record arrays ────
  const sd = stats || {};  // renamed from 's' to avoid shadowing in inner callbacks
  const totalApplicants = sd.totalApplicants || 0;
  const inInterview     = sd.inInterview     || 0;
  const hired           = sd.hired           || 0;
  const offerOut        = sd.offerOut        || 0;
  const rejected        = sd.rejected        || 0;
  const conversionRate  = sd.conversionRate  || 0;
  const activeApps      = totalApplicants - rejected - hired;
  const jobs            = Array.isArray(sd.jobs) ? sd.jobs : [];
  const pipelineMap     = sd.pipeline || {};

  // DB stage name → frontend lowercase ID (the backend stats endpoint doesn't
  // run normalizeApp on recent[], so we normalise here in the browser)
  const DB_STAGE_MAP = {
    Applied:'applied', Screening:'screening', Shortlisted:'shortlisted',
    'Interview Round 1':'interview_scheduled', 'Interview Round 2':'interview_completed',
    Offer:'offer_extended', Hired:'selected', Rejected:'rejected',
  };
  const normaliseApp = (a) => {
    const stg = a.stage || DB_STAGE_MAP[a.currentStage] || (a.currentStage||'').toLowerCase().replace(/\s+/g,'_') || 'applied';
    return {
      ...a,
      id       : a.id || a._id?.toString(),
      stage    : stg,
      candidate: a.candidate || (a.candidateId && typeof a.candidateId === 'object' ? a.candidateId : null),
      job      : a.job       || (a.jobId      && typeof a.jobId      === 'object' ? a.jobId      : null),
    };
  };

  // Recent activity — normalised so all subsequent code can use .stage and .candidate
  const recentActs = Array.isArray(sd.recent) ? sd.recent.map(normaliseApp).slice(0, 15) : [];

  // Upcoming interviews from recent activity
  const today = new Date(); today.setHours(0,0,0,0);
  const in7   = new Date(today.getTime() + 7 * 86400000);
  const upcomingInterviews = recentActs
    .filter(a => ['interview_scheduled','interview_completed'].includes(a.stage) && a.interviewRounds?.[0]?.scheduledAt)
    .map(a => ({ ...a, dateObj: new Date(a.interviewRounds[0].scheduledAt) }))
    .filter(a => a.dateObj >= today && a.dateObj <= in7)
    .sort((a, b) => a.dateObj - b.dateObj);

  // Funnel from pipeline map (server-computed). Use 'st' not 's' to avoid shadow.
  const funnelData = STAGES.filter(st => st.id !== 'rejected').map(st => ({
    ...st,
    count: Object.entries(pipelineMap).reduce((n, [k, v]) => n + ((DB_STAGE_MAP[k] || k) === st.id ? v : 0), 0),
  })).filter(st => st.count > 0 || ['applied','shortlisted','interview_scheduled','selected'].includes(st.id));


  // Job performance — jobs come from stats.jobs with accurate applicantsCount from aggregation
  const jobPerf = jobs.map(j => ({
    ...j,
    id  : j.id || j._id?.toString(),
    apps: j.applicantsCount || 0,
    // shortlisted/hired counts not available without loading all apps — show from pipeline totals as proxy
    shortlisted: 0, interviewed: 0,
    hired: 0,
    conv: j.applicantsCount > 0 ? Math.round((hired / totalApplicants) * 100) : 0,
  }));

  // Bar chart: only include jobs that have at least 1 application
  const appsPerJob = jobs
    .filter(j => (j.applicantsCount || 0) > 0)
    .slice(0, 12)
    .map(j => ({
      label  : (j.title || 'Job').split(' ').slice(0, 2).join(' '),
      value  : j.applicantsCount || 0,
      color  : '#0176D3',
      jobId  : String(j.id || j._id),
      jobTitle: j.title,
    }));

  // Drill-downs navigate to pipeline with filter — no need to load all records
  const openJobDrill = (bar) => { navigate(`/app/pipeline?job=${bar.jobId}`); };
  const openStageDrill = (seg) => { if (seg?.stageKey) navigate(`/app/pipeline?stage=${seg.stageKey}`); };

  const handlePark = async (appId, candName) => {
    try {
      await api.parkApplication(appId);
      setStats(prev => prev ? {
        ...prev,
        recent: (prev.recent || []).map(a => a.id === appId ? { ...a, status: 'parked' } : a)
      } : prev);
    } catch (e) { alert(`❌ ${e.message}`); }
  };

  return (
    <ErrorReportBoundary componentName="RecruiterDashboard">
      <div>
      {drawerUser && <UserDetailDrawer user={drawerUser} onClose={() => setDrawerUser(null)} />}
      <PageHeader title={`Welcome back, ${user.name?.split(" ")[0]} 👋`} subtitle={`${new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})} · ${activeApps > 0 ? `${activeApps} active candidates in pipeline` : 'Dashboard loaded instantly'}`} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:12, marginBottom:20 }}>
        <div style={{ cursor:"pointer" }} onClick={() => navigate("/app/jobs")}>
          <KpiCard icon="💼" label="Active Jobs"      value={jobs.filter(j => j.status === 'active' || j.status === 'Open').length} color="#0176D3" trend={8}  sparkValues={[1,2,2,3,3,jobs.length]} />
        </div>
        <div style={{ cursor:"pointer" }} onClick={() => navigate("/app/pipeline")}>
          <KpiCard icon="👥" label="Total Applicants" value={totalApplicants}    color="#014486" trend={15} sparkValues={[2,3,5,6,7,totalApplicants]} />
        </div>
        <div style={{ cursor:"pointer" }} onClick={() => navigate("/app/pipeline")}>
          <KpiCard icon="📅" label="In Interview"     value={inInterview}        color="#F59E0B" />
        </div>
        <div style={{ cursor:"pointer" }} onClick={() => navigate("/app/pipeline")}>
          <KpiCard icon="📨" label="Offer Extended"   value={offerOut}           color="#10b981" />
        </div>
        <div style={{ cursor:"pointer" }} onClick={() => navigate("/app/pipeline")}>
          <KpiCard icon="🎉" label="Hired"            value={hired} sub={`${conversionRate}% conv.`} color="#2E844A" trend={conversionRate} sparkValues={[0,0,1,1,1,hired]} />
        </div>
      </div>
      {/* ── Graph Row ─────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(min(280px,100%),1fr))', gap:16, marginBottom:20 }}>
        {/* Application Velocity — 14-day trend scoped to recruiter's assigned jobs */}
        <div style={{ ...card, display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ color:'#0176D3', fontSize:11, fontWeight:700, letterSpacing:1 }}>Application Velocity</div>
              <div style={{ color:'#9E9D9B', fontSize:10, marginTop:2 }}>Candidates joining pipeline — Last 14 days</div>
            </div>
            {Array.isArray(sd.trendData) && sd.trendData.length > 0 && (() => {
              const todayVal = sd.trendData[sd.trendData.length - 1]?.value ?? 0;
              const yestVal  = sd.trendData[sd.trendData.length - 2]?.value ?? 0;
              return (
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:22, fontWeight:900, color:'#0176D3', lineHeight:1 }}>{todayVal}</div>
                  <div style={{ fontSize:10, color:'#94A3B8', marginTop:2 }}>today{yestVal > 0 ? ` · ${yestVal} yesterday` : ''}</div>
                </div>
              );
            })()}
          </div>
          {Array.isArray(sd.trendData) && sd.trendData.some(d => d.value > 0) ? (
            <AreaChart data={sd.trendData} color="#0176D3" height={160} onItemClick={() => navigate('/app/applicants')} />
          ) : (
            <div style={{ height:120, display:'flex', alignItems:'center', justifyContent:'center', color:'#CBD5E1', flexDirection:'column', gap:8 }}>
              <span style={{ fontSize:28 }}>📈</span>
              <span style={{ fontSize:12, fontWeight:600 }}>No applications in last 14 days</span>
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
            <p style={{ color:'#94A3B8', fontSize:10, margin:0 }}>Click chart to open applicant records</p>
            <button onClick={() => navigate('/app/applicants')} style={{ ...btnG, padding:'5px 12px', fontSize:11 }}>Open Applicants</button>
          </div>
        </div>
        <div style={{ ...card }}>
          {appsPerJob.length > 0 ? (
            <VertBarChart data={appsPerJob} defaultColor="#0176D3" height={150} title="💼 Applications by Job" subtitle="Click a bar to view pipeline for that job" onItemClick={openJobDrill} />
          ) : (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ color:'#0176D3', fontSize:11, fontWeight:700, letterSpacing:1, marginBottom:8 }}>💼 APPLICATIONS BY JOB</div>
              <p style={{ color:'#9E9D9B', fontSize:12, margin:'0 0 10px' }}>{jobs.length === 0 ? 'No jobs assigned yet.' : 'No applications received yet.'}</p>
              <button onClick={() => navigate(jobs.length === 0 ? '/app/jobs' : '/app/pipeline')} style={{ ...btnG, padding:'6px 14px', fontSize:12 }}>{jobs.length === 0 ? 'View Jobs →' : 'Open Pipeline →'}</button>
            </div>
          )}
        </div>
        {/* Top Jobs by applicant volume — unique, not a duplicate of FunnelChart */}
        <div style={{ ...card }}>
          <div style={{ color:'#0176D3', fontSize:11, fontWeight:700, letterSpacing:1, marginBottom:12 }}>🏆 TOP JOBS BY APPLICANTS</div>
          {jobs.length === 0 ? (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <p style={{ color:'#9E9D9B', fontSize:12, margin:'0 0 10px' }}>No jobs assigned yet.</p>
              <button onClick={() => navigate('/app/jobs')} style={{ ...btnG, padding:'6px 14px', fontSize:12 }}>View Jobs →</button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {jobs.slice(0,5).sort((a,b) => (b.applicantsCount||0)-(a.applicantsCount||0)).map(j => {
                const count = j.applicantsCount || 0;
                const maxCount = Math.max(...jobs.map(x => x.applicantsCount||0), 1);
                const pct = Math.round((count/maxCount)*100);
                return (
                  <div key={j.id||j._id} onClick={() => navigate(`/app/pipeline?job=${j.id||j._id}`)} style={{ cursor:'pointer' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:12 }}>
                      <span style={{ color:'#181818', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'75%' }}>{j.title}</span>
                      <span style={{ color:'#0176D3', fontWeight:800, flexShrink:0 }}>{count}</span>
                    </div>
                    <div style={{ height:5, background:'#F1F5F9', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#0176D3,#00C2CB)', borderRadius:3, transition:'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
              <button onClick={() => navigate('/app/applicants')} style={{ ...btnG, padding:'6px 14px', fontSize:12, marginTop:4 }}>All Applicant Records →</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(300px,100%),1fr))", gap:20, marginBottom:20 }}>
        <div style={{ ...card, cursor:"pointer" }} onClick={() => navigate("/app/pipeline")}>
          <p style={{ color:"#0176D3", fontSize:11, fontWeight:700, margin:"0 0 14px", letterSpacing:1 }}>🔄 HIRING FUNNEL <span style={{ color:"#9E9D9B", fontSize:10, fontWeight:400 }}>— click to manage pipeline</span></p>
          <FunnelChart data={funnelData} />
          <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid #F3F2F2", display:"flex", gap:16 }}>
            <div style={{ textAlign:"center" }}><div style={{ color:"#BA0517", fontWeight:700, fontSize:16 }}>{rejected}</div><div style={{ color:"#706E6B", fontSize:10 }}>Rejected</div></div>
            <div style={{ textAlign:"center" }}><div style={{ color:"#2E844A", fontWeight:700, fontSize:16 }}>{hired}</div><div style={{ color:"#706E6B", fontSize:10 }}>Hired</div></div>
            <div style={{ textAlign:"center" }}><div style={{ color:"#0176D3", fontWeight:700, fontSize:16 }}>{activeApps}</div><div style={{ color:"#706E6B", fontSize:10 }}>Active</div></div>
            <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"flex-end" }}>
              <RingProgress pct={conversionRate} color="#2E844A" size={52} label="" sublabel="" />
              <div style={{ marginLeft:8 }}><div style={{ color:"#181818", fontSize:11, fontWeight:600 }}>Conversion</div><div style={{ color:"#706E6B", fontSize:10 }}>applied → hired</div></div>
            </div>
          </div>
        </div>
        <div style={card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <p style={{ color:"#0176D3", fontSize:11, fontWeight:700, margin:0, letterSpacing:1 }}>📅 UPCOMING INTERVIEWS</p>
            <Badge label={`${upcomingInterviews.length} this week`} color="#F59E0B" />
          </div>
          {upcomingInterviews.length === 0 ? (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <p style={{ color:"#9E9D9B", fontSize:13 }}>No interviews scheduled this week</p>
              <button onClick={() => navigate("/app/pipeline")} style={{ ...btnG, padding:"7px 14px", fontSize:12, marginTop:8 }}>Go to Pipeline →</button>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {upcomingInterviews.map(a => {
                const iv = a.interviewRounds[0]; // guaranteed by upcomingInterviews filter
                const ivDate = new Date(iv.scheduledAt);
                return (
                <div key={a.id} onClick={() => { const c = a.candidateId || a.candidate; c ? setDrawerUser({ role:'candidate', ...c, id: c.id||c._id?.toString() }) : navigate("/app/candidates"); }} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", background:"rgba(245,158,11,0.08)", borderRadius:12, border:"1px solid rgba(245,158,11,0.2)", cursor:"pointer" }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:"rgba(245,158,11,0.2)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <div style={{ color:"#F59E0B", fontSize:13, fontWeight:700, lineHeight:1 }}>{ivDate.getDate()}</div>
                    <div style={{ color:"#706E6B", fontSize:8 }}>{ivDate.toLocaleString("en",{month:"short"})}</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ color:"#181818", fontWeight:600, fontSize:13 }}>{(a.candidateId||a.candidate)?.name}</div>
                    <div style={{ color:"#0176D3", fontSize:11 }}>{a.jobId?.title}</div>
                    <div style={{ color:"#706E6B", fontSize:10 }}>{iv.format==="video"?"📹 Video":iv.format==="phone"?"📞 Phone":iv.format==="technical"?"💻 Technical":"🏢 In-Person"}</div>
                  </div>
                  {(iv.videoLink || iv.meetLink) && <a href={iv.videoLink || iv.meetLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color:"#0176D3", fontSize:11, textDecoration:"none" }}>🔗</a>}
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div style={{ ...card, marginBottom:20 }}>
        <p style={{ color:"#0176D3", fontSize:11, fontWeight:700, margin:"0 0 14px", letterSpacing:1 }}>💼 JOB PERFORMANCE</p>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth: 560 }}>
            <thead>
              <tr>{["Job","Company","Urgency","Applicants","Shortlisted","Interviewed","Hired","Conversion"].map(h => (
                <th key={h} style={{ color:"#0176D3", fontSize:10, fontWeight:700, textAlign:"left", padding:"0 12px 10px", whiteSpace:"nowrap", letterSpacing:0.5 }}>{h.toUpperCase()}</th>
              ))}</tr>
            </thead>
            <tbody>
              {jobPerf.map((j,i) => (
                <tr key={j.id} onClick={() => navigate("/app/jobs")} style={{ borderTop:"1px solid #F3F2F2", cursor:"pointer" }}>
                  <td style={{ color:"#181818", fontSize:12, fontWeight:600, padding:"10px 12px", whiteSpace:"nowrap" }}>{j.title}</td>
                  <td style={{ color:"#706E6B", fontSize:12, padding:"10px 12px", whiteSpace:"nowrap" }}>{j.companyName || j.company}</td>
                  <td style={{ padding:"10px 12px" }}><Badge label={j.urgency} color={j.urgency==="High"?"#BA0517":j.urgency==="Medium"?"#A07E00":"#2E844A"} /></td>
                  <td style={{ color:"#181818", fontSize:13, fontWeight:600, padding:"10px 12px", textAlign:"center" }}>{j.apps}</td>
                  <td style={{ color:"#A07E00", fontSize:13, fontWeight:600, padding:"10px 12px", textAlign:"center" }}>{j.shortlisted}</td>
                  <td style={{ color:"#0176D3", fontSize:13, fontWeight:600, padding:"10px 12px", textAlign:"center" }}>{j.interviewed}</td>
                  <td style={{ color:"#2E844A", fontSize:13, fontWeight:600, padding:"10px 12px", textAlign:"center" }}>{j.hired}</td>
                  <td style={{ padding:"10px 12px", minWidth:100 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <HorizBar value={j.conv} max={100} color={j.conv>=30?"#2E844A":j.conv>=15?"#A07E00":"#0176D3"} height={5} />
                      <span style={{ color:"#706E6B", fontSize:10, minWidth:28 }}>{j.conv}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Admin-Assigned Candidates Section — from recent 20 apps in stats */}
      {(() => {
        const adminAssigned = recentActs.filter(a => a.addedBy && String(a.addedBy) !== String(user.id));
        if (adminAssigned.length === 0) return null;
        return (
          <div style={{ ...card, marginBottom:20, borderLeft:'4px solid #0176D3' }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div>
                <p style={{ color:"#0176D3", fontSize:11, fontWeight:700, margin:"0 0 2px", letterSpacing:1 }}>🎯 CANDIDATES ASSIGNED TO YOUR JOBS</p>
                <p style={{ color:"#706E6B", fontSize:11, margin:0 }}>Added by admin / super admin — ready for your review</p>
              </div>
              <span style={{ background:"rgba(1,118,211,0.1)", color:"#0176D3", borderRadius:20, padding:"3px 12px", fontSize:12, fontWeight:700 }}>{adminAssigned.length}</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {adminAssigned.slice(0,6).map(a => {
                const stg2 = SM[a.stage]||{color:"#0176D3",label:a.stage||'',icon:"•"};
                const cand = a.candidateId || a.candidate;
                return (
                  <div key={a.id} onClick={() => cand ? setDrawerUser({ role:'candidate', ...cand, id: cand.id||cand._id?.toString() }) : navigate("/app/candidates")} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"rgba(1,118,211,0.04)", borderRadius:10, border:"1px solid rgba(1,118,211,0.15)", cursor:"pointer", flexWrap:"wrap" }}
                    onMouseEnter={e => e.currentTarget.style.background="rgba(1,118,211,0.08)"}
                    onMouseLeave={e => e.currentTarget.style.background="rgba(1,118,211,0.04)"}>
                    <div style={{ width:36,height:36,borderRadius:"50%",background:"#0176D3",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:14,flexShrink:0 }}>
                      {(cand?.name||"?")[0].toUpperCase()}
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ color:"#181818",fontWeight:600,fontSize:13 }}>{cand?.name || a.candidateName || a.candidate?.name || 'Candidate'}</div>
                      <div style={{ color:"#706E6B",fontSize:11,marginTop:1 }}>{cand?.title||""}{a.jobId?.title ? ` · for ${a.jobId.title}` : ""}</div>
                    </div>
                    <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                      <span style={{ background:`${stg2.color}15`,color:stg2.color,border:`1px solid ${stg2.color}40`,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600 }}>{stg2.icon} {stg2.label}</span>
                      <span style={{ background:"rgba(1,118,211,0.1)",color:"#0176D3",borderRadius:4,padding:"2px 7px",fontSize:10,fontWeight:600 }}>Admin</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {adminAssigned.length > 6 && (
              <button onClick={() => navigate("/app/pipeline")} style={{ ...btnG, marginTop:12, padding:"6px 14px", fontSize:12, width:"100%" }}>
                View all {adminAssigned.length} admin-assigned candidates →
              </button>
            )}
          </div>
        );
      })()}

      {/* Interested Candidates from Invites */}
      {(sd.interestedInvites || 0) > 0 && (
        <div style={{ ...card, marginBottom:20, borderLeft:'4px solid #2E844A' }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div>
              <p style={{ color:"#2E844A", fontSize:11, fontWeight:700, margin:"0 0 2px", letterSpacing:1 }}>🎉 INTERESTED CANDIDATES</p>
              <p style={{ color:"#706E6B", fontSize:11, margin:0 }}>Candidates who responded Interested to your invites — click to view profile</p>
            </div>
            <span style={{ background:"rgba(46,132,74,0.1)", color:"#2E844A", borderRadius:20, padding:"3px 12px", fontSize:12, fontWeight:700 }}>{sd.interestedInvites || 0}</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {(recentActs.filter(a => a.inviteStatus === 'interested')).slice(0,8).map(inv => {
              const invCand = inv.candidateId || inv.candidate;
              const invName = invCand?.name || 'Candidate';
              const invEmail = invCand?.email || '';
              const invJob = inv.jobId?.title || '';
              const openInvDrawer = () => invCand ? setDrawerUser({ role:'candidate', ...invCand, id: invCand.id||invCand._id?.toString() }) : navigate("/app/candidates");
              return (
              <div key={inv.id} onClick={openInvDrawer} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"rgba(46,132,74,0.04)", borderRadius:10, border:"1px solid rgba(46,132,74,0.2)", cursor:"pointer", flexWrap:"wrap" }}
                onMouseEnter={e => e.currentTarget.style.background="rgba(46,132,74,0.1)"}
                onMouseLeave={e => e.currentTarget.style.background="rgba(46,132,74,0.04)"}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:"#2E844A", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:14, flexShrink:0 }}>
                  {invName[0].toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:"#181818", fontWeight:600, fontSize:13 }}>{invName}</div>
                  <div style={{ color:"#706E6B", fontSize:11, marginTop:1 }}>{invEmail}{invJob ? ` · for ${invJob}` : ''}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); openInvDrawer(); }} style={{ background: 'none', border: 'none', color: '#0176D3', fontSize: 14, cursor: 'pointer', padding: 8 }}>✏️</button>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <span style={{ background:"rgba(46,132,74,0.15)", color:"#2E844A", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:600 }}>✅ Interested</span>
                  <span style={{ color:"#9E9D9B", fontSize:10 }}>{inv.respondedAt ? new Date(inv.respondedAt).toLocaleDateString() : ''}</span>
                </div>
              </div>
              );
            })}
          </div>
          {(sd.interestedInvites || 0) > 8 && (
            <button onClick={() => navigate("/app/outreach")} style={{ ...btnG, marginTop:12, padding:"6px 14px", fontSize:12, width:"100%" }}>
              View all {sd.interestedInvites} interested candidates →
            </button>
          )}
        </div>
      )}

      <div style={card}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <p style={{ color:"#0176D3", fontSize:11, fontWeight:700, margin:0, letterSpacing:1 }}>⚡ RECENT ACTIVITY</p>
          <button onClick={() => navigate("/app/pipeline")} style={{ ...btnG, padding:"5px 12px", fontSize:11 }}>View Pipeline →</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {recentActs.map(a => {
            const lastH = a.stageHistory?.[a.stageHistory.length-1];
            const stg = SM[a.stage]||{color:"#0176D3",label:a.stage||''};
            const candObj = a.candidateId || a.candidate;
            const candName = candObj?.name || a.candidateName || candObj?.email?.split('@')[0] || 'Unknown Candidate';
            const openDrawer = () => {
              if (!candObj) { navigate("/app/candidates"); return; }
              setDrawerUser({ role: 'candidate', ...candObj, id: candObj.id || candObj._id?.toString() });
            };
            return (
              <div key={a.id || a._id} onClick={openDrawer} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"#FAFAFA", borderRadius:10, border:"1px solid #F3F2F2", cursor:"pointer", flexWrap:"wrap" }}>
                <ActivityDot stage={a.stage} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ color:"#181818", fontSize:12, fontWeight:600, whiteSpace:"nowrap" }}>{candName}</span>
                    <span style={{ color:"#9E9D9B", fontSize:11 }}>→</span>
                    <span style={{ color:stg.color, fontSize:11, fontWeight:500 }}>{stg.label}</span>
                  </div>
                  <div style={{ color:"#706E6B", fontSize:11, marginTop:1 }}>{a.jobId?.title || 'Job'} @ {a.jobId?.companyName || a.jobId?.company || 'Internal'}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); openDrawer(); }} style={{ background: 'none', border: 'none', color: '#0176D3', fontSize: 14, cursor: 'pointer', padding: 8 }}>✏️</button>
                <button onClick={(e) => { e.stopPropagation(); handlePark(a.id, candName); }} style={{ background: 'none', border: 'none', color: '#F59E0B', fontSize: 14, cursor: 'pointer', padding: 8 }} title="Park Candidate">🅿️</button>
                <TimeAgo date={lastH?.movedAt||a.updatedAt||a.createdAt} />
              </div>
            );
          })}
          {recentActs.length === 0 && <p style={{ color:"#9E9D9B", fontSize:13, textAlign:"center", padding:"20px 0" }}>No recent activity yet.</p>}
        </div>
      </div>

      {/* ── Drill-down Overlay ── */}
      {drillDown && (
        <div className="tn-drill-overlay" style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px', overflowY:'auto', background:'rgba(5,13,26,0.45)', backdropFilter:'blur(8px)' }} onClick={e => { if (e.target === e.currentTarget) setDrillDown(null); }}>
          <div className="tn-drill-modal" style={{ width:'100%', maxWidth:720, background:'#fff', borderRadius:24, position:'relative', display:'flex', flexDirection:'column', maxHeight:'calc(100dvh - 48px)', boxShadow:'0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ padding:'16px clamp(16px,4vw,28px)', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <h3 style={{ margin:0, fontSize:'clamp(15px,4vw,20px)', fontWeight:800, color:'#0A1628', minWidth:0, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{drillDown.title}</h3>
              <button onClick={() => setDrillDown(null)} style={{ width:36, height:36, border:'none', background:'#F8FAFC', borderRadius:10, cursor:'pointer', fontSize:16, flexShrink:0, marginLeft:12 }}>✕</button>
            </div>
            <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'12px clamp(12px,4vw,28px) 28px' }}>
              {drillDown.items.length === 0 && <p style={{ color:'#94A3B8', textAlign:'center', padding:'40px 0' }}>No records found.</p>}
              {drillDown.items.map((item, idx) => {
                const stg3 = SM[item.stage] || { color:'#0176D3', label: item.stage || '' };
                const rawCand = item.candidateId || item.candidate;
                const candObj = rawCand && typeof rawCand === 'object'
                  ? { role:'candidate', ...rawCand, id: rawCand.id || rawCand._id?.toString() }
                  : null;
                const openCandDrawer = () => { if (candObj) setDrawerUser(candObj); };
                return (
                  <div key={item.id || item._id || idx} onClick={openCandDrawer} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 0', borderBottom:'1px solid #F8FAFC', cursor: candObj ? 'pointer' : 'default', flexWrap:'wrap' }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:'#0176D3', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:13, flexShrink:0 }}>
                      {(item._displayName || candObj?.name || 'C')[0].toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, color:'#0A1628', fontSize:13 }}>{item._displayName || candObj?.name || item.candidateName || 'Candidate'}</div>
                      <div style={{ color:'#706E6B', fontSize:11, marginTop:1 }}>{item._displaySub || `${item.jobId?.title || ''}`}</div>
                    </div>
                    <span style={{ background:`${stg3.color}15`, color:stg3.color, border:`1px solid ${stg3.color}33`, borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>{stg3.label}</span>
                    <button onClick={(e) => { e.stopPropagation(); handlePark(item.id, item._displayName || candObj?.name || 'Candidate'); }} style={{ background:'none', border:'none', color:'#F59E0B', fontSize:14, cursor:'pointer', padding:8 }} title="Park Candidate">🅿️</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      </div>
    </ErrorReportBoundary>
  );
}
