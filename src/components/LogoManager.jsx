import React, { useState, useRef } from 'react';
import { useLogo } from '../context/LogoContext.jsx';
import Logo from './Logo.jsx';
import { api } from '../api/api.js';

export default function LogoManager() {
  const { customLogoUrl, updateLogo } = useLogo();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [progress, setProgress]     = useState(0);
  const [dragOver, setDragOver]     = useState(false);
  const [error, setError]           = useState('');
  const [toast, setToast]           = useState('');
  const fileRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (!allowed.includes(file.type)) return setError('Please upload PNG, JPG, SVG, or WebP only.');
    if (file.size > 2 * 1024 * 1024) return setError('File must be under 2MB.');
    setError('');

    // Instant preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target.result);
    reader.readAsDataURL(file);

    setUploading(true); setProgress(0);
    const iv = setInterval(() => setProgress(p => Math.min(p + 12, 85)), 120);
    try {
      const reader2 = new FileReader();
      const base64 = await new Promise((res) => { reader2.onload = (e) => res(e.target.result); reader2.readAsDataURL(file); });
      const data = await api.uploadOrgLogo(base64);
      clearInterval(iv); setProgress(100);
      updateLogo(data.logoUrl);
      setPreviewUrl(null);
      setToast('Logo updated successfully!');
      setTimeout(() => { setToast(''); setProgress(0); }, 3000);
    } catch (e) {
      clearInterval(iv);
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset to the default TalentNest HR logo?')) return;
    try {
      await api.deleteOrgLogo();
      updateLogo(null);
      setToast('Reset to default logo.');
      setTimeout(() => setToast(''), 3000);
    } catch (e) { setError(e.message); }
  };

  const downloadAsPng = () => {
    const url = previewUrl || customLogoUrl || '/logo.svg';
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth || 400;
      const h = img.naturalHeight || 200;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'talentnesthr-logo.png';
      a.click();
    };
    img.onerror = () => {
      // fallback: direct download
      const a = document.createElement('a');
      a.href = url; a.download = 'talentnesthr-logo.png'; a.click();
    };
    img.src = url;
  };

  const card = { background: '#fff', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 16, padding: 24 };
  const activeUrl = previewUrl || customLogoUrl;

  return (
    <div style={card}>
      <h3 style={{ color: '#0F2B6B', fontSize: 16, fontWeight: 800, margin: '0 0 20px' }}>Logo &amp; Branding</h3>

      {toast && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', color: '#166534', fontSize: 13, marginBottom: 16 }}>
          {toast}
        </div>
      )}

      {/* Preview strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, background: '#032D60', borderRadius: 10, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Logo size="md" variant="full" theme="dark" customLogoUrl={activeUrl} />
        </div>
        <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Logo size="md" variant="full" theme="light" customLogoUrl={activeUrl} />
        </div>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <Logo size="md" variant="icon" theme="light" customLogoUrl={activeUrl} />
          <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>ICON</span>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => fileRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        style={{
          border: `2px dashed ${dragOver ? '#1B4FD8' : '#cbd5e1'}`,
          borderRadius: 10, padding: '28px 20px', textAlign: 'center',
          cursor: 'pointer', marginBottom: 14, transition: 'all 0.2s',
          background: dragOver ? 'rgba(27,79,216,0.04)' : '#f8fafc',
        }}
      >
        {activeUrl ? (
          <img src={activeUrl} alt="preview" style={{ height: 48, objectFit: 'contain', marginBottom: 8 }} />
        ) : (
          <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
        )}
        <div style={{ color: '#64748b', fontSize: 13 }}>Drag &amp; drop or click to upload</div>
        <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>PNG, JPG, SVG, WebP — max 2MB · Recommended: 400×200px</div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
      </div>

      {/* Progress */}
      {(uploading || progress > 0) && (
        <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: '#1B4FD8', borderRadius: 2, transition: 'width 0.15s ease' }} />
        </div>
      )}

      {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={() => fileRef.current.click()}
          disabled={uploading}
          style={{ padding: '9px 18px', background: 'linear-gradient(135deg,#1B4FD8,#0F2B6B)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1 }}
        >
          {uploading ? `Uploading… ${progress}%` : 'Upload Logo'}
        </button>
        <button
          onClick={downloadAsPng}
          style={{ padding: '9px 18px', background: '#f1f5f9', color: '#0F2B6B', border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          ⬇️ Download PNG
        </button>
        {customLogoUrl && (
          <button
            onClick={handleReset}
            style={{ padding: '9px 18px', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            Reset to Default
          </button>
        )}
      </div>
    </div>
  );
}
