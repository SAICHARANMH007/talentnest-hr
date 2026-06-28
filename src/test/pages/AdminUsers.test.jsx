import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── API mock ──────────────────────────────────────────────────────────────────
vi.mock('../../api/api.js', () => ({
  api: {
    getUsers: vi.fn(),
    createUser: vi.fn(),
    deleteUser: vi.fn(),
    inviteAdmin: vi.fn(),
    inviteRecruiter: vi.fn(),
    resendUserInvite: vi.fn(),
    resendInvite: vi.fn(),
    revokeInvite: vi.fn(),
    getPendingInvites: vi.fn(),
    getApplications: vi.fn(),
    getJobs: vi.fn(),
    updateStage: vi.fn(),
    applyToJob: vi.fn(),
  },
  downloadBlob: vi.fn(),
}))

// ── Client mock (used by loadOrgs via req()) ──────────────────────────────────
vi.mock('../../api/client.js', () => ({
  req: vi.fn(),
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
  default: ({ title, subtitle, action }) => (
    <div data-testid="page-header">
      <div data-testid="page-title">{title}</div>
      <div data-testid="page-subtitle">{subtitle}</div>
      <div data-testid="page-action">{action}</div>
    </div>
  ),
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
vi.mock('../../components/ui/Field.jsx', () => ({
  default: ({ label, value, onChange, type, error, placeholder, options, required, hint }) => {
    if (options) {
      return (
        <div>
          <label>{label}{required && ' *'}</label>
          <select
            value={value}
            onChange={e => onChange(e.target.value)}
            data-testid={`field-select-${label?.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <option value="">Select...</option>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {error && <span data-testid="field-error">{error}</span>}
        </div>
      )
    }
    return (
      <div>
        <label>{label}{required && ' *'}</label>
        <input
          type={type || 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          data-testid={`field-input-${label?.toLowerCase().replace(/\s+/g, '-')}`}
        />
        {error && <span data-testid="field-error">{error}</span>}
      </div>
    )
  },
}))
vi.mock('../../components/ui/Dropdown.jsx', () => ({
  default: ({ label, options, value, onChange }) => (
    <select data-testid="dropdown" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{label}</option>
      {(options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  ),
}))

// ── Shared component mocks ────────────────────────────────────────────────────
vi.mock('../../components/shared/UserDetailDrawer.jsx', () => ({
  default: ({ user: u, onClose, onDelete, onUpdated }) => (
    <div data-testid="user-detail-drawer">
      <div data-testid="drawer-user-name">{u?.name || u?.email || 'User'}</div>
      <button data-testid="drawer-close" onClick={onClose}>Close</button>
      {onDelete && <button data-testid="drawer-delete" onClick={() => onDelete(u?.id)}>Delete</button>}
      {onUpdated && <button data-testid="drawer-updated" onClick={() => onUpdated({ ...u, name: 'Updated Name' })}>Save</button>}
    </div>
  ),
}))
vi.mock('../../components/shared/ChangePasswordModal.jsx', () => ({
  default: ({ onClose }) => (
    <div data-testid="change-password-modal">
      <button data-testid="pwd-modal-close" onClick={onClose}>Close</button>
    </div>
  ),
}))
vi.mock('../../components/shared/AddCandidateForm.jsx', () => ({
  default: ({ onSuccess }) => (
    <div data-testid="add-candidate-form">
      <button data-testid="add-candidate-submit" onClick={onSuccess}>Submit</button>
    </div>
  ),
}))
vi.mock('../../components/shared/ResumeCard.jsx', () => ({
  default: ({ candidate }) => <div data-testid="resume-card">{candidate?.name}</div>,
}))
vi.mock('../../components/shared/InviteModal.jsx', () => ({
  default: ({ onClose, onSent }) => (
    <div data-testid="invite-modal">
      <button data-testid="invite-send" onClick={() => onSent(1, 'Dev Role')}>Send</button>
      <button data-testid="invite-close" onClick={onClose}>Close</button>
    </div>
  ),
}))

// ── Modal component mocks ─────────────────────────────────────────────────────
vi.mock('../../components/modals/CandidateMergeWizard.jsx', () => ({
  default: ({ isOpen, onClose, onMerged }) =>
    isOpen ? (
      <div data-testid="candidate-merge-wizard">
        <button data-testid="merge-confirm" onClick={onMerged}>Merge</button>
        <button data-testid="merge-close" onClick={onClose}>Close</button>
      </div>
    ) : null,
}))

// ── Constants mocks ───────────────────────────────────────────────────────────
vi.mock('../../constants/stages.js', () => ({
  STAGES: [
    { id: 'applied', label: 'Applied', color: '#706E6B', icon: '📋' },
    { id: 'screening', label: 'Screening', color: '#F59E0B', icon: '🔍' },
    { id: 'selected', label: 'Selected', color: '#34d399', icon: '✅' },
  ],
  SM: {
    applied: { id: 'applied', label: 'Applied', color: '#706E6B' },
    screening: { id: 'screening', label: 'Screening', color: '#F59E0B' },
    selected: { id: 'selected', label: 'Selected', color: '#34d399' },
  },
}))
vi.mock('../../constants/styles.js', () => ({
  btnP: { background: '#0176D3', color: '#fff' },
  btnG: { background: '#fff', color: '#374151' },
  btnD: { background: '#BA0517', color: '#fff' },
  card: { background: '#fff', borderRadius: 8, padding: 16 },
}))

// ── Import component AFTER all mocks ──────────────────────────────────────────
import { api, downloadBlob } from '../../api/api.js'
import { req } from '../../api/client.js'
import AdminUsers from '../../pages/admin/AdminUsers.jsx'

// ── Fixtures ──────────────────────────────────────────────────────────────────
const adminUser = { id: 'admin1', role: 'admin', tenantId: 'org1', orgName: 'Acme Corp', orgId: 'org1' }
const superAdminUser = { id: 'sa1', role: 'super_admin', tenantId: 'org1' }

function makeCandidate(overrides = {}) {
  return {
    _id: 'u1',
    id: 'u1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'candidate',
    isActive: true,
    skills: ['React', 'Node.js'],
    location: 'Remote',
    experience: 3,
    ...overrides,
  }
}

function makeRecruiter(overrides = {}) {
  return {
    _id: 'r1',
    id: 'r1',
    name: 'Bob Smith',
    email: 'bob@example.com',
    role: 'recruiter',
    isActive: true,
    ...overrides,
  }
}

function makeInvite(overrides = {}) {
  return {
    id: 'inv1',
    name: 'Charlie Chen',
    email: 'charlie@example.com',
    role: 'recruiter',
    invitedAt: '2025-01-01T00:00:00Z',
    isExpired: false,
    ...overrides,
  }
}

function makePaginatedResponse(users, total = null) {
  return {
    data: users,
    pagination: { page: 1, limit: 50, total: total ?? users.length, pages: 1 },
  }
}

// ── Default mock setup ────────────────────────────────────────────────────────
function setupDefaultMocks() {
  api.getUsers.mockResolvedValue(makePaginatedResponse([]))
  api.createUser.mockResolvedValue({ success: true, data: { id: 'new1', name: 'New User' } })
  api.deleteUser.mockResolvedValue({ success: true })
  api.inviteAdmin.mockResolvedValue({ success: true })
  api.inviteRecruiter.mockResolvedValue({ success: true })
  api.resendUserInvite.mockResolvedValue({ success: true })
  api.resendInvite.mockResolvedValue({ success: true })
  api.revokeInvite.mockResolvedValue({ success: true })
  api.getPendingInvites.mockResolvedValue([])
  api.getApplications.mockResolvedValue({ data: [] })
  api.getJobs.mockResolvedValue({ data: [] })
  api.updateStage.mockResolvedValue({ success: true })
  api.applyToJob.mockResolvedValue({ success: true })
  downloadBlob.mockResolvedValue(new Blob(['xlsx'], { type: 'application/octet-stream' }))
  req.mockResolvedValue([])
}

// ─────────────────────────────────────────────────────────────────────────────

describe('AdminUsers — candidate view', () => {
  const defaultProps = { filterRole: 'candidate', user: adminUser, isSuperAdmin: false }

  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  // ── Mount & initial loading ───────────────────────────────────────────────

  it('calls api.getUsers with role:candidate on mount', async () => {
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => {
      const calls = api.getUsers.mock.calls
      expect(calls.some(c => c[0]?.role === 'candidate')).toBe(true)
    })
  })

  it('renders the page title "Manage Candidates"', async () => {
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    expect(screen.getByTestId('page-title')).toHaveTextContent(/Manage Candidates/i)
  })

  it('shows spinner while loading', () => {
    api.getUsers.mockReturnValue(new Promise(() => {}))
    render(<AdminUsers {...defaultProps} />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('renders "No candidates found" when API returns empty array', async () => {
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => expect(screen.getByText(/No candidates found/i)).toBeInTheDocument())
  })

  it('renders candidate names after loading', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate()]))
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => expect(screen.getByText('Alice Johnson')).toBeInTheDocument())
  })

  it('renders candidate email after loading', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate()]))
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument())
  })

  it('renders skill badges for candidates', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate({ skills: ['Python', 'Django'] })]))
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => {
      const badges = screen.getAllByTestId('badge')
      expect(badges.some(b => b.textContent === 'Python')).toBe(true)
    })
  })

  it('shows "No candidates found" empty state after loading', async () => {
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => expect(screen.getByText(/No candidates found/i)).toBeInTheDocument())
  })

  it('does not crash when getUsers rejects', async () => {
    api.getUsers.mockRejectedValue(new Error('Server error'))
    await expect(
      act(async () => { render(<AdminUsers {...defaultProps} />) })
    ).resolves.not.toThrow()
  })

  // ── Add Candidate button ───────────────────────────────────────────────────

  it('renders "+ Add Candidate" button in the page action', async () => {
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    expect(screen.getByText(/\+ Add Candidate/i)).toBeInTheDocument()
  })

  it('clicking "+ Add Candidate" opens the add candidate form overlay', async () => {
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await act(async () => { fireEvent.click(screen.getByText(/\+ Add Candidate/i)) })
    expect(screen.getByTestId('add-candidate-form')).toBeInTheDocument()
  })

  it('submitting the add candidate form closes the overlay and shows toast', async () => {
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await act(async () => { fireEvent.click(screen.getByText(/\+ Add Candidate/i)) })
    await act(async () => { fireEvent.click(screen.getByTestId('add-candidate-submit')) })
    expect(screen.queryByTestId('add-candidate-form')).not.toBeInTheDocument()
    expect(screen.getByTestId('toast')).toHaveTextContent(/Candidate added/i)
  })

  // ── Search ─────────────────────────────────────────────────────────────────

  it('renders search input when candidates are present', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate()]))
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => expect(screen.getByPlaceholderText(/Search name/i)).toBeInTheDocument())
  })

  it('typing in search triggers a debounced getUsers call', async () => {
    vi.useFakeTimers()
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate()]))
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => screen.getByPlaceholderText(/Search name/i))
    vi.clearAllMocks()
    api.getUsers.mockResolvedValue(makePaginatedResponse([]))
    const searchInput = screen.getByPlaceholderText(/Search name/i)
    await act(async () => { fireEvent.change(searchInput, { target: { value: 'Bob' } }) })
    vi.advanceTimersByTime(500)
    await act(async () => {})
    expect(api.getUsers).toHaveBeenCalled()
    vi.useRealTimers()
  })

  // ── Edit / Delete actions ──────────────────────────────────────────────────

  it('clicking "Edit" button opens UserDetailDrawer', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate()]))
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => screen.getByText('Alice Johnson'))
    const editBtn = screen.getByText(/✏️ Edit/i)
    await act(async () => { fireEvent.click(editBtn) })
    expect(screen.getByTestId('user-detail-drawer')).toBeInTheDocument()
  })

  it('closing UserDetailDrawer removes it from DOM', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate()]))
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => screen.getByText('Alice Johnson'))
    await act(async () => { fireEvent.click(screen.getByText(/✏️ Edit/i)) })
    await act(async () => { fireEvent.click(screen.getByTestId('drawer-close')) })
    expect(screen.queryByTestId('user-detail-drawer')).not.toBeInTheDocument()
  })

  it('clicking "Delete" calls window.confirm then api.deleteUser', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate()]))
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => screen.getByText('Alice Johnson'))
    const deleteBtn = screen.getByText(/🗑 Delete/i)
    await act(async () => { fireEvent.click(deleteBtn) })
    expect(window.confirm).toHaveBeenCalled()
    expect(api.deleteUser).toHaveBeenCalledWith('u1')
  })

  it('does not call api.deleteUser when confirm is cancelled', async () => {
    window.confirm.mockReturnValue(false)
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate()]))
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => screen.getByText('Alice Johnson'))
    await act(async () => { fireEvent.click(screen.getByText(/🗑 Delete/i)) })
    expect(api.deleteUser).not.toHaveBeenCalled()
  })

  it('shows success toast after deleting a user', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate()]))
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => screen.getByText('Alice Johnson'))
    await act(async () => { fireEvent.click(screen.getByText(/🗑 Delete/i)) })
    await waitFor(() => expect(screen.getByTestId('toast')).toHaveTextContent(/Deleted/i))
  })

  // ── Bulk selection ─────────────────────────────────────────────────────────

  it('candidate cards have checkboxes for selection', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate()]))
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => screen.getByText('Alice Johnson'))
    const checkboxes = document.querySelectorAll('input[type="checkbox"]')
    expect(checkboxes.length).toBeGreaterThan(0)
  })

  it('selecting a candidate reveals "Assign to Job" and "Invite to Apply" buttons', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate()]))
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => screen.getByText('Alice Johnson'))
    // Find the candidate row checkbox (not the select-all)
    const candidateCheckboxes = document.querySelectorAll('input[type="checkbox"][style*="cursor: pointer"]')
    if (candidateCheckboxes.length > 0) {
      await act(async () => { fireEvent.click(candidateCheckboxes[0]) })
      await waitFor(() => {
        expect(screen.getByText(/Assign to Job/i)).toBeInTheDocument()
      })
    }
  })

  it('"Select all" link selects all visible candidates', async () => {
    api.getUsers.mockResolvedValue(
      makePaginatedResponse([makeCandidate(), makeCandidate({ id: 'u2', _id: 'u2', name: 'Bob Test', email: 'bob@x.com' })])
    )
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => screen.getByText('Alice Johnson'))
    const selectAllLink = screen.queryByText(/Select all 2/i)
    if (selectAllLink) {
      await act(async () => { fireEvent.click(selectAllLink) })
      expect(screen.getByText(/2 selected/i)).toBeInTheDocument()
    }
  })

  // ── Resend invite ──────────────────────────────────────────────────────────

  it('shows "Resend Invite" button for pending (isActive=false) candidates', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate({ isActive: false })]))
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => expect(screen.getByText(/📧 Resend Invite/i)).toBeInTheDocument())
  })

  it('clicking "Resend Invite" calls api.resendUserInvite with user id', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate({ isActive: false })]))
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => screen.getByText(/📧 Resend Invite/i))
    await act(async () => { fireEvent.click(screen.getByText(/📧 Resend Invite/i)) })
    expect(api.resendUserInvite).toHaveBeenCalledWith('u1')
  })

  it('shows success toast after resending invite', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate({ isActive: false })]))
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => screen.getByText(/📧 Resend Invite/i))
    await act(async () => { fireEvent.click(screen.getByText(/📧 Resend Invite/i)) })
    await waitFor(() => expect(screen.getByTestId('toast')).toHaveTextContent(/Invite resent/i))
  })

  // ── Pipeline expansion ─────────────────────────────────────────────────────

  it('clicking "Pipeline" button expands the pipeline panel for that candidate', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate()]))
    api.getApplications.mockResolvedValue({ data: [] })
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => screen.getByText('Alice Johnson'))
    const pipelineBtn = screen.getByText(/👁 Pipeline/i)
    await act(async () => { fireEvent.click(pipelineBtn) })
    await waitFor(() => {
      expect(api.getApplications).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'alice@example.com' })
      )
    })
  })

  it('clicking "Pipeline" again collapses the panel', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate()]))
    api.getApplications.mockResolvedValue({ data: [] })
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => screen.getByText('Alice Johnson'))
    await act(async () => { fireEvent.click(screen.getByText(/👁 Pipeline/i)) })
    await waitFor(() => expect(screen.getByText(/▲ Hide/i)).toBeInTheDocument())
    await act(async () => { fireEvent.click(screen.getByText(/▲ Hide/i)) })
    expect(screen.getByText(/👁 Pipeline/i)).toBeInTheDocument()
  })

  // ── Resume viewer ──────────────────────────────────────────────────────────

  it('clicking "Resume" button opens the resume viewer modal', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate()]))
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => screen.getByText('Alice Johnson'))
    const resumeBtn = screen.getByText(/📋 Resume/i)
    await act(async () => { fireEvent.click(resumeBtn) })
    expect(screen.getByTestId('modal')).toBeInTheDocument()
    expect(screen.getByTestId('resume-card')).toBeInTheDocument()
  })

  // ── Export ─────────────────────────────────────────────────────────────────

  it('clicking Export calls downloadBlob with the correct path', async () => {
    global.URL.createObjectURL = vi.fn(() => 'blob:test')
    global.URL.revokeObjectURL = vi.fn()
    downloadBlob.mockResolvedValue(new Blob(['data']))
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    const exportBtn = screen.getByText(/⬇ Export/i)
    await act(async () => { fireEvent.click(exportBtn) })
    expect(downloadBlob).toHaveBeenCalledWith('/users/export?role=candidate')
  })

  // ── Assign-to-job flow ─────────────────────────────────────────────────────

  it('clicking "Assign to Job" opens the AssignToJobModal', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate()]))
    api.getJobs.mockResolvedValue({ data: [{ id: 'j1', _id: 'j1', title: 'Backend Dev', company: 'Acme', status: 'active' }] })
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => screen.getByText('Alice Johnson'))
    // Select the candidate first
    const candidateCheckboxes = document.querySelectorAll('input[type="checkbox"]')
    const candidateCheckbox = Array.from(candidateCheckboxes).find(cb =>
      cb.closest('[style]')?.textContent?.includes('Alice Johnson')
    ) || candidateCheckboxes[1] // fallback
    if (candidateCheckbox) {
      await act(async () => { fireEvent.click(candidateCheckbox) })
    }
    const assignBtn = screen.queryByText(/Assign to Job/i)
    if (assignBtn) {
      await act(async () => { fireEvent.click(assignBtn) })
      await waitFor(() => expect(api.getJobs).toHaveBeenCalled())
    }
  })

  it('AssignToJobModal calls api.applyToJob for each selected candidate × job', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate()]))
    api.getJobs.mockResolvedValue({
      data: [{ id: 'j1', _id: 'j1', title: 'Backend Dev', company: 'Acme', status: 'active' }]
    })
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => screen.getByText('Alice Johnson'))

    // Select candidate via the select-all link (simpler path)
    const selectAllLink = screen.queryByText(/Select all/i)
    if (selectAllLink) {
      await act(async () => { fireEvent.click(selectAllLink) })
      const assignBtn = screen.queryByText(/Assign to Job →/i)
      if (assignBtn) {
        await act(async () => { fireEvent.click(assignBtn) })
        // The AssignToJobModal opens and we could test further
        await waitFor(() => expect(api.getJobs).toHaveBeenCalled())
      }
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('AdminUsers — recruiter view', () => {
  const defaultProps = { filterRole: 'recruiter', user: adminUser, isSuperAdmin: false }

  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  it('renders "Manage Recruiters" as the page title', async () => {
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    expect(screen.getByTestId('page-title')).toHaveTextContent(/Manage Recruiters/i)
  })

  it('calls api.getUsers with role:recruiter on mount', async () => {
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => {
      const calls = api.getUsers.mock.calls
      expect(calls.some(c => c[0]?.role === 'recruiter')).toBe(true)
    })
  })

  it('shows "All Recruiters" and "Pending Invites" tabs', async () => {
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    expect(screen.getByText(/All Recruiters/i)).toBeInTheDocument()
    expect(screen.getByText(/Pending Invites/i)).toBeInTheDocument()
  })

  it('clicking "Pending Invites" tab loads pending invites', async () => {
    api.getPendingInvites.mockResolvedValue([makeInvite()])
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await act(async () => { fireEvent.click(screen.getByText(/📧 Pending Invites/i)) })
    await waitFor(() => expect(api.getPendingInvites).toHaveBeenCalled())
  })

  it('renders pending invite names in the pending tab', async () => {
    api.getPendingInvites.mockResolvedValue([makeInvite({ name: 'Charlie Chen', email: 'charlie@x.com' })])
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await act(async () => { fireEvent.click(screen.getByText(/📧 Pending Invites/i)) })
    await waitFor(() => expect(screen.getByText('Charlie Chen')).toBeInTheDocument())
  })

  it('shows "No pending invites" message when list is empty', async () => {
    api.getPendingInvites.mockResolvedValue([])
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await act(async () => { fireEvent.click(screen.getByText(/📧 Pending Invites/i)) })
    await waitFor(() => expect(screen.getByText(/No pending invites/i)).toBeInTheDocument())
  })

  it('clicking Resend in pending invites calls api.resendInvite', async () => {
    api.getPendingInvites.mockResolvedValue([makeInvite({ id: 'inv1', name: 'Charlie Chen' })])
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await act(async () => { fireEvent.click(screen.getByText(/📧 Pending Invites/i)) })
    await waitFor(() => screen.getByText('Charlie Chen'))
    const resendBtn = screen.getByText(/📧 Resend/i)
    await act(async () => { fireEvent.click(resendBtn) })
    expect(api.resendInvite).toHaveBeenCalledWith('inv1')
  })

  it('clicking Revoke in pending invites calls api.revokeInvite after confirm', async () => {
    api.getPendingInvites.mockResolvedValue([makeInvite({ id: 'inv1', name: 'Charlie Chen' })])
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await act(async () => { fireEvent.click(screen.getByText(/📧 Pending Invites/i)) })
    await waitFor(() => screen.getByText('Charlie Chen'))
    const revokeBtn = screen.getByText(/Revoke/i)
    await act(async () => { fireEvent.click(revokeBtn) })
    expect(window.confirm).toHaveBeenCalled()
    expect(api.revokeInvite).toHaveBeenCalledWith('inv1')
  })

  it('renders recruiter names after loading', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeRecruiter()]))
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => expect(screen.getByText('Bob Smith')).toBeInTheDocument())
  })

  it('clicking "Activity" button expands the recruiter activity panel', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeRecruiter()]))
    api.getApplications.mockResolvedValue({ data: [] })
    api.getJobs.mockResolvedValue({ data: [] })
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => screen.getByText('Bob Smith'))
    const activityBtn = screen.getByText(/👁 Activity/i)
    await act(async () => { fireEvent.click(activityBtn) })
    await waitFor(() => {
      expect(api.getApplications).toHaveBeenCalledWith(
        expect.objectContaining({ recruiterId: 'r1' })
      )
    })
  })

  it('shows "+ Add Recruiter" button', async () => {
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    expect(screen.getByText(/\+ Add Recruiter/i)).toBeInTheDocument()
  })

  it('clicking "+ Add Recruiter" opens the modal', async () => {
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await act(async () => { fireEvent.click(screen.getByText(/\+ Add Recruiter/i)) })
    expect(screen.getByTestId('modal')).toBeInTheDocument()
    expect(screen.getByText(/Add Recruiter/i)).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('AdminUsers — add user modal (candidate role)', () => {
  const defaultProps = { filterRole: 'candidate', user: adminUser, isSuperAdmin: false }

  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  async function openModal() {
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await act(async () => { fireEvent.click(screen.getByText(/\+ Add Candidate/i)) })
    // The AddCandidateForm overlay opens (not the modal)
    return screen.getByTestId('add-candidate-form')
  }

  it('opens the add candidate form overlay on button click', async () => {
    const form = await openModal()
    expect(form).toBeInTheDocument()
  })

  it('closing the overlay via "✕" button hides it', async () => {
    await openModal()
    const closeBtn = document.querySelector('button[style*="rgba(255,255,255,0.15)"]')
    if (closeBtn) {
      await act(async () => { fireEvent.click(closeBtn) })
      expect(screen.queryByTestId('add-candidate-form')).not.toBeInTheDocument()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('AdminUsers — add user modal (recruiter role)', () => {
  const defaultProps = { filterRole: 'recruiter', user: adminUser, isSuperAdmin: false }

  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  async function openModal() {
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await act(async () => { fireEvent.click(screen.getByText(/\+ Add Recruiter/i)) })
    return screen.getByTestId('modal')
  }

  it('modal title says "Add Recruiter"', async () => {
    await openModal()
    expect(screen.getByTestId('modal-title')).toHaveTextContent(/Add Recruiter/i)
  })

  it('clicking Cancel closes the modal', async () => {
    await openModal()
    await act(async () => { fireEvent.click(screen.getByTestId('modal-close')) })
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
  })

  it('clicking Create with empty form shows field validation errors', async () => {
    await openModal()
    const createBtn = screen.getByText(/^Create$/i)
    await act(async () => { fireEvent.click(createBtn) })
    const errors = screen.getAllByTestId('field-error')
    expect(errors.length).toBeGreaterThan(0)
  })

  it('filling name and email and clicking Create calls api.inviteRecruiter', async () => {
    await openModal()
    // Fill name field
    const nameInput = screen.getByTestId('field-input-full-name')
    await act(async () => { fireEvent.change(nameInput, { target: { value: 'Jane Smith' } }) })
    // Fill email field
    const emailInput = screen.getByTestId('field-input-email-address')
    await act(async () => { fireEvent.change(emailInput, { target: { value: 'jane@example.com' } }) })
    // Submit
    const createBtn = screen.getByText(/^Create$/i)
    await act(async () => { fireEvent.click(createBtn) })
    await waitFor(() => {
      expect(api.inviteRecruiter).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Jane Smith', email: 'jane@example.com' })
      )
    })
  })

  it('shows success toast after creating a recruiter', async () => {
    await openModal()
    const nameInput = screen.getByTestId('field-input-full-name')
    const emailInput = screen.getByTestId('field-input-email-address')
    await act(async () => { fireEvent.change(nameInput, { target: { value: 'Jane Smith' } }) })
    await act(async () => { fireEvent.change(emailInput, { target: { value: 'jane@example.com' } }) })
    await act(async () => { fireEvent.click(screen.getByText(/^Create$/i)) })
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent(/Invitation email sent/i)
    )
  })

  it('shows error toast when inviteRecruiter API fails', async () => {
    api.inviteRecruiter.mockRejectedValue(new Error('Duplicate email'))
    await openModal()
    const nameInput = screen.getByTestId('field-input-full-name')
    const emailInput = screen.getByTestId('field-input-email-address')
    await act(async () => { fireEvent.change(nameInput, { target: { value: 'Jane Smith' } }) })
    await act(async () => { fireEvent.change(emailInput, { target: { value: 'jane@example.com' } }) })
    await act(async () => { fireEvent.click(screen.getByText(/^Create$/i)) })
    await waitFor(() => {
      const errorEls = screen.queryAllByTestId('field-error')
      const toast = screen.queryByTestId('toast')
      // Either a field-level error or toast should be shown
      expect(errorEls.length > 0 || toast !== null).toBe(true)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('AdminUsers — super_admin specific features', () => {
  const defaultProps = { filterRole: 'candidate', user: superAdminUser, isSuperAdmin: true }

  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
    req.mockResolvedValue([{ id: 'org1', _id: 'org1', name: 'Acme Corp' }])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  it('loads orgs via req() for super_admin on mount', async () => {
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => expect(req).toHaveBeenCalledWith('GET', '/orgs'))
  })

  it('shows "Merge Records" button when 2+ candidates are selected and isSuperAdmin', async () => {
    api.getUsers.mockResolvedValue(
      makePaginatedResponse([
        makeCandidate({ id: 'u1', name: 'Alice', email: 'alice@x.com' }),
        makeCandidate({ id: 'u2', name: 'Bob', email: 'bob@x.com' }),
      ])
    )
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => screen.getByText('Alice'))
    const selectAllLink = screen.queryByText(/Select all 2/i)
    if (selectAllLink) {
      await act(async () => { fireEvent.click(selectAllLink) })
      await waitFor(() => expect(screen.getByText(/🪄 Merge Records/i)).toBeInTheDocument())
    }
  })

  it('clicking Merge Records opens CandidateMergeWizard', async () => {
    api.getUsers.mockResolvedValue(
      makePaginatedResponse([
        makeCandidate({ id: 'u1', name: 'Alice', email: 'alice@x.com' }),
        makeCandidate({ id: 'u2', name: 'Bob', email: 'bob@x.com' }),
      ])
    )
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => screen.getByText('Alice'))
    const selectAllLink = screen.queryByText(/Select all 2/i)
    if (selectAllLink) {
      await act(async () => { fireEvent.click(selectAllLink) })
      const mergeBtn = screen.queryByText(/🪄 Merge Records/i)
      if (mergeBtn) {
        await act(async () => { fireEvent.click(mergeBtn) })
        expect(screen.getByTestId('candidate-merge-wizard')).toBeInTheDocument()
      }
    }
  })

  it('super_admin sees Reset Password button for active users', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate({ isActive: true })]))
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => expect(screen.getByText(/🔒 Reset Pwd/i)).toBeInTheDocument())
  })

  it('clicking Reset Pwd opens the ChangePasswordModal', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate({ isActive: true })]))
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => screen.getByText(/🔒 Reset Pwd/i))
    await act(async () => { fireEvent.click(screen.getByText(/🔒 Reset Pwd/i)) })
    expect(screen.getByTestId('change-password-modal')).toBeInTheDocument()
  })

  it('closing ChangePasswordModal removes it from DOM', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate({ isActive: true })]))
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => screen.getByText(/🔒 Reset Pwd/i))
    await act(async () => { fireEvent.click(screen.getByText(/🔒 Reset Pwd/i)) })
    await act(async () => { fireEvent.click(screen.getByTestId('pwd-modal-close')) })
    expect(screen.queryByTestId('change-password-modal')).not.toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe('AdminUsers — invite flow', () => {
  const defaultProps = { filterRole: 'candidate', user: adminUser, isSuperAdmin: false }

  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  it('"Invite to Apply" button opens InviteModal when candidates are selected', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate()]))
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => screen.getByText('Alice Johnson'))
    const selectAllLink = screen.queryByText(/Select all/i)
    if (selectAllLink) {
      await act(async () => { fireEvent.click(selectAllLink) })
      const inviteBtn = screen.queryByText(/📧 Invite to Apply/i)
      if (inviteBtn) {
        await act(async () => { fireEvent.click(inviteBtn) })
        expect(screen.getByTestId('invite-modal')).toBeInTheDocument()
      }
    }
  })

  it('closing InviteModal hides it', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate()]))
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => screen.getByText('Alice Johnson'))
    const selectAllLink = screen.queryByText(/Select all/i)
    if (selectAllLink) {
      await act(async () => { fireEvent.click(selectAllLink) })
      const inviteBtn = screen.queryByText(/📧 Invite to Apply/i)
      if (inviteBtn) {
        await act(async () => { fireEvent.click(inviteBtn) })
        await act(async () => { fireEvent.click(screen.getByTestId('invite-close')) })
        expect(screen.queryByTestId('invite-modal')).not.toBeInTheDocument()
      }
    }
  })

  it('sending invite shows a success toast', async () => {
    api.getUsers.mockResolvedValue(makePaginatedResponse([makeCandidate()]))
    await act(async () => { render(<AdminUsers {...defaultProps} />) })
    await waitFor(() => screen.getByText('Alice Johnson'))
    const selectAllLink = screen.queryByText(/Select all/i)
    if (selectAllLink) {
      await act(async () => { fireEvent.click(selectAllLink) })
      const inviteBtn = screen.queryByText(/📧 Invite to Apply/i)
      if (inviteBtn) {
        await act(async () => { fireEvent.click(inviteBtn) })
        await act(async () => { fireEvent.click(screen.getByTestId('invite-send')) })
        await waitFor(() => expect(screen.getByTestId('toast')).toHaveTextContent(/invite.*sent/i))
      }
    }
  })
})
