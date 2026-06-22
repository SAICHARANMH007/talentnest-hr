'use strict';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  design  : 'Design',
  other   : 'Other',
};

function normalizeCollege(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function CommunityCard({ community, userCollege, onJoin, onLeave, loading, onNavigate }) {
  const isMember = community.isMember;
  const color    = community.coverColor || CATEGORY_COLOR[community.category] || '#0176D3';
  const [btnHover, setBtnHover] = useState(false);

  const isAutoMember = community.isOwnCollege || (!!community.collegeName && normalizeCollege(community.collegeName) === normalizeCollege(userCollege));

  const btnLabel = loading ? '…' : isMember ? (btnHover ? 'Leave' : 'Joined') : 'Join';
  const btnStyle = isMember
    ? btnHover
      ? { bg: '#FEF2F2', color: '#DC2626', border: '#FCA5A5' }
      : { bg: '#F9FAFB', color: '#374151', border: '#D1D5DB' }
    : { bg: color, color: '#fff', border: color };

  return (
    <div
      onClick={() => onNavigate(community.slug)}
      style={{ ...card, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: isMember ? `2px solid ${color}33` : '1px solid #F1F5F9', transition: 'box-shadow 0.2s, transform 0.15s', cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}>

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500, flexShrink: 0 }}>
            👥 {community.memberCount || 0}
          </span>
          {isAutoMember ? (
            <span style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#F9FAFB', color: '#374151', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
              🎓 Your College
            </span>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); isMember ? onLeave(community.slug) : onJoin(community.slug); }}
              disabled={loading}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
              style={{
                padding: '7px 14px', borderRadius: 8,
                border: `1px solid ${btnStyle.border}`,
                background: btnStyle.bg, color: btnStyle.color,
                fontSize: 12, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s', whiteSpace: 'nowrap', minWidth: 58,
              }}>
              {btnLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const canCreate = (role) => ['admin','super_admin','superadmin','recruiter'].includes(role);

function CreateCommunityModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', description: '', icon: '💬', category: 'other', coverColor: '#0176D3' });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');
  const ICONS = ['💬','💡','🚀','🎯','🏆','🌐','🔬','📚','🎨','⚡','🤝','📈','🎓','🏅','🌱','💼','🔧','🌍'];
  const COLORS = ['#0176D3','#059669','#7C3AED','#D97706','#EC4899','#0891B2','#DC2626','#374151'];

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Name is required.'); return; }
    setSaving(true); setErr('');
    try {
      const r = await api.createCommunity(form);
      onCreate(r?.data || r);
      onClose();
    } catch(ex) { setErr(ex?.message || 'Failed to create community.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 800, color: '#0A1628' }}>Create Community</h2>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Community Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. AI Engineers Network" style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #D1D5DB', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What's this community about?" rows={2} style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #D1D5DB', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}>
              <option value="tech">💻 Technology</option>
              <option value="hr">🎯 HR & Recruiting</option>
              <option value="business">📈 Business</option>
              <option value="design">🎨 Design</option>
              <option value="other">🌍 Other</option>
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Icon</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => setForm(f => ({ ...f, icon: ic }))} style={{ width: 36, height: 36, fontSize: 20, borderRadius: 8, border: form.icon === ic ? '2px solid #0176D3' : '1px solid #E5E7EB', background: form.icon === ic ? '#EFF6FF' : '#F9FAFB', cursor: 'pointer' }}>{ic}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Cover Color</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {COLORS.map(col => (
                <button key={col} type="button" onClick={() => setForm(f => ({ ...f, coverColor: col }))} style={{ width: 28, height: 28, borderRadius: '50%', background: col, border: form.coverColor === col ? '3px solid #0A1628' : '2px solid #fff', outline: form.coverColor === col ? '2px solid #0176D3' : 'none', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          {err && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid #D1D5DB', background: '#F9FAFB', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: '#0176D3', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Creating…' : 'Create Community'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const isSuperAdmin = (role) => ['super_admin', 'superadmin'].includes(role);

// ── Google-style Search Suggestions ──────────────────────────────────────────
function SearchSuggestions({ communities, search, onSelect, selectedIndex }) {
  if (!search.trim() || search.trim().length < 1) return null;
  const q = search.toLowerCase();
  const words = q.split(/\s+/).filter(w => w.length >= 1);
  const suggestions = communities
    .filter(c => {
      const hay = [c.name, c.description, c.companyName, c.collegeName]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q) || words.some(w => hay.includes(w));
    })
    .slice(0, 8);

  if (!suggestions.length) return (
    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 200, padding: '10px 14px', fontSize: 13, color: '#9CA3AF' }}>
      No communities found for "{search}"
    </div>
  );

  return (
    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 200, overflow: 'hidden' }}>
      {suggestions.map((c, i) => {
        const color = c.coverColor || CATEGORY_COLOR[c.category] || '#0176D3';
        const isActive = i === selectedIndex;
        const badge = c.companyName ? '🏢 Company' : c.collegeName ? '🎓 College' : CATEGORY_LABEL[c.category] || 'Community';
        return (
          <div key={c.slug} onMouseDown={() => onSelect(c)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', cursor: 'pointer', background: isActive ? '#F0F7FF' : '#fff', borderBottom: i < suggestions.length - 1 ? '1px solid #F5F7FA' : 'none', transition: 'background 0.1s' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {c.icon || '💬'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0A1628', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color, background: color + '18', borderRadius: 20, padding: '1px 7px' }}>{badge}</span>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>👥 {c.memberCount || 0}</span>
                {c.isMember && <span style={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>✓ Joined</span>}
              </div>
            </div>
            <span style={{ fontSize: 13, color: '#C7D2FE', flexShrink: 0 }}>↵</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Page Component ────────────────────────────────────────────────────────────
export default function CommunitiesPage({ user }) {
  const navigate     = useNavigate();
  const [searchParams] = useSearchParams();
  const [communities, setCommunities] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [actionSlug,  setActionSlug]  = useState(null);
  const [filter,      setFilter]      = useState(() => searchParams.get('filter') || 'all');
  const [search,      setSearch]      = useState(() => searchParams.get('search') || '');
  const [showCreate,  setShowCreate]  = useState(false);
  const [isMobile,    setMobile]      = useState(() => window.innerWidth < 768);
  const [isSmallPhone, setSmallPhone] = useState(() => window.innerWidth < 500);
  const [merging,     setMerging]     = useState(false);
  const [mergeMsg,    setMergeMsg]    = useState('');
  // Search suggestions
  const [showSugg,    setShowSugg]    = useState(false);
  const [suggIndex,   setSuggIndex]   = useState(-1);
  const searchWrapRef                 = useRef(null);
  // Infinite scroll
  const [visibleCount, setVisibleCount] = useState(24);
  const sentinelRef                   = useRef(null);

  useEffect(() => {
    const h = () => { setMobile(window.innerWidth < 768); setSmallPhone(window.innerWidth < 500); };
    window.addEventListener('resize', h, { passive: true });
    return () => window.removeEventListener('resize', h);
  }, []);

  const load = useCallback(async () => {
    const CACHE_KEY = 'tn_communities_v1';
    const CACHE_TTL = 60_000;
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached?.data?.length && Date.now() - (cached.at || 0) < CACHE_TTL) {
          setCommunities(cached.data);
          setLoading(false);
          api.getCommunities()
            .then(r => {
              const fresh = r?.data || [];
              setCommunities(fresh);
              sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: fresh, at: Date.now() }));
            })
            .catch(() => {});
          return;
        }
      }
    } catch {}
    setLoading(true);
    try {
      const r = await api.getCommunities();
      const data = r?.data || [];
      setCommunities(data);
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, at: Date.now() })); } catch {}
    } catch { setCommunities([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reset visible count when filter/search changes
  useEffect(() => { setVisibleCount(24); }, [filter, search]);

  // Infinite scroll — reveal next 24 cards when sentinel enters viewport
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setVisibleCount(c => c + 24);
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loading]);

  // Close suggestions when clicking outside the search wrapper
  useEffect(() => {
    const handler = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setShowSugg(false);
        setSuggIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  const handleSelectSuggestion = (community) => {
    setShowSugg(false);
    setSuggIndex(-1);
    navigate(community.slug);
  };

  // Build the current suggestions list (for keyboard nav)
  const suggestionList = (() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    const words = q.split(/\s+/).filter(w => w.length >= 1);
    return communities.filter(c => {
      const hay = [c.name, c.description, c.companyName, c.collegeName]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q) || words.some(w => hay.includes(w));
    }).slice(0, 8);
  })();

  const handleKeyDown = (e) => {
    if (!showSugg || !suggestionList.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggIndex(i => Math.min(i + 1, suggestionList.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggIndex >= 0 && suggestionList[suggIndex]) {
        handleSelectSuggestion(suggestionList[suggIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSugg(false);
      setSuggIndex(-1);
    }
  };

  const FILTERS = [
    { id: 'all',      label: 'All' },
    { id: 'joined',   label: '✓ Joined' },
    { id: 'college',  label: '🎓 Colleges' },
    { id: 'company',  label: '🏢 Companies' },
    { id: 'tech',     label: '💻 Tech' },
    { id: 'hr',       label: '🎯 HR & Recruiting' },
    { id: 'business', label: '📈 Business' },
    { id: 'design',   label: '🎨 Design' },
    { id: 'other',    label: '🌍 Other' },
  ];

  // Build filtered + deduplicated list
  // For the company filter: keep only one community per company name (highest memberCount)
  let visible = communities.filter(c => {
    if (filter === 'joined' && !c.isMember) return false;
    if (filter === 'college' && !c.collegeName) return false;
    if (filter === 'company' && !c.companyName) return false;
    if (!['all', 'joined', 'college', 'company'].includes(filter) && c.category !== filter) return false;
    if (search.trim().length >= 1) {
      const q = search.toLowerCase();
      const searchable = [c.name, c.description, c.companyName, c.collegeName]
        .filter(Boolean).map(s => s.toLowerCase()).join(' ');
      const words = q.split(/\s+/).filter(w => w.length >= 1);
      return searchable.includes(q) || words.some(w => searchable.includes(w));
    }
    return true;
  });

  // Deduplicate companies: one community per companyName
  if (filter === 'company') {
    const seen = new Map();
    visible = visible.filter(c => {
      const key = (c.companyName || '').toLowerCase().trim();
      if (!key) return true;
      const existing = seen.get(key);
      if (!existing || (c.memberCount || 0) > (existing.memberCount || 0)) {
        seen.set(key, c);
        return true;
      }
      return false;
    });
  }

  const myCount = communities.filter(c => c.isMember).length;
  const totalCount = communities.length;

  const handleMergeDuplicates = async () => {
    setMerging(true); setMergeMsg('');
    try {
      const r = await api.mergeDuplicateCommunities();
      setMergeMsg(r?.message || 'Done.');
      await load();
    } catch (e) {
      setMergeMsg(e?.message || 'Merge failed.');
    } finally { setMerging(false); }
  };

  return (
    <div style={{ padding: isMobile ? '12px 0' : '20px clamp(12px,3vw,24px)', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20, padding: isMobile ? '0 12px' : 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 26, fontWeight: 900, color: '#0A1628', letterSpacing: '-0.02em' }}>Communities</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9CA3AF' }}>
            {totalCount > 0 ? `${totalCount} communities` : 'Join communities of professionals with shared skills and interests'}
            {myCount > 0 && <span style={{ color: '#0176D3', fontWeight: 600 }}> · {myCount} joined</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {isSuperAdmin(user?.role) && (
            <button onClick={handleMergeDuplicates} disabled={merging}
              style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid #D1D5DB', background: '#F9FAFB', color: '#374151', fontSize: 12, fontWeight: 700, cursor: merging ? 'not-allowed' : 'pointer', flexShrink: 0, whiteSpace: 'nowrap', opacity: merging ? 0.7 : 1 }}>
              {merging ? '⏳ Merging…' : '🔧 Fix Duplicates'}
            </button>
          )}
          {canCreate(user?.role) && (
            <button onClick={() => setShowCreate(true)} style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: '#0176D3', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
              + Create Community
            </button>
          )}
        </div>
        {mergeMsg && (
          <div style={{ width: '100%', background: mergeMsg.includes('failed') ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${mergeMsg.includes('failed') ? '#FECACA' : '#BBF7D0'}`, borderRadius: 8, padding: '8px 14px', fontSize: 12, color: mergeMsg.includes('failed') ? '#DC2626' : '#166534', marginTop: 4 }}>
            {mergeMsg}
          </div>
        )}
      </div>

      {/* Search — Google-style with suggestions dropdown */}
      <div ref={searchWrapRef} style={{ position: 'relative', marginBottom: 14, padding: isMobile ? '0 12px' : 0 }}>
        <span style={{ position: 'absolute', left: isMobile ? 24 : 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none', zIndex: 1 }}>🔍</span>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setShowSugg(true); setSuggIndex(-1); }}
          onFocus={() => { if (search.trim()) setShowSugg(true); }}
          onKeyDown={handleKeyDown}
          placeholder="Search communities, companies, colleges…"
          autoComplete="off"
          style={{ width: '100%', padding: '11px 40px 11px 36px', borderRadius: showSugg && suggestionList.length ? '12px 12px 0 0' : 12, border: showSugg ? '1px solid #0176D3' : '1px solid #E5E7EB', fontSize: 14, outline: 'none', background: '#FAFBFC', boxSizing: 'border-box', transition: 'border 0.15s, border-radius 0.15s', boxShadow: showSugg ? '0 0 0 3px #0176D315' : 'none' }}
        />
        {search && (
          <button onClick={() => { setSearch(''); setShowSugg(false); setSuggIndex(-1); }}
            style={{ position: 'absolute', right: isMobile ? 22 : 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 18, zIndex: 1 }}>×</button>
        )}
        {/* Suggestions dropdown */}
        {showSugg && search.trim() && (
          <SearchSuggestions
            communities={communities}
            search={search}
            onSelect={handleSelectSuggestion}
            selectedIndex={suggIndex}
          />
        )}
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

      {/* Grid with infinite scroll */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#9CA3AF', padding: isMobile ? '0 12px' : '60px 24px' }}>
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
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isSmallPhone ? '1fr' : isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
            padding: isMobile ? '0 12px' : 0,
          }}>
            {visible.slice(0, visibleCount).map(c => (
              <CommunityCard
                key={c.slug}
                community={c}
                userCollege={user?.college}
                onJoin={handleJoin}
                onLeave={handleLeave}
                loading={actionSlug === c.slug}
                onNavigate={(slug) => navigate(slug)}
              />
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          {visibleCount < visible.length && (
            <div ref={sentinelRef} style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
              <div style={{ width: 24, height: 24, border: '3px solid #E5E7EB', borderTopColor: '#0176D3', borderRadius: '50%', animation: 'tn-spin 0.8s linear infinite' }} />
            </div>
          )}
          {/* End of list marker */}
          {visibleCount >= visible.length && visible.length > 24 && (
            <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: '#D1D5DB' }}>
              — all {visible.length} communities shown —
            </div>
          )}
        </>
      )}

      <style>{`@keyframes tn-spin { to { transform: rotate(360deg); } }`}</style>

      {showCreate && (
        <CreateCommunityModal
          onClose={() => setShowCreate(false)}
          onCreate={(newCommunity) => {
            setCommunities(prev => [{ ...newCommunity, isMember: true }, ...prev]);
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}
