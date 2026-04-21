import { useState } from 'react';
import { api } from '../../api/api.js';

const ROLE_LABEL = { recruiter: 'Recruiter', admin: 'Admin', super_admin: 'Super Admin', candidate: 'Candidate', hiring_manager: 'Hiring Manager' };

export default function MessageModal({ recipient, jobId, jobTitle, onClose }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    setError('');
    try {
      await api.sendMessage({ toUserId: recipient.id || recipient._id, message: text.trim(), jobId, jobTitle });
      setSent(true);
    } catch (e) {
      setError(e.message || 'Failed to send.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, padding: '28px 28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#032D60,#0176D3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
            {recipient.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#181818' }}>{recipient.name}</div>
            <div style={{ fontSize: 12, color: '#706E6B' }}>{ROLE_LABEL[recipient.role] || recipient.role}{recipient.title ? ` · ${recipient.title}` : ''}</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#706E6B', lineHeight: 1 }}>×</button>
        </div>

        {jobTitle && (
          <div style={{ background: 'rgba(1,118,211,0.06)', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#0176D3', fontWeight: 600, marginBottom: 16 }}>
            💼 Re: {jobTitle}
          </div>
        )}

        {sent ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
            <div style={{ fontWeight: 700, color: '#065f46', fontSize: 15 }}>Message sent!</div>
            <div style={{ fontSize: 13, color: '#706E6B', marginTop: 4 }}>{recipient.name} will see it in their inbox.</div>
            <button onClick={onClose} style={{ marginTop: 20, background: '#0176D3', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Done</button>
          </div>
        ) : (
          <>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={`Write a message to ${recipient.name?.split(' ')[0] || 'them'}…`}
              maxLength={2000}
              rows={5}
              style={{ width: '100%', border: '1.5px solid #DDDBDA', borderRadius: 12, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', color: '#181818' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <span style={{ fontSize: 11, color: '#9E9D9B' }}>{text.length}/2000</span>
            </div>
            {error && <div style={{ color: '#BA0517', fontSize: 12, marginTop: 6 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={onClose} style={{ flex: 1, background: '#F3F2F2', border: 'none', borderRadius: 10, padding: '11px', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#706E6B' }}>Cancel</button>
              <button onClick={send} disabled={!text.trim() || sending} style={{ flex: 2, background: text.trim() && !sending ? '#0176D3' : '#DDDBDA', color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontWeight: 700, fontSize: 14, cursor: text.trim() && !sending ? 'pointer' : 'default', transition: 'background 0.2s' }}>
                {sending ? 'Sending…' : 'Send Message'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
