import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import Spinner from '../../components/ui/Spinner.jsx';
import PersonalInfoModal from '../../components/modals/PersonalInfoModal.jsx';

const ROLE_COLOR = {
  admin:       '#0176D3',
  recruiter:   '#7C3AED',
  candidate:   '#059669',
  super_admin: '#DC2626',
  superadmin:  '#DC2626',
  client:      '#D97706',
  hiring_manager: '#0891B2',
};
const ROLE_LABEL = {
  admin:       'HR Admin',
  recruiter:   'Recruiter',
  candidate:   'Candidate',
  super_admin: 'Super Admin',
  superadmin:  'Super Admin',
  client:      'Client',
  hiring_manager: 'Hiring Manager',
};

function Avatar({ name, src, size = 80, color }) {
  if (src) return (
    <img src={src} alt={name}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${color}33`, boxShadow: `0 0 0 2px ${color}22, 0 8px 24px rgba(0,0,0,0.2)` }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: size * 0.38, flexShrink: 0, boxShadow: `0 8px 24px ${color}44` }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

function timeAgo(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  if (s < 604800) return `${Math.floor(s/86400)}d ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function maskEmail(e) {
  if (!e) return null;
  const [l, d] = e.split('@');
  if (!d) return e[0] + '•'.repeat(Math.max(1, e.length - 2)) + e.slice(-1);
  return l[0] + '•'.repeat(Math.max(1, l.length - 1)) + '@' + d;
}
function maskPhone(p) {
  if (!p) return null;
  const s = String(p).replace(/\D/g, '');
  if (s.length < 6) return '••••••';
  return s.slice(0,2) + '•'.repeat(s.length - 4) + s.slice(-2);
}

export default function UserPublicProfilePage({ user: currentUser }) {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [person, setPerson] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [error, setError] = useState('');
  const [msgText, setMsgText] = useState('');
  const [compose, setCompose] = useState(false);
  const [sending, setSending] = useState(false);
  const [msgSent, setMsgSent] = useState(false);
  const [infoStatus, setInfoStatus] = useState(null);
  const [infoContact, setInfoContact] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    api.getUser(userId)
      .then(res => { setPerson(res?.data || res); setError(''); })
      .catch(e => setError(e?.message || 'Could not load profile'))
      .finally(() => setLoading(false));

    setPostsLoading(true);
    api.getUserPosts(userId)
      .then(r => setPosts(Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : []))
      .catch(() => setPosts([]))
      .finally(() => setPostsLoading(false));

    api.getInfoRequestStatus(userId)
      .then(r => {
        const data = r?.data || r;
        setInfoStatus(data?.status || null);
        if (data?.contact) setInfoContact(data.contact);
      })
      .catch(() => {});
  }, [userId]);

  const sendMsg = async () => {
    if (!msgText.trim()) return;
    setSending(true);
    try {
      await api.sendMessage({ toUserId: userId, message: msgText.trim() });
      setMsgSent(true); setMsgText(''); setCompose(false);
    } catch {}
    setSending(false);
  };

  const requestContact = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      await api.requestInfo(userId);
      setInfoStatus('pending');
    } catch (e) {
      setInfoStatus(prev => prev || 'pending');
    }
    setRequesting(false);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320, color: 'var(--app-text-sec, #706E6B)' }}>
      <Spinner /> <span style={{ marginLeft: 12 }}>Loading profile…</span>
    </div>
  );

  if (error || !person) return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
      <p style={{ color: 'var(--app-text-sec, #706E6B)', marginBottom: 20 }}>{error || 'Profile not found'}</p>
      <button onClick={() => navigate(-1)} style={{ padding: '10px 24px', borderRadius: 12, background: 'var(--app-primary, #0176D3)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Go Back</button>
    </div>
  );

  const bg = ROLE_COLOR[person.role] || '#0176D3';
  const isSelf = String(currentUser?._id || currentUser?.id) === String(person._id || person.id);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 0 40px', fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif" }}>
      {/* Back button */}
      <div style={{ padding: '16px 20px 0' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--app-text-sec, #706E6B)', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '8px 0' }}>
          ← Back
        </button>
      </div>

      {/* Hero Banner */}
      <div style={{
        margin: '12px 16px 0',
        borderRadius: 24,
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${bg} 0%, ${bg}bb 50%, ${bg}88 100%)`,
        position: 'relative',
        boxShadow: `0 8px 40px ${bg}33`,
      }}>
        {/* Pattern overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.06) 0%, transparent 40%)',
          pointerEvents: 'none',
        }} />
        <div style={{ height: 120, position: 'relative', zIndex: 1 }}>
          <div style={{ position: 'absolute', bottom: -40, left: 24 }}>
            <Avatar name={person.name} src={person.avatarUrl || person.photoUrl} size={88} color={bg} />
          </div>
        </div>
        {/* Role badge in hero */}
        <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)', borderRadius: 20, padding: '4px 12px', border: '1px solid rgba(255,255,255,0.25)' }}>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' }}>{ROLE_LABEL[person.role] || 'Member'}</span>
        </div>
      </div>

      {/* Profile Card */}
      <div style={{ margin: '0 16px', background: 'var(--app-card-bg, #fff)', borderRadius: '0 0 20px 20px', padding: '52px 24px 24px', border: '1px solid var(--app-card-border, #E5E7EB)', borderTop: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--app-text, #181818)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>{person.name || 'Member'}</h1>
            {person.title && <div style={{ fontSize: 14, color: 'var(--app-text-sec, #3E3E3C)', fontWeight: 600, marginBottom: 2 }}>{person.title}</div>}
            {person.department && <div style={{ fontSize: 12, color: 'var(--app-text-muted, #706E6B)', marginBottom: 2 }}>🏢 {person.department}</div>}
            {person.location && <div style={{ fontSize: 12, color: 'var(--app-text-muted, #706E6B)' }}>📍 {person.location}</div>}
          </div>

          {!isSelf && (
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              <button
                onClick={() => setCompose(v => !v)}
                style={{ padding: '10px 20px', borderRadius: 12, background: bg, color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: `0 4px 14px ${bg}44`, transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${bg}55`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 14px ${bg}44`; }}
              >
                ✉️ {compose ? 'Cancel' : 'Message'}
              </button>
            </div>
          )}
        </div>

        {/* Summary */}
        {person.summary && (
          <div style={{ marginTop: 16, padding: '14px 16px', background: `${bg}09`, borderRadius: 12, border: `1px solid ${bg}18` }}>
            <p style={{ fontSize: 13, color: 'var(--app-text-sec, #3E3E3C)', lineHeight: 1.7, margin: 0 }}>{person.summary}</p>
          </div>
        )}

        {/* Message Compose */}
        {compose && (
          <div style={{ marginTop: 16, background: 'var(--app-input-bg, #F8FAFC)', border: '1px solid var(--app-input-border, #E5E7EB)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--app-text, #181818)', marginBottom: 8 }}>Message {person.name?.split(' ')[0] || 'member'}</div>
            {msgSent && <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '9px 12px', marginBottom: 10, fontSize: 13, color: '#166534', fontWeight: 600 }}>✅ Message sent!</div>}
            <textarea
              value={msgText} onChange={e => setMsgText(e.target.value)}
              placeholder="Write your message…" rows={3}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--app-input-border, #E5E7EB)', borderRadius: 10, fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: 'var(--app-card-bg, #fff)', color: 'var(--app-text, #181818)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
              <button onClick={() => { setCompose(false); setMsgText(''); }}
                style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid var(--app-card-border, #E5E7EB)', background: 'transparent', color: 'var(--app-text-sec, #706E6B)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={sendMsg} disabled={!msgText.trim() || sending}
                style={{ padding: '8px 20px', borderRadius: 9, border: 'none', background: bg, color: '#fff', fontSize: 12, fontWeight: 700, cursor: !msgText.trim() || sending ? 'not-allowed' : 'pointer', opacity: !msgText.trim() || sending ? 0.6 : 1 }}>
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        )}

        {/* Contact info */}
        {(person.phone || person.email) && (
          <div style={{ marginTop: 16, background: 'var(--app-input-bg, #F8FAFC)', borderRadius: 12, padding: '12px 16px', border: '1px solid var(--app-input-border, #E5E7EB)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--app-text, #181818)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contact Info</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div>
                {person.phone && <div style={{ fontSize: 12, color: 'var(--app-text-sec, #706E6B)', marginBottom: 3 }}>📞 {maskPhone(person.phone)}</div>}
                {person.email && <div style={{ fontSize: 12, color: 'var(--app-text-sec, #706E6B)' }}>✉️ {maskEmail(person.email)}</div>}
              </div>
              {!isSelf && (
                infoStatus === 'accepted'
                  ? <button onClick={() => setShowInfoModal(true)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>🔓 View Contact Info</button>
                  : infoStatus === 'pending'
                    ? <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>✓ Request sent</span>
                    : <button onClick={requestContact} disabled={requesting} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${bg}`, background: `${bg}11`, color: bg, fontSize: 11, fontWeight: 700, cursor: requesting ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: requesting ? 0.6 : 1 }}>
                        {requesting ? 'Requesting…' : 'Request Contact'}
                      </button>
              )}
            </div>
          </div>
        )}

        {/* Skills */}
        {person.skills?.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--app-text, #181818)', marginBottom: 10 }}>Skills</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {person.skills.map((s, i) => (
                <span key={i} style={{ padding: '5px 12px', borderRadius: 20, background: `${bg}14`, color: bg, fontSize: 12, fontWeight: 600, border: `1px solid ${bg}28` }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* LinkedIn */}
        {person.linkedinUrl && (
          <div style={{ marginTop: 16 }}>
            <a href={person.linkedinUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, background: '#0A66C214', color: '#0A66C2', fontSize: 13, fontWeight: 700, textDecoration: 'none', border: '1px solid #0A66C228' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
              LinkedIn Profile
            </a>
          </div>
        )}
      </div>

      {/* Recent Posts */}
      <div style={{ margin: '20px 16px 0' }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--app-text, #181818)', marginBottom: 14 }}>Recent Activity</h2>
        {postsLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--app-text-muted, #706E6B)', padding: '32px 0', fontSize: 13 }}><Spinner /> Loading posts…</div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', background: 'var(--app-card-bg, #fff)', borderRadius: 16, border: '1px solid var(--app-card-border, #E5E7EB)', color: 'var(--app-text-muted, #706E6B)', fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            No posts yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {posts.map(p => (
              <div key={p._id} style={{ background: 'var(--app-card-bg, #fff)', borderRadius: 16, border: '1px solid var(--app-card-border, #E5E7EB)', padding: '16px 18px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 11, color: 'var(--app-text-muted, #9CA3AF)', marginBottom: 8 }}>{timeAgo(p.createdAt)}</div>
                <div style={{ fontSize: 14, color: 'var(--app-text, #181818)', lineHeight: 1.7 }}>{p.content}</div>
                {p.images?.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: p.images.length === 1 ? '1fr' : '1fr 1fr', gap: 4, marginTop: 10, borderRadius: 10, overflow: 'hidden' }}>
                    {p.images.slice(0, 4).map((img, i) => (
                      <img key={i} src={img} alt="" style={{ width: '100%', height: p.images.length === 1 ? 280 : 140, objectFit: 'cover' }} />
                    ))}
                  </div>
                )}
                {p.reactions?.length > 0 && (
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--app-text-muted, #9CA3AF)' }}>
                    {p.reactions.length} reaction{p.reactions.length !== 1 ? 's' : ''} · {p.comments?.length || 0} comment{(p.comments?.length || 0) !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showInfoModal && (
        <PersonalInfoModal
          person={person}
          contact={infoContact || { email: person.email, phone: person.phone }}
          onClose={() => setShowInfoModal(false)}
        />
      )}
    </div>
  );
}
