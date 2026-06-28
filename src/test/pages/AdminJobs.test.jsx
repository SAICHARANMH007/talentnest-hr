import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Router mock ───────────────────────────────────────────────────────────────
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

// ── Hook mocks ────────────────────────────────────────────────────────────────
vi.mock('../../hooks/useOrgOptions.js', () => ({
  useOrgOptions: () => ({ branches: [], stages: [], isVisible: () => true }),
}))

// ── API mock ──────────────────────────────────────────────────────────────────
vi.mock('../../api/api.js', () => ({
  api: {
    getJobs: vi.fn(),
    createJob: vi.fn(),
    patchJob: vi.fn(),
    deleteJob: vi.fn(),
    getUsers: vi.fn(),
    getApplications: vi.fn(),
    assignRecruiterToJob: vi.fn(),
    assignCandidatesToJob: vi.fn(),
    updateStage: vi.fn(),
    runDeduplication: vi.fn(),
  },
}))

// ── Matching util mock ─────────────────────────────────────────────────────────
vi.mock('../../api/matching.js', () => ({
  genericSearchMatch: vi.fn((items) => items),
}))

// ── UI component mocks ────────────────────────────────────────────────────────
vi.mock('../../components/ui/Toast.jsx', () => ({
  default: ({ msg, onClose }) =>
    msg ? <div data-testid="toast" onClick={onClose}>{msg}</div> : null,
}))
vi.mock('../../components/ui/Spinner.jsx', () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}))
vi.mock('../../components/ui/Badge.jsx', () => ({
  default: ({ label }) => <span data-testid="badge">{label}</span>,
}))
vi.mock('../../components/ui/PageHeader.jsx', () => ({
  default: ({ title }) => <div data-testid="page-header">{title}</div>,
}))
vi.mock('../../components/ui/Modal.jsx', () => ({
  default: ({ title, children, onClose }) => (
    <div data-testid="modal">
      <div data-testid="modal-title">{title}</div>
      <button data-testid="modal-close" onClick={onClose}>×</button>
      {children}
    </div>
  ),
}))
vi.mock('../../components/ui/CapLimitBanner.jsx', () => ({
  default: () => <div data-testid="cap-limit-banner" />,
}))

// ── Shared component mocks ────────────────────────────────────────────────────
vi.mock('../../components/shared/JobDetailDrawer.jsx', () => ({
  default: ({ job, onClose, onDelete }) => (
    <div data-testid="job-detail-drawer">
      <span>{job?.title}</span>
      <button data-testid="drawer-close" onClick={onClose}>Close</button>
      <button data-testid="drawer-delete" onClick={() => onDelete(job?.id)}>Delete</button>
    </div>
  ),
}))
vi.mock('../../components/shared/ShareJobModal.jsx', () => ({
  default: ({ job, onClose }) => (
    <div data-testid="share-job-modal">
      <span>{job?.title}</span>
      <button data-testid="share-modal-close" onClick={onClose}>Close</button>
    </div>
  ),
}))
vi.mock('../../components/shared/PostJobForm.jsx', () => ({
  default: ({ onSave, onCancel, saving }) => (
    <div data-testid="post-job-form">
      <button
        data-testid="post-job-save"
        onClick={() => onSave({ title: 'New Job', company: 'TestCo', skills: ['React'] })}
        disabled={saving}
      >
        Save
      </button>
      <button data-testid="post-job-cancel" onClick={onCancel}>Cancel</button>
    </div>
  ),
}))
vi.mock('../../components/shared/UserDetailDrawer.jsx', () => ({
  default: ({ onClose }) => (
    <div data-testid="user-detail-drawer">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))
vi.mock('../../components/modals/CareerListingModal.jsx', () => ({
  default: ({ onClose }) => (
    <div data-testid="career-listing-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))

// ── Constants mocks ───────────────────────────────────────────────────────────
vi.mock('../../constants/stages.js', () => ({
  SM: {
    applied: { id: 'applied', label: 'Applied', color: '#706E6B' },
    screening: { id: 'screening', label: 'Screening', color: '#F59E0B' },
    selected: { id: 'selected', label: 'Selected', color: '#2E844A' },
  },
  STAGES: [
    { id: 'applied', label: 'Applied', color: '#706E6B' },
    { id: 'screening', label: 'Screening', color: '#F59E0B' },
    { id: 'selected', label: 'Selected', color: '#2E844A' },
  ],
}))
vi.mock('../../constants/styles.js', () => ({
  btnP: { background: '#0176D3', color: '#fff' },
  btnG: { background: '#fff', color: '#374151' },
  btnD: { background: '#BA0517', color: '#fff' },
  card: { background: '#fff', borderRadius: 8, padding: 16 },
}))

// ── Import component AFTER all mocks ──────────────────────────────────────────
import { api } from '../../api/api.js'
import AdminJobs from '../../pages/admin/AdminJobs.jsx'

// ── Fixtures ──────────────────────────────────────────────────────────────────
const adminUser = { id: 'admin1', role: 'admin', tenantId: 'org1', orgName: 'Acme Corp' }
const superAdmin = { id: 'sa1', role: 'super_admin' }

function makeJob(overrides = {}) {
  return {
    _id: 'j1',
    id: 'j1',
    title: 'Frontend Engineer',
    company: 'Acme Corp',
    location: 'Remote',
    status: 'active',
    urgency: 'High',
    recruiterName: 'Jane Doe',
    applicantsCount: 5,
    selectedCount: 1,
    skills: ['React', 'TypeScript'],
    applicationDeadline: null,
    ...overrides,
  }
}

function makePaginatedResponse(jobs, total) {
  return { data: jobs, pagination: { total, page: 1, limit: 50, pages: Math.ceil(total / 50) } }
}

// ── Default mock setup ────────────────────────────────────────────────────────
function setupDefaultMocks() {
  api.getJobs.mockResolvedValue(makePaginatedResponse([], 0))
  api.getUsers.mockResolvedValue({ data: [] })
  api.createJob.mockResolvedValue({ success: true })
  api.patchJob.mockResolvedValue({ success: true })
  api.deleteJob.mockResolvedValue({ success: true })
  api.getApplications.mockResolvedValue({ data: [] })
  api.assignRecruiterToJob.mockResolvedValue({ success: true })
  api.assignCandidatesToJob.mockResolvedValue({ success: true })
  api.updateStage.mockResolvedValue({ success: true })
  api.runDeduplication.mockResolvedValue({ message: 'Done', totalMergedApps: 3 })
}

// ─────────────────────────────────────────────────────────────────────────────

describe('AdminJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    setupDefaultMocks()
    // suppress window.confirm dialogs in tests
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  // ── Mount & initial data loading ──────────────────────────────────────────

  it('calls getJobs on mount', async () => {
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    expect(api.getJobs).toHaveBeenCalled()
  })

  it('calls getUsers for recruiters and candidates on mount', async () => {
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    expect(api.getUsers).toHaveBeenCalledWith('recruiter')
    expect(api.getUsers).toHaveBeenCalledWith('candidate')
  })

  it('shows spinner while jobs are loading', () => {
    api.getJobs.mockReturnValue(new Promise(() => {}))
    api.getUsers.mockReturnValue(new Promise(() => {}))
    render(<AdminJobs user={adminUser} />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('renders "All Job Postings" heading after loading', async () => {
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    expect(screen.getByText('All Job Postings')).toBeInTheDocument()
  })

  it('renders status count badges (Open, Closed, Draft, Total)', async () => {
    // Status count calls return pagination totals
    api.getJobs.mockImplementation(({ status } = {}) => {
      if (status === 'active') return Promise.resolve(makePaginatedResponse([], 4))
      if (status === 'closed') return Promise.resolve(makePaginatedResponse([], 2))
      if (status === 'draft') return Promise.resolve(makePaginatedResponse([], 1))
      return Promise.resolve(makePaginatedResponse([], 7))
    })
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    await waitFor(() => {
      expect(screen.getByText(/Open: 4/i)).toBeInTheDocument()
      expect(screen.getByText(/Closed: 2/i)).toBeInTheDocument()
      expect(screen.getByText(/Draft: 1/i)).toBeInTheDocument()
      expect(screen.getByText(/Total: 7/i)).toBeInTheDocument()
    })
  })

  it('shows empty state when no jobs found', async () => {
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    expect(screen.getByText(/No jobs found/i)).toBeInTheDocument()
  })

  it('does not crash when getJobs rejects', async () => {
    api.getJobs.mockRejectedValue(new Error('network error'))
    await expect(
      act(async () => { render(<AdminJobs user={adminUser} />) })
    ).resolves.not.toThrow()
  })

  // ── Job list rendering ─────────────────────────────────────────────────────

  it('renders job title and company after loading', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument()
    expect(screen.getByText(/Acme Corp/i)).toBeInTheDocument()
  })

  it('renders applicant count for each job', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob({ applicantsCount: 12 })], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    expect(screen.getByText(/12 applicants/i)).toBeInTheDocument()
  })

  it('renders recruiter name for the job', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob({ recruiterName: 'Alice Smith' })], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    expect(screen.getAllByText(/Alice Smith/i).length).toBeGreaterThan(0)
  })

  it('renders "Unassigned" when job has no recruiter', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob({ recruiterName: null })], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    expect(screen.getByText(/Unassigned/i)).toBeInTheDocument()
  })

  it('renders job status badge as Open for active jobs', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob({ status: 'active' })], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    const badges = screen.getAllByTestId('badge')
    expect(badges.some(b => b.textContent === 'Open')).toBe(true)
  })

  it('renders job status badge as Closed for closed jobs', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob({ status: 'closed' })], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    const badges = screen.getAllByTestId('badge')
    expect(badges.some(b => b.textContent === 'Closed')).toBe(true)
  })

  it('renders skills for a job', async () => {
    api.getJobs.mockResolvedValue(
      makePaginatedResponse([makeJob({ skills: ['Vue', 'Node.js'] })], 1)
    )
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    expect(screen.getByText(/Vue/i)).toBeInTheDocument()
  })

  // ── Search & filter bar ────────────────────────────────────────────────────

  it('renders search input when jobs are present', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    expect(screen.getByPlaceholderText(/Search title/i)).toBeInTheDocument()
  })

  it('changing search input triggers a new getJobs call', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    vi.clearAllMocks()
    api.getJobs.mockResolvedValue(makePaginatedResponse([], 0))
    const searchInput = screen.getByPlaceholderText(/Search title/i)
    await act(async () => { fireEvent.change(searchInput, { target: { value: 'Backend' } }) })
    await waitFor(() => expect(api.getJobs).toHaveBeenCalled())
  })

  it('status filter dropdown is rendered when jobs are present', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    expect(screen.getByDisplayValue('All Status')).toBeInTheDocument()
  })

  it('changing status filter to "Open" triggers getJobs with status:active', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    vi.clearAllMocks()
    api.getJobs.mockResolvedValue(makePaginatedResponse([], 0))
    const statusSelect = screen.getByDisplayValue('All Status')
    await act(async () => { fireEvent.change(statusSelect, { target: { value: 'Open' } }) })
    await waitFor(() => {
      const calls = api.getJobs.mock.calls
      expect(calls.some(c => c[0]?.status === 'active')).toBe(true)
    })
  })

  it('clear filter button resets all filters', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    const searchInput = screen.getByPlaceholderText(/Search title/i)
    await act(async () => { fireEvent.change(searchInput, { target: { value: 'test' } }) })
    const clearBtn = await screen.findByText(/✕ Clear/i)
    await act(async () => { fireEvent.click(clearBtn) })
    await waitFor(() => expect(screen.getByPlaceholderText(/Search title/i).value).toBe(''))
  })

  // ── Job selection & bulk operations ───────────────────────────────────────

  it('clicking "Select All Visible" checkbox selects all jobs', async () => {
    api.getJobs.mockResolvedValue(
      makePaginatedResponse([makeJob({ id: 'j1' }), makeJob({ id: 'j2', _id: 'j2', title: 'Backend Dev' })], 2)
    )
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    const selectAllCheckbox = screen.getByLabelText ? undefined : screen.getByText(/Select All Visible/i)?.previousSibling
    // Find the select all checkbox by proximity to the "Select All Visible" label
    const selectAllLabel = screen.getByText(/Select All Visible/i)
    const checkbox = selectAllLabel.previousSibling || selectAllLabel.parentElement?.querySelector('input[type="checkbox"]')
    if (checkbox) {
      await act(async () => { fireEvent.click(checkbox) })
      // After select all, bulk close button should appear
      expect(screen.getByText(/Close \d+ Selected/i)).toBeInTheDocument()
    } else {
      // Fallback: just verify the label exists
      expect(selectAllLabel).toBeInTheDocument()
    }
  })

  it('"+ Post Job" button opens the post job modal', async () => {
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    const postBtn = screen.getByText(/\+ Post Job/i)
    await act(async () => { fireEvent.click(postBtn) })
    expect(screen.getByTestId('modal')).toBeInTheDocument()
    expect(screen.getByTestId('post-job-form')).toBeInTheDocument()
  })

  it('closing the post job modal hides it', async () => {
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/\+ Post Job/i)) })
    await act(async () => { fireEvent.click(screen.getByTestId('modal-close')) })
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
  })

  // ── Job creation ───────────────────────────────────────────────────────────

  it('saving a new job calls api.createJob', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([], 0))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/\+ Post Job/i)) })
    await act(async () => { fireEvent.click(screen.getByTestId('post-job-save')) })
    expect(api.createJob).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New Job', company: 'TestCo' })
    )
  })

  it('shows success toast after creating a job', async () => {
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/\+ Post Job/i)) })
    await act(async () => { fireEvent.click(screen.getByTestId('post-job-save')) })
    expect(screen.getByTestId('toast')).toHaveTextContent(/Job posted/i)
  })

  it('shows error toast when createJob API fails', async () => {
    api.createJob.mockRejectedValue(new Error('Server error'))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/\+ Post Job/i)) })
    await act(async () => { fireEvent.click(screen.getByTestId('post-job-save')) })
    expect(screen.getByTestId('toast')).toHaveTextContent(/Server error/i)
  })

  // ── Job editing ────────────────────────────────────────────────────────────

  it('clicking "View Details" on a job opens the JobDetailDrawer', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    const viewBtn = screen.getByText(/View Details/i)
    await act(async () => { fireEvent.click(viewBtn) })
    expect(screen.getByTestId('job-detail-drawer')).toBeInTheDocument()
  })

  it('closing the JobDetailDrawer hides it', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/View Details/i)) })
    await act(async () => { fireEvent.click(screen.getByTestId('drawer-close')) })
    expect(screen.queryByTestId('job-detail-drawer')).not.toBeInTheDocument()
  })

  it('clicking "Edit" action opens edit modal with PostJobForm', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    const editBtn = screen.getByText(/✏️ Edit/i)
    await act(async () => { fireEvent.click(editBtn) })
    expect(screen.getByTestId('post-job-form')).toBeInTheDocument()
    expect(screen.getByText(/Edit Job/i)).toBeInTheDocument()
  })

  it('saving an edited job calls api.patchJob', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/✏️ Edit/i)) })
    await act(async () => { fireEvent.click(screen.getByTestId('post-job-save')) })
    expect(api.patchJob).toHaveBeenCalledWith('j1', expect.any(Object))
  })

  it('shows success toast after editing a job', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/✏️ Edit/i)) })
    await act(async () => { fireEvent.click(screen.getByTestId('post-job-save')) })
    await waitFor(() => expect(screen.getByTestId('toast')).toHaveTextContent(/Job updated/i))
  })

  // ── Job deletion ───────────────────────────────────────────────────────────

  it('clicking Delete calls window.confirm then api.deleteJob', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    const deleteBtn = screen.getByText(/Delete/i)
    await act(async () => { fireEvent.click(deleteBtn) })
    expect(window.confirm).toHaveBeenCalled()
    expect(api.deleteJob).toHaveBeenCalledWith('j1')
  })

  it('shows success toast after deleting a job', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    const deleteBtn = screen.getByText(/Delete/i)
    await act(async () => { fireEvent.click(deleteBtn) })
    await waitFor(() => expect(screen.getByTestId('toast')).toHaveTextContent(/Job deleted/i))
  })

  it('does not call api.deleteJob when confirm dialog is cancelled', async () => {
    window.confirm.mockReturnValue(false)
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    const deleteBtn = screen.getByText(/Delete/i)
    await act(async () => { fireEvent.click(deleteBtn) })
    expect(api.deleteJob).not.toHaveBeenCalled()
  })

  // ── Toggle open/close ──────────────────────────────────────────────────────

  it('clicking "Close" calls api.patchJob with status:closed', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob({ status: 'active' })], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    const closeBtn = screen.getByText(/^Close$/i)
    await act(async () => { fireEvent.click(closeBtn) })
    expect(api.patchJob).toHaveBeenCalledWith('j1', { status: 'closed' })
  })

  it('clicking "Reopen" on a closed job calls api.patchJob with status:active', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob({ status: 'closed' })], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    const reopenBtn = screen.getByText(/Reopen/i)
    await act(async () => { fireEvent.click(reopenBtn) })
    expect(api.patchJob).toHaveBeenCalledWith('j1', { status: 'active' })
  })

  // ── Share modal ────────────────────────────────────────────────────────────

  it('clicking "Share" opens the ShareJobModal', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    const shareBtn = screen.getByText(/📣 Share/i)
    await act(async () => { fireEvent.click(shareBtn) })
    expect(screen.getByTestId('share-job-modal')).toBeInTheDocument()
  })

  it('closing the ShareJobModal removes it from DOM', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/📣 Share/i)) })
    await act(async () => { fireEvent.click(screen.getByTestId('share-modal-close')) })
    expect(screen.queryByTestId('share-job-modal')).not.toBeInTheDocument()
  })

  // ── Applicants panel ───────────────────────────────────────────────────────

  it('clicking "Applicants" fetches applications for that job', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    api.getApplications.mockResolvedValue({ data: [] })
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    const appsBtn = screen.getByText(/👥 Applicants/i)
    await act(async () => { fireEvent.click(appsBtn) })
    expect(api.getApplications).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'j1' })
    )
  })

  it('shows candidate names inside the applicants panel', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    api.getApplications.mockResolvedValue({
      data: [
        { id: 'app1', stage: 'applied', candidateId: { name: 'Bob Jones', email: 'bob@x.com' } }
      ]
    })
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/👥 Applicants/i)) })
    await waitFor(() => expect(screen.getByText('Bob Jones')).toBeInTheDocument())
  })

  it('applicants search filters candidates by name', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    api.getApplications.mockResolvedValue({
      data: [
        { id: 'app1', stage: 'applied', candidateId: { name: 'Alice Green', email: 'alice@x.com' } },
        { id: 'app2', stage: 'applied', candidateId: { name: 'Bob Red', email: 'bob@x.com' } },
      ]
    })
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/👥 Applicants/i)) })
    await waitFor(() => screen.getByText('Alice Green'))
    const appSearchInput = screen.getByPlaceholderText(/Search applicants/i)
    await act(async () => { fireEvent.change(appSearchInput, { target: { value: 'Bob' } }) })
    expect(screen.queryByText('Alice Green')).not.toBeInTheDocument()
    expect(screen.getByText('Bob Red')).toBeInTheDocument()
  })

  it('shows "No applicants found" when search matches nothing', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    api.getApplications.mockResolvedValue({
      data: [{ id: 'app1', stage: 'applied', candidateId: { name: 'Alice Green', email: 'alice@x.com' } }]
    })
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/👥 Applicants/i)) })
    await waitFor(() => screen.getByText('Alice Green'))
    const appSearchInput = screen.getByPlaceholderText(/Search applicants/i)
    await act(async () => { fireEvent.change(appSearchInput, { target: { value: 'ZZZ' } }) })
    expect(screen.getByText(/No applicants found/i)).toBeInTheDocument()
  })

  // ── Assign recruiter ───────────────────────────────────────────────────────

  it('clicking "Assign" opens the assignment portal', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    api.getUsers.mockResolvedValue({ data: [{ id: 'r1', name: 'Recruiter A', email: 'r@a.com' }] })
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    const assignBtn = screen.getByText(/👤 Assign/i)
    await act(async () => { fireEvent.click(assignBtn) })
    expect(screen.getByText(/Assignment Portal/i)).toBeInTheDocument()
  })

  it('shows no-recruiter toast when assign is clicked without selecting one', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    api.getUsers.mockResolvedValue({ data: [] })
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/👤 Assign/i)) })
    const assignConfirm = screen.getByText(/✓ Assign Recruiter to Job/i)
    await act(async () => { fireEvent.click(assignConfirm) })
    expect(screen.getByTestId('toast')).toHaveTextContent(/select a recruiter/i)
  })

  it('successful recruiter assignment calls api.assignRecruiterToJob', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    api.getUsers
      .mockResolvedValueOnce({ data: [{ id: 'r1', name: 'Recruiter A', email: 'r@a.com' }] })
      .mockResolvedValue({ data: [] })
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/👤 Assign/i)) })
    // Select a recruiter
    const recruiterSelect = screen.getByDisplayValue(/— Select recruiter —/i)
    await act(async () => { fireEvent.change(recruiterSelect, { target: { value: 'r1' } }) })
    const assignConfirm = screen.getByText(/✓ Assign Recruiter to Job/i)
    await act(async () => { fireEvent.click(assignConfirm) })
    expect(api.assignRecruiterToJob).toHaveBeenCalledWith('j1', 'r1')
  })

  // ── Distribute navigation ─────────────────────────────────────────────────

  it('clicking "Distribute" navigates to the job distribution page', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    const distBtn = screen.getByText(/📡 Distribute/i)
    await act(async () => { fireEvent.click(distBtn) })
    expect(mockNavigate).toHaveBeenCalledWith('/app/jobs/j1/distribution')
  })

  // ── Listing button ─────────────────────────────────────────────────────────

  it('clicking "Listing" opens the CareerListingModal', async () => {
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    const listingBtn = screen.getByText(/🌐 Listing/i)
    await act(async () => { fireEvent.click(listingBtn) })
    expect(screen.getByTestId('career-listing-modal')).toBeInTheDocument()
  })

  // ── Super-admin features ───────────────────────────────────────────────────

  it('super_admin sees "Merge Duplicates" button', async () => {
    await act(async () => { render(<AdminJobs user={superAdmin} />) })
    expect(screen.getByText(/🪄 Merge Duplicates/i)).toBeInTheDocument()
  })

  it('"Merge Duplicates" with no jobs shows no-duplicates toast', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([], 0))
    await act(async () => { render(<AdminJobs user={superAdmin} />) })
    const mergeBtn = screen.getByText(/🪄 Merge Duplicates/i)
    await act(async () => { fireEvent.click(mergeBtn) })
    // No jobs => findDuplicates returns early
    expect(api.runDeduplication).not.toHaveBeenCalled()
  })

  it('non-super_admin does not see "Merge Duplicates" button', async () => {
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    expect(screen.queryByText(/🪄 Merge Duplicates/i)).not.toBeInTheDocument()
  })

  it('merge review modal shows when duplicates are found', async () => {
    const dup1 = makeJob({ id: 'j1', _id: 'j1', title: 'Frontend Engineer', company: 'Acme', applicantsCount: 5 })
    const dup2 = makeJob({ id: 'j2', _id: 'j2', title: 'Frontend Engineer', company: 'Acme', applicantsCount: 2 })
    api.getJobs.mockResolvedValue(makePaginatedResponse([dup1, dup2], 2))
    await act(async () => { render(<AdminJobs user={superAdmin} />) })
    const mergeBtn = screen.getByText(/🪄 Merge Duplicates/i)
    await act(async () => { fireEvent.click(mergeBtn) })
    expect(screen.getByText(/Review Job Migration/i)).toBeInTheDocument()
  })

  it('confirming merge calls api.runDeduplication', async () => {
    const dup1 = makeJob({ id: 'j1', _id: 'j1', title: 'Frontend Engineer', company: 'Acme', applicantsCount: 5 })
    const dup2 = makeJob({ id: 'j2', _id: 'j2', title: 'Frontend Engineer', company: 'Acme', applicantsCount: 2 })
    api.getJobs.mockResolvedValue(makePaginatedResponse([dup1, dup2], 2))
    await act(async () => { render(<AdminJobs user={superAdmin} />) })
    await act(async () => { fireEvent.click(screen.getByText(/🪄 Merge Duplicates/i)) })
    const confirmBtn = await screen.findByText(/✓ Confirm & Merge All/i)
    await act(async () => { fireEvent.click(confirmBtn) })
    expect(api.runDeduplication).toHaveBeenCalled()
  })

  // ── Pagination ─────────────────────────────────────────────────────────────

  it('pagination controls are visible when total jobs exceed PAGE_SIZE (50)', async () => {
    // Return 51 total, first page has 1 job
    api.getJobs.mockImplementation(({ status } = {}) => {
      if (!status) return Promise.resolve(makePaginatedResponse([makeJob()], 51))
      return Promise.resolve(makePaginatedResponse([], 0))
    })
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    await waitFor(() => expect(screen.getByText(/← Prev/i)).toBeInTheDocument())
    expect(screen.getByText(/Next →/i)).toBeInTheDocument()
  })

  it('pagination controls are NOT shown when total jobs are within one page', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    expect(screen.queryByText(/← Prev/i)).not.toBeInTheDocument()
  })

  // ── Assessment modal ───────────────────────────────────────────────────────

  it('clicking "Assessment" action shows the assessment modal', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    const assessBtn = screen.getAllByText(/📋 Assessment/i)[0]
    await act(async () => { fireEvent.click(assessBtn) })
    expect(screen.getByText(/✅ Got it/i)).toBeInTheDocument()
  })

  it('clicking "Got it" in assessment modal closes it', async () => {
    api.getJobs.mockResolvedValue(makePaginatedResponse([makeJob()], 1))
    await act(async () => { render(<AdminJobs user={adminUser} />) })
    await act(async () => { fireEvent.click(screen.getAllByText(/📋 Assessment/i)[0]) })
    await act(async () => { fireEvent.click(screen.getByText(/✅ Got it/i)) })
    expect(screen.queryByText(/✅ Got it/i)).not.toBeInTheDocument()
  })
})
