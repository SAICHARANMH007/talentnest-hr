import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { api } from '../../api/api.js';
import { btnP, btnG, card } from '../../constants/styles.js';

const STATUS_COLORS = {
  pending            : { bg:'#fef3c7', color:'#92400e', label:'Pending Review' },
  cleared            : { bg:'#dcfce7', color:'#15803d', label:'Cleared' },
  confirmed_duplicate: { bg:'#fee2e2', color:'#991b1b', label:'Confirmed Duplicate' },
};

function AlertCard({ alert, onAction }) {
  const [note, setNote]   = useState('');
  const [acting, setAct]  = useState(false);
  const [expanded, setExp] = useState(false);
  const sc = STATUS_COLORS[alert.status] || STATUS_COLORS.pending;
  const pct = Math.round((alert.similarityScore || 0) * 100);

  const action = async (act, disableId) => {
    setAct(true);
    try {
      await api.reviewDuplicateAlert(alert._id || alert.id, {
        action: act,
        note,
        ...(disableId ? { disableUserId: disableId } : {}),
      });
      onAction(alert._id || alert.id, act);
    } catch (e) {
      alert(e.message || 'Action failed');
    }
    setAct(false);
  };

  return (
    <div style={{ ...card, borderLeft:`4px solid ${pct >= 85 ? '#dc2626' : pct >= 75 ? '#f59e0b' : '#0176D3'}`, marginBottom:16, padding:0, overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {/* Similarity ring */}
          <div style={{ width:56, height:56, borderRadius:'50%', border:`4px solid ${pct >= 85 ? '#dc2626' : pct >= 75 ? '#f59e0b' : '#0176D3'}`,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <div style={{ fontSize:15, fontWeight:900, color: pct >= 85 ? '#dc2626' : '#0176D3', lineHeight:1 }}>{pct}%</div>
            <div style={{ fontSize:9, color:'#94a3b8', fontWeight:600 }}>match</div>
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:14, color:'#0F172A' }}>Facial Similarity Alert</div>
            <div style={{ fontSize:12, color:'#64748B', marginTop:2 }}>
              Detected {new Date(alert.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ ...sc, fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>{sc.label}</span>
          <button onClick={() => setExp(v => !v)} style={{ ...btnG, fontSize:11, padding:'4px 10px' }}>
            {expanded ? '▲ Hide' : '▼ Details'}
          </button>
        </div>
      </div>

      {/* Side-by-side photos */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'center', padding:'0 18px 14px', gap:10 }}>
        <UserCard name={alert.name1} email={alert.email1} photo={alert.photoUrl1} />
        <div style={{ textAlign:'center', fontSize:20, color:'#0176D3', fontWeight:900 }}>≈</div>
        <UserCard name={alert.name2} email={alert.email2} photo={alert.photoUrl2} />
      </div>

      {/* Expanded action panel */}
      {expanded && alert.status === 'pending' && (
        <div style={{ borderTop:'1px solid #f1f5f9', padding:'14px 18px', background:'#f8fafc' }}>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Optional review note…"
            style={{ width:'100%', padding:'8px 10px', border:'1.5px solid #D6D9DE', borderRadius:8, fontSize:13, resize:'vertical', minHeight:56, boxSizing:'border-box', marginBottom:10 }} />
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            <button style={{ ...btnG, fontSize:12 }} disabled={acting} onClick={() => action('cleared')}>
              ✅ Different People — Clear Alert
            </button>
            <button style={{ background:'#dc2626', color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontSize:12, fontWeight:700, cursor:'pointer' }}
              disabled={acting} onClick={() => action('confirmed_duplicate')}>
              ⚠️ Confirm Duplicate (both active)
            </button>
            <button style={{ background:'#7f1d1d', color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontSize:12, fontWeight:700, cursor:'pointer' }}
              disabled={acting} onClick={() => action('confirmed_duplicate', alert.userId2)}>
              🚫 Confirm + Disable Account 2
            </button>
            <button style={{ background:'#7f1d1d', color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontSize:12, fontWeight:700, cursor:'pointer' }}
              disabled={acting} onClick={() => action('confirmed_duplicate', alert.userId1)}>
              🚫 Confirm + Disable Account 1
            </button>
          </div>
          {acting && <div style={{ marginTop:8, fontSize:12, color:'#0176D3' }}>Processing…</div>}
        </div>
      )}

      {expanded && alert.status !== 'pending' && alert.reviewNote && (
        <div style={{ borderTop:'1px solid #f1f5f9', padding:'12px 18px', background:'#f8fafc', fontSize:12, color:'#64748b' }}>
          <strong>Review note:</strong> {alert.reviewNote}
        </div>
      )}
    </div>
  );
}

function UserCard({ name, email, photo }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, textAlign:'center' }}>
      {photo
        ? <img src={photo} alt={name} style={{ width:72, height:72, borderRadius:'50%', objectFit:'cover', border:'2.5px solid #E2E8F0' }} />
        : <div style={{ width:72, height:72, borderRadius:'50%', background:'linear-gradient(135deg,#0176D3,#014486)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:26 }}>
            {(name || '?')[0].toUpperCase()}
          </div>}
      <div style={{ fontSize:13, fontWeight:800, color:'#0F172A' }}>{name || '—'}</div>
      <div style={{ fontSize:11, color:'#64748b' }}>{email || '—'}</div>
    </div>
  );
}

export default function FaceAdminReview() {
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('pending');
  const [count, setCount]     = useState(0);

  useEffect(() => {
    load(tab);
  }, [tab]);

  const load = async (status) => {
    setLoading(true);
    try {
      const r = await api.getDuplicateAlerts(status === 'all' ? undefined : status);
      setAlerts(r?.data || []);
    } catch { setAlerts([]); }
    setLoading(false);
  };

  useEffect(() => {
    api.getDuplicateCount().then(r => setCount(r?.count || 0)).catch(() => {});
  }, [alerts]);

  const handleAction = (id, act) => {
    setAlerts(prev => prev.map(a => (a._id === id || a.id === id) ? { ...a, status: act } : a));
  };

  const tabs = [
    { key:'pending',  label: `Pending${count > 0 ? ` (${count})` : ''}` },
    { key:'cleared',  label: 'Cleared' },
    { key:'confirmed_duplicate', label: 'Confirmed Duplicates' },
    { key:'all',      label: 'All' },
  ];

  const shown = tab === 'all' ? alerts : alerts.filter(a => a.status === tab);

  return (
    <div>
      <PageHeader
        title="🔐 Face Duplicate Alerts"
        subtitle={`AI-detected accounts with high facial similarity. Review and take action. ${count > 0 ? `${count} pending alert${count > 1 ? 's' : ''}.` : ''}`}
      />

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'#f1f5f9', borderRadius:10, padding:4, marginBottom:20, width:'fit-content' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:'6px 14px', borderRadius:8, border:'none', fontWeight:700, fontSize:13, cursor:'pointer',
              background: tab === t.key ? '#fff' : 'transparent',
              color: tab === t.key ? '#0176D3' : '#64748b',
              boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding:'60px 0', textAlign:'center' }}><Spinner /></div>
      ) : shown.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'#94a3b8' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
          <div style={{ fontSize:16, fontWeight:700 }}>No {tab === 'all' ? '' : tab + ' '}alerts</div>
          <div style={{ fontSize:13, marginTop:6 }}>
            {tab === 'pending' ? 'All duplicate alerts have been reviewed.' : 'No alerts in this category yet.'}
          </div>
        </div>
      ) : (
        <div>
          {shown.map(a => <AlertCard key={a._id || a.id} alert={a} onAction={handleAction} />)}
        </div>
      )}
    </div>
  );
}
