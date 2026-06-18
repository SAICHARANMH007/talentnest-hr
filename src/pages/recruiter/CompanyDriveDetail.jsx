import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { card, btnG } from '../../constants/styles.js';
import { api } from '../../api/api.js';
import { usePlatformEvents } from '../../hooks/usePlatformSocket.js';

const REG_STATUSES = ['registered', 'shortlisted', 'selected', 'rejected'];

const REG_CFG = {
  registered:  { bg: '#F1F5F9',              color: '#475569', icon: '📋' },
  shortlisted: { bg: 'rgba(245,158,11,0.12)', color: '#B45309', icon: '⭐' },
  selected:    { bg: 'rgba(22,163,74,0.1)',   color: '#16A34A', icon: '✅' },
  rejected:    { bg: 'rgba(186,5,23,0.08)',   color: '#BA0517', icon: '❌' },
};

const PIPELINE_STEPS = [
  { id: 'registered',  label: 'Registered',  icon: '📋' },
  { id: 'shortlisted', label: 'Shortlisted', icon: '⭐' },
  { id: 'selected',    label: 'Selected',    icon: '✅' },
];

const OPP_LABELS = {
  placement: '🎯 Placement Drive',
  internship: '💼 Internship',
  exam: '📝 Exam / Test',
};

const EXAM_STATUS_LABELS = {
  not_started: { label: 'Not Started', bg: '#F1F5F9',              color: '#706E6B' },
  in_progress: { label: 'In Progress', bg: 'rgba(245,158,11,0.12)', color: '#B45309' },
  submitted:   { label: 'Submitted',   bg: 'rgba(22,163,74,0.1)',   color: '#16A34A' },
  expired:     { label: 'Expired',     bg: 'rgba(186,5,23,0.08)',   color: '#BA0517' },
};

// ── Candidate Profile Drawer ──────────────────────────────────────────────────
function CandidateProfileDrawer({ candidate, onClose }) {
  const isMob = window.innerWidth <= 767;
  if (!candidate) return null;

  const initials = (candidate.name || '?')[0].toUpperCase();
  const skills = candidate.skills || [];

  return createPortal(
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 2100, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: isMob ? 'flex-end' : 'center', justifyContent: 'center', padding: isMob ? 0 : 16 }}
    >
      <style>{`
        @keyframes cddSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes cddScale { from { opacity:0; transform:scale(0.95) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }
      `}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', width: '100%', maxWidth: isMob ? '100%' : 480, maxHeight: isMob ? '92dvh' : '86vh', borderRadius: isMob ? '22px 22px 0 0' : 20, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 -8px 48px rgba(0,0,0,0.25)', animation: isMob ? 'cddSlideUp 0.28s cubic-bezier(0.32,0.72,0,1)' : 'cddScale 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        {isMob && <div style={{ width: 36, height: 4, background: '#D1D5DB', borderRadius: 2, margin: '10px auto 0', flexShrink: 0 }} />}

        {/* Header banner */}
        <div style={{ height: 90, background: 'linear-gradient(140deg, #0176D3 0%, #0176D3cc 60%, #0176D399 100%)', position: 'relative', flexShrink: 0 }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 12, background: 'rgba(0,0,0,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Avatar */}
        <div style={{ marginTop: -34, paddingLeft: 18, marginBottom: 2, position: 'relative', zIndex: 2, flexShrink: 0 }}>
          <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'linear-gradient(135deg, #0176D3, #0176D3bb)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 26, border: '4px solid #fff', boxShadow: '0 4px 12px rgba(1,118,211,0.3)' }}>
            {initials}
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '4px 18px 32px', minHeight: 0 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 900, fontSize: 20, color: '#0A1628', lineHeight: 1.2, marginBottom: 4 }}>{candidate.name || 'Candidate'}</div>
            {candidate.email && <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 2 }}>✉️ {candidate.email}</div>}
            {candidate.phone && <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 2 }}>📞 {candidate.phone}</div>}
            {candidate.branch && <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 2 }}>🎓 {candidate.branch}{candidate.year ? ` · ${candidate.year}` : ''}</div>}
            {candidate.grade && <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 2 }}>📊 CGPA: {candidate.grade}</div>}
          </div>

          {/* Current drive status */}
          {candidate.status && (
            <div style={{ marginBottom: 14, background: '#F8FAFC', borderRadius: 12, padding: '10px 14px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Drive Status</div>
              <div style={{ display: 'flex', gap: 0, alignItems: 'center' }}>
                {PIPELINE_STEPS.map((step, i) => {
                  const isRejected = candidate.status === 'rejected';
                  const stepIndex = PIPELINE_STEPS.findIndex(s => s.id === candidate.status);
                  const isDone = !isRejected && i < stepIndex;
                  const isCurrent = !isRejected && step.id === candidate.status;
                  return (
                    <React.Fragment key={step.id}>
                      {i > 0 && <div style={{ flex: 1, height: 2, background: isDone ? '#0176D3' : '#E5E7EB', minWidth: 12 }} />}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: isDone ? '#0176D3' : isCurrent ? '#fff' : '#F1F5F9', border: isCurrent ? '2.5px solid #0176D3' : isDone ? '2px solid #0176D3' : '2px solid #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: isDone ? '#fff' : isCurrent ? '#0176D3' : '#9CA3AF', boxShadow: isCurrent ? '0 0 0 4px rgba(1,118,211,0.12)' : 'none' }}>
                          {isDone ? '✓' : step.icon}
                        </div>
                        <span style={{ fontSize: 9, fontWeight: isCurrent ? 700 : 400, color: isCurrent ? '#0176D3' : isDone ? '#0176D3' : '#9CA3AF', whiteSpace: 'nowrap' }}>{step.label}</span>
                      </div>
                    </React.Fragment>
                  );
                })}
                {candidate.status === 'rejected' && (
                  <div style={{ marginLeft: 12, fontSize: 12, fontWeight: 700, color: '#BA0517', background: '#FEF2F2', borderRadius: 8, padding: '4px 10px' }}>❌ Not Progressed</div>
                )}
              </div>
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Skills</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {skills.slice(0, 15).map((s, i) => (
                  <span key={i} style={{ fontSize: 12, fontWeight: 600, color: '#0176D3', background: 'rgba(1,118,211,0.08)', borderRadius: 20, padding: '4px 10px', border: '1px solid rgba(1,118,211,0.15)' }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {candidate.notes && (
            <div style={{ background: '#FFFBEB', borderRadius: 12, padding: '10px 14px', border: '1px solid #FEF3C7' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Recruiter Notes</div>
              <div style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.6 }}>{candidate.notes}</div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CompanyDriveDetail({ user }) {
  const { driveId } = useParams();
  const navigate = useNavigate();
  const [drive, setDrive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState({}); // { [candidateId]: true }
  const [selectedCandidate, setSelectedCandidate] = useState(null); // for profile drawer
  const [toast, setToast] = useState('');

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(() => {
    api.getCompanyCollegeDrive(driveId)
      .then(r => setDrive(r?.data || null))
      .catch(e => setError(e.message || 'Failed to load drive'))
      .finally(() => setLoading(false));
  }, [driveId]);

  useEffect(() => { load(); }, [load]);

  usePlatformEvents({
    'drive:registrationChanged': (data) => {
      if (String(data?.driveId) !== String(driveId)) return;
      api.getCompanyCollegeDrive(driveId).then(r => setDrive(r?.data || null)).catch(() => {});
    },
  });

  const handleStatusChange = async (candidateId, newStatus) => {
    setUpdating(u => ({ ...u, [candidateId]: true }));
    try {
      await api.updateDriveRegistrationStatus(driveId, candidateId, { status: newStatus });
      setDrive(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          registrations: prev.registrations.map(r =>
            r.candidateId === candidateId ? { ...r, status: newStatus } : r
          ),
        };
      });
      // Update drawer if open
      if (selectedCandidate?.candidateId === candidateId) {
        setSelectedCandidate(c => ({ ...c, status: newStatus }));
      }
      showToast(`Status updated to "${newStatus}"`);
    } catch (e) {
      showToast('❌ ' + (e.message || 'Failed to update status'));
    } finally {
      setUpdating(u => { const n = { ...u }; delete n[candidateId]; return n; });
    }
  };

  const allRegs = drive?.registrations || [];
  const visibleRegs = allRegs.filter(r => {
    const matchFilter = !filter || r.status === filter;
    const q = search.trim().toLowerCase();
    const matchSearch = !q || (r.name || '').toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q) || (r.branch || '').toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const typeLabel = drive ? (OPP_LABELS[drive.opportunityType] || OPP_LABELS.placement) : '';

  return (
    <div>
      <button onClick={() => navigate('/app/college-drives')} style={{ ...btnG, marginBottom: 12 }}>← Back to College Drives</button>

      {loading ? (
        <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10, justifyContent: 'center' }}><Spinner /> Loading...</div>
      ) : error ? (
        <div style={{ color: '#BA0517', padding: 40 }}>{error}</div>
      ) : !drive ? (
        <div style={{ color: '#706E6B', padding: 40 }}>Drive not found.</div>
      ) : (
        <>
          <PageHeader title={drive.title} subtitle={`${typeLabel} · 🎓 ${drive.collegeName || 'College'}`} />

          {/* Drive meta card */}
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: drive.description ? 8 : 0, fontSize: 13, color: '#706E6B' }}>
              <span>🗓️ {new Date(drive.driveDate).toLocaleDateString()}</span>
              <span>• {drive.mode}</span>
              {drive.location && <span>• 📍 {drive.location}</span>}
              {drive.examProvider && <span>• {drive.examProvider}</span>}
              {drive.assignedRecruiterName && <span>• 👤 Assigned: {drive.assignedRecruiterName}</span>}
            </div>
            {drive.description && <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>{drive.description}</p>}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            {[
              { label: 'Total', count: allRegs.length, color: '#0176D3' },
              ...REG_STATUSES.map(s => ({ label: s, count: allRegs.filter(r => r.status === s).length, color: REG_CFG[s].color })),
            ].map(({ label, count, color }) => (
              <div key={label} style={{ background: '#F8FAFC', borderRadius: 10, padding: '8px 14px', border: '1px solid #E5E7EB', textAlign: 'center', minWidth: 70 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color }}>{count}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'capitalize', marginTop: 1 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Search + filter */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, branch…"
                style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 13, outline: 'none', background: '#F8FAFC', boxSizing: 'border-box' }}
              />
              {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 14 }}>✕</button>}
            </div>
            <button onClick={() => setFilter('')} style={{ ...btnG, padding: '6px 14px', fontSize: 12, background: !filter ? '#0176D3' : '#fff', color: !filter ? '#fff' : '#0176D3', border: '1px solid #0176D3', borderRadius: 8 }}>All</button>
            {REG_STATUSES.map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{ ...btnG, padding: '6px 14px', fontSize: 12, textTransform: 'capitalize', background: filter === s ? REG_CFG[s].color : '#fff', color: filter === s ? '#fff' : REG_CFG[s].color, border: `1px solid ${REG_CFG[s].color}`, borderRadius: 8 }}>
                {REG_CFG[s].icon} {s}
              </button>
            ))}
          </div>

          {/* Candidate list */}
          <div style={{ ...card, padding: 0, borderRadius: 14, overflow: 'hidden' }}>
            {visibleRegs.length === 0 ? (
              <div style={{ color: '#706E6B', padding: 40, textAlign: 'center', fontSize: 14 }}>
                {allRegs.length === 0 ? 'No students registered yet.' : 'No candidates match your filter.'}
              </div>
            ) : visibleRegs.map((r, idx) => {
              const rc = REG_CFG[r.status] || REG_CFG.registered;
              const isUpdating = updating[r.candidateId];
              return (
                <div
                  key={r.candidateId}
                  style={{ padding: '14px 16px', borderBottom: idx < visibleRegs.length - 1 ? '1px solid #F1F5F9' : 'none', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  {/* Avatar — clickable */}
                  <div
                    onClick={() => setSelectedCandidate(r)}
                    style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #0176D3, #0176D3bb)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0, cursor: 'pointer' }}
                  >
                    {(r.name || r.email || '?')[0].toUpperCase()}
                  </div>

                  {/* Info — clickable */}
                  <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setSelectedCandidate(r)}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#181818', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name || r.email}</div>
                    <div style={{ fontSize: 12, color: '#706E6B', marginTop: 2 }}>
                      {r.email}
                      {r.branch ? ` · ${r.branch}` : ''}
                      {r.year ? ` (${r.year})` : ''}
                      {r.grade ? ` · CGPA ${r.grade}` : ''}
                    </div>
                    {r.skills?.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                        {r.skills.slice(0, 3).map((s, i) => (
                          <span key={i} style={{ fontSize: 10, fontWeight: 600, color: '#0176D3', background: 'rgba(1,118,211,0.08)', borderRadius: 10, padding: '2px 6px' }}>{s}</span>
                        ))}
                        {r.skills.length > 3 && <span style={{ fontSize: 10, color: '#9CA3AF' }}>+{r.skills.length - 3}</span>}
                      </div>
                    )}
                  </div>

                  {/* Exam status pill */}
                  {drive.opportunityType === 'exam' && drive.assessmentId && r.examStatus && (() => {
                    const ec = EXAM_STATUS_LABELS[r.examStatus] || EXAM_STATUS_LABELS.not_started;
                    return (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: ec.bg, color: ec.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        📝 {ec.label}
                        {r.examStatus === 'submitted' && r.examPercentage != null && ` · ${r.examPercentage}%`}
                        {r.examStatus === 'submitted' && r.examResult && r.examResult !== 'pending' && ` (${r.examResult === 'pass' ? '✅' : '❌'})`}
                      </span>
                    );
                  })()}

                  {/* Pipeline status dropdown */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {isUpdating ? (
                      <div style={{ width: 20, height: 20, border: '2.5px solid #E5E7EB', borderTopColor: '#0176D3', borderRadius: '50%', animation: 'tn-spin 0.8s linear infinite' }} />
                    ) : (
                      <select
                        value={r.status}
                        onChange={e => { e.stopPropagation(); handleStatusChange(r.candidateId, e.target.value); }}
                        onClick={e => e.stopPropagation()}
                        style={{ fontSize: 12, fontWeight: 700, padding: '5px 10px', borderRadius: 8, border: `1.5px solid ${rc.color}33`, background: rc.bg, color: rc.color, cursor: 'pointer', outline: 'none', appearance: 'none', WebkitAppearance: 'none', minWidth: 120 }}
                      >
                        {REG_STATUSES.map(s => (
                          <option key={s} value={s} style={{ background: '#fff', color: '#181818', fontWeight: 600 }}>
                            {REG_CFG[s].icon} {s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedCandidate(r); }}
                      style={{ background: 'none', border: '1px solid #E5E7EB', color: '#706E6B', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}
                    >
                      👤 Profile
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Candidate profile drawer */}
      {selectedCandidate && (
        <CandidateProfileDrawer
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#181818', color: '#fff', padding: '11px 22px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.25)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      <style>{`@keyframes tn-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
