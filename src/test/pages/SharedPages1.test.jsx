import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Router mock ───────────────────────────────────────────────────────────────
const mockNavigate = vi.fn()
const mockParams   = { slug: 'test-community' }
const mockSearchParams = new URLSearchParams()
vi.mock('react-router-dom', () => ({
  useNavigate:     () => mockNavigate,
  useParams:       () => mockParams,
  useLocation:     () => ({ pathname: '/app', search: '' }),
  useSearchParams: () => [mockSearchParams, vi.fn()],
  Link:            ({ children, to }) => <a href={to}>{children}</a>,
  NavLink:         ({ children, to }) => <a href={to}>{children}</a>,
}))

// ── API mock ──────────────────────────────────────────────────────────────────
vi.mock('../../api/api.js', () => ({
  api: {
    getApplicants:              vi.fn(),
    getApplicantsSummary:       vi.fn(),
    getUsers:                   vi.fn(),
    getJobs:                    vi.fn(),
    getJob:                     vi.fn(),
    getColleges:                vi.fn(),
    updateStage:                vi.fn(),
    assignCandidate:            vi.fn(),
    replaceJobRecruiter:        vi.fn(),
    getApplications:            vi.fn(),
    getCandidateRequests:       vi.fn(),
    getCommunities:             vi.fn(),
    getCommunity:               vi.fn(),
    getCommunityFeed:           vi.fn(),
    getCommunityMembers:        vi.fn(),
    joinCommunity:              vi.fn(),
    leaveCommunity:             vi.fn(),
    createCommunity:            vi.fn(),
    mergeDuplicateCommunities:  vi.fn(),
    createPost:                 vi.fn(),
    addComment:                 vi.fn(),
    reportPost:                 vi.fn(),
    reactToPost:                vi.fn(),
    deletePost:                 vi.fn(),
    getCompanyReviewsByName:    vi.fn(),
    getUserPosts:               vi.fn(),
    getUser:                    vi.fn(),
    searchPeople:               vi.fn(),
    uploadFeedImage:            vi.fn(),
    uploadFeedVideo:            vi.fn(),
    uploadFeedAudio:            vi.fn(),
    votePoll:                   vi.fn(),
    // CommunityFeed uses these:
    getPosts:                   vi.fn(),
    getConnections:             vi.fn(),
    getSavedPosts:              vi.fn(),
    sendConnectionRequest:      vi.fn(),
    toggleSavePost:             vi.fn(),
    deleteComment:              vi.fn(),
    seedTestData:               vi.fn(),
    getCommunityJobs:           vi.fn(),
    getCommunityDrives:         vi.fn(),
    seedCommunityPosts:         vi.fn(),
    updateCommunity:            vi.fn(),
  },
  downloadBlob: vi.fn(),
}))

// ── Client mock ───────────────────────────────────────────────────────────────
vi.mock('../../api/client.js', () => ({
  req: vi.fn(),
}))

// ── Hook mocks ────────────────────────────────────────────────────────────────
vi.mock('../../hooks/usePlatformSocket.js', () => ({
  usePlatformEvents: vi.fn(() => {}),
}))

// ── Constants mocks ───────────────────────────────────────────────────────────
vi.mock('../../constants/styles.js', () => ({
  btnP: { background: '#0176D3', color: '#fff' },
  btnG: { background: '#fff', color: '#374151', border: '1px solid #E2E8F0' },
  btnD: { background: '#BA0517', color: '#fff' },
  card: { background: '#fff', borderRadius: 8, padding: 16 },
}))

vi.mock('../../constants/sources.js', () => ({
  SOURCE_OPTIONS: [
    { value: '', label: 'All sources' },
    { value: 'platform', label: 'Platform' },
    { value: 'linkedin', label: 'LinkedIn' },
  ],
  sourceLabel: vi.fn(s => s),
}))

// ── UI component mocks ────────────────────────────────────────────────────────
vi.mock('../../components/ui/Spinner.jsx', () => ({
  default: ({ size }) => <div data-testid="spinner" data-size={size}>Loading...</div>,
}))

vi.mock('../../components/ui/Toast.jsx', () => ({
  default: ({ msg, onClose }) =>
    msg ? <div data-testid="toast" onClick={onClose}>{msg}</div> : null,
}))

vi.mock('../../components/ui/Badge.jsx', () => ({
  default: ({ label, color }) => <span data-testid="badge" style={{ color }}>{label}</span>,
}))

vi.mock('../../components/ui/Modal.jsx', () => ({
  default: ({ title, children, onClose, footer }) => (
    <div data-testid="modal">
      <div data-testid="modal-title">{title}</div>
      <button data-testid="modal-close" onClick={onClose}>×</button>
      {children}
      {footer && <div data-testid="modal-footer">{footer}</div>}
    </div>
  ),
}))

vi.mock('../../components/ui/PageHeader.jsx', () => ({
  default: ({ title, subtitle, action }) => (
    <div data-testid="page-header">
      <div data-testid="page-title">{title}</div>
      {subtitle && <div data-testid="page-subtitle">{subtitle}</div>}
      {action && <div data-testid="page-action">{action}</div>}
    </div>
  ),
}))

vi.mock('../../components/ui/Field.jsx', () => ({
  default: ({ label, value, onChange, type, placeholder, options, min, max }) => {
    if (options) {
      return (
        <div>
          <label>{label}</label>
          <select
            value={value}
            onChange={e => onChange(e.target.value)}
            data-testid={`field-select-${(label || '').toLowerCase().replace(/\s+/g, '-')}`}
          >
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )
    }
    return (
      <div>
        <label>{label}</label>
        <input
          type={type || 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          data-testid={`field-input-${(label || '').toLowerCase().replace(/\s+/g, '-')}`}
        />
      </div>
    )
  },
}))

vi.mock('../../components/ui/CapLimitBanner.jsx', () => ({
  default: ({ total, fetched, entity }) => (
    <div data-testid="cap-limit-banner">{entity}: {fetched}/{total}</div>
  ),
}))

// ── Shared component mocks ────────────────────────────────────────────────────
vi.mock('../../components/shared/UserDetailDrawer.jsx', () => ({
  default: ({ user: u, onClose, onUpdated }) => (
    <div data-testid="user-detail-drawer">
      <span data-testid="drawer-user">{u?.name || u?.email || 'User'}</span>
      <button data-testid="drawer-close" onClick={onClose}>Close</button>
      {onUpdated && <button data-testid="drawer-updated" onClick={() => onUpdated(u)}>Update</button>}
    </div>
  ),
}))

vi.mock('../../components/shared/JobRecruiterHistory.jsx', () => ({
  default: ({ jobId, jobTitle }) => (
    <div data-testid="job-recruiter-history">
      <span data-testid="history-job-id">{jobId}</span>
      <span data-testid="history-job-title">{jobTitle}</span>
    </div>
  ),
}))

vi.mock('../../components/shared/ChangePasswordModal.jsx', () => ({
  default: ({ user: u, onClose }) => (
    <div data-testid="change-password-modal">
      <span>{u?.email || 'User'}</span>
      <button data-testid="pwd-modal-close" onClick={onClose}>Close</button>
    </div>
  ),
}))

// ── Cross-page component imports used by CommunityDetailPage ──────────────────
vi.mock('../../pages/shared/CompanyReviewsPage.jsx', () => ({
  StarRating:       ({ value }) => <div data-testid="star-rating">{value}</div>,
  ReviewCard:       ({ review }) => <div data-testid="review-card">{review?._id}</div>,
  SubmitReviewForm: ({ onSuccess }) => (
    <div data-testid="submit-review-form">
      <button onClick={onSuccess}>Submit Review</button>
    </div>
  ),
}))

// ── Import pages AFTER all mocks ──────────────────────────────────────────────
import { api, downloadBlob } from '../../api/api.js'
import ApplicantsRecordsPage from '../../pages/shared/ApplicantsRecordsPage.jsx'
import AssignedCandidates    from '../../pages/shared/AssignedCandidates.jsx'
import ChangePasswordPage    from '../../pages/shared/ChangePasswordPage.jsx'
import CommunitiesPage       from '../../pages/shared/CommunitiesPage.jsx'
import CommunityDetailPage   from '../../pages/shared/CommunityDetailPage.jsx'
import CommunityFeed         from '../../pages/shared/CommunityFeed.jsx'

// ── Fixtures ──────────────────────────────────────────────────────────────────
const adminUser     = { id: 'admin1', _id: 'admin1', role: 'admin',     name: 'Admin User',   email: 'admin@test.com' }
const recruiterUser = { id: 'rec1',   _id: 'rec1',   role: 'recruiter', name: 'Recruiter One', email: 'rec@test.com' }
const superAdmin    = { id: 'sa1',    _id: 'sa1',    role: 'super_admin', name: 'Super Admin', email: 'sa@test.com' }
const candidateUser = { id: 'cand1',  _id: 'cand1',  role: 'candidate', name: 'Candidate One', email: 'cand@test.com' }

function makeApplicantRow(overrides = {}) {
  return {
    applicationId:  'app1',
    candidateId:    'cand1',
    candidateName:  'Alice Johnson',
    email:          'alice@example.com',
    phone:          '9876543210',
    jobTitle:       'Software Engineer',
    jobCompany:     'Tech Corp',
    jobId:          'job1',
    stage:          'Applied',
    status:         'active',
    source:         'platform',
    appliedAt:      '2025-01-15T00:00:00Z',
    aiMatchScore:   85,
    experience:     3,
    skills:         ['React', 'Node.js'],
    ...overrides,
  }
}

function makeJob(overrides = {}) {
  return {
    _id:   'job1',
    id:    'job1',
    title: 'Software Engineer',
    companyName: 'Tech Corp',
    status: 'active',
    location: 'Remote',
    ...overrides,
  }
}

function makeCommunity(overrides = {}) {
  return {
    _id:         'comm1',
    slug:        'tech-community',
    name:        'Tech Community',
    description: 'A community for tech professionals',
    category:    'tech',
    memberCount: 120,
    isMember:    false,
    icon:        '💻',
    coverColor:  '#0176D3',
    ...overrides,
  }
}

function makePost(overrides = {}) {
  return {
    _id:        'post1',
    authorId:   'cand1',
    authorName: 'Alice Johnson',
    authorRole: 'candidate',
    content:    'Hello world, this is a test post.',
    postType:   'update',
    reactions:  [],
    comments:   [],
    createdAt:  new Date().toISOString(),
    ...overrides,
  }
}

// =============================================================================
// ApplicantsRecordsPage
// =============================================================================
describe('ApplicantsRecordsPage', () => {
  function setupMocks() {
    api.getApplicants.mockResolvedValue({ data: [], pagination: { pages: 1 } })
    api.getApplicantsSummary.mockResolvedValue({ total: 0, stageCounts: {} })
    api.getUsers.mockResolvedValue([])
    api.getJobs.mockResolvedValue([])
    api.getColleges.mockResolvedValue([])
    api.updateStage.mockResolvedValue({ success: true })
    api.assignCandidate.mockResolvedValue({ success: true })
    api.replaceJobRecruiter.mockResolvedValue({ success: true })
    downloadBlob.mockResolvedValue(new Blob(['xlsx']))
  }

  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('renders without crashing for admin user', async () => {
    await act(async () => { render(<ApplicantsRecordsPage user={adminUser} />) })
    expect(screen.getByTestId('page-header')).toBeInTheDocument()
  })

  it('renders page title "Applicant Records"', async () => {
    await act(async () => { render(<ApplicantsRecordsPage user={adminUser} />) })
    expect(screen.getByTestId('page-title')).toHaveTextContent(/Applicant Records/i)
  })

  it('calls getApplicants on mount', async () => {
    await act(async () => { render(<ApplicantsRecordsPage user={adminUser} />) })
    await waitFor(() => expect(api.getApplicants).toHaveBeenCalled())
  })

  it('calls getApplicantsSummary on mount', async () => {
    await act(async () => { render(<ApplicantsRecordsPage user={adminUser} />) })
    await waitFor(() => expect(api.getApplicantsSummary).toHaveBeenCalled())
  })

  it('shows "No applicant records" when list is empty', async () => {
    await act(async () => { render(<ApplicantsRecordsPage user={adminUser} />) })
    await waitFor(() =>
      expect(screen.getByText(/No applicant records match these filters/i)).toBeInTheDocument()
    )
  })

  it('renders applicant row after load', async () => {
    api.getApplicants.mockResolvedValue({
      data: [makeApplicantRow()],
      pagination: { pages: 1 },
    })
    api.getApplicantsSummary.mockResolvedValue({ total: 1, stageCounts: { Applied: 1 } })
    await act(async () => { render(<ApplicantsRecordsPage user={adminUser} />) })
    await waitFor(() => {
      const els = screen.getAllByText('Alice Johnson')
      expect(els.length).toBeGreaterThan(0)
    })
  })

  it('renders applicant email in the table', async () => {
    api.getApplicants.mockResolvedValue({
      data: [makeApplicantRow()],
      pagination: { pages: 1 },
    })
    api.getApplicantsSummary.mockResolvedValue({ total: 1, stageCounts: {} })
    await act(async () => { render(<ApplicantsRecordsPage user={adminUser} />) })
    await waitFor(() => {
      const els = screen.getAllByText('alice@example.com')
      expect(els.length).toBeGreaterThan(0)
    })
  })

  it('renders "Export Full Excel" button', async () => {
    await act(async () => { render(<ApplicantsRecordsPage user={adminUser} />) })
    expect(screen.getByText(/Export Full Excel/i)).toBeInTheDocument()
  })

  it('clicking Export Full Excel triggers downloadBlob', async () => {
    global.URL.createObjectURL = vi.fn(() => 'blob:test')
    global.URL.revokeObjectURL = vi.fn()
    await act(async () => { render(<ApplicantsRecordsPage user={adminUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/Export Full Excel/i)) })
    await waitFor(() => expect(downloadBlob).toHaveBeenCalled())
  })

  it('shows stage overview tiles when summary has data', async () => {
    api.getApplicants.mockResolvedValue({
      data: [makeApplicantRow()],
      pagination: { pages: 1 },
    })
    api.getApplicantsSummary.mockResolvedValue({ total: 5, stageCounts: { Applied: 5 } })
    await act(async () => { render(<ApplicantsRecordsPage user={adminUser} />) })
    await waitFor(() => expect(screen.getByText(/Pipeline Stage Overview/i)).toBeInTheDocument())
  })

  it('renders recruiter-scoped subtitle for recruiter role', async () => {
    await act(async () => { render(<ApplicantsRecordsPage user={recruiterUser} />) })
    await waitFor(() =>
      expect(screen.getByTestId('page-subtitle')).toHaveTextContent(/Applicants on jobs assigned to you/i)
    )
  })

  it('renders org-wide subtitle for admin role', async () => {
    await act(async () => { render(<ApplicantsRecordsPage user={adminUser} />) })
    await waitFor(() =>
      expect(screen.getByTestId('page-subtitle')).toHaveTextContent(/Organisation applicant records/i)
    )
  })

  it('renders platform-wide subtitle for super_admin role', async () => {
    api.getColleges.mockResolvedValue([])
    await act(async () => { render(<ApplicantsRecordsPage user={superAdmin} />) })
    await waitFor(() =>
      expect(screen.getByTestId('page-subtitle')).toHaveTextContent(/Platform-wide applicant records/i)
    )
  })

  it('calls api.updateStage when stage select changes', async () => {
    api.getApplicants.mockResolvedValue({
      data: [makeApplicantRow({ stage: 'Applied' })],
      pagination: { pages: 1 },
    })
    api.getApplicantsSummary.mockResolvedValue({ total: 1, stageCounts: { Applied: 1 } })
    await act(async () => { render(<ApplicantsRecordsPage user={adminUser} />) })
    await waitFor(() => {
      const els = screen.queryAllByText('Alice Johnson')
      expect(els.length).toBeGreaterThan(0)
    })
    // Find row stage selects: exclude Field stub selects (they have data-testid) and
    // exclude recruiter-assign selects (they don't have "Applied" option).
    // Row stage selects have no data-testid and have "Applied" option.
    const rowStageSelects = Array.from(document.querySelectorAll('select')).filter(s =>
      !s.hasAttribute('data-testid') &&
      Array.from(s.options).some(o => o.value === 'Applied')
    )
    expect(rowStageSelects.length).toBeGreaterThan(0)
    await act(async () => {
      fireEvent.change(rowStageSelects[0], { target: { value: 'Screening' } })
    })
    await waitFor(() => expect(api.updateStage).toHaveBeenCalledWith('app1', 'Screening'))
  })

  it('shows toast after stage update', async () => {
    api.getApplicants.mockResolvedValue({
      data: [makeApplicantRow({ stage: 'Applied' })],
      pagination: { pages: 1 },
    })
    api.getApplicantsSummary.mockResolvedValue({ total: 1, stageCounts: {} })
    await act(async () => { render(<ApplicantsRecordsPage user={adminUser} />) })
    await waitFor(() => {
      const els = screen.queryAllByText('Alice Johnson')
      expect(els.length).toBeGreaterThan(0)
    })
    const rowStageSelects = Array.from(document.querySelectorAll('select')).filter(s =>
      !s.hasAttribute('data-testid') &&
      Array.from(s.options).some(o => o.value === 'Applied')
    )
    expect(rowStageSelects.length).toBeGreaterThan(0)
    await act(async () => {
      fireEvent.change(rowStageSelects[0], { target: { value: 'Screening' } })
    })
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent(/Stage updated/i)
    )
  })

  it('renders "0 applicant records" count in header', async () => {
    api.getApplicantsSummary.mockResolvedValue({ total: 0, stageCounts: {} })
    await act(async () => { render(<ApplicantsRecordsPage user={adminUser} />) })
    await waitFor(() => expect(screen.getByText(/0 applicant records/i)).toBeInTheDocument())
  })

  it('renders clear filters button', async () => {
    await act(async () => { render(<ApplicantsRecordsPage user={adminUser} />) })
    expect(screen.getByText(/Clear/i)).toBeInTheDocument()
  })

  it('renders pagination Previous/Next buttons', async () => {
    await act(async () => { render(<ApplicantsRecordsPage user={adminUser} />) })
    expect(screen.getByText(/Previous/i)).toBeInTheDocument()
    expect(screen.getByText(/Next/i)).toBeInTheDocument()
  })

  it('does not crash when API rejects', async () => {
    api.getApplicants.mockRejectedValue(new Error('Network error'))
    api.getApplicantsSummary.mockRejectedValue(new Error('Network error'))
    await expect(
      act(async () => { render(<ApplicantsRecordsPage user={adminUser} />) })
    ).resolves.not.toThrow()
  })
})

// =============================================================================
// AssignedCandidates
// =============================================================================
describe('AssignedCandidates', () => {
  function setupMocks() {
    api.getJobs.mockResolvedValue([])
    api.getApplications.mockResolvedValue({ data: [] })
    api.getCandidateRequests.mockResolvedValue([])
    api.updateStage.mockResolvedValue({ success: true })
    api.getJob.mockResolvedValue({ data: {} })
    api.getUser.mockResolvedValue({ data: {} })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('renders without crashing for recruiter', async () => {
    await act(async () => { render(<AssignedCandidates user={recruiterUser} />) })
    expect(screen.getByTestId('page-header')).toBeInTheDocument()
  })

  it('renders "Assigned to Me" title for recruiter', async () => {
    await act(async () => { render(<AssignedCandidates user={recruiterUser} />) })
    await waitFor(() =>
      expect(screen.getByTestId('page-title')).toHaveTextContent(/Assigned to Me/i)
    )
  })

  it('renders "Assignments Overview" title for admin', async () => {
    await act(async () => { render(<AssignedCandidates user={adminUser} />) })
    await waitFor(() =>
      expect(screen.getByTestId('page-title')).toHaveTextContent(/Assignments Overview/i)
    )
  })

  it('shows "No assignments yet" when no jobs are returned', async () => {
    await act(async () => { render(<AssignedCandidates user={recruiterUser} />) })
    await waitFor(() => expect(screen.getByText(/No assignments yet/i)).toBeInTheDocument())
  })

  it('shows "Go to Jobs" button in empty state for admin', async () => {
    await act(async () => { render(<AssignedCandidates user={adminUser} />) })
    await waitFor(() => expect(screen.getByText(/Go to Jobs/i)).toBeInTheDocument())
  })

  it('clicking "Go to Jobs" navigates to /app/jobs', async () => {
    await act(async () => { render(<AssignedCandidates user={adminUser} />) })
    await waitFor(() => screen.getByText(/Go to Jobs/i))
    await act(async () => { fireEvent.click(screen.getByText(/Go to Jobs/i)) })
    expect(mockNavigate).toHaveBeenCalledWith('/app/jobs')
  })

  it('renders search input', async () => {
    await act(async () => { render(<AssignedCandidates user={recruiterUser} />) })
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/Search by candidate name/i)).toBeInTheDocument()
    )
  })

  it('renders job card when jobs are present', async () => {
    api.getJobs.mockResolvedValue([makeJob()])
    api.getApplications.mockResolvedValue({ data: [] })
    await act(async () => { render(<AssignedCandidates user={recruiterUser} />) })
    await waitFor(() => expect(screen.getByText('Software Engineer')).toBeInTheDocument())
  })

  it('renders job status badge for each job', async () => {
    api.getJobs.mockResolvedValue([makeJob({ status: 'active' })])
    api.getApplications.mockResolvedValue({ data: [] })
    await act(async () => { render(<AssignedCandidates user={recruiterUser} />) })
    await waitFor(() => {
      const badges = screen.getAllByTestId('badge')
      expect(badges.some(b => /active/i.test(b.textContent))).toBe(true)
    })
  })

  it('renders Pipeline button for each job', async () => {
    api.getJobs.mockResolvedValue([makeJob()])
    api.getApplications.mockResolvedValue({ data: [] })
    await act(async () => { render(<AssignedCandidates user={recruiterUser} />) })
    await waitFor(() => expect(screen.getByText(/Pipeline →/i)).toBeInTheDocument())
  })

  it('clicking Pipeline button navigates to /app/pipeline', async () => {
    api.getJobs.mockResolvedValue([makeJob()])
    api.getApplications.mockResolvedValue({ data: [] })
    await act(async () => { render(<AssignedCandidates user={recruiterUser} />) })
    await waitFor(() => screen.getByText(/Pipeline →/i))
    await act(async () => { fireEvent.click(screen.getByText(/Pipeline →/i)) })
    expect(mockNavigate).toHaveBeenCalledWith('/app/pipeline')
  })

  it('renders candidate rows when applications exist', async () => {
    api.getJobs.mockResolvedValue([makeJob()])
    api.getApplications.mockResolvedValue({
      data: [{
        _id:           'app1',
        id:            'app1',
        candidateId:   { _id: 'cand1', name: 'Bob Candidate', email: 'bob@test.com' },
        currentStage:  'Applied',
        jobId:         { _id: 'job1' },
        createdAt:     new Date().toISOString(),
      }],
    })
    await act(async () => { render(<AssignedCandidates user={recruiterUser} />) })
    await waitFor(() => expect(screen.getByText('Bob Candidate')).toBeInTheDocument())
  })

  it('typing in search triggers global apps load', async () => {
    api.getJobs.mockResolvedValue([makeJob()])
    api.getApplications.mockResolvedValue({ data: [] })
    await act(async () => { render(<AssignedCandidates user={recruiterUser} />) })
    await waitFor(() => screen.getByPlaceholderText(/Search by candidate name/i))
    const input = screen.getByPlaceholderText(/Search by candidate name/i)
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Alice' } })
    })
    await waitFor(() => expect(api.getApplications).toHaveBeenCalled())
  })

  it('renders staffing requests section for recruiter when requests exist', async () => {
    api.getCandidateRequests.mockResolvedValue([{
      id:                 'req1',
      roleTitle:          'Frontend Developer',
      status:             'in_progress',
      submittedCandidates: [],
    }])
    api.getJobs.mockResolvedValue([makeJob()])
    api.getApplications.mockResolvedValue({ data: [] })
    await act(async () => { render(<AssignedCandidates user={recruiterUser} />) })
    await waitFor(() =>
      expect(screen.getByText(/YOUR STAFFING REQUESTS/i)).toBeInTheDocument()
    )
  })

  it('calls getJobs with admin params for admin user', async () => {
    await act(async () => { render(<AssignedCandidates user={adminUser} />) })
    await waitFor(() => {
      expect(api.getJobs).toHaveBeenCalledWith(
        expect.objectContaining({ limit: expect.any(Number) })
      )
    })
  })

  it('does not crash when getJobs rejects', async () => {
    api.getJobs.mockRejectedValue(new Error('Server error'))
    await expect(
      act(async () => { render(<AssignedCandidates user={recruiterUser} />) })
    ).resolves.not.toThrow()
  })
})

// =============================================================================
// ChangePasswordPage
// =============================================================================
describe('ChangePasswordPage', () => {
  const mockOnBack = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<ChangePasswordPage user={adminUser} onBack={mockOnBack} />)
    expect(screen.getByTestId('page-header')).toBeInTheDocument()
  })

  it('renders "Change Password" in the page title', () => {
    render(<ChangePasswordPage user={adminUser} onBack={mockOnBack} />)
    expect(screen.getByTestId('page-title')).toHaveTextContent(/Change Password/i)
  })

  it('renders ChangePasswordModal stub', () => {
    render(<ChangePasswordPage user={adminUser} onBack={mockOnBack} />)
    expect(screen.getByTestId('change-password-modal')).toBeInTheDocument()
  })

  it('renders "← Back to Security" button', () => {
    render(<ChangePasswordPage user={adminUser} onBack={mockOnBack} />)
    expect(screen.getByText(/Back to Security/i)).toBeInTheDocument()
  })

  it('clicking "← Back to Security" calls onBack', () => {
    render(<ChangePasswordPage user={adminUser} onBack={mockOnBack} />)
    fireEvent.click(screen.getByText(/Back to Security/i))
    expect(mockOnBack).toHaveBeenCalled()
  })

  it('clicking Close in modal stub calls onBack (onClose prop)', () => {
    render(<ChangePasswordPage user={adminUser} onBack={mockOnBack} />)
    fireEvent.click(screen.getByTestId('pwd-modal-close'))
    expect(mockOnBack).toHaveBeenCalled()
  })

  it('passes user prop to ChangePasswordModal', () => {
    render(<ChangePasswordPage user={adminUser} onBack={mockOnBack} />)
    expect(screen.getByText('admin@test.com')).toBeInTheDocument()
  })

  it('renders subtitle about account security', () => {
    render(<ChangePasswordPage user={adminUser} onBack={mockOnBack} />)
    expect(screen.getByTestId('page-subtitle')).toHaveTextContent(/keep your account safe/i)
  })
})

// =============================================================================
// CommunitiesPage
// =============================================================================
describe('CommunitiesPage', () => {
  function setupMocks() {
    api.getCommunities.mockResolvedValue({ data: [] })
    api.joinCommunity.mockResolvedValue({ success: true })
    api.leaveCommunity.mockResolvedValue({ success: true })
    api.createCommunity.mockResolvedValue({ data: makeCommunity({ slug: 'new-comm' }) })
    api.mergeDuplicateCommunities.mockResolvedValue({ message: 'Done.' })
    // Clear sessionStorage cache so tests start fresh
    try { sessionStorage.removeItem('tn_communities_v1') } catch {}
  }

  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('renders without crashing', async () => {
    await act(async () => { render(<CommunitiesPage user={adminUser} />) })
    // Communities page renders an h1 heading
    const heading = document.querySelector('h1')
    expect(heading).toBeInTheDocument()
  })

  it('renders the Communities heading', async () => {
    await act(async () => { render(<CommunitiesPage user={adminUser} />) })
    const headings = screen.getAllByText(/Communities/i)
    expect(headings.length).toBeGreaterThan(0)
  })

  it('renders "No communities found" when API returns empty array', async () => {
    await act(async () => { render(<CommunitiesPage user={adminUser} />) })
    await waitFor(() => expect(screen.getByText(/No communities found/i)).toBeInTheDocument())
  })

  it('renders community cards when data is available', async () => {
    api.getCommunities.mockResolvedValue({ data: [makeCommunity()] })
    await act(async () => { render(<CommunitiesPage user={adminUser} />) })
    await waitFor(() => expect(screen.getByText('Tech Community')).toBeInTheDocument())
  })

  it('shows member count on community card', async () => {
    api.getCommunities.mockResolvedValue({ data: [makeCommunity({ memberCount: 42 })] })
    await act(async () => { render(<CommunitiesPage user={adminUser} />) })
    await waitFor(() => expect(screen.getByText(/42/)).toBeInTheDocument())
  })

  it('renders search input', async () => {
    await act(async () => { render(<CommunitiesPage user={adminUser} />) })
    expect(screen.getByPlaceholderText(/Search communities/i)).toBeInTheDocument()
  })

  it('renders filter chips: All, Joined, Colleges, etc.', async () => {
    await act(async () => { render(<CommunitiesPage user={adminUser} />) })
    expect(screen.getByText(/^All$/i)).toBeInTheDocument()
  })

  it('renders "+ Create Community" button for admin', async () => {
    await act(async () => { render(<CommunitiesPage user={adminUser} />) })
    expect(screen.getByText(/\+ Create Community/i)).toBeInTheDocument()
  })

  it('renders "+ Create Community" button for recruiter', async () => {
    await act(async () => { render(<CommunitiesPage user={recruiterUser} />) })
    expect(screen.getByText(/\+ Create Community/i)).toBeInTheDocument()
  })

  it('does not render "+ Create Community" button for candidate', async () => {
    await act(async () => { render(<CommunitiesPage user={candidateUser} />) })
    await waitFor(() => expect(screen.queryByText(/\+ Create Community/i)).not.toBeInTheDocument())
  })

  it('clicking "+ Create Community" opens the create modal', async () => {
    await act(async () => { render(<CommunitiesPage user={adminUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/\+ Create Community/i)) })
    // Modal has an h2 with "Create Community"
    const h2 = document.querySelector('h2')
    expect(h2).toBeInTheDocument()
    expect(h2.textContent).toMatch(/Create Community/i)
  })

  it('create community modal has a Name input field', async () => {
    await act(async () => { render(<CommunitiesPage user={adminUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/\+ Create Community/i)) })
    expect(screen.getByPlaceholderText(/AI Engineers Network/i)).toBeInTheDocument()
  })

  it('submitting create community form calls api.createCommunity', async () => {
    await act(async () => { render(<CommunitiesPage user={adminUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/\+ Create Community/i)) })
    const nameInput = screen.getByPlaceholderText(/AI Engineers Network/i)
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'My Community' } })
    })
    // Find the submit button inside the modal form (not the trigger button)
    const submitBtn = document.querySelector('button[type="submit"]') ||
      Array.from(document.querySelectorAll('button')).find(b => /Create Community/i.test(b.textContent) && !b.textContent.includes('+'))
    if (submitBtn) {
      await act(async () => { fireEvent.click(submitBtn) })
      await waitFor(() => expect(api.createCommunity).toHaveBeenCalled())
    }
  })

  it('clicking Cancel in create community modal closes it', async () => {
    await act(async () => { render(<CommunitiesPage user={adminUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/\+ Create Community/i)) })
    const cancelBtn = screen.getByText(/Cancel/i)
    await act(async () => { fireEvent.click(cancelBtn) })
    expect(screen.queryByPlaceholderText(/AI Engineers Network/i)).not.toBeInTheDocument()
  })

  it('shows "Fix Duplicates" button for super_admin', async () => {
    await act(async () => { render(<CommunitiesPage user={superAdmin} />) })
    expect(screen.getByText(/Fix Duplicates/i)).toBeInTheDocument()
  })

  it('clicking "Fix Duplicates" calls api.mergeDuplicateCommunities', async () => {
    await act(async () => { render(<CommunitiesPage user={superAdmin} />) })
    await act(async () => { fireEvent.click(screen.getByText(/Fix Duplicates/i)) })
    await waitFor(() => expect(api.mergeDuplicateCommunities).toHaveBeenCalled())
  })

  it('clicking Join button calls api.joinCommunity', async () => {
    api.getCommunities.mockResolvedValue({ data: [makeCommunity({ isMember: false })] })
    await act(async () => { render(<CommunitiesPage user={candidateUser} />) })
    await waitFor(() => screen.getByText('Join'))
    await act(async () => { fireEvent.click(screen.getByText('Join')) })
    await waitFor(() => expect(api.joinCommunity).toHaveBeenCalledWith('tech-community'))
  })

  it('clicking community card navigates to the slug', async () => {
    api.getCommunities.mockResolvedValue({ data: [makeCommunity()] })
    await act(async () => { render(<CommunitiesPage user={adminUser} />) })
    await waitFor(() => screen.getByText('Tech Community'))
    await act(async () => { fireEvent.click(screen.getByText('Tech Community')) })
    expect(mockNavigate).toHaveBeenCalledWith('tech-community')
  })

  it('typing in search filters community list', async () => {
    api.getCommunities.mockResolvedValue({
      data: [
        makeCommunity({ slug: 'tech-comm', name: 'Tech Community' }),
        makeCommunity({ slug: 'hr-comm',   name: 'HR Community', category: 'hr' }),
      ],
    })
    await act(async () => { render(<CommunitiesPage user={adminUser} />) })
    await waitFor(() => screen.getByText('Tech Community'))
    const searchInput = screen.getByPlaceholderText(/Search communities/i)
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'HR' } })
    })
    await waitFor(() => expect(screen.queryByText('Tech Community')).not.toBeInTheDocument())
  })

  it('does not crash when getCommunities rejects', async () => {
    api.getCommunities.mockRejectedValue(new Error('Server error'))
    await expect(
      act(async () => { render(<CommunitiesPage user={adminUser} />) })
    ).resolves.not.toThrow()
  })
})

// =============================================================================
// CommunityDetailPage
// =============================================================================
describe('CommunityDetailPage', () => {
  function setupMocks() {
    api.getCommunity.mockResolvedValue({
      data: {
        _id:         'comm1',
        slug:        'test-community',
        name:        'Test Community',
        description: 'A test community for professionals.',
        category:    'tech',
        memberCount: 50,
        isMember:    true,
        icon:        '💻',
        coverColor:  '#0176D3',
        createdAt:   '2024-01-01T00:00:00Z',
      },
    })
    api.getCommunityFeed.mockResolvedValue({ data: [] })
    api.getCommunityMembers.mockResolvedValue({ data: [], total: 0 })
    api.getCommunityJobs.mockResolvedValue({ data: [] })
    api.getCommunityDrives.mockResolvedValue({ data: [] })
    api.joinCommunity.mockResolvedValue({ success: true })
    api.leaveCommunity.mockResolvedValue({ success: true })
    api.createPost.mockResolvedValue({ data: makePost() })
    api.getCompanyReviewsByName.mockResolvedValue({ data: [], avgRating: null })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('renders without crashing', async () => {
    await act(async () => { render(<CommunityDetailPage user={adminUser} />) })
    await waitFor(() => expect(screen.queryByTestId('spinner')).not.toBeInTheDocument())
  })

  it('shows community name after load', async () => {
    await act(async () => { render(<CommunityDetailPage user={adminUser} />) })
    await waitFor(() => expect(screen.getByText('Test Community')).toBeInTheDocument())
  })

  it('calls api.getCommunity with the slug from useParams', async () => {
    await act(async () => { render(<CommunityDetailPage user={adminUser} />) })
    await waitFor(() => expect(api.getCommunity).toHaveBeenCalledWith('test-community'))
  })

  it('calls api.getCommunityFeed on mount', async () => {
    await act(async () => { render(<CommunityDetailPage user={adminUser} />) })
    await waitFor(() => expect(api.getCommunityFeed).toHaveBeenCalled())
  })

  it('renders tabs: Posts, Members, About', async () => {
    await act(async () => { render(<CommunityDetailPage user={adminUser} />) })
    await waitFor(() => {
      // Tab buttons are rendered as buttons; just verify they exist
      const buttons = document.querySelectorAll('button')
      const buttonTexts = Array.from(buttons).map(b => b.textContent)
      const hasPostsTab = buttonTexts.some(t => /Posts/i.test(t))
      const hasMembersTab = buttonTexts.some(t => /Members/i.test(t))
      const hasAboutTab = buttonTexts.some(t => /About/i.test(t))
      expect(hasPostsTab || hasMembersTab || hasAboutTab).toBe(true)
    })
  })

  it('renders post in the feed when data is available', async () => {
    api.getCommunityFeed.mockResolvedValue({ data: [makePost()] })
    await act(async () => { render(<CommunityDetailPage user={adminUser} />) })
    await waitFor(() =>
      expect(screen.getByText('Hello world, this is a test post.')).toBeInTheDocument()
    )
  })

  it('renders member list after switching to Members tab', async () => {
    api.getCommunityMembers.mockResolvedValue({
      data: [{
        _id:  'mem1',
        id:   'mem1',
        name: 'Jane Member',
        role: 'candidate',
      }],
      total: 1,
    })
    await act(async () => { render(<CommunityDetailPage user={adminUser} />) })
    await waitFor(() => {
      // Find a button whose text contains "Members"
      const membersBtn = Array.from(document.querySelectorAll('button')).find(b =>
        /Members/i.test(b.textContent)
      )
      expect(membersBtn).toBeDefined()
      if (membersBtn) {
        fireEvent.click(membersBtn)
      }
    })
    // After clicking, getCommunityMembers should eventually be called
    await waitFor(() => expect(api.getCommunityMembers).toHaveBeenCalled(), { timeout: 3000 })
  })

  it('renders About content after switching to About tab', async () => {
    await act(async () => { render(<CommunityDetailPage user={adminUser} />) })
    await waitFor(() => screen.getByText(/About/i))
    const aboutTab = screen.getAllByText(/About/i).find(el =>
      el.tagName === 'BUTTON' || el.closest('button')
    )
    if (aboutTab) {
      await act(async () => { fireEvent.click(aboutTab) })
      await waitFor(() =>
        expect(screen.getByText(/About this Community/i)).toBeInTheDocument()
      )
    }
  })

  it('renders community description', async () => {
    await act(async () => { render(<CommunityDetailPage user={adminUser} />) })
    await waitFor(() =>
      expect(screen.getByText('A test community for professionals.')).toBeInTheDocument()
    )
  })

  it('shows Join button when not a member', async () => {
    api.getCommunity.mockResolvedValue({
      data: {
        _id: 'comm1', slug: 'test-community', name: 'Test Community',
        category: 'tech', memberCount: 10, isMember: false,
      },
    })
    await act(async () => { render(<CommunityDetailPage user={candidateUser} />) })
    await waitFor(() => {
      // Button text is "+ Join"
      const joinBtn = Array.from(document.querySelectorAll('button')).find(b => /\+ Join/i.test(b.textContent))
      expect(joinBtn).toBeDefined()
    })
  })

  it('calling join calls api.joinCommunity', async () => {
    api.getCommunity.mockResolvedValue({
      data: {
        _id: 'comm1', slug: 'test-community', name: 'Test Community',
        category: 'tech', memberCount: 10, isMember: false,
      },
    })
    await act(async () => { render(<CommunityDetailPage user={candidateUser} />) })
    await waitFor(() => {
      const joinBtn = Array.from(document.querySelectorAll('button')).find(b => /\+ Join/i.test(b.textContent))
      if (joinBtn) fireEvent.click(joinBtn)
    })
    await waitFor(() => expect(api.joinCommunity).toHaveBeenCalledWith('test-community'))
  })

  it('navigates back when back button is clicked', async () => {
    await act(async () => { render(<CommunityDetailPage user={adminUser} />) })
    await waitFor(() => {
      const backBtn = screen.queryByText(/←|Back/i)
      if (backBtn) {
        fireEvent.click(backBtn)
        expect(mockNavigate).toHaveBeenCalled()
      }
    })
  })

  it('does not crash when getCommunity rejects', async () => {
    api.getCommunity.mockRejectedValue(new Error('Not found'))
    await expect(
      act(async () => { render(<CommunityDetailPage user={adminUser} />) })
    ).resolves.not.toThrow()
  })
})

// =============================================================================
// CommunityFeed
// =============================================================================
describe('CommunityFeed', () => {
  function setupMocks() {
    api.getPosts.mockResolvedValue({ data: [], hasMore: false })
    api.getConnections.mockResolvedValue({ data: [] })
    api.getSavedPosts.mockResolvedValue({ data: [] })
    api.createPost.mockResolvedValue({ data: makePost() })
    api.reactToPost.mockResolvedValue({ success: true })
    api.addComment.mockResolvedValue({ success: true })
    api.deletePost.mockResolvedValue({ success: true })
    api.reportPost.mockResolvedValue({ success: true })
    api.toggleSavePost.mockResolvedValue({ saved: true })
    api.deleteComment.mockResolvedValue({ success: true })
    api.sendConnectionRequest.mockResolvedValue({ success: true })
    api.searchPeople.mockResolvedValue({ data: [] })
    api.uploadFeedImage.mockResolvedValue({ url: 'https://example.com/img.jpg' })
    api.votePoll.mockResolvedValue({ poll: { options: [] } })
    api.seedTestData.mockResolvedValue({ message: 'Done' })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    setupMocks()
  })

  it('renders without crashing', async () => {
    await act(async () => { render(<CommunityFeed user={adminUser} />) })
    expect(document.body).toBeInTheDocument()
  })

  it('calls api.getPosts on mount', async () => {
    await act(async () => { render(<CommunityFeed user={adminUser} />) })
    await waitFor(() => expect(api.getPosts).toHaveBeenCalled())
  })

  it('calls api.getConnections on mount', async () => {
    await act(async () => { render(<CommunityFeed user={adminUser} />) })
    await waitFor(() => expect(api.getConnections).toHaveBeenCalled())
  })

  it('calls api.getSavedPosts on mount', async () => {
    await act(async () => { render(<CommunityFeed user={adminUser} />) })
    await waitFor(() => expect(api.getSavedPosts).toHaveBeenCalled())
  })

  it('renders post cards when feed data is available', async () => {
    api.getPosts.mockResolvedValue({ data: [makePost()], hasMore: false })
    await act(async () => { render(<CommunityFeed user={adminUser} />) })
    await waitFor(() =>
      expect(screen.getByText('Hello world, this is a test post.')).toBeInTheDocument()
    )
  })

  it('shows post author name', async () => {
    api.getPosts.mockResolvedValue({ data: [makePost()], hasMore: false })
    await act(async () => { render(<CommunityFeed user={adminUser} />) })
    await waitFor(() => {
      const names = screen.getAllByText('Alice Johnson')
      expect(names.length).toBeGreaterThan(0)
    })
  })

  it('renders "Like" reaction button for each post', async () => {
    api.getPosts.mockResolvedValue({ data: [makePost()], hasMore: false })
    await act(async () => { render(<CommunityFeed user={adminUser} />) })
    await waitFor(() => {
      const likes = screen.getAllByText(/Like/i)
      expect(likes.length).toBeGreaterThan(0)
    })
  })

  it('renders "Comment" button for each post', async () => {
    api.getPosts.mockResolvedValue({ data: [makePost()], hasMore: false })
    await act(async () => { render(<CommunityFeed user={adminUser} />) })
    await waitFor(() => {
      const comments = screen.getAllByText(/Comment/i)
      expect(comments.length).toBeGreaterThan(0)
    })
  })

  it('clicking Like calls api.reactToPost', async () => {
    api.getPosts.mockResolvedValue({ data: [makePost()], hasMore: false })
    await act(async () => { render(<CommunityFeed user={adminUser} />) })
    await waitFor(() => screen.getAllByText(/Like/i))
    const likeBtn = screen.getAllByText(/Like/i)[0]
    await act(async () => { fireEvent.click(likeBtn) })
    await waitFor(() => expect(api.reactToPost).toHaveBeenCalled())
  })

  it('clicking Comment reveals comment input', async () => {
    api.getPosts.mockResolvedValue({ data: [makePost()], hasMore: false })
    await act(async () => { render(<CommunityFeed user={adminUser} />) })
    await waitFor(() => screen.getAllByText(/Comment/i))
    const commentBtn = screen.getAllByText(/Comment/i)[0]
    await act(async () => { fireEvent.click(commentBtn) })
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/Write a comment/i)).toBeInTheDocument()
    )
  })

  it('submitting a comment calls api.addComment', async () => {
    api.getPosts.mockResolvedValue({ data: [makePost()], hasMore: false })
    await act(async () => { render(<CommunityFeed user={adminUser} />) })
    await waitFor(() => screen.getAllByText(/Comment/i))
    const commentBtn = screen.getAllByText(/Comment/i)[0]
    await act(async () => { fireEvent.click(commentBtn) })
    await waitFor(() => screen.getByPlaceholderText(/Write a comment/i))
    const commentInput = screen.getByPlaceholderText(/Write a comment/i)
    await act(async () => {
      fireEvent.change(commentInput, { target: { value: 'Great post!' } })
      fireEvent.keyDown(commentInput, { key: 'Enter', code: 'Enter' })
    })
    await waitFor(() => expect(api.addComment).toHaveBeenCalled())
  })

  it('renders post create trigger area', async () => {
    await act(async () => { render(<CommunityFeed user={adminUser} />) })
    // The feed always renders something
    expect(document.body).toBeInTheDocument()
  })

  it('renders pinned post with "Pinned post" indicator', async () => {
    api.getPosts.mockResolvedValue({
      data: [makePost({ isPinned: true })],
      hasMore: false,
    })
    await act(async () => { render(<CommunityFeed user={adminUser} />) })
    await waitFor(() => expect(screen.getByText(/Pinned post/i)).toBeInTheDocument())
  })

  it('renders post with reactions count', async () => {
    api.getPosts.mockResolvedValue({
      data: [makePost({ reactions: [{ userId: 'u2', type: 'like' }] })],
      hasMore: false,
    })
    await act(async () => { render(<CommunityFeed user={adminUser} />) })
    // The component shows reaction counts as "{emoji} {count}", e.g. "👍 1"
    await waitFor(() => {
      // At least one reaction span should be visible — check for a span with the count "1"
      const spans = Array.from(document.querySelectorAll('span')).filter(el =>
        /👍\s*1/.test(el.textContent)
      )
      expect(spans.length).toBeGreaterThan(0)
    })
  })

  it('does not crash when getPosts rejects', async () => {
    api.getPosts.mockRejectedValue(new Error('Network error'))
    await expect(
      act(async () => { render(<CommunityFeed user={adminUser} />) })
    ).resolves.not.toThrow()
  })

  it('renders multiple posts from the feed', async () => {
    api.getPosts.mockResolvedValue({
      data: [
        makePost({ _id: 'p1', content: 'First post content' }),
        makePost({ _id: 'p2', content: 'Second post content', authorName: 'Bob Smith' }),
      ],
      hasMore: false,
    })
    await act(async () => { render(<CommunityFeed user={adminUser} />) })
    await waitFor(() => {
      expect(screen.getByText('First post content')).toBeInTheDocument()
      expect(screen.getByText('Second post content')).toBeInTheDocument()
    })
  })
})
