import React, { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import Modal from '../ui/Modal.jsx';
import Spinner from '../ui/Spinner.jsx';
import Toast from '../ui/Toast.jsx';

// ── Coin values per referral status ──────────────────────────────────────────
const COINS = { pending: 0, applied: 10, hired: 60 };

// ── Badge tiers ───────────────────────────────────────────────────────────────
const TIERS = [
  { name: 'Bronze',  coins: 50,   icon: '🥉', bg: 'linear-gradient(135deg,#CD7F32,#A0522D)', text: '#fff' },
  { name: 'Silver',  coins: 200,  icon: '🥈', bg: 'linear-gradient(135deg,#9E9E9E,#757575)', text: '#fff' },
  { name: 'Gold',    coins: 500,  icon: '🥇', bg: 'linear-gradient(135deg,#FFD700,#FFA000)', text: '#fff' },
  { name: 'Diamond', coins: 1000, icon: '💎', bg: 'linear-gradient(135deg,#0176D3,#032D60)', text: '#fff' },
];

function coinsByReferral(refs) {
  return refs.reduce((sum, r) => sum + (COINS[r.status] || 0), 0);
}

function currentTier(coins) {
  return [...TIERS].reverse().find(t => coins >= t.coins) || null;
}

function nextTier(coins) {
  return TIERS.find(t => coins < t.coins) || null;
}

// ── Job picker modal ──────────────────────────────────────────────────────────
function JobPickerModal({ onClose, onPicked }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    api.getPublicJobs()
      .then(r => setJobs(Array.isArray(r) ? r : (r?.data || [])))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = jobs.filter(j =>
    !q || `${j.title} ${j.company || j.companyName} ${j.location}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <Modal title="📋 Pick a Job to Share" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search jobs…"
          style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #CBD5E1', fontSize: 13, outline: 'none' }}
          autoFocus
        />
        {loading ? (
          <div style={{ textAlign: 'center', padding: 24 }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#9CA3AF', fontSize: 13 }}>No jobs found</div>
        ) : (
          <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.slice(0, 30).map(j => (
              <button
                key={j._id || j.id}
                onClick={() => onPicked(j)}
                style={{
                  background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 10,
                  padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#0176D3'; e.currentTarget.style.background = 'rgba(1,118,211,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#F8FAFC'; }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>{j.title}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                  {j.company || j.companyName}{j.location ? ` · ${j.location}` : ''}
                  {j.referralReward ? <span style={{ color: '#059669', fontWeight: 700, marginLeft: 6 }}>💰 ₹{j.referralReward.toLocaleString()} reward</span> : null}
                </div>
              </button>
            ))}
          </div>
        )}
        <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0, textAlign: 'center' }}>
          Select a job to generate your personal referral link
        </p>
      </div>
    </Modal>
  );
}

// ── Share modal — link generated, ready to copy/share ─────────────────────────
function ShareModal({ job, link, onClose }) {
  const [copied, setCopied] = useState(false);
  const rewardAmt = job?.referralReward;

  const copy = () => {
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const wa = () => {
    const msg = rewardAmt
      ? `Hey! Apply for ${job.title}${job.company ? ` at ${job.company}` : ''} using my referral link. If you get hired I earn a reward! 🎉\n${link}`
      : `Hey! Check out this job — ${job.title}${job.company ? ` at ${job.company}` : ''}. Apply using my link:\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <Modal title="🔗 Your Referral Link" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0A1628', marginBottom: 2 }}>{job.title}</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>{job.company || job.companyName}{job.location ? ` · ${job.location}` : ''}</div>
        </div>

        {rewardAmt > 0 && (
          <div style={{ background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)', border: '1px solid #F59E0B', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 20 }}>💰</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#92400E' }}>Earn ₹{rewardAmt.toLocaleString()} if they get hired!</div>
              <div style={{ fontSize: 11, color: '#B45309' }}>Plus 10 coins when they apply · 60 coins if they're hired</div>
            </div>
          </div>
        )}

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Your Referral Link</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input readOnly value={link}
              style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1.5px solid #CBD5E1', fontSize: 11, background: '#F8FAFC', color: '#374151', outline: 'none', minWidth: 0 }}
              onFocus={e => e.target.select()} />
            <button onClick={copy}
              style={{ background: copied ? '#059669' : '#0176D3', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button onClick={wa}
            style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            WhatsApp
          </button>
          <button onClick={() => {
            const subj = encodeURIComponent(`Job opportunity: ${job.title}`);
            const body = encodeURIComponent(`Hi,\n\nI'm referring you for the ${job.title} role. Apply using my link:\n\n${link}\n\nGood luck!`);
            window.location.href = `mailto:?subject=${subj}&body=${body}`;
          }}
            style={{ background: '#374151', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            ✉️ Email
          </button>
        </div>

        <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
          You earn <strong>10 coins</strong> when they apply and <strong>50 bonus coins</strong> when they're hired.
        </p>
      </div>
    </Modal>
  );
}

// ── Main ReferralHub ──────────────────────────────────────────────────────────
export default function ReferralHub({ referrals, user }) {
  const [showPicker, setShowPicker] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [shareJob, setShareJob] = useState(null);
  const [shareLink, setShareLink] = useState('');
  const [toast, setToast] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);

  const totalCoins  = coinsByReferral(referrals);
  const tier        = currentTier(totalCoins);
  const next        = nextTier(totalCoins);
  const progress    = next ? Math.min((totalCoins / next.coins) * 100, 100) : 100;

  const appliedRefs = referrals.filter(r => r.status === 'applied').length;
  const hiredRefs   = referrals.filter(r => r.status === 'hired').length;
  const pendingRefs = referrals.filter(r => r.status === 'pending').length;

  const handlePickJob = async (job) => {
    setShowPicker(false);
    setGenerating(true);
    try {
      const r = await api.generateReferralLink({ jobId: job._id || job.id });
      const link = r?.link || r?.data?.link || '';
      if (!link) throw new Error('Could not generate link');
      setShareJob(job);
      setShareLink(link);
    } catch (e) {
      setToast(`❌ ${e.message || 'Could not generate referral link'}`);
    }
    setGenerating(false);
  };

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', marginBottom: 20 }}>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
      {showPicker && <JobPickerModal onClose={() => setShowPicker(false)} onPicked={handlePickJob} />}
      {shareJob && shareLink && <ShareModal job={shareJob} link={shareLink} onClose={() => { setShareJob(null); setShareLink(''); }} />}

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#032D60,#0176D3)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🪙</span>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>Refer &amp; Earn Coins</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Invite friends → earn coins → unlock your badge</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#FFD700', fontWeight: 900, fontSize: 22, lineHeight: 1 }}>{totalCoins}</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>COINS</div>
        </div>
      </div>

      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Badge status */}
        {tier ? (
          <div style={{ background: tier.bg, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 32 }}>{tier.icon}</span>
            <div>
              <div style={{ color: tier.text, fontWeight: 800, fontSize: 14 }}>{tier.name} Badge Unlocked!</div>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 }}>
                {next ? `${next.coins - totalCoins} more coins to ${next.icon} ${next.name}` : '🎉 Maximum tier reached — Diamond achiever!'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, border: '1px dashed #CBD5E1' }}>
            <span style={{ fontSize: 28, opacity: 0.4 }}>🥉</span>
            <div>
              <div style={{ color: '#374151', fontWeight: 700, fontSize: 13 }}>No badge yet — start referring!</div>
              <div style={{ color: '#6B7280', fontSize: 11, marginTop: 2 }}>Earn 50 coins to unlock your first Bronze badge</div>
            </div>
          </div>
        )}

        {/* Progress bar to next tier */}
        {next && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>
                {tier ? `${tier.icon} ${tier.name}` : 'Start'} → {next.icon} {next.name}
              </span>
              <span style={{ fontSize: 11, color: '#0176D3', fontWeight: 700 }}>
                {totalCoins} / {next.coins} coins
              </span>
            </div>
            <div style={{ background: '#F1F5F9', borderRadius: 99, height: 10, overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(90deg,#0176D3,#0EA5E9)', height: '100%', width: `${progress}%`, borderRadius: 99, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {[
            { label: 'Referred', value: referrals.length, color: '#0176D3', icon: '📤' },
            { label: 'Applied',  value: appliedRefs + hiredRefs, color: '#F59E0B', icon: '📋' },
            { label: 'Hired',    value: hiredRefs,   color: '#059669', icon: '🎉' },
          ].map(s => (
            <div key={s.label} style={{ background: '#F8FAFC', borderRadius: 10, padding: '10px 12px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 16, marginBottom: 2 }}>{s.icon}</div>
              <div style={{ fontWeight: 900, fontSize: 18, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* How to earn */}
        <div style={{ background: 'rgba(1,118,211,0.04)', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(1,118,211,0.1)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#0176D3', marginBottom: 8, letterSpacing: '0.08em' }}>HOW TO EARN COINS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { step: '1', text: 'Pick a job below and share your referral link',  coins: null },
              { step: '2', text: 'Friend applies using your link',                  coins: '+10 coins' },
              { step: '3', text: 'Friend gets hired',                               coins: '+50 bonus' },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#0176D3', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.step}</div>
                <div style={{ fontSize: 12, color: '#374151', flex: 1 }}>{s.text}</div>
                {s.coins && <div style={{ fontSize: 11, fontWeight: 800, color: '#059669', whiteSpace: 'nowrap' }}>{s.coins}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => setShowPicker(true)}
          disabled={generating}
          style={{ background: 'linear-gradient(135deg,#0176D3,#014486)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 800, cursor: generating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {generating ? <><Spinner /> Generating link…</> : '🔗 Refer Someone Now — Pick a Job'}
        </button>

        {/* Referral history toggle */}
        {referrals.length > 0 && (
          <div>
            <button
              onClick={() => setHistoryOpen(p => !p)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0176D3', fontWeight: 700, fontSize: 12, padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              {historyOpen ? '▲' : '▼'} My Referral History ({referrals.length})
            </button>

            {historyOpen && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {referrals.slice(0, 10).map((r, i) => {
                  const earned = COINS[r.status] || 0;
                  const statusColor = r.status === 'hired' ? '#059669' : r.status === 'applied' ? '#F59E0B' : '#9CA3AF';
                  const statusLabel = r.status === 'hired' ? '🎉 Hired' : r.status === 'applied' ? '📋 Applied' : '⏳ Pending';
                  return (
                    <div key={r._id || i} style={{ background: '#F8FAFC', borderRadius: 10, padding: '10px 12px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                        {r.candidateId?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.candidateId?.name || r.candidateId?.email || 'Referred Candidate'}
                        </div>
                        <div style={{ fontSize: 10, color: '#6B7280' }}>
                          {r.jobId?.title || 'Job'} {r.jobId?.company ? `· ${r.jobId.company}` : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: statusColor }}>{statusLabel}</div>
                        {earned > 0 && <div style={{ fontSize: 11, fontWeight: 800, color: '#FFD700' }}>+{earned} 🪙</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
