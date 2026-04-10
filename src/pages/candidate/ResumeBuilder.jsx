import { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import PageHeader from '../../components/ui/PageHeader.jsx';

const TEMPLATES = {
  modern: {
    label: 'Modern',
    style: {
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      background: '#fff',
      color: '#111',
      padding: 'clamp(24px, 4vw, 48px)',
      maxWidth: 'min(780px, 100%)',
    },
    accentColor: '#0176D3',
  },
  classic: {
    label: 'Classic',
    style: {
      fontFamily: 'Georgia, serif',
      background: '#fff',
      color: '#222',
      padding: 'clamp(24px, 4vw, 48px)',
      maxWidth: 'min(780px, 100%)',
    },
    accentColor: '#1a1a1a',
  },
  minimal: {
    label: 'Minimal',
    style: {
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      background: '#f9f9f9',
      color: '#333',
      padding: 'clamp(24px, 4vw, 48px)',
      maxWidth: 'min(780px, 100%)',
    },
    accentColor: '#444',
  },
};

export default function ResumeBuilder({ user }) {
  const [template, setTemplate] = useState('modern');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    title: '',
    summary: '',
    skills: '',
    experience: '',
    education: '',
    linkedinUrl: '',
    portfolioUrl: '',
  });

  useEffect(() => {
    api.getProfile().then(u => {
      setForm({
        name: u.name || '',
        email: u.email || '',
        phone: u.phone || '',
        location: u.location || '',
        title: u.title || '',
        summary: u.summary || '',
        skills: Array.isArray(u.skills)
          ? u.skills.join(', ')
          : (u.skills || ''),
        experience: u.experience ? `${u.experience} years` : '',
        education: u.education || '',
        linkedinUrl: u.linkedinUrl || '',
        portfolioUrl: u.portfolioUrl || '',
      });
    }).catch(() => {});
  }, []);

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const tpl = TEMPLATES[template];
  const accent = tpl.accentColor;

  const downloadPDF = () => {
    const content = document.getElementById('resume-preview').innerHTML;
    const w = window.open('', '_blank');
    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${form.name} — Resume</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { ${Object.entries(tpl.style).map(([k,v]) => {
            const prop = k.replace(/([A-Z])/g, '-$1').toLowerCase();
            const val  = typeof v === 'number' ? v + 'px' : v;
            return `${prop}:${val}`;
          }).join(';')} }
          @media print { .no-print { display: none !important; } }
        </style>
      </head>
      <body>
        ${content}
        <script>window.onload = () => { window.print(); window.close(); }</script>
      </body>
      </html>
    `);
    w.document.close();
  };

  const saveToProfile = async () => {
    setSaving(true);
    try {
      await api.updateProfile({
        phone: form.phone,
        location: form.location,
        title: form.title,
        summary: form.summary,
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
        education: form.education,
        linkedinUrl: form.linkedinUrl,
        portfolioUrl: form.portfolioUrl,
      });
      setToast('✅ Profile updated!');
      setTimeout(() => setToast(''), 3000);
    } catch (e) {
      setToast('❌ ' + (e.message || 'Save failed'));
      setTimeout(() => setToast(''), 3000);
    }
    setSaving(false);
  };

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    border: '1.5px solid #E2E8F0',
    borderRadius: 8,
    fontSize: 13,
    fontFamily: 'inherit',
    background: '#fff',
    color: '#111',
    outline: 'none',
    boxSizing: 'border-box',
    marginTop: 4,
  };

  const labelStyle = {
    fontSize: 12,
    fontWeight: 600,
    color: '#475569',
    display: 'block',
    marginTop: 12,
  };

  return (
    <div style={{ padding: '0 0 60px' }}>
      <PageHeader
        title="Resume Builder"
        subtitle="Build and download your professional resume"
      />

      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.startsWith('✅') ? '#10b981' : '#ef4444',
          color: '#fff', padding: '10px 20px', borderRadius: 10,
          fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}>{toast}</div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 360px) minmax(0, 1fr)',
        gap: 24,
        alignItems: 'flex-start',
      }}>

        {/* LEFT — Edit Panel */}
        <div style={{
          background: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          padding: 24,
        }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 10 }}>
              Template
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(TEMPLATES).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => setTemplate(key)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12,
                    fontWeight: 600, cursor: 'pointer', border: '2px solid',
                    borderColor: template === key ? '#0176D3' : '#E2E8F0',
                    background: template === key ? '#EFF8FF' : '#fff',
                    color: template === key ? '#0176D3' : '#64748B',
                    transition: 'all 0.15s',
                  }}
                >{t.label}</button>
              ))}
            </div>
          </div>

          <label style={labelStyle}>Full Name</label>
          <input style={inputStyle} value={form.name} onChange={e => sf('name', e.target.value)} placeholder="Sai Charan" />

          <label style={labelStyle}>Job Title</label>
          <input style={inputStyle} value={form.title} onChange={e => sf('title', e.target.value)} placeholder="HR Consultant / Founder" />

          <label style={labelStyle}>Email</label>
          <input style={inputStyle} value={form.email} onChange={e => sf('email', e.target.value)} placeholder="you@talentnesthr.com" />

          <label style={labelStyle}>Phone</label>
          <input style={inputStyle} value={form.phone} onChange={e => sf('phone', e.target.value)} placeholder="+91 79955 35539" />

          <label style={labelStyle}>Location</label>
          <input style={inputStyle} value={form.location} onChange={e => sf('location', e.target.value)} placeholder="Hyderabad, India" />

          <label style={labelStyle}>LinkedIn URL</label>
          <input style={inputStyle} value={form.linkedinUrl} onChange={e => sf('linkedinUrl', e.target.value)} placeholder="linkedin.com/in/..." />

          <label style={labelStyle}>Portfolio URL</label>
          <input style={inputStyle} value={form.portfolioUrl} onChange={e => sf('portfolioUrl', e.target.value)} placeholder="github.com/..." />

          <label style={labelStyle}>Professional Summary</label>
          <textarea
            style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
            value={form.summary}
            onChange={e => sf('summary', e.target.value)}
            placeholder="Brief summary of your experience and goals..."
          />

          <label style={labelStyle}>Skills (comma separated)</label>
          <input style={inputStyle} value={form.skills} onChange={e => sf('skills', e.target.value)} placeholder="React, Node.js, MongoDB..." />

          <label style={labelStyle}>Experience</label>
          <input style={inputStyle} value={form.experience} onChange={e => sf('experience', e.target.value)} placeholder="5 years in IT Staffing..." />

          <label style={labelStyle}>Education</label>
          <input style={inputStyle} value={form.education} onChange={e => sf('education', e.target.value)} placeholder="B.Tech, JNTU Hyderabad, 2018" />

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button
              onClick={saveToProfile}
              disabled={saving}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13,
                fontWeight: 700, cursor: 'pointer', border: 'none',
                background: '#E8F0FE', color: '#0176D3',
              }}
            >{saving ? 'Saving…' : '💾 Save to Profile'}</button>
            <button
              onClick={downloadPDF}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13,
                fontWeight: 700, cursor: 'pointer', border: 'none',
                background: '#0176D3', color: '#fff',
              }}
            >📄 Download PDF</button>
          </div>
        </div>

        {/* RIGHT — Live Preview */}
        <div style={{
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}>
          <div style={{
            background: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            padding: '10px 20px',
            fontSize: 12,
            color: '#94A3B8',
            fontWeight: 600,
          }}>LIVE PREVIEW</div>

          <div id="resume-preview" style={{ ...tpl.style, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ borderBottom: `3px solid ${accent}`, paddingBottom: 20, marginBottom: 20 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: accent, margin: 0 }}>
                {form.name || 'Your Name'}
              </h1>
              {form.title && (
                <div style={{ fontSize: 15, color: '#555', marginTop: 4 }}>{form.title}</div>
              )}
              <div style={{ fontSize: 13, color: '#777', marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {form.email && <span>✉ {form.email}</span>}
                {form.phone && <span>📞 {form.phone}</span>}
                {form.location && <span>📍 {form.location}</span>}
                {form.linkedinUrl && <span>🔗 {form.linkedinUrl}</span>}
              </div>
            </div>

            {/* Summary */}
            {form.summary && (
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Professional Summary
                </h2>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: '#444' }}>{form.summary}</p>
              </div>
            )}

            {/* Skills */}
            {form.skills && (
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Skills
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {form.skills.split(',').filter(Boolean).map((s, i) => (
                    <span key={i} style={{
                      background: `${accent}15`, color: accent,
                      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    }}>{s.trim()}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Experience */}
            {form.experience && (
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Experience
                </h2>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: '#444' }}>{form.experience}</p>
              </div>
            )}

            {/* Education */}
            {form.education && (
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Education
                </h2>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: '#444' }}>{form.education}</p>
              </div>
            )}

            {/* Portfolio */}
            {form.portfolioUrl && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid #eee` }}>
                <span style={{ fontSize: 12, color: '#777' }}>Portfolio: {form.portfolioUrl}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
