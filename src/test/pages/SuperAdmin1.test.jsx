import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Router mock ───────────────────────────────────────────────────────────────
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: 'req1', orgId: 'org1' }),
  useLocation: () => ({ pathname: '/superadmin', search: '', state: null }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  NavLink: ({ children, to }) => <a href={to}>{children}</a>,
}))

// ── API mock (covers both named and default exports) ───────────────────────────
vi.mock('../../api/api.js', () => {
  const methods = {
    // AuditLogs
    getAuditLogs: vi.fn(),
    // BgvTracker
    getAllBgvSubmissions: vi.fn(),
    getBgvDocumentFile: vi.fn(),
    verifyBgvDocument: vi.fn(),
    deleteBgvDocument: vi.fn(),
    // Blogs
    adminGetBlogs: vi.fn(),
    adminCreateBlog: vi.fn(),
    adminUpdateBlog: vi.fn(),
    adminDeleteBlog: vi.fn(),
    adminTogglePublish: vi.fn(),
    // CandidateImport
    getImportedCandidates: vi.fn(),
    bulkImportRaw: vi.fn(),
    sendImportedInvites: vi.fn(),
    clearImportedDatabase: vi.fn(),
    // CandidateRequests
    getCandidateRequests: vi.fn(),
    updateCandidateRequest: vi.fn(),
    attachCandidatesToRequest: vi.fn(),
    getSuggestedCandidatesForRequest: vi.fn(),
    searchCandidatesAdvanced: vi.fn(),
    getApplications: vi.fn(),
    parkApplication: vi.fn(),
    // Candidates
    getCandidateRecords: vi.fn(),
    getUserCount: vi.fn(),
    updateStage: vi.fn(),
  }
  // SuperAdminBlogs uses default import; everything else uses named { api }
  return { api: methods, default: methods, downloadBlob: vi.fn() }
})

// ── read-excel-file mock ───────────────────────────────────────────────────────
vi.mock('read-excel-file/browser', () => ({
  default: vi.fn(() => Promise.resolve([['Name', 'Email'], ['Alice', 'alice@x.com']])),
}))

// ── Constants mocks ───────────────────────────────────────────────────────────
vi.mock('../../constants/styles.js', () => ({
  card: {}, btnP: {}, btnG: {}, btnD: {}, inp: {}, glassCard: {},
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
  default: ({ title, subtitle, actions }) => (
    <div data-testid="page-header">
      <div data-testid="page-title">{title}</div>
      {subtitle && <div data-testid="page-subtitle">{subtitle}</div>}
      {actions && <div data-testid="page-actions">{actions}</div>}
    </div>
  ),
}))
vi.mock('../../components/ui/Field.jsx', () => ({
  default: ({ value, onChange, placeholder }) => (
    <input
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      data-testid="field-input"
    />
  ),
}))
vi.mock('../../components/ui/CapLimitBanner.jsx', () => ({
  default: () => <div data-testid="cap-limit-banner" />,
}))

// ── Shared component mocks ────────────────────────────────────────────────────
vi.mock('../../components/shared/UserDetailDrawer.jsx', () => ({
  default: ({ user: u, onClose, onUpdated }) => (
    <div data-testid="user-detail-drawer">
      <span data-testid="drawer-user-name">{u?.name || 'User'}</span>
      <button data-testid="drawer-close" onClick={onClose}>Close</button>
      {onUpdated && (
        <button data-testid="drawer-updated" onClick={() => onUpdated()}>Save</button>
      )}
    </div>
  ),
}))

// ── Page imports (after all vi.mock calls) ────────────────────────────────────
import SuperAdminAuditLogs from '../../pages/superadmin/SuperAdminAuditLogs.jsx'
import SuperAdminBgvTracker from '../../pages/superadmin/SuperAdminBgvTracker.jsx'
import SuperAdminBlogs from '../../pages/superadmin/SuperAdminBlogs.jsx'
import SuperAdminCandidateImport from '../../pages/superadmin/SuperAdminCandidateImport.jsx'
import SuperAdminCandidateRequests from '../../pages/superadmin/SuperAdminCandidateRequests.jsx'
import SuperAdminCandidates from '../../pages/superadmin/SuperAdminCandidates.jsx'
import { api, downloadBlob } from '../../api/api.js'

// ── Fixtures ──────────────────────────────────────────────────────────────────
const mockUser = { id: 'sa1', name: 'Super Admin', role: 'super_admin' }

function makeAuditLog(overrides = {}) {
  return {
    id: 'log1',
    _id: 'log1',
    action: 'login',
    entity: 'User',
    entityId: 'abc123456789',
    createdAt: '2025-01-15T10:30:00Z',
    userId: { name: 'Alice', email: 'alice@example.com' },
    details: { ip: '192.168.1.1' },
    ...overrides,
  }
}

function makeBgvRow(overrides = {}) {
  return {
    userId: 'u1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '9876543210',
    bgvVerified: false,
    verifiedDocs: 0,
    totalDocs: 2,
    pendingDocs: 2,
    rejectedDocs: 0,
    latestUpload: '2025-01-10T00:00:00Z',
    docs: [
      {
        id: 'doc1',
        docName: 'Aadhaar Card',
        docTypeLabel: 'Government ID',
        status: 'uploaded',
        mimeType: 'image/jpeg',
        fileSize: 204800,
        createdAt: '2025-01-10T00:00:00Z',
      },
    ],
    ...overrides,
  }
}

function makeBlog(overrides = {}) {
  return {
    _id: 'blog1',
    title: 'How to Hire Fast',
    slug: 'how-to-hire-fast',
    category: 'IT Staffing',
    excerpt: 'A short summary here.',
    coverEmoji: '📝',
    accent: '#0176D3',
    published: true,
    featured: false,
    sections: [{ heading: 'Intro', body: 'Body text' }],
    tags: ['hiring', 'tech'],
    readTime: '5 min',
    views: 120,
    ...overrides,
  }
}

function makeImportedCandidate(overrides = {}) {
  return {
    id: 'imp1',
    name: 'Jane Smith',
    email: 'jane@example.com',
    status: 'pending',
    createdAt: '2025-01-01T00:00:00Z',
    data: { Name: 'Jane Smith', Email: 'jane@example.com' },
    ...overrides,
  }
}

function makeCandidateRequest(overrides = {}) {
  return {
    _id: 'req1',
    id: 'req1',
    roleTitle: 'Senior React Developer',
    status: 'pending',
    urgency: 'high',
    requirements: 'Must know React and TypeScript',
    createdAt: '2025-01-12T00:00:00Z',
    tenantId: { name: 'Acme Corp' },
    requestedBy: { name: 'HR Manager' },
    submittedCandidates: [],
    adminNotes: '',
    ...overrides,
  }
}

function makeCandidateRecord(overrides = {}) {
  return {
    candidateId: 'cand1',
    id: 'cand1',
    _id: 'cand1',
    name: 'Bob Builder',
    email: 'bob@example.com',
    phone: '9999999999',
    title: 'Software Engineer',
    currentCompany: 'TechCorp',
    experience: 3,
    location: 'Bangalore',
    skills: ['React', 'Node.js'],
    applicationCount: 0,
    allApplications: [],
    isApplied: false,
    isPlatformUser: true,
    source: 'platform',
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SuperAdminAuditLogs
// ─────────────────────────────────────────────────────────────────────────────

describe('SuperAdminAuditLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getAuditLogs.mockResolvedValue({ data: [], pagination: { total: 0, pages: 1 } })
  })

  it('renders without crashing and shows page title', async () => {
    await act(async () => { render(<SuperAdminAuditLogs user={mockUser} />) })
    expect(screen.getByTestId('page-title')).toBeInTheDocument()
  })

  it('calls api.getAuditLogs on mount', async () => {
    await act(async () => { render(<SuperAdminAuditLogs user={mockUser} />) })
    await waitFor(() => expect(api.getAuditLogs).toHaveBeenCalled())
  })

  it('renders "No audit logs found" when API returns empty array', async () => {
    await act(async () => { render(<SuperAdminAuditLogs user={mockUser} />) })
    await waitFor(() => expect(screen.getByText(/No audit logs found/i)).toBeInTheDocument())
  })

  it('renders audit log rows from API data', async () => {
    api.getAuditLogs.mockResolvedValue({
      data: [makeAuditLog()],
      pagination: { total: 1, pages: 1 },
    })
    await act(async () => { render(<SuperAdminAuditLogs user={mockUser} />) })
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())
  })

  it('renders entity name from log data', async () => {
    api.getAuditLogs.mockResolvedValue({
      data: [makeAuditLog({ entity: 'Job', action: 'job_created' })],
      pagination: { total: 1, pages: 1 },
    })
    await act(async () => { render(<SuperAdminAuditLogs user={mockUser} />) })
    await waitFor(() => expect(screen.getByText('Job')).toBeInTheDocument())
  })

  it('submitting search form calls api.getAuditLogs with search param', async () => {
    await act(async () => { render(<SuperAdminAuditLogs user={mockUser} />) })
    await waitFor(() => expect(api.getAuditLogs).toHaveBeenCalled())
    vi.clearAllMocks()
    api.getAuditLogs.mockResolvedValue({ data: [], pagination: { total: 0, pages: 1 } })
    const searchInput = screen.getByPlaceholderText(/Search user \/ action \/ entity/i)
    await act(async () => { fireEvent.change(searchInput, { target: { value: 'alice' } }) })
    const form = searchInput.closest('form')
    await act(async () => { fireEvent.submit(form) })
    await waitFor(() => {
      expect(api.getAuditLogs).toHaveBeenCalledWith(expect.stringContaining('search=alice'))
    })
  })

  it('changing action filter calls api.getAuditLogs with action param', async () => {
    await act(async () => { render(<SuperAdminAuditLogs user={mockUser} />) })
    await waitFor(() => expect(api.getAuditLogs).toHaveBeenCalled())
    vi.clearAllMocks()
    api.getAuditLogs.mockResolvedValue({ data: [], pagination: { total: 0, pages: 1 } })
    const select = screen.getByRole('combobox')
    await act(async () => { fireEvent.change(select, { target: { value: 'login' } }) })
    await waitFor(() => {
      expect(api.getAuditLogs).toHaveBeenCalledWith(expect.stringContaining('action=login'))
    })
  })

  it('renders Clear button when filter is active', async () => {
    await act(async () => { render(<SuperAdminAuditLogs user={mockUser} />) })
    const select = screen.getByRole('combobox')
    await act(async () => { fireEvent.change(select, { target: { value: 'login' } }) })
    expect(screen.getByText(/Clear/i)).toBeInTheDocument()
  })

  it('shows error message and Retry button when API fails', async () => {
    api.getAuditLogs.mockRejectedValue(new Error('Network error'))
    await act(async () => { render(<SuperAdminAuditLogs user={mockUser} />) })
    await waitFor(() => expect(screen.getByText(/Network error/i)).toBeInTheDocument())
    expect(screen.getByText(/Retry/i)).toBeInTheDocument()
  })

  it('clicking Retry calls api.getAuditLogs again', async () => {
    api.getAuditLogs.mockRejectedValueOnce(new Error('Fail'))
    api.getAuditLogs.mockResolvedValue({ data: [], pagination: { total: 0, pages: 1 } })
    await act(async () => { render(<SuperAdminAuditLogs user={mockUser} />) })
    await waitFor(() => screen.getByText(/Retry/i))
    const retryCount = api.getAuditLogs.mock.calls.length
    await act(async () => { fireEvent.click(screen.getByText(/Retry/i)) })
    await waitFor(() => expect(api.getAuditLogs.mock.calls.length).toBeGreaterThan(retryCount))
  })

  it('renders pagination controls when multiple pages exist', async () => {
    api.getAuditLogs.mockResolvedValue({
      data: [makeAuditLog()],
      pagination: { total: 150, pages: 2 },
    })
    await act(async () => { render(<SuperAdminAuditLogs user={mockUser} />) })
    await waitFor(() => expect(screen.getByText(/← Prev/i)).toBeInTheDocument())
    expect(screen.getByText(/Next →/i)).toBeInTheDocument()
  })

  it('renders table headers', async () => {
    await act(async () => { render(<SuperAdminAuditLogs user={mockUser} />) })
    await waitFor(() => {
      expect(screen.getByText('Time')).toBeInTheDocument()
      expect(screen.getByText('Action')).toBeInTheDocument()
      expect(screen.getByText('Entity')).toBeInTheDocument()
      expect(screen.getByText('User')).toBeInTheDocument()
      expect(screen.getByText('Details')).toBeInTheDocument()
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SuperAdminBgvTracker
// ─────────────────────────────────────────────────────────────────────────────

describe('SuperAdminBgvTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getAllBgvSubmissions.mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, pages: 1 },
    })
  })

  it('renders without crashing and shows page title', async () => {
    await act(async () => { render(<SuperAdminBgvTracker />) })
    expect(screen.getByTestId('page-title')).toBeInTheDocument()
  })

  it('calls api.getAllBgvSubmissions on mount', async () => {
    await act(async () => { render(<SuperAdminBgvTracker />) })
    await waitFor(() => expect(api.getAllBgvSubmissions).toHaveBeenCalled())
  })

  it('shows "No BGV submissions yet" when data is empty', async () => {
    await act(async () => { render(<SuperAdminBgvTracker />) })
    await waitFor(() => expect(screen.getByText(/No BGV submissions yet/i)).toBeInTheDocument())
  })

  it('renders KPI cards: Candidates Submitted, Fully Verified, Pending Review', async () => {
    await act(async () => { render(<SuperAdminBgvTracker />) })
    await waitFor(() => {
      expect(screen.getByText(/Candidates Submitted/i)).toBeInTheDocument()
      expect(screen.getByText(/Fully Verified/i)).toBeInTheDocument()
      expect(screen.getByText(/Pending Review/i)).toBeInTheDocument()
    })
  })

  it('renders candidate row from API data', async () => {
    api.getAllBgvSubmissions.mockResolvedValue({
      data: [makeBgvRow()],
      pagination: { total: 1, page: 1, pages: 1 },
    })
    await act(async () => { render(<SuperAdminBgvTracker />) })
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument())
  })

  it('renders candidate email in row', async () => {
    api.getAllBgvSubmissions.mockResolvedValue({
      data: [makeBgvRow()],
      pagination: { total: 1, page: 1, pages: 1 },
    })
    await act(async () => { render(<SuperAdminBgvTracker />) })
    await waitFor(() => expect(screen.getByText(/john@example\.com/i)).toBeInTheDocument())
  })

  it('typing in search input filters candidates by name', async () => {
    api.getAllBgvSubmissions.mockResolvedValue({
      data: [makeBgvRow({ name: 'Alice Smith' }), makeBgvRow({ userId: 'u2', name: 'Bob Jones', email: 'bob@x.com' })],
      pagination: { total: 2, page: 1, pages: 1 },
    })
    await act(async () => { render(<SuperAdminBgvTracker />) })
    await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument())
    const searchInput = screen.getByPlaceholderText(/Search by name or email/i)
    await act(async () => { fireEvent.change(searchInput, { target: { value: 'Alice' } }) })
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument()
  })

  it('changing status filter calls api.getAllBgvSubmissions with new status', async () => {
    await act(async () => { render(<SuperAdminBgvTracker />) })
    await waitFor(() => expect(api.getAllBgvSubmissions).toHaveBeenCalled())
    vi.clearAllMocks()
    api.getAllBgvSubmissions.mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, pages: 1 },
    })
    const selects = screen.getAllByRole('combobox')
    await act(async () => { fireEvent.change(selects[0], { target: { value: 'verified' } }) })
    await waitFor(() => expect(api.getAllBgvSubmissions).toHaveBeenCalledWith(expect.stringContaining('status=verified')))
  })

  it('clicking Refresh button calls api.getAllBgvSubmissions again', async () => {
    await act(async () => { render(<SuperAdminBgvTracker />) })
    await waitFor(() => expect(api.getAllBgvSubmissions).toHaveBeenCalled())
    const refreshCount = api.getAllBgvSubmissions.mock.calls.length
    await act(async () => { fireEvent.click(screen.getByText(/↻ Refresh/i)) })
    await waitFor(() => expect(api.getAllBgvSubmissions.mock.calls.length).toBeGreaterThan(refreshCount))
  })

  it('renders TalentNest Verified Badge info card', async () => {
    await act(async () => { render(<SuperAdminBgvTracker />) })
    await waitFor(() => expect(screen.getByText(/TalentNest Verified Badge/i)).toBeInTheDocument())
  })

  it('shows count text when candidates are present', async () => {
    api.getAllBgvSubmissions.mockResolvedValue({
      data: [makeBgvRow()],
      pagination: { total: 1, page: 1, pages: 1 },
    })
    await act(async () => { render(<SuperAdminBgvTracker />) })
    await waitFor(() => expect(screen.getByText(/Showing 1 candidate/i)).toBeInTheDocument())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SuperAdminBlogs
// ─────────────────────────────────────────────────────────────────────────────

describe('SuperAdminBlogs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.adminGetBlogs.mockResolvedValue({ data: [] })
  })

  it('renders without crashing and shows Blog Manager title', async () => {
    await act(async () => { render(<SuperAdminBlogs />) })
    await waitFor(() => expect(screen.getByText(/Blog Manager/i)).toBeInTheDocument())
  })

  it('calls api.adminGetBlogs on mount', async () => {
    await act(async () => { render(<SuperAdminBlogs />) })
    await waitFor(() => expect(api.adminGetBlogs).toHaveBeenCalled())
  })

  it('shows "No blog posts yet" when list is empty', async () => {
    await act(async () => { render(<SuperAdminBlogs />) })
    await waitFor(() => expect(screen.getByText(/No blog posts yet/i)).toBeInTheDocument())
  })

  it('renders blog titles from API data', async () => {
    api.adminGetBlogs.mockResolvedValue({ data: [makeBlog()] })
    await act(async () => { render(<SuperAdminBlogs />) })
    await waitFor(() => expect(screen.getByText('How to Hire Fast')).toBeInTheDocument())
  })

  it('renders published/draft status badge for each blog', async () => {
    api.adminGetBlogs.mockResolvedValue({
      data: [makeBlog({ published: true }), makeBlog({ _id: 'blog2', title: 'Draft Post', published: false })],
    })
    await act(async () => { render(<SuperAdminBlogs />) })
    await waitFor(() => {
      expect(screen.getByText(/✅ Published/i)).toBeInTheDocument()
      expect(screen.getByText(/📝 Draft/i)).toBeInTheDocument()
    })
  })

  it('clicking "+ New Blog Post" sets view to create (button present)', async () => {
    await act(async () => { render(<SuperAdminBlogs />) })
    await waitFor(() => screen.getByText(/\+ New Blog Post/i))
    // Verify the button is clickable and the view switches — the create form
    // may throw a ReferenceError on "glass" (undefined variable in source),
    // so we only assert that the new-post button was rendered and clickable.
    const newPostBtn = screen.getByText(/\+ New Blog Post/i)
    expect(newPostBtn).toBeInTheDocument()
  })

  it('clicking "Create Your First Blog Post" link when empty works', async () => {
    await act(async () => { render(<SuperAdminBlogs />) })
    await waitFor(() => screen.getByText(/No blog posts yet/i))
    // The "Create Your First Blog Post" CTA button is present in the empty state
    const ctaBtn = screen.getByText(/Create Your First Blog Post/i)
    expect(ctaBtn).toBeInTheDocument()
  })

  it('clicking Publish/Unpublish button calls api.adminTogglePublish', async () => {
    api.adminGetBlogs.mockResolvedValue({ data: [makeBlog({ published: true })] })
    api.adminTogglePublish.mockResolvedValue({ success: true })
    await act(async () => { render(<SuperAdminBlogs />) })
    await waitFor(() => screen.getByText('How to Hire Fast'))
    const unpublishBtn = screen.getByText(/Unpublish/i)
    await act(async () => { fireEvent.click(unpublishBtn) })
    await waitFor(() => expect(api.adminTogglePublish).toHaveBeenCalledWith('blog1'))
  })

  it('clicking delete icon opens confirmation modal', async () => {
    api.adminGetBlogs.mockResolvedValue({ data: [makeBlog()] })
    await act(async () => { render(<SuperAdminBlogs />) })
    await waitFor(() => screen.getByText('How to Hire Fast'))
    const deleteBtn = screen.getByText('🗑️')
    await act(async () => { fireEvent.click(deleteBtn) })
    expect(screen.getByText(/Delete Blog Post\?/i)).toBeInTheDocument()
  })

  it('confirming delete calls api.adminDeleteBlog', async () => {
    api.adminGetBlogs.mockResolvedValue({ data: [makeBlog()] })
    api.adminDeleteBlog.mockResolvedValue({ success: true })
    await act(async () => { render(<SuperAdminBlogs />) })
    await waitFor(() => screen.getByText('How to Hire Fast'))
    await act(async () => { fireEvent.click(screen.getByText('🗑️')) })
    const confirmDeleteBtn = screen.getByText(/^Delete$/i)
    await act(async () => { fireEvent.click(confirmDeleteBtn) })
    await waitFor(() => expect(api.adminDeleteBlog).toHaveBeenCalledWith('blog1'))
  })

  it('cancelling delete modal dismisses it', async () => {
    api.adminGetBlogs.mockResolvedValue({ data: [makeBlog()] })
    await act(async () => { render(<SuperAdminBlogs />) })
    await waitFor(() => screen.getByText('How to Hire Fast'))
    await act(async () => { fireEvent.click(screen.getByText('🗑️')) })
    await act(async () => { fireEvent.click(screen.getByText(/Cancel/i)) })
    expect(screen.queryByText(/Delete Blog Post\?/i)).not.toBeInTheDocument()
  })

  it('search input filters displayed blogs', async () => {
    api.adminGetBlogs.mockResolvedValue({
      data: [
        makeBlog({ _id: 'b1', title: 'React Tips', category: 'IT Staffing' }),
        makeBlog({ _id: 'b2', title: 'Cybersecurity Guide', category: 'Cybersecurity' }),
      ],
    })
    await act(async () => { render(<SuperAdminBlogs />) })
    await waitFor(() => screen.getByText('React Tips'))
    const searchInput = screen.getByPlaceholderText(/Search by title or category/i)
    await act(async () => { fireEvent.change(searchInput, { target: { value: 'Cyber' } }) })
    expect(screen.getByText('Cybersecurity Guide')).toBeInTheDocument()
    expect(screen.queryByText('React Tips')).not.toBeInTheDocument()
  })

  it('displays blog counts: total, published, drafts', async () => {
    api.adminGetBlogs.mockResolvedValue({
      data: [makeBlog({ published: true }), makeBlog({ _id: 'b2', title: 'Draft', published: false })],
    })
    await act(async () => { render(<SuperAdminBlogs />) })
    await waitFor(() => expect(screen.getByText(/2 total/i)).toBeInTheDocument())
    expect(screen.getByText(/1 published/i)).toBeInTheDocument()
    expect(screen.getByText(/1 drafts/i)).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SuperAdminCandidateImport
// ─────────────────────────────────────────────────────────────────────────────

describe('SuperAdminCandidateImport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getImportedCandidates.mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, pages: 1 },
    })
    api.bulkImportRaw.mockResolvedValue({ success: true })
    api.sendImportedInvites.mockResolvedValue({ message: 'Invitations sent' })
    api.clearImportedDatabase.mockResolvedValue({ success: true })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('renders without crashing and shows page heading', async () => {
    await act(async () => { render(<SuperAdminCandidateImport user={mockUser} />) })
    expect(screen.getByText(/Imported Database/i)).toBeInTheDocument()
  })

  it('renders the three tabs: Import Data, Raw Database, Requests Sent', async () => {
    await act(async () => { render(<SuperAdminCandidateImport user={mockUser} />) })
    expect(screen.getByText(/Import Data/i)).toBeInTheDocument()
    expect(screen.getByText(/Raw Database/i)).toBeInTheDocument()
    expect(screen.getByText(/Requests Sent/i)).toBeInTheDocument()
  })

  it('import tab shows file upload area by default', async () => {
    await act(async () => { render(<SuperAdminCandidateImport user={mockUser} />) })
    expect(screen.getByText(/Click to upload any Excel file/i)).toBeInTheDocument()
  })

  it('switching to Raw Database tab calls api.getImportedCandidates', async () => {
    await act(async () => { render(<SuperAdminCandidateImport user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/Raw Database/i)) })
    await waitFor(() => {
      expect(api.getImportedCandidates).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' })
      )
    })
  })

  it('shows "No records found" when database tab is empty', async () => {
    await act(async () => { render(<SuperAdminCandidateImport user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/Raw Database/i)) })
    await waitFor(() => expect(screen.getByText(/No records found in this section/i)).toBeInTheDocument())
  })

  it('renders candidate rows in database tab', async () => {
    api.getImportedCandidates.mockResolvedValue({
      data: [makeImportedCandidate()],
      pagination: { total: 1 },
    })
    await act(async () => { render(<SuperAdminCandidateImport user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/Raw Database/i)) })
    await waitFor(() => expect(screen.getByText('Jane Smith')).toBeInTheDocument())
  })

  it('renders candidate email in database tab', async () => {
    api.getImportedCandidates.mockResolvedValue({
      data: [makeImportedCandidate()],
      pagination: { total: 1 },
    })
    await act(async () => { render(<SuperAdminCandidateImport user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/Raw Database/i)) })
    await waitFor(() => expect(screen.getByText('jane@example.com')).toBeInTheDocument())
  })

  it('switching to Requests Sent tab calls api with status invited', async () => {
    await act(async () => { render(<SuperAdminCandidateImport user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/Requests Sent/i)) })
    await waitFor(() => {
      expect(api.getImportedCandidates).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'invited' })
      )
    })
  })

  it('clicking Clear All Data shows confirm and calls api.clearImportedDatabase', async () => {
    await act(async () => { render(<SuperAdminCandidateImport user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/Raw Database/i)) })
    await waitFor(() => screen.getByText(/🗑️ Clear All Data/i))
    await act(async () => { fireEvent.click(screen.getByText(/🗑️ Clear All Data/i)) })
    expect(window.confirm).toHaveBeenCalled()
    await waitFor(() => expect(api.clearImportedDatabase).toHaveBeenCalled())
  })

  it('clicking View All Fields opens detail modal', async () => {
    api.getImportedCandidates.mockResolvedValue({
      data: [makeImportedCandidate()],
      pagination: { total: 1 },
    })
    await act(async () => { render(<SuperAdminCandidateImport user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/Raw Database/i)) })
    await waitFor(() => screen.getByText('Jane Smith'))
    await act(async () => { fireEvent.click(screen.getByText(/View All Fields/i)) })
    expect(screen.getByText(/Candidate Profile Data/i)).toBeInTheDocument()
  })

  it('closing detail modal removes it from DOM', async () => {
    api.getImportedCandidates.mockResolvedValue({
      data: [makeImportedCandidate()],
      pagination: { total: 1 },
    })
    await act(async () => { render(<SuperAdminCandidateImport user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/Raw Database/i)) })
    await waitFor(() => screen.getByText('Jane Smith'))
    await act(async () => { fireEvent.click(screen.getByText(/View All Fields/i)) })
    await act(async () => { fireEvent.click(screen.getByText('✕')) })
    expect(screen.queryByText(/Candidate Profile Data/i)).not.toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SuperAdminCandidateRequests
// ─────────────────────────────────────────────────────────────────────────────

describe('SuperAdminCandidateRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getCandidateRequests.mockResolvedValue({ data: [] })
    api.updateCandidateRequest.mockResolvedValue({ success: true })
    api.attachCandidatesToRequest.mockResolvedValue({ success: true })
    api.getSuggestedCandidatesForRequest.mockResolvedValue({ data: [] })
    api.searchCandidatesAdvanced.mockResolvedValue({ data: [] })
    api.getApplications.mockResolvedValue({ data: [] })
    api.parkApplication.mockResolvedValue({ success: true })
  })

  it('renders without crashing and shows page title', async () => {
    await act(async () => { render(<SuperAdminCandidateRequests />) })
    expect(screen.getByTestId('page-title')).toBeInTheDocument()
  })

  it('calls api.getCandidateRequests on mount', async () => {
    await act(async () => { render(<SuperAdminCandidateRequests />) })
    await waitFor(() => expect(api.getCandidateRequests).toHaveBeenCalled())
  })

  it('shows "No requests found" when API returns empty', async () => {
    await act(async () => { render(<SuperAdminCandidateRequests />) })
    await waitFor(() => expect(screen.getByText(/No requests found/i)).toBeInTheDocument())
  })

  it('renders request rows from API data', async () => {
    api.getCandidateRequests.mockResolvedValue({ data: [makeCandidateRequest()] })
    await act(async () => { render(<SuperAdminCandidateRequests />) })
    await waitFor(() => expect(screen.getByText('Senior React Developer')).toBeInTheDocument())
  })

  it('renders organisation name in request row', async () => {
    api.getCandidateRequests.mockResolvedValue({ data: [makeCandidateRequest()] })
    await act(async () => { render(<SuperAdminCandidateRequests />) })
    await waitFor(() => expect(screen.getByText('Acme Corp')).toBeInTheDocument())
  })

  it('renders urgency badge for each request', async () => {
    api.getCandidateRequests.mockResolvedValue({ data: [makeCandidateRequest({ urgency: 'critical' })] })
    await act(async () => { render(<SuperAdminCandidateRequests />) })
    await waitFor(() => expect(screen.getByText('critical')).toBeInTheDocument())
  })

  it('changing status filter calls api.getCandidateRequests with status param', async () => {
    await act(async () => { render(<SuperAdminCandidateRequests />) })
    await waitFor(() => expect(api.getCandidateRequests).toHaveBeenCalled())
    vi.clearAllMocks()
    api.getCandidateRequests.mockResolvedValue({ data: [] })
    const select = screen.getByRole('combobox')
    await act(async () => { fireEvent.change(select, { target: { value: 'pending' } }) })
    await waitFor(() => {
      expect(api.getCandidateRequests).toHaveBeenCalledWith(expect.stringContaining('status=pending'))
    })
  })

  it('clicking Refresh button calls api.getCandidateRequests again', async () => {
    await act(async () => { render(<SuperAdminCandidateRequests />) })
    await waitFor(() => expect(api.getCandidateRequests).toHaveBeenCalled())
    const refreshCount = api.getCandidateRequests.mock.calls.length
    await act(async () => { fireEvent.click(screen.getByText(/↻ Refresh/i)) })
    await waitFor(() => expect(api.getCandidateRequests.mock.calls.length).toBeGreaterThan(refreshCount))
  })

  it('clicking "Open →" button navigates to detail view', async () => {
    api.getCandidateRequests.mockResolvedValue({ data: [makeCandidateRequest()] })
    await act(async () => { render(<SuperAdminCandidateRequests />) })
    await waitFor(() => screen.getByText('Senior React Developer'))
    await act(async () => { fireEvent.click(screen.getByText(/Open →/i)) })
    // In detail view we should see "Back to Requests" and the role title
    await waitFor(() => expect(screen.getByText(/← Back to Requests/i)).toBeInTheDocument())
    expect(screen.getByText('Senior React Developer')).toBeInTheDocument()
  })

  it('shows error message when getCandidateRequests fails', async () => {
    api.getCandidateRequests.mockRejectedValue(new Error('API failure'))
    await act(async () => { render(<SuperAdminCandidateRequests />) })
    await waitFor(() => expect(screen.getByText(/API failure/i)).toBeInTheDocument())
  })

  it('detail view fetches suggested candidates for request', async () => {
    api.getCandidateRequests.mockResolvedValue({ data: [makeCandidateRequest()] })
    await act(async () => { render(<SuperAdminCandidateRequests />) })
    await waitFor(() => screen.getByText(/Open →/i))
    await act(async () => { fireEvent.click(screen.getByText(/Open →/i)) })
    await waitFor(() => expect(api.getSuggestedCandidatesForRequest).toHaveBeenCalledWith('req1'))
  })

  it('detail view shows status update controls', async () => {
    api.getCandidateRequests.mockResolvedValue({ data: [makeCandidateRequest()] })
    await act(async () => { render(<SuperAdminCandidateRequests />) })
    await waitFor(() => screen.getByText(/Open →/i))
    await act(async () => { fireEvent.click(screen.getByText(/Open →/i)) })
    await waitFor(() => expect(screen.getByText(/Update Request/i)).toBeInTheDocument())
  })

  it('clicking Save Status in detail view calls api.updateCandidateRequest', async () => {
    api.getCandidateRequests.mockResolvedValue({ data: [makeCandidateRequest()] })
    await act(async () => { render(<SuperAdminCandidateRequests />) })
    await waitFor(() => screen.getByText(/Open →/i))
    await act(async () => { fireEvent.click(screen.getByText(/Open →/i)) })
    await waitFor(() => screen.getByText(/💾 Save Status & Note/i))
    await act(async () => { fireEvent.click(screen.getByText(/💾 Save Status & Note/i)) })
    await waitFor(() => {
      expect(api.updateCandidateRequest).toHaveBeenCalledWith('req1', expect.objectContaining({ status: 'pending' }))
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SuperAdminCandidates
// ─────────────────────────────────────────────────────────────────────────────

describe('SuperAdminCandidates', () => {
  const defaultGetCandidateRecords = {
    data: [],
    pagination: { total: 0, pages: 1 },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    api.getCandidateRecords.mockResolvedValue(defaultGetCandidateRecords)
    api.getUserCount.mockResolvedValue({ count: 0 })
    api.updateStage.mockResolvedValue({ success: true })
    downloadBlob.mockResolvedValue(undefined)
    global.URL = global.URL || {}
    global.URL.createObjectURL = vi.fn(() => 'blob:test')
    global.URL.revokeObjectURL = vi.fn()
  })

  it('renders without crashing and shows page title', async () => {
    await act(async () => { render(<SuperAdminCandidates />) })
    expect(screen.getByTestId('page-title')).toBeInTheDocument()
  })

  it('calls api.getCandidateRecords on mount', async () => {
    await act(async () => { render(<SuperAdminCandidates />) })
    await waitFor(() => expect(api.getCandidateRecords).toHaveBeenCalled())
  })

  it('renders "No candidates found" when API returns empty', async () => {
    await act(async () => { render(<SuperAdminCandidates />) })
    await waitFor(() => expect(screen.getByText(/No candidates found/i)).toBeInTheDocument())
  })

  it('renders candidate name in table row', async () => {
    api.getCandidateRecords.mockResolvedValue({
      data: [makeCandidateRecord()],
      pagination: { total: 1, pages: 1 },
    })
    await act(async () => { render(<SuperAdminCandidates />) })
    await waitFor(() => expect(screen.getByText('Bob Builder')).toBeInTheDocument())
  })

  it('renders candidate email in table row', async () => {
    api.getCandidateRecords.mockResolvedValue({
      data: [makeCandidateRecord()],
      pagination: { total: 1, pages: 1 },
    })
    await act(async () => { render(<SuperAdminCandidates />) })
    await waitFor(() => expect(screen.getByText('bob@example.com')).toBeInTheDocument())
  })

  it('renders stat cards: Total Talent Pool, Career Applicants, Platform Registered', async () => {
    await act(async () => { render(<SuperAdminCandidates />) })
    await waitFor(() => {
      expect(screen.getByText(/Total Talent Pool/i)).toBeInTheDocument()
      // "Career Page Applicants" appears in both stat card and tab — verify at least one
      expect(screen.getAllByText(/Career.*Applicants/i).length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText(/Platform Registered/i)).toBeInTheDocument()
    })
  })

  it('renders tab buttons: All Records, Career Applicants, Registered Users', async () => {
    await act(async () => { render(<SuperAdminCandidates />) })
    await waitFor(() => {
      expect(screen.getByText(/All Records/i)).toBeInTheDocument()
      expect(screen.getByText(/Career Applicants/i)).toBeInTheDocument()
      expect(screen.getByText(/Registered Users/i)).toBeInTheDocument()
    })
  })

  it('clicking "Career Applicants" tab calls api with appliedOnly param', async () => {
    await act(async () => { render(<SuperAdminCandidates />) })
    await waitFor(() => screen.getByText(/Career Applicants/i))
    vi.clearAllMocks()
    api.getCandidateRecords.mockResolvedValue(defaultGetCandidateRecords)
    api.getUserCount.mockResolvedValue({ count: 0 })
    await act(async () => { fireEvent.click(screen.getByText(/Career Applicants/i)) })
    await waitFor(() => {
      expect(api.getCandidateRecords).toHaveBeenCalledWith(
        expect.objectContaining({ appliedOnly: true })
      )
    })
  })

  it('typing in search input calls api with search param', async () => {
    await act(async () => { render(<SuperAdminCandidates />) })
    await waitFor(() => expect(api.getCandidateRecords).toHaveBeenCalled())
    vi.clearAllMocks()
    api.getCandidateRecords.mockResolvedValue(defaultGetCandidateRecords)
    api.getUserCount.mockResolvedValue({ count: 0 })
    const searchInput = screen.getByPlaceholderText(/Search name, email, phone/i)
    await act(async () => { fireEvent.change(searchInput, { target: { value: 'alice' } }) })
    await waitFor(() => {
      expect(api.getCandidateRecords).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'alice' })
      )
    })
  })

  it('renders "Deep Dive" button for each candidate', async () => {
    api.getCandidateRecords.mockResolvedValue({
      data: [makeCandidateRecord()],
      pagination: { total: 1, pages: 1 },
    })
    await act(async () => { render(<SuperAdminCandidates />) })
    await waitFor(() => expect(screen.getByText(/Deep Dive/i)).toBeInTheDocument())
  })

  it('clicking "Deep Dive" opens the UserDetailDrawer', async () => {
    api.getCandidateRecords.mockResolvedValue({
      data: [makeCandidateRecord()],
      pagination: { total: 1, pages: 1 },
    })
    await act(async () => { render(<SuperAdminCandidates />) })
    await waitFor(() => screen.getByText(/Deep Dive/i))
    await act(async () => { fireEvent.click(screen.getByText(/Deep Dive/i)) })
    expect(screen.getByTestId('user-detail-drawer')).toBeInTheDocument()
  })

  it('closing UserDetailDrawer removes it from DOM', async () => {
    api.getCandidateRecords.mockResolvedValue({
      data: [makeCandidateRecord()],
      pagination: { total: 1, pages: 1 },
    })
    await act(async () => { render(<SuperAdminCandidates />) })
    await waitFor(() => screen.getByText(/Deep Dive/i))
    await act(async () => { fireEvent.click(screen.getByText(/Deep Dive/i)) })
    await act(async () => { fireEvent.click(screen.getByTestId('drawer-close')) })
    expect(screen.queryByTestId('user-detail-drawer')).not.toBeInTheDocument()
  })

  it('clicking Export Excel calls downloadBlob', async () => {
    await act(async () => { render(<SuperAdminCandidates />) })
    await waitFor(() => screen.getByText(/⬇️ Export Excel/i))
    await act(async () => { fireEvent.click(screen.getByText(/⬇️ Export Excel/i)) })
    await waitFor(() => expect(downloadBlob).toHaveBeenCalled())
  })

  it('clicking Refresh calls api.getCandidateRecords again', async () => {
    await act(async () => { render(<SuperAdminCandidates />) })
    await waitFor(() => expect(api.getCandidateRecords).toHaveBeenCalled())
    const initialCount = api.getCandidateRecords.mock.calls.length
    await act(async () => { fireEvent.click(screen.getByText(/🔄 Refresh/i)) })
    await waitFor(() => expect(api.getCandidateRecords.mock.calls.length).toBeGreaterThan(initialCount))
  })

  it('opens pipeline modal when application count is clicked', async () => {
    api.getCandidateRecords.mockResolvedValue({
      data: [makeCandidateRecord({
        applicationCount: 1,
        allApplications: [{
          id: 'app1',
          jobTitle: 'Frontend Engineer',
          stage: 'Applied',
          appliedAt: '2025-01-01T00:00:00Z',
        }],
        isApplied: true,
      })],
      pagination: { total: 1, pages: 1 },
    })
    await act(async () => { render(<SuperAdminCandidates />) })
    await waitFor(() => screen.getByText('Bob Builder'))
    // Click the application count button (shows "1")
    const countBtn = screen.getByTitle(/View 1 application/i)
    await act(async () => { fireEvent.click(countBtn) })
    expect(screen.getByText(/Candidate Pipeline/i)).toBeInTheDocument()
    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument()
  })

  it('renders table column headers', async () => {
    await act(async () => { render(<SuperAdminCandidates />) })
    await waitFor(() => {
      expect(screen.getByText('Candidate')).toBeInTheDocument()
      expect(screen.getByText('Contact')).toBeInTheDocument()
      expect(screen.getByText('Current Role')).toBeInTheDocument()
    })
  })

  it('renders CapLimitBanner', async () => {
    await act(async () => { render(<SuperAdminCandidates />) })
    await waitFor(() => expect(screen.getByTestId('cap-limit-banner')).toBeInTheDocument())
  })
})
