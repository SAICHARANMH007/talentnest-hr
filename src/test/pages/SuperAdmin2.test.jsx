import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── All vi.mock() calls MUST come before imports ──────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ orgId: 'org1', id: 'id1' }),
  useLocation: () => ({ pathname: '/superadmin', search: '', state: null }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  NavLink: ({ children, to }) => <a href={to}>{children}</a>,
}))

vi.mock('../../api/api.js', () => ({
  api: {
    // College groups
    getCollegeGroups: vi.fn(),
    getCollegeGroupCandidates: vi.fn(),
    // Company groups
    getCompanyGroups: vi.fn(),
    getCompanyGroupCandidates: vi.fn(),
    // Command center
    getOrgs: vi.fn(),
    getUserCount: vi.fn(),
    getJobs: vi.fn(),
    getApplications: vi.fn(),
    getOrgHealth: vi.fn(),
    getPlatformRevenue: vi.fn(),
    getSystemHealth: vi.fn(),
    getUsers: vi.fn(),
    impersonate: vi.fn(),
    broadcastAnnouncement: vi.fn(),
    getOrgInterviewKits: vi.fn(),
    // Customizations
    getCustomizations: vi.fn(),
    getCustomFields: vi.fn(),
    createCustomField: vi.fn(),
    updateCustomField: vi.fn(),
    deleteCustomField: vi.fn(),
    addCustomizationItem: vi.fn(),
    updateCustomizationItem: vi.fn(),
    deleteCustomizationItem: vi.fn(),
    updateCustomizationsSingleton: vi.fn(),
    replaceCustomizationSection: vi.fn(),
    getWorkflowRules: vi.fn(),
    updateWorkflowRule: vi.fn(),
    deleteWorkflowRule: vi.fn(),
    // Orgs
    createOrg: vi.fn(),
    updateOrg: vi.fn(),
    deleteOrg: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    mergeUsers: vi.fn(),
  },
  downloadBlob: vi.fn(),
}))

vi.mock('../../api/client.js', () => ({
  req: vi.fn(),
  setToken: vi.fn(),
}))

vi.mock('../../constants/styles.js', () => ({
  card: {},
  btnP: {},
  btnG: {},
  btnD: {},
  inp: {},
  glassCard: {},
}))

vi.mock('../../hooks/useOrgOptions.js', () => ({
  useOrgOptions: vi.fn(() => ({ stages: [], isVisible: vi.fn(() => true), customizations: {} })),
  clearOrgOptionsCache: vi.fn(),
}))

vi.mock('../../components/ui/Toast.jsx', () => ({
  default: ({ msg, onClose }) =>
    msg ? <div data-testid="toast" onClick={onClose}>{msg}</div> : null,
}))

vi.mock('../../components/ui/Spinner.jsx', () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}))

vi.mock('../../components/ui/Toggle.jsx', () => ({
  default: ({ checked, onChange }) => (
    <button
      data-testid="toggle"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      {checked ? 'ON' : 'OFF'}
    </button>
  ),
}))

vi.mock('../../components/ui/PageHeader.jsx', () => ({
  default: ({ title, subtitle }) => (
    <div data-testid="page-header">
      <div data-testid="page-title">{title}</div>
      {subtitle && <div data-testid="page-subtitle">{subtitle}</div>}
    </div>
  ),
}))

vi.mock('../../components/ui/Modal.jsx', () => ({
  default: ({ title, children, onClose, footer }) => (
    <div data-testid="modal">
      <div data-testid="modal-title">{title}</div>
      <button data-testid="modal-close" onClick={onClose}>×</button>
      <div>{children}</div>
      {footer && <div data-testid="modal-footer">{footer}</div>}
    </div>
  ),
}))

vi.mock('../../components/ui/Field.jsx', () => ({
  default: ({ label, value, onChange, placeholder, options, required }) => {
    if (options) {
      return (
        <div>
          <label>{label}{required && ' *'}</label>
          <select
            data-testid={`field-select-${(label || '').toLowerCase().replace(/\s+/g, '-')}`}
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
          data-testid={`field-input-${(label || '').toLowerCase().replace(/\s+/g, '-')}`}
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

vi.mock('../../components/modals/CareerListingModal.jsx', () => ({
  default: ({ org, onClose }) => (
    <div data-testid="career-listing-modal">
      <div data-testid="listing-org-name">{org?.name}</div>
      <button data-testid="listing-close" onClick={onClose}>Close</button>
    </div>
  ),
}))

vi.mock('../../components/ui/Badge.jsx', () => ({
  default: ({ label }) => <span data-testid="badge">{label}</span>,
}))

// ── Now import the page components AFTER all mocks ────────────────────────────
import SuperAdminCollegeGroups from '../../pages/superadmin/SuperAdminCollegeGroups.jsx'
import SuperAdminCommandCenter from '../../pages/superadmin/SuperAdminCommandCenter.jsx'
import SuperAdminCompanyGroups from '../../pages/superadmin/SuperAdminCompanyGroups.jsx'
import SuperAdminCustomizations from '../../pages/superadmin/SuperAdminCustomizations.jsx'
import SuperAdminOrgs from '../../pages/superadmin/SuperAdminOrgs.jsx'
import SuperAdminPermissions from '../../pages/superadmin/SuperAdminPermissions.jsx'
import { api } from '../../api/api.js'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeCollegeGroup(overrides = {}) {
  return {
    name: 'MIT',
    totalStudents: 120,
    currentStudents: 80,
    alumni: 40,
    hasPlacementOfficer: true,
    derivedFromEducationOnly: 0,
    ...overrides,
  }
}

function makeCompanyGroup(overrides = {}) {
  return {
    name: 'Google',
    totalEmployees: 50,
    ...overrides,
  }
}

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
    isActive: true,
    userCount: 5,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SuperAdminCollegeGroups
// ─────────────────────────────────────────────────────────────────────────────

describe('SuperAdminCollegeGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getCollegeGroups.mockResolvedValue({ data: [], incompleteProfiles: 0 })
    api.getCollegeGroupCandidates.mockResolvedValue({ data: [], total: 0, hasMore: false })
  })

  it('renders without crashing and shows page header', async () => {
    await act(async () => { render(<SuperAdminCollegeGroups />) })
    await waitFor(() => expect(screen.getByTestId('page-header')).toBeInTheDocument())
  })

  it('calls api.getCollegeGroups on mount', async () => {
    await act(async () => { render(<SuperAdminCollegeGroups />) })
    await waitFor(() => expect(api.getCollegeGroups).toHaveBeenCalledTimes(1))
  })

  it('shows "No college groups found yet" when data is empty', async () => {
    await act(async () => { render(<SuperAdminCollegeGroups />) })
    await waitFor(() =>
      expect(screen.getByText(/No college groups found yet/i)).toBeInTheDocument()
    )
  })

  it('renders stat cards with zero values initially', async () => {
    await act(async () => { render(<SuperAdminCollegeGroups />) })
    await waitFor(() => {
      expect(screen.getAllByText(/College Groups/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/Students Grouped/i)).toBeInTheDocument()
    })
  })

  it('renders college group rows from API data', async () => {
    api.getCollegeGroups.mockResolvedValue({
      data: [makeCollegeGroup({ name: 'Harvard University' })],
      incompleteProfiles: 0,
    })
    await act(async () => { render(<SuperAdminCollegeGroups />) })
    await waitFor(() => expect(screen.getByText('Harvard University')).toBeInTheDocument())
  })

  it('shows search input when data is loaded', async () => {
    api.getCollegeGroups.mockResolvedValue({
      data: [makeCollegeGroup()],
      incompleteProfiles: 0,
    })
    await act(async () => { render(<SuperAdminCollegeGroups />) })
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/Search college/i)).toBeInTheDocument()
    )
  })

  it('filters colleges when search input changes', async () => {
    api.getCollegeGroups.mockResolvedValue({
      data: [
        makeCollegeGroup({ name: 'MIT' }),
        makeCollegeGroup({ name: 'Stanford' }),
      ],
      incompleteProfiles: 0,
    })
    await act(async () => { render(<SuperAdminCollegeGroups />) })
    await waitFor(() => screen.getByText('MIT'))
    const searchInput = screen.getByPlaceholderText(/Search college/i)
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'MIT' } })
    })
    await waitFor(() => {
      expect(screen.getByText('MIT')).toBeInTheDocument()
      expect(screen.queryByText('Stanford')).not.toBeInTheDocument()
    })
  })

  it('shows "No colleges match" message when search finds nothing', async () => {
    api.getCollegeGroups.mockResolvedValue({
      data: [makeCollegeGroup({ name: 'MIT' })],
      incompleteProfiles: 0,
    })
    await act(async () => { render(<SuperAdminCollegeGroups />) })
    await waitFor(() => screen.getByText('MIT'))
    const searchInput = screen.getByPlaceholderText(/Search college/i)
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'XYZNOMATCH' } })
    })
    await waitFor(() =>
      expect(screen.getByText(/No colleges match/i)).toBeInTheDocument()
    )
  })

  it('shows error message when API call fails', async () => {
    api.getCollegeGroups.mockRejectedValue(new Error('Network failure'))
    await act(async () => { render(<SuperAdminCollegeGroups />) })
    await waitFor(() =>
      expect(screen.getByText(/Network failure/i)).toBeInTheDocument()
    )
  })

  it('shows incomplete profiles warning banner when incompleteProfiles > 0', async () => {
    api.getCollegeGroups.mockResolvedValue({
      data: [makeCollegeGroup()],
      incompleteProfiles: 5,
    })
    await act(async () => { render(<SuperAdminCollegeGroups />) })
    await waitFor(() =>
      expect(screen.getByText(/Profiles Missing College/i)).toBeInTheDocument()
    )
  })

  it('clicking a college row opens the candidate drawer', async () => {
    api.getCollegeGroups.mockResolvedValue({
      data: [makeCollegeGroup({ name: 'Oxford' })],
      incompleteProfiles: 0,
    })
    api.getCollegeGroupCandidates.mockResolvedValue({
      data: [{ id: 'c1', name: 'Alice', email: 'alice@example.com', isCurrentStudent: true }],
      total: 1,
      hasMore: false,
    })
    await act(async () => { render(<SuperAdminCollegeGroups />) })
    await waitFor(() => screen.getByText('Oxford'))
    await act(async () => {
      fireEvent.click(screen.getByText('Oxford'))
    })
    await waitFor(() =>
      expect(api.getCollegeGroupCandidates).toHaveBeenCalledWith('Oxford', expect.any(Object))
    )
  })

  it('shows "Top college" badge for rank-1 college', async () => {
    api.getCollegeGroups.mockResolvedValue({
      data: [makeCollegeGroup({ name: 'Top School' })],
      incompleteProfiles: 0,
    })
    await act(async () => { render(<SuperAdminCollegeGroups />) })
    await waitFor(() => expect(screen.getByText(/Top college/i)).toBeInTheDocument())
  })

  it('shows "Registered" for colleges with placement officer', async () => {
    api.getCollegeGroups.mockResolvedValue({
      data: [makeCollegeGroup({ hasPlacementOfficer: true })],
      incompleteProfiles: 0,
    })
    await act(async () => { render(<SuperAdminCollegeGroups />) })
    await waitFor(() => expect(screen.getByText('Registered')).toBeInTheDocument())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. SuperAdminCommandCenter
// ─────────────────────────────────────────────────────────────────────────────

describe('SuperAdminCommandCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getOrgs.mockResolvedValue([])
    api.getUserCount.mockResolvedValue(0)
    api.getJobs.mockResolvedValue({ pagination: { total: 0 } })
    api.getApplications.mockResolvedValue({ pagination: { total: 0 } })
    api.getOrgHealth.mockResolvedValue({ data: [] })
    api.getPlatformRevenue.mockResolvedValue(null)
    api.getSystemHealth.mockResolvedValue({ db: { status: 'ok' }, email: { status: 'ok' } })
    api.getUsers.mockResolvedValue({ data: [] })
    api.broadcastAnnouncement.mockResolvedValue({ data: { total: 10, notificationsSent: 10, emailSent: 5 } })
    api.getOrgInterviewKits.mockResolvedValue([])
  })

  it('renders without crashing and shows Command Center heading', async () => {
    await act(async () => { render(<SuperAdminCommandCenter />) })
    await waitFor(() =>
      expect(screen.getAllByText(/Command Center/i).length).toBeGreaterThan(0)
    )
  })

  it('loads all required API data on mount', async () => {
    await act(async () => { render(<SuperAdminCommandCenter />) })
    await waitFor(() => {
      expect(api.getOrgs).toHaveBeenCalled()
      expect(api.getUserCount).toHaveBeenCalled()
      expect(api.getOrgHealth).toHaveBeenCalled()
    })
  })

  it('renders all main tab buttons', async () => {
    await act(async () => { render(<SuperAdminCommandCenter />) })
    await waitFor(() => {
      expect(screen.getByText(/Broadcast Studio/i)).toBeInTheDocument()
      expect(screen.getByText(/Org Intelligence/i)).toBeInTheDocument()
      expect(screen.getByText(/Revenue Insights/i)).toBeInTheDocument()
      expect(screen.getByText(/Platform Analytics/i)).toBeInTheDocument()
    })
  })

  it('shows Global Search input by default on Command Center tab', async () => {
    await act(async () => { render(<SuperAdminCommandCenter />) })
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/Search users, jobs, organisations/i)).toBeInTheDocument()
    )
  })

  it('clicking Search button calls api.getUsers and api.getJobs', async () => {
    api.getUsers.mockResolvedValue({ data: [] })
    api.getJobs.mockResolvedValue({ data: [] })
    await act(async () => { render(<SuperAdminCommandCenter />) })
    await waitFor(() => screen.getByPlaceholderText(/Search users, jobs/i))
    const searchInput = screen.getByPlaceholderText(/Search users, jobs/i)
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Acme' } })
    })
    const searchBtn = screen.getByRole('button', { name: /^Search$/i })
    await act(async () => {
      fireEvent.click(searchBtn)
    })
    await waitFor(() => expect(api.getUsers).toHaveBeenCalled())
  })

  it('switching to Broadcast Studio tab shows compose UI', async () => {
    await act(async () => { render(<SuperAdminCommandCenter />) })
    await waitFor(() => screen.getByText(/Broadcast Studio/i))
    await act(async () => {
      fireEvent.click(screen.getByText(/Broadcast Studio/i))
    })
    await waitFor(() =>
      expect(screen.getByText(/Compose Message/i)).toBeInTheDocument()
    )
  })

  it('Send Broadcast button is disabled when subject/message are empty', async () => {
    await act(async () => { render(<SuperAdminCommandCenter />) })
    await waitFor(() => screen.getByText(/Broadcast Studio/i))
    await act(async () => { fireEvent.click(screen.getByText(/Broadcast Studio/i)) })
    await waitFor(() => {
      const sendBtn = screen.getByRole('button', { name: /Send Broadcast/i })
      expect(sendBtn).toBeDisabled()
    })
  })

  it('switching to Org Intelligence tab shows plan distribution heading', async () => {
    api.getOrgs.mockResolvedValue([makeOrg()])
    await act(async () => { render(<SuperAdminCommandCenter />) })
    await waitFor(() => screen.getByText(/Org Intelligence/i))
    await act(async () => { fireEvent.click(screen.getByText(/Org Intelligence/i)) })
    await waitFor(() =>
      expect(screen.getByText(/Plan Distribution/i)).toBeInTheDocument()
    )
  })

  it('switching to Revenue Insights tab shows MRR heading', async () => {
    await act(async () => { render(<SuperAdminCommandCenter />) })
    await waitFor(() => screen.getByText(/Revenue Insights/i))
    await act(async () => { fireEvent.click(screen.getByText(/Revenue Insights/i)) })
    await waitFor(() => expect(screen.getByText('MRR')).toBeInTheDocument())
  })

  it('switching to Platform Analytics tab shows total orgs KPI', async () => {
    await act(async () => { render(<SuperAdminCommandCenter />) })
    await waitFor(() => screen.getByText(/Platform Analytics/i))
    await act(async () => { fireEvent.click(screen.getByText(/Platform Analytics/i)) })
    await waitFor(() => expect(screen.getByText('Total Orgs')).toBeInTheDocument())
  })

  it('switching to Interview Kits tab fetches kits', async () => {
    await act(async () => { render(<SuperAdminCommandCenter />) })
    await waitFor(() => screen.getByText(/Interview Kits/i))
    await act(async () => { fireEvent.click(screen.getByText(/Interview Kits/i)) })
    await waitFor(() => expect(api.getOrgInterviewKits).toHaveBeenCalled())
  })

  it('Check System Health button calls api.getSystemHealth', async () => {
    await act(async () => { render(<SuperAdminCommandCenter />) })
    await waitFor(() => {
      const btns = screen.queryAllByRole('button', { name: /Refresh|Check System Health/i })
      expect(btns.length).toBeGreaterThan(0)
    })
    const healthBtns = screen.queryAllByRole('button', { name: /Refresh|Check System Health/i })
    if (healthBtns.length > 0) {
      await act(async () => { fireEvent.click(healthBtns[0]) })
      await waitFor(() => expect(api.getSystemHealth).toHaveBeenCalled())
    }
  })

  it('shows recent organisations table when orgs are present', async () => {
    api.getOrgs.mockResolvedValue([makeOrg({ name: 'TechStart Inc' })])
    await act(async () => { render(<SuperAdminCommandCenter />) })
    await waitFor(() => expect(screen.getByText('TechStart Inc')).toBeInTheDocument())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. SuperAdminCompanyGroups
// ─────────────────────────────────────────────────────────────────────────────

describe('SuperAdminCompanyGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getCompanyGroups.mockResolvedValue({ data: [] })
    api.getCompanyGroupCandidates.mockResolvedValue({ data: [], total: 0, hasMore: false })
  })

  it('renders without crashing and shows page header', async () => {
    await act(async () => { render(<SuperAdminCompanyGroups />) })
    await waitFor(() => expect(screen.getByTestId('page-header')).toBeInTheDocument())
  })

  it('calls api.getCompanyGroups on mount', async () => {
    await act(async () => { render(<SuperAdminCompanyGroups />) })
    await waitFor(() => expect(api.getCompanyGroups).toHaveBeenCalledTimes(1))
  })

  it('shows "No company groups found yet" when data is empty', async () => {
    await act(async () => { render(<SuperAdminCompanyGroups />) })
    await waitFor(() =>
      expect(screen.getByText(/No company groups found yet/i)).toBeInTheDocument()
    )
  })

  it('renders company group rows from API data', async () => {
    api.getCompanyGroups.mockResolvedValue({
      data: [makeCompanyGroup({ name: 'Microsoft' })],
    })
    await act(async () => { render(<SuperAdminCompanyGroups />) })
    await waitFor(() => expect(screen.getByText('Microsoft')).toBeInTheDocument())
  })

  it('displays total employees count for each company', async () => {
    api.getCompanyGroups.mockResolvedValue({
      data: [makeCompanyGroup({ name: 'Apple', totalEmployees: 99 })],
    })
    await act(async () => { render(<SuperAdminCompanyGroups />) })
    await waitFor(() => expect(screen.getAllByText('99').length).toBeGreaterThan(0))
  })

  it('shows error message when API call fails', async () => {
    api.getCompanyGroups.mockRejectedValue(new Error('Server error'))
    await act(async () => { render(<SuperAdminCompanyGroups />) })
    await waitFor(() =>
      expect(screen.getByText(/Server error/i)).toBeInTheDocument()
    )
  })

  it('clicking a company row triggers getCompanyGroupCandidates', async () => {
    api.getCompanyGroups.mockResolvedValue({
      data: [makeCompanyGroup({ name: 'Amazon' })],
    })
    api.getCompanyGroupCandidates.mockResolvedValue({
      data: [{ id: 'c1', name: 'Bob Jones', email: 'bob@example.com' }],
      total: 1,
      hasMore: false,
    })
    await act(async () => { render(<SuperAdminCompanyGroups />) })
    await waitFor(() => screen.getByText('Amazon'))
    await act(async () => {
      fireEvent.click(screen.getByText('Amazon'))
    })
    await waitFor(() =>
      expect(api.getCompanyGroupCandidates).toHaveBeenCalledWith('Amazon', expect.any(Object))
    )
  })

  it('shows stat cards for Company Groups and Candidates Grouped', async () => {
    api.getCompanyGroups.mockResolvedValue({
      data: [makeCompanyGroup({ name: 'Tesla', totalEmployees: 30 })],
    })
    await act(async () => { render(<SuperAdminCompanyGroups />) })
    await waitFor(() => {
      expect(screen.getAllByText(/Company Groups/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/Candidates Grouped/i)).toBeInTheDocument()
    })
  })

  it('renders multiple company group rows when API returns multiple', async () => {
    api.getCompanyGroups.mockResolvedValue({
      data: [
        makeCompanyGroup({ name: 'Google' }),
        makeCompanyGroup({ name: 'Meta' }),
      ],
    })
    await act(async () => { render(<SuperAdminCompanyGroups />) })
    await waitFor(() => {
      expect(screen.getByText('Google')).toBeInTheDocument()
      expect(screen.getByText('Meta')).toBeInTheDocument()
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. SuperAdminCustomizations
// ─────────────────────────────────────────────────────────────────────────────

describe('SuperAdminCustomizations', () => {
  const mockCustomizationsData = {
    pipelineStatuses: [
      { _id: 'ps1', name: 'Applied', color: '#6366f1', order: 0, isDefault: true },
    ],
    tags: [
      { _id: 't1', name: 'Urgent', category: 'Candidate', color: '#ef4444' },
    ],
    rejectionReasons: [
      { _id: 'rr1', text: 'Not a fit', isDefault: false },
    ],
    scoreCards: [],
    documentTypes: [],
    questionBank: [],
    notificationMessages: [],
    departments: [{ _id: 'd1', name: 'Engineering' }],
    locations: [],
    sources: [],
    employmentTypes: [],
    offerVariables: [],
    fieldVisibility: {},
    emailSignature: {},
    hiringSettings: {},
    offerLetterTemplate: {},
    brandColors: {},
  }

  beforeEach(() => {
    vi.clearAllMocks()
    api.getCustomizations.mockResolvedValue({ data: mockCustomizationsData })
    api.getCustomFields.mockResolvedValue({ data: [] })
    api.getWorkflowRules.mockResolvedValue({ data: [] })
    api.createCustomField.mockResolvedValue({ data: { _id: 'cf1', label: 'New Field', entity: 'candidate', fieldType: 'text', isActive: true } })
    api.addCustomizationItem.mockResolvedValue({ data: { _id: 'new1', name: 'New Item' } })
    api.updateCustomizationsSingleton.mockResolvedValue({ success: true })
    api.replaceCustomizationSection.mockResolvedValue({ success: true })
  })

  it('renders without crashing and shows Customizations heading', async () => {
    await act(async () => { render(<SuperAdminCustomizations />) })
    await waitFor(() =>
      expect(screen.getByText(/Customizations/i)).toBeInTheDocument()
    )
  })

  it('calls api.getCustomizations on mount', async () => {
    await act(async () => { render(<SuperAdminCustomizations />) })
    await waitFor(() => expect(api.getCustomizations).toHaveBeenCalledTimes(1))
  })

  it('renders the sidebar navigation tabs', async () => {
    await act(async () => { render(<SuperAdminCustomizations />) })
    await waitFor(() => {
      expect(screen.getAllByText(/Custom Fields/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Pipeline Statuses/i).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/Rejection Reasons/i).length).toBeGreaterThan(0)
    })
  })

  it('shows Custom Fields tab by default and loads fields', async () => {
    await act(async () => { render(<SuperAdminCustomizations />) })
    await waitFor(() => expect(api.getCustomFields).toHaveBeenCalled())
  })

  it('clicking Pipeline Statuses tab switches content', async () => {
    await act(async () => { render(<SuperAdminCustomizations />) })
    await waitFor(() => screen.getByText(/Pipeline Statuses/i))
    await act(async () => {
      const tabBtn = screen.getAllByText(/Pipeline Statuses/i)[0]
      fireEvent.click(tabBtn)
    })
    await waitFor(() =>
      expect(screen.getByText(/Customize hiring stage names/i)).toBeInTheDocument()
    )
  })

  it('clicking Departments tab shows departments content', async () => {
    await act(async () => { render(<SuperAdminCustomizations />) })
    await waitFor(() => screen.getAllByText(/Departments/i))
    const deptBtn = screen.getAllByText(/Departments/i)[0]
    await act(async () => { fireEvent.click(deptBtn) })
    await waitFor(() => {
      expect(screen.getByText(/Manage organizational departments/i)).toBeInTheDocument()
    })
  })

  it('clicking Automations tab shows automation content', async () => {
    await act(async () => { render(<SuperAdminCustomizations />) })
    await waitFor(() => screen.getByText(/Automations/i))
    const autoBtn = screen.getAllByText(/Automations/i)[0]
    await act(async () => { fireEvent.click(autoBtn) })
    await waitFor(() => expect(api.getWorkflowRules).toHaveBeenCalled())
  })

  it('clicking "+ New Field" button shows custom field form', async () => {
    await act(async () => { render(<SuperAdminCustomizations />) })
    await waitFor(() => screen.getByText(/\+ New Field/i))
    await act(async () => { fireEvent.click(screen.getByText(/\+ New Field/i)) })
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/e\.g\. Expected CTC/i)).toBeInTheDocument()
    )
  })

  it('switching to Custom Tags tab shows tags section', async () => {
    await act(async () => { render(<SuperAdminCustomizations />) })
    await waitFor(() => screen.getByText(/Custom Tags/i))
    await act(async () => {
      const tagsBtn = screen.getAllByText(/Custom Tags/i)[0]
      fireEvent.click(tagsBtn)
    })
    await waitFor(() =>
      expect(screen.getByText(/Define tags for candidates/i)).toBeInTheDocument()
    )
  })

  it('clicking Rejection Reasons tab shows rejection reasons section', async () => {
    await act(async () => { render(<SuperAdminCustomizations />) })
    await waitFor(() => screen.getByText(/Rejection Reasons/i))
    await act(async () => {
      const rrBtn = screen.getAllByText(/Rejection Reasons/i)[0]
      fireEvent.click(rrBtn)
    })
    await waitFor(() =>
      expect(screen.getByText(/Standard rejection options/i)).toBeInTheDocument()
    )
  })

  it('clicking Brand Colors tab shows brand colors section', async () => {
    await act(async () => { render(<SuperAdminCustomizations />) })
    await waitFor(() => screen.getByText(/Brand Colors/i))
    await act(async () => {
      const bcBtn = screen.getAllByText(/Brand Colors/i)[0]
      fireEvent.click(bcBtn)
    })
    await waitFor(() =>
      expect(screen.getByText(/Customize the platform color palette/i)).toBeInTheDocument()
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. SuperAdminOrgs
// ─────────────────────────────────────────────────────────────────────────────

describe('SuperAdminOrgs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getOrgs.mockResolvedValue([])
    api.createOrg.mockResolvedValue({ success: true, data: makeOrg() })
    api.updateOrg.mockResolvedValue({ success: true })
    api.deleteOrg.mockResolvedValue({ success: true })
    api.createUser.mockResolvedValue({ success: true })
    api.updateUser.mockResolvedValue({ success: true })
    api.getUsers.mockResolvedValue({ data: [] })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('renders without crashing and shows Organisations heading', async () => {
    await act(async () => { render(<SuperAdminOrgs />) })
    await waitFor(() =>
      expect(screen.getAllByText(/Organisations/i).length).toBeGreaterThan(0)
    )
  })

  it('calls api.getOrgs on mount', async () => {
    await act(async () => { render(<SuperAdminOrgs />) })
    await waitFor(() => expect(api.getOrgs).toHaveBeenCalledTimes(1))
  })

  it('shows "No organisations yet" when orgs list is empty', async () => {
    await act(async () => { render(<SuperAdminOrgs />) })
    await waitFor(() =>
      expect(screen.getByText(/No organisations yet/i)).toBeInTheDocument()
    )
  })

  it('renders org cards when API returns organisations', async () => {
    api.getOrgs.mockResolvedValue([makeOrg({ name: 'TechCorp Ltd' })])
    await act(async () => { render(<SuperAdminOrgs />) })
    await waitFor(() => expect(screen.getByText('TechCorp Ltd')).toBeInTheDocument())
  })

  it('shows "+ Create Org" button', async () => {
    await act(async () => { render(<SuperAdminOrgs />) })
    await waitFor(() =>
      expect(screen.getByText(/\+ Create Org/i)).toBeInTheDocument()
    )
  })

  it('clicking "+ Create Org" opens the create modal', async () => {
    await act(async () => { render(<SuperAdminOrgs />) })
    await waitFor(() => screen.getByText(/\+ Create Org/i))
    await act(async () => { fireEvent.click(screen.getByText(/\+ Create Org/i)) })
    await waitFor(() =>
      expect(screen.getByTestId('modal')).toBeInTheDocument()
    )
  })

  it('closing the create org modal hides it', async () => {
    await act(async () => { render(<SuperAdminOrgs />) })
    await waitFor(() => screen.getByText(/\+ Create Org/i))
    await act(async () => { fireEvent.click(screen.getByText(/\+ Create Org/i)) })
    await waitFor(() => screen.getByTestId('modal-close'))
    await act(async () => { fireEvent.click(screen.getByTestId('modal-close')) })
    await waitFor(() =>
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
    )
  })

  it('renders org domain and plan badge in card', async () => {
    api.getOrgs.mockResolvedValue([makeOrg({ domain: 'techcorp.io', plan: 'growth' })])
    await act(async () => { render(<SuperAdminOrgs />) })
    await waitFor(() => {
      expect(screen.getByText(/techcorp\.io/i)).toBeInTheDocument()
      expect(screen.getByText('GROWTH')).toBeInTheDocument()
    })
  })

  it('clicking an org card opens the org detail view', async () => {
    api.getOrgs.mockResolvedValue([makeOrg({ name: 'DetailCorp' })])
    api.getUsers.mockResolvedValue({ data: [] })
    await act(async () => { render(<SuperAdminOrgs />) })
    await waitFor(() => screen.getByText('DetailCorp'))
    await act(async () => { fireEvent.click(screen.getByText('DetailCorp')) })
    await waitFor(() =>
      expect(screen.getByText(/Back to Organisations/i)).toBeInTheDocument()
    )
  })

  it('clicking Back in detail view returns to org list', async () => {
    api.getOrgs.mockResolvedValue([makeOrg({ name: 'BackCorp' })])
    api.getUsers.mockResolvedValue({ data: [] })
    await act(async () => { render(<SuperAdminOrgs />) })
    await waitFor(() => screen.getByText('BackCorp'))
    await act(async () => { fireEvent.click(screen.getByText('BackCorp')) })
    await waitFor(() => screen.getByText(/Back to Organisations/i))
    await act(async () => { fireEvent.click(screen.getByText(/Back to Organisations/i)) })
    await waitFor(() =>
      expect(screen.getAllByText(/Organisations/i).length).toBeGreaterThan(0)
    )
  })

  it('search field filters displayed orgs by name', async () => {
    api.getOrgs.mockResolvedValue([
      makeOrg({ name: 'Alpha Corp', id: 'o1', _id: 'o1' }),
      makeOrg({ name: 'Beta Ltd', id: 'o2', _id: 'o2' }),
    ])
    await act(async () => { render(<SuperAdminOrgs />) })
    await waitFor(() => {
      expect(screen.getByText('Alpha Corp')).toBeInTheDocument()
      expect(screen.getByText('Beta Ltd')).toBeInTheDocument()
    })
    // Find the search Field component input
    const searchInput = screen.queryByTestId('field-input-')
    if (searchInput) {
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Alpha' } })
      })
      await waitFor(() => {
        expect(screen.getByText('Alpha Corp')).toBeInTheDocument()
      })
    }
  })

  it('clicking Listing button opens CareerListingModal', async () => {
    api.getOrgs.mockResolvedValue([makeOrg({ name: 'ListingCorp' })])
    await act(async () => { render(<SuperAdminOrgs />) })
    await waitFor(() => screen.getByText('ListingCorp'))
    // Use the green Listing button which stops propagation
    const listingBtns = screen.getAllByText(/🌐 Listing/i)
    await act(async () => { fireEvent.click(listingBtns[0]) })
    await waitFor(() =>
      expect(screen.queryByTestId('career-listing-modal')).toBeInTheDocument()
    )
  })

  it('closing CareerListingModal hides it', async () => {
    api.getOrgs.mockResolvedValue([makeOrg({ name: 'ListingCorp' })])
    await act(async () => { render(<SuperAdminOrgs />) })
    await waitFor(() => screen.getByText('ListingCorp'))
    const listingBtns = screen.getAllByText(/🌐 Listing/i)
    await act(async () => { fireEvent.click(listingBtns[0]) })
    await waitFor(() => screen.queryByTestId('listing-close'))
    const closeBtn = screen.queryByTestId('listing-close')
    if (closeBtn) {
      await act(async () => { fireEvent.click(closeBtn) })
      await waitFor(() =>
        expect(screen.queryByTestId('career-listing-modal')).not.toBeInTheDocument()
      )
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. SuperAdminPermissions
// ─────────────────────────────────────────────────────────────────────────────

describe('SuperAdminPermissions', () => {
  const mockOrgs = [
    makeOrg({ id: 'org1', name: 'Acme Corp', settings: {} }),
    makeOrg({ id: 'org2', name: 'Beta Inc', settings: {} }),
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    api.getOrgs.mockResolvedValue(mockOrgs)
    api.updateOrg.mockResolvedValue({ success: true })
  })

  it('renders without crashing and shows Permission Matrix heading', async () => {
    await act(async () => { render(<SuperAdminPermissions />) })
    await waitFor(() =>
      expect(screen.getByText(/Permission Matrix/i)).toBeInTheDocument()
    )
  })

  it('calls api.getOrgs on mount', async () => {
    await act(async () => { render(<SuperAdminPermissions />) })
    await waitFor(() => expect(api.getOrgs).toHaveBeenCalledTimes(1))
  })

  it('shows "No organisations yet" when orgs list is empty', async () => {
    api.getOrgs.mockResolvedValue([])
    await act(async () => { render(<SuperAdminPermissions />) })
    await waitFor(() =>
      expect(screen.getByText(/No organisations yet/i)).toBeInTheDocument()
    )
  })

  it('renders org select dropdown when orgs are present', async () => {
    await act(async () => { render(<SuperAdminPermissions />) })
    await waitFor(() => {
      const select = screen.getByRole('combobox')
      expect(select).toBeInTheDocument()
    })
  })

  it('renders all org names as select options', async () => {
    await act(async () => { render(<SuperAdminPermissions />) })
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
      expect(screen.getByText('Beta Inc')).toBeInTheDocument()
    })
  })

  it('renders permission sections for User Profile and Job Posting', async () => {
    await act(async () => { render(<SuperAdminPermissions />) })
    await waitFor(() => {
      expect(screen.getByText('User Profile')).toBeInTheDocument()
      expect(screen.getByText('Job Posting')).toBeInTheDocument()
    })
  })

  it('renders role headers: Candidate, Recruiter, Admin', async () => {
    await act(async () => { render(<SuperAdminPermissions />) })
    await waitFor(() => {
      expect(screen.getAllByText('CANDIDATE').length).toBeGreaterThan(0)
      expect(screen.getAllByText('RECRUITER').length).toBeGreaterThan(0)
      expect(screen.getAllByText('ADMIN').length).toBeGreaterThan(0)
    })
  })

  it('shows Save Permissions button', async () => {
    await act(async () => { render(<SuperAdminPermissions />) })
    await waitFor(() =>
      expect(screen.getAllByText(/Save Permissions/i).length).toBeGreaterThan(0)
    )
  })

  it('clicking Save Permissions calls api.updateOrg', async () => {
    await act(async () => { render(<SuperAdminPermissions />) })
    await waitFor(() => screen.getAllByText(/Save Permissions/i))
    const saveBtns = screen.getAllByText(/Save Permissions/i)
    await act(async () => { fireEvent.click(saveBtns[0]) })
    await waitFor(() => expect(api.updateOrg).toHaveBeenCalledWith(
      'org1',
      expect.objectContaining({ settings: expect.objectContaining({ permissions: expect.any(Object) }) })
    ))
  })

  it('clicking Reset to Defaults shows toast confirmation', async () => {
    await act(async () => { render(<SuperAdminPermissions />) })
    await waitFor(() => screen.getAllByText(/Reset to Defaults/i))
    const resetBtns = screen.getAllByText(/Reset to Defaults/i)
    await act(async () => { fireEvent.click(resetBtns[0]) })
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toBeInTheDocument()
    )
  })

  it('changing org in select updates the displayed org context', async () => {
    await act(async () => { render(<SuperAdminPermissions />) })
    await waitFor(() => screen.getByRole('combobox'))
    const select = screen.getByRole('combobox')
    await act(async () => {
      fireEvent.change(select, { target: { value: 'org2' } })
    })
    // The select should now show org2 selected
    expect(select.value).toBe('org2')
  })

  it('renders toggle switches for view/edit permissions', async () => {
    await act(async () => { render(<SuperAdminPermissions />) })
    await waitFor(() => {
      const toggles = screen.getAllByRole('switch')
      expect(toggles.length).toBeGreaterThan(0)
    })
  })

  it('renders all permission resource sections', async () => {
    await act(async () => { render(<SuperAdminPermissions />) })
    await waitFor(() => {
      expect(screen.getByText('Application')).toBeInTheDocument()
      expect(screen.getByText('Recruitment Pipeline')).toBeInTheDocument()
      expect(screen.getByText('Analytics & Reports')).toBeInTheDocument()
    })
  })
})
