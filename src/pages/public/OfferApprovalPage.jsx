import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api/api.js';

export default function OfferApprovalPage() {
  const { offerId }     = useParams();
  const [params]        = useSearchParams();
  const token           = params.get('token');
  const urlAction       = params.get('action'); // 'approve' | 'reject'

  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(null); // { action, message }
  const [comment, setComment]   = useState('');
  const [error, setError]       = useState('');

  // Auto-submit if action is in URL
  useEffect(() => {
    if (urlAction && token && !done) {
      handleDecision(urlAction);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDecision = async (action) => {
    if (!token) { setError('Invalid approval link — missing token'); return; }
    setLoading(true);
    setError('');
    try {
      await api.decideOfferApproval(offerId, token, action, comment);
      setDone({ action, message: action === 'approve' ? '✅ Offer approved successfully!' : '❌ Offer has been rejected.' });
    } catch (e) {
      setError(e.message || 'Failed to process decision');
    } finally {
      setLoading(false);
    }
  };

  const bg = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  };

  const card = {
    background: '#fff',
    borderRadius: 20,
    boxShadow: '0 8px 40px rgba(124,58,237,0.10)',
    maxWidth: 480,
    width: '100%',
    overflow: 'hidden',
  };

  if (done) return (
    <div style={bg}>
      <div style={card}>
        <div style={{ background: done.action === 'approve' ? 'linear-gradient(135deg,#059669,#10B981)' : 'linear-gradient(135deg,#BA0517,#EF4444)', padding: '28px 32px' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>{done.action === 'approve' ? '✅' : '❌'}</div>
          <h1 style={{ color: '#fff', margin: 0, fontSize: 20, fontWeight: 700 }}>{done.action === 'approve' ? 'Approved!' : 'Rejected'}</h1>
        </div>
        <div style={{ padding: '28px 32px' }}>
          <p style={{ color: '#374151', fontSize: 15 }}>{done.message}</p>
          <p style={{ color: '#6B7280', fontSize: 13 }}>The HR team has been notified of your decision. You may now close this page.</p>
          <p style={{ color: '#9CA3AF', fontSize: 11, marginTop: 20 }}>Powered by <strong>TalentNest HR</strong></p>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div style={bg}>
      <div style={{ ...card, padding: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <p style={{ color: '#6B7280', fontSize: 15 }}>Processing your decision…</p>
      </div>
    </div>
  );

  return (
    <div style={bg}>
      <div style={card}>
        <div style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', padding: '28px 32px' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
          <h1 style={{ color: '#fff', margin: 0, fontSize: 20, fontWeight: 700 }}>Offer Letter Approval</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: '6px 0 0', fontSize: 13 }}>Your review is required for this offer letter.</p>
        </div>
        <div style={{ padding: '28px 32px' }}>
          {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#BA0517', fontSize: 13 }}>{error}</div>}
          <p style={{ color: '#374151', fontSize: 14, margin: '0 0 20px', lineHeight: 1.7 }}>
            Please review the offer letter and provide your decision. If rejecting, an optional comment helps the HR team understand the concern.
          </p>
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>Comment (optional)</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              placeholder="Any feedback or reason for rejection…"
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => handleDecision('reject')}
              style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: '2px solid #BA0517', background: '#fff', color: '#BA0517', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >
              ✕ Reject
            </button>
            <button
              onClick={() => handleDecision('approve')}
              style={{ flex: 2, padding: '14px 0', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#059669,#10B981)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >
              ✓ Approve Offer
            </button>
          </div>
          <p style={{ color: '#9CA3AF', fontSize: 11, marginTop: 16, textAlign: 'center' }}>
            Powered by <strong>TalentNest HR</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
