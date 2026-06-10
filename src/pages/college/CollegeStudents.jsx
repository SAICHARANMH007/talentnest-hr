import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { card, inp, btnG, btnP, Z } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const TH = { textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0' };
const TD = { padding: '12px 12px', fontSize: 13, color: '#181818', borderBottom: '1px solid #F1F5F9', verticalAlign: 'top' };

function TypeBadge({ type }) {
  const isAlumni = type === 'alumni';
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
      color: isAlumni ? '#7C3AED' : '#0176D3',
      background: isAlumni ? 'rgba(124,58,237,0.1)' : 'rgba(1,118,211,0.1)',
    }}>
      {isAlumni ? 'Alumni' : 'Student'}
    </span>
  );
}

function ProfileModal({ student, onClose }) {
  if (!student) return null;
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: Z.MODAL, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ ...card, width: '100%', maxWidth: 640, maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#181818' }}>{student.name || '—'}</h3>
            <div style={{ color: '#706E6B', fontSize: 13, marginTop: 4 }}>{student.email} {student.phone ? `• ${student.phone}` : ''}</div>
            <div style={{ marginTop: 8 }}><TypeBadge type={student.studentType} /></div>
          </div>
          <button onClick={onClose} style={{ ...btnG, padding: '6px 12px' }}>Close</button>
        </div>

        {!student.isFresher && (
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#181818' }}>Current Role</h4>
            <div style={{ fontSize: 13, color: '#706E6B' }}>
              {student.title || '—'}{student.currentCompany ? ` at ${student.currentCompany}` : ''}
              {student.experience != null ? ` • ${student.experience} yrs experience` : ''}
              {student.location ? ` • ${student.location}` : ''}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#181818' }}>Education</h4>
          {(student.education || []).length === 0 ? (
            <div style={{ fontSize: 13, color: '#706E6B' }}>No education details added yet.</div>
          ) : (
            student.education.map((e, i) => (
              <div key={i} style={{ fontSize: 13, color: '#181818', padding: '6px 0', borderBottom: i < student.education.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                <div style={{ fontWeight: 700 }}>{e.degree || '—'}{e.field ? ` (${e.field})` : ''}</div>
                <div style={{ color: '#706E6B' }}>
                  {e.institution || ''}{e.university ? `, ${e.university}` : ''}
                  {e.year ? ` • ${e.year}` : ''}
                  {e.grade ? ` • Grade: ${e.grade}` : ''}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#181818' }}>Certifications</h4>
          {(student.certifications || []).length === 0 ? (
            <div style={{ fontSize: 13, color: '#706E6B' }}>No certifications added yet.</div>
          ) : (
            student.certifications.map((c, i) => (
              <div key={i} style={{ fontSize: 13, color: '#181818', padding: '4px 0' }}>
                {c.name || '—'}{c.issuer ? ` — ${c.issuer}` : ''}{c.year ? ` (${c.year})` : ''}
                {c.url ? <> · <a href={c.url} target="_blank" rel="noreferrer">credential</a></> : null}
              </div>
            ))
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#181818' }}>Projects</h4>
          <div style={{ fontSize: 13, color: '#706E6B', whiteSpace: 'pre-wrap' }}>{student.projects || 'No projects added yet.'}</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#181818' }}>Achievements</h4>
          <div style={{ fontSize: 13, color: '#706E6B', whiteSpace: 'pre-wrap' }}>{student.achievements || 'No achievements added yet.'}</div>
        </div>

        <div>
          <h4 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#181818' }}>Skills</h4>
          <div style={{ fontSize: 13, color: '#706E6B' }}>{(student.skills || []).join(', ') || '—'}</div>
        </div>
      </div>
    </div>
  );
}

// Builds a CSV file from the given student rows and triggers a browser download.
function downloadStudentsCSV(rows) {
  const headers = ['Name', 'Email', 'Phone', 'Type', 'Degree', 'Institution', 'Passing Year', 'Grade', 'Skills', 'Status'];
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(',')];
  rows.forEach(s => {
    lines.push([
      s.name, s.email, s.phone, s.studentType === 'alumni' ? 'Alumni' : 'Student',
      s.latestEducation?.degree || '', s.latestEducation?.institution || '', s.latestEducation?.year || '',
      s.latestEducation?.grade || '', (s.skills || []).join('; '), s.placed ? 'Placed' : 'In Progress',
    ].map(escape).join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CollegeStudents() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(() => new Set());

  useEffect(() => {
    setLoading(true);
    setChecked(new Set());
    api.getCollegeStudents({ q: search, type, page })
      .then(r => {
        const body = r?.data !== undefined ? r : { data: r };
        setData(body.data || []);
        setTotal(body.total ?? (body.data || []).length);
        setPages(body.pages || 1);
      })
      .catch(e => setError(e.message || 'Failed to load students'))
      .finally(() => setLoading(false));
  }, [search, type, page]);

  function onSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    setSearch(q.trim());
  }

  function toggleChecked(id) {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setChecked(prev => prev.size === data.length ? new Set() : new Set(data.map(s => s.id)));
  }

  function exportSelected() {
    const rows = data.filter(s => checked.has(s.id));
    downloadStudentsCSV(rows.length ? rows : data);
  }

  return (
    <div>
      <PageHeader
        title="🎓 Students"
        subtitle="Students and alumni who registered on TalentNest with your college's name. Click a row to view their full profile — education, CGPA, certifications and projects."
      />

      <form onSubmit={onSearchSubmit} style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name, email or phone..."
          style={{ ...inp, maxWidth: 300 }}
        />
        <select
          value={type}
          onChange={e => { setType(e.target.value); setPage(1); }}
          style={{ ...inp, maxWidth: 180 }}
        >
          <option value="">All (Students &amp; Alumni)</option>
          <option value="student">Current Students</option>
          <option value="alumni">Alumni</option>
        </select>
        <button type="submit" style={btnP}>Search</button>
        {(search || type) && (
          <button type="button" style={btnG} onClick={() => { setQ(''); setSearch(''); setType(''); setPage(1); }}>Clear</button>
        )}
        <button type="button" style={{ ...btnG, marginLeft: 'auto' }} onClick={exportSelected} disabled={data.length === 0}>
          ⬇ Export {checked.size > 0 ? `Selected (${checked.size})` : 'All (this page)'} CSV
        </button>
      </form>

      {error && <div style={{ color: '#BA0517', padding: '12px 0' }}>{error}</div>}

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10, justifyContent: 'center' }}><Spinner /> Loading...</div>
        ) : data.length === 0 ? (
          <div style={{ color: '#706E6B', padding: 40, textAlign: 'center', fontSize: 14 }}>
            No students found yet. Students appear here once they register on TalentNest with your college's name.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: 36 }}>
                    <input type="checkbox" checked={data.length > 0 && checked.size === data.length} onChange={toggleAll} />
                  </th>
                  <th style={TH}>Name</th>
                  <th style={TH}>Type</th>
                  <th style={TH}>Education</th>
                  <th style={TH}>CGPA / Grade</th>
                  <th style={TH}>Skills</th>
                  <th style={TH}>Applications</th>
                  <th style={TH}>Status</th>
                  <th style={TH}></th>
                </tr>
              </thead>
              <tbody>
                {data.map(s => (
                  <tr key={s.id} onClick={() => setSelected(s)} style={{ cursor: 'pointer' }}>
                    <td style={TD} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={checked.has(s.id)} onChange={() => toggleChecked(s.id)} />
                    </td>
                    <td style={TD}>
                      <div style={{ fontWeight: 700 }}>{s.name || '—'}</div>
                      <div style={{ color: '#706E6B', fontSize: 12 }}>{s.email || ''}</div>
                    </td>
                    <td style={TD}><TypeBadge type={s.studentType} /></td>
                    <td style={TD}>
                      {s.latestEducation ? (
                        <>
                          <div>{s.latestEducation.degree || '—'}</div>
                          <div style={{ color: '#706E6B', fontSize: 12 }}>
                            {s.latestEducation.institution || ''}{s.latestEducation.year ? ` • ${s.latestEducation.year}` : ''}
                          </div>
                        </>
                      ) : '—'}
                    </td>
                    <td style={TD}>{s.latestEducation?.grade || '—'}</td>
                    <td style={TD}>
                      {(s.skills || []).slice(0, 3).join(', ') || '—'}
                      {(s.skills || []).length > 3 ? ', …' : ''}
                    </td>
                    <td style={TD}>{s.applications}</td>
                    <td style={TD}>
                      {s.placed ? (
                        <span style={{ color: '#16A34A', fontWeight: 700 }}>Placed</span>
                      ) : (
                        <span style={{ color: '#706E6B' }}>In Progress</span>
                      )}
                    </td>
                    <td style={TD}>
                      <button
                        onClick={e => { e.stopPropagation(); setSelected(s); }}
                        style={{ ...btnG, padding: '5px 12px', fontSize: 12 }}
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 }}>
          <button style={btnG} disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
          <span style={{ fontSize: 13, color: '#706E6B' }}>Page {page} of {pages} ({total} total)</span>
          <button style={btnG} disabled={page >= pages} onClick={() => setPage(p => Math.min(pages, p + 1))}>Next</button>
        </div>
      )}

      <ProfileModal student={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
