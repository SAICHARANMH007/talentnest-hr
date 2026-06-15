import { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import CollegeAutocomplete from '../../components/shared/CollegeAutocomplete.jsx';
import { card, inp, btnP, btnG } from '../../constants/styles.js';
import { DEGREES, ALL_BRANCHES } from '../../constants/education.js';

const STATUS_COLORS = {
  upcoming: { bg: 'rgba(1,118,211,0.1)', color: '#0176D3' },
  ongoing: { bg: 'rgba(245,158,11,0.12)', color: '#B45309' },
  completed: { bg: 'rgba(22,163,74,0.1)', color: '#16A34A' },
  cancelled: { bg: 'rgba(186,5,23,0.08)', color: '#BA0517' },
};

const REQUEST_STATUS_COLORS = {
  pending: { bg: 'rgba(245,158,11,0.12)', color: '#B45309', label: '⏳ Pending approval' },
  rejected: { bg: 'rgba(186,5,23,0.08)', color: '#BA0517', label: '❌ Declined by college' },
};

const OPPORTUNITY_TYPE_LABELS = {
  placement: '🎯 Placement Drive',
  internship: '💼 Internship',
  exam: '📝 Exam / Test',
};

function RequestDriveForm({ onClose, onSent }) {
  const [form, setForm] = useState({
    collegeName: '', title: '', description: '', mode: 'On-Campus', location: '',
    driveDate: '', registrationDeadline: '', degrees: [], branches: [], passingYears: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target?.value ?? e }));
  const toggle = (key, value) => setForm(f => ({ ...f, [key]: f[key].includes(value) ? f[key].filter(v => v !== value) : [...f[key], value] }));

  const submit = async () => {
    if (!form.collegeName.trim() || !form.title.trim() || !form.driveDate) {
      setError('College, title and drive date are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.requestCampusDrive({
        collegeName: form.collegeName.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        mode: form.mode,
        location: form.location.trim(),
        driveDate: form.driveDate,
        registrationDeadline: form.registrationDeadline || null,
        eligibility: {
          degrees: form.degrees,
          branches: form.branches,
          passingYears: form.passingYears.split(',').map(s => s.trim()).filter(Boolean).map(Number),
        },
      });
      onSent();
    } catch (e) {
      setError(e.message || 'Failed to send drive request');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ ...card, marginBottom: 16, border: '1.5px solid rgba(1,118,211,0.25)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#181818' }}>📨 Request a Campus Drive</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#706E6B', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>✕ Close</button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <CollegeAutocomplete
          value={form.collegeName}
          onChange={set('collegeName')}
          label="College *"
          labelStyle={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}
          inputStyle={inp}
          dropdownStyle={{ background: '#fff', border: '1.5px solid #D6D9DE', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
          itemStyle={{ color: '#181818' }}
          itemHoverBg="rgba(1,118,211,0.08)"
          placeholder="Search registered college..."
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Drive Title *</label>
          <input style={inp} value={form.title} onChange={set('title')} placeholder="Campus Recruitment Drive 2026" />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Drive Date *</label>
          <input style={inp} type="date" value={form.driveDate} onChange={set('driveDate')} />
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
          <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Registration Deadline</label>
          <input style={inp} type="date" value={form.registrationDeadline} onChange={set('registrationDeadline')} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Passing Years (comma separated)</label>
          <input style={inp} value={form.passingYears} onChange={set('passingYears')} placeholder="2026, 2027" />
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Description</label>
        <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={form.description} onChange={set('description')} placeholder="Roles, eligibility, package details..." />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Eligible Degrees (leave blank for all students)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 100, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 8, padding: 8 }}>
          {DEGREES.map(d => (
            <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.degrees.includes(d)} onChange={() => toggle('degrees', d)} style={{ accentColor: '#0176D3' }} />
              {d}
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}>Eligible Branches / Specializations (leave blank for all)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 100, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 8, padding: 8 }}>
          {ALL_BRANCHES.map(b => (
            <label key={b} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.branches.includes(b)} onChange={() => toggle('branches', b)} style={{ accentColor: '#0176D3' }} />
              {b}
            </label>
          ))}
        </div>
      </div>

      {error && <div style={{ color: '#BA0517', fontSize: 12, marginBottom: 8 }}>{error}</div>}

      <button onClick={submit} disabled={saving} style={{ ...btnP, opacity: saving ? 0.6 : 1 }}>{saving ? 'Sending...' : '📨 Send Request'}</button>
      <p style={{ fontSize: 12, color: '#706E6B', marginTop: 8 }}>The college's placement office will review your eligibility criteria and, on approval, the drive will be added for matching students and they'll be notified automatically.</p>
    </div>
  );
}

export default function CompanyCollegeDrives() {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [showRequest, setShowRequest] = useState(false);

  const load = () => {
    api.getCompanyCollegeDrives()
      .then(r => setDrives(r?.data || []))
      .catch(e => setError(e.message || 'Failed to load college drives'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filteredDrives = collegeFilter.trim()
    ? drives.filter(d => (d.collegeName || '').toLowerCase().includes(collegeFilter.trim().toLowerCase()))
    : drives;

  return (
    <div>
      <PageHeader
        title="🎓 College Placement Drives"
        subtitle="Placement drives, internships and exams your organization is conducting across colleges."
        action={<button onClick={() => setShowRequest(s => !s)} style={btnP}>{showRequest ? '✕ Cancel' : '📨 Request Campus Drive'}</button>}
      />

      {showRequest && (
        <RequestDriveForm
          onClose={() => setShowRequest(false)}
          onSent={() => { setShowRequest(false); load(); }}
        />
      )}

      {drives.length > 0 && (
        <div style={{ maxWidth: 320, marginBottom: 16 }}>
          <CollegeAutocomplete
            value={collegeFilter}
            onChange={setCollegeFilter}
            label="Filter by College"
            labelStyle={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}
            inputStyle={inp}
            dropdownStyle={{ background: '#fff', border: '1.5px solid #D6D9DE', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
            itemStyle={{ color: '#181818' }}
            itemHoverBg="rgba(1,118,211,0.08)"
            placeholder="Search college name..."
          />
        </div>
      )}

      {loading && <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10 }}><Spinner /> Loading...</div>}
      {error && <div style={{ color: '#BA0517', padding: 40 }}>{error}</div>}

      {!loading && !error && (
        filteredDrives.length === 0 ? (
          <div style={{ ...card, color: '#706E6B', padding: 40, textAlign: 'center', fontSize: 14 }}>
            {drives.length === 0
              ? 'No placement drives found for your organization yet. When a college schedules a drive with your company name, it will show up here.'
              : 'No drives found for that college.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {filteredDrives.map(d => {
              const sc = STATUS_COLORS[d.status] || STATUS_COLORS.upcoming;
              return (
                <div key={d.id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#181818' }}>{d.title}</h3>
                      <div style={{ fontSize: 13, color: '#706E6B', marginTop: 2 }}>🎓 {d.collegeName || 'College'}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, background: sc.bg, color: sc.color, textTransform: 'capitalize' }}>{d.status}</span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0176D3', background: 'rgba(1,118,211,0.08)', borderRadius: 999, padding: '2px 10px' }}>
                      {OPPORTUNITY_TYPE_LABELS[d.opportunityType] || OPPORTUNITY_TYPE_LABELS.placement}
                    </span>
                    {(d.requestStatus === 'pending' || d.requestStatus === 'rejected') && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: REQUEST_STATUS_COLORS[d.requestStatus].color, background: REQUEST_STATUS_COLORS[d.requestStatus].bg, borderRadius: 999, padding: '2px 10px' }}>
                        {REQUEST_STATUS_COLORS[d.requestStatus].label}
                      </span>
                    )}
                    {d.examProvider && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#B45309', background: 'rgba(245,158,11,0.12)', borderRadius: 999, padding: '2px 10px' }}>{d.examProvider}</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 12, color: '#706E6B' }}>
                    <span>🗓️ {new Date(d.driveDate).toLocaleDateString()}</span>
                    <span>• {d.mode}</span>
                    {d.location && <span>• 📍 {d.location}</span>}
                  </div>

                  {d.description && <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>{d.description}</p>}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#181818' }}>👥 {d.registeredCount} registered</span>
                    {d.shortlistedCount > 0 && <span style={{ fontSize: 12, color: '#B45309' }}>📋 {d.shortlistedCount} shortlisted</span>}
                    {d.selectedCount > 0 && <span style={{ fontSize: 12, color: '#16A34A' }}>✅ {d.selectedCount} selected</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
