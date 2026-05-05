import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api/api.js';
import Spinner from '../../components/ui/Spinner.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { card, btnP, btnG } from '../../constants/styles.js';

const CAT_ICON  = { document: '📄', training: '📚', it_setup: '💻', policy: '📋', orientation: '🎯', other: '📌' };
const CAT_LABEL = { document: 'Documents', training: 'Training', it_setup: 'IT Setup', policy: 'Policies', orientation: 'Orientation', other: 'Other' };
const VERIFY_COLOR = { not_uploaded: '#94A3B8', pending_review: '#F59E0B', verified: '#10B981', rejected: '#EF4444', resubmission_required: '#F97316' };
const VERIFY_LABEL = { not_uploaded: 'Upload Required', pending_review: '⏳ Under Review', verified: '✅ Verified', rejected: '❌ Rejected', resubmission_required: '🔄 Resubmit' };

export default function CandidateOnboarding({ user }) {
  const [pb, setPb]           = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState('');
  const [uploading, setUploading]   = useState({});
  const [completing, setCompleting] = useState({});
  const fileRefs = useRef({});

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.getMyPreBoarding();
      let pbData = r?.data || r || null;

      // No preboarding yet — check if there's a Hired application and auto-trigger
      if (!pbData) {
        try {
          const appsRes = await api.getApplications({ stage: 'selected', limit: 10 }); // selected = Hired in frontend
          const apps = Array.isArray(appsRes) ? appsRes : (appsRes?.data || []);
          // Also check currentStage = 'Hired' directly
          const appsHired = await api.getApplications({ limit: 20 });
          const allApps = [...apps, ...(Array.isArray(appsHired) ? appsHired : (appsHired?.data || []))];
          const hiredApp = allApps.find(a =>
            a.stage === 'selected' || a.currentStage === 'Hired' ||
            a.stage === 'hired' || a.status === 'hired'
          );
          if (hiredApp) {
            // Auto-start preboarding for this hired application
            const started = await api.startPreBoarding(hiredApp.id || hiredApp._id).catch(() => null);
            if (started?.data) pbData = started.data;
          }
        } catch {}
      }

      setPb(pbData);
    } catch { setPb(null); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (taskId, file) => {
    if (!file || !pb) return;
    if (file.size > 8 * 1024 * 1024) { setToast('❌ File too large. Max 8 MB.'); return; }
    setUploading(p => ({ ...p, [taskId]: true }));
    try {
      const r = await api.uploadPreBoardingDocument(pb._id || pb.id, taskId, file);
      setPb(r?.data || r);
      setToast('✅ Document uploaded! HR will verify it shortly.');
    } catch (e) { setToast('❌ Upload failed: ' + (e.message || 'Unknown error')); }
    setUploading(p => ({ ...p, [taskId]: false }));
  };

  const toggleTask = async (taskId, isDone) => {
    if (!pb) return;
    setCompleting(p => ({ ...p, [taskId]: true }));
    try {
      const r = await api.updatePreBoardingTask(pb._id || pb.id, taskId, { completed: !isDone });
      setPb(r?.data || r);
    } catch (e) { setToast('❌ ' + e.message); }
    setCompleting(p => ({ ...p, [taskId]: false }));
  };

  const confirmJoining = async () => {
    if (!pb) return;
    try {
      const r = await api.confirmPreBoardingJoining(pb._id || pb.id);
      setPb(r?.data || r);
      setToast('✅ Joining confirmed! We look forward to having you on board.');
    } catch (e) { setToast('❌ ' + e.message); }
  };

  const downloadFile = (fileUrl, fileName) => {
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName || 'document';
    a.click();
  };

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:80 }}><Spinner size={36} /></div>;

  if (!pb) return (
    <div style={{ maxWidth:600, margin:'80px auto', textAlign:'center', padding:40 }}>
      <div style={{ fontSize:64, marginBottom:16 }}>🎉</div>
      <h2 style={{ color:'#0A1628', fontWeight:800 }}>No Pre-boarding Yet</h2>
      <p style={{ color:'#64748B' }}>Once your offer letter is signed, your onboarding checklist will appear here automatically.</p>
    </div>
  );

  const totalTasks = pb.tasks?.length || 0;
  const doneTasks  = pb.tasks?.filter(t => t.completedAt).length || 0;
  const pct        = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const joiningDate = pb.joiningDate ? new Date(pb.joiningDate).toLocaleDateString('en-IN',{ weekday:'long', day:'2-digit', month:'long', year:'numeric' }) : '—';
  const daysLeft   = pb.joiningDate ? Math.ceil((new Date(pb.joiningDate) - Date.now()) / 86400000) : null;

  const grouped = {};
  (pb.tasks || []).forEach(t => {
    const c = t.category || 'other';
    if (!grouped[c]) grouped[c] = [];
    grouped[c].push(t);
  });

  const circumference = 2 * Math.PI * 45;

  return (
    <div style={{ maxWidth:860, margin:'0 auto', padding:'24px 16px' }}>

      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,#032D60,#0176D3)', borderRadius:20, padding:'32px 36px', marginBottom:28, color:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:20 }}>
        <div>
          <div style={{ fontSize:12, opacity:0.8, fontWeight:700, letterSpacing:1, textTransform:'uppercase', marginBottom:8 }}>Pre-boarding Checklist</div>
          <h1 style={{ margin:0, fontSize:26, fontWeight:900 }}>Welcome, {pb.candidateName?.split(' ')[0] || 'there'}! 👋</h1>
          <p style={{ margin:'8px 0 16px', opacity:0.85, fontSize:14 }}>
            Joining as <strong>{pb.designation}</strong>{pb.department && <> · <strong>{pb.department}</strong></>}
          </p>
          <div style={{ display:'flex', gap:20, flexWrap:'wrap', fontSize:13 }}>
            <span>📅 <strong>{joiningDate}</strong></span>
            {daysLeft !== null && daysLeft > 0 && <span>⏳ <strong>{daysLeft} days</strong> to go</span>}
            {daysLeft !== null && daysLeft <= 0 && <span>🎊 <strong>Joining day!</strong></span>}
          </div>
          {!pb.joiningConfirmed && (
            <button onClick={confirmJoining} style={{ marginTop:16, background:'#fff', color:'#032D60', border:'none', borderRadius:10, padding:'10px 22px', fontWeight:800, fontSize:13, cursor:'pointer' }}>
              ✅ Confirm My Joining
            </button>
          )}
          {pb.joiningConfirmed && (
            <div style={{ marginTop:12, background:'rgba(255,255,255,0.15)', borderRadius:8, padding:'8px 14px', fontSize:13, fontWeight:600 }}>
              ✅ Joining confirmed {pb.joiningConfirmedAt ? `on ${new Date(pb.joiningConfirmedAt).toLocaleDateString('en-IN')}` : ''}
            </div>
          )}
        </div>
        <div style={{ textAlign:'center', flexShrink:0 }}>
          <svg width={110} height={110}>
            <circle cx={55} cy={55} r={45} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={10} />
            <circle cx={55} cy={55} r={45} fill="none" stroke="#fff" strokeWidth={10}
              strokeDasharray={circumference} strokeDashoffset={circumference*(1-pct/100)}
              strokeLinecap="round" style={{ transition:'stroke-dashoffset 0.8s ease', transform:'rotate(-90deg)', transformOrigin:'50% 50%' }} />
            <text x={55} y={55} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={22} fontWeight={900}>{pct}%</text>
          </svg>
          <div style={{ fontSize:12, opacity:0.8, marginTop:4 }}>{doneTasks}/{totalTasks} Complete</div>
        </div>
      </div>

      {/* Task groups */}
      {Object.entries(grouped).map(([cat, tasks]) => (
        <div key={cat} style={{ ...card, marginBottom:16, overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', background:'#F8FAFC', borderBottom:'1px solid #E2E8F0', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:18 }}>{CAT_ICON[cat]||'📌'}</span>
            <span style={{ fontWeight:800, fontSize:14, color:'#0A1628' }}>{CAT_LABEL[cat]||cat}</span>
            <span style={{ marginLeft:'auto', fontSize:12, color:'#64748B' }}>{tasks.filter(t=>t.completedAt).length}/{tasks.length} done</span>
          </div>

          {tasks.map(task => {
            const isDoc = task.category === 'document';
            const isDone = !!task.completedAt;
            const vs = task.verifyStatus || 'not_uploaded';

            return (
              <div key={task._id} style={{ borderBottom:'1px solid #F1F5F9' }}>
                <div style={{ padding:'14px 20px', display:'flex', alignItems:'flex-start', gap:12 }}>
                  {/* Status indicator */}
                  {!isDoc ? (
                    <button onClick={() => toggleTask(task._id, isDone)} disabled={completing[task._id]}
                      style={{ width:22, height:22, borderRadius:6, border:`2px solid ${isDone?'#10B981':'#CBD5E1'}`, background:isDone?'#10B981':'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1, transition:'all 0.2s' }}>
                      {isDone && <span style={{ color:'#fff', fontSize:13 }}>✓</span>}
                    </button>
                  ) : (
                    <div style={{ width:22, height:22, borderRadius:6, border:`2px solid ${VERIFY_COLOR[vs]||'#CBD5E1'}`, background:vs==='verified'?'#10B981':'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                      {vs==='verified' && <span style={{ color:'#fff', fontSize:13 }}>✓</span>}
                    </div>
                  )}

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <span style={{ fontWeight:700, fontSize:14, color:'#0A1628', textDecoration:isDone?'line-through':'none', opacity:isDone?0.6:1 }}>
                        {task.title}{task.isRequired && <span style={{ color:'#EF4444', marginLeft:2 }}>*</span>}
                      </span>
                      {isDoc && <Badge label={VERIFY_LABEL[vs]||vs} color={VERIFY_COLOR[vs]||'#94A3B8'} />}
                    </div>
                    {task.description && <p style={{ margin:'4px 0 0', fontSize:12, color:'#64748B' }}>{task.description}</p>}
                    {task.dueDate && <p style={{ margin:'3px 0 0', fontSize:11, color:'#94A3B8' }}>Due: {new Date(task.dueDate).toLocaleDateString('en-IN')}</p>}

                    {/* HR feedback */}
                    {isDoc && (vs==='rejected'||vs==='resubmission_required') && task.verifyNotes && (
                      <div style={{ background:vs==='rejected'?'#FEF2F2':'#FFF7ED', border:`1px solid ${vs==='rejected'?'#FECACA':'#FED7AA'}`, borderRadius:8, padding:'8px 12px', marginTop:8, fontSize:12, color:vs==='rejected'?'#991B1B':'#9A3412' }}>
                        <strong>{vs==='rejected'?'❌ Rejected:':'🔄 Action Required:'}</strong> {task.verifyNotes}
                      </div>
                    )}
                    {isDoc && task.fileUrl && (
                      <div style={{ fontSize:11, color:'#94A3B8', marginTop:4 }}>
                        📎 {task.fileName||'document'}{task.fileSize?` · ${(task.fileSize/1024).toFixed(0)} KB`:''}
                        {task.fileUploadedAt ? ` · Uploaded ${new Date(task.fileUploadedAt).toLocaleDateString('en-IN')}` : ''}
                      </div>
                    )}
                  </div>

                  {/* Document upload/download */}
                  {isDoc && (
                    <div style={{ display:'flex', gap:8, flexShrink:0, alignItems:'center', flexWrap:'wrap' }}>
                      {vs !== 'verified' && (
                        <>
                          <input ref={el=>{fileRefs.current[task._id]=el;}} type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{ display:'none' }}
                            onChange={e=>{const f=e.target.files?.[0];if(f)handleUpload(task._id,f);e.target.value='';}} />
                          <button onClick={()=>fileRefs.current[task._id]?.click()} disabled={uploading[task._id]}
                            style={{ ...btnP, padding:'6px 14px', fontSize:12, opacity:uploading[task._id]?0.7:1 }}>
                            {uploading[task._id]?'⏳ Uploading…':task.fileUrl?'🔄 Re-upload':'📎 Upload Doc'}
                          </button>
                        </>
                      )}
                      {task.fileUrl && (
                        <button onClick={()=>downloadFile(task.fileUrl,task.fileName)} style={{ ...btnG, padding:'6px 12px', fontSize:12 }}>
                          ⬇️ View
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Completion banner */}
      {pct===100 && (
        <div style={{ ...card, padding:32, textAlign:'center', background:'linear-gradient(135deg,#f0fdf4,#dcfce7)', border:'1px solid #86efac' }}>
          <div style={{ fontSize:48, marginBottom:8 }}>🎊</div>
          <h3 style={{ color:'#166534', margin:'0 0 8px', fontWeight:800 }}>All tasks complete!</h3>
          <p style={{ color:'#15803D', margin:0, fontSize:14 }}>You're fully onboarded. See you on {joiningDate}!</p>
        </div>
      )}

      <Toast msg={toast} onClose={()=>setToast('')} />
    </div>
  );
}
