import React, { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import Field from '../../components/ui/Field.jsx';

const card = { background:'#FFFFFF', border:'1px solid rgba(1,118,211,0.15)', borderRadius:16, padding:24, marginBottom:20 };
const btnP = { background:'#0176D3', border:'none', borderRadius:8, color:'#fff', fontWeight:700, padding:'7px 16px', cursor:'pointer', fontSize:12 };
const btnG = { background:'#F3F2F2', border:'1px solid #DDDBDA', borderRadius:8, color:'#181818', fontWeight:600, padding:'7px 14px', cursor:'pointer', fontSize:12 };

const STATUS_COLORS = {
  new:       { bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.35)', text:'#b45309' },
  contacted: { bg:'rgba(1,118,211,0.10)', border:'rgba(1,118,211,0.3)',   text:'#0176D3' },
  converted: { bg:'rgba(46,132,74,0.10)', border:'rgba(46,132,74,0.3)',   text:'#2E844A' },
  closed:    { bg:'rgba(186,5,23,0.08)',  border:'rgba(186,5,23,0.25)',   text:'#BA0517' },
};

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.new;
  return (
    <span style={{ background:c.bg, border:`1px solid ${c.border}`, color:c.text, borderRadius:20, padding:'3px 12px', fontSize:11, fontWeight:700 }}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr); if (isNaN(d)) return '—';
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

export default function ContactLeads() {
  const [leads, setLeads]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');
  const [expanded, setExpanded] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [toast, setToast]       = useState('');

  const load = async (status) => {
    setLoading(true);
    try {
      const res = await api.getLeads(status === 'all' ? '' : status);
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setLeads(list);
    } catch (e) { setToast('❌ ' + e.message); }
    setLoading(false);
  };

  useEffect(() => { load(filter); }, [filter]);

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      const updated = await api.updateLead(id, { status });
      setLeads(prev => prev.map(l => (l.id || l._id) === id ? { ...l, status } : l));
      setToast(`✅ Marked as ${status}`);
    } catch (e) { setToast('❌ ' + e.message); }
    setUpdating(null);
  };

  const filtered = leads.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [l.name, l.email, l.company, l.service, l.message].some(v => (v||'').toLowerCase().includes(q));
  });

  const counts = leads.reduce((a, l) => { a[l.status || 'new'] = (a[l.status || 'new'] || 0) + 1; return a; }, {});

  return (
    <div>
      {toast && (
        <div style={{ marginBottom:16, padding:'10px 16px', background: toast.startsWith('❌') ? 'rgba(186,5,23,0.12)' : 'rgba(34,197,94,0.1)', border:`1px solid ${toast.startsWith('❌') ? 'rgba(186,5,23,0.3)' : 'rgba(34,197,94,0.3)'}`, borderRadius:10, color: toast.startsWith('❌') ? '#FE5C4C' : '#16a34a', fontSize:13, fontWeight:600, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>{toast}</span>
          <button onClick={() => setToast('')} style={{ background:'none', border:'none', color:'inherit', cursor:'pointer', fontSize:16 }}>✕</button>
        </div>
      )}

      <div style={{ marginBottom:24 }}>
        <h1 style={{ color:'#181818', fontWeight:800, fontSize:22, margin:'0 0 4px' }}>📞 Contact Enquiries</h1>
        <p style={{ color:'#706E6B', fontSize:13, margin:0 }}>All leads submitted via the public Contact Us page</p>
      </div>

      {/* KPI row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { label:'Total Leads',  value: leads.length,           color:'#0176D3', icon:'📋' },
          { label:'New',          value: counts.new       || 0,  color:'#b45309', icon:'🆕' },
          { label:'Contacted',    value: counts.contacted || 0,  color:'#0176D3', icon:'📬' },
          { label:'Converted',    value: counts.converted || 0,  color:'#2E844A', icon:'✅' },
        ].map(k => (
          <div key={k.label} style={{ ...card, marginBottom:0, display:'flex', alignItems:'center', gap:14, padding:'16px 20px' }}>
            <span style={{ fontSize:26 }}>{k.icon}</span>
            <div>
              <div style={{ fontSize:24, fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</div>
              <div style={{ color:'#706E6B', fontSize:11, marginTop:3 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'center', flexWrap:'wrap' }}>
        <Field value={search} onChange={v => setSearch(v)} placeholder="Search name, email, company…" style={{ minWidth:240 }} />
        <div style={{ display:'flex', gap:4, background:'#F3F2F2', borderRadius:10, padding:4 }}>
          {['all','new','contacted','converted','closed'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{ background: filter===s ? '#0176D3' : 'transparent', border:'none', borderRadius:8, color: filter===s ? '#fff' : '#706E6B', fontWeight: filter===s ? 700 : 500, padding:'6px 14px', cursor:'pointer', fontSize:12, textTransform:'capitalize' }}>
              {s === 'all' ? `All (${leads.length})` : `${s.charAt(0).toUpperCase()+s.slice(1)} (${counts[s]||0})`}
            </button>
          ))}
        </div>
        <button onClick={() => load(filter)} style={{ ...btnG }}>↻ Refresh</button>
      </div>

      {/* Leads list */}
      <div style={card}>
        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:'#706E6B' }}>Loading enquiries…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:40 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
            <p style={{ color:'#706E6B', fontSize:14 }}>{search ? 'No results for your search.' : 'No enquiries yet. They will appear here when someone fills the Contact Us form.'}</p>
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1.5fr 1fr 1fr 0.8fr 1.2fr', gap:10, padding:'8px 12px', borderBottom:'1px solid #F3F2F2', marginBottom:4 }}>
              {['Name','Email','Company','Service','Status','Received'].map(h => (
                <span key={h} style={{ color:'#0176D3', fontSize:10, fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase' }}>{h}</span>
              ))}
            </div>

            {filtered.map(l => {
              const id = l.id || l._id;
              const isOpen = expanded === id;
              return (
                <div key={id}>
                  <div
                    onClick={() => setExpanded(isOpen ? null : id)}
                    style={{ display:'grid', gridTemplateColumns:'1.5fr 1.5fr 1fr 1fr 0.8fr 1.2fr', gap:10, padding:'12px', borderRadius:10, cursor:'pointer', background: isOpen ? 'rgba(1,118,211,0.04)' : 'transparent', transition:'background 0.15s' }}
                  >
                    <span style={{ color:'#181818', fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.name || '—'}</span>
                    <span style={{ color:'#0176D3', fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.email || '—'}</span>
                    <span style={{ color:'#706E6B', fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.company || '—'}</span>
                    <span style={{ color:'#706E6B', fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.service || '—'}</span>
                    <StatusBadge status={l.status || 'new'} />
                    <span style={{ color:'#706E6B', fontSize:11 }}>{timeAgo(l.createdAt)}</span>
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div style={{ margin:'0 0 8px 0', padding:'16px 20px', background:'rgba(1,118,211,0.03)', border:'1px solid rgba(1,118,211,0.12)', borderRadius:12 }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:14 }}>
                        <div>
                          <div style={{ color:'#706E6B', fontSize:10, fontWeight:700, letterSpacing:'0.5px', marginBottom:4 }}>CONTACT</div>
                          <div style={{ color:'#181818', fontSize:13, fontWeight:600 }}>{l.name}</div>
                          <div style={{ color:'#0176D3', fontSize:12 }}>{l.email}</div>
                          {l.phone && <div style={{ color:'#706E6B', fontSize:12 }}>{l.phone}</div>}
                        </div>
                        <div>
                          <div style={{ color:'#706E6B', fontSize:10, fontWeight:700, letterSpacing:'0.5px', marginBottom:4 }}>COMPANY & SERVICE</div>
                          <div style={{ color:'#181818', fontSize:13 }}>{l.company || '—'}</div>
                          <div style={{ color:'#706E6B', fontSize:12 }}>{l.service || 'Not specified'}</div>
                        </div>
                      </div>
                      {l.message && (
                        <div style={{ marginBottom:16 }}>
                          <div style={{ color:'#706E6B', fontSize:10, fontWeight:700, letterSpacing:'0.5px', marginBottom:6 }}>MESSAGE</div>
                          <p style={{ color:'#374151', fontSize:13, lineHeight:1.6, margin:0, padding:'10px 14px', background:'#fff', borderRadius:8, border:'1px solid #F3F2F2' }}>{l.message}</p>
                        </div>
                      )}
                      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                        <span style={{ color:'#706E6B', fontSize:11, fontWeight:600 }}>Update status:</span>
                        {['new','contacted','converted','closed'].map(s => (
                          <button key={s} onClick={() => updateStatus(id, s)} disabled={updating === id || l.status === s}
                            style={{ ...btnG, padding:'5px 12px', fontSize:11, opacity: l.status===s ? 0.5 : 1, fontWeight: l.status===s ? 700 : 500 }}>
                            {updating === id ? '…' : s.charAt(0).toUpperCase()+s.slice(1)}
                          </button>
                        ))}
                        <a href={`mailto:${l.email}?subject=Re: Your enquiry with TalentNest HR`} style={{ ...btnP, textDecoration:'none', padding:'5px 14px', fontSize:11 }}>
                          📧 Reply
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
