import React, { useEffect } from 'react';
import MarketingNav from './MarketingNav.jsx';
import MarketingFooter from './MarketingFooter.jsx';
import { useMarketingTheme } from '../../context/MarketingThemeContext.jsx';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    content: `We collect information you provide directly to us, such as when you create an account, submit a job application, post a job, or contact us. This includes:
    \n• **Personal identifiers**: Name, email address, phone number, location
    \n• **Professional information**: Resume, work history, skills, education, references
    \n• **Account credentials**: Username and encrypted password
    \n• **Payment information**: Billing details processed securely via Razorpay (we do not store card numbers)
    \n• **Usage data**: Pages visited, features used, time spent on the platform
    \n• **Device information**: IP address, browser type, operating system`,
  },
  {
    title: '2. How We Use Your Information',
    content: `We use the information we collect to:
    \n• Provide, maintain, and improve our services
    \n• Match candidates with relevant job opportunities
    \n• Send transactional emails (interview invites, offer letters, status updates)
    \n• Process payments and manage billing
    \n• Communicate with you about products, services, and events
    \n• Monitor and analyze trends and usage to improve user experience
    \n• Detect and prevent fraudulent transactions and other illegal activities
    \n• Comply with legal obligations`,
  },
  {
    title: '3. Sharing of Information',
    content: `We do not sell your personal data. We may share your information with:
    \n• **Employers / Recruiters**: Candidate profiles are visible to recruiters within the platform as part of the hiring process
    \n• **Service providers**: Third-party vendors who assist in operating our platform (cloud hosting, email delivery, analytics)
    \n• **Legal requirements**: When required by law, court order, or governmental authority
    \n• **Business transfers**: In connection with a merger, acquisition, or sale of assets
    \nAll third-party service providers are bound by data processing agreements and may not use your data for their own purposes.`,
  },
  {
    title: '4. Data Security',
    content: `We implement industry-standard security measures to protect your data:
    \n• All data is encrypted in transit using TLS 1.2+
    \n• Passwords are hashed using bcrypt (never stored in plain text)
    \n• JWT tokens expire after a short window; refresh tokens are HTTP-only cookies
    \n• MongoDB Atlas provides encrypted storage and automated backups
    \n• Access to production systems is restricted and audited
    \nDespite these measures, no security system is impenetrable. We encourage you to use strong passwords and not share your account credentials.`,
  },
  {
    title: '5. Cookies and Tracking',
    content: `We use cookies and similar tracking technologies to:
    \n• Keep you logged in (session cookies)
    \n• Remember your preferences
    \n• Analyze platform usage via anonymised analytics
    \nYou can control cookies through your browser settings. Disabling cookies may affect some features of the platform.`,
  },
  {
    title: '6. Your Rights',
    content: `Depending on your location, you may have the right to:
    \n• **Access**: Request a copy of the personal data we hold about you
    \n• **Correction**: Ask us to correct inaccurate data
    \n• **Deletion**: Request deletion of your personal data ("right to be forgotten")
    \n• **Portability**: Receive your data in a machine-readable format
    \n• **Objection**: Object to processing of your data for direct marketing
    \nTo exercise these rights, email us at hr@talentnesthr.com. We will respond within 30 days.`,
  },
  {
    title: '7. Data Retention',
    content: `We retain your data for as long as your account is active or as needed to provide services. Specifically:
    \n• Active accounts: Data retained indefinitely while account is in use
    \n• Deleted accounts: Core data deleted within 30 days; anonymised usage data may be retained for analytics
    \n• Application records: Retained for 2 years after the hiring process concludes
    \n• Payment records: Retained for 7 years as required by Indian tax law`,
  },
  {
    title: '8. Children\'s Privacy',
    content: `Our platform is not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have inadvertently collected such information, please contact us immediately at hr@talentnesthr.com.`,
  },
  {
    title: '9. Changes to This Policy',
    content: `We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by posting a prominent notice on our platform. Your continued use of the platform after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: '10. Contact Us',
    content: `For questions, concerns, or to exercise your data rights, contact our Data Protection Officer:
    \n• **Email**: hr@talentnesthr.com
    \n• **Phone**: +91 79955 35539
    \n• **Address**: Floor 3, Brindavanam Block C, Ganesh Nagar, Miyapur, Hyderabad 500049
    \n• **Business Hours**: Monday–Friday, 9 AM – 7 PM IST`,
  },
];

export default function PrivacyPage() {
  useEffect(() => {
    if (!document.getElementById('marketing-css')) {
      const link = document.createElement('link'); link.id = 'marketing-css'; link.rel = 'stylesheet'; link.href = '/marketing.css';
      document.head.appendChild(link);
    }
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="mkt-page" style={{ 
      fontFamily: "var(--font-primary)", 
      background: "var(--mkt-section-bg)", 
      color: "var(--mkt-text)",
      minHeight: '100vh' 
    }}>
      <MarketingNav />

      {/* Hero */}
      <section style={{ 
        background: "var(--mkt-darker)",
        padding: '160px 24px 80px', 
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background gradient */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(3,45,96,0.15) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(6,182,212,0.1) 0%, transparent 40%)', pointerEvents: 'none' }} />
        
        <div className="container mkt-reveal" style={{ position: 'relative' }}>
          <div style={{ display:'inline-flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:100,padding:'8px 20px',marginBottom:24 }}>
            <span style={{ color:'var(--mkt-accent)',fontSize:12,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase' }}>Legal Documentation</span>
          </div>
          <h1 style={{ color: '#fff', fontSize: 'clamp(2.5rem, 6vw, 3.8rem)', fontWeight: 900, margin: '0 0 16px', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Privacy Policy
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', margin: 0, fontWeight: 500 }}>
            Version 2.4 &nbsp;·&nbsp; Last updated: April 7, 2026
          </p>
        </div>
      </section>

      {/* Content */}
      <section style={{ padding: '80px 24px 120px', background: 'var(--mkt-section-bg)' }}>
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          {/* Intro Card */}
          <div className="mkt-reveal" style={{ 
            background: 'var(--mkt-card-bg)', 
            border: '1px solid var(--mkt-card-border)', 
            borderRadius: 24, 
            padding: '48px', 
            marginBottom: 32, 
            boxShadow: 'var(--shadow-lg)' 
          }}>
            <p style={{ color: 'var(--mkt-text)', lineHeight: 1.8, margin: 0, fontSize: '1.05rem', fontWeight: 500 }}>
              TalentNest HR ("Company", "we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect your personal information when you use our platform and services.
            </p>
          </div>

          {/* Policy Sections */}
          {SECTIONS.map((s, i) => (
            <div key={i} className="mkt-reveal-delayed" style={{ 
              background: 'var(--mkt-card-bg)', 
              border: '1px solid var(--mkt-card-border)', 
              borderRadius: 24, 
              padding: '40px', 
              marginBottom: 16, 
              boxShadow: 'var(--shadow-sm)',
              animationDelay: `${0.1 + (i % 4) * 0.1}s`
            }}>
              <h2 style={{ color: 'var(--mkt-text-heading)', fontSize: '1.25rem', fontWeight: 800, margin: '0 0 20px', letterSpacing: '-0.01em' }}>{s.title}</h2>
              {s.content.split('\n').map((line, j) => {
                if (!line.trim()) return null;
                if (line.startsWith('• ')) {
                  return (
                    <div key={j} style={{ display: 'flex', gap: 14, marginBottom: 12, paddingLeft: 12 }}>
                      <span style={{ color: 'var(--mkt-primary)', fontSize: '1.1rem', flexShrink: 0, marginTop: -2 }}>•</span>
                      <p style={{ margin: 0, color: 'var(--mkt-text-muted)', lineHeight: 1.75, fontSize: '0.95rem' }}>{line.slice(2)}</p>
                    </div>
                  );
                }
                return <p key={j} style={{ color: 'var(--mkt-text-muted)', lineHeight: 1.8, margin: '0 0 16px', fontSize: '0.95rem' }}>{line}</p>;
              })}
            </div>
          ))}

          {/* Contact Banner */}
          <div className="mkt-reveal-delayed" style={{ 
            marginTop: 48, 
            padding: '40px', 
            background: 'var(--mkt-surface-bg)', 
            borderRadius: 24, 
            border: '1px solid var(--mkt-card-border)', 
            textAlign: 'center' 
          }}>
            <h3 style={{ color: 'var(--mkt-text-heading)', fontWeight: 800, marginBottom: 12 }}>Questions about our policy?</h3>
            <p style={{ color: 'var(--mkt-text-muted)', marginBottom: 24 }}>Our legal team is here to clarify any concerns regarding your data.</p>
            <Link to="/contact" className="btn btn-outline" style={{ borderRadius: 12 }}>Contact Privacy Team →</Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
