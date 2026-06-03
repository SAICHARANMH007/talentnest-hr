import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../api/api.js';
import { card, btnP, btnD, btnG } from '../../constants/styles.js';

const EVENT_GROUPS = [
  {
    group: '📋 Applications',
    events: [
      { value: 'application.created',       label: 'Application Created',        desc: 'Fires when a new application is submitted' },
      { value: 'application.stage_changed', label: 'Stage Changed',              desc: 'Fires when an application moves to a new stage' },
      { value: 'application.hired',         label: 'Candidate Hired',            desc: 'Fires when a candidate is moved to Hired stage' },
      { value: 'application.rejected',      label: 'Candidate Rejected',         desc: 'Fires when a candidate is rejected' },
      { value: 'application.shortlisted',   label: 'Candidate Shortlisted',      desc: 'Fires when a candidate is shortlisted' },
      { value: 'application.withdrawn',     label: 'Application Withdrawn',      desc: 'Fires when a candidate withdraws their application' },
    ],
  },
  {
    group: '📅 Interviews',
    events: [
      { value: 'interview.scheduled',       label: 'Interview Scheduled',        desc: 'Fires when an interview is booked' },
      { value: 'interview.completed',       label: 'Interview Completed',        desc: 'Fires when an interview is marked as done' },
      { value: 'interview.cancelled',       label: 'Interview Cancelled',        desc: 'Fires when an interview is cancelled' },
    ],
  },
  {
    group: '📄 Offers',
    events: [
      { value: 'offer.sent',                label: 'Offer Sent',                 desc: 'Fires when an offer letter is sent to a candidate' },
      { value: 'offer.accepted',            label: 'Offer Accepted',             desc: 'Fires when a candidate accepts an offer' },
      { value: 'offer.declined',            label: 'Offer Declined',             desc: 'Fires when a candidate declines an offer' },
    ],
  },
  {
    group: '💼 Jobs',
    events: [
      { value: 'job.created',               label: 'Job Created',                desc: 'Fires when a new job is posted' },
      { value: 'job.published',             label: 'Job Published',              desc: 'Fires when a job is published to the careers page' },
      { value: 'job.closed',                label: 'Job Closed',                 desc: 'Fires when a job is closed' },
      { value: 'job.approved',              label: 'Job Approved',               desc: 'Fires when a job is approved by admin' },
    ],
  },
  {
    group: '🎯 Onboarding & BGV',
    events: [
      { value: 'onboarding.initiated',      label: 'Onboarding Started',         desc: 'Fires when pre-boarding is initiated for a candidate' },
      { value: 'onboarding.completed',      label: 'Onboarding Completed',       desc: 'Fires when pre-boarding tasks are all done' },
      { value: 'bgv.submitted',             label: 'BGV Submitted',              desc: 'Fires when a candidate submits BGV documents' },
    ],
  },
];

const EVENTS = EVENT_GROUPS.flatMap(g => g.events);

const STATUS_DOT = { width: 10, height: 10, borderRadius: '50%', display: 'inline-block', marginRight: 6 };

function WebhookModal({ hook, onClose, onSaved }) {
  const isEdit = !!hook?._id;
  const [form, setForm] = useState({
    name:     hook?.name     || '',
    url:      hook?.url      || '',
    secret:   hook?.secret   || '',
    isActive: hook?.isActive !== false,
    events:   hook?.events   || [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const toggleEvent = (ev) => setForm(f => ({
    ...f,
    events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev],
  }));

  const save = async () => {
    if (!form.name.trim()) return setError('Name is required.');
    if (!form.url.trim())  return setError('URL is required.');
    try { new URL(form.url); } catch { return setError('Enter a valid URL (must start with https://).'); }
    if (!form.events.length) return setError('Select at least one event.');
    setSaving(true); setError('');
    try {
      if (isEdit) await api.updateWebhook(hook._id, form);
      else        await api.createWebhook(form);
      onSaved();
    } catch (e) {
      setError(e?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13, boxSizing: 'border-box', outline: 'none' };
  const lbl = { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...card, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>{isEdit ? 'Edit Webhook' : 'New Webhook'}</h2>

        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Name</label>
          <input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Slack Alerts" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Endpoint URL</label>
          <input style={inp} value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://hooks.example.com/tn" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Secret (optional — used for HMAC SHA-256 signature)</label>
          <input style={inp} value={form.secret} onChange={e => setForm(f => ({ ...f, secret: e.target.value }))} placeholder="Leave blank to skip signing" type="password" />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={lbl}>Events to subscribe</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={() => setForm(f => ({ ...f, events: EVENTS.map(e => e.value) }))}
                style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid #D1D5DB', background: '#F9FAFB', cursor: 'pointer', color: '#374151', fontWeight: 600 }}>
                Select All
              </button>
              <button type="button" onClick={() => setForm(f => ({ ...f, events: [] }))}
                style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid #D1D5DB', background: '#F9FAFB', cursor: 'pointer', color: '#374151', fontWeight: 600 }}>
                Clear
              </button>
            </div>
          </div>
          {EVENT_GROUPS.map(g => (
            <div key={g.group} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{g.group}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {g.events.map(ev => (
                  <label key={ev.value} title={ev.desc} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, cursor: 'pointer', padding: '7px 8px', borderRadius: 6, background: form.events.includes(ev.value) ? '#EFF6FF' : '#F9FAFB', border: `1px solid ${form.events.includes(ev.value) ? '#93C5FD' : '#E5E7EB'}` }}>
                    <input type="checkbox" checked={form.events.includes(ev.value)} onChange={() => toggleEvent(ev.value)} style={{ cursor: 'pointer', marginTop: 1, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: form.events.includes(ev.value) ? 700 : 500, color: form.events.includes(ev.value) ? '#1D4ED8' : '#374151' }}>{ev.label}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>{ev.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
            Active (will receive events immediately)
          </label>
        </div>

        {error && <p style={{ color: '#DC2626', fontSize: 12, marginBottom: 10 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button style={btnG} onClick={onClose}>Cancel</button>
          <button style={btnP} onClick={save} disabled={saving}>{saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Create Webhook')}</button>
        </div>
      </div>
    </div>
  );
}

function DeliveryLog({ deliveries }) {
  if (!deliveries?.length) return <p style={{ color: '#9CA3AF', fontSize: 12 }}>No deliveries yet.</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {deliveries.slice(0, 10).map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, padding: '4px 8px', borderRadius: 6, background: d.success ? '#F0FDF4' : '#FEF2F2' }}>
          <span style={{ ...STATUS_DOT, background: d.success ? '#22C55E' : '#EF4444' }} />
          <span style={{ fontWeight: 600 }}>{d.event}</span>
          <span style={{ color: '#6B7280' }}>{d.responseCode || '—'}</span>
          <span style={{ color: '#9CA3AF', marginLeft: 'auto' }}>{d.sentAt ? new Date(d.sentAt).toLocaleString() : ''}</span>
          {d.error && <span style={{ color: '#EF4444' }}>{d.error}</span>}
        </div>
      ))}
    </div>
  );
}

export default function AdminWebhooks({ user }) {
  const [hooks, setHooks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null); // null | 'create' | hookObject
  const [testing, setTesting]   = useState(null); // hookId being tested
  const [testResult, setTestResult] = useState({}); // { [hookId]: result }
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getWebhooks();
      setHooks(Array.isArray(r) ? r : (r?.data || []));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const del = async (id) => {
    if (!window.confirm('Delete this webhook?')) return;
    try { await api.deleteWebhook(id); load(); } catch {}
  };

  const test = async (hook) => {
    setTesting(hook._id);
    try {
      const r = await api.testWebhook(hook._id);
      setTestResult(prev => ({ ...prev, [hook._id]: r }));
    } catch (e) {
      setTestResult(prev => ({ ...prev, [hook._id]: { success: false, error: e.message } }));
    }
    setTesting(null);
  };

  const toggleActive = async (hook) => {
    try {
      await api.updateWebhook(hook._id, { isActive: !hook.isActive });
      load();
    } catch {}
  };

  return (
    <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>🔗 Webhooks</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>Push real-time events to external systems when things happen in TalentNest.</p>
        </div>
        <button style={btnP} onClick={() => setModal('create')}>+ New Webhook</button>
      </div>

      {/* Info card */}
      <div style={{ ...card, background: '#EFF6FF', border: '1px solid #BFDBFE', marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#1D4ED8', marginBottom: 8 }}>How Webhooks Work</div>
        <div style={{ fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>
          When a subscribed event occurs, TalentNest sends an HTTP <strong>POST</strong> request to your endpoint with a JSON payload.
          If a secret is configured, we include an <code style={{ background: 'rgba(255,255,255,0.5)', padding: '1px 5px', borderRadius: 4 }}>X-TalentNest-Signature: sha256=…</code> header for HMAC-SHA256 verification.
          Your endpoint must return a <strong>2xx</strong> status within <strong>10 seconds</strong> — otherwise the delivery is marked as failed.
        </div>
        <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1D4ED8', marginBottom: 6 }}>Sample payload (application.hired):</div>
          <pre style={{ margin: 0, fontSize: 10, color: '#1e3a8a', whiteSpace: 'pre-wrap', fontFamily: 'monospace', lineHeight: 1.5 }}>{`{
  "event": "application.hired",
  "timestamp": "2025-06-03T08:00:00.000Z",
  "data": {
    "applicationId": "abc123",
    "candidateName": "Ravi Kumar",
    "jobTitle": "Frontend Engineer",
    "stage": "hired"
  }
}`}</pre>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#9CA3AF' }}>Loading webhooks…</p>
      ) : hooks.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔗</div>
          <p style={{ color: '#6B7280', marginBottom: 16 }}>No webhooks configured yet.</p>
          <button style={btnP} onClick={() => setModal('create')}>Create your first webhook</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {hooks.map(hook => {
            const tr = testResult[hook._id];
            const isExp = expanded === hook._id;
            return (
              <div key={hook._id} style={{ ...card, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ ...STATUS_DOT, background: hook.isActive ? '#22C55E' : '#D1D5DB' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{hook.name}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hook.url}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                      {hook.events?.length || 0} event{hook.events?.length !== 1 ? 's' : ''} · {hook.failureCount > 0 ? <span style={{ color: '#EF4444' }}>{hook.failureCount} failures</span> : 'No failures'}
                      {hook.lastTriggeredAt && ` · Last triggered ${new Date(hook.lastTriggeredAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button style={{ ...btnG, fontSize: 11, padding: '4px 10px' }}
                      onClick={() => toggleActive(hook)}>
                      {hook.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button style={{ ...btnG, fontSize: 11, padding: '4px 10px' }}
                      onClick={() => test(hook)} disabled={testing === hook._id}>
                      {testing === hook._id ? '⏳' : '🧪 Test'}
                    </button>
                    <button style={{ ...btnG, fontSize: 11, padding: '4px 10px' }} onClick={() => setModal(hook)}>Edit</button>
                    <button style={{ ...btnD, fontSize: 11, padding: '4px 10px' }} onClick={() => del(hook._id)}>Delete</button>
                    <button style={{ ...btnG, fontSize: 11, padding: '4px 10px' }}
                      onClick={() => setExpanded(isExp ? null : hook._id)}>
                      {isExp ? '▲' : '▼'}
                    </button>
                  </div>
                </div>

                {tr && (
                  <div style={{ padding: '6px 18px', background: tr.success ? '#F0FDF4' : '#FEF2F2', fontSize: 12 }}>
                    Test result: <strong style={{ color: tr.success ? '#16A34A' : '#DC2626' }}>{tr.success ? `✅ Success (${tr.responseCode})` : `❌ Failed — ${tr.error || tr.responseCode || 'no response'}`}</strong>
                    {tr.durationMs ? ` · ${tr.durationMs}ms` : ''}
                  </div>
                )}

                {isExp && (
                  <div style={{ padding: '12px 18px', borderTop: '1px solid #F3F4F6' }}>
                    <div style={{ marginBottom: 10 }}>
                      <strong style={{ fontSize: 12 }}>Subscribed events:</strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {(hook.events || []).map(ev => <span key={ev} style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{ev}</span>)}
                      </div>
                    </div>
                    <div>
                      <strong style={{ fontSize: 12 }}>Recent deliveries:</strong>
                      <div style={{ marginTop: 6 }}><DeliveryLog deliveries={hook.recentDeliveries} /></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <WebhookModal
          hook={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
