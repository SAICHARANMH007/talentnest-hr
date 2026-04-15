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
    <Modal title="📅 Schedule Interview" onClose={onClose} wide>
      <Toast msg={toast} onClose={()=>setToast("")} />
      {emailResult&&<div style={{marginBottom:16,padding:12,background:emailResult.success?"rgba(34,197,94,0.1)":"rgba(186,5,23,0.1)",borderRadius:10}}><p style={{color:emailResult.success?"#86efac":"#fca5a5",fontSize:12,margin:0}}>{emailResult.success?<>📧 Email sent! {emailResult.previewUrl&&<a href={emailResult.previewUrl} target="_blank" rel="noreferrer" style={{color:"#818cf8"}}>Preview</a>}</>:`⚠️ Email failed: ${emailResult.error}`}</p></div>}
      <div style={{display:"grid",gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',gap:16}}>
        <div style={{...card,gridColumn:"span 2",background:"rgba(1,118,211,0.05)"}}><p style={{color:"#0176D3",fontSize:11,margin:"0 0 4px",fontWeight:600}}>CANDIDATE</p><p style={{color:"#181818",fontSize:14,fontWeight:600,margin:0}}>{candidate?.name}</p><p style={{color:"#706E6B",fontSize:12,margin:"2px 0 0"}}>{candidate?.email} · {candidate?.phone||"No phone"}</p><p style={{color:"#0176D3",fontSize:12,margin:"2px 0 0"}}>{job?.title} @ {job?.company}</p></div>
        <Field label="Interview Date *" value={date} onChange={setDate} type="date" />
        <Field label="Interview Time *" value={time} onChange={setTime} type="time" />
        <Dropdown label="Mode" value={mode} onChange={setMode} options={[{value:"video",label:"Video Call"},{value:"phone",label:"Phone Call"},{value:"in_person",label:"In-Person"}]} />
        <Field label="Meeting Link / Address" value={link} onChange={setLink} placeholder="https://meet.google.com/..." />
        <div style={{gridColumn:"span 2"}}><Field label="Notes for Candidate" value={notes} onChange={setNotes} rows={2} maxLength={1000} placeholder="e.g. Technical round – 45 mins"/></div>
        <div style={{gridColumn:"span 2"}}><p style={{color:"#0176D3",fontSize:11,fontWeight:600,margin:"0 0 6px"}}>EMAIL PREVIEW</p><pre style={{background:"#F3F2F2",border:"1px solid rgba(255,255,255,0.12)",borderRadius:12,color:"#706E6B",padding:"10px 14px",fontSize:11,whiteSpace:"pre-wrap",height:140,overflowY:"auto",lineHeight:1.6}}>{emailBody}</pre></div>
      </div>
      <div style={{display:"flex",gap:10,marginTop:20,flexWrap:"wrap"}}>
        <button onClick={()=>save(true)} disabled={sending} style={{...btnP,flex:1,opacity:sending?0.6:1}}>{sending?<><Spinner/> Sending…</>:"📧 Schedule & Send Email"}</button>
        <button onClick={()=>save(false)} disabled={sending} style={btnG}>Save Only</button>
        <button onClick={onClose} style={btnG}>Cancel</button>
      </div>
    </Modal>
  );
}
