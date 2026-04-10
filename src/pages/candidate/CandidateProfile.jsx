import React, { useState, useEffect, useRef } from 'react';
import Toast from '../../components/ui/Toast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Field from '../../components/ui/Field.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import ResumeCard from '../../components/shared/ResumeCard.jsx';
import { btnP, btnG, btnD, card, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';

// ── helpers ───────────────────────────────────────────────────────────────────
const parseJ = (s, fallback = []) => { if (Array.isArray(s)) return s; try { return JSON.parse(s || '[]'); } catch { return fallback; } };
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);

// ── sub-components ────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
      border: 'none', borderRadius: '10px 10px 0 0', whiteSpace: 'nowrap',
      background: active ? 'rgba(1,118,211,0.15)' : 'transparent',
      color: active ? '#0176D3' : '#64748b',
      borderBottom: active ? '2px solid #0176D3' : '2px solid transparent',
    }}>{children}</button>
  );
}

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
          <Field label="Responsibilities & Achievements" value={entry.description || ''} onChange={v => sf('description', v)} rows={3} placeholder="• Led a team of 5 engineers to build...&#10;• Reduced API response time by 40%..."/>
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
        <Field label="Grade / Percentage / CGPA" value={entry.grade || ''} onChange={v => sf('grade', v)} placeholder="8.5 CGPA / 78%"/>
      </div>
      <button onClick={onDelete} style={{ marginTop: 8, background: 'none', border: 'none', color: '#BA0517', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>✕ Remove</button>
    </div>
  );
}

function CertEntry({ entry, onChange, onDelete }) {
  const sf = (k, v) => onChange({ ...entry, [k]: v });
  return (
    <div style={{ border: '1px solid rgba(1,118,211,0.15)', borderRadius: 10, padding: 14, marginBottom: 10, background: 'rgba(1,118,211,0.03)' }}>
      <div className="form-grid-3">
        <Field label="Certification Name *" value={entry.name || ''} onChange={v => sf('name', v)} placeholder="AWS Solutions Architect"/>
        <Field label="Issuing Organization" value={entry.issuer || ''} onChange={v => sf('issuer', v)} placeholder="Amazon Web Services"/>
        <Field label="Year" value={entry.year || ''} onChange={v => sf('year', v)} placeholder="2023"/>
        <div className="span-3">
          <Field label="Credential ID / URL (optional)" type="url" value={entry.url || ''} onChange={v => sf('url', v)} placeholder="https://credly.com/..."/>
        </div>
      </div>
      <button onClick={onDelete} style={{ marginTop: 6, background: 'none', border: 'none', color: '#BA0517', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>✕ Remove</button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
// ── Video Resume Section ───────────────────────────────────────────────────────
function VideoResumeSection({ candidateId, existingUrl, onSaved }) {
  const [phase, setPhase]       = useState('idle'); // idle | preview | uploading | done
  const [blob, setBlob]         = useState(null);
  const [previewUrl, setPreview] = useState(null);
  const [countdown, setCountdown] = useState(60);
  const [recording, setRecording] = useState(false);
  const [error, setError]       = useState('');
  const [toast, setToast]       = useState('');

  const videoRef     = useRef(null);
  const mediaRef     = useRef(null);
  const chunksRef    = useRef([]);
  const timerRef     = useRef(null);
  const streamRef    = useRef(null);

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }

      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm' });
      mediaRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: 'video/webm' });
        setBlob(b);
        setPreview(URL.createObjectURL(b));
        setPhase('preview');
        streamRef.current?.getTracks().forEach(t => t.stop());
      };

      mr.start(250);
      setRecording(true);
      setPhase('recording');

      let remaining = 60;
      setCountdown(remaining);
      timerRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) { clearInterval(timerRef.current); mr.stop(); setRecording(false); }
      }, 1000);
    } catch (e) {
      setError('Camera/microphone access denied. Please allow permissions and try again.');
    }
  };

  const stopEarly = () => {
    clearInterval(timerRef.current);
    mediaRef.current?.stop();
    setRecording(false);
  };

  const reRecord = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setBlob(null); setPreview(null); setPhase('idle'); setCountdown(60);
  };

  const saveVideo = async () => {
    if (!blob || !candidateId) return;
    setPhase('uploading');
    try {
      const fd = new FormData();
      fd.append('video', blob, 'video-resume.webm');
      const result = await api.uploadVideoResume(candidateId, fd);
      onSaved?.(result?.data?.videoResumeUrl);
      setPhase('done');
      setToast('✅ Video resume saved!');
    } catch (e) {
      setError(e.message || 'Upload failed.');
      setPhase('preview');
    }
  };

  return (
    <div style={{ ...card, padding: 24 }}>
      {toast && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '8px 14px', color: '#34d399', fontSize: 13, marginBottom: 12 }}>{toast}</div>}
      {error && <div style={{ background: 'rgba(186,5,23,0.08)', borderRadius: 8, padding: '8px 14px', color: '#BA0517', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#032D60', marginBottom: 4 }}>🎥 Video Introduction</div>
        <div style={{ fontSize: 12, color: '#706E6B' }}>Record a 60-second video introduction. Recruiters will see it on your profile. Make a great first impression!</div>
      </div>

      {existingUrl && phase === 'idle' && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#0176D3', marginBottom: 8 }}>Your current video resume:</div>
          <video src={existingUrl} controls style={{ width: '100%', maxWidth: 480, borderRadius: 10, background: '#000' }} />
        </div>
      )}

      {phase === 'idle' && (
        <button onClick={startRecording} style={{ ...btnP }}>
          🔴 {existingUrl ? 'Re-Record Video' : 'Record Video Resume'}
        </button>
      )}

      {phase === 'recording' && (
        <div>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
            <video ref={videoRef} muted style={{ width: '100%', maxWidth: 480, borderRadius: 10, background: '#000', display: 'block' }} />
            <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(186,5,23,0.85)', color: '#fff', borderRadius: 20, padding: '4px 12px', fontSize: 13, fontWeight: 700 }}>🔴 {countdown}s</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={stopEarly} style={{ ...btnD, fontSize: 13 }}>⏹ Stop Recording</button>
          </div>
        </div>
      )}

      {phase === 'preview' && previewUrl && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#181818', marginBottom: 8 }}>Preview your recording:</div>
          <video src={previewUrl} controls style={{ width: '100%', maxWidth: 480, borderRadius: 10, background: '#000', marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={saveVideo} style={{ ...btnP }}>💾 Save Video</button>
            <button onClick={reRecord} style={btnG}>🔄 Re-record</button>
          </div>
        </div>
      )}

      {phase === 'uploading' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#706E6B', fontSize: 13 }}>
          <Spinner /> Uploading video…
        </div>
      )}

      {phase === 'done' && (
        <div style={{ color: '#10b981', fontWeight: 600, fontSize: 14 }}>✅ Video resume saved! Recruiters can now view your introduction.</div>
      )}
    </div>
  );
}

export default function CandidateProfile({ user }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoad]    = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState('');
  const [tab, setTab]         = useState('personal');

  // flat fields
  const [form, setForm] = useState({
    name:'', email:'', phone:'', title:'', location:'', linkedin:'', github:'', portfolio:'',
    availability:'Immediate', summary:'', skills:'', languages:'', industry:'',
    experience:'', currentCompany:'', culture:'', projects:'', achievements:'', volunteering:'',
    // HR placement fields
    relevantExperience:'', preferredLocation:'', currentCTC:'', expectedCTC:'',
    // Import / admin-set fields (candidate can view, admin sets via import)
    source:'', dateAdded:'', candidateStatus:'', additionalDetails:'',
  });
  // structured arrays
  const [workHistory, setWork]    = useState([]);
  const [eduList, setEdu]         = useState([]);
  const [certList, setCerts]      = useState([]);

  useEffect(() => {
    api.getUser(user.id)
      .then(res => {
        const d = res.data || res;
        setProfile(d);
        setForm({
          name: d.name||'', email: d.email||'', phone: d.phone||'', title: d.title||'',
          location: d.location||'', linkedin: d.linkedin||'', github: d.github||'',
          portfolio: d.portfolio||'', availability: d.availability||'Immediate',
          summary: d.summary||'', skills: Array.isArray(d.skills) ? d.skills.join(', ') : (d.skills||''), languages: Array.isArray(d.languages) ? d.languages.join(', ') : (d.languages||''),
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
    setSaving(true);
    try {
      const skills = typeof form.skills === 'string' ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(form.skills) ? form.skills : []);
      const languages = typeof form.languages === 'string' ? form.languages.split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(form.languages) ? form.languages : []);
      const d = await api.updateProfile({
        ...form,
        skills,
        languages,
        experience: parseInt(form.experience) || 0,
        workHistory: JSON.stringify(workHistory),
        educationList: JSON.stringify(eduList),
        certifications: JSON.stringify(certList),
      });
      setProfile(d);
      setToast('✅ Profile saved!');
    } catch(e) { setToast('❌ ' + e.message); }
    setSaving(false);
  };

  const resumeData = {
    ...form,
    experience: parseInt(form.experience) || 0,
    workHistory,
    educationList: eduList,
    certifications: certList,
  };

  if (loading) return <div style={{ color:'#706E6B', padding:40, display:'flex', gap:10 }}><Spinner/> Loading...</div>;

  const TABS = [
    ['personal',  '👤 Personal'],
    ['summary',   '📝 Summary'],
    ['work',      '💼 Experience'],
    ['education', '🎓 Education'],
    ['skills',    '🔧 Skills'],
    ['extras',    '🏆 Extras'],
    ['video',     '🎥 Video'],
    ['resume',    '📋 My Resume'],
  ];

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')}/>
      <PageHeader title="My Resume Builder" subtitle="Build your professional resume — all fields, download anytime"/>

      {/* Tab bar */}
      <div role="tablist" aria-label="Profile sections" style={{ display:'flex', gap:2, overflowX:'auto', paddingBottom:2, borderBottom:'1px solid #FAFAF9', marginBottom:20 }}>
        {TABS.map(([key, label]) => <TabBtn key={key} active={tab===key} onClick={() => setTab(key)} role="tab" aria-selected={tab===key}>{label}</TabBtn>)}
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
              <Field label="LinkedIn URL" value={form.linkedin} onChange={v=>sf('linkedin',v)} type="url" placeholder="https://linkedin.com/in/username"/>
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
          {/* Read-only placement info set by admin */}
          {(profile?.client || profile?.ta || profile?.clientSpoc || profile?.assignedRecruiterId ||
            profile?.source || profile?.dateAdded || profile?.candidateStatus || profile?.additionalDetails) && (
            <Section title="🏛 PLACEMENT INFO (set by admin)">
              <div className="form-grid-2">
                {profile.client         && <div><span style={{ color:'#0176D3', fontSize:11, display:'block', marginBottom:4 }}>Client Company</span><span style={{ color:'#181818', fontSize:13 }}>{profile.client}</span></div>}
                {profile.ta             && <div><span style={{ color:'#0176D3', fontSize:11, display:'block', marginBottom:4 }}>Talent Acquisition (TA)</span><span style={{ color:'#181818', fontSize:13 }}>{profile.ta}</span></div>}
                {profile.clientSpoc     && <div><span style={{ color:'#0176D3', fontSize:11, display:'block', marginBottom:4 }}>Client SPOC</span><span style={{ color:'#181818', fontSize:13 }}>{profile.clientSpoc}</span></div>}
                {profile.jobRole        && <div><span style={{ color:'#0176D3', fontSize:11, display:'block', marginBottom:4 }}>Role Applied For</span><span style={{ color:'#181818', fontSize:13 }}>{profile.jobRole}</span></div>}
                {profile.source         && <div><span style={{ color:'#0176D3', fontSize:11, display:'block', marginBottom:4 }}>Source</span><span style={{ color:'#181818', fontSize:13 }}>{profile.source}</span></div>}
                {profile.dateAdded      && <div><span style={{ color:'#0176D3', fontSize:11, display:'block', marginBottom:4 }}>Date Added</span><span style={{ color:'#181818', fontSize:13 }}>{profile.dateAdded}</span></div>}
                {profile.candidateStatus && <div><span style={{ color:'#0176D3', fontSize:11, display:'block', marginBottom:4 }}>Status</span><span style={{ color:'#181818', fontSize:13 }}>{profile.candidateStatus}</span></div>}
                {profile.additionalDetails && <div style={{ gridColumn:'span 2' }}><span style={{ color:'#0176D3', fontSize:11, display:'block', marginBottom:4 }}>Additional Details</span><span style={{ color:'#181818', fontSize:13 }}>{profile.additionalDetails}</span></div>}
              </div>
            </Section>
          )}
        </>
      )}

      {/* ── SUMMARY ── */}
      {tab === 'summary' && (
        <Section title="📝 PROFESSIONAL SUMMARY & OBJECTIVE">
          <p style={{ color:'#706E6B', fontSize:11, marginBottom:10 }}>Write 3–5 sentences highlighting your expertise, key achievements, and career goals. This appears at the top of your resume.</p>
          <Field label="Professional Summary *" value={form.summary} onChange={v=>sf('summary',v)} rows={6} placeholder="Results-driven Software Engineer with 5+ years of experience in full-stack development..."/>
          <div style={{ marginTop:14 }}>
            <Field label="Culture / Work Style Tags (comma-separated)" value={form.culture} onChange={v=>sf('culture',v)} placeholder="collaborative, remote-friendly, agile, data-driven"/>
            {form.culture && <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:6 }}>{(Array.isArray(form.culture)?form.culture:(form.culture||'').split(',').map(s=>s.trim()).filter(Boolean)).map(s=><Badge key={s} label={s.trim()} color="#A07E00"/>)}</div>}
          </div>
        </Section>
      )}

      {/* ── WORK EXPERIENCE ── */}
      {tab === 'work' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <p style={{ color:'#0176D3', fontSize:11, fontWeight:700, margin:0, letterSpacing:1 }}>💼 WORK EXPERIENCE — {workHistory.length} entr{workHistory.length===1?'y':'ies'}</p>
            <button onClick={() => setWork(p=>[...p,{id:uid(),title:'',company:'',location:'',type:'Full-Time',from:'',to:'',current:false,description:''}])} style={{ ...btnP, padding:'6px 14px', fontSize:11 }}>+ Add Job</button>
          </div>
          {workHistory.length === 0 && (
            <div style={{ ...card, textAlign:'center', padding:30, color:'#9E9D9B' }}>
              <p style={{ fontSize:28, marginBottom:8 }}>💼</p>
              <p>No work experience added yet. Click <b>+ Add Job</b> to start.</p>
            </div>
          )}
          {workHistory.map((e,i) => (
            <WorkEntry key={e.id} entry={e}
              onChange={updated => setWork(p => p.map(x => x.id===e.id ? updated : x))}
              onDelete={() => setWork(p => p.filter(x => x.id!==e.id))}/>
          ))}
        </div>
      )}

      {/* ── EDUCATION ── */}
      {tab === 'education' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <p style={{ color:'#0176D3', fontSize:11, fontWeight:700, margin:0, letterSpacing:1 }}>🎓 EDUCATION — {eduList.length} entr{eduList.length===1?'y':'ies'}</p>
            <button onClick={() => setEdu(p=>[...p,{id:uid(),degree:'',institution:'',university:'',location:'',year:'',grade:''}])} style={{ ...btnP, padding:'6px 14px', fontSize:11 }}>+ Add Education</button>
          </div>
          {eduList.length === 0 && (
            <div style={{ ...card, textAlign:'center', padding:30, color:'#9E9D9B' }}>
              <p style={{ fontSize:28, marginBottom:8 }}>🎓</p>
              <p>No education entries yet. Click <b>+ Add Education</b>.</p>
            </div>
          )}
          {eduList.map(e => (
            <EduEntry key={e.id} entry={e}
              onChange={updated => setEdu(p => p.map(x => x.id===e.id ? updated : x))}
              onDelete={() => setEdu(p => p.filter(x => x.id!==e.id))}/>
          ))}

          {/* Certifications inside education tab */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, marginTop:20 }}>
            <p style={{ color:'#0176D3', fontSize:11, fontWeight:700, margin:0, letterSpacing:1 }}>📜 CERTIFICATIONS — {certList.length} entr{certList.length===1?'y':'ies'}</p>
            <button onClick={() => setCerts(p=>[...p,{id:uid(),name:'',issuer:'',year:'',url:''}])} style={{ ...btnP, padding:'6px 14px', fontSize:11 }}>+ Add Certificate</button>
          </div>
          {certList.map(e => (
            <CertEntry key={e.id} entry={e}
              onChange={updated => setCerts(p => p.map(x => x.id===e.id ? updated : x))}
              onDelete={() => setCerts(p => p.filter(x => x.id!==e.id))}/>
          ))}
        </div>
      )}

      {/* ── SKILLS ── */}
      {tab === 'skills' && (
        <Section title="🔧 SKILLS & LANGUAGES">
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <Field label="Technical Skills (comma-separated)" value={form.skills} onChange={v=>sf('skills',v)} placeholder="React, Node.js, Python, AWS, Docker, MongoDB..."/>
              {form.skills && <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:8 }}>{(Array.isArray(form.skills)?form.skills:(form.skills||'').split(',').map(s=>s.trim()).filter(Boolean)).map(s=><Badge key={s} label={s.trim()} color="#0176D3"/>)}</div>}
            </div>
            <div>
              <Field label="Languages Known (comma-separated)" value={form.languages} onChange={v=>sf('languages',v)} placeholder="English (Fluent), Hindi (Native), Telugu (Native)"/>
              {form.languages && <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:8 }}>{(Array.isArray(form.languages)?form.languages:(form.languages||'').split(',').map(s=>s.trim()).filter(Boolean)).map(s=><Badge key={s} label={s.trim()} color="#10b981"/>)}</div>}
            </div>
          </div>
        </Section>
      )}

      {/* ── EXTRAS ── */}
      {tab === 'extras' && (
        <>
          <Section title="📄 RESUME FILE">
            <p style={{ color:'#706E6B', fontSize:11, marginBottom:8 }}>Upload your resume PDF — stored securely and visible to recruiters reviewing your applications.</p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {profile?.resumeUrl && (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'rgba(1,118,211,0.06)', borderRadius:8, border:'1px solid rgba(1,118,211,0.2)' }}>
                  <span style={{ fontSize:18 }}>📋</span>
                  <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" style={{ color:'#0176D3', fontSize:13, fontWeight:600, textDecoration:'none' }}>View uploaded resume</a>
                </div>
              )}
              <label style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'#F3F2F2', borderRadius:8, border:'2px dashed #DDDBDA', cursor:'pointer' }}>
                <span style={{ fontSize:24 }}>⬆</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#181818' }}>Upload Resume PDF</div>
                  <div style={{ fontSize:11, color:'#706E6B' }}>PDF only · max 5MB</div>
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
                    setToast('✅ Resume uploaded successfully!');
                  } catch (err) { setToast(`❌ ${err.message}`); }
                  setSaving(false);
                }} />
              </label>
            </div>
          </Section>
          <Section title="🚀 PROJECTS">
            <p style={{ color:'#706E6B', fontSize:11, marginBottom:8 }}>List your key projects — personal, professional, or academic.</p>
            <Field label="Projects" value={form.projects} onChange={v=>sf('projects',v)} rows={5} placeholder="Project: E-Commerce Platform&#10;Tech: React, Node.js, MongoDB&#10;Description: Built a full-stack platform with...&#10;&#10;Project: AI Resume Parser&#10;Tech: Python, FastAPI&#10;Description: ..."/>
          </Section>
          <Section title="🏆 ACHIEVEMENTS & AWARDS">
            <Field label="Achievements & Awards" value={form.achievements} onChange={v=>sf('achievements',v)} rows={4} placeholder="• Employee of the Year 2023 — Acme Corp&#10;• Hackathon Winner — Smart India Hackathon 2022&#10;• Published paper on ML in IEEE Conference 2021"/>
          </Section>
          <Section title="🤝 VOLUNTEERING & ACTIVITIES">
            <Field label="Volunteering & Activities" value={form.volunteering} onChange={v=>sf('volunteering',v)} rows={3} placeholder="• Mentor at CodeForGood NGO (2022–present)&#10;• Open Source contributor — 50+ PRs merged&#10;• Organizer, React Hyderabad Meetup"/>
          </Section>
        </>
      )}

      {/* ── VIDEO RESUME ── */}
      {tab === 'video' && (
        <VideoResumeSection candidateId={profile?.candidateId || profile?._id || user?.id} existingUrl={profile?.videoResumeUrl} onSaved={(url) => setProfile(p => ({ ...p, videoResumeUrl: url }))} />
      )}

      {/* ── RESUME PREVIEW ── */}
      {tab === 'resume' && (
        <div>
          <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
            <div>
              <div style={{ color:'#181818', fontWeight:600, fontSize:14 }}>Your Resume</div>
              <div style={{ color:'#706E6B', fontSize:11 }}>Click "🖨 Print / Save PDF" inside the resume to download</div>
            </div>
            <button onClick={save} disabled={saving} style={{ ...btnP, marginLeft:'auto', opacity:saving?0.6:1 }}>
              {saving ? <><Spinner/> Saving…</> : '💾 Save All Changes'}
            </button>
          </div>
          <div style={{ border:'1px solid rgba(1,118,211,0.25)', borderRadius:12, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.4)' }}>
            <ResumeCard candidate={resumeData}/>
          </div>
        </div>
      )}

      {/* ── Save button (all tabs except resume) ── */}
      {tab !== 'resume' && (
        <div style={{ display:'flex', gap:10, marginTop:20 }}>
          <button onClick={save} disabled={saving} style={{ ...btnP, opacity:saving?0.6:1 }}>
            {saving ? <><Spinner/> Saving…</> : '💾 Save Changes'}
          </button>
          <button onClick={() => setTab('resume')} style={{ ...btnG, borderColor:'rgba(1,118,211,0.4)', color:'#0176D3' }}>
            📋 Preview Resume
          </button>
        </div>
      )}
    </div>
  );
}
