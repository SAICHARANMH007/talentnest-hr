import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── All vi.mock() calls MUST come before imports ──────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: 'id1', orgId: 'org1' }),
  useLocation: () => ({ pathname: '/superadmin', search: '', state: null }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  NavLink: ({ children, to }) => <a href={to}>{children}</a>,
}))

vi.mock('../../api/api.js', () => ({
  api: {
    // SuperAdminPlatform
    getOrgs: vi.fn(),
    getAuditLogs: vi.fn(),
    getUserCount: vi.fn(),
    getJobs: vi.fn(),
    getApplications: vi.fn(),
    getPlatformRevenue: vi.fn(),
    getOrgHealth: vi.fn(),
    getSystemHealth: vi.fn(),
    downloadBackup: vi.fn(),
    broadcastAnnouncement: vi.fn(),
    // SuperAdminPlatformReferrals
    getAdminPlatformReferralStats: vi.fn(),
    getAdminPlatformReferrals: vi.fn(),
    // SuperAdminPlaybooks (no direct api calls — just Toast)
    // SuperAdminReportedPosts
    getReportedPosts: vi.fn(),
    deleteReportedPost: vi.fn(),
    dismissReport: vi.fn(),
    // SuperAdminSecurity
    getPlatformConfig: vi.fn(),
    savePlatformFlags: vi.fn(),
    savePlatformSecurity: vi.fn(),
    updateOrg: vi.fn(),
    impersonate: vi.fn(),
    stopImpersonate: vi.fn(),
    // SuperAdminUnregisteredCandidates
    getUnregisteredStats: vi.fn(),
    getUnregisteredCandidates: vi.fn(),
    getUsersList: vi.fn(),
    assignCandidatesToJob: vi.fn(),
    assignCandidate: vi.fn(),
    inviteGuestCandidates: vi.fn(),
    updateCandidate: vi.fn(),
    // CreateOrganisationPage
    createOrg: vi.fn(),
    uploadFeedImage: vi.fn(),
  },
}))

vi.mock('../../api/client.js', () => ({
  req: vi.fn(),
  getToken: vi.fn(() => 'mock-token'),
  setToken: vi.fn(),
  clearToken: vi.fn(),
}))

vi.mock('../../api/config.js', () => ({
  API_BASE_URL: 'http://localhost:3001',
}))

vi.mock('../../utils/audit.js', () => ({
  logAudit: vi.fn(),
  getAuditLog: vi.fn(() => []),
}))

vi.mock('../../constants/styles.js', () => ({
  card: {},
  btnP: {},
  btnG: {},
  btnD: {},
  inp: {},
  glassCard: {},
}))

vi.mock('../../components/ui/Toast.jsx', () => ({
  default: ({ msg, onClose }) =>
    msg ? <div data-testid="toast" onClick={onClose}>{msg}</div> : null,
}))

vi.mock('../../components/ui/Spinner.jsx', () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
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
  default: ({ label, value, onChange, placeholder, options, required, type }) => {
    if (options) {
      return (
        <div>
          <label>{label}{required && ' *'}</label>
          <select
            data-testid={`field-select-${(label || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`}
            value={value || ''}
            onChange={e => onChange && onChange(e.target.value)}
          >
            {(options || []).map(o => (
              <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
            ))}
          </select>
        </div>
      )
    }
    return (
      <div>
        <label>{label}{required && ' *'}</label>
        <input
          data-testid={`field-input-${(label || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`}
          type={type || 'text'}
          value={value || ''}
          onChange={e => onChange && onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    )
  },
}))

vi.mock('../../components/ui/FormRow.jsx', () => ({
  default: ({ children }) => <div data-testid="form-row">{children}</div>,
}))

vi.mock('../../components/LogoManager.jsx', () => ({
  default: () => <div data-testid="logo-manager">LogoManager</div>,
}))

vi.mock('../../components/shared/TrendCard.jsx', () => ({
  default: ({ label, value }) => (
    <div data-testid="trend-card">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
}))

vi.mock('../../components/charts/WorldMap.jsx', () => ({
  default: () => <div data-testid="world-map">WorldMap</div>,
}))

// ── Now import the page components AFTER all mocks ────────────────────────────
import SuperAdminPlatform from '../../pages/superadmin/SuperAdminPlatform.jsx'
import SuperAdminPlatformReferrals from '../../pages/superadmin/SuperAdminPlatformReferrals.jsx'
import SuperAdminPlaybooks from '../../pages/superadmin/SuperAdminPlaybooks.jsx'
import SuperAdminReportedPosts from '../../pages/superadmin/SuperAdminReportedPosts.jsx'
import SuperAdminSecurity from '../../pages/superadmin/SuperAdminSecurity.jsx'
import SuperAdminUnregisteredCandidates from '../../pages/superadmin/SuperAdminUnregisteredCandidates.jsx'
import CreateOrganisationPage from '../../pages/superadmin/CreateOrganisationPage.jsx'
import { api } from '../../api/api.js'
import { req } from '../../api/client.js'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeOrg(overrides = {}) {
  return {
    id: 'org1',
    _id: 'org1',
    name: 'Acme Corp',
    domain: 'acme.com',
    plan: 'trial',
    status: 'active',
    industry: 'Technology',
    size: '51-200',
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeAuditLog(overrides = {}) {
  return {
    _id: 'log1',
    action: 'login',
    userName: 'Alice',
    message: 'Logged in',
    createdAt: new Date().toISOString(),
    targetId: 'target1',
    ...overrides,
  }
}

function makeReferral(overrides = {}) {
  return {
    _id: 'ref1',
    referrerName: 'Bob Smith',
    referrerEmail: 'bob@example.com',
    referredName: 'Carol White',
    referredEmail: 'carol@example.com',
    status: 'active',
    coinsAwarded: 25,
    createdAt: '2024-03-15T00:00:00Z',
    ...overrides,
  }
}

function makeReportedGroup(overrides = {}) {
  return {
    post: {
      _id: 'post1',
      authorName: 'PostAuthor',
      authorRole: 'candidate',
      content: 'This is flagged post content',
      createdAt: new Date().toISOString(),
      communitySlug: 'general',
    },
    reports: [
      {
        _id: 'report1',
        reason: 'spam',
        reporterName: 'Reporter One',
        reporterRole: 'recruiter',
        details: 'This looks like spam',
        createdAt: new Date().toISOString(),
      },
    ],
    ...overrides,
  }
}

function makeGuestRow(overrides = {}) {
  return {
    email: 'guest@example.com',
    name: 'Guest User',
    phone: '9876543210',
    title: 'Software Engineer',
    currentCompany: 'Tech Co',
    source: 'career_page',
    jobCount: 2,
    candidateIds: ['cid1'],
    accountInviteSentAt: null,
    accountRequestSent: false,
    applications: [],
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SuperAdminPlatform
// ─────────────────────────────────────────────────────────────────────────────

describe('SuperAdminPlatform', () => {
  const mockOnNavigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    api.getOrgs.mockResolvedValue([])
    api.getAuditLogs.mockResolvedValue([])
    api.getUserCount.mockResolvedValue(0)
    api.getJobs.mockResolvedValue({ pagination: { total: 0 } })
    api.getApplications.mockResolvedValue({ pagination: { total: 0 } })
    api.getPlatformRevenue.mockResolvedValue(null)
    api.getOrgHealth.mockResolvedValue({ data: [] })
    api.downloadBackup.mockResolvedValue(undefined)
    api.broadcastAnnouncement.mockResolvedValue({ data: { sent: 5, failed: 0, total: 5 } })
    req.mockResolvedValue({ message: 'Deduplicated 3 jobs' })
  })

  it('renders without crashing and shows Platform Overview heading', async () => {
    await act(async () => { render(<SuperAdminPlatform onNavigate={mockOnNavigate} />) })
    await waitFor(() =>
      expect(screen.getByText(/Platform Overview/i)).toBeInTheDocument()
    )
  })

  it('calls all required API methods on mount', async () => {
    await act(async () => { render(<SuperAdminPlatform onNavigate={mockOnNavigate} />) })
    await waitFor(() => {
      expect(api.getOrgs).toHaveBeenCalled()
      expect(api.getAuditLogs).toHaveBeenCalled()
      expect(api.getUserCount).toHaveBeenCalled()
      expect(api.getPlatformRevenue).toHaveBeenCalled()
      expect(api.getOrgHealth).toHaveBeenCalled()
    })
  })

  it('shows KPI trend cards after loading', async () => {
    await act(async () => { render(<SuperAdminPlatform onNavigate={mockOnNavigate} />) })
    await waitFor(() => {
      const cards = screen.getAllByTestId('trend-card')
      expect(cards.length).toBeGreaterThan(0)
    })
  })

  it('shows "No recent activity detected" when audit logs are empty', async () => {
    await act(async () => { render(<SuperAdminPlatform onNavigate={mockOnNavigate} />) })
    await waitFor(() =>
      expect(screen.getByText(/No recent activity detected/i)).toBeInTheDocument()
    )
  })

  it('renders audit log entries when API returns data', async () => {
    api.getAuditLogs.mockResolvedValue([makeAuditLog({ userName: 'Alice Superstar' })])
    await act(async () => { render(<SuperAdminPlatform onNavigate={mockOnNavigate} />) })
    await waitFor(() =>
      expect(screen.getByText('Alice Superstar')).toBeInTheDocument()
    )
  })

  it('clicking Download Backup button calls api.downloadBackup', async () => {
    await act(async () => { render(<SuperAdminPlatform onNavigate={mockOnNavigate} />) })
    await waitFor(() => screen.getByText(/Download Backup/i))
    await act(async () => {
      fireEvent.click(screen.getByText(/Download Backup/i))
    })
    await waitFor(() => expect(api.downloadBackup).toHaveBeenCalledTimes(1))
  })

  it('clicking Run Deduplication button calls req POST endpoint', async () => {
    await act(async () => { render(<SuperAdminPlatform onNavigate={mockOnNavigate} />) })
    await waitFor(() => screen.getByText(/Run Deduplication/i))
    await act(async () => {
      fireEvent.click(screen.getByText(/Run Deduplication/i))
    })
    await waitFor(() =>
      expect(req).toHaveBeenCalledWith('POST', '/admin/deduplicate-jobs')
    )
  })

  it('shows dedup result message after running deduplication', async () => {
    req.mockResolvedValue({ message: 'Merged 5 duplicate jobs' })
    await act(async () => { render(<SuperAdminPlatform onNavigate={mockOnNavigate} />) })
    await waitFor(() => screen.getByText(/Run Deduplication/i))
    await act(async () => {
      fireEvent.click(screen.getByText(/Run Deduplication/i))
    })
    await waitFor(() =>
      expect(screen.getAllByText(/Merged 5 duplicate jobs/i).length).toBeGreaterThan(0)
    )
  })

  it('clicking Broadcast Announcement quick action shows compose form', async () => {
    await act(async () => { render(<SuperAdminPlatform onNavigate={mockOnNavigate} />) })
    await waitFor(() => screen.getAllByText(/Broadcast Announcement/i).length > 0)
    // Click the quick action button in the Quick Actions panel
    const btns = screen.getAllByText(/Broadcast Announcement/i)
    await act(async () => { fireEvent.click(btns[0]) })
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/Write your announcement here/i)).toBeInTheDocument()
    )
  })

  it('shows Compose button that toggles broadcast panel', async () => {
    await act(async () => { render(<SuperAdminPlatform onNavigate={mockOnNavigate} />) })
    await waitFor(() => screen.getByText(/Compose/i))
    const composeBtn = screen.getByText(/Compose/i)
    await act(async () => { fireEvent.click(composeBtn) })
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/e\.g\. Platform update/i)).toBeInTheDocument()
    )
  })

  it('shows "No payment records yet" when revenue is null', async () => {
    api.getPlatformRevenue.mockResolvedValue(null)
    await act(async () => { render(<SuperAdminPlatform onNavigate={mockOnNavigate} />) })
    await waitFor(() =>
      expect(screen.getByText(/No payment records yet/i)).toBeInTheDocument()
    )
  })

  it('clicking Run Health Check button calls api.getSystemHealth', async () => {
    api.getSystemHealth.mockResolvedValue({
      status: 'healthy',
      responseTime: '12ms',
      database: { status: 'ok', latencyMs: 5, stats: {} },
      memory: { systemUsedPct: 40, heapUsedMB: 100, heapTotalMB: 200 },
      uptime: '3d 2h',
      nodeVersion: 'v18.0.0',
      envChecks: {},
      timestamp: new Date().toISOString(),
    })
    await act(async () => { render(<SuperAdminPlatform onNavigate={mockOnNavigate} />) })
    await waitFor(() => screen.getAllByText(/Run Health Check/i).length > 0)
    const healthBtns = screen.getAllByText(/Run Health Check/i)
    await act(async () => { fireEvent.click(healthBtns[0]) })
    await waitFor(() => expect(api.getSystemHealth).toHaveBeenCalledTimes(1))
  })

  it('shows org subscription alerts for suspended orgs', async () => {
    api.getOrgs.mockResolvedValue([
      makeOrg({ name: 'SuspendedOrg', status: 'suspended' }),
    ])
    await act(async () => { render(<SuperAdminPlatform onNavigate={mockOnNavigate} />) })
    await waitFor(() =>
      expect(screen.getByText(/Subscription Alerts/i)).toBeInTheDocument()
    )
  })

  it('shows recent organisations section', async () => {
    api.getOrgs.mockResolvedValue([makeOrg({ name: 'RecentCorp' })])
    await act(async () => { render(<SuperAdminPlatform onNavigate={mockOnNavigate} />) })
    await waitFor(() =>
      expect(screen.getAllByText('RecentCorp').length).toBeGreaterThan(0)
    )
  })

  it('clicking Create New Organisation quick action calls onNavigate', async () => {
    await act(async () => { render(<SuperAdminPlatform onNavigate={mockOnNavigate} />) })
    await waitFor(() => screen.getByText(/Create New Organisation/i))
    await act(async () => {
      fireEvent.click(screen.getByText(/Create New Organisation/i))
    })
    expect(mockOnNavigate).toHaveBeenCalledWith('forms/create-org')
  })

  it('shows the Platform Pulse section', async () => {
    await act(async () => { render(<SuperAdminPlatform onNavigate={mockOnNavigate} />) })
    await waitFor(() =>
      expect(screen.getByText(/Platform Pulse/i)).toBeInTheDocument()
    )
  })

  it('renders Organisations by Plan section', async () => {
    await act(async () => { render(<SuperAdminPlatform onNavigate={mockOnNavigate} />) })
    await waitFor(() =>
      expect(screen.getByText(/Organisations by Plan/i)).toBeInTheDocument()
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. SuperAdminPlatformReferrals
// ─────────────────────────────────────────────────────────────────────────────

describe('SuperAdminPlatformReferrals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getAdminPlatformReferralStats.mockResolvedValue({
      total: 0,
      totalCoinsAwarded: 0,
      topReferrers: [],
    })
    api.getAdminPlatformReferrals.mockResolvedValue({
      referrals: [],
      total: 0,
      pages: 1,
    })
  })

  it('renders without crashing and shows Platform Referrals heading', async () => {
    await act(async () => { render(<SuperAdminPlatformReferrals />) })
    await waitFor(() =>
      expect(screen.getByTestId('page-title')).toHaveTextContent(/Platform Referrals/i)
    )
  })

  it('calls getAdminPlatformReferralStats and getAdminPlatformReferrals on mount', async () => {
    await act(async () => { render(<SuperAdminPlatformReferrals />) })
    await waitFor(() => {
      expect(api.getAdminPlatformReferralStats).toHaveBeenCalledTimes(1)
      expect(api.getAdminPlatformReferrals).toHaveBeenCalledTimes(1)
    })
  })

  it('shows KPI boxes: Total Referrals, Coins Awarded, Unique Referrers, Per Referral', async () => {
    api.getAdminPlatformReferralStats.mockResolvedValue({
      total: 42,
      totalCoinsAwarded: 1050,
      topReferrers: [],
    })
    await act(async () => { render(<SuperAdminPlatformReferrals />) })
    await waitFor(() => {
      expect(screen.getByText('Total Referrals')).toBeInTheDocument()
      expect(screen.getByText('Coins Awarded')).toBeInTheDocument()
      expect(screen.getByText('Unique Referrers')).toBeInTheDocument()
      expect(screen.getByText('Per Referral')).toBeInTheDocument()
    })
  })

  it('shows "No platform referrals recorded yet" when list is empty', async () => {
    await act(async () => { render(<SuperAdminPlatformReferrals />) })
    await waitFor(() =>
      expect(screen.getByText(/No platform referrals recorded yet/i)).toBeInTheDocument()
    )
  })

  it('renders referral rows when API returns data', async () => {
    api.getAdminPlatformReferrals.mockResolvedValue({
      referrals: [makeReferral()],
      total: 1,
      pages: 1,
    })
    await act(async () => { render(<SuperAdminPlatformReferrals />) })
    await waitFor(() => {
      expect(screen.getByText('Bob Smith')).toBeInTheDocument()
      expect(screen.getByText('Carol White')).toBeInTheDocument()
    })
  })

  it('shows top referrers section when topReferrers list is non-empty', async () => {
    api.getAdminPlatformReferralStats.mockResolvedValue({
      total: 10,
      totalCoinsAwarded: 250,
      topReferrers: [
        { _id: 'r1', name: 'Top Referrer', count: 10, coins: 250 },
      ],
    })
    await act(async () => { render(<SuperAdminPlatformReferrals />) })
    await waitFor(() => {
      expect(screen.getByText('Top Referrers')).toBeInTheDocument()
      expect(screen.getByText('Top Referrer')).toBeInTheDocument()
    })
  })

  it('renders Badge Tiers section', async () => {
    await act(async () => { render(<SuperAdminPlatformReferrals />) })
    await waitFor(() =>
      expect(screen.getByText('Badge Tiers')).toBeInTheDocument()
    )
  })

  it('renders all four badge tier names', async () => {
    await act(async () => { render(<SuperAdminPlatformReferrals />) })
    await waitFor(() => {
      expect(screen.getByText('Bronze')).toBeInTheDocument()
      expect(screen.getByText('Silver')).toBeInTheDocument()
      expect(screen.getByText('Gold')).toBeInTheDocument()
      expect(screen.getByText('Diamond')).toBeInTheDocument()
    })
  })

  it('search input is rendered and updates state', async () => {
    await act(async () => { render(<SuperAdminPlatformReferrals />) })
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/Search by name or email/i)).toBeInTheDocument()
    )
    const searchInput = screen.getByPlaceholderText(/Search by name or email/i)
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Bob' } })
    })
    expect(searchInput.value).toBe('Bob')
  })

  it('shows "No results for your search" when search returns empty list', async () => {
    api.getAdminPlatformReferrals.mockResolvedValueOnce({ referrals: [], total: 0, pages: 1 })
    api.getAdminPlatformReferrals.mockResolvedValueOnce({ referrals: [], total: 0, pages: 1 })
    await act(async () => { render(<SuperAdminPlatformReferrals />) })
    await waitFor(() => screen.getByPlaceholderText(/Search by name or email/i))
    const searchInput = screen.getByPlaceholderText(/Search by name or email/i)
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'XYZNOTFOUND' } })
    })
    await waitFor(() =>
      expect(screen.getByText(/No results for your search/i)).toBeInTheDocument()
    )
  })

  it('shows table headers when referrals are loaded', async () => {
    api.getAdminPlatformReferrals.mockResolvedValue({
      referrals: [makeReferral()],
      total: 1,
      pages: 1,
    })
    await act(async () => { render(<SuperAdminPlatformReferrals />) })
    await waitFor(() => {
      expect(screen.getByText('Referrer')).toBeInTheDocument()
      expect(screen.getByText('Referred Person')).toBeInTheDocument()
      expect(screen.getByText('Coins')).toBeInTheDocument()
    })
  })

  it('displays pagination when pages > 1', async () => {
    api.getAdminPlatformReferrals.mockResolvedValue({
      referrals: [makeReferral()],
      total: 100,
      pages: 3,
    })
    await act(async () => { render(<SuperAdminPlatformReferrals />) })
    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 3/i)).toBeInTheDocument()
      expect(screen.getByText(/Next/i)).toBeInTheDocument()
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. SuperAdminPlaybooks
// ─────────────────────────────────────────────────────────────────────────────

describe('SuperAdminPlaybooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Setup URL mocks needed for file download
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()
  })

  it('renders without crashing and shows Playbooks heading', async () => {
    await act(async () => { render(<SuperAdminPlaybooks />) })
    await waitFor(() =>
      expect(screen.getAllByText(/Playbooks/i).length).toBeGreaterThan(0)
    )
  })

  it('renders playbook download cards', async () => {
    await act(async () => { render(<SuperAdminPlaybooks />) })
    await waitFor(() => {
      expect(screen.getAllByText(/Developer Playbook/i).length).toBeGreaterThan(0)
    })
  })

  it('shows multiple playbook options (multiple download buttons)', async () => {
    await act(async () => { render(<SuperAdminPlaybooks />) })
    await waitFor(() => {
      const downloadBtns = screen.getAllByRole('button')
      expect(downloadBtns.length).toBeGreaterThan(0)
    })
  })

  it('clicking a download button does not throw', async () => {
    await act(async () => { render(<SuperAdminPlaybooks />) })
    await waitFor(() => screen.getAllByRole('button').length > 0)
    const downloadBtns = screen.getAllByRole('button')
    // Click without crashing
    await act(async () => { fireEvent.click(downloadBtns[0]) })
    // Page still renders
    expect(screen.getAllByText(/Playbooks/i).length).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. SuperAdminReportedPosts
// ─────────────────────────────────────────────────────────────────────────────

describe('SuperAdminReportedPosts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getReportedPosts.mockResolvedValue({ data: [] })
    api.deleteReportedPost.mockResolvedValue({ success: true })
    api.dismissReport.mockResolvedValue({ success: true })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  it('renders without crashing and shows Reported Posts heading', async () => {
    await act(async () => { render(<SuperAdminReportedPosts />) })
    await waitFor(() =>
      expect(screen.getByText(/Reported Posts/i)).toBeInTheDocument()
    )
  })

  it('calls api.getReportedPosts on mount', async () => {
    await act(async () => { render(<SuperAdminReportedPosts />) })
    await waitFor(() => expect(api.getReportedPosts).toHaveBeenCalledTimes(1))
  })

  it('shows "No pending reports" when data is empty', async () => {
    await act(async () => { render(<SuperAdminReportedPosts />) })
    await waitFor(() =>
      expect(screen.getByText(/No pending reports/i)).toBeInTheDocument()
    )
  })

  it('shows post count text when reports are present', async () => {
    api.getReportedPosts.mockResolvedValue({ data: [makeReportedGroup()] })
    await act(async () => { render(<SuperAdminReportedPosts />) })
    await waitFor(() =>
      expect(screen.getByText(/1 post with pending reports/i)).toBeInTheDocument()
    )
  })

  it('renders post author name from API data', async () => {
    api.getReportedPosts.mockResolvedValue({ data: [makeReportedGroup()] })
    await act(async () => { render(<SuperAdminReportedPosts />) })
    await waitFor(() =>
      expect(screen.getByText('PostAuthor')).toBeInTheDocument()
    )
  })

  it('renders Delete Post button for each reported post group', async () => {
    api.getReportedPosts.mockResolvedValue({ data: [makeReportedGroup()] })
    await act(async () => { render(<SuperAdminReportedPosts />) })
    await waitFor(() =>
      expect(screen.getByText(/Delete Post/i)).toBeInTheDocument()
    )
  })

  it('clicking Delete Post calls api.deleteReportedPost', async () => {
    api.getReportedPosts.mockResolvedValue({ data: [makeReportedGroup()] })
    await act(async () => { render(<SuperAdminReportedPosts />) })
    await waitFor(() => screen.getByText(/Delete Post/i))
    await act(async () => {
      fireEvent.click(screen.getByText(/Delete Post/i))
    })
    await waitFor(() =>
      expect(api.deleteReportedPost).toHaveBeenCalledWith('report1')
    )
  })

  it('renders Dismiss button for each individual report', async () => {
    api.getReportedPosts.mockResolvedValue({ data: [makeReportedGroup()] })
    await act(async () => { render(<SuperAdminReportedPosts />) })
    await waitFor(() => {
      // The dismiss button has text "✓ Dismiss"
      const dismissBtns = screen.getAllByText(/✓ Dismiss/i)
      expect(dismissBtns.length).toBeGreaterThan(0)
    })
  })

  it('clicking Dismiss calls api.dismissReport with correct reportId', async () => {
    api.getReportedPosts.mockResolvedValue({ data: [makeReportedGroup()] })
    await act(async () => { render(<SuperAdminReportedPosts />) })
    await waitFor(() => screen.getAllByText(/✓ Dismiss/i).length > 0)
    await act(async () => {
      fireEvent.click(screen.getAllByText(/✓ Dismiss/i)[0])
    })
    await waitFor(() =>
      expect(api.dismissReport).toHaveBeenCalledWith('report1')
    )
  })

  it('shows reporter name in reports list', async () => {
    api.getReportedPosts.mockResolvedValue({ data: [makeReportedGroup()] })
    await act(async () => { render(<SuperAdminReportedPosts />) })
    await waitFor(() =>
      expect(screen.getByText('Reporter One')).toBeInTheDocument()
    )
  })

  it('shows report reason label (spam badge)', async () => {
    api.getReportedPosts.mockResolvedValue({ data: [makeReportedGroup()] })
    await act(async () => { render(<SuperAdminReportedPosts />) })
    await waitFor(() =>
      expect(screen.getAllByText(/Spam/i).length).toBeGreaterThan(0)
    )
  })

  it('shows Refresh button on empty state', async () => {
    await act(async () => { render(<SuperAdminReportedPosts />) })
    await waitFor(() =>
      expect(screen.getByText(/Refresh/i)).toBeInTheDocument()
    )
  })

  it('clicking Refresh on empty state re-calls api.getReportedPosts', async () => {
    await act(async () => { render(<SuperAdminReportedPosts />) })
    await waitFor(() => screen.getByText(/Refresh/i))
    await act(async () => {
      fireEvent.click(screen.getByText(/Refresh/i))
    })
    await waitFor(() =>
      expect(api.getReportedPosts).toHaveBeenCalledTimes(2)
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. SuperAdminSecurity
// ─────────────────────────────────────────────────────────────────────────────

describe('SuperAdminSecurity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetch for user list
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ data: [] }),
      })
    )
    api.getOrgs.mockResolvedValue([])
    api.getPlatformConfig.mockResolvedValue({})
    api.savePlatformFlags.mockResolvedValue({ success: true })
    api.savePlatformSecurity.mockResolvedValue({ success: true })
    api.updateOrg.mockResolvedValue({ success: true })
    api.impersonate.mockResolvedValue({ token: 'mock-token', user: { id: 'u1', name: 'Test User' } })
    api.stopImpersonate.mockResolvedValue({ user: { id: 'admin1', name: 'Admin' } })
    // Clear sessionStorage to avoid impersonation detection
    sessionStorage.clear()
  })

  it('renders without crashing and shows Security & Control heading', async () => {
    await act(async () => { render(<SuperAdminSecurity />) })
    await waitFor(() =>
      expect(screen.getByText(/Security & Control/i)).toBeInTheDocument()
    )
  })

  it('renders the tab navigation with all four tabs', async () => {
    await act(async () => { render(<SuperAdminSecurity />) })
    await waitFor(() => {
      expect(screen.getAllByText(/Feature Flags/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Audit Log/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/Impersonate/i)).toBeInTheDocument()
      expect(screen.getAllByText(/Security/i).length).toBeGreaterThan(0)
    })
  })

  it('shows Feature Flags tab content by default', async () => {
    await act(async () => { render(<SuperAdminSecurity />) })
    await waitFor(() =>
      expect(screen.getByText(/Feature Flags by Plan/i)).toBeInTheDocument()
    )
  })

  it('feature flags table shows plan column headers', async () => {
    await act(async () => { render(<SuperAdminSecurity />) })
    await waitFor(() => {
      expect(screen.getByText('FREE')).toBeInTheDocument()
      expect(screen.getByText('ENTERPRISE')).toBeInTheDocument()
    })
  })

  it('clicking Save Flags button calls api.savePlatformFlags', async () => {
    await act(async () => { render(<SuperAdminSecurity />) })
    await waitFor(() => screen.getByText(/Save Flags/i))
    await act(async () => {
      fireEvent.click(screen.getByText(/Save Flags/i))
    })
    await waitFor(() => expect(api.savePlatformFlags).toHaveBeenCalledTimes(1))
  })

  it('switching to Audit Log tab shows the audit log panel', async () => {
    await act(async () => { render(<SuperAdminSecurity />) })
    await waitFor(() => screen.getAllByText(/Audit Log/i).length > 0)
    // Click the Audit Log tab button (the one with the emoji prefix)
    const auditBtns = screen.getAllByText(/📋 Audit Log/i)
    await act(async () => {
      fireEvent.click(auditBtns[0])
    })
    await waitFor(() =>
      expect(screen.getByText(/Last \d+ recorded events/i)).toBeInTheDocument()
    )
  })

  it('switching to Impersonate tab shows user impersonation panel', async () => {
    await act(async () => { render(<SuperAdminSecurity />) })
    await waitFor(() => screen.getByText(/Impersonate/i))
    await act(async () => {
      fireEvent.click(screen.getByText(/Impersonate/i))
    })
    await waitFor(() =>
      expect(screen.getByText(/User Impersonation/i)).toBeInTheDocument()
    )
  })

  it('switching to Security tab shows Session & Authentication section', async () => {
    await act(async () => { render(<SuperAdminSecurity />) })
    await waitFor(() => {
      const securityTabs = screen.getAllByText(/Security/i)
      return securityTabs.length > 0
    })
    // Click the Security tab (last one in list)
    const securityTabs = screen.getAllByText(/Security/i)
    await act(async () => {
      fireEvent.click(securityTabs[securityTabs.length - 1])
    })
    await waitFor(() =>
      expect(screen.getByText(/Session & Authentication/i)).toBeInTheDocument()
    )
  })

  it('Security tab shows Save Security Settings button', async () => {
    await act(async () => { render(<SuperAdminSecurity />) })
    await waitFor(() => screen.getAllByText(/Security/i))
    const securityTabs = screen.getAllByText(/Security/i)
    await act(async () => {
      fireEvent.click(securityTabs[securityTabs.length - 1])
    })
    await waitFor(() =>
      expect(screen.getByText(/Save Security Settings/i)).toBeInTheDocument()
    )
  })

  it('clicking Save Security Settings calls api.savePlatformSecurity', async () => {
    await act(async () => { render(<SuperAdminSecurity />) })
    await waitFor(() => screen.getAllByText(/Security/i))
    const securityTabs = screen.getAllByText(/Security/i)
    await act(async () => {
      fireEvent.click(securityTabs[securityTabs.length - 1])
    })
    await waitFor(() => screen.getByText(/Save Security Settings/i))
    await act(async () => {
      fireEvent.click(screen.getByText(/Save Security Settings/i))
    })
    await waitFor(() => expect(api.savePlatformSecurity).toHaveBeenCalledTimes(1))
  })

  it('Audit Log tab shows level filter dropdown', async () => {
    await act(async () => { render(<SuperAdminSecurity />) })
    await waitFor(() => screen.getAllByText(/📋 Audit Log/i).length > 0)
    const auditBtns = screen.getAllByText(/📋 Audit Log/i)
    await act(async () => {
      fireEvent.click(auditBtns[0])
    })
    await waitFor(() => {
      const selects = screen.getAllByRole('combobox')
      expect(selects.length).toBeGreaterThan(0)
    })
  })

  it('Impersonate tab shows search input', async () => {
    await act(async () => { render(<SuperAdminSecurity />) })
    await waitFor(() => screen.getByText(/Impersonate/i))
    await act(async () => {
      fireEvent.click(screen.getByText(/Impersonate/i))
    })
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/Search by name or email/i)).toBeInTheDocument()
    )
  })

  it('shows Reset to Defaults button on Security tab', async () => {
    await act(async () => { render(<SuperAdminSecurity />) })
    await waitFor(() => screen.getAllByText(/Security/i))
    const securityTabs = screen.getAllByText(/Security/i)
    await act(async () => {
      fireEvent.click(securityTabs[securityTabs.length - 1])
    })
    await waitFor(() =>
      expect(screen.getByText(/Reset to Defaults/i)).toBeInTheDocument()
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. SuperAdminUnregisteredCandidates
// ─────────────────────────────────────────────────────────────────────────────

describe('SuperAdminUnregisteredCandidates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getUnregisteredStats.mockResolvedValue({ data: null })
    api.getUnregisteredCandidates.mockResolvedValue({
      data: [],
      pagination: { total: 0, pages: 1 },
    })
    api.getJobs.mockResolvedValue({ data: [] })
    api.getUsersList.mockResolvedValue({ data: [] })
    api.inviteGuestCandidates.mockResolvedValue({ message: 'Invites sent to 1 candidate.' })
    api.assignCandidatesToJob.mockResolvedValue({ success: true })
    api.assignCandidate.mockResolvedValue({ success: true })
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  it('renders without crashing and shows Guest Applicants heading', async () => {
    await act(async () => { render(<SuperAdminUnregisteredCandidates />) })
    await waitFor(() =>
      expect(screen.getByTestId('page-title')).toHaveTextContent(/Guest Applicants/i)
    )
  })

  it('calls api.getUnregisteredStats on mount', async () => {
    await act(async () => { render(<SuperAdminUnregisteredCandidates />) })
    await waitFor(() =>
      expect(api.getUnregisteredStats).toHaveBeenCalledTimes(1)
    )
  })

  it('calls api.getUnregisteredCandidates on mount', async () => {
    await act(async () => { render(<SuperAdminUnregisteredCandidates />) })
    await waitFor(() =>
      expect(api.getUnregisteredCandidates).toHaveBeenCalledTimes(1)
    )
  })

  it('shows "No guest applicants yet" when rows are empty', async () => {
    await act(async () => { render(<SuperAdminUnregisteredCandidates />) })
    await waitFor(() =>
      expect(screen.getByText(/No guest applicants yet/i)).toBeInTheDocument()
    )
  })

  it('renders guest candidate rows when API returns data', async () => {
    api.getUnregisteredCandidates.mockResolvedValue({
      data: [makeGuestRow({ name: 'Jane Doe', email: 'jane@example.com' })],
      pagination: { total: 1, pages: 1 },
    })
    await act(async () => { render(<SuperAdminUnregisteredCandidates />) })
    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    })
  })

  it('renders invitation stats cards when stats are available', async () => {
    api.getUnregisteredStats.mockResolvedValue({
      data: {
        totalGuests: 10,
        totalInvited: 5,
        converted: 2,
        pending: 3,
        notInvited: 5,
        successRate: 40,
        failRate: 60,
      },
    })
    await act(async () => { render(<SuperAdminUnregisteredCandidates />) })
    await waitFor(() => {
      expect(screen.getByText('Total Guests')).toBeInTheDocument()
      expect(screen.getByText('Invites Sent')).toBeInTheDocument()
      expect(screen.getByText('Accounts Created')).toBeInTheDocument()
    })
  })

  it('shows the All Guests and Not Invited Yet filter buttons', async () => {
    await act(async () => { render(<SuperAdminUnregisteredCandidates />) })
    await waitFor(() => {
      expect(screen.getByText(/All Guests/i)).toBeInTheDocument()
      expect(screen.getByText(/Not Invited Yet/i)).toBeInTheDocument()
    })
  })

  it('clicking Not Invited Yet filter sets uninvitedOnly and re-fetches', async () => {
    await act(async () => { render(<SuperAdminUnregisteredCandidates />) })
    await waitFor(() => screen.getByText(/Not Invited Yet/i))
    await act(async () => {
      fireEvent.click(screen.getByText(/Not Invited Yet/i))
    })
    await waitFor(() =>
      expect(api.getUnregisteredCandidates).toHaveBeenCalledWith(
        expect.objectContaining({ uninvitedOnly: true })
      )
    )
  })

  it('search form input is rendered', async () => {
    await act(async () => { render(<SuperAdminUnregisteredCandidates />) })
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/Advanced Search/i)).toBeInTheDocument()
    )
  })

  it('submitting the search form calls api.getUnregisteredCandidates with search term', async () => {
    await act(async () => { render(<SuperAdminUnregisteredCandidates />) })
    await waitFor(() => screen.getByPlaceholderText(/Advanced Search/i))
    const searchInput = screen.getByPlaceholderText(/Advanced Search/i)
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Jane' } })
    })
    const searchBtn = screen.getByRole('button', { name: /^Search$/i })
    await act(async () => { fireEvent.click(searchBtn) })
    await waitFor(() =>
      expect(api.getUnregisteredCandidates).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Jane' })
      )
    )
  })

  it('clicking a guest row opens the GuestUserModal', async () => {
    api.getUnregisteredCandidates.mockResolvedValue({
      data: [makeGuestRow({ name: 'Modal Test', email: 'modal@example.com' })],
      pagination: { total: 1, pages: 1 },
    })
    await act(async () => { render(<SuperAdminUnregisteredCandidates />) })
    await waitFor(() => screen.getByText('Modal Test'))
    await act(async () => {
      fireEvent.click(screen.getByText('Modal Test'))
    })
    await waitFor(() =>
      expect(screen.getByText('Guest User Profile')).toBeInTheDocument()
    )
  })

  it('modal shows candidate email', async () => {
    api.getUnregisteredCandidates.mockResolvedValue({
      data: [makeGuestRow({ name: 'Email Test', email: 'emailtest@example.com' })],
      pagination: { total: 1, pages: 1 },
    })
    await act(async () => { render(<SuperAdminUnregisteredCandidates />) })
    await waitFor(() => screen.getByText('Email Test'))
    await act(async () => {
      fireEvent.click(screen.getByText('Email Test'))
    })
    await waitFor(() =>
      // Email appears in the modal header subtitle as well as in the row
      expect(screen.getAllByText('emailtest@example.com').length).toBeGreaterThan(0)
    )
  })

  it('selecting a candidate shows the bulk action toolbar', async () => {
    api.getUnregisteredCandidates.mockResolvedValue({
      data: [makeGuestRow({ name: 'Select Test' })],
      pagination: { total: 1, pages: 1 },
    })
    await act(async () => { render(<SuperAdminUnregisteredCandidates />) })
    await waitFor(() => screen.getByText('Select Test'))
    const checkbox = screen.getAllByRole('checkbox')[1]
    await act(async () => { fireEvent.click(checkbox) })
    await waitFor(() =>
      expect(screen.getByText(/1 Selected/i)).toBeInTheDocument()
    )
  })

  it('shows invite button in bulk toolbar after selection', async () => {
    api.getUnregisteredCandidates.mockResolvedValue({
      data: [makeGuestRow({ name: 'InviteTest' })],
      pagination: { total: 1, pages: 1 },
    })
    await act(async () => { render(<SuperAdminUnregisteredCandidates />) })
    await waitFor(() => screen.getByText('InviteTest'))
    const checkbox = screen.getAllByRole('checkbox')[1]
    await act(async () => { fireEvent.click(checkbox) })
    await waitFor(() =>
      expect(screen.getByText(/Request Account Creation/i)).toBeInTheDocument()
    )
  })

  it('clicking Request Account Creation calls api.inviteGuestCandidates', async () => {
    api.getUnregisteredCandidates.mockResolvedValue({
      data: [makeGuestRow({ name: 'Invite Now', email: 'invite@example.com' })],
      pagination: { total: 1, pages: 1 },
    })
    await act(async () => { render(<SuperAdminUnregisteredCandidates />) })
    await waitFor(() => screen.getByText('Invite Now'))
    const checkbox = screen.getAllByRole('checkbox')[1]
    await act(async () => { fireEvent.click(checkbox) })
    await waitFor(() => screen.getByText(/Request Account Creation/i))
    await act(async () => {
      fireEvent.click(screen.getByText(/Request Account Creation/i))
    })
    await waitFor(() =>
      expect(api.inviteGuestCandidates).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ email: 'invite@example.com' }),
        ])
      )
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 7. CreateOrganisationPage
// ─────────────────────────────────────────────────────────────────────────────

describe('CreateOrganisationPage', () => {
  const mockOnBack = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    api.createOrg.mockResolvedValue({ success: true, data: makeOrg() })
    api.uploadFeedImage.mockResolvedValue({ url: 'https://example.com/photo.jpg' })
  })

  it('renders without crashing and shows Create New Organisation heading', async () => {
    await act(async () => {
      render(<CreateOrganisationPage onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    await waitFor(() =>
      expect(screen.getByText(/Create New Organisation/i)).toBeInTheDocument()
    )
  })

  it('renders the back link to Organisations List', async () => {
    await act(async () => {
      render(<CreateOrganisationPage onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    await waitFor(() =>
      expect(screen.getByText(/Organisations List/i)).toBeInTheDocument()
    )
  })

  it('clicking back button calls onBack prop', async () => {
    await act(async () => {
      render(<CreateOrganisationPage onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    await waitFor(() => screen.getByText(/← Organisations List/i))
    await act(async () => {
      fireEvent.click(screen.getByText(/← Organisations List/i))
    })
    expect(mockOnBack).toHaveBeenCalledTimes(1)
  })

  it('renders the four section tabs: Basic Info, Company Details, Culture & People, Media & Links', async () => {
    await act(async () => {
      render(<CreateOrganisationPage onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    await waitFor(() => {
      expect(screen.getByText(/Basic Info/i)).toBeInTheDocument()
      expect(screen.getByText(/Company Details/i)).toBeInTheDocument()
      expect(screen.getByText(/Culture & People/i)).toBeInTheDocument()
      expect(screen.getByText(/Media & Links/i)).toBeInTheDocument()
    })
  })

  it('Organisation Name field is rendered on Basic Info tab', async () => {
    await act(async () => {
      render(<CreateOrganisationPage onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    await waitFor(() =>
      expect(screen.getByText(/Organisation Name/i)).toBeInTheDocument()
    )
  })

  it('shows validation toast when submitting without a name', async () => {
    await act(async () => {
      render(<CreateOrganisationPage onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    await waitFor(() => screen.getByText(/Create Organisation/i))
    const submitBtn = screen.getByText(/Create Organisation/i)
    await act(async () => { fireEvent.click(submitBtn) })
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toBeInTheDocument()
    )
  })

  it('does not call api.createOrg when name is empty', async () => {
    await act(async () => {
      render(<CreateOrganisationPage onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    await waitFor(() => screen.getByText(/Create Organisation/i))
    await act(async () => {
      fireEvent.click(screen.getByText(/Create Organisation/i))
    })
    expect(api.createOrg).not.toHaveBeenCalled()
  })

  it('filling in name and submitting calls api.createOrg', async () => {
    await act(async () => {
      render(<CreateOrganisationPage onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    await waitFor(() => screen.getByText(/Organisation Name/i))
    const nameInput = screen.getByTestId('field-input-organisation-name-')
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'New Startup Ltd' } })
    })
    const submitBtn = screen.getByText(/Create Organisation/i)
    await act(async () => { fireEvent.click(submitBtn) })
    await waitFor(() =>
      expect(api.createOrg).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Startup Ltd' })
      )
    )
  })

  it('switching to Company Details tab shows About the Company section', async () => {
    await act(async () => {
      render(<CreateOrganisationPage onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    await waitFor(() => screen.getByText(/Company Details/i))
    await act(async () => {
      fireEvent.click(screen.getByText(/Company Details/i))
    })
    await waitFor(() =>
      expect(screen.getByText(/About the Company/i)).toBeInTheDocument()
    )
  })

  it('switching to Culture & People tab shows Company Culture section', async () => {
    await act(async () => {
      render(<CreateOrganisationPage onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    await waitFor(() => screen.getByText(/Culture & People/i))
    await act(async () => {
      fireEvent.click(screen.getByText(/Culture & People/i))
    })
    await waitFor(() =>
      expect(screen.getByText(/Company Culture/i)).toBeInTheDocument()
    )
  })

  it('switching to Media & Links tab shows Social Links section', async () => {
    await act(async () => {
      render(<CreateOrganisationPage onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    await waitFor(() => screen.getByText(/Media & Links/i))
    await act(async () => {
      fireEvent.click(screen.getByText(/Media & Links/i))
    })
    await waitFor(() =>
      expect(screen.getByText(/Social Links/i)).toBeInTheDocument()
    )
  })

  it('Next button advances to the next section tab', async () => {
    await act(async () => {
      render(<CreateOrganisationPage onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    await waitFor(() => screen.getByText(/Next/i))
    await act(async () => {
      fireEvent.click(screen.getByText(/Next/i))
    })
    await waitFor(() =>
      expect(screen.getByText(/About the Company/i)).toBeInTheDocument()
    )
  })

  it('Cancel button in form footer calls onBack', async () => {
    await act(async () => {
      render(<CreateOrganisationPage onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    await waitFor(() => {
      const cancelBtns = screen.getAllByText(/Cancel/i)
      expect(cancelBtns.length).toBeGreaterThan(0)
    })
    const cancelBtns = screen.getAllByText(/Cancel/i)
    await act(async () => { fireEvent.click(cancelBtns[cancelBtns.length - 1]) })
    expect(mockOnBack).toHaveBeenCalled()
  })

  it('shows success toast after successful organisation creation', async () => {
    await act(async () => {
      render(<CreateOrganisationPage onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    await waitFor(() => screen.getByText(/Organisation Name/i))
    const nameInput = screen.getByTestId('field-input-organisation-name-')
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Created Org Ltd' } })
    })
    const submitBtn = screen.getByText(/Create Organisation/i)
    await act(async () => { fireEvent.click(submitBtn) })
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent(/Organisation created successfully/i)
    )
  })
})
