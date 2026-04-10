import { useState, useEffect } from 'react';
import Modal from '../ui/Modal.jsx';
import Spinner from '../ui/Spinner.jsx';
import { btnP, btnG } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const TABS = ['Compose', 'Preview'];

const TEMPLATES = {
  warm: {
    label: '🤝 Warm',
    text: `Your profile stood out to us — your background is exactly the kind of talent we're looking for at [company].

We have an exciting opening for a [title] that we believe is a strong match for your experience and career goals.

This is a personally curated invite — we'd love to start a conversation. Just click the button below and our team will reach out within 24 hours.

No commitment, no pressure — just an opportunity worth exploring.

Warm regards,
[sender]`,
  },
  formal: {
    label: '🎩 Formal',
    text: `We are pleased to extend a personal invitation to you for the position of [title] at [company].

After reviewing your profile, we believe your skills and experience align strongly with our requirements. We would welcome the opportunity to discuss this role with you in detail.

Please indicate your interest using the button below and a member of our team will be in touch promptly.

Regards,
[sender]`,
  },
  urgent: {
    label: '⚡ Urgent',
    text: `We are actively hiring for [title] at [company] and your profile is a top match.

This is a priority role with limited openings — we are interviewing candidates this week. I wanted to personally reach out before we close applications.

Click below to confirm your interest and we'll fast-track your profile immediately.

[sender]`,
  },
};

// Replace [placeholder] tokens with actual values for preview
function buildPreview(template, vars) {
  return template
    .replace(/\[name\]/g,    vars.name    || 'Candidate')
    .replace(/\[title\]/g,   vars.title   || 'Open Role')
    .replace(/\[company\]/g, vars.company || 'Our Client')
    .replace(/\[sender\]/g,  vars.sender  || 'TalentNest HR');
}

// Backend accepts [name] tokens and substitutes server-side
const TOKENS = ['[name]', '[title]', '[company]', '[sender]'];

export default function InviteModal({ candidates, onClose, onSent }) {
  const [tab, setTab]         = useState('Compose');
  const [jobs, setJobs]       = useState([]);
  const [selJob, setSelJob]   = useState('');
  const [activeTpl, setActiveTpl] = useState('warm');
  const [message, setMessage] = useState(TEMPLATES.warm.text);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState('');

  // Split candidates by whether they have an email
  const withEmail    = candidates.filter(c => c.email && c.email.trim());
  const withoutEmail = candidates.filter(c => !c.email || !c.email.trim());

  useEffect(() => {
    api.getJobs()
      .then(j => {
        const jobList = Array.isArray(j) ? j : (Array.isArray(j?.data) ? j.data : []);
        const open = jobList.filter(x => x.status !== 'Closed' && x.status !== 'Draft');
        setJobs(open);
        if (open.length === 1) setSelJob(open[0].id || open[0]._id);
      })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  const selectedJob = jobs.find(j => j.id === selJob);

  const previewVars = {
    name:    withEmail.length === 1 ? withEmail[0].name : 'Candidate',
    title:   selectedJob?.title   || '[title]',
    company: selectedJob?.company || '[company]',
    sender:  'Your Name',
  };

  const handleSend = async () => {
    if (!selJob) { setError('Please select a job.'); return; }
    if (withEmail.length === 0) { setError('None of the selected candidates have an email address.'); return; }
    setSending(true); setError('');
    try {
      const ids = withEmail.map(c => c.id);
      await api.sendInvites(ids, selJob, message);
      onSent?.(ids.length, selectedJob?.title);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally { setSending(false); }
  };

  const footerButtons = (
    <>
      <button
        onClick={handleSend}
        disabled={sending || !selJob || withEmail.length === 0}
        style={{ ...btnP, opacity: (sending || !selJob || withEmail.length === 0) ? 0.6 : 1 }}
      >
        {sending ? '⏳ Sending…' : `📧 Send ${withEmail.length} Invite${withEmail.length !== 1 ? 's' : ''}`}
      </button>
      <button onClick={onClose} style={btnG}>Cancel</button>
    </>
  );

  return (
    <Modal title={`📧 Invite ${candidates.length} Candidate${candidates.length !== 1 ? 's' : ''} to Apply`} onClose={onClose} wide footer={footerButtons}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 640 }}>

        {/* Candidate pills — with email */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 6, letterSpacing: '0.5px' }}>
            INVITING ({withEmail.length} with email)
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {withEmail.slice(0, 8).map(c => (
              <span key={c.id} style={{ background: 'rgba(1,118,211,0.10)', border: '1px solid rgba(1,118,211,0.22)', color: '#0176D3', borderRadius: 20, padding: '3px 11px', fontSize: 12, fontWeight: 600 }}>
                {c.name}
              </span>
            ))}
            {withEmail.length > 8 && (
              <span style={{ background: '#f1f5f9', color: '#6b7280', borderRadius: 20, padding: '3px 11px', fontSize: 12 }}>
                +{withEmail.length - 8} more
              </span>
            )}
          </div>
        </div>

        {/* Warning — candidates with no email */}
        {withoutEmail.length > 0 && (
          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ color: '#92400e', fontWeight: 700, fontSize: 12, marginBottom: 6 }}>
              ⚠️ {withoutEmail.length} candidate{withoutEmail.length !== 1 ? 's' : ''} missing email — will be skipped
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {withoutEmail.map(c => (
                <span key={c.id} style={{ background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', borderRadius: 20, padding: '2px 9px', fontSize: 11 }}>
                  {c.name}
                </span>
              ))}
            </div>
            <div style={{ color: '#b45309', fontSize: 11, marginTop: 6 }}>
              Invite will still be sent to the {withEmail.length} candidate{withEmail.length !== 1 ? 's' : ''} with valid emails.
            </div>
          </div>
        )}

        {/* Job selector */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 6, letterSpacing: '0.5px' }}>SELECT JOB *</div>
          {loading ? <Spinner /> : (
            <select
              value={selJob} onChange={e => setSelJob(e.target.value)}
              style={{ width: '100%', padding: '9px 14px', borderRadius: 10, border: `1.5px solid ${selJob ? '#0176D3' : '#e2e8f0'}`, background: '#f8fafc', color: '#181818', fontSize: 13, outline: 'none', cursor: 'pointer' }}
            >
              <option value="">— Choose a job —</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.title}{j.company ? ` · ${j.company}` : ''}{j.location ? ` · ${j.location}` : ''}</option>
              ))}
            </select>
          )}
          {jobs.length === 0 && !loading && (
            <p style={{ color: '#f59e0b', fontSize: 12, margin: '4px 0 0' }}>No open jobs. Create a job first.</p>
          )}
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: '2px solid #f1f5f9', display: 'flex', gap: 0 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: 'none', border: 'none', padding: '8px 18px', fontSize: 13,
              fontWeight: tab === t ? 700 : 500,
              color: tab === t ? '#0176D3' : '#6b7280', cursor: 'pointer',
              borderBottom: tab === t ? '2px solid #0176D3' : '2px solid transparent', marginBottom: -2,
            }}>{t}</button>
          ))}
        </div>

        {/* Compose */}
        {tab === 'Compose' && (
          <div>
            {/* Template picker */}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 6, letterSpacing: '0.5px' }}>TEMPLATE STYLE</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {Object.entries(TEMPLATES).map(([key, t]) => (
                <button key={key} onClick={() => { setActiveTpl(key); setMessage(TEMPLATES[key].text); }}
                  style={{ padding: '5px 13px', borderRadius: 20, border: `1.5px solid ${activeTpl === key ? '#0176D3' : '#e2e8f0'}`, background: activeTpl === key ? '#0176D3' : '#fff', color: activeTpl === key ? '#fff' : '#374151', fontSize: 12, fontWeight: activeTpl === key ? 700 : 500, cursor: 'pointer' }}>
                  {t.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 4, letterSpacing: '0.5px' }}>
              MESSAGE
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>
                · tokens: {TOKENS.join(', ')}
              </span>
            </div>
            <textarea
              rows={8} value={message} onChange={e => setMessage(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#181818', fontSize: 13, lineHeight: 1.65, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {TOKENS.map(v => (
                <button key={v} onClick={() => setMessage(m => m + v)}
                  style={{ background: '#f0f7ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: 6, padding: '3px 9px', fontSize: 11, cursor: 'pointer', fontFamily: 'monospace' }}>
                  + {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        {tab === 'Preview' && (
          <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg,#032D60,#0176D3)', padding: '16px 20px', textAlign: 'center' }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>🪺 TalentNest HR</div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, letterSpacing: '1px', marginTop: 3 }}>EXCLUSIVE OPPORTUNITY INVITE</div>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <p style={{ color: '#032D60', fontWeight: 700, fontSize: 15, margin: '0 0 10px' }}>
                Hi {previewVars.name} 👋
              </p>
              <div style={{ whiteSpace: 'pre-wrap', color: '#374151', fontSize: 13, lineHeight: 1.7 }}>
                {buildPreview(message, previewVars)}
              </div>
              {selectedJob && (
                <div style={{ margin: '16px 0', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ background: '#0176D3', padding: '12px 16px' }}>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{selectedJob.title}</div>
                    <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>{selectedJob.company}</div>
                  </div>
                  <div style={{ padding: '12px 16px', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    {selectedJob.location && <span style={{ color: '#374151', fontSize: 12 }}>📍 {selectedJob.location}</span>}
                    {selectedJob.salary   && <span style={{ color: '#374151', fontSize: 12 }}>💰 {selectedJob.salary}</span>}
                  </div>
                </div>
              )}
              <div style={{ textAlign: 'center', margin: '16px 0 8px' }}>
                <div style={{ display: 'inline-block', background: 'linear-gradient(135deg,#0176D3,#0154A4)', color: '#fff', padding: '12px 32px', borderRadius: 50, fontSize: 13, fontWeight: 700 }}>
                  ✅ Yes, I'm Interested!
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ color: '#9ca3af', fontSize: 11 }}>Not looking right now →</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <p style={{ color: '#BA0517', fontSize: 12, margin: 0, background: '#fff5f5', padding: '8px 12px', borderRadius: 8, border: '1px solid #fecaca' }}>
            ⚠️ {error}
          </p>
        )}

        {selJob && withEmail.length > 0 && (
          <div style={{ background: 'rgba(1,118,211,0.06)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#0176D3', fontWeight: 600 }}>
            📧 {withEmail.length} invite{withEmail.length !== 1 ? 's' : ''} will be sent for <strong>{selectedJob?.title}</strong>
            {' · '}Interested candidates auto-enter the pipeline
          </div>
        )}

      </div>
    </Modal>
  );
}
