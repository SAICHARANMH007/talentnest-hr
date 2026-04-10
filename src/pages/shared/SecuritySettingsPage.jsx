import React from 'react';
import SecuritySettings from '../../components/shared/SecuritySettings.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';

/**
 * Dedicated Security Settings page.
 * Route: /app/security
 * Provides full-page management for MFA, sessions, and account protection.
 */
export default function SecuritySettingsPage({ user, onBack }) {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', animation: 'tn-fadein 0.3s ease both' }}>
      
      <div style={{ marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#0176D3', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: 0 }}>
          ← Back to Profile
        </button>
      </div>

      <PageHeader 
        title="🛡️ Security & Privacy" 
        subtitle="Manage your multi-factor authentication, active sessions, and access logs."
      />

      <div style={{ marginTop: 24 }}>
        <SecuritySettings user={user} />
      </div>

      {/* Info Card */}
      <div style={{ marginTop: 20, padding: 24, borderRadius: 16, background: 'rgba(1,118,211,0.04)', border: '1px solid rgba(1,118,211,0.1)' }}>
         <div style={{ display: 'flex', gap: 16 }}>
            <span style={{ fontSize: 24 }}>💡</span>
            <div>
               <div style={{ fontSize: 14, fontWeight: 700, color: '#032D60' }}>Security Best Practices</div>
               <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                  We recommend enabling 2FA and reviewing your active sessions regularly. If you notice any suspicious activity, terminate the session immediately and change your password.
               </p>
            </div>
         </div>
      </div>
    </div>
  );
}
