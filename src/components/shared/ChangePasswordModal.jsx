import React, { useState } from 'react';
import Field from '../ui/Field.jsx';
import { api } from '../../api/api.js';

export default function ChangePasswordModal({ user, targetUser, onClose, isSuperAdminReset = false }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const target = targetUser || user;
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const pwMatch    = form.newPassword && form.confirmPassword && form.newPassword === form.confirmPassword;
  const pwMismatch = form.confirmPassword && form.newPassword !== form.confirmPassword;

  const strengthScore = !form.newPassword ? 0 : form.newPassword.length >= 16 ? 3 : form.newPassword.length >= 12 ? 2 : form.newPassword.length >= 8 ? 1 : 0;
  const strengthLabel = ['', 'Weak', 'Good', 'Strong'][strengthScore];
  const strengthColor = ['', '#F59E0B', '#10b981', '#0176D3'][strengthScore];

  const submit = async () => {
    setError('');
    if (form.newPassword !== form.confirmPassword) return setError('Passwords do not match.');
    if (form.newPassword.length < 8) return setError('Password must be at least 8 characters.');
    setSaving(true);
    try {
      if (isSuperAdminReset) {
        await api.resetPassword(target.id || target._id, form.newPassword);
      } else {
        await api.changePassword(target.id || target._id, form.currentPassword, form.newPassword);
      }
      setSuccess('Password changed successfully!');
      setTimeout(() => onClose(), 1500);
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '24px 16px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440, maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.22)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#032D60,#0176D3)', padding: '22px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
              {isSuperAdminReset ? 'Admin Action' : 'Security'}
            </div>
            <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0 }}>
              {isSuperAdminReset ? 'Reset Password' : '🔒 Change Password'}
            </h2>
            {isSuperAdminReset && <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 }}>for {target.name}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 34, height: 34, borderRadius: 10, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{ padding: '10px 14px', background: '#FFF1F2', border: '1.5px solid #FECACA', borderRadius: 10, color: '#BA0517', fontSize: 13, fontWeight: 600, display: 'flex', gap: 8 }}>
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div style={{ padding: '10px 14px', background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 10, color: '#15803D', fontSize: 13, fontWeight: 600, display: 'flex', gap: 8 }}>
              ✅ {success}
            </div>
          )}

          {!isSuperAdminReset && (
            <Field
              label="Current Password" required
              type="password" value={form.currentPassword}
              onChange={v => sf('currentPassword', v)}
              placeholder="Enter your current password"
            />
          )}

          <div>
            <Field
              label="New Password" required
              type="password" value={form.newPassword}
              onChange={v => sf('newPassword', v)}
              placeholder="Minimum 8 characters"
            />
            {form.newPassword && (
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: strengthScore >= i ? strengthColor : '#E2E8F0', transition: 'background 0.2s' }} />
                ))}
                <span style={{ fontSize: 10, color: strengthColor, whiteSpace: 'nowrap', fontWeight: 700 }}>{strengthLabel}</span>
              </div>
            )}
          </div>

          <Field
            label="Confirm New Password" required
            type="password" value={form.confirmPassword}
            onChange={v => sf('confirmPassword', v)}
            placeholder="Repeat new password"
            error={pwMismatch ? 'Passwords do not match' : undefined}
            hint={pwMatch ? '✓ Passwords match' : undefined}
            inputStyle={pwMismatch ? { borderColor: '#FECACA' } : pwMatch ? { borderColor: '#86EFAC' } : {}}
          />
        </div>

        {/* Sticky footer */}
        <div style={{ flexShrink: 0, padding: '16px 28px', borderTop: '1px solid #F1F5F9', background: '#fff', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', background: '#F8FAFF', border: '1.5px solid #E2E8F0', borderRadius: 10, color: '#374151', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Cancel</button>
          <button onClick={submit} disabled={saving || !!pwMismatch} style={{ flex: 2, padding: '11px', background: 'linear-gradient(135deg,#0176D3,#0154A4)', border: 'none', borderRadius: 10, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, opacity: (saving || !!pwMismatch) ? 0.65 : 1 }}>
            {saving ? '⏳ Saving…' : isSuperAdminReset ? '🔒 Reset Password' : '🔒 Change Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
