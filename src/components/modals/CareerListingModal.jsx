import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/api.js';
import Modal from '../ui/Modal.jsx';
import { btnP, btnG } from '../../constants/styles.js';

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
  // Modern JS widget embed — replaces outdated iframe
  const embedCode = orgSlug
    ? `<!-- TalentNest Career Widget -->\n<div id="tn-careers-widget" data-org="${orgSlug}"></div>\n<script>\n(function(){\n  var d=document,s=d.createElement('script');\n  s.src='${SITE_URL}/widget.js';\n  s.setAttribute('data-org','${orgSlug}');\n  s.setAttribute('data-container','tn-careers-widget');\n  s.setAttribute('data-theme','light');\n  s.async=true;\n  d.head.appendChild(s);\n})();\n</script>`
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
    return !q || (j.title || '').toLowerCase().includes(q) || (j.location || '').toLowerCase().includes(q);
  });

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 20 }}>🌐</div>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 1 }}>Public Presence</div>
            {isSuperAdminSelect ? (
              <select value={activeOrg?.id || activeOrg?._id || ''} onChange={e => {
                const found = orgsList.find(o => String(o.id || o._id) === e.target.value);
                if (found) { setSelectedOrg(found); setResolvedSlug(found.slug || ''); }
              }} style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '4px 10px', fontSize: 14, fontWeight: 800, outline: 'none', cursor: 'pointer' }}>
                {orgsList.map(o => <option key={o.id || o._id} value={o.id || o._id} style={{ color: '#181818' }}>{o.name}</option>)}
              </select>
            ) : (
              <h3 style={{ color: '#fff', margin: 0, fontSize: 16, fontWeight: 800 }}>{activeOrg?.name} Listing</h3>
            )}
          </div>
        </div>
      }
      onClose={onClose}
      width="760px"
      footer={
        <>
          <div style={{ color: '#64748B', fontSize: 13, fontWeight: 600, marginRight: 'auto' }}>
            <span style={{ color: '#0176D3' }}>{selected.size}</span> positions published
          </div>
          <button onClick={onClose} style={{ ...btnG, minHeight: 48, padding: '0 24px' }}>Discard</button>
          <button onClick={save} disabled={saving}
            style={{ ...btnP, minHeight: 48, padding: '0 32px', background: 'linear-gradient(135deg,#032D60,#0176D3)', opacity: saving ? 0.7 : 1 }}>
            {saving ? '⏳ Syncing…' : `💾 Publish Listing`}
          </button>
        </>
      }
    >
      {toast && (
        <div style={{ background: toast.startsWith('❌') ? 'rgba(186,5,23,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${toast.startsWith('❌') ? 'rgba(186,5,23,0.15)' : 'rgba(16,185,129,0.15)'}`, padding: '10px 20px', color: toast.startsWith('❌') ? '#BA0517' : '#059669', fontSize: 13, fontWeight: 700, borderRadius: 12, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {toast}
          <button onClick={() => setToast('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16 }}>✕</button>
        </div>
      )}

      {/* Career URL section */}
      <div style={{ padding: '20px', background: '#F8FAFF', borderRadius: 16, border: '1px solid #E2E8F0', marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>🔗 Public Career Portal</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#0176D3', fontWeight: 700, wordBreak: 'break-all' }}>
            {careerUrl || (orgSlug ? 'Preparing link…' : '⚠️ Configuration Required')}
          </div>
          {careerUrl && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={copyUrl}
                style={{ padding: '0 14px', height: 40, background: copied ? '#10B981' : '#0176D3', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                {copied ? '✅ Copied' : '📋 Copy Link'}
              </button>
              <a href={careerUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', padding: '0 14px', height: 40, background: '#fff', color: '#0176D3', border: '1.5px solid #0176D3', borderRadius: 8, fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>
                Visit Portal
              </a>
            </div>
          )}
        </div>

        {/* Embed code */}
        {careerUrl && (
          <details style={{ marginTop: 12 }}>
            <summary style={{ fontSize: 11, color: '#64748B', cursor: 'pointer', fontWeight: 700, padding: '4px 0' }}>
              <span style={{ color: '#0176D3' }}>⚡</span> Embed on Your Website — JavaScript Widget
            </summary>
            <div style={{ marginTop: 8, background: '#0F172A', borderRadius: 12, padding: '14px', position: 'relative', border: '1px solid #334155' }}>
              <pre style={{ color: '#7DD3FC', fontSize: 10, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace' }}>{embedCode}</pre>
              <button onClick={copyEmbed}
                style={{ position: 'absolute', top: 10, right: 10, background: copiedEmbed ? '#059669' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, color: '#fff', fontSize: 10, padding: '4px 10px', cursor: 'pointer', fontWeight: 800 }}>
                {copiedEmbed ? '✅ Copied' : 'Copy Code'}
              </button>
            </div>
          </details>
        )}
      </div>

      {/* Search + bulk controls */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vacancies…"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 14, outline: 'none', background: '#F8FAFF' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={selectAll} style={{ height: 38, padding: '0 12px', background: 'rgba(1,118,211,0.06)', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 8, color: '#0176D3', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Select All</button>
          <button onClick={clearAll} style={{ height: 38, padding: '0 12px', background: 'rgba(186,5,23,0.06)', border: '1px solid rgba(186,5,23,0.15)', borderRadius: 8, color: '#BA0517', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Clear All</button>
        </div>
      </div>

      {/* Job list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>⏳ Syncing job data…</div>
        ) : filteredJobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8' }}>
            <p style={{ fontWeight: 600 }}>{search ? 'No jobs match your search.' : 'No active job postings.'}</p>
          </div>
        ) : (
          filteredJobs.map(j => {
            const id = String(j.id || j._id);
            const isOn = selected.has(id);
            const urg = j.urgency || '';
            const urgColor = URGENCY_COLOR[urg] || '#64748B';
            return (
              <label key={id} htmlFor={`job-toggle-${id}`}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 14, border: `1px solid ${isOn ? 'rgba(1,118,211,0.3)' : '#E2E8F0'}`, background: isOn ? 'rgba(1,118,211,0.05)' : '#FFF', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ width: 44, height: 24, borderRadius: 12, background: isOn ? '#0176D3' : '#CBD5E1', position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: isOn ? 23 : 3, transition: 'left 0.2s' }} />
                  <input id={`job-toggle-${id}`} type="checkbox" checked={isOn} onChange={() => toggle(id)} style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', cursor: 'pointer', margin: 0 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#1E293B', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.title}</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>📍 {j.location} · 💼 {j.jobType}</div>
                </div>
                {urg && (
                  <span style={{ background: `${urgColor}12`, color: urgColor, fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 6, border: `1px solid ${urgColor}25`, textTransform: 'uppercase' }}>
                    {URGENCY_LABEL[urg] || urg}
                  </span>
                )}
              </label>
            );
          })
        )}
      </div>
    </Modal>
  );
}
