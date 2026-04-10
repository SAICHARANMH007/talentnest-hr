import React, { useEffect } from 'react';
import MarketingNav from './MarketingNav.jsx';
import MarketingFooter from './MarketingFooter.jsx';
import { useMarketingTheme } from '../../context/MarketingThemeContext.jsx';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    content: `By accessing or using the TalentNest HR platform ("Service") at talentnesthr.com, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to all of these Terms, do not use the Service.
    \nThese Terms apply to all users of the Service, including candidates, recruiters, administrators, and organizational clients.`,
  },
  {
    title: '2. Description of Service',
    content: `TalentNest HR provides a cloud-based human resources management platform that includes:
    \n• Applicant tracking and recruitment pipeline management
    \n• Candidate profile management and smart matching
    \n• Interview scheduling and coordination
    \n• Offer letter generation and management
    \n• Analytics and reporting dashboards
    \n• Job posting and careers page functionality
    \nWe reserve the right to modify, suspend, or discontinue any part of the Service at any time with reasonable notice.`,
  },
  {
    title: '3. User Accounts',
    content: `To use the Service, you must create an account. You agree to:
    \n• Provide accurate, current, and complete information
    \n• Maintain the security of your password and accept responsibility for all activity under your account
    \n• Notify us immediately of any unauthorised use of your account
    \n• Not share your account credentials with any third party
    \nWe reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent activity.`,
  },
  {
    title: '4. Acceptable Use',
    content: `You agree NOT to use the Service to:
    \n• Post false, misleading, or fraudulent job listings or candidate profiles
    \n• Discriminate against candidates based on race, gender, religion, nationality, disability, age, or any other protected characteristic
    \n• Send unsolicited communications (spam) to candidates or other users
    \n• Scrape, harvest, or extract data from the platform by automated means
    \n• Attempt to gain unauthorised access to any part of the Service
    \n• Upload malicious code, viruses, or any software intended to damage or interfere with the Service
    \n• Violate any applicable local, national, or international law or regulation`,
  },
  {
    title: '5. Intellectual Property',
    content: `The Service and its original content, features, and functionality are owned by TalentNest HR and are protected by international copyright, trademark, and other intellectual property laws.
    \nYou retain ownership of content you upload (resumes, job descriptions, etc.). By uploading content, you grant TalentNest HR a non-exclusive, royalty-free licence to use, process, and display that content solely for the purpose of providing the Service.`,
  },
  {
    title: '6. Payment Terms',
    content: `Certain features of the Service require payment. By subscribing to a paid plan:
    \n• You authorise us to charge your payment method on a recurring basis
    \n• All fees are in Indian Rupees (INR) unless stated otherwise
    \n• Subscriptions auto-renew unless cancelled before the renewal date
    \n• Refunds are available within 7 days of initial purchase if the Service has not been substantially used
    \n• We reserve the right to change pricing with 30 days' notice
    \nPayments are processed by Razorpay. By making a payment, you also agree to Razorpay's terms of service.`,
  },
  {
    title: '7. Data and Privacy',
    content: `Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the Service, you consent to the collection and use of information as described in our Privacy Policy.`,
  },
  {
    title: '8. Disclaimer of Warranties',
    content: `The Service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, either express or implied. TalentNest HR does not warrant that:
    \n• The Service will be uninterrupted or error-free
    \n• Defects will be corrected
    \n• The Service is free of viruses or other harmful components
    \n• The results obtained from using the Service will be accurate or reliable`,
  },
  {
    title: '9. Limitation of Liability',
    content: `To the maximum extent permitted by law, TalentNest HR shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of the Service.
    \nOur total liability to you for any claims arising under these Terms shall not exceed the amount you paid us in the 12 months preceding the claim.`,
  },
  {
    title: '10. Termination',
    content: `We may terminate or suspend your access to the Service immediately, without prior notice, for conduct that we believe:
    \n• Violates these Terms
    \n• Is harmful to other users, us, or third parties
    \n• May create legal liability for us
    \nUpon termination, your right to use the Service will cease immediately. You may request an export of your data within 30 days of termination.`,
  },
  {
    title: '11. Governing Law',
    content: `These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of Hyderabad, Telangana, India.`,
  },
  {
    title: '12. Changes to Terms',
    content: `We reserve the right to modify these Terms at any time. We will notify you of material changes by email or by posting a notice on the platform at least 14 days before the changes take effect. Your continued use of the Service after changes constitutes acceptance of the new Terms.`,
  },
  {
    title: '13. Contact',
    content: `If you have questions about these Terms, contact us at:
    \n• **Email**: hr@talentnesthr.com
    \n• **Phone**: +91 79955 35539
    \n• **Address**: Floor 3, Brindavanam Block C, Ganesh Nagar, Miyapur, Hyderabad 500049`,
  },
];

export default function TermsPage() {
  const { theme } = useMarketingTheme();
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
            <span style={{ color:'var(--mkt-accent)',fontSize:12,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase' }}>Service Agreement</span>
          </div>
          <h1 style={{ color: '#fff', fontSize: 'clamp(2.5rem, 6vw, 3.8rem)', fontWeight: 900, margin: '0 0 16px', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Terms of Service
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', margin: 0, fontWeight: 500 }}>
            Effective Date: April 7, 2026 &nbsp;·&nbsp; Version 1.0
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
              Please read these Terms of Service carefully before using the TalentNest HR platform. This agreement sets forth the legally binding terms and conditions for your use of the website at talentnesthr.com and all associated services.
            </p>
          </div>

          {/* Sections */}
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
                  const parts = line.slice(2).split('**');
                  return (
                    <div key={j} style={{ display: 'flex', gap: 14, marginBottom: 12, paddingLeft: 12 }}>
                      <span style={{ color: 'var(--mkt-primary)', fontSize: '1.1rem', flexShrink: 0, marginTop: -2 }}>•</span>
                      <p style={{ margin: 0, color: 'var(--mkt-text-muted)', lineHeight: 1.75, fontSize: '0.95rem' }}>
                        {parts.map((p, k) => k % 2 === 1 ? <strong key={k} style={{ color: 'var(--mkt-text-heading)' }}>{p}</strong> : p)}
                      </p>
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
            <h3 style={{ color: 'var(--mkt-text-heading)', fontWeight: 800, marginBottom: 12 }}>Need clarification?</h3>
            <p style={{ color: 'var(--mkt-text-muted)', marginBottom: 24 }}>If you have any questions regarding these terms, please contact our compliance team.</p>
            <Link to="/contact" className="btn btn-outline" style={{ borderRadius: 12 }}>Contact Compliance →</Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
