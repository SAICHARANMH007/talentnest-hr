import { useState, useEffect } from 'react';
import Modal from '../ui/Modal.jsx';
import { btnP, btnG } from '../../constants/styles.js';
import { api } from '../../api/api.js';
import Field from '../ui/Field.jsx';

const SMTP_PRESETS = {
  zoho:    { label: 'Zoho',    icon: '📮', host: 'smtppro.zoho.in',   port: 587 },
  gmail:   { label: 'Gmail',   icon: '📧', host: 'smtp.gmail.com',     port: 587 },
  outlook: { label: 'Outlook', icon: '📨', host: 'smtp.office365.com', port: 587 },
  custom:  { label: 'Custom',  icon: '⚙️', host: '',                   port: 587 },
};

export default function EmailSettingsModal({ user, onClose }) {
  const [tab,       setTab]       = useState('resend');   // 'resend' | 'smtp'

  // Resend fields
  const [fromName,  setFromName]  = useState(user.name || '');
  const [fromEmail, setFromEmail] = useState('hr@talentnesthr.com');
  const [ownKey,    setOwnKey]    = useState('');
  const [showOwnKey, setShowOwnKey] = useState(false);
  const [showKeyField, setShowKeyField] = useState(false);
  const [hasOwnKey, setHasOwnKey] = useState(false); // user already has a personal API key saved

  // SMTP fields
  const [smtpPreset, setSmtpPreset] = useState('zoho');
  const [smtpHost,   setSmtpHost]   = useState('smtppro.zoho.in');
  const [smtpPort,   setSmtpPort]   = useState(587);
  const [smtpUser,   setSmtpUser]   = useState(user.email || '');
  const [smtpPass,   setSmtpPass]   = useState('');
  const [showPass,   setShowPass]   = useState(false);

  // Shared
  const [saving,    setSaving]    = useState(false);
  const [testing,   setTesting]   = useState(false);
  const [toast,     setToast]     = useState('');
  const [hasConfig, setHasConfig] = useState(false);
  const [savedProvider, setSavedProvider] = useState('');

  useEffect(() => {
    api.getUser(user.id || user._id).then(u => {
      if (!u.emailConfig) return;
      setHasConfig(true);
      setSavedProvider(u.emailConfig.provider || '');
      if (u.emailConfig.provider === 'resend') {
        setTab('resend');
        if (u.emailConfig.user) setFromEmail(u.emailConfig.user);
        if (u.emailConfig.name) setFromName(u.emailConfig.name);
        setHasOwnKey(!!u.emailConfig.hasOwnKey);
        setShowKeyField(false);
      } else if (u.emailConfig.host) {
        setTab('smtp');
        setSmtpHost(u.emailConfig.host || '');
        setSmtpPort(u.emailConfig.port || 587);
        setSmtpUser(u.emailConfig.user || '');
        const h = u.emailConfig.host || '';
        if (h.includes('zoho'))                               setSmtpPreset('zoho');
        else if (h.includes('gmail'))                         setSmtpPreset('gmail');
        else if (h.includes('office') || h.includes('outlook')) setSmtpPreset('outlook');
        else                                                  setSmtpPreset('custom');
      }
    }).catch(() => {});
  }, [user.id]);

  const applySmtpPreset = (key) => {
    setSmtpPreset(key);
    setSmtpHost(SMTP_PRESETS[key].host);
    setSmtpPort(SMTP_PRESETS[key].port);
  };

  const canTest = tab === 'resend'
    ? !!fromEmail.trim()
    : !!(smtpHost && smtpUser && smtpPass);

  const canSave = tab === 'resend'
    ? !!fromEmail.trim()
    : !!(smtpHost && smtpUser && (smtpPass || hasConfig));

  const handleTest = async () => {
    setTesting(true); setToast('');
    try {
      if (tab === 'resend') {
        await api.testSmtp(null, null, fromEmail, null, 'resend', ownKey || undefined);
        setToast('✅ Test email sent to ' + fromEmail + ' — check your inbox!');
      } else {
        await api.testSmtp(smtpHost, smtpPort, smtpUser, smtpPass);
        setToast('✅ SMTP connection successful!');
      }
    } catch (e) { setToast('❌ ' + e.message); }
    finally { setTesting(false); }
  };

  const handleSave = async () => {
    setSaving(true); setToast('');
    try {
      const emailConfig = tab === 'resend'
        ? { provider: 'resend', user: fromEmail.trim(), name: fromName.trim() || fromEmail.trim(), ...(ownKey.trim() ? { apiKey: ownKey.trim() } : {}) }
        : { provider: 'smtp', host: smtpHost, port: Number(smtpPort), user: smtpUser, ...(smtpPass ? { pass: smtpPass } : {}) };
      await api.updateUser(user.id || user._id, { emailConfig });
      setHasConfig(true);
      setSavedProvider(tab);
      if (tab === 'resend' && ownKey.trim()) { setHasOwnKey(true); setShowKeyField(false); }
      setToast('✅ Email settings saved!');
      setTimeout(onClose, 1200);
    } catch (e) { setToast('❌ ' + e.message); }
    finally { setSaving(false); }
  };

  const handleDisconnect = async () => {
    if (!confirm('Reset email settings to system defaults?')) return;
    try {
      await api.updateUser(user.id || user._id, { emailConfig: null });
      setHasConfig(false); setSavedProvider(''); setSmtpPass(''); setOwnKey('');
      setToast('✅ Reset to system defaults');
    } catch (e) { setToast('❌ ' + e.message); }
  };

  const footerButtons = (
    <>
      <button onClick={handleSave} disabled={saving || !canSave}
        style={{ ...btnP, opacity: (saving || !canSave) ? 0.6 : 1 }}>
        {saving ? '⏳ Saving…' : '💾 Save Settings'}
      </button>
      <button onClick={handleTest} disabled={testing || !canTest}
        style={{ ...btnG, opacity: (testing || !canTest) ? 0.6 : 1 }}
        title={!canTest ? (tab === 'smtp' ? 'Enter email + password to test' : 'Enter FROM email to test') : ''}>
        {testing ? '⏳ Sending…' : '🔌 Send Test Email'}
      </button>
      <button onClick={onClose} style={btnG}>Cancel</button>
      {hasConfig && (
        <button onClick={handleDisconnect}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9ca3af', fontSize: 11, cursor: 'pointer' }}>
          Reset to defaults
        </button>
      )}
    </>
  );

  return (
    <Modal title="📧 Email Settings" onClose={onClose} footer={footerButtons}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0, maxWidth: 560 }}>

        {/* Tab selector */}
        <div style={{ display: 'flex', gap: 0, border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <button onClick={() => setTab('resend')}
            style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: tab === 'resend' ? 700 : 500, background: tab === 'resend' ? '#0176D3' : '#fff', color: tab === 'resend' ? '#fff' : '#374151', border: 'none', cursor: 'pointer' }}>
            🚀 Resend
            {savedProvider === 'resend' && <span style={{ marginLeft: 5, fontSize: 10, background: 'rgba(255,255,255,0.25)', padding: '1px 6px', borderRadius: 10 }}>✓ Active</span>}
          </button>
          <button onClick={() => setTab('smtp')}
            style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: tab === 'smtp' ? 700 : 500, background: tab === 'smtp' ? '#374151' : '#fff', color: tab === 'smtp' ? '#fff' : '#374151', border: 'none', cursor: 'pointer' }}>
            📮 Zoho / SMTP
            {savedProvider === 'smtp' && <span style={{ marginLeft: 5, fontSize: 10, background: 'rgba(255,255,255,0.25)', padding: '1px 6px', borderRadius: 10 }}>✓ Active</span>}
          </button>
        </div>

        {/* ── RESEND TAB ── */}
        {tab === 'resend' && (
          <>
            {/* How Resend works — clear explanation */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#1e40af', lineHeight: 1.8 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>💡 How Resend works — no Zoho password needed</div>
              <div>Resend is a <strong>cloud email delivery service</strong> — separate from Zoho.</div>
              <div>The domain <strong>talentnesthr.com</strong> is already verified on Resend, so invite emails can be sent from <strong>any @talentnesthr.com address</strong> without your Zoho password.</div>
              <div style={{ marginTop: 6, color: '#1d4ed8', fontWeight: 600 }}>Just set your name + FROM email below — that's all.</div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5 }}>YOUR NAME <span style={{ fontWeight: 400 }}>— shown as sender to candidate</span></div>
              <Field value={fromName} onChange={v => setFromName(v)} placeholder="e.g. Sai Charan · TalentNest HR" />
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5 }}>FROM EMAIL ADDRESS</div>
              <Field value={fromEmail} onChange={v => setFromEmail(v)} placeholder="hr@talentnesthr.com" type="email" />
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                Use any <strong>@talentnesthr.com</strong> address — e.g. <em>mhsaicharan@talentnesthr.com</em>
              </div>
            </div>

            {/* What candidate sees */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, letterSpacing: '0.5px', marginBottom: 4 }}>CANDIDATE INBOX PREVIEW</div>
              <div style={{ fontSize: 13, color: '#181818', fontWeight: 600 }}>
                📧 {fromName || 'TalentNest HR'} &lt;{fromEmail || 'hr@talentnesthr.com'}&gt;
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Subject: You're invited! [Job Title] — we think you're a great fit</div>
            </div>

            {/* Own API key — optional advanced */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
              {/* Saved state */}
              {hasOwnKey && !showKeyField ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '5px 12px', fontWeight: 600 }}>
                    🔑 Personal Resend API key saved
                  </span>
                  <button onClick={() => { setShowKeyField(true); setOwnKey(''); }}
                    style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, color: '#374151', fontSize: 12, cursor: 'pointer', padding: '5px 12px' }}>
                    ✏️ Update Key
                  </button>
                  <button onClick={async () => {
                    try {
                      await api.updateUser(user.id || user._id, { emailConfig: { provider: 'resend', user: fromEmail.trim(), name: fromName.trim() || fromEmail.trim() } });
                      setHasOwnKey(false); setOwnKey('');
                      setToast('✅ Personal key removed — using system key');
                    } catch (e) { setToast('❌ ' + e.message); }
                  }} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 11, cursor: 'pointer' }}>
                    Remove
                  </button>
                </div>
              ) : !hasOwnKey && !showKeyField ? (
                <button onClick={() => setShowKeyField(true)}
                  style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 12, cursor: 'pointer', textAlign: 'left', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                  ▶ <span>Add my own Resend API key</span>
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>(optional — system key is already configured)</span>
                </button>
              ) : null}

              {/* Input field — shown when adding/updating */}
              {showKeyField && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6, lineHeight: 1.5 }}>
                    {hasOwnKey ? 'Enter a new API key to replace the saved one.' : 'Only needed if you have your own Resend account. Leave blank to use the system key.'}
                  </div>
                  <Field
                    value={ownKey}
                    onChange={v => setOwnKey(v)}
                    type={showOwnKey ? 'text' : 'password'}
                    placeholder="re_xxxxxxxxxxxxxxxxxxxx"
                    autoFocus
                    inputStyle={{ fontFamily: 'monospace' }}
                    suffix={<button onClick={() => setShowOwnKey(v => !v)} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>{showOwnKey ? 'Hide' : 'Show'}</button>}
                  />
                  <button onClick={() => { setShowKeyField(false); setOwnKey(''); }}
                    style={{ marginTop: 5, background: 'none', border: 'none', color: '#9ca3af', fontSize: 11, cursor: 'pointer' }}>
                    ✕ Cancel
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── SMTP TAB ── */}
        {tab === 'smtp' && (
          <>
            {/* Warning */}
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
              ⚠️ SMTP ports are <strong>blocked on Railway (live server)</strong>. Use this tab for local development only.
              For the live server, use the <strong>Resend tab</strong> — it works without SMTP ports.
            </div>

            {/* Zoho explanation */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
              <strong>Enter your Zoho (or Gmail/Outlook) email + app password.</strong><br />
              For Zoho: use your Zoho email address and Zoho account password (or app-specific password if 2FA enabled).
            </div>

            {/* Preset pills */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 6 }}>SELECT PROVIDER</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {Object.entries(SMTP_PRESETS).map(([key, p]) => (
                  <button key={key} onClick={() => applySmtpPreset(key)}
                    style={{ padding: '5px 13px', borderRadius: 20, border: `1.5px solid ${smtpPreset === key ? '#374151' : '#e2e8f0'}`, background: smtpPreset === key ? '#374151' : '#fff', color: smtpPreset === key ? '#fff' : '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5 }}>SMTP HOST</div>
                <Field value={smtpHost} onChange={v => setSmtpHost(v)} placeholder="smtppro.zoho.in" />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5 }}>PORT</div>
                <Field type="number" value={smtpPort} onChange={v => setSmtpPort(v)} />
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5 }}>YOUR EMAIL ADDRESS</div>
              <Field value={smtpUser} onChange={v => setSmtpUser(v)} placeholder="mhsaicharan@talentnesthr.com" type="email" />
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 5 }}>
                PASSWORD <span style={{ fontWeight: 400 }}>— your Zoho / email account password</span>
              </div>
              <Field
                value={smtpPass}
                onChange={v => setSmtpPass(v)}
                type={showPass ? 'text' : 'password'}
                placeholder={hasConfig && savedProvider === 'smtp' ? '(saved — enter new password to update)' : 'Enter your email password'}
                suffix={<button onClick={() => setShowPass(v => !v)} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>{showPass ? 'Hide' : 'Show'}</button>}
              />
              {hasConfig && savedProvider === 'smtp' && !smtpPass && (
                <div style={{ fontSize: 11, color: '#22c55e', marginTop: 3, fontWeight: 600 }}>🔒 Password saved securely — leave blank to keep existing.</div>
              )}
            </div>
          </>
        )}

        {/* Toast */}
        {toast && (
          <div style={{ background: toast.startsWith('✅') ? '#f0fdf4' : '#fef2f2', border: `1px solid ${toast.startsWith('✅') ? '#bbf7d0' : '#fecaca'}`, borderRadius: 8, padding: '8px 14px', color: toast.startsWith('✅') ? '#166534' : '#991b1b', fontSize: 12, fontWeight: 600 }}>
            {toast}
          </div>
        )}

        {/* Help note */}
        {tab === 'smtp' && !canTest && smtpUser && !smtpPass && (
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: -8 }}>
            Enter your password above to enable the Test button.
          </div>
        )}
      </div>
    </Modal>
  );
}
