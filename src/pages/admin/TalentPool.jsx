import React, { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { card, btnP, btnG, btnD } from '../../constants/styles.js';

const S = {
  poolCard: {
    background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12,
    padding: 20, marginBottom: 16, cursor: 'pointer',
  },
  badge: {
    display: 'inline-block', background: '#EFF6FF', color: '#2563EB',
    borderRadius: 20, padding: '2px 10px', fontSize: 12, marginRight: 6, marginBottom: 4,
  },
  memberRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 0', borderBottom: '1px solid #F1F5F9',
  },
  avatar: {
    width: 36, height: 36, borderRadius: '50%', background: '#E0E7FF',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 700, color: '#4F46E5', flexShrink: 0,
  },
};

function PoolModal({ pool, onClose, onSaved }) {
  const [form, setForm] = useState({ name: pool?.name || '', description: pool?.description || '', tagsStr: (pool?.tags || []).join(', ') });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const tags = form.tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    const data = { name: form.name.trim(), description: form.description, tags };
    const result = pool?._id ? await api.updateTalentPool(pool._id, data) : await api.createTalentPool(data);
    onSaved(result);
  };
  const iS = { width: '100%', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px', fontSize: 14, marginTop: 6, boxSizing: 'border-box' };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>{pool?._id ? 'Edit Pool' : 'Create Talent Pool'}</h3>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Pool Name *</label>
        <input value={form.name} onChange={set('name')} placeholder="e.g. Senior Engineers" style={iS} />
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginTop: 14 }}>Description</label>
        <textarea value={form.description} onChange={set('description')} rows={3} style={{ ...iS, resize: 'vertical' }} />
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginTop: 14 }}>Tags (comma-separated)</label>
        <input value={form.tagsStr} onChange={set('tagsStr')} placeholder="e.g. React, Node, Senior" style={iS} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={btnG}>Cancel</button>
          <button onClick={save} disabled={saving || !form.name.trim()} style={btnP}>{saving ? 'Saving…' : 'Save Pool'}</button>
        </div>
      </div>
    </div>
  );
}

function AddMemberModal({ pool, onClose, onAdded }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [adding, setAdding] = useState(null);
  const [notes, setNotes] = useState('');
  const search = async () => {
    if (!q.trim()) return;
    try {
      const r = await api.getCandidates({ search: q, limit: 10 });
      setResults(r?.candidates || r?.data || []);
    } catch { setResults([]); }
  };
  const add = async (cand) => {
    setAdding(cand._id);
    await api.addTalentPoolMember(pool._id, { candidateId: cand._id, notes });
    onAdded();
  };
  const iS = { width: '100%', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' };
  const existing = new Set((pool.members || []).map(m => String(m.candidateId?._id || m.candidateId)));
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Add Candidate to "{pool.name}"</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} placeholder="Search by name or email" style={{ ...iS, flex: 1 }} />
          <button onClick={search} style={btnP}>Search</button>
        </div>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" style={{ ...iS, marginBottom: 12 }} />
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {results.map(c => {
            const inPool = existing.has(String(c._id));
            return (
              <div key={c._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name || c.email?.split('@')[0] || '—'}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{c.email}</div>
                </div>
                {inPool
                  ? <span style={{ fontSize: 12, color: '#9CA3AF' }}>Already in pool</span>
                  : <button onClick={() => add(c)} disabled={adding === c._id} style={btnP}>{adding === c._id ? 'Adding…' : 'Add'}</button>
                }
              </div>
            );
          })}
          {results.length === 0 && <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: 20 }}>Search for candidates above</div>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose} style={btnG}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function TalentPool() {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPool, setEditingPool] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await api.getTalentPools();
    setPools(data || []);
    if (selected) {
      const fresh = (data || []).find(p => p._id === selected._id);
      if (fresh) setSelected(fresh);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSaved = (pool) => { setShowModal(false); setEditingPool(null); load(); };
  const handleDelete = async (poolId) => {
    if (!confirm('Delete this talent pool?')) return;
    await api.deleteTalentPool(poolId);
    if (selected?._id === poolId) setSelected(null);
    load();
  };
  const handleRemoveMember = async (poolId, candId) => {
    await api.removeTalentPoolMember(poolId, candId);
    load();
  };

  const initials = (c) => { const n = c?.name || c?.email || '?'; return n[0].toUpperCase(); };

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A1628', margin: 0 }}>Talent Pool</h1>
          <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>Curate candidate groups for future opportunities</p>
        </div>
        <button onClick={() => { setEditingPool(null); setShowModal(true); }} style={btnP}>+ New Pool</button>
      </div>

      <div className={selected ? 'tn-talent-pool-split' : 'tn-talent-pool-full'}>
        {/* Pool list */}
        <div>
          {loading ? (
            <div style={{ color: '#9CA3AF', padding: 40, textAlign: 'center' }}>Loading…</div>
          ) : pools.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏊</div>
              <div style={{ fontWeight: 700, color: '#374151', marginBottom: 6 }}>No talent pools yet</div>
              <div style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 20 }}>Create a pool to group candidates for future roles</div>
              <button onClick={() => setShowModal(true)} style={btnP}>Create First Pool</button>
            </div>
          ) : (
            pools.map(pool => (
              <div key={pool._id} onClick={() => setSelected(p => p?._id === pool._id ? null : pool)} style={{ ...S.poolCard, borderColor: selected?._id === pool._id ? '#4F46E5' : '#E2E8F0', boxShadow: selected?._id === pool._id ? '0 0 0 2px #C7D2FE' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#0A1628', marginBottom: 4 }}>{pool.name}</div>
                    {pool.description && <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>{pool.description}</div>}
                    <div style={{ marginBottom: 8 }}>{(pool.tags || []).map(t => <span key={t} style={S.badge}>{t}</span>)}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>{pool.members?.length || 0} candidate{pool.members?.length !== 1 ? 's' : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginLeft: 12 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setEditingPool(pool); setShowModal(true); }} style={{ ...btnG, padding: '4px 10px', fontSize: 12 }}>Edit</button>
                    <button onClick={() => handleDelete(pool._id)} style={{ ...btnD, padding: '4px 10px', fontSize: 12 }}>Delete</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pool detail */}
        {selected && (
          <div style={{ ...card, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0A1628' }}>{selected.name}</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowAddMember(true)} style={btnP}>+ Add Candidate</button>
                <button onClick={() => setSelected(null)} style={btnG}>Close</button>
              </div>
            </div>
            {selected.description && <p style={{ color: '#6B7280', fontSize: 14, margin: '0 0 16px' }}>{selected.description}</p>}
            {(selected.members || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
                No candidates yet — click "+ Add Candidate"
              </div>
            ) : (
              (selected.members || []).map(m => {
                const c = m.candidateId;
                if (!c) return null;
                return (
                  <div key={String(c._id || c)} style={S.memberRow}>
                    <div style={S.avatar}>{initials(c)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#0A1628' }}>{c.name || c.email?.split('@')[0] || '—'}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{c.email}{c.currentRole ? ` · ${c.currentRole}` : ''}</div>
                      {m.notes && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>📝 {m.notes}</div>}
                    </div>
                    <button onClick={() => handleRemoveMember(selected._id, String(c._id || c))} style={{ ...btnD, padding: '4px 10px', fontSize: 12 }}>Remove</button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {showModal && (
        <PoolModal
          pool={editingPool}
          onClose={() => { setShowModal(false); setEditingPool(null); }}
          onSaved={handleSaved}
        />
      )}

      {showAddMember && selected && (
        <AddMemberModal
          pool={selected}
          onClose={() => setShowAddMember(false)}
          onAdded={() => { setShowAddMember(false); load(); }}
        />
      )}
    </div>
  );
}
