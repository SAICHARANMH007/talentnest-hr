import React, { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { card, btnP, btnG } from '../../constants/styles.js';

const WIDGET_GROUPS = [
  {
    role: 'Admin / Super Admin',
    icon: '📈',
    widgets: [
      { key: 'admin_kpi_stats',            label: 'KPI Stats Bar',              desc: 'Total jobs, applicants, hired, offers — top-level numbers' },
      { key: 'admin_pipeline_health',      label: 'Pipeline Health',            desc: 'Stage-wise application breakdown' },
      { key: 'admin_hiring_funnel',        label: 'Hiring Funnel',              desc: 'Conversion funnel from applied to hired' },
      { key: 'admin_source_breakdown',     label: 'Source Breakdown',           desc: 'Where candidates come from' },
      { key: 'admin_top_skills',           label: 'Top Skills',                 desc: 'Most in-demand skills across active candidates' },
      { key: 'admin_leaderboard',          label: 'Recruiter Leaderboard',      desc: 'Top-performing recruiters by placements' },
      { key: 'admin_job_performance',      label: 'Job Performance',            desc: 'Applications and hires per job' },
      { key: 'admin_upcoming_interviews',  label: 'Upcoming Interviews',        desc: 'Scheduled interviews in the next 7 days' },
    ],
  },
  {
    role: 'Recruiter',
    icon: '🧑‍💼',
    widgets: [
      { key: 'recruiter_action_queue',         label: 'Action Queue',             desc: 'Daily tasks and pending actions' },
      { key: 'recruiter_pipeline',             label: 'My Pipeline',              desc: 'Recruiter-specific application pipeline view' },
      { key: 'recruiter_upcoming_interviews',  label: 'Upcoming Interviews',      desc: "Interviews this recruiter has scheduled" },
    ],
  },
  {
    role: 'Candidate',
    icon: '🎯',
    widgets: [
      { key: 'candidate_job_matches',         label: 'Job Match Suggestions',    desc: 'Smart-matched jobs based on candidate profile' },
      { key: 'candidate_application_status',  label: 'Application Status Feed',  desc: 'Latest updates on active applications' },
      { key: 'candidate_upcoming_interviews', label: 'Upcoming Interviews',       desc: "Interviews the candidate has been scheduled for" },
    ],
  },
];

export default function DashboardWidgets() {
  const [widgets, setWidgets] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');

  useEffect(() => {
    api.getCustomizations()
      .then(r => {
        const d = r?.data || r || {};
        const raw = d.dashboardWidgets || {};
        // Convert object or Map entries to plain object
        const flat = {};
        WIDGET_GROUPS.flatMap(g => g.widgets).forEach(w => {
          flat[w.key] = raw[w.key] !== false;
        });
        setWidgets(flat);
      })
      .catch(() => {
        const flat = {};
        WIDGET_GROUPS.flatMap(g => g.widgets).forEach(w => { flat[w.key] = true; });
        setWidgets(flat);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggle = (key) => setWidgets(w => ({ ...w, [key]: !w[key] }));

  const save = async () => {
    setSaving(true);
    try {
      await api.updateCustomizationsSingleton({ dashboardWidgets: widgets });
      setMsg('Widget preferences saved.');
    } catch (e) {
      setMsg(e?.message || 'Save failed.');
    }
    setSaving(false);
  };

  if (loading) return <div style={{ color: '#9CA3AF', textAlign: 'center', padding: 64 }}>Loading…</div>;

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A1628', margin: 0 }}>Dashboard Widgets</h1>
          <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>Control which widgets appear on each role&apos;s dashboard</p>
        </div>
        <button onClick={save} disabled={saving} style={{ ...btnP }}>{saving ? 'Saving…' : 'Save Preferences'}</button>
      </div>

      {msg && (
        <div style={{ background: '#D1FAE5', color: '#065F46', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
          {msg}
          <button onClick={() => setMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'inherit' }}>×</button>
        </div>
      )}

      {WIDGET_GROUPS.map(group => (
        <div key={group.role} style={{ ...card, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 22 }}>{group.icon}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#0A1628' }}>{group.role} Dashboard</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>Toggle widgets for this role</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={() => { const u = {}; group.widgets.forEach(w => { u[w.key] = true; }); setWidgets(ww => ({ ...ww, ...u })); }} style={{ ...btnG, fontSize: 11, padding: '4px 10px' }}>Enable All</button>
              <button onClick={() => { const u = {}; group.widgets.forEach(w => { u[w.key] = false; }); setWidgets(ww => ({ ...ww, ...u })); }} style={{ ...btnG, fontSize: 11, padding: '4px 10px' }}>Disable All</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {group.widgets.map(w => (
              <div key={w.key} onClick={() => toggle(w.key)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 10, background: widgets[w.key] ? '#F0FDF4' : '#F9FAFB', border: `1px solid ${widgets[w.key] ? '#BBF7D0' : '#E5E7EB'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                <div style={{ width: 40, height: 22, background: widgets[w.key] ? '#059669' : '#D1D5DB', borderRadius: 11, position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                  <div style={{ width: 18, height: 18, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: widgets[w.key] ? 20 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#0A1628' }}>{w.label}</div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>{w.desc}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: widgets[w.key] ? '#059669' : '#9CA3AF' }}>{widgets[w.key] ? 'ON' : 'OFF'}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
