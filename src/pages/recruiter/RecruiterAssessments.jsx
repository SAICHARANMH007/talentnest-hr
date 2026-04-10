import { useState, useEffect } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Toast from '../../components/ui/Toast.jsx';
import { useNavigate } from 'react-router-dom';
import { card, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const RESULT_STYLE = {
  pass:    { color: '#34d399', label: '✅ Passed' },
  fail:    { color: '#FE5C4C', label: '❌ Failed' },
  pending: { color: '#F59E0B', label: '⏳ Pending' },
};

function fmtSecs(s) {
  if (!s) return '—';
  const m = Math.floor(s / 60), sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const BLANK_QUESTION = () => ({ id: Date.now() + Math.random(), text: '', type: 'text', marks: 10, options: [] });
const BLANK_FORM = () => ({
  title: '', instructions: '', timeLimitMins: 30, passingScore: 60,
  autoAdvance: false, isActive: true,
  questions: [BLANK_QUESTION()],
});

export default function RecruiterAssessments({ user }) {
  const navigate = useNavigate();
  const [jobs, setJobs]             = useState([]);
  const [selJob, setSelJob]         = useState('');
  const [assessment, setAssessment] = useState(null);
  const [submissions, setSubs]      = useState([]);
  const [loading, setLoading]       = useState(false);
  const [toast, setToast]           = useState('');
  const [reviewModal, setReview]    = useState(null); // { assessmentId, submissionId }
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(BLANK_FORM());
  const [creating, setCreating]     = useState(false);

  useEffect(() => {
    api.getJobs(['admin','super_admin'].includes(user.role) ? undefined : user.id).then(j => setJobs(Array.isArray(j) ? j : (j?.data || []))).catch(() => setJobs([]));
  }, [user.id]);

  const loadJob = async (jobId) => {
    setSelJob(jobId);
    setAssessment(null);
    setSubs([]);
    if (!jobId) return;
    setLoading(true);
    try {
      const a = await api.getAssessmentForJob(jobId);
      if (!a) { setLoading(false); return; }
      setAssessment(a);
      const subs = await api.getAssessmentSubmissions(a._id || a.id);
      setSubs(Array.isArray(subs) ? subs : []);
    } catch (e) {
      if (!e.message?.includes('No assessment')) setToast('❌ ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveAssessment = async (status) => {
    const f = createForm;
    if (!f.jobId) { setToast('❌ Please select a job first'); return; }
    if (!f.title.trim()) { setToast('❌ Assessment title is required'); return; }
    if (!f.questions.length) { setToast('❌ Add at least one question'); return; }
    if (f.questions.some(q => !q.text.trim())) { setToast('❌ All questions must have text'); return; }
    if (f.questions.some(q => !q.marks || q.marks <= 0)) { setToast('❌ All questions must have marks > 0'); return; }
    setCreating(true);
    try {
      const qs = f.questions.map(q => ({ id: String(q.id), text: q.text, type: q.type, marks: Number(q.marks), options: q.options || [] }));
      const payload = { jobId: f.jobId, title: f.title, instructions: f.instructions, timeLimitMins: Number(f.timeLimitMins) || 0, passingScore: Number(f.passingScore) || 0, isActive: status === 'publish', autoAdvance: f.autoAdvance, questions: qs };
      const existing = assessment && (assessment._id || assessment.id);
      if (existing) {
        await api.updateAssessment(existing, payload);
        setToast('✅ Assessment updated!');
      } else {
        await api.createAssessment(payload);
        setToast('✅ Assessment created!');
      }
      setShowCreate(false);
      loadJob(f.jobId || selJob);
    } catch (e) { setToast('❌ ' + e.message); }
    setCreating(false);
  };

  const addQuestion = () => setCreateForm(p => ({ ...p, questions: [...p.questions, BLANK_QUESTION()] }));
  const removeQuestion = (id) => setCreateForm(p => ({ ...p, questions: p.questions.filter(q => q.id !== id) }));
  const updateQuestion = (id, field, val) => setCreateForm(p => ({ ...p, questions: p.questions.map(q => q.id === id ? { ...q, [field]: val } : q) }));

  const passCount = submissions.filter(s => s.result === 'pass').length;
  const failCount = submissions.filter(s => s.result === 'fail').length;
  const pendCount = submissions.filter(s => s.result === 'pending' || !s.result).length;

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />

      <PageHeader title="Assessments" subtitle="Review candidate assessment submissions"
        action={<button onClick={() => { setCreateForm(BLANK_FORM()); setShowCreate(true); }} style={{ background:'linear-gradient(135deg,#0176D3,#0154A4)',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontWeight:700,fontSize:13,cursor:'pointer' }}>+ Create Assessment</button>}
      />

      <div style={{ ...card, marginBottom: 20 }}>
        <label style={{ color: '#0176D3', fontSize: 11, display: 'block', marginBottom: 6 }}>Select Job</label>
        <select value={selJob} onChange={e => loadJob(e.target.value)} style={inp}>
          <option value="">— Choose a job —</option>
          {jobs.map(j => <option key={j._id} value={j._id}>{j.title}{j.companyName ? ` @ ${j.companyName}` : ''}</option>)}
        </select>
      </div>

      {loading && <p style={{ color: '#706E6B' }}><Spinner /> Loading…</p>}

      {!loading && selJob && !assessment && (
        <div style={{ ...card, textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 28, margin: '0 0 8px' }}>📋</p>
          <p style={{ color: '#706E6B', fontSize: 13 }}>No assessment attached to this job yet.</p>
          <button
            onClick={() => { setCreateForm({ ...BLANK_FORM(), jobId: selJob }); setShowCreate(true); }}
            style={{ background: 'linear-gradient(135deg,#0176D3,#0154A4)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginTop: 8 }}
          >+ Create Assessment</button>
        </div>
      )}

      {!loading && assessment && (
        <>
          {/* Assessment summary */}
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <h3 style={{ color: '#181818', fontSize: 15, fontWeight: 700, margin: 0 }}>{assessment.title}</h3>
                <Badge label={assessment.isActive ? '✅ Active' : '⏸ Inactive'} color={assessment.isActive ? '#2E844A' : '#64748b'} />
                {assessment.timeLimitMins > 0 && <Badge label={`⏱ ${assessment.timeLimitMins}m`} color="#0176D3" />}
                {assessment.passingScore > 0 && <Badge label={`Pass: ${assessment.passingScore}%`} color="#8b5cf6" />}
              </div>
              <button onClick={() => {
                const qs = Array.isArray(assessment.questions) ? assessment.questions.map(q => ({ ...q, id: q.id || Date.now() + Math.random() })) : [BLANK_QUESTION()];
                setCreateForm({ jobId: selJob, title: assessment.title, instructions: assessment.instructions || '', timeLimitMins: assessment.timeLimitMins || 30, passingScore: assessment.passingScore || 60, autoAdvance: assessment.autoAdvance || false, isActive: assessment.isActive !== false, questions: qs });
                setShowCreate(true);
              }} style={{ background: 'rgba(1,118,211,0.08)', border: '1px solid rgba(1,118,211,0.25)', borderRadius: 8, color: '#0176D3', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                ✏️ Edit Assessment
              </button>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#181818', fontWeight: 700, fontSize: 18 }}>{submissions.length}</div>
                <div style={{ color: '#9E9D9B', fontSize: 11 }}>Total</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#34d399', fontWeight: 700, fontSize: 18 }}>{passCount}</div>
                <div style={{ color: '#9E9D9B', fontSize: 11 }}>Passed</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#FE5C4C', fontWeight: 700, fontSize: 18 }}>{failCount}</div>
                <div style={{ color: '#9E9D9B', fontSize: 11 }}>Failed</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#F59E0B', fontWeight: 700, fontSize: 18 }}>{pendCount}</div>
                <div style={{ color: '#9E9D9B', fontSize: 11 }}>Pending</div>
              </div>
            </div>
          </div>

          {/* Submissions list */}
          {submissions.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: 32 }}>
              <p style={{ color: '#706E6B', fontSize: 13 }}>No submissions yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {submissions.map(sub => {
                const rs = RESULT_STYLE[sub.result] || RESULT_STYLE.pending;
                return (
                  <div key={sub.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#0176D3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                      {(sub.candidateName || '?')[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#181818', fontWeight: 600, fontSize: 14 }}>{sub.candidateName || 'Unknown'}</div>
                      <div style={{ color: '#706E6B', fontSize: 11 }}>{sub.candidateEmail}</div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 60 }}>
                      <div style={{ color: '#181818', fontWeight: 700 }}>{sub.percentage ?? '—'}%</div>
                      <div style={{ color: '#9E9D9B', fontSize: 10 }}>{sub.score ?? '—'}/{sub.maxScore}</div>
                    </div>
                    <div style={{ minWidth: 80, textAlign: 'center' }}>
                      <span style={{ color: rs.color, fontSize: 12, fontWeight: 700 }}>{rs.label}</span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: 11, minWidth: 100 }}>
                      ⏱ {fmtSecs(sub.timeSpentSecs)}<br />
                      📅 {fmtDate(sub.submittedAt)}
                    </div>
                    <button
                      onClick={() => navigate(`/app/review/${assessment._id || assessment.id}/${sub._id || sub.id}`)}
                      style={{ background: 'rgba(1,118,211,0.12)', border: '1px solid rgba(1,118,211,0.3)', borderRadius: 10, color: '#0176D3', padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      {sub.reviewedAt ? '✏️ Re-review' : '📋 Review'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      {/* ── Create / Edit Assessment Modal ────────────────────────────────── */}
      {showCreate && (
        <div style={{ position:'fixed', inset:0, background:'rgba(5,13,26,0.72)', backdropFilter:'blur(6px)', zIndex:10001, overflowY:'auto', padding:'24px 16px', display:'flex', alignItems:'flex-start', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:640, margin:'auto 0', boxShadow:'0 24px 60px rgba(0,0,0,0.22)', overflow:'hidden' }}>
            {/* Sticky header */}
            <div style={{ background:'linear-gradient(135deg,#032D60,#0176D3)', padding:'20px 28px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:1 }}>
              <div>
                <div style={{ color:'rgba(255,255,255,0.65)', fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', marginBottom:3 }}>Assessment Builder</div>
                <h3 style={{ margin:0, color:'#fff', fontSize:17, fontWeight:800 }}>
                  {assessment && (assessment._id || assessment.id) ? '✏️ Edit Assessment' : '+ Create Assessment'}
                </h3>
              </div>
              <button onClick={() => setShowCreate(false)} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', width:34, height:34, borderRadius:10, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }} aria-label="Close">✕</button>
            </div>
            <div style={{ padding:'24px 28px 28px', display:'flex', flexDirection:'column', gap:0 }}>

            {/* Job selector */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#475569', display:'block', marginBottom:5 }}>Job *</label>
              <select value={createForm.jobId || ''} onChange={e => setCreateForm(p => ({...p, jobId: e.target.value}))}
                style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none', background:'#f8fafc', boxSizing:'border-box' }}>
                <option value="">— Select a job —</option>
                {jobs.map(j => <option key={j._id||j.id} value={j._id||j.id}>{j.title}{j.companyName ? ` @ ${j.companyName}` : ''}</option>)}
              </select>
            </div>

            {/* Title & time */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'#475569', display:'block', marginBottom:5 }}>Title *</label>
                <input value={createForm.title} onChange={e => setCreateForm(p => ({...p, title: e.target.value}))}
                  placeholder="e.g. React Developer Screening" style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none', boxSizing:'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'#475569', display:'block', marginBottom:5 }}>Duration (mins)</label>
                <input type="number" value={createForm.timeLimitMins} onChange={e => setCreateForm(p => ({...p, timeLimitMins: parseInt(e.target.value) || 0}))}
                  min="0" style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none', boxSizing:'border-box' }} />
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'#475569', display:'block', marginBottom:5 }}>Passing Score (%)</label>
                <input type="number" value={createForm.passingScore} onChange={e => setCreateForm(p => ({...p, passingScore: parseInt(e.target.value) || 0}))}
                  min="0" max="100" style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none', boxSizing:'border-box' }} />
              </div>
              <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end', gap:8, paddingBottom:2 }}>
                <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer' }}>
                  <input type="checkbox" checked={createForm.autoAdvance} onChange={e => setCreateForm(p => ({...p, autoAdvance: e.target.checked}))} style={{ accentColor:'#0176D3', width:15, height:15 }} />
                  Auto-advance on pass
                </label>
              </div>
            </div>

            <div style={{ marginBottom:18 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#475569', display:'block', marginBottom:5 }}>Instructions (optional)</label>
              <textarea value={createForm.instructions} onChange={e => setCreateForm(p => ({...p, instructions: e.target.value}))}
                rows={2} placeholder="Instructions shown to candidate before they start…"
                style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none', resize:'vertical', fontFamily:'inherit', boxSizing:'border-box' }} />
            </div>

            {/* Questions */}
            <div style={{ borderTop:'1px solid #f1f5f9', paddingTop:16, marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <span style={{ fontSize:13, fontWeight:700, color:'#032D60' }}>Questions ({createForm.questions.length})</span>
                <button onClick={addQuestion} style={{ background:'rgba(1,118,211,0.08)', border:'1px solid rgba(1,118,211,0.25)', borderRadius:8, color:'#0176D3', padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer' }}>+ Add Question</button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {createForm.questions.map((q, idx) => (
                  <div key={q.id} style={{ background:'#f8fafc', borderRadius:10, padding:'14px', border:'1px solid #e2e8f0' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:'#64748b' }}>Q{idx + 1}</span>
                      {createForm.questions.length > 1 && (
                        <button onClick={() => removeQuestion(q.id)} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:13, padding:0 }}>✕ Remove</button>
                      )}
                    </div>
                    <textarea value={q.text} onChange={e => updateQuestion(q.id, 'text', e.target.value)}
                      rows={2} placeholder="Question text…"
                      style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none', resize:'vertical', fontFamily:'inherit', boxSizing:'border-box', marginBottom:8 }} />
                    <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                      <select value={q.type} onChange={e => updateQuestion(q.id, 'type', e.target.value)}
                        style={{ padding:'6px 10px', borderRadius:7, border:'1px solid #e2e8f0', fontSize:12, outline:'none', background:'#fff', cursor:'pointer' }}>
                        <option value="text">Text Answer</option>
                        <option value="mcq_single">MCQ (Single)</option>
                        <option value="mcq_multi">MCQ (Multi)</option>
                        <option value="code">Code</option>
                      </select>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <label style={{ fontSize:12, color:'#64748b', fontWeight:600 }}>Marks:</label>
                        <input type="number" value={q.marks} onChange={e => updateQuestion(q.id, 'marks', Number(e.target.value))}
                          min="1" style={{ width:60, padding:'6px 8px', borderRadius:7, border:'1px solid #e2e8f0', fontSize:12, outline:'none', textAlign:'center' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingTop:8, borderTop:'1px solid #f1f5f9', marginTop:8 }}>
              <button onClick={() => setShowCreate(false)} style={{ background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:10, padding:'10px 20px', fontSize:13, fontWeight:600, cursor:'pointer', color:'#64748b' }}>Cancel</button>
              <button onClick={() => saveAssessment('draft')} disabled={creating}
                style={{ background:'#fff', border:'1.5px solid #0176D3', borderRadius:10, padding:'10px 20px', fontSize:13, fontWeight:600, cursor:'pointer', color:'#0176D3', opacity: creating ? 0.7 : 1 }}>
                Save Draft
              </button>
              <button onClick={() => saveAssessment('publish')} disabled={creating}
                style={{ background:'linear-gradient(135deg,#0176D3,#0154A4)', border:'none', borderRadius:10, padding:'10px 20px', fontSize:13, fontWeight:700, cursor:'pointer', color:'#fff', opacity: creating ? 0.7 : 1, boxShadow:'0 4px 12px rgba(1,118,211,0.3)' }}>
                {creating ? '⏳ Saving…' : (assessment && (assessment._id || assessment.id) ? '✅ Update & Publish' : '🚀 Create & Publish')}
              </button>
            </div>
            </div>{/* end padding wrapper */}
          </div>
        </div>
      )}
    </div>
  );
}
