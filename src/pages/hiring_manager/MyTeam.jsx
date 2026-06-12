import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { card, btnG } from '../../constants/styles.js';

const APPROVAL_LABEL = { pending_approval: 'Pending Approval', approved: 'Approved', rejected: 'Needs Revision' };
const APPROVAL_COLOR = { pending_approval: '#F59E0B', approved: '#34d399', rejected: '#BA0517' };
const STATUS_COLOR   = { active: '#34d399', draft: '#9E9D9B', closed: '#706E6B', paused: '#F59E0B' };

const PIPELINE_STAGES = ['Applied', 'Screening', 'Shortlisted', 'Interview Round 1', 'Interview Round 2', 'Technical Interview', 'Offer', 'Hired', 'Rejected'];

export default function MyTeam({ user }) {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getMyTeamJobs()
      .then(r => setJobs(Array.isArray(r) ? r : (r?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="🧑‍💼 My Team" subtitle="Jobs you oversee, the recruiters working them, and pipeline progress" />

      {error && (
        <div style={{ ...card, color: '#BA0517', marginBottom: 16 }}>❌ {error}</div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spinner /></div>
      ) : jobs.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '60px 24px', color: '#706E6B' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧑‍💼</div>
          <div style={{ fontWeight: 600 }}>No jobs assigned to you yet</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>
            When an admin or recruiter posts a job and adds you as a Hiring Manager, it'll show up here —
            along with the recruiters working it and live pipeline progress.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {jobs.map(j => {
            const id = j.id || j._id;
            const recruiters = Array.isArray(j.assignedRecruiters) ? j.assignedRecruiters : [];
            const stats = j.pipelineStats || {};
            const totalCandidates = Object.values(stats).reduce((s, n) => s + n, 0);
            return (
              <div key={id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#181818' }}>{j.title}</div>
                    <div style={{ fontSize: 12, color: '#706E6B', marginTop: 2 }}>
                      {j.company || j.companyName || ''}{j.department ? ` · ${j.department}` : ''}{j.location ? ` · ${j.location}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Badge label={(j.status || 'draft').toUpperCase()} color={STATUS_COLOR[j.status] || '#706E6B'} />
                    {j.approvalStatus && <Badge label={APPROVAL_LABEL[j.approvalStatus] || j.approvalStatus} color={APPROVAL_COLOR[j.approvalStatus] || '#706E6B'} />}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 24, marginTop: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', marginBottom: 6 }}>Recruiters</div>
                    {recruiters.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#9E9D9B' }}>No recruiter assigned yet — admin will assign one shortly</div>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {recruiters.map(r => <Badge key={r.id || r._id} label={`👤 ${r.name}`} color="#0176D3" />)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', marginBottom: 6 }}>Openings</div>
                    <div style={{ fontSize: 13, color: '#181818' }}>{j.openings || 1}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', marginBottom: 6 }}>Candidates in Pipeline</div>
                    <div style={{ fontSize: 13, color: '#181818' }}>{totalCandidates}</div>
                  </div>
                </div>

                {totalCandidates > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {PIPELINE_STAGES.filter(s => stats[s] > 0).map(s => (
                      <Badge key={s} label={`${s}: ${stats[s]}`} color="#64748b" />
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F3F2F2' }}>
                  <button onClick={() => navigate('/app/pipeline')} style={{ ...btnG, fontSize: 12 }}>View Pipeline →</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
