import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../api/api.js';
import { card, btnP, btnG } from '../../constants/styles.js';

const STARS = [1, 2, 3, 4, 5];

function StarRating({ value, onChange, size = 24 }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {STARS.map(s => (
        <span
          key={s}
          onMouseEnter={() => onChange && setHovered(s)}
          onMouseLeave={() => onChange && setHovered(0)}
          onClick={() => onChange && onChange(s)}
          style={{ fontSize: size, cursor: onChange ? 'pointer' : 'default', color: s <= (hovered || value) ? '#F59E0B' : '#E5E7EB', transition: 'color 0.1s', lineHeight: 1 }}>★</span>
      ))}
    </div>
  );
}

function ReviewCard({ review }) {
  return (
    <div style={{ ...card, padding: '18px 20px', borderRadius: 14, marginBottom: 12, border: '1px solid #F1F5F9' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        <div>
          <StarRating value={review.rating} size={18} />
          {review.title && <div style={{ fontWeight: 800, fontSize: 15, color: '#0A1628', marginTop: 4 }}>{review.title}</div>}
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
            {review.isAnonymous ? 'Anonymous' : review.reviewerName}
            {review.role ? ` · ${review.role}` : ''}
            {' · '}{new Date(review.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
          </div>
        </div>
        <div style={{ background: review.rating >= 4 ? '#D1FAE5' : review.rating >= 3 ? '#FEF3C7' : '#FEE2E2', color: review.rating >= 4 ? '#065F46' : review.rating >= 3 ? '#92400E' : '#991B1B', borderRadius: 20, padding: '4px 14px', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
          {review.rating}/5
        </div>
      </div>
      {review.pros && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', marginBottom: 2 }}>✅ Pros</div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{review.pros}</div>
        </div>
      )}
      {review.cons && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', marginBottom: 2 }}>⚠️ Cons</div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{review.cons}</div>
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = { rating: 0, title: '', pros: '', cons: '', role: '', isAnonymous: false };

function SubmitReviewForm({ user, onSuccess }) {
  const [form,      setForm]      = useState({ ...EMPTY_FORM });
  const [submitting,setSubmitting]= useState(false);
  const [done,      setDone]      = useState(false);
  const [err,       setErr]       = useState('');
  const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#F9FAFB' };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.rating) { setErr('Please select a star rating.'); return; }
    setErr('');
    setSubmitting(true);
    try {
      await api.submitMyOrgReview(form);
      setDone(true);
      onSuccess && onSuccess();
    } catch (e) { setErr(e?.message || 'Failed to submit. Please try again.'); }
    setSubmitting(false);
  };

  if (done) {
    return (
      <div style={{ ...card, padding: '28px', textAlign: 'center', borderRadius: 14, border: '1px solid #BBF7D0', background: '#F0FDF4' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#166534', marginBottom: 6 }}>Review submitted!</div>
        <div style={{ fontSize: 13, color: '#374151' }}>It will appear here after admin approval. Thank you for your feedback.</div>
        <button onClick={() => { setDone(false); setForm({ ...EMPTY_FORM }); }} style={{ ...btnG, marginTop: 16 }}>Write another</button>
      </div>
    );
  }

  return (
    <div style={{ ...card, padding: '20px 22px', borderRadius: 14, border: '1px solid #E5E7EB' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 800, color: '#0A1628' }}>✍️ Write a Review</h3>

      {err && <div style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 8, padding: '9px 14px', marginBottom: 14, fontSize: 13 }}>{err}</div>}

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Overall Rating *</label>
        <StarRating value={form.rating} onChange={v => set('rating', v)} size={32} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Review Title</label>
          <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Great place to work" style={inp} />
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
        <textarea value={form.cons} onChange={e => set('cons', e.target.value)} rows={3} placeholder="Could improve work-life balance, better internal communication…" style={{ ...inp, resize: 'vertical' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.isAnonymous} onChange={e => set('isAnonymous', e.target.checked)} style={{ width: 16, height: 16, accentColor: '#0176D3' }} />
          Post anonymously
        </label>
        <button onClick={handleSubmit} disabled={submitting || !form.rating} style={{ ...btnP, opacity: (!form.rating || submitting) ? 0.6 : 1, cursor: (!form.rating || submitting) ? 'not-allowed' : 'pointer' }}>
          {submitting ? 'Submitting…' : 'Submit Review'}
        </button>
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: '#9CA3AF' }}>
        Reviews are moderated before appearing publicly. Your identity is kept confidential when posting anonymously.
      </div>
    </div>
  );
}

export default function CompanyReviewsPage({ user }) {
  const [reviews,  setReviews]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [avgRating,setAvgRating]= useState(null);
  const [total,    setTotal]    = useState(0);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getMyOrgReviews();
      setReviews(r?.data || []);
      setAvgRating(r?.avgRating || null);
      setTotal(r?.total || 0);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const ratingDist = STARS.slice().reverse().map(s => ({
    star: s,
    count: reviews.filter(r => r.rating === s).length,
    pct: reviews.length > 0 ? Math.round((reviews.filter(r => r.rating === s).length / reviews.length) * 100) : 0,
  }));

  return (
    <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>⭐ Company Reviews</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>Honest feedback from your colleagues and fellow applicants.</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} style={showForm ? btnG : btnP}>
          {showForm ? 'Hide Form' : '✍️ Write a Review'}
        </button>
      </div>

      {showForm && (
        <div style={{ marginBottom: 24 }}>
          <SubmitReviewForm user={user} onSuccess={() => { load(); setShowForm(false); }} />
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>Loading reviews…</div>
      ) : (
        <>
          {/* Summary */}
          {reviews.length > 0 && (
            <div style={{ ...card, padding: '20px 24px', borderRadius: 14, marginBottom: 20, display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 52, fontWeight: 900, color: '#F59E0B', lineHeight: 1 }}>{avgRating}</div>
                <StarRating value={Math.round(parseFloat(avgRating || 0))} size={20} />
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{total} review{total !== 1 ? 's' : ''}</div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                {ratingDist.map(({ star, count, pct }) => (
                  <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: '#374151', width: 40, flexShrink: 0 }}>{star} ★</span>
                    <div style={{ flex: 1, background: '#F3F4F6', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#F59E0B', borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 11, color: '#9CA3AF', width: 28, textAlign: 'right', flexShrink: 0 }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reviews.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: '56px 32px', borderRadius: 14 }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>💬</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#374151', marginBottom: 8 }}>No reviews yet</div>
              <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 20 }}>Be the first to share your experience working here.</div>
              <button onClick={() => setShowForm(true)} style={btnP}>✍️ Write the First Review</button>
            </div>
          ) : (
            reviews.map(r => <ReviewCard key={r._id} review={r} />)
          )}
        </>
      )}
    </div>
  );
}
