import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Field from '../../components/ui/Field.jsx';
import { btnP, btnG, card, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';

// ── Styles outside component ───────────────────────────────────────────────────
const S = {
  row: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #F3F2F2' },
  td: { padding: '12px 14px', fontSize: 13, color: '#181818', borderBottom: '1px solid #F3F2F2', verticalAlign: 'top' },
  empty: { textAlign: 'center', padding: '60px 24px', color: '#706E6B', fontSize: 14 },
  urgency: { critical: '#BA0517', high: '#F59E0B', medium: '#0176D3', low: '#34d399' },
};

const STATUS_COLORS = { pending: '#F59E0B', in_progress: '#0176D3', fulfilled: '#34d399', cancelled: '#706E6B' };

const STATUS_OPTS  = ['pending', 'in_progress', 'fulfilled', 'cancelled'];

function SkeletonRow() {
  return (
    <tr>
      {[1,2,3,4,5,6].map(i => (
        <td key={i} style={S.td}>
          <div className="tn-skeleton" style={{ height: 16, borderRadius: 6, width: i === 2 ? '70%' : '85%' }} />
        </td>
      ))}
    </tr>
  );
}

export default function SuperAdminCandidateRequests() {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [toast,    setToast]    = useState('');
  const [filter,   setFilter]   = useState('');  // status filter
  const [selected, setSelected] = useState(null); // detail/edit modal
  const [saving,   setSaving]   = useState(false);
  const [notes,    setNotes]    = useState('');
  const [charge,   setCharge]   = useState('');
  const [newStatus,setNewStatus]= useState('');
  const [candidates, setCandidates] = useState([]);
  const [assignedIds, setAssignedIds] = useState([]);
  const [candSearch, setCandSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    const qs = filter ? `status=${filter}` : '';
    api.getCandidateRequests(qs)
      .then(r => setRequests(Array.isArray(r) ? r : (r?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openDetail = (req) => {
    setSelected(req);
    setNotes(req.adminNotes || '');
    setCharge(req.chargeAmount || '');
    setNewStatus(req.status);
    setCandSearch('');
    const existing = (req.submittedCandidates || []).map(c => String(c._id || c));
    setAssignedIds(existing);
    api.getUsers({ role: 'candidate', limit: 200 })
      .then(r => setCandidates(Array.isArray(r) ? r : (r?.data || [])))
      .catch(() => setCandidates([]));
  };

  const handleUpdate = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.updateCandidateRequest(selected.id, {
        status: newStatus,
        adminNotes: notes,
        chargeAmount: charge ? Number(charge) : undefined,
        submittedCandidates: assignedIds,
      });
      setToast('✅ Request updated');
      setSelected(null);
      load();
    } catch (e) {
      setToast(`❌ ${e.message}`);
    }
    setSaving(false);
  };

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      <PageHeader title="🙋 Candidate Requests" subtitle="Emergency staffing requests from all tenants" />

      {/* Filters */}
      <div style={S.row}>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ ...inp, width: 180 }}>
          <option value="">All Statuses</option>
          {STATUS_OPTS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <button onClick={load} style={btnG}>↻ Refresh</button>
      </div>

      {error && (
        <div style={{ ...card, background: 'rgba(186,5,23,0.06)', border: '1px solid rgba(186,5,23,0.2)', color: '#BA0517', marginBottom: 16 }}>
          ❌ {error} <button onClick={load} style={{ ...btnG, marginLeft: 12 }}>Retry</button>
        </div>
      )}

      <div style={card}>
        {loading ? (
          <table style={S.table}>
            <thead><tr>
              {['Tenant','Role','Urgency','Budget','Status','Actions'].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}</tbody>
          </table>
        ) : requests.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>No requests found</div>
            <div style={{ fontSize: 12 }}>Candidate requests from tenants will appear here</div>
          </div>
        ) : (
          <table style={S.table}>
            <thead><tr>
              {['Tenant','Role','Urgency','Budget','Status','Actions'].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id || r._id} style={{ cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background='#FAFAF9'} onMouseLeave={e => e.currentTarget.style.background=''}>
                  <td style={S.td}><div style={{ fontWeight: 600 }}>{r.tenantId?.name || r.tenantId || '—'}</div><div style={{ fontSize: 11, color: '#706E6B' }}>{r.requestedBy?.email || ''}</div></td>
                  <td style={S.td}><div style={{ fontWeight: 600 }}>{r.roleTitle}</div><div style={{ fontSize: 11, color: '#706E6B', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.requirements}</div></td>
                  <td style={S.td}><Badge label={r.urgency || 'medium'} color={S.urgency[r.urgency] || '#0176D3'} /></td>
                  <td style={S.td}>{r.budget || '—'}</td>
                  <td style={S.td}><Badge label={(r.status || 'pending').replace('_', ' ')} color={STATUS_COLORS[r.status] || '#706E6B'} /></td>
                  <td style={S.td}>
                    <button onClick={() => openDetail(r)} style={btnG}>Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail / Manage Modal */}
      {selected && (
        <Modal title={`📋 ${selected.roleTitle}`} onClose={() => setSelected(null)} footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setSelected(null)} style={btnG}>Cancel</button>
            <button onClick={handleUpdate} disabled={saving} style={btnP}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12 }}>
              <div><label style={{ fontSize: 11, color: '#706E6B', fontWeight: 600, display: 'block', marginBottom: 6 }}>TENANT</label><div style={{ fontWeight: 600 }}>{selected.tenantId?.name || '—'}</div></div>
              <div><label style={{ fontSize: 11, color: '#706E6B', fontWeight: 600, display: 'block', marginBottom: 6 }}>SUBMITTED BY</label><div>{selected.requestedBy?.name || selected.requestedBy?.email || '—'}</div></div>
              <div><label style={{ fontSize: 11, color: '#706E6B', fontWeight: 600, display: 'block', marginBottom: 6 }}>URGENCY</label><Badge label={selected.urgency} color={S.urgency[selected.urgency]} /></div>
              <div><label style={{ fontSize: 11, color: '#706E6B', fontWeight: 600, display: 'block', marginBottom: 6 }}>BUDGET</label><div>{selected.budget || '—'}</div></div>
            </div>
            {selected.requirements && (
              <div><label style={{ fontSize: 11, color: '#706E6B', fontWeight: 600, display: 'block', marginBottom: 6 }}>REQUIREMENTS</label><div style={{ fontSize: 13, color: '#3E3E3C' }}>{selected.requirements}</div></div>
            )}
            {/* Assign Candidates */}
            <div>
              <label style={{ fontSize: 11, color: '#706E6B', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                ASSIGN CANDIDATES <span style={{ color: '#0176D3' }}>({assignedIds.length} selected)</span>
              </label>
              <input
                value={candSearch} onChange={e => setCandSearch(e.target.value)}
                placeholder="Search candidates…"
                style={{ ...inp, marginBottom: 8 }}
              />
              <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 8 }}>
                {candidates
                  .filter(c => {
                    if (!candSearch) return true;
                    const q = candSearch.toLowerCase();
                    return (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
                  })
                  .map(c => {
                    const cid = String(c._id || c.id);
                    const checked = assignedIds.includes(cid);
                    return (
                      <div
                        key={cid}
                        onClick={() => setAssignedIds(prev => checked ? prev.filter(x => x !== cid) : [...prev, cid])}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', background: checked ? '#EFF6FF' : 'transparent', borderBottom: '1px solid #F3F2F2' }}
                      >
                        <input type="checkbox" readOnly checked={checked} style={{ accentColor: '#0176D3' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name || '—'}</div>
                          <div style={{ fontSize: 11, color: '#706E6B' }}>{c.email}{c.title ? ` · ${c.title}` : ''}</div>
                        </div>
                      </div>
                    );
                  })}
                {candidates.length === 0 && <div style={{ padding: 16, color: '#9E9D9B', fontSize: 13, textAlign: 'center' }}>Loading candidates…</div>}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, color: '#706E6B', fontWeight: 600, display: 'block', marginBottom: 6 }}>STATUS</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={inp}>
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <Field label="Charge Amount (₹)" value={String(charge)} onChange={setCharge} type="number" placeholder="0" />
            <Field label="Admin Notes" value={notes} onChange={setNotes} type="textarea" placeholder="Notes for the tenant…" />
          </div>
        </Modal>
      )}
    </div>
  );
}
