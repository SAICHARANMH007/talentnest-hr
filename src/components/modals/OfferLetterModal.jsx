import React, { useState, useRef } from 'react';
import Modal from '../ui/Modal.jsx';
import Toast from '../ui/Toast.jsx';
import Field from '../ui/Field.jsx';
import Dropdown from '../ui/Dropdown.jsx';
import Spinner from '../ui/Spinner.jsx';
import { btnP, btnG, card, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';

// ─────────────────────────────────────────────────────────────────────────────
// Indian IT Staffing Offer Letter Generator
// Labour Law: EPF Act 1952 · ESI Act 1948 · Payment of Gratuity Act 1972
//             Shops & Establishments Act · IT Act 2000 · POSH Act 2013
//             Income Tax Act (TDS) · Professional Tax (State-specific)
// ─────────────────────────────────────────────────────────────────────────────

const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');
const fmtN = n => Math.round(n).toLocaleString('en-IN');

// ── CTC Breakup Calculator (Indian IT industry standard) ─────────────────────
function calcCTC(annualCTC, variablePct = 10, isMetro = true) {
  const monthly = annualCTC / 12;
  // Variable pay carved out first
  const fixedAnnual = annualCTC * (1 - variablePct / 100);
  const varAnnual   = annualCTC * (variablePct / 100);

  // Gross = Fixed CTC minus employer statutory contributions
  // Employer PF = 12% of Basic; Gratuity = 4.81% of Basic
  // Basic = 40% of Fixed Annual CTC / 12
  const basic    = (fixedAnnual * 0.40) / 12;
  const hra      = basic * (isMetro ? 0.50 : 0.40);
  const transport = 2000;
  const medical   = 1250;
  const empPF    = basic * 0.12;
  const gratuity = basic * 0.0481;
  const special  = (fixedAnnual / 12) - basic - hra - transport - medical - empPF - gratuity;

  // In-hand deductions
  const eePF = basic * 0.12;            // Employee PF (12% of basic)
  const pt   = basic > 15000 ? 200 : 0; // Professional Tax (Telangana / AP)
  // TDS rough estimate — simplified
  const grossAnnual  = (basic + hra + transport + medical + Math.max(special, 0)) * 12;
  const taxableApprox = Math.max(grossAnnual - (hra * 12 * 0.4) - (transport * 12) - (medical * 12) - 50000 /* std deduction */ - (eePF * 12 * 2), 0);
  let tds = 0;
  if (taxableApprox > 1500000)      tds = ((taxableApprox - 1500000) * 0.30 + 1250000 * 0.20 + 500000 * 0.10 + 250000 * 0.05) / 12;
  else if (taxableApprox > 1000000) tds = ((taxableApprox - 1000000) * 0.20 + 500000 * 0.10 + 250000 * 0.05) / 12;
  else if (taxableApprox > 500000)  tds = ((taxableApprox - 500000)  * 0.10 + 250000 * 0.05) / 12;
  else if (taxableApprox > 250000)  tds = (taxableApprox - 250000)   * 0.05 / 12;

  const grossMonthly = basic + hra + transport + medical + Math.max(special, 0);
  const inHand = grossMonthly - eePF - pt - Math.round(tds);

  return {
    monthly: {
      basic: Math.round(basic),
      hra: Math.round(hra),
      transport,
      medical,
      special: Math.max(Math.round(special), 0),
      variable: Math.round(varAnnual / 12),
      empPF: Math.round(empPF),
      gratuity: Math.round(gratuity),
      gross: Math.round(grossMonthly),
      eePF: Math.round(eePF),
      pt,
      tds: Math.round(tds),
      inHand: Math.round(inHand),
    },
    annual: {
      basic: Math.round(basic * 12),
      hra: Math.round(hra * 12),
      transport: transport * 12,
      medical: medical * 12,
      special: Math.max(Math.round(special * 12), 0),
      variable: Math.round(varAnnual),
      empPF: Math.round(empPF * 12),
      gratuity: Math.round(gratuity * 12),
      gross: Math.round(grossMonthly * 12),
      eePF: Math.round(eePF * 12),
      pt: pt * 12,
      tds: Math.round(tds * 12),
      inHand: Math.round(inHand * 12),
      totalCTC: annualCTC,
    },
  };
}

// ── Offer Letter document ─────────────────────────────────────────────────────
function OfferLetterDoc({ data, ctc, ref: docRef }) {
  const { candidate: c, job: j, form: f } = data;
  const today = new Date();
  // Stable ref number for this modal session — generated once, never changes on re-render
  const [refNo] = useState(() => {
    const seq = String(1000 + (Date.now() % 9000)).padStart(4, '0');
    return `TNH/${today.getFullYear()}/${String(today.getMonth()+1).padStart(2,'0')}/${seq}`;
  });
  const dateStr = today.toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });
  const rows = [
    ['Basic Salary (40% of CTC)',       fmt(ctc.monthly.basic),   fmt(ctc.annual.basic)],
    ['House Rent Allowance (HRA)',       fmt(ctc.monthly.hra),     fmt(ctc.annual.hra)],
    ['Transport Allowance',             fmt(ctc.monthly.transport),fmt(ctc.annual.transport)],
    ['Medical Allowance',               fmt(ctc.monthly.medical),  fmt(ctc.annual.medical)],
    ['Special Allowance',               fmt(ctc.monthly.special),  fmt(ctc.annual.special)],
    ...(f.variablePct > 0 ? [[`Variable / Performance Pay (${f.variablePct}%)`, fmt(ctc.monthly.variable), fmt(ctc.annual.variable)]] : []),
    ['GROSS SALARY',                    fmt(ctc.monthly.gross),    fmt(ctc.annual.gross), true],
    ["Employer's PF Contribution (12% of Basic)", fmt(ctc.monthly.empPF), fmt(ctc.annual.empPF)],
    ['Gratuity Provision (4.81% of Basic)',        fmt(ctc.monthly.gratuity), fmt(ctc.annual.gratuity)],
    ['TOTAL COST TO COMPANY (CTC)',     fmt(Math.round(ctc.annual.totalCTC/12)), fmt(ctc.annual.totalCTC), true, '#F3F2F2'],
  ];
  const deductRows = [
    ["Employee's PF Contribution (12%)", fmt(ctc.monthly.eePF), fmt(ctc.annual.eePF)],
    ['Professional Tax (State applicable)', fmt(ctc.monthly.pt), fmt(ctc.annual.pt)],
    ['Income Tax / TDS (estimated)',     fmt(ctc.monthly.tds),   fmt(ctc.annual.tds)],
    ['ESTIMATED NET TAKE-HOME',         fmt(ctc.monthly.inHand), fmt(ctc.annual.inHand), true, '#065f46'],
  ];

  const th = { background:'#032D60', color:'#fff', padding:'9px 12px', fontSize:11, fontWeight:700, textAlign:'left', letterSpacing:0.3 };
  const td = (bold, accent) => ({ padding:'7px 12px', fontSize:11.5, fontWeight:bold?700:400, color:accent||'#1e293b', borderBottom:'1px solid #f1f5f9', background: bold ? '#f0f9ff' : '#fff' });
  const tdR = { ...td(false), textAlign:'right' };

  return (
    <div style={{ fontFamily:"'Georgia', 'Times New Roman', serif", color:'#1e293b', background:'#fff', fontSize:12, lineHeight:1.75 }}>
      {/* Letterhead */}
      <div style={{ marginBottom:24 }}>
        {/* Top accent bar */}
        <div style={{ height:5, background:'linear-gradient(90deg,#032D60 0%,#0176D3 60%,#38bdf8 100%)', marginBottom:18, borderRadius:2 }}/>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:26, fontWeight:900, color:'#032D60', letterSpacing:0.5, fontFamily:"'Arial', sans-serif", lineHeight:1.1 }}>
              TalentNest <span style={{color:'#0176D3'}}>HR</span>
            </div>
            <div style={{ fontSize:9, color:'#0176D3', fontWeight:700, letterSpacing:2, textTransform:'uppercase', marginTop:2 }}>STAFFING &amp; HUMAN CAPITAL SOLUTIONS</div>
            <div style={{ fontSize:10, color:'#64748b', marginTop:6, lineHeight:1.6 }}>
              Floor 3, Brindavanam Block C, Ganesh Nagar, Miyapur, Hyderabad – 502033<br/>
              ✉ hr@talentnesthr.com &nbsp;|&nbsp; ☎ +91 79955 35539 &nbsp;|&nbsp; 🌐 www.talentnesthr.com
            </div>
          </div>
          <div style={{ textAlign:'right', fontSize:11, color:'#374151' }}>
            <div style={{ fontWeight:700, color:'#374151', marginBottom:2 }}>Ref No: {refNo}</div>
            <div style={{ color:'#64748b' }}>Date: {dateStr}</div>
            <div style={{ marginTop:8, background:'#032D60', color:'#fff', padding:'4px 12px', borderRadius:4, fontSize:9.5, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase' }}>CONFIDENTIAL</div>
          </div>
        </div>
        {/* Bottom separator */}
        <div style={{ height:1, background:'linear-gradient(90deg,#032D60,#e2e8f0)', marginTop:14 }}/>
      </div>

      {/* Addressee */}
      <div style={{ marginBottom:18 }}>
        <div style={{ fontWeight:700 }}>{c?.name || 'Candidate Name'}</div>
        {c?.email && <div style={{ fontSize:11, color:'#64748b' }}>{c.email}{c?.phone ? ` | ${c.phone}` : ''}</div>}
        {c?.location && <div style={{ fontSize:11, color:'#64748b' }}>{c.location}</div>}
      </div>

      {/* Subject */}
      <div style={{ marginBottom:18, padding:'11px 16px', background:'linear-gradient(135deg,#f0f9ff,#e0f2fe)', border:'1px solid #bae6fd', borderLeft:'4px solid #032D60', borderRadius:'0 8px 8px 0' }}>
        <span style={{ fontWeight:800, color:'#032D60', fontSize:12 }}>Sub: Offer of Employment — {j?.title || f.designation} | {f.employmentType}</span>
      </div>

      <p>Dear <strong>{c?.name?.split(' ')[0] || 'Candidate'}</strong>,</p>
      <p style={{ marginTop:10 }}>
        We are delighted to extend this offer of employment to you for the position of <strong>{j?.title || f.designation}</strong>
        {f.department ? <> in the <strong>{f.department}</strong> department</> : ''} at <strong>{f.clientCompany || j?.company || 'TalentNest HR'}</strong>,
        located at <strong>{f.workLocation || c?.location || 'Hyderabad, Telangana'}</strong>.
        This offer is subject to the terms and conditions outlined below and the satisfactory completion of all pre-employment checks.
      </p>

      {/* Section 1 — Employment Details */}
      <SectionHead n="1" title="EMPLOYMENT DETAILS"/>
      <InfoTable rows={[
        ['Designation / Job Title', j?.title || f.designation],
        ['Department',              f.department || '—'],
        ['Employment Type',         f.employmentType],
        ['Work Location',           f.workLocation || c?.location || 'Hyderabad, Telangana'],
        ['Reporting To',            f.reportingTo || 'Project Manager / HR Manager'],
        ['Date of Joining',         f.joiningDate ? new Date(f.joiningDate).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'}) : 'As mutually agreed'],
        ['Acceptance Deadline',     f.acceptanceDeadline ? new Date(f.acceptanceDeadline).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'}) : '—'],
      ]}/>

      {/* Section 2 — CTC Breakup */}
      <SectionHead n="2" title="COMPENSATION STRUCTURE (ANNUAL CTC: ₹ " extra={fmtN(ctc.annual.totalCTC) + ' p.a.)'}/>
      <p style={{ fontSize:11, color:'#64748b', marginBottom:8 }}>
        The following compensation is computed on a Cost-to-Company (CTC) basis and includes fixed pay, variable pay, and statutory employer contributions as applicable under Indian labour law.
      </p>
      <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:16, fontSize:11.5 }}>
        <thead>
          <tr>
            <th style={th}>Compensation Component</th>
            <th style={{...th,textAlign:'right'}}>Monthly (₹)</th>
            <th style={{...th,textAlign:'right'}}>Annual (₹)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, monthly, annual, bold, accent], i) => (
            <tr key={i}>
              <td style={td(bold, accent)}>{label}</td>
              <td style={{...tdR, fontWeight:bold?700:400, color:accent||'#1e293b', background:bold?'#f0f9ff':'#fff'}}>{monthly}</td>
              <td style={{...tdR, fontWeight:bold?700:400, color:accent||'#1e293b', background:bold?'#f0f9ff':'#fff'}}>{annual}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize:11, color:'#1e293b', marginBottom:4, fontWeight:800, marginTop:16, letterSpacing:0.3 }}>STATUTORY DEDUCTIONS <span style={{ fontWeight:400, color:'#64748b' }}>(Indicative — actual as per applicable law)</span></p>
      <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:16, fontSize:11.5 }}>
        <thead>
          <tr>
            <th style={{...th, background:'#1e293b', color:'#f8fafc'}}>Deduction</th>
            <th style={{...th, background:'#1e293b', color:'#f8fafc', textAlign:'right'}}>Monthly (₹)</th>
            <th style={{...th, background:'#1e293b', color:'#f8fafc', textAlign:'right'}}>Annual (₹)</th>
          </tr>
        </thead>
        <tbody>
          {deductRows.map(([label, monthly, annual, bold, accent], i) => (
            <tr key={i}>
              <td style={td(bold, accent)}>{label}</td>
              <td style={{...tdR, fontWeight:bold?700:400, color:accent||'#1e293b', background:bold?'#f0f9ff':'#fff'}}>{monthly}</td>
              <td style={{...tdR, fontWeight:bold?700:400, color:accent||'#1e293b', background:bold?'#f0f9ff':'#fff'}}>{annual}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize:10, color:'#706E6B', fontStyle:'italic' }}>
        * CTC includes both fixed and variable components. Actual in-hand salary may vary based on applicable taxes, declarations, and investment proofs. TDS is indicative and will be deducted as per the Income Tax Act, 1961.
      </p>

      {/* Section 3 — Probation */}
      <SectionHead n="3" title="PROBATION PERIOD"/>
      <p>You shall be on a probation period of <strong>{f.probation}</strong> from your date of joining. During this period, the company or you may terminate the employment by giving <strong>{f.probationNotice} days' notice</strong> or salary in lieu thereof. Upon successful completion, you will be confirmed in the role subject to performance evaluation.</p>

      {/* Section 4 — Notice Period */}
      <SectionHead n="4" title="NOTICE PERIOD"/>
      <p>Post-confirmation, the notice period applicable shall be <strong>{f.noticePeriod}</strong> on either side. The company reserves the right to relieve you immediately by paying salary in lieu of the applicable notice period. Serving of notice period is mandatory from the employee's end unless waived by the management in writing.</p>

      {/* Section 5 — Working Hours */}
      <SectionHead n="5" title="WORKING HOURS & ATTENDANCE"/>
      <p>Standard working hours are <strong>9 hours per day, 5 days a week (Monday – Friday)</strong>. Working hours may vary based on client requirements, project exigencies, or operational needs. Employees may be required to work on weekends/public holidays during project crunch periods, subject to applicable compensatory-off or overtime policy. Attendance is tracked through the HRMS system.</p>

      {/* Section 6 — Leave Policy */}
      <SectionHead n="6" title="LEAVE POLICY"/>
      <InfoTable rows={[
        ['Casual Leave (CL)',   '12 days per calendar year'],
        ['Sick Leave (SL)',     '8 days per calendar year'],
        ['Earned / Privilege Leave (EL)', '15 days per year (accrues post-confirmation at 1.25 days/month)'],
        ['Public Holidays',    'As per company calendar (approx. 10 days)'],
        ['Maternity Leave',    '26 weeks paid (as per Maternity Benefit Act, 1961)'],
        ['Paternity Leave',    '5 working days'],
        ['Bereavement Leave',  '3 days for immediate family'],
      ]}/>

      {/* Section 7 — Statutory Benefits */}
      <SectionHead n="7" title="STATUTORY BENEFITS & COMPLIANCES"/>
      <p><strong>7.1 Employees' Provident Fund (EPF):</strong> Both employer and employee shall contribute 12% of the Basic Salary toward the Employees' Provident Fund (EPF) as mandated under the EPF & Miscellaneous Provisions Act, 1952. The employer's contribution is included in your CTC.</p>
      <p style={{marginTop:8}}><strong>7.2 Employee State Insurance (ESI):</strong> If your monthly gross salary is ₹21,000 or below, you and the employer shall contribute to the ESI scheme at 0.75% (employee) and 3.25% (employer) of gross wages respectively, as per the ESI Act, 1948.</p>
      <p style={{marginTop:8}}><strong>7.3 Gratuity:</strong> You shall be entitled to Gratuity as per the Payment of Gratuity Act, 1972, upon completion of 5 continuous years of service. The formula is: <em>(15 × Last Basic Salary × Years of Service) ÷ 26</em>. The gratuity provision is included in your CTC.</p>
      <p style={{marginTop:8}}><strong>7.4 Professional Tax:</strong> Professional Tax shall be deducted monthly from your salary as per the applicable State legislation (₹200/month in Telangana for salaries above ₹15,000).</p>
      <p style={{marginTop:8}}><strong>7.5 Income Tax / TDS:</strong> Tax Deducted at Source (TDS) shall be computed and deducted monthly from your salary as per the provisions of the Income Tax Act, 1961 and the slab rates applicable for the financial year. You are required to submit investment proof declarations within the stipulated timelines.</p>

      {/* Section 8 — Confidentiality */}
      <SectionHead n="8" title="CONFIDENTIALITY, NDA & INTELLECTUAL PROPERTY"/>
      <p>You shall maintain strict confidentiality regarding all proprietary information, client data, trade secrets, pricing, business strategies, candidate databases, and any other non-public information relating to the company and its clients. This obligation is perpetual and shall survive the termination of employment. All intellectual property, code, designs, documents, or innovations created during the course of employment shall vest solely with the company or the respective client.</p>

      {/* Section 9 — Non-solicitation */}
      <SectionHead n="9" title="NON-SOLICITATION & NON-COMPETE"/>
      <p>For a period of <strong>24 months</strong> following termination or resignation, you shall not: (a) directly or indirectly solicit, recruit, or hire any current or former employee of the company; (b) approach or solicit the company's clients for competing business; (c) disclose candidate or client data to any third party. Violation of this clause may attract legal remedies as available under applicable Indian law.</p>

      {/* Section 10 — Code of Conduct */}
      <SectionHead n="10" title="CODE OF CONDUCT & COMPANY POLICIES"/>
      <p>You are expected to read, understand, and comply with the Company's Code of Conduct, IT Security Policy, Social Media Policy, Data Protection Policy, and all other policies as updated from time to time on the HRMS portal. Violation may result in disciplinary action up to and including termination.</p>

      {/* Section 11 — POSH */}
      <SectionHead n="11" title="PREVENTION OF SEXUAL HARASSMENT (POSH)"/>
      <p>TalentNest HR is committed to providing a safe, respectful, and harassment-free workplace for all employees. All employees are required to comply with the provisions of The Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013. An Internal Complaints Committee (ICC) is in place for redressal of complaints.</p>

      {/* Section 12 — Background Verification */}
      <SectionHead n="12" title="BACKGROUND VERIFICATION & DOCUMENT SUBMISSION"/>
      <p>This offer is conditional upon satisfactory completion of pre-employment background verification, including but not limited to: educational qualifications, previous employment records, professional references, and criminal background check. You must submit original documents for verification on or before your joining date. Suppression of any information or submission of false documents is grounds for immediate termination at any stage of employment.</p>

      {/* Closing */}
      <div style={{ marginTop:24, padding:'14px 18px', background:'linear-gradient(135deg,#f0f9ff,#e0f2fe)', border:'1px solid #bae6fd', borderLeft:'4px solid #0176D3', borderRadius:'0 8px 8px 0' }}>
        <p>We believe you will be a valuable addition to our team. Please confirm your acceptance of this offer by signing and returning a copy of this letter, along with all supporting documents, by <strong>{f.acceptanceDeadline ? new Date(f.acceptanceDeadline).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'}) : 'the stipulated date'}</strong>.</p>
        <p style={{marginTop:8}}>This offer will stand void if not accepted within the stipulated deadline or if any information provided by you is found to be incorrect.</p>
      </div>

      <p style={{ marginTop:16 }}>Yours sincerely,</p>
      <div style={{ marginTop:24, display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:24 }}>
        <div>
          <div style={{ borderTop:'1px solid #706E6B', width:200, paddingTop:6 }}>
            <div style={{ fontWeight:700, fontSize:12 }}>{f.hrName || 'HR Manager'}</div>
            <div style={{ fontSize:11, color:'#64748b' }}>Human Resources | TalentNest HR</div>
            <div style={{ fontSize:11, color:'#64748b' }}>+91 79955 35539</div>
          </div>
        </div>
        {f.authorizedBy && (
          <div>
            <div style={{ borderTop:'1px solid #706E6B', width:200, paddingTop:6 }}>
              <div style={{ fontWeight:700, fontSize:12 }}>{f.authorizedBy}</div>
              <div style={{ fontSize:11, color:'#64748b' }}>Authorized Signatory</div>
            </div>
          </div>
        )}
      </div>

      {/* Acceptance block */}
      <div style={{ marginTop:28, padding:'16px 18px', border:'1.5px solid #cbd5e1', borderRadius:8, background:'#f8fafc' }}>
        <p style={{ fontWeight:700, textTransform:'uppercase', fontSize:11, letterSpacing:1, marginBottom:10, color:'#1e293b' }}>ACCEPTANCE — To be signed and returned</p>
        <p>I, <strong>{c?.name || '___________________________'}</strong>, hereby accept the offer of employment as <strong>{j?.title || f.designation}</strong> at <strong>{f.clientCompany || j?.company || 'TalentNest HR'}</strong> on the terms and conditions stated above.</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap:20, marginTop:16 }}>
          <div><div style={{ borderTop:'1px solid #374151', paddingTop:6, fontSize:11 }}>Signature &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div></div>
          <div><div style={{ borderTop:'1px solid #374151', paddingTop:6, fontSize:11 }}>Date of Acceptance &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div></div>
          <div><div style={{ borderTop:'1px solid #374151', paddingTop:6, fontSize:11 }}>Confirmed Joining Date &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div></div>
          <div><div style={{ borderTop:'1px solid #374151', paddingTop:6, fontSize:11 }}>Employee Code (office use)</div></div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop:20 }}>
        <div style={{ height:3, background:'linear-gradient(90deg,#032D60 0%,#0176D3 60%,#38bdf8 100%)', marginBottom:8, borderRadius:2 }}/>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#706E6B' }}>
        <span>TalentNest HR · IT Staffing & Consulting · Hyderabad</span>
        <span>This document is system-generated · {refNo}</span>
      </div>
    </div>
  );
}

function SectionHead({ n, title, extra }) {
  return (
    <div style={{ marginTop:22, marginBottom:8, display:'flex', alignItems:'center', gap:10, borderBottom:'1.5px solid #e2e8f0', paddingBottom:6 }}>
      <div style={{ background:'#032D60', color:'#fff', width:24, height:24, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, flexShrink:0 }}>{n}</div>
      <span style={{ fontWeight:800, fontSize:12, color:'#032D60', textTransform:'uppercase', letterSpacing:0.8 }}>{title}{extra && <span style={{ color:'#0176D3', fontWeight:700 }}>{extra}</span>}</span>
    </div>
  );
}

function InfoTable({ rows }) {
  return (
    <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:12, fontSize:11.5, border:'1px solid #e2e8f0', borderRadius:6, overflow:'hidden' }}>
      <tbody>
        {rows.map(([k, v], i) => (
          <tr key={k} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
            <td style={{ padding:'7px 12px', fontWeight:700, color:'#032D60', width:'38%', borderBottom:'1px solid #e2e8f0' }}>{k}</td>
            <td style={{ padding:'7px 12px', color:'#1e293b', borderBottom:'1px solid #e2e8f0' }}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function OfferLetterModal({ app, recruiter, onClose, onDone }) {
  const c = app.candidate, j = app.job;
  const docRef = useRef();
  const [tab, setTab]     = useState('configure'); // 'configure' | 'preview'
  const [saving, setSaving] = useState(false);
  const [toast, setToast]  = useState('');

  const today = new Date().toISOString().split('T')[0];
  const deadline = new Date(Date.now() + 7*24*3600*1000).toISOString().split('T')[0];

  const [form, setForm] = useState({
    designation:       j?.title || c?.title || '',
    department:        j?.department || '',
    employmentType:    'Full-Time (Permanent)',
    workLocation:      c?.location || 'Hyderabad, Telangana',
    clientCompany:     j?.company || 'TalentNest HR',
    reportingTo:       'Project Manager',
    joiningDate:       '',
    acceptanceDeadline: deadline,
    annualCTC:         '',
    variablePct:       10,
    isMetro:           true,
    probation:         '3 months',
    probationNotice:   '15',
    noticePeriod:      '60 days',
    hrName:            recruiter?.name || 'HR Manager',
    authorizedBy:      '',
    emailNote:         '',
  });
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const ctc = form.annualCTC && Number(form.annualCTC) > 0
    ? calcCTC(Number(form.annualCTC), Number(form.variablePct), form.isMetro)
    : null;

  const handlePrint = () => {
    const content = docRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank', 'width=960,height=760,scrollbars=yes');
    win.document.write(`<!DOCTYPE html><html><head><title>Offer Letter — ${c?.name}</title>
      <meta charset="utf-8"/>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Times New Roman',Georgia,serif;font-size:12px;line-height:1.7;color:#1e293b;padding:32px 40px}
        @page{margin:15mm;size:A4}
        @media print{body{padding:0}}
        table{border-collapse:collapse;width:100%}
      </style></head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  };

  const sendOffer = async () => {
    setSaving(true);
    try {
      await api.updateStage(app.id, 'offer_extended', 'Offer letter generated and sent', {});
      if (form.emailNote && c?.email) {
        const body = `Dear ${c?.name?.split(' ')[0] || 'Candidate'},\n\nWe are pleased to extend a formal offer for the position of ${j?.title || form.designation} at ${form.clientCompany}.\n\nPlease find your offer letter attached. Kindly review the terms and confirm acceptance by ${new Date(form.acceptanceDeadline).toLocaleDateString('en-IN')}.\n\n${form.emailNote}\n\nWarm regards,\n${form.hrName}\nTalentNest HR\n+91 79955 35539`;
        await api.sendEmail(c.email, `Offer Letter: ${j?.title || form.designation} — TalentNest HR`, body).catch(() => {});
      }
      onDone('✅ Offer sent! Stage updated to Offer Sent.');
    } catch(e) {
      setToast('❌ ' + e.message);
    }
    setSaving(false);
  };

  const tabBtn = (t, label) => ({
    padding: '7px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: 'none', borderRadius: '10px 10px 0 0',
    background: tab === t ? 'rgba(1,118,211,0.15)' : 'transparent',
    color: tab === t ? '#0176D3' : '#64748b',
    borderBottom: tab === t ? '2px solid #0176D3' : '2px solid transparent',
  });

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 18 }}>
            {(c?.name || '?')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 1 }}>Executive Placement</div>
            <h3 style={{ color: '#fff', margin: 0, fontSize: 16, fontWeight: 800 }}>📨 Generate Offer Package</h3>
          </div>
        </div>
      }
      onClose={onClose}
      width="980px"
      footer={
        <>
          <button onClick={onClose} style={{ ...btnG, minHeight: 48, padding: '0 24px' }}>Discard</button>
          {tab === 'configure' && (
            <button onClick={() => { if (!form.annualCTC) { setToast('❌ Enter Annual CTC first'); return; } setTab('preview'); }} style={{ ...btnP, flex: 1, minHeight: 48, background: 'linear-gradient(135deg,#032D60,#0176D3)' }}>
              📄 Generate & Preview Letter →
            </button>
          )}
          <button onClick={sendOffer} disabled={saving || !form.annualCTC} style={{ ...btnP, flex: 1, minHeight: 48, background: 'linear-gradient(135deg,#059669,#047857)', opacity: (saving || !form.annualCTC) ? 0.6 : 1 }}>
            {saving ? <><Spinner /> Finalizing Package…</> : '📨 Confirm & Send Offer Package'}
          </button>
        </>
      }
    >
      <Toast msg={toast} onClose={() => setToast('')} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, padding: '0 0px', borderBottom: '1px solid #E2E8F0', background: '#fff', flexShrink: 0, marginBottom: 20 }}>
        <button style={tabBtn('configure', '⚙ Configure Terms')} onClick={() => setTab('configure')}>⚙ Configure Package</button>
        <button style={tabBtn('preview', '📄 Preview Document')} onClick={() => { if (!form.annualCTC) { setToast('❌ Enter Annual CTC first'); return; } setTab('preview'); }}>📄 Preview Letter</button>
      </div>

      <div>
        {/* ── CONFIGURE TAB ── */}
        {tab === 'configure' && (
          <div>
            {/* Candidate Info Card */}
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '16px 20px', marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div>
                <p style={{ color: '#64748B', fontSize: 11, fontWeight: 700, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Candidate Details</p>
                <p style={{ color: '#1E293B', fontSize: 15, fontWeight: 800, margin: 0 }}>{c?.name}</p>
                <p style={{ color: '#64748B', fontSize: 13, margin: '2px 0 0' }}>{c?.email} · {c?.phone || 'No phone'}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#64748B', fontSize: 11, fontWeight: 700, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Target Position</p>
                <p style={{ color: '#0176D3', fontSize: 15, fontWeight: 800, margin: 0 }}>{j?.title}</p>
                <p style={{ color: '#64748B', fontSize: 13, margin: '2px 0 0' }}>{j?.company}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 18 }}>
              <Field label="Designation / Job Title *" value={form.designation} onChange={v => sf('designation', v)} />
              <Field label="Department / Business Unit" value={form.department} onChange={v => sf('department', v)} placeholder="e.g. Engineering / IT / Operations" />
              <Field label="Client / Employer Legal Name *" value={form.clientCompany} onChange={v => sf('clientCompany', v)} />
              <Field label="Work Location / Base *" value={form.workLocation} onChange={v => sf('workLocation', v)} />
              <Field label="Reporting Manager" value={form.reportingTo} onChange={v => sf('reportingTo', v)} />
              <Dropdown label="Employment Nature" value={form.employmentType} onChange={v => sf('employmentType', v)} options={['Full-Time (Permanent)', 'Contract (Fixed Term)', 'Contract-to-Hire', 'On Deputation', 'Internship']} />
              <Field label="Tentative Joining Date" value={form.joiningDate} onChange={v => sf('joiningDate', v)} type="date" />
              <Field label="Offer Acceptance Deadline *" value={form.acceptanceDeadline} onChange={v => sf('acceptanceDeadline', v)} type="date" />
            </div>

            {/* CTC section */}
            <div style={{ background: '#fff', border: '1.5px solid rgba(1,118,211,0.2)', borderRadius: 20, padding: '24px', marginTop: 28, boxShadow: '0 12px 32px rgba(1,118,211,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(1,118,211,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💰</div>
                <p style={{ color: '#0176D3', fontSize: 13, fontWeight: 800, margin: 0, letterSpacing: 0.5, textTransform: 'uppercase' }}>Remuneration Structure</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 18, marginBottom: 24 }}>
                <Field label="Total Annual CTC (₹) *" value={form.annualCTC} onChange={v => sf('annualCTC', v)} placeholder="e.g. 1200000" />
                <div>
                  <label style={{ color: '#64748B', fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 8 }}>Performance Pay %</label>
                  <select value={form.variablePct} onChange={e => sf('variablePct', Number(e.target.value))} style={{ ...inp, height: 46, fontSize: 14 }}>
                    {[0, 5, 10, 15, 20, 25, 30].map(v => <option key={v} value={v}>{v}% Variable</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ color: '#64748B', fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 8 }}>City Classification (HRA)</label>
                  <select value={form.isMetro ? 'metro' : 'non'} onChange={e => sf('isMetro', e.target.value === 'metro')} style={{ ...inp, height: 46, fontSize: 14 }}>
                    <option value="metro">Tier 1 Metro (50% HRA)</option>
                    <option value="non">Tier 2/3 City (40% HRA)</option>
                  </select>
                </div>
              </div>

              {/* Live CTC breakdown */}
              {ctc && (
                <div style={{ background: '#F8FAFF', borderRadius: 16, padding: '16px', border: '1px solid #E2E8F0', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr>
                        <th style={{ color: '#64748B', padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Component</th>
                        <th style={{ color: '#64748B', padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Monthly</th>
                        <th style={{ color: '#64748B', padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Annual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['Basic Salary', ctc.monthly.basic, ctc.annual.basic, false],
                        ['House Rent (HRA)', ctc.monthly.hra, ctc.annual.hra, false],
                        ['Transport', ctc.monthly.transport, ctc.annual.transport, false],
                        ['Medical', ctc.monthly.medical, ctc.annual.medical, false],
                        ['Special Allow.', ctc.monthly.special, ctc.annual.special, false],
                        ...(form.variablePct > 0 ? [['Variable Component', ctc.monthly.variable, ctc.annual.variable, false]] : []),
                        ['TOTAL GROSS', ctc.monthly.gross, ctc.annual.gross, true],
                        ["Employer's PF", ctc.monthly.empPF, ctc.annual.empPF, false],
                        ['Gratuity Prov.', ctc.monthly.gratuity, ctc.annual.gratuity, false],
                        ['TOTAL CTC', Math.round(Number(form.annualCTC) / 12), Number(form.annualCTC), true, '#0176D3'],
                        ['─ Employee PF', -ctc.monthly.eePF, -ctc.annual.eePF, false, '#E11D48'],
                        ['─ Prof. Tax', -ctc.monthly.pt, -ctc.annual.pt, false, '#E11D48'],
                        ['─ Est. TDS', -ctc.monthly.tds, -ctc.annual.tds, false, '#E11D48'],
                        ['≈ Net Take-Home', ctc.monthly.inHand, ctc.annual.inHand, true, '#059669'],
                      ].map(([l, m, a, bold, accent], i) => (
                        <tr key={i} style={{ borderBottom: i === 6 || i === 9 ? '2px solid #E2E8F0' : '1px solid #F1F5F9' }}>
                          <td style={{ padding: '8px 14px', color: accent || '#1E293B', fontWeight: bold ? 800 : 400 }}>{l}</td>
                          <td style={{ padding: '8px 14px', textAlign: 'right', color: accent || '#1E293B', fontWeight: bold ? 800 : 400 }}>{fmt(Math.abs(m))}</td>
                          <td style={{ padding: '8px 14px', textAlign: 'right', color: accent || '#1E293B', fontWeight: bold ? 800 : 400 }}>{fmt(Math.abs(a))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* HR & Policies */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 18, marginTop: 24 }}>
              <Dropdown label="Probation Duration" value={form.probation} onChange={v => sf('probation', v)} options={['1 month', '3 months', '6 months', 'No probation']} />
              <Field label="Notice during Probation (days)" value={form.probationNotice} onChange={v => sf('probationNotice', v)} placeholder="15" />
              <Dropdown label="Confirmation Notice Period" value={form.noticePeriod} onChange={v => sf('noticePeriod', v)} options={['15 days', '30 days', '45 days', '60 days', '90 days', '120 days']} />
              <Field label="HR Signatory" value={form.hrName} onChange={v => sf('hrName', v)} />
              <Field label="Approval Authority (optional)" value={form.authorizedBy} onChange={v => sf('authorizedBy', v)} placeholder="CEO / Director" />
              <div style={{ gridColumn: 'span 2' }}>
                <Field label="Email Cover Note" value={form.emailNote} onChange={v => sf('emailNote', v)} rows={2} placeholder="Add a personal touch to the offer email…" />
              </div>
            </div>
          </div>
        )}

        {/* ── PREVIEW TAB ── */}
        {tab === 'preview' && ctc && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(1,118,211,0.06)', padding: '12px 20px', borderRadius: 16, border: '1px solid rgba(1,118,211,0.1)' }}>
              <div style={{ color: '#0176D3', fontSize: 13, fontWeight: 700 }}>📄 Document Preview Protocol Active</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handlePrint} style={{ ...btnP, height: 38, padding: '0 18px', fontSize: 12, background: 'linear-gradient(135deg,#032D60,#0176D3)' }}>🖨 Download PDF</button>
                <button onClick={() => setTab('configure')} style={{ ...btnG, height: 38, padding: '0 18px', fontSize: 12 }}>← Revise Terms</button>
              </div>
            </div>
            <div ref={docRef} style={{ background: '#fff', borderRadius: 12, padding: '48px 60px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', border: '1px solid #E2E8F0' }}>
              <OfferLetterDoc data={{ candidate: c, job: j, form }} ctc={ctc} />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
