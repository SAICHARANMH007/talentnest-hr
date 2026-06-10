import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { card, btnP } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const FORMAT_ICON = { video: '🎥', phone: '📞', 'in-person': '🏢', onsite: '🏢' };

function formatDateTime(dt) {
  return new Date(dt).toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

function pad(n) { return String(n).padStart(2, '0'); }

function toICSDate(dt) {
  const d = new Date(dt);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function downloadICS(iv) {
  const start = new Date(iv.scheduledAt);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const summary = `Interview: ${iv.jobTitle}${iv.company ? ` at ${iv.company}` : ''}`;
  const description = [
    iv.interviewerName ? `Interviewer: ${iv.interviewerName}` : '',
    iv.videoLink ? `Join: ${iv.videoLink}` : '',
  ].filter(Boolean).join('\\n');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TalentNest HR//Interview Calendar//EN',
    'BEGIN:VEVENT',
    `UID:${iv.applicationId}-${iv.round}@talentnesthr.com`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description}` : '',
    iv.location ? `LOCATION:${iv.location}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `interview-${iv.applicationId}-round${iv.round}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

function InterviewCard({ iv, isPast }) {
  return (
    <div style={{ ...card, opacity: isPast ? 0.7 : 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#181818' }}>{iv.jobTitle || 'Interview'}</h3>
          <div style={{ fontSize: 13, color: '#706E6B', marginTop: 2 }}>{iv.company || 'Company'} · Round {iv.round}</div>
        </div>
        <span style={{ fontSize: 18 }}>{FORMAT_ICON[iv.format?.toLowerCase()] || '📅'}</span>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: isPast ? '#706E6B' : '#0176D3' }}>
        🗓️ {formatDateTime(iv.scheduledAt)}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 12, color: '#706E6B' }}>
        {iv.interviewerName && <span>👤 {iv.interviewerName}</span>}
        {iv.location && <span>📍 {iv.location}</span>}
        {iv.format && <span>• {iv.format}</span>}
      </div>

      {!isPast && (
        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          {iv.videoLink && (
            <a href={iv.videoLink} target="_blank" rel="noreferrer" style={{ ...btnP, textDecoration: 'none', display: 'inline-block' }}>
              🔗 Join Interview
            </a>
          )}
          <button
            onClick={() => downloadICS(iv)}
            style={{ background: '#F3F2F2', border: '1px solid #DDDBDA', borderRadius: 10, color: '#706E6B', fontWeight: 700, padding: '10px 16px', cursor: 'pointer', fontSize: 13 }}
          >
            📆 Add to Calendar
          </button>
        </div>
      )}
    </div>
  );
}

export default function CandidateInterviews() {
  const [data, setData] = useState({ upcoming: [], past: [] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCandidateUpcomingInterviews()
      .then(r => setData(r?.data || r || { upcoming: [], past: [] }))
      .catch(e => setError(e.message || 'Failed to load interviews'))
      .finally(() => setLoading(false));
  }, []);

  const { upcoming = [], past = [] } = data || {};

  return (
    <div>
      <PageHeader
        title="📅 My Interviews"
        subtitle="All your scheduled interviews in one place — join calls, add reminders to your calendar, and review past rounds."
      />

      {loading && <div style={{ color: '#706E6B', padding: 40, display: 'flex', gap: 10 }}><Spinner /> Loading...</div>}
      {error && <div style={{ color: '#BA0517', padding: 40 }}>{error}</div>}

      {!loading && !error && (
        <>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#181818', margin: '0 0 12px' }}>Upcoming ({upcoming.length})</h3>
          {upcoming.length === 0 ? (
            <div style={{ ...card, color: '#706E6B', padding: 32, textAlign: 'center', fontSize: 14, marginBottom: 24 }}>
              No upcoming interviews scheduled yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
              {upcoming.map(iv => <InterviewCard key={`${iv.applicationId}-${iv.round}`} iv={iv} />)}
            </div>
          )}

          {past.length > 0 && (
            <>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#181818', margin: '0 0 12px' }}>Past ({past.length})</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                {past.map(iv => <InterviewCard key={`${iv.applicationId}-${iv.round}`} iv={iv} isPast />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
