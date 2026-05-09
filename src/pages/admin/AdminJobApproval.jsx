import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { card, btnP, btnG, btnD, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const ff = "'Plus Jakarta Sans','Segoe UI',sans-serif";

function RejectModal({ job, onConfirm, onClose }) {
  const [note, setNote] = useState('');
  return (
    <Modal
      title={
        <div>
          <div style={{ color:'rgba(255,255,255,0.65)', fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', marginBottom:3 }}>Job Approval</div>
          <h3 style={{ color:'#fff', margin:0, fontSize:16, fontWeight:800 }}>Return for Revision</h3>
        </div>
      }
      onClose={onClose}
      width="460px"
      footer={
        <>
          <button onClick={onClose} style={{ ...btnG, flex:1 }}>Cancel</button>
          <button
            onClick={() => { if (!note.trim()) return; onConfirm(note.trim()); }}
            disabled={!note.trim()}
            style={{ ...btnD, flex:2, opacity: note.trim() ? 1 : 0.5, cursor: note.trim() ? 'pointer' : 'not-allowed' }}>
            Return for Revision
          </button>
        </>
      }
    >
      <div style={{ padding:'4px 0' }}>
        <div style={{ background:'#FEF2F2', border:'1px solid rgba(220,38,38,0.2)', borderRadius:10, padding:'10px 14px', marginBottom:16 }}>
          <div style={{ color:'#181818', fontSize:14, fontWeight:600 }}>{job.title}</div>
          <div style={{ color:'#dc2626', fontSize:12 }}>{job.company || job.companyName}</div>
        </div>
        <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:6 }}>Reason for rejection *</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Tell the recruiter what to fix before resubmitting…"
          rows={4}
          style={{ ...inp, width:'100%', resize:'vertical', boxSizing:'border-box' }}
          autoFocus
        />
      </div>
    </Modal>
  );
}

function JobPreviewModal({ job, onClose, onApprove, onReject }) {
  return (
    <Modal
      title={
        <div>
          <div style={{ color:'rgba(255,255,255,0.65)', fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', marginBottom:4 }}>Job Preview</div>
          <h2 style={{ color:'#fff', margin:0, fontSize:18, fontWeight:800 }}>{job.title}</h2>
          <div style={{ color:'rgba(255,255,255,0.75)', fontSize:13, marginTop:4 }}>{job.company || job.companyName} · {job.location}</div>
        </div>
      }
      onClose={onClose}
      width="680px"
      footer={
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', width:'100%' }}>
          <button onClick={onClose} style={{ ...btnG, padding:'10px 20px' }}>Close</button>
          <button onClick={onReject} style={{ ...btnD, padding:'10px 20px' }}>✕ Reject</button>
          <button onClick={onApprove} style={{ padding:'10px 20px', fontWeight:800, fontSize:13, border:'none', borderRadius:10, cursor:'pointer', background:'linear-gradient(135deg,#16a34a,#15803d)', color:'#fff' }}>✓ Approve & Publish</button>
        </div>
      }
    >
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {[
            ['Department',job.department],['Job Type',job.jobType],['Experience',job.experience],['Location',job.location],['Openings',job.numberOfOpenings],['Urgency',job.urgency]
          ].filter(([,v]) => v).map(([label, val]) => (
            <div key={label} style={{ background:'#F8FAFC', borderRadius:8, padding:'10px 14px' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', marginBottom:2 }}>{label}</div>
              <div style={{ fontSize:13, fontWeight:600, color:'#0F172A' }}>{val}</div>
            </div>
          ))}
        </div>
        {Array.isArray(job.skills) && job.skills.length > 0 && (
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>Required Skills</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {job.skills.map(s => <span key={s} style={{ background:'rgba(27,79,216,0.1)', color:'#1B4FD8', fontSize:12, fontWeight:600, padding:'3px 10px', borderRadius:20 }}>{s}</span>)}
            </div>
          </div>
        )}
        {job.description && (
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:8 }}>Description</div>
            <div style={{ fontSize:13, color:'#374151', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{job.description}</div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function AdminJobApproval({ user, onBadgeUpdate }) {
  const [jobs, setJobs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState('');
  const [preview, setPreview]   = useState(null);
  const [rejectJob, setRejectJob] = useState(null);
  const [processing, setProcessing] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getPendingApprovalJobs();
      const list = Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []);
      setJobs(list);
      onBadgeUpdate?.(list.length);
    } catch { setJobs([]); }
    setLoading(false);
  }, [onBadgeUpdate]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (jobId) => {
    setProcessing(jobId);
    try {
      await api.approveJobNew(jobId);
      const updated = jobs.filter(j => (j.id || j._id?.toString()) !== jobId);
      setJobs(updated);
      onBadgeUpdate?.(updated.length);
      setPreview(null);
      setToast('✅ Job approved and is now live!');
    } catch (e) { setToast(`❌ ${e.message}`); }
    setProcessing('');
  };

  const handleReject = async (jobId, note) => {
    setProcessing(jobId);
    try {
      await api.rejectJob(jobId, note);
      const updated = jobs.filter(j => (j.id || j._id?.toString()) !== jobId);
      setJobs(updated);
      onBadgeUpdate?.(updated.length);
      setRejectJob(null);
      setPreview(null);
      setToast('Job returned to recruiter for revision.');
    } catch (e) { setToast(`❌ ${e.message}`); }
    setProcessing('');
  };

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';

  return (
    <div style={{ fontFamily: ff }}>
      <Toast msg={toast} onClose={() => setToast('')} />
      {preview && (
        <JobPreviewModal
          job={preview}
          onClose={() => setPreview(null)}
          onApprove={() => handleApprove(preview.id || preview._id?.toString())}
          onReject={() => { setRejectJob(preview); setPreview(null); }}
        />
      )}
      {rejectJob && (
        <RejectModal
          job={rejectJob}
          onClose={() => setRejectJob(null)}
          onConfirm={note => handleReject(rejectJob.id || rejectJob._id?.toString(), note)}
        />
      )}

      <PageHeader
        title="Job Approval Queue"
        subtitle={loading ? 'Loading…' : jobs.length === 0 ? 'All clear — no pending reviews' : `${jobs.length} job${jobs.length !== 1 ? 's' : ''} awaiting your review`}
      />

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:80 }}><Spinner size={36} /></div>
      ) : jobs.length === 0 ? (
        <div style={{ ...card, textAlign:'center', padding:'60px 40px' }}>
          <div style={{ fontSize:52, marginBottom:12 }}>✅</div>
          <h3 style={{ color:'#0A1628', fontWeight:800, margin:'0 0 8px' }}>All caught up!</h3>
          <p style={{ color:'#64748B', margin:0 }}>No jobs pending approval at this time.</p>
        </div>
      ) : (
        <div style={{ ...card, padding:0, overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
              <thead>
                <tr style={{ background:'#F8FAFC' }}>
                  {['Job Title','Department','Posted By','Date Submitted','Skills','Actions'].map(h => (
                    <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:0.5, borderBottom:'2px solid #E2E8F0', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => {
                  const id = job.id || job._id?.toString();
                  const poster = job.postedBy || job.createdBy;
                  const busy = processing === id;
                  return (
                    <tr key={id} style={{ borderBottom:'1px solid #F1F5F9' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding:'14px 16px' }}>
                        <div style={{ fontWeight:700, color:'#0A1628', fontSize:14 }}>{job.title}</div>
                        <div style={{ color:'#64748B', fontSize:12, marginTop:2 }}>{job.company || job.companyName || '—'}</div>
                      </td>
                      <td style={{ padding:'14px 16px', color:'#374151', fontSize:13 }}>{job.department || '—'}</td>
                      <td style={{ padding:'14px 16px' }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'#0A1628' }}>{poster?.name || '—'}</div>
                        <div style={{ fontSize:11, color:'#94A3B8' }}>{poster?.email || ''}</div>
                      </td>
                      <td style={{ padding:'14px 16px', color:'#64748B', fontSize:13, whiteSpace:'nowrap' }}>{fmtDate(job.createdAt)}</td>
                      <td style={{ padding:'14px 16px' }}>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                          {(Array.isArray(job.skills) ? job.skills.slice(0,3) : []).map(s => (
                            <span key={s} style={{ background:'rgba(27,79,216,0.08)', color:'#1B4FD8', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{s}</span>
                          ))}
                          {Array.isArray(job.skills) && job.skills.length > 3 && <span style={{ color:'#94A3B8', fontSize:10 }}>+{job.skills.length-3}</span>}
                        </div>
                      </td>
                      <td style={{ padding:'14px 16px' }}>
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          <button onClick={() => setPreview(job)} style={{ ...btnG, padding:'6px 12px', fontSize:12 }} disabled={busy}>👁 Preview</button>
                          <button onClick={() => handleApprove(id)} disabled={busy}
                            style={{ padding:'6px 12px', fontSize:12, fontWeight:700, border:'none', borderRadius:8, cursor:'pointer', background:'#16a34a', color:'#fff', opacity:busy?0.6:1 }}>
                            {busy ? '…' : '✓'}
                          </button>
                          <button onClick={() => setRejectJob(job)} disabled={busy}
                            style={{ padding:'6px 12px', fontSize:12, fontWeight:700, border:'none', borderRadius:8, cursor:'pointer', background:'#dc2626', color:'#fff', opacity:busy?0.6:1 }}>
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
