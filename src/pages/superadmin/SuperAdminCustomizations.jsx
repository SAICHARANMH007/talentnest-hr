import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/api.js';
import Spinner from '../../components/ui/Spinner.jsx';
import Toggle from '../../components/ui/Toggle.jsx';
import Toast from '../../components/ui/Toast.jsx';

// ── System Definitions ────────────────────────────────────────────────────────
const SYSTEM_FIELDS = {
  candidate: [
    { id: 'name', label: 'Full Name', type: 'text', required: true, isSystem: true, key: 'name' },
    { id: 'email', label: 'Email Address', type: 'email', required: true, isSystem: true, key: 'email' },
    { id: 'phone', label: 'Phone Number', type: 'tel', required: false, isSystem: true, key: 'phone' },
    { id: 'location', label: 'Location', type: 'text', required: false, isSystem: true, key: 'location' },
    { id: 'title', label: 'Professional Title', type: 'text', required: false, isSystem: true, key: 'title' },
    { id: 'skills', label: 'Skills', type: 'tags', required: false, isSystem: true, key: 'skills' },
    { id: 'experience', label: 'Experience (Years)', type: 'number', required: false, isSystem: true, key: 'experience' },
    { id: 'resume', label: 'Resume / CV', type: 'file', required: true, isSystem: true, key: 'resume' },
  ],
  job: [
    { id: 'title', label: 'Job Title', type: 'text', required: true, isSystem: true, key: 'title' },
    { id: 'department', label: 'Department', type: 'select', required: true, isSystem: true, key: 'department' },
    { id: 'location', label: 'Job Location', type: 'text', required: true, isSystem: true, key: 'location' },
    { id: 'salary', label: 'Salary Range', type: 'text', required: false, isSystem: true, key: 'salary' },
    { id: 'description', label: 'Job Description', type: 'rich-text', required: true, isSystem: true, key: 'description' },
  ],
  application: [
    { id: 'source', label: 'Application Source', type: 'select', required: false, isSystem: true, key: 'source' },
    { id: 'recruiter_name', label: 'Assigned Recruiter', type: 'text', required: false, isSystem: true, key: 'recruiter_name' },
    { id: 'applied_at', label: 'Date Applied', type: 'date', required: true, isSystem: true, key: 'createdAt' },
  ]
};

const AUTOMATION_TRIGGERS = {
  stage_changed: 'Stage Changed',
  candidate_applied: 'New Application',
  interview_scheduled: 'Interview Scheduled',
  assessment_completed: 'Assessment Done',
  offer_not_signed: 'Offer Stale',
  candidate_stuck: 'Candidate Inactive'
};

const AUTOMATION_ACTIONS = {
  send_email: '📧 Send Email',
  send_whatsapp: '💬 WhatsApp',
  move_stage: '🔄 Move Stage',
  notify_admin: '🔔 Admin Alert',
  notify_recruiter: '👤 Recruiter Alert'
};

// ─── Shared Styles ────────────────────────────────────────────────────────────
const S = {
  inp:   { width: '100%', padding: '9px 12px', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  label: { fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 5 },
  btn:   { background: '#0176D3', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, padding: '9px 18px', cursor: 'pointer' },
  btnG:  { background: 'rgba(1,118,211,0.08)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, color: '#0176D3', fontWeight: 600, fontSize: 12, padding: '7px 14px', cursor: 'pointer' },
  btnR:  { background: 'rgba(186,5,23,0.07)', border: '1px solid rgba(186,5,23,0.2)', borderRadius: 8, color: '#BA0517', fontWeight: 600, fontSize: 12, padding: '7px 12px', cursor: 'pointer' },
  card:  { background: '#fff', border: '1px solid rgba(1,118,211,0.12)', borderRadius: 16, padding: 24, marginBottom: 16 },
  chip:  (color) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, background: color + '22', border: `1px solid ${color}44`, borderRadius: 20, padding: '3px 10px', fontSize: 11, color, fontWeight: 700 }),
};

function SectionHeader({ icon, title, desc, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
      <div>
        <h2 style={{ color: '#181818', fontSize: 18, fontWeight: 800, margin: 0 }}>{icon} {title}</h2>
        <p style={{ color: '#706E6B', fontSize: 13, margin: '4px 0 0' }}>{desc}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ icon, msg }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 24px', color: '#9E9D9B' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{msg}</div>
    </div>
  );
}

// ─── Hook: use customizations data ────────────────────────────────────────────
function useCustomizations() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getCustomizations();
      setData(r?.data || null);
    } catch (e) { setToast('❌ ' + e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addItem = async (section, item) => {
    try {
      const r = await api.addCustomizationItem(section, item);
      setData(prev => ({ ...prev, [section]: [...(prev?.[section] || []), r?.data || item] }));
      setToast('✅ Added.');
      return r?.data;
    } catch (e) { setToast('❌ ' + e.message); }
  };

  const updateItem = async (section, id, patch) => {
    try {
      await api.updateCustomizationItem(section, id, patch);
      setData(prev => ({ ...prev, [section]: prev[section].map(x => x._id === id ? { ...x, ...patch } : x) }));
      setToast('✅ Updated.');
    } catch (e) { setToast('❌ ' + e.message); }
  };

  const deleteItem = async (section, id) => {
    try {
      await api.deleteCustomizationItem(section, id);
      setData(prev => ({ ...prev, [section]: prev[section].filter(x => x._id !== id) }));
      setToast('🗑️ Removed.');
    } catch (e) { setToast('❌ ' + e.message); }
  };

  const updateSingleton = async (patch) => {
    try {
      const r = await api.updateCustomizationsSingleton(patch);
      setData(prev => {
        const next = { ...prev };
        Object.keys(patch).forEach(k => { next[k] = { ...(prev[k] || {}), ...patch[k] }; });
        return next;
      });
      setToast('✅ Saved.');
      return r;
    } catch (e) { setToast('❌ ' + e.message); }
  };

  const replaceSection = async (section, items) => {
    try {
      await api.replaceCustomizationSection(section, items);
      setData(prev => ({ ...prev, [section]: items }));
      setToast('✅ Saved.');
    } catch (e) { setToast('❌ ' + e.message); }
  };

  return { data, loading, toast, setToast, addItem, updateItem, deleteItem, updateSingleton, replaceSection };
}

// ─── 1. Custom Fields Tab (wraps existing API) ────────────────────────────────
const FIELD_TYPES = [
  { value: 'text', label: 'Short Text' }, { value: 'textarea', label: 'Long Text' },
  { value: 'number', label: 'Number' }, { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' }, { value: 'multiselect', label: 'Multi-select' },
  { value: 'checkbox', label: 'Checkbox' }, { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' }, { value: 'phone', label: 'Phone' },
  { value: 'rating', label: 'Star Rating' }, { value: 'file', label: 'File Upload' },
];
const TYPE_ICONS = { text:'📝', textarea:'📄', number:'🔢', date:'📅', select:'🔽', multiselect:'☑️', checkbox:'✅', url:'🔗', email:'✉️', phone:'📞', rating:'⭐', file:'📎' };
const ENTITIES = [
  { value: 'candidate', label: '👤 Candidate', icon: '👤' },
  { value: 'job',       label: '💼 Job Posting', icon: '💼' },
  { value: 'application',label: '📋 Application', icon: '📋' },
  { value: 'interview', label: '📅 Interview', icon: '📅' },
];
const EMPTY_CF = { label: '', entity: 'candidate', fieldType: 'text', placeholder: '', helpText: '', options: '', isRequired: false, section: '' };

function CustomFieldsTab({ data, updateSingleton, setToast }) {
  const [fields, setFields]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [entity, setEntity]     = useState('candidate');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY_CF);
  const [saving, setSaving]     = useState(false);

  // Field Visibility Map from singleton
  const visibility = data?.fieldVisibility || {};

  const toggleVisibility = async (key, current) => {
    try {
      await updateSingleton('fieldVisibility', { ...visibility, [key]: !current });
    } catch (e) { setToast('❌ Update failed'); }
  };

  const load = async () => {
    setLoading(true);
    try { const r = await api.getCustomFields(); setFields(Array.isArray(r?.data) ? r.data : []); }
    catch { setFields([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const openNew = () => { setEditing(null); setForm(EMPTY_CF); setShowForm(true); };
  const openEdit = (f) => { setEditing(f); setForm({ ...f, options: Array.isArray(f.options) ? f.options.join('\n') : '' }); setShowForm(true); };

  const save = async () => {
    setSaving(true);
    try {
      const options = form.options ? form.options.split('\n').map(s => s.trim()).filter(Boolean) : [];
      const payload = { ...form, options };
      if (editing) {
        const r = await api.updateCustomField(editing.id || editing._id, payload);
        setFields(prev => prev.map(f => f._id === editing._id ? (r?.data || r) : f));
        setToast('✅ Field updated.');
      } else {
        const r = await api.createCustomField(payload);
        setFields(prev => [...prev, r?.data || r]);
        setToast('✅ Field created.');
      }
      setShowForm(false);
    } catch (e) { setToast('❌ ' + e.message); }
    setSaving(false);
  };

  const toggle = async (f) => {
    try {
      const r = await api.updateCustomField(f.id || f._id, { isActive: !f.isActive });
      setFields(prev => prev.map(x => x._id === f._id ? (r?.data || r) : x));
    } catch (e) { setToast('❌ ' + e.message); }
  };

  const del = async (f) => {
    if (!confirm(`Delete "${f.label}"?`)) return;
    try { await api.deleteCustomField(f.id || f._id); setFields(prev => prev.filter(x => x._id !== f._id)); setToast('🗑️ Deleted.'); }
    catch (e) { setToast('❌ ' + e.message); }
  };

  const byEntity = fields.filter(f => f.entity === entity);
  const needsOptions = ['select', 'multiselect'].includes(form.fieldType);

  return (
    <div>
      <SectionHeader icon="🧩" title="Custom Fields"
        desc="Add extra fields to candidate, job, application, and interview forms"
        action={!showForm && <button onClick={openNew} style={S.btn}>+ New Field</button>}
      />
      {showForm && (
        <div style={{ background: 'rgba(1,118,211,0.03)', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div><label style={S.label}>Field Label *</label><input value={form.label} onChange={e => sf('label', e.target.value)} placeholder="e.g. Expected CTC" style={S.inp} /></div>
            <div><label style={S.label}>Entity *</label>
              <select value={form.entity} onChange={e => sf('entity', e.target.value)} style={S.inp}>{ENTITIES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}</select>
            </div>
            <div><label style={S.label}>Field Type</label>
              <select value={form.fieldType} onChange={e => sf('fieldType', e.target.value)} style={S.inp}>{FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{TYPE_ICONS[t.value]} {t.label}</option>)}</select>
            </div>
            <div><label style={S.label}>Section / Group</label><input value={form.section} onChange={e => sf('section', e.target.value)} placeholder="e.g. Compensation Details" style={S.inp} /></div>
            <div><label style={S.label}>Placeholder</label><input value={form.placeholder} onChange={e => sf('placeholder', e.target.value)} style={S.inp} /></div>
            <div><label style={S.label}>Help Text</label><input value={form.helpText} onChange={e => sf('helpText', e.target.value)} style={S.inp} /></div>
          </div>
          {needsOptions && <div style={{ marginBottom: 14 }}>
            <label style={S.label}>Options (one per line)</label>
            <textarea value={form.options} onChange={e => sf('options', e.target.value)} rows={4} placeholder={"Option A\nOption B"} style={{ ...S.inp, resize: 'vertical' }} />
          </div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <input type="checkbox" checked={form.isRequired} onChange={e => sf('isRequired', e.target.checked)} style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 13 }}>Required field</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={save} disabled={saving || !form.label.trim()} style={{ ...S.btn, opacity: saving || !form.label.trim() ? 0.5 : 1 }}>{saving ? '…' : editing ? '💾 Update' : '+ Create'}</button>
            <button onClick={() => setShowForm(false)} style={S.btnG}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {ENTITIES.map(e => (
          <button key={e.value} onClick={() => setEntity(e.value)} style={{ ...S.btnG, background: entity === e.value ? '#0176D3' : undefined, color: entity === e.value ? '#fff' : undefined, borderColor: entity === e.value ? '#0176D3' : undefined, fontWeight: 700 }}>
            {e.icon} {e.label.split(' ')[1]} <span style={{ marginLeft: 4, background: entity === e.value ? 'rgba(255,255,255,0.2)' : 'rgba(1,118,211,0.15)', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>{fields.filter(f => f.entity === e.value && f.isActive).length}</span>
          </button>
        ))}
      </div>
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: 11, fontWeight: 800, color: '#9E9D9B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Standard System Fields</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(SYSTEM_FIELDS[entity] || []).map(f => {
            const isVisible = visibility[f.key || f.id] ?? true;
            return (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10 }}>
                <span style={{ fontSize: 16 }}>⚙️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{f.label} <span style={{ fontSize: 9, color: '#0176D3', background: 'rgba(1,118,211,0.1)', padding: '2px 4px', borderRadius: 4, marginLeft: 4 }}>SYSTEM</span></div>
                  <div style={{ fontSize: 11, color: '#9E9D9B' }}>{f.type} {f.required && '· Required'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Toggle checked={isVisible} onChange={() => toggleVisibility(f.key || f.id, isVisible)} size="sm" />
                  <span style={{ fontSize: 11, color: isVisible ? '#10B981' : '#9E9D9B', fontWeight: 600 }}>{isVisible ? 'Visible' : 'Hidden'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <h4 style={{ fontSize: 11, fontWeight: 800, color: '#9E9D9B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Custom Fields</h4>
        {loading ? <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>
          : byEntity.length === 0 ? <EmptyState icon="🧩" msg={`No custom fields for ${ENTITIES.find(e => e.value === entity)?.label}`} />
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {byEntity.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(f => {
              const isVisible = visibility[f._id] ?? true;
              return (
                <div key={f._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: f.isActive ? '#fff' : '#FAFAF9', border: `1px solid ${f.isActive ? 'rgba(1,118,211,0.12)' : '#F1F5F9'}`, borderRadius: 10, opacity: f.isActive ? 1 : 0.6 }}>
                  <span style={{ fontSize: 18 }}>{TYPE_ICONS[f.fieldType] || '📝'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{f.label}{f.isRequired && <span style={{ color: '#ef4444', fontSize: 10, marginLeft: 4 }}>Required</span>}</div>
                    <div style={{ fontSize: 11, color: '#9E9D9B' }}>{FIELD_TYPES.find(t => t.value === f.fieldType)?.label}{f.section && ` · ${f.section}`}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: isVisible ? '#10B981' : '#9E9D9B', fontWeight: 600 }}>{isVisible ? 'Visible' : 'Hidden'}</span>
                      <button onClick={() => toggleVisibility(f._id, isVisible)} style={{ width: 34, height: 18, borderRadius: 10, border: 'none', background: isVisible ? '#10B981' : '#E2E8F0', position: 'relative', cursor: 'pointer', transition: '0.2s' }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: isVisible ? 18 : 2, transition: '0.2s' }} />
                      </button>
                    </div>
                    <div style={{ width: 1, height: 20, background: '#F1F5F9' }} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(f)} style={S.btnG}>Edit</button>
                      <button onClick={() => toggle(f)} style={{ ...S.btnG, color: f.isActive ? '#B45309' : '#065f46' }}>{f.isActive ? 'Disable' : 'Enable'}</button>
                      <button onClick={() => del(f)} style={S.btnR}>✕</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        }
      </div>
    </div>
  );
}

// ── 0. Automations (New Tab) ──────────────────────────────────────────────────
function AutomationsTab() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.getWorkflowRules();
      setRules(Array.isArray(resp?.data) ? resp.data : []);
    } catch (e) {
      setToast('Failed to load rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleRule = async (rule) => {
    try {
      await api.updateWorkflowRule(rule.id || rule._id, { isActive: !rule.isActive });
      setRules(prev => prev.map(r => (r.id === rule.id || r._id === rule._id) ? { ...r, isActive: !r.isActive } : r));
    } catch (e) {
      setToast('Toggle failed');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>;

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      <SectionHeader icon="⚡" title="Workflow Automations" desc="Configure triggered actions like automated emails, stage moves, and notifications." 
        action={<button style={S.btn} onClick={() => alert('New Workflow Creation coming soon in Phase 4')}>+ Create Flow</button>} />
      
      {rules.length === 0 ? <EmptyState icon="⚡" msg="No automated flows configured yet." /> :
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
          {rules.map(rule => (
            <div key={rule.id} style={{ ...S.card, opacity: rule.isActive ? 1 : 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{rule.name}</h4>
                  <div style={{ fontSize: 11, color: '#706E6B', marginTop: 2 }}>{rule.triggerCount || 0} executions · Last run {rule.lastTriggeredAt ? new Date(rule.lastTriggeredAt).toLocaleDateString() : 'Never'}</div>
                </div>
                <Toggle checked={rule.isActive} onChange={() => toggleRule(rule)} />
              </div>
              
              <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ color: '#0176D3', fontWeight: 700 }}>WHEN:</span>
                  <span style={{ fontWeight: 600 }}>{AUTOMATION_TRIGGERS[rule.trigger?.event] || rule.trigger?.event}</span>
                </div>
                {rule.trigger?.conditions?.length > 0 && (
                  <div style={{ fontSize: 11, color: '#64748B', marginLeft: 50, marginTop: 4 }}>
                    {rule.trigger.conditions.map((c, i) => <div key={i}>• {c.field} {c.operator} "{c.value}"</div>)}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {rule.actions.map((act, i) => (
                  <span key={i} style={{ fontSize: 11, fontWeight: 700, color: '#374151', background: '#fff', border: '1px solid #E2E8F0', padding: '4px 10px', borderRadius: 20 }}>
                    {AUTOMATION_ACTIONS[act.type] || act.type}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}

// ─── 2. Pipeline Statuses ─────────────────────────────────────────────────────
function PipelineStatusesTab({ data, addItem, deleteItem, replaceSection }) {
  const stages = data?.pipelineStatuses || [];
  const [newStage, setNewStage] = useState({ name: '', color: '#0176D3' });
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!newStage.name.trim()) return;
    setSaving(true);
    await addItem('pipelineStatuses', { name: newStage.name.trim(), color: newStage.color, order: stages.length });
    setNewStage({ name: '', color: '#0176D3' });
    setSaving(false);
  };

  const reset = async () => {
    const defaults = [
      { name: 'Applied', color: '#6366f1', order: 0, isDefault: true },
      { name: 'Screening', color: '#0176D3', order: 1, isDefault: true },
      { name: 'Phone Interview', color: '#0891b2', order: 2, isDefault: true },
      { name: 'Technical Round', color: '#059669', order: 3, isDefault: true },
      { name: 'HR Round', color: '#d97706', order: 4, isDefault: true },
      { name: 'Offer', color: '#7c3aed', order: 5, isDefault: true },
      { name: 'Hired', color: '#065f46', order: 6, isDefault: true },
      { name: 'Rejected', color: '#dc2626', order: 7, isDefault: true },
    ];
    await replaceSection('pipelineStatuses', defaults);
  };

  return (
    <div>
      <SectionHeader icon="🔄" title="Pipeline Statuses"
        desc="Customize hiring stage names and colors across your recruitment pipeline"
        action={<button onClick={reset} style={S.btnG}>↺ Reset Defaults</button>}
      />
      <div style={S.card}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={newStage.name} onChange={e => setNewStage(p => ({ ...p, name: e.target.value }))} placeholder="New stage name..." style={{ ...S.inp, width: 220 }} onKeyDown={e => e.key === 'Enter' && add()} />
          <input type="color" value={newStage.color} onChange={e => setNewStage(p => ({ ...p, color: e.target.value }))} style={{ width: 40, height: 36, border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
          <button onClick={add} disabled={saving} style={{ ...S.btn, opacity: saving ? 0.6 : 1 }}>+ Add Stage</button>
        </div>
        {stages.length === 0 ? <EmptyState icon="🔄" msg="No pipeline stages yet." /> :
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stages.map((s, idx) => (
              <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#FAFAF9', border: '1px solid #F1F5F9', borderRadius: 8 }}>
                <span style={{ color: '#9E9D9B', fontSize: 12, width: 20, textAlign: 'center' }}>{idx + 1}</span>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{s.name}</span>
                {s.isDefault && <span style={{ fontSize: 10, color: '#9E9D9B', background: '#F1F5F9', borderRadius: 10, padding: '2px 8px' }}>default</span>}
                <button onClick={() => deleteItem('pipelineStatuses', s._id)} style={{ ...S.btnR, padding: '4px 8px', fontSize: 11 }}>✕</button>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}

// ─── 3. Custom Tags ───────────────────────────────────────────────────────────
const TAG_CATEGORIES = ['Candidate', 'Job', 'Application', 'Skill', 'Source', 'Priority'];

function CustomTagsTab({ data, addItem, deleteItem }) {
  const tags = data?.tags || [];
  const [form, setForm] = useState({ name: '', category: 'Candidate', color: '#0176D3' });
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await addItem('tags', { ...form, name: form.name.trim() });
    setForm({ name: '', category: 'Candidate', color: '#0176D3' });
    setSaving(false);
  };

  const byCategory = TAG_CATEGORIES.reduce((acc, cat) => { acc[cat] = tags.filter(t => t.category === cat); return acc; }, {});

  return (
    <div>
      <SectionHeader icon="🏷️" title="Custom Tags" desc="Define tags for candidates, jobs, and applications to organize and filter records" />
      <div style={S.card}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Tag name..." style={{ ...S.inp, width: 180 }} onKeyDown={e => e.key === 'Enter' && add()} />
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={{ ...S.inp, width: 140 }}>{TAG_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
          <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} style={{ width: 40, height: 36, border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
          <button onClick={add} disabled={saving} style={{ ...S.btn, opacity: saving ? 0.6 : 1 }}>+ Add Tag</button>
        </div>
        {TAG_CATEGORIES.filter(cat => byCategory[cat]?.length > 0).map(cat => (
          <div key={cat} style={{ marginBottom: 14 }}>
            <div style={{ ...S.label, marginBottom: 8 }}>{cat}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {byCategory[cat].map(tag => (
                <span key={tag._id} style={S.chip(tag.color)}>
                  {tag.name}
                  <button onClick={() => deleteItem('tags', tag._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, fontSize: 12, lineHeight: 1 }}>✕</button>
                </span>
              ))}
            </div>
          </div>
        ))}
        {tags.length === 0 && <EmptyState icon="🏷️" msg="No tags yet. Add your first tag above." />}
      </div>
    </div>
  );
}

// ─── 4. Rejection Reasons ─────────────────────────────────────────────────────
function RejectionReasonsTab({ data, addItem, deleteItem }) {
  const reasons = data?.rejectionReasons || [];
  const [newReason, setNewReason] = useState('');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!newReason.trim()) return;
    setSaving(true);
    await addItem('rejectionReasons', { text: newReason.trim() });
    setNewReason('');
    setSaving(false);
  };

  return (
    <div>
      <SectionHeader icon="❌" title="Rejection Reasons" desc="Standard rejection options shown when declining a candidate or application" />
      <div style={S.card}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <input value={newReason} onChange={e => setNewReason(e.target.value)} placeholder="Add rejection reason..." style={{ ...S.inp, flex: 1 }} onKeyDown={e => e.key === 'Enter' && add()} />
          <button onClick={add} disabled={saving} style={{ ...S.btn, opacity: saving ? 0.6 : 1 }}>+ Add</button>
        </div>
        {reasons.length === 0 ? <EmptyState icon="❌" msg="No rejection reasons yet." /> :
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {reasons.map(r => (
              <div key={r._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#FAFAF9', border: '1px solid #F1F5F9', borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: '#ef4444', flexShrink: 0 }}>✗</span>
                <span style={{ flex: 1, fontSize: 13 }}>{r.text}</span>
                {r.isDefault && <span style={{ fontSize: 10, color: '#9E9D9B', background: '#F1F5F9', borderRadius: 10, padding: '2px 8px' }}>default</span>}
                <button onClick={() => deleteItem('rejectionReasons', r._id)} style={{ ...S.btnR, padding: '4px 8px' }}>✕</button>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}

// ─── 5. Score Card Templates ──────────────────────────────────────────────────
function ScoreCardTab({ data, addItem, deleteItem }) {
  const cards = data?.scoreCards || [];
  const [form, setForm]       = useState({ name: '', criteria: '', maxScore: 10 });
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);

  const add = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const criteria = form.criteria.split('\n').map(s => s.trim()).filter(Boolean);
    await addItem('scoreCards', { name: form.name.trim(), criteria, maxScore: Number(form.maxScore) });
    setForm({ name: '', criteria: '', maxScore: 10 }); setShowForm(false);
    setSaving(false);
  };

  return (
    <div>
      <SectionHeader icon="📊" title="Score Card Templates"
        desc="Evaluation criteria and scoring rubrics for interview rounds"
        action={<button onClick={() => setShowForm(true)} style={S.btn}>+ New Score Card</button>}
      />
      {showForm && (
        <div style={{ ...S.card, border: '1px solid rgba(1,118,211,0.2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 14, marginBottom: 14 }}>
            <div><label style={S.label}>Template Name *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={S.inp} /></div>
            <div><label style={S.label}>Max Score</label><input type="number" value={form.maxScore} onChange={e => setForm(p => ({ ...p, maxScore: e.target.value }))} style={S.inp} /></div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>Criteria (one per line)</label>
            <textarea value={form.criteria} onChange={e => setForm(p => ({ ...p, criteria: e.target.value }))} rows={5} placeholder={"Problem Solving\nCode Quality\nCommunication"} style={{ ...S.inp, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={add} disabled={saving || !form.name.trim()} style={{ ...S.btn, opacity: saving || !form.name.trim() ? 0.5 : 1 }}>{saving ? '…' : '+ Create'}</button>
            <button onClick={() => setShowForm(false)} style={S.btnG}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {cards.map(c => (
          <div key={c._id} style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#9E9D9B' }}>Max score: {c.maxScore} per criterion</div>
              </div>
              <button onClick={() => deleteItem('scoreCards', c._id)} style={{ ...S.btnR, padding: '4px 8px' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(c.criteria || []).map((cr, i) => (
                <div key={i} style={{ fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#0176D3' }}>·</span> {cr}
                </div>
              ))}
            </div>
          </div>
        ))}
        {cards.length === 0 && <div style={{ gridColumn: '1/-1' }}><EmptyState icon="📊" msg="No score card templates yet." /></div>}
      </div>
    </div>
  );
}

// ─── 6. Document Types ────────────────────────────────────────────────────────
function DocumentTypesTab({ data, addItem, updateItem, deleteItem }) {
  const docs = data?.documentTypes || [];
  const [newDoc, setNewDoc] = useState({ name: '', required: false });
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!newDoc.name.trim()) return;
    setSaving(true);
    await addItem('documentTypes', { name: newDoc.name.trim(), required: newDoc.required });
    setNewDoc({ name: '', required: false });
    setSaving(false);
  };

  return (
    <div>
      <SectionHeader icon="📁" title="Document Types" desc="Define what documents candidates must upload during the recruitment process" />
      <div style={S.card}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
          <input value={newDoc.name} onChange={e => setNewDoc(p => ({ ...p, name: e.target.value }))} placeholder="Document name..." style={{ ...S.inp, flex: 1 }} onKeyDown={e => e.key === 'Enter' && add()} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={newDoc.required} onChange={e => setNewDoc(p => ({ ...p, required: e.target.checked }))} /> Required
          </label>
          <button onClick={add} disabled={saving} style={{ ...S.btn, opacity: saving ? 0.6 : 1 }}>+ Add</button>
        </div>
        {docs.length === 0 ? <EmptyState icon="📁" msg="No document types yet." /> :
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {docs.map(d => (
              <div key={d._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#FAFAF9', border: '1px solid #F1F5F9', borderRadius: 8 }}>
                <span style={{ fontSize: 16 }}>📄</span>
                <span style={{ flex: 1, fontSize: 13 }}>{d.name}</span>
                <button onClick={() => updateItem('documentTypes', d._id, { required: !d.required })} style={{ ...S.btnG, fontSize: 11, padding: '4px 10px', color: d.required ? '#dc2626' : '#059669', borderColor: d.required ? 'rgba(220,38,38,0.3)' : 'rgba(5,150,105,0.3)' }}>{d.required ? '⚠ Required' : '○ Optional'}</button>
                <button onClick={() => deleteItem('documentTypes', d._id)} style={{ ...S.btnR, padding: '4px 8px' }}>✕</button>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}

// ─── 7. Interview Question Bank ───────────────────────────────────────────────
const Q_CATEGORIES = ['Technical', 'Behavioral', 'Situational', 'Culture Fit', 'Role-Specific', 'Leadership'];
const DIFF_COLORS  = { Easy: '#059669', Medium: '#d97706', Hard: '#dc2626' };

function QuestionBankTab({ data, addItem, deleteItem }) {
  const questions = data?.questionBank || [];
  const [form, setForm]   = useState({ text: '', category: 'Technical', difficulty: 'Medium' });
  const [filter, setFilter] = useState('All');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!form.text.trim()) return;
    setSaving(true);
    await addItem('questionBank', { ...form, text: form.text.trim() });
    setForm({ text: '', category: 'Technical', difficulty: 'Medium' });
    setSaving(false);
  };

  const filtered = filter === 'All' ? questions : questions.filter(q => q.category === filter);

  return (
    <div>
      <SectionHeader icon="❓" title="Interview Question Bank" desc="Library of interview questions organized by category and difficulty" />
      <div style={S.card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10, alignItems: 'end' }}>
          <div><label style={S.label}>Question</label><input value={form.text} onChange={e => setForm(p => ({ ...p, text: e.target.value }))} placeholder="Enter question..." style={S.inp} onKeyDown={e => e.key === 'Enter' && add()} /></div>
          <div><label style={S.label}>Category</label><select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={{ ...S.inp, width: 140 }}>{Q_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
          <div><label style={S.label}>Difficulty</label><select value={form.difficulty} onChange={e => setForm(p => ({ ...p, difficulty: e.target.value }))} style={{ ...S.inp, width: 110 }}>{['Easy','Medium','Hard'].map(d => <option key={d}>{d}</option>)}</select></div>
          <button onClick={add} disabled={saving} style={{ ...S.btn, alignSelf: 'flex-end', opacity: saving ? 0.6 : 1 }}>+ Add</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {['All', ...Q_CATEGORIES].map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} style={{ ...S.btnG, background: filter === cat ? '#0176D3' : undefined, color: filter === cat ? '#fff' : undefined, borderColor: filter === cat ? '#0176D3' : undefined, fontSize: 11 }}>{cat}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(q => (
          <div key={q._id} style={{ display: 'flex', gap: 12, padding: '12px 16px', background: '#fff', border: '1px solid rgba(1,118,211,0.1)', borderRadius: 10 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>❓</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{q.text}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={S.chip('#0176D3')}>{q.category}</span>
                <span style={S.chip(DIFF_COLORS[q.difficulty] || '#374151')}>{q.difficulty}</span>
              </div>
            </div>
            <button onClick={() => deleteItem('questionBank', q._id)} style={{ ...S.btnR, padding: '4px 8px', alignSelf: 'flex-start' }}>✕</button>
          </div>
        ))}
        {filtered.length === 0 && <EmptyState icon="❓" msg="No questions in this category yet." />}
      </div>
    </div>
  );
}

// ─── 8. Email Signature ───────────────────────────────────────────────────────
function EmailSignatureTab({ data, updateSingleton }) {
  const [sig, setSig]   = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.emailSignature) setSig(data.emailSignature);
  }, [data]);

  if (!sig) return null;
  const sf = (k, v) => setSig(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    await updateSingleton({ emailSignature: sig });
    setSaving(false);
  };

  return (
    <div>
      <SectionHeader icon="✉️" title="Email Signature"
        desc="Customize the footer on all system emails sent from the platform"
        action={<button onClick={save} disabled={saving} style={{ ...S.btn, opacity: saving ? 0.6 : 1 }}>{saving ? '…' : '💾 Save'}</button>}
      />
      <div style={S.card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div><label style={S.label}>Company Name</label><input value={sig.companyName} onChange={e => sf('companyName', e.target.value)} style={S.inp} /></div>
          <div><label style={S.label}>Tagline</label><input value={sig.tagline} onChange={e => sf('tagline', e.target.value)} placeholder="Your Hiring Partner" style={S.inp} /></div>
          <div><label style={S.label}>Website URL</label><input value={sig.website} onChange={e => sf('website', e.target.value)} placeholder="https://..." style={S.inp} /></div>
          <div><label style={S.label}>Support Email</label><input value={sig.supportEmail} onChange={e => sf('supportEmail', e.target.value)} placeholder="hr@company.com" style={S.inp} /></div>
          <div><label style={S.label}>Phone (optional)</label><input value={sig.phone} onChange={e => sf('phone', e.target.value)} placeholder="+91 ..." style={S.inp} /></div>
          <div><label style={S.label}>LinkedIn URL (optional)</label><input value={sig.linkedIn} onChange={e => sf('linkedIn', e.target.value)} placeholder="https://linkedin.com/company/..." style={S.inp} /></div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Footer Note (optional)</label>
          <textarea value={sig.footerNote} onChange={e => sf('footerNote', e.target.value)} rows={3} placeholder="You are receiving this email as part of your recruitment process." style={{ ...S.inp, resize: 'vertical' }} />
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', marginTop: 8 }}>
          <div style={{ fontSize: 11, color: '#9E9D9B', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Preview</div>
          <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.8 }}>
            <strong style={{ color: '#032D60' }}>{sig.companyName || 'Your Company'}</strong>
            {sig.tagline && <> · <em>{sig.tagline}</em></>}<br />
            {sig.website && <><a href={sig.website} style={{ color: '#0176D3' }}>{sig.website.replace(/^https?:\/\//, '')}</a>{sig.supportEmail && ' · '}</>}
            {sig.supportEmail && <a href={`mailto:${sig.supportEmail}`} style={{ color: '#0176D3' }}>{sig.supportEmail}</a>}
            {sig.phone && <> · {sig.phone}</>}
            {sig.footerNote && <><br /><span style={{ color: '#9ca3af', fontSize: 11 }}>{sig.footerNote}</span></>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 9. Notification Messages ─────────────────────────────────────────────────
function NotificationMessagesTab({ data, updateItem }) {
  const notifs = data?.notificationMessages || [];
  const [editing, setEditing] = useState(null);
  const [msg, setMsg]         = useState('');
  const [saving, setSaving]   = useState(false);

  const startEdit = (n) => { setEditing(n._id); setMsg(n.message); };

  const save = async (n) => {
    setSaving(true);
    await updateItem('notificationMessages', n._id, { message: msg });
    setEditing(null);
    setSaving(false);
  };

  return (
    <div>
      <SectionHeader icon="🔔" title="Notification Messages" desc="Customize messages sent to candidates at key stages of the recruitment process" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {notifs.map(n => (
          <div key={n._id} style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{n.trigger}</div>
                <div style={{ fontSize: 11, color: '#9E9D9B' }}>Channel: {n.channel}</div>
              </div>
              <button onClick={() => editing === n._id ? setEditing(null) : startEdit(n)} style={S.btnG}>{editing === n._id ? 'Cancel' : '✏️ Edit'}</button>
            </div>
            {editing === n._id ? (
              <div>
                <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={3} style={{ ...S.inp, resize: 'vertical', marginBottom: 10 }} />
                <button onClick={() => save(n)} disabled={saving} style={{ ...S.btn, opacity: saving ? 0.6 : 1 }}>{saving ? '…' : '💾 Save Message'}</button>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#374151', background: '#f8fafc', padding: '10px 14px', borderRadius: 8, lineHeight: 1.6 }}>{n.message}</div>
            )}
          </div>
        ))}
        {notifs.length === 0 && <EmptyState icon="🔔" msg="No notification messages configured." />}
      </div>
    </div>
  );
}

// ─── 10. Field Visibility ─────────────────────────────────────────────────────
const VISIBILITY_FIELDS = [
  { id: 'salary',             label: 'Salary / CTC',         desc: 'Show salary range on job cards' },
  { id: 'recruiter_name',     label: 'Recruiter Name',        desc: 'Show recruiter identity to candidates' },
  { id: 'company_name',       label: 'Company Name',          desc: 'Show company name in job listings' },
  { id: 'application_count',  label: 'Application Count',     desc: 'Show how many people applied' },
  { id: 'interview_feedback', label: 'Interview Feedback',    desc: 'Share feedback with candidates after rounds' },
  { id: 'offer_details',      label: 'Offer Details',         desc: 'Show full offer breakdown to candidates' },
  { id: 'internal_notes',     label: 'Internal Notes',        desc: 'Allow recruiter to add private notes on profiles' },
  { id: 'candidate_score',    label: 'Candidate Score',       desc: 'Display AI match score to recruiters' },
  { id: 'source_tracking',    label: 'Source Tracking',       desc: 'Track where each candidate came from' },
  { id: 'diversity_data',     label: 'Diversity Fields',      desc: 'Collect optional diversity & inclusion data' },
];

function FieldVisibilityTab({ data, updateSingleton }) {
  const visibility = data?.fieldVisibility || {};
  const [saving, setSaving] = useState(null);

  const toggle = async (id) => {
    setSaving(id);
    await updateSingleton({ fieldVisibility: { ...visibility, [id]: !visibility[id] } });
    setSaving(null);
  };

  return (
    <div>
      <SectionHeader icon="👁️" title="Field Visibility" desc="Control which fields and data points are visible to each user type across the platform" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {VISIBILITY_FIELDS.map(f => (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', background: '#fff', border: `1px solid ${visibility[f.id] ? 'rgba(1,118,211,0.12)' : '#F1F5F9'}`, borderRadius: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{f.label}</div>
              <div style={{ fontSize: 12, color: '#9E9D9B' }}>{f.desc}</div>
            </div>
            <button onClick={() => toggle(f.id)} disabled={saving === f.id} style={{ background: visibility[f.id] ? '#0176D3' : '#E5E7EB', border: 'none', borderRadius: 20, padding: '4px 16px', color: visibility[f.id] ? '#fff' : '#6b7280', fontWeight: 700, fontSize: 12, cursor: 'pointer', minWidth: 68 }}>
              {saving === f.id ? '…' : visibility[f.id] ? 'ON' : 'OFF'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 12. Offer Letter Variables ────────────────────────────────────────────────
function OfferVariablesTab({ data, addItem, deleteItem }) {
  const vars = data?.offerVariables || [];
  const [form, setForm] = useState({ key: '', desc: '', example: '' });
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!form.key.trim()) return;
    const key = form.key.includes('{{') ? form.key.trim() : `{{${form.key.trim().toUpperCase().replace(/\s/g, '_')}}}`;
    setSaving(true);
    await addItem('offerVariables', { key, desc: form.desc, example: form.example });
    setForm({ key: '', desc: '', example: '' });
    setSaving(false);
  };

  return (
    <div>
      <SectionHeader icon="📝" title="Offer Letter Variables" desc="Define merge variables available in offer letter templates using {{VAR_NAME}} syntax" />
      <div style={S.card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr auto', gap: 10, alignItems: 'end' }}>
          <div><label style={S.label}>Variable Key</label><input value={form.key} onChange={e => setForm(p => ({ ...p, key: e.target.value }))} placeholder="VARIABLE_NAME" style={S.inp} /></div>
          <div><label style={S.label}>Description</label><input value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} placeholder="What this inserts..." style={S.inp} /></div>
          <div><label style={S.label}>Example</label><input value={form.example} onChange={e => setForm(p => ({ ...p, example: e.target.value }))} placeholder="John Doe" style={S.inp} /></div>
          <button onClick={add} disabled={saving} style={{ ...S.btn, alignSelf: 'flex-end', opacity: saving ? 0.6 : 1 }}>+ Add</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
        {vars.map(v => (
          <div key={v._id} style={{ ...S.card, padding: '14px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <code style={{ background: '#f0f7ff', color: '#0176D3', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{v.key}</code>
              <button onClick={() => deleteItem('offerVariables', v._id)} style={{ ...S.btnR, padding: '3px 7px', fontSize: 11 }}>✕</button>
            </div>
            <div style={{ fontSize: 12, color: '#374151', marginTop: 8 }}>{v.desc}</div>
            {v.example && <div style={{ fontSize: 11, color: '#9E9D9B', marginTop: 4 }}>e.g. {v.example}</div>}
          </div>
        ))}
        {vars.length === 0 && <div style={{ gridColumn: '1/-1' }}><EmptyState icon="📝" msg="No offer variables yet." /></div>}
      </div>
    </div>
  );
}

// ─── 13. Offer Letter Template ───────────────────────────────────────────────
const OLT_FIELDS = [
  { key: 'introText',          label: 'Opening Paragraph',       rows: 3,  hint: 'First paragraph of the letter. Use {{candidateName}}, {{designation}}, {{companyName}}.' },
  { key: 'compensationText',   label: 'Compensation Section',    rows: 3,  hint: 'Describe CTC & pay structure. Use {{ctc}}.' },
  { key: 'joiningText',        label: 'Joining Instructions',    rows: 3,  hint: 'Joining date & reporting instructions. Use {{joiningDate}}.' },
  { key: 'termsAndConditions', label: 'Terms & Conditions',      rows: 10, hint: 'Full employment terms. One clause per line.' },
  { key: 'closingText',        label: 'Closing / Sign-off',      rows: 3,  hint: 'Closing message before signatures. Use {{supportEmail}}.' },
  { key: 'customClauses',      label: 'Custom Additional Clauses', rows: 5, hint: 'Any extra clauses appended at the end (optional).' },
  { key: 'signatoryTitle',     label: 'Signatory Job Title',     rows: 1,  hint: 'e.g. Head of Human Resources' },
  { key: 'footerNote',         label: 'Footer Note',             rows: 1,  hint: 'e.g. This is a computer-generated offer letter.' },
];

function OfferLetterTemplateTab({ data, updateSingleton }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState(OLT_FIELDS[0].key);

  useEffect(() => {
    if (data?.offerLetterTemplate) setForm({ ...data.offerLetterTemplate });
  }, [data]);

  if (!form) return <div style={{ textAlign: 'center', padding: 60 }}><Spinner /></div>;

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    await updateSingleton({ offerLetterTemplate: form });
    setSaving(false);
  };

  const current = OLT_FIELDS.find(f => f.key === activeSection);
  const VARS = ['{{candidateName}}', '{{designation}}', '{{companyName}}', '{{ctc}}', '{{joiningDate}}', '{{signatoryName}}', '{{supportEmail}}'];

  return (
    <div>
      <SectionHeader icon="📄" title="Offer Letter Template"
        desc="Customize the content, terms & conditions, and sections of your offer letters"
        action={<button onClick={save} disabled={saving} style={{ ...S.btn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : '💾 Save Template'}</button>}
      />

      {/* Available variables chip bar */}
      <div style={{ ...S.card, padding: '12px 18px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Available Variables — click to copy</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {VARS.map(v => (
            <span key={v} onClick={() => { navigator.clipboard?.writeText(v); }}
              style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: '#1D4ED8', fontFamily: 'monospace', cursor: 'pointer', fontWeight: 600 }}>
              {v}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Section nav */}
        <div style={{ width: 200, flexShrink: 0, background: '#fff', border: '1px solid rgba(1,118,211,0.12)', borderRadius: 12, padding: '6px 0' }}>
          {OLT_FIELDS.map(f => (
            <button key={f.key} onClick={() => setActiveSection(f.key)} style={{
              width: '100%', padding: '9px 14px', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 12,
              background: activeSection === f.key ? 'rgba(1,118,211,0.08)' : 'transparent',
              color: activeSection === f.key ? '#0176D3' : '#374151',
              fontWeight: activeSection === f.key ? 700 : 500,
              borderLeft: activeSection === f.key ? '3px solid #0176D3' : '3px solid transparent',
            }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Editor */}
        <div style={{ flex: 1 }}>
          <div style={S.card}>
            <label style={S.label}>{current.label}</label>
            <div style={{ fontSize: 11, color: '#9E9D9B', marginBottom: 8 }}>{current.hint}</div>
            {current.rows === 1 ? (
              <input value={form[current.key] || ''} onChange={e => sf(current.key, e.target.value)} style={S.inp} />
            ) : (
              <textarea
                value={form[current.key] || ''}
                onChange={e => sf(current.key, e.target.value)}
                rows={current.rows}
                style={{ ...S.inp, resize: 'vertical', fontFamily: current.key === 'termsAndConditions' ? 'monospace' : 'inherit', lineHeight: 1.6 }}
              />
            )}
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={save} disabled={saving} style={{ ...S.btn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : '💾 Save'}</button>
            </div>
          </div>

          {/* Live preview for terms */}
          {current.key === 'termsAndConditions' && form.termsAndConditions && (
            <div style={{ ...S.card, background: '#FAFAF9' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Preview</div>
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                {form.termsAndConditions.split('\n').filter(Boolean).map((line, i) => (
                  <li key={i} style={{ fontSize: 13, color: '#374151', marginBottom: 6, lineHeight: 1.6 }}>
                    {line.replace(/^\d+\.\s*/, '')}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 14. Departments ─────────────────────────────────────────────────────────
function DepartmentsTab({ data, addItem, deleteItem, replaceSection }) {
  const items = data?.departments || [];
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await addItem('departments', { name: name.trim() });
    setName('');
    setSaving(false);
  };

  const reset = async () => {
    const defaults = [{ name: 'Engineering' }, { name: 'Sales' }, { name: 'Marketing' }, { name: 'Human Resources' }, { name: 'Finance' }, { name: 'Operations' }, { name: 'Product' }, { name: 'Design' }];
    await replaceSection('departments', defaults);
  };

  return (
    <div>
      <SectionHeader icon="🏢" title="Departments" desc="Manage organizational departments for job categorization and team structure" action={<button onClick={reset} style={S.btnG}>↺ Reset Defaults</button>} />
      <div style={S.card}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Engineering" style={{ ...S.inp, flex: 1 }} onKeyDown={e => e.key === 'Enter' && add()} />
          <button onClick={add} disabled={saving} style={{ ...S.btn, opacity: saving ? 0.6 : 1 }}>+ Add</button>
        </div>
        {items.length === 0 ? <EmptyState icon="🏢" msg="No departments yet." /> :
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {items.map(item => (
              <div key={item._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#FAFAF9', border: '1px solid #F1F5F9', borderRadius: 8 }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{item.name}</span>
                <button onClick={() => deleteItem('departments', item._id)} style={{ ...S.btnR, padding: '4px 8px' }}>✕</button>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}

// ─── 14. Office Locations ─────────────────────────────────────────────────────
function LocationsTab({ data, addItem, deleteItem, replaceSection }) {
  const items = data?.locations || [];
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await addItem('locations', { name: name.trim() });
    setName('');
    setSaving(false);
  };

  const reset = async () => {
    const defaults = [{ name: 'Remote' }, { name: 'Bangalore' }, { name: 'Mumbai' }, { name: 'Delhi' }, { name: 'Hyderabad' }, { name: 'Pune' }, { name: 'Chennai' }];
    await replaceSection('locations', defaults);
  };

  return (
    <div>
      <SectionHeader icon="📍" title="Office Locations" desc="Define physical and remote locations available for job postings" action={<button onClick={reset} style={S.btnG}>↺ Reset Defaults</button>} />
      <div style={S.card}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bangalore, India" style={{ ...S.inp, flex: 1 }} onKeyDown={e => e.key === 'Enter' && add()} />
          <button onClick={add} disabled={saving} style={{ ...S.btn, opacity: saving ? 0.6 : 1 }}>+ Add</button>
        </div>
        {items.length === 0 ? <EmptyState icon="📍" msg="No locations yet." /> :
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {items.map(item => (
              <div key={item._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#FAFAF9', border: '1px solid #F1F5F9', borderRadius: 8 }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{item.name}</span>
                <button onClick={() => deleteItem('locations', item._id)} style={{ ...S.btnR, padding: '4px 8px' }}>✕</button>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}

// ─── 15. Application Sources ──────────────────────────────────────────────────
function SourcesTab({ data, addItem, deleteItem, replaceSection }) {
  const items = data?.sources || [];
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await addItem('sources', { name: name.trim() });
    setName('');
    setSaving(false);
  };

  const reset = async () => {
    const defaults = [{ name: 'LinkedIn' }, { name: 'Career Page' }, { name: 'Referral' }, { name: 'Indeed' }, { name: 'Naukri' }, { name: 'Direct' }, { name: 'Consultant' }];
    await replaceSection('sources', defaults);
  };

  return (
    <div>
      <SectionHeader icon="📢" title="Application Sources" desc="Track where your candidates are coming from to optimize recruitment spend" action={<button onClick={reset} style={S.btnG}>↺ Reset Defaults</button>} />
      <div style={S.card}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. LinkedIn" style={{ ...S.inp, flex: 1 }} onKeyDown={e => e.key === 'Enter' && add()} />
          <button onClick={add} disabled={saving} style={{ ...S.btn, opacity: saving ? 0.6 : 1 }}>+ Add</button>
        </div>
        {items.length === 0 ? <EmptyState icon="📢" msg="No sources yet." /> :
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {items.map(item => (
              <div key={item._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: 'rgba(1,118,211,0.05)', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 20 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0176D3' }}>{item.name}</span>
                <button onClick={() => deleteItem('sources', item._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9E9D9B', fontSize: 12, padding: 0 }}>✕</button>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}

// ─── Tabs Config ──────────────────────────────────────────────────────────────
const TABS = [
  { id: 'custom-fields',  icon: '🧩', label: 'Custom Fields'     },
  { id: 'automations',   icon: '⚡', label: 'Automations'       },
  { id: 'departments',    icon: '🏢', label: 'Departments'       },
  { id: 'locations',      icon: '📍', label: 'Office Locations'  },
  { id: 'sources',        icon: '📢', label: 'App. Sources'      },
  { id: 'pipeline',       icon: '🔄', label: 'Pipeline Statuses' },
  { id: 'tags',           icon: '🏷️', label: 'Custom Tags'       },
  { id: 'rejection',      icon: '❌', label: 'Rejection Reasons' },
  { id: 'scorecard',      icon: '📊', label: 'Score Cards'       },
  { id: 'doc-types',      icon: '📁', label: 'Document Types'    },
  { id: 'questions',      icon: '❓', label: 'Question Bank'     },
  { id: 'email-sig',      icon: '✉️', label: 'Email Signature'   },
  { id: 'notifications',  icon: '🔔', label: 'Notifications'     },
  { id: 'visibility',     icon: '👁️', label: 'Field Visibility'  },
  { id: 'offer-vars',     icon: '📝', label: 'Offer Variables'   },
  { id: 'offer-template', icon: '📄', label: 'Offer Template'    },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SuperAdminCustomizations() {
  const [activeTab, setActiveTab] = useState('custom-fields');
  const ctx = useCustomizations();

  const tabProps = { data: ctx.data, addItem: ctx.addItem, updateItem: ctx.updateItem, deleteItem: ctx.deleteItem, updateSingleton: ctx.updateSingleton, replaceSection: ctx.replaceSection };

  const renderTab = () => {
    if (activeTab === 'custom-fields')  return <CustomFieldsTab {...tabProps} toast={ctx.toast} setToast={ctx.setToast} />;
    if (activeTab === 'automations')    return <AutomationsTab />;
    if (ctx.loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spinner /></div>;
    switch (activeTab) {
      case 'departments':   return <DepartmentsTab {...tabProps} />;
      case 'locations':     return <LocationsTab {...tabProps} />;
      case 'sources':       return <SourcesTab {...tabProps} />;
      case 'pipeline':      return <PipelineStatusesTab {...tabProps} />;
      case 'tags':          return <CustomTagsTab {...tabProps} />;
      case 'rejection':     return <RejectionReasonsTab {...tabProps} />;
      case 'scorecard':     return <ScoreCardTab {...tabProps} />;
      case 'doc-types':     return <DocumentTypesTab {...tabProps} />;
      case 'questions':     return <QuestionBankTab {...tabProps} />;
      case 'email-sig':     return <EmailSignatureTab {...tabProps} />;
      case 'notifications': return <NotificationMessagesTab {...tabProps} />;
      case 'visibility':    return <FieldVisibilityTab {...tabProps} />;
      case 'offer-vars':     return <OfferVariablesTab {...tabProps} />;
      case 'offer-template': return <OfferLetterTemplateTab {...tabProps} />;
      default:              return null;
    }
  };

  return (
    <div>
      <Toast msg={ctx.toast} onClose={() => ctx.setToast('')} />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#181818', fontSize: 26, fontWeight: 800, margin: 0 }}>⚙️ Customizations</h1>
        <p style={{ color: '#706E6B', fontSize: 14, margin: '4px 0 0' }}>Platform-wide settings, custom fields, branding, and workflow configuration</p>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Sidebar Nav */}
        <div style={{ width: 220, flexShrink: 0, background: '#fff', border: '1px solid rgba(1,118,211,0.12)', borderRadius: 14, padding: '8px 0', position: 'sticky', top: 20 }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 18px', border: 'none', cursor: 'pointer', textAlign: 'left',
              background: activeTab === tab.id ? 'rgba(1,118,211,0.08)' : 'transparent',
              color: activeTab === tab.id ? '#0176D3' : '#374151',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: 13, borderLeft: activeTab === tab.id ? '3px solid #0176D3' : '3px solid transparent',
            }}>
              <span style={{ fontSize: 15 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {renderTab()}
        </div>
      </div>
    </div>
  );
}
