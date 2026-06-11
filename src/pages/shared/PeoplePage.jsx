import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import { card, btnP, btnG } from '../../constants/styles.js';
import PersonalInfoModal from '../../components/modals/PersonalInfoModal.jsx';

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
  const [infoStatus, setInfoStatus] = useState(null);
  const [infoContact, setInfoContact] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const bg = ROLE_COLOR[person.role] || '#0176D3';
  const uid = String(person._id || person.id);

  useEffect(() => {
    setLoading(true);
    api.getUserPosts(uid)
      .then(r => setPosts(Array.isArray(r?.data) ? r.data.slice(0, 5) : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));

    api.getInfoRequestStatus(uid)
      .then(r => {
        const data = r?.data || r;
        setInfoStatus(data?.status || null);
        if (data?.contact) setInfoContact(data.contact);
      })
      .catch(() => {});
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
    if (requesting) return;
    setRequesting(true);
    try {
      await api.requestInfo(uid);
      setInfoStatus('pending');
    } catch (e) {
      setInfoStatus(prev => prev || 'pending');
    }
    setRequesting(false);
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
            {person.title && <div style={{ fontSize: 13, color: '#374151', fontWeight: 600, marginTop: 8 }}>{person.title}</div>}
            {person.department && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>🏢 {person.department}</div>}
            {person.location && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>📍 {person.location}</div>}
            {person.experience > 0 && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>⏱ {person.experience} yr{person.experience !== 1 ? 's' : ''} experience</div>}
          </div>

          {/* About / Bio */}
          {person.summary && (
            <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 14px', marginBottom: 16, border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>About</div>
              <div style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.65 }}>{person.summary}</div>
            </div>
          )}

          {/* Skills */}
          {Array.isArray(person.skills) && person.skills.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Skills</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {person.skills.slice(0, 12).map((skill, i) => (
                  <span key={i} style={{ fontSize: 12, fontWeight: 600, color: bg, background: bg + '12', borderRadius: 20, padding: '4px 10px', border: `1px solid ${bg}22` }}>
                    {skill}
                  </span>
                ))}
                {person.skills.length > 12 && (
                  <span style={{ fontSize: 12, color: '#9CA3AF', borderRadius: 20, padding: '4px 10px', border: '1px solid #E5E7EB', background: '#F9FAFB' }}>
                    +{person.skills.length - 12} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Privacy-masked contact info */}
          <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 14px', marginBottom: 16, border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contact Info</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div>
                {person.phone && <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>📞 {maskPhone(person.phone)}</div>}
                {person.email && <div style={{ fontSize: 12, color: '#6B7280' }}>✉️ {maskEmail(person.email)}</div>}
                {!person.phone && !person.email && <div style={{ fontSize: 12, color: '#9CA3AF' }}>Contact details private</div>}
              </div>
              {infoStatus === 'accepted' ? (
                <button onClick={() => setShowInfoModal(true)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                  🔓 View Contact Info
                </button>
              ) : infoStatus === 'pending' ? (
                <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>✓ Request sent</span>
              ) : (
                <button onClick={requestContact} disabled={requesting}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #0176D3', background: '#EFF6FF', color: '#1D4ED8', fontSize: 11, fontWeight: 700, cursor: requesting ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: requesting ? 0.6 : 1 }}>
                  {requesting ? 'Requesting…' : 'Request Info'}
                </button>
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

      {showInfoModal && (
        <PersonalInfoModal
          person={person}
          contact={infoContact || { email: person.email, phone: person.phone }}
          onClose={() => setShowInfoModal(false)}
        />
      )}
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
          {!person.location && !person.title && person.summary && (
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.summary}</div>
          )}
          {Array.isArray(person.skills) && person.skills.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
              {person.skills.slice(0, 3).map((s, i) => (
                <span key={i} style={{ fontSize: 10, fontWeight: 600, color: '#374151', background: '#F3F4F6', borderRadius: 12, padding: '2px 7px', border: '1px solid #E5E7EB' }}>{s}</span>
              ))}
              {person.skills.length > 3 && <span style={{ fontSize: 10, color: '#9CA3AF', padding: '2px 4px' }}>+{person.skills.length - 3}</span>}
            </div>
          )}
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
        {person.title && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 5, fontWeight: 500 }}>{person.title}</div>}
        {person.location && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>📍 {person.location}</div>}
        {!person.title && !person.location && person.summary && (
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {person.summary}
          </div>
        )}
        {Array.isArray(person.skills) && person.skills.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {person.skills.slice(0, 2).map((s, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 600, color: '#374151', background: '#F3F4F6', borderRadius: 12, padding: '2px 7px', border: '1px solid #E5E7EB' }}>{s}</span>
            ))}
            {person.skills.length > 2 && <span style={{ fontSize: 10, color: '#9CA3AF', padding: '2px 4px' }}>+{person.skills.length - 2}</span>}
          </div>
        )}
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
  const [infoRequests, setInfoRequests] = useState([]);
  const [infoActionLoading, setInfoActionLoading] = useState(null);
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
      const [conRes, penRes, sugRes, sentRes, infoReqRes] = await Promise.all([
        api.getConnections().catch(() => ({ data: [] })),
        api.getPendingRequests().catch(() => ({ data: [] })),
        api.getConnectionSuggestions().catch(() => ({ data: [] })),
        api.getSentRequests().catch(() => ({ data: [] })),
        api.getIncomingInfoRequests().catch(() => ({ data: [] })),
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
      setInfoRequests(infoReqRes?.data || []);
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

  const handleInfoRequestAction = async (action, requestId) => {
    setInfoActionLoading(requestId);
    try {
      if (action === 'accept') await api.acceptInfoRequest(requestId);
      else await api.declineInfoRequest(requestId);
      setInfoRequests(prev => prev.filter(r => String(r.requestId) !== String(requestId)));
    } catch (e) {
      setError(e?.message || 'Action failed. Please try again.');
    } finally {
      setInfoActionLoading(null);
    }
  };

  const tabs = [
    { id: 'discover',    label: 'Discover' },
    { id: 'connections', label: `Network (${connections.length})` },
    { id: 'pending',     label: `Requests (${pending.length})` },
    { id: 'sent',        label: `Sent (${sent.length})` },
    { id: 'infoRequests', label: `Info Requests (${infoRequests.length})` },
  ];

  const runSync = async (contacts) => {
    if (!contacts.length) return;
    setSyncing(true);
    setSyncResults(null);
    try {
      const r = await api.syncContacts(contacts);
      setSyncResults(r?.data || r);
    } catch { setSyncResults({ matched: [], unmatched: [], candidateMatches: [] }); }
    finally { setSyncing(false); }
  };

  const handleContactSync = async () => {
    const tokens = syncPaste.split(/[\n,;]+/).map(t => t.trim()).filter(Boolean);
    const contacts = tokens.map(t => {
      const clean = t.toLowerCase();
      if (clean.includes('@')) return { email: clean };
      const digits = t.replace(/\D/g, '');
      if (digits.length >= 7) return { phone: digits };
      return null;
    }).filter(Boolean);
    if (!contacts.length) return;
    await runSync(contacts);
  };

  const handlePhoneContactsSync = async () => {
    if (!('contacts' in navigator)) return;
    try {
      setSyncOpen(true);
      const cts = await navigator.contacts.select(['name', 'email', 'tel'], { multiple: true });
      const mapped = cts.flatMap(c => {
        const items = [];
        (c.email || []).forEach(e => { if (e?.includes('@')) items.push({ email: e.trim().toLowerCase(), name: c.name?.[0] || '' }); });
        (c.tel || []).forEach(t => { const d = t.replace(/\D/g, ''); if (d.length >= 7) items.push({ phone: d, name: c.name?.[0] || '' }); });
        return items;
      });
      if (mapped.length) await runSync(mapped);
    } catch { /* user dismissed or permission denied */ }
  };

  const handleConnectAll = async (matched) => {
    const toConnect = matched.filter(p => p.connectionStatus !== 'accepted' && p.connectionStatus !== 'pending_sent');
    for (const person of toConnect) {
      try { await handleAction('connect', person); } catch {}
    }
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

      {/* ── WhatsApp-style Contact Sync Banner ── */}
      {!searchQuery.trim() && (
        <div style={{ padding: isMobile ? '0 12px' : 0, marginBottom: 16 }}>
          <div style={{ background: 'linear-gradient(135deg, #064E3B 0%, #065F46 40%, #047857 100%)', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', boxShadow: '0 4px 20px rgba(6,78,59,0.25)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>📱</div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 14, marginBottom: 2 }}>Find people you know on TalentNest</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>Sync phone contacts — see who's here and invite those who aren't, just like WhatsApp</div>
            </div>
            {'contacts' in navigator ? (
              <button
                onClick={handlePhoneContactsSync}
                disabled={syncing}
                style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: '#25D366', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(37,211,102,0.4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {syncing ? '⏳ Syncing…' : '📲 Sync Phone Contacts'}
              </button>
            ) : (
              <button
                onClick={() => { setSyncOpen(v => !v); setSyncResults(null); setSyncPaste(''); }}
                style={{ padding: '10px 18px', borderRadius: 12, border: 'none', background: '#25D366', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(37,211,102,0.4)' }}>
                {syncOpen ? '✕ Close' : '✉️ Find by Email / Phone'}
              </button>
            )}
          </div>

          {/* Paste input — shown when native contacts not available, or as fallback */}
          {(syncOpen || !('contacts' in navigator)) && (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '0 0 14px 14px', marginTop: -8, paddingTop: 16, padding: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Paste email addresses or phone numbers (one per line, comma, or semicolon)</div>
              <textarea
                id="tn-sync-textarea"
                value={syncPaste}
                onChange={e => setSyncPaste(e.target.value)}
                placeholder={'john@email.com\n+919876543210\njane@company.com, 9876001234'}
                rows={4}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #D1D5DB', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', background: '#FAFBFC', marginBottom: 10 }}
              />
              <button
                onClick={handleContactSync}
                disabled={syncing || !syncPaste.trim()}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: !syncPaste.trim() ? '#E5E7EB' : '#059669', color: !syncPaste.trim() ? '#9CA3AF' : '#fff', fontSize: 13, fontWeight: 700, cursor: !syncPaste.trim() ? 'not-allowed' : 'pointer' }}>
                {syncing ? '🔍 Searching…' : '🔍 Find on TalentNest'}
              </button>
            </div>
          )}

          {/* Sync results */}
          {syncResults && (
            <div style={{ marginTop: 12 }}>
              {syncResults.matched?.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#059669', background: '#D1FAE5', padding: '4px 12px', borderRadius: 20 }}>✓ {syncResults.matched.length} contact{syncResults.matched.length !== 1 ? 's' : ''} found on TalentNest</span>
                    {syncResults.matched.some(p => p.connectionStatus !== 'accepted' && p.connectionStatus !== 'pending_sent') && (
                      <button
                        onClick={() => handleConnectAll(syncResults.matched)}
                        style={{ padding: '4px 12px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        🤝 Connect All
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                    {syncResults.matched.map(person => (
                      <PersonCard
                        key={String(person._id || person.id)}
                        person={person}
                        onAction={handleAction}
                        loading={actionLoading === String(person._id || person.id)}
                        onCardClick={person.connectionStatus === 'accepted' ? () => navigate(`/app/profile/${String(person._id || person.id)}`) : undefined}
                      />
                    ))}
                  </div>
                </>
              )}
              {syncResults.candidateMatches?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0176D3', background: '#EFF6FF', display: 'inline-block', padding: '4px 12px', borderRadius: 20, marginBottom: 8 }}>
                    📄 {syncResults.candidateMatches.length} contact{syncResults.candidateMatches.length !== 1 ? 's' : ''} found in our candidate database — not yet a registered TalentNest user
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {syncResults.candidateMatches.map(c => (
                      <div key={String(c._id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, overflow: 'hidden' }}>
                          {c.avatarUrl ? <img src={c.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (c.name ? c.name[0].toUpperCase() : '👤')}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[c.title, c.currentCompany].filter(Boolean).join(' · ') || c.email || c.phone}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {syncResults.unmatched?.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 8 }}>
                    {syncResults.unmatched.length} contact{syncResults.unmatched.length !== 1 ? 's' : ''} not on TalentNest yet — invite them to join
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {syncResults.unmatched.map((c, i) => {
                      const key = c.email || c.phone || i;
                      const invited = invitedSet.has(key);
                      const inviteLink = `${window.location.origin}/auth?ref=invite${c.email ? `&email=${encodeURIComponent(c.email)}` : ''}`;
                      const inviteMsg = `Hi ${c.name ? c.name.split(' ')[0] : 'there'}! I'm using TalentNest for career networking. Join me: ${inviteLink}`;
                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                            {c.name ? c.name[0].toUpperCase() : '👤'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name || c.email || c.phone}</div>
                            {c.name && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{c.email || c.phone}</div>}
                          </div>
                          <button
                            onClick={() => {
                              if (c.phone) {
                                window.open(`https://wa.me/?text=${encodeURIComponent(inviteMsg)}`, '_blank');
                              } else if (c.email) {
                                window.open(`mailto:${c.email}?subject=Join me on TalentNest&body=${encodeURIComponent(inviteMsg)}`, '_blank');
                              } else {
                                navigator.clipboard?.writeText(inviteMsg).catch(() => {});
                              }
                              setInvitedSet(s => new Set([...s, key]));
                            }}
                            style={{ padding: '7px 14px', borderRadius: 8, border: invited ? '1px solid #D1D5DB' : '1px solid #25D366', background: invited ? '#F9FAFB' : '#F0FDF4', color: invited ? '#6B7280' : '#065F46', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                            {invited ? '✓ Invited' : c.phone ? '📲 WhatsApp Invite' : '✉️ Email Invite'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {syncResults.matched?.length === 0 && syncResults.unmatched?.length === 0 && syncResults.candidateMatches?.length === 0 && (
                <div style={{ textAlign: 'center', padding: '16px', color: '#6B7280', fontSize: 13, background: '#F9FAFB', borderRadius: 10 }}>No contacts matched. Check the format (emails or phone numbers) and try again.</div>
              )}
            </div>
          )}
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

              {/* Info Requests tab */}
              {tab === 'infoRequests' && (
                <>
                  {infoRequests.length === 0 ? (
                    <div style={{ ...card, textAlign: 'center', padding: '40px 24px', borderRadius: 14 }}>
                      <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#374151', marginBottom: 6 }}>No info requests</div>
                      <div style={{ fontSize: 13, color: '#9CA3AF' }}>When someone asks to view your contact details, it will appear here.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {infoRequests.map(item => {
                        const person = item.from || {};
                        const pId = String(person._id || person.id || '');
                        return (
                          <div key={String(item.requestId)} style={{ ...card, padding: '14px 16px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <Avatar name={person.name} src={person.avatarUrl || person.photoUrl} size={48} role={person.role} />
                            <div style={{ flex: 1, minWidth: 160 }}>
                              <div style={{ fontWeight: 700, fontSize: 14, color: '#0A1628' }}>{person.name || 'Member'}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                                <RoleBadge role={person.role} />
                                {person.title && <span style={{ fontSize: 12, color: '#6B7280' }}>{person.title}</span>}
                              </div>
                              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                                Wants to view your contact details
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              <button
                                onClick={() => handleInfoRequestAction('accept', item.requestId)}
                                disabled={infoActionLoading === item.requestId}
                                style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                Accept
                              </button>
                              <button
                                onClick={() => handleInfoRequestAction('decline', item.requestId)}
                                disabled={infoActionLoading === item.requestId}
                                style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#F9FAFB', color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                                Decline
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
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
