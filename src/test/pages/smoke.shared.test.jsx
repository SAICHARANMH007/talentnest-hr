/**
 * Tier-3 smoke tests: shared, superadmin, billing, and careers pages.
 */
import React from 'react'
import { render, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ orgSlug: 'acme', jobId: 'j1', id: 'u1', userId: 'u1' }),
  useLocation: () => ({ pathname: '/app', search: '', state: null }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}))

vi.mock('../../api/api.js', () => {
  const defaultResp = { data: [], results: [], total: 0, jobs: [], users: [], orgs: [] }
  return {
    api: new Proxy({}, { get: () => vi.fn(() => Promise.resolve(defaultResp)) }),
    downloadBlob: vi.fn(),
  }
})

vi.mock('../../api/client.js', () => ({
  req: vi.fn(() => Promise.resolve({ data: [] })),
  getToken: vi.fn(() => 'tok'),
  setToken: vi.fn(),
  clearToken: vi.fn(),
}))

vi.mock('../../api/config.js', () => ({
  API_BASE_URL: 'http://localhost:5000',
  SOCKET_BASE_URL: 'http://localhost:5000',
}))

vi.mock('../../constants/styles.js', () => ({ card: {}, btnP: {}, btnG: {}, btnD: {}, inp: {} }))
vi.mock('../../constants/stages.js', () => ({ STAGES: [], SM: {} }))
vi.mock('../../constants/picklists.js', () => ({ INDUSTRIES: [], DEPARTMENTS: [], SKILLS: [] }))
vi.mock('../../config/logo.js', () => ({ LOGO_PATH: '/logo.png' }))

vi.mock('../../components/ui/Toast.jsx', () => ({ default: () => null }))
vi.mock('../../components/ui/Spinner.jsx', () => ({ default: () => <div>Loading</div> }))
vi.mock('../../components/ui/Badge.jsx', () => ({ default: ({ label }) => <span>{label}</span> }))
vi.mock('../../components/ui/Modal.jsx', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../../components/ui/PageHeader.jsx', () => ({ default: ({ title }) => <div>{title}</div> }))
vi.mock('../../components/ui/Field.jsx', () => ({ default: () => null }))
vi.mock('../../components/Logo.jsx', () => ({ default: () => <img alt="logo" /> }))
vi.mock('../../components/charts/KpiCard.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/AreaChart.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/HorizBar.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/RingProgress.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/VertBarChart.jsx', () => ({ default: () => null }))
vi.mock('../../components/misc/TimeAgo.jsx', () => ({ default: () => null }))
vi.mock('../../components/misc/ActivityDot.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/UserDetailDrawer.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/PostJobForm.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/JobDetailDrawer.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/ErrorReportBoundary.jsx', () => ({ default: ({ children }) => <>{children}</> }))
vi.mock('../../components/modals/HiredDetailsModal.jsx', () => ({ default: () => null }))
vi.mock('../../components/LogoManager.jsx', () => ({ default: () => null }))
vi.mock('../../hooks/useOrgOptions.js', () => ({
  useOrgOptions: vi.fn(() => ({ stages: [], isVisible: vi.fn(() => true), customizations: {} })),
}))
vi.mock('../../hooks/useLogo.js', () => ({
  useLogo: vi.fn(() => ({ customLogoUrl: null, updateLogo: vi.fn() })),
}))

const mockUser = { id: 'u1', name: 'Test User', role: 'admin' }
const saUser = { id: 'sa1', name: 'Super Admin', role: 'superadmin' }

async function smokeRender(element) {
  await act(async () => { render(element) })
  expect(document.body).toBeTruthy()
}

describe('Shared pages — smoke', () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockClear() })

  it('ChangePasswordPage renders', async () => {
    const { default: ChangePasswordPage } = await import('../../pages/shared/ChangePasswordPage.jsx')
    await smokeRender(<ChangePasswordPage user={mockUser} />)
  })

  it('ProfilePage renders', async () => {
    const { default: ProfilePage } = await import('../../pages/shared/ProfilePage.jsx')
    await smokeRender(<ProfilePage user={mockUser} />)
  })

  it('PeoplePage renders', async () => {
    const { default: PeoplePage } = await import('../../pages/shared/PeoplePage.jsx')
    await smokeRender(<PeoplePage user={mockUser} />)
  })

  it('EmailSettingsPage renders', async () => {
    const { default: EmailSettingsPage } = await import('../../pages/shared/EmailSettingsPage.jsx')
    await smokeRender(<EmailSettingsPage user={mockUser} />)
  })

  it('SecuritySettingsPage renders', async () => {
    const { default: SecuritySettingsPage } = await import('../../pages/shared/SecuritySettingsPage.jsx')
    await smokeRender(<SecuritySettingsPage user={mockUser} />)
  })

  it('CreateJobPage renders', async () => {
    const { default: CreateJobPage } = await import('../../pages/shared/CreateJobPage.jsx')
    await smokeRender(<CreateJobPage user={mockUser} />)
  })

  it('InviteCandidatePage renders', async () => {
    const { default: InviteCandidatePage } = await import('../../pages/shared/InviteCandidatePage.jsx')
    await smokeRender(<InviteCandidatePage user={mockUser} />)
  })
})

describe('Superadmin pages — smoke', () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockClear() })

  it('SuperAdminOrgs renders', async () => {
    const { default: SuperAdminOrgs } = await import('../../pages/superadmin/SuperAdminOrgs.jsx')
    await smokeRender(<SuperAdminOrgs user={saUser} />)
  })

  it('SuperAdminCandidates renders', async () => {
    const { default: SuperAdminCandidates } = await import('../../pages/superadmin/SuperAdminCandidates.jsx')
    await smokeRender(<SuperAdminCandidates user={saUser} />)
  })

  it('SuperAdminAuditLogs renders', async () => {
    const { default: SuperAdminAuditLogs } = await import('../../pages/superadmin/SuperAdminAuditLogs.jsx')
    await smokeRender(<SuperAdminAuditLogs user={saUser} />)
  })

  it('SuperAdminPlatform renders', async () => {
    const { default: SuperAdminPlatform } = await import('../../pages/superadmin/SuperAdminPlatform.jsx')
    await smokeRender(<SuperAdminPlatform user={saUser} />)
  })
})

describe('Billing page — smoke', () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockClear() })

  it('BillingPage renders', async () => {
    const { default: BillingPage } = await import('../../pages/billing/BillingPage.jsx')
    await smokeRender(<BillingPage user={mockUser} />)
  })
})

describe('Careers pages — smoke', () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockClear() })

  it('CareersPage renders', async () => {
    const { default: CareersPage } = await import('../../pages/careers/CareersPage.jsx')
    await smokeRender(<CareersPage />)
  })

  it('JobDetailPage renders', async () => {
    const { default: JobDetailPage } = await import('../../pages/careers/JobDetailPage.jsx')
    await smokeRender(<JobDetailPage user={mockUser} />)
  })
})
