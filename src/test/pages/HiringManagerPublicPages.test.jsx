import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Router mocks ─────────────────────────────────────────────────────────────
const mockNavigate = vi.fn()
let mockParams = {}
let mockSearchParams = new URLSearchParams()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
  useSearchParams: () => [mockSearchParams, vi.fn()],
  Link: ({ to, children, onClick, style }) => (
    <a href={to} onClick={onClick} style={style} data-testid="link">
      {children}
    </a>
  ),
  NavLink: ({ to, children }) => <a href={to}>{children}</a>,
}))

// ── API mocks ─────────────────────────────────────────────────────────────────
vi.mock('../../api/api.js', () => ({
  api: {
    getApplications: vi.fn(),
    getMyTeamJobs: vi.fn(),
    getInviteByToken: vi.fn(),
    respondToInvite: vi.fn(),
    decideOfferApproval: vi.fn(),
  },
}))

vi.mock('../../api/client.js', () => ({
  req: vi.fn(),
}))

// ── Config mocks ──────────────────────────────────────────────────────────────
vi.mock('../../api/config.js', () => ({
  API_BASE_URL: 'http://localhost:5000/api',
}))

// ── UI Component stubs ────────────────────────────────────────────────────────
vi.mock('../../components/ui/PageHeader.jsx', () => ({
  default: ({ title, subtitle }) => (
    <div data-testid="page-header">
      <div data-testid="page-header-title">{title}</div>
      <div data-testid="page-header-subtitle">{subtitle}</div>
    </div>
  ),
}))

vi.mock('../../components/ui/Spinner.jsx', () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}))

vi.mock('../../components/ui/Badge.jsx', () => ({
  default: ({ label, color }) => <span data-testid="badge" data-color={color}>{label}</span>,
}))

vi.mock('../../components/ui/Toast.jsx', () => ({
  default: ({ msg }) => (msg ? <div data-testid="toast">{msg}</div> : null),
}))

vi.mock('../../components/ui/Modal.jsx', () => ({
  default: ({ title, children, footer, onClose }) => (
    <div data-testid="modal">
      <div data-testid="modal-title">{title}</div>
      <button data-testid="modal-close" onClick={onClose}>Close</button>
      {children}
      {footer}
    </div>
  ),
}))

// ── Chart stubs ───────────────────────────────────────────────────────────────
vi.mock('../../components/charts/KpiCard.jsx', () => ({
  default: ({ label, value, icon }) => (
    <div data-testid="kpi-card">
      <span data-testid="kpi-icon">{icon}</span>
      <span data-testid="kpi-label">{label}</span>
      <span data-testid="kpi-value">{value}</span>
    </div>
  ),
}))

vi.mock('../../components/charts/HorizBar.jsx', () => ({
  default: ({ label, value }) => (
    <div data-testid="horiz-bar">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
}))

vi.mock('../../components/charts/DonutChart.jsx', () => ({
  default: ({ segments }) => (
    <div data-testid="donut-chart">{segments?.length} segments</div>
  ),
}))

// ── Constants stubs ───────────────────────────────────────────────────────────
vi.mock('../../constants/styles.js', () => ({
  card: {},
  btnG: {},
  btnP: {},
  btnD: {},
  inp: {},
}))

// ── Imports AFTER all vi.mock() calls ─────────────────────────────────────────
import { api } from '../../api/api.js'
import { req } from '../../api/client.js'
import HiringManagerDashboard from '../../pages/hiring_manager/HiringManagerDashboard.jsx'
import MyTeam from '../../pages/hiring_manager/MyTeam.jsx'
import ApplicationTracker from '../../pages/public/ApplicationTracker.jsx'
import InterestConfirmedPage from '../../pages/public/InterestConfirmedPage.jsx'
import InterestDeclinedPage from '../../pages/public/InterestDeclinedPage.jsx'
import InviteResponsePage from '../../pages/public/InviteResponsePage.jsx'
import NpsSurveyPage from '../../pages/public/NpsSurveyPage.jsx'
import OfferApprovalPage from '../../pages/public/OfferApprovalPage.jsx'
import PostPublicPage from '../../pages/public/PostPublicPage.jsx'
import SchedulingPage from '../../pages/public/SchedulingPage.jsx'

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeApp(overrides = {}) {
  return {
    _id: 'app1',
    id: 'app1',
    currentStage: 'Screening',
    stage: 'Screening',
    candidateId: { name: 'Alice Doe', email: 'alice@example.com' },
    jobId: { title: 'Frontend Engineer' },
    aiMatchScore: 80,
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    interviewRounds: [],
    stageHistory: [],
    ...overrides,
  }
}

function makeJob(overrides = {}) {
  return {
    _id: 'job1',
    id: 'job1',
    title: 'Frontend Engineer',
    company: 'Acme Corp',
    department: 'Engineering',
    location: 'Remote',
    status: 'active',
    approvalStatus: 'approved',
    openings: 2,
    assignedRecruiters: [{ id: 'r1', _id: 'r1', name: 'Bob Recruiter' }],
    pipelineStats: { Applied: 5, Screening: 3, Shortlisted: 2 },
    ...overrides,
  }
}

const mockUser = { id: 'hm1', name: 'Hannah Manager', role: 'hiring_manager' }

// ─────────────────────────────────────────────────────────────────────────────
// HiringManagerDashboard
// ─────────────────────────────────────────────────────────────────────────────
describe('HiringManagerDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    api.getApplications.mockResolvedValue([])
  })

  it('renders without crashing and shows the page header', async () => {
    await act(async () => { render(<HiringManagerDashboard user={mockUser} />) })
    expect(screen.getByTestId('page-header')).toBeInTheDocument()
    expect(screen.getByTestId('page-header-title').textContent).toMatch(/Hannah/)
  })

  it('calls api.getApplications on mount', async () => {
    await act(async () => { render(<HiringManagerDashboard user={mockUser} />) })
    expect(api.getApplications).toHaveBeenCalledTimes(1)
    expect(api.getApplications).toHaveBeenCalledWith({ limit: 10000000 })
  })

  it('shows spinner while loading', () => {
    api.getApplications.mockReturnValue(new Promise(() => {}))
    render(<HiringManagerDashboard user={mockUser} />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('renders KPI cards after data loads', async () => {
    api.getApplications.mockResolvedValue([makeApp(), makeApp({ _id: 'app2', id: 'app2', currentStage: 'Hired' })])
    await act(async () => { render(<HiringManagerDashboard user={mockUser} />) })
    const labels = screen.getAllByTestId('kpi-label').map(el => el.textContent)
    expect(labels).toContain('Total Candidates')
    expect(labels).toContain('In Interview')
    expect(labels).toContain('Offers Extended')
    expect(labels).toContain('Hired')
  })

  it('shows "No candidates match your filters" when no apps match search', async () => {
    api.getApplications.mockResolvedValue([makeApp()])
    await act(async () => { render(<HiringManagerDashboard user={mockUser} />) })
    const searchInput = screen.getByPlaceholderText(/Search by name or job title/i)
    fireEvent.change(searchInput, { target: { value: 'zzznomatch' } })
    expect(screen.getByText(/No candidates match your filters/i)).toBeInTheDocument()
  })

  it('renders candidate table with name and job after data loads', async () => {
    api.getApplications.mockResolvedValue([makeApp()])
    await act(async () => { render(<HiringManagerDashboard user={mockUser} />) })
    expect(screen.getByText('Alice Doe')).toBeInTheDocument()
    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument()
  })

  it('filters candidates by search term', async () => {
    api.getApplications.mockResolvedValue([
      makeApp(),
      makeApp({ _id: 'app2', id: 'app2', candidateId: { name: 'Bob Smith', email: 'bob@example.com' } }),
    ])
    await act(async () => { render(<HiringManagerDashboard user={mockUser} />) })
    const searchInput = screen.getByPlaceholderText(/Search by name or job title/i)
    fireEvent.change(searchInput, { target: { value: 'Bob' } })
    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
    expect(screen.queryByText('Alice Doe')).not.toBeInTheDocument()
  })

  it('filters candidates by stage dropdown', async () => {
    api.getApplications.mockResolvedValue([
      makeApp({ currentStage: 'Screening' }),
      makeApp({ _id: 'app2', id: 'app2', currentStage: 'Hired', candidateId: { name: 'Hired Person', email: 'h@e.com' }, jobId: { title: 'Backend Dev' } }),
    ])
    await act(async () => { render(<HiringManagerDashboard user={mockUser} />) })
    const stageSelect = screen.getByDisplayValue('All Stages')
    fireEvent.change(stageSelect, { target: { value: 'Hired' } })
    expect(screen.getByText('Hired Person')).toBeInTheDocument()
    expect(screen.queryByText('Alice Doe')).not.toBeInTheDocument()
  })

  it('changes sort order when sort select changes', async () => {
    api.getApplications.mockResolvedValue([makeApp()])
    await act(async () => { render(<HiringManagerDashboard user={mockUser} />) })
    const sortSelect = screen.getByDisplayValue('Sort: Recent')
    fireEvent.change(sortSelect, { target: { value: 'score' } })
    expect(screen.getByDisplayValue('Sort: Match Score')).toBeInTheDocument()
  })

  it('shows total candidates count in subtitle', async () => {
    api.getApplications.mockResolvedValue([makeApp(), makeApp({ _id: 'app2', id: 'app2' })])
    await act(async () => { render(<HiringManagerDashboard user={mockUser} />) })
    expect(screen.getByTestId('page-header-subtitle').textContent).toMatch(/2 total candidates/)
  })

  it('handles API returning { data: [...] } envelope', async () => {
    api.getApplications.mockResolvedValue({ data: [makeApp()] })
    await act(async () => { render(<HiringManagerDashboard user={mockUser} />) })
    expect(screen.getByText('Alice Doe')).toBeInTheDocument()
  })

  it('handles API error gracefully (empty table)', async () => {
    api.getApplications.mockRejectedValue(new Error('Network error'))
    await act(async () => { render(<HiringManagerDashboard user={mockUser} />) })
    expect(screen.getByText(/No candidates match your filters/i)).toBeInTheDocument()
  })

  it('shows donut chart when pipeline has data', async () => {
    api.getApplications.mockResolvedValue([makeApp({ currentStage: 'Applied' })])
    await act(async () => { render(<HiringManagerDashboard user={mockUser} />) })
    expect(screen.getByTestId('donut-chart')).toBeInTheDocument()
  })

  it('shows "No pipeline data yet" when apps array is empty', async () => {
    api.getApplications.mockResolvedValue([])
    await act(async () => { render(<HiringManagerDashboard user={mockUser} />) })
    expect(screen.getByText('No pipeline data yet')).toBeInTheDocument()
  })

  it('shows "No interviews scheduled in the next 7 days" when none upcoming', async () => {
    api.getApplications.mockResolvedValue([])
    await act(async () => { render(<HiringManagerDashboard user={mockUser} />) })
    expect(screen.getByText(/No interviews scheduled in the next 7 days/i)).toBeInTheDocument()
  })

  it('renders result count label correctly', async () => {
    api.getApplications.mockResolvedValue([makeApp()])
    await act(async () => { render(<HiringManagerDashboard user={mockUser} />) })
    expect(screen.getByText('1 result')).toBeInTheDocument()
  })

  it('uses "Manager" fallback when user has no name', async () => {
    await act(async () => { render(<HiringManagerDashboard user={{}} />) })
    expect(screen.getByTestId('page-header-title').textContent).toMatch(/Hiring Manager/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MyTeam
// ─────────────────────────────────────────────────────────────────────────────
describe('MyTeam', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    api.getMyTeamJobs.mockResolvedValue([])
  })

  it('renders without crashing and shows page header', async () => {
    await act(async () => { render(<MyTeam user={mockUser} />) })
    expect(screen.getByTestId('page-header')).toBeInTheDocument()
    expect(screen.getByTestId('page-header-title').textContent).toMatch(/My Team/)
  })

  it('calls api.getMyTeamJobs on mount', async () => {
    await act(async () => { render(<MyTeam user={mockUser} />) })
    expect(api.getMyTeamJobs).toHaveBeenCalledTimes(1)
  })

  it('shows spinner while loading', () => {
    api.getMyTeamJobs.mockReturnValue(new Promise(() => {}))
    render(<MyTeam user={mockUser} />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('shows empty state when no jobs assigned', async () => {
    api.getMyTeamJobs.mockResolvedValue([])
    await act(async () => { render(<MyTeam user={mockUser} />) })
    expect(screen.getByText(/No jobs assigned to you yet/i)).toBeInTheDocument()
  })

  it('renders job title and company when jobs exist', async () => {
    api.getMyTeamJobs.mockResolvedValue([makeJob()])
    await act(async () => { render(<MyTeam user={mockUser} />) })
    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument()
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument()
  })

  it('renders recruiter badges', async () => {
    api.getMyTeamJobs.mockResolvedValue([makeJob()])
    await act(async () => { render(<MyTeam user={mockUser} />) })
    expect(screen.getByText(/Bob Recruiter/)).toBeInTheDocument()
  })

  it('shows pipeline stage badges when pipeline has candidates', async () => {
    api.getMyTeamJobs.mockResolvedValue([makeJob()])
    await act(async () => { render(<MyTeam user={mockUser} />) })
    expect(screen.getByText(/Applied: 5/)).toBeInTheDocument()
    expect(screen.getByText(/Screening: 3/)).toBeInTheDocument()
  })

  it('View Pipeline button navigates to /app/pipeline', async () => {
    api.getMyTeamJobs.mockResolvedValue([makeJob()])
    await act(async () => { render(<MyTeam user={mockUser} />) })
    const btn = screen.getByText('View Pipeline →')
    fireEvent.click(btn)
    expect(mockNavigate).toHaveBeenCalledWith('/app/pipeline')
  })

  it('shows error message when API fails', async () => {
    api.getMyTeamJobs.mockRejectedValue(new Error('Fetch failed'))
    await act(async () => { render(<MyTeam user={mockUser} />) })
    expect(screen.getByText(/Fetch failed/)).toBeInTheDocument()
  })

  it('shows No recruiter assigned yet when recruiter list is empty', async () => {
    api.getMyTeamJobs.mockResolvedValue([makeJob({ assignedRecruiters: [] })])
    await act(async () => { render(<MyTeam user={mockUser} />) })
    expect(screen.getByText(/No recruiter assigned yet/i)).toBeInTheDocument()
  })

  it('shows total candidates count in pipeline', async () => {
    api.getMyTeamJobs.mockResolvedValue([makeJob()])
    await act(async () => { render(<MyTeam user={mockUser} />) })
    // Applied(5) + Screening(3) + Shortlisted(2) = 10
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('renders location and department info', async () => {
    api.getMyTeamJobs.mockResolvedValue([makeJob()])
    await act(async () => { render(<MyTeam user={mockUser} />) })
    expect(screen.getByText(/Engineering/)).toBeInTheDocument()
    expect(screen.getByText(/Remote/)).toBeInTheDocument()
  })

  it('handles { data: [...] } envelope from api', async () => {
    api.getMyTeamJobs.mockResolvedValue({ data: [makeJob()] })
    await act(async () => { render(<MyTeam user={mockUser} />) })
    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ApplicationTracker
// ─────────────────────────────────────────────────────────────────────────────
describe('ApplicationTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockParams = { token: 'tracker-token-abc' }
    req.mockResolvedValue({
      status: 'active',
      currentStage: 'Screening',
      createdAt: '2025-06-01T00:00:00Z',
      job: { title: 'Frontend Engineer', company: 'Acme Corp', location: 'Remote', type: 'Full-time' },
      stageHistory: [{ stage: 'Applied', movedAt: '2025-06-01T00:00:00Z' }],
    })
  })

  it('renders without crashing', async () => {
    await act(async () => { render(<ApplicationTracker />) })
    expect(screen.getByText(/Application Status/i)).toBeInTheDocument()
  })

  it('calls req with the correct endpoint using the token', async () => {
    await act(async () => { render(<ApplicationTracker />) })
    expect(req).toHaveBeenCalledWith('GET', '/applications/status/tracker-token-abc')
  })

  it('shows loading state initially', () => {
    req.mockReturnValue(new Promise(() => {}))
    render(<ApplicationTracker />)
    expect(screen.getByText(/Loading your application status/i)).toBeInTheDocument()
  })

  it('shows error when token is missing', async () => {
    mockParams = {}
    await act(async () => { render(<ApplicationTracker />) })
    expect(screen.getByText(/Invalid tracker link/i)).toBeInTheDocument()
  })

  it('shows error when API call fails', async () => {
    req.mockRejectedValue(new Error('not found'))
    await act(async () => { render(<ApplicationTracker />) })
    expect(screen.getByText(/Application not found or link expired/i)).toBeInTheDocument()
  })

  it('renders job title and company in header', async () => {
    await act(async () => { render(<ApplicationTracker />) })
    expect(screen.getByText(/Frontend Engineer · Acme Corp/i)).toBeInTheDocument()
  })

  it('shows "Active" status badge for active applications', async () => {
    await act(async () => { render(<ApplicationTracker />) })
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows "Not Selected" for rejected applications', async () => {
    req.mockResolvedValue({
      status: 'rejected',
      currentStage: 'Rejected',
      createdAt: '2025-06-01T00:00:00Z',
      job: { title: 'Frontend Engineer', company: 'Acme Corp' },
      stageHistory: [],
    })
    await act(async () => { render(<ApplicationTracker />) })
    expect(screen.getByText(/Application Not Progressed/i)).toBeInTheDocument()
  })

  it('shows timeline section when stageHistory has entries', async () => {
    await act(async () => { render(<ApplicationTracker />) })
    expect(screen.getByText(/Timeline/i)).toBeInTheDocument()
    const appliedEls = screen.getAllByText('Applied')
    expect(appliedEls.length).toBeGreaterThan(0)
  })

  it('shows progress section for active application', async () => {
    await act(async () => { render(<ApplicationTracker />) })
    expect(screen.getByText(/Progress/i)).toBeInTheDocument()
  })

  it('shows withdrawn message for withdrawn applications', async () => {
    req.mockResolvedValue({
      status: 'withdrawn',
      currentStage: 'Withdrawn',
      createdAt: '2025-06-01T00:00:00Z',
      job: { title: 'Frontend Engineer', company: 'Acme Corp' },
      stageHistory: [],
    })
    await act(async () => { render(<ApplicationTracker />) })
    expect(screen.getByText(/Application Withdrawn/i)).toBeInTheDocument()
  })

  it('renders "Powered by TalentNest HR" footer', async () => {
    await act(async () => { render(<ApplicationTracker />) })
    expect(screen.getByText(/Powered by/i)).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// InterestConfirmedPage
// ─────────────────────────────────────────────────────────────────────────────
describe('InterestConfirmedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<InterestConfirmedPage />)
    expect(screen.getByText(/You're Interested!/i)).toBeInTheDocument()
  })

  it('shows the confirmation message', () => {
    render(<InterestConfirmedPage />)
    expect(screen.getByText(/Thank you for confirming your interest/i)).toBeInTheDocument()
  })

  it('renders a Close Window button', () => {
    render(<InterestConfirmedPage />)
    expect(screen.getByRole('button', { name: /Close Window/i })).toBeInTheDocument()
  })

  it('clicking Close Window calls window.close', () => {
    const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => {})
    render(<InterestConfirmedPage />)
    fireEvent.click(screen.getByRole('button', { name: /Close Window/i }))
    expect(closeSpy).toHaveBeenCalled()
    closeSpy.mockRestore()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// InterestDeclinedPage
// ─────────────────────────────────────────────────────────────────────────────
describe('InterestDeclinedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<InterestDeclinedPage />)
    expect(screen.getByText(/Thank You for Letting Us Know/i)).toBeInTheDocument()
  })

  it('shows the acknowledgement message', () => {
    render(<InterestDeclinedPage />)
    expect(screen.getByText(/We appreciate you taking the time/i)).toBeInTheDocument()
  })

  it('renders a Close Window button', () => {
    render(<InterestDeclinedPage />)
    expect(screen.getByRole('button', { name: /Close Window/i })).toBeInTheDocument()
  })

  it('clicking Close Window calls window.close', () => {
    const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => {})
    render(<InterestDeclinedPage />)
    fireEvent.click(screen.getByRole('button', { name: /Close Window/i }))
    expect(closeSpy).toHaveBeenCalled()
    closeSpy.mockRestore()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// InviteResponsePage
// ─────────────────────────────────────────────────────────────────────────────
describe('InviteResponsePage', () => {
  const mockInvite = {
    _id: 'inv1',
    id: 'inv1',
    candidateName: 'Alice Doe',
    message: 'We think you would be a great fit!',
    status: 'pending',
    jobId: { _id: 'job1', title: 'Frontend Engineer' },
  }
  const mockJobData = {
    _id: 'job1',
    title: 'Frontend Engineer',
    company: 'Acme Corp',
    location: 'Remote',
    salary: '$100k',
    type: 'Full-time',
    experience: '3',
    description: 'A great frontend role.',
    skills: ['React', 'TypeScript'],
    seoSlug: 'frontend-engineer',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockParams = { token: 'invite-token-xyz' }
    mockSearchParams = new URLSearchParams()
    api.getInviteByToken.mockResolvedValue({ invite: mockInvite, job: mockJobData })
    api.respondToInvite.mockResolvedValue({ already: false })
  })

  it('renders without crashing', async () => {
    await act(async () => { render(<InviteResponsePage />) })
    expect(screen.getByText(/EXCLUSIVE JOB INVITATION/i)).toBeInTheDocument()
  })

  it('calls api.getInviteByToken with the token from params', async () => {
    await act(async () => { render(<InviteResponsePage />) })
    expect(api.getInviteByToken).toHaveBeenCalledWith('invite-token-xyz')
  })

  it('shows loading state initially', () => {
    api.getInviteByToken.mockReturnValue(new Promise(() => {}))
    render(<InviteResponsePage />)
    expect(screen.getByText(/Loading your invitation/i)).toBeInTheDocument()
  })

  it('shows error state when API fails', async () => {
    api.getInviteByToken.mockRejectedValue(new Error('expired'))
    await act(async () => { render(<InviteResponsePage />) })
    expect(screen.getByText(/Link Expired/i)).toBeInTheDocument()
    expect(screen.getByText(/This invitation link is invalid or has expired/i)).toBeInTheDocument()
  })

  it('renders candidate name and job title from API data', async () => {
    await act(async () => { render(<InviteResponsePage />) })
    expect(screen.getByText(/Hi Alice Doe/i)).toBeInTheDocument()
    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument()
  })

  it('renders the job location, salary and type', async () => {
    await act(async () => { render(<InviteResponsePage />) })
    expect(screen.getByText(/Remote/)).toBeInTheDocument()
    expect(screen.getByText(/\$100k/)).toBeInTheDocument()
  })

  it('renders recruiter personal message', async () => {
    await act(async () => { render(<InviteResponsePage />) })
    expect(screen.getByText(/We think you would be a great fit!/i)).toBeInTheDocument()
  })

  it('renders skills list', async () => {
    await act(async () => { render(<InviteResponsePage />) })
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
  })

  it('clicking "I\'m Interested" calls api.respondToInvite with interested', async () => {
    await act(async () => { render(<InviteResponsePage />) })
    const btn = screen.getByRole('button', { name: /I'm Interested/i })
    await act(async () => { fireEvent.click(btn) })
    expect(api.respondToInvite).toHaveBeenCalledWith('invite-token-xyz', 'interested')
  })

  it('clicking "Not looking right now" calls api.respondToInvite with declined', async () => {
    await act(async () => { render(<InviteResponsePage />) })
    const btn = screen.getByRole('button', { name: /Not looking right now/i })
    await act(async () => { fireEvent.click(btn) })
    expect(api.respondToInvite).toHaveBeenCalledWith('invite-token-xyz', 'declined')
  })

  it('shows confirmation screen after responding as interested', async () => {
    api.respondToInvite.mockResolvedValue({ already: false })
    await act(async () => { render(<InviteResponsePage />) })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /I'm Interested/i }))
    })
    await waitFor(() => {
      expect(screen.getByText(/You're In!/i)).toBeInTheDocument()
    })
  })

  it('shows already-responded state if invite is already interested', async () => {
    api.getInviteByToken.mockResolvedValue({
      invite: { ...mockInvite, status: 'interested' },
      job: mockJobData,
    })
    await act(async () => { render(<InviteResponsePage />) })
    await waitFor(() => {
      expect(screen.getByText(/Already Registered/i)).toBeInTheDocument()
    })
  })

  it('shows already-declined state if invite is already declined', async () => {
    api.getInviteByToken.mockResolvedValue({
      invite: { ...mockInvite, status: 'declined' },
      job: mockJobData,
    })
    await act(async () => { render(<InviteResponsePage />) })
    await waitFor(() => {
      expect(screen.getByText(/Already Responded/i)).toBeInTheDocument()
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// NpsSurveyPage
// ─────────────────────────────────────────────────────────────────────────────
describe('NpsSurveyPage', () => {
  const mockSurveyInfo = {
    jobTitle: 'Frontend Engineer',
    company: 'Acme Corp',
    outcome: 'hired',
    alreadySubmitted: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockParams = { token: 'nps-token-abc' }
    req.mockResolvedValue(mockSurveyInfo)
  })

  it('renders without crashing', async () => {
    await act(async () => { render(<NpsSurveyPage />) })
    expect(screen.getByText(/How was your experience/i)).toBeInTheDocument()
  })

  it('calls req with the correct survey endpoint', async () => {
    await act(async () => { render(<NpsSurveyPage />) })
    expect(req).toHaveBeenCalledWith('GET', '/nps/survey/nps-token-abc')
  })

  it('shows loading state initially', () => {
    req.mockReturnValue(new Promise(() => {}))
    render(<NpsSurveyPage />)
    expect(screen.getByText(/Loading survey/i)).toBeInTheDocument()
  })

  it('shows error when token is missing', async () => {
    mockParams = {}
    await act(async () => { render(<NpsSurveyPage />) })
    expect(screen.getByText(/Invalid survey link/i)).toBeInTheDocument()
  })

  it('shows error when API fails', async () => {
    req.mockRejectedValue(new Error('not found'))
    await act(async () => { render(<NpsSurveyPage />) })
    expect(screen.getByText(/Survey Not Found/i)).toBeInTheDocument()
    expect(screen.getByText(/Survey not found or link expired/i)).toBeInTheDocument()
  })

  it('renders job title and company info', async () => {
    await act(async () => { render(<NpsSurveyPage />) })
    expect(screen.getByText(/Frontend Engineer · Acme Corp/i)).toBeInTheDocument()
  })

  it('renders 10 score buttons', async () => {
    await act(async () => { render(<NpsSurveyPage />) })
    for (let i = 1; i <= 10; i++) {
      expect(screen.getByRole('button', { name: String(i) })).toBeInTheDocument()
    }
  })

  it('selecting a score shows the score label', async () => {
    await act(async () => { render(<NpsSurveyPage />) })
    fireEvent.click(screen.getByRole('button', { name: '10' }))
    expect(screen.getByText('Excellent!')).toBeInTheDocument()
  })

  it('selecting a low score shows the appropriate label', async () => {
    await act(async () => { render(<NpsSurveyPage />) })
    fireEvent.click(screen.getByRole('button', { name: '1' }))
    expect(screen.getByText('Terrible')).toBeInTheDocument()
  })

  it('Submit Feedback button is disabled when no score selected', async () => {
    await act(async () => { render(<NpsSurveyPage />) })
    const submitBtn = screen.getByRole('button', { name: /Submit Feedback/i })
    expect(submitBtn).toBeDisabled()
  })

  it('Submit Feedback button is enabled after selecting a score', async () => {
    await act(async () => { render(<NpsSurveyPage />) })
    fireEvent.click(screen.getByRole('button', { name: '7' }))
    const submitBtn = screen.getByRole('button', { name: /Submit Feedback/i })
    expect(submitBtn).not.toBeDisabled()
  })

  it('clicking Yes/No recommend buttons highlights the selection', async () => {
    await act(async () => { render(<NpsSurveyPage />) })
    const yesBtn = screen.getByRole('button', { name: /Yes/i })
    fireEvent.click(yesBtn)
    expect(yesBtn).toBeInTheDocument()
  })

  it('submitting the form calls req POST with correct payload', async () => {
    req.mockResolvedValueOnce(mockSurveyInfo) // GET call
    req.mockResolvedValueOnce({}) // POST call
    await act(async () => { render(<NpsSurveyPage />) })

    fireEvent.click(screen.getByRole('button', { name: '8' }))
    const textarea = screen.getByPlaceholderText(/What went well/i)
    fireEvent.change(textarea, { target: { value: 'Great experience!' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Submit Feedback/i }))
    })

    expect(req).toHaveBeenCalledWith(
      'POST',
      '/nps/survey/nps-token-abc',
      { score: 8, wouldRecommend: null, feedbackText: 'Great experience!' },
      false,
    )
  })

  it('shows thank you screen after successful submission', async () => {
    req.mockResolvedValueOnce(mockSurveyInfo)
    req.mockResolvedValueOnce({})
    await act(async () => { render(<NpsSurveyPage />) })

    fireEvent.click(screen.getByRole('button', { name: '9' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Submit Feedback/i }))
    })
    expect(screen.getByText(/Thank You!/i)).toBeInTheDocument()
  })

  it('shows already-submitted screen when survey info has alreadySubmitted=true', async () => {
    req.mockResolvedValue({ ...mockSurveyInfo, alreadySubmitted: true })
    await act(async () => { render(<NpsSurveyPage />) })
    expect(screen.getByText(/Thank You!/i)).toBeInTheDocument()
    expect(screen.getByText(/already submitted/i)).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// OfferApprovalPage
// ─────────────────────────────────────────────────────────────────────────────
describe('OfferApprovalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockParams = { offerId: 'offer123' }
    mockSearchParams = new URLSearchParams({ token: 'approval-token-xyz' })
    api.decideOfferApproval.mockResolvedValue({ success: true })
  })

  it('renders without crashing', async () => {
    await act(async () => { render(<OfferApprovalPage />) })
    expect(screen.getByText(/Offer Letter Approval/i)).toBeInTheDocument()
  })

  it('renders the approval form with Approve and Reject buttons', async () => {
    await act(async () => { render(<OfferApprovalPage />) })
    expect(screen.getByRole('button', { name: /Approve Offer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reject/i })).toBeInTheDocument()
  })

  it('renders the comment textarea', async () => {
    await act(async () => { render(<OfferApprovalPage />) })
    expect(screen.getByPlaceholderText(/Any feedback or reason for rejection/i)).toBeInTheDocument()
  })

  it('clicking Approve calls api.decideOfferApproval with approve action', async () => {
    await act(async () => { render(<OfferApprovalPage />) })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Approve Offer/i }))
    })
    expect(api.decideOfferApproval).toHaveBeenCalledWith('offer123', 'approval-token-xyz', 'approve', '')
  })

  it('clicking Reject calls api.decideOfferApproval with reject action', async () => {
    await act(async () => { render(<OfferApprovalPage />) })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Reject/i }))
    })
    expect(api.decideOfferApproval).toHaveBeenCalledWith('offer123', 'approval-token-xyz', 'reject', '')
  })

  it('shows approved confirmation screen after approving', async () => {
    await act(async () => { render(<OfferApprovalPage />) })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Approve Offer/i }))
    })
    await waitFor(() => {
      expect(screen.getByText('Approved!')).toBeInTheDocument()
      expect(screen.getByText(/Offer approved successfully/i)).toBeInTheDocument()
    })
  })

  it('shows rejected confirmation screen after rejecting', async () => {
    await act(async () => { render(<OfferApprovalPage />) })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Reject/i }))
    })
    await waitFor(() => {
      expect(screen.getByText('Rejected')).toBeInTheDocument()
      expect(screen.getByText(/Offer has been rejected/i)).toBeInTheDocument()
    })
  })

  it('submits comment along with approve decision', async () => {
    await act(async () => { render(<OfferApprovalPage />) })
    fireEvent.change(screen.getByPlaceholderText(/Any feedback or reason for rejection/i), {
      target: { value: 'Salary needs adjustment' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Reject/i }))
    })
    expect(api.decideOfferApproval).toHaveBeenCalledWith(
      'offer123',
      'approval-token-xyz',
      'reject',
      'Salary needs adjustment',
    )
  })

  it('shows error when token is missing', async () => {
    mockSearchParams = new URLSearchParams()
    await act(async () => { render(<OfferApprovalPage />) })
    // Manually try to approve without token
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Approve Offer/i }))
    })
    expect(screen.getByText(/Invalid approval link/i)).toBeInTheDocument()
  })

  it('shows error message when API call fails', async () => {
    api.decideOfferApproval.mockRejectedValue(new Error('Server error'))
    await act(async () => { render(<OfferApprovalPage />) })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Approve Offer/i }))
    })
    await waitFor(() => {
      expect(screen.getByText(/Server error/i)).toBeInTheDocument()
    })
  })

  it('auto-submits when action is provided in URL', async () => {
    mockSearchParams = new URLSearchParams({ token: 'approval-token-xyz', action: 'approve' })
    await act(async () => { render(<OfferApprovalPage />) })
    await waitFor(() => {
      expect(api.decideOfferApproval).toHaveBeenCalledWith('offer123', 'approval-token-xyz', 'approve', '')
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PostPublicPage
// ─────────────────────────────────────────────────────────────────────────────
describe('PostPublicPage', () => {
  const mockPost = {
    _id: 'post1',
    id: 'post1',
    authorName: 'Jane Recruiter',
    authorRole: 'recruiter',
    authorTitle: 'Senior Recruiter',
    postType: 'hiring',
    content: 'We are hiring frontend engineers!',
    createdAt: '2025-06-01T00:00:00Z',
    reactionCount: 5,
    commentCount: 2,
    hashtags: ['#hiring'],
    images: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockParams = { id: 'post1' }
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: mockPost }),
    })
    localStorage.clear()
  })

  it('renders without crashing showing TalentNest branding', async () => {
    await act(async () => { render(<PostPublicPage />) })
    expect(screen.getByText('TalentNest')).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))
    render(<PostPublicPage />)
    expect(screen.getByText(/Loading post/i)).toBeInTheDocument()
  })

  it('renders post author name after data loads', async () => {
    await act(async () => { render(<PostPublicPage />) })
    expect(screen.getByText('Jane Recruiter')).toBeInTheDocument()
  })

  it('renders post content', async () => {
    await act(async () => { render(<PostPublicPage />) })
    expect(screen.getByText(/We are hiring frontend engineers!/i)).toBeInTheDocument()
  })

  it('renders reaction and comment counts', async () => {
    await act(async () => { render(<PostPublicPage />) })
    expect(screen.getByText(/5 reactions/i)).toBeInTheDocument()
    expect(screen.getByText(/2 comments/i)).toBeInTheDocument()
  })

  it('renders hashtags', async () => {
    await act(async () => { render(<PostPublicPage />) })
    expect(screen.getByText('#hiring')).toBeInTheDocument()
  })

  it('renders CTA to create free account', async () => {
    await act(async () => { render(<PostPublicPage />) })
    expect(screen.getByRole('button', { name: /Create free account/i })).toBeInTheDocument()
  })

  it('clicking Create free account navigates to auth register', async () => {
    await act(async () => { render(<PostPublicPage />) })
    fireEvent.click(screen.getByRole('button', { name: /Create free account/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/auth?mode=register&redirect=/app/feed')
  })

  it('clicking Log in in top bar navigates to auth login', async () => {
    await act(async () => { render(<PostPublicPage />) })
    fireEvent.click(screen.getByRole('button', { name: /Log in/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/auth?mode=login')
  })

  it('clicking Sign up free navigates to auth register', async () => {
    await act(async () => { render(<PostPublicPage />) })
    fireEvent.click(screen.getByRole('button', { name: /Sign up free/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/auth?mode=register')
  })

  it('shows error state when post is not found', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: false }),
    })
    await act(async () => { render(<PostPublicPage />) })
    expect(screen.getByText(/Post not found or has been deleted/i)).toBeInTheDocument()
  })

  it('shows error state when fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'))
    await act(async () => { render(<PostPublicPage />) })
    expect(screen.getByText(/Could not load this post/i)).toBeInTheDocument()
  })

  it('shows Go to TalentNest button on error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'))
    await act(async () => { render(<PostPublicPage />) })
    const btn = screen.getByRole('button', { name: /Go to TalentNest/i })
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('renders author role label for recruiter', async () => {
    await act(async () => { render(<PostPublicPage />) })
    expect(screen.getByText('Recruiter')).toBeInTheDocument()
  })

  it('renders post type badge for hiring', async () => {
    await act(async () => { render(<PostPublicPage />) })
    expect(screen.getByText(/Hiring/i)).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SchedulingPage
// ─────────────────────────────────────────────────────────────────────────────
describe('SchedulingPage', () => {
  const futureSlot1 = '2026-07-15T10:00:00Z'
  const futureSlot2 = '2026-07-16T14:00:00Z'

  const mockScheduleData = {
    jobTitle: 'Frontend Engineer',
    candidateName: 'Alice Doe',
    recruiterName: 'Bob Recruiter',
    format: 'video',
    notes: 'Please join 5 minutes early.',
    availableSlots: [futureSlot1, futureSlot2],
    status: 'pending',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockParams = { token: 'schedule-token-abc' }
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: mockScheduleData }),
    })
  })

  it('renders without crashing', async () => {
    await act(async () => { render(<SchedulingPage />) })
    expect(screen.getByText(/Schedule Your Interview/i)).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))
    render(<SchedulingPage />)
    expect(screen.getByText(/Loading your scheduling link/i)).toBeInTheDocument()
  })

  it('shows error when fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    await act(async () => { render(<SchedulingPage />) })
    expect(screen.getByText(/Link Unavailable/i)).toBeInTheDocument()
    expect(screen.getByText(/Network error/i)).toBeInTheDocument()
  })

  it('shows error when API returns success=false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: false, error: 'Link expired' }),
    })
    await act(async () => { render(<SchedulingPage />) })
    expect(screen.getByText(/Link Unavailable/i)).toBeInTheDocument()
    expect(screen.getByText(/Link expired/i)).toBeInTheDocument()
  })

  it('renders candidate name and recruiter name', async () => {
    await act(async () => { render(<SchedulingPage />) })
    expect(screen.getByText(/Alice Doe/)).toBeInTheDocument()
    expect(screen.getByText(/Bob Recruiter/)).toBeInTheDocument()
  })

  it('renders job title in header', async () => {
    await act(async () => { render(<SchedulingPage />) })
    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument()
  })

  it('renders note from recruiter when notes exist', async () => {
    await act(async () => { render(<SchedulingPage />) })
    expect(screen.getByText(/Please join 5 minutes early/i)).toBeInTheDocument()
  })

  it('renders available slot buttons', async () => {
    await act(async () => { render(<SchedulingPage />) })
    const slotButtons = screen.getAllByRole('button').filter(btn =>
      btn.textContent.includes('2026') || btn.textContent.includes('July')
    )
    expect(slotButtons.length).toBeGreaterThan(0)
  })

  it('Confirm This Slot button is disabled when no slot is selected', async () => {
    await act(async () => { render(<SchedulingPage />) })
    const confirmBtn = screen.getByRole('button', { name: /Confirm This Slot/i })
    expect(confirmBtn).toBeDisabled()
  })

  it('selecting a slot enables the Confirm button', async () => {
    await act(async () => { render(<SchedulingPage />) })
    const slotBtns = screen.getAllByRole('button').filter(b =>
      b.textContent && (b.textContent.includes('2026') || b.textContent.includes('July'))
    )
    fireEvent.click(slotBtns[0])
    const confirmBtn = screen.getByRole('button', { name: /Confirm This Slot/i })
    expect(confirmBtn).not.toBeDisabled()
  })

  it('clicking Confirm This Slot sends POST to confirm endpoint', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, data: mockScheduleData }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true }) })

    await act(async () => { render(<SchedulingPage />) })

    const slotBtns = screen.getAllByRole('button').filter(b =>
      b.textContent && (b.textContent.includes('2026') || b.textContent.includes('July'))
    )
    fireEvent.click(slotBtns[0])

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Confirm This Slot/i }))
    })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2)
      const [url, options] = global.fetch.mock.calls[1]
      expect(url).toContain('/api/schedule/schedule-token-abc/confirm')
      expect(options.method).toBe('POST')
    })
  })

  it('shows Interview Confirmed screen after successful slot confirmation', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, data: mockScheduleData }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true }) })

    await act(async () => { render(<SchedulingPage />) })

    const slotBtns = screen.getAllByRole('button').filter(b =>
      b.textContent && (b.textContent.includes('2026') || b.textContent.includes('July'))
    )
    fireEvent.click(slotBtns[0])

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Confirm This Slot/i }))
    })

    await waitFor(() => {
      expect(screen.getByText(/Interview Confirmed!/i)).toBeInTheDocument()
    })
  })

  it('shows "Already Confirmed" when slot status is confirmed', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: { ...mockScheduleData, status: 'confirmed', selectedSlot: futureSlot1 },
      }),
    })
    await act(async () => { render(<SchedulingPage />) })
    expect(screen.getByText(/Already Confirmed/i)).toBeInTheDocument()
  })

  it('renders video format label', async () => {
    await act(async () => { render(<SchedulingPage />) })
    expect(screen.getByText(/Video Call/i)).toBeInTheDocument()
  })

  it('shows error message when slot confirmation fails', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, data: mockScheduleData }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: false, error: 'Slot already taken' }) })

    await act(async () => { render(<SchedulingPage />) })

    const slotBtns = screen.getAllByRole('button').filter(b =>
      b.textContent && (b.textContent.includes('2026') || b.textContent.includes('July'))
    )
    fireEvent.click(slotBtns[0])

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Confirm This Slot/i }))
    })

    await waitFor(() => {
      expect(screen.getByText(/Slot already taken/i)).toBeInTheDocument()
    })
  })
})
