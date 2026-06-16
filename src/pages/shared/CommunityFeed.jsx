import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import { card, btnP, btnG } from '../../constants/styles.js';
import { usePlatformEvents } from '../../hooks/usePlatformSocket.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)     return 'just now';
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const ROLE_COLOR = {
  admin: '#0176D3', recruiter: '#7C3AED', candidate: '#059669',
  super_admin: '#DC2626', superadmin: '#DC2626',
};
const ROLE_LABEL = {
  admin: 'HR Admin', recruiter: 'Recruiter', candidate: 'Candidate',
  super_admin: 'Super Admin', superadmin: 'Super Admin',
};

function Avatar({ name, src, size = 40, role }) {
  const bg = ROLE_COLOR[role] || '#0176D3';
  if (src) return (
    <img src={src} alt={name}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${bg}22` }}
      onError={e => { e.currentTarget.style.display = 'none'; }}
    />
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
    <span style={{ fontSize: 10, fontWeight: 700, background: color + '18', color, borderRadius: 4, padding: '2px 6px', letterSpacing: '0.02em' }}>
      {label}
    </span>
  );
}

// "1st" degree connection badge — shown on posts from connections
function ConnectionDegree() {
  return (
    <span title="1st degree connection" style={{ fontSize: 10, fontWeight: 700, background: '#D1FAE5', color: '#065F46', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.02em' }}>
      1st
    </span>
  );
}

const POST_TYPE_THEME = {
  hiring:      { icon: '💼', label: 'Job Opening',   color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  tip:         { icon: '💡', label: 'Pro Tip',        color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  question:    { icon: '❓', label: 'Question',        color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  achievement: { icon: '🏆', label: 'Win',            color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
  feedback:    { icon: '⭐', label: 'Feedback',        color: '#DB2777', bg: '#FDF2F8', border: '#FBCFE8' },
  resource:    { icon: '📎', label: 'Resource',        color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC' },
  milestone:   { icon: '🎯', label: 'Milestone',      color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  announcement:{ icon: '📢', label: 'Announcement',   color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  poll:        { icon: '🗳️', label: 'Poll',           color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
};

function PostTypeBanner({ type }) {
  const theme = POST_TYPE_THEME[type];
  if (!theme) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: theme.bg,
      border: `1px solid ${theme.border}`,
      borderLeft: `4px solid ${theme.color}`,
      borderRadius: 10,
      padding: '9px 14px',
      marginBottom: 12,
    }}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>{theme.icon}</span>
      <span style={{ fontSize: 12, fontWeight: 800, color: theme.color, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {theme.label}
      </span>
    </div>
  );
}

function PostTypeBadge({ type }) {
  const theme = POST_TYPE_THEME[type];
  if (!theme) return null;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, background: theme.bg, color: theme.color, border: `1px solid ${theme.border}`, borderRadius: 20, padding: '2px 9px' }}>
      {theme.icon} {theme.label}
    </span>
  );
}

function ContentWithHashtags({ text, onHashtagClick }) {
  const parts = text.split(/(#[a-zA-Z0-9_]+)/g);
  return (
    <span>
      {parts.map((p, i) =>
        p.startsWith('#')
          ? <span key={i} onClick={() => onHashtagClick?.(p.toLowerCase())}
              style={{ color: '#0176D3', fontWeight: 600, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
              {p}
            </span>
          : <span key={i}>{p}</span>
      )}
    </span>
  );
}

// ── Mention helpers ─────────────────────────────────────────────────────────────
const MENTION_RE = /@\[([^\]]+)\]\(([a-f0-9]{24})\)/g;
const MENTION_TEST_RE = /@\[[^\]]+\]\([a-f0-9]{24}\)/;

// Renders post/comment text, highlighting both #hashtags and @[Name](userId) mentions
function RichContent({ text, onHashtagClick }) {
  const navigate = useNavigate();
  const nodes = [];
  let lastIndex = 0;
  let m;
  const re = new RegExp(MENTION_RE);
  while ((m = re.exec(text))) {
    if (m.index > lastIndex) nodes.push({ type: 'text', value: text.slice(lastIndex, m.index) });
    nodes.push({ type: 'mention', name: m[1], id: m[2] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) nodes.push({ type: 'text', value: text.slice(lastIndex) });

  return (
    <span>
      {nodes.map((n, i) => n.type === 'mention'
        ? <span key={i} onClick={() => navigate(`/app/profile/${n.id}`)}
            style={{ color: '#0176D3', fontWeight: 700, cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
            @{n.name}
          </span>
        : <ContentWithHashtags key={i} text={n.value} onHashtagClick={onHashtagClick} />
      )}
    </span>
  );
}

// Dropdown of user suggestions for @mention autocomplete
function MentionDropdown({ suggestions, searching, onSelect }) {
  if (suggestions == null) return null;
  return (
    <div style={{ position: 'absolute', zIndex: 50, top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.14)', maxHeight: 220, overflowY: 'auto' }}>
      {searching ? (
        <div style={{ padding: '10px 12px', fontSize: 12, color: '#9CA3AF' }}>Searching…</div>
      ) : suggestions.length === 0 ? (
        <div style={{ padding: '10px 12px', fontSize: 12, color: '#9CA3AF' }}>No matches</div>
      ) : suggestions.map(u => (
        <div key={String(u._id || u.id)}
          onMouseDown={e => { e.preventDefault(); onSelect(u); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <Avatar name={u.name} src={u.avatarUrl || u.photoUrl} size={28} role={u.role} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF' }}>{ROLE_LABEL[u.role] || u.role || 'Member'}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Detects an active "@query" being typed right before the cursor
function detectMentionQuery(text, cursorPos) {
  const upToCursor = text.slice(0, cursorPos);
  const m = upToCursor.match(/(?:^|\s)@([a-zA-Z0-9_.]{0,30})$/);
  if (!m) return null;
  return { query: m[1], start: cursorPos - m[1].length - 1 };
}

// Hook: tracks an active @mention query and fetches matching users (debounced)
function useMentionAutocomplete() {
  const [active, setActive] = useState(null); // { query, start }
  const [suggestions, setSuggestions] = useState(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!active || active.query.length < 2) { setSuggestions(null); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await api.searchPeople(active.query);
        setSuggestions((r?.data || []).slice(0, 6));
      } catch { setSuggestions([]); }
      setSearching(false);
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [active]);

  const detect = (text, cursorPos) => setActive(detectMentionQuery(text, cursorPos));
  const close = () => { setActive(null); setSuggestions(null); };

  return { active, suggestions, searching, detect, close };
}

// Inserts `@[Name](userId) ` at the active mention position, returns new text + cursor pos
function applyMention(text, active, user) {
  const { start, query } = active;
  const end = start + 1 + query.length;
  const id = String(user._id || user.id);
  const insertion = `@[${user.name}](${id}) `;
  return { text: text.slice(0, start) + insertion + text.slice(end), cursor: start + insertion.length, mention: { userId: id, name: user.name } };
}

// ── Inline connect button (shown on stranger posts) ────────────────────────────
function InlineConnectButton({ authorId, authorName, pendingIds, onConnect }) {
  const isPending = pendingIds.has(String(authorId));
  return (
    <button
      onClick={() => onConnect(authorId)}
      disabled={isPending}
      style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${isPending ? '#D1D5DB' : '#0176D3'}`, background: isPending ? '#F9FAFB' : '#EFF6FF', color: isPending ? '#9CA3AF' : '#1D4ED8', fontSize: 11, fontWeight: 700, cursor: isPending ? 'default' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s' }}
      title={isPending ? 'Request sent' : `Connect with ${authorName}`}
      onMouseEnter={e => { if (!isPending) { e.currentTarget.style.background = '#0176D3'; e.currentTarget.style.color = '#fff'; } }}
      onMouseLeave={e => { if (!isPending) { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#1D4ED8'; } }}>
      {isPending ? '✓ Sent' : '+ Connect'}
    </button>
  );
}

// ── Image Lightbox ─────────────────────────────────────────────────────────────
function Lightbox({ images, index, onClose }) {
  const [cur, setCur] = useState(index);
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCur(c => Math.min(c + 1, images.length - 1));
      if (e.key === 'ArrowLeft')  setCur(c => Math.max(c - 1, 0));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [images.length, onClose]);

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', borderRadius: '50%', width: 40, height: 40 }}>×</button>
      {cur > 0 && (
        <button onClick={e => { e.stopPropagation(); setCur(c => c - 1); }}
          style={{ position: 'absolute', left: 20, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer', borderRadius: '50%', width: 48, height: 48 }}>‹</button>
      )}
      <img src={images[cur]} alt="" onClick={e => e.stopPropagation()}
        style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
      {cur < images.length - 1 && (
        <button onClick={e => { e.stopPropagation(); setCur(c => c + 1); }}
          style={{ position: 'absolute', right: 20, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer', borderRadius: '50%', width: 48, height: 48 }}>›</button>
      )}
      {images.length > 1 && (
        <div style={{ position: 'absolute', bottom: 20, display: 'flex', gap: 6 }}>
          {images.map((_, i) => (
            <div key={i} onClick={e => { e.stopPropagation(); setCur(i); }}
              style={{ width: 8, height: 8, borderRadius: '50%', background: i === cur ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }} />
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}

function ImageGrid({ images }) {
  const [lightbox, setLightbox] = useState(null);
  if (!images?.length) return null;
  const n = images.length;
  const gridStyle = n === 1 ? { gridTemplateColumns: '1fr' }
    : n === 2 ? { gridTemplateColumns: '1fr 1fr' }
    : n === 3 ? { gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto' }
    : { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' };

  return (
    <>
      <div style={{ display: 'grid', gap: 4, marginTop: 12, borderRadius: 12, overflow: 'hidden', ...gridStyle }}>
        {images.slice(0, 4).map((img, i) => (
          <div key={i} style={{ position: 'relative', ...(n === 3 && i === 0 ? { gridColumn: '1 / -1' } : {}) }}>
            <img src={img} alt="" onClick={() => setLightbox(i)}
              style={{ width: '100%', height: n === 1 ? 380 : 200, objectFit: 'cover', cursor: 'pointer', display: 'block' }} />
            {i === 3 && images.length > 4 && (
              <div onClick={() => setLightbox(3)}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <span style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>+{images.length - 4}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      {lightbox !== null && <Lightbox images={images} index={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}

// ── Reactions ─────────────────────────────────────────────────────────────────
const REACTIONS = [
  { type: 'like',       emoji: '👍', label: 'Like',       color: '#1D4ED8' },
  { type: 'celebrate',  emoji: '🎉', label: 'Celebrate',  color: '#B45309' },
  { type: 'support',    emoji: '💙', label: 'Support',    color: '#0369A1' },
  { type: 'insightful', emoji: '💡', label: 'Insightful', color: '#7C3AED' },
];

function ReactionBar({ post, userId, onReact, onToggleComments, showComments }) {
  const [showPicker, setShowPicker] = useState(false);
  const timerRef = useRef(null);
  const myReaction = post.reactions?.find(r => String(r.userId) === String(userId));
  const counts = {};
  (post.reactions || []).forEach(r => { counts[r.type] = (counts[r.type] || 0) + 1; });
  const totalReactions = post.reactions?.length || 0;
  const totalComments  = post.comments?.length  || 0;
  const rDef = myReaction ? REACTIONS.find(r => r.type === myReaction.type) : REACTIONS[0];

  return (
    <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 14, paddingTop: 10 }}>
      {(totalReactions > 0 || totalComments > 0) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '0 2px' }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            {Object.entries(counts).map(([type, count]) => {
              const r = REACTIONS.find(x => x.type === type);
              return r ? <span key={type} style={{ fontSize: 12, color: '#6B7280' }}>{r.emoji} {count}</span> : null;
            })}
            {totalReactions > 0 && <span style={{ fontSize: 12, color: '#9CA3AF' }}>{totalReactions} reaction{totalReactions !== 1 ? 's' : ''}</span>}
          </div>
          {totalComments > 0 && (
            <button onClick={onToggleComments}
              style={{ background: 'none', border: 'none', fontSize: 12, color: '#6B7280', cursor: 'pointer', padding: '2px 4px', fontWeight: 500 }}>
              {totalComments} comment{totalComments !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 2 }}>
        {/* Like / react */}
        <div style={{ position: 'relative' }}
          onMouseEnter={() => { clearTimeout(timerRef.current); setShowPicker(true); }}
          onMouseLeave={() => { timerRef.current = setTimeout(() => setShowPicker(false), 300); }}>
          <button
            onClick={() => onReact(post._id, myReaction?.type || 'like')}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 6, border: 'none', background: myReaction ? '#EFF6FF' : 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: myReaction ? 700 : 500, color: myReaction ? (rDef?.color || '#1D4ED8') : '#6B7280', transition: 'background 0.12s' }}
            onMouseEnter={e => { if (!myReaction) e.currentTarget.style.background = '#F3F4F6'; }}
            onMouseLeave={e => { if (!myReaction) e.currentTarget.style.background = 'transparent'; }}>
            {rDef?.emoji || '👍'} {rDef?.label || 'Like'}
          </button>
          {showPicker && (
            <div style={{ position: 'absolute', bottom: '115%', left: 0, display: 'flex', gap: 6, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 28, padding: '8px 12px', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', zIndex: 200 }}>
              {REACTIONS.map(r => (
                <button key={r.type} title={r.label} onClick={() => { onReact(post._id, r.type); setShowPicker(false); }}
                  style={{ fontSize: 24, background: myReaction?.type === r.type ? r.color + '18' : 'none', border: 'none', cursor: 'pointer', borderRadius: '50%', padding: '4px 6px', transition: 'transform 0.15s', lineHeight: 1 }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.4)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                  {r.emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Comment */}
        <button onClick={onToggleComments}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 6, border: 'none', background: showComments ? '#F3F4F6' : 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: showComments ? 600 : 500, color: '#6B7280', transition: 'background 0.12s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
          onMouseLeave={e => { if (!showComments) e.currentTarget.style.background = 'transparent'; }}>
          💬 Comment
        </button>

        <ShareButton postId={post._id} />
      </div>
    </div>
  );
}

function ShareButton({ postId }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = `${window.location.origin}/post/${postId}`;
    if (navigator.share) { try { await navigator.share({ title: 'TalentNest Post', text: 'Check out this post on TalentNest!', url }); return; } catch {} }
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={share}
      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: copied ? '#059669' : '#6B7280', transition: 'all 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {copied ? '✓ Copied' : '↗ Share'}
    </button>
  );
}

function BookmarkButton({ post, userId, onToggle }) {
  const saved = (post.savedBy || []).some(id => String(id) === String(userId));
  return (
    <button onClick={() => onToggle(post._id, post)} title={saved ? 'Remove bookmark' : 'Save post'}
      style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16, color: saved ? '#F59E0B' : '#D1D5DB', transition: 'color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.color = '#F59E0B'}
      onMouseLeave={e => { if (!saved) e.currentTarget.style.color = '#D1D5DB'; }}>
      {saved ? '★' : '☆'}
    </button>
  );
}

// ── Comment Section ────────────────────────────────────────────────────────────
function CommentSection({ post, userId, currentUser, onAddComment, onDeleteComment, autoFocus }) {
  const [text,        setText]        = useState('');
  const [expanded,    setExpanded]    = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [replyingTo,  setReplyingTo]  = useState(null); // { userName }
  const [mentions,    setMentions]    = useState([]); // [{ userId, name }]
  const mentionAc = useMentionAutocomplete();
  const inputRef = useRef(null);
  const comments = post.comments || [];
  const visible  = expanded ? comments : comments.slice(-3);

  useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);

  const handleReply = (c) => {
    const mention = `@[${c.userName}](${c.userId}) `;
    setText(mention);
    setReplyingTo({ userName: c.userName });
    setMentions([{ userId: String(c.userId), name: c.userName }]);
    inputRef.current?.focus();
    // place cursor at end
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.selectionStart = inputRef.current.selectionEnd = mention.length;
      }
    }, 0);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setText('');
    setMentions([]);
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    mentionAc.detect(val, e.target.selectionStart);
  };

  const selectMention = (u) => {
    const result = applyMention(text, mentionAc.active, u);
    setText(result.text);
    setMentions(prev => prev.some(m => m.userId === result.mention.userId) ? prev : [...prev, result.mention]);
    mentionAc.close();
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.selectionStart = inputRef.current.selectionEnd = result.cursor;
      }
    });
  };

  const submit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    const activeMentionIds = mentions
      .filter(m => text.includes(`@[${m.name}](${m.userId})`))
      .map(m => m.userId);
    await onAddComment(post._id, text.trim(), activeMentionIds);
    setText('');
    setReplyingTo(null);
    setMentions([]);
    mentionAc.close();
    setSubmitting(false);
  };

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
      {comments.length > 3 && !expanded && (
        <button onClick={() => setExpanded(true)}
          style={{ background: 'none', border: 'none', color: '#0176D3', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 10, padding: 0 }}>
          View all {comments.length} comments
        </button>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.map(c => (
          <div key={String(c._id)} style={{ display: 'flex', gap: 8 }}>
            <Avatar name={c.userName} src={c.userAvatar} size={32} role={c.userRole} />
            <div style={{ flex: 1 }}>
              <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '8px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0A1628' }}>{c.userName || 'Member'}</span>
                  <RoleBadge role={c.userRole} />
                </div>
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {MENTION_TEST_RE.test(c.content) ? (
                    <RichContent text={c.content} />
                  ) : c.content.startsWith('@') ? (
                    /* Legacy plain-text @mention prefix */
                    <>
                      <span style={{ color: '#0176D3', fontWeight: 700 }}>{c.content.split(' ')[0]}</span>
                      {' '}{c.content.slice(c.content.indexOf(' ') + 1)}
                    </>
                  ) : c.content}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 3, paddingLeft: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>{timeAgo(c.createdAt)}</span>
                <button onClick={() => handleReply(c)}
                  style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 11, cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                  Reply
                </button>
                {String(c.userId) === String(userId) && (
                  <button onClick={() => onDeleteComment(post._id, String(c._id))}
                    style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 11, cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <Avatar name={currentUser?.name} src={currentUser?.avatarUrl} size={32} role={currentUser?.role} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {replyingTo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6B7280', paddingLeft: 4 }}>
              <span>Replying to <strong style={{ color: '#0176D3' }}>@{replyingTo.userName}</strong></span>
              <button onClick={cancelReply} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 11, cursor: 'pointer', padding: 0 }}>✕ cancel</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
            <input ref={inputRef} value={text} onChange={handleTextChange}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder={replyingTo ? `Reply to @${replyingTo.userName}…` : 'Write a comment… (use @ to mention someone)'}
              style={{ flex: 1, padding: '8px 14px', borderRadius: 20, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', background: '#F8FAFC', transition: 'border 0.15s' }}
              onFocus={e => e.currentTarget.style.border = '1px solid #0176D3'}
              onBlur={e => e.currentTarget.style.border = '1px solid #E5E7EB'} />
            {text.trim() && (
              <button onClick={submit} disabled={submitting}
                style={{ padding: '8px 16px', borderRadius: 20, border: 'none', background: '#0176D3', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {submitting ? '…' : '→'}
              </button>
            )}
            <MentionDropdown suggestions={mentionAc.suggestions} searching={mentionAc.searching} onSelect={selectMention} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Post Card ──────────────────────────────────────────────────────────────────
const FEED_REPORT_REASONS = [
  { value: 'spam',           label: '🚫 Spam' },
  { value: 'harassment',     label: '😡 Harassment' },
  { value: 'misinformation', label: '❌ Misinformation' },
  { value: 'inappropriate',  label: '🔞 Inappropriate Content' },
  { value: 'hate_speech',    label: '🤬 Hate Speech' },
  { value: 'other',          label: '📋 Other' },
];

function PollWidget({ post, userId }) {
  const [poll, setPoll] = useState(post.poll);
  const [voting, setVoting] = useState(false);

  useEffect(() => { setPoll(post.poll); }, [post.poll]);

  const totalVotes = poll.options.reduce((sum, o) => sum + (o.votes?.length || 0), 0);
  const myVoteIdx = poll.options.findIndex(o => (o.votes || []).some(v => String(v) === String(userId)));
  const isClosed = poll.expiresAt && new Date(poll.expiresAt) < new Date();

  const vote = async (idx) => {
    if (voting || isClosed) return;
    setVoting(true);
    try {
      const res = await api.votePoll(post._id, idx);
      if (res?.poll) setPoll(res.poll);
    } finally { setVoting(false); }
  };

  return (
    <div style={{ border: '1px solid #DDD6FE', background: '#F5F3FF', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
      {poll.question && <div style={{ fontSize: 14, fontWeight: 800, color: '#0A1628', marginBottom: 10 }}>{poll.question}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {poll.options.map((opt, i) => {
          const votes = opt.votes?.length || 0;
          const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const selected = myVoteIdx === i;
          return (
            <button key={i} onClick={() => vote(i)} disabled={voting || isClosed}
              style={{ position: 'relative', textAlign: 'left', border: `1.5px solid ${selected ? '#5B21B6' : '#DDD6FE'}`, background: '#fff', borderRadius: 10, padding: '9px 12px', cursor: (voting || isClosed) ? 'default' : 'pointer', overflow: 'hidden' }}>
              {(myVoteIdx >= 0 || isClosed) && (
                <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: selected ? '#EDE9FE' : '#F3F4F6', transition: 'width 0.3s' }} />
              )}
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: selected ? 800 : 600, color: '#1F2937' }}>{selected ? '✓ ' : ''}{opt.text}</span>
                {(myVoteIdx >= 0 || isClosed) && <span style={{ fontSize: 12, fontWeight: 800, color: '#5B21B6', flexShrink: 0 }}>{pct}%</span>}
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
        {totalVotes} vote{totalVotes !== 1 ? 's' : ''} · {isClosed ? 'Poll closed' : poll.expiresAt ? `Closes ${new Date(poll.expiresAt).toLocaleDateString()}` : 'Open'}
      </div>
    </div>
  );
}

function PostCard({ post, userId, userRole, currentUser, connectionIds, pendingIds, onReact, onAddComment, onDeleteComment, onDelete, onConnect, onToggleBookmark, onHashtagClick, isMobile }) {
  const [showComments,  setShowComments]  = useState(false);
  const [showMenu,      setShowMenu]      = useState(false);
  const [showReport,    setShowReport]    = useState(false);
  const [reportReason,  setReportReason]  = useState('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [reporting,     setReporting]     = useState(false);
  const [reported,      setReported]      = useState(false);
  const [reportErr,     setReportErr]     = useState('');
  const isOwnPost   = String(post.authorId) === String(userId);
  const isAdmin     = ['admin', 'super_admin', 'superadmin'].includes(userRole);
  const isVerified  = ['admin', 'recruiter', 'super_admin', 'superadmin'].includes(post.authorRole);
  const isConnected = connectionIds.has(String(post.authorId));
  const showConnect = !isOwnPost && !isConnected;

  const handleReport = async () => {
    setReporting(true);
    setReportErr('');
    try {
      await api.reportPost(post._id, reportReason, reportDetails);
      setReported(true);
      setShowReport(false);
    } catch (e) {
      setReportErr(e?.message || 'Failed to submit report. Please try again.');
    } finally {
      setReporting(false);
    }
  };

  const actionButtons = (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', position: 'relative' }}>
      {showConnect && (
        <InlineConnectButton
          authorId={post.authorId}
          authorName={post.authorName}
          pendingIds={pendingIds}
          onConnect={onConnect}
        />
      )}
      <BookmarkButton post={post} userId={userId} onToggle={onToggleBookmark} />
      {/* ⋯ menu for delete + report */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => setShowMenu(v => !v)}
          style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 18, padding: '2px 8px', borderRadius: 4, lineHeight: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = '#374151'}
          onMouseLeave={e => e.currentTarget.style.color = '#9CA3AF'}>⋯</button>
        {showMenu && (
          <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--app-card-bg, #fff)', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: '1px solid var(--app-card-border, #F1F5F9)', minWidth: 160, zIndex: 200, overflow: 'hidden' }}
            onMouseLeave={() => setShowMenu(false)}>
            {(isOwnPost || isAdmin) && (
              <button onClick={() => { setShowMenu(false); onDelete(post._id); }}
                style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', fontSize: 13, color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                🗑️ Delete Post
              </button>
            )}
            {!isOwnPost && (
              reported ? (
                <div style={{ padding: '10px 16px', fontSize: 13, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 8 }}>✅ Reported</div>
              ) : (
                <button onClick={() => { setShowMenu(false); setShowReport(true); }}
                  style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', textAlign: 'left', fontSize: 13, color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FEF9C3'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  🚩 Report Post
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );

  const typeTheme = post.postType && post.postType !== 'update' ? POST_TYPE_THEME[post.postType] : null;

  return (
    <div id={post._id} className={isMobile ? undefined : 'tn-postcard'} style={isMobile ? { ...card, padding: '16px 14px', marginBottom: 0, marginLeft: -24, marginRight: -24, borderRadius: 0, border: 'none', boxShadow: 'none', borderBottom: '8px solid var(--app-bg, #F3F2F2)', borderTop: typeTheme ? `3px solid ${typeTheme.color}` : post.isPinned ? '3px solid #93C5FD' : 'none', position: 'relative' } : { ...card, padding: '18px 20px', marginBottom: 10, borderRadius: 14, border: post.isPinned ? '1px solid #BFDBFE' : '1px solid #F1F5F9', borderTop: typeTheme ? `3px solid ${typeTheme.color}` : post.isPinned ? '3px solid #93C5FD' : undefined, position: 'relative' }}>
      {/* Report modal */}
      {showReport && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowReport(false)}>
          <div style={{ background: 'var(--app-card-bg, #fff)', borderRadius: 16, padding: '24px', maxWidth: 420, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', border: '1px solid var(--app-card-border, transparent)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: 'var(--app-text, #0A1628)' }}>Report Post</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--app-text-sec, #6B7280)' }}>Help us keep the community safe. Select a reason:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {FEED_REPORT_REASONS.map(r => (
                <label key={r.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${reportReason === r.value ? '#0176D3' : 'var(--app-input-border, #E5E7EB)'}`, background: reportReason === r.value ? 'rgba(1,118,211,0.08)' : 'var(--app-input-bg, #F9FAFB)', cursor: 'pointer', fontSize: 13, fontWeight: reportReason === r.value ? 700 : 400, color: 'var(--app-text, #0A1628)' }}>
                  <input type="radio" name={`reason-${post._id}`} value={r.value} checked={reportReason === r.value} onChange={() => setReportReason(r.value)} style={{ accentColor: '#0176D3' }} />
                  {r.label}
                </label>
              ))}
            </div>
            <textarea value={reportDetails} onChange={e => setReportDetails(e.target.value)} placeholder="Additional details (optional)…"
              rows={2} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--app-input-border, #E5E7EB)', background: 'var(--app-input-bg, #fff)', color: 'var(--app-text, #0A1628)', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />
            {reportErr && <div style={{ fontSize: 13, color: '#DC2626', background: '#FEF2F2', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>{reportErr}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowReport(false); setReportErr(''); }} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--app-input-border, #E5E7EB)', background: 'var(--app-input-bg, #F9FAFB)', fontSize: 13, cursor: 'pointer', color: 'var(--app-text-sec, #374151)' }}>Cancel</button>
              <button onClick={handleReport} disabled={reporting} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {reporting ? 'Reporting…' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Post type banner */}
      {post.postType && post.postType !== 'update' && <PostTypeBanner type={post.postType} />}

      {post.isPinned && (
        <div style={{ fontSize: 11, color: '#0176D3', fontWeight: 700, marginBottom: 10 }}>📌 Pinned post</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <Avatar name={post.authorName} src={post.authorAvatar} size={40} role={post.authorRole} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: '#0A1628', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{post.authorName || 'Member'}</span>
                {isVerified  && <span title="Verified member" style={{ fontSize: 11, color: '#059669', flexShrink: 0 }}>✓</span>}
                {isConnected && <ConnectionDegree />}
                <RoleBadge role={post.authorRole} />
                {post.postType && post.postType !== 'update' && <PostTypeBadge type={post.postType} />}
              </div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>
                {post.authorTitle && <span>{post.authorTitle} · </span>}
                {timeAgo(post.createdAt)}
              </div>
            </div>
            {/* Desktop: actions inline */}
            {!isMobile && <div style={{ flexShrink: 0 }}>{actionButtons}</div>}
          </div>
          {/* Mobile: actions below name row */}
          {isMobile && <div style={{ marginTop: 6 }}>{actionButtons}</div>}
        </div>
      </div>

      {/* Content */}
      <div style={{ fontSize: 14.5, color: '#1F2937', lineHeight: 1.72, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 2 }}>
        <RichContent text={post.content} onHashtagClick={onHashtagClick} />
      </div>

      <ImageGrid images={post.images} />

      {post.videos?.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', maxHeight: 420, borderRadius: 12, marginTop: 12, background: '#000', overflow: 'hidden' }}>
          <video src={post.videos[0]} controls style={{ maxWidth: '100%', maxHeight: 420, width: 'auto', height: 'auto', display: 'block' }} />
        </div>
      )}

      {post.audioUrl && (
        <audio src={post.audioUrl} controls style={{ width: '100%', marginTop: 12, display: 'block' }} />
      )}

      {post.postType === 'hiring' && post.jobDetails?.title && (
        <div style={{ border: '1px solid #BBF7D0', background: '#F0FDF4', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>💼 Job Opening</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0A1628' }}>{post.jobDetails.title}</div>
          {(post.jobDetails.company || post.jobDetails.location) && (
            <div style={{ fontSize: 12.5, color: '#374151', marginTop: 2 }}>
              {post.jobDetails.company}{post.jobDetails.company && post.jobDetails.location ? ' · ' : ''}{post.jobDetails.location}
            </div>
          )}
          {post.jobDetails.link && (
            <a href={post.jobDetails.link} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', marginTop: 8, padding: '6px 16px', borderRadius: 8, background: '#059669', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
              Apply →
            </a>
          )}
        </div>
      )}

      {post.postType === 'resource' && post.resourceLink && (
        <a href={post.resourceLink} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #A5F3FC', background: '#ECFEFF', borderRadius: 12, padding: '12px 14px', marginBottom: 10, textDecoration: 'none' }}>
          <span style={{ fontSize: 20 }}>📎</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#0891B2', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Resource Link</div>
            <div style={{ fontSize: 13, color: '#0E7490', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.resourceLink}</div>
          </div>
        </a>
      )}

      {post.postType === 'poll' && post.poll?.options?.length > 0 && (
        <PollWidget post={post} userId={userId} />
      )}

      <ReactionBar
        post={post}
        userId={userId}
        onReact={onReact}
        onToggleComments={() => setShowComments(v => !v)}
        showComments={showComments}
      />

      {showComments && (
        <CommentSection
          post={post}
          userId={userId}
          currentUser={currentUser}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
          autoFocus={false}
        />
      )}
    </div>
  );
}

// ── Post Categories ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'update',       label: 'Post',     icon: '💬', color: '#0176D3', title: 'Create a Post',        sub: 'Share an update with the community',     placeholder: 'Share a career update, win, or news…' },
  { value: 'hiring',       label: 'Hiring',   icon: '💼', color: '#059669', title: 'Post a Job Opening',   sub: "Let the community know you're hiring",   placeholder: "Describe the role, responsibilities, and who you're looking for…" },
  { value: 'tip',          label: 'Tip',      icon: '💡', color: '#D97706', title: 'Share a Pro Tip',      sub: 'Help others with career advice',          placeholder: 'Share advice that helped you in your career…' },
  { value: 'question',     label: 'Question', icon: '❓', color: '#7C3AED', title: 'Ask the Community',    sub: 'Get advice from your network',            placeholder: 'What do you want to ask?' },
  { value: 'achievement',  label: 'Win',      icon: '🏆', color: '#B45309', title: 'Celebrate a Win',      sub: "Share something you're proud of",         placeholder: 'What did you achieve?' },
  { value: 'feedback',     label: 'Feedback', icon: '⭐', color: '#DB2777', title: 'Share Feedback',       sub: 'Rate and review an experience',           placeholder: 'Tell us more about your experience…' },
  { value: 'resource',     label: 'Resource', icon: '📎', color: '#0891B2', title: 'Share a Resource',     sub: 'Post a useful link, guide, or tool',      placeholder: 'What makes this resource useful?' },
  { value: 'milestone',    label: 'Milestone',icon: '🎯', color: '#DC2626', title: 'Share a Milestone',    sub: 'Mark a career milestone',                 placeholder: 'What milestone did you reach?' },
  { value: 'announcement', label: 'News',     icon: '📢', color: '#1D4ED8', title: 'Post an Announcement', sub: 'Share news with everyone',                placeholder: 'Share an announcement or update…' },
  { value: 'poll',         label: 'Poll',     icon: '🗳️', color: '#5B21B6', title: 'Create a Poll',       sub: 'Ask the community to vote',               placeholder: 'Add more context (optional)…' },
];

const TIP_TOPICS      = ['Career Growth', 'Interview Prep', 'Resume', 'Networking', 'Productivity'];
const QUESTION_TOPICS = ['Salary', 'Interview', 'Career Change', 'Skills', 'Workplace'];
const WIN_TYPES       = ['New Job', 'Promotion', 'Certification', 'Project', 'Personal Growth'];
const JOB_TYPES       = ['Full-time', 'Part-time', 'Internship', 'Contract', 'Remote'];
const EXPERIENCE_LEVELS = ['Entry', 'Mid', 'Senior', 'Lead'];
const CELEBRATION_EMOJIS = ['🎉', '🚀', '🥳', '👏', '🔥', '💪'];
const RESOURCE_TYPES  = ['Article', 'Video', 'Course', 'Tool', 'Template'];
const MILESTONE_TYPES = ['Work Anniversary', 'Promotion', 'New Job', 'Certification', 'Other'];
const NEWS_PRIORITIES = ['Normal', 'Important', 'Urgent'];

const fieldInput = {
  width: '100%', padding: '10px 13px', borderRadius: 10, border: '1px solid #E5E7EB',
  background: '#FAFBFC', fontSize: 13.5, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};

function ChipPicker({ options, value, onChange, color }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(o => (
        <button key={o} type="button" onClick={() => onChange(value === o ? '' : o)}
          style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20, border: `1px solid ${value === o ? color : '#E5E7EB'}`, background: value === o ? `${color}15` : '#F9FAFB', color: value === o ? color : '#6B7280', fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s' }}>
          {o}
        </button>
      ))}
    </div>
  );
}

function StarRating({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          style={{ background: 'none', border: 'none', fontSize: 30, cursor: 'pointer', padding: 0, lineHeight: 1, color: n <= value ? '#F59E0B' : '#E5E7EB', transition: 'color 0.1s' }}>
          ★
        </button>
      ))}
    </div>
  );
}

// ── Create Post ────────────────────────────────────────────────────────────────
function CreatePost({ user, onCreate, isMobile }) {
  // The composer modal only needs the bottom-sheet treatment on narrow phone screens —
  // use a tighter breakpoint than the page-layout `isMobile` so it centers on desktop/tablet.
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const h = () => setIsNarrow(window.innerWidth < 640);
    window.addEventListener('resize', h, { passive: true });
    return () => window.removeEventListener('resize', h);
  }, []);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [text,       setText]       = useState('');
  const [postType,   setPostType]   = useState('update');
  const [submitting, setSubmitting] = useState(false);
  const [images,     setImages]     = useState([]);
  const [uploading,  setUploading]  = useState(false);
  const [uploadErr,  setUploadErr]  = useState('');
  const [video,        setVideo]        = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoErr,     setVideoErr]      = useState('');
  const [audioUrl,     setAudioUrl]      = useState('');
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioErr,     setAudioErr]      = useState('');
  const [mentions,   setMentions]   = useState([]); // [{ userId, name }]
  const [submitError, setSubmitError] = useState('');

  // Category-specific fields
  const [jobTitle,     setJobTitle]     = useState('');
  const [company,      setCompany]      = useState('');
  const [jobLocation,  setJobLocation]  = useState('');
  const [applyLink,    setApplyLink]    = useState('');
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceLink,  setResourceLink]  = useState('');
  const [milestoneDate, setMilestoneDate] = useState('');
  const [rating,        setRating]        = useState(5);
  const [topicTag,      setTopicTag]      = useState('');
  const [pollQuestion,  setPollQuestion]  = useState('');
  const [pollOptions,   setPollOptions]   = useState(['', '']);
  const [pollDuration,  setPollDuration]  = useState(3);
  const [jobType,         setJobType]         = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [celebrationEmoji, setCelebrationEmoji] = useState('🎉');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [wouldRecommend,  setWouldRecommend]  = useState(true);
  const [resourceType,    setResourceType]    = useState('');
  const [milestoneType,   setMilestoneType]   = useState('');
  const [newsPriority,    setNewsPriority]    = useState('Normal');

  const mentionAc = useMentionAutocomplete();
  const fileRef = useRef(null);
  const videoFileRef = useRef(null);
  const audioFileRef = useRef(null);
  const textareaRef = useRef(null);

  const activeType = CATEGORIES.find(t => t.value === postType) || CATEGORIES[0];

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setUploadErr('');
    const uploaded = [];
    let failed = 0;
    let lastErr = '';
    for (const file of files.slice(0, 4 - images.length)) {
      try {
        const formData = new FormData();
        formData.append('image', file);
        const r = await api.uploadFeedImage(formData);
        if (r?.url) uploaded.push(r.url);
        else failed++;
      } catch (err) { failed++; lastErr = err?.message || ''; }
    }
    setImages(prev => [...prev, ...uploaded].slice(0, 4));
    if (failed > 0) setUploadErr(lastErr || `${failed} photo${failed > 1 ? 's' : ''} failed to upload. Please try again.`);
    setUploading(false);
    e.target.value = '';
  };

  const removeImage = (idx) => setImages(p => p.filter((_, i) => i !== idx));

  const handleVideoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    setVideoErr('');
    try {
      const formData = new FormData();
      formData.append('video', file);
      const r = await api.uploadFeedVideo(formData);
      if (r?.url) setVideo(r.url);
      else setVideoErr('Video upload failed. Please try again.');
    } catch (err) { setVideoErr(err?.message || 'Video upload failed. Please try again.'); }
    setUploadingVideo(false);
    e.target.value = '';
  };

  const removeVideo = () => setVideo('');

  const handleAudioSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAudio(true);
    setAudioErr('');
    try {
      const formData = new FormData();
      formData.append('audio', file);
      const r = await api.uploadFeedAudio(formData);
      if (r?.url) setAudioUrl(r.url);
      else setAudioErr('Audio upload failed. Please try again.');
    } catch (err) { setAudioErr(err?.message || 'Audio upload failed. Please try again.'); }
    setUploadingAudio(false);
    e.target.value = '';
  };

  const removeAudio = () => setAudioUrl('');

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    mentionAc.detect(val, e.target.selectionStart);
  };

  const selectMention = (u) => {
    const result = applyMention(text, mentionAc.active, u);
    setText(result.text);
    setMentions(prev => prev.some(m => m.userId === result.mention.userId) ? prev : [...prev, result.mention]);
    mentionAc.close();
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = result.cursor;
      }
    });
  };

  const resetForm = () => {
    setText(''); setPostType('update'); setImages([]); setMentions([]); setUploadErr(''); setSubmitError(''); mentionAc.close();
    setVideo(''); setVideoErr(''); setAudioUrl(''); setAudioErr('');
    setJobTitle(''); setCompany(''); setJobLocation(''); setApplyLink('');
    setResourceTitle(''); setResourceLink(''); setMilestoneDate('');
    setRating(5); setTopicTag(''); setPollQuestion(''); setPollOptions(['', '']); setPollDuration(3);
    setJobType(''); setExperienceLevel(''); setCelebrationEmoji('🎉');
    setFeedbackSubject(''); setWouldRecommend(true); setResourceType(''); setMilestoneType(''); setNewsPriority('Normal');
  };

  const openModal = (type) => { setPostType(type || 'update'); setModalOpen(true); };
  const closeModal = () => { if (submitting) return; setModalOpen(false); resetForm(); };

  const canSubmit = () => {
    if (postType === 'poll') return pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2;
    if (postType === 'hiring') return text.trim() && jobTitle.trim();
    return !!text.trim();
  };

  const submit = async () => {
    if (!canSubmit() || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const activeMentionIds = mentions
        .filter(m => text.includes(`@[${m.name}](${m.userId})`))
        .map(m => m.userId);
      let finalContent = text.trim();
      const payload = { postType, images, videos: video ? [video] : [], audioUrl, mentions: activeMentionIds };

      if (postType === 'achievement') {
        finalContent = `${celebrationEmoji} ${finalContent}`.trim();
      }
      if (postType === 'feedback') {
        const subjectPrefix = feedbackSubject.trim() ? `${feedbackSubject.trim()} — ` : '';
        finalContent = `${'⭐'.repeat(rating)} ${subjectPrefix}${finalContent}`.trim();
        finalContent += wouldRecommend ? '\n\n👍 Would recommend' : '\n\n👎 Would not recommend';
      }
      if ((postType === 'tip' || postType === 'question' || postType === 'achievement') && topicTag) {
        finalContent = `${finalContent}\n\n#${topicTag.replace(/\s+/g, '')}`;
      }
      if (postType === 'milestone') {
        if (milestoneType) finalContent = `🎯 ${milestoneType}\n\n${finalContent}`.trim();
        if (milestoneDate) finalContent += `\n\n📅 ${milestoneDate}`;
      }
      if (postType === 'hiring') {
        const extra = [jobType, experienceLevel ? `${experienceLevel} level` : ''].filter(Boolean).join(' · ');
        const location = [jobLocation.trim(), extra].filter(Boolean).join(' · ');
        payload.jobDetails = { title: jobTitle.trim(), company: company.trim(), location, link: applyLink.trim() };
      }
      if (postType === 'resource') {
        let prefix = '';
        if (resourceType) prefix += `[${resourceType}] `;
        if (resourceTitle.trim()) prefix += `${resourceTitle.trim()}\n\n`;
        if (prefix) finalContent = `${prefix}${finalContent}`.trim();
        payload.resourceLink = resourceLink.trim();
      }
      if (postType === 'announcement' && newsPriority !== 'Normal') {
        const tag = newsPriority === 'Urgent' ? '🚨 URGENT' : '⚡ IMPORTANT';
        finalContent = `${tag}\n\n${finalContent}`.trim();
      }
      if (postType === 'poll') {
        finalContent = finalContent || pollQuestion.trim();
        payload.poll = {
          question: pollQuestion.trim(),
          options: pollOptions.filter(o => o.trim()).map(o => o.trim()),
          durationDays: pollDuration,
        };
      }

      payload.content = finalContent;
      await onCreate(payload);
      closeModal();
    } catch (e) {
      setSubmitError(e?.message || 'Failed to post. Please check your connection and try again.');
    } finally { setSubmitting(false); }
  };

  const charLeft = 3000 - text.length;

  return (
    <>
      <div style={{ ...card, padding: '14px 18px', marginBottom: 12, borderRadius: 16, border: '1px solid #F1F5F9' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Avatar name={user?.name} src={user?.avatarUrl} size={42} role={user?.role} />
          <button onClick={() => openModal('update')} className="tn-composer-btn"
            style={{ flex: 1, textAlign: 'left', padding: '11px 16px', borderRadius: 24, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#6B7280', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
            Start a post, {user?.name?.split(' ')[0] || 'there'}…
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {[
            { type: 'update',  icon: '🖼️', label: 'Photo',  color: '#0176D3' },
            { type: 'hiring',  icon: '💼', label: 'Hiring', color: '#059669' },
            { type: 'poll',    icon: '🗳️', label: 'Poll',   color: '#5B21B6' },
            { type: 'tip',     icon: '💡', label: 'Tip',    color: '#D97706' },
          ].map(a => (
            <button key={a.type} onClick={() => openModal(a.type)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 20, border: '1px solid #E5E7EB', background: '#F9FAFB', color: a.color, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
              <span style={{ fontSize: 15 }}>{a.icon}</span> {a.label}
            </button>
          ))}
        </div>
      </div>

      {modalOpen && createPortal(
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 10000, display: 'flex', alignItems: isNarrow ? 'flex-end' : 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', width: isNarrow ? '100%' : 560, maxWidth: '100%', maxHeight: isNarrow ? '92vh' : '88vh', borderRadius: isNarrow ? '20px 20px 0 0' : 18, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            {/* Header */}
            <div style={{ background: `linear-gradient(135deg, ${activeType.color} 0%, ${activeType.color}cc 100%)`, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>{activeType.icon} {activeType.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 }}>{activeType.sub}</div>
              </div>
              <button onClick={closeModal} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
            </div>

            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
              {/* Category picker */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #F1F5F9' }}>
                {CATEGORIES.map(c => (
                  <button key={c.value} onClick={() => setPostType(c.value)} title={c.label}
                    style={{ fontSize: 11, padding: '5px 12px', borderRadius: 20, border: `1px solid ${postType === c.value ? c.color : '#E5E7EB'}`, background: postType === c.value ? `${c.color}15` : '#F9FAFB', color: postType === c.value ? c.color : '#6B7280', fontWeight: 700, cursor: 'pointer' }}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>

              {/* Author + text */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                <Avatar name={user?.name} src={user?.avatarUrl} size={40} role={user?.role} />
                <div style={{ flex: 1, position: 'relative' }}>
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={handleTextChange}
                    placeholder={activeType.placeholder}
                    rows={postType === 'poll' ? 2 : 4}
                    maxLength={3000}
                    style={{ ...fieldInput, resize: 'none', lineHeight: 1.6, padding: '11px 14px' }}
                  />
                  <MentionDropdown suggestions={mentionAc.suggestions} searching={mentionAc.searching} onSelect={selectMention} />
                </div>
              </div>

              {/* Category-specific fields */}
              {postType === 'hiring' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14, padding: 14, borderRadius: 12, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Job Details</div>
                  <input style={fieldInput} placeholder="Job title *" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input style={fieldInput} placeholder="Company" value={company} onChange={e => setCompany(e.target.value)} />
                    <input style={fieldInput} placeholder="Location" value={jobLocation} onChange={e => setJobLocation(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <select style={fieldInput} value={jobType} onChange={e => setJobType(e.target.value)}>
                      <option value="">Job type (optional)</option>
                      {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select style={fieldInput} value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)}>
                      <option value="">Experience level (optional)</option>
                      {EXPERIENCE_LEVELS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <input style={fieldInput} placeholder="Apply link (optional)" value={applyLink} onChange={e => setApplyLink(e.target.value)} />
                </div>
              )}

              {postType === 'resource' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14, padding: 14, borderRadius: 12, background: '#ECFEFF', border: '1px solid #A5F3FC' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#0891B2', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Resource Details</div>
                  <ChipPicker options={RESOURCE_TYPES} value={resourceType} onChange={setResourceType} color={activeType.color} />
                  <input style={fieldInput} placeholder="Resource title" value={resourceTitle} onChange={e => setResourceTitle(e.target.value)} />
                  <input style={fieldInput} placeholder="Link (URL)" value={resourceLink} onChange={e => setResourceLink(e.target.value)} />
                </div>
              )}

              {(postType === 'tip' || postType === 'question') && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Topic</div>
                  <ChipPicker
                    options={postType === 'tip' ? TIP_TOPICS : QUESTION_TOPICS}
                    value={topicTag} onChange={setTopicTag} color={activeType.color}
                  />
                </div>
              )}

              {postType === 'achievement' && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Celebrate with</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {CELEBRATION_EMOJIS.map(e => (
                      <button key={e} type="button" onClick={() => setCelebrationEmoji(e)}
                        style={{ fontSize: 20, width: 40, height: 40, borderRadius: 10, border: `1.5px solid ${celebrationEmoji === e ? activeType.color : '#E5E7EB'}`, background: celebrationEmoji === e ? `${activeType.color}15` : '#F9FAFB', cursor: 'pointer' }}>
                        {e}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Win type</div>
                  <ChipPicker options={WIN_TYPES} value={topicTag} onChange={setTopicTag} color={activeType.color} />
                </div>
              )}

              {postType === 'feedback' && (
                <div style={{ marginBottom: 14, padding: 14, borderRadius: 12, background: '#FDF2F8', border: '1px solid #FBCFE8' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#DB2777', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Your rating</div>
                  <StarRating value={rating} onChange={setRating} />
                  <input style={{ ...fieldInput, marginTop: 12 }} placeholder="What/who is this about? (company, product, course…)" value={feedbackSubject} onChange={e => setFeedbackSubject(e.target.value)} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button type="button" onClick={() => setWouldRecommend(true)}
                      style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20, border: `1px solid ${wouldRecommend ? '#059669' : '#E5E7EB'}`, background: wouldRecommend ? '#ECFDF5' : '#F9FAFB', color: wouldRecommend ? '#059669' : '#6B7280', fontWeight: 700, cursor: 'pointer' }}>
                      👍 Recommend
                    </button>
                    <button type="button" onClick={() => setWouldRecommend(false)}
                      style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20, border: `1px solid ${!wouldRecommend ? '#DC2626' : '#E5E7EB'}`, background: !wouldRecommend ? '#FEF2F2' : '#F9FAFB', color: !wouldRecommend ? '#DC2626' : '#6B7280', fontWeight: 700, cursor: 'pointer' }}>
                      👎 Don't recommend
                    </button>
                  </div>
                </div>
              )}

              {postType === 'milestone' && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Milestone type</div>
                  <ChipPicker options={MILESTONE_TYPES} value={milestoneType} onChange={setMilestoneType} color={activeType.color} />
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 12, marginBottom: 8 }}>Date reached (optional)</div>
                  <input type="date" style={{ ...fieldInput, maxWidth: 200 }} value={milestoneDate} onChange={e => setMilestoneDate(e.target.value)} />
                </div>
              )}

              {postType === 'announcement' && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Priority</div>
                  <ChipPicker options={NEWS_PRIORITIES} value={newsPriority} onChange={v => setNewsPriority(v || 'Normal')} color={activeType.color} />
                </div>
              )}

              {postType === 'poll' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14, padding: 14, borderRadius: 12, background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#5B21B6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Poll Question</div>
                  <input style={fieldInput} placeholder="Ask a question…" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} maxLength={300} />
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#5B21B6', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>Options</div>
                  {pollOptions.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input style={fieldInput} placeholder={`Option ${i + 1}`} value={opt} maxLength={120}
                        onChange={e => setPollOptions(prev => prev.map((o, idx) => idx === i ? e.target.value : o))} />
                      {pollOptions.length > 2 && (
                        <button type="button" onClick={() => setPollOptions(prev => prev.filter((_, idx) => idx !== i))}
                          style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 18, cursor: 'pointer', padding: 4, lineHeight: 1 }}>×</button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 6 && (
                    <button type="button" onClick={() => setPollOptions(prev => [...prev, ''])}
                      style={{ alignSelf: 'flex-start', background: 'none', border: '1px dashed #C4B5FD', color: '#5B21B6', fontSize: 12, fontWeight: 700, borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>
                      + Add option
                    </button>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#5B21B6' }}>Poll length:</span>
                    <select value={pollDuration} onChange={e => setPollDuration(Number(e.target.value))} style={{ ...fieldInput, width: 'auto', padding: '6px 10px' }}>
                      <option value={1}>1 day</option>
                      <option value={3}>3 days</option>
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Images (not for poll) */}
              {postType !== 'poll' && (
                <>
                  {images.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(images.length, 4)}, 1fr)`, gap: 8, marginBottom: 12 }}>
                      {images.map((img, i) => (
                        <div key={i} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB', aspectRatio: '1 / 1' }}>
                          <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          <button onClick={() => removeImage(i)}
                            style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(17,24,39,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: 24, height: 24, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0, backdropFilter: 'blur(2px)' }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {uploading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '10px 14px', borderRadius: 10, border: '1px dashed #D1D5DB', background: '#F9FAFB' }}>
                      <div style={{ width: 16, height: 16, border: '2px solid #E5E7EB', borderTopColor: activeType.color, borderRadius: '50%', animation: 'tn-spin 0.8s linear infinite' }} />
                      <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>Uploading photo…</span>
                    </div>
                  )}
                  {uploadErr && (
                    <div style={{ marginBottom: 12, fontSize: 12, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '8px 12px', fontWeight: 600 }}>⚠️ {uploadErr}</div>
                  )}
                  {video && (
                    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB', marginBottom: 12, display: 'flex', justifyContent: 'center', background: '#000' }}>
                      <video src={video} controls style={{ maxWidth: '100%', maxHeight: 240, width: 'auto', height: 'auto', display: 'block' }} />
                      <button onClick={removeVideo}
                        style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(17,24,39,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: 24, height: 24, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0, backdropFilter: 'blur(2px)' }}>×</button>
                    </div>
                  )}
                  {uploadingVideo && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '10px 14px', borderRadius: 10, border: '1px dashed #D1D5DB', background: '#F9FAFB' }}>
                      <div style={{ width: 16, height: 16, border: '2px solid #E5E7EB', borderTopColor: activeType.color, borderRadius: '50%', animation: 'tn-spin 0.8s linear infinite' }} />
                      <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>Uploading video…</span>
                    </div>
                  )}
                  {videoErr && (
                    <div style={{ marginBottom: 12, fontSize: 12, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '8px 12px', fontWeight: 600 }}>⚠️ {videoErr}</div>
                  )}

                  {audioUrl && (
                    <div style={{ position: 'relative', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <audio src={audioUrl} controls style={{ flex: 1 }} />
                      <button onClick={removeAudio}
                        style={{ background: 'rgba(17,24,39,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: 24, height: 24, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
                    </div>
                  )}
                  {uploadingAudio && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '10px 14px', borderRadius: 10, border: '1px dashed #D1D5DB', background: '#F9FAFB' }}>
                      <div style={{ width: 16, height: 16, border: '2px solid #E5E7EB', borderTopColor: activeType.color, borderRadius: '50%', animation: 'tn-spin 0.8s linear infinite' }} />
                      <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>Uploading audio…</span>
                    </div>
                  )}
                  {audioErr && (
                    <div style={{ marginBottom: 12, fontSize: 12, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '8px 12px', fontWeight: 600 }}>⚠️ {audioErr}</div>
                  )}

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => { setUploadErr(''); fileRef.current?.click(); }} disabled={images.length >= 4 || uploading}
                      style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#374151', fontSize: 12, fontWeight: 700, cursor: images.length >= 4 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, opacity: images.length >= 4 ? 0.5 : 1, marginBottom: 8 }}>
                      📷 {uploading ? 'Uploading…' : `Photo${images.length > 0 ? ` (${images.length}/4)` : ''}`}
                    </button>
                    <button onClick={() => { setVideoErr(''); videoFileRef.current?.click(); }} disabled={!!video || uploadingVideo}
                      style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#374151', fontSize: 12, fontWeight: 700, cursor: video ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, opacity: video ? 0.5 : 1, marginBottom: 8 }}>
                      🎥 {uploadingVideo ? 'Uploading…' : 'Video'}
                    </button>
                    <button onClick={() => { setAudioErr(''); audioFileRef.current?.click(); }} disabled={!!audioUrl || uploadingAudio}
                      style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#374151', fontSize: 12, fontWeight: 700, cursor: audioUrl ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, opacity: audioUrl ? 0.5 : 1, marginBottom: 8 }}>
                      🎙️ {uploadingAudio ? 'Uploading…' : 'Voice'}
                    </button>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImageSelect} style={{ display: 'none' }} />
                  <input ref={videoFileRef} type="file" accept="video/*" onChange={handleVideoSelect} style={{ display: 'none' }} />
                  <input ref={audioFileRef} type="file" accept="audio/*" onChange={handleAudioSelect} style={{ display: 'none' }} />
                </>
              )}
            </div>

            {/* Footer */}
            {submitError && (
              <div style={{ margin: '0 20px 8px', padding: '9px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 12, fontWeight: 600, lineHeight: 1.4 }}>
                ⚠️ {submitError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '12px 20px', borderTop: '1px solid #F1F5F9', flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: charLeft < 200 ? '#EF4444' : '#9CA3AF' }}>{charLeft < 500 ? `${charLeft} left` : ''}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={closeModal} style={{ ...btnG, fontSize: 12, padding: '7px 14px' }}>Cancel</button>
                <button onClick={submit} disabled={!canSubmit() || submitting}
                  style={{ ...btnP, background: activeType.color, fontSize: 13, padding: '7px 20px', opacity: (!canSubmit() || submitting) ? 0.6 : 1 }}>
                  {submitting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── Sidebars ───────────────────────────────────────────────────────────────────
function ProfileSidebar({ user, connectionCount }) {
  const bg = ROLE_COLOR[user?.role] || '#0176D3';
  return (
    <div className="tn-sidecard" style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 12, borderRadius: 16, border: '1px solid #F1F5F9' }}>
      <div style={{ height: 70, background: `linear-gradient(135deg, ${bg} 0%, ${bg}99 100%)` }} />
      <div style={{ padding: '0 16px 16px', marginTop: -32 }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', border: '3px solid #fff', overflow: 'hidden', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22, color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
          {user?.avatarUrl
            ? <img src={user.avatarUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (user?.name || '?')[0].toUpperCase()}
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#0A1628' }}>{user?.name || 'You'}</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2, marginBottom: 6 }}>{user?.title || user?.role || 'TalentNest Member'}</div>
          <RoleBadge role={user?.role} />
        </div>
        {/* Connection count — prominent below name */}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 20, fontWeight: 900, background: `linear-gradient(135deg, ${bg}, #7C3AED)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{connectionCount}</span>
          <span style={{ fontSize: 12, color: '#6B7280' }}>connection{connectionCount !== 1 ? 's' : ''}</span>
        </div>
        {user?.email && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            ✉️ {user.email}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickStats({ myPosts, myReactions, bookmarkCount }) {
  const stats = [
    { label: 'Posts',     value: myPosts,      color: '#0176D3', icon: '📝' },
    { label: 'Reactions', value: myReactions,   color: '#7C3AED', icon: '❤️' },
    { label: 'Saved',     value: bookmarkCount, color: '#F59E0B', icon: '🔖' },
  ];
  return (
    <div className="tn-sidecard" style={{ ...card, padding: '14px 16px', marginBottom: 12, borderRadius: 16, border: '1px solid #F1F5F9' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Activity</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {stats.map((s, i) => (
          <div key={s.label} style={{ textAlign: 'center', padding: '6px 4px', borderLeft: i > 0 ? '1px solid #F1F5F9' : 'none' }}>
            <div style={{ fontSize: 13, marginBottom: 2 }}>{s.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendingHashtags({ posts, onHashtagClick, activeHashtag }) {
  const counts = useMemo(() => {
    const c = {};
    (posts || []).forEach(p => (p.hashtags || []).forEach(h => { c[h] = (c[h] || 0) + 1; }));
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [posts]);

  if (!counts.length) return null;
  return (
    <div className="tn-sidecard" style={{ ...card, padding: '14px 16px', marginBottom: 12, borderRadius: 16, border: '1px solid #F1F5F9' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>🔥 Trending Topics</div>
      {counts.map(([tag, count]) => (
        <div key={tag} onClick={() => onHashtagClick(tag === activeHashtag ? null : tag)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, cursor: 'pointer', padding: '4px 6px', borderRadius: 6, background: activeHashtag === tag ? '#EFF6FF' : 'transparent', transition: 'background 0.12s' }}
          onMouseEnter={e => { if (activeHashtag !== tag) e.currentTarget.style.background = '#F9FAFB'; }}
          onMouseLeave={e => { if (activeHashtag !== tag) e.currentTarget.style.background = 'transparent'; }}>
          <span style={{ fontSize: 13, color: '#0176D3', fontWeight: 600 }}>{tag}</span>
          <span style={{ fontSize: 11, color: '#9CA3AF', background: '#F3F4F6', borderRadius: 10, padding: '1px 6px' }}>{count}</span>
        </div>
      ))}
    </div>
  );
}

// People panel — non-connections with inline Connect button
function PeoplePanel({ posts, connectionIds, pendingIds, currentUserId, onConnect, onViewProfile }) {
  const people = useMemo(() => {
    const seen = new Set();
    const list = [];
    (posts || []).forEach(p => {
      const id = String(p.authorId);
      if (!seen.has(id) && id !== String(currentUserId) && !connectionIds.has(id)) {
        seen.add(id);
        list.push({ id, name: p.authorName, avatar: p.authorAvatar, role: p.authorRole, title: p.authorTitle });
      }
    });
    return list.slice(0, 6);
  }, [posts, connectionIds, currentUserId]);

  if (!people.length) return null;
  return (
    <div className="tn-sidecard" style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8F0FE', overflow: 'hidden', boxShadow: '0 2px 16px rgba(1,118,211,0.07)' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)', borderBottom: '1px solid #E8F0FE' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 1 }}>👥 People You May Know</div>
        <div style={{ fontSize: 11, color: '#64748B' }}>Active members in your feed</div>
      </div>

      {/* People list */}
      <div>
        {people.map((p, idx) => (
          <div
            key={p.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px',
              borderBottom: idx < people.length - 1 ? '1px solid #F8FAFC' : 'none',
              cursor: 'default',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {/* Avatar */}
            <div onClick={() => onViewProfile?.(p.id)} style={{ cursor: 'pointer', flexShrink: 0, position: 'relative' }}>
              <Avatar name={p.name} src={p.avatar} size={42} role={p.role} />
              {/* Online-style accent dot */}
              <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: '#22C55E', border: '2px solid #fff' }} />
            </div>

            {/* Name + title */}
            <div onClick={() => onViewProfile?.(p.id)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>{p.name || 'Member'}</div>
              <div style={{ fontSize: 11, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{p.title || ROLE_LABEL[p.role] || 'Member'}</div>
            </div>

            {/* Connect button */}
            <button
              onClick={() => onConnect(p.id)}
              disabled={pendingIds.has(p.id)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                flexShrink: 0, transition: 'all 0.15s',
                cursor: pendingIds.has(p.id) ? 'default' : 'pointer',
                border: pendingIds.has(p.id) ? 'none' : '1.5px solid #0176D3',
                background: pendingIds.has(p.id) ? '#F0FDF4' : '#EFF6FF',
                color: pendingIds.has(p.id) ? '#16A34A' : '#0176D3',
              }}
              onMouseEnter={e => { if (!pendingIds.has(p.id)) { e.currentTarget.style.background = '#0176D3'; e.currentTarget.style.color = '#fff'; } }}
              onMouseLeave={e => { if (!pendingIds.has(p.id)) { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#0176D3'; } }}
            >
              {pendingIds.has(p.id) ? '✓ Sent' : '+ Connect'}
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '8px 16px 10px', background: '#FAFBFF', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#94A3B8' }}>Connect to see their posts & profile</div>
      </div>
    </div>
  );
}

// ── Search Bar ─────────────────────────────────────────────────────────────────
function SearchBar({ value, onChange }) {
  return (
    <div style={{ position: 'relative', marginBottom: 12 }}>
      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9CA3AF', pointerEvents: 'none' }}>🔍</span>
      <input value={value} onChange={e => onChange(e.target.value)}
        placeholder="Search posts, people, hashtags…"
        style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', background: '#F8FAFC', boxSizing: 'border-box', transition: 'border 0.15s' }}
        onFocus={e => e.currentTarget.style.border = '1px solid #0176D3'}
        onBlur={e => e.currentTarget.style.border = '1px solid #E5E7EB'} />
      {value && (
        <button onClick={() => onChange('')}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
      )}
    </div>
  );
}

function SavedPostsView({ savedPosts, loadingSaved, ...props }) {
  if (loadingSaved) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9CA3AF' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: '#0176D3', borderRadius: '50%', animation: 'tn-spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        Loading saved posts…
      </div>
    );
  }
  if (!savedPosts.length) {
    return (
      <div style={{ ...card, textAlign: 'center', padding: '40px 24px', borderRadius: 14 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>★</div>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#374151', marginBottom: 6 }}>No saved posts</div>
        <div style={{ fontSize: 13, color: '#9CA3AF' }}>Click ☆ on any post to save it here.</div>
      </div>
    );
  }
  return <>{savedPosts.map(post => <PostCard key={post._id} post={post} {...props} />)}</>;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CommunityFeed({ user }) {
  const navigate = useNavigate();
  const [posts,        setPosts]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [page,         setPage]         = useState(1);
  const [hasMore,      setHasMore]      = useState(true);
  const [filter,       setFilter]       = useState('all');
  const [networkOnly,  setNetworkOnly]  = useState(false); // "My Network" filter
  const [search,       setSearch]       = useState('');
  const [activeHash,   setActiveHash]   = useState(null);
  const [tab,          setTab]          = useState('feed');
  const [savedPosts,   setSavedPosts]   = useState([]);
  const [savedCount,   setSavedCount]   = useState(0);
  const [loadingSaved, setLoadingSaved] = useState(false);
  // Connections
  const [connections,  setConnections]  = useState([]);
  const [pendingIds,   setPendingIds]   = useState(new Set());
  const [seeding,      setSeeding]      = useState(false);
  const [seedMsg,      setSeedMsg]      = useState('');
  const [isMobile,     setMobile]       = useState(() => window.innerWidth < 1100);

  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 1100);
    window.addEventListener('resize', h, { passive: true });
    return () => window.removeEventListener('resize', h);
  }, []);

  // Load connections silently in background — doesn't block the feed
  useEffect(() => {
    api.getConnections().then(r => setConnections(r?.data || [])).catch(() => {});
  }, []);

  const connectionIds = useMemo(() => new Set((connections || []).map(c => String(c._id || c.id))), [connections]);

  const loadPosts = useCallback(async (p = 1, type = 'all', append = false) => {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const limit = networkOnly ? 50 : 15; // load more when filtering to network
      const r = await api.getPosts({ page: p, limit, ...(type !== 'all' ? { type } : {}) });
      const items = r?.data || [];
      setPosts(prev => append ? [...prev, ...items] : items);
      setHasMore(r?.hasMore ?? false);
      setPage(p);
    } catch {
      if (!append) setPosts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [networkOnly]);

  useEffect(() => { loadPosts(1, filter); }, [filter, loadPosts]);
  useEffect(() => { setActiveHash(null); setSearch(''); }, [filter]);

  const isFiltered  = !!activeHash || !!search.trim() || networkOnly;

  // Silent background refresh every 60s — catches any events missed by the socket.
  // Skip while the user has scrolled down reading, so new posts don't shift their place.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible' && tab === 'feed' && !isFiltered && window.scrollY < 80) {
        loadPosts(1, filter);
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [filter, tab, isFiltered, loadPosts]);

  // Load the current user's saved posts from the server
  const loadSavedPosts = useCallback(async () => {
    setLoadingSaved(true);
    try {
      const r = await api.getSavedPosts();
      const items = r?.data || [];
      setSavedPosts(items);
      setSavedCount(items.length);
    } catch {
      setSavedPosts([]);
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  // Fetch saved count on mount, and refresh full list whenever the "Saved" tab opens
  useEffect(() => { loadSavedPosts(); }, [loadSavedPosts]);
  useEffect(() => { if (tab === 'saved') loadSavedPosts(); }, [tab, loadSavedPosts]);

  const handleCreate = async (data) => {
    const result = await api.createPost(data);
    // Optimistic: prepend the new post immediately so user sees it without waiting for a reload
    if (result?.data || result?._id) {
      setPosts(prev => [result.data || result, ...prev]);
    }
    loadPosts(1, filter);
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    await api.deletePost(postId);
    setPosts(prev => prev.filter(p => p._id !== postId));
    // Also clean from saved posts
    const strId = String(postId);
    setSavedPosts(prev => {
      if (!prev.some(p => String(p._id) === strId)) return prev;
      const next = prev.filter(p => String(p._id) !== strId);
      setSavedCount(next.length);
      return next;
    });
  };

  const handleReact = async (postId, type) => {
    const r = await api.reactToPost(postId, type);
    if (r?.reactions) setPosts(prev => prev.map(p => p._id === postId ? { ...p, reactions: r.reactions } : p));
  };

  const handleAddComment = async (postId, content, mentions) => {
    const r = await api.addComment(postId, content, mentions);
    if (r?.comment) setPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: [...(p.comments || []), r.comment] } : p));
  };

  const handleDeleteComment = async (postId, commentId) => {
    await api.deleteComment(postId, commentId);
    setPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: (p.comments || []).filter(c => String(c._id) !== commentId) } : p));
  };

  const handleToggleBookmark = async (postId) => {
    const r = await api.toggleSavePost(postId);
    if (!r) return;
    const myUid = String(uid);
    const updateSavedBy = (p) => {
      if (String(p._id) !== String(postId)) return p;
      const savedBy = r.saved
        ? [...(p.savedBy || []).filter(id => String(id) !== myUid), myUid]
        : (p.savedBy || []).filter(id => String(id) !== myUid);
      return { ...p, savedBy };
    };
    setPosts(prev => prev.map(updateSavedBy));
    if (r.saved) {
      loadSavedPosts();
    } else {
      setSavedPosts(prev => {
        const next = prev.filter(p => String(p._id) !== String(postId));
        setSavedCount(next.length);
        return next;
      });
    }
  };

  const handleHashtagClick = (tag) => { setActiveHash(tag); setFilter('all'); setSearch(''); setNetworkOnly(false); };

  const handleViewProfile = (userId) => {
    navigate(`/app/profile/${userId}`);
  };

  // Inline connect from post card or people panel
  const handleConnect = async (authorId) => {
    const id = String(authorId);
    setPendingIds(prev => new Set([...prev, id]));
    try {
      await api.sendConnectionRequest(id);
    } catch {
      setPendingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const handleSeed = async () => {
    setSeeding(true); setSeedMsg('');
    try {
      const r = await api.seedTestData();
      setSeedMsg(r?.message || 'Done!');
      loadPosts(1, filter);
    } catch (e) {
      setSeedMsg(e?.message || 'Seed failed.');
    } finally { setSeeding(false); }
  };

  const isAdmin = ['admin', 'super_admin', 'superadmin'].includes(user?.role);
  const uid     = user?.id || user?._id;

  // Real-time sync
  usePlatformEvents({
    'post:created': (post) => {
      if (String(post.authorId) === String(uid)) return;
      setPosts(prev => {
        if (prev.some(p => String(p._id) === String(post._id))) return prev;
        return [post, ...prev]; // instant — appears at top immediately
      });
    },
    'post:reacted': ({ postId, reactions }) => {
      setPosts(prev => prev.map(p => String(p._id) === String(postId) ? { ...p, reactions } : p));
    },
    'post:commented': ({ postId, comment }) => {
      setPosts(prev => prev.map(p => {
        if (String(p._id) !== String(postId)) return p;
        // Skip if it's the current user's own comment (already added optimistically)
        if (String(comment.userId) === String(uid)) return p;
        // Skip duplicates
        if ((p.comments || []).some(c => String(c._id) === String(comment._id))) return p;
        return { ...p, comments: [...(p.comments || []), comment] };
      }));
    },
    'post:deleted': ({ postId }) => {
      const strId = String(postId);
      setPosts(prev => prev.filter(p => String(p._id) !== strId));
      setSavedPosts(prev => {
        if (!prev.some(p => String(p._id) === strId)) return prev;
        const next = prev.filter(p => String(p._id) !== strId);
        setSavedCount(next.length);
        return next;
      });
    },
    'post:polled': ({ postId, poll }) => {
      setPosts(prev => prev.map(p => String(p._id) === String(postId) ? { ...p, poll } : p));
    },
  });

  const FILTERS = [
    { value: 'all',          label: 'All' },
    { value: 'hiring',       label: '💼 Hiring' },
    { value: 'tip',          label: '💡 Tips' },
    { value: 'question',     label: '❓ Questions' },
    { value: 'achievement',  label: '🏆 Wins' },
    { value: 'feedback',     label: '⭐ Feedback' },
    { value: 'resource',     label: '📎 Resources' },
    { value: 'milestone',    label: '🎯 Milestones' },
    { value: 'announcement', label: '📢 News' },
    { value: 'poll',         label: '🗳️ Polls' },
  ];

  // Client-side filtering
  const visiblePosts = useMemo(() => {
    let list = posts;
    if (networkOnly) list = list.filter(p => String(p.authorId) === String(uid) || connectionIds.has(String(p.authorId)));
    if (activeHash)  list = list.filter(p => (p.hashtags || []).includes(activeHash));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        p.content?.toLowerCase().includes(q) ||
        p.authorName?.toLowerCase().includes(q) ||
        (p.hashtags || []).some(h => h.includes(q))
      );
    }
    return list;
  }, [posts, networkOnly, activeHash, search, uid, connectionIds]);

  const myPosts     = useMemo(() => posts.filter(p => String(p.authorId) === String(uid)), [posts, uid]);
  const myReactions = useMemo(() => posts.reduce((s, p) => s + (p.reactions?.filter(r => String(r.userId) === String(uid)).length || 0), 0), [posts, uid]);

  // Pull-to-refresh (mobile only)
  const pullStartY  = useRef(0);
  const [pullDist,  setPullDist]  = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const PULL_THRESHOLD = 64;

  const handleTouchStart = (e) => {
    if (!isMobile || window.scrollY > 0) return;
    // Don't treat taps on buttons/links/inputs (reactions, comments, etc.) as the
    // start of a pull-to-refresh gesture — incidental finger movement during a tap
    // was triggering a full feed reload.
    if (e.target.closest('button, a, input, textarea, [role="button"]')) return;
    pullStartY.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e) => {
    if (!isMobile || window.scrollY > 0 || pullStartY.current === 0) return;
    const dist = Math.max(0, Math.min(120, e.touches[0].clientY - pullStartY.current));
    if (dist > 8) setPullDist(dist);
  };
  const handleTouchEnd = async () => {
    if (pullDist >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDist(0);
      await loadPosts(1, filter);
      setRefreshing(false);
    } else {
      setPullDist(0);
    }
    pullStartY.current = 0;
  };

  const sharedPostProps = {
    userId: uid,
    userRole: user?.role,
    currentUser: user,
    connectionIds,
    pendingIds,
    onReact: handleReact,
    onAddComment: handleAddComment,
    onDeleteComment: handleDeleteComment,
    onDelete: handleDelete,
    onConnect: handleConnect,
    onToggleBookmark: handleToggleBookmark,
    onHashtagClick: handleHashtagClick,
    isMobile,
  };

  return (
    <div
      style={{ padding: isMobile ? '12px 0' : '20px clamp(12px,3vw,24px)', maxWidth: 1240, margin: '0 auto' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {isMobile && (pullDist > 0 || refreshing) && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: refreshing ? 48 : pullDist * 0.6, overflow: 'hidden', transition: refreshing ? 'none' : 'height 0.1s', marginTop: -8, marginBottom: 4 }}>
          <div style={{ width: 28, height: 28, border: '3px solid #E5E7EB', borderTopColor: '#0176D3', borderRadius: '50%', animation: refreshing || pullDist >= PULL_THRESHOLD ? 'tn-spin 0.7s linear infinite' : 'none', transform: refreshing ? 'none' : `rotate(${pullDist * 2.8}deg)`, opacity: Math.min(1, pullDist / PULL_THRESHOLD) }} />
        </div>
      )}
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: isMobile ? '0 12px' : 0, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 26, fontWeight: 900, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #0176D3 0%, #7C3AED 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Career Community</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#9CA3AF' }}>Share wins, hiring updates, career tips, and resources with your professional network</p>
        </div>
        <div />
      </div>

      {/* Tabs */}
      <div style={{ display: 'inline-flex', gap: 4, marginBottom: 14, marginLeft: isMobile ? 12 : 0, marginRight: isMobile ? 12 : 0, padding: 4, background: '#F1F5F9', borderRadius: 12 }}>
        {[
          { id: 'feed',  label: 'Feed' },
          { id: 'saved', label: `★ Saved (${savedCount})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '8px 20px', border: 'none', background: tab === t.id ? '#fff' : 'transparent', fontSize: 13, fontWeight: tab === t.id ? 800 : 600, color: tab === t.id ? '#0176D3' : '#6B7280', cursor: 'pointer', borderRadius: 9, transition: 'all 0.15s', boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'feed' && (
        <>
          {/* Filters row */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', padding: isMobile ? '0 12px 4px' : '0 0 4px', scrollbarWidth: 'none' }}>
            {/* My Network chip */}
            <button
              onClick={() => { setNetworkOnly(v => !v); setActiveHash(null); setSearch(''); }} className="tn-filter-chip"
              style={{ padding: '7px 16px', borderRadius: 20, border: `1.5px solid ${networkOnly ? '#059669' : '#D1D5DB'}`, background: networkOnly ? '#D1FAE5' : '#fff', color: networkOnly ? '#065F46' : '#374151', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.12s', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              🤝 My Network {networkOnly && connections.length > 0 && <span style={{ background: '#059669', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>{connections.length}</span>}
            </button>
            {FILTERS.map(f => (
              <button key={f.value} onClick={() => { setFilter(f.value); setActiveHash(null); setNetworkOnly(false); }} className="tn-filter-chip"
                style={{ padding: '7px 16px', borderRadius: 20, border: `1.5px solid ${filter === f.value && !activeHash && !networkOnly ? '#0176D3' : '#D1D5DB'}`, background: filter === f.value && !activeHash && !networkOnly ? '#EFF6FF' : '#fff', color: filter === f.value && !activeHash && !networkOnly ? '#1D4ED8' : '#374151', fontSize: 12, fontWeight: filter === f.value && !activeHash && !networkOnly ? 700 : 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.12s', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Active hashtag banner */}
          {activeHash && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '8px 14px', marginBottom: 14, marginLeft: isMobile ? 12 : 0, marginRight: isMobile ? 12 : 0 }}>
              <span style={{ fontSize: 13, color: '#1D4ED8', fontWeight: 600 }}>Filtering by {activeHash}</span>
              <button onClick={() => setActiveHash(null)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 16, lineHeight: 1, marginLeft: 'auto' }}>×</button>
            </div>
          )}
        </>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '220px 1fr 260px', gap: 16, alignItems: 'start' }}>
        {/* Left sidebar */}
        {!isMobile && tab === 'feed' && (
          <div style={{ position: 'sticky', top: 16 }}>
            <ProfileSidebar user={user} connectionCount={connections.length} />
            <QuickStats myPosts={myPosts.length} myReactions={myReactions} bookmarkCount={savedCount} />
          </div>
        )}
        {!isMobile && tab === 'saved' && <div />}

        {/* Feed */}
        <div style={{ padding: isMobile ? '0 12px' : 0 }}>
          {tab === 'feed' && (
            <>
              <SearchBar value={search} onChange={setSearch} />
              <CreatePost user={user} onCreate={handleCreate} isMobile={isMobile} />

              {loading ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9CA3AF' }}>
                  <div style={{ width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: '#0176D3', borderRadius: '50%', animation: 'tn-spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                  Loading feed…
                </div>
              ) : visiblePosts.length === 0 ? (
                <div style={{ ...card, textAlign: 'center', padding: '48px 24px', borderRadius: 16, border: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: 52, marginBottom: 14 }}>
                    {networkOnly ? '🤝' : '📭'}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#374151', marginBottom: 8 }}>
                    {networkOnly
                      ? connections.length === 0 ? 'Build your network first' : "Your connections haven't posted yet"
                      : isFiltered ? 'No posts match' : 'No posts yet'}
                  </div>
                  <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>
                    {networkOnly && connections.length === 0
                      ? 'Connect with colleagues from the "My Network" page and their posts will show here.'
                      : isFiltered ? 'Try a different filter or search.'
                      : 'Be the first — share a career update, job opening, or hiring tip!'}
                  </div>
                  {networkOnly && connections.length === 0 && (
                    <a href="/app/people" style={{ ...btnP, textDecoration: 'none', display: 'inline-block' }}>Find People to Connect</a>
                  )}
                </div>
              ) : (
                <>
                  {visiblePosts.map(post => (
                    <PostCard key={post._id} post={post} {...sharedPostProps} />
                  ))}
                  {hasMore && !isFiltered && (
                    <div style={{ textAlign: 'center', marginTop: 8, marginBottom: 16 }}>
                      <button onClick={() => loadPosts(page + 1, filter, true)} disabled={loadingMore}
                        style={{ ...btnG, padding: '10px 28px', fontSize: 13 }}>
                        {loadingMore ? 'Loading…' : 'Load more'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {tab === 'saved' && <SavedPostsView savedPosts={savedPosts} loadingSaved={loadingSaved} {...sharedPostProps} />}
        </div>

        {/* Right sidebar */}
        {!isMobile && (
          <div style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 0 }}>
            {tab === 'feed' && (
              <>
                <TrendingHashtags posts={posts} onHashtagClick={handleHashtagClick} activeHashtag={activeHash} />
                <PeoplePanel
                  posts={posts}
                  connectionIds={connectionIds}
                  pendingIds={pendingIds}
                  currentUserId={uid}
                  onConnect={handleConnect}
                  onViewProfile={handleViewProfile}
                />
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes tn-spin { to { transform: rotate(360deg); } }
        .tn-postcard { transition: box-shadow 0.15s, border-color 0.15s; }
        .tn-postcard:hover { box-shadow: 0 4px 16px rgba(15,23,42,0.06); border-color: #E5E7EB; }
        .tn-sidecard { transition: box-shadow 0.15s, transform 0.15s; }
        .tn-sidecard:hover { box-shadow: 0 6px 20px rgba(15,23,42,0.07); transform: translateY(-1px); }
        .tn-composer-btn { transition: background 0.15s, border-color 0.15s; }
        .tn-composer-btn:hover { background: #F1F5F9; border-color: #D1D5DB; }
        .tn-filter-chip { transition: transform 0.1s, box-shadow 0.1s; }
        .tn-filter-chip:hover { transform: translateY(-1px); box-shadow: 0 3px 8px rgba(0,0,0,0.08); }
      `}</style>
    </div>
  );
}
