import React, { useState, useMemo } from 'react';
import { btnP, btnG } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const TEMPLATE_VARS = '{{CandidateName}}, {{JobTitle}}, {{CompanyName}}, {{RecruiterName}}, {{InterviewDate}}';

const DEFAULT_TEMPLATE =
  `Hi {{CandidateName}},\n\nWe are reaching out regarding your application for {{JobTitle}} at {{CompanyName}}.\n\nPlease reply with:\n1 - Confirm\n2 - Request reschedule\n3 - Decline\n\nBest regards,\n{{RecruiterName}}`;

/**
 * BulkWhatsAppModal
 *
 * Props:
 *   candidates    — array of selected candidate objects
 *   jobTitle      — string
 *   companyName   — string
 *   recruiterName — string
 *   onClose       — () => void
 *   onComplete    — (summary: string) => void
 */
export default function BulkWhatsAppModal({
  candidates = [],
  jobTitle = '',
  companyName = '',
  recruiterName = '',
  onClose,
  onComplete,
}) {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(null); // { current, total }
  const [summary, setSummary] = useState(null);   // { sent, failed }

  // Live preview using first candidate's data
  const firstCandidate = candidates[0];
  const preview = useMemo(() => {
    if (!firstCandidate) return template;
    return template
      .replace(/\{\{CandidateName\}\}/g,  firstCandidate.name || 'Candidate')
      .replace(/\{\{JobTitle\}\}/g,       jobTitle || '')
      .replace(/\{\{CompanyName\}\}/g,    companyName || '')
      .replace(/\{\{RecruiterName\}\}/g,  recruiterName || '')
      .replace(/\{\{InterviewDate\}\}/g,  firstCandidate.interviewDate || '');
  }, [template, firstCandidate, jobTitle, companyName, recruiterName]);

  const handleSend = async () => {
    if (!template.trim()) return;
    setSending(true);
    setSummary(null);
    setProgress({ current: 0, total: candidates.length });

    try {
      const recipients = candidates.map(c => ({
        phone:        c.phone || '',
        candidateId:  c.id || c._id?.toString(),
        name:         c.name || '',
        jobTitle,
        companyName,
        recruiterName,
        interviewDate: c.interviewDate || '',
      }));

      // Track progress via optimistic counter while request runs
      const progressInterval = setInterval(() => {
        setProgress(p => p && p.current < p.total - 1 ? { ...p, current: p.current + 1 } : p);
      }, 1100);

      const result = await api.sendBulkWhatsApp(recipients, template);

      clearInterval(progressInterval);
      setProgress({ current: candidates.length, total: candidates.length });

      const sent   = result?.data?.sent   ?? 0;
      const failed = result?.data?.failed ?? 0;
      setSummary({ sent, failed });

      if (onComplete) onComplete(`Sent ${sent}, failed ${failed}`);
    } catch (err) {
      setSummary({ sent: 0, failed: candidates.length, error: err.message });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bulk WhatsApp"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(5,13,26,0.72)',
        backdropFilter: 'blur(6px)',
        zIndex: 10001,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 16,
        width: '100%', maxWidth: 600,
        padding: 28,
        display: 'flex', flexDirection: 'column', gap: 16,
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#032D60' }}>
            Send WhatsApp to {candidates.length} Candidate{candidates.length !== 1 ? 's' : ''}
          </div>
          <button
            onClick={handleClose}
            disabled={sending}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#706E6B', lineHeight: 1 }}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Variable hint */}
        <div style={{
          fontSize: 12, color: '#706E6B',
          background: 'rgba(1,118,211,0.06)',
          border: '1px solid rgba(1,118,211,0.15)',
          borderRadius: 8, padding: '10px 12px',
          lineHeight: 1.6,
        }}>
          <strong style={{ color: '#0176D3' }}>Template variables:</strong><br />
          <code style={{ fontSize: 11 }}>{TEMPLATE_VARS}</code>
        </div>

        {/* Template textarea */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>
            Message Template
          </label>
          <textarea
            value={template}
            onChange={e => setTemplate(e.target.value)}
            rows={7}
            disabled={sending}
            style={{
              width: '100%', padding: '9px 12px',
              border: '1px solid #DDDBDA', borderRadius: 8,
              fontSize: 13, outline: 'none',
              resize: 'vertical', fontFamily: 'inherit',
              boxSizing: 'border-box',
              opacity: sending ? 0.6 : 1,
            }}
          />
        </div>

        {/* Live preview */}
        {firstCandidate && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 6 }}>
              Preview <span style={{ fontWeight: 400, color: '#706E6B' }}>(using {firstCandidate.name || 'first candidate'}'s data)</span>
            </div>
            <pre style={{
              background: '#F3F2F2',
              border: '1px solid #DDDBDA',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 12, color: '#444',
              whiteSpace: 'pre-wrap', lineHeight: 1.6,
              maxHeight: 160, overflowY: 'auto',
              margin: 0,
            }}>
              {preview}
            </pre>
          </div>
        )}

        {/* Progress indicator */}
        {sending && progress && (
          <div style={{
            background: 'rgba(1,118,211,0.07)',
            border: '1px solid rgba(1,118,211,0.2)',
            borderRadius: 8, padding: '12px 16px',
            fontSize: 13, color: '#0176D3', fontWeight: 600,
          }}>
            Sending... {Math.min(progress.current, progress.total)} of {progress.total}
            <div style={{
              marginTop: 8, height: 6, background: '#DDDBDA', borderRadius: 4, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${progress.total > 0 ? (Math.min(progress.current, progress.total) / progress.total) * 100 : 0}%`,
                background: '#25D366',
                borderRadius: 4,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div style={{
            background: summary.error ? 'rgba(186,5,23,0.07)' : 'rgba(34,197,94,0.08)',
            border: `1px solid ${summary.error ? 'rgba(186,5,23,0.2)' : 'rgba(34,197,94,0.3)'}`,
            borderRadius: 8, padding: '12px 16px',
            fontSize: 13, lineHeight: 1.6,
          }}>
            {summary.error ? (
              <span style={{ color: '#ba0517' }}>Error: {summary.error}</span>
            ) : (
              <>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>{summary.sent} sent successfully</span>
                {summary.failed > 0 && (
                  <span style={{ color: '#ba0517', fontWeight: 700, marginLeft: 12 }}>{summary.failed} failed</span>
                )}
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={handleClose} disabled={sending} style={btnG}>
            {summary ? 'Close' : 'Cancel'}
          </button>
          {!summary && (
            <button
              onClick={handleSend}
              disabled={sending || !template.trim() || candidates.length === 0}
              style={{
                ...btnP,
                background: '#25D366', borderColor: '#25D366',
                opacity: (sending || !template.trim()) ? 0.6 : 1,
              }}
            >
              {sending ? 'Sending...' : `Send to ${candidates.length} Candidate${candidates.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
