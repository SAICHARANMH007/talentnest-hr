import React, { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Toast from '../ui/Toast.jsx';
import Field from '../ui/Field.jsx';
import Dropdown from '../ui/Dropdown.jsx';
import Spinner from '../ui/Spinner.jsx';
import { btnP, btnG, card } from '../../constants/styles.js';
import { api } from '../../api/api.js';

export default function InterviewModal({ app, recruiter, onClose, onDone }) {
  const candidate = app.candidate, job = app.job;
  const [date,setDate]=useState(app.interviewDate||"");
  const [time,setTime]=useState(app.interviewTime||"10:00");
  const [mode,setMode]=useState(app.interviewMode||"video");
  const [link,setLink]=useState(app.interviewLink||"");
  const [notes,setNotes]=useState(app.interviewNotes||"");
  const [sending,setSending]=useState(false);
  const [toast,setToast]=useState("");
  const [emailResult,setEmailResult]=useState(null);
  const emailBody=`Dear ${candidate?.name},\n\nWe are pleased to invite you for an interview for the ${job?.title} position at ${job?.company}.\n\nInterview Details:\n━━━━━━━━━━━━━━━━\n📅 Date: ${date}\n⏰ Time: ${time}\n📍 Mode: ${mode==="video"?"Video Call":mode==="phone"?"Phone Call":"In-Person"}\n${link?`🔗 Link: ${link}\n`:""}${notes?`📝 Notes: ${notes}\n`:""}\n━━━━━━━━━━━━━━━━\n\nPlease confirm your availability.\n\nBest regards,\n${recruiter?.name||"The Recruitment Team"}`;
  const save=async(sendEmail)=>{
    if(!date||!time){setToast("❌ Date and time required");return;}
    setSending(true);
    let emailSent=false;
    if(sendEmail){
      try{
        const res=await api.sendEmail(candidate?.email,`Interview Invitation: ${job?.title} at ${job?.company}`,emailBody);
        emailSent=true;
        setEmailResult({success:true,previewUrl:res.previewUrl});
      }catch(e){ setEmailResult({success:false,error:e.message}); }
    }
    await api.scheduleInterview(app.id,{date,time,mode,link,notes,emailSent});

    // Create WhatsApp session so that candidate's numbered reply (1/2/3) is handled by the bot
    const candidatePhone = candidate?.phone;
    if (candidatePhone) {
      // interviewRounds are 0-indexed; new round is appended, so index = existing count
      const roundIndex = Array.isArray(app.interviewRounds) ? app.interviewRounds.length : 0;
      try {
        await api.createWhatsAppSession({
          candidatePhone,
          type: 'interview-confirm',
          applicationId: app.id,
          interviewRoundIndex: roundIndex,
        });
      } catch { /* non-fatal — session creation failure should not block scheduling */ }
    }

    setSending(false);
    onDone(sendEmail&&emailSent?"✅ Interview scheduled & email sent!":"✅ Interview scheduled!");
  };
  return (
    <Modal 
      title="📅 Schedule Interview" 
      onClose={onClose} 
      wide
      footer={
        <div style={{ display:'flex', gap:10, width:'100%', flexWrap:'wrap' }}>
          <button onClick={()=>save(true)} disabled={sending} style={{...btnP, flex:2, height:48, fontSize:14, justifyContent:'center', background:'linear-gradient(135deg,#032D60,#0176D3)', opacity:sending?0.6:1}}>
            {sending ? <><Spinner/> Sending…</> : "📧 Schedule & Send Email Invite"}
          </button>
          <button onClick={()=>save(false)} disabled={sending} style={{...btnG, flex:1, height:48, fontSize:14, justifyContent:'center'}}>Save Details Only</button>
          <button onClick={onClose} style={{...btnG, height:48, padding:'0 24px', fontSize:14}}>Cancel</button>
        </div>
      }
    >
      <Toast msg={toast} onClose={()=>setToast("")} />
      {emailResult && (
        <div style={{ marginBottom:16, padding:12, background:emailResult.success ? "rgba(34,197,94,0.1)" : "rgba(186,5,23,0.1)", borderRadius:10, border:`1px solid ${emailResult.success ? 'rgba(34,197,94,0.2)' : 'rgba(186,5,23,0.2)'}` }}>
          <p style={{ color:emailResult.success ? "#065f46" : "#BA0517", fontSize:12, fontWeight:700, margin:0 }}>
            {emailResult.success ? <>✅ Invitation email delivered! {emailResult.previewUrl && <a href={emailResult.previewUrl} target="_blank" rel="noreferrer" style={{color:"#0176D3", marginLeft:8, textDecoration:'underline'}}>View Copy</a>}</> : `⚠️ Delivery failure: ${emailResult.error}`}
          </p>
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap:20 }}>
        <div style={{ ...card, gridColumn:"span 2", background:"rgba(1,118,211,0.04)", border:'1px solid rgba(1,118,211,0.1)', padding:'16px 20px' }}>
          <p style={{ color:"#0176D3", fontSize:10, fontWeight:800, letterSpacing:1, margin:"0 0 8px", textTransform:'uppercase' }}>Candidate Dossier</p>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
            <div>
              <p style={{ color:"#181818", fontSize:16, fontWeight:800, margin:0 }}>{candidate?.name}</p>
              <p style={{ color:"#64748B", fontSize:13, margin:"4px 0 0" }}>{candidate?.email} {candidate?.phone && ` · ${candidate?.phone}`}</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ color:"#0176D3", fontSize:13, fontWeight:700, margin:0 }}>{job?.title}</p>
              <p style={{ color:"#64748B", fontSize:11, margin:"2px 0 0" }}>{job?.company}</p>
            </div>
          </div>
        </div>
        
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, gridColumn:'span 2' }}>
           <Field label="Interview Date *" value={date} onChange={setDate} type="date" />
           <Field label="Interview Time *" value={time} onChange={setTime} type="time" />
        </div>

        <Dropdown label="Interview Mode" value={mode} onChange={setMode} options={[{value:"video",label:"🎥 Video Call (Recommended)"},{value:"phone",label:"📞 Phone Call"},{value:"in_person",label:"🏢 In-Person Interview"}]} />
        <Field label="Meeting Link / Address" value={link} onChange={setLink} placeholder="Paste Google Meet link or office address…" />
        
        <div style={{ gridColumn:"span 2" }}>
           <Field label="Internal Preparation Notes" value={notes} onChange={setNotes} rows={2} maxLength={1000} placeholder="e.g. Focus on React hooks and system design proficiency…"/>
        </div>

        <div style={{ gridColumn:"span 2" }}>
           <p style={{ color:"#0176D3", fontSize:11, fontWeight:800, letterSpacing:1, margin:"0 0 10px", textTransform:'uppercase' }}>✉️ Communication Preview</p>
           <pre style={{ background:"#F8FAFF", border:"1px solid #E2E8F0", borderRadius:16, color:"#475569", padding:"16px 20px", fontSize:12, whiteSpace:"pre-wrap", height:160, overflowY:"auto", lineHeight:1.6, margin:0 }}>{emailBody}</pre>
        </div>
      </div>
    </Modal>
  );
}
