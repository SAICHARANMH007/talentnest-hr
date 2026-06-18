import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import CollegeAutocomplete from '../../components/shared/CollegeAutocomplete.jsx';
import { card, btnP, btnG, btnD, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';
import { DEGREES, ALL_BRANCHES } from '../../constants/education.js';

const STATUS_COLORS = {
  upcoming:  { bg: 'rgba(1,118,211,0.1)',   color: '#0176D3' },
  ongoing:   { bg: 'rgba(245,158,11,0.12)', color: '#B45309' },
  completed: { bg: 'rgba(22,163,74,0.1)',   color: '#16A34A' },
  cancelled: { bg: 'rgba(186,5,23,0.08)',   color: '#BA0517' },
};

const OPP_LABELS = { placement: '🎯 Placement', internship: '💼 Internship', exam: '📝 Exam / Test' };

// ── Create Drive Form (admin creates + assigns recruiter) ─────────────────────
function CreateDriveForm({ recruiters, onClose, onCreated }) {
  const [form, setForm] = useState({
    collegeName: '', title: '', description: '', mode: 'On-Campus', location: '',
    driveDate: '', registrationDeadline: '', degrees: [], branches: [], passingYears: '',
    opportunityType: 'placement', assignedRecruiterId: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));
  const toggle = (key, value) => setForm(f => ({
    ...f, [key]: f[key].includes(value) ? f[key].filter(v => v !== value) : [...f[key], value],
  }));

  const submit = async () => {
    if (!form.collegeName.trim() || !form.title.trim() || !form.driveDate) {
      setError('College, title and drive date are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.adminCreateDrive({
        collegeName: form.collegeName.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        mode: form.mode,
        location: form.location.trim(),
        driveDate: form.driveDate,
        registrationDeadline: form.registrationDeadline || null,
        opportunityType: form.opportunityType,
        eligibility: {
          degrees: form.degrees,
          branches: form.branches,
          passingYears: form.passingYears.split(',').map(s => s.trim()).filter(Boolean).map(Number),
        },
        assignedRecruiterId: form.assignedRecruiterId || null,
      });
      onCreated();
    } catch (e) {
      setError(e.message || 'Failed to create drive');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ ...card, marginBottom: 20, border: '1.5px solid rgba(1,118,211,0.25)', borderRadius: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#181818' }}>🎓 Create Campus Drive</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#706E6B', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>✕ Close</button>
      </div>

      {/* College */}
      <div style={{ marginBottom: 12 }}>
        <CollegeAutocomplete
          value={form.collegeName}
          onChange={set('collegeName')}
          label="Target College *"
          labelStyle={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}
          inputStyle={inp}
          dropdownStyle={{ background: '#fff', border: '1.5px solid #D6D9DE', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
          itemStyle={{ color: '#181818' }}
          itemHoverBg="rgba(1,118,211,0.08)"
          placeholder="Search registered college..."
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Drive Title *</label>
          <input style={inp} value={form.title} onChange={set('title')} placeholder="Campus Recruitment Drive 2026" />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Type</label>
          <select style={inp} value={form.opportunityType} onChange={set('opportunityType')}>
            <option value="placement">🎯 Placement Drive</option>
            <option value="internship">💼 Internship</option>
            <option value="exam">📝 Exam / Test</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Drive Date *</label>
          <input style={inp} type="date" value={form.driveDate} onChange={set('driveDate')} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Registration Deadline</label>
          <input style={inp} type="date" value={form.registrationDeadline} onChange={set('registrationDeadline')} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Mode</label>
          <select style={inp} value={form.mode} onChange={set('mode')}>
            {['On-Campus', 'Virtual', 'Off-Campus'].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Location</label>
          <input style={inp} value={form.location} onChange={set('location')} placeholder="Hyderabad" />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Assign Recruiter</label>
          <select style={inp} value={form.assignedRecruiterId} onChange={set('assignedRecruiterId')}>
            <option value="">— No assignment —</option>
            {recruiters.map(r => (
              <option key={r.id || r._id} value={r.id || r._id}>{r.name} {r.email ? `(${r.email})` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Passing Years (comma separated)</label>
          <input style={inp} value={form.passingYears} onChange={set('passingYears')} placeholder="2026, 2027" />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Description</label>
        <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={form.description} onChange={set('description')} placeholder="Roles, package details, eligibility..." />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Eligible Degrees (leave blank for all)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 90, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 8, padding: 8 }}>
          {DEGREES.map(d => (
            <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.degrees.includes(d)} onChange={() => toggle('degrees', d)} style={{ accentColor: '#0176D3' }} /> {d}
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Eligible Branches (leave blank for all)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 90, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 8, padding: 8 }}>
          {ALL_BRANCHES.map(b => (
            <label key={b} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.branches.includes(b)} onChange={() => toggle('branches', b)} style={{ accentColor: '#0176D3' }} /> {b}
            </label>
          ))}
        </div>
      </div>

      {error && <div style={{ color: '#BA0517', fontSize: 12, marginBottom: 10, padding: '8px 12px', background: '#FEF2F2', borderRadius: 8 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={submit} disabled={saving} style={{ ...btnP, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Creating...' : '🎓 Create Drive'}
        </button>
        <button onClick={onClose} style={btnG}>Cancel</button>
      </div>
      <p style={{ fontSize: 12, color: '#706E6B', marginTop: 8 }}>
        The drive request goes directly to the college's placement office since you're an admin. The assigned recruiter will be notified and can track registrations.
      </p>
    </div>
  );
}

// ── Pending Approval Card ─────────────────────────────────────────────────────
function PendingApprovalCard({ drive, onApprove, onReject, approving, rejecting }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ ...card, borderRadius: 14, border: '1.5px solid rgba(124,58,237,0.2)', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#181818', marginBottom: 2 }}>{drive.title}</div>
          <div style={{ fontSize: 13, color: '#706E6B' }}>🎓 {drive.collegeName} · {OPP_LABELS[drive.opportunityType] || OPP_LABELS.placement}</div>
          <div style={{ fontSize: 12, color: '#706E6B', marginTop: 4 }}>
            🗓️ {new Date(drive.driveDate).toLocaleDateString()} · {drive.mode}
            {drive.location ? ` · 📍 ${drive.location}` : ''}
          </div>
          {drive.registrationDeadline && (
            <div style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
              ⏰ Registration deadline: {new Date(drive.registrationDeadline).toLocaleDateString()}
            </div>
          )}
          <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(124,58,237,0.1)', color: '#7C3AED', borderRadius: 999, padding: '2px 10px', marginTop: 6, display: 'inline-block' }}>
            🔒 Awaiting your approval
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => onApprove(drive.id)}
            disabled={approving || rejecting}
            style={{ ...btnP, padding: '7px 18px', fontSize: 12, opacity: (approving || rejecting) ? 0.6 : 1 }}
          >
            {approving ? '...' : '✅ Approve & Send to College'}
          </button>
          <button
            onClick={() => onReject(drive.id)}
            disabled={approving || rejecting}
            style={{ ...btnD, padding: '7px 18px', fontSize: 12, opacity: (approving || rejecting) ? 0.6 : 1 }}
          >
            {rejecting ? '...' : '❌ Decline'}
          </button>
        </div>
      </div>

      {drive.description && (
        <>
          <button onClick={() => setExpanded(v => !v)} style={{ background: 'none', border: 'none', color: '#0176D3', fontSize: 12, cursor: 'pointer', marginTop: 8, padding: 0 }}>
            {expanded ? '▲ Hide details' : '▼ Show details'}
          </button>
          {expanded && (
            <div style={{ marginTop: 8, fontSize: 13, color: '#475569', lineHeight: 1.6, background: '#F8FAFC', borderRadius: 8, padding: '10px 14px' }}>
              {drive.description}
            </div>
          )}
        </>
      )}

      {drive.eligibility && (drive.eligibility.degrees?.length > 0 || drive.eligibility.branches?.length > 0 || drive.eligibility.passingYears?.length > 0) && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {drive.eligibility.degrees?.map(d => <span key={d} style={{ fontSize: 11, background: '#F1F5F9', borderRadius: 6, padding: '2px 8px', color: '#475569' }}>{d}</span>)}
          {drive.eligibility.branches?.map(b => <span key={b} style={{ fontSize: 11, background: '#F1F5F9', borderRadius: 6, padding: '2px 8px', color: '#475569' }}>{b}</span>)}
          {drive.eligibility.passingYears?.map(y => <span key={y} style={{ fontSize: 11, background: '#F1F5F9', borderRadius: 6, padding: '2px 8px', color: '#475569' }}>{y}</span>)}
        </div>
      )}
    </div>
  );
}

// ── All Company Drives (tracking view) ───────────────────────────────────────
function AllDrivesTab({ drives, loading, onNavigate }) {
  if (loading) return <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10 }}><Spinner /> Loading...</div>;
  if (!drives.length) return (
    <div style={{ ...card, color: '#706E6B', padding: 40, textAlign: 'center', fontSize: 14 }}>
      No drives yet. Create one above or approve a recruiter's request.
    </div>
  );
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
      {drives.map(d => {
        const sc = STATUS_COLORS[d.status] || STATUS_COLORS.upcoming;
        return (
          <div
            key={d.id}
            onClick={() => onNavigate(d.id)}
            style={{ ...card, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8, borderRadius: 14, border: '1px solid #E5E7EB' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#181818' }}>{d.title}</div>
                <div style={{ fontSize: 12, color: '#706E6B', marginTop: 2 }}>🎓 {d.collegeName}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: sc.bg, color: sc.color, textTransform: 'capitalize', flexShrink: 0 }}>{d.status}</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0176D3', background: 'rgba(1,118,211,0.08)', borderRadius: 999, padding: '2px 10px' }}>
                {OPP_LABELS[d.opportunityType] || OPP_LABELS.placement}
              </span>
              {d.assignedRecruiterName && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: 'rgba(5,150,105,0.1)', borderRadius: 999, padding: '2px 10px' }}>
                  👤 {d.assignedRecruiterName}
                </span>
              )}
              {d.internalApprovalStatus === 'pending' && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', background: 'rgba(124,58,237,0.1)', borderRadius: 999, padding: '2px 10px' }}>🔒 Pending internal</span>
              )}
              {(d.internalApprovalStatus === 'not_required' || d.internalApprovalStatus === 'approved') && d.requestStatus === 'pending' && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#B45309', background: 'rgba(245,158,11,0.12)', borderRadius: 999, padding: '2px 10px' }}>⏳ Pending college</span>
              )}
              {d.requestStatus === 'approved' && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', background: 'rgba(22,163,74,0.1)', borderRadius: 999, padding: '2px 10px' }}>✅ College approved</span>
              )}
            </div>

            <div style={{ fontSize: 12, color: '#706E6B' }}>
              🗓️ {new Date(d.driveDate).toLocaleDateString()} · {d.mode}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#181818' }}>👥 {d.registeredCount} registered</span>
              {d.shortlistedCount > 0 && <span style={{ fontSize: 12, color: '#B45309' }}>📋 {d.shortlistedCount} shortlisted</span>}
              {d.selectedCount > 0 && <span style={{ fontSize: 12, color: '#16A34A' }}>✅ {d.selectedCount} selected</span>}
            </div>

            <div style={{ fontSize: 12, color: '#0176D3', fontWeight: 700 }}>👉 Click to view registered students</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminDriveApprovals() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('approvals');
  const [pendingDrives, setPendingDrives] = useState([]);
  const [allDrives, setAllDrives] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allLoading, setAllLoading] = useState(false);
  const [acting, setActing] = useState({}); // { [driveId]: 'approve' | 'reject' }
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadPending = useCallback(() => {
    api.getAdminDriveApprovals()
      .then(r => setPendingDrives(r?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadAll = useCallback(() => {
    setAllLoading(true);
    api.getCompanyCollegeDrives()
      .then(r => setAllDrives(r?.data || []))
      .catch(() => {})
      .finally(() => setAllLoading(false));
  }, []);

  const loadRecruiters = useCallback(() => {
    api.getUsers({ role: 'recruiter' })
      .then(list => setRecruiters(Array.isArray(list) ? list : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadPending();
    loadRecruiters();
  }, [loadPending, loadRecruiters]);

  useEffect(() => {
    if (tab === 'all') loadAll();
  }, [tab, loadAll]);

  const handleApprove = async id => {
    setActing(a => ({ ...a, [id]: 'approve' }));
    try {
      await api.approveInternalDriveRequest(id);
      showToast('Drive approved and sent to college placement office.');
      loadPending();
    } catch (e) {
      showToast(e.message || 'Failed to approve');
    } finally {
      setActing(a => { const n = { ...a }; delete n[id]; return n; });
    }
  };

  const handleReject = async id => {
    setActing(a => ({ ...a, [id]: 'reject' }));
    try {
      await api.rejectInternalDriveRequest(id);
      showToast('Drive request declined.');
      loadPending();
    } catch (e) {
      showToast(e.message || 'Failed to decline');
    } finally {
      setActing(a => { const n = { ...a }; delete n[id]; return n; });
    }
  };

  const TABS = [
    { id: 'approvals', label: `🔒 Pending Approvals${pendingDrives.length ? ` (${pendingDrives.length})` : ''}` },
    { id: 'all', label: '📋 All Drives' },
  ];

  return (
    <div>
      <PageHeader
        title="🎓 Campus Drive Management"
        subtitle="Review recruiter-submitted drive requests, create drives with recruiter assignments, and track all campus drives."
        action={
          <button onClick={() => setShowCreate(s => !s)} style={btnP}>
            {showCreate ? '✕ Cancel' : '＋ Create Drive'}
          </button>
        }
      />

      {showCreate && (
        <CreateDriveForm
          recruiters={recruiters}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); showToast('Drive created and sent to college.'); loadAll(); loadPending(); }}
        />
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #E5E7EB', marginBottom: 20 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{ padding: '11px 20px', border: 'none', background: 'transparent', fontSize: 13, fontWeight: tab === t.id ? 700 : 600, color: tab === t.id ? '#0176D3' : '#374151', cursor: 'pointer', borderBottom: tab === t.id ? '2px solid #0176D3' : '2px solid transparent', marginBottom: -2, whiteSpace: 'nowrap' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'approvals' && (
        loading ? (
          <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10 }}><Spinner /> Loading...</div>
        ) : pendingDrives.length === 0 ? (
          <div style={{ ...card, color: '#706E6B', padding: 40, textAlign: 'center', fontSize: 14, borderRadius: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>No pending approvals</div>
            <div style={{ fontSize: 12 }}>When recruiters submit drive requests, they'll appear here for your review.</div>
          </div>
        ) : pendingDrives.map(d => (
          <PendingApprovalCard
            key={d.id}
            drive={d}
            onApprove={handleApprove}
            onReject={handleReject}
            approving={acting[d.id] === 'approve'}
            rejecting={acting[d.id] === 'reject'}
          />
        ))
      )}

      {tab === 'all' && (
        <AllDrivesTab
          drives={allDrives}
          loading={allLoading}
          onNavigate={id => navigate(`/app/college-drives/${id}`)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#181818', color: '#fff', padding: '12px 24px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
