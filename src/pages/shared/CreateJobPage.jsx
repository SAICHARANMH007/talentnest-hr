import React, { useRef, useState } from 'react';
import PostJobForm from '../../components/shared/PostJobForm.jsx';
import { btnP, btnG } from '../../constants/styles.js';
import { api } from '../../api/api.js';
import Toast from '../../components/ui/Toast.jsx';

/**
 * Dedicated full-page job creation form.
 * Route: /app/jobs/create  (recruiter, admin)
 * Keeps the modal version as a shortcut — this page is for deep-linking
 * and bookmarking, or when the user wants more screen estate.
 */
export default function CreateJobPage({ user, onBack, onSuccess }) {
  const formRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const save = async (form) => {
    if (!form.title || !form.company) { setToast('❌ Title and company required'); return; }
    const eu = (form.externalUrl || '').trim();
    if (eu && !/^https?:\/\//i.test(eu)) { setToast('❌ External URL must start with http:// or https://'); return; }
    setSaving(true);
    try {
      await api.createJob({ ...form, externalUrl: eu, recruiterId: user?.id });
      setToast('✅ Job posted successfully!');
      formRef.current?.reset?.();
      setTimeout(() => { if (onSuccess) onSuccess(); }, 1200);
    } catch (e) { setToast(`❌ ${e.message}`); }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Toast msg={toast} onClose={() => setToast('')} />

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: '#706E6B' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#0176D3', cursor: 'pointer', padding: 0, fontSize: 13, fontWeight: 600 }}>
          ← Jobs
        </button>
        <span>/</span>
        <span style={{ color: '#181818', fontWeight: 600 }}>Post New Job</span>
      </div>

      {/* Page title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#181818' }}>💼 Post a New Job</h1>
        <p style={{ margin: '6px 0 0', color: '#706E6B', fontSize: 13 }}>
          Fill in the details below. All fields marked * are required.
        </p>
      </div>

      {/* Form card */}
      <div style={{ background: '#fff', border: '1px solid #DDDBDA', borderRadius: 12, padding: '28px 32px' }}>
        <PostJobForm ref={formRef} onSave={save} saving={saving} onCancel={onBack} />
      </div>

      {/* Action bar (sticky on mobile) */}
      <div className="tn-form-actions" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20, paddingBottom: 24 }}>
        <button onClick={onBack} style={btnG}>Cancel</button>
        <button onClick={() => formRef.current?.submit()} disabled={saving} style={{ ...btnP, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Posting…' : '✓ Post Job'}
        </button>
      </div>
    </div>
  );
}
