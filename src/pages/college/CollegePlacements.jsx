import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { card, inp, btnG, btnP } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const TH = { textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0' };
const TD = { padding: '12px 12px', fontSize: 13, color: '#181818', borderBottom: '1px solid #F1F5F9', verticalAlign: 'top' };

const STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'];

const STAGE_COLORS = {
  Applied: '#706E6B',
  Screening: '#0176D3',
  Interview: '#9333EA',
  Offer: '#D97706',
  Hired: '#16A34A',
  Rejected: '#BA0517',
};

export default function CollegePlacements() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getCollegePlacements({ q: search, stage, page })
      .then(r => {
        const body = r?.data !== undefined ? r : { data: r };
        setData(body.data || []);
        setTotal(body.total ?? (body.data || []).length);
        setPages(body.pages || 1);
      })
      .catch(e => setError(e.message || 'Failed to load placement records'))
      .finally(() => setLoading(false));
  }, [search, stage, page]);

  function onSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    setSearch(q.trim());
  }

  return (
    <div>
      <PageHeader
        title="📇 Placement Records"
        subtitle="Track your students' job applications and placement outcomes across companies hiring on TalentNest."
      />

      <form onSubmit={onSearchSubmit} style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by student name or email..."
          style={{ ...inp, maxWidth: 300 }}
        />
        <select
          value={stage}
          onChange={e => { setStage(e.target.value); setPage(1); }}
          style={{ ...inp, maxWidth: 180 }}
        >
          <option value="">All Stages</option>
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" style={btnP}>Search</button>
        {(search || stage) && (
          <button type="button" style={btnG} onClick={() => { setQ(''); setSearch(''); setStage(''); setPage(1); }}>Clear</button>
        )}
      </form>

      {error && <div style={{ color: '#BA0517', padding: '12px 0' }}>{error}</div>}

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10, justifyContent: 'center' }}><Spinner /> Loading...</div>
        ) : data.length === 0 ? (
          <div style={{ color: '#706E6B', padding: 40, textAlign: 'center', fontSize: 14 }}>
            No placement records found yet. Records appear here once your students apply to jobs on TalentNest.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Student</th>
                  <th style={TH}>Job</th>
                  <th style={TH}>Company</th>
                  <th style={TH}>Stage</th>
                  <th style={TH}>Applied</th>
                </tr>
              </thead>
              <tbody>
                {data.map(a => (
                  <tr key={a.id}>
                    <td style={TD}>
                      <div style={{ fontWeight: 700 }}>{a.studentName || '—'}</div>
                      <div style={{ color: '#706E6B', fontSize: 12 }}>{a.studentEmail || ''}</div>
                    </td>
                    <td style={TD}>{a.jobTitle || '—'}</td>
                    <td style={TD}>{a.company || '—'}</td>
                    <td style={TD}>
                      <span style={{ color: STAGE_COLORS[a.stage] || '#706E6B', fontWeight: 700 }}>{a.stage || '—'}</span>
                    </td>
                    <td style={TD}>{a.appliedAt ? new Date(a.appliedAt).toLocaleDateString() : '—'}</td>
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
