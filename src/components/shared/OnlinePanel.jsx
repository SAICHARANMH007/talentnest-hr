import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/api.js';
import OnlineDot from '../ui/OnlineDot.jsx';
import MessageModal from './MessageModal.jsx';

const ROLE_LABEL = {
  super_admin    : 'Super Admin',
  admin          : 'Admin',
  recruiter      : 'Recruiter',
  hiring_manager : 'Hiring Manager',
  candidate      : 'Candidate',
  client         : 'Client',
};

const ROLE_COLOR = {
  super_admin    : '#7C3AED',
  admin          : '#0176D3',
  recruiter      : '#0891b2',
  hiring_manager : '#d97706',
  candidate      : '#059669',
  client         : '#6b7280',
};

export default function OnlinePanel({ user, open, onClose }) {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [msgTarget, setMsgTarget] = useState(null);
  const [search, setSearch] = useState('');

  const canMessage = true; // all roles with access to OnlinePanel can message

  const load = useCallback(() => {
    api.getOnlineUsers()
      .then(r => setUsers(Array.isArray(r?.data) ? r.data : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [open, load]);

  if (!open) return null;

  const filtered = users.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.role?.includes(search.toLowerCase())
  );

  return (
    <>
      {msgTarget && (
        <MessageModal
          recipient={msgTarget}
          onClose={() => setMsgTarget(null)}
        />
      )}

      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 8998 }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: Math.min(360, window.innerWidth),
        background: '#fff', zIndex: 8999,
        boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column',
        borderTopLeftRadius: 20, borderBottomLeftRadius: 20,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#032D60,#0176D3)', padding: '20px 20px 16px', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <OnlineDot online size={10} style={{ border: '2px solid rgba(255,255,255,0.4)' }} />
            <span style={{ fontWeight: 800, fontSize: 16 }}>Online Now</span>
            <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.18)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{users.length}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: 20, cursor: 'pointer', lineHeight: 1, marginLeft: 4 }}>×</button>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or role…"
            style={{ marginTop: 12, width: '100%', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9E9D9B', fontSize: 13 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>👤</div>
              <div style={{ color: '#706E6B', fontSize: 13 }}>
                {users.length === 0 ? 'No one else is online right now.' : 'No results found.'}
              </div>
            </div>
          ) : (
            filtered.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, marginBottom: 4, background: 'rgba(1,118,211,0.03)', border: '1px solid rgba(1,118,211,0.06)' }}>
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {u.photoUrl ? (
                    <img src={u.photoUrl} alt={u.name} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: `${ROLE_COLOR[u.role] || '#0176D3'}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: ROLE_COLOR[u.role] || '#0176D3' }}>
                      {u.name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <OnlineDot online size={9} style={{ position: 'absolute', bottom: 0, right: 0 }} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#181818', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: ROLE_COLOR[u.role] || '#0176D3', background: `${ROLE_COLOR[u.role] || '#0176D3'}18`, borderRadius: 6, padding: '1px 6px' }}>
                      {ROLE_LABEL[u.role] || u.role}
                    </span>
                    {u.title && <span style={{ fontSize: 11, color: '#9E9D9B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.title}</span>}
                  </div>
                </div>

                {/* Message button */}
                {canMessage && (
                  <button
                    onClick={() => setMsgTarget(u)}
                    title={`Message ${u.name}`}
                    style={{ background: 'rgba(1,118,211,0.08)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 700, color: '#0176D3', cursor: 'pointer', flexShrink: 0 }}
                  >
                    💬
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid #F3F2F2', fontSize: 11, color: '#9E9D9B', textAlign: 'center' }}>
          Updates every 30 seconds · Last 2 minutes activity
        </div>
      </div>
    </>
  );
}
