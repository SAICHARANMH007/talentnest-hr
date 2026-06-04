import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../../api/api.js';
import { card, btnP, btnD, btnG } from '../../constants/styles.js';

function StarDisplay({ rating }) {
  const r = Math.max(0, Math.min(5, Math.round(rating || 0)));
  return (
    <span title={`${r}/5`} style={{ color: '#F59E0B', fontSize: 14 }}>
      {'★'.repeat(r)}{'☆'.repeat(5 - r)}
      <span style={{ color: '#6B7280', fontSize: 11, marginLeft: 4 }}>{r}/5</span>
    </span>
  );
}

function ReportModal({ review, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!reason.trim()) { setErr('Please describe why you are reporting this review.'); return; }
    setSubmitting(true); setErr('');
    try { await onSubmit(review._id, reason.trim()); onClose(); }
    catch (e) { setErr(e?.message || 'Failed to report.'); }
    setSubmitting(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#0A1628' }}>🚩 Report Review</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6B7280' }}>
          This will flag the review for super-admin attention. Describe why it should be investigated.
        </p>
        {review.title && <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#374151', border: '1px solid #E5E7EB' }}>
          <StarDisplay rating={review.rating} /><br />
          <span style={{ fontWeight: 700 }}>{review.title}</span>
          {review.reviewerName && <span style={{ color: '#9CA3AF' }}> · {review.reviewerName}</span>}
        </div>}
        {err && <div style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13 }}>{err}</div>}
        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Reason for Report *</label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={4}
          placeholder="e.g. Contains inappropriate language, false information, spam content…"
          style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid #E5E7EB', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
          autoFocus
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
          <button onClick={submit} disabled={submitting || !reason.trim()}
            style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: '#DC2626', color: '#fff', fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'Reporting…' : '🚩 Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminReviews({ user }) {
  const isSuperAdmin = user?.role === 'super_admin';
  const [reviews,         setReviews]         = useState([]);
  const [reportedReviews, setReportedReviews] = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [tab,             setTab]             = useState('all');
  const [error,           setError]           = useState('');
  const [seeding,         setSeeding]         = useState(false);
  const [reportTarget,    setReportTarget]    = useState(null);
  const [starFilter,      setStarFilter]      = useState(0);
  const [companyFilter,   setCompanyFilter]   = useState('all');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const calls = [api.getAdminReviews()];
      if (isSuperAdmin) calls.push(api.getReportedReviews());
      const [revRes, reportedRes] = await Promise.allSettled(calls);
      setReviews(revRes.status === 'fulfilled' ? (Array.isArray(revRes.value) ? revRes.value : (revRes.value?.data || [])) : []);
      if (isSuperAdmin && reportedRes?.status === 'fulfilled') {
        setReportedReviews(Array.isArray(reportedRes.value) ? reportedRes.value : (reportedRes.value?.data || []));
      }
    } catch (e) { setError(e?.message || 'Failed to load reviews.'); }
    setLoading(false);
  }, [isSuperAdmin]);

  useEffect(() => { load(); }, [load]);

  const doDelete = async (id) => {
    if (!window.confirm('Permanently delete this review?')) return;
    try { await api.deleteReview(id); load(); }
    catch (e) { setError(e?.message || 'Delete failed.'); }
  };

  const doReport = async (id, reason) => {
    await api.reportReview(id, reason);
    load();
  };

  const doUnreport = async (id) => {
    try { await api.unreportReview(id); load(); }
    catch (e) { setError(e?.message || 'Failed to clear report.'); }
  };

  const seed = async () => {
    setSeeding(true); setError('');
    try { await api.seedReviews(); load(); }
    catch (e) { setError(e?.message || 'Seed failed.'); }
    finally { setSeeding(false); }
  };

  const { avgRating, ratingDist, displayed, companyOptions } = useMemo(() => {
    const all  = reviews.filter(r => r.rating);
    const avg  = all.length ? (all.reduce((s, r) => s + r.rating, 0) / all.length).toFixed(1) : null;
    const dist = [5, 4, 3, 2, 1].map(star => ({
      star,
      count: reviews.filter(r => Math.round(r.rating) === star).length,
    }));
    const base    = tab === 'reported' ? reportedReviews : reviews;
    const flagged = base.filter(r => r.isReported);
    let disp      = tab === 'reported' ? reportedReviews : (tab === 'flagged' ? flagged : reviews);
    if (companyFilter !== 'all') disp = disp.filter(r => (r.companyName || '') === companyFilter);
    if (starFilter !== 0)        disp = disp.filter(r => Math.round(r.rating || 0) === starFilter);
    const companies = [...new Set(reviews.map(r => r.companyName).filter(Boolean))].sort();
    return { avgRating: avg, ratingDist: dist, displayed: disp, companyOptions: companies };
  }, [reviews, reportedReviews, tab, starFilter, companyFilter]);

  const tabStyle = (t) => ({
    padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
    background: tab === t ? '#0176D3' : '#F3F4F6',
    color: tab === t ? '#fff' : '#374151',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 860, margin: '0 auto' }}>
      {reportTarget && <ReportModal review={reportTarget} onClose={() => setReportTarget(null)} onSubmit={doReport} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 6 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>⭐ Company Reviews</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>Manage reviews submitted by candidates and employees.</p>
        </div>
        {reviews.length < 5 && (
          <button onClick={seed} disabled={seeding} style={{ padding: '8px 16px', borderRadius: 9, border: '1px dashed #D97706', background: '#FEF3C7', color: '#92400E', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {seeding ? 'Seeding…' : '📥 Load Demo Reviews'}
          </button>
        )}
      </div>

      {/* Aggregate stats */}
      {reviews.length > 0 && (
        <div style={{ ...card, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#D97706', lineHeight: 1 }}>{avgRating ?? '—'}</div>
            <div style={{ fontSize: 18, marginTop: 2, color: '#F59E0B' }}>{'★'.repeat(Math.round(parseFloat(avgRating) || 0))}{'☆'.repeat(5 - Math.round(parseFloat(avgRating) || 0))}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            {starFilter !== 0 && (
              <button onClick={() => setStarFilter(0)} style={{ fontSize: 11, color: '#0176D3', background: 'rgba(1,118,211,0.08)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', marginBottom: 6, fontWeight: 700 }}>
                ✕ Clear star filter
              </button>
            )}
            {ratingDist.map(({ star, count }) => {
              const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
              const isActive = starFilter === star;
              return (
                <div key={star} onClick={() => setStarFilter(prev => prev === star ? 0 : star)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, cursor: 'pointer', borderRadius: 6, padding: '2px 4px', background: isActive ? 'rgba(245,158,11,0.1)' : 'transparent', outline: isActive ? '1.5px solid #F59E0B' : 'none' }}>
                  <span style={{ fontSize: 11, color: '#6B7280', minWidth: 14, textAlign: 'right' }}>{star}</span>
                  <span style={{ fontSize: 11, color: '#F59E0B' }}>★</span>
                  <div style={{ flex: 1, height: 7, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: isActive ? '#D97706' : '#F59E0B', borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 11, color: isActive ? '#D97706' : '#9CA3AF', minWidth: 24, fontWeight: isActive ? 700 : 400 }}>{count}</span>
                </div>
              );
            })}
          </div>
          {reviews.filter(r => r.isReported).length > 0 && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#DC2626' }}>{reviews.filter(r => r.isReported).length}</div>
              <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 700 }}>Flagged</div>
            </div>
          )}
        </div>
      )}

      {error && <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      {/* Company filter — superadmin sees all orgs */}
      {isSuperAdmin && companyOptions.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>🏢 Company:</span>
          <select
            value={companyFilter}
            onChange={e => { setCompanyFilter(e.target.value); setStarFilter(0); }}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, background: '#F9FAFB', color: '#374151', outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">All Companies ({reviews.length} reviews)</option>
            {companyOptions.map(c => {
              const cnt = reviews.filter(r => (r.companyName || '') === c).length;
              const avg = (() => { const rv = reviews.filter(r => (r.companyName || '') === c && r.rating); return rv.length ? (rv.reduce((s,r) => s+r.rating,0)/rv.length).toFixed(1) : null; })();
              return <option key={c} value={c}>{c} ({cnt} review{cnt!==1?'s':''}{avg ? ` · ★${avg}` : ''})</option>;
            })}
          </select>
          {companyFilter !== 'all' && (
            <button onClick={() => setCompanyFilter('all')} style={{ fontSize: 11, color: '#6B7280', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>✕ Clear</button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button style={tabStyle('all')} onClick={() => setTab('all')}>
          All Reviews ({reviews.length})
        </button>
        <button style={tabStyle('flagged')} onClick={() => setTab('flagged')}>
          🚩 Flagged ({reviews.filter(r => r.isReported).length})
        </button>
        {isSuperAdmin && (
          <button style={tabStyle('reported')} onClick={() => setTab('reported')}>
            🔴 Reported — All Orgs ({reportedReviews.length})
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
          <div style={{ width: 28, height: 28, border: '3px solid #E5E7EB', borderTopColor: '#0176D3', borderRadius: '50%', animation: 'tn-spin 0.8s linear infinite', margin: '0 auto 10px' }} />
          Loading…
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 40 }}>
          <p style={{ color: '#9CA3AF', margin: 0 }}>
            {tab === 'flagged' ? 'No flagged reviews.' : tab === 'reported' ? 'No reported reviews across all orgs.' : 'No reviews yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayed.map(r => (
            <div key={r._id} style={{ ...card, padding: '16px 18px', border: r.isReported ? '1px solid #FECACA' : undefined, background: r.isReported ? '#FFFBFB' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <StarDisplay rating={r.rating} />
                    {r.title && <span style={{ fontWeight: 800, fontSize: 14, color: '#0A1628' }}>{r.title}</span>}
                    {r.isReported && <span style={{ background: '#FEE2E2', color: '#DC2626', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20 }}>🚩 REPORTED</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8 }}>
                    {r.reviewerName || 'Anonymous'}
                    {r.role ? ` · ${r.role}` : ''}
                    {r.companyName ? ` · ${r.companyName}` : ''}
                    {' · '}{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  {r.pros && <p style={{ fontSize: 12, margin: '0 0 4px', color: '#374151' }}><strong style={{ color: '#16A34A' }}>✅ Pros:</strong> {r.pros}</p>}
                  {r.cons && <p style={{ fontSize: 12, margin: '0 0 4px', color: '#374151' }}><strong style={{ color: '#DC2626' }}>⚠️ Cons:</strong> {r.cons}</p>}
                  {r.isReported && r.reportReason && (
                    <div style={{ marginTop: 10, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#DC2626', marginBottom: 3 }}>🚩 Report Reason</div>
                      <div style={{ fontSize: 12, color: '#7F1D1D' }}>{r.reportReason}</div>
                      {r.reportedByName && <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>Reported by: {r.reportedByName} · {r.reportedAt ? new Date(r.reportedAt).toLocaleDateString() : ''}</div>}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  {!r.isReported && (
                    <button
                      onClick={() => setReportTarget(r)}
                      style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      🚩 Report
                    </button>
                  )}
                  {r.isReported && isSuperAdmin && (
                    <button
                      onClick={() => doUnreport(r._id)}
                      style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #BBF7D0', background: '#F0FDF4', color: '#16A34A', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      ✅ Clear Flag
                    </button>
                  )}
                  <button
                    onClick={() => doDelete(r._id)}
                    style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#374151', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes tn-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
