import { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Field from '../../components/ui/Field.jsx';
import Dropdown from '../../components/ui/Dropdown.jsx';
import { btnP, btnG, card } from '../../constants/styles.js';

const EMPTY = { keywords: '', location: '', jobType: '', frequency: 'daily' };

export default function CandidateJobAlerts() {
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState('');
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = () => {
    setLoading(true);
    api.getJobAlerts()
      .then(r => setAlerts(Array.isArray(r) ? r : (r?.data || [])))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
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
      setToast('✅ Job alert created! You\'ll receive email digests when matching jobs are posted.');
      load();
    } catch (e) { setToast(`❌ ${e.message}`); }
    setSaving(false);
  };

  const remove = async (id) => {
    try {
      await api.deleteJobAlert(id);
      setAlerts(p => p.filter(a => (a.id || a._id?.toString()) !== id));
      setToast('✅ Alert removed.');
    } catch (e) { setToast(`❌ ${e.message}`); }
  };

  const toggle = async (alert) => {
    const id = alert.id || alert._id?.toString();
    try {
      await api.updateJobAlert(id, { isActive: !alert.isActive });
      setAlerts(p => p.map(a => (a.id === id || a._id?.toString() === id) ? { ...a, isActive: !a.isActive } : a));
      setToast(alert.isActive ? '⏸ Alert paused.' : '✅ Alert resumed.');
    } catch (e) { setToast(`❌ ${e.message}`); }
  };

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      <PageHeader title="🔔 Job Alerts" subtitle="Get notified by email when new jobs matching your criteria are posted" />

      {/* Create new alert */}
      <div style={{ ...card, padding: 20, marginBottom: 24, border: '1px solid rgba(1,118,211,0.2)' }}>
        <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 700, letterSpacing: '1px', margin: '0 0 14px' }}>+ CREATE NEW ALERT</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Keywords (comma-separated)" value={form.keywords} onChange={v => sf('keywords', v)} placeholder="React, Node.js, Python, Data Analyst…" hint="Match against job title, skills, and description" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
            <Field label="Location" value={form.location} onChange={v => sf('location', v)} placeholder="Hyderabad, Mumbai, Remote…" />
            <Dropdown label="Job Type" value={form.jobType} onChange={v => sf('jobType', v)}
              options={['', 'Full-Time', 'Part-Time', 'Contract', 'Remote', 'Internship']} />
            <Dropdown label="Email Frequency" value={form.frequency} onChange={v => sf('frequency', v)}
              options={['daily', 'weekly']} />
          </div>
          <div>
            <button onClick={save} disabled={saving} style={{ ...btnP, opacity: saving ? 0.6 : 1 }}>
              {saving ? <><Spinner /> Creating…</> : '🔔 Create Alert'}
            </button>
          </div>
        </div>
      </div>

      {/* Existing alerts */}
      <div style={{ ...card, padding: 20 }}>
        <p style={{ color: '#374151', fontSize: 13, fontWeight: 700, margin: '0 0 14px' }}>
          Your Alerts {alerts.length > 0 && <span style={{ color: '#706E6B', fontWeight: 400 }}>({alerts.length}/10)</span>}
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>
        ) : alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#706E6B' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 6px' }}>No alerts yet</p>
            <p style={{ fontSize: 13, margin: 0 }}>Create an alert above to get notified when matching jobs are posted.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alerts.map(alert => {
              const id = alert.id || alert._id?.toString();
              const label = [alert.keywords?.join(', '), alert.location, alert.jobType].filter(Boolean).join(' · ') || 'All jobs';
              return (
                <div key={id} style={{ background: alert.isActive ? '#F3F2F2' : '#fafafa', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, border: `1px solid ${alert.isActive ? '#e5e7eb' : '#e2e8f0'}`, opacity: alert.isActive ? 1 : 0.65 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#181818', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
                    <div style={{ fontSize: 12, color: '#706E6B', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '1px 8px', borderRadius: 10, fontSize: 11 }}>{alert.frequency}</span>
                      <span style={{ color: alert.isActive ? '#2E844A' : '#706E6B' }}>{alert.isActive ? '✅ Active' : '⏸ Paused'}</span>
                      {alert.lastSentAt && <span>Last sent {new Date(alert.lastSentAt).toLocaleDateString('en-IN')}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => toggle(alert)} style={{ ...btnG, fontSize: 12, padding: '5px 12px' }}>
                      {alert.isActive ? '⏸ Pause' : '▶ Resume'}
                    </button>
                    <button onClick={() => remove(id)} style={{ background: 'none', border: '1px solid #fca5a5', color: '#e53e3e', borderRadius: 6, cursor: 'pointer', fontSize: 12, padding: '5px 12px', fontWeight: 600 }}>
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
