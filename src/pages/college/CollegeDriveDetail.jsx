import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { card, btnG, btnP, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';
import { usePlatformEvents } from '../../hooks/usePlatformSocket.js';
import { DEGREES, ALL_BRANCHES } from '../../constants/education.js';
import StudentSearchPicker from '../../components/shared/StudentSearchPicker.jsx';

const REG_STATUSES = ['registered', 'shortlisted', 'selected', 'rejected'];
const REG_COLORS = {
  registered: { bg: '#F1F5F9', color: '#475569' },
  shortlisted: { bg: 'rgba(245,158,11,0.12)', color: '#B45309' },
  selected: { bg: 'rgba(22,163,74,0.1)', color: '#16A34A' },
  rejected: { bg: 'rgba(186,5,23,0.08)', color: '#BA0517' },
};

const OPPORTUNITY_TYPE_LABELS = {
  placement: '🎯 Placement Drive',
  internship: '💼 Internship',
  exam: '📝 Exam / Test',
};

const EXAM_STATUS_LABELS = {
  not_started: { label: 'Not Started', bg: '#F1F5F9', color: '#706E6B' },
  in_progress: { label: 'In Progress', bg: 'rgba(245,158,11,0.12)', color: '#B45309' },
  submitted: { label: 'Submitted', bg: 'rgba(22,163,74,0.1)', color: '#16A34A' },
  expired: { label: 'Expired', bg: 'rgba(186,5,23,0.08)', color: '#BA0517' },
};

function NotifyPanel({ driveId, registrations, onClose }) {
  const [audience, setAudience] = useState('eligible');
  const [passingYears, setPassingYears] = useState('');
  const [degrees, setDegrees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState(new Set());

  const registeredYears = Array.from(new Set((registrations || []).map(r => r.year).filter(Boolean))).sort();

  const toggle = (list, setList, value) => setList(l => l.includes(value) ? l.filter(v => v !== value) : [...l, value]);

  const send = async () => {
    if (audience === 'specific' && selectedStudents.size === 0) {
      setResult({ ok: false, message: 'Select at least one student first.' });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const res = await api.notifyPlacementDrive(driveId, {
        audience,
        passingYears: passingYears ? passingYears.split(',').map(s => s.trim()).filter(Boolean).map(Number) : [],
        degrees,
        branches,
        message,
        candidateIds: audience === 'specific' ? Array.from(selectedStudents) : [],
      });
      setResult({ ok: true, recipients: res?.recipients ?? 0, message: res?.message });
    } catch (e) {
      setResult({ ok: false, message: e.message || 'Failed to send notification' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ ...card, marginBottom: 16, border: '1.5px solid rgba(1,118,211,0.25)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#181818' }}>📣 Notify Students</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#706E6B', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>✕ Close</button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Audience</label>
        <select value={audience} onChange={e => setAudience(e.target.value)} style={inp}>
          <option value="eligible">All students eligible for this drive</option>
          <option value="registered">Only students already registered</option>
          <option value="specific">Specific students (search & select)</option>
        </select>
      </div>

      {audience === 'specific' && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Search & select students</label>
          <StudentSearchPicker selected={selectedStudents} setSelected={setSelectedStudents} />
        </div>
      )}

      {audience !== 'specific' && registeredYears.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Filter by passing year (optional)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {registeredYears.map(y => (
              <label key={y} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
                <input type="checkbox" checked={passingYears.split(',').map(s => s.trim()).includes(String(y))}
                  onChange={() => {
                    const cur = passingYears.split(',').map(s => s.trim()).filter(Boolean);
                    const next = cur.includes(String(y)) ? cur.filter(v => v !== String(y)) : [...cur, String(y)];
                    setPassingYears(next.join(', '));
                  }} style={{ accentColor: '#0176D3' }} />
                {y}
              </label>
            ))}
          </div>
        </div>
      )}

      {audience !== 'specific' && (
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Filter by degree (optional — leave blank to use this drive's eligibility)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 100, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 8, padding: 8 }}>
          {DEGREES.map(d => (
            <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
              <input type="checkbox" checked={degrees.includes(d)} onChange={() => toggle(degrees, setDegrees, d)} style={{ accentColor: '#0176D3' }} />
              {d}
            </label>
          ))}
        </div>
      </div>
      )}

      {audience !== 'specific' && (
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Filter by branch / specialization (optional)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 100, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 8, padding: 8 }}>
          {ALL_BRANCHES.map(b => (
            <label key={b} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
              <input type="checkbox" checked={branches.includes(b)} onChange={() => toggle(branches, setBranches, b)} style={{ accentColor: '#0176D3' }} />
              {b}
            </label>
          ))}
        </div>
      </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Message (optional — a default reminder is sent if left blank)</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} style={{ ...inp, minHeight: 60, resize: 'vertical' }} placeholder="e.g. Please bring your resume and a valid ID card." />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={send} disabled={sending} style={{ ...btnP, opacity: sending ? 0.6 : 1 }}>{sending ? 'Sending...' : '📣 Send Notification'}</button>
        {result && (
          <span style={{ fontSize: 12, fontWeight: 700, color: result.ok ? '#16A34A' : '#BA0517' }}>
            {result.ok ? `Sent to ${result.recipients} student${result.recipients === 1 ? '' : 's'}.` : result.message}
            {result.ok && result.message ? ` ${result.message}` : ''}
          </span>
        )}
      </div>
    </div>
  );
}

export default function CollegeDriveDetail() {
  const { driveId } = useParams();
  const navigate = useNavigate();
  const [drive, setDrive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [showNotify, setShowNotify] = useState(false);

  useEffect(() => {
    api.getPlacementDrive(driveId)
      .then(r => setDrive(r?.data || null))
      .catch(e => setError(e.message || 'Failed to load drive'))
      .finally(() => setLoading(false));
  }, [driveId]);

  // Live updates — silently re-sync registrations & exam progress when a student registers or their status/exam changes
  usePlatformEvents({
    'drive:registrationChanged': (data) => {
      if (data?.driveId !== driveId) return;
      api.getPlacementDrive(driveId).then(r => setDrive(r?.data || null)).catch(() => {});
    },
  });

  const updateStatus = async (candidateId, status) => {
    setDrive(d => ({ ...d, registrations: d.registrations.map(r => r.candidateId === candidateId ? { ...r, status } : r) }));
    try {
      await api.updatePlacementDriveRegistration(driveId, candidateId, { status });
    } catch { /* optimistic — already updated locally */ }
  };

  const regs = (drive?.registrations || []).filter(r => !filter || r.status === filter);
  const typeLabel = drive ? (OPPORTUNITY_TYPE_LABELS[drive.opportunityType] || OPPORTUNITY_TYPE_LABELS.placement) : '';

  return (
    <div>
      <button onClick={() => navigate('/app/drives')} style={{ ...btnG, marginBottom: 12 }}>← Back to Placement Drives</button>

      {loading ? (
        <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10, justifyContent: 'center' }}><Spinner /> Loading...</div>
      ) : error ? (
        <div style={{ color: '#BA0517', padding: 40 }}>{error}</div>
      ) : !drive ? (
        <div style={{ color: '#706E6B', padding: 40 }}>Placement drive not found.</div>
      ) : (
        <>
          <PageHeader
            title={drive.title}
            subtitle={typeLabel}
            action={<button onClick={() => setShowNotify(s => !s)} style={btnG}>📣 Notify Students</button>}
          />

          {showNotify && <NotifyPanel driveId={driveId} registrations={drive.registrations} onClose={() => setShowNotify(false)} />}

          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: drive.description ? 8 : 0, fontSize: 13, color: '#706E6B' }}>
              <span>🗓️ {new Date(drive.driveDate).toLocaleDateString()}</span>
              <span>• {drive.mode}</span>
              {drive.companyName && <span>• 🏢 {drive.companyName}</span>}
              {drive.location && <span>• 📍 {drive.location}</span>}
              {drive.examProvider && <span>• {drive.examProvider}</span>}
            </div>
            {drive.description && <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>{drive.description}</p>}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <button onClick={() => setFilter('')} style={{ ...btnG, padding: '4px 12px', fontSize: 12, background: !filter ? 'var(--app-primary,#0176D3)' : '#fff', color: !filter ? '#fff' : '#0176D3' }}>All ({drive.registrations.length})</button>
            {REG_STATUSES.map(s => {
              const count = drive.registrations.filter(r => r.status === s).length;
              return (
                <button key={s} onClick={() => setFilter(s)} style={{ ...btnG, padding: '4px 12px', fontSize: 12, textTransform: 'capitalize', background: filter === s ? 'var(--app-primary,#0176D3)' : '#fff', color: filter === s ? '#fff' : '#0176D3' }}>{s} ({count})</button>
              );
            })}
          </div>

          <div style={card}>
            {regs.length === 0 ? (
              <div style={{ color: '#706E6B', padding: 40, textAlign: 'center', fontSize: 14 }}>No eligible students found for this drive's criteria.</div>
            ) : regs.map(r => {
              const rc = REG_COLORS[r.status];
              return (
                <div key={r.candidateId} style={{ padding: '12px 0', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#181818' }}>{r.name || r.email}</div>
                    <div style={{ fontSize: 12, color: '#706E6B' }}>{r.email}{r.branch ? ` · ${r.branch}` : ''}{r.year ? ` (${r.year})` : ''}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {drive.opportunityType === 'exam' && drive.assessmentId && r.examStatus && (() => {
                      const ec = EXAM_STATUS_LABELS[r.examStatus] || EXAM_STATUS_LABELS.not_started;
                      return (
                        <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: ec.bg, color: ec.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          📝 {ec.label}
                          {r.examStatus === 'submitted' && r.examPercentage != null && ` · ${r.examPercentage}%`}
                          {r.examStatus === 'submitted' && r.examResult && r.examResult !== 'pending' && ` (${r.examResult === 'pass' ? '✅ Pass' : '❌ Fail'})`}
                        </span>
                      );
                    })()}
                    <select value={r.status} onChange={e => updateStatus(r.candidateId, e.target.value)}
                      style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8, border: 'none', background: rc.bg, color: rc.color, textTransform: 'capitalize', cursor: 'pointer' }}>
                      {REG_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
