import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal.jsx';
import Spinner from '../ui/Spinner.jsx';
import Badge from '../ui/Badge.jsx';
import { btnP, btnG, card } from '../../constants/styles.js';
import { api } from '../../api/api.js';

export default function CandidateMergeWizard({ isOpen, onClose, candidates, onMerged }) {
  const [step, setStep] = useState(1);
  const [primaryId, setPrimaryId] = useState(candidates?.[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [duplicates, setDuplicates] = useState([]);

  useEffect(() => {
    if (candidates?.length > 1) {
      setPrimaryId(candidates[0].id);
      setDuplicates(candidates.slice(1).map(c => c.id));
    }
  }, [candidates]);

  if (!isOpen) return null;

  const handleMerge = async () => {
    setMerging(true);
    try {
      await api.mergeCandidates({
        primaryId,
        duplicateIds: duplicates,
      });
      onMerged?.();
      onClose();
    } catch (e) {
      alert(`Merge failed: ${e.message}`);
    }
    setMerging(false);
  };

  const primary = candidates.find(c => c.id === primaryId);
  const dups = candidates.filter(c => c.id !== primaryId);

  return (
    <Modal title="Consolidate Candidate Records" onClose={onClose} wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {step === 1 && (
          <>
            <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                You have selected <strong>{candidates.length} records</strong> that appear to be duplicates. 
                Merging will consolidate all application history, notes, and skills into a single "Source of Truth" profile.
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 12, textTransform: 'uppercase' }}>1. Select Primary Record</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {candidates.map(c => (
                  <label key={c.id} style={{ 
                    ...card, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 12, 
                    padding: '12px 16px',
                    cursor: 'pointer',
                    border: primaryId === c.id ? '2px solid #0176D3' : '1px solid #E2E8F0',
                    background: primaryId === c.id ? '#F0F7FF' : '#FFF',
                  }}>
                    <input 
                      type="radio" 
                      name="primaryCandidate" 
                      checked={primaryId === c.id} 
                      onChange={() => {
                        setPrimaryId(c.id);
                        setDuplicates(candidates.filter(x => x.id !== c.id).map(x => x.id));
                      }} 
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name} <span style={{ fontWeight: 400, color: '#64748B', fontSize: 12 }}>({c.email})</span></div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>
                        {c.title || 'No Title'} • {c.location || 'No Location'} • Added {new Date(c.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    {primaryId === c.id && <Badge label="PRIMARY" color="#0176D3" />}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={onClose} style={btnG}>Cancel</button>
              <button onClick={() => setStep(2)} style={btnP}>Next: Verify Details →</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 12, textTransform: 'uppercase' }}>2. Merge Preview</h4>
              <div style={{ padding: '20px', border: '1px solid #E2E8F0', borderRadius: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#0176D3', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20 }}>
                    {primary.name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{primary.name}</div>
                    <div style={{ fontSize: 13, color: '#64748B' }}>Primary "Source of Truth" Record</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 4 }}>EMAIL</div>
                    <div style={{ fontSize: 14 }}>{primary.email}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 4 }}>PHONE</div>
                    <div style={{ fontSize: 14 }}>{primary.phone || 'N/A'}</div>
                  </div>
                </div>

                <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 8 }}>RECORDS TO BE ARCHIVED</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {dups.map(d => (
                      <div key={d.id} style={{ fontSize: 13, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>🗑</span> <span>{d.name} ({d.email})</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 20, padding: '12px', background: '#FFFBEB', borderRadius: 8, border: '1px solid #FEF3C7' }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#92400E' }}>
                    <strong>Note:</strong> All applications, interviews, and files from the archived records will be moved to the primary record. This action is irreversible.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setStep(1)} style={btnG}>← Back</button>
              <button 
                onClick={handleMerge} 
                disabled={merging} 
                style={{ ...btnP, background: '#DC2626', borderColor: '#DC2626' }}
              >
                {merging ? 'Merging Records...' : 'Confirm & Merge Records'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
