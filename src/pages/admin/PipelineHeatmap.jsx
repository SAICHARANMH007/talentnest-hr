import React, { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { card } from '../../constants/styles.js';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getColor(count, max) {
  if (!count || max === 0) return '#F1F5F9';
  const intensity = count / max;
  if (intensity < 0.2) return '#DBEAFE';
  if (intensity < 0.4) return '#93C5FD';
  if (intensity < 0.6) return '#3B82F6';
  if (intensity < 0.8) return '#1D4ED8';
  return '#1E40AF';
}

export default function PipelineHeatmap() {
  const [data, setData]   = useState(null);
  const [loading, setLoad] = useState(true);
  const [days, setDays]   = useState(90);

  const load = (d) => {
    setLoad(true);
    api.getPipelineHeatmap(d)
      .then(r => { setData(r?.data || r); setLoad(false); })
      .catch(() => setLoad(false));
  };

  useEffect(() => load(days), [days]);

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#9CA3AF' }}>Loading heatmap…</div>;
  if (!data)   return <div style={{ padding: 48, textAlign: 'center', color: '#9CA3AF' }}>No data available.</div>;

  // Build calendar grid from daily data
  const dailyMap = {};
  (data.daily || []).forEach(d => { dailyMap[d.date] = d.count; });

  const maxDay = Math.max(1, ...Object.values(dailyMap));

  // Build weeks array — each week is an array of 7 { date, count }
  const endDate   = new Date();
  endDate.setHours(0, 0, 0, 0);
  const startDate = new Date(endDate.getTime() - (days - 1) * 86400000);

  // Pad start to Sunday
  const paddedStart = new Date(startDate);
  paddedStart.setDate(paddedStart.getDate() - paddedStart.getDay());

  const cells = [];
  for (let d = new Date(paddedStart); d <= endDate; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    cells.push({ date: iso, count: dailyMap[iso] || 0, inRange: d >= startDate });
  }

  // Chunk into weeks of 7
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // Stage breakdown (day-of-week × stage)
  const stageDayMap = {};
  (data.raw || []).forEach(r => {
    const key = `${r.day}-${r.stage}`;
    stageDayMap[key] = (stageDayMap[key] || 0) + r.count;
  });

  const stages = [...new Set((data.raw || []).map(r => r.stage))].sort();
  const maxStageDay = Math.max(1, ...Object.values(stageDayMap));

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A1628', margin: 0 }}>Pipeline Heatmap</h1>
          <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>Application activity over time</p>
        </div>
        <select value={days} onChange={e => setDays(Number(e.target.value))} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px', fontSize: 14 }}>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={180}>Last 180 days</option>
          <option value={365}>Last 365 days</option>
        </select>
      </div>

      {/* Calendar heatmap */}
      <div style={{ ...card, marginBottom: 24, overflowX: 'auto' }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#374151', margin: '0 0 16px' }}>Daily Application Volume</h2>
        <div style={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          {/* Day labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginRight: 6 }}>
            <div style={{ height: 16 }} /> {/* spacer for month row */}
            {DAYS_OF_WEEK.map((d, i) => (
              <div key={d} style={{ height: 14, fontSize: 10, color: '#9CA3AF', lineHeight: '14px', display: i % 2 === 1 ? 'block' : 'none' }}>{d}</div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => {
            const firstInMonth = week.find(c => c.date.endsWith('-01'));
            return (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ height: 16, fontSize: 10, color: '#6B7280', whiteSpace: 'nowrap' }}>
                  {firstInMonth ? MONTHS[parseInt(firstInMonth.date.slice(5, 7)) - 1] : ''}
                </div>
                {week.map((cell, di) => (
                  <div key={di} title={`${cell.date}: ${cell.count} applications`}
                    style={{ width: 14, height: 14, borderRadius: 2, background: cell.inRange ? getColor(cell.count, maxDay) : 'transparent', cursor: cell.count ? 'pointer' : 'default' }}
                  />
                ))}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 11, color: '#9CA3AF' }}>
          <span>Less</span>
          {['#F1F5F9', '#DBEAFE', '#93C5FD', '#3B82F6', '#1D4ED8', '#1E40AF'].map(c => (
            <div key={c} style={{ width: 12, height: 12, borderRadius: 2, background: c }} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Stage × Day heatmap */}
      {stages.length > 0 && (
        <div style={{ ...card }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#374151', margin: '0 0 16px' }}>Stage Activity by Day of Week</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#374151', textAlign: 'left', borderBottom: '1px solid #E5E7EB' }}>Stage</th>
                  {DAYS_OF_WEEK.map(d => (
                    <th key={d} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#374151', textAlign: 'center', borderBottom: '1px solid #E5E7EB' }}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stages.map(stage => (
                  <tr key={stage}>
                    <td style={{ padding: '6px 12px', fontSize: 13, color: '#0A1628', fontWeight: 600, borderBottom: '1px solid #F1F5F9' }}>{stage}</td>
                    {[1,2,3,4,5,6,7].map(dow => {
                      const v = stageDayMap[`${dow}-${stage}`] || 0;
                      const bg = getColor(v, maxStageDay);
                      return (
                        <td key={dow} title={`${v} applications`} style={{ padding: 4, textAlign: 'center', borderBottom: '1px solid #F1F5F9' }}>
                          <div style={{ width: 32, height: 32, borderRadius: 6, background: bg, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: v > maxStageDay * 0.5 ? '#fff' : '#374151' }}>
                            {v || ''}
                          </div>
                        </td>
                      );
                    })}
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
