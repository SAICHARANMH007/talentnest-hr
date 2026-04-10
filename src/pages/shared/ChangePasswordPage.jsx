import React from 'react';
import ChangePasswordModal from '../../components/shared/ChangePasswordModal.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';

/**
 * Dedicated Change Password page.
 * Route: /app/forms/change-password
 * Provides a secure, focused full-page interface for credential rotation.
 */
export default function ChangePasswordPage({ user, onBack }) {
  return (
    <div style={{ maxWidth: 500, margin: '0 auto', animation: 'tn-fadein 0.3s ease both' }}>
      
      <div style={{ marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#0176D3', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: 0 }}>
          ← Back to Security
        </button>
      </div>

      <PageHeader 
        title="🔒 Change Password" 
        subtitle="Keep your account secure by rotating your credentials regularly."
      />

      <div style={{ background: '#fff', border: '1px solid #DDDBDA', borderRadius: 16, padding: '32px', marginTop: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <ChangePasswordModal 
           user={user} 
           onClose={onBack}
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
