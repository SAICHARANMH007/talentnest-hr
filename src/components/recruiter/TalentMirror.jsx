import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../api/api.js';
import Spinner from '../ui/Spinner.jsx';

/* ── helpers ──────────────────────────────────────────────────────────────── */
const SCORE_COLOR = s =>
  s >= 80 ? '#10B981' : s >= 65 ? '#3B82F6' : s >= 50 ? '#F59E0B' : '#EF4444';

const SCORE_LABEL = s =>
  s >= 80 ? 'Excellent' : s >= 65 ? 'Strong' : s >= 50 ? 'Good' : 'Partial';

function ScoreRing({ score, size = 52 }) {
  const r   = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = SCORE_COLOR(score);
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(0,0,0,0.07)" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fontSize={size === 52 ? 12 : 11} fontWeight={900} fill={color}>
        {score}%
      </text>
    </svg>
  );
}

function Avatar({ name, src, size = 40, color = '#0176D3' }) {
  if (src) return (
    <img src={src} alt={name}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${color}33` }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg,${color},${color}bb)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: size * 0.38, flexShrink: 0 }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

function BreakdownBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: 'var(--app-text-sec,#706E6B)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color }}>{value}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, borderRadius: 3, background: color, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function SkillChip({ label, matched, core }) {
  const bg    = matched ? (core ? '#10B98118' : '#3B82F618') : 'rgba(0,0,0,0.04)';
  const color = matched ? (core ? '#059669'   : '#1D4ED8')   : '#9CA3AF';
  const border = matched ? (core ? '#10B98140' : '#3B82F640') : 'transparent';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color, border: `1px solid ${border}`, flexShrink: 0 }}>
      {matched ? (core ? '★ ' : '✓ ') : '○ '}{label}
    </span>
  );
}

/* ── CandidateRow ─────────────────────────────────────────────────────────── */
function CandidateRow({ item, rank, onShortlist, onPark, onViewResume, idealCoreSkills = [] }) {
  const [expanded, setExpanded] = useState(false);
  const [acting, setActing]     = useState(false);
  const [done, setDone]         = useState(''); // 'shortlisted' | 'parked'
  const { candidate, smartScore, breakdown, matchedSkills, missingCoreSkills, expMatch, talentMatchScore, appliedAt, noBenchmark } = item;
  const color = SCORE_COLOR(smartScore ?? talentMatchScore ?? 0);
  const score = smartScore ?? talentMatchScore ?? 0;

  const doAction = async (action) => {
    setActing(true);
    try {
      await api.updateStage(item.applicationId, action);
      setDone(action === 'shortlisted' ? 'shortlisted' : 'parked');
      if (action === 'shortlisted') onShortlist?.(item);
      else onPark?.(item);
    } catch {}
    setActing(false);
  };

  if (done) {
    return (
      <div style={{ padding: '16px 20px', borderRadius: 16, background: done === 'shortlisted' ? '#F0FDF4' : '#F8FAFC', border: `1px solid ${done === 'shortlisted' ? '#BBF7D0' : '#E5E7EB'}`, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: 22 }}>{done === 'shortlisted' ? '✅' : '🅿️'}</span>
        <div>
          <div style={{ fontWeight: 700, color: done === 'shortlisted' ? '#166534' : '#374151', fontSize: 14 }}>{candidate.name} {done === 'shortlisted' ? 'moved to Shortlisted' : 'parked'}</div>
          <div style={{ fontSize: 12, color: '#9CA3AF' }}>Talent Mirror will refresh to update suggestions</div>
        </div>
      </div>
    );
  }

  // Skills to display: merge core + matched, cap at 8
  const allDisplaySkills = [
    ...new Set([...idealCoreSkills.slice(0, 6), ...(matchedSkills || []).slice(0, 6)])
  ].slice(0, 10);

  return (
    <div style={{
      borderRadius: 16,
      border: `1.5px solid ${expanded ? color + '44' : 'var(--app-card-border,#E5E7EB)'}`,
      background: 'var(--app-card-bg,#fff)',
      marginBottom: 10,
      overflow: 'hidden',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      boxShadow: expanded ? `0 6px 24px ${color}18` : '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      {/* Row header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer' }}
        onClick={() => setExpanded(v => !v)}>
        {/* Rank */}
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: rank <= 3 ? `linear-gradient(135deg,${color},${color}99)` : 'var(--app-input-bg,#F1F5F9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: rank <= 3 ? '#fff' : '#9CA3AF', flexShrink: 0 }}>
          {rank}
        </div>

        <Avatar name={candidate.name} src={candidate.avatarUrl} size={40} color={color} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--app-text,#0A1628)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{candidate.name}</div>
          <div style={{ fontSize: 12, color: 'var(--app-text-sec,#706E6B)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {candidate.title || 'Candidate'}
            {candidate.experience ? ` · ${candidate.experience}y exp` : ''}
            {candidate.location   ? ` · 📍 ${candidate.location}` : ''}
          </div>
          {/* Skill chips preview */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'nowrap', overflow: 'hidden', marginTop: 5 }}>
            {allDisplaySkills.slice(0, 5).map(s => (
              <SkillChip key={s} label={s}
                matched={matchedSkills?.includes(s)}
                core={idealCoreSkills.includes(s)} />
            ))}
            {allDisplaySkills.length > 5 && (
              <span style={{ fontSize: 10, color: '#9CA3AF', padding: '3px 0', alignSelf: 'center' }}>+{allDisplaySkills.length - 5}</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <ScoreRing score={score} />
          <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.03em' }}>{SCORE_LABEL(score)}</span>
        </div>

        <span style={{ fontSize: 18, color: '#CBD5E1', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>▾</span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--app-card-border,#E5E7EB)', padding: '16px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
            {/* Score breakdown */}
            {breakdown && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--app-text,#0A1628)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Match Breakdown</div>
                <BreakdownBar label="Skills Match"      value={breakdown.skillScore}  color="#10B981" />
                <BreakdownBar label="Experience Fit"    value={breakdown.expScore}    color="#3B82F6" />
                <BreakdownBar label="Role Alignment"    value={breakdown.titleScore}  color="#8B5CF6" />
                <BreakdownBar label="Profile Keywords"  value={breakdown.textScore}   color="#F59E0B" />
              </div>
            )}

            {/* Experience + missing skills */}
            <div>
              {expMatch && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--app-text,#0A1628)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Experience</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: expMatch.inRange ? '#10B981' : '#F59E0B' }}>{expMatch.candidate}y</span>
                    <span style={{ fontSize: 12, color: 'var(--app-text-sec,#9CA3AF)' }}>vs avg {expMatch.benchmark}y from shortlisted</span>
                    <span>{expMatch.inRange ? '✅' : '⚠️'}</span>
                  </div>
                </div>
              )}
              {missingCoreSkills?.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--app-text,#0A1628)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Missing Core Skills</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {missingCoreSkills.map(s => <SkillChip key={s} label={s} matched={false} core={false} />)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* All skills */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--app-text,#0A1628)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              All Skills — {matchedSkills?.length || 0} matched · {missingCoreSkills?.length || 0} core gaps
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {allDisplaySkills.map(s => (
                <SkillChip key={s} label={s}
                  matched={matchedSkills?.includes(s)}
                  core={idealCoreSkills.includes(s)} />
              ))}
              {(candidate.skills || []).filter(s => !allDisplaySkills.includes(s)).slice(0, 6).map(s => (
                <span key={s} style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'var(--app-input-bg,#F8FAFC)', color: 'var(--app-text-sec,#9CA3AF)', border: '1px solid var(--app-card-border,#E5E7EB)' }}>{s}</span>
              ))}
            </div>
          </div>

          {/* Applied info */}
          {appliedAt && (
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>
              Applied {new Date(appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {talentMatchScore > 0 && ` · Initial job match: ${talentMatchScore}%`}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => doAction('shortlisted')}
              disabled={acting}
              style={{ padding: '9px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: acting ? 'not-allowed' : 'pointer', opacity: acting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 12px rgba(16,185,129,0.35)' }}>
              {acting ? <Spinner /> : '⭐'} Add to Shortlist
            </button>
            {candidate.resumeUrl && (
              <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer"
                onClick={() => onViewResume?.(item)}
                style={{ padding: '9px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#0176D3,#014486)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 12px rgba(1,118,211,0.35)' }}>
                📄 View Resume
              </a>
            )}
            <button
              onClick={() => doAction('park')}
              disabled={acting}
              style={{ padding: '9px 18px', borderRadius: 10, background: 'transparent', border: '1.5px solid var(--app-card-border,#E5E7EB)', color: 'var(--app-text-sec,#706E6B)', fontWeight: 700, fontSize: 13, cursor: acting ? 'not-allowed' : 'pointer' }}>
              🅿️ Park
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main TalentMirror Modal ──────────────────────────────────────────────── */
export default function TalentMirror({ jobId, jobTitle, onClose, onRefreshPipeline }) {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [threshold, setThreshold] = useState(60);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  const load = useCallback(async (silent = false) => {
    if (!jobId) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const r = await api.getPipelineSmartMatch(jobId, { threshold });
      if (mountedRef.current) setData(r);
    } catch (e) {
      if (mountedRef.current) setError(e?.message || 'Failed to load suggestions');
    } finally {
      if (mountedRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, [jobId, threshold]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  const handleShortlist = () => {
    // After shortlisting, refresh pipeline & reload suggestions
    onRefreshPipeline?.();
    setTimeout(() => load(true), 1500);
  };

  const idealCoreSkills = data?.idealProfile?.coreSkills || [];
  const suggestions     = data?.suggestions || [];

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', animation: 'tn-overlay-in 0.2s ease both' }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '100%', maxWidth: 680,
        background: 'var(--app-card-bg,#fff)',
        zIndex: 2001,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 60px rgba(0,0,0,0.2)',
        animation: 'tn-slide-in-right 0.28s cubic-bezier(0.32,0.72,0,1) both',
        fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif",
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #0176D3 100%)',
          position: 'relative', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 22 }}>🔮</span>
                <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>Talent Mirror</h2>
                {refreshing && <Spinner style={{ width: 14, height: 14 }} />}
              </div>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: 0 }}>
                Smart Resume Match · <strong style={{ color: 'rgba(255,255,255,0.9)' }}>{jobTitle}</strong>
              </p>
            </div>
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
          </div>

          {/* Ideal profile summary */}
          {data?.hasBenchmarks && data.idealProfile && (
            <div style={{ marginTop: 14, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', borderRadius: 12, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Benchmark Profile</span>
                {data.idealProfile.benchmarkStages?.map(s => (
                  <span key={s} style={{ fontSize: 10, fontWeight: 700, background: 'rgba(16,185,129,0.25)', color: '#34D399', borderRadius: 20, padding: '2px 8px', border: '1px solid rgba(16,185,129,0.3)' }}>{s}</span>
                ))}
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>·</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{data.benchmarkCount} candidate{data.benchmarkCount !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase' }}>Core Skills</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {idealCoreSkills.slice(0, 8).map(s => (
                      <span key={s} style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>★ {s}</span>
                    ))}
                    {idealCoreSkills.length > 8 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>+{idealCoreSkills.length - 8} more</span>}
                  </div>
                </div>
                <div style={{ whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase' }}>Experience</div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{data.idealProfile.expRange}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls bar */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--app-card-border,#E5E7EB)', background: 'var(--app-input-bg,#F8FAFC)', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--app-text-sec,#706E6B)', whiteSpace: 'nowrap' }}>Min Match:</label>
            {[50, 60, 70, 80].map(t => (
              <button key={t} onClick={() => setThreshold(t)}
                style={{ padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${threshold === t ? '#0176D3' : 'var(--app-card-border,#E5E7EB)'}`, background: threshold === t ? '#0176D3' : 'transparent', color: threshold === t ? '#fff' : 'var(--app-text-sec,#706E6B)', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                {t}%
              </button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {data && (
              <span style={{ fontSize: 12, color: 'var(--app-text-muted,#9CA3AF)', fontWeight: 600 }}>
                {suggestions.length} match · {data.totalEvaluated || 0} evaluated
              </span>
            )}
            <button onClick={() => load(true)} disabled={refreshing}
              style={{ padding: '6px 14px', borderRadius: 10, border: '1.5px solid var(--app-card-border,#E5E7EB)', background: 'transparent', color: 'var(--app-text-sec,#706E6B)', fontSize: 12, fontWeight: 700, cursor: refreshing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {refreshing ? <Spinner /> : '↺'} Refresh
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 280, gap: 14 }}>
              <Spinner />
              <p style={{ color: 'var(--app-text-muted,#9CA3AF)', fontSize: 14, fontWeight: 600 }}>Analysing {data?.totalEvaluated || ''} resumes…</p>
              <p style={{ color: 'var(--app-text-muted,#CBD5E1)', fontSize: 12 }}>Matching skills · experience · keywords · role alignment</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
              <p style={{ color: '#EF4444', marginBottom: 16 }}>{error}</p>
              <button onClick={() => load()} style={{ padding: '10px 24px', borderRadius: 10, background: '#0176D3', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Retry</button>
            </div>
          ) : !data?.hasBenchmarks ? (
            <div>
              {/* No benchmarks state */}
              <div style={{ background: 'linear-gradient(135deg, #FFF7ED, #FFFBEB)', border: '1.5px solid #FDE68A', borderRadius: 16, padding: '20px 24px', marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 28 }}>💡</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#92400E', marginBottom: 4 }}>Talent Mirror learns from your choices</div>
                    <p style={{ fontSize: 13, color: '#B45309', lineHeight: 1.6, margin: 0 }}>
                      Move at least one candidate to <strong>Shortlisted</strong> or <strong>Interview</strong> stage.
                      Talent Mirror will analyse their resume, extract skills, experience, and keywords —
                      then automatically find the most similar candidates in your pipeline.
                    </p>
                  </div>
                </div>
              </div>
              {suggestions.length > 0 && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--app-text-sec,#706E6B)', marginBottom: 14 }}>Top Applicants by Match Score</div>
                  {suggestions.map((item, i) => (
                    <CandidateRow key={item.applicationId} item={item} rank={i + 1}
                      idealCoreSkills={[]}
                      onShortlist={handleShortlist}
                      onPark={() => load(true)} />
                  ))}
                </>
              )}
            </div>
          ) : suggestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
              <h3 style={{ fontWeight: 800, color: 'var(--app-text,#0A1628)', marginBottom: 8 }}>No matches at {threshold}%+</h3>
              <p style={{ color: 'var(--app-text-sec,#706E6B)', fontSize: 14, maxWidth: 340, margin: '0 auto 20px' }}>
                Try lowering the minimum match threshold to discover more candidates.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                {[50, 40, 30].map(t => (
                  <button key={t} onClick={() => setThreshold(t)}
                    style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #0176D3', color: '#0176D3', background: 'rgba(1,118,211,0.06)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    Try {t}%
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Suggestion list */}
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--app-text,#0A1628)' }}>
                  🎯 {suggestions.length} smart match{suggestions.length !== 1 ? 'es' : ''} found
                </span>
                <span style={{ fontSize: 12, color: 'var(--app-text-muted,#9CA3AF)' }}>from {data.totalEvaluated} applicants · threshold {threshold}%+</span>
              </div>

              {suggestions.map((item, i) => (
                <CandidateRow
                  key={item.applicationId}
                  item={item}
                  rank={i + 1}
                  idealCoreSkills={idealCoreSkills}
                  onShortlist={handleShortlist}
                  onPark={() => load(true)}
                />
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--app-card-border,#E5E7EB)', background: 'var(--app-input-bg,#F8FAFC)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'var(--app-text-muted,#9CA3AF)', fontWeight: 600 }}>
            🔮 Talent Mirror · skills · experience · keywords · role alignment
          </span>
          <button onClick={onClose}
            style={{ padding: '9px 22px', borderRadius: 10, background: 'var(--app-primary,#0176D3)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}
