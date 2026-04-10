import React, { useState } from 'react';
import { api } from '../../api/api.js';
import Field from '../../components/ui/Field.jsx';
import FormRow from '../../components/ui/FormRow.jsx';
import Toast from '../../components/ui/Toast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { btnP, btnG } from '../../constants/styles.js';

const EMPTY_FORM = { name: '', domain: '', industry: '', size: '1-10', plan: 'trial', logo: '' };

/**
 * Dedicated page for Creating a new Organisation.
 * Route: /app/forms/create-org (Super Admin only)
 */
export default function CreateOrganisationPage({ user, onBack, onSuccess }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!form.name) { setToast('❌ Organisation name is required'); return; }
    setSaving(true);
    try {
      await api.createOrg(form);
      setToast('✅ Organisation created successfully!');
      setTimeout(() => { if (onSuccess) onSuccess(); else if (onBack) onBack(); }, 1200);
    } catch (e) {
      setToast(`❌ ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', animation: 'tn-fadein 0.3s ease both' }}>
      <Toast msg={toast} onClose={() => setToast('')} />
      
      <div style={{ marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#0176D3', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: 0 }}>
          ← Organisations List
        </button>
      </div>

      <PageHeader 
        title="🏢 Create New Organisation" 
        subtitle="Provision a new tenant environment and define core business parameters." 
      />

      <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #DDDBDA', borderRadius: 16, padding: '32px', marginTop: 24, display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 200px', gap: 20 }}>
             <Field label="Organisation Name" required value={form.name} onChange={v => sf('name', v)} placeholder="e.g. Acme Technologies" />
             <Field label="Domain (Optional)" value={form.domain} onChange={v => sf('domain', v)} placeholder="e.g. acme.com" hint="Scopes data access" />
        </div>

        <Field label="Logo URL" value={form.logo} onChange={v => sf('logo', v)} placeholder="https://company.com/logo.png" />
        {form.logo && (
          <div style={{ padding: 12, border: '1px dashed #DDD', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
             <img src={form.logo} alt="Preview" style={{ height: 40, width: 40, objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
             <span style={{ fontSize: 11, color: '#666' }}>Logo Preview</span>
          </div>
        )}

        <FormRow cols={2}>
           <Field label="Industry" value={form.industry} onChange={v => sf('industry', v)} placeholder="Information Technology" />
           <Field label="Company Size" value={form.size} onChange={v => sf('size', v)}
                  options={['1-10','11-50','51-200','201-500','500+'].map(s => ({value:s,label:`${s} Employees`}))} placeholder="Select size" />
        </FormRow>

        <Field label="Initial Plan" value={form.plan} onChange={v => sf('plan', v)}
                options={[{value:'trial',label:'Trial (14 days)'},{value:'starter',label:'Starter'},{value:'growth',label:'Growth'},{value:'enterprise',label:'Enterprise'}]} />

        <div style={{ padding: '24px 0 0', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onBack} style={btnG}>Cancel</button>
          <button type="submit" disabled={saving} style={{ ...btnP, minWidth: 160, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Creating Org...' : '🏢 Create Organisation'}
          </button>
        </div>
      </form>
    </div>
  );
}
