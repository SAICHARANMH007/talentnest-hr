import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Toast from '../../components/ui/Toast.jsx';
import { btnP, btnG, btnD, card } from '../../constants/styles.js';
import { api } from '../../api/api.js';
import UserDetailDrawer from '../../components/shared/UserDetailDrawer.jsx';

export default function SuperAdminCandidates() {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all'); // all, applied, platform
  const [totalUsers, setTotalUsers] = useState(0);
  const [drawerUser, setDrawerUser] = useState(null);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getCandidateRecords({ limit: 0 }); // limit 0 means all for super_admin optimization
      setCandidates(Array.isArray(res?.data) ? res.data : []);
      
      const uCount = await api.getUserCount().catch(() => 0);
      setTotalUsers(typeof uCount === 'number' ? uCount : (uCount?.count || uCount?.data || 0));
    } catch (err) {
      setToast('Failed to fetch candidate records');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = candidates.filter(c => {
    const q = search.toLowerCase();
    const matchesSearch = (c.name || '').toLowerCase().includes(q) || 
                         (c.email || '').toLowerCase().includes(q) || 
                         (c.phone || '').includes(q) ||
                         (c.title || '').toLowerCase().includes(q);
    
    if (!matchesSearch) return false;
    if (tab === 'applied') return c.isApplied;
    if (tab === 'platform') return !c.isApplied;
    return true;
  });

  const stats = {
    total: candidates.length,
    applied: candidates.filter(c => c.isApplied).length,
    platform: totalUsers
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <PageHeader 
        title="Unified Candidate Database" 
        subtitle="Manage all platform registered users and applied candidates in one central hub"
        actions={<button onClick={load} style={btnG}>🔄 Refresh Data</button>}
      />

      {/* ── Stats Overview ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 32 }}>
        <StatCard label="Total Unique Candidates" value={stats.total} icon="👥" color="#0176D3" />
        <StatCard label="Applied Candidates" value={stats.applied} icon="📝" color="#10b981" />
        <StatCard label="Platform Registered" value={stats.platform} icon="🌐" color="#7c3aed" />
      </div>

      {/* ── Filters & Search ── */}
      <div style={{ ...card, padding: '16px 24px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <TabButton active={tab === 'all'} onClick={() => setTab('all')} label="All Records" count={stats.total} />
          <TabButton active={tab === 'applied'} onClick={() => setTab('applied')} label="Applied" count={stats.applied} />
          <TabButton active={tab === 'platform'} onClick={() => setTab('platform')} label="Platform Only" count={stats.platform} />
        </div>
        <input 
          placeholder="Search by name, email, or title..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '10px 16px', borderRadius: 12, border: '1px solid #E2E8F0', width: '100%', maxWidth: 320, outline: 'none' }}
        />
      </div>

      {/* ── Table View ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 100 }}><Spinner size={40} /></div>
      ) : (
        <div style={{ ...card, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={thS}>Candidate</th>
                <th style={thS}>Contact</th>
                <th style={thS}>Status</th>
                <th style={thS}>Applications</th>
                <th style={thS}>Organization</th>
                <th style={thS}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id || c._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={tdS}>
                    <div style={{ fontWeight: 700, color: '#0A1628' }}>{c.name || c.candidateName || 'Anonymous'}</div>
                    <div style={{ fontSize: 11, color: '#706E6B' }}>{c.title || 'No Title'}</div>
                  </td>
                  <td style={tdS}>
                    <div style={{ fontSize: 12 }}>{c.email || 'No email'}</div>
                    <div style={{ fontSize: 11, color: '#706E6B' }}>{c.phone || 'No phone'}</div>
                  </td>
                  <td style={tdS}>
                    <Badge 
                      label={c.isApplied ? 'Applied' : 'Platform'} 
                      color={c.isApplied ? '#10b981' : '#7c3aed'} 
                    />
                    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4, textTransform: 'uppercase' }}>Source: {c.source || 'N/A'}</div>
                  </td>
                  <td style={tdS}>
                    <div style={{ fontWeight: 600 }}>{c.applicationCount || 0} apps</div>
                  </td>
                  <td style={tdS}>
                    <div style={{ fontSize: 12, color: '#706E6B' }}>{c.organisation || 'N/A'}</div>
                  </td>
                  <td style={tdS}>
                    <button 
                      onClick={() => setDrawerUser(c)} 
                      style={{ ...btnG, padding: '4px 12px', fontSize: 11 }}
                    >
                      Deep Dive
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>No candidates found matching your criteria.</div>
          )}
        </div>
      )}

      {drawerUser && <UserDetailDrawer user={drawerUser} onClose={() => setDrawerUser(null)} />}
      <Toast msg={toast} onClose={() => setToast('')} />
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{ ...card, padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: `${color}10`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>{value}</div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, count }) {
  return (
    <button 
      onClick={onClick}
      style={{
        padding: '8px 16px',
        borderRadius: 10,
        border: 'none',
        background: active ? '#0176D3' : 'transparent',
        color: active ? '#fff' : '#64748B',
        fontWeight: 700,
        fontSize: 13,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        transition: 'all 0.2s'
      }}
    >
      {label}
      <span style={{ 
        background: active ? 'rgba(255,255,255,0.2)' : '#F1F5F9', 
        padding: '2px 8px', 
        borderRadius: 6, 
        fontSize: 11 
      }}>
        {count}
      </span>
    </button>
  );
}

const thS = { padding: '16px 24px', fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 };
const tdS = { padding: '16px 24px' };
