'use strict';
import React, { useState, useRef } from 'react';
import readXlsxFile from 'read-excel-file/browser';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { card } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const btnP = { background: '#0176D3', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, padding: '10px 24px', cursor: 'pointer', fontSize: 13 };
const btnG = { background: '#F3F2F2', border: '1px solid #DDDBDA', borderRadius: 10, color: '#181818', fontWeight: 600, padding: '10px 20px', cursor: 'pointer', fontSize: 13 };
const select = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #DDDBDA', fontSize: 13, background: '#fff', color: '#181818' };

// Candidate fields the placement officer can map spreadsheet columns to.
const TARGET_FIELDS = [
  { key: 'name',           label: 'Full Name',                required: true },
  { key: 'email',          label: 'Email Address',            required: true },
  { key: 'phone',          label: 'Phone Number' },
  { key: 'location',       label: 'Location' },
  { key: 'skills',         label: 'Skills (comma-separated)' },
  { key: 'institution',    label: 'College / Institution' },
  { key: 'degree',         label: 'Degree (e.g. B.Tech)' },
  { key: 'fieldOfStudy',   label: 'Branch / Field of Study' },
  { key: 'year',           label: 'Passing Year' },
  { key: 'grade',          label: 'CGPA / Percentage' },
  { key: 'certifications', label: 'Certifications' },
  // Only relevant for alumni who are already working — hidden on the manual
  // "Add a Candidate" form when "Mark as fresher" is checked.
  { key: 'title',          label: 'Current Role / Designation', alumniOnly: true },
  { key: 'currentCompany', label: 'Current Company',            alumniOnly: true },
  { key: 'experience',     label: 'Years of Experience',        alumniOnly: true },
];

const NONE = '__none__';

const EMPTY_MANUAL = TARGET_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {});

export default function CollegeAddCandidates({ user }) {
  const [step, setStep] = useState(1); // 1: upload, 2: map & preview, 3: result
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [markFresher, setMarkFresher] = useState(true);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef();

  // Manual single-candidate add
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ ...EMPTY_MANUAL, isFresher: true });
  const [savingManual, setSavingManual] = useState(false);

  const handleFileUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError('');
    setFileName(f.name);
    const parseFile = async () => {
      try {
        let data;
        if (f.name.toLowerCase().endsWith('.csv')) {
          const text = await f.text();
          const lines = text.trim().split(/\r?\n/);
          data = lines.map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
        } else {
          data = await readXlsxFile(f);
        }
        if (!data.length) { setError('The file appears to be empty.'); return; }

        const fileHeaders = (data[0] || []).map(h => String(h ?? '').trim());
        const dataRows = data.slice(1).filter(r => r.some(c => c !== undefined && c !== ''));

        // Auto-guess mapping based on header names
        const guessed = {};
        TARGET_FIELDS.forEach(f => {
          const idx = fileHeaders.findIndex(h => {
            const hl = h.toLowerCase();
            switch (f.key) {
              case 'name': return /^(full\s*)?name$|candidate\s*name|student\s*name/.test(hl);
              case 'email': return /e[\-\s]?mail/.test(hl);
              case 'phone': return /phone|mobile|contact/.test(hl);
              case 'title': return /title|designation|role/.test(hl);
              case 'currentCompany': return /company|organi[sz]ation|employer/.test(hl);
              case 'location': return /location|city|address/.test(hl);
              case 'experience': return /experience|exp\b/.test(hl);
              case 'skills': return /skills?/.test(hl);
              case 'institution': return /college|institution|university|school/.test(hl);
              case 'degree': return /degree|qualification/.test(hl);
              case 'fieldOfStudy': return /branch|stream|field|specialization|major/.test(hl);
              case 'year': return /year|passing|graduation/.test(hl);
              case 'grade': return /cgpa|gpa|percentage|grade|marks/.test(hl);
              case 'certifications': return /certificat/.test(hl);
              default: return false;
            }
          });
          guessed[f.key] = idx >= 0 ? String(idx) : NONE;
        });

        setHeaders(fileHeaders);
        setRows(dataRows);
        setMapping(guessed);
        setStep(2);
      } catch (err) {
        setError('Could not read this file. Please upload a valid Excel (.xlsx) or CSV file.');
      }
    };
    parseFile();
  };

  const buildCandidates = () => {
    return rows.map(row => {
      const get = (key) => {
        const idx = mapping[key];
        if (idx === undefined || idx === NONE) return '';
        const v = row[parseInt(idx, 10)];
        return v === undefined || v === null ? '' : String(v).trim();
      };

      const candidate = {
        name: get('name'),
        email: get('email'),
        phone: get('phone'),
        title: get('title'),
        currentCompany: get('currentCompany'),
        location: get('location'),
        experience: get('experience'),
        skills: get('skills'),
        certifications: get('certifications'),
        isFresher: markFresher,
      };

      const institution = get('institution');
      const degree = get('degree');
      const fieldOfStudy = get('fieldOfStudy');
      const year = get('year');
      const grade = get('grade');
      if (institution || degree || fieldOfStudy || year || grade) {
        candidate.educationList = [{ institution, degree, field: fieldOfStudy, year, grade }];
      }

      return candidate;
    });
  };

  const buildManualCandidate = () => {
    const candidate = {
      name: manualForm.name.trim(),
      email: manualForm.email.trim(),
      phone: manualForm.phone.trim(),
      title: manualForm.title.trim(),
      currentCompany: manualForm.currentCompany.trim(),
      location: manualForm.location.trim(),
      experience: manualForm.experience.trim(),
      skills: manualForm.skills.trim(),
      certifications: manualForm.certifications.trim(),
      isFresher: manualForm.isFresher,
    };

    const { institution, degree, fieldOfStudy, year, grade } = manualForm;
    if (institution || degree || fieldOfStudy || year || grade) {
      candidate.educationList = [{ institution: institution.trim(), degree: degree.trim(), field: fieldOfStudy.trim(), year: year.trim(), grade: grade.trim() }];
    }

    return candidate;
  };

  const manualRequiredFilled = manualForm.name.trim() && manualForm.email.trim();

  const handleManualSubmit = async () => {
    setSavingManual(true);
    setError('');
    try {
      const res = await api.importCollegeStudents([buildManualCandidate()]);
      setResult(res);
      setShowManual(false);
      setManualForm({ ...EMPTY_MANUAL, isFresher: true });
      setStep(3);
    } catch (err) {
      setError(err.message || 'Could not add candidate. Please try again.');
    }
    setSavingManual(false);
  };

  const previewCandidates = step >= 2 ? buildCandidates().slice(0, 5) : [];
  const requiredMapped = TARGET_FIELDS.filter(f => f.required).every(f => mapping[f.key] && mapping[f.key] !== NONE);

  const handleImport = async () => {
    setImporting(true);
    setError('');
    try {
      const candidates = buildCandidates();
      const res = await api.importCollegeStudents(candidates);
      setResult(res);
      setStep(3);
    } catch (err) {
      setError(err.message || 'Import failed. Please try again.');
    }
    setImporting(false);
  };

  const reset = () => {
    setStep(1);
    setFileName('');
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResult(null);
    setError('');
    setShowManual(false);
    setManualForm({ ...EMPTY_MANUAL, isFresher: true });
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div>
      <PageHeader
        title="📥 Add Candidates"
        subtitle="Upload an Excel/CSV sheet of your students or alumni, then map the columns to candidate fields. New candidates will automatically appear in your Students list and college community."
      />

      {error && (
        <div style={{ ...card, borderLeft: '4px solid #BA0517', color: '#BA0517', marginBottom: 16 }}>{error}</div>
      )}

      {/* ── STEP 1: Upload ── */}
      {step === 1 && (
        <>
          <div style={card}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{ border: '2px dashed #CBD5E1', borderRadius: 16, padding: '60px 40px', textAlign: 'center', cursor: 'pointer', background: '#F8FAFC' }}
            >
              <input type="file" ref={fileRef} style={{ display: 'none' }} accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
              <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
              <h3 style={{ margin: '0 0 8px', color: '#1E293B' }}>{fileName || 'Click to upload an Excel or CSV file'}</h3>
              <p style={{ color: '#64748B', fontSize: 13 }}>Any columns, any order — you'll map them to candidate fields next.</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
              <span style={{ color: '#94A3B8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
            </div>

            <div style={{ textAlign: 'center' }}>
              <button style={btnG} onClick={() => setShowManual(s => !s)}>
                {showManual ? '✕ Cancel' : '➕ Add One Candidate Manually'}
              </button>
              {!showManual && (
                <p style={{ color: '#94A3B8', fontSize: 12, marginTop: 10 }}>
                  Add a single student or alumnus by hand using the same fields as a bulk upload.
                </p>
              )}
            </div>
          </div>

          {showManual && (
            <div style={{ ...card, marginTop: 16 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 15, color: '#181818' }}>Add a Candidate</h3>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#706E6B' }}>
                Fill in what you know — only Full Name and Email Address are required. These are the same fields used during bulk import.
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: '#181818' }}>
                <input type="checkbox" checked={manualForm.isFresher} onChange={e => setManualForm(m => ({ ...m, isFresher: e.target.checked }))} />
                Mark as fresher (no prior work experience)
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                {TARGET_FIELDS.filter(f => !f.alumniOnly || !manualForm.isFresher).map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#181818', marginBottom: 6 }}>
                      {f.label}{f.required ? ' *' : ''}
                    </label>
                    <input
                      style={{ ...select, padding: '8px 10px' }}
                      value={manualForm[f.key]}
                      onChange={e => setManualForm(m => ({ ...m, [f.key]: e.target.value }))}
                      placeholder={f.label}
                    />
                  </div>
                ))}
              </div>

              {!manualRequiredFilled && (
                <div style={{ marginTop: 12, color: '#BA0517', fontSize: 12 }}>Please enter Full Name and Email Address.</div>
              )}

              <div style={{ marginTop: 16 }}>
                <button
                  style={{ ...btnP, opacity: (!manualRequiredFilled || savingManual) ? 0.6 : 1 }}
                  disabled={!manualRequiredFilled || savingManual}
                  onClick={handleManualSubmit}
                >
                  {savingManual ? '⏳ Adding...' : '✅ Add Candidate'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── STEP 2: Map & Preview ── */}
      {step === 2 && (
        <>
          <div style={{ ...card, marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 15, color: '#181818' }}>Map your columns</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#706E6B' }}>
              {rows.length} row{rows.length === 1 ? '' : 's'} found in <strong>{fileName}</strong>. Match each candidate field to a column from your file. Fields marked * are required.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {TARGET_FIELDS.map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#181818', marginBottom: 6 }}>
                    {f.label}{f.required ? ' *' : ''}
                  </label>
                  <select
                    style={select}
                    value={mapping[f.key] ?? NONE}
                    onChange={e => setMapping(m => ({ ...m, [f.key]: e.target.value }))}
                  >
                    <option value={NONE}>— Not in file —</option>
                    {headers.map((h, i) => (
                      <option key={i} value={String(i)}>{h || `Column ${i + 1}`}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18, fontSize: 13, color: '#181818' }}>
              <input type="checkbox" checked={markFresher} onChange={e => setMarkFresher(e.target.checked)} />
              Mark all imported candidates as freshers (no prior work experience)
            </label>
          </div>

          <div style={{ ...card, marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#181818' }}>Preview (first {previewCandidates.length} rows)</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Name', 'Email', 'Phone', 'Title', 'College', 'Year', 'Grade'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #E2E8F0', color: '#706E6B', textTransform: 'uppercase', fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewCandidates.map((c, i) => (
                    <tr key={i}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9' }}>{c.name || '—'}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9' }}>{c.email || '—'}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9' }}>{c.phone || '—'}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9' }}>{c.title || '—'}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9' }}>{c.educationList?.[0]?.institution || '—'}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9' }}>{c.educationList?.[0]?.year || '—'}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9' }}>{c.educationList?.[0]?.grade || '—'}</td>
                    </tr>
                  ))}
                  {previewCandidates.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#94A3B8' }}>No rows to preview.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {!requiredMapped && (
              <div style={{ marginTop: 12, color: '#BA0517', fontSize: 12 }}>Please map Full Name and Email Address before importing.</div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button style={btnG} onClick={reset}>← Start Over</button>
            <button
              style={{ ...btnP, opacity: (!requiredMapped || importing) ? 0.6 : 1 }}
              disabled={!requiredMapped || importing}
              onClick={handleImport}
            >
              {importing ? '⏳ Importing...' : `🚀 Import ${rows.length} Candidate${rows.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </>
      )}

      {/* ── STEP 3: Result ── */}
      {step === 3 && result && (
        <div style={card}>
          <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#181818' }}>Import complete 🎉</h3>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: '#181818' }}>
            <strong style={{ color: '#16A34A' }}>{result.created}</strong> candidate{result.created === 1 ? '' : 's'} added to your Students list
            {result.skipped > 0 && <> · <strong style={{ color: '#BA0517' }}>{result.skipped}</strong> skipped</>}.
          </p>

          {result.errors?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', marginBottom: 8 }}>Skipped Rows</div>
              <div style={{ maxHeight: 200, overflowY: 'auto', fontSize: 12, color: '#706E6B' }}>
                {result.errors.map((e, i) => (
                  <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>Row {e.row}: {e.reason}</div>
                ))}
              </div>
            </div>
          )}

          <button style={btnP} onClick={reset}>Import Another File</button>
        </div>
      )}
    </div>
  );
}
