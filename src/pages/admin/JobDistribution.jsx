import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import { API_BASE_URL } from '../../api/config.js';
import Spinner from '../../components/ui/Spinner.jsx';
import Toast from '../../components/ui/Toast.jsx';
import { card, btnP, btnG } from '../../constants/styles.js';

const STATUS_CONFIG = {
  success            : { dot: '🟢', label: 'Live',               color: '#10b981' },
  pending            : { dot: '🟡', label: 'Pending',             color: '#f59e0b' },
  retry              : { dot: '🟡', label: 'Retrying',            color: '#f59e0b' },
  skipped            : { dot: '⚪', label: 'Skipped (no API key)',color: '#94a3b8' },
  failed             : { dot: '🔴', label: 'Failed',              color: '#ef4444' },
  permanently_failed : { dot: '🔴', label: 'Failed (max retries)',color: '#dc2626' },
  expired            : { dot: '⚫', label: 'Expired',             color: '#64748b' },
  not_submitted      : { dot: '⚪', label: 'Not yet submitted',   color: '#94a3b8' },
};

const FEED_NOTE = 'Feed is live — platform pulls automatically within 24h after you submit the feed URL below.';

export default function JobDistribution({ user }) {
  const { jobId } = useParams();
  const navigate  = useNavigate();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [retrying, setRetrying] = useState({});
  const [settings, setSettings] = useState({ naukri: false, shine: false, timesjobs: false });
  const [savingSettings, setSavingSettings] = useState(false);
  const [toast, setToast]       = useState('');
  const [copied, setCopied]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getJobDistribution(jobId);
      setData(r?.data || r);
      if (r?.data?.job?.tenantId || r?.data?.empXml) {
        const tid = r.data.job?.tenantId || r.data.empXml?.split('/employer/')[1]?.split('/')[0];
        if (tid) {
          const s = await api.getEmployerSettings(tid).catch(() => ({}));
          setSettings(s?.data || {});
        }
      }
    } catch (e) { setToast('❌ ' + e.message); }
    setLoading(false);
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  const retry = async (platform) => {
    setRetrying(p => ({ ...p, [platform]: true }));
    try {
      await api.retryDistribution(jobId, platform);
      setToast('✅ Retry triggered');
      setTimeout(load, 1500);
    } catch (e) { setToast('❌ ' + e.message); }
    setRetrying(p => ({ ...p, [platform]: false }));
  };

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(''), 2000); });
  };

  const saveSettings = async () => {
    const tid = data?.job?.tenantId;
    if (!tid) return;
    setSavingSettings(true);
    try {
      await api.saveEmployerSettings(tid, settings);
      setToast('✅ Settings saved');
    } catch (e) { setToast('❌ ' + e.message); }
    setSavingSettings(false);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spinner size={36} /></div>;
  if (!data)   return <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Job not found.</div>;

  const { job, platforms, feedXml, feedJson, empXml, empJson } = data;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ ...card, padding: '20px 28px', marginBottom: 24, background: 'linear-gradient(135deg,#032D60,#0176D3)', borderRadius: 16 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', marginBottom: 12 }}>← Back</button>
        <h1 style={{ color: '#fff', margin: 0, fontSize: 20, fontWeight: 800 }}>📡 Distribution Status</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', margin: '4px 0 0', fontSize: 14 }}>{job.title} · <span style={{ color: job.status === 'active' ? '#6ee7b7' : '#fca5a5' }}>{job.status === 'active' ? '🟢 Active' : '⚫ Closed'}</span></p>
      </div>

      {/* Platform Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        {platforms.map(p => {
          const sc    = STATUS_CONFIG[p.status] || STATUS_CONFIG.not_submitted;
          const canRetry = ['failed', 'permanently_failed'].includes(p.status);
          const isFeed   = p.type === 'feed';
          const isManual = p.type === 'manual';
          return (
            <div key={p.platform} style={{ ...card, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 16, borderLeft: `4px solid ${sc.color}` }}>
              <div style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{p.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: '#0A1628' }}>{p.label}</span>
                  <span style={{ background: `${sc.color}15`, color: sc.color, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                    {sc.dot} {sc.label}
                  </span>
                  {p.type === 'schema' && <span style={{ background: '#f0fdf4', color: '#166534', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>JSON-LD on page</span>}
                  {isFeed   && <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>Feed-based</span>}
                  {isManual && <span style={{ background: '#fefce8', color: '#854d0e', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>Manual submission</span>}
                </div>

                {p.distributedAt && (
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Live since: {new Date(p.distributedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                )}
                {p.expiredAt && (
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Expired: {new Date(p.expiredAt).toLocaleDateString('en-IN')}</div>
                )}
                {p.responseMessage && (
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, background: '#f8fafc', borderRadius: 6, padding: '4px 8px' }}>{p.responseMessage}</div>
                )}
                {isFeed && p.status === 'pending' && (
                  <div style={{ fontSize: 11, color: '#92400e', marginTop: 4, background: '#fef3c7', borderRadius: 6, padding: '4px 8px' }}>{FEED_NOTE}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                {p.platformJobUrl && (
                  <a href={p.platformJobUrl} target="_blank" rel="noopener noreferrer"
                    style={{ ...btnG, padding: '6px 12px', fontSize: 11, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    View ↗
                  </a>
                )}
                {canRetry && (
                  <button onClick={() => retry(p.platform)} disabled={retrying[p.platform]}
                    style={{ ...btnP, padding: '6px 12px', fontSize: 11, opacity: retrying[p.platform] ? 0.7 : 1 }}>
                    {retrying[p.platform] ? '⏳' : '🔄 Retry'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Feed URLs panel */}
      <div style={{ ...card, padding: '20px 24px', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 800, color: '#032D60' }}>📡 Your Feed URLs</h3>
        <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 16px' }}>
          Submit these URLs to job platforms under your own employer account to distribute all your jobs automatically.
        </p>
        {[
          { label: 'Global XML Feed',   url: feedXml,  key: 'gxml' },
          { label: 'Global JSON Feed',  url: feedJson, key: 'gjson' },
          { label: 'Your XML Feed',     url: empXml,   key: 'exml' },
          { label: 'Your JSON Feed',    url: empJson,  key: 'ejson' },
        ].map(f => (
          <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, background: '#F8FAFC', borderRadius: 8, padding: '10px 14px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', minWidth: 130 }}>{f.label}</span>
            <span style={{ fontSize: 11, color: '#0176D3', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.url}</span>
            <button onClick={() => copyText(f.url, f.key)}
              style={{ background: copied === f.key ? '#10b981' : '#0176D3', border: 'none', borderRadius: 6, color: '#fff', padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}>
              {copied === f.key ? '✅ Copied' : '📋 Copy'}
            </button>
          </div>
        ))}

        <div style={{ marginTop: 20, background: '#eff6ff', borderRadius: 10, padding: '14px 18px' }}>
          <p style={{ color: '#1d4ed8', fontWeight: 700, fontSize: 13, margin: '0 0 10px' }}>📋 Submit your feed to these platforms:</p>
          {[
            ['Naukri',    'naukri.com/recruiter → Settings → Feed URL → Paste'],
            ['Shine',     'shine.com/recruiter → Account → XML Feed → Paste'],
            ['TimesJobs', 'timesjobs.com/recruiter → Settings → Feed → Paste'],
            ['Indeed',    'indeed.com/publisher → Create account → Submit feed URL'],
            ['Jooble',    'jooble.org/info/partners → Fill partner form → Submit feed'],
            ['Adzuna',    'adzuna.in → Contact via partner form → Submit feed'],
            ['Careerjet', 'careerjet.co.in/partner → Submit feed URL'],
          ].map(([name, steps]) => (
            <div key={name} style={{ fontSize: 12, color: '#374151', marginBottom: 6, display: 'flex', gap: 8 }}>
              <span style={{ fontWeight: 700, minWidth: 70 }}>{name}:</span>
              <span style={{ color: '#64748b' }}>{steps}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Manual submission checklist */}
      <div style={{ ...card, padding: '20px 24px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 800, color: '#032D60' }}>✅ Platform Submission Checklist</h3>
        {[
          { key: 'naukri',    label: 'Submitted to Naukri' },
          { key: 'shine',     label: 'Submitted to Shine' },
          { key: 'timesjobs', label: 'Submitted to TimesJobs' },
        ].map(item => (
          <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer', padding: '10px 14px', background: settings[item.key] ? '#f0fdf4' : '#F8FAFC', borderRadius: 8, border: `1px solid ${settings[item.key] ? '#86efac' : '#E2E8F0'}`, transition: 'all 0.15s' }}>
            <input type="checkbox" checked={!!settings[item.key]}
              onChange={e => setSettings(s => ({ ...s, [item.key]: e.target.checked }))}
              style={{ width: 16, height: 16, accentColor: '#10b981', cursor: 'pointer' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{item.label}</span>
            {settings[item.key] && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#10b981', fontWeight: 700 }}>✅ Done</span>}
          </label>
        ))}
        <button onClick={saveSettings} disabled={savingSettings}
          style={{ ...btnP, padding: '10px 20px', opacity: savingSettings ? 0.7 : 1 }}>
          {savingSettings ? '⏳ Saving…' : '💾 Save Checklist'}
        </button>
      </div>

      <Toast msg={toast} onClose={() => setToast('')} />
    </div>
  );
}
