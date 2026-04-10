import { useState, useEffect } from 'react';
import { api } from '../../api/api.js';

const S = {
  card: { background: '#fff', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 16, padding: 24, marginBottom: 20 },
  h3:   { color: '#181818', fontWeight: 700, fontSize: 15, margin: '0 0 4px' },
  sub:  { color: '#9E9D9B', fontSize: 12, marginBottom: 16 },
  row:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#FAFAF9', borderRadius: 10, border: '1px solid #F1F5F9', marginBottom: 8 },
  badge: (active) => ({
    display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
    background: active ? 'rgba(16,185,129,0.1)' : 'rgba(158,157,155,0.12)',
    color: active ? '#065f46' : '#706E6B',
  }),
  toggle: (on) => ({
    width: 42, height: 24, borderRadius: 12, cursor: 'pointer', border: 'none', padding: 0,
    background: on ? '#0176D3' : '#DDDBDA', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
  }),
  thumb: (on) => ({
    position: 'absolute', top: 3, left: on ? 21 : 3, width: 18, height: 18,
    borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
  }),
  btn: { background: 'rgba(186,5,23,0.08)', border: '1px solid rgba(186,5,23,0.25)', borderRadius: 8, color: '#BA0517', fontWeight: 600, fontSize: 11, padding: '4px 10px', cursor: 'pointer' },
  btnSecondary: { background: 'rgba(1,118,211,0.08)', border: '1px solid rgba(1,118,211,0.25)', borderRadius: 8, color: '#0176D3', fontWeight: 600, fontSize: 12, padding: '8px 16px', cursor: 'pointer' },
};

function Toggle({ on, onChange, disabled }) {
  return (
    <button style={S.toggle(on)} onClick={() => !disabled && onChange(!on)} disabled={disabled} aria-label="Toggle">
      <span style={S.thumb(on)} />
    </button>
  );
}

export default function SecuritySettings({ user }) {
  const [twoFA, setTwoFA]       = useState(user?.twoFactorEnabled || false);
  const [toggling, setToggling] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [terminatingId, setTerminatingId] = useState('');
  const [terminatingAll, setTerminatingAll] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { loadSessions(); }, []);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const r = await api.getSessions();
      setSessions(Array.isArray(r?.data) ? r.data : []);
    } catch { setSessions([]); }
    setLoadingSessions(false);
  };

  const handleToggle2FA = async () => {
    setToggling(true);
    try {
      const r = await api.toggle2FA();
      setTwoFA(r.twoFactorEnabled);
      setToast(r.message || (r.twoFactorEnabled ? '2FA enabled!' : '2FA disabled.'));
    } catch (e) { setToast('❌ ' + e.message); }
    setToggling(false);
    setTimeout(() => setToast(''), 4000);
  };

  const terminateSession = async (id) => {
    setTerminatingId(id);
    try {
      await api.terminateSession(id);
      setSessions(prev => prev.filter(s => s.id !== id && s._id !== id));
      setToast('Session terminated.');
    } catch (e) { setToast('❌ ' + e.message); }
    setTerminatingId('');
    setTimeout(() => setToast(''), 3000);
  };

  const terminateOtherSessions = async () => {
    setTerminatingAll(true);
    try {
      const r = await api.terminateOtherSessions();
      setToast(r.message || 'Other sessions terminated.');
      await loadSessions();
    } catch (e) { setToast('❌ ' + e.message); }
    setTerminatingAll(false);
    setTimeout(() => setToast(''), 3000);
  };

  const otherSessions = sessions.filter(s => !s.isCurrent);

  return (
    <div>
      {toast && (
        <div style={{ background: toast.startsWith('❌') ? 'rgba(186,5,23,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${toast.startsWith('❌') ? 'rgba(186,5,23,0.3)' : 'rgba(16,185,129,0.3)'}`, borderRadius: 10, padding: '10px 16px', color: toast.startsWith('❌') ? '#BA0517' : '#065f46', fontSize: 13, marginBottom: 16 }}>
          {toast}
        </div>
      )}

      {/* Two-Factor Authentication */}
      <div style={S.card}>
        <h3 style={S.h3}>🔐 Two-Factor Authentication (2FA)</h3>
        <p style={S.sub}>Add an extra layer of security. An OTP will be sent to your {user?.phone ? 'phone via SMS' : 'email'} on each login.</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#181818' }}>
              {twoFA ? '✅ 2FA is enabled' : '⬜ 2FA is disabled'}
            </span>
            {user?.phone && (
              <div style={{ fontSize: 11, color: '#706E6B', marginTop: 3 }}>OTP will be sent to {user.phone}</div>
            )}
          </div>
          <Toggle on={twoFA} onChange={handleToggle2FA} disabled={toggling} />
        </div>
        {!user?.phone && (
          <div style={{ marginTop: 12, fontSize: 11, color: '#706E6B', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '8px 12px' }}>
            💡 Add a phone number to your profile to receive OTP via SMS instead of email.
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h3 style={{ ...S.h3, margin: 0 }}>📱 Active Sessions</h3>
          {otherSessions.length > 0 && (
            <button
              onClick={terminateOtherSessions}
              disabled={terminatingAll}
              style={{ ...S.btn, background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)', color: '#B45309' }}
            >
              {terminatingAll ? 'Signing out…' : `Sign out ${otherSessions.length} other${otherSessions.length > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
        <p style={S.sub}>These devices are currently logged into your account.</p>

        {loadingSessions ? (
          <div style={{ textAlign: 'center', color: '#9E9D9B', fontSize: 13, padding: 20 }}>Loading sessions…</div>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9E9D9B', fontSize: 13, padding: 20 }}>No active sessions found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sessions.map(s => {
              const sid = s.id || s._id?.toString();
              return (
                <div key={sid} style={{ ...S.row, background: s.isCurrent ? 'rgba(1,118,211,0.04)' : '#FAFAF9', borderColor: s.isCurrent ? 'rgba(1,118,211,0.2)' : '#F1F5F9' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#181818', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.isCurrent ? '🟢 ' : '💻 '}{s.deviceName || 'Unknown Device'}
                      </span>
                      {s.isCurrent && <span style={S.badge(true)}>current</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#9E9D9B' }}>
                      {s.ip && `${s.ip} · `}
                      {s.lastActive ? `Last active ${new Date(s.lastActive).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
                    </div>
                  </div>
                  {!s.isCurrent && (
                    <button
                      onClick={() => terminateSession(sid)}
                      disabled={terminatingId === sid}
                      style={{ ...S.btn, marginLeft: 12, flexShrink: 0 }}
                    >
                      {terminatingId === sid ? '…' : 'Sign out'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
