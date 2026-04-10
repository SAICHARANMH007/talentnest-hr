import React, { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import ChangePasswordModal from '../../components/shared/ChangePasswordModal.jsx';
import LogoManager from '../../components/LogoManager.jsx';
import Field from '../../components/ui/Field.jsx';
import FormRow from '../../components/ui/FormRow.jsx';

const glass = { background: '#FFFFFF', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 16, padding: 24 };

function extractCompanyName(url) {
  try {
    const domain = url.replace(/https?:\/\//i, '').replace(/www\./i, '').split('/')[0].split('.')[0];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch { return ''; }
}

export default function OrgSettings({ user }) {
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', domain: '', industry: '', size: '' });
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [stages, setStages] = useState([]);
  const [newStage, setNewStage] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [emailForm, setEmailForm] = useState({ fromName: '', fromEmail: '', provider: 'resend', apiKey: '', smtpHost: '', smtpPort: '587' });
  const [savingEmail, setSavingEmail] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  // Pipeline Templates
  const [templates, setTemplates]       = useState({ presets: [], custom: [] });
  const [newTplName, setNewTplName]     = useState('');
  const [savingTpl, setSavingTpl]       = useState(false);
  const [applyingTpl, setApplyingTpl]   = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const orgsRes = await api.getOrgs();
      const orgs = Array.isArray(orgsRes) ? orgsRes : (orgsRes?.data || []);
      if (orgs && orgs.length > 0) {
        const myOrg = orgs.find(o => String(o.id) === String(user?.orgId) || String(o._id) === String(user?.orgId));
        const o = myOrg || orgs[0];
        setOrg(o);
        setForm({ name: o.name || '', domain: o.domain || '', industry: o.industry || '', size: o.size || '' });
        setStages(o.settings?.pipelineStages || ['applied','screening','shortlisted','interview_scheduled','offer_extended','selected','rejected']);
        if (o.settings?.emailSettings) setEmailForm(prev => ({...prev, ...o.settings.emailSettings}));
      }
      // Load pipeline templates
      try {
        const tr = await api.getPipelineTemplates();
        if (tr?.data) setTemplates(tr.data);
      } catch {}
    } catch {}
    setLoading(false);
  };

  const saveAsTemplate = async () => {
    if (!newTplName.trim()) return;
    setSavingTpl(true);
    try {
      const r = await api.savePipelineTemplate(newTplName.trim(), stages);
      setTemplates(prev => ({ ...prev, custom: [...prev.custom.filter(t => t.name !== r?.data?.name), r?.data] }));
      setNewTplName('');
      setSuccess('Template saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.message); }
    setSavingTpl(false);
  };

  const applyTemplate = async (name) => {
    setApplyingTpl(name);
    try {
      const r = await api.applyPipelineTemplate(name);
      if (r?.stages) setStages(r.stages);
      setSuccess(`Pipeline updated to "${name}"!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.message); }
    setApplyingTpl('');
  };

  const deleteTemplate = async (name) => {
    try {
      await api.deletePipelineTemplate(name);
      setTemplates(prev => ({ ...prev, custom: prev.custom.filter(t => t.name !== name) }));
    } catch (e) { setError(e.message); }
  };

  const save = async () => {
    if (!org) return;
    setSaving(true); setError('');
    try {
      await api.updateOrg(org.id, { ...form, settings: { ...(org.settings || {}), pipelineStages: stages } });
      setSuccess('Settings saved!');
      setTimeout(() => setSuccess(''), 3000);
      load();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const addStage = () => {
    if (!newStage.trim()) return;
    const slug = newStage.trim().toLowerCase().replace(/\s+/g, '_');
    setStages(prev => [...prev, slug]);
    setNewStage('');
  };

  const removeStage = (s) => setStages(prev => prev.filter(x => x !== s));

  const moveStage = (index, dir) => {
    const newStages = [...stages];
    const target = index + dir;
    if (target < 0 || target >= newStages.length) return;
    [newStages[index], newStages[target]] = [newStages[target], newStages[index]];
    setStages(newStages);
  };

  const saveEmailSettings = async () => {
    setSavingEmail(true);
    try {
      await api.updateOrg(org.id, { settings: { ...(org.settings || {}), emailSettings: emailForm } });
      setSuccess('Email settings saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.message); }
    setSavingEmail(false);
  };

  const testEmail = async () => {
    if (!emailForm.fromEmail) { setError('Enter a From Email first'); return; }
    setTestingEmail(true);
    try {
      await api.testSmtp(emailForm.smtpHost, emailForm.smtpPort, emailForm.fromEmail, emailForm.apiKey, emailForm.provider, emailForm.apiKey);
      setSuccess('Test email sent! Check your inbox.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) { setError('Test failed: ' + e.message); }
    setTestingEmail(false);
  };

  if (loading) return <div style={{ color: '#706E6B', textAlign: 'center', marginTop: 60 }}>Loading...</div>;
  if (!org) return (
    <div style={{ textAlign: 'center', marginTop: 60 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
      <div style={{ color: '#9E9D9B', fontSize: 14 }}>No organisation found. Contact super admin.</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 720 }}>
      {showChangePwd && <ChangePasswordModal user={user} onClose={() => setShowChangePwd(false)} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: '#181818', fontSize: 24, fontWeight: 800, margin: 0 }}>Organisation Settings</h1>
        <button onClick={() => setShowChangePwd(true)} style={{ background: 'rgba(1,118,211,0.1)', border: '1px solid rgba(1,118,211,0.3)', borderRadius: 10, color: '#0176D3', fontWeight: 600, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>🔒 Change Password</button>
      </div>

      {success && <div style={{ marginBottom: 16, padding: '10px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, color: '#34d399', fontSize: 13 }}>{success}</div>}
      {error && <div style={{ marginBottom: 16, padding: '10px 16px', background: 'rgba(186,5,23,0.1)', border: '1px solid rgba(186,5,23,0.3)', borderRadius: 10, color: '#FE5C4C', fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Logo Upload — uses LogoManager which properly calls uploadOrgLogo API + updates LogoContext */}
        <LogoManager />

        <div style={glass}>
          <h3 style={{ color: '#181818', fontWeight: 700, fontSize: 15, margin: '0 0 16px' }}>Organisation Profile</h3>
          <FormRow cols={2}>
            <Field label="Organisation Name" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} required />
            <Field label="Company Website" value={form.domain} placeholder="e.g. talentnesthr.com"
              onChange={v => { const suggested = extractCompanyName(v); setForm(p => ({ ...p, domain: v, name: p.name || suggested })); }} />
            <Field label="Industry" value={form.industry} onChange={v => setForm(p => ({ ...p, industry: v }))}
              options={['Information Technology','Banking & Finance','Healthcare','Manufacturing','Retail & E-commerce','Education','Consulting','Real Estate','Logistics & Supply Chain','Media & Entertainment','Telecommunications','Automobile','Pharma & Biotech','Government & Public Sector','Other'].map(i => ({ value: i, label: i }))}
              placeholder="Select industry" />
            <Field label="Company Size" value={form.size} onChange={v => setForm(p => ({ ...p, size: v }))}
              options={['1-10','11-50','51-200','201-500','500+'].map(s => ({ value: s, label: s }))}
              placeholder="Select size" />
          </FormRow>
        </div>

        <div style={glass}>
          <h3 style={{ color: '#181818', fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>Pipeline Stages</h3>
          <p style={{ color: '#9E9D9B', fontSize: 12, marginBottom: 16 }}>Customise the hiring stages for your organisation. Order matters. Use arrows to reorder.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {stages.map((s, i) => (
              <div key={`${s}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(1,118,211,0.06)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, padding: '8px 12px' }}>
                <span style={{ color: '#C9C7C5', fontSize: 11, width: 20, textAlign: 'center' }}>{i + 1}</span>
                <span style={{ color: '#181818', fontSize: 12, fontWeight: 600, flex: 1 }}>{s.replace(/_/g, ' ')}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => moveStage(i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', color: i === 0 ? '#DDDBDA' : '#706E6B', cursor: i === 0 ? 'default' : 'pointer', fontSize: 12, padding: '2px 4px' }}>↑</button>
                  <button onClick={() => moveStage(i, 1)} disabled={i === stages.length - 1} style={{ background: 'none', border: 'none', color: i === stages.length - 1 ? '#DDDBDA' : '#706E6B', cursor: i === stages.length - 1 ? 'default' : 'pointer', fontSize: 12, padding: '2px 4px' }}>↓</button>
                  <button onClick={() => removeStage(s)} style={{ background: 'none', border: 'none', color: '#FE5C4C', cursor: 'pointer', fontSize: 12, padding: '2px 4px', lineHeight: 1 }}>✕</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <Field style={{ flex: 1 }} value={newStage} onChange={setNewStage} placeholder="Add custom stage…" />
            <button onClick={addStage} style={{ background: 'rgba(1,118,211,0.2)', border: '1px solid rgba(1,118,211,0.4)', borderRadius: 10, color: '#0176D3', fontWeight: 700, padding: '10px 16px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>+ Add</button>
          </div>
        </div>

        {/* Pipeline Templates */}
        <div style={glass}>
          <h3 style={{ color: '#181818', fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>📋 Pipeline Templates</h3>
          <p style={{ color: '#9E9D9B', fontSize: 12, marginBottom: 16 }}>Apply a preset or your saved templates to instantly update the pipeline stages above.</p>

          {/* Presets */}
          <div style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Presets</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {(templates.presets || []).map(t => (
              <button key={t.name} onClick={() => applyTemplate(t.name)} disabled={!!applyingTpl} style={{ background: applyingTpl === t.name ? '#0176D3' : 'rgba(1,118,211,0.07)', border: '1px solid rgba(1,118,211,0.25)', borderRadius: 8, color: applyingTpl === t.name ? '#fff' : '#0176D3', fontSize: 12, fontWeight: 600, padding: '6px 12px', cursor: 'pointer', transition: 'all 0.2s' }}>
                {applyingTpl === t.name ? '…' : t.name}
                <span style={{ marginLeft: 5, color: applyingTpl === t.name ? 'rgba(255,255,255,0.6)' : '#9E9D9B', fontSize: 10 }}>({t.stages.length} stages)</span>
              </button>
            ))}
          </div>

          {/* Saved custom templates */}
          {(templates.custom || []).length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Your Templates</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {templates.custom.map(t => (
                  <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, padding: '4px 4px 4px 12px' }}>
                    <span style={{ fontSize: 12, color: '#065f46', fontWeight: 600 }}>{t.name}</span>
                    <span style={{ fontSize: 10, color: '#9E9D9B', marginLeft: 2 }}>({t.stages.length})</span>
                    <button onClick={() => applyTemplate(t.name)} disabled={!!applyingTpl} style={{ background: '#10b981', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', cursor: 'pointer', marginLeft: 4 }}>
                      {applyingTpl === t.name ? '…' : 'Apply'}
                    </button>
                    <button onClick={() => deleteTemplate(t.name)} style={{ background: 'none', border: 'none', color: '#BA0517', fontSize: 13, cursor: 'pointer', padding: '2px 6px' }}>✕</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Save current as template */}
          <div style={{ borderTop: '1px solid #F3F2F2', paddingTop: 14 }}>
            <div style={{ fontSize: 12, color: '#706E6B', marginBottom: 8 }}>Save the current pipeline stages as a reusable template:</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newTplName} onChange={e => setNewTplName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveAsTemplate()} placeholder="Template name…" style={{ flex: 1, padding: '8px 12px', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, fontSize: 13, outline: 'none' }} />
              <button onClick={saveAsTemplate} disabled={savingTpl || !newTplName.trim()} style={{ background: 'rgba(1,118,211,0.1)', border: '1px solid rgba(1,118,211,0.3)', borderRadius: 8, color: '#0176D3', fontWeight: 700, fontSize: 12, padding: '8px 16px', cursor: 'pointer', opacity: savingTpl || !newTplName.trim() ? 0.5 : 1 }}>
                {savingTpl ? '…' : '💾 Save'}
              </button>
            </div>
          </div>
        </div>

        {/* Email Settings */}
        <div style={glass}>
          <h3 style={{ color: '#181818', fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>Email Settings</h3>
          <p style={{ color: '#9E9D9B', fontSize: 12, marginBottom: 16 }}>Configure how emails are sent from your organisation — application updates, interview invites, offers.</p>
          <FormRow cols={2}>
            <Field label="From Name" value={emailForm.fromName} onChange={v => setEmailForm(p => ({...p, fromName: v}))} placeholder="TalentNest HR" />
            <Field label="From Email" type="email" value={emailForm.fromEmail} onChange={v => setEmailForm(p => ({...p, fromEmail: v}))} placeholder="hr@yourcompany.com" />
            <Field label="Email Provider" value={emailForm.provider} onChange={v => setEmailForm(p => ({...p, provider: v}))}
              options={[{value:'resend',label:'Resend (recommended)'},{value:'smtp',label:'Custom SMTP'},{value:'gmail',label:'Gmail SMTP'},{value:'zoho',label:'Zoho Mail'},{value:'outlook',label:'Outlook / Office 365'}]} />
            <Field label="API Key / App Password" type="password" value={emailForm.apiKey} onChange={v => setEmailForm(p => ({...p, apiKey: v}))} placeholder="re_xxxxxxxx or app password" />
            {emailForm.provider !== 'resend' && <>
              <Field label="SMTP Host" value={emailForm.smtpHost} onChange={v => setEmailForm(p => ({...p, smtpHost: v}))} placeholder="smtp.yourprovider.com" />
              <Field label="SMTP Port" value={emailForm.smtpPort} onChange={v => setEmailForm(p => ({...p, smtpPort: v}))} placeholder="587" />
            </>}
          </FormRow>
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <button onClick={saveEmailSettings} disabled={savingEmail} style={{ background: 'rgba(1,118,211,0.1)', border: '1px solid rgba(1,118,211,0.3)', borderRadius: 10, color: '#0176D3', fontWeight: 700, fontSize: 13, padding: '10px 20px', cursor: savingEmail ? 'not-allowed' : 'pointer', opacity: savingEmail ? 0.6 : 1 }}>
              {savingEmail ? 'Saving…' : '💾 Save Email Settings'}
            </button>
            <button onClick={testEmail} disabled={testingEmail} style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, color: '#10b981', fontWeight: 700, fontSize: 13, padding: '10px 20px', cursor: testingEmail ? 'not-allowed' : 'pointer', opacity: testingEmail ? 0.6 : 1 }}>
              {testingEmail ? '⏳ Sending…' : '📧 Send Test Email'}
            </button>
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          style={{ background: '#0176D3', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 15, padding: '14px 28px', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
