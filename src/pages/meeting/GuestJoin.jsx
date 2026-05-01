import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    api.getRoom(roomToken)
      .then(r => { setRoom(r?.data || r); setLoading(false); })
      .catch(err => {
        const msg = err?.response?.data?.error || err?.message || 'Room not found.';
        if (err?.response?.status === 425) {
          setMsUntil(err.response.data.msUntil);
          setRoom(err.response.data);
        }
        setError(msg);
        setLoading(false);
      });
  }, [roomToken]);

  // Countdown for early join
  useEffect(() => {
    if (!msUntil) return;
    const interval = setInterval(() => setMsUntil(m => Math.max(0, m - 1000)), 1000);
    return () => clearInterval(interval);
  }, [!!msUntil]);

  const formatCountdown = (ms) => {
    if (!ms || ms <= 0) return '0:00';
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter your name.'); return; }
    onJoin({ name: name.trim(), email: email.trim(), isGuest: true });
  };

  if (loading) return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Loading room...</div>
      </div>
    </div>
  );

  if (error && !msUntil) return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
          <h2 style={{ color: '#0F172A', marginBottom: 8 }}>Unable to Join</h2>
          <p style={{ color: '#64748B', marginBottom: 24 }}>{error}</p>
          <p style={{ color: '#94A3B8', fontSize: 13 }}>If you believe this is an error, please contact the interviewer.</p>
        </div>
      </div>
    </div>
  );

  if (msUntil > 0) return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
          <h2 style={{ color: '#0F172A', marginBottom: 8 }}>Meeting Hasn't Started Yet</h2>
          {room?.scheduledAt && (
            <p style={{ color: '#64748B' }}>
              Scheduled for {new Date(room.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} · {new Date(room.scheduledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          )}
          <div style={{ fontSize: 56, fontWeight: 900, color: '#0176D3', margin: '24px 0', fontVariantNumeric: 'tabular-nums' }}>
            {formatCountdown(msUntil)}
          </div>
          <p style={{ color: '#94A3B8', fontSize: 13 }}>The room opens 15 minutes before the scheduled time.</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎥</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
            {room?.jobTitle || 'Interview Room'}
          </h1>
          <p style={{ color: '#64748B', margin: 0 }}>{room?.orgName || 'TalentNest HR'}</p>
          {room?.scheduledAt && (
            <p style={{ color: '#94A3B8', fontSize: 13, marginTop: 6 }}>
              {new Date(room.scheduledAt).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' })} · {new Date(room.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </p>
          )}
        </div>

        <form onSubmit={handleJoin}>
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Your Full Name *</label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="Enter your name"
              style={styles.input}
              autoFocus
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={styles.label}>Email Address (optional)</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="For post-session summary"
              style={styles.input}
            />
          </div>
          {error && <p style={{ color: '#DC2626', fontSize: 13, margin: '-12px 0 16px' }}>{error}</p>}
          <button type="submit" style={styles.btn}>
            Join Meeting
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 12, marginTop: 20 }}>
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    padding: '40px 40px',
    width: '100%',
    maxWidth: 440,
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 10,
    border: '1.5px solid #E2E8F0',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  btn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #0176D3, #0ea5e9)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: 0.3,
  },
};
