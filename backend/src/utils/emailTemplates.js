'use strict';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
const BACKEND_URL  = process.env.BACKEND_URL
  || (process.env.RAILWAY_STATIC_URL ? `https://${process.env.RAILWAY_STATIC_URL}` : null)
  || 'https://resume-generator-production.up.railway.app';

/**
 * Enterprise Base Layout — High-End Glassmorphism and Modern Branding
 * @param {string} bodyHtml  - Main email body
 * @param {string} title     - Email title
 * @param {object} opts      - { orgId, logoUrl, orgName, supportEmail, website }
 */
function baseLayout(bodyHtml, title = 'TalentNest HR', opts = {}) {
  const orgName     = opts.orgName     || 'TalentNest HR';
  const supportEmail= opts.supportEmail|| 'hr@talentnesthr.com';
  const website     = opts.website     || 'https://www.talentnesthr.com';

  // Build logo HTML — prefer passed logoUrl (base64 or URL), fallback to public image endpoint
  let logoHtml;
  if (opts.logoUrl && opts.logoUrl.startsWith('data:')) {
    // base64 inline — works in Gmail/Apple Mail; Outlook may block but shows alt text
    logoHtml = `<img src="${opts.logoUrl}" alt="${orgName}" style="max-height:56px;max-width:200px;object-fit:contain;display:block;margin:0 auto 10px" />`;
  } else if (opts.orgId) {
    // Serve via hosted image endpoint (best for all clients)
    logoHtml = `<img src="${BACKEND_URL}/api/orgs/${opts.orgId}/logo/image" alt="${orgName}" style="max-height:56px;max-width:200px;object-fit:contain;display:block;margin:0 auto 10px" />`;
  } else {
    // Platform default logo endpoint
    logoHtml = `<img src="${BACKEND_URL}/api/orgs/logo/image" alt="${orgName}" style="max-height:56px;max-width:200px;object-fit:contain;display:block;margin:0 auto 10px" onerror="this.style.display='none'" />`;
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10)">
  <div style="background:linear-gradient(135deg,#032D60 0%,#0176D3 100%);padding:32px 40px;text-align:center">
    ${logoHtml}
    <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px">${orgName}</div>
    <div style="color:rgba(255,255,255,0.65);font-size:11px;margin-top:4px;letter-spacing:1.5px">PROFESSIONAL RECRUITMENT CLOUD</div>
  </div>
  <div style="padding:36px 40px">${bodyHtml}</div>
  <div style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center">
    <p style="color:#9ca3af;font-size:11px;line-height:1.6;margin:0">
      You are receiving this system email as part of your ${orgName} account activity.<br>
      <a href="${website}" style="color:#0176D3">${website.replace(/^https?:\/\//, '')}</a> · <a href="mailto:${supportEmail}" style="color:#0176D3">${supportEmail}</a>
    </p>
  </div>
</div></body></html>`;
}

const templates = {
  /**
   * Internal Invite (Admin/Recruiter)
   */
  invite: (name, role, orgName, link, inviterName = 'TalentNest Admin', opts = {}) => {
    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
    return {
      subject: `You've been invited to ${orgName} on TalentNest HR`,
      html: baseLayout(`
        <h2 style="color:#032D60;font-size:20px;margin:0 0 16px;font-weight:800">Hi ${name} 👋</h2>
        <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px">
          <strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> as <strong>${roleLabel}</strong>.<br>
          Click the button below to set your password and access your account.
        </p>
        <div style="text-align:center;margin:32px 0">
          <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#0176D3,#0154A4);color:#fff;text-decoration:none;padding:15px 40px;border-radius:50px;font-size:15px;font-weight:700;box-shadow:0 4px 14px rgba(1,118,211,0.35)">
            Set My Password & Join →
          </a>
        </div>
        <p style="color:#ef4444;font-size:12px;text-align:center;font-weight:600;margin:0">⏰ This link expires in 7 days.</p>
      `, `Invitation — ${orgName}`, { orgName, ...opts })
    };
  },

  /**
   * Candidate Job Invitation (High-End)
   */
  candidateInvite: ({ name, recruiterName, jobTitle, orgName, location, type, link, message, orgId }) => {
    return {
      subject: `Exclusive Invite: ${jobTitle} — ${recruiterName} thinks you're a great fit`,
      html: baseLayout(`
        <h2 style="color:#032D60;font-size:20px;margin:0 0 18px;font-weight:800">Hi ${name} 👋</h2>
        ${message ? `<div style="background:#f0f7ff;border-left:4px solid #0176D3;border-radius:6px;padding:16px 20px;margin-bottom:22px">
          <p style="color:#1e40af;font-size:13px;line-height:1.7;margin:0;white-space:pre-line">${message}</p>
          <div style="color:#6b7280;font-size:11px;margin-top:10px">— ${recruiterName}, ${orgName}</div>
        </div>` : `<p style="color:#374151;font-size:14px;margin:0 0 18px"><strong>${recruiterName}</strong> from <strong>${orgName}</strong> has personally selected you for an exciting opportunity.</p>`}

        <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:28px">
          <div style="background:#0176D3;padding:20px 24px">
            <div style="color:#fff;font-size:20px;font-weight:800;margin-bottom:4px">${jobTitle}</div>
            <div style="color:rgba(255,255,255,0.8);font-size:13px">${orgName}</div>
          </div>
          <div style="padding:22px 24px;background:#f8fafc">
            <div style="display:flex;gap:18px;color:#374151;font-size:13px">
              ${location ? `<span>📍 ${location}</span>` : ''}
              ${type ? `<span>⏱ ${type}</span>` : ''}
            </div>
          </div>
        </div>

        <div style="text-align:center">
          <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#0176D3,#0154A4);color:#fff;text-decoration:none;padding:15px 40px;border-radius:50px;font-size:15px;font-weight:700;box-shadow:0 4px 14px rgba(1,118,211,0.35)">
            ✅ View Job & Respond
          </a>
        </div>
      `, `Job Opportunity — ${jobTitle}`, { orgName, orgId })
    };
  },

  /**
   * Account Preparation (Temp Password)
   */
  tempPassword: (name, email, password, opts = {}) => {
    return {
      subject: `Your ${opts.orgName || 'TalentNest HR'} account is ready`,
      html: baseLayout(`
        <h2 style="color:#032D60;font-size:20px;margin:0 0 16px;font-weight:800">Hi ${name} 👋</h2>
        <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px">Your account has been created. Here are your credentials:</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin:0 0 24px">
          <div style="color:#6b7280;font-size:12px;margin-bottom:4px">Temporary Password</div>
          <div style="color:#111827;font-size:16px;font-weight:600;font-family:monospace">${password}</div>
        </div>
        <div style="text-align:center;margin:24px 0">
          <a href="${FRONTEND_URL}/login" style="display:inline-block;background:linear-gradient(135deg,#0176D3,#0154A4);color:#fff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:15px;font-weight:700">Login & Set New Password →</a>
        </div>
      `, 'Account Ready', opts)
    };
  },

  /**
   * Welcome Email (New Candidate Registration)
   */
  welcome: (name, role = 'candidate', opts = {}) => {
    return {
      subject: `Welcome to ${opts.orgName || 'TalentNest HR'}!`,
      html: baseLayout(`
        <h2 style="color:#032D60;font-size:20px;margin:0 0 16px;font-weight:800">Welcome, ${name}! 👋</h2>
        <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px">
          We're excited to have you on board as a <strong>${role}</strong>. TalentNest HR is designed to make your recruitment process seamless and efficient.
        </p>
        <div style="text-align:center;margin:32px 0">
          <a href="${FRONTEND_URL}/login" style="display:inline-block;background:linear-gradient(135deg,#0176D3,#0154A4);color:#fff;text-decoration:none;padding:15px 40px;border-radius:50px;font-size:15px;font-weight:700;box-shadow:0 4px 14px rgba(1,118,211,0.35)">
            Go to Your Dashboard →
          </a>
        </div>
      `, 'Welcome!', opts)
    };
  },

  /**
   * OTP Verification (2FA)
   */
  otp: (otp, opts = {}) => {
    return {
      subject: `${opts.orgName || 'TalentNest'}: Your Security Code`,
      html: baseLayout(`
        <h2 style="color:#032D60;font-size:20px;margin:0 0 16px;font-weight:800">Security Verification 🛡️</h2>
        <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px">
          Please use the following code to complete your sign-in. This code is valid for 10 minutes.
        </p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
          <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#032D60;font-family:monospace">${otp}</div>
        </div>
        <p style="color:#6b7280;font-size:12px;text-align:center">If you didn't request this code, please secure your account immediately.</p>
      `, 'Security Code', opts)
    };
  },

  /**
   * Forgot Password Link
   */
  forgotPassword: (name, link, opts = {}) => {
    return {
      subject: `Reset your ${opts.orgName || 'TalentNest HR'} password`,
      html: baseLayout(`
        <h2 style="color:#032D60;font-size:20px;margin:0 0 16px;font-weight:800">Reset Your Password 🔑</h2>
        <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px">
          Hi ${name},<br>
          We received a request to reset your password. Click the button below to choose a new one.
        </p>
        <div style="text-align:center;margin:32px 0">
          <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#0176D3,#0154A4);color:#fff;text-decoration:none;padding:15px 40px;border-radius:50px;font-size:15px;font-weight:700;box-shadow:0 4px 14px rgba(1,118,211,0.35)">
            Reset Password →
          </a>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      `, 'Reset Password', opts)
    };
  },

  /**
   * Admin-initiated password change notification
   */
  passwordChangedByAdmin: (name, adminName, orgName, opts = {}) => {
    return {
      subject: `Your password was reset by ${adminName} — ${orgName}`,
      html: baseLayout(`
        <h2 style="color:#032D60;font-size:20px;margin:0 0 16px;font-weight:800">Password Changed 🔒</h2>
        <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px">
          Hi <strong>${name}</strong>,<br><br>
          Your account password has been reset by <strong>${adminName}</strong> (${orgName} administrator).<br>
          You can now log in with your new password.
        </p>
        <div style="background:#FFF7ED;border:1.5px solid #FED7AA;border-radius:10px;padding:16px 20px;margin:20px 0">
          <p style="color:#92400E;font-size:13px;margin:0;font-weight:600">
            ⚠️ If you did not expect this change, please contact your administrator immediately or use Forgot Password to regain control of your account.
          </p>
        </div>
        <div style="text-align:center;margin:28px 0">
          <a href="${process.env.FRONTEND_URL || 'https://www.talentnesthr.com'}/login" style="display:inline-block;background:linear-gradient(135deg,#0176D3,#0154A4);color:#fff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:700;box-shadow:0 4px 14px rgba(1,118,211,0.3)">
            Log In Now →
          </a>
        </div>
      `, 'Password Reset Notification', { orgName, ...opts })
    };
  }
};

module.exports = templates;
