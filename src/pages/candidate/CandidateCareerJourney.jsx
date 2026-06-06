import React, { useState, useEffect } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { api } from '../../api/api.js';

const STAGE_ORDER = ['applied','screening','shortlisted','interview_scheduled','interview_completed','offer_extended','selected'];
const STAGE_META = {
  applied:             { icon:'📝', label:'Applied',     color:'#64748B' },
  screening:           { icon:'🔍', label:'Screening',   color:'#0176D3' },
  shortlisted:         { icon:'⭐', label:'Shortlisted', color:'#7C3AED' },
  interview_scheduled: { icon:'📅', label:'Interview',   color:'#F59E0B' },
  interview_completed: { icon:'✅', label:'Completed',   color:'#059669' },
  offer_extended:      { icon:'🎉', label:'Offered',     color:'#15803D' },
  selected:            { icon:'🏆', label:'Hired',       color:'#2E844A' },
  rejected:            { icon:'✕',  label:'Rejected',    color:'#BA0517' },
  withdrawn:           { icon:'↩️', label:'Withdrawn',   color:'#9CA3AF' },
};

function stageIndex(stage) {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx === -1 ? -1 : idx;
}

function getJobField(a, field) {
  return a.jobId?.[field] || a.job?.[field] || '';
}

function MilestoneDots({ stage }) {
  const curr = stageIndex(stage);
  const isNeg = stage === 'rejected' || stage === 'withdrawn';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:2, flexWrap:'wrap', marginTop:6 }}>
      {STAGE_ORDER.map((s, i) => {
        const reached = !isNeg && i <= curr;
        const meta = STAGE_META[s];
        return (
          <div
            key={s}
            title={meta.label}
            style={{
              width: 10, height: 10, borderRadius:'50%',
              background: reached ? meta.color : '#E2E8F0',
              border: `2px solid ${reached ? meta.color : '#CBD5E1'}`,
              flexShrink: 0,
            }}
          />
        );
      })}
      {isNeg && (
        <span style={{ fontSize:10, color: STAGE_META[stage]?.color, fontWeight:700, marginLeft:4 }}>
          {STAGE_META[stage]?.label}
        </span>
      )}
    </div>
  );
}

function ApplicationCard({ app, index }) {
  const stage    = app.stage || 'applied';
  const meta     = STAGE_META[stage] || STAGE_META.applied;
  const title    = getJobField(app, 'title') || 'Job';
  const company  = getJobField(app, 'companyName') || getJobField(app, 'company') || 'Company';
  const location = getJobField(app, 'location');
  const date     = app.createdAt ? new Date(app.createdAt) : null;
  const isHired  = stage === 'selected';
  const isOffer  = stage === 'offer_extended';

  return (
    <div style={{ display:'flex', gap:14, position:'relative' }}>
      {/* Timeline line */}
      {index > 0 && (
        <div style={{ position:'absolute', left:19, top:-24, width:2, height:24, background:'#E2E8F0' }} />
      )}

      {/* Node */}
      <div style={{
        width:40, height:40, borderRadius:'50%',
        background: isHired ? 'linear-gradient(135deg,#059669,#047857)' : isOffer ? 'linear-gradient(135deg,#15803D,#16a34a)' : `${meta.color}18`,
        border: `2px solid ${meta.color}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:16, flexShrink:0, boxShadow: isHired ? '0 4px 12px rgba(5,150,105,0.35)' : 'none',
      }}>
        {meta.icon}
      </div>

      {/* Card */}
      <div style={{
        flex:1, borderRadius:12,
        border: `1.5px solid ${isHired ? '#6EE7B7' : isOffer ? '#A7F3D0' : '#E2E8F0'}`,
        padding:'12px 16px', marginBottom:20,
        boxShadow: isHired ? '0 4px 16px rgba(5,150,105,0.12)' : '0 1px 4px rgba(0,0,0,0.04)',
        background: isHired ? 'linear-gradient(135deg,#F0FDF4,#fff)' : '#fff',
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:800, fontSize:14, color:'#0A1628', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{title}</div>
            <div style={{ fontSize:12, color:'#0176D3', marginTop:2 }}>{company}{location ? ` · ${location}` : ''}</div>
          </div>
          <div style={{
            padding:'3px 10px', borderRadius:99, fontSize:10, fontWeight:800, flexShrink:0,
            background:`${meta.color}18`, color: meta.color, border:`1px solid ${meta.color}40`,
          }}>
            {meta.icon} {meta.label}
          </div>
        </div>

        <MilestoneDots stage={stage} />

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:8, flexWrap:'wrap', gap:4 }}>
          <span style={{ fontSize:10, color:'#9CA3AF' }}>
            Applied {date ? date.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'}
          </span>
          {app.talentMatchScore != null && (
            <span style={{ fontSize:10, fontWeight:700, color: app.talentMatchScore >= 75 ? '#059669' : app.talentMatchScore >= 50 ? '#D97706' : '#DC2626' }}>
              🎯 {Math.round(app.talentMatchScore)}% match
            </span>
          )}
          {app.source === 'admin_assign' && (
            <span style={{ fontSize:10, fontWeight:700, color:'#0176D3', background:'rgba(1,118,211,0.08)', borderRadius:99, padding:'2px 8px' }}>🎯 Added by HR</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CandidateCareerJourney({ user }) {
  const [apps, setApps]   = useState([]);
  const [loading, setLoad] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.getMyApplications()
      .then(r => setApps(Array.isArray(r) ? r : (r?.data || [])))
      .catch(() => setApps([]))
      .finally(() => setLoad(false));
  }, []);

  const sorted = [...apps].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const filtered = filter === 'all' ? sorted : sorted.filter(a => {
    if (filter === 'active')   return !['rejected','withdrawn','selected'].includes(a.stage);
    if (filter === 'hired')    return a.stage === 'selected';
    if (filter === 'rejected') return a.stage === 'rejected';
    return true;
  });

  // Stats
  const total      = apps.length;
  const interviews = apps.filter(a => ['interview_scheduled','interview_completed','offer_extended','selected'].includes(a.stage)).length;
  const offers     = apps.filter(a => ['offer_extended','selected'].includes(a.stage)).length;
  const hired      = apps.filter(a => a.stage === 'selected').length;
  const interviewRate = total ? Math.round((interviews / total) * 100) : 0;
  const offerRate     = total ? Math.round((offers / total) * 100)     : 0;

  const motivational = hired > 0
    ? `🎊 Congratulations! You've landed ${hired} offer${hired > 1 ? 's' : ''}.`
    : interviews > 0
      ? `👏 Great progress! You're in the interview stage for ${interviews} role${interviews > 1 ? 's' : ''}.`
      : total > 3
        ? '💪 Keep applying! Your perfect role is out there.'
        : total > 0
          ? '🚀 Great start! Every application is a step forward.'
          : '✨ Start applying to track your journey here.';

  return (
    <div style={{ maxWidth: 720, margin:'0 auto' }}>
      <PageHeader
        title="Career Journey"
        subtitle="Your full job search history — every step of the way"
      />

      {/* Motivational banner */}
      <div style={{ background:'linear-gradient(135deg,#0A1628,#0176D3)', borderRadius:16, padding:'16px 20px', marginBottom:20, display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ fontSize:36, flexShrink:0 }}>🗺️</div>
        <div>
          <div style={{ color:'#fff', fontWeight:800, fontSize:15 }}>{motivational}</div>
          <div style={{ color:'rgba(255,255,255,0.65)', fontSize:12, marginTop:3 }}>
            {total} application{total !== 1 ? 's' : ''} · {interviewRate}% interview rate · {offerRate}% offer rate
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
        {[
          { label:'Applied',    value: total,      icon:'📝', color:'#0176D3' },
          { label:'Interviews', value: interviews,  icon:'📅', color:'#F59E0B' },
          { label:'Offers',     value: offers,      icon:'🎉', color:'#059669' },
          { label:'Hired',      value: hired,       icon:'🏆', color:'#2E844A' },
        ].map(s => (
          <div key={s.label} style={{ background:'#fff', borderRadius:12, border:'1px solid #E2E8F0', padding:'14px 10px', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize:22 }}>{s.icon}</div>
            <div style={{ fontWeight:900, fontSize:22, color: s.color, marginTop:4 }}>{s.value}</div>
            <div style={{ fontSize:10, color:'#6B7280', fontWeight:600, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
        {[
          { id:'all',      label:`All (${total})` },
          { id:'active',   label:`Active (${apps.filter(a => !['rejected','withdrawn','selected'].includes(a.stage)).length})` },
          { id:'hired',    label:`Hired (${hired})` },
          { id:'rejected', label:`Closed (${apps.filter(a => a.stage === 'rejected').length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)} style={{
            padding:'6px 14px', borderRadius:99, fontSize:12, fontWeight:600, cursor:'pointer',
            background: filter === t.id ? '#0176D3' : '#fff',
            color: filter === t.id ? '#fff' : '#374151',
            border: `1px solid ${filter === t.id ? '#0176D3' : '#E2E8F0'}`,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {loading ? (
        <div style={{ textAlign:'center', padding:48 }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', padding:'48px 24px', textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
          <div style={{ fontWeight:700, color:'#374151', marginBottom:6 }}>No applications found</div>
          <div style={{ color:'#9CA3AF', fontSize:13 }}>
            {filter === 'all' ? 'Apply to jobs to see your career journey here.' : 'No applications match this filter.'}
          </div>
        </div>
      ) : (
        <div style={{ paddingLeft:4 }}>
          {filtered.map((app, i) => (
            <ApplicationCard key={String(app.id || app._id)} app={app} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
