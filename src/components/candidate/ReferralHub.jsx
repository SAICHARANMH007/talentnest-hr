import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../api/api.js';

const BADGE_TIERS = [
  { name: 'Bronze',  icon: '🥉', threshold: 50,   color: '#CD7F32', bg: 'rgba(205,127,50,0.12)'  },
  { name: 'Silver',  icon: '🥈', threshold: 200,  color: '#9E9E9E', bg: 'rgba(158,158,158,0.12)' },
  { name: 'Gold',    icon: '🥇', threshold: 500,  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  { name: 'Diamond', icon: '💎', threshold: 1000, color: '#7C3AED', bg: 'rgba(124,58,237,0.12)'  },
];

const VERIFIED_COST = 100;

function getBadgeProgress(coins) {
  const earned = [...BADGE_TIERS].reverse().find(t => coins >= t.threshold) || null;
  const next   = BADGE_TIERS.find(t => coins < t.threshold) || null;
  const prevTh = next ? (BADGE_TIERS[BADGE_TIERS.indexOf(next) - 1]?.threshold || 0) : 0;
  const pct    = next ? Math.min(100, ((coins - prevTh) / (next.threshold - prevTh)) * 100) : 100;
  return { earned, next, pct };
}

// ── Share modal ────────────────────────────────────────────────────────────────
function ShareModal({ link, onClose, onShared }) {
  const [copied, setCopied] = useState(false);
  const tracked = useRef(false);

  const trackShare = () => {
    if (tracked.current) return;
    tracked.current = true;
    api.trackPlatformInvite().then(() => onShared?.()).catch(() => {});
  };

  const copy = () => {
    const fallback = () => {
      const el = Object.assign(document.createElement('textarea'), { value: link });
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
    };
    (navigator.clipboard?.writeText(link) ?? Promise.reject()).catch(fallback).finally(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
      trackShare();
    });
  };

  const wa = () => {
    trackShare();
    window.open(`https://wa.me/?text=${encodeURIComponent(`Join me on TalentNest HR — the smartest career & hiring platform!\n\nCreate your free account here: ${link}`)}`, '_blank');
  };

  const mail = () => {
    trackShare();
    window.open(
      `mailto:?subject=You're invited to TalentNest HR&body=${encodeURIComponent(
        `Hi,\n\nI'd like to invite you to TalentNest HR — discover jobs, track applications, and grow your career.\n\nSign up for free: ${link}\n\nSee you inside!`
      )}`, '_blank'
    );
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:20, padding:28, maxWidth:420, width:'100%', boxShadow:'0 24px 80px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontWeight:800, fontSize:17, color:'#0A1628' }}>Share Your Referral Link</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#9CA3AF' }}>✕</button>
        </div>

        <div style={{ background:'#F8FAFC', border:'1.5px solid #E2E8F0', borderRadius:12, padding:'12px 14px', marginBottom:16 }}>
          <div style={{ fontSize:10, color:'#6B7280', fontWeight:700, letterSpacing:'0.08em', marginBottom:4 }}>YOUR REFERRAL LINK</div>
          <div style={{ fontSize:12, color:'#374151', wordBreak:'break-all', lineHeight:1.6 }}>{link}</div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={copy} style={{ width:'100%', padding:'12px', borderRadius:10, border:'none', background: copied ? '#059669' : '#0176D3', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', transition:'background 0.2s' }}>
            {copied ? '✓ Copied!' : '📋 Copy Link'}
          </button>
          <button onClick={wa}   style={{ width:'100%', padding:'12px', borderRadius:10, border:'none', background:'#25D366', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer' }}>
            💬 Share via WhatsApp
          </button>
          <button onClick={mail} style={{ width:'100%', padding:'12px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#F9FAFB', color:'#374151', fontWeight:700, fontSize:14, cursor:'pointer' }}>
            ✉️ Share via Email
          </button>
        </div>

        <div style={{ marginTop:16, background:'rgba(1,118,211,0.06)', borderRadius:10, padding:'10px 12px' }}>
          <p style={{ margin:0, fontSize:11, color:'#374151', lineHeight:1.7 }}>
            <strong>+25 coins</strong> credited when your friend creates an account using this link.<br/>
            Platform recognition badges only — no cash rewards.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Verified badge modal ───────────────────────────────────────────────────────
function VerifiedModal({ coins, onClose, onRedeem }) {
  const [loading, setLoading] = useState(false);
  const canAfford = coins >= VERIFIED_COST;

  const redeem = async () => {
    setLoading(true);
    try {
      await api.redeemVerifiedBadge();
      onRedeem();
      onClose();
    } catch (e) {
      alert(e.message || 'Could not redeem. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:20, padding:28, maxWidth:400, width:'100%', boxShadow:'0 24px 80px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:52 }}>✅</div>
          <div style={{ fontWeight:900, fontSize:18, color:'#0A1628', marginTop:8 }}>TalentNest Verified Badge</div>
          <div style={{ fontSize:13, color:'#6B7280', marginTop:6, lineHeight:1.6 }}>
            Spend {VERIFIED_COST} coins to permanently unlock the Verified badge on your profile — visible to all recruiters browsing our platform.
          </div>
        </div>

        <div style={{ background:'#F0FDF4', borderRadius:12, padding:'14px 16px', marginBottom:16, border:'1px solid #BBF7D0' }}>
          <div style={{ fontWeight:700, fontSize:12, color:'#15803D', marginBottom:8 }}>What you get:</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {['✅ "Verified by TalentNest HR" badge on your profile', '🔍 Increased trust with recruiters', '📈 Higher visibility in recruiter searches', '🏆 Lifetime badge — never expires'].map(t => (
              <div key={t} style={{ fontSize:12, color:'#166534' }}>{t}</div>
            ))}
          </div>
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, padding:'10px 14px', background:'#F8FAFC', borderRadius:10 }}>
          <div style={{ fontSize:13, color:'#374151', fontWeight:600 }}>Your balance</div>
          <div style={{ fontSize:16, fontWeight:800, color: canAfford ? '#15803D' : '#BA0517' }}>🪙 {coins} coins</div>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'12px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', color:'#374151', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            Cancel
          </button>
          <button
            onClick={canAfford ? redeem : undefined}
            disabled={!canAfford || loading}
            style={{ flex:2, padding:'12px', borderRadius:10, border:'none', background: canAfford ? 'linear-gradient(135deg,#15803D,#059669)' : '#E5E7EB', color: canAfford ? '#fff' : '#9CA3AF', fontWeight:700, fontSize:13, cursor: canAfford ? 'pointer' : 'not-allowed' }}
          >
            {loading ? 'Processing…' : canAfford ? `Redeem for ${VERIFIED_COST} coins` : `Need ${VERIFIED_COST - coins} more coins`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ReferralHub({ user }) {
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [showShare, setShowShare]     = useState(false);
  const [showVerified, setShowVerified] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showBenefits, setShowBenefits] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setStats(await api.getPlatformReferralStats()); }
    catch { setStats(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', padding:20, marginBottom:20 }}>
        <div style={{ height:16, background:'#F1F5F9', borderRadius:8, width:'40%', marginBottom:12 }} />
        <div style={{ height:90, background:'#F1F5F9', borderRadius:12 }} />
      </div>
    );
  }

  const coins       = stats?.coins || 0;
  const { earned: badgeTier, next: nextTier, pct } = getBadgeProgress(coins);
  const referrals   = stats?.referrals || [];
  const invitesSent = stats?.invitesSent || 0;
  const joined      = stats?.joined || 0;
  const link        = stats?.referralLink || '';
  const isVerified  = stats?.isVerified || false;

  const invited    = referrals.filter(r => r.status === 'invited');
  const signedUp   = referrals.filter(r => r.status === 'signed_up' || r.status === 'active');

  return (
    <>
      {showShare  && <ShareModal link={link} onClose={() => setShowShare(false)} onShared={() => { load(); }} />}
      {showVerified && <VerifiedModal coins={coins} onClose={() => setShowVerified(false)} onRedeem={() => { load(); }} />}

      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', overflow:'hidden', marginBottom:20, boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#0A1628 0%,#0176D3 100%)', padding:'18px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <div>
            <div style={{ color:'rgba(255,255,255,0.65)', fontSize:10, fontWeight:700, letterSpacing:'0.12em', marginBottom:4 }}>REFER &amp; EARN</div>
            <div style={{ color:'#fff', fontWeight:800, fontSize:15, lineHeight:1.3 }}>Invite Friends · Earn Coins · Unlock Badges</div>
            {isVerified && (
              <div style={{ marginTop:6, display:'inline-flex', alignItems:'center', gap:5, background:'rgba(34,197,94,0.2)', border:'1px solid rgba(34,197,94,0.4)', borderRadius:99, padding:'3px 10px' }}>
                <span style={{ fontSize:10 }}>✅</span>
                <span style={{ color:'#4ADE80', fontSize:11, fontWeight:700 }}>TalentNest Verified</span>
              </div>
            )}
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ color:'#F59E0B', fontSize:26, fontWeight:900, lineHeight:1 }}>🪙 {coins}</div>
            <div style={{ color:'rgba(255,255,255,0.55)', fontSize:10, marginTop:2 }}>total coins</div>
          </div>
        </div>

        <div style={{ padding:20 }}>

          {/* Verified badge promo — show when not yet verified */}
          {!isVerified && (
            <div style={{ background:'linear-gradient(135deg,rgba(1,118,211,0.05),rgba(124,58,237,0.05))', border:'1.5px solid rgba(1,118,211,0.2)', borderRadius:12, padding:'14px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ fontSize:32, flexShrink:0 }}>✅</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:13, color:'#0A1628' }}>TalentNest Verified Badge</div>
                <div style={{ fontSize:11, color:'#4B5563', marginTop:3, lineHeight:1.5 }}>
                  Spend <strong>{VERIFIED_COST} coins</strong> to get a verified badge on your profile — recruiters trust verified candidates more.
                </div>
                {coins < VERIFIED_COST && (
                  <div style={{ fontSize:10, color:'#6B7280', marginTop:4 }}>You need {VERIFIED_COST - coins} more coins to unlock this.</div>
                )}
              </div>
              <button
                onClick={() => setShowVerified(true)}
                style={{ flexShrink:0, padding:'8px 12px', borderRadius:10, border:'none', background: coins >= VERIFIED_COST ? 'linear-gradient(135deg,#15803D,#059669)' : '#E5E7EB', color: coins >= VERIFIED_COST ? '#fff' : '#6B7280', fontWeight:700, fontSize:11, cursor:'pointer', whiteSpace:'nowrap' }}
              >
                {coins >= VERIFIED_COST ? 'Redeem' : `${VERIFIED_COST}🪙`}
              </button>
            </div>
          )}

          {/* Badge tier progress */}
          {badgeTier ? (
            <div style={{ background: badgeTier.bg, border:`1.5px solid ${badgeTier.color}44`, borderRadius:12, padding:'14px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ fontSize:38, flexShrink:0 }}>{badgeTier.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:15, color: badgeTier.color }}>{badgeTier.name} Badge Earned!</div>
                <div style={{ fontSize:12, color:'#4B5563', marginTop:3, lineHeight:1.5 }}>Recruiters can see your {badgeTier.name} badge on your profile.</div>
                {nextTier && <div style={{ fontSize:11, color:'#6B7280', marginTop:5 }}>{nextTier.icon} {nextTier.name} at {nextTier.threshold}🪙 · {nextTier.threshold - coins} to go</div>}
              </div>
            </div>
          ) : (
            <div style={{ background:'#F8FAFC', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <div style={{ fontWeight:700, fontSize:13, color:'#0A1628' }}>{nextTier ? `${nextTier.icon} ${nextTier.threshold - coins} coins to ${nextTier.name} Badge` : 'Collect coins'}</div>
                <div style={{ fontSize:11, color:'#6B7280', fontWeight:600 }}>{coins} / {nextTier?.threshold || 50}</div>
              </div>
              <div style={{ background:'#E2E8F0', borderRadius:99, height:8, overflow:'hidden', marginBottom:12 }}>
                <div style={{ background:'linear-gradient(90deg,#F59E0B,#0176D3)', height:'100%', width:`${pct}%`, borderRadius:99, transition:'width 0.6s ease' }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:4 }}>
                {BADGE_TIERS.map(t => (
                  <div key={t.name} style={{ textAlign:'center', opacity: coins >= t.threshold ? 1 : 0.35 }}>
                    <div style={{ fontSize:20 }}>{t.icon}</div>
                    <div style={{ fontSize:9, fontWeight:700, color: t.color, marginTop:2 }}>{t.name}</div>
                    <div style={{ fontSize:9, color:'#9CA3AF' }}>{t.threshold}🪙</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
            {[
              { label:'Invites Sent', value: invitesSent, icon:'📤' },
              { label:'Joined',       value: joined,      icon:'✅' },
              { label:'Coins',        value: `+${coins}`, icon:'🪙' },
            ].map(s => (
              <div key={s.label} style={{ background:'#F8FAFC', borderRadius:10, padding:'12px 8px', textAlign:'center', border:'1px solid #E2E8F0' }}>
                <div style={{ fontSize:20 }}>{s.icon}</div>
                <div style={{ fontWeight:900, fontSize:18, color:'#0A1628', marginTop:4 }}>{s.value}</div>
                <div style={{ fontSize:10, color:'#6B7280', fontWeight:600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div style={{ borderRadius:12, border:'1px solid #E2E8F0', padding:'14px 16px', marginBottom:16 }}>
            <div style={{ fontWeight:700, fontSize:11, color:'#374151', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>How It Works</div>
            {[
              ['1', 'Share your unique link with friends or colleagues'],
              ['2', 'They click the link and create a free TalentNest HR account'],
              ['3', 'You instantly earn +25 coins per successful sign-up'],
            ].map(([n, t]) => (
              <div key={n} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:8 }}>
                <div style={{ width:22, height:22, borderRadius:99, background:'#0176D3', color:'#fff', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{n}</div>
                <div style={{ fontSize:12, color:'#4B5563', lineHeight:1.5, paddingTop:2 }}>{t}</div>
              </div>
            ))}
          </div>

          {/* Coins benefit education section */}
          <div style={{ borderRadius:12, border:'1px solid rgba(245,158,11,0.3)', background:'rgba(245,158,11,0.04)', padding:'14px 16px', marginBottom:16 }}>
            <button
              onClick={() => setShowBenefits(b => !b)}
              style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', padding:0 }}
            >
              <div style={{ fontWeight:700, fontSize:12, color:'#92400E' }}>🪙 How coins benefit you — now &amp; in the future</div>
              <span style={{ color:'#92400E', fontSize:14 }}>{showBenefits ? '▲' : '▼'}</span>
            </button>
            {showBenefits && (
              <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  { tag:'NOW',    color:'#059669', bg:'rgba(5,150,105,0.1)',  items:[
                    '🥉🥈🥇💎 Earn tier badges (Bronze → Diamond) shown on your profile',
                    `✅ Spend ${VERIFIED_COST} coins → TalentNest Verified badge (lifetime, recruiter-visible)`,
                  ]},
                  { tag:'SOON',   color:'#0176D3', bg:'rgba(1,118,211,0.1)',  items:[
                    '🔝 Profile boost — appear higher in recruiter searches for 7 days',
                    '📄 Priority resume review by our talent team',
                  ]},
                  { tag:'FUTURE', color:'#7C3AED', bg:'rgba(124,58,237,0.1)', items:[
                    '🎓 Unlock premium skill assessment credits',
                    '🤝 Access exclusive referral-only job openings',
                  ]},
                ].map(sec => (
                  <div key={sec.tag}>
                    <span style={{ fontSize:10, fontWeight:800, color: sec.color, background: sec.bg, borderRadius:99, padding:'2px 8px' }}>{sec.tag}</span>
                    <div style={{ marginTop:6, display:'flex', flexDirection:'column', gap:4 }}>
                      {sec.items.map(item => (
                        <div key={item} style={{ fontSize:11, color:'#4B5563', lineHeight:1.5 }}>{item}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CTA */}
          <button
            onClick={() => setShowShare(true)}
            style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#0176D3,#0369A1)', color:'#fff', fontWeight:800, fontSize:14, cursor:'pointer', boxShadow:'0 4px 16px rgba(1,118,211,0.3)' }}
          >
            🔗 Invite Someone Now — Earn 25 Coins
          </button>

          <p style={{ margin:'10px 0 0', fontSize:10, color:'#9CA3AF', textAlign:'center', lineHeight:1.6 }}>
            Platform badges only — no cash. One credit per unique sign-up. Self-referral not allowed.
          </p>

          {/* Referral history */}
          {referrals.length > 0 && (
            <div style={{ marginTop:14, borderTop:'1px solid #F1F5F9', paddingTop:14 }}>
              <button onClick={() => setShowHistory(h => !h)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'#0176D3', fontWeight:700, padding:0, display:'flex', alignItems:'center', gap:6 }}>
                {showHistory ? '▲ Hide' : '▼ Show'} activity ({referrals.length})
              </button>
              {showHistory && (
                <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:8 }}>
                  {referrals.map(r => (
                    <div key={String(r.id)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:'#F8FAFC', borderRadius:10, border:'1px solid #E2E8F0' }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:13, color:'#0A1628' }}>
                          {r.status === 'invited' ? '📤 Invite shared' : r.referredName || 'Someone joined'}
                        </div>
                        {r.referredEmail && r.status !== 'invited' && <div style={{ fontSize:11, color:'#6B7280' }}>{r.referredEmail}</div>}
                        <div style={{ fontSize:10, color:'#9CA3AF', marginTop:2 }}>
                          {new Date(r.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        {r.coinsAwarded > 0 && <div style={{ fontSize:13, fontWeight:800, color:'#F59E0B' }}>+{r.coinsAwarded}🪙</div>}
                        <div style={{
                          fontSize:10, fontWeight:700, marginTop:4, display:'inline-block', borderRadius:99, padding:'2px 8px',
                          background: r.status==='active'?'rgba(34,197,94,0.1)': r.status==='signed_up'?'rgba(14,165,233,0.1)':'rgba(100,116,139,0.1)',
                          color:      r.status==='active'?'#15803D':             r.status==='signed_up'?'#0369A1':             '#475569',
                        }}>
                          {r.status==='active'?'Active': r.status==='signed_up'?'Joined':'Waiting to join'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
