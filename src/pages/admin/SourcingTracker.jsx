import React, { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { card } from '../../constants/styles.js';

const SOURCE_ICONS = {
  linkedin: '🔗',
  referral: '👥',
  career_page: '🏢',
  platform: '💻',
  naukri: '📋',
  indeed: '🔍',
  direct: '📩',
  bulk_import: '📦',
  invite: '✉️',
  social: '📱',
  other: '🌐',
};

const SOURCE_COLORS = [
  '#0176D3', '#059669', '#D97706', '#DC2626', '#7C3AED',
  '#0891B2', '#BE185D', '#047857', '#B45309', '#4338CA',
];

function SourceBar({ source, count, pct, total, color }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 16 }}>{SOURCE_ICONS[source] || SOURCE_ICONS.other}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>
            {source.replace(/_/g, ' ')}
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

  const load = (start, end) => {
    setLoading(true);
    api.getSourceBreakdown(start && end ? { startDate: start, endDate: end } : {})
      .then(r => {
        const arr = r?.data || [];
        setData(arr);
        setTotal(r?.total || arr.reduce((s, x) => s + x.count, 0));
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Source breakdown bar chart */}
          <div style={{ ...card, gridColumn: '1 / -1' }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#0A1628', marginBottom: 16 }}>
              Source Breakdown — {total.toLocaleString()} total candidates
            </div>
            {data.map((s, i) => (
              <SourceBar
                key={s.source}
                source={s.source}
                count={s.count}
                pct={s.percentage}
                total={total}
                color={SOURCE_COLORS[i % SOURCE_COLORS.length]}
              />
            ))}
          </div>

          {/* Top 3 sources */}
          {topSources.map((s, i) => (
            <div key={s.source} style={{ ...card, textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{SOURCE_ICONS[s.source] || SOURCE_ICONS.other}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: SOURCE_COLORS[i] }}>{s.count.toLocaleString()}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', textTransform: 'capitalize', margin: '4px 0 2px' }}>{s.source.replace(/_/g, ' ')}</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>{s.percentage}% of total</div>
              {i === 0 && <div style={{ marginTop: 8, background: '#FEF3C7', color: '#92400E', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, display: 'inline-block' }}>Top Source</div>}
            </div>
          ))}

          {/* Table */}
          <div style={{ ...card, gridColumn: '1 / -1', padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Source', 'Candidates', 'Share'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', fontWeight: 700, fontSize: 12, color: '#374151', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((s, i) => (
                  <tr key={s.source} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '11px 16px', fontWeight: 600, fontSize: 14 }}>
                      <span style={{ marginRight: 8 }}>{SOURCE_ICONS[s.source] || SOURCE_ICONS.other}</span>
                      <span style={{ textTransform: 'capitalize' }}>{s.source.replace(/_/g, ' ')}</span>
                    </td>
                    <td style={{ padding: '11px 16px', fontWeight: 700, color: SOURCE_COLORS[i % SOURCE_COLORS.length] }}>{s.count.toLocaleString()}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 5, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden', maxWidth: 100 }}>
                          <div style={{ width: `${s.percentage}%`, height: '100%', background: SOURCE_COLORS[i % SOURCE_COLORS.length], borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 12, color: '#6B7280' }}>{s.percentage}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
