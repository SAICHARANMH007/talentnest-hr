import React, { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { card, btnP, btnG, btnD } from '../../constants/styles.js';

const STAGES = ['', 'screening', 'interview_scheduled', 'technical_round', 'hr_round', 'final_round', 'offer'];

const PLACEHOLDER_HINT = '{{candidateName}}, {{jobTitle}}, {{company}}';

const DEFAULT_TEMPLATES = [
  { name: 'General Rejection', stage: '', subject: 'Update on your application at {{company}}', body: 'Hi {{candidateName}},\n\nThank you for your interest in the {{jobTitle}} position at {{company}}. After careful consideration, we have decided to move forward with other candidates whose experience more closely aligns with our current needs.\n\nWe appreciate the time you invested and encourage you to apply for future openings.\n\nBest regards,\nThe {{company}} Team' },
  { name: 'Post-Interview Rejection', stage: 'interview_scheduled', subject: 'Your interview follow-up — {{company}}', body: 'Hi {{candidateName}},\n\nThank you for taking the time to interview for the {{jobTitle}} role. We enjoyed learning about your experience, however we have decided to proceed with another candidate at this time.\n\nWe wish you the very best in your search.\n\nBest,\n{{company}} Hiring Team' },
];

function TemplateModal({ template, onSave, onClose }) {
  const [form, setForm] = useState({
    name: template?.name || '',
    stage: template?.stage || '',
    subject: template?.subject || '',
    body: template?.body || '',
    isDefault: template?.isDefault || false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.subject || !form.body) { setErr('Name, subject and body are required.'); return; }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      setErr(e?.message || 'Save failed.');
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: '#0A1628', marginBottom: 20 }}>
          {template?._id ? 'Edit Template' : 'New Rejection Template'}
        </div>
        {err && <div style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>{err}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Template Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Post-Interview Rejection" style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Stage (optional)</label>
            <select value={form.stage} onChange={e => set('stage', e.target.value)} style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 8, padding: '9px 12px', fontSize: 14 }}>
              {STAGES.map(s => <option key={s} value={s}>{s || '— Any stage —'}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Email Subject *</label>
            <input value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Subject line…" style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Email Body *</label>
            <textarea value={form.body} onChange={e => set('body', e.target.value)} rows={10} placeholder="Email body…" style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }} />
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Available placeholders: {PLACEHOLDER_HINT}</div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.isDefault} onChange={e => set('isDefault', e.target.checked)} />
            Set as default template
          </label>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={handleSave} disabled={saving} style={{ ...btnP, flex: 1 }}>{saving ? 'Saving…' : 'Save Template'}</button>
          <button onClick={onClose} style={{ ...btnG }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function RejectionTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [msg, setMsg]             = useState('');
  const [preview, setPreview]     = useState(null);

  const load = () => {
    setLoading(true);
    api.getRejectionTemplates()
      .then(data => setTemplates(data))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSeed = async () => {
    for (const t of DEFAULT_TEMPLATES) {
      try { await api.createRejectionTemplate(t); } catch {}
    }
    load();
    setMsg('Default templates seeded.');
  };

  const handleSave = async (form) => {
    if (editing?._id) {
      await api.updateRejectionTemplate(editing._id, form);
    } else {
      await api.createRejectionTemplate(form);
    }
    load();
    setMsg('Template saved.');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await api.deleteRejectionTemplate(id);
      load();
      setMsg('Deleted.');
    } catch (e) { setMsg(e?.message || 'Delete failed.'); }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A1628', margin: 0 }}>Rejection Templates</h1>
          <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>Pre-written rejection emails to use when declining candidates</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {templates.length === 0 && !loading && (
            <button onClick={handleSeed} style={{ ...btnG, fontSize: 13 }}>Seed Defaults</button>
          )}
          <button onClick={() => { setEditing(null); setShowModal(true); }} style={{ ...btnP }}>+ New Template</button>
        </div>
      </div>

      {msg && (
        <div style={{ background: '#D1FAE5', color: '#065F46', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
          {msg}
          <button onClick={() => setMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'inherit' }}>×</button>
        </div>
      )}

      {loading ? (
        <div style={{ color: '#9CA3AF', textAlign: 'center', padding: 64 }}>Loading…</div>
      ) : templates.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 64 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✉️</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#0A1628', marginBottom: 6 }}>No templates yet</div>
          <div style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>Create your first rejection template or seed defaults.</div>
          <button onClick={handleSeed} style={{ ...btnG }}>Seed Default Templates</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {templates.map(t => (
            <div key={t._id} style={{ ...card, padding: 18, display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#0A1628' }}>{t.name}</span>
                  {t.isDefault && <span style={{ background: '#DBEAFE', color: '#1D4ED8', fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '2px 8px' }}>DEFAULT</span>}
                  {t.stage && <span style={{ background: '#F3F4F6', color: '#374151', fontSize: 10, fontWeight: 600, borderRadius: 20, padding: '2px 8px', textTransform: 'capitalize' }}>{t.stage.replace(/_/g, ' ')}</span>}
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Subject: {t.subject}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', whiteSpace: 'pre-line', maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.body.substring(0, 120)}{t.body.length > 120 ? '…' : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                <button onClick={() => setPreview(t)} style={{ ...btnG, fontSize: 12, padding: '5px 12px' }}>Preview</button>
                <button onClick={() => { setEditing(t); setShowModal(true); }} style={{ ...btnG, fontSize: 12, padding: '5px 12px' }}>Edit</button>
                <button onClick={() => handleDelete(t._id)} style={{ ...btnD, fontSize: 12, padding: '5px 12px' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <TemplateModal template={editing} onSave={handleSave} onClose={() => { setShowModal(false); setEditing(null); }} />
      )}

      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, padding: 28, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#0A1628', marginBottom: 4 }}>Preview: {preview.name}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>Subject: {preview.subject}</div>
            <pre style={{ background: '#F8FAFC', borderRadius: 10, padding: 16, fontSize: 13, whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: '#374151' }}>{preview.body}</pre>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 10 }}>Placeholders will be replaced when sending.</div>
            <button onClick={() => setPreview(null)} style={{ ...btnG, marginTop: 16 }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
