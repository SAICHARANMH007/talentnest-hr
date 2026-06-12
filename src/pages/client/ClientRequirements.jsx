import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Field from '../../components/ui/Field.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { btnP, btnG, btnD, card } from '../../constants/styles.js';
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

const STATUS_LABEL = { new: 'Submitted', in_progress: 'In Progress', converted: 'Job Posted', closed: 'Closed' };

const EMPTY_FORM = {
  title: '', department: '', location: '', employmentType: 'full_time', openings: 1,
  experienceRequired: '', skillsRequired: '', budgetRange: '', priority: 'medium', description: '',
};

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full-Time' },
  { value: 'part_time', label: 'Part-Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function SkeletonRow() {
  return <tr>{[1,2,3,4,5,6].map(i => <td key={i} style={S.td}><div className="tn-skeleton" style={{ height: 14, borderRadius: 6, width: '70%' }} /></td>)}</tr>;
}

function toFormData(r) {
  return {
    title: r.title || '',
    department: r.department || '',
    location: r.location || '',
    employmentType: r.employmentType || 'full_time',
    openings: r.openings || 1,
    experienceRequired: r.experienceRequired || '',
    skillsRequired: (r.skillsRequired || []).join(', '),
    budgetRange: r.budgetRange || '',
    priority: r.priority || 'medium',
    description: r.description || '',
  };
}

function toPayload(form) {
  return {
    ...form,
    openings: Number(form.openings) > 0 ? Number(form.openings) : 1,
    skillsRequired: form.skillsRequired.split(',').map(s => s.trim()).filter(Boolean),
  };
}

export default function ClientRequirements({ user }) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [toast,   setToast]   = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null); // requirement being edited, or null for new
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.getJobRequirements()
      .then(r => setItems(Array.isArray(r) ? r : (r?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (r) => { setEditing(r); setForm(toFormData(r)); setShowForm(true); };

  const handleSave = async () => {
    if (!form.title.trim()) { setToast('❌ Job title is required'); return; }
    setSaving(true);
    try {
      const payload = toPayload(form);
      if (editing) {
        await api.updateJobRequirement(editing.id || editing._id, payload);
        setToast('✅ Requirement updated');
      } else {
        await api.createJobRequirement(payload);
        setToast('✅ Hiring requirement submitted');
      }
      setShowForm(false);
      load();
    } catch (e) { setToast(`❌ ${e.message}`); }
    setSaving(false);
  };

  const handleWithdraw = async (r) => {
    if (!window.confirm(`Withdraw the requirement "${r.title}"?`)) return;
    try {
      await api.withdrawJobRequirement(r.id || r._id);
      setToast('✅ Requirement withdrawn');
      load();
    } catch (e) { setToast(`❌ ${e.message}`); }
  };

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      <PageHeader title="📋 Hiring Requirements" subtitle="Raise new hiring needs and track progress"
        action={<button onClick={openNew} style={btnP}>+ New Requirement</button>} />

      {error && <div style={{ ...card, color: '#BA0517', marginBottom: 16 }}>❌ {error} <button onClick={load} style={{ ...btnG, marginLeft: 12 }}>Retry</button></div>}

      <div style={card}>
        {loading ? (
          <table style={S.table}>
            <thead><tr>{['Role','Openings','Priority','Status','Submitted','Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{[1,2,3].map(i => <SkeletonRow key={i} />)}</tbody>
          </table>
        ) : items.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 600 }}>No hiring requirements yet</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Click "+ New Requirement" to ask your recruitment team to start hiring for a role</div>
          </div>
        ) : (
          <table style={S.table}>
            <thead><tr>{['Role','Openings','Priority','Status','Submitted','Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {items.map(r => {
                const id = r.id || r._id;
                return (
                  <tr key={id}
                    onMouseEnter={e => e.currentTarget.style.background='#FAFAF9'}
                    onMouseLeave={e => e.currentTarget.style.background=''}>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600 }}>{r.title}</div>
                      {r.department && <div style={{ fontSize: 11, color: '#706E6B' }}>{r.department}{r.location ? ` · ${r.location}` : ''}</div>}
                    </td>
                    <td style={S.td}>{r.openings || 1}</td>
                    <td style={S.td}><Badge label={(r.priority || 'medium').toUpperCase()} color={S.priorityColor[r.priority] || '#0176D3'} /></td>
                    <td style={S.td}><Badge label={STATUS_LABEL[r.status] || r.status} color={S.statusColor[r.status] || '#706E6B'} /></td>
                    <td style={S.td}>{fmt(r.createdAt)}</td>
                    <td style={S.td}>
                      {r.status === 'new' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEdit(r)} style={{ ...btnG, fontSize: 12 }}>Edit</button>
                          <button onClick={() => handleWithdraw(r)} style={{ ...btnD, fontSize: 12 }}>Withdraw</button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: '#706E6B' }}>
                          {r.status === 'in_progress' && '🔄 Being worked on'}
                          {r.status === 'converted' && (
                            r.convertedJobId
                              ? `✅ Job posted: ${r.convertedJobId.title}${r.convertedJobId.applicantsCount || r.convertedJobId.applicationCount ? ` (${r.convertedJobId.applicantsCount || r.convertedJobId.applicationCount} candidates)` : ''}`
                              : '✅ Job created'
                          )}
                          {r.status === 'closed' && '🚫 Closed'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <Modal title={editing ? '✏️ Edit Hiring Requirement' : '📋 New Hiring Requirement'} onClose={() => setShowForm(false)} footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={btnG}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={btnP}>{saving ? 'Saving…' : 'Submit'}</button>
          </div>
        }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Job Title" required value={form.title} onChange={v => sf('title', v)} placeholder="e.g. Senior Backend Developer" />
            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="Department" value={form.department} onChange={v => sf('department', v)} placeholder="e.g. Engineering" />
              <Field label="Location" value={form.location} onChange={v => sf('location', v)} placeholder="e.g. Bengaluru / Remote" />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="Employment Type" value={form.employmentType} onChange={v => sf('employmentType', v)} options={EMPLOYMENT_TYPES} />
              <Field label="Openings" type="number" min={1} value={form.openings} onChange={v => sf('openings', v)} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="Experience Required" value={form.experienceRequired} onChange={v => sf('experienceRequired', v)} placeholder="e.g. 3-5 years" />
              <Field label="Priority" value={form.priority} onChange={v => sf('priority', v)} options={PRIORITIES} />
            </div>
            <Field label="Skills Required" value={form.skillsRequired} onChange={v => sf('skillsRequired', v)} placeholder="e.g. Node.js, React, MongoDB (comma separated)" />
            <Field label="Budget Range" value={form.budgetRange} onChange={v => sf('budgetRange', v)} placeholder="e.g. ₹12-18 LPA" />
            <Field label="Description / Notes" type="textarea" rows={4} value={form.description} onChange={v => sf('description', v)} placeholder="Any additional context for our recruiters" />
          </div>
        </Modal>
      )}
    </div>
  );
}
