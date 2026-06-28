/**
 * Tier-3 smoke: remaining recruiter pages (10 uncovered).
 */
import React from 'react'
import { render, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ jobId: 'j1', appId: 'a1', driveId: 'd1' }),
  useLocation: () => ({ pathname: '/app/recruiter', search: '', state: null }),
  useSearchParams: () => [new URLSearchParams('jobId=j1'), vi.fn()],
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}))

vi.mock('../../api/api.js', () => {
  const resp = Object.assign([], { data: [], results: [], total: 0, jobs: [], applications: [] })
  const stub = new Proxy({}, { get: () => vi.fn(() => Promise.resolve(resp)) })
  return { api: stub, downloadBlob: vi.fn() }
})

vi.mock('../../api/matching.js', () => ({
  genericSearchMatch: vi.fn(() => true),
  matchCandidatesToJob: vi.fn(() => []),
}))

vi.mock('../../constants/styles.js', () => ({
  card: {}, btnP: {}, btnG: {}, btnD: {}, inp: {}, glassCard: {}
}))
vi.mock('../../constants/stages.js', () => ({ STAGES: [], SM: {}, NEXT: {} }))
vi.mock('../../hooks/useOrgOptions.js', () => ({
  useOrgOptions: vi.fn(() => ({ stages: [], isVisible: vi.fn(() => true), customizations: {} })),
}))

vi.mock('../../components/ui/Toast.jsx', () => ({ default: () => null }))
vi.mock('../../components/ui/Spinner.jsx', () => ({ default: () => <div>Loading</div> }))
vi.mock('../../components/ui/Badge.jsx', () => ({ default: ({ label }) => <span>{label}</span> }))
vi.mock('../../components/ui/Modal.jsx', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../../components/ui/PageHeader.jsx', () => ({ default: ({ title }) => <div>{title}</div> }))
vi.mock('../../components/ui/Field.jsx', () => ({ default: () => null }))
vi.mock('../../components/ui/Dropdown.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/KpiCard.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/HorizBar.jsx', () => ({ default: () => null }))
vi.mock('../../components/pipeline/StageTracker.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/UserDetailDrawer.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/CandidateActivityTimeline.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/PresenceBadge.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/PostJobForm.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/ErrorReportBoundary.jsx', () => ({ default: ({ children }) => <>{children}</> }))
vi.mock('../../components/modals/HiredDetailsModal.jsx', () => ({ default: () => null }))
vi.mock('../../components/modals/OfferLetterModal.jsx', () => ({ default: () => null }))
vi.mock('../../components/recruiter/TalentMirror.jsx', () => ({ default: () => null }))
vi.mock('../../components/misc/TimeAgo.jsx', () => ({ default: () => null }))

// jsdom lacks IntersectionObserver — must be a real class for `new` keyword
global.IntersectionObserver = class {
  constructor(_cb, _opts) {}
  observe(_el) {}
  unobserve(_el) {}
  disconnect() {}
}

const mockUser = { id: 'r1', name: 'Recruiter', role: 'recruiter' }

async function smokeRender(element) {
  await act(async () => { render(element) })
  expect(document.body).toBeTruthy()
}

describe('Recruiter pages — smoke (batch 2)', () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockClear() })

  it('RecruiterPipeline renders', async () => {
    const { default: C } = await import('../../pages/recruiter/RecruiterPipeline.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('AssessmentReviewPage renders', async () => {
    const { default: C } = await import('../../pages/recruiter/AssessmentReviewPage.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('CandidateRejectionPage renders', async () => {
    const { default: C } = await import('../../pages/recruiter/CandidateRejectionPage.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('CompanyCollegeDrives renders', async () => {
    const { default: C } = await import('../../pages/recruiter/CompanyCollegeDrives.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('CompanyDriveDetail renders', async () => {
    const { default: C } = await import('../../pages/recruiter/CompanyDriveDetail.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('GenerateOfferPage renders', async () => {
    const { default: C } = await import('../../pages/recruiter/GenerateOfferPage.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('RecruiterSmartMatch renders', async () => {
    const { default: C } = await import('../../pages/recruiter/RecruiterSmartMatch.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('RecruiterTalentMatch renders', async () => {
    const { default: C } = await import('../../pages/recruiter/RecruiterTalentMatch.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('ScheduleInterviewPage renders', async () => {
    const { default: C } = await import('../../pages/recruiter/ScheduleInterviewPage.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('TalentPool (recruiter) renders', async () => {
    const { default: C } = await import('../../pages/recruiter/TalentPool.jsx')
    await smokeRender(<C user={mockUser} />)
  })
})
