import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/api.js', () => ({
  api: {
    getPendingApprovalJobs: vi.fn(),
    approveJobNew: vi.fn(),
    rejectJob: vi.fn(),
  },
}))

// Stub heavy chart/misc components that have complex deps
vi.mock('../../components/ui/PageHeader.jsx', () => ({
  default: ({ title, subtitle }) => <div data-testid="page-header"><h1>{title}</h1><p>{subtitle}</p></div>,
}))
vi.mock('../../components/ui/Spinner.jsx', () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}))
vi.mock('../../components/ui/Toast.jsx', () => ({
  default: ({ msg }) => msg ? <div data-testid="toast">{msg}</div> : null,
}))
vi.mock('../../components/ui/Modal.jsx', () => ({
  default: ({ title, children, footer, onClose }) => (
    <div data-testid="modal">
      <div data-testid="modal-title">{title}</div>
      {children}
      {footer}
    </div>
  ),
}))
vi.mock('../../components/ui/Badge.jsx', () => ({
  default: ({ label }) => <span data-testid="badge">{label}</span>,
}))

import { api } from '../../api/api.js'
import AdminJobApproval from '../../pages/admin/AdminJobApproval.jsx'

function makeJob(overrides = {}) {
  return {
    _id: 'job1',
    id: 'job1',
    title: 'Senior Developer',
    company: 'Acme Corp',
    department: 'Engineering',
    location: 'Remote',
    skills: ['JavaScript', 'React', 'Node.js'],
    postedBy: { name: 'Alice Recruiter', email: 'alice@acme.com' },
    createdAt: '2025-06-01T00:00:00Z',
    ...overrides,
  }
}

describe('AdminJobApproval', () => {
  const mockUser = { id: 'admin1', role: 'admin', name: 'Admin User' }

  beforeEach(() => {
    vi.clearAllMocks()
    api.getPendingApprovalJobs.mockResolvedValue({ data: [] })
    api.approveJobNew.mockResolvedValue({ success: true })
    api.rejectJob.mockResolvedValue({ success: true })
  })

  // ── Loading & empty states ──────────────────────────────────────────────────
  it('calls getPendingApprovalJobs on mount', async () => {
    api.getPendingApprovalJobs.mockResolvedValue({ data: [] })
    await act(async () => { render(<AdminJobApproval user={mockUser} />) })
    expect(api.getPendingApprovalJobs).toHaveBeenCalledTimes(1)
  })

  it('shows spinner while loading', () => {
    api.getPendingApprovalJobs.mockReturnValue(new Promise(() => {})) // never resolves
    render(<AdminJobApproval user={mockUser} />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('shows "All caught up!" when no jobs pending', async () => {
    api.getPendingApprovalJobs.mockResolvedValue({ data: [] })
    await act(async () => { render(<AdminJobApproval user={mockUser} />) })
    expect(screen.getByText('All caught up!')).toBeInTheDocument()
  })

  it('shows job count in subtitle when jobs exist', async () => {
    api.getPendingApprovalJobs.mockResolvedValue({ data: [makeJob()] })
    await act(async () => { render(<AdminJobApproval user={mockUser} />) })
    expect(screen.getByText(/1 job.*awaiting your review/i)).toBeInTheDocument()
  })

  // ── Job list rendering ──────────────────────────────────────────────────────
  it('renders job title and company for each pending job', async () => {
    api.getPendingApprovalJobs.mockResolvedValue({ data: [makeJob()] })
    await act(async () => { render(<AdminJobApproval user={mockUser} />) })
    expect(screen.getByText('Senior Developer')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('renders skills for each job (up to 3)', async () => {
    api.getPendingApprovalJobs.mockResolvedValue({ data: [makeJob()] })
    await act(async () => { render(<AdminJobApproval user={mockUser} />) })
    expect(screen.getByText('JavaScript')).toBeInTheDocument()
    expect(screen.getByText('React')).toBeInTheDocument()
  })

  it('shows +N overflow indicator when job has more than 3 skills', async () => {
    const job = makeJob({ skills: ['JS', 'TS', 'React', 'Node', 'Python'] })
    api.getPendingApprovalJobs.mockResolvedValue({ data: [job] })
    await act(async () => { render(<AdminJobApproval user={mockUser} />) })
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('handles flat array response (no {data} wrapper)', async () => {
    api.getPendingApprovalJobs.mockResolvedValue([makeJob()])
    await act(async () => { render(<AdminJobApproval user={mockUser} />) })
    expect(screen.getByText('Senior Developer')).toBeInTheDocument()
  })

  // ── Approval flow ───────────────────────────────────────────────────────────
  it('approve button calls api.approveJobNew with job id', async () => {
    api.getPendingApprovalJobs.mockResolvedValue({ data: [makeJob()] })
    await act(async () => { render(<AdminJobApproval user={mockUser} />) })

    const approveBtn = screen.getByText('✓')
    await act(async () => { fireEvent.click(approveBtn) })

    expect(api.approveJobNew).toHaveBeenCalledWith('job1')
  })

  it('removes approved job from the list after successful approval', async () => {
    api.getPendingApprovalJobs.mockResolvedValue({ data: [makeJob()] })
    await act(async () => { render(<AdminJobApproval user={mockUser} />) })

    expect(screen.getByText('Senior Developer')).toBeInTheDocument()
    await act(async () => { fireEvent.click(screen.getByText('✓')) })
    expect(screen.queryByText('Senior Developer')).not.toBeInTheDocument()
  })

  it('shows success toast after approval', async () => {
    api.getPendingApprovalJobs.mockResolvedValue({ data: [makeJob()] })
    await act(async () => { render(<AdminJobApproval user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('✓')) })
    expect(screen.getByTestId('toast')).toHaveTextContent(/Job approved/i)
  })

  it('calls onBadgeUpdate with remaining count after approval', async () => {
    const onBadgeUpdate = vi.fn()
    api.getPendingApprovalJobs.mockResolvedValue({ data: [makeJob()] })
    await act(async () => { render(<AdminJobApproval user={mockUser} onBadgeUpdate={onBadgeUpdate} />) })
    // initial call on load
    expect(onBadgeUpdate).toHaveBeenCalledWith(1)
    await act(async () => { fireEvent.click(screen.getByText('✓')) })
    // after approval, 0 remaining
    expect(onBadgeUpdate).toHaveBeenCalledWith(0)
  })

  // ── Reject flow ─────────────────────────────────────────────────────────────
  it('clicking ✕ button opens the RejectModal', async () => {
    api.getPendingApprovalJobs.mockResolvedValue({ data: [makeJob()] })
    await act(async () => { render(<AdminJobApproval user={mockUser} />) })
    fireEvent.click(screen.getByText('✕'))
    expect(screen.getByTestId('modal')).toBeInTheDocument()
  })

  it('reject confirm calls api.rejectJob with job id and note', async () => {
    api.getPendingApprovalJobs.mockResolvedValue({ data: [makeJob()] })
    await act(async () => { render(<AdminJobApproval user={mockUser} />) })

    // Open modal
    fireEvent.click(screen.getByText('✕'))

    // Fill in rejection note
    const textarea = screen.getByPlaceholderText(/Tell the recruiter/i)
    fireEvent.change(textarea, { target: { value: 'Missing salary range' } })

    // Confirm rejection — button (not the h3 title which also has same text)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Return for Revision' }))
    })

    expect(api.rejectJob).toHaveBeenCalledWith('job1', 'Missing salary range')
  })

  it('shows error toast when approval API call fails', async () => {
    api.getPendingApprovalJobs.mockResolvedValue({ data: [makeJob()] })
    api.approveJobNew.mockRejectedValue(new Error('Server error'))
    await act(async () => { render(<AdminJobApproval user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText('✓')) })
    expect(screen.getByTestId('toast')).toHaveTextContent(/❌ Server error/)
  })
})
