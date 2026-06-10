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

export default function SuperAdminCollegeGroups() {
  const [data, setData] = useState([]);
  const [incomplete, setIncomplete] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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
        subtitle="Every candidate is automatically grouped into a college community based on the College/School Name (or education history) on their profile."
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
                  <tr key={g.name}>
                    <td style={TD}><div style={{ fontWeight: 700 }}>{g.name}</div></td>
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
    </div>
  );
}
