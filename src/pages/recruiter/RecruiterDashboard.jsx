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
import DonutChart from '../../components/charts/DonutChart.jsx';
import ActivityDot from '../../components/misc/ActivityDot.jsx';
import TimeAgo from '../../components/misc/TimeAgo.jsx';
import UserDetailDrawer from '../../components/shared/UserDetailDrawer.jsx';
import ErrorReportBoundary from '../../components/shared/ErrorReportBoundary.jsx';
import { STAGES, SM } from '../../constants/stages.js';
import { btnG, card } from '../../constants/styles.js';
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
  const [jobs, setJobs]   = useState([]);
  const [apps, setApps]   = useState([]);
  const [loading, setLoad] = useState(true);
  const [drawerUser, setDrawerUser] = useState(null);
  const [drillDown, setDrillDown] = useState(null); // { title, items }
  const [interestedInvites, setInterestedInvites] = useState([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.getJobs(user.id),
      api.getApplications({}),
      api.getInvites({ status: 'interested' }).catch(() => []),
    ]).then(([j, a, inv]) => {
      if (!cancelled) {
        const jArr = Array.isArray(j) ? j : (j?.data || []);
        const aArr = Array.isArray(a) ? a : (a?.data || []);
        setJobs(jArr);
        
        // Optimization: Use a Set for O(1) job lookup during application filtering
        const jobIds = new Set(jArr.map(jb => String(jb.id || jb._id)));
        setApps(aArr.filter(ap => jobIds.has(toId(ap.jobId))));

        const invArr = Array.isArray(inv) ? inv : (inv?.data || []);
        setInterestedInvites(invArr.filter(i => i.status === 'interested'));
      }
    }).catch(() => {}).finally(() => { if (!cancelled) setLoad(false); });
    return () => { cancelled = true; };
  }, [user.id]);

  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:300}}><Spinner /></div>;

  const myApps = apps;
  const totalApplicants = myApps.length;
  const inInterview     = myApps.filter(a => ["interview_scheduled","interview_completed"].includes(a.stage)).length;
  const hired           = myApps.filter(a => a.stage==="selected").length;
  const offerOut        = myApps.filter(a => a.stage==="offer_extended").length;
  const rejected        = myApps.filter(a => a.stage==="rejected").length;
  const conversionRate  = totalApplicants > 0 ? Math.round((hired/totalApplicants)*100) : 0;
  const activeApps      = myApps.filter(a => !["rejected","selected"].includes(a.stage)).length;

  const today = new Date(); today.setHours(0,0,0,0);
  const in7   = new Date(today.getTime()+7*86400000);
  const upcomingInterviews = myApps
    .filter(a => ['interview_scheduled','interview_completed'].includes(a.stage) && a.interviewRounds?.[0]?.scheduledAt)
    .map(a => ({ ...a, dateObj: new Date(a.interviewRounds[0].scheduledAt) }))
    .filter(a => a.dateObj >= today && a.dateObj <= in7)
    .sort((a,b) => a.dateObj - b.dateObj);

  const funnelData = STAGES.filter(s=>s.id!=="rejected").map(s => ({ ...s, count:myApps.filter(a=>a.stage===s.id).length })).filter(s=>s.count>0||["applied","shortlisted","interview_scheduled","selected"].includes(s.id));

  // Optimization: Pre-group applications by jobId for O(1) access
  const appsByJob = React.useMemo(() => {
    const map = new Map();
    apps.forEach(a => {
      const jid = toId(a.jobId);
      if (!map.has(jid)) map.set(jid, []);
      map.get(jid).push(a);
    });
    return map;
  }, [apps]);

  const jobPerf = jobs.map(j => {
    const jid = String(j.id || j._id);
    const ja = appsByJob.get(jid) || [];
    return { 
      ...j, 
      apps: ja.length, 
      shortlisted: ja.filter(a => ["shortlisted","interview_scheduled","interview_completed","offer_extended","selected"].includes(a.stage)).length, 
      interviewed: ja.filter(a => ["interview_scheduled","interview_completed","offer_extended","selected"].includes(a.stage)).length, 
      hired: ja.filter(a => a.stage === "selected").length, 
      conv: ja.length > 0 ? Math.round((ja.filter(a => a.stage === "selected").length / ja.length) * 100) : 0 
    };
  });

  const recentActs = [...myApps].sort((a,b) => {
    const la = a.stageHistory?.[a.stageHistory.length-1]?.changedAt || a.createdAt;
    const lb = b.stageHistory?.[b.stageHistory.length-1]?.changedAt || b.createdAt;
    return new Date(lb)-new Date(la);
  }).slice(0,6);

  // Applications trend — last 14 days
  const appsTrend = (() => {
    const days = 14;
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
      const key = d.toISOString().slice(0,10);
      const label = d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
      const value = myApps.filter(a => (a.createdAt||'').slice(0,10) === key).length;
      result.push({ label, value });
    }
    return result;
  })();

  // Applications per job (bar chart)
  const appsPerJob = jobs.slice(0,7).map(j => ({
    label: j.title?.split(' ')[0] || 'Job',
    value: (appsByJob.get(String(j.id || j._id)) || []).length,
    color: '#0176D3',
    jobId: String(j.id || j._id),
    jobTitle: j.title,
  }));

  // Stage donut data — stageKey used by openStageDrill for filtering
  const stageDonut = [
    { label: 'Applied',     value: myApps.filter(a=>a.stage==='applied').length,              color: '#0176D3', stageKey: 'applied' },
    { label: 'Screening',   value: myApps.filter(a=>a.stage==='screening').length,             color: '#014486', stageKey: 'screening' },
    { label: 'Shortlisted', value: myApps.filter(a=>a.stage==='shortlisted').length,           color: '#F59E0B', stageKey: 'shortlisted' },
    { label: 'Interview',   value: myApps.filter(a=>['interview_scheduled','interview_completed'].includes(a.stage)).length, color: '#8b5cf6', stageKey: 'interview_scheduled' },
    { label: 'Offer',       value: myApps.filter(a=>a.stage==='offer_extended').length,        color: '#10b981', stageKey: 'offer_extended' },
    { label: 'Hired',       value: myApps.filter(a=>a.stage==='selected').length,              color: '#2E844A', stageKey: 'selected' },
    { label: 'Rejected',    value: myApps.filter(a=>a.stage==='rejected').length,              color: '#BA0517', stageKey: 'rejected' },
  ];

  const openJobDrill = (bar) => {
    const items = myApps
      .filter(a => toId(a.jobId) === bar.jobId)
      .map(a => ({ ...a, _displayName: a.candidateId?.name || a.candidateName || a.candidate?.name || 'Candidate', _displaySub: `${STAGES.find(s=>s.id===a.stage)?.label||a.stage}` }));
    setDrillDown({ title: `${bar.jobTitle || bar.label} — Applicants (${items.length})`, items });
  };

  const openStageDrill = (seg) => {
    if (!seg || !seg.stageKey) return;
    const items = myApps
      .filter(a => a.stage === seg.stageKey)
      .map(a => ({ ...a, _displayName: a.candidateId?.name || a.candidateName || a.candidate?.name || 'Candidate', _displaySub: `${a.jobId?.title || 'Unknown Job'}` }));
    setDrillDown({ title: `${seg.label} (${items.length})`, items });
  };

  return (
    <ErrorReportBoundary componentName="RecruiterDashboard">
      <div>
      {drawerUser && <UserDetailDrawer user={drawerUser} onClose={() => setDrawerUser(null)} />}
      <PageHeader title={`Welcome back, ${user.name?.split(" ")[0]} 👋`} subtitle={`${new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})} · ${activeApps} active candidates in pipeline`} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:12, marginBottom:20 }}>
        <div style={{ cursor:"pointer" }} onClick={() => navigate("/app/jobs")}>
          <KpiCard icon="💼" label="Jobs Posted"      value={jobs.length}        color="#0176D3" trend={8}  sparkValues={[1,2,2,3,3,jobs.length]} />
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
        <div style={{ ...card }}>
          <AreaChart data={appsTrend} color="#0176D3" height={130} title="📈 Applications (14 days)" subtitle="New applications over time" />
        </div>
        <div style={{ ...card }}>
          <VertBarChart data={appsPerJob} defaultColor="#0176D3" height={150} title="💼 Applications by Job" subtitle="Click bar to drill down" onItemClick={openJobDrill} />
        </div>
        <div style={{ ...card }}>
          <DonutChart segments={stageDonut} size={120} title="🔄 Stage Breakdown" centerValue={totalApplicants} centerLabel="total" onItemClick={openStageDrill} />
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
                <div key={a.id} onClick={() => a.candidateId ? setDrawerUser(a.candidateId) : navigate("/app/candidates")} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", background:"rgba(245,158,11,0.08)", borderRadius:12, border:"1px solid rgba(245,158,11,0.2)", cursor:"pointer" }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:"rgba(245,158,11,0.2)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <div style={{ color:"#F59E0B", fontSize:13, fontWeight:700, lineHeight:1 }}>{ivDate.getDate()}</div>
                    <div style={{ color:"#706E6B", fontSize:8 }}>{ivDate.toLocaleString("en",{month:"short"})}</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ color:"#181818", fontWeight:600, fontSize:13 }}>{a.candidateId?.name}</div>
                    <div style={{ color:"#0176D3", fontSize:11 }}>{a.jobId?.title}</div>
                    <div style={{ color:"#706E6B", fontSize:10 }}>{iv.type==="video"?"📹 Video":iv.type==="phone"?"📞 Phone":iv.type==="technical"?"💻 Technical":"🏢 In-Person"}</div>
                  </div>
                  {iv.meetLink && <a href={iv.meetLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color:"#0176D3", fontSize:11, textDecoration:"none" }}>🔗</a>}
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
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
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
      {/* Admin-Assigned Candidates Section */}
      {(() => {
        const adminAssigned = myApps.filter(a => a.addedBy && String(a.addedBy) !== String(user.id));
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
                const s = SM[a.stage]||{color:"#0176D3",label:a.stage,icon:"•"};
                const cand = a.candidateId;
                return (
                  <div key={a.id} onClick={() => cand ? setDrawerUser(cand) : navigate("/app/candidates")} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:"rgba(1,118,211,0.04)", borderRadius:10, border:"1px solid rgba(1,118,211,0.15)", cursor:"pointer" }}
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
                      <span style={{ background:`${s.color}15`,color:s.color,border:`1px solid ${s.color}40`,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600 }}>{s.icon} {s.label}</span>
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
      {interestedInvites.length > 0 && (
        <div style={{ ...card, marginBottom:20, borderLeft:'4px solid #2E844A' }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div>
              <p style={{ color:"#2E844A", fontSize:11, fontWeight:700, margin:"0 0 2px", letterSpacing:1 }}>🎉 INTERESTED CANDIDATES</p>
              <p style={{ color:"#706E6B", fontSize:11, margin:0 }}>Candidates who responded Interested to your invites — click to view profile</p>
            </div>
            <span style={{ background:"rgba(46,132,74,0.1)", color:"#2E844A", borderRadius:20, padding:"3px 12px", fontSize:12, fontWeight:700 }}>{interestedInvites.length}</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {interestedInvites.slice(0,8).map(inv => {
              const invCand = inv.candidateId;
              const invName = invCand?.name || 'Candidate';
              const invEmail = invCand?.email || '';
              const invJob = inv.jobId?.title || '';
              return (
              <div key={inv.id} onClick={() => invCand ? setDrawerUser(invCand) : navigate("/app/candidates")} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:"rgba(46,132,74,0.04)", borderRadius:10, border:"1px solid rgba(46,132,74,0.2)", cursor:"pointer" }}
                onMouseEnter={e => e.currentTarget.style.background="rgba(46,132,74,0.1)"}
                onMouseLeave={e => e.currentTarget.style.background="rgba(46,132,74,0.04)"}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:"#2E844A", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:14, flexShrink:0 }}>
                  {invName[0].toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:"#181818", fontWeight:600, fontSize:13 }}>{invName}</div>
                  <div style={{ color:"#706E6B", fontSize:11, marginTop:1 }}>{invEmail}{invJob ? ` · for ${invJob}` : ''}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setDrawerUser(invCand || inv.candidate); }} style={{ background: 'none', border: 'none', color: '#0176D3', fontSize: 14, cursor: 'pointer', padding: 8 }}>✏️</button>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <span style={{ background:"rgba(46,132,74,0.15)", color:"#2E844A", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:600 }}>✅ Interested</span>
                  <span style={{ color:"#9E9D9B", fontSize:10 }}>{inv.respondedAt ? new Date(inv.respondedAt).toLocaleDateString() : ''}</span>
                </div>
              </div>
              );
            })}
          </div>
          {interestedInvites.length > 8 && (
            <button onClick={() => navigate("/app/outreach")} style={{ ...btnG, marginTop:12, padding:"6px 14px", fontSize:12, width:"100%" }}>
              View all {interestedInvites.length} interested candidates →
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
            const s = SM[a.stage]||{color:"#0176D3",label:a.stage};
            const candName = a.candidateId?.name || a.candidateName || 'Candidate';
            return (
              <div key={a.id || a._id} onClick={() => a.candidateId ? setDrawerUser(a.candidateId) : navigate("/app/candidates")} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", background:"#FAFAFA", borderRadius:10, border:"1px solid #F3F2F2", cursor:"pointer" }}>
                <ActivityDot stage={a.stage} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ color:"#181818", fontSize:12, fontWeight:600, whiteSpace:"nowrap" }}>{candName}</span>
                    <span style={{ color:"#9E9D9B", fontSize:11 }}>→</span>
                    <span style={{ color:s.color, fontSize:11, fontWeight:500 }}>{s.label}</span>
                  </div>
                  <div style={{ color:"#706E6B", fontSize:11, marginTop:1 }}>{a.jobId?.title || 'Job'} @ {a.jobId?.companyName || a.jobId?.company || 'Internal'}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setDrawerUser(a.candidateId || a.candidate); }} style={{ background: 'none', border: 'none', color: '#0176D3', fontSize: 14, cursor: 'pointer', padding: 8 }}>✏️</button>
                <TimeAgo date={lastH?.changedAt||a.createdAt} />
              </div>
            );
          })}
          {recentActs.length === 0 && <p style={{ color:"#9E9D9B", fontSize:13, textAlign:"center", padding:"20px 0" }}>No recent activity yet.</p>}
        </div>
      </div>

      {/* ── Drill-down Overlay ── */}
      {drillDown && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'32px 20px', overflowY:'auto', background:'rgba(5,13,26,0.45)', backdropFilter:'blur(8px)' }} onClick={e => { if (e.target === e.currentTarget) setDrillDown(null); }}>
          <div style={{ width:'100%', maxWidth:720, background:'#fff', borderRadius:24, position:'relative', display:'flex', flexDirection:'column', margin:'auto 0', boxShadow:'0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ padding:'20px 28px', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ margin:0, fontSize:20, fontWeight:800, color:'#0A1628' }}>{drillDown.title}</h3>
              <button onClick={() => setDrillDown(null)} style={{ width:36, height:36, border:'none', background:'#F8FAFC', borderRadius:10, cursor:'pointer', fontSize:16 }}>✕</button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'12px 28px 28px' }}>
              {drillDown.items.length === 0 && <p style={{ color:'#94A3B8', textAlign:'center', padding:'40px 0' }}>No records found.</p>}
              {drillDown.items.map((item, idx) => {
                const s = SM[item.stage] || { color:'#0176D3', label: item.stage };
                const cand = item.candidateId;
                return (
                  <div key={item.id || item._id || idx} onClick={() => cand ? setDrawerUser(cand) : null} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:'1px solid #F8FAFC', cursor: cand ? 'pointer' : 'default' }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:'#0176D3', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:13, flexShrink:0 }}>
                      {(item._displayName || cand?.name || 'C')[0].toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, color:'#0A1628', fontSize:13 }}>{item._displayName || cand?.name || item.candidateName || 'Candidate'}</div>
                      <div style={{ color:'#706E6B', fontSize:11, marginTop:1 }}>{item._displaySub || `${item.jobId?.title || ''}`}</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setDrawerUser(cand || item.candidate || item); }} style={{ background: 'none', border: 'none', color: '#0176D3', fontSize: 14, cursor: 'pointer', padding: 8 }}>✏️</button>
                    <span style={{ background:`${s.color}15`, color:s.color, border:`1px solid ${s.color}33`, borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>{s.label}</span>
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
