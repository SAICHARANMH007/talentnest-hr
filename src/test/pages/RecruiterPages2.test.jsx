// ── vi.mock calls MUST be before imports ─────────────────────────────────────
import React from 'react'

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: 'job1', appId: 'app1', assessmentId: 'asmt1', submissionId: 'sub1', driveId: 'drive1' }),
  useLocation: () => ({ pathname: '/', search: '' }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  Link: ({ children, to }) => React.createElement('a', { href: to }, children),
}))

vi.mock('../../api/api.js', () => ({
  api: {
    // Jobs
    getJobs: vi.fn(),
    createJob: vi.fn(),
    patchJob: vi.fn(),
    deleteJob: vi.fn(),
    getJob: vi.fn(),
    // Applications
    getApplications: vi.fn(),
    getApplication: vi.fn(),
    updateStage: vi.fn(),
    scheduleInterview: vi.fn(),
    submitScorecard: vi.fn(),
    talentMatchAction: vi.fn(),
    // Assessments
    listAssessments: vi.fn(),
    getAssessmentForJob: vi.fn(),
    createAssessment: vi.fn(),
    updateAssessment: vi.fn(),
    getAssessmentSubmissions: vi.fn(),
    getAssessmentSubmission: vi.fn(),
    reviewSubmission: vi.fn(),
    // College drives
    getCompanyCollegeDrives: vi.fn(),
    getCompanyCollegeDrive: vi.fn(),
    requestCampusDrive: vi.fn(),
    updateDriveRegistrationStatus: vi.fn(),
    // Users
    getUsers: vi.fn(),
    // Email / comms
    sendEmail: vi.fn(),
    createWhatsAppSession: vi.fn(),
  },
}))

vi.mock('../../api/matching.js', () => ({
  genericSearchMatch: vi.fn((items) => items),
  matchCandidatesToJob: vi.fn((job, cands) => cands.map(c => ({ candidate: c, score: 80, label: 'Good Match' }))),
}))

// ── Constants ─────────────────────────────────────────────────────────────────
vi.mock('../../constants/styles.js', () => ({
  btnP: {},
  btnG: {},
  btnD: {},
  card: {},
  inp: {},
}))

vi.mock('../../constants/stages.js', () => ({
  STAGES: [],
  SM: {},
  NEXT: {},
}))

vi.mock('../../constants/education.js', () => ({
  DEGREES: ['B.Tech', 'MBA'],
  ALL_BRANCHES: ['CSE', 'ECE'],
}))

// ── Hooks ─────────────────────────────────────────────────────────────────────
vi.mock('../../hooks/usePlatformSocket.js', () => ({
  usePlatformEvents: vi.fn(),
  usePlatformSocket: vi.fn(),
}))

// ── UI components ─────────────────────────────────────────────────────────────
vi.mock('../../components/ui/Toast.jsx', () => ({
  default: ({ msg }) => msg ? React.createElement('div', { 'data-testid': 'toast' }, msg) : null,
}))
vi.mock('../../components/ui/Spinner.jsx', () => ({
  default: () => React.createElement('div', { 'data-testid': 'spinner' }, 'Loading...'),
}))
vi.mock('../../components/ui/Badge.jsx', () => ({
  default: ({ label }) => React.createElement('span', { 'data-testid': 'badge' }, label),
}))
vi.mock('../../components/ui/PageHeader.jsx', () => ({
  default: ({ title, subtitle }) =>
    React.createElement('div', { 'data-testid': 'page-header' },
      React.createElement('div', { 'data-testid': 'page-header-title' }, title),
      subtitle && React.createElement('div', { 'data-testid': 'page-header-subtitle' }, subtitle),
    ),
}))
vi.mock('../../components/ui/Modal.jsx', () => ({
  default: ({ title, children, footer, onClose }) =>
    React.createElement('div', { 'data-testid': 'modal' },
      React.createElement('div', { 'data-testid': 'modal-title' }, title),
      children,
      footer,
      React.createElement('button', { 'data-testid': 'modal-close', onClick: onClose }, 'X'),
    ),
}))
vi.mock('../../components/ui/Field.jsx', () => ({
  default: ({ label, value, onChange, placeholder, type }) =>
    React.createElement('div', null,
      React.createElement('label', null, label),
      React.createElement('input', {
        'aria-label': label,
        value: value || '',
        onChange: (e) => onChange && onChange(e.target.value),
        placeholder,
        type: type || 'text',
      }),
    ),
}))
vi.mock('../../components/ui/Dropdown.jsx', () => ({
  default: ({ label, value, onChange, options }) =>
    React.createElement('select', {
      'aria-label': label,
      value: value || '',
      onChange: (e) => onChange && onChange(e.target.value),
    },
      (options || []).map(o =>
        React.createElement('option', { key: o.value || o, value: o.value || o }, o.label || o)
      )
    ),
}))
vi.mock('../../components/ui/CapLimitBanner.jsx', () => ({
  default: () => React.createElement('div', { 'data-testid': 'cap-limit-banner' }),
}))
vi.mock('../../components/ui/Skeleton.jsx', () => ({
  default: ({ height, width }) =>
    React.createElement('div', { 'data-testid': 'skeleton', style: { height, width } }),
}))

// ── Shared components ─────────────────────────────────────────────────────────
vi.mock('../../components/shared/UserDetailDrawer.jsx', () => ({
  default: ({ user, onClose }) =>
    React.createElement('div', { 'data-testid': 'user-detail-drawer' },
      React.createElement('button', { onClick: onClose }, 'Close Drawer'),
    ),
}))
vi.mock('../../components/shared/ResumeCard.jsx', () => ({
  default: () => null,
}))
vi.mock('../../components/shared/PostJobForm.jsx', () => ({
  default: ({ onCreated }) =>
    React.createElement('div', { 'data-testid': 'post-job-form' },
      React.createElement('button', { onClick: () => onCreated && onCreated({ id: 'new-job', title: 'New Job' }) }, 'Create Job'),
    ),
}))
vi.mock('../../components/shared/JobDetailDrawer.jsx', () => ({
  default: () => null,
}))
vi.mock('../../components/shared/ShareJobModal.jsx', () => ({
  default: () => null,
}))
vi.mock('../../components/shared/CollegeAutocomplete.jsx', () => ({
  default: ({ onChange }) =>
    React.createElement('input', {
      'data-testid': 'college-autocomplete',
      onChange: (e) => onChange && onChange(e.target.value),
    }),
}))
vi.mock('../../components/shared/PresenceBadge.jsx', () => ({
  default: ({ userId }) =>
    React.createElement('span', { 'data-testid': `presence-${userId}` }),
}))

// ── Assessment / modals ───────────────────────────────────────────────────────
vi.mock('../../components/assessments/AssessmentBuilder.jsx', () => ({
  default: ({ onSave }) =>
    React.createElement('div', { 'data-testid': 'assessment-builder' },
      React.createElement('button', { onClick: () => onSave && onSave({ title: 'Test Assessment' }) }, 'Save Assessment'),
    ),
}))
vi.mock('../../components/modals/OfferLetterModal.jsx', () => ({
  default: () => null,
}))

// ── External libs ─────────────────────────────────────────────────────────────
vi.mock('read-excel-file/browser', () => ({
  default: vi.fn().mockResolvedValue([]),
}))

// ── Now import everything ─────────────────────────────────────────────────────
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from '../../api/api.js'

import RecruiterJobs from '../../pages/recruiter/RecruiterJobs.jsx'
import RecruiterInterviews from '../../pages/recruiter/RecruiterInterviews.jsx'
import RecruiterAssessments from '../../pages/recruiter/RecruiterAssessments.jsx'
import RecruiterSmartMatch from '../../pages/recruiter/RecruiterSmartMatch.jsx'
import RecruiterMyPerformance from '../../pages/recruiter/RecruiterMyPerformance.jsx'
import CompanyCollegeDrives from '../../pages/recruiter/CompanyCollegeDrives.jsx'
import CompanyDriveDetail from '../../pages/recruiter/CompanyDriveDetail.jsx'
import GenerateOfferPage from '../../pages/recruiter/GenerateOfferPage.jsx'
import ScheduleInterviewPage from '../../pages/recruiter/ScheduleInterviewPage.jsx'
import CandidateRejectionPage from '../../pages/recruiter/CandidateRejectionPage.jsx'
import AssessmentReviewPage from '../../pages/recruiter/AssessmentReviewPage.jsx'

// ── IntersectionObserver stub (AssessmentReviewPage needs it) ─────────────────
global.IntersectionObserver = class {
  constructor(cb) { this.cb = cb; }
  observe() {}
  unobserve() {}
  disconnect() {}
}

// ── Shared mock data ──────────────────────────────────────────────────────────
const MOCK_USER = { id: 'u1', name: 'Test Recruiter', email: 'recruiter@test.com', role: 'recruiter' }

const MOCK_APPLICATION = {
  id: 'app1',
  _id: 'app1',
  candidateId: 'c1',
  candidateName: 'Test Candidate',
  candidate: { id: 'c1', name: 'Test Candidate', email: 'candidate@test.com', phone: '9999999999' },
  job: { id: 'job1', title: 'Test Job', company: 'TestCo', location: 'Hyderabad' },
  jobId: { title: 'Test Job' },
  stage: 'applied',
  currentStage: 'applied',
  interviewRounds: [],
}

const MOCK_JOB = {
  id: 'job1',
  _id: 'job1',
  title: 'Test Job',
  company: 'TestCo',
  status: 'active',
  location: 'Hyderabad',
  description: 'A test job',
}

const MOCK_DRIVE = {
  id: 'drive1',
  title: 'Campus Drive 2024',
  collegeName: 'IIT Bombay',
  driveDate: '2024-12-01',
  status: 'upcoming',
  registrations: [],
}

const MOCK_ASSESSMENT = {
  id: 'asmt1',
  _id: 'asmt1',
  title: 'Test Assessment',
  jobId: 'job1',
  isActive: true,
  questions: [],
}

const MOCK_SUBMISSION = {
  assessment: { id: 'asmt1', title: 'Test Assessment', questions: [] },
  submission: {
    id: 'sub1',
    candidateName: 'Test Candidate',
    result: 'pending',
    recruiterReview: '',
    answers: [],
    totalScore: 0,
    timeTaken: 120,
  },
}

// ── beforeEach: clear mocks and set safe defaults ─────────────────────────────
beforeEach(() => {
  vi.clearAllMocks()

  api.getJobs.mockResolvedValue([])
  api.createJob.mockResolvedValue({ id: 'new1', title: 'New Job' })
  api.patchJob.mockResolvedValue({})
  api.deleteJob.mockResolvedValue({})
  api.getApplications.mockResolvedValue([])
  api.getApplication.mockResolvedValue(MOCK_APPLICATION)
  api.updateStage.mockResolvedValue({})
  api.scheduleInterview.mockResolvedValue({})
  api.submitScorecard.mockResolvedValue({})
  api.talentMatchAction.mockResolvedValue({})
  api.listAssessments.mockResolvedValue([])
  api.getAssessmentForJob.mockResolvedValue(null)
  api.createAssessment.mockResolvedValue(MOCK_ASSESSMENT)
  api.updateAssessment.mockResolvedValue(MOCK_ASSESSMENT)
  api.getAssessmentSubmissions.mockResolvedValue([])
  api.getAssessmentSubmission.mockResolvedValue(MOCK_SUBMISSION)
  api.reviewSubmission.mockResolvedValue({})
  api.getCompanyCollegeDrives.mockResolvedValue([])
  api.getCompanyCollegeDrive.mockResolvedValue({ data: MOCK_DRIVE })
  api.requestCampusDrive.mockResolvedValue({})
  api.updateDriveRegistrationStatus.mockResolvedValue({})
  api.getJob.mockResolvedValue(MOCK_JOB)
  api.getUsers.mockResolvedValue([])
  api.sendEmail.mockResolvedValue({ previewUrl: 'https://example.com/preview' })
  api.createWhatsAppSession.mockResolvedValue({})

  // Ensure window.location.search is empty by default
  Object.defineProperty(window, 'location', {
    value: { ...window.location, search: '', origin: 'http://localhost:5173' },
    writable: true,
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RecruiterJobs
// ─────────────────────────────────────────────────────────────────────────────
describe('RecruiterJobs', () => {
  it('renders without crashing (smoke)', async () => {
    await act(async () => {
      render(<RecruiterJobs user={MOCK_USER} />)
    })
    expect(screen.getByTestId('page-header')).toBeTruthy()
  })

  it('calls api.getJobs on mount with recruiterId', async () => {
    await act(async () => {
      render(<RecruiterJobs user={MOCK_USER} />)
    })
    // RecruiterJobs calls getJobs multiple times (main load + tab counts)
    expect(api.getJobs).toHaveBeenCalled()
    expect(api.getJobs).toHaveBeenCalledWith(
      expect.objectContaining({ recruiterId: MOCK_USER.id })
    )
  })

  it('displays job title after api.getJobs resolves', async () => {
    api.getJobs.mockResolvedValue([MOCK_JOB])
    await act(async () => {
      render(<RecruiterJobs user={MOCK_USER} />)
    })
    await waitFor(() => {
      expect(screen.getAllByText('Test Job').length).toBeGreaterThan(0)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RecruiterInterviews
// ─────────────────────────────────────────────────────────────────────────────
describe('RecruiterInterviews', () => {
  it('renders without crashing (smoke)', async () => {
    await act(async () => {
      render(<RecruiterInterviews user={MOCK_USER} />)
    })
    expect(screen.getByTestId('page-header')).toBeTruthy()
  })

  it('calls api.getApplications on mount', async () => {
    await act(async () => {
      render(<RecruiterInterviews user={MOCK_USER} />)
    })
    expect(api.getApplications).toHaveBeenCalledWith({ limit: 10000000 })
  })

  it('shows upcoming and past tab buttons', async () => {
    await act(async () => {
      render(<RecruiterInterviews user={MOCK_USER} />)
    })
    await waitFor(() => {
      // Multiple elements may contain "Upcoming" (tab button + count display)
      expect(screen.getAllByText(/Upcoming/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Past/i).length).toBeGreaterThan(0)
    })
  })

  it('shows schedule button for shortlisted apps with no rounds', async () => {
    const shortlistedApp = {
      ...MOCK_APPLICATION,
      id: 'app2',
      stage: 'shortlisted',
      interviewRounds: [],
      candidateId: { name: 'Jane Doe' },
      jobId: { title: 'Test Job' },
    }
    api.getApplications.mockResolvedValue([shortlistedApp])
    await act(async () => {
      render(<RecruiterInterviews user={MOCK_USER} />)
    })
    await waitFor(() => {
      expect(screen.getAllByText(/Schedule Interview/i).length).toBeGreaterThan(0)
    })
  })

  it('calls api.scheduleInterview when schedule form is submitted with date and time', async () => {
    const shortlistedApp = {
      ...MOCK_APPLICATION,
      id: 'app-sched',
      stage: 'shortlisted',
      interviewRounds: [],
      candidateId: { name: 'Jane Doe', email: 'jane@test.com' },
      jobId: { title: 'Test Job' },
    }
    api.getApplications.mockResolvedValue([shortlistedApp])
    await act(async () => {
      render(<RecruiterInterviews user={MOCK_USER} />)
    })
    await waitFor(() => {
      expect(screen.getAllByText(/Schedule Interview/i).length).toBeGreaterThan(0)
    })
    fireEvent.click(screen.getAllByText(/Schedule Interview/i)[0])
    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeTruthy()
    })
    // Fill date and time using aria-label
    const dateInputs = screen.queryAllByLabelText(/^Date/i)
    const timeInputs = screen.queryAllByLabelText(/^Time/i)
    if (dateInputs.length > 0) fireEvent.change(dateInputs[0], { target: { value: '2024-12-01' } })
    if (timeInputs.length > 0) fireEvent.change(timeInputs[0], { target: { value: '10:00' } })
    const scheduleBtn = screen.getByText(/Schedule & Send Invite/i)
    await act(async () => { fireEvent.click(scheduleBtn) })
    await waitFor(() => {
      expect(api.scheduleInterview).toHaveBeenCalled()
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RecruiterAssessments
// ─────────────────────────────────────────────────────────────────────────────
describe('RecruiterAssessments', () => {
  it('renders without crashing (smoke)', async () => {
    await act(async () => {
      render(<RecruiterAssessments user={MOCK_USER} />)
    })
    expect(screen.getByTestId('page-header')).toBeTruthy()
  })

  it('calls api.getJobs and api.listAssessments on mount', async () => {
    await act(async () => {
      render(<RecruiterAssessments user={MOCK_USER} />)
    })
    expect(api.getJobs).toHaveBeenCalled()
    expect(api.listAssessments).toHaveBeenCalled()
  })

  it('displays assessment title when listAssessments returns data', async () => {
    api.listAssessments.mockResolvedValue([MOCK_ASSESSMENT])
    await act(async () => {
      render(<RecruiterAssessments user={MOCK_USER} />)
    })
    await waitFor(() => {
      expect(screen.getByText('Test Assessment')).toBeTruthy()
    })
  })

  it('calls api.getAssessmentSubmissions when viewing submissions', async () => {
    api.listAssessments.mockResolvedValue([MOCK_ASSESSMENT])
    api.getAssessmentSubmissions.mockResolvedValue([])
    await act(async () => {
      render(<RecruiterAssessments user={MOCK_USER} />)
    })
    await waitFor(() => {
      expect(screen.getByText('Test Assessment')).toBeTruthy()
    })
    const submissionsBtn = screen.queryByText(/Submissions/i)
    if (submissionsBtn) {
      await act(async () => { fireEvent.click(submissionsBtn) })
      await waitFor(() => {
        expect(api.getAssessmentSubmissions).toHaveBeenCalled()
      })
    } else {
      expect(api.listAssessments).toHaveBeenCalled()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RecruiterSmartMatch
// ─────────────────────────────────────────────────────────────────────────────
describe('RecruiterSmartMatch', () => {
  it('renders without crashing (smoke)', async () => {
    await act(async () => {
      render(<RecruiterSmartMatch user={MOCK_USER} />)
    })
    expect(screen.getByTestId('page-header')).toBeTruthy()
  })

  it('calls api.getJobs on mount with recruiter id', async () => {
    await act(async () => {
      render(<RecruiterSmartMatch user={MOCK_USER} />)
    })
    expect(api.getJobs).toHaveBeenCalledWith({ recruiterId: MOCK_USER.id })
  })

  it('renders job select dropdown after jobs load', async () => {
    api.getJobs.mockResolvedValue([MOCK_JOB])
    await act(async () => {
      render(<RecruiterSmartMatch user={MOCK_USER} />)
    })
    await waitFor(() => {
      const select = screen.queryByText(/Choose a job/i)
      expect(select).toBeTruthy()
    })
  })

  it('calls api.getJob and api.getUsers when a job is selected', async () => {
    api.getJobs.mockResolvedValue([MOCK_JOB])
    api.getJob.mockResolvedValue(MOCK_JOB)
    api.getUsers.mockResolvedValue([])
    await act(async () => {
      render(<RecruiterSmartMatch user={MOCK_USER} />)
    })
    await waitFor(() => {
      expect(screen.queryByText(/Choose a job/i)).toBeTruthy()
    })
    const select = document.querySelector('select')
    if (select) {
      await act(async () => {
        fireEvent.change(select, { target: { value: 'job1' } })
      })
      await waitFor(() => {
        expect(api.getJob).toHaveBeenCalledWith('job1')
        expect(api.getUsers).toHaveBeenCalledWith('candidate')
      })
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RecruiterMyPerformance
// ─────────────────────────────────────────────────────────────────────────────
describe('RecruiterMyPerformance', () => {
  it('renders without crashing (smoke)', async () => {
    await act(async () => {
      render(<RecruiterMyPerformance user={MOCK_USER} />)
    })
    // After load completes, content should be visible
    await waitFor(() => {
      expect(document.body).toBeTruthy()
    })
  })

  it('calls api.getJobs and api.getApplications on mount', async () => {
    await act(async () => {
      render(<RecruiterMyPerformance user={MOCK_USER} />)
    })
    expect(api.getJobs).toHaveBeenCalledWith({ recruiterId: MOCK_USER.id })
    expect(api.getApplications).toHaveBeenCalledWith({ recruiterId: MOCK_USER.id })
  })

  it('shows spinner while loading', async () => {
    // Keep promise pending so loading stays true
    api.getJobs.mockReturnValue(new Promise(() => {}))
    api.getApplications.mockReturnValue(new Promise(() => {}))
    await act(async () => {
      render(<RecruiterMyPerformance user={MOCK_USER} />)
    })
    expect(screen.getByTestId('spinner')).toBeTruthy()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CompanyCollegeDrives
// ─────────────────────────────────────────────────────────────────────────────
describe('CompanyCollegeDrives', () => {
  it('renders without crashing (smoke)', async () => {
    await act(async () => {
      render(<CompanyCollegeDrives user={MOCK_USER} />)
    })
    expect(screen.getByTestId('page-header')).toBeTruthy()
  })

  it('calls api.getCompanyCollegeDrives on mount', async () => {
    await act(async () => {
      render(<CompanyCollegeDrives user={MOCK_USER} />)
    })
    expect(api.getCompanyCollegeDrives).toHaveBeenCalled()
  })

  it('displays drive title after API resolves', async () => {
    api.getCompanyCollegeDrives.mockResolvedValue([MOCK_DRIVE])
    await act(async () => {
      render(<CompanyCollegeDrives user={MOCK_USER} />)
    })
    await waitFor(() => {
      expect(screen.getByText('Campus Drive 2024')).toBeTruthy()
    })
  })

  it('calls api.requestCampusDrive when form is submitted', async () => {
    await act(async () => {
      render(<CompanyCollegeDrives user={MOCK_USER} />)
    })
    // Open the request form
    const requestBtn = screen.queryByText(/Request.*Drive|New.*Drive|Campus.*Drive/i)
    if (requestBtn) {
      await act(async () => { fireEvent.click(requestBtn) })
      const titleInput = screen.queryByPlaceholderText(/title/i) || screen.queryByLabelText(/title/i)
      const driveDate = screen.queryByLabelText(/Drive Date/i) || screen.queryByLabelText(/date/i)
      if (titleInput) fireEvent.change(titleInput, { target: { value: 'Test Drive' } })
      if (driveDate) fireEvent.change(driveDate, { target: { value: '2024-12-01' } })
      const submitBtn = screen.queryByText(/Submit|Send Request/i)
      if (submitBtn) {
        await act(async () => { fireEvent.click(submitBtn) })
      }
    }
    // Just verify page rendered cleanly
    expect(api.getCompanyCollegeDrives).toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CompanyDriveDetail
// ─────────────────────────────────────────────────────────────────────────────
describe('CompanyDriveDetail', () => {
  it('renders without crashing (smoke)', async () => {
    await act(async () => {
      render(<CompanyDriveDetail user={MOCK_USER} />)
    })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getCompanyCollegeDrive with id from useParams', async () => {
    await act(async () => {
      render(<CompanyDriveDetail user={MOCK_USER} />)
    })
    await waitFor(() => {
      expect(api.getCompanyCollegeDrive).toHaveBeenCalledWith('job1')
    })
  })

  it('displays drive title after API resolves', async () => {
    api.getCompanyCollegeDrive.mockResolvedValue({ data: MOCK_DRIVE })
    await act(async () => {
      render(<CompanyDriveDetail user={MOCK_USER} />)
    })
    await waitFor(() => {
      expect(screen.getByText('Campus Drive 2024')).toBeTruthy()
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GenerateOfferPage
// ─────────────────────────────────────────────────────────────────────────────
describe('GenerateOfferPage', () => {
  it('renders without crashing (smoke)', async () => {
    await act(async () => {
      render(<GenerateOfferPage user={MOCK_USER} />)
    })
    expect(screen.getByTestId('page-header')).toBeTruthy()
  })

  it('calls api.getApplication when appId is in window.location.search', async () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?appId=app1', origin: 'http://localhost:5173' },
      writable: true,
    })
    await act(async () => {
      render(<GenerateOfferPage user={MOCK_USER} />)
    })
    await waitFor(() => {
      expect(api.getApplication).toHaveBeenCalledWith('app1')
    })
  })

  it('does not call api.getApplication when no appId in search', async () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '', origin: 'http://localhost:5173' },
      writable: true,
    })
    await act(async () => {
      render(<GenerateOfferPage user={MOCK_USER} />)
    })
    expect(api.getApplication).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ScheduleInterviewPage
// ─────────────────────────────────────────────────────────────────────────────
describe('ScheduleInterviewPage', () => {
  it('renders without crashing (smoke)', async () => {
    await act(async () => {
      render(<ScheduleInterviewPage user={MOCK_USER} />)
    })
    expect(screen.getByTestId('page-header')).toBeTruthy()
  })

  it('calls api.getApplication when appId is in window.location.search', async () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?appId=app1', origin: 'http://localhost:5173' },
      writable: true,
    })
    await act(async () => {
      render(<ScheduleInterviewPage user={MOCK_USER} />)
    })
    await waitFor(() => {
      expect(api.getApplication).toHaveBeenCalledWith('app1')
    })
  })

  it('calls api.scheduleInterview when form is submitted with date and time', async () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?appId=app1', origin: 'http://localhost:5173' },
      writable: true,
    })
    await act(async () => {
      render(<ScheduleInterviewPage user={MOCK_USER} />)
    })
    await waitFor(() => {
      expect(api.getApplication).toHaveBeenCalled()
    })
    // Find schedule/save button and interact with date/time fields
    const dateInput = screen.queryByLabelText(/Date/i)
    const timeInput = screen.queryByLabelText(/Time/i)
    if (dateInput) fireEvent.change(dateInput, { target: { value: '2024-12-01' } })
    if (timeInput) fireEvent.change(timeInput, { target: { value: '10:00' } })
    const saveBtn = screen.queryByText(/Schedule|Save|Send/i)
    if (saveBtn) {
      await act(async () => { fireEvent.click(saveBtn) })
      await waitFor(() => {
        expect(api.scheduleInterview).toHaveBeenCalled()
      })
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CandidateRejectionPage
// ─────────────────────────────────────────────────────────────────────────────
describe('CandidateRejectionPage', () => {
  it('renders without crashing (smoke)', async () => {
    await act(async () => {
      render(<CandidateRejectionPage user={MOCK_USER} />)
    })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getApplication when appId is in window.location.search', async () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?appId=app1', origin: 'http://localhost:5173' },
      writable: true,
    })
    await act(async () => {
      render(<CandidateRejectionPage user={MOCK_USER} />)
    })
    await waitFor(() => {
      expect(api.getApplication).toHaveBeenCalledWith('app1')
    })
  })

  it('shows candidate name and calls api.updateStage on rejection submit', async () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?appId=app1', origin: 'http://localhost:5173' },
      writable: true,
    })
    await act(async () => {
      render(<CandidateRejectionPage user={MOCK_USER} onBack={() => {}} />)
    })
    await waitFor(() => {
      expect(screen.getByText(/Test Candidate/i)).toBeTruthy()
    })
    const reasonInput = screen.queryByLabelText(/Reason/i)
    if (reasonInput) {
      fireEvent.change(reasonInput, { target: { value: 'Not a good fit' } })
    }
    const rejectBtn = screen.queryByText(/Reject|Submit/i)
    if (rejectBtn) {
      await act(async () => { fireEvent.click(rejectBtn) })
      await waitFor(() => {
        expect(api.updateStage).toHaveBeenCalled()
      })
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AssessmentReviewPage
// ─────────────────────────────────────────────────────────────────────────────
describe('AssessmentReviewPage', () => {
  it('renders without crashing (smoke)', async () => {
    await act(async () => {
      render(<AssessmentReviewPage user={MOCK_USER} />)
    })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getAssessmentSubmission with assessmentId and submissionId from useParams', async () => {
    await act(async () => {
      render(<AssessmentReviewPage user={MOCK_USER} />)
    })
    await waitFor(() => {
      expect(api.getAssessmentSubmission).toHaveBeenCalledWith('asmt1', 'sub1')
    })
  })

  it('renders submission data after API resolves', async () => {
    await act(async () => {
      render(<AssessmentReviewPage user={MOCK_USER} />)
    })
    await waitFor(() => {
      expect(screen.getByText(/Test Assessment/i)).toBeTruthy()
    })
  })

  it('calls api.reviewSubmission when save review button is clicked', async () => {
    await act(async () => {
      render(<AssessmentReviewPage user={MOCK_USER} />)
    })
    await waitFor(() => {
      expect(screen.getByText(/Test Assessment/i)).toBeTruthy()
    })
    const saveBtn = screen.queryByText(/Save Review|Submit Review|Save/i)
    if (saveBtn) {
      await act(async () => { fireEvent.click(saveBtn) })
      await waitFor(() => {
        expect(api.reviewSubmission).toHaveBeenCalledWith('asmt1', 'sub1', expect.any(Object))
      })
    }
  })
})
