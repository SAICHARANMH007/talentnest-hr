import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/api.js';

const URGENCY_COLOR = { High: '#BA0517', Medium: '#F59E0B', Low: '#10B981', '': '#0176D3' };
const URGENCY_LABEL = { High: '🔥 Emergency', Medium: '⚡ High', Low: '📌 Normal' };

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
  // selected = set of jobIds that should be isPublic=true
  const [selected, setSelected] = useState(new Set());

  const isSuperAdminSelect = org?.id === 'super_admin_select';
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [orgsList, setOrgsList] = useState([]);
  
  const activeOrg = isSuperAdminSelect ? selectedOrg : org;
  const orgSlug = activeOrg?.slug || '';
  const careerUrl = orgSlug ? `${FRONTEND_URL}/${orgSlug}/careers` : '';
  const embedCode = orgSlug ? `<iframe src="${FRONTEND_URL}/${orgSlug}/careers?embed=1" width="100%" height="800" frameborder="0" allow="*" style="border:none;border-radius:12px;"></iframe>` : '';

  useEffect(() => {
    if (isSuperAdminSelect) {
      api.getOrgs().then(res => {
        const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        setOrgsList(list);
        if (list.length > 0) setSelectedOrg(list[0]);
      }).catch(() => setOrgsList([]));
    }
  }, [isSuperAdminSelect]);

  const load = useCallback(async () => {
    if (!activeOrg?.id && !activeOrg?._id) return;
    setLoading(true);
    try {
      // Load jobs for this org only (admin sees own, super_admin gets orgId filter)
      const res = await api.getJobs({ limit: 500 });
      const allJobs = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      // For super_admin viewing another org's modal, filter by org
      const orgId = String(activeOrg.id || activeOrg._id || '');
      const filtered = user?.role === 'super_admin' && orgId
        ? allJobs.filter(j => String(j.tenantId || '') === orgId || String(j.tenantId?._id || '') === orgId)
        : allJobs;

      setJobs(filtered.filter(j => j.status === 'active'));
      // Pre-select currently published jobs
      setSelected(new Set(filtered.filter(j => j.isPublic).map(j => String(j.id || j._id))));
    } catch {
      setToast('❌ Could not load jobs');
    }
    setLoading(false);
  }, [activeOrg?.id, activeOrg?._id, user?.role]);

  useEffect(() => { load(); }, [load]);

  const toggle = (jobId) => {
    const id = String(jobId);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll  = () => setSelected(new Set(filteredJobs.map(j => String(j.id || j._id))));
  const clearAll   = () => setSelected(new Set());

  const save = async () => {
    setSaving(true);
    try {
      const allIds = jobs.map(j => String(j.id || j._id));
      const publish   = allIds.filter(id => selected.has(id));
      const unpublish = allIds.filter(id => !selected.has(id));
      await api.updateCareerListing(publish, unpublish);
      setToast(`✅ Career listing updated — ${publish.length} job${publish.length !== 1 ? 's' : ''} published`);
    } catch (e) {
      setToast('❌ ' + (e.message || 'Save failed'));
    }
    setSaving(false);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(careerUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const filteredJobs = jobs.filter(j => {
    const q = search.toLowerCase();
    return !q || (j.title||'').toLowerCase().includes(q) || (j.location||'').toLowerCase().includes(q);
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10010, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 720, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#032D60,#0176D3)', padding: '20px 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>Career Listing Manager</div>
              {isSuperAdminSelect ? (
                <div style={{ marginTop: 4 }}>
                  <select value={activeOrg?.id || ''} onChange={e => {
                    const found = orgsList.find(o => String(o.id || o._id) === e.target.value);
                    if (found) setSelectedOrg(found);
                  }} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '6px 12px', fontSize: 14, fontWeight: 700, outline: 'none', cursor: 'pointer' }}>
                    {orgsList.map(o => <option key={o.id || o._id} value={o.id || o._id} style={{ color: '#181818' }}>{o.name}</option>)}
                  </select>
                </div>
              ) : (
                <h2 style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 800 }}>🌐 {activeOrg?.name}</h2>
              )}
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: '6px 0 0' }}>Select which jobs appear on your public career page</p>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: '#fff', width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{ background: toast.startsWith('❌') ? 'rgba(186,5,23,0.07)' : 'rgba(16,185,129,0.07)', borderBottom: `1px solid ${toast.startsWith('❌') ? 'rgba(186,5,23,0.2)' : 'rgba(16,185,129,0.2)'}`, padding: '10px 20px', color: toast.startsWith('❌') ? '#BA0517' : '#065f46', fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            {toast}
            <button onClick={() => setToast('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16 }}>✕</button>
          </div>
        )}

        {/* Career URL section */}
        <div style={{ padding: '16px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>📎 Your Public Career Page URL</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#0176D3', fontWeight: 600, wordBreak: 'break-all', minWidth: 200 }}>
              {careerUrl || 'Slug not available for this org'}
            </div>
            {careerUrl && (
              <>
                <button onClick={copyUrl}
                  style={{ padding: '8px 14px', background: copied ? '#10B981' : '#0176D3', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.2s' }}>
                  {copied ? '✅ Copied!' : '📋 Copy URL'}
                </button>
                <a href={careerUrl} target="_blank" rel="noopener noreferrer"
                  style={{ padding: '8px 14px', background: '#F0FDF4', color: '#059669', border: '1px solid #A7F3D0', borderRadius: 8, fontWeight: 700, fontSize: 12, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  🔗 Preview
                </a>
              </>
            )}
          </div>
          {/* Embed code */}
          {careerUrl && (
            <details style={{ marginTop: 12 }}>
              <summary style={{ fontSize: 12, color: '#64748B', cursor: 'pointer', fontWeight: 600, userSelect: 'none' }}>
                📦 Embed on your website (iframe code)
              </summary>
              <div style={{ marginTop: 8, background: '#0f172a', borderRadius: 8, padding: '12px 16px', position: 'relative' }}>
                <pre style={{ color: '#7DD3FC', fontSize: 11, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.6 }}>{embedCode}</pre>
                <button onClick={() => navigator.clipboard.writeText(embedCode)}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>
                  Copy
                </button>
              </div>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '8px 0 0', lineHeight: 1.6 }}>
                Paste this code on your NuSummit careers page. Our listing will render seamlessly inside it.
              </p>
            </details>
          )}
        </div>

        {/* Search + bulk controls */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search jobs…"
            style={{ flex: 1, minWidth: 180, padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, outline: 'none' }} />
          <span style={{ fontSize: 13, color: '#64748B', whiteSpace: 'nowrap' }}>
            <b style={{ color: '#0176D3' }}>{selected.size}</b> of {jobs.length} selected
          </span>
          <button onClick={selectAll} style={{ padding: '7px 14px', background: 'rgba(1,118,211,0.08)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, color: '#0176D3', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Select All</button>
          <button onClick={clearAll}  style={{ padding: '7px 14px', background: 'rgba(186,5,23,0.07)', border: '1px solid rgba(186,5,23,0.2)', borderRadius: 8, color: '#BA0517', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Clear All</button>
        </div>

        {/* Job list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#64748B' }}>⏳ Loading jobs…</div>
          ) : filteredJobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#94A3B8' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>💼</div>
              <p>{search ? 'No jobs match your search.' : 'No active jobs found for this organisation.'}</p>
            </div>
          ) : (
            filteredJobs.map(j => {
              const id    = String(j.id || j._id);
              const isOn  = selected.has(id);
              const urg   = j.urgency || '';
              const urgColor = URGENCY_COLOR[urg] || '#64748B';
              return (
                <label key={id} htmlFor={`job-toggle-${id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 12, border: `1.5px solid ${isOn ? 'rgba(1,118,211,0.3)' : '#F1F5F9'}`, background: isOn ? 'rgba(1,118,211,0.04)' : '#FAFAFA', marginBottom: 8, cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none' }}
                  onMouseEnter={e => { if (!isOn) e.currentTarget.style.borderColor = '#CBD5E1'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = isOn ? 'rgba(1,118,211,0.3)' : '#F1F5F9'; }}>
                  {/* Custom toggle */}
                  <div style={{ width: 44, height: 24, borderRadius: 12, background: isOn ? '#0176D3' : '#E2E8F0', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: isOn ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                    <input id={`job-toggle-${id}`} type="checkbox" checked={isOn} onChange={() => toggle(id)} style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', cursor: 'pointer', margin: 0 }} />
                  </div>
                  {/* Job info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0A1628', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.title}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      {j.location && `📍 ${j.location}  `}
                      {j.jobType && `💼 ${j.jobType}  `}
                      {j.experience && `🗓 ${j.experience}`}
                    </div>
                  </div>
                  {/* Badges */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    {urg && (
                      <span style={{ background: `${urgColor}18`, color: urgColor, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 50, border: `1px solid ${urgColor}30` }}>
                        {URGENCY_LABEL[urg] || urg}
                      </span>
                    )}
                    <span style={{ background: isOn ? 'rgba(16,185,129,0.1)' : 'rgba(158,157,155,0.1)', color: isOn ? '#059669' : '#9E9D9B', fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 50 }}>
                      {isOn ? '✅ Listed' : '⬜ Hidden'}
                    </span>
                  </div>
                </label>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: 10, justifyContent: 'flex-end', background: '#FAFAFA', flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '10px 20px', border: '1px solid #E2E8F0', background: '#fff', borderRadius: 10, color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#0176D3,#014486)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 800, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? '⏳ Saving…' : `💾 Save Listing (${selected.size} jobs)`}
          </button>
        </div>
      </div>
    </div>
  );
}
