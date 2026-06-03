import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import { card, btnP, btnG } from '../../constants/styles.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
const ROLE_COLOR = { admin: '#0176D3', recruiter: '#7C3AED', candidate: '#059669', super_admin: '#DC2626', superadmin: '#DC2626' };
const ROLE_LABEL = { admin: 'HR Admin', recruiter: 'Recruiter', candidate: 'Candidate', super_admin: 'Super Admin', superadmin: 'Super Admin' };
const REACTIONS  = [
  { type: 'like',       emoji: '👍', label: 'Like',       color: '#1D4ED8' },
  { type: 'celebrate',  emoji: '🎉', label: 'Celebrate',  color: '#059669' },
  { type: 'support',    emoji: '🤝', label: 'Support',    color: '#7C3AED' },
  { type: 'insightful', emoji: '💡', label: 'Insightful', color: '#D97706' },
];
const POST_TYPES = [
  { value: 'update',       label: '💬 Update' },
  { value: 'tip',          label: '💡 Pro Tip' },
  { value: 'question',     label: '❓ Ask Community' },
  { value: 'achievement',  label: '🏆 Achievement' },
  { value: 'hiring',       label: '💼 Hiring' },
  { value: 'milestone',    label: '🎯 Milestone' },
  { value: 'resource',     label: '📎 Resource' },
  { value: 'announcement', label: '📢 Announce' },
];
const POST_TYPE_STYLE = {
  tip:          { bg: '#FEF9C3', color: '#854D0E', label: '💡 Pro Tip' },
  question:     { bg: '#EDE9FE', color: '#6D28D9', label: '❓ Question' },
  achievement:  { bg: '#D1FAE5', color: '#065F46', label: '🏆 Achievement' },
  hiring:       { bg: '#DBEAFE', color: '#1E40AF', label: '💼 Hiring' },
  milestone:    { bg: '#FCE7F3', color: '#9D174D', label: '🎯 Milestone' },
  resource:     { bg: '#E0F2FE', color: '#0369A1', label: '📎 Resource' },
  announcement: { bg: '#FEF3C7', color: '#92400E', label: '📢 Announcement' },
  feedback:     { bg: '#F3F4F6', color: '#374151', label: '⭐ Feedback' },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (d < 60)     return 'just now';
  if (d < 3600)   return `${Math.floor(d / 60)}m ago`;
  if (d < 86400)  return `${Math.floor(d / 3600)}h ago`;
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function Avatar({ name, src, size = 40, role }) {
  const bg = ROLE_COLOR[role] || '#0176D3';
  if (src) return <img src={src} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${bg}22` }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.38, flexShrink: 0 }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

function RoleBadge({ role }) {
  const color = ROLE_COLOR[role] || '#374151';
  const label = ROLE_LABEL[role] || (role || 'Member');
  return <span style={{ fontSize: 10, fontWeight: 700, background: color + '18', color, borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>{label}</span>;
}

// ── Post Card (community-specific, lightweight) ────────────────────────────────
function CommunityPostCard({ post, userId, userRole, onReact, onDelete }) {
  const [showComments, setShowComments] = useState(false);
  const [comment,      setComment]      = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const isOwnPost = String(post.authorId) === String(userId);
  const isAdmin   = ['admin', 'super_admin', 'superadmin'].includes(userRole);
  const myReaction = post.reactions?.find(r => String(r.userId) === String(userId));
  const totalReactions = post.reactions?.length || 0;
  const totalComments  = post.comments?.length  || 0;
  const typeStyle = POST_TYPE_STYLE[post.postType];

  const handleSubmitComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await api.addComment(post._id, comment.trim());
      setComment('');
      // Refresh handled by parent
    } catch {}
    setSubmitting(false);
  };

  return (
    <div style={{ ...card, padding: '16px 18px', marginBottom: 10, borderRadius: 14, border: post.isPinned ? '1px solid #BFDBFE' : '1px solid #F1F5F9' }}>
      {post.isPinned && <div style={{ fontSize: 11, color: '#0176D3', fontWeight: 700, marginBottom: 8 }}>📌 Pinned</div>}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <Avatar name={post.authorName} src={post.authorAvatar} size={38} role={post.authorRole} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{post.authorName || 'Member'}</span>
            <RoleBadge role={post.authorRole} />
            {typeStyle && <span style={{ fontSize: 10, fontWeight: 700, background: typeStyle.bg, color: typeStyle.color, borderRadius: 4, padding: '2px 6px' }}>{typeStyle.label}</span>}
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>
            {post.authorTitle && <span>{post.authorTitle} · </span>}
            {timeAgo(post.createdAt)}
          </div>
        </div>
        {(isOwnPost || isAdmin) && (
          <button onClick={() => onDelete(post._id)} style={{ background: 'none', border: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 18, padding: '2px 6px', borderRadius: 4 }}
            onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
            onMouseLeave={e => e.currentTarget.style.color = '#D1D5DB'}>×</button>
        )}
      </div>

      {/* Content */}
      <div style={{ fontSize: 14, color: '#1F2937', lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 10 }}>
        {post.content}
      </div>

      {/* Images */}
      {post.images?.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: post.images.length === 1 ? '1fr' : '1fr 1fr', gap: 4, marginBottom: 10, borderRadius: 10, overflow: 'hidden' }}>
          {post.images.slice(0, 4).map((url, i) => (
            <img key={i} src={url} alt="" style={{ width: '100%', height: post.images.length === 1 ? 260 : 130, objectFit: 'cover' }} />
          ))}
        </div>
      )}

      {/* Hashtags */}
      {post.hashtags?.length > 0 && (
        <div style={{ marginBottom: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {post.hashtags.map(h => (
            <span key={h} style={{ fontSize: 12, color: '#0176D3', fontWeight: 600, cursor: 'pointer' }}>{h}</span>
          ))}
        </div>
      )}

      {/* Reaction bar */}
      <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>
        {(totalReactions > 0 || totalComments > 0) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>
            <span>{totalReactions > 0 ? `${totalReactions} reaction${totalReactions !== 1 ? 's' : ''}` : ''}</span>
            {totalComments > 0 && <span style={{ cursor: 'pointer' }} onClick={() => setShowComments(v => !v)}>{totalComments} comment{totalComments !== 1 ? 's' : ''}</span>}
          </div>
        )}
        <div style={{ display: 'flex', gap: 2 }}>
          {REACTIONS.map(r => (
            <button key={r.type} onClick={() => onReact(post._id, r.type)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: 'none', background: myReaction?.type === r.type ? '#EFF6FF' : 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: myReaction?.type === r.type ? 700 : 400, color: myReaction?.type === r.type ? (r.color || '#1D4ED8') : '#6B7280', transition: 'background 0.12s' }}>
              {r.emoji} <span style={{ display: window.innerWidth < 500 ? 'none' : 'inline' }}>{r.label}</span>
            </button>
          ))}
          <button onClick={() => setShowComments(v => !v)}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#6B7280' }}>
            💬 Comment
          </button>
        </div>

        {showComments && (
          <div style={{ marginTop: 12 }}>
            {post.comments?.map(c => (
              <div key={String(c._id)} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <Avatar name={c.userName} size={28} role="candidate" />
                <div style={{ flex: 1, background: '#F8FAFC', borderRadius: 10, padding: '8px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 3 }}>{c.userName || 'Member'}</div>
                  <div style={{ fontSize: 13, color: '#374151' }}>{c.content}</div>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Avatar name="Me" size={28} role="candidate" />
              <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Write a comment…"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); }}}
                  style={{ flex: 1, padding: '8px 14px', borderRadius: 20, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', background: '#F8FAFC' }} />
                <button onClick={handleSubmitComment} disabled={submitting || !comment.trim()}
                  style={{ padding: '8px 14px', borderRadius: 20, border: 'none', background: '#0176D3', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: comment.trim() ? 1 : 0.5 }}>
                  {submitting ? '…' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Create Post in Community ───────────────────────────────────────────────────
function CreateCommunityPost({ user, community, onCreate }) {
  const [text,      setText]      = useState('');
  const [postType,  setPostType]  = useState('update');
  const [expanded,  setExpanded]  = useState(false);
  const [submitting,setSubmitting] = useState(false);
  const bg = community?.coverColor || '#0176D3';

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await api.createPost({
        content      : text.trim(),
        postType,
        communityId  : community._id,
        communitySlug: community.slug,
      });
      setText('');
      setExpanded(false);
      setPostType('update');
      onCreate && onCreate();
    } catch (e) { alert(e?.message || 'Failed to post'); }
    setSubmitting(false);
  };

  return (
    <div style={{ ...card, padding: '14px 16px', marginBottom: 14, borderRadius: 14, border: `1px solid ${bg}22` }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Avatar name={user?.name} src={user?.avatarUrl} size={38} role={user?.role} />
        <div style={{ flex: 1 }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onFocus={() => setExpanded(true)}
            placeholder={`Share something with ${community?.name || 'the community'}…`}
            rows={expanded ? 3 : 1}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 14, resize: 'none', outline: 'none', background: '#F8FAFC', fontFamily: 'inherit', transition: 'border 0.15s', boxSizing: 'border-box' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = bg}
            onMouseLeave={e => { if (!expanded) e.currentTarget.style.borderColor = '#E5E7EB'; }}
          />
          {expanded && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 8 }}>
              <select value={postType} onChange={e => setPostType(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12, outline: 'none', background: '#F9FAFB', cursor: 'pointer' }}>
                {POST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setExpanded(false); setText(''); setPostType('update'); }}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={!text.trim() || submitting}
                  style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: text.trim() ? bg : '#E5E7EB', color: text.trim() ? '#fff' : '#9CA3AF', fontSize: 12, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}>
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

// ── Jobs Tab ──────────────────────────────────────────────────────────────────
function JobsTab({ jobs, loading }) {
  if (loading) return <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0' }}>Loading jobs…</div>;
  if (!jobs.length) return (
    <div style={{ ...card, textAlign: 'center', padding: '40px 24px', borderRadius: 14 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>💼</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#374151', marginBottom: 6 }}>No jobs right now</div>
      <div style={{ fontSize: 13, color: '#9CA3AF' }}>Relevant job openings will appear here automatically.</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {jobs.map(job => {
        const ctc = job.salaryMin && job.salaryMax
          ? `₹${Math.round(job.salaryMin / 100000)}L–₹${Math.round(job.salaryMax / 100000)}L`
          : job.salaryMin ? `₹${Math.round(job.salaryMin / 100000)}L+` : null;
        return (
          <div key={job._id} style={{ ...card, padding: '14px 16px', borderRadius: 12, border: '1px solid #F1F5F9' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0A1628', marginBottom: 4 }}>{job.title}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span>🏢 {job.companyName || job.company || 'Company'}</span>
              {job.location && <span>📍 {job.location}</span>}
              {job.jobType && <span>⏰ {job.jobType}</span>}
              {ctc && <span>💰 {ctc}</span>}
            </div>
            {job.skills?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {job.skills.slice(0, 5).map(s => (
                  <span key={s} style={{ fontSize: 11, background: '#EFF6FF', color: '#1D4ED8', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>{s}</span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Members Tab ───────────────────────────────────────────────────────────────
function MembersTab({ members, loading, total }) {
  if (loading) return <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0' }}>Loading members…</div>;
  if (!members.length) return (
    <div style={{ ...card, textAlign: 'center', padding: '40px 24px', borderRadius: 14 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
      <div style={{ fontWeight: 700, color: '#374151', marginBottom: 6 }}>No members yet</div>
      <div style={{ fontSize: 13, color: '#9CA3AF' }}>Be the first to join!</div>
    </div>
  );

  return (
    <div>
      {total > members.length && (
        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>{total} total members · showing {members.length}</div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
        {members.map(m => (
          <div key={String(m._id)} style={{ ...card, padding: '14px 12px', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6 }}>
            <Avatar name={m.name} src={m.avatarUrl || m.photoUrl} size={44} role={m.role} />
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{m.name || 'Member'}</div>
            <RoleBadge role={m.role} />
            {m.title && <div style={{ fontSize: 11, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{m.title}</div>}
            {m.location && <div style={{ fontSize: 10, color: '#9CA3AF' }}>📍 {m.location}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function CommunityDetailPage({ user }) {
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const [community, setCommunity] = useState(null);
  const [posts,     setPosts]     = useState([]);
  const [jobs,      setJobs]      = useState([]);
  const [members,   setMembers]   = useState([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [isMember,  setIsMember]  = useState(false);
  const [tab,       setTab]       = useState('posts');
  const [loading,   setLoading]   = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [jobsLoading,  setJobsLoading]  = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [joining,   setJoining]   = useState(false);
  const [seeding,   setSeeding]   = useState(false);
  const [seedMsg,   setSeedMsg]   = useState('');
  const [isMobile,  setMobile]    = useState(() => window.innerWidth < 768);
  const uid = String(user?.id || user?._id || '');

  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', h, { passive: true });
    return () => window.removeEventListener('resize', h);
  }, []);

  const loadCommunity = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getCommunity(slug);
      const c = r?.data;
      setCommunity(c);
      setIsMember(c?.isMember || false);
    } catch {}
    setLoading(false);
  }, [slug]);

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const r = await api.getCommunityFeed(slug);
      setPosts(r?.data || []);
    } catch {}
    setPostsLoading(false);
  }, [slug]);

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const r = await api.getCommunityJobs(slug);
      setJobs(r?.data || []);
    } catch {}
    setJobsLoading(false);
  }, [slug]);

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const r = await api.getCommunityMembers(slug);
      setMembers(r?.data || []);
      setTotalMembers(r?.total || 0);
    } catch {}
    setMembersLoading(false);
  }, [slug]);

  useEffect(() => { loadCommunity(); loadPosts(); }, [loadCommunity, loadPosts]);

  useEffect(() => {
    if (tab === 'jobs'    && !jobs.length)    loadJobs();
    if (tab === 'members' && !members.length) loadMembers();
  }, [tab]);

  const handleJoin = async () => {
    if (joining) return;
    setJoining(true);
    try {
      await api.joinCommunity(slug);
      setIsMember(true);
      setCommunity(c => c ? { ...c, memberCount: (c.memberCount || 0) + 1 } : c);
    } catch {}
    setJoining(false);
  };

  const handleLeave = async () => {
    if (joining) return;
    setJoining(true);
    try {
      await api.leaveCommunity(slug);
      setIsMember(false);
      setCommunity(c => c ? { ...c, memberCount: Math.max(0, (c.memberCount || 1) - 1) } : c);
    } catch {}
    setJoining(false);
  };

  const handleReact = async (postId, type) => {
    try {
      const r = await api.reactToPost(postId, type);
      if (r?.reactions) setPosts(prev => prev.map(p => p._id === postId ? { ...p, reactions: r.reactions } : p));
    } catch {}
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await api.deletePost(postId);
      setPosts(prev => prev.filter(p => p._id !== postId));
    } catch {}
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const r = await api.seedCommunityPosts(slug);
      setSeedMsg(r?.message || 'Posts seeded!');
      await loadPosts();
    } catch (e) { setSeedMsg('Failed: ' + e?.message); }
    setSeeding(false);
    setTimeout(() => setSeedMsg(''), 4000);
  };

  const bg = community?.coverColor || '#0176D3';
  const TABS = [
    { id: 'posts',   label: `💬 Posts` },
    { id: 'jobs',    label: `💼 Jobs` },
    { id: 'members', label: `👥 Members (${community?.memberCount || 0})` },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E5E7EB', borderTopColor: '#0176D3', borderRadius: '50%', animation: 'tn-spin 0.8s linear infinite' }} />
        <style>{`@keyframes tn-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!community) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
        <div style={{ fontWeight: 700, color: '#374151', marginBottom: 12 }}>Community not found</div>
        <button onClick={() => navigate(-1)} style={btnP}>← Back to Communities</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: isMobile ? '0 0 40px' : '20px 0 40px' }}>
      <style>{`@keyframes tn-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Back */}
      <button onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 12, padding: isMobile ? '0 12px' : 0 }}>
        ← Back to Communities
      </button>

      {/* Hero banner */}
      <div style={{ borderRadius: isMobile ? 0 : 16, overflow: 'hidden', marginBottom: 0, boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
        <div style={{ height: 130, background: `linear-gradient(135deg, ${bg} 0%, ${bg}bb 100%)`, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 20, right: 20, fontSize: 52, opacity: 0.25 }}>{community.icon}</div>
        </div>
        <div style={{ background: '#fff', padding: isMobile ? '0 16px 16px' : '0 24px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -28, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
              {community.icon}
            </div>
            <button
              onClick={isMember ? handleLeave : handleJoin}
              disabled={joining}
              style={{ padding: '9px 22px', borderRadius: 10, border: `2px solid ${isMember ? '#E5E7EB' : bg}`, background: isMember ? '#F9FAFB' : bg, color: isMember ? '#6B7280' : '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
              {joining ? '…' : isMember ? '✓ Joined' : '+ Join Community'}
            </button>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 900, fontSize: isMobile ? 18 : 22, color: '#0A1628', marginBottom: 4 }}>{community.name}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>{community.memberCount || 0} members · {community.category}</div>
            <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>{community.description}</div>
          </div>
          {/* Seed posts button (small, for generating content) */}
          {!postsLoading && posts.length < 3 && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={handleSeed} disabled={seeding}
                style={{ fontSize: 11, padding: '4px 12px', borderRadius: 6, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#6B7280', cursor: 'pointer' }}>
                {seeding ? '…' : '✨ Generate sample posts'}
              </button>
              {seedMsg && <span style={{ fontSize: 11, color: '#059669' }}>{seedMsg}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #F1F5F9', marginBottom: 16, padding: isMobile ? '0 12px' : 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '12px 18px', border: 'none', background: 'none', fontSize: 13, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? bg : '#6B7280', cursor: 'pointer', borderBottom: tab === t.id ? `2px solid ${bg}` : '2px solid transparent', marginBottom: -2, whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: isMobile ? '0 12px' : 0 }}>
        {tab === 'posts' && (
          <>
            <CreateCommunityPost user={user} community={community} onCreate={loadPosts} />
            {postsLoading ? (
              <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0' }}>
                <div style={{ width: 28, height: 28, border: '3px solid #E5E7EB', borderTopColor: bg, borderRadius: '50%', animation: 'tn-spin 0.8s linear infinite', margin: '0 auto 10px' }} />
                Loading posts…
              </div>
            ) : posts.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: '40px 24px', borderRadius: 14 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✍️</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#374151', marginBottom: 6 }}>No posts yet</div>
                <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>Be the first to share something with this community!</div>
                <button onClick={handleSeed} disabled={seeding} style={btnP}>{seeding ? '…' : '✨ Generate sample posts'}</button>
              </div>
            ) : (
              posts.map(post => (
                <CommunityPostCard
                  key={post._id}
                  post={post}
                  userId={uid}
                  userRole={user?.role}
                  onReact={handleReact}
                  onDelete={handleDelete}
                />
              ))
            )}
          </>
        )}

        {tab === 'jobs' && <JobsTab jobs={jobs} loading={jobsLoading} />}
        {tab === 'members' && <MembersTab members={members} loading={membersLoading} total={totalMembers} />}
      </div>
    </div>
  );
}
