import React, { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import ChangePasswordModal from '../../components/shared/ChangePasswordModal.jsx';
import LogoManager from '../../components/LogoManager.jsx';
import Field from '../../components/ui/Field.jsx';
import FormRow from '../../components/ui/FormRow.jsx';

// ── Live email preview builder ────────────────────────────────────────────────
// Mirrors the backend baseLayout() so what you see here = what is sent.
function buildEmailPreview(ef, orgName, type = 'invite') {
  const brand   = ef.brandColor  || '#032D60';
  const accent  = ef.accentColor || '#0176D3';
  const name    = ef.fromName    || orgName || 'Your Company';
  const website = ef.website     || 'https://yourcompany.com';
  const support = ef.supportEmail || ef.fromEmail || 'hr@yourcompany.com';
  const sub     = ef.headerSubtitle || 'PROFESSIONAL RECRUITMENT CLOUD';
  const footer  = ef.footerText  || '';

  const BODIES = {
    invite: `
      <h2 style="color:#032D60;font-size:20px;margin:0 0 16px;font-weight:800">Hi Sarah 👋</h2>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px">
        <strong>Alex Johnson</strong> has invited you to join <strong>${name}</strong> as <strong>Recruiter</strong>.<br>
        Click the button below to set your password and access your account.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="#" style="display:inline-block;background:linear-gradient(135deg,${accent},${brand});color:#fff;text-decoration:none;padding:15px 40px;border-radius:50px;font-size:15px;font-weight:700;box-shadow:0 4px 14px rgba(0,0,0,0.2)">
          Set My Password &amp; Join →
        </a>
      </div>
      <p style="color:#ef4444;font-size:12px;text-align:center;font-weight:600;margin:0">⏰ This link expires in 7 days.</p>`,

    candidate: `
      <h2 style="color:#032D60;font-size:20px;margin:0 0 18px;font-weight:800">Hi Rahul 👋</h2>
      <p style="color:#374151;font-size:14px;margin:0 0 18px"><strong>Sarah</strong> from <strong>${name}</strong> has personally selected you for an exciting opportunity.</p>
      <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:28px">
        <div style="background:${accent};padding:20px 24px">
          <div style="color:#fff;font-size:20px;font-weight:800;margin-bottom:4px">Senior React Developer</div>
          <div style="color:rgba(255,255,255,0.8);font-size:13px">${name}</div>
        </div>
        <div style="padding:22px 24px;background:#f8fafc">
          <div style="color:#374151;font-size:13px">📍 Hyderabad &nbsp; ⏱ Full-Time</div>
        </div>
      </div>
      <div style="text-align:center">
        <a href="#" style="display:inline-block;background:linear-gradient(135deg,${accent},${brand});color:#fff;text-decoration:none;padding:15px 40px;border-radius:50px;font-size:15px;font-weight:700">
          ✅ View Job &amp; Respond
        </a>
      </div>`,

    offer: `
      <h2 style="color:#032D60;font-size:20px;margin:0 0 16px;font-weight:800">Congratulations, Rahul! 🎉</h2>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px">
        We're delighted to extend an offer for the position of <strong>Senior React Developer</strong> at <strong>${name}</strong>.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px 24px;margin:0 0 24px">
        <div style="color:#065f46;font-size:13px;font-weight:700;margin-bottom:8px">Offer Details</div>
        <div style="color:#374151;font-size:13px;line-height:2">
          💼 Role: Senior React Developer<br>
          💰 CTC: ₹18 LPA<br>
          📅 Start: 1st July 2025<br>
          📍 Location: Hyderabad
        </div>
      </div>
      <div style="text-align:center">
        <a href="#" style="display:inline-block;background:linear-gradient(135deg,${accent},${brand});color:#fff;text-decoration:none;padding:15px 40px;border-radius:50px;font-size:15px;font-weight:700">
          📄 View &amp; Sign Offer Letter →
        </a>
      </div>`,

    interview: `
      <h2 style="color:#032D60;font-size:20px;margin:0 0 16px;font-weight:800">Interview Confirmed ✅</h2>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px">
        Your interview for <strong>Senior React Developer</strong> at <strong>${name}</strong> has been scheduled.
      </p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:20px 24px;margin:0 0 24px">
        <div style="color:#92400e;font-size:13px;font-weight:700;margin-bottom:8px">Interview Details</div>
        <div style="color:#374151;font-size:13px;line-height:2">
          📅 Date: Wednesday, 25 June 2025<br>
          ⏰ Time: 11:00 AM IST<br>
          📹 Format: Video Call<br>
          👤 Interviewer: Alex Johnson
        </div>
      </div>
      <div style="text-align:center">
        <a href="#" style="display:inline-block;background:linear-gradient(135deg,${accent},${brand});color:#fff;text-decoration:none;padding:15px 40px;border-radius:50px;font-size:15px;font-weight:700">
          🔗 Join Interview →
        </a>
      </div>`,
  };

  const body = BODIES[type] || BODIES.invite;

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:16px;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10)">
  <div style="background:linear-gradient(135deg,${brand} 0%,${accent} 100%);padding:28px 36px;text-align:center">
    <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px">${name}</div>
    <div style="color:rgba(255,255,255,0.65);font-size:10px;margin-top:4px;letter-spacing:1.5px">${sub}</div>
  </div>
  <div style="padding:32px 36px">${body}</div>
  <div style="background:#f8fafc;padding:18px 36px;border-top:1px solid #e2e8f0;text-align:center">
    <p style="color:#9ca3af;font-size:11px;line-height:1.6;margin:0">
      ${footer || `You are receiving this email as part of your ${name} account activity.`}<br>
      <a href="${website}" style="color:${accent}">${website.replace(/^https?:\/\//, '')}</a>
      ${support ? ` · <a href="mailto:${support}" style="color:${accent}">${support}</a>` : ''}
    </p>
  </div>
</div>
</body></html>`;
}

const glass = { background: '#FFFFFF', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 16, padding: 24 };

function extractCompanyName(url) {
  try {
    const domain = url.replace(/https?:\/\//i, '').replace(/www\./i, '').split('/')[0].split('.')[0];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch { return ''; }
}

export default function OrgSettings({ user }) {
  const isCollege = user?.tenantType === 'college';
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', domain: '', industry: '', size: '' });
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [stages, setStages] = useState([]);
  const [newStage, setNewStage] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  // Team members for org chart
  const [teamMembers, setTeamMembers] = useState([]);
  const [emailForm, setEmailForm] = useState({
    fromName: '', fromEmail: '', provider: 'resend', apiKey: '',
    smtpHost: '', smtpPort: '587',
    // Branding
    brandColor: '#032D60', accentColor: '#0176D3',
    supportEmail: '', website: '',
    headerSubtitle: 'PROFESSIONAL RECRUITMENT CLOUD',
    footerText: '',
    // Sending domain
    sendingDomain: '',
  });
  const [savingEmail, setSavingEmail] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [previewType, setPreviewType] = useState('invite'); // invite | candidate | offer | interview

  // Pipeline Templates
  const [templates, setTemplates]       = useState({ presets: [], custom: [] });
  const [newTplName, setNewTplName]     = useState('');
  const [savingTpl, setSavingTpl]       = useState(false);
  const [applyingTpl, setApplyingTpl]   = useState('');

  // Employer Brand
  const [brandForm, setBrandForm] = useState({ tagline: '', about: '', culture: '', mission: '', website: '', linkedIn: '', twitter: '', instagram: '', bannerImageUrl: '', perks: [], testimonials: [], techStack: [], accentColor: '#0176D3' });
  const [savingBrand, setSavingBrand] = useState(false);

  // College Profile (departments + about)
  const [departments, setDepartments] = useState([]);
  const [newDeptName, setNewDeptName] = useState('');
  const [savingDept, setSavingDept] = useState(false);

  // College: Placement Officer invites
  const [officerForm, setOfficerForm] = useState({ name: '', email: '' });
  const [invitingOfficer, setInvitingOfficer] = useState(false);
  const [officerMsg, setOfficerMsg] = useState('');

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
        if (o.settings?.emailSettings) setEmailForm(prev => ({
          ...prev,
          ...o.settings.emailSettings,
          // Pre-fill branding defaults from org if not set
          fromName: o.settings.emailSettings.fromName || o.name || '',
          supportEmail: o.settings.emailSettings.supportEmail || '',
          website: o.settings.emailSettings.website || o.website || o.domain || '',
        }));
      }
      // Load pipeline templates
      try {
        const tr = await api.getPipelineTemplates();
        if (tr?.data) setTemplates(tr.data);
      } catch {}
      // Load employer brand / college profile
      try {
        const cr = await api.getCustomizations();
        if (cr?.data?.employerBrand) setBrandForm(prev => ({ ...prev, ...cr.data.employerBrand }));
        if (cr?.data?.departments) setDepartments(cr.data.departments);
      } catch {}
      // Load team members for org chart (admins + recruiters in this org)
      try {
        const orgId = o.id || o._id;
        if (orgId) {
          const members = await api.getUsers({ orgId, limit: 10000000 });
          const list = Array.isArray(members?.data) ? members.data : (Array.isArray(members) ? members : []);
          setTeamMembers(list.filter(m => ['admin','super_admin','recruiter','hiring_manager','placement_officer'].includes(m.role)));
        }
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

  const saveBrand = async () => {
    setSavingBrand(true);
    try {
      await api.updateCustomizationsSingleton({ employerBrand: brandForm });
      setSuccess(isCollege ? 'College profile saved!' : 'Employer brand saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.message); }
    setSavingBrand(false);
  };

  const addDepartment = async () => {
    const name = newDeptName.trim();
    if (!name) return;
    setSavingDept(true);
    try {
      const r = await api.addCustomizationItem('departments', { name });
      setDepartments(prev => [...prev, r?.data || { name }]);
      setNewDeptName('');
    } catch (e) { setError(e.message); }
    setSavingDept(false);
  };

  const removeDepartment = async (id) => {
    if (!id) return;
    try {
      await api.deleteCustomizationItem('departments', id);
      setDepartments(prev => prev.filter(d => d._id !== id));
    } catch (e) { setError(e.message); }
  };

  const inviteOfficer = async () => {
    const name = officerForm.name.trim();
    const email = officerForm.email.trim();
    if (!name || !email) { setOfficerMsg('Name and email are required.'); return; }
    setInvitingOfficer(true);
    setOfficerMsg('');
    try {
      await api.createUser({ name, email, role: 'placement_officer' });
      setOfficerForm({ name: '', email: '' });
      setOfficerMsg(`✅ Invitation sent to ${email}`);
      load();
    } catch (e) { setOfficerMsg(`❌ ${e.message}`); }
    setInvitingOfficer(false);
  };

  const resendOfficerInvite = async (id) => {
    try {
      await api.resendUserInvite(id);
      setOfficerMsg('✅ Invitation resent.');
      setTimeout(() => setOfficerMsg(''), 3000);
    } catch (e) { setOfficerMsg(`❌ ${e.message}`); }
  };

  const removeOfficer = async (id) => {
    if (!window.confirm('Remove this placement officer?')) return;
    try {
      await api.deleteUser(id);
      load();
    } catch (e) { setOfficerMsg(`❌ ${e.message}`); }
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
      await api.testSmtp(emailForm.smtpHost, emailForm.smtpPort, emailForm.fromEmail, emailForm.apiKey, emailForm.provider, emailForm.apiKey, emailForm.fromName);
      setSuccess(`Test email sent from "${emailForm.fromName || 'TalentNest HR'}"! Check your inbox.`);
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

        {/* ── Org Chart ─────────────────────────────────────────────────────── */}
        {teamMembers.length > 0 && (() => {
          const admins    = teamMembers.filter(m => m.role === 'admin' || m.role === 'super_admin');
          const recruiters = teamMembers.filter(m => m.role === 'recruiter');
          const managers  = teamMembers.filter(m => m.role === 'hiring_manager');
          const officers  = teamMembers.filter(m => m.role === 'placement_officer');

          const ROLE_COLOR = { admin:'#0176D3', super_admin:'#7c3aed', recruiter:'#059669', hiring_manager:'#F59E0B', placement_officer:'#7C3AED' };
          const ROLE_LABEL = { admin:'Admin', super_admin:'Super Admin', recruiter:'Recruiter', hiring_manager:'Hiring Manager', placement_officer:'Placement Officer' };

          const MemberCard = ({ m }) => (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, minWidth:100 }}>
              <div style={{ width:48, height:48, borderRadius:'50%', background:`linear-gradient(135deg,${ROLE_COLOR[m.role]||'#0176D3'},${ROLE_COLOR[m.role]||'#0176D3'}99)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:18, boxShadow:`0 4px 12px ${ROLE_COLOR[m.role]||'#0176D3'}40`, border:`2px solid ${ROLE_COLOR[m.role]||'#0176D3'}` }}>
                {(m.name||'?')[0].toUpperCase()}
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:12, fontWeight:800, color:'#0A1628', maxWidth:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name||'—'}</div>
                <div style={{ fontSize:9, fontWeight:700, color:ROLE_COLOR[m.role]||'#0176D3', textTransform:'uppercase', letterSpacing:0.5, marginTop:1 }}>{ROLE_LABEL[m.role]||m.role}</div>
                <div style={{ fontSize:10, color:'#94A3B8', marginTop:1, maxWidth:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.email}</div>
                <div style={{ marginTop:4 }}>
                  <span style={{ fontSize:9, padding:'2px 7px', borderRadius:20, background: m.isActive ? 'rgba(5,150,105,0.1)' : 'rgba(186,5,23,0.1)', color: m.isActive ? '#059669' : '#BA0517', fontWeight:700 }}>
                    {m.isActive ? '● Active' : '○ Pending'}
                  </span>
                </div>
                {isCollege && m.role === 'placement_officer' && (
                  <div style={{ display:'flex', gap:4, marginTop:6, justifyContent:'center' }}>
                    {!m.isActive && (
                      <button onClick={() => resendOfficerInvite(m.id||m._id)} title="Resend invite" style={{ fontSize:9, padding:'3px 7px', borderRadius:6, border:'1px solid rgba(124,58,237,0.3)', background:'rgba(124,58,237,0.06)', color:'#7C3AED', cursor:'pointer', fontWeight:700 }}>📧 Resend</button>
                    )}
                    <button onClick={() => removeOfficer(m.id||m._id)} title="Remove" style={{ fontSize:9, padding:'3px 7px', borderRadius:6, border:'1px solid rgba(220,38,38,0.25)', background:'rgba(220,38,38,0.05)', color:'#DC2626', cursor:'pointer', fontWeight:700 }}>✕ Remove</button>
                  </div>
                )}
              </div>
            </div>
          );

          return (
            <div style={glass}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <div>
                  <h3 style={{ color:'#181818', fontWeight:700, fontSize:15, margin:'0 0 2px' }}>🏢 Organisation Chart</h3>
                  <p style={{ color:'#9E9D9B', fontSize:12, margin:0 }}>{org?.name} · {teamMembers.length} team member{teamMembers.length!==1?'s':''}</p>
                </div>
                <span style={{ fontSize:11, color:'#64748B', background:'#F1F5F9', padding:'4px 10px', borderRadius:20, fontWeight:600 }}>
                  {isCollege
                    ? `${admins.length} Admin${admins.length!==1?'s':''} · ${officers.length} Officer${officers.length!==1?'s':''}`
                    : `${admins.length} Admin${admins.length!==1?'s':''} · ${recruiters.length} Recruiter${recruiters.length!==1?'s':''}`}
                </span>
              </div>

              {/* Org top: Admins */}
              {admins.length > 0 && (
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontSize:10, fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:1, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%', background:'#0176D3' }} />
                    Admin{admins.length!==1?'s':''}
                  </div>
                  <div style={{ display:'flex', gap:24, flexWrap:'wrap', paddingLeft:8 }}>
                    {admins.map(m => <MemberCard key={m.id||m._id} m={m} />)}
                  </div>
                </div>
              )}

              {/* Connector line */}
              {admins.length > 0 && recruiters.length > 0 && (
                <div style={{ borderLeft:'2px dashed #E2E8F0', marginLeft:32, height:24, marginBottom:0 }} />
              )}

              {/* Recruiters */}
              {recruiters.length > 0 && (
                <div style={{ marginBottom: managers.length ? 24 : 0 }}>
                  <div style={{ fontSize:10, fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:1, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%', background:'#059669' }} />
                    Recruiter{recruiters.length!==1?'s':''}
                  </div>
                  <div style={{ display:'flex', gap:24, flexWrap:'wrap', paddingLeft:8 }}>
                    {recruiters.map(m => <MemberCard key={m.id||m._id} m={m} />)}
                  </div>
                </div>
              )}

              {/* Hiring Managers */}
              {managers.length > 0 && (
                <div style={{ marginBottom: officers.length ? 24 : 0 }}>
                  <div style={{ fontSize:10, fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:1, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%', background:'#F59E0B' }} />
                    Hiring Manager{managers.length!==1?'s':''}
                  </div>
                  <div style={{ display:'flex', gap:24, flexWrap:'wrap', paddingLeft:8 }}>
                    {managers.map(m => <MemberCard key={m.id||m._id} m={m} />)}
                  </div>
                </div>
              )}

              {/* Placement Officers */}
              {officers.length > 0 && (
                <div>
                  <div style={{ fontSize:10, fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:1, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%', background:'#7C3AED' }} />
                    Placement Officer{officers.length!==1?'s':''}
                  </div>
                  <div style={{ display:'flex', gap:24, flexWrap:'wrap', paddingLeft:8 }}>
                    {officers.map(m => <MemberCard key={m.id||m._id} m={m} />)}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* College: Invite Placement Officers (multi-officer accounts) */}
        {isCollege && (
          <div style={{ ...glass, border: '1px solid rgba(124,58,237,0.18)' }}>
            <h3 style={{ color: '#181818', fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>🎓 Placement Officers</h3>
            <p style={{ color: '#9E9D9B', fontSize: 12, marginBottom: 16 }}>Invite colleagues to manage placements alongside you. They'll get an email to set their password.</p>
            {officerMsg && (
              <div style={{ marginBottom: 12, padding: '8px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, background: officerMsg.startsWith('❌') ? 'rgba(220,38,38,0.08)' : 'rgba(124,58,237,0.08)', color: officerMsg.startsWith('❌') ? '#DC2626' : '#7C3AED' }}>
                {officerMsg}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <Field style={{ flex: '1 1 180px' }} label="Name" value={officerForm.name} onChange={v => setOfficerForm(p => ({ ...p, name: v }))} placeholder="Officer's full name" />
              <Field style={{ flex: '1 1 220px' }} label="Email" value={officerForm.email} onChange={v => setOfficerForm(p => ({ ...p, email: v }))} placeholder="officer@college.edu" />
              <button onClick={inviteOfficer} disabled={invitingOfficer}
                style={{ background: 'linear-gradient(135deg, #7C3AED, #4C1D95)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, padding: '11px 20px', cursor: invitingOfficer ? 'default' : 'pointer', whiteSpace: 'nowrap', opacity: invitingOfficer ? 0.7 : 1, fontSize: 13 }}>
                {invitingOfficer ? 'Inviting…' : '+ Invite Officer'}
              </button>
            </div>
          </div>
        )}

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
              options={['1-10','11-50','51-200','201-500','501-1000','1000+'].map(s => ({ value: s, label: s }))}
              placeholder="Select size" />
          </FormRow>
        </div>

        {!isCollege && <div style={glass}>
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
        </div>}

        {/* Pipeline Templates */}
        {!isCollege && <div style={glass}>
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
        </div>}

        {/* Email Settings — fully editable + live preview */}
        <div style={glass}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h3 style={{ color: '#181818', fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>📧 Email Settings</h3>
              <p style={{ color: '#9E9D9B', fontSize: 12, margin: 0 }}>
                Configure sending credentials, branding and preview how every email looks before it goes out.
              </p>
            </div>
            <button
              onClick={() => setShowEmailPreview(p => !p)}
              style={{ background: showEmailPreview ? '#0176D3' : 'rgba(1,118,211,0.08)', border: '1px solid rgba(1,118,211,0.3)', borderRadius: 10, color: showEmailPreview ? '#fff' : '#0176D3', fontWeight: 700, fontSize: 12, padding: '8px 16px', cursor: 'pointer', flexShrink: 0 }}
            >
              {showEmailPreview ? '✕ Close Preview' : '👁 Preview Email'}
            </button>
          </div>

          <div style={{ display: showEmailPreview ? 'grid' : 'block', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* ── Left: Form ── */}
            <div>
              {/* Section: Sending */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>📤 Sending</div>
                <FormRow cols={2}>
                  <Field label="From Name" value={emailForm.fromName} onChange={v => setEmailForm(p => ({...p, fromName: v}))} placeholder={form.name || 'Acme Corp HR'} />
                  <Field label="From Email" type="email" value={emailForm.fromEmail} onChange={v => setEmailForm(p => ({...p, fromEmail: v}))} placeholder="hr@yourcompany.com" />
                  <Field label="Email Provider" value={emailForm.provider} onChange={v => setEmailForm(p => ({...p, provider: v}))}
                    options={[
                      {value:'resend',  label:'Resend (recommended)'},
                      {value:'smtp',    label:'Custom SMTP'},
                      {value:'gmail',   label:'Gmail SMTP'},
                      {value:'zoho',    label:'Zoho Mail'},
                      {value:'outlook', label:'Outlook / Office 365'},
                    ]} />
                  <Field label="API Key / App Password" type="password" value={emailForm.apiKey} onChange={v => setEmailForm(p => ({...p, apiKey: v}))} placeholder={emailForm.provider === 'resend' ? 're_xxxxxxxxxxxxxxxx' : 'App password'} />
                  {emailForm.provider !== 'resend' && <>
                    <Field label="SMTP Host" value={emailForm.smtpHost} onChange={v => setEmailForm(p => ({...p, smtpHost: v}))} placeholder="smtp.yourprovider.com" />
                    <Field label="SMTP Port" value={emailForm.smtpPort} onChange={v => setEmailForm(p => ({...p, smtpPort: v}))} placeholder="587" />
                  </>}
                  {emailForm.provider === 'resend' && (
                    <Field
                      label="Sending Domain (optional)"
                      value={emailForm.sendingDomain}
                      onChange={v => setEmailForm(p => ({...p, sendingDomain: v}))}
                      placeholder="mail.yourcompany.com"
                      hint="Verify your domain in Resend dashboard then enter it here for full white-label delivery."
                    />
                  )}
                </FormRow>
              </div>

              {/* Section: Branding */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>🎨 Email Branding</div>
                <FormRow cols={2}>
                  <Field label="Support Email (in footer)" type="email" value={emailForm.supportEmail} onChange={v => setEmailForm(p => ({...p, supportEmail: v}))} placeholder={emailForm.fromEmail || 'support@yourcompany.com'} />
                  <Field label="Website (in footer)" value={emailForm.website} onChange={v => setEmailForm(p => ({...p, website: v}))} placeholder="https://yourcompany.com" />
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Header Background Color</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="color" value={emailForm.brandColor || '#032D60'} onChange={e => setEmailForm(p => ({...p, brandColor: e.target.value}))} style={{ width: 44, height: 36, borderRadius: 8, border: '1.5px solid #E2E8F0', padding: 2, cursor: 'pointer' }} />
                      <input value={emailForm.brandColor || '#032D60'} onChange={e => setEmailForm(p => ({...p, brandColor: e.target.value}))} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none', fontFamily: 'monospace' }} placeholder="#032D60" />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Button / Accent Color</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="color" value={emailForm.accentColor || '#0176D3'} onChange={e => setEmailForm(p => ({...p, accentColor: e.target.value}))} style={{ width: 44, height: 36, borderRadius: 8, border: '1.5px solid #E2E8F0', padding: 2, cursor: 'pointer' }} />
                      <input value={emailForm.accentColor || '#0176D3'} onChange={e => setEmailForm(p => ({...p, accentColor: e.target.value}))} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none', fontFamily: 'monospace' }} placeholder="#0176D3" />
                    </div>
                  </div>
                  <Field label="Header Subtitle (under company name)" value={emailForm.headerSubtitle} onChange={v => setEmailForm(p => ({...p, headerSubtitle: v}))} placeholder="PROFESSIONAL RECRUITMENT CLOUD" />
                  <Field label="Custom Footer Text (optional)" value={emailForm.footerText} onChange={v => setEmailForm(p => ({...p, footerText: v}))} placeholder="© 2025 Acme Corp. All rights reserved." />
                </FormRow>
              </div>
            </div>

            {/* ── Right: Live Preview ── */}
            {showEmailPreview && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  👁 Live Preview
                  {['invite','candidate','offer','interview'].map(t => (
                    <button key={t} onClick={() => setPreviewType(t)}
                      style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, border: `1px solid ${previewType === t ? '#0176D3' : '#E2E8F0'}`, background: previewType === t ? '#0176D3' : '#fff', color: previewType === t ? '#fff' : '#64748B', cursor: 'pointer', fontWeight: 700, textTransform: 'capitalize' }}>
                      {t}
                    </button>
                  ))}
                </div>
                <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', background: '#f4f6f8' }}>
                  <iframe
                    srcDoc={buildEmailPreview(emailForm, form.name || 'Your Company', previewType)}
                    style={{ width: '100%', height: 520, border: 'none', display: 'block' }}
                    title="Email Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
                <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(1,118,211,0.05)', borderRadius: 8, border: '1px solid rgba(1,118,211,0.15)' }}>
                  <div style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>From: <span style={{ color: '#0176D3' }}>{emailForm.fromName || form.name || 'Your Company'} &lt;{emailForm.fromEmail || 'hr@yourcompany.com'}&gt;</span></div>
                  <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, marginTop: 2 }}>Subject: <span style={{ color: '#181818', fontWeight: 400 }}>{previewType === 'invite' ? `You've been invited to ${emailForm.fromName || form.name || 'Your Company'}` : previewType === 'offer' ? `Offer Letter — Senior Developer | ${emailForm.fromName || form.name}` : previewType === 'interview' ? `Interview Scheduled — ${emailForm.fromName || form.name}` : `Exclusive Invite: Senior Developer — We think you're a great fit`}</span></div>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={saveEmailSettings} disabled={savingEmail} style={{ background: 'linear-gradient(135deg,#0176D3,#014486)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, padding: '10px 20px', cursor: savingEmail ? 'not-allowed' : 'pointer', opacity: savingEmail ? 0.6 : 1 }}>
              {savingEmail ? '⏳ Saving…' : '💾 Save Email Settings'}
            </button>
            <button onClick={testEmail} disabled={testingEmail || !emailForm.fromEmail} style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, color: '#10b981', fontWeight: 700, fontSize: 13, padding: '10px 20px', cursor: (testingEmail || !emailForm.fromEmail) ? 'not-allowed' : 'pointer', opacity: (testingEmail || !emailForm.fromEmail) ? 0.6 : 1 }} title={!emailForm.fromEmail ? 'Enter From Email first' : ''}>
              {testingEmail ? '⏳ Sending…' : '📧 Send Test Email to ' + (emailForm.fromEmail || '—')}
            </button>
          </div>

          {emailForm.provider === 'resend' && !emailForm.apiKey && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, fontSize: 12, color: '#A07E00' }}>
              ⚠️ No API key set — emails will send via TalentNest's shared Resend account. Add your own key to send from your domain and see your company name on all emails.
            </div>
          )}
        </div>

        <button
          onClick={save}
          disabled={saving}
          style={{ background: '#0176D3', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 15, padding: '14px 28px', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>

        {/* ── EMPLOYER BRAND SECTION ──────────────────────────────────────── */}
        {!isCollege && <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '24px 28px', marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#111827' }}>🏢 Employer Brand Page</h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>Shown on your public careers page to attract top talent.</p>
            </div>
            <button onClick={saveBrand} disabled={savingBrand} style={{ background: '#7C3AED', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, padding: '9px 20px', cursor: 'pointer', opacity: savingBrand ? 0.7 : 1 }}>
              {savingBrand ? 'Saving…' : 'Save Brand'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Tagline</label>
              <input value={brandForm.tagline} onChange={e => setBrandForm(p => ({ ...p, tagline: e.target.value }))} placeholder="We build the future together" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' }} />
            </div>
            <div>
              <label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Accent Color</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={brandForm.accentColor} onChange={e => setBrandForm(p => ({ ...p, accentColor: e.target.value }))} style={{ width: 40, height: 34, borderRadius: 8, border: '1px solid #E2E8F0', cursor: 'pointer', padding: 2 }} />
                <input value={brandForm.accentColor} onChange={e => setBrandForm(p => ({ ...p, accentColor: e.target.value }))} style={{ flex: 1, padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' }} />
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>About Us</label>
              <textarea value={brandForm.about} onChange={e => setBrandForm(p => ({ ...p, about: e.target.value }))} rows={3} placeholder="Brief description of your company…" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Culture</label>
              <textarea value={brandForm.culture} onChange={e => setBrandForm(p => ({ ...p, culture: e.target.value }))} rows={2} placeholder="How do you work? Remote/hybrid? Values?" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical' }} />
            </div>
            <div><label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Website</label><input value={brandForm.website} onChange={e => setBrandForm(p => ({ ...p, website: e.target.value }))} placeholder="https://yourcompany.com" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' }} /></div>
            <div><label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>LinkedIn</label><input value={brandForm.linkedIn} onChange={e => setBrandForm(p => ({ ...p, linkedIn: e.target.value }))} placeholder="https://linkedin.com/company/..." style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' }} /></div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Banner Image URL (optional)</label>
              <input value={brandForm.bannerImageUrl} onChange={e => setBrandForm(p => ({ ...p, bannerImageUrl: e.target.value }))} placeholder="https://cdn.yoursite.com/banner.jpg" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' }} />
            </div>
          </div>

          {/* Perks */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label style={{ color: '#374151', fontSize: 12, fontWeight: 700 }}>Perks & Benefits</label>
              <button onClick={() => setBrandForm(p => ({ ...p, perks: [...p.perks, { title: '', description: '' }] }))} style={{ background: 'rgba(124,58,237,0.08)', border: '1px dashed #7C3AED', borderRadius: 8, color: '#7C3AED', fontSize: 11, padding: '4px 12px', cursor: 'pointer', fontWeight: 600 }}>+ Add Perk</button>
            </div>
            {brandForm.perks.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input value={p.title} onChange={e => setBrandForm(prev => ({ ...prev, perks: prev.perks.map((x, j) => j === i ? { ...x, title: e.target.value } : x) }))} placeholder="Perk title" style={{ flex: 1, padding: '7px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, outline: 'none' }} />
                <input value={p.description} onChange={e => setBrandForm(prev => ({ ...prev, perks: prev.perks.map((x, j) => j === i ? { ...x, description: e.target.value } : x) }))} placeholder="Description" style={{ flex: 2, padding: '7px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, outline: 'none' }} />
                <button onClick={() => setBrandForm(prev => ({ ...prev, perks: prev.perks.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 16, cursor: 'pointer' }}>✕</button>
              </div>
            ))}
          </div>
        </div>}

        {/* ── COLLEGE PROFILE SECTION ─────────────────────────────────────── */}
        {isCollege && <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '24px 28px', marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#111827' }}>🎓 College Profile</h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>Tell students and recruiters about your college — shown across the platform.</p>
            </div>
            <button onClick={saveBrand} disabled={savingBrand} style={{ background: '#7C3AED', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, padding: '9px 20px', cursor: 'pointer', opacity: savingBrand ? 0.7 : 1 }}>
              {savingBrand ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Tagline</label>
              <input value={brandForm.tagline} onChange={e => setBrandForm(p => ({ ...p, tagline: e.target.value }))} placeholder="Shaping tomorrow's leaders" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' }} />
            </div>
            <div>
              <label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Accent Color</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={brandForm.accentColor} onChange={e => setBrandForm(p => ({ ...p, accentColor: e.target.value }))} style={{ width: 40, height: 34, borderRadius: 8, border: '1px solid #E2E8F0', cursor: 'pointer', padding: 2 }} />
                <input value={brandForm.accentColor} onChange={e => setBrandForm(p => ({ ...p, accentColor: e.target.value }))} style={{ flex: 1, padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' }} />
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>About the College</label>
              <textarea value={brandForm.about} onChange={e => setBrandForm(p => ({ ...p, about: e.target.value }))} rows={3} placeholder="Brief description of your college, history, accreditation…" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Campus Life & Culture</label>
              <textarea value={brandForm.culture} onChange={e => setBrandForm(p => ({ ...p, culture: e.target.value }))} rows={2} placeholder="Clubs, events, hostel life, placements support…" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical' }} />
            </div>
            <div><label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Website</label><input value={brandForm.website} onChange={e => setBrandForm(p => ({ ...p, website: e.target.value }))} placeholder="https://yourcollege.edu" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' }} /></div>
            <div><label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>LinkedIn</label><input value={brandForm.linkedIn} onChange={e => setBrandForm(p => ({ ...p, linkedIn: e.target.value }))} placeholder="https://linkedin.com/school/..." style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' }} /></div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Banner Image URL (optional)</label>
              <input value={brandForm.bannerImageUrl} onChange={e => setBrandForm(p => ({ ...p, bannerImageUrl: e.target.value }))} placeholder="https://cdn.yoursite.com/campus-banner.jpg" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' }} />
            </div>
          </div>

          {/* Departments */}
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label style={{ color: '#374151', fontSize: 12, fontWeight: 700 }}>Departments / Branches</label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                value={newDeptName}
                onChange={e => setNewDeptName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addDepartment(); }}
                placeholder="e.g. Computer Science & Engineering"
                style={{ flex: 1, padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' }}
              />
              <button onClick={addDepartment} disabled={savingDept || !newDeptName.trim()} style={{ background: '#0176D3', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, padding: '9px 18px', cursor: 'pointer', opacity: (savingDept || !newDeptName.trim()) ? 0.6 : 1 }}>
                {savingDept ? 'Adding…' : '+ Add'}
              </button>
            </div>
            {departments.length === 0 ? (
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>No departments added yet.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {departments.map(d => (
                  <div key={d._id || d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 20, padding: '6px 8px 6px 14px', fontSize: 12, fontWeight: 600, color: '#374151' }}>
                    {d.name}
                    <button onClick={() => removeDepartment(d._id)} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 14, cursor: 'pointer', lineHeight: 1, padding: '2px 4px' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>}
      </div>

      {/* ── JOB WIDGET EMBED ────────────────────────────────────────────── */}
      {!isCollege && org?.slug && (() => {
        const SITE = (typeof window !== 'undefined' ? window.location.origin : 'https://www.talentnesthr.com');
        const careerUrl = `${SITE}/careers/${org.slug}`;
        const iframeSnippet = `<iframe\n  src="${careerUrl}?embed=1"\n  width="100%"\n  height="700"\n  frameborder="0"\n  title="${org.name || 'Open Positions'} — Careers"\n  style="border:none;border-radius:12px;"\n  allow="geolocation"\n></iframe>`;
        const copyToClipboard = (text) => { navigator.clipboard?.writeText(text).catch(() => {}); };
        return (
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 24, marginTop: 24 }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800 }}>🔗 Job Widget Embed</h2>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6B7280' }}>Embed your live job listings on your company website. It updates automatically when you add or close jobs.</p>
            <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '14px 16px', marginBottom: 12, border: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Career Page URL</span>
                <button onClick={() => copyToClipboard(careerUrl)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: '#EFF6FF', color: '#1D4ED8', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Copy</button>
              </div>
              <code style={{ fontSize: 12, color: '#1D4ED8', wordBreak: 'break-all' }}>{careerUrl}</code>
            </div>
            <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '14px 16px', border: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>HTML Embed Code (iframe)</span>
                <button onClick={() => copyToClipboard(iframeSnippet)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: '#EFF6FF', color: '#1D4ED8', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Copy Code</button>
              </div>
              <pre style={{ fontSize: 11, color: '#374151', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.6 }}>{iframeSnippet}</pre>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
