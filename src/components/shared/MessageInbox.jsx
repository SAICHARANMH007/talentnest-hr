import { useState, useEffect } from 'react';
import { api } from '../../api/api.js';

const ROLE_LABEL = { recruiter: 'Recruiter', admin: 'Admin', super_admin: 'Super Admin', candidate: 'Candidate' };

function timeAgo(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function ReplyBox({ message, onSent }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    setError('');
    try {
      await api.sendMessage({
        toUserId: message.fromUserId || message.from,
        message: text.trim(),
        jobId: message.jobId,
        jobTitle: message.jobTitle,
      });
      setSent(true);
      onSent?.();
    } catch (e) {
      setError(e.message || 'Failed to send.');
    } finally {
      setSending(false);
    }
  };

  if (sent) return <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginTop: 8 }}>✅ Reply sent!</div>;

  return (
    <div style={{ marginTop: 10, borderTop: '1px solid rgba(1,118,211,0.1)', paddingTop: 10 }}>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Write a reply…"
        rows={2}
        style={{ width: '100%', padding: '8px 12px', background: '#F8FAFF', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 10, color: '#181818', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
      />
      {error && <div style={{ color: '#BA0517', fontSize: 11, marginTop: 4 }}>{error}</div>}
      <button
        onClick={send}
        disabled={sending || !text.trim()}
        style={{ marginTop: 6, background: '#0176D3', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, padding: '6px 16px', cursor: 'pointer', opacity: (sending || !text.trim()) ? 0.6 : 1 }}>
        {sending ? 'Sending…' : '↩ Reply'}
      </button>
    </div>
  );
}

export default function MessageInbox({ open, onClose }) {
  const [msgs, setMsgs]       = useState([]);
  const [loading, setLoading]  = useState(true);
  const [replyTo, setReplyTo]  = useState(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.getMessageInbox()
      .then(r => setMsgs(Array.isArray(r?.data) ? r.data : []))
      .catch(() => setMsgs([]))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 8998 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: Math.min(400, window.innerWidth),
        background: '#fff', zIndex: 8999,
        boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column',
        borderTopLeftRadius: 20, borderBottomLeftRadius: 20,
        overflow: 'hidden',
      }}>
        <div style={{ background: 'linear-gradient(135deg,#032D60,#0176D3)', padding: '20px 20px 16px', color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>💬</span>
          <span style={{ fontWeight: 800, fontSize: 16, flex: 1 }}>Messages</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9E9D9B', fontSize: 13 }}>Loading…</div>
          ) : msgs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
              <div style={{ color: '#706E6B', fontSize: 13 }}>No messages yet.</div>
            </div>
          ) : (
            msgs.map(m => (
              <div key={m._id} style={{ background: '#F8FAFC', border: '1px solid rgba(1,118,211,0.1)', borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#032D60,#0176D3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                    {m.fromName?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#181818' }}>{m.fromName || 'Unknown'}</div>
                    <div style={{ fontSize: 11, color: '#9E9D9B' }}>{ROLE_LABEL[m.fromRole] || m.fromRole} · {timeAgo(m.createdAt)}</div>
                  </div>
                  {!m.readAt && <span style={{ width: 8, height: 8, background: '#0176D3', borderRadius: '50%', flexShrink: 0 }} />}
                </div>
                {m.jobTitle && (
                  <div style={{ fontSize: 11, color: '#0176D3', fontWeight: 600, marginBottom: 6 }}>💼 Re: {m.jobTitle}</div>
                )}
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.message}</div>

                {/* Reply button */}
                {(m.fromUserId || m.from) && (
                  replyTo === m._id ? (
                    <ReplyBox
                      message={m}
                      onSent={() => setReplyTo(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setReplyTo(m._id)}
                      style={{ marginTop: 8, background: 'none', border: '1px solid rgba(1,118,211,0.25)', borderRadius: 8, color: '#0176D3', fontSize: 11, fontWeight: 600, padding: '4px 12px', cursor: 'pointer' }}>
                      ↩ Reply
                    </button>
                  )
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
