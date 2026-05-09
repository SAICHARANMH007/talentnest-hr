import { useState } from 'react';
import { api } from '../../api/api.js';
import { btnP, btnG } from '../../constants/styles.js';
import Modal from '../ui/Modal.jsx';

/**
 * HiredDetailsModal
 * Shown immediately after a candidate's stage moves to "Hired".
 * Collects CTC offered + joining date and saves to the preboarding record.
 */
export default function HiredDetailsModal({ appId, candidateName, jobTitle, onClose, onSaved }) {
  const [form, setForm] = useState({ joiningDate: '', ctcOffered: '', designation: '', department: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {};
      if (form.joiningDate)  payload.joiningDate  = form.joiningDate;
      if (form.ctcOffered)   payload.ctcOffered   = form.ctcOffered;
      if (form.designation)  payload.designation  = form.designation;
      if (form.department)   payload.department   = form.department;

      if (Object.keys(payload).length > 0 && appId) {
        await api.updatePreBoardingByApplication(appId, payload);
      }
      onSaved?.();
      onClose();
    } catch (e) {
      setToast('⚠️ Could not save details: ' + (e.message || ''));
    }
    setSaving(false);
  };

  return (
    <Modal
      title="🎊 Candidate Hired"
      onClose={onClose}
      footer={
        <>
          <button onClick={save} disabled={saving} style={{ ...btnP, flex: 1, background: 'linear-gradient(135deg,#059669,#047857)' }}>
            {saving ? '⏳ Saving…' : 'Save & Continue'}
          </button>
          <button onClick={onClose} style={btnG}>Skip for Now</button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <h2 style={{ color: '#181818', margin: 0, fontSize: 18, fontWeight: 800 }}>{candidateName || 'Candidate'}</h2>
          {jobTitle && <p style={{ color: '#706E6B', margin: '4px 0 0', fontSize: 13 }}>for {jobTitle}</p>}
        </div>

        <p style={{ color: '#374151', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
          Great news! Enter the offer details below — they'll appear on the candidate's pre-boarding checklist and offer letter.
        </p>

        {toast && (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '12px', color: '#92400E', fontSize: 13 }}>
            {toast}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>📅 Joining Date *</label>
            <input type="date" value={form.joiningDate} onChange={e => sf('joiningDate', e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 14, outline: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>💰 CTC Offered</label>
            <input type="text" value={form.ctcOffered} onChange={e => sf('ctcOffered', e.target.value)}
              placeholder="e.g. 12 LPA or ₹1,00,000/month"
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 14, outline: 'none' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>🏷️ Designation</label>
              <input type="text" value={form.designation} onChange={e => sf('designation', e.target.value)}
                placeholder="e.g. Senior Developer"
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 14, outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>🏢 Department</label>
              <input type="text" value={form.department} onChange={e => sf('department', e.target.value)}
                placeholder="e.g. Engineering"
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 14, outline: 'none' }} />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
