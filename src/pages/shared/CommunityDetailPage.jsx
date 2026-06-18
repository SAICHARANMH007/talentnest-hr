import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import { card, btnP, btnG } from '../../constants/styles.js';
import { usePlatformEvents } from '../../hooks/usePlatformSocket.js';
import { StarRating, ReviewCard, SubmitReviewForm } from './CompanyReviewsPage.jsx';

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
const POST_TYPE_ACCENT = {
  hiring: '#059669', tip: '#D97706', question: '#7C3AED', achievement: '#B45309',
  feedback: '#DB2777', resource: '#0891B2', milestone: '#DC2626',
  announcement: '#2563EB', poll: '#5B21B6',
};

function PostTypeBanner({ post }) {
  const type = post?.postType;
  if (!type || type === 'update') return null;
  const content     = post.content || '';
  const isUrgent    = type === 'announcement' && content.startsWith('🚨');
  const isImportant = type === 'announcement' && content.startsWith('⚡');
  const starMatch   = type === 'feedback' ? content.match(/^(⭐+)/) : null;
  const starCount   = starMatch ? Math.min(starMatch[1].length, 5) : 0;
  const STAR_LABEL  = ['','Poor','Fair','Good','Great','Excellent'];
  const STAR_COLOR  = ['','#DC2626','#D97706','#059669','#0176D3','#7C3AED'];
  const jobTitle    = post.jobDetails?.title;
  const jobCompany  = post.jobDetails?.company;
  const jobLocation = post.jobDetails?.location;
  const pollQ       = post.poll?.question;
  const optCount    = post.poll?.options?.length || 0;
  const firstLine   = content.split('\n').map(l => l.trim()).find(l => l.length > 3 && !l.startsWith('#')) || '';
  const shortFirst  = (s, max = 60) => s.length > max ? s.slice(0, max).trimEnd() + '…' : s;

  const CFG = {
    hiring:      { gradient:'linear-gradient(135deg,#10B981 0%,#059669 100%)', icon:'🚀', title:"We're Hiring!", sub: jobTitle?`${jobTitle}${jobCompany?` · ${jobCompany}`:''}${jobLocation?` · 📍 ${jobLocation}`:''}` :'Your next big move is right here.', pill:'💼 HIRING' },
    tip:         { gradient:'linear-gradient(135deg,#FBBF24 0%,#D97706 100%)', icon:'💡', title:'Pro Tip',          sub: firstLine?shortFirst(firstLine):'Bookmark this. Your career will thank you.', pill:'🔥 HOT TIP' },
    question:    { gradient:'linear-gradient(135deg,#A78BFA 0%,#7C3AED 100%)', icon:'🤔', title:'Got a Question?',  sub: firstLine?shortFirst(firstLine):'Drop your wisdom in the comments ↓', pill:'💬 ASK' },
    achievement: { gradient:'linear-gradient(135deg,#FBBF24 0%,#B45309 100%)', icon:'🏆', title:'Big W!',           sub: firstLine?shortFirst(firstLine):'This one deserves the spotlight.', pill:'🎉 WIN' },
    feedback:    { gradient: 'linear-gradient(135deg,#F472B6 0%,#DB2777 100%)', icon:'⭐', title: starCount>0?`${starCount}/5 — ${STAR_LABEL[starCount]}`:'Honest Review', sub: starCount>0?`${STAR_LABEL[starCount]} experience — community rated`:'No filters. No fluff. Just real feedback.', pill: starCount>0?'⭐'.repeat(starCount):'📝 REVIEW' },
    resource:    { gradient:'linear-gradient(135deg,#22D3EE 0%,#0891B2 100%)', icon:'🔥', title:'Resource Drop',    sub: firstLine?shortFirst(firstLine):"Save this. It's worth your time.", pill:'📚 READ' },
    milestone:   { gradient:'linear-gradient(135deg,#F87171 0%,#DC2626 100%)', icon:'🎯', title:'Milestone Alert!', sub: firstLine?shortFirst(firstLine):'Level unlocked. This is huge. 🔓', pill:'🏅 NEW' },
    announcement:{ gradient: isUrgent?'linear-gradient(135deg,#F87171 0%,#DC2626 100%)':isImportant?'linear-gradient(135deg,#FBBF24 0%,#D97706 100%)':'linear-gradient(135deg,#60A5FA 0%,#2563EB 100%)', icon:isUrgent?'🚨':isImportant?'⚡':'📣', title:isUrgent?'Urgent!':isImportant?'Important':'Heads Up!', sub:isUrgent?'Action required — read this now.':isImportant?'Read before you scroll past.':(firstLine?shortFirst(firstLine):"Don't miss this community update."), pill:isUrgent?'🚨 URGENT':isImportant?'⚡ MUST READ':'📣 NEWS' },
    poll:        { gradient:'linear-gradient(135deg,#A78BFA 0%,#5B21B6 100%)', icon:'🗳️',title:'Have Your Say',    sub: pollQ?(pollQ.length>65?pollQ.slice(0,65)+'…':pollQ):'The community wants your take.', pill:optCount>0?`${optCount} options`:'VOTE NOW' },
  };
  const cfg = CFG[type];
  if (!cfg) return null;
  return (
    <div style={{ background: cfg.gradient, borderRadius: '16px 16px 0 0', padding: '18px 18px', marginLeft: -18, marginRight: -18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '52%', background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 100%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.18)', pointerEvents: 'none', zIndex: 0 }} />
      <span style={{ fontSize: 34, lineHeight: 1, flexShrink: 0, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.28))', position: 'relative', zIndex: 1 }}>{cfg.icon}</span>
      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 17, fontWeight: 900, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.02em', textShadow: '0 1px 4px rgba(0,0,0,0.22)' }}>{cfg.title}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.88)', marginTop: 3, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{cfg.sub}</div>
      </div>
      {cfg.pill && <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(255,255,255,0.22)', color: '#fff', borderRadius: 20, padding: '4px 11px', letterSpacing: '0.05em', flexShrink: 0, whiteSpace: 'nowrap', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.35)', position: 'relative', zIndex: 1 }}>{cfg.pill}</span>}
    </div>
  );
}

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

const REPORT_REASONS = [
  { value: 'spam',           label: '🚫 Spam' },
  { value: 'harassment',     label: '😡 Harassment' },
  { value: 'misinformation', label: '❌ Misinformation' },
  { value: 'inappropriate',  label: '🔞 Inappropriate Content' },
  { value: 'hate_speech',    label: '🤬 Hate Speech' },
  { value: 'other',          label: '📋 Other' },
];

// ── Post Card (community-specific, lightweight) ────────────────────────────────
function CommunityPostCard({ post, userId, userRole, onReact, onDelete }) {
  const [showComments, setShowComments] = useState(false);
  const [comment,      setComment]      = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [showMenu,     setShowMenu]     = useState(false);
  const [showReport,   setShowReport]   = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails,setReportDetails]= useState('');
  const [reporting,    setReporting]    = useState(false);
  const [reported,     setReported]     = useState(false);
  const [reportErr,    setReportErr]    = useState('');
  const [replyingTo,   setReplyingTo]   = useState(null); // { userName }
  const commentInputRef = useRef(null);
  const isOwnPost = String(post.authorId) === String(userId);
  const isAdmin   = ['admin', 'super_admin', 'superadmin'].includes(userRole);
  const myReaction = post.reactions?.find(r => String(r.userId) === String(userId));
  const totalReactions = post.reactions?.length || 0;
  const totalComments  = post.comments?.length  || 0;
  const hasBanner  = !!(post.postType && post.postType !== 'update' && POST_TYPE_ACCENT[post.postType]);

  const handleReply = (c) => {
    const mention = `@${c.userName} `;
    setComment(mention);
    setReplyingTo({ userName: c.userName });
    setShowComments(true);
    setTimeout(() => {
      if (commentInputRef.current) {
        commentInputRef.current.focus();
        commentInputRef.current.selectionStart = commentInputRef.current.selectionEnd = mention.length;
      }
    }, 50);
  };

  const handleSubmitComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await api.addComment(post._id, comment.trim());
      setComment('');
      setReplyingTo(null);
    } catch {}
    setSubmitting(false);
  };

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

  return (
    <div style={{ ...card, padding: hasBanner ? '0 18px 18px' : '18px 18px', marginBottom: 12, borderRadius: 20, border: post.isPinned ? '1.5px solid #BFDBFE' : '1px solid rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.08)' }}>
      {/* Post type banner — flush to card top */}
      {hasBanner && <PostTypeBanner post={post} />}

      {post.isPinned && <div style={{ fontSize: 11, color: '#0176D3', fontWeight: 700, marginBottom: 8 }}>📌 Pinned</div>}

      {/* Report modal */}
      {showReport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowReport(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '24px', maxWidth: 420, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#0A1628' }}>Report Post</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6B7280' }}>Help us keep the community safe. Select a reason:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {REPORT_REASONS.map(r => (
                <label key={r.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${reportReason === r.value ? '#0176D3' : '#E5E7EB'}`, background: reportReason === r.value ? '#EFF6FF' : '#F9FAFB', cursor: 'pointer', fontSize: 13, fontWeight: reportReason === r.value ? 700 : 400 }}>
                  <input type="radio" name={`reason-${post._id}`} value={r.value} checked={reportReason === r.value} onChange={() => setReportReason(r.value)} style={{ accentColor: '#0176D3' }} />
                  {r.label}
                </label>
              ))}
            </div>
            <textarea value={reportDetails} onChange={e => setReportDetails(e.target.value)} placeholder="Additional details (optional)…"
              rows={2} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 14 }} />
            {reportErr && <div style={{ fontSize: 13, color: '#DC2626', background: '#FEF2F2', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>{reportErr}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowReport(false); setReportErr(''); }} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', fontSize: 13, cursor: 'pointer', color: '#374151' }}>Cancel</button>
              <button onClick={handleReport} disabled={reporting} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {reporting ? 'Reporting…' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <Avatar name={post.authorName} src={post.authorAvatar} size={38} role={post.authorRole} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{post.authorName || 'Member'}</span>
            <RoleBadge role={post.authorRole} />
            {hasBanner && POST_TYPE_ACCENT[post.postType] && <span style={{ fontSize: 10, fontWeight: 700, background: POST_TYPE_ACCENT[post.postType] + '18', color: POST_TYPE_ACCENT[post.postType], borderRadius: 10, padding: '2px 8px' }}>{post.postType}</span>}
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>
            {post.authorTitle && <span>{post.authorTitle} · </span>}
            {timeAgo(post.createdAt)}
          </div>
        </div>
        {/* Action menu */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowMenu(v => !v)}
            style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 18, padding: '2px 8px', borderRadius: 4, lineHeight: 1 }}
            onMouseEnter={e => e.currentTarget.style.color = '#374151'}
            onMouseLeave={e => e.currentTarget.style.color = '#9CA3AF'}>⋯</button>
          {showMenu && (
            <div style={{ position: 'absolute', right: 0, top: '100%', background: '#fff', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: '1px solid #F1F5F9', minWidth: 160, zIndex: 100, overflow: 'hidden' }}
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
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {REACTIONS.map(r => (
            <button key={r.type} onClick={() => onReact(post._id, r.type)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: myReaction?.type === r.type ? `1px solid ${r.color || '#1D4ED8'}33` : '1px solid transparent', background: myReaction?.type === r.type ? '#EFF6FF' : 'rgba(0,0,0,0.03)', cursor: 'pointer', fontSize: 13, fontWeight: myReaction?.type === r.type ? 700 : 500, color: myReaction?.type === r.type ? (r.color || '#1D4ED8') : '#374151', transition: 'all 0.12s' }}>
              {r.emoji} <span style={{ display: window.innerWidth < 500 ? 'none' : 'inline' }}>{r.label}</span>
            </button>
          ))}
          <button onClick={() => setShowComments(v => !v)}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid transparent', background: 'rgba(0,0,0,0.03)', cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 500 }}>
            💬 Comment
          </button>
        </div>

        {showComments && (
          <div style={{ marginTop: 12 }}>
            {post.comments?.map(c => (
              <div key={String(c._id)} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <Avatar name={c.userName} size={28} role={c.userRole || 'candidate'} />
                <div style={{ flex: 1 }}>
                  <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '8px 12px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 3 }}>{c.userName || 'Member'}</div>
                    <div style={{ fontSize: 13, color: '#374151' }}>
                      {c.content.startsWith('@') ? (
                        <>
                          <span style={{ color: '#0176D3', fontWeight: 700 }}>{c.content.split(' ')[0]}</span>
                          {' '}{c.content.slice(c.content.indexOf(' ') + 1)}
                        </>
                      ) : c.content}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 3, paddingLeft: 4 }}>
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{timeAgo(c.createdAt)}</span>
                    <button onClick={() => handleReply(c)}
                      style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 11, cursor: 'pointer', padding: 0, fontWeight: 600 }}>Reply</button>
                  </div>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Avatar name="Me" size={28} role="candidate" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {replyingTo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#6B7280' }}>
                    <span>Replying to <strong style={{ color: '#0176D3' }}>@{replyingTo.userName}</strong></span>
                    <button onClick={() => { setReplyingTo(null); setComment(''); }} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 11, cursor: 'pointer', padding: 0 }}>✕ cancel</button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  <input ref={commentInputRef} value={comment} onChange={e => setComment(e.target.value)}
                    placeholder={replyingTo ? `Reply to @${replyingTo.userName}…` : 'Write a comment…'}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); }}}
                    style={{ flex: 1, padding: '8px 14px', borderRadius: 20, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', background: '#F8FAFC' }} />
                  <button onClick={handleSubmitComment} disabled={submitting || !comment.trim()}
                    style={{ padding: '8px 14px', borderRadius: 20, border: 'none', background: '#0176D3', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: comment.trim() ? 1 : 0.5 }}>
                    {submitting ? '…' : 'Post'}
                  </button>
                </div>
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
  const [text,       setText]       = useState('');
  const [postType,   setPostType]   = useState('update');
  const [expanded,   setExpanded]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [images,     setImages]     = useState([]);   // uploaded URLs
  const [uploading,  setUploading]  = useState(false);
  const fileRef = useRef(null);
  const bg = community?.coverColor || '#0176D3';

  const [uploadError, setUploadError] = useState('');
  const [postError,   setPostError]   = useState('');

  const handleImagePick = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 4 - images.length;
    if (remaining <= 0) return;
    setUploading(true);
    setUploadError('');
    const uploaded = [];
    let failed = 0;
    let lastErr = '';
    for (const file of files.slice(0, remaining)) {
      try {
        const fd = new FormData();
        fd.append('image', file);
        const r = await api.uploadFeedImage(fd);
        if (r?.url) uploaded.push(r.url);
        else failed++;
      } catch (err) { failed++; lastErr = err?.message || ''; }
    }
    if (uploaded.length) setImages(prev => [...prev, ...uploaded]);
    if (failed > 0) setUploadError(lastErr || `${failed} photo${failed > 1 ? 's' : ''} failed to upload. Check your connection.`);
    setUploading(false);
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await api.createPost({
        content      : text.trim(),
        postType,
        images,
        communityId  : community._id,
        communitySlug: community.slug,
      });
      setText('');
      setImages([]);
      setExpanded(false);
      setPostType('update');
      setPostError('');
      onCreate && onCreate();
    } catch (e) { setPostError(e?.message || 'Failed to post. Please check your connection and try again.'); }
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

          {/* Image previews */}
          {images.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {images.map((url, i) => (
                <div key={i} style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                    style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', width: 18, height: 18, borderRadius: '50%', cursor: 'pointer', fontSize: 11, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
              ))}
              {uploading && (
                <div style={{ width: 80, height: 80, borderRadius: 8, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#9CA3AF' }}>
                  <div style={{ width: 18, height: 18, border: '2px solid #E5E7EB', borderTopColor: bg, borderRadius: '50%', animation: 'tn-spin 0.8s linear infinite' }} />
                </div>
              )}
            </div>
          )}

          {uploadError && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#DC2626', background: '#FEF2F2', borderRadius: 6, padding: '6px 10px' }}>⚠️ {uploadError}</div>
          )}

          {postError && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', fontWeight: 600 }}>⚠️ {postError}</div>
          )}

          {/* Post type pills — always visible, matching career community style */}
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImagePick} />
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: 2 }}>
            {[
              { value: 'photo',        icon: '🖼️', label: 'Photo',    color: '#0176D3', bgc: '#EFF6FF' },
              { value: 'update',       icon: '💬', label: 'Update',   color: '#374151', bgc: '#F3F4F6' },
              { value: 'tip',          icon: '💡', label: 'Tip',      color: '#D97706', bgc: '#FEF3C7' },
              { value: 'hiring',       icon: '💼', label: 'Hiring',   color: '#059669', bgc: '#DCFCE7' },
              { value: 'question',     icon: '❓', label: 'Question', color: '#7C3AED', bgc: '#F3E8FF' },
              { value: 'achievement',  icon: '🏆', label: 'Win',      color: '#B45309', bgc: '#FEF3C7' },
              { value: 'resource',     icon: '📎', label: 'Resource', color: '#0891B2', bgc: '#E0F2FE' },
              { value: 'announcement', icon: '📢', label: 'News',     color: '#1D4ED8', bgc: '#EFF6FF' },
            ].map(pt => {
              const isActive = pt.value !== 'photo' && postType === pt.value;
              return (
                <button key={pt.value} onClick={() => {
                  setExpanded(true);
                  if (pt.value === 'photo') { if (images.length < 4) fileRef.current?.click(); }
                  else setPostType(pt.value);
                }} disabled={pt.value === 'photo' && uploading}
                  style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 20, border: `1px solid ${isActive ? pt.color + '55' : '#E5E7EB'}`, background: isActive ? pt.bgc : '#F9FAFB', color: isActive ? pt.color : '#374151', fontSize: 12, fontWeight: isActive ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.12s' }}>
                  {pt.icon} {pt.label}
                </button>
              );
            })}
          </div>

          {expanded && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button onClick={() => { setExpanded(false); setText(''); setPostType('update'); setImages([]); setPostError(''); }}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={!text.trim() || submitting}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: text.trim() ? bg : '#E5E7EB', color: text.trim() ? '#fff' : '#9CA3AF', fontSize: 12, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}>
                {submitting ? 'Posting…' : 'Post'}
              </button>
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

// ── Drives Tab (college communities) ─────────────────────────────────────────
const DRIVE_TYPE_LABELS = {
  placement: '🎯 Placement Drive',
  internship: '💼 Internship',
  exam: '📝 Exam / Test',
};

function DrivesTab({ drives, loading }) {
  if (loading) return <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0' }}>Loading drives…</div>;
  if (!drives.length) return (
    <div style={{ ...card, textAlign: 'center', padding: '40px 24px', borderRadius: 14 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📣</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#374151', marginBottom: 6 }}>No placement drives yet</div>
      <div style={{ fontSize: 13, color: '#9CA3AF' }}>Upcoming placement drives, internships and exams from this college will appear here.</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {drives.map(d => (
        <div key={d._id} style={{ ...card, padding: '14px 16px', borderRadius: 12, border: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0A1628' }}>{d.title}</div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0176D3', background: '#EFF6FF', borderRadius: 999, padding: '2px 10px' }}>
              {DRIVE_TYPE_LABELS[d.opportunityType] || DRIVE_TYPE_LABELS.placement}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {d.companyName && <span>🏢 {d.companyName}</span>}
            <span>🗓️ {new Date(d.driveDate).toLocaleDateString()}</span>
            <span>• {d.mode}</span>
            {d.location && <span>📍 {d.location}</span>}
            {d.examProvider && <span>• {d.examProvider}</span>}
          </div>
          {d.description && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>{d.description}</div>}
        </div>
      ))}
    </div>
  );
}

// ── Members Tab ───────────────────────────────────────────────────────────────
function MembersTab({ members, loading, total }) {
  if (loading) return (
    <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0' }}>
      <div style={{ width: 28, height: 28, border: '3px solid #E5E7EB', borderTopColor: '#0176D3', borderRadius: '50%', animation: 'tn-spin 0.8s linear infinite', margin: '0 auto 10px' }} />
      Loading members…
    </div>
  );
  if (!members.length) return (
    <div style={{ ...card, textAlign: 'center', padding: '40px 24px', borderRadius: 14 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
      <div style={{ fontWeight: 700, color: '#374151', marginBottom: 6 }}>No members yet</div>
      <div style={{ fontSize: 13, color: '#9CA3AF' }}>Be the first to join!</div>
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 14, fontWeight: 600 }}>
        {total} member{total !== 1 ? 's' : ''}{total > members.length ? ` · showing first ${members.length}` : ''}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {members.map(m => (
          <div key={String(m._id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 12, background: '#fff', border: '1px solid #F1F5F9', transition: 'box-shadow 0.15s', cursor: 'default' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
            <Avatar name={m.name} src={m.avatarUrl || m.photoUrl} size={46} role={m.role} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0A1628', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name || 'Member'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <RoleBadge role={m.role} />
                {m.title && <span style={{ fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{m.title}</span>}
              </div>
              {(m.department || m.location) && (
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3, display: 'flex', gap: 10 }}>
                  {m.department && <span>🏢 {m.department}</span>}
                  {m.location && <span>📍 {m.location}</span>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── About / Guidelines Tab ─────────────────────────────────────────────────────
const COMMUNITY_POST_GUIDELINES = {
  tech    : ['Share coding tips, tutorials, and tech news', 'Ask questions about programming, tools, or frameworks', 'Post job openings relevant to developers', 'Share project showcases or achievements', 'Discuss industry trends and best practices'],
  hr      : ['Share hiring tips and recruiting best practices', 'Post job openings for HR roles', 'Discuss talent acquisition strategies', 'Share interview techniques and compensation trends', 'Post HR policy updates or compliance news'],
  business: ['Share business growth strategies and case studies', 'Post networking events and business opportunities', 'Discuss market trends and industry insights', 'Share entrepreneurship tips and startup resources', 'Post B2B collaboration opportunities'],
  design  : ['Share design inspiration and portfolio work', 'Post UX/UI tips and design resources', 'Discuss design tools, trends, and methodologies', 'Share creative challenges and feedback requests', 'Post design job openings and freelance work'],
  other   : ['Share relevant news and updates', 'Ask questions and seek advice from members', 'Post opportunities and announcements', 'Share resources and learning materials', 'Engage respectfully and professionally'],
};

const COMMUNITY_RULES = [
  'Be respectful and professional at all times',
  'Only post content relevant to this community',
  'No spam, self-promotion, or unsolicited links',
  'Credit original sources and authors',
  'No harassment, hate speech, or offensive content',
  'Keep discussions constructive and on-topic',
];

function AboutTab({ community }) {
  const bg = community?.coverColor || '#0176D3';
  const guidelines = COMMUNITY_POST_GUIDELINES[community?.category] || COMMUNITY_POST_GUIDELINES.other;
  const createdDate = community?.createdAt ? new Date(community.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* About */}
      <div style={{ ...card, padding: '20px', borderRadius: 14, border: '1px solid #F1F5F9' }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#0A1628', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: bg + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>ℹ️</span>
          About this Community
        </div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, marginBottom: 14 }}>{community?.description || 'A professional community for members to connect, share, and grow together.'}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>👥</span>
            <span><strong style={{ color: '#0A1628' }}>{community?.memberCount || 0}</strong> members</span>
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>🏷️</span>
            <span>Category: <strong style={{ color: '#0A1628', textTransform: 'capitalize' }}>{community?.category || 'Other'}</strong></span>
          </div>
          {createdDate && (
            <div style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>📅</span>
              <span>Created <strong style={{ color: '#0A1628' }}>{createdDate}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* What to post */}
      <div style={{ ...card, padding: '20px', borderRadius: 14, border: `1px solid ${bg}22`, background: bg + '06' }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#0A1628', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✏️</span>
          What to Post Here
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {guidelines.map((g, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#374151' }}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
              {g}
            </div>
          ))}
        </div>
      </div>

      {/* Post types available */}
      <div style={{ ...card, padding: '20px', borderRadius: 14, border: '1px solid #F1F5F9' }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#0A1628', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📝</span>
          Post Types Allowed
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { type: 'update',       emoji: '💬', label: 'Update',       bg: '#F3F4F6', color: '#374151' },
            { type: 'tip',          emoji: '💡', label: 'Pro Tip',      bg: '#FEF9C3', color: '#854D0E' },
            { type: 'question',     emoji: '❓', label: 'Question',     bg: '#EDE9FE', color: '#6D28D9' },
            { type: 'achievement',  emoji: '🏆', label: 'Achievement',  bg: '#D1FAE5', color: '#065F46' },
            { type: 'hiring',       emoji: '💼', label: 'Hiring',       bg: '#DBEAFE', color: '#1E40AF' },
            { type: 'resource',     emoji: '📎', label: 'Resource',     bg: '#E0F2FE', color: '#0369A1' },
            { type: 'milestone',    emoji: '🎯', label: 'Milestone',    bg: '#FCE7F3', color: '#9D174D' },
            { type: 'announcement', emoji: '📢', label: 'Announcement', bg: '#FEF3C7', color: '#92400E' },
          ].map(t => (
            <span key={t.type} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: t.bg, color: t.color, borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 700 }}>
              {t.emoji} {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* Community Rules */}
      <div style={{ ...card, padding: '20px', borderRadius: 14, border: '1px solid #FEE2E2', background: '#FFF5F5' }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#0A1628', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📜</span>
          Community Rules
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {COMMUNITY_RULES.map((rule, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#374151' }}>
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{['🚫','💬','📣','📚','🤝','🎯'][i]}</span>
              {rule}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Reviews Tab (company communities only) ─────────────────────────────────────
function ReviewsTab({ user, companyName }) {
  const [reviews,  setReviews]  = useState([]);
  const [avg,      setAvg]      = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getCompanyReviewsByName(companyName);
      setReviews(r?.data || []);
      setAvg(r?.avgRating || null);
    } catch { setReviews([]); }
    setLoading(false);
  }, [companyName]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0' }}>
      <div style={{ width: 28, height: 28, border: '3px solid #E5E7EB', borderTopColor: '#0176D3', borderRadius: '50%', animation: 'tn-spin 0.8s linear infinite', margin: '0 auto 10px' }} />
      Loading reviews…
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {avg && <span style={{ fontSize: 28, fontWeight: 900, color: '#F59E0B' }}>{avg}</span>}
          <div>
            {avg && <StarRating value={Math.round(parseFloat(avg))} size={16} />}
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>{reviews.length} review{reviews.length !== 1 ? 's' : ''} for {companyName}</div>
          </div>
        </div>
        <button onClick={() => setShowForm(v => !v)} style={showForm ? btnG : btnP}>
          {showForm ? '✕ Close' : '✍️ Write a Review'}
        </button>
      </div>

      {showForm && (
        <div style={{ marginBottom: 18 }}>
          <SubmitReviewForm
            user={user}
            companies={[]}
            prefilledCompany={companyName}
            onSuccess={() => { load(); setShowForm(false); }}
          />
        </div>
      )}

      {reviews.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '40px 24px', borderRadius: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#374151', marginBottom: 6 }}>No reviews yet</div>
          <div style={{ fontSize: 13, color: '#9CA3AF' }}>Be the first to share your experience at {companyName}.</div>
        </div>
      ) : (
        reviews.map(r => <ReviewCard key={r._id} review={r} />)
      )}
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
  const [drives,    setDrives]    = useState([]);
  const [members,   setMembers]   = useState([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [isMember,  setIsMember]  = useState(false);
  const [tab,       setTab]       = useState('posts');
  const [loading,   setLoading]   = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [jobsLoading,  setJobsLoading]  = useState(false);
  const [drivesLoading, setDrivesLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [joining,   setJoining]   = useState(false);
  const [seeding,   setSeeding]   = useState(false);
  const [seedMsg,   setSeedMsg]   = useState('');
  const [isMobile,  setMobile]    = useState(() => window.innerWidth < 768);
  const [editOpen,  setEditOpen]  = useState(false);
  const [editForm,  setEditForm]  = useState({});
  const [editSaving,setEditSaving]= useState(false);
  const [editErr,   setEditErr]   = useState('');
  const isSuperAdmin = ['super_admin', 'superadmin'].includes(user?.role);
  const uid = String(user?.id || user?._id || '');
  // Auto-membership communities (e.g. "<College> Community") can't be left —
  // every student/alumnus whose college matches is automatically a member.
  const normalizeCollege = (name) => String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const isAutoMember = !!community?.collegeName && normalizeCollege(community.collegeName) === normalizeCollege(user?.college);

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
      const r = await api.getCommunityFeed(slug, { limit: 25 });
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

  const loadDrives = useCallback(async () => {
    setDrivesLoading(true);
    try {
      const r = await api.getCommunityDrives(slug);
      setDrives(r?.data || []);
    } catch {}
    setDrivesLoading(false);
  }, [slug]);

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const r = await api.getCommunityMembers(slug, { limit: 50 });
      setMembers(r?.data || []);
      setTotalMembers(r?.total || 0);
    } catch {}
    setMembersLoading(false);
  }, [slug]);

  useEffect(() => { loadCommunity(); loadPosts(); }, [loadCommunity, loadPosts]);

  useEffect(() => {
    if (tab === 'jobs'    && !jobs.length)    loadJobs();
    if (tab === 'drives'  && !drives.length)  loadDrives();
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

  const openEdit = () => {
    setEditForm({
      name       : community.name || '',
      description: community.description || '',
      icon       : community.icon || '💬',
      coverColor : community.coverColor || '#0176D3',
      category   : community.category || 'other',
    });
    setEditErr('');
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editForm.name?.trim()) { setEditErr('Name is required.'); return; }
    setEditSaving(true);
    setEditErr('');
    try {
      const r = await api.updateCommunity(slug, editForm);
      if (r?.data) setCommunity(prev => ({ ...prev, ...r.data }));
      setEditOpen(false);
    } catch (e) {
      setEditErr(e?.message || 'Failed to save changes.');
    }
    setEditSaving(false);
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

  // Real-time sync — all events wire up here
  usePlatformEvents({
    'post:created': (post) => {
      if (String(post.authorId) === uid) return; // author already sees it immediately
      const matchesCommunity = community
        ? String(post.communityId) === String(community._id) || post.communitySlug === slug
        : post.communitySlug === slug;
      if (!matchesCommunity) return;
      setPosts(prev => {
        if (prev.some(p => String(p._id) === String(post._id))) return prev;
        return [post, ...prev]; // instant prepend — no tap needed
      });
    },
    'post:reacted': ({ postId, reactions }) => {
      setPosts(prev => prev.map(p => String(p._id) === String(postId) ? { ...p, reactions } : p));
    },
    'post:commented': ({ postId, comment }) => {
      setPosts(prev => prev.map(p => {
        if (String(p._id) !== String(postId)) return p;
        if (String(comment.userId) === uid) return p;
        if ((p.comments || []).some(c => String(c._id) === String(comment._id))) return p;
        return { ...p, comments: [...(p.comments || []), comment] };
      }));
    },
    'post:deleted': ({ postId }) => {
      setPosts(prev => prev.filter(p => String(p._id) !== String(postId)));
    },
    'community:memberJoined': ({ slug: eventSlug, member, memberCount }) => {
      if (eventSlug !== slug) return;
      // Update member count on the community card header
      setCommunity(prev => prev ? { ...prev, memberCount } : prev);
      // Add to members list if not already there
      if (member) {
        setMembers(prev => {
          if (prev.some(m => String(m._id) === String(member._id))) return prev;
          return [member, ...prev];
        });
        setTotalMembers(memberCount);
      }
    },
    'community:memberLeft': ({ slug: eventSlug, userId: leftId, memberCount }) => {
      if (eventSlug !== slug) return;
      setCommunity(prev => prev ? { ...prev, memberCount } : prev);
      setMembers(prev => prev.filter(m => String(m._id) !== String(leftId)));
      setTotalMembers(memberCount);
    },
  });

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
    ...(community?.collegeName
      ? [{ id: 'drives', label: `📣 Placement Drives` }]
      : [{ id: 'jobs', label: `💼 Jobs` }]),
    { id: 'members', label: `👥 Members (${community?.memberCount || 0})` },
    ...(community?.companyName ? [{ id: 'reviews', label: `⭐ Reviews` }] : []),
    { id: 'about',   label: `ℹ️ About` },
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
    <div style={{ maxWidth: 860, margin: '0 auto', padding: isMobile ? '0 0 40px' : '20px 0 40px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      <style>{`@keyframes tn-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Super Admin: Edit Community Modal */}
      {editOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setEditOpen(false); }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 28, maxWidth: 480, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#0A1628', marginBottom: 20 }}>✏️ Edit Community</div>
            {[
              { key: 'name',        label: 'Name',        type: 'text',  placeholder: 'Community name' },
              { key: 'description', label: 'Description', type: 'textarea', placeholder: 'What is this community about?' },
              { key: 'icon',        label: 'Icon (emoji)',type: 'text',  placeholder: '💬' },
              { key: 'coverColor',  label: 'Cover Color (hex)', type: 'text', placeholder: '#0176D3' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>{f.label}</label>
                {f.type === 'textarea'
                  ? <textarea rows={3} value={editForm[f.key] || ''} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                  : <input type="text" value={editForm[f.key] || ''} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13, boxSizing: 'border-box' }} />
                }
              </div>
            ))}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Category</label>
              <select value={editForm.category || 'other'} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13, boxSizing: 'border-box', background: '#fff' }}>
                {['tech', 'hr', 'business', 'design', 'other'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            {editErr && <div style={{ color: '#DC2626', fontSize: 12, marginBottom: 12 }}>{editErr}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditOpen(false)} style={{ padding: '9px 20px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleEditSave} disabled={editSaving}
                style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: '#7C3AED', color: '#fff', fontWeight: 700, fontSize: 13, cursor: editSaving ? 'not-allowed' : 'pointer', opacity: editSaving ? 0.7 : 1 }}>
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back */}
      <button onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 12, padding: isMobile ? '0 12px' : 0 }}>
        ← Back to Communities
      </button>

      {/* Hero banner */}
      <div style={{ borderRadius: isMobile ? 0 : 16, overflow: 'hidden', marginBottom: 0, boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
        {/* Banner with icon absolutely positioned at bottom-left */}
        <div style={{ height: 120, background: `linear-gradient(135deg, ${bg} 0%, ${bg}cc 100%)`, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 48, opacity: 0.18 }}>{community.icon}</div>
          {/* Icon box — absolute bottom-left so it's always visible against the banner */}
          <div style={{
            position: 'absolute', bottom: -26, left: isMobile ? 16 : 24,
            width: 56, height: 56, borderRadius: 14,
            background: '#fff', border: `3px solid #fff`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.20)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, flexShrink: 0, zIndex: 2,
          }}>
            {community.icon}
          </div>
        </div>

        {/* White content below banner */}
        <div style={{ background: '#fff', padding: isMobile ? '0 16px 16px' : '0 24px 20px' }}>
          {/* Row: reserve space for icon on left, action buttons on right */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: 8, paddingBottom: 4, minHeight: 36 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {isSuperAdmin && (
                <button onClick={openEdit}
                  style={{ padding: '7px 14px', borderRadius: 20, border: '1.5px solid #7C3AED', background: '#F5F3FF', color: '#7C3AED', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  ✏️ Edit
                </button>
              )}
              <button
                onClick={() => {
                  const shareUrl = `${window.location.origin}/c/${community.slug}`;
                  navigator.clipboard?.writeText(shareUrl).then(() => {
                    const btn = document.getElementById('tn-share-btn');
                    if (btn) { btn.textContent = '✓ Copied!'; setTimeout(() => { if (btn) btn.textContent = '🔗 Share'; }, 2000); }
                  }).catch(() => {
                    if (navigator.share) {
                      navigator.share({ title: community.name, text: community.description, url: shareUrl }).catch(() => {});
                    }
                  });
                }}
                id="tn-share-btn"
                style={{ padding: '7px 14px', borderRadius: 20, border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                🔗 Share
              </button>
              {isAutoMember ? (
                <span style={{ padding: '7px 18px', borderRadius: 20, border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  🎓 Your College
                </span>
              ) : (
                <button
                  onClick={isMember ? handleLeave : handleJoin}
                  disabled={joining}
                  style={{ padding: '7px 18px', borderRadius: 20, border: `1.5px solid ${isMember ? '#E5E7EB' : bg}`, background: isMember ? '#fff' : bg, color: isMember ? '#374151' : '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, boxShadow: isMember ? '0 1px 4px rgba(0,0,0,0.06)' : `0 2px 8px ${bg}44` }}>
                  {joining ? '…' : isMember ? '✓ Joined' : '+ Join'}
                </button>
              )}
            </div>
          </div>

          {/* Community name + meta — left margin to clear the icon */}
          <div style={{ marginTop: 6, paddingLeft: isMobile ? 70 : 78, minHeight: 20, position: 'relative' }}>
            <div style={{ fontWeight: 900, fontSize: isMobile ? 18 : 22, color: '#0A1628', marginBottom: 2 }}>{community.name}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 0 }}>{community.memberCount || 0} members · {community.category}</div>
          </div>
          {/* Description + guidelines button — full width below icon */}
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>{community.description}</div>
            <button onClick={() => setTab('about')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, padding: '4px 12px', borderRadius: 20, background: bg + '15', border: `1px solid ${bg}33`, color: bg, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              📜 View Guidelines
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${bg}22`, marginBottom: 16, padding: isMobile ? '0 8px' : 0, overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', background: '#fff', borderRadius: isMobile ? 0 : '0 0 12px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flexShrink: 0, padding: isMobile ? '11px 14px' : '13px 20px', border: 'none', background: tab === t.id ? bg + '10' : 'transparent', fontSize: isMobile ? 12 : 13, fontWeight: tab === t.id ? 700 : 600, color: tab === t.id ? bg : '#374151', cursor: 'pointer', borderBottom: tab === t.id ? `2px solid ${bg}` : '2px solid transparent', marginBottom: -2, whiteSpace: 'nowrap', transition: 'all 0.15s', letterSpacing: '0.01em' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: isMobile ? '0 12px' : 0 }}>
        {tab === 'posts' && (
          <>
            {/* Create post — members only; non-members see a join nudge */}
            {(isMember || ['admin','super_admin','superadmin'].includes(user?.role))
              ? <CreateCommunityPost user={user} community={community} onCreate={loadPosts} />
              : (
                <div style={{ ...card, padding: '12px 16px', marginBottom: 14, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12, border: `1.5px dashed ${bg}55` }}>
                  <span style={{ fontSize: 22 }}>✍️</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Join to post & interact</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Browse posts below — join the community to share your own.</div>
                  </div>
                </div>
              )}

            {/* Posts — always visible to everyone (no membership gate) */}
            {postsLoading ? (
              <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0' }}>
                <div style={{ width: 28, height: 28, border: '3px solid #E5E7EB', borderTopColor: bg, borderRadius: '50%', animation: 'tn-spin 0.8s linear infinite', margin: '0 auto 10px' }} />
                Loading posts…
              </div>
            ) : posts.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: '40px 24px', borderRadius: 14 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✍️</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#374151', marginBottom: 6 }}>No posts yet</div>
                <div style={{ fontSize: 13, color: '#9CA3AF' }}>Be the first to share something with this community!</div>
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
        {tab === 'drives' && <DrivesTab drives={drives} loading={drivesLoading} />}
        {tab === 'members' && <MembersTab members={members} loading={membersLoading} total={totalMembers} />}
        {tab === 'reviews' && community?.companyName && <ReviewsTab user={user} companyName={community.companyName} />}
        {tab === 'about' && <AboutTab community={community} />}
      </div>
    </div>
  );
}
