import React, { useState } from 'react';
import Field from '../ui/Field.jsx';
import { api } from '../../api/api.js';

export default function ChangePasswordModal({ user, targetUser, onClose, isSuperAdminReset = false }) {
  const [form, setForm]   = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCon, setShowCon] = useState(false);

  const target   = targetUser || user;
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
        await api.adminResetPassword(target.id || target._id, form.newPassword);
      } else {
        await api.changePassword(form.currentPassword, form.newPassword);
      }
      setSuccess(isSuperAdminReset ? `Password for ${target.name} has been reset. They will receive an email notification.` : 'Password changed successfully!');
      setTimeout(() => onClose(), 2200);
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const EyeBtn = ({ show, onToggle }) => (
    <button
      type="button"
      onClick={onToggle}
      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}
    >
      {show ? '🙈' : '👁'}
    </button>
  );

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
              {isSuperAdminReset ? '🔒 Reset Password' : '🔒 Change Password'}
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

          {isSuperAdminReset && (
            <div style={{ padding: '10px 14px', background: '#FFF7ED', border: '1.5px solid #FED7AA', borderRadius: 10, color: '#92400E', fontSize: 12 }}>
              ⚠️ The user will be notified by email that their password was reset.
            </div>
          )}

          {!isSuperAdminReset && (
            <div>
              <label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Current Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCur ? 'text' : 'password'}
                  value={form.currentPassword}
                  onChange={e => sf('currentPassword', e.target.value)}
                  placeholder="Enter your current password"
                  style={{ width: '100%', padding: '10px 44px 10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                />
                <EyeBtn show={showCur} onToggle={() => setShowCur(p => !p)} />
              </div>
            </div>
          )}

          <div>
            <label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>New Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNew ? 'text' : 'password'}
                value={form.newPassword}
                onChange={e => sf('newPassword', e.target.value)}
                placeholder="Minimum 8 characters"
                style={{ width: '100%', padding: '10px 44px 10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              <EyeBtn show={showNew} onToggle={() => setShowNew(p => !p)} />
            </div>
            {form.newPassword && (
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: strengthScore >= i ? strengthColor : '#E2E8F0', transition: 'background 0.2s' }} />
                ))}
                <span style={{ fontSize: 10, color: strengthColor, whiteSpace: 'nowrap', fontWeight: 700 }}>{strengthLabel}</span>
              </div>
            )}
          </div>

          <div>
            <label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Confirm New Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCon ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={e => sf('confirmPassword', e.target.value)}
                placeholder="Repeat new password"
                style={{ width: '100%', padding: '10px 44px 10px 12px', border: `1.5px solid ${pwMismatch ? '#FECACA' : pwMatch ? '#86EFAC' : '#E2E8F0'}`, borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              <EyeBtn show={showCon} onToggle={() => setShowCon(p => !p)} />
            </div>
            {pwMismatch && <p style={{ color: '#BA0517', fontSize: 11, margin: '4px 0 0', fontWeight: 600 }}>⚠️ Passwords do not match</p>}
            {pwMatch    && <p style={{ color: '#15803D', fontSize: 11, margin: '4px 0 0', fontWeight: 600 }}>✓ Passwords match</p>}
          </div>
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0, padding: '16px 28px', borderTop: '1px solid #F1F5F9', background: '#fff', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', background: '#F8FAFF', border: '1.5px solid #E2E8F0', borderRadius: 10, color: '#374151', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Cancel</button>
          <button
            onClick={submit}
            disabled={saving || !!pwMismatch || !form.newPassword || !form.confirmPassword || (!isSuperAdminReset && !form.currentPassword)}
            style={{ flex: 2, padding: '11px', background: 'linear-gradient(135deg,#0176D3,#0154A4)', border: 'none', borderRadius: 10, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, opacity: (saving || !!pwMismatch || !form.newPassword || !form.confirmPassword || (!isSuperAdminReset && !form.currentPassword)) ? 0.65 : 1 }}
          >
            {saving ? '⏳ Saving…' : isSuperAdminReset ? '🔒 Reset Password' : '🔒 Change Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
