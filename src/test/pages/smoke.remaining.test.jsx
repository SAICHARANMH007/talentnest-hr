/**
 * Tier-3 smoke: remaining candidate, careers, client, college, public, and shared pages.
 */
import React from 'react'
import { render, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ token: 'tok123', id: 'id1', appId: 'a1', driveId: 'd1', communityId: 'c1', userId: 'u1' }),
  useLocation: () => ({ pathname: '/', search: '?token=tok123', state: null }),
  useSearchParams: () => [new URLSearchParams('token=tok123&tab=profile'), vi.fn()],
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}))

vi.mock('../../api/api.js', () => {
  // driveData satisfies CollegeDriveDetail which reads r.data.registrations
  const driveData = Object.assign([], {
    _id: 'd1', title: 'Test Drive', status: 'active', registrations: [],
    description: '', examProvider: '', eligibility: {},
  })
  const resp = Object.assign([], {
    data: driveData, results: [], total: 0, jobs: [], drives: [], posts: [],
    students: [], communities: [],
  })
  return { api: new Proxy({}, { get: () => vi.fn(() => Promise.resolve(resp)) }) }
})

vi.mock('../../api/client.js', () => ({
  req: vi.fn(() => Promise.resolve({
    status: 'pending', application: { jobTitle: 'Test Job', companyName: 'Test Corp' },
    offer: { title: 'Test Job', salary: '100k', startDate: '2025-07-01' },
    schedulingLink: { slots: [], format: 'video', meetingLink: '' },
  })),
  getToken: vi.fn(() => 'tok'),
  setToken: vi.fn(),
}))

vi.mock('../../api/config.js', () => ({
  API_BASE_URL: 'http://localhost:5000',
}))

vi.mock('../../constants/styles.js', () => ({
  card: {}, btnP: {}, btnG: {}, btnD: {}, inp: {}, glassCard: {}
}))
vi.mock('../../constants/stages.js', () => ({ STAGES: [], SM: {} }))
vi.mock('../../constants/picklists.js', () => ({
  INDUSTRIES: [], DEPARTMENTS: [], SKILLS: [], DEGREES: [],
  BRANCHES_BY_DEGREE: {}, DEFAULT_BRANCHES: []
}))
vi.mock('../../constants/education.js', () => ({
  DEGREES: [], BRANCHES_BY_DEGREE: {}, DEFAULT_BRANCHES: [], ALL_BRANCHES: []
}))
vi.mock('../../config/logo.js', () => ({ LOGO_PATH: '/logo.png' }))

vi.mock('../../hooks/usePlatformSocket.js', () => ({
  usePlatformEvents: vi.fn(),
  usePlatformSocket: vi.fn(),
}))

vi.mock('../../components/ui/Toast.jsx', () => ({ default: () => null }))
vi.mock('../../components/ui/Spinner.jsx', () => ({ default: () => <div>Loading</div> }))
vi.mock('../../components/ui/Badge.jsx', () => ({ default: ({ label }) => <span>{label}</span> }))
vi.mock('../../components/ui/Modal.jsx', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../../components/ui/PageHeader.jsx', () => ({ default: ({ title }) => <div>{title}</div> }))
vi.mock('../../components/ui/Field.jsx', () => ({ default: () => null }))
vi.mock('../../components/ui/Dropdown.jsx', () => ({ default: () => null }))
vi.mock('../../components/Logo.jsx', () => ({ default: () => <img alt="logo" /> }))
vi.mock('../../components/charts/KpiCard.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/AreaChart.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/HorizBar.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/UserDetailDrawer.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/ErrorReportBoundary.jsx', () => ({ default: ({ children }) => <>{children}</> }))
vi.mock('../../components/shared/CollegeAutocomplete.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/CompanyAutocomplete.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/ResumeCard.jsx', () => ({ default: () => null }))
vi.mock('../../components/candidate/SkillBadges.jsx', () => ({ default: () => null }))
vi.mock('../../components/candidate/ReferralHub.jsx', () => ({ default: () => null }))
vi.mock('../../components/face/ProfilePhotoEnroll.jsx', () => ({ default: () => null }))
vi.mock('../../components/misc/TimeAgo.jsx', () => ({ default: () => null }))
vi.mock('../../components/misc/ActivityDot.jsx', () => ({ default: () => null }))

const mockUser = { id: 'u1', name: 'Test User', role: 'candidate', skills: ['JavaScript'] }
const collegeUser = { id: 'col1', name: 'College Admin', role: 'college_admin', collegeId: 'col1' }
const clientUser = { id: 'cl1', name: 'Client', role: 'client' }

async function smokeRender(element) {
  await act(async () => { render(element) })
  expect(document.body).toBeTruthy()
}

describe('Candidate pages — remaining smoke', () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockClear() })

  it('CandidateAssessment renders', async () => {
    const { default: C } = await import('../../pages/candidate/CandidateAssessment.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('CandidateBackgroundVerification renders', async () => {
    const { default: C } = await import('../../pages/candidate/CandidateBackgroundVerification.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('CandidateOffer renders', async () => {
    const { default: C } = await import('../../pages/candidate/CandidateOffer.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('CandidateOpportunities renders', async () => {
    const { default: C } = await import('../../pages/candidate/CandidateOpportunities.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('CandidateProfile renders', async () => {
    const { default: C } = await import('../../pages/candidate/CandidateProfile.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('ResumeBuilder renders', async () => {
    const { default: C } = await import('../../pages/candidate/ResumeBuilder.jsx')
    await smokeRender(<C user={mockUser} />)
  })
})

describe('Careers pages — remaining smoke', () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockClear() })

  it('OrgCareersPage renders', async () => {
    const { default: C } = await import('../../pages/careers/OrgCareersPage.jsx')
    await smokeRender(<C />)
  })
})

describe('Client pages — remaining smoke', () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockClear() })

  it('ClientInterviews renders', async () => {
    const { default: C } = await import('../../pages/client/ClientInterviews.jsx')
    await smokeRender(<C user={clientUser} />)
  })

  it('ClientRequirements renders', async () => {
    const { default: C } = await import('../../pages/client/ClientRequirements.jsx')
    await smokeRender(<C user={clientUser} />)
  })
})

describe('College pages — remaining smoke', () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockClear() })

  it('CollegeAddCandidates renders', async () => {
    const { default: C } = await import('../../pages/college/CollegeAddCandidates.jsx')
    await smokeRender(<C user={collegeUser} />)
  })

  it('CollegeDriveCreate renders', async () => {
    const { default: C } = await import('../../pages/college/CollegeDriveCreate.jsx')
    await smokeRender(<C user={collegeUser} />)
  })

  it('CollegeDriveDetail renders', async () => {
    const { default: C } = await import('../../pages/college/CollegeDriveDetail.jsx')
    await smokeRender(<C user={collegeUser} />)
  })

  it('CollegeSkillGaps renders', async () => {
    const { default: C } = await import('../../pages/college/CollegeSkillGaps.jsx')
    await smokeRender(<C user={collegeUser} />)
  })

  it('CollegeTrainingResources renders', async () => {
    const { default: C } = await import('../../pages/college/CollegeTrainingResources.jsx')
    await smokeRender(<C user={collegeUser} />)
  })
})

describe('Public pages — remaining smoke', () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockClear() })

  it('InviteResponsePage renders', async () => {
    const { default: C } = await import('../../pages/public/InviteResponsePage.jsx')
    await smokeRender(<C />)
  })

  it('OfferApprovalPage renders', async () => {
    const { default: C } = await import('../../pages/public/OfferApprovalPage.jsx')
    await smokeRender(<C />)
  })

  it('PostPublicPage renders', async () => {
    const { default: C } = await import('../../pages/public/PostPublicPage.jsx')
    await smokeRender(<C />)
  })

  it('SchedulingPage renders', async () => {
    const { default: C } = await import('../../pages/public/SchedulingPage.jsx')
    await smokeRender(<C />)
  })
})

describe('Shared pages — remaining smoke', () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockClear() })

  it('ApplicantsRecordsPage renders', async () => {
    const { default: C } = await import('../../pages/shared/ApplicantsRecordsPage.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('AssignedCandidates renders', async () => {
    const { default: C } = await import('../../pages/shared/AssignedCandidates.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('CommunitiesPage renders', async () => {
    const { default: C } = await import('../../pages/shared/CommunitiesPage.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('CommunityDetailPage renders', async () => {
    const { default: C } = await import('../../pages/shared/CommunityDetailPage.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('CommunityFeed renders', async () => {
    const { default: C } = await import('../../pages/shared/CommunityFeed.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('CompanyReviewsPage renders', async () => {
    const { default: C } = await import('../../pages/shared/CompanyReviewsPage.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('FormsHub renders', async () => {
    const { default: C } = await import('../../pages/shared/FormsHub.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('ProvisionUserPage renders', async () => {
    const { default: C } = await import('../../pages/shared/ProvisionUserPage.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('ResumeViewPage renders', async () => {
    const { default: C } = await import('../../pages/shared/ResumeViewPage.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('UserPublicProfilePage renders', async () => {
    const { default: C } = await import('../../pages/shared/UserPublicProfilePage.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('PlatformModalsGuide renders', async () => {
    const { default: C } = await import('../../pages/shared/PlatformModalsGuide.jsx')
    await smokeRender(<C user={mockUser} />)
  })
})
