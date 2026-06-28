/**
 * Tier-3 smoke tests: candidate pages render without crashing.
 */
import React from 'react'
import { render, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ skill: 'JavaScript', jobId: 'j1' }),
  useLocation: () => ({ pathname: '/app/candidate', search: '', state: null }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}))

vi.mock('../../api/api.js', () => {
  // Return a hybrid: [] that also has .data etc, satisfying both array and object access patterns
  const makeResp = () => Object.assign([], { data: [], results: [], total: 0, jobs: [], skills: [], applications: [] })
  return { api: new Proxy({}, { get: () => vi.fn(() => Promise.resolve(makeResp())) }) }
})

vi.mock('../../constants/styles.js', () => ({ card: {}, btnP: {}, btnG: {}, btnD: {}, inp: {} }))
vi.mock('../../constants/stages.js', () => ({ STAGES: [], SM: {} }))
vi.mock('../../constants/picklists.js', () => ({
  INDUSTRIES: [], DEPARTMENTS: [], SKILLS: [], EXPERIENCE_LEVELS: []
}))

vi.mock('../../components/ui/Toast.jsx', () => ({ default: () => null }))
vi.mock('../../components/ui/Spinner.jsx', () => ({ default: () => <div>Loading</div> }))
vi.mock('../../components/ui/Badge.jsx', () => ({ default: ({ label }) => <span>{label}</span> }))
vi.mock('../../components/ui/Modal.jsx', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../../components/ui/PageHeader.jsx', () => ({ default: ({ title }) => <div>{title}</div> }))
vi.mock('../../components/ui/Field.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/KpiCard.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/AreaChart.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/HorizBar.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/RingProgress.jsx', () => ({ default: () => null }))
vi.mock('../../components/misc/TimeAgo.jsx', () => ({ default: () => null }))
vi.mock('../../components/misc/InterviewCountdown.jsx', () => ({ default: () => null }))
vi.mock('../../components/misc/ActivityDot.jsx', () => ({ default: () => null }))
vi.mock('../../components/candidate/ReferralHub.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/UserDetailDrawer.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/ErrorReportBoundary.jsx', () => ({ default: ({ children }) => <>{children}</> }))

const mockUser = { id: 'c1', name: 'Alice Candidate', role: 'candidate', skills: ['JavaScript'] }

async function smokeRender(element) {
  await act(async () => { render(element) })
  expect(document.body).toBeTruthy()
}

describe('Candidate pages — smoke', () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockClear() })

  it('CandidateApplications renders', async () => {
    const { default: CandidateApplications } = await import('../../pages/candidate/CandidateApplications.jsx')
    await smokeRender(<CandidateApplications user={mockUser} />)
  })

  it('CandidateInterviews renders', async () => {
    const { default: CandidateInterviews } = await import('../../pages/candidate/CandidateInterviews.jsx')
    await smokeRender(<CandidateInterviews user={mockUser} />)
  })

  it('CandidateJobAlerts renders', async () => {
    const { default: CandidateJobAlerts } = await import('../../pages/candidate/CandidateJobAlerts.jsx')
    await smokeRender(<CandidateJobAlerts user={mockUser} />)
  })

  it('CandidateSmartMatch renders', async () => {
    const { default: CandidateSmartMatch } = await import('../../pages/candidate/CandidateSmartMatch.jsx')
    await smokeRender(<CandidateSmartMatch user={mockUser} />)
  })

  it('CandidateExploreJobs renders', async () => {
    const { default: CandidateExploreJobs } = await import('../../pages/candidate/CandidateExploreJobs.jsx')
    await smokeRender(<CandidateExploreJobs user={mockUser} />)
  })

  it('CandidateOnboarding renders', async () => {
    const { default: CandidateOnboarding } = await import('../../pages/candidate/CandidateOnboarding.jsx')
    await smokeRender(<CandidateOnboarding user={mockUser} />)
  })

  it('CandidateJobMatch renders', async () => {
    const { default: CandidateJobMatch } = await import('../../pages/candidate/CandidateJobMatch.jsx')
    await smokeRender(<CandidateJobMatch user={mockUser} />)
  })

  it('CandidateNotificationSettings renders', async () => {
    const { default: CandidateNotificationSettings } = await import('../../pages/candidate/CandidateNotificationSettings.jsx')
    await smokeRender(<CandidateNotificationSettings user={mockUser} />)
  })

  it('CandidateCareerJourney renders', async () => {
    const { default: CandidateCareerJourney } = await import('../../pages/candidate/CandidateCareerJourney.jsx')
    await smokeRender(<CandidateCareerJourney user={mockUser} />)
  })

  it('CandidateReferEarn renders', async () => {
    const { default: CandidateReferEarn } = await import('../../pages/candidate/CandidateReferEarn.jsx')
    await smokeRender(<CandidateReferEarn user={mockUser} />)
  })

  it('OfferComparison renders', async () => {
    const { default: OfferComparison } = await import('../../pages/candidate/OfferComparison.jsx')
    await smokeRender(<OfferComparison user={mockUser} />)
  })
})
