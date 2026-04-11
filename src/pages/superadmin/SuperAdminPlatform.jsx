import React, { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import LogoManager from '../../components/LogoManager.jsx';
import TrendCard from '../../components/shared/TrendCard.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Toast from '../../components/ui/Toast.jsx';

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
  const [toast, setToast] = useState('');

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
      api.getUsers({ limit: 1000 }).catch(() => []),
      api.getAuditLogs().catch(() => []),
      // High-accuracy counts
      api.getUserCount().catch(() => 0),
      api.getJobs({ limit: 1 }).then(r => r?.total || r?.length || 0).catch(() => 0),
      api.getApplications({ limit: 1 }).then(r => r?.total || r?.length || 0).catch(() => 0),
    ]).then(([o, u, logs, uCount, jCount, aCount]) => {
      const orgList = unwrap(o);
      setOrgs(orgList);
      setUsers(unwrap(u));
      setAuditLogs(unwrap(logs));
      setCounts({
        orgs: orgList.length,
        users: typeof uCount === 'number' ? uCount : (uCount?.data || 0),
        jobs: jCount,
        apps: aCount
      });
    }).finally(() => setLoading(false));
  }, []);

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

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 20, marginBottom: 28 }}>
        {kpis.map(k => (
          <TrendCard 
            key={k.label} 
            {...k} 
            variant="glass" 
            sparkValues={k.sparkValues || undefined}
          />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 24 }}>
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
                        {log.userId?.name || 'System'} <span style={{ fontWeight: 400, color: '#64748B' }}>{log.message}</span>
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

      {/* Recent Organisations */}
      <div style={glass}>
        <h3 style={{ color: '#181818', fontSize: 15, fontWeight: 700, margin: '0 0 20px' }}>Recent Organisations</h3>
        {recentOrgs.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#C9C7C5', padding: 40, fontSize: 13 }}>No organisations yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentOrgs.map(org => (
              <div key={org.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px solid #F3F2F2' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginTop: 20 }}>
        {[
          { label: 'Active Orgs', value: orgs.filter(o => o.status === 'active').length, color: '#10b981', trend: 12 },
          { label: 'Trial Orgs', value: orgs.filter(o => o.plan === 'trial' || o.status === 'trial').length, color: '#F59E0B', trend: -5 },
          { label: 'Paying Orgs', value: orgs.filter(o => ['starter','growth','enterprise'].includes(o.plan)).length, color: '#0176D3', trend: 24 },
          { label: 'Suspended', value: orgs.filter(o => o.status === 'suspended').length, color: '#BA0517', trend: 0 },
        ].map(item => (
          <TrendCard key={item.label} {...item} variant="glass" icon="⚡" />
        ))}
      </div>

    </div>
  );
}
