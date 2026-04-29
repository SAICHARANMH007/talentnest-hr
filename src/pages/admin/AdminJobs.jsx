import { useState, useEffect } from 'react';
import Toast from '../../components/ui/Toast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Modal from '../../components/ui/Modal.jsx';
import JobDetailDrawer from '../../components/shared/JobDetailDrawer.jsx';
import ShareJobModal from '../../components/shared/ShareJobModal.jsx';
import PostJobForm from '../../components/shared/PostJobForm.jsx';
import { btnP, btnG, btnD, card } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const fInp = { padding:'8px 12px', borderRadius:8, border:'1px solid rgba(1,118,211,0.2)', background:'#F3F2F2', color:'#181818', fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' };
const fSel = { ...fInp, cursor:'pointer' };

export default function AdminJobs({ user }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoad] = useState(true);
  const [toast, setToast] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [shareJob, setShareJob] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [urgencyFilter, setUrgencyFilter] = useState('All');
  const [locFilter, setLocFilter] = useState('All');
  const [recruiterFilter, setRecruiterFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assigningJob, setAssigningJob] = useState(null);
  const [assignTab, setAssignTab]       = useState('recruiter'); // 'recruiter' | 'candidates'
  const [recruiterUsers, setRecruiterUsers] = useState([]);
  const [candidateUsers, setCandidateUsers] = useState([]);
  const [assigningLoading, setAssigningLoading] = useState(false);
  const [candSearch, setCandSearch]     = useState('');
  const [selectedCandIds, setSelectedCandIds] = useState([]);
  const [jobApplications, setJobApplications] = useState([]);
  const [assessmentJob, setAssessmentJob] = useState(null); // job for add-assessment

  const normalizeJob = j => ({ ...j, id: j.id || j._id?.toString() || String(j._id || '') });
  const load = () => { setLoad(true); api.getJobs({ limit: 200 }).then(r => { const raw = Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : []); setJobs(raw.map(normalizeJob)); }).catch(() => setJobs([])).finally(() => setLoad(false)); };
  useEffect(() => {
    load();
    api.getUsers('recruiter').then(u => setRecruiterUsers(Array.isArray(u) ? u : (Array.isArray(u?.data) ? u.data : []))).catch(() => setRecruiterUsers([]));
    api.getUsers('candidate').then(u => setCandidateUsers(Array.isArray(u) ? u : (Array.isArray(u?.data) ? u.data : []))).catch(() => setCandidateUsers([]));
  }, []);

  const saveJob = async (form) => {
    if (!form.title || !form.company) { setToast('❌ Title and company are required'); return; }
    const eu = (form.externalUrl || '').trim();
    if (eu && !/^https?:\/\//i.test(eu)) { setToast('❌ External URL must start with http:// or https://'); return; }
    setSaving(true);
    try {
      await api.createJob({ ...form, externalUrl: eu, recruiterId: user.id });
      setToast('✅ Job posted!');
      setShowModal(false);
      load();
    } catch (e) { setToast(`❌ ${e.message}`); }
    setSaving(false);
  };

  const del = async (id) => {
    if (!window.confirm('Delete this job and all its applications?')) return;
    try { await api.deleteJob(id); load(); setToast('✅ Job deleted'); }
    catch (e) { setToast(`❌ ${e.message}`); }
  };
  const toggle = async (id, status) => {
    const isClosed = status === 'closed' || status === 'Closed';
    try { await api.patchJob(id, { status: isClosed ? 'active' : 'closed' }); load(); setToast(`✅ Job ${isClosed ? 'reopened' : 'closed'}`); }
    catch (e) { setToast(`❌ ${e.message}`); }
  };

  const locations   = [...new Set(jobs.map(j => j.location).filter(Boolean))];
  const recruiters  = [...new Set(jobs.map(j => j.recruiterName).filter(Boolean))];
  const filtered = jobs.filter(j => {
    if (search) { const q=search.toLowerCase(); if (!j.title?.toLowerCase().includes(q) && !j.company?.toLowerCase().includes(q) && !(j.skills||'').toLowerCase().includes(q)) return false; }
    if (statusFilter !== 'All' && j.status !== statusFilter) return false;
    if (urgencyFilter !== 'All' && j.urgency !== urgencyFilter) return false;
    if (locFilter !== 'All' && j.location !== locFilter) return false;
    if (recruiterFilter !== 'All' && j.recruiterName !== recruiterFilter) return false;
    return true;
  });
  const hasFilters = !!(search || statusFilter!=='All' || urgencyFilter!=='All' || locFilter!=='All' || recruiterFilter!=='All');

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      {shareJob && <ShareJobModal job={shareJob} onClose={() => setShareJob(null)} user={user} />}

      {showModal && (
        <Modal title="💼 Post New Job" onClose={() => setShowModal(false)}>
          <PostJobForm
            saving={saving}
            onSave={saveJob}
            onCancel={() => setShowModal(false)}
          />
        </Modal>
      )}
      {selectedJob && (
        <JobDetailDrawer
          job={selectedJob}
          user={user}
          onClose={() => setSelectedJob(null)}
          onJobUpdated={(updated) => {
            const u = normalizeJob(updated); setJobs(prev => prev.map(j => j.id === u.id ? u : j)); setSelectedJob(u);
          }}
          onDelete={(id) => { del(id); setSelectedJob(null); }}
        />
      )}

      <PageHeader title="All Job Postings" subtitle={hasFilters ? `${filtered.length} of ${jobs.length} jobs` : `${jobs.length} total jobs across all recruiters`}
        action={<button onClick={() => setShowModal(true)} style={btnP}>+ Post Job</button>} />

      {!loading && jobs.length > 0 && (
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', marginBottom:16, padding:'12px 16px', background:'#fff', borderRadius:12, border:'1px solid #F3F2F2', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <input placeholder="Search title, company, skills…" value={search} onChange={e=>setSearch(e.target.value)}
            style={{ flex:'1 1 200px', minWidth:160, padding:'8px 12px', borderRadius:8, border:'1px solid rgba(1,118,211,0.2)', background:'#F3F2F2', color:'#181818', fontSize:13, outline:'none' }} />
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={fSel}>
            <option value="All">All Status</option>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
          </select>
          <select value={urgencyFilter} onChange={e=>setUrgencyFilter(e.target.value)} style={{ ...fSel, color:urgencyFilter!=='All'?'#0176D3':'#706E6B' }}>
            <option value="All">All Urgency</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          {locations.length > 0 && (
            <select value={locFilter} onChange={e=>setLocFilter(e.target.value)} style={{ ...fSel, color:locFilter!=='All'?'#0176D3':'#706E6B' }}>
              <option value="All">All Locations</option>
              {locations.map(l=><option key={l} value={l}>{l}</option>)}
            </select>
          )}
          {recruiters.length > 0 && (
            <select value={recruiterFilter} onChange={e=>setRecruiterFilter(e.target.value)} style={{ ...fSel, color:recruiterFilter!=='All'?'#0176D3':'#706E6B' }}>
              <option value="All">All Recruiters</option>
              {recruiters.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
          )}
          {hasFilters && (
            <button onClick={()=>{setSearch('');setStatusFilter('All');setUrgencyFilter('All');setLocFilter('All');setRecruiterFilter('All');}}
              style={{ background:'none', border:'none', color:'#BA0517', fontSize:12, cursor:'pointer', fontWeight:600 }}>✕ Clear</button>
          )}
        </div>
      )}

      {loading ? <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#706E6B', padding: '40px 0', justifyContent: 'center' }}><Spinner /> Loading jobs...</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0 && jobs.length > 0 && <p style={{ color:'#9E9D9B', textAlign:'center', padding:'32px 0' }}>No jobs match your filters.</p>}
          {filtered.map(j => (
            <div key={j.id} style={{ ...card, cursor: 'pointer' }} onClick={() => setSelectedJob(j)}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ color: '#181818', fontWeight: 700, fontSize: 14 }}>{j.title}</span>
                    <Badge label={j.status === 'active' ? 'Open' : j.status === 'closed' ? 'Closed' : j.status === 'draft' ? 'Draft' : (j.status || 'Draft')} color={j.status === 'closed' || j.status === 'Closed' ? '#BA0517' : j.status === 'draft' ? '#A07E00' : '#2E844A'} />
                    <Badge label={j.urgency || 'Medium'} color={j.urgency === 'High' ? '#BA0517' : j.urgency === 'Medium' ? '#A07E00' : '#2E844A'} />
                    {j.approvalStatus === 'pending' && <Badge label="Pending Approval" color="#A07E00" />}
                  </div>
                  <div style={{ color: '#0176D3', fontSize: 13 }}>{j.company} · {j.location}</div>
                  <div style={{ color: '#706E6B', fontSize: 12, marginTop: 3 }}>
                    Recruiter: <strong style={{ color: '#3E3E3C' }}>{j.recruiterName || 'Unassigned'}</strong>
                    {j.applicationDeadline && <span style={{ marginLeft: 12 }}>Deadline: {j.applicationDeadline}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
                    <span style={{ color: '#706E6B', fontSize: 12 }}>👥 {j.applicantsCount || 0} applicants</span>
                    <span style={{ color: '#2E844A', fontSize: 12 }}>🎉 {j.selectedCount || 0} hired</span>
                    {j.skills && <span style={{ color: '#706E6B', fontSize: 12 }}>🛠 {(Array.isArray(j.skills) ? j.skills : (j.skills || '').split(',').map(s => s.trim()).filter(Boolean)).slice(0,3).join(', ')}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => setSelectedJob(j)} style={{ ...btnP, padding: '7px 12px', fontSize: 11 }}>View Details</button>
                  <button onClick={() => setShareJob(j)} style={{ ...btnG, padding: '7px 12px', fontSize: 11 }}>📣 Share</button>
                  <button onClick={e => { e.stopPropagation(); setAssessmentJob(j); }} style={{ ...btnG, padding: '7px 12px', fontSize: 11 }}>📋 Assessment</button>
                  <button onClick={e => { e.stopPropagation(); setAssigningJob(j); setAssignTab('recruiter'); setSelectedCandIds([]); setCandSearch('');
                    api.getApplications({ jobId: j.id, limit: 500 }).then(r => setJobApplications(Array.isArray(r) ? r : (r?.data || []))).catch(() => setJobApplications([]));
                  }} style={{ ...btnG, padding: '7px 12px', fontSize: 11 }}>👤 Assign</button>
                  <button onClick={() => toggle(j.id, j.status)} style={{ ...btnG, padding: '7px 12px', fontSize: 11 }}>{(j.status === 'closed' || j.status === 'Closed') ? 'Reopen' : 'Close'}</button>
                  <button onClick={() => del(j.id)} style={btnD}>Delete</button>
                </div>
              </div>
            </div>
          ))}
          {jobs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#706E6B' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💼</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#3E3E3C' }}>No jobs posted yet</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Recruiters can post jobs from their dashboard</div>
            </div>
          )}
        </div>
      )}

      {assigningJob && (() => {
        const assignedCandIds = new Set(jobApplications.map(a => String(a.candidateId || a.candidate?._id || '')));
        const filtCands = candidateUsers.filter(c => {
          if (!candSearch) return true;
          const q = candSearch.toLowerCase();
          return (c.name||'').toLowerCase().includes(q) || (c.email||'').toLowerCase().includes(q) || (c.title||'').toLowerCase().includes(q);
        });
        return (
          <div style={{ position:'fixed', inset:0, background:'rgba(5,13,26,0.72)', backdropFilter:'blur(6px)', zIndex:10001, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'24px 16px', overflowY:'auto' }}>
            <div style={{ background:'#fff', borderRadius:16, padding:0, width:'100%', maxWidth:520, boxShadow:'0 8px 40px rgba(0,0,0,0.2)', overflow:'hidden' }}>
              {/* Header */}
              <div style={{ padding:'18px 24px 0', background:'linear-gradient(135deg,#032D60,#0176D3)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                  <div>
                    <div style={{ color:'#fff', fontWeight:800, fontSize:16 }}>Assign — {assigningJob.title}</div>
                    <div style={{ color:'rgba(255,255,255,0.7)', fontSize:12, marginTop:2 }}>{assigningJob.company}{assigningJob.location ? ` · ${assigningJob.location}` : ''}</div>
                  </div>
                  <button onClick={() => setAssigningJob(null)} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:6, color:'#fff', cursor:'pointer', padding:'4px 10px', fontSize:16 }}>✕</button>
                </div>
                {/* Tabs */}
                <div style={{ display:'flex', gap:0 }}>
                  {[{id:'recruiter',label:'👤 Assign Recruiter'},{id:'candidates',label:'👥 Assign Candidates'}].map(t => (
                    <button key={t.id} onClick={() => setAssignTab(t.id)} style={{
                      background:'none', border:'none', padding:'8px 16px', color: assignTab===t.id ? '#fff' : 'rgba(255,255,255,0.6)',
                      fontWeight: assignTab===t.id ? 700 : 500, fontSize:13, cursor:'pointer',
                      borderBottom: assignTab===t.id ? '2px solid #fff' : '2px solid transparent',
                    }}>{t.label}</button>
                  ))}
                </div>
              </div>

              <div style={{ padding:'20px 24px' }}>
                {/* TAB: Recruiter */}
                {assignTab === 'recruiter' && (
                  <div>
                    <p style={{ color:'#706E6B', fontSize:13, margin:'0 0 14px' }}>Select a recruiter to own this job posting.</p>
                    <select id="assign-recruiter-sel" defaultValue={assigningJob.recruiterId || ''} style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1.5px solid #DDDBDA', fontSize:13, marginBottom:16, outline:'none', boxSizing:'border-box' }}>
                      <option value="">— Select recruiter —</option>
                      {recruiterUsers.map(r => <option key={r.id} value={r.id}>{r.name} ({r.email})</option>)}
                    </select>
                    <div style={{ display:'flex', gap:10 }}>
                      <button disabled={assigningLoading} onClick={async () => {
                        const sel = document.getElementById('assign-recruiter-sel').value;
                        if (!sel) return setToast('❌ Please select a recruiter');
                        setAssigningLoading(true);
                        try { await api.assignRecruiterToJob(assigningJob.id, sel); setToast('✅ Recruiter assigned!'); load(); setAssigningJob(null); }
                        catch (e) { setToast('❌ ' + e.message); }
                        setAssigningLoading(false);
                      }} style={{ ...btnP, flex:1, justifyContent:'center', opacity: assigningLoading ? 0.7 : 1 }}>
                        {assigningLoading ? 'Saving…' : '✓ Save Recruiter'}
                      </button>
                      <button onClick={() => setAssigningJob(null)} style={{ ...btnG, flex:1, justifyContent:'center' }}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* TAB: Candidates */}
                {assignTab === 'candidates' && (
                  <div>
                    <input placeholder="Search candidates…" value={candSearch} onChange={e => setCandSearch(e.target.value)}
                      style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:13, outline:'none', marginBottom:12, boxSizing:'border-box' }} />

                    <div style={{ maxHeight:280, overflowY:'auto', border:'1px solid #f1f5f9', borderRadius:10, marginBottom:12 }}>
                      {filtCands.length === 0 && <p style={{ color:'#9E9D9B', textAlign:'center', padding:'20px', fontSize:13, margin:0 }}>No candidates found.</p>}
                      {filtCands.map(c => {
                        const alreadyIn = assignedCandIds.has(String(c.id));
                        const app = jobApplications.find(a => String(a.candidateId||a.candidate?._id) === String(c.id));
                        const isSelected = selectedCandIds.includes(c.id);
                        return (
                          <label key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor: alreadyIn ? 'not-allowed' : 'pointer', background: isSelected ? 'rgba(1,118,211,0.05)' : 'transparent', borderBottom:'1px solid #f8fafc', opacity: alreadyIn ? 0.6 : 1 }}>
                            <input type="checkbox" checked={isSelected} disabled={alreadyIn}
                              onChange={() => setSelectedCandIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                              style={{ accentColor:'#0176D3', width:15, height:15, flexShrink:0 }} />
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ color:'#181818', fontSize:13, fontWeight:600 }}>{c.name}</div>
                              <div style={{ color:'#0176D3', fontSize:11 }}>{c.email}</div>
                              {c.title && <div style={{ color:'#706E6B', fontSize:11 }}>{c.title}{c.location ? ` · ${c.location}` : ''}</div>}
                            </div>
                            {alreadyIn && app && (
                              <span style={{ fontSize:10, fontWeight:700, background:'rgba(1,118,211,0.1)', color:'#0176D3', padding:'2px 8px', borderRadius:10, whiteSpace:'nowrap' }}>
                                {app.stage || 'Applied'}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>

                    {selectedCandIds.length > 0 && (
                      <div style={{ background:'rgba(1,118,211,0.06)', border:'1px solid rgba(1,118,211,0.2)', borderRadius:8, padding:'8px 12px', color:'#0176D3', fontSize:12, fontWeight:600, marginBottom:12 }}>
                        {selectedCandIds.length} candidate{selectedCandIds.length!==1?'s':''} selected
                      </div>
                    )}

                    <div style={{ display:'flex', gap:10 }}>
                      <button disabled={assigningLoading || selectedCandIds.length === 0} onClick={async () => {
                        setAssigningLoading(true);
                        try {
                          await api.assignCandidatesToJob(assigningJob.id, selectedCandIds);
                          setToast(`✅ ${selectedCandIds.length} candidate${selectedCandIds.length!==1?'s':''} assigned!`);
                          setSelectedCandIds([]);
                          api.getApplications({ jobId: assigningJob.id, limit: 500 }).then(r => setJobApplications(Array.isArray(r) ? r : (r?.data || []))).catch(() => {});
                          load();
                        } catch (e) { setToast('❌ ' + e.message); }
                        setAssigningLoading(false);
                      }} style={{ ...btnP, flex:1, justifyContent:'center', opacity:(assigningLoading||selectedCandIds.length===0)?0.6:1 }}>
                        {assigningLoading ? 'Assigning…' : `Assign ${selectedCandIds.length||'?'} →`}
                      </button>
                      <button onClick={() => setAssigningJob(null)} style={{ ...btnG, flex:1, justifyContent:'center' }}>Close</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      {/* Assessment quick-link for a job */}
      {assessmentJob && (
        <div style={{ position:'fixed', inset:0, background:'rgba(5,13,26,0.72)', backdropFilter:'blur(6px)', zIndex:10001, display:'flex', alignItems:'flex-start', justifyContent:'center', overflowY:'auto', padding:'60px 16px 24px' }}>
          <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:440, margin:'auto 0', boxShadow:'0 24px 60px rgba(0,0,0,0.22)', overflow:'hidden' }}>
            <div style={{ background:'linear-gradient(135deg,#032D60,#0176D3)', padding:'16px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ margin:0, color:'#fff', fontSize:16, fontWeight:800 }}>📋 Assessment</h3>
              <button onClick={() => setAssessmentJob(null)} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', width:30, height:30, borderRadius:8, cursor:'pointer', fontSize:15 }}>✕</button>
            </div>
            <div style={{ padding:'20px 24px 24px' }}>
            <p style={{ color:'#374151', fontSize:13, margin:'0 0 16px' }}>Job: <strong style={{ color:'#032D60' }}>{assessmentJob.title}</strong></p>
            <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, padding:'12px 16px', fontSize:13, color:'#1d4ed8', marginBottom:20, lineHeight:1.6 }}>
              Go to the <strong>Assessments</strong> tab, select this job from the dropdown, then click <strong>"+ Create Assessment"</strong> to build a full assessment with questions, time limits, and anti-cheat settings.
            </div>
            <button onClick={() => setAssessmentJob(null)} style={{ ...btnP, width:'100%' }}>✅ Got it</button>
            </div>{/* end padding */}
          </div>
        </div>
      )}
    </div>
  );
}
