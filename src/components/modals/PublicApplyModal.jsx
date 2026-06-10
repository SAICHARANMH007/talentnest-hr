import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import Spinner from '../ui/Spinner.jsx';
import Field from '../ui/Field.jsx';
import Modal from '../ui/Modal.jsx';
import { requestGeolocation } from '../../utils/geolocation.js';
import { INDUSTRIES, DEPARTMENTS } from '../../constants/picklists.js';
import { getCompanyCareerUrl } from '../../utils/url.js';
import { useMarketingTheme } from '../../context/MarketingThemeContext.jsx';

/* ── Theme tokens for this modal — adapts fields/cards/text to light, dark & ocean themes ── */
function applyModalTokens(themeId, theme) {
  if (themeId === 'light' || !theme) {
    return {
      cardBg: '#fff', surfaceBg: '#fff', text: '#111827', textHeading: '#111827',
      textMuted: '#64748B', textFaint: '#94A3B8', placeholder: '#94A3B8',
      border: '#CBD5E1', borderSubtle: '#E2E8F0',
      highlightBg: '#F0FDF4', highlightBorder: '#059669',
      closeBg: '#F1F5F9', closeText: '#374151', chipBg: '#F8FAFC',
    };
  }
  return {
    cardBg: theme.cardBg, surfaceBg: theme.surfaceBg, text: theme.textPrimary, textHeading: theme.textHeading,
    textMuted: theme.textSecondary, textFaint: theme.textMuted, placeholder: theme.textMuted,
    border: theme.cardBorder, borderSubtle: theme.cardBorder,
    highlightBg: 'rgba(16,185,129,0.16)', highlightBorder: '#10B981',
    closeBg: theme.surfaceBg, closeText: theme.textSecondary, chipBg: theme.surfaceBg,
  };
}

/* ── Mobile-optimised field components (local to this modal) ── */
function MField({ label, value, onChange, onBlur, type = 'text', placeholder, highlight, suffix, t }) {
  const tk = t || applyModalTokens('light');
  const base = { width: '100%', padding: '14px 16px', borderRadius: 10, border: `1.5px solid ${highlight ? tk.highlightBorder : tk.border}`, fontSize: 16, background: highlight ? tk.highlightBg : tk.surfaceBg, color: tk.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
  return (
    <div>
      <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: tk.textHeading, marginBottom: 6 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input type={type} value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder} style={base} />
        {suffix && <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>{suffix}</div>}
      </div>
    </div>
  );
}
function MSelect({ label, value, onChange, options = [], highlight, t }) {
  const tk = t || applyModalTokens('light');
  return (
    <div>
      <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: tk.textHeading, marginBottom: 6 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '14px 16px', borderRadius: 10, border: `1.5px solid ${highlight ? tk.highlightBorder : tk.border}`, fontSize: 16, background: highlight ? tk.highlightBg : tk.surfaceBg, color: value ? tk.text : tk.placeholder, outline: 'none', boxSizing: 'border-box', appearance: 'none', WebkitAppearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='9' viewBox='0 0 14 9'%3E%3Cpath d='M1 1l6 6 6-6' stroke='%2364748B' stroke-width='1.8' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 40 }}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

export default function PublicApplyModal({ job, orgName, refToken, onClose }) {
  const navigate = useNavigate();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const { theme, themeId } = useMarketingTheme();
  const isDark = themeId !== 'light';
  const t = applyModalTokens(themeId, theme);
  const surface = { cardBg: t.cardBg, text: t.text, heading: t.textHeading, border: t.borderSubtle, closeBg: t.closeBg, closeText: t.closeText };
  // Accent text colors for tinted info/success/warning boxes — flipped for legibility on dark surfaces
  const accent = {
    successText: isDark ? '#6EE7B7' : '#065f46',
    purpleText:  isDark ? '#C4B5FD' : '#5b21b6',
    amberText:   isDark ? '#FCD34D' : '#92400e',
    blueText:    isDark ? '#93C5FD' : '#032D60',
    redText:     isDark ? '#FCA5A5' : '#B91C1C',
  };
  const [referralInfo, setReferralInfo] = React.useState(null);

  // Fetch referral info to show "referred by" banner
  React.useEffect(() => {
    if (!refToken) return;
    api.getReferralByToken(refToken)
      .then(r => { if (r?.referredByName || r?.referredByEmail) setReferralInfo(r); })
      .catch(() => {});
  }, [refToken]);

  // Pre-fill from sessionStorage if user is already logged in
  const prefill = (() => {
    try {
      const u = sessionStorage.getItem('tn_user');
      if (u) {
        const p = JSON.parse(u);
        return { name: p.name || '', email: p.email || '', phone: p.phone || '', title: p.title || '', currentCompany: p.currentCompany || '', experience: p.experience != null ? String(p.experience) : '', availability: p.availability || '', industry: p.industry || '', department: p.department || '' };
      }
    } catch {}
    return { name: '', email: '' };
  })();

  const questions = job.screeningQuestions || [];
  const [form, setForm] = useState({ name: prefill.name, email: prefill.email, phone: prefill.phone || '', title: prefill.title || '', currentCompany: prefill.currentCompany || '', experience: prefill.experience || '', availability: prefill.availability || '', industry: prefill.industry || '', department: prefill.department || '', coverLetter: '' });
  const [answers, setAnswers] = useState(() => Object.fromEntries(questions.map((_, i) => [i, ''])));
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailFoundMsg, setEmailFoundMsg] = useState('');
  const [prefillState, setPrefillState]   = useState(null); // null | { isRegistered, hasPhone, fields[] }
  const prefillFields = prefillState?.fields || [];
  const [error, setError] = useState('');
  const [createAccount, setCreateAccount] = useState(!!refToken); // auto-check for referred candidates
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | banner | asking | granted | denied
  const [geo, setGeo] = useState(null); // { lat, lng, accuracy, city, country }
  const [assessmentInfo, setAssessmentInfo] = useState(null); // { hasAssessment, assessmentId, title, ... }
  const [notifStatus, setNotifStatus] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  ); // default | granted | denied
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const isPreFilled = !!(prefill.name || prefill.email);

  // Show the location banner first — don't auto-trigger the browser prompt
  useEffect(() => {
    if (!navigator.geolocation) { setGeoStatus('denied'); return; }
    // Show our custom banner so the user understands WHY we want location
    setGeoStatus('banner');
  }, []);

  const requestLocationPermission = () => {
    setGeoStatus('asking');
    requestGeolocation().then(pos => {
      if (pos) { setGeo(pos); setGeoStatus('granted'); }
      else       setGeoStatus('denied');
    });
  };

  // Check if job has an assessment (public endpoint, no auth needed)
  useEffect(() => {
    if (!job?.id && !job?._id) return;
    const jid = job.id || job._id;
    api.getPublicAssessmentForJob(jid)
      .then(r => setAssessmentInfo(r?.hasAssessment ? r : null))
      .catch(() => setAssessmentInfo(null));
  }, [job?.id, job?._id]);

  // When candidate enters their email and blurs out, check if they're registered
  const [userEditedFields, setUserEditedFields] = React.useState(new Set());

  const handleEmailBlur = async () => {
    const email = form.email?.trim();
    if (!email || !/\S+@\S+\.\S+/.test(email)) return;
    setEmailChecking(true);
    setEmailFoundMsg('');
    setPrefillState(null);
    setUserEditedFields(new Set());
    try {
      const r = await api.prefillByEmail(email);
      if (r?.exists && r?.profile) {
        const p = r.profile;
        setForm(prev => {
          const updates = {};
          const filled = [];
          
          const fields = [
            ['name', p.name],
            ['title', p.title],
            ['currentCompany', p.currentCompany],
            ['experience', p.experience],
            ['availability', p.availability],
            ['industry', p.industry],
            ['department', p.department],
          ];

          for (const [key, val] of fields) {
            const isManual = userEditedFields.has(key);
            if (val && (!prev[key] || prev[key] === val || !isManual)) {
              if (prev[key] !== val) updates[key] = val;
              filled.push(key);
            }
          }

          if (Object.keys(updates).length > 0) {
            setPrefillState({ isRegistered: r.isRegisteredUser, hasPhone: r.hasPhone, fields: filled });
            return { ...prev, ...updates };
          }
          
          if (filled.length > 0) {
            setPrefillState({ isRegistered: r.isRegisteredUser, hasPhone: r.hasPhone, fields: filled });
          }
          return prev;
        });
        setEmailFoundMsg(
          r.isRegisteredUser
            ? 'Registered account found — professional details pre-filled below.'
            : 'Profile found — details have been pre-filled. Please verify and complete.'
        );
      } else if (r && !r.exists) {
        setEmailFoundMsg('');
      }
    } catch { /* silent */ }
    setEmailChecking(false);
  };

  // Auto-trigger prefill on mount if email is already present
  useEffect(() => {
    if (form.email && /\S+@\S+\.\S+/.test(form.email)) {
      handleEmailBlur();
    }
  }, []);

  const handlePrefillFieldChange = (fieldName, value) => {
    sf(fieldName, value);
    setUserEditedFields(prev => {
      const next = new Set(prev);
      next.add(fieldName);
      return next;
    });
  };

  const isHighlighted = (fieldName) => prefillFields.includes(fieldName) && !userEditedFields.has(fieldName);

  const submit = async () => {
    if (!form.name?.trim())  { setError('Full name is required.'); return; }
    if (!form.email?.trim()) { setError('Email address is required.'); return; }
    if (!form.phone?.trim()) { setError('Mobile number is required to apply.'); return; }
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (phoneDigits.length < 7) { setError('Please enter a valid mobile number.'); return; }
    if (!form.title?.trim())          { setError('Current title is required.'); return; }
    if (!form.currentCompany?.trim()) { setError('Current company is required.'); return; }
    if (!form.experience && form.experience !== 0) { setError('Please select your experience.'); return; }
    if (!form.availability)           { setError('Please select your availability.'); return; }
    if (!form.industry)               { setError('Please select your industry.'); return; }
    if (!form.department)             { setError('Please select your department.'); return; }
    
    for (let i = 0; i < questions.length; i++) {
      if (questions[i].required && !answers[i]?.trim()) {
        setError(`Please answer: "${questions[i].question}"`);
        return;
      }
    }
    if (createAccount && !agreedTerms) { setError('Please accept the Terms & Conditions to create your account.'); return; }
    if (createAccount) {
      if (!password || password.length < 8) { setError('Password must be at least 8 characters.'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match. Please re-enter.'); return; }
    }
    const screeningAnswers = questions.map((q, i) => ({ question: q.question, answer: answers[i] || '' }));

    let finalGeo = geo;
    let finalGeoStatus = geoStatus;
    if (geoStatus === 'banner' || geoStatus === 'idle') {
      setGeoStatus('asking');
      try {
        const pos = await Promise.race([
          requestGeolocation(),
          new Promise(r => setTimeout(() => r(null), 7000)),
        ]);
        if (pos) { finalGeo = pos; finalGeoStatus = 'granted'; setGeo(pos); setGeoStatus('granted'); }
        else      { finalGeoStatus = 'denied'; setGeoStatus('denied'); }
      } catch { finalGeoStatus = 'denied'; setGeoStatus('denied'); }
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch { }
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = { ...form, screeningAnswers, ...(refToken ? { refToken } : {}) };
      if (finalGeo) {
        payload.geoLat      = finalGeo.lat;
        payload.geoLng      = finalGeo.lng;
        payload.geoAccuracy = finalGeo.accuracy;
        payload.geoCity     = finalGeo.city;
        payload.geoCountry  = finalGeo.country;
      } else {
        payload.geoDeclined = finalGeoStatus === 'denied';
      }
      const applyResult = await api.applyPublic(job.id || job._id, payload);
      const appliedHasAccount = applyResult?.hasAccount === true;
      if (appliedHasAccount !== undefined) setAccountCreated(prev => prev || appliedHasAccount);

      if (createAccount && password) {
        try {
          const regResult = await api.register({
            name: form.name, email: form.email, password,
            phone: form.phone, role: 'candidate',
            title: form.title, currentCompany: form.currentCompany,
            experience: form.experience ? Number(form.experience) : undefined,
            availability: form.availability,
            companyName: orgName || 'TalentNest HR',
          });
          if (regResult?.token && regResult?.user) {
            sessionStorage.setItem('tn_token', regResult.token);
            sessionStorage.setItem('tn_user', JSON.stringify(regResult.user));
            try {
              const { setToken } = await import('../../api/client.js');
              setToken(regResult.token);
            } catch { }
            if (typeof window.tn_refreshUser === 'function') {
              window.tn_refreshUser(regResult.user);
            }
            const hasExternal = !!getCompanyCareerUrl(job.externalUrl);
            if (!hasExternal) {
              setAccountCreated(true);
              setDone(true);
              setSubmitting(false);
              setTimeout(() => { navigate('/app/applications'); }, 2000);
              return;
            }
          }
          setAccountCreated(true);
        } catch (regErr) {
          if (regErr.message?.toLowerCase().includes('already registered')) {
            setEmailFoundMsg('ℹ️ This email is already registered. Your application has been saved — log in to track it.');
          }
        }
      }
      setDone(true);
      const companyCareerUrl = getCompanyCareerUrl(job.externalUrl);
      if (companyCareerUrl) {
        setTimeout(() => window.open(companyCareerUrl, '_blank', 'noopener,noreferrer'), 1200);
      }
    } catch (e) {
      setError(e.message);
    }
    setSubmitting(false);
  };

  if (done) return (
    <Modal title={getCompanyCareerUrl(job.externalUrl) ? '✅ Profile Saved!' : 'Application Submitted!'} onClose={onClose} surface={surface}>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>{accountCreated ? '🎊' : getCompanyCareerUrl(job.externalUrl) ? '🚀' : '🎉'}</div>
        <p style={{ color: t.text, fontSize: 17, fontWeight: 700 }}>
          {accountCreated ? `Account created & application submitted!` : `Thank you, ${form.name}!`}
        </p>

        {!createAccount && accountCreated && (
          <div style={{ background: isDark ? 'rgba(16,185,129,0.12)' : 'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(5,150,105,0.04))', border: `1px solid rgba(16,185,129,${isDark ? 0.4 : 0.3})`, borderRadius: 10, padding: '14px 18px', marginBottom: 12, textAlign: 'left' }}>
            <p style={{ color: accent.successText, fontSize: 14, fontWeight: 800, margin: '0 0 4px' }}>✅ Account identified! Job added to your pipeline.</p>
            <p style={{ color: t.textMuted, fontSize: 12, margin: '0 0 10px', lineHeight:1.6 }}>
              We found your TalentNest account. <b>{job.title}</b> has been added to your pipeline automatically.
            </p>
            <a href="/app/applications" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#0176D3,#014486)', color: '#fff', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              📋 Track My Application →
            </a>
          </div>
        )}

        {createAccount && accountCreated && (
          <div style={{ background: isDark ? 'rgba(16,185,129,0.12)' : 'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(5,150,105,0.04))', border: `1px solid rgba(16,185,129,${isDark ? 0.4 : 0.3})`, borderRadius: 10, padding: '14px 18px', marginBottom: 12, textAlign: 'left' }}>
            <p style={{ color: accent.successText, fontSize: 14, fontWeight: 800, margin: '0 0 4px' }}>✅ Account created! Signing you in…</p>
            <p style={{ color: t.textMuted, fontSize: 15, lineHeight: 1.6, margin: '0 0 24px' }}>
              Your application for <strong>{job.title}</strong> has been successfully saved {orgName ? <>with <strong>{orgName}</strong></> : ''}. Redirecting to your dashboard…
            </p>
            <a href="/app/applications" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#0176D3,#014486)', color: '#fff', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              📋 Go to My Applications →
            </a>
          </div>
        )}
        {assessmentInfo?.hasAssessment && (accountCreated || !!prefill.email) && (
          <div style={{ background: isDark ? 'rgba(124,58,237,0.14)' : 'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(109,40,217,0.04))', border: `1px solid rgba(124,58,237,${isDark ? 0.4 : 0.25})`, borderRadius: 10, padding: '14px 18px', marginBottom: 12, textAlign: 'left' }}>
            <p style={{ color: accent.purpleText, fontSize: 14, fontWeight: 800, margin: '0 0 4px' }}>📝 Assessment Required</p>
            <p style={{ color: t.textMuted, fontSize: 12, margin: '0 0 8px', lineHeight: 1.6 }}>
              <b>{assessmentInfo.title}</b>{assessmentInfo.timeLimitMins > 0 ? ` · ⏱ ${assessmentInfo.timeLimitMins} minutes` : ''}{assessmentInfo.questionCount > 0 ? ` · ${assessmentInfo.questionCount} questions` : ''}
            </p>
            <a href={`/app/assessment/${assessmentInfo.assessmentId}`}
              style={{ display: 'inline-block', background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', color: '#fff', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              🚀 Start Assessment →
            </a>
            <p style={{ color: t.textFaint, fontSize: 11, margin: '6px 0 0' }}>Complete this assessment to advance your application faster.</p>
          </div>
        )}

        {getCompanyCareerUrl(job.externalUrl) ? (
          <>
            <p style={{ color: t.textMuted, fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
              Your profile for <b>{job.title}</b> at <b>{job.company || job.companyName || orgName || 'TalentNest HR'}</b> has been saved with us.
            </p>
            <div style={{ background: isDark ? 'rgba(245,158,11,0.14)' : 'linear-gradient(135deg,rgba(245,158,11,0.08),rgba(245,158,11,0.04))', border: `1px solid rgba(245,158,11,${isDark ? 0.4 : 0.25})`, borderRadius: 10, padding: '12px 16px', marginTop: 12 }}>
              <p style={{ color: accent.amberText, fontSize: 13, margin: 0, fontWeight: 600 }}>
                🌐 Redirecting you to {job.company || job.companyName}'s careers page…
              </p>
              <a href={getCompanyCareerUrl(job.externalUrl)} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', marginTop: 10, background: 'linear-gradient(135deg,#F59E0B,#d97706)', color: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                Open Careers Page →
              </a>
            </div>
          </>
        ) : (
          <p style={{ color: t.textMuted, fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
            Your application for <b>{job.title}</b> at <b>{job.company || job.companyName || orgName || 'TalentNest HR'}</b> has been received.
            The recruiting team will review your profile and get in touch shortly.
          </p>
        )}
        <div style={{ background: isDark ? 'rgba(0,180,216,0.1)' : 'linear-gradient(135deg,rgba(1,118,211,0.06),rgba(1,118,211,0.03))', border: `1px solid rgba(${isDark ? '0,180,216' : '1,118,211'},${isDark ? 0.3 : 0.2})`, borderRadius:10, padding:'14px 18px', marginTop:14, textAlign:'left' }}>
          <p style={{ color: accent.blueText, fontSize:13, fontWeight:700, margin:'0 0 6px' }}>📬 Check your inbox!</p>
          <p style={{ color: t.textMuted, fontSize:12, margin:'0 0 12px', lineHeight:1.6 }}>
            We've sent a confirmation to <b>{form.email}</b>. Create a free account to track your application live.
          </p>
          <a href={`/login?email=${encodeURIComponent(form.email)}&name=${encodeURIComponent(form.name)}&ref=career_apply`}
            style={{ display:'inline-block', background:'linear-gradient(135deg,#0176D3,#014486)', color:'#fff', borderRadius:8, padding:'9px 18px', fontSize:13, fontWeight:700, textDecoration:'none' }}>
            🚀 Create Account & Track Application →
          </a>
        </div>
        <button onClick={onClose} className="btn btn-secondary" style={{ marginTop: 14, width:'100%' }}>Close</button>
      </div>
    </Modal>
  );

  const successBg   = isDark ? 'rgba(16,185,129,0.14)' : '#F0FDF4';
  const successBorder = isDark ? 'rgba(16,185,129,0.4)' : '#BBF7D0';
  const successText = isDark ? '#6EE7B7' : '#166534';
  const infoBg      = isDark ? 'rgba(0,180,216,0.12)' : '#EFF6FF';
  const infoBorder  = isDark ? 'rgba(0,180,216,0.35)' : '#BFDBFE';
  const infoText    = isDark ? '#7DD3FC' : '#1D4ED8';

  return (
    <Modal
      title={`Apply — ${job.title} @ ${job.company || job.companyName || orgName || 'TalentNest HR'}`}
      onClose={onClose}
      surface={surface}
      footer={
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, width: '100%' }}>
          <button onClick={submit} disabled={submitting}
            style={{ flex: 1, background: submitting ? '#64A4D8' : 'linear-gradient(135deg,#0176D3,#014486)', color: '#fff', border: 'none', borderRadius: 12, minHeight: 52, fontSize: 16, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, WebkitTapHighlightColor: 'transparent', order: isMobile ? 1 : 0 }}>
            {submitting
              ? <><Spinner /> {geoStatus === 'asking' ? 'Getting location…' : 'Submitting…'}</>
              : '🚀 Submit Application'}
          </button>
          <button onClick={onClose}
            style={{ flex: isMobile ? 'none' : 1, background: t.closeBg, color: t.closeText, border: 'none', borderRadius: 12, minHeight: isMobile ? 44 : 52, fontSize: 15, fontWeight: 700, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', order: isMobile ? 2 : 1 }}>
            Cancel
          </button>
        </div>
      }
    >
      {/* ── Banners ── */}
      {referralInfo && (
        <div style={{ marginBottom: 16, padding: '12px 14px', background: isDark ? 'rgba(245,158,11,0.16)' : 'linear-gradient(135deg,#FEF3C7,#FDE68A)', borderRadius: 10, border: `1px solid ${isDark ? 'rgba(245,158,11,0.5)' : '#F59E0B'}` }}>
          <p style={{ color: accent.amberText, margin: 0, fontSize: 13, fontWeight: 700 }}>
            🤝 Referred by {referralInfo.referredByName || referralInfo.referredByEmail}!
          </p>
          {referralInfo.rewardAmount > 0 && (
            <p style={{ color: accent.amberText, margin: '3px 0 0', fontSize: 12 }}>
              💰 Your referrer earns ₹{referralInfo.rewardAmount?.toLocaleString()} if you get hired!
            </p>
          )}
          <p style={{ color: accent.amberText, margin: '6px 0 0', fontSize: 12, lineHeight: 1.5 }}>
            Create a free account after applying to track your application and stay connected.
          </p>
        </div>
      )}
      {assessmentInfo?.hasAssessment && (
        <div style={{ marginBottom: 16, padding: '12px 14px', background: isDark ? 'rgba(124,58,237,0.16)' : '#F5F3FF', borderRadius: 10, border: `1px solid ${isDark ? 'rgba(124,58,237,0.4)' : '#DDD6FE'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>📝</span>
          <div>
            <p style={{ color: accent.purpleText, margin: 0, fontSize: 13, fontWeight: 700 }}>Screening assessment included</p>
            <p style={{ color: t.textMuted, margin: '2px 0 0', fontSize: 12 }}>{assessmentInfo.title}{assessmentInfo.timeLimitMins > 0 ? ` · ${assessmentInfo.timeLimitMins} min` : ''}</p>
          </div>
        </div>
      )}
      {isPreFilled && (
        <div style={{ marginBottom: 16, padding: '12px 14px', background: infoBg, borderRadius: 10, border: `1px solid ${infoBorder}` }}>
          <p style={{ color: infoText, margin: 0, fontSize: 13, fontWeight: 600 }}>✓ Details pre-filled from your account. Edit if needed.</p>
        </div>
      )}
      {error && (
        <div style={{ marginBottom: 16, padding: '12px 14px', background: isDark ? 'rgba(239,68,68,0.14)' : '#FEF2F2', borderRadius: 10, border: `1px solid ${isDark ? 'rgba(239,68,68,0.4)' : '#FECACA'}` }}>
          <p style={{ color: accent.redText, margin: 0, fontSize: 14, fontWeight: 600 }}>{error}</p>
        </div>
      )}
      {geoStatus === 'banner' && (
        <div style={{ marginBottom: 14, background: infoBg, border: `1px solid ${infoBorder}`, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>📍</span>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: infoText, lineHeight: 1.3 }}>Allow location for nearby job alerts</span>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={requestLocationPermission} style={{ background: '#0176D3', border: 'none', borderRadius: 7, color: '#fff', fontWeight: 700, fontSize: 13, padding: '7px 12px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Allow</button>
            <button onClick={() => setGeoStatus('denied')} style={{ background: t.surfaceBg, border: `1.5px solid ${t.border}`, borderRadius: 7, color: t.text, fontWeight: 600, fontSize: 13, padding: '7px 10px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Skip</button>
          </div>
        </div>
      )}
      {geoStatus === 'asking' && (
        <div style={{ marginBottom: 16, background: infoBg, border: `1px solid ${infoBorder}`, borderRadius: 10, padding: '12px 14px', fontSize: 13, color: infoText, fontWeight: 600 }}>Detecting your location…</div>
      )}
      {geoStatus === 'granted' && geo && (
        <div style={{ marginBottom: 16, background: successBg, border: `1px solid ${successBorder}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: successText, fontWeight: 600 }}>
          📍 Location detected{geo.city ? ` — ${geo.city}` : ''}
        </div>
      )}
      {prefillState && (
        <div style={{ marginBottom: 16, background: prefillState.isRegistered ? successBg : infoBg, border: `1px solid ${prefillState.isRegistered ? successBorder : infoBorder}`, borderRadius: 10, padding: '12px 14px' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: prefillState.isRegistered ? successText : infoText }}>
            {prefillState.isRegistered ? '✅ Account found — details pre-filled' : 'ℹ️ Profile found — please verify'}
          </p>
        </div>
      )}

      {/* ── FORM FIELDS ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, color: t.text }}>

        {/* Section: Contact */}
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 3, height: 14, background: '#0176D3', borderRadius: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Contact</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <MField label="Email Address *" value={form.email} type="email" placeholder="jane@example.com" t={t}
            onChange={v => { sf('email', v); setPrefillState(null); setUserEditedFields(new Set()); }} onBlur={handleEmailBlur}
            suffix={emailChecking ? <span style={{ fontSize: 12, color: t.textMuted }}>checking…</span> : null} />
          <MField label="Full Name *" value={form.name} placeholder="Jane Smith" t={t}
            onChange={v => handlePrefillFieldChange('name', v)} highlight={isHighlighted('name')} />
          <MField label="Mobile Number *" value={form.phone} type="tel" placeholder="+91 99999 99999" t={t}
            onChange={v => sf('phone', v)} />
        </div>

        {/* Section: Professional */}
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 3, height: 14, background: '#7C3AED', borderRadius: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Professional</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <MField label="Current Title *" value={form.title} placeholder="e.g. Software Developer" t={t}
            onChange={v => handlePrefillFieldChange('title', v)} highlight={isHighlighted('title')} />
          <MField label="Current Company *" value={form.currentCompany} placeholder="e.g. TCS" t={t}
            onChange={v => handlePrefillFieldChange('currentCompany', v)} highlight={isHighlighted('currentCompany')} />
          <MSelect label="Years of Experience *" value={form.experience} t={t}
            onChange={v => handlePrefillFieldChange('experience', v)} highlight={isHighlighted('experience')}
            options={[['', 'Select experience…'], ...['0','1','2','3','4','5','6','7','8','9','10','12','15','20'].map(y => [y, `${y} year${y === '1' ? '' : 's'}`])]} />
          <MSelect label="Notice Period / Availability *" value={form.availability} t={t}
            onChange={v => handlePrefillFieldChange('availability', v)} highlight={isHighlighted('availability')}
            options={[['', 'Select availability…'], ...['immediate','15 days','30 days','45 days','60 days','90 days'].map(a => [a, a])]} />
        </div>

        {/* Section: Role fit */}
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 3, height: 14, background: '#059669', borderRadius: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Role Fit</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <MSelect label="Industry *" value={form.industry} onChange={v => sf('industry', v)} t={t}
            options={[['', '— Select industry —'], ...INDUSTRIES.map(i => [i, i])]} />
          <MSelect label="Department *" value={form.department} onChange={v => sf('department', v)} t={t}
            options={[['', '— Select department —'], ...DEPARTMENTS.map(d => [d, d])]} />
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: t.textHeading, marginBottom: 6 }}>Cover Letter <span style={{ color: t.textMuted, fontWeight: 500 }}>(optional)</span></label>
            <textarea value={form.coverLetter} onChange={e => sf('coverLetter', e.target.value)} rows={3}
              placeholder="Brief note about why you're a great fit…"
              style={{ width: '100%', padding: '14px', borderRadius: 10, border: `1.5px solid ${t.border}`, fontSize: 15, lineHeight: 1.5, resize: 'vertical', boxSizing: 'border-box', background: t.surfaceBg, color: t.text, outline: 'none', fontFamily: 'inherit' }} />
          </div>
        </div>
        {/* Section: Account */}
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 3, height: 14, background: '#F59E0B', borderRadius: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Account</span>
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', minHeight: 52, WebkitTapHighlightColor: 'transparent', background: createAccount ? infoBg : t.chipBg, borderRadius: 12, padding: '12px 14px', border: `1.5px solid ${createAccount ? infoBorder : t.borderSubtle}` }}>
            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: createAccount ? '#0176D3' : t.surfaceBg, border: `2px solid ${createAccount ? '#0176D3' : t.textFaint}`, boxShadow: '0 1px 4px rgba(0,0,0,0.12)', transition: 'all 0.15s' }}>
              {createAccount && <span style={{ color: '#fff', fontSize: 16, fontWeight: 900, lineHeight: 1, userSelect: 'none' }}>✓</span>}
              <input type="checkbox" checked={createAccount} onChange={e => setCreateAccount(e.target.checked)} style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', margin: 0, cursor: 'pointer' }} />
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: t.textHeading }}>Create a free account</div>
              <div style={{ fontSize: 12, color: t.textMuted, marginTop: 1 }}>Track your application live after submitting</div>
            </div>
          </label>
          {createAccount && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: t.textHeading, marginBottom: 6 }}>Create Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    style={{ width: '100%', padding: '14px 48px 14px 16px', borderRadius: 10, border: `1.5px solid ${t.border}`, fontSize: 16, boxSizing: 'border-box', outline: 'none', background: t.surfaceBg, color: t.text }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {password && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {[{ ok: password.length >= 8, label: '8+ chars' }, { ok: /[A-Z]/.test(password), label: 'Uppercase' }, { ok: /[0-9]/.test(password), label: 'Number' }].map(c => (
                      <span key={c.label} style={{ fontSize: 12, color: c.ok ? '#10B981' : t.textFaint, fontWeight: 700 }}>{c.ok ? '✓' : '○'} {c.label}</span>
                    ))}
                  </div>
                )}
              </div>
              {/* Confirm Password */}
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: t.textHeading, marginBottom: 6 }}>Confirm Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    style={{ width: '100%', padding: '14px 48px 14px 16px', borderRadius: 10, border: `1.5px solid ${confirmPassword && confirmPassword !== password ? '#EF4444' : t.border}`, fontSize: 16, boxSizing: 'border-box', outline: 'none', background: t.surfaceBg, color: t.text }}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {showConfirmPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {confirmPassword && confirmPassword === password && (
                  <p style={{ color: '#10B981', fontSize: 13, fontWeight: 700, margin: '6px 0 0' }}>✓ Passwords match</p>
                )}
                {confirmPassword && confirmPassword !== password && (
                  <p style={{ color: '#EF4444', fontSize: 13, fontWeight: 700, margin: '6px 0 0' }}>✕ Passwords do not match</p>
                )}
              </div>
              {/* T&C */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', minHeight: 48, WebkitTapHighlightColor: 'transparent', background: agreedTerms ? successBg : t.chipBg, borderRadius: 10, padding: '12px', border: `1.5px solid ${agreedTerms ? successBorder : t.borderSubtle}` }}>
                <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 7, flexShrink: 0, marginTop: 1, background: agreedTerms ? '#059669' : t.surfaceBg, border: `2px solid ${agreedTerms ? '#059669' : t.textFaint}`, boxShadow: '0 1px 4px rgba(0,0,0,0.12)', transition: 'all 0.15s' }}>
                  {agreedTerms && <span style={{ color: '#fff', fontSize: 14, fontWeight: 900, lineHeight: 1, userSelect: 'none' }}>✓</span>}
                  <input type="checkbox" checked={agreedTerms} onChange={e => setAgreedTerms(e.target.checked)} style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', margin: 0, cursor: 'pointer' }} />
                </span>
                <span style={{ color: t.textMuted, fontSize: 14, lineHeight: 1.5 }}>
                  I agree to the{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#0176D3', fontWeight: 700, textDecoration: 'underline' }}>Terms of Service</a>
                  {' '}and{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#0176D3', fontWeight: 700, textDecoration: 'underline' }}>Privacy Policy</a>
                </span>
              </label>
            </div>
          )}
        </div>

        {questions.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 3, height: 14, background: '#EF4444', borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Screening Questions</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {questions.map((q, i) => (
                <div key={i}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: t.textHeading, marginBottom: 8 }}>{q.question}{q.required && <span style={{ color: '#EF4444' }}> *</span>}</label>
                  {q.type === 'yesno' ? (
                    <div style={{ display: 'flex', gap: 12 }}>
                      {['Yes', 'No'].map(opt => (
                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 18px', borderRadius: 10, border: `1.5px solid ${answers[i] === opt ? '#0176D3' : t.border}`, background: answers[i] === opt ? 'rgba(1,118,211,0.06)' : t.surfaceBg, flex: 1, justifyContent: 'center', fontSize: 14, fontWeight: 600, color: answers[i] === opt ? '#0176D3' : t.text }}>
                          <input type="radio" name={`q_${i}`} value={opt} checked={answers[i] === opt} onChange={() => setAnswers(p => ({ ...p, [i]: opt }))} style={{ display: 'none' }} />
                          {opt === 'Yes' ? '✅' : '❌'} {opt}
                        </label>
                      ))}
                    </div>
                  ) : q.type === 'multiple' && Array.isArray(q.options) && q.options.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {q.options.map(opt => (
                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 16px', borderRadius: 10, border: `1.5px solid ${answers[i] === opt ? '#0176D3' : t.border}`, background: answers[i] === opt ? 'rgba(1,118,211,0.06)' : t.surfaceBg, fontSize: 14, color: answers[i] === opt ? '#0176D3' : t.text, fontWeight: answers[i] === opt ? 700 : 400 }}>
                          <input type="radio" name={`q_${i}`} value={opt} checked={answers[i] === opt} onChange={() => setAnswers(p => ({ ...p, [i]: opt }))} style={{ accentColor: '#0176D3' }} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea value={answers[i] || ''} onChange={e => setAnswers(p => ({ ...p, [i]: e.target.value }))} rows={3}
                      style={{ width: '100%', padding: '14px', borderRadius: 10, border: `1.5px solid ${t.border}`, fontSize: 15, lineHeight: 1.5, resize: 'vertical', boxSizing: 'border-box', background: t.surfaceBg, color: t.text, outline: 'none', fontFamily: 'inherit' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <p style={{ color: t.textFaint, fontSize: 13, marginTop: 20, textAlign: 'center' }}>
        Already have an account?{' '}
        <a href="/login" style={{ color: '#0176D3', fontWeight: 700 }}>Sign in</a>
      </p>
    </Modal>
  );
}
