import React, { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import InviteModal from '../../components/shared/InviteModal.jsx';
import Toast from '../../components/ui/Toast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';

/**
 * Dedicated page for Inviting Candidates.
 * Route: /app/forms/invite
 * Supports bulk selection via URL params or session storage.
 */
export default function InviteCandidatePage({ user, onBack }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    // Try to get candidates from sessionStorage (standard platform patterns)
    const stored = sessionStorage.getItem('tn_invite_candidates');
    if (stored) {
      try {
        setCandidates(JSON.parse(stored));
      } catch (e) { console.error('Failed to parse invite candidates', e); }
    }
    setLoading(false);
  }, []);

  const handleSent = (count, jobTitle) => {
    setToast(`✅ Successfully sent ${count} invites for ${jobTitle}`);
    sessionStorage.removeItem('tn_invite_candidates');
    setTimeout(() => { if (onBack) onBack(); }, 1500);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading candidate data...</div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', animation: 'tn-fadein 0.3s ease both' }}>
      <Toast msg={toast} onClose={() => setToast('')} />
      
      <div style={{ marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#0176D3', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: 0 }}>
          ← Back to Candidates
        </button>
      </div>

      <PageHeader 
        title="📧 Invite Candidates" 
        subtitle="Send personalized job invitations and tracking links to your talent pool." 
      />

      <div style={{ background: '#fff', border: '1px solid #DDDBDA', borderRadius: 16, padding: '32px', marginTop: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        {candidates.length > 0 ? (
          <InviteModal 
            candidates={candidates} 
            onClose={onBack} 
            onSent={handleSent}
            // We pass a flag to InviteModal to render in "inline" mode if we want to skip the Modal wrapper
            // But for Phase 2, we can just wrap the component logic or modify InviteModal to be "headless"
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
            <h3 style={{ color: '#181818', margin: '0 0 8px' }}>No candidates selected</h3>
            <p style={{ color: '#64748B', fontSize: 14, marginBottom: 24 }}>Select candidates from the pipeline or talent pool to invite them.</p>
            <button onClick={onBack} style={{ background: '#0176D3', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer' }}>
              Go to Candidates List
            </button>
          </div>
        )}
      </div>

      <style>{`
        /* Override Modal styles when displayed inline */
        .tn-modal-overlay { position: static !important; background: none !important; padding: 0 !important; backdrop-filter: none !important; z-index: 1 !important; height: auto !important; }
        .tn-modal-container { position: static !important; width: 100% !important; max-width: none !important; box-shadow: none !important; margin: 0 !important; }
        .tn-modal-header { display: none !important; }
      `}</style>
    </div>
  );
}
