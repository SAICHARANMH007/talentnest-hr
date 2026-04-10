import React, { useEffect, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import MarketingNav from './MarketingNav.jsx';
import MarketingFooter from './MarketingFooter.jsx';
import { BLOGS } from '../../data/blogs.js';
import api from '../../api/api.js';
import { useMarketingTheme } from '../../context/MarketingThemeContext.jsx';

export default function BlogPostPage() {
  const { theme, themeId } = useMarketingTheme();
  const { slug } = useParams();
  const [post, setPost]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!document.getElementById('marketing-css')) {
      const link = document.createElement('link');
      link.id = 'marketing-css'; link.rel = 'stylesheet'; link.href = '/marketing.css';
      document.head.appendChild(link);
    }
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);

    // Try API first, fall back to static
    api.getPublicBlog(slug)
      .then(r => {
        const data = r?.data || r;
        if (data && data.slug) {
          setPost(data);
        } else {
          throw new Error('not found');
        }
      })
      .catch(() => {
        const staticPost = BLOGS.find(b => b.slug === slug);
        if (staticPost) {
          setPost(staticPost);
        } else {
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="mkt-page" style={{ fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", background: 'var(--mkt-section-bg)', color: 'var(--mkt-text)' }}>
        <MarketingNav active="blog" />
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--mkt-text-muted)', fontSize: 15, fontWeight: 700 }}>Loading article…</div>
        </div>
        <MarketingFooter />
      </div>
    );
  }

  if (notFound || !post) return <Navigate to="/blog" replace />;

  const related = BLOGS.filter(b => b.slug !== slug && b.category === post.category).slice(0, 3);
  const accent = post.accent || theme.primary;

  return (
    <div className="mkt-page" style={{ fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", background: 'var(--mkt-section-bg)', color: 'var(--mkt-text)' }}>
      <MarketingNav active="blog" />

      {/* ── HERO ── */}
      <section style={{ background: 'linear-gradient(135deg, rgba(3,17,38,0.96) 0%, rgba(1,36,86,0.92) 100%)', padding: '160px 0 60px' }}>
        <div className="container" style={{ maxWidth: 860, margin: '0 auto' }}>
          <Link to="/blog" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none', marginBottom: 28, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateX(-4px)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.transform = 'translateX(0)'; }}
          >
            ← Back to Blog
          </Link>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ background: 'rgba(var(--mkt-accent-rgb), 0.2)', color: 'var(--mkt-accent)', fontSize: '0.75rem', fontWeight: 800, padding: '4px 14px', borderRadius: 50, border: '1px solid rgba(var(--mkt-accent-rgb), 0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {post.category}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: 600 }}>
              {post.date || (post.createdAt ? new Date(post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '')}
              {post.readTime ? ` · ${post.readTime}` : ''}
            </span>
          </div>
          <h1 style={{ color: '#fff', fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 24, letterSpacing: '-0.04em' }}>
            {post.title}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.25rem', lineHeight: 1.7, maxWidth: 750, fontWeight: 500 }}>
            {post.excerpt}
          </p>
          {/* Tags */}
          {post.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
              {post.tags.map(t => (
                <span key={t} style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 700, padding: '4px 14px', borderRadius: 50, border: '1px solid rgba(255,255,255,0.2)' }}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── ARTICLE BODY ── */}
      <section className="mkt-section-light" style={{ padding: '80px 0 100px' }}>
        <div className="container" style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* Cover emoji accent */}
          <div style={{ width: 100, height: 100, borderRadius: 24, background: `rgba(var(--mkt-accent-rgb), 0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', marginBottom: 48, border: `1px solid var(--mkt-card-border)`, boxShadow: '0 8px 24px rgba(0,0,0,0.05)' }}>
            {post.coverEmoji || '📝'}
          </div>

          {(post.sections || []).map((section, i) => (
            <div key={i} style={{ marginBottom: 48 }}>
              {section.heading && (
                <h2 style={{
                  fontSize: 'clamp(1.5rem,3vw,1.8rem)',
                  fontWeight: 900,
                  color: 'var(--mkt-text-heading)',
                  lineHeight: 1.15,
                  marginBottom: 24,
                  paddingLeft: 20,
                  borderLeft: `5px solid ${accent}`,
                  letterSpacing: '-0.03em'
                }}>
                  {section.heading}
                </h2>
              )}
              {(section.body || '').split('\n\n').map((para, j) => {
                if (!para.trim()) return null;
                // Detect bullet list format (lines starting with •)
                if (para.includes('\n•') || para.startsWith('•')) {
                  const lines = para.split('\n');
                  return (
                    <div key={j}>
                      {lines.map((line, k) => {
                        if (line.startsWith('•')) {
                          return (
                            <div key={k} style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent, marginTop: 10, flexShrink: 0, boxShadow: `0 0 10px ${accent}` }} />
                              <p style={{ color: 'var(--mkt-text)', fontSize: '1.1rem', lineHeight: 1.8, margin: 0 }}>{line.slice(1).trim()}</p>
                            </div>
                          );
                        }
                        return line.trim() ? <p key={k} style={{ color: 'var(--mkt-text)', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: 12 }}>{line}</p> : null;
                      })}
                    </div>
                  );
                }
                // Numbered list detection
                if (/^\d+\./.test(para)) {
                  const lines = para.split('\n');
                  return (
                    <div key={j} style={{ marginBottom: 8 }}>
                      {lines.map((line, k) => {
                        const match = line.match(/^(\d+)\.\s*(.*)/);
                        if (match) {
                          return (
                            <div key={k} style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
                              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(var(--mkt-primary-rgb), 0.1)', color: 'var(--mkt-primary)', fontSize: '1rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, border: '1px solid rgba(var(--mkt-primary-rgb), 0.2)' }}>{match[1]}</div>
                              <p style={{ color: 'var(--mkt-text)', fontSize: '1.1rem', lineHeight: 1.8, margin: 0 }}>{match[2]}</p>
                            </div>
                          );
                        }
                        return line.trim() ? <p key={k} style={{ color: 'var(--mkt-text)', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: 12 }}>{line}</p> : null;
                      })}
                    </div>
                  );
                }
                return (
                  <p key={j} style={{ color: 'var(--mkt-text)', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: 16 }}>
                    {para}
                  </p>
                );
              })}
              {i < (post.sections || []).length - 1 && (
                <div style={{ height: 1, background: 'var(--mkt-card-border)', marginTop: 32, marginBottom: 48 }} />
              )}
            </div>
          ))}

          {/* CTA Box */}
          <div className="mkt-card" style={{ background: 'linear-gradient(135deg, rgba(3,17,38,0.98) 0%, rgba(1,36,86,0.94) 100%)', borderRadius: 24, padding: '56px 48px', marginTop: 100, textAlign: 'center', border: '1px solid var(--mkt-card-border)', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 20 }}>🚀</div>
            <h3 style={{ color: '#fff', fontWeight: 900, fontSize: '2rem', marginBottom: 16, letterSpacing: '-0.03em' }}>
              Put These Insights Into Action
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.15rem', marginBottom: 40, lineHeight: 1.7, maxWidth: 540, margin: '0 auto 40px' }}>
              TalentNest HR specialises in exactly what this article covers. Talk to our team about your hiring challenge.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/contact" className="btn btn-primary btn-lg">Start a Conversation →</Link>
              <Link to="/contact" className="btn btn-secondary btn-lg">View Our Services</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── RELATED ARTICLES ── */}
      {related.length > 0 && (
        <section className="section mkt-section-light" style={{ paddingTop: 60, borderTop: '1px solid var(--mkt-card-border)' }}>
          <div className="container">
            <div className="section-header" style={{ marginBottom: 48 }}>
              <span className="section-tag">📖 Related Reading</span>
              <h2 className="section-title" style={{ color: 'var(--mkt-text-heading)' }}>More on <span>{post.category}</span></h2>
            </div>
            <div className="grid-3" style={{ alignItems: 'stretch' }}>
              {related.map(b => (
                <Link key={b.slug} to={`/blog/${b.slug}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column' }}>
                  <div
                    className="mkt-card"
                    style={{ background: 'var(--mkt-card-bg)', borderRadius: 24, padding: '32px', border: `1px solid var(--mkt-card-border)`, display: 'flex', flexDirection: 'column', flex: 1, boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}
                  >
                    <div style={{ fontSize: '2.8rem', marginBottom: 20 }}>{b.coverEmoji}</div>
                    <span style={{ color: b.accent || 'var(--mkt-primary)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{b.category} · {b.readTime}</span>
                    <h4 style={{ fontWeight: 900, color: 'var(--mkt-text-heading)', fontSize: '1.2rem', margin: '12px 0 16px', lineHeight: 1.3, letterSpacing: '-0.02em' }}>{b.title}</h4>
                    <div style={{ color: b.accent || 'var(--mkt-primary)', fontWeight: 800, fontSize: '0.95rem', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>Read Article <span style={{ fontSize: '1.1rem' }}>→</span></div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <MarketingFooter />
    </div>
  );
}
