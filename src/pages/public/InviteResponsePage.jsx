import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api/api.js';

const STATUS_CONFIG = {
  interested: { icon: '🎉', color: '#22c55e', title: "You're In!", body: "We've received your interest and you're now in our pipeline. Our team will be in touch with you shortly." },
  declined:   { icon: '👋', color: '#6b7280', title: 'No Problem!',  body: "Thanks for letting us know. We'll keep your profile for future opportunities that might be a better fit." },
  already_interested: { icon: '✅', color: '#0176D3', title: 'Already Registered', body: "You've already expressed interest in this role. Our team will reach out to you soon!" },
  already_declined:   { icon: '👋', color: '#6b7280', title: 'Already Responded',  body: "You've already declined this invitation. We appreciate your honesty!" },
};

export default function InviteResponsePage() {
  const { token }          = useParams();
  const [searchParams]     = useSearchParams();
  const urlResponse        = searchParams.get('response'); // 'interested' | 'declined' from email link

  const [invite, setInvite]       = useState(null);
  const [job, setJob]             = useState(null);
  const [loading, setLoading]     = useState(true);
  const [responding, setResponding] = useState(false);
  const [done, setDone]           = useState(null); // status after responding
  const [error, setError]         = useState('');

  useEffect(() => {
    api.getInviteByToken(token)
      .then(({ invite: inv, job: j }) => { setInvite(inv); setJob(j); })
      .catch(() => setError('This invitation link is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  // Auto-respond if URL has ?response=... (from email button click)
  useEffect(() => {
    if (urlResponse && invite && !done) {
      if (['interested', 'declined'].includes(invite.status)) {
        setDone(`already_${invite.status}`);
      } else {
        handleRespond(urlResponse);
      }
    }
  }, [urlResponse, invite]);

  const handleRespond = async (response) => {
    setResponding(true);
    try {
      const res = await api.respondToInvite(token, response);
      if (res.already) setDone(`already_${res.status}`);
      else             setDone(response);
    } catch (e) {
      setError(e.message);
    } finally { setResponding(false); }
  };

  // Check if already responded
  useEffect(() => {
    if (invite && ['interested', 'declined'].includes(invite.status) && !urlResponse)
      setDone(`already_${invite.status}`);
  }, [invite]);

  const skills = Array.isArray(job?.skills) ? job.skills : (job?.skills || '').split(',').map(s => s.trim()).filter(Boolean);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#032D60 0%,#0d2150 40%,#0176D3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🪺</div>
        <p style={{ fontSize: 16, opacity: 0.8 }}>Loading your invitation…</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#032D60,#0176D3)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 48, textAlign: 'center', maxWidth: 440 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <h2 style={{ color: '#032D60', margin: '0 0 12px', fontWeight: 800 }}>Link Expired</h2>
        <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.65, margin: '0 0 24px' }}>{error}</p>
        <Link to="/careers" style={{ background: '#0176D3', color: '#fff', textDecoration: 'none', padding: '12px 28px', borderRadius: 50, fontSize: 14, fontWeight: 700 }}>
          Browse Open Jobs →
        </Link>
      </div>
    </div>
  );

  // Show confirmation screen
  if (done) {
    const cfg = STATUS_CONFIG[done] || STATUS_CONFIG.interested;
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#032D60 0%,#0d2150 40%,#0176D3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '48px 44px', textAlign: 'center', maxWidth: 460, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: `${cfg.color}15`, border: `3px solid ${cfg.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>
            {cfg.icon}
          </div>
          <h2 style={{ color: '#032D60', margin: '0 0 12px', fontWeight: 800, fontSize: 24 }}>{cfg.title}</h2>
          <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px' }}>{cfg.body}</p>

          {done === 'interested' && job && (
            <div style={{ background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 18px', margin: '0 0 24px', textAlign: 'left' }}>
              <div style={{ color: '#1d4ed8', fontWeight: 700, fontSize: 14 }}>{job.title}</div>
              <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>{job.company}{job.location ? ` · ${job.location}` : ''}</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {done === 'interested' && job && (
              <Link
                to="/login"
                onClick={() => {
                  const jid = String(invite?.jobId?._id || invite?.jobId || '');
                  if (jid) sessionStorage.setItem('tn_pending_apply_job', jid);
                }}
                style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', textDecoration: 'none', padding: '11px 26px', borderRadius: 50, fontSize: 13, fontWeight: 700, boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}>
                🚀 Login & Apply →
              </Link>
            )}
            <Link
              to="/login"
              onClick={() => { if (invite?.jobId) sessionStorage.setItem('tn_pending_assessment_job', String(invite.jobId?._id || invite.jobId)); }}
              style={{ background: '#0176D3', color: '#fff', textDecoration: 'none', padding: '11px 26px', borderRadius: 50, fontSize: 13, fontWeight: 700 }}>
              {done === 'interested' ? '🎯 Take Assessment →' : 'Login to Portal →'}
            </Link>
            <Link to="/careers" style={{ background: '#f1f5f9', color: '#374151', textDecoration: 'none', padding: '11px 26px', borderRadius: 50, fontSize: 13, fontWeight: 600 }}>
              Browse Jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Main invite view
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#032D60 0%,#0d2150 50%,#0176D3 100%)', padding: '40px 16px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🪺</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>TalentNest HR</div>
          </Link>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4, letterSpacing: '1.5px' }}>EXCLUSIVE JOB INVITATION</div>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

          {/* Greeting */}
          <div style={{ padding: '32px 40px 24px' }}>
            <h2 style={{ color: '#032D60', fontSize: 22, fontWeight: 800, margin: '0 0 12px' }}>
              Hi {invite?.candidateName || 'there'} 👋
            </h2>
            <p style={{ color: '#374151', fontSize: 14, lineHeight: 1.75, margin: 0 }}>
              You've been personally selected for an exciting opportunity. Take a look below and let us know if you're interested!
            </p>
            {invite?.message && (
              <div style={{ background: '#f0f7ff', borderLeft: '4px solid #0176D3', borderRadius: 6, padding: '14px 18px', marginTop: 16 }}>
                <p style={{ color: '#1e40af', fontSize: 13, lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>"{invite.message}"</p>
              </div>
            )}
          </div>

          {/* Job Details */}
          {job && (
            <div style={{ margin: '0 40px 28px', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg,#0176D3,#0154A4)', padding: '22px 26px' }}>
                <div style={{ color: '#fff', fontSize: 21, fontWeight: 800, marginBottom: 5 }}>{job.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{job.company || 'Our Client'}</div>
              </div>
              <div style={{ padding: '20px 26px' }}>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
                  {job.location   && <span style={{ color: '#374151', fontSize: 13 }}>📍 {job.location}</span>}
                  {job.salary     && <span style={{ color: '#374151', fontSize: 13 }}>💰 {job.salary}</span>}
                  {job.type       && <span style={{ color: '#374151', fontSize: 13 }}>⏱ {job.type}</span>}
                  {job.experience && <span style={{ color: '#374151', fontSize: 13 }}>🎓 {job.experience} yrs exp</span>}
                </div>
                {job.description && (
                  <p style={{ color: '#374151', fontSize: 13, lineHeight: 1.7, margin: '0 0 16px' }}>
                    {job.description.slice(0, 500)}{job.description.length > 500 ? '…' : ''}
                  </p>
                )}
                {skills.length > 0 && (
                  <div>
                    <div style={{ color: '#6b7280', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', marginBottom: 8 }}>SKILLS</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {skills.map(s => (
                        <span key={s} style={{ background: '#dbeafe', color: '#1d4ed8', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CTA */}
          <div style={{ padding: '0 40px 40px', textAlign: 'center' }}>
            <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 20px' }}>What would you like to do?</p>

            {/* Primary action row */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
              {/* Interested — marks invite + redirects to apply */}
              <button
                onClick={() => handleRespond('interested')}
                disabled={responding}
                style={{ background: 'linear-gradient(135deg,#0176D3,#0154A4)', color: '#fff', border: 'none', borderRadius: 50, padding: '14px 32px', fontSize: 15, fontWeight: 700, cursor: responding ? 'wait' : 'pointer', boxShadow: '0 4px 18px rgba(1,118,211,0.4)', transition: 'all 0.2s', opacity: responding ? 0.7 : 1 }}>
                {responding ? '⏳ Processing…' : '🙋 I\'m Interested'}
              </button>

              {/* Apply Now — mark interested then send to login → apply flow */}
              {job && (
                <button
                  onClick={async () => {
                    // Mark as interested first, then redirect to login with apply intent
                    if (!responding) {
                      await handleRespond('interested');
                      // handleRespond sets `done`, useEffect will redirect; but also store apply intent
                      if (invite?.jobId) {
                        sessionStorage.setItem('tn_pending_apply_job', String(invite.jobId?._id || invite.jobId));
                      }
                    }
                  }}
                  disabled={responding}
                  style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', borderRadius: 50, padding: '14px 32px', fontSize: 15, fontWeight: 700, cursor: responding ? 'wait' : 'pointer', boxShadow: '0 4px 18px rgba(16,185,129,0.35)', transition: 'all 0.2s', opacity: responding ? 0.7 : 1 }}>
                  🚀 Apply Now
                </button>
              )}
            </div>

            {/* Secondary: View full job listing */}
            {job && (
              <div style={{ marginBottom: 16 }}>
                <Link
                  to={`/careers?job=${job._id || job.id}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#0176D3', fontSize: 13, fontWeight: 600, textDecoration: 'none', padding: '8px 20px', borderRadius: 50, border: '1.5px solid #bfdbfe', background: '#eff6ff' }}>
                  👁 View Full Job Description →
                </Link>
              </div>
            )}

            <button
              onClick={() => handleRespond('declined')}
              disabled={responding}
              style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 12, cursor: responding ? 'wait' : 'pointer', textDecoration: 'underline' }}>
              Not looking right now
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
            TalentNest HR · <a href="mailto:hr@talentnesthr.com" style={{ color: 'rgba(255,255,255,0.6)' }}>hr@talentnesthr.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
