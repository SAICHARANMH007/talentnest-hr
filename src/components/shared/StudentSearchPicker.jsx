import { useState, useEffect } from 'react';
import Spinner from '../ui/Spinner.jsx';
import { inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';

/**
 * Search-and-select picker for a college's students. Search matches name,
 * email, role/degree/branch case-insensitively and regardless of spacing or
 * punctuation (e.g. "mba", "MBA", "M.B.A" and "m b a" all match a student
 * whose degree is "Master of Business Administration"). Selected student IDs
 * are tracked in the `selected` Set passed in by the caller.
 */
export default function StudentSearchPicker({ selected, setSelected }) {
  const [q, setQ] = useState('');
  const [year, setYear] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!q.trim() && !year.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    const handle = setTimeout(() => {
      api.getCollegeStudents({ q: q.trim(), year: year.trim(), limit: 50 })
        .then(r => setResults(r?.data || []))
        .catch(() => setResults([]))
        .finally(() => { setLoading(false); setSearched(true); });
    }, 350);
    return () => clearTimeout(handle);
  }, [q, year]);

  const toggleOne = (id) => setSelected(s => {
    const next = new Set(s);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const selectAllResults = () => setSelected(s => {
    const next = new Set(s);
    results.forEach(r => next.add(r.id));
    return next;
  });

  const clearResultsSelection = () => setSelected(s => {
    const next = new Set(s);
    results.forEach(r => next.delete(r.id));
    return next;
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name, email, role/degree (e.g. MBA, CSE, B.Tech)..."
          style={{ ...inp, flex: 2, minWidth: 200 }}
        />
        <input
          value={year}
          onChange={e => setYear(e.target.value)}
          placeholder="Passing year (optional)"
          style={{ ...inp, flex: 1, minWidth: 120 }}
        />
      </div>

      {selected.size > 0 && (
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0176D3', marginBottom: 8 }}>
          ✅ {selected.size} student{selected.size === 1 ? '' : 's'} selected
          <button onClick={() => setSelected(new Set())} style={{ marginLeft: 10, background: 'none', border: 'none', color: '#BA0517', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Clear all</button>
        </div>
      )}

      {loading && <div style={{ fontSize: 12, color: '#706E6B', display: 'flex', alignItems: 'center', gap: 6 }}><Spinner size={14} /> Searching...</div>}

      {!loading && searched && (
        results.length === 0 ? (
          <div style={{ fontSize: 12, color: '#706E6B' }}>No students matched that search.</div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={selectAllResults} style={{ background: 'none', border: 'none', color: '#0176D3', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: 0 }}>Select all {results.length} results</button>
              <button onClick={clearResultsSelection} style={{ background: 'none', border: 'none', color: '#706E6B', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: 0 }}>Deselect these</button>
              {results.length >= 50 && <span style={{ fontSize: 11, color: '#94A3B8' }}>Showing top 50 matches — refine your search to see more.</span>}
            </div>
            <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 8 }}>
              {results.map(s => {
                const deg = s.latestEducation?.degree || s.latestEducation?.field || '';
                const yr = s.latestEducation?.year || '';
                return (
                  <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#181818', padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #F3F2F2' }}>
                    <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleOne(s.id)} style={{ accentColor: '#0176D3' }} />
                    <span style={{ fontWeight: 700 }}>{s.name || s.email}</span>
                    <span style={{ color: '#706E6B' }}>{s.email}</span>
                    {deg && <span style={{ color: '#706E6B' }}>• {deg}{yr ? ` (${yr})` : ''}</span>}
                  </label>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
}
