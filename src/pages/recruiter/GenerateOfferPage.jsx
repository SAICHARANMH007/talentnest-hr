import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api/api.js';
import Toast from '../../components/ui/Toast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import OfferLetterModal from '../../components/modals/OfferLetterModal.jsx';

// Local CTC breakdown helper (OfferLetterModal does not export these)
function calcCTC(annual, variablePct = 20, isMetro = true) {
  const fixed    = annual * (1 - variablePct / 100);
  const variable = annual * (variablePct / 100);
  const basic    = fixed * 0.40;
  const hra      = basic * (isMetro ? 0.50 : 0.40);
  const transport= 19200; // statutory
  const medical  = 15000;
  const special  = fixed - basic - hra - transport - medical;
  const pf       = basic * 0.12;
  const pt       = 2400;
  const tds      = Math.max(0, (annual - 500000) * 0.20 / 12);
  const gross    = fixed / 12;
  const takeHome = gross - pf - pt - tds;
  return { annual, fixed, variable, basic, hra, transport, medical, special, pf, pt, tds, gross, takeHome };
}

// Simple offer letter preview
function OfferLetterDoc({ data: { candidate, job, form }, ctc }) {
  if (!ctc) return null;
  const fmt = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
  return (
    <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, lineHeight: 1.7, color: '#181818' }}>
      <div style={{ textAlign: 'center', marginBottom: 24, borderBottom: '2px solid #032D60', paddingBottom: 16 }}>
        <h2 style={{ margin: 0, color: '#032D60', fontSize: 18 }}>{form.clientCompany || job?.company || 'Company Name'}</h2>
        <div style={{ fontSize: 11, color: '#706E6B' }}>Offer of Employment</div>
      </div>
      <p>Dear <strong>{candidate?.name || '[Candidate Name]'}</strong>,</p>
      <p>We are pleased to offer you the position of <strong>{form.designation || job?.title}</strong> in the <strong>{form.department || job?.department}</strong> department, reporting to <strong>{form.reportingTo || 'your Manager'}</strong>.</p>
      <p><strong>Joining Date:</strong> {form.joiningDate || '[TBD]'} &nbsp;|&nbsp; <strong>Location:</strong> {form.workLocation || job?.location}</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', margin: '16px 0', fontSize: 12 }}>
        <thead><tr style={{ background: '#032D60', color: '#fff' }}><th style={{ padding: '8px 12px', textAlign: 'left' }}>Component</th><th style={{ padding: '8px 12px', textAlign: 'right' }}>Annual (INR)</th><th style={{ padding: '8px 12px', textAlign: 'right' }}>Monthly (INR)</th></tr></thead>
        <tbody>
          {[['Basic Salary', ctc.basic],['HRA', ctc.hra],['Transport Allowance', ctc.transport * 12],['Medical Allowance', ctc.medical * 12],['Special Allowance', Math.max(0, ctc.special * 12)]].map(([label, val]) => (
            <tr key={label} style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '6px 12px' }}>{label}</td><td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmt(val)}</td><td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmt(val / 12)}</td></tr>
          ))}
          <tr style={{ fontWeight: 700, background: '#F3F2F2' }}><td style={{ padding: '8px 12px' }}>Gross Fixed Pay</td><td style={{ padding: '8px 12px', textAlign: 'right' }}>{fmt(ctc.fixed)}</td><td style={{ padding: '8px 12px', textAlign: 'right' }}>{fmt(ctc.gross)}</td></tr>
          {ctc.variable > 0 && <tr><td style={{ padding: '6px 12px' }}>Variable Pay</td><td style={{ padding: '6px 12px', textAlign: 'right' }}>{fmt(ctc.variable)}</td><td style={{ padding: '6px 12px', textAlign: 'right', color: '#706E6B' }}>Performance-linked</td></tr>}
          <tr style={{ fontWeight: 700, background: '#EBF5FF' }}><td style={{ padding: '8px 12px' }}>Total CTC</td><td style={{ padding: '8px 12px', textAlign: 'right' }}>{fmt(ctc.annual)}</td><td style={{ padding: '8px 12px', textAlign: 'right' }}>—</td></tr>
        </tbody>
      </table>
      <p style={{ fontSize: 11, color: '#706E6B' }}>Estimated take-home (after PF {fmt(ctc.pf * 12)}, PT {fmt(ctc.pt)}, TDS est. {fmt(ctc.tds * 12)}): <strong>{fmt(ctc.takeHome)}/month</strong></p>
      {form.emailNote && <p style={{ marginTop: 20, padding: '12px 16px', background: '#F8FAFC', borderLeft: '3px solid #0176D3', borderRadius: 4 }}>{form.emailNote}</p>}
      <p style={{ marginTop: 24 }}>Kindly sign and return this letter by <strong>{form.acceptanceDeadline || '[Deadline]'}</strong>.</p>
      <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between' }}>
        <div><div style={{ borderTop: '1px solid #181818', paddingTop: 4, width: 160, textAlign: 'center' }}>{form.hrName || 'HR Manager'}<br /><span style={{ fontSize: 10, color: '#706E6B' }}>Authorised Signatory</span></div></div>
        <div><div style={{ borderTop: '1px solid #181818', paddingTop: 4, width: 160, textAlign: 'center' }}>Candidate Signature<br /><span style={{ fontSize: 10, color: '#706E6B' }}>Date: ___________</span></div></div>
      </div>
    </div>
  );
}
import { btnP, btnG, card, inp } from '../../constants/styles.js';
import Field from '../../components/ui/Field.jsx';
import Dropdown from '../../components/ui/Dropdown.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

/**
 * Dedicated, full-screen Offer Letter Generator.
 * Route: /app/forms/offer
 * Features side-by-side Editor & Live Preview.
 */
export default function GenerateOfferPage({ user, onBack, onSuccess }) {
  const [candidate, setCandidate] = useState(null);
  const [job, setJob] = useState(null);
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [previewOpen, setPreviewOpen] = useState(true);

  // Form State (Initialized with defaults)
  const [form, setForm] = useState({
    designation: '', department: '', employmentType: 'Full-Time (Permanent)',
    workLocation: 'Hyderabad, Telangana', clientCompany: 'TalentNest HR',
    reportingTo: 'Project Manager', joiningDate: '', acceptanceDeadline: '',
    annualCTC: '', variablePct: 10, isMetro: true, probation: '3 months',
    probationNotice: '15', noticePeriod: '60 days', hrName: user?.name || 'HR Manager',
    authorizedBy: '', emailNote: '',
  });

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const appId = params.get('appId');
    
    if (appId) {
      api.getApplication(appId).then(data => {
        setApp(data);
        setCandidate(data.candidate);
        setJob(data.job);
        setForm(prev => ({
          ...prev,
          designation: data.job?.title || data.candidate?.title || '',
          department: data.job?.department || '',
          clientCompany: data.job?.company || 'TalentNest HR',
          workLocation: data.candidate?.location || 'Hyderabad, Telangana',
        }));
        setLoading(false);
      }).catch(e => {
        setToast(`❌ Error: ${e.message}`);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const ctc = form.annualCTC && Number(form.annualCTC) > 0
    ? calcCTC(Number(form.annualCTC), Number(form.variablePct), form.isMetro)
    : null;

  const handleSend = async () => {
    if (!form.annualCTC) { setToast('❌ Annual CTC is required'); return; }
    setSaving(true);
    try {
      await api.updateStage(app.id, 'offer_extended', 'Offer letter generated (Standalone Page)', {});
      setToast('✅ Offer sent successfully!');
      setTimeout(() => { if (onSuccess) onSuccess(); else if (onBack) onBack(); }, 1500);
    } catch (e) {
      setToast(`❌ ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner /> Loading application data...</div>;
  if (!app) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
       <h3>Invalid Application</h3>
       <p>Please select a candidate to generate an offer.</p>
       <button onClick={onBack} style={btnP}>Return to Candidates</button>
    </div>
  );

  return (
    <div style={{ animation: 'tn-fadein 0.3s ease both' }}>
      <Toast msg={toast} onClose={() => setToast('')} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#0176D3', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: 0 }}>
          ← Back to Pipeline
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
           <button onClick={() => setPreviewOpen(!previewOpen)} style={btnG}>{previewOpen ? '👁 Hide Preview' : '👁 Show Preview'}</button>
           <button onClick={handleSend} disabled={saving || !form.annualCTC} style={{ ...btnP, opacity: (saving || !form.annualCTC) ? 0.6 : 1 }}>
             {saving ? 'Processing...' : '📨 Confirm & Send Offer'}
           </button>
        </div>
      </div>

      <PageHeader 
        title={`📄 Generate Offer for ${candidate?.name}`} 
        subtitle={`Designing the legal and financial structure for the ${job?.title} role.`}
      />

      <div className={previewOpen ? 'tn-page-split-half' : ''} style={{ display: 'grid', gridTemplateColumns: previewOpen ? undefined : '1fr', gap: 24, marginTop: 24, alignItems: 'start' }}>
        
        {/* Editor Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div style={{ ...card, background: '#fff' }}>
            <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 800, margin: '0 0 16px', letterSpacing: 1 }}>💼 POSITION & ENTITY</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 16 }}>
              <Field label="Designation *" value={form.designation} onChange={v => sf('designation', v)} />
              <Field label="Department" value={form.department} onChange={v => sf('department', v)} />
              <Field label="Company/Client *" value={form.clientCompany} onChange={v => sf('clientCompany', v)} />
              <Field label="Work Location *" value={form.workLocation} onChange={v => sf('workLocation', v)} />
              <Dropdown label="Employment Type" value={form.employmentType} onChange={v => sf('employmentType', v)} options={['Full-Time (Permanent)', 'Contract', 'Internship']} />
              <Field label="Reporting To" value={form.reportingTo} onChange={v => sf('reportingTo', v)} />
            </div>
          </div>

          <div style={{ ...card, background: '#fff', border: '1.5px solid rgba(1,118,211,0.2)' }}>
            <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 800, margin: '0 0 16px', letterSpacing: 1 }}>💰 CTC & COMPENSATION (INR)</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 16, marginBottom: 16 }}>
               <Field label="Annual Total CTC *" type="number" value={form.annualCTC} onChange={v => sf('annualCTC', v)} placeholder="600000" />
               <Field label="Variable %" type="number" value={form.variablePct} onChange={v => sf('variablePct', v)} />
            </div>
            <Dropdown 
              label="Location Class (HRA Calculation)" 
              value={form.isMetro ? 'metro' : 'non'} 
              onChange={v => sf('isMetro', v === 'metro')}
              options={[{value:'metro', label:'Tier 1 (Metro - 50% HRA)'}, {value:'non', label:'Tier 2/3 (Non-Metro - 40% HRA)'}]}
            />
          </div>

          <div style={{ ...card, background: '#fff' }}>
            <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 800, margin: '0 0 16px', letterSpacing: 1 }}>📅 DATES & DEADLINES</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 16 }}>
              <Field label="Joining Date" type="date" value={form.joiningDate} onChange={v => sf('joiningDate', v)} />
              <Field label="Acceptance Deadline *" type="date" value={form.acceptanceDeadline} onChange={v => sf('acceptanceDeadline', v)} />
            </div>
          </div>

          <div style={{ ...card, background: '#fff' }}>
            <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 800, margin: '0 0 16px', letterSpacing: 1 }}>⚖️ CLAUSES & SIGNATORIES</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 16 }}>
              <Dropdown label="Probation" value={form.probation} onChange={v => sf('probation', v)} options={['3 months', '6 months', 'No probation']} />
              <Field label="HR Signatory" value={form.hrName} onChange={v => sf('hrName', v)} />
            </div>
            <div style={{ marginTop: 16 }}>
              <Field label="Email Note to Candidate" rows={3} value={form.emailNote} onChange={v => sf('emailNote', v)} placeholder="e.g. Welcome to the team! We are excited to have you..." />
            </div>
          </div>
        </div>

        {/* Preview Column */}
        {previewOpen && (
          <div style={{ position: 'sticky', top: 20 }}>
            <div style={{ background: '#fff', border: '1px solid #DDDBDA', borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
              <div style={{ background: '#F8FAFC', padding: '12px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>DRAFT PREVIEW</span>
                <span style={{ fontSize: 10, background: '#E2E8F0', padding: '3px 8px', borderRadius: 4 }}>A4 FORMAT</span>
              </div>
              <div style={{ padding: '40px', maxHeight: '1000px', overflowY: 'auto' }}>
                {ctc ? (
                  <OfferLetterDoc data={{ candidate, job, form }} ctc={ctc} />
                ) : (
                  <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94A3B8' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>💰</div>
                    <div>Enter Annual CTC to generate preview</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
