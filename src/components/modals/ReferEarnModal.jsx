import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal.jsx';
import { api } from '../../api/api.js';

const SITE = typeof window !== 'undefined' ? window.location.origin : 'https://www.talentnesthr.com';

export default function ReferEarnModal({ job, onClose }) {
  const [link,      setLink]      = useState('');
  const [generating, setGen]      = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [error,     setError]     = useState('');

  const user = (() => {
    try { return JSON.parse(sessionStorage.getItem('tn_user') || 'null'); } catch { return null; }
  })();

  const rewardAmt = job?.referralReward ?? null;

  useEffect(() => {
    if (user && job && !link) generate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const generate = async () => {
    setGen(true);
    setError('');
    try {
      const r = await api.generateReferralLink({ jobId: job._id || job.id });
      setLink(r?.link || r?.data?.link || '');
    } catch (e) {
      setError(e?.message || 'Could not generate referral link. Please try again.');
    }
    setGen(false);
  };

  const copy = () => {
    if (!link) return;
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const shareWhatsApp = () => {
    const jobTitle = job?.title || 'this job';
    const company  = job?.company || job?.companyName || '';
    const msg = rewardAmt
      ? `Hey! I'm referring you for ${jobTitle}${company ? ` at ${company}` : ''}. Apply using my link — if you get hired, I earn ₹${rewardAmt?.toLocaleString()}! 🎉\n${link}`
      : `Hey! I'm referring you for ${jobTitle}${company ? ` at ${company}` : ''}. Apply using my referral link:\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  const shareEmail = () => {
    const jobTitle = job?.title || 'this job';
    const subject  = encodeURIComponent(`Job Referral: ${jobTitle}`);
    const body     = encodeURIComponent(
      rewardAmt
        ? `Hi,\n\nI'm referring you for the ${jobTitle} role. Use my referral link below — if you're hired, I earn ₹${rewardAmt?.toLocaleString()} as a referral reward.\n\n${link}\n\nGood luck!\n${user?.name || ''}`
        : `Hi,\n\nI'm referring you for the ${jobTitle} role. Apply using my link:\n\n${link}\n\nGood luck!\n${user?.name || ''}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const btn = (bg, color = '#fff') => ({
    background: bg, color, border: 'none', borderRadius: 10, padding: '11px 18px',
    fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
  });

  return (
    <Modal title="🤝 Refer & Earn" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Job info */}
        <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '12px 16px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 2 }}>{job?.title}</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>{job?.company || job?.companyName}{job?.location ? ` · ${job.location}` : ''}</div>
        </div>

        {/* Reward banner */}
        {rewardAmt != null && rewardAmt > 0 && (
          <div style={{ background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)', border: '1px solid #F59E0B', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>💰</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#92400E' }}>Earn ₹{rewardAmt?.toLocaleString()} reward!</div>
              <div style={{ fontSize: 11, color: '#B45309' }}>Paid out when your referral gets hired</div>
            </div>
          </div>
        )}

        {!user ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <p style={{ fontSize: 13, color: '#374151', marginBottom: 14, lineHeight: 1.6 }}>
              Sign in to generate your personal referral link and{rewardAmt ? ` earn ₹${rewardAmt?.toLocaleString()} when your referral is hired!` : ' track your referrals.'}
            </p>
            <a href={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
              style={{ display: 'inline-block', background: 'linear-gradient(135deg,#0176D3,#014486)', color: '#fff', borderRadius: 10, padding: '11px 24px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
              Sign In to Refer →
            </a>
          </div>
        ) : !link ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#B91C1C' }}>{error}</div>
            )}
            <button onClick={generate} disabled={generating} style={{ ...btn('linear-gradient(135deg,#0176D3,#014486)'), margin: '0 auto', padding: '12px 28px', fontSize: 14 }}>
              {generating ? 'Generating…' : '🔗 Generate My Referral Link'}
            </button>
          </div>
        ) : (
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Your Referral Link</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              <input readOnly value={link}
                style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1.5px solid #CBD5E1', fontSize: 11, background: '#F8FAFC', color: '#374151', outline: 'none', minWidth: 0 }}
                onFocus={e => e.target.select()} />
              <button onClick={copy} style={btn(copied ? '#16A34A' : '#0176D3')}>
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <button onClick={shareWhatsApp} style={btn('#25D366')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                WhatsApp
              </button>
              <button onClick={shareEmail} style={btn('#374151')}>✉️ Email</button>
            </div>

            <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
              Share this link with the candidate. You'll be notified when they apply{rewardAmt ? ` and when your reward is processed.` : '.'}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
