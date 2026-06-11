import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { card } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const TH = { textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0' };
const TD = { padding: '12px 12px', fontSize: 13, color: '#181818', borderBottom: '1px solid #F1F5F9', verticalAlign: 'top' };

const STAT_S = {
  background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12,
  padding: 20, display: 'flex', flexDirection: 'column', gap: 6,
};

const PAGE_SIZE = 50;

function CandidateDrawer({ collegeName, onClose }) {
  const [candidates, setCandidates] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!collegeName) return;
    setLoading(true);
    setCandidates([]);
    api.getCollegeGroupCandidates(collegeName, { page: 1, limit: PAGE_SIZE })
      .then(r => {
        setCandidates(r?.data || []);
        setTotal(r?.total ?? (r?.data || []).length);
        setHasMore(!!r?.hasMore);
      })
      .catch(e => setError(e.message || 'Failed to load candidates'))
      .finally(() => setLoading(false));
  }, [collegeName]);

  const loadMore = () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const nextPage = Math.floor(candidates.length / PAGE_SIZE) + 1;
    api.getCollegeGroupCandidates(collegeName, { page: nextPage, limit: PAGE_SIZE })
      .then(r => {
        setCandidates(prev => [...prev, ...(r?.data || [])]);
        setHasMore(!!r?.hasMore);
      })
      .catch(e => setError(e.message || 'Failed to load candidates'))
      .finally(() => setLoadingMore(false));
  };

  if (!collegeName) return null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', width: 'min(520px, 100%)', height: '100%', overflowY: 'auto', boxShadow: '-8px 0 24px rgba(0,0,0,0.15)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 11, color: '#706E6B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>College{total ? ` · ${total}` : ''}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#181818' }}>{collegeName}</div>
          </div>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, width: 32, height: 32, fontSize: 16, cursor: 'pointer', color: '#374151' }}>✕</button>
        </div>
        <div style={{ padding: '12px 24px 24px' }}>
          {loading ? (
            <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10, justifyContent: 'center' }}><Spinner /> Loading...</div>
          ) : error ? (
            <div style={{ color: '#BA0517', padding: '12px 0' }}>{error}</div>
          ) : candidates.length === 0 ? (
            <div style={{ color: '#706E6B', padding: 40, textAlign: 'center', fontSize: 14 }}>No candidates found.</div>
          ) : candidates.map(c => (
            <div key={c.id} style={{ padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#181818' }}>{c.name || c.email}</div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: c.isCurrentStudent ? 'rgba(1,118,211,0.1)' : 'rgba(22,163,74,0.1)', color: c.isCurrentStudent ? '#0176D3' : '#16A34A' }}>
                  {c.isCurrentStudent ? 'Current Student' : 'Alumni'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#706E6B', marginTop: 2 }}>{c.email}{c.phone ? ` · ${c.phone}` : ''}</div>
              <div style={{ fontSize: 12, color: '#706E6B', marginTop: 2 }}>
                {c.degree && <span>{c.degree}{c.year ? ` (${c.year})` : ''}</span>}
                {c.currentCompany && <span> · {c.title ? `${c.title} @ ` : ''}{c.currentCompany}</span>}
                {c.location && <span> · {c.location}</span>}
              </div>
            </div>
          ))}
          {!loading && hasMore && (
            <div style={{ padding: '16px 0', textAlign: 'center' }}>
              <button onClick={loadMore} disabled={loadingMore}
                style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #0176D3', background: '#fff', color: '#0176D3', fontSize: 13, fontWeight: 700, cursor: loadingMore ? 'default' : 'pointer' }}>
                {loadingMore ? 'Loading…' : `Load more (${candidates.length} of ${total})`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminCollegeGroups() {
  const [data, setData] = useState([]);
  const [incomplete, setIncomplete] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.getCollegeGroups()
      .then(r => {
        const body = r?.data !== undefined ? r : { data: r };
        setData(body.data || []);
        setIncomplete(body.incompleteProfiles || 0);
      })
      .catch(e => setError(e.message || 'Failed to load college groups'))
      .finally(() => setLoading(false));
  }, []);

  const totalGroups = data.length;
  const totalStudents = data.reduce((sum, g) => sum + g.totalStudents, 0);
  const groupsWithOfficer = data.filter(g => g.hasPlacementOfficer).length;

  return (
    <div>
      <PageHeader
        title="🏫 College Groups"
        subtitle="Every candidate is automatically grouped into a college community based on the College/School Name (or education history) on their profile. Click a row to see the candidates."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={STAT_S}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>College Groups</span>
          <span style={{ fontSize: 32, fontWeight: 800, color: '#181818' }}>{totalGroups}</span>
        </div>
        <div style={STAT_S}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Students Grouped</span>
          <span style={{ fontSize: 32, fontWeight: 800, color: '#181818' }}>{totalStudents}</span>
        </div>
        <div style={STAT_S}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>With Placement Officer</span>
          <span style={{ fontSize: 32, fontWeight: 800, color: '#181818' }}>{groupsWithOfficer}</span>
        </div>
        <div style={STAT_S}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Profiles Missing College</span>
          <span style={{ fontSize: 32, fontWeight: 800, color: '#BA0517' }}>{incomplete}</span>
        </div>
      </div>

      {incomplete > 0 && (
        <div style={{ ...card, marginBottom: 16, borderLeft: '4px solid #BA0517' }}>
          <strong>{incomplete}</strong> candidate{incomplete === 1 ? '' : 's'} have not added a College/School Name or education history yet,
          so they aren't grouped under any college community. They're prompted in-app to complete their profile.
        </div>
      )}

      {error && <div style={{ color: '#BA0517', padding: '12px 0' }}>{error}</div>}

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10, justifyContent: 'center' }}><Spinner /> Loading...</div>
        ) : data.length === 0 ? (
          <div style={{ color: '#706E6B', padding: 40, textAlign: 'center', fontSize: 14 }}>No college groups found yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>College / School</th>
                  <th style={TH}>Total Students</th>
                  <th style={TH}>Current Students</th>
                  <th style={TH}>Alumni</th>
                  <th style={TH}>Placement Officer</th>
                  <th style={TH}>Source</th>
                </tr>
              </thead>
              <tbody>
                {data.map(g => (
                  <tr key={g.name} onClick={() => setSelected(g.name)} style={{ cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                    <td style={TD}><div style={{ fontWeight: 700, color: '#0176D3' }}>{g.name}</div></td>
                    <td style={TD}>{g.totalStudents}</td>
                    <td style={TD}>{g.currentStudents}</td>
                    <td style={TD}>{g.alumni}</td>
                    <td style={TD}>
                      {g.hasPlacementOfficer ? (
                        <span style={{ color: '#16A34A', fontWeight: 700 }}>Registered</span>
                      ) : (
                        <span style={{ color: '#706E6B' }}>Not registered</span>
                      )}
                    </td>
                    <td style={TD}>
                      {g.derivedFromEducationOnly > 0 ? (
                        <span style={{ color: '#706E6B', fontSize: 12 }}>
                          {g.derivedFromEducationOnly} from education history only
                        </span>
                      ) : (
                        <span style={{ color: '#706E6B', fontSize: 12 }}>College field</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CandidateDrawer collegeName={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
