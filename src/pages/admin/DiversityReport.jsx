import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../api/api.js';
import { card, btnG } from '../../constants/styles.js';
import { sourceLabel } from '../../constants/sources.js';

const GENDER_LABELS = {
  male:              'Male',
  female:            'Female',
  'non-binary':      'Non-binary',
  prefer_not_to_say: 'Prefer not to say',
  not_disclosed:     'Not disclosed',
};

const GENDER_COLORS = {
  male:              '#3B82F6',
  female:            '#EC4899',
  'non-binary':      '#8B5CF6',
  prefer_not_to_say: '#F59E0B',
  not_disclosed:     '#9CA3AF',
};

function PctBar({ value, color = '#0176D3' }) {
  return (
    <div style={{ background: '#F3F4F6', borderRadius: 4, overflow: 'hidden', height: 8 }}>
      <div style={{ width: `${Math.min(value, 100)}%`, background: color, height: '100%', borderRadius: 4, transition: 'width 0.6s ease' }} />
    </div>
  );
}

function StatCard({ label, value, sub, color = '#0176D3' }) {
  return (
    <div style={{ ...card, textAlign: 'center', padding: '18px 14px', flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function DiversityReport({ user }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getDiversityReport({ startDate, endDate });
      setData(r?.data || r);
    } catch {}
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const inp = { padding: '7px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: 12, background: '#fff' };

  return (
    <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>⚖️ Diversity Report</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>Gender diversity and equal-opportunity hiring metrics across your pipeline.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" style={inp} value={startDate} onChange={e => setStartDate(e.target.value)} placeholder="Start" />
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>to</span>
          <input type="date" style={inp} value={endDate} onChange={e => setEndDate(e.target.value)} placeholder="End" />
          <button style={btnG} onClick={load}>Filter</button>
          {(startDate || endDate) && <button style={btnG} onClick={() => { setStartDate(''); setEndDate(''); }}>Clear</button>}
        </div>
      </div>

      {/* Disclosure notice */}
      <div style={{ ...card, background: '#FFFBEB', border: '1px solid #FDE68A', padding: '10px 16px', marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 12, color: '#92400E' }}>
          <strong>Note:</strong> Gender data is self-reported by candidates and voluntary. Candidates who didn't disclose appear as "Not disclosed". Use this data to identify and address hiring biases.
        </p>
      </div>

      {loading ? (
        <p style={{ color: '#9CA3AF' }}>Loading diversity data…</p>
      ) : !data ? (
        <p style={{ color: '#EF4444' }}>Failed to load report.</p>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <StatCard label="Total Candidates" value={data.totalCandidates?.toLocaleString()} color="#0176D3" />
            <StatCard label="Total Applications" value={data.totalApplications?.toLocaleString()} color="#7C3AED" />
            <StatCard label="Total Hired" value={data.totalHired?.toLocaleString()} color="#16A34A" />
            <StatCard
              label="Hire Rate"
              value={data.totalApplications > 0 ? `${Math.round((data.totalHired / data.totalApplications) * 100)}%` : '—'}
              color="#F59E0B"
            />
          </div>

          {/* Gender breakdown */}
          <div style={{ ...card, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Gender Representation in Pipeline</h3>
            {(!data.genderBreakdown || data.genderBreakdown.length === 0) ? (
              <p style={{ color: '#9CA3AF', fontSize: 13 }}>No gender data available. Candidates can update their profile to add diversity information.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {data.genderBreakdown.sort((a, b) => b.total - a.total).map(g => {
                  const label = GENDER_LABELS[g.gender] || g.gender;
                  const color = GENDER_COLORS[g.gender] || '#9CA3AF';
                  return (
                    <div key={g.gender}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</span>
                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6B7280' }}>
                          <span><strong style={{ color: '#111827' }}>{g.total}</strong> in pool</span>
                          <span><strong style={{ color: '#111827' }}>{g.pct}%</strong></span>
                          {g.applied > 0 && <span>Shortlist rate: <strong style={{ color: '#111827' }}>{g.shortlistRate}%</strong></span>}
                          {g.applied > 0 && <span>Hire rate: <strong style={{ color: '#111827' }}>{g.hireRate}%</strong></span>}
                        </div>
                      </div>
                      <PctBar value={g.pct} color={color} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Hiring funnel by gender */}
          {data.genderBreakdown && data.genderBreakdown.some(g => g.applied > 0) && (
            <div style={{ ...card, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Hiring Funnel by Gender</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB' }}>
                      {['Gender', 'Applied', 'Shortlisted', 'Shortlist %', 'Hired', 'Hire %'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.genderBreakdown.filter(g => g.applied > 0).sort((a, b) => b.applied - a.applied).map((g, i) => (
                      <tr key={g.gender} style={{ background: i % 2 === 0 ? '#fff' : '#F9FAFB' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: GENDER_COLORS[g.gender] || '#374151' }}>{GENDER_LABELS[g.gender] || g.gender}</td>
                        <td style={{ padding: '8px 12px' }}>{g.applied}</td>
                        <td style={{ padding: '8px 12px' }}>{g.shortlisted}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ background: g.shortlistRate >= 50 ? '#D1FAE5' : '#FEE2E2', color: g.shortlistRate >= 50 ? '#065F46' : '#991B1B', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                            {g.shortlistRate}%
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px' }}>{g.hired}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{g.hireRate}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Source breakdown */}
          {data.sourceBreakdown && data.sourceBreakdown.length > 0 && (
            <div style={{ ...card, marginBottom: 20 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Applications by Source</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.sourceBreakdown.slice(0, 10).map(s => {
                  const total = data.totalApplications || 1;
                  const pct = Math.round((s.count / total) * 100);
                  return (
                    <div key={s.source}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{sourceLabel(s.source || 'direct')}</span>
                        <span style={{ fontSize: 12, color: '#6B7280' }}>{s.count} ({pct}%)</span>
                      </div>
                      <PctBar value={pct} color="#0176D3" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* How to improve disclosure */}
          <div style={{ ...card, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#166534' }}>💡 Improve disclosure rate</h4>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#374151', lineHeight: 1.7 }}>
              <li>Candidates can add gender in their profile under the Diversity section (optional & confidential)</li>
              <li>Add a voluntary diversity question to your application forms</li>
              <li>High "Not disclosed" counts indicate candidates haven't filled out the field — not necessarily a data issue</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
