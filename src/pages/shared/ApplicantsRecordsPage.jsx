import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, downloadBlob } from '../../api/api.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Field from '../../components/ui/Field.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Toast from '../../components/ui/Toast.jsx';
import { card, btnP, btnG } from '../../constants/styles.js';

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

const SOURCE_OPTIONS = [
  { value: '', label: 'All sources' },
  { value: 'platform', label: 'Platform' },
  { value: 'career_page', label: 'Career page' },
  { value: 'invite', label: 'Invite' },
  { value: 'manual', label: 'Manual' },
  { value: 'bulk_import', label: 'Bulk import' },
];

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

function buildQuery(filters, limit = 1000) {
  const q = new URLSearchParams();
  q.set('limit', String(limit));
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') q.set(k, v);
  });
  return q.toString();
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
    ['AI Match Score', record.aiMatchScore],
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
            <h2 style={{ margin: '4px 0 0', fontSize: 22, color: '#0A1628' }}>{record.candidateName || 'Candidate'}</h2>
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
    startDate: params.get('startDate') || '',
    endDate: params.get('endDate') || '',
  });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getApplicants({ ...filters, limit: 1000 });
      setRows(Array.isArray(res?.data) ? res.data : []);
      setTotal(res?.total || 0);
    } catch (e) {
      setToast('Export-ready applicant records could not load: ' + e.message);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const visibleRows = useMemo(() => rows, [rows]);

  const updateFilter = (key, value) => setFilters(p => ({ ...p, [key]: value }));

  const clearFilters = () => setFilters({ search: '', stage: '', source: '', startDate: '', endDate: '' });

  const exportRows = async () => {
    setExporting(true);
    try {
      const blob = await downloadBlob(`/dashboard/applicants/export?${buildQuery(filters, 10000)}`);
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

  const roleLabel = user?.role === 'super_admin'
    ? 'Platform-wide applicant records'
    : user?.role === 'recruiter'
      ? 'Applicants on jobs assigned to you'
      : 'Organisation applicant records';

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

      <div style={{ ...card, marginBottom: 16 }}>
        <div className="tn-form-row tn-form-row-5" style={{ display: 'grid', gridTemplateColumns: '1.5fr repeat(4, minmax(140px, 1fr)) auto', gap: 12, alignItems: 'end' }}>
          <Field label="Smart Search" value={filters.search} onChange={v => updateFilter('search', v)} placeholder="Name, email, mobile, job, skills..." />
          <Field label="Stage" value={filters.stage} onChange={v => updateFilter('stage', v)} placeholder="All stages" options={[{ value: '', label: 'All stages' }, ...DB_STAGES.map(s => ({ value: s, label: s }))]} />
          <Field label="Source" value={filters.source} onChange={v => updateFilter('source', v)} options={SOURCE_OPTIONS} />
          <Field label="From" type="date" value={filters.startDate} onChange={v => updateFilter('startDate', v)} />
          <Field label="To" type="date" value={filters.endDate} onChange={v => updateFilter('endDate', v)} />
          <button onClick={clearFilters} style={{ ...btnG, minHeight: 46 }}>Clear</button>
        </div>
      </div>

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ fontWeight: 800, color: '#0A1628' }}>{total} applicant record{total === 1 ? '' : 's'}</div>
          <div style={{ color: '#64748B', fontSize: 12 }}>Status changes are saved immediately</div>
        </div>
        {loading ? (
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
        ) : (
          <div className="tn-table-scroll" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1180, fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Applicant', 'Contact', 'Organisation', 'Job', 'Assigned Recruiter', 'Stage', 'Source', 'Applied', 'AI', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: '#334155', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r, i) => (
                  <tr key={r.applicationId || `${r.email}-${i}`} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 800, color: '#0A1628' }}>{r.candidateName || 'Candidate'}</div>
                      <div style={{ color: '#64748B', fontSize: 12 }}>{r.title || r.currentCompany || 'Profile pending'}</div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#334155' }}>
                      <div>{r.email || '-'}</div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>{r.phone || '-'}</div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#334155' }}>{r.organisation || '-'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700 }}>{r.jobTitle || '-'}</div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>{r.jobCompany || r.jobLocation || ''}</div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#334155' }}>{r.assignedRecruiters || '-'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <select value={r.stage || 'Applied'} onChange={e => changeStage(r, e.target.value)} style={{ minHeight: 36, border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 10px', fontWeight: 700, color: stageColor(r.stage), background: '#fff' }}>
                        {DB_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '12px 14px' }}><Badge label={r.source || 'platform'} color="#64748B" /></td>
                    <td style={{ padding: '12px 14px', color: '#334155', whiteSpace: 'nowrap' }}>{fmtDate(r.appliedAt)}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0176D3' }}>{r.aiMatchScore ?? '-'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <button onClick={() => setSelected(r)} style={{ ...btnG, padding: '7px 12px', fontSize: 12 }}>View Details</button>
                    </td>
                  </tr>
                ))}
                {!visibleRows.length && (
                  <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>No applicant records match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <DetailDrawer record={selected} onClose={() => setSelected(null)} />}
      <Toast msg={toast} onClose={() => setToast('')} />
    </div>
  );
}
