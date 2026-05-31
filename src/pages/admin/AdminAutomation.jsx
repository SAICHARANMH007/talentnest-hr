import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/api.js';
import Modal from '../../components/ui/Modal.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { btnP, btnG, btnD, card, inp } from '../../constants/styles.js';

// ── Constants ──────────────────────────────────────────────────────────────────
const TRIGGER_EVENTS = [
  { value: 'candidate_applied',    label: '📥 New Application',          desc: 'Fires when a candidate submits an application' },
  { value: 'stage_changed',        label: '📋 Stage Changed',             desc: 'Fires every time an application moves stages' },
  { value: 'candidate_hired',      label: '🎉 Candidate Hired',           desc: 'Fires when stage is moved to Hired' },
  { value: 'candidate_rejected',   label: '❌ Candidate Rejected',        desc: 'Fires when stage is moved to Rejected' },
  { value: 'interview_scheduled',  label: '📅 Interview Scheduled',       desc: 'Fires when an interview is booked' },
  { value: 'assessment_completed', label: '📝 Assessment Completed',      desc: 'Fires when a candidate submits assessment' },
  { value: 'offer_not_signed',     label: '✉️ Offer Not Signed',          desc: 'Fires for offers pending signature (scheduled)' },
  { value: 'offer_accepted',       label: '🤝 Offer Accepted',            desc: 'Fires when candidate accepts an offer' },
  { value: 'job_published',        label: '🚀 Job Published',             desc: 'Fires when a job goes live' },
  { value: 'candidate_stuck',      label: '⏰ Candidate Stuck in Stage',  desc: 'Fires when no activity for N days (scheduled)' },
];

const ACTION_TYPES = [
  { value: 'send_email',       label: '📧 Send Email',          desc: 'Send an email to the candidate or a custom address' },
  { value: 'send_whatsapp',    label: '💬 Send WhatsApp',        desc: 'Send WhatsApp message via Twilio' },
  { value: 'notify_recruiter', label: '🔔 Notify Recruiter',     desc: 'In-app notification to assigned recruiter' },
  { value: 'notify_admin',     label: '🔔 Notify Admin',         desc: 'In-app notification to org admin' },
  { value: 'move_stage',       label: '➡️ Move to Stage',         desc: 'Automatically advance or move the application' },
  { value: 'assign_tag',       label: '🏷️ Assign Tag',           desc: 'Add a tag to the application' },
  { value: 'add_note',         label: '📝 Add Internal Note',    desc: 'Append an auto-note to the application' },
];

const CONDITION_FIELDS = [
  { value: 'stage',           label: 'Current Stage' },
  { value: 'previousStage',   label: 'Previous Stage' },
  { value: 'candidateSource', label: 'Candidate Source' },
  { value: 'assessmentScore', label: 'Assessment Score' },
  { value: 'jobTitle',        label: 'Job Title' },
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

const CATEGORIES = ['General','Communication','Pipeline','Assessment','Offer','Onboarding'];

const CATEGORY_COLORS = {
  General      : { bg: '#F3F4F6', color: '#374151' },
  Communication: { bg: 'rgba(1,118,211,0.08)', color: '#0176D3' },
  Pipeline     : { bg: 'rgba(16,185,129,0.08)', color: '#059669' },
  Assessment   : { bg: 'rgba(245,158,11,0.08)', color: '#D97706' },
  Offer        : { bg: 'rgba(139,92,246,0.08)', color: '#7C3AED' },
  Onboarding   : { bg: 'rgba(236,72,153,0.08)', color: '#BE185D' },
};

const TEMPLATE_VARS = [
  '{{candidateName}}','{{candidateEmail}}','{{candidatePhone}}',
  '{{jobTitle}}','{{stage}}','{{previousStage}}','{{companyName}}',
];

const EMPTY_RULE = {
  name: '', isActive: true,
  trigger: { event: 'candidate_applied', conditions: [] },
  actions: [],
};

const EMPTY_SYSTEM_RULE = {
  name: '', description: '', category: 'General', systemKey: '', isActive: true,
  trigger: { event: 'candidate_applied', conditions: [] },
  actions: [],
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function getTriggerLabel(event) {
  return TRIGGER_EVENTS.find(t => t.value === event)?.label || event;
}

function CategoryBadge({ cat }) {
  const style = CATEGORY_COLORS[cat] || CATEGORY_COLORS.General;
  return (
    <span style={{ background: style.bg, color: style.color, borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>{cat}</span>
  );
}

// ── Variable Picker ────────────────────────────────────────────────────────────
function VarPicker({ onInsert }) {
  return (
    <div style={{ padding: '10px 14px', background: 'rgba(1,118,211,0.04)', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 8 }}>
      <div style={{ color: '#0176D3', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Click to copy variable</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {TEMPLATE_VARS.map(v => (
          <code
            key={v}
            onClick={() => {
              navigator.clipboard?.writeText(v).catch(() => {});
              onInsert?.(v);
            }}
            style={{ background: '#EAF5FE', color: '#0176D3', padding: '2px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer', border: '1px solid rgba(1,118,211,0.2)', userSelect: 'none' }}
            title="Click to copy"
          >{v}</code>
        ))}
      </div>
    </div>
  );
}

// ── Action Config Fields ───────────────────────────────────────────────────────
function ActionConfigFields({ action, onChange }) {
  const set = (key, val) => onChange({ ...action, config: { ...action.config, [key]: val } });
  const setDelay = (val) => onChange({ ...action, delayMinutes: Number(val) || 0 });

  const delaySelect = (
    <div style={{ marginTop: 10 }}>
      <label style={{ color: '#706E6B', fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>Delay before executing</label>
      <select style={{ ...inp, fontSize: 12 }} value={action.delayMinutes || 0} onChange={e => setDelay(e.target.value)}>
        <option value={0}>Immediately</option>
        <option value={60}>After 1 hour</option>
        <option value={360}>After 6 hours</option>
        <option value={1440}>After 1 day</option>
        <option value={4320}>After 3 days</option>
        <option value={10080}>After 7 days</option>
      </select>
    </div>
  );

  switch (action.type) {
    case 'send_email':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <input style={inp} placeholder="To — leave blank to send to candidate" value={action.config.to || ''} onChange={e => set('to', e.target.value)} />
          <input style={inp} placeholder="Subject (use {{candidateName}} etc.)" value={action.config.subject || ''} onChange={e => set('subject', e.target.value)} />
          <textarea style={{ ...inp, resize: 'vertical' }} rows={3} placeholder="Email body — HTML supported" value={action.config.body || ''} onChange={e => set('body', e.target.value)} />
          {delaySelect}
        </div>
      );
    case 'send_whatsapp':
      return (
        <div style={{ marginTop: 8 }}>
          <textarea style={{ ...inp, resize: 'vertical' }} rows={2} placeholder="WhatsApp message (use {{candidateName}} etc.)" value={action.config.message || ''} onChange={e => set('message', e.target.value)} />
          {delaySelect}
        </div>
      );
    case 'move_stage':
      return (
        <div style={{ marginTop: 8 }}>
          <select style={inp} value={action.config.stage || ''} onChange={e => set('stage', e.target.value)}>
            <option value="">Select target stage…</option>
            {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {delaySelect}
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
    case 'assign_tag':
      return (
        <div style={{ marginTop: 8 }}>
          <input style={inp} placeholder="Tag name (e.g. High Priority, Follow-up)" value={action.config.tag || ''} onChange={e => set('tag', e.target.value)} />
        </div>
      );
    case 'add_note':
      return (
        <div style={{ marginTop: 8 }}>
          <textarea style={{ ...inp, resize: 'vertical' }} rows={2} placeholder="Note text (use {{candidateName}}, {{stage}} etc.)" value={action.config.note || ''} onChange={e => set('note', e.target.value)} />
        </div>
      );
    default: return null;
  }
}

// ── Rule Form (shared by custom + system) ─────────────────────────────────────
function RuleFormModal({ rule: initial, isSystem = false, onClose, onSaved }) {
  const [form, setForm]     = useState(initial || (isSystem ? EMPTY_SYSTEM_RULE : EMPTY_RULE));
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const addCondition = () =>
    setForm(f => ({ ...f, trigger: { ...f.trigger, conditions: [...f.trigger.conditions, { field: 'stage', operator: 'equals', value: '' }] } }));
  const updateCondition = (i, cond) =>
    setForm(f => { const c = [...f.trigger.conditions]; c[i] = cond; return { ...f, trigger: { ...f.trigger, conditions: c } }; });
  const removeCondition = (i) =>
    setForm(f => ({ ...f, trigger: { ...f.trigger, conditions: f.trigger.conditions.filter((_, idx) => idx !== i) } }));
  const addAction = () =>
    setForm(f => ({ ...f, actions: [...f.actions, { type: 'send_email', config: {}, delayMinutes: 0 }] }));
  const updateAction = (i, action) =>
    setForm(f => { const a = [...f.actions]; a[i] = action; return { ...f, actions: a }; });
  const removeAction = (i) =>
    setForm(f => ({ ...f, actions: f.actions.filter((_, idx) => idx !== i) }));

  const save = async () => {
    if (!form.name.trim()) { setError('Rule name is required.'); return; }
    if (!form.actions.length) { setError('Add at least one action.'); return; }
    if (isSystem && !form.systemKey.trim()) { setError('System key is required.'); return; }
    setSaving(true); setError('');
    try {
      const id = form._id || form.id;
      let saved;
      if (isSystem) {
        const payload = { name: form.name.trim(), description: form.description, category: form.category, systemKey: form.systemKey.trim(), trigger: form.trigger, actions: form.actions, isActive: form.isActive };
        saved = id ? await api.updateSystemWorkflowRule(id, payload) : await api.createSystemWorkflowRule(payload);
      } else {
        const payload = { name: form.name.trim(), isActive: form.isActive, trigger: form.trigger, actions: form.actions };
        saved = id ? await api.updateWorkflowRule(id, payload) : await api.createWorkflowRule(payload);
      }
      onSaved(saved?.data || saved);
    } catch (e) { setError(e.message || 'Failed to save rule.'); }
    finally { setSaving(false); }
  };

  const footer = (
    <>
      <button onClick={save} disabled={saving} style={{ ...btnP, flex: 1, opacity: saving ? 0.6 : 1 }}>
        {saving ? <><Spinner /> Saving…</> : (form._id || form.id) ? '💾 Update' : '✅ Create Rule'}
      </button>
      <button onClick={onClose} style={btnG}>Cancel</button>
    </>
  );

  return (
    <Modal title={(form._id || form.id) ? '✏️ Edit Automation Rule' : '➕ New Automation Rule'} onClose={onClose} wide footer={footer}>
      {error && <div style={{ background: 'rgba(186,5,23,0.08)', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#BA0517', fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ color: '#3E3E3C', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Rule Name *</label>
          <input style={inp} placeholder="e.g. Notify recruiter when candidate shortlisted" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        {isSystem && (
          <>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#3E3E3C', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>System Key * <span style={{ color: '#9E9D9B', fontWeight: 400 }}>(unique, snake_case)</span></label>
                <input style={inp} placeholder="e.g. welcome_on_apply" value={form.systemKey} onChange={e => setForm(f => ({ ...f, systemKey: e.target.value }))} disabled={Boolean(form._id || form.id)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#3E3E3C', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Category</label>
                <select style={inp} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ color: '#3E3E3C', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Description</label>
              <textarea style={{ ...inp, resize: 'vertical' }} rows={2} placeholder="What does this automation do?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </>
        )}

        {/* Trigger */}
        <div>
          <label style={{ color: '#3E3E3C', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Trigger Event *</label>
          <select style={inp} value={form.trigger.event} onChange={e => setForm(f => ({ ...f, trigger: { ...f.trigger, event: e.target.value } }))}>
            {TRIGGER_EVENTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div style={{ color: '#9E9D9B', fontSize: 11, marginTop: 4 }}>
            {TRIGGER_EVENTS.find(t => t.value === form.trigger.event)?.desc}
          </div>
        </div>

        {/* Conditions */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ color: '#3E3E3C', fontSize: 12, fontWeight: 600 }}>Conditions <span style={{ color: '#9E9D9B', fontWeight: 400 }}>(all must match)</span></label>
            <button onClick={addCondition} style={{ ...btnG, fontSize: 11, padding: '4px 10px' }}>+ Add Condition</button>
          </div>
          {form.trigger.conditions.length === 0 ? (
            <div style={{ color: '#9E9D9B', fontSize: 12, padding: '10px 14px', background: '#FAFAF9', borderRadius: 8 }}>No conditions — triggers on every matching event.</div>
          ) : form.trigger.conditions.map((cond, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <select style={{ ...inp, flex: 1 }} value={cond.field} onChange={e => updateCondition(i, { ...cond, field: e.target.value })}>
                {CONDITION_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <select style={{ ...inp, flex: 1 }} value={cond.operator} onChange={e => updateCondition(i, { ...cond, operator: e.target.value })}>
                {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {cond.field === 'stage' || cond.field === 'previousStage' ? (
                <select style={{ ...inp, flex: 1 }} value={cond.value} onChange={e => updateCondition(i, { ...cond, value: e.target.value })}>
                  <option value="">Select stage…</option>
                  {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input style={{ ...inp, flex: 1 }} placeholder="Value" value={cond.value} onChange={e => updateCondition(i, { ...cond, value: e.target.value })} />
              )}
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
          {form.actions.length === 0 ? (
            <div style={{ color: '#9E9D9B', fontSize: 12, padding: '10px 14px', background: '#FAFAF9', borderRadius: 8 }}>No actions yet — add at least one.</div>
          ) : form.actions.map((action, i) => (
            <div key={i} style={{ ...card, padding: 14, marginBottom: 10, border: '1px solid rgba(1,118,211,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <select style={{ ...inp, flex: 1 }} value={action.type} onChange={e => updateAction(i, { ...action, type: e.target.value, config: {}, delayMinutes: 0 })}>
                  {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
                <button onClick={() => removeAction(i)} style={{ ...btnD, padding: '8px 12px', fontSize: 14, marginLeft: 8, flexShrink: 0 }}>✕</button>
              </div>
              <div style={{ fontSize: 11, color: '#9E9D9B', marginTop: 4 }}>
                {ACTION_TYPES.find(t => t.value === action.type)?.desc}
              </div>
              <ActionConfigFields action={action} onChange={updated => updateAction(i, updated)} />
            </div>
          ))}
        </div>

        <VarPicker />

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} style={{ width: 16, height: 16, accentColor: '#0176D3' }} />
          <span style={{ color: '#3E3E3C', fontSize: 13, fontWeight: 600 }}>Rule is Active</span>
        </label>
      </div>
    </Modal>
  );
}

// ── Custom Rule Card ───────────────────────────────────────────────────────────
function CustomRuleCard({ rule, onToggle, onEdit, onDelete, onTest, onDuplicate, testing, testResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ ...card, border: `1px solid ${rule.isActive ? 'rgba(1,118,211,0.15)' : 'rgba(0,0,0,0.06)'}`, opacity: rule.isActive ? 1 : 0.65 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ color: '#181818', fontWeight: 700, fontSize: 15 }}>{rule.name}</span>
            <span style={{ background: rule.isActive ? 'rgba(16,185,129,0.12)' : 'rgba(0,0,0,0.06)', color: rule.isActive ? '#10B981' : '#9E9D9B', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
              {rule.isActive ? '● Active' : '○ Paused'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ color: '#706E6B', fontSize: 12 }}>When: <strong style={{ color: '#0176D3' }}>{getTriggerLabel(rule.trigger?.event)}</strong></span>
            <span style={{ color: '#706E6B', fontSize: 12 }}>Conditions: <strong>{rule.trigger?.conditions?.length || 0}</strong></span>
            <span style={{ color: '#706E6B', fontSize: 12 }}>Actions: <strong>{rule.actions?.length || 0}</strong></span>
            <span style={{ color: '#706E6B', fontSize: 12 }}>Triggered: <strong>{rule.triggerCount || 0}×</strong></span>
            {rule.lastTriggeredAt && <span style={{ color: '#706E6B', fontSize: 12 }}>Last: <strong>{new Date(rule.lastTriggeredAt).toLocaleDateString('en-IN')}</strong></span>}
          </div>
          {rule.actions?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {rule.actions.map((a, i) => (
                <span key={i} style={{ background: 'rgba(1,118,211,0.08)', color: '#0176D3', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                  {ACTION_TYPES.find(t => t.value === a.type)?.label || a.type}
                  {a.delayMinutes > 0 && <span style={{ color: '#9E9D9B', fontWeight: 400, marginLeft: 4 }}>+{a.delayMinutes >= 1440 ? `${a.delayMinutes/1440}d` : `${a.delayMinutes/60}h`}</span>}
                </span>
              ))}
            </div>
          )}
          {testResult && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: testResult.matched ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${testResult.matched ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`, borderRadius: 8 }}>
              <span style={{ color: testResult.matched ? '#10B981' : '#F59E0B', fontSize: 12, fontWeight: 700 }}>
                {testResult.matched ? '✅ Dry-run matched — rule would fire.' : '⚠️ Conditions did not match sample data.'}
              </span>
            </div>
          )}
          {/* Expand: show conditions detail */}
          {expanded && rule.trigger?.conditions?.length > 0 && (
            <div style={{ marginTop: 10, padding: '10px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#706E6B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>Conditions</div>
              {rule.trigger.conditions.map((c, i) => (
                <div key={i} style={{ fontSize: 12, color: '#374151', marginBottom: 3 }}>
                  • {c.field} <em>{c.operator}</em> "<strong>{c.value}</strong>"
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
          <button onClick={() => setExpanded(e => !e)} style={{ ...btnG, fontSize: 12, padding: '6px 10px' }} title="Show details">
            {expanded ? '▲' : '▼'}
          </button>
          <button onClick={onToggle} style={{ background: rule.isActive ? 'rgba(186,5,23,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${rule.isActive ? '#fca5a5' : 'rgba(16,185,129,0.3)'}`, color: rule.isActive ? '#BA0517' : '#10B981', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {rule.isActive ? 'Pause' : 'Resume'}
          </button>
          <button onClick={onTest} disabled={testing} style={{ ...btnG, fontSize: 12, padding: '6px 12px', opacity: testing ? 0.6 : 1 }}>
            {testing ? <Spinner /> : '▶ Test'}
          </button>
          <button onClick={onDuplicate} style={{ ...btnG, fontSize: 12, padding: '6px 12px' }} title="Duplicate rule">⧉</button>
          <button onClick={onEdit} style={{ ...btnP, fontSize: 12, padding: '6px 12px' }}>Edit</button>
          <button onClick={onDelete} style={{ ...btnD, fontSize: 12, padding: '6px 12px' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── System Template Card (super_admin view) ────────────────────────────────────
function SystemTemplateCard({ tpl, onEdit, onDelete }) {
  return (
    <div style={{ ...card, border: '1px solid rgba(139,92,246,0.15)', background: tpl.isActive ? '#FAFAFA' : '#F9F9F9', opacity: tpl.isActive ? 1 : 0.7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ color: '#181818', fontWeight: 700, fontSize: 15 }}>{tpl.name}</span>
            <CategoryBadge cat={tpl.category} />
            <span style={{ background: tpl.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.06)', color: tpl.isActive ? '#059669' : '#9E9D9B', borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>
              {tpl.isActive ? '● Enabled' : '○ Disabled'}
            </span>
          </div>
          {tpl.description && <p style={{ color: '#706E6B', fontSize: 12, margin: '0 0 8px', lineHeight: 1.5 }}>{tpl.description}</p>}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ color: '#706E6B', fontSize: 12 }}>Trigger: <strong style={{ color: '#7C3AED' }}>{getTriggerLabel(tpl.trigger?.event)}</strong></span>
            <span style={{ color: '#706E6B', fontSize: 12 }}>Key: <code style={{ background: '#F3F4F6', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>{tpl.systemKey}</code></span>
            <span style={{ color: '#706E6B', fontSize: 12 }}>Actions: <strong>{tpl.actions?.length || 0}</strong></span>
            <span style={{ color: '#706E6B', fontSize: 12 }}>🏢 Active in <strong>{tpl.orgCount || 0}</strong> org{tpl.orgCount !== 1 ? 's' : ''}</span>
            {tpl.totalTriggers > 0 && <span style={{ color: '#706E6B', fontSize: 12 }}>⚡ <strong>{tpl.totalTriggers}</strong> executions</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={onEdit} style={{ ...btnP, fontSize: 12, padding: '6px 12px', background: 'rgba(139,92,246,0.1)', color: '#7C3AED', border: '1px solid rgba(139,92,246,0.3)' }}>Edit</button>
          <button onClick={onDelete} style={{ ...btnD, fontSize: 12, padding: '6px 12px' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Standard Automation Row (admin view) ───────────────────────────────────────
function StandardAutomationRow({ tpl, onActivate, onDeactivate, toggling }) {
  const activated = tpl.activated;
  const copy = tpl.orgCopy;
  return (
    <div style={{ ...card, border: `1px solid ${activated ? 'rgba(16,185,129,0.2)' : 'rgba(0,0,0,0.06)'}`, background: activated ? 'rgba(16,185,129,0.02)' : '#FAFAF9' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ color: '#181818', fontWeight: 700, fontSize: 14 }}>{tpl.name}</span>
            <CategoryBadge cat={tpl.category} />
            {activated && (
              <span style={{ background: 'rgba(16,185,129,0.1)', color: '#059669', borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>● ON</span>
            )}
          </div>
          {tpl.description && <p style={{ color: '#706E6B', fontSize: 12, margin: '0 0 4px', lineHeight: 1.5 }}>{tpl.description}</p>}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ color: '#9E9D9B', fontSize: 11 }}>When: <strong style={{ color: '#0176D3' }}>{getTriggerLabel(tpl.trigger?.event)}</strong></span>
            <span style={{ color: '#9E9D9B', fontSize: 11 }}>Actions: <strong>{tpl.actions?.length || 0}</strong></span>
            {activated && copy?.triggerCount > 0 && (
              <span style={{ color: '#9E9D9B', fontSize: 11 }}>Fired <strong>{copy.triggerCount}×</strong></span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ color: activated ? '#059669' : '#9E9D9B', fontSize: 12, fontWeight: 600 }}>{activated ? 'Active' : 'Off'}</span>
          <button
            disabled={toggling}
            onClick={activated ? onDeactivate : onActivate}
            style={{
              width: 44, height: 24, borderRadius: 12,
              background: activated ? '#059669' : '#D1D5DB',
              border: 'none', cursor: toggling ? 'not-allowed' : 'pointer',
              position: 'relative', transition: 'background 0.2s',
              opacity: toggling ? 0.6 : 1,
            }}
          >
            <span style={{
              position: 'absolute', top: 3, left: activated ? 22 : 3,
              width: 18, height: 18, borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stats Bar ──────────────────────────────────────────────────────────────────
function StatsBar({ rules }) {
  const active    = rules.filter(r => r.isActive).length;
  const total     = rules.length;
  const executions = rules.reduce((s, r) => s + (r.triggerCount || 0), 0);
  const lastRun   = rules.reduce((latest, r) => {
    if (!r.lastTriggeredAt) return latest;
    return !latest || new Date(r.lastTriggeredAt) > new Date(latest) ? r.lastTriggeredAt : latest;
  }, null);

  const stats = [
    { label: 'Total Rules',  value: total,      color: '#0176D3' },
    { label: 'Active',       value: active,     color: '#10B981' },
    { label: 'Total Fired',  value: executions, color: '#7C3AED' },
    { label: 'Last Run',     value: lastRun ? new Date(lastRun).toLocaleDateString('en-IN') : 'Never', color: '#F59E0B', small: true },
  ];

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
      {stats.map(s => (
        <div key={s.label} style={{ ...card, flex: 1, minWidth: 120, textAlign: 'center', padding: '14px 20px' }}>
          <div style={{ color: s.color, fontSize: s.small ? 14 : 22, fontWeight: 800 }}>{s.value}</div>
          <div style={{ color: '#706E6B', fontSize: 11, marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Admin View (org admin) ─────────────────────────────────────────────────────
function AdminView() {
  const [customRules, setCustomRules]       = useState([]);
  const [systemTemplates, setSystemTemplates] = useState([]);
  const [loading, setLoading]               = useState(true);
  const [showForm, setShowForm]             = useState(false);
  const [editing, setEditing]               = useState(null);
  const [toast, setToast]                   = useState('');
  const [testing, setTesting]               = useState(null);
  const [testResults, setTestResults]       = useState({});
  const [toggling, setToggling]             = useState({});
  const [triggerFilter, setTriggerFilter]   = useState('all');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getWorkflowRules();
      setCustomRules(Array.isArray(r?.data) ? r.data : []);
      setSystemTemplates(Array.isArray(r?.systemTemplates) ? r.systemTemplates : []);
    } catch { setCustomRules([]); setSystemTemplates([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleCustom = async (rule) => {
    try {
      await api.updateWorkflowRule(rule._id || rule.id, { isActive: !rule.isActive });
      setCustomRules(prev => prev.map(r => (r._id === rule._id || r.id === rule.id) ? { ...r, isActive: !r.isActive } : r));
    } catch (e) { showToast('❌ ' + e.message); }
  };

  const deleteCustom = async (rule) => {
    if (!window.confirm(`Delete rule "${rule.name}"?`)) return;
    try {
      await api.deleteWorkflowRule(rule._id || rule.id);
      setCustomRules(prev => prev.filter(r => r._id !== rule._id && r.id !== rule.id));
      showToast('✅ Rule deleted.');
    } catch (e) { showToast('❌ ' + e.message); }
  };

  const duplicateRule = async (rule) => {
    try {
      const payload = {
        name: `${rule.name} (copy)`,
        isActive: false,
        trigger: rule.trigger,
        actions: rule.actions,
      };
      const saved = await api.createWorkflowRule(payload);
      setCustomRules(prev => [saved?.data || saved, ...prev]);
      showToast('✅ Rule duplicated — it is paused by default.');
    } catch (e) { showToast('❌ ' + e.message); }
  };

  const testRule = async (rule) => {
    const rid = rule._id || rule.id;
    setTesting(rid); setTestResults(prev => ({ ...prev, [rid]: null }));
    try {
      const r = await api.testWorkflowRule(rid, {});
      setTestResults(prev => ({ ...prev, [rid]: { matched: r.matched } }));
    } catch (e) { showToast('❌ ' + e.message); }
    setTesting(null);
  };

  const onSaved = (saved) => {
    if (!saved) return;
    setCustomRules(prev => {
      const exists = prev.find(r => r._id === saved._id || r.id === saved.id);
      return exists ? prev.map(r => (r._id === saved._id || r.id === saved.id) ? saved : r) : [saved, ...prev];
    });
    setShowForm(false); setEditing(null);
    showToast('✅ Rule saved!');
  };

  const handleActivate = async (tpl) => {
    const key = tpl.systemKey;
    setToggling(prev => ({ ...prev, [key]: true }));
    try {
      await api.activateSystemAutomation(key);
      setSystemTemplates(prev => prev.map(t => t.systemKey === key ? { ...t, activated: true, orgCopy: { triggerCount: 0 } } : t));
      showToast('✅ Automation enabled for your org.');
    } catch (e) { showToast('❌ ' + e.message); }
    setToggling(prev => ({ ...prev, [key]: false }));
  };

  const handleDeactivate = async (tpl) => {
    const key = tpl.systemKey;
    if (!window.confirm(`Disable "${tpl.name}" for your organisation?`)) return;
    setToggling(prev => ({ ...prev, [key]: true }));
    try {
      await api.deactivateSystemAutomation(key);
      setSystemTemplates(prev => prev.map(t => t.systemKey === key ? { ...t, activated: false, orgCopy: null } : t));
      showToast('✅ Automation disabled.');
    } catch (e) { showToast('❌ ' + e.message); }
    setToggling(prev => ({ ...prev, [key]: false }));
  };

  const filteredRules = triggerFilter === 'all'
    ? customRules
    : customRules.filter(r => r.trigger?.event === triggerFilter);

  return (
    <div style={{ maxWidth: 920 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: toast.startsWith('✅') ? 'rgba(16,185,129,0.15)' : 'rgba(186,5,23,0.12)', border: `1px solid ${toast.startsWith('✅') ? 'rgba(16,185,129,0.4)' : 'rgba(186,5,23,0.4)'}`, borderRadius: 12, padding: '12px 20px', color: toast.startsWith('✅') ? '#34d399' : '#BA0517', fontSize: 14, fontWeight: 600 }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#181818', fontSize: 22, fontWeight: 800, margin: 0 }}>⚡ Automation Engine</h1>
          <p style={{ color: '#706E6B', fontSize: 13, margin: '4px 0 0' }}>Automate emails, notifications, and pipeline actions. Standard automations are pre-built; custom ones are yours to configure.</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} style={btnP}>+ New Rule</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spinner /></div>
      ) : (
        <>
          {/* Stats */}
          {customRules.length > 0 && <StatsBar rules={customRules} />}

          {/* Standard Automations */}
          {systemTemplates.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <h2 style={{ color: '#181818', fontSize: 16, fontWeight: 700, margin: 0 }}>🏛 Standard Automations</h2>
                <span style={{ background: 'rgba(1,118,211,0.08)', color: '#0176D3', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                  {systemTemplates.filter(t => t.activated).length} / {systemTemplates.length} active
                </span>
              </div>
              <div style={{ background: 'rgba(1,118,211,0.04)', border: '1px solid rgba(1,118,211,0.12)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#706E6B' }}>
                Platform-wide templates. Toggle them on/off — they only run against your organisation's data.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {systemTemplates.map(tpl => (
                  <StandardAutomationRow
                    key={tpl.systemKey}
                    tpl={tpl}
                    toggling={Boolean(toggling[tpl.systemKey])}
                    onActivate={() => handleActivate(tpl)}
                    onDeactivate={() => handleDeactivate(tpl)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Custom Automations */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ color: '#181818', fontSize: 16, fontWeight: 700, margin: 0 }}>🔧 Custom Automations</h2>
                <span style={{ background: 'rgba(1,118,211,0.08)', color: '#0176D3', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                  {filteredRules.length}{triggerFilter !== 'all' ? ` of ${customRules.length}` : ''} rule{customRules.length !== 1 ? 's' : ''}
                </span>
              </div>
              {/* Filter by trigger */}
              {customRules.length > 0 && (
                <select style={{ ...inp, width: 'auto', fontSize: 12, padding: '6px 10px' }} value={triggerFilter} onChange={e => setTriggerFilter(e.target.value)}>
                  <option value="all">All triggers</option>
                  {TRIGGER_EVENTS.map(t => <option key={t.value} value={t.value}>{t.label.replace(/^[^ ]+ /, '')}</option>)}
                </select>
              )}
            </div>

            {customRules.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: '40px 24px' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🔧</div>
                <div style={{ color: '#181818', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No custom rules yet</div>
                <div style={{ color: '#706E6B', fontSize: 13, marginBottom: 18 }}>Build automation rules for your recruitment pipeline — emails, notifications, stage moves, and more.</div>
                <button onClick={() => { setEditing(null); setShowForm(true); }} style={btnP}>+ Create First Rule</button>
              </div>
            ) : filteredRules.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: '24px', color: '#9E9D9B' }}>No rules for this trigger.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredRules.map(rule => (
                  <CustomRuleCard
                    key={rule._id || rule.id}
                    rule={rule}
                    testing={testing === (rule._id || rule.id)}
                    testResult={testResults[rule._id || rule.id]}
                    onToggle={() => toggleCustom(rule)}
                    onEdit={() => { setEditing(rule); setShowForm(true); }}
                    onDelete={() => deleteCustom(rule)}
                    onTest={() => testRule(rule)}
                    onDuplicate={() => duplicateRule(rule)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {showForm && (
        <RuleFormModal
          rule={editing}
          isSystem={false}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

// ── Super Admin View ───────────────────────────────────────────────────────────
function SuperAdminView() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [toast, setToast]         = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getSystemWorkflowRules();
      setTemplates(Array.isArray(r?.data) ? r.data : []);
    } catch { setTemplates([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteTpl = async (tpl) => {
    if (!window.confirm(`Delete system template "${tpl.name}"? This will also deactivate it for all organisations.`)) return;
    try {
      await api.deleteSystemWorkflowRule(tpl._id || tpl.id);
      setTemplates(prev => prev.filter(t => t._id !== tpl._id && t.id !== tpl.id));
      showToast('✅ Template deleted.');
    } catch (e) { showToast('❌ ' + e.message); }
  };

  const onSaved = (saved) => {
    if (!saved) return;
    setTemplates(prev => {
      const exists = prev.find(t => t._id === saved._id || t.id === saved.id);
      return exists ? prev.map(t => (t._id === saved._id || t.id === saved.id) ? saved : t) : [saved, ...prev];
    });
    setShowForm(false); setEditing(null);
    showToast('✅ Template saved!');
  };

  const byCategory = templates.reduce((acc, t) => {
    const cat = t.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  const totalOrgs     = templates.reduce((s, t) => s + (t.orgCount || 0), 0);
  const totalTriggers = templates.reduce((s, t) => s + (t.totalTriggers || 0), 0);

  return (
    <div style={{ maxWidth: 960 }}>
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: toast.startsWith('✅') ? 'rgba(16,185,129,0.15)' : 'rgba(186,5,23,0.12)', border: `1px solid ${toast.startsWith('✅') ? 'rgba(16,185,129,0.4)' : 'rgba(186,5,23,0.4)'}`, borderRadius: 12, padding: '12px 20px', color: toast.startsWith('✅') ? '#34d399' : '#BA0517', fontSize: 14, fontWeight: 600 }}>{toast}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#181818', fontSize: 22, fontWeight: 800, margin: 0 }}>⚡ System Automation Templates</h1>
          <p style={{ color: '#706E6B', fontSize: 13, margin: '4px 0 0' }}>Platform-wide automation templates that each organisation can independently enable.</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} style={{ ...btnP, background: '#7C3AED' }}>+ New Template</button>
      </div>

      {templates.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Templates', value: templates.length, color: '#7C3AED' },
            { label: 'Org Activations', value: totalOrgs, color: '#059669' },
            { label: 'Total Executions', value: totalTriggers, color: '#0176D3' },
          ].map(s => (
            <div key={s.label} style={{ ...card, flex: 1, minWidth: 120, textAlign: 'center', padding: '14px 20px' }}>
              <div style={{ color: s.color, fontSize: 22, fontWeight: 800 }}>{s.value}</div>
              <div style={{ color: '#706E6B', fontSize: 12, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spinner /></div>
      ) : templates.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '56px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
          <div style={{ color: '#181818', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No system templates yet</div>
          <div style={{ color: '#706E6B', fontSize: 13, marginBottom: 20 }}>Create platform-wide automation templates that organisations can activate for their teams.</div>
          <button onClick={() => { setEditing(null); setShowForm(true); }} style={{ ...btnP, background: '#7C3AED' }}>+ Create First Template</button>
        </div>
      ) : (
        Object.entries(byCategory).map(([cat, items]) => (
          <section key={cat} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <CategoryBadge cat={cat} />
              <span style={{ color: '#9E9D9B', fontSize: 12 }}>{items.length} template{items.length !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map(tpl => (
                <SystemTemplateCard
                  key={tpl._id || tpl.id}
                  tpl={tpl}
                  onEdit={() => { setEditing(tpl); setShowForm(true); }}
                  onDelete={() => deleteTpl(tpl)}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {showForm && (
        <RuleFormModal
          rule={editing}
          isSystem={true}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

// ── Main Export ────────────────────────────────────────────────────────────────
export default function AdminAutomation() {
  const [role] = useState(() => {
    try {
      const u = JSON.parse(sessionStorage.getItem('tn_user') || localStorage.getItem('tn_user') || '{}');
      return u?.role || '';
    } catch { return ''; }
  });

  return role === 'super_admin' ? <SuperAdminView /> : <AdminView />;
}
