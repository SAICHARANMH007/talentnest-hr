import React from 'react';
import EmailSettingsModal from '../../components/shared/EmailSettingsModal.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';

/**
 * Dedicated Email Settings page.
 * Route: /app/forms/email-settings
 * Provides full-page management for Outbound Email configurations (Resend/SMTP).
 */
export default function EmailSettingsPage({ user, onBack }) {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', animation: 'tn-fadein 0.3s ease both' }}>
      
      <div style={{ marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#0176D3', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: 0 }}>
          ← Back to Settings
        </button>
      </div>

      <PageHeader 
        title="📧 Email Delivery Settings" 
        subtitle="Configure how you send job invitations and updates to candidates. Support for Resend and custom SMTP."
      />

      <div style={{ background: '#fff', border: '1px solid #DDDBDA', borderRadius: 16, padding: '32px', marginTop: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <EmailSettingsModal 
           user={user} 
           onClose={onBack}
           // The modal handles its own footer and logic. 
           // In a "dedicated page" context, we trick it into thinking it's inline.
        />
      </div>

      <style>{`
        /* Override Modal styles when displayed inline */
        .tn-modal-overlay { position: static !important; background: none !important; padding: 0 !important; backdrop-filter: none !important; z-index: 1 !important; height: auto !important; }
        .tn-modal-container { position: static !important; width: 100% !important; max-width: none !important; box-shadow: none !important; margin: 0 !important; border: none !important; }
        .tn-modal-header { display: none !important; }
        .tn-modal-footer { padding: 24px 0 0 !important; border-top: 1px solid #F1F5F9 !important; margin-top: 16px !important; }
      `}</style>
    </div>
  );
}
