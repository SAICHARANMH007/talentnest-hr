'use strict';
import React, { useState, useEffect, useRef } from 'react';
import readXlsxFile from 'read-excel-file/browser';
import { api } from '../../api/api.js';
import Field from '../../components/ui/Field.jsx';

const card = { background: '#FFFFFF', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 16, padding: 24, marginBottom: 20 };
const btnP = { background: '#0176D3', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, padding: '9px 20px', cursor: 'pointer', fontSize: 13, transition: 'opacity 0.2s' };
const btnG = { background: '#F3F2F2', border: '1px solid #DDDBDA', borderRadius: 10, color: '#181818', fontWeight: 600, padding: '9px 20px', cursor: 'pointer', fontSize: 13 };

export default function SuperAdminCandidateImport({ user }) {
  const [tab, setTab] = useState('import'); // import, database, invited
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [inviting, setInviting] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [toast, setToast] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    if (tab === 'database' || tab === 'invited') {
      loadData();
    }
  }, [tab, page, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const status = tab === 'database' ? 'pending' : 'invited';
      const res = await api.getImportedCandidates({ page, status, search, limit: 50 });
      setItems(res.data || []);
      setTotal(res.pagination?.total || 0);
    } catch (err) {
      setToast('❌ Failed to load data');
    }
    setLoading(false);
  };

  const handleFileUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    (async () => {
      try {
        let data;
        if (f.name.toLowerCase().endsWith('.csv')) {
          const text = await f.text();
          const lines = text.trim().split(/\r?\n/);
          data = lines.map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
        } else {
          data = await readXlsxFile(f);
        }
        if (data.length > 0) {
          setHeaders(data[0]);
          const formattedRows = data.slice(1).map(row => {
            const obj = {};
            data[0].forEach((h, i) => {
              obj[h || `Column_${i}`] = row[i] ?? '';
            });
            return obj;
          });
          setRows(formattedRows);
          setToast(`✅ Loaded ${formattedRows.length} records. Click Start Import below.`);
        }
      } catch (err) {
        setToast('❌ Error parsing file');
      }
    })();
  };

  const startImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    try {
      await api.bulkImportRaw(rows);
      setToast(`🚀 Successfully imported ${rows.length} records!`);
      setRows([]);
      setFile(null);
      setTab('database');
    } catch (err) {
      setToast('❌ Import failed');
    }
    setImporting(false);
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === items.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map(i => i.id)));
  };

  const sendInvites = async () => {
    if (selectedIds.size === 0) return;
    setInviting(true);
    try {
      const res = await api.sendImportedInvites([...selectedIds]);
      setToast(`📩 ${res.message}`);
      setSelectedIds(new Set());
      loadData();
    } catch (err) {
      setToast('❌ Failed to send invites');
    }
    setInviting(false);
  };

  const clearDatabase = async () => {
    if (!window.confirm('Are you sure? This will delete all imported records for your organisation.')) return;
    try {
      await api.clearImportedDatabase();
      setToast('🗑️ Database cleared');
      loadData();
    } catch (err) {
      setToast('❌ Failed to clear database');
    }
  };

  return (
    <div style={{ animation: 'tn-fadein 0.3s ease' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 1000, background: '#181818', color: '#fff', padding: '12px 24px', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.2)', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span>{toast}</span>
          <button onClick={() => setToast('')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#181818', fontWeight: 800, fontSize: 24, margin: '0 0 4px' }}>Imported Database</h1>
        <p style={{ color: '#706E6B', fontSize: 13 }}>Manage your 30,000+ external candidates · Search clumsly data · Invite to platform</p>
      </div>

      {/* Tabs Control */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: '#f8fafc', padding: 6, borderRadius: 14, width: 'fit-content', border: '1px solid #e2e8f0' }}>
        {[
          { id: 'import', label: '📥 Import Data', icon: '📊' },
          { id: 'database', label: '📁 Raw Database', icon: '🗂️' },
          { id: 'invited', label: '📩 Requests Sent', icon: '📧' }
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setPage(1); setSelectedIds(new Set()); }}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 8,
              background: tab === t.id ? '#fff' : 'transparent', 
              border: 'none', 
              boxShadow: tab === t.id ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
              borderRadius: 10, 
              color: tab === t.id ? '#0176D3' : '#64748b', 
              fontWeight: 700, 
              padding: '8px 16px', 
              cursor: 'pointer', 
              fontSize: 13 
            }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: IMPORT ── */}
      {tab === 'import' && (
        <div style={card}>
          <div 
            onClick={() => fileRef.current?.click()}
            style={{ border: '2px dashed #CBD5E1', borderRadius: 16, padding: '60px 40px', textAlign: 'center', cursor: 'pointer', background: '#F8FAFC', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.borderColor = '#0176D3'}
            onMouseOut={e => e.currentTarget.style.borderColor = '#CBD5E1'}
          >
            <input type="file" ref={fileRef} style={{ display: 'none' }} accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
            <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
            <h3 style={{ margin: '0 0 8px', color: '#1E293B' }}>{file ? file.name : 'Click to upload any Excel file'}</h3>
            <p style={{ color: '#64748B', fontSize: 13 }}>No template required. Any columns, any order. We accept everything.</p>
          </div>

          {rows.length > 0 && (
            <div style={{ marginTop: 24, borderTop: '1px solid #E2E8F0', paddingTop: 24, textAlign: 'center' }}>
              <p style={{ marginBottom: 16, fontWeight: 600, color: '#475569' }}>Total Records Found: {rows.length.toLocaleString()}</p>
              <button 
                onClick={startImport} 
                disabled={importing}
                style={{ ...btnP, padding: '12px 40px', fontSize: 15, opacity: importing ? 0.6 : 1 }}
              >
                {importing ? '⏳ Importing Data...' : '🚀 Start Bulk Import'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: DATABASE & INVITED ── */}
      {(tab === 'database' || tab === 'invited') && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, flex: 1 }}>
              <Field 
                value={search} 
                onChange={v => setSearch(v)} 
                placeholder="Search clumsly data (Name or Email)..." 
                style={{ maxWidth: 400, flex: 1 }}
              />
              {tab === 'database' && selectedIds.size > 0 && (
                <button 
                  onClick={sendInvites} 
                  disabled={inviting}
                  style={{ ...btnP, background: '#10B981', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  {inviting ? '⏳ Sending...' : `🚀 Request to Create Account (${selectedIds.size})`}
                </button>
              )}
            </div>
            {tab === 'database' && (
              <button onClick={clearDatabase} style={{ ...btnG, color: '#EF4444', borderColor: 'rgba(239,68,68,0.2)' }}>
                🗑️ Clear All Data
              </button>
            )}
          </div>

          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    {tab === 'database' && (
                      <th style={{ padding: '12px 16px', width: 40 }}>
                        <input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === items.length} onChange={selectAll} style={{ cursor: 'pointer' }} />
                      </th>
                    )}
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600, fontSize: 12 }}>IDENTIFIED NAME</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600, fontSize: 12 }}>IDENTIFIED EMAIL</th>
                    <th style={{ padding: '12px 16px', color: '#64748B', fontWeight: 600, fontSize: 12 }}>DATE ADDED</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" style={{ padding: 40, textAlign: 'center' }}>
                        <div className="tn-spinner" style={{ width: 24, height: 24, border: '3px solid #f3f3f3', borderTop: '3px solid #0176D3', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No records found in this section.</td>
                    </tr>
                  ) : items.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.1s' }} onMouseOver={e => e.currentTarget.style.background = '#FBFDFF'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      {tab === 'database' && (
                        <td style={{ padding: '12px 16px' }}>
                          <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} style={{ cursor: 'pointer' }} />
                        </td>
                      )}
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1E293B' }}>{item.name || <span style={{ color: '#94A3B8', fontWeight: 400 }}>[Heuristic Scan Needed]</span>}</td>
                      <td style={{ padding: '12px 16px', color: '#0176D3' }}>{item.email || <span style={{ color: '#EF4444', fontSize: 11 }}>⚠️ No Email Detected</span>}</td>
                      <td style={{ padding: '12px 16px', color: '#64748B', fontSize: 12 }}>{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button onClick={() => setDetailItem(item)} style={{ ...btnG, padding: '6px 12px', fontSize: 12 }}>View All Fields</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
              <span style={{ fontSize: 12, color: '#64748B' }}>Showing {items.length} of {total.toLocaleString()} records</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ ...btnG, padding: '6px 12px', opacity: page === 1 ? 0.5 : 1 }}>Previous</button>
                <button disabled={items.length < 50} onClick={() => setPage(p => p + 1)} style={{ ...btnG, padding: '6px 12px', opacity: items.length < 50 ? 0.5 : 1 }}>Next</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── DYNAMIC DETAIL MODAL ── */}
      {detailItem && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: 600, maxHeight: '85vh', borderRadius: 20, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'tn-slideup 0.3s ease' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1E293B', margin: 0 }}>Candidate Profile Data</h2>
              <button onClick={() => setDetailItem(null)} style={{ background: 'none', border: 'none', fontSize: 24, color: '#94A3B8', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                {Object.entries(detailItem.data || {}).map(([key, val]) => (
                  <div key={key} style={{ padding: '12px 16px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #F1F5F9' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.5px' }}>{key}</div>
                    <div style={{ color: '#1E293B', fontWeight: 500, wordBreak: 'break-all' }}>{val || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '16px 24px', background: '#F8FAFC', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setDetailItem(null)} style={btnG}>Close</button>
              {detailItem.status === 'pending' && (
                <button 
                  onClick={async () => {
                    await api.sendImportedInvites([detailItem.id]);
                    setToast('📩 Invitation sent!');
                    setDetailItem(null);
                    loadData();
                  }}
                  style={{ ...btnP, background: '#10B981' }}
                >
                  🚀 Request to Create Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes tn-fadein { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tn-slideup { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
