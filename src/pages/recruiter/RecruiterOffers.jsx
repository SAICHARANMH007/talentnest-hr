import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Field from '../../components/ui/Field.jsx';
import OfferLetterModal from '../../components/modals/OfferLetterModal.jsx';
import { btnP, btnG, btnD, card, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';

// ── Styles outside component ───────────────────────────────────────────────────
const S = {
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #F3F2F2' },
  td: { padding: '12px 14px', fontSize: 13, color: '#181818', borderBottom: '1px solid #F3F2F2', verticalAlign: 'middle' },
  empty: { textAlign: 'center', padding: '60px 24px', color: '#706E6B', fontSize: 14 },
  statusColor: { draft: '#706E6B', sent: '#0176D3', signed: '#34d399', declined: '#BA0517' },
};

function SkeletonRow() {
  return (
    <tr>{[1,2,3,4,5].map(i => (
      <td key={i} style={S.td}>
        <div className="tn-skeleton" style={{ height: 14, borderRadius: 6, width: '70%' }} />
      </td>
    ))}</tr>
  );
}

export default function RecruiterOffers({ user }) {
  const [apps,      setApps]     = useState([]);
  const [offers,    setOffers]   = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [error,     setError]    = useState('');
  const [toast,     setToast]    = useState('');
  const [offerApp,  setOfferApp] = useState(null); // open OfferLetterModal
  const [sendingId, setSendingId]= useState('');
  const [downloadingId, setDownloadingId] = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    // Fetch Offer + Hired stage apps in parallel
    Promise.all([
      api.getApplications({ stage: 'Offer' }),
      api.getApplications({ stage: 'Hired' }),
    ])
      .then(([offerR, hiredR]) => {
        const offerArr  = Array.isArray(offerR) ? offerR : (offerR?.data || []);
        const hiredArr  = Array.isArray(hiredR) ? hiredR : (hiredR?.data || []);
        const combined  = [...offerArr, ...hiredArr];
        // Deduplicate by id
        const seen = new Set();
        const arr = combined.filter(a => { const id = a.id || a._id?.toString(); if (seen.has(id)) return false; seen.add(id); return true; });
        setApps(arr);
        return Promise.all(arr.map(a =>
          api.getOfferByApplication(a.id || a._id).catch(() => null)
        ));
      })
      .then(offerList => setOffers(offerList.filter(Boolean)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const getOffer = (appId) => offers.find(o => (o.applicationId === appId || String(o.applicationId) === String(appId)));

  const handleSend = async (appId) => {
    setSendingId(appId);
    try {
      let offer = getOffer(appId);
      if (!offer) {
        offer = await api.getOfferByApplication(appId);
      }
      await api.sendOffer(offer.id || offer._id);
      setToast('✅ Offer sent to candidate');
      load();
    } catch (e) { setToast(`❌ ${e.message}`); }
    setSendingId('');
  };

  const handleDownload = async (appId) => {
    const offer = getOffer(appId);
    if (!offer?.signedDocUrl) { setToast('❌ No signed PDF yet'); return; }
    setDownloadingId(appId);
    try {
      await api.downloadOfferPdf(offer.id || offer._id);
    } catch (e) { setToast(`❌ ${e.message}`); }
    setDownloadingId('');
  };

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      <PageHeader title="📨 Offers" subtitle="Generate, send, and track offer letters" />

      {error && <div style={{ ...card, color: '#BA0517', marginBottom: 16 }}>❌ {error} <button onClick={load} style={{ ...btnG, marginLeft: 12 }}>Retry</button></div>}

      <div style={card}>
        {loading ? (
          <table style={S.table}>
            <thead><tr>{['Candidate','Job','CTC','Status','Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{[1,2,3].map(i => <SkeletonRow key={i} />)}</tbody>
          </table>
        ) : apps.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📨</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>No applications in Offer stage</div>
            <div style={{ fontSize: 12 }}>Move applications to Offer stage in the pipeline to generate offer letters here</div>
          </div>
        ) : (
          <table style={S.table}>
            <thead><tr>{['Candidate','Job','Stage','Offer Status','Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {apps.map(app => {
                const cName = app.candidateId?.name || app.candidate?.name || 'Candidate';
                const jTitle = app.jobId?.title || '—';
                const appId = app.id || app._id?.toString();
                const offer = getOffer(appId);
                const offerStatus = offer?.status || 'not_created';
                const isSending = sendingId === appId;
                const isDownloading = downloadingId === appId;
                return (
                  <tr key={appId}
                    onMouseEnter={e => e.currentTarget.style.background='#FAFAF9'}
                    onMouseLeave={e => e.currentTarget.style.background=''}>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600 }}>{cName}</div>
                      {app.candidateId?.email && <div style={{ fontSize: 11, color: '#706E6B' }}>{app.candidateId.email}</div>}
                    </td>
                    <td style={S.td}>{jTitle}</td>
                    <td style={S.td}><Badge label={app.currentStage || '—'} color={app.currentStage === 'Hired' ? '#34d399' : '#0176D3'} /></td>
                    <td style={S.td}>
                      <Badge
                        label={offerStatus === 'not_created' ? 'Not Created' : offerStatus}
                        color={S.statusColor[offerStatus] || '#706E6B'}
                      />
                    </td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => setOfferApp(app)} style={{ ...btnP, fontSize: 12 }}>
                          {offer ? '✏️ Edit' : '📄 Generate'}
                        </button>
                        {offer && offer.status === 'draft' && (
                          <button onClick={() => handleSend(appId)} disabled={isSending} style={{ ...btnG, fontSize: 12 }}>
                            {isSending ? 'Sending…' : '📧 Send'}
                          </button>
                        )}
                        {offer && offer.status === 'signed' && (
                          <button onClick={() => handleDownload(appId)} disabled={isDownloading} style={{ ...btnG, fontSize: 12 }}>
                            {isDownloading ? '…' : '⬇ PDF'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {offerApp && (
        <OfferLetterModal
          app={offerApp}
          recruiter={user}
          onClose={() => setOfferApp(null)}
          onDone={(msg) => { setToast(msg); setOfferApp(null); load(); }}
        />
      )}
    </div>
  );
}
