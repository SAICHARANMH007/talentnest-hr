'use client';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function SchedulingPage() {
  const { token } = useParams();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed]   = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/schedule/${token}`)
      .then(r => r.json())
      .then(json => {
        if (!json.success) setError(json.error || 'Link not found');
        else setData(json.data);
      })
      .catch(() => setError('Failed to load scheduling link'))
      .finally(() => setLoading(false));
  }, [token]);

  const confirmSlot = async () => {
    if (!selected) return;
    setConfirming(true);
    try {
      const res = await fetch(`${API_BASE}/api/schedule/${token}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedSlot: selected }),
      });
      const json = await res.json();
      if (!json.success) setError(json.error || 'Failed to confirm slot');
      else setConfirmed(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  const fmt = (iso) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
      time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };
  };

  const bg = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  };

  const card = {
    background: '#fff',
    borderRadius: 20,
    boxShadow: '0 8px 40px rgba(124,58,237,0.10)',
    maxWidth: 520,
    width: '100%',
    overflow: 'hidden',
  };

  const header = {
    background: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
    padding: '28px 32px',
    color: '#fff',
  };

  const body = { padding: '28px 32px' };

  if (loading) return (
    <div style={bg}>
      <div style={{ ...card, padding: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <p style={{ color: '#6B7280', fontSize: 15 }}>Loading your scheduling link…</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={bg}>
      <div style={{ ...card, padding: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
        <h2 style={{ color: '#1F2937', fontSize: 20, margin: '0 0 8px', fontWeight: 700 }}>Link Unavailable</h2>
        <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>{error}</p>
      </div>
    </div>
  );

  if (data?.status === 'confirmed' && !confirmed) return (
    <div style={bg}>
      <div style={card}>
        <div style={header}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Already Confirmed</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.8, fontSize: 13 }}>{data.jobTitle}</p>
        </div>
        <div style={body}>
          <p style={{ color: '#374151', fontSize: 15 }}>You have already confirmed your interview slot.</p>
          {data.selectedSlot && (() => {
            const { date, time } = fmt(data.selectedSlot);
            return (
              <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 12, padding: '16px 20px', marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Your Interview</div>
                <div style={{ color: '#14532D', fontWeight: 600, fontSize: 15 }}>{date}</div>
                <div style={{ color: '#166534', fontSize: 14 }}>{time}</div>
              </div>
            );
          })()}
          {data.format && (
            <p style={{ color: '#6B7280', fontSize: 13, marginTop: 16 }}>
              Format: <strong style={{ color: '#374151' }}>{data.format === 'video' ? '📹 Video Call' : data.format === 'phone' ? '📞 Phone' : '🏢 In-Person'}</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (confirmed) return (
    <div style={bg}>
      <div style={card}>
        <div style={{ ...header, background: 'linear-gradient(135deg, #059669, #10B981)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Interview Confirmed!</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.8, fontSize: 13 }}>{data?.jobTitle}</p>
        </div>
        <div style={body}>
          <p style={{ color: '#374151', fontSize: 15, margin: '0 0 16px' }}>
            Your interview has been scheduled. The recruiter has been notified and you'll receive a confirmation shortly.
          </p>
          {selected && (() => {
            const { date, time } = fmt(selected);
            return (
              <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Your Interview</div>
                <div style={{ color: '#14532D', fontWeight: 600, fontSize: 15 }}>{date}</div>
                <div style={{ color: '#166534', fontSize: 14 }}>{time}</div>
              </div>
            );
          })()}
          <p style={{ color: '#9CA3AF', fontSize: 12, margin: 0 }}>Good luck! 🌟</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={bg}>
      <div style={card}>
        <div style={header}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Schedule Your Interview</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.8, fontSize: 13 }}>{data?.jobTitle}</p>
        </div>
        <div style={body}>
          <p style={{ color: '#374151', fontSize: 15, margin: '0 0 6px' }}>
            Hi <strong>{data?.candidateName}</strong>,
          </p>
          <p style={{ color: '#6B7280', fontSize: 14, margin: '0 0 20px', lineHeight: 1.6 }}>
            <strong>{data?.recruiterName || 'Your recruiter'}</strong> has offered the following interview slots. Please select your preferred time.
          </p>

          {data?.notes && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Note from recruiter</div>
              <p style={{ color: '#78350F', fontSize: 13, margin: 0, lineHeight: 1.6 }}>{data.notes}</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {(data?.availableSlots || []).map((slot, i) => {
              const { date, time } = fmt(slot);
              const isSelected = selected === slot;
              return (
                <button
                  key={i}
                  onClick={() => setSelected(slot)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: isSelected ? '2px solid #7C3AED' : '1.5px solid #E5E7EB',
                    background: isSelected ? '#F5F3FF' : '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 0 0 3px rgba(124,58,237,0.12)' : 'none',
                  }}
                >
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%',
                    border: isSelected ? '6px solid #7C3AED' : '2px solid #D1D5DB',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }} />
                  <span>
                    <span style={{ display: 'block', fontWeight: 600, color: isSelected ? '#6D28D9' : '#111827', fontSize: 14 }}>{date}</span>
                    <span style={{ color: isSelected ? '#7C3AED' : '#6B7280', fontSize: 13 }}>{time}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {data?.format && (
            <p style={{ color: '#6B7280', fontSize: 13, margin: '0 0 20px' }}>
              Format: <strong style={{ color: '#374151' }}>
                {data.format === 'video' ? '📹 Video Call' : data.format === 'phone' ? '📞 Phone' : '🏢 In-Person'}
              </strong>
            </p>
          )}

          {error && <p style={{ color: '#EF4444', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}

          <button
            onClick={confirmSlot}
            disabled={!selected || confirming}
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: 12,
              border: 'none',
              background: !selected ? '#E5E7EB' : 'linear-gradient(135deg, #7C3AED, #4F46E5)',
              color: !selected ? '#9CA3AF' : '#fff',
              fontWeight: 700,
              fontSize: 15,
              cursor: !selected ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {confirming ? 'Confirming…' : 'Confirm This Slot →'}
          </button>

          <p style={{ color: '#9CA3AF', fontSize: 11, marginTop: 16, textAlign: 'center' }}>
            Powered by <strong>TalentNest HR</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
