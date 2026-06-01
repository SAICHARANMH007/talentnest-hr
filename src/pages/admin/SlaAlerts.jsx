import React, { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { card, btnG } from '../../constants/styles.js';

function StatCard({ label, value, color, icon }) {
  return (
    <div style={{ ...card, textAlign: 'center', padding: '16px 12px' }}>
      <div style={{ fontSize: 28, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: color || '#0A1628' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function SectionTable({ title, icon, children, empty }) {
  return (
    <div style={{ ...card, marginBottom: 20 }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: '#0A1628', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>{title}
      </div>
      {children || <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>{empty || 'All clear!'}</div>}
    </div>
  );
}

export default function SlaAlerts() {
  const [alerts, setAlerts]         = useState(null);
  const [sla, setSla]               = useState(null);
  const [loading, setLoading]       = useState(true);
  const [thresholds, setThresholds] = useState({ staleJobDays: 30, stuckCandDays: 7, pendingOfferDays: 3 });
  const [applied, setApplied]       = useState({ staleJobDays: 30, stuckCandDays: 7, pendingOfferDays: 3 });

  const load = (t) => {
    setLoading(true);
    Promise.all([
      api.getSmartAlerts(t),
      api.getSlaCompliance(),
    ])
      .then(([a, s]) => {
        setAlerts(a?.data || null);
        setSla(s?.data || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(applied); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyThresholds = () => { setApplied({ ...thresholds }); load(thresholds); };

  const ageColor = (days) => days >= 14 ? '#DC2626' : days >= 7 ? '#D97706' : '#059669';

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A1628', margin: 0 }}>SLA Alerts</h1>
        <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>Monitor stale jobs, stuck candidates, and SLA compliance</p>
      </div>

      {/* Threshold config */}
      <div style={{ ...card, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {[
          { key: 'staleJobDays',     label: 'Stale Job (days)' },
          { key: 'stuckCandDays',    label: 'Stuck Candidate (days)' },
          { key: 'pendingOfferDays', label: 'Pending Offer (days)' },
        ].map(f => (
          <div key={f.key}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{f.label}</label>
            <input
              type="number" min={1} max={90}
              value={thresholds[f.key]}
              onChange={e => setThresholds(t => ({ ...t, [f.key]: Number(e.target.value) }))}
              style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '7px 10px', fontSize: 14, width: 80 }}
            />
          </div>
        ))}
        <button onClick={applyThresholds} style={{ background: '#0176D3', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Apply</button>
      </div>

      {loading ? (
        <div style={{ color: '#9CA3AF', textAlign: 'center', padding: 64 }}>Loading alerts…</div>
      ) : (
        <>
          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            <StatCard icon="⚠️" label="Stale Jobs" value={alerts?.totals?.staleJobs ?? 0} color="#D97706" />
            <StatCard icon="🕒" label="Stuck Candidates" value={alerts?.totals?.stuckCandidates ?? 0} color="#DC2626" />
            <StatCard icon="📄" label="Pending Offers" value={alerts?.totals?.pendingOffers ?? 0} color="#7C3AED" />
            <StatCard icon="✅" label="SLA Compliance" value={sla ? `${sla.complianceRate}%` : '—'} color={sla?.complianceRate >= 80 ? '#059669' : '#DC2626'} />
          </div>

          {/* Stuck Candidates */}
          <SectionTable title="Stuck Candidates" icon="🕒" empty="No stuck candidates — all moving well!">
            {alerts?.stuckCandidates?.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['Candidate', 'Job', 'Stage', 'Days Stuck'].map(h => (
                      <th key={h} style={{ padding: '8px 14px', fontWeight: 700, fontSize: 12, color: '#374151', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alerts.stuckCandidates.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: 14 }}>{c.candidateName}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#374151' }}>{c.jobTitle}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12 }}>
                        <span style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 20, padding: '3px 10px', fontWeight: 600 }}>{c.stage}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ color: ageColor(c.daysStuck), fontWeight: 700, fontSize: 13 }}>{c.daysStuck}d</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionTable>

          {/* Stale Jobs */}
          <SectionTable title="Stale Jobs" icon="⚠️" empty="No stale jobs — all positions actively filling!">
            {alerts?.staleJobs?.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['Job Title', 'Company', 'Days Open', 'Recruiters'].map(h => (
                      <th key={h} style={{ padding: '8px 14px', fontWeight: 700, fontSize: 12, color: '#374151', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alerts.staleJobs.map((j, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: 14 }}>{j.title}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#374151' }}>{j.company}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ color: ageColor(j.daysOpen), fontWeight: 700, fontSize: 13 }}>{j.daysOpen}d</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280' }}>{j.recruiters?.join(', ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionTable>

          {/* Pending Offers */}
          <SectionTable title="Pending Offers" icon="📄" empty="No pending offers beyond threshold.">
            {alerts?.pendingOffers?.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['Candidate', 'Offer Status', 'Days Pending'].map(h => (
                      <th key={h} style={{ padding: '8px 14px', fontWeight: 700, fontSize: 12, color: '#374151', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alerts.pendingOffers.map((o, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: 14 }}>{o.candidateName}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: '#EDE9FE', color: '#5B21B6', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>{o.status}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ color: ageColor(o.daysPending), fontWeight: 700, fontSize: 13 }}>{o.daysPending}d</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionTable>

          {/* SLA Compliance by Stage */}
          {sla?.byStage?.length > 0 && (
            <div style={{ ...card }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#0A1628', marginBottom: 14 }}>📊 SLA Compliance by Stage</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      {['Stage', 'Compliant', 'Breached', 'Rate'].map(h => (
                        <th key={h} style={{ padding: '8px 14px', fontWeight: 700, fontSize: 12, color: '#374151', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sla.byStage.map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: 13 }}>{s.stage}</td>
                        <td style={{ padding: '10px 14px', color: '#059669', fontWeight: 700 }}>{s.compliant}</td>
                        <td style={{ padding: '10px 14px', color: '#DC2626', fontWeight: 700 }}>{s.breached}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden', maxWidth: 80 }}>
                              <div style={{ width: `${s.rate}%`, height: '100%', background: s.rate >= 80 ? '#059669' : s.rate >= 60 ? '#D97706' : '#DC2626', borderRadius: 4 }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: s.rate >= 80 ? '#059669' : s.rate >= 60 ? '#D97706' : '#DC2626' }}>{s.rate}%</span>
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
