import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LOGO_PATH } from '../../config/logo.js';
import Logo from '../../components/Logo.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Field from '../../components/ui/Field.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { api } from '../../api/api.js';
import { API_BASE_URL } from '../../api/config.js';
import { INDUSTRIES, DEPARTMENTS } from '../../constants/picklists.js';

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
      await api.resendOtp(email);
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch (e) {
      setError(e.message || 'Could not resend OTP. Please go back and sign in again.');
    }
    setResending(false);
  };

  return (
    <div style={{ animation: 'fadeUp 0.6s ease-out' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20 }}>
            <Logo size="md" variant="icon" />
          </div>
        </div>
        <h2 style={{ color: '#FFFFFF', fontSize: 24, fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.02em' }}>Security Verification</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>
          A 6-digit OTP has been sent to your registered phone or email.<br />
          <strong style={{ color: '#FFFFFF' }}>{email}</strong>
        </p>
      </div>

      {error && (
        <div style={{ background: 'rgba(186,5,23,0.07)', border: '1px solid rgba(186,5,23,0.25)', borderRadius: 10, padding: '10px 14px', color: '#FF7676', fontSize: 13, marginBottom: 14 }}>
          {error}
        </div>
      )}
      {resent && (
        <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: '10px 14px', color: '#34D399', fontWeight: 700, fontSize: 13, marginBottom: 14 }}>
          ✅ A new OTP was sent. Please check your phone or email.
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 6 }}>
          Enter 6-digit OTP
        </label>
        <input
          value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={e => e.key === 'Enter' && verify()}
          placeholder="• • • • • •"
          maxLength={6}
          autoFocus
          style={{ ...INP, fontSize: 22, letterSpacing: 8, textAlign: 'center', fontFamily: 'monospace' }}
        />
      </div>

      <button
        onClick={verify}
        disabled={loading || otp.length < 6}
        style={{ ...BTN_P, width: '100%', padding: '14px', cursor: loading || otp.length < 6 ? 'not-allowed' : 'pointer', opacity: loading || otp.length < 6 ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}
      >
        {loading ? <><Spinner /> Verifying…</> : '✅ Verify & Sign In'}
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', padding: 0 }}>
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
const BG = { 
  minHeight: '100dvh', 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center', 
  background: '#0A1628', 
  padding: 20, 
  fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", 
  overflowY: 'auto',
  position: 'relative',
  overflow: 'hidden'
};

const CARD = { 
  background: 'rgba(10, 22, 40, 0.92)', 
  backdropFilter: 'blur(20px)',
  boxShadow: '0 32px 80px rgba(0,0,0,0.5)', 
  border: '1px solid rgba(255,255,255,0.08)', 
  borderRadius: 32, 
  padding: 'clamp(24px, 5vw, 44px)', 
  width: '100%', 
  maxWidth: 480, 
  boxSizing: 'border-box',
  position: 'relative',
  zIndex: 10
};

const INP = { 
  width: '100%', 
  padding: '14px 18px', 
  background: '#0D1B2D', 
  border: '1.5px solid rgba(255, 255, 255, 0.12)', 
  borderRadius: 14, 
  color: '#FFFFFF', 
  fontSize: 15, 
  outline: 'none', 
  boxSizing: 'border-box', 
  fontFamily: 'inherit', 
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', 
  WebkitAppearance: 'none' 
};

// ── Icons ──
const EyeIcon = ({ visible }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#64748B" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
    {visible ? (
      /* Password is visible → show slashed eye (click to hide) */
      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.82l2.92 2.92c1.51-1.39 2.7-3.13 3.44-5.04-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.03 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
    ) : (
      /* Password is hidden → show open eye (click to reveal) */
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
    )}
  </svg>
);

const BTN_P = { 
  background: 'linear-gradient(135deg, #0176D3 0%, #014486 100%)', 
  border: 'none', 
  borderRadius: 14, 
  color: '#fff', 
  fontSize: 15, 
  fontWeight: 700, 
  padding: '14px 28px', 
  cursor: 'pointer', 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center', 
  gap: 10, 
  transition: 'all 0.2s',
  boxShadow: '0 4px 14px rgba(1, 118, 211, 0.3)'
};

const BTN_G = { 
  background: '#F1F5F9', 
  border: '1px solid #E2E8F0', 
  borderRadius: 14, 
  color: '#475569', 
  fontSize: 14, 
  fontWeight: 600, 
  padding: '12px 24px', 
  cursor: 'pointer', 
  transition: 'all 0.2s' 
};

function PasswordStrength({ pw }) {
  if (!pw) return null;
  const checks = {
    length:  pw.length >= 8,
    upper:   /[A-Z]/.test(pw),
    number:  /\d/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
  const score  = Object.values(checks).filter(Boolean).length;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#e2e8f0', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];
  const color  = colors[score];

  return (
    <div style={{ margin: '8px 0 16px' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= score ? color : '#e2e8f0', transition: 'background 0.3s' }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color, fontWeight: 700 }}>{labels[score]}</span>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>{score}/4 criteria met</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
        {[
          { key: 'length',  label: '8+ chars' },
          { key: 'upper',   label: 'Uppercase' },
          { key: 'number',  label: 'Number' },
          { key: 'special', label: 'Symbol' },
        ].map(({ key, label }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: checks[key] ? '#22c55e' : '#94a3b8' }}>
            <span>{checks[key] ? '✓' : '○'}</span> {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Employer plan colour maps (static — defined at module level to avoid remount) ──
const PLAN_COLORS_MAP = { enterprise: '#2E844A', growth: '#0176D3', starter: '#A07E00', free: '#706E6B', trial: '#F59E0B' };
const PLAN_BG_MAP = { enterprise: 'rgba(46,132,74,0.12)', growth: 'rgba(1,118,211,0.12)', starter: 'rgba(160,126,0,0.12)', free: 'rgba(112,110,107,0.1)', trial: 'rgba(245,158,11,0.12)' };

// ── Entry Screen: Job Seeker vs Employer ──────────────────────────────────────
function EntryScreen({ onSelect, navigate }) {
  return (
    <div style={{ ...BG, flexDirection: 'column', position: 'relative' }}>
      {/* Premium Ambient Background */}
      <div style={{ 
        position: 'fixed', inset: 0, 
        background: 'radial-gradient(circle at 0% 0%, rgba(1, 118, 211, 0.15) 0%, transparent 40%), radial-gradient(circle at 100% 100%, rgba(0, 194, 203, 0.1) 0%, transparent 40%), #050B15',
        zIndex: 1 
      }} />
      
      {/* Subtle Grid Overlay */}
      <div style={{ 
        position: 'fixed', inset: 0, 
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
        zIndex: 2 
      }} />

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glow { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        .entry-card { 
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); 
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px);
        }
        .entry-card:hover { 
          transform: translateY(-12px) scale(1.02); 
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 40px 80px rgba(0,0,0,0.4), inset 0 0 20px rgba(255,255,255,0.05);
        }
        .entry-card:hover .icon-box {
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 0 30px rgba(var(--accent-rgb), 0.4);
        }
        .entry-card:hover .action-btn {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.3);
        }
        input::placeholder { color: rgba(255,255,255,0.3) !important; }
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: #ffffff !important;
          -webkit-box-shadow: 0 0 0px 1000px #0e1a2d inset !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: 60, animation: 'fadeUp 1s cubic-bezier(0.16, 1, 0.3, 1) both', zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <Logo size="xl" variant="full" theme="dark" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
          <div style={{ height: 1, width: 40, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2))' }} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Choose Your Journey
          </span>
          <div style={{ height: 1, width: 40, background: 'linear-gradient(90deg, rgba(255,255,255,0.2), transparent)' }} />
        </div>
      </div>

      <div style={{ 
        display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', 
        animation: 'fadeUp 1s 0.2s cubic-bezier(0.16, 1, 0.3, 1) both', 
        opacity: 0, width: '100%', maxWidth: 800, zIndex: 10 
      }}>
        {/* Job Seeker Card */}
        <button
          onClick={() => onSelect('candidate')}
          className="entry-card"
          style={{ 
            borderRadius: 32, padding: '54px 32px', width: '320px', 
            cursor: 'pointer', textAlign: 'center', color: 'inherit', outline: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}
        >
          <div className="icon-box" style={{ 
            width: 88, height: 88, background: 'linear-gradient(135deg, #0176D3, #014486)', 
            borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: 44, marginBottom: 28, transition: 'all 0.4s',
            boxShadow: '0 12px 24px rgba(1, 118, 211, 0.3)',
            '--accent-rgb': '1, 118, 211'
          }}>👤</div>
          <h3 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em' }}>Job Seeker</h3>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, margin: '0 0 36px', lineHeight: 1.6, maxWidth: 240 }}>
            Upload your resume, find matching roles, and track applications in real-time.
          </p>
          <div className="action-btn" style={{ 
            width: '100%', background: 'linear-gradient(135deg, #0176D3, #014486)', 
            borderRadius: 16, padding: '14px 0', color: '#fff', fontSize: 15, fontWeight: 700, 
            transition: 'all 0.3s' 
          }}>
            Discover Jobs →
          </div>
        </button>

        {/* Employer Card */}
        <button
          onClick={() => onSelect('employer')}
          className="entry-card"
          style={{ 
            borderRadius: 32, padding: '54px 32px', width: '320px', 
            cursor: 'pointer', textAlign: 'center', color: 'inherit', outline: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}
        >
          <div className="icon-box" style={{ 
            width: 88, height: 88, background: 'linear-gradient(135deg, #00C2CB, #0891B2)', 
            borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: 44, marginBottom: 28, transition: 'all 0.4s',
            boxShadow: '0 12px 24px rgba(0, 194, 203, 0.3)',
            '--accent-rgb': '0, 194, 203'
          }}>🏢</div>
          <h3 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em' }}>Employer</h3>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, margin: '0 0 36px', lineHeight: 1.6, maxWidth: 240 }}>
            Post jobs, manage your talent pipeline, and build high-performance teams.
          </p>
          <div className="action-btn" style={{ 
            width: '100%', background: 'linear-gradient(135deg, #00C2CB, #0891B2)', 
            borderRadius: 16, padding: '14px 0', color: '#fff', fontSize: 15, fontWeight: 700, 
            transition: 'all 0.3s' 
          }}>
            Find Talent →
          </div>
        </button>
      </div>

      <div style={{ marginTop: 60, textAlign: 'center', animation: 'fadeUp 1s 0.4s both', opacity: 0, zIndex: 10 }}>
        <button 
          onClick={() => navigate('/careers')} 
          style={{ 
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: 100, color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, 
            cursor: 'pointer', padding: '10px 24px', transition: 'all 0.3s',
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
        >
          🔍 Browse open positions without an account
        </button>
      </div>

      <button 
        onClick={() => navigate('/')} 
        style={{ 
          marginTop: 40, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', 
          fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'color 0.2s', zIndex: 10 
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
      >
        ← Return to Main Website
      </button>
    </div>
  );
}

// ── Candidate Auth Form ───────────────────────────────────────────────────────
function CandidateForm({ onAuth, onBack, onForgot, navigate, prefill }) {
  const googleBtnRef = useRef(null);
  const [mode, setMode]         = useState(prefill?.mode === 'register' ? 'register' : 'login');
  const [email, setEmail]       = useState(prefill?.email || '');
  const [pw, setPw]             = useState(prefill?.password || '');
  const [name, setName]               = useState(prefill?.name || '');
  const [phone, setPhone]             = useState('');
  const [title, setTitle]             = useState('');
  const [currentCompany, setCompany]  = useState('');
  const [experience, setExperience]   = useState('');
  const [availability, setAvailability] = useState('');
  const [industry, setIndustry]       = useState('');
  const [department, setDepartment]   = useState('');
  const [isFresher, setIsFresher]     = useState(false);
  const [agreed, setAgreed]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [confirmPw, setConfirmPw]     = useState('');
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pending2FA, setPending2FA] = useState(null); // { email }

  // ── OTP Login (passwordless) ───────────────────────────────────────────────
  const [otpMode, setOtpMode]       = useState(false);   // toggle OTP vs password login
  const [otpStep, setOtpStep]       = useState('email'); // 'email' | 'otp' | 'no-account'
  const [otpEmail, setOtpEmail]     = useState('');
  const [otpDigits, setOtpDigits]   = useState(['','','','','','']);
  const [otpHint, setOtpHint]       = useState('');
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const otpRefs = [useRef(),useRef(),useRef(),useRef(),useRef(),useRef()];

  useEffect(() => {
    if (otpResendCooldown <= 0) return;
    const t = setTimeout(() => setOtpResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [otpResendCooldown]);

  const resetOtpMode = () => {
    setOtpMode(false); setOtpStep('email');
    setOtpEmail(''); setOtpDigits(['','','','','','']); setOtpHint(''); setOtpResendCooldown(0);
    setLoginError(''); setToast('');
  };

  const handleSendLoginOtp = async () => {
    if (!otpEmail.trim() || !/\S+@\S+\.\S+/.test(otpEmail)) {
      setLoginError('Enter a valid email address.'); return;
    }
    setLoading(true); setLoginError('');
    try {
      const r = await api.sendLoginOtp(otpEmail.trim().toLowerCase());
      if (!r.exists) { setOtpStep('no-account'); setLoading(false); return; }
      setOtpHint(r.hint || '');
      setOtpStep('otp');
      setOtpResendCooldown(60);
    } catch (e) { setLoginError(e.message || 'Failed to send OTP. Please try again.'); }
    setLoading(false);
  };

  const handleOtpDigit = (idx, val, e) => {
    if (!/^\d*$/.test(val)) return;
    const d = [...otpDigits]; d[idx] = val.slice(-1); setOtpDigits(d);
    if (val && idx < 5) otpRefs[idx + 1]?.current?.focus();
    if (e.key === 'Backspace' && !val && idx > 0) otpRefs[idx - 1]?.current?.focus();
  };

  const handleVerifyLoginOtp = async () => {
    const code = otpDigits.join('');
    if (code.length < 6) { setLoginError('Enter all 6 digits.'); return; }
    setLoading(true); setLoginError('');
    try {
      const d = await api.verifyOtp(otpEmail.trim().toLowerCase(), code);
      if (d.requires2FA) { setPending2FA({ email: otpEmail }); setLoading(false); return; }
      onAuth(d.user, d.token);
      navigate('/app');
    } catch (e) {
      setLoginError(e.message || 'Invalid or expired OTP. Please try again.');
      setOtpDigits(['','','','','','']);
      otpRefs[0]?.current?.focus();
    }
    setLoading(false);
  };

  const handleResendLoginOtp = async () => {
    if (otpResendCooldown > 0) return;
    setLoading(true);
    try {
      await api.sendLoginOtp(otpEmail.trim().toLowerCase());
      setOtpResendCooldown(60);
      setToast('✅ New OTP sent!');
    } catch (e) { setLoginError(e.message); }
    setLoading(false);
  };

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
    setLoading(true); setLoginError('');
    try {
      const d = await api.login(e, p);
      if (d.mustChangePassword) {
        navigate(`/set-password?token=${d.changePasswordToken}&email=${encodeURIComponent(d.email)}&mode=change`);
        return;
      }
      if (d.requires2FA) { setPending2FA({ email: d.email }); setLoading(false); return; }
      if (d.user.role !== 'candidate') {
        setLoginError('This is not a Job Seeker account. Please use Employer login.');
        setLoading(false);
        return;
      }
      onAuth(d.user, d.token);
      navigate('/app');
    } catch (err) {
      const msg = err.message || 'Something went wrong';
      setLoginError(msg.includes('Invalid email or password') ? 'Incorrect email or password. Please try again.' : msg);
    }
    setLoading(false);
  };

  const submit = async () => {
    if (!email || !pw) return setToast('❌ Email and password required');
    if (mode === 'register') {
      if (!name) return setToast('❌ Full name is required');
      if (!phone) return setToast('❌ Mobile number is required');
      if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw))
        return setToast('❌ Password must be 8+ characters with 1 uppercase letter and 1 number');
      if (pw !== confirmPw) return setToast('❌ Passwords do not match');
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
        d = await api.register({ name, email, password: pw, role: 'candidate', phone, title, currentCompany, experience: isFresher ? 0 : (experience ? Number(experience) : undefined), isFresher, availability, industry: industry || undefined, department: department || undefined });
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

  // ── OTP Login mode (passwordless) ─────────────────────────────────────────
  if (otpMode && mode === 'login') return (
    <div style={{ ...BG, alignItems: 'flex-start', paddingTop: 'clamp(20px, 5vw, 40px)', paddingBottom: 'clamp(20px, 5vw, 40px)' }}>
      <Toast msg={toast} onClose={() => setToast('')} />
      <div style={CARD}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20 }}>
              <Logo size="lg" variant="full" theme="dark" />
            </div>
          </div>
          <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 900, margin: '0 0 6px' }}>
            {otpStep === 'otp' ? '📱 Enter Your OTP' : otpStep === 'no-account' ? '🔍 No Account Found' : '🔐 Login with OTP'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>
            {otpStep === 'otp' ? otpHint || 'A 6-digit code was sent to your registered contact'
              : otpStep === 'no-account' ? `No account found for ${otpEmail}`
              : 'No password needed — we\'ll send a code to your email'}
          </p>
        </div>

        {loginError && (
          <div style={{ background: 'rgba(186,5,23,0.07)', border: '1px solid rgba(186,5,23,0.25)', borderRadius: 10, padding: '10px 14px', color: '#FF7676', fontSize: 13, marginBottom: 14 }}>
            {loginError}
          </div>
        )}

        {/* No account found */}
        {otpStep === 'no-account' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
              <p style={{ color: '#F59E0B', fontSize: 14, fontWeight: 700, margin: '0 0 6px' }}>No account with this email</p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                <strong style={{ color: '#fff' }}>{otpEmail}</strong><br/>is not registered on TalentNest HR.
              </p>
            </div>
            <button onClick={() => { resetOtpMode(); setMode('register'); setEmail(otpEmail); }} style={{ ...BTN_P, width: '100%', padding: '14px', fontSize: 15 }}>
              🚀 Create a Free Account
            </button>
            <button onClick={() => { setOtpStep('email'); setLoginError(''); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', textAlign: 'center', padding: '8px 0' }}>
              ← Try a different email
            </button>
          </div>
        )}

        {/* Email entry step */}
        {otpStep === 'email' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>YOUR EMAIL ADDRESS</label>
              <input type="email" value={otpEmail} autoFocus autoComplete="email"
                onChange={e => { setOtpEmail(e.target.value); setLoginError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleSendLoginOtp()}
                placeholder="you@example.com" style={INP}
                onFocus={e => { e.target.style.borderColor = '#0176D3'; e.target.style.boxShadow = '0 0 0 3px rgba(1,118,211,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
              />
            </div>
            <button onClick={handleSendLoginOtp} disabled={loading} style={{ ...BTN_P, width: '100%', padding: '14px', opacity: loading ? 0.7 : 1 }}>
              {loading ? <><Spinner /> Checking…</> : '📩 Send OTP to My Email'}
            </button>
            <button onClick={resetOtpMode} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', textAlign: 'center', padding: '8px 0' }}>
              ← Back to Password Login
            </button>
          </div>
        )}

        {/* OTP entry step */}
        {otpStep === 'otp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', margin: 0 }}>
              Code sent to <strong style={{ color: '#fff' }}>{otpEmail}</strong>
            </p>
            {/* 6 individual digit boxes — large touch targets */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {otpDigits.map((d, i) => (
                <input key={i} ref={otpRefs[i]}
                  type="tel" inputMode="numeric" maxLength={1} value={d}
                  autoFocus={i === 0}
                  onChange={e => handleOtpDigit(i, e.target.value, e)}
                  onKeyDown={e => { if (e.key === 'Backspace' && !d && i > 0) { const nd=[...otpDigits]; nd[i-1]=''; setOtpDigits(nd); otpRefs[i-1]?.current?.focus(); } }}
                  onPaste={e => {
                    const p = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
                    if (!p) return;
                    const nd = [...p.split('').concat(['','','','','','']).slice(0,6)];
                    setOtpDigits(nd);
                    otpRefs[Math.min(p.length, 5)]?.current?.focus();
                    e.preventDefault();
                  }}
                  style={{ width: 48, height: 58, fontSize: 26, fontWeight: 900, textAlign: 'center',
                    background: d ? '#0176D315' : '#0D1B2D',
                    border: `2px solid ${d ? '#0176D3' : 'rgba(255,255,255,0.12)'}`,
                    borderRadius: 12, color: '#fff', outline: 'none',
                    boxSizing: 'border-box', fontFamily: 'monospace', caretColor: '#0176D3',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#0176D3'; e.target.style.boxShadow = '0 0 0 3px rgba(1,118,211,0.2)'; }}
                  onBlur={e => { e.target.style.borderColor = d ? '#0176D3' : 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'; }}
                />
              ))}
            </div>
            <button onClick={handleVerifyLoginOtp} disabled={loading || otpDigits.join('').length < 6}
              style={{ ...BTN_P, width: '100%', padding: '14px', opacity: loading || otpDigits.join('').length < 6 ? 0.6 : 1 }}>
              {loading ? <><Spinner /> Verifying…</> : '✅ Verify & Sign In'}
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: -4 }}>
              <button onClick={() => { setOtpStep('email'); setOtpDigits(['','','','','','']); setLoginError(''); }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', padding: 0 }}>
                ← Change email
              </button>
              <button onClick={handleResendLoginOtp} disabled={otpResendCooldown > 0 || loading}
                style={{ background: 'none', border: 'none', color: otpResendCooldown > 0 ? 'rgba(255,255,255,0.3)' : '#0176D3', fontSize: 13, cursor: otpResendCooldown > 0 ? 'default' : 'pointer', padding: 0, fontWeight: 600 }}>
                {otpResendCooldown > 0 ? `Resend in ${otpResendCooldown}s` : 'Resend OTP'}
              </button>
            </div>
          </div>
        )}

        <button onClick={resetOtpMode} style={{ display: 'block', width: '100%', textAlign: 'center', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer', marginTop: 20, padding: '8px 0' }}>
          ← Back to Password Login
        </button>
      </div>
    </div>
  );

  return (
    <div className="tn-auth-dark" style={{ ...BG, alignItems: 'flex-start', paddingTop: 'clamp(20px, 5vw, 40px)', paddingBottom: 'clamp(20px, 5vw, 40px)' }}>
      <Toast msg={toast} onClose={() => setToast('')} />
      <div style={CARD}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{
              padding: '12px 24px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 20,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Logo size="lg" variant="full" theme="dark" />
            </div>
          </div>
          <div style={{ height: 1, width: '100%', background: 'rgba(255,255,255,0.05)', marginBottom: 24 }} />
          <h2 style={{ color: '#FFFFFF', fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Job Seeker</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '4px 0 0' }}>Access your personalized career portal</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 4, border: '1px solid rgba(255,255,255,0.06)' }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => { setMode(m); setToast(''); }} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: mode === m ? '#0176D3' : 'transparent', color: mode === m ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s' }}>
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>FULL NAME *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" style={INP} autoComplete="off" onFocus={e => { e.target.style.borderColor = '#0176D3'; e.target.style.boxShadow = '0 0 0 3px rgba(1,118,211,0.1)'; }} onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }} />
              </div>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>MOBILE NUMBER *</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" style={INP} autoComplete="tel" onFocus={e => { e.target.style.borderColor = '#0176D3'; e.target.style.boxShadow = '0 0 0 3px rgba(1,118,211,0.1)'; }} onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }} />
              </div>
              {/* Fresher toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, border: `1.5px solid ${isFresher ? '#10B981' : 'rgba(255,255,255,0.12)'}`, background: isFresher ? 'rgba(16,185,129,0.12)' : '#0D1B2D', cursor: 'pointer' }}>
                <input type="checkbox" checked={isFresher} onChange={e => {
                  const checked = e.target.checked;
                  setIsFresher(checked);
                  if (checked) setExperience('0');
                }} style={{ width: 18, height: 18, accentColor: '#10B981', flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>I'm a fresher (no work experience yet)</span>
              </label>
              {/* Professional details — auto stacks to single column on mobile */}
              {!isFresher && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>CURRENT TITLE</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Software Engineer" style={INP} />
                </div>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>CURRENT COMPANY</label>
                  <input value={currentCompany} onChange={e => setCompany(e.target.value)} placeholder="e.g. Infosys" style={INP} />
                </div>
              </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                {!isFresher && (
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>EXPERIENCE (YRS)</label>
                  <select value={experience} onChange={e => setExperience(e.target.value)} style={{ ...INP, cursor: 'pointer', color: experience ? '#FFFFFF' : '#9CA3AF' }}>
                    <option value="">Select…</option>
                    {['0','1','2','3','4','5','6','7','8','9','10','12','15','18','20','25'].map(y => (
                      <option key={y} value={y}>{y === '0' ? 'Fresher' : `${y} yr${y !== '1' ? 's' : ''}`}</option>
                    ))}
                  </select>
                </div>
                )}
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>AVAILABILITY</label>
                  <select value={availability} onChange={e => setAvailability(e.target.value)} style={{ ...INP, cursor: 'pointer', color: availability ? '#FFFFFF' : '#9CA3AF' }}>
                    <option value="">Select…</option>
                    <option value="immediate">Immediate</option>
                    <option value="15 days">15 Days Notice</option>
                    <option value="30 days">30 Days Notice</option>
                    <option value="45 days">45 Days Notice</option>
                    <option value="60 days">60 Days Notice</option>
                    <option value="90 days">90 Days Notice</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>INDUSTRY</label>
                  <select value={industry} onChange={e => setIndustry(e.target.value)} style={{ ...INP, cursor: 'pointer', color: industry ? '#FFFFFF' : '#9CA3AF' }}>
                    <option value="">Select industry…</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>DEPARTMENT</label>
                  <select value={department} onChange={e => setDepartment(e.target.value)} style={{ ...INP, cursor: 'pointer', color: department ? '#FFFFFF' : '#9CA3AF' }}>
                    <option value="">Select department…</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>WORK EMAIL *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={INP} autoComplete="email" onFocus={e => { e.target.style.borderColor = '#0176D3'; e.target.style.boxShadow = '0 0 0 3px rgba(1,118,211,0.1)'; }} onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }} />
          </div>

          <div>
            <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>PASSWORD *</label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" style={{ ...INP, paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, zIndex: 20 }}>
                <EyeIcon visible={showPw} />
              </button>
            </div>
            {mode === 'register' && <PasswordStrength pw={pw} />}
          </div>

          {mode === 'register' && (
            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>CONFIRM PASSWORD *</label>
              <div style={{ position: 'relative' }}>
                <input type={showConfirmPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="••••••••" style={{ ...INP, paddingRight: 44, borderColor: confirmPw && pw !== confirmPw ? '#EF4444' : '' }} autoComplete="new-password" />
                <button type="button" onClick={() => setShowConfirmPw(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, zIndex: 20 }}>
                  <EyeIcon visible={showConfirmPw} />
                </button>
              </div>
              {confirmPw && pw !== confirmPw && <p style={{ color: '#EF4444', fontSize: 12, marginTop: 5 }}>Passwords do not match</p>}
            </div>
          )}

          {mode === 'register' && (
            <>
              {/* Mobile-friendly T&C tap card — large touch target, clear visual state */}
              <div
                role="checkbox"
                aria-checked={agreed}
                onClick={() => setAgreed(a => !a)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  padding: '13px 16px', borderRadius: 12,
                  border: `2px solid ${agreed ? '#0176D3' : 'rgba(255,255,255,0.1)'}`,
                  background: agreed ? 'rgba(1,118,211,0.08)' : 'rgba(255,255,255,0.03)',
                  transition: 'all 0.2s', userSelect: 'none',
                }}>
                {/* Custom checkbox box */}
                <div style={{
                  width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                  border: `2px solid ${agreed ? '#0176D3' : 'rgba(255,255,255,0.2)'}`,
                  background: agreed ? '#0176D3' : 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {agreed && <span style={{ color: '#fff', fontSize: 14, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.5, flex: 1 }}>
                  I agree to the{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ color: '#0176D3', fontWeight: 700, textDecoration: 'none', borderBottom: '1px solid rgba(1,118,211,0.3)' }}>
                    Terms of Service
                  </a>
                  {' '}and{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ color: '#0176D3', fontWeight: 700, textDecoration: 'none', borderBottom: '1px solid rgba(1,118,211,0.3)' }}>
                    Privacy Policy
                  </a>
                </span>
              </div>
            </>
          )}

          {mode === 'login' && loginError && (
            <div style={{ background: 'rgba(186,5,23,0.07)', border: '1px solid rgba(186,5,23,0.25)', borderRadius: 10, padding: '10px 14px', color: '#BA0517', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>⚠</span> {loginError}
            </div>
          )}

          <button onClick={submit} disabled={loading} style={{ ...BTN_P, width: '100%', padding: '13px 0', marginTop: 4, opacity: loading ? 0.7 : 1 }}>
            {loading ? <><Spinner /> Please wait…</> : mode === 'login' ? '→ Sign In' : '🚀 Create Account'}
          </button>

          {/* OTP Login toggle — only shown on login mode */}
          {mode === 'login' && (
            <button
              type="button"
              onClick={() => { setOtpMode(true); setOtpEmail(email); setLoginError(''); setToast(''); }}
              style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%', padding: '11px 0', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(1,118,211,0.5)'; e.currentTarget.style.color = '#0176D3'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
            >
              📱 Login with OTP instead
            </button>
          )}
        </div>

        {GOOGLE_CLIENT_ID && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 14px' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
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

        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', marginTop: 12 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <span onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ color: '#0176D3', cursor: 'pointer', fontWeight: 700 }}>
            {mode === 'login' ? 'Register free' : 'Sign in'}
          </span>
        </p>
      </div>
    </div>
  );
}

// ── Forgot Password Form — OTP flow ──────────────────────────────────────────
function ForgotPasswordForm({ onBack }) {
  const navigate              = useNavigate();
  const [email, setEmail]     = useState('');
  const [otp, setOtp]         = useState('');
  const [step, setStep]       = useState('email'); // email | otp | done
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = [useRef(),useRef(),useRef(),useRef(),useRef(),useRef()];

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const sendOtp = async () => {
    if (!email.trim()) return setToast('❌ Enter your email address');
    setLoading(true);
    try {
      await api.sendResetOtp(email.trim());
      setStep('otp');
      setResendCooldown(60);
    } catch (e) { setToast('❌ ' + e.message); }
    setLoading(false);
  };

  const verifyOtp = async () => {
    if (otp.length < 6) return setToast('❌ Enter the 6-digit OTP');
    setLoading(true);
    try {
      const res = await api.verifyResetOtp(email.trim(), otp);
      // Navigate to set-password page with the token
      navigate(`/set-password?token=${encodeURIComponent(res.token)}&email=${encodeURIComponent(email.trim())}&mode=reset`);
    } catch (e) { setToast('❌ ' + e.message); otp && setOtp(''); }
    setLoading(false);
  };

  // Handle OTP digit input with auto-focus
  const handleOtpKey = (idx, value, e) => {
    if (!/^\d*$/.test(value)) return;
    const digits = otp.split('');
    digits[idx] = value.slice(-1);
    const next = digits.join('');
    setOtp(next);
    if (value && idx < 5) otpRefs[idx + 1].current?.focus();
    if (e.key === 'Backspace' && !value && idx > 0) otpRefs[idx - 1].current?.focus();
  };

  return (
    <div style={BG}>
      <Toast msg={toast} onClose={() => setToast('')} />
      <div style={CARD}>
        <button onClick={step === 'otp' ? () => setStep('email') : onBack} style={{ background: 'none', border: 'none', color: '#0176D3', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 20 }}>
          ← {step === 'otp' ? 'Change email' : 'Back to Login'}
        </button>

        {step === 'email' && (
          <>
            <h2 style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>Reset Password</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '0 0 24px', lineHeight: 1.6 }}>
              Enter your registered email. We'll send a 6-digit OTP to verify it's you.
            </p>
            <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>EMAIL ADDRESS *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendOtp()}
              placeholder="you@example.com"
              style={{ ...INP, marginBottom: 16 }}
              autoFocus
            />
            <button onClick={sendOtp} disabled={loading} style={{ ...BTN_P, width: '100%', padding: '13px 0', opacity: loading ? 0.7 : 1 }}>
              {loading ? <><Spinner /> Sending OTP…</> : '📧 Send OTP'}
            </button>
          </>
        )}

        {step === 'otp' && (
          <>
            <h2 style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>Enter OTP</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '0 0 6px', lineHeight: 1.6 }}>
              We sent a 6-digit code to <strong style={{ color: '#FFFFFF' }}>{email}</strong>
            </p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '0 0 24px' }}>Check your inbox (and spam folder). Valid for 10 minutes.</p>

            {/* OTP digit boxes */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
              {[0,1,2,3,4,5].map(i => (
                <input
                  key={i}
                  ref={otpRefs[i]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp[i] || ''}
                  onChange={e => handleOtpKey(i, e.target.value, e)}
                  onKeyDown={e => { if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs[i-1].current?.focus(); }}
                  style={{
                    width: 46, height: 54,
                    textAlign: 'center',
                    fontSize: 22,
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    border: `2px solid ${otp[i] ? '#0176D3' : '#E2E8F0'}`,
                    borderRadius: 10,
                    outline: 'none',
                    background: otp[i] ? 'rgba(1,118,211,0.06)' : '#fff',
                    color: '#0176D3',
                    transition: 'all 0.15s',
                  }}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <button
              onClick={verifyOtp}
              disabled={loading || otp.length < 6}
              style={{ ...BTN_P, width: '100%', padding: '13px 0', marginBottom: 12, opacity: (loading || otp.length < 6) ? 0.6 : 1 }}
            >
              {loading ? <><Spinner /> Verifying…</> : '🔓 Verify OTP & Continue'}
            </button>

            <div style={{ textAlign: 'center' }}>
              {resendCooldown > 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>Resend in {resendCooldown}s</p>
              ) : (
                <button
                  onClick={async () => { setOtp(''); await sendOtp(); }}
                  style={{ background: 'none', border: 'none', color: '#0176D3', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                >
                  🔄 Resend OTP
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Reset Password Form (shown when ?token=...&email=... in URL) ──────────────
function ResetPasswordForm({ token, email: initEmail, onBack }) {
  const [pw, setPw]           = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [toast, setToast]     = useState('');

  const submit = async () => {
    if (!pw) return setToast('❌ Password required');
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
        <h2 style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>Set New Password</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '0 0 24px' }}>for <strong>{initEmail}</strong></p>

        {done ? (
          <div style={{ background: 'rgba(46,132,74,0.08)', border: '1px solid rgba(46,132,74,0.3)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
            <p style={{ color: '#2E844A', fontWeight: 700, margin: '0 0 6px' }}>Password updated!</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>You can now sign in with your new password.</p>
            <button onClick={onBack} style={{ ...BTN_P, marginTop: 20, padding: '10px 24px' }}>Go to Login</button>
          </div>
        ) : (
          <>
            <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>NEW PASSWORD *</label>
            <div style={{ position: 'relative', marginBottom: 4 }}>
              <input type={showPw ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" style={{ ...INP, paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, zIndex: 20 }}>
                <EyeIcon visible={showPw} />
              </button>
            </div>
            <PasswordStrength pw={pw} />
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
  const [loginError, setLoginError] = useState('');

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
    setLoading(true); setLoginError('');
    try {
      const d = await api.login(e, p);
      if (d.mustChangePassword) {
        navigate(`/set-password?token=${d.changePasswordToken}&email=${encodeURIComponent(d.email)}&mode=change`);
        return;
      }
      if (d.requires2FA) { setPending2FA({ email: d.email }); setLoading(false); return; }
      if (d.user.role === 'candidate') {
        setLoginError('This is a Job Seeker account. Please use Job Seeker login instead.');
        setLoading(false); return;
      }
      onAuth(d.user, d.token);
      navigate('/app');
    } catch (err) {
      const msg = err.message || 'Something went wrong';
      if (msg.includes('locked')) {
        setLoginError(msg);
      } else if (msg.includes('Invalid email or password') || msg.includes('401')) {
        setLoginError('Incorrect email or password. Please try again.');
      } else {
        setLoginError(msg);
      }
    }
    setLoading(false);
  };

  const submit = async () => {
    setLoginError('');
    if (!email) { setLoginError('Work email is required'); return; }
    if (!pw) { setLoginError('Password is required'); return; }
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
    <div className="tn-auth-dark" style={{ ...BG, alignItems: 'flex-start', paddingTop: 'clamp(20px, 5vw, 40px)', paddingBottom: 'clamp(20px, 5vw, 40px)' }}>
      <Toast msg={toast} onClose={() => setToast('')} />
      <div style={CARD}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Logo size="lg" variant="full" theme="dark" />
            </div>
          </div>
          <div style={{ height: 1, width: '100%', background: 'rgba(255,255,255,0.06)', marginBottom: 24 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
            <button onClick={step === 2 ? () => setStep(1) : onBack} style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 10, color: 'rgba(255,255,255,0.6)', fontSize: 14, cursor: 'pointer', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <h2 style={{ color: '#FFFFFF', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Employer</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '2px 0 0' }}>
                {step === 1 ? 'Verify your organization' : 'Sign in to recruitment portal'}
              </p>
            </div>
            {/* Step dots */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[1,2].map(s => (
                <div key={s} style={{ width: s === step ? 20 : 8, height: 8, borderRadius: 4, background: s === step ? '#0176D3' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }} />
              ))}
            </div>
          </div>
        </div>

        {/* ── STEP 1: Company Domain Verification ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                Enter your <strong>company website</strong> to verify your organisation is registered on TalentNest HR.
              </p>
            </div>

            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>COMPANY WEBSITE *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>🌐</span>
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
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '6px 0 0' }}>e.g. talentnesthr.com · acmecorp.com · yourcompany.in</p>
            </div>

            {/* Result: not checked yet */}
            {!orgInfo && !domainChecking && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: 0 }}>Enter your company website above and click <strong>Verify</strong></p>
              </div>
            )}

            {/* Result: verified ✅ */}
            {orgInfo?.found && !orgInfo?.suspended && (
              <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 12, padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏢</div>
                  <div>
                    <p style={{ color: '#34D399', fontSize: 14, fontWeight: 800, margin: 0 }}>✅ {orgInfo.org?.name}</p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: '2px 0 0' }}>Organisation verified and active</p>
                  </div>
                  <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, textTransform: 'capitalize', border: '1px solid rgba(255,255,255,0.1)' }}>
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
                <p style={{ color: '#BA0517', fontSize: 13, fontWeight: 700, margin: '0 0 6px' }}>❌ Organization Not Registered</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '0 0 10px', lineHeight: 1.5 }}>
                  <strong>{companyUrl}</strong> is not registered on TalentNest HR. To use the platform as a recruiter, please ask your administrator to create an account from the Contact Us form.
                </p>
                <a href="mailto:hr@talentnesthr.com" style={{ color: '#0176D3', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                  📧 hr@talentnesthr.com — Contact Administrator
                </a>
              </div>
            )}

            {/* Result: suspended ⛔ */}
            {orgInfo?.suspended && (
              <div style={{ background: 'rgba(186,5,23,0.06)', border: '1px solid rgba(186,5,23,0.3)', borderRadius: 12, padding: '14px 16px' }}>
                <p style={{ color: '#BA0517', fontSize: 13, fontWeight: 700, margin: '0 0 4px' }}>⛔ Account Suspended</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>{orgInfo.suspendedReason}</p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Login ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Org badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px' }}>
              <span style={{ fontSize: 18 }}>🏢</span>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#3170F3', fontSize: 12, fontWeight: 800, margin: 0 }}>{orgInfo?.org?.name}</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: '1px 0 0' }}>Verified organisation · {orgInfo?.org?.plan} plan</p>
              </div>
              <span style={{ color: '#34D399', fontSize: 18 }}>✅</span>
            </div>

            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>WORK EMAIL *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={`hr@${companyUrl.replace(/^www\./,'')}`} style={INP} autoFocus />
            </div>

            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6, letterSpacing: '0.5px' }}>PASSWORD *</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="••••••••" style={{ ...INP, paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, zIndex: 20 }}>
                <EyeIcon visible={showPw} />
              </button>
              </div>
            </div>

            {loginError && (
              <div style={{ background: 'rgba(186,5,23,0.07)', border: '1px solid rgba(186,5,23,0.25)', borderRadius: 10, padding: '10px 14px', color: '#BA0517', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚠</span> {loginError}
              </div>
            )}

            <button onClick={submit} disabled={loading} style={{ ...BTN_P, width: '100%', padding: '13px 0', marginTop: 4, opacity: loading ? 0.7 : 1 }}>
              {loading ? <><Spinner /> Signing in…</> : '→ Sign In to Portal'}
            </button>

            {GOOGLE_CLIENT_ID && (
              <div style={{ marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 12px' }}>
                  <div style={{ flex: 1, height: 1, background: '#FAFAF9' }} />
                  <span style={{ color: '#FFFFFF', fontSize: 11 }}>or</span>
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
    
    // SECURITY: Block public domains for recruiters
    const PUBLIC_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'zoho.com', 'protonmail.com', 'yandex.com', 'rediffmail.com', 'live.com', 'msn.com', 'mail.com', 'gmx.com'];
    const domainPart = form.email.split('@')[1]?.toLowerCase();
    if (PUBLIC_DOMAINS.includes(domainPart)) {
      return setToast('❌ Public email domains (Gmail/Yahoo/etc) are not allowed for recruiters. Please use your corporate email or ask your administrator to create an account from the Contact Us form.');
    }
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
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>🏢</span>
        <div>
          <p style={{ color: '#3170F3', fontSize: 12, fontWeight: 800, margin: 0 }}>{orgInfo?.org?.name || companyUrl}</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: '1px 0 0' }}>Registering as Recruiter</p>
        </div>
      </div>
      {[
        { key: 'name',     label: 'FULL NAME *',     type: 'text',     ph: 'Your full name' },
        { key: 'email',    label: 'WORK EMAIL *',     type: 'email',    ph: `recruiter@${(companyUrl||'').replace(/^www\./,'')}` },
      ].map(f => (
        <div key={f.key}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>{f.label}</label>
          <input type={f.type} value={form[f.key]} onChange={e => sf(f.key, e.target.value)} placeholder={f.ph} style={INP} />
        </div>
      ))}
      <div>
        <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>PASSWORD *</label>
        <div style={{ position: 'relative' }}>
          <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => sf('password', e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="Min 8 chars, 1 uppercase, 1 number" style={{ ...INP, paddingRight: 44 }} />
          <button type="button" onClick={() => setShow(!showPw)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, zIndex: 20 }}>
            <EyeIcon visible={showPw} />
          </button>
        </div>
        <PasswordStrength pw={form.password} />
      </div>
      <button onClick={submit} disabled={loading} style={{ ...BTN_P, width: '100%', padding: '13px 0', opacity: loading ? 0.7 : 1 }}>
        {loading ? <><Spinner /> Creating account…</> : '🚀 Create Recruiter Account'}
      </button>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textAlign: 'center', margin: 0 }}>
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
  const [lastAuthScreen, setLastAuthScreen] = useState('candidate');
  const [prefill, setPrefill] = useState(null);
  const [resetParams, setResetParams] = useState({ token: '', email: '' });

  // Check URL params on mount — handles password reset AND career apply prefill
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('token');
    const email  = params.get('email');
    const ref    = params.get('ref');
    const pName  = params.get('name');
    if (token && email) {
      setResetParams({ token, email });
      setScreen('reset');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (ref === 'career_apply' && email) {
      // Career page applicant → go to candidate registration with email + name prefilled
      setPrefill({ email, name: pName || '', mode: 'register' });
      setScreen('candidate');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleSelect = (type, pf = null) => {
    setPrefill(pf);
    const next = type === 'candidate' ? 'candidate' : 'employer';
    setLastAuthScreen(next);
    setScreen(next);
  };

  const openForgot = (from) => {
    setLastAuthScreen(from);
    setScreen('forgot');
  };

  if (screen === 'forgot') return <ForgotPasswordForm onBack={() => setScreen(lastAuthScreen)} />;
  if (screen === 'reset')  return <ResetPasswordForm token={resetParams.token} email={resetParams.email} onBack={() => setScreen('candidate')} />;
  if (screen === 'candidate') return <CandidateForm onAuth={onAuth} onBack={() => setScreen('entry')} onForgot={() => openForgot('candidate')} navigate={navigate} prefill={prefill} />;
  if (screen === 'employer')  return <EmployerForm  onAuth={onAuth} onBack={() => setScreen('entry')} onForgot={() => openForgot('employer')} navigate={navigate} prefill={prefill} />;
  return <EntryScreen onSelect={handleSelect} navigate={navigate} />;
}
