import React, { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import SecuritySettings from '../../components/shared/SecuritySettings.jsx';

const fieldStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 14px', borderRadius: 8,
  border: '1.5px solid #E2E8F0', fontSize: 14,
  fontFamily: 'inherit', outline: 'none',
  background: 'white', transition: 'border-color 0.15s',
};

const labelStyle = {
  display: 'block', fontWeight: 600,
  color: '#374151', fontSize: 13, marginBottom: 6,
};

export default function ProfilePage({ user, onUserUpdate }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    title: user?.title || '',
    location: user?.location || '',
    summary: user?.summary || '',
    linkedinUrl: user?.linkedinUrl || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const sf = (k, v) => setForm(p => ({...p, [k]: v}));

  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSaved, setPwdSaved] = useState(false);
  const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false });

  useEffect(() => {
    api.getProfile().then(u => {
      if (!u) return;
      setForm(f => ({
        ...f,
        name:        u.name        || f.name,
        email:       u.email       || f.email,
        phone:       u.phone       || f.phone,
        title:       u.title       || f.title,
        location:    u.location    || f.location,
        summary:     u.summary     || f.summary,
        linkedinUrl: u.linkedinUrl || f.linkedinUrl,
      }));
    }).catch(() => {});
  }, []);

  const pwdChecks = { length: pwdForm.next.length >= 8, upper: /[A-Z]/.test(pwdForm.next), number: /[0-9]/.test(pwdForm.next) };
  const pwdScore  = Object.values(pwdChecks).filter(Boolean).length;
  const pwdColors = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];
  const pwdLabels = ['Weak', 'Fair', 'Good', 'Strong'];

  const changePwd = async () => {
    setPwdError(''); setPwdSaved(false);
    if (!pwdForm.current || !pwdForm.next || !pwdForm.confirm) { setPwdError('All fields are required'); return; }
    if (pwdForm.next !== pwdForm.confirm) { setPwdError('Passwords do not match'); return; }
    if (!pwdChecks.length) { setPwdError('Password must be at least 8 characters'); return; }
    if (!pwdChecks.upper)  { setPwdError('Must contain at least one uppercase letter'); return; }
    if (!pwdChecks.number) { setPwdError('Must contain at least one number'); return; }
    setPwdSaving(true);
    try {
      await api.changePassword(pwdForm.current, pwdForm.next);
      setPwdSaved(true);
      setPwdForm({ current: '', next: '', confirm: '' });
      setTimeout(() => setPwdSaved(false), 4000);
    } catch(e) { setPwdError(e.message || 'Failed to update password'); }
    setPwdSaving(false);
  };

  const save = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      const updated = await api.updateProfile(form);
      if (onUserUpdate) onUserUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch(e) {
      setError(e.message || 'Failed to save');
    }
    setSaving(false);
  };

  return (
    <div style={{maxWidth: 720, margin: '0 auto'}}>
      <PageHeader title="My Profile" subtitle="Manage your personal information and account settings" />

      <div style={{background:'white',borderRadius:12,padding:24,marginBottom:20,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',display:'flex',alignItems:'center',gap:20}}>
        <div style={{width:72,height:72,borderRadius:'50%',background:'linear-gradient(135deg,#0176D3,#00C2CB)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:800,fontSize:28,flexShrink:0}}>
          {(user?.name||'U').charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{fontWeight:700,fontSize:18,color:'#0A1628'}}>{user?.name||'User'}</div>
          <div style={{color:'#64748B',fontSize:13,marginTop:2}}>{user?.email}</div>
          <div style={{display:'inline-block',marginTop:6,background:'#0176D315',color:'#0176D3',fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:100,textTransform:'uppercase',letterSpacing:'0.06em'}}>
            {(user?.role||'user').replace('_',' ')}
          </div>
        </div>
      </div>

      <div style={{background:'white',borderRadius:12,padding:28,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
        <h3 style={{fontWeight:700,color:'#0A1628',marginBottom:20,fontSize:15}}>Personal Information</h3>

        {error && <div style={{background:'#FFF5F5',border:'1px solid #FECACA',borderRadius:8,padding:'10px 14px',marginBottom:16,color:'#BA0517',fontSize:13}}>{error}</div>}
        {saved && <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:8,padding:'10px 14px',marginBottom:16,color:'#166534',fontSize:13}}>Profile saved successfully!</div>}

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
          <div>
            <label style={labelStyle}>Full Name</label>
            <input value={form.name} onChange={e=>sf('name',e.target.value)} style={fieldStyle} placeholder="Your full name" autoComplete="off"
              onFocus={e=>e.target.style.borderColor='#0176D3'} onBlur={e=>e.target.style.borderColor='#E2E8F0'} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input value={form.email} type="email" style={{...fieldStyle,background:'#F8FAFF',color:'#94A3B8'}} readOnly disabled />
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
          <div>
            <label style={labelStyle}>Phone</label>
            <input value={form.phone} onChange={e=>sf('phone',e.target.value)} style={fieldStyle} placeholder="+91 98765 43210" autoComplete="off"
              onFocus={e=>e.target.style.borderColor='#0176D3'} onBlur={e=>e.target.style.borderColor='#E2E8F0'} />
          </div>
          <div>
            <label style={labelStyle}>Job Title</label>
            <input value={form.title} onChange={e=>sf('title',e.target.value)} style={fieldStyle} placeholder="e.g. Senior Recruiter" autoComplete="off"
              onFocus={e=>e.target.style.borderColor='#0176D3'} onBlur={e=>e.target.style.borderColor='#E2E8F0'} />
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
          <div>
            <label style={labelStyle}>Location</label>
            <input value={form.location} onChange={e=>sf('location',e.target.value)} style={fieldStyle} placeholder="Hyderabad, India" autoComplete="off"
              onFocus={e=>e.target.style.borderColor='#0176D3'} onBlur={e=>e.target.style.borderColor='#E2E8F0'} />
          </div>
          <div>
            <label style={labelStyle}>LinkedIn URL</label>
            <input value={form.linkedinUrl} onChange={e=>sf('linkedinUrl',e.target.value)} style={fieldStyle} placeholder="https://linkedin.com/in/..." autoComplete="off"
              onFocus={e=>e.target.style.borderColor='#0176D3'} onBlur={e=>e.target.style.borderColor='#E2E8F0'} />
          </div>
        </div>

        <div style={{marginBottom:24}}>
          <label style={labelStyle}>Bio / Summary</label>
          <textarea value={form.summary} onChange={e=>sf('summary',e.target.value)} rows={3} style={{...fieldStyle,resize:'vertical'}} placeholder="Brief description about yourself..."
            onFocus={e=>e.target.style.borderColor='#0176D3'} onBlur={e=>e.target.style.borderColor='#E2E8F0'} />
        </div>

        <button onClick={save} disabled={saving} style={{background:'linear-gradient(135deg,#0176D3,#014486)',color:'white',border:'none',borderRadius:8,padding:'11px 28px',fontWeight:700,fontSize:14,cursor:saving?'not-allowed':'pointer',opacity:saving?0.7:1,display:'flex',alignItems:'center',gap:8,fontFamily:'inherit'}}>
          {saving ? <><Spinner /> Saving...</> : 'Save Changes'}
        </button>
      </div>

      {/* ── Change Password ─────────────────────────────────── */}
      <div style={{background:'white',borderRadius:12,padding:28,marginTop:20,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
        <h3 style={{fontWeight:700,color:'#0A1628',marginBottom:6,fontSize:15}}>Change Password</h3>
        <p style={{color:'#64748B',fontSize:13,marginBottom:20}}>Choose a strong password with at least 8 characters, one uppercase letter, and one number.</p>

        {pwdError && <div style={{background:'#FFF5F5',border:'1px solid #FECACA',borderRadius:8,padding:'10px 14px',marginBottom:16,color:'#BA0517',fontSize:13}}>{pwdError}</div>}
        {pwdSaved && <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:8,padding:'10px 14px',marginBottom:16,color:'#166534',fontSize:13}}>Password updated successfully!</div>}

        <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:20}}>
          {[{key:'current',label:'Current Password'},{key:'next',label:'New Password'},{key:'confirm',label:'Confirm New Password'}].map(({key,label}) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <div style={{position:'relative'}}>
                <input type={showPwd[key]?'text':'password'} value={pwdForm[key]}
                  onChange={e=>setPwdForm(p=>({...p,[key]:e.target.value}))}
                  style={{...fieldStyle,paddingRight:42}} placeholder={key==='current'?'Your current password':key==='next'?'New password':'Repeat new password'}
                  autoComplete="new-password"
                  onFocus={e=>e.target.style.borderColor='#0176D3'} onBlur={e=>e.target.style.borderColor='#E2E8F0'} />
                <button type="button" onClick={()=>setShowPwd(p=>({...p,[key]:!p[key]}))}
                  style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:15,padding:0}}>
                  {showPwd[key]?'🙈':'👁️'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {pwdForm.next && (
          <div style={{marginBottom:16}}>
            <div style={{display:'flex',gap:4,marginBottom:6}}>
              {[1,2,3].map(i=>(
                <div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=pwdScore?(pwdColors[pwdScore-1]||'#ef4444'):'#e2e8f0',transition:'background 0.3s'}} />
              ))}
            </div>
            <div style={{fontSize:11,color:pwdColors[pwdScore-1]||'#94a3b8',fontWeight:700,marginBottom:8}}>{pwdLabels[pwdScore-1]||'Weak'}</div>
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              {[{k:'length',l:'8+ chars'},{k:'upper',l:'Uppercase'},{k:'number',l:'Number'}].map(({k,l})=>(
                <span key={k} style={{fontSize:11,color:pwdChecks[k]?'#22c55e':'#94a3b8',display:'flex',alignItems:'center',gap:4}}>
                  {pwdChecks[k]?'✓':'○'} {l}
                </span>
              ))}
            </div>
          </div>
        )}

        <button onClick={changePwd} disabled={pwdSaving} style={{background:'linear-gradient(135deg,#0176D3,#014486)',color:'white',border:'none',borderRadius:8,padding:'11px 28px',fontWeight:700,fontSize:14,cursor:pwdSaving?'not-allowed':'pointer',opacity:pwdSaving?0.7:1,display:'flex',alignItems:'center',gap:8,fontFamily:'inherit'}}>
          {pwdSaving?<><Spinner/> Updating...</>:'Update Password'}
        </button>
      </div>

      {/* ── Security Settings (2FA + Active Sessions) ───────── */}
      <div style={{marginTop:20}}>
        <h3 style={{fontWeight:700,color:'#0A1628',marginBottom:16,fontSize:15}}>Security</h3>
        <SecuritySettings user={user} />
      </div>
    </div>
  );
}
