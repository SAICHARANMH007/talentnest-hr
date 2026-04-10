import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MarketingNav from './MarketingNav.jsx';
import MarketingFooter from './MarketingFooter.jsx';
import { BLOGS, CATEGORIES as STATIC_CATEGORIES } from '../../data/blogs.js';
import api from '../../api/api.js';
import { useMarketingTheme } from '../../context/MarketingThemeContext.jsx';

export default function BlogPage() {
  const { theme, themeId } = useMarketingTheme();
  const [active, setActive]     = useState('All');
  const [search, setSearch]     = useState('');
  const [apiBlogs, setApiBlogs] = useState(null); // null = not loaded yet

  useEffect(() => {
    if (!document.getElementById('marketing-css')) {
      const link = document.createElement('link');
      link.id = 'marketing-css'; link.rel = 'stylesheet'; link.href = '/marketing.css';
      document.head.appendChild(link);
    }
    // Try to load published blogs from API; fallback to static on error
    api.getPublicBlogs()
      .then(r => {
        const list = Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : [];
        if (list.length > 0) setApiBlogs(list);
      })
      .catch(() => {}); // silently fallback to static
  }, []);

  // Merge: API blogs first (if any), then static blogs not duplicated by slug
  const apiSlugs = new Set((apiBlogs || []).map(b => b.slug));
  const ALL_BLOGS = [
    ...(apiBlogs || []),
    ...BLOGS.filter(b => !apiSlugs.has(b.slug)),
  ];

  const CATEGORIES = ['All', ...Array.from(new Set([
    ...STATIC_CATEGORIES,
    ...(apiBlogs || []).map(b => b.category).filter(Boolean),
  ]))];

  const filtered = ALL_BLOGS.filter(b => {
    const q = search.toLowerCase();
    const matchCat = active === 'All' || b.category === active;
    const matchSearch = !q || b.title?.toLowerCase().includes(q) || b.excerpt?.toLowerCase().includes(q) || (b.tags || []).some(t => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const featured = ALL_BLOGS[0];

  return (
    <div className="mkt-page" style={{ fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", background: 'var(--mkt-section-bg)', color: 'var(--mkt-text)' }}>
      <MarketingNav active="blog" />

      {/* ── HERO ── */}
      <section style={{ 
        background: 'linear-gradient(135deg, rgba(3,17,38,0.96) 0%, rgba(1,36,86,0.92) 100%)', 
        padding: '160px 0 80px', 
        textAlign: 'center', 
        position: 'relative', 
        overflow: 'hidden' 
      }}>
        <div className="container" style={{ position: 'relative' }}>
          <span className="section-tag" style={{ background: 'rgba(255,255,255,0.12)', color: 'var(--mkt-accent)', border: '1px solid rgba(var(--mkt-accent-rgb), 0.4)', backdropFilter: 'blur(8px)' }}>
            📚 HR Insights Blog
          </span>
          <h1 style={{ color: 'var(--mkt-text-on-dark, #fff)', fontSize: 'clamp(2.5rem,6vw,4rem)', fontWeight: 900, margin: '20px 0 20px', lineHeight: 1.05, letterSpacing: '-0.04em' }}>
            Expert Insights on<br />
            <span style={{ background: 'linear-gradient(90deg, var(--mkt-accent), #fff)', display: 'inline-block', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Talent & Technology
            </span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.2rem', maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.7 }}>
            Practical hiring guides, staffing insights, and HR technology advice — written by practitioners.
          </p>
          {/* Search */}
          <div style={{ maxWidth: 540, margin: '0 auto', position: 'relative' }}>
            <span style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem', opacity: 0.7 }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search articles, topics, keywords…"
              style={{ width: '100%', padding: '16px 20px 16px 56px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', backdropFilter: 'blur(12px)', transition: 'all 0.3s' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(255,255,255,0.5)'; e.target.style.background = 'rgba(255,255,255,0.15)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.2)'; e.target.style.background = 'rgba(255,255,255,0.1)'; }}
            />
          </div>
        </div>
      </section>

      {/* ── FEATURED POST ── */}
      <section className="mkt-section-light" style={{ padding: '80px 0 0' }}>
        <div className="container">
          <div style={{ marginBottom: 12 }}>
            <span className="section-tag">⭐ Featured Article</span>
          </div>
          <Link to={`/blog/${featured.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
            <div
              className="mkt-card"
              style={{ background: 'var(--mkt-dark)', borderRadius: 24, padding: '48px', display: 'flex', gap: 48, alignItems: 'center', flexWrap: 'wrap', cursor: 'pointer', border: `1px solid var(--mkt-card-border)`, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}
            >
              <div style={{ width: 120, height: 120, borderRadius: 24, background: `rgba(var(--mkt-accent-rgb), 0.15)`, border: `1px solid rgba(var(--mkt-accent-rgb), 0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem', flexShrink: 0 }}>
                {featured.coverEmoji}
              </div>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
                  <span style={{ background: `rgba(var(--mkt-accent-rgb), 0.2)`, color: 'var(--mkt-accent)', border: `1px solid rgba(var(--mkt-accent-rgb), 0.3)`, fontSize: '0.75rem', fontWeight: 800, padding: '4px 14px', borderRadius: 50, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{featured.category}</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontWeight: 600 }}>{featured.date} · {featured.readTime}</span>
                </div>
                <h2 style={{ color: '#fff', fontSize: 'clamp(1.5rem,3vw,2.2rem)', fontWeight: 900, marginBottom: 16, lineHeight: 1.1, letterSpacing: '-0.03em' }}>{featured.title}</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.05rem', lineHeight: 1.7, margin: 0 }}>{featured.excerpt}</p>
                <div style={{ marginTop: 24, color: 'var(--mkt-accent)', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>Read Full Article <span style={{ fontSize: '1.2rem' }}>→</span></div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ── CATEGORY FILTER ── */}
      <section className="mkt-section-light" style={{ padding: '48px 0 0' }}>
        <div className="container">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                style={{
                  padding: '10px 24px', borderRadius: 50, border: `2px solid ${active === cat ? 'var(--mkt-primary)' : 'var(--mkt-card-border)'}`,
                  background: active === cat ? 'var(--mkt-primary)' : 'var(--mkt-card-bg)', color: active === cat ? '#fff' : 'var(--mkt-text)',
                  fontSize: '0.875rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.25s', boxShadow: active === cat ? '0 4px 12px rgba(var(--mkt-primary-rgb), 0.3)' : 'none'
                }}
                onMouseEnter={e => { if (active !== cat) e.target.style.borderColor = 'var(--mkt-primary)'; }}
                onMouseLeave={e => { if (active !== cat) e.target.style.borderColor = 'var(--mkt-card-border)'; }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── BLOG GRID ── */}
      <section className="section mkt-section-light" style={{ paddingTop: 40, paddingBottom: 100 }}>
        <div className="container">
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 80 }}>
              <p style={{ color: theme.textMuted, fontSize: 15 }}>No articles match your search. Try different keywords.</p>
              <button onClick={() => { setSearch(''); setActive('All'); }} className="btn btn-primary" style={{ marginTop: 16 }}>
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <p style={{ color: 'var(--mkt-text-muted)', fontSize: '0.9rem', fontWeight: 700, marginBottom: 32 }}>
                Showing <b style={{ color: 'var(--mkt-text-heading)' }}>{filtered.length}</b> articles
              </p>
              <div className="grid-3" style={{ alignItems: 'stretch' }}>
                {filtered.map(b => (
                  <Link key={b.slug} to={`/blog/${b.slug}`} style={{ textDecoration: 'none' }}>
                    <article
                      className="mkt-card"
                      style={{ background: 'var(--mkt-card-bg)', borderRadius: 24, border: `1px solid var(--mkt-card-border)`, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}
                    >
                      {/* 200px image strip */}
                      <div style={{ height: 200, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                        {b.coverImage ? (
                          <img
                            src={b.coverImage}
                            alt={b.title}
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg,${b.accent}15,${b.accent}30)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                            {b.coverEmoji}
                          </div>
                        )}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.45) 100%)' }} />
                        {/* Category badge overlay */}
                        <span style={{ position: 'absolute', top: 12, left: 12, background: b.accent || theme.primary, color: 'white', fontSize: '0.68rem', fontWeight: 700, padding: '4px 12px', borderRadius: 50 }}>
                          {b.category}
                        </span>
                        {/* Emoji on image */}
                        <div style={{ position: 'absolute', bottom: 12, right: 12, width: 40, height: 40, borderRadius: 10, background: `${b.accent || theme.primary}cc`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', backdropFilter: 'blur(8px)' }}>
                          {b.coverEmoji}
                        </div>
                      </div>
                      {/* Content */}
                      <div style={{ padding: '32px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ color: 'var(--mkt-text-muted)', fontSize: '0.8rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>📅 {b.date}</span>
                          <span style={{ opacity: 0.5 }}>•</span>
                          <span>⏱️ {b.readTime}</span>
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--mkt-text-heading)', lineHeight: 1.3, marginBottom: 16, flex: 1, letterSpacing: '-0.02em' }}>{b.title}</h3>
                        <p style={{ color: 'var(--mkt-text)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: 24 }}>
                          {b.excerpt.length > 120 ? b.excerpt.slice(0, 120) + '…' : b.excerpt}
                        </p>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
                          {(b.tags || []).slice(0, 3).map(t => (
                            <span key={t} style={{ background: 'var(--mkt-surface-bg)', color: 'var(--mkt-text-muted)', border: `1px solid var(--mkt-card-border)`, fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: 50 }}>
                              {t}
                            </span>
                          ))}
                        </div>
                        <div style={{ color: b.accent || 'var(--mkt-primary)', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>Read Article <span style={{ fontSize: '1.1rem' }}>→</span></div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: 'linear-gradient(135deg, rgba(3,17,38,0.98) 0%, rgba(1,36,86,0.94) 100%)', padding: '80px 0', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ color: '#fff', fontSize: '2.2rem', fontWeight: 900, marginBottom: 12, letterSpacing: '-0.02em' }}>Ready to Hire Better?</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 32, maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.7, fontSize: '1.05rem' }}>
            Put these insights to work. Talk to a TalentNest specialist about your next hire.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/contact" className="btn btn-primary btn-lg">Start a Conversation →</Link>
            <Link to="/contact" className="btn btn-secondary btn-lg">View Our Services</Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
