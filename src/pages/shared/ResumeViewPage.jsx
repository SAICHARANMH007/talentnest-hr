import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ResumeCard from '../../components/shared/ResumeCard.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { btnG, btnP } from '../../constants/styles.js';
import { api } from '../../api/api.js';

/**
 * Full-screen resume page — accessible at /app/resume/:candidateId
 * Fetches the full candidate profile (User model or Candidate model) and renders
 * ResumeCard in a full-viewport, properly scrollable layout that adapts to all screens.
 */
export default function ResumeViewPage({ user }) {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!candidateId) return;
    setLoading(true);
    // Try Candidate model first, fall back to User model
    api.getCandidate(candidateId)
      .then(c => setCandidate(c || null))
      .catch(() => api.getUser(candidateId).then(u => setCandidate(u?.data || u || null)).catch(() => {}))
      .finally(() => setLoading(false));
  }, [candidateId]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spinner />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
        <p style={{ color: '#706E6B', fontSize: 14 }}>{error || 'Candidate not found.'}</p>
        <button onClick={() => navigate(-1)} style={{ ...btnG, marginTop: 16 }}>← Go Back</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F3F2F2' }}>
      {/* Toolbar */}
      <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 100, background: '#032D60', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ← Back
        </button>
        <div style={{ flex: 1, color: '#fff', fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          📋 Resume — {candidate.name || 'Candidate'}
        </div>
        <button
          onClick={handlePrint}
          style={{ ...btnP, background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff', padding: '7px 16px', fontSize: 13 }}
        >
          🖨️ Print / Save PDF
        </button>
      </div>

      {/* Resume content — full width, scrollable, centered on large screens */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 48px' }}>
        <ResumeCard candidate={candidate} />
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
        }
        @media (max-width: 640px) {
          /* Remove side padding on mobile so resume fills the screen */
          div[style*="max-width: 960px"] { padding: 8px 0 32px !important; }
        }
      `}</style>
    </div>
  );
}
