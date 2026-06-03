import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/api.js';

const BADGE_TIERS = [
  { name: 'Bronze',  icon: '🥉', threshold: 50,   color: '#CD7F32', bg: 'rgba(205,127,50,0.12)'  },
  { name: 'Silver',  icon: '🥈', threshold: 200,  color: '#9E9E9E', bg: 'rgba(158,158,158,0.12)' },
  { name: 'Gold',    icon: '🥇', threshold: 500,  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  { name: 'Diamond', icon: '💎', threshold: 1000, color: '#7C3AED', bg: 'rgba(124,58,237,0.12)'  },
];

function getBadgeProgress(coins) {
  const earned = [...BADGE_TIERS].reverse().find(t => coins >= t.threshold) || null;
  const next   = BADGE_TIERS.find(t => coins < t.threshold) || null;
  const prevThreshold = next ? (BADGE_TIERS[BADGE_TIERS.indexOf(next) - 1]?.threshold || 0) : 0;
  const pct    = next
    ? Math.min(100, ((coins - prevThreshold) / (next.threshold - prevThreshold)) * 100)
    : 100;
  return { earned, next, pct };
}

function ShareModal({ link, onClose }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const el = document.createElement('textarea');
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const wa = () => window.open(
    `https://wa.me/?text=${encodeURIComponent(`Join me on TalentNest HR — the smartest career & hiring platform!\n\nCreate your free account here: ${link}`)}`,
    '_blank'
  );

  const mail = () => window.open(
    `mailto:?subject=You're invited to TalentNest HR&body=${encodeURIComponent(
      `Hi,\n\nI'd like to invite you to TalentNest HR — a platform that helps you discover jobs, track applications, and grow your career.\n\nSign up for free here:\n${link}\n\nSee you inside!`
    )}`,
    '_blank'
  );

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={onClose}
    >
      <div
        style={{ background:'#fff', borderRadius:20, padding:28, maxWidth:420, width:'100%', boxShadow:'0 24px 80px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontWeight:800, fontSize:17, color:'#0A1628' }}>Share Your Referral Link</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#9CA3AF', lineHeight:1 }}>✕</button>
        </div>

        <div style={{ background:'#F8FAFC', border:'1.5px solid #E2E8F0', borderRadius:12, padding:'12px 14px', marginBottom:16 }}>
          <div style={{ fontSize:10, color:'#6B7280', marginBottom:4, fontWeight:700, letterSpacing:'0.08em' }}>YOUR REFERRAL LINK</div>
          <div style={{ fontSize:12, color:'#374151', wordBreak:'break-all', lineHeight:1.6 }}>{link}</div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button onClick={copy} style={{ width:'100%', padding:'12px', borderRadius:10, border:'none', background: copied ? '#059669' : '#0176D3', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', transition:'background 0.2s' }}>
            {copied ? '✓ Copied to clipboard!' : '📋 Copy Link'}
          </button>
          <button onClick={wa} style={{ width:'100%', padding:'12px', borderRadius:10, border:'none', background:'#25D366', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer' }}>
            💬 Share via WhatsApp
          </button>
          <button onClick={mail} style={{ width:'100%', padding:'12px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#F9FAFB', color:'#374151', fontWeight:700, fontSize:14, cursor:'pointer' }}>
            ✉️ Share via Email
          </button>
        </div>

        <div style={{ marginTop:16, background:'rgba(1,118,211,0.06)', borderRadius:10, padding:'10px 12px' }}>
          <p style={{ margin:0, fontSize:11, color:'#374151', lineHeight:1.7 }}>
            <strong>25 coins</strong> credited to you when someone signs up using your link.<br/>
            Coins unlock profile badges — no cash rewards involved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ReferralHub({ user }) {
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [showShare, setShowShare]   = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getPlatformReferralStats();
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', padding:20, marginBottom:20 }}>
        <div style={{ height:16, background:'#F1F5F9', borderRadius:8, width:'40%', marginBottom:12, animation:'pulse 1.5s ease infinite' }} />
        <div style={{ height:90, background:'#F1F5F9', borderRadius:12, animation:'pulse 1.5s ease infinite' }} />
      </div>
    );
  }

  const coins       = stats?.coins || 0;
  const { earned: badgeTier, next: nextTier, pct } = getBadgeProgress(coins);
  const referrals   = stats?.referrals || [];
  const totalCount  = stats?.totalReferrals || 0;
  const link        = stats?.referralLink || '';

  return (
    <>
      {showShare && <ShareModal link={link} onClose={() => setShowShare(false)} />}

      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', overflow:'hidden', marginBottom:20, boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>

        {/* Dark header */}
        <div style={{ background:'linear-gradient(135deg,#0A1628 0%,#0176D3 100%)', padding:'18px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <div>
            <div style={{ color:'rgba(255,255,255,0.65)', fontSize:10, fontWeight:700, letterSpacing:'0.12em', marginBottom:4 }}>REFER &amp; EARN</div>
            <div style={{ color:'#fff', fontWeight:800, fontSize:15, lineHeight:1.3 }}>Invite Friends · Earn Coins · Unlock Badges</div>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ color:'#F59E0B', fontSize:26, fontWeight:900, lineHeight:1 }}>🪙 {coins}</div>
            <div style={{ color:'rgba(255,255,255,0.55)', fontSize:10, marginTop:2 }}>total coins</div>
          </div>
        </div>

        <div style={{ padding:20 }}>

          {/* Badge card */}
          {badgeTier ? (
            <div style={{ background: badgeTier.bg, border:`1.5px solid ${badgeTier.color}44`, borderRadius:12, padding:'14px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ fontSize:38, flexShrink:0 }}>{badgeTier.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:800, fontSize:15, color: badgeTier.color }}>{badgeTier.name} Badge Earned!</div>
                <div style={{ fontSize:12, color:'#4B5563', marginTop:3, lineHeight:1.5 }}>
                  Your profile now displays the {badgeTier.name} badge — visible to recruiters browsing your profile.
                </div>
                {nextTier && (
                  <div style={{ fontSize:11, color:'#6B7280', marginTop:6 }}>
                    Next: {nextTier.icon} {nextTier.name} at {nextTier.threshold}🪙 &nbsp;·&nbsp; {nextTier.threshold - coins} coins to go
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ background:'#F8FAFC', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div style={{ fontWeight:700, fontSize:13, color:'#0A1628' }}>
                  {nextTier ? `${nextTier.icon} ${nextTier.threshold - coins} coins to ${nextTier.name} Badge` : 'Collect coins'}
                </div>
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

          {/* Stats row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
            {[
              { label: 'Invited',  value: totalCount,   icon: '📤' },
              { label: 'Joined',   value: totalCount,   icon: '✅' },
              { label: 'Coins',    value: `+${coins}`,  icon: '🪙' },
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
            <div style={{ fontWeight:700, fontSize:12, color:'#374151', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>How It Works</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                ['1', 'Share your unique referral link with friends or colleagues'],
                ['2', 'They click the link and create a free TalentNest HR account'],
                ['3', 'You earn 25 coins per successful sign-up — instantly'],
              ].map(([step, text]) => (
                <div key={step} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                  <div style={{ width:22, height:22, borderRadius:99, background:'#0176D3', color:'#fff', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {step}
                  </div>
                  <div style={{ fontSize:12, color:'#4B5563', lineHeight:1.5, paddingTop:2 }}>{text}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA button */}
          <button
            onClick={() => setShowShare(true)}
            style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#0176D3,#0369A1)', color:'#fff', fontWeight:800, fontSize:14, cursor:'pointer', letterSpacing:'0.02em', boxShadow:'0 4px 16px rgba(1,118,211,0.3)' }}
          >
            🔗 Invite Someone Now — Earn 25 Coins
          </button>

          <p style={{ margin:'10px 0 0', fontSize:10, color:'#9CA3AF', textAlign:'center', lineHeight:1.6 }}>
            Platform badges only — no cash. One credit per unique sign-up. By sharing you agree to our referral terms.
          </p>

          {/* Referral history */}
          {totalCount > 0 && (
            <div style={{ marginTop:14, borderTop:'1px solid #F1F5F9', paddingTop:14 }}>
              <button
                onClick={() => setShowHistory(h => !h)}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'#0176D3', fontWeight:700, padding:0, display:'flex', alignItems:'center', gap:6 }}
              >
                {showHistory ? '▲' : '▼'} {showHistory ? 'Hide' : 'Show'} referral history ({totalCount})
              </button>
              {showHistory && (
                <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:8 }}>
                  {referrals.map(r => (
                    <div key={r.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:'#F8FAFC', borderRadius:10, border:'1px solid #E2E8F0' }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:13, color:'#0A1628' }}>{r.referredName}</div>
                        {r.referredEmail && <div style={{ fontSize:11, color:'#6B7280' }}>{r.referredEmail}</div>}
                        <div style={{ fontSize:10, color:'#9CA3AF', marginTop:2 }}>
                          {new Date(r.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:13, fontWeight:800, color:'#F59E0B' }}>+{r.coinsAwarded}🪙</div>
                        <div style={{
                          fontSize:10,
                          background: r.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(14,165,233,0.1)',
                          color: r.status === 'active' ? '#15803D' : '#0369A1',
                          borderRadius:99, padding:'2px 8px', fontWeight:700, marginTop:4, display:'inline-block',
                        }}>
                          {r.status === 'active' ? 'Active' : 'Signed Up'}
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
