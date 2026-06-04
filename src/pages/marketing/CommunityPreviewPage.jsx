import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';

export default function CommunityPreviewPage() {
  const { slug } = useParams();
  const navigate  = useNavigate();
  const [community, setCommunity] = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    // Try to fetch community info publicly
    api.getCommunity(slug)
      .then(r => { setCommunity(r?.data || null); setLoading(false); })
      .catch(() => { setCommunity(null); setLoading(false); });
  }, [slug]);

  const goToLogin = () => {
    // Store the redirect target and go to auth
    try { sessionStorage.setItem('tn_post_login_redirect', `/app/communities/${slug}`); } catch {}
    navigate(`/auth?redirect=${encodeURIComponent(`/app/communities/${slug}`)}`);
  };

  const color = community?.coverColor || '#0176D3';

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>
        {/* TalentNest logo */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#0A1628', letterSpacing: '-0.03em' }}>
            Talent<span style={{ color: '#0176D3' }}>Nest</span>
          </div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Professional HR Network</div>
        </div>

        {loading ? (
          <div style={{ width: 36, height: 36, border: '3px solid #E5E7EB', borderTopColor: '#0176D3', borderRadius: '50%', animation: 'tn-spin 0.8s linear infinite', margin: '0 auto 20px' }} />
        ) : (
          <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.12)', marginBottom: 24 }}>
            {/* Community banner */}
            <div style={{ height: 100, background: `linear-gradient(135deg, ${color} 0%, ${color}bb 100%)`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 52, opacity: 0.4 }}>{community?.icon || '💬'}</span>
            </div>

            <div style={{ padding: '24px 28px 28px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '-44px auto 12px', border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                {community?.icon || '💬'}
              </div>

              {community ? (
                <>
                  <div style={{ fontWeight: 900, fontSize: 22, color: '#0A1628', marginBottom: 6 }}>{community.name}</div>
                  <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 12, lineHeight: 1.6 }}>
                    {community.description || 'A professional community on TalentNest.'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 12, color: '#9CA3AF', marginBottom: 20 }}>
                    <span>👥 {community.memberCount || 0} members</span>
                    <span>🏷️ {community.category || 'General'}</span>
                  </div>
                  <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '12px 16px', marginBottom: 20, border: '1px solid #E5E7EB', fontSize: 13, color: '#374151' }}>
                    🔒 Log in to TalentNest to join this community and see all posts, members, and discussions.
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#0A1628', marginBottom: 8 }}>Community on TalentNest</div>
                  <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>Sign in to access this community and connect with professionals.</div>
                </>
              )}

              <button onClick={goToLogin}
                style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', transition: 'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                {community ? `Join ${community.name} →` : 'Sign In to TalentNest →'}
              </button>
              <div style={{ marginTop: 12, fontSize: 12, color: '#9CA3AF' }}>
                Don't have an account?{' '}
                <span onClick={() => navigate('/auth?mode=register')} style={{ color: '#0176D3', fontWeight: 600, cursor: 'pointer' }}>Create one free</span>
              </div>
            </div>
          </div>
        )}

        <div style={{ fontSize: 11, color: '#D1D5DB' }}>Powered by TalentNest · Professional HR Platform</div>
      </div>
      <style>{`@keyframes tn-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
