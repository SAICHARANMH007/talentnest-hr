import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/api.js';

const URGENCY_COLOR = { High: '#BA0517', Medium: '#F59E0B', Low: '#10B981', '': '#0176D3' };
const URGENCY_LABEL = { High: '🔥 Emergency', Medium: '⚡ High', Low: '📌 Normal' };

const SITE_URL = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '');

/**
 * CareerListingModal
 * Props:
 *   org      – { id, name, slug } (required)
 *   user     – current user object
 *   onClose  – callback to close modal
 */
export default function CareerListingModal({ org, user, onClose }) {
  const [jobs, setJobs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState('');
  const [search, setSearch]     = useState('');
  const [copied, setCopied]     = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  // selected = set of jobIds that should be isPublic=true
  const [selected, setSelected] = useState(new Set());

  const isSuperAdminSelect = org?.id === 'super_admin_select';
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [orgsList, setOrgsList] = useState([]);

  // For org admins: fetch slug from backend if not supplied (not in JWT)
  const [resolvedSlug, setResolvedSlug] = useState(org?.slug || '');

  useEffect(() => {
    if (isSuperAdminSelect) {
      api.getOrgs().then(res => {
        const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        setOrgsList(list);
        if (list.length > 0) {
          setSelectedOrg(list[0]);
          setResolvedSlug(list[0].slug || '');
        }
      }).catch(() => setOrgsList([]));
    } else if (!org?.slug && (org?.id || org?._id)) {
      // Admin viewing own org — fetch slug since it's not in JWT
      api.getOrg(org.id || org._id).then(res => {
        const o = res?.data || res;
        if (o?.slug) setResolvedSlug(o.slug);
      }).catch(() => {});
    }
  }, [isSuperAdminSelect, org?.id, org?._id, org?.slug]);

  const activeOrg = isSuperAdminSelect ? selectedOrg : org;
  const orgSlug   = resolvedSlug || activeOrg?.slug || '';
  const careerUrl = orgSlug ? `${SITE_URL}/${orgSlug}/careers` : '';
  const embedCode = orgSlug
    ? `<iframe\n  src="${SITE_URL}/${orgSlug}/careers?embed=1"\n  width="100%"\n  height="820"\n  frameborder="0"\n  style="border:none;border-radius:12px;"\n  allow="*"\n></iframe>`
    : '';

  // When super admin switches org, update slug
  useEffect(() => {
    if (isSuperAdminSelect && selectedOrg) {
      setResolvedSlug(selectedOrg.slug || '');
    }
  }, [isSuperAdminSelect, selectedOrg]);

  const load = useCallback(async () => {
    if (!activeOrg?.id && !activeOrg?._id) return;
    setLoading(true);
    try {
      const orgId = String(activeOrg.id || activeOrg._id || '');
      // Super admin: load all jobs then filter by org. Admin: backend scopes to their tenant.
      const res = await api.getJobs({ limit: 10000000 });
      const allJobs = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      const filtered = (user?.role === 'super_admin' && orgId)
        ? allJobs.filter(j => String(j.tenantId || j.tenantId?._id || '') === orgId || String(j.orgId || '') === orgId)
        : allJobs;

      const active = filtered.filter(j => j.status !== 'closed' && !j.deletedAt);
      setJobs(active);
      setSelected(new Set(active.filter(j => j.isPublic).map(j => String(j.id || j._id))));
    } catch {
      setToast('❌ Could not load jobs');
    }
    setLoading(false);
  }, [activeOrg?.id, activeOrg?._id, user?.role]);

  useEffect(() => { load(); }, [load]);

  const toggle   = (jobId) => {
    const id = String(jobId);
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const selectAll = () => setSelected(new Set(filteredJobs.map(j => String(j.id || j._id))));
  const clearAll  = () => setSelected(new Set());

  const save = async () => {
    setSaving(true);
    try {
      const allIds  = jobs.map(j => String(j.id || j._id));
      const publish   = allIds.filter(id => selected.has(id));
      const unpublish = allIds.filter(id => !selected.has(id));
      // Pass orgId so super_admin endpoint can scope correctly
      const orgId = String(activeOrg?.id || activeOrg?._id || '');
      await api.updateCareerListing(publish, unpublish, orgId);
      setToast(`✅ Career listing updated — ${publish.length} job${publish.length !== 1 ? 's' : ''} published`);
    } catch (e) {
      setToast('❌ ' + (e.message || 'Save failed'));
    }
    setSaving(false);
  };

  const copyUrl   = () => { navigator.clipboard.writeText(careerUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };
  const copyEmbed = () => { navigator.clipboard.writeText(embedCode).then(() => { setCopiedEmbed(true); setTimeout(() => setCopiedEmbed(false), 2000); }); };

  const filteredJobs = jobs.filter(j => {
    const q = search.toLowerCase();
    return !q || (j.title||'').toLowerCase().includes(q) || (j.location||'').toLowerCase().includes(q);
  });

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(5,13,26,0.75)', backdropFilter:'blur(8px)', zIndex:10010, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px 16px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'#fff', borderRadius:24, width:'100%', maxWidth:760, height:'min(840px, 92vh)', display:'flex', flexDirection:'column', boxShadow:'0 32px 64px rgba(0,0,0,0.3)', overflow:'hidden' }}>

        {/* STICKY HEADER */}
        <div style={{ background:'linear-gradient(135deg,#032D60,#0176D3)', padding:'22px 32px', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:16, flex:1, minWidth:0 }}>
               <div style={{ width:48, height:48, borderRadius:14, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:22 }}>🌐</div>
               <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:'rgba(255,255,255,0.7)', fontSize:10, fontWeight:800, letterSpacing:1.5, textTransform:'uppercase', marginBottom:2 }}>Public Presence</div>
                  {isSuperAdminSelect ? (
                    <select value={activeOrg?.id || activeOrg?._id || ''} onChange={e => {
                      const found = orgsList.find(o => String(o.id || o._id) === e.target.value);
                      if (found) { setSelectedOrg(found); setResolvedSlug(found.slug || ''); }
                    }} style={{ background:'rgba(255,255,255,0.2)', color:'#fff', border:'1px solid rgba(255,255,255,0.3)', borderRadius:10, padding:'6px 14px', fontSize:15, fontWeight:800, outline:'none', cursor:'pointer', marginTop:2, maxWidth:'100%' }}>
                      {orgsList.map(o => <option key={o.id || o._id} value={o.id || o._id} style={{ color:'#181818' }}>{o.name}</option>)}
                    </select>
                  ) : (
                    <h2 style={{ color:'#fff', margin:0, fontSize:18, fontWeight:800 }}>{activeOrg?.name} Listing</h2>
                  )}
               </div>
            </div>
            <button onClick={onClose} style={{ background:'rgba(255,255,255,0.2)', border:'none', color:'#fff', width:36, height:36, borderRadius:10, cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}>✕</button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{ background:toast.startsWith('❌')?'rgba(186,5,23,0.08)':'rgba(16,185,129,0.08)', borderBottom:`1px solid ${toast.startsWith('❌')?'rgba(186,5,23,0.15)':'rgba(16,185,129,0.15)'}`, padding:'12px 32px', color:toast.startsWith('❌')?'#BA0517':'#059669', fontSize:13, fontWeight:700, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
            {toast}
            <button onClick={() => setToast('')} style={{ background:'none', border:'none', cursor:'pointer', color:'inherit', fontSize:16 }}>✕</button>
          </div>
        )}

        {/* Career URL section */}
        <div style={{ padding:'24px 32px', background:'#F8FAFF', borderBottom:'1px solid #E2E8F0', flexShrink:0 }}>
          <div style={{ fontSize:12, fontWeight:800, color:'#475569', marginBottom:10, textTransform:'uppercase', letterSpacing:0.5 }}>🔗 Public Career Portal</div>
          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ flex:1, background:'#fff', border:'1.5px solid #E2E8F0', borderRadius:12, padding:'11px 16px', fontSize:14, color:'#0176D3', fontWeight:700, wordBreak:'break-all', minWidth:240 }}>
              {careerUrl || (orgSlug ? 'Preparing link…' : '⚠️ Configuration Required')}
            </div>
            {careerUrl && (
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={copyUrl}
                  style={{ padding:'0 16px', height:44, background:copied?'#10B981':'#0176D3', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer', transition:'all 0.2s' }}>
                  {copied ? '✅ Copied' : '📋 Copy Link'}
                </button>
                <a href={careerUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display:'flex', alignItems:'center', padding:'0 16px', height:44, background:'#fff', color:'#0176D3', border:'1.5px solid #0176D3', borderRadius:10, fontWeight:700, fontSize:13, textDecoration:'none' }}>
                  Visit Portal
                </a>
              </div>
            )}
          </div>

          {/* Embed code */}
          {careerUrl && (
            <details style={{ marginTop:16 }}>
              <summary style={{ fontSize:12, color:'#64748B', cursor:'pointer', fontWeight:700, userSelect:'none', padding:'4px 0', display:'flex', alignItems:'center', gap:6 }}>
                 <span style={{ color:'#0176D3' }}>📦</span> Developer Settings: Website Embed (iFrame)
              </summary>
              <div style={{ marginTop:10, background:'#0F172A', borderRadius:14, padding:'18px 20px', position:'relative', border:'1px solid #334155' }}>
                <pre style={{ color:'#7DD3FC', fontSize:11, margin:0, whiteSpace:'pre-wrap', wordBreak:'break-all', lineHeight:1.7, fontFamily:'monospace' }}>{embedCode}</pre>
                <button onClick={copyEmbed}
                  style={{ position:'absolute', top:12, right:12, background:copiedEmbed?'#059669':'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, color:'#fff', fontSize:11, padding:'6px 12px', cursor:'pointer', fontWeight:800, transition:'all 0.2s' }}>
                  {copiedEmbed ? '✅ Copied' : 'Copy Code'}
                </button>
              </div>
            </details>
          )}
        </div>

        {/* Search + bulk controls */}
        <div style={{ padding:'16px 32px', borderBottom:'1px solid #E2E8F0', display:'flex', gap:12, alignItems:'center', flexShrink:0, flexWrap:'wrap', background:'#fff' }}>
          <div style={{ flex:1, minWidth:220, position:'relative' }}>
             <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vacancies by title or location…"
               style={{ width:'100%', padding:'12px 16px', borderRadius:12, border:'1.5px solid #E2E8F0', fontSize:14, outline:'none', boxSizing:'border-box', background:'#F8FAFF' }} />
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
             <button onClick={selectAll} style={{ height:40, padding:'0 14px', background:'rgba(1,118,211,0.06)', border:'1px solid rgba(1,118,211,0.15)', borderRadius:10, color:'#0176D3', fontWeight:700, fontSize:12, cursor:'pointer' }}>Select All</button>
             <button onClick={clearAll}  style={{ height:40, padding:'0 14px', background:'rgba(186,5,23,0.06)', border:'1px solid rgba(186,5,23,0.15)', borderRadius:10, color:'#BA0517', fontWeight:700, fontSize:12, cursor:'pointer' }}>Clear All</button>
          </div>
        </div>

        {/* Job list */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 32px', background:'#F8FAFF' }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:'60px 0', color:'#94A3B8' }}>
               <div style={{ marginBottom:16 }}>⏳</div>
               <div style={{ fontWeight:600 }}>Syncing job data…</div>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div style={{ textAlign:'center', padding:'80px 0', color:'#94A3B8' }}>
              <div style={{ fontSize:42, marginBottom:16 }}>📁</div>
              <p style={{ fontWeight:600 }}>{search ? 'No jobs match your search filters.' : 'No active job postings to list.'}</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {filteredJobs.map(j => {
                const id    = String(j.id || j._id);
                const isOn  = selected.has(id);
                const urg   = j.urgency || '';
                const urgColor = URGENCY_COLOR[urg] || '#64748B';
                return (
                  <label key={id} htmlFor={`job-toggle-${id}`}
                    style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 20px', borderRadius:16, border:`1px solid ${isOn?'rgba(1,118,211,0.3)':'#E2E8F0'}`, background:isOn?'rgba(1,118,211,0.05)':'#FFF', cursor:'pointer', transition:'all 0.2s', boxShadow:isOn?'0 4px 12px rgba(1,118,211,0.08)':'none' }}>
                    {/* Toggle */}
                    <div style={{ width:48, height:26, borderRadius:13, background:isOn?'#0176D3':'#CBD5E1', position:'relative', flexShrink:0, transition:'background 0.3s' }}>
                      <div style={{ width:20, height:20, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left:isOn?25:3, transition:'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow:'0 2px 5px rgba(0,0,0,0.2)' }} />
                      <input id={`job-toggle-${id}`} type="checkbox" checked={isOn} onChange={() => toggle(id)}
                        style={{ opacity:0, position:'absolute', width:'100%', height:'100%', cursor:'pointer', margin:0 }} />
                    </div>
                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:800, fontSize:15, color:'#1E293B', marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{j.title}</div>
                      <div style={{ fontSize:12, color:'#64748B', display:'flex', gap:12 }}>
                        {j.location && <span>📍 {j.location}</span>}
                        {j.jobType && <span>💼 {j.jobType}</span>}
                      </div>
                    </div>
                    {/* Badges */}
                    <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
                      {urg && (
                        <span style={{ background:`${urgColor}12`, color:urgColor, fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:8, border:`1px solid ${urgColor}25`, textTransform:'uppercase' }}>
                          {URGENCY_LABEL[urg] || urg}
                        </span>
                      )}
                      <div style={{ width:8, height:8, borderRadius:'50%', background:isOn?'#10B981':'#94A3B8' }} />
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* STICKY FOOTER */}
        <div style={{ padding:'20px 32px', borderTop:'1px solid #E2E8F0', display:'flex', gap:12, justifyContent:'space-between', alignItems:'center', background:'#fff', flexShrink:0, boxShadow:'0 -4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ color:'#64748B', fontSize:13, fontWeight:600 }}>
             <span style={{ color:'#0176D3' }}>{selected.size}</span> positions published
          </div>
          <div style={{ display:'flex', gap:12 }}>
            <button onClick={onClose} style={{ height:48, padding:'0 24px', border:'1.5px solid #E2E8F0', background:'#fff', borderRadius:12, color:'#475569', fontWeight:700, fontSize:14, cursor:'pointer' }}>Discard</button>
            <button onClick={save} disabled={saving}
              style={{ height:48, padding:'0 32px', background:'linear-gradient(135deg,#032D60,#0176D3)', border:'none', borderRadius:12, color:'#fff', fontWeight:800, fontSize:14, cursor:saving?'not-allowed':'pointer', opacity:saving?0.7:1, boxShadow:'0 8px 16px rgba(1,118,211,0.2)' }}>
              {saving ? '⏳ Syncing…' : `💾 Publish Listing`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
