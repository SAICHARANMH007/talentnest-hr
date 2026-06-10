import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

function PostTypeBadge({ type }) {
  const cfg = {
    achievement : { label: '🏆 Achievement',   bg: '#FEF3C7', color: '#92400E' },
    milestone   : { label: '🎯 Milestone',     bg: '#D1FAE5', color: '#065F46' },
    hiring      : { label: '💼 Hiring',        bg: '#EFF6FF', color: '#1D4ED8' },
    announcement: { label: '📢 Announcement',  bg: '#FEF2F2', color: '#991B1B' },
    resource    : { label: '📎 Resource',      bg: '#F5F3FF', color: '#6D28D9' },
    tip         : { label: '💡 Pro Tip',       bg: '#FFFBEB', color: '#B45309' },
    feedback    : { label: '⭐ Feedback',       bg: '#F0FDF4', color: '#166534' },
    question    : { label: '❓ Question',       bg: '#EFF6FF', color: '#1E40AF' },
  }[type];
  if (!cfg) return null;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 10px' }}>
      {cfg.label}
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

  return (
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
    </div>
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

  return (
    <div id={post._id} style={{ ...card, padding: '18px 20px', marginBottom: 10, borderRadius: 14, border: post.isPinned ? '1px solid #BFDBFE' : '1px solid #F1F5F9', position: 'relative' }}>
      {/* Report modal */}
      {showReport && (
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
        </div>
      )}

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

// ── Create Post ────────────────────────────────────────────────────────────────
function CreatePost({ user, onCreate }) {
  const [text,       setText]       = useState('');
  const [postType,   setPostType]   = useState('update');
  const [submitting, setSubmitting] = useState(false);
  const [expanded,   setExpanded]   = useState(false);
  const [images,     setImages]     = useState([]);
  const [uploading,  setUploading]  = useState(false);
  const [uploadErr,  setUploadErr]  = useState('');
  const [mentions,   setMentions]   = useState([]); // [{ userId, name }]
  const mentionAc = useMentionAutocomplete();
  const fileRef = useRef(null);
  const textareaRef = useRef(null);

  const POST_TYPES = [
    { value: 'update',        label: '💬 Update',        color: '#0176D3' },
    { value: 'tip',           label: '💡 Pro Tip',        color: '#D97706' },
    { value: 'question',      label: '❓ Ask Community',  color: '#7C3AED' },
    { value: 'achievement',   label: '🏆 Achievement',    color: '#B45309' },
    { value: 'hiring',        label: '💼 Hiring',         color: '#059669' },
    { value: 'feedback',      label: '⭐ Feedback',       color: '#DB2777' },
    { value: 'resource',      label: '📎 Resource',       color: '#0891B2' },
    { value: 'milestone',     label: '🎯 Milestone',      color: '#DC2626' },
    { value: 'announcement',  label: '📢 Announce',       color: '#1D4ED8' },
  ];
  const activeType = POST_TYPES.find(t => t.value === postType) || POST_TYPES[0];

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

  const submit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const activeMentionIds = mentions
        .filter(m => text.includes(`@[${m.name}](${m.userId})`))
        .map(m => m.userId);
      await onCreate({ content: text.trim(), postType, images, mentions: activeMentionIds });
      setText(''); setPostType('update'); setExpanded(false); setImages([]); setMentions([]); mentionAc.close();
    } finally { setSubmitting(false); }
  };

  const charLeft = 3000 - text.length;

  return (
    <div style={{ ...card, padding: 0, marginBottom: 12, borderRadius: 16, border: `1px solid ${expanded ? activeType.color + '33' : '#F1F5F9'}`, overflow: 'hidden', transition: 'border-color 0.2s' }}>
      {/* Accent header bar — only shown while composing */}
      {expanded && (
        <div style={{ background: `linear-gradient(135deg, ${activeType.color} 0%, ${activeType.color}cc 100%)`, padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '0.02em' }}>✨ Create a Post</span>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.18)', borderRadius: 20, padding: '2px 10px' }}>{activeType.label}</span>
        </div>
      )}
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Avatar name={user?.name} src={user?.avatarUrl} size={42} role={user?.role} />
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              placeholder={`Share a career update, tip, or hiring news, ${user?.name?.split(' ')[0] || 'there'}… (use @ to mention someone)`}
              rows={expanded ? 4 : 2}
              maxLength={3000}
              style={{ width: '100%', resize: 'none', border: '1px solid #E5E7EB', borderRadius: 12, padding: '11px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', lineHeight: 1.65, background: '#FAFBFC', boxSizing: 'border-box', transition: 'border 0.15s, box-shadow 0.15s' }}
              onFocus={e => { e.currentTarget.style.border = `1px solid ${activeType.color}`; e.currentTarget.style.boxShadow = `0 0 0 3px ${activeType.color}1a`; setExpanded(true); }}
              onBlur={e => { e.currentTarget.style.border = '1px solid #E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }}
            />
            <MentionDropdown suggestions={mentionAc.suggestions} searching={mentionAc.searching} onSelect={selectMention} />
            {expanded && (
              <div style={{ marginTop: 12 }}>
                {/* Post type chips */}
                <div style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Post type</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    {POST_TYPES.map(t => (
                      <button key={t.value} onClick={() => setPostType(t.value)}
                        style={{ fontSize: 11, padding: '5px 13px', borderRadius: 20, border: `1px solid ${postType === t.value ? t.color : '#E5E7EB'}`, background: postType === t.value ? `${t.color}15` : '#F9FAFB', color: postType === t.value ? t.color : '#6B7280', cursor: 'pointer', fontWeight: 700, transition: 'all 0.12s' }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image previews */}
                {images.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(images.length, 4)}, 1fr)`, gap: 8, marginBottom: 12 }}>
                    {images.map((img, i) => (
                      <div key={i} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB', aspectRatio: '1 / 1' }}>
                        <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <button onClick={() => removeImage(i)}
                          style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(17,24,39,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: 24, height: 24, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0, backdropFilter: 'blur(2px)' }}>
                          ×
                        </button>
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
                  <div style={{ marginBottom: 12, fontSize: 12, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '8px 12px', fontWeight: 600 }}>
                    ⚠️ {uploadErr}
                  </div>
                )}

                {/* Toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                      onClick={() => { setUploadErr(''); fileRef.current?.click(); }}
                      disabled={images.length >= 4 || uploading}
                      style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#374151', fontSize: 12, fontWeight: 700, cursor: images.length >= 4 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, opacity: images.length >= 4 ? 0.5 : 1 }}>
                      📷 {uploading ? 'Uploading…' : `Photo${images.length > 0 ? ` (${images.length}/4)` : ''}`}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImageSelect} style={{ display: 'none' }} />
                    <span style={{ fontSize: 11, color: charLeft < 200 ? '#EF4444' : '#9CA3AF' }}>
                      {charLeft < 500 ? `${charLeft} left` : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setExpanded(false); setText(''); setImages([]); setUploadErr(''); }} style={{ ...btnG, fontSize: 12, padding: '7px 14px' }}>Cancel</button>
                    <button onClick={submit} disabled={!text.trim() || submitting}
                      style={{ ...btnP, background: activeType.color, fontSize: 13, padding: '7px 20px', opacity: (!text.trim() || submitting) ? 0.6 : 1 }}>
                      {submitting ? 'Posting…' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sidebars ───────────────────────────────────────────────────────────────────
function ProfileSidebar({ user, connectionCount }) {
  const bg = ROLE_COLOR[user?.role] || '#0176D3';
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 12, borderRadius: 14, border: '1px solid #F1F5F9' }}>
      <div style={{ height: 70, background: `linear-gradient(135deg, ${bg} 0%, ${bg}99 100%)` }} />
      <div style={{ padding: '0 16px 16px', marginTop: -32 }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', border: '3px solid #fff', overflow: 'hidden', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22, color: '#fff' }}>
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
          <span style={{ fontSize: 20, fontWeight: 900, color: '#0176D3' }}>{connectionCount}</span>
          <span style={{ fontSize: 12, color: '#6B7280' }}>connection{connectionCount !== 1 ? 's' : ''}</span>
        </div>
        {user?.email && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.email}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickStats({ myPosts, myReactions, bookmarkCount }) {
  const stats = [
    { label: 'Posts',     value: myPosts,     color: '#0176D3' },
    { label: 'Reactions', value: myReactions,  color: '#7C3AED' },
    { label: 'Saved',     value: bookmarkCount,color: '#F59E0B' },
  ];
  return (
    <div style={{ ...card, padding: '14px 16px', marginBottom: 12, borderRadius: 14, border: '1px solid #F1F5F9' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Activity</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
        {stats.map(s => (
          <div key={s.label} style={{ textAlign: 'center', padding: '6px 4px' }}>
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
    <div style={{ ...card, padding: '14px 16px', marginBottom: 12, borderRadius: 14, border: '1px solid #F1F5F9' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Trending Topics</div>
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
    <div style={{ ...card, padding: '14px 16px', borderRadius: 14, border: '1px solid #F1F5F9' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Grow Your Network</div>
      {people.map(p => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div onClick={() => onViewProfile?.(p.id)} style={{ cursor: 'pointer', flexShrink: 0 }}>
            <Avatar name={p.name} src={p.avatar} size={34} role={p.role} />
          </div>
          <div onClick={() => onViewProfile?.(p.id)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name || 'Member'}</div>
            <div style={{ fontSize: 10, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title || ROLE_LABEL[p.role] || 'Member'}</div>
          </div>
          <button
            onClick={() => onConnect(p.id)}
            disabled={pendingIds.has(p.id)}
            style={{ padding: '3px 10px', borderRadius: 20, border: `1px solid ${pendingIds.has(p.id) ? '#D1D5DB' : '#0176D3'}`, background: 'transparent', color: pendingIds.has(p.id) ? '#9CA3AF' : '#0176D3', fontSize: 11, fontWeight: 700, cursor: pendingIds.has(p.id) ? 'default' : 'pointer', flexShrink: 0 }}>
            {pendingIds.has(p.id) ? '✓' : '+'}
          </button>
        </div>
      ))}
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

  // Silent background refresh every 60s — catches any events missed by the socket
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible' && tab === 'feed' && !isFiltered) {
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
    await api.createPost(data);
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
          <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 26, fontWeight: 900, color: '#0A1628', letterSpacing: '-0.02em' }}>Career Community</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#9CA3AF' }}>Share wins, hiring updates, career tips, and resources with your professional network</p>
        </div>
        <div />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 14, padding: isMobile ? '0 12px' : 0, borderBottom: '2px solid #E5E7EB' }}>
        {[
          { id: 'feed',  label: 'Feed' },
          { id: 'saved', label: `★ Saved (${savedCount})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '10px 20px', border: 'none', background: tab === t.id ? 'rgba(1,118,211,0.06)' : 'transparent', fontSize: 13, fontWeight: tab === t.id ? 700 : 600, color: tab === t.id ? '#0176D3' : '#374151', cursor: 'pointer', borderBottom: tab === t.id ? '2px solid #0176D3' : '2px solid transparent', marginBottom: -2, transition: 'all 0.15s', borderRadius: '8px 8px 0 0' }}>
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
              onClick={() => { setNetworkOnly(v => !v); setActiveHash(null); setSearch(''); }}
              style={{ padding: '7px 16px', borderRadius: 20, border: `1.5px solid ${networkOnly ? '#059669' : '#D1D5DB'}`, background: networkOnly ? '#D1FAE5' : '#fff', color: networkOnly ? '#065F46' : '#374151', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.12s', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              🤝 My Network {networkOnly && connections.length > 0 && <span style={{ background: '#059669', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>{connections.length}</span>}
            </button>
            {FILTERS.map(f => (
              <button key={f.value} onClick={() => { setFilter(f.value); setActiveHash(null); setNetworkOnly(false); }}
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
              <CreatePost user={user} onCreate={handleCreate} />

              {loading ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9CA3AF' }}>
                  <div style={{ width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: '#0176D3', borderRadius: '50%', animation: 'tn-spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                  Loading feed…
                </div>
              ) : visiblePosts.length === 0 ? (
                <div style={{ ...card, textAlign: 'center', padding: '48px 24px', borderRadius: 14, border: '1px solid #F1F5F9' }}>
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

      <style>{`@keyframes tn-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
