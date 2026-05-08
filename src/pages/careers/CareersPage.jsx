import React, { useState, useEffect, useCallback, Component } from 'react';
import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { api } from '../../api/api.js';
import Spinner from '../../components/ui/Spinner.jsx';
import Toast from '../../components/ui/Toast.jsx';
import MarketingFooter from '../marketing/MarketingFooter.jsx';
import Field from '../../components/ui/Field.jsx';
import Modal from '../../components/ui/Modal.jsx';
import MarketingNav from '../marketing/MarketingNav.jsx';
import { requestGeolocation } from '../../utils/geolocation.js';

// Detect generic job board search pages — these should NOT redirect, all applications
// go through TalentNest HR. Real company career pages (e.g. careers.tcs.com) are kept.
function isJobBoardSearchUrl(url) {
  if (!url) return false;
  const lUrl = url.toLowerCase();
  return (
    lUrl.includes('naukri.com') ||
    lUrl.includes('linkedin.com/jobs/search') ||
    (lUrl.includes('indeed.com') && lUrl.includes('/jobs')) ||
    lUrl.includes('glassdoor.co.in/Jobs') ||
    lUrl.includes('glassdoor.com/Job') ||
    lUrl.includes('shine.com/job-search') ||
    lUrl.includes('monster.com/jobs') ||
    lUrl.includes('simplyhired.co.in') ||
    lUrl.includes('timesjobs.com')
  );
}

// Returns the effective externalUrl — null if it's a generic job board search page
function getCompanyCareerUrl(externalUrl) {
  if (!externalUrl || isJobBoardSearchUrl(externalUrl)) return null;
  return externalUrl;
}

function ApplyModal({ job, onClose }) {
  const navigate = useNavigate();
  // Pre-fill from sessionStorage if user is already logged in
  const prefill = (() => {
    try {
      const u = sessionStorage.getItem('tn_user');
      if (u) {
        const p = JSON.parse(u);
        return { name: p.name || '', email: p.email || '', phone: p.phone || '', title: p.title || '', currentCompany: p.currentCompany || '', experience: p.experience != null ? String(p.experience) : '', availability: p.availability || '' };
      }
    } catch {}
    return { name: '', email: '' };
  })();

  const questions = job.screeningQuestions || [];
  const [form, setForm] = useState({ name: prefill.name, email: prefill.email, phone: prefill.phone || '', title: prefill.title || '', currentCompany: prefill.currentCompany || '', experience: prefill.experience || '', availability: prefill.availability || '', coverLetter: '' });
  const [answers, setAnswers] = useState(() => Object.fromEntries(questions.map((_, i) => [i, ''])));
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailFoundMsg, setEmailFoundMsg] = useState('');
  const [prefillState, setPrefillState]   = useState(null); // null | { isRegistered, hasPhone, fields[] }
  const prefillFields = prefillState?.fields || [];
  const [error, setError] = useState('');
  const [createAccount, setCreateAccount] = useState(false); // inline account creation
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
  // If yes, auto-fill all their profile fields so they don't re-enter anything
  // Track which prefilled fields the user has manually edited
  const [userEditedFields, setUserEditedFields] = React.useState(new Set());

  const handleEmailBlur = async () => {
    const email = form.email?.trim();
    if (!email || !/\S+@\S+\.\S+/.test(email)) return;
    // Already logged in with same email — form pre-populated from sessionStorage
    if (prefill.email && email.toLowerCase() === prefill.email.toLowerCase()) return;
    setEmailChecking(true);
    setEmailFoundMsg('');
    setPrefillState(null);
    setUserEditedFields(new Set());
    try {
      const r = await api.prefillByEmail(email);
      if (r?.exists && r?.profile) {
        const p = r.profile;
        // IMPORTANT: Calculate filled[] BEFORE calling setForm to avoid async callback bug.
        // setForm's functional updater runs during React's render phase — AFTER setPrefillState —
        // so filled[] would be empty if populated inside the callback.
        const currentForm = form; // capture current form state synchronously
        const filled = [];
        const updates = {};
        if (p.name           && !currentForm.name)           { updates.name           = p.name;           filled.push('name'); }
        if (p.title          && !currentForm.title)          { updates.title          = p.title;          filled.push('title'); }
        if (p.currentCompany && !currentForm.currentCompany) { updates.currentCompany = p.currentCompany; filled.push('currentCompany'); }
        if (p.experience     && !currentForm.experience)     { updates.experience     = p.experience;     filled.push('experience'); }
        if (p.availability   && !currentForm.availability)   { updates.availability   = p.availability;   filled.push('availability'); }
        // Phone NEVER pre-filled — security: never expose phone to unauthenticated callers

        // Apply updates and set prefill state synchronously in the same React batch
        if (Object.keys(updates).length > 0) setForm(prev => ({ ...prev, ...updates }));
        setPrefillState({ isRegistered: r.isRegisteredUser, hasPhone: r.hasPhone, fields: filled });
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

  // When user edits a pre-filled field, mark it as user-modified (remove green lock indicator)
  const handlePrefillFieldChange = (fieldName, value) => {
    sf(fieldName, value);
    setUserEditedFields(prev => {
      const next = new Set(prev);
      next.add(fieldName);
      return next;
    });
  };

  // A field shows the prefill highlight only if it was prefilled AND not yet edited by the user
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
    // Location is optional — never block submission
    // Validate required screening questions
    for (let i = 0; i < questions.length; i++) {
      if (questions[i].required && !answers[i]?.trim()) {
        setError(`Please answer: "${questions[i].question}"`);
        return;
      }
    }
    if (createAccount && !agreedTerms) { setError('Please accept the Terms & Conditions to create your account.'); return; }
    if (createAccount) {
      if (!password || password.length < 8) { setError('Password must be at least 8 characters.'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    }
    const screeningAnswers = questions.map((q, i) => ({ question: q.question, answer: answers[i] || '' }));

    // ── Step 1: Capture location (if not already captured or explicitly declined) ──
    // Triggered on submit (user gesture) so browser allows geolocation prompt.
    let finalGeo = geo;
    let finalGeoStatus = geoStatus;
    if (geoStatus === 'banner' || geoStatus === 'idle') {
      setGeoStatus('asking');
      try {
        const pos = await Promise.race([
          requestGeolocation(),
          new Promise(r => setTimeout(() => r(null), 7000)), // 7s max wait
        ]);
        if (pos) { finalGeo = pos; finalGeoStatus = 'granted'; setGeo(pos); setGeoStatus('granted'); }
        else      { finalGeoStatus = 'denied'; setGeoStatus('denied'); }
      } catch { finalGeoStatus = 'denied'; setGeoStatus('denied'); }
    }

    // ── Step 2: Request notification permission (triggers Chrome native prompt) ──
    // Must run during a user gesture (the submit click). Submission continues
    // regardless of whether the user allows or denies.
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        const perm = await Notification.requestPermission();
        setNotifStatus(perm);
      } catch { /* Safari older versions don't support promise form */ }
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = { ...form, screeningAnswers };
      if (finalGeo) {
        payload.geoLat      = finalGeo.lat;
        payload.geoLng      = finalGeo.lng;
        payload.geoAccuracy = finalGeo.accuracy;
        payload.geoCity     = finalGeo.city;
        payload.geoCountry  = finalGeo.country;
      } else {
        payload.geoDeclined = finalGeoStatus === 'denied';
      }
      const applyResult = await api.applyPublic(job.id, payload);
      // Store whether they had an account so the success screen shows the right message
      const appliedHasAccount = applyResult?.hasAccount === true;
      if (appliedHasAccount !== undefined) setAccountCreated(prev => prev || appliedHasAccount);
      // If user wants an account, register them now (same data, no re-entry)
      if (createAccount && password) {
        try {
          const regResult = await api.register({
            name: form.name, email: form.email, password,
            phone: form.phone, role: 'candidate',
            title: form.title, currentCompany: form.currentCompany,
            experience: form.experience ? Number(form.experience) : undefined,
            availability: form.availability,
            companyName: 'TalentNest HR',
          });
          if (regResult?.token && regResult?.user) {
            // Store in sessionStorage for page reload persistence
            sessionStorage.setItem('tn_token', regResult.token);
            sessionStorage.setItem('tn_user', JSON.stringify(regResult.user));
            // Also update in-memory API token for current page session
            try {
              const { setToken } = await import('../../api/client.js');
              setToken(regResult.token);
            } catch { /* non-critical */ }
            // Notify App.jsx user state if it's mounted (e.g. layout wrapper)
            if (typeof window.tn_refreshUser === 'function') {
              window.tn_refreshUser(regResult.user);
            }
            // If no external company page, auto-redirect to app after brief delay
            const hasExternal = !!getCompanyCareerUrl(job.externalUrl);
            if (!hasExternal) {
              setAccountCreated(true);
              setDone(true);
              setSubmitting(false);
              setTimeout(() => { window.location.href = '/app/applications'; }, 2000);
              return;
            }
          }
          setAccountCreated(true);
        } catch (regErr) {
          // If email already exists (already registered), still show success for the application
          if (regErr.message?.toLowerCase().includes('already registered')) {
            setEmailFoundMsg('ℹ️ This email is already registered. Your application has been saved — log in to track it.');
          }
          console.warn('[Apply] Account creation skipped:', regErr.message);
        }
      }
      setDone(true);
      // Only redirect to real company career pages — never to generic job boards
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
    <Modal title={getCompanyCareerUrl(job.externalUrl) ? '✅ Profile Saved!' : 'Application Submitted!'} onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>{accountCreated ? '🎊' : getCompanyCareerUrl(job.externalUrl) ? '🚀' : '🎉'}</div>
        <p style={{ color: '#0f172a', fontSize: 17, fontWeight: 700 }}>
          {accountCreated ? `Account created & application submitted!` : `Thank you, ${form.name}!`}
        </p>

        {/* Account identified — existing registered user */}
        {!createAccount && accountCreated && (
          <div style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(5,150,105,0.04))', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 12, textAlign: 'left' }}>
            <p style={{ color: '#065f46', fontSize: 14, fontWeight: 800, margin: '0 0 4px' }}>✅ Account identified! Job added to your pipeline.</p>
            <p style={{ color: '#374151', fontSize: 12, margin: '0 0 10px', lineHeight:1.6 }}>
              We found your TalentNest account. <b>{job.title}</b> has been added to your pipeline automatically.
            </p>
            <a href="/app/applications" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#0176D3,#014486)', color: '#fff', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              📋 Track My Application →
            </a>
          </div>
        )}

        {/* New account created — show auto-redirect countdown */}
        {createAccount && accountCreated && (
          <div style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(5,150,105,0.04))', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 12, textAlign: 'left' }}>
            <p style={{ color: '#065f46', fontSize: 14, fontWeight: 800, margin: '0 0 4px' }}>✅ Account created! Signing you in…</p>
            <p style={{ color: '#374151', fontSize: 12, margin: '0 0 10px' }}>
              Your application for <b>{job.title}</b> is in your pipeline. Redirecting to your dashboard…
            </p>
            <a href="/app/applications" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#0176D3,#014486)', color: '#fff', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              📋 Go to My Applications →
            </a>
          </div>
        )}
        {/* Assessment CTA — shown when job has an active assessment */}
        {assessmentInfo?.hasAssessment && (accountCreated || !!prefill.email) && (
          <div style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(109,40,217,0.04))', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 10, padding: '14px 18px', marginBottom: 12, textAlign: 'left' }}>
            <p style={{ color: '#5b21b6', fontSize: 14, fontWeight: 800, margin: '0 0 4px' }}>📝 Assessment Required</p>
            <p style={{ color: '#374151', fontSize: 12, margin: '0 0 8px', lineHeight: 1.6 }}>
              <b>{assessmentInfo.title}</b>{assessmentInfo.timeLimitMins > 0 ? ` · ⏱ ${assessmentInfo.timeLimitMins} minutes` : ''}{assessmentInfo.questionCount > 0 ? ` · ${assessmentInfo.questionCount} questions` : ''}
            </p>
            <a href={`/app/assessment/${assessmentInfo.assessmentId}`}
              style={{ display: 'inline-block', background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', color: '#fff', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              🚀 Start Assessment →
            </a>
            <p style={{ color: '#94A3B8', fontSize: 11, margin: '6px 0 0' }}>Complete this assessment to advance your application faster.</p>
          </div>
        )}

        {getCompanyCareerUrl(job.externalUrl) ? (
          <>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
              Your profile for <b>{job.title}</b> at <b>{job.company}</b> has been saved with us.
            </p>
            <div style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.08),rgba(245,158,11,0.04))', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '12px 16px', marginTop: 12 }}>
              <p style={{ color: '#92400e', fontSize: 13, margin: 0, fontWeight: 600 }}>
                🌐 Redirecting you to {job.company}'s careers page…
              </p>
              <p style={{ color: '#78716c', fontSize: 11, margin: '6px 0 0', lineHeight: 1.5 }}>
                Complete your application there. A new tab should open automatically.
              </p>
              <a href={getCompanyCareerUrl(job.externalUrl)} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', marginTop: 10, background: 'linear-gradient(135deg,#F59E0B,#d97706)', color: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                Open Careers Page →
              </a>
            </div>
          </>
        ) : (
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
            Your application for <b>{job.title}</b> at <b>{job.company}</b> has been received.
            The recruiting team will be in touch within 48 hours.
          </p>
        )}
        <div style={{ background: 'linear-gradient(135deg,rgba(1,118,211,0.06),rgba(1,118,211,0.03))', border:'1px solid rgba(1,118,211,0.2)', borderRadius:10, padding:'14px 18px', marginTop:14, textAlign:'left' }}>
          <p style={{ color:'#032D60', fontSize:13, fontWeight:700, margin:'0 0 6px' }}>📬 Check your inbox!</p>
          <p style={{ color:'#374151', fontSize:12, margin:'0 0 12px', lineHeight:1.6 }}>
            We've sent a confirmation to <b>{form.email}</b>. Create a free account to track your application live.
          </p>
          <a href={`/login?email=${encodeURIComponent(form.email)}&name=${encodeURIComponent(form.name)}&ref=career_apply`}
            style={{ display:'inline-block', background:'linear-gradient(135deg,#0176D3,#014486)', color:'#fff', borderRadius:8, padding:'9px 18px', fontSize:13, fontWeight:700, textDecoration:'none' }}>
            🚀 Create Account & Track Application →
          </a>
          <p style={{ color:'#94A3B8', fontSize:11, margin:'8px 0 0' }}>Your application data will be linked automatically using your email.</p>
        </div>
        <button onClick={onClose} className="btn btn-secondary" style={{ marginTop: 14, width:'100%' }}>Close</button>
      </div>
    </Modal>
  );

  return (
    <Modal title={`Apply — ${job.title} @ ${job.company}`} onClose={onClose}>
      {/* Assessment banner — show at top so candidate knows before applying */}
      {assessmentInfo?.hasAssessment && (
        <div style={{ marginBottom: 14, padding: '10px 14px', background: 'linear-gradient(135deg,rgba(124,58,237,0.07),rgba(109,40,217,0.04))', borderRadius: 8, border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>📝</span>
          <div>
            <p style={{ color: '#5b21b6', margin: 0, fontSize: 12, fontWeight: 700 }}>This job includes a screening assessment</p>
            <p style={{ color: '#374151', margin: '2px 0 0', fontSize: 11 }}>
              <b>{assessmentInfo.title}</b>{assessmentInfo.timeLimitMins > 0 ? ` · ${assessmentInfo.timeLimitMins} min` : ''}{assessmentInfo.questionCount > 0 ? ` · ${assessmentInfo.questionCount} questions` : ''} · Complete after applying to advance faster
            </p>
          </div>
        </div>
      )}
      {isPreFilled && (
        <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(1,118,211,0.06)', borderRadius: 8, border: '1px solid rgba(1,118,211,0.2)' }}>
          <p style={{ color: '#0154A4', margin: 0, fontSize: 12 }}>✓ Details pre-filled from your account. Edit if needed.</p>
        </div>
      )}
      {error && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(186,5,23,0.08)', borderRadius: 8, border: '1px solid rgba(186,5,23,0.2)' }}>
          <p style={{ color: '#BA0517', margin: 0, fontSize: 13 }}>{error}</p>
        </div>
      )}
      {/* Location permission banner — shown BEFORE browser prompt */}
      {geoStatus === 'banner' && (
        <div style={{ marginBottom: 12, background: 'linear-gradient(135deg,rgba(1,118,211,0.07),rgba(1,118,211,0.03))', border: '1px solid rgba(1,118,211,0.25)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>📍</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0176D3', marginBottom: 3 }}>Allow your location for personalised job alerts</div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6, marginBottom: 10 }}>
                Share your location to receive job alerts for roles near you by email. We never store your exact coordinates — only city-level data is used.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={requestLocationPermission}
                  style={{ background: '#0176D3', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12, padding: '8px 16px', cursor: 'pointer' }}>
                  📍 Allow Location
                </button>
                <button onClick={() => setGeoStatus('denied')}
                  style={{ background: 'none', border: '1px solid #CBD5E1', borderRadius: 8, color: '#64748B', fontWeight: 600, fontSize: 12, padding: '8px 14px', cursor: 'pointer' }}>
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {geoStatus === 'asking' && (
        <div style={{ marginBottom: 12, background: 'rgba(1,118,211,0.05)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#0176D3' }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #bfdbfe', borderTopColor: '#0176D3', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
          Requesting location… please allow in your browser
        </div>
      )}
      {geoStatus === 'granted' && geo && (
        <div style={{ marginBottom: 12, background: 'rgba(5,150,105,0.07)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>📍</span>
          <span style={{ fontSize: 12, color: '#065f46', flex: 1 }}>
            Location detected{geo.city ? ` — ${geo.city}${geo.country ? `, ${geo.country}` : ''}` : ''} · We'll send you job alerts near you
          </span>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── Account detection banner — shown when email matches a registered account ── */}
        {prefillState && (
          <div style={{ background: prefillState.isRegistered ? 'linear-gradient(135deg,rgba(5,150,105,0.08),rgba(5,150,105,0.04))' : 'rgba(1,118,211,0.06)', border: `1px solid ${prefillState.isRegistered ? 'rgba(5,150,105,0.3)' : 'rgba(1,118,211,0.25)'}`, borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{prefillState.isRegistered ? '✅' : '📋'}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: prefillState.isRegistered ? '#065f46' : '#0176D3', marginBottom: 3 }}>
                {prefillState.isRegistered ? 'Registered account found!' : 'Profile found in our system'}
              </div>
              <div style={{ fontSize: 12, color: prefillState.isRegistered ? '#065f46' : '#374151', lineHeight: 1.5 }}>
                {prefillState.isRegistered
                  ? <>Your professional details have been pre-filled. <strong>Please enter your mobile number</strong> to complete the application. Once submitted, this will be added to your pipeline automatically.</>
                  : 'Some details have been pre-filled from our records. Please verify and complete all fields.'}
              </div>
              {prefillState.hasPhone && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>🔒</span> A mobile number is associated with this account — please enter it below to verify
                </div>
              )}
            </div>
          </div>
        )}

        {/* Email FIRST — entering email triggers auto-fill of all other fields */}
        <div>
          <Field label="Email Address *" value={form.email}
            onChange={v => {
              if (prefillState) {
                setEmailFoundMsg('⚠️ To update your email, please log in and change it from Profile Settings. Editing here clears the pre-filled details.');
              }
              sf('email', v); setPrefillState(null); setUserEditedFields(new Set());
            }}
            onBlur={handleEmailBlur} type="email" placeholder="jane@example.com"
            hint={!prefillState && !form.email ? 'Enter your email — we'll auto-fill your details if you've applied before' : undefined}
          />
          {emailChecking && (
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:5, fontSize:12, color:'#64748B' }}>
              <div style={{ width:12, height:12, borderRadius:'50%', border:'2px solid #E2E8F0', borderTopColor:'#0176D3', animation:'spin 0.8s linear infinite', flexShrink:0 }} />
              Looking up your profile…
            </div>
          )}
          {emailFoundMsg && (
            <div style={{ marginTop:6, padding:'9px 12px', borderRadius:8, background: emailFoundMsg.startsWith('⚠️') ? 'rgba(245,158,11,0.07)' : 'rgba(5,150,105,0.07)', border:`1px solid ${emailFoundMsg.startsWith('⚠️') ? 'rgba(245,158,11,0.3)' : 'rgba(5,150,105,0.25)'}`, fontSize:12, color: emailFoundMsg.startsWith('⚠️') ? '#92400e' : '#065f46', lineHeight:1.55 }}>
              {emailFoundMsg}
            </div>
          )}
        </div>

        {/* Full Name — shown after email, green when pre-filled */}
        <Field
          label={isHighlighted('name') ? '✅ Full Name * (auto-filled)' : 'Full Name *'}
          value={form.name}
          onChange={v => handlePrefillFieldChange('name', v)}
          placeholder="Jane Smith"
          inputStyle={isHighlighted('name') ? { background:'#f0fdf4', borderColor:'#059669', boxShadow:'0 0 0 2px rgba(5,150,105,0.1)', color:'#065f46' } : {}}
        />

        {/* Mobile Number — NEVER pre-filled for security. Show clear instructions when account found */}
        <div>
          <Field
            label={prefillState ? '📱 Mobile Number * — Enter to continue' : 'Mobile Number *'}
            value={form.phone}
            onChange={v => sf('phone', v)}
            placeholder={prefillState?.hasPhone ? 'Enter your mobile number to proceed' : '+91 99999 99999'}
            type="tel"
            inputStyle={prefillState?.hasPhone ? { borderColor:'#F59E0B', background:'#fffbeb', boxShadow:'0 0 0 2px rgba(245,158,11,0.1)' } : {}}
          />
          {prefillState && (
            <div style={{ marginTop:6, padding:'9px 12px', borderRadius:8, background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.25)', fontSize:12, color:'#92400e', display:'flex', alignItems:'flex-start', gap:8, lineHeight:1.55 }}>
              <span style={{ flexShrink:0, marginTop:1 }}>📱</span>
              <span>
                {prefillState.hasPhone
                  ? 'Your account has a mobile number on file. Enter it here — your application will be added to your pipeline automatically. You can update your number too.'
                  : 'Enter your mobile number to complete the application.'}
              </span>
            </div>
          )}
        </div>

        {/* Professional details — green when prefilled, clears green when user edits that field */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12 }}>
          <Field
            label={isHighlighted('title') ? '✅ Current Title * (pre-filled)' : 'Current Title *'}
            value={form.title} onChange={v => handlePrefillFieldChange('title', v)} placeholder="e.g. Senior Developer"
            inputStyle={isHighlighted('title') ? { background:'#f0fdf4', borderColor:'#059669', boxShadow:'0 0 0 2px rgba(5,150,105,0.1)', color:'#065f46' } : {}} />
          <Field
            label={isHighlighted('currentCompany') ? '✅ Current Company * (pre-filled)' : 'Current Company *'}
            value={form.currentCompany} onChange={v => handlePrefillFieldChange('currentCompany', v)} placeholder="e.g. Infosys"
            inputStyle={isHighlighted('currentCompany') ? { background:'#f0fdf4', borderColor:'#059669', boxShadow:'0 0 0 2px rgba(5,150,105,0.1)', color:'#065f46' } : {}} />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12 }}>
          <div>
            <label style={{ display:'block', fontSize:13, fontWeight:600, color: isHighlighted('experience') ? '#059669' : '#374151', marginBottom:4 }}>
              {isHighlighted('experience') ? '✅ Experience * (pre-filled)' : 'Total Experience (years) *'}
            </label>
            <select value={form.experience}
              onChange={e => handlePrefillFieldChange('experience', e.target.value)}
              style={{ width:'100%', padding:'8px 10px', borderRadius:8, fontSize:13, WebkitAppearance:'none', cursor:'pointer', outline:'none', border: isHighlighted('experience') ? '1.5px solid #059669' : '1px solid #DDDBDA', background: isHighlighted('experience') ? '#f0fdf4' : '#fff', color: form.experience ? '#181818' : '#94A3B8', boxShadow: isHighlighted('experience') ? '0 0 0 2px rgba(5,150,105,0.1)' : 'none' }}>
              <option value="">Select…</option>
              {['0','1','2','3','4','5','6','7','8','9','10','11','12','15','18','20','25'].map(y => (
                <option key={y} value={y}>{y === '0' ? 'Fresher (0 yrs)' : `${y} year${y === '1' ? '' : 's'}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display:'block', fontSize:13, fontWeight:600, color: isHighlighted('availability') ? '#059669' : '#374151', marginBottom:4 }}>
              {isHighlighted('availability') ? '✅ Availability * (pre-filled)' : 'Availability *'}
            </label>
            <select value={form.availability}
              onChange={e => handlePrefillFieldChange('availability', e.target.value)}
              style={{ width:'100%', padding:'8px 10px', borderRadius:8, fontSize:13, WebkitAppearance:'none', cursor:'pointer', outline:'none', border: isHighlighted('availability') ? '1.5px solid #059669' : '1px solid #DDDBDA', background: isHighlighted('availability') ? '#f0fdf4' : '#fff', color: form.availability ? '#181818' : '#94A3B8', boxShadow: isHighlighted('availability') ? '0 0 0 2px rgba(5,150,105,0.1)' : 'none' }}>
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

        <Field label="Cover Letter (optional)" value={form.coverLetter} onChange={v => sf('coverLetter', v)} rows={3} placeholder="Tell us why you're a great fit…" />

        {/* Inline account creation — optional, reveals password fields */}
        <div style={{ background: 'linear-gradient(135deg,rgba(1,118,211,0.05),rgba(1,118,211,0.02))', border: `1px solid ${createAccount ? 'rgba(1,118,211,0.4)' : 'rgba(1,118,211,0.2)'}`, borderRadius: 12, padding: '14px 16px', transition: 'border-color 0.2s' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={createAccount} onChange={e => setCreateAccount(e.target.checked)}
              style={{ marginTop: 2, width: 16, height: 16, accentColor: '#0176D3', cursor: 'pointer', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#032D60' }}>
                🚀 Create a free account to track this application
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                See status updates, get interview notifications, and manage all your applications in one place.
              </div>
            </div>
          </label>
          {createAccount && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Create Password *</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid rgba(1,118,211,0.35)', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Confirm Password *</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${confirmPassword && password !== confirmPassword ? '#e53e3e' : 'rgba(1,118,211,0.35)'}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff' }} />
                {confirmPassword && password !== confirmPassword && (
                  <p style={{ color: '#e53e3e', fontSize: 11, margin: '4px 0 0' }}>Passwords do not match</p>
                )}
              </div>

              {/* Legal agreement — only shown during account creation as requested */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '10px 14px', background: '#fff', borderRadius: 10, border: `1.5px solid ${agreedTerms ? '#10b981' : 'rgba(1,118,211,0.2)'}`, transition: 'border-color 0.2s', marginTop: 4 }}>
                <input type="checkbox" checked={agreedTerms} onChange={e => setAgreedTerms(e.target.checked)}
                  style={{ marginTop: 2, width: 16, height: 16, accentColor: '#10b981', cursor: 'pointer', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#374151', lineHeight: 1.5 }}>
                  I agree to the <Link to="/terms" target="_blank" style={{ color: '#0176D3', fontWeight: 700, textDecoration: 'none' }}>Terms & Conditions</Link> and <Link to="/privacy" target="_blank" style={{ color: '#0176D3', fontWeight: 700, textDecoration: 'none' }}>Privacy Policy</Link>. <span style={{ color: '#e53e3e' }}>*</span>
                </span>
              </label>

              <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>
                Your account uses the name, email and mobile you entered above. You'll be logged in immediately after applying.
              </p>
            </div>
          )}
        </div>

        {questions.length > 0 && (
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
            <p style={{ color: '#0176D3', fontSize: 12, fontWeight: 700, margin: '0 0 10px' }}>📋 Screening Questions</p>
            {questions.map((q, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', color: '#374151', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  {q.question} {q.required && <span style={{ color: '#e53e3e' }}>*</span>}
                </label>
                {q.type === 'yesno' ? (
                  <div style={{ display: 'flex', gap: 12 }}>
                    {['Yes', 'No'].map(opt => (
                      <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="radio" name={`sq_${i}`} value={opt} checked={answers[i] === opt}
                          onChange={() => setAnswers(p => ({ ...p, [i]: opt }))} style={{ accentColor: '#0176D3' }} />
                        <span style={{ fontSize: 13 }}>{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : q.type === 'multiple' ? (
                  <select value={answers[i] || ''} onChange={e => setAnswers(p => ({ ...p, [i]: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #DDDBDA', fontSize: 13 }}>
                    <option value="">Select an option…</option>
                    {(q.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <textarea value={answers[i] || ''} onChange={e => setAnswers(p => ({ ...p, [i]: e.target.value }))}
                    rows={2} placeholder="Your answer…"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #DDDBDA', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Notification banner — informs candidate that Chrome will ask on submit */}
      {notifStatus === 'default' && (
        <div style={{ marginTop: 16, background: 'linear-gradient(135deg,rgba(124,58,237,0.09),rgba(109,40,217,0.04))', border: '2px solid rgba(124,58,237,0.3)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>🔔</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#5b21b6', marginBottom: 4 }}>Stay updated — allow notifications</div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.65 }}>
                When you tap <strong>Submit Application</strong>, your browser will ask to allow notifications. Please tap <strong>Allow</strong> so we can notify you of interview invites, shortlisting, and offer letters in real time.
              </div>
            </div>
          </div>
        </div>
      )}
      {notifStatus === 'granted' && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, fontSize: 12, color: '#065f46', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🔔</span> Notifications enabled — we'll alert you on every status update
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button onClick={submit} disabled={submitting} className="btn btn-primary" style={{ flex: 1, opacity: submitting ? 0.6 : 1, justifyContent: 'center', minHeight: 50, fontSize: 15 }}>
          {submitting
            ? <><Spinner /> {geoStatus === 'asking' ? 'Getting location…' : 'Submitting…'}</>
            : '🚀 Submit Application'}
        </button>
        <button onClick={onClose} className="btn btn-secondary" style={{ minHeight: 50 }}>Cancel</button>
      </div>
      {(geoStatus === 'banner' || geoStatus === 'idle') && notifStatus === 'default' && (
        <p style={{ color: '#7c3aed', fontSize: 11, marginTop: 8, textAlign: 'center', fontWeight: 600 }}>
          ⚡ On submit: browser will ask for location + notifications
        </p>
      )}
      <p style={{ color: '#706E6B', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
        Already have an account?{' '}
        <a href="/login" style={{ color: '#014486', textDecoration: 'none', fontWeight: 600 }}>Sign in</a>
        {' '}to track your application status.
      </p>
    </Modal>
  );
}

const TYPE_COLOR = { High: '#BA0517', Medium: '#F59E0B', Low: '#10b981' };

class CareersErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err, info) { console.error('Careers page error:', err, info); }
  render() {
    if (this.state.hasError) return (
      <div style={{ textAlign: 'center', padding: '80px 20px', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <h2 style={{ color: '#0A1628', fontWeight: 700 }}>Something went wrong loading jobs.</h2>
        <p style={{ color: '#64748B', marginBottom: 24 }}>Please refresh the page or try again later.</p>
        <button onClick={() => window.location.reload()} style={{ background: '#0176D3', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Reload Page
        </button>
      </div>
    );
    return this.props.children;
  }
}

export default function CareersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { companySlug } = useParams();
  const [brand, setBrand] = useState(null); // { name, logoUrl, brandColor }
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const initialCompanyFilter = searchParams.get('company') || '';
  const initialSearch = searchParams.get('search') || '';
  
  const [search, setSearch] = useState(initialCompanyFilter || initialSearch || '');
  const [debouncedSearch, setDebouncedSearch] = useState(initialCompanyFilter || initialSearch || '');
  const [urgencyFilter, setUrgencyFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [applying, setApplying] = useState(null);
  const [totalJobs, setTotalJobs] = useState(0);
  const [stats, setStats] = useState({ urgent: 0, companies: 0 });
  const [toast, setToast] = useState('');
  const [viewingJob, setViewingJob] = useState(null); // job whose JSON-LD is injected
  const [sharedJob, setSharedJob] = useState(null); // job featured at top when coming from a shared link
  const [sharePopover, setSharePopover] = useState(null); // job id whose share popover is open

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [urgencyFilter, locationFilter]);

  // Phase 3 — Google for Jobs JSON-LD: inject/remove on active job view
  useEffect(() => {
    const id = 'tn-job-schema';
    let el = document.getElementById(id);
    if (viewingJob && viewingJob.status === 'active') {
      if (!el) { el = document.createElement('script'); el.id = id; el.type = 'application/ld+json'; document.head.appendChild(el); }
      const company  = viewingJob.companyName || viewingJob.company || 'TalentNest Partner';
      const parts    = (viewingJob.location || '').split(',').map(s => s.trim());
      const siteUrl  = 'https://www.talentnesthr.com';
      const slug     = viewingJob.careerPageSlug || viewingJob._id || viewingJob.id;
      const mapType  = t => { const s=(t||'').toLowerCase(); if(s.includes('part')) return 'PART_TIME'; if(s.includes('contract')||s.includes('c2c')) return 'CONTRACTOR'; if(s.includes('intern')) return 'INTERN'; return 'FULL_TIME'; };
      const schema   = {
        '@context': 'https://schema.org/', '@type': 'JobPosting',
        title: viewingJob.title, datePosted: new Date(viewingJob.createdAt).toISOString(),
        description: (viewingJob.description||'') + (viewingJob.requirements ? '\n\nRequirements:\n'+viewingJob.requirements : ''),
        employmentType: mapType(viewingJob.jobType),
        hiringOrganization: { '@type': 'Organization', name: company },
        jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: parts[0]||'', addressRegion: parts[1]||'', addressCountry: 'IN' } },
        identifier: { '@type': 'PropertyValue', name: company, value: String(viewingJob._id||viewingJob.id||'') },
        url: `${siteUrl}/careers/job/${slug}`,
        ...(viewingJob.salaryMin ? { baseSalary: { '@type':'MonetaryAmount', currency:'INR', value: { '@type':'QuantitativeValue', minValue: viewingJob.salaryMin, ...(viewingJob.salaryMax ? {maxValue: viewingJob.salaryMax} : {}), unitText:'YEAR' } } } : {}),
        ...(viewingJob.skills?.length ? { skills: Array.isArray(viewingJob.skills) ? viewingJob.skills.join(', ') : viewingJob.skills } : {}),
        ...(viewingJob.experience ? { experienceRequirements: viewingJob.experience } : {}),
      };
      el.textContent = JSON.stringify(schema);
    } else if (el) {
      el.remove();
    }
    return () => { const s = document.getElementById(id); if (s) s.remove(); };
  }, [viewingJob]);

  useEffect(() => {
    if (!document.getElementById('marketing-css')) {
      const link = document.createElement('link');
      link.id = 'marketing-css'; link.rel = 'stylesheet'; link.href = '/marketing.css';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    // Load brand if company slug present
    if (companySlug) {
      fetch(`/api/orgs/brand/${companySlug}`)
        .then(r => r.json())
        .then(r => { if (r.success) setBrand(r.data); })
        .catch(() => {});
    }
  }, [companySlug]);

  useEffect(() => {
    let active = true;
    if (page === 1) setLoading(true);
    else setLoadingMore(true);

    const params = new URLSearchParams();
    if (companySlug) params.append('slug', companySlug);
    if (debouncedSearch) params.append('search', debouncedSearch);
    if (urgencyFilter !== 'All') params.append('urgency', urgencyFilter);
    if (locationFilter !== 'All') params.append('location', locationFilter);
    params.append('page', page);
    params.append('limit', 20);

    api.getPublicJobs('?' + params.toString())
      .then(res => {
        if (!active) return;
        const arr = Array.isArray(res) ? res : (res?.data || []);
        
        setJobs(prev => page === 1 ? arr : [...prev, ...arr]);
        setTotalJobs(res?.pagination?.total || (page === 1 ? arr.length : totalJobs));
        if (res?.stats) setStats(res.stats);
        setHasMore(res?.pagination?.hasNext || arr.length === 20);

        // ── Inject JSON-LD for Googlebot's JS indexer ──────────────────────
        if (page === 1) {
          document.querySelectorAll('script[data-tn-job-ld]').forEach(el => el.remove());
          const BASE = window.location.origin;
          arr.slice(0, 50).forEach(j => {
            const company = j.companyName || j.company || 'TalentNest HR';
            const remote  = (j.location || '').toLowerCase().includes('remote');
            const ld = {
              '@context': 'https://schema.org',
              '@type':    'JobPosting',
              title:       j.title,
              description: j.description || `${j.title} opening at ${company}.`,
              datePosted:  j.createdAt || new Date().toISOString(),
              validThrough: new Date(Date.now() + 60 * 864e5).toISOString(),
              hiringOrganization: { '@type': 'Organization', name: company, sameAs: BASE },
              employmentType: 'FULL_TIME',
              jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: j.location || 'India', addressCountry: 'IN' } },
              url: j.canonicalUrl || `${BASE}/careers/job/${j.seoSlug || j._id || j.id}`,
              directApply: true,
              ...(remote ? { jobLocationType: 'TELECOMMUTE' } : {}),
              ...(j.skills?.length ? { skills: j.skills.join(', ') } : {}),
              ...(j.salaryMin || j.salaryMax ? { baseSalary: { '@type': 'MonetaryAmount', currency: j.salaryCurrency || 'INR', value: { '@type': 'QuantitativeValue', unitText: 'YEAR', ...(j.salaryMin ? { minValue: j.salaryMin } : {}), ...(j.salaryMax ? { maxValue: j.salaryMax } : {}) } } } : {}),
            };
            const tag = document.createElement('script');
            tag.type = 'application/ld+json';
            tag.setAttribute('data-tn-job-ld', j._id || j.id);
            tag.textContent = JSON.stringify(ld);
            document.head.appendChild(tag);
          });

          // Auto-highlight + open job from shared/invite link (?job=<id>)
          const jobParam = searchParams.get('job');
          if (jobParam) {
            const found = arr.find(j => String(j._id || j.id) === jobParam || String(j.id) === jobParam);
            if (found) {
              setSharedJob(found);
              setApplying(found);
            } else {
              // Job not in current page — fetch it directly from public API
              api.getPublicJobById(jobParam)
                .then(r => {
                  const sj = r?.data || r;
                  if (sj && (sj._id || sj.id)) {
                    const normalized = { ...sj, id: sj.id || sj._id?.toString() };
                    setSharedJob(normalized);
                    setApplying(normalized);
                  }
                })
                .catch(() => {});
            }
          }
        }
      })
      .catch(() => {
        if (active) setToast('❌ Could not load jobs.');
      })
      .finally(() => {
        if (active) { setLoading(false); setLoadingMore(false); }
      });
  }, [companySlug, debouncedSearch, urgencyFilter, locationFilter, page, searchParams]);

  const baseLocs = ['Delhi NCR', 'Bangalore', 'Mumbai', 'Kolkata', 'Hyderabad', 'Pune', 'Chennai', 'Noida', 'Gurgaon', 'Ahmedabad', 'Bhubaneswar', 'Kochi', 'Remote', 'Hybrid'];
  const fetchedLocs = jobs.map(j => j.location).filter(Boolean);
  const locations = ['All', ...new Set([...baseLocs, ...fetchedLocs])];

  const filtered = jobs;

  // ── Share a job (Web Share API on mobile, fallback to platform links) ────────
  const shareJob = async (j) => {
    const jid  = j.id || j._id;
    const jobUrl = `${window.location.origin}/careers?job=${jid}`;
    const title = `${j.title}${j.company ? ` @ ${j.company}` : ''}`;
    const text  = `🚀 Job Opening: ${title}${j.location ? ` · ${j.location}` : ''}`;

    // Use native Web Share API (mobile shows WhatsApp, Instagram, etc. automatically)
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: jobUrl });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return; // user cancelled
      }
    }

    // Desktop fallback — open WhatsApp Web
    const waText = encodeURIComponent(`${text}\n\n${jobUrl}`);
    window.open(`https://wa.me/?text=${waText}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", minHeight: '100vh', background: '#F7F8FC' }}>
      <Toast msg={toast} onClose={() => setToast('')} />
      <MarketingNav active="careers" />

      {/* Brand header strip for company-specific pages */}
      {brand && (
        <div style={{ background: brand.brandColor || '#0176D3', padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          {brand.logoUrl && <img src={brand.logoUrl} alt={brand.name} style={{ height: 36, objectFit: 'contain', borderRadius: 6, background: '#fff', padding: '2px 6px' }} />}
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{brand.name} — Open Positions</span>
        </div>
      )}

      {/* ── HERO ── */}
      <section style={{
        backgroundImage: "linear-gradient(rgba(10,22,40,0.92), rgba(10,22,40,0.88)), url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&auto=format&fit=crop&q=85')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        paddingTop: brand ? 100 : 130,
        paddingBottom: 80,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Dot grid overlay */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(0,194,203,0.08) 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 80%, rgba(1,118,211,0.18) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div className="tn-container" style={{ position: 'relative' }}>
          <div className="tn-responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
            {/* LEFT — text */}
            <div className="tn-mobile-center" style={{ textAlign: 'left' }}>
              <span className="tn-label">Open Positions</span>
              <h1 className="tn-mobile-center" style={{ color: '#ffffff', fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 900, margin: '16px 0 20px', lineHeight: 1.1 }}>
                Find Your{' '}
                <span style={{ background: 'linear-gradient(135deg,#0176D3,#00C2CB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Dream Job
                </span>
              </h1>
              <p className="tn-mobile-center" style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1.05rem', maxWidth: 480, margin: '0 0 36px', lineHeight: 1.7 }}>
                Browse hand-picked opportunities across IT, cybersecurity, finance and more. Apply in minutes — we respond within 48 hours.
              </p>

              {/* Large search bar */}
              <div style={{ position: 'relative', marginBottom: 36 }}>
                <span style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '1.1rem' }}>🔍</span>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search roles, skills, companies…"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '16px 20px 16px 50px', border: 'none', borderRadius: 12, fontSize: '1rem', color: '#0A1628', outline: 'none', background: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
                />
              </div>

              {/* Stats */}
              <div className="tn-mobile-center-flex" style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                {[
                  { icon: '💼', num: totalJobs, label: 'Open Roles' },
                  { icon: '⚡', num: stats.urgent || (Array.isArray(jobs) ? jobs : []).filter(j => j.urgency === 'High').length, label: 'Urgent Hiring' },
                  { icon: '🏢', num: stats.companies || new Set((Array.isArray(jobs) ? jobs : []).map(j => j.company)).size, label: 'Companies' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#00C2CB' }}>{s.num}</div>
                    <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', marginTop: 2 }}>{s.icon} {s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — floating job cards mockup (desktop only) */}
            <div className="tn-desktop" style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 360 }}>
                {/* Glow */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 300, height: 300, background: 'radial-gradient(circle,rgba(1,118,211,0.2),transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
                {(jobs.length > 0 ? jobs.slice(0, 4) : [
                  { title: 'Senior React Developer', company: 'FinTech Corp', location: 'Hyderabad', urgency: 'High', color: '#BA0517', icon: '💻', salary: '₹18–25 LPA' },
                  { title: 'Cybersecurity Analyst', company: 'SecureNet Ltd', location: 'Bangalore', urgency: 'High', color: '#0176D3', icon: '🔐', salary: '₹12–18 LPA' },
                  { title: 'DevOps Engineer', company: 'CloudScale Inc', location: 'Remote', urgency: 'Medium', color: '#10B981', icon: '⚙️', salary: '₹15–22 LPA' },
                  { title: 'Data Scientist', company: 'Analytics Hub', location: 'Mumbai', urgency: 'Medium', color: '#F5A623', icon: '📊', salary: '₹20–30 LPA' },
                ]).map((job, idx) => (
                  <div
                    key={job.title + idx}
                    style={{
                      position: 'relative',
                      background: 'rgba(15,31,53,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 14,
                      padding: '14px 18px',
                      marginBottom: 12,
                      backdropFilter: 'blur(16px)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                      animation: `tn-float ${5 + idx}s ease-in-out infinite`,
                      animationDelay: `${idx * 0.5}s`,
                      borderLeft: `3px solid ${job.color || (idx % 2 === 0 ? '#0176D3' : '#10B981')}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: `${job.color || '#0176D3'}20`, border: `1px solid ${job.color || '#0176D3'}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                        {job.icon || '💼'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: 'white', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.title}</div>
                        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 1 }}>{job.company || job.companyName} · {job.location || 'India'}</div>
                      </div>
                      <span style={{ background: `${(job.urgency === 'High' ? '#BA0517' : (job.urgency === 'Medium' ? '#F59E0B' : '#10b981'))}22`, color: (job.urgency === 'High' ? '#BA0517' : (job.urgency === 'Medium' ? '#F59E0B' : '#10b981')), fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 100, flexShrink: 0 }}>{job.urgency || 'New'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#00C2CB', fontSize: 11, fontWeight: 700 }}>{job.salary || (job.salaryMin ? `₹${job.salaryMin} LPA+` : 'Best in Industry')}</span>
                      <span style={{ background: 'rgba(1,118,211,0.15)', color: '#60a5fa', fontSize: 9, fontWeight: 600, padding: '3px 10px', borderRadius: 6 }}>View Details →</span>
                    </div>
                  </div>
                ))}
                {/* Floating badge */}
                <div style={{ position: 'absolute', top: -20, right: -20, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: '8px 14px', backdropFilter: 'blur(12px)' }}>
                  <div style={{ color: '#10B981', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 2 }}>● LIVE</div>
                  <div style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>48hr Response</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FILTER BAR ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '16px 0', position: 'sticky', top: 70, zIndex: 90, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div className="tn-container">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Urgency filter pills */}
            {['All', 'High', 'Medium', 'Low'].map(u => (
              <button key={u} onClick={() => setUrgencyFilter(u)} style={{ padding: '8px 18px', borderRadius: 50, border: '1.5px solid', borderColor: urgencyFilter === u ? '#0176D3' : '#E2E8F0', background: urgencyFilter === u ? 'linear-gradient(135deg,#0176D3,#014486)' : 'transparent', color: urgencyFilter === u ? '#fff' : '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                {u === 'All' ? 'All Urgency' : `⚡ ${u}`}
              </button>
            ))}
            <select
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
              style={{ padding: '8px 14px', border: '1.5px solid #E2E8F0', borderRadius: 50, fontSize: 13, color: '#64748B', background: '#F7F8FC', outline: 'none', cursor: 'pointer' }}
            >
              {(Array.isArray(locations) ? locations : []).map(l => <option key={l} value={l}>{l === 'All' ? 'All Locations' : l}</option>)}
            </select>
            <span style={{ marginLeft: 'auto', color: '#64748B', fontSize: 13 }}>
              <b style={{ color: '#0176D3' }}>{filtered.length}</b> roles found
            </span>
          </div>
        </div>
      </div>

      {/* ── JOB LISTINGS ── */}
      <section style={{ background: '#F7F8FC', padding: '40px 0 80px' }}>
        <div className="tn-container">
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 80 }}><Spinner /></div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 80 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <p style={{ color: '#64748B', fontSize: 15 }}>No jobs match your search. Try clearing the filters.</p>
                <button onClick={() => { setSearch(''); setUrgencyFilter('All'); setLocationFilter('All'); }} className="tn-btn tn-btn-primary" style={{ marginTop: 16 }}>
                  Clear Filters
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Featured shared job — shown at top when arriving from a shared link */}
                {sharedJob && !filtered.some(j => String(j.id || j._id) === String(sharedJob.id || sharedJob._id)) && (
                  <div style={{ background: 'linear-gradient(135deg,rgba(1,118,211,0.06),rgba(1,68,134,0.04))', borderRadius: 16, padding: '20px 24px', border: '2px solid rgba(1,118,211,0.3)', boxShadow: '0 4px 24px rgba(1,118,211,0.12)', marginBottom: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#0176D3', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      🔗 Shared Job
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: '#0A1628', marginBottom: 4 }}>{sharedJob.title}</div>
                    <div style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>🏢 {sharedJob.company}{sharedJob.location ? ` · 📍 ${sharedJob.location}` : ''}</div>
                    <button onClick={() => { setApplying(sharedJob); setViewingJob(sharedJob); }}
                      className="tn-btn tn-btn-primary" style={{ fontSize: 13, padding: '10px 22px' }}>
                      Apply Now →
                    </button>
                  </div>
                )}

                {(Array.isArray(filtered) ? filtered : []).map(j => (
                  <div
                    key={j.id}
                    style={{ background: '#fff', borderRadius: 16, padding: '24px 28px', borderLeft: `4px solid ${TYPE_COLOR[j.urgency] || '#0176D3'}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', transition: 'all 0.22s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.06)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 260 }}>
                        {/* Badges */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                          <span style={{ background: `${TYPE_COLOR[j.urgency] || '#0176D3'}20`, color: TYPE_COLOR[j.urgency] || '#0176D3', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50, border: `1px solid ${TYPE_COLOR[j.urgency] || '#0176D3'}40` }}>
                            ⚡ {j.urgency} Priority
                          </span>
                          {(j.status === 'Open' || j.status === 'active') && (
                            <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50, border: '1px solid rgba(16,185,129,0.3)' }}>
                              ● Actively Hiring
                            </span>
                          )}
                          {j.externalUrl && (
                            <span style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 50, border: '1px solid rgba(245,158,11,0.3)' }}>
                              🌐 External Opening
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#0176D3,#014486)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                            {(j.company || 'T').charAt(0).toUpperCase()}
                          </div>
                          {/* Crawlable link to the SSR canonical page for non-JS bots */}
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0A1628', margin: 0 }}>
                            <a href={j.canonicalUrl || `/careers/job/${j.seoSlug || j._id || j.id}`}
                               style={{ color: 'inherit', textDecoration: 'none' }}
                               aria-label={`View ${j.title} at ${j.company} job details`}>
                              {j.title}
                            </a>
                          </h3>
                        </div>

                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: '#64748B', fontSize: '0.85rem', marginBottom: 10 }}>
                          <span>🏢 {j.company}</span>
                          <span>📍 {j.location || 'Remote'}</span>
                          <span>🗓 {j.experience || 'Any'} exp</span>
                        </div>

                        {j.description && (
                          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: '0 0 12px', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{j.description}</p>
                        )}

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                          {(Array.isArray(j.skills) ? j.skills : (j.skills || '').split(',')).filter(Boolean).slice(0, 5).map(s => (
                            <span key={s} style={{ background: 'rgba(1,118,211,0.08)', color: '#0176D3', fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(1,118,211,0.15)' }}>
                              {s.trim()}
                            </span>
                          ))}
                        </div>

                        <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                          {(() => {
                            const d = j.createdAt || j.postedAt;
                            if (!d) return 'Posted recently';
                            const days = Math.floor((Date.now() - new Date(d)) / 86400000);
                            if (days < 1) return 'Posted today';
                            if (days < 7) return `Posted ${days} day${days > 1 ? 's' : ''} ago`;
                            if (days < 30) return `Posted ${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
                            return `Posted on ${new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
                          })()} · {j.applicantsCount || 0} applicants
                        </div>
                      </div>

                      {/* CTA */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', paddingTop: 4 }}>
                        <button onClick={() => { const jj = { ...j, id: j._id || j.id }; setApplying(jj); setViewingJob(jj); }} className="tn-btn tn-btn-primary" style={{ whiteSpace: 'nowrap', fontSize: 13, padding: '10px 20px' }}>
                          {getCompanyCareerUrl(j.externalUrl) ? '🌐 Apply on Company Site →' : 'Apply Now →'}
                        </button>
                        {getCompanyCareerUrl(j.externalUrl) && (
                          <span style={{ color: '#94a3b8', fontSize: '0.7rem', textAlign: 'right', maxWidth: 160, lineHeight: 1.4 }}>
                            We save your profile, then redirect you
                          </span>
                        )}
                        {/* Share button */}
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => shareJob(j)}
                            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F7F8FC', color: '#374151', fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                            🔗 Share
                          </button>
                        </div>
                        <button onClick={() => navigate('/login')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F7F8FC', color: '#64748B', fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          Sign In to Track
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {hasMore && (
                  <div style={{ textAlign: 'center', marginTop: 24, marginBottom: 24 }}>
                    <button 
                      onClick={() => setPage(p => p + 1)} 
                      disabled={loadingMore}
                      style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 50, padding: '12px 32px', color: '#0176D3', fontWeight: 700, fontSize: 14, cursor: loadingMore ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: loadingMore ? 0.7 : 1, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    >
                      {loadingMore ? 'Loading...' : 'Load More Jobs ↓'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: 'linear-gradient(135deg,#0176D3,#00C2CB)', padding: '80px 0', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', top: -200, left: -100, pointerEvents: 'none' }} />
        <div className="tn-container" style={{ position: 'relative' }}>
          <h2 style={{ color: '#ffffff', fontSize: 'clamp(1.8rem,4vw,2.5rem)', fontWeight: 900, marginBottom: 16 }}>Not Seeing the Right Role?</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 36, maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.7 }}>
            Submit your profile and we'll reach out the moment the perfect opportunity opens up.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/contact" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', color: '#0176D3', padding: '13px 28px', borderRadius: 8, fontWeight: 800, fontSize: 14, textDecoration: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>Send Your Profile →</Link>
            <button onClick={() => navigate('/login')} style={{ padding: '13px 28px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Sign In to HR Portal</button>
          </div>
        </div>
      </section>

      <MarketingFooter />

      {applying && <ApplyModal job={applying} onClose={() => setApplying(null)} />}

      {/* ── Crawler-visible content (noscript + paginated links) ────────────
           Bots that don't execute JS see this static HTML with real job links.
           NaukriBot, IndeedBot, Googlebot all follow these <a href> links.
           Users never see this section (visually hidden). ──────────────── */}
      <noscript>
        <section aria-label="Job listings for search engine crawlers" style={{ display: 'block' }}>
          <h2>Open Job Positions — TalentNest HR</h2>
          {jobs.slice(0, 100).map(j => (
            <article key={j.id || j._id}>
              <h3><a href={j.canonicalUrl || `/careers/job/${j.seoSlug || j._id || j.id}`}>{j.title}</a></h3>
              <p>{j.company || j.companyName} · {j.location} · {j.jobType}</p>
              {(j.createdAt) && <time dateTime={new Date(j.createdAt).toISOString()}>Posted {new Date(j.createdAt).toLocaleDateString('en-IN')}</time>}
              {j.description && <p>{j.description.slice(0, 200)}</p>}
            </article>
          ))}
        </section>
      </noscript>

      {/* Bot-followable paginated links — hidden from users, readable by all crawlers */}
      <div aria-hidden="true" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
        <nav aria-label="Job listing pages for crawlers">
          {Array.from({ length: Math.ceil(totalJobs / 20) }, (_, i) => i + 1).slice(0, 100).map(p => (
            <a key={p} href={`/careers?page=${p}`} rel={p > 1 ? 'next' : undefined}>Page {p}</a>
          ))}
        </nav>
        <div>
          {jobs.slice(0, 50).map(j => (
            <a key={j.id || j._id} href={j.canonicalUrl || `/careers/job/${j.seoSlug || j._id || j.id}`}>
              {j.title} — {j.company} — {j.location}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
