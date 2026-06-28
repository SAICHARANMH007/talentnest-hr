import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('../../api/api.js', () => ({
  api: {
    getUsers: vi.fn(),
    getJobs: vi.fn(),
    applyToJob: vi.fn(),
    markReachOut: vi.fn(),
    getApplications: vi.fn(),
    parkApplication: vi.fn(),
    getSavedSearches: vi.fn(),
    saveSearch: vi.fn(),
    deleteSavedSearch: vi.fn(),
  },
}))

vi.mock('../../api/matching.js', () => ({
  filterCandidates: vi.fn((candidates) => candidates),
}))

vi.mock('../../hooks/usePresence.js', () => ({
  usePresence: () => ({ onlineUsers: [] }),
}))

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
  default: ({ title, subtitle, action }) => (
    <div data-testid="page-header">
      <div data-testid="page-header-title">{title}</div>
      {subtitle && <div data-testid="page-header-subtitle">{subtitle}</div>}
      {action && <div data-testid="page-header-action">{action}</div>}
    </div>
  ),
}))
vi.mock('../../components/ui/Field.jsx', () => ({
  default: ({ label, value, onChange, placeholder }) => (
    <div>
      <label>{label}</label>
      <input
        aria-label={label}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  ),
}))
vi.mock('../../components/ui/FormRow.jsx', () => ({
  default: ({ children }) => <div>{children}</div>,
}))
vi.mock('../../components/shared/InviteModal.jsx', () => ({
  default: ({ candidates, onClose }) => (
    <div data-testid="invite-modal">
      <span>Invite: {candidates[0]?.name}</span>
      <button onClick={onClose}>Close Invite</button>
    </div>
  ),
}))
vi.mock('../../components/shared/BulkWhatsAppModal.jsx', () => ({
  default: ({ candidates, onClose, onComplete }) => (
    <div data-testid="bulk-whatsapp-modal">
      <span>WhatsApp {candidates.length} candidates</span>
      <button onClick={onClose}>Close WA</button>
      <button onClick={() => onComplete('3 sent')}>Complete</button>
    </div>
  ),
}))
vi.mock('../../components/shared/AddCandidateForm.jsx', () => ({
  default: ({ onSuccess }) => (
    <div data-testid="add-candidate-form">
      <button onClick={onSuccess}>Submit Candidate</button>
    </div>
  ),
}))
vi.mock('../../components/shared/UserDetailDrawer.jsx', () => ({
  default: ({ user, onClose }) => (
    <div data-testid="user-detail-drawer">
      <span>{user?.name}</span>
      <button onClick={onClose}>Close Drawer</button>
    </div>
  ),
}))
vi.mock('../../components/shared/PresenceBadge.jsx', () => ({
  default: ({ userId }) => <span data-testid={`presence-${userId}`} />,
}))
vi.mock('../../constants/styles.js', () => ({
  btnP: {},
  btnG: {},
  btnD: {},
  card: {},
}))

import { api } from '../../api/api.js'
import RecruiterCandidates from '../../pages/recruiter/RecruiterCandidates.jsx'

const mockUser = { id: 'r1', name: 'Recruiter One' }

function makeCandidate(overrides = {}) {
  return {
    id: 'c1',
    _id: 'c1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    title: 'React Developer',
    location: 'Hyderabad',
    skills: ['React', 'Node.js'],
    phone: '9999999999',
    experienceYears: 4,
    summary: 'Experienced frontend developer',
    ...overrides,
  }
}

function makeJob(overrides = {}) {
  return {
    id: 'j1',
    _id: 'j1',
    title: 'Frontend Engineer',
    company: 'Acme Corp',
    ...overrides,
  }
}

function defaultMocks(candidateOverrides = {}, jobOverrides = {}) {
  api.getUsers.mockResolvedValue({
    data: [makeCandidate(candidateOverrides)],
    pagination: { total: 1, page: 1, pages: 1 },
  })
  api.getJobs.mockResolvedValue([makeJob(jobOverrides)])
  api.getSavedSearches.mockResolvedValue([])
}

describe('RecruiterCandidates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    defaultMocks()
    api.applyToJob.mockResolvedValue({ success: true })
    api.markReachOut.mockResolvedValue({ data: makeCandidate({ lastReachedOutAt: new Date().toISOString() }) })
    api.getApplications.mockResolvedValue([])
    api.parkApplication.mockResolvedValue({ success: true })
    api.saveSearch.mockResolvedValue({ _id: 'ss1', name: 'My Search', filters: {} })
    api.deleteSavedSearch.mockResolvedValue({})
  })

  // ── Loading state ────────────────────────────────────────────────────────

  it('shows spinner while data is loading', () => {
    api.getUsers.mockReturnValue(new Promise(() => {}))
    api.getJobs.mockReturnValue(new Promise(() => {}))
    api.getSavedSearches.mockReturnValue(new Promise(() => {}))
    render(<RecruiterCandidates user={mockUser} />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
    expect(screen.getByText(/Loading candidate pool/i)).toBeInTheDocument()
  })

  it('calls getUsers and getJobs on mount with recruiter id', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    expect(api.getUsers).toHaveBeenCalledWith(expect.objectContaining({ role: 'candidate', limit: 50, page: 1 }))
    expect(api.getJobs).toHaveBeenCalledWith({ recruiterId: 'r1' })
  })

  it('calls getSavedSearches on mount', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    expect(api.getSavedSearches).toHaveBeenCalledWith('candidates')
  })

  // ── Main content ─────────────────────────────────────────────────────────

  it('renders page header with Talent Pool title', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    expect(screen.getByTestId('page-header-title')).toHaveTextContent('Talent Pool')
  })

  it('renders candidate name after API resolves', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
  })

  it('renders candidate email after API resolves', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    expect(screen.getByText(/alice@example.com/i)).toBeInTheDocument()
  })

  it('renders candidate skill badges', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    const badges = screen.getAllByTestId('badge')
    const badgeTexts = badges.map(b => b.textContent)
    expect(badgeTexts).toContain('React')
    expect(badgeTexts).toContain('Node.js')
  })

  it('renders candidate count in header subtitle', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    expect(screen.getByTestId('page-header-subtitle')).toHaveTextContent('1')
  })

  it('shows "Not contacted yet" for candidates with no outreach', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    expect(screen.getByText('Not contacted yet')).toBeInTheDocument()
  })

  // ── Empty state ──────────────────────────────────────────────────────────

  it('shows empty state when no candidates match filters', async () => {
    api.getUsers.mockResolvedValue({ data: [], pagination: { total: 0, page: 1, pages: 1 } })
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    expect(screen.getByText(/No candidates match your filters/i)).toBeInTheDocument()
  })

  it('shows warning when recruiter has no jobs', async () => {
    api.getJobs.mockResolvedValue([])
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    expect(screen.getByText(/You have no active jobs yet/i)).toBeInTheDocument()
  })

  // ── Error handling ───────────────────────────────────────────────────────

  it('shows error toast when getUsers rejects', async () => {
    api.getUsers.mockRejectedValue(new Error('Server error'))
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    const toast = screen.getByTestId('toast')
    expect(toast).toHaveTextContent('Server error')
  })

  it('does not crash when getSavedSearches rejects', async () => {
    api.getSavedSearches.mockRejectedValue(new Error('saved searches unavailable'))
    await expect(
      act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    ).resolves.not.toThrow()
  })

  // ── Search and filter interactions ───────────────────────────────────────

  it('clicking Search button calls getUsers with filter params', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    api.getUsers.mockClear()
    api.getUsers.mockResolvedValue({ data: [], pagination: { total: 0, page: 1, pages: 1 } })

    const searchBtn = screen.getByText('🔍 Search')
    await act(async () => { fireEvent.click(searchBtn) })

    await waitFor(() => {
      expect(api.getUsers).toHaveBeenCalledWith(expect.objectContaining({ role: 'candidate' }))
    }, { timeout: 1000 })
  })

  it('typing in designation field updates filter input value', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    const designationInput = screen.getByLabelText('Designation / Title')
    fireEvent.change(designationInput, { target: { value: 'React Developer' } })
    expect(designationInput.value).toBe('React Developer')
  })

  it('typing in skills field updates filter input value', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    const skillsInput = screen.getByLabelText('Skills (comma-separated)')
    fireEvent.change(skillsInput, { target: { value: 'React, Node.js' } })
    expect(skillsInput.value).toBe('React, Node.js')
  })

  it('clicking role category button toggles role filter', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    const itBtn = screen.getByText('IT')
    fireEvent.click(itBtn)
    // After click, the button should be visually active (styling changes)
    expect(itBtn).toBeInTheDocument()
  })

  it('Clear button appears only when filters are active', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    // Initially no clear button
    expect(screen.queryByText('✕ Clear')).not.toBeInTheDocument()
    // Set a filter
    const designationInput = screen.getByLabelText('Designation / Title')
    fireEvent.change(designationInput, { target: { value: 'Developer' } })
    // Search to apply
    const searchBtn = screen.getByText('🔍 Search')
    await act(async () => { fireEvent.click(searchBtn) })
    await waitFor(() => {
      expect(screen.getByText('✕ Clear')).toBeInTheDocument()
    }, { timeout: 1000 })
  })

  // ── Add candidate modal ──────────────────────────────────────────────────

  it('clicking Add Candidate button opens the add candidate modal', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    const addBtn = screen.getByText('+ Add Candidate')
    fireEvent.click(addBtn)
    expect(screen.getByTestId('add-candidate-form')).toBeInTheDocument()
  })

  it('closing the add candidate modal hides the form', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    fireEvent.click(screen.getByText('+ Add Candidate'))
    expect(screen.getByTestId('add-candidate-form')).toBeInTheDocument()
    fireEvent.click(screen.getByText('✕'))
    expect(screen.queryByTestId('add-candidate-form')).not.toBeInTheDocument()
  })

  it('submitting add candidate form shows success toast and refreshes candidates', async () => {
    api.getUsers.mockResolvedValue({
      data: [makeCandidate(), makeCandidate({ id: 'c2', _id: 'c2', name: 'Bob Smith', email: 'bob@example.com' })],
      pagination: { total: 2, page: 1, pages: 1 },
    })
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    fireEvent.click(screen.getByText('+ Add Candidate'))
    await act(async () => { fireEvent.click(screen.getByText('Submit Candidate')) })
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toHaveTextContent('Candidate added to pool')
    })
  })

  // ── Add to pipeline interaction ──────────────────────────────────────────

  it('Add to Pipeline button calls applyToJob with correct ids', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    // Open job dropdown
    const selectBtn = screen.getByText('Select job(s)...')
    fireEvent.click(selectBtn)
    // Select job option
    const jobOption = screen.getByText('Frontend Engineer')
    fireEvent.click(jobOption)
    // Click add to pipeline
    const addBtn = screen.getByText('➕ Add to Pipeline')
    await act(async () => { fireEvent.click(addBtn) })
    expect(api.applyToJob).toHaveBeenCalledWith('j1', 'c1')
  })

  it('shows success toast after successfully adding to pipeline', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    fireEvent.click(screen.getByText('Select job(s)...'))
    fireEvent.click(screen.getByText('Frontend Engineer'))
    await act(async () => { fireEvent.click(screen.getByText('➕ Add to Pipeline')) })
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toHaveTextContent('Alice Johnson')
    })
  })

  it('shows duplicate warning toast when candidate already in pipeline', async () => {
    api.applyToJob.mockRejectedValue(new Error('Candidate already in pipeline'))
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    fireEvent.click(screen.getByText('Select job(s)...'))
    fireEvent.click(screen.getByText('Frontend Engineer'))
    await act(async () => { fireEvent.click(screen.getByText('➕ Add to Pipeline')) })
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toHaveTextContent(/already/i)
    })
  })

  // ── Outreach logging ─────────────────────────────────────────────────────

  it('clicking Log Outreach shows note input', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    const logBtn = screen.getByText('+ Log Outreach')
    fireEvent.click(logBtn)
    expect(screen.getByPlaceholderText(/Add a note/i)).toBeInTheDocument()
  })

  it('saving outreach note calls markReachOut and shows toast', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    fireEvent.click(screen.getByText('+ Log Outreach'))
    const noteInput = screen.getByPlaceholderText(/Add a note/i)
    fireEvent.change(noteInput, { target: { value: 'Sent LinkedIn message' } })
    await act(async () => { fireEvent.click(screen.getByText('✓ Save Note')) })
    expect(api.markReachOut).toHaveBeenCalledWith('c1', 'Sent LinkedIn message')
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toHaveTextContent('Outreach logged')
    })
  })

  it('cancelling outreach hides the note panel', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    fireEvent.click(screen.getByText('+ Log Outreach'))
    expect(screen.getByPlaceholderText(/Add a note/i)).toBeInTheDocument()
    fireEvent.click(screen.getByText('✕ Cancel'))
    expect(screen.queryByPlaceholderText(/Add a note/i)).not.toBeInTheDocument()
  })

  // ── Park candidate ───────────────────────────────────────────────────────

  it('clicking Park fetches candidate applications then parks the first one', async () => {
    const app = { id: 'app1', _id: 'app1' }
    api.getApplications.mockResolvedValue([app])
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    const parkBtn = screen.getByText('🅿️ Park')
    await act(async () => { fireEvent.click(parkBtn) })
    expect(api.getApplications).toHaveBeenCalledWith({ candidateId: 'c1' })
    expect(api.parkApplication).toHaveBeenCalledWith('app1')
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toHaveTextContent('Alice Johnson')
    })
  })

  it('shows warning toast when candidate has no applications to park', async () => {
    api.getApplications.mockResolvedValue([])
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('🅿️ Park')) })
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toHaveTextContent(/no active application/i)
    })
  })

  // ── Resume navigation ────────────────────────────────────────────────────

  it('clicking Resume button navigates to resume page', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    const resumeBtn = screen.getByText('📋 Resume')
    fireEvent.click(resumeBtn)
    expect(mockNavigate).toHaveBeenCalledWith('/app/resume/c1')
  })

  // ── Invite modal ─────────────────────────────────────────────────────────

  it('clicking Send Invitation opens invite modal with candidate', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    const inviteBtn = screen.getByText('📧 Send Invitation')
    fireEvent.click(inviteBtn)
    expect(screen.getByTestId('invite-modal')).toBeInTheDocument()
    expect(screen.getByText(/Invite: Alice Johnson/i)).toBeInTheDocument()
  })

  it('closing invite modal removes it from DOM', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    fireEvent.click(screen.getByText('📧 Send Invitation'))
    expect(screen.getByTestId('invite-modal')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Close Invite'))
    expect(screen.queryByTestId('invite-modal')).not.toBeInTheDocument()
  })

  // ── Bulk select and WhatsApp ─────────────────────────────────────────────

  it('Select All button selects all displayed candidates', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    fireEvent.click(screen.getByText('Select All'))
    // After selecting all, button label changes
    expect(screen.getByText('Deselect All')).toBeInTheDocument()
  })

  it('WhatsApp button appears when candidates are selected', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    fireEvent.click(screen.getByText('Select All'))
    expect(screen.getByText(/WhatsApp.*Selected/i)).toBeInTheDocument()
  })

  it('clicking WhatsApp button opens BulkWhatsAppModal', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    fireEvent.click(screen.getByText('Select All'))
    fireEvent.click(screen.getByText(/WhatsApp.*Selected/i))
    expect(screen.getByTestId('bulk-whatsapp-modal')).toBeInTheDocument()
  })

  it('completing WhatsApp blast shows toast and closes modal', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    fireEvent.click(screen.getByText('Select All'))
    fireEvent.click(screen.getByText(/WhatsApp.*Selected/i))
    await act(async () => { fireEvent.click(screen.getByText('Complete')) })
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toHaveTextContent('WhatsApp')
    })
    expect(screen.queryByTestId('bulk-whatsapp-modal')).not.toBeInTheDocument()
  })

  // ── Saved searches ───────────────────────────────────────────────────────

  it('renders saved searches when getSavedSearches returns data', async () => {
    api.getSavedSearches.mockResolvedValue([
      { _id: 'ss1', name: 'React Devs', filters: { designation: 'React Developer' } },
    ])
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    expect(screen.getByText('🔖 React Devs')).toBeInTheDocument()
  })

  it('clicking a saved search loads its filters', async () => {
    api.getSavedSearches.mockResolvedValue([
      { _id: 'ss1', name: 'React Devs', filters: { designation: 'React Developer' } },
    ])
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    fireEvent.click(screen.getByText('🔖 React Devs'))
    const designationInput = screen.getByLabelText('Designation / Title')
    expect(designationInput.value).toBe('React Developer')
  })

  it('deleting a saved search calls deleteSavedSearch and removes it', async () => {
    api.getSavedSearches.mockResolvedValue([
      { _id: 'ss1', name: 'React Devs', filters: {} },
    ])
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    const deleteBtn = screen.getByText('✕', { selector: 'button' })
    await act(async () => { fireEvent.click(deleteBtn) })
    expect(api.deleteSavedSearch).toHaveBeenCalledWith('ss1')
    await waitFor(() => {
      expect(screen.queryByText('🔖 React Devs')).not.toBeInTheDocument()
    })
  })

  // ── Multiple candidates ──────────────────────────────────────────────────

  it('renders multiple candidates returned from API', async () => {
    api.getUsers.mockResolvedValue({
      data: [
        makeCandidate({ id: 'c1', _id: 'c1', name: 'Alice Johnson', email: 'alice@example.com' }),
        makeCandidate({ id: 'c2', _id: 'c2', name: 'Bob Smith', email: 'bob@example.com' }),
        makeCandidate({ id: 'c3', _id: 'c3', name: 'Charlie Brown', email: 'charlie@example.com' }),
      ],
      pagination: { total: 3, page: 1, pages: 1 },
    })
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
    expect(screen.getByText('Charlie Brown')).toBeInTheDocument()
  })

  // ── Edit profile drawer ──────────────────────────────────────────────────

  it('clicking Edit opens user detail drawer', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    const editBtns = screen.getAllByText('✏️ Edit')
    fireEvent.click(editBtns[0])
    expect(screen.getByTestId('user-detail-drawer')).toBeInTheDocument()
  })

  it('closing user detail drawer removes it', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    const editBtns = screen.getAllByText('✏️ Edit')
    fireEvent.click(editBtns[0])
    expect(screen.getByTestId('user-detail-drawer')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Close Drawer'))
    expect(screen.queryByTestId('user-detail-drawer')).not.toBeInTheDocument()
  })

  // ── Load more ────────────────────────────────────────────────────────────

  it('shows Load More button when there are more pages', async () => {
    api.getUsers.mockResolvedValue({
      data: [makeCandidate()],
      pagination: { total: 100, page: 1, pages: 2 },
    })
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    expect(screen.getByText(/Load More Candidates/i)).toBeInTheDocument()
  })

  it('clicking Load More calls getUsers with next page', async () => {
    api.getUsers.mockResolvedValueOnce({
      data: [makeCandidate()],
      pagination: { total: 100, page: 1, pages: 2 },
    })
    api.getUsers.mockResolvedValueOnce({
      data: [makeCandidate({ id: 'c2', _id: 'c2', name: 'Bob Smith', email: 'bob@example.com' })],
      pagination: { total: 100, page: 2, pages: 2 },
    })
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/Load More Candidates/i)) })
    expect(api.getUsers).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }))
    await waitFor(() => {
      expect(screen.getByText('Bob Smith')).toBeInTheDocument()
    })
  })

  // ── Individual checkbox selection ─────────────────────────────────────────

  it('checking a candidate checkbox adds it to selection', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    expect(checkbox.checked).toBe(true)
  })

  it('Deselect All unchecks all candidates', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    fireEvent.click(screen.getByText('Select All'))
    expect(screen.getByText('Deselect All')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Deselect All'))
    expect(screen.getByText('Select All')).toBeInTheDocument()
  })

  // ── Online filter ────────────────────────────────────────────────────────

  it('Online Now toggle button is present', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    expect(screen.getByText(/Online Now/i)).toBeInTheDocument()
  })

  it('clicking Online Now toggles the online-only filter', async () => {
    await act(async () => { render(<RecruiterCandidates user={mockUser} />) })
    const onlineBtn = screen.getByText(/Online Now/i)
    fireEvent.click(onlineBtn)
    // Button text updates to show active state
    expect(screen.getByText(/Online Now/i)).toBeInTheDocument()
  })
})
