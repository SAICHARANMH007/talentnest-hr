import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Field from '../../components/ui/Field.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { btnP, btnG, card } from '../../constants/styles.js';
import { api } from '../../api/api.js';

// ── Styles outside component ───────────────────────────────────────────────────
const S = {
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', borderBottom: '2px solid #F3F2F2' },
  td: { padding: '12px 14px', fontSize: 13, color: '#181818', borderBottom: '1px solid #F3F2F2', verticalAlign: 'top' },
  empty: { textAlign: 'center', padding: '60px 24px', color: '#706E6B', fontSize: 14 },
  statusColor: { new: '#0176D3', in_progress: '#F59E0B', converted: '#34d399', closed: '#9E9D9B' },
  priorityColor: { low: '#9E9D9B', medium: '#0176D3', high: '#F59E0B', urgent: '#BA0517' },
};

const STATUS_LABEL = { new: 'New', in_progress: 'In Progress', converted: 'Job Posted', closed: 'Closed' };

const STATUS_FILTERS = [
  { value: '', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'converted', label: 'Job Posted' },
  { value: 'closed', label: 'Closed' },
];

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function SkeletonRow() {
  return <tr>{[1,2,3,4,5,6,7].map(i => <td key={i} style={S.td}><div className="tn-skeleton" style={{ height: 14, borderRadius: 6, width: '70%' }} /></td>)}</tr>;
}

export default function JobRequirements({ user }) {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [toast,      setToast]      = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [recruiters, setRecruiters] = useState([]);
  const [detail,     setDetail]     = useState(null); // requirement being viewed/managed
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError('');
    const qs = statusFilter ? `status=${statusFilter}&limit=10000000` : 'limit=10000000';
    api.getJobRequirements(qs)
      .then(r => setItems(Array.isArray(r) ? r : (r?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.getUsers('recruiter').then(list => setRecruiters(Array.isArray(list) ? list : [])).catch(() => {}); }, []);

  const refreshDetail = (updated) => {
    setDetail(updated);
    setItems(prev => prev.map(it => (it.id || it._id) === (updated.id || updated._id) ? { ...it, ...updated } : it));
  };

  const handleStatusChange = async (status) => {
    if (!detail) return;
    setSaving(true);
    try {
      const r = await api.updateJobRequirementStatus(detail.id || detail._id, { status });
      refreshDetail(r?.data || r);
      setToast(`✅ Marked as ${STATUS_LABEL[status] || status}`);
    } catch (e) { setToast(`❌ ${e.message}`); }
    setSaving(false);
  };

  const handleAssign = async (recruiterId) => {
    if (!detail) return;
    setSaving(true);
    try {
      const r = await api.updateJobRequirementStatus(detail.id || detail._id, { assignedRecruiter: recruiterId, status: detail.status === 'new' ? 'in_progress' : undefined });
      refreshDetail(r?.data || r);
      setToast('✅ Assigned');
    } catch (e) { setToast(`❌ ${e.message}`); }
    setSaving(false);
  };

  const handleSaveNotes = async (notes) => {
    if (!detail) return;
    setSaving(true);
    try {
      const r = await api.updateJobRequirementStatus(detail.id || detail._id, { internalNotes: notes });
      refreshDetail(r?.data || r);
      setToast('✅ Notes saved');
    } catch (e) { setToast(`❌ ${e.message}`); }
    setSaving(false);
  };

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      <PageHeader title="📋 Client Requirements" subtitle="Hiring requests raised by your clients"
        action={
          <Field value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTERS} style={{ minWidth: 180 }} />
        } />

      {error && <div style={{ ...card, color: '#BA0517', marginBottom: 16 }}>❌ {error} <button onClick={load} style={{ ...btnG, marginLeft: 12 }}>Retry</button></div>}

      <div style={card}>
        {loading ? (
          <table style={S.table}>
            <thead><tr>{['Client','Role','Openings','Priority','Status','Assigned To','Date'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{[1,2,3].map(i => <SkeletonRow key={i} />)}</tbody>
          </table>
        ) : items.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 600 }}>No hiring requirements yet</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Requirements raised by your clients will appear here</div>
          </div>
        ) : (
          <table style={S.table}>
            <thead><tr>{['Client','Role','Openings','Priority','Status','Assigned To','Date'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {items.map(r => {
                const id = r.id || r._id;
                return (
                  <tr key={id} onClick={() => setDetail(r)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background='#FAFAF9'}
                    onMouseLeave={e => e.currentTarget.style.background=''}>
                    <td style={S.td}>{r.clientId?.companyName || '—'}</td>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600 }}>{r.title}</div>
                      {r.department && <div style={{ fontSize: 11, color: '#706E6B' }}>{r.department}{r.location ? ` · ${r.location}` : ''}</div>}
                    </td>
                    <td style={S.td}>{r.openings || 1}</td>
                    <td style={S.td}><Badge label={(r.priority || 'medium').toUpperCase()} color={S.priorityColor[r.priority] || '#0176D3'} /></td>
                    <td style={S.td}><Badge label={STATUS_LABEL[r.status] || r.status} color={S.statusColor[r.status] || '#706E6B'} /></td>
                    <td style={S.td}>{r.assignedRecruiter?.name || <span style={{ color: '#9E9D9B' }}>Unassigned</span>}</td>
                    <td style={S.td}>{fmt(r.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {detail && (
        <Modal title={`📋 ${detail.title}`} onClose={() => setDetail(null)} footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setDetail(null)} style={btnG}>Close</button>
          </div>
        }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge label={`Client: ${detail.clientId?.companyName || '—'}`} color="#0176D3" />
              <Badge label={STATUS_LABEL[detail.status] || detail.status} color={S.statusColor[detail.status] || '#706E6B'} />
              <Badge label={`Priority: ${(detail.priority || 'medium').toUpperCase()}`} color={S.priorityColor[detail.priority] || '#0176D3'} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
              <div><strong>Department:</strong> {detail.department || '—'}</div>
              <div><strong>Location:</strong> {detail.location || '—'}</div>
              <div><strong>Employment Type:</strong> {detail.employmentType || '—'}</div>
              <div><strong>Openings:</strong> {detail.openings || 1}</div>
              <div><strong>Experience:</strong> {detail.experienceRequired || '—'}</div>
              <div><strong>Budget:</strong> {detail.budgetRange || '—'}</div>
            </div>

            {detail.skillsRequired?.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#706E6B', marginBottom: 6, textTransform: 'uppercase' }}>Skills</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {detail.skillsRequired.map(s => <Badge key={s} label={s} color="#7C3AED" />)}
                </div>
              </div>
            )}

            {detail.description && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#706E6B', marginBottom: 6, textTransform: 'uppercase' }}>Description</div>
                <div style={{ fontSize: 13, color: '#181818', whiteSpace: 'pre-wrap' }}>{detail.description}</div>
              </div>
            )}

            <div style={{ fontSize: 11, color: '#9E9D9B' }}>
              Submitted by {detail.submittedBy?.name || 'Client'} on {fmt(detail.createdAt)}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #F3F2F2', margin: '4px 0' }} />

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#706E6B', marginBottom: 6, textTransform: 'uppercase' }}>Assign Recruiter</div>
              <Field value={detail.assignedRecruiter?._id || detail.assignedRecruiter?.id || ''} onChange={handleAssign} disabled={saving}
                options={[{ value: '', label: 'Unassigned' }, ...recruiters.map(rec => ({ value: String(rec.id || rec._id), label: rec.name }))]} />
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#706E6B', marginBottom: 6, textTransform: 'uppercase' }}>Internal Notes</div>
              <Field type="textarea" rows={3} value={detail.internalNotes || ''} onChange={v => setDetail(p => ({ ...p, internalNotes: v }))} onBlur={() => handleSaveNotes(detail.internalNotes || '')} placeholder="Notes visible only to your team" />
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#706E6B', marginBottom: 6, textTransform: 'uppercase' }}>Status</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {detail.status !== 'in_progress' && <button onClick={() => handleStatusChange('in_progress')} disabled={saving} style={{ ...btnG, fontSize: 12 }}>Mark In Progress</button>}
                {detail.status !== 'converted' && <button onClick={() => handleStatusChange('converted')} disabled={saving} style={{ ...btnP, fontSize: 12 }}>✅ Mark Job Posted</button>}
                {detail.status !== 'closed' && <button onClick={() => handleStatusChange('closed')} disabled={saving} style={{ ...btnG, fontSize: 12 }}>Close</button>}
                {detail.status === 'closed' && <button onClick={() => handleStatusChange('new')} disabled={saving} style={{ ...btnG, fontSize: 12 }}>Reopen</button>}
              </div>
              <div style={{ fontSize: 11, color: '#9E9D9B', marginTop: 8 }}>
                Tip: Use the regular "Post Job" page to create the actual job listing for this client, then come back here and mark it as "Job Posted".
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
