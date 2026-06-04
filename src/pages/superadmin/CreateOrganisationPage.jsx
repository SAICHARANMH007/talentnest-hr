import React, { useState, useRef } from 'react';
import { api } from '../../api/api.js';
import Field from '../../components/ui/Field.jsx';
import FormRow from '../../components/ui/FormRow.jsx';
import Toast from '../../components/ui/Toast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { btnP, btnG } from '../../constants/styles.js';

const EMPTY_FORM = {
  // Basic
  name: '', domain: '', industry: '', size: '1-10', plan: 'trial', logo: '',
  // Identity
  tagline: '', website: '', foundedYear: '', description: '',
  // Products/Services
  productsServices: '',
  // Location
  hqCity: '', hqCountry: 'India', hqAddress: '',
  // Culture & People
  employeeCount: '', cultureNotes: '', successStories: '',
  // Social
  linkedinUrl: '', twitterUrl: '',
  // Photos (comma-separated URLs)
  officePhotos: '',
};

const SECTION = ({ title, icon, children }) => (
  <div style={{ marginBottom: 24 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 10, borderBottom: '2px solid #F1F5F9' }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontWeight: 800, fontSize: 15, color: '#0A1628' }}>{title}</span>
    </div>
    {children}
  </div>
);

export default function CreateOrganisationPage({ user, onBack, onSuccess }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [section, setSection] = useState('basic'); // basic | details | culture | media
  const photoRef = useRef(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const r = await api.uploadFeedImage(fd);
      if (r?.url) {
        const existing = form.officePhotos ? form.officePhotos.split(',').map(u => u.trim()).filter(Boolean) : [];
        if (existing.length < 6) sf('officePhotos', [...existing, r.url].join(', '));
      }
    } catch { setToast('❌ Photo upload failed — check server config'); }
    setUploadingPhoto(false);
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!form.name) { setToast('❌ Organisation name is required'); return; }
    setSaving(true);
    try {
      const photos = form.officePhotos ? form.officePhotos.split(',').map(u => u.trim()).filter(Boolean) : [];
      await api.createOrg({ ...form, officePhotos: photos });
      setToast('✅ Organisation created successfully!');
      setTimeout(() => { if (onSuccess) onSuccess(); else if (onBack) onBack(); }, 1200);
    } catch (ex) {
      setToast(`❌ ${ex.message}`);
    } finally {
      setSaving(false);
    }
  };

  const TABS = [
    { id: 'basic',   label: '🏢 Basic Info' },
    { id: 'details', label: '📋 Company Details' },
    { id: 'culture', label: '🌱 Culture & People' },
    { id: 'media',   label: '📸 Media & Links' },
  ];

  const photos = form.officePhotos ? form.officePhotos.split(',').map(u => u.trim()).filter(Boolean) : [];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', animation: 'tn-fadein 0.3s ease both' }}>
      <Toast msg={toast} onClose={() => setToast('')} />

      <div style={{ marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#0176D3', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: 0 }}>
          ← Organisations List
        </button>
      </div>

      <PageHeader
        title="🏢 Create New Organisation"
        subtitle="Add a new company to TalentNest — the more details you fill, the better candidates understand the company."
      />

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 2, marginTop: 20, marginBottom: 0, borderBottom: '2px solid #F1F5F9', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setSection(t.id)}
            style={{ padding: '10px 16px', border: 'none', background: 'none', fontSize: 12, fontWeight: section === t.id ? 800 : 500, color: section === t.id ? '#0176D3' : '#6B7280', cursor: 'pointer', borderBottom: section === t.id ? '2px solid #0176D3' : '2px solid transparent', marginBottom: -2, whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '0 0 16px 16px', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>

        {/* ── Basic Info ── */}
        {section === 'basic' && (
          <>
            <SECTION title="Identity" icon="🏷️">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <Field label="Organisation Name *" required value={form.name} onChange={v => sf('name', v)} placeholder="e.g. Acme Technologies Pvt Ltd" />
                <Field label="Tagline" value={form.tagline} onChange={v => sf('tagline', v)} placeholder="e.g. Building the future of work" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <Field label="Domain (Optional)" value={form.domain} onChange={v => sf('domain', v)} placeholder="acme.com" hint="Scopes data access to this domain" />
                <Field label="Website URL" value={form.website} onChange={v => sf('website', v)} placeholder="https://acme.com" />
              </div>
              <Field label="Logo URL" value={form.logo} onChange={v => sf('logo', v)} placeholder="https://company.com/logo.png" />
              {form.logo && (
                <div style={{ marginTop: 10, padding: 12, border: '1px dashed #DDD', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img src={form.logo} alt="Preview" style={{ height: 48, width: 48, objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
                  <span style={{ fontSize: 11, color: '#666' }}>Logo Preview</span>
                </div>
              )}
            </SECTION>

            <SECTION title="Organisation Setup" icon="⚙️">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <Field label="Industry" value={form.industry} onChange={v => sf('industry', v)} placeholder="Information Technology" />
                <Field label="Company Size" value={form.size} onChange={v => sf('size', v)}
                  options={['1-10','11-50','51-200','201-500','501-1000','1000+'].map(s => ({ value: s, label: `${s} Employees` }))} />
                <Field label="Initial Plan" value={form.plan} onChange={v => sf('plan', v)}
                  options={[{ value: 'trial', label: 'Trial (14 days)' }, { value: 'starter', label: 'Starter' }, { value: 'growth', label: 'Growth' }, { value: 'enterprise', label: 'Enterprise' }]} />
              </div>
            </SECTION>
          </>
        )}

        {/* ── Company Details ── */}
        {section === 'details' && (
          <>
            <SECTION title="About the Company" icon="📋">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <Field label="Founded Year" value={form.foundedYear} onChange={v => sf('foundedYear', v)} placeholder="e.g. 2015" type="number" />
                <Field label="Total Employee Count" value={form.employeeCount} onChange={v => sf('employeeCount', v)} placeholder="e.g. 250" type="number" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Company Description</label>
                <textarea value={form.description} onChange={e => sf('description', e.target.value)}
                  placeholder="Tell candidates what this company does, its mission, and what makes it unique…"
                  rows={4} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #D1D5DB', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.6 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Products & Services</label>
                <textarea value={form.productsServices} onChange={e => sf('productsServices', e.target.value)}
                  placeholder="List the key products or services this company offers…"
                  rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #D1D5DB', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.6 }} />
              </div>
            </SECTION>

            <SECTION title="Headquarters & Location" icon="📍">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <Field label="HQ City" value={form.hqCity} onChange={v => sf('hqCity', v)} placeholder="e.g. Bangalore" />
                <Field label="Country" value={form.hqCountry} onChange={v => sf('hqCountry', v)} placeholder="e.g. India" />
              </div>
              <Field label="Full Address" value={form.hqAddress} onChange={v => sf('hqAddress', v)} placeholder="e.g. 4th Floor, Tech Park, MG Road, Bangalore 560001" />
            </SECTION>
          </>
        )}

        {/* ── Culture & People ── */}
        {section === 'culture' && (
          <>
            <SECTION title="Company Culture" icon="🌱">
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Culture & Work Environment</label>
                <textarea value={form.cultureNotes} onChange={e => sf('cultureNotes', e.target.value)}
                  placeholder="Describe the work culture — remote/hybrid/office, team atmosphere, growth opportunities, perks, work-life balance, values…"
                  rows={4} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #D1D5DB', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.6 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Success Stories & Milestones</label>
                <textarea value={form.successStories} onChange={e => sf('successStories', e.target.value)}
                  placeholder="Share company achievements, funding rounds, awards, notable clients, product launches, employee growth milestones…"
                  rows={4} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #D1D5DB', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.6 }} />
              </div>
            </SECTION>
          </>
        )}

        {/* ── Media & Links ── */}
        {section === 'media' && (
          <>
            <SECTION title="Social Links" icon="🔗">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="LinkedIn Page URL" value={form.linkedinUrl} onChange={v => sf('linkedinUrl', v)} placeholder="https://linkedin.com/company/acme" />
                <Field label="Twitter / X URL" value={form.twitterUrl} onChange={v => sf('twitterUrl', v)} placeholder="https://twitter.com/acme" />
              </div>
            </SECTION>

            <SECTION title="Office Photos" icon="📸">
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 0, marginBottom: 12 }}>Upload up to 6 office/team photos. These show candidates the work environment.</p>
              <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {photos.map((url, i) => (
                  <div key={i} style={{ position: 'relative', width: 110, height: 80, borderRadius: 10, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => sf('officePhotos', photos.filter((_, idx) => idx !== i).join(', '))}
                      style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', width: 20, height: 20, borderRadius: '50%', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                ))}
                {photos.length < 6 && (
                  <button type="button" onClick={() => photoRef.current?.click()} disabled={uploadingPhoto}
                    style={{ width: 110, height: 80, borderRadius: 10, border: '2px dashed #D1D5DB', background: '#F9FAFB', color: '#9CA3AF', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 24, gap: 4 }}>
                    {uploadingPhoto ? <span style={{ fontSize: 12, color: '#0176D3' }}>Uploading…</span> : <>+<span style={{ fontSize: 10 }}>Add Photo</span></>}
                  </button>
                )}
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#9CA3AF', display: 'block', marginBottom: 4 }}>Or paste photo URLs (comma-separated)</label>
                <textarea value={form.officePhotos} onChange={e => sf('officePhotos', e.target.value)}
                  placeholder="https://img1.jpg, https://img2.jpg"
                  rows={2} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 12, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            </SECTION>
          </>
        )}

        <div style={{ padding: '20px 0 0', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {TABS.findIndex(t => t.id === section) > 0 && (
              <button type="button" onClick={() => setSection(TABS[TABS.findIndex(t => t.id === section) - 1].id)} style={btnG}>← Previous</button>
            )}
            {TABS.findIndex(t => t.id === section) < TABS.length - 1 && (
              <button type="button" onClick={() => setSection(TABS[TABS.findIndex(t => t.id === section) + 1].id)} style={{ ...btnP, background: '#0176D3' }}>Next →</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onBack} style={btnG}>Cancel</button>
            <button type="submit" disabled={saving} style={{ ...btnP, minWidth: 160, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Creating…' : '🏢 Create Organisation'}
            </button>
          </div>
        </div>
      </form>
      <style>{`@keyframes tn-fadein { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }`}</style>
    </div>
  );
}
