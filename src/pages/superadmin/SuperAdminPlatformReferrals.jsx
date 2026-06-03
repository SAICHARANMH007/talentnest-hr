import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { api } from '../../api/api.js';

const BADGE_TIERS = [
  { name: 'Bronze',  icon: '🥉', threshold: 50,   color: '#CD7F32' },
  { name: 'Silver',  icon: '🥈', threshold: 200,  color: '#9E9E9E' },
  { name: 'Gold',    icon: '🥇', threshold: 500,  color: '#F59E0B' },
  { name: 'Diamond', icon: '💎', threshold: 1000, color: '#7C3AED' },
];

function getBadgeTier(coins) {
  return [...BADGE_TIERS].reverse().find(t => coins >= t.threshold) || null;
}

function KpiBox({ label, value, color = '#0176D3', icon }) {
  return (
    <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'18px 20px', display:'flex', alignItems:'center', gap:14, boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
      {icon && <div style={{ fontSize:28 }}>{icon}</div>}
      <div>
        <div style={{ fontSize:28, fontWeight:900, color, lineHeight:1 }}>{value}</div>
        <div style={{ fontSize:11, color:'#6B7280', marginTop:4, fontWeight:600 }}>{label}</div>
      </div>
    </div>
  );
}

export default function SuperAdminPlatformReferrals() {
  const [list,   setList]   = useState([]);
  const [sStats, setSStats] = useState(null);
  const [total,  setTotal]  = useState(0);
  const [page,   setPage]   = useState(1);
  const [pages,  setPages]  = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try { setSStats(await api.getAdminPlatformReferralStats()); } catch {}
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAdminPlatformReferrals({ page, limit: 50, search });
      setList(data.referrals || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { loadList(); }, [loadList]);

  const topReferrers = sStats?.topReferrers || [];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <PageHeader
        title="Platform Referrals"
        subtitle={`Candidates who referred friends to join TalentNest HR — ${total} total sign-ups tracked`}
      />

      {/* KPI Row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px,1fr))', gap:14, marginBottom:24 }}>
        <KpiBox label="Total Referrals"     value={sStats?.total ?? '—'}             icon="🔗" color="#0176D3" />
        <KpiBox label="Coins Awarded"       value={`${sStats?.totalCoinsAwarded ?? 0}🪙`} icon="🪙" color="#F59E0B" />
        <KpiBox label="Unique Referrers"    value={topReferrers.length}               icon="👥" color="#15803D" />
        <KpiBox label="Per Referral"        value="25🪙"                              icon="⚡" color="#7C3AED" />
      </div>

      {/* Top referrers */}
      {topReferrers.length > 0 && (
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:20, marginBottom:24 }}>
          <div style={{ fontWeight:800, fontSize:14, color:'#0A1628', marginBottom:14 }}>Top Referrers</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:10 }}>
            {topReferrers.map((r, i) => {
              const badge = getBadgeTier(r.coins);
              return (
                <div key={r._id} style={{ background:'#F8FAFC', borderRadius:10, padding:'12px 14px', border:'1px solid #E2E8F0', display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:32, height:32, borderRadius:99, background: i < 3 ? ['#F59E0B','#9E9E9E','#CD7F32'][i] : '#E2E8F0', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, flexShrink:0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:'#0A1628', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.name || 'Unknown'}</div>
                    <div style={{ fontSize:11, color:'#6B7280' }}>{r.count} referrals · {r.coins}🪙</div>
                    {badge && <div style={{ fontSize:10, color: badge.color, fontWeight:700 }}>{badge.icon} {badge.name}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Badge tiers reference */}
      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:16, marginBottom:24 }}>
        <div style={{ fontWeight:700, fontSize:12, color:'#6B7280', letterSpacing:'0.08em', marginBottom:12, textTransform:'uppercase' }}>Badge Tiers</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          {BADGE_TIERS.map(t => (
            <div key={t.name} style={{ textAlign:'center', padding:'10px 8px', background:'#F8FAFC', borderRadius:10, border:'1px solid #E2E8F0' }}>
              <div style={{ fontSize:24 }}>{t.icon}</div>
              <div style={{ fontWeight:700, fontSize:12, color: t.color, marginTop:4 }}>{t.name}</div>
              <div style={{ fontSize:11, color:'#6B7280' }}>{t.threshold}+ coins</div>
            </div>
          ))}
        </div>
      </div>

      {/* List + search */}
      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <div style={{ fontWeight:800, fontSize:14, color:'#0A1628' }}>All Platform Referrals</div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            style={{ padding:'8px 12px', borderRadius:8, border:'1.5px solid #E2E8F0', fontSize:13, outline:'none', minWidth:220 }}
          />
        </div>

        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:'#9CA3AF', fontSize:13 }}>Loading…</div>
        ) : list.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:'#9CA3AF', fontSize:13 }}>
            {search ? 'No results for your search.' : 'No platform referrals recorded yet.'}
          </div>
        ) : (
          <>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:'#F8FAFC', borderBottom:'1px solid #E2E8F0' }}>
                    {['Referrer', 'Referred Person', 'Status', 'Coins', 'Date'].map(h => (
                      <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontWeight:700, color:'#374151', fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map(r => (
                    <tr key={r._id} style={{ borderBottom:'1px solid #F1F5F9' }}>
                      <td style={{ padding:'12px 16px' }}>
                        <div style={{ fontWeight:600, color:'#0A1628' }}>{r.referrerName || '—'}</div>
                        <div style={{ fontSize:11, color:'#6B7280' }}>{r.referrerEmail}</div>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <div style={{ fontWeight:600, color:'#0A1628' }}>{r.referredName || '—'}</div>
                        <div style={{ fontSize:11, color:'#6B7280' }}>{r.referredEmail}</div>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{
                          fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99,
                          background: r.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(14,165,233,0.1)',
                          color: r.status === 'active' ? '#15803D' : '#0369A1',
                        }}>
                          {r.status === 'active' ? 'Active' : 'Signed Up'}
                        </span>
                      </td>
                      <td style={{ padding:'12px 16px', fontWeight:700, color:'#F59E0B' }}>+{r.coinsAwarded}🪙</td>
                      <td style={{ padding:'12px 16px', color:'#6B7280', whiteSpace:'nowrap' }}>
                        {new Date(r.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div style={{ padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'center', gap:8, borderTop:'1px solid #F1F5F9' }}>
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} style={{ padding:'6px 14px', borderRadius:8, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', fontWeight:700, fontSize:12, opacity: page===1?0.4:1 }}>← Prev</button>
                <span style={{ fontSize:12, color:'#6B7280' }}>Page {page} of {pages}</span>
                <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page===pages} style={{ padding:'6px 14px', borderRadius:8, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', fontWeight:700, fontSize:12, opacity: page===pages?0.4:1 }}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
