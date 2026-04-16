import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import KpiCard from '../../components/charts/KpiCard.jsx';
import RingProgress from '../../components/charts/RingProgress.jsx';
import HorizBar from '../../components/charts/HorizBar.jsx';
import InterviewCountdown from '../../components/misc/InterviewCountdown.jsx';
import { STAGES } from '../../constants/stages.js';
import { btnP, btnG, card } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const SkeletonCard = () => (
  <div style={{background:'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.5s infinite',borderRadius:'12px',height:'80px',width:'100%'}} />
);

export default function CandidateDashboard({ user }) {
  const navigate = useNavigate();
  const [jobs, setJobs]   = useState([]);
  const [apps, setApps]   = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoad] = useState(true);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.getMatchedJobs(user.id),
      api.getMyApplications(),
      api.getUser(user.id),
    ]).then(([j,a,p]) => { if (!cancelled) { setJobs(Array.isArray(j)?j:(j?.data||[])); setApps(Array.isArray(a)?a:(a?.data||[])); setProfile(p?.data||p); } }).catch(() => { if (!cancelled) { setJobs([]); setApps([]); } }).finally(() => { if (!cancelled) setLoad(false); });
    return () => { cancelled = true; };
  }, [user.id]);

  const apply = async (jobId) => { try { await api.applyToJob(jobId, user.id); setToast("✅ Applied!"); const [j,a] = await Promise.all([api.getMatchedJobs(user.id),api.getApplications({candidateId:user.id})]); setJobs(Array.isArray(j)?j:(j?.data||[])); setApps(Array.isArray(a)?a:(a?.data||[])); } catch(e) { setToast(`❌ ${e.message}`); } };

  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:300}}><Spinner /></div>;

  const stageCounts = STAGES.reduce((a,s) => { a[s.id]=apps.filter(ap=>ap.stage===s.id).length; return a; }, {});
  const nextInterview = apps.find(a => a.stage==="interview_scheduled" && a.interviewRounds?.[0]?.scheduledAt);

  // Weighted profile strength
  const PROFILE_WEIGHTS = [
    { f:"name",       w:15, label:"Full Name" },
    { f:"title",      w:12, label:"Job Title / Role" },
    { f:"skills",     w:12, label:"Skills" },
    { f:"phone",      w:10, label:"Phone" },
    { f:"summary",    w:10, label:"Summary / Bio" },
    { f:"experience", w:10, label:"Years of Experience" },
    { f:"location",   w:8,  label:"Location" },
    { f:"linkedin",   w:6,  label:"LinkedIn" },
    { f:"education",  w:7,  label:"Education" },
    { f:"certifications", w:5, label:"Certifications" },
    { f:"avatar",     w:5,  label:"Profile Photo" },
  ];
  const totalWeight = PROFILE_WEIGHTS.reduce((s,x)=>s+x.w,0);
  const earnedWeight = PROFILE_WEIGHTS.reduce((s,x) => {
    const val = profile?.[x.f];
    const filled = val && (Array.isArray(val) ? val.length > 0 : String(val).trim() !== "");
    return s + (filled ? x.w : 0);
  }, 0);
  const profilePct = Math.round((earnedWeight / totalWeight) * 100);
  const firstMissing = PROFILE_WEIGHTS.find(x => {
    const val = profile?.[x.f];
    return !val || (Array.isArray(val) ? val.length === 0 : String(val).trim() === "");
  });

  const profileFields = ["name","title","skills","location","summary","phone","experience"];
  const filledFields  = profileFields.filter(f => profile?.[f] && String(profile[f]).trim() !== "");
  const activeApps    = apps.filter(a => !["rejected","selected"].includes(a.stage)).length;
  const appliedCount  = apps.length;
  const shortlisted   = apps.filter(a => ["shortlisted","interview_scheduled","interview_completed","offer_extended","selected"].includes(a.stage)).length;
  const successRate   = appliedCount > 0 ? Math.round((shortlisted/appliedCount)*100) : 0;

  return (
    <div style={{ animation: 'tn-fadein 0.3s ease both' }}>
      <Toast msg={toast} onClose={() => setToast("")} />
      <PageHeader title={`Welcome back, ${user.name?.split(" ")[0]} 👋`} subtitle={new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})} />

      {/* ── Profile Strength Bar ── */}
      <div
        onClick={() => navigate("/app/profile")}
        style={{ background:"#fff", border:"1px solid #E5E7EB", borderRadius:12, padding:"12px 18px", marginBottom:20, cursor:"pointer", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}
      >
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6, flexWrap:"wrap", gap:4 }}>
          <span style={{ fontSize:12, fontWeight:700, color:profilePct>=80?"#2E844A":profilePct>=50?"#A07E00":"#BA0517" }}>
            {profilePct>=80?"🟢":profilePct>=50?"🟡":"🔴"} Profile Strength — {profilePct}%
          </span>
          <span style={{ fontSize:11, color:"#706E6B" }}>
            {profilePct===100 ? "✨ Perfect! You'll appear in top searches." : firstMissing ? `Add ${firstMissing.label} to boost →` : "Almost there!"}
          </span>
        </div>
        <div style={{ background:"#F3F4F6", borderRadius:99, height:8, overflow:"hidden" }}>
          <div style={{ width:`${profilePct}%`, height:"100%", borderRadius:99, background: profilePct>=80?"linear-gradient(90deg,#22c55e,#16a34a)":profilePct>=50?"linear-gradient(90deg,#f59e0b,#d97706)":"linear-gradient(90deg,#ef4444,#dc2626)", transition:"width 0.6s ease" }} />
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12, marginBottom:20 }}>
        <div style={{ cursor:"pointer" }} onClick={() => navigate("/app/applications")}>
          <KpiCard icon="📋" label="Applications Sent"  value={appliedCount}  color="#0176D3" trend={12} sparkValues={[1,2,2,3,3,appliedCount]} />
        </div>
        <div style={{ cursor:"pointer" }} onClick={() => navigate("/app/applications")}>
          <KpiCard icon="⭐" label="Shortlisted"         value={shortlisted}   color="#A07E00" trend={5}  sparkValues={[0,1,1,1,2,shortlisted]} />
        </div>
        <div style={{ cursor:"pointer" }} onClick={() => navigate("/app/applications")}>
          <KpiCard icon="📅" label="Active Processes"   value={activeApps}    color="#0176D3" />
        </div>
        <div style={{ cursor:"pointer" }} onClick={() => navigate("/app/applications")}>
          <KpiCard icon="🎯" label="Success Rate"        value={`${successRate}%`} color="#2E844A" sub="shortlist / applied" />
        </div>
      </div>

      <div className="dash-split" style={{ marginBottom:20 }}>
        {nextInterview ? (
          <div
            onClick={() => navigate("/app/applications")}
            style={{ ...card, background:"linear-gradient(135deg,rgba(245,158,11,0.12),rgba(251,191,36,0.06))", border:"1px solid rgba(245,158,11,0.3)", cursor:"pointer" }}
          >
            <div className="tn-interview-hdr" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ color:"#F59E0B", fontSize:11, fontWeight:700, margin:"0 0 4px", letterSpacing:1 }}>⏰ NEXT INTERVIEW</p>
                <p style={{ color:"#181818", fontWeight:700, fontSize:16, margin:"0 0 2px" }}>{nextInterview.jobId?.title}</p>
                <p style={{ color:"#0176D3", fontSize:12, margin:"0 0 10px" }}>{nextInterview.jobId?.companyName}</p>
                {(() => {
                  const iv = nextInterview.interviewRounds?.[0] || {};
                  const ivDate = iv.scheduledAt ? new Date(iv.scheduledAt).toLocaleDateString() : '';
                  return (
                    <>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {ivDate && <Badge label={`📅 ${ivDate}`} color="#F59E0B" />}
                        <Badge label={iv.type==="video"?"📹 Video":iv.type==="phone"?"📞 Phone":iv.type==="technical"?"💻 Technical":"🏢 In-Person"} color="#F59E0B" />
                      </div>
                      {iv.notes && <p style={{ color:"#706E6B", fontSize:11, marginTop:8 }}>💬 {iv.notes}</p>}
                      {iv.meetLink && <a href={iv.meetLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color:"#0176D3", fontSize:12, marginTop:6, display:"block" }}>🔗 Join Link</a>}
                    </>
                  );
                })()}
              </div>
              <div className="tn-interview-countdown" style={{ textAlign:"center", flexShrink:0 }}>
                <p style={{ color:"#F59E0B", fontSize:10, margin:"0 0 6px", fontWeight:600 }}>COUNTDOWN</p>
                <InterviewCountdown date={nextInterview.interviewRounds?.[0]?.scheduledAt} time={null} />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ ...card, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:8, background:"rgba(1,118,211,0.04)" }}>
            <span style={{ fontSize:32 }}>📅</span>
            <p style={{ color:"#706E6B", fontSize:13, margin:0 }}>No upcoming interviews</p>
            <button onClick={() => navigate("/app/ai-match")} style={{ ...btnP, padding:"7px 16px", fontSize:12, marginTop:4 }}>🤖 Find matching jobs</button>
          </div>
        )}
        <div style={{ ...card, cursor:"pointer" }} onClick={() => navigate("/app/profile")}>
          <p style={{ color:"#0176D3", fontSize:11, fontWeight:700, margin:"0 0 14px", letterSpacing:1 }}>PROFILE SCORE</p>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <RingProgress pct={profilePct} color={profilePct>=80?"#2E844A":profilePct>=60?"#A07E00":"#BA0517"} size={72} />
            <div style={{ flex:1 }}>
              {profileFields.map(f => {
                const filled = profile?.[f] && String(profile[f]).trim() !== "";
                return (
                  <div key={f} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                    <span style={{ color:filled?"#3BA755":"#9E9D9B", fontSize:10 }}>{filled?"✓":"○"}</span>
                    <span style={{ color:filled?"#706E6B":"#9E9D9B", fontSize:11, textTransform:"capitalize" }}>{f}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {profilePct < 100 && <button onClick={e => { e.stopPropagation(); navigate("/app/profile"); }} style={{ ...btnG, width:"100%", marginTop:12, padding:"7px 0", fontSize:11, textAlign:"center" }}>✏️ Complete Profile</button>}
        </div>
      </div>
      {apps.length > 0 && (
        <div style={{ ...card, marginBottom:20 }}>
          <p style={{ color:"#0176D3", fontSize:11, fontWeight:700, margin:"0 0 14px", letterSpacing:1 }}>MY PIPELINE</p>
          <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4 }}>
            {STAGES.filter(s=>s.id!=="rejected").map(s => {
              const cnt = stageCounts[s.id] || 0;
              return (
                <div key={s.id} onClick={() => navigate("/app/applications")} style={{ flexShrink:0, minWidth:80, padding:"10px 12px", background:cnt>0?`${s.color}18`:"rgba(255,255,255,0.03)", borderRadius:12, border:`1px solid ${cnt>0?s.color+"33":"#F3F2F2"}`, textAlign:"center", cursor:"pointer" }}>
                  <div style={{ fontSize:16, marginBottom:4 }}>{s.icon}</div>
                  <div style={{ color:cnt>0?s.color:"#9E9D9B", fontWeight:700, fontSize:18 }}>{cnt}</div>
                  <div style={{ color:"#706E6B", fontSize:9, marginTop:2, whiteSpace:"nowrap" }}>{s.label}</div>
                </div>
              );
            })}
            <div onClick={() => navigate("/app/applications")} style={{ flexShrink:0, minWidth:80, padding:"10px 12px", background:stageCounts.rejected>0?"rgba(186,5,23,0.1)":"rgba(255,255,255,0.03)", borderRadius:12, border:`1px solid ${stageCounts.rejected>0?"rgba(186,5,23,0.3)":"#F3F2F2"}`, textAlign:"center", cursor:"pointer" }}>
              <div style={{ fontSize:16, marginBottom:4 }}>✕</div>
              <div style={{ color:stageCounts.rejected>0?"#BA0517":"#9E9D9B", fontWeight:700, fontSize:18 }}>{stageCounts.rejected||0}</div>
              <div style={{ color:"#706E6B", fontSize:9, marginTop:2 }}>Rejected</div>
            </div>
          </div>
        </div>
      )}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <p style={{ color:"#0176D3", fontSize:11, fontWeight:700, margin:0, letterSpacing:1 }}>🤖 AI-MATCHED JOBS</p>
        <button onClick={() => navigate("/app/ai-match")} style={{ ...btnG, padding:"5px 12px", fontSize:11 }}>Search more →</button>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {jobs.slice(0,4).map(j => {
          const jStrId = String(j._id || j.id || '');
          const applied = apps.some(a => {
            const aid = a.jobId?.id || a.jobId?._id?.toString() || String(a.jobId || '');
            return aid === jStrId;
          });
          return (
            <div key={String(j._id || j.id)} onClick={() => navigate("/app/ai-match")} style={{ ...card, border:"1px solid #F3F2F2", cursor:"pointer" }}>
              <div className="tn-job-card-row" style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                    <span style={{ color:"#181818", fontWeight:600, fontSize:14 }}>{j.title}</span>
                    <Badge label={`${j.matchScore}% match`} color={j.matchScore>=80?"#2E844A":j.matchScore>=60?"#A07E00":"#BA0517"} />
                    {applied && <Badge label="✓ Applied" color="#2E844A" />}
                  </div>
                  <div style={{ color:"#0176D3", fontSize:12 }}>{j.companyName || j.company} · {j.location}</div>
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:8 }}>
                    {(Array.isArray(j.skills) ? j.skills : (j.skills || '').split(',').map(s => s.trim()).filter(Boolean)).slice(0,4).map(s => <Badge key={s} label={s.trim()} color="#0154A4" />)}
                  </div>
                  <div style={{ marginTop:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ color:"#706E6B", fontSize:10 }}>Match strength</span>
                      <span style={{ color:j.matchScore>=80?"#3BA755":"#A07E00", fontSize:10, fontWeight:600 }}>{j.matchScore}%</span>
                    </div>
                    <HorizBar value={j.matchScore} max={100} color={j.matchScore>=80?"#2E844A":j.matchScore>=60?"#A07E00":"#0176D3"} height={4} />
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); apply(j._id || j.id); }} disabled={applied} style={{ ...btnP, opacity:applied?0.5:1, cursor:applied?"default":"pointer", flexShrink:0 }}>
                  {applied ? "Applied" : "Apply"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes tn-fadein {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
