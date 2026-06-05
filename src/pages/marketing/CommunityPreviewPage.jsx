import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../api/config.js';

export default function CommunityPreviewPage() {
  const { slug } = useParams();
  const navigate  = useNavigate();
  const [community, setCommunity] = useState(null);
  const [posts,     setPosts]     = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    // Public endpoint — no auth required
    fetch(`${API_BASE_URL}/communities/public/${slug}`)
      .then(r => r.json())
      .then(r => {
        if (r.success) {
          setCommunity(r.data || null);
          setPosts(r.previewPosts || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  const goToLogin = () => {
    try { sessionStorage.setItem('tn_post_login_redirect', `/app/communities/${slug}`); } catch {}
    navigate(`/auth?redirect=${encodeURIComponent(`/app/communities/${slug}`)}`);
  };

  const color = community?.coverColor || '#0176D3';

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'system-ui, sans-serif' }}>
      {/* Top bar */}
      <div style={{ background: '#032D60', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 900, fontSize: 20, color: '#fff', letterSpacing: '-0.03em' }}>
          Talent<span style={{ color: '#00C2CB' }}>Nest</span>
        </div>
        <button onClick={goToLogin} style={{ background: '#0176D3', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Sign In
        </button>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 0 40px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <div style={{ width: 36, height: 36, border: '3px solid #E5E7EB', borderTopColor: '#0176D3', borderRadius: '50%', animation: 'tn-spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: '#9CA3AF', fontSize: 14 }}>Loading community…</p>
          </div>
        ) : (
          <>
            {/* Community header */}
            <div style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`, height: 160, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 72, opacity: 0.3 }}>{community?.icon || '💬'}</span>
            </div>

            <div style={{ background: '#fff', padding: '0 24px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              {/* Icon + title */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginTop: -28, marginBottom: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', flexShrink: 0 }}>
                  {community?.icon || '💬'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: 22, color: '#0A1628', lineHeight: 1.2 }}>{community?.name || 'Community'}</div>
                  <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                    👥 {community?.memberCount || 0} members · {community?.category || 'Community'}
                  </div>
                </div>
              </div>

              {community?.description && (
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: '0 0 20px' }}>{community.description}</p>
              )}

              {/* CTA */}
              <button onClick={goToLogin} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
                Join {community?.name || 'this community'} →
              </button>
              <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', margin: '10px 0 0' }}>
                Don't have an account?{' '}
                <span onClick={() => navigate('/auth?mode=register')} style={{ color: '#0176D3', fontWeight: 600, cursor: 'pointer' }}>Create one free</span>
              </p>
            </div>

            {/* Preview posts */}
            {posts.length > 0 && (
              <div style={{ background: '#fff', marginTop: 12, borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ padding: '16px 24px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>
                    Recent posts in this community
                  </div>
                </div>
                {posts.map((p, i) => (
                  <div key={i} style={{ padding: '14px 24px', borderBottom: i < posts.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                        {(p.authorName || 'M')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#0A1628' }}>{p.authorName || 'Member'}</div>
                        <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                          {p.content || ''}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Lock overlay */}
                <div style={{ padding: '16px 24px', background: 'linear-gradient(to top, #fff 60%, transparent)', textAlign: 'center' }}>
                  <div style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 16px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🔒</span>
                    <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Sign in to see all posts and join the discussion</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`@keyframes tn-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
