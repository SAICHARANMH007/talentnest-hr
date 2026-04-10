import React, { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import Modal from '../../components/ui/Modal.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { btnP, btnG, btnD, card, inp } from '../../constants/styles.js';

const TRIGGER_EVENTS = [
  { value: 'stage_changed',        label: '📋 Stage Changed' },
  { value: 'candidate_applied',    label: '📥 Candidate Applied' },
  { value: 'assessment_completed', label: '📝 Assessment Completed' },
  { value: 'interview_scheduled',  label: '📅 Interview Scheduled' },
  { value: 'offer_not_signed',     label: '✉️ Offer Not Signed' },
  { value: 'candidate_stuck',      label: '⏰ Candidate Stuck in Stage' },
];

const ACTION_TYPES = [
  { value: 'send_email',       label: '📧 Send Email' },
  { value: 'send_whatsapp',    label: '💬 Send WhatsApp' },
  { value: 'move_stage',       label: '➡️ Move Stage' },
  { value: 'notify_recruiter', label: '🔔 Notify Recruiter' },
  { value: 'notify_admin',     label: '🔔 Notify Admin' },
];

const CONDITION_FIELDS = [
  { value: 'stage',           label: 'Current Stage' },
  { value: 'candidateSource', label: 'Candidate Source' },
  { value: 'assessmentScore', label: 'Assessment Score' },
];

const OPERATORS = [
  { value: 'equals',     label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'above',      label: 'greater than' },
  { value: 'below',      label: 'less than' },
  { value: 'contains',   label: 'contains' },
];

const PIPELINE_STAGES = [
  'Applied','Screening','Shortlisted',
  'Interview Round 1','Interview Round 2',
  'Offer','Hired','Rejected',
];

const EMPTY_RULE = {
  name    : '',
  isActive: true,
  trigger : { event: 'stage_changed', conditions: [] },
  actions : [],
};

function ActionConfigFields({ action, onChange }) {
  const set = (key, val) => onChange({ ...action, config: { ...action.config, [key]: val } });
  switch (action.type) {
    case 'send_email':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <input style={inp} placeholder="To (leave blank = candidate email)" value={action.config.to || ''} onChange={e => set('to', e.target.value)} />
          <input style={inp} placeholder="Subject (use {{candidateName}} etc.)" value={action.config.subject || ''} onChange={e => set('subject', e.target.value)} />
          <textarea style={{ ...inp, resize: 'vertical' }} rows={3} placeholder="Email body (HTML supported)" value={action.config.body || ''} onChange={e => set('body', e.target.value)} />
        </div>
      );
    case 'send_whatsapp':
      return (
        <div style={{ marginTop: 8 }}>
          <textarea style={{ ...inp, resize: 'vertical' }} rows={2} placeholder="WhatsApp message (use {{candidateName}} etc.)" value={action.config.message || ''} onChange={e => set('message', e.target.value)} />
        </div>
      );
    case 'move_stage':
      return (
        <div style={{ marginTop: 8 }}>
          <select style={inp} value={action.config.stage || ''} onChange={e => set('stage', e.target.value)}>
            <option value="">Select target stage…</option>
            {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      );
    case 'notify_recruiter':
    case 'notify_admin':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <input style={inp} placeholder="Title (use {{candidateName}} etc.)" value={action.config.title || ''} onChange={e => set('title', e.target.value)} />
          <input style={inp} placeholder="Message" value={action.config.message || ''} onChange={e => set('message', e.target.value)} />
        </div>
      );
    default:
      return null;
  }
}

// ── Rule Form Modal ────────────────────────────────────────────────────────────
function RuleFormModal({ rule: initial, onClose, onSaved }) {
  const [form, setForm]     = useState(initial || EMPTY_RULE);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const addCondition = () =>
    setForm(f => ({ ...f, trigger: { ...f.trigger, conditions: [...f.trigger.conditions, { field: 'stage', operator: 'equals', value: '' }] } }));

  const updateCondition = (i, cond) =>
    setForm(f => {
      const conditions = [...f.trigger.conditions];
      conditions[i] = cond;
      return { ...f, trigger: { ...f.trigger, conditions } };
    });

  const removeCondition = (i) =>
    setForm(f => {
      const conditions = f.trigger.conditions.filter((_, idx) => idx !== i);
      return { ...f, trigger: { ...f.trigger, conditions } };
    });

  const addAction = () =>
    setForm(f => ({ ...f, actions: [...f.actions, { type: 'send_email', config: {} }] }));

  const updateAction = (i, action) =>
    setForm(f => {
      const actions = [...f.actions];
      actions[i] = action;
      return { ...f, actions };
    });

  const removeAction = (i) =>
    setForm(f => ({ ...f, actions: f.actions.filter((_, idx) => idx !== i) }));

  const save = async () => {
    if (!form.name.trim()) { setError('Rule name is required.'); return; }
    if (!form.actions.length) { setError('Add at least one action.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name    : form.name.trim(),
        isActive: form.isActive,
        trigger : form.trigger,
        actions : form.actions,
      };
      let saved;
      if (form._id) {
        saved = await api.updateWorkflowRule(form._id, payload);
      } else {
        saved = await api.createWorkflowRule(payload);
      }
      onSaved(saved?.data || saved);
    } catch (e) {
      setError(e.message || 'Failed to save rule.');
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <>
      <button onClick={save} disabled={saving} style={{ ...btnP, flex: 1, opacity: saving ? 0.6 : 1 }}>
        {saving ? <><Spinner /> Saving…</> : (form._id ? '💾 Update Rule' : '✅ Create Rule')}
      </button>
      <button onClick={onClose} style={btnG}>Cancel</button>
    </>
  );

  return (
    <Modal title={form._id ? '✏️ Edit Workflow Rule' : '➕ New Workflow Rule'} onClose={onClose} wide footer={footer}>
      {error && <div style={{ background: 'rgba(186,5,23,0.08)', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#BA0517', fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Rule name */}
        <div>
          <label style={{ color: '#3E3E3C', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Rule Name *</label>
          <input style={inp} placeholder="e.g. Notify recruiter when candidate shortlisted" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>

        {/* Trigger event */}
        <div>
          <label style={{ color: '#3E3E3C', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Trigger Event *</label>
          <select style={inp} value={form.trigger.event} onChange={e => setForm(f => ({ ...f, trigger: { ...f.trigger, event: e.target.value } }))}>
            {TRIGGER_EVENTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {/* Conditions */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ color: '#3E3E3C', fontSize: 12, fontWeight: 600 }}>Conditions (all must match)</label>
            <button onClick={addCondition} style={{ ...btnG, fontSize: 11, padding: '4px 10px' }}>+ Add Condition</button>
          </div>
          {form.trigger.conditions.length === 0 && (
            <div style={{ color: '#9E9D9B', fontSize: 12, padding: '10px 14px', background: '#FAFAF9', borderRadius: 8 }}>No conditions — rule triggers on every event.</div>
          )}
          {form.trigger.conditions.map((cond, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <select style={{ ...inp, flex: 1 }} value={cond.field} onChange={e => updateCondition(i, { ...cond, field: e.target.value })}>
                {CONDITION_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <select style={{ ...inp, flex: 1 }} value={cond.operator} onChange={e => updateCondition(i, { ...cond, operator: e.target.value })}>
                {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input style={{ ...inp, flex: 1 }} placeholder="Value" value={cond.value} onChange={e => updateCondition(i, { ...cond, value: e.target.value })} />
              <button onClick={() => removeCondition(i)} style={{ ...btnD, padding: '8px 12px', fontSize: 14, flexShrink: 0 }}>✕</button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ color: '#3E3E3C', fontSize: 12, fontWeight: 600 }}>Actions *</label>
            <button onClick={addAction} style={{ ...btnP, fontSize: 11, padding: '4px 10px' }}>+ Add Action</button>
          </div>
          {form.actions.length === 0 && (
            <div style={{ color: '#9E9D9B', fontSize: 12, padding: '10px 14px', background: '#FAFAF9', borderRadius: 8 }}>No actions yet — add at least one.</div>
          )}
          {form.actions.map((action, i) => (
            <div key={i} style={{ ...card, padding: 14, marginBottom: 10, border: '1px solid rgba(1,118,211,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <select style={{ ...inp, flex: 1 }} value={action.type} onChange={e => updateAction(i, { ...action, type: e.target.value, config: {} })}>
                  {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
                <button onClick={() => removeAction(i)} style={{ ...btnD, padding: '8px 12px', fontSize: 14, marginLeft: 8, flexShrink: 0 }}>✕</button>
              </div>
              <ActionConfigFields action={action} onChange={updated => updateAction(i, updated)} />
            </div>
          ))}
        </div>

        {/* Active toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} style={{ width: 16, height: 16, accentColor: '#0176D3' }} />
          <span style={{ color: '#3E3E3C', fontSize: 13, fontWeight: 600 }}>Rule is Active</span>
        </label>

        {/* Variable reference */}
        <div style={{ padding: '10px 14px', background: 'rgba(1,118,211,0.04)', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 8 }}>
          <div style={{ color: '#0176D3', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Available Variables</div>
          <div style={{ color: '#706E6B', fontSize: 11, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['{{candidateName}}','{{candidateEmail}}','{{candidatePhone}}','{{jobTitle}}','{{stage}}'].map(v => (
              <code key={v} style={{ background: '#EAF5FE', color: '#0176D3', padding: '2px 6px', borderRadius: 4 }}>{v}</code>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AdminAutomation() {
  const [rules, setRules]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [toast, setToast]       = useState('');
  const [testing, setTesting]   = useState(null);
  const [testResult, setTestResult] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const load = async () => {
    setLoading(true);
    api.getWorkflowRules()
      .then(r => setRules(Array.isArray(r?.data) ? r.data : []))
      .catch(() => setRules([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (rule) => {
    try {
      await api.updateWorkflowRule(rule._id || rule.id, { isActive: !rule.isActive });
      setRules(prev => prev.map(r => (r._id === rule._id || r.id === rule.id) ? { ...r, isActive: !r.isActive } : r));
    } catch (e) { showToast('❌ ' + e.message); }
  };

  const deleteRule = async (rule) => {
    if (!window.confirm(`Delete rule "${rule.name}"?`)) return;
    try {
      await api.deleteWorkflowRule(rule._id || rule.id);
      setRules(prev => prev.filter(r => r._id !== rule._id && r.id !== rule.id));
      showToast('✅ Rule deleted.');
    } catch (e) { showToast('❌ ' + e.message); }
  };

  const testRule = async (rule) => {
    setTesting(rule._id || rule.id);
    setTestResult(null);
    try {
      const r = await api.testWorkflowRule(rule._id || rule.id, {});
      setTestResult({ ruleId: rule._id || rule.id, matched: r.matched, sampleData: r.sampleEventData });
    } catch (e) { showToast('❌ ' + e.message); }
    setTesting(null);
  };

  const onSaved = (saved) => {
    if (!saved) return;
    setRules(prev => {
      const exists = prev.find(r => r._id === saved._id || r.id === saved.id);
      return exists ? prev.map(r => (r._id === saved._id || r.id === saved.id) ? saved : r) : [saved, ...prev];
    });
    setShowForm(false);
    setEditing(null);
    showToast('✅ Rule saved!');
  };

  const getTriggerLabel = (event) => TRIGGER_EVENTS.find(t => t.value === event)?.label || event;

  return (
    <div style={{ maxWidth: 900 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: toast.startsWith('✅') ? 'rgba(16,185,129,0.15)' : 'rgba(186,5,23,0.12)', border: `1px solid ${toast.startsWith('✅') ? 'rgba(16,185,129,0.4)' : 'rgba(186,5,23,0.4)'}`, borderRadius: 12, padding: '12px 20px', color: toast.startsWith('✅') ? '#34d399' : '#BA0517', fontSize: 14, fontWeight: 600 }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#181818', fontSize: 22, fontWeight: 800, margin: 0 }}>⚡ Workflow Automation</h1>
          <p style={{ color: '#706E6B', fontSize: 13, margin: '4px 0 0' }}>Automate emails, notifications, and stage moves based on hiring events.</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} style={btnP}>+ Create Rule</button>
      </div>

      {/* Info banner */}
      <div style={{ background: 'rgba(1,118,211,0.06)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 20 }}>ℹ️</span>
        <div>
          <div style={{ color: '#0176D3', fontSize: 13, fontWeight: 700, marginBottom: 3 }}>How Workflow Rules Work</div>
          <div style={{ color: '#706E6B', fontSize: 12 }}>Rules fire automatically when the selected event occurs. All conditions must match. Actions execute in order. Rules apply only to your organisation's data.</div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>
      ) : rules.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
          <div style={{ color: '#181818', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No automation rules yet</div>
          <div style={{ color: '#706E6B', fontSize: 13, marginBottom: 20 }}>Create your first rule to automate repetitive tasks.</div>
          <button onClick={() => { setEditing(null); setShowForm(true); }} style={btnP}>+ Create First Rule</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rules.map(rule => {
            const isTestingThis = testing === (rule._id || rule.id);
            const thisTestResult = testResult?.ruleId === (rule._id || rule.id) ? testResult : null;
            return (
              <div key={rule._id || rule.id} style={{ ...card, border: `1px solid ${rule.isActive ? 'rgba(1,118,211,0.15)' : 'rgba(0,0,0,0.06)'}`, opacity: rule.isActive ? 1 : 0.65 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ color: '#181818', fontWeight: 700, fontSize: 15 }}>{rule.name}</span>
                      <span style={{ background: rule.isActive ? 'rgba(16,185,129,0.12)' : 'rgba(0,0,0,0.06)', color: rule.isActive ? '#10B981' : '#9E9D9B', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                        {rule.isActive ? '● Active' : '○ Inactive'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span style={{ color: '#706E6B', fontSize: 12 }}>Trigger: <strong style={{ color: '#0176D3' }}>{getTriggerLabel(rule.trigger?.event)}</strong></span>
                      <span style={{ color: '#706E6B', fontSize: 12 }}>Conditions: <strong>{rule.trigger?.conditions?.length || 0}</strong></span>
                      <span style={{ color: '#706E6B', fontSize: 12 }}>Actions: <strong>{rule.actions?.length || 0}</strong></span>
                      {rule.triggerCount > 0 && <span style={{ color: '#706E6B', fontSize: 12 }}>Triggered: <strong>{rule.triggerCount}×</strong></span>}
                      {rule.lastTriggeredAt && <span style={{ color: '#706E6B', fontSize: 12 }}>Last: <strong>{new Date(rule.lastTriggeredAt).toLocaleDateString('en-IN')}</strong></span>}
                    </div>
                    {rule.actions?.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        {rule.actions.map((a, i) => (
                          <span key={i} style={{ background: 'rgba(1,118,211,0.08)', color: '#0176D3', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                            {ACTION_TYPES.find(t => t.value === a.type)?.label || a.type}
                          </span>
                        ))}
                      </div>
                    )}
                    {thisTestResult && (
                      <div style={{ marginTop: 8, padding: '8px 12px', background: thisTestResult.matched ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${thisTestResult.matched ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`, borderRadius: 8 }}>
                        <span style={{ color: thisTestResult.matched ? '#10B981' : '#F59E0B', fontSize: 12, fontWeight: 700 }}>
                          {thisTestResult.matched ? '✅ Dry-run matched — rule would fire.' : '⚠️ Conditions did not match sample data.'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {/* Toggle switch */}
                    <button
                      onClick={() => toggleActive(rule)}
                      style={{ background: rule.isActive ? 'rgba(186,5,23,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${rule.isActive ? '#fca5a5' : 'rgba(16,185,129,0.3)'}`, color: rule.isActive ? '#BA0517' : '#10B981', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      {rule.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => testRule(rule)}
                      disabled={isTestingThis}
                      style={{ ...btnG, fontSize: 12, padding: '6px 12px', opacity: isTestingThis ? 0.6 : 1 }}
                    >
                      {isTestingThis ? <Spinner /> : '▶ Test'}
                    </button>
                    <button onClick={() => { setEditing(rule); setShowForm(true); }} style={{ ...btnP, fontSize: 12, padding: '6px 12px' }}>Edit</button>
                    <button onClick={() => deleteRule(rule)} style={{ ...btnD, fontSize: 12, padding: '6px 12px' }}>Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <RuleFormModal
          rule={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
