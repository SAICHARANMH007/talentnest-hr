import { useState, useEffect } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Field from '../../components/ui/Field.jsx';
import { btnP, btnG, btnD, card, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';

// ── Styles outside component ───────────────────────────────────────────────────
const S = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  clientCard: { background: '#fff', border: '1px solid #EAF5FE', borderRadius: 14, padding: '18px 20px', cursor: 'pointer', transition: 'box-shadow 0.15s' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', borderBottom: '2px solid #F3F2F2' },
  td: { padding: '12px 14px', fontSize: 13, color: '#181818', borderBottom: '1px solid #F3F2F2' },
  empty: { textAlign: 'center', padding: '60px 24px', color: '#706E6B', fontSize: 14 },
};

const EMPTY_FORM = { companyName: '', contactPerson: '', email: '', phone: '', industry: '' };

function SkeletonCard() {
  return (
    <div style={{ ...S.clientCard, cursor: 'default' }}>
      <div className="tn-skeleton" style={{ height: 18, width: '60%', borderRadius: 8, marginBottom: 10 }} />
      <div className="tn-skeleton" style={{ height: 13, width: '80%', borderRadius: 6, marginBottom: 6 }} />
      <div className="tn-skeleton" style={{ height: 13, width: '50%', borderRadius: 6 }} />
    </div>
  );
}

export default function AdminClients({ user }) {
  const [clients,  setClients]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [toast,    setToast]    = useState('');
  const [search,   setSearch]   = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null); // client to edit
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);

  const load = () => {
    setLoading(true); setError('');
    const qs = search ? `search=${encodeURIComponent(search)}` : '';
    api.getClients(qs)
      .then(r => setClients(Array.isArray(r) ? r : (r?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (c) => { setEditing(c); setForm({ companyName: c.companyName || '', contactPerson: c.contactPerson || '', email: c.email || '', phone: c.phone || '', industry: c.industry || '' }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.companyName.trim()) { setToast('❌ Company name is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.updateClient(editing.id || editing._id, form);
        setToast('✅ Client updated');
      } else {
        await api.createClient(form);
        setToast('✅ Client added');
      }
      setShowForm(false);
      load();
    } catch (e) {
      setToast(`❌ ${e.message}`);
    }
    setSaving(false);
  };

  const handleDeactivate = async (id) => {
    try {
      await api.deleteClient(id);
      setToast('✅ Client deactivated');
      load();
    } catch (e) {
      setToast(`❌ ${e.message}`);
    }
  };

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      <PageHeader title="🏢 Client Companies" subtitle="Manage client accounts for placement tracking" action={
        <button onClick={openNew} style={btnP}>+ Add Client</button>
      } />

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…" style={{ ...inp, width: 260 }} onKeyDown={e => e.key === 'Enter' && load()} />
        <button onClick={load} style={btnG}>🔍 Search</button>
      </div>

      {error && (
        <div style={{ background: 'rgba(186,5,23,0.06)', border: '1px solid rgba(186,5,23,0.2)', color: '#BA0517', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          ❌ {error} <button onClick={load} style={{ ...btnG, marginLeft: 12 }}>Retry</button>
        </div>
      )}

      {loading ? (
        <div style={S.grid}>{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>
      ) : clients.length === 0 ? (
        <div style={{ ...card, ...S.empty }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>No clients yet</div>
          <div style={{ fontSize: 12, marginBottom: 20 }}>Add your client companies to track placements</div>
          <button onClick={openNew} style={btnP}>+ Add First Client</button>
        </div>
      ) : (
        <div style={S.grid}>
          {clients.map(c => (
            <div
              key={c.id || c._id}
              style={{ ...S.clientCard, opacity: c.isActive === false ? 0.6 : 1 }}
              onMouseEnter={e => e.currentTarget.style.boxShadow='0 6px 20px rgba(1,118,211,0.12)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow=''}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#181818' }}>{c.companyName}</div>
                  {c.industry && <div style={{ fontSize: 11, color: '#706E6B', marginTop: 2 }}>{c.industry}</div>}
                </div>
                {c.isActive === false && <Badge label="Inactive" color="#706E6B" />}
              </div>
              {c.contactPerson && <div style={{ fontSize: 12, color: '#3E3E3C', marginBottom: 2 }}>👤 {c.contactPerson}</div>}
              {c.email && <div style={{ fontSize: 12, color: '#3E3E3C', marginBottom: 2 }}>✉ {c.email}</div>}
              {c.phone && <div style={{ fontSize: 12, color: '#3E3E3C', marginBottom: 10 }}>📞 {c.phone}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #F3F2F2' }}>
                <button onClick={() => openEdit(c)} style={{ ...btnG, flex: 1, fontSize: 12 }}>Edit</button>
                {c.isActive !== false && (
                  <button onClick={() => handleDeactivate(c.id || c._id)} style={{ ...btnD, fontSize: 12 }}>Deactivate</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <Modal title={editing ? '✏️ Edit Client' : '🏢 Add Client'} onClose={() => setShowForm(false)} footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={btnG}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={btnP}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Client'}</button>
          </div>
        }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Company Name *" value={form.companyName} onChange={v => sf('companyName', v)} />
            <Field label="Industry" value={form.industry} onChange={v => sf('industry', v)} placeholder="e.g. IT Services, Banking" />
            <Field label="Contact Person" value={form.contactPerson} onChange={v => sf('contactPerson', v)} />
            <Field label="Email" value={form.email} onChange={v => sf('email', v)} type="email" />
            <Field label="Phone" value={form.phone} onChange={v => sf('phone', v)} />
          </div>
        </Modal>
      )}
    </div>
  );
}
