import React, { useEffect } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import MarketingNav from './MarketingNav.jsx';
import MarketingFooter from './MarketingFooter.jsx';

// ─── Service Data ─────────────────────────────────────────────────────────────
const SERVICES = {
  'it-staffing': {
    icon: '💻',
    title: 'IT Staffing',
    tagline: 'Hire Engineers Who Actually Ship Code',
    heroDesc: 'We go beyond resumes. Every candidate we place is technically vetted, culture-aligned, and ready to contribute from day one — guaranteed within 5 business days.',
    accent: '#014486',
    gradient: 'linear-gradient(135deg, #0c1445 0%, #032D60 55%, #0854a0 100%)',
    coverImg: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1400&auto=format&fit=crop&q=70',
    overview: {
      headline: 'Technology Hiring Is Broken. We Fixed It.',
      body: `Most staffing firms send you 20 unqualified resumes and call it service. We send you 3 candidates — all vetted, all skilled, all ready. Our recruiters are former engineers and tech leads who understand what "senior" actually means, what clean code looks like, and what separates a 10x engineer from a resume padder.\n\nWhether you need a full-stack developer for a startup, a cloud architect for enterprise migration, or an entire engineering squad — we build your technical team with precision.`,
    },
    whyUs: [
      { icon: '🔍', title: 'Technical Pre-Screening', desc: 'Every candidate completes a live coding assessment or system design review before reaching you. We eliminate resume inflation at the source.' },
      { icon: '⚡', title: '5-Day Delivery Guarantee', desc: 'You receive your first curated shortlist within 5 business days of intake. Urgent roles can be fast-tracked to 48 hours.' },
      { icon: '🎯', title: 'Zero-Noise Pipeline', desc: 'We never send candidates we would not hire ourselves. Every submission is intentional, relevant, and ready to interview immediately.' },
    ],
    process: [
      { step: '01', icon: '📋', title: 'Role Deep-Dive', desc: 'We spend 30–45 minutes with your hiring manager understanding not just the JD but the team dynamics, tech stack, and what "success" looks like at 6 months.' },
      { step: '02', icon: '🎯', title: 'Smart + Human Sourcing', desc: 'Our smart matching engine scans 500,000+ profiles in real time. Our technical recruiters then manually review the top matches and conduct live screening calls.' },
      { step: '03', icon: '✅', title: 'Curated Shortlist of 3', desc: 'You receive 3 hand-picked candidates — never more, never less. Each profile includes a skill summary, culture notes, and our recommendation rationale.' },
      { step: '04', icon: '🚀', title: 'Hire, Onboard, Succeed', desc: 'We coordinate interviews, manage offer negotiations, handle background checks, and stay connected for 90 days post-hire to ensure a smooth start.' },
    ],
    roles: {
      title: 'Roles We Fill — Expertly',
      items: [
        '💻 Full-Stack Developers (React, Angular, Vue, Node.js, Django, Laravel)',
        '☁️ Cloud Engineers & Architects (AWS, Azure, GCP, Multi-Cloud)',
        '🔧 DevOps & Platform Engineers (Kubernetes, Terraform, CI/CD)',
        '📊 Data Engineers & Analytics Engineers (Spark, dbt, Snowflake)',
        '🤖 Machine Learning & AI Engineers (PyTorch, TensorFlow, LLMs)',
        '📱 Mobile Developers (iOS Swift, Android Kotlin, React Native, Flutter)',
        '🔐 Backend Engineers (Java, Python, Go, Rust, .NET)',
        '🧪 QA & Test Automation Engineers (Selenium, Cypress, Playwright)',
        '🏗️ Software Architects & Tech Leads',
        '📦 Embedded & Firmware Engineers (C, C++, RTOS)',
      ],
    },
    guarantees: [
      { icon: '🔁', title: '30-Day Replacement Guarantee', desc: 'If a placed candidate does not work out within the first 30 days, we replace them at zero additional cost. No questions asked.' },
      { icon: '💰', title: 'Transparent Pricing', desc: 'Flat-fee or percentage-based billing with no hidden costs, no markup surprises, and no vendor lock-in. What we quote is what you pay.' },
      { icon: '🤝', title: 'Dedicated Technical Recruiter', desc: 'You get one point of contact who understands your tech stack and your culture — not a rotating call centre team.' },
      { icon: '📈', title: '94% Offer Acceptance Rate', desc: 'Because we pre-qualify candidates on compensation, timeline, and genuine interest before you spend a single hour interviewing.' },
    ],
    stats: [
      { num: '94%', label: 'Offer Acceptance Rate' },
      { num: '5 Days', label: 'Average Time to Shortlist' },
      { num: '30-Day', label: 'Replacement Guarantee' },
      { num: '20+', label: 'IT Placements Made' },
    ],
    faqs: [
      { q: 'How quickly can you find a software engineer?', a: 'For most roles we deliver a shortlist within 5 business days. For urgent or high-volume needs, we offer a 48-hour fast-track option.' },
      { q: 'Do you handle both contract and permanent IT roles?', a: 'Yes — we place engineers on full-time, contract, C2H, and C2C arrangements depending on your hiring structure.' },
      { q: 'What if the candidate does not pass probation?', a: 'We offer a 30-day free replacement guarantee on all permanent placements. For contract roles, we can swap within 5 business days.' },
      { q: 'Can you build an entire team, not just one role?', a: 'Absolutely. We have delivered full engineering squads (5–20 people) for product launches, platform migrations, and startup scaling initiatives.' },
    ],
  },

  'cybersecurity': {
    icon: '🔐',
    title: 'Cybersecurity Staffing',
    tagline: 'Your Security Is Only as Strong as Your Team',
    heroDesc: 'Cybersecurity talent is the rarest and most misrepresented in the market. We vet every candidate through a security-specific lens — certifications, live scenarios, and real-world incident experience.',
    accent: '#BA0517',
    gradient: 'linear-gradient(135deg,#1a0505,#3d0a0a,#7f1d1d)',
    coverImg: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1400&auto=format&fit=crop&q=70',
    overview: {
      headline: 'Certifications Are Not Experience. We Know the Difference.',
      body: `Anyone can put "CISSP" on a resume. Only a handful of recruiters can tell the difference between a checkbox credential-holder and a practitioner who has actually defended a network under fire.\n\nOur cybersecurity recruiters are former security professionals — SOC analysts, pen testers, and GRC practitioners who understand the difference between a Tier 1 alert handler and a true threat hunter. We ask the questions that matter before you ever see a profile.`,
    },
    whyUs: [
      { icon: '🛡️', title: 'Security-Specialist Recruiters', desc: 'Our team includes former SOC leads and security architects. We conduct scenario-based phone screens that filter out credential collectors from real practitioners.' },
      { icon: '🔎', title: 'Clearance & Background Verified', desc: 'We handle all background checks, security clearance verification (DoD, TS/SCI), and right-to-work compliance before submission.' },
      { icon: '⚡', title: 'Urgent Incident Response Staffing', desc: 'Need an IR team on-site within 24 hours? We maintain a ready bench of incident responders, forensics specialists, and crisis communicators.' },
    ],
    process: [
      { step: '01', icon: '🔍', title: 'Security Role Assessment', desc: 'We analyse your threat landscape, compliance requirements, and security posture to define exactly what skill set you need — not just what the JD says.' },
      { step: '02', icon: '🧠', title: 'Scenario-Based Screening', desc: 'Candidates face practical security scenarios, tool knowledge tests, and situational judgment questions before reaching your desk.' },
      { step: '03', icon: '📂', title: 'Verified Profile Delivery', desc: 'You receive fully background-checked, credential-verified profiles with our technical assessment scores and detailed capability notes.' },
      { step: '04', icon: '🚀', title: 'Seamless Onboarding', desc: 'We manage clearance paperwork, equipment provisioning coordination, and 90-day check-ins to confirm your new security hire is embedded and effective.' },
    ],
    roles: {
      title: 'Security Roles We Place',
      items: [
        '🛡️ SOC Analysts — Tier 1, Tier 2, Tier 3',
        '🔴 Red Team Operators & Penetration Testers (OSCP, CEH)',
        '🔵 Blue Team & Threat Hunters',
        '📋 GRC & Compliance Specialists (ISO 27001, SOC 2, NIST)',
        '☁️ Cloud Security Architects (AWS, Azure, GCP Security)',
        '🔑 Identity & Access Management (IAM, PAM, Okta, CyberArk)',
        '🚨 Incident Response & Digital Forensics Investigators',
        '🏛️ CISO, Deputy CISO & Virtual CISO (vCISO)',
        '📡 Network Security Engineers (Firewall, SIEM, IDS/IPS)',
        '🧾 Security Awareness & Training Specialists',
      ],
    },
    guarantees: [
      { icon: '🔁', title: '45-Day Replacement Guarantee', desc: 'Security roles require adaptation time. We extend our replacement window to 45 days for all cybersecurity placements.' },
      { icon: '🕐', title: '24-Hour Incident Response Bench', desc: 'For emergency IR engagements, we can mobilise a vetted responder within 24 hours anywhere in the continental US.' },
      { icon: '🏅', title: 'Credential & Certification Verified', desc: 'Every certification listed on a candidate profile is independently verified by our team before submission. Zero exaggeration tolerated.' },
      { icon: '🤝', title: 'Dedicated Security Recruiter', desc: 'One specialist owns your account from intake to placement. They speak your language — SIEM, SOAR, zero-trust, MITRE ATT&CK.' },
    ],
    stats: [
      { num: '48 Hrs', label: 'Emergency IR Deployment' },
      { num: '100%', label: 'Credential Verification' },
      { num: '45-Day', label: 'Replacement Guarantee' },
      { num: '15+', label: 'Security Placements' },
    ],
    faqs: [
      { q: 'Can you find candidates with active security clearances?', a: 'Yes. We maintain relationships with cleared professionals across TS, TS/SCI, and Secret levels. Clearance-required roles are our specialty.' },
      { q: 'How do you verify certifications like CISSP or OSCP?', a: 'We directly verify credentials through the issuing bodies (ISC2, Offensive Security, CompTIA) and cross-reference against public verification portals.' },
      { q: 'Can you staff an entire SOC for a new security program?', a: 'Yes. We have built full SOC teams from scratch — analysts, leads, SIEM engineers, and management — for financial services, healthcare, and government clients.' },
      { q: 'Do you handle vCISO placements for smaller companies?', a: 'Absolutely. For companies not ready for a full-time CISO, we place experienced vCISOs on part-time retainer or fractional engagement models.' },
    ],
  },

  'non-it-staffing': {
    icon: '🏢',
    title: 'Non-IT Staffing',
    tagline: 'Every Great Company Runs on Great People — In Every Department',
    heroDesc: 'Beyond the tech team, your operations, finance, HR, and sales functions need the same quality of talent. We bring the same rigour and speed to every non-technical hire across your organisation.',
    accent: '#10b981',
    gradient: 'linear-gradient(135deg,#022c22,#064e3b,#065f46)',
    coverImg: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1400&auto=format&fit=crop&q=70',
    overview: {
      headline: 'The Support Functions That Drive Your Core Business',
      body: `Technical talent gets all the attention, but it is the finance manager who keeps the runway clean, the HR lead who builds your culture, and the sales director who closes the deals that matter. Non-IT roles are not secondary — they are the backbone of every successful organisation.\n\nWe bring the same structured, quality-first approach to business and professional roles as we do to engineering. That means proper competency mapping, cultural alignment interviews, and reference checks before you see a single profile.`,
    },
    whyUs: [
      { icon: '🎯', title: 'Function-Specific Recruiters', desc: 'Our team is divided by vertical — finance, HR, operations, sales, marketing, and executive. You speak to a specialist, not a generalist.' },
      { icon: '🧩', title: 'Culture & Competency Mapping', desc: 'Every hire is evaluated against your company values, team dynamics, and growth trajectory. We do not place people who will leave in 90 days.' },
      { icon: '📊', title: 'Structured Reference Checks', desc: 'We conduct live reference calls on your behalf, with structured behavioural questions validated against the role requirements.' },
    ],
    process: [
      { step: '01', icon: '🗂️', title: 'Role & Culture Brief', desc: 'We learn your business model, team structure, management style, and the specific outcomes the new hire must deliver in their first 6 months.' },
      { step: '02', icon: '🔍', title: 'Targeted Talent Search', desc: 'Using industry networks, referrals, and our talent database, we identify candidates with the exact functional experience and cultural profile you need.' },
      { step: '03', icon: '📞', title: 'Competency Interviews', desc: 'We conduct structured behavioural interviews using STAR methodology, assessing for both hard skills and leadership potential.' },
      { step: '04', icon: '✅', title: 'Reference-Checked Submission', desc: 'Only candidates who have passed our competency assessment and received positive live references are submitted for your review.' },
    ],
    roles: {
      title: 'Business Functions We Staff',
      items: [
        '💰 Finance & Accounting — CFO, Controller, FP&A Analyst, Accountant',
        '👥 Human Resources — CHRO, HR Business Partner, Talent Acquisition Lead',
        '📦 Operations & Supply Chain — COO, Operations Manager, Logistics Coordinator',
        '📈 Sales & Business Development — VP Sales, Account Executive, SDR',
        '📣 Marketing & Brand — CMO, Digital Marketing Manager, Content Strategist',
        '🏥 Healthcare & Clinical Administration',
        '⚖️ Legal & Compliance — General Counsel, Compliance Officer, Paralegal',
        '🎓 Learning & Development — L&D Manager, Corporate Trainer',
        '🤝 Customer Success & Support — CS Manager, Implementation Specialist',
        '👔 Executive & C-Suite Placements — CEO, COO, CFO, CMO',
      ],
    },
    guarantees: [
      { icon: '🔁', title: '60-Day Replacement Guarantee', desc: 'Business roles require longer ramp time. We offer a 60-day replacement on all permanent non-IT placements — the longest in the market.' },
      { icon: '🌡️', title: '90-Day Culture Check-In', desc: 'We call both you and the placed candidate at 30, 60, and 90 days to ensure the integration is on track and address any early concerns.' },
      { icon: '📞', title: 'Live Reference Verification', desc: 'No automated reference forms. We personally call every referee and document responses against a structured evaluation framework.' },
      { icon: '🏆', title: 'Retention Focus', desc: '87% of our non-IT placements are still in role after 12 months. We achieve this by getting the culture fit right, not just the skill fit.' },
    ],
    stats: [
      { num: '87%', label: '12-Month Retention Rate' },
      { num: '60-Day', label: 'Replacement Guarantee' },
      { num: '20+', label: 'Business Placements' },
      { num: '8', label: 'Functional Verticals' },
    ],
    faqs: [
      { q: 'Do you place executive and C-suite roles?', a: 'Yes. We conduct executive search for VP, C-suite, and board-level positions using a confidential, research-led approach with a dedicated partner.' },
      { q: 'Can you find industry-specific non-IT talent (e.g., healthcare admin, legal)?', a: 'Absolutely. We have specialist desks for healthcare operations, legal & compliance, education, and financial services non-IT functions.' },
      { q: 'How long does a typical non-IT placement take?', a: 'Standard roles are shortlisted within 7–10 business days. Executive searches typically take 3–6 weeks for a fully researched, reference-checked shortlist.' },
      { q: 'Do you offer interim or temporary staffing for non-IT roles?', a: 'Yes. We place interim executives, project-based contractors, and temporary cover for maternity/parental leave or critical business transitions.' },
    ],
  },

  'c2h': {
    icon: '🔄',
    title: 'Contract to Hire',
    tagline: 'Try Before You Hire. Zero Risk. Maximum Confidence.',
    heroDesc: 'A bad permanent hire costs 3–5x the annual salary in lost time, rehiring, and team disruption. Contract to Hire eliminates that risk entirely — you evaluate on the job before making any long-term commitment.',
    accent: '#F59E0B',
    gradient: 'linear-gradient(135deg,#1a1000,#3d2800,#78350f)',
    coverImg: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1400&auto=format&fit=crop&q=70',
    overview: {
      headline: 'The Smartest Way to Build a Permanent Team in 2025',
      body: `Hiring permanently has never been riskier. Culture fit is hard to assess in interviews. Technical depth is hard to fake for 3 months. And business needs change faster than ever.\n\nContract to Hire solves all three problems. The candidate works as a contractor for an agreed trial period (typically 3–6 months), you evaluate their real-world performance, and then you make an informed, confident decision to convert them to full-time — or not. No guesswork. No regret hires.`,
    },
    whyUs: [
      { icon: '⚖️', title: 'Full Contractor Administration', desc: 'We handle all payroll, benefits, compliance, and tax withholding for the contractor period. You see results — we handle the paperwork.' },
      { icon: '🔄', title: 'Flexible Trial Periods', desc: 'Standard engagements run 3–6 months, but we structure terms to match your business cycle. Extensions and early conversions are both straightforward.' },
      { icon: '🎯', title: 'Conversion-Ready Candidates', desc: 'We only place candidates who are genuinely open to permanent conversion. We pre-qualify on compensation expectations, relocation, and long-term goals before day one.' },
    ],
    process: [
      { step: '01', icon: '📋', title: 'Define Your Evaluation Criteria', desc: 'Before sourcing begins, we help you establish clear 30/60/90-day success milestones so the evaluation is objective and legally defensible from the start.' },
      { step: '02', icon: '🔍', title: 'Source Conversion-Ready Talent', desc: 'We source candidates who are actively seeking permanent opportunities and interested in the C2H path — eliminating candidates who will leave at contract end.' },
      { step: '03', icon: '📝', title: 'Contractor Placement & Administration', desc: 'We manage all onboarding paperwork, compliance documentation, payroll, and benefits during the contract period. Zero administrative burden on your team.' },
      { step: '04', icon: '✅', title: 'Confident Permanent Conversion', desc: 'At conversion, we facilitate the transition from contractor to employee — offer letters, background checks, and benefits enrolment — making it seamless for everyone.' },
    ],
    roles: {
      title: 'Ideal for These Engagements',
      items: [
        '💻 Software Engineers for product-critical roles',
        '📊 Data Analysts & BI Developers',
        '☁️ Cloud & Infrastructure Engineers',
        '🎨 UX/UI Designers & Product Managers',
        '🔐 Security Analysts during program builds',
        '💰 Finance Managers during growth phases',
        '📈 Marketing Managers for campaign launches',
        '👥 HR Business Partners during restructuring',
        '🏭 Operations Managers for new site launches',
        '🤝 Customer Success Leads during scale-up',
      ],
    },
    guarantees: [
      { icon: '📄', title: 'Contract Administration Included', desc: 'All payroll, tax filings, benefits management, and compliance for the contractor period are handled by us at no additional cost.' },
      { icon: '🔄', title: 'Free Replacement if Not Converting', desc: 'If the candidate is not a fit and you choose not to convert, we provide a replacement contractor within 7 business days — at zero replacement fee.' },
      { icon: '💬', title: 'Mid-Contract Performance Check', desc: 'At the halfway point of each engagement, we conduct a structured check-in with both parties to surface any issues early and course-correct before conversion decisions.' },
      { icon: '⚡', title: 'Early Conversion Supported', desc: 'Fallen in love with the candidate at month one? We fully support early conversions with no penalty and expedited transition documentation.' },
    ],
    stats: [
      { num: '78%', label: 'Contract-to-Hire Conversion Rate' },
      { num: '7 Days', label: 'Replacement if No-Convert' },
      { num: '3–6 Mo', label: 'Standard Trial Periods' },
      { num: '100%', label: 'Contractor Admin Handled' },
    ],
    faqs: [
      { q: 'Who pays the contractor during the trial period?', a: 'We act as the employer of record during the contract period. You pay us a weekly or bi-weekly agency rate that covers the contractor pay, our admin fees, and employer taxes.' },
      { q: 'Is there a conversion fee when we hire permanently?', a: 'Yes — a conversion fee applies, which we clearly state upfront. However, any agency fees paid during the contract period are typically credited against the conversion fee.' },
      { q: 'What if the candidate resigns during the contract period?', a: 'We provide a free replacement within 7 business days and absorb any gap period administration costs.' },
      { q: 'Can we shorten or extend the trial period?', a: 'Absolutely. Trial periods can be shortened by mutual agreement or extended (up to 12 months) if more time is needed to evaluate for a senior role.' },
    ],
  },

  'c2c': {
    icon: '🤝',
    title: 'Corp to Corp (C2C)',
    tagline: 'Business-to-Business Contracting Done Right',
    heroDesc: 'Corp to Corp is the preferred engagement model for independent consultants, boutique firms, and specialist vendors. We manage the entire business relationship — compliance, billing, contracts, and coordination — so you focus on results.',
    accent: '#014486',
    gradient: 'linear-gradient(135deg, #032D60 0%, #014486 55%, #0176D3 100%)',
    coverImg: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1400&auto=format&fit=crop&q=70',
    overview: {
      headline: 'The C2C Model, Simplified and Compliant',
      body: `Corp to Corp is powerful — but it is also full of compliance traps, misclassification risks, and invoicing headaches. Most companies either avoid it entirely or manage it badly, exposing themselves to IRS and DOL scrutiny.\n\nWe have handled hundreds of C2C arrangements across industries. We know how to structure compliant engagements, verify legitimate business entities, negotiate SOW terms, and manage consolidated billing across multiple vendors — so the model delivers its full flexibility without the risk.`,
    },
    whyUs: [
      { icon: '🏛️', title: 'Full Compliance Management', desc: 'We verify business entity legitimacy (EIN, state registration, liability insurance), assess misclassification risk, and ensure every C2C arrangement meets IRS IC tests.' },
      { icon: '📋', title: 'SOW & Contract Drafting', desc: 'Our legal-approved Statement of Work templates protect both parties clearly defining deliverables, timelines, IP ownership, and exit clauses.' },
      { icon: '📊', title: 'Consolidated Vendor Billing', desc: 'We act as your single point of contact for multiple C2C vendors — one invoice, one relationship, one set of compliance documentation.' },
    ],
    process: [
      { step: '01', icon: '🔍', title: 'Vendor Vetting & Verification', desc: 'We verify the vendor entity — EIN confirmation, state business registration, general liability and E&O insurance, and IRS independent contractor qualification check.' },
      { step: '02', icon: '📝', title: 'SOW Drafting & Agreement', desc: 'We draft a clear Statement of Work that defines project scope, deliverables, acceptance criteria, payment milestones, and IP assignment.' },
      { step: '03', icon: '🤝', title: 'Engagement Setup & Onboarding', desc: 'We set up all system access, NDA execution, security onboarding, and invoice/billing infrastructure before the engagement begins.' },
      { step: '04', icon: '📊', title: 'Ongoing Management & Billing', desc: 'We manage milestone tracking, invoice processing, compliance renewals (insurance certificates, W-9 updates), and performance reviews throughout the engagement.' },
    ],
    roles: {
      title: 'C2C Engagements We Manage',
      items: [
        '💻 Independent Software Consultants & Architects',
        '☁️ Cloud & Infrastructure Consulting Firms',
        '🔐 Cybersecurity Boutique Consultancies',
        '📊 Data Analytics & BI Consulting Firms',
        '🎨 UX/Product Design Studios',
        '📈 Digital Marketing & SEO Agencies',
        '⚖️ Legal & Compliance Consulting Firms',
        '💰 Financial Advisory & CFO Services',
        '🏗️ Project Management Consultancies',
        '🤖 AI & ML Research & Development Firms',
      ],
    },
    guarantees: [
      { icon: '✅', title: 'Zero Misclassification Risk', desc: 'Our compliance team conducts a full IRS IC test and DOL economic realities analysis before any C2C engagement begins. We absorb the compliance risk, not you.' },
      { icon: '📄', title: 'SOW Templates at No Cost', desc: 'All contract templates, SOW frameworks, and amendment documents are prepared by our team at no additional legal cost to you.' },
      { icon: '🔄', title: 'Vendor Substitution Flexibility', desc: 'If a C2C vendor needs to substitute a resource, we manage the transition, re-verification, and onboarding of the new individual within the vendor entity.' },
      { icon: '📊', title: 'Monthly Compliance Audit', desc: 'We conduct a monthly audit of all active C2C engagements to ensure insurance certificates are current, SOW scope is on track, and billing is accurate.' },
    ],
    stats: [
      { num: '0%', label: 'Compliance Violation Rate' },
      { num: '100%', label: 'Vendor Entity Verified' },
      { num: '48 Hrs', label: 'SOW Turnaround' },
      { num: '10+', label: 'Active C2C Vendors Managed' },
    ],
    faqs: [
      { q: 'What is the difference between C2C and W-2 contracting?', a: 'In C2C, the contractor operates through their own business entity (LLC or S-Corp) and invoices your company directly (or through us). W-2 contractors are paid as employees by the staffing firm. C2C offers more flexibility but requires more compliance diligence.' },
      { q: 'How do you prevent worker misclassification issues?', a: 'We conduct a full IRS Independent Contractor test and DOL economic realities analysis for every C2C vendor. We also ensure proper SOW structure, deliverable-based billing, and no behavioural control provisions in contracts.' },
      { q: 'Can you manage C2C vendors across multiple states?', a: 'Yes. We are familiar with state-specific registration requirements, unemployment insurance considerations, and nexus rules across all 50 states.' },
      { q: 'What insurance requirements do C2C vendors need to meet?', a: 'We require General Liability (minimum $1M per occurrence), Professional E&O (for technology roles), and where applicable, Workers Compensation and Cyber Liability coverage.' },
    ],
  },

  'hrms-platform': {
    icon: '⚙️',
    title: 'HRMS Platform',
    tagline: 'Your Entire HR Operation — One Intelligent Platform',
    heroDesc: 'Stop managing hiring in spreadsheets and email threads. Our HRMS platform powered by Faceify automates your entire hiring pipeline from job posting to offer letter — built for companies that want to hire smarter, faster, and better.',
    accent: '#0176D3',
    gradient: 'linear-gradient(135deg, #0c1445 0%, #032D60 55%, #0176D3 100%)',
    coverImg: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1400&auto=format&fit=crop&q=70',
    overview: {
      headline: 'HR Technology That Actually Works the Way You Do',
      body: `Most HR software is built for enterprise IT budgets and requires a 6-month implementation. TalentNest HRMS is different — you are live in 24 hours, your team learns it in under an hour, and it handles every stage of the hiring lifecycle without requiring a dedicated administrator.\n\nFrom advanced resume parsing and candidate matching to automated interview scheduling, offer letter generation, and real-time analytics — everything your recruiting team needs is in one place.`,
    },
    whyUs: [
      { icon: '📊', title: 'Technology-backed matching', desc: 'Our advanced matching engine scores every candidate against your job requirements, team culture, and success patterns — instantly surfacing the best fits.' },
      { icon: '🚀', title: '24-Hour Go-Live', desc: 'No implementation consultants, no 6-month projects. You create your account, invite your team, and post your first job — all within 24 hours of sign-up.' },
      { icon: '📊', title: 'Real-Time Hiring Analytics', desc: 'Live dashboards show you funnel health, recruiter performance, time-to-hire by role, offer acceptance rates, and candidate source attribution in real time.' },
    ],
    process: [
      { step: '01', icon: '⚡', title: 'Instant Setup', desc: 'Create your company account, configure your hiring stages, and invite your recruiters. The platform is ready for your first job posting in under 30 minutes.' },
      { step: '02', icon: '📄', title: 'Post Jobs & Source Candidates', desc: 'Post roles to your careers page, accept applications via link, or use our smart sourcing tools to find passive candidates. Upload resumes for instant data extraction.' },
      { step: '03', icon: '🔄', title: 'Manage the Full Pipeline', desc: 'Move candidates through your custom hiring stages, schedule interviews, send automated updates, and collaborate with your team — all in one unified view.' },
      { step: '04', icon: '✅', title: 'Hire, Analyse & Improve', desc: 'Issue offer letters, onboard new hires, and review your hiring analytics to continuously improve conversion rates and reduce time-to-fill on every role.' },
    ],
    roles: {
      title: 'Platform Features',
      items: [
        '📄 Resume Parsing — extracts skills, experience, and profile in seconds',
        '🎯 Job Matching — scores and ranks candidates against each role',
        '📋 Custom Pipeline Stages — build your own hiring workflow',
        '📅 Interview Scheduling — automated calendar coordination and reminders',
        '📧 Candidate Email Automation — personalised status updates at every stage',
        '📊 Real-Time Analytics Dashboard — KPIs, funnel stats, recruiter metrics',
        '👥 Multi-Role Access — candidate, recruiter, admin, and super-admin views',
        '🌐 Public Careers Page — branded job board for direct candidate applications',
        '📄 Offer Letter Generation — templated, digital, and trackable',
        '🔐 SOC 2-Grade Security — JWT auth, encrypted storage, HTTPS everywhere',
      ],
    },
    guarantees: [
      { icon: '⚡', title: '24-Hour Deployment', desc: 'We guarantee your platform is fully configured and live within 24 hours of sign-up. No waiting for IT, no lengthy implementation timelines.' },
      { icon: '📞', title: 'Onboarding Support Included', desc: 'Every account gets a 60-minute onboarding call with our product team to configure pipelines, train your recruiters, and answer every question before go-live.' },
      { icon: '🔒', title: 'Data Ownership Guaranteed', desc: 'Your candidate data, job data, and hiring history belong to you. Export at any time in standard formats. We never use your data for training or third-party sharing.' },
      { icon: '📈', title: '30-Day ROI or Free Extension', desc: 'If you do not see measurable improvement in hiring speed or quality within the first 30 days, we extend your subscription at no charge until you do.' },
    ],
    stats: [
      { num: '60%', label: 'Reduction in Time-to-Hire' },
      { num: '24 Hrs', label: 'Platform Go-Live' },
      { num: '3x', label: 'Faster Candidate Screening' },
      { num: '99.9%', label: 'Platform Uptime' },
    ],
    faqs: [
      { q: 'Is the HRMS platform only for companies that use TalentNest staffing?', a: 'No. The HRMS platform is a standalone product. You can use it independently of our staffing services, or combine both for maximum impact.' },
      { q: 'Does it integrate with our existing ATS or HRIS?', a: 'We offer data import/export and open API access on professional plans. Common integrations include BambooHR, Workday, Greenhouse, and Slack.' },
      { q: 'How is candidate data protected?', a: 'All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We are SOC 2 Type II compliant and GDPR-ready for European data subjects.' },
      { q: 'Can multiple recruiters work on the same pipeline simultaneously?', a: 'Yes. The platform supports unlimited recruiter seats, real-time collaboration, stage ownership assignment, and full audit trails of every action taken.' },
    ],
  },

  'permanent-staffing': {
    icon: '🎯',
    title: 'Permanent Staffing',
    tagline: 'Your Next Great Hire — Guaranteed to Stay',
    heroDesc: 'Direct permanent placement for roles that demand long-term commitment. We source, vet, and deliver culture-aligned candidates ready for growth — backed by our 90-day replacement guarantee on every hire.',
    accent: '#0369a1',
    gradient: 'linear-gradient(135deg, #0c1628 0%, #0a2540 55%, #0369a1 100%)',
    coverImg: 'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=1400&auto=format&fit=crop&q=70',
    overview: {
      headline: 'Permanent Hiring Is Your Most Important Business Decision',
      body: `Every permanent hire shapes your culture, your velocity, and your bottom line. A wrong hire costs 3–5x the annual salary in lost productivity, rehiring costs, and team disruption.\n\nPermanent staffing is not about filling seats — it is about finding people who stay, grow, and contribute for years. We invest the time upfront — in role clarity, cultural mapping, technical validation, and reference verification — so you get hires you are proud of 18 months later, not 18 weeks later.`,
    },
    whyUs: [
      { icon: '🎯', title: 'Culture-First Matching', desc: 'We map your team dynamics, leadership style, and values — then match candidates against all four dimensions before you see a single profile.' },
      { icon: '✅', title: 'Three-Stage Vetting', desc: 'Every candidate passes a skills assessment, a structured competency interview, and live reference calls before reaching your desk. No shortcuts.' },
      { icon: '🔒', title: '90-Day Replacement Guarantee', desc: 'If your hire does not work out in the first 90 days, we replace them at zero additional cost. No conditions, no questions asked.' },
    ],
    process: [
      { step: '01', icon: '📋', title: 'Deep Role & Culture Brief', desc: 'A 45-minute intake to understand not just the job spec, but the team, management style, and what "thriving in this role" looks like at 12 months.' },
      { step: '02', icon: '🔍', title: 'Targeted Search & Screening', desc: 'We combine active sourcing, passive outreach, and our talent network. Every candidate passes a structured skills and competency screen before being shortlisted.' },
      { step: '03', icon: '👥', title: 'Curated Shortlist of 3', desc: 'You receive 3 fully vetted candidates — with skill notes, culture commentary, reference feedback, and our recommendation rationale. No padding, no noise.' },
      { step: '04', icon: '🚀', title: 'Offer, Onboard & Succeed', desc: 'We manage offer negotiations, background checks, reference confirmations, and 30/60/90-day post-hire check-ins to ensure a smooth integration.' },
    ],
    roles: {
      title: 'Permanent Roles We Fill',
      items: [
        '💻 Software Engineers — Full-Stack, Backend, Frontend (All Stacks)',
        '☁️ Cloud & DevOps Engineers (AWS, Azure, GCP, Kubernetes)',
        '🔐 Cybersecurity Analysts, Engineers & Architects',
        '📊 Data Analysts, Engineers & Scientists',
        '👥 HR Leaders — CHRO, HRBP, Talent Acquisition Leads',
        '💰 Finance & Accounting — CFO, Controller, FP&A Analyst',
        '📈 Sales & Business Development — VP Sales, Account Executives',
        '🏭 Operations & Supply Chain Managers',
        '🎨 Product Managers & UX/UI Designers',
        '👔 C-Suite & Executive Placements (CEO, COO, CTO, CMO)',
      ],
    },
    guarantees: [
      { icon: '🔁', title: '90-Day Free Replacement', desc: 'Our permanent placements come with a full 90-day guarantee. If the hire does not work out, we replace at zero cost — the strongest guarantee in the market.' },
      { icon: '📞', title: '30/60/90-Day Check-Ins', desc: 'We call both you and the placed candidate at 30, 60, and 90 days post-hire to catch any integration issues early and ensure a smooth long-term start.' },
      { icon: '🤝', title: 'Dedicated Placement Partner', desc: 'One senior consultant manages your account from brief to hire — no handoffs, no call centres. You always speak to the person doing the work.' },
      { icon: '📊', title: '89% 12-Month Retention Rate', desc: 'Because we get the culture fit right, not just the skills fit. Our placements stay — 89% of permanent hires are still in role after 12 months.' },
    ],
    stats: [
      { num: '90-Day', label: 'Replacement Guarantee' },
      { num: '89%', label: '12-Month Retention Rate' },
      { num: '7 Days', label: 'Avg. Time to Shortlist' },
      { num: '100+', label: 'Permanent Placements' },
    ],
    faqs: [
      { q: 'What types of companies do you place permanently?', a: 'We work with startups, scale-ups, SMEs, and enterprise clients across IT, finance, HR, operations, and executive functions — any company that values quality over volume.' },
      { q: 'How is permanent staffing different from C2H?', a: 'With permanent staffing, the candidate is hired directly as a full-time employee from day one. C2H starts as a contract with an option to convert. Permanent is faster to commit but lower risk when done correctly — which is where our vetting process comes in.' },
      { q: 'What is included in the 90-day guarantee?', a: 'If the candidate resigns or is let go for performance reasons within 90 days of their start date, we provide a free replacement search with no additional fee.' },
      { q: 'How long does a typical permanent hire take?', a: 'For mid-level roles, we deliver a shortlist in 7 business days. Senior or executive searches typically take 2–4 weeks for a fully researched, reference-verified shortlist.' },
    ],
  },
};

// ─── Shared Layout Component ──────────────────────────────────────────────────
function ServicePage({ data }) {
  const { icon, title, tagline, heroDesc, accent, coverImg, overview, whyUs, process, roles, guarantees, stats, faqs } = data;

  useEffect(() => {
    if (!document.getElementById('marketing-css')) {
      const link = document.createElement('link');
      link.id = 'marketing-css'; link.rel = 'stylesheet'; link.href = '/marketing.css';
      document.head.appendChild(link);
    }
    window.scrollTo(0, 0);
  }, [title]);

  return (
    <div className="mkt-page" style={{ fontFamily: "var(--font-primary)", background: "var(--mkt-section-bg)", color: "var(--mkt-text)" }}>
      <MarketingNav active="services" />

      {/* ── HERO ── */}
      <section style={{ 
        background: "var(--mkt-darker)", 
        padding: '180px 0 120px', 
        position: 'relative', 
        overflow: 'hidden' 
      }}>
        {coverImg && <div style={{ position:'absolute', inset:0, backgroundImage:`url(${coverImg})`, backgroundSize:'cover', backgroundPosition:'center', opacity:0.12, mixBlendMode:'luminosity' }} />}
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 20% 50%, rgba(3,45,96,0.2) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(6,182,212,0.15) 0%, transparent 40%)' }} />
        
        <div className="container mkt-reveal" style={{ position:'relative', zIndex:1 }}>
          <div style={{ maxWidth: 800 }}>
            <Link to="/services" style={{ display:'inline-flex', alignItems:'center', gap:8, color:'var(--mkt-text-on-dark-muted, rgba(255,255,255,0.6))', fontSize:'0.9rem', fontWeight: 600, textDecoration:'none', marginBottom:40, transition:'color 0.2s' }}
              onMouseEnter={e=>e.currentTarget.style.color='#fff'}
              onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.6)'}>
              ← Back to All Services
            </Link>
            
            <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:32 }}>
              <div className="mkt-glass" style={{ width:72, height:72, borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.2rem', flexShrink:0, border: '1px solid rgba(255,255,255,0.2)' }}>{icon}</div>
              <span className="section-tag" style={{ margin: 0, background: 'rgba(255,255,255,0.05)', color: 'var(--mkt-accent)', borderColor: 'rgba(6,182,212,0.3)' }}>
                {title}
              </span>
            </div>
            
            <h1 style={{ color:'#ffffff', fontSize:'clamp(2.5rem,6vw,4rem)', fontWeight: 900, lineHeight:1.1, margin:'0 0 24px', letterSpacing: '-0.03em' }}>
              {tagline}
            </h1>
            <p style={{ color:'rgba(255,255,255,0.7)', fontSize:'1.2rem', lineHeight:1.8, marginBottom:48, maxWidth:680 }}>
              {heroDesc}
            </p>
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              <Link to="/contact" className="btn btn-primary btn-lg" style={{ borderRadius: 14 }}>
                Get Started Today →
              </Link>
              <Link to="/careers" className="btn btn-secondary btn-lg" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>
                View Talent Pool
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── OVERVIEW ── */}
      <section className="section" style={{ background:'var(--mkt-section-bg)' }}>
        <div className="container">
          <div className="grid-2 mkt-reveal" style={{ alignItems:'center', gap:80 }}>
            <div>
              <span className="section-tag">Value Proposition</span>
              <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)', fontWeight:900, color:'var(--mkt-text-heading)', lineHeight:1.15, marginBottom:24, letterSpacing: '-0.02em' }}>
                {overview.headline}
              </h2>
              {overview.body.split('\n\n').map((para, i) => (
                <p key={i} style={{ color:'var(--mkt-text-muted)', fontSize:'1.05rem', lineHeight:1.8, marginBottom:20 }}>{para}</p>
              ))}
              <Link to="/contact" className="btn btn-primary" style={{ marginTop:12, borderRadius: 12 }}>
                Speak to a Specialist →
              </Link>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
              {coverImg && (
                <div style={{ height:280, borderRadius:24, overflow:'hidden', marginBottom:8, boxShadow:'var(--shadow-xl)', border: '1px solid var(--mkt-card-border)' }}>
                  <img src={coverImg} alt={title} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                </div>
              )}
              {whyUs.map((w, idx) => (
                <div key={w.title} className="mkt-card-hover" style={{ display:'flex', gap:20, padding:24, background:'var(--mkt-surface-bg)', borderRadius:20, border:'1px solid var(--mkt-card-border)', transition:'all 0.3s' }}>
                  <div style={{ width:56, height:56, borderRadius:16, background: idx % 2 === 0 ? "var(--mkt-primary)" : "var(--mkt-accent)", color: '#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.6rem', flexShrink:0 }}>{w.icon}</div>
                  <div>
                    <h4 style={{ fontWeight:800, color:'var(--mkt-text-heading)', marginBottom:8, fontSize:'1.05rem' }}>{w.title}</h4>
                    <p style={{ color:'var(--mkt-text-muted)', fontSize:'0.9rem', lineHeight:1.7, margin:0 }}>{w.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAND ── */}
      <section style={{ background: "var(--mkt-darker)", padding:'80px 0', borderTop: '1px solid var(--mkt-card-border)', borderBottom: '1px solid var(--mkt-card-border)' }}>
        <div className="container">
          <div className="grid-4 mkt-reveal" style={{ alignItems:'stretch' }}>
            {stats.map(s => (
              <div key={s.label} style={{ textAlign:'center', padding:24 }}>
                <div className="mkt-gradient-text" style={{ fontSize:'clamp(2.2rem,5vw,3rem)', fontWeight:900, marginBottom:8 }}>
                  {s.num}
                </div>
                <div style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.95rem', fontWeight:600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROCESS ── */}
      <section className="section" style={{ background:'var(--mkt-surface-bg)' }}>
        <div className="container">
          <div className="section-header mkt-reveal">
            <span className="section-tag">Methodology</span>
            <h2 className="section-title">A Structured <span>Approach to Success</span></h2>
            <p className="section-subtitle">We’ve refined our delivery model to ensure consistency, speed, and absolute quality at every stage.</p>
          </div>
          <div className="grid-4" style={{ gap:24, alignItems:'stretch' }}>
            {process.map((s, idx) => (
              <div key={s.step} className="mkt-reveal-delayed" style={{ 
                background: "var(--mkt-card-bg)", 
                borderRadius:24, 
                padding:'40px 32px', 
                border:'1px solid var(--mkt-card-border)', 
                boxShadow:'var(--shadow-md)', 
                position:'relative', 
                display:'flex', 
                flexDirection:'column',
                animationDelay: `${idx * 0.1}s`
              }}>
                <div style={{ position:'absolute', top:-16, left:32, background: "var(--mkt-primary)", color:'#fff', fontWeight:800, fontSize:'0.75rem', padding:'6px 18px', borderRadius:50, letterSpacing:1 }}>
                  PHASE {s.step}
                </div>
                <div style={{ fontSize:'2.8rem', margin:'12px 0 20px' }}>{s.icon}</div>
                <h4 style={{ fontWeight:800, color:'var(--mkt-text-heading)', marginBottom:12, fontSize:19 }}>{s.title}</h4>
                <p style={{ fontSize:'0.95rem', color:'var(--mkt-text-muted)', lineHeight:1.8, margin:0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES WE FILL ── */}
      <section className="section" style={{ background:'var(--mkt-section-bg)' }}>
        <div className="container">
          <div className="grid-2 mkt-reveal" style={{ alignItems:'start', gap:80 }}>
            <div>
              <span className="section-tag">Talent Scope</span>
              <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)', fontWeight:900, color:'var(--mkt-text-heading)', lineHeight:1.15, marginBottom:20 }}>
                {roles.title}
              </h2>
              <p style={{ color:'var(--mkt-text-muted)', fontSize:'1.05rem', lineHeight:1.8, marginBottom:32 }}>
                Our network spans the entire professional spectrum. We don't just fill seats; we source the specific DNA required for your team's success.
              </p>
              <Link to="/contact" className="btn btn-primary" style={{ borderRadius: 12 }}>
                Request Custom Search →
              </Link>
            </div>
            <div className="mkt-glass-dark" style={{ borderRadius:24, padding:40, border: '1px solid var(--mkt-card-border)' }}>
              {roles.items.map(item => (
                <div key={item} style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:16 }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', background:'var(--mkt-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, marginTop: 4, flexShrink:0 }}>✓</div>
                  <span style={{ color:'rgba(255,255,255,0.9)', fontSize:'0.95rem', fontWeight: 500, lineHeight:1.6 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── GUARANTEES ── */}
      <section className="section" style={{ background:'var(--mkt-surface-bg)' }}>
        <div className="container">
          <div className="section-header mkt-reveal">
            <span className="section-tag">Accountability</span>
            <h2 className="section-title">Built-In <span>Risk Protection</span></h2>
            <p className="section-subtitle">We stand behind every placement with industry-leading guarantees that put your interests first.</p>
          </div>
          <div className="grid-2" style={{ gap:24, alignItems:'stretch' }}>
            {guarantees.map(g => (
              <div key={g.title} className="mkt-reveal-delayed" style={{ background:'var(--mkt-card-bg)', borderRadius:20, padding:32, border:'1px solid var(--mkt-card-border)', display:'flex', gap:24, boxShadow:'var(--shadow-md)', alignItems:'flex-start' }}>
                <div style={{ width:60, height:60, borderRadius:18, background: "rgba(3,118,211,0.1)", color: "var(--mkt-primary)", display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.8rem', flexShrink:0 }}>{g.icon}</div>
                <div>
                  <h4 style={{ fontWeight:800, color:'var(--mkt-text-heading)', marginBottom:10, fontSize:18 }}>{g.title}</h4>
                  <p style={{ color:'var(--mkt-text-muted)', fontSize:'0.95rem', lineHeight:1.8, margin:0 }}>{g.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section" style={{ background:'var(--mkt-section-bg)' }}>
        <div style={{ maxWidth:900, margin:'0 auto', padding:'0 24px' }}>
          <div className="section-header mkt-reveal">
            <span className="section-tag">Support</span>
            <h2 className="section-title">Frequently Asked <span>Questions</span></h2>
          </div>
          <div className="mkt-reveal" style={{ display:'flex', flexDirection:'column', gap:18 }}>
            {faqs.map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} accent="var(--mkt-primary)" />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: "var(--mkt-darker)", padding:'120px 0', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 50% 50%, rgba(6,182,212,0.1) 0%, transparent 60%)', pointerEvents:'none' }} />
        <div className="container mkt-reveal" style={{ position:'relative' }}>
          <span className="section-tag" style={{ background:'rgba(255,255,255,0.05)', color:'var(--mkt-accent)', borderColor:'rgba(6,182,212,0.2)', marginBottom:32 }}>
            Ready to Begin?
          </span>
          <h2 style={{ color:'#ffffff', fontSize:'clamp(2.2rem,5vw,3.5rem)', fontWeight:900, margin:'0 0 24px', lineHeight:1.1, letterSpacing: '-0.02em' }}>
            Let's Find Your <span className="mkt-gradient-text">Perfect Match</span>
          </h2>
          <p style={{ color:'rgba(255,255,255,0.6)', fontSize:'1.15rem', marginBottom:48, maxWidth:520, margin:'0 auto 48px', lineHeight: 1.8 }}>
            Contact our delivery team today for a confidential discussion about your talent requirements.
          </p>
          <div style={{ display:'flex', gap:20, justifyContent:'center', flexWrap:'wrap' }}>
            <Link to="/contact" className="btn btn-primary btn-lg" style={{ borderRadius: 14 }}>
              Schedule Call Now →
            </Link>
            <Link to="/services" className="btn btn-secondary btn-lg" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>
              Explore Other Services
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

// ─── Accordion FAQ Item ───────────────────────────────────────────────────────
function FaqItem({ q, a, accent }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="mkt-card-hover" style={{ border:'1px solid var(--mkt-card-border)', borderRadius:18, overflow:'hidden', background: "var(--mkt-card-bg)" }}>
      <button onClick={() => setOpen(o => !o)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'24px 32px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', gap:16 }}>
        <span style={{ fontWeight:800, color:'var(--mkt-text-heading)', fontSize:'1.05rem', lineHeight:1.4 }}>{q}</span>
        <span style={{ color:accent, fontSize:'1.5rem', fontWeight:800, flexShrink:0, transition:'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)', transform: open ? 'rotate(45deg)' : 'none' }}>+</span>
      </button>
      {open && (
        <div className="mkt-fade-in" style={{ padding:'0 32px 28px' }}>
          <p style={{ color:'var(--mkt-text-muted)', fontSize:'0.95rem', lineHeight:1.8, margin:0, borderTop:'1px solid var(--mkt-card-border)', paddingTop:20 }}>{a}</p>
        </div>
      )}
    </div>
  );
}

// ─── Route Entry Point ────────────────────────────────────────────────────────
export default function ServiceDetailPage() {
  const { slug } = useParams();
  const data = SERVICES[slug];
  if (!data) return <Navigate to="/services" replace />;
  return <ServicePage data={data} />;
}
