import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import { card, btnP, btnG } from '../../constants/styles.js';

// ── User Profile Drawer ────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function maskPhone(p) {
  if (!p) return null;
  const s = String(p).replace(/\D/g,'');
  if (s.length < 6) return '••••••';
  return s.slice(0,2) + '•'.repeat(s.length - 4) + s.slice(-2);
}
function maskEmail(e) {
  if (!e) return null;
  const [local, domain] = e.split('@');
  if (!domain) return e[0] + '•'.repeat(Math.max(1, e.length - 2)) + e.slice(-1);
  return local[0] + '•'.repeat(Math.max(1, local.length - 1)) + '@' + domain;
}

function UserProfileDrawer({ person, onClose, onRemove, currentUserId }) {
  const [posts, setPosts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [compose, setCompose]     = useState(false);
  const [msgText, setMsgText]     = useState('');
  const [sending, setSending]     = useState(false);
  const [msgSent, setMsgSent]     = useState(false);
  const [reqSent, setReqSent]     = useState(false);
  const bg = ROLE_COLOR[person.role] || '#0176D3';
  const uid = String(person._id || person.id);

  useEffect(() => {
    setLoading(true);
    api.getUserPosts(uid)
      .then(r => setPosts(Array.isArray(r?.data) ? r.data.slice(0, 5) : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [uid]);

  const sendMsg = async () => {
    if (!msgText.trim()) return;
    setSending(true);
    try {
      await api.sendMessage({ toUserId: uid, message: msgText.trim() });
      setMsgSent(true); setMsgText(''); setCompose(false);
    } catch {}
    setSending(false);
  };

  const requestContact = async () => {
    setReqSent(true);
    try {
      await api.sendMessage({ toUserId: uid, message: `Hi ${person.name?.split(' ')[0] || 'there'}, I'd like to connect and exchange contact details on TalentNest.` });
    } catch {}
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 420, background: '#fff', zIndex: 1001, overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 32px rgba(0,0,0,0.18)' }}>
        <div style={{ height: 90, background: `linear-gradient(135deg, ${bg} 0%, ${bg}99 100%)`, position: 'relative', flexShrink: 0 }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ padding: '0 20px 24px', flex: 1 }}>
          <div style={{ marginTop: -36, marginBottom: 12 }}>
            <Avatar name={person.name} src={person.avatarUrl || person.photoUrl} size={72} role={person.role} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 20, color: '#0A1628', marginBottom: 4 }}>{person.name || 'Member'}</div>
            <span style={{ fontSize: 11, fontWeight: 700, background: bg + '18', color: bg, borderRadius: 4, padding: '3px 8px' }}>
              {ROLE_LABEL[person.role] || person.role || 'Member'}
            </span>
            {person.title && <div style={{ fontSize: 13, color: '#6B7280', marginTop: 8 }}>{person.title}</div>}
            {person.department && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>🏢 {person.department}</div>}
            {person.location && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>📍 {person.location}</div>}
          </div>

          {/* Privacy-masked contact info */}
          <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 14px', marginBottom: 16, border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contact Info</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div>
                {person.phone && <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>📞 {maskPhone(person.phone)}</div>}
                {person.email && <div style={{ fontSize: 12, color: '#6B7280' }}>✉️ {maskEmail(person.email)}</div>}
                {!person.phone && !person.email && <div style={{ fontSize: 12, color: '#9CA3AF' }}>Contact details private</div>}
              </div>
              {!reqSent ? (
                <button onClick={requestContact}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #0176D3', background: '#EFF6FF', color: '#1D4ED8', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                  Request Info
                </button>
              ) : (
                <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>✓ Request sent</span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <button onClick={() => setCompose(v => !v)}
              style={{ flex: 1, minWidth: 120, padding: '10px 16px', borderRadius: 10, border: 'none', background: bg, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              ✉️ {compose ? 'Cancel' : 'Message'}
            </button>
            <button onClick={() => { onRemove(person); onClose(); }}
              style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #D1D5DB', background: '#F9FAFB', color: '#6B7280', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.borderColor = '#FCA5A5'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.borderColor = '#D1D5DB'; }}>
              Remove
            </button>
          </div>

          {/* Inline message compose */}
          {msgSent && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#166534', fontWeight: 600 }}>
              ✅ Message sent to {person.name?.split(' ')[0]}!
            </div>
          )}
          {compose && (
            <div style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Message {person.name?.split(' ')[0] || 'member'}</div>
              <textarea
                value={msgText} onChange={e => setMsgText(e.target.value)}
                placeholder="Write your message…" rows={3}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
                <button onClick={() => { setCompose(false); setMsgText(''); }}
                  style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={sendMsg} disabled={!msgText.trim() || sending}
                  style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: bg, color: '#fff', fontSize: 12, fontWeight: 700, cursor: !msgText.trim() || sending ? 'not-allowed' : 'pointer', opacity: !msgText.trim() || sending ? 0.6 : 1 }}>
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </div>
          )}

          {/* Recent posts */}
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>Recent Posts</div>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '24px 0', fontSize: 13 }}>Loading…</div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '24px 0', fontSize: 13 }}>No posts yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {posts.map(p => (
                <div key={p._id} style={{ ...card, padding: '12px 14px', borderRadius: 10, border: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>{timeAgo(p.createdAt)}</div>
                  <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.content}</div>
                  {p.reactions?.length > 0 && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>{p.reactions.length} reaction{p.reactions.length !== 1 ? 's' : ''}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const ROLE_COLOR = { admin: '#0176D3', recruiter: '#7C3AED', candidate: '#059669', super_admin: '#DC2626', superadmin: '#DC2626' };
const ROLE_LABEL = { admin: 'HR Admin', recruiter: 'Recruiter', candidate: 'Candidate', super_admin: 'Super Admin', superadmin: 'Super Admin' };

function Avatar({ name, src, size = 48, role }) {
  const bg = ROLE_COLOR[role] || '#0176D3';
  if (src) return (
    <img src={src} alt={name}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${bg}22` }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.38, flexShrink: 0 }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

function RoleBadge({ role }) {
  const color = ROLE_COLOR[role] || '#374151';
  const label = ROLE_LABEL[role] || (role || 'Member');
  return (
    <span style={{ fontSize: 10, fontWeight: 700, background: color + '18', color, borderRadius: 4, padding: '2px 6px' }}>
      {label}
    </span>
  );
}

// ── Connection Button ──────────────────────────────────────────────────────────
function ConnectionButton({ person, onAction, loading }) {
  const status = person.connectionStatus;

  if (status === 'accepted') {
    return (
      <button onClick={() => onAction('remove', person)}
        style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#F9FAFB', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.borderColor = '#FCA5A5'; e.currentTarget.textContent = 'Remove'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.color = '#374151'; e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.textContent = '✓ Connected'; }}>
        ✓ Connected
      </button>
    );
  }

  if (status === 'pending_sent') {
    return (
      <button onClick={() => onAction('cancel', person)}
        style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#F9FAFB', color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.borderColor = '#FCA5A5'; e.currentTarget.textContent = 'Cancel'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.textContent = 'Pending…'; }}>
        Pending…
      </button>
    );
  }

  if (status === 'pending_received') {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => onAction('accept', person)}
          style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#0176D3', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          Accept
        </button>
        <button onClick={() => onAction('reject', person)}
          style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#F9FAFB', color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Ignore
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => onAction('connect', person)} disabled={loading}
      style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #0176D3', background: '#EFF6FF', color: '#1D4ED8', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.background = '#0176D3'; e.currentTarget.style.color = '#fff'; }}
      onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#1D4ED8'; }}>
      + Connect
    </button>
  );
}

// ── Person Card ────────────────────────────────────────────────────────────────
function PersonCard({ person, onAction, loading, onCardClick }) {
  return (
    <div style={{ ...card, padding: '14px 16px', borderRadius: 14, cursor: onCardClick ? 'pointer' : 'default' }}
      onClick={onCardClick}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar name={person.name} src={person.avatarUrl || person.photoUrl} size={48} role={person.role} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#0A1628', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.name || 'Member'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
            <RoleBadge role={person.role} />
            {person.department && <span style={{ fontSize: 11, color: '#9CA3AF' }}>{person.department}</span>}
          </div>
          {person.title && <div style={{ fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.title}</div>}
          {person.location && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>📍 {person.location}</div>}
        </div>
        <div style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <ConnectionButton person={person} onAction={onAction} loading={loading} />
        </div>
      </div>
    </div>
  );
}

// ── Suggestion reason chip ─────────────────────────────────────────────────────
function ReasonChip({ reason }) {
  if (!reason) return null;
  const icon =
    reason.includes('invited')         ? '📨' :
    reason.includes('mutual')          ? '🤝' :
    reason.includes('similar role') || reason.includes('Same role') ? '👥' :
    reason.includes('Applied')         ? '💼' :
    reason.includes('skill')           ? '⚡' :
    reason.includes('department')      ? '🏢' : '✨';
  return (
    <div style={{ fontSize: 10, color: '#6B7280', background: '#F3F4F6', borderRadius: 20, padding: '3px 8px', marginTop: 4, display: 'inline-block' }}>
      {icon} {reason}
    </div>
  );
}

// ── Person Grid Card (for suggestions) ────────────────────────────────────────
function PersonGridCard({ person, onAction, loading }) {
  return (
    <div style={{ ...card, padding: '20px 16px', borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8 }}>
      <Avatar name={person.name} src={person.avatarUrl || person.photoUrl} size={60} role={person.role} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: '#0A1628', marginBottom: 4 }}>{person.name || 'Member'}</div>
        <RoleBadge role={person.role} />
        {person.title && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 5 }}>{person.title}</div>}
        {person.location && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>📍 {person.location}</div>}
        {person.mutualConnections > 0 && (
          <div style={{ fontSize: 11, color: '#059669', marginTop: 4, fontWeight: 600 }}>
            🤝 {person.mutualConnections} mutual connection{person.mutualConnections !== 1 ? 's' : ''}
          </div>
        )}
        <ReasonChip reason={person.suggestionReason} />
      </div>
      <ConnectionButton person={person} onAction={onAction} loading={loading} />
    </div>
  );
}

// ── Pending Requests Panel ─────────────────────────────────────────────────────
function PendingRequests({ pending, onAction, loading }) {
  if (!pending.length) return null;
  return (
    <div style={{ ...card, padding: '16px 18px', borderRadius: 14, marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#0A1628', marginBottom: 12 }}>
        Pending Requests <span style={{ background: '#EFF6FF', color: '#1D4ED8', borderRadius: 10, padding: '2px 8px', fontSize: 12 }}>{pending.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pending.map(p => (
          <div key={p._id || p.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={p.name} src={p.avatarUrl || p.photoUrl} size={40} role={p.role} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>{p.name || 'Member'}</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>{p.title || ROLE_LABEL[p.role] || 'Member'}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => onAction('accept', p)}
                style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#0176D3', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Accept
              </button>
              <button onClick={() => onAction('reject', p)}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#F9FAFB', color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Ignore
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function PeoplePage({ user }) {
  const navigate = useNavigate();
  const [tab,          setTab]         = useState('discover');
  const [connections,  setConnections] = useState([]);
  const [pending,      setPending]     = useState([]);
  const [sent,         setSent]        = useState([]);
  const [suggestions,  setSuggestions] = useState([]);
  const [searchResults,setSearchResults] = useState([]);
  const [searchQuery,  setSearchQuery] = useState('');
  const [loading,      setLoading]     = useState(true);
  const [actionLoading,setActionLoading] = useState(null);
  const [error,        setError]       = useState('');
  const [isMobile,     setMobile]      = useState(() => window.innerWidth < 768);
  const [profilePerson,setProfilePerson] = useState(null);
  // Contact sync state
  const [syncOpen,     setSyncOpen]    = useState(false);
  const [syncPaste,    setSyncPaste]   = useState('');
  const [syncResults,  setSyncResults] = useState(null);
  const [syncing,      setSyncing]     = useState(false);
  const [invitedSet,   setInvitedSet]  = useState(new Set());
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', h, { passive: true });
    return () => window.removeEventListener('resize', h);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [conRes, penRes, sugRes, sentRes] = await Promise.all([
        api.getConnections().catch(() => ({ data: [] })),
        api.getPendingRequests().catch(() => ({ data: [] })),
        api.getConnectionSuggestions().catch(() => ({ data: [] })),
        api.getSentRequests().catch(() => ({ data: [] })),
      ]);
      setConnections(conRes?.data || []);
      // Backend returns [{ requestId, from: {...user} }] — flatten to user object with requestId
      setPending((penRes?.data || []).map(r => ({
        ...(r.from || r),
        requestId: r.requestId || r._id,
        connectionStatus: 'pending_received',
      })));
      setSuggestions(sugRes?.data || []);
      setSent(sentRes?.data || []);
    } catch (e) {
      setError('Failed to load people data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await api.searchPeople(searchQuery.trim());
        setSearchResults(r?.data || []);
      } catch {}
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const handleAction = async (action, person) => {
    const id = String(person._id || person.id);
    const reqId = String(person.requestId || person._id || person.id);
    setActionLoading(id);
    setError('');
    try {
      if (action === 'connect') {
        const result = await api.sendConnectionRequest(id);
        const requestId = result?.data?._id || result?.data?.id;
        const update = p => String(p._id || p.id) === id ? { ...p, connectionStatus: 'pending_sent', requestId } : p;
        setSuggestions(s => s.map(update));
        setSearchResults(s => s.map(update));
        setSent(prev => [...prev, { requestId, createdAt: new Date(), to: suggestions.find(p => String(p._id || p.id) === id) || searchResults.find(p => String(p._id || p.id) === id) }]);
      } else if (action === 'accept') {
        await api.acceptConnectionRequest(reqId);
        setPending(p => p.filter(x => String(x._id || x.id) !== id));
        await loadAll();
      } else if (action === 'reject') {
        await api.rejectConnectionRequest(reqId);
        setPending(p => p.filter(x => String(x._id || x.id) !== id));
        const update = p => String(p._id || p.id) === id ? { ...p, connectionStatus: null } : p;
        setSearchResults(s => s.map(update));
      } else if (action === 'remove') {
        await api.removeConnection(id);
        setConnections(c => c.filter(x => String(x._id || x.id) !== id));
        const update = p => String(p._id || p.id) === id ? { ...p, connectionStatus: null } : p;
        setSearchResults(s => s.map(update));
      } else if (action === 'cancel') {
        await api.cancelConnectionRequest(reqId);
        const update = p => String(p._id || p.id) === id ? { ...p, connectionStatus: null, requestId: undefined } : p;
        setSuggestions(s => s.map(update));
        setSearchResults(s => s.map(update));
        setSent(s => s.filter(r => String(r.requestId) !== reqId && String(r.to?._id || r.to?.id || '') !== id));
      }
    } catch (e) {
      setError(e?.message || 'Action failed. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const tabs = [
    { id: 'discover',    label: 'Discover' },
    { id: 'connections', label: `Network (${connections.length})` },
    { id: 'pending',     label: `Requests (${pending.length})` },
    { id: 'sent',        label: `Sent (${sent.length})` },
  ];

  const handleContactSync = async () => {
    const emails = syncPaste.split(/[\n,;]+/).map(e => e.trim().toLowerCase()).filter(e => e.includes('@'));
    if (!emails.length) return;
    setSyncing(true);
    try {
      const r = await api.syncContacts(emails.map(email => ({ email })));
      setSyncResults(r);
    } catch { setSyncResults({ matched: [], unmatched: [] }); }
    finally { setSyncing(false); }
  };

  const uid = String(user?.id || user?._id || '');

  return (
    <div style={{ padding: isMobile ? '12px 0' : '20px clamp(12px,3vw,24px)', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20, padding: isMobile ? '0 12px' : 0 }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 26, fontWeight: 900, color: '#0A1628', letterSpacing: '-0.02em' }}>My Network</h1>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: '#9CA3AF' }}>Connect with candidates, recruiters, and HR professionals on TalentNest</p>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 16, padding: isMobile ? '0 12px' : 0 }}>
        <span style={{ position: 'absolute', left: isMobile ? 24 : 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9CA3AF', pointerEvents: 'none' }}>🔍</span>
        <input
          ref={searchRef}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search people by name or role…"
          style={{ width: '100%', padding: '11px 14px 11px 38px', borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 14, outline: 'none', background: '#FAFBFC', boxSizing: 'border-box', transition: 'border 0.15s, box-shadow 0.15s' }}
          onFocus={e => { e.currentTarget.style.border = '1px solid #0176D3'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(1,118,211,0.1)'; }}
          onBlur={e => { e.currentTarget.style.border = '1px solid #E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')}
            style={{ position: 'absolute', right: isMobile ? 22 : 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        )}
      </div>

      {/* Search results */}
      {searchQuery.trim().length >= 2 && (
        <div style={{ padding: isMobile ? '0 12px' : 0, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
            {searchResults.length ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${searchQuery}"` : `No results for "${searchQuery}"`}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {searchResults.filter(p => String(p._id || p.id) !== uid).map(person => (
              <PersonCard
                key={String(person._id || person.id)}
                person={person}
                onAction={handleAction}
                loading={actionLoading === String(person._id || person.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tabs (only shown when not searching) */}
      {!searchQuery.trim() && (
        <>
          <div style={{ display: 'flex', gap: 2, marginBottom: 16, padding: isMobile ? '0 12px' : 0, borderBottom: '2px solid #F1F5F9' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding: '8px 16px', border: 'none', background: 'none', fontSize: 13, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? '#0176D3' : '#6B7280', cursor: 'pointer', borderBottom: tab === t.id ? '2px solid #0176D3' : '2px solid transparent', marginBottom: -2, whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                {t.label}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 14, marginLeft: isMobile ? 12 : 0, marginRight: isMobile ? 12 : 0 }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9CA3AF' }}>
              <div style={{ width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: '#0176D3', borderRadius: '50%', animation: 'tn-spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              Loading…
            </div>
          ) : (
            <div style={{ padding: isMobile ? '0 12px' : 0 }}>
              {/* Pending requests banner */}
              {tab === 'discover' && pending.length > 0 && (
                <PendingRequests pending={pending} onAction={handleAction} loading={actionLoading} />
              )}

              {/* Discover tab */}
              {tab === 'discover' && (
                <>
                  {suggestions.length === 0 ? (
                    <div style={{ ...card, textAlign: 'center', padding: '40px 24px', borderRadius: 14 }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#374151', marginBottom: 6 }}>You're all caught up!</div>
                      <div style={{ fontSize: 13, color: '#9CA3AF' }}>No more suggestions right now. Use the search bar to find specific people.</div>
                    </div>
                  ) : (
                    <>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>People you may know</div>
                        <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Based on your role, skills, mutual connections, and job applications</div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                        {suggestions.filter(p => String(p._id || p.id) !== uid).map(person => (
                          <PersonGridCard
                            key={String(person._id || person.id)}
                            person={person}
                            onAction={handleAction}
                            loading={actionLoading === String(person._id || person.id)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Connections tab */}
              {tab === 'connections' && (
                <>
                  {connections.length === 0 ? (
                    <div style={{ ...card, textAlign: 'center', padding: '40px 24px', borderRadius: 14 }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>🤝</div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#374151', marginBottom: 6 }}>No connections yet</div>
                      <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>Start building your network by connecting with colleagues.</div>
                      <button onClick={() => setTab('discover')} style={btnP}>Discover People</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {connections.map(person => (
                        <PersonCard
                          key={String(person._id || person.id)}
                          person={{ ...person, connectionStatus: 'accepted' }}
                          onAction={handleAction}
                          loading={actionLoading === String(person._id || person.id)}
                          onCardClick={() => navigate(`/app/profile/${String(person._id || person.id)}`)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Pending tab */}
              {tab === 'pending' && (
                <>
                  {pending.length === 0 ? (
                    <div style={{ ...card, textAlign: 'center', padding: '40px 24px', borderRadius: 14 }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>✉️</div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#374151', marginBottom: 6 }}>No pending requests</div>
                      <div style={{ fontSize: 13, color: '#9CA3AF' }}>When someone sends you a connection request, it will appear here.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {pending.map(person => (
                        <PersonCard
                          key={String(person._id || person.id)}
                          person={{ ...person, connectionStatus: 'pending_received' }}
                          onAction={handleAction}
                          loading={actionLoading === String(person._id || person.id)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Sent tab */}
              {tab === 'sent' && (
                <>
                  {sent.length === 0 ? (
                    <div style={{ ...card, textAlign: 'center', padding: '40px 24px', borderRadius: 14 }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>📤</div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#374151', marginBottom: 6 }}>No sent requests</div>
                      <div style={{ fontSize: 13, color: '#9CA3AF' }}>Requests you send will be tracked here. You can withdraw them anytime.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {sent.map(item => {
                        const person = item.to || {};
                        const pId = String(person._id || person.id || '');
                        return (
                          <div key={String(item.requestId)} style={{ ...card, padding: '14px 16px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Avatar name={person.name} src={person.avatarUrl || person.photoUrl} size={48} role={person.role} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 14, color: '#0A1628' }}>{person.name || 'Member'}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                                <RoleBadge role={person.role} />
                                {person.title && <span style={{ fontSize: 12, color: '#6B7280' }}>{person.title}</span>}
                              </div>
                              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                                Sent {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}
                              </div>
                            </div>
                            <button
                              onClick={() => handleAction('cancel', { ...person, requestId: item.requestId })}
                              disabled={actionLoading === pId}
                              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#DC2626'; e.currentTarget.style.color = '#fff'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; }}>
                              Withdraw
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Contact Sync section — shown in discover tab */}
              {tab === 'discover' && (
                <div style={{ ...card, padding: '20px', borderRadius: 16, marginTop: 16, background: 'linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 100%)', border: '1px solid #BAE6FD' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: syncOpen ? 16 : 0 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📱</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#0C4A6E', marginBottom: 2 }}>Find Friends on TalentNest</div>
                      <div style={{ fontSize: 12, color: '#0369A1', lineHeight: 1.5 }}>See which of your contacts are already here. Like WhatsApp — sync your phone contacts or paste emails.</div>
                    </div>
                    <button onClick={() => { setSyncOpen(v => !v); setSyncResults(null); setSyncPaste(''); }}
                      style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: syncOpen ? '#E0F2FE' : '#0284C7', color: syncOpen ? '#0369A1' : '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {syncOpen ? 'Close' : '📱 Sync Contacts'}
                    </button>
                  </div>
                  {syncOpen && (
                    <>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                        {'contacts' in navigator ? (
                          <button
                            onClick={async () => {
                              try {
                                const contacts = await navigator.contacts.select(['email', 'tel', 'name'], { multiple: true });
                                const mapped = contacts.flatMap(c => {
                                  const entries = [];
                                  (c.email || []).forEach(e => entries.push({ email: e, name: c.name?.[0] || '' }));
                                  (c.tel || []).forEach(t => entries.push({ phone: t, name: c.name?.[0] || '' }));
                                  return entries;
                                }).filter(x => x.email || x.phone);
                                if (!mapped.length) return;
                                setSyncing(true);
                                try {
                                  const r = await api.syncContacts(mapped);
                                  setSyncResults(r);
                                } catch { setSyncResults({ matched: [], unmatched: [] }); }
                                finally { setSyncing(false); }
                              } catch {}
                            }}
                            disabled={syncing}
                            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#059669', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {syncing ? '⏳ Syncing…' : '📲 Use Phone Contacts'}
                          </button>
                        ) : null}
                        <button onClick={() => document.getElementById('tn-sync-textarea')?.focus()}
                          style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #0284C7', background: '#fff', color: '#0284C7', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                          ✉️ Paste Emails
                        </button>
                      </div>
                      <textarea
                        id="tn-sync-textarea"
                        value={syncPaste}
                        onChange={e => setSyncPaste(e.target.value)}
                        placeholder={'Paste email addresses or phone numbers here…\ne.g. john@example.com, +919876543210, jane@company.com'}
                        rows={3}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #BAE6FD', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff', marginBottom: 10 }}
                      />
                      <button onClick={handleContactSync} disabled={syncing || !syncPaste.trim()}
                        style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: !syncPaste.trim() ? '#E5E7EB' : '#0284C7', color: !syncPaste.trim() ? '#9CA3AF' : '#fff', fontSize: 13, fontWeight: 700, cursor: !syncPaste.trim() ? 'not-allowed' : 'pointer', marginBottom: 14 }}>
                        {syncing ? '🔍 Searching…' : '🔍 Find on TalentNest'}
                      </button>
                      {syncResults && (
                        <div>
                          {syncResults.matched?.length > 0 && (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#059669', background: '#D1FAE5', padding: '3px 10px', borderRadius: 20 }}>✓ {syncResults.matched.length} found on TalentNest</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                                {syncResults.matched.map(person => (
                                  <PersonCard
                                    key={String(person._id || person.id)}
                                    person={person}
                                    onAction={handleAction}
                                    loading={actionLoading === String(person._id || person.id)}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                          {syncResults.unmatched?.length > 0 && (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', background: '#F3F4F6', padding: '3px 10px', borderRadius: 20 }}>{syncResults.unmatched.length} not on TalentNest yet</span>
                                <span style={{ fontSize: 11, color: '#9CA3AF' }}>— invite them to join!</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {syncResults.unmatched.map((c, i) => {
                                  const key = c.email || c.phone || i;
                                  const invited = invitedSet.has(key);
                                  const inviteMsg = `Hi ${c.name ? c.name.split(' ')[0] : 'there'}! I'm using TalentNest for career networking. Join me here: ${window.location.origin}/auth?ref=invite${c.email ? `&email=${encodeURIComponent(c.email)}` : ''}`;
                                  return (
                                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                                        {c.name ? c.name[0].toUpperCase() : '👤'}
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name || c.email || c.phone}</div>
                                        {c.name && <div style={{ fontSize: 11, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email || c.phone}</div>}
                                      </div>
                                      <button
                                        onClick={() => {
                                          if (c.email) {
                                            window.open(`mailto:${c.email}?subject=Join me on TalentNest&body=${encodeURIComponent(inviteMsg)}`, '_blank');
                                          } else {
                                            navigator.clipboard?.writeText(inviteMsg).catch(() => {});
                                          }
                                          setInvitedSet(s => new Set([...s, key]));
                                        }}
                                        style={{ padding: '6px 14px', borderRadius: 8, border: invited ? '1px solid #D1D5DB' : '1px solid #0176D3', background: invited ? '#F9FAFB' : '#EFF6FF', color: invited ? '#6B7280' : '#0176D3', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                        {invited ? '✓ Invited' : c.email ? '✉️ Invite' : '📋 Copy Invite'}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {syncResults.matched?.length === 0 && syncResults.unmatched?.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '16px 0', color: '#6B7280', fontSize: 13 }}>No contacts found. Check the format and try again.</div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes tn-spin { to { transform: rotate(360deg); } }
      `}</style>

    </div>
  );
}
