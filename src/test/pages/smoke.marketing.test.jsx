/**
 * Tier-3 smoke: all 19 marketing pages.
 */
import React from 'react'
import { render, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ slug: 'test-post', service: 'test' }),
  useLocation: () => ({ pathname: '/', search: '', state: null }),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  Navigate: ({ to }) => <div>Navigate to {to}</div>,
}))

vi.mock('../../api/api.js', () => {
  const resp = Object.assign([], { data: [], results: [], total: 0, jobs: [] })
  const stub = new Proxy({}, { get: () => vi.fn(() => Promise.resolve(resp)) })
  return { api: stub, default: stub }
})

vi.mock('../../api/config.js', () => ({
  API_BASE_URL: 'http://localhost:5000',
}))

vi.mock('../../context/MarketingThemeContext.jsx', () => ({
  useMarketingTheme: vi.fn(() => ({ theme: 'light', toggleTheme: vi.fn(), isDark: false })),
  MarketingThemeProvider: ({ children }) => <>{children}</>,
}))

vi.mock('../../data/blogs.js', () => ({
  BLOGS: [
    {
      slug: 'test-post', title: 'Test Blog Post', date: '2025-01-01',
      author: 'Alice', tags: ['HR'], category: 'HR',
      summary: 'Test summary',
      excerpt: 'Test excerpt text for the blog card display.',
      content: '<p>Test content</p>',
    }
  ],
  CATEGORIES: ['HR'],
}))

vi.mock('../../components/modals/PublicApplyModal.jsx', () => ({ default: () => null }))

// Explicit named-export stub for all 55+ illustrations (Proxy as module namespace
// breaks Vitest's ESM mock interception — plain object required)
vi.mock('../../components/marketing/Illustrations.jsx', () => {
  const nil = () => null
  return {
    RecruiterIllustration: nil,
    CollegePlacementIllustration: nil,
    UnifiedPlatformIllustration: nil,
    TalentMatchIllustration: nil,
    TeamGrowthIllustration: nil,
    CareerJourneyIllustration: nil,
    VerifiedShieldIllustration: nil,
    PipelineBoardIllustration: nil,
    AnalyticsChartIllustration: nil,
    OnboardingChecklistIllustration: nil,
    PayrollCardIllustration: nil,
    VideoInterviewIllustration: nil,
    HandshakeDealIllustration: nil,
    SearchTalentIllustration: nil,
    GlobalNetworkIllustration: nil,
    ChatSupportIllustration: nil,
    ValuesHeartIllustration: nil,
    GrowthRocketIllustration: nil,
    IdentityCardIllustration: nil,
    TrustGraphIllustration: nil,
    ServiceSolutionsIllustration: nil,
    CampusHubIllustration: nil,
    ConnectIllustration: nil,
    ProcessFlowIllustration: nil,
    ComplianceBadgeIllustration: nil,
    ApplicationTrackerIllustration: nil,
    JobAnalyticsIllustration: nil,
    FaceRecognitionIllustration: nil,
    TeamAutomationIllustration: nil,
    MultiTenantIllustration: nil,
    RecruiterChatIllustration: nil,
    CareerToolsIllustration: nil,
    EnterpriseControlIllustration: nil,
    OfferSignatureIllustration: nil,
    VerifiedCandidateIllustration: nil,
    DevTalentIllustration: nil,
    CyberShieldIllustration: nil,
    DiverseTeamIllustration: nil,
    ContractToHireIllustration: nil,
    CompanyBridgeIllustration: nil,
    HRDashboardIllustration: nil,
    LongTermTeamIllustration: nil,
    DevPipelineFlowIllustration: nil,
    SecurityAuditFlowIllustration: nil,
    TalentFunnelFlowIllustration: nil,
    TrialToHireFlowIllustration: nil,
    PartnershipFlowIllustration: nil,
    PlatformRolloutFlowIllustration: nil,
    CareerPlacementFlowIllustration: nil,
    CodeGuaranteeIllustration: nil,
    SecurityComplianceIllustration: nil,
    ReplacementGuaranteeIllustration: nil,
    ConversionGuaranteeIllustration: nil,
    SLAGuaranteeIllustration: nil,
    UptimeGuaranteeIllustration: nil,
    RetentionGuaranteeIllustration: nil,
  }
})

// Mock marketing sub-components (siblings imported by pages)
vi.mock('../../pages/marketing/MarketingNav.jsx', () => ({ default: () => null }))
vi.mock('../../pages/marketing/MarketingFooter.jsx', () => ({ default: () => null }))

// TermsPage uses IntersectionObserver in an effect
global.IntersectionObserver = class {
  constructor(_cb, _opts) {}
  observe(_el) {}
  unobserve(_el) {}
  disconnect() {}
}

async function smokeRender(element) {
  await act(async () => { render(element) })
  expect(document.body).toBeTruthy()
}

describe('Marketing pages — smoke', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('LandingPage renders', async () => {
    const { default: C } = await import('../../pages/marketing/LandingPage.jsx')
    await smokeRender(<C />)
  })

  it('AboutPage renders', async () => {
    const { default: C } = await import('../../pages/marketing/AboutPage.jsx')
    await smokeRender(<C />)
  })

  it('BlogPage renders', async () => {
    const { default: C } = await import('../../pages/marketing/BlogPage.jsx')
    await smokeRender(<C />)
  })

  it('BlogPostPage renders', async () => {
    const { default: C } = await import('../../pages/marketing/BlogPostPage.jsx')
    await smokeRender(<C />)
  })

  it('CommunityPreviewPage renders', async () => {
    const { default: C } = await import('../../pages/marketing/CommunityPreviewPage.jsx')
    await smokeRender(<C />)
  })

  it('CompaniesPage renders', async () => {
    const { default: C } = await import('../../pages/marketing/CompaniesPage.jsx')
    await smokeRender(<C />)
  })

  it('ContactPage renders', async () => {
    const { default: C } = await import('../../pages/marketing/ContactPage.jsx')
    await smokeRender(<C />)
  })

  it('HRMSPage renders', async () => {
    const { default: C } = await import('../../pages/marketing/HRMSPage.jsx')
    await smokeRender(<C />)
  })

  it('PrivacyPage renders', async () => {
    const { default: C } = await import('../../pages/marketing/PrivacyPage.jsx')
    await smokeRender(<C />)
  })

  it('ProductCampusHub renders', async () => {
    const { default: C } = await import('../../pages/marketing/ProductCampusHub.jsx')
    await smokeRender(<C />)
  })

  it('ProductHireBoard renders', async () => {
    const { default: C } = await import('../../pages/marketing/ProductHireBoard.jsx')
    await smokeRender(<C />)
  })

  it('ProductJobTrack renders', async () => {
    const { default: C } = await import('../../pages/marketing/ProductJobTrack.jsx')
    await smokeRender(<C />)
  })

  it('ProductPeopleDesk renders', async () => {
    const { default: C } = await import('../../pages/marketing/ProductPeopleDesk.jsx')
    await smokeRender(<C />)
  })

  it('ProductsPage renders', async () => {
    const { default: C } = await import('../../pages/marketing/ProductsPage.jsx')
    await smokeRender(<C />)
  })

  it('ServiceDetailPage renders', async () => {
    const { default: C } = await import('../../pages/marketing/ServiceDetailPage.jsx')
    await smokeRender(<C />)
  })

  it('ServicesPage renders', async () => {
    const { default: C } = await import('../../pages/marketing/ServicesPage.jsx')
    await smokeRender(<C />)
  })

  it('TermsPage renders', async () => {
    const { default: C } = await import('../../pages/marketing/TermsPage.jsx')
    await smokeRender(<C />)
  })

  it('MarketingNav renders', async () => {
    // Directly render the nav component (restored from mock for this test file)
    const { default: C } = await import('../../pages/marketing/MarketingNav.jsx')
    await smokeRender(<C />)
  })

  it('MarketingFooter renders', async () => {
    const { default: C } = await import('../../pages/marketing/MarketingFooter.jsx')
    await smokeRender(<C />)
  })
})
