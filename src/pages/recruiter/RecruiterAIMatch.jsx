import React, { useState, useEffect } from 'react';
import Toast from '../../components/ui/Toast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { btnP, card, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';
import { matchCandidatesToJob } from '../../api/matching.js';

export default function RecruiterAIMatch({ user }) {
  const [jobs,setJobs]=useState([]);const [selJob,setSelJob]=useState("");const [results,setResults]=useState([]);const [loading,setLoad]=useState(false);const [toast,setToast]=useState("");const [shortlisting,setShortlisting]=useState({});const [jobsLoading,setJobsLoad]=useState(true);
  useEffect(()=>{ api.getJobs(user.id).then(j=>setJobs(Array.isArray(j)?j:(j?.data||[]))).catch(()=>{}).finally(()=>setJobsLoad(false)); },[user.id]);

  const run=async()=>{
    if(!selJob) return;
    setLoad(true); setResults([]);
    try {
      const [jobRes,candsRes]=await Promise.all([api.getJob(selJob),api.getUsers("candidate")]);
      const job = jobRes?.data || jobRes;
      const cands = Array.isArray(candsRes) ? candsRes : (candsRes?.data || []);
      if (!cands.length) { setToast("No candidates in the system yet."); setLoad(false); return; }
      setResults(matchCandidatesToJob(job, cands));
    } catch(e) { setToast(`Matching failed: ${e.message}`); }
    setLoad(false);
  };

  const shortlist=async(candidateId)=>{
    setShortlisting(s=>({...s,[candidateId]:true}));
    try {
      let appId;
      try { const a=await api.applyToJob(selJob,candidateId); appId=a.id; }
      catch(e) {
        if(e.message.toLowerCase().includes("already")) {
          const appsRes=await api.getApplications({jobId:selJob,candidateId});
          const apps=Array.isArray(appsRes)?appsRes:(appsRes?.data||[]);
          appId=apps[0]?.id;
        } else throw e;
      }
      if(!appId) throw new Error("Could not find or create application");
      await api.updateStage(appId,"shortlisted","Shortlisted via AI match");
      setToast("Shortlisted successfully!");
      setResults(prev=>prev.map(r=>r.candidate?.id===candidateId?{...r,_shortlisted:true}:r));
    } catch(e) { setToast(`Shortlist failed: ${e.message}`); }
    setShortlisting(s=>({...s,[candidateId]:false}));
  };

  const rc={"Strong Match":"#2E844A","Good Match":"#0176D3","Possible Match":"#A07E00"};

  return (
    <div>
      <Toast msg={toast} onClose={()=>setToast("")}/>
      <PageHeader title="AI Candidate Matching" subtitle="Instantly rank your best candidates for any job"/>
      <div style={{...card,marginBottom:20}}>
        <div style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:200}}>
            <label style={{color:"#0176D3",fontSize:11,display:"block",marginBottom:6}}>Select a Job</label>
            <select value={selJob} onChange={e=>{setSelJob(e.target.value);setResults([]);}} style={inp}>
              <option value="">— Choose a job to match candidates —</option>
              {jobs.map(j=><option key={j.id} value={j.id}>{j.title} @ {j.company}</option>)}
            </select>
          </div>
          <button onClick={run} disabled={!selJob||loading} style={{...btnP,opacity:(!selJob||loading)?0.6:1}}>
            {loading?<><Spinner/> Analyzing...</>:"Match Candidates"}
          </button>
        </div>
        {!jobsLoading && jobs.length===0 && (
          <div style={{marginTop:14,padding:"12px 14px",background:"rgba(1,118,211,0.06)",borderRadius:12,border:"1px solid rgba(1,118,211,0.2)"}}>
            <p style={{color:"#0176D3",fontSize:12,margin:0}}>You have no job postings yet. Go to <b>My Jobs</b> and post a job first, then come back here to match candidates.</p>
          </div>
        )}
      </div>
      {!loading && results.length===0 && selJob && (
        <div style={{...card,textAlign:"center",padding:40}}>
          <p style={{color:"#9E9D9B",fontSize:14,margin:0}}>Click "Match Candidates" to run AI analysis</p>
        </div>
      )}
      {results.map((r,i)=>(
        <div key={r.candidate?.id ?? i} style={{...card,marginBottom:12,border:`1px solid ${rc[r.recommendation]||"#0176D3"}44`}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                <div style={{width:24,height:24,borderRadius:"50%",background:"#0176D3",display:"flex",alignItems:"center",justifyContent:"center",color:"#181818",fontSize:11,fontWeight:700}}>{i+1}</div>
                <span style={{color:"#181818",fontWeight:600}}>{r.candidate.name}</span>
                <Badge label={`${r.matchScore}%`} color={r.matchScore>=80?"#2E844A":"#A07E00"}/>
                <Badge label={r.recommendation} color={rc[r.recommendation]||"#0176D3"}/>
                {r._shortlisted && <Badge label="Shortlisted" color="#2E844A"/>}
              </div>
              <div style={{color:"#0176D3",fontSize:12}}>{r.candidate.title} · {r.candidate.experience||0}y exp · {r.candidate.location||"—"}</div>
              <p style={{color:"#706E6B",fontSize:12,marginTop:6}}>{r.reasoning}</p>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:6}}>
                {(r.highlights||[]).map((h,j)=><Badge key={j} label={"✓ "+h} color="#014486"/>)}
              </div>
            </div>
            <button
              onClick={()=>shortlist(r.candidate.id)}
              disabled={shortlisting[r.candidate.id]||r._shortlisted}
              style={{...btnP,opacity:(shortlisting[r.candidate.id]||r._shortlisted)?0.5:1,cursor:(shortlisting[r.candidate.id]||r._shortlisted)?"default":"pointer"}}>
              {shortlisting[r.candidate.id]?<><Spinner/></>:r._shortlisted?"Shortlisted":"Shortlist"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
