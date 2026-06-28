/**
 * Tier-3 smoke: remaining superadmin pages (15 uncovered).
 */
import React from 'react'
import { render, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ orgId: 'org1', id: 'id1' }),
  useLocation: () => ({ pathname: '/superadmin', search: '', state: null }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}))

vi.mock('../../api/api.js', () => {
  // data is a hybrid array+object so both .map() and .totalGuests work
  // (SuperAdminUnregisteredCandidates reads stats via r.data.totalGuests etc.)
  const data = Object.assign([], {
    totalGuests: 0, totalInvited: 0, converted: 0, pending: 0, notInvited: 0, successRate: 0,
  })
  const resp = Object.assign([], {
    data, results: [], total: 0, orgs: [], users: [], jobs: [],
    pagination: { total: 0, pages: 1 },
  })
  const stub = new Proxy({}, { get: () => vi.fn(() => Promise.resolve(resp)) })
  return { api: stub, default: stub, downloadBlob: vi.fn() }
})

vi.mock('../../constants/styles.js', () => ({
  card: {}, btnP: {}, btnG: {}, btnD: {}, inp: {}, glassCard: {}
}))
vi.mock('../../config/logo.js', () => ({ LOGO_PATH: '/logo.png' }))
vi.mock('../../hooks/useLogo.js', () => ({
  useLogo: vi.fn(() => ({ customLogoUrl: null, updateLogo: vi.fn() })),
}))
vi.mock('../../hooks/useOrgOptions.js', () => ({
  useOrgOptions: vi.fn(() => ({ stages: [], isVisible: vi.fn(() => true), customizations: {} })),
}))

vi.mock('../../components/ui/Toast.jsx', () => ({ default: () => null }))
vi.mock('../../components/ui/Spinner.jsx', () => ({ default: () => <div>Loading</div> }))
vi.mock('../../components/ui/Badge.jsx', () => ({ default: ({ label }) => <span>{label}</span> }))
vi.mock('../../components/ui/Modal.jsx', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../../components/ui/PageHeader.jsx', () => ({ default: ({ title }) => <div>{title}</div> }))
vi.mock('../../components/ui/Field.jsx', () => ({ default: () => null }))
vi.mock('../../components/ui/FormRow.jsx', () => ({ default: () => null }))
vi.mock('../../components/Logo.jsx', () => ({ default: () => <img alt="logo" /> }))
vi.mock('../../components/LogoManager.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/KpiCard.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/AreaChart.jsx', () => ({ default: () => null }))
vi.mock('../../components/charts/HorizBar.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/ErrorReportBoundary.jsx', () => ({ default: ({ children }) => <>{children}</> }))
vi.mock('../../components/misc/TimeAgo.jsx', () => ({ default: () => null }))

const mockUser = { id: 'sa1', name: 'Super Admin', role: 'superadmin' }

async function smokeRender(element) {
  await act(async () => { render(element) })
  expect(document.body).toBeTruthy()
}

describe('Superadmin pages — smoke (batch 2)', () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockClear() })

  it('CreateOrganisationPage renders', async () => {
    const { default: C } = await import('../../pages/superadmin/CreateOrganisationPage.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('SuperAdminBgvTracker renders', async () => {
    const { default: C } = await import('../../pages/superadmin/SuperAdminBgvTracker.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('SuperAdminBlogs renders', async () => {
    const { default: C } = await import('../../pages/superadmin/SuperAdminBlogs.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('SuperAdminCandidateImport renders', async () => {
    const { default: C } = await import('../../pages/superadmin/SuperAdminCandidateImport.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('SuperAdminCandidateRequests renders', async () => {
    const { default: C } = await import('../../pages/superadmin/SuperAdminCandidateRequests.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('SuperAdminCollegeGroups renders', async () => {
    const { default: C } = await import('../../pages/superadmin/SuperAdminCollegeGroups.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('SuperAdminCommandCenter renders', async () => {
    const { default: C } = await import('../../pages/superadmin/SuperAdminCommandCenter.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('SuperAdminCompanyGroups renders', async () => {
    const { default: C } = await import('../../pages/superadmin/SuperAdminCompanyGroups.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('SuperAdminCustomizations renders', async () => {
    const { default: C } = await import('../../pages/superadmin/SuperAdminCustomizations.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('SuperAdminPermissions renders', async () => {
    const { default: C } = await import('../../pages/superadmin/SuperAdminPermissions.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('SuperAdminPlatformReferrals renders', async () => {
    const { default: C } = await import('../../pages/superadmin/SuperAdminPlatformReferrals.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('SuperAdminPlaybooks renders', async () => {
    const { default: C } = await import('../../pages/superadmin/SuperAdminPlaybooks.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('SuperAdminReportedPosts renders', async () => {
    const { default: C } = await import('../../pages/superadmin/SuperAdminReportedPosts.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('SuperAdminSecurity renders', async () => {
    const { default: C } = await import('../../pages/superadmin/SuperAdminSecurity.jsx')
    await smokeRender(<C user={mockUser} />)
  })

  it('SuperAdminUnregisteredCandidates renders', async () => {
    const { default: C } = await import('../../pages/superadmin/SuperAdminUnregisteredCandidates.jsx')
    await smokeRender(<C user={mockUser} />)
  })
})
