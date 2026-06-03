import React, { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { card } from '../../constants/styles.js';

// Parse CTC string like "8,00,000", "₹8L", "12 LPA", "1200000" into a number
function parseCtcString(str) {
  if (!str) return 0;
  const cleaned = String(str).replace(/[₹$,\s]/gi, '').toLowerCase();
  const lMatch = cleaned.match(/^([\d.]+)\s*l/);
  if (lMatch) return Math.round(parseFloat(lMatch[1]) * 100000);
  const kMatch = cleaned.match(/^([\d.]+)\s*k/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num);
}

function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d.getTime())) return str; // return as-is if unparseable
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Flatten templateData fields into a top-level shape the comparison table understands
function normalizeOffer(raw) {
  const d = raw.templateData || {};
  const ctcNum = parseCtcString(d.ctc || raw.ctc || raw.totalCtc || raw.salary || '');
  return {
    _id        : raw._id || raw.id,
    jobTitle   : d.designation || raw.jobTitle || raw.role || '—',
    company    : d.companyName || raw.company || raw.companyName || '—',
    ctc        : ctcNum,
    ctcRaw     : d.ctc || raw.ctc || '',
    location   : raw.location || '—',
    joiningDate: d.joiningDate || raw.joiningDate || null,
    sentAt     : raw.sentAt || null,
    status     : raw.status || '—',
    _fromApp   : raw._fromApp || false,
  };
}

const fmtSalary = (offer) => {
  const ctc = offer.ctc;
  if (!ctc) return offer.ctcRaw || '—';
  if (ctc >= 100000) return `₹${(ctc / 100000).toFixed(1)}L`;
  return `₹${(ctc / 1000).toFixed(0)}K`;
};

const ROW_LABELS = [
  { key: 'job',         label: 'Job Title',   fn: o => o.jobTitle || '—' },
  { key: 'company',     label: 'Company',     fn: o => o.company || '—' },
  { key: 'ctc',         label: 'Total CTC',   fn: o => fmtSalary(o) },
  { key: 'location',    label: 'Location',    fn: o => o.location || '—' },
  { key: 'joiningDate', label: 'Joining Date',fn: o => fmtDate(o.joiningDate) },
  { key: 'sentAt',      label: 'Offer Date',  fn: o => fmtDate(o.sentAt) },
  { key: 'status',      label: 'Status',      fn: o => {
    const s = o.status;
    return s === 'signed' ? '✅ Signed' : s === 'sent' ? '📨 Offer Sent' : s === 'Hired' ? '🏆 Hired' : s || '—';
  }},
];

function ScoreBar({ value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ height: 6, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s' }} />
      </div>
    </div>
  );
}

// Convert an application record into an offer-shaped object for comparison
function appToOffer(app) {
  const job = app.jobId && typeof app.jobId === 'object' ? app.jobId : {};
  const stage = app.stage || app.currentStage || '';
  return {
    _id      : `app_${app._id || app.id}`,
    jobTitle : job.title || app.jobTitle || 'Job',
    company  : job.companyName || job.company || app.company || '—',
    location : job.location || '—',
    status   : stage === 'selected' ? 'Hired' : 'Offer Extended',
    ctc      : parseCtcString(app.offeredCTC || app.salary || ''),
    ctcRaw   : app.offeredCTC || app.salary || '',
    joiningDate: app.joiningDate || null,
    sentAt   : app.updatedAt || null,
    _fromApp : true,
  };
}

export default function OfferComparison({ user }) {
  const [offers, setOffers]     = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.getMyOffers(),
      api.getMyApplications(),
    ]).then(([offerRes, appRes]) => {
      // Formal offer letters — normalize templateData fields to top-level
      const formalOffers = (() => {
        const r = offerRes.status === 'fulfilled' ? offerRes.value : [];
        const list = Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : []);
        return list.filter(o => o.status !== 'draft').map(normalizeOffer);
      })();

      // Applications in offer/hired stage → treat as offers if no formal offer exists
      const apps = (() => {
        const r = appRes.status === 'fulfilled' ? appRes.value : [];
        return Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : []);
      })();

      const formalJobIds = new Set(formalOffers.map(o => String(o.jobId || o.job || '')).filter(Boolean));
      const appOffers = apps
        .filter(a => {
          const stage = a.stage || a.currentStage || '';
          return (stage === 'offer_extended' || stage === 'selected') &&
            !formalJobIds.has(String(a.jobId?._id || a.jobId || a.job || ''));
        })
        .map(appToOffer);

      setOffers([...formalOffers, ...appOffers]);
      setLoading(false);
    });
  }, []);

  const toggle = (id) => {
    setSelected(s =>
      s.includes(id) ? s.filter(x => x !== id) : s.length < 3 ? [...s, id] : s
    );
  };

  const compared = offers.filter(o => selected.includes(String(o._id || o.id)));

  const maxCtc = compared.reduce((m, o) => Math.max(m, o.ctc || 0), 0);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Loading offers…</div>;

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A1628', margin: 0 }}>Offer Comparison</h1>
        <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>Compare up to 3 offers side-by-side</p>
      </div>

      {offers.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 56 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
          <div style={{ fontWeight: 700, color: '#374151', marginBottom: 6 }}>No offers yet</div>
          <div style={{ color: '#9CA3AF', fontSize: 13 }}>Offers will appear here when recruiters extend an offer or mark you as hired</div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#374151', margin: '0 0 12px' }}>Select Offers to Compare</h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {offers.map(o => {
                const id  = String(o._id || o.id);
                const sel = selected.includes(id);
                const statusColor = (o.status === 'Hired' || o.status === '🏆 Hired') ? '#2E844A' : '#0176D3';
                const ctcDisplay = fmtSalary(o);
                return (
                  <button key={id} onClick={() => toggle(id)} style={{
                    border: sel ? '2px solid #4F46E5' : '1px solid #E2E8F0',
                    borderRadius: 12, padding: '10px 16px', background: sel ? '#EEF2FF' : '#fff',
                    cursor: 'pointer', textAlign: 'left', minWidth: 180,
                    boxShadow: sel ? '0 0 0 3px rgba(79,70,229,0.15)' : 'none',
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0A1628', marginBottom: 2 }}>{o.jobTitle || 'Offer'}</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>{o.company || 'Company'}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: statusColor, marginTop: 3 }}>
                      {o.status === 'Hired' ? '🏆 Hired' : o.status === 'signed' ? '✅ Signed' : '🎉 Offer Sent'}
                    </div>
                    {ctcDisplay !== '—' && <div style={{ fontSize: 12, fontWeight: 700, color: '#4F46E5', marginTop: 2 }}>{ctcDisplay}</div>}
                    <div style={{ fontSize: 11, color: sel ? '#6366F1' : '#9CA3AF', marginTop: 4 }}>
                      {sel ? '✓ Selected' : (selected.length >= 3 ? 'Max 3 reached' : 'Click to select')}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {compared.length >= 2 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '14px 16px', background: '#F8FAFC', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#374151', borderBottom: '1px solid #E2E8F0', width: 140 }}>Detail</th>
                    {compared.map((o, i) => (
                      <th key={i} style={{ padding: '14px 16px', background: '#F8FAFC', textAlign: 'center', borderBottom: '1px solid #E2E8F0', minWidth: 180 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#0A1628' }}>{o.jobTitle || o.role || `Offer ${i + 1}`}</div>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>{o.company || o.companyName || ''}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROW_LABELS.map((row, ri) => (
                    <tr key={row.key} style={{ background: ri % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#374151', borderBottom: '1px solid #F1F5F9' }}>{row.label}</td>
                      {compared.map((o, ci) => {
                        const val = row.fn(o);
                        const isCtc = row.key === 'ctc';
                        const ctcVal = isCtc ? (o.ctc || 0) : 0;
                        const isBestCtc = isCtc && ctcVal === maxCtc && ctcVal > 0;
                        return (
                          <td key={ci} style={{ padding: '12px 16px', fontSize: 14, textAlign: 'center', borderBottom: '1px solid #F1F5F9', color: isBestCtc ? '#059669' : '#0A1628', fontWeight: isBestCtc ? 800 : 400 }}>
                            {val}
                            {isCtc && ctcVal > 0 && (
                              <ScoreBar value={ctcVal} max={maxCtc} color={isBestCtc ? '#10B981' : '#6366F1'} />
                            )}
                            {isBestCtc && <div style={{ fontSize: 11, color: '#059669', fontWeight: 700, marginTop: 2 }}>★ Best Offer</div>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>

              {maxCtc > 0 && (() => {
                const best = compared.find(o => (o.ctc || 0) === maxCtc);
                return (
                  <div style={{ marginTop: 16, background: '#D1FAE5', border: '1px solid #6EE7B7', borderRadius: 12, padding: '16px 20px' }}>
                    <div style={{ fontWeight: 700, color: '#065F46', fontSize: 15 }}>
                      💚 Highest CTC: {best?.jobTitle || 'Offer'} at {best?.company || best?.companyName || ''} — {fmtSalary(best)}
                    </div>
                    <div style={{ color: '#059669', fontSize: 13, marginTop: 4 }}>
                      Consider other factors like growth, culture, and location before deciding.
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {compared.length === 1 && (
            <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: 20 }}>Select at least 2 offers to compare.</div>
          )}

          {compared.length === 0 && offers.length > 0 && (
            <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: 20 }}>Click the cards above to select offers to compare.</div>
          )}
        </>
      )}
    </div>
  );
}
