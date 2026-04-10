// Web Worker — parses Excel/CSV off the main thread so the UI never freezes
import * as XLSX from 'xlsx';

self.onmessage = ({ data: { fileData, isCSV, password } }) => {
  try {
    let headers, rows;

    if (isCSV) {
      const lines = fileData.trim().split(/\r?\n/);
      headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      rows = lines.slice(1).map(l => {
        const cols = []; let cur = ''; let inQ = false;
        for (const ch of l) {
          if (ch === '"') { inQ = !inQ; continue; }
          if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
          cur += ch;
        }
        cols.push(cur.trim());
        return cols;
      });
    } else {
      const opts = {
        type:        'array',
        cellFormula: false,
        cellHTML:    false,
        cellNF:      false,
        cellStyles:  false,
        cellDates:   false,
        sheetStubs:  false,
      };
      // If password provided, pass it — XLSX handles ECMA-376/AES encrypted files
      if (password) opts.password = password;

      const wb  = XLSX.read(new Uint8Array(fileData), opts);
      const ws  = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      headers   = raw[0]?.map(h => String(h || '')) || [];
      rows      = raw.slice(1);
    }

    const nonEmpty = rows.filter(r => r.some(c => String(c || '').trim() !== ''));
    self.postMessage({ ok: true, headers, rows: nonEmpty });

  } catch (err) {
    const msg = err.message || '';
    const isEncrypted = msg.includes('password') || msg.includes('encrypted') ||
                        msg.includes('CFB') || msg.includes('ECMA-376') ||
                        msg.includes('File is password-protected');
    self.postMessage({ ok: false, error: msg, needsPassword: isEncrypted });
  }
};
