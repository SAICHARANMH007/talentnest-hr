import { useState, useImperativeHandle, forwardRef } from 'react';
import Field from '../ui/Field.jsx';
import Dropdown from '../ui/Dropdown.jsx';
import Badge from '../ui/Badge.jsx';
import Spinner from '../ui/Spinner.jsx';
import UploadZone from '../ui/UploadZone.jsx';
import { btnP, btnG, card } from '../../constants/styles.js';
import { parseJD } from '../../api/matching.js';

const EMPTY = {
  title: '', company: '', department: '', location: '',
  jobType: 'Full-Time', workMode: 'Onsite', experience: '', salary: '',
  openings: '', applicationDeadline: '', urgency: 'Medium',
  skills: '', description: '', requirements: '', benefits: '',
  education: '', externalUrl: '', isPublic: true,
  screeningQuestions: [],
};

const EMPTY_Q = { question: '', type: 'text', options: '', required: false };

const PostJobForm = forwardRef(function PostJobForm({ onSave, onCancel, saving, children, hideButtons }, ref) {
  const [form, setForm] = useState(EMPTY);
  const [jdFile, setJdFile] = useState('');
  const [parsing, setParsing] = useState(false);
  const [newQ, setNewQ] = useState(EMPTY_Q);
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const addQuestion = () => {
    if (!newQ.question.trim()) return;
    const q = {
      question: newQ.question.trim(),
      type: newQ.type,
      options: newQ.type === 'multiple' ? newQ.options.split(',').map(o => o.trim()).filter(Boolean) : [],
      required: newQ.required,
    };
    sf('screeningQuestions', [...(form.screeningQuestions || []), q]);
    setNewQ(EMPTY_Q);
  };

  const removeQuestion = (idx) => sf('screeningQuestions', form.screeningQuestions.filter((_, i) => i !== idx));

  useImperativeHandle(ref, () => ({
    submit: handleSave,
    reset: () => { setForm(EMPTY); setNewQ(EMPTY_Q); setJdFile(''); },
  }));

  const handleJD = async (file) => {
    setJdFile(file.name);
    setParsing(true);
    try {
      const text = await file.text();
      const p = parseJD(text);
      setForm(prev => ({
        ...prev,
        ...(p.title        && { title: p.title }),
        ...(p.location     && { location: p.location }),
        ...(p.skills       && { skills: p.skills }),
        ...(p.experience   && { experience: p.experience }),
        ...(p.description  && { description: p.description }),
        ...(p.salary       && { salary: p.salary }),
        ...(p.department   && { department: p.department }),
        ...(p.education    && { education: p.education }),
        ...(p.employmentType && { jobType: p.employmentType }),
        ...(p.workMode     && { workMode: p.workMode }),
      }));
    } catch {}
    setParsing(false);
  };

  const skillList = (Array.isArray(form.skills) ? form.skills : (form.skills || '').split(',').map(s => s.trim()).filter(Boolean));

  const handleSave = () => {
    const eu = (form.externalUrl || '').trim();
    const skills = typeof form.skills === 'string' ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(form.skills) ? form.skills : []);
    onSave({ ...form, externalUrl: eu, skills, screeningQuestions: form.screeningQuestions || [] });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 700 }}>

      {/* ── JD Upload ── */}
      <div style={{ ...card, padding: 16, border: '1px solid rgba(1,118,211,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 18 }}>📄</span>
          <div>
            <div style={{ color: '#181818', fontWeight: 600, fontSize: 13 }}>Upload Job Description</div>
            <div style={{ color: '#706E6B', fontSize: 11 }}>Upload a JD file (PDF or .txt) — fields auto-fill instantly · no AI, zero cost</div>
          </div>
        </div>
        <UploadZone label="Upload JD (PDF or text file)" onFile={handleJD} loading={parsing} fileName={jdFile} accept=".pdf,.txt,.doc,.docx" />
        {parsing && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(1,118,211,0.08)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Spinner /><span style={{ color: '#0176D3', fontSize: 12 }}>Parsing JD… fields will auto-fill</span>
          </div>
        )}
        {jdFile && !parsing && (
          <div style={{ marginTop: 8, padding: '6px 12px', background: 'rgba(34,197,94,0.08)', borderRadius: 8, border: '1px solid rgba(34,197,94,0.2)' }}>
            <span style={{ color: '#2E844A', fontSize: 12 }}>✅ JD parsed — review and edit fields below</span>
          </div>
        )}
      </div>

      {/* ── Section: Basic Info ── */}
      <div style={{ ...card, padding: 16 }}>
        <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 700, letterSpacing: '1px', margin: '0 0 12px' }}>💼 JOB DETAILS</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(200px,100%),1fr))', gap: 12 }}>
          <Field label="Job Title *"    value={form.title}      onChange={v => sf('title', v)}      placeholder="Senior Full-Stack Developer" />
          <Field label="Company *"      value={form.company}    onChange={v => sf('company', v)}    placeholder="Acme Technologies" />
          <Field label="Department"     value={form.department} onChange={v => sf('department', v)} placeholder="Engineering / Product / HR…" />
          <Field label="Location"       value={form.location}   onChange={v => sf('location', v)}   placeholder="Hyderabad, Telangana" />
          <Dropdown label="Job Type"    value={form.jobType}    onChange={v => sf('jobType', v)}
            options={['Full-Time', 'Part-Time', 'Contract', 'C2H', 'C2C', 'Internship', 'Freelance']} />
          <Dropdown label="Work Mode"   value={form.workMode}   onChange={v => sf('workMode', v)}
            options={['Onsite', 'Remote', 'Hybrid']} />
          <Field label="Experience"     value={form.experience} onChange={v => sf('experience', v)} placeholder="3-6 years" />
          <Field label="Salary / CTC"   value={form.salary}     onChange={v => sf('salary', v)}     placeholder="12-18 LPA" />
          <Field label="No. of Openings" value={form.openings}  onChange={v => sf('openings', v)}   placeholder="2" />
          <Field label="Apply Before"   value={form.applicationDeadline} onChange={v => sf('applicationDeadline', v)} type="date" />
          <Dropdown label="Urgency"     value={form.urgency}    onChange={v => sf('urgency', v)}
            options={['High', 'Medium', 'Low']} />
          <Field label="Education Requirement" value={form.education} onChange={v => sf('education', v)} placeholder="B.Tech / MBA / Any Graduate" />
        </div>
      </div>

      {/* ── Section: Skills ── */}
      <div style={{ ...card, padding: 16 }}>
        <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 700, letterSpacing: '1px', margin: '0 0 12px' }}>🛠 SKILLS & CONTENT</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Field label="Skills (comma-separated)" value={form.skills} onChange={v => sf('skills', v)} placeholder="React, Node.js, TypeScript, AWS, Docker" />
            {skillList.length > 0 && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                {skillList.map(s => <Badge key={s} label={s} color="#0176D3" />)}
              </div>
            )}
          </div>
          <Field label="Job Description *" value={form.description} onChange={v => sf('description', v)} rows={4}
            placeholder="Describe the role, responsibilities, and what success looks like in this position…" />
          <Field label="Requirements" value={form.requirements} onChange={v => sf('requirements', v)} rows={3}
            placeholder="Must-have qualifications, certifications, experience requirements (one per line)…" />
          <Field label="Benefits & Perks" value={form.benefits} onChange={v => sf('benefits', v)} rows={2}
            placeholder="Health insurance, flexible hours, remote work, annual bonus, stock options…" />
        </div>
      </div>

      {/* ── Section: Settings ── */}
      <div style={{ ...card, padding: 16 }}>
        <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 700, letterSpacing: '1px', margin: '0 0 12px' }}>⚙️ SETTINGS</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field
            label="🔗 External Careers URL"
            value={form.externalUrl}
            onChange={v => sf('externalUrl', v)}
            placeholder="https://careers.company.com/jobs/senior-developer"
            hint="Optional — candidates are redirected here after applying"
            type="url"
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 12px', background: '#F3F2F2', borderRadius: 6, border: '1px solid #DDDBDA' }}>
            <input type="checkbox" checked={form.isPublic} onChange={e => sf('isPublic', e.target.checked)}
              style={{ width: 15, height: 15, accentColor: '#0176D3' }} />
            <span style={{ color: '#181818', fontSize: 13, fontWeight: 600 }}>Show on public job board</span>
            <span style={{ color: '#706E6B', fontSize: 12 }}>— visible on /careers and homepage</span>
          </label>
        </div>
      </div>

      {/* ── Section: Screening Questions ── */}
      <div style={{ ...card, padding: 16 }}>
        <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 700, letterSpacing: '1px', margin: '0 0 12px' }}>🧩 SCREENING QUESTIONS <span style={{ color: '#706E6B', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(optional — shown to candidates at apply time)</span></p>

        {(form.screeningQuestions || []).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {form.screeningQuestions.map((q, i) => (
              <div key={i} style={{ background: '#F3F2F2', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, color: '#181818', fontWeight: 600 }}>{q.question} {q.required && <span style={{ color: '#e53e3e', fontSize: 11 }}>*</span>}</div>
                  <div style={{ fontSize: 11, color: '#706E6B', marginTop: 2 }}>Type: {q.type}{q.options?.length > 0 ? ` · Options: ${q.options.join(', ')}` : ''}</div>
                </div>
                <button onClick={() => removeQuestion(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', fontSize: 16, padding: 0 }}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(1,118,211,0.04)', borderRadius: 8, padding: 12 }}>
          <Field label="Question" value={newQ.question} onChange={v => setNewQ(p => ({ ...p, question: v }))} placeholder="e.g. Do you have experience with React?" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Dropdown label="Answer Type" value={newQ.type} onChange={v => setNewQ(p => ({ ...p, type: v }))} options={['text', 'yesno', 'multiple']} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', paddingTop: 20 }}>
              <input type="checkbox" checked={newQ.required} onChange={e => setNewQ(p => ({ ...p, required: e.target.checked }))} style={{ accentColor: '#0176D3' }} />
              <span style={{ fontSize: 13, color: '#181818' }}>Required</span>
            </label>
          </div>
          {newQ.type === 'multiple' && (
            <Field label="Options (comma-separated)" value={newQ.options} onChange={v => setNewQ(p => ({ ...p, options: v }))} placeholder="Option A, Option B, Option C" />
          )}
          <button onClick={addQuestion} style={{ ...btnP, alignSelf: 'flex-start', fontSize: 12, padding: '6px 14px' }}>+ Add Question</button>
        </div>
      </div>

      {/* ── Extra slot (e.g. assessment builder) ── */}
      {children}

      {/* ── Actions (shown inline only when not using Modal footer pattern) ── */}
      {!hideButtons && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleSave} disabled={saving || parsing} style={{ ...btnP, opacity: (saving || parsing) ? 0.6 : 1 }}>
            {saving ? <><Spinner /> Posting…</> : '📢 Post Job'}
          </button>
          <button onClick={onCancel} style={btnG}>Cancel</button>
        </div>
      )}
    </div>
  );
});

export default PostJobForm;
