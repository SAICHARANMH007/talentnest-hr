const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Tenant = require('./src/models/Tenant');
const User = require('./src/models/User');
const Job = require('./src/models/Job');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // 1. Create Organization (Tenant)
    const org = await Tenant.findOneAndUpdate(
      { slug: 'selfcrops' },
      {
        name: 'Selfcrops',
        slug: 'selfcrops',
        domain: 'selfcrops.com',
        website: 'https://selfcrops.com',
        industry: 'Agritech',
        size: '50-200',
        plan: 'enterprise',
        status: 'active',
      },
      { new: true, upsert: true }
    );
    console.log('Created/Found Organization:', org.name);

    // 2. Create User (Kavya)
    const passwordHash = await bcrypt.hash('Kavya@123', 10);
    const user = await User.findOneAndUpdate(
      { email: 'kavya@selfcrops.com' },
      {
        tenantId: org._id,
        name: 'Kavya',
        email: 'kavya@selfcrops.com',
        role: 'admin',
        passwordHash,
        isActive: true,
        title: 'HR Manager',
      },
      { new: true, upsert: true }
    );
    console.log('Created/Found User:', user.name);

    // 3. Delete existing selfcrops jobs to avoid duplicates on re-run
    await Job.deleteMany({ tenantId: org._id });
    console.log('Cleared existing Selfcrops jobs');

    // 4. Seed 20 Real-like Agritech Jobs with highly detailed descriptions and skills
    const jobs = [
      // --- Agritech Sales (7 jobs) ---
      {
        title: 'Area Sales Manager - Agritech',
        department: 'Sales',
        location: 'Pune, Maharashtra',
        jobType: 'Full-time',
        experience: '4-6 Years',
        salaryMin: 600000,
        salaryMax: 900000,
        description: `Selfcrops is hiring an Area Sales Manager to lead our expansion in Maharashtra. You will be at the forefront of bringing modern precision farming and agrochemical solutions to rural India. 

Key Responsibilities:
- Manage and expand the dealer and distributor network across Pune and surrounding regions.
- Drive the adoption of our proprietary agritech tools and biological fertilizers among large-scale farmers.
- Achieve monthly, quarterly, and annual sales targets.
- Conduct regular field visits, product demonstrations, and farmer education camps.
- Analyze market trends and competitor activities to adjust sales strategies.

We are looking for a proactive leader who understands the pulse of the Indian agricultural landscape and can communicate complex technological benefits simply.`,
        requirements: `- Bachelor's degree in Agriculture, Agribusiness, or a related field.
- 4-6 years of B2B sales experience, specifically in agrochemicals, seeds, or farm machinery.
- Proven track record of managing a network of at least 50+ dealers.
- Strong negotiation, communication, and interpersonal skills.
- Willingness to travel extensively within the assigned territory.`,
        skills: ['B2B Sales', 'Dealer Management', 'Agrochemicals', 'Negotiation', 'Market Analysis', 'Territory Mapping', 'Distributor Network', 'Crop Protection'],
        externalUrl: 'https://in.indeed.com/viewjob?jk=agritech-sales-001',
      },
      {
        title: 'Territory Sales Executive - Fertilizers',
        department: 'Sales',
        location: 'Nagpur, Maharashtra',
        jobType: 'Full-time',
        experience: '2-4 Years',
        salaryMin: 350000,
        salaryMax: 500000,
        description: `As a Territory Sales Executive, you will be the face of Selfcrops for the farming community in Nagpur. Your primary goal is to drive the sales of our premium organic fertilizers and crop protection products.

Key Responsibilities:
- Build direct relationships with progressive farmers and farmer producer organizations (FPOs).
- Organize village-level meetings (Kisan Ghosthi) to educate farmers on the benefits of our organic fertilizers.
- Ensure product availability at local retail touchpoints.
- Provide post-sale advisory and crop health monitoring to ensure customer success.
- Report daily sales activities and market feedback through our internal CRM.`,
        requirements: `- B.Sc Agriculture or Diploma in Agriculture is preferred.
- Minimum 2 years of field sales experience in the Agri-inputs sector.
- Deep understanding of local crops (Cotton, Oranges, Soyabean) and soil health.
- Fluency in Marathi and Hindi.
- Must own a two-wheeler with a valid driving license.`,
        skills: ['Field Sales', 'Crop Protection', 'Client Acquisition', 'Communication', 'Organic Fertilizers', 'Kisan Ghosthi', 'CRM Software', 'Soil Health Analysis'],
        externalUrl: 'https://in.indeed.com/viewjob?jk=agritech-sales-002',
      },
      {
        title: 'Regional Head of Sales - South India',
        department: 'Sales',
        location: 'Bengaluru, Karnataka',
        jobType: 'Full-time',
        experience: '8-12 Years',
        salaryMin: 1500000,
        salaryMax: 2200000,
        description: `We are seeking a highly experienced Regional Head of Sales to oversee our entire operations across South India. You will be responsible for scaling the adoption of our SaaS farm management tools and hardware sensors.

Key Responsibilities:
- Develop and execute a comprehensive regional sales strategy to capture market share in Karnataka, Tamil Nadu, Andhra Pradesh, and Kerala.
- Lead, mentor, and expand a team of Area Sales Managers and Executives.
- Build strategic partnerships with large agribusinesses, corporate farms, and government bodies.
- Oversee P&L for the region and optimize the cost of customer acquisition.
- Collaborate with the product team to tailor agritech software features for the South Indian market.`,
        requirements: `- MBA in Agribusiness or equivalent from a premier institute.
- 8-12 years of sales leadership experience, with at least 3 years managing SaaS or technology product sales in the agriculture sector.
- Deep understanding of South Indian agriculture demographics and supply chain.
- Exceptional leadership and team-building capabilities.`,
        skills: ['Sales Leadership', 'Strategy', 'SaaS Sales', 'Market Expansion', 'P&L Management', 'B2B Enterprise Sales', 'Team Mentorship', 'Government Tenders'],
        externalUrl: 'https://in.indeed.com/viewjob?jk=agritech-sales-003',
      },
      {
        title: 'Key Account Manager - Agri-Corporate',
        department: 'Sales',
        location: 'Delhi NCR',
        jobType: 'Full-time',
        experience: '5-8 Years',
        salaryMin: 800000,
        salaryMax: 1200000,
        description: `Join Selfcrops as a Key Account Manager dedicated to high-value corporate farming clients. You will manage our largest accounts and drive the implementation of precision agriculture tools at scale.

Key Responsibilities:
- Serve as the primary point of contact for enterprise clients, including corporate farms, contract farming aggregators, and food processing companies.
- Understand the unique operational challenges of large-scale farming and propose tailored tech solutions.
- Drive upselling and cross-selling of our chemical inputs, hardware, and ERP software.
- Conduct quarterly business reviews (QBRs) to showcase ROI and yield improvements to stakeholders.
- Ensure 100% SLA compliance and client retention.`,
        requirements: `- Bachelor’s degree; MBA preferred.
- 5-8 years of experience in Key Account Management or Enterprise B2B Sales, strictly within the agriculture or food-supply chain sector.
- Ability to engage with C-level executives and farm operations directors.
- Strong analytical skills to present data-driven yield and cost-saving reports.`,
        skills: ['Key Account Management', 'B2B Sales', 'Precision Agriculture', 'Enterprise Sales', 'Relationship Management', 'Data Presentation', 'Contract Negotiation'],
        externalUrl: 'https://in.indeed.com/viewjob?jk=agritech-sales-004',
      },
      {
        title: 'Sales Agronomist',
        department: 'Sales',
        location: 'Ludhiana, Punjab',
        jobType: 'Full-time',
        experience: '3-5 Years',
        salaryMin: 400000,
        salaryMax: 700000,
        description: `As a Sales Agronomist, you will bridge the gap between agronomy science and commercial sales. You will act as a trusted advisor to farmers, diagnosing crop issues and recommending Selfcrops solutions.

Key Responsibilities:
- Conduct soil testing, crop health diagnosis, and yield analysis on client farms.
- Recommend precise application of fertilizers, pesticides, and biological growth promoters based on scientific data.
- Convert advisory consultations into sales of our product portfolio.
- Host technical seminars for local farmers on sustainable farming practices.
- Collect field data to assist the R&D team in product improvement.`,
        requirements: `- M.Sc or B.Sc in Agronomy, Plant Pathology, or Soil Science.
- 3-5 years of experience blending technical advisory with sales in the agriculture sector.
- In-depth knowledge of wheat, paddy, and regional cash crops.
- Strong communication and persuasion skills; able to translate science into commercial value for farmers.`,
        skills: ['Agronomy', 'Technical Sales', 'Crop Management', 'Advisory', 'Soil Science', 'Plant Pathology', 'Sustainable Farming', 'Public Speaking'],
        externalUrl: 'https://www.naukri.com/job-listings-sales-agronomist-005',
      },
      {
        title: 'Inside Sales Specialist - AgTech Software',
        department: 'Sales',
        location: 'Remote',
        jobType: 'Full-time',
        experience: '1-3 Years',
        salaryMin: 300000,
        salaryMax: 500000,
        description: `Selfcrops is looking for a dynamic Inside Sales Specialist to drive adoption of our farm management ERP software. This is a fully remote role where you will be closing deals with progressive farmers and mid-sized agribusinesses over the phone and virtual meetings.

Key Responsibilities:
- Promptly respond to inbound leads generated by the marketing team.
- Conduct comprehensive product demonstrations of our software via Zoom/Google Meet.
- Understand the customer's farming operations and articulate how our software solves their specific pain points.
- Maintain an organized pipeline in Salesforce/HubSpot and follow up relentlessly.
- Achieve monthly software subscription quotas.`,
        requirements: `- 1-3 years of proven experience in SaaS inside sales or telesales.
- Excellent verbal and written communication skills in English and Hindi (regional languages are a big plus).
- Tech-savvy with the ability to learn complex software quickly.
- Previous exposure to the agriculture industry will give you a significant advantage.`,
        skills: ['Inside Sales', 'Cold Calling', 'CRM', 'Software Demos', 'Lead Qualification', 'Objection Handling', 'SaaS Sales', 'Pipeline Management'],
        externalUrl: 'https://in.indeed.com/viewjob?jk=agritech-sales-006',
      },
      {
        title: 'Channel Sales Manager',
        department: 'Sales',
        location: 'Indore, Madhya Pradesh',
        jobType: 'Full-time',
        experience: '5-7 Years',
        salaryMin: 700000,
        salaryMax: 1000000,
        description: `We are hiring a Channel Sales Manager to build a robust distribution network for Selfcrops' proprietary seeds and agrochemicals across Madhya Pradesh.

Key Responsibilities:
- Identify, appoint, and onboard high-performing distributors and wholesalers.
- Define commercial terms, credit limits, and margin structures for channel partners.
- Drive secondary sales through the distributor network by running localized promotional schemes.
- Ensure strict compliance with chemical distribution regulations.
- Resolve channel conflicts and maintain healthy relationships with key partners.`,
        requirements: `- 5-7 years of experience in channel sales and distributor management within the FMCG or Agri-inputs industry.
- Strong financial acumen regarding margins, ROI, and credit cycles.
- Proven ability to build a distribution network from scratch.
- Willingness to travel 15-20 days a month.`,
        skills: ['Channel Sales', 'Distributor Management', 'Agri Inputs', 'Trade Marketing', 'Conflict Resolution', 'Inventory Planning', 'Wholesale Operations'],
        externalUrl: 'https://www.naukri.com/job-listings-channel-sales-007',
      },

      // --- Agritech Marketing (7 jobs) ---
      {
        title: 'Digital Marketing Manager - AgTech',
        department: 'Marketing',
        location: 'Bengaluru, Karnataka',
        jobType: 'Full-time',
        experience: '4-7 Years',
        salaryMin: 800000,
        salaryMax: 1400000,
        description: `Selfcrops is looking for a data-driven Digital Marketing Manager to spearhead our online customer acquisition. You will be responsible for targeting modern, tech-savvy farmers and large agribusinesses through digital channels.

Key Responsibilities:
- Design and execute performance marketing campaigns across Google Ads, Meta Ads, and regional platforms.
- Manage the SEO strategy to ensure Selfcrops ranks highly for agronomy and agritech keywords.
- Optimize landing pages and sales funnels to maximize lead generation conversion rates.
- Manage a significant monthly ad budget with strict CPA and ROI targets.
- Analyze campaign data using Google Analytics to uncover new audience segments.`,
        requirements: `- 4-7 years of digital marketing experience, preferably in B2B tech, SaaS, or Agritech.
- Deep expertise in Google Ads, Facebook Ads Manager, and SEO tools (Ahrefs, SEMrush).
- Strong analytical skills with proficiency in Google Analytics and Tag Manager.
- Creative mindset combined with a ruthless focus on metrics.`,
        skills: ['Digital Marketing', 'Performance Marketing', 'SEO', 'Lead Gen', 'Google Ads', 'Meta Ads', 'Conversion Rate Optimization', 'Data Analytics'],
        externalUrl: 'https://www.linkedin.com/jobs/view/agritech-digital-008',
      },
      {
        title: 'Rural Marketing Executive',
        department: 'Marketing',
        location: 'Ahmedabad, Gujarat',
        jobType: 'Full-time',
        experience: '2-4 Years',
        salaryMin: 350000,
        salaryMax: 550000,
        description: `Join us as a Rural Marketing Executive to execute on-ground, below-the-line (BTL) marketing activities. You will be the voice of Selfcrops directly in the villages, building trust and brand awareness among traditional farming communities.

Key Responsibilities:
- Plan and execute village-level campaigns, including wall paintings, mobile van promotions, and haat (local market) activations.
- Organize crop demonstration camps showing the real-world impact of our chemical and biological products.
- Collect hyper-local market intelligence and competitor activity data.
- Coordinate with local Gram Panchayats and farmer cooperatives.
- Support the sales team by generating qualified localized leads.`,
        requirements: `- 2-4 years of experience in rural marketing or BTL activations, ideally in the agriculture sector.
- Deep understanding of rural consumer psychology and local media consumption habits.
- Fluency in Gujarati and Hindi.
- Extremely high energy levels and willingness to travel continuously in rural districts.`,
        skills: ['Rural Marketing', 'Event Management', 'BTL Campaigns', 'Brand Activation', 'Market Intelligence', 'Local Networking', 'Lead Generation'],
        externalUrl: 'https://in.indeed.com/viewjob?jk=agritech-mkt-009',
      },
      {
        title: 'Content Strategist - Agriculture',
        department: 'Marketing',
        location: 'Remote',
        jobType: 'Full-time',
        experience: '3-5 Years',
        salaryMin: 500000,
        salaryMax: 800000,
        description: `Selfcrops needs a Content Strategist to educate and inspire the agricultural community. You will translate complex agronomic science and software features into compelling, easy-to-understand content.

Key Responsibilities:
- Develop a comprehensive content calendar covering blogs, whitepapers, newsletters, and social media.
- Write in-depth articles on modern farming techniques, pest control, and crop nutrition.
- Write engaging video scripts for our YouTube channel targeting regional farmers.
- Interview agronomists and successful farmers to create compelling case studies.
- Ensure all content aligns with our brand voice and SEO objectives.`,
        requirements: `- 3-5 years of experience in content writing or journalism.
- Educational background in Agriculture, Botany, or Environmental Science is highly preferred.
- Exceptional writing, editing, and storytelling skills.
- Ability to write technical content in a simple, accessible manner.`,
        skills: ['Content Writing', 'Copywriting', 'Agriculture Knowledge', 'Video Scripts', 'SEO Writing', 'Storytelling', 'Editorial Planning'],
        externalUrl: 'https://www.linkedin.com/jobs/view/content-agri-010',
      },
      {
        title: 'Product Marketing Manager',
        department: 'Marketing',
        location: 'Mumbai, Maharashtra',
        jobType: 'Full-time',
        experience: '5-8 Years',
        salaryMin: 1200000,
        salaryMax: 1800000,
        description: `As the Product Marketing Manager at Selfcrops, you will own the go-to-market (GTM) strategy for our new lines of biological fertilizers and SaaS tools. You will sit at the intersection of product, sales, and marketing.

Key Responsibilities:
- Develop clear value propositions, messaging frameworks, and positioning for new product launches.
- Conduct deep market research to understand farmer pain points and competitor landscapes.
- Create sales enablement collateral including pitch decks, battle cards, and product brochures.
- Train the sales team on product features, competitive differentiation, and objection handling.
- Monitor product adoption metrics and run campaigns to increase usage.`,
        requirements: `- 5-8 years of product marketing experience, preferably in B2B or the Agri-inputs sector.
- Proven ability to launch new products from scratch and drive GTM strategy.
- Excellent cross-functional collaboration skills (working with Product, Sales, and Design teams).
- Strong analytical and presentation skills.`,
        skills: ['Product Marketing', 'GTM Strategy', 'Market Research', 'Positioning', 'Sales Enablement', 'Competitive Analysis', 'Messaging'],
        externalUrl: 'https://www.naukri.com/job-listings-product-mkt-011',
      },
      {
        title: 'Social Media Specialist',
        department: 'Marketing',
        location: 'Pune, Maharashtra',
        jobType: 'Full-time',
        experience: '1-3 Years',
        salaryMin: 300000,
        salaryMax: 500000,
        description: `We are seeking a creative Social Media Specialist to manage Selfcrops’ digital presence. Your goal is to build a vibrant online community of farmers and agriculture enthusiasts.

Key Responsibilities:
- Manage daily posting and engagement across Instagram, Facebook, YouTube, and LinkedIn.
- Create visually appealing graphics and edit short-form videos (Reels/Shorts) featuring farming tips and product highlights.
- Monitor social media trends within the agricultural community and leverage them for brand growth.
- Respond to farmer queries and comments to foster community trust.
- Track follower growth and engagement metrics to optimize the content strategy.`,
        requirements: `- 1-3 years of experience managing social media for a brand.
- Proficiency in Canva, Adobe Premiere Pro, or CapCut for quick video/image editing.
- Creative mindset with an eye for design and trending audio/formats.
- Ability to understand and communicate with rural/agricultural audiences effectively.`,
        skills: ['Social Media', 'Content Creation', 'Video Editing', 'Community Management', 'Graphic Design', 'Trend Analysis', 'Copywriting'],
        externalUrl: 'https://in.indeed.com/viewjob?jk=agritech-social-012',
      },
      {
        title: 'Growth Marketer',
        department: 'Marketing',
        location: 'Bengaluru, Karnataka',
        jobType: 'Full-time',
        experience: '3-6 Years',
        salaryMin: 700000,
        salaryMax: 1200000,
        description: `Join us as a Growth Marketer focused on scaling the user base of the Selfcrops mobile app. You will use data and experimentation to drive app installs, active usage, and customer retention.

Key Responsibilities:
- Design and execute A/B tests across ad creatives, app store listings, and landing pages.
- Implement App Store Optimization (ASO) strategies to improve organic downloads.
- Run lifecycle marketing campaigns (Push notifications, SMS, Email) to retain users and increase feature adoption.
- Identify friction points in the user onboarding journey and work with product teams to resolve them.
- Measure and report on cohort retention and Customer Lifetime Value (CLTV).`,
        requirements: `- 3-6 years of experience in mobile app growth marketing or retention marketing.
- Strong grasp of growth loops, A/B testing frameworks, and cohort analysis.
- Experience with tools like Clevertap, MoEngage, Mixpanel, or AppsFlyer.
- Highly analytical mindset—you should love diving into spreadsheets and dashboards.`,
        skills: ['Growth Hacking', 'App Marketing', 'A/B Testing', 'Retention', 'ASO', 'Lifecycle Marketing', 'Data Analysis', 'Cohort Tracking'],
        externalUrl: 'https://www.linkedin.com/jobs/view/growth-agri-013',
      },
      {
        title: 'PR & Corporate Communications Manager',
        department: 'Marketing',
        location: 'Delhi NCR',
        jobType: 'Full-time',
        experience: '6-10 Years',
        salaryMin: 1000000,
        salaryMax: 1500000,
        description: `Selfcrops is looking for a PR & Corporate Communications Manager to build and protect our corporate reputation. You will shape our narrative as a leading innovator in Indian agritech.

Key Responsibilities:
- Develop and execute comprehensive public relations strategies to secure tier-1 media coverage.
- Draft press releases, leadership opinion pieces, and corporate statements.
- Build and maintain strong relationships with journalists, agricultural publications, and industry influencers.
- Manage crisis communications and reputation management proactively.
- Coordinate with event organizers to secure speaking slots for our leadership team at major agri-summits.`,
        requirements: `- 6-10 years of experience in PR or corporate communications, either at an agency or in-house.
- Established network of contacts in business and agricultural media.
- Exceptional written and verbal communication skills.
- Ability to translate complex tech and scientific achievements into compelling news stories.`,
        skills: ['Public Relations', 'Corporate Comms', 'Media Relations', 'Brand Building', 'Crisis Management', 'Press Releases', 'Event Coordination'],
        externalUrl: 'https://www.naukri.com/job-listings-pr-comms-014',
      },

      // --- Store Manager for Chemicals and Fertilizers (6 jobs) ---
      {
        title: 'Agri-Store Manager',
        department: 'Operations',
        location: 'Nashik, Maharashtra',
        jobType: 'Full-time',
        experience: '3-6 Years',
        salaryMin: 300000,
        salaryMax: 500000,
        description: `Take charge of our flagship Selfcrops retail outlet in Nashik. You will be responsible for the profitable and compliant operation of the store, specializing in agrochemicals, fertilizers, and precision farming hardware.

Key Responsibilities:
- Manage daily store operations, ensuring a clean, organized, and welcoming environment for farmers.
- Oversee inventory control, ensuring accurate stock counts and preventing expiry of chemical products.
- Provide expert advice to walk-in customers regarding the correct usage and dosage of fertilizers and pesticides.
- Lead and train a small team of store executives.
- Ensure strict compliance with all government regulations regarding the storage and sale of hazardous agrochemicals.`,
        requirements: `- 3-6 years of retail store management experience, specifically in agricultural inputs.
- Valid license or certification for handling and selling agrochemicals is highly preferred.
- Strong customer service orientation and problem-solving skills.
- Proficiency with basic point-of-sale (POS) and inventory software.`,
        skills: ['Store Management', 'Inventory Control', 'Agrochemicals', 'Customer Service', 'Regulatory Compliance', 'Team Leadership', 'POS Systems'],
        externalUrl: 'https://in.indeed.com/viewjob?jk=store-mgr-015',
      },
      {
        title: 'Warehouse Manager - Fertilizers',
        department: 'Operations',
        location: 'Vijayawada, Andhra Pradesh',
        jobType: 'Full-time',
        experience: '5-8 Years',
        salaryMin: 500000,
        salaryMax: 800000,
        description: `Selfcrops is looking for an experienced Warehouse Manager to oversee our central distribution hub for fertilizers and crop protection chemicals. Safety and efficiency are paramount in this role.

Key Responsibilities:
- Oversee all inbound logistics, receiving, and secure storage of bulk fertilizers and sensitive chemicals.
- Manage outbound dispatch to regional stores and distributors, ensuring on-time delivery.
- Enforce strict adherence to environmental health and safety (EHS) standards to prevent spills and contamination.
- Optimize warehouse layout for maximum space utilization and efficient picking.
- Conduct regular audits and cycle counts to maintain 100% inventory accuracy.`,
        requirements: `- 5-8 years of experience managing large-scale warehouses, preferably dealing with chemicals, fertilizers, or hazardous materials.
- Deep understanding of EHS regulations and emergency response protocols.
- Experience using advanced Warehouse Management Systems (WMS).
- Strong leadership skills to manage a large workforce of loaders and forklift operators.`,
        skills: ['Warehouse Operations', 'Logistics', 'Compliance', 'Team Management', 'EHS Standards', 'WMS', 'Inventory Auditing', 'Hazardous Materials Handling'],
        externalUrl: 'https://www.naukri.com/job-listings-warehouse-mgr-016',
      },
      {
        title: 'Inventory Controller - Crop Protection',
        department: 'Operations',
        location: 'Coimbatore, Tamil Nadu',
        jobType: 'Full-time',
        experience: '2-5 Years',
        salaryMin: 250000,
        salaryMax: 450000,
        description: `We are hiring an Inventory Controller to ensure optimal stock levels of critical crop protection products across our network. You will balance the fine line between overstocking and stockouts.

Key Responsibilities:
- Monitor daily stock levels of pesticides, herbicides, and fertilizers across all retail branches and regional warehouses.
- Use historical data and seasonal agricultural trends to forecast demand accurately.
- Coordinate with the procurement team to place timely replenishment orders.
- Identify slow-moving or near-expiry stock and propose liquidation strategies.
- Reconcile physical stock against ERP system records and investigate discrepancies.`,
        requirements: `- 2-5 years of experience in inventory management or supply chain planning.
- High proficiency in Microsoft Excel (VLOOKUP, Pivot Tables) and ERP systems (e.g., SAP, Oracle).
- Understanding of the agricultural season (Kharif/Rabi) and its impact on product demand.
- Detail-oriented with strong numerical analytical skills.`,
        skills: ['Inventory Management', 'Forecasting', 'Supply Chain', 'Data Entry', 'ERP Systems', 'Excel Proficiency', 'Stock Reconciliation', 'Demand Planning'],
        externalUrl: 'https://in.indeed.com/viewjob?jk=inventory-017',
      },
      {
        title: 'Retail Operations Manager',
        department: 'Operations',
        location: 'Jaipur, Rajasthan',
        jobType: 'Full-time',
        experience: '6-9 Years',
        salaryMin: 700000,
        salaryMax: 1100000,
        description: `Selfcrops is expanding! As the Retail Operations Manager, you will oversee a cluster of retail stores across Rajasthan, ensuring operational excellence and consistent brand experience.

Key Responsibilities:
- Manage the P&L and operational performance for 10+ retail outlets.
- Standardize visual merchandising, store layouts, and customer service protocols across all locations.
- Recruit, train, and mentor Store Managers.
- Implement loss prevention strategies and audit store compliance with chemical storage laws.
- Analyze sales data to optimize product mix at the store level.`,
        requirements: `- 6-9 years of multi-store retail management experience. Experience in agri-retail is a major advantage.
- Proven ability to drive sales growth while strictly managing operational costs.
- Excellent leadership, communication, and conflict-resolution skills.
- Willingness to travel extensively between store locations.`,
        skills: ['Retail Operations', 'Multi-Store Management', 'Staff Training', 'Sales Strategy', 'P&L Management', 'Loss Prevention', 'Visual Merchandising'],
        externalUrl: 'https://www.linkedin.com/jobs/view/retail-ops-018',
      },
      {
        title: 'Store Executive - Chemical Inputs',
        department: 'Operations',
        location: 'Karnal, Haryana',
        jobType: 'Full-time',
        experience: '1-3 Years',
        salaryMin: 200000,
        salaryMax: 350000,
        description: `Start your career in Agritech retail as a Store Executive. You will be the friendly face greeting farmers and ensuring the smooth daily operation of our Karnal outlet.

Key Responsibilities:
- Assist walk-in customers, understanding their crop issues and directing them to the right fertilizers or chemical inputs.
- Handle point-of-sale (POS) billing, cash management, and daily sales reporting.
- Receive inventory shipments, verify quantities, and safely stack products on shelves according to safety guidelines.
- Maintain store cleanliness and ensure product displays are neat and informative.
- Assist the Store Manager with monthly physical inventory counts.`,
        requirements: `- 1-3 years of retail sales or customer service experience.
- Basic computer literacy for billing and inventory entry.
- Willingness to learn about different types of fertilizers, pesticides, and their safe handling.
- Friendly, approachable demeanor with good local language skills.`,
        skills: ['Retail Sales', 'Billing', 'Customer Handling', 'Inventory', 'Cash Management', 'Safe Chemical Handling', 'Basic Computing'],
        externalUrl: 'https://in.indeed.com/viewjob?jk=store-exec-019',
      },
      {
        title: 'Procurement Manager - Agrochemicals',
        department: 'Operations',
        location: 'Hyderabad, Telangana',
        jobType: 'Full-time',
        experience: '5-10 Years',
        salaryMin: 800000,
        salaryMax: 1400000,
        description: `Selfcrops is seeking a strategic Procurement Manager to source high-quality agrochemicals, organic fertilizers, and raw materials. You will ensure our supply chain is cost-effective, resilient, and compliant.

Key Responsibilities:
- Identify and vet reliable manufacturers and suppliers of technical-grade agrochemicals and finished fertilizers.
- Negotiate contracts, pricing, and credit terms to secure the best possible margins for the retail chain.
- Monitor global commodity prices and market trends that impact raw material costs.
- Ensure all procured products meet strict quality standards and regulatory compliance (CIBRC guidelines).
- Manage vendor relationships and evaluate supplier performance continuously.`,
        requirements: `- 5-10 years of procurement or strategic sourcing experience in the agrochemical, fertilizer, or specialty chemical industry.
- Deep network of contacts among chemical manufacturers in India and abroad.
- Exceptional negotiation and contract management skills.
- Thorough understanding of quality control and chemical regulatory standards.`,
        skills: ['Procurement', 'Vendor Management', 'Agrochemicals', 'Negotiation', 'Strategic Sourcing', 'Contract Management', 'Regulatory Compliance', 'Supply Chain Strategy'],
        externalUrl: 'https://www.naukri.com/job-listings-procurement-020',
      }
    ];

    for (const jobData of jobs) {
      await Job.create({
        ...jobData,
        tenantId: org._id,
        createdBy: user._id,
        company: 'Selfcrops',
        companyName: 'Selfcrops',
        status: 'active',
        approvalStatus: 'approved',
        isPublic: true,
      });
    }

    console.log(`Successfully seeded ${jobs.length} jobs for Selfcrops!`);

  } catch (error) {
    console.error('Seeding Error:', error);
  } finally {
    process.exit();
  }
}

seed();
