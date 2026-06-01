import React, { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { card, btnP, btnG } from '../../constants/styles.js';

function Avatar({ name, photo, size = 36 }) {
  if (photo) return <img src={photo} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#0176D3', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function CandidateCard({ c, isPrimary, onSetPrimary, selected, onToggle }) {
  return (
    <div style={{ border: isPrimary ? '2px solid #0176D3' : '1px solid #E2E8F0', borderRadius: 12, padding: 14, background: isPrimary ? '#EFF8FF' : '#fff', position: 'relative' }}>
      {isPrimary && (
        <span style={{ position: 'absolute', top: 8, right: 8, background: '#0176D3', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '2px 8px' }}>PRIMARY</span>
      )}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
        <input type="checkbox" checked={selected} onChange={onToggle} style={{ marginTop: 2 }} />
        <Avatar name={c.name} photo={c.photoUrl} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0A1628', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name || '—'}</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>{c.email || '—'}</div>
          {c.phone && <div style={{ fontSize: 12, color: '#6B7280' }}>{c.phone}</div>}
          {(c.title || c.currentCompany) && (
            <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>{[c.title, c.currentCompany].filter(Boolean).join(' @ ')}</div>
          )}
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Added {new Date(c.createdAt).toLocaleDateString()}</div>
        </div>
      </div>
      {!isPrimary && (
        <button onClick={onSetPrimary} style={{ ...btnG, fontSize: 11, padding: '4px 10px', width: '100%' }}>Set as Primary</button>
      )}
    </div>
  );
}

export default function DuplicateMerge() {
  const [groups, setGroups]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [primaryMap, setPrimaryMap] = useState({});
  const [selectedMap, setSelectedMap] = useState({});
  const [merging, setMerging]   = useState(null);
  const [msg, setMsg]           = useState('');
  const [dismissed, setDismissed] = useState(new Set());

  const load = () => {
    setLoading(true);
    api.findDuplicateCandidates()
      .then(data => {
        setGroups(data);
        const pm = {}, sm = {};
        data.forEach((group, gi) => {
          pm[gi] = group[0]?._id;
          sm[gi] = {};
          group.forEach(c => { sm[gi][c._id] = true; });
        });
        setPrimaryMap(pm);
        setSelectedMap(sm);
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const visibleGroups = groups.filter((_, i) => !dismissed.has(i));

  const handleMerge = async (gi) => {
    const group = groups[gi];
    const primaryId = primaryMap[gi];
    const sel = selectedMap[gi] || {};
    const duplicateIds = group.filter(c => sel[c._id] && String(c._id) !== String(primaryId)).map(c => c._id);
    if (!duplicateIds.length) { setMsg('Select at least one duplicate to merge.'); return; }
    setMerging(gi);
    try {
      const r = await api.mergeCandidates({ primaryId, duplicateIds });
      setMsg(r?.message || 'Merge successful.');
      setDismissed(d => new Set([...d, gi]));
    } catch (e) {
      setMsg(e?.message || 'Merge failed.');
    }
    setMerging(null);
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A1628', margin: 0 }}>Duplicate Candidate Merge</h1>
        <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>Identify and merge duplicate candidate records</p>
      </div>

      {msg && (
        <div style={{ background: msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('error') ? '#FEE2E2' : '#D1FAE5', color: msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('error') ? '#991B1B' : '#065F46', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 14, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {msg}
          <button onClick={() => setMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'inherit' }}>×</button>
        </div>
      )}

      {loading ? (
        <div style={{ color: '#9CA3AF', textAlign: 'center', padding: 64 }}>Scanning for duplicates…</div>
      ) : visibleGroups.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 64 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#0A1628', marginBottom: 6 }}>No Duplicates Found</div>
          <div style={{ color: '#6B7280', fontSize: 14 }}>Your candidate database looks clean!</div>
          <button onClick={load} style={{ ...btnG, marginTop: 16 }}>Refresh</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 14, color: '#374151', fontWeight: 600 }}>{visibleGroups.length} duplicate group{visibleGroups.length !== 1 ? 's' : ''} found</span>
            <button onClick={load} style={{ ...btnG, fontSize: 12 }}>Refresh</button>
          </div>

          {groups.map((group, gi) => {
            if (dismissed.has(gi)) return null;
            const primaryId = primaryMap[gi];
            const sel = selectedMap[gi] || {};
            return (
              <div key={gi} style={{ ...card, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontWeight: 700, color: '#0A1628', fontSize: 14 }}>Group {gi + 1} — {group.length} records</span>
                  <button
                    onClick={() => setDismissed(d => new Set([...d, gi]))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9CA3AF' }}
                    title="Dismiss"
                  >×</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(group.length, 3)}, 1fr)`, gap: 12, marginBottom: 14 }}>
                  {group.map(c => (
                    <CandidateCard
                      key={c._id}
                      c={c}
                      isPrimary={String(c._id) === String(primaryId)}
                      selected={!!sel[c._id]}
                      onToggle={() => setSelectedMap(sm => ({ ...sm, [gi]: { ...sm[gi], [c._id]: !sm[gi][c._id] } }))}
                      onSetPrimary={() => setPrimaryMap(pm => ({ ...pm, [gi]: c._id }))}
                    />
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleMerge(gi)}
                    disabled={merging === gi}
                    style={{ ...btnP, minWidth: 140 }}
                  >
                    {merging === gi ? 'Merging…' : '🔀 Merge Selected'}
                  </button>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>
                    Checked records will be merged into the PRIMARY record. Duplicates will be soft-deleted.
                  </span>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
