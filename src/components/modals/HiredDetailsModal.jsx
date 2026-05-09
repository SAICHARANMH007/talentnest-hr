import { useState } from 'react';
import { api } from '../../api/api.js';
import { btnP, btnG } from '../../constants/styles.js';

/**
 * HiredDetailsModal
 * Shown immediately after a candidate's stage moves to "Hired".
 * Collects CTC offered + joining date and saves to the preboarding record.
 *
 * Props:
 *   appId      – application._id (used to find the preboarding)
 *   candidateName
 *   jobTitle
 *   onClose    – closes the modal
 *   onSaved    – optional callback after save
 */
export default function HiredDetailsModal({ appId, candidateName, jobTitle, onClose, onSaved }) {
  const [form, setForm] = useState({ joiningDate: '', ctcOffered: '', designation: '', department: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {};
      if (form.joiningDate)  payload.joiningDate  = form.joiningDate;
      if (form.ctcOffered)   payload.ctcOffered   = form.ctcOffered;
      if (form.designation)  payload.designation  = form.designation;
      if (form.department)   payload.department   = form.department;

      if (Object.keys(payload).length > 0 && appId) {
        await api.updatePreBoardingByApplication(appId, payload);
      }
      onSaved?.();
      onClose();
    } catch (e) {
      setToast('⚠️ Could not save details — you can update them later in Onboarding. ' + (e.message || ''));
    }
    setSaving(false);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(5,13,26,0.6)', backdropFilter:'blur(4px)', zIndex:10100, display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'60px 20px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:480, boxShadow:'0 24px 64px rgba(0,0,0,0.25)', overflow:'hidden', margin:'auto 0' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#059669,#047857)', padding:'20px 24px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ color:'rgba(255,255,255,0.7)', fontSize:11, fontWeight:700, letterSpacing:1.2, textTransform:'uppercase', marginBottom:4 }}>🎊 Candidate Hired</div>
            <h2 style={{ color:'#fff', margin:0, fontSize:18, fontWeight:800 }}>{candidateName || 'Candidate'}</h2>
            {jobTitle && <p style={{ color:'rgba(255,255,255,0.75)', margin:'4px 0 0', fontSize:13 }}>for {jobTitle}</p>}
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', width:32, height:32, borderRadius:8, cursor:'pointer', fontSize:16, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding:'24px' }}>
          <p style={{ color:'#374151', fontSize:14, margin:'0 0 20px', lineHeight:1.6 }}>
            Great news! Enter the offer details below — they'll appear on the candidate's pre-boarding checklist and offer letter.
          </p>

          {toast && (
            <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:8, padding:'10px 14px', color:'#92400E', fontSize:13, marginBottom:16 }}>
              {toast}
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>📅 Joining Date *</label>
              <input type="date" value={form.joiningDate} onChange={e => sf('joiningDate', e.target.value)}
                style={{ width:'100%', boxSizing:'border-box', padding:'10px 14px', borderRadius:8, border:'1.5px solid #E2E8F0', fontSize:14, outline:'none' }} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>💰 CTC Offered</label>
              <input type="text" value={form.ctcOffered} onChange={e => sf('ctcOffered', e.target.value)}
                placeholder="e.g. 12 LPA or ₹1,00,000/month"
                style={{ width:'100%', boxSizing:'border-box', padding:'10px 14px', borderRadius:8, border:'1.5px solid #E2E8F0', fontSize:14, outline:'none' }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>🏷️ Designation</label>
                <input type="text" value={form.designation} onChange={e => sf('designation', e.target.value)}
                  placeholder="e.g. Senior Developer"
                  style={{ width:'100%', boxSizing:'border-box', padding:'10px 14px', borderRadius:8, border:'1.5px solid #E2E8F0', fontSize:14, outline:'none' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>🏢 Department</label>
                <input type="text" value={form.department} onChange={e => sf('department', e.target.value)}
                  placeholder="e.g. Engineering"
                  style={{ width:'100%', boxSizing:'border-box', padding:'10px 14px', borderRadius:8, border:'1.5px solid #E2E8F0', fontSize:14, outline:'none' }} />
              </div>
            </div>
          </div>

          <div style={{ display:'flex', gap:10, marginTop:24 }}>
            <button onClick={save} disabled={saving}
              style={{ ...btnP, flex:1, background:'linear-gradient(135deg,#059669,#047857)', opacity:saving?0.7:1, cursor:saving?'not-allowed':'pointer' }}>
              {saving ? '⏳ Saving…' : '✅ Save & Continue'}
            </button>
            <button onClick={onClose} style={{ ...btnG, padding:'11px 20px' }}>Skip for Now</button>
          </div>
          <p style={{ color:'#94A3B8', fontSize:11, margin:'10px 0 0', textAlign:'center' }}>
            You can update these details later in the Onboarding section.
          </p>
        </div>
      </div>
    </div>
  );
}
