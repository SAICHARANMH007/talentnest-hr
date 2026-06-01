import React, { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { card, btnP, btnG, btnD } from '../../constants/styles.js';

const CAT_OPTS = ['document', 'training', 'it_setup', 'policy', 'orientation', 'other'];
const CAT_ICON = { document: '📄', training: '📚', it_setup: '💻', policy: '📋', orientation: '🎯', other: '📌' };

function TemplateModal({ template, onClose, onSaved }) {
  const blank = { title: '', description: '', isDefault: false, tasks: [] };
  const [form, setForm] = useState(template || blank);
  const [saving, setSaving] = useState(false);
  const [taskDraft, setTD] = useState({ title: '', category: 'document', dueDays: 1, isRequired: true });

  const addTask = () => {
    if (!taskDraft.title.trim()) return;
    setForm(f => ({ ...f, tasks: [...f.tasks, { ...taskDraft, _id: Date.now().toString() }] }));
    setTD({ title: '', category: 'document', dueDays: 1, isRequired: true });
  };
  const removeTask = (idx) => setForm(f => ({ ...f, tasks: f.tasks.filter((_, i) => i !== idx) }));

  const save = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    const data = { name: form.name.trim(), description: form.description || '', isDefault: !!form.isDefault, tasks: form.tasks };
    const r = form._id
      ? await api.updateOnboardingTemplate(form._id, data)
      : await api.createOnboardingTemplate(data);
    onSaved(r);
  };

  const iS = { width: '100%', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px', fontSize: 14, marginTop: 4, boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>{form._id ? 'Edit Template' : 'New Onboarding Template'}</h3>

        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Template Name *</label>
        <input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Standard IT Hire" style={iS} />

        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginTop: 14 }}>Description</label>
        <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ ...iS, resize: 'vertical' }} />

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, cursor: 'pointer', fontSize: 14 }}>
          <input type="checkbox" checked={!!form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} />
          Set as default (auto-apply to all new hires)
        </label>

        <h4 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 10px', color: '#374151' }}>Tasks ({form.tasks.length})</h4>

        {/* Existing tasks */}
        {form.tasks.map((t, i) => (
          <div key={t._id || i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#F8FAFC', borderRadius: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 16 }}>{CAT_ICON[t.category] || '📌'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>Due: Day {t.dueDays} · {t.isRequired ? 'Required' : 'Optional'}</div>
            </div>
            <button onClick={() => removeTask(i)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        ))}

        {/* Add task row */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <input value={taskDraft.title} onChange={e => setTD(d => ({ ...d, title: e.target.value }))} placeholder="Task title" style={{ flex: 2, border: '1px solid #E2E8F0', borderRadius: 8, padding: '7px 10px', fontSize: 13, minWidth: 140 }} />
          <select value={taskDraft.category} onChange={e => setTD(d => ({ ...d, category: e.target.value }))} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '7px 10px', fontSize: 12 }}>
            {CAT_OPTS.map(c => <option key={c} value={c}>{CAT_ICON[c]} {c.replace('_', ' ')}</option>)}
          </select>
          <input type="number" min={1} value={taskDraft.dueDays} onChange={e => setTD(d => ({ ...d, dueDays: Number(e.target.value) }))} style={{ width: 64, border: '1px solid #E2E8F0', borderRadius: 8, padding: '7px 8px', fontSize: 13 }} title="Days from joining" />
          <button onClick={addTask} style={btnP}>+ Add</button>
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Due Days = days from joining date</div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={btnG}>Cancel</button>
          <button onClick={save} disabled={saving || !form.name?.trim()} style={btnP}>{saving ? 'Saving…' : 'Save Template'}</button>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);

  const load = () => {
    setLoading(true);
    api.getOnboardingTemplates().then(data => { setTemplates(data || []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const handleSaved = () => { setShowModal(false); setEditing(null); load(); };
  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return;
    await api.deleteOnboardingTemplate(id);
    load();
  };

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A1628', margin: 0 }}>Onboarding Templates</h1>
          <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>Reusable task checklists applied to new hire preboarding</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }} style={btnP}>+ New Template</button>
      </div>

      {loading ? (
        <div style={{ color: '#9CA3AF', textAlign: 'center', padding: 48 }}>Loading…</div>
      ) : templates.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 56 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 700, color: '#374151', marginBottom: 6 }}>No templates yet</div>
          <div style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 20 }}>Create a template to auto-populate preboarding tasks for new hires</div>
          <button onClick={() => setShowModal(true)} style={btnP}>Create First Template</button>
        </div>
      ) : (
        templates.map(t => (
          <div key={t._id} style={{ ...card, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 800, fontSize: 16, color: '#0A1628' }}>{t.name}</span>
                  {t.isDefault && <span style={{ background: '#D1FAE5', color: '#065F46', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>⭐ Default</span>}
                </div>
                {t.description && <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 10 }}>{t.description}</div>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(t.tasks || []).slice(0, 5).map((task, i) => (
                    <span key={i} style={{ background: '#EFF6FF', color: '#2563EB', borderRadius: 20, padding: '2px 10px', fontSize: 11 }}>
                      {CAT_ICON[task.category]} {task.title}
                    </span>
                  ))}
                  {(t.tasks || []).length > 5 && (
                    <span style={{ background: '#F1F5F9', color: '#64748B', borderRadius: 20, padding: '2px 10px', fontSize: 11 }}>+{t.tasks.length - 5} more</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>{t.tasks?.length || 0} tasks</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setEditing(t); setShowModal(true); }} style={{ ...btnG, padding: '6px 14px', fontSize: 13 }}>Edit</button>
                <button onClick={() => handleDelete(t._id)} style={{ ...btnD, padding: '6px 14px', fontSize: 13 }}>Delete</button>
              </div>
            </div>
          </div>
        ))
      )}

      {showModal && (
        <TemplateModal
          template={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
