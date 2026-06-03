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
import { genericSearchMatch } from '../../api/matching.js';
import AssessmentBuilder from '../../components/assessments/AssessmentBuilder.jsx';
import JobDetailDrawer from '../../components/shared/JobDetailDrawer.jsx';
import ShareJobModal from '../../components/shared/ShareJobModal.jsx';

function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
}

function JobActionsMenu({ actions, isMobile }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  if (!isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }} onClick={e => e.stopPropagation()}>
        {actions.map(a => a.hidden ? null : (
          <button key={a.label} onClick={e => { e.stopPropagation(); a.onClick(e); }}
            style={a.danger ? { ...btnD, padding: '6px 14px', fontSize: 12 } : a.primary ? { ...btnP, padding: '6px 14px', fontSize: 12 } : a.submit ? { background: 'rgba(46,132,74,0.15)', border: '1px solid rgba(46,132,74,0.4)', borderRadius: 8, color: '#2E844A', padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 } : { ...btnG, padding: '6px 14px', fontSize: 12 }}>
            {a.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: open ? '#F8FAFC' : '#fff', color: '#374151', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, minHeight: 36 }}>
        ⋮ Actions
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 8px 32px rgba(0,0,0,0.16)', zIndex: 9999, minWidth: 180, overflow: 'hidden' }}>
          {actions.map(a => a.hidden ? null : (
            <button key={a.label} onClick={e => { e.stopPropagation(); setOpen(false); a.onClick(e); }}
              style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'none', border: 'none', borderBottom: '1px solid #F1F5F9', textAlign: 'left', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: a.danger ? '#BA0517' : '#374151' }}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Applicants Panel ──────────────────────────────────────────────────────────
function ApplicantsPanel({ job, onClose }) {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editCandidate, setEditCandidate] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const jobId = String(job.id || job._id || '');
    api.getApplications({ jobId, limit: 10000000 })
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

// ── Closed Job Analytics Card ─────────────────────────────────────────────────
function ClosedJobCard({ j, onReopen, onDelete, onViewApplicants, onViewDetails, onEdit, isMobile }) {
  const closedOn = j.closedAt ? new Date(j.closedAt) : (j.updatedAt ? new Date(j.updatedAt) : null);
  const postedOn = j.createdAt ? new Date(j.createdAt) : null;
  const daysToClose = (closedOn && postedOn)
    ? Math.round((closedOn - postedOn) / (1000 * 60 * 60 * 24))
    : null;
  const conversion = j.applicantsCount > 0
    ? Math.round((j.selectedCount / j.applicantsCount) * 100)
    : 0;

  return (
    <div style={{ ...card, borderLeft: '4px solid #9CA3AF', background: '#FAFAFA', position: 'relative' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ color: '#181818', fontWeight: 700 }}>{j.title}</span>
            <Badge label="Closed" color="#BA0517" />
            {j.urgency && <Badge label={j.urgency} color={j.urgency === 'High' ? '#BA0517' : j.urgency === 'Medium' ? '#A07E00' : '#2E844A'} />}
          </div>
          <div style={{ color: '#0176D3', fontSize: 12, marginBottom: 8 }}>{j.company} · {j.location} · {j.experience}</div>
          {/* Skills */}
          {j.skills && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
              {(Array.isArray(j.skills) ? j.skills : (j.skills||'').split(',').map(s=>s.trim()).filter(Boolean)).map(s => <Badge key={s} label={s} color="#706E6B" />)}
            </div>
          )}
          {/* Analytics strip */}
          <div style={{ display: 'flex', gap: isMobile ? 10 : 20, flexWrap: 'wrap', padding: '10px 14px', background: '#fff', borderRadius: 10, border: '1px solid #E5E7EB' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#374151' }}>{j.applicantsCount || 0}</div>
              <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>APPLICANTS</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#2E844A' }}>{j.selectedCount || 0}</div>
              <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>HIRED</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: conversion >= 20 ? '#2E844A' : '#A07E00' }}>{conversion}%</div>
              <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>CONVERSION</div>
            </div>
            {daysToClose !== null && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: daysToClose <= 30 ? '#2E844A' : '#A07E00' }}>{daysToClose}</div>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>DAYS TO CLOSE</div>
              </div>
            )}
            {postedOn && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{postedOn.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>POSTED ON</div>
              </div>
            )}
            {closedOn && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#BA0517' }}>{closedOn.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>CLOSED ON</div>
              </div>
            )}
          </div>
        </div>
        <JobActionsMenu isMobile={isMobile} actions={[
          { label: 'View Details', primary: true, onClick: () => onViewDetails(j) },
          { label: `👥 ${j.applicantsCount > 0 ? `${j.applicantsCount} Applicants` : 'Applicants'}`, onClick: () => onViewApplicants(j) },
          { label: '✏️ Edit', onClick: () => onEdit(j) },
          { label: '🔄 Reopen', onClick: () => onReopen(j.id, j.status) },
          { label: 'Delete', danger: true, onClick: () => onDelete(j.id) },
        ]} />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RecruiterJobs({ user }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [jobs, setJobs] = useState([]); const [loading, setLoad] = useState(true); const [showModal, setShow] = useState(false);
  const [saving, setSaving] = useState(false); const [toast, setToast] = useState("");
  const [applicantsJob, setApplicantsJob] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [shareJob, setShareJob] = useState(null);
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentSettings, setAssessmentSettings] = useState({ title: '', instructions: '', timeLimitMins: 0, passingScore: 0, isActive: true, autoAdvance: false });
  const [assessmentQuestions, setAssessmentQuestions] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [urgencyFilter, setUrgencyFilter] = useState('All');
  const [editingJob, setEditingJob] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [tabCounts, setTabCounts] = useState({ active: 0, closed: 0, draft: 0, all: 0 });
  const postJobRef = useRef(null);
  const searchDebounceRef = useRef(null);

  const normalizeJob = j => ({ ...j, id: j.id || j._id?.toString() || String(j._id || '') });

  const PAGE_SIZE_JOBS = 20;
  const [pgMeta, setPgMeta] = useState({ page: 1, pages: 1, total: 0 });

  const tabStatusMap = { active: 'active', closed: 'closed', draft: 'draft', all: null };

  const load = (pg = 1, srch = search, tab = activeTab) => {
    setLoad(true);
    const params = { recruiterId: user.id, limit: PAGE_SIZE_JOBS, page: pg };
    if (srch) params.search = srch;
    const statusVal = tabStatusMap[tab];
    if (statusVal) params.status = statusVal;
    api.getJobs(params)
      .then(r => {
        const raw = Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : []);
        const pg2 = r?.pagination || {};
        const map = new Map();
        raw.forEach(item => { const job = normalizeJob(item); if (job.id) map.set(job.id, job); });
        setJobs(Array.from(map.values()));
        setPgMeta({ page: pg2.page || pg, pages: pg2.pages || 1, total: pg2.total || raw.length });
      })
      .catch(() => setJobs([]))
      .finally(() => setLoad(false));
  };

  // Fetch tab counts once on mount
  const loadTabCounts = () => {
    const base = { recruiterId: user.id, limit: 1, page: 1 };
    Promise.allSettled([
      api.getJobs({ ...base, status: 'active' }),
      api.getJobs({ ...base, status: 'closed' }),
      api.getJobs({ ...base, status: 'draft' }),
      api.getJobs({ ...base }),
    ]).then(([a, c, d, all]) => {
      const cnt = r => (r.status === 'fulfilled' ? (r.value?.pagination?.total || 0) : 0);
      setTabCounts({ active: cnt(a), closed: cnt(c), draft: cnt(d), all: cnt(all) });
    });
  };

  useEffect(() => { load(1); loadTabCounts(); }, [user.id]); // eslint-disable-line

  useEffect(() => {
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => load(1, search, activeTab), 400);
    return () => clearTimeout(searchDebounceRef.current);
  }, [search, activeTab]); // eslint-disable-line

  const filteredJobs = urgencyFilter !== 'All' ? jobs.filter(j => j.urgency === urgencyFilter) : jobs;
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
        } catch (ae) { setToast(`✅ Job posted! (Assessment error: ${ae.message})`); setSaving(false); resetModal(); load(1); loadTabCounts(); return; }
      }
      setToast("✅ Job posted!" + (assessmentQuestions.length > 0 ? " Assessment attached." : ""));
      resetModal(); load(1); loadTabCounts();
    } catch (e) { setToast(`❌ ${e.message}`); }
    setSaving(false);
  };
  const del = async (id) => {
    if (!window.confirm("Delete this job posting? This will also remove all applicant data for this job.")) return;
    try { await api.deleteJob(id); load(1); loadTabCounts(); setToast("✅ Job deleted"); }
    catch (e) { setToast(`❌ ${e.message}`); }
  };
  const toggle = async (id, status) => {
    const isClosed = status === 'closed' || status === 'Closed';
    try {
      await api.patchJob(id, { status: isClosed ? 'active' : 'closed' });
      load(1); loadTabCounts();
      setToast(`✅ Job ${isClosed ? 'reopened' : 'closed'}`);
    } catch (e) { setToast(`❌ ${e.message}`); }
  };

  // ── Closed jobs aggregate stats (from current page) ──────────────────────
  const closedStats = activeTab === 'closed' ? (() => {
    const totalHired = filteredJobs.reduce((s, j) => s + (j.selectedCount || 0), 0);
    const totalApps = filteredJobs.reduce((s, j) => s + (j.applicantsCount || 0), 0);
    const days = filteredJobs
      .filter(j => j.closedAt && j.createdAt)
      .map(j => Math.round((new Date(j.closedAt) - new Date(j.createdAt)) / (1000 * 60 * 60 * 24)));
    const avgDays = days.length > 0 ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null;
    return { totalHired, totalApps, avgDays };
  })() : null;

  // ── Tab bar ───────────────────────────────────────────────────────────────
  const tabs = [
    { key: 'active', label: 'Active', count: tabCounts.active, color: '#2E844A' },
    { key: 'closed', label: 'Closed', count: tabCounts.closed, color: '#BA0517' },
    { key: 'draft',  label: 'Draft',  count: tabCounts.draft,  color: '#A07E00' },
    { key: 'all',    label: 'All',    count: tabCounts.all,    color: '#374151' },
  ];

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
        subtitle={`${tabCounts.active} active · ${tabCounts.closed} closed · ${tabCounts.draft} draft`}
        action={<button onClick={() => setShow(true)} style={btnP}>+ Post Job</button>}
      />

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setActiveTab(t.key); setPgMeta({ page: 1, pages: 1, total: 0 }); }}
            style={{
              padding: '8px 18px', borderRadius: 24, border: activeTab === t.key ? `2px solid ${t.color}` : '1.5px solid #E2E8F0',
              background: activeTab === t.key ? `${t.color}12` : '#fff',
              color: activeTab === t.key ? t.color : '#6B7280',
              fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s'
            }}>
            {t.label}
            {t.count > 0 && (
              <span style={{ background: activeTab === t.key ? t.color : '#E5E7EB', color: activeTab === t.key ? '#fff' : '#374151', borderRadius: 12, fontSize: 11, fontWeight: 800, padding: '1px 7px', minWidth: 20, textAlign: 'center' }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Closed jobs stats strip ── */}
      {activeTab === 'closed' && !loading && filteredJobs.length > 0 && closedStats && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            { label: 'Total Closed', value: pgMeta.total, icon: '🔒', color: '#BA0517' },
            { label: 'Total Hired', value: closedStats.totalHired, icon: '🎉', color: '#2E844A' },
            { label: 'Total Applicants', value: closedStats.totalApps, icon: '👥', color: '#0176D3' },
            closedStats.avgDays !== null ? { label: 'Avg Days to Close', value: closedStats.avgDays, icon: '⏱', color: '#A07E00' } : null,
          ].filter(Boolean).map(s => (
            <div key={s.label} style={{ flex: '1 1 120px', background: '#fff', border: `1px solid ${s.color}25`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Search + urgency filter ── */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', marginBottom:16, padding:'12px 16px', background:'#fff', borderRadius:12, border:'1px solid #F3F2F2', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
        <input placeholder={`Search ${activeTab === 'all' ? '' : activeTab + ' '}jobs…`} value={search} onChange={e=>setSearch(e.target.value)}
          style={{ flex:'1 1 180px', minWidth:150, padding:'8px 12px', borderRadius:8, border:'1px solid rgba(1,118,211,0.2)', background:'#F3F2F2', color:'#181818', fontSize:13, outline:'none' }} />
        {activeTab !== 'closed' && (
          <select value={urgencyFilter} onChange={e=>setUrgencyFilter(e.target.value)} style={{ ...fSel, color:urgencyFilter!=='All'?'#0176D3':'#706E6B' }}>
            <option value="All">All Urgency</option>
            <option value="High">🔴 High</option>
            <option value="Medium">🟡 Medium</option>
            <option value="Low">🟢 Low</option>
          </select>
        )}
        {(search || urgencyFilter !== 'All') && (
          <button onClick={()=>{setSearch('');setUrgencyFilter('All');}}
            style={{ background:'none', border:'none', color:'#BA0517', fontSize:12, cursor:'pointer', fontWeight:600 }}>✕ Clear</button>
        )}
      </div>

      {loading ? <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#706E6B', padding: '40px 0', justifyContent: 'center' }}><Spinner /> Loading jobs...</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {jobs.length === 0 && (
            <div style={{ ...card, textAlign: 'center', padding: '40px 24px', color: '#9CA3AF' }}>
              {activeTab === 'closed'
                ? <><div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div><div style={{ fontWeight: 700, color: '#374151', marginBottom: 4 }}>No closed jobs</div><div style={{ fontSize: 13 }}>When you close a job posting it will appear here with full analytics.</div></>
                : activeTab === 'draft'
                ? <><div style={{ fontSize: 40, marginBottom: 12 }}>📝</div><div style={{ fontWeight: 700, color: '#374151', marginBottom: 4 }}>No draft jobs</div><div style={{ fontSize: 13 }}>Draft jobs you haven't submitted for approval will show here.</div></>
                : <p>No jobs {search ? 'match your search' : 'posted yet'}.</p>
              }
            </div>
          )}
          {filteredJobs.length === 0 && jobs.length > 0 && <p style={{ color:'#9E9D9B', textAlign:'center', padding:'32px 0' }}>No jobs match your filters.</p>}

          {/* ── Closed tab: analytics cards ── */}
          {activeTab === 'closed' && filteredJobs.map(j => (
            <ClosedJobCard
              key={j.id}
              j={j}
              isMobile={isMobile}
              onReopen={(id, status) => toggle(id, status)}
              onDelete={(id) => del(id)}
              onViewApplicants={(job) => setApplicantsJob(job)}
              onViewDetails={(job) => setSelectedJob(job)}
              onEdit={(job) => setEditingJob({ ...job })}
            />
          ))}

          {/* ── All other tabs: standard cards ── */}
          {activeTab !== 'closed' && filteredJobs.map(j => (
            <div key={j.id} style={card}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
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
                <JobActionsMenu isMobile={isMobile} actions={[
                  { label: 'View Details', primary: true, onClick: () => setSelectedJob(j) },
                  { label: '📣 Share', onClick: () => setShareJob(j), hidden: j.status !== 'active' },
                  { label: `👥 ${j.applicantsCount > 0 ? `${j.applicantsCount} Applicant${j.applicantsCount !== 1 ? 's' : ''}` : 'Applicants'}`, onClick: () => setApplicantsJob(j) },
                  { label: '✏️ Edit', onClick: e => { e.stopPropagation(); setSelectedJob(null); setEditingJob({ ...j }); } },
                  { label: '🚀 Submit for Approval', submit: true, hidden: j.status !== 'draft', onClick: async () => {
                    try {
                      await api.patchJob(j.id, { approvalStatus: 'pending_approval' });
                      setToast('✅ Submitted for admin approval');
                      load(1); loadTabCounts();
                    } catch (e) { setToast(`❌ ${e.message}`); }
                  }},
                  { label: (j.status === 'closed' || j.status === 'Closed') ? '🔄 Reopen' : '🔒 Close', onClick: () => toggle(j.id, j.status) },
                  { label: 'Delete', danger: true, onClick: () => del(j.id) },
                ]} />
              </div>
            </div>
          ))}

          {/* ── Pagination ── */}
          {pgMeta.total > PAGE_SIZE_JOBS && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderTop: '1px solid #F1F5F9', marginTop: 8 }}>
              <span style={{ fontSize: 13, color: '#6B7280' }}>
                {pgMeta.total} total · page {pgMeta.page} of {pgMeta.pages}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button disabled={pgMeta.page <= 1} onClick={() => load(pgMeta.page - 1)}
                  style={{ padding: '7px 18px', borderRadius: 8, border: '1px solid #E2E8F0', background: pgMeta.page <= 1 ? '#F9FAFB' : '#fff', color: pgMeta.page <= 1 ? '#9CA3AF' : '#374151', cursor: pgMeta.page <= 1 ? 'default' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                  ← Prev
                </button>
                <button disabled={pgMeta.page >= pgMeta.pages} onClick={() => load(pgMeta.page + 1)}
                  style={{ padding: '7px 18px', borderRadius: 8, border: '1px solid #E2E8F0', background: pgMeta.page >= pgMeta.pages ? '#F9FAFB' : '#fff', color: pgMeta.page >= pgMeta.pages ? '#9CA3AF' : '#374151', cursor: pgMeta.page >= pgMeta.pages ? 'default' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Next →
                </button>
              </div>
            </div>
          )}
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
                const eu = (form.externalUrl || '').trim();
                const payload = { ...form, externalUrl: eu, numberOfOpenings: form.openings ? Number(form.openings) : undefined };
                delete payload.openings;
                await api.patchJob(editingJob.id, payload);
                setToast('✅ Job updated!');
                setEditingJob(null);
                load(1); loadTabCounts();
              } catch (e) { setToast(`❌ ${e.message}`); }
              setEditSaving(false);
            }}
            onCancel={() => setEditingJob(null)}
            initialData={{
              title:               editingJob.title || '',
              company:             editingJob.company || editingJob.companyName || '',
              department:          editingJob.department || '',
              location:            editingJob.location || '',
              jobType:             editingJob.jobType || 'Full-Time',
              workMode:            editingJob.workMode || 'Onsite',
              experience:          editingJob.experience || '',
              openings:            String(editingJob.numberOfOpenings || editingJob.openings || ''),
              applicationDeadline: editingJob.applicationDeadline || '',
              urgency:             editingJob.urgency || 'Medium',
              skills:              Array.isArray(editingJob.skills) ? editingJob.skills.join(', ') : (editingJob.skills || ''),
              description:         editingJob.description || '',
              requirements:        editingJob.requirements || '',
              benefits:            editingJob.benefits || '',
              education:           editingJob.education || '',
              externalUrl:         editingJob.externalUrl || '',
              salaryMin:           editingJob.salaryMin || '',
              salaryMax:           editingJob.salaryMax || '',
              salaryCurrency:      editingJob.salaryCurrency || 'INR',
              isPublic:            editingJob.isPublic !== false,
              screeningQuestions:  Array.isArray(editingJob.screeningQuestions) ? editingJob.screeningQuestions : [],
            }}
          />
        </Modal>
      )}
    </div>
  );
}
