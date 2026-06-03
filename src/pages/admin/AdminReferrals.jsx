import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../api/api.js';
import { card, btnP, btnG, btnD } from '../../constants/styles.js';

const STATUS_STYLE = {
  pending: { background: '#FEF9C3', color: '#A16207' },
  applied: { background: '#EFF6FF', color: '#1D4ED8' },
  hired:   { background: '#D1FAE5', color: '#065F46' },
};

function StatCard({ label, value, sub, color = '#0176D3' }) {
  return (
    <div style={{ ...card, textAlign: 'center', padding: '16px 12px', flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 26, fontWeight: 800, color }}>{value ?? '—'}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#9CA3AF' }}>{sub}</div>}
    </div>
  );
}

function GenerateModal({ jobs, onClose, onCreated, user }) {
  const [jobId, setJobId]   = useState('');
  const [name, setName]     = useState(user?.name || '');
  const [email, setEmail]   = useState(user?.email || '');
  const [reward, setReward] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [genError, setGenError] = useState('');
  const isStaff = ['admin', 'super_admin', 'recruiter'].includes(user?.role);

  // Pre-fill reward from selected job
  const selectedJob = jobs.find(j => (j._id || j.id) === jobId);
  useEffect(() => {
    if (selectedJob?.referralReward != null && !reward) {
      setReward(String(selectedJob.referralReward));
    }
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  const generate = async () => {
    if (!jobId) return;
    setSaving(true);
    setGenError('');
    try {
      const payload = { jobId, referrerName: name, referrerEmail: email };
      if (isStaff && reward) payload.rewardAmount = Number(reward);
      const r = await api.generateReferralLink(payload);
      setResult(r?.link || r?.data?.link || '');
      onCreated?.();
    } catch (e) {
      setGenError(e?.message || 'Failed to generate link. Please try again.');
    }
    setSaving(false);
  };

  const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13, boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...card, width: '100%', maxWidth: 460, padding: 28 }}>
        <h3 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 700 }}>🔗 Generate Referral Link</h3>
        {!result ? (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Job *</label>
              <select value={jobId} onChange={e => setJobId(e.target.value)} style={{ ...inp, background: '#fff' }}>
                <option value="">Select a job</option>
                {jobs.map(j => (
                  <option key={j._id || j.id} value={j._id || j.id}>
                    {j.title}{j.referralReward ? ` — ₹${j.referralReward?.toLocaleString()} reward` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Referrer Name</label>
              <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="Employee name" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Referrer Email</label>
              <input style={inp} value={email} onChange={e => setEmail(e.target.value)} placeholder="employee@company.com" type="email" />
            </div>
            {isStaff && (
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Reward Amount (₹){selectedJob?.referralReward ? ` — job default: ₹${selectedJob.referralReward?.toLocaleString()}` : ' (optional)'}
                </label>
                <input style={inp} value={reward} onChange={e => setReward(e.target.value)} placeholder="e.g. 5000" type="number" min="0" />
              </div>
            )}
            {genError && <div style={{ color: '#DC2626', fontSize: 12, marginBottom: 10, padding: '8px 10px', background: '#FEF2F2', borderRadius: 6 }}>{genError}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={btnG} onClick={onClose}>Cancel</button>
              <button style={btnP} onClick={generate} disabled={!jobId || saving}>{saving ? 'Generating…' : 'Generate Link'}</button>
            </div>
          </>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: '#374151', marginBottom: 10 }}>Share this link with the referrer:</p>
            <div style={{ background: '#EFF6FF', borderRadius: 8, padding: '10px 14px', marginBottom: 14, wordBreak: 'break-all' }}>
              <code style={{ fontSize: 12, color: '#1D4ED8' }}>{result}</code>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnP} onClick={() => navigator.clipboard?.writeText(result)}>📋 Copy Link</button>
              <button style={btnG} onClick={onClose}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RewardModal({ job, onClose, onSaved }) {
  const [reward, setReward]   = useState(job.referralReward != null ? String(job.referralReward) : '');
  const [enabled, setEnabled] = useState(job.referralEnabled !== false);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      await api.setJobReferralReward(job._id || job.id, {
        rewardAmount  : reward === '' ? null : Number(reward),
        referralEnabled: enabled,
      });
      onSaved?.();
      onClose();
    } catch (e) {
      setErr(e?.message || 'Failed to save.');
    }
    setSaving(false);
  };

  const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13, boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...card, width: '100%', maxWidth: 400, padding: 28 }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700 }}>💰 Set Referral Reward</h3>
        <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 18 }}>{job.title}</p>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} style={{ accentColor: '#0176D3', width: 16, height: 16 }} />
            Enable Refer & Earn for this job
          </label>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Reward Amount (₹)</label>
          <input style={inp} value={reward} onChange={e => setReward(e.target.value)} placeholder="e.g. 5000 (leave blank = no reward)" type="number" min="0" disabled={!enabled} />
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0' }}>Paid when a referred candidate is marked as hired.</p>
        </div>
        {err && <div style={{ color: '#DC2626', fontSize: 12, marginBottom: 10 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button style={btnG} onClick={onClose}>Cancel</button>
          <button style={btnP} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminReferrals({ user }) {
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats]         = useState(null);
  const [jobs, setJobs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [rewardJob, setRewardJob] = useState(null);
  const [tab, setTab]             = useState('referrals'); // 'referrals' | 'jobs'
  const [viewAll, setViewAll]     = useState(false); // super_admin cross-tenant view
  const isSuperAdmin = user?.role === 'super_admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = isSuperAdmin && viewAll ? { all: '1' } : {};
      const [refs, st, js] = await Promise.all([
        api.getReferrals(params),
        api.getReferralStats(params),
        api.getJobs({ limit: 200 }),
      ]);
      setReferrals(Array.isArray(refs) ? refs : (refs?.data || []));
      setStats(st?.data || st);
      setJobs(Array.isArray(js) ? js : (js?.data || js?.jobs || []));
    } catch {}
    setLoading(false);
  }, [viewAll, isSuperAdmin]);

  useEffect(() => { load(); }, [load]);

  const markHired = async (id) => {
    try { await api.markReferralHired(id); load(); } catch {}
  };

  const payReward = async (id) => {
    if (!window.confirm('Mark reward as paid?')) return;
    try { await api.payReferralReward(id); load(); } catch {}
  };

  const tabStyle = (active) => ({
    padding: '8px 18px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13,
    cursor: 'pointer', background: active ? '#0176D3' : '#F1F5F9', color: active ? '#fff' : '#374151',
  });

  return (
    <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>👥 Referral Portal</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>Employee referrals with reward tracking.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {isSuperAdmin && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
              <input type="checkbox" checked={viewAll} onChange={e => setViewAll(e.target.checked)} style={{ accentColor: '#0176D3' }} />
              All Orgs
            </label>
          )}
          <button style={btnP} onClick={() => setShowModal(true)}>+ Generate Referral Link</button>
        </div>
      </div>

      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <StatCard label="Total Links" value={stats.total} color="#6B7280" />
          <StatCard label="Applied" value={stats.applied} color="#1D4ED8" />
          <StatCard label="Hired" value={stats.hired} color="#16A34A" />
          <StatCard label="Rewards Paid" value={stats.rewardsPaid} color="#7C3AED" />
          {stats.pendingRewards > 0 && <StatCard label="Pending Rewards" value={`₹${stats.pendingRewards?.toLocaleString()}`} color="#DC2626" sub="needs payout" />}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button style={tabStyle(tab === 'referrals')} onClick={() => setTab('referrals')}>Referrals</button>
        <button style={tabStyle(tab === 'jobs')} onClick={() => setTab('jobs')}>Job Reward Settings</button>
      </div>

      {loading ? (
        <p style={{ color: '#9CA3AF' }}>Loading…</p>
      ) : tab === 'referrals' ? (
        referrals.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <p style={{ color: '#6B7280', marginBottom: 16 }}>No referrals yet. Generate your first referral link.</p>
            <button style={btnP} onClick={() => setShowModal(true)}>Generate Referral Link</button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['Referrer', 'Job', isSuperAdmin && viewAll ? 'Org' : null, 'Candidate', 'Status', 'Reward', 'Date', 'Actions'].filter(Boolean).map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {referrals.map((r, i) => (
                  <tr key={r._id} style={{ background: i % 2 === 0 ? '#fff' : '#F9FAFB' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600 }}>{r.referredByName || '—'}</div>
                      <div style={{ color: '#9CA3AF', fontSize: 11 }}>{r.referredByEmail}</div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>{r.jobId?.title || '—'}</td>
                    {isSuperAdmin && viewAll && (
                      <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#374151' }}>{r.orgName || r.jobId?.companyName || r.jobId?.company || '—'}</td>
                    )}
                    <td style={{ padding: '10px 12px' }}>{r.candidateId?.name || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ ...STATUS_STYLE[r.status] || {}, padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {r.rewardAmount ? (
                        <span style={{ fontWeight: 600 }}>
                          ₹{r.rewardAmount?.toLocaleString()}
                          {r.rewardPaid && <span style={{ color: '#16A34A', marginLeft: 4 }}>✓ Paid</span>}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#9CA3AF' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {r.status === 'applied' && <button style={{ ...btnP, fontSize: 10, padding: '3px 8px' }} onClick={() => markHired(r._id)}>Mark Hired</button>}
                        {r.status === 'hired' && r.rewardAmount && !r.rewardPaid && <button style={{ ...btnG, fontSize: 10, padding: '3px 8px' }} onClick={() => payReward(r._id)}>Pay Reward</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* Job Reward Settings tab */
        jobs.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: 32 }}>
            <p style={{ color: '#6B7280' }}>No active jobs found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
              Set a default reward amount per job. Employees can share referral links for any active job.
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['Job Title', 'Status', 'Refer & Earn', 'Default Reward', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map((j, i) => (
                  <tr key={j._id || j.id} style={{ background: i % 2 === 0 ? '#fff' : '#F9FAFB' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{j.title}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: j.status === 'active' ? '#D1FAE5' : '#F3F4F6', color: j.status === 'active' ? '#065F46' : '#374151', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>{j.status}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {j.referralEnabled !== false
                        ? <span style={{ color: '#16A34A', fontWeight: 700 }}>✓ Enabled</span>
                        : <span style={{ color: '#9CA3AF' }}>Disabled</span>}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                      {j.referralReward ? `₹${j.referralReward?.toLocaleString()}` : <span style={{ color: '#9CA3AF' }}>Not set</span>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button style={{ ...btnG, fontSize: 11, padding: '4px 10px' }} onClick={() => setRewardJob(j)}>Set Reward</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {showModal && <GenerateModal jobs={jobs.filter(j => j.status === 'active')} user={user} onClose={() => setShowModal(false)} onCreated={load} />}
      {rewardJob && <RewardModal job={rewardJob} onClose={() => setRewardJob(null)} onSaved={load} />}
    </div>
  );
}
