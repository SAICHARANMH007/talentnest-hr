import { useState, useEffect } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Toast from '../../components/ui/Toast.jsx';
import StudentSearchPicker from '../../components/shared/StudentSearchPicker.jsx';
import { card, inp, btnP, btnG, btnD } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const CATEGORIES = ['Aptitude', 'Coding', 'Verbal', 'Reasoning', 'Interview', 'Other'];

const CATEGORY_COLORS = {
  Aptitude: { bg: 'rgba(1,118,211,0.1)', color: '#0176D3' },
  Coding: { bg: 'rgba(124,58,237,0.1)', color: '#7C3AED' },
  Verbal: { bg: 'rgba(22,163,74,0.1)', color: '#16A34A' },
  Reasoning: { bg: 'rgba(245,158,11,0.12)', color: '#B45309' },
  Interview: { bg: 'rgba(219,39,119,0.1)', color: '#DB2777' },
  Other: { bg: 'rgba(100,116,139,0.1)', color: '#475569' },
};

function AddResourceForm({ onAdded }) {
  const [form, setForm] = useState({ title: '', url: '', description: '', category: 'Aptitude' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.title.trim() || !form.url.trim()) {
      setError('Title and URL/link are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.createTrainingResource({
        title: form.title.trim(),
        url: form.url.trim(),
        description: form.description.trim(),
        category: form.category,
      });
      setForm({ title: '', url: '', description: '', category: 'Aptitude' });
      onAdded();
    } catch (e) {
      setError(e.message || 'Failed to add resource');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ ...card, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#181818', marginBottom: 12 }}>➕ Add Training Resource</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Title *</label>
          <input style={inp} value={form.title} onChange={set('title')} placeholder="e.g. Quantitative Aptitude Practice Set" />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Link / URL *</label>
          <input style={inp} value={form.url} onChange={set('url')} placeholder="https://..." />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Category</label>
          <select style={inp} value={form.category} onChange={set('category')}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Description</label>
          <input style={inp} value={form.description} onChange={set('description')} placeholder="Optional short note for students" />
        </div>
      </div>
      {error && <div style={{ color: '#BA0517', fontSize: 12, marginBottom: 8 }}>{error}</div>}
      <button onClick={submit} disabled={saving} style={{ ...btnP, opacity: saving ? 0.6 : 1 }}>{saving ? 'Adding...' : '➕ Add Resource'}</button>
    </div>
  );
}

function NotifyResourcePanel({ resource, onClose, onSent }) {
  const [selected, setSelected] = useState(new Set());
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const send = async () => {
    if (selected.size === 0) {
      setResult({ ok: false, message: 'Select at least one student first.' });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const res = await api.notifyTrainingResource(resource.id, {
        candidateIds: Array.from(selected),
        message,
      });
      setResult({ ok: true, recipients: res?.recipients ?? 0, message: res?.message });
      if (res?.recipients) { setSelected(new Set()); onSent?.(); }
    } catch (e) {
      setResult({ ok: false, message: e.message || 'Failed to send notification' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ border: '1.5px solid rgba(1,118,211,0.25)', borderRadius: 8, padding: 12, marginTop: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#181818' }}>📣 Notify students about "{resource.title}"</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#706E6B', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>✕ Close</button>
      </div>
      <StudentSearchPicker selected={selected} setSelected={setSelected} />
      <div style={{ marginTop: 8, marginBottom: 8 }}>
        <textarea value={message} onChange={e => setMessage(e.target.value)} style={{ ...inp, minHeight: 50, resize: 'vertical' }} placeholder="Optional message — a default note about this resource is sent if left blank." />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={send} disabled={sending} style={{ ...btnP, fontSize: 12, padding: '6px 14px', opacity: sending ? 0.6 : 1 }}>{sending ? 'Sending...' : '📣 Send Notification'}</button>
        {result && (
          <span style={{ fontSize: 12, fontWeight: 700, color: result.ok ? '#16A34A' : '#BA0517' }}>
            {result.ok ? `Sent to ${result.recipients} student${result.recipients === 1 ? '' : 's'}.` : result.message}
            {result.ok && result.message ? ` ${result.message}` : ''}
          </span>
        )}
      </div>
    </div>
  );
}

export default function CollegeTrainingResources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [notifyId, setNotifyId] = useState(null);

  const load = () => {
    setLoading(true);
    api.getTrainingResources()
      .then(r => setResources(r?.data || []))
      .catch(e => setError(e.message || 'Failed to load training resources'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm('Remove this training resource? Students will no longer see it.')) return;
    setBusyId(id);
    try {
      await api.deleteTrainingResource(id);
      setResources(rs => rs.filter(r => r.id !== id));
      setToast('✅ Resource removed');
    } catch (e) {
      setToast(`❌ ${e.message || 'Failed to remove resource'}`);
    } finally {
      setBusyId(null);
    }
  };

  const filtered = filter === 'all' ? resources : resources.filter(r => r.category === filter);

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      <PageHeader
        title="📚 Training Resources"
        subtitle="Curate aptitude, coding, verbal, reasoning and interview prep material for your students. New resources are visible immediately on students' Opportunities page."
      />

      <AddResourceForm onAdded={load} />

      {resources.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {['all', ...CATEGORIES].map(c => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              style={{
                fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 999, cursor: 'pointer',
                border: filter === c ? '1.5px solid #0176D3' : '1px solid #E2E8F0',
                background: filter === c ? 'rgba(1,118,211,0.08)' : '#fff',
                color: filter === c ? '#0176D3' : '#706E6B',
              }}>
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>
      )}

      {loading && <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10 }}><Spinner /> Loading...</div>}
      {error && <div style={{ color: '#BA0517', padding: 40 }}>{error}</div>}

      {!loading && !error && (
        filtered.length === 0 ? (
          <div style={{ ...card, color: '#706E6B', padding: 40, textAlign: 'center', fontSize: 14 }}>
            {resources.length === 0
              ? 'No training resources added yet. Add links to practice sets, courses or guides above — they will show up under "Training Resources" on every student\'s Opportunities page.'
              : 'No resources in this category yet.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {filtered.map(r => {
              const cc = CATEGORY_COLORS[r.category] || CATEGORY_COLORS.Other;
              return (
                <div key={r.id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#181818' }}>{r.title}</h3>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: cc.bg, color: cc.color, flexShrink: 0 }}>{r.category}</span>
                  </div>
                  {r.description && <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>{r.description}</p>}
                  <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#0176D3', fontWeight: 700, wordBreak: 'break-all' }}>🔗 {r.url}</a>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                      onClick={() => setNotifyId(id => id === r.id ? null : r.id)}
                      style={{ ...btnG, fontSize: 12, padding: '6px 12px' }}>
                      {notifyId === r.id ? '✕ Cancel' : '📣 Notify Students'}
                    </button>
                    <button
                      onClick={() => remove(r.id)}
                      disabled={busyId === r.id}
                      style={{ ...btnD, fontSize: 12, padding: '6px 12px', opacity: busyId === r.id ? 0.6 : 1 }}>
                      {busyId === r.id ? 'Removing...' : '🗑️ Remove'}
                    </button>
                  </div>
                  {notifyId === r.id && (
                    <NotifyResourcePanel resource={r} onClose={() => setNotifyId(null)} />
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
