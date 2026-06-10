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

function CandidateDrawer({ companyName, onClose }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!companyName) return;
    setLoading(true);
    api.getCompanyGroupCandidates(companyName)
      .then(r => setCandidates(r?.data || []))
      .catch(e => setError(e.message || 'Failed to load candidates'))
      .finally(() => setLoading(false));
  }, [companyName]);

  if (!companyName) return null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', width: 'min(520px, 100%)', height: '100%', overflowY: 'auto', boxShadow: '-8px 0 24px rgba(0,0,0,0.15)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 11, color: '#706E6B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Company</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#181818' }}>{companyName}</div>
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
              <div style={{ fontWeight: 700, fontSize: 14, color: '#181818' }}>{c.name || c.email}</div>
              <div style={{ fontSize: 12, color: '#706E6B', marginTop: 2 }}>{c.email}{c.phone ? ` · ${c.phone}` : ''}</div>
              <div style={{ fontSize: 12, color: '#706E6B', marginTop: 2 }}>
                {c.title && <span>{c.title}</span>}
                {c.experience ? <span> · {c.experience} yr{c.experience === 1 ? '' : 's'} exp</span> : null}
                {c.college && <span> · {c.college}</span>}
                {c.location && <span> · {c.location}</span>}
              </div>
              {(c.currentCTC || c.expectedCTC) && (
                <div style={{ fontSize: 12, color: '#706E6B', marginTop: 2 }}>
                  {c.currentCTC && <span>Current CTC: {c.currentCTC}</span>}
                  {c.currentCTC && c.expectedCTC && <span> · </span>}
                  {c.expectedCTC && <span>Expected CTC: {c.expectedCTC}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminCompanyGroups() {
  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.getCompanyGroups()
      .then(r => setData(r?.data || []))
      .catch(e => setError(e.message || 'Failed to load company groups'))
      .finally(() => setLoading(false));
  }, []);

  const totalGroups = data.length;
  const totalEmployees = data.reduce((sum, g) => sum + g.totalEmployees, 0);

  return (
    <div>
      <PageHeader
        title="🏢 Company Groups"
        subtitle="Every candidate is automatically grouped into a company community based on the Current Company on their profile. Click a row to see the candidates."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={STAT_S}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Company Groups</span>
          <span style={{ fontSize: 32, fontWeight: 800, color: '#181818' }}>{totalGroups}</span>
        </div>
        <div style={STAT_S}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Candidates Grouped</span>
          <span style={{ fontSize: 32, fontWeight: 800, color: '#181818' }}>{totalEmployees}</span>
        </div>
      </div>

      {error && <div style={{ color: '#BA0517', padding: '12px 0' }}>{error}</div>}

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10, justifyContent: 'center' }}><Spinner /> Loading...</div>
        ) : data.length === 0 ? (
          <div style={{ color: '#706E6B', padding: 40, textAlign: 'center', fontSize: 14 }}>No company groups found yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Company</th>
                  <th style={TH}>Candidates</th>
                </tr>
              </thead>
              <tbody>
                {data.map(g => (
                  <tr key={g.name} onClick={() => setSelected(g.name)} style={{ cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                    <td style={TD}><div style={{ fontWeight: 700, color: '#0176D3' }}>{g.name}</div></td>
                    <td style={TD}>{g.totalEmployees}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CandidateDrawer companyName={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
