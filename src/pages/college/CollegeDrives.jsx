import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { card, btnP, btnG, btnD, inp, Z } from '../../constants/styles.js';
import { api } from '../../api/api.js';

function formatSalary(min, max, currency) {
  const symbol = currency === 'USD' ? '$' : '₹';
  if (!min && !max) return null;
  if (min && max) return `${symbol}${Number(min).toLocaleString('en-IN')} – ${symbol}${Number(max).toLocaleString('en-IN')}`;
  return `${symbol}${Number(min || max).toLocaleString('en-IN')}`;
}

function timeAgo(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

function DriveCard({ job, onNotify, status }) {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#181818' }}>{job.title || 'Untitled Role'}</h3>
          <div style={{ fontSize: 13, color: '#706E6B', marginTop: 2 }}>{job.company || 'Company'}</div>
        </div>
        <span style={{ fontSize: 11, color: '#9E9D9B', whiteSpace: 'nowrap' }}>{timeAgo(job.postedAt)}</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 12, color: '#706E6B' }}>
        {job.location && <span>📍 {job.location}</span>}
        {job.jobType && <span>• {job.jobType}</span>}
        {job.experience && <span>• {job.experience}</span>}
        {salary && <span>• {salary}</span>}
      </div>

      {(job.skills || []).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {job.skills.slice(0, 6).map(sk => (
            <span key={sk} style={{
              fontSize: 11, fontWeight: 700, color: '#0176D3', background: 'rgba(1,118,211,0.08)',
              borderRadius: 999, padding: '2px 10px',
            }}>{sk}</span>
          ))}
        </div>
      )}

      <div style={{ marginTop: 4 }}>
        <button
          style={{ ...btnP, opacity: status === 'sending' ? 0.6 : 1 }}
          disabled={status === 'sending'}
          onClick={() => onNotify(job.id)}
        >
          {status === 'sending' ? '⏳ Notifying...' : '📣 Notify My Students'}
        </button>
        {status?.message && <div style={{ color: '#16A34A', fontSize: 12, marginTop: 6 }}>{status.message}</div>}
        {status?.error && <div style={{ color: '#BA0517', fontSize: 12, marginTop: 6 }}>{status.error}</div>}
      </div>
    </div>
  );
}

const STATUS_COLORS = {
  upcoming: { bg: 'rgba(1,118,211,0.1)', color: '#0176D3' },
  ongoing: { bg: 'rgba(245,158,11,0.12)', color: '#B45309' },
  completed: { bg: 'rgba(22,163,74,0.1)', color: '#16A34A' },
  cancelled: { bg: 'rgba(186,5,23,0.08)', color: '#BA0517' },
};

const OPPORTUNITY_TYPE_LABELS = {
  placement: '🎯 Placement Drive',
  internship: '💼 Internship',
  exam: '📝 Exam / Test',
};

function PlacementDriveCard({ drive, onOpen, onDelete }) {
  const sc = STATUS_COLORS[drive.status] || STATUS_COLORS.upcoming;
  const typeLabel = OPPORTUNITY_TYPE_LABELS[drive.opportunityType] || OPPORTUNITY_TYPE_LABELS.placement;
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer' }} onClick={() => onOpen(drive)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#181818' }}>{drive.title}</h3>
          <div style={{ fontSize: 13, color: '#706E6B', marginTop: 2 }}>{drive.companyName || 'In-house drive'}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: sc.bg, color: sc.color, textTransform: 'capitalize' }}>{drive.status}</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#0176D3', background: 'rgba(1,118,211,0.08)', borderRadius: 999, padding: '2px 10px' }}>{typeLabel}</span>
        {drive.opportunityType === 'exam' && drive.examProvider && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#B45309', background: 'rgba(245,158,11,0.12)', borderRadius: 999, padding: '2px 10px' }}>{drive.examProvider}</span>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 12, color: '#706E6B' }}>
        <span>🗓️ {new Date(drive.driveDate).toLocaleDateString()}</span>
        <span>• {drive.mode}</span>
        {drive.location && <span>• 📍 {drive.location}</span>}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#181818' }}>👥 {drive.totalEligible} eligible</span>
        {drive.counts.shortlisted > 0 && <span style={{ fontSize: 12, color: '#B45309' }}>📋 {drive.counts.shortlisted} shortlisted</span>}
        {drive.counts.selected > 0 && <span style={{ fontSize: 12, color: '#16A34A' }}>✅ {drive.counts.selected} selected</span>}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button style={{ ...btnG, padding: '6px 14px', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); onOpen(drive); }}>View Students →</button>
        <button style={{ ...btnD, padding: '6px 14px', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); onDelete(drive.id); }}>Cancel</button>
      </div>
    </div>
  );
}

const OPPORTUNITY_TYPES = [
  { value: 'placement', label: '🎯 Placement Drive' },
  { value: 'internship', label: '💼 Internship' },
  { value: 'exam', label: '📝 Exam / Test' },
];

const EXAM_PROVIDERS = ['TCS NQT', 'AMCAT', 'CoCubes', 'HackerRank', 'HackerEarth', 'eLitmus', 'Other'];

function CreateDriveModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', companyName: '', description: '', mode: 'On-Campus', location: '',
    driveDate: '', registrationDeadline: '',
    minCGPA: '', degrees: '', branches: '', passingYears: '', skills: '',
    opportunityType: 'placement', examProvider: 'TCS NQT', registrationLink: '', assessmentId: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [assessments, setAssessments] = useState([]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    api.getCollegeAssessments().then(r => setAssessments(r?.data || [])).catch(() => {});
  }, []);

  const submit = async () => {
    if (!form.title.trim() || !form.driveDate) { setError('Drive title and date are required.'); return; }
    setSaving(true);
    setError('');
    try {
      const eligibility = {
        minCGPA: form.minCGPA ? Number(form.minCGPA) : null,
        degrees: form.degrees.split(',').map(s => s.trim()).filter(Boolean),
        branches: form.branches.split(',').map(s => s.trim()).filter(Boolean),
        passingYears: form.passingYears.split(',').map(s => Number(s.trim())).filter(Number.isFinite),
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
      };
      const res = await api.createPlacementDrive({
        title: form.title.trim(),
        companyName: form.companyName.trim(),
        description: form.description.trim(),
        mode: form.mode,
        location: form.location.trim(),
        driveDate: form.driveDate,
        registrationDeadline: form.registrationDeadline || null,
        opportunityType: form.opportunityType,
        examProvider: form.opportunityType === 'exam' ? form.examProvider : '',
        registrationLink: form.opportunityType === 'exam' ? form.registrationLink.trim() : '',
        assessmentId: form.opportunityType === 'exam' ? (form.assessmentId || null) : null,
        eligibility,
      });
      onCreated(res);
    } catch (e) {
      setError(e.message || 'Failed to create drive');
    } finally {
      setSaving(false);
    }
  };

  const typeLabel = form.opportunityType === 'internship' ? 'Internship' : form.opportunityType === 'exam' ? 'Exam / Test' : 'Placement Drive';

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: Z.MODAL, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: 'min(560px, 100%)', maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800, color: '#181818' }}>📣 Schedule a {typeLabel}</h3>

        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B' }}>Opportunity Type *</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {OPPORTUNITY_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, opportunityType: t.value }))}
                  style={{ ...btnG, flex: 1, padding: '8px 10px', fontSize: 12, background: form.opportunityType === t.value ? 'var(--app-primary,#0176D3)' : '#fff', color: form.opportunityType === t.value ? '#fff' : '#0176D3' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B' }}>Title *</label>
            <input style={inp} value={form.title} onChange={set('title')} placeholder="e.g. Infosys Campus Drive 2026" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B' }}>Company Name</label>
              <input style={inp} value={form.companyName} onChange={set('companyName')} placeholder="Infosys" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B' }}>Mode</label>
              <select style={inp} value={form.mode} onChange={set('mode')}>
                <option>On-Campus</option>
                <option>Virtual</option>
                <option>Off-Campus</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B' }}>Date *</label>
              <input style={inp} type="date" value={form.driveDate} onChange={set('driveDate')} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B' }}>Registration Deadline</label>
              <input style={inp} type="date" value={form.registrationDeadline} onChange={set('registrationDeadline')} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B' }}>Venue / Link</label>
            <input style={inp} value={form.location} onChange={set('location')} placeholder="Auditorium / Google Meet link" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B' }}>Description</label>
            <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} value={form.description} onChange={set('description')} placeholder="Roles, eligibility, package details, what to bring..." />
          </div>

          {form.opportunityType === 'exam' && (
            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 12, marginTop: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#181818', marginBottom: 8 }}>Exam Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B' }}>Exam Provider</label>
                  <select style={inp} value={form.examProvider} onChange={set('examProvider')}>
                    {EXAM_PROVIDERS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B' }}>External Registration Link</label>
                  <input style={inp} value={form.registrationLink} onChange={set('registrationLink')} placeholder="https://..." />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B' }}>Link to In-Platform Assessment (optional)</label>
                <select style={inp} value={form.assessmentId} onChange={set('assessmentId')}>
                  <option value="">— None —</option>
                  {assessments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                </select>
              </div>
            </div>
          )}

          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 12, marginTop: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#181818', marginBottom: 8 }}>Eligibility (leave blank for all students)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B' }}>Min CGPA</label>
                <input style={inp} type="number" step="0.1" value={form.minCGPA} onChange={set('minCGPA')} placeholder="6.5" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B' }}>Passing Years (comma separated)</label>
                <input style={inp} value={form.passingYears} onChange={set('passingYears')} placeholder="2026, 2027" />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B' }}>Degrees (comma separated)</label>
              <input style={inp} value={form.degrees} onChange={set('degrees')} placeholder="B.Tech, M.Tech, MCA" />
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B' }}>Branches / Departments (comma separated)</label>
              <input style={inp} value={form.branches} onChange={set('branches')} placeholder="CSE, IT, ECE" />
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B' }}>Required Skills (comma separated)</label>
              <input style={inp} value={form.skills} onChange={set('skills')} placeholder="Java, SQL, Communication" />
            </div>
          </div>

          {error && <div style={{ color: '#BA0517', fontSize: 13 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button style={btnG} onClick={onClose}>Cancel</button>
            <button style={{ ...btnP, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={submit}>
              {saving ? 'Creating...' : `Create ${typeLabel}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const REG_STATUSES = ['registered', 'shortlisted', 'selected', 'rejected'];
const REG_COLORS = {
  registered: { bg: '#F1F5F9', color: '#475569' },
  shortlisted: { bg: 'rgba(245,158,11,0.12)', color: '#B45309' },
  selected: { bg: 'rgba(22,163,74,0.1)', color: '#16A34A' },
  rejected: { bg: 'rgba(186,5,23,0.08)', color: '#BA0517' },
};

function DriveDetailModal({ driveId, onClose }) {
  const [drive, setDrive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.getPlacementDrive(driveId)
      .then(r => setDrive(r?.data || null))
      .catch(e => setError(e.message || 'Failed to load drive'))
      .finally(() => setLoading(false));
  }, [driveId]);

  const updateStatus = async (candidateId, status) => {
    setDrive(d => ({ ...d, registrations: d.registrations.map(r => r.candidateId === candidateId ? { ...r, status } : r) }));
    try {
      await api.updatePlacementDriveRegistration(driveId, candidateId, { status });
    } catch { /* optimistic — already updated locally */ }
  };

  const regs = (drive?.registrations || []).filter(r => !filter || r.status === filter);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: Z.MODAL, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', width: 'min(640px, 100%)', height: '100%', overflowY: 'auto', boxShadow: '-8px 0 24px rgba(0,0,0,0.15)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, background: '#fff', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: '#706E6B', fontWeight: 700, textTransform: 'uppercase' }}>Placement Drive</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#181818' }}>{drive?.title || 'Loading...'}</div>
          </div>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, width: 32, height: 32, fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '16px 24px 24px' }}>
          {loading ? (
            <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10, justifyContent: 'center' }}><Spinner /> Loading...</div>
          ) : error ? (
            <div style={{ color: '#BA0517' }}>{error}</div>
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, fontSize: 13, color: '#706E6B' }}>
                <span>🗓️ {new Date(drive.driveDate).toLocaleDateString()}</span>
                <span>• {drive.mode}</span>
                {drive.companyName && <span>• 🏢 {drive.companyName}</span>}
                {drive.location && <span>• 📍 {drive.location}</span>}
              </div>
              {drive.description && <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>{drive.description}</p>}

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <button onClick={() => setFilter('')} style={{ ...btnG, padding: '4px 12px', fontSize: 12, background: !filter ? 'var(--app-primary,#0176D3)' : '#fff', color: !filter ? '#fff' : '#0176D3' }}>All ({drive.registrations.length})</button>
                {REG_STATUSES.map(s => {
                  const count = drive.registrations.filter(r => r.status === s).length;
                  return (
                    <button key={s} onClick={() => setFilter(s)} style={{ ...btnG, padding: '4px 12px', fontSize: 12, textTransform: 'capitalize', background: filter === s ? 'var(--app-primary,#0176D3)' : '#fff', color: filter === s ? '#fff' : '#0176D3' }}>{s} ({count})</button>
                  );
                })}
              </div>

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
                    <select value={r.status} onChange={e => updateStatus(r.candidateId, e.target.value)}
                      style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8, border: 'none', background: rc.bg, color: rc.color, textTransform: 'capitalize', cursor: 'pointer' }}>
                      {REG_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const RESOURCE_CATEGORIES = ['Aptitude', 'Coding', 'Verbal', 'Reasoning', 'Interview', 'Other'];

function TrainingResourcesPanel() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', url: '', description: '', category: 'Aptitude' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.getTrainingResources()
      .then(r => setResources(r?.data || []))
      .catch(e => setError(e.message || 'Failed to load training resources'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.title.trim() || !form.url.trim()) { setError('Title and URL are required.'); return; }
    setSaving(true);
    setError('');
    try {
      await api.createTrainingResource({
        title: form.title.trim(),
        url: form.url.trim(),
        description: form.description.trim(),
        category: form.category,
      });
      setForm({ title: '', url: '', description: '', category: 'Aptitude' });
      load();
    } catch (e) {
      setError(e.message || 'Failed to add resource');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Remove this training resource?')) return;
    try {
      await api.deleteTrainingResource(id);
      setResources(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      window.alert(e.message || 'Failed to remove resource');
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#181818', marginBottom: 12 }}>➕ Add Training Resource</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B' }}>Title *</label>
              <input style={inp} value={form.title} onChange={set('title')} placeholder="e.g. Quant Aptitude Practice Set" />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B' }}>Category</label>
              <select style={inp} value={form.category} onChange={set('category')}>
                {RESOURCE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B' }}>URL *</label>
            <input style={inp} value={form.url} onChange={set('url')} placeholder="https://..." />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B' }}>Description</label>
            <input style={inp} value={form.description} onChange={set('description')} placeholder="Short note for students" />
          </div>
          {error && <div style={{ color: '#BA0517', fontSize: 13 }}>{error}</div>}
          <div>
            <button style={{ ...btnP, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={submit}>
              {saving ? 'Adding...' : '+ Add Resource'}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10 }}><Spinner /> Loading...</div>
      ) : resources.length === 0 ? (
        <div style={{ ...card, color: '#706E6B', padding: 40, textAlign: 'center', fontSize: 14 }}>
          No training resources added yet. Add aptitude, coding or interview prep links for your students above.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {resources.map(r => (
            <div key={r.id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#181818' }}>{r.title}</h4>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0176D3', background: 'rgba(1,118,211,0.08)', borderRadius: 999, padding: '2px 10px' }}>{r.category}</span>
              </div>
              {r.description && <div style={{ fontSize: 12, color: '#706E6B' }}>{r.description}</div>}
              <a href={r.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#0176D3', fontWeight: 700, wordBreak: 'break-all' }}>{r.url}</a>
              <div>
                <button style={{ ...btnD, padding: '4px 12px', fontSize: 12 }} onClick={() => remove(r.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CollegeDrives() {
  const [tab, setTab] = useState('drives');
  const [jobs, setJobs] = useState([]);
  const [drives, setDrives] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [openDriveId, setOpenDriveId] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');

  const loadAll = () => {
    setLoading(true);
    Promise.all([api.getCollegeDrives(), api.getPlacementDrives()])
      .then(([j, d]) => {
        setJobs(j?.data || j || []);
        setDrives(d?.data || []);
      })
      .catch(e => setError(e.message || 'Failed to load placement drives'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  const notify = async (jobId) => {
    setStatuses(prev => ({ ...prev, [jobId]: 'sending' }));
    try {
      const res = await api.notifyCollegeDrive(jobId);
      const message = res?.message || `Notified ${res?.recipients ?? 0} student${res?.recipients === 1 ? '' : 's'}.`;
      setStatuses(prev => ({ ...prev, [jobId]: { message } }));
    } catch (e) {
      setStatuses(prev => ({ ...prev, [jobId]: { error: e.message || 'Failed to notify students' } }));
    }
  };

  const handleCreated = (res) => {
    setShowCreate(false);
    loadAll();
    if (res?.eligibleCount != null) {
      // Lightweight feedback without an extra toast system
      window.alert(`Drive created! ${res.eligibleCount} eligible student${res.eligibleCount === 1 ? '' : 's'} notified.`);
    }
  };

  const cancelDrive = async (id) => {
    if (!window.confirm('Cancel this placement drive?')) return;
    try {
      await api.deletePlacementDrive(id);
      setDrives(prev => prev.filter(d => d.id !== id));
    } catch (e) {
      window.alert(e.message || 'Failed to cancel drive');
    }
  };

  return (
    <div>
      <PageHeader
        title="📣 Placement Drives"
        subtitle="Schedule and run your own campus placement drives, or notify students about open job postings on TalentNest."
        action={<button style={btnP} onClick={() => setShowCreate(true)}>+ Schedule Drive</button>}
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setTab('drives')} style={{ ...btnG, background: tab === 'drives' ? 'var(--app-primary,#0176D3)' : '#fff', color: tab === 'drives' ? '#fff' : '#0176D3' }}>🏫 My Drives ({drives.length})</button>
        <button onClick={() => setTab('jobs')} style={{ ...btnG, background: tab === 'jobs' ? 'var(--app-primary,#0176D3)' : '#fff', color: tab === 'jobs' ? '#fff' : '#0176D3' }}>🌐 Job Openings ({jobs.length})</button>
        <button onClick={() => setTab('training')} style={{ ...btnG, background: tab === 'training' ? 'var(--app-primary,#0176D3)' : '#fff', color: tab === 'training' ? '#fff' : '#0176D3' }}>📚 Training Resources</button>
      </div>

      {tab === 'drives' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button onClick={() => setTypeFilter('')} style={{ ...btnG, padding: '4px 12px', fontSize: 12, background: !typeFilter ? 'var(--app-primary,#0176D3)' : '#fff', color: !typeFilter ? '#fff' : '#0176D3' }}>All</button>
          {OPPORTUNITY_TYPES.map(t => (
            <button key={t.value} onClick={() => setTypeFilter(t.value)} style={{ ...btnG, padding: '4px 12px', fontSize: 12, background: typeFilter === t.value ? 'var(--app-primary,#0176D3)' : '#fff', color: typeFilter === t.value ? '#fff' : '#0176D3' }}>{t.label}</button>
          ))}
        </div>
      )}

      {loading && <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10 }}><Spinner /> Loading...</div>}
      {error && <div style={{ color: '#BA0517', padding: 40 }}>{error}</div>}

      {!loading && !error && tab === 'drives' && (
        (() => {
          const filtered = typeFilter ? drives.filter(d => (d.opportunityType || 'placement') === typeFilter) : drives;
          return filtered.length === 0 ? (
            <div style={{ ...card, color: '#706E6B', padding: 40, textAlign: 'center', fontSize: 14 }}>
              No placement drives scheduled yet. Click "+ Schedule Drive" to organize your first campus drive.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {filtered.map(d => <PlacementDriveCard key={d.id} drive={d} onOpen={(drv) => setOpenDriveId(drv.id)} onDelete={cancelDrive} />)}
            </div>
          );
        })()
      )}

      {!loading && !error && tab === 'training' && <TrainingResourcesPanel />}

      {!loading && !error && tab === 'jobs' && (
        jobs.length === 0 ? (
          <div style={{ ...card, color: '#706E6B', padding: 40, textAlign: 'center', fontSize: 14 }}>
            No active job openings found right now. Check back later.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {jobs.map(job => (
              <DriveCard key={job.id} job={job} onNotify={notify} status={statuses[job.id]} />
            ))}
          </div>
        )
      )}

      {showCreate && <CreateDriveModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {openDriveId && <DriveDetailModal driveId={openDriveId} onClose={() => setOpenDriveId(null)} />}
    </div>
  );
}
