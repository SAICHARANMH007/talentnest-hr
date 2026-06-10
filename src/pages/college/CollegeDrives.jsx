import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { card, btnP } from '../../constants/styles.js';
import { api } from '../../api/api.js';

function formatSalary(min, max, currency) {
  const symbol = currency === 'USD' ? '$' : '₹';
  if (!min && !max) return null;
  if (min && max) return `${symbol}${Number(min).toLocaleString('en-IN')} – ${symbol}${Number(max).toLocaleString('en-IN')}`;
  return `${symbol}${Number(min || max).toLocaleString('en-IN')}`;
}

function timeAgo(date) {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

function DriveCard({ job, onNotify, status }) {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#181818' }}>{job.title || 'Untitled Role'}</h3>
          <div style={{ fontSize: 13, color: '#706E6B', marginTop: 2 }}>{job.company || 'Company'}</div>
        </div>
        <span style={{ fontSize: 11, color: '#9E9D9B', whiteSpace: 'nowrap' }}>{timeAgo(job.postedAt)}</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 12, color: '#706E6B' }}>
        {job.location && <span>📍 {job.location}</span>}
        {job.jobType && <span>• {job.jobType}</span>}
        {job.experience && <span>• {job.experience}</span>}
        {salary && <span>• {salary}</span>}
      </div>

      {(job.skills || []).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {job.skills.slice(0, 6).map(sk => (
            <span key={sk} style={{
              fontSize: 11, fontWeight: 700, color: '#0176D3', background: 'rgba(1,118,211,0.08)',
              borderRadius: 999, padding: '2px 10px',
            }}>{sk}</span>
          ))}
        </div>
      )}

      <div style={{ marginTop: 4 }}>
        <button
          style={{ ...btnP, opacity: status === 'sending' ? 0.6 : 1 }}
          disabled={status === 'sending'}
          onClick={() => onNotify(job.id)}
        >
          {status === 'sending' ? '⏳ Notifying...' : '📣 Notify My Students'}
        </button>
        {status?.message && <div style={{ color: '#16A34A', fontSize: 12, marginTop: 6 }}>{status.message}</div>}
        {status?.error && <div style={{ color: '#BA0517', fontSize: 12, marginTop: 6 }}>{status.error}</div>}
      </div>
    </div>
  );
}

export default function CollegeDrives() {
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    api.getCollegeDrives()
      .then(r => setJobs(r?.data || r || []))
      .catch(e => setError(e.message || 'Failed to load placement drives'))
      .finally(() => setLoading(false));
  }, []);

  const notify = async (jobId) => {
    setStatuses(prev => ({ ...prev, [jobId]: 'sending' }));
    try {
      const res = await api.notifyCollegeDrive(jobId);
      const message = res?.message || `Notified ${res?.recipients ?? 0} student${res?.recipients === 1 ? '' : 's'}.`;
      setStatuses(prev => ({ ...prev, [jobId]: { message } }));
    } catch (e) {
      setStatuses(prev => ({ ...prev, [jobId]: { error: e.message || 'Failed to notify students' } }));
    }
  };

  return (
    <div>
      <PageHeader
        title="📣 Placement Drives"
        subtitle="Active job openings on TalentNest that may be a good fit for your students. Notify your students about any opening to encourage them to apply."
      />

      {loading && <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10 }}><Spinner /> Loading...</div>}
      {error && <div style={{ color: '#BA0517', padding: 40 }}>{error}</div>}

      {!loading && !error && jobs.length === 0 && (
        <div style={{ ...card, color: '#706E6B', padding: 40, textAlign: 'center', fontSize: 14 }}>
          No active job openings found right now. Check back later.
        </div>
      )}

      {!loading && !error && jobs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {jobs.map(job => (
            <DriveCard key={job.id} job={job} onNotify={notify} status={statuses[job.id]} />
          ))}
        </div>
      )}
    </div>
  );
}
