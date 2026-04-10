import { useState, useEffect } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Field from '../../components/ui/Field.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { btnP, btnG, btnD, card, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';

// ── Styles outside component ───────────────────────────────────────────────────
const S = {
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #F3F2F2' },
  td: { padding: '12px 14px', fontSize: 13, color: '#181818', borderBottom: '1px solid #F3F2F2', verticalAlign: 'middle' },
  empty: { textAlign: 'center', padding: '60px 24px', color: '#706E6B', fontSize: 14 },
  statusColors: { pending: '#F59E0B', in_progress: '#0176D3', fulfilled: '#34d399', cancelled: '#706E6B' },
  urgencyColors: { low: '#34d399', medium: '#0176D3', high: '#F59E0B', critical: '#BA0517' },
};

const URGENCY_OPTS = ['low', 'medium', 'high', 'critical'];
const EMPTY_FORM   = { roleTitle: '', requirements: '', urgency: 'medium', budget: '' };

function SkeletonRow() {
  return (
    <tr>
      {[1,2,3,4,5].map(i => (
        <td key={i} style={S.td}>
          <div className="tn-skeleton" style={{ height: 14, borderRadius: 6, width: '75%' }} />
        </td>
      ))}
    </tr>
  );
}

export default function AdminCandidateRequest({ user }) {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [toast,    setToast]    = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [submitting,setSubmitting]= useState(false);

  const load = () => {
    setLoading(true); setError('');
    api.getCandidateRequests()
      .then(r => setRequests(Array.isArray(r) ? r : (r?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.roleTitle.trim()) { setToast('❌ Role title is required'); return; }
    setSubmitting(true);
    try {
      await api.createCandidateRequest(form);
      setToast('✅ Request submitted! Our team will get back to you shortly.');
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e) {
      setToast(`❌ ${e.message}`);
    }
    setSubmitting(false);
  };

  const handleCancel = async (id) => {
    try {
      await api.cancelCandidateRequest(id);
      setToast('✅ Request cancelled');
      load();
    } catch (e) {
      setToast(`❌ ${e.message}`);
    }
  };

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      <PageHeader
        title="🙋 Candidate Requests"
        subtitle="Request emergency staffing support from TalentNest"
        action={<button onClick={() => setShowForm(true)} style={btnP}>+ New Request</button>}
      />

      {error && (
        <div style={{ ...card, background: 'rgba(186,5,23,0.06)', border: '1px solid rgba(186,5,23,0.2)', color: '#BA0517', marginBottom: 16 }}>
          ❌ {error} <button onClick={load} style={{ ...btnG, marginLeft: 12 }}>Retry</button>
        </div>
      )}

      <div style={card}>
        {loading ? (
          <table style={S.table}>
            <thead><tr>{['Role','Urgency','Budget','Status','Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{[1,2,3].map(i => <SkeletonRow key={i} />)}</tbody>
          </table>
        ) : requests.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🙋</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>No requests yet</div>
            <div style={{ fontSize: 12, marginBottom: 20 }}>Submit a staffing request and our team will source candidates for you</div>
            <button onClick={() => setShowForm(true)} style={btnP}>+ Submit First Request</button>
          </div>
        ) : (
          <table style={S.table}>
            <thead><tr>{['Role','Urgency','Budget','Status','Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id || r._id}>
                  <td style={S.td}>
                    <div style={{ fontWeight: 600 }}>{r.roleTitle}</div>
                    {r.requirements && <div style={{ fontSize: 11, color: '#706E6B', marginTop: 2 }}>{r.requirements.slice(0,80)}{r.requirements.length > 80 ? '…' : ''}</div>}
                    {r.adminNotes && <div style={{ fontSize: 11, color: '#0176D3', marginTop: 4 }}>📝 {r.adminNotes}</div>}
                  </td>
                  <td style={S.td}><Badge label={r.urgency} color={S.urgencyColors[r.urgency] || '#706E6B'} /></td>
                  <td style={S.td}>{r.budget || '—'}</td>
                  <td style={S.td}><Badge label={(r.status || 'pending').replace('_', ' ')} color={S.statusColors[r.status] || '#706E6B'} /></td>
                  <td style={S.td}>
                    {r.status === 'pending' && (
                      <button onClick={() => handleCancel(r.id || r._id)} style={btnD}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Request Modal */}
      {showForm && (
        <Modal title="🙋 Submit Staffing Request" onClose={() => { setShowForm(false); setForm(EMPTY_FORM); }} footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} style={btnG}>Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} style={btnP}>{submitting ? 'Submitting…' : 'Submit Request'}</button>
          </div>
        }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Role / Position Title *" value={form.roleTitle} onChange={v => sf('roleTitle', v)} placeholder="e.g. Senior React Developer" />
            <Field label="Requirements" value={form.requirements} onChange={v => sf('requirements', v)} type="textarea" placeholder="Skills needed, experience level, team size…" />
            <div>
              <label style={{ fontSize: 11, color: '#706E6B', fontWeight: 600, display: 'block', marginBottom: 6 }}>URGENCY</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {URGENCY_OPTS.map(u => (
                  <button
                    key={u}
                    onClick={() => sf('urgency', u)}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer', border: form.urgency === u ? `2px solid ${S.urgencyColors[u]}` : '1px solid #EAF5FE', background: form.urgency === u ? `${S.urgencyColors[u]}20` : '#fff', color: form.urgency === u ? S.urgencyColors[u] : '#706E6B', textTransform: 'capitalize' }}
                  >{u}</button>
                ))}
              </div>
            </div>
            <Field label="Budget Range" value={form.budget} onChange={v => sf('budget', v)} placeholder="e.g. ₹8–12 LPA or ₹80/hr" />
          </div>
        </Modal>
      )}
    </div>
  );
}
