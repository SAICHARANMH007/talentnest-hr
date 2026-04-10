import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../../api/api.js';
import Field from '../../components/ui/Field.jsx';

const card  = { background: '#FFFFFF', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 16, padding: 24, marginBottom: 20 };
const btnP  = { background: '#0176D3', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, padding: '9px 20px', cursor: 'pointer', fontSize: 13 };
const btnG  = { background: '#F3F2F2', border: '1px solid #DDDBDA', borderRadius: 10, color: '#181818', fontWeight: 600, padding: '9px 20px', cursor: 'pointer', fontSize: 13 };

// ── Exact template columns + flexible aliases ─────────────────────────────────
const TEMPLATE_COLS = [
  'Source', 'TA', 'Date', 'Candidate Name', 'Mobile',
  'Email ID', 'Overall Experience', 'Relevant Experience', 'Current Location',
  'Preferred Work location', 'Current company', 'Client', 'Role',
  'Skill', 'Certifications', 'Current CTC', 'Expected CTC',
  'Client Spoc', 'Status', 'Additional Details', 'LinkedIn ID',
];

// Maps any column header variation → our field key
const COL_ALIASES = {
  source:             ['source', 'source name', 'lead source', 'referral source', 'sourced from'],
  ta:                 ['ta', 'talent acquisition', 'talent acquisition person', 'ta name'],
  dateAdded:          ['date', 'date added', 'submission date', 'entry date', 'date of entry'],
  name:               ['candidate name', 'name', 'full name', 'candidate', 'fullname', 'candidate fullname'],
  phone:              ['mobile', 'contact number', 'phone', 'contact', 'mobile number', 'phone number'],
  email:              ['email id', 'email', 'email address', 'e-mail', 'mail', 'email(optional)'],
  experience:         ['overall experience', 'experience', 'total experience', 'exp', 'years', 'yoe'],
  relevantExperience: ['relevant experience', 'relevant exp', 'rel exp'],
  location:           ['current location', 'location', 'city', 'current city'],
  preferredLocation:  ['preferred work location', 'preferred location', 'pref location', 'work location'],
  currentCompany:     ['current company', 'company', 'employer', 'organisation', 'organization', 'current employer'],
  client:             ['client', 'client name', 'client company'],
  jobRole:            ['role', 'job role', 'position', 'opening', 'job title'],
  skills:             ['skill', 'skills', 'tech skills', 'technical skills', 'key skills'],
  certifications:     ['certifications', 'certification', 'certs', 'certificates'],
  currentCTC:         ['current ctc', 'ctc', 'current salary', 'salary'],
  expectedCTC:        ['expected ctc', 'expected salary', 'exp ctc', 'expected'],
  clientSpoc:         ['client spoc', 'spoc', 'client poc', 'contact person', 'poc'],
  candidateStatus:    ['status', 'candidate status', 'pipeline status', 'hiring status', 'current status'],
  additionalDetails:  ['additional details', 'additional', 'details', 'notes', 'remarks', 'comments', 'additional info'],
  linkedin:           ['linkedin id', 'linkedin', 'linkedin url', 'linkedin profile', 'linkedin link'],
};

// Parse a single CSV line respecting quoted fields
function parseCSVLine(line) {
  const cols = []; let cur = ''; let inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  cols.push(cur.trim());
  return cols;
}

// Large-file threshold — above this we stream instead of loading all at once
const STREAM_THRESHOLD = 50 * 1024 * 1024; // 50 MB

function parseFile(fileData, isCSV) {
  if (isCSV) {
    const lines = fileData.trim().split(/\r?\n/);
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(l => parseCSVLine(l));
    return { headers, rows };
  } else {
    const wb = XLSX.read(fileData, {
      type: 'array',
      cellFormula: false,
      cellHTML:    false,
      cellNF:      false,
      cellStyles:  false,
      cellDates:   false,
      sheetStubs:  false,
    });
    const ws  = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    return { headers: raw[0]?.map(h => String(h || '')) || [], rows: raw.slice(1) };
  }
}

// Extract a clean email address from a cell that may contain hyperlinks or extra text
// e.g. "john@example.com<https://...>" or "mailto:john@example.com" or "john@example.com (link)"
function extractEmail(raw) {
  const s = String(raw || '').trim();
  // mailto: prefix
  const mailto = s.match(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i);
  if (mailto) return mailto[1].toLowerCase();
  // Any email pattern within the string
  const match = s.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase() : s.toLowerCase();
}

function mapRow(row, headers) {
  const result = {};
  const hLower = headers.map(h => String(h || '').toLowerCase().trim());
  for (const [field, aliases] of Object.entries(COL_ALIASES)) {
    for (const alias of aliases) {
      const idx = hLower.findIndex(h => h === alias);
      if (idx !== -1) {
        const raw = String(row[idx] ?? '').trim();
        // Clean email field — extract just the address from hyperlink cells
        result[field] = field === 'email' ? extractEmail(raw) : raw;
        break;
      }
    }
    // If column not in file at all → don't include key → backend won't overwrite existing data
  }
  return result;
}

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr); if (isNaN(d)) return 'Never';
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  if (s < 604800) return `${Math.floor(s/86400)}d ago`;
  return d.toLocaleDateString();
}

// ── Assign Recruiter Dropdown ─────────────────────────────────────────────────
function AssignDropdown({ candidate, recruiters, onAssigned }) {
  const [val, setVal]   = useState(candidate.assignedRecruiterId || '');
  const [busy, setBusy] = useState(false);

  const assign = async (recruiterId) => {
    setBusy(true);
    try {
      const updated = await api.assignCandidate(candidate.id, recruiterId || null);
      setVal(recruiterId);
      onAssigned(updated);
    } catch {}
    setBusy(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
      <span style={{ color: '#9E9D9B', fontSize: 11 }}>Assigned TA:</span>
      <select
        value={val}
        onChange={e => assign(e.target.value)}
        disabled={busy}
        style={{ background: '#F3F2F2', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 6, color: val ? '#0176D3' : '#9E9D9B', fontSize: 11, padding: '3px 8px', cursor: 'pointer', outline: 'none' }}
      >
        <option value="">— Unassigned —</option>
        {recruiters.map(r => (
          <option key={r.id} value={r.id}>{r.name}{r.title ? ` (${r.title})` : ''}</option>
        ))}
      </select>
      {busy && <span style={{ fontSize: 11, color: '#0176D3' }}>…</span>}
      {val && !busy && <span style={{ fontSize: 11, color: '#34d399' }}>✓</span>}
    </div>
  );
}

// ── Contact Logger ────────────────────────────────────────────────────────────
function ContactLogger({ candidate, onUpdate }) {
  const [note, setNote]   = useState('');
  const [busy, setBusy]   = useState(false);
  const [open, setOpen]   = useState(false);

  const markReached = async () => {
    setBusy(true);
    try { const u = await api.markReachOut(candidate.id, note); setNote(''); setOpen(false); onUpdate(u); } catch {}
    setBusy(false);
  };

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {candidate.lastReachedOutAt
          ? <span style={{ fontSize: 11, color: '#0176D3', background: 'rgba(1,118,211,0.1)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 20, padding: '2px 10px', fontWeight: 600 }}>📬 Last contacted: {timeAgo(candidate.lastReachedOutAt)}</span>
          : <span style={{ fontSize: 11, color: '#C9C7C5', background: '#FFFFFF', border: '1px solid #FAFAF9', borderRadius: 20, padding: '2px 10px' }}>Not yet contacted</span>}
        {candidate.reachOutNote && <span style={{ fontSize: 11, color: '#706E6B', fontStyle: 'italic' }}>"{candidate.reachOutNote}"</span>}
        <button onClick={() => setOpen(!open)} style={{ fontSize: 11, background: 'rgba(1,118,211,0.1)', border: '1px solid rgba(1,118,211,0.25)', borderRadius: 8, color: '#0176D3', padding: '3px 10px', cursor: 'pointer', fontWeight: 600 }}>+ Log Contact</button>
      </div>
      {open && (
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <Field value={note} onChange={v => setNote(v)} placeholder="Note (LinkedIn, voicemail, WhatsApp…)" style={{ flex: 1 }} inputStyle={{ fontSize: 12, padding: '6px 10px' }} />
          <button onClick={markReached} disabled={busy} style={{ ...btnP, padding: '6px 14px', fontSize: 12, opacity: busy ? 0.6 : 1, whiteSpace: 'nowrap' }}>{busy ? '…' : '✓ Mark'}</button>
          <button onClick={() => setOpen(false)} style={{ ...btnG, padding: '6px 12px', fontSize: 12 }}>✕</button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SuperAdminCandidateImport({ user }) {
  const [tab, setTab]           = useState('import');
  const [file, setFile]         = useState(null);
  // ── rows/headers stored in refs — NOT React state — so 35k rows never trigger re-render
  const rowsRef                 = useRef([]);   // all raw rows
  const headersRef              = useRef([]);   // file headers
  const [rowCount, setRowCount] = useState(0);  // just the count for display
  const [preview, setPreview]   = useState([]);
  const [previewRaws, setPreviewRaws] = useState([]); // raw row arrays for table display
  const [detectedHeaders, setDetectedHeaders] = useState([]); // for preview table display
  const [parsing, setParsing]         = useState(false);
  const [importing, setImporting]     = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [result, setResult]           = useState(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [filePassword, setFilePassword]   = useState('');
  const [streamMode, setStreamMode]       = useState(false);
  const [liveStats, setLiveStats]         = useState(null);  // live import progress stats
  const pendingFileRef                = useRef(null);
  const workerRef                     = useRef(null);
  const [toast, setToast]       = useState('');
  const [candidates, setCandidates] = useState([]);
  const [candidateCount, setCandidateCount] = useState(null);
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState('');
  const [filterClient, setFilterClient]   = useState('');
  const [filterRole, setFilterRole]       = useState('');
  const [filterAssigned, setFilterAssigned] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [bulkRecruiter, setBulkRecruiter] = useState('');
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [bulkToast, setBulkToast] = useState('');
  // TA bulk operations
  const [filterTA, setFilterTA] = useState('');
  const [bulkTaName, setBulkTaName] = useState('');
  const [bulkTaing, setBulkTaing] = useState(false);
  // Rename-all TA tool
  const [renameFromTA, setRenameFromTA] = useState('');
  const [renameToTA, setRenameToTA] = useState('');
  const [renaming, setRenaming] = useState(false);
  const fileRef = useRef();

  const refreshCount = async () => {
    try { const r = await api.getUserCount('candidate'); setCandidateCount(r.count); } catch {}
  };

  // Fast count on mount — shows correct number without fetching full list
  useEffect(() => { refreshCount(); loadRecruiters(); }, []);

  useEffect(() => {
    if (tab === 'candidates') loadCandidates();
  }, [tab]);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers('candidate');
      const data = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setCandidates(data);
      setCandidateCount(data.length);
    } catch {}
    setLoading(false);
  };
  const load = loadCandidates;
  const loadRecruiters = async () => {
    try { const r = await api.getUsers('recruiter'); setRecruiters(Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : [])); } catch { setRecruiters([]); }
  };

  const bulkAssign = async () => {
    if (!bulkRecruiter || selected.size === 0) return;
    setBulkAssigning(true);
    let ok = 0, fail = 0;
    for (const id of selected) {
      try { await api.assignCandidate(id, bulkRecruiter); ok++; }
      catch { fail++; }
    }
    setBulkToast(`✅ Assigned ${ok} candidates${fail ? ` (${fail} failed)` : ''}`);
    setSelected(new Set());
    setBulkAssigning(false);
    load();
  };

  // ── File parsing — Web Worker with fallback to chunked main-thread ───────────
  const handleFileRead = (f, password = '') => {
    setFile(f); setResult(null); setPreview([]); setRowCount(0); setDetectedHeaders([]);
    setParsing(true); setNeedsPassword(false); setStreamMode(false);
    if (workerRef.current) { workerRef.current.terminate(); workerRef.current = null; }

    const isCSV = f.name.toLowerCase().endsWith('.csv');

    // ── Large CSV: read only first 512KB for preview, stream the rest during import ──
    if (isCSV && f.size > STREAM_THRESHOLD) {
      setStreamMode(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split(/\r?\n/).filter(l => l.trim());
          const hdrs = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          const previewRows = lines.slice(1, 11).map(l => parseCSVLine(l));
          headersRef.current = hdrs;
          setDetectedHeaders(hdrs);
          setPreviewRaws(previewRows);
          setPreview(previewRows.map(r => mapRow(r, hdrs)));
          // Estimate total rows from avg line length
          const avgLen = text.length / Math.max(lines.length, 1);
          const estimated = Math.max(1, Math.round((f.size - lines[0].length) / avgLen));
          setRowCount(estimated);
          setParsing(false);
          setToast(`✅ Preview ready — ~${estimated.toLocaleString()} rows estimated. Click Import to stream all rows.`);
        } catch (err) {
          setParsing(false); setFile(null);
          setToast(`❌ Could not read CSV: ${err.message}`);
        }
      };
      reader.readAsText(f.slice(0, 512 * 1024)); // read only first 512KB
      return;
    }

    // Called once we have parsed {headers, rows}
    const onParsed = (hdrs, dataRows) => {
      setParsing(false);
      if (!dataRows.length) {
        setFile(null);
        setToast('❌ No data rows found. Make sure the file has data below the header row and is not empty.');
        return;
      }
      // Store in refs — zero React overhead for 35k rows
      rowsRef.current    = dataRows;
      headersRef.current = hdrs;
      // Only store tiny derived data in state (triggers one small re-render)
      setRowCount(dataRows.length);
      setDetectedHeaders(hdrs);
      setPreviewRaws(dataRows.slice(0, 10));
      setPreview(dataRows.slice(0, 10).map(r => mapRow(r, hdrs)));
      setToast(`✅ Loaded ${dataRows.length.toLocaleString()} rows from ${f.name}`);
    };

    const onError = (msg) => {
      setParsing(false); setFile(null);
      if (msg.includes('password') || msg.includes('encrypted') || msg.includes('CFB') || msg.includes('ECMA-376')) {
        setToast('❌ Password-protected file. Remove the password (File → Info → Protect Workbook → Remove Password) or save as CSV.');
      } else {
        setToast(`❌ Could not read file: ${msg || 'Unknown error'}. Try saving as .xlsx or .csv.`);
      }
    };

    // Fallback: parse on main thread in small timeout slices (no Worker needed)
    const fallbackParse = (fileData) => {
      setTimeout(() => {
        try {
          const { headers: hdrs, rows: dataRows } = parseFile(
            isCSV ? fileData : new Uint8Array(fileData), isCSV
          );
          const nonEmpty = dataRows.filter(r => r.some(c => String(c || '').trim() !== ''));
          onParsed(hdrs, nonEmpty);
        } catch (e) { onError(e.message || ''); }
      }, 30);
    };

    // Try Web Worker first; fall back silently if not supported
    let workerFailed = false;
    try {
      const worker = new Worker(
        new URL('../../workers/xlsxWorker.js', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;

      worker.onmessage = ({ data }) => {
        worker.terminate(); workerRef.current = null;
        if (!data.ok) {
          if (data.needsPassword) {
            setParsing(false);
            setNeedsPassword(true);
            pendingFileRef.current = f;
            setToast('🔒 This file is password-protected. Enter the password below to unlock it.');
          } else {
            onError(data.error || '');
          }
          return;
        }
        onParsed(data.headers, data.rows);
      };
      worker.onerror = () => {
        worker.terminate(); workerRef.current = null;
        if (!workerFailed) { workerFailed = true; /* fallback triggered by reader below */ }
      };
    } catch {
      workerFailed = true;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (workerFailed || !workerRef.current) {
        fallbackParse(e.target.result);
        return;
      }
      if (isCSV) {
        workerRef.current.postMessage({ fileData: e.target.result, isCSV: true, password });
      } else {
        try {
          const buf = e.target.result;
          workerRef.current.postMessage({ fileData: buf, isCSV: false, password }, [buf]);
        } catch {
          fallbackParse(e.target.result);
        }
      }
    };
    reader.onerror = () => onError('FileReader failed to read the file.');
    if (isCSV) reader.readAsText(f);
    else reader.readAsArrayBuffer(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files[0] || e.target.files?.[0];
    if (f) handleFileRead(f);
  };

  // Shared counters (mutated across parallel batches)
  const importCountersRef = useRef({ created: 0, updated: 0, skipped: 0, errors: [] });

  const makeSendBatch = (hdrs) => async (rows) => {
    const mapped = rows.map(r => mapRow(r, hdrs));
    try {
      const r = await api.bulkImportCandidates(mapped);
      importCountersRef.current.created += r.created || 0;
      importCountersRef.current.updated += r.updated || 0;
      importCountersRef.current.skipped += r.skipped || 0;
      if (r.errors?.length) importCountersRef.current.errors.push(...r.errors.slice(0, 2));
    } catch (e) { importCountersRef.current.errors.push(e.message); }
    // Live stats update after every batch
    setLiveStats({ ...importCountersRef.current });
    setCandidateCount(prev => (prev || 0) + (rows.length));
  };

  // Run up to CONCURRENCY batches in parallel
  const runParallel = async (batches, sendBatch, CONCURRENCY = 5) => {
    const queue = [...batches];
    const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      while (queue.length) {
        const batch = queue.shift();
        if (batch) await sendBatch(batch);
      }
    });
    await Promise.all(workers);
  };

  // ── Stream import for large CSV (>50MB / 4GB) — parallel batches, zero memory ──
  const streamImportCSV = async () => {
    setImporting(true); setResult(null); setImportProgress(0); setLiveStats({ created:0, updated:0, skipped:0, errors:[] });
    importCountersRef.current = { created: 0, updated: 0, skipped: 0, errors: [] };
    const BATCH = 1000; const CONCURRENCY = 5;
    const hdrs = headersRef.current;
    const sendBatch = makeSendBatch(hdrs);
    let rowBuf = [], pendingBatches = [], leftover = '', bytesRead = 0;
    let isFirstLine = true;
    const decoder = new TextDecoder('utf-8');

    const flush = async (force = false) => {
      while (rowBuf.length >= BATCH || (force && rowBuf.length > 0)) {
        pendingBatches.push(rowBuf.splice(0, BATCH));
      }
      if (pendingBatches.length >= CONCURRENCY || force) {
        const toRun = pendingBatches.splice(0, pendingBatches.length);
        await runParallel(toRun, sendBatch, CONCURRENCY);
        setImportProgress(Math.min(99, Math.round((bytesRead / file.size) * 100)));
      }
    };

    try {
      const reader = file.stream().getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytesRead += value.byteLength;
        const text = leftover + decoder.decode(value, { stream: true });
        const lines = text.split(/\r?\n/);
        leftover = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          if (isFirstLine) { isFirstLine = false; continue; }
          rowBuf.push(parseCSVLine(line));
          if (rowBuf.length >= BATCH) await flush();
        }
      }
      if (leftover.trim()) rowBuf.push(parseCSVLine(leftover));
      await flush(true);
      const c = importCountersRef.current;
      setImportProgress(100); setLiveStats(null);
      setResult({ ...c });
      setToast(`✅ Done: ${c.created.toLocaleString()} created, ${c.updated.toLocaleString()} updated, ${c.skipped} skipped${c.errors.length ? `, ${c.errors.length} errors` : ''}`);
      refreshCount();
    } catch (e) { setToast(`❌ Stream error: ${e.message}`); }
    setImporting(false);
  };

  // ── Regular import (small/Excel files) — parallel batches + live stats ────────
  const doImport = async () => {
    if (streamMode) { await streamImportCSV(); return; }
    const allRows = rowsRef.current;
    const hdrs    = headersRef.current;
    if (!allRows.length) { setToast('❌ No rows to import.'); return; }
    setImporting(true); setResult(null); setImportProgress(0);
    setLiveStats({ created:0, updated:0, skipped:0, errors:[] });
    importCountersRef.current = { created: 0, updated: 0, skipped: 0, errors: [] };

    const BATCH = 1000; const CONCURRENCY = 5;
    const sendBatch = makeSendBatch(hdrs);
    const total = allRows.length;

    // Build all batch arrays upfront — raw rows only (makeSendBatch handles mapRow)
    const batches = [];
    for (let i = 0; i < total; i += BATCH)
      batches.push(allRows.slice(i, i + BATCH));

    // Run 5 batches at a time, update progress after each group
    const GROUP = CONCURRENCY;
    for (let g = 0; g < batches.length; g += GROUP) {
      await runParallel(batches.slice(g, g + GROUP), sendBatch, GROUP);
      setImportProgress(Math.min(99, Math.round(((g + GROUP) / batches.length) * 100)));
      await new Promise(r => setTimeout(r, 10));
    }

    const c = importCountersRef.current;
    setImportProgress(100); setLiveStats(null);
    setResult({ ...c });
    setToast(`✅ Done: ${c.created.toLocaleString()} created, ${c.updated.toLocaleString()} updated, ${c.skipped} skipped${c.errors.length ? `, ${c.errors.length} errors` : ''}`);
    rowsRef.current = [];
    refreshCount();
    setImporting(false);
  };

  // ── Download exact template ──────────────────────────────────────────────────
  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_COLS,
      // Source, TA, Date, Candidate Name, Mobile, Email ID, Overall Exp, Relevant Exp, Current Loc, Preferred Loc, Current Company, Client, Role, Skill, Certifications, Current CTC, Expected CTC, Client Spoc, Status, Additional Details, LinkedIn ID
      ['LinkedIn', 'Ravi Kumar', '2026-03-21', 'Priya Sharma', '+91 98765 43210', 'priya@example.com', '6', '4 years Java', 'Hyderabad', 'Hyderabad / Remote', 'TCS', 'Infosys', 'Java Developer', 'Java, Spring Boot, AWS', 'AWS Solutions Architect', '12 LPA', '18 LPA', 'Arun Mehta', 'Active', 'Available immediately', 'linkedin.com/in/priyasharma'],
      ['Naukri', 'Sneha Patel', '2026-03-20', 'Rahul Verma', '+91 99887 76655', 'rahul@example.com', '3', '2 years SQL/Python', 'Bangalore', 'Bangalore', 'Capgemini', 'Wipro', 'Data Analyst', 'Python, SQL, Power BI', '', '8 LPA', '12 LPA', 'Nisha Gupta', 'Screening', 'Notice period: 30 days', 'linkedin.com/in/rahulverma'],
      ['Referral', 'SAI', '2026-03-19', 'Jordan Lee', '+91 91122 33445', 'jordan@example.com', '5', '3 years DevOps', 'Pune', 'Any', 'HCL', 'TechM', 'DevOps Engineer', 'Kubernetes, Docker, Terraform', 'CKA', '15 LPA', '22 LPA', '', 'Shortlisted', '', 'linkedin.com/in/jordanlee'],
    ]);
    // Auto column widths
    ws['!cols'] = TEMPLATE_COLS.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Candidates');
    XLSX.writeFile(wb, 'TalentNest_Candidate_Template.xlsx');
  };

  // ── Filtered candidates ──────────────────────────────────────────────────────
  const filtered = candidates.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q || [c.name, c.email, c.phone, c.jobRole, c.title, c.currentCompany, c.client, c.ta, c.clientSpoc, c.source, c.skills, c.candidateStatus, c.linkedin]
      .some(v => v?.toLowerCase().includes(q));
    const matchClient   = !filterClient   || (c.client || '').toLowerCase().includes(filterClient.toLowerCase());
    const matchRole     = !filterRole     || (c.jobRole || c.title || '').toLowerCase().includes(filterRole.toLowerCase());
    const matchTA       = !filterTA       || (c.ta || '').toLowerCase().includes(filterTA.toLowerCase());
    const matchAssigned = filterAssigned === 'all'
      || (filterAssigned === 'assigned'   && c.assignedRecruiterId)
      || (filterAssigned === 'unassigned' && !c.assignedRecruiterId);
    return matchQ && matchClient && matchRole && matchTA && matchAssigned;
  });

  const updateCandidate = (updated) => {
    const u = updated.toJSON ? updated.toJSON() : updated;
    setCandidates(prev => prev.map(c => c.id === u.id ? { ...c, ...u } : c));
  };

  const bulkSetTA = async () => {
    if (!bulkTaName.trim() || selected.size === 0) return;
    setBulkTaing(true);
    try {
      const r = await api.bulkUpdateTA({ candidateIds: [...selected], ta: bulkTaName.trim() });
      setBulkToast(`✅ TA set to "${bulkTaName.trim()}" for ${r.updated} candidates`);
      setSelected(new Set()); setBulkTaName('');
      load();
    } catch(e) { setBulkToast('❌ ' + e.message); }
    setBulkTaing(false);
  };

  const renameTA = async () => {
    if (!renameToTA.trim()) return;
    setRenaming(true);
    try {
      const r = await api.bulkUpdateTA({ fromTa: renameFromTA.trim(), toTa: renameToTA.trim() });
      setToast(`✅ Renamed TA "${renameFromTA || '(empty)'}" → "${renameToTA}" for ${r.updated} candidates`);
      setRenameFromTA(''); setRenameToTA('');
      load();
    } catch(e) { setToast('❌ ' + e.message); }
    setRenaming(false);
  };

  // ── Unique filter options ────────────────────────────────────────────────────
  const uniqueClients = [...new Set(candidates.map(c => c.client).filter(Boolean))].sort();
  const uniqueRoles   = [...new Set(candidates.map(c => c.jobRole || c.title).filter(Boolean))].sort();
  const uniqueTAs     = [...new Set(candidates.map(c => c.ta).filter(Boolean))].sort();

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ marginBottom: 16, padding: '10px 16px', background: toast.startsWith('❌') ? 'rgba(186,5,23,0.15)' : 'rgba(34,197,94,0.12)', border: `1px solid ${toast.startsWith('❌') ? 'rgba(186,5,23,0.3)' : 'rgba(34,197,94,0.3)'}`, borderRadius: 10, color: toast.startsWith('❌') ? '#FE5C4C' : '#86efac', fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{toast}</span>
          <button onClick={() => setToast('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>✕</button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#181818', fontWeight: 800, fontSize: 22, margin: '0 0 4px' }}>Candidate Data Management</h1>
        <p style={{ color: '#706E6B', fontSize: 13, margin: 0 }}>Import 30,000+ candidates from Excel/CSV · Assign to recruiters · Track outreach</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#FFFFFF', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {[
          { id: 'import', label: '📥 Import from Excel' },
          { id: 'candidates', label: `👥 Candidate Database (${candidateCount !== null ? candidateCount.toLocaleString() : '…'})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ background: tab === t.id ? '#0176D3' : 'transparent', border: 'none', borderRadius: 10, color: tab === t.id ? '#fff' : '#706E6B', fontWeight: tab === t.id ? 700 : 500, padding: '8px 18px', cursor: 'pointer', fontSize: 13 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ────────────────── IMPORT TAB ────────────────── */}
      {tab === 'import' && (
        <>
          {/* Template info */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ color: '#181818', margin: '0 0 10px', fontSize: 15, fontWeight: 700 }}>📋 Template Columns (all {TEMPLATE_COLS.length} fields — none mandatory)</h3>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {TEMPLATE_COLS.map(col => (
                    <span key={col} style={{ background: 'rgba(1,118,211,0.08)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 20, padding: '3px 12px', fontSize: 11, color: '#706E6B' }}>{col}</span>
                  ))}
                </div>
                <p style={{ color: '#706E6B', fontSize: 11, margin: '10px 0 0' }}>
                  No field is required. You can import any partial template — only columns present in your file are updated. Existing records keep their data for columns not in your file. Empty TA defaults to <b>SAI</b>.
                </p>
              </div>
              <button onClick={downloadTemplate} style={{ ...btnG, padding: '9px 18px', fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
                ⬇ Download Template
              </button>
            </div>
          </div>

          {/* Drop zone */}
          <div
            style={{ ...card, borderStyle: 'dashed', borderColor: 'rgba(1,118,211,0.3)', cursor: 'pointer', textAlign: 'center', padding: '40px 24px', transition: 'border-color 0.2s' }}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor='rgba(1,118,211,0.7)'; }}
            onDragLeave={e => { e.currentTarget.style.borderColor='rgba(1,118,211,0.3)'; }}
            onDrop={e => { e.currentTarget.style.borderColor='rgba(1,118,211,0.3)'; onDrop(e); }}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={onDrop} />
            <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
            <div style={{ color: '#181818', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
              {file ? `✅ ${file.name}` : 'Drag & drop Excel or CSV here'}
            </div>
            <div style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
              {file
                ? parsing
                  ? '⏳ Reading file… page stays responsive'
                  : streamMode
                    ? `~${rowCount.toLocaleString()} rows estimated — will stream directly from disk`
                    : `${rowCount.toLocaleString()} rows ready to import`
                : 'Supports .xlsx  .xls  .csv  — any size including 4GB+'}
            </div>
            {!file && !needsPassword && (
              <button style={btnP} onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>Browse File</button>
            )}
            {/* Password prompt — shown when file is encrypted */}
            {needsPassword && (
              <div onClick={e => e.stopPropagation()} style={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{ color: '#F59E0B', fontWeight: 700, fontSize: 13 }}>🔒 File is password-protected</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="password"
                    value={filePassword}
                    onChange={e => setFilePassword(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && filePassword) handleFileRead(pendingFileRef.current, filePassword); }}
                    placeholder="Enter file password…"
                    autoFocus
                    style={{ maxWidth: 220, fontSize: 13, background: '#fff', width: '100%', padding: '9px 12px', border: '1px solid #DDDBDA', borderRadius: 8, outline: 'none' }}
                  />
                  <button
                    style={{ ...btnP, background: '#F59E0B', padding: '9px 18px' }}
                    onClick={() => { if (filePassword) handleFileRead(pendingFileRef.current, filePassword); }}
                  >
                    Unlock & Read
                  </button>
                  <button
                    style={{ ...btnG, padding: '9px 14px' }}
                    onClick={() => { setNeedsPassword(false); setFilePassword(''); setFile(null); pendingFileRef.current = null; }}
                  >
                    Cancel
                  </button>
                </div>
                <div style={{ color: '#94a3b8', fontSize: 11 }}>Password stays in your browser — never sent to our servers</div>
              </div>
            )}
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <h3 style={{ color: '#181818', margin: 0, fontSize: 14, fontWeight: 700 }}>
                  Preview <span style={{ color: '#706E6B', fontWeight: 400, fontSize: 12 }}>(first 10 of {rowCount.toLocaleString()} rows)</span>
                </h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setFile(null); rowsRef.current=[]; headersRef.current=[]; setRowCount(0); setDetectedHeaders([]); setPreview([]); setPreviewRaws([]); setResult(null); setLiveStats(null); if(fileRef.current) fileRef.current.value=''; }} style={{ ...btnG, padding: '7px 14px', fontSize: 12 }}>✕ Clear</button>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                    <button onClick={doImport} disabled={importing || parsing || rowCount === 0} style={{ ...btnP, padding: '7px 22px', fontSize: 12, opacity: (importing || parsing || rowCount === 0) ? 0.6 : 1 }}>
                      {importing ? `⏳ ${importProgress}% — Importing…` : `🚀 Import All ${rowCount.toLocaleString()} Rows`}
                    </button>
                    {importing && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                        <div style={{ width: 200, height: 6, background: 'rgba(1,118,211,0.15)', borderRadius: 10, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${importProgress}%`, background: '#0176D3', borderRadius: 10, transition: 'width 0.3s ease' }} />
                        </div>
                        {liveStats && (
                          <div style={{ display: 'flex', gap: 10, fontSize: 11, fontWeight: 600 }}>
                            <span style={{ color: '#34d399' }}>✅ {(liveStats.created||0).toLocaleString()} created</span>
                            <span style={{ color: '#0176D3' }}>🔄 {(liveStats.updated||0).toLocaleString()} updated</span>
                            {liveStats.skipped > 0 && <span style={{ color: '#706E6B' }}>⏩ {liveStats.skipped} skipped</span>}
                            {liveStats.errors?.length > 0 && <span style={{ color: '#FE5C4C' }}>⚠ {liveStats.errors.length} errors</span>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Show actual file headers detected */}
              <div style={{ marginBottom: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ color: '#706E6B', fontSize: 11, fontWeight: 600 }}>Columns detected:</span>
                {detectedHeaders.map(h => (
                  <span key={h} style={{ background: 'rgba(1,118,211,0.08)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 20, padding: '2px 10px', fontSize: 10, color: '#0176D3' }}>{h}</span>
                ))}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(1,118,211,0.2)' }}>
                      {detectedHeaders.map(h => (
                        <th key={h} style={{ padding: '7px 10px', color: '#0176D3', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap', fontSize: 10, letterSpacing: '0.4px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRaws.slice(0, 10).map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F3F2F2', background: i % 2 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                        {detectedHeaders.map((h, j) => {
                          const v = Array.isArray(row) ? String(row[j] ?? '') : String(row[h] ?? '');
                          return <td key={j} style={{ padding: '7px 10px', color: v ? '#181818' : '#DDDBDA', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v || '—'}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div style={{ ...card, borderColor: 'rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.04)' }}>
              <h3 style={{ color: '#34d399', margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>✅ Import Complete</h3>
              <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                {[
                  { v: result.created, label: 'New Candidates', color: '#34d399' },
                  { v: result.updated, label: 'Updated (existing)', color: '#0176D3' },
                  { v: result.skipped, label: 'Skipped (no email)', color: '#706E6B' },
                  ...(result.errors?.length ? [{ v: result.errors.length, label: 'Errors', color: '#BA0517' }] : []),
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: s.color }}>{(s.v||0).toLocaleString()}</div>
                    <div style={{ color: '#706E6B', fontSize: 12, marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {result.errors?.length > 0 && (
                <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(186,5,23,0.08)', borderRadius: 8, maxHeight: 120, overflowY: 'auto' }}>
                  <div style={{ color: '#FE5C4C', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Errors (first 20):</div>
                  {result.errors.slice(0, 20).map((e, i) => <div key={i} style={{ color: '#fca5a5', fontSize: 11 }}>{e}</div>)}
                </div>
              )}
              <button onClick={() => { setTab('candidates'); loadCandidates(); }} style={{ ...btnP, marginTop: 16, fontSize: 13 }}>
                👥 View Candidate Database →
              </button>
            </div>
          )}
        </>
      )}

      {/* ────────────────── CANDIDATES TAB ────────────────── */}
      {tab === 'candidates' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <Field value={search} onChange={v => setSearch(v)} placeholder="Search name, email, role, company…" style={{ maxWidth: 260 }} />
            <Field value={filterClient} onChange={v => setFilterClient(v)} placeholder="Filter by Client" style={{ maxWidth: 160 }} />
            <datalist id="cl-list">{uniqueClients.map(c => <option key={c} value={c} />)}</datalist>
            <Field value={filterRole} onChange={v => setFilterRole(v)} placeholder="Filter by Role" style={{ maxWidth: 160 }} />
            <datalist id="rl-list">{uniqueRoles.map(r => <option key={r} value={r} />)}</datalist>
            <Field value={filterTA} onChange={v => setFilterTA(v)} placeholder="Filter by TA" style={{ maxWidth: 150 }} />
            <datalist id="ta-list">{uniqueTAs.map(t => <option key={t} value={t} />)}</datalist>
            <Field value={filterAssigned} onChange={v => setFilterAssigned(v)} style={{ maxWidth: 160 }}
              options={[{value:'all',label:'All assignments'},{value:'assigned',label:'Assigned'},{value:'unassigned',label:'Unassigned'}]} />
            <span style={{ color: '#706E6B', fontSize: 13, whiteSpace: 'nowrap' }}>{filtered.length.toLocaleString()} candidates</span>
            <button onClick={loadCandidates} style={{ ...btnG, padding: '8px 14px', fontSize: 12 }}>↻ Refresh</button>
          </div>

          {/* ── Rename-all TA tool ── */}
          <div style={{ ...card, padding: '14px 20px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.04)' }}>
            <span style={{ color: '#F59E0B', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>✏️ Rename TA (bulk):</span>
            <Field
              value={renameFromTA} onChange={v => setRenameFromTA(v)}
              placeholder="Current TA name (leave blank = empty TAs)"
              style={{ maxWidth: 220 }} inputStyle={{ fontSize: 12 }}
            />
            <datalist id="ta-rename-list">{uniqueTAs.map(t => <option key={t} value={t} />)}</datalist>
            <span style={{ color: '#706E6B', fontSize: 13 }}>→</span>
            <Field
              value={renameToTA} onChange={v => setRenameToTA(v)}
              placeholder="New TA name"
              style={{ maxWidth: 200 }} inputStyle={{ fontSize: 12 }}
            />
            <button
              onClick={renameTA}
              disabled={renaming || !renameToTA.trim()}
              style={{ ...btnP, background: '#F59E0B', padding: '7px 16px', fontSize: 12, opacity: (renaming || !renameToTA.trim()) ? 0.6 : 1 }}
            >
              {renaming ? 'Renaming…' : 'Rename All'}
            </button>
            <span style={{ color: '#706E6B', fontSize: 11 }}>Updates every candidate matching that TA name</span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 56, color: '#706E6B' }}>
              <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</div>
              <div>Loading candidates…</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: 56 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
              <div style={{ color: '#706E6B', fontSize: 15, fontWeight: 600 }}>No candidates found</div>
              <div style={{ color: '#C9C7C5', fontSize: 12, marginTop: 6 }}>Import your Excel data to get started</div>
              <button onClick={() => setTab('import')} style={{ ...btnP, marginTop: 16, fontSize: 13 }}>📥 Import Excel</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={e => setSelected(e.target.checked ? new Set(filtered.map(c => c.id)) : new Set())}
                  style={{ accentColor: '#0176D3', cursor: 'pointer' }} />
                <span style={{ color: '#706E6B', fontSize: 12 }}>Select All ({filtered.length})</span>
                {selected.size > 0 && <span style={{ color: '#0176D3', fontSize: 12, fontWeight: 700 }}>{selected.size} selected</span>}
              </div>
              {filtered.map(c => (
                <div key={c.id} style={{ ...card, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    {/* Checkbox */}
                    <input type="checkbox" checked={selected.has(c.id)} onChange={e => { const s = new Set(selected); e.target.checked ? s.add(c.id) : s.delete(c.id); setSelected(s); }} style={{ accentColor: '#0176D3', cursor: 'pointer', marginTop: 12 }} />
                    {/* Avatar */}
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#0176D3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#181818', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                      {(c.name || '?')[0].toUpperCase()}
                    </div>
                    {/* Main info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Row 1: name + role + exp */}
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ color: '#181818', fontWeight: 700, fontSize: 14 }}>{c.name}</span>
                        {(c.jobRole || c.title) && <span style={{ color: '#0176D3', fontSize: 12, background: 'rgba(1,118,211,0.1)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 20, padding: '1px 10px' }}>{c.jobRole || c.title}</span>}
                        {c.experience > 0 && <span style={{ color: '#706E6B', fontSize: 12 }}>{c.experience}y exp{c.relevantExperience ? ` · ${c.relevantExperience} relevant` : ''}</span>}
                        {c.currentCTC && <span style={{ color: '#34d399', fontSize: 11, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 20, padding: '1px 8px' }}>CTC: {c.currentCTC}</span>}
                        {c.expectedCTC && <span style={{ color: '#F59E0B', fontSize: 11, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 20, padding: '1px 8px' }}>Exp: {c.expectedCTC}</span>}
                      </div>
                      {/* Row 2: contact + location */}
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: '#706E6B', marginBottom: 4 }}>
                        {c.email && !c.email.includes('@placeholder.tn') && <span>✉️ {c.email}</span>}
                        {c.phone && <span>📞 {c.phone}</span>}
                        {c.location && <span>📍 {c.location}{c.preferredLocation ? ` → pref: ${c.preferredLocation}` : ''}</span>}
                        {c.currentCompany && <span>🏢 {c.currentCompany}</span>}
                      </div>
                      {/* Row 3: client + TA + SPOC */}
                      {(c.client || c.ta || c.clientSpoc) && (
                        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: '#706E6B', marginBottom: 4 }}>
                          {c.client && <span style={{ color: '#a78bfa' }}>🏛 Client: <b style={{ color: '#c4b5fd' }}>{c.client}</b></span>}
                          {c.ta    && <span>👤 TA: {c.ta}</span>}
                          {c.clientSpoc && <span>🤝 SPOC: {c.clientSpoc}</span>}
                        </div>
                      )}
                      {/* Row 4: certifications */}
                      {c.certifications && (
                        <div style={{ fontSize: 11, color: '#706E6B', marginBottom: 4 }}>🏅 {c.certifications}</div>
                      )}
                      {/* Assign recruiter (super admin only) */}
                      <AssignDropdown candidate={c} recruiters={recruiters} onAssigned={updateCandidate} />
                      {/* Contact logger */}
                      <ContactLogger candidate={c} onUpdate={updateCandidate} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selected.size > 0 && (
            <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#F3F2F2', border: '1px solid rgba(1,118,211,0.4)', borderRadius: 14, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12, zIndex: 1000, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', flexWrap: 'wrap', maxWidth: '90vw' }}>
              <span style={{ color: '#0176D3', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>{selected.size} selected</span>

              {/* Assign recruiter */}
              <select value={bulkRecruiter} onChange={e => setBulkRecruiter(e.target.value)}
                style={{ padding: '8px 12px', background: '#FAFAF9', border: '1px solid rgba(1,118,211,0.3)', borderRadius: 8, color: '#181818', fontSize: 12 }}>
                <option value="">Assign recruiter…</option>
                {recruiters.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <button onClick={bulkAssign} disabled={!bulkRecruiter || bulkAssigning}
                style={{ background: '#0176D3', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, padding: '8px 16px', cursor: 'pointer', fontSize: 12, opacity: (!bulkRecruiter || bulkAssigning) ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                {bulkAssigning ? 'Assigning…' : 'Assign →'}
              </button>

              {/* Divider */}
              <span style={{ color: '#DDDBDA', fontSize: 20 }}>|</span>

              {/* Set TA */}
              <input
                value={bulkTaName} onChange={e => setBulkTaName(e.target.value)}
                placeholder="Set TA name…"
                style={{ padding: '8px 12px', background: '#FAFAF9', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 8, color: '#181818', fontSize: 12, width: 160, outline: 'none' }}
                list="bulk-ta-list"
              />
              <datalist id="bulk-ta-list">{uniqueTAs.map(t => <option key={t} value={t} />)}</datalist>
              <button onClick={bulkSetTA} disabled={!bulkTaName.trim() || bulkTaing}
                style={{ background: '#F59E0B', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, padding: '8px 16px', cursor: 'pointer', fontSize: 12, opacity: (!bulkTaName.trim() || bulkTaing) ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                {bulkTaing ? 'Setting…' : 'Set TA →'}
              </button>

              <button onClick={() => { setSelected(new Set()); setBulkToast(''); }} style={{ background: 'none', border: 'none', color: '#9E9D9B', cursor: 'pointer', fontSize: 18 }}>✕</button>
              {bulkToast && <span style={{ color: '#34d399', fontSize: 13, fontWeight: 600 }}>{bulkToast}</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
