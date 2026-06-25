import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';

export default function GuestJoin({ roomToken, onJoin }) {
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [room, setRoom]   = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [msUntil, setMsUntil] = useState(null);
  const navigate = useNavigate();

  const fetchRoom = useCallback(() => {
    setLoading(true);
    api.getRoom(roomToken)
      .then(r => {
        setRoom(r?.data || r);
        setMsUntil(null);
        setLoading(false);
      })
      .catch(err => {
        const msg = err?.response?.data?.error || err?.message || 'Room not found.';
        const isEarly = err?.response?.status === 425 || msg?.toLowerCase().includes('early');
        if (isEarly) {
          const ms = err?.response?.data?.msUntil ?? 0;
          setRoom(err?.response?.data || {});
          setMsUntil(ms > 0 ? ms : null);
          setLoading(false);
        } else {
          setError(msg);
          setLoading(false);
        }
      });
  }, [roomToken]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  // Tick countdown — one timeout per second avoids runaway interval
  useEffect(() => {
    if (!msUntil || msUntil <= 0) return;
    const t = setTimeout(() => setMsUntil(m => Math.max(0, (m || 0) - 1000)), 1000);
    return () => clearTimeout(t);
  }, [msUntil]);

  // When countdown hits 0, re-fetch room (it should be open now)
  useEffect(() => {
    if (msUntil !== 0) return;
    const t = setTimeout(fetchRoom, 400);
    return () => clearTimeout(t);
  }, [msUntil, fetchRoom]);

  const formatCountdown = ms => {
    if (!ms || ms <= 0) return '0:00';
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60), s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleJoin = e => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError('Please enter your name.'); return; }
    if (trimmed.length < 2) { setError('Name must be at least 2 characters.'); return; }
    if (trimmed.length > 60) { setError('Name must be 60 characters or less.'); return; }
    onJoin({ name: trimmed, email: email.trim(), isGuest: true });
  };

  if (loading) return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ width: 36, height: 36, border: '3px solid #0176D3', borderTopColor: 'transparent', borderRadius: '50%', animation: 'tn-spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#94A3B8', fontSize: 14 }}>Loading room…</p>
          <style>{`@keyframes tn-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🚫</div>
          <h2 style={{ color: '#0F172A', marginBottom: 8, fontSize: 22 }}>Unable to Join</h2>
          <p style={{ color: '#64748B', marginBottom: 24, fontSize: 14 }}>{error}</p>
          <p style={{ color: '#94A3B8', fontSize: 13 }}>If you believe this is an error, please contact the interviewer.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🎥</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
            {room?.jobTitle || 'Interview Room'}
          </h1>
          <p style={{ color: '#64748B', margin: '0 0 4px', fontSize: 14 }}>{room?.orgName || 'TalentNest HR'}</p>
          {room?.scheduledAt && (
            <p style={{ color: '#94A3B8', fontSize: 13, margin: 0 }}>
              {new Date(room.scheduledAt).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' })}
              {' · '}
              {new Date(room.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </p>
          )}
        </div>

        {/* Early-join info banner */}
        {msUntil !== null && msUntil > 0 && (
          <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: '12px 16px', marginBottom: 20, textAlign: 'center' }}>
            <p style={{ color: '#92400E', fontSize: 13, fontWeight: 700, margin: '0 0 4px' }}>⏰ Interview starts soon</p>
            <p style={{ color: '#78350F', fontSize: 13, margin: 0 }}>
              Room opens in <strong>{formatCountdown(msUntil)}</strong>
            </p>
            <p style={{ color: '#92400E', fontSize: 12, margin: '4px 0 0' }}>You can enter your name now and join when it opens.</p>
          </div>
        )}

        <form onSubmit={handleJoin}>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Your Full Name *</label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="Enter your name"
              style={styles.input}
              autoFocus
              maxLength={60}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={styles.label}>Email Address (optional)</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="For post-session summary"
              style={styles.input}
            />
          </div>
          {error && <p style={{ color: '#DC2626', fontSize: 13, margin: '-8px 0 14px' }}>{error}</p>}
          <button type="submit" style={styles.btn}>Join Meeting</button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', borderTop: '1px solid #F1F5F9', paddingTop: 16 }}>
          <p style={{ color: '#64748B', fontSize: 12, margin: '0 0 8px' }}>Are you the interviewer?</p>
          <button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: '#0176D3', fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
            Log in to your account
          </button>
        </div>

        <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 11, marginTop: 20 }}>
          By joining, you consent to the meeting being recorded if the host enables recording.
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0176D3 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: {
    background: '#fff', borderRadius: 20, padding: '36px 36px', width: '100%', maxWidth: 440,
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
  },
  label: { display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 },
  input: {
    width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0',
    fontSize: 15, outline: 'none', boxSizing: 'border-box',
  },
  btn: {
    width: '100%', padding: '14px', background: 'linear-gradient(135deg, #0176D3, #0ea5e9)',
    color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer',
  },
};
