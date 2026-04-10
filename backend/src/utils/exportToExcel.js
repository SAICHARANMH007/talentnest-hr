'use strict';
const XLSX = require('xlsx');

/**
 * Export data to an Excel (.xlsx) buffer using the xlsx package.
 *
 * @param {string} sheetTitle
 * @param {Array<{header: string, key: string, width?: number}>} columns
 * @param {Array<object>} rows
 * @returns {Buffer}
 */
function exportToExcel(sheetTitle, columns, rows) {
  // Build header row
  const headerRow = columns.map(c => c.header);

  // Build data rows
  const dataRows = rows.map(row => columns.map(c => row[c.key] ?? ''));

  // Combine header + data
  const sheetData = [headerRow, ...dataRows];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths
  ws['!cols'] = columns.map(c => ({ wch: c.width || 20 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetTitle.slice(0, 31)); // Excel sheet name max 31 chars

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { exportToExcel };
