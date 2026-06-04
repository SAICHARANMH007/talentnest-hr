import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../api/api.js';
import { card, btnG } from '../../constants/styles.js';

const REASON_LABEL = {
  spam:           '🚫 Spam',
  harassment:     '😡 Harassment',
  misinformation: '❌ Misinformation',
  inappropriate:  '🔞 Inappropriate',
  hate_speech:    '🤬 Hate Speech',
  other:          '📋 Other',
};

const REASON_COLOR = {
  spam:           '#DC2626',
  harassment:     '#7C3AED',
  misinformation: '#D97706',
  inappropriate:  '#DB2777',
  hate_speech:    '#DC2626',
  other:          '#6B7280',
};

function timeAgo(d) {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)     return 'just now';
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SuperAdminReportedPosts() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getReportedPosts();
      setData(r?.data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (reportId, postId) => {
    if (!window.confirm('Delete this post permanently? This will also resolve all its reports.')) return;
    setActing(a => ({ ...a, [reportId]: 'deleting' }));
    try {
      await api.deleteReportedPost(reportId);
      setData(prev => prev.filter(g => String(g.post?._id) !== String(postId)));
      load(); // re-fetch to ensure DB state is reflected
    } catch (e) { alert(e?.message || 'Failed to delete'); }
    setActing(a => ({ ...a, [reportId]: null }));
  };

  const handleDismiss = async (reportId) => {
    setActing(a => ({ ...a, [reportId]: 'dismissing' }));
    try {
      await api.dismissReport(reportId);
      setData(prev => prev.map(g => ({
        ...g,
        reports: g.reports.filter(r => String(r._id) !== String(reportId)),
      })).filter(g => g.reports.length > 0));
      load(); // re-fetch to ensure dismissed report is gone
    } catch (e) { alert(e?.message || 'Failed to dismiss'); }
    setActing(a => ({ ...a, [reportId]: null }));
  };

  return (
    <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>🚩 Reported Posts</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>
          Review posts flagged by community members. You can delete or dismiss each report.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>Loading reported posts…</div>
      ) : data.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '56px 32px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#374151', marginBottom: 6 }}>No pending reports</div>
          <div style={{ fontSize: 13, color: '#9CA3AF' }}>All community posts are clear. Great community!</div>
          <button onClick={load} style={{ ...btnG, marginTop: 16 }}>Refresh</button>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
            {data.length} post{data.length !== 1 ? 's' : ''} with pending reports
          </div>
          {data.map(({ post, reports }) => (
            <div key={post?._id || reports[0]._id} style={{ ...card, marginBottom: 16, borderRadius: 14, overflow: 'hidden', border: '1px solid #FEE2E2' }}>
              {/* Post preview */}
              <div style={{ padding: '16px 20px', background: '#FFF7F7', borderBottom: '1px solid #FEE2E2' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>{post?.authorName || 'Unknown author'}</div>
                      <span style={{ fontSize: 10, color: '#9CA3AF', background: '#F3F4F6', padding: '2px 6px', borderRadius: 4 }}>{post?.authorRole || ''}</span>
                      <span style={{ fontSize: 10, color: '#9CA3AF' }}>{timeAgo(post?.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {post?.content ? (post.content.length > 300 ? post.content.slice(0, 300) + '…' : post.content) : <em style={{ color: '#9CA3AF' }}>Post content unavailable</em>}
                    </div>
                    {post?.images?.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        {post.images.slice(0, 4).map((url, i) => (
                          <img key={i} src={url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid #E5E7EB' }} />
                        ))}
                      </div>
                    )}
                    {post?.communitySlug && (
                      <div style={{ marginTop: 6, fontSize: 11, color: '#7C3AED', fontWeight: 600 }}>📍 Community: {post.communitySlug}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleDelete(reports[0]._id, post?._id)}
                      disabled={!!acting[reports[0]._id]}
                      style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {acting[reports[0]._id] === 'deleting' ? 'Deleting…' : '🗑️ Delete Post'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Reports list */}
              <div style={{ padding: '12px 20px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
                  {reports.length} Report{reports.length !== 1 ? 's' : ''}
                </div>
                {reports.map((report, i) => (
                  <div key={report._id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderTop: i > 0 ? '1px solid #F3F4F6' : 'none' }}>
                    <div style={{ flexShrink: 0, marginTop: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, background: (REASON_COLOR[report.reason] || '#6B7280') + '15', color: REASON_COLOR[report.reason] || '#6B7280', padding: '3px 8px', borderRadius: 6 }}>
                        {REASON_LABEL[report.reason] || report.reason}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>
                        {report.reporterName || 'Anonymous'} <span style={{ fontWeight: 400, color: '#9CA3AF' }}>({report.reporterRole || 'user'})</span>
                      </div>
                      {report.details && (
                        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3, fontStyle: 'italic' }}>"{report.details}"</div>
                      )}
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{timeAgo(report.createdAt)}</div>
                    </div>
                    <button
                      onClick={() => handleDismiss(report._id)}
                      disabled={!!acting[report._id]}
                      style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#6B7280', fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {acting[report._id] === 'dismissing' ? '…' : '✓ Dismiss'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
