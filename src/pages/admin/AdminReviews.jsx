import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../api/api.js';
import { card, btnP, btnD, btnG } from '../../constants/styles.js';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('pending');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getAdminReviews();
      setReviews(Array.isArray(r) ? r : (r?.data || []));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    try { await api.approveReview(id); load(); } catch {}
  };

  const del = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    try { await api.deleteReview(id); load(); } catch {}
  };

  const filtered = reviews.filter(r => tab === 'pending' ? !r.isApproved : r.isApproved);

  const tabStyle = (t) => ({
    padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
    background: tab === t ? '#0176D3' : '#F3F4F6',
    color: tab === t ? '#fff' : '#374151',
  });

  return (
    <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>⭐ Company Reviews</h1>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6B7280' }}>Approve or remove reviews shown on your careers page.</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button style={tabStyle('pending')} onClick={() => setTab('pending')}>
          Pending ({reviews.filter(r => !r.isApproved).length})
        </button>
        <button style={tabStyle('approved')} onClick={() => setTab('approved')}>
          Approved ({reviews.filter(r => r.isApproved).length})
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span>{'⭐'.repeat(r.rating)}</span>
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
