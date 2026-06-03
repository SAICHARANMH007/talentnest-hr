import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { card } from '../../constants/styles.js';
import { api } from '../../api/api.js';

function KpiCard({ label, value, sub, color = '#0176D3', icon }) {
  return (
    <div style={{ ...card, padding: '20px 24px', borderLeft: `5px solid ${color}`, background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8' }}>{sub}</div>}
    </div>
  );
}

function MiniBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13, color: '#374151' }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value}</span>
      </div>
      <div style={{ background: '#f1f5f9', borderRadius: 6, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 6, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
    </div>
  );
}

export default function RecruiterMyPerformance({ user }) {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState([]);

  useEffect(() => {
    Promise.allSettled([
      api.getJobs({ recruiterId: user.id, limit: 200 }),
      api.getApplications({ recruiterId: user.id, limit: 500 }),
    ]).then(([jr, ar]) => {
      if (jr.status === 'fulfilled') {
        const list = Array.isArray(jr.value) ? jr.value : (jr.value?.data || []);
        setJobs(list);
      }
      if (ar.status === 'fulfilled') {
        const list = Array.isArray(ar.value) ? ar.value : (ar.value?.data || []);
        setApps(list);
      }
      setLoading(false);
    });
  }, [user.id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spinner size={40} color="#0176D3" />
      </div>
    );
  }

  // Compute metrics
  const activeJobs = jobs.filter(j => j.status === 'active' || j.status === 'published').length;
  const totalJobs = jobs.length;

  const totalApps = apps.length;

  // Derive stage counts from currentStage field on applications
  const stageOf = a => (a.currentStage || a.stage || a.status || '').toLowerCase();
  const hired = apps.filter(a => stageOf(a) === 'hired').length;
  const interviewsInPipeline = apps.filter(a => stageOf(a).includes('interview')).length;
  const interviewsDone = apps.filter(a => stageOf(a).includes('interview') && (a.interviewStatus === 'completed' || stageOf(a) === 'interviewed')).length;
  const interviewsUpcoming = interviewsInPipeline - interviewsDone;

  const offersSent = apps.filter(a => stageOf(a).includes('offer')).length;
  const offersAccepted = apps.filter(a => ['offer accepted', 'hired'].includes(stageOf(a))).length;
  const offerAcceptRate = offersSent > 0 ? Math.round((offersAccepted / offersSent) * 100) : 0;

  // Avg time to fill (days from job createdAt to first hired app on that job)
  let avgDaysToFill = null;
  const filledJobIds = [...new Set(apps.filter(a => a.stage === 'hired' || a.status === 'hired').map(a => a.jobId || a.job))].filter(Boolean);
  if (filledJobIds.length > 0) {
    const daysArr = filledJobIds.map(jid => {
      const job = jobs.find(j => String(j.id || j._id) === String(jid));
      if (!job?.createdAt) return null;
      const hiredApps = apps.filter(a => String(a.jobId || a.job) === String(jid) && (a.stage === 'hired' || a.status === 'hired'));
      if (!hiredApps.length) return null;
      const earliest = hiredApps.reduce((m, a) => {
        const d = new Date(a.updatedAt || a.createdAt);
        return d < m ? d : m;
      }, new Date());
      return Math.max(0, Math.round((earliest - new Date(job.createdAt)) / (1000 * 60 * 60 * 24)));
    }).filter(d => d !== null);
    if (daysArr.length) avgDaysToFill = Math.round(daysArr.reduce((s, d) => s + d, 0) / daysArr.length);
  }

  // Funnel for current month
  const thisMonth = new Date();
  thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
  const appsThisMonth = apps.filter(a => new Date(a.createdAt) >= thisMonth).length;
  const hiredThisMonth = apps.filter(a => (a.stage === 'hired' || a.status === 'hired') && new Date(a.updatedAt || a.createdAt) >= thisMonth).length;

  // Stage funnel counts
  const stageMap = {};
  apps.forEach(a => {
    const s = a.stage || a.status || 'applied';
    stageMap[s] = (stageMap[s] || 0) + 1;
  });
  const stageFunnel = [
    { label: 'Applied', key: 'applied', color: '#0176D3' },
    { label: 'Screening', key: 'screening', color: '#7c3aed' },
    { label: 'Interview', key: 'interview', color: '#f59e0b' },
    { label: 'Offered', key: 'offer', color: '#10b981' },
    { label: 'Hired', key: 'hired', color: '#2E844A' },
  ].map(s => ({
    ...s,
    count: apps.filter(a => (a.stage || a.status || '').toLowerCase().includes(s.key)).length,
  }));
  const funnelMax = Math.max(...stageFunnel.map(s => s.count), 1);

  return (
    <div style={{ paddingBottom: 60, animation: 'tn-fadein 0.3s ease both' }}>
      <PageHeader
        title="My Performance"
        subtitle="Your personal recruiting metrics — track placements, pipeline health, and offer success."
      />

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <KpiCard icon="💼" label="Total Jobs" value={totalJobs} sub={`${activeJobs} active`} color="#0176D3" />
        <KpiCard icon="📋" label="Total Applications" value={totalApps} sub={`+${appsThisMonth} this month`} color="#7c3aed" />
        <KpiCard icon="🏆" label="Candidates Hired" value={hired} sub={`${hiredThisMonth} this month`} color="#2E844A" />
        <KpiCard icon="📅" label="Interviews Done" value={interviewsDone} sub={`${interviewsUpcoming} upcoming`} color="#f59e0b" />
        <KpiCard icon="📄" label="Offers Sent" value={offersSent} sub={`${offerAcceptRate}% accepted`} color="#10b981" />
        {avgDaysToFill !== null && (
          <KpiCard icon="⏱️" label="Avg. Days to Hire" value={avgDaysToFill} sub="from job post to hire" color="#e11d48" />
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {/* Pipeline Funnel */}
        <div style={{ ...card, padding: '24px' }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#0F172A', marginBottom: 20 }}>Pipeline Funnel</div>
          {stageFunnel.map(s => (
            <MiniBar key={s.key} label={s.label} value={s.count} max={funnelMax} color={s.color} />
          ))}
          {totalApps === 0 && <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', margin: '20px 0' }}>No applications yet.</p>}
        </div>

        {/* Offer Performance */}
        <div style={{ ...card, padding: '24px' }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#0F172A', marginBottom: 20 }}>Offer Performance</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            {[
              { label: 'Sent', value: offersSent, color: '#0176D3' },
              { label: 'Accepted', value: offersAccepted, color: '#2E844A' },
              { label: 'Declined', value: Math.max(0, offersSent - offersAccepted), color: '#e11d48' },
            ].map(o => (
              <div key={o.label} style={{ flex: 1, minWidth: 80, textAlign: 'center', padding: '14px 10px', background: `${o.color}10`, borderRadius: 12 }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: o.color }}>{o.value}</div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{o.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#f1f5f9', borderRadius: 10, height: 12, overflow: 'hidden' }}>
            <div style={{ width: `${offerAcceptRate}%`, background: 'linear-gradient(90deg,#10b981,#2E844A)', height: '100%', borderRadius: 10, transition: 'width 0.6s' }} />
          </div>
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 13, fontWeight: 700, color: '#2E844A' }}>
            {offerAcceptRate}% Acceptance Rate
          </div>
        </div>

        {/* Top Jobs by Applications */}
        <div style={{ ...card, padding: '24px', gridColumn: 'span 1' }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#0F172A', marginBottom: 16 }}>Top Jobs by Applications</div>
          {jobs.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>No jobs yet.</p>
          ) : (
            jobs.slice(0, 6).map(j => {
              const jid = String(j.id || j._id);
              const cnt = apps.filter(a => String(a.jobId || a.job) === jid).length;
              return (
                <div key={jid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{j.status || 'active'}</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#0176D3', flexShrink: 0 }}>{cnt}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
