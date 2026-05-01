import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../../components/ui/Toast.jsx';
import UserDetailDrawer from '../../components/shared/UserDetailDrawer.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Modal from '../../components/ui/Modal.jsx';
import ResumeCard from '../../components/shared/ResumeCard.jsx';
import PostJobForm from '../../components/shared/PostJobForm.jsx';
import { btnP, btnG, btnD, card } from '../../constants/styles.js';
import { SM } from '../../constants/stages.js';
import { api } from '../../api/api.js';
import AssessmentBuilder from '../../components/assessments/AssessmentBuilder.jsx';
import JobDetailDrawer from '../../components/shared/JobDetailDrawer.jsx';
import ShareJobModal from '../../components/shared/ShareJobModal.jsx';

// ── Applicants Panel ──────────────────────────────────────────────────────────
function ApplicantsPanel({ job, onClose }) {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editCandidate, setEditCandidate] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getApplications({ jobId: job._id || job.id, limit: 500 })
      .then(a => setApps(Array.isArray(a) ? a : (a?.data || [])))
      .finally(() => setLoading(false));
  }, [job.id]);

  const displayed = search
    ? apps.filter(a => { const n = (a.candidateId||a.candidate)?.name||''; return n.toLowerCase().includes(search.toLowerCase()) || (a.candidateId||a.candidate)?.email?.toLowerCase().includes(search.toLowerCase()); })
    : apps;

  return (
    <>
      {editCandidate && <UserDetailDrawer user={editCandidate} onClose={() => setEditCandidate(null)} onUpdated={() => setEditCandidate(null)} />}
      <Modal title={`👥 Applicants — ${job.title} @ ${job.companyName || job.company}`} onClose={onClose} wide>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>
        ) : apps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#706E6B' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <p>No applicants yet for this job.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…" style={{ flex: 1, padding: '9px 14px', borderRadius: 10, border: '1.5px solid #DDDBDA', fontSize: 13, outline: 'none' }} />
              <span style={{ color: '#706E6B', fontSize: 12, whiteSpace: 'nowrap' }}>{displayed.length} / {apps.length} shown</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {displayed.map(app => {
                const c = app.candidateId || app.candidate || {};
                const s = SM[app.stage] || { color: '#0176D3', label: app.stage || 'Applied', icon: '•' };
                const cid = c.id || c._id?.toString();
                return (
                  <div key={app.id || app._id} style={{ background: '#F8FAFF', border: `1.5px solid ${s.color}25`, borderRadius: 14, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#0176D3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 17, flexShrink: 0 }}>
                        {(c.name || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#181818' }}>{c.name || 'Unknown'}</div>
                        {c.title && <div style={{ fontSize: 12, color: '#0176D3', marginTop: 1 }}>{c.title}{c.currentCompany ? ` @ ${c.currentCompany}` : ''}</div>}
                        <div style={{ fontSize: 11, color: '#706E6B', marginTop: 2 }}>{c.email}{c.phone ? ` · ${c.phone}` : ''}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                          {c.experience !== undefined && c.experience !== null && <span style={{ fontSize: 11, background: '#F3F4F6', borderRadius: 20, padding: '2px 8px', color: '#706E6B' }}>⏱ {c.experience}y exp</span>}
                          {c.currentCTC && <span style={{ fontSize: 11, background: '#F3F4F6', borderRadius: 20, padding: '2px 8px', color: '#706E6B' }}>CTC: {c.currentCTC}</span>}
                          {c.expectedCTC && <span style={{ fontSize: 11, background: '#F3F4F6', borderRadius: 20, padding: '2px 8px', color: '#706E6B' }}>Exp: {c.expectedCTC}</span>}
                          {c.candidateStatus && <span style={{ fontSize: 11, background: 'rgba(1,118,211,0.08)', borderRadius: 20, padding: '2px 8px', color: '#0176D3' }}>{c.candidateStatus}</span>}
                        </div>
                        {c.skills && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                            {(Array.isArray(c.skills) ? c.skills : (c.skills||'').split(',').map(s=>s.trim()).filter(Boolean)).slice(0,5).map(sk => <Badge key={sk} label={sk} color="#0154A4" />)}
                          </div>
                        )}
                        {c.summary && <p style={{ color: '#706E6B', fontSize: 11, lineHeight: 1.5, margin: '6px 0 0', borderLeft: '2px solid rgba(1,118,211,0.25)', paddingLeft: 8 }}>{c.summary.slice(0,140)}{c.summary.length>140?'…':''}</p>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                        <span style={{ background:`${s.color}18`, color:s.color, border:`1px solid ${s.color}40`, borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700 }}>{s.label}</span>
                        <span style={{ color:'#9E9D9B', fontSize:10 }}>{new Date(app.createdAt).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F3F2F2', display: 'flex', gap: 8 }}>
                      <button onClick={() => setEditCandidate(cid ? { role:'candidate', ...c, id: cid } : null)} style={{ ...btnP, padding:'6px 14px', fontSize:12 }}>✏️ Edit Profile</button>
                      <button onClick={() => cid && navigate(`/app/resume/${cid}`)} style={{ ...btnG, padding:'6px 14px', fontSize:12 }}>📋 View Resume</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RecruiterJobs({ user }) {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]); const [loading, setLoad] = useState(true); const [showModal, setShow] = useState(false);
  const [saving, setSaving] = useState(false); const [toast, setToast] = useState("");
  const [applicantsJob, setApplicantsJob] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [shareJob, setShareJob] = useState(null);
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentSettings, setAssessmentSettings] = useState({ title: '', instructions: '', timeLimitMins: 0, passingScore: 0, isActive: true, autoAdvance: false });
  const [assessmentQuestions, setAssessmentQuestions] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [urgencyFilter, setUrgencyFilter] = useState('All');
  const [editingJob, setEditingJob] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const postJobRef = useRef(null);

  const normalizeJob = j => ({ ...j, id: j.id || j._id?.toString() || String(j._id || '') });

  const load = () => {
    setLoad(true);
    api.getJobs({ recruiterId: user.id, limit: 200 })
      .then(r => {
        const raw = Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : []);
        // Deduplicate by ID to prevent ghost/duplicate items
        const map = new Map();
        raw.forEach(item => {
          const job = normalizeJob(item);
          if (job.id) map.set(job.id, job);
        });
        setJobs(Array.from(map.values()));
      })
      .catch(() => setJobs([]))
      .finally(() => setLoad(false));
  };
  useEffect(load, [user.id]);

  const filteredJobs = jobs.filter(j => {
    if (search) { const q=search.toLowerCase(); if (!j.title?.toLowerCase().includes(q) && !j.company?.toLowerCase().includes(q)) return false; }
    // Handle both backend 'active' and frontend 'Open' labels
    const mappedStatus = (j.status === 'active' || j.status === 'Open') ? 'Open' : (j.status === 'closed' || j.status === 'Closed' ? 'Closed' : 'Draft');
    if (statusFilter !== 'All' && mappedStatus !== statusFilter) return false;
    if (urgencyFilter !== 'All' && j.urgency !== urgencyFilter) return false;
    return true;
  });
  const hasJobFilters = !!(search || statusFilter!=='All' || urgencyFilter!=='All');
  const fSel = { padding:'8px 12px', borderRadius:8, border:'1px solid rgba(1,118,211,0.2)', background:'#F3F2F2', color:'#706E6B', fontSize:13, outline:'none', cursor:'pointer' };
  const resetModal = () => { setShow(false); setShowAssessment(false); setAssessmentQuestions([]); setAssessmentSettings({ title: '', instructions: '', timeLimitMins: 0, passingScore: 0, isActive: true, autoAdvance: false }); postJobRef.current?.reset?.(); };
  const save = async (form) => {
    if (!form.title || !form.company) { setToast("❌ Title and company required"); return; }
    const eu = (form.externalUrl || '').trim();
    if (eu && !/^https?:\/\//i.test(eu)) { setToast("❌ External URL must start with http:// or https://"); return; }
    setSaving(true);
    try {
      const res = await api.createJob({ ...form, externalUrl: eu, recruiterId: user.id });
      const job = res?.data || res;
      if (assessmentQuestions.length > 0) {
        try {
          await api.createAssessment({ jobId: job.id, ...assessmentSettings, title: assessmentSettings.title || `${form.title} — Screening`, questions: assessmentQuestions });
        } catch (ae) { setToast(`✅ Job posted! (Assessment error: ${ae.message})`); setSaving(false); resetModal(); load(); return; }
      }
      setToast("✅ Job posted!" + (assessmentQuestions.length > 0 ? " Assessment attached." : ""));
      resetModal(); load();
    } catch (e) { setToast(`❌ ${e.message}`); }
    setSaving(false);
  };
  const del = async (id) => {
    if (!window.confirm("Delete this job posting? This will also remove all applicant data for this job.")) return;
    try { await api.deleteJob(id); load(); setToast("✅ Job deleted"); }
    catch (e) { setToast(`❌ ${e.message}`); }
  };
  const toggle = async (id, status) => {
    const isClosed = status === 'closed' || status === 'Closed';
    try {
      await api.patchJob(id, { status: isClosed ? 'active' : 'closed' });
      load();
      setToast(`✅ Job ${isClosed ? 'reopened' : 'closed'}`);
    } catch (e) { setToast(`❌ ${e.message}`); }
  };

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast("")} />
      {shareJob && <ShareJobModal job={shareJob} onClose={() => setShareJob(null)} user={user} />}
      {selectedJob && (
        <JobDetailDrawer
          job={selectedJob}
          user={user}
          onClose={() => setSelectedJob(null)}
          onJobUpdated={(updated) => {
            setJobs(prev => prev.map(j => j.id === updated.id ? updated : j));
            setSelectedJob(updated);
          }}
        />
      )}
      {applicantsJob && <ApplicantsPanel job={applicantsJob} onClose={() => setApplicantsJob(null)} />}
      <PageHeader 
        title="My Job Postings" 
        subtitle={hasJobFilters ? `${filteredJobs.length} of ${jobs.length} roles` : `${jobs.filter(j => j.status === 'active' || j.status === 'Open').length} open roles out of ${jobs.length} total`} 
        action={<button onClick={() => setShow(true)} style={btnP}>+ Post Job</button>} 
      />

      {!loading && jobs.length > 0 && (
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', marginBottom:16, padding:'12px 16px', background:'#fff', borderRadius:12, border:'1px solid #F3F2F2', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <input placeholder="Search title or company…" value={search} onChange={e=>setSearch(e.target.value)}
            style={{ flex:'1 1 180px', minWidth:150, padding:'8px 12px', borderRadius:8, border:'1px solid rgba(1,118,211,0.2)', background:'#F3F2F2', color:'#181818', fontSize:13, outline:'none' }} />
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={fSel}>
            <option value="All">All Status</option>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
          </select>
          <select value={urgencyFilter} onChange={e=>setUrgencyFilter(e.target.value)} style={{ ...fSel, color:urgencyFilter!=='All'?'#0176D3':'#706E6B' }}>
            <option value="All">All Urgency</option>
            <option value="High">🔴 High</option>
            <option value="Medium">🟡 Medium</option>
            <option value="Low">🟢 Low</option>
          </select>
          {hasJobFilters && (
            <button onClick={()=>{setSearch('');setStatusFilter('All');setUrgencyFilter('All');}}
              style={{ background:'none', border:'none', color:'#BA0517', fontSize:12, cursor:'pointer', fontWeight:600 }}>✕ Clear</button>
          )}
        </div>
      )}

      {loading ? <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#706E6B', padding: '40px 0', justifyContent: 'center' }}><Spinner /> Loading jobs...</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {jobs.length === 0 && <p style={{ color: "#706E6B" }}>No jobs posted yet.</p>}
          {filteredJobs.length === 0 && jobs.length > 0 && <p style={{ color:'#9E9D9B', textAlign:'center', padding:'32px 0' }}>No jobs match your filters.</p>}
          {filteredJobs.map(j => (
            <div key={j.id} style={card}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ color: "#181818", fontWeight: 600 }}>{j.title}</span>
                    <Badge label={(j.status === 'active' || j.status === 'Open') ? 'Open' : (j.status === 'closed' || j.status === 'Closed' ? 'Closed' : 'Draft')} color={(j.status === 'closed' || j.status === 'Closed') ? '#BA0517' : (j.status === 'draft' ? '#A07E00' : '#2E844A')} />
                    <Badge label={j.urgency || 'Medium'} color={j.urgency === 'High' ? '#BA0517' : j.urgency === 'Medium' ? '#A07E00' : '#2E844A'} />
                    {j.externalUrl && <Badge label="🌐 External" color="#F59E0B" />}
                  </div>
                  <div style={{ color: "#0176D3", fontSize: 12 }}>{j.company} · {j.location} · {j.experience}</div>
                  {j.externalUrl && (
                    <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#706E6B', fontSize: 11 }}>🔗</span>
                      <a href={j.externalUrl} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#F59E0B', fontSize: 11, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 320 }}
                        title={j.externalUrl}>
                        {j.externalUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}
                      </a>
                    </div>
                  )}
                  {j.description && <p style={{ color: "#706E6B", fontSize: 12, marginTop: 6 }}>{j.description}</p>}
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
                    {(Array.isArray(j.skills) ? j.skills : (j.skills || '').split(',').map(s => s.trim()).filter(Boolean)).map(s => <Badge key={s} label={s.trim()} color="#0176D3" />)}
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                    <span style={{ color: "#706E6B", fontSize: 12 }}>👥 {j.applicantsCount} applicants</span>
                    <span style={{ color: "#2E844A", fontSize: 12 }}>🎉 {j.selectedCount} hired</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  <button onClick={() => setSelectedJob(j)} style={{ ...btnP, padding: '6px 14px', fontSize: 12 }}>View Details</button>
                  <button onClick={() => setShareJob(j)} style={{ ...btnG, padding: '6px 14px', fontSize: 12 }}>📣 Share</button>
                  <button
                    onClick={() => setApplicantsJob(j)}
                    style={{ ...btnG, padding: '6px 14px', fontSize: 12 }}
                  >
                    👥 {j.applicantsCount > 0 ? `${j.applicantsCount} Applicant${j.applicantsCount !== 1 ? 's' : ''}` : 'Applicants'}
                  </button>
                  <button onClick={e => { e.stopPropagation(); setEditingJob(j); }} style={{ ...btnG, padding: '6px 14px', fontSize: 12 }}>✏️ Edit</button>
                  {j.status === 'draft' && (
                    <button
                      onClick={async () => {
                        try {
                          // Correct flow: set approvalStatus=pending, keep status=draft
                          await api.patchJob(j.id, { approvalStatus: 'pending' });
                          setToast('✅ Submitted for admin approval');
                          load();
                        } catch (e) { setToast(`❌ ${e.message}`); }
                      }}
                      style={{ background: 'rgba(46,132,74,0.15)', border: '1px solid rgba(46,132,74,0.4)', borderRadius: 8, color: '#2E844A', padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                    >
                      🚀 Submit for Approval
                    </button>
                  )}
                  <button onClick={() => toggle(j.id, j.status)} style={{ ...btnG, padding: '6px 14px', fontSize: 12 }}>{(j.status === 'closed' || j.status === 'Closed') ? 'Reopen' : 'Close'}</button>
                  <button onClick={() => del(j.id)} style={{ ...btnD, padding: '6px 14px', fontSize: 12 }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <Modal title="💼 Post New Job" onClose={resetModal} wide
          footer={<>
            <button onClick={() => postJobRef.current?.submit()} disabled={saving} style={{ ...btnP, opacity: saving ? 0.6 : 1 }}>
              {saving ? <><Spinner /> Posting…</> : '📢 Post Job'}
            </button>
            <button onClick={resetModal} style={btnG}>Cancel</button>
          </>}>
          <PostJobForm ref={postJobRef} saving={saving} onSave={save} onCancel={resetModal} hideButtons>
            {/* Assessment section — recruiter-only add-on */}
            <div style={{ borderTop: '1px solid rgba(1,118,211,0.1)', paddingTop: 14, marginTop: 4 }}>
              <button
                onClick={() => setShowAssessment(!showAssessment)}
                style={{ background: showAssessment ? 'rgba(1,118,211,0.12)' : '#FFFFFF', border: `1px solid ${showAssessment ? 'rgba(1,118,211,0.3)' : '#DDDBDA'}`, borderRadius: 10, color: showAssessment ? '#0176D3' : '#706E6B', padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600, width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}
              >
                <span>📝 {showAssessment ? 'Hide' : 'Add'} Screening Assessment {assessmentQuestions.length > 0 ? `(${assessmentQuestions.length} questions)` : '(optional)'}</span>
                <span>{showAssessment ? '▲' : '▼'}</span>
              </button>
              {showAssessment && (
                <div style={{ marginTop: 12, padding: 16, background: '#FAFAFA', borderRadius: 10, border: '1px solid rgba(1,118,211,0.1)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 10, marginBottom: 12 }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ color: '#706E6B', fontSize: 11, display: 'block', marginBottom: 4 }}>Assessment Title</label>
                      <input value={assessmentSettings.title} onChange={e => setAssessmentSettings(p => ({ ...p, title: e.target.value }))} placeholder="Job — Screening"
                        style={{ width: '100%', padding: '7px 12px', background: '#FFFFFF', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 8, color: '#181818', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ color: '#706E6B', fontSize: 11, display: 'block', marginBottom: 4 }}>Time Limit (mins, 0 = unlimited)</label>
                      <input type="number" min="0" max="180" value={assessmentSettings.timeLimitMins} onChange={e => setAssessmentSettings(p => ({ ...p, timeLimitMins: parseInt(e.target.value) || 0 }))}
                        style={{ width: '100%', padding: '7px 12px', background: '#FFFFFF', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 8, color: '#181818', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ color: '#706E6B', fontSize: 11, display: 'block', marginBottom: 4 }}>Passing Score % (0 = no gate)</label>
                      <input type="number" min="0" max="100" value={assessmentSettings.passingScore} onChange={e => setAssessmentSettings(p => ({ ...p, passingScore: parseInt(e.target.value) || 0 }))}
                        style={{ width: '100%', padding: '7px 12px', background: '#FFFFFF', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 8, color: '#181818', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ color: '#706E6B', fontSize: 11, display: 'block', marginBottom: 4 }}>Instructions for candidates</label>
                      <textarea value={assessmentSettings.instructions} onChange={e => setAssessmentSettings(p => ({ ...p, instructions: e.target.value }))} rows={2}
                        placeholder="This assessment has 10 questions. Answer honestly. No external resources."
                        style={{ width: '100%', padding: '7px 12px', background: '#FFFFFF', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 8, color: '#181818', fontSize: 12, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ gridColumn: 'span 2', display: 'flex', gap: 16 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#3E3E3C', fontSize: 12 }}>
                        <input type="checkbox" checked={assessmentSettings.isActive} onChange={e => setAssessmentSettings(p => ({ ...p, isActive: e.target.checked }))} style={{ accentColor: '#0176D3' }} />
                        Active (candidates can take it)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#3E3E3C', fontSize: 12 }}>
                        <input type="checkbox" checked={assessmentSettings.autoAdvance} onChange={e => setAssessmentSettings(p => ({ ...p, autoAdvance: e.target.checked }))} style={{ accentColor: '#0176D3' }} />
                        Auto-advance to Shortlisted on pass
                      </label>
                    </div>
                  </div>
                  <AssessmentBuilder questions={assessmentQuestions} onChange={setAssessmentQuestions} />
                </div>
              )}
            </div>
          </PostJobForm>
        </Modal>
      )}

      {editingJob && (
        <Modal title={`✏️ Edit Job — ${editingJob.title}`} onClose={() => setEditingJob(null)}>
          <PostJobForm
            saving={editSaving}
            onSave={async (form) => {
              setEditSaving(true);
              try {
                await api.patchJob(editingJob.id, { ...form, externalUrl: (form.externalUrl||'').trim() });
                setToast('✅ Job updated!');
                setEditingJob(null);
                load();
              } catch (e) { setToast(`❌ ${e.message}`); }
              setEditSaving(false);
            }}
            onCancel={() => setEditingJob(null)}
            initialData={{
              title: editingJob.title || '',
              company: editingJob.company || editingJob.companyName || '',
              department: editingJob.department || '',
              location: editingJob.location || '',
              jobType: editingJob.jobType || 'Full-Time',
              workMode: editingJob.workMode || 'Onsite',
              experience: editingJob.experience || '',
              openings: editingJob.numberOfOpenings || editingJob.openings || '',
              applicationDeadline: editingJob.applicationDeadline || '',
              urgency: editingJob.urgency || 'Medium',
              skills: Array.isArray(editingJob.skills) ? editingJob.skills.join(', ') : (editingJob.skills || ''),
              description: editingJob.description || '',
              requirements: editingJob.requirements || '',
              benefits: editingJob.benefits || '',
              externalUrl: editingJob.externalUrl || '',
              isPublic: editingJob.isPublic !== false,
            }}
          />
        </Modal>
      )}
    </div>
  );
}