import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../api/api.js';
import { card, btnP, btnG } from '../../constants/styles.js';

// ── helpers ───────────────────────────────────────────────────────────────────
function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)  return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function Avatar({ name, src, size = 40, role }) {
  const bg = { admin: '#0176D3', recruiter: '#7C3AED', candidate: '#059669', super_admin: '#DC2626', superadmin: '#DC2626' }[role] || '#0176D3';
  if (src) return <img src={src} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

function RoleBadge({ role }) {
  const cfg = {
    admin     : { label: 'HR Admin',    bg: '#EFF6FF', color: '#1D4ED8' },
    recruiter : { label: 'Recruiter',   bg: '#F5F3FF', color: '#7C3AED' },
    candidate : { label: 'Candidate',   bg: '#ECFDF5', color: '#059669' },
    super_admin:{ label: 'Super Admin', bg: '#FEF2F2', color: '#DC2626' },
    superadmin :{ label: 'Super Admin', bg: '#FEF2F2', color: '#DC2626' },
  }[role] || { label: role || 'Member', bg: '#F3F4F6', color: '#374151' };
  return <span style={{ fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.color, borderRadius: 4, padding: '2px 6px' }}>{cfg.label}</span>;
}

function PostTypeBadge({ type }) {
  const cfg = {
    achievement : { label: '🏆 Achievement', bg: '#FEF3C7', color: '#92400E' },
    milestone   : { label: '🎯 Milestone',   bg: '#D1FAE5', color: '#065F46' },
    hiring      : { label: '💼 Hiring',      bg: '#EFF6FF', color: '#1D4ED8' },
    announcement: { label: '📢 Announcement',bg: '#FEF2F2', color: '#991B1B' },
    resource    : { label: '💡 Resource',    bg: '#F5F3FF', color: '#6D28D9' },
    job_update  : { label: '📋 Job Update',  bg: '#ECFDF5', color: '#065F46' },
  }[type];
  if (!cfg) return null;
  return <span style={{ fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '2px 10px' }}>{cfg.label}</span>;
}

function ContentWithHashtags({ text }) {
  const parts = text.split(/(#[a-zA-Z0-9_]+)/g);
  return (
    <span>
      {parts.map((p, i) =>
        p.startsWith('#')
          ? <span key={i} style={{ color: '#0176D3', fontWeight: 600, cursor: 'pointer' }}>{p}</span>
          : <span key={i}>{p}</span>
      )}
    </span>
  );
}

const REACTIONS = [
  { type: 'like',        emoji: '👍', label: 'Like' },
  { type: 'celebrate',   emoji: '🎉', label: 'Celebrate' },
  { type: 'support',     emoji: '💙', label: 'Support' },
  { type: 'insightful',  emoji: '💡', label: 'Insightful' },
];

function ReactionBar({ post, userId, onReact }) {
  const [showPicker, setShowPicker] = useState(false);
  const timerRef = useRef(null);
  const myReaction = post.reactions?.find(r => String(r.userId) === String(userId));
  const counts = {};
  (post.reactions || []).forEach(r => { counts[r.type] = (counts[r.type] || 0) + 1; });
  const totalReactions = post.reactions?.length || 0;
  const totalComments  = post.comments?.length || 0;

  const handleReact = (type) => {
    setShowPicker(false);
    onReact(post._id, type);
  };

  return (
    <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 12, paddingTop: 10 }}>
      {totalReactions > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          {Object.entries(counts).map(([type, count]) => {
            const r = REACTIONS.find(r => r.type === type);
            return r ? <span key={type} style={{ fontSize: 12, color: '#6B7280' }}>{r.emoji} {count}</span> : null;
          })}
          {totalReactions > 0 && <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 4 }}>{totalReactions} reaction{totalReactions !== 1 ? 's' : ''}</span>}
          {totalComments > 0 && <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 'auto' }}>{totalComments} comment{totalComments !== 1 ? 's' : ''}</span>}
        </div>
      )}
      <div style={{ display: 'flex', gap: 4, position: 'relative' }}>
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => { clearTimeout(timerRef.current); setShowPicker(true); }}
          onMouseLeave={() => { timerRef.current = setTimeout(() => setShowPicker(false), 300); }}
        >
          <button
            onClick={() => handleReact(myReaction?.type === 'like' ? 'like' : 'like')}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 20, border: `1px solid ${myReaction ? '#BFDBFE' : '#E5E7EB'}`, background: myReaction ? '#EFF6FF' : 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: myReaction ? '#1D4ED8' : '#6B7280' }}>
            {myReaction ? REACTIONS.find(r => r.type === myReaction.type)?.emoji || '👍' : '👍'} {myReaction ? REACTIONS.find(r => r.type === myReaction.type)?.label || 'Like' : 'Like'}
          </button>
          {showPicker && (
            <div style={{ position: 'absolute', bottom: '110%', left: 0, display: 'flex', gap: 4, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 24, padding: '6px 10px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', zIndex: 100 }}>
              {REACTIONS.map(r => (
                <button key={r.type} title={r.label} onClick={() => handleReact(r.type)}
                  style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', borderRadius: '50%', padding: '2px 4px', transition: 'transform 0.15s', lineHeight: 1 }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.35)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                  {r.emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 20, border: '1px solid #E5E7EB', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#6B7280' }}>
          💬 Comment
        </button>
      </div>
    </div>
  );
}

function CommentSection({ post, userId, onAddComment, onDeleteComment }) {
  const [text, setText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const comments = post.comments || [];
  const visible  = expanded ? comments : comments.slice(-2);

  const submit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    await onAddComment(post._id, text.trim());
    setText('');
    setSubmitting(false);
  };

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F8FAFC' }}>
      {comments.length > 2 && !expanded && (
        <button onClick={() => setExpanded(true)} style={{ background: 'none', border: 'none', color: '#0176D3', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>
          View all {comments.length} comments
        </button>
      )}
      {visible.map(c => (
        <div key={String(c._id)} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <Avatar name={c.userName} src={c.userAvatar} size={30} role={c.userRole} />
          <div style={{ flex: 1 }}>
            <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '8px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0A1628' }}>{c.userName || 'Member'}</span>
                <RoleBadge role={c.userRole} />
              </div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{c.content}</div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 3 }}>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>{timeAgo(c.createdAt)}</span>
              {(String(c.userId) === String(userId)) && (
                <button onClick={() => onDeleteComment(post._id, String(c._id))}
                  style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 11, cursor: 'pointer', padding: 0 }}>Delete</button>
              )}
            </div>
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <div style={{ width: 30, flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', gap: 6 }}>
          <input value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submit()}
            placeholder="Add a comment…"
            style={{ flex: 1, padding: '8px 12px', borderRadius: 20, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', background: '#F8FAFC' }} />
          <button onClick={submit} disabled={!text.trim() || submitting}
            style={{ padding: '8px 14px', borderRadius: 20, border: 'none', background: text.trim() ? '#0176D3' : '#E5E7EB', color: text.trim() ? '#fff' : '#9CA3AF', fontSize: 12, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default' }}>
            Post
          </button>
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, userId, userRole, onReact, onAddComment, onDeleteComment, onDelete }) {
  const [showComments, setShowComments] = useState(false);
  const isOwnPost = String(post.authorId) === String(userId);
  const isAdmin   = ['admin', 'super_admin', 'superadmin'].includes(userRole);

  return (
    <div style={{ ...card, padding: '18px 20px', marginBottom: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <Avatar name={post.authorName} src={post.authorAvatar} size={44} role={post.authorRole} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#0A1628' }}>{post.authorName || 'Member'}</span>
            <RoleBadge role={post.authorRole} />
            {post.postType !== 'update' && <PostTypeBadge type={post.postType} />}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>
            {post.authorTitle || ''}{post.authorTitle ? ' · ' : ''}{timeAgo(post.createdAt)}
          </div>
        </div>
        {(isOwnPost || isAdmin) && (
          <button onClick={() => onDelete(post._id)}
            style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 4px', borderRadius: 4 }}
            title="Delete post">×</button>
        )}
      </div>

      {/* Content */}
      <div style={{ fontSize: 14, color: '#1F2937', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        <ContentWithHashtags text={post.content} />
      </div>

      {post.images?.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {post.images.map((img, i) => (
            <img key={i} src={img} alt="" style={{ maxWidth: '100%', borderRadius: 10, maxHeight: 400, objectFit: 'cover', cursor: 'pointer' }} />
          ))}
        </div>
      )}

      {/* Reaction bar */}
      <div onClick={e => { if (e.target.textContent === '💬 Comment') setShowComments(v => !v); }}>
        <ReactionBar post={post} userId={userId} onReact={onReact} />
      </div>

      {/* Comments */}
      {showComments && (
        <CommentSection post={post} userId={userId} onAddComment={onAddComment} onDeleteComment={onDeleteComment} />
      )}
    </div>
  );
}

function CreatePost({ user, onCreate }) {
  const [text, setText] = useState('');
  const [postType, setPostType] = useState('update');
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const submit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onCreate({ content: text.trim(), postType });
      setText(''); setPostType('update'); setExpanded(false);
    } finally {
      setSubmitting(false);
    }
  };

  const POST_TYPES = [
    { value: 'update',       label: '💬 Update' },
    { value: 'achievement',  label: '🏆 Achievement' },
    { value: 'milestone',    label: '🎯 Milestone' },
    { value: 'hiring',       label: '💼 Hiring' },
    { value: 'announcement', label: '📢 Announce' },
    { value: 'resource',     label: '💡 Resource' },
  ];

  return (
    <div style={{ ...card, padding: '16px 18px', marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Avatar name={user?.name} src={user?.avatarUrl} size={40} role={user?.role} />
        <div style={{ flex: 1 }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onFocus={() => setExpanded(true)}
            placeholder={`Share something with your team, ${user?.name?.split(' ')[0] || 'there'}…`}
            rows={expanded ? 4 : 2}
            maxLength={3000}
            style={{ width: '100%', resize: 'none', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', lineHeight: 1.6, background: '#F8FAFC', boxSizing: 'border-box', transition: 'border 0.15s' }}
            onFocusCapture={e => e.currentTarget.style.border = '1px solid #0176D3'}
            onBlurCapture={e => e.currentTarget.style.border = '1px solid #E5E7EB'}
          />
          {expanded && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {POST_TYPES.map(t => (
                  <button key={t.value} onClick={() => setPostType(t.value)}
                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, border: `1px solid ${postType === t.value ? '#0176D3' : '#E5E7EB'}`, background: postType === t.value ? '#EFF6FF' : '#F9FAFB', color: postType === t.value ? '#1D4ED8' : '#6B7280', cursor: 'pointer', fontWeight: 600 }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: text.length > 2700 ? '#EF4444' : '#9CA3AF' }}>{text.length}/3000</span>
                <button onClick={() => { setExpanded(false); setText(''); }} style={btnG}>Cancel</button>
                <button onClick={submit} disabled={!text.trim() || submitting}
                  style={{ ...btnP, opacity: (!text.trim() || submitting) ? 0.6 : 1 }}>
                  {submitting ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileSidebar({ user }) {
  const bg = { admin: '#0176D3', recruiter: '#7C3AED', candidate: '#059669', super_admin: '#DC2626', superadmin: '#DC2626' }[user?.role] || '#0176D3';
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ height: 64, background: `linear-gradient(135deg, ${bg}, ${bg}88)` }} />
      <div style={{ padding: '0 16px 16px', marginTop: -28 }}>
        <Avatar name={user?.name} src={user?.avatarUrl} size={56} role={user?.role} />
        <div style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0A1628' }}>{user?.name || 'You'}</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{user?.title || user?.role || 'TalentNest Member'}</div>
          <RoleBadge role={user?.role} />
        </div>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F1F5F9', fontSize: 12, color: '#6B7280' }}>
          {user?.email || ''}
        </div>
      </div>
    </div>
  );
}

function QuickStats({ posts }) {
  const myPosts   = posts?.length || 0;
  const reactions = posts?.reduce((s, p) => s + (p.reactions?.length || 0), 0) || 0;
  return (
    <div style={{ ...card, padding: '12px 16px', marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Your activity</div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0176D3' }}>{myPosts}</div>
          <div style={{ fontSize: 11, color: '#6B7280' }}>Posts</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>{reactions}</div>
          <div style={{ fontSize: 11, color: '#6B7280' }}>Reactions</div>
        </div>
      </div>
    </div>
  );
}

function TrendingHashtags({ posts }) {
  const counts = {};
  (posts || []).forEach(p => (p.hashtags || []).forEach(h => { counts[h] = (counts[h] || 0) + 1; }));
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (!sorted.length) return null;
  return (
    <div style={{ ...card, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Trending topics</div>
      {sorted.map(([tag, count]) => (
        <div key={tag} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: '#0176D3', fontWeight: 600 }}>{tag}</span>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>{count} post{count !== 1 ? 's' : ''}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CommunityFeed({ user }) {
  const [posts, setPosts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(true);
  const [filter, setFilter]       = useState('all');
  const [seeding, setSeeding]     = useState(false);
  const [seedMsg, setSeedMsg]     = useState('');
  const [isMobile, setMobile]     = useState(window.innerWidth < 900);

  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 900);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const loadPosts = useCallback(async (p = 1, type = 'all', append = false) => {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const r = await api.getPosts({ page: p, limit: 15, ...(type !== 'all' ? { type } : {}) });
      const items = r?.data || [];
      setPosts(prev => append ? [...prev, ...items] : items);
      setHasMore(r?.hasMore ?? false);
      setPage(p);
    } finally {
      setLoading(false); setLoadingMore(false);
    }
  }, []);

  useEffect(() => { loadPosts(1, filter); }, [filter, loadPosts]);

  const handleCreate = async (data) => {
    await api.createPost(data);
    loadPosts(1, filter);
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    await api.deletePost(postId);
    setPosts(prev => prev.filter(p => p._id !== postId));
  };

  const handleReact = async (postId, type) => {
    const r = await api.reactToPost(postId, type);
    if (r?.reactions) setPosts(prev => prev.map(p => p._id === postId ? { ...p, reactions: r.reactions } : p));
  };

  const handleAddComment = async (postId, content) => {
    const r = await api.addComment(postId, content);
    if (r?.comment) setPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: [...(p.comments || []), r.comment] } : p));
  };

  const handleDeleteComment = async (postId, commentId) => {
    await api.deleteComment(postId, commentId);
    setPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: (p.comments || []).filter(c => String(c._id) !== commentId) } : p));
  };

  const handleSeed = async () => {
    setSeeding(true); setSeedMsg('');
    try {
      const r = await api.seedTestData();
      setSeedMsg(r?.message || 'Done!');
      loadPosts(1, filter);
    } catch (e) {
      setSeedMsg(e?.message || 'Seed failed.');
    }
    setSeeding(false);
  };

  const isAdmin = ['admin', 'super_admin', 'superadmin'].includes(user?.role);

  const FILTERS = [
    { value: 'all',          label: '🌐 All' },
    { value: 'update',       label: '💬 Updates' },
    { value: 'achievement',  label: '🏆 Achievements' },
    { value: 'hiring',       label: '💼 Hiring' },
    { value: 'resource',     label: '💡 Resources' },
    { value: 'milestone',    label: '🎯 Milestones' },
  ];

  const myPosts = posts.filter(p => String(p.authorId) === String(user?.id || user?._id));

  return (
    <div style={{ padding: isMobile ? '12px 0' : '24px clamp(12px,3vw,24px)', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 12px' : 0 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#0A1628' }}>Community Feed</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>Stay connected with your team and discover what's happening</p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {seedMsg && <span style={{ fontSize: 12, color: '#059669' }}>{seedMsg}</span>}
            <button onClick={handleSeed} disabled={seeding}
              style={{ ...btnG, fontSize: 12 }}>
              {seeding ? 'Creating…' : '+ Test Data'}
            </button>
          </div>
        )}
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', padding: isMobile ? '0 12px 4px' : '0 0 4px', scrollbarWidth: 'none' }}>
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${filter === f.value ? '#0176D3' : '#E5E7EB'}`, background: filter === f.value ? '#EFF6FF' : '#F9FAFB', color: filter === f.value ? '#1D4ED8' : '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '220px 1fr 240px', gap: 16, alignItems: 'start' }}>
        {/* Left sidebar */}
        {!isMobile && (
          <div style={{ position: 'sticky', top: 16 }}>
            <ProfileSidebar user={user} />
            <QuickStats posts={myPosts} />
          </div>
        )}

        {/* Feed center */}
        <div>
          <CreatePost user={user} onCreate={handleCreate} />

          {loading ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
              Loading feed…
            </div>
          ) : posts.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#374151', marginBottom: 8 }}>
                {filter === 'all' ? 'No posts yet' : `No ${filter} posts yet`}
              </div>
              <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>
                Be the first to share something with your team!
              </div>
              {isAdmin && (
                <button onClick={handleSeed} disabled={seeding} style={btnP}>
                  {seeding ? 'Creating sample posts…' : '🌱 Create sample posts'}
                </button>
              )}
            </div>
          ) : (
            <>
              {posts.map(post => (
                <PostCard
                  key={post._id}
                  post={post}
                  userId={user?.id || user?._id}
                  userRole={user?.role}
                  onReact={handleReact}
                  onAddComment={handleAddComment}
                  onDeleteComment={handleDeleteComment}
                  onDelete={handleDelete}
                />
              ))}
              {hasMore && (
                <div style={{ textAlign: 'center', marginTop: 8, marginBottom: 16 }}>
                  <button onClick={() => loadPosts(page + 1, filter, true)} disabled={loadingMore}
                    style={{ ...btnG, padding: '10px 28px' }}>
                    {loadingMore ? 'Loading…' : 'Load more posts'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right sidebar */}
        {!isMobile && (
          <div style={{ position: 'sticky', top: 16 }}>
            <TrendingHashtags posts={posts} />
          </div>
        )}
      </div>
    </div>
  );
}
