import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import Spinner from '../ui/Spinner.jsx';
import Field from '../ui/Field.jsx';
import Modal from '../ui/Modal.jsx';
import { requestGeolocation } from '../../utils/geolocation.js';

import { getCompanyCareerUrl } from '../../utils/url.js';

export default function PublicApplyModal({ job, orgName, onClose }) {
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
  const [showPassword, setShowPassword] = useState(false);
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
            ['availability', p.availability]
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
    
    for (let i = 0; i < questions.length; i++) {
      if (questions[i].required && !answers[i]?.trim()) {
        setError(`Please answer: "${questions[i].question}"`);
        return;
      }
    }
    if (createAccount && !agreedTerms) { setError('Please accept the Terms & Conditions to create your account.'); return; }
    if (createAccount) {
      if (!password || password.length < 8) { setError('Password must be at least 8 characters.'); return; }
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
    <Modal title={getCompanyCareerUrl(job.externalUrl) ? '✅ Profile Saved!' : 'Application Submitted!'} onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>{accountCreated ? '🎊' : getCompanyCareerUrl(job.externalUrl) ? '🚀' : '🎉'}</div>
        <p style={{ color: '#0f172a', fontSize: 17, fontWeight: 700 }}>
          {accountCreated ? `Account created & application submitted!` : `Thank you, ${form.name}!`}
        </p>

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

        {createAccount && accountCreated && (
          <div style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(5,150,105,0.04))', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 12, textAlign: 'left' }}>
            <p style={{ color: '#065f46', fontSize: 14, fontWeight: 800, margin: '0 0 4px' }}>✅ Account created! Signing you in…</p>
            <p style={{ color: '#374151', fontSize: 15, lineHeight: 1.6, margin: '0 0 24px' }}>
              Your application for <strong>{job.title}</strong> has been successfully saved {orgName ? <>with <strong>{orgName}</strong></> : ''}. Redirecting to your dashboard…
            </p>
            <a href="/app/applications" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#0176D3,#014486)', color: '#fff', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              📋 Go to My Applications →
            </a>
          </div>
        )}
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
              Your profile for <b>{job.title}</b> at <b>{job.company || job.companyName || orgName || 'TalentNest HR'}</b> has been saved with us.
            </p>
            <div style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.08),rgba(245,158,11,0.04))', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '12px 16px', marginTop: 12 }}>
              <p style={{ color: '#92400e', fontSize: 13, margin: 0, fontWeight: 600 }}>
                🌐 Redirecting you to {job.company || job.companyName}'s careers page…
              </p>
              <a href={getCompanyCareerUrl(job.externalUrl)} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', marginTop: 10, background: 'linear-gradient(135deg,#F59E0B,#d97706)', color: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                Open Careers Page →
              </a>
            </div>
          </>
        ) : (
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
            Your application for <b>{job.title}</b> at <b>{job.company || job.companyName || orgName || 'TalentNest HR'}</b> has been received.
            The recruiting team will review your profile and get in touch shortly.
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
        </div>
        <button onClick={onClose} className="btn btn-secondary" style={{ marginTop: 14, width:'100%' }}>Close</button>
      </div>
    </Modal>
  );

  return (
    <Modal
      title={`Apply — ${job.title} @ ${job.company || job.companyName || orgName || 'TalentNest HR'}`}
      onClose={onClose}
      footer={
        <div className="tn-apply-footer-btns" style={{ display: 'flex', gap: 10, width: '100%', flexWrap: 'wrap' }}>
          <button onClick={submit} disabled={submitting} className="btn btn-primary tn-apply-submit" style={{ flex: 2, minWidth: 160, opacity: submitting ? 0.6 : 1, justifyContent: 'center', minHeight: 48, fontSize: 15 }}>
            {submitting
              ? <><Spinner /> {geoStatus === 'asking' ? 'Getting location…' : 'Submitting…'}</>
              : '🚀 Submit Application'}
          </button>
          <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1, minWidth: 100, minHeight: 48 }}>Cancel</button>
        </div>
      }
    >
      {assessmentInfo?.hasAssessment && (
        <div style={{ marginBottom: 14, padding: '10px 14px', background: 'linear-gradient(135deg,rgba(124,58,237,0.07),rgba(109,40,217,0.04))', borderRadius: 8, border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>📝</span>
          <div>
            <p style={{ color: '#5b21b6', margin: 0, fontSize: 12, fontWeight: 700 }}>This job includes a screening assessment</p>
            <p style={{ color: '#374151', margin: '2px 0 0', fontSize: 11 }}>
              <b>{assessmentInfo.title}</b>{assessmentInfo.timeLimitMins > 0 ? ` · ${assessmentInfo.timeLimitMins} min` : ''}{assessmentInfo.questionCount > 0 ? ` · ${assessmentInfo.questionCount} questions` : ''} · Complete after applying
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
      {geoStatus === 'banner' && (
        <div style={{ marginBottom: 12, background: 'linear-gradient(135deg,rgba(1,118,211,0.07),rgba(1,118,211,0.03))', border: '1px solid rgba(1,118,211,0.25)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>📍</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0176D3', marginBottom: 3 }}>Allow your location for personalised job alerts</div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6, marginBottom: 10 }}>
                Share your location to receive job alerts for roles near you by email.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={requestLocationPermission} style={{ background: '#0176D3', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12, padding: '8px 16px', cursor: 'pointer' }}>📍 Allow Location</button>
                <button onClick={() => setGeoStatus('denied')} style={{ background: 'none', border: '1px solid #CBD5E1', borderRadius: 8, color: '#64748B', fontWeight: 600, fontSize: 12, padding: '8px 14px', cursor: 'pointer' }}>Skip</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {geoStatus === 'asking' && (
        <div style={{ marginBottom: 12, background: 'rgba(1,118,211,0.05)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#0176D3' }}>Requesting location…</div>
      )}
      {geoStatus === 'granted' && geo && (
        <div style={{ marginBottom: 12, background: 'rgba(5,150,105,0.07)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#065f46' }}>
          📍 Location detected {geo.city ? `— ${geo.city}` : ''}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {prefillState && (
          <div style={{ background: prefillState.isRegistered ? 'linear-gradient(135deg,rgba(5,150,105,0.08),rgba(5,150,105,0.04))' : 'rgba(1,118,211,0.06)', border: `1px solid ${prefillState.isRegistered ? 'rgba(5,150,105,0.3)' : 'rgba(1,118,211,0.25)'}`, borderRadius: 12, padding: '12px 16px', fontSize: 12 }}>
            <strong>{prefillState.isRegistered ? 'Registered account found!' : 'Profile found'}</strong>
            <p style={{ margin: '4px 0 0' }}>{prefillState.isRegistered ? 'Details pre-filled. Enter mobile to complete.' : 'Details pre-filled. Please verify.'}</p>
          </div>
        )}
        <Field label="Email Address *" value={form.email} onChange={v => { sf('email', v); setPrefillState(null); setUserEditedFields(new Set()); }} onBlur={handleEmailBlur} type="email" placeholder="jane@example.com" />
        <Field label={isHighlighted('name') ? '✅ Full Name *' : 'Full Name *'} value={form.name} onChange={v => handlePrefillFieldChange('name', v)} placeholder="Jane Smith" inputStyle={isHighlighted('name') ? { background:'#f0fdf4', borderColor:'#059669' } : {}} />
        <Field label="Mobile Number *" value={form.phone} onChange={v => sf('phone', v)} placeholder="+91 99999 99999" type="tel" />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:12 }}>
          <Field label="Current Title *" value={form.title} onChange={v => handlePrefillFieldChange('title', v)} placeholder="e.g. Developer" inputStyle={isHighlighted('title') ? { background:'#f0fdf4', borderColor:'#059669' } : {}} />
          <Field label="Current Company *" value={form.currentCompany} onChange={v => handlePrefillFieldChange('currentCompany', v)} placeholder="e.g. TCS" inputStyle={isHighlighted('currentCompany') ? { background:'#f0fdf4', borderColor:'#059669' } : {}} />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:12 }}>
          <div>
            <label style={{ display:'block', fontSize:13, fontWeight:600, marginBottom:4 }}>Experience *</label>
            <select value={form.experience} onChange={e => handlePrefillFieldChange('experience', e.target.value)} style={{ width:'100%', padding:'12px', borderRadius:8, border: isHighlighted('experience') ? '1.5px solid #059669' : '1px solid #DDDBDA', background: '#fff', fontSize: '16px' }}>
              <option value="">Select…</option>
              {['0','1','2','3','4','5','6','7','8','9','10','12','15','20'].map(y => <option key={y} value={y}>{y} yrs</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:'block', fontSize:13, fontWeight:600, marginBottom:4 }}>Availability *</label>
            <select value={form.availability} onChange={e => handlePrefillFieldChange('availability', e.target.value)} style={{ width:'100%', padding:'12px', borderRadius:8, border: isHighlighted('availability') ? '1.5px solid #059669' : '1px solid #DDDBDA', background: '#fff', fontSize: '16px' }}>
              <option value="">Select…</option>
              {['immediate','15 days','30 days','45 days','60 days','90 days'].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <Field label="Cover Letter (optional)" value={form.coverLetter} onChange={v => sf('coverLetter', v)} rows={3} />
        <div style={{ background: 'rgba(1,118,211,0.05)', borderRadius: 12, padding: '14px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontSize: '15px', fontWeight: 700, padding: '4px 0' }}>
            <input type="checkbox" checked={createAccount} onChange={e => setCreateAccount(e.target.checked)} style={{ width: 18, height: 18 }} />
            Create a free account to track application
          </label>
          {createAccount && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Create Password" style={{ width: '100%', padding: '12px 40px 12px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: '15px' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}>{showPassword ? '🙈' : '👁️'}</button>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '14px', padding: '4px 0' }}>
                <input type="checkbox" checked={agreedTerms} onChange={e => setAgreedTerms(e.target.checked)} style={{ width: 18, height: 18 }} />
                I agree to the Terms & Privacy Policy
              </label>
            </div>
          )}
        </div>
        {questions.length > 0 && (
          <div style={{ borderTop: '1px solid #eee', paddingTop: 14 }}>
            <p style={{ color: '#0176D3', fontSize: 12, fontWeight: 700 }}>📋 Screening Questions</p>
            {questions.map((q, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{q.question}</label>
                <textarea value={answers[i] || ''} onChange={e => setAnswers(p => ({ ...p, [i]: e.target.value }))} rows={2} style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #ddd' }} />
              </div>
            ))}
          </div>
        )}
      </div>
      <p style={{ color: '#706E6B', fontSize: 11, marginTop: 12, textAlign: 'center' }}>
        Already have an account? <a href="/login" style={{ color: '#014486', fontWeight: 600 }}>Sign in</a>
      </p>
    </Modal>
  );
}
