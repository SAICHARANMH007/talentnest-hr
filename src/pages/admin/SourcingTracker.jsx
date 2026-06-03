import React, { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { card } from '../../constants/styles.js';
import { SOURCE_ICONS, SOURCE_COLORS as SOURCE_COLOR_MAP, sourceLabel, SOURCE_LABELS } from '../../constants/sources.js';

const SOURCE_COLOR_LIST = [
  '#0176D3', '#059669', '#D97706', '#DC2626', '#7C3AED',
  '#0891B2', '#BE185D', '#047857', '#B45309', '#4338CA',
];

// Job board sources that should always be visible even with 0 candidates
const JOB_BOARD_SOURCES = ['linkedin', 'naukri', 'indeed', 'glassdoor', 'monster', 'shine', 'social_media', 'referral', 'direct', 'invite_link', 'talent_match', 'bulk_import', 'resume_upload', 'career_page', 'manual'];

function SourceBar({ source, count, pct, total, color }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 16 }}>{SOURCE_ICONS[source] || SOURCE_ICONS.other}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
            {sourceLabel(source)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>{count.toLocaleString()}</span>
          <span style={{ fontSize: 12, color: '#6B7280', minWidth: 38, textAlign: 'right' }}>{pct}%</span>
        </div>
      </div>
      <div style={{ height: 8, background: '#E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 8, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

export default function SourcingTracker() {
  const [data, setData]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [range, setRange]     = useState({ start: '', end: '' });
  const [view, setView]       = useState('chart'); // 'chart' | 'table'

  const load = (start, end) => {
    setLoading(true);
    api.getSourceBreakdown(start && end ? { startDate: start, endDate: end } : {})
      .then(r => {
        const apiArr = r?.data || [];
        const apiTotal = r?.total || apiArr.reduce((s, x) => s + x.count, 0);
        // Merge API data with known job board sources — show all boards even with 0 count
        const seen = new Set(apiArr.map(s => s.source));
        const merged = [...apiArr];
        JOB_BOARD_SOURCES.forEach(src => {
          if (!seen.has(src)) merged.push({ source: src, count: 0, percentage: 0 });
        });
        // Sort: non-zero first by count desc, then zero entries alphabetically
        merged.sort((a, b) => b.count - a.count || (sourceLabel(a.source) < sourceLabel(b.source) ? -1 : 1));
        setData(merged);
        setTotal(apiTotal);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load('', ''); }, []);

  const topSources = data.slice(0, 3);

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A1628', margin: 0 }}>Sourcing Tracker</h1>
        <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>Understand where your candidates come from</p>
      </div>

      {/* Date filter */}
      <div style={{ ...card, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Date range:</label>
        <input type="date" value={range.start} onChange={e => setRange(r => ({ ...r, start: e.target.value }))}
          style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 10px', fontSize: 13 }} />
        <span style={{ fontSize: 13, color: '#6B7280' }}>to</span>
        <input type="date" value={range.end} onChange={e => setRange(r => ({ ...r, end: e.target.value }))}
          style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 10px', fontSize: 13 }} />
        <button onClick={() => load(range.start, range.end)} style={{ background: '#0176D3', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Apply</button>
        <button onClick={() => { setRange({ start: '', end: '' }); load('', ''); }} style={{ background: '#F1F5F9', color: '#374151', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}>Reset</button>
      </div>

      {loading ? (
        <div style={{ color: '#9CA3AF', textAlign: 'center', padding: 64 }}>Loading sourcing data…</div>
      ) : data.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ color: '#9CA3AF' }}>No sourcing data available.</div>
        </div>
      ) : (
        <>
          {/* View toggle + top 3 summary cards */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {topSources.filter(s => s.count > 0).map((s, i) => (
              <div key={s.source} style={{ ...card, textAlign: 'center', padding: '16px 20px', flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{SOURCE_ICONS[s.source] || SOURCE_ICONS.other}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: SOURCE_COLOR_MAP[s.source] || SOURCE_COLOR_LIST[i % SOURCE_COLOR_LIST.length] }}>{s.count.toLocaleString()}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'capitalize', margin: '2px 0' }}>{sourceLabel(s.source)}</div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>{s.percentage}% of total</div>
                {i === 0 && s.count > 0 && <div style={{ marginTop: 6, background: '#FEF3C7', color: '#92400E', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700, display: 'inline-block' }}>Top Source</div>}
              </div>
            ))}
          </div>

          {/* Chart / Table toggle */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {['chart', 'table'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: view === v ? '#0176D3' : '#F9FAFB', color: view === v ? '#fff' : '#374151' }}>
                {v === 'chart' ? '📊 Chart' : '📋 Table'}
              </button>
            ))}
          </div>

          {view === 'chart' && (
            <div style={card}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0A1628', marginBottom: 16 }}>
                Candidate Source Breakdown — {total.toLocaleString()} total
              </div>
              {data.filter(s => s.count > 0).map((s, i) => (
                <SourceBar key={s.source} source={s.source} count={s.count} pct={s.percentage} total={total}
                  color={SOURCE_COLOR_MAP[s?.source] || SOURCE_COLOR_LIST[i % SOURCE_COLOR_LIST.length]} />
              ))}
              {data.every(s => s.count === 0) && (
                <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '20px 0' }}>No sourcing data for this period.</p>
              )}
            </div>
          )}

          {view === 'table' && (
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      {['Source', 'Candidates', 'Share'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', fontWeight: 700, fontSize: 12, color: '#374151', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((s, i) => (
                      <tr key={s.source} style={{ borderBottom: '1px solid #F1F5F9', opacity: s.count === 0 ? 0.45 : 1 }}>
                        <td style={{ padding: '10px 16px', fontWeight: 600, fontSize: 13 }}>
                          <span style={{ marginRight: 8 }}>{SOURCE_ICONS[s.source] || SOURCE_ICONS.other}</span>
                          <span style={{ textTransform: 'capitalize' }}>{sourceLabel(s.source)}</span>
                        </td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: SOURCE_COLOR_MAP[s?.source] || SOURCE_COLOR_LIST[i % SOURCE_COLOR_LIST.length] }}>{s.count.toLocaleString()}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 5, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden', maxWidth: 100 }}>
                              <div style={{ width: `${s.percentage}%`, height: '100%', background: SOURCE_COLOR_MAP[s?.source] || SOURCE_COLOR_LIST[i % SOURCE_COLOR_LIST.length], borderRadius: 4 }} />
                            </div>
                            <span style={{ fontSize: 12, color: '#6B7280', minWidth: 36 }}>{s.percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
