import React, { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import Toast from '../../components/ui/Toast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Field from '../../components/ui/Field.jsx';
import Dropdown from '../../components/ui/Dropdown.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { btnP, btnG, card } from '../../constants/styles.js';

/**
 * Dedicated Schedule Interview page.
 * Route: /app/forms/interview
 * Provides a clean, focused scheduling experience with live email preview.
 */
export default function ScheduleInterviewPage({ user, onBack, onDone }) {
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [format, setFormat] = useState("video");
  const [videoLink, setVideoLink] = useState("");
  const [interviewerName, setInterviewerName] = useState(user?.name || "");
  const [interviewerEmail, setInterviewerEmail] = useState(user?.email || "");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState("");
  const [emailResult, setEmailResult] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const appId = params.get('appId');
    if (appId) {
      api.getApplication(appId).then(data => {
        setApp(data);
        const lastRound = Array.isArray(data.interviewRounds) && data.interviewRounds.length
          ? data.interviewRounds[data.interviewRounds.length - 1] : null;
        if (lastRound) {
          const dt = lastRound.scheduledAt ? new Date(lastRound.scheduledAt) : null;
          if (dt) {
            setDate(dt.toISOString().split('T')[0]);
            setTime(dt.toTimeString().slice(0, 5));
          }
          setFormat(lastRound.format || "video");
          setVideoLink(lastRound.videoLink || "");
          setInterviewerName(lastRound.interviewerName || user?.name || "");
          setInterviewerEmail(lastRound.interviewerEmail || user?.email || "");
        }
        setLoading(false);
      }).catch(e => {
        setToast(`❌ Error: ${e.message}`);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const candidate = app?.candidate;
  const job = app?.job;

  const formatLabel = format === "video" ? "Video Call" : format === "phone" ? "Phone Call" : "In-Person";
  const emailBody = `Dear ${candidate?.name},\n\nWe are pleased to invite you for an interview for the ${job?.title} position at ${job?.company}.\n\nInterview Details:\n━━━━━━━━━━━━━━━━\n📅 Date: ${date}\n⏰ Time: ${time}\n📍 Format: ${formatLabel}\n${videoLink ? `🔗 Link: ${videoLink}\n` : ""}${notes ? `📝 Notes: ${notes}\n` : ""}\n━━━━━━━━━━━━━━━━\n\nYour interviewer will be ${interviewerName || "our team"}. Please confirm your availability.\n\nBest regards,\n${user?.name || "The Recruitment Team"}`;

  const save = async (sendEmail) => {
    if (!date || !time) { setToast("❌ Date and time required"); return; }
    setSending(true);
    let emailSent = false;
    if (sendEmail) {
      try {
        const res = await api.sendEmail(candidate?.email, `Interview Invitation: ${job?.title} at ${job?.company}`, emailBody);
        emailSent = true;
        setEmailResult({ success: true, previewUrl: res.previewUrl });
      } catch (e) { setEmailResult({ success: false, error: e.message }); }
    }
    
    try {
      await api.scheduleInterview(app.id, { date, time, format, videoLink, interviewerName, interviewerEmail, notes, emailSent });
      
      // WhatsApp Session (standard platform capability)
      if (candidate?.phone) {
        const roundIndex = Array.isArray(app.interviewRounds) ? app.interviewRounds.length : 0;
        await api.createWhatsAppSession({
          candidatePhone: candidate.phone,
          type: 'interview-confirm',
          applicationId: app.id,
          interviewRoundIndex: roundIndex,
        }).catch(() => {});
      }

      setToast(sendEmail && emailSent ? "✅ Interview scheduled & email sent!" : "✅ Interview scheduled!");
      setTimeout(() => { if (onDone) onDone(); else if (onBack) onBack(); }, 1500);
    } catch (e) {
      setToast(`❌ ${e.message}`);
    }
    setSending(false);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner /> Loading application...</div>;
  if (!app) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
       <h3 style={{ color: '#181818' }}>Invalid Application</h3>
       <p style={{ color: '#64748B' }}>Please select a candidate to schedule an interview.</p>
       <button onClick={onBack} style={btnP}>Return to Pipeline</button>
    </div>
  );

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', animation: 'tn-fadein 0.3s ease both' }}>
      <Toast msg={toast} onClose={() => setToast("")} />

      <div style={{ marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#0176D3', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: 0 }}>
          ← Back to Pipeline
        </button>
      </div>

      <PageHeader 
        title={`📅 Schedule Interview: ${candidate?.name}`} 
        subtitle={`Setting up the next round for the ${job?.title} position at ${job?.company}.`}
      />

      <div className="tn-page-split-half" style={{ marginTop: 24 }}>
        
        {/* Form Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div style={{ ...card, background: '#fff' }}>
             <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 800, margin: '0 0 16px', letterSpacing: 1 }}>🕒 LOGISTICS</p>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 16 }}>
                <Field label="Interview Date *" value={date} onChange={setDate} type="date" />
                <Field label="Interview Time *" value={time} onChange={setTime} type="time" />
             </div>
             <div style={{ marginTop: 16 }}>
                <Dropdown label="Interview Format" value={format} onChange={setFormat} options={[{value:"video",label:"Video Call"},{value:"phone",label:"Phone Call"},{value:"in_person",label:"In-Person"}]} />
             </div>
             <div style={{ marginTop: 16 }}>
                <Field label="Meeting Link / Physical Address" value={videoLink} onChange={setVideoLink} placeholder="e.g. https://zoom.us/j/... or Office Room 402" />
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 16, marginTop: 16 }}>
               <Field label="Interviewer Name" value={interviewerName} onChange={setInterviewerName} placeholder="e.g. Sarah Chen" />
               <Field label="Interviewer Email" value={interviewerEmail} onChange={setInterviewerEmail} placeholder="sarah@company.com" type="email" />
             </div>
          </div>

          <div style={{ ...card, background: '#fff' }}>
             <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 800, margin: '0 0 16px', letterSpacing: 1 }}>📝 ADDITIONAL NOTES</p>
             <Field label="Notes for Candidate" value={notes} onChange={setNotes} rows={3} maxLength={1000} placeholder="e.g. Please bring your portfolio and be ready for a technical whiteboard session." hint={notes.length > 900 ? `${notes.length}/1000 characters` : undefined} />
          </div>

          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 20, display: 'flex', gap: 12 }}>
             <button onClick={() => save(true)} disabled={sending} style={{ ...btnP, flex: 1, opacity: sending ? 0.6 : 1 }}>
                {sending ? <><Spinner /> Sending...</> : '📧 Schedule & Send Email'}
             </button>
             <button onClick={() => save(false)} disabled={sending} style={btnG}>Save Only</button>
          </div>
        </div>

        {/* Preview Column */}
        <div style={{ position: 'sticky', top: 20 }}>
          <div style={{ background: '#fff', border: '1px solid #DDDBDA', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
             <div style={{ background: '#F8FAFC', padding: '12px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>EMAIL PREVIEW</span>
                <span style={{ fontSize: 10, background: '#DCFCE7', color: '#166534', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>LIVE SYNC</span>
             </div>
             <div style={{ padding: '24px' }}>
                <pre style={{ margin: 0, padding: 0, background: 'none', border: 'none', fontSize: 12, lineHeight: 1.6, color: '#334155', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                   {emailBody}
                </pre>
             </div>
             {emailResult && (
               <div style={{ padding: '12px 20px', background: emailResult.success ? '#F0FDF4' : '#FEF2F2', borderTop: '1px solid #E2E8F0' }}>
                  <p style={{ margin: 0, fontSize: 11, color: emailResult.success ? '#166534' : '#991B1B', fontWeight: 600 }}>
                    {emailResult.success ? `✅ Last email sent successfully! ` : `❌ Error: ${emailResult.error}`}
                    {emailResult.previewUrl && <a href={emailResult.previewUrl} target="_blank" rel="noreferrer" style={{ color: '#0176D3', marginLeft: 6 }}>View Preview</a>}
                  </p>
               </div>
             )}
          </div>
          
          <div style={{ marginTop: 20, padding: 20, background: 'rgba(245,158,11,0.08)', borderRadius: 12, border: '1px solid rgba(245,158,11,0.2)' }}>
             <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ fontSize: 20 }}>🤖</span>
                <div>
                   <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>WhatsApp Automation Active</div>
                   <p style={{ margin: '4px 0 0', fontSize: 11, color: '#B45309', lineHeight: 1.4 }}>
                      The candidate will also receive an automated WhatsApp confirmation request. Their response (1 for Accept, 2 for Reschedule) will be handled by the TalentNest BOT automatically.
                   </p>
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
