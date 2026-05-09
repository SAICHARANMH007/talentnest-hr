import React, { useState, useMemo } from 'react';
import { btnP, btnG } from '../../constants/styles.js';
import { api } from '../../api/api.js';
import Modal from '../ui/Modal.jsx';

const TEMPLATE_VARS = '{{CandidateName}}, {{JobTitle}}, {{CompanyName}}, {{RecruiterName}}, {{InterviewDate}}';

const DEFAULT_TEMPLATE =
  `Hi {{CandidateName}},\n\nWe are reaching out regarding your application for {{JobTitle}} at {{CompanyName}}.\n\nPlease reply with:\n1 - Confirm\n2 - Request reschedule\n3 - Decline\n\nBest regards,\n{{RecruiterName}}`;

/**
 * BulkWhatsAppModal
 * Uses createPortal via the Modal component for consistent UI.
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

  return (
    <Modal
      title={`Send WhatsApp to ${candidates.length} Candidate${candidates.length !== 1 ? 's' : ''}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} disabled={sending} style={btnG}>
            {summary ? 'Close' : 'Cancel'}
          </button>
          {!summary && (
            <button
              onClick={handleSend}
              disabled={sending || !template.trim() || candidates.length === 0}
              style={{
                ...btnP,
                background: '#25D366', 
                border: 'none',
                opacity: (sending || !template.trim()) ? 0.6 : 1,
              }}
            >
              {sending ? '⏳ Sending...' : `Send to ${candidates.length} Candidates`}
            </button>
          )}
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Variable hint */}
        <div style={{
          fontSize: 12, color: '#0176D3',
          background: 'rgba(1,118,211,0.06)',
          border: '1px solid rgba(1,118,211,0.15)',
          borderRadius: 12, padding: '12px 16px',
          lineHeight: 1.6,
        }}>
          <strong style={{ display: 'block', marginBottom: 4 }}>Available variables:</strong>
          <code style={{ fontSize: 11, background: 'rgba(255,255,255,0.5)', padding: '2px 6px', borderRadius: 4, display: 'inline-block' }}>{TEMPLATE_VARS}</code>
        </div>

        {/* Template textarea */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#181818', display: 'block', marginBottom: 8 }}>
            Message Template
          </label>
          <textarea
            value={template}
            onChange={e => setTemplate(e.target.value)}
            rows={6}
            disabled={sending}
            style={{
              width: '100%', padding: '14px',
              border: '1.5px solid #E2E8F0', borderRadius: 12,
              fontSize: 14, outline: 'none',
              resize: 'vertical', fontFamily: 'inherit',
              boxSizing: 'border-box',
              background: sending ? '#F8FAFC' : '#fff'
            }}
          />
        </div>

        {/* Live preview */}
        {firstCandidate && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#181818', marginBottom: 8 }}>
              Live Preview <span style={{ fontWeight: 400, color: '#706E6B' }}>(showing {firstCandidate.name})</span>
            </div>
            <div style={{
              background: '#F8FAFF',
              border: '1.5px solid #E2E8F0',
              borderRadius: 12, padding: '16px',
              fontSize: 13, color: '#1E293B',
              whiteSpace: 'pre-wrap', lineHeight: 1.65,
              maxHeight: 160, overflowY: 'auto'
            }}>
              {preview}
            </div>
          </div>
        )}

        {/* Progress indicator */}
        {sending && progress && (
          <div style={{
            background: 'rgba(37,211,102,0.05)',
            border: '1.5px solid rgba(37,211,102,0.2)',
            borderRadius: 12, padding: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: '#166534', fontWeight: 700 }}>Processing Queue</span>
              <span style={{ fontSize: 13, color: '#166534', fontWeight: 700 }}>{Math.min(progress.current, progress.total)} / {progress.total}</span>
            </div>
            <div style={{ height: 8, background: '#E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progress.total > 0 ? (Math.min(progress.current, progress.total) / progress.total) * 100 : 0}%`,
                background: '#25D366',
                transition: 'width 0.4s ease'
              }} />
            </div>
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div style={{
            background: summary.error ? 'rgba(186,5,23,0.06)' : 'rgba(34,197,94,0.06)',
            border: `1.5px solid ${summary.error ? 'rgba(186,5,23,0.2)' : 'rgba(34,197,94,0.2)'}`,
            borderRadius: 12, padding: '16px',
            fontSize: 13, lineHeight: 1.6
          }}>
            {summary.error ? (
              <span style={{ color: '#BA0517', fontWeight: 700 }}>⚠️ Error: {summary.error}</span>
            ) : (
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{ color: '#166534', fontWeight: 700 }}>✅ {summary.sent} Delivered</span>
                {summary.failed > 0 && (
                  <span style={{ color: '#BA0517', fontWeight: 700 }}>❌ {summary.failed} Failed</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
