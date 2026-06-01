import React, { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { card, btnP, btnG } from '../../constants/styles.js';

const OLT_FIELDS = [
  { key: 'introText',          label: 'Opening Paragraph',        rows: 4,  hint: 'First paragraph of the letter. Use {{candidateName}}, {{designation}}, {{companyName}}.' },
  { key: 'compensationText',   label: 'Compensation Section',     rows: 4,  hint: 'Describe CTC & pay structure. Use {{ctc}}.' },
  { key: 'joiningText',        label: 'Joining Instructions',     rows: 4,  hint: 'Joining date & reporting instructions. Use {{joiningDate}}.' },
  { key: 'termsAndConditions', label: 'Terms & Conditions',       rows: 12, hint: 'Full employment terms. One clause per line.' },
  { key: 'closingText',        label: 'Closing / Sign-off',       rows: 4,  hint: 'Closing message before signatures. Use {{supportEmail}}.' },
  { key: 'customClauses',      label: 'Custom Additional Clauses',rows: 6,  hint: 'Any extra clauses appended at the end (optional).' },
  { key: 'signatoryTitle',     label: 'Signatory Job Title',      rows: 1,  hint: 'e.g. Head of Human Resources' },
  { key: 'footerNote',         label: 'Footer Note',              rows: 1,  hint: 'e.g. This is a computer-generated offer letter.' },
];

const VARS = ['{{candidateName}}','{{designation}}','{{companyName}}','{{ctc}}','{{joiningDate}}','{{signatoryName}}','{{supportEmail}}'];

const DEFAULTS = {
  introText: 'We are pleased to offer you the position of {{designation}} at {{companyName}}. This letter confirms the terms of your employment as discussed.',
  compensationText: 'Your annual Cost to Company (CTC) will be {{ctc}}. The detailed break-up of your compensation will be shared separately.',
  joiningText: 'Your date of joining is {{joiningDate}}. Please report to our office at 9:00 AM and bring the required documents listed below.',
  termsAndConditions: '1. This offer is contingent upon successful completion of background verification.\n2. You are expected to maintain strict confidentiality of company information.\n3. The employment is subject to a probation period of 6 months.\n4. Either party may terminate this agreement with 30 days written notice during probation and 60 days thereafter.',
  closingText: 'We look forward to welcoming you to the team. Please sign and return a copy of this letter as your acceptance. For any queries, contact HR at {{supportEmail}}.',
  customClauses: '',
  signatoryTitle: 'Head of Human Resources',
  footerNote: 'This is a computer-generated offer letter.',
};

function fillPreview(text = '', sample = {}) {
  return text
    .replace(/{{candidateName}}/gi, sample.candidateName || 'Rohan Sharma')
    .replace(/{{designation}}/gi, sample.designation || 'Senior Engineer')
    .replace(/{{companyName}}/gi, sample.companyName || 'TalentNest Inc.')
    .replace(/{{ctc}}/gi, sample.ctc || '₹18,00,000 per annum')
    .replace(/{{joiningDate}}/gi, sample.joiningDate || '1st July 2026')
    .replace(/{{signatoryName}}/gi, sample.signatoryName || 'Priya Menon')
    .replace(/{{supportEmail}}/gi, sample.supportEmail || 'hr@talentnest.com');
}

export default function OfferLetterBuilder() {
  const [form, setForm]         = useState(null);
  const [active, setActive]     = useState(OLT_FIELDS[0].key);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');
  const [preview, setPreview]   = useState(false);

  useEffect(() => {
    api.getCustomizations()
      .then(r => {
        const d = r?.data || r || {};
        setForm({ ...DEFAULTS, ...(d.offerLetterTemplate || {}) });
      })
      .catch(() => setForm({ ...DEFAULTS }));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.updateCustomizationsSingleton({ offerLetterTemplate: form });
      setMsg('Template saved successfully.');
    } catch (e) {
      setMsg(e?.message || 'Save failed.');
    }
    setSaving(false);
  };

  const copyVar = (v) => { try { navigator.clipboard.writeText(v); } catch {} };

  const current = OLT_FIELDS.find(f => f.key === active);

  if (!form) return <div style={{ color: '#9CA3AF', textAlign: 'center', padding: 64 }}>Loading template…</div>;

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A1628', margin: 0 }}>Offer Letter Builder</h1>
          <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>Customize offer letter sections, terms, and placeholders</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setPreview(p => !p)} style={{ ...btnG }}>{preview ? 'Hide Preview' : 'Live Preview'}</button>
          <button onClick={save} disabled={saving} style={{ ...btnP }}>{saving ? 'Saving…' : 'Save Template'}</button>
        </div>
      </div>

      {msg && (
        <div style={{ background: '#D1FAE5', color: '#065F46', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
          {msg}
          <button onClick={() => setMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'inherit' }}>×</button>
        </div>
      )}

      {/* Placeholder chips */}
      <div style={{ ...card, padding: '10px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Available Placeholders — click to copy</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {VARS.map(v => (
            <span key={v} onClick={() => copyVar(v)} title="Click to copy"
              style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: '#1D4ED8', fontFamily: 'monospace', cursor: 'pointer', fontWeight: 600 }}>
              {v}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: preview ? '200px 1fr 1fr' : '200px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Section nav */}
        <div style={{ ...card, padding: 8 }}>
          {OLT_FIELDS.map(f => (
            <button key={f.key} onClick={() => setActive(f.key)} style={{
              width: '100%', padding: '9px 14px', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 12, borderRadius: 6, marginBottom: 2,
              background: active === f.key ? 'rgba(1,118,211,0.1)' : 'transparent',
              color: active === f.key ? '#0176D3' : '#374151',
              fontWeight: active === f.key ? 700 : 500,
              borderLeft: active === f.key ? '3px solid #0176D3' : '3px solid transparent',
            }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Editor */}
        <div style={{ ...card }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0A1628', marginBottom: 4 }}>{current.label}</div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>{current.hint}</div>
          {current.rows === 1 ? (
            <input
              value={form[current.key] || ''}
              onChange={e => set(current.key, e.target.value)}
              style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }}
            />
          ) : (
            <textarea
              value={form[current.key] || ''}
              onChange={e => set(current.key, e.target.value)}
              rows={current.rows}
              style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
            />
          )}
        </div>

        {/* Live Preview */}
        {preview && (
          <div style={{ ...card, background: '#FAFAFA', fontSize: 12, lineHeight: 1.8 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#0A1628', marginBottom: 12, borderBottom: '1px solid #E5E7EB', paddingBottom: 8 }}>Live Preview (sample data)</div>
            {OLT_FIELDS.filter(f => f.key !== 'customClauses' && f.key !== 'footerNote' && f.key !== 'signatoryTitle').map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 3 }}>{f.label}</div>
                <div style={{ color: '#374151', whiteSpace: 'pre-line' }}>{fillPreview(form[f.key] || '—')}</div>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #E5E7EB', marginTop: 12, paddingTop: 10 }}>
              <div style={{ fontSize: 10, color: '#9CA3AF' }}>{fillPreview(form.footerNote || '')}</div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 600, color: '#374151' }}>Signature: ___________________</div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>{form.signatoryTitle}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
