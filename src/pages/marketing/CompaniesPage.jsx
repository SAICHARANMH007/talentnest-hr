import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MarketingNav from './MarketingNav.jsx';
import MarketingFooter from './MarketingFooter.jsx';
import { useMarketingTheme } from '../../context/MarketingThemeContext.jsx';
import { API_BASE_URL } from '../../api/config.js';

const INDUSTRY_ICONS = { 
  Technology: '💻', 
  Finance: '💰', 
  Healthcare: '🏥', 
  Education: '🎓', 
  Manufacturing: '🏭', 
  Retail: '🛒', 
  Media: '📺', 
  Consulting: '💼', 
  Logistics: '🚚', 
  default: '🏢' 
};

export default function CompaniesPage() {
  const { theme } = useMarketingTheme();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!document.getElementById('marketing-css')) {
      const link = document.createElement('link');
      link.id = 'marketing-css'; link.rel = 'stylesheet'; link.href = '/marketing.css';
      document.head.appendChild(link);
    }
    window.scrollTo(0, 0);

    fetch(`${API_BASE_URL}/jobs/public`)
      .then(r => r.json())
      .then(jobsData => {
        const jobsArr = Array.isArray(jobsData) ? jobsData : [];
        setJobs(jobsArr);
        const map = {};
        jobsArr.forEach(j => {
          const key = j.company || 'Unknown';
          if (!map[key]) {
            map[key] = {
              name: key,
              industry: j.industry || 'Technology',
              location: j.location || 'Multiple Locations',
              logo: j.logo || '',
              jobs: [],
              desc: `Leading innovator in ${j.industry || 'Technology'} sectors, focused on scale and impact.`,
              tags: [j.industry || 'Tech', 'Active Hiring', 'Growth']
            };
          }
          map[key].jobs.push(j);
        });
        setCompanies(Object.values(map).sort((a, b) => b.jobs.length - a.jobs.length));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const allIndustries = [...new Set(companies.map(c => c.industry).filter(Boolean))];

  const filteredCompanies = companies.filter(c => {
    const matchesIndustry = !selectedIndustry || c.industry === selectedIndustry;
    const matchesSearch = !searchQuery || 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.industry.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesIndustry && matchesSearch;
  });

  return (
    <div className="mkt-page" style={{ 
      fontFamily: "var(--font-primary)", 
      background: "var(--mkt-section-bg)", 
      color: "var(--mkt-text)",
      minHeight: '100vh',
    }}>
      <MarketingNav active="companies" />

      {/* Hero */}
      <section style={{ 
        background: "var(--mkt-darker)",
        padding: '160px 24px 100px', 
        textAlign: 'center', 
        position: 'relative', 
        overflow: 'hidden' 
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(3,45,96,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div className="container mkt-reveal">
          <span className="section-tag">Partner Network</span>
          <h1 style={{ fontSize: 'clamp(2.2rem, 6vw, 3.8rem)', fontWeight: 900, color: '#fff', margin: '16px 0 24px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            Trusted by <span className="mkt-gradient-text">Leading Organizations</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', maxWidth: 640, margin: '0 auto 48px', lineHeight: 1.7 }}>
            We partner with innovative startups and Fortune 500 giants to solve their most complex technical and executive hiring challenges.
          </p>

          {/* Search Box */}
          <div style={{ maxWidth: 700, margin: '0 auto', position: 'relative' }}>
            <div className="mkt-glass" style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 8px 8px 24px',
              borderRadius: 100,
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: 'var(--shadow-xl)',
              background: 'rgba(255,255,255,0.03)',
            }}>
              <span style={{ fontSize: '1.3rem', marginRight: 14 }}>🔍</span>
              <input
                type="text"
                placeholder="Search companies by name or industry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: '1.05rem',
                  fontWeight: 500,
                  height: 48
                }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', padding: '0 16px', cursor: 'pointer', fontSize: '1.3rem' }}>×</button>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
              <button
                onClick={() => setSelectedIndustry('')}
                style={{
                  background: !selectedIndustry ? 'var(--mkt-primary)' : 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '8px 20px',
                  borderRadius: 100,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                All Industries
              </button>
              {allIndustries.slice(0, 5).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedIndustry(cat)}
                  style={{
                    background: selectedIndustry === cat ? 'var(--mkt-primary)' : 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '8px 20px',
                    borderRadius: 100,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {INDUSTRY_ICONS[cat] || '🏢'} {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section style={{ padding: '80px 24px 120px' }}>
        <div className="container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--mkt-text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 16 }}>⏳</div>
              <p>Discovering top companies...</p>
            </div>
          ) : filteredCompanies.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 32 }}>
              {filteredCompanies.map((company, i) => (
                <div
                  key={company.name}
                  className="mkt-card-hover mkt-reveal-delayed"
                  style={{
                    background: 'var(--mkt-card-bg)',
                    border: '1px solid var(--mkt-card-border)',
                    borderRadius: 24,
                    padding: 32,
                    display: 'flex',
                    flexDirection: 'column',
                    animationDelay: `${(i % 6) * 0.1}s`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
                    <div style={{ 
                      width: 64, height: 64, 
                      borderRadius: 16, 
                      background: 'var(--mkt-surface-bg)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '1.8rem', 
                      flexShrink: 0,
                      border: '1px solid var(--mkt-card-border)'
                    }}>
                      {INDUSTRY_ICONS[company.industry] || '🏢'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ color: 'var(--mkt-text-heading)', fontWeight: 800, fontSize: '1.2rem', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{company.name}</h3>
                      <span className="mkt-gradient-text" style={{ fontSize: '0.85rem', fontWeight: 700 }}>{company.industry}</span>
                    </div>
                  </div>
                  
                  <p style={{ color: 'var(--mkt-text-muted)', fontSize: '0.95rem', lineHeight: 1.7, margin: '0 0 24px', flex: 1 }}>{company.desc}</p>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
                    <span style={{ 
                      background: 'rgba(16,185,129,0.1)', 
                      color: 'var(--mkt-success)', 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      padding: '5px 12px', 
                      borderRadius: 100,
                      border: '1px solid rgba(16,185,129,0.2)'
                    }}>
                      {company.jobs.length} Active Positions
                    </span>
                    <span style={{ 
                      background: 'var(--mkt-surface-bg)', 
                      color: 'var(--mkt-text-muted)', 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      padding: '5px 12px', 
                      borderRadius: 100, 
                      border: '1px solid var(--mkt-card-border)' 
                    }}>
                      📍 {company.location}
                    </span>
                  </div>

                  <button 
                    onClick={() => navigate(`/careers?company=${company.name}`)}
                    className="btn btn-outline btn-sm" 
                    style={{ width: '100%', borderRadius: 12, justifyContent: 'center', fontWeight: 800 }}
                  >
                    View Open Jobs →
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
              <div style={{ fontSize: '4rem', marginBottom: 24 }}>🔍</div>
              <h3 style={{ color: 'var(--mkt-text-heading)', fontWeight: 900, fontSize: '1.8rem', marginBottom: 12 }}>No companies found</h3>
              <p style={{ color: 'var(--mkt-text-muted)', fontSize: '1.1rem' }}>Try adjusting your search query or industry filters.</p>
              <button 
                onClick={() => { setSearchQuery(''); setSelectedIndustry(''); }} 
                className="btn btn-primary" 
                style={{ marginTop: 32, borderRadius: 12 }}
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Network Stats */}
      <section style={{ background: 'var(--mkt-surface-bg)', padding: '100px 0', borderTop: '1px solid var(--mkt-card-border)' }}>
        <div className="container">
          <div className="grid-3 mkt-reveal" style={{ gap: 32 }}>
            {[
              { label: 'Startup Partners', num: '150+' },
              { label: 'Fortune 500 Clients', num: '45+' },
              { label: 'Total Placements', num: '12k+' }
            ].map(stat => (
              <div key={stat.label} style={{ background: 'var(--mkt-card-bg)', border: '1px solid var(--mkt-card-border)', borderRadius: 28, padding: '48px 32px', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
                <div className="mkt-gradient-text" style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: 10, letterSpacing: '-0.03em' }}>{stat.num}</div>
                <div style={{ color: 'var(--mkt-text-muted)', fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--mkt-darker)', padding: '120px 0', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(3,118,211,0.15) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div className="container mkt-reveal" style={{ position: 'relative' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(2.2rem, 6vw, 3.5rem)', fontWeight: 900, marginBottom: 24, letterSpacing: '-0.02em' }}>Scale Your Engineering Team</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.25rem', marginBottom: 56, maxWidth: 600, margin: '0 auto 56px', lineHeight: 1.8 }}>
            Partner with us to source, vet, and hire the top 1% of technical talent worldwide.
          </p>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/contact" className="btn btn-primary btn-lg" style={{ borderRadius: 14 }}>
              Partner With Us Today →
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
