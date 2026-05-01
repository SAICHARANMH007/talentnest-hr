import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Toast from '../../components/ui/Toast.jsx';
import { btnP, btnG, btnD, card } from '../../constants/styles.js';
import { api } from '../../api/api.js';
import UserDetailDrawer from '../../components/shared/UserDetailDrawer.jsx';

const PIPELINE_STAGES = [
  'Applied', 'Screening', 'Shortlisted',
  'Interview Round 1', 'Interview Round 2',
  'Offer', 'Hired', 'Rejected',
];
const STAGE_COLOR = {
  'Applied': '#0176D3', 'Screening': '#7c3aed', 'Shortlisted': '#f59e0b',
  'Interview Round 1': '#06b6d4', 'Interview Round 2': '#8b5cf6',
  'Offer': '#10b981', 'Hired': '#059669', 'Rejected': '#ef4444',
};

export default function SuperAdminCandidates() {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [stats, setStats] = useState({ total: 0, applied: 0, platform: 0 });
  const [drawerUser, setDrawerUser] = useState(null);
  const [pipelineCandidate, setPipelineCandidate] = useState(null); // candidate whose apps we show
  const [stageChanging, setStageChanging] = useState(null); // appId being updated
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      if (tab === 'platform') {
        res = await api.getUsersList({ role: 'candidate', page, limit, search });
      } else {
        res = await api.getCandidateRecords({ page, limit, search, platform: true, appliedOnly: tab === 'applied' });
      }

      const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setCandidates(data.map(c => ({
        ...c,
        id: c.id || c._id,
        isApplied: c.isApplied || c.recordType === 'Application',
        isPlatformUser: c.isPlatformUser || c.recordType === 'Candidate Account' || !!c.userId,
      })));

      if (res?.pagination) setPagination(res.pagination);
      else setPagination({ total: data.length, pages: 1 });

      // Stats counts
      const [allCount, regCount, appCount] = await Promise.all([
        api.getCandidateRecords({ limit: 1, platform: true }),
        api.getUsersList({ role: 'candidate', limit: 1 }),
        api.getCandidateRecords({ limit: 1, platform: true, appliedOnly: true }),
      ]);
      setStats({
        total: allCount?.pagination?.total ?? 0,
        platform: regCount?.pagination?.total ?? 0,
        applied: appCount?.pagination?.total ?? 0,
      });
    } catch (err) {
      setToast('Failed to load: ' + err.message);
    }
    setLoading(false);
  }, [page, search, tab]);

  useEffect(() => { load(); }, [load]);

  const handleTabChange = (t) => { setTab(t); setPage(1); };

  // ── Stage change ──────────────────────────────────────────────────────────
  const changeStage = async (appId, newStage) => {
    setStageChanging(appId);
    try {
      await api.updateStage(appId, newStage);
      // Update local pipeline view
      setPipelineCandidate(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          allApplications: prev.allApplications.map(a =>
            a.id === appId ? { ...a, stage: newStage } : a
          ),
        };
      });
      // Refresh candidate list to update counts
      await load();
      setToast(`✅ Moved to ${newStage}`);
    } catch (e) {
      setToast('❌ Failed: ' + e.message);
    }
    setStageChanging(null);
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <PageHeader
        title="Unified Talent Database"
        subtitle="All platform candidates — registered users and career page applicants"
        actions={<button onClick={load} style={btnG}>🔄 Refresh</button>}
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard label="Total Talent Pool" value={stats.total} icon="👥" color="#0176D3" />
        <StatCard label="Career Page Applicants" value={stats.applied} icon="📝" color="#10b981" />
        <StatCard label="Platform Registered" value={stats.platform} icon="🌐" color="#7c3aed" />
      </div>

      {/* Filters */}
      <div style={{ ...card, padding: '14px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { key: 'all',      label: 'All Records',      count: stats.total },
            { key: 'applied',  label: 'Career Applicants', count: stats.applied },
            { key: 'platform', label: 'Registered Users',  count: stats.platform },
          ].map(t => (
            <button key={t.key} onClick={() => handleTabChange(t.key)}
              style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: tab === t.key ? '#0176D3' : 'transparent', color: tab === t.key ? '#fff' : '#64748B', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {t.label}
              <span style={{ background: tab === t.key ? 'rgba(255,255,255,0.2)' : '#F1F5F9', padding: '1px 7px', borderRadius: 6, fontSize: 11 }}>{t.count}</span>
            </button>
          ))}
        </div>
        <input
          placeholder="Search name, email…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 13, outline: 'none', width: 280, boxSizing: 'border-box' }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spinner size={36} /></div>
      ) : (
        <>
          <div style={{ ...card, overflow: 'hidden', marginBottom: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={thS}>Candidate</th>
                  <th style={thS}>Contact</th>
                  <th style={thS}>Type</th>
                  <th style={thS}>Applications</th>
                  <th style={thS}>Organisation</th>
                  <th style={thS}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>No candidates found.</td></tr>
                ) : candidates.map(c => (
                  <tr key={c.id || c._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={tdS}>
                      <div style={{ fontWeight: 700, color: '#0A1628' }}>{c.name || c.candidateName || 'Anonymous'}</div>
                      <div style={{ fontSize: 11, color: '#706E6B' }}>{c.title || '—'}</div>
                    </td>
                    <td style={tdS}>
                      <div style={{ fontSize: 12 }}>{c.email || '—'}</div>
                      <div style={{ fontSize: 11, color: '#706E6B' }}>{c.phone || '—'}</div>
                    </td>
                    <td style={tdS}>
                      <Badge label={c.isApplied ? 'Applicant' : 'Registered'} color={c.isApplied ? '#10b981' : '#7c3aed'} />
                      <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 3 }}>{c.source || 'N/A'}</div>
                    </td>
                    <td style={tdS}>
                      {/* Clickable app count → opens pipeline modal */}
                      <button
                        onClick={() => c.applicationCount > 0 && setPipelineCandidate(c)}
                        disabled={!c.applicationCount}
                        style={{ fontWeight: 700, fontSize: 15, color: c.applicationCount > 0 ? '#0176D3' : '#94A3B8', background: 'none', border: 'none', cursor: c.applicationCount > 0 ? 'pointer' : 'default', textDecoration: c.applicationCount > 0 ? 'underline' : 'none', padding: 0 }}
                        title={c.applicationCount > 0 ? 'Click to view pipeline' : 'No applications'}
                      >
                        {c.applicationCount || 0}
                      </button>
                      <div style={{ fontSize: 10, color: '#94A3B8' }}>applications</div>
                    </td>
                    <td style={tdS}>
                      <div style={{ fontSize: 12, color: '#706E6B' }}>{c.organisation || c.orgName || '—'}</div>
                    </td>
                    <td style={tdS}>
                      <button onClick={() => setDrawerUser(c)} style={{ ...btnG, padding: '4px 12px', fontSize: 11 }}>
                        Deep Dive
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ ...btnG, opacity: page === 1 ? 0.5 : 1 }}>← Prev</button>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#64748B' }}>Page {page} of {pagination.pages}</span>
              <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} style={{ ...btnG, opacity: page === pagination.pages ? 0.5 : 1 }}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* ── Pipeline Modal ─────────────────────────────────────────────────── */}
      {pipelineCandidate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 680, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0A1628' }}>
                  {pipelineCandidate.name || pipelineCandidate.candidateName || 'Candidate'} — Applications
                </h2>
                <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 13 }}>{pipelineCandidate.email}</p>
              </div>
              <button onClick={() => setPipelineCandidate(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94A3B8' }}>✕</button>
            </div>

            {(!pipelineCandidate.allApplications || pipelineCandidate.allApplications.length === 0) ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>No application details available.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pipelineCandidate.allApplications.map(app => (
                  <div key={app.id} style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px', background: '#F8FAFC' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#0A1628' }}>{app.jobTitle || 'Unknown Job'}</div>
                        <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                          Applied: {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Current stage badge */}
                        <span style={{ background: `${STAGE_COLOR[app.stage] || '#64748B'}18`, color: STAGE_COLOR[app.stage] || '#64748B', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                          {app.stage || 'Applied'}
                        </span>
                      </div>
                    </div>

                    {/* Stage change dropdown */}
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Move to:</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {PIPELINE_STAGES.map(stage => (
                          <button
                            key={stage}
                            disabled={stage === app.stage || stageChanging === app.id}
                            onClick={() => changeStage(app.id, stage)}
                            style={{
                              padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: stage === app.stage ? 'default' : 'pointer',
                              border: `1px solid ${STAGE_COLOR[stage] || '#E2E8F0'}`,
                              background: stage === app.stage ? (STAGE_COLOR[stage] || '#0176D3') : '#fff',
                              color: stage === app.stage ? '#fff' : (STAGE_COLOR[stage] || '#374151'),
                              opacity: stageChanging === app.id && stage !== app.stage ? 0.5 : 1,
                            }}
                          >
                            {stageChanging === app.id && stage !== app.stage ? '…' : stage}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {drawerUser && <UserDetailDrawer user={drawerUser} onClose={() => setDrawerUser(null)} />}
      <Toast msg={toast} onClose={() => setToast('')} />
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{ ...card, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: `${color}14`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );
}

const thS = { padding: '12px 20px', fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 };
const tdS = { padding: '14px 20px', verticalAlign: 'middle' };
