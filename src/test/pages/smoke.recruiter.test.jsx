/**
 * Tier-3 smoke tests: recruiter pages render without crashing.
 * Each test renders the page with mocked deps and just checks no throw.
 */
import React from 'react'
import { render, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockNavigate = vi.fn()
const mockLocation = { pathname: '/app/recruiter', search: '', state: null }

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => mockLocation,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}))

// Universal API stub — every method resolves to safe defaults
vi.mock('../../api/api.js', () => {
  const stub = {}
  const defaultResp = { data: [], results: [], total: 0, stats: {}, jobs: [], users: [] }
  const handler = { get: () => vi.fn(() => Promise.resolve(defaultResp)) }
  return { api: new Proxy(stub, handler) }
})

vi.mock('../../api/matching.js', () => ({ genericSearchMatch: vi.fn(() => true) }))
vi.mock('../../constants/styles.js', () => ({ card: {}, btnP: {}, btnG: {}, btnD: {}, inp: {} }))
vi.mock('../../constants/stages.js', () => ({ STAGES: [], SM: {} }))

// Mock heavy UI components
vi.mock('../../components/ui/Toast.jsx', () => ({ default: () => null }))
vi.mock('../../components/ui/Spinner.jsx', () => ({ default: () => <div>Loading</div> }))
vi.mock('../../components/ui/Badge.jsx', () => ({ default: ({ label }) => <span>{label}</span> }))
vi.mock('../../components/ui/Modal.jsx', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../../components/ui/PageHeader.jsx', () => ({ default: ({ title }) => <div>{title}</div> }))
vi.mock('../../components/ui/Field.jsx', () => ({ default: ({ label }) => <div>{label}</div> }))
vi.mock('../../components/charts/KpiCard.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/AreaChart.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/VertBarChart.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/FunnelChart.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/HorizBar.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/RingProgress.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/UserDetailDrawer.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/ResumeCard.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/PostJobForm.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/JobDetailDrawer.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/ShareJobModal.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/StageTracker.jsx', () => ({ default: () => null }))
vi.mock('../../components/assessments/AssessmentBuilder.jsx', () => ({ default: () => null }))
vi.mock('../../components/recruiter/TalentMirror.jsx', () => ({ default: () => null }))
vi.mock('../../components/misc/TimeAgo.jsx', () => ({ default: () => null }))
vi.mock('../../components/misc/ActivityDot.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/ErrorReportBoundary.jsx', () => ({
  default: ({ children }) => <>{children}</>,
}))

const mockUser = { id: 'u1', name: 'Recruiter User', role: 'recruiter' }

async function smokeRender(element) {
  await act(async () => { render(element) })
  expect(document.body).toBeTruthy()
}

describe('Recruiter pages — smoke', () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockClear() })

  it('RecruiterDashboard renders', async () => {
    const { default: RecruiterDashboard } = await import('../../pages/recruiter/RecruiterDashboard.jsx')
    await smokeRender(<RecruiterDashboard user={mockUser} />)
  })

  it('RecruiterJobs renders', async () => {
    const { default: RecruiterJobs } = await import('../../pages/recruiter/RecruiterJobs.jsx')
    await smokeRender(<RecruiterJobs user={mockUser} />)
  })

  it('RecruiterCandidates renders', async () => {
    const { default: RecruiterCandidates } = await import('../../pages/recruiter/RecruiterCandidates.jsx')
    await smokeRender(<RecruiterCandidates user={mockUser} />)
  })

  it('RecruiterInterviews renders', async () => {
    const { default: RecruiterInterviews } = await import('../../pages/recruiter/RecruiterInterviews.jsx')
    await smokeRender(<RecruiterInterviews user={mockUser} />)
  })

  it('RecruiterOffers renders', async () => {
    const { default: RecruiterOffers } = await import('../../pages/recruiter/RecruiterOffers.jsx')
    await smokeRender(<RecruiterOffers user={mockUser} />)
  })

  it('RecruiterAssessments renders', async () => {
    const { default: RecruiterAssessments } = await import('../../pages/recruiter/RecruiterAssessments.jsx')
    await smokeRender(<RecruiterAssessments user={mockUser} />)
  })

  it('RecruiterMyPerformance renders', async () => {
    const { default: RecruiterMyPerformance } = await import('../../pages/recruiter/RecruiterMyPerformance.jsx')
    await smokeRender(<RecruiterMyPerformance user={mockUser} />)
  })
})
