/**
 * Tier-3 smoke tests: auth, public, billing, college, client, hiring manager pages.
 */
import React from 'react'
import { render, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ token: 'tok', id: 'id1', driveId: 'drive1', orgSlug: 'acme' }),
  useLocation: () => ({ pathname: '/', search: '?id=x', state: null }),
  useSearchParams: () => [new URLSearchParams('id=x&token=tok'), vi.fn()],
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}))

vi.mock('../../api/api.js', () => {
  const defaultResp = { data: [], results: [], total: 0, jobs: [], drives: [], students: [], clients: [] }
  return { api: new Proxy({}, { get: () => vi.fn(() => Promise.resolve(defaultResp)) }) }
})

vi.mock('../../api/client.js', () => ({
  req: vi.fn(() => Promise.resolve({
    job: { title: 'Test Job', company: 'Test Corp', location: 'Remote', type: 'Full-time' },
    currentStage: 'Applied',
    status: 'active',
    stageHistory: [],
    appliedAt: new Date().toISOString(),
  })),
  getToken: vi.fn(() => null),
}))

vi.mock('../../api/config.js', () => ({
  API_BASE_URL: 'http://localhost:5000',
  SOCKET_BASE_URL: 'http://localhost:5000',
}))

vi.mock('../../constants/styles.js', () => ({ card: {}, btnP: {}, btnG: {}, btnD: {}, inp: {} }))
vi.mock('../../constants/stages.js', () => ({ STAGES: [], SM: {} }))
vi.mock('../../constants/picklists.js', () => ({
  INDUSTRIES: [], DEPARTMENTS: [], SKILLS: [], COLLEGE_TYPES: []
}))
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
vi.mock('../../components/misc/TimeAgo.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/CollegeAutocomplete.jsx', () => ({ default: () => null }))
vi.mock('../../components/shared/ErrorReportBoundary.jsx', () => ({ default: ({ children }) => <>{children}</> }))

const mockUser = { id: 'u1', name: 'Test User', role: 'admin' }
const collegeUser = { id: 'c1', name: 'College Admin', role: 'college_admin', collegeId: 'col1' }
const clientUser = { id: 'cl1', name: 'Client User', role: 'client' }
const hmUser = { id: 'hm1', name: 'HM User', role: 'hiring_manager' }

async function smokeRender(element) {
  await act(async () => { render(element) })
  expect(document.body).toBeTruthy()
}

describe('Auth pages — smoke', () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockClear() })

  it('AuthScreen renders', async () => {
    const { default: AuthScreen } = await import('../../pages/auth/AuthScreen.jsx')
    await smokeRender(<AuthScreen onLogin={vi.fn()} />)
  })

  it('SetPasswordPage renders', async () => {
    const { default: SetPasswordPage } = await import('../../pages/auth/SetPasswordPage.jsx')
    await smokeRender(<SetPasswordPage />)
  })
})

describe('Public pages — smoke', () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockClear() })

  it('ApplicationTracker renders', async () => {
    const { default: ApplicationTracker } = await import('../../pages/public/ApplicationTracker.jsx')
    await smokeRender(<ApplicationTracker />)
  })

  it('InterestConfirmedPage renders', async () => {
    const { default: InterestConfirmedPage } = await import('../../pages/public/InterestConfirmedPage.jsx')
    await smokeRender(<InterestConfirmedPage />)
  })

  it('InterestDeclinedPage renders', async () => {
    const { default: InterestDeclinedPage } = await import('../../pages/public/InterestDeclinedPage.jsx')
    await smokeRender(<InterestDeclinedPage />)
  })

  it('NpsSurveyPage renders', async () => {
    const { default: NpsSurveyPage } = await import('../../pages/public/NpsSurveyPage.jsx')
    await smokeRender(<NpsSurveyPage />)
  })
})

describe('College pages — smoke', () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockClear() })

  it('CollegeDrives renders', async () => {
    const { default: CollegeDrives } = await import('../../pages/college/CollegeDrives.jsx')
    await smokeRender(<CollegeDrives user={collegeUser} />)
  })

  it('CollegeOverview renders', async () => {
    const { default: CollegeOverview } = await import('../../pages/college/CollegeOverview.jsx')
    await smokeRender(<CollegeOverview user={collegeUser} />)
  })

  it('CollegeStudents renders', async () => {
    const { default: CollegeStudents } = await import('../../pages/college/CollegeStudents.jsx')
    await smokeRender(<CollegeStudents user={collegeUser} />)
  })

  it('CollegePlacements renders', async () => {
    const { default: CollegePlacements } = await import('../../pages/college/CollegePlacements.jsx')
    await smokeRender(<CollegePlacements user={collegeUser} />)
  })
})

describe('Client pages — smoke', () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockClear() })

  it('ClientDashboard renders', async () => {
    const { default: ClientDashboard } = await import('../../pages/client/ClientDashboard.jsx')
    await smokeRender(<ClientDashboard user={clientUser} />)
  })

  it('ClientShortlists renders', async () => {
    const { default: ClientShortlists } = await import('../../pages/client/ClientShortlists.jsx')
    await smokeRender(<ClientShortlists user={clientUser} />)
  })

  it('ClientPlacements renders', async () => {
    const { default: ClientPlacements } = await import('../../pages/client/ClientPlacements.jsx')
    await smokeRender(<ClientPlacements user={clientUser} />)
  })
})

describe('HiringManager pages — smoke', () => {
  beforeEach(() => { vi.clearAllMocks(); mockNavigate.mockClear() })

  it('HiringManagerDashboard renders', async () => {
    const { default: HiringManagerDashboard } = await import('../../pages/hiring_manager/HiringManagerDashboard.jsx')
    await smokeRender(<HiringManagerDashboard user={hmUser} />)
  })

  it('MyTeam renders', async () => {
    const { default: MyTeam } = await import('../../pages/hiring_manager/MyTeam.jsx')
    await smokeRender(<MyTeam user={hmUser} />)
  })
})
