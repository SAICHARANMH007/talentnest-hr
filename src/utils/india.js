/**
 * India-first formatting utilities for TalentNest HR
 */

// ── Salary / CTC ──────────────────────────────────────────────────────────────

/**
 * Format a numeric salary as CTC (LPA) if >= 1 lakh, else as ₹ amount.
 * Examples: 2500000 → "25 LPA"  |  800000 → "8 LPA"  |  50000 → "₹50,000"
 */
export function fmtCTC(amount) {
  if (!amount && amount !== 0) return '—';
  const n = Number(amount);
  if (isNaN(n)) return '—';
  if (n >= 100000) {
    const lpa = n / 100000;
    return `${lpa % 1 === 0 ? lpa : lpa.toFixed(1)} LPA`;
  }
  return `₹${n.toLocaleString('en-IN')}`;
}

/**
 * Format a salary range as CTC strings.
 * fmtCTCRange(800000, 1200000) → "8–12 LPA"
 */
export function fmtCTCRange(min, max) {
  if (!min && !max) return '—';
  if (!max) return fmtCTC(min);
  if (!min) return `Up to ${fmtCTC(max)}`;
  const minN = Number(min);
  const maxN = Number(max);
  if (minN >= 100000 && maxN >= 100000) {
    const minLpa = minN / 100000;
    const maxLpa = maxN / 100000;
    const fmt = v => (v % 1 === 0 ? v : v.toFixed(1));
    return `${fmt(minLpa)}–${fmt(maxLpa)} LPA`;
  }
  return `${fmtCTC(minN)} – ${fmtCTC(maxN)}`;
}

// ── Date formatting ───────────────────────────────────────────────────────────

/**
 * Format a date as DD/MM/YYYY (Indian standard).
 * fmtDate('2024-06-15') → "15/06/2024"
 */
export function fmtDate(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  if (isNaN(d)) return '—';
  const day   = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year  = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format a date as DD MMM YYYY (e.g. "15 Jun 2024").
 */
export function fmtDateShort(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Format a datetime with day and time.
 * "Mon, 15 Jun · 10:30 AM"
 */
export function fmtDateTime(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  if (isNaN(d)) return '—';
  return d.toLocaleString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

// ── Notice period ─────────────────────────────────────────────────────────────

export const NOTICE_PERIOD_OPTIONS = [
  { value: 0,  label: 'Immediate / Serving Notice' },
  { value: 15, label: '15 Days' },
  { value: 30, label: '30 Days (1 Month)' },
  { value: 45, label: '45 Days (1.5 Months)' },
  { value: 60, label: '60 Days (2 Months)' },
  { value: 90, label: '90 Days (3 Months)' },
];

export function fmtNoticePeriod(days) {
  if (days === null || days === undefined) return '—';
  const n = Number(days);
  if (n === 0) return 'Immediate';
  const opt = NOTICE_PERIOD_OPTIONS.find(o => o.value === n);
  return opt ? opt.label : `${n} Days`;
}

// ── Interview / HR rounds (Indian standard) ───────────────────────────────────

export const INTERVIEW_ROUND_OPTIONS = [
  'HR Screening',
  'Technical Round 1',
  'Technical Round 2',
  'Coding Test',
  'System Design',
  'Managerial Round',
  'Director / VP Round',
  'Client Round',
  'HR Final Round',
  'Offer Discussion',
];

// ── Pipeline stage names (Indian HR standard) ─────────────────────────────────

export const INDIA_PIPELINE_STAGES = [
  'Applied',
  'HR Screening',
  'Technical Round 1',
  'Technical Round 2',
  'Managerial Round',
  'Client Round',
  'Offer',
  'Hired',
  'Rejected',
];
