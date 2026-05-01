'use strict';
/**
 * generateInvoice — Generate a GST-compliant PDF invoice and upload to Cloudinary.
 * Returns { invoiceNumber, invoicePdfUrl }
 *
 * NOTE: pdfkit and cloudinary are listed in backend/package.json.
 */
const PDFDocument = require('pdfkit');
const cloudinary  = require('cloudinary').v2;

// Configure Cloudinary from env vars (never hardcoded)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key   : process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const { GST_PERCENTAGE, BASE_STATE } = require('../config/financials');

/**
 * @param {object} tenant  - Tenant document (mongoose or plain object)
 * @param {object} payment - Payment details: { planName, amountINR, razorpayPaymentId, razorpayOrderId? }
 * @returns {Promise<{ invoiceNumber: string, invoicePdfUrl: string }>}
 */
async function generateInvoice(tenant, payment) {
  // ── 1. Build Invoice Number (uses invoiceSequence already incremented on tenant) ──
  const year        = new Date().getFullYear();
  const sequence    = (tenant.invoiceSequence || 1).toString().padStart(4, '0');
  const invoiceNumber = `TNH-${year}-${sequence}`;

  // ── 2. GST Calculation (inclusive in price) ───────────────────────────────
  const amountINR    = payment.amountINR;
  const tenantState  = (tenant.billingState || '').trim().toLowerCase();
  const companyState = BASE_STATE;
  const isInterState = tenantState !== '' && tenantState !== companyState;

  const gstDivisor = 1 + (GST_PERCENTAGE / 100);
  const baseAmount = Math.round((amountINR / gstDivisor) * 100) / 100;
  const gstAmount  = Math.round((amountINR - baseAmount) * 100) / 100;
  let cgst = 0, sgst = 0, igst = 0;
  if (isInterState) {
    igst = gstAmount;
  } else {
    cgst = Math.round((gstAmount / 2) * 100) / 100;
    sgst = Math.round((gstAmount / 2) * 100) / 100;
  }

  // ── 3. Build PDF Buffer ───────────────────────────────────────────────────────
  const pdfBuffer = await buildPdf({
    invoiceNumber, tenant, payment, amountINR, baseAmount,
    cgst, sgst, igst, gstAmount, isInterState,
  });

  // ── 4. Upload to Cloudinary ───────────────────────────────────────────────────
  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'invoices', public_id: invoiceNumber, resource_type: 'raw', format: 'pdf' },
      (err, result) => err ? reject(err) : resolve(result)
    );
    stream.end(pdfBuffer);
  });

  return {
    invoiceNumber,
    invoicePdfUrl: uploadResult.secure_url,
    cgst, sgst, igst, gstAmount, isInterState, baseAmount,
  };
}

/**
 * Builds the PDF buffer and returns it as a Promise<Buffer>.
 */
function buildPdf({ invoiceNumber, tenant, payment, amountINR, baseAmount, cgst, sgst, igst, isInterState }) {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W            = 495; // usable width
    const primaryColor = '#0d2150';
    const invoiceDate  = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // ── Header block ─────────────────────────────────────────────────────────
    doc.rect(50, 45, W, 60).fill(primaryColor);
    doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
       .text('TalentNest HR', 60, 58);
    doc.fontSize(9).font('Helvetica')
       .text(process.env.TALENTNEST_ADDRESS || 'Hyderabad, Telangana, India', 60, 83)
       .text(`GSTIN: ${process.env.TALENTNEST_GSTIN || 'N/A'}`, 60, 95);

    doc.fillColor(primaryColor).fontSize(18).font('Helvetica-Bold')
       .text('TAX INVOICE', 50, 120, { align: 'right', width: W });

    // ── Invoice meta ─────────────────────────────────────────────────────────
    doc.fillColor('#333').fontSize(10).font('Helvetica')
       .text(`Invoice No: ${invoiceNumber}`, 50, 145)
       .text(`Date: ${invoiceDate}`, 50, 160)
       .text('HSN Code: 998314', 50, 175);

    // ── Customer details ──────────────────────────────────────────────────────
    doc.fontSize(11).font('Helvetica-Bold').text('Bill To:', 50, 205);
    doc.fontSize(10).font('Helvetica')
       .text(tenant.name || 'Customer', 50, 220)
       .text(tenant.billingAddress || 'Address not provided', 50, 235)
       .text(tenant.billingState ? `State: ${tenant.billingState}` : '', 50, 250);
    if (tenant.gstinNumber) {
      doc.text(`GSTIN: ${tenant.gstinNumber}`, 50, 265);
    }

    // ── Line items table ─────────────────────────────────────────────────────
    const tableTop = 295;
    doc.rect(50, tableTop, W, 20).fill('#f0f4ff');
    doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold')
       .text('Description', 55, tableTop + 5)
       .text('Period', 250, tableTop + 5)
       .text('Amount (INR)', 380, tableTop + 5);

    const planLabel = `ATS Software Subscription — ${
      payment.planName.charAt(0).toUpperCase() + payment.planName.slice(1)
    } Plan`;
    doc.fillColor('#333').font('Helvetica').fontSize(10)
       .text(planLabel, 55, tableTop + 28)
       .text('Annual', 250, tableTop + 28)
       .text(baseAmount.toFixed(2), 380, tableTop + 28);

    // ── Subtotal / tax / total ────────────────────────────────────────────────
    const taxTop = tableTop + 70;
    doc.font('Helvetica').fontSize(10)
       .text('Subtotal (excl. GST):', 300, taxTop)
       .text(`Rs.${baseAmount.toFixed(2)}`, 430, taxTop);
    if (isInterState) {
      doc.text('IGST @ 18%:', 300, taxTop + 18)
         .text(`Rs.${igst.toFixed(2)}`, 430, taxTop + 18);
    } else {
      doc.text('CGST @ 9%:', 300, taxTop + 18)
         .text(`Rs.${cgst.toFixed(2)}`, 430, taxTop + 18);
      doc.text('SGST @ 9%:', 300, taxTop + 36)
         .text(`Rs.${sgst.toFixed(2)}`, 430, taxTop + 36);
    }
    const totalTop = taxTop + (isInterState ? 36 : 54);
    doc.rect(295, totalTop, W - 245, 22).fill(primaryColor);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(11)
       .text('Total:', 300, totalTop + 5)
       .text(`Rs.${amountINR.toFixed(2)}`, 430, totalTop + 5);

    // ── Payment reference ─────────────────────────────────────────────────────
    doc.fillColor('#333').font('Helvetica').fontSize(9)
       .text(`Payment Reference: ${payment.razorpayPaymentId || 'N/A'}`, 50, totalTop + 40)
       .text(`Order ID: ${payment.razorpayOrderId || 'N/A'}`, 50, totalTop + 55);

    // ── Authorized signatory ──────────────────────────────────────────────────
    doc.fontSize(10).font('Helvetica-Bold')
       .text('For TalentNest HR', 350, totalTop + 80);
    doc.font('Helvetica').fontSize(9)
       .text('Authorized Signatory', 350, totalTop + 95)
       .text(process.env.TALENTNEST_SIGNATORY || 'Director', 350, totalTop + 108);

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.fontSize(8).fillColor('#888')
       .text('This is a computer-generated invoice. No physical signature required.', 50, 770, { align: 'center', width: W });

    doc.end();
  });
}

module.exports = generateInvoice;
