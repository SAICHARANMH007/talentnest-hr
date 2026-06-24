// Web Worker — parses Excel/CSV off the main thread so the UI never freezes
import readXlsxFile from 'read-excel-file/web-worker';

self.onmessage = async ({ data: { fileData, isCSV } }) => {
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
      const blob = new Blob([fileData]);
      const raw  = await readXlsxFile(blob);
      headers = (raw[0] || []).map(h => String(h ?? ''));
      rows    = raw.slice(1).map(r => r.map(c => c ?? ''));
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
