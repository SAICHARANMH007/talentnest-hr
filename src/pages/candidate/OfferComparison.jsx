import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../api/api.js';
import { card } from '../../constants/styles.js';

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
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

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

const ROW_LABELS = [
  { key: 'job',         label: '💼 Job Title',    fn: o => o.jobTitle || '—' },
  { key: 'company',     label: '🏢 Company',      fn: o => o.company || '—' },
  { key: 'ctc',         label: '💰 Total CTC',    fn: o => fmtSalary(o) },
  { key: 'location',    label: '📍 Location',     fn: o => o.location || '—' },
  { key: 'joiningDate', label: '📅 Joining Date', fn: o => fmtDate(o.joiningDate) },
  { key: 'sentAt',      label: '📨 Offer Date',   fn: o => fmtDate(o.sentAt) },
  { key: 'status',      label: '🎯 Status',       fn: o => {
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

function calcDecisionScore(offer, compared, manualCtc) {
  const id = String(offer._id || offer.id);
  const ctcVal = manualCtc[id] ? parseCtcString(manualCtc[id]) : (offer.ctc || 0);
  const maxCtc = compared.reduce((m, o) => {
    const oid = String(o._id || o.id);
    return Math.max(m, manualCtc[oid] ? parseCtcString(manualCtc[oid]) : (o.ctc || 0));
  }, 1);
  const ctcScore = maxCtc > 0 ? (ctcVal / maxCtc) * 65 : 0;
  const statusScore = (offer.status === 'signed' || offer.status === 'Hired') ? 20 : offer.status === 'sent' ? 15 : 10;
  const dataScore = offer.joiningDate ? 15 : 7;
  return Math.min(99, Math.round(ctcScore + statusScore + dataScore));
}

function getScoreColor(score) {
  if (score >= 80) return '#059669';
  if (score >= 60) return '#D97706';
  return '#DC2626';
}

function getScoreLabel(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 55) return 'Fair';
  return 'Needs Info';
}

function generateInsights(compared, manualCtc, manualJoin) {
  const insights = [];
  if (compared.length < 2) return insights;

  const ctcMap = compared.map(o => {
    const id = String(o._id || o.id);
    return { offer: o, id, ctc: manualCtc[id] ? parseCtcString(manualCtc[id]) : (o.ctc || 0) };
  });

  const withCtc = ctcMap.filter(x => x.ctc > 0);
  if (withCtc.length >= 2) {
    withCtc.sort((a, b) => b.ctc - a.ctc);
    const highest = withCtc[0];
    const lowest = withCtc[withCtc.length - 1];
    const diff = highest.ctc - lowest.ctc;
    const pct = Math.round((diff / lowest.ctc) * 100);
    if (diff > 0) {
      insights.push({ icon: '💰', text: `${highest.offer.company} pays ₹${(diff / 100000).toFixed(1)}L/yr (${pct}%) more than ${lowest.offer.company}` });
    }
  }

  const locs = compared.map(o => o.location).filter(l => l && l !== '—');
  const uniqueLocs = [...new Set(locs)];
  if (locs.length > 1 && uniqueLocs.length === 1) {
    insights.push({ icon: '📍', text: `All offers are in ${uniqueLocs[0]} — no relocation stress` });
  } else if (uniqueLocs.length > 1) {
    insights.push({ icon: '📍', text: `Offers span ${uniqueLocs.join(', ')} — factor in relocation or commute costs` });
  }

  compared.forEach(o => {
    const id = String(o._id || o.id);
    const dateStr = manualJoin[id] || o.joiningDate;
    if (dateStr) {
      const days = Math.round((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
      if (days >= 0 && days <= 15) {
        insights.push({ icon: '⚡', text: `${o.company} joining is in ${days} day${days !== 1 ? 's' : ''} — act fast on your notice period` });
      } else if (days > 15 && days <= 45) {
        insights.push({ icon: '📅', text: `${o.company} joining window: ${days} days — start exit conversations now` });
      }
    }
  });

  const signedOffers = compared.filter(o => o.status === 'signed' || o.status === 'Hired');
  if (signedOffers.length > 0) {
    insights.push({ icon: '✅', text: `${signedOffers.map(o => o.company).join(' & ')} ${signedOffers.length > 1 ? 'are' : 'is'} already accepted/signed` });
  }

  return insights;
}

const CHECKLIST = [
  { id: 'breakup',  text: 'Reviewed full salary breakup (base, HRA, allowances, bonus, ESOP)' },
  { id: 'notice',   text: 'Confirmed joining date aligns with your notice period' },
  { id: 'benefits', text: 'Checked health insurance, gratuity, PF, and leave policy' },
  { id: 'workmode', text: 'Clarified work mode: remote / hybrid / in-office' },
  { id: 'growth',   text: 'Asked about performance review cycle and promotion timeline' },
  { id: 'reviews',  text: 'Read company reviews on TalentNest and Glassdoor / AmbitionBox' },
];

// Module-level cache so reviews are not re-fetched across renders
const reviewsCache = new Map();

export default function OfferComparison({ user }) {
  const [offers, setOffers]         = useState([]);
  const [selected, setSelected]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [manualCtc, setManualCtc]   = useState({});
  const [manualJoin, setManualJoin] = useState({});
  const [editingCtc, setEditingCtc] = useState(null);
  const [checkedItems, setCheckedItems] = useState([]);
  const [isMobile, setIsMobile]     = useState(() => window.innerWidth < 768);
  const [companyReviews, setCompanyReviews] = useState({});

  useEffect(() => {
    Promise.allSettled([
      api.getMyOffers(),
      api.getMyApplications(),
    ]).then(([offerRes, appRes]) => {
      const formalOffers = (() => {
        const r = offerRes.status === 'fulfilled' ? offerRes.value : [];
        const list = Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : []);
        return list.filter(o => o.status !== 'draft').map(normalizeOffer);
      })();
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

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const toggle = (id) => {
    setSelected(s =>
      s.includes(id) ? s.filter(x => x !== id) : s.length < 3 ? [...s, id] : s
    );
  };

  const compared = offers.filter(o => selected.includes(String(o._id || o.id)));

  const scores = useMemo(() => {
    const result = {};
    compared.forEach(o => {
      result[String(o._id || o.id)] = calcDecisionScore(o, compared, manualCtc);
    });
    return result;
  }, [compared, manualCtc]);

  const insights = useMemo(() => generateInsights(compared, manualCtc, manualJoin), [compared, manualCtc, manualJoin]);

  const maxCtc = compared.reduce((m, o) => {
    const id = String(o._id || o.id);
    return Math.max(m, manualCtc[id] ? parseCtcString(manualCtc[id]) : (o.ctc || 0));
  }, 0);

  const bestOfferId = maxCtc > 0 ? String(compared.find(o => {
    const id = String(o._id || o.id);
    return (manualCtc[id] ? parseCtcString(manualCtc[id]) : (o.ctc || 0)) === maxCtc;
  })?._id || '') : '';

  // Fetch reviews for all offer companies (background, no spinner)
  const offersCompanyKey = offers.map(o => o.company || '').sort().join('|');
  useEffect(() => {
    if (offers.length === 0) return;
    const companies = [...new Set(offers.map(o => o.company).filter(c => c && c !== '—'))];
    companies.forEach(async (name) => {
      if (reviewsCache.has(name)) {
        setCompanyReviews(prev => ({ ...prev, [name]: reviewsCache.get(name) }));
        return;
      }
      try {
        const res = await api.getCompanyReviewsByName(name);
        const data = {
          avgRating: res?.avgRating || 0,
          total: res?.total || 0,
          topReviews: (res?.data || []).slice(0, 2),
        };
        reviewsCache.set(name, data);
        setCompanyReviews(prev => ({ ...prev, [name]: data }));
      } catch {}
    });
  }, [offersCompanyKey]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Loading offers…</div>;

  const rootPad = isMobile ? '14px' : '24px';

  return (
    <div style={{ padding: rootPad, maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: isMobile ? 20 : 28 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 900, color: '#0A1628', margin: '0 0 4px' }}>🎯 Offer Comparison</h1>
        <p style={{ color: '#6B7280', fontSize: 13, margin: 0 }}>Compare up to 3 offers side-by-side and make your best career decision</p>
      </div>

      {offers.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 56 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
          <div style={{ fontWeight: 700, color: '#374151', marginBottom: 6 }}>No offers yet</div>
          <div style={{ color: '#9CA3AF', fontSize: 13 }}>Offers appear here when recruiters extend an offer or mark you as hired</div>
        </div>
      ) : (
        <>
          {/* ── Offer Selection Cards ── */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              Select 2–3 offers to compare
              <span style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF', background: '#F3F4F6', padding: '2px 8px', borderRadius: 20 }}>{selected.length}/3 selected</span>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {offers.map(o => {
                const id = String(o._id || o.id);
                const sel = selected.includes(id);
                const score = sel && compared.length > 1 ? scores[id] : null;
                const ctcVal = manualCtc[id] ? parseCtcString(manualCtc[id]) : o.ctc;
                const ctcDisplay = ctcVal ? fmtSalary({ ctc: ctcVal, ctcRaw: manualCtc[id] || o.ctcRaw }) : (o.ctcRaw || null);
                const isBest = sel && id === bestOfferId && compared.length > 1 && maxCtc > 0;
                const rev = companyReviews[o.company];
                return (
                  <button key={id} onClick={() => toggle(id)} style={{
                    border: sel ? `2px solid ${isBest ? '#059669' : '#4F46E5'}` : '1.5px solid #E2E8F0',
                    borderRadius: 16, padding: '14px 16px',
                    background: sel
                      ? (isBest ? 'linear-gradient(145deg,#F0FDF4,#DCFCE7)' : 'linear-gradient(145deg,#EEF2FF,#E0E7FF)')
                      : '#fff',
                    cursor: 'pointer', textAlign: 'left',
                    minWidth: isMobile ? 'calc(50% - 6px)' : 196,
                    maxWidth: isMobile ? 'calc(50% - 6px)' : 'none',
                    boxShadow: sel ? (isBest ? '0 0 0 3px rgba(5,150,105,0.15)' : '0 0 0 3px rgba(79,70,229,0.12)') : '0 1px 4px rgba(0,0,0,0.06)',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                  }}>
                    {isBest && <div style={{ position: 'absolute', top: 0, right: 0, background: '#059669', color: '#fff', fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: '0 16px 0 8px' }}>TOP PICK</div>}
                    <div style={{ fontWeight: 800, fontSize: isMobile ? 13 : 14, color: '#0A1628', marginBottom: 2, paddingRight: isBest ? 56 : 0 }}>{o.jobTitle || 'Offer'}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>{o.company || 'Company'}</div>
                    {ctcDisplay && <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 900, color: '#4F46E5', marginBottom: 4 }}>{ctcDisplay}</div>}
                    <div style={{ fontSize: 11, fontWeight: 700, color: (o.status === 'Hired' || o.status === 'signed') ? '#059669' : '#0176D3', marginBottom: rev?.avgRating > 0 || score !== null ? 6 : 0 }}>
                      {o.status === 'Hired' ? '🏆 Hired' : o.status === 'signed' ? '✅ Signed' : '📨 Offer Sent'}
                    </div>
                    {rev?.avgRating > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: score !== null ? 8 : 0 }}>
                        <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 800 }}>★ {rev.avgRating.toFixed(1)}</span>
                        <span style={{ fontSize: 10, color: '#9CA3AF' }}>({rev.total})</span>
                      </div>
                    )}
                    {score !== null && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                          <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>Decision Score</span>
                          <span style={{ fontSize: 12, fontWeight: 900, color: getScoreColor(score) }}>{score}/100</span>
                        </div>
                        <div style={{ height: 5, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${score}%`, height: '100%', background: getScoreColor(score), borderRadius: 4, transition: 'width 0.6s' }} />
                        </div>
                        <div style={{ fontSize: 10, color: getScoreColor(score), fontWeight: 700, marginTop: 3 }}>{getScoreLabel(score)}</div>
                      </div>
                    )}
                    {!sel && (
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                        {selected.length >= 3 ? 'Max 3 reached' : 'Tap to select'}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {compared.length >= 2 && (
            <>
              {/* ── Comparison: mobile cards or desktop table ── */}
              {isMobile ? (
                <div style={{ marginBottom: 20 }}>
                  {compared.map((o, i) => {
                    const id = String(o._id || o.id);
                    const isBest = id === bestOfferId && maxCtc > 0;
                    const score = scores[id];
                    const effectiveOffer = {
                      ...o,
                      ctc: manualCtc[id] ? parseCtcString(manualCtc[id]) : o.ctc,
                      ctcRaw: manualCtc[id] || o.ctcRaw,
                      joiningDate: manualJoin[id] || o.joiningDate,
                    };
                    const maxEffCtc = compared.reduce((m, x) => {
                      const xId = String(x._id || x.id);
                      return Math.max(m, manualCtc[xId] ? parseCtcString(manualCtc[xId]) : (x.ctc || 0));
                    }, 0);
                    return (
                      <div key={id} style={{
                        background: isBest ? 'linear-gradient(145deg,#F0FDF4,#fff)' : '#fff',
                        border: `2px solid ${isBest ? '#86EFAC' : '#E2E8F0'}`,
                        borderRadius: 16,
                        marginBottom: 14,
                        overflow: 'hidden',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                      }}>
                        <div style={{
                          background: isBest ? 'rgba(5,150,105,0.07)' : '#F8FAFC',
                          padding: '12px 14px',
                          borderBottom: `1px solid ${isBest ? '#BBF7D0' : '#E2E8F0'}`,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 900, fontSize: 15, color: '#0A1628' }}>{o.jobTitle || `Offer ${i + 1}`}</div>
                              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>{o.company || ''}</div>
                            </div>
                            {isBest && <span style={{ background: '#059669', color: '#fff', fontSize: 9, fontWeight: 800, padding: '3px 10px', borderRadius: 20, flexShrink: 0 }}>TOP PICK</span>}
                          </div>
                          {score !== undefined && compared.length > 1 && (
                            <div style={{ marginTop: 10 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                                <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>Decision Score</span>
                                <span style={{ fontSize: 12, fontWeight: 900, color: getScoreColor(score) }}>{score}/100 — {getScoreLabel(score)}</span>
                              </div>
                              <div style={{ height: 5, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${score}%`, height: '100%', background: getScoreColor(score), borderRadius: 3, transition: 'width 0.6s' }} />
                              </div>
                            </div>
                          )}
                          {isBest && <div style={{ fontSize: 11, fontWeight: 800, color: '#059669', marginTop: 6 }}>⭐ Highest CTC</div>}
                        </div>
                        <div>
                          {ROW_LABELS.map((row, ri) => {
                            const isCtc = row.key === 'ctc';
                            const isJoin = row.key === 'joiningDate';
                            const val = row.fn(effectiveOffer);
                            const ctcVal = isCtc ? (effectiveOffer.ctc || 0) : 0;
                            const isBestCtc = isCtc && ctcVal === maxEffCtc && ctcVal > 0;
                            const isStatus = row.key === 'status';
                            const statusGood = isStatus && (o.status === 'signed' || o.status === 'Hired');
                            return (
                              <div key={row.key} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 14px',
                                borderBottom: ri < ROW_LABELS.length - 1 ? '1px solid #F1F5F9' : 'none',
                                background: ri % 2 === 0 ? '#fff' : '#FAFAFA',
                                gap: 8,
                              }}>
                                <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, flexShrink: 0 }}>{row.label}</span>
                                <span style={{ fontSize: 13, fontWeight: (isBestCtc || statusGood) ? 800 : 600, color: (isBestCtc || statusGood) ? '#059669' : '#0A1628', textAlign: 'right', minWidth: 0 }}>
                                  {isCtc && val === '—' ? (
                                    editingCtc === id + '_ctc' ? (
                                      <input autoFocus defaultValue={manualCtc[id] || ''}
                                        onBlur={e => { setManualCtc(p => ({ ...p, [id]: e.target.value })); setEditingCtc(null); }}
                                        onKeyDown={e => { if (e.key === 'Enter') { setManualCtc(p => ({ ...p, [id]: e.target.value })); setEditingCtc(null); } }}
                                        placeholder="e.g. 8L"
                                        style={{ width: 80, padding: '4px 7px', borderRadius: 6, border: '1px solid #0176D3', fontSize: 12, outline: 'none', textAlign: 'center' }}
                                      />
                                    ) : (
                                      <button onClick={() => setEditingCtc(id + '_ctc')}
                                        style={{ background: '#F0F9FF', border: '1px dashed #0176D3', color: '#0176D3', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                                        + Add CTC
                                      </button>
                                    )
                                  ) : isJoin && val === '—' ? (
                                    editingCtc === id + '_join' ? (
                                      <input autoFocus type="date" defaultValue={manualJoin[id] || ''}
                                        onBlur={e => { setManualJoin(p => ({ ...p, [id]: e.target.value })); setEditingCtc(null); }}
                                        onKeyDown={e => { if (e.key === 'Enter') { setManualJoin(p => ({ ...p, [id]: e.target.value })); setEditingCtc(null); } }}
                                        style={{ padding: '4px 7px', borderRadius: 6, border: '1px solid #0176D3', fontSize: 12, outline: 'none' }}
                                      />
                                    ) : (
                                      <button onClick={() => setEditingCtc(id + '_join')}
                                        style={{ background: '#F0F9FF', border: '1px dashed #0176D3', color: '#0176D3', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                                        + Add Date
                                      </button>
                                    )
                                  ) : val}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ── Desktop Comparison Table ── */
                <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '16px 18px', background: '#F8FAFC', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9CA3AF', borderBottom: '2px solid #E2E8F0', width: 150, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Field</th>
                        {compared.map((o, i) => {
                          const id = String(o._id || o.id);
                          const isBest = id === bestOfferId && maxCtc > 0;
                          const score = scores[id];
                          return (
                            <th key={i} style={{ padding: '16px 18px', background: isBest ? '#F0FDF4' : '#F8FAFC', textAlign: 'center', borderBottom: `2px solid ${isBest ? '#86EFAC' : '#E2E8F0'}`, minWidth: 210 }}>
                              <div style={{ fontWeight: 900, fontSize: 15, color: '#0A1628' }}>{o.jobTitle || `Offer ${i + 1}`}</div>
                              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{o.company || ''}</div>
                              {score !== undefined && compared.length > 1 && (
                                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                                  <div style={{ height: 4, width: 90, background: '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                                    <div style={{ width: `${score}%`, height: '100%', background: getScoreColor(score), borderRadius: 2, transition: 'width 0.6s' }} />
                                  </div>
                                  <span style={{ fontSize: 12, fontWeight: 900, color: getScoreColor(score) }}>{score}</span>
                                </div>
                              )}
                              {isBest && <div style={{ fontSize: 10, fontWeight: 800, color: '#059669', marginTop: 6 }}>⭐ Highest CTC</div>}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {ROW_LABELS.map((row, ri) => (
                        <tr key={row.key} style={{ background: ri % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                          <td style={{ padding: '13px 18px', fontSize: 13, fontWeight: 700, color: '#6B7280', borderBottom: '1px solid #F1F5F9' }}>{row.label}</td>
                          {compared.map((o, ci) => {
                            const id = String(o._id || o.id);
                            const isCtc = row.key === 'ctc';
                            const isJoin = row.key === 'joiningDate';
                            const isStatus = row.key === 'status';
                            const effectiveOffer = {
                              ...o,
                              ctc: manualCtc[id] ? parseCtcString(manualCtc[id]) : o.ctc,
                              ctcRaw: manualCtc[id] || o.ctcRaw,
                              joiningDate: manualJoin[id] || o.joiningDate,
                            };
                            const val = row.fn(effectiveOffer);
                            const ctcVal = isCtc ? (effectiveOffer.ctc || 0) : 0;
                            const maxEffCtc = compared.reduce((m, x) => {
                              const xId = String(x._id || x.id);
                              return Math.max(m, manualCtc[xId] ? parseCtcString(manualCtc[xId]) : (x.ctc || 0));
                            }, 0);
                            const isBestCtc = isCtc && ctcVal === maxEffCtc && ctcVal > 0;
                            const statusGood = isStatus && (o.status === 'signed' || o.status === 'Hired');
                            return (
                              <td key={ci} style={{
                                padding: '13px 18px',
                                fontSize: 14,
                                textAlign: 'center',
                                borderBottom: '1px solid #F1F5F9',
                                color: isBestCtc ? '#059669' : statusGood ? '#059669' : '#0A1628',
                                fontWeight: (isBestCtc || statusGood) ? 800 : 400,
                                verticalAlign: 'middle',
                                background: isBestCtc ? 'rgba(5,150,105,0.05)' : statusGood ? 'rgba(5,150,105,0.03)' : 'transparent',
                              }}>
                                {isCtc && val === '—' ? (
                                  editingCtc === id + '_ctc' ? (
                                    <input
                                      autoFocus
                                      defaultValue={manualCtc[id] || ''}
                                      onBlur={e => { setManualCtc(p => ({ ...p, [id]: e.target.value })); setEditingCtc(null); }}
                                      onKeyDown={e => { if (e.key === 'Enter') { setManualCtc(p => ({ ...p, [id]: e.target.value })); setEditingCtc(null); } }}
                                      placeholder="e.g. 8L or 800000"
                                      style={{ width: 110, padding: '5px 8px', borderRadius: 6, border: '1px solid #0176D3', fontSize: 12, textAlign: 'center', outline: 'none' }}
                                    />
                                  ) : (
                                    <button onClick={() => setEditingCtc(id + '_ctc')}
                                      style={{ background: '#F0F9FF', border: '1px dashed #0176D3', color: '#0176D3', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                                      + Add CTC
                                    </button>
                                  )
                                ) : isJoin && val === '—' ? (
                                  editingCtc === id + '_join' ? (
                                    <input
                                      autoFocus type="date"
                                      defaultValue={manualJoin[id] || ''}
                                      onBlur={e => { setManualJoin(p => ({ ...p, [id]: e.target.value })); setEditingCtc(null); }}
                                      onKeyDown={e => { if (e.key === 'Enter') { setManualJoin(p => ({ ...p, [id]: e.target.value })); setEditingCtc(null); } }}
                                      style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #0176D3', fontSize: 12, outline: 'none' }}
                                    />
                                  ) : (
                                    <button onClick={() => setEditingCtc(id + '_join')}
                                      style={{ background: '#F0F9FF', border: '1px dashed #0176D3', color: '#0176D3', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                                      + Add Date
                                    </button>
                                  )
                                ) : val}
                                {isCtc && ctcVal > 0 && (
                                  <ScoreBar value={ctcVal} max={maxEffCtc} color={isBestCtc ? '#10B981' : '#6366F1'} />
                                )}
                                {isBestCtc && <div style={{ fontSize: 11, color: '#059669', fontWeight: 700, marginTop: 2 }}>★ Best CTC</div>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Smart Insights ── */}
              {insights.length > 0 && (
                <div style={{ background: 'linear-gradient(135deg,#F0F9FF,#EEF2FF)', border: '1px solid #BFDBFE', borderRadius: 16, padding: isMobile ? '16px' : '20px 24px', marginBottom: 18 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#1E40AF', marginBottom: 14 }}>💡 Smart Insights</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {insights.map((ins, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ fontSize: 17, flexShrink: 0 }}>{ins.icon}</span>
                        <span style={{ fontSize: 13, color: '#1E3A5F', fontWeight: 500, lineHeight: 1.55 }}>{ins.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Best Offer Banner ── */}
              {maxCtc > 0 && (() => {
                const best = compared.find(o => {
                  const id = String(o._id || o.id);
                  return (manualCtc[id] ? parseCtcString(manualCtc[id]) : (o.ctc || 0)) === maxCtc;
                });
                const bestCtcDisplay = best ? fmtSalary({ ctc: maxCtc, ctcRaw: manualCtc[String(best._id || best.id)] || best.ctcRaw }) : '';
                return (
                  <div style={{ background: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)', border: '1px solid #86EFAC', borderRadius: 16, padding: isMobile ? '14px' : '20px 24px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ width: 48, height: 48, background: '#059669', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🏆</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: '#065F46', fontSize: isMobile ? 14 : 16, marginBottom: 4 }}>
                        Highest CTC: {best?.jobTitle || 'Offer'} at {best?.company || ''} — {bestCtcDisplay}
                      </div>
                      <div style={{ color: '#059669', fontSize: 13 }}>
                        Also weigh in: growth path, work culture, location, and job stability before deciding.
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── Company Reviews Section ── */}
              {compared.some(o => companyReviews[o.company]?.total > 0) && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0A1628', marginBottom: 4 }}>⭐ Company Reviews</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14 }}>Real experiences from TalentNest community members</div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(${Math.min(compared.length, 3)}, 1fr)`, gap: 12 }}>
                    {compared.map(o => {
                      const rev = companyReviews[o.company];
                      if (!rev) return null;
                      return (
                        <div key={String(o._id || o.id)} style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 14, padding: '16px', overflow: 'hidden' }}>
                          <div style={{ fontWeight: 800, fontSize: 13, color: '#0A1628', marginBottom: 8 }}>{o.company}</div>
                          {rev.avgRating > 0 ? (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                <span style={{ fontSize: 28, fontWeight: 900, color: '#F59E0B', lineHeight: 1 }}>{rev.avgRating.toFixed(1)}</span>
                                <div>
                                  <div style={{ display: 'flex', gap: 1 }}>
                                    {[1, 2, 3, 4, 5].map(s => (
                                      <span key={s} style={{ fontSize: 14, color: s <= Math.round(rev.avgRating) ? '#F59E0B' : '#E5E7EB' }}>★</span>
                                    ))}
                                  </div>
                                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{rev.total} review{rev.total !== 1 ? 's' : ''}</div>
                                </div>
                              </div>
                              {rev.topReviews.slice(0, 1).map((r, ri) => (
                                <div key={ri} style={{ background: 'rgba(255,255,255,0.75)', borderRadius: 8, padding: '10px 12px', fontSize: 12, lineHeight: 1.6 }}>
                                  {r.title && <div style={{ fontWeight: 700, color: '#374151', marginBottom: 5 }}>{r.title}</div>}
                                  {r.pros && <div style={{ color: '#065F46', marginBottom: r.cons ? 4 : 0, wordBreak: 'break-word' }}>✅ {r.pros.length > 110 ? r.pros.slice(0, 110) + '…' : r.pros}</div>}
                                  {r.cons && <div style={{ color: '#991B1B', wordBreak: 'break-word' }}>⚠️ {r.cons.length > 110 ? r.cons.slice(0, 110) + '…' : r.cons}</div>}
                                </div>
                              ))}
                            </>
                          ) : (
                            <div style={{ fontSize: 12, color: '#9CA3AF', padding: '8px 0' }}>No reviews yet for this company</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Pre-Decision Checklist ── */}
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: isMobile ? '16px' : '22px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0A1628', marginBottom: 4 }}>📋 Pre-Decision Checklist</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 18 }}>Verify these before making your final call — tick each off as you confirm</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {CHECKLIST.map(item => {
                    const checked = checkedItems.includes(item.id);
                    return (
                      <label key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', padding: '10px 14px', borderRadius: 12, background: checked ? '#F0FDF4' : '#FAFAFA', border: `1px solid ${checked ? '#86EFAC' : '#F1F5F9'}`, transition: 'all 0.2s' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setCheckedItems(p => checked ? p.filter(x => x !== item.id) : [...p, item.id])}
                          style={{ marginTop: 1, accentColor: '#059669', width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 13, color: checked ? '#065F46' : '#374151', fontWeight: checked ? 600 : 500, lineHeight: 1.55, flex: 1 }}>{item.text}</span>
                        {checked && <span style={{ fontSize: 14, color: '#059669', flexShrink: 0 }}>✓</span>}
                      </label>
                    );
                  })}
                </div>
                {checkedItems.length === CHECKLIST.length ? (
                  <div style={{ marginTop: 18, background: 'linear-gradient(135deg,#059669,#0891B2)', borderRadius: 12, padding: '16px 20px', color: '#fff', fontWeight: 700, fontSize: 14, textAlign: 'center' }}>
                    🎉 You've done your homework — time to make your decision with confidence!
                  </div>
                ) : checkedItems.length > 0 ? (
                  <div style={{ marginTop: 12, fontSize: 12, color: '#9CA3AF', textAlign: 'right' }}>
                    {checkedItems.length} / {CHECKLIST.length} verified
                  </div>
                ) : null}
              </div>
            </>
          )}

          {compared.length === 1 && (
            <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: 24 }}>Select at least one more offer to begin comparing.</div>
          )}

          {compared.length === 0 && offers.length > 0 && (
            <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: 24 }}>Tap the cards above to select 2–3 offers to compare.</div>
          )}
        </>
      )}
    </div>
  );
}
