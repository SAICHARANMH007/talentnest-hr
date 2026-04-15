import React, { useEffect, useState } from 'react';
import Toast from '../ui/Toast.jsx';
import Field from '../ui/Field.jsx';
import Dropdown from '../ui/Dropdown.jsx';
import Badge from '../ui/Badge.jsx';
import Spinner from '../ui/Spinner.jsx';
import UploadZone from '../ui/UploadZone.jsx';
import ResumeCard from './ResumeCard.jsx';
import { btnP, btnG, card } from '../../constants/styles.js';
import { api } from '../../api/api.js';
import { parseFile } from '../../api/matching.js';

// Duplicate warning banner — defined outside component
const DupWarning = ({ dupes, onIgnore }) => (
  <div style={{ background: 'rgba(245,158,11,0.1)', border: '1.5px solid rgba(245,158,11,0.4)', borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
    <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 8 }}>⚠️ Possible Duplicate Detected</div>
    {dupes.map((d, i) => (
      <div key={i} style={{ fontSize: 12, color: '#706E6B', marginBottom: 4 }}>
        {d.matchType === 'email' ? '✉️ Exact email match' : d.matchType === 'phone' ? '📞 Phone match' : `🔤 Similar name (${d.distance} edit${d.distance > 1 ? 's' : ''})`}:
        {' '}<strong>{d.name}</strong> · {d.email}
      </div>
    ))}
    <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
      <button onClick={onIgnore} style={{ background: '#0176D3', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
        Create Anyway
      </button>
      <span style={{ fontSize: 12, color: '#706E6B', lineHeight: '30px' }}>or review the existing record first</span>
    </div>
  </div>
);

// Low-confidence warning beneath an input
const LowConfNote = () => (
  <div style={{ fontSize: 11, color: '#B45309', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
    <span>⚠</span><span>Please verify — low confidence</span>
  </div>
);

// Wrapper that adds yellow bg + note when confidence is low
function ConfidenceWrapper({ confValue, children }) {
  const isLow = confValue !== undefined && confValue < 60;
  return (
    <div style={{ background: isLow ? 'rgba(245,158,11,0.08)' : 'transparent', borderRadius: 6, padding: isLow ? '4px 6px' : 0, transition: 'background 0.2s' }}>
      {children}
      {isLow && <LowConfNote />}
    </div>
  );
}

const EMP = {
  name: '', email: '', phone: '', title: '', skills: '',
  experience: '', location: '', summary: '', linkedin: '',
  education: '', currentCompany: '', currentCTC: '', expectedCTC: '',
  projects: '', industry: '', culture: '', availability: '0',
};

/**
 * Map parser field names → form field names and format values.
 */
function mapParsedToForm(fields) {
  const mapped = {};

  if (fields.name)               mapped.name          = fields.name;
  if (fields.email)              mapped.email         = fields.email;
  if (fields.phone)              mapped.phone         = fields.phone;
  if (fields.currentRole)        mapped.title         = fields.currentRole;
  if (fields.location)           mapped.location      = fields.location;
  if (fields.linkedinUrl)        mapped.linkedin      = fields.linkedinUrl;
  if (fields.currentCompany)     mapped.currentCompany = fields.currentCompany;

  // Skills: always Array in parser; form stores as comma-string for the Field component
  if (Array.isArray(fields.skills) && fields.skills.length > 0) {
    mapped.skills = fields.skills.join(', ');
  }

  // Experience: parser returns number
  if (fields.totalExperienceYears != null && fields.totalExperienceYears !== 0) {
    mapped.experience = String(fields.totalExperienceYears);
  }

  // Education: parser returns array of { institution, degree, year }
  if (Array.isArray(fields.education) && fields.education.length > 0) {
    mapped.education = fields.education
      .map(e => [e.degree, e.institution, e.year].filter(Boolean).join(', '))
      .join(' | ');
  }

  // CTC: store in rupees as string
  if (fields.currentCTC)  mapped.currentCTC  = String(fields.currentCTC);
  if (fields.expectedCTC) mapped.expectedCTC = String(fields.expectedCTC);

  // Notice period
  if (fields.noticePeriodDays != null) {
    const validOptions = ['0', '15', '30', '45', '60', '90', 'not_looking'];
    const days = String(fields.noticePeriodDays);
    mapped.availability = validOptions.includes(days) ? days : '0';
  }

  return mapped;
}

/**
 * Build a confidence map keyed by form field names.
 * Values 0-100, matching the parser's confidence scale.
 */
function mapConfidence(confidence) {
  return {
    name:          confidence.name          ?? 0,
    email:         confidence.email         ?? 0,
    phone:         confidence.phone         ?? 0,
    title:         confidence.currentRole   ?? 0,
    location:      confidence.location      ?? 0,
    linkedin:      confidence.linkedinUrl   ?? 0,
    currentCompany:confidence.currentCompany?? 0,
    skills:        confidence.skills        ?? 0,
    experience:    confidence.totalExperienceYears ?? 0,
    education:     confidence.education     ?? 0,
    currentCTC:    confidence.currentCTC    ?? 0,
    expectedCTC:   confidence.expectedCTC   ?? 0,
    availability:  confidence.noticePeriodDays ?? 0,
  };
}

export default function AddCandidateForm({ addedBy, onSuccess }) {
  const [form, setForm]           = useState(EMP);
  const [fname, setFname]         = useState('');
  const [extracting, setEx]       = useState(false);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [dupes, setDupes]         = useState([]);
  const [conf, setConf]           = useState({});  // form-field keyed confidence 0-100
  const [parseCount, setParseCount] = useState(0); // how many fields were filled
  const [dupChecked, setDupChecked] = useState(false);
  const [orgs, setOrgs]           = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  const actorRole = addedBy?.role || '';
  const isSuperAdmin = actorRole === 'super_admin';
  const defaultTenantId = addedBy?.tenantId || addedBy?.orgId || '';

  const sf = (k, v) => { setForm(p => ({ ...p, [k]: v })); setDupChecked(false); setDupes([]); };

  useEffect(() => {
    if (!isSuperAdmin) {
      if (defaultTenantId) {
        setForm(prev => prev.tenantId === defaultTenantId ? prev : { ...prev, tenantId: defaultTenantId });
      }
      return;
    }

    setLoadingOrgs(true);
    api.getOrgs()
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setOrgs(list);
        if (list.length === 1) {
          const onlyOrgId = String(list[0].id || list[0]._id || '');
          if (onlyOrgId) {
            setForm(prev => prev.tenantId === onlyOrgId ? prev : { ...prev, tenantId: onlyOrgId });
          }
        }
      })
      .catch(() => setOrgs([]))
      .finally(() => setLoadingOrgs(false));
  }, [defaultTenantId, isSuperAdmin]);

  const handleResume = async (f) => {
    setFname(f.name);
    setEx(true);
    setShowPreview(false);
    setDupes([]);
    setDupChecked(false);
    setConf({});
    setParseCount(0);

    try {
      const res = await api.parseResume(f);
      if (!res || !res.success) throw new Error(res?.message || 'Parse failed');

      const { fields, confidence } = res.data;
      const formMapped = mapParsedToForm(fields);
      const confMapped = mapConfidence(confidence);

      setForm(prev => ({ ...prev, ...formMapped }));
      setConf(confMapped);

      const filled = Object.values(formMapped).filter(v => v !== '' && v !== null && v !== undefined).length;
      setParseCount(filled);
      setToast(`✅ Resume parsed — ${filled} field${filled !== 1 ? 's' : ''} pre-filled`);
      setShowPreview(true);
    } catch (e) {
      setToast(`❌ Could not parse resume: ${e.message}`);
    }
    setEx(false);
  };

  const doSave = async () => {
    setSaving(true);
    try {
      const skills = typeof form.skills === 'string'
        ? form.skills.split(',').map(s => s.trim()).filter(Boolean)
        : (Array.isArray(form.skills) ? form.skills : []);

      const result = await api.createUser({
        ...form,
        skills,
        role: 'candidate',
        tenantId: form.tenantId || defaultTenantId,
        experience: parseInt(form.experience) || 0,
        resumeFileName: fname,
        addedBy: addedBy?.id,
      });
      setToast(result?._upserted ? '✅ Existing profile updated!' : '✅ Candidate added successfully!');
      setForm(EMP);
      setFname('');
      setShowPreview(false);
      setDupes([]);
      setDupChecked(false);
      setConf({});
      setParseCount(0);
      onSuccess?.();
    } catch (e) {
      setToast(`❌ ${e.message}`);
    }
    setSaving(false);
  };

  const save = async () => {
    if (!form.name || !form.email) { setToast('❌ Name and email required'); return; }
    if (!form.tenantId && !defaultTenantId) {
      setToast(isSuperAdmin ? '❌ Please choose an organisation before saving the candidate' : '❌ Candidate organisation could not be determined');
      return;
    }
    if (!dupChecked) {
      try {
        const r = await api.checkDuplicate({ name: form.name, email: form.email, phone: form.phone });
        const found = r?.duplicates || [];
        setDupChecked(true);
        if (found.length) { setDupes(found); return; }
      } catch { /* network error — skip check */ }
    }
    await doSave();
  };

  const hasData = !!(form.name || form.email || form.title || form.skills);
  const avgConf = Object.keys(conf).length
    ? Math.round(Object.values(conf).reduce((a, b) => a + b, 0) / Object.keys(conf).length)
    : null;

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      {dupes.length > 0 && <DupWarning dupes={dupes} onIgnore={doSave} />}

      {/* ── Upload card ── */}
      <div style={{ ...card, marginBottom: 20, border: '1px solid rgba(1,118,211,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 20 }}>📄</span>
          <div>
            <div style={{ color: '#181818', fontWeight: 600, fontSize: 14 }}>Resume Upload & Parse</div>
            <div style={{ color: '#706E6B', fontSize: 12 }}>Intelligent extraction with confidence indicators for Indian formats. Supports PDF, DOCX, TXT.</div>
          </div>
        </div>
        <UploadZone label="Upload Resume (PDF, DOCX, or TXT)" onFile={handleResume} loading={extracting} fileName={fname} />
        {extracting && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(1,118,211,0.08)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Spinner /><span style={{ color: '#0176D3', fontSize: 12 }}>Parsing resume…</span>
          </div>
        )}
        {fname && !extracting && parseCount > 0 && (
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, padding: '8px 12px', background: 'rgba(34,197,94,0.08)', borderRadius: 10 }}>
            <div>
              <span style={{ color: '#2E844A', fontSize: 12, fontWeight: 600 }}>
                ✅ Resume parsed successfully — {parseCount} field{parseCount !== 1 ? 's' : ''} pre-filled
              </span>
              {avgConf !== null && (
                <span style={{ marginLeft: 10, fontSize: 11, color: '#706E6B' }}>
                  Avg confidence: <span style={{ color: avgConf >= 70 ? '#2E844A' : '#B45309', fontWeight: 700 }}>{avgConf}%</span>
                </span>
              )}
            </div>
            {hasData && (
              <button onClick={() => setShowPreview(p => !p)} style={{ background: showPreview ? 'rgba(1,118,211,0.2)' : '#F3F2F2', color: showPreview ? '#0176D3' : '#706E6B', border: `1px solid ${showPreview ? '#0176D3' : '#EAF5FE'}`, borderRadius: 8, padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                {showPreview ? '▲ Hide Preview' : '👁 Preview Resume'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── LIVE RESUME PREVIEW ── */}
      {showPreview && hasData && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15 }}>📋</span>
              <div>
                <div style={{ color: '#181818', fontWeight: 600, fontSize: 13 }}>Digital Profile Preview</div>
                <div style={{ color: '#706E6B', fontSize: 11 }}>How the candidate appears in your talent pool</div>
              </div>
            </div>
            <button onClick={() => setShowPreview(false)} style={{ background: '#FFFFFF', color: '#64748b', border: '1px solid #DDDBDA', borderRadius: 8, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>✕ Close</button>
          </div>
          <div style={{ border: '1px solid rgba(1,118,211,0.25)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
            <ResumeCard candidate={form} />
          </div>
        </div>
      )}

      {/* ── Candidate detail form ── */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 700, margin: 0, letterSpacing: 1 }}>👤 CANDIDATE PROFILE VERIFICATION</p>
          {Object.keys(conf).length > 0 && (
            <div style={{ fontSize: 11, color: '#706E6B' }}>
              Fields with ⚠ yellow background need verification
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 16 }}>

          <ConfidenceWrapper confValue={conf.name}>
            <Field label="Full Name" value={form.name} onChange={v => sf('name', v)} placeholder="Jane Smith" />
          </ConfidenceWrapper>

          <ConfidenceWrapper confValue={conf.email}>
            <Field label="Email" value={form.email} onChange={v => sf('email', v)} type="email" />
          </ConfidenceWrapper>

          <ConfidenceWrapper confValue={conf.phone}>
            <Field label="Phone" value={form.phone} onChange={v => sf('phone', v)} placeholder="+91 98765 43210" />
          </ConfidenceWrapper>

          {isSuperAdmin && (
            <div style={{ gridColumn: 'span 2' }}>
              <Field
                label="Organisation"
                value={form.tenantId}
                onChange={v => sf('tenantId', v)}
                options={orgs.map(o => ({ value: String(o.id || o._id), label: o.name }))}
                loading={loadingOrgs}
                placeholder={loadingOrgs ? 'Loading organisations…' : 'Select organisation'}
                hint="This candidate will be created inside the selected organisation."
              />
            </div>
          )}

          <ConfidenceWrapper confValue={conf.title}>
            <Field label="Job Title" value={form.title} onChange={v => sf('title', v)} placeholder="Senior Developer" />
          </ConfidenceWrapper>

          <ConfidenceWrapper confValue={conf.location}>
            <Field label="Location" value={form.location} onChange={v => sf('location', v)} placeholder="Hyderabad, India" />
          </ConfidenceWrapper>

          <ConfidenceWrapper confValue={conf.experience}>
            <Field label="Total Exp (Yrs)" value={form.experience} onChange={v => sf('experience', v)} placeholder="5" />
          </ConfidenceWrapper>

          <ConfidenceWrapper confValue={conf.currentCompany}>
            <Field label="Current Company" value={form.currentCompany} onChange={v => sf('currentCompany', v)} placeholder="Acme Corp" />
          </ConfidenceWrapper>

          <ConfidenceWrapper confValue={conf.education}>
            <Field label="Education" value={form.education} onChange={v => sf('education', v)} placeholder="B.Tech, JNTU Hyderabad" />
          </ConfidenceWrapper>

          <ConfidenceWrapper confValue={conf.currentCTC}>
            <Field label="Current CTC (₹)" value={form.currentCTC} onChange={v => sf('currentCTC', v)} placeholder="1200000" />
          </ConfidenceWrapper>

          <ConfidenceWrapper confValue={conf.expectedCTC}>
            <Field label="Expected CTC (₹)" value={form.expectedCTC} onChange={v => sf('expectedCTC', v)} placeholder="1500000" />
          </ConfidenceWrapper>

          <div style={{ gridColumn: 'span 2' }}>
            <ConfidenceWrapper confValue={conf.skills}>
              <Field label="Skills" value={form.skills} onChange={v => sf('skills', v)} placeholder="React, TypeScript, Node.js" />
            </ConfidenceWrapper>
            {form.skills && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                {(Array.isArray(form.skills)
                  ? form.skills
                  : (form.skills || '').split(',').map(s => s.trim()).filter(Boolean)
                ).map(s => <Badge key={s} label={s.trim()} color="#0176D3" />)}
              </div>
            )}
          </div>

          <ConfidenceWrapper confValue={conf.availability}>
            <Dropdown label="Notice Period" value={form.availability} onChange={v => sf('availability', v)} options={[
              { value: '0',           label: 'Immediate / Serving Notice' },
              { value: '15',          label: '15 Days' },
              { value: '30',          label: '30 Days (1 Month)' },
              { value: '45',          label: '45 Days (1.5 Months)' },
              { value: '60',          label: '60 Days (2 Months)' },
              { value: '90',          label: '90 Days (3 Months)' },
              { value: 'not_looking', label: 'Not Looking' },
            ]} />
          </ConfidenceWrapper>

          <ConfidenceWrapper confValue={conf.linkedin}>
            <Field label="LinkedIn URL" value={form.linkedin} onChange={v => sf('linkedin', v)} placeholder="https://linkedin.com/in/..." />
          </ConfidenceWrapper>

          <Field label="Culture Tags" value={form.culture} onChange={v => sf('culture', v)} placeholder="collaborative, remote-friendly" />
          <Field label="Industry" value={form.industry} onChange={v => sf('industry', v)} placeholder="FinTech, SaaS" />

          <div style={{ gridColumn: 'span 2' }}>
            <Field label="Professional Summary" value={form.summary} onChange={v => sf('summary', v)} rows={3} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
          <button onClick={save} disabled={saving || extracting} style={{ ...btnP, padding: '12px 24px', flex: 1, opacity: (saving || extracting) ? 0.6 : 1 }}>
            {saving ? <><Spinner /> Saving…</> : '✅ Save Candidate Record'}
          </button>
          <button onClick={() => { setForm(EMP); setFname(''); setShowPreview(false); setConf({}); setParseCount(0); }} style={{ ...btnG, padding: '12px 20px' }}>
            Clear Form
          </button>
        </div>
      </div>
    </div>
  );
}
