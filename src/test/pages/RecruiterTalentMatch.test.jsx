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
    getJobs: vi.fn(),
    getJob: vi.fn(),
    getUsers: vi.fn(),
    getUserSkillBadges: vi.fn(),
    talentMatchAction: vi.fn(),
  },
}))

// ── Matching module mock ──────────────────────────────────────────────────────
vi.mock('../../api/matching.js', () => ({
  matchCandidatesToJob: vi.fn(),
  enrichWithPlatformSignals: vi.fn(),
}))

// ── API client mock (dynamic import inside run()) ─────────────────────────────
vi.mock('../../api/client.js', () => ({
  req: vi.fn(),
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
vi.mock('../../components/shared/UserDetailDrawer.jsx', () => ({
  default: ({ onClose }) => (
    <div data-testid="user-detail-drawer">
      <button onClick={onClose}>Close Drawer</button>
    </div>
  ),
}))
vi.mock('../../components/shared/ResumeCard.jsx', () => ({
  default: ({ candidate }) => <div data-testid="resume-card">{candidate?.name}</div>,
}))
vi.mock('../../components/shared/PresenceBadge.jsx', () => ({
  default: () => <span data-testid="presence-badge" />,
}))
vi.mock('../../constants/styles.js', () => ({
  btnP: {},
  btnG: {},
  card: {},
  inp: {},
}))

import { api } from '../../api/api.js'
import { matchCandidatesToJob, enrichWithPlatformSignals } from '../../api/matching.js'
import RecruiterTalentMatch from '../../pages/recruiter/RecruiterTalentMatch.jsx'

// ── Fixtures ──────────────────────────────────────────────────────────────────
const mockUser = { id: 'rec1', name: 'Jane Recruiter' }

function makeJob(overrides = {}) {
  return {
    id: 'j1',
    _id: 'j1',
    title: 'Frontend Engineer',
    company: 'Acme Corp',
    companyName: 'Acme Corp',
    location: 'Remote',
    status: 'active',
    ...overrides,
  }
}

function makeCandidate(overrides = {}) {
  return {
    id: 'c1',
    _id: 'c1',
    name: 'Alice Developer',
    email: 'alice@dev.com',
    title: 'React Developer',
    experience: 5,
    location: 'New York',
    skills: ['React', 'TypeScript'],
    ...overrides,
  }
}

function makeMatchResult(overrides = {}) {
  return {
    candidate: makeCandidate(),
    matchScore: 88,
    recommendation: 'Strong Match',
    highlights: ['React expertise', 'TypeScript'],
    matchInsights: [],
    matchVector: { skills: 40, experience: 20 },
    missingSkills: [],
    confidenceLevel: 'High',
    ...overrides,
  }
}

// ── Default API setup ─────────────────────────────────────────────────────────
function setupDefaultMocks() {
  api.getJobs.mockResolvedValue({ data: [] })
  api.getJob.mockResolvedValue({ data: makeJob() })
  api.getUsers.mockResolvedValue({ data: [] })
  api.getUserSkillBadges.mockResolvedValue([])
  api.talentMatchAction.mockResolvedValue({})
  enrichWithPlatformSignals.mockResolvedValue([])
  matchCandidatesToJob.mockReturnValue([])
}

// ─────────────────────────────────────────────────────────────────────────────

describe('RecruiterTalentMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    setupDefaultMocks()
  })

  // ── Mount and initial render ──────────────────────────────────────────────

  it('renders the page header with "Job Match" title', async () => {
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    expect(screen.getByTestId('page-header')).toHaveTextContent('Job Match')
  })

  it('calls getJobs on mount with the recruiter id', async () => {
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    expect(api.getJobs).toHaveBeenCalledWith({ recruiterId: 'rec1' })
  })

  it('renders the job search input with correct placeholder while loading', () => {
    api.getJobs.mockReturnValue(new Promise(() => {}))
    render(<RecruiterTalentMatch user={mockUser} />)
    expect(screen.getByPlaceholderText(/Loading jobs/i)).toBeInTheDocument()
  })

  // ── Job list grid (no job selected) ──────────────────────────────────────

  it('shows spinner while jobs are loading', () => {
    api.getJobs.mockReturnValue(new Promise(() => {}))
    render(<RecruiterTalentMatch user={mockUser} />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('renders job cards in the grid after jobs load', async () => {
    api.getJobs.mockResolvedValue({
      data: [
        makeJob({ id: 'j1', title: 'Frontend Engineer' }),
        makeJob({ id: 'j2', title: 'Backend Developer' }),
      ],
    })
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument()
    expect(screen.getByText('Backend Developer')).toBeInTheDocument()
  })

  it('shows "No job postings available yet." when jobs list is empty', async () => {
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    expect(screen.getByText(/No job postings available yet/i)).toBeInTheDocument()
  })

  it('filters the job grid by the search input', async () => {
    api.getJobs.mockResolvedValue({
      data: [
        makeJob({ id: 'j1', title: 'Frontend Engineer' }),
        makeJob({ id: 'j2', title: 'Backend Developer' }),
      ],
    })
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    const input = screen.getByPlaceholderText(/Search.*jobs/i)
    await act(async () => { fireEvent.change(input, { target: { value: 'Backend' } }) })
    expect(screen.queryByText('Frontend Engineer')).not.toBeInTheDocument()
    expect(screen.getByText('Backend Developer')).toBeInTheDocument()
  })

  it('shows "No jobs match" when search yields no results', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob({ title: 'Frontend Engineer' })] })
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    const input = screen.getByPlaceholderText(/Search.*jobs/i)
    await act(async () => { fireEvent.change(input, { target: { value: 'Doesnotexist' } }) })
    expect(screen.getByText(/No jobs match/i)).toBeInTheDocument()
  })

  // ── Job selection and match run ───────────────────────────────────────────

  it('calls getJob and getUsers when a job card is clicked', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getUsers.mockResolvedValue({ data: [makeCandidate()] })
    enrichWithPlatformSignals.mockResolvedValue([makeCandidate()])
    matchCandidatesToJob.mockReturnValue([makeMatchResult()])
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('Frontend Engineer')) })
    await waitFor(() => {
      expect(api.getJob).toHaveBeenCalledWith('j1')
      expect(api.getUsers).toHaveBeenCalledWith('candidate')
    })
  })

  it('shows "IDENTIFYING THE BEST TALENT..." spinner while matching is in progress', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getJob.mockReturnValue(new Promise(() => {}))
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('Frontend Engineer')) })
    expect(screen.getByText(/IDENTIFYING THE BEST TALENT/i)).toBeInTheDocument()
  })

  it('displays candidate name and match score after matching completes', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getUsers.mockResolvedValue({ data: [makeCandidate()] })
    enrichWithPlatformSignals.mockResolvedValue([makeCandidate()])
    matchCandidatesToJob.mockReturnValue([makeMatchResult()])
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('Frontend Engineer')) })
    await waitFor(() => {
      expect(screen.getByText('Alice Developer')).toBeInTheDocument()
      expect(screen.getByText(/88% Score/i)).toBeInTheDocument()
    })
  })

  it('shows "Analysis Required" when job is selected but no candidates matched', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getJob.mockResolvedValue({ data: makeJob() })
    api.getUsers.mockResolvedValue({ data: [makeCandidate()] })
    enrichWithPlatformSignals.mockResolvedValue([makeCandidate()])
    matchCandidatesToJob.mockReturnValue([])
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('Frontend Engineer')) })
    await waitFor(() => {
      expect(screen.getByText('Analysis Required')).toBeInTheDocument()
    })
  })

  it('shows toast when no candidates exist in the system', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getJob.mockResolvedValue({ data: makeJob() })
    api.getUsers.mockResolvedValue({ data: [] })
    enrichWithPlatformSignals.mockResolvedValue([])
    matchCandidatesToJob.mockReturnValue([])
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('Frontend Engineer')) })
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toHaveTextContent(/No candidates found/i)
    })
  })

  it('shows the selected job label after a job is chosen', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getUsers.mockResolvedValue({ data: [makeCandidate()] })
    enrichWithPlatformSignals.mockResolvedValue([makeCandidate()])
    matchCandidatesToJob.mockReturnValue([makeMatchResult()])
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('Frontend Engineer')) })
    await waitFor(() => {
      expect(screen.getByText(/Selected:.*Frontend Engineer/i)).toBeInTheDocument()
    })
  })

  // ── Candidate search filter ───────────────────────────────────────────────

  it('filters match results by candidate name search', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getUsers.mockResolvedValue({ data: [makeCandidate(), makeCandidate({ id: 'c2', name: 'Bob Smith', email: 'bob@smith.com' })] })
    enrichWithPlatformSignals.mockResolvedValue([makeCandidate(), makeCandidate({ id: 'c2', name: 'Bob Smith', email: 'bob@smith.com' })])
    matchCandidatesToJob.mockReturnValue([
      makeMatchResult(),
      makeMatchResult({ candidate: makeCandidate({ id: 'c2', name: 'Bob Smith', email: 'bob@smith.com' }) }),
    ])
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('Frontend Engineer')) })
    await waitFor(() => screen.getByText('Alice Developer'))
    const filterInput = screen.getByPlaceholderText(/Filter candidates/i)
    await act(async () => { fireEvent.change(filterInput, { target: { value: 'Alice' } }) })
    expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument()
    expect(screen.getByText('Alice Developer')).toBeInTheDocument()
  })

  it('shows candidate count summary row when results are present', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getUsers.mockResolvedValue({ data: [makeCandidate()] })
    enrichWithPlatformSignals.mockResolvedValue([makeCandidate()])
    matchCandidatesToJob.mockReturnValue([makeMatchResult()])
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('Frontend Engineer')) })
    await waitFor(() => {
      expect(screen.getByText(/1 candidate matched/i)).toBeInTheDocument()
    })
  })

  // ── Shortlist action ──────────────────────────────────────────────────────

  it('calls talentMatchAction with "shortlist" when Shortlist button is clicked', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getUsers.mockResolvedValue({ data: [makeCandidate()] })
    enrichWithPlatformSignals.mockResolvedValue([makeCandidate()])
    matchCandidatesToJob.mockReturnValue([makeMatchResult()])
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('Frontend Engineer')) })
    await waitFor(() => screen.getByText('Alice Developer'))
    const shortlistBtn = screen.getByText(/⭐ Shortlist/i)
    await act(async () => { fireEvent.click(shortlistBtn) })
    await waitFor(() => {
      expect(api.talentMatchAction).toHaveBeenCalledWith('c1', 'j1', 'shortlist')
    })
  })

  it('shows success toast and marks candidate as shortlisted after shortlist action', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getUsers.mockResolvedValue({ data: [makeCandidate()] })
    enrichWithPlatformSignals.mockResolvedValue([makeCandidate()])
    matchCandidatesToJob.mockReturnValue([makeMatchResult()])
    api.talentMatchAction.mockResolvedValue({})
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('Frontend Engineer')) })
    await waitFor(() => screen.getByText(/⭐ Shortlist/i))
    await act(async () => { fireEvent.click(screen.getByText(/⭐ Shortlist/i)) })
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toHaveTextContent(/Shortlisted/i)
    })
    expect(screen.getByText(/✓ Shortlisted/i)).toBeInTheDocument()
  })

  // ── Park action ───────────────────────────────────────────────────────────

  it('calls talentMatchAction with "park" when Park button is clicked', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getUsers.mockResolvedValue({ data: [makeCandidate()] })
    enrichWithPlatformSignals.mockResolvedValue([makeCandidate()])
    matchCandidatesToJob.mockReturnValue([makeMatchResult()])
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('Frontend Engineer')) })
    await waitFor(() => screen.getByText('Alice Developer'))
    const parkBtn = screen.getByText(/^Park$/i)
    await act(async () => { fireEvent.click(parkBtn) })
    await waitFor(() => {
      expect(api.talentMatchAction).toHaveBeenCalledWith('c1', 'j1', 'park')
    })
  })

  // ── Reach Out action ──────────────────────────────────────────────────────

  it('calls talentMatchAction with "interest" when Reach Out is clicked', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getUsers.mockResolvedValue({ data: [makeCandidate()] })
    enrichWithPlatformSignals.mockResolvedValue([makeCandidate()])
    matchCandidatesToJob.mockReturnValue([makeMatchResult()])
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('Frontend Engineer')) })
    await waitFor(() => screen.getByText('Alice Developer'))
    const reachOutBtn = screen.getByText(/Reach Out/i)
    await act(async () => { fireEvent.click(reachOutBtn) })
    await waitFor(() => {
      expect(api.talentMatchAction).toHaveBeenCalledWith('c1', 'j1', 'interest')
    })
  })

  it('shows toast when Reach Out succeeds and updates button to "✓ Sent"', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getUsers.mockResolvedValue({ data: [makeCandidate()] })
    enrichWithPlatformSignals.mockResolvedValue([makeCandidate()])
    matchCandidatesToJob.mockReturnValue([makeMatchResult()])
    api.talentMatchAction.mockResolvedValue({})
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('Frontend Engineer')) })
    await waitFor(() => screen.getByText(/Reach Out/i))
    await act(async () => { fireEvent.click(screen.getByText(/Reach Out/i)) })
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toHaveTextContent(/Reach-out sent/i)
    })
    expect(screen.getByText(/✓ Sent/i)).toBeInTheDocument()
  })

  // ── Resume modal ──────────────────────────────────────────────────────────

  it('opens inline resume modal when VIEW RESUME is clicked', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getUsers.mockResolvedValue({ data: [makeCandidate()] })
    enrichWithPlatformSignals.mockResolvedValue([makeCandidate()])
    matchCandidatesToJob.mockReturnValue([makeMatchResult()])
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('Frontend Engineer')) })
    await waitFor(() => screen.getByText('Alice Developer'))
    await act(async () => { fireEvent.click(screen.getByText(/VIEW RESUME/i)) })
    expect(screen.getByTestId('resume-card')).toBeInTheDocument()
    expect(screen.getByTestId('resume-card')).toHaveTextContent('Alice Developer')
  })

  it('closes resume modal when Close button is clicked', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getUsers.mockResolvedValue({ data: [makeCandidate()] })
    enrichWithPlatformSignals.mockResolvedValue([makeCandidate()])
    matchCandidatesToJob.mockReturnValue([makeMatchResult()])
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('Frontend Engineer')) })
    await waitFor(() => screen.getByText('Alice Developer'))
    await act(async () => { fireEvent.click(screen.getByText(/VIEW RESUME/i)) })
    expect(screen.getByTestId('resume-card')).toBeInTheDocument()
    const closeBtn = screen.getByText(/✕ Close/i)
    await act(async () => { fireEvent.click(closeBtn) })
    expect(screen.queryByTestId('resume-card')).not.toBeInTheDocument()
  })

  // ── Profile drawer ────────────────────────────────────────────────────────

  it('opens UserDetailDrawer when PROFILE button is clicked', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getUsers.mockResolvedValue({ data: [makeCandidate()] })
    enrichWithPlatformSignals.mockResolvedValue([makeCandidate()])
    matchCandidatesToJob.mockReturnValue([makeMatchResult()])
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('Frontend Engineer')) })
    await waitFor(() => screen.getByText('Alice Developer'))
    await act(async () => { fireEvent.click(screen.getByText(/PROFILE/i)) })
    expect(screen.getByTestId('user-detail-drawer')).toBeInTheDocument()
  })

  // ── Skill badges ──────────────────────────────────────────────────────────

  it('displays gold and silver badge counts when getUserSkillBadges returns results', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getUsers.mockResolvedValue({ data: [makeCandidate()] })
    enrichWithPlatformSignals.mockResolvedValue([makeCandidate()])
    matchCandidatesToJob.mockReturnValue([makeMatchResult()])
    api.getUserSkillBadges.mockResolvedValue([
      { passed: true, badgeLevel: 'gold' },
      { passed: true, badgeLevel: 'gold' },
      { passed: true, badgeLevel: 'silver' },
      { passed: false, badgeLevel: 'bronze' }, // should be excluded
    ])
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('Frontend Engineer')) })
    await waitFor(() => screen.getByText('Alice Developer'))
    await waitFor(() => {
      expect(screen.getByText(/2 Gold/i)).toBeInTheDocument()
      expect(screen.getByText(/1 Silver/i)).toBeInTheDocument()
    })
  })

  // ── Match recommendation badge ────────────────────────────────────────────

  it('renders the recommendation badge from match results', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getUsers.mockResolvedValue({ data: [makeCandidate()] })
    enrichWithPlatformSignals.mockResolvedValue([makeCandidate()])
    matchCandidatesToJob.mockReturnValue([makeMatchResult({ recommendation: 'Exceptional Match' })])
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('Frontend Engineer')) })
    await waitFor(() => {
      expect(screen.getByText('Exceptional Match')).toBeInTheDocument()
    })
  })

  // ── Missing skills gap ────────────────────────────────────────────────────

  it('displays missing skill gaps when a candidate has gaps', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getUsers.mockResolvedValue({ data: [makeCandidate()] })
    enrichWithPlatformSignals.mockResolvedValue([makeCandidate()])
    matchCandidatesToJob.mockReturnValue([
      makeMatchResult({ missingSkills: ['GraphQL', 'Docker'] }),
    ])
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('Frontend Engineer')) })
    await waitFor(() => screen.getByText('Alice Developer'))
    expect(screen.getByText('GraphQL')).toBeInTheDocument()
    expect(screen.getByText('Docker')).toBeInTheDocument()
  })

  // ── Error handling ────────────────────────────────────────────────────────

  it('does not crash when getJobs rejects', async () => {
    api.getJobs.mockRejectedValue(new Error('Network error'))
    await expect(
      act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    ).resolves.not.toThrow()
  })

  it('shows error toast when matching API call fails', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getJob.mockRejectedValue(new Error('Matching server unavailable'))
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('Frontend Engineer')) })
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toHaveTextContent(/Matching failed/i)
    })
  })

  it('shows action-failed toast when talentMatchAction rejects', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getUsers.mockResolvedValue({ data: [makeCandidate()] })
    enrichWithPlatformSignals.mockResolvedValue([makeCandidate()])
    matchCandidatesToJob.mockReturnValue([makeMatchResult()])
    api.talentMatchAction.mockRejectedValue(new Error('Action failed'))
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('Frontend Engineer')) })
    await waitFor(() => screen.getByText(/⭐ Shortlist/i))
    await act(async () => { fireEvent.click(screen.getByText(/⭐ Shortlist/i)) })
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toHaveTextContent(/Action failed/i)
    })
  })

  // ── Re-run button ─────────────────────────────────────────────────────────

  it('shows Re-run button when a job is selected and re-runs matching on click', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getUsers.mockResolvedValue({ data: [makeCandidate()] })
    enrichWithPlatformSignals.mockResolvedValue([makeCandidate()])
    matchCandidatesToJob.mockReturnValue([makeMatchResult()])
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('Frontend Engineer')) })
    await waitFor(() => screen.getByText('Alice Developer'))
    const reRunBtn = screen.getByText(/Re-run/i)
    expect(reRunBtn).toBeInTheDocument()
    await act(async () => { fireEvent.click(reRunBtn) })
    // getJob and getUsers should have been called at least twice (initial run + re-run)
    expect(api.getJob.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  // ── Clear job selection ───────────────────────────────────────────────────

  it('clears selection and returns to job grid when the clear (✕) button is clicked', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getUsers.mockResolvedValue({ data: [makeCandidate()] })
    enrichWithPlatformSignals.mockResolvedValue([makeCandidate()])
    matchCandidatesToJob.mockReturnValue([makeMatchResult()])
    await act(async () => { render(<RecruiterTalentMatch user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('Frontend Engineer')) })
    await waitFor(() => screen.getByText('Alice Developer'))
    // The search bar now shows the job label; clicking ✕ inside it should clear
    const clearBtn = screen.getByRole('button', { name: /✕/ })
    await act(async () => { fireEvent.click(clearBtn) })
    // Job grid should reappear
    await waitFor(() => {
      expect(screen.getByText(/click any card to run candidate match/i)).toBeInTheDocument()
    })
  })
})
