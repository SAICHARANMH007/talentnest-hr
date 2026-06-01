import React, { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { card, btnP, btnG, btnD } from '../../constants/styles.js';

const DEFAULT_STAGE_COLORS = ['#0176D3', '#059669', '#D97706', '#7C3AED', '#DC2626', '#0891B2', '#BE185D'];
const STAGE_PRESETS = [
  ['Applied', 'Screening', 'Interview Round 1', 'Interview Round 2', 'Offer', 'Hired'],
  ['Applied', 'Phone Screen', 'Technical Test', 'Panel Interview', 'Offer', 'Hired'],
  ['Applied', 'Shortlisted', 'HR Round', 'Technical Round', 'Final Round', 'Offer', 'Hired'],
];

function StageRow({ stage, idx, total, onChange, onMove, onDelete }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
      <span style={{ fontSize: 13, color: '#9CA3AF', width: 20, textAlign: 'right', flexShrink: 0 }}>{idx + 1}</span>
      <input
        type="color"
        value={stage.color || '#0176D3'}
        onChange={e => onChange('color', e.target.value)}
        style={{ width: 28, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 2, background: 'none' }}
      />
      <input
        value={stage.name}
        onChange={e => onChange('name', e.target.value)}
        placeholder="Stage name…"
        style={{ flex: 1, border: '1px solid #E2E8F0', borderRadius: 8, padding: '7px 10px', fontSize: 13 }}
      />
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6B7280', cursor: 'pointer', flexShrink: 0 }}>
        <input type="checkbox" checked={!!stage.isDefault} onChange={e => onChange('isDefault', e.target.checked)} />
        Default
      </label>
      <button onClick={() => onMove(-1)} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', fontSize: 14, color: idx === 0 ? '#D1D5DB' : '#6B7280' }}>↑</button>
      <button onClick={() => onMove(1)} disabled={idx === total - 1} style={{ background: 'none', border: 'none', cursor: idx === total - 1 ? 'default' : 'pointer', fontSize: 14, color: idx === total - 1 ? '#D1D5DB' : '#6B7280' }}>↓</button>
      <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 16, padding: '0 4px' }}>×</button>
    </div>
  );
}

export default function CustomHiringStages() {
  const [jobs, setJobs]         = useState([]);
  const [loadingJobs, setLJ]    = useState(true);
  const [selectedJob, setJob]   = useState(null);
  const [stages, setStages]     = useState([]);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');

  useEffect(() => {
    api.getJobs({ limit: 200, status: 'active' })
      .then(r => setJobs(Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : [])))
      .catch(() => setJobs([]))
      .finally(() => setLJ(false));
  }, []);

  const selectJob = async (jobId) => {
    const job = jobs.find(j => (j._id || j.id) === jobId);
    setJob(job || null);
    if (job) {
      const existing = job.customStages || [];
      setStages(existing.length > 0 ? existing.map((s, i) => ({ ...s, order: i })) : []);
    } else {
      setStages([]);
    }
  };

  const addStage = () => setStages(ss => [...ss, { name: '', color: DEFAULT_STAGE_COLORS[ss.length % DEFAULT_STAGE_COLORS.length], order: ss.length, isDefault: false }]);

  const setStage = (idx, key, val) => setStages(ss => ss.map((s, i) => i === idx ? { ...s, [key]: val } : s));

  const moveStage = (idx, dir) => {
    const nw = [...stages];
    const swap = idx + dir;
    if (swap < 0 || swap >= nw.length) return;
    [nw[idx], nw[swap]] = [nw[swap], nw[idx]];
    setStages(nw.map((s, i) => ({ ...s, order: i })));
  };

  const removeStage = (idx) => setStages(ss => ss.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })));

  const applyPreset = (preset) => setStages(preset.map((name, i) => ({ name, color: DEFAULT_STAGE_COLORS[i % DEFAULT_STAGE_COLORS.length], order: i, isDefault: i === 0 })));

  const save = async () => {
    if (!selectedJob) return;
    if (stages.some(s => !s.name.trim())) { setMsg('All stage names must be filled.'); return; }
    setSaving(true);
    try {
      const jobId = selectedJob._id || selectedJob.id;
      await api.updateJobCustomStages(jobId, stages.map((s, i) => ({ name: s.name.trim(), color: s.color, order: i, isDefault: !!s.isDefault })));
      setMsg('Custom stages saved for this job.');
      // Update local job object
      setJobs(js => js.map(j => (j._id || j.id) === jobId ? { ...j, customStages: stages } : j));
    } catch (e) { setMsg(e?.message || 'Save failed.'); }
    setSaving(false);
  };

  const clearCustom = async () => {
    if (!selectedJob || !window.confirm('Remove custom stages and revert to global pipeline?')) return;
    const jobId = selectedJob._id || selectedJob.id;
    try {
      await api.updateJobCustomStages(jobId, []);
      setStages([]);
      setMsg('Reverted to global pipeline stages.');
      setJobs(js => js.map(j => (j._id || j.id) === jobId ? { ...j, customStages: [] } : j));
    } catch (e) { setMsg(e?.message || 'Failed.'); }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A1628', margin: 0 }}>Custom Hiring Stages</h1>
        <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>Define unique pipeline stages for individual jobs</p>
      </div>

      {/* Job selector */}
      <div style={{ ...card, padding: '14px 16px', marginBottom: 20 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginRight: 12 }}>Select Job:</label>
        {loadingJobs ? (
          <span style={{ color: '#9CA3AF', fontSize: 13 }}>Loading jobs…</span>
        ) : (
          <select onChange={e => selectJob(e.target.value)} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px', fontSize: 14, minWidth: 320 }}>
            <option value="">— Select a job —</option>
            {jobs.map(j => (
              <option key={j._id || j.id} value={j._id || j.id}>
                {j.title} {j.customStages?.length ? `(${j.customStages.length} custom stages)` : '(global pipeline)'}
              </option>
            ))}
          </select>
        )}
      </div>

      {msg && (
        <div style={{ background: '#D1FAE5', color: '#065F46', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
          {msg}
          <button onClick={() => setMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'inherit' }}>×</button>
        </div>
      )}

      {selectedJob && (
        <div style={{ ...card }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0A1628', marginBottom: 4 }}>{selectedJob.title}</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
            {stages.length === 0 ? 'Using global org pipeline. Add stages below to customize.' : `${stages.length} custom stages defined.`}
          </div>

          {/* Presets */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Quick Presets:</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {STAGE_PRESETS.map((p, i) => (
                <button key={i} onClick={() => applyPreset(p)} style={{ ...btnG, fontSize: 11, padding: '4px 10px' }}>
                  Preset {i + 1} ({p.length} stages)
                </button>
              ))}
            </div>
          </div>

          {/* Stages list */}
          <div style={{ marginBottom: 14 }}>
            {stages.map((s, i) => (
              <StageRow
                key={i}
                stage={s}
                idx={i}
                total={stages.length}
                onChange={(k, v) => setStage(i, k, v)}
                onMove={(dir) => moveStage(i, dir)}
                onDelete={() => removeStage(i)}
              />
            ))}
            {stages.length === 0 && (
              <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No custom stages. Using global pipeline.</div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={addStage} style={{ ...btnG }}>+ Add Stage</button>
            <button onClick={save} disabled={saving || stages.length === 0} style={{ ...btnP }}>{saving ? 'Saving…' : 'Save Stages'}</button>
            {stages.length > 0 && (
              <button onClick={clearCustom} style={{ ...btnD, fontSize: 13 }}>Revert to Global</button>
            )}
          </div>

          {/* Preview */}
          {stages.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Pipeline Preview:</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {stages.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ background: `${s.color}20`, color: s.color, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700, border: `1px solid ${s.color}40` }}>{s.name || `Stage ${i + 1}`}</span>
                    {i < stages.length - 1 && <span style={{ color: '#D1D5DB', fontSize: 16 }}>›</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!selectedJob && !loadingJobs && (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔄</div>
          <div style={{ color: '#6B7280', fontSize: 14 }}>Select a job above to configure its custom hiring stages.</div>
        </div>
      )}
    </div>
  );
}
