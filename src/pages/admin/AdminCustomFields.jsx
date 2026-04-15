import { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import Toast from '../../components/ui/Toast.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

const FIELD_TYPES = [
  { value: 'text',        label: 'Short Text' },
  { value: 'textarea',    label: 'Long Text' },
  { value: 'number',      label: 'Number' },
  { value: 'date',        label: 'Date' },
  { value: 'select',      label: 'Dropdown (single)' },
  { value: 'multiselect', label: 'Dropdown (multi)' },
  { value: 'checkbox',    label: 'Checkbox' },
  { value: 'url',         label: 'URL' },
];

const ENTITIES = [
  { value: 'candidate',   label: '👤 Candidate',   icon: '👤' },
  { value: 'job',         label: '💼 Job Posting',  icon: '💼' },
  { value: 'application', label: '📋 Application',  icon: '📋' },
];

const TYPE_ICONS = { text:'📝', textarea:'📄', number:'🔢', date:'📅', select:'🔽', multiselect:'☑️', checkbox:'✅', url:'🔗' };

const S = {
  card:  { background: '#fff', border: '1px solid rgba(1,118,211,0.12)', borderRadius: 16, padding: 24, marginBottom: 16 },
  inp:   { width: '100%', padding: '9px 12px', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  label: { fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 5 },
  btn:   { background: '#0176D3', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, padding: '9px 18px', cursor: 'pointer' },
  btnG:  { background: 'rgba(1,118,211,0.08)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, color: '#0176D3', fontWeight: 600, fontSize: 12, padding: '7px 14px', cursor: 'pointer' },
  btnR:  { background: 'rgba(186,5,23,0.07)', border: '1px solid rgba(186,5,23,0.2)', borderRadius: 8, color: '#BA0517', fontWeight: 600, fontSize: 12, padding: '7px 12px', cursor: 'pointer' },
};

const EMPTY_FORM = { label: '', entity: 'candidate', fieldType: 'text', placeholder: '', helpText: '', options: '', isRequired: false };

function FieldForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const needsOptions = ['select', 'multiselect'].includes(form.fieldType);

  return (
    <div style={{ background: 'rgba(1,118,211,0.03)', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 14 }}>
        <div>
          <label style={S.label}>Field Label *</label>
          <input value={form.label} onChange={e => sf('label', e.target.value)} placeholder="e.g. Expected CTC" style={S.inp} />
        </div>
        <div>
          <label style={S.label}>Entity *</label>
          <select value={form.entity} onChange={e => sf('entity', e.target.value)} style={S.inp}>
            {ENTITIES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>Field Type</label>
          <select value={form.fieldType} onChange={e => sf('fieldType', e.target.value)} style={S.inp}>
            {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{TYPE_ICONS[t.value]} {t.label}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>Placeholder</label>
          <input value={form.placeholder} onChange={e => sf('placeholder', e.target.value)} placeholder="Optional hint text" style={S.inp} />
        </div>
      </div>

      {needsOptions && (
        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Options (one per line)</label>
          <textarea
            value={form.options}
            onChange={e => sf('options', e.target.value)}
            rows={4}
            placeholder={"Option A\nOption B\nOption C"}
            style={{ ...S.inp, resize: 'vertical' }}
          />
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={S.label}>Help Text</label>
        <input value={form.helpText} onChange={e => sf('helpText', e.target.value)} placeholder="Optional description shown below the field" style={S.inp} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <input type="checkbox" id="req" checked={form.isRequired} onChange={e => sf('isRequired', e.target.checked)} style={{ width: 16, height: 16 }} />
        <label htmlFor="req" style={{ fontSize: 13, color: '#374151', cursor: 'pointer' }}>Required field</label>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => onSave(form)} disabled={saving || !form.label.trim()} style={{ ...S.btn, opacity: saving || !form.label.trim() ? 0.5 : 1 }}>
          {saving ? '…' : initial ? '💾 Update Field' : '+ Create Field'}
        </button>
        <button onClick={onCancel} style={{ ...S.btnG }}>Cancel</button>
      </div>
    </div>
  );
}

function FieldCard({ field, onEdit, onDelete, onToggle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: field.isActive ? '#fff' : '#FAFAF9', border: `1px solid ${field.isActive ? 'rgba(1,118,211,0.12)' : '#F1F5F9'}`, borderRadius: 10, opacity: field.isActive ? 1 : 0.6 }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{TYPE_ICONS[field.fieldType] || '📝'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#181818' }}>
          {field.label}
          {field.isRequired && <span style={{ color: '#ef4444', fontSize: 10, marginLeft: 4 }}>Required</span>}
        </div>
        <div style={{ fontSize: 11, color: '#9E9D9B' }}>
          {FIELD_TYPES.find(t => t.value === field.fieldType)?.label || field.fieldType}
          {field.fieldKey && <span style={{ marginLeft: 6, color: '#DDDBDA' }}>· key: {field.fieldKey}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={() => onEdit(field)} style={S.btnG}>Edit</button>
        <button onClick={() => onToggle(field)} style={{ ...S.btnG, color: field.isActive ? '#B45309' : '#065f46', borderColor: field.isActive ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)', background: field.isActive ? 'rgba(245,158,11,0.07)' : 'rgba(16,185,129,0.07)' }}>
          {field.isActive ? 'Disable' : 'Enable'}
        </button>
        <button onClick={() => onDelete(field)} style={S.btnR}>✕</button>
      </div>
    </div>
  );
}

export default function AdminCustomFields() {
  const [fields,    setFields]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [entity,    setEntity]    = useState('candidate');
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.getCustomFields();
      setFields(Array.isArray(r?.data) ? r.data : []);
    } catch { setFields([]); }
    setLoading(false);
  };

  const save = async (form) => {
    setSaving(true);
    try {
      const options = form.options
        ? form.options.split('\n').map(s => s.trim()).filter(Boolean)
        : [];
      const payload = { ...form, options };

      if (editing) {
        const r = await api.updateCustomField(editing.id || editing._id, payload);
        setFields(prev => prev.map(f => (f.id === editing.id || f._id === editing._id) ? (r?.data || r) : f));
        setToast('✅ Field updated.');
      } else {
        const r = await api.createCustomField(payload);
        setFields(prev => [...prev, r?.data || r]);
        setToast('✅ Field created.');
      }
      setShowForm(false);
      setEditing(null);
    } catch (e) { setToast('❌ ' + e.message); }
    setSaving(false);
  };

  const handleEdit = (field) => {
    setEditing({
      ...field,
      options: Array.isArray(field.options) ? field.options.join('\n') : (field.options || ''),
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggle = async (field) => {
    try {
      const r = await api.updateCustomField(field.id || field._id, { isActive: !field.isActive });
      setFields(prev => prev.map(f => (f.id === field.id || f._id === field._id) ? (r?.data || r) : f));
      setToast(field.isActive ? '⚠️ Field disabled.' : '✅ Field enabled.');
    } catch (e) { setToast('❌ ' + e.message); }
  };

  const handleDelete = async (field) => {
    if (!confirm(`Delete field "${field.label}"? This cannot be undone.`)) return;
    try {
      await api.deleteCustomField(field.id || field._id);
      setFields(prev => prev.filter(f => f.id !== field.id && f._id !== field._id));
      setToast('🗑️ Field deleted.');
    } catch (e) { setToast('❌ ' + e.message); }
  };

  const byEntity = fields.filter(f => f.entity === entity);

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#181818', fontSize: 24, fontWeight: 800, margin: 0 }}>🧩 Custom Fields</h1>
          <p style={{ color: '#706E6B', fontSize: 14, margin: '4px 0 0' }}>Define extra fields for candidate, job, and application forms</p>
        </div>
        {!showForm && (
          <button onClick={() => { setEditing(null); setShowForm(true); }} style={S.btn}>+ New Field</button>
        )}
      </div>

      {showForm && (
        <FieldForm
          initial={editing}
          onSave={save}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          saving={saving}
        />
      )}

      {/* Entity tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {ENTITIES.map(e => (
          <button key={e.value} onClick={() => setEntity(e.value)} style={{ ...S.btnG, background: entity === e.value ? '#0176D3' : 'rgba(1,118,211,0.07)', color: entity === e.value ? '#fff' : '#0176D3', borderColor: entity === e.value ? '#0176D3' : 'rgba(1,118,211,0.2)', fontWeight: 700 }}>
            {e.icon} {e.label.split(' ')[1]}
            <span style={{ marginLeft: 6, background: entity === e.value ? 'rgba(255,255,255,0.2)' : 'rgba(1,118,211,0.15)', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>
              {fields.filter(f => f.entity === e.value && f.isActive).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spinner /></div>
      ) : byEntity.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', padding: '48px 24px', color: '#9E9D9B' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🧩</div>
          <div style={{ fontWeight: 600 }}>No custom fields for {ENTITIES.find(e2 => e2.value === entity)?.label}</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Click "New Field" to create the first one.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {byEntity
            .slice()
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map(field => (
              <FieldCard
                key={field.id || field._id}
                field={field}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ))}
        </div>
      )}

      {byEntity.length > 0 && (
        <p style={{ fontSize: 11, color: '#9E9D9B', marginTop: 16 }}>
          💡 These fields appear on the {ENTITIES.find(e2 => e2.value === entity)?.label} form when adding or editing records.
        </p>
      )}
    </div>
  );
}
