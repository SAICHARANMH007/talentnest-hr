import React, { useState, useEffect, useRef } from 'react';
import Toast from '../../components/ui/Toast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Field from '../../components/ui/Field.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import ResumeCard from '../../components/shared/ResumeCard.jsx';
import { btnP, btnG, card, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';

// ── helpers ───────────────────────────────────────────────────────────────────
const parseJ = (s, fallback = []) => { if (Array.isArray(s)) return s; try { return JSON.parse(s || '[]'); } catch { return fallback; } };
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
}

// ── sub-components ────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ ...card, marginBottom: 16 }}>
      {title && <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 700, margin: '0 0 14px', letterSpacing: 1 }}>{title}</p>}
      {children}
    </div>
  );
}

function WorkEntry({ entry, onChange, onDelete }) {
  const sf = (k, v) => onChange({ ...entry, [k]: v });
  return (
    <div style={{ border: '1px solid rgba(1,118,211,0.15)', borderRadius: 10, padding: 14, marginBottom: 12, background: 'rgba(1,118,211,0.03)' }}>
      <div className="form-grid-2">
        <Field label="Job Title *" value={entry.title || ''} onChange={v => sf('title', v)} placeholder="Senior Software Engineer"/>
        <Field label="Company / Employer *" value={entry.company || ''} onChange={v => sf('company', v)} placeholder="Acme Corp"/>
        <Field label="Location" value={entry.location || ''} onChange={v => sf('location', v)} placeholder="Hyderabad, India"/>
        <div>
          <label style={{ color: '#0176D3', fontSize: 11, display: 'block', marginBottom: 6 }}>Employment Type</label>
          <select value={entry.type || 'Full-Time'} onChange={e => sf('type', e.target.value)} style={inp}>
            {['Full-Time', 'Part-Time', 'Contract', 'Freelance', 'Internship'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <Field label="From (MM/YYYY)" value={entry.from || ''} onChange={v => sf('from', v)} placeholder="Jan 2020"/>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Field label="To (MM/YYYY)" value={entry.current ? 'Present' : (entry.to || '')} onChange={v => sf('to', v)} placeholder="Dec 2022" disabled={!!entry.current}/>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#706E6B', fontSize: 11, cursor: 'pointer', marginBottom: 6, whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={!!entry.current} onChange={e => sf('current', e.target.checked)} style={{ accentColor: '#0176D3' }}/> Current
          </label>
        </div>
        <div className="span-2">
          <Field label="Responsibilities & Achievements" value={entry.description || ''} onChange={v => sf('description', v)} rows={3} placeholder="• Led a team of 5 engineers..."/>
        </div>
      </div>
      <button onClick={onDelete} style={{ marginTop: 8, background: 'none', border: 'none', color: '#BA0517', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>✕ Remove</button>
    </div>
  );
}

function EduEntry({ entry, onChange, onDelete }) {
  const sf = (k, v) => onChange({ ...entry, [k]: v });
  return (
    <div style={{ border: '1px solid rgba(1,118,211,0.15)', borderRadius: 10, padding: 14, marginBottom: 12, background: 'rgba(1,118,211,0.03)' }}>
      <div className="form-grid-2">
        <Field label="Degree / Qualification *" value={entry.degree || ''} onChange={v => sf('degree', v)} placeholder="B.Tech Computer Science"/>
        <Field label="Institution *" value={entry.institution || ''} onChange={v => sf('institution', v)} placeholder="JNTU Hyderabad"/>
        <Field label="University / Board" value={entry.university || ''} onChange={v => sf('university', v)} placeholder="JNTU"/>
        <Field label="Location" value={entry.location || ''} onChange={v => sf('location', v)} placeholder="Hyderabad"/>
        <Field label="Year of Passing" value={entry.year || ''} onChange={v => sf('year', v)} placeholder="2019"/>
        <Field label="Grade / CGPA" value={entry.grade || ''} onChange={v => sf('grade', v)} placeholder="8.5 CGPA / 78%"/>
      </div>
      <button onClick={onDelete} style={{ marginTop: 8, background: 'none', border: 'none', color: '#BA0517', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>✕ Remove</button>
    </div>
  );
}

function CertEntry({ entry, onChange, onDelete }) {
  const sf = (k, v) => onChange({ ...entry, [k]: v });
  return (
    <div style={{ border: '1px solid rgba(1,118,211,0.15)', borderRadius: 10, padding: 14, marginBottom: 10, background: 'rgba(1,118,211,0.03)' }}>
      <div className="form-grid-2">
        <Field label="Certification Name *" value={entry.name || ''} onChange={v => sf('name', v)} placeholder="AWS Solutions Architect"/>
        <Field label="Issuing Organization" value={entry.issuer || ''} onChange={v => sf('issuer', v)} placeholder="Amazon Web Services"/>
        <Field label="Year" value={entry.year || ''} onChange={v => sf('year', v)} placeholder="2023"/>
        <Field label="Credential ID / URL (optional)" type="url" value={entry.url || ''} onChange={v => sf('url', v)} placeholder="https://credly.com/..."/>
      </div>
      <button onClick={onDelete} style={{ marginTop: 6, background: 'none', border: 'none', color: '#BA0517', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>✕ Remove</button>
    </div>
  );
}

// ── Video Resume Section ───────────────────────────────────────────────────────
function VideoResumeSection({ candidateId, existingUrl, onSaved }) {
  const [phase, setPhase]         = useState('idle');
  const [blob, setBlob]           = useState(null);
  const [previewUrl, setPreview]  = useState(null);
  const [countdown, setCountdown] = useState(60);
  const [recording, setRecording] = useState(false);
  const [error, setError]         = useState('');
  const [toast, setToast]         = useState('');
  const videoRef   = useRef(null);
  const mediaRef   = useRef(null);
  const chunksRef  = useRef([]);
  const timerRef   = useRef(null);
  const streamRef  = useRef(null);

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      const mimeType = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4'].find(t => MediaRecorder.isTypeSupported(t)) || '';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
        setBlob(b);
        const url = URL.createObjectURL(b);
        setPreview(url);
        if (videoRef.current) { videoRef.current.srcObject = null; videoRef.current.src = url; }
        setPhase('preview');
        streamRef.current?.getTracks().forEach(t => t.stop());
      };
      mr.start(1000);
      setRecording(true);
      setCountdown(60);
      setPhase('recording');
      let secs = 60;
      timerRef.current = setInterval(() => {
        secs--;
        setCountdown(secs);
        if (secs <= 0) { clearInterval(timerRef.current); mr.stop(); setRecording(false); }
      }, 1000);
    } catch (e) {
      setError(e.name === 'NotAllowedError' ? 'Camera/microphone permission denied. Please allow access.' : `Camera error: ${e.message}`);
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    mediaRef.current?.stop();
    setRecording(false);
  };

  const upload = async () => {
    if (!blob) return;
    setPhase('uploading');
    try {
      const fd = new FormData();
      fd.append('video', blob, 'video-resume.webm');
      const r = await api.uploadVideoResume(candidateId, fd);
      const url = r?.data?.videoResumeUrl || r?.videoResumeUrl;
      if (url) { onSaved(url); setToast('✅ Video resume saved!'); setPhase('done'); }
      else throw new Error('No URL returned');
    } catch (e) { setError(`Upload failed: ${e.message}`); setPhase('preview'); }
  };

  return (
    <div style={{ ...card }}>
      <Toast msg={toast} onClose={() => setToast('')}/>
      <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 700, margin: '0 0 4px', letterSpacing: 1 }}>🎥 VIDEO RESUME</p>
      <p style={{ color: '#706E6B', fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>Record a 60-second introduction. This appears on your profile and helps recruiters know you better.</p>
      {error && <div style={{ background: '#FFF1F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#BA0517', fontSize: 12, marginBottom: 12 }}>{error}</div>}
      {existingUrl && phase === 'idle' && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: '#706E6B', fontSize: 11, marginBottom: 8 }}>Current video resume:</p>
          <video src={existingUrl} controls style={{ width: '100%', maxWidth: 480, borderRadius: 10, background: '#000' }} />
        </div>
      )}
      <video ref={videoRef} style={{ width: '100%', maxWidth: 480, borderRadius: 10, background: '#1e293b', display: ['recording','preview'].includes(phase) ? 'block' : 'none', marginBottom: 12 }} playsInline muted={phase === 'recording'} controls={phase === 'preview'} />
      {phase === 'recording' && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ background: '#BA0517', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 7, height: 7, background: '#fff', borderRadius: '50%', animation: 'pulse 1s infinite' }}/>REC</span>
          <span style={{ color: '#706E6B', fontSize: 12 }}>⏱ {countdown}s remaining</span>
          <button onClick={stopRecording} style={{ ...btnG, padding: '6px 14px', fontSize: 12, color: '#BA0517', borderColor: '#BA0517' }}>⏹ Stop</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {['idle','done'].includes(phase) && <button onClick={startRecording} style={{ ...btnP, fontSize: 12, padding: '8px 18px' }}>{existingUrl || phase === 'done' ? '🔄 Re-record' : '🎥 Start Recording'}</button>}
        {phase === 'preview' && (
          <>
            <button onClick={upload} style={{ ...btnP, fontSize: 12, padding: '8px 18px' }}>⬆ Upload Video</button>
            <button onClick={() => { setBlob(null); setPreview(null); setPhase('idle'); if (videoRef.current) videoRef.current.src = ''; }} style={{ ...btnG, fontSize: 12, padding: '8px 18px' }}>🔁 Re-record</button>
          </>
        )}
        {phase === 'uploading' && <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#706E6B', fontSize: 12 }}><Spinner/> Uploading…</div>}
        {phase === 'done' && <span style={{ color: '#2E844A', fontSize: 12, fontWeight: 600, alignSelf: 'center' }}>✅ Saved!</span>}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CandidateProfile({ user }) {
  const isMobile = useIsMobile();
  const [profile, setProfile] = useState(null);
  const [loading, setLoad]    = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState('');
  const [tab, setTab]         = useState('personal');

  const [form, setForm] = useState({
    name:'', email:'', phone:'', title:'', location:'', linkedinUrl:'', github:'', portfolio:'',
    availability:'Immediate', summary:'', skills:'', languages:'', industry:'',
    experience:'', currentCompany:'', culture:'', projects:'', achievements:'', volunteering:'',
    relevantExperience:'', preferredLocation:'', currentCTC:'', expectedCTC:'',
    source:'', dateAdded:'', candidateStatus:'', additionalDetails:'',
  });
  const [workHistory, setWork]  = useState([]);
  const [eduList, setEdu]       = useState([]);
  const [certList, setCerts]    = useState([]);

  useEffect(() => {
    api.getUser(user.id)
      .then(res => {
        const d = res.data || res;
        setProfile(d);
        setForm({
          name: d.name||'', email: d.email||'', phone: d.phone||'', title: d.title||'',
          location: d.location||'', linkedinUrl: d.linkedinUrl||d.linkedin||'', github: d.github||'',
          portfolio: d.portfolio||'', availability: d.availability||'Immediate',
          summary: d.summary||'', skills: Array.isArray(d.skills) ? d.skills.join(', ') : (d.skills||''),
          languages: Array.isArray(d.languages) ? d.languages.join(', ') : (d.languages||''),
          industry: d.industry||'', experience: String(d.experience||''),
          currentCompany: d.currentCompany||'', culture: d.culture||'',
          projects: d.projects||'', achievements: d.achievements||'', volunteering: d.volunteering||'',
          relevantExperience: d.relevantExperience||'', preferredLocation: d.preferredLocation||'',
          currentCTC: d.currentCTC||'', expectedCTC: d.expectedCTC||'',
          source: d.source||'', dateAdded: d.dateAdded||'',
          candidateStatus: d.candidateStatus||'', additionalDetails: d.additionalDetails||'',
        });
        setWork(parseJ(d.workHistory));
        setEdu(parseJ(d.educationList));
        setCerts(parseJ(d.certifications));
      })
      .catch(e => setToast(`Failed to load: ${e.message}`))
      .finally(() => setLoad(false));
  }, [user.id]);

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name?.trim()) { setToast('❌ Full name is required'); setTab('personal'); return; }
    if (!form.email?.trim()) { setToast('❌ Email address is required'); setTab('personal'); return; }
    if (form.linkedinUrl && !/^https?:\/\/(www\.)?linkedin\.com\/in\//i.test(form.linkedinUrl)) {
      setToast('❌ LinkedIn URL must start with https://linkedin.com/in/'); setTab('personal'); return;
    }
    setSaving(true);
    try {
      const skills = typeof form.skills === 'string' ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(form.skills) ? form.skills : []);
      const languages = typeof form.languages === 'string' ? form.languages.split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(form.languages) ? form.languages : []);
      const res = await api.updateProfile({
        ...form,
        phone: (form.phone || '').replace(/\s+/g, ''),
        skills, languages,
        experience: parseInt(form.experience) || 0,
        workHistory: JSON.stringify(workHistory),
        educationList: JSON.stringify(eduList),
        certifications: JSON.stringify(certList),
      });
      const d = res?.data || res;
      setProfile(d);
      setToast('✅ Profile saved!');
    } catch(e) { setToast('❌ ' + e.message); }
    setSaving(false);
  };

  const resumeData = { ...form, experience: parseInt(form.experience) || 0, workHistory, educationList: eduList, certifications: certList };

  if (loading) return <div style={{ color:'#706E6B', padding:40, display:'flex', gap:10 }}><Spinner/> Loading...</div>;

  // Tab definitions — emoji-only label on mobile, full label on desktop
  const TABS = [
    { key: 'personal',  emoji: '👤', label: 'Personal'   },
    { key: 'summary',   emoji: '📝', label: 'Summary'    },
    { key: 'work',      emoji: '💼', label: 'Experience' },
    { key: 'education', emoji: '🎓', label: 'Education'  },
    { key: 'skills',    emoji: '🔧', label: 'Skills'     },
    { key: 'extras',    emoji: '🏆', label: 'Extras'     },
    { key: 'video',     emoji: '🎥', label: 'Video'      },
    { key: 'resume',    emoji: '📋', label: 'Resume'     },
  ];

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')}/>
      <PageHeader title="My Profile" subtitle="Build your professional resume — all fields, download anytime"/>

      {/* ── Tab bar — scrollable, compact on mobile ── */}
      <div
        role="tablist"
        style={{
          display: 'flex',
          gap: isMobile ? 2 : 4,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingBottom: 0,
          borderBottom: '2px solid #F3F2F2',
          marginBottom: 16,
          background: '#fff',
          borderRadius: '10px 10px 0 0',
          padding: isMobile ? '4px 4px 0' : '4px 8px 0',
        }}
      >
        {TABS.map(({ key, emoji, label }) => {
          const isActive = tab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(key)}
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'center',
                gap: isMobile ? 2 : 6,
                padding: isMobile ? '6px 10px' : '8px 16px',
                fontSize: isMobile ? 10 : 12,
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                border: 'none',
                borderBottom: isActive ? '2px solid #0176D3' : '2px solid transparent',
                marginBottom: -2,
                borderRadius: '8px 8px 0 0',
                background: isActive ? 'rgba(1,118,211,0.08)' : 'transparent',
                color: isActive ? '#0176D3' : '#64748b',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.15s',
                minWidth: isMobile ? 44 : 'auto',
              }}
            >
              <span style={{ fontSize: isMobile ? 18 : 14 }}>{emoji}</span>
              <span>{isMobile ? label.split(' ')[0] : label}</span>
            </button>
          );
        })}
      </div>

      {/* ── PERSONAL INFO ── */}
      {tab === 'personal' && (
        <>
          <Section title="👤 PERSONAL INFORMATION">
            <div className="form-grid-2">
              <Field label="Full Name *" value={form.name} onChange={v=>sf('name',v)} placeholder="Jane Smith"/>
              <Field label="Email *" value={form.email} onChange={v=>sf('email',v)} type="email"/>
              <Field label="Phone *" value={form.phone} onChange={v=>sf('phone',v)} type="tel" placeholder="+91 99999 00000"/>
              <Field label="City, State / Location" value={form.location} onChange={v=>sf('location',v)} placeholder="Hyderabad, Telangana"/>
              <Field label="LinkedIn URL" value={form.linkedinUrl} onChange={v=>sf('linkedinUrl',v)} type="url" placeholder="https://linkedin.com/in/username"/>
              <Field label="GitHub URL" value={form.github} onChange={v=>sf('github',v)} type="url" placeholder="https://github.com/username"/>
              <Field label="Portfolio / Website" value={form.portfolio} onChange={v=>sf('portfolio',v)} type="url" placeholder="https://yoursite.com"/>
              <div>
                <label style={{ color:'#0176D3', fontSize:11, display:'block', marginBottom:6 }}>Availability</label>
                <select value={form.availability} onChange={e=>sf('availability',e.target.value)} style={inp}>
                  {['Immediate','15 days notice','30 days notice','60 days notice','90 days notice','Currently Employed'].map(a=><option key={a}>{a}</option>)}
                </select>
              </div>
            </div>
          </Section>

          <Section title="💼 CURRENT ROLE">
            <div className="form-grid-2">
              <Field label="Job Title / Designation" value={form.title} onChange={v=>sf('title',v)} placeholder="Senior Software Engineer"/>
              <Field label="Current Company" value={form.currentCompany} onChange={v=>sf('currentCompany',v)} placeholder="Acme Corp"/>
              <Field label="Total Experience (years)" value={form.experience} onChange={v=>sf('experience',v)} type="number" placeholder="5" min="0" max="60"/>
              <Field label="Relevant Experience" value={form.relevantExperience} onChange={v=>sf('relevantExperience',v)} placeholder="4 years Java / 3 years AWS"/>
              <Field label="Industry / Domain" value={form.industry} onChange={v=>sf('industry',v)} placeholder="Information Technology"/>
              <Field label="Preferred Work Location" value={form.preferredLocation} onChange={v=>sf('preferredLocation',v)} placeholder="Hyderabad / Remote / Any"/>
              <Field label="Current CTC" value={form.currentCTC} onChange={v=>sf('currentCTC',v)} placeholder="12 LPA"/>
              <Field label="Expected CTC" value={form.expectedCTC} onChange={v=>sf('expectedCTC',v)} placeholder="18 LPA"/>
            </div>
          </Section>

          {(profile?.client || profile?.ta || profile?.source || profile?.dateAdded || profile?.candidateStatus || profile?.additionalDetails) && (
            <Section title="🏛 PLACEMENT INFO (set by admin)">
              <div className="form-grid-2">
                {profile.client         && <div><span style={{ color:'#0176D3', fontSize:11, display:'block', marginBottom:4 }}>Client Company</span><span style={{ color:'#181818', fontSize:13 }}>{profile.client}</span></div>}
                {profile.ta             && <div><span style={{ color:'#0176D3', fontSize:11, display:'block', marginBottom:4 }}>Talent Acquisition</span><span style={{ color:'#181818', fontSize:13 }}>{profile.ta}</span></div>}
                {profile.clientSpoc     && <div><span style={{ color:'#0176D3', fontSize:11, display:'block', marginBottom:4 }}>Client SPOC</span><span style={{ color:'#181818', fontSize:13 }}>{profile.clientSpoc}</span></div>}
                {profile.jobRole        && <div><span style={{ color:'#0176D3', fontSize:11, display:'block', marginBottom:4 }}>Role Applied For</span><span style={{ color:'#181818', fontSize:13 }}>{profile.jobRole}</span></div>}
                {profile.source         && <div><span style={{ color:'#0176D3', fontSize:11, display:'block', marginBottom:4 }}>Source</span><span style={{ color:'#181818', fontSize:13 }}>{profile.source}</span></div>}
                {profile.dateAdded      && <div><span style={{ color:'#0176D3', fontSize:11, display:'block', marginBottom:4 }}>Date Added</span><span style={{ color:'#181818', fontSize:13 }}>{profile.dateAdded}</span></div>}
                {profile.candidateStatus && <div><span style={{ color:'#0176D3', fontSize:11, display:'block', marginBottom:4 }}>Status</span><span style={{ color:'#181818', fontSize:13 }}>{profile.candidateStatus}</span></div>}
                {profile.additionalDetails && <div style={{ gridColumn: 'span 2' }}><span style={{ color:'#0176D3', fontSize:11, display:'block', marginBottom:4 }}>Additional Details</span><span style={{ color:'#181818', fontSize:13 }}>{profile.additionalDetails}</span></div>}
              </div>
            </Section>
          )}
        </>
      )}

      {/* ── SUMMARY ── */}
      {tab === 'summary' && (
        <Section title="📝 PROFESSIONAL SUMMARY & OBJECTIVE">
          <p style={{ color:'#706E6B', fontSize:11, marginBottom:10, lineHeight:1.6 }}>
            Write 3–5 sentences highlighting your expertise, key achievements, and career goals.
          </p>
          <Field label="Professional Summary *" value={form.summary} onChange={v=>sf('summary',v)} rows={6} placeholder="Results-driven Software Engineer with 5+ years of experience..."/>
          <div style={{ marginTop:14 }}>
            <Field label="Culture / Work Style Tags (comma-separated)" value={form.culture} onChange={v=>sf('culture',v)} placeholder="collaborative, remote-friendly, agile, data-driven"/>
            {form.culture && (
              <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:8 }}>
                {(Array.isArray(form.culture) ? form.culture : (form.culture||'').split(',').map(s=>s.trim()).filter(Boolean)).map(s=><Badge key={s} label={s} color="#A07E00"/>)}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── WORK EXPERIENCE ── */}
      {tab === 'work' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, gap:8 }}>
            <p style={{ color:'#0176D3', fontSize:11, fontWeight:700, margin:0, letterSpacing:1 }}>💼 WORK EXPERIENCE — {workHistory.length} {workHistory.length===1?'entry':'entries'}</p>
            <button onClick={()=>setWork(p=>[...p,{id:uid(),title:'',company:'',location:'',type:'Full-Time',from:'',to:'',current:false,description:''}])} style={{ ...btnP, padding:'6px 14px', fontSize:11, flexShrink:0 }}>+ Add Job</button>
          </div>
          {workHistory.length === 0 && (
            <div style={{ ...card, textAlign:'center', padding:30, color:'#9E9D9B' }}>
              <p style={{ fontSize:28, marginBottom:8 }}>💼</p>
              <p>No work experience yet. Click <b>+ Add Job</b> to start.</p>
            </div>
          )}
          {workHistory.map(e => (
            <WorkEntry key={e.id} entry={e}
              onChange={u => setWork(p => p.map(x => x.id===e.id ? u : x))}
              onDelete={() => setWork(p => p.filter(x => x.id!==e.id))}/>
          ))}
        </div>
      )}

      {/* ── EDUCATION ── */}
      {tab === 'education' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, gap:8 }}>
            <p style={{ color:'#0176D3', fontSize:11, fontWeight:700, margin:0, letterSpacing:1 }}>🎓 EDUCATION — {eduList.length} {eduList.length===1?'entry':'entries'}</p>
            <button onClick={()=>setEdu(p=>[...p,{id:uid(),degree:'',institution:'',university:'',location:'',year:'',grade:''}])} style={{ ...btnP, padding:'6px 14px', fontSize:11, flexShrink:0 }}>+ Add Education</button>
          </div>
          {eduList.length === 0 && (
            <div style={{ ...card, textAlign:'center', padding:30, color:'#9E9D9B' }}>
              <p style={{ fontSize:28, marginBottom:8 }}>🎓</p>
              <p>No education entries yet. Click <b>+ Add Education</b>.</p>
            </div>
          )}
          {eduList.map(e => (
            <EduEntry key={e.id} entry={e}
              onChange={u => setEdu(p => p.map(x => x.id===e.id ? u : x))}
              onDelete={() => setEdu(p => p.filter(x => x.id!==e.id))}/>
          ))}

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, marginTop:24, gap:8 }}>
            <p style={{ color:'#0176D3', fontSize:11, fontWeight:700, margin:0, letterSpacing:1 }}>📜 CERTIFICATIONS — {certList.length} {certList.length===1?'entry':'entries'}</p>
            <button onClick={()=>setCerts(p=>[...p,{id:uid(),name:'',issuer:'',year:'',url:''}])} style={{ ...btnP, padding:'6px 14px', fontSize:11, flexShrink:0 }}>+ Add Cert</button>
          </div>
          {certList.map(e => (
            <CertEntry key={e.id} entry={e}
              onChange={u => setCerts(p => p.map(x => x.id===e.id ? u : x))}
              onDelete={() => setCerts(p => p.filter(x => x.id!==e.id))}/>
          ))}
        </div>
      )}

      {/* ── SKILLS ── */}
      {tab === 'skills' && (
        <Section title="🔧 SKILLS & LANGUAGES">
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <Field label="Technical Skills (comma-separated)" value={form.skills} onChange={v=>sf('skills',v)} placeholder="React, Node.js, Python, AWS, Docker, MongoDB..."/>
              {form.skills && (
                <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:8 }}>
                  {(Array.isArray(form.skills)?form.skills:(form.skills||'').split(',').map(s=>s.trim()).filter(Boolean)).map(s=><Badge key={s} label={s} color="#0176D3"/>)}
                </div>
              )}
            </div>
            <div>
              <Field label="Languages Known (comma-separated)" value={form.languages} onChange={v=>sf('languages',v)} placeholder="English (Fluent), Hindi (Native), Telugu (Native)"/>
              {form.languages && (
                <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:8 }}>
                  {(Array.isArray(form.languages)?form.languages:(form.languages||'').split(',').map(s=>s.trim()).filter(Boolean)).map(s=><Badge key={s} label={s} color="#10b981"/>)}
                </div>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* ── EXTRAS ── */}
      {tab === 'extras' && (
        <>
          <Section title="📄 RESUME FILE">
            <p style={{ color:'#706E6B', fontSize:11, marginBottom:10, lineHeight:1.5 }}>Upload your resume PDF — stored securely and visible to recruiters.</p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {profile?.resumeUrl && (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(1,118,211,0.06)', borderRadius:10, border:'1px solid rgba(1,118,211,0.2)' }}>
                  <span style={{ fontSize:20 }}>📋</span>
                  <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" style={{ color:'#0176D3', fontSize:13, fontWeight:600, textDecoration:'none' }}>View uploaded resume</a>
                </div>
              )}
              <label style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'#F8FAFF', borderRadius:10, border:'2px dashed rgba(1,118,211,0.3)', cursor:'pointer' }}>
                <span style={{ fontSize:26 }}>⬆</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#181818' }}>Upload Resume PDF</div>
                  <div style={{ fontSize:11, color:'#706E6B', marginTop:2 }}>PDF only · max 5 MB</div>
                </div>
                <input type="file" accept=".pdf" style={{ display:'none' }} onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.type !== 'application/pdf') { setToast('❌ Only PDF files are accepted.'); return; }
                  if (file.size > 5 * 1024 * 1024) { setToast('❌ File too large (max 5MB).'); return; }
                  setSaving(true);
                  try {
                    const fd = new FormData(); fd.append('resume', file);
                    const r = await api.uploadCandidateResume(fd);
                    setProfile(p => ({ ...p, resumeUrl: r?.data?.resumeUrl || r?.resumeUrl || p?.resumeUrl }));
                    setToast('✅ Resume uploaded!');
                  } catch (err) { setToast(`❌ ${err.message}`); }
                  setSaving(false);
                }}/>
              </label>
            </div>
          </Section>
          <Section title="🚀 PROJECTS">
            <p style={{ color:'#706E6B', fontSize:11, marginBottom:8 }}>List your key projects — personal, professional, or academic.</p>
            <Field label="Projects" value={form.projects} onChange={v=>sf('projects',v)} rows={5} placeholder="Project: E-Commerce Platform&#10;Tech: React, Node.js, MongoDB&#10;Description: ..."/>
          </Section>
          <Section title="🏆 ACHIEVEMENTS & AWARDS">
            <Field label="Achievements & Awards" value={form.achievements} onChange={v=>sf('achievements',v)} rows={4} placeholder="• Employee of the Year 2023&#10;• Hackathon Winner 2022"/>
          </Section>
          <Section title="🤝 VOLUNTEERING & ACTIVITIES">
            <Field label="Volunteering & Activities" value={form.volunteering} onChange={v=>sf('volunteering',v)} rows={3} placeholder="• Mentor at CodeForGood (2022–present)"/>
          </Section>
        </>
      )}

      {/* ── VIDEO RESUME ── */}
      {tab === 'video' && (
        <VideoResumeSection
          candidateId={profile?.candidateId || profile?._id || user?.id}
          existingUrl={profile?.videoResumeUrl}
          onSaved={url => setProfile(p => ({ ...p, videoResumeUrl: url }))}
        />
      )}

      {/* ── RESUME PREVIEW ── */}
      {tab === 'resume' && (
        <div>
          <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ flex:1, minWidth: 0 }}>
              <div style={{ color:'#181818', fontWeight:600, fontSize:14 }}>Your Resume</div>
              <div style={{ color:'#706E6B', fontSize:11, marginTop:2 }}>Click "🖨 Print / Save PDF" inside to download</div>
            </div>
            <button onClick={save} disabled={saving} style={{ ...btnP, opacity:saving?0.6:1, flexShrink:0 }}>
              {saving ? <><Spinner/> Saving…</> : '💾 Save All Changes'}
            </button>
          </div>
          <div style={{ border:'1px solid rgba(1,118,211,0.25)', borderRadius:12, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.1)' }}>
            <ResumeCard candidate={resumeData}/>
          </div>
        </div>
      )}

      {/* ── Sticky save footer (all tabs except resume) ── */}
      {tab !== 'resume' && (
        <div style={{
          display: 'flex',
          gap: 10,
          marginTop: 20,
          paddingTop: 16,
          borderTop: '1px solid #F3F2F2',
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          <button
            onClick={save}
            disabled={saving}
            style={{ ...btnP, opacity: saving ? 0.6 : 1, flex: isMobile ? 'unset' : 1, width: isMobile ? '100%' : 'auto', minHeight: 46, fontSize: isMobile ? 15 : 14 }}
          >
            {saving ? <><Spinner/> Saving…</> : '💾 Save Changes'}
          </button>
          <button
            onClick={() => setTab('resume')}
            style={{ ...btnG, borderColor:'rgba(1,118,211,0.4)', color:'#0176D3', width: isMobile ? '100%' : 'auto', minHeight: 46, fontSize: isMobile ? 14 : 13, textAlign: 'center', justifyContent: 'center', display: 'flex', alignItems: 'center' }}
          >
            📋 Preview Resume
          </button>
        </div>
      )}
    </div>
  );
}
