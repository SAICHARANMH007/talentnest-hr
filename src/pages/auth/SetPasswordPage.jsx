import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import Logo from '../../components/Logo.jsx';

function StrengthBar({ password }) {
  const checks = {
    length:  password.length >= 8,
    upper:   /[A-Z]/.test(password),
    number:  /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const score  = Object.values(checks).filter(Boolean).length;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#e2e8f0', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];
  const color  = colors[score];

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= score ? color : '#e2e8f0', transition: 'background 0.3s' }} />
        ))}
      </div>
      {password && <div style={{ fontSize: 11, color, fontWeight: 700, marginBottom: 8 }}>{labels[score]}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[
          { key: 'length',  label: 'At least 8 characters' },
          { key: 'upper',   label: 'One uppercase letter' },
          { key: 'number',  label: 'One number' },
          { key: 'special', label: 'One special character' },
        ].map(({ key, label }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: checks[key] ? '#22c55e' : '#94a3b8' }}>
            <span>{checks[key] ? '✓' : '○'}</span> {label}
          </div>
        ))}
      </div>
    </div>
  );
}

const cardStyle = {
  background: '#fff', borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
  padding: '40px', width: '100%', maxWidth: 440,
};
const inpStyle = {
  width: '100%', padding: '12px 14px', borderRadius: 8,
  border: '1px solid #e2e8f0', fontSize: 14, outline: 'none',
  boxSizing: 'border-box', background: '#f8fafc',
};
const btnStyle = {
  width: '100%', padding: '13px',
  background: 'linear-gradient(135deg, #0176D3, #0154A4)',
  color: '#fff', border: 'none', borderRadius: 50, fontSize: 15,
  fontWeight: 700, cursor: 'pointer', marginTop: 8,
  boxShadow: '0 4px 14px rgba(1,118,211,0.35)',
};
const pageStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #032D60 0%, #0176D3 100%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
};

export default function SetPasswordPage() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();

  const token  = params.get('token');
  const email  = params.get('email');
  const jobId  = params.get('jobId');
  const mode   = params.get('mode');   // 'change' = forced temp-pwd change

  const [status,   setStatus]   = useState('loading'); // loading|valid|expired|invalid
  const [userData, setUserData] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [error,    setError]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const [done,     setDone]     = useState(false);

  useEffect(() => {
    if (!token || !email) { setStatus('invalid'); return; }
    api.verifyInvite(token, email)
      .then(res => {
        // Backend returns { success: true, data: { name, email, role } }
        const data = res?.data || res;
        if (res?.success || data?.email) { setUserData(data); setStatus('valid'); }
        else if (res?.error?.toLowerCase().includes('expir') || res?.message?.toLowerCase().includes('expir')) setStatus('expired');
        else setStatus('invalid');
      })
      .catch(() => setStatus('invalid'));
  }, [token, email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8)             return setError('Password must be at least 8 characters.');
    if (!/[A-Z]/.test(password))         return setError('Password must contain at least one uppercase letter.');
    if (!/\d/.test(password))            return setError('Password must contain at least one number.');
    if (!/[^A-Za-z0-9]/.test(password))  return setError('Password must contain at least one special character.');
    if (password !== confirm)             return setError('Passwords do not match.');

    setSaving(true);
    try {
      const res = await api.setPassword(token, email, password);
      // token is stored in memory by auth.service.js; only cache user profile here
      if (res?.user) {
        sessionStorage.setItem('tn_user', JSON.stringify(res.user));
      }
      setDone(true);
      const role = userData?.role || res?.user?.role;
      setTimeout(() => {
        if (jobId && role === 'candidate') navigate(`/app/jobs/${jobId}`);
        else navigate('/app');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to set password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const Header = () => (
    <div style={{ textAlign: 'center', marginBottom: 24 }}>
      <Logo size="lg" variant="full" theme="light" style={{ marginBottom: 8 }} />
      <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, letterSpacing: 1.5 }}>TALENTNEST HR</div>
    </div>
  );

  if (status === 'loading') return (
    <div style={pageStyle}><div style={cardStyle}><Header />
      <div style={{ textAlign: 'center', color: '#64748b', padding: '20px 0' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
        Verifying your invitation link…
      </div>
    </div></div>
  );

  if (status === 'expired') return (
    <div style={pageStyle}><div style={cardStyle}><Header />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>⚠️</div>
        <h2 style={{ color: '#dc2626', margin: '0 0 10px', fontSize: 20 }}>Invitation Expired</h2>
        <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.7, margin: '0 0 24px' }}>
          Invitation links are valid for 7 days.<br />
          Please ask your administrator to resend the invitation.
        </p>
        <a href="mailto:hr@talentnesthr.com" style={{ ...btnStyle, display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}>
          Contact Support
        </a>
      </div>
    </div></div>
  );

  if (status === 'invalid') return (
    <div style={pageStyle}><div style={cardStyle}><Header />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>❌</div>
        <h2 style={{ color: '#dc2626', margin: '0 0 10px', fontSize: 20 }}>Invalid or Already Used</h2>
        <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.7, margin: '0 0 24px' }}>
          This password setup link has already been used or is invalid.
        </p>
        <button onClick={() => navigate('/login')} style={btnStyle}>Go to Login</button>
      </div>
    </div></div>
  );

  if (done) return (
    <div style={pageStyle}><div style={cardStyle}><Header />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 14 }}>✅</div>
        <h2 style={{ color: '#22c55e', margin: '0 0 10px', fontSize: 22 }}>Password Set!</h2>
        <p style={{ color: '#64748b', fontSize: 13 }}>
          Welcome to TalentNest HR{userData?.name ? `, ${userData.name}` : ''}!<br />Redirecting you now…
        </p>
      </div>
    </div></div>
  );

  const isChange = mode === 'change';

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <Header />

        {/* Job invite card */}
        {jobId && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 700 }}>📋 You've been invited to apply for a job.</div>
            <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 4 }}>Set your password to view the job and apply.</div>
          </div>
        )}

        <h2 style={{ color: '#032D60', fontSize: 21, fontWeight: 800, margin: '0 0 4px' }}>
          {isChange ? 'Update Your Password' : `Welcome${userData?.name ? `, ${userData.name}` : ''}! 👋`}
        </h2>
        <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 22px', lineHeight: 1.6 }}>
          {isChange
            ? 'Your account was created with a temporary password. Set a new secure password to continue.'
            : 'Set your password to access your TalentNest HR account.'}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>Email</label>
            <input value={email || ''} readOnly style={{ ...inpStyle, color: '#94a3b8', background: '#f1f5f9' }} />
          </div>

          <div style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Create a strong password"
                style={{ ...inpStyle, paddingRight: 44 }}
                required
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <StrengthBar password={password} />

          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }}>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConf ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                style={{ ...inpStyle, paddingRight: 44, borderColor: confirm && confirm !== password ? '#ef4444' : '#e2e8f0' }}
                required
              />
              <button type="button" onClick={() => setShowConf(!showConf)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>
                {showConf ? '🙈' : '👁️'}
              </button>
            </div>
            {confirm && confirm !== password && (
              <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>Passwords do not match</div>
            )}
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={saving} style={{ ...btnStyle, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Setting Password…' : 'Set Password & Login →'}
          </button>
        </form>
      </div>
    </div>
  );
}
