import React, { useState, useEffect, useCallback, useRef } from 'react';

function useIsMobile() {
  const [m, setM] = React.useState(() => window.innerWidth < 640);
  React.useEffect(() => {
    const h = () => setM(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
}
import { useNavigate } from 'react-router-dom';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import KpiCard from '../../components/charts/KpiCard.jsx';

import HorizBar from '../../components/charts/HorizBar.jsx';
import InterviewCountdown from '../../components/misc/InterviewCountdown.jsx';
import ReferralHub from '../../components/candidate/ReferralHub.jsx';
import { STAGES } from '../../constants/stages.js';
import { btnP, btnG, card } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const SkeletonCard = () => (
  <div style={{background:'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.5s infinite',borderRadius:'12px',height:'80px',width:'100%'}} />
);

export default function CandidateDashboard({ user }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [jobs, setJobs]     = useState([]);
  const [apps, setApps]     = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoad]  = useState(true);
  const [toast, setToast]   = useState("");
  const [locBanner, setLocBanner] = useState(false); // show location permission banner
  const locAsked = useRef(false);

  // Show location permission banner once if not yet granted
  useEffect(() => {
    if (locAsked.current) return;
    locAsked.current = true;
    if (!navigator.geolocation) return;
    if (sessionStorage.getItem('tn_loc_sent')) return; // already captured this session
    navigator.permissions?.query?.({ name: 'geolocation' }).then(r => {
      if (r.state === 'prompt') setLocBanner(true); // not yet decided — show banner
    }).catch(() => setLocBanner(true));
  }, []);

  const loadData = () => {
    let cancelled = false;
    Promise.all([
      api.getMatchedJobs(user.id),
      api.getMyApplications(),
      api.getUser(user.id),
    ]).then(([j,a,p]) => {
      if (!cancelled) {
        setJobs(Array.isArray(j)?j:(j?.data||[]));
        setApps(Array.isArray(a)?a:(a?.data||[]));
        setProfile(p?.data||p);
      }
    }).catch(() => { if (!cancelled) { setJobs([]); setApps([]); } })
      .finally(() => { if (!cancelled) setLoad(false); });
    return () => { cancelled = true; };
  };

  useEffect(loadData, [user.id]);

  const apply = async (jobId) => {
    try {
      await api.applyToJob(jobId, user.id);
      setToast("✅ Applied!");
      const [j,a] = await Promise.all([api.getMatchedJobs(user.id), api.getMyApplications()]);
      setJobs(Array.isArray(j)?j:(j?.data||[]));
      setApps(Array.isArray(a)?a:[]);
    } catch(e) { setToast(`❌ ${e.message}`); }
  };

  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:300}}><Spinner /></div>;

  const stageCounts = STAGES.reduce((a,s) => { a[s.id]=apps.filter(ap=>ap.stage===s.id).length; return a; }, {});
  const nextInterview = apps.find(a => a.stage==="interview_scheduled" && a.interviewRounds?.[0]?.scheduledAt);
  // Applications assigned by admin (source = admin_assign, not yet actioned)
  const assignedByAdmin = apps.filter(a => a.source === 'admin_assign' && a.stage === 'applied');
  // Recent application updates (moved beyond Applied in last 7 days)
  const recentUpdates = apps
    .filter(a => a.stage && a.stage !== 'applied' && a.stage !== 'rejected')
    .sort((a,b) => new Date(b.updatedAt||b.createdAt) - new Date(a.updatedAt||a.createdAt))
    .slice(0, 3);

  // Profile strength — every profile field counts EXCEPT videoResumeUrl.
  // totalWeight adapts by candidate type (experienced includes workHistory).
  // Numeric 0 (fresher) counts as filled for experience.
  const src = profile || user;
  const isExperienced = Number(src?.experience) > 0;

  // Helper: returns true if field has a meaningful value
  const getField = (x) => {
    const keys = [x.f, ...(x.aliases || [])];
    for (const k of keys) {
      const val = src?.[k];
      if (val === undefined || val === null || val === '') continue;
      if (typeof val === 'number') return true; // 0 is valid (fresher)
      if (Array.isArray(val)) return val.length > 0;
      if (x.jsonArray) { try { return JSON.parse(val).length > 0; } catch { return false; } }
      return String(val).trim() !== '';
    }
    return false;
  };

  const BASE_WEIGHTS = [
    // Core identity
    { f:"name",              aliases:[],                        w:8,  label:"Full Name" },
    { f:"phone",             aliases:[],                        w:6,  label:"Phone" },
    { f:"title",             aliases:["jobRole","currentRole"], w:8,  label:"Job Title / Role" },
    { f:"experience",        aliases:["experienceYears"],       w:7,  label:"Years of Experience" },
    { f:"location",          aliases:[],                        w:6,  label:"Location" },
    // Professional profile
    { f:"summary",           aliases:["bio"],                   w:7,  label:"Summary / Bio" },
    { f:"skills",            aliases:[],                        w:8,  label:"Skills" },
    { f:"industry",          aliases:[],                        w:5,  label:"Industry" },
    { f:"department",        aliases:[],                        w:5,  label:"Department" },
    { f:"resumeUrl",         aliases:[],                        w:6,  label:"Resume (PDF)" },
    { f:"linkedinUrl",       aliases:["linkedin"],              w:4,  label:"LinkedIn" },
    // Current role details
    { f:"currentCompany",    aliases:[],                        w:5,  label:"Current Company" },
    { f:"availability",      aliases:[],                        w:4,  label:"Availability" },
    { f:"currentCTC",        aliases:[],                        w:2,  label:"Current CTC" },
    { f:"expectedCTC",       aliases:[],                        w:2,  label:"Expected CTC" },
    { f:"preferredLocation", aliases:[],                        w:2,  label:"Preferred Location" },
    { f:"relevantExperience",aliases:[],                        w:2,  label:"Relevant Experience" },
    // Background
    { f:"educationList",     aliases:[],                        w:4,  label:"Education", jsonArray:true },
    { f:"certifications",    aliases:[],                        w:3,  label:"Certifications", jsonArray:true },
    { f:"languages",         aliases:[],                        w:3,  label:"Languages" },
    // Portfolio & extras
    { f:"github",            aliases:[],                        w:2,  label:"GitHub" },
    { f:"portfolio",         aliases:[],                        w:2,  label:"Portfolio" },
    { f:"projects",          aliases:[],                        w:3,  label:"Projects" },
    { f:"achievements",      aliases:[],                        w:3,  label:"Achievements" },
    { f:"volunteering",      aliases:[],                        w:2,  label:"Volunteering" },
    { f:"culture",           aliases:[],                        w:1,  label:"Work Style" },
    { f:"additionalDetails", aliases:[],                        w:1,  label:"Additional Details" },
  ];

  // workHistory only counts for experienced candidates (adds to denominator too)
  const PROFILE_WEIGHTS = [
    ...BASE_WEIGHTS,
    ...(isExperienced ? [{ f:"workHistory", aliases:[], w:8, label:"Work Experience", jsonArray:true }] : []),
  ];

  const totalWeight  = PROFILE_WEIGHTS.reduce((s,x) => s + x.w, 0);
  const earnedWeight = PROFILE_WEIGHTS.reduce((s,x) => s + (getField(x) ? x.w : 0), 0);
  const profilePct   = Math.round((earnedWeight / totalWeight) * 100);
  const firstMissing = PROFILE_WEIGHTS.find(x => !getField(x));

  // Track filled status for the checklist display
  const profileFields = PROFILE_WEIGHTS.map(x => x.f);
  const filledFields  = profileFields.filter(f => {
    const x = PROFILE_WEIGHTS.find(w => w.f === f);
    return getField(x || { f, aliases: [] });
  });
  const activeApps    = apps.filter(a => !["rejected","selected"].includes(a.stage)).length;
  const appliedCount  = apps.length;
  const shortlisted   = apps.filter(a => ["shortlisted","interview_scheduled","interview_completed","offer_extended","selected"].includes(a.stage)).length;
  const successRate   = appliedCount > 0 ? Math.round((shortlisted/appliedCount)*100) : 0;

  const handleAllowLocation = () => {
    setLocBanner(false);
    import('../../utils/geolocation.js').then(({ requestGeolocation }) => {
      requestGeolocation().then(geo => {
        if (!geo) return;
        api.updateMyLoginLocation(geo).catch(() => {});
        sessionStorage.setItem('tn_loc_sent', '1');
        setToast('✅ Location saved — you\'ll now get nearby job recommendations!');
      });
    });
  };

  return (
    <div style={{ animation: 'tn-fadein 0.3s ease both' }}>
      <Toast msg={toast} onClose={() => setToast("")} />
      <PageHeader title={`Welcome back, ${user.name?.split(" ")[0]} 👋`} subtitle={new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})} />

      {/* ── Profile Completion Banner — shown until profile is 100% ── */}
      {profilePct < 100 && (
        <div style={{
          background: profilePct < 50
            ? 'linear-gradient(135deg,rgba(186,5,23,0.06),rgba(186,5,23,0.02))'
            : profilePct < 80
            ? 'linear-gradient(135deg,rgba(245,158,11,0.08),rgba(245,158,11,0.03))'
            : 'linear-gradient(135deg,rgba(1,118,211,0.07),rgba(1,118,211,0.02))',
          border: `1px solid ${profilePct < 50 ? 'rgba(186,5,23,0.25)' : profilePct < 80 ? 'rgba(245,158,11,0.35)' : 'rgba(1,118,211,0.25)'}`,
          borderRadius: 14, padding: '16px 20px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{profilePct < 50 ? '⚠️' : profilePct < 80 ? '🔶' : '✨'}</span>
                <span style={{ fontWeight: 800, fontSize: 14, color: profilePct < 50 ? '#BA0517' : profilePct < 80 ? '#B45309' : '#0176D3' }}>
                  Complete your profile — {profilePct}% done
                </span>
                <span style={{ fontSize: 11, color: '#706E6B' }}>
                  — {firstMissing ? 'Complete your profile so recruiters can find you' : 'Your profile is ready for recruiters!'}
                </span>
              </div>
              {/* Progress bar */}
              <div style={{ height: 6, background: '#E2E8F0', borderRadius: 3, marginBottom: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${profilePct}%`, borderRadius: 3, background: profilePct < 50 ? '#BA0517' : profilePct < 80 ? '#F59E0B' : '#0176D3', transition: 'width 0.5s ease' }} />
              </div>
              <p style={{ fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.6 }}>
                {profilePct < 50
                  ? '👔 Recruiters are actively searching TalentNest for candidates like you. Complete your profile — title, skills, experience, and summary — so hiring managers can discover and shortlist you.'
                  : profilePct < 80
                  ? '💼 You\'re almost there! A fully complete profile makes you visible to recruiters searching for your skills. Fill in the remaining details to get shortlisted faster.'
                  : '🎯 One last step! Fill in the remaining fields to unlock full recruiter visibility and appear in more search results on TalentNest.'}
              </p>
            </div>
            <button
              onClick={() => navigate('/app/profile')}
              style={{ background: profilePct < 50 ? '#BA0517' : profilePct < 80 ? '#F59E0B' : '#0176D3', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 800, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              Complete Profile →
            </button>
          </div>
        </div>
      )}

      {/* Location permission banner — shown once if permission not yet granted */}
      {locBanner && (
        <div style={{
          background: 'linear-gradient(135deg,rgba(1,118,211,0.08),rgba(0,194,203,0.06))',
          border: '1px solid rgba(1,118,211,0.25)', borderRadius: 14,
          padding: '14px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 28, flexShrink: 0 }}>📍</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#0176D3', marginBottom: 3 }}>
              Allow location for smarter job recommendations
            </div>
            <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
              We use your location to surface nearby roles and send you relevant job alerts. We never share your exact location with anyone.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={handleAllowLocation}
              style={{ background: 'linear-gradient(135deg,#0176D3,#00C2CB)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              📍 Allow Location
            </button>
            <button onClick={() => { setLocBanner(false); sessionStorage.setItem('tn_loc_sent', '1'); }}
              style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: 10, padding: '9px 14px', fontSize: 12, color: '#64748B', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Skip
            </button>
          </div>
        </div>
      )}

      {/* ── Admin-Assigned Jobs — Detailed Cards ── */}
      {assignedByAdmin.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <span style={{ fontSize:18 }}>📬</span>
            <div>
              <div style={{ fontWeight:800, fontSize:14, color:"#032D60" }}>
                You've been added to {assignedByAdmin.length} job pipeline{assignedByAdmin.length>1?'s':''}
              </div>
              <div style={{ fontSize:12, color:"#706E6B", marginTop:1 }}>Review these opportunities and respond</div>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {assignedByAdmin.map(a => {
              const job = a.jobId || {};
              const company = job.companyName || job.company || '';
              return (
                <div key={a.id||a._id} style={{ background:"linear-gradient(135deg,rgba(1,118,211,0.06),rgba(1,118,211,0.02))", border:"1.5px solid rgba(1,118,211,0.25)", borderRadius:14, padding:"14px 16px", display:"flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", justifyContent:"space-between", gap:12 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:"linear-gradient(135deg,#0176D3,#032D60)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:18, flexShrink:0 }}>🎯</div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14, color:"#181818" }}>{job.title || 'New Role'}</div>
                      <div style={{ fontSize:12, color:"#0176D3", marginTop:2 }}>{company}{job.location ? ` · ${job.location}` : ''}</div>
                      <div style={{ fontSize:11, color:"#706E6B", marginTop:2 }}>Added to pipeline on {a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : 'recently'}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                    <button onClick={() => navigate("/app/applications")} style={{ background:"#0176D3", color:"#fff", border:"none", borderRadius:8, padding:"10px 16px", fontSize:13, fontWeight:700, cursor:"pointer", width: isMobile ? "100%" : "auto" }}>View Details →</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Action Required Panel ── */}
      {(() => {
        const offerApps    = apps.filter(a => a.stage === 'offer_extended');
        const interviewApp = apps.filter(a => a.stage === 'interview_scheduled');
        const shortlisted  = apps.filter(a => a.stage === 'shortlisted');
        const actions      = [...offerApps.map(a => ({ emoji: '🎉', color: '#059669', bg: '#D1FAE5', border: '#6EE7B7', msg: `You have an offer from ${a.jobId?.companyName || a.jobId?.company || 'an employer'}!`, cta: 'Review Offer' })), ...interviewApp.map(a => ({ emoji: '📅', color: '#6D28D9', bg: '#EDE9FE', border: '#C4B5FD', msg: `Interview scheduled for ${a.jobId?.title || 'a role'} at ${a.jobId?.companyName || a.jobId?.company || 'employer'}`, cta: 'View Details' })), ...shortlisted.map(a => ({ emoji: '⭐', color: '#B45309', bg: '#FEF3C7', border: '#FCD34D', msg: `You've been shortlisted for ${a.jobId?.title || 'a role'} at ${a.jobId?.companyName || a.jobId?.company || 'employer'}`, cta: 'View Application' }))];
        if (!actions.length) return null;
        return (
          <div style={{ marginBottom: 20 }}>
            <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 700, margin: '0 0 10px', letterSpacing: 1 }}>⚡ ACTION REQUIRED</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {actions.map((ac, i) => (
                <div key={i} style={{ background: ac.bg, border: `1.5px solid ${ac.border}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 22 }}>{ac.emoji}</span>
                  <span style={{ flex: 1, fontWeight: 700, fontSize: 13, color: '#0A1628', minWidth: 120 }}>{ac.msg}</span>
                  <button onClick={() => navigate('/app/applications')} style={{ background: ac.color, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{ac.cta} →</button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Recent Activity Updates ── */}
      {recentUpdates.length > 0 && (
        <div style={{ ...card, marginBottom:20 }}>
          <p style={{ color:"#0176D3", fontSize:11, fontWeight:700, margin:"0 0 12px", letterSpacing:1 }}>🔔 RECENT UPDATES</p>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {recentUpdates.map(a => {
              const stage = a.stage || '';
              const stageColors = { shortlisted:'#A07E00', interview_scheduled:'#7c3aed', interview_completed:'#0176D3', offer_extended:'#10b981', selected:'#2E844A' };
              const stageLabels = { shortlisted:'Shortlisted', interview_scheduled:'Interview Scheduled', interview_completed:'Interview Done', offer_extended:'Offer Extended', selected:'Hired! 🎉' };
              return (
                <div key={a.id||a._id} onClick={() => navigate("/app/applications")} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"rgba(1,118,211,0.03)", borderRadius:10, border:"1px solid #F3F2F2", cursor:"pointer" }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:stageColors[stage]||'#0176D3', flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13, color:"#181818", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.jobId?.title || 'Role'}</div>
                    <div style={{ fontSize:11, color:"#706E6B" }}>{a.jobId?.companyName || a.jobId?.company || ''}</div>
                  </div>
                  <Badge label={stageLabels[stage]||stage} color={stageColors[stage]||'#0176D3'} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="tn-kpi-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap: isMobile ? 8 : 12, marginBottom:20 }}>
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
            <button onClick={() => navigate("/app/smart-match")} style={{ ...btnP, padding:"7px 16px", fontSize:12, marginTop:4 }}>✨ Find matching jobs</button>
          </div>
        )}
      </div>
      {apps.length > 0 && (
        <div style={{ ...card, marginBottom:20 }}>
          <p style={{ color:"#0176D3", fontSize:11, fontWeight:700, margin:"0 0 14px", letterSpacing:1 }}>MY PIPELINE</p>
          <div className="tn-stage-pills" style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4, WebkitOverflowScrolling:'touch' }}>
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
      {/* ── Refer & Earn Badge Progress ─────────────────────────────────── */}
      <ReferralHub user={user} />

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <p style={{ color:"#0176D3", fontSize:11, fontWeight:700, margin:0, letterSpacing:1 }}>✨ MATCHED JOBS</p>
        <button onClick={() => navigate("/app/smart-match")} style={{ ...btnG, padding:"5px 12px", fontSize:11 }}>See all →</button>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {jobs.slice(0,4).map(j => {
          const jStrId = String(j._id || j.id || '');
          const applied = apps.some(a => {
            const aid = a.jobId?.id || a.jobId?._id?.toString() || String(a.jobId || '');
            return aid === jStrId;
          });
          return (
            <div key={String(j._id || j.id)} onClick={() => navigate("/app/smart-match")} style={{ ...card, border:"1px solid #F3F2F2", cursor:"pointer" }}>
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
      {/* ── Skills Gap Analyzer ── */}
      {(() => {
        const mySkills = new Set(
          (Array.isArray(profile?.skills) ? profile.skills : (profile?.skills || user?.skills || '').split(','))
            .map(s => s.trim().toLowerCase()).filter(Boolean)
        );
        const missingSkills = [];
        const seen = new Set();
        jobs.slice(0, 6).forEach(j => {
          const jobSkills = Array.isArray(j.skills) ? j.skills : (j.skills || '').split(',').map(s => s.trim()).filter(Boolean);
          jobSkills.forEach(s => {
            const sk = s.trim().toLowerCase();
            if (sk && !mySkills.has(sk) && !seen.has(sk)) {
              seen.add(sk);
              missingSkills.push({ skill: s.trim(), job: j.title });
            }
          });
        });
        if (!missingSkills.length) return null;
        return (
          <div style={{ ...card, marginTop:20, marginBottom:12, background:'linear-gradient(135deg,rgba(124,58,237,0.04),rgba(1,118,211,0.03))', border:'1.5px solid rgba(124,58,237,0.18)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10, flexWrap:'wrap', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:20 }}>🎯</span>
                <div>
                  <div style={{ fontWeight:800, fontSize:13, color:'#5B21B6' }}>Skills Gap Analyzer</div>
                  <div style={{ fontSize:11, color:'#706E6B', marginTop:1 }}>Add these to your profile to improve match scores</div>
                </div>
              </div>
              <button onClick={() => navigate("/app/profile")} style={{ ...btnP, padding:'6px 14px', fontSize:11, background:'#7C3AED', flexShrink:0 }}>
                Update Profile →
              </button>
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {missingSkills.slice(0, 10).map(({ skill, job }) => (
                <span key={skill} title={`Required for: ${job}`} style={{ padding:'4px 10px', borderRadius:99, background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.25)', color:'#5B21B6', fontSize:11, fontWeight:700, cursor:'default' }}>
                  + {skill}
                </span>
              ))}
            </div>
            <div style={{ fontSize:10, color:'#9CA3AF', marginTop:8 }}>
              Based on your top {Math.min(jobs.length, 6)} matched jobs — tap skill to learn more
            </div>
          </div>
        );
      })()}
      <style>{`
        @keyframes tn-fadein {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
