import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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

function StageBadge({ stage }) {
  const color = STAGE_COLORS[stage] || '#706E6B';
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
      color, background: `${color}1A`, border: `1px solid ${color}33`,
    }}>
      {stage || '—'}
    </span>
  );
}

function NotesCell({ record, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(record.collegeNotes || '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setSaving(true); setErr('');
    try {
      await api.updateCollegePlacementNotes(record.id, value.trim());
      onSaved(record.id, value.trim());
      setEditing(false);
    } catch (e) {
      setErr(e.message || 'Failed to save note');
    }
    setSaving(false);
  };

  if (!editing) {
    return (
      <div onClick={() => setEditing(true)} style={{ cursor: 'pointer', minHeight: 20 }}>
        {record.collegeNotes
          ? <span style={{ color: '#181818' }}>{record.collegeNotes}</span>
          : <span style={{ color: '#C4C2C0', fontStyle: 'italic' }}>+ Add note</span>}
      </div>
    );
  }

  return (
    <div style={{ minWidth: 200 }}>
      <textarea
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Private follow-up note (visible only to your college)..."
        style={{ ...inp, width: '100%', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <button style={{ ...btnP, padding: '4px 12px', fontSize: 12 }} disabled={saving} onClick={save}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button style={{ ...btnG, padding: '4px 12px', fontSize: 12 }} onClick={() => { setValue(record.collegeNotes || ''); setEditing(false); setErr(''); }}>
          Cancel
        </button>
      </div>
      {err && <div style={{ color: '#BA0517', fontSize: 11, marginTop: 4 }}>{err}</div>}
    </div>
  );
}

export default function CollegePlacements() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState(() => searchParams.get('q') || '');
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [stage, setStage] = useState(() => searchParams.get('stage') || '');
  const [company, setCompany] = useState(() => searchParams.get('company') || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getCollegePlacements({ q: search, stage, company, page })
      .then(r => {
        const body = r?.data !== undefined ? r : { data: r };
        setData(body.data || []);
        setTotal(body.total ?? (body.data || []).length);
        setPages(body.pages || 1);
      })
      .catch(e => setError(e.message || 'Failed to load placement records'))
      .finally(() => setLoading(false));
  }, [search, stage, company, page]);

  function onSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    setSearch(q.trim());
  }

  function clearCompanyFilter() {
    setCompany(''); setPage(1);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('company');
      return next;
    });
  }

  function onNoteSaved(id, notes) {
    setData(prev => prev.map(r => r.id === id ? { ...r, collegeNotes: notes } : r));
  }

  // Quick stage summary chips
  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s] = data.filter(r => r.stage === s).length;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="📇 Placement Records"
        subtitle="Track your students' job applications and placement outcomes across companies hiring on TalentNest. Add private follow-up notes for your own reference."
      />

      {company && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, color: '#181818' }}>
          <span style={{ fontWeight: 700 }}>Filtered by:</span>
          <span style={{ background: '#FEF3E7', color: '#D97706', borderRadius: 999, padding: '4px 12px', fontWeight: 600 }}>Company: {company}</span>
          <button type="button" style={{ ...btnG, padding: '4px 12px', fontSize: 12 }} onClick={clearCompanyFilter}>✕ Clear</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {STAGES.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => { setStage(stage === s ? '' : s); setPage(1); }}
            style={{
              border: `1px solid ${stage === s ? STAGE_COLORS[s] : '#E2E8F0'}`,
              background: stage === s ? `${STAGE_COLORS[s]}1A` : '#fff',
              color: stage === s ? STAGE_COLORS[s] : '#706E6B',
              borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {s} {stageCounts[s] ? `· ${stageCounts[s]}` : ''}
          </button>
        ))}
      </div>

      <form onSubmit={onSearchSubmit} style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by student name or email..."
          style={{ ...inp, maxWidth: 300 }}
        />
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
                  <th style={TH}>Your Notes</th>
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
                      <StageBadge stage={a.stage} />
                    </td>
                    <td style={TD}>{a.appliedAt ? new Date(a.appliedAt).toLocaleDateString() : '—'}</td>
                    <td style={{ ...TD, fontSize: 12 }}>
                      <NotesCell record={a} onSaved={onNoteSaved} />
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
