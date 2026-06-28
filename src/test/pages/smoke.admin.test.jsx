/**
 * Tier-3 smoke tests: admin pages render without crashing.
 */
import React from 'react'
import { render, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/app/admin', search: '', state: null }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}))

vi.mock('../../api/api.js', () => {
  const defaultResp = { data: [], results: [], total: 0, users: [], jobs: [], stats: {} }
  return {
    api: new Proxy({}, { get: () => vi.fn(() => Promise.resolve(defaultResp)) }),
    downloadBlob: vi.fn(),
  }
})
vi.mock('../../hooks/useOrgOptions.js', () => ({
  useOrgOptions: vi.fn(() => ({ stages: [], isVisible: vi.fn(() => true), customizations: {} })),
}))
vi.mock('../../components/modals/HiredDetailsModal.jsx', () => ({ default: () => null }))

vi.mock('../../constants/styles.js', () => ({ card: {}, btnP: {}, btnG: {}, btnD: {}, inp: {} }))
vi.mock('../../constants/stages.js', () => ({ STAGES: [], SM: {} }))
vi.mock('../../constants/picklists.js', () => ({ INDUSTRIES: [], DEPARTMENTS: [] }))

vi.mock('../../components/ui/Toast.jsx', () => ({ default: () => null }))
vi.mock('../../components/ui/Spinner.jsx', () => ({ default: () => <div>Loading</div> }))
vi.mock('../../components/ui/Badge.jsx', () => ({ default: ({ label }) => <span>{label}</span> }))
vi.mock('../../components/ui/Modal.jsx', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../../components/ui/PageHeader.jsx', () => ({ default: ({ title }) => <div>{title}</div> }))
vi.mock('../../components/ui/Field.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/KpiCard.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/AreaChart.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/VertBarChart.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/FunnelChart.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/HorizBar.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/RingProgress.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/PieChart.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/UserDetailDrawer.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/PostJobForm.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/JobDetailDrawer.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/ErrorReportBoundary.jsx', () => ({ default: ({ children }) => <>{children}</> }))
vi.mock('../../components/misc/TimeAgo.jsx', () => ({ default: () => null }))
vi.mock('../../components/misc/ActivityDot.jsx', () => ({ default: () => null }))
vi.mock('../../components/misc/InterviewCountdown.jsx', () => ({ default: () => null }))

const mockUser = { id: 'a1', name: 'Admin User', role: 'admin' }

async function smokeRender(element) {
  await act(async () => { render(element) })
  expect(document.body).toBeTruthy()
}

describe('Admin pages — smoke', () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockClear() })

  it('AdminUsers renders', async () => {
    const { default: AdminUsers } = await import('../../pages/admin/AdminUsers.jsx')
    // filterRole is required or charAt() crashes
    await smokeRender(<AdminUsers user={mockUser} filterRole="recruiter" />)
  })

  it('AdminJobs renders', async () => {
    const { default: AdminJobs } = await import('../../pages/admin/AdminJobs.jsx')
    await smokeRender(<AdminJobs user={mockUser} />)
  })

  it('AdminAnalytics renders', async () => {
    const { default: AdminAnalytics } = await import('../../pages/admin/AdminAnalytics.jsx')
    await smokeRender(<AdminAnalytics user={mockUser} />)
  })

  it('AdminPipeline renders', async () => {
    const { default: AdminPipeline } = await import('../../pages/admin/AdminPipeline.jsx')
    await smokeRender(<AdminPipeline user={mockUser} />)
  })

  it('AdminSkillAssessments renders', async () => {
    const { default: AdminSkillAssessments } = await import('../../pages/admin/AdminSkillAssessments.jsx')
    await smokeRender(<AdminSkillAssessments user={mockUser} />)
  })

  it('AdminInterviewKits renders', async () => {
    const { default: AdminInterviewKits } = await import('../../pages/admin/AdminInterviewKits.jsx')
    await smokeRender(<AdminInterviewKits user={mockUser} />)
  })

  it('AdminNPS renders', async () => {
    const { default: AdminNPS } = await import('../../pages/admin/AdminNPS.jsx')
    await smokeRender(<AdminNPS user={mockUser} />)
  })

  it('AdminDriveApprovals renders', async () => {
    const { default: AdminDriveApprovals } = await import('../../pages/admin/AdminDriveApprovals.jsx')
    await smokeRender(<AdminDriveApprovals user={mockUser} />)
  })

  it('AdminReferrals renders', async () => {
    const { default: AdminReferrals } = await import('../../pages/admin/AdminReferrals.jsx')
    await smokeRender(<AdminReferrals user={mockUser} />)
  })

  it('OrgSettings renders', async () => {
    const { default: OrgSettings } = await import('../../pages/admin/OrgSettings.jsx')
    await smokeRender(<OrgSettings user={mockUser} />)
  })

  it('AdminOnboarding renders', async () => {
    const { default: AdminOnboarding } = await import('../../pages/admin/AdminOnboarding.jsx')
    await smokeRender(<AdminOnboarding user={mockUser} />)
  })

  it('AdminReviews renders', async () => {
    const { default: AdminReviews } = await import('../../pages/admin/AdminReviews.jsx')
    await smokeRender(<AdminReviews user={mockUser} />)
  })
})
