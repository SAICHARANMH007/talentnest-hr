import React, { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import Toast from '../../components/ui/Toast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Field from '../../components/ui/Field.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { btnD, btnG, card } from '../../constants/styles.js';

/**
 * Dedicated Candidate Rejection page.
 * Route: /app/forms/reject
 * Provides a structured way to capture feedback and notify candidates.
 */
export default function CandidateRejectionPage({ user, onBack, onDone }) {
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const appId = params.get('appId');
    if (appId) {
      api.getApplication(appId).then(data => {
        setApp(data);
        setReason(data.rejectionReason || "");
        setLoading(false);
      }).catch(e => {
        setToast(`❌ Error: ${e.message}`);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const c = app?.candidate;
  const j = app?.job;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      if (sendEmail && c?.email) {
        await api.sendEmail(
          c.email, 
          `Application Update: ${j?.title} at ${j?.company}`, 
          `<p>Dear ${c?.name},</p><p>Thank you for your interest in the <strong>${j?.title}</strong> position at <strong>${j?.company}</strong>.</p><p>After careful consideration, we will not be moving forward at this time.</p>${reason ? `<p><strong>Feedback:</strong> ${reason}</p>` : ""}<p>Best wishes,<br/>The Recruitment Team</p>`
        ).catch(() => {});
      }
      
      await api.updateStage(app.id, "rejected", reason ? `Rejected: ${reason}` : "Rejected", { rejectionReason: reason });
      setToast(sendEmail ? "✅ Candidate rejected & notified." : "✅ Candidate rejected successfully.");
      setTimeout(() => { if (onDone) onDone(); else if (onBack) onBack(); }, 1500);
    } catch (e) {
      setToast(`❌ ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner /> Loading application...</div>;
  if (!app) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
       <h3>Invalid Application</h3>
       <p>Please select a candidate to reject.</p>
       <button onClick={onBack} style={btnG}>Return to Pipeline</button>
    </div>
  );

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', animation: 'tn-fadein 0.3s ease both' }}>
      <Toast msg={toast} onClose={() => setToast("")} />

      <div style={{ marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#0176D3', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: 0 }}>
          ← Back to Pipeline
        </button>
      </div>

      <PageHeader 
        title={`✕ Reject Candidate: ${c?.name}`} 
        subtitle={`Closing the application for ${j?.title} at ${j?.company}.`}
      />

      <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #DDDBDA', borderRadius: 16, padding: '32px', marginTop: 24, display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        
        <div style={{ ...card, background: 'rgba(186,5,23,0.04)', border: '1px solid rgba(186,5,23,0.1)' }}>
           <p style={{ color: '#BA0517', fontSize: 11, fontWeight: 800, margin: '0 0 8px', letterSpacing: 1 }}>CANDIDATE PROFILE</p>
           <div style={{ fontSize: 15, fontWeight: 700, color: '#181818' }}>{c?.name}</div>
           <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{c?.email} · {j?.title} @ {j?.company}</div>
        </div>

        <Field 
          label="Reason for Rejection / Internal Feedback" 
          required 
          value={reason} 
          onChange={setReason} 
          rows={4} 
          placeholder="e.g. Compensation mismatch, lacks required experience in Node.js, etc." 
          hint="This feedback helps the recruiting team understand why the candidate was skipped."
        />

        <div style={{ padding: '12px 16px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 12 }}>
           <input 
             type="checkbox" 
             id="notify-check"
             checked={sendEmail} 
             onChange={e => setSendEmail(e.target.checked)} 
             style={{ width: 18, height: 18, accentColor: '#0176D3', cursor: 'pointer' }} 
           />
           <label htmlFor="notify-check" style={{ fontSize: 13, color: '#181818', fontWeight: 600, cursor: 'pointer' }}>
             Notify candidate via email about this decision
           </label>
        </div>

        {sendEmail && (
          <div style={{ padding: 16, background: '#F1F5F9', borderRadius: 12, border: '1px dashed #CBD5E1' }}>
             <p style={{ fontSize: 11, color: '#64748B', fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase' }}>EMAIL PREVIEW</p>
             <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                Dear {c?.name?.split(' ')[0] || 'Candidate'},{'\n\n'}
                Thank you for your interest in the <strong>{j?.title}</strong> position at <strong>{j?.company}</strong>.{'\n\n'}
                After careful consideration, we will not be moving forward at this time.{'\n\n'}
                {reason && <><strong>Feedback:</strong> {reason}{'\n\n'}</>}
                Best wishes,{'\n'}
                The Recruitment Team
             </div>
          </div>
        )}

        <div style={{ padding: '24px 0 0', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onBack} style={btnG}>Cancel</button>
          <button type="submit" disabled={saving} style={{ ...btnD, minWidth: 180, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Processing Rejection...' : '✕ Confirm Rejection'}
          </button>
        </div>
      </form>
    </div>
  );
}
