import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── api mock ──────────────────────────────────────────────────────────────────
vi.mock('../../../api/api.js', () => ({
  api: {
    markRead:               vi.fn().mockResolvedValue({}),
    getActiveBroadcasts:    vi.fn().mockResolvedValue([]),
    getOnlineUsers:         vi.fn().mockResolvedValue({ data: [] }),
    getJobRecruiterHistory: vi.fn().mockResolvedValue({ data: { history: [] } }),
    getJobRecruiterTimeline:vi.fn().mockResolvedValue({ data: { timeline: [] } }),
    getApplications:        vi.fn().mockResolvedValue([]),
    getUsers:               vi.fn().mockResolvedValue([]),
    assignRecruiterToJob:   vi.fn().mockResolvedValue({}),
  },
}))

// ── constants/styles mock ─────────────────────────────────────────────────────
vi.mock('../../../constants/styles.js', () => ({
  card:  { background: '#fff', borderRadius: 12, padding: 20 },
  btnG:  { background: '#f1f5f9' },
}))

// ── sub-component mocks ───────────────────────────────────────────────────────
vi.mock('../../../components/ui/OnlineDot.jsx', () => ({
  default: ({ online, size }) => (
    <span data-testid="online-dot" data-online={online} data-size={size} />
  ),
}))

vi.mock('../../../components/charts/MiniSparkline.jsx', () => ({
  default: ({ values, color }) => (
    <div data-testid="mini-sparkline" data-values={JSON.stringify(values)} data-color={color} />
  ),
}))

// ── hooks mocks ───────────────────────────────────────────────────────────────
vi.mock('../../../hooks/usePresence.js', () => ({
  usePresence: () => ({
    isUserOnline: vi.fn().mockReturnValue(false),
  }),
}))

vi.mock('../../../hooks/usePlatformSocket.js', () => ({
  usePlatformSocket: vi.fn(),
}))

// ── imports after mocks ───────────────────────────────────────────────────────
import { api } from '../../../api/api.js'
import CandidateActivityTimeline from '../../../components/shared/CandidateActivityTimeline.jsx'
import TrendCard                 from '../../../components/shared/TrendCard.jsx'
import ErrorReportBoundary       from '../../../components/shared/ErrorReportBoundary.jsx'
import BroadcastBanner           from '../../../components/shared/BroadcastBanner.jsx'
import ResumeCard                from '../../../components/shared/ResumeCard.jsx'
import PresenceBadge             from '../../../components/shared/PresenceBadge.jsx'
import OnlinePanel               from '../../../components/shared/OnlinePanel.jsx'
import JobRecruiterHistory       from '../../../components/shared/JobRecruiterHistory.jsx'

// ═════════════════════════════════════════════════════════════════════════════
// CandidateActivityTimeline
// ═════════════════════════════════════════════════════════════════════════════
describe('CandidateActivityTimeline', () => {
  const baseApp = {
    createdAt:      '2025-01-01T10:00:00Z',
    stageHistory:   [],
    interviewRounds: [],
  }

  it('renders without crashing with a minimal app object', () => {
    const { container } = render(<CandidateActivityTimeline app={baseApp} />)
    expect(container.firstChild).not.toBeNull()
  })

  it('renders the Full Activity History heading', () => {
    render(<CandidateActivityTimeline app={baseApp} />)
    expect(screen.getByText(/Full Activity History/i)).toBeInTheDocument()
  })

  it('renders "Application Received" as first event', () => {
    render(<CandidateActivityTimeline app={baseApp} />)
    expect(screen.getByText(/Application Received/i)).toBeInTheDocument()
  })

  it('renders stage history entries', () => {
    const app = {
      ...baseApp,
      stageHistory: [
        { stageId: 'shortlisted', movedAt: '2025-01-05T10:00:00Z', note: 'Good fit' },
      ],
    }
    render(<CandidateActivityTimeline app={app} />)
    expect(screen.getByText(/Shortlisted/i)).toBeInTheDocument()
  })

  it('renders notes from stage history', () => {
    const app = {
      ...baseApp,
      stageHistory: [
        { stageId: 'shortlisted', movedAt: '2025-01-05T10:00:00Z', note: 'Excellent candidate' },
      ],
    }
    render(<CandidateActivityTimeline app={app} />)
    expect(screen.getByText(/"Excellent candidate"/)).toBeInTheDocument()
  })

  it('renders interview rounds as timeline events', () => {
    const app = {
      ...baseApp,
      interviewRounds: [
        { scheduledAt: '2025-01-10T14:00:00Z', format: 'video', round: 1 },
      ],
    }
    render(<CandidateActivityTimeline app={app} />)
    expect(screen.getByText(/Interview Scheduled/i)).toBeInTheDocument()
  })

  it('shows recruiter count when recruiterHistory is provided', () => {
    const recruiterHistory = [
      { recruiterName: 'Alice Rec', assignedAt: '2025-01-01T00:00:00Z', removedAt: null },
    ]
    render(<CandidateActivityTimeline app={baseApp} recruiterHistory={recruiterHistory} />)
    expect(screen.getByText(/1 recruiter/i)).toBeInTheDocument()
  })

  it('renders feedback section when app has feedback', () => {
    const app = {
      ...baseApp,
      feedback: {
        rating:         4,
        recommendation: true,
        strengths:      'Strong React skills',
        weaknesses:     'Could improve communication',
      },
    }
    render(<CandidateActivityTimeline app={app} />)
    expect(screen.getByText(/Interview Feedback/i)).toBeInTheDocument()
    expect(screen.getByText(/Strong React skills/i)).toBeInTheDocument()
  })

  it('renders recruiter notes section when app has recruiterNotes', () => {
    const app = { ...baseApp, recruiterNotes: 'Very promising candidate' }
    render(<CandidateActivityTimeline app={app} />)
    expect(screen.getByText('Very promising candidate')).toBeInTheDocument()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// TrendCard
// ═════════════════════════════════════════════════════════════════════════════
describe('TrendCard', () => {
  it('renders without crashing', () => {
    const { container } = render(<TrendCard label="Total Users" value={120} />)
    expect(container.firstChild).not.toBeNull()
  })

  it('displays the label', () => {
    render(<TrendCard label="Active Jobs" value={15} />)
    // TrendCard applies textTransform:uppercase via CSS; actual DOM text is the raw label
    expect(screen.getByText('Active Jobs')).toBeInTheDocument()
  })

  it('displays the value', () => {
    render(<TrendCard label="Revenue" value="₹12L" />)
    expect(screen.getByText('₹12L')).toBeInTheDocument()
  })

  it('displays sub text when provided', () => {
    render(<TrendCard label="Jobs" value={10} sub="This quarter" />)
    expect(screen.getByText('This quarter')).toBeInTheDocument()
  })

  it('renders upward trend indicator', () => {
    render(<TrendCard label="Apps" value={50} trend={8} />)
    expect(screen.getByText('8%')).toBeInTheDocument()
    expect(screen.getByText('▲')).toBeInTheDocument()
  })

  it('renders downward trend indicator', () => {
    render(<TrendCard label="Apps" value={50} trend={-3} />)
    expect(screen.getByText('3%')).toBeInTheDocument()
    expect(screen.getByText('▼')).toBeInTheDocument()
  })

  it('renders MiniSparkline when sparkValues are provided', () => {
    render(<TrendCard label="Trend" value={100} sparkValues={[10, 20, 30]} color="#0176D3" />)
    expect(screen.getByTestId('mini-sparkline')).toBeInTheDocument()
  })

  it('calls onClick when card is clicked', () => {
    const onClick = vi.fn()
    render(<TrendCard label="Jobs" value={5} onClick={onClick} />)
    fireEvent.click(screen.getByText('5'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders the icon when provided', () => {
    render(<TrendCard label="Jobs" value={5} icon="💼" />)
    expect(screen.getByText('💼')).toBeInTheDocument()
  })

  it('renders dark variant without crashing', () => {
    const { container } = render(<TrendCard label="Jobs" value={5} variant="dark" />)
    expect(container.firstChild).not.toBeNull()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// ErrorReportBoundary
// ═════════════════════════════════════════════════════════════════════════════
describe('ErrorReportBoundary', () => {
  // Suppress expected console.error from error boundary
  const consoleError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })
  afterEach(() => {
    console.error = consoleError
  })

  it('renders children when no error occurs', () => {
    render(
      <ErrorReportBoundary>
        <div>All good</div>
      </ErrorReportBoundary>
    )
    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  it('renders fallback UI when a child throws', () => {
    function Bomb() {
      throw new Error('Test error')
    }
    render(
      <ErrorReportBoundary>
        <Bomb />
      </ErrorReportBoundary>
    )
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
  })

  it('shows Reload Page button in fallback UI', () => {
    function Bomb() { throw new Error('boom') }
    render(
      <ErrorReportBoundary>
        <Bomb />
      </ErrorReportBoundary>
    )
    expect(screen.getByText(/Reload Page/i)).toBeInTheDocument()
  })

  it('shows Try Again button in fallback UI', () => {
    function Bomb() { throw new Error('boom') }
    render(
      <ErrorReportBoundary>
        <Bomb />
      </ErrorReportBoundary>
    )
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('resets error state when Try Again is clicked', () => {
    let shouldThrow = true
    function MaybeThrow() {
      if (shouldThrow) throw new Error('oops')
      return <div>Recovered</div>
    }
    const { rerender } = render(
      <ErrorReportBoundary>
        <MaybeThrow />
      </ErrorReportBoundary>
    )
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
    shouldThrow = false
    fireEvent.click(screen.getByText('Try Again'))
    // After reset, boundary re-renders children; MaybeThrow won't throw now
    expect(screen.getByText('Recovered')).toBeInTheDocument()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// BroadcastBanner
// ═════════════════════════════════════════════════════════════════════════════
describe('BroadcastBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getActiveBroadcasts.mockResolvedValue([])
  })

  it('renders nothing initially (no broadcasts yet)', () => {
    const { container } = render(<BroadcastBanner userRole="recruiter" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when broadcasts array is empty after mount', async () => {
    api.getActiveBroadcasts.mockResolvedValue([])
    const { container } = render(<BroadcastBanner userRole="recruiter" />)
    // Give enough time for the 1200ms timer + async fetch
    await act(async () => { await new Promise(r => setTimeout(r, 1400)) })
    expect(container.firstChild).toBeNull()
  })

  it('shows broadcast modal after delay when broadcasts exist', async () => {
    api.getActiveBroadcasts.mockResolvedValue([
      {
        _id: 'b1',
        title: 'Welcome!',
        message: 'Platform update available',
        createdAt: new Date().toISOString(),
        metadata: { templateStyle: 'announcement' },
      },
    ])
    render(<BroadcastBanner userRole="recruiter" />)
    await act(async () => { await new Promise(r => setTimeout(r, 1400)) })
    expect(screen.getByText('Welcome!')).toBeInTheDocument()
  }, 10000)

  it('renders candidate modal for candidate role', async () => {
    api.getActiveBroadcasts.mockResolvedValue([
      {
        _id: 'b1',
        title: 'Hello Candidate',
        message: 'Check your application status',
        createdAt: new Date().toISOString(),
        metadata: { templateStyle: 'info' },
      },
    ])
    render(<BroadcastBanner userRole="candidate" />)
    await act(async () => { await new Promise(r => setTimeout(r, 1400)) })
    expect(screen.getByText('Hello Candidate')).toBeInTheDocument()
  }, 10000)

  it('dismisses broadcast when Got it! is clicked', async () => {
    api.getActiveBroadcasts.mockResolvedValue([
      {
        _id: 'b1',
        title: 'News',
        message: 'Some message',
        createdAt: new Date().toISOString(),
        metadata: { templateStyle: 'announcement' },
      },
    ])
    render(<BroadcastBanner userRole="recruiter" />)
    await act(async () => { await new Promise(r => setTimeout(r, 1400)) })
    expect(screen.getByText('News')).toBeInTheDocument()
    fireEvent.click(screen.getByText(/Got it!/i))
    await act(async () => { await new Promise(r => setTimeout(r, 300)) })
    expect(screen.queryByText('News')).not.toBeInTheDocument()
  }, 10000)
})

// ═════════════════════════════════════════════════════════════════════════════
// ResumeCard
// ═════════════════════════════════════════════════════════════════════════════
describe('ResumeCard', () => {
  const baseCandidate = {
    name:     'Alice Smith',
    email:    'alice@example.com',
    phone:    '9876543210',
    title:    'Senior Developer',
    location: 'Hyderabad',
    skills:   ['JavaScript', 'React', 'Node.js'],
    summary:  'Experienced full-stack developer',
  }

  it('renders nothing when candidate is null', () => {
    const { container } = render(<ResumeCard candidate={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders without crashing with a valid candidate', () => {
    const { container } = render(<ResumeCard candidate={baseCandidate} />)
    expect(container.firstChild).not.toBeNull()
  })

  it('renders candidate name in the header', () => {
    render(<ResumeCard candidate={baseCandidate} />)
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  it('renders candidate email', () => {
    render(<ResumeCard candidate={baseCandidate} />)
    // Email appears multiple times (header + sidebar)
    expect(screen.getAllByText('alice@example.com').length).toBeGreaterThan(0)
  })

  it('renders professional summary when provided', () => {
    render(<ResumeCard candidate={baseCandidate} />)
    expect(screen.getByText('Experienced full-stack developer')).toBeInTheDocument()
  })

  it('renders skill pills for the candidate skills', () => {
    render(<ResumeCard candidate={baseCandidate} />)
    // Skills are rendered in the sidebar at minimum
    expect(screen.getAllByText('JavaScript').length).toBeGreaterThan(0)
  })

  it('renders Print / Save PDF button', () => {
    render(<ResumeCard candidate={baseCandidate} />)
    expect(screen.getByText(/Print \/ Save PDF/i)).toBeInTheDocument()
  })

  it('renders empty profile message when candidate has no content', () => {
    render(<ResumeCard candidate={{}} />)
    expect(screen.getByText(/Fill in your profile details/i)).toBeInTheDocument()
  })

  it('renders work experience when workHistory is provided', () => {
    const candidate = {
      ...baseCandidate,
      workHistory: JSON.stringify([
        { id: 'w1', title: 'Lead Dev', company: 'Acme', from: '2022', to: '2024', current: false },
      ]),
    }
    render(<ResumeCard candidate={candidate} />)
    expect(screen.getByText('Lead Dev')).toBeInTheDocument()
    expect(screen.getByText(/Acme/)).toBeInTheDocument()
  })

  it('renders TalentNest HR footer', () => {
    render(<ResumeCard candidate={baseCandidate} />)
    expect(screen.getByText(/TalentNest HR/i)).toBeInTheDocument()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// PresenceBadge
// ═════════════════════════════════════════════════════════════════════════════
describe('PresenceBadge', () => {
  it('renders nothing when userId is not provided', () => {
    const { container } = render(<PresenceBadge />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a status dot when userId is provided', () => {
    const { container } = render(<PresenceBadge userId="user123" />)
    expect(container.firstChild).not.toBeNull()
  })

  it('does not show a label by default', () => {
    render(<PresenceBadge userId="user123" />)
    expect(screen.queryByText(/Online/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Offline/)).not.toBeInTheDocument()
  })

  it('shows "Offline" label when showLabel is true and user is offline', () => {
    render(<PresenceBadge userId="user123" showLabel={true} />)
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('has correct title attribute for offline state', () => {
    const { container } = render(<PresenceBadge userId="user123" />)
    expect(container.firstChild.title).toBe('Offline')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// OnlinePanel
// ═════════════════════════════════════════════════════════════════════════════
describe('OnlinePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getOnlineUsers.mockResolvedValue({ data: [] })
  })

  it('renders nothing when open is false', () => {
    const { container } = render(
      <OnlinePanel user={{ id: 'u1' }} open={false} onClose={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders the panel when open is true', async () => {
    await act(async () => {
      render(<OnlinePanel user={{ id: 'u1' }} open={true} onClose={vi.fn()} />)
    })
    expect(screen.getByText('Online Now')).toBeInTheDocument()
  })

  it('calls onClose when the × button is clicked', async () => {
    const onClose = vi.fn()
    await act(async () => {
      render(<OnlinePanel user={{ id: 'u1' }} open={true} onClose={onClose} />)
    })
    fireEvent.click(screen.getByText('×'))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows "No one else is online" when users array is empty', async () => {
    api.getOnlineUsers.mockResolvedValue({ data: [] })
    await act(async () => {
      render(<OnlinePanel user={{ id: 'u1' }} open={true} onClose={vi.fn()} />)
    })
    await waitFor(() => {
      expect(screen.getByText(/No one else is online/i)).toBeInTheDocument()
    })
  })

  it('shows online users when API returns users', async () => {
    api.getOnlineUsers.mockResolvedValue({
      data: [
        { id: 'u2', name: 'Bob Recruiter', role: 'recruiter', email: 'bob@example.com' },
      ],
    })
    await act(async () => {
      render(<OnlinePanel user={{ id: 'u1' }} open={true} onClose={vi.fn()} />)
    })
    await waitFor(() => {
      expect(screen.getByText('Bob Recruiter')).toBeInTheDocument()
    })
  })

  it('renders search input', async () => {
    await act(async () => {
      render(<OnlinePanel user={{ id: 'u1' }} open={true} onClose={vi.fn()} />)
    })
    expect(screen.getByPlaceholderText(/Search by name/i)).toBeInTheDocument()
  })

  it('filters users by search query', async () => {
    api.getOnlineUsers.mockResolvedValue({
      data: [
        { id: 'u2', name: 'Alice Admin',  role: 'admin',     email: 'alice@example.com' },
        { id: 'u3', name: 'Bob Recruiter', role: 'recruiter', email: 'bob@example.com' },
      ],
    })
    await act(async () => {
      render(<OnlinePanel user={{ id: 'u1' }} open={true} onClose={vi.fn()} />)
    })
    await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText(/Search by name/i), { target: { value: 'alice' } })
    expect(screen.getByText('Alice Admin')).toBeInTheDocument()
    expect(screen.queryByText('Bob Recruiter')).not.toBeInTheDocument()
  })

  it('calls onMessage when the message button is clicked', async () => {
    api.getOnlineUsers.mockResolvedValue({
      data: [{ id: 'u2', name: 'Bob', role: 'recruiter', email: 'bob@example.com' }],
    })
    const onMessage = vi.fn()
    await act(async () => {
      render(<OnlinePanel user={{ id: 'u1' }} open={true} onClose={vi.fn()} onMessage={onMessage} />)
    })
    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument())
    fireEvent.click(screen.getByTitle('Message Bob'))
    expect(onMessage).toHaveBeenCalledWith({ userId: 'u2', name: 'Bob', role: 'recruiter' })
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// JobRecruiterHistory
// ═════════════════════════════════════════════════════════════════════════════
describe('JobRecruiterHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getJobRecruiterHistory.mockResolvedValue({ data: { history: [] } })
    api.getJobRecruiterTimeline.mockResolvedValue({ data: { timeline: [] } })
    api.getApplications.mockResolvedValue([])
  })

  it('renders nothing when jobId is not provided', async () => {
    const { container } = render(<JobRecruiterHistory />)
    expect(container.firstChild).toBeNull()
  })

  it('shows "No recruiter assigned yet" when history is empty', async () => {
    await act(async () => {
      render(<JobRecruiterHistory jobId="job1" jobTitle="Senior Dev" />)
    })
    await waitFor(() => {
      expect(screen.getByText(/No recruiter assigned yet/i)).toBeInTheDocument()
    })
  })

  it('renders recruiter history when API returns entries', async () => {
    api.getJobRecruiterHistory.mockResolvedValue({
      data: {
        history: [
          {
            recruiterName:  'Alice Recruiter',
            recruiterEmail: 'alice@example.com',
            recruiterId:    'r1',
            assignedAt:     '2025-01-01T10:00:00Z',
            removedAt:      null,
          },
        ],
      },
    })
    await act(async () => {
      render(<JobRecruiterHistory jobId="job1" jobTitle="Senior Dev" />)
    })
    await waitFor(() => {
      expect(screen.getByText('Alice Recruiter')).toBeInTheDocument()
    })
  })

  it('shows CURRENT badge for recruiter with no removedAt', async () => {
    api.getJobRecruiterHistory.mockResolvedValue({
      data: {
        history: [
          {
            recruiterName: 'Alice Recruiter',
            recruiterId:   'r1',
            assignedAt:    '2025-01-01T10:00:00Z',
            removedAt:     null,
          },
        ],
      },
    })
    await act(async () => {
      render(<JobRecruiterHistory jobId="job1" jobTitle="Dev" />)
    })
    await waitFor(() => {
      expect(screen.getByText(/CURRENT/)).toBeInTheDocument()
    })
  })

  it('shows summary bar with recruiter count', async () => {
    api.getJobRecruiterHistory.mockResolvedValue({
      data: {
        history: [
          { recruiterName: 'Alice', recruiterId: 'r1', assignedAt: '2025-01-01T00:00:00Z', removedAt: null },
        ],
      },
    })
    await act(async () => {
      render(<JobRecruiterHistory jobId="job1" jobTitle="Dev" />)
    })
    await waitFor(() => {
      expect(screen.getByText(/1 recruiter/i)).toBeInTheDocument()
    })
  })

  it('shows Change Recruiter button for admin', async () => {
    api.getJobRecruiterHistory.mockResolvedValue({
      data: {
        history: [
          { recruiterName: 'Alice', recruiterId: 'r1', assignedAt: '2025-01-01T00:00:00Z', removedAt: null },
        ],
      },
    })
    await act(async () => {
      render(<JobRecruiterHistory jobId="job1" jobTitle="Dev" isAdmin={true} />)
    })
    await waitFor(() => {
      expect(screen.getByText(/Change Recruiter/i)).toBeInTheDocument()
    })
  })

  it('does not show Change Recruiter button when isAdmin is false', async () => {
    api.getJobRecruiterHistory.mockResolvedValue({
      data: {
        history: [
          { recruiterName: 'Alice', recruiterId: 'r1', assignedAt: '2025-01-01T00:00:00Z', removedAt: null },
        ],
      },
    })
    await act(async () => {
      render(<JobRecruiterHistory jobId="job1" jobTitle="Dev" isAdmin={false} />)
    })
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())
    expect(screen.queryByText(/Change Recruiter/i)).not.toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    // Don't resolve API yet
    api.getJobRecruiterHistory.mockReturnValue(new Promise(() => {}))
    api.getJobRecruiterTimeline.mockReturnValue(new Promise(() => {}))
    render(<JobRecruiterHistory jobId="job1" jobTitle="Dev" />)
    expect(screen.getByText(/Loading recruiter history/i)).toBeInTheDocument()
  })
})
