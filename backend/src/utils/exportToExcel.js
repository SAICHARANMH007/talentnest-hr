'use strict';
const ExcelJS = require('exceljs');

/**
 * Export data to an Excel (.xlsx) buffer using ExcelJS.
 *
 * @param {string} sheetTitle
 * @param {Array<{header: string, key: string, width?: number}>} columns
 * @param {Array<object>} rows
 * @returns {Promise<Buffer>}
 */
async function exportToExcel(sheetTitle, columns, rows) {
  const workbook  = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetTitle.slice(0, 31));

  worksheet.columns = columns.map(c => ({
    header : c.header,
    key    : c.key,
    width  : c.width || 20,
  }));

  worksheet.addRows(rows.map(row => {
    const obj = {};
    columns.forEach(c => { obj[c.key] = row[c.key] ?? ''; });
    return obj;
  }));

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

module.exports = { exportToExcel };
