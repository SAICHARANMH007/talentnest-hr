import React, { useState, useEffect } from 'react';
import { api } from '../../api/api.js';

const TEMPLATES = {
  announcement: {
    emoji: '📢', bg: 'linear-gradient(135deg,#032D60,#0176D3)',
    badge: 'Platform Announcement', badgeBg: '#0176D3',
    border: '#BFDBFE', cardBg: '#EFF6FF',
  },
  warning: {
    emoji: '⚠️', bg: 'linear-gradient(135deg,#92400E,#B45309)',
    badge: 'Important Notice', badgeBg: '#B45309',
    border: '#FDE68A', cardBg: '#FFFBEB',
  },
  celebration: {
    emoji: '🎉', bg: 'linear-gradient(135deg,#065F46,#059669)',
    badge: 'Great News!', badgeBg: '#059669',
    border: '#BBF7D0', cardBg: '#F0FDF4',
  },
  update: {
    emoji: '🔄', bg: 'linear-gradient(135deg,#3730A3,#6D28D9)',
    badge: 'Platform Update', badgeBg: '#6D28D9',
    border: '#DDD6FE', cardBg: '#F5F3FF',
  },
  info: {
    emoji: 'ℹ️', bg: 'linear-gradient(135deg,#0E7490,#0284C7)',
    badge: 'Information', badgeBg: '#0284C7',
    border: '#BAE6FD', cardBg: '#F0F9FF',
  },
};

function BroadcastModal({ item, onClose }) {
  const style = TEMPLATES[item?.metadata?.templateStyle] || TEMPLATES.announcement;
  const [closing, setClosing] = React.useState(false);

  const dismiss = async () => {
    setClosing(true);
    try { await api.markRead(item._id || item.id); } catch {}
    setTimeout(onClose, 200);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, animation: closing ? 'broadcastFadeOut 0.2s ease forwards' : 'broadcastFadeIn 0.3s ease',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520,
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden',
        animation: closing ? 'broadcastSlideOut 0.2s ease forwards' : 'broadcastSlideIn 0.35s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* Header gradient */}
        <div style={{ background: style.bg, padding: '28px 28px 24px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 28 }}>{style.emoji}</span>
            <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>
              {style.badge}
            </span>
          </div>
          <h2 style={{ color: '#fff', margin: 0, fontSize: 20, fontWeight: 800, lineHeight: 1.3 }}>
            {item.title}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', margin: '6px 0 0', fontSize: 12 }}>
            From {item.metadata?.fromAdmin || 'Platform Admin'} · {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          <button onClick={dismiss} style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
            width: 32, height: 32, cursor: 'pointer', color: '#fff', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px 28px', background: style.cardBg, borderTop: `1px solid ${style.border}` }}>
          <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {item.message}
          </p>

          <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
            <button onClick={() => { window.location.href = '/app/dashboard'; dismiss(); }} style={{
              background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 10,
              padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151',
            }}>
              Go to Dashboard
            </button>
            <button onClick={dismiss} style={{
              background: style.bg, color: '#fff', border: 'none', borderRadius: 10,
              padding: '10px 24px', fontSize: 13, fontWeight: 800, cursor: 'pointer',
            }}>
              Got it! ✓
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes broadcastFadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes broadcastFadeOut { from { opacity:1 } to { opacity:0 } }
        @keyframes broadcastSlideIn { from { opacity:0; transform:scale(0.92) translateY(16px) } to { opacity:1; transform:scale(1) translateY(0) } }
        @keyframes broadcastSlideOut{ from { opacity:1; transform:scale(1)    } to   { opacity:0; transform:scale(0.92) translateY(8px) } }
      `}</style>
    </div>
  );
}

// Candidate-specific template — warmer, more engaging
function CandidateBroadcastModal({ item, onClose }) {
  const style = TEMPLATES[item?.metadata?.templateStyle] || TEMPLATES.info;
  const [closing, setClosing] = React.useState(false);

  const dismiss = async () => {
    setClosing(true);
    try { await api.markRead(item._id || item.id); } catch {}
    setTimeout(onClose, 200);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, animation: closing ? 'broadcastFadeOut 0.2s ease forwards' : 'broadcastFadeIn 0.3s ease',
    }}>
      <div style={{
        background: '#fff', borderRadius: 24, width: '100%', maxWidth: 480,
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden',
        animation: closing ? 'broadcastSlideOut 0.2s ease forwards' : 'broadcastSlideIn 0.35s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{ background: style.bg, padding: '32px 28px 28px', textAlign: 'center', position: 'relative' }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>{style.emoji}</div>
          <div style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', borderRadius: 20, padding: '4px 14px', fontSize: 11, fontWeight: 800, display: 'inline-block', marginBottom: 10 }}>
            {style.badge}
          </div>
          <h2 style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 800 }}>{item.title}</h2>
          <button onClick={dismiss} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div style={{ padding: '24px 28px 28px' }}>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap', textAlign: 'center' }}>
            {item.message}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={dismiss} style={{ flex: 1, background: style.bg, color: '#fff', border: 'none', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
              Understood! ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Recruiter/Admin template — professional
function AdminBroadcastModal({ item, onClose }) {
  const style = TEMPLATES[item?.metadata?.templateStyle] || TEMPLATES.announcement;
  const [closing, setClosing] = React.useState(false);

  const dismiss = async () => {
    setClosing(true);
    try { await api.markRead(item._id || item.id); } catch {}
    setTimeout(onClose, 200);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        border: `1px solid ${style.border}`,
        animation: closing ? 'broadcastSlideOut 0.2s ease forwards' : 'broadcastSlideIn 0.35s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* Colored top strip */}
        <div style={{ background: style.bg, height: 6, borderRadius: '16px 16px 0 0' }} />
        <div style={{ padding: '24px 28px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
            <span style={{ fontSize: 32, flexShrink: 0 }}>{style.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ background: style.badgeBg, color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 800 }}>{style.badge}</span>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0A1628' }}>{item.title}</h3>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9CA3AF' }}>From: {item.metadata?.fromAdmin || 'Platform Admin'}</p>
            </div>
            <button onClick={dismiss} style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', color: '#374151', fontSize: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
          <div style={{ background: style.cardBg, borderRadius: 10, padding: '14px 16px', border: `1px solid ${style.border}`, marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {item.message}
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={dismiss} style={{ background: style.bg, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
              Acknowledged ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BroadcastBanner({ userRole }) {
  const [broadcasts, setBroadcasts] = useState([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    // Only show broadcasts after a short delay so the page can settle
    const timer = setTimeout(() => {
      api.getActiveBroadcasts()
        .then(items => {
          const valid = (items || []).filter(b => {
            if (b.metadata?.expiresAt && new Date(b.metadata.expiresAt) < new Date()) return false;
            return true;
          });
          if (valid.length) setBroadcasts(valid);
        })
        .catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  if (!broadcasts.length || current >= broadcasts.length) return null;

  const item = broadcasts[current];
  const advance = () => {
    if (current + 1 < broadcasts.length) setCurrent(c => c + 1);
    else setBroadcasts([]);
  };

  const role = userRole || 'candidate';

  if (role === 'candidate') return <CandidateBroadcastModal item={item} onClose={advance} />;
  if (role === 'admin' || role === 'super_admin') return <AdminBroadcastModal item={item} onClose={advance} />;
  return <BroadcastModal item={item} onClose={advance} />;
}
