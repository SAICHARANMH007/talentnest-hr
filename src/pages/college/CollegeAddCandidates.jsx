'use strict';
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
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
  { key: 'title',          label: 'Current Role / Designation' },
  { key: 'currentCompany', label: 'Current Company' },
  { key: 'location',       label: 'Location' },
  { key: 'experience',     label: 'Years of Experience' },
  { key: 'skills',         label: 'Skills (comma-separated)' },
  { key: 'institution',    label: 'College / Institution' },
  { key: 'degree',         label: 'Degree (e.g. B.Tech)' },
  { key: 'fieldOfStudy',   label: 'Branch / Field of Study' },
  { key: 'year',           label: 'Passing Year' },
  { key: 'grade',          label: 'CGPA / Percentage' },
  { key: 'certifications', label: 'Certifications' },
];

const NONE = '__none__';

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

  const handleFileUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError('');
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
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
        setError('Could not read this file. Please upload a valid Excel (.xlsx, .xls) or CSV file.');
      }
    };
    reader.readAsBinaryString(f);
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
        </div>
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
