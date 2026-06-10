import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { card, inp, btnG, btnP } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const TH = { textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0' };
const TD = { padding: '12px 12px', fontSize: 13, color: '#181818', borderBottom: '1px solid #F1F5F9', verticalAlign: 'top' };

export default function CollegeStudents() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getCollegeStudents({ q: search, page })
      .then(r => {
        const body = r?.data !== undefined ? r : { data: r };
        setData(body.data || []);
        setTotal(body.total ?? (body.data || []).length);
        setPages(body.pages || 1);
      })
      .catch(e => setError(e.message || 'Failed to load students'))
      .finally(() => setLoading(false));
  }, [search, page]);

  function onSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    setSearch(q.trim());
  }

  return (
    <div>
      <PageHeader
        title="🎓 Students"
        subtitle="Students who registered on TalentNest with your college's name. They can apply to jobs across the platform — track them here."
      />

      <form onSubmit={onSearchSubmit} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name, email or phone..."
          style={{ ...inp, maxWidth: 320 }}
        />
        <button type="submit" style={btnP}>Search</button>
        {search && (
          <button type="button" style={btnG} onClick={() => { setQ(''); setSearch(''); setPage(1); }}>Clear</button>
        )}
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
                  <th style={TH}>Name</th>
                  <th style={TH}>Contact</th>
                  <th style={TH}>Profile</th>
                  <th style={TH}>Skills</th>
                  <th style={TH}>Applications</th>
                  <th style={TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map(s => (
                  <tr key={s.id}>
                    <td style={TD}>
                      <div style={{ fontWeight: 700 }}>{s.name || '—'}</div>
                      <div style={{ color: '#706E6B', fontSize: 12 }}>
                        Joined {s.joinedAt ? new Date(s.joinedAt).toLocaleDateString() : '—'}
                      </div>
                    </td>
                    <td style={TD}>
                      <div>{s.email || '—'}</div>
                      <div style={{ color: '#706E6B', fontSize: 12 }}>{s.phone || ''}</div>
                    </td>
                    <td style={TD}>
                      {s.isFresher ? <span>Fresher</span> : <span>{s.title || '—'}</span>}
                      {s.experience != null && !s.isFresher && (
                        <div style={{ color: '#706E6B', fontSize: 12 }}>{s.experience} yrs experience</div>
                      )}
                    </td>
                    <td style={TD}>
                      {(s.skills || []).slice(0, 4).join(', ') || '—'}
                      {(s.skills || []).length > 4 ? ', …' : ''}
                    </td>
                    <td style={TD}>{s.applications}</td>
                    <td style={TD}>
                      {s.placed ? (
                        <span style={{ color: '#16A34A', fontWeight: 700 }}>Placed</span>
                      ) : (
                        <span style={{ color: '#706E6B' }}>In Progress</span>
                      )}
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
    </div>
  );
}
