import React, { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import Field from '../../components/ui/Field.jsx';
import FormRow from '../../components/ui/FormRow.jsx';
import Toast from '../../components/ui/Toast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { btnP, btnG } from '../../constants/styles.js';

const EMPTY_USER = { name: '', email: '', role: 'recruiter', tenantId: '' };

/**
 * Dedicated page for Provisioning a new Platform User.
 * Route: /app/forms/provision (Admin, Super Admin)
 */
export default function ProvisionUserPage({ user, onBack, onSuccess }) {
  const [form, setForm] = useState(EMPTY_USER);
  const [orgs, setOrgs] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    // Admins only provision for their own org
    if (user.role === 'admin') {
      sf('tenantId', user.orgId);
      setLoadingOrgs(false);
    } else {
      // Super Admins can choose the org
      api.getOrgs().then(data => {
        setOrgs(Array.isArray(data) ? data : []);
        setLoadingOrgs(false);
      }).catch(() => setLoadingOrgs(false));
    }
  }, [user]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!form.name || !form.email || !form.tenantId) { 
      setToast('❌ Name, email, and organisation are required'); 
      return; 
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { 
      setToast('❌ Please enter a valid email address'); 
      return; 
    }

    setSaving(true);
    try {
      await api.createUser({ 
        name: form.name, 
        email: form.email, 
        role: form.role, 
        tenantId: form.tenantId 
      });
      setToast(`✅ Invitation email sent successfully to ${form.email}`);
      setTimeout(() => { if (onSuccess) onSuccess(); else if (onBack) onBack(); }, 1500);
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
          ← Back
        </button>
      </div>

      <PageHeader 
        title="🔑 Provision New User" 
        subtitle="Create an account and send a secure invitation link to a new team member." 
      />

      <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #DDDBDA', borderRadius: 16, padding: '32px', marginTop: 24, display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        
        <FormRow cols={2}>
           <Field label="Full Name" required value={form.name} onChange={v => sf('name', v)} placeholder="Priya Sharma" />
           <Field label="Work Email" required type="email" value={form.email} onChange={v => sf('email', v)} placeholder="priya@company.com" />
        </FormRow>

        <FormRow cols={2}>
           <Field 
             label="Platform Role" 
             required 
             value={form.role} 
             onChange={v => sf('role', v)}
             options={[
               {value:'recruiter', label:'Recruiter (Standard Access)'},
               {value:'admin', label:'Admin (Company Manager)'},
               {value:'hiring_manager', label:'Hiring Manager (Review only)'},
               {value:'candidate', label:'Candidate (Limited Access)'}
             ]} 
           />
           
           {user.role === 'super_admin' ? (
             <Field 
               label="Assign to Organisation" 
               required 
               value={form.tenantId} 
               onChange={v => sf('tenantId', v)}
               loading={loadingOrgs}
               options={orgs.map(o => ({ value: String(o.id || o._id), label: o.name }))}
               placeholder="Select company..."
             />
           ) : (
             <div style={{ padding: '8px 12px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0', marginTop: 24 }}>
                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Account Entity</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0176D3' }}>{user.orgName || 'Current Organisation'}</div>
             </div>
           )}
        </FormRow>

        <div style={{ padding: '16px', background: 'rgba(1,118,211,0.04)', borderRadius: 12, border: '1px solid rgba(1,118,211,0.1)' }}>
           <p style={{ margin: 0, fontSize: 13, color: '#3E3E3C', lineHeight: 1.5 }}>
             <strong>What happens next?</strong> After you provision this account, the user will receive a professional-grade invitation email with a secure link to set their password and complete their profile onboarding.
           </p>
        </div>

        <div style={{ padding: '24px 0 0', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onBack} style={btnG}>Cancel</button>
          <button type="submit" disabled={saving} style={{ ...btnP, minWidth: 160, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Provisioning...' : '✓ Provision Account'}
          </button>
        </div>
      </form>
    </div>
  );
}
