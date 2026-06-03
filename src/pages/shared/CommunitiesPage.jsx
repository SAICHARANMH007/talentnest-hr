'use strict';
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/api.js';
import { card, btnP, btnG } from '../../constants/styles.js';

const CATEGORY_COLOR = {
  tech    : '#0176D3',
  hr      : '#059669',
  business: '#D97706',
  design  : '#EC4899',
  other   : '#6B7280',
};

const CATEGORY_LABEL = {
  tech    : 'Technology',
  hr      : 'HR & Recruiting',
  business: 'Business',
  design  : 'Product & Design',
  other   : 'General',
};

function CommunityCard({ community, onJoin, onLeave, loading }) {
  const isMember = community.isMember;
  const color    = community.coverColor || CATEGORY_COLOR[community.category] || '#0176D3';

  return (
    <div style={{ ...card, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: isMember ? `2px solid ${color}33` : '1px solid #F1F5F9', transition: 'box-shadow 0.2s', cursor: 'default' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.10)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>

      {/* Cover strip */}
      <div style={{ height: 72, background: `linear-gradient(135deg, ${color} 0%, ${color}bb 100%)`, position: 'relative', flexShrink: 0 }}>
        <div style={{ position: 'absolute', bottom: -20, left: 16, width: 48, height: 48, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
          {community.icon || '💬'}
        </div>
        {isMember && (
          <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.25)', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700, color: '#fff' }}>
            ✓ Joined
          </div>
        )}
      </div>

      <div style={{ padding: '26px 16px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#0A1628', marginBottom: 4, lineHeight: 1.3 }}>{community.name}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: CATEGORY_COLOR[community.category] || '#6B7280', background: (CATEGORY_COLOR[community.category] || '#6B7280') + '15', borderRadius: 20, padding: '2px 8px', display: 'inline-block', marginBottom: 8, alignSelf: 'flex-start' }}>
          {CATEGORY_LABEL[community.category] || 'General'}
        </div>
        <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.55, flex: 1, marginBottom: 12 }}>
          {community.description || 'Join this community to connect with like-minded professionals.'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>
            👥 {community.memberCount || 0} member{community.memberCount !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => isMember ? onLeave(community.slug) : onJoin(community.slug)}
            disabled={loading}
            style={{
              padding: '7px 18px', borderRadius: 8, border: `1px solid ${isMember ? '#D1D5DB' : color}`,
              background: isMember ? '#F9FAFB' : color, color: isMember ? '#374151' : '#fff',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              if (!isMember) { e.currentTarget.style.opacity = '0.85'; }
              else { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.borderColor = '#FCA5A5'; e.currentTarget.textContent = 'Leave'; }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.opacity = '1';
              if (isMember) { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.color = '#374151'; e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.textContent = 'Joined'; }
            }}>
            {isMember ? 'Joined' : 'Join'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CommunitiesPage({ user }) {
  const [communities, setCommunities] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [actionSlug,  setActionSlug]  = useState(null);
  const [filter,      setFilter]      = useState('all'); // all | joined | tech | hr | business | design
  const [search,      setSearch]      = useState('');
  const [isMobile,    setMobile]      = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', h, { passive: true });
    return () => window.removeEventListener('resize', h);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getCommunities();
      setCommunities(r?.data || []);
    } catch { setCommunities([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleJoin = async (slug) => {
    setActionSlug(slug);
    try {
      await api.joinCommunity(slug);
      setCommunities(c => c.map(x => x.slug === slug ? { ...x, isMember: true, memberCount: (x.memberCount || 0) + 1 } : x));
    } catch {}
    finally { setActionSlug(null); }
  };

  const handleLeave = async (slug) => {
    setActionSlug(slug);
    try {
      await api.leaveCommunity(slug);
      setCommunities(c => c.map(x => x.slug === slug ? { ...x, isMember: false, memberCount: Math.max(0, (x.memberCount || 1) - 1) } : x));
    } catch {}
    finally { setActionSlug(null); }
  };

  const FILTERS = [
    { id: 'all',      label: 'All' },
    { id: 'joined',   label: '✓ Joined' },
    { id: 'tech',     label: '💻 Tech' },
    { id: 'hr',       label: '🎯 HR & Recruiting' },
    { id: 'business', label: '📈 Business' },
    { id: 'design',   label: '🎨 Design' },
  ];

  const visible = communities.filter(c => {
    if (filter === 'joined' && !c.isMember) return false;
    if (filter !== 'all' && filter !== 'joined' && c.category !== filter) return false;
    if (search.trim().length >= 2) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  const myCount = communities.filter(c => c.isMember).length;

  return (
    <div style={{ padding: isMobile ? '12px 0' : '20px clamp(12px,3vw,24px)', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20, padding: isMobile ? '0 12px' : 0 }}>
        <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 26, fontWeight: 900, color: '#0A1628', letterSpacing: '-0.02em' }}>Communities</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9CA3AF' }}>
          Join communities of professionals with shared skills and interests
          {myCount > 0 && <span style={{ color: '#0176D3', fontWeight: 600 }}> · {myCount} joined</span>}
        </p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 14, padding: isMobile ? '0 12px' : 0 }}>
        <span style={{ position: 'absolute', left: isMobile ? 24 : 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search communities…"
          style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 14, outline: 'none', background: '#FAFBFC', boxSizing: 'border-box', transition: 'border 0.15s' }}
          onFocus={e => e.currentTarget.style.border = '1px solid #0176D3'}
          onBlur={e => e.currentTarget.style.border = '1px solid #E5E7EB'} />
        {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: isMobile ? 22 : 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 18 }}>×</button>}
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', padding: isMobile ? '0 12px 4px' : '0 0 4px', scrollbarWidth: 'none' }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{ padding: '6px 16px', borderRadius: 20, border: `1px solid ${filter === f.id ? '#0176D3' : '#E5E7EB'}`, background: filter === f.id ? '#EFF6FF' : '#F9FAFB', color: filter === f.id ? '#1D4ED8' : '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.12s' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: '#9CA3AF', padding: isMobile ? '0 12px' : 0 }}>
          <div style={{ width: 36, height: 36, border: '3px solid #E5E7EB', borderTopColor: '#0176D3', borderRadius: '50%', animation: 'tn-spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Loading communities…
        </div>
      ) : visible.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '60px 24px', borderRadius: 16, margin: isMobile ? '0 12px' : 0 }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>🏘️</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#374151', marginBottom: 6 }}>
            {filter === 'joined' ? "You haven't joined any communities yet" : 'No communities found'}
          </div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 20 }}>
            {filter === 'joined' ? 'Explore and join communities that match your interests.' : 'Try a different filter or search term.'}
          </div>
          {filter !== 'all' && <button onClick={() => { setFilter('all'); setSearch(''); }} style={btnP}>View All Communities</button>}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
          padding: isMobile ? '0 12px' : 0,
        }}>
          {visible.map(c => (
            <CommunityCard
              key={c.slug}
              community={c}
              onJoin={handleJoin}
              onLeave={handleLeave}
              loading={actionSlug === c.slug}
            />
          ))}
        </div>
      )}

      <style>{`@keyframes tn-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
