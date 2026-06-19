import React, { useState, useEffect } from 'react';
import { api } from '../../api/api.js';

const STATUS_META = {
  pending: { label: 'Awaiting application', color: '#706E6B', bg: 'rgba(100,116,139,0.1)' },
  applied: { label: 'Candidate applied',     color: '#0369A1', bg: 'rgba(14,165,233,0.1)' },
  hired:   { label: 'Hired! 🎉',             color: '#15803D', bg: 'rgba(34,197,94,0.1)' },
};

export default function MyJobReferrals() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [copiedId, setCopiedId]   = useState(null);

  useEffect(() => {
    api.getMyReferrals()
      .then(r => setReferrals(Array.isArray(r) ? r : (r?.data || [])))
      .catch(() => setReferrals([]))
      .finally(() => setLoading(false));
  }, []);

  const copy = (id, link) => {
    if (!link) return;
    navigator.clipboard?.writeText(link).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  if (loading) {
    return (
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: 20, marginTop: 20 }}>
        <div style={{ height: 16, background: '#F1F5F9', borderRadius: 8, width: '40%', marginBottom: 12 }} />
        <div style={{ height: 60, background: '#F1F5F9', borderRadius: 12 }} />
      </div>
    );
  }

  if (referrals.length === 0) return null;

  const pendingRewards = referrals
    .filter(r => r.status === 'hired' && !r.rewardPaid && r.rewardAmount)
    .reduce((sum, r) => sum + (r.rewardAmount || 0), 0);

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', marginTop: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#0A1628' }}>💼 My Job Referrals</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Track friends you've referred to specific job openings and your cash rewards.</div>
        </div>
        {pendingRewards > 0 && (
          <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '8px 14px', textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#92400E', fontWeight: 700, letterSpacing: '0.06em' }}>PENDING REWARDS</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#92400E' }}>₹{pendingRewards.toLocaleString('en-IN')}</div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {referrals.map(r => {
          const meta = STATUS_META[r.status] || STATUS_META.pending;
          const id = String(r.id || r._id);
          return (
            <div key={id} style={{ padding: '14px 16px', borderBottom: '1px solid #F8FAFC' }}>
              {/* Title — full width, never squished */}
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0A1628', marginBottom: 3, wordBreak: 'break-word', lineHeight: 1.4 }}>
                {r.jobId?.title || 'Job opening'}
              </div>

              {/* Company / referred name */}
              {(r.jobId?.companyName || r.jobId?.company || r.candidateId?.name) && (
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 3 }}>
                  {r.jobId?.companyName || r.jobId?.company || ''}
                  {r.candidateId?.name ? ` · Referred: ${r.candidateId.name}` : ''}
                </div>
              )}

              {/* Date */}
              <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 10 }}>
                Created {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>

              {/* Actions row — status + reward + copy */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '4px 10px', color: meta.color, background: meta.bg, whiteSpace: 'nowrap' }}>
                    {meta.label}
                  </span>
                  {r.rewardAmount > 0 && (
                    <span style={{ fontSize: 13, fontWeight: 800, color: r.status === 'hired' ? '#15803D' : '#92400E' }}>
                      ₹{r.rewardAmount.toLocaleString('en-IN')}
                      {r.status === 'hired' && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: r.rewardPaid ? '#15803D' : '#92400E', marginLeft: 4 }}>
                          {r.rewardPaid ? '✓ Paid' : 'Processing'}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                {r.link && r.status === 'pending' && (
                  <button
                    onClick={() => copy(id, r.link)}
                    style={{ background: copiedId === id ? '#16A34A' : '#0176D3', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    {copiedId === id ? '✓ Copied' : '📋 Copy Link'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
