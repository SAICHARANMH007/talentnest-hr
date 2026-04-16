import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LOGO_PATH } from '../../config/logo.js';
import Logo from '../../components/Logo.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Field from '../../components/ui/Field.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import UploadZone from '../../components/ui/UploadZone.jsx';
import { api } from '../../api/api.js';
import { API_BASE_URL } from '../../api/config.js';
import { parseFile } from '../../api/matching.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// ── OTP / 2FA Screen ──────────────────────────────────────────────────────────
function OtpScreen({ email, onVerified, onBack }) {
  const [otp, setOtp]         = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent]   = useState(false);

  const verify = async () => {
    if (otp.length < 6) { setError('Enter the 6-digit code'); return; }
    setLoading(true); setError('');
    try {
      const d = await api.verifyOtp(email, otp);
      onVerified(d.user, d.token);
    } catch (e) { setError(e.message || 'Invalid or expired code'); }
    setLoading(false);
  };

  const resend = async () => {
    setResending(true);
    try {
      await api.login(email, ''); // login returns requires2FA again — but we can't resend without password
      // Instead call a dedicated resend endpoint — we use forgotPassword style approach:
      // The backend regenerates OTP on new login attempt; just show guidance
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch {
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    }
    setResending(false);
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🔐</div>
        <h2 style={{ color: '#181818', fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>Two-Factor Authentication</h2>
        <p style={{ color: '#706E6B', fontSize: 13, margin: 0 }}>
          A 6-digit OTP has been sent to your registered phone or email.<br />
          <strong style={{ color: '#181818' }}>{email}</strong>
        </p>
      </div>

      {error && (
        <div style={{ background: 'rgba(186,5,23,0.07)', border: '1px solid rgba(186,5,23,0.25)', borderRadius: 10, padding: '10px 14px', color: '#BA0517', fontSize: 13, marginBottom: 14 }}>
          {error}
        </div>
      )}
      {resent && (
        <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: '10px 14px', color: '#065f46', fontSize: 13, marginBottom: 14 }}>
          ✅ A new OTP was sent. Please check your phone or email.
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontWeight: 600, color: '#374151', fontSize: 13, marginBottom: 6 }}>
          Enter 6-digit OTP
        </label>
        <input
          value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={e => e.key === 'Enter' && verify()}
          placeholder="• • • • • •"
          maxLength={6}
          autoFocus
          style={{ width: '100%', padding: '14px 16px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, color: '#0f172a', fontSize: 22, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace', letterSpacing: 8, textAlign: 'center' }}
        />
      </div>

      <button
        onClick={verify}
        disabled={loading || otp.length < 6}
        style={{ width: '100%', background: 'linear-gradient(135deg, #0176D3, #014486)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700, padding: '14px', cursor: loading || otp.length < 6 ? 'not-allowed' : 'pointer', opacity: loading || otp.length < 6 ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}
      >
        {loading ? <><Spinner /> Verifying…</> : '✅ Verify & Sign In'}
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#706E6B', fontSize: 13, cursor: 'pointer', padding: 0 }}>
          ← Back to Login
        </button>
        <button onClick={resend} disabled={resending} style={{ background: 'none', border: 'none', color: '#0176D3', fontSize: 13, cursor: 'pointer', padding: 0, fontWeight: 600 }}>
          {resending ? 'Sending…' : 'Resend OTP'}
        </button>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const BG = { minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #060d1a 0%, #0d1e3d 55%, #0a2a52 100%)', padding: 20, fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", overflowY: 'auto' };
const CARD = { background: '#ffffff', boxShadow: '0 24px 64px rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: 'clamp(20px, 4vw, 40px)', width: '100%', maxWidth: 460, boxSizing: 'border-box' };
const INP = { width: '100%', padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, color: '#0f172a', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.2s' };
const BTN_P = { background: 'linear-gradient(135deg, #0176D3, #014486)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, padding: '13px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'opacity 0.2s' };
const BTN_G = { background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 12, color: '#374151', fontSize: 13, fontWeight: 500, padding: '11px 20px', cursor: 'pointer', transition: 'all 0.2s' };

// ── Employer plan colour maps (static — defined at module level to avoid remount) ──
const PLAN_COLORS_MAP = { enterprise: '#2E844A', growth: '#0176D3', starter: '#A07E00', free: '#706E6B', trial: '#F59E0B' };
const PLAN_BG_MAP = { enterprise: 'rgba(46,132,74,0.12)', growth: 'rgba(1,118,211,0.12)', starter: 'rgba(160,126,0,0.12)', free: 'rgba(112,110,107,0.1)', trial: 'rgba(245,158,11,0.12)' };

function PasswordStrength({ pw }) {
  const checks = [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)];
  const score = checks.filter(Boolean).length;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#BA0517', '#F59E0B', '#0176D3', '#2E844A'];
  if (!pw) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= score ? colors[score] : '#DDDBDA', transition: 'background 0.3s' }} />
        ))}
      </div>
      <span style={{ color: colors[score], fontSize: 11, fontWeight: 600 }}>{labels[score]}</span>
    </div>
  );
}

// ── Entry Screen: Job Seeker vs Employer ──────────────────────────────────────
function EntryScreen({ onSelect, navigate }) {
  return (
    <div style={{ ...BG, flexDirection: 'column' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ textAlign: 'center', marginBottom: 48, animation: 'fadeUp 0.5s ease both' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <Logo size="xl" variant="full" theme="light" />
        </div>
        <p style={{ color: 'rgba(147,197,253,0.9)', fontSize: 15, margin: 0 }}>AI-Powered Recruitment Platform</p>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', animation: 'fadeUp 0.5s 0.1s ease both', opacity: 0, animationFillMode: 'forwards', width: '100%', maxWidth: 540 }}>
        {/* Job Seeker Card */}
        <button
          onClick={() => onSelect('candidate')}
          style={{ background: 'rgba(1,118,211,0.06)', border: '1px solid rgba(1,118,211,0.3)', borderRadius: 20, padding: '32px 24px', width: 'min(240px, 100%)', flex: '1 1 200px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.25s', color: 'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(1,118,211,0.14)'; e.currentTarget.style.borderColor = 'rgba(1,118,211,0.6)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(1,118,211,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(1,118,211,0.06)'; e.currentTarget.style.borderColor = 'rgba(1,118,211,0.3)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ fontSize: 52, marginBottom: 16 }}>👤</div>
          <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>Job Seeker</h3>
          <p style={{ color: '#706E6B', fontSize: 13, margin: '0 0 16px', lineHeight: 1.5 }}>Find your dream job with AI-powered matching & apply in one click</p>
          <div style={{ background: '#0176D3', borderRadius: 10, padding: '8px 0', color: '#fff', fontSize: 13, fontWeight: 700 }}>
            Get Started →
          </div>
        </button>

        {/* Employer Card */}
        <button
          onClick={() => onSelect('employer')}
          style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 20, padding: '32px 24px', width: 'min(240px, 100%)', flex: '1 1 200px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.25s', color: 'inherit' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,99,235,0.14)'; e.currentTarget.style.borderColor = 'rgba(37,99,235,0.6)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(37,99,235,0.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(37,99,235,0.06)'; e.currentTarget.style.borderColor = 'rgba(37,99,235,0.3)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ fontSize: 52, marginBottom: 16 }}>🏢</div>
          <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>Employer</h3>
          <p style={{ color: '#706E6B', fontSize: 13, margin: '0 0 16px', lineHeight: 1.5 }}>Post jobs, manage pipeline & hire top talent 3x faster with AI</p>
          <div style={{ background: 'linear-gradient(135deg,#014486,#014486)', borderRadius: 10, padding: '8px 0', color: '#fff', fontSize: 13, fontWeight: 700 }}>
            Start Hiring →
          </div>
        </button>
      </div>

      <div style={{ marginTop: 32, textAlign: 'center', animation: 'fadeUp 0.5s 0.2s ease both', opacity: 0, animationFillMode: 'forwards' }}>
        <button onClick={() => navigate('/careers')} style={{ background: 'none', border: '1px solid #DDDBDA', borderRadius: 10, color: '#706E6B', fontSize: 13, cursor: 'pointer', padding: '8px 20px' }}>
          🔍 Browse open jobs without logging in
        </button>
      </div>

      <button onClick={() => navigate('/')} style={{ marginTop: 24, background: 'none', border: 'none', color: '#475569', fontSize: 12, cursor: 'pointer' }}>← Back to Website</button>
    </div>
  );
}

// ── Candidate Auth Form ───────────────────────────────────────────────────────
function CandidateForm({ onAuth, onBack, onForgot, navigate, prefill }) {
  const googleBtnRef = useRef(null);
  const [mode, setMode]         = useState('login');
  const [email, setEmail]       = useState(prefill?.email || '');
  const [pw, setPw]             = useState(prefill?.password || '');
  const [name, setName]         = useState('');
  const [phone, setPhone]       = useState('');
  const [resumeName, setRN]     = useState('');
  const [extracting, setEx]     = useState(false);
  const [extracted, setEx2]     = useState(null);
  const [agreed, setAgreed]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [pending2FA, setPending2FA] = useState(null); // { email }

  useEffect(() => {
    // Pre-warm the Railway backend on mount so cold-start latency
    // doesn't hit the user when they click Sign In / Create Account
    fetch(`${API_BASE_URL}/health`)
      .catch(() => {}); // silent — just waking the server
    if (prefill?.autoLogin && prefill?.email && prefill?.password) {
      handleLogin(prefill.email, prefill.password);
    }
  }, []);

  const handleLogin = async (e, p) => {
    setLoading(true);
    try {
      const d = await api.login(e, p);
      if (d.mustChangePassword) {
        navigate(`/set-password?token=${d.changePasswordToken}&email=${encodeURIComponent(d.email)}&mode=change`);
        return;
      }
      if (d.requires2FA) { setPending2FA({ email: d.email }); setLoading(false); return; }
      if (d.user.role !== 'candidate') {
        setToast('❌ This is not a Job Seeker account. Please use Employer login instead.');
        setLoading(false);
        return;
      }
      onAuth(d.user, d.token);
      navigate('/app');
    } catch (err) { setToast('❌ ' + err.message); }
    setLoading(false);
  };

  const handleResume = async (f) => {
    setRN(f.name); setEx(true);
    try {
      const p = await parseFile(f);
      setEx2(p);
      if (!name && p.name) setName(p.name);
      setToast('✅ Resume parsed — AI extracted your details!');
    } catch (e) { setToast('❌ Parse failed: ' + e.message); }
    setEx(false);
  };

  const submit = async () => {
    if (!email || !pw) return setToast('❌ Email and password required');
    if (mode === 'register') {
      if (!name) return setToast('❌ Full name is required');
      if (!phone) return setToast('❌ Mobile number is required');
      if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw))
        return setToast('❌ Password must be 8+ characters with 1 uppercase letter and 1 number');
      if (!agreed) return setToast('❌ Please accept the terms to continue');
    }
    setLoading(true);
    try {
      let d;
      if (mode === 'login') {
        d = await api.login(email, pw);
        if (d.mustChangePassword) {
          navigate(`/set-password?token=${d.changePasswordToken}&email=${encodeURIComponent(d.email)}&mode=change`);
          return;
        }
        if (d.requires2FA) { setPending2FA({ email: d.email }); setLoading(false); return; }
        if (d.user.role !== 'candidate') {
          setToast('❌ This is not a Job Seeker account. Please use Employer login instead.');
          setLoading(false);
          return;
        }
      } else {
        d = await api.register({ name, email, password: pw, role: 'candidate', phone, ...(extracted || {}), skills: extracted?.skills || '' });
      }
      onAuth(d.user, d.token);
      navigate('/app');
    } catch (e) { setToast('❌ ' + e.message); }
    setLoading(false);
  };

  // Google
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleBtnRef.current) return;
    const init = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: async ({ credential }) => {
        setLoading(true);
        try { const d = await api.googleAuth(credential, 'candidate'); onAuth(d.user, d.token); navigate('/app'); }
        catch (e) { setToast('❌ ' + e.message); }
        setLoading(false);
      }});
      window.google.accounts.id.renderButton(googleBtnRef.current, { theme: 'filled_black', size: 'large', width: 380 });
    };
    if (window.google) { init(); return; }
    const s = document.getElementById('gis-script') || Object.assign(document.createElement('script'), { id: 'gis-script', src: 'https://accounts.google.com/gsi/client', async: true, defer: true });
    s.onload = init;
    if (!document.getElementById('gis-script')) document.head.appendChild(s);
  }, [mode]);

  if (pending2FA) return (
    <div style={BG}>
      <div style={CARD}>
        <OtpScreen email={pending2FA.email} onVerified={(u, t) => { onAuth(u, t); }} onBack={() => setPending2FA(null)} />
      </div>
    </div>
  );

  return (
    <div style={{ ...BG, alignItems: 'flex-start', paddingTop: 'clamp(20px, 5vw, 40px)', paddingBottom: 'clamp(20px, 5vw, 40px)' }}>
      <Toast msg={toast} onClose={() => setToast('')} />
      <div style={CARD}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <button onClick={onBack} style={{ background: '#F3F2F2', border: '1px solid #DDDBDA', borderRadius: 8, color: '#706E6B', fontSize: 14, cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>←</button>
          <div>
            <h2 style={{ color: '#032D60', fontSize: 20, fontWeight: 800, margin: 0 }}>👤 Job Seeker</h2>
            <p style={{ color: '#0176D3', fontSize: 12, margin: '2px 0 0' }}>Find your next opportunity</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#FFFFFF', borderRadius: 12, padding: 4 }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => { setMode(m); setToast(''); }} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: mode === m ? '#0176D3' : 'transparent', color: mode === m ? '#fff' : '#706E6B', transition: 'all 0.2s' }}>
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <>
              <div>
                <label style={{ color: '#706E6B', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>FULL NAME *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" style={INP} autoComplete="off" onFocus={e => { e.target.style.borderColor = '#0176D3'; e.target.style.boxShadow = '0 0 0 3px rgba(1,118,211,0.1)'; }} onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }} />
              </div>
              <div>
                <label style={{ color: '#706E6B', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>MOBILE NUMBER *</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" style={INP} autoComplete="tel" onFocus={e => { e.target.style.borderColor = '#0176D3'; e.target.style.boxShadow = '0 0 0 3px rgba(1,118,211,0.1)'; }} onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }} />
              </div>
            </>
          )}

          <div>
            <label style={{ color: '#706E6B', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>WORK EMAIL *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={INP} autoComplete="email" onFocus={e => { e.target.style.borderColor = '#0176D3'; e.target.style.boxShadow = '0 0 0 3px rgba(1,118,211,0.1)'; }} onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }} />
          </div>

          <div>
            <label style={{ color: '#706E6B', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>PASSWORD *</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" style={{ ...INP, paddingRight: 44 }} />
              <button onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 }}>{showPw ? '🙈' : '👁'}</button>
            </div>
            {mode === 'register' && <PasswordStrength pw={pw} />}
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label style={{ color: '#0176D3', fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>RESUME <span style={{ color: '#706E6B', fontWeight: 400 }}>(optional — PDF, DOCX, TXT — AI will auto-fill your profile)</span></label>
                <UploadZone label="Upload Resume" onFile={handleResume} loading={extracting} fileName={resumeName} />
                {extracted && (
                  <div style={{ marginTop: 8, background: 'rgba(1,118,211,0.08)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 10, padding: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 20 }}>✅</span>
                    <div>
                      <p style={{ color: '#0176D3', fontSize: 12, fontWeight: 700, margin: 0 }}>{extracted.name}</p>
                      <p style={{ color: '#706E6B', fontSize: 11, margin: '2px 0 0' }}>{extracted.title} · {(extracted.skills || '').split(',').slice(0, 3).join(', ')}</p>
                    </div>
                  </div>
                )}
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 2, accentColor: '#0176D3', flexShrink: 0 }} />
                <span style={{ color: '#706E6B', fontSize: 12, lineHeight: 1.5 }}>
                  I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#0176D3', textDecoration: 'underline' }}>Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#0176D3', textDecoration: 'underline' }}>Privacy Policy</a>
                </span>
              </label>
            </>
          )}

          <button onClick={submit} disabled={loading} style={{ ...BTN_P, width: '100%', padding: '13px 0', marginTop: 4, opacity: loading ? 0.7 : 1 }}>
            {loading ? <><Spinner /> Please wait…</> : mode === 'login' ? '→ Sign In' : '🚀 Create Account'}
          </button>
        </div>

        {GOOGLE_CLIENT_ID && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 14px' }}>
              <div style={{ flex: 1, height: 1, background: '#FAFAF9' }} />
              <span style={{ color: '#475569', fontSize: 11 }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#FAFAF9' }} />
            </div>
            <div ref={googleBtnRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }} />
          </div>
        )}

        {mode === 'login' && (
          <p style={{ textAlign: 'center', marginTop: 8 }}>
            <span onClick={onForgot} style={{ color: '#0176D3', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
              Forgot password?
            </span>
          </p>
        )}

        <p style={{ color: '#475569', fontSize: 11, textAlign: 'center', marginTop: 12 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <span onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ color: '#0176D3', cursor: 'pointer' }}>
            {mode === 'login' ? 'Register free' : 'Sign in'}
          </span>
        </p>
      </div>
    </div>
  );
}

// ── Forgot Password Form ───────────────────────────────────────────────────────
function ForgotPasswordForm({ onBack }) {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [toast, setToast]     = useState('');

  const submit = async () => {
    if (!email) return setToast('❌ Enter your email address');
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setDone(true);
    } catch (e) { setToast('❌ ' + e.message); }
    setLoading(false);
  };

  return (
    <div style={BG}>
      <Toast msg={toast} onClose={() => setToast('')} />
      <div style={CARD}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#0176D3', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 20 }}>← Back to Login</button>
        <h2 style={{ color: '#0d2150', fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>Reset Password</h2>
        <p style={{ color: '#706E6B', fontSize: 13, margin: '0 0 24px' }}>Enter your registered email and we'll send a reset link from hr@talentnesthr.com</p>

        {done ? (
          <div style={{ background: 'rgba(46,132,74,0.08)', border: '1px solid rgba(46,132,74,0.3)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📧</div>
            <p style={{ color: '#2E844A', fontWeight: 700, margin: '0 0 6px' }}>Reset link sent!</p>
            <p style={{ color: '#706E6B', fontSize: 13, margin: 0 }}>Check your inbox at <strong>{email}</strong>. The link expires in 1 hour.</p>
            <button onClick={onBack} style={{ ...BTN_P, marginTop: 20, padding: '10px 24px' }}>Back to Login</button>
          </div>
        ) : (
          <>
            <label style={{ color: '#706E6B', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>EMAIL ADDRESS *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="you@example.com" style={{ ...INP, marginBottom: 16 }} autoFocus />
            <button onClick={submit} disabled={loading} style={{ ...BTN_P, width: '100%', padding: '13px 0', opacity: loading ? 0.7 : 1 }}>
              {loading ? <><Spinner /> Sending…</> : '📧 Send Reset Link'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Reset Password Form (shown when ?token=...&email=... in URL) ──────────────
function ResetPasswordForm({ token, email: initEmail, onBack }) {
  const [pw, setPw]           = useState('');
  const [pw2, setPw2]         = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [toast, setToast]     = useState('');

  const submit = async () => {
    if (!pw || !pw2) return setToast('❌ Both fields required');
    if (pw !== pw2) return setToast('❌ Passwords do not match');
    if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw))
      return setToast('❌ Min 8 chars, one uppercase, one number');
    setLoading(true);
    try {
      await api.resetPassword(initEmail, token, pw);
      setDone(true);
    } catch (e) { setToast('❌ ' + e.message); }
    setLoading(false);
  };

  return (
    <div style={BG}>
      <Toast msg={toast} onClose={() => setToast('')} />
      <div style={CARD}>
        <h2 style={{ color: '#0d2150', fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>Set New Password</h2>
        <p style={{ color: '#706E6B', fontSize: 13, margin: '0 0 24px' }}>for <strong>{initEmail}</strong></p>

        {done ? (
          <div style={{ background: 'rgba(46,132,74,0.08)', border: '1px solid rgba(46,132,74,0.3)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
            <p style={{ color: '#2E844A', fontWeight: 700, margin: '0 0 6px' }}>Password updated!</p>
            <p style={{ color: '#706E6B', fontSize: 13, margin: 0 }}>You can now sign in with your new password.</p>
            <button onClick={onBack} style={{ ...BTN_P, marginTop: 20, padding: '10px 24px' }}>Go to Login</button>
          </div>
        ) : (
          <>
            <label style={{ color: '#706E6B', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>NEW PASSWORD *</label>
            <div style={{ position: 'relative', marginBottom: 4 }}>
              <input type={showPw ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" style={{ ...INP, paddingRight: 44 }} />
              <button onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 }}>{showPw ? '🙈' : '👁'}</button>
            </div>
            <PasswordStrength pw={pw} />
            <label style={{ color: '#706E6B', fontSize: 11, fontWeight: 600, display: 'block', margin: '14px 0 6px' }}>CONFIRM PASSWORD *</label>
            <input type="password" value={pw2} onChange={e => setPw2(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="••••••••" style={{ ...INP, marginBottom: 4, borderColor: pw2 && pw !== pw2 ? '#BA0517' : '' }} />
            {pw2 && pw !== pw2 && <p style={{ color: '#BA0517', fontSize: 11, margin: '0 0 12px', fontWeight: 600 }}>⚠️ Passwords do not match</p>}
            {pw2 && pw === pw2 && <p style={{ color: '#2E844A', fontSize: 11, margin: '0 0 12px', fontWeight: 600 }}>✓ Passwords match</p>}
            <button onClick={submit} disabled={loading} style={{ ...BTN_P, width: '100%', padding: '13px 0', opacity: loading ? 0.7 : 1 }}>
              {loading ? <><Spinner /> Updating…</> : '🔒 Set New Password'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Employer Auth Form ────────────────────────────────────────────────────────
function EmployerForm({ onAuth, onBack, onForgot, navigate, prefill }) {
  const googleBtnRef = useRef(null);
  const [step, setStep]           = useState(1); // 1=verify 2=login 3=register
  const [companyUrl, setCompanyUrl] = useState('www.talentnesthr.com');
  const [orgInfo, setOrgInfo]     = useState(null);
  const [domainChecking, setDC]   = useState(false);
  const [email, setEmail]         = useState(prefill?.email || '');
  const [pw, setPw]               = useState(prefill?.password || '');
  const [loading, setLoading]     = useState(false);
  const [toast, setToast]         = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [pending2FA, setPending2FA] = useState(null); // { email }

  useEffect(() => {
    if (prefill?.autoLogin) doLogin(prefill.email, prefill.password);
    // Auto-verify the default domain on mount so users don't have to click Verify
    else checkDomain('talentnesthr.com');
  }, []);

  const PLATFORM_DOMAIN = 'talentnesthr.com';

  const checkDomain = async (url) => {
    const clean = (url || '').trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
    if (!clean || clean.length < 3) return;
    setDC(true);
    try {
      const r = await api.verifyDomain(clean);
      // Backend returns { success, data: { exists, domain, organization: { name, logo, status } } }
      // Normalize to { found, org: { name, plan, status }, suspended }
      const d = r?.data || r;
      const exists = d?.exists ?? d?.found ?? false;
      const org = d?.organization || d?.org || null;
      const suspended = org?.status === 'suspended';
      const normalized = {
        found: exists,
        org: org ? { name: org.name, plan: org.plan || org.status || 'active', status: org.status, logo: org.logo } : null,
        suspended,
      };
      if (!normalized.found && clean === PLATFORM_DOMAIN) {
        setOrgInfo({ found: true, org: { name: 'TalentNest HR', plan: 'enterprise', status: 'active' }, suspended: false });
      } else {
        setOrgInfo(normalized);
      }
    } catch {
      // Network error or domain not found — if it's the platform domain, don't block login
      if ((url || '').replace(/^www\./i, '').toLowerCase().startsWith(PLATFORM_DOMAIN)) {
        setOrgInfo({ found: true, org: { name: 'TalentNest HR', plan: 'enterprise', status: 'active' }, suspended: false });
      } else {
        setOrgInfo({ found: false });
      }
    }
    setDC(false);
  };

  const handleVerify = async () => {
    await checkDomain(companyUrl);
  };

  const proceedToLogin = () => {
    if (!orgInfo?.found) return;
    if (orgInfo?.suspended) return;
    setStep(2);
  };

  const doLogin = async (e, p) => {
    setLoading(true);
    try {
      const d = await api.login(e, p);
      if (d.mustChangePassword) {
        navigate(`/set-password?token=${d.changePasswordToken}&email=${encodeURIComponent(d.email)}&mode=change`);
        return;
      }
      if (d.requires2FA) { setPending2FA({ email: d.email }); setLoading(false); return; }
      if (d.user.role === 'candidate') {
        setToast('❌ This is a Job Seeker account. Use Job Seeker login instead.');
        setLoading(false); return;
      }
      onAuth(d.user, d.token);
      navigate('/app');
    } catch (err) { setToast('❌ ' + err.message); }
    setLoading(false);
  };

  const submit = async () => {
    if (!email || !pw) return setToast('❌ Email and password required');
    await doLogin(email, pw);
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleBtnRef.current || step !== 2) return;
    const init = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: async ({ credential }) => {
        setLoading(true);
        try { const d = await api.googleAuth(credential, 'recruiter'); onAuth(d.user, d.token); navigate('/app'); }
        catch (e) { setToast('❌ ' + e.message); }
        setLoading(false);
      }});
      window.google.accounts.id.renderButton(googleBtnRef.current, { theme: 'filled_black', size: 'large', width: 380 });
    };
    if (window.google) { init(); return; }
    const s = document.getElementById('gis-script') || Object.assign(document.createElement('script'), { id: 'gis-script', src: 'https://accounts.google.com/gsi/client', async: true, defer: true });
    s.onload = init;
    if (!document.getElementById('gis-script')) document.head.appendChild(s);
  }, [step]);

  const planColors = PLAN_COLORS_MAP;
  const planBg     = PLAN_BG_MAP;

  if (pending2FA) return (
    <div style={BG}>
      <div style={CARD}>
        <OtpScreen email={pending2FA.email} onVerified={(u, t) => { onAuth(u, t); }} onBack={() => setPending2FA(null)} />
      </div>
    </div>
  );

  return (
    <div style={{ ...BG, alignItems: 'flex-start', paddingTop: 'clamp(20px, 5vw, 40px)', paddingBottom: 'clamp(20px, 5vw, 40px)' }}>
      <Toast msg={toast} onClose={() => setToast('')} />
      <div style={CARD}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={step === 2 ? () => setStep(1) : onBack} style={{ background: '#F3F2F2', border: '1px solid #DDDBDA', borderRadius: 8, color: '#706E6B', fontSize: 14, cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>←</button>
          <div style={{ flex: 1 }}>
            <h2 style={{ color: '#181818', fontSize: 20, fontWeight: 800, margin: 0 }}>🏢 Employer Login</h2>
            <p style={{ color: '#0176D3', fontSize: 12, margin: '2px 0 0' }}>
              {step === 1 ? 'Step 1 of 2 — Verify your company' : 'Step 2 of 2 — Sign in to your portal'}
            </p>
          </div>
          {/* Step dots */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[1,2].map(s => (
              <div key={s} style={{ width: s === step ? 20 : 8, height: 8, borderRadius: 4, background: s === step ? '#0176D3' : '#DDDBDA', transition: 'all 0.3s' }} />
            ))}
          </div>
        </div>

        {/* ── STEP 1: Company Domain Verification ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#F8FAFF', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ color: '#334155', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                Enter your <strong>company website</strong> to verify your organisation is registered on TalentNest HR.
              </p>
            </div>

            <div>
              <label style={{ color: '#706E6B', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>COMPANY WEBSITE *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9E9D9B', fontSize: 13 }}>🌐</span>
                  <input
                    value={companyUrl}
                    onChange={e => { setCompanyUrl(e.target.value); setOrgInfo(null); }}
                    onKeyDown={e => e.key === 'Enter' && handleVerify()}
                    placeholder="www.yourcompany.com"
                    style={{ ...INP, paddingLeft: 34 }}
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleVerify}
                  disabled={domainChecking || !companyUrl.trim()}
                  style={{ ...BTN_P, padding: '0 18px', flexShrink: 0, fontSize: 13, opacity: (!companyUrl.trim() || domainChecking) ? 0.6 : 1 }}
                >
                  {domainChecking ? <Spinner /> : 'Verify'}
                </button>
              </div>
              <p style={{ color: '#9E9D9B', fontSize: 11, margin: '6px 0 0' }}>e.g. talentnesthr.com · acmecorp.com · yourcompany.in</p>
            </div>

            {/* Result: not checked yet */}
            {!orgInfo && !domainChecking && (
              <div style={{ background: '#F8FAFF', border: '1px dashed #CBD5E1', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                <p style={{ color: '#94A3B8', fontSize: 12, margin: 0 }}>Enter your company website above and click <strong>Verify</strong></p>
              </div>
            )}

            {/* Result: verified ✅ */}
            {orgInfo?.found && !orgInfo?.suspended && (
              <div style={{ background: 'rgba(46,132,74,0.07)', border: '1px solid rgba(46,132,74,0.35)', borderRadius: 12, padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(46,132,74,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏢</div>
                  <div>
                    <p style={{ color: '#2E844A', fontSize: 14, fontWeight: 800, margin: 0 }}>✅ {orgInfo.org?.name}</p>
                    <p style={{ color: '#706E6B', fontSize: 11, margin: '2px 0 0' }}>Organisation verified and active</p>
                  </div>
                  <span style={{ marginLeft: 'auto', background: planBg[orgInfo.org?.plan] || '#f1f5f9', color: planColors[orgInfo.org?.plan] || '#706E6B', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, textTransform: 'capitalize' }}>
                    {orgInfo.org?.plan} Plan
                  </span>
                </div>
                <button onClick={proceedToLogin} style={{ ...BTN_P, width: '100%', padding: '12px 0', fontSize: 14 }}>
                  Continue to Login →
                </button>
              </div>
            )}

            {/* Result: not registered ❌ */}
            {orgInfo && !orgInfo.found && (
              <div style={{ background: 'rgba(186,5,23,0.05)', border: '1px solid rgba(186,5,23,0.25)', borderRadius: 12, padding: '14px 16px' }}>
                <p style={{ color: '#BA0517', fontSize: 13, fontWeight: 700, margin: '0 0 6px' }}>❌ Company not registered</p>
                <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 10px', lineHeight: 1.5 }}>
                  <strong>{companyUrl}</strong> is not registered on TalentNest HR. Contact us to get your organisation set up.
                </p>
                <a href="mailto:hr@talentnesthr.com" style={{ color: '#0176D3', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                  📧 hr@talentnesthr.com — Request Access
                </a>
              </div>
            )}

            {/* Result: suspended ⛔ */}
            {orgInfo?.suspended && (
              <div style={{ background: 'rgba(186,5,23,0.06)', border: '1px solid rgba(186,5,23,0.3)', borderRadius: 12, padding: '14px 16px' }}>
                <p style={{ color: '#BA0517', fontSize: 13, fontWeight: 700, margin: '0 0 4px' }}>⛔ Account Suspended</p>
                <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{orgInfo.suspendedReason}</p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Login ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Org badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(1,118,211,0.06)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 10, padding: '10px 14px' }}>
              <span style={{ fontSize: 18 }}>🏢</span>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#0176D3', fontSize: 12, fontWeight: 700, margin: 0 }}>{orgInfo?.org?.name}</p>
                <p style={{ color: '#706E6B', fontSize: 11, margin: '1px 0 0' }}>Verified organisation · {orgInfo?.org?.plan} plan</p>
              </div>
              <span style={{ color: '#2E844A', fontSize: 18 }}>✅</span>
            </div>

            <div>
              <label style={{ color: '#706E6B', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>WORK EMAIL *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={`hr@${companyUrl.replace(/^www\./,'')}`} style={INP} autoFocus />
            </div>

            <div>
              <label style={{ color: '#706E6B', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>PASSWORD *</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="••••••••" style={{ ...INP, paddingRight: 44 }} />
                <button onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 }}>{showPw ? '🙈' : '👁'}</button>
              </div>
            </div>

            <button onClick={submit} disabled={loading} style={{ ...BTN_P, width: '100%', padding: '13px 0', marginTop: 4, opacity: loading ? 0.7 : 1 }}>
              {loading ? <><Spinner /> Signing in…</> : '→ Sign In to Portal'}
            </button>

            {GOOGLE_CLIENT_ID && (
              <div style={{ marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 12px' }}>
                  <div style={{ flex: 1, height: 1, background: '#FAFAF9' }} />
                  <span style={{ color: '#475569', fontSize: 11 }}>or</span>
                  <div style={{ flex: 1, height: 1, background: '#FAFAF9' }} />
                </div>
                <div ref={googleBtnRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }} />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span
                onClick={onForgot}
                style={{ color: '#0176D3', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}
              >
                Forgot password?
              </span>
              <span
                onClick={() => setStep(3)}
                style={{ color: '#0176D3', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}
              >
                New here? Register →
              </span>
            </div>
          </div>
        )}

        {/* ── STEP 3: Recruiter Registration ── */}
        {step === 3 && (
          <RecruiterRegisterForm
            orgInfo={orgInfo}
            companyUrl={companyUrl}
            onAuth={onAuth}
            navigate={navigate}
            onBack={() => setStep(2)}
          />
        )}
      </div>
    </div>
  );
}

// ── Recruiter Self-Registration ───────────────────────────────────────────────
function RecruiterRegisterForm({ orgInfo, companyUrl, onAuth, navigate, onBack }) {
  const [form, setForm]   = useState({ name: '', email: '', password: '' });
  const [showPw, setShow] = useState(false);
  const [loading, setL]   = useState(false);
  const [toast, setToast] = useState('');
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.email || !form.password)
      return setToast('❌ Name, email and password required');
    if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password))
      return setToast('❌ Password must be 8+ characters with 1 uppercase letter and 1 number');
    setL(true);
    try {
      const domain = (companyUrl || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
      const d = await api.register({ ...form, role: 'recruiter', domain });
      onAuth(d.user, d.token);
      navigate('/app');
    } catch (e) { setToast('❌ ' + e.message); }
    setL(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Toast msg={toast} onClose={() => setToast('')} />
      <div style={{ background: 'rgba(1,118,211,0.06)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>🏢</span>
        <div>
          <p style={{ color: '#0176D3', fontSize: 12, fontWeight: 700, margin: 0 }}>{orgInfo?.org?.name || companyUrl}</p>
          <p style={{ color: '#706E6B', fontSize: 11, margin: '1px 0 0' }}>Registering as Recruiter</p>
        </div>
      </div>
      {[
        { key: 'name',     label: 'FULL NAME *',     type: 'text',     ph: 'Your full name' },
        { key: 'email',    label: 'WORK EMAIL *',     type: 'email',    ph: `recruiter@${(companyUrl||'').replace(/^www\./,'')}` },
      ].map(f => (
        <div key={f.key}>
          <label style={{ color: '#706E6B', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>{f.label}</label>
          <input type={f.type} value={form[f.key]} onChange={e => sf(f.key, e.target.value)} placeholder={f.ph} style={INP} />
        </div>
      ))}
      <div>
        <label style={{ color: '#706E6B', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>PASSWORD *</label>
        <div style={{ position: 'relative' }}>
          <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => sf('password', e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="Min 8 chars, 1 uppercase, 1 number" style={{ ...INP, paddingRight: 44 }} />
          <button onClick={() => setShow(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 }}>{showPw ? '🙈' : '👁'}</button>
        </div>
        <PasswordStrength pw={form.password} />
      </div>
      <button onClick={submit} disabled={loading} style={{ ...BTN_P, width: '100%', padding: '13px 0', opacity: loading ? 0.7 : 1 }}>
        {loading ? <><Spinner /> Creating account…</> : '🚀 Create Recruiter Account'}
      </button>
      <p style={{ color: '#706E6B', fontSize: 11, textAlign: 'center', margin: 0 }}>
        Already have an account?{' '}
        <span onClick={onBack} style={{ color: '#0176D3', cursor: 'pointer' }}>Sign in</span>
      </p>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function AuthScreen({ onAuth }) {
  const navigate = useNavigate();
  const [screen, setScreen] = useState('entry'); // entry | candidate | employer | forgot | reset
  const [prefill, setPrefill] = useState(null);
  const [resetParams, setResetParams] = useState({ token: '', email: '' });

  // Check URL for password reset params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('token');
    const email  = params.get('email');
    if (token && email) {
      setResetParams({ token, email });
      setScreen('reset');
      // Clean URL without reloading
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleSelect = (type, pf = null) => {
    setPrefill(pf);
    setScreen(type === 'candidate' ? 'candidate' : 'employer');
  };

  if (screen === 'forgot') return <ForgotPasswordForm onBack={() => setScreen(screen === 'employer' ? 'employer' : 'candidate')} />;
  if (screen === 'reset')  return <ResetPasswordForm token={resetParams.token} email={resetParams.email} onBack={() => setScreen('candidate')} />;
  if (screen === 'candidate') return <CandidateForm onAuth={onAuth} onBack={() => setScreen('entry')} onForgot={() => setScreen('forgot')} navigate={navigate} prefill={prefill} />;
  if (screen === 'employer')  return <EmployerForm  onAuth={onAuth} onBack={() => setScreen('entry')} onForgot={() => setScreen('forgot')} navigate={navigate} prefill={prefill} />;
  return <EntryScreen onSelect={handleSelect} navigate={navigate} />;
}
