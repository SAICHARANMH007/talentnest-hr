import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../../api/api.js';
import { card, btnP, btnG } from '../../constants/styles.js';

const STARS = [1, 2, 3, 4, 5];

export function StarRating({ value, onChange, size = 24 }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {STARS.map(s => (
        <span key={s}
          onMouseEnter={() => onChange && setHovered(s)}
          onMouseLeave={() => onChange && setHovered(0)}
          onClick={() => onChange && onChange(s)}
          style={{
            fontSize: size,
            cursor: onChange ? 'pointer' : 'default',
            color: s <= (hovered || value) ? '#F59E0B' : '#E5E7EB',
            transition: 'color 0.1s',
            lineHeight: 1,
            padding: onChange ? '4px' : '0',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
          }}>★</span>
      ))}
    </div>
  );
}

export function ReviewCard({ review }) {
  return (
    <div style={{ ...card, padding: '16px 18px', borderRadius: 14, marginBottom: 10, border: '1px solid #F1F5F9' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <StarRating value={review.rating} size={15} />
          {review.title && <div style={{ fontWeight: 800, fontSize: 14, color: '#0A1628', marginTop: 5, wordBreak: 'break-word' }}>{review.title}</div>}
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3, wordBreak: 'break-word' }}>
            {review.isAnonymous ? 'Anonymous' : (review.reviewerName || 'Member')}
            {review.role ? ` · ${review.role}` : ''}
            {review.companyName ? ` · ${review.companyName}` : ''}
            {' · '}{review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : ''}
          </div>
        </div>
        <div style={{
          background: review.rating >= 4 ? '#D1FAE5' : review.rating >= 3 ? '#FEF3C7' : '#FEE2E2',
          color: review.rating >= 4 ? '#065F46' : review.rating >= 3 ? '#92400E' : '#991B1B',
          borderRadius: 20, padding: '4px 12px', fontWeight: 800, fontSize: 13, flexShrink: 0,
          alignSelf: 'flex-start',
        }}>
          {review.rating}/5
        </div>
      </div>
      {review.pros && (
        <div style={{ marginBottom: 8, background: '#F0FDF4', borderRadius: 8, padding: '8px 12px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', marginBottom: 3 }}>✅ Pros</div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, wordBreak: 'break-word' }}>{review.pros}</div>
        </div>
      )}
      {review.cons && (
        <div style={{ background: '#FFF1F2', borderRadius: 8, padding: '8px 12px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', marginBottom: 3 }}>⚠️ Cons</div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, wordBreak: 'break-word' }}>{review.cons}</div>
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = { companyName: '', rating: 0, title: '', pros: '', cons: '', role: '', isAnonymous: false };

export function SubmitReviewForm({ user, companies, onSuccess, prefilledCompany }) {
  const [form, setForm]             = useState({ ...EMPTY_FORM, companyName: prefilledCompany || '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]             = useState(false);
  const [err, setErr]               = useState('');
  const [search, setSearch]         = useState(prefilledCompany || '');
  const [showDrop, setShowDrop]     = useState(false);
  const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#F9FAFB' };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const filtered = useMemo(() =>
    companies.filter(c => c.toLowerCase().includes(search.toLowerCase())).slice(0, 8),
    [companies, search]
  );

  const handleSubmit = async () => {
    if (!form.companyName.trim()) { setErr('Please select or enter a company name.'); return; }
    if (!form.rating) { setErr('Please select a star rating.'); return; }
    setErr(''); setSubmitting(true);
    try {
      await api.submitMyOrgReview({ ...form, companyName: form.companyName.trim() });
      setDone(true);
      onSuccess && onSuccess(form.companyName.trim());
    } catch (e) { setErr(e?.message || 'Failed to submit. Please try again.'); }
    setSubmitting(false);
  };

  if (done) return (
    <div style={{ ...card, padding: '28px', textAlign: 'center', borderRadius: 14, border: '1px solid #BBF7D0', background: '#F0FDF4' }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#166534', marginBottom: 6 }}>Review posted!</div>
      <div style={{ fontSize: 13, color: '#374151' }}>Your review is now live. Thank you for sharing your experience!</div>
      <button onClick={() => { setDone(false); setForm({ ...EMPTY_FORM }); setSearch(''); }} style={{ ...btnG, marginTop: 16 }}>Write another</button>
    </div>
  );

  return (
    <div style={{ ...card, padding: 'clamp(14px, 3vw, 22px)', borderRadius: 14, border: '1px solid #E5E7EB' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 800, color: '#0A1628' }}>✍️ Write a Review</h3>
      {err && <div style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 8, padding: '9px 14px', marginBottom: 14, fontSize: 13 }}>{err}</div>}

      {/* Company selector */}
      <div style={{ marginBottom: 16, position: 'relative' }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Company Name *</label>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); set('companyName', e.target.value); setShowDrop(true); }}
          onFocus={() => setShowDrop(true)}
          onBlur={() => setTimeout(() => setShowDrop(false), 180)}
          placeholder="Type company name… (e.g. Infosys, TCS, Google)"
          style={{ ...inp, borderColor: form.companyName ? '#059669' : '#E5E7EB' }}
        />
        {form.companyName && <span style={{ position: 'absolute', right: 10, top: 32, color: '#059669', fontSize: 14 }}>✓</span>}
        {showDrop && filtered.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, maxHeight: 220, overflowY: 'auto', marginTop: 2 }}>
            {filtered.map(c => (
              <div key={c} onMouseDown={() => { set('companyName', c); setSearch(c); setShowDrop(false); }}
                style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', color: '#374151', borderBottom: '1px solid #F9FAFB' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F0F9FF'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                🏢 {c}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Overall Rating *</label>
        <StarRating value={form.rating} onChange={v => set('rating', v)} size={32} />
      </div>

      {/* Responsive 2-col grid that stacks on narrow screens */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Review Title</label>
          <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Great place to grow" style={inp} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Your Role</label>
          <input value={form.role} onChange={e => set('role', e.target.value)} placeholder={user?.title || 'e.g. Software Engineer'} style={inp} />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Pros <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(what's great)</span></label>
        <textarea value={form.pros} onChange={e => set('pros', e.target.value)} rows={3} placeholder="Great culture, good benefits, strong learning opportunities…" style={{ ...inp, resize: 'vertical' }} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Cons <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(what could improve)</span></label>
        <textarea value={form.cons} onChange={e => set('cons', e.target.value)} rows={3} placeholder="Could improve work-life balance, better communication…" style={{ ...inp, resize: 'vertical' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.isAnonymous} onChange={e => set('isAnonymous', e.target.checked)} style={{ width: 16, height: 16, accentColor: '#0176D3' }} />
          Post anonymously
        </label>
        <button onClick={handleSubmit} disabled={submitting || !form.rating || !form.companyName}
          style={{ ...btnP, opacity: (!form.rating || !form.companyName || submitting) ? 0.6 : 1, cursor: (!form.rating || !form.companyName || submitting) ? 'not-allowed' : 'pointer' }}>
          {submitting ? 'Submitting…' : 'Submit Review'}
        </button>
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: '#9CA3AF' }}>
        Your review will be visible immediately. Your identity is kept confidential when posting anonymously.
      </div>
    </div>
  );
}

const SORT_OPTIONS = [
  { value: 'newest',  label: 'Newest First' },
  { value: 'highest', label: 'Highest Rated' },
  { value: 'lowest',  label: 'Lowest Rated' },
];

export default function CompanyReviewsPage({ user }) {
  const [allReviews,    setAllReviews]    = useState([]);
  const [companies,     setCompanies]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showForm,      setShowForm]      = useState(false);
  const [searchCompany, setSearchCompany] = useState('');
  const [selectedCo,    setSelectedCo]   = useState('');
  const [sortBy,        setSortBy]        = useState('newest');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reviewRes, jobsRes] = await Promise.allSettled([
        api.getMyOrgReviews(),
        api.getPublicJobs(),
      ]);
      const revData = reviewRes.status === 'fulfilled' ? reviewRes.value : null;
      setAllReviews(revData?.data || []);

      if (jobsRes.status === 'fulfilled') {
        const jobs = Array.isArray(jobsRes.value) ? jobsRes.value : (Array.isArray(jobsRes.value?.data) ? jobsRes.value.data : []);
        const byLower = new Map();
        jobs.map(j => j.companyName || j.company).filter(Boolean).forEach(name => {
          const key = name.trim().toLowerCase();
          if (!byLower.has(key)) byLower.set(key, name.trim());
        });
        setCompanies([...byLower.values()].sort((a, b) => a.localeCompare(b)));
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredReviews = useMemo(() => {
    let list = allReviews;
    if (selectedCo || searchCompany.trim()) {
      const q = (selectedCo || searchCompany).toLowerCase();
      list = list.filter(r => (r.companyName || '').toLowerCase().includes(q));
    }
    if (sortBy === 'newest') {
      list = [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortBy === 'highest') {
      list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'lowest') {
      list = [...list].sort((a, b) => (a.rating || 0) - (b.rating || 0));
    }
    return list;
  }, [allReviews, selectedCo, searchCompany, sortBy]);

  const companyGroups = useMemo(() => {
    const map = {};
    allReviews.forEach(r => {
      const name = r.companyName || 'Unknown Company';
      if (!map[name]) map[name] = { name, reviews: [], avg: 0 };
      map[name].reviews.push(r);
    });
    Object.values(map).forEach(g => {
      g.avg = g.reviews.reduce((s, r) => s + (r.rating || 0), 0) / g.reviews.length;
    });
    return Object.values(map).sort((a, b) => b.reviews.length - a.reviews.length);
  }, [allReviews]);

  const displayedAvg = filteredReviews.length > 0
    ? (filteredReviews.reduce((s, r) => s + (r.rating || 0), 0) / filteredReviews.length).toFixed(1)
    : null;

  const ratingDist = STARS.slice().reverse().map(s => ({
    star: s,
    count: filteredReviews.filter(r => r.rating === s).length,
    pct: filteredReviews.length > 0 ? Math.round((filteredReviews.filter(r => r.rating === s).length / filteredReviews.length) * 100) : 0,
  }));

  return (
    <div style={{ padding: 'clamp(14px, 3vw, 32px)', maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 900, color: '#0A1628' }}>⭐ Company Reviews</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>Honest feedback from candidates and employees across all companies</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} style={showForm ? btnG : btnP}>
          {showForm ? '✕ Close' : '✍️ Write a Review'}
        </button>
      </div>

      {/* Write Review Form */}
      {showForm && (
        <div style={{ marginBottom: 24 }}>
          <SubmitReviewForm
            user={user}
            companies={companies}
            prefilledCompany={selectedCo}
            onSuccess={(companyName) => { load(); setShowForm(false); setSelectedCo(companyName); setSearchCompany(companyName); }}
          />
        </div>
      )}

      {/* Company Search Bar */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#9CA3AF', pointerEvents: 'none' }}>🔍</span>
        <input
          value={searchCompany}
          onChange={e => { setSearchCompany(e.target.value); setSelectedCo(''); }}
          placeholder="Search reviews by company name…"
          style={{ width: '100%', padding: '11px 40px 11px 40px', borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 14, outline: 'none', background: '#FAFBFC', boxSizing: 'border-box', transition: 'border 0.15s' }}
          onFocus={e => { e.currentTarget.style.border = '1px solid #0176D3'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(1,118,211,0.1)'; }}
          onBlur={e => { e.currentTarget.style.border = '1px solid #E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }}
        />
        {searchCompany && (
          <button onClick={() => { setSearchCompany(''); setSelectedCo(''); }}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 18 }}>×</button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: '#0176D3', borderRadius: '50%', animation: 'tn-spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Loading reviews…
        </div>
      ) : (
        <>
          {/* Company pills */}
          {companyGroups.length > 0 && !searchCompany && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <button onClick={() => setSelectedCo('')}
                style={{ padding: '6px 16px', borderRadius: 20, border: `1px solid ${!selectedCo ? '#0176D3' : '#E5E7EB'}`, background: !selectedCo ? '#EFF6FF' : '#F9FAFB', color: !selectedCo ? '#1D4ED8' : '#6B7280', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                All ({allReviews.length})
              </button>
              {companyGroups.map(g => (
                <button key={g.name} onClick={() => setSelectedCo(g.name === selectedCo ? '' : g.name)}
                  style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${selectedCo === g.name ? '#0176D3' : '#E5E7EB'}`, background: selectedCo === g.name ? '#EFF6FF' : '#F9FAFB', color: selectedCo === g.name ? '#1D4ED8' : '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  🏢 {g.name}
                  <span style={{ background: selectedCo === g.name ? '#DBEAFE' : '#F3F4F6', color: selectedCo === g.name ? '#1D4ED8' : '#9CA3AF', borderRadius: 10, padding: '0 6px', fontSize: 10, fontWeight: 800 }}>{g.reviews.length}</span>
                </button>
              ))}
            </div>
          )}

          {/* Rating summary */}
          {filteredReviews.length > 0 && (
            <div style={{ ...card, padding: 'clamp(14px, 3vw, 20px)', borderRadius: 14, marginBottom: 16, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', border: '1px solid #FEF3C7', background: '#FFFBEB' }}>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 48, fontWeight: 900, color: '#F59E0B', lineHeight: 1 }}>{displayedAvg}</div>
                <StarRating value={Math.round(parseFloat(displayedAvg || 0))} size={18} />
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{filteredReviews.length} review{filteredReviews.length !== 1 ? 's' : ''}{selectedCo ? ` for ${selectedCo}` : ''}</div>
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                {ratingDist.map(({ star, count, pct }) => (
                  <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: '#374151', width: 36, flexShrink: 0 }}>{star} ★</span>
                    <div style={{ flex: 1, background: '#F3F4F6', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#F59E0B', borderRadius: 4, transition: 'width 0.4s' }} />
                    </div>
                    <span style={{ fontSize: 11, color: '#9CA3AF', width: 24, textAlign: 'right', flexShrink: 0 }}>{count}</span>
                  </div>
                ))}
              </div>
              {selectedCo && (
                <button onClick={() => setShowForm(true)} style={{ ...btnP, fontSize: 12, padding: '8px 16px', flexShrink: 0 }}>
                  ✍️ Review {selectedCo}
                </button>
              )}
            </div>
          )}

          {/* Sort control */}
          {filteredReviews.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>Sort:</span>
              {SORT_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setSortBy(opt.value)}
                  style={{
                    padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${sortBy === opt.value ? '#0176D3' : '#E5E7EB'}`,
                    background: sortBy === opt.value ? '#EFF6FF' : '#F9FAFB',
                    color: sortBy === opt.value ? '#1D4ED8' : '#6B7280',
                    transition: 'all 0.15s',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Reviews list */}
          {filteredReviews.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: 'clamp(32px, 6vw, 48px) 24px', borderRadius: 14 }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>💬</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#374151', marginBottom: 8 }}>
                {searchCompany || selectedCo ? `No reviews for "${searchCompany || selectedCo}" yet` : 'No reviews yet'}
              </div>
              <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 20 }}>
                Be the first to share your experience{(searchCompany || selectedCo) ? ` with ${searchCompany || selectedCo}` : ''}.
              </div>
              <button onClick={() => setShowForm(true)} style={btnP}>✍️ Write the First Review</button>
            </div>
          ) : (
            filteredReviews.map(r => <ReviewCard key={r._id} review={r} />)
          )}
        </>
      )}
      <style>{`@keyframes tn-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
