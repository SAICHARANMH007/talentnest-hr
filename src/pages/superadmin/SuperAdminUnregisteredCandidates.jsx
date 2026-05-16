import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Toast from '../../components/ui/Toast.jsx';
import { btnP, btnG, card, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const STAGE_COLOR = {
  Applied:'#0176D3', Screening:'#7c3aed', Shortlisted:'#f59e0b',
  'Interview Round 1':'#06b6d4', 'Interview Round 2':'#8b5cf6',
  Offer:'#10b981', Hired:'#059669', Rejected:'#ef4444',
};
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';

function GuestUserModal({ candidate, onClose, onRefresh }) {
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (candidate) {
      setFormData({
        name: candidate.name || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
        title: candidate.title || '',
        currentCompany: candidate.currentCompany || '',
        experience: candidate.experience || '',
        location: candidate.location || '',
        availability: candidate.availability || '',
        skills: Array.isArray(candidate.skills) ? candidate.skills.join(', ') : candidate.skills || '',
      });
    }
  }, [candidate]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        skills: typeof formData.skills === 'string' ? formData.skills.split(',').map(s => s.trim()).filter(Boolean) : formData.skills,
      };
      // Guest users might have multiple Candidate records for the same email (if they applied multiple times).
      // We update all of them so data stays consistent.
      for (const cid of candidate.candidateIds) {
        await api.updateCandidate(cid, payload);
      }
      setEditMode(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Failed to save candidate data.');
    }
    setSaving(false);
  };

  if (!candidate) return null;

  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(10,22,40,0.5)', backdropFilter:'blur(4px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', width:'100%', maxWidth:700, borderRadius:16, display:'flex', flexDirection:'column', maxHeight:'90vh', boxShadow:'0 20px 40px rgba(0,0,0,0.2)' }}>
        
        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #E2E8F0', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:'#0A1628' }}>Guest User Profile</div>
            <div style={{ fontSize:13, color:'#64748B', marginTop:4 }}>{candidate.email}</div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            {!editMode ? (
              <button onClick={() => setEditMode(true)} style={{ ...btnG, padding:'8px 16px' }}>Edit Record</button>
            ) : (
              <button onClick={handleSave} disabled={saving} style={{ ...btnP, padding:'8px 16px' }}>{saving ? 'Saving...' : 'Save Changes'}</button>
            )}
            <button onClick={onClose} style={{ ...btnG, padding:'8px 12px', background:'#F1F5F9', border:'none' }}>✕</button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{ padding:'24px', overflowY:'auto', flex:1 }}>
          <div style={{ marginBottom:30 }}>
            <div style={{ fontSize:12, fontWeight:800, color:'#0176D3', textTransform:'uppercase', letterSpacing:1, marginBottom:16 }}>Profile Information</div>
            
            {editMode ? (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <div><label style={{ fontSize:11, fontWeight:700, color:'#64748B', display:'block', marginBottom:6 }}>Name</label><input name="name" value={formData.name} onChange={handleChange} style={{ ...inp, width:'100%' }} /></div>
                <div><label style={{ fontSize:11, fontWeight:700, color:'#64748B', display:'block', marginBottom:6 }}>Email</label><input name="email" value={formData.email} disabled style={{ ...inp, width:'100%', opacity:0.6 }} /></div>
                <div><label style={{ fontSize:11, fontWeight:700, color:'#64748B', display:'block', marginBottom:6 }}>Phone</label><input name="phone" value={formData.phone} onChange={handleChange} style={{ ...inp, width:'100%' }} /></div>
                <div><label style={{ fontSize:11, fontWeight:700, color:'#64748B', display:'block', marginBottom:6 }}>Title</label><input name="title" value={formData.title} onChange={handleChange} style={{ ...inp, width:'100%' }} /></div>
                <div><label style={{ fontSize:11, fontWeight:700, color:'#64748B', display:'block', marginBottom:6 }}>Company</label><input name="currentCompany" value={formData.currentCompany} onChange={handleChange} style={{ ...inp, width:'100%' }} /></div>
                <div><label style={{ fontSize:11, fontWeight:700, color:'#64748B', display:'block', marginBottom:6 }}>Location</label><input name="location" value={formData.location} onChange={handleChange} style={{ ...inp, width:'100%' }} /></div>
                <div><label style={{ fontSize:11, fontWeight:700, color:'#64748B', display:'block', marginBottom:6 }}>Experience (Years)</label><input type="number" name="experience" value={formData.experience} onChange={handleChange} style={{ ...inp, width:'100%' }} /></div>
                <div><label style={{ fontSize:11, fontWeight:700, color:'#64748B', display:'block', marginBottom:6 }}>Availability</label><input name="availability" value={formData.availability} onChange={handleChange} style={{ ...inp, width:'100%' }} /></div>
                <div style={{ gridColumn:'1 / -1' }}><label style={{ fontSize:11, fontWeight:700, color:'#64748B', display:'block', marginBottom:6 }}>Skills (comma separated)</label><input name="skills" value={formData.skills} onChange={handleChange} style={{ ...inp, width:'100%' }} /></div>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                {/* Show ONLY filled data */}
                {Object.entries(formData).map(([k, v]) => {
                  if (!v || v.length === 0) return null;
                  const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                  return (
                    <div key={k}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:0.5 }}>{label}</div>
                      <div style={{ fontSize:14, color:'#0A1628', fontWeight:600, marginTop:4 }}>{v}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize:12, fontWeight:800, color:'#0176D3', textTransform:'uppercase', letterSpacing:1, marginBottom:16 }}>Application Pipeline ({candidate.applications?.length || 0})</div>
            {candidate.applications?.length > 0 ? (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {candidate.applications.map(app => (
                  <div key={app.id} style={{ border:'1px solid #E2E8F0', borderRadius:10, padding:'14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14, color:'#0A1628' }}>{app.jobTitle}</div>
                      {app.jobCompany && <div style={{ fontSize:12, color:'#64748B', marginTop:2 }}>{app.jobCompany}</div>}
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <span style={{ fontSize:11, fontWeight:700, color: STAGE_COLOR[app.stage] || '#64748B', background:`${STAGE_COLOR[app.stage] || '#64748B'}14`, padding:'4px 10px', borderRadius:20 }}>{app.stage}</span>
                      <div style={{ fontSize:11, color:'#94A3B8', marginTop:6 }}>Applied: {fmtDate(app.appliedAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize:13, color:'#94A3B8' }}>No applications found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminUnregisteredCandidates() {
  const [loading, setLoading]   = useState(true);
  const [rows, setRows]         = useState([]);
  const [search, setSearch]     = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage]         = useState(1);
  const [pagination, setPagination] = useState({ total:0, pages:1 });
  const [toast, setToast]       = useState('');
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [uninvitedOnly, setUninvitedOnly] = useState(false);
  const [stats, setStats]       = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Modals & Assignments
  const [activeModalCandidate, setActiveModalCandidate] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [selectedRecruiter, setSelectedRecruiter] = useState('');
  const [assigning, setAssigning] = useState(false);

  const LIMIT = 50;

  // Load stats once (not on every page change)
  useEffect(() => {
    setStatsLoading(true);
    api.getUnregisteredStats()
      .then(r => setStats(r?.data || null))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getUnregisteredCandidates({ page, limit: LIMIT, search, ...(uninvitedOnly ? { uninvitedOnly: true } : {}) });
      const data = Array.isArray(r?.data) ? r.data : [];
      setRows(data);
      setPagination(r?.pagination || { total: data.length, pages: 1 });
      
      // Load dropdowns if not loaded
      if (jobs.length === 0) {
        const [j, rec] = await Promise.all([
          api.getJobs({ limit: 200, status: 'active' }),
          api.getUsersList({ role: 'recruiter', limit: 200 })
        ]);
        setJobs(Array.isArray(j?.data) ? j.data : (Array.isArray(j) ? j : []));
        setRecruiters(Array.isArray(rec?.data) ? rec.data : (Array.isArray(rec) ? rec : []));
      }
    } catch { setRows([]); }
    setLoading(false);
  }, [page, search, uninvitedOnly, jobs.length]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
    setSelectedCandidates(new Set());
  };

  const toggleSelect = (email) => {
    const next = new Set(selectedCandidates);
    if (next.has(email)) next.delete(email);
    else next.add(email);
    setSelectedCandidates(next);
  };

  const toggleSelectAll = () => {
    if (selectedCandidates.size === rows.length) setSelectedCandidates(new Set());
    else setSelectedCandidates(new Set(rows.map(r => r.email)));
  };

  const handleAssignJob = async () => {
    if (!selectedJob) return alert('Select a job first');
    setAssigning(true);
    try {
      // Collect all raw candidate IDs for selected emails
      const cids = [];
      rows.forEach(r => { if (selectedCandidates.has(r.email)) cids.push(...r.candidateIds); });
      
      await api.assignCandidatesToJob(selectedJob, cids);
      setToast(`Successfully assigned to job.`);
      setSelectedCandidates(new Set());
      setSelectedJob('');
    } catch (err) {
      alert('Failed to assign to job.');
    }
    setAssigning(false);
  };

  const handleAssignRecruiter = async () => {
    if (!selectedRecruiter) return alert('Select a recruiter first');
    setAssigning(true);
    try {
      // Collect all raw candidate IDs for selected emails
      const cids = [];
      rows.forEach(r => { if (selectedCandidates.has(r.email)) cids.push(...r.candidateIds); });
      
      for (const cid of cids) {
        await api.assignCandidate(cid, selectedRecruiter);
      }
      setToast(`Successfully assigned recruiter.`);
      setSelectedCandidates(new Set());
      setSelectedRecruiter('');
    } catch (err) {
      alert('Failed to assign recruiter.');
    }
    setAssigning(false);
  };

  const handleInviteGuests = async () => {
    setAssigning(true);
    try {
      // Send {email, name} pairs — backend uses name directly, no DB lookup needed
      const candidates = rows
        .filter(r => selectedCandidates.has(r.email))
        .map(r => ({ email: r.email, name: r.name || 'Candidate' }));
      const res = await api.inviteGuestCandidates(candidates);
      setToast(res.message || `Invites sent to ${candidates.length} candidate${candidates.length !== 1 ? 's' : ''}.`);
      setSelectedCandidates(new Set());
      load(); // Refresh to show updated 'Invite Status' column
      // Refresh stats so the KPI cards update immediately after sending invites
      api.getUnregisteredStats().then(r => setStats(r?.data || null)).catch(() => {});
    } catch (err) {
      setToast(`❌ Failed to send invites: ${err.message || 'Unknown error'}`);
    }
    setAssigning(false);
  };

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      {activeModalCandidate && (
        <GuestUserModal 
          candidate={activeModalCandidate} 
          onClose={() => setActiveModalCandidate(null)} 
          onRefresh={load} 
        />
      )}
      
      <PageHeader
        title="👤 Guest Applicants"
        subtitle="Imported and career-page applicants without a platform account"
        action={
          <div style={{ fontSize:13, color:'#64748B', fontWeight:600 }}>
            {pagination.total} unique candidate{pagination.total !== 1 ? 's' : ''}
          </div>
        }
      />

      {/* ── INVITATION FUNNEL STATS ── */}
      {statsLoading ? (
        <div style={{ ...card, padding: '16px 24px', marginBottom: 20, display:'flex', gap:8, alignItems:'center' }}>
          <Spinner size={18} /><span style={{ color:'#94A3B8', fontSize:13 }}>Loading invitation stats…</span>
        </div>
      ) : stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:12, marginBottom:20 }}>
          {[
            { label:'Total Guests', value: stats.totalGuests, color:'#0176D3', icon:'👥', sub:'without an account' },
            { label:'Invites Sent', value: stats.totalInvited, color:'#7c3aed', icon:'📧', sub:'emails dispatched' },
            { label:'Accounts Created', value: stats.converted, color:'#10B981', icon:'✅', sub:`${stats.successRate}% success rate` },
            { label:'Awaiting Signup', value: stats.pending, color:'#F59E0B', icon:'⏳', sub:'invited, not signed up' },
            { label:'Not Invited Yet', value: stats.notInvited, color:'#EF4444', icon:'🔴', sub:'no invite sent' },
          ].map(k => (
            <div key={k.label} style={{ background:'#fff', border:`1px solid ${k.color}25`, borderRadius:14, padding:'16px 18px', cursor: k.label === 'Not Invited Yet' ? 'pointer' : 'default', transition:'all 0.2s' }}
              onClick={() => k.label === 'Not Invited Yet' && setUninvitedOnly(v => !v)}
              onMouseEnter={e => { if(k.label === 'Not Invited Yet') e.currentTarget.style.borderColor = k.color; }}
              onMouseLeave={e => { if(k.label === 'Not Invited Yet') e.currentTarget.style.borderColor = `${k.color}25`; }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ fontSize:20 }}>{k.icon}</span>
                <div style={{ fontSize: 26, fontWeight:900, color: k.color }}>{k.value.toLocaleString()}</div>
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:'#374151' }}>{k.label}</div>
              <div style={{ fontSize:11, color:'#94A3B8', marginTop:3 }}>{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Success rate progress bar */}
      {stats && stats.totalInvited > 0 && (
        <div style={{ ...card, padding:'14px 20px', marginBottom:20, display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#374151' }}>Invitation Conversion Rate</span>
              <span style={{ fontSize:13, fontWeight:900, color: stats.successRate >= 50 ? '#10B981' : stats.successRate >= 25 ? '#F59E0B' : '#EF4444' }}>{stats.successRate}% created accounts</span>
            </div>
            <div style={{ height:8, background:'#F1F5F9', borderRadius:4, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${stats.successRate}%`, background:'linear-gradient(90deg,#10B981,#059669)', borderRadius:4, transition:'width 0.6s ease' }} />
            </div>
            <div style={{ display:'flex', gap:16, marginTop:8, fontSize:11, color:'#94A3B8' }}>
              <span>✅ {stats.converted} converted</span>
              <span>⏳ {stats.pending} awaiting</span>
              <span>❌ {stats.failRate}% not converted yet</span>
            </div>
          </div>
        </div>
      )}

      {/* ── FILTER TOGGLE ── */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <button
          onClick={() => { setUninvitedOnly(false); setPage(1); }}
          style={{ padding:'8px 18px', borderRadius:20, fontSize:12, fontWeight:700, cursor:'pointer', border:'none', background: !uninvitedOnly ? '#0176D3' : '#F1F5F9', color: !uninvitedOnly ? '#fff' : '#374151', transition:'all 0.2s' }}
        >
          All Guests {!uninvitedOnly && stats ? `(${stats.totalGuests})` : ''}
        </button>
        <button
          onClick={() => { setUninvitedOnly(true); setPage(1); setSelectedCandidates(new Set()); }}
          style={{ padding:'8px 18px', borderRadius:20, fontSize:12, fontWeight:700, cursor:'pointer', border:'none', background: uninvitedOnly ? '#EF4444' : '#F1F5F9', color: uninvitedOnly ? '#fff' : '#374151', transition:'all 0.2s' }}
        >
          🔴 Not Invited Yet {uninvitedOnly && stats ? `(${stats.notInvited})` : ''}
        </button>
        {uninvitedOnly && (
          <span style={{ fontSize:12, color:'#EF4444', fontWeight:600 }}>
            Showing only candidates who have never received an invite — select all and send in bulk
          </span>
        )}
      </div>

      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', justifyContent:'space-between' }}>
        <form onSubmit={handleSearch} style={{ display:'flex', gap:10, flex:1, minWidth:300 }}>
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
            placeholder="Advanced Search (name, email, phone...)"
            style={{ ...inp, flex:1, padding:'10px 14px', fontSize:14 }} />
          <button type="submit" style={{ ...btnP, padding:'10px 20px' }}>Search</button>
          {search && (
            <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
              style={{ ...btnG, padding:'10px 16px' }}>Clear</button>
          )}
        </form>

        {selectedCandidates.size > 0 && (
          <div style={{ display:'flex', gap:10, alignItems:'center', background:'#F8FAFC', padding:'6px 12px', borderRadius:8, border:'1px solid #E2E8F0' }}>
            <span style={{ fontSize:12, fontWeight:700, color:'#0176D3' }}>{selectedCandidates.size} Selected</span>
            
            <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)} style={{ ...inp, padding:'6px 10px', fontSize:12, minWidth:150 }}>
              <option value="">-- Assign to Job --</option>
              {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
            </select>
            <button onClick={handleAssignJob} disabled={assigning || !selectedJob} style={{ ...btnP, padding:'6px 12px', fontSize:12 }}>Assign</button>
            
            <div style={{ width:1, height:20, background:'#CBD5E1', margin:'0 4px' }} />
            
            <select value={selectedRecruiter} onChange={e => setSelectedRecruiter(e.target.value)} style={{ ...inp, padding:'6px 10px', fontSize:12, minWidth:150 }}>
              <option value="">-- Assign to Recruiter --</option>
              {recruiters.map(r => <option key={r._id} value={r._id}>{r.name || r.email}</option>)}
            </select>
            <button onClick={handleAssignRecruiter} disabled={assigning || !selectedRecruiter} style={{ ...btnG, padding:'6px 12px', fontSize:12 }}>Assign</button>

            <div style={{ width:1, height:20, background:'#CBD5E1', margin:'0 4px' }} />

            <button onClick={handleInviteGuests} disabled={assigning} style={{ ...btnP, padding:'6px 12px', fontSize:12, background:'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
              {assigning ? 'Sending...' : 'Request Account Creation ✉️'}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}><Spinner /></div>
      ) : rows.length === 0 ? (
        <div style={{ ...card, textAlign:'center', padding:60, color:'#94A3B8' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>👤</div>
          <div style={{ fontWeight:700, fontSize:15 }}>{search ? 'No results found' : 'No guest applicants yet'}</div>
        </div>
      ) : (
        <div style={{ ...card, overflow:'hidden', padding:0 }}>
          <div style={{ background:'#F8FAFC', borderBottom:'1px solid #E2E8F0', display:'grid', gridTemplateColumns:'40px 2fr 1.5fr 1fr 1fr 1fr', gap:0 }}>
            <div style={{ padding:'12px 14px', display:'flex', alignItems:'center' }}>
              <input type="checkbox" checked={selectedCandidates.size === rows.length && rows.length > 0} onChange={toggleSelectAll} style={{ width:16, height:16, cursor:'pointer' }} />
            </div>
            {['Candidate','Email / Phone','Title / Company','Jobs','Invite Status'].map(h => (
              <div key={h} style={{ padding:'12px 14px', fontSize:11, fontWeight:800, color:'#475569', textTransform:'uppercase', letterSpacing:0.8 }}>{h}</div>
            ))}
          </div>

          {rows.map(row => {
            const inviteSent = row.accountInviteSentAt || row.accountRequestSent;
            const inviteDate = row.accountInviteSentAt ? new Date(row.accountInviteSentAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short' }) : null;
            return (
            <div key={row.email} style={{ borderBottom:'1px solid #F1F5F9', display:'grid', gridTemplateColumns:'40px 2fr 1.5fr 1fr 1fr 1fr', gap:0, transition:'background 0.15s' }}
                 onMouseEnter={e => e.currentTarget.style.background='#F8FAFC'}
                 onMouseLeave={e => e.currentTarget.style.background=''}>

              <div style={{ padding:'12px 14px', display:'flex', alignItems:'center' }}>
                <input type="checkbox" checked={selectedCandidates.has(row.email)} onChange={() => toggleSelect(row.email)} style={{ width:16, height:16, cursor:'pointer' }} />
              </div>

              {/* Clickable row for modal */}
              <div style={{ padding:'12px 14px', cursor:'pointer' }} onClick={() => setActiveModalCandidate(row)}>
                <div style={{ fontWeight:800, fontSize:13, color:'#0A1628' }}>{row.name || '—'}</div>
                <div style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>{row.source === 'career_page' ? '🌐 Career Page' : row.source || 'Guest'}</div>
              </div>

              <div style={{ padding:'12px 14px', cursor:'pointer' }} onClick={() => setActiveModalCandidate(row)}>
                <div style={{ fontSize:12, color:'#374151' }}>{row.email}</div>
                <div style={{ fontSize:12, color:'#64748B', marginTop:2 }}>{row.phone || '—'}</div>
              </div>

              <div style={{ padding:'12px 14px', cursor:'pointer' }} onClick={() => setActiveModalCandidate(row)}>
                <div style={{ fontSize:12, color:'#374151' }}>{row.title || '—'}</div>
                <div style={{ fontSize:11, color:'#64748B', marginTop:2 }}>{row.currentCompany || '—'}</div>
              </div>

              <div style={{ padding:'12px 14px', cursor:'pointer' }} onClick={() => setActiveModalCandidate(row)}>
                <span style={{ background:'rgba(1,118,211,0.1)', color:'#0176D3', fontWeight:800, fontSize:12, padding:'3px 10px', borderRadius:20 }}>
                  {row.jobCount} job{row.jobCount !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Invite status column */}
              <div style={{ padding:'12px 14px', display:'flex', alignItems:'center' }}>
                {inviteSent ? (
                  <div>
                    <span style={{ background:'rgba(16,185,129,0.1)', color:'#059669', fontWeight:700, fontSize:10, padding:'3px 8px', borderRadius:20, display:'block', textAlign:'center' }}>
                      📧 Invited
                    </span>
                    {inviteDate && <div style={{ fontSize:10, color:'#94A3B8', marginTop:3, textAlign:'center' }}>{inviteDate}</div>}
                  </div>
                ) : (
                  <span style={{ background:'rgba(245,158,11,0.1)', color:'#A07E00', fontWeight:700, fontSize:10, padding:'3px 8px', borderRadius:20 }}>
                    ⏳ Not Invited
                  </span>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {pagination.pages > 1 && (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:12, marginTop:20 }}>
          <button onClick={() => setPage(p => p - 1)} disabled={page === 1} style={{ ...btnG, padding:'8px 16px', opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
          <span style={{ fontSize:13, color:'#64748B' }}>Page {page} of {pagination.pages} · {pagination.total} total</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.pages} style={{ ...btnG, padding:'8px 16px', opacity: page >= pagination.pages ? 0.4 : 1 }}>Next →</button>
        </div>
      )}
    </div>
  );
}
