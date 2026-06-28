import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('../../api/api.js', () => ({
  api: {
    getRecruiterStats: vi.fn(),
    parkApplication: vi.fn(),
  },
}))

vi.mock('../../components/ui/PageHeader.jsx', () => ({
  default: ({ title, subtitle }) => (
    <div data-testid="page-header">
      <div data-testid="page-header-title">{title}</div>
      <div data-testid="page-header-subtitle">{subtitle}</div>
    </div>
  ),
}))
vi.mock('../../components/ui/Badge.jsx', () => ({
  default: ({ label }) => <span data-testid="badge">{label}</span>,
}))
vi.mock('../../components/ui/Spinner.jsx', () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}))
vi.mock('../../components/charts/KpiCard.jsx', () => ({
  default: ({ label, value }) => (
    <div data-testid="kpi-card">
      <span data-testid="kpi-label">{label}</span>
      <span data-testid="kpi-value">{value}</span>
    </div>
  ),
}))
vi.mock('../../components/charts/FunnelChart.jsx', () => ({
  default: ({ data }) => <div data-testid="funnel-chart">{data?.length} stages</div>,
}))
vi.mock('../../components/charts/RingProgress.jsx', () => ({
  default: ({ pct }) => <div data-testid="ring-progress">{pct}%</div>,
}))
vi.mock('../../components/charts/HorizBar.jsx', () => ({
  default: ({ value }) => <div data-testid="horiz-bar">{value}</div>,
}))
vi.mock('../../components/charts/AreaChart.jsx', () => ({
  default: () => <div data-testid="area-chart" />,
}))
vi.mock('../../components/charts/VertBarChart.jsx', () => ({
  default: ({ title }) => <div data-testid="vert-bar-chart">{title}</div>,
}))
vi.mock('../../components/misc/ActivityDot.jsx', () => ({
  default: ({ stage }) => <span data-testid="activity-dot">{stage}</span>,
}))
vi.mock('../../components/misc/TimeAgo.jsx', () => ({
  default: ({ date }) => <span data-testid="time-ago">{date}</span>,
}))
vi.mock('../../components/shared/UserDetailDrawer.jsx', () => ({
  default: ({ user, onClose }) => (
    <div data-testid="user-detail-drawer">
      <span data-testid="drawer-user-name">{user?.name}</span>
      <button data-testid="drawer-close" onClick={onClose}>Close</button>
    </div>
  ),
}))
vi.mock('../../components/shared/ErrorReportBoundary.jsx', () => ({
  default: ({ children }) => <div data-testid="error-boundary">{children}</div>,
}))
vi.mock('../../constants/stages.js', () => ({
  STAGES: [
    { id: 'applied',             label: 'Applied',             icon: '📥', color: '#0176D3' },
    { id: 'screening',           label: 'Screening',           icon: '🔍', color: '#7C3AED' },
    { id: 'shortlisted',         label: 'Shortlisted',         icon: '⭐', color: '#F59E0B' },
    { id: 'interview_scheduled', label: 'Interview Scheduled', icon: '📅', color: '#F59E0B' },
    { id: 'interview_completed', label: 'Interview Completed', icon: '✅', color: '#10b981' },
    { id: 'offer_extended',      label: 'Offer Extended',      icon: '📨', color: '#10b981' },
    { id: 'selected',            label: 'Selected',            icon: '🎉', color: '#2E844A' },
    { id: 'rejected',            label: 'Rejected',            icon: '❌', color: '#BA0517' },
  ],
  SM: {
    applied:             { color: '#0176D3', label: 'Applied',             icon: '📥' },
    screening:           { color: '#7C3AED', label: 'Screening',           icon: '🔍' },
    shortlisted:         { color: '#F59E0B', label: 'Shortlisted',         icon: '⭐' },
    interview_scheduled: { color: '#F59E0B', label: 'Interview Scheduled', icon: '📅' },
    interview_completed: { color: '#10b981', label: 'Interview Completed', icon: '✅' },
    offer_extended:      { color: '#10b981', label: 'Offer Extended',      icon: '📨' },
    selected:            { color: '#2E844A', label: 'Selected',            icon: '🎉' },
    rejected:            { color: '#BA0517', label: 'Rejected',            icon: '❌' },
  },
}))
vi.mock('../../constants/styles.js', () => ({
  btnP: {},
  btnG: {},
  btnD: {},
  card: {},
}))

import { api } from '../../api/api.js'
import RecruiterDashboard from '../../pages/recruiter/RecruiterDashboard.jsx'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockUser = { id: 'r1', name: 'Jane Recruiter' }

function makeStats(overrides = {}) {
  return {
    totalApplicants: 42,
    inInterview: 8,
    hired: 5,
    offerOut: 3,
    rejected: 10,
    conversionRate: 12,
    jobs: [
      { id: 'j1', _id: 'j1', title: 'Frontend Engineer', companyName: 'Acme', status: 'active', urgency: 'High', applicantsCount: 20 },
      { id: 'j2', _id: 'j2', title: 'Backend Developer',  companyName: 'Acme', status: 'active', urgency: 'Medium', applicantsCount: 10 },
    ],
    pipeline: {
      Applied: 15,
      Screening: 8,
      Shortlisted: 6,
      'Interview Round 1': 5,
    },
    recent: [
      {
        id: 'app1',
        _id: 'app1',
        stage: 'applied',
        candidateId: { id: 'c1', _id: 'c1', name: 'Alice Doe', email: 'alice@example.com' },
        jobId: { id: 'j1', title: 'Frontend Engineer', companyName: 'Acme' },
        addedBy: 'admin-user',
        updatedAt: '2025-06-01T10:00:00Z',
        createdAt: '2025-06-01T09:00:00Z',
        stageHistory: [{ stage: 'applied', movedAt: '2025-06-01T09:00:00Z' }],
      },
      {
        id: 'app2',
        _id: 'app2',
        stage: 'shortlisted',
        candidateId: { id: 'c2', _id: 'c2', name: 'Bob Smith', email: 'bob@example.com' },
        jobId: { id: 'j2', title: 'Backend Developer', companyName: 'Acme' },
        addedBy: 'r1',
        updatedAt: '2025-06-02T10:00:00Z',
        createdAt: '2025-06-02T09:00:00Z',
        stageHistory: [],
      },
    ],
    trendData: [
      { date: '2025-05-20', value: 2 },
      { date: '2025-05-21', value: 4 },
      { date: '2025-05-22', value: 1 },
    ],
    dailyQueue: { todayInterviews: 0, newApplications: 0, offersOut: 0, expiringJobs: 0 },
    interestedInvites: 0,
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RecruiterDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    api.getRecruiterStats.mockResolvedValue(makeStats())
    api.parkApplication.mockResolvedValue({ success: true })
  })

  // ── Loading state ────────────────────────────────────────────────────────

  it('shows spinner while stats are loading', () => {
    api.getRecruiterStats.mockReturnValue(new Promise(() => {}))
    render(<RecruiterDashboard user={mockUser} />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('calls api.getRecruiterStats on mount', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    expect(api.getRecruiterStats).toHaveBeenCalledTimes(1)
  })

  // ── Error state ──────────────────────────────────────────────────────────

  it('shows error message when api.getRecruiterStats rejects', async () => {
    api.getRecruiterStats.mockRejectedValue(new Error('Failed to connect to server'))
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    expect(screen.getByText(/Dashboard Sync Failed/i)).toBeInTheDocument()
    expect(screen.getByText(/Failed to connect to server/i)).toBeInTheDocument()
  })

  it('shows Retry Connection button on error', async () => {
    api.getRecruiterStats.mockRejectedValue(new Error('Network error'))
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    expect(screen.getByText(/Retry Connection/i)).toBeInTheDocument()
  })

  // ── Main content renders ─────────────────────────────────────────────────

  it('renders PageHeader with recruiter first name after data loads', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    const header = screen.getByTestId('page-header-title')
    expect(header.textContent).toMatch(/Jane/)
  })

  it('renders the 5 KPI cards with correct labels', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    const labels = screen.getAllByTestId('kpi-label').map(el => el.textContent)
    expect(labels).toContain('Active Jobs')
    expect(labels).toContain('Total Applicants')
    expect(labels).toContain('In Interview')
    expect(labels).toContain('Offer Extended')
    expect(labels).toContain('Hired')
  })

  it('displays correct KPI values from stats', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    const values = screen.getAllByTestId('kpi-value').map(el => el.textContent)
    // totalApplicants = 42, hired = 5, inInterview = 8, offerOut = 3
    expect(values).toContain('42')
    expect(values).toContain('5')
    expect(values).toContain('8')
    expect(values).toContain('3')
  })

  it('renders the hiring funnel chart', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    expect(screen.getByTestId('funnel-chart')).toBeInTheDocument()
  })

  it('renders recent activity entries with candidate names', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    expect(screen.getAllByText('Alice Doe')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Bob Smith')[0]).toBeInTheDocument()
  })

  // ── KPI card navigation ──────────────────────────────────────────────────

  it('clicking "Active Jobs" KPI card navigates to /app/jobs', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    // The Active Jobs KPI is wrapped in a div with onClick
    const labels = screen.getAllByTestId('kpi-label')
    const activeJobsCard = labels.find(l => l.textContent === 'Active Jobs')
    fireEvent.click(activeJobsCard.closest('[style]'))
    expect(mockNavigate).toHaveBeenCalledWith('/app/jobs')
  })

  it('clicking "Total Applicants" KPI card navigates to /app/pipeline', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    const labels = screen.getAllByTestId('kpi-label')
    const card = labels.find(l => l.textContent === 'Total Applicants')
    fireEvent.click(card.closest('[style]'))
    expect(mockNavigate).toHaveBeenCalledWith('/app/pipeline')
  })

  // ── Pipeline navigation buttons ──────────────────────────────────────────

  it('"View Pipeline" button in Recent Activity navigates to /app/pipeline', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    const btn = screen.getByText(/View Pipeline →/i)
    fireEvent.click(btn)
    expect(mockNavigate).toHaveBeenCalledWith('/app/pipeline')
  })

  it('"Open Applicants" button navigates to /app/applicants', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    const btn = screen.getByText(/Open Applicants/i)
    fireEvent.click(btn)
    expect(mockNavigate).toHaveBeenCalledWith('/app/applicants')
  })

  it('"All Interviews" button navigates to /app/interviews', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    const btn = screen.getByText(/All Interviews →/i)
    fireEvent.click(btn)
    expect(mockNavigate).toHaveBeenCalledWith('/app/interviews')
  })

  // ── Park candidate ───────────────────────────────────────────────────────

  it('clicking park button calls api.parkApplication with correct app id', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    // Park buttons are titled "Park Candidate"
    const parkBtns = screen.getAllByTitle(/Park Candidate/i)
    expect(parkBtns.length).toBeGreaterThan(0)
    await act(async () => { fireEvent.click(parkBtns[0]) })
    expect(api.parkApplication).toHaveBeenCalledWith('app1')
  })

  // ── Open candidate drawer ────────────────────────────────────────────────

  it('clicking a recent activity row opens the UserDetailDrawer', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    expect(screen.queryByTestId('user-detail-drawer')).not.toBeInTheDocument()
    // Click edit button next to first activity entry
    const editBtns = screen.getAllByText('✏️')
    await act(async () => { fireEvent.click(editBtns[0]) })
    expect(screen.getByTestId('user-detail-drawer')).toBeInTheDocument()
    expect(screen.getByTestId('drawer-user-name').textContent).toBe('Alice Doe')
  })

  it('closing the UserDetailDrawer removes it from the DOM', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    const editBtns = screen.getAllByText('✏️')
    await act(async () => { fireEvent.click(editBtns[0]) })
    expect(screen.getByTestId('user-detail-drawer')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('drawer-close'))
    expect(screen.queryByTestId('user-detail-drawer')).not.toBeInTheDocument()
  })

  // ── Daily action queue ───────────────────────────────────────────────────

  it('does NOT render Daily Action Queue when all queue values are 0', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    expect(screen.queryByText(/Today's Action Queue/i)).not.toBeInTheDocument()
  })

  it('renders Daily Action Queue when todayInterviews > 0', async () => {
    api.getRecruiterStats.mockResolvedValue(makeStats({
      dailyQueue: { todayInterviews: 3, newApplications: 0, offersOut: 0, expiringJobs: 0 },
    }))
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    expect(screen.getByText(/Today's Action Queue/i)).toBeInTheDocument()
    expect(screen.getAllByText(/^3$/)[0]).toBeInTheDocument()
    expect(screen.getByText(/Interviews today/i)).toBeInTheDocument()
  })

  it('clicking the interview queue button navigates to pipeline with stage filter', async () => {
    api.getRecruiterStats.mockResolvedValue(makeStats({
      dailyQueue: { todayInterviews: 2, newApplications: 0, offersOut: 0, expiringJobs: 0 },
    }))
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    const ivBtn = screen.getByText(/Interviews today/i).closest('button')
    fireEvent.click(ivBtn)
    expect(mockNavigate).toHaveBeenCalledWith('/app/pipeline?stage=interview_scheduled')
  })

  it('renders new applications queue item and navigates on click', async () => {
    api.getRecruiterStats.mockResolvedValue(makeStats({
      dailyQueue: { todayInterviews: 0, newApplications: 5, offersOut: 0, expiringJobs: 0 },
    }))
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    const appsBtn = screen.getByText(/New application/i).closest('button')
    fireEvent.click(appsBtn)
    expect(mockNavigate).toHaveBeenCalledWith('/app/pipeline?stage=applied')
  })

  it('renders expiring jobs queue item and navigates to /app/jobs', async () => {
    api.getRecruiterStats.mockResolvedValue(makeStats({
      dailyQueue: { todayInterviews: 0, newApplications: 0, offersOut: 0, expiringJobs: 2 },
    }))
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    const jobsBtn = screen.getByText(/closing in 3 days/i).closest('button')
    fireEvent.click(jobsBtn)
    expect(mockNavigate).toHaveBeenCalledWith('/app/jobs')
  })

  // ── Empty / zero states ──────────────────────────────────────────────────

  it('shows "No recent activity yet" when recent array is empty', async () => {
    api.getRecruiterStats.mockResolvedValue(makeStats({ recent: [] }))
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    expect(screen.getByText(/No recent activity yet/i)).toBeInTheDocument()
  })

  it('shows "No interviews scheduled" when no upcoming interviews exist', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    expect(screen.getByText(/No interviews scheduled for today/i)).toBeInTheDocument()
  })

  it('shows "0 this week" badge when no upcoming interviews', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    const badges = screen.getAllByTestId('badge')
    const weekBadge = badges.find(b => b.textContent.includes('this week'))
    expect(weekBadge).toBeDefined()
    expect(weekBadge.textContent).toMatch(/0 this week/)
  })

  // ── Trend chart / application velocity ──────────────────────────────────

  it('renders AreaChart when trendData contains non-zero values', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
  })

  it('shows no-applications message when trendData is all zeros', async () => {
    api.getRecruiterStats.mockResolvedValue(makeStats({
      trendData: [{ date: '2025-06-01', value: 0 }],
    }))
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    expect(screen.getByText(/No applications in last 14 days/i)).toBeInTheDocument()
  })

  // ── Job performance table ────────────────────────────────────────────────

  it('renders job performance table with job titles', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    expect(screen.getAllByText('Frontend Engineer')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Backend Developer')[0]).toBeInTheDocument()
  })

  it('job performance row click navigates to /app/jobs', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    const jobTitle = screen.getAllByText('Frontend Engineer').find(el => el.closest('tr'))
    fireEvent.click(jobTitle.closest('tr'))
    expect(mockNavigate).toHaveBeenCalledWith('/app/jobs')
  })

  // ── Whats new section ────────────────────────────────────────────────────

  it('toggles WHAT\'S NEW section on click', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    const trigger = screen.getByText(/WHAT'S NEW/i)
    expect(screen.queryByText(/Drag-and-drop Kanban board/i)).not.toBeInTheDocument()
    fireEvent.click(trigger.closest('[style]'))
    expect(screen.getByText(/Drag-and-drop Kanban board/i)).toBeInTheDocument()
  })

  it('clicking a feature in WHAT\'S NEW navigates to the correct route', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    fireEvent.click(screen.getByText(/WHAT'S NEW/i).closest('[style]'))
    // Click the "Talent Pool" feature item
    const talentPoolLink = screen.getByText(/Park promising candidates/i).closest('[style]')
    fireEvent.click(talentPoolLink)
    expect(mockNavigate).toHaveBeenCalledWith('/app/talent-pool')
  })

  // ── Admin-assigned candidates section ───────────────────────────────────

  it('shows admin-assigned section when recent activity contains entries added by others', async () => {
    // app1 has addedBy: 'admin-user' (not equal to user.id 'r1')
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    expect(screen.getByText(/CANDIDATES ASSIGNED TO YOUR JOBS/i)).toBeInTheDocument()
  })

  it('does not show admin-assigned section when all entries were added by self', async () => {
    api.getRecruiterStats.mockResolvedValue(makeStats({
      recent: [
        {
          id: 'app3', _id: 'app3', stage: 'applied',
          candidateId: { id: 'c3', name: 'Carol', email: 'carol@example.com' },
          jobId: { id: 'j1', title: 'Frontend Engineer', companyName: 'Acme' },
          addedBy: 'r1', // same as user.id
          updatedAt: '2025-06-01T10:00:00Z',
          stageHistory: [],
        },
      ],
    }))
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    expect(screen.queryByText(/CANDIDATES ASSIGNED TO YOUR JOBS/i)).not.toBeInTheDocument()
  })

  // ── Drill-down overlay ───────────────────────────────────────────────────

  it('renders drill-down overlay when drillDown state is set via bottleneck click', async () => {
    // Create pipeline bottleneck: >5 candidates at screening
    api.getRecruiterStats.mockResolvedValue(makeStats({
      pipeline: { Screening: 8 },
      recent: [
        {
          id: 'app10', _id: 'app10', stage: 'screening',
          candidateId: { id: 'c10', name: 'Eve',   email: 'eve@example.com' },
          jobId: { id: 'j1', title: 'Frontend Engineer', companyName: 'Acme' },
          addedBy: 'r1', updatedAt: '2025-06-01T10:00:00Z', stageHistory: [],
        },
      ],
    }))
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    // The bottleneck alert should appear
    expect(screen.getByText(/PIPELINE BOTTLENECK ALERT/i)).toBeInTheDocument()
    // Click the bottleneck stage button to open drill-down
    const bottleneckBtn = screen.getAllByText('Screening')[0].closest('button')
    fireEvent.click(bottleneckBtn)
    // Drill-down overlay should open
    await waitFor(() => {
      expect(screen.getByText(/View All in Pipeline →/i)).toBeInTheDocument()
    })
  })

  it('closes drill-down overlay when ✕ button is clicked', async () => {
    api.getRecruiterStats.mockResolvedValue(makeStats({
      pipeline: { Screening: 8 },
      recent: [
        {
          id: 'app11', _id: 'app11', stage: 'screening',
          candidateId: { id: 'c11', name: 'Frank', email: 'frank@example.com' },
          jobId: { id: 'j1', title: 'Frontend Engineer', companyName: 'Acme' },
          addedBy: 'r1', updatedAt: '2025-06-01T10:00:00Z', stageHistory: [],
        },
      ],
    }))
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    const bottleneckBtn = screen.getAllByText('Screening')[0].closest('button')
    fireEvent.click(bottleneckBtn)
    await waitFor(() => { expect(screen.getByText(/View All in Pipeline →/i)).toBeInTheDocument() })
    fireEvent.click(screen.getByText('✕'))
    await waitFor(() => {
      expect(screen.queryByText(/View All in Pipeline →/i)).not.toBeInTheDocument()
    })
  })

  // ── Interested invites section ───────────────────────────────────────────

  it('shows interested candidates section when interestedInvites > 0', async () => {
    api.getRecruiterStats.mockResolvedValue(makeStats({
      interestedInvites: 2,
      recent: [
        {
          id: 'inv1', _id: 'inv1', stage: 'applied',
          inviteStatus: 'interested',
          candidateId: { id: 'c20', name: 'Gina', email: 'gina@example.com' },
          jobId: { id: 'j1', title: 'Frontend Engineer' },
          addedBy: 'r1', updatedAt: '2025-06-01T10:00:00Z', stageHistory: [],
        },
      ],
    }))
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    expect(screen.queryByText(/INTERESTED CANDIDATES/i) || screen.queryByText(/INTERESTED/i)).toBeTruthy()
    expect(screen.getAllByText('Gina')[0]).toBeInTheDocument()
  })

  it('does not show interested section when interestedInvites is 0', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    expect(screen.queryByText(/INTERESTED CANDIDATES/i)).not.toBeInTheDocument()
  })

  // ── Hiring funnel stats ──────────────────────────────────────────────────

  it('renders rejected, hired, and active counts in the funnel section', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    // rejected=10, hired=5, active = 42-10-5 = 27
    expect(screen.getAllByText('10')[0]).toBeInTheDocument()
    expect(screen.getAllByText('5')[0]).toBeInTheDocument()
    expect(screen.getAllByText('27')[0]).toBeInTheDocument()
  })

  it('clicking the funnel section navigates to /app/pipeline', async () => {
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    const funnelSection = screen.getByText(/HIRING FUNNEL/i).closest('[style]')
    fireEvent.click(funnelSection)
    expect(mockNavigate).toHaveBeenCalledWith('/app/pipeline')
  })

  // ── Handles data wrapped in .data property ───────────────────────────────

  it('handles stats response wrapped in a .data envelope', async () => {
    api.getRecruiterStats.mockResolvedValue({ data: makeStats({ totalApplicants: 99 }) })
    await act(async () => { render(<RecruiterDashboard user={mockUser} />) })
    const values = screen.getAllByTestId('kpi-value').map(el => el.textContent)
    expect(values).toContain('99')
  })
})
