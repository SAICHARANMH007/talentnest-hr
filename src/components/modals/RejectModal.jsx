import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal.jsx';
import Field from '../ui/Field.jsx';
import Spinner from '../ui/Spinner.jsx';
import { btnD, btnG, card } from '../../constants/styles.js';
import { api } from '../../api/api.js';

export default function RejectModal({ app, onClose, onDone }) {
  const [reason, setReason]       = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [reasons, setReasons]     = useState([]);
  const c = app.candidate, j = app.job;

  useEffect(() => {
    api.getCustomizations().then(r => {
      const list = (r?.data?.rejectionReasons || []).map(x => x.text || x).filter(Boolean);
      setReasons(list);
    }).catch(() => {});
  }, []);

  const submit = async () => {
    setSaving(true);
    if (sendEmail && c?.email) {
      await api.sendEmail(
        c.email,
        `Application Update: ${j?.title} at ${j?.company}`,
        `<p>Dear ${c?.name},</p><p>Thank you for your interest in the <strong>${j?.title}</strong> position at <strong>${j?.company}</strong>.</p><p>After careful consideration, we will not be moving forward at this time.</p>${reason ? `<p><strong>Feedback:</strong> ${reason}</p>` : ''}<p>Best wishes,<br/>The Recruitment Team</p>`
      ).catch(() => {});
    }
    await api.updateStage(app.id, 'rejected', reason ? `Rejected: ${reason}` : 'Rejected', { rejectionReason: reason });
    setSaving(false);
    onDone('✅ Candidate rejected' + (sendEmail ? ' & notified' : '.'));
  };

  return (
    <Modal
      title="Reject Candidate"
      onClose={onClose}
      footer={
        <>
          <button onClick={submit} disabled={saving} style={{ ...btnD, flex: 1, height: 48, fontSize: 14, justifyContent: 'center', opacity: saving ? 0.6 : 1 }}>
            {saving ? <><Spinner /> Processing…</> : '✕ Confirm Rejection'}
          </button>
          <button onClick={onClose} style={{ ...btnG, height: 48, padding: '0 24px', fontSize: 14 }}>Cancel</button>
        </>
      }
    >
      <div style={{ ...card, background: 'rgba(186,5,23,0.06)', marginBottom: 16 }}>
        <p style={{ color: '#BA0517', fontSize: 11, fontWeight: 800, letterSpacing: 1, margin: '0 0 6px' }}>REJECTION DETAILS</p>
        <p style={{ color: '#181818', fontSize: 14, fontWeight: 700, margin: 0 }}>{c?.name}</p>
        <p style={{ color: '#706E6B', fontSize: 12, margin: '3px 0 0' }}>{j?.title} @ {j?.company}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {reasons.length > 0 ? (
          <Field
            label="Reason for Rejection"
            value={reason}
            onChange={setReason}
            options={[{ value: '', label: 'Select a reason…' }, ...reasons.map(r => ({ value: r, label: r }))]}
            hint="Choose from your org's standard reasons or type below"
          />
        ) : null}
        <Field
          label={reasons.length > 0 ? 'Additional Notes (optional)' : 'Reason for Rejection (recommended)'}
          value={reasons.length > 0 ? undefined : reason}
          onChange={reasons.length > 0 ? undefined : setReason}
          rows={3}
          placeholder="e.g. Skills not aligned with current requirements…"
          {...(reasons.length > 0 ? {} : {})}
        />
        {reasons.length > 0 && (
          <Field label="Additional Notes (optional)" value={''} onChange={() => {}} rows={2}
            placeholder="Any additional context for internal records…" />
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: 'rgba(1,118,211,0.04)', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(1,118,211,0.1)' }}>
          <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} style={{ accentColor: '#0176D3', width: 16, height: 16 }} />
          <span style={{ color: '#0176D3', fontSize: 13, fontWeight: 600 }}>Notify candidate via email</span>
        </label>
      </div>
    </Modal>
  );
}
