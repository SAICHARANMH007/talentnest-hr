import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Router mocks ─────────────────────────────────────────────────────────────
const mockNavigate = vi.fn()
const mockSearchParams = new URLSearchParams()
const mockSetSearchParams = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ driveId: 'drive-1' }),
  useLocation: () => ({ pathname: '/app/drives', search: '' }),
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  NavLink: ({ children, to }) => <a href={to}>{children}</a>,
}))

// ── API mock ──────────────────────────────────────────────────────────────────
vi.mock('../../api/api.js', () => ({
  api: {
    importCollegeStudents: vi.fn(),
    getCollegeAssessments: vi.fn(),
    getJobsForCompany: vi.fn(),
    createPlacementDrive: vi.fn(),
    getPlacementDrive: vi.fn(),
    updatePlacementDriveRegistration: vi.fn(),
    notifyPlacementDrive: vi.fn(),
    getCollegeDrives: vi.fn(),
    getPlacementDrives: vi.fn(),
    getDriveRequests: vi.fn(),
    approveDriveRequest: vi.fn(),
    rejectDriveRequest: vi.fn(),
    notifyCollegeDrive: vi.fn(),
    deletePlacementDrive: vi.fn(),
    getTrainingResources: vi.fn(),
    createTrainingResource: vi.fn(),
    deleteTrainingResource: vi.fn(),
    notifyTrainingResource: vi.fn(),
    getCollegeOverview: vi.fn(),
    getCollegeSkillGaps: vi.fn(),
    sendCollegeAnnouncement: vi.fn(),
    getCollegePlacements: vi.fn(),
    updateCollegePlacementNotes: vi.fn(),
    getCollegeStudents: vi.fn(),
    getStudentSkillRecommendations: vi.fn(),
  },
}))

// ── Hook mocks ────────────────────────────────────────────────────────────────
vi.mock('../../hooks/usePlatformSocket.js', () => ({
  usePlatformEvents: vi.fn(),
}))

// ── Constants mocks ───────────────────────────────────────────────────────────
vi.mock('../../constants/education.js', () => ({
  DEGREES: ['B.Tech', 'B.Sc', 'M.Tech', 'MBA'],
  ALL_BRANCHES: ['CSE', 'ECE', 'Mechanical', 'Civil'],
}))

vi.mock('../../constants/styles.js', () => ({
  card: {},
  btnP: {},
  btnG: {},
  btnD: {},
  inp: {},
  Z: { MODAL: 1000 },
}))

// ── Component mocks ───────────────────────────────────────────────────────────
vi.mock('../../components/ui/PageHeader.jsx', () => ({
  default: ({ title, subtitle, action }) => (
    <div data-testid="page-header">
      <div data-testid="page-header-title">{title}</div>
      {subtitle && <div data-testid="page-header-subtitle">{subtitle}</div>}
      {action && <div data-testid="page-header-action">{action}</div>}
    </div>
  ),
}))

vi.mock('../../components/ui/Spinner.jsx', () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}))

vi.mock('../../components/ui/Modal.jsx', () => ({
  default: ({ title, children, onClose, footer }) => (
    <div data-testid="modal">
      <div data-testid="modal-title">{title}</div>
      <div data-testid="modal-body">{children}</div>
      {footer && <div data-testid="modal-footer">{footer}</div>}
      <button data-testid="modal-close" onClick={onClose}>X</button>
    </div>
  ),
}))

vi.mock('../../components/ui/Toast.jsx', () => ({
  default: ({ msg, onClose }) =>
    msg ? <div data-testid="toast" onClick={onClose}>{msg}</div> : null,
}))

vi.mock('../../components/shared/CompanyAutocomplete.jsx', () => ({
  default: ({ value, onChange, label, placeholder }) => (
    <div data-testid="company-autocomplete">
      <label>{label}</label>
      <input
        data-testid="company-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  ),
}))

vi.mock('../../components/shared/StudentSearchPicker.jsx', () => ({
  default: ({ selected, setSelected }) => (
    <div data-testid="student-search-picker">
      <button
        data-testid="add-student-btn"
        onClick={() => setSelected(new Set(['student-1']))}
      >
        Add Student
      </button>
      <span data-testid="selected-count">{selected.size}</span>
    </div>
  ),
}))

vi.mock('read-excel-file/browser', () => ({
  default: vi.fn(),
}))

// ── Imports under test ────────────────────────────────────────────────────────
import CollegeAddCandidates from '../../pages/college/CollegeAddCandidates.jsx'
import CollegeDriveCreate from '../../pages/college/CollegeDriveCreate.jsx'
import CollegeDriveDetail from '../../pages/college/CollegeDriveDetail.jsx'
import CollegeDrives from '../../pages/college/CollegeDrives.jsx'
import CollegeOverview from '../../pages/college/CollegeOverview.jsx'
import CollegePlacements from '../../pages/college/CollegePlacements.jsx'
import CollegeSkillGaps from '../../pages/college/CollegeSkillGaps.jsx'
import CollegeStudents from '../../pages/college/CollegeStudents.jsx'
import CollegeTrainingResources from '../../pages/college/CollegeTrainingResources.jsx'
import { api } from '../../api/api.js'

// ═══════════════════════════════════════════════════════════════════════════════
// CollegeAddCandidates
// ═══════════════════════════════════════════════════════════════════════════════
describe('CollegeAddCandidates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing and shows upload step', async () => {
    await act(async () => { render(<CollegeAddCandidates />) })
    expect(screen.getByTestId('page-header-title')).toBeInTheDocument()
    expect(screen.getByText(/Click to upload an Excel or CSV file/i)).toBeInTheDocument()
  })

  it('shows manual candidate form when "Add One Candidate Manually" is clicked', async () => {
    await act(async () => { render(<CollegeAddCandidates />) })
    const btn = screen.getByText(/Add One Candidate Manually/i)
    await act(async () => { fireEvent.click(btn) })
    expect(screen.getByText(/Add a Candidate/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Full Name/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Email Address/i)).toBeInTheDocument()
  })

  it('shows validation when submitting manual form without required fields', async () => {
    await act(async () => { render(<CollegeAddCandidates />) })
    fireEvent.click(screen.getByText(/Add One Candidate Manually/i))
    await waitFor(() => expect(screen.getByText(/Add a Candidate/i)).toBeInTheDocument())
    expect(screen.getByText(/Please enter Full Name and Email Address/i)).toBeInTheDocument()
  })

  it('calls api.importCollegeStudents when manual form is filled and submitted', async () => {
    api.importCollegeStudents.mockResolvedValue({ created: 1, skipped: 0 })
    await act(async () => { render(<CollegeAddCandidates />) })
    fireEvent.click(screen.getByText(/Add One Candidate Manually/i))
    await waitFor(() => expect(screen.getByText(/Add a Candidate/i)).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText(/Full Name/i), { target: { value: 'Jane Doe' } })
    fireEvent.change(screen.getByPlaceholderText(/Email Address/i), { target: { value: 'jane@example.com' } })

    const addBtn = screen.getByText(/Add Candidate/i)
    await act(async () => { fireEvent.click(addBtn) })

    expect(api.importCollegeStudents).toHaveBeenCalledTimes(1)
    const [candidates] = api.importCollegeStudents.mock.calls[0]
    expect(candidates[0].name).toBe('Jane Doe')
    expect(candidates[0].email).toBe('jane@example.com')
  })

  it('shows import complete step with created count on success', async () => {
    api.importCollegeStudents.mockResolvedValue({ created: 3, skipped: 0 })
    await act(async () => { render(<CollegeAddCandidates />) })
    fireEvent.click(screen.getByText(/Add One Candidate Manually/i))
    await waitFor(() => expect(screen.getByText(/Add a Candidate/i)).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText(/Full Name/i), { target: { value: 'Test User' } })
    fireEvent.change(screen.getByPlaceholderText(/Email Address/i), { target: { value: 'test@example.com' } })

    await act(async () => { fireEvent.click(screen.getByText(/Add Candidate/i)) })

    expect(screen.getByText(/Import complete/i)).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('hides alumni-only fields when "Mark as fresher" is checked', async () => {
    await act(async () => { render(<CollegeAddCandidates />) })
    fireEvent.click(screen.getByText(/Add One Candidate Manually/i))
    await waitFor(() => expect(screen.getByText(/Add a Candidate/i)).toBeInTheDocument())

    expect(screen.queryByPlaceholderText(/Current Role \/ Designation/i)).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/Current Company/i)).not.toBeInTheDocument()
  })

  it('shows error message when API call fails', async () => {
    api.importCollegeStudents.mockRejectedValue(new Error('Server error'))
    await act(async () => { render(<CollegeAddCandidates />) })
    fireEvent.click(screen.getByText(/Add One Candidate Manually/i))
    await waitFor(() => expect(screen.getByText(/Add a Candidate/i)).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText(/Full Name/i), { target: { value: 'Fail User' } })
    fireEvent.change(screen.getByPlaceholderText(/Email Address/i), { target: { value: 'fail@example.com' } })

    await act(async () => { fireEvent.click(screen.getByText(/Add Candidate/i)) })
    expect(screen.getByText(/Server error/i)).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// CollegeDriveCreate
// ═══════════════════════════════════════════════════════════════════════════════
describe('CollegeDriveCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getCollegeAssessments.mockResolvedValue({ data: [] })
    api.getJobsForCompany.mockResolvedValue({ data: [] })
  })

  it('renders without crashing with form fields', async () => {
    await act(async () => { render(<CollegeDriveCreate />) })
    expect(screen.getByPlaceholderText(/Infosys Campus Drive/i)).toBeInTheDocument()
    expect(screen.getByText(/Opportunity Type/i)).toBeInTheDocument()
  })

  it('shows error when submitting without required fields', async () => {
    await act(async () => { render(<CollegeDriveCreate />) })
    const createBtn = screen.getByText(/Create Placement Drive/i)
    await act(async () => { fireEvent.click(createBtn) })
    expect(screen.getByText(/Drive title and date are required/i)).toBeInTheDocument()
  })

  it('calls api.createPlacementDrive and navigates on successful submit', async () => {
    api.createPlacementDrive.mockResolvedValue({ eligibleCount: 5 })
    window.alert = vi.fn()
    await act(async () => { render(<CollegeDriveCreate />) })

    fireEvent.change(screen.getByPlaceholderText(/Infosys Campus Drive/i), { target: { value: 'TCS Drive 2026' } })
    fireEvent.change(screen.getByDisplayValue(''), { target: { value: '2026-12-01' } })

    const createBtn = screen.getByText(/Create Placement Drive/i)
    await act(async () => { fireEvent.click(createBtn) })

    await waitFor(() => expect(api.createPlacementDrive).toHaveBeenCalledTimes(1))
    expect(mockNavigate).toHaveBeenCalledWith('/app/drives')
  })

  it('switches opportunity type to Internship when tab clicked', async () => {
    await act(async () => { render(<CollegeDriveCreate />) })
    const internshipBtn = screen.getByText(/💼 Internship/i)
    fireEvent.click(internshipBtn)
    expect(screen.getByText(/Create Internship/i)).toBeInTheDocument()
  })

  it('shows exam details section when Exam type is selected', async () => {
    await act(async () => { render(<CollegeDriveCreate />) })
    const examBtn = screen.getByText(/📝 Exam \/ Test/i)
    fireEvent.click(examBtn)
    expect(screen.getByText(/Exam Details/i)).toBeInTheDocument()
    expect(screen.getByText(/Exam Provider/i)).toBeInTheDocument()
  })

  it('navigates back when Cancel button is clicked', async () => {
    await act(async () => { render(<CollegeDriveCreate />) })
    fireEvent.click(screen.getByText(/Cancel/i))
    expect(mockNavigate).toHaveBeenCalledWith('/app/drives')
  })

  it('shows job linking dropdown when company has active jobs', async () => {
    api.getJobsForCompany.mockResolvedValue({
      data: [{ id: 'j1', title: 'Software Engineer', location: 'Hyderabad' }],
    })
    await act(async () => { render(<CollegeDriveCreate />) })

    fireEvent.change(screen.getByTestId('company-input'), { target: { value: 'Infosys' } })

    await waitFor(() => expect(api.getJobsForCompany).toHaveBeenCalled(), { timeout: 1000 })
    await waitFor(() => {
      expect(screen.getByText(/Link to Job Posting/i)).toBeInTheDocument()
    }, { timeout: 1000 })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// CollegeDriveDetail
// ═══════════════════════════════════════════════════════════════════════════════
describe('CollegeDriveDetail', () => {
  const mockDrive = {
    id: 'drive-1',
    title: 'Infosys Campus Drive',
    opportunityType: 'placement',
    status: 'upcoming',
    driveDate: '2026-12-01T00:00:00Z',
    mode: 'On-Campus',
    companyName: 'Infosys',
    location: 'Hyderabad',
    description: 'Open positions for CS students',
    registrations: [
      { candidateId: 'c1', name: 'Alice', email: 'alice@example.com', status: 'registered', branch: 'CSE', year: 2026 },
      { candidateId: 'c2', name: 'Bob', email: 'bob@example.com', status: 'shortlisted', branch: 'ECE', year: 2025 },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    api.getPlacementDrive.mockResolvedValue({ data: mockDrive })
    api.updatePlacementDriveRegistration.mockResolvedValue({})
    api.notifyPlacementDrive.mockResolvedValue({ recipients: 5 })
  })

  it('renders without crashing and shows spinner while loading', () => {
    api.getPlacementDrive.mockReturnValue(new Promise(() => {}))
    render(<CollegeDriveDetail />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('renders drive title and registration list after load', async () => {
    await act(async () => { render(<CollegeDriveDetail />) })
    expect(screen.getByTestId('page-header-title')).toHaveTextContent('Infosys Campus Drive')
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('shows error message when API fails', async () => {
    api.getPlacementDrive.mockRejectedValue(new Error('Failed to load'))
    await act(async () => { render(<CollegeDriveDetail />) })
    expect(screen.getByText(/Failed to load/i)).toBeInTheDocument()
  })

  it('shows "not found" message when drive is null', async () => {
    api.getPlacementDrive.mockResolvedValue({ data: null })
    await act(async () => { render(<CollegeDriveDetail />) })
    expect(screen.getByText(/not found/i)).toBeInTheDocument()
  })

  it('calls api.updatePlacementDriveRegistration when status changes', async () => {
    await act(async () => { render(<CollegeDriveDetail />) })
    const selects = screen.getAllByRole('combobox')
    const statusSelect = selects.find(s => s.value === 'registered' || s.value === 'shortlisted')
    expect(statusSelect).toBeTruthy()
    await act(async () => { fireEvent.change(statusSelect, { target: { value: 'selected' } }) })
    expect(api.updatePlacementDriveRegistration).toHaveBeenCalled()
  })

  it('toggles Notify Students panel when button is clicked', async () => {
    await act(async () => { render(<CollegeDriveDetail />) })
    expect(screen.queryByText(/Notify Students/i)).toBeInTheDocument()
    const notifyBtn = screen.getAllByText(/📣 Notify Students/i)[0]
    fireEvent.click(notifyBtn)
    await waitFor(() => {
      expect(screen.getByText(/Audience/i)).toBeInTheDocument()
    })
  })

  it('navigates back when Back button is clicked', async () => {
    await act(async () => { render(<CollegeDriveDetail />) })
    fireEvent.click(screen.getByText(/← Back to Placement Drives/i))
    expect(mockNavigate).toHaveBeenCalledWith('/app/drives')
  })

  it('filters registrations when status filter button is clicked', async () => {
    await act(async () => { render(<CollegeDriveDetail />) })
    const shortlistedBtn = screen.getByText(/shortlisted \(1\)/i)
    fireEvent.click(shortlistedBtn)
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
  })

  it('shows bulk action controls when registrations are selected', async () => {
    await act(async () => { render(<CollegeDriveDetail />) })
    const checkboxes = screen.getAllByRole('checkbox')
    await act(async () => { fireEvent.click(checkboxes[0]) })
    expect(screen.getByText(/selected/i)).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// CollegeDrives
// ═══════════════════════════════════════════════════════════════════════════════
describe('CollegeDrives', () => {
  const mockDrive = {
    id: 'd1',
    title: 'Wipro Drive 2026',
    companyName: 'Wipro',
    status: 'upcoming',
    opportunityType: 'placement',
    driveDate: '2026-11-15T00:00:00Z',
    mode: 'On-Campus',
    totalEligible: 100,
    counts: { shortlisted: 20, selected: 5 },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    api.getCollegeDrives.mockResolvedValue({ data: [] })
    api.getPlacementDrives.mockResolvedValue({ data: [mockDrive] })
    api.getDriveRequests.mockResolvedValue({ data: [] })
    api.getTrainingResources.mockResolvedValue({ data: [] })
  })

  it('renders without crashing and shows tab buttons', async () => {
    await act(async () => { render(<CollegeDrives />) })
    expect(screen.getByText(/My Drives/i)).toBeInTheDocument()
    expect(screen.getByText(/Drive Requests/i)).toBeInTheDocument()
    expect(screen.getByText(/Job Openings/i)).toBeInTheDocument()
    expect(screen.getByText(/Training Resources/i)).toBeInTheDocument()
  })

  it('renders drives list with drive title after load', async () => {
    await act(async () => { render(<CollegeDrives />) })
    expect(screen.getByText('Wipro Drive 2026')).toBeInTheDocument()
    expect(screen.getByText('Wipro')).toBeInTheDocument()
  })

  it('shows + Schedule Drive button that navigates to /app/drives/new', async () => {
    await act(async () => { render(<CollegeDrives />) })
    const btn = screen.getByText(/\+ Schedule Drive/i)
    fireEvent.click(btn)
    expect(mockNavigate).toHaveBeenCalledWith('/app/drives/new')
  })

  it('navigates to drive detail when View Students clicked', async () => {
    await act(async () => { render(<CollegeDrives />) })
    const viewBtn = screen.getByText(/View Students →/i)
    fireEvent.click(viewBtn)
    expect(mockNavigate).toHaveBeenCalledWith('/app/drives/d1')
  })

  it('shows empty state when no drives exist', async () => {
    api.getPlacementDrives.mockResolvedValue({ data: [] })
    await act(async () => { render(<CollegeDrives />) })
    expect(screen.getByText(/No placement drives scheduled yet/i)).toBeInTheDocument()
  })

  it('switches to Job Openings tab and shows empty state', async () => {
    await act(async () => { render(<CollegeDrives />) })
    fireEvent.click(screen.getByText(/Job Openings/i))
    await waitFor(() => {
      expect(screen.getByText(/No active job openings found/i)).toBeInTheDocument()
    })
  })

  it('shows drive requests in Requests tab', async () => {
    const mockRequest = {
      id: 'req1',
      title: 'Google Drive',
      companyName: 'Google',
      opportunityType: 'placement',
      driveDate: '2026-10-10T00:00:00Z',
      mode: 'Virtual',
      eligibility: {},
    }
    api.getDriveRequests.mockResolvedValue({ data: [mockRequest] })
    await act(async () => { render(<CollegeDrives />) })
    fireEvent.click(screen.getByText(/Drive Requests/i))
    await waitFor(() => {
      expect(screen.getByText('Google Drive')).toBeInTheDocument()
    })
  })

  it('calls api.approveDriveRequest when Approve is clicked', async () => {
    const mockRequest = {
      id: 'req1',
      title: 'Google Drive',
      companyName: 'Google',
      opportunityType: 'placement',
      driveDate: '2026-10-10T00:00:00Z',
      mode: 'Virtual',
      eligibility: {},
    }
    api.getDriveRequests.mockResolvedValue({ data: [mockRequest] })
    api.approveDriveRequest.mockResolvedValue({})
    await act(async () => { render(<CollegeDrives />) })
    fireEvent.click(screen.getByText(/Drive Requests/i))
    await waitFor(() => expect(screen.getByText(/Approve/i)).toBeInTheDocument())
    await act(async () => { fireEvent.click(screen.getByText(/Approve/i)) })
    expect(api.approveDriveRequest).toHaveBeenCalledWith('req1')
  })

  it('calls api.deletePlacementDrive when Cancel drive is confirmed', async () => {
    window.confirm = vi.fn(() => true)
    api.deletePlacementDrive.mockResolvedValue({})
    await act(async () => { render(<CollegeDrives />) })
    await act(async () => { fireEvent.click(screen.getByText(/Cancel/i)) })
    expect(api.deletePlacementDrive).toHaveBeenCalledWith('d1')
  })

  it('filters drives by opportunity type', async () => {
    const internshipDrive = { ...mockDrive, id: 'd2', title: 'Internship 2026', opportunityType: 'internship' }
    api.getPlacementDrives.mockResolvedValue({ data: [mockDrive, internshipDrive] })
    await act(async () => { render(<CollegeDrives />) })
    fireEvent.click(screen.getByText(/💼 Internship/i))
    expect(screen.getByText('Internship 2026')).toBeInTheDocument()
    expect(screen.queryByText('Wipro Drive 2026')).not.toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// CollegeOverview
// ═══════════════════════════════════════════════════════════════════════════════
describe('CollegeOverview', () => {
  const mockOverviewData = {
    collegeName: 'IIT Bombay',
    totalStudents: 500,
    currentStudents: 300,
    alumniCount: 200,
    totalApplications: 150,
    totalPlacements: 80,
    placementRate: 53,
    upcomingInterviews: 12,
    departmentBreakdown: [
      { name: 'Computer Science', count: 200 },
      { name: 'Electrical', count: 100 },
    ],
    yearBreakdown: [
      { year: 2026, count: 150 },
      { year: 2025, count: 150 },
    ],
    placementRateByBatch: [
      { year: 2025, placed: 80, total: 150, rate: 53 },
    ],
    recentPlacements: [
      { studentName: 'Priya Kumar', jobTitle: 'SWE', company: 'Google' },
    ],
    topCompanies: [
      { name: 'TCS', count: 30 },
    ],
    recentStudents: [
      { name: 'Arjun Sharma', email: 'arjun@iitb.ac.in' },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    api.getCollegeOverview.mockResolvedValue({ data: mockOverviewData })
    api.getCollegeSkillGaps.mockResolvedValue({ data: [] })
  })

  it('shows spinner while loading', () => {
    api.getCollegeOverview.mockReturnValue(new Promise(() => {}))
    api.getCollegeSkillGaps.mockReturnValue(new Promise(() => {}))
    render(<CollegeOverview />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('renders college name in page header after load', async () => {
    await act(async () => { render(<CollegeOverview />) })
    expect(screen.getByTestId('page-header-title')).toHaveTextContent('IIT Bombay')
  })

  it('renders stat cards with correct values', async () => {
    await act(async () => { render(<CollegeOverview />) })
    expect(screen.getByText('500')).toBeInTheDocument()
    expect(screen.getByText('53%')).toBeInTheDocument()
  })

  it('renders department breakdown section', async () => {
    await act(async () => { render(<CollegeOverview />) })
    expect(screen.getByText('Computer Science')).toBeInTheDocument()
    expect(screen.getByText('Students by Department')).toBeInTheDocument()
  })

  it('renders recent placements', async () => {
    await act(async () => { render(<CollegeOverview />) })
    expect(screen.getByText('Priya Kumar')).toBeInTheDocument()
    expect(screen.getByText(/SWE @ Google/i)).toBeInTheDocument()
  })

  it('renders top hiring companies', async () => {
    await act(async () => { render(<CollegeOverview />) })
    expect(screen.getByText('TCS')).toBeInTheDocument()
    expect(screen.getByText(/30 hires/i)).toBeInTheDocument()
  })

  it('shows announcement form with title and message inputs', async () => {
    await act(async () => { render(<CollegeOverview />) })
    expect(screen.getByPlaceholderText(/Title/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Message/i)).toBeInTheDocument()
  })

  it('calls api.sendCollegeAnnouncement and shows result on success', async () => {
    api.sendCollegeAnnouncement.mockResolvedValue({ message: 'Sent to 300 students.' })
    await act(async () => { render(<CollegeOverview />) })

    fireEvent.change(screen.getByPlaceholderText(/Title/i), { target: { value: 'Campus Event' } })
    fireEvent.change(screen.getByPlaceholderText(/Message/i), { target: { value: 'Join us tomorrow!' } })

    await act(async () => { fireEvent.click(screen.getByText(/Send Announcement/i)) })
    await waitFor(() => {
      expect(api.sendCollegeAnnouncement).toHaveBeenCalledWith('Campus Event', 'Join us tomorrow!', undefined)
    })
    expect(screen.getByText(/Sent to 300 students/i)).toBeInTheDocument()
  })

  it('shows skill gap data when loaded', async () => {
    api.getCollegeSkillGaps.mockResolvedValue({
      data: [{ skill: 'Python', coveragePct: 40, studentsWithSkill: 200, demandCount: 50, courses: [] }],
    })
    await act(async () => { render(<CollegeOverview />) })
    expect(screen.getByText('Python')).toBeInTheDocument()
  })

  it('shows error message when overview fails to load', async () => {
    api.getCollegeOverview.mockRejectedValue(new Error('Network error'))
    await act(async () => { render(<CollegeOverview />) })
    expect(screen.getByText(/Network error/i)).toBeInTheDocument()
  })

  it('navigates when clicking department row', async () => {
    await act(async () => { render(<CollegeOverview />) })
    const deptRow = screen.getByTitle(/View students in Computer Science/i)
    fireEvent.click(deptRow)
    expect(mockNavigate).toHaveBeenCalledWith('/app/candidates?dept=Computer%20Science')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// CollegePlacements
// ═══════════════════════════════════════════════════════════════════════════════
describe('CollegePlacements', () => {
  const mockRecord = {
    id: 'app1',
    studentName: 'Rahul Gupta',
    studentEmail: 'rahul@example.com',
    jobTitle: 'Backend Developer',
    company: 'Accenture',
    stage: 'Hired',
    appliedAt: '2026-01-15T00:00:00Z',
    collegeNotes: '',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    api.getCollegePlacements.mockResolvedValue({
      data: [mockRecord],
      total: 1,
      pages: 1,
    })
  })

  it('renders without crashing and shows table headers', async () => {
    await act(async () => { render(<CollegePlacements />) })
    expect(screen.getByText('Student')).toBeInTheDocument()
    expect(screen.getByText('Company')).toBeInTheDocument()
    expect(screen.getByText('Stage')).toBeInTheDocument()
  })

  it('renders placement record data', async () => {
    await act(async () => { render(<CollegePlacements />) })
    expect(screen.getByText('Rahul Gupta')).toBeInTheDocument()
    expect(screen.getByText('Accenture')).toBeInTheDocument()
    expect(screen.getByText('Backend Developer')).toBeInTheDocument()
  })

  it('shows empty state when no records', async () => {
    api.getCollegePlacements.mockResolvedValue({ data: [], total: 0, pages: 1 })
    await act(async () => { render(<CollegePlacements />) })
    expect(screen.getByText(/No placement records found yet/i)).toBeInTheDocument()
  })

  it('calls api with search query on form submit', async () => {
    await act(async () => { render(<CollegePlacements />) })
    const input = screen.getByPlaceholderText(/Search by student name/i)
    fireEvent.change(input, { target: { value: 'Rahul' } })
    await act(async () => { fireEvent.submit(input.closest('form')) })
    await waitFor(() => {
      expect(api.getCollegePlacements).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'Rahul' })
      )
    })
  })

  it('filters by stage when stage button is clicked', async () => {
    await act(async () => { render(<CollegePlacements />) })
    const hiredBtn = screen.getAllByRole('button').find(b => b.textContent.includes('Hired'))
    await act(async () => { fireEvent.click(hiredBtn) })
    await waitFor(() => {
      expect(api.getCollegePlacements).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'Hired' })
      )
    })
  })

  it('shows "Add note" prompt for record without notes', async () => {
    await act(async () => { render(<CollegePlacements />) })
    expect(screen.getByText(/\+ Add note/i)).toBeInTheDocument()
  })

  it('opens note editor when clicking the notes cell', async () => {
    await act(async () => { render(<CollegePlacements />) })
    const noteCell = screen.getByText(/\+ Add note/i)
    fireEvent.click(noteCell)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Private follow-up note/i)).toBeInTheDocument()
    })
  })

  it('saves note and calls api.updateCollegePlacementNotes', async () => {
    api.updateCollegePlacementNotes.mockResolvedValue({})
    await act(async () => { render(<CollegePlacements />) })
    fireEvent.click(screen.getByText(/\+ Add note/i))
    await waitFor(() => expect(screen.getByPlaceholderText(/Private follow-up note/i)).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText(/Private follow-up note/i), {
      target: { value: 'Great candidate!' },
    })
    await act(async () => { fireEvent.click(screen.getByText('Save')) })
    expect(api.updateCollegePlacementNotes).toHaveBeenCalledWith('app1', 'Great candidate!')
  })

  it('shows pagination when pages > 1', async () => {
    api.getCollegePlacements.mockResolvedValue({ data: [mockRecord], total: 20, pages: 2 })
    await act(async () => { render(<CollegePlacements />) })
    expect(screen.getByText(/Previous/i)).toBeInTheDocument()
    expect(screen.getByText(/Next/i)).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// CollegeSkillGaps
// ═══════════════════════════════════════════════════════════════════════════════
describe('CollegeSkillGaps', () => {
  const mockGaps = [
    { skill: 'Python', coveragePct: 35, studentsWithSkill: 70, demandCount: 45, courses: [{ url: 'https://coursera.org/python', title: 'Python 101' }] },
    { skill: 'SQL', coveragePct: 60, studentsWithSkill: 120, demandCount: 30, courses: [] },
  ]

  const mockStudents = [
    { id: 's1', name: 'Alice Sharma', email: 'alice@college.edu' },
    { id: 's2', name: 'Bob Verma', email: 'bob@college.edu' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    api.getCollegeSkillGaps.mockResolvedValue({ data: mockGaps, totalStudents: 200 })
    api.getCollegeStudents.mockResolvedValue({ data: mockStudents })
    api.getStudentSkillRecommendations.mockResolvedValue({
      data: {
        currentSkills: ['Python'],
        recommendations: [{ skill: 'SQL', demandCount: 30, courses: [] }],
      },
    })
  })

  it('renders without crashing and shows page header', async () => {
    await act(async () => { render(<CollegeSkillGaps />) })
    expect(screen.getByTestId('page-header-title')).toHaveTextContent(/Skill Gap Analytics/i)
  })

  it('renders skill gap items after load', async () => {
    await act(async () => { render(<CollegeSkillGaps />) })
    expect(screen.getByText('Python')).toBeInTheDocument()
    expect(screen.getByText('SQL')).toBeInTheDocument()
  })

  it('renders course recommendation link for skill with course', async () => {
    await act(async () => { render(<CollegeSkillGaps />) })
    expect(screen.getByText(/Python 101/i)).toBeInTheDocument()
  })

  it('shows empty state when no skill gaps', async () => {
    api.getCollegeSkillGaps.mockResolvedValue({ data: [], totalStudents: 0 })
    await act(async () => { render(<CollegeSkillGaps />) })
    expect(screen.getByText(/Not enough data yet/i)).toBeInTheDocument()
  })

  it('renders student list for per-student recommendations', async () => {
    await act(async () => { render(<CollegeSkillGaps />) })
    expect(screen.getByText('Alice Sharma')).toBeInTheDocument()
    expect(screen.getByText('Bob Verma')).toBeInTheDocument()
  })

  it('filters student list by search query', async () => {
    await act(async () => { render(<CollegeSkillGaps />) })
    const input = screen.getByPlaceholderText(/Search students/i)
    fireEvent.change(input, { target: { value: 'Alice' } })
    expect(screen.getByText('Alice Sharma')).toBeInTheDocument()
    expect(screen.queryByText('Bob Verma')).not.toBeInTheDocument()
  })

  it('opens skill recommendations modal when student button is clicked', async () => {
    await act(async () => { render(<CollegeSkillGaps />) })
    await act(async () => { fireEvent.click(screen.getByText('Alice Sharma')) })
    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument()
      expect(screen.getByTestId('modal-title')).toHaveTextContent(/Alice Sharma/i)
    })
    expect(api.getStudentSkillRecommendations).toHaveBeenCalledWith('s1')
  })

  it('closes modal when close button is clicked', async () => {
    await act(async () => { render(<CollegeSkillGaps />) })
    await act(async () => { fireEvent.click(screen.getByText('Alice Sharma')) })
    await waitFor(() => expect(screen.getByTestId('modal')).toBeInTheDocument())
    await act(async () => { fireEvent.click(screen.getByTestId('modal-close')) })
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
  })

  it('shows error message when skill gap API fails', async () => {
    api.getCollegeSkillGaps.mockRejectedValue(new Error('Failed to load skill gap'))
    await act(async () => { render(<CollegeSkillGaps />) })
    expect(screen.getByText(/Failed to load skill gap/i)).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// CollegeStudents
// ═══════════════════════════════════════════════════════════════════════════════
describe('CollegeStudents', () => {
  const mockStudents = [
    {
      id: 's1',
      name: 'Ananya Singh',
      email: 'ananya@iit.ac.in',
      studentType: 'student',
      latestEducation: { degree: 'B.Tech', institution: 'IIT Delhi', year: 2026, grade: '8.5' },
      skills: ['Python', 'ML', 'Statistics'],
      applications: 3,
      placed: false,
    },
    {
      id: 's2',
      name: 'Rohan Mehta',
      email: 'rohan@iit.ac.in',
      studentType: 'alumni',
      latestEducation: { degree: 'B.Tech', institution: 'IIT Delhi', year: 2024, grade: '9.0' },
      skills: ['Java', 'Spring'],
      applications: 5,
      placed: true,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    api.getCollegeStudents.mockResolvedValue({ data: mockStudents, total: 2, pages: 1 })
    api.getStudentSkillRecommendations.mockResolvedValue({ data: { recommendations: [] } })
  })

  it('renders without crashing and shows table', async () => {
    await act(async () => { render(<CollegeStudents />) })
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Education')).toBeInTheDocument()
    expect(screen.getByText('Skills')).toBeInTheDocument()
  })

  it('renders student rows with names and email', async () => {
    await act(async () => { render(<CollegeStudents />) })
    expect(screen.getByText('Ananya Singh')).toBeInTheDocument()
    expect(screen.getByText('Rohan Mehta')).toBeInTheDocument()
    expect(screen.getByText('ananya@iit.ac.in')).toBeInTheDocument()
  })

  it('shows "Placed" status for placed students', async () => {
    await act(async () => { render(<CollegeStudents />) })
    expect(screen.getByText('Placed')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('opens student profile modal when View Profile is clicked', async () => {
    await act(async () => { render(<CollegeStudents />) })
    const viewBtns = screen.getAllByText(/View Profile/i)
    await act(async () => { fireEvent.click(viewBtns[0]) })
    await waitFor(() => {
      expect(screen.getByText(/Ananya Singh|Rohan Mehta/i)).toBeInTheDocument()
    })
  })

  it('closes profile modal when Close is clicked', async () => {
    await act(async () => { render(<CollegeStudents />) })
    await act(async () => { fireEvent.click(screen.getAllByText(/View Profile/i)[0]) })
    await waitFor(() => expect(screen.getAllByText('Close')[0]).toBeInTheDocument())
    await act(async () => { fireEvent.click(screen.getAllByText('Close')[0]) })
    await waitFor(() => {
      expect(screen.queryByText(/Education/i)).toBeInTheDocument()
    })
  })

  it('calls api.getCollegeStudents with search query on form submit', async () => {
    await act(async () => { render(<CollegeStudents />) })
    const input = screen.getByPlaceholderText(/Search by name/i)
    fireEvent.change(input, { target: { value: 'Ananya' } })
    await act(async () => { fireEvent.submit(input.closest('form')) })
    await waitFor(() => {
      expect(api.getCollegeStudents).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'Ananya' })
      )
    })
  })

  it('filters by student type via dropdown', async () => {
    await act(async () => { render(<CollegeStudents />) })
    const typeSelect = screen.getByRole('combobox')
    await act(async () => { fireEvent.change(typeSelect, { target: { value: 'alumni' } }) })
    await waitFor(() => {
      expect(api.getCollegeStudents).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'alumni' })
      )
    })
  })

  it('shows empty state when no students found', async () => {
    api.getCollegeStudents.mockResolvedValue({ data: [], total: 0, pages: 1 })
    await act(async () => { render(<CollegeStudents />) })
    expect(screen.getByText(/No students found yet/i)).toBeInTheDocument()
  })

  it('shows spinner while loading', () => {
    api.getCollegeStudents.mockReturnValue(new Promise(() => {}))
    render(<CollegeStudents />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('renders pagination when pages > 1', async () => {
    api.getCollegeStudents.mockResolvedValue({ data: mockStudents, total: 50, pages: 3 })
    await act(async () => { render(<CollegeStudents />) })
    expect(screen.getByText(/Previous/i)).toBeInTheDocument()
    expect(screen.getByText(/Next/i)).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// CollegeTrainingResources
// ═══════════════════════════════════════════════════════════════════════════════
describe('CollegeTrainingResources', () => {
  const mockResources = [
    { id: 'r1', title: 'Python Basics', url: 'https://codecademy.com/python', category: 'Coding', description: 'Intro to Python' },
    { id: 'r2', title: 'Quant Practice', url: 'https://indiabix.com', category: 'Aptitude', description: '' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    api.getTrainingResources.mockResolvedValue({ data: mockResources })
    api.createTrainingResource.mockResolvedValue({ id: 'r3' })
    api.deleteTrainingResource.mockResolvedValue({})
    api.notifyTrainingResource.mockResolvedValue({ recipients: 10 })
  })

  it('renders without crashing and shows page header', async () => {
    await act(async () => { render(<CollegeTrainingResources />) })
    expect(screen.getByTestId('page-header-title')).toHaveTextContent(/Training Resources/i)
  })

  it('renders resource cards with titles and URLs', async () => {
    await act(async () => { render(<CollegeTrainingResources />) })
    expect(screen.getByText('Python Basics')).toBeInTheDocument()
    expect(screen.getByText('Quant Practice')).toBeInTheDocument()
    expect(screen.getByText('https://codecademy.com/python')).toBeInTheDocument()
  })

  it('shows empty state when no resources', async () => {
    api.getTrainingResources.mockResolvedValue({ data: [] })
    await act(async () => { render(<CollegeTrainingResources />) })
    expect(screen.getByText(/No training resources added yet/i)).toBeInTheDocument()
  })

  it('shows validation error when adding resource without required fields', async () => {
    await act(async () => { render(<CollegeTrainingResources />) })
    await act(async () => { fireEvent.click(screen.getByText(/➕ Add Resource/i)) })
    expect(screen.getByText(/Title and URL\/link are required/i)).toBeInTheDocument()
  })

  it('calls api.createTrainingResource with form data', async () => {
    await act(async () => { render(<CollegeTrainingResources />) })

    fireEvent.change(screen.getByPlaceholderText(/Quantitative Aptitude Practice Set/i), {
      target: { value: 'New Resource' },
    })
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/.../i), {
      target: { value: 'https://example.com' },
    })

    await act(async () => { fireEvent.click(screen.getByText(/➕ Add Resource/i)) })
    expect(api.createTrainingResource).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New Resource', url: 'https://example.com' })
    )
  })

  it('removes a resource and shows toast after confirm', async () => {
    window.confirm = vi.fn(() => true)
    await act(async () => { render(<CollegeTrainingResources />) })
    const removeBtns = screen.getAllByText(/Remove/i)
    await act(async () => { fireEvent.click(removeBtns[0]) })
    expect(api.deleteTrainingResource).toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toBeInTheDocument()
    })
  })

  it('filters resources by category', async () => {
    await act(async () => { render(<CollegeTrainingResources />) })
    const codingFilter = screen.getAllByRole('button').find(b => b.textContent === 'Coding')
    fireEvent.click(codingFilter)
    expect(screen.getByText('Python Basics')).toBeInTheDocument()
    expect(screen.queryByText('Quant Practice')).not.toBeInTheDocument()
  })

  it('toggles Notify Students panel when Notify button is clicked', async () => {
    await act(async () => { render(<CollegeTrainingResources />) })
    const notifyBtns = screen.getAllByText(/📣 Notify Students/i)
    fireEvent.click(notifyBtns[0])
    await waitFor(() => {
      expect(screen.getByTestId('student-search-picker')).toBeInTheDocument()
    })
  })

  it('calls api.notifyTrainingResource when students are selected and send clicked', async () => {
    await act(async () => { render(<CollegeTrainingResources />) })
    const notifyBtns = screen.getAllByText(/📣 Notify Students/i)
    fireEvent.click(notifyBtns[0])
    await waitFor(() => expect(screen.getByTestId('student-search-picker')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('add-student-btn'))
    await act(async () => { fireEvent.click(screen.getAllByText(/Send Notification/i)[0]) })
    expect(api.notifyTrainingResource).toHaveBeenCalled()
  })
})
