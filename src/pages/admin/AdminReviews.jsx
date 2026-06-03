import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../../api/api.js';
import { card, btnP, btnD, btnG } from '../../constants/styles.js';

function StarDisplay({ rating }) {
  const r = Math.max(0, Math.min(5, Math.round(rating || 0)));
  return (
    <span title={`${r}/5`}>
      {'⭐'.repeat(r)}{r === 0 ? <span style={{ color: '#9CA3AF', fontSize: 12 }}>No rating</span> : null}
    </span>
  );
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('pending');
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await api.getAdminReviews();
      setReviews(Array.isArray(r) ? r : (r?.data || []));
    } catch (e) {
      setError(e?.message || 'Failed to load reviews.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    try { await api.approveReview(id); load(); }
    catch (e) { setError(e?.message || 'Approve failed.'); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    try { await api.deleteReview(id); load(); }
    catch (e) { setError(e?.message || 'Delete failed.'); }
  };

  const { pendingCount, approvedCount, filtered, avgRating, ratingDist } = useMemo(() => {
    const pending  = reviews.filter(r => !r.isApproved);
    const approved = reviews.filter(r => r.isApproved);
    const all      = reviews.filter(r => r.rating);
    const avg      = all.length ? (all.reduce((s, r) => s + r.rating, 0) / all.length).toFixed(1) : null;
    const dist     = [5, 4, 3, 2, 1].map(star => ({
      star,
      count: reviews.filter(r => Math.round(r.rating) === star).length,
    }));
    return {
      pendingCount  : pending.length,
      approvedCount : approved.length,
      filtered      : tab === 'pending' ? pending : approved,
      avgRating     : avg,
      ratingDist    : dist,
    };
  }, [reviews, tab]);

  const tabStyle = (t) => ({
    padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
    background: tab === t ? '#0176D3' : '#F3F4F6',
    color: tab === t ? '#fff' : '#374151',
  });

  return (
    <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>⭐ Company Reviews</h1>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6B7280' }}>Approve or remove reviews shown on your careers page.</p>

      {/* Aggregate stats */}
      {reviews.length > 0 && (
        <div style={{ ...card, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#D97706', lineHeight: 1 }}>{avgRating ?? '—'}</div>
            <div style={{ fontSize: 20, marginTop: 2 }}>{'⭐'.repeat(Math.round(parseFloat(avgRating) || 0))}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            {ratingDist.map(({ star, count }) => {
              const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
              return (
                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#6B7280', minWidth: 14, textAlign: 'right' }}>{star}</span>
                  <span style={{ fontSize: 11 }}>⭐</span>
                  <div style={{ flex: 1, height: 7, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#F59E0B', borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 11, color: '#9CA3AF', minWidth: 24 }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button style={tabStyle('pending')} onClick={() => setTab('pending')}>
          Pending ({pendingCount})
        </button>
        <button style={tabStyle('approved')} onClick={() => setTab('approved')}>
          Approved ({approvedCount})
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#9CA3AF' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 40 }}>
          <p style={{ color: '#9CA3AF' }}>{tab === 'pending' ? 'No pending reviews.' : 'No approved reviews yet.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(r => (
            <div key={r._id} style={{ ...card, padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <StarDisplay rating={r.rating} />
                    {r.title && <span style={{ fontWeight: 700, fontSize: 13 }}>{r.title}</span>}
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{r.reviewerName || 'Anonymous'}{r.role ? ` · ${r.role}` : ''}</span>
                  </div>
                  {r.pros && <p style={{ fontSize: 12, margin: '4px 0', color: '#374151' }}><strong style={{ color: '#16A34A' }}>Pros:</strong> {r.pros}</p>}
                  {r.cons && <p style={{ fontSize: 12, margin: '4px 0', color: '#374151' }}><strong style={{ color: '#DC2626' }}>Cons:</strong> {r.cons}</p>}
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0' }}>{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {!r.isApproved && <button style={{ ...btnP, fontSize: 11, padding: '5px 12px' }} onClick={() => approve(r._id)}>✅ Approve</button>}
                  <button style={{ ...btnD, fontSize: 11, padding: '5px 12px' }} onClick={() => del(r._id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
