import { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import { btnP, btnG } from '../../constants/styles.js';
import { api } from '../../api/api.js';
import { API_BASE_URL } from '../../api/config.js';

function getBackendBase() {
  return (API_BASE_URL || '').replace(/\/api$/, '');
}

function getCareersBaseUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/careers`;
  }
  return 'https://www.talentnesthr.com/careers';
}

function buildPost(job, platform) {
  const baseUrl = getCareersBaseUrl();
  const url   = `${baseUrl}?job=${job.id}`;
  const title = job.title || 'Open Role';
  const co    = job.company  ? `@ ${job.company}` : '';
  const loc   = job.location ? `📍 ${job.location}` : '';
  const sal   = job.salary   ? `💰 ${job.salary}`   : '';
  const skills= (Array.isArray(job.skills) ? job.skills : (job.skills || '').split(',').map(s => s.trim()).filter(Boolean)).map(s => `#${s.replace(/\s+/g,'')}`).slice(0, 5).join(' ');

  switch (platform) {
    case 'linkedin':
      return `🚀 We're Hiring: ${title} ${co}\n\n${loc}  ${sal}\n\n${job.description ? job.description.slice(0, 500) + (job.description.length > 500 ? '…' : '') : ''}\n\n🔑 Skills: ${(Array.isArray(job.skills) ? job.skills : (job.skills || '').split(',').map(s=>s.trim()).filter(Boolean)).slice(0,6).join(', ')}\n\n👉 Apply now: ${url}\n\n#Hiring #Jobs #TalentNestHR ${skills}`;
    case 'twitter':
      return `🚀 We're Hiring! ${title} ${co}\n${loc} ${sal}\n\n👉 Apply: ${url}\n\n${skills} #Hiring #Jobs`;
    case 'facebook':
      return `📢 Job Opening: ${title} ${co}\n\n${loc}  ${sal}\n\n${job.description ? job.description.slice(0, 400) + (job.description.length > 400 ? '…' : '') : ''}\n\n✅ Apply here: ${url}\n\n${skills}`;
    case 'instagram':
      return `🔥 We're Hiring!\n\n🎯 Role: ${title}\n🏢 ${job.company || 'TalentNest Client'}\n${loc}\n${sal}\n\n${(Array.isArray(job.skills) ? job.skills : (job.skills || '').split(',').map(s=>s.trim()).filter(Boolean)).slice(0,6).map(s=>`✅ ${s}`).join('\n')}\n\n🔗 Link in bio — Apply now!\n.\n.\n${skills} #Hiring #JobAlert #Careers #TalentNestHR #Jobs`;
    default: return '';
  }
}

function buildJobEmailHtml(job, candidateName, senderName, interestedUrl) {
  const url    = `${getCareersBaseUrl()}?job=${job.id}`;
  const skills = Array.isArray(job.skills) ? job.skills : (job.skills || '').split(',').map(s => s.trim()).filter(Boolean);
  const greeting = candidateName ? `<p style="color:#374151;font-size:15px;margin:0 0 20px">Hi <strong>${candidateName}</strong>,</p>` : '';
  const sentByLine = senderName ? `<p style="color:#6b7280;font-size:12px;margin:4px 0 0">Sent by <strong>${senderName}</strong> via TalentNest HR</p>` : '';
  const interestedBtn = interestedUrl ? `
      <div style="text-align:center;margin-top:14px">
        <a href="${interestedUrl}"
           style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:12px 36px;border-radius:10px;letter-spacing:0.5px">
          ✅ I'm Interested
        </a>
        <p style="color:#9ca3af;font-size:11px;margin-top:8px">Click to let the recruiter know you're interested</p>
      </div>` : '';
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#032D60 0%,#0176D3 100%);padding:32px 36px;text-align:center">
      <div style="color:#fff;font-size:13px;letter-spacing:2px;opacity:0.8;margin-bottom:8px">TALENT NEST HR</div>
      <h1 style="color:#fff;margin:0;font-size:26px;font-weight:800">🚀 We're Hiring!</h1>
      <div style="color:rgba(255,255,255,0.85);font-size:16px;margin-top:8px">${job.title || 'Open Role'}${job.company ? ` · ${job.company}` : ''}</div>
    </div>

    <!-- Job Details -->
    <div style="padding:32px 36px">
      ${greeting}
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:24px">
        ${job.location ? `<span style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:20px;padding:5px 14px;font-size:13px;font-weight:600">📍 ${job.location}</span>` : ''}
        ${job.jobType  ? `<span style="background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;border-radius:20px;padding:5px 14px;font-size:13px;font-weight:600">💼 ${job.jobType}</span>`  : ''}
        ${job.salary   ? `<span style="background:#fefce8;color:#854d0e;border:1px solid #fde68a;border-radius:20px;padding:5px 14px;font-size:13px;font-weight:600">💰 ${job.salary}</span>`   : ''}
      </div>

      ${job.description ? `
      <div style="color:#374151;font-size:14px;line-height:1.75;margin-bottom:24px;border-left:3px solid #0176D3;padding-left:16px">
        ${job.description.slice(0, 600)}${job.description.length > 600 ? '…' : ''}
      </div>` : ''}

      ${skills.length > 0 ? `
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;color:#6b7280;letter-spacing:1px;margin-bottom:10px">SKILLS REQUIRED</div>
        <div>${skills.map(s => `<span style="display:inline-block;background:#f1f5f9;color:#374151;border:1px solid #e2e8f0;border-radius:6px;padding:4px 12px;font-size:12px;font-weight:600;margin:3px">${s}</span>`).join('')}</div>
      </div>` : ''}

      <!-- CTA Buttons -->
      <div style="text-align:center;margin:32px 0 0">
        <a href="${url}" target="_blank"
           style="display:inline-block;background:#0176D3;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 40px;border-radius:10px;letter-spacing:0.5px">
          👉 View Job &amp; Apply Now
        </a>
      </div>
      ${interestedBtn}

      <p style="color:#6b7280;font-size:12px;text-align:center;margin-top:16px">
        Or copy this link: <a href="${url}" style="color:#0176D3">${url}</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:20px 36px;text-align:center">
      <div style="color:#9ca3af;font-size:11px">TalentNest HR &nbsp;·&nbsp; hr@talentnesthr.com &nbsp;·&nbsp; +91 79955 35539</div>
      ${sentByLine}
    </div>
  </div>
</body>
</html>`;
}

const PLATFORMS = [
  { id: 'email',     label: 'Email',     color: '#0176D3', icon: '📧', help: 'Send this job directly to email addresses using our branded template.' },
  { id: 'linkedin',  label: 'LinkedIn',  color: '#0A66C2', icon: '💼', help: 'Best for professional reach — posts to your company page or profile.',
    shareUrl: (job) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${getCareersBaseUrl()}?job=${job.id}`)}` },
  { id: 'twitter',   label: 'X / Twitter', color: '#000000', icon: '𝕏', help: 'Fast reach — tweet with pre-filled text and link.',
    shareUrl: (_job, text) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text.slice(0, 280))}` },
  { id: 'facebook',  label: 'Facebook',  color: '#1877F2', icon: '📘', help: 'Share to your company page or personal feed.',
    shareUrl: (job) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${getCareersBaseUrl()}?job=${job.id}`)}` },
  { id: 'instagram', label: 'Instagram', color: '#E1306C', icon: '📸', help: 'Copy caption → paste in Instagram app. Add the job link to your bio.', shareUrl: null },
];

export default function ShareJobModal({ job, onClose, user }) {
  const [activePlatform, setActivePlatform] = useState('email');
  const [copied,   setCopied]   = useState(false);
  const [imgCopied, setImgCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Email tab state
  const [toInput,       setToInput]       = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [sending,   setSending]   = useState(false);
  const [sendToast, setSendToast] = useState('');
  const [sentList,  setSentList]  = useState([]);

  const platform = PLATFORMS.find(p => p.id === activePlatform);
  const postText = activePlatform !== 'email' ? buildPost(job, activePlatform) : '';
  const shareUrl = platform?.shareUrl?.(job, postText);
  const jobUrl   = `${getCareersBaseUrl()}?job=${job.id}`;
  const senderName = user?.name || user?.email || '';

  const copy = async (text, setCopiedFn) => {
    try { await navigator.clipboard.writeText(text); setCopiedFn(true); setTimeout(() => setCopiedFn(false), 2000); } catch {}
  };

  const parseEmails = (raw) =>
    raw.split(/[,;\s]+/).map(e => e.trim()).filter(e => e.includes('@'));

  const handleSendEmail = async () => {
    const emails = parseEmails(toInput);
    if (!emails.length) { setSendToast('❌ Enter at least one valid email address'); return; }
    setSending(true); setSendToast('');
    const subject = `🚀 Job Opening: ${job.title}${job.company ? ` @ ${job.company}` : ''} — TalentNest HR`;
    let ok = 0, fail = 0;
    for (const email of emails) {
      try {
        // Log to outreach first — get token for "I'm Interested" tracking link
        let interestedUrl = '';
        try {
          const logRes = await api.logJobShare({
            jobId:          job.id || job._id,
            jobTitle:       job.title,
            recipientEmail: email,
            candidateName:  candidateName.trim() || email,
            sentByName:     senderName,
          });
          const token = logRes?.data?.token || logRes?.token;
          if (token) interestedUrl = `${getBackendBase()}/api/invites/${token}/interested`;
        } catch {}
        const html = buildJobEmailHtml(job, candidateName.trim(), senderName, interestedUrl);
        await api.sendEmail(email, subject, html);
        ok++;
        setSentList(p => [...p, email]);
      } catch { fail++; }
    }
    setSendToast(fail === 0
      ? `✅ Job sent to ${ok} email${ok > 1 ? 's' : ''}!`
      : `⚠️ Sent ${ok}, failed ${fail}`);
    if (fail === 0) { setToInput(''); setCandidateName(''); }
    setSending(false);
  };

  const logSocialShare = async (pId) => {
    const p = PLATFORMS.find(x => x.id === pId);
    if (!p) return;
    try {
      await api.logJobShare({
        jobId:    job.id || job._id,
        jobTitle: job.title,
        platform: p.label,
        type:     'job_share'
      });
    } catch {}
  };

  const handleSocialShare = async (pId) => {
    const p = PLATFORMS.find(x => x.id === pId);
    if (!p) return;
    await logSocialShare(pId);
    const text = buildPost(job, pId);
    const url  = p.shareUrl?.(job, text);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const shareFooter = activePlatform === 'email' ? (
    <>
      <button onClick={handleSendEmail} disabled={sending || !toInput.trim()}
        style={{ ...btnP, opacity: (sending || !toInput.trim()) ? 0.6 : 1 }}>
        {sending ? '⏳ Sending…' : `📧 Send to ${parseEmails(toInput).length || 0} Email${parseEmails(toInput).length !== 1 ? 's' : ''}`}
      </button>
      <button onClick={() => copy(jobUrl, setLinkCopied)}
        style={{ ...btnG, background: linkCopied ? '#f0fdf4' : undefined, borderColor: linkCopied ? '#86efac' : undefined, color: linkCopied ? '#22c55e' : undefined }}>
        {linkCopied ? '✓ Link Copied!' : '📋 Copy Job Link'}
      </button>
      <button onClick={onClose} style={btnG}>Close</button>
    </>
  ) : (
    <>
      {platform?.shareUrl ? (
        <button onClick={() => handleSocialShare(activePlatform)}
          style={{ ...btnP, textDecoration: 'none', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 7, background: platform?.color, boxShadow: 'none' }}>
          {platform?.icon} Post on {platform?.label} →
        </button>
      ) : (
        <div style={{ ...btnP, background: platform?.color, cursor: 'default', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          {platform?.icon} Copy caption above → paste in {platform?.label}
        </div>
      )}
      <button onClick={onClose} style={btnG}>Close</button>
    </>
  );

  return (
    <Modal title={`📣 Share Job: ${job.title}`} onClose={onClose} wide footer={shareFooter}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0, maxWidth: 660 }}>

        {/* Platform tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PLATFORMS.map(p => (
            <button key={p.id} onClick={() => { setActivePlatform(p.id); setCopied(false); setSendToast(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 20,
                border: `1.5px solid ${activePlatform === p.id ? p.color : '#e2e8f0'}`,
                background: activePlatform === p.id ? p.color : '#fff',
                color: activePlatform === p.id ? '#fff' : '#374151',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s',
              }}>
              <span style={{ fontSize: 15 }}>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        {/* Help text */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#6b7280', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span>ℹ️</span><span>{platform?.help}</span>
        </div>

        {/* ── EMAIL TAB ── */}
        {activePlatform === 'email' && (
          <>
            {/* Sender info */}
            {senderName && (
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#0369a1', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span>👤</span><span>Sending as <strong>{senderName}</strong> — your name will appear in the email footer</span>
              </div>
            )}

            {/* Candidate name */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5, letterSpacing: '0.5px' }}>
                CANDIDATE NAME <span style={{ fontWeight: 400 }}>— personalises the email greeting (optional)</span>
              </div>
              <input
                value={candidateName}
                onChange={e => setCandidateName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#181818', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* To field */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5, letterSpacing: '0.5px' }}>
                TO <span style={{ fontWeight: 400 }}>— email addresses (comma or space separated)</span>
              </div>
              <textarea
                value={toInput}
                onChange={e => setToInput(e.target.value)}
                placeholder="john@example.com, jane@company.com, ..."
                rows={2}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#181818', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              {toInput.trim() && (
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>
                  {parseEmails(toInput).length} valid email{parseEmails(toInput).length !== 1 ? 's' : ''} detected
                </div>
              )}
            </div>

            {/* Email preview */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5, letterSpacing: '0.5px' }}>EMAIL PREVIEW</div>
              <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                {/* Mock email header */}
                <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '8px 14px', fontSize: 11, color: '#6b7280' }}>
                  <div><strong>Subject:</strong> 🚀 Job Opening: {job.title}{job.company ? ` @ ${job.company}` : ''} — TalentNest HR</div>
                  <div><strong>From:</strong> {senderName ? `${senderName} via ` : ''}TalentNest HR &lt;hr@talentnesthr.com&gt;</div>
                  {candidateName && <div><strong>To:</strong> Hi {candidateName},</div>}
                </div>
                {/* Mini preview */}
                <div style={{ padding: '14px 16px', background: '#fff' }}>
                  <div style={{ background: 'linear-gradient(135deg,#032D60,#0176D3)', borderRadius: 8, padding: '14px 18px', textAlign: 'center', marginBottom: 12 }}>
                    <div style={{ color: '#fff', fontSize: 11, opacity: 0.8, letterSpacing: 1 }}>TALENT NEST HR</div>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: 16, marginTop: 4 }}>🚀 We're Hiring!</div>
                    <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 }}>{job.title}{job.company ? ` · ${job.company}` : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {job.location && <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 20, padding: '3px 10px', fontSize: 11 }}>📍 {job.location}</span>}
                    {job.jobType  && <span style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 20, padding: '3px 10px', fontSize: 11 }}>💼 {job.jobType}</span>}
                    {job.salary   && <span style={{ background: '#fefce8', color: '#854d0e', border: '1px solid #fde68a', borderRadius: 20, padding: '3px 10px', fontSize: 11 }}>💰 {job.salary}</span>}
                  </div>
                  {job.description && <div style={{ color: '#374151', fontSize: 12, lineHeight: 1.6, borderLeft: '3px solid #0176D3', paddingLeft: 10, marginBottom: 12 }}>{job.description.slice(0, 200)}{job.description.length > 200 ? '…' : ''}</div>}
                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                    <span style={{ display: 'inline-block', background: '#0176D3', color: '#fff', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 700 }}>👉 View Job &amp; Apply Now</span>
                    <span style={{ display: 'inline-block', background: '#16a34a', color: '#fff', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 700 }}>✅ I'm Interested</span>
                    <span style={{ color: '#9ca3af', fontSize: 10 }}>Candidate clicks "I'm Interested" → tracked in Outreach</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sent list */}
            {sentList.length > 0 && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 14px', fontSize: 11, color: '#166534' }}>
                ✅ Sent to: {sentList.join(', ')}
              </div>
            )}

            {/* Toast */}
            {sendToast && (
              <div style={{ background: sendToast.startsWith('✅') ? '#f0fdf4' : sendToast.startsWith('⚠') ? '#fffbeb' : '#fef2f2', border: `1px solid ${sendToast.startsWith('✅') ? '#bbf7d0' : sendToast.startsWith('⚠') ? '#fcd34d' : '#fecaca'}`, borderRadius: 8, padding: '8px 14px', color: sendToast.startsWith('✅') ? '#166534' : sendToast.startsWith('⚠') ? '#92400e' : '#991b1b', fontSize: 12, fontWeight: 600 }}>
                {sendToast}
              </div>
            )}

          </>
        )}

        {/* ── SOCIAL TABS ── */}
        {activePlatform !== 'email' && (
          <>
            {/* Post preview */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 6, letterSpacing: '0.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>POST CONTENT</span>
                <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#9ca3af' }}>
                  {postText.length} chars
                  {activePlatform === 'twitter' && postText.length > 280 && <span style={{ color: '#ef4444', marginLeft: 4 }}>⚠ Over 280</span>}
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <textarea readOnly value={postText} rows={activePlatform === 'instagram' ? 12 : 8}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${platform?.color}40`, background: '#f8fafc', color: '#181818', fontSize: 12, lineHeight: 1.65, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', cursor: 'text' }}
                  onClick={e => e.target.select()}
                />
                <button onClick={() => { copy(postText, setCopied); logSocialShare(activePlatform); }}
                  style={{ position: 'absolute', top: 10, right: 10, background: copied ? '#22c55e' : '#fff', border: `1px solid ${copied ? '#22c55e' : '#e2e8f0'}`, color: copied ? '#fff' : '#374151', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                  {copied ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>

            {/* Job link */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 6, letterSpacing: '0.5px' }}>JOB LINK</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '9px 14px' }}>
                <span style={{ flex: 1, fontSize: 12, color: '#374151', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{jobUrl}</span>
                <button onClick={() => { copy(jobUrl, setImgCopied); logSocialShare(activePlatform); }}
                  style={{ background: imgCopied ? '#22c55e' : '#0176D3', border: 'none', color: '#fff', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }}>
                  {imgCopied ? '✓' : '📋 Copy link'}
                </button>
              </div>
            </div>

            {/* Quick share all */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 8, letterSpacing: '0.5px' }}>QUICK SHARE ALL PLATFORMS</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PLATFORMS.filter(p => !!p.shareUrl).map(p => (
                  <button key={p.id} onClick={() => handleSocialShare(p.id)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 20, background: `${p.color}15`, border: `1px solid ${p.color}40`, color: p.color, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
