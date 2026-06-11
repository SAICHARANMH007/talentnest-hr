import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import CompanyAutocomplete from '../../components/shared/CompanyAutocomplete.jsx';
import { btnP, btnG, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const OPPORTUNITY_TYPES = [
  { value: 'placement', label: '🎯 Placement Drive' },
  { value: 'internship', label: '💼 Internship' },
  { value: 'exam', label: '📝 Exam / Test' },
];

const EXAM_PROVIDERS = ['TCS NQT', 'AMCAT', 'CoCubes', 'HackerRank', 'HackerEarth', 'eLitmus', 'Other'];

export default function CollegeDriveCreate() {
  const navigate = useNavigate();
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
      if (res?.eligibleCount != null) {
        window.alert(`Drive created! ${res.eligibleCount} eligible student${res.eligibleCount === 1 ? '' : 's'} notified.`);
      }
      navigate('/app/drives');
    } catch (e) {
      setError(e.message || 'Failed to create drive');
    } finally {
      setSaving(false);
    }
  };

  const typeLabel = form.opportunityType === 'internship' ? 'Internship' : form.opportunityType === 'exam' ? 'Exam / Test' : 'Placement Drive';

  return (
    <div>
      <button onClick={() => navigate('/app/drives')} style={{ ...btnG, marginBottom: 12 }}>← Back to Placement Drives</button>
      <PageHeader title={`📣 Schedule a ${typeLabel}`} subtitle="Create a placement drive, internship or exam opportunity for your students." />

      <div style={{ display: 'grid', gap: 12, maxWidth: 640 }}>
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
            <CompanyAutocomplete
              value={form.companyName}
              onChange={v => setForm(f => ({ ...f, companyName: v }))}
              label="Company Name"
              labelStyle={{ fontSize: 12, fontWeight: 700, color: '#706E6B', display: 'block', marginBottom: 4 }}
              inputStyle={inp}
              dropdownStyle={{ background: '#fff', border: '1.5px solid #D6D9DE', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
              itemStyle={{ color: '#181818' }}
              itemHoverBg="rgba(1,118,211,0.08)"
              placeholder="Infosys"
            />
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
          <button style={btnG} onClick={() => navigate('/app/drives')}>Cancel</button>
          <button style={{ ...btnP, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={submit}>
            {saving ? 'Creating...' : `Create ${typeLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
}
