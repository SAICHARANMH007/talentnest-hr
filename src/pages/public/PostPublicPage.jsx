import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../api/config.js';

const ROLE_COLOR = { admin: '#0176D3', recruiter: '#7C3AED', candidate: '#059669', super_admin: '#DC2626', superadmin: '#DC2626' };
const ROLE_LABEL = { admin: 'HR Admin', recruiter: 'Recruiter', candidate: 'Candidate', super_admin: 'Super Admin', superadmin: 'Super Admin' };

const TYPE_CFG = {
  achievement : { label: '🏆 Achievement',  bg: '#FEF3C7', color: '#92400E' },
  milestone   : { label: '🎯 Milestone',    bg: '#D1FAE5', color: '#065F46' },
  hiring      : { label: '💼 Hiring',       bg: '#EFF6FF', color: '#1D4ED8' },
  announcement: { label: '📢 Announcement', bg: '#FEF2F2', color: '#991B1B' },
  resource    : { label: '📎 Resource',     bg: '#F5F3FF', color: '#6D28D9' },
  tip         : { label: '💡 Pro Tip',      bg: '#FFFBEB', color: '#B45309' },
  feedback    : { label: '⭐ Feedback',      bg: '#F0FDF4', color: '#166534' },
  question    : { label: '❓ Question',      bg: '#EFF6FF', color: '#1E40AF' },
};

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)     return 'just now';
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PostPublicPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post,    setPost]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!id) { setError('Invalid post link.'); setLoading(false); return; }
    fetch(`${API_BASE_URL}/social-posts/public/${id}`)
      .then(r => r.json())
      .then(d => { if (d.success && d.data) setPost(d.data); else setError('Post not found or has been deleted.'); })
      .catch(() => setError('Could not load this post. Please check your connection.'))
      .finally(() => setLoading(false));
  }, [id]);

  const role  = post?.authorRole || '';
  const color = ROLE_COLOR[role] || '#0176D3';
  const label = ROLE_LABEL[role] || 'Member';
  const typeC = TYPE_CFG[post?.postType];

  const isLoggedIn = !!(localStorage.getItem('tn_logged_in') === 'true');
  const PREVIEW_LENGTH = 280;
  const isLong = (post?.content?.length || 0) > PREVIEW_LENGTH;

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}>
      {/* Top bar */}
      <div style={{ background: '#032D60', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <div style={{ fontWeight: 900, fontSize: 18, color: '#fff', letterSpacing: '-0.02em' }}>TalentNest</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/auth?mode=register')}
            style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Sign up free
          </button>
          <button onClick={() => navigate('/auth?mode=login')}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#0176D3', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Log in
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '32px auto', padding: '0 16px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9CA3AF' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #E5E7EB', borderTopColor: '#0176D3', borderRadius: '50%', animation: 'tn-spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            Loading post…
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: '#fff', borderRadius: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#374151', marginBottom: 8 }}>{error}</div>
            <button onClick={() => navigate('/')} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#0176D3', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
              Go to TalentNest
            </button>
          </div>
        )}

        {post && !loading && (
          <>
            {/* Post card */}
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', padding: '20px 22px', marginBottom: 16 }}>
              {/* Author */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                  {post.authorAvatar
                    ? <img src={post.authorAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : (post.authorName || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: '#0A1628' }}>{post.authorName || 'TalentNest Member'}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, background: color + '18', color, borderRadius: 4, padding: '2px 6px' }}>{label}</span>
                    {typeC && <span style={{ fontSize: 11, fontWeight: 600, background: typeC.bg, color: typeC.color, borderRadius: 20, padding: '2px 8px' }}>{typeC.label}</span>}
                  </div>
                  {post.authorTitle && <div style={{ fontSize: 12, color: '#6B7280' }}>{post.authorTitle}</div>}
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{timeAgo(post.createdAt)}</div>
                </div>
              </div>

              {/* Content */}
              <div style={{ fontSize: 15, color: '#1F2937', lineHeight: 1.72, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {isLong && !isLoggedIn
                  ? post.content.slice(0, PREVIEW_LENGTH) + '…'
                  : post.content}
              </div>

              {/* Images */}
              {post.images?.length > 0 && (
                <div style={{ display: 'grid', gap: 4, marginTop: 12, borderRadius: 12, overflow: 'hidden', gridTemplateColumns: post.images.length === 1 ? '1fr' : '1fr 1fr' }}>
                  {post.images.slice(0, isLoggedIn ? 4 : 1).map((img, i) => (
                    <img key={i} src={img} alt="" style={{ width: '100%', height: post.images.length === 1 ? 340 : 180, objectFit: 'cover', display: 'block', filter: isLong && !isLoggedIn && i > 0 ? 'blur(8px)' : 'none' }} />
                  ))}
                </div>
              )}

              {/* Engagement counts */}
              <div style={{ display: 'flex', gap: 16, marginTop: 14, paddingTop: 12, borderTop: '1px solid #F1F5F9', fontSize: 13, color: '#9CA3AF' }}>
                {post.reactionCount > 0 && <span>👍 {post.reactionCount} reaction{post.reactionCount !== 1 ? 's' : ''}</span>}
                {post.commentCount > 0  && <span>💬 {post.commentCount} comment{post.commentCount !== 1 ? 's' : ''}</span>}
                {post.hashtags?.map(h => (
                  <span key={h} style={{ color: '#0176D3', fontWeight: 600 }}>{h}</span>
                ))}
              </div>
            </div>

            {/* CTA — sign up / log in */}
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', padding: '28px 24px', textAlign: 'center' }}>
              {isLong && !isLoggedIn && (
                <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>
                  ✦ Log in to read the full post and join the conversation
                </div>
              )}
              <div style={{ fontWeight: 800, fontSize: 20, color: '#0A1628', marginBottom: 6 }}>Join TalentNest</div>
              <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
                Connect with recruiters and professionals. Discover jobs, referrals, and career communities — all in one place.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => navigate(`/auth?mode=register&redirect=/app/feed`)}
                  style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: '#0176D3', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Create free account
                </button>
                <button onClick={() => {
                    const stored = localStorage.getItem('tn_logged_in');
                    if (stored === 'true') navigate(`/app/feed#${id}`);
                    else navigate(`/auth?mode=login&redirect=/app/feed#${id}`);
                  }}
                  style={{ padding: '12px 28px', borderRadius: 10, border: '1px solid #D1D5DB', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Already have an account
                </button>
              </div>

              {/* Benefits */}
              <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
                {['🤝 Build your network', '💼 Discover jobs', '🎯 Get referrals', '💬 Join communities'].map(b => (
                  <span key={b} style={{ fontSize: 12, color: '#6B7280', background: '#F3F4F6', borderRadius: 20, padding: '4px 12px' }}>{b}</span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes tn-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
