import React, { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Field from '../ui/Field.jsx';
import Spinner from '../ui/Spinner.jsx';
import { btnD, btnG, card } from '../../constants/styles.js';
import { api } from '../../api/api.js';

export default function RejectModal({ app, onClose, onDone }) {
  const [reason,setReason]=useState("");
  const [sendEmail,setSendEmail]=useState(false);
  const [saving,setSaving]=useState(false);
  const c=app.candidate, j=app.job;
  const submit=async()=>{
    setSaving(true);
    if(sendEmail&&c?.email) await api.sendEmail(c.email,`Application Update: ${j?.title} at ${j?.company}`,`<p>Dear ${c?.name},</p><p>Thank you for your interest in the <strong>${j?.title}</strong> position at <strong>${j?.company}</strong>.</p><p>After careful consideration, we will not be moving forward at this time.</p>${reason?`<p><strong>Feedback:</strong> ${reason}</p>`:""}<p>Best wishes,<br/>The Recruitment Team</p>`).catch(()=>{});
    await api.updateStage(app.id,"rejected",reason?`Rejected: ${reason}`:"Rejected",{rejectionReason:reason});
    setSaving(false);
    onDone("✅ Candidate rejected"+(sendEmail?" & notified":"."));
  };
  return (
    <Modal title="Reject Candidate" onClose={onClose}>
      <div style={{...card,background:"rgba(186,5,23,0.06)",marginBottom:16}}><p style={{color:"#fca5a5",fontSize:13,fontWeight:600,margin:0}}>{c?.name}</p><p style={{color:"#706E6B",fontSize:12,margin:"3px 0 0"}}>{j?.title} @ {j?.company}</p></div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Field label="Reason for Rejection (recommended)" value={reason} onChange={setReason} rows={3} placeholder="e.g. Skills not aligned…"/>
        <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}><input type="checkbox" checked={sendEmail} onChange={e=>setSendEmail(e.target.checked)} style={{accentColor:"#0176D3"}}/><span style={{color:"#0176D3",fontSize:13}}>Notify candidate via email</span></label>
        <div style={{display:"flex",gap:10}}>
          <button onClick={submit} disabled={saving} style={{...btnD,flex:1,opacity:saving?0.6:1}}>{saving?<><Spinner/> Processing…</>:"✕ Confirm Rejection"}</button>
          <button onClick={onClose} style={btnG}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}
