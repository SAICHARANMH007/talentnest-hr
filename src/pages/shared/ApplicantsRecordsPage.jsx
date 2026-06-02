import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, downloadBlob } from '../../api/api.js';
import { SOURCE_OPTIONS as SHARED_SOURCE_OPTIONS, sourceLabel } from '../../constants/sources.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Field from '../../components/ui/Field.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Modal from '../../components/ui/Modal.jsx';
import UserDetailDrawer from '../../components/shared/UserDetailDrawer.jsx';
import JobRecruiterHistory from '../../components/shared/JobRecruiterHistory.jsx';
import { card, btnP, btnG } from '../../constants/styles.js';
import CapLimitBanner from '../../components/ui/CapLimitBanner.jsx';

const DB_STAGES = [
  'Applied',
  'Screening',
  'Shortlisted',
  'Interview Round 1',
  'Interview Round 2',
  'Offer',
  'Hired',
  'Rejected',
];

const SOURCE_OPTIONS = SHARED_SOURCE_OPTIONS;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'parked', label: 'Parked' },
];

const DB_STAGE_TO_FRONTEND = {
  Applied: 'applied',
  Screening: 'screening',
  Shortlisted: 'shortlisted',
  'Interview Round 1': 'interview_scheduled',
  'Interview Round 2': 'interview_completed',
  Offer: 'offer_extended',
  Hired: 'selected',
  Rejected: 'rejected',
};

const stageColor = (stage) => ({
  Applied: '#0176D3',
  Screening: '#7c3aed',
  Shortlisted: '#06b6d4',
  'Interview Round 1': '#F59E0B',
  'Interview Round 2': '#A855F7',
  Offer: '#10b981',
  Hired: '#2E844A',
  Rejected: '#BA0517',
}[stage] || '#64748B');

function fmtDate(v) {
  return v ? new Date(v).toLocaleDateString('en-IN') : '-';
}

const PAGE_SIZE = 100;

function buildQuery(filters, limit = 10000000) {
  const q = new URLSearchParams();
  q.set('limit', String(limit));
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') q.set(k, v);
  });
  return q.toString();
}

function toArray(res) {
  return Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
}

function normalizeId(v) {
  return (v?.id || v?._id || v || '').toString();
}

function rowKey(row, fallback = '') {
  return row.applicationId || `${row.candidateId || row.userId || row.email}-${fallback}`;
}

function rowToCandidate(row) {
  const id = row.candidateId || row.userId;
  return {
    id,
    _id: id,
    role: 'candidate',
    name: row.candidateName,
    email: row.email,
    phone: row.phone,
    title: row.title,
    currentCompany: row.currentCompany,
    location: row.location,
    preferredLocation: row.preferredLocation,
    skills: row.skills,
    experience: row.experience,
    currentCTC: row.currentCTC,
    expectedCTC: row.expectedCTC,
    candidateStatus: row.candidateStatus,
    client: row.client,
    ta: row.ta,
    clientSpoc: row.clientSpoc,
    resumeUrl: row.resumeUrl,
    linkedinUrl: row.linkedinUrl,
  };
}

function rowToApp(row) {
  const stageId = DB_STAGE_TO_FRONTEND[row.stage] || row.stage || 'applied';
  return row.applicationId ? {
    id: row.applicationId,
    _id: row.applicationId,
    stage: stageId,
    currentStage: row.stage || 'Applied',
    recruiterNotes: row.recruiterNotes || '',
    job: { id: row.jobId, title: row.jobTitle, companyName: row.jobCompany },
  } : null;
}

function DetailDrawer({ record, onClose }) {
  const fields = [
    ['Applicant', record.candidateName],
    ['Email', record.email],
    ['Mobile', record.phone],
    ['Organisation', record.organisation],
    ['Job', record.jobTitle],
    ['Hiring Company', record.jobCompany],
    ['Assigned Recruiters', record.assignedRecruiters],
    ['Stage', record.stage],
    ['Status', record.status],
    ['Source', record.source],
    ['Talent Match Score', record.aiMatchScore],
    ['Skills', record.skills],
    ['Experience', record.experience],
    ['Current Company', record.currentCompany],
    ['Location', record.location],
    ['Preferred Location', record.preferredLocation],
    ['Current CTC', record.currentCTC],
    ['Expected CTC', record.expectedCTC],
    ['Notice Period', record.noticePeriodDays],
    ['Applied At', fmtDate(record.appliedAt)],
    ['Latest Interview', fmtDate(record.latestInterviewAt)],
    ['Latest Interviewer', record.latestInterviewer],
    ['Screening Answers', record.screeningAnswers],
    ['Recruiter Notes', record.recruiterNotes],
    ['Cover Letter', record.coverLetter],
    ['Additional Details', record.additionalDetails],
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(5,13,26,0.45)', backdropFilter: 'blur(6px)' }} />
      <div className="tn-drawer" style={{ position: 'relative', width: 'min(720px, 100vw)', height: '100dvh', background: '#fff', boxShadow: '-20px 0 60px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 24, borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#0176D3', fontSize: 11, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase' }}>Applicant Record</div>
            <h2 style={{ margin: '4px 0 0', fontSize: 22, color: '#0A1628' }}>{record.candidateName || record.email?.split('@')[0] || record.phone || `Applicant-${(record.applicationId||record.candidateId||'').slice(-4)}`}</h2>
          </div>
          <button onClick={onClose} style={{ width: 40, height: 40, border: 'none', borderRadius: 10, background: '#F8FAFC', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
        <div style={{ padding: 24, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {fields.filter(([, value]) => value !== undefined && value !== null && value !== '').map(([label, value]) => (
              <div key={label} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 12, background: '#F8FAFC' }}>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 800, textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
                <div style={{ fontSize: 13, color: '#0F172A', lineHeight: 1.5, wordBreak: 'break-word' }}>{String(value)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ApplicantsRecordsPage({ user }) {
  const [params] = useSearchParams();
  const [filters, setFilters] = useState({
    search: params.get('search') || '',
    stage: params.get('stage') || '',
    source: params.get('source') || '',
    status: params.get('status') || '',
    recruiterId: params.get('recruiterId') || '',
    jobId: params.get('jobId') || '',
    minScore: params.get('minScore') || '',
    startDate: params.get('startDate') || '',
    endDate: params.get('endDate') || '',
  });
  const [rows, setRows]         = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [jobs, setJobs]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [stageCounts, setStageCounts] = useState({});
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [loading, setLoading]   = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast]       = useState('');
  const [selected, setSelected] = useState(null);
  const [editRow, setEditRow]   = useState(null);
  const [assigning, setAssigning] = useState('');
  const [historyJob, setHistoryJob] = useState(null); // { jobId, jobTitle, recruiterName, recruiterId }

  const canManage = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'recruiter';

  useEffect(() => {
    let alive = true;
    Promise.all([
      canManage ? api.getUsers({ role: 'recruiter', limit: 500 }).catch(() => []) : Promise.resolve([]),
      api.getJobs({ limit: 500 }).catch(() => []),
    ]).then(([recruiterRes, jobRes]) => {
      if (!alive) return;
      setRecruiters(toArray(recruiterRes));
      setJobs(toArray(jobRes));
    });
    return () => { alive = false; };
  }, [canManage]);

  const recruitersById = useMemo(() => {
    const map = new Map();
    recruiters.forEach(r => map.set(normalizeId(r), r));
    return map;
  }, [recruiters]);

  // Summary: total count + stage distribution — runs on filter change only (fast aggregation)
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await api.getApplicantsSummary(filters);
      setTotal(res?.total || 0);
      setStageCounts(res?.stageCounts || {});
    } catch { /* non-fatal — summary is display-only */ }
    finally { setSummaryLoading(false); }
  }, [filters]);

  // Page data: just the current 100 rows
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getApplicants({ ...filters, page, limit: PAGE_SIZE });
      setRows(Array.isArray(res?.data) ? res.data : []);
      setPages(res?.pagination?.pages || 1);
    } catch (e) {
      setToast('Applicant records could not load: ' + e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  // On filter change: reset page to 1, load both summary + first page in parallel
  useEffect(() => {
    setPage(1);
    loadSummary();
  }, [loadSummary]);                      // eslint-disable-line react-hooks/exhaustive-deps

  // On page change (or filter change after page resets to 1): load page data
  useEffect(() => { load(); }, [load]);

  const visibleRows = useMemo(() => rows, [rows]);

  const updateFilter = (key, value) => {
    setFilters(p => ({ ...p, [key]: value }));
    // page reset happens in the loadSummary useEffect
  };

  const clearFilters = () => {
    setFilters({ search: '', stage: '', source: '', status: '', recruiterId: '', jobId: '', minScore: '', startDate: '', endDate: '' });
    setPage(1);
  };

  const exportRows = async () => {
    setExporting(true);
    try {
      const blob = await downloadBlob(`/dashboard/applicants/export?${buildQuery(filters, 10000000)}`);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `applicant-records-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
    } catch (e) {
      setToast('Export failed: ' + e.message);
    } finally {
      setExporting(false);
    }
  };

  const changeStage = async (row, stage) => {
    if (!row.applicationId) return;
    try {
      await api.updateStage(row.applicationId, stage);
      setRows(prev => prev.map(r => r.applicationId === row.applicationId ? { ...r, stage, status: stage === 'Hired' ? 'hired' : stage === 'Rejected' ? 'rejected' : r.status } : r));
      setToast('Stage updated');
    } catch (e) {
      setToast('Stage update failed: ' + e.message);
    }
  };

  const assignRecruiter = async (row, recruiterId) => {
    const key = rowKey(row);
    setAssigning(key);
    const recruiter = recruitersById.get(recruiterId);
    const recruiterName = recruiter?.name || recruiter?.email || '';
    try {
      // 1. If this row has a jobId, update the job's assignedRecruiters.
      //    This makes ALL existing and future applicants for that job visible
      //    to the new recruiter without touching individual application records.
      if (row.jobId && recruiterId && (user?.role === 'admin' || user?.role === 'super_admin')) {
        await api.replaceJobRecruiter(row.jobId, recruiterId);
      }

      // 2. Also update the candidate-level assignment for per-candidate tracking.
      const targetId = row.userId || row.candidateId;
      if (targetId) {
        await api.assignCandidate(targetId, recruiterId || null);
      }

      // 3. Update all rows that share the same jobId so the entire job's applicants
      //    show the new recruiter immediately without a page reload.
      setRows(prev => prev.map(r => {
        const sameJob = row.jobId && r.jobId && String(r.jobId) === String(row.jobId);
        if (!sameJob && rowKey(r) !== key) return r;
        return {
          ...r,
          assignedRecruiterId : recruiterId || '',
          assignedRecruiterIds: recruiterId ? [recruiterId] : [],
          assignedRecruiters  : recruiterId ? recruiterName : '',
        };
      }));

      setToast(recruiterId
        ? `✅ ${recruiterName} is now the recruiter for "${row.jobTitle || 'this job'}" — all applicants updated.`
        : 'Recruiter assignment cleared.');
    } catch (e) {
      setToast('❌ Recruiter assignment failed: ' + e.message);
    } finally {
      setAssigning('');
    }
  };

  const roleLabel = user?.role === 'super_admin'
    ? 'Platform-wide applicant records'
    : user?.role === 'recruiter'
      ? 'Applicants on jobs assigned to you'
      : 'Organisation applicant records';

  // stageCounts comes from the server summary aggregation (accurate across all pages)
  const stageCountsTotal = useMemo(
    () => Object.values(stageCounts).reduce((a, b) => a + b, 0),
    [stageCounts]
  );

  return (
    <div>
      <PageHeader
        title="Applicant Records"
        subtitle={`${roleLabel}. Filter, inspect, export, and update application status from one place.`}
        action={(
          <button onClick={exportRows} disabled={exporting} style={{ ...btnP, opacity: exporting ? 0.65 : 1 }}>
            {exporting ? 'Exporting...' : 'Export Full Excel'}
          </button>
        )}
      />

      {/* ── Stage distribution chart — scoped to role's data by backend ── */}
      {!summaryLoading && total > 0 && (
        <div style={{ ...card, marginBottom: 16, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 6 }}>
            <div style={{ fontWeight: 800, fontSize: 12, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              📊 Pipeline Stage Overview
            </div>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
              <span style={{ color:'#0176D3', fontWeight:800 }}>{total.toLocaleString()}</span> total applicants · click a tile to filter
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px,1fr))', gap: 10 }}>
            {DB_STAGES.map(s => {
              const count = stageCounts[s] || 0;
              // % relative to loaded rows so the bars add up to 100%
              const pct   = stageCountsTotal > 0 ? Math.round((count / stageCountsTotal) * 100) : 0;
              const color = stageColor(s);
              return (
                <div
                  key={s}
                  onClick={() => updateFilter('stage', filters.stage === s ? '' : s)}
                  style={{
                    background: filters.stage === s ? `${color}15` : '#F8FAFC',
                    border: `1.5px solid ${filters.stage === s ? color : '#E2E8F0'}`,
                    borderRadius: 10, padding: '10px 10px 8px',
                    cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 900, color, lineHeight: 1 }}>{count}</div>
                  <div style={{ fontSize: 9, color: '#64748B', fontWeight: 700, margin: '4px 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s}</div>
                  <div style={{ height: 4, background: '#E2E8F0', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 3 }}>{pct}%</div>
                </div>
              );
            })}
          </div>
          {filters.stage && (
            <div style={{ marginTop: 10, fontSize: 11, color: '#0176D3', fontWeight: 700 }}>
              Filtered: {filters.stage} — <span onClick={() => updateFilter('stage', '')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Clear filter</span>
            </div>
          )}
        </div>
      )}

      <div style={{ ...card, marginBottom: 16 }}>
        <div className="tn-form-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.4fr) repeat(4, minmax(140px, 1fr)) auto', gap: 12, alignItems: 'end' }}>
          <Field label="Smart Search" value={filters.search} onChange={v => updateFilter('search', v)} placeholder="Name, email, mobile, job, skills..." />
          <Field label="Stage" value={filters.stage} onChange={v => updateFilter('stage', v)} placeholder="All stages" options={[{ value: '', label: 'All stages' }, ...DB_STAGES.map(s => ({ value: s, label: s }))]} />
          <Field label="Status" value={filters.status} onChange={v => updateFilter('status', v)} options={STATUS_OPTIONS} />
          <Field label="Source" value={filters.source} onChange={v => updateFilter('source', v)} options={SOURCE_OPTIONS} />
          <Field label="Match Score >=" type="number" min="0" max="100" value={filters.minScore} onChange={v => updateFilter('minScore', v)} placeholder="Any" />
          <button onClick={clearFilters} style={{ ...btnG, minHeight: 46 }}>Clear</button>
        </div>
        <div className="tn-form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(160px, 1fr))', gap: 12, alignItems: 'end', marginTop: 12 }}>
          {canManage && (
            <Field
              label="Recruiter"
              value={filters.recruiterId}
              onChange={v => updateFilter('recruiterId', v)}
              options={[{ value: '', label: 'All recruiters' }, ...recruiters.map(r => ({ value: normalizeId(r), label: r.name || r.email || 'Recruiter' }))]}
            />
          )}
          <Field
            label="Job"
            value={filters.jobId}
            onChange={v => updateFilter('jobId', v)}
            options={[{ value: '', label: 'All jobs' }, ...jobs.map(j => ({ value: normalizeId(j), label: `${j.title || 'Untitled Job'}${j.companyName || j.company ? ` - ${j.companyName || j.company}` : ''}` }))]}
          />
          <Field label="From" type="date" value={filters.startDate} onChange={v => updateFilter('startDate', v)} />
          <Field label="To" type="date" value={filters.endDate} onChange={v => updateFilter('endDate', v)} />
        </div>
      </div>

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ fontWeight: 800, color: '#0A1628' }}>{total} applicant record{total === 1 ? '' : 's'}</div>
          
          {/* Pagination Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button 
              disabled={page <= 1 || loading} 
              onClick={() => setPage(p => p - 1)}
              style={{ ...btnG, padding: '4px 12px', fontSize: 12, opacity: page <= 1 ? 0.5 : 1 }}
            >
              Previous
            </button>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>
              Page {page} of {pages}
            </span>
            <button 
              disabled={page >= pages || loading} 
              onClick={() => setPage(p => p + 1)}
              style={{ ...btnG, padding: '4px 12px', fontSize: 12, opacity: page >= pages ? 0.5 : 1 }}
            >
              Next
            </button>
          </div>

          <div style={{ color: '#64748B', fontSize: 12 }}>Status changes are saved immediately</div>
        </div>
        <style>{`
          /* Action icon buttons — compact, no text, always single row */
          .appr-act { display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;border:1px solid #E2E8F0;background:#F8FAFC;cursor:pointer;font-size:15px;transition:all 0.15s;text-decoration:none;flex-shrink:0; }
          .appr-act:hover { background:#EFF6FF;border-color:#0176D3; }
          .appr-act-green:hover { background:#F0FDF4;border-color:#059669; }
          .appr-acts { display:flex;gap:4px;align-items:center;flex-wrap:nowrap; }
          /* Stage pill in table */
          .appr-stage { display:inline-block;padding:3px 10px;border-radius:50px;font-size:11px;font-weight:700;white-space:nowrap; }
          /* Mobile card view */
          @media (max-width: 768px) {
            .appr-table-wrap { display:none !important; }
            .appr-cards { display:flex !important; }
          }
          @media (min-width: 769px) {
            .appr-cards { display:none !important; }
          }
        `}</style>

        {loading ? (
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
        ) : visibleRows.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748B', background: '#F8FAFC', borderRadius: 12 }}>
            No applicant records match these filters.
          </div>
        ) : (
          <>
            {/* ── DESKTOP TABLE ──────────────────────────────────────────── */}
            <div className="appr-table-wrap" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100, fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', position: 'sticky', top: 0, zIndex: 2 }}>
                    {[
                      { h: 'Candidate', w: '14%' },
                      { h: 'Contact', w: '13%' },
                      { h: 'Profile', w: '14%' },
                      { h: 'Job Applied', w: '14%' },
                      { h: 'Stage', w: '10%' },
                      { h: 'Recruiter', w: '11%' },
                      { h: 'Applied', w: '8%' },
                      { h: 'Score', w: '5%' },
                      { h: 'Actions', w: '7%' },
                    ].map(col => (
                      <th key={col.h} style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.7, borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap', width: col.w }}>
                        {col.h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((r, i) => (
                    <tr key={rowKey(r, i)}
                      style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                      onClick={() => setEditRow(r)}>

                      {/* Candidate — name + title/company */}
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ fontWeight: 800, color: '#0A1628', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{r.candidateName || r.email?.split('@')[0] || r.phone || `Applicant-${(r.applicationId||r.candidateId||'').slice(-4)}`}</div>
                        <div style={{ color: '#64748B', fontSize: 11, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                          {[r.title, r.currentCompany].filter(Boolean).join(' · ') || '—'}
                        </div>
                        {r.location && <div style={{ color: '#94A3B8', fontSize: 10, marginTop: 1 }}>📍 {r.location}</div>}
                      </td>

                      {/* Contact — email + phone */}
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ fontSize: 12, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{r.email || '—'}</div>
                        <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{r.phone || '—'}</div>
                        {r.organisation && <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>🏢 {r.organisation}</div>}
                      </td>

                      {/* Profile — experience + skills + CTC */}
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ fontSize: 12, color: '#374151' }}>
                          {r.experience != null && r.experience !== '' ? `${r.experience} yr${Number(r.experience) === 1 ? '' : 's'} exp` : '—'}
                          {r.availability ? ` · ${r.availability}` : ''}
                        </div>
                        {(r.currentCTC || r.expectedCTC) && (
                          <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                            {r.currentCTC ? `CTC: ${r.currentCTC}` : ''}{r.currentCTC && r.expectedCTC ? ' / ' : ''}{r.expectedCTC ? `Exp: ${r.expectedCTC}` : ''}
                          </div>
                        )}
                        {r.skills && (
                          <div style={{ marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                            {(Array.isArray(r.skills) ? r.skills : String(r.skills).split(',')).slice(0, 3).map(s => s?.trim()).filter(Boolean).map(sk => (
                              <span key={sk} style={{ background: 'rgba(1,118,211,0.08)', color: '#0176D3', fontSize: 10, padding: '1px 6px', borderRadius: 50, fontWeight: 600 }}>{sk}</span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Job applied */}
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: '#0A1628', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 170 }}>{r.jobTitle || '—'}</div>
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                          {[r.jobCompany, r.jobLocation].filter(Boolean).join(' · ') || ''}
                        </div>
                        {r.jobType && <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>{r.jobType}</div>}
                      </td>

                      {/* Stage — pill + inline dropdown on click */}
                      <td style={{ padding: '11px 12px' }} onClick={e => e.stopPropagation()}>
                        <select
                          value={r.stage || 'Applied'}
                          onChange={e => changeStage(r, e.target.value)}
                          style={{ padding: '4px 8px', borderRadius: 20, border: `1.5px solid ${stageColor(r.stage)}40`, background: `${stageColor(r.stage)}12`, color: stageColor(r.stage), fontSize: 11, fontWeight: 700, cursor: 'pointer', outline: 'none', maxWidth: 130 }}>
                          {DB_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 3 }}>{r.source || 'platform'}</div>
                      </td>

                      {/* Recruiter — admin/super_admin can change via dropdown; recruiter sees name */}
                      <td style={{ padding: '11px 12px' }} onClick={e => e.stopPropagation()}>
                        {(user?.role === 'admin' || user?.role === 'super_admin') ? (
                          <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                            <select
                              value={r.assignedRecruiterIds?.[0] || r.assignedRecruiterId || ''}
                              onChange={e => assignRecruiter(r, e.target.value)}
                              disabled={assigning === rowKey(r)}
                              style={{ flex:1, fontSize: 12, border: `1px solid ${r.assignedRecruiterId || r.assignedRecruiterIds?.length ? 'rgba(1,118,211,0.3)' : '#E2E8F0'}`, borderRadius: 8, padding: '5px 8px', color: (r.assignedRecruiterId || r.assignedRecruiterIds?.length) ? '#0176D3' : '#94A3B8', background: '#fff', cursor: 'pointer' }}>
                              <option value="">Unassigned</option>
                              {recruiters.map(rec => <option key={normalizeId(rec)} value={normalizeId(rec)}>{rec.name || rec.email || 'Recruiter'}</option>)}
                            </select>
                            {r.jobId && (
                              <button
                                title="View recruiter history for this job"
                                onClick={() => setHistoryJob({ jobId: r.jobId, jobTitle: r.jobTitle || r.job || 'Job', recruiterName: r.assignedRecruiters || '', recruiterId: r.assignedRecruiterId || r.assignedRecruiterIds?.[0] || '' })}
                                style={{ background:'rgba(1,118,211,0.08)', border:'none', borderRadius:6, width:26, height:26, cursor:'pointer', fontSize:12, color:'#0176D3', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
                              >📋</button>
                            )}
                          </div>
                        ) : (
                          // Recruiter login: backend scopes ALL rows to their own jobs.
                          // Show name + history button so the new recruiter can see the full
                          // handoff trail (who previously worked this job and when).
                          <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                            <span style={{ fontSize: 12, color: '#0176D3', fontWeight: 700 }}>
                              {r.assignedRecruiters || user?.name || 'You'}
                            </span>
                            {r.jobId && (
                              <button
                                title="View recruiter history for this job"
                                onClick={() => setHistoryJob({ jobId: r.jobId, jobTitle: r.jobTitle || r.job || 'Job', recruiterName: r.assignedRecruiters || '', recruiterId: r.assignedRecruiterId || r.assignedRecruiterIds?.[0] || '' })}
                                style={{ background:'rgba(1,118,211,0.08)', border:'none', borderRadius:6, width:22, height:22, cursor:'pointer', fontSize:11, color:'#0176D3', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
                              >📋</button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Applied date */}
                      <td style={{ padding: '11px 12px', fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>
                        {fmtDate(r.appliedAt)}
                        {r.noticePeriodDays ? <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{r.noticePeriodDays}d notice</div> : null}
                      </td>

                      {/* Smart Score */}
                      <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                        {r.aiMatchScore != null && r.aiMatchScore !== '' ? (
                          <div>
                            <div style={{ fontWeight: 900, fontSize: 13, color: r.aiMatchScore >= 80 ? '#059669' : r.aiMatchScore >= 60 ? '#F59E0B' : '#64748B' }}>
                              {r.aiMatchScore}%
                            </div>
                          </div>
                        ) : <span style={{ color: '#CBD5E1', fontSize: 12 }}>—</span>}
                      </td>

                      {/* Actions — icon-only, no text, never wrap */}
                      <td style={{ padding: '11px 12px' }} onClick={e => e.stopPropagation()}>
                        <div className="appr-acts">
                          <button className="appr-act" onClick={() => setEditRow(r)} title="Open full profile & edit">👤</button>
                          {(r.resumeUrl || r.candidateId || r.userId) && (
                            <button className="appr-act" title="View resume"
                              onClick={() => {
                                const cid = r.candidateId || r.userId;
                                if (cid) window.open(`/app/resume/${cid}`, '_blank');
                                else if (r.resumeUrl) window.open(r.resumeUrl, '_blank');
                              }}>📋</button>
                          )}
                          {r.appliedFromLat && r.appliedFromLng && (
                            <a className="appr-act appr-act-green" href={`https://www.google.com/maps?q=${r.appliedFromLat},${r.appliedFromLng}`}
                              target="_blank" rel="noopener noreferrer"
                              title={`Applied from: ${r.appliedFromCity || r.appliedFromLat + ',' + r.appliedFromLng}`}
                              style={{ color: '#059669' }}>📍</a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── MOBILE CARDS ───────────────────────────────────────────── */}
            <div className="appr-cards" style={{ flexDirection: 'column', gap: 10, display: 'none' }}>
              {visibleRows.map((r, i) => (
                <div key={rowKey(r, i)}
                  style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  {/* Card header — tappable to open profile */}
                  <div style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}
                    onClick={() => setEditRow(r)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#0A1628' }}>{r.candidateName || r.email?.split('@')[0] || r.phone || `Applicant-${(r.applicationId||r.candidateId||'').slice(-4)}`}</div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                        {[r.title, r.currentCompany].filter(Boolean).join(' · ') || '—'}
                      </div>
                      {r.jobTitle && (
                        <div style={{ fontSize: 12, color: '#0176D3', marginTop: 3, fontWeight: 600 }}>
                          💼 {r.jobTitle}{r.jobCompany ? ` · ${r.jobCompany}` : ''}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 50, background: `${stageColor(r.stage)}14`, color: stageColor(r.stage), fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {r.stage || 'Applied'}
                      </div>
                      {r.aiMatchScore != null && r.aiMatchScore !== '' && (
                        <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{r.aiMatchScore}% match</div>
                      )}
                    </div>
                  </div>

                  {/* Details grid */}
                  <div style={{ padding: '0 14px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>
                    {[
                      { label: 'Email', value: r.email },
                      { label: 'Phone', value: r.phone },
                      { label: 'Experience', value: r.experience != null ? `${r.experience} yrs` : null },
                      { label: 'Availability', value: r.availability },
                      { label: 'Current CTC', value: r.currentCTC },
                      { label: 'Expected CTC', value: r.expectedCTC },
                      { label: 'Location', value: r.location },
                      { label: 'Notice', value: r.noticePeriodDays ? `${r.noticePeriodDays} days` : null },
                      { label: 'Applied', value: fmtDate(r.appliedAt) },
                      { label: 'Source', value: r.source },
                    ].filter(f => f.value).map(f => (
                      <div key={f.label}>
                        <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{f.label}</div>
                        <div style={{ fontSize: 12, color: '#374151', fontWeight: 500, marginTop: 1, wordBreak: 'break-word' }}>{f.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Skills */}
                  {r.skills && (
                    <div style={{ padding: '0 14px 10px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(Array.isArray(r.skills) ? r.skills : String(r.skills).split(',')).slice(0, 5).map(s => s?.trim()).filter(Boolean).map(sk => (
                        <span key={sk} style={{ background: 'rgba(1,118,211,0.08)', color: '#0176D3', fontSize: 11, padding: '2px 8px', borderRadius: 50, fontWeight: 600 }}>{sk}</span>
                      ))}
                    </div>
                  )}

                  {/* Stage change + actions row */}
                  <div style={{ padding: '10px 14px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                    <select value={r.stage || 'Applied'} onChange={e => changeStage(r, e.target.value)}
                      style={{ flex: 1, minWidth: 120, padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${stageColor(r.stage)}40`, background: `${stageColor(r.stage)}10`, color: stageColor(r.stage), fontSize: 12, fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
                      {DB_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button className="appr-act" onClick={() => setEditRow(r)} title="Open full profile">👤</button>
                    {(r.resumeUrl || r.candidateId || r.userId) && (
                      <button className="appr-act" title="View resume"
                        onClick={() => { const cid = r.candidateId || r.userId; if (cid) window.open(`/app/resume/${cid}`, '_blank'); else if (r.resumeUrl) window.open(r.resumeUrl, '_blank'); }}>📋</button>
                    )}
                    {r.appliedFromLat && r.appliedFromLng && (
                      <a className="appr-act appr-act-green"
                        href={`https://www.google.com/maps?q=${r.appliedFromLat},${r.appliedFromLng}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ color: '#059669' }} title="View location">📍</a>
                    )}
                    {canManage && (
                      <select value={r.assignedRecruiterId || ''} onChange={e => assignRecruiter(r, e.target.value)}
                        disabled={assigning === rowKey(r)}
                        style={{ flex: 1, minWidth: 110, fontSize: 12, border: '1px solid #E2E8F0', borderRadius: 8, padding: '7px 8px', color: r.assignedRecruiterId ? '#0176D3' : '#94A3B8', background: '#fff' }}>
                        <option value="">Assign recruiter</option>
                        {recruiters.map(rec => <option key={normalizeId(rec)} value={normalizeId(rec)}>{rec.name || rec.email}</option>)}
                      </select>
                    )}
                    {r.jobId && (
                      <button
                        title="View recruiter history for this job"
                        onClick={() => setHistoryJob({ jobId: r.jobId, jobTitle: r.jobTitle || r.job || 'Job', recruiterName: r.assignedRecruiters || '', recruiterId: r.assignedRecruiterId || r.assignedRecruiterIds?.[0] || '' })}
                        style={{ background:'rgba(1,118,211,0.08)', border:'none', borderRadius:6, width:30, height:30, cursor:'pointer', fontSize:13, color:'#0176D3', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
                      >📋</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {selected && <DetailDrawer record={selected} onClose={() => setSelected(null)} />}
      {editRow && (
        <UserDetailDrawer
          user={rowToCandidate(editRow)}
          app={rowToApp(editRow)}
          isSuperAdmin={user?.role === 'super_admin'}
          currentUserRole={user?.role}
          onClose={() => setEditRow(null)}
          onUpdated={() => {
            setEditRow(null);
            load();
          }}
        />
      )}
      <CapLimitBanner total={total} fetched={rows.length} entity="applicant records" role={user?.role} />
      <Toast msg={toast} onClose={() => setToast('')} />

      {/* ── Recruiter History Modal ── */}
      {historyJob && (
        <Modal
          title={`📋 Recruiter History — ${historyJob.jobTitle}`}
          onClose={() => setHistoryJob(null)}
          footer={<button onClick={() => setHistoryJob(null)} style={{ ...btnG, width:'100%' }}>Close</button>}
        >
          <div style={{ color:'#64748B', fontSize:12, marginBottom:16 }}>
            Full handoff trail for this job. Previous recruiters' contact details are shown so you can coordinate.
          </div>
          <JobRecruiterHistory
            jobId={historyJob.jobId}
            jobTitle={historyJob.jobTitle}
            currentRecruiterName={historyJob.recruiterName || (['recruiter'].includes(user?.role) ? user?.name : undefined)}
            currentRecruiterId={historyJob.recruiterId || (['recruiter'].includes(user?.role) ? user?.id || user?._id : undefined)}
          />
        </Modal>
      )}
    </div>
  );
}
