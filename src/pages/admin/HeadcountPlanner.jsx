import React, { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { card, btnP, btnG, btnD } from '../../constants/styles.js';

const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const PRIORITY_COLORS = { critical: '#DC2626', high: '#D97706', medium: '#0176D3', low: '#6B7280' };
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'];
const STATUSES = ['draft', 'active', 'closed'];
const CURRENT_YEAR = new Date().getFullYear();

const EMPTY_ENTRY = { department: '', role: '', currentCount: 0, targetCount: 1, priority: 'medium', targetDate: '', notes: '' };

function PlanModal({ plan, onSave, onClose }) {
  const [name, setName]       = useState(plan?.name || '');
  const [year, setYear]       = useState(plan?.year || CURRENT_YEAR);
  const [quarter, setQuarter] = useState(plan?.quarter || 'Annual');
  const [status, setStatus]   = useState(plan?.status || 'draft');
  const [entries, setEntries] = useState(plan?.entries?.map(e => ({ ...e, targetDate: e.targetDate ? e.targetDate.split('T')[0] : '' })) || [{ ...EMPTY_ENTRY }]);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const addEntry = () => setEntries(e => [...e, { ...EMPTY_ENTRY }]);
  const removeEntry = (i) => setEntries(e => e.filter((_, idx) => idx !== i));
  const setEntry = (i, k, v) => setEntries(e => e.map((en, idx) => idx === i ? { ...en, [k]: v } : en));

  const handleSave = async () => {
    if (!name) { setErr('Plan name is required.'); return; }
    setSaving(true);
    try {
      await onSave({ name, year: Number(year), quarter, status, entries });
      onClose();
    } catch (e) { setErr(e?.message || 'Save failed.'); setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 800, padding: 28, margin: 'auto' }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: '#0A1628', marginBottom: 20 }}>
          {plan?._id ? 'Edit Headcount Plan' : 'New Headcount Plan'}
        </div>
        {err && <div style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>{err}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ gridColumn: '1 / 3' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Plan Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 2026 Q3 Hiring Plan" style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Year</label>
            <input type="number" value={year} onChange={e => setYear(e.target.value)} min={2020} max={2035} style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Period</label>
            <select value={quarter} onChange={e => setQuarter(e.target.value)} style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px', fontSize: 14 }}>
              {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Roles to Hire</label>
            <button onClick={addEntry} style={{ ...btnG, fontSize: 12, padding: '4px 12px' }}>+ Add Role</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Department', 'Role', 'Current', 'Target', 'Priority', 'Target Date', ''].map(h => (
                    <th key={h} style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'left', borderBottom: '1px solid #E5E7EB', color: '#374151', fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={i}>
                    <td style={{ padding: '6px 4px' }}><input value={e.department} onChange={ev => setEntry(i, 'department', ev.target.value)} placeholder="Engineering" style={{ width: 110, border: '1px solid #E2E8F0', borderRadius: 6, padding: '5px 8px', fontSize: 12 }} /></td>
                    <td style={{ padding: '6px 4px' }}><input value={e.role} onChange={ev => setEntry(i, 'role', ev.target.value)} placeholder="Senior SWE" style={{ width: 130, border: '1px solid #E2E8F0', borderRadius: 6, padding: '5px 8px', fontSize: 12 }} /></td>
                    <td style={{ padding: '6px 4px' }}><input type="number" value={e.currentCount} onChange={ev => setEntry(i, 'currentCount', Number(ev.target.value))} min={0} style={{ width: 55, border: '1px solid #E2E8F0', borderRadius: 6, padding: '5px 8px', fontSize: 12 }} /></td>
                    <td style={{ padding: '6px 4px' }}><input type="number" value={e.targetCount} onChange={ev => setEntry(i, 'targetCount', Number(ev.target.value))} min={1} style={{ width: 55, border: '1px solid #E2E8F0', borderRadius: 6, padding: '5px 8px', fontSize: 12 }} /></td>
                    <td style={{ padding: '6px 4px' }}>
                      <select value={e.priority} onChange={ev => setEntry(i, 'priority', ev.target.value)} style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: '5px 8px', fontSize: 12, color: PRIORITY_COLORS[e.priority] }}>
                        {PRIORITIES.map(p => <option key={p} value={p} style={{ color: PRIORITY_COLORS[p] }}>{p}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '6px 4px' }}><input type="date" value={e.targetDate} onChange={ev => setEntry(i, 'targetDate', ev.target.value)} style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: '5px 8px', fontSize: 12 }} /></td>
                    <td style={{ padding: '6px 4px' }}><button onClick={() => removeEntry(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 16 }}>×</button></td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: '#9CA3AF', fontSize: 13 }}>No roles added yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={handleSave} disabled={saving} style={{ ...btnP, flex: 1 }}>{saving ? 'Saving…' : 'Save Plan'}</button>
          <button onClick={onClose} style={{ ...btnG }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ plan, onEdit, onDelete }) {
  const gap = plan.entries.reduce((s, e) => s + Math.max(0, e.targetCount - e.currentCount), 0);
  const filled = plan.entries.reduce((s, e) => s + (e.filled || 0), 0);
  const totalTarget = plan.entries.reduce((s, e) => s + e.targetCount, 0);
  const pct = totalTarget > 0 ? Math.round((filled / totalTarget) * 100) : 0;
  const statusColor = { draft: '#6B7280', active: '#059669', closed: '#DC2626' }[plan.status];

  return (
    <div style={{ ...card, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#0A1628' }}>{plan.name}</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>{plan.year} · {plan.quarter}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ background: `${statusColor}15`, color: statusColor, borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>{plan.status}</span>
          <button onClick={onEdit} style={{ ...btnG, fontSize: 12, padding: '5px 12px' }}>Edit</button>
          <button onClick={onDelete} style={{ ...btnD, fontSize: 12, padding: '5px 12px' }}>Delete</button>
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#374151', marginBottom: 4 }}>
          <span>Progress: {filled}/{totalTarget} filled</span>
          <span style={{ fontWeight: 700 }}>{pct}%</span>
        </div>
        <div style={{ height: 6, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: '#059669', borderRadius: 4 }} />
        </div>
      </div>

      {/* Entries summary */}
      {plan.entries.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Department', 'Role', 'Gap', 'Priority', 'Target Date'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', fontWeight: 700, textAlign: 'left', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plan.entries.map((e, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '8px 10px', color: '#374151' }}>{e.department || '—'}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>{e.role || '—'}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>
                      +{Math.max(0, e.targetCount - e.currentCount)}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ color: PRIORITY_COLORS[e.priority] || '#6B7280', fontWeight: 700, textTransform: 'capitalize', fontSize: 11 }}>{e.priority}</span>
                  </td>
                  <td style={{ padding: '8px 10px', color: '#6B7280' }}>{e.targetDate ? new Date(e.targetDate).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function HeadcountPlanner() {
  const [plans, setPlans]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg]         = useState('');

  const load = () => {
    setLoading(true);
    api.getHeadcountPlans()
      .then(data => setPlans(data))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSave = async (form) => {
    if (editing?._id) await api.updateHeadcountPlan(editing._id, form);
    else await api.createHeadcountPlan(form);
    load();
    setMsg('Plan saved.');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this plan?')) return;
    try { await api.deleteHeadcountPlan(id); load(); setMsg('Deleted.'); }
    catch (e) { setMsg(e?.message || 'Delete failed.'); }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A1628', margin: 0 }}>Headcount Planner</h1>
          <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>Plan and track hiring targets by department and role</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }} style={{ ...btnP }}>+ New Plan</button>
      </div>

      {msg && (
        <div style={{ background: '#D1FAE5', color: '#065F46', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
          {msg}
          <button onClick={() => setMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'inherit' }}>×</button>
        </div>
      )}

      {loading ? (
        <div style={{ color: '#9CA3AF', textAlign: 'center', padding: 64 }}>Loading…</div>
      ) : plans.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 64 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#0A1628', marginBottom: 6 }}>No headcount plans yet</div>
          <div style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>Create your first hiring plan.</div>
          <button onClick={() => { setEditing(null); setShowModal(true); }} style={{ ...btnP }}>+ New Plan</button>
        </div>
      ) : (
        plans.map(plan => (
          <PlanCard key={plan._id} plan={plan} onEdit={() => { setEditing(plan); setShowModal(true); }} onDelete={() => handleDelete(plan._id)} />
        ))
      )}

      {showModal && (
        <PlanModal plan={editing} onSave={handleSave} onClose={() => { setShowModal(false); setEditing(null); }} />
      )}
    </div>
  );
}
