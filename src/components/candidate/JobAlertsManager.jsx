import { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import Modal from '../ui/Modal.jsx';
import Field from '../ui/Field.jsx';
import Dropdown from '../ui/Dropdown.jsx';
import Spinner from '../ui/Spinner.jsx';
import { btnP, btnG } from '../../constants/styles.js';

const EMPTY = { keywords: '', location: '', jobType: '', frequency: 'daily' };

export default function JobAlertsManager({ onClose }) {
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState('');
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = () => {
    api.getJobAlerts().then(r => setAlerts(Array.isArray(r) ? r : (r?.data || []))).catch(() => setAlerts([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.keywords && !form.location && !form.jobType) {
      setToast('❌ Enter at least one filter (keyword, location, or job type).');
      return;
    }
    setSaving(true);
    try {
      const keywords = form.keywords.split(',').map(k => k.trim()).filter(Boolean);
      await api.createJobAlert({ keywords, location: form.location, jobType: form.jobType, frequency: form.frequency });
      setForm(EMPTY);
      setToast('✅ Job alert created!');
      load();
    } catch (e) { setToast(`❌ ${e.message}`); }
    setSaving(false);
  };

  const remove = async (id) => {
    try {
      await api.deleteJobAlert(id);
      setAlerts(p => p.filter(a => a.id !== id && a._id?.toString() !== id));
      setToast('✅ Alert removed.');
    } catch (e) { setToast(`❌ ${e.message}`); }
  };

  const toggle = async (alert) => {
    const id = alert.id || alert._id?.toString();
    try {
      await api.updateJobAlert(id, { isActive: !alert.isActive });
      setAlerts(p => p.map(a => (a.id === id || a._id?.toString() === id) ? { ...a, isActive: !a.isActive } : a));
    } catch (e) { setToast(`❌ ${e.message}`); }
  };

  return (
    <Modal title="🔔 Job Alerts" onClose={onClose}>
      {toast && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: toast.startsWith('✅') ? 'rgba(34,197,94,0.08)' : 'rgba(186,5,23,0.08)', borderRadius: 8, border: `1px solid ${toast.startsWith('✅') ? 'rgba(34,197,94,0.3)' : 'rgba(186,5,23,0.2)'}` }}>
          <p style={{ margin: 0, fontSize: 13, color: toast.startsWith('✅') ? '#2E844A' : '#BA0517' }}>{toast}</p>
        </div>
      )}

      {/* Create new alert */}
      <div style={{ background: 'rgba(1,118,211,0.04)', borderRadius: 10, padding: 16, marginBottom: 20, border: '1px solid rgba(1,118,211,0.15)' }}>
        <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 700, letterSpacing: '1px', margin: '0 0 12px' }}>+ NEW ALERT</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field label="Keywords (comma-separated)" value={form.keywords} onChange={v => sf('keywords', v)} placeholder="React, Node.js, Python…" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 10 }}>
            <Field label="Location" value={form.location} onChange={v => sf('location', v)} placeholder="Hyderabad, Remote…" />
            <Dropdown label="Job Type" value={form.jobType} onChange={v => sf('jobType', v)}
              options={['', 'Full-Time', 'Part-Time', 'Contract', 'Remote', 'Internship']} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <Dropdown label="Frequency" value={form.frequency} onChange={v => sf('frequency', v)} options={['daily', 'weekly']} />
            </div>
            <button onClick={save} disabled={saving} style={{ ...btnP, whiteSpace: 'nowrap', opacity: saving ? 0.6 : 1 }}>
              {saving ? <><Spinner /> Saving…</> : '🔔 Create Alert'}
            </button>
          </div>
        </div>
      </div>

      {/* Existing alerts */}
      <p style={{ color: '#374151', fontSize: 13, fontWeight: 700, margin: '0 0 10px' }}>Your Alerts</p>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}><Spinner /></div>
      ) : alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: '#706E6B', fontSize: 13 }}>No job alerts yet. Create one above to get notified!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alerts.map(alert => {
            const id = alert.id || alert._id?.toString();
            return (
              <div key={id} style={{ background: '#F3F2F2', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, opacity: alert.isActive ? 1 : 0.5 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#181818', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {[alert.keywords?.join(', '), alert.location, alert.jobType].filter(Boolean).join(' · ') || 'All jobs'}
                  </div>
                  <div style={{ fontSize: 11, color: '#706E6B', marginTop: 2 }}>
                    {alert.frequency} · {alert.isActive ? '✅ Active' : '⏸ Paused'}
                    {alert.lastSentAt && ` · Last sent ${new Date(alert.lastSentAt).toLocaleDateString()}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => toggle(alert)} style={{ ...btnG, fontSize: 11, padding: '4px 10px' }}>
                    {alert.isActive ? 'Pause' : 'Resume'}
                  </button>
                  <button onClick={() => remove(id)} style={{ background: 'none', border: '1px solid #e53e3e', color: '#e53e3e', borderRadius: 6, cursor: 'pointer', fontSize: 11, padding: '4px 10px' }}>
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
