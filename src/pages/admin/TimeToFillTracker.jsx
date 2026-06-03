import React, { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { card } from '../../constants/styles.js';

function StatusBadge({ status }) {
  const cfg = {
    active:   { bg: '#D1FAE5', color: '#065F46' },
    closed:   { bg: '#FEE2E2', color: '#991B1B' },
    paused:   { bg: '#FEF3C7', color: '#92400E' },
    draft:    { bg: '#F3F4F6', color: '#374151' },
  };
  const s = cfg[status] || cfg.draft;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
      {status}
    </span>
  );
}

function DaysBar({ days, max }) {
  if (days == null) return <span style={{ color: '#9CA3AF', fontSize: 12 }}>—</span>;
  const pct = max > 0 ? Math.min(100, Math.round((days / max) * 100)) : 0;
  const color = days <= 14 ? '#059669' : days <= 30 ? '#D97706' : '#DC2626';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden', minWidth: 60 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 36, textAlign: 'right' }}>{days}d</span>
    </div>
  );
}

export default function TimeToFillTracker() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort]       = useState({ col: 'daysToFill', dir: 'asc' });
  const [filter, setFilter]   = useState('');

  useEffect(() => {
    api.getTimeToFill()
      .then(r => setData(r?.data || r || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const jobs = data?.jobs || [];
  const maxDays = Math.max(1, ...jobs.filter(j => j.daysToFill != null).map(j => j.daysToFill));

  const filtered = jobs.filter(j => !filter || j.title?.toLowerCase().includes(filter.toLowerCase()));

  const sorted = [...filtered].sort((a, b) => {
    let av = a[sort.col], bv = b[sort.col];
    if (av == null) av = sort.dir === 'asc' ? Infinity : -Infinity;
    if (bv == null) bv = sort.dir === 'asc' ? Infinity : -Infinity;
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    return sort.dir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  const toggleSort = (col) => setSort(s => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }));

  const th = (col, label) => (
    <th
      onClick={() => toggleSort(col)}
      style={{ padding: '10px 14px', fontWeight: 700, fontSize: 12, color: '#374151', textAlign: 'left', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', borderBottom: '2px solid #E5E7EB' }}
    >
      {label} {sort.col === col ? (sort.dir === 'asc' ? '↑' : '↓') : <span style={{ opacity: 0.3 }}>↕</span>}
    </th>
  );

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A1628', margin: 0 }}>Time-to-Fill Tracker</h1>
        <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>Track how long it takes to fill each open position</p>
      </div>

      {loading ? (
        <div style={{ color: '#9CA3AF', textAlign: 'center', padding: 64 }}>Loading…</div>
      ) : !data ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ color: '#374151', fontWeight: 600, marginBottom: 6 }}>No hiring data yet</div>
          <div style={{ color: '#9CA3AF', fontSize: 13 }}>Once candidates are hired, you'll see how long each position took to fill.</div>
        </div>
      ) : (
        <>
          {/* Summary stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total Jobs', value: jobs.length },
              { label: 'Positions Filled', value: data.filledCount ?? 0 },
              { label: 'Avg Days to Fill', value: data.avgDaysToFill != null ? `${data.avgDaysToFill}d` : '—' },
              { label: 'Open Positions', value: jobs.filter(j => j.status === 'active').length },
            ].map((s, i) => (
              <div key={i} style={{ ...card, textAlign: 'center', padding: '16px 12px' }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#0A1628' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div style={{ ...card, marginBottom: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter by job title…"
              style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px', fontSize: 14, flex: 1, outline: 'none' }}
            />
            <span style={{ fontSize: 13, color: '#6B7280' }}>{sorted.length} jobs</span>
          </div>

          {/* Table */}
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#F8FAFC' }}>
                  <tr>
                    {th('title', 'Job Title')}
                    {th('status', 'Status')}
                    {th('appCount', 'Applicants')}
                    {th('daysToFill', 'Days to Fill')}
                    {th('createdAt', 'Posted')}
                    {th('hiredAt', 'Filled On')}
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>No jobs found.</td>
                    </tr>
                  ) : sorted.map((j, i) => (
                    <tr key={String(j.jobId)} style={{ borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 14, color: '#0A1628', maxWidth: 280 }}>{j.title}</td>
                      <td style={{ padding: '12px 14px' }}><StatusBadge status={j.status} /></td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151', textAlign: 'center' }}>{j.appCount ?? 0}</td>
                      <td style={{ padding: '12px 14px', minWidth: 160 }}>
                        <DaysBar days={j.daysToFill} max={maxDays} />
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#6B7280' }}>
                        {j.createdAt ? new Date(j.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#6B7280' }}>
                        {j.hiredAt ? new Date(j.hiredAt).toLocaleDateString() : <span style={{ color: '#D97706' }}>Open</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
