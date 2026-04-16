import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MarketingNav from './MarketingNav.jsx';
import MarketingFooter from './MarketingFooter.jsx';
import { useMarketingTheme } from '../../context/MarketingThemeContext.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// 20-Section Terms of Service — Data-focused, legally comprehensive
// Effective: April 16, 2026
// ─────────────────────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'acceptance',
    number: '01',
    icon: '📋',
    title: 'Acceptance of Terms',
    content: [
      'By accessing, registering for, or using the TalentNest HR platform ("Service", "Platform") operated by TalentNest HR Technologies Private Limited ("Company", "We", "Us", "Our") at talentnesthr.com and all associated sub-domains, APIs, and mobile interfaces, you ("User", "You") agree to be legally bound by these Terms of Service ("Terms").',
      'These Terms constitute a binding legal agreement. If you do not agree to any provision herein, you must immediately cease all access to or use of the Service. Continued use following publication of any amendments constitutes acceptance of those amendments.',
      'These Terms apply to all categories of users, including: (a) Individual candidates seeking employment; (b) Recruiters and talent acquisition professionals; (c) Organisation administrators and HR managers; (d) Client organisations engaging staffing services; (e) Super-administrators managing the platform.',
    ],
  },
  {
    id: 'definitions',
    number: '02',
    icon: '📖',
    title: 'Definitions & Interpretation',
    content: [
      '"Personal Data" means any information relating to an identified or identifiable natural person, including but not limited to name, email address, phone number, location, biometric data, employment history, and financial details.',
      '"Sensitive Personal Data or Information (SPDI)" under the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 includes passwords, financial information, health information, sexual orientation, biometric data, and similar categories.',
      '"Processing" means any operation performed on Personal Data, including collection, recording, organisation, structuring, storage, adaptation, retrieval, use, disclosure, dissemination, or deletion.',
      '"Data Controller" refers to TalentNest HR Technologies Private Limited, which determines the purposes and means of processing Personal Data on the Platform.',
      '"Data Processor" refers to any third-party service provider processing data on behalf of the Company, including cloud infrastructure providers, payment processors, and communication service providers.',
    ],
  },
  {
    id: 'data-collection',
    number: '03',
    icon: '🗃️',
    title: 'Data We Collect',
    content: [
      'We collect the following categories of Personal Data when you use the Service:',
      '• Identity Data: Full legal name, date of birth, government-issued identification numbers (where provided voluntarily), profile photographs, and digital signatures.',
      '• Contact Data: Email address(es), mobile/telephone numbers, residential and professional addresses, emergency contact details.',
      '• Professional Data: Resume/CV content, employment history, educational qualifications, professional certifications, skills inventory, languages spoken, notice period, salary expectations, current CTC, and expected CTC.',
      '• Account Data: Username, hashed password credentials, role assignments, account creation timestamps, last login records, two-factor authentication settings, and session tokens.',
      '• Application Data: Job applications submitted, pipeline stage history, recruiter notes, assessment scores, interview schedules, offer letters received, and hiring decisions.',
      '• Technical Data: IP address, browser type and version, operating system, device identifiers, time zone, cookie identifiers, session logs, page access logs, and referral URLs.',
      '• Communication Data: Emails, in-platform messages, interview notes, feedback provided by recruiters or hiring managers, and any content you submit through forms or assessments.',
      '• Financial Data: Billing name and address, last four digits of payment instrument, transaction IDs, subscription plan history, and invoice records. Full payment card data is never stored on our servers and is processed exclusively by PCI-DSS compliant payment processors.',
    ],
  },
  {
    id: 'data-purpose',
    number: '04',
    icon: '🎯',
    title: 'Purpose of Data Processing',
    content: [
      'We process your Personal Data strictly for the following lawful purposes:',
      '• Service Delivery: To operate, maintain, and improve the Platform; to match candidates with relevant job opportunities; to facilitate recruitment workflows between candidates and employer organisations.',
      '• Account Management: To create and manage your user account; to authenticate your identity; to enforce security policies including two-factor authentication.',
      '• Communication: To send transactional notifications (e.g., application updates, interview invitations, offer letters); to respond to support enquiries; to send platform-related service announcements.',
      '• Analytics & Improvement: To generate anonymised and aggregated analytics reports; to understand platform usage patterns; to improve our matching algorithms and AI features; to conduct internal research and product development.',
      '• Legal Compliance: To comply with applicable laws, regulations, court orders, and governmental requests; to enforce our Terms; to protect our legal rights and the rights of other users.',
      '• Fraud Prevention & Security: To detect, investigate, and prevent fraudulent transactions, abuse, or illegal activity; to monitor for security vulnerabilities; to protect the integrity of the Platform.',
      'We do not process your Personal Data for any purpose incompatible with those listed above without your prior consent.',
    ],
  },
  {
    id: 'legal-basis',
    number: '05',
    icon: '⚖️',
    title: 'Legal Basis for Processing',
    content: [
      'We rely on the following legal bases for processing your Personal Data:',
      '• Contractual Necessity: Processing necessary to perform the contract we have with you (i.e., to provide the Service you registered for).',
      '• Legitimate Interests: Processing necessary for our legitimate business interests, including platform security, fraud prevention, and product improvement, where such interests are not overridden by your rights.',
      '• Legal Obligation: Processing necessary to comply with Indian law (including the Information Technology Act, 2000 and rules thereunder), as well as applicable international regulations including GDPR where applicable.',
      '• Consent: Where we rely on your consent (e.g., for optional profile visibility features, marketing communications, or AI-powered matching), you may withdraw consent at any time by contacting us or adjusting your account settings. Withdrawal of consent does not affect the lawfulness of processing before withdrawal.',
    ],
  },
  {
    id: 'data-storage',
    number: '06',
    icon: '🏛️',
    title: 'Data Storage & Infrastructure',
    content: [
      'All data submitted to TalentNest HR is stored on cloud infrastructure operated by MongoDB Atlas (MongoDB Inc.) and Render Inc., with primary data centres located in the Asia-Pacific region (Mumbai, India and Singapore). We endeavour to keep all Indian user data within Indian data centre boundaries where technically feasible.',
      '• Encryption at Rest: All database records, file uploads (resumes, documents, images), and backup snapshots are encrypted at rest using AES-256 encryption.',
      '• Encryption in Transit: All data transmitted between your device and our servers is encrypted using TLS 1.2 or TLS 1.3 (HTTPS). Unencrypted HTTP connections are automatically redirected to HTTPS.',
      '• Database Security: Our MongoDB Atlas clusters are deployed in private VPCs with network peering, IP allowlisting, SCRAM-SHA-256 authentication, and automated threat detection enabled.',
      '• Backup & Recovery: Automated daily snapshots are retained for 7 days. Weekly snapshots are retained for 4 weeks. Monthly snapshots are retained for 6 months. Backups are encrypted and stored in geographically separate locations.',
      '• File Storage: Uploaded documents (resumes, offer letters, logos) are stored in secure object storage with private-by-default access controls. All file access is authenticated and logged.',
    ],
  },
  {
    id: 'retention',
    number: '07',
    icon: '⏱️',
    title: 'Data Retention Policy',
    content: [
      'We retain your Personal Data only for as long as necessary to fulfil the purposes described in these Terms, unless a longer retention period is required by law.',
      '• Active Accounts: Personal Data associated with active user accounts is retained for the duration of the account\'s active status plus 90 days following account deactivation or deletion request.',
      '• Application Records: Job application records, pipeline history, and associated hiring decisions are retained for 3 years from the date of the hiring decision, to comply with employment record-keeping obligations and to resolve potential disputes.',
      '• Financial & Billing Records: Invoice, payment, and subscription records are retained for 7 years from the transaction date, in compliance with Indian accounting and tax regulations.',
      '• Audit Logs: System access logs, security audit trails, and authentication records are retained for 2 years.',
      '• Deleted Content: When you delete content or request account deletion, we begin the anonymisation process within 30 days. Residual copies in backups are purged within 90 days. Certain data may be retained longer if required by law or ongoing legal proceedings.',
      '• Marketing Data: If you have provided consent for marketing communications, your contact details are retained until you withdraw consent or unsubscribe.',
    ],
  },
  {
    id: 'data-sharing',
    number: '08',
    icon: '🤝',
    title: 'Data Sharing & Disclosure',
    content: [
      'We do not sell, rent, or trade your Personal Data to third parties. We share data only in the following limited circumstances:',
      '• With Employer Organisations: When you apply for a job through the Platform, your professional profile data (as configured by your privacy settings) is shared with the relevant employer organisation and its authorised recruiters on the Platform.',
      '• With Service Providers (Data Processors): We engage the following categories of sub-processors who process data on our behalf under strict data processing agreements: Cloud infrastructure (MongoDB Atlas, Render), Email delivery (Resend Inc.), Payment processing (Razorpay Financial Services Pvt. Ltd.), SMS gateway providers, and analytics services.',
      '• With Legal Authorities: We may disclose Personal Data to government authorities, law enforcement agencies, or courts when required by applicable law, court order, or governmental regulation, or where we believe disclosure is necessary to protect the rights, property, or safety of TalentNest HR, our users, or the public.',
      '• Business Transfers: In the event of a merger, acquisition, or sale of all or a portion of our assets, your Personal Data may be transferred to the successor entity. We will provide notice of such transfer and the opportunity to delete your account before the transfer takes effect.',
      '• With Your Consent: We may share your data with third parties for purposes not described herein, subject to your explicit prior consent.',
    ],
  },
  {
    id: 'ai-processing',
    number: '09',
    icon: '🤖',
    title: 'AI & Automated Processing',
    content: [
      'TalentNest HR uses Google Gemini AI (Gemini 2.0 Flash) to power our AI-assisted matching and screening features. By using AI features, you acknowledge that:',
      '• AI Match Scoring: Your profile data (skills, experience, qualifications) is processed by our AI system to generate a compatibility score between your profile and job requirements. This score is advisory only and does not constitute a final hiring decision.',
      '• Data sent to Google Gemini: When you use AI-powered features, limited profile data (skills, job title, experience summary — never government IDs, financial data, or SPDI) is transmitted to Google\'s API under our data processing agreement with Google, which prohibits use of this data for model training.',
      '• Automated Decisions: We do not make legally significant automated decisions (hire/reject) solely based on AI scoring. Human recruiters retain final decision-making authority. You have the right to request human review of any AI-generated assessment.',
      '• Opt-Out: You may opt out of AI matching features at any time from your Profile Settings. Opting out will not affect your ability to apply for jobs manually.',
    ],
  },
  {
    id: 'user-rights',
    number: '10',
    icon: '🛡️',
    title: 'Your Data Rights',
    content: [
      'Subject to applicable law, you have the following rights with respect to your Personal Data:',
      '• Right of Access: You may request a copy of all Personal Data we hold about you. We will respond within 30 days.',
      '• Right to Rectification: You may correct inaccurate or incomplete Personal Data at any time through your Account Settings or by contacting us.',
      '• Right to Erasure ("Right to be Forgotten"): You may request deletion of your account and associated Personal Data, subject to our retention obligations and any overriding legal requirements.',
      '• Right to Data Portability: You may request an export of your Personal Data in a machine-readable format (JSON or CSV) via your Account Settings > Export Data.',
      '• Right to Object: You may object to the processing of your Personal Data for direct marketing purposes at any time. You may also object to processing based on legitimate interests, subject to our demonstrating compelling grounds.',
      '• Right to Restrict Processing: You may request that we restrict processing of your data in certain circumstances (e.g., while the accuracy of the data is contested).',
      '• Right to Withdraw Consent: Where processing is based on consent, you may withdraw that consent at any time without affecting the lawfulness of prior processing.',
      'To exercise any of these rights, contact privacy@talentnesthr.com. We will respond within 30 calendar days.',
    ],
  },
  {
    id: 'cookies',
    number: '11',
    icon: '🍪',
    title: 'Cookies & Tracking Technologies',
    content: [
      'We use the following categories of cookies and tracking technologies:',
      '• Strictly Necessary Cookies: Session authentication tokens, CSRF protection tokens, and load balancing cookies. These cannot be disabled as they are essential for the Service to function.',
      '• Functional Cookies: User preference data (theme, language, notification settings) stored in your browser\'s localStorage and sessionStorage. These persist only for the duration of your session unless you explicitly save preferences.',
      '• Analytics Cookies: We use privacy-respecting analytics to understand aggregate Platform usage. No individual user behaviour is tracked across third-party websites. You may opt out via the cookie preference centre.',
      '• Security Tokens: Signed HttpOnly cookies containing refresh tokens for session management. These cookies cannot be accessed by JavaScript and are protected against XSS attacks.',
      'We do not use third-party advertising cookies or cross-site tracking. You can manage your cookie preferences through your browser settings, but note that disabling strictly necessary cookies will prevent login.',
    ],
  },
  {
    id: 'security',
    number: '12',
    icon: '🔐',
    title: 'Information Security',
    content: [
      'We implement industry-standard technical and organisational security measures to protect your Personal Data, including:',
      '• Passwords are stored as bcrypt hashes (cost factor 10+). Plain-text passwords are never stored, logged, or transmitted.',
      '• Two-Factor Authentication (2FA) via OTP is available for all accounts and is mandatory for administrator-level users.',
      '• Role-Based Access Control (RBAC) ensures users can only access data within their authorised scope. Tenant isolation prevents cross-organisation data access.',
      '• All API endpoints require authenticated JWT access tokens with 15-minute expiry. Long-lived refresh tokens are stored in signed HttpOnly cookies and rotated on each use.',
      '• Automated vulnerability scanning, dependency auditing, and security patch management are performed on a regular schedule.',
      '• In the event of a data breach affecting your Personal Data, we will notify affected users and the relevant Data Protection Authority within 72 hours of becoming aware of the breach, in accordance with applicable law.',
    ],
  },
  {
    id: 'accounts',
    number: '13',
    icon: '👤',
    title: 'User Accounts & Responsibilities',
    content: [
      'You are responsible for maintaining the security of your account credentials. Specifically, you agree to:',
      '• Provide accurate, current, and complete registration information and keep it updated.',
      '• Not share your account credentials with any third party. Each individual must maintain their own account.',
      '• Notify us immediately at security@talentnesthr.com if you suspect any unauthorised access to or use of your account.',
      '• Not attempt to access any account other than your own.',
      '• Ensure that any content you upload (resumes, job descriptions, assessments) does not infringe any third-party intellectual property right, contain false or misleading information, or violate applicable law.',
      'You are liable for all activity conducted through your account unless caused by our negligence or security failure.',
    ],
  },
  {
    id: 'acceptable-use',
    number: '14',
    icon: '⚠️',
    title: 'Acceptable Use Policy',
    content: [
      'You agree NOT to use the Service to:',
      '• Post false, misleading, fraudulent, or discriminatory job listings or candidate profiles.',
      '• Discriminate against candidates based on race, caste, religion, gender, gender identity, sexual orientation, nationality, disability, age, or any other characteristic protected under applicable law including the Equal Remuneration Act and Persons with Disabilities Act (India).',
      '• Send unsolicited bulk commercial messages (spam) to candidates, recruiters, or other users.',
      '• Scrape, harvest, index, or extract data from the Platform by automated means (bots, crawlers, scrapers) without our express written consent.',
      '• Attempt to reverse-engineer, decompile, disassemble, or access the source code or underlying infrastructure of the Service.',
      '• Introduce malware, ransomware, viruses, Trojan horses, or any malicious code.',
      '• Conduct any form of denial-of-service attack, SQL injection, cross-site scripting, or other cyber attack.',
      '• Impersonate any person or entity, or misrepresent your affiliation with any person or entity.',
      'Violations may result in immediate account suspension, permanent termination, and/or legal action.',
    ],
  },
  {
    id: 'intellectual-property',
    number: '15',
    icon: '©️',
    title: 'Intellectual Property',
    content: [
      'The TalentNest HR platform — including its software, codebase, UI design, trademarks, logos, trade names, service marks, domain names, and all original content — is owned exclusively by TalentNest HR Technologies Private Limited and protected by Indian and international intellectual property laws.',
      '• Your Content: You retain full ownership of content you upload, including resumes, cover letters, and job descriptions. By uploading, you grant us a non-exclusive, worldwide, royalty-free, sublicensable licence to host, process, display, and transmit that content solely as necessary to provide the Service.',
      '• Restrictions: You may not copy, modify, distribute, sell, or exploit any part of the Service or its content without our express written permission. Unauthorised use constitutes infringement and may result in civil and criminal liability.',
      '• Feedback: Any suggestions, ideas, or feedback you provide regarding the Service may be used by us without compensation or attribution to you.',
    ],
  },
  {
    id: 'third-party',
    number: '16',
    icon: '🔗',
    title: 'Third-Party Services & Links',
    content: [
      'The Service may integrate with or link to third-party services, including LinkedIn, Google (OAuth sign-in), Razorpay (payments), Resend (email), and others. Use of these services is governed by their respective terms and privacy policies.',
      '• Google OAuth: When you sign in with Google, we receive your name, email address, and profile photo from Google. We do not receive your Google password. Your use of Google sign-in is subject to Google\'s Terms of Service and Privacy Policy.',
      '• Razorpay: Payment processing is handled by Razorpay Financial Services Pvt. Ltd. Card data is tokenised and never passes through our servers. Razorpay is PCI-DSS compliant.',
      '• We are not responsible for the privacy practices, security, or content of third-party services. We encourage you to read their terms before using them.',
    ],
  },
  {
    id: 'payment',
    number: '17',
    icon: '💳',
    title: 'Subscription & Payment Terms',
    content: [
      'Certain features require a paid subscription. By subscribing:',
      '• You authorise recurring charges to your payment method at the frequency specified at the time of purchase (monthly or annual).',
      '• All prices are in Indian Rupees (INR) inclusive of applicable GST unless stated otherwise. We reserve the right to adjust pricing with 30 days\' written notice.',
      '• Subscriptions auto-renew unless cancelled at least 24 hours before the renewal date via Account Settings > Billing.',
      '• Refund Policy: Refunds are available within 7 days of the initial subscription purchase if you have not substantially used the paid features. Pro-rated refunds for mid-cycle cancellations are not available unless required by law. To request a refund, email billing@talentnesthr.com.',
      '• Failed payments will result in a grace period of 7 days, after which paid features will be suspended pending payment resolution.',
      '• Organisation accounts that are suspended for non-payment will have their data retained for 60 days, after which permanent deletion will proceed unless payment is received.',
    ],
  },
  {
    id: 'liability',
    number: '18',
    icon: '🏛️',
    title: 'Disclaimers & Limitation of Liability',
    content: [
      'THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, TALENTNEST HR DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
      'We do not warrant that: (a) the Service will be uninterrupted, timely, secure, or error-free; (b) any defects will be corrected; (c) the results obtained from use of the Service will be accurate or reliable; (d) the AI matching scores will result in successful hiring outcomes.',
      'TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL CUMULATIVE LIABILITY TO YOU FOR ANY AND ALL CLAIMS ARISING UNDER THESE TERMS SHALL NOT EXCEED THE GREATER OF: (A) INR 10,000; OR (B) THE TOTAL FEES PAID BY YOU TO US IN THE 12 MONTHS IMMEDIATELY PRECEDING THE CLAIM.',
      'IN NO EVENT SHALL TALENTNEST HR BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, REVENUE, DATA, BUSINESS OPPORTUNITY, OR GOODWILL, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.',
    ],
  },
  {
    id: 'termination',
    number: '19',
    icon: '🚪',
    title: 'Termination & Account Deletion',
    content: [
      'Either party may terminate this agreement at any time:',
      '• By You: You may delete your account at any time via Account Settings > Delete Account. Upon deletion, your profile will be anonymised within 30 days. Application records linked to employer organisations will be retained per Section 7 (Retention Policy).',
      '• By Us: We may suspend or permanently terminate your account immediately and without prior notice if we determine, in our sole reasonable discretion, that you have: (a) violated these Terms; (b) engaged in fraudulent, abusive, or illegal conduct; (c) created legal, regulatory, or reputational risk for the Company.',
      '• Effect of Termination: Upon termination, your licence to use the Service is immediately revoked. You may request a data export within 30 days of termination by emailing privacy@talentnesthr.com. Sections 7 (Retention), 15 (IP), 18 (Liability), 20 (Governing Law), and any accrued obligations survive termination.',
      '• Organisation Termination: If your employer organisation\'s account is terminated, individual user accounts within that organisation may also be terminated. Affected users will be notified and given the opportunity to export their personal profile data.',
    ],
  },
  {
    id: 'governing-law',
    number: '20',
    icon: '🌏',
    title: 'Governing Law, Disputes & Contact',
    content: [
      'GOVERNING LAW: These Terms shall be governed by and construed in accordance with the laws of the Republic of India, including the Information Technology Act, 2000; the Information Technology (Amendment) Act, 2008; the Consumer Protection Act, 2019; and any successor legislation including the Digital Personal Data Protection Act, 2023 (DPDPA) upon its commencement.',
      'DISPUTE RESOLUTION: In the event of any dispute arising out of or in connection with these Terms, the parties shall first attempt to resolve the dispute through good-faith negotiation. If unresolved within 30 days, disputes shall be submitted to binding arbitration under the Arbitration and Conciliation Act, 1996 (as amended), before a sole arbitrator mutually appointed by the parties. The seat of arbitration shall be Hyderabad, Telangana, India. The language of arbitration shall be English.',
      'JURISDICTION: Subject to the arbitration clause above, both parties submit to the exclusive jurisdiction of the competent courts of Hyderabad, Telangana, India for injunctive relief and enforcement of arbitral awards.',
      'CHANGES TO THESE TERMS: We reserve the right to modify these Terms at any time. Material changes will be communicated by email and/or in-platform notification at least 14 days before taking effect. Your continued use of the Service after the effective date of changes constitutes acceptance.',
      '— CONTACT US —',
      '• Data Protection Officer: privacy@talentnesthr.com',
      '• Billing & Subscriptions: billing@talentnesthr.com',
      '• Security & Compliance: security@talentnesthr.com',
      '• General: hr@talentnesthr.com',
      '• Phone: +91 79955 35539',
      '• Registered Address: Floor 3, Brindavanam Block C, Ganesh Nagar, Miyapur, Hyderabad — 500049, Telangana, India',
    ],
  },
];

// ── Table of Contents ──────────────────────────────────────────────────────
function TableOfContents({ sections, activeId }) {
  return (
    <nav style={{ position: 'sticky', top: 100, maxHeight: 'calc(100vh - 140px)', overflowY: 'auto', paddingRight: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--mkt-primary)', marginBottom: 16 }}>Contents</div>
      {sections.map(s => (
        <a key={s.id} href={`#${s.id}`}
          style={{
            display: 'block', padding: '7px 12px', borderRadius: 8, marginBottom: 4, fontSize: 12, fontWeight: activeId === s.id ? 700 : 500,
            color: activeId === s.id ? 'var(--mkt-primary)' : 'var(--mkt-text-muted)',
            background: activeId === s.id ? 'rgba(1,118,211,0.1)' : 'transparent',
            textDecoration: 'none', transition: 'all 0.15s', borderLeft: `2px solid ${activeId === s.id ? 'var(--mkt-primary)' : 'transparent'}`,
          }}>
          <span style={{ color: 'var(--mkt-primary)', fontWeight: 700, marginRight: 6, fontVariantNumeric: 'tabular-nums', fontSize: 10 }}>{s.number}</span>
          {s.title}
        </a>
      ))}
    </nav>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────
function SectionCard({ section, index }) {
  return (
    <div id={section.id} className="mkt-reveal-delayed" style={{
      background: 'var(--mkt-card-bg)',
      border: '1px solid var(--mkt-card-border)',
      borderRadius: 20,
      padding: 'clamp(24px, 4vw, 40px)',
      marginBottom: 16,
      boxShadow: 'var(--shadow-sm)',
      animationDelay: `${0.05 + (index % 5) * 0.07}s`,
      scrollMarginTop: 100,
    }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(1,118,211,0.12), rgba(0,194,203,0.08))',
          border: '1px solid rgba(1,118,211,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>
          {section.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mkt-primary)', letterSpacing: '0.1em', marginBottom: 4 }}>
            SECTION {section.number}
          </div>
          <h2 style={{ color: 'var(--mkt-text-heading)', fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', fontWeight: 800, margin: 0, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
            {section.title}
          </h2>
        </div>
      </div>

      {/* Content */}
      <div style={{ paddingLeft: 0 }}>
        {section.content.map((line, j) => {
          if (!line.trim()) return null;

          // Divider lines (em-dash)
          if (line.startsWith('—')) {
            return (
              <div key={j} style={{ margin: '20px 0 12px', borderTop: '1px solid var(--mkt-card-border)', paddingTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--mkt-primary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {line.slice(1).replace(/—/g, '').trim()}
                </div>
              </div>
            );
          }

          // Bullet points
          if (line.startsWith('• ')) {
            const text = line.slice(2);
            const parts = text.split(/(\*\*[^*]+\*\*)/g);
            return (
              <div key={j} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mkt-primary)', flexShrink: 0, marginTop: 8 }} />
                <p style={{ margin: 0, color: 'var(--mkt-text-muted)', lineHeight: 1.75, fontSize: '0.9rem' }}>
                  {parts.map((p, k) => p.startsWith('**') ? <strong key={k} style={{ color: 'var(--mkt-text-heading)', fontWeight: 700 }}>{p.replace(/\*\*/g, '')}</strong> : p)}
                </p>
              </div>
            );
          }

          // ALL-CAPS important paragraphs (disclaimers)
          if (line === line.toUpperCase() && line.length > 40) {
            return (
              <div key={j} style={{ background: 'rgba(186,5,23,0.04)', border: '1px solid rgba(186,5,23,0.12)', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
                <p style={{ margin: 0, color: '#9B0E1C', lineHeight: 1.7, fontSize: '0.82rem', fontWeight: 600 }}>{line}</p>
              </div>
            );
          }

          // Normal paragraph
          return (
            <p key={j} style={{ color: 'var(--mkt-text-muted)', lineHeight: 1.8, margin: '0 0 14px', fontSize: '0.92rem' }}>{line}</p>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function TermsPage() {
  const { theme } = useMarketingTheme();
  const [activeId, setActiveId] = useState('acceptance');

  useEffect(() => {
    if (!document.getElementById('marketing-css')) {
      const link = document.createElement('link'); link.id = 'marketing-css'; link.rel = 'stylesheet'; link.href = '/marketing.css';
      document.head.appendChild(link);
    }
    window.scrollTo(0, 0);
  }, []);

  // Intersection observer for active TOC item
  useEffect(() => {
    const ids = SECTIONS.map(s => s.id);
    const observers = [];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) setActiveId(id);
      }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  return (
    <div className="mkt-page" style={{
      fontFamily: 'var(--font-primary)',
      background: 'var(--mkt-section-bg)',
      color: 'var(--mkt-text)',
      minHeight: '100vh',
    }}>
      <MarketingNav />

      {/* ── Hero ── */}
      <section style={{
        background: 'var(--mkt-darker)',
        padding: 'clamp(100px, 14vw, 160px) 24px clamp(48px, 8vw, 80px)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(3,45,96,0.2) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(6,182,212,0.12) 0%, transparent 40%)', pointerEvents: 'none' }} />
        <div className="container mkt-reveal" style={{ position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 100, padding: '8px 20px', marginBottom: 24 }}>
            <span style={{ fontSize: 16 }}>⚖️</span>
            <span style={{ color: 'var(--mkt-accent)', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Legal Agreement</span>
          </div>
          <h1 style={{ color: '#fff', fontSize: 'clamp(2rem, 6vw, 3.6rem)', fontWeight: 900, margin: '0 0 16px', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Terms of Service
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(0.9rem, 2vw, 1.05rem)', margin: '0 0 24px' }}>
            Effective Date: 16 April 2026 &nbsp;·&nbsp; Version 2.0 &nbsp;·&nbsp; 20 Sections
          </p>
          {/* Quick stats */}
          <div style={{ display: 'inline-flex', gap: 'clamp(16px, 4vw, 40px)', flexWrap: 'wrap', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 'clamp(14px, 3vw, 20px) clamp(20px, 4vw, 40px)' }}>
            {[
              { label: 'Sections', value: '20' },
              { label: 'Data Categories', value: '8' },
              { label: 'Your Rights', value: '8' },
              { label: 'Jurisdiction', value: 'India' },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ color: '#fff', fontSize: 'clamp(1.2rem, 3vw, 1.8rem)', fontWeight: 900, lineHeight: 1 }}>{value}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <section style={{ padding: 'clamp(40px, 6vw, 80px) 24px clamp(60px, 10vw, 120px)' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>

          {/* Intro banner */}
          <div className="mkt-reveal" style={{ background: 'linear-gradient(135deg, rgba(1,118,211,0.08), rgba(0,194,203,0.05))', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 20, padding: 'clamp(20px, 4vw, 36px)', marginBottom: 32, display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 32, flexShrink: 0 }}>📜</div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 800, color: 'var(--mkt-text-heading)', fontSize: '1rem', marginBottom: 8 }}>Please Read Carefully</div>
              <p style={{ color: 'var(--mkt-text-muted)', lineHeight: 1.75, margin: 0, fontSize: '0.92rem' }}>
                This Terms of Service Agreement is a legally binding contract between you and TalentNest HR Technologies Private Limited. It governs your access to and use of the TalentNest HR recruitment management platform. It includes detailed provisions on what personal data we collect, how we store and process it, your rights, and our obligations under Indian law including the <strong>Information Technology Act 2000</strong> and the <strong>Digital Personal Data Protection Act 2023</strong>.
              </p>
            </div>
          </div>

          {/* Two-column layout: TOC (desktop) + content */}
          <div style={{ display: 'grid', gridTemplateColumns: 'clamp(180px, 20%, 240px) 1fr', gap: 'clamp(16px, 3vw, 40px)', alignItems: 'start' }}>

            {/* TOC — hidden on mobile, visible on ≥900px */}
            <div className="tn-toc-desktop">
              <TableOfContents sections={SECTIONS} activeId={activeId} />
            </div>

            {/* Section cards */}
            <div>
              {SECTIONS.map((section, i) => (
                <SectionCard key={section.id} section={section} index={i} />
              ))}

              {/* Bottom CTA */}
              <div className="mkt-reveal-delayed" style={{
                marginTop: 40, padding: 'clamp(24px, 4vw, 40px)',
                background: 'var(--mkt-surface-bg)', borderRadius: 20,
                border: '1px solid var(--mkt-card-border)', textAlign: 'center',
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
                <h3 style={{ color: 'var(--mkt-text-heading)', fontWeight: 800, marginBottom: 10, fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}>
                  Questions about these Terms?
                </h3>
                <p style={{ color: 'var(--mkt-text-muted)', marginBottom: 24, fontSize: '0.9rem', lineHeight: 1.7 }}>
                  Our Data Protection Officer is available to answer questions about data handling, your rights, or any provision in these Terms.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <a href="mailto:privacy@talentnesthr.com" className="btn btn-primary" style={{ borderRadius: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', fontSize: 14, fontWeight: 700 }}>
                    📧 Email Privacy Team
                  </a>
                  <Link to="/privacy" className="btn btn-outline" style={{ borderRadius: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', fontSize: 14, fontWeight: 700 }}>
                    🔏 Privacy Policy →
                  </Link>
                </div>
                <div style={{ marginTop: 20, color: 'var(--mkt-text-muted)', fontSize: 11 }}>
                  Last reviewed: 16 April 2026 &nbsp;·&nbsp; TalentNest HR Technologies Private Limited &nbsp;·&nbsp; CIN: U72900TG2024PTC000000
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile TOC — floating pill at bottom */}
      <div className="tn-toc-mobile" style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 500 }}>
        <div style={{ background: 'rgba(3,45,96,0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 100, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', whiteSpace: 'nowrap' }}>
          <span style={{ color: 'var(--mkt-accent)', fontSize: 12, fontWeight: 700 }}>⚖️ Section</span>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 600 }}>
            {SECTIONS.find(s => s.id === activeId)?.number} — {SECTIONS.find(s => s.id === activeId)?.title}
          </span>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .tn-toc-desktop { display: none !important; }
          .tn-toc-mobile  { display: block !important; }
          /* Single column on tablet/mobile */
          div[style*="clamp(180px, 20%, 240px) 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
        @media (min-width: 901px) {
          .tn-toc-mobile { display: none !important; }
          .tn-toc-desktop { display: block !important; }
        }
      `}</style>

      <MarketingFooter />
    </div>
  );
}
