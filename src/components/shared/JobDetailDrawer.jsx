import React, { useState, useEffect } from 'react';
import Badge from '../ui/Badge.jsx';
import Spinner from '../ui/Spinner.jsx';
import Toast from '../ui/Toast.jsx';
import { btnP, btnG, btnD } from '../../constants/styles.js';
import { api } from '../../api/api.js';
import { SM, STAGES } from '../../constants/stages.js';

const SF = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:10001, display:'flex', justifyContent:'flex-end' },
  drawer: { width: 720, maxWidth:'95vw', height:'100%', background:'#FFFFFF', display:'flex', flexDirection:'column', boxShadow:'-4px 0 24px rgba(0,0,0,0.15)', overflowY:'auto', animation:'tn-slide-in-right 0.25s cubic-bezier(0.32,0.72,0,1) both' },
  header: { padding:'20px 24px', borderBottom:'1px solid #DDDBDA', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0, background:'#032D60' },
  section: { padding:'20px 24px', borderBottom:'1px solid #DDDBDA' },
  label: { color:'#0176D3', fontSize:11, fontWeight:700, letterSpacing:1, marginBottom:8, textTransform:'uppercase' },
  select: { background:'#FFFFFF', border:'1px solid #DDDBDA', borderRadius:4, color:'#181818', padding:'8px 12px', fontSize:13, width:'100%', outline:'none' },
};

const ROLE_CATEGORIES = ['IT', 'Cybersecurity', 'Non-IT', 'Finance', 'HR', 'Sales', 'Operations', 'Management'];

function matchRole(candidate, roles) {
  if (!roles.length) return true;
  const hay = `${candidate.title || ''} ${candidate.skills || ''} ${candidate.summary || ''}`.toLowerCase();
  const map = { IT: ['developer','engineer','devops','cloud','software','tech','it','fullstack','frontend','backend','data','ml','ai','mobile','qa','architect'],
    Cybersecurity: ['security','soc','pentest','grc','ciso','infosec','compliance','cyber'],
    Finance: ['finance','accounting','analyst','cfo','auditor','tax','banking','fintech'],
    HR: ['hr','recruiter','people','talent','payroll','onboarding','hrbp'],
    Sales: ['sales','business development','account','revenue','growth','marketing'],
    Operations: ['operations','supply chain','logistics','procurement','warehousing'],
    Management: ['manager','director','vp','head','lead','ceo','cto','coo'] };
  return roles.some(r => (map[r] || [r.toLowerCase()]).some(kw => hay.includes(kw)));
}

// Multi-select candidate picker with search + role filters + checkboxes
function MultiCandidatePicker({ availableCandidates, onAdd, adding }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [roleFilters, setRoleFilters] = useState([]);
  const ref = React.useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggleRole = (r) => setRoleFilters(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);

  const filtered = availableCandidates.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q || (c.name||'').toLowerCase().includes(q) || (c.email||'').toLowerCase().includes(q) || (c.title||'').toLowerCase().includes(q);
    return matchQ && matchRole(c, roleFilters);
  });

  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAll = () => setSelected(filtered.map(c => String(c.id || c._id)));
  const clearAll = () => setSelected([]);

  const handleAdd = async () => {
    await onAdd(selected);
    setSelected([]);
    setOpen(false);
    setSearch('');
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setOpen(!open)}
          style={{ ...btnG, flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, textAlign: 'left' }}
        >
          <span>
            {selected.length > 0
              ? `${selected.length} candidate${selected.length > 1 ? 's' : ''} selected`
              : '— Select candidates to add —'}
          </span>
          <span style={{ fontSize: 10, opacity: 0.7 }}>{open ? '▲' : '▼'}</span>
        </button>
        <button
          onClick={handleAdd}
          disabled={selected.length === 0 || adding}
          style={{ ...btnP, whiteSpace: 'nowrap', opacity: selected.length === 0 ? 0.5 : 1 }}
        >
          {adding ? 'Adding…' : `+ Add${selected.length > 0 ? ` (${selected.length})` : ''}`}
        </button>
      </div>

      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#FFFFFF', border: '1px solid #DDDBDA', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', maxHeight: 320, display: 'flex', flexDirection: 'column', marginTop: 4 }}>
          {/* Role category filter tags */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #F3F2F2', flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: '#706E6B', fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>FILTER BY ROLE CATEGORY</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {ROLE_CATEGORIES.map(r => {
                const active = roleFilters.includes(r);
                return (
                  <button key={r} onClick={() => toggleRole(r)}
                    style={{ padding: '3px 10px', borderRadius: 20, border: `1.5px solid ${active ? '#0176D3' : '#DDDBDA'}`, background: active ? '#0176D3' : '#fff', color: active ? '#fff' : '#706E6B', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    {r}
                  </button>
                );
              })}
              {roleFilters.length > 0 && (
                <button onClick={() => setRoleFilters([])} style={{ padding: '3px 8px', borderRadius: 20, border: '1px solid #DDDBDA', background: 'none', color: '#BA0517', fontSize: 11, cursor: 'pointer' }}>✕ Clear filters</button>
              )}
            </div>
          </div>
          {/* Search + controls */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #F3F2F2', flexShrink: 0 }}>
            <input
              autoFocus
              placeholder="Search by name, email, or role…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', border: '1px solid #DDDBDA', borderRadius: 6, fontSize: 12, color: '#181818', outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
              <button onClick={selectAll} style={{ background: 'none', border: 'none', color: '#0176D3', fontSize: 11, cursor: 'pointer', padding: 0, fontWeight: 600 }}>Select all ({filtered.length})</button>
              {selected.length > 0 && <button onClick={clearAll} style={{ background: 'none', border: 'none', color: '#706E6B', fontSize: 11, cursor: 'pointer', padding: 0 }}>Clear</button>}
              {selected.length > 0 && <span style={{ color: '#0176D3', fontSize: 11, marginLeft: 'auto', fontWeight: 600 }}>{selected.length} selected</span>}
            </div>
          </div>
          {/* Candidate list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '20px 12px', textAlign: 'center', color: '#706E6B', fontSize: 12 }}>No candidates found</div>
            ) : filtered.map(c => {
              const id = String(c.id || c._id);
              const isSel = selected.includes(id);
              return (
                <div
                  key={id}
                  onClick={() => toggle(id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', background: isSel ? 'rgba(1,118,211,0.06)' : '#FFFFFF', borderBottom: '1px solid #F3F2F2' }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#F3F2F2'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isSel ? 'rgba(1,118,211,0.06)' : '#FFFFFF'; }}
                >
                  <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSel ? '#0176D3' : '#DDDBDA'}`, background: isSel ? '#0176D3' : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isSel && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                  </div>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#0176D3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                    {(c.name || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#181818', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ color: '#706E6B', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.title ? `${c.title} · ` : ''}{c.email}
                    </div>
                  </div>
                  {c.skills && (
                    <span style={{ color: '#0176D3', fontSize: 10, background: 'rgba(1,118,211,0.08)', borderRadius: 4, padding: '1px 6px', whiteSpace: 'nowrap', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {Array.isArray(c.skills) ? c.skills[0] : (c.skills || '').split(',')[0]?.trim()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function JobDetailDrawer({ job: initialJob, user, onClose, onJobUpdated, onDelete }) {
  const normJob = (j) => j ? { ...j, id: j.id || j._id?.toString() } : j;
  const [job, setJob] = useState(normJob(initialJob));
  const [candidates, setCandidates] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [allCandidates, setAllCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [addingCandidate, setAddingCandidate] = useState(false);
  const [toast, setToast] = useState('');

  const isAdminOrSuper = ['admin','super_admin'].includes(user?.role);

  useEffect(() => {
    loadData();
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [initialJob?.id || initialJob?._id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cands, recs, allC] = await Promise.all([
        api.getJobCandidates(initialJob.id || initialJob._id).catch(() => []),
        isAdminOrSuper ? api.getUsers('recruiter').catch(() => []) : Promise.resolve([]),
        isAdminOrSuper ? api.getUsers('candidate').catch(() => []) : Promise.resolve([]),
      ]);
      setCandidates(Array.isArray(cands) ? cands : (Array.isArray(cands?.data) ? cands.data : []));
      setRecruiters(Array.isArray(recs) ? recs : (Array.isArray(recs?.data) ? recs.data : []));
      setAllCandidates(Array.isArray(allC) ? allC : (Array.isArray(allC?.data) ? allC.data : []));
    } catch {}
    setLoading(false);
  };

  const assignRecruiter = async (recruiterId) => {
    if (!recruiterId) return;
    setAssigning(true);
    try {
      const updated = await api.assignRecruiterToJob(job.id, recruiterId);
      setJob(normJob(updated));
      setToast('✅ Recruiter assigned successfully');
      onJobUpdated && onJobUpdated(updated);
    } catch (e) { setToast(`❌ ${e.message}`); }
    setAssigning(false);
  };

  const addCandidatesToPipeline = async (candidateIds) => {
    if (!candidateIds?.length) return;
    setAddingCandidate(true);
    let added = 0, skipped = 0;
    for (const candidateId of candidateIds) {
      try { await api.applyToJob(job.id, candidateId); added++; } catch { skipped++; }
    }
    setToast(`✅ ${added} candidate${added !== 1 ? 's' : ''} added to pipeline${skipped > 0 ? ` (${skipped} already in pipeline)` : ''}`);
    await loadData();
    setAddingCandidate(false);
  };

  const pipelineInJob = new Set(candidates.map(c => String(c.candidateId || c.candidate?._id)));
  // Safety filter: only role=candidate, exclude anyone already in this job's pipeline
  const availableCandidates = allCandidates.filter(c =>
    (!c.role || c.role === 'candidate') && !pipelineInJob.has(String(c.id || c._id))
  );

  const stageSummary = STAGES.map(s => ({
    ...s, count: candidates.filter(c => c.stage === s.id).length,
  })).filter(s => s.count > 0);

  return (
    <div style={SF.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={SF.drawer}>
        <Toast msg={toast} onClose={() => setToast('')} />

        {/* Header */}
        <div style={SF.header}>
          <div>
            <div style={{ color:'#FFFFFF', fontWeight:800, fontSize:18 }}>{job.title}</div>
            <div style={{ color:'rgba(255,255,255,0.7)', fontSize:13, marginTop:2 }}>{job.company} · {job.location}</div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <Badge label={job.status || 'Open'} color={job.status==='Open'?'#2E844A':'#BA0517'} />
            <Badge label={job.urgency || 'Medium'} color={job.urgency==='High'?'#BA0517':job.urgency==='Medium'?'#A07E00':'#2E844A'} />
            {onDelete && (
              <button
                onClick={() => { if (confirm(`Delete "${job.title}"? This will remove the job and all its applications.`)) { onDelete(job.id); onClose(); } }}
                style={{ ...btnD, fontSize: 12, padding: '6px 12px' }}
              >
                🗑 Delete
              </button>
            )}
            <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', borderRadius:4, padding:'6px 12px', cursor:'pointer', fontSize:13 }}>✕ Close</button>
          </div>
        </div>

        {/* Recruiter Assignment (admin/super_admin only) */}
        {isAdminOrSuper && (
          <div style={SF.section}>
            <div style={SF.label}>Assigned Recruiter</div>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <select style={SF.select} value={job.recruiterId || ''} onChange={e => assignRecruiter(e.target.value)} disabled={assigning}>
                <option value="">-- Select Recruiter --</option>
                {recruiters.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.email})</option>
                ))}
              </select>
              {assigning && <Spinner />}
              {job.recruiterName && (
                <span style={{ color:'#706E6B', fontSize:12, whiteSpace:'nowrap' }}>
                  Currently: <strong style={{ color:'#181818' }}>{job.recruiterName}</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ padding:40, textAlign:'center' }}><Spinner /></div>
        ) : (
          <>
            {/* Stage summary */}
            {stageSummary.length > 0 && (
              <div style={SF.section}>
                <div style={SF.label}>Pipeline — {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}</div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {stageSummary.map(s => (
                    <div key={s.id} style={{ background:`${s.color}15`, border:`1px solid ${s.color}40`, borderRadius:20, padding:'4px 12px', display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontSize:12 }}>{s.icon}</span>
                      <span style={{ color:s.color, fontSize:12, fontWeight:600 }}>{s.label}</span>
                      <span style={{ background:s.color, color:'#fff', borderRadius:10, padding:'0 6px', fontSize:11, fontWeight:700 }}>{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Multi-select Add Candidates (admin/super_admin only) */}
            {isAdminOrSuper && (
              <div style={SF.section}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div style={SF.label}>Add Candidates to Pipeline</div>
                  <span style={{ color:'#706E6B', fontSize:11 }}>
                    {availableCandidates.length} available · {candidates.length} already in pipeline
                  </span>
                </div>
                {availableCandidates.length === 0 ? (
                  <div style={{ color:'#706E6B', fontSize:13, padding:'8px 0' }}>All candidates are already in this pipeline.</div>
                ) : (
                  <MultiCandidatePicker
                    availableCandidates={availableCandidates}
                    onAdd={addCandidatesToPipeline}
                    adding={addingCandidate}
                  />
                )}
              </div>
            )}

            {/* Pipeline List */}
            <div style={SF.section}>
              <div style={SF.label}>Candidates in Pipeline</div>
              {candidates.length === 0 ? (
                <div style={{ textAlign:'center', padding:'24px 0', color:'#706E6B', fontSize:13 }}>No candidates in pipeline yet.</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {candidates.map(app => {
                    const c = (typeof app.candidateId === 'object' ? app.candidateId : null) || app.candidate || {};
                    const stage = SM[app.stage] || { color:'#0176D3', label: app.stage, icon:'•' };
                    return (
                      <div key={app.id || app._id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'#F3F2F2', borderRadius:6, border:'1px solid #DDDBDA' }}>
                        <div style={{ width:36, height:36, borderRadius:'50%', background:'#0176D3', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:14, flexShrink:0 }}>
                          {(c.name || '?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ color:'#181818', fontWeight:600, fontSize:13 }}>{c.name || 'Unknown'}</div>
                          <div style={{ color:'#706E6B', fontSize:11, marginTop:1 }}>{c.title || ''}{c.location ? ` · ${c.location}` : ''}</div>
                        </div>
                        <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
                          {isAdminOrSuper ? (
                            <select
                              value={app.stage}
                              onChange={async (e) => {
                                const newStage = e.target.value;
                                const appId = app.id || app._id;
                                try {
                                  await api.updateStage(appId, newStage);
                                  setCandidates(prev => prev.map(a => (a.id || a._id) === appId ? { ...a, stage: newStage } : a));
                                  setToast(`✅ Stage → ${newStage}`);
                                } catch (err) { setToast(`❌ ${err.message}`); }
                              }}
                              style={{ padding:'4px 8px', borderRadius:8, border:`1.5px solid ${stage.color}60`, background:`${stage.color}10`, color:stage.color, fontSize:11, fontWeight:700, cursor:'pointer', outline:'none' }}
                            >
                              {STAGES.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                            </select>
                          ) : (
                            <span style={{ background:`${stage.color}15`, color:stage.color, border:`1px solid ${stage.color}40`, borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:600 }}>
                              {stage.icon} {stage.label}
                            </span>
                          )}
                          {app.interviewDate && (
                            <span style={{ color:'#A07E00', fontSize:11, background:'#FFF3CD', borderRadius:4, padding:'2px 8px', border:'1px solid #F59E0B' }}>
                              📅 {app.interviewDate}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Job Details */}
            <div style={SF.section}>
              <div style={SF.label}>Job Description</div>
              {[
                ['Experience', job.experience],
                ['Job Type', job.jobType || job.type],
                ['Salary', job.salary],
                ['Deadline', job.applicationDeadline],
              ].filter(([,v]) => v).map(([label, value]) => (
                <div key={label} style={{ marginBottom:8 }}>
                  <span style={{ color:'#706E6B', fontSize:12, fontWeight:600 }}>{label}: </span>
                  <span style={{ color:'#181818', fontSize:13 }}>{value}</span>
                </div>
              ))}
              {/* Skills — normalize array or comma-string to badge list */}
              {job.skills && (() => {
                const skillArr = Array.isArray(job.skills)
                  ? job.skills
                  : (job.skills || '').split(',').map(s => s.trim()).filter(Boolean);
                return skillArr.length > 0 ? (
                  <div style={{ marginBottom:8 }}>
                    <div style={{ color:'#706E6B', fontSize:12, fontWeight:600, marginBottom:5 }}>Skills Required</div>
                    <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                      {skillArr.map(s => (
                        <span key={s} style={{ background:'#eff6ff', color:'#1d4ed8', border:'1px solid #bfdbfe', borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:600 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
              {job.description && (
                <div style={{ marginTop:12, color:'#3E3E3C', fontSize:13, lineHeight:1.7, whiteSpace:'pre-wrap' }}>{job.description}</div>
              )}
              {job.requirements && (
                <div style={{ marginTop:12 }}>
                  <div style={{ color:'#706E6B', fontSize:12, fontWeight:600, marginBottom:4 }}>Requirements</div>
                  <div style={{ color:'#3E3E3C', fontSize:13, lineHeight:1.7, whiteSpace:'pre-wrap' }}>{job.requirements}</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
