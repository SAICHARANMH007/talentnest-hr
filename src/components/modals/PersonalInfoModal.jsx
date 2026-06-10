import React, { useState } from 'react';
import Modal from '../ui/Modal.jsx';

function Avatar({ name, src, size = 72, color }) {
  if (src) return (
    <img src={src} alt={name}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${color}33`, boxShadow: `0 0 0 2px ${color}22, 0 8px 24px rgba(0,0,0,0.18)` }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: size * 0.38, flexShrink: 0, boxShadow: `0 8px 24px ${color}44` }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

function CopyRow({ icon, label, value, href, color }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'var(--app-input-bg, #F8FAFC)',
      border: '1px solid var(--app-input-border, #E5E7EB)',
      borderRadius: 14, padding: '12px 14px',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: `${color}16`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--app-text-muted, #9CA3AF)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
        <a href={href} style={{ fontSize: 14, fontWeight: 700, color: 'var(--app-text, #181818)', textDecoration: 'none', wordBreak: 'break-all' }}>{value}</a>
      </div>
      <button
        onClick={copy}
        style={{
          flexShrink: 0, padding: '7px 12px', borderRadius: 9, border: `1px solid ${color}33`,
          background: copied ? `${color}22` : `${color}11`, color, fontSize: 11, fontWeight: 700, cursor: 'pointer',
          transition: 'all 0.15s', minWidth: 64,
        }}
      >{copied ? '✓ Copied' : 'Copy'}</button>
    </div>
  );
}

const ROLE_COLOR = {
  admin:       '#0176D3',
  recruiter:   '#7C3AED',
  candidate:   '#059669',
  super_admin: '#DC2626',
  superadmin:  '#DC2626',
  client:      '#D97706',
  hiring_manager: '#0891B2',
};
const ROLE_LABEL = {
  admin:       'HR Admin',
  recruiter:   'Recruiter',
  candidate:   'Candidate',
  super_admin: 'Super Admin',
  superadmin:  'Super Admin',
  client:      'Client',
  hiring_manager: 'Hiring Manager',
};

export default function PersonalInfoModal({ person, contact, onClose }) {
  const bg = ROLE_COLOR[person?.role] || '#0176D3';
  const email = contact?.email ?? person?.email;
  const phone = contact?.phone ?? person?.phone;

  return (
    <Modal title="Contact Information" onClose={onClose} width="460px">
      {/* Header */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        padding: '8px 0 20px',
      }}>
        <Avatar name={person?.name} src={person?.avatarUrl || person?.photoUrl} size={76} color={bg} />
        <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--app-text, #181818)', margin: '14px 0 2px' }}>{person?.name || 'Member'}</h3>
        {person?.title && <div style={{ fontSize: 13, color: 'var(--app-text-sec, #3E3E3C)', fontWeight: 600 }}>{person.title}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ padding: '4px 12px', borderRadius: 20, background: `${bg}14`, color: bg, fontSize: 11, fontWeight: 700, border: `1px solid ${bg}28` }}>
            {ROLE_LABEL[person?.role] || 'Member'}
          </span>
          {person?.department && (
            <span style={{ padding: '4px 12px', borderRadius: 20, background: 'var(--app-input-bg, #F8FAFC)', color: 'var(--app-text-sec, #706E6B)', fontSize: 11, fontWeight: 700, border: '1px solid var(--app-input-border, #E5E7EB)' }}>
              🏢 {person.department}
            </span>
          )}
          {person?.location && (
            <span style={{ padding: '4px 12px', borderRadius: 20, background: 'var(--app-input-bg, #F8FAFC)', color: 'var(--app-text-sec, #706E6B)', fontSize: 11, fontWeight: 700, border: '1px solid var(--app-input-border, #E5E7EB)' }}>
              📍 {person.location}
            </span>
          )}
        </div>
      </div>

      {/* Granted banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.28)',
        borderRadius: 12, padding: '10px 14px', marginBottom: 16,
      }}>
        <span style={{ fontSize: 18 }}>🔓</span>
        <div style={{ fontSize: 12.5, color: '#059669', fontWeight: 700 }}>
          {(person?.name || 'This person').split(' ')[0]} approved your request — contact details unlocked.
        </div>
      </div>

      {/* Contact rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {email && <CopyRow icon="✉️" label="Email" value={email} href={`mailto:${email}`} color={bg} />}
        {phone && <CopyRow icon="📞" label="Phone" value={phone} href={`tel:${phone}`} color={bg} />}
        {!email && !phone && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--app-text-muted, #706E6B)', fontSize: 13 }}>
            No contact details available.
          </div>
        )}
      </div>

      {/* Footer note */}
      <div style={{ marginTop: 18, fontSize: 11.5, color: 'var(--app-text-muted, #9CA3AF)', textAlign: 'center', lineHeight: 1.6 }}>
        Please use this information respectfully and only for professional networking purposes.
      </div>
    </Modal>
  );
}
