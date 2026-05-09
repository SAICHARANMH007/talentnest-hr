import React, { useState, useEffect } from 'react';
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

const BLANK_OPTION = () => ({ id: `opt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, text: '', isCorrect: false });
const BLANK_QUESTION = () => ({
  id: `q_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
  text: '', type: 'text', marks: 10, difficulty: 'medium',
  options: [], placeholder: '', maxChars: 2000,
});
const BLANK_FORM = () => ({
  title: '', instructions: '', timeLimitMins: 30, passingScore: 60,
  autoAdvance: false, isActive: true, randomize: false,
  questions: [BLANK_QUESTION()],
});

const DIFFICULTY_COLOR = { easy: '#10B981', medium: '#F59E0B', hard: '#EF4444' };

// ── Searchable job picker ──────────────────────────────────────────────────────
function JobSearchPicker({ jobs, value, onChange, placeholder = 'Search jobs…' }) {
  const [q, setQ] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const selected = jobs.find(j => (j._id || j.id) === value);

  React.useEffect(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = q.trim()
    ? jobs.filter(j =>
        (j.title || '').toLowerCase().includes(q.toLowerCase()) ||
        (j.companyName || j.company || '').toLowerCase().includes(q.toLowerCase())
      ).slice(0, 10000000)
    : jobs.slice(0, 10000000);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${open ? '#0176D3' : '#e2e8f0'}`, fontSize: 13, cursor: 'pointer', background: '#f8fafc', boxSizing: 'border-box', width: '100%', userSelect: 'none' }}
      >
        <span style={{ flex: 1, color: selected ? '#181818' : '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? `${selected.title}${selected.companyName || selected.company ? ` @ ${selected.companyName || selected.company}` : ''}` : placeholder}
        </span>
        <span style={{ color: '#94A3B8', fontSize: 11 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999, background: '#fff', border: '1.5px solid #0176D3', borderRadius: 8, boxShadow: '0 8px 28px rgba(0,0,0,0.13)', marginTop: 4, overflow: 'hidden' }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Type to search jobs…"
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {value && (
              <div onClick={() => { onChange(''); setQ(''); setOpen(false); }}
                style={{ padding: '8px 12px', fontSize: 12, color: '#94A3B8', cursor: 'pointer', borderBottom: '1px solid #f8fafc' }}>
                ✕ Clear selection
              </div>
            )}
            {filtered.length === 0 && (
              <div style={{ padding: '16px 12px', color: '#94A3B8', fontSize: 12, textAlign: 'center' }}>No jobs found</div>
            )}
            {filtered.map(j => {
              const jid = j._id || j.id;
              const isSelected = jid === value;
              return (
                <div key={jid}
                  onClick={() => { onChange(jid); setQ(''); setOpen(false); }}
                  style={{ padding: '10px 12px', fontSize: 13, cursor: 'pointer', background: isSelected ? 'rgba(1,118,211,0.08)' : 'transparent', color: isSelected ? '#0176D3' : '#181818', fontWeight: isSelected ? 700 : 400, borderBottom: '1px solid #f8fafc' }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
                  <div>{j.title}</div>
                  {(j.companyName || j.company) && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{j.companyName || j.company}{j.location ? ` · ${j.location}` : ''}</div>}
                </div>
              );
            })}
            {jobs.length > 10000000 && !q && <div style={{ padding: '8px 12px', fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>Type to search {jobs.length} jobs</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecruiterAssessments({ user }) {
  const navigate = useNavigate();

  // ── All-assessments list (default view) ───────────────────────────────────
  const [allAssessments, setAllAssessments] = useState([]);
  const [listLoading,    setListLoading]    = useState(true);
  const [listSearch,     setListSearch]     = useState('');

  // ── Detail view (when clicking into a specific assessment) ─────────────────
  const [jobs, setJobs]             = useState([]);
  const [selJob, setSelJob]         = useState('');
  const [assessment, setAssessment] = useState(null);
  const [submissions, setSubs]      = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Shared ─────────────────────────────────────────────────────────────────
  const [toast, setToast]           = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(BLANK_FORM());
  const [creating, setCreating]     = useState(false);

  const isDetail = !!assessment; // true = showing detail, false = showing list

  // Load all assessments for the org/platform
  const loadAll = React.useCallback(() => {
    setListLoading(true);
    api.listAssessments()
      .then(r => setAllAssessments(Array.isArray(r?.data) ? r.data : []))
      .catch(() => setAllAssessments([]))
      .finally(() => setListLoading(false));
  }, []);

  // Load jobs for the create picker
  useEffect(() => {
    const isSA = user.role === 'super_admin';
    const opts = isSA
      ? { limit: 10000000, platform: true }
      : user.role === 'admin'
        ? { limit: 10000000 }
        : { recruiterId: user.id, limit: 10000000 };
    api.getJobs(opts)
      .then(j => setJobs(Array.isArray(j) ? j : (j?.data || [])))
      .catch(() => setJobs([]));
    loadAll();
  }, [user.id, user.role, loadAll]);

  // Open detail view for a specific assessment row
  const openDetail = async (row) => {
    setSelJob(String(row.jobId));
    setAssessment(null);
    setSubs([]);
    setDetailLoading(true);
    try {
      const a = await api.getAssessmentForJob(String(row.jobId));
      if (!a) { setDetailLoading(false); return; }
      setAssessment(a);
      const subs = await api.getAssessmentSubmissions(a._id || a.id);
      setSubs(Array.isArray(subs) ? subs : []);
    } catch (e) {
      if (!e.message?.includes('No assessment')) setToast('❌ ' + e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => { setAssessment(null); setSelJob(''); setSubs([]); loadAll(); };

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
        // Reload current detail
        const a = await api.getAssessmentForJob(f.jobId);
        if (a) setAssessment(a);
      } else {
        await api.createAssessment(payload);
        setToast('✅ Assessment created!');
        loadAll();
      }
      setShowCreate(false);
    } catch (e) { setToast('❌ ' + e.message); }
    setCreating(false);
  };

  const addQuestion    = () => setCreateForm(p => ({ ...p, questions: [...p.questions, BLANK_QUESTION()] }));
  const removeQuestion = (id) => setCreateForm(p => ({ ...p, questions: p.questions.filter(q => q.id !== id) }));
  const updateQuestion = (id, field, val) => setCreateForm(p => ({ ...p, questions: p.questions.map(q => q.id === id ? { ...q, [field]: val } : q) }));

  const passCount = submissions.filter(s => s.result === 'pass').length;
  const failCount = submissions.filter(s => s.result === 'fail').length;
  const pendCount = submissions.filter(s => s.result === 'pending' || !s.result).length;

  const filteredList = listSearch
    ? allAssessments.filter(a =>
        (a.title || '').toLowerCase().includes(listSearch.toLowerCase()) ||
        (a.jobTitle || '').toLowerCase().includes(listSearch.toLowerCase()) ||
        (a.jobCompany || '').toLowerCase().includes(listSearch.toLowerCase())
      )
    : allAssessments;

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />

      {/* ── Detail view ─────────────────────────────────────────────────────── */}
      {isDetail && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button onClick={closeDetail}
              style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
              ← Back to Assessments
            </button>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#0A1628' }}>{assessment.title}</div>
              <div style={{ fontSize: 12, color: '#706E6B', marginTop: 1 }}>{assessment.jobTitle || allAssessments.find(a => a.jobId === selJob)?.jobTitle || ''}</div>
            </div>
          </div>

          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <Badge label={assessment.isActive ? '✅ Active' : '⏸ Inactive'} color={assessment.isActive ? '#2E844A' : '#64748b'} />
                {assessment.timeLimitMins > 0 && <Badge label={`⏱ ${assessment.timeLimitMins}m`} color="#0176D3" />}
                {assessment.passingScore > 0 && <Badge label={`Pass: ${assessment.passingScore}%`} color="#8b5cf6" />}
                <Badge label={`${Array.isArray(assessment.questions) ? assessment.questions.length : 0} questions`} color="#706E6B" />
              </div>
              <button onClick={() => {
                const qs = Array.isArray(assessment.questions) ? assessment.questions.map(q => ({ ...q, id: q.id || Date.now() + Math.random() })) : [BLANK_QUESTION()];
                setCreateForm({ jobId: selJob, title: assessment.title, instructions: assessment.instructions || '', timeLimitMins: assessment.timeLimitMins || 30, passingScore: assessment.passingScore || 60, autoAdvance: assessment.autoAdvance || false, isActive: assessment.isActive !== false, questions: qs });
                setShowCreate(true);
              }} style={{ background: 'rgba(1,118,211,0.08)', border: '1px solid rgba(1,118,211,0.25)', borderRadius: 8, color: '#0176D3', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                ✏️ Edit Assessment
              </button>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              {[['Total', submissions.length, '#181818'], ['✅ Passed', passCount, '#34d399'], ['❌ Failed', failCount, '#FE5C4C'], ['⏳ Pending', pendCount, '#F59E0B']].map(([label, val, color]) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ color, fontWeight: 700, fontSize: 18 }}>{val}</div>
                  <div style={{ color: '#9E9D9B', fontSize: 11 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {detailLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spinner size={28} /></div>
          ) : submissions.length === 0 ? (
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

      {/* ── List view (default) ──────────────────────────────────────────────── */}
      {!isDetail && (
        <>
          <PageHeader title="📝 Assessments" subtitle={`${allAssessments.length} assessment${allAssessments.length !== 1 ? 's' : ''} across your organisation`}
            action={<button onClick={() => { setCreateForm(BLANK_FORM()); setShowCreate(true); }} style={{ background:'linear-gradient(135deg,#0176D3,#0154A4)',color:'#fff',border:'none',borderRadius:8,padding:'9px 18px',fontWeight:700,fontSize:13,cursor:'pointer' }}>+ Create Assessment</button>}
          />

          <div style={{ ...card, marginBottom: 16, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={listSearch} onChange={e => setListSearch(e.target.value)}
              placeholder="Search by title, job or company…"
              style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, outline: 'none' }} />
            <button onClick={loadAll} style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>↻ Refresh</button>
          </div>

          {listLoading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><Spinner size={32} /></div>
          ) : filteredList.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: '60px 40px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{listSearch ? 'No assessments match your search' : 'No assessments yet'}</div>
              <div style={{ fontSize: 12, color: '#706E6B', marginBottom: 20 }}>
                {listSearch ? 'Try a different search term.' : 'Create a screening assessment for any of your jobs.'}
              </div>
              {!listSearch && <button onClick={() => { setCreateForm(BLANK_FORM()); setShowCreate(true); }} style={{ background: 'linear-gradient(135deg,#0176D3,#0154A4)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Create First Assessment</button>}
            </div>
          ) : (
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      {['Job', 'Assessment Title', 'Status', 'Questions', 'Submissions', 'Created', ''].map(h => (
                        <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map(a => (
                      <tr key={a.id} style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FAFAFE'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                        onClick={() => openDetail(a)}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>{a.jobTitle || '—'}</div>
                          {a.jobCompany && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{a.jobCompany}{a.jobLocation ? ` · ${a.jobLocation}` : ''}</div>}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#0A1628' }}>{a.title}</div>
                          {a.timeLimitMins > 0 && <div style={{ fontSize: 11, color: '#0176D3', marginTop: 1 }}>⏱ {a.timeLimitMins}min</div>}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: a.isActive ? '#2E844A' : '#64748b', background: a.isActive ? 'rgba(46,132,74,0.1)' : '#F1F5F9', padding: '3px 10px', borderRadius: 20 }}>
                            {a.isActive ? '✅ Active' : '⏸ Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#374151', fontSize: 13 }}>{a.questionCount}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: a.submissionCount > 0 ? '#0176D3' : '#94A3B8' }}>{a.submissionCount}</span>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#94A3B8', fontSize: 12, whiteSpace: 'nowrap' }}>
                          {a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <button onClick={e => { e.stopPropagation(); openDetail(a); }}
                            style={{ background: 'rgba(1,118,211,0.08)', border: '1px solid rgba(1,118,211,0.25)', borderRadius: 8, color: '#0176D3', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            Open →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

            {/* Job selector — searchable */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#475569', display:'block', marginBottom:5 }}>Job *</label>
              <JobSearchPicker
                jobs={jobs}
                value={createForm.jobId || ''}
                onChange={jid => setCreateForm(p => ({ ...p, jobId: jid }))}
                placeholder="Search and select a job…"
              />
            </div>

            {/* Title & time */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap:12, marginBottom:14 }}>
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

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap:12, marginBottom:14 }}>
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
                    <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:8 }}>
                      <select value={q.type} onChange={e => {
                        const t = e.target.value;
                        updateQuestion(q.id, 'type', t);
                        // Auto-add 2 blank options for MCQ if none exist
                        if ((t === 'mcq_single' || t === 'mcq_multi') && (!q.options || q.options.length === 0)) {
                          setCreateForm(p => ({ ...p, questions: p.questions.map(pq => pq.id === q.id ? { ...pq, type: t, options: [BLANK_OPTION(), BLANK_OPTION()] } : pq) }));
                        }
                      }}
                        style={{ padding:'6px 10px', borderRadius:7, border:'1px solid #e2e8f0', fontSize:12, outline:'none', background:'#fff', cursor:'pointer' }}>
                        <option value="text">Text Answer</option>
                        <option value="mcq_single">MCQ (Single)</option>
                        <option value="mcq_multi">MCQ (Multi)</option>
                        <option value="code">Code</option>
                      </select>
                      {/* Difficulty */}
                      <select value={q.difficulty || 'medium'} onChange={e => updateQuestion(q.id, 'difficulty', e.target.value)}
                        style={{ padding:'6px 10px', borderRadius:7, border:`1px solid ${DIFFICULTY_COLOR[q.difficulty||'medium']}60`, fontSize:12, outline:'none', background:`${DIFFICULTY_COLOR[q.difficulty||'medium']}10`, color: DIFFICULTY_COLOR[q.difficulty||'medium'], fontWeight:700, cursor:'pointer' }}>
                        <option value="easy">🟢 Easy</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="hard">🔴 Hard</option>
                      </select>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <label style={{ fontSize:12, color:'#64748b', fontWeight:600 }}>Marks:</label>
                        <input type="number" value={q.marks} onChange={e => updateQuestion(q.id, 'marks', Number(e.target.value))}
                          min="1" style={{ width:60, padding:'6px 8px', borderRadius:7, border:'1px solid #e2e8f0', fontSize:12, outline:'none', textAlign:'center' }} />
                      </div>
                    </div>

                    {/* MCQ Options Editor */}
                    {(q.type === 'mcq_single' || q.type === 'mcq_multi') && (
                      <div style={{ borderTop:'1px solid #e2e8f0', paddingTop:8, marginTop:4 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:'#475569', marginBottom:6 }}>
                          Options — check ✓ to mark correct answer{q.type === 'mcq_multi' ? 's' : ''}:
                        </div>
                        {(q.options || []).map((opt, oi) => (
                          <div key={opt.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                            <input type={q.type === 'mcq_single' ? 'radio' : 'checkbox'}
                              checked={!!opt.isCorrect}
                              onChange={e => {
                                setCreateForm(p => ({
                                  ...p,
                                  questions: p.questions.map(pq => {
                                    if (pq.id !== q.id) return pq;
                                    const opts = pq.options.map((o, i) =>
                                      q.type === 'mcq_single'
                                        ? { ...o, isCorrect: i === oi }
                                        : i === oi ? { ...o, isCorrect: e.target.checked } : o
                                    );
                                    return { ...pq, options: opts };
                                  })
                                }));
                              }}
                              style={{ accentColor:'#10B981', width:15, height:15, flexShrink:0 }} />
                            <input value={opt.text}
                              onChange={e => setCreateForm(p => ({
                                ...p,
                                questions: p.questions.map(pq => pq.id !== q.id ? pq : {
                                  ...pq, options: pq.options.map((o, i) => i === oi ? { ...o, text: e.target.value } : o)
                                })
                              }))}
                              placeholder={`Option ${oi + 1}`}
                              style={{ flex:1, padding:'6px 10px', borderRadius:7, border:`1.5px solid ${opt.isCorrect ? '#10B981' : '#e2e8f0'}`, fontSize:13, outline:'none', background: opt.isCorrect ? '#f0fdf4' : '#fff' }} />
                            {(q.options || []).length > 2 && (
                              <button onClick={() => setCreateForm(p => ({
                                ...p,
                                questions: p.questions.map(pq => pq.id !== q.id ? pq : { ...pq, options: pq.options.filter((_, i) => i !== oi) })
                              }))} style={{ background:'none', border:'none', color:'#94A3B8', cursor:'pointer', fontSize:14, padding:'2px 4px' }}>✕</button>
                            )}
                          </div>
                        ))}
                        <button onClick={() => setCreateForm(p => ({
                          ...p,
                          questions: p.questions.map(pq => pq.id !== q.id ? pq : { ...pq, options: [...(pq.options||[]), BLANK_OPTION()] })
                        }))} style={{ fontSize:12, color:'#0176D3', background:'none', border:'1px dashed #0176D3', borderRadius:7, padding:'4px 12px', cursor:'pointer', marginTop:2 }}>
                          + Add Option
                        </button>
                      </div>
                    )}
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
