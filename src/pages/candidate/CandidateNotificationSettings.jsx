import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { card } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const CATEGORY_DESC = {
  applicationUpdates: 'Stage changes, offers, and assessment results for jobs you applied to.',
  interviews: 'Interview scheduling and reminders.',
  jobRecommendations: 'AI-matched jobs and recommendations picked for your profile.',
  announcements: 'Platform announcements, college updates, and mentions.',
};

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      style={{
        width: 44, height: 24, borderRadius: 999, border: 'none', cursor: disabled ? 'wait' : 'pointer',
        background: checked ? '#16A34A' : '#CBD5E1', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: checked ? 22 : 2, width: 20, height: 20, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

export default function CandidateNotificationSettings() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.getNotificationPreferences()
      .then(r => setCategories(r?.categories || []))
      .catch(e => setError(e.message || 'Failed to load preferences'))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (key) => {
    const current = categories.find(c => c.key === key);
    const nextEnabled = !current.enabled;
    setSaving(key);
    setCategories(prev => prev.map(c => c.key === key ? { ...c, enabled: nextEnabled } : c));
    const muted = categories.filter(c => (c.key === key ? !nextEnabled : !c.enabled)).map(c => c.key);
    try {
      const r = await api.updateNotificationPreferences(muted);
      if (r?.categories) setCategories(r.categories);
    } catch (e) {
      setError(e.message || 'Failed to update preferences');
      setCategories(prev => prev.map(c => c.key === key ? { ...c, enabled: !nextEnabled } : c));
    }
    setSaving('');
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <PageHeader
        title="🔔 Notification Preferences"
        subtitle="Choose which types of notifications you want to see in your inbox. Turning a category off hides those notifications going forward."
      />

      {loading && <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10 }}><Spinner /> Loading...</div>}
      {error && <div style={{ color: '#BA0517', marginBottom: 16 }}>{error}</div>}

      {!loading && (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          {categories.map((c, i) => (
            <div key={c.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '16px 20px', borderBottom: i < categories.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#181818' }}>{c.label}</div>
                <div style={{ fontSize: 12, color: '#706E6B', marginTop: 2 }}>{CATEGORY_DESC[c.key] || ''}</div>
              </div>
              <Toggle checked={c.enabled} onChange={() => toggle(c.key)} disabled={saving === c.key} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
