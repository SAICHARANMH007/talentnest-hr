import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Router mocks ──────────────────────────────────────────────────────────────
const mockNavigate = vi.fn()
const mockSearchParams = new URLSearchParams()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams],
}))

// ── API mock ──────────────────────────────────────────────────────────────────
vi.mock('../../api/api.js', () => ({
  api: {
    getRecruiterStats: vi.fn(),
    getJobs: vi.fn(),
    getUser: vi.fn(),
    getCustomizations: vi.fn(),
    getApplications: vi.fn(),
    getAssessmentForJob: vi.fn(),
    getAssessmentSubmissions: vi.fn(),
    getJobRecruiterHistory: vi.fn(),
    updateStage: vi.fn(),
    updateAppNotes: vi.fn(),
    updateAppTags: vi.fn(),
    getUserSkillBadges: vi.fn(),
    sendEmail: vi.fn(),
    parkApplication: vi.fn(),
    createSchedulingLink: vi.fn(),
    addFeedback: vi.fn(),
    saveKitScores: vi.fn(),
    getInterviewKit: vi.fn(),
  },
}))

// ── UI component stubs ────────────────────────────────────────────────────────
vi.mock('../../components/ui/Toast.jsx', () => ({
  default: ({ msg }) => msg ? <div data-testid="toast">{msg}</div> : null,
}))
vi.mock('../../components/ui/Badge.jsx', () => ({
  default: ({ label }) => <span data-testid="badge">{label}</span>,
}))
vi.mock('../../components/ui/Spinner.jsx', () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}))
vi.mock('../../components/ui/PageHeader.jsx', () => ({
  default: ({ title, subtitle }) => (
    <div data-testid="page-header">
      <span>{title}</span>
      {subtitle && <span>{subtitle}</span>}
    </div>
  ),
}))
vi.mock('../../components/modals/HiredDetailsModal.jsx', () => ({
  default: ({ candidateName, onClose }) => (
    <div data-testid="hired-modal">
      <span>{candidateName}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))
vi.mock('../../components/modals/OfferLetterModal.jsx', () => ({
  default: ({ onClose }) => (
    <div data-testid="offer-modal">
      <button onClick={onClose}>Close Offer</button>
    </div>
  ),
}))
vi.mock('../../components/pipeline/StageTracker.jsx', () => ({
  default: ({ stage }) => <div data-testid="stage-tracker">{stage}</div>,
}))
vi.mock('../../components/shared/UserDetailDrawer.jsx', () => ({
  default: ({ onClose }) => (
    <div data-testid="user-detail-drawer">
      <button onClick={onClose}>Close Drawer</button>
    </div>
  ),
}))
vi.mock('../../components/shared/CandidateActivityTimeline.jsx', () => ({
  default: () => <div data-testid="activity-timeline" />,
}))
vi.mock('../../components/recruiter/TalentMirror.jsx', () => ({
  default: ({ onClose }) => (
    <div data-testid="talent-mirror">
      <button onClick={onClose}>Close Mirror</button>
    </div>
  ),
}))
vi.mock('../../constants/styles.js', () => ({
  btnP: {},
  btnG: {},
  btnD: {},
  card: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  inp: {},
}))

import { api } from '../../api/api.js'
import RecruiterPipeline from '../../pages/recruiter/RecruiterPipeline.jsx'

// ── Fixtures ──────────────────────────────────────────────────────────────────
const mockUser = { id: 'rec1', name: 'Jane Recruiter' }

function makeJob(overrides = {}) {
  return {
    id: 'j1',
    _id: 'j1',
    title: 'Senior Engineer',
    company: 'TalentNest',
    companyName: 'TalentNest',
    location: 'Remote',
    status: 'active',
    applicantsCount: 3,
    skills: ['React', 'Node.js'],
    ...overrides,
  }
}

function makeApp(overrides = {}) {
  return {
    id: 'app1',
    _id: 'app1',
    stage: 'applied',
    createdAt: '2025-01-15T10:00:00Z',
    talentMatchScore: 72,
    tags: [],
    candidate: {
      id: 'c1',
      _id: 'c1',
      name: 'Bob Candidate',
      email: 'bob@example.com',
      title: 'Software Engineer',
      experience: 4,
      skills: ['React', 'TypeScript'],
    },
    ...overrides,
  }
}

// ── Default API setup ─────────────────────────────────────────────────────────
function setupDefaultMocks() {
  api.getRecruiterStats.mockResolvedValue({ data: { totalApplicants: 10 } })
  api.getJobs.mockResolvedValue({ data: [] })
  api.getUser.mockResolvedValue({ data: { name: 'Jane Recruiter' } })
  api.getCustomizations.mockResolvedValue({ data: { tags: [] } })
  api.getApplications.mockResolvedValue({ data: [], pagination: { page: 1, limit: 50, total: 0, pages: 1 } })
  api.getAssessmentForJob.mockResolvedValue(null)
  api.getJobRecruiterHistory.mockResolvedValue({ data: { history: [] } })
  api.getUserSkillBadges.mockResolvedValue([])
}

// ─────────────────────────────────────────────────────────────────────────────

describe('RecruiterPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    setupDefaultMocks()
  })

  // ── Mount and initial API calls ───────────────────────────────────────────

  it('renders the page header with correct title', async () => {
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    expect(screen.getByTestId('page-header')).toHaveTextContent('Applicant Pipeline')
  })

  it('calls getRecruiterStats, getJobs, getUser, and getCustomizations on mount', async () => {
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    expect(api.getRecruiterStats).toHaveBeenCalledTimes(1)
    expect(api.getJobs).toHaveBeenCalledWith({ minimal: true })
    expect(api.getUser).toHaveBeenCalledWith('rec1')
    expect(api.getCustomizations).toHaveBeenCalledTimes(1)
  })

  it('shows spinner while jobs are loading', () => {
    api.getJobs.mockReturnValue(new Promise(() => {}))
    api.getRecruiterStats.mockReturnValue(new Promise(() => {}))
    render(<RecruiterPipeline user={mockUser} />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  // ── No-job-selected state (job grid) ──────────────────────────────────────

  it('shows "No jobs assigned yet" when jobs list is empty', async () => {
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    expect(screen.getByText(/No jobs assigned yet/i)).toBeInTheDocument()
  })

  it('renders job cards when jobs are returned', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob(), makeJob({ id: 'j2', _id: 'j2', title: 'Product Manager' })] })
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    expect(screen.getAllByText('Senior Engineer')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Product Manager')[0]).toBeInTheDocument()
  })

  it('shows pipeline snapshot stats when jobs exist', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob({ applicantsCount: 5 })] })
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    expect(screen.getByText(/YOUR PIPELINE SNAPSHOT/i)).toBeInTheDocument()
  })

  it('filters job cards by search input', async () => {
    api.getJobs.mockResolvedValue({
      data: [
        makeJob({ id: 'j1', title: 'Senior Engineer' }),
        makeJob({ id: 'j2', title: 'Product Manager' }),
      ],
    })
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    const searchInput = screen.getByPlaceholderText(/Search/i)
    await act(async () => { fireEvent.change(searchInput, { target: { value: 'Product' } }) })
    expect(screen.queryByText('Senior Engineer')).not.toBeInTheDocument()
    expect(screen.getAllByText('Product Manager')[0]).toBeInTheDocument()
  })

  // ── Job selection and application loading ─────────────────────────────────

  it('loads applications when a job card is clicked', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getApplications.mockResolvedValue({
      data: [makeApp()],
      pagination: { page: 1, limit: 50, total: 1, pages: 1 },
    })
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getAllByText('Senior Engineer')[0]) })
    await waitFor(() => {
      expect(api.getApplications).toHaveBeenCalledWith(
        expect.objectContaining({ jobId: 'j1' })
      )
    })
  })

  it('calls getJobRecruiterHistory when a job is selected', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getAllByText('Senior Engineer')[0]) })
    await waitFor(() => {
      expect(api.getJobRecruiterHistory).toHaveBeenCalledWith('j1')
    })
  })

  it('shows candidate card after selecting a job with applicants', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getApplications.mockResolvedValue({
      data: [makeApp()],
      pagination: { page: 1, limit: 50, total: 1, pages: 1 },
    })
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getAllByText('Senior Engineer')[0]) })
    await waitFor(() => {
      expect(screen.getAllByText('Bob Candidate')[0]).toBeInTheDocument()
    })
  })

  it('shows empty state message when a job has no applicants', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getApplications.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, pages: 1 },
    })
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getAllByText('Senior Engineer')[0]) })
    await waitFor(() => {
      expect(screen.getAllByText(/No applicants/i)[0]).toBeInTheDocument()
    })
  })

  // ── Stage filter ──────────────────────────────────────────────────────────

  it('renders All stage filter button and stage-specific buttons for populated stages', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getApplications.mockResolvedValue({
      data: [makeApp({ stage: 'shortlisted' })],
      pagination: { page: 1, limit: 50, total: 1, pages: 1 },
    })
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getAllByText('Senior Engineer')[0]) })
    await waitFor(() => {
      expect(screen.getByText(/All \(1\)/i)).toBeInTheDocument()
    })
  })

  it('passes stageFilter to getApplications when stage filter changes', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getApplications.mockResolvedValue({
      data: [makeApp({ stage: 'shortlisted' })],
      pagination: { page: 1, limit: 50, total: 1, pages: 1 },
    })
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getAllByText('Senior Engineer')[0]) })
    await waitFor(() => screen.getAllByText('Bob Candidate')[0])
    const shortlistedBtn = screen.getAllByText(/Shortlisted/i)[0]
    await act(async () => { fireEvent.click(shortlistedBtn) })
    await waitFor(() => {
      const lastCall = api.getApplications.mock.calls.at(-1)[0]
      expect(lastCall.stage).toBe('shortlisted')
    })
  })

  // ── Candidate card interactions ───────────────────────────────────────────

  it('shows candidate name, email, and UTO match score on the card', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getApplications.mockResolvedValue({
      data: [makeApp({ talentMatchScore: 85 })],
      pagination: { page: 1, limit: 50, total: 1, pages: 1 },
    })
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getAllByText('Senior Engineer')[0]) })
    await waitFor(() => {
      expect(screen.getAllByText('Bob Candidate')[0]).toBeInTheDocument()
      expect(screen.getAllByText('bob@example.com · No phone')[0]).toBeInTheDocument()
      expect(screen.getAllByText('85%')[0]).toBeInTheDocument()
    })
  })

  it('renders skill badges from getUserSkillBadges on the candidate card', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getApplications.mockResolvedValue({
      data: [makeApp()],
      pagination: { page: 1, limit: 50, total: 1, pages: 1 },
    })
    api.getUserSkillBadges.mockResolvedValue([
      { passed: true, badgeLevel: 'gold' },
      { passed: true, badgeLevel: 'silver' },
    ])
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getAllByText('Senior Engineer')[0]) })
    await waitFor(() => {
      expect(screen.getAllByText(/1 Gold/i)[0]).toBeInTheDocument()
      expect(screen.getAllByText(/1 Silver/i)[0]).toBeInTheDocument()
    })
  })

  it('opens Notes panel when Notes button is clicked', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getApplications.mockResolvedValue({
      data: [makeApp()],
      pagination: { page: 1, limit: 50, total: 1, pages: 1 },
    })
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getAllByText('Senior Engineer')[0]) })
    await waitFor(() => screen.getAllByText('Bob Candidate')[0])
    const notesBtn = screen.getAllByText(/Notes/i)[0]
    await act(async () => { fireEvent.click(notesBtn) })
    expect(screen.getByPlaceholderText(/Add private notes/i)).toBeInTheDocument()
  })

  it('opens Tags panel when Tags button is clicked', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getApplications.mockResolvedValue({
      data: [makeApp()],
      pagination: { page: 1, limit: 50, total: 1, pages: 1 },
    })
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getAllByText('Senior Engineer')[0]) })
    await waitFor(() => screen.getAllByText('Bob Candidate')[0])
    const tagsBtn = screen.getAllByText(/Tags/i)[0]
    await act(async () => { fireEvent.click(tagsBtn) })
    expect(screen.getByText('Top Talent')).toBeInTheDocument()
    expect(screen.getByText('Culture Fit')).toBeInTheDocument()
  })

  it('navigates to reject form when Reject button is clicked', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getApplications.mockResolvedValue({
      data: [makeApp()],
      pagination: { page: 1, limit: 50, total: 1, pages: 1 },
    })
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getAllByText('Senior Engineer')[0]) })
    await waitFor(() => screen.getAllByText('Bob Candidate')[0])
    const rejectBtn = screen.getAllByText(/✕ Reject/i)[0]
    await act(async () => { fireEvent.click(rejectBtn) })
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining('/app/forms/reject?appId=app1')
    )
  })

  // ── Bulk actions ──────────────────────────────────────────────────────────

  it('shows bulk action bar when a candidate is selected via checkbox', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getApplications.mockResolvedValue({
      data: [makeApp()],
      pagination: { page: 1, limit: 50, total: 1, pages: 1 },
    })
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getAllByText('Senior Engineer')[0]) })
    await waitFor(() => screen.getAllByText('Bob Candidate')[0])
    const checkbox = screen.getByRole('checkbox')
    await act(async () => { fireEvent.click(checkbox) })
    expect(screen.getByText(/1 selected/i)).toBeInTheDocument()
  })

  it('calls updateStage for each selected candidate during bulk shortlist', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getApplications.mockResolvedValue({
      data: [makeApp()],
      pagination: { page: 1, limit: 50, total: 1, pages: 1 },
    })
    api.updateStage.mockResolvedValue({})
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getAllByText('Senior Engineer')[0]) })
    await waitFor(() => screen.getAllByText('Bob Candidate')[0])
    const checkbox = screen.getByRole('checkbox')
    await act(async () => { fireEvent.click(checkbox) })
    const shortlistBtn = screen.getByText(/✓ Shortlist/i)
    await act(async () => { fireEvent.click(shortlistBtn) })
    expect(api.updateStage).toHaveBeenCalledWith('app1', 'shortlisted')
  })

  it('clears selection after clicking Clear button in bulk bar', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getApplications.mockResolvedValue({
      data: [makeApp()],
      pagination: { page: 1, limit: 50, total: 1, pages: 1 },
    })
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getAllByText('Senior Engineer')[0]) })
    await waitFor(() => screen.getAllByText('Bob Candidate')[0])
    await act(async () => { fireEvent.click(screen.getByRole('checkbox')) })
    expect(screen.getByText(/1 selected/i)).toBeInTheDocument()
    await act(async () => { fireEvent.click(screen.getByText('Clear')) })
    expect(screen.queryByText(/1 selected/i)).not.toBeInTheDocument()
  })

  // ── Park action ───────────────────────────────────────────────────────────

  it('calls parkApplication when Park button is clicked', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getApplications.mockResolvedValue({
      data: [makeApp()],
      pagination: { page: 1, limit: 50, total: 1, pages: 1 },
    })
    api.parkApplication.mockResolvedValue({})
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getAllByText('Senior Engineer')[0]) })
    await waitFor(() => screen.getAllByText('Bob Candidate')[0])
    const parkBtn = screen.getAllByText(/🅿️ Park/i)[0]
    await act(async () => { fireEvent.click(parkBtn) })
    expect(api.parkApplication).toHaveBeenCalledWith('app1')
  })

  it('shows toast on park success', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getApplications.mockResolvedValue({
      data: [makeApp()],
      pagination: { page: 1, limit: 50, total: 1, pages: 1 },
    })
    api.parkApplication.mockResolvedValue({})
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getAllByText('Senior Engineer')[0]) })
    await waitFor(() => screen.getAllByText('Bob Candidate')[0])
    await act(async () => { fireEvent.click(screen.getAllByText(/🅿️ Park/i)[0]) })
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toHaveTextContent(/Talent Pool/i)
    })
  })

  // ── Talent Mirror ─────────────────────────────────────────────────────────

  it('shows Talent Mirror button when a job is selected and opens it on click', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getApplications.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, pages: 1 },
    })
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getAllByText('Senior Engineer')[0]) })
    await waitFor(() => screen.getByText(/Talent Mirror/i))
    const mirrorBtn = screen.getAllByText(/Talent Mirror/i).find(el => el.tagName === 'BUTTON' || el.closest('button'))
    await act(async () => { fireEvent.click(mirrorBtn) })
    await waitFor(() => {
      expect(screen.getByTestId('talent-mirror')).toBeInTheDocument()
    })
  })

  // ── API error handling ────────────────────────────────────────────────────

  it('does not crash when getJobs rejects', async () => {
    api.getJobs.mockRejectedValue(new Error('Network error'))
    await expect(
      act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    ).resolves.not.toThrow()
  })

  it('does not crash when getApplications rejects', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getApplications.mockRejectedValue(new Error('Server error'))
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    await expect(
      act(async () => { fireEvent.click(screen.getAllByText('Senior Engineer')[0]) })
    ).resolves.not.toThrow()
  })

  // ── Assessment data ───────────────────────────────────────────────────────

  it('calls getAssessmentForJob when a job is selected', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getApplications.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, pages: 1 },
    })
    api.getAssessmentForJob.mockResolvedValue(null)
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getAllByText('Senior Engineer')[0]) })
    await waitFor(() => {
      expect(api.getAssessmentForJob).toHaveBeenCalledWith('j1')
    })
  })

  it('fetches assessment submissions when a job has an assessment', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getApplications.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, pages: 1 },
    })
    api.getAssessmentForJob.mockResolvedValue({ id: 'asmt1' })
    api.getAssessmentSubmissions.mockResolvedValue([])
    await act(async () => { render(<RecruiterPipeline user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getAllByText('Senior Engineer')[0]) })
    await waitFor(() => {
      expect(api.getAssessmentSubmissions).toHaveBeenCalledWith('asmt1')
    })
  })
})
