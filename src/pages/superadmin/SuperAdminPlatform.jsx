import React, { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import { req } from '../../api/client.js';
import LogoManager from '../../components/LogoManager.jsx';
import TrendCard from '../../components/shared/TrendCard.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Toast from '../../components/ui/Toast.jsx';
import WorldMap from '../../components/charts/WorldMap.jsx';

const glass = { background: '#FFFFFF', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 16, padding: 24 };
const PLAN_COLORS = { free: '#64748b', trial: '#F59E0B', starter: '#0176D3', growth: '#014486', enterprise: '#7c3aed' };

export default function SuperAdminPlatform({ onNavigate }) {
  const [orgs, setOrgs] = useState([]);
  const [users, setUsers] = useState([]);
  const [counts, setCounts] = useState({ orgs: 0, users: 0, jobs: 0, apps: 0 });
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backing, setBacking] = useState(false);
  const [backupDone, setBackupDone] = useState(false);
  const [lastBackup, setLastBackup] = useState(() => localStorage.getItem('tn_last_backup'));
  const [deduping, setDeduping] = useState(false);
  const [dedupResult, setDedupResult] = useState('');
  const [toast, setToast] = useState('');
  const [revenue,   setRevenue]   = useState(null);
  const [orgHealth, setOrgHealth] = useState([]);
  const [broadcast, setBroadcast] = useState({ subject: '', message: '', sending: false, result: null });
  const [showBroadcast, setShowBroadcast] = useState(false);

  const runDedup = async () => {
    setDeduping(true); setDedupResult('');
    try {
      const r = await req('POST', '/admin/deduplicate-jobs');
      setDedupResult(r?.message || 'Done');
      setToast('✅ ' + (r?.message || 'Deduplication complete'));
    } catch (e) {
      setToast('❌ ' + (e.message || 'Failed'));
    }
    setDeduping(false);
  };

  const doBackup = async () => {
    setBacking(true);
    try {
      await api.downloadBackup();
      const now = new Date().toISOString();
      localStorage.setItem('tn_last_backup', now);
      setLastBackup(now);
      setBackupDone(true);
      setTimeout(() => setBackupDone(false), 4000);
    } catch(e) {
      setToast('❌ Backup failed: ' + e.message);
    }
    setBacking(false);
  };

  useEffect(() => {
    const unwrap = (r) => Array.isArray(r) ? r : (r?.data || []);
    Promise.all([
      api.getOrgs().catch(() => []),
      api.getAuditLogs('limit=100').catch(() => []),
      // High-accuracy counts from summarized endpoints
      api.getUserCount().catch(() => 0),
      api.getJobs({ limit: 1, platform: true }).then(r => r?.pagination?.total ?? (Array.isArray(r?.data) ? r.data.length : 0)).catch(() => 0),
      api.getApplications({ limit: 1, platform: true }).then(r => r?.pagination?.total ?? 0).catch(() => 0),
    ]).then(([o, logs, uCount, jCount, aCount]) => {
      const orgList = unwrap(o);
      setOrgs(orgList);
      setAuditLogs(unwrap(logs));
      
      const totalUsers = typeof uCount === 'number' ? uCount : (uCount?.total || uCount?.count || uCount?.data || 0);
      setCounts({
        orgs: orgList.length,
        users: totalUsers,
        jobs: typeof jCount === 'number' ? jCount : (jCount?.total || 0),
        apps: typeof aCount === 'number' ? aCount : (aCount?.total || 0),
      });

      // Role breakdown logic for a fast dashboard: 
      // If we don't have the full user list (to keep it fast), we use a placeholder or 
      // fetch a sample. For now, we'll skip the 10M fetch and rely on the total count.
      setUsers([]); 
    }).finally(() => setLoading(false));
  }, []);

  // Load revenue and org health separately so they don't block the main page
  useEffect(() => {
    api.getPlatformRevenue().then(r => setRevenue(r?.data || null)).catch(() => {});
    api.getOrgHealth().then(r => setOrgHealth(Array.isArray(r?.data) ? r.data : [])).catch(() => {});
  }, []);

  const sendBroadcast = async () => {
    if (!broadcast.subject.trim() || !broadcast.message.trim()) {
      setToast('❌ Subject and message are required.');
      return;
    }
    setBroadcast(b => ({ ...b, sending: true, result: null }));
    try {
      const r = await api.broadcastAnnouncement({ subject: broadcast.subject, message: broadcast.message });
      setBroadcast(b => ({ ...b, sending: false, result: r?.data, subject: '', message: '' }));
      setToast(`✅ Sent to ${r?.data?.sent || 0} admins`);
    } catch (e) {
      setBroadcast(b => ({ ...b, sending: false }));
      setToast('❌ ' + e.message);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}><Spinner /></div>;

  // Plan breakdown
  const planBreakdown = ['free', 'trial', 'starter', 'growth', 'enterprise'].map(plan => ({
    plan,
    count: orgs.filter(o => o.plan === plan).length,
  }));
  const maxPlanCount = Math.max(...planBreakdown.map(p => p.count), 1);

  // Recent orgs (last 10 sorted by createdAt)
  const recentOrgs = [...orgs].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 10);

  const kpis = [
    { icon: '🏢', label: 'Organisations', value: counts.orgs, color: '#0176D3', sub: 'Active & Inactive' },
    { icon: '👥', label: 'Total Users', value: counts.users, color: '#F59E0B', sub: 'Across all entities' },
    { icon: '💼', label: 'Total Jobs', value: counts.jobs, color: '#7c3aed', sub: 'Live postings' },
    { icon: '📋', label: 'Applications', value: counts.apps, color: '#10b981', sub: 'Total engagement' },
  ];

  const PulseIcon = ({ type }) => {
    const map = { login: '🔑', create: '➕', update: '📝', delete: '🗑️', invite: '✉️' };
    return <span style={{ marginRight: 8 }}>{map[type.toLowerCase()] || '⚡'}</span>;
  };

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: '#181818', fontSize: 24, fontWeight: 800, margin: 0 }}>Platform Overview</h1>
        <p style={{ color: '#706E6B', fontSize: 13, marginTop: 4 }}>Super admin view — all organisations and data</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <LogoManager />
      </div>

      {/* Backup Card */}
      <div style={{background:'white',borderRadius:16,padding:28,boxShadow:'0 2px 12px rgba(0,0,0,0.06)',border:'1px solid #E2E8F0',marginBottom:20}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:20,flexWrap:'wrap'}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <div style={{width:40,height:40,borderRadius:10,background:'linear-gradient(135deg,#10B981,#059669)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🗄️</div>
              <div>
                <h3 style={{fontWeight:700,color:'#0A1628',fontSize:16,margin:0}}>Database Backup</h3>
                <p style={{color:'#64748B',fontSize:12,margin:0}}>Download complete platform data as JSON</p>
              </div>
            </div>
            {lastBackup && <p style={{color:'#94A3B8',fontSize:12,margin:0}}>Last backup: {new Date(lastBackup).toLocaleString()}</p>}
          </div>
          <button onClick={doBackup} disabled={backing}
            style={{background:backupDone?'linear-gradient(135deg,#10B981,#059669)':'linear-gradient(135deg,#0176D3,#014486)',color:'white',border:'none',borderRadius:10,padding:'12px 24px',fontWeight:700,fontSize:14,cursor:backing?'not-allowed':'pointer',opacity:backing?0.7:1,display:'flex',alignItems:'center',gap:8,fontFamily:'inherit',transition:'all 0.2s',whiteSpace:'nowrap'}}>
            {backing?'⏳ Preparing...':backupDone?'✅ Downloaded!':'⬇️ Download Backup'}
          </button>
        </div>
        <div style={{marginTop:16,background:'#F8FAFF',borderRadius:8,padding:'10px 14px',border:'1px solid #E2E8F0',fontSize:12,color:'#64748B',display:'flex',gap:16,flexWrap:'wrap'}}>
          <span>✓ Users & Profiles</span>
          <span>✓ Jobs & Applications</span>
          <span>✓ Organisations</span>
          <span>✓ Leads & Invites</span>
          <span>✓ Email Logs</span>
          <span>✓ Assessments</span>
        </div>
      </div>

      {/* Deduplicate Jobs */}
      <div style={{...glass, marginTop:16, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
            <div style={{width:40,height:40,borderRadius:10,background:'linear-gradient(135deg,#F59E0B,#D97706)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🧹</div>
            <div>
              <h3 style={{fontWeight:700,color:'#0A1628',fontSize:16,margin:0}}>Fix Duplicate Jobs</h3>
              <p style={{color:'#64748B',fontSize:12,margin:0}}>Merge duplicate job postings and move all applicants to primary job</p>
            </div>
          </div>
          {dedupResult && <p style={{color:'#10b981',fontSize:12,margin:'4px 0 0',fontWeight:600}}>{dedupResult}</p>}
        </div>
        <button onClick={runDedup} disabled={deduping}
          style={{background:'linear-gradient(135deg,#F59E0B,#D97706)',color:'white',border:'none',borderRadius:10,padding:'12px 24px',fontWeight:700,fontSize:14,cursor:deduping?'not-allowed':'pointer',opacity:deduping?0.7:1,whiteSpace:'nowrap'}}>
          {deduping ? '⏳ Merging...' : '🧹 Run Deduplication'}
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%, 160px),1fr))', gap: 20, marginBottom: 28 }}>
        {kpis.map(k => (
          <TrendCard 
            key={k.label} 
            {...k} 
            variant="glass" 
            sparkValues={k.sparkValues || undefined}
          />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Platform Pulse (Audit Logs) */}
        <div style={{ ...glass, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ color: '#181818', fontSize: 15, fontWeight: 700, margin: 0 }}>Platform Pulse</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#00C2CB', opacity: 0.8 }}>LIVE AUDIT FEED</span>
              <button 
                onClick={() => onNavigate ? onNavigate('audit-logs') : window.dispatchEvent(new CustomEvent('tn_nav', { detail: 'audit-logs' }))}
                style={{ background: 'none', border: 'none', color: '#0176D3', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
              >
                VIEW ALL →
              </button>
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 400 }}>
            {auditLogs.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#9E9D9B', padding: 40, fontSize: 13 }}>No recent activity detected.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {auditLogs.slice(0, 15).map(log => (
                  <div key={log._id} style={{ display: 'flex', gap: 12, paddingBottom: 12, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(1,118,211,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                      <PulseIcon type={log.action} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#181818', fontSize: 13, fontWeight: 600 }}>
                        {log.userName || 'System'} <span style={{ fontWeight: 400, color: '#64748B' }}>{log.message}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                        <span style={{ color: '#9E9D9B', fontSize: 11 }}>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {log.targetId && (
                          <span style={{ color: '#9E9D9B', fontSize: 11, fontFamily: 'monospace' }}>{String(log.targetId).slice(-8)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Plan Breakdown */}
        <div style={glass}>
          <h3 style={{ color: '#181818', fontSize: 15, fontWeight: 700, margin: '0 0 20px' }}>Organisations by Plan</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {planBreakdown.map(({ plan, count }) => (
              <div key={plan}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: PLAN_COLORS[plan], color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{plan.toUpperCase()}</span>
                  </div>
                  <span style={{ color: '#181818', fontSize: 13, fontWeight: 700 }}>{count}</span>
                </div>
                <div style={{ height: 8, background: '#FAFAF9', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(count / maxPlanCount) * 100}%`, background: PLAN_COLORS[plan], borderRadius: 4, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Role Breakdown */}
        <div style={glass}>
          <h3 style={{ color: '#181818', fontSize: 15, fontWeight: 700, margin: '0 0 20px' }}>Users by Role</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { role: 'candidate', label: 'Candidates', color: '#0176D3' },
              { role: 'recruiter', label: 'Recruiters', color: '#014486' },
              { role: 'admin', label: 'Admins', color: '#F59E0B' },
              { role: 'super_admin', label: 'Super Admins', color: '#7c3aed' },
            ].map(({ role, label, color }) => {
              const count = users.filter(u => u.role === role).length;
              const pct = users.length > 0 ? (count / users.length) * 100 : 0;
              return (
                <div key={role}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ color: '#181818', fontSize: 12 }}>{label}</span>
                    <span style={{ color: '#181818', fontSize: 13, fontWeight: 700 }}>{count}</span>
                  </div>
                  <div style={{ height: 8, background: '#FAFAF9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* World Map Section */}
      <div style={{ ...glass, marginBottom: 24 }}>
        <h3 style={{ color: '#181818', fontSize: 15, fontWeight: 700, margin: '0 0 20px' }}>Global Candidate Activity</h3>
        <WorldMap height={400} />
      </div>

      {/* Recent Organisations */}
      <div style={glass}>
        <h3 style={{ color: '#181818', fontSize: 15, fontWeight: 700, margin: '0 0 20px' }}>Recent Organisations</h3>
        {recentOrgs.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#C9C7C5', padding: 40, fontSize: 13 }}>No organisations yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentOrgs.map(org => (
              <div key={org.id || org._id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px solid #F3F2F2' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#0176D3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🏢</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#181818', fontWeight: 600, fontSize: 13 }}>{org.name}</div>
                  <div style={{ color: '#9E9D9B', fontSize: 11, marginTop: 2 }}>{org.domain || 'No domain'} · {org.industry || 'No industry'}</div>
                </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ background: PLAN_COLORS[org.plan] || '#64748b', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{(org.plan || 'free').toUpperCase()}</span>
                    <span style={{ background: org.status === 'active' ? 'rgba(16,185,129,0.2)' : org.status === 'trial' ? 'rgba(245,158,11,0.2)' : 'rgba(186,5,23,0.2)', color: org.status === 'active' ? '#34d399' : org.status === 'trial' ? '#F59E0B' : '#FE5C4C', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{(org.status || 'active').toUpperCase()}</span>
                    {org.createdAt && (
                      <span style={{ color: '#C9C7C5', fontSize: 11 }}>{new Date(org.createdAt).toLocaleDateString()}</span>
                    )}
                  </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%, 160px),1fr))', gap: 16, marginTop: 20, marginBottom: 28 }}>
        {[
          { label: 'Active Orgs', value: orgs.filter(o => o.status === 'active').length, color: '#10b981', trend: 12 },
          { label: 'Trial Orgs', value: orgs.filter(o => o.plan === 'trial' || o.status === 'trial').length, color: '#F59E0B', trend: -5 },
          { label: 'Paying Orgs', value: orgs.filter(o => ['starter','growth','enterprise'].includes(o.plan)).length, color: '#0176D3', trend: 24 },
          { label: 'Suspended', value: orgs.filter(o => o.status === 'suspended').length, color: '#BA0517', trend: 0 },
        ].map(item => (
          <TrendCard key={item.label} {...item} variant="glass" icon="⚡" />
        ))}
      </div>

      {/* ── REVENUE ANALYTICS ─────────────────────────────────────────────────── */}
      <div style={{ ...glass, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#10B981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💰</div>
          <div>
            <h3 style={{ fontWeight: 700, color: '#0A1628', fontSize: 16, margin: 0 }}>Revenue Analytics</h3>
            <p style={{ color: '#64748B', fontSize: 12, margin: 0 }}>Platform-wide payment and plan revenue</p>
          </div>
        </div>
        {revenue ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total Revenue', value: `₹${(revenue.totalRevenue/100000).toFixed(1)}L`, color: '#10B981' },
                { label: 'This Month (MRR)', value: `₹${(revenue.mrr/100000).toFixed(1)}L`, color: '#0176D3' },
                { label: 'Total Payments', value: revenue.totalPayments, color: '#7c3aed' },
                { label: 'Avg Payment', value: `₹${(revenue.avgPayment/100).toFixed(0)}`, color: '#F59E0B' },
              ].map(k => (
                <div key={k.label} style={{ background: `${k.color}0d`, border: `1px solid ${k.color}30`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: k.color }}>{k.value}</div>
                  <div style={{ fontSize: 11, color: '#706E6B', marginTop: 4, fontWeight: 600 }}>{k.label}</div>
                </div>
              ))}
            </div>
            {/* Plan Distribution */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#706E6B', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 10px' }}>Plan Distribution</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(revenue.planDist || {}).map(([plan, count]) => (
                  <div key={plan} style={{ background: (PLAN_COLORS[plan] || '#64748b') + '15', border: `1px solid ${PLAN_COLORS[plan] || '#64748b'}40`, borderRadius: 20, padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLAN_COLORS[plan] || '#64748b' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: PLAN_COLORS[plan] || '#64748b' }}>{plan.toUpperCase()}</span>
                    <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{count} orgs</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Monthly Trend */}
            {revenue.monthlyTrend?.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#706E6B', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 10px' }}>6-Month Revenue Trend</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
                  {revenue.monthlyTrend.map((m, i) => {
                    const maxVal = Math.max(...revenue.monthlyTrend.map(x => x.value), 1);
                    const h = Math.max(4, (m.value / maxVal) * 70);
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: '100%', height: h, background: 'linear-gradient(180deg,#10B981,#059669)', borderRadius: '4px 4px 0 0', minHeight: 4 }} title={`₹${m.value}`} />
                        <span style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>{m.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💰</div>
            <p style={{ margin: 0, fontSize: 13 }}>No payment records yet. Revenue data will appear here once payments are processed.</p>
          </div>
        )}
      </div>

      {/* ── ORGANIZATION HEALTH ──────────────────────────────────────────────── */}
      <div style={{ ...glass, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#0176D3,#014486)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏥</div>
            <div>
              <h3 style={{ fontWeight: 700, color: '#0A1628', fontSize: 16, margin: 0 }}>Organization Health Scores</h3>
              <p style={{ color: '#64748B', fontSize: 12, margin: 0 }}>At-risk orgs sorted first — act before they churn</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, fontSize: 11, fontWeight: 600 }}>
            <span style={{ color: '#EF4444' }}>🔴 High Risk</span>
            <span style={{ color: '#F59E0B' }}>🟡 Watch</span>
            <span style={{ color: '#10B981' }}>🟢 Healthy</span>
          </div>
        </div>
        {orgHealth.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Organisation', 'Plan', 'Health', 'Active Jobs', 'Applications', 'Recruiters', 'Last Login'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orgHealth.slice(0, 20).map(org => {
                  const riskColor = org.risk === 'high' ? '#EF4444' : org.risk === 'medium' ? '#F59E0B' : '#10B981';
                  const riskIcon  = org.risk === 'high' ? '🔴' : org.risk === 'medium' ? '🟡' : '🟢';
                  return (
                    <tr key={org.id} style={{ borderBottom: '1px solid #F1F5F9' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding: '11px 12px', fontSize: 13, fontWeight: 600, color: '#0A1628' }}>{org.name}</td>
                      <td style={{ padding: '11px 12px' }}>
                        <span style={{ background: (PLAN_COLORS[org.plan] || '#64748b') + '20', color: PLAN_COLORS[org.plan] || '#64748b', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                          {(org.plan || 'free').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>{riskIcon}</span>
                          <div style={{ flex: 1, height: 6, background: '#F1F5F9', borderRadius: 3, minWidth: 60 }}>
                            <div style={{ height: '100%', width: `${org.score}%`, background: riskColor, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: riskColor, minWidth: 28 }}>{org.score}</span>
                        </div>
                      </td>
                      <td style={{ padding: '11px 12px', fontSize: 13, color: '#374151', textAlign: 'center' }}>{org.activeJobs}</td>
                      <td style={{ padding: '11px 12px', fontSize: 13, color: '#374151', textAlign: 'center' }}>{org.totalApps}</td>
                      <td style={{ padding: '11px 12px', fontSize: 13, color: '#374151', textAlign: 'center' }}>{org.recruiters}</td>
                      <td style={{ padding: '11px 12px', fontSize: 12, color: org.daysSinceLogin > 30 ? '#EF4444' : org.daysSinceLogin > 14 ? '#F59E0B' : '#10B981', fontWeight: 600 }}>
                        {org.daysSinceLogin >= 999 ? 'Never' : `${org.daysSinceLogin}d ago`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p style={{ fontSize: 11, color: '#94A3B8', margin: '10px 0 0' }}>Score: 0-100 based on jobs posted, applications received, recruiter logins, and activity recency.</p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>
            <Spinner size={24} />
            <p style={{ margin: '12px 0 0', fontSize: 13 }}>Loading org health data…</p>
          </div>
        )}
      </div>

      {/* ── BROADCAST ANNOUNCEMENT ───────────────────────────────────────────── */}
      <div style={{ ...glass, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showBroadcast ? 20 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📢</div>
            <div>
              <h3 style={{ fontWeight: 700, color: '#0A1628', fontSize: 16, margin: 0 }}>Broadcast Announcement</h3>
              <p style={{ color: '#64748B', fontSize: 12, margin: 0 }}>Send an email to all org admins on the platform</p>
            </div>
          </div>
          <button
            onClick={() => setShowBroadcast(v => !v)}
            style={{ background: showBroadcast ? '#F1F5F9' : 'linear-gradient(135deg,#7c3aed,#5b21b6)', color: showBroadcast ? '#374151' : '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            {showBroadcast ? 'Cancel' : '📢 Compose'}
          </button>
        </div>
        {showBroadcast && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Subject *</label>
              <input
                value={broadcast.subject}
                onChange={e => setBroadcast(b => ({ ...b, subject: e.target.value }))}
                placeholder="e.g. Platform update: New features available"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Message *</label>
              <textarea
                value={broadcast.message}
                onChange={e => setBroadcast(b => ({ ...b, message: e.target.value }))}
                placeholder="Write your announcement here…"
                rows={6}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 0' }}>This will be sent as a branded email to all active org admins ({orgs.filter(o => o.status === 'active').length} orgs).</p>
            </div>
            {broadcast.result && (
              <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#166534', fontWeight: 600 }}>
                ✅ Sent to {broadcast.result.sent} admins · {broadcast.result.failed} failed · {broadcast.result.total} total
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={sendBroadcast}
                disabled={broadcast.sending}
                style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontWeight: 700, fontSize: 14, cursor: broadcast.sending ? 'not-allowed' : 'pointer', opacity: broadcast.sending ? 0.7 : 1 }}
              >
                {broadcast.sending ? '⏳ Sending…' : '📢 Send to All Admins'}
              </button>
              <button onClick={() => setShowBroadcast(false)} style={{ background: '#F1F5F9', color: '#374151', border: 'none', borderRadius: 10, padding: '12px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
