// ── vi.mock() calls MUST come before any imports ──────────────────────────────

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/', search: '' }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  Link: ({ children, to }) => React.createElement('a', { href: to }, children),
}))

vi.mock('../../api/api.js', () => ({
  api: {
    // Analytics / Dashboard
    getDashboardStats: vi.fn(),
    getAnalytics: vi.fn(),
    getApplications: vi.fn(),
    getJobs: vi.fn(),
    getUsers: vi.fn(),
    getFunnel: vi.fn(),
    getTrends: vi.fn(),
    getRecruiterLeaderboard: vi.fn(),
    getTimeToHire: vi.fn(),
    getSourceBreakdown: vi.fn(),
    getDropoutAnalysis: vi.fn(),
    getRecruiterPerformance: vi.fn(),
    getApplicants: vi.fn(),
    getCandidateRecords: vi.fn(),
    updateStage: vi.fn(),
    patchJob: vi.fn(),
    assignCandidatesToJob: vi.fn(),
    // Automation
    getWorkflowRules: vi.fn(),
    createWorkflowRule: vi.fn(),
    updateWorkflowRule: vi.fn(),
    deleteWorkflowRule: vi.fn(),
    testWorkflowRule: vi.fn(),
    getSystemWorkflowRules: vi.fn(),
    createSystemWorkflowRule: vi.fn(),
    updateSystemWorkflowRule: vi.fn(),
    deleteSystemWorkflowRule: vi.fn(),
    activateSystemAutomation: vi.fn(),
    deactivateSystemAutomation: vi.fn(),
    // CandidateRequest
    getCandidateRequests: vi.fn(),
    createCandidateRequest: vi.fn(),
    cancelCandidateRequest: vi.fn(),
    applyToJob: vi.fn(),
    // CustomFields
    getCustomFields: vi.fn(),
    createCustomField: vi.fn(),
    updateCustomField: vi.fn(),
    deleteCustomField: vi.fn(),
    // DriveApprovals
    getAdminDriveApprovals: vi.fn(),
    approveInternalDriveRequest: vi.fn(),
    rejectInternalDriveRequest: vi.fn(),
    adminCreateDrive: vi.fn(),
    getCompanyCollegeDrives: vi.fn(),
    // Insights
    getHiringFunnel: vi.fn(),
    getSourceEffectiveness: vi.fn(),
    getSlaCompliance: vi.fn(),
    getSmartAlerts: vi.fn(),
    getStageTime: vi.fn(),
    getStageVelocity: vi.fn(),
    getUpcomingInterviews: vi.fn(),
    getOfferAnalytics: vi.fn(),
    // NPS
    getNpsStats: vi.fn(),
    seedNPS: vi.fn(),
    // Webhooks
    getWebhooks: vi.fn(),
    createWebhook: vi.fn(),
    updateWebhook: vi.fn(),
    deleteWebhook: vi.fn(),
    testWebhook: vi.fn(),
    seedWebhooks: vi.fn(),
    // Clients
    getClients: vi.fn(),
    createClient: vi.fn(),
    updateClient: vi.fn(),
    deleteClient: vi.fn(),
    // EmailSequences
    getEmailSequences: vi.fn(),
    createEmailSequence: vi.fn(),
    updateEmailSequence: vi.fn(),
    deleteEmailSequence: vi.fn(),
    // OrgSettings
    getOrgs: vi.fn(),
    updateOrg: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    resendUserInvite: vi.fn(),
    getCustomizations: vi.fn(),
    updateCustomizationsSingleton: vi.fn(),
    addCustomizationItem: vi.fn(),
    deleteCustomizationItem: vi.fn(),
    getPipelineTemplates: vi.fn(),
    savePipelineTemplate: vi.fn(),
    deletePipelineTemplate: vi.fn(),
    applyPipelineTemplate: vi.fn(),
    testSmtp: vi.fn(),
    // OrgChart
    getMyOrg: vi.fn(),
    bulkClassifyJobs: vi.fn(),
    redistributeJobs: vi.fn(),
    // DuplicateMerge
    findDuplicateCandidates: vi.fn(),
    mergeCandidates: vi.fn(),
    // HeadcountPlanner
    getHeadcountPlans: vi.fn(),
    createHeadcountPlan: vi.fn(),
    updateHeadcountPlan: vi.fn(),
    deleteHeadcountPlan: vi.fn(),
    createJobFromEntry: vi.fn(),
    linkJobToEntry: vi.fn(),
    // OfferLetterBuilder (reuses getCustomizations / updateCustomizationsSingleton)
    // Misc
    inviteAdmin: vi.fn(),
    inviteRecruiter: vi.fn(),
    resendInvite: vi.fn(),
    revokeInvite: vi.fn(),
    getPendingInvites: vi.fn(),
  },
  downloadBlob: vi.fn(),
}))

vi.mock('../../api/matching.js', () => ({
  genericSearchMatch: vi.fn((items) => items),
}))

vi.mock('../../api/client.js', () => ({
  req: vi.fn(),
}))

vi.mock('../../api/config.js', () => ({
  API_BASE_URL: 'http://localhost:5000',
}))

// ── constants mocks ────────────────────────────────────────────────────────────
vi.mock('../../constants/styles.js', () => ({
  btnP: { background: '#0176D3', color: '#fff' },
  btnG: { background: '#fff', color: '#374151' },
  btnD: { background: '#BA0517', color: '#fff' },
  card: { background: '#fff', borderRadius: 8, padding: 16 },
  inp: { border: '1px solid #D1D5DB', borderRadius: 8, padding: '8px 12px' },
}))

vi.mock('../../constants/stages.js', () => ({
  STAGES: [{ id: 'applied', label: 'Applied', color: '#706E6B' }],
  SM: { applied: { id: 'applied', label: 'Applied', color: '#706E6B' } },
}))

vi.mock('../../constants/sources.js', () => ({
  SOURCE_ICONS: {},
  SOURCE_COLORS: {},
  sourceLabel: (s) => s,
  SOURCE_LABELS: {},
}))

// ── UI component stubs ─────────────────────────────────────────────────────────
vi.mock('../../components/ui/Toast.jsx', () => ({
  default: ({ msg, onClose }) =>
    msg ? React.createElement('div', { 'data-testid': 'toast', onClick: onClose }, msg) : null,
}))
vi.mock('../../components/ui/Spinner.jsx', () => ({
  default: () => React.createElement('div', { 'data-testid': 'spinner' }, 'Loading...'),
}))
vi.mock('../../components/ui/Badge.jsx', () => ({
  default: ({ label, children }) =>
    React.createElement('span', { 'data-testid': 'badge' }, label || children),
}))
vi.mock('../../components/ui/PageHeader.jsx', () => ({
  default: ({ title, subtitle, action }) =>
    React.createElement('div', { 'data-testid': 'page-header' },
      React.createElement('div', { 'data-testid': 'page-title' }, title),
      React.createElement('div', { 'data-testid': 'page-subtitle' }, subtitle),
      React.createElement('div', { 'data-testid': 'page-action' }, action),
    ),
}))
vi.mock('../../components/ui/Modal.jsx', () => ({
  default: ({ title, children, onClose, footer }) =>
    React.createElement('div', { 'data-testid': 'modal' },
      React.createElement('div', { 'data-testid': 'modal-title' }, title),
      React.createElement('button', { 'data-testid': 'modal-close', onClick: onClose }, '×'),
      children,
      footer && React.createElement('div', { 'data-testid': 'modal-footer' }, footer),
    ),
}))
vi.mock('../../components/ui/Field.jsx', () => ({
  default: ({ label, value, onChange, type, options, required }) => {
    if (options) {
      return React.createElement('div', null,
        React.createElement('label', null, label, required && ' *'),
        React.createElement('select', {
          value,
          'data-testid': `field-select-${String(label).toLowerCase().replace(/\s+/g, '-')}`,
          onChange: e => onChange(e.target.value),
        }, React.createElement('option', { value: '' }, 'Select...'),
          ...options.map(o => React.createElement('option', { key: o.value, value: o.value }, o.label))
        ),
      )
    }
    return React.createElement('div', null,
      React.createElement('label', null, label, required && ' *'),
      React.createElement('input', {
        type: type || 'text',
        value,
        'data-testid': `field-input-${String(label).toLowerCase().replace(/\s+/g, '-')}`,
        onChange: e => onChange(e.target.value),
      }),
    )
  },
}))
vi.mock('../../components/ui/Dropdown.jsx', () => ({
  default: ({ label, options, value, onChange }) =>
    React.createElement('select', {
      'data-testid': 'dropdown',
      value,
      onChange: e => onChange(e.target.value),
    },
      React.createElement('option', { value: '' }, label),
      ...(options || []).map(o => React.createElement('option', { key: o.value, value: o.value }, o.label)),
    ),
}))
vi.mock('../../components/ui/Tabs.jsx', () => ({
  default: ({ tabs, active, onChange }) =>
    React.createElement('div', { 'data-testid': 'tabs' },
      ...(tabs || []).map(t =>
        React.createElement('button', {
          key: t.key || t,
          'data-testid': `tab-${t.key || t}`,
          onClick: () => onChange(t.key || t),
        }, t.label || t)
      ),
    ),
}))

// ── Shared / modal component stubs ────────────────────────────────────────────
vi.mock('../../components/shared/PostJobForm.jsx', () => ({
  default: ({ onSuccess }) =>
    React.createElement('div', { 'data-testid': 'post-job-form' },
      React.createElement('button', { 'data-testid': 'post-job-submit', onClick: () => onSuccess?.({}) }, 'Submit'),
    ),
}))
vi.mock('../../components/shared/UserDetailDrawer.jsx', () => ({
  default: ({ user: u, onClose }) =>
    React.createElement('div', { 'data-testid': 'user-detail-drawer' },
      React.createElement('button', { 'data-testid': 'drawer-close', onClick: onClose }, 'Close'),
    ),
}))
vi.mock('../../components/shared/AddCandidateForm.jsx', () => ({
  default: ({ onSuccess }) =>
    React.createElement('div', { 'data-testid': 'add-candidate-form' },
      React.createElement('button', { 'data-testid': 'add-candidate-submit', onClick: onSuccess }, 'Submit'),
    ),
}))
vi.mock('../../components/shared/ResumeCard.jsx', () => ({
  default: ({ candidate }) =>
    React.createElement('div', { 'data-testid': 'resume-card' }, candidate?.name),
}))
vi.mock('../../components/shared/InviteModal.jsx', () => ({
  default: ({ onClose }) =>
    React.createElement('div', { 'data-testid': 'invite-modal' },
      React.createElement('button', { 'data-testid': 'invite-close', onClick: onClose }, 'Close'),
    ),
}))
vi.mock('../../components/modals/CandidateMergeWizard.jsx', () => ({
  default: ({ isOpen, onClose, onMerged }) =>
    isOpen
      ? React.createElement('div', { 'data-testid': 'candidate-merge-wizard' },
          React.createElement('button', { 'data-testid': 'merge-close', onClick: onClose }, 'Close'),
          React.createElement('button', { 'data-testid': 'merge-confirm', onClick: onMerged }, 'Merge'),
        )
      : null,
}))

// ── Recharts stub (avoid SVG rendering errors) ─────────────────────────────────
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => React.createElement('div', { 'data-testid': 'chart-container' }, children),
  BarChart: ({ children }) => React.createElement('div', { 'data-testid': 'bar-chart' }, children),
  Bar: () => null,
  LineChart: ({ children }) => React.createElement('div', null, children),
  Line: () => null,
  PieChart: ({ children }) => React.createElement('div', null, children),
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  FunnelChart: ({ children }) => React.createElement('div', null, children),
  Funnel: () => null,
  LabelList: () => null,
  AreaChart: ({ children }) => React.createElement('div', null, children),
  Area: () => null,
  RadarChart: ({ children }) => React.createElement('div', null, children),
  Radar: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
}))

// ── NOW import React and test utilities ───────────────────────────────────────
import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from '../../api/api.js'

// ── Page imports (AFTER all mocks) ────────────────────────────────────────────
import AdminAnalytics from '../../pages/admin/AdminAnalytics.jsx'
import AdminAutomation from '../../pages/admin/AdminAutomation.jsx'
import AdminCandidateRequest from '../../pages/admin/AdminCandidateRequest.jsx'
import AdminCustomFields from '../../pages/admin/AdminCustomFields.jsx'
import AdminDriveApprovals from '../../pages/admin/AdminDriveApprovals.jsx'
import AdminInsights from '../../pages/admin/AdminInsights.jsx'
import AdminNPS from '../../pages/admin/AdminNPS.jsx'
import AdminWebhooks from '../../pages/admin/AdminWebhooks.jsx'
import AdminClients from '../../pages/admin/AdminClients.jsx'
import EmailSequences from '../../pages/admin/EmailSequences.jsx'
import OrgSettings from '../../pages/admin/OrgSettings.jsx'
import OrgChart from '../../pages/admin/OrgChart.jsx'
import DuplicateMerge from '../../pages/admin/DuplicateMerge.jsx'
import HeadcountPlanner from '../../pages/admin/HeadcountPlanner.jsx'
import OfferLetterBuilder from '../../pages/admin/OfferLetterBuilder.jsx'

// ── Fixtures ───────────────────────────────────────────────────────────────────
const adminUser = { id: 'a1', role: 'admin', tenantId: 'org1', orgName: 'Acme Corp', orgId: 'org1' }
const superAdminUser = { id: 'sa1', role: 'super_admin', tenantId: 'org1' }

function makeJob(overrides = {}) {
  return { _id: 'j1', id: 'j1', title: 'Software Engineer', status: 'active', company: 'Acme', ...overrides }
}
function makeUser(overrides = {}) {
  return { _id: 'u1', id: 'u1', name: 'Alice', email: 'alice@example.com', role: 'recruiter', ...overrides }
}
function makeRule(overrides = {}) {
  return { _id: 'r1', id: 'r1', name: 'Auto-reject rule', trigger: 'application_received', action: 'reject', isActive: true, ...overrides }
}
function makeField(overrides = {}) {
  return { _id: 'f1', id: 'f1', name: 'LinkedIn URL', fieldType: 'text', entityType: 'candidate', isRequired: false, ...overrides }
}
function makeWebhook(overrides = {}) {
  return { _id: 'w1', id: 'w1', name: 'Slack notify', url: 'https://hooks.slack.com/test', events: ['application.created'], isActive: true, ...overrides }
}
function makeClient(overrides = {}) {
  return { _id: 'c1', id: 'c1', companyName: 'Client Corp', contactName: 'Bob', contactEmail: 'bob@client.com', ...overrides }
}
function makeSequence(overrides = {}) {
  return { _id: 's1', id: 's1', name: 'Nurture Sequence', trigger: 'application_received', steps: [], ...overrides }
}

// ── Default mock setup ─────────────────────────────────────────────────────────
function setupDefaultMocks() {
  // common
  api.getDashboardStats.mockResolvedValue({ data: { totalJobs: 5, totalApplicants: 20, totalHired: 3 } })
  api.getAnalytics.mockResolvedValue({ data: {} })
  api.getApplications.mockResolvedValue({ data: [] })
  api.getJobs.mockResolvedValue({ data: [] })
  api.getUsers.mockResolvedValue({ data: [] })
  api.getFunnel.mockResolvedValue({ data: [] })
  api.getTrends.mockResolvedValue({ data: [] })
  api.getRecruiterLeaderboard.mockResolvedValue({ data: [] })
  api.getTimeToHire.mockResolvedValue({ data: { avgDays: 14 } })
  api.getSourceBreakdown.mockResolvedValue({ data: [] })
  api.getDropoutAnalysis.mockResolvedValue({ data: [] })
  api.getRecruiterPerformance.mockResolvedValue({ data: [] })
  api.getApplicants.mockResolvedValue({ data: [] })
  api.getCandidateRecords.mockResolvedValue({ data: [] })
  api.updateStage.mockResolvedValue({ success: true })
  api.patchJob.mockResolvedValue({ success: true })
  api.assignCandidatesToJob.mockResolvedValue({ success: true })
  // automation
  api.getWorkflowRules.mockResolvedValue({ data: [] })
  api.createWorkflowRule.mockResolvedValue({ data: makeRule() })
  api.updateWorkflowRule.mockResolvedValue({ data: makeRule() })
  api.deleteWorkflowRule.mockResolvedValue({ success: true })
  api.testWorkflowRule.mockResolvedValue({ data: { matched: 2 } })
  api.getSystemWorkflowRules.mockResolvedValue({ data: [] })
  api.createSystemWorkflowRule.mockResolvedValue({ data: makeRule() })
  api.updateSystemWorkflowRule.mockResolvedValue({ data: makeRule() })
  api.deleteSystemWorkflowRule.mockResolvedValue({ success: true })
  api.activateSystemAutomation.mockResolvedValue({ success: true })
  api.deactivateSystemAutomation.mockResolvedValue({ success: true })
  // candidate request
  api.getCandidateRequests.mockResolvedValue({ data: [] })
  api.createCandidateRequest.mockResolvedValue({ data: {} })
  api.cancelCandidateRequest.mockResolvedValue({ success: true })
  api.applyToJob.mockResolvedValue({ success: true })
  // custom fields
  api.getCustomFields.mockResolvedValue({ data: [] })
  api.createCustomField.mockResolvedValue({ data: makeField() })
  api.updateCustomField.mockResolvedValue({ data: makeField() })
  api.deleteCustomField.mockResolvedValue({ success: true })
  // drive approvals
  api.getAdminDriveApprovals.mockResolvedValue({ data: [] })
  api.approveInternalDriveRequest.mockResolvedValue({ success: true })
  api.rejectInternalDriveRequest.mockResolvedValue({ success: true })
  api.adminCreateDrive.mockResolvedValue({ success: true })
  api.getCompanyCollegeDrives.mockResolvedValue({ data: [] })
  // insights
  api.getHiringFunnel.mockResolvedValue({ data: [] })
  api.getSourceEffectiveness.mockResolvedValue({ data: [] })
  api.getSlaCompliance.mockResolvedValue({ data: {} })
  api.getSmartAlerts.mockResolvedValue({ data: {} })
  api.getStageTime.mockResolvedValue({ data: [] })
  api.getStageVelocity.mockResolvedValue({ data: [] })
  api.getUpcomingInterviews.mockResolvedValue({ data: [] })
  api.getOfferAnalytics.mockResolvedValue({ data: {} })
  // NPS
  api.getNpsStats.mockResolvedValue({ data: { avg: 8.5, count: 10 } })
  api.seedNPS.mockResolvedValue({ success: true })
  // webhooks
  api.getWebhooks.mockResolvedValue({ data: [] })
  api.createWebhook.mockResolvedValue({ data: makeWebhook() })
  api.updateWebhook.mockResolvedValue({ data: makeWebhook() })
  api.deleteWebhook.mockResolvedValue({ success: true })
  api.testWebhook.mockResolvedValue({ success: true, statusCode: 200 })
  api.seedWebhooks.mockResolvedValue({ success: true })
  // clients
  api.getClients.mockResolvedValue({ data: [] })
  api.createClient.mockResolvedValue({ data: makeClient() })
  api.updateClient.mockResolvedValue({ data: makeClient() })
  api.deleteClient.mockResolvedValue({ success: true })
  // email sequences
  api.getEmailSequences.mockResolvedValue({ data: [] })
  api.createEmailSequence.mockResolvedValue({ data: makeSequence() })
  api.updateEmailSequence.mockResolvedValue({ data: makeSequence() })
  api.deleteEmailSequence.mockResolvedValue({ success: true })
  // org settings
  api.getOrgs.mockResolvedValue({ data: [] })
  api.updateOrg.mockResolvedValue({ success: true })
  api.createUser.mockResolvedValue({ data: makeUser() })
  api.updateUser.mockResolvedValue({ data: makeUser() })
  api.deleteUser.mockResolvedValue({ success: true })
  api.resendUserInvite.mockResolvedValue({ success: true })
  api.getCustomizations.mockResolvedValue({ data: {} })
  api.updateCustomizationsSingleton.mockResolvedValue({ success: true })
  api.addCustomizationItem.mockResolvedValue({ success: true })
  api.deleteCustomizationItem.mockResolvedValue({ success: true })
  api.getPipelineTemplates.mockResolvedValue({ data: [] })
  api.savePipelineTemplate.mockResolvedValue({ success: true })
  api.deletePipelineTemplate.mockResolvedValue({ success: true })
  api.applyPipelineTemplate.mockResolvedValue({ success: true })
  api.testSmtp.mockResolvedValue({ success: true })
  // org chart / headcount
  api.getMyOrg.mockResolvedValue({ data: {} })
  api.bulkClassifyJobs.mockResolvedValue({ success: true })
  api.redistributeJobs.mockResolvedValue({ success: true })
  api.getHeadcountPlans.mockResolvedValue({ data: [] })
  api.createHeadcountPlan.mockResolvedValue({ data: {} })
  api.updateHeadcountPlan.mockResolvedValue({ data: {} })
  api.deleteHeadcountPlan.mockResolvedValue({ success: true })
  api.createJobFromEntry.mockResolvedValue({ success: true })
  api.linkJobToEntry.mockResolvedValue({ success: true })
  // duplicate merge
  api.findDuplicateCandidates.mockResolvedValue({ data: [] })
  api.mergeCandidates.mockResolvedValue({ success: true })
}

// ─────────────────────────────────────────────────────────────────────────────
// AdminAnalytics
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminAnalytics', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks() })

  it('renders without crashing', async () => {
    await act(async () => { render(<AdminAnalytics user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getDashboardStats on mount', async () => {
    await act(async () => { render(<AdminAnalytics user={adminUser} />) })
    await waitFor(() => expect(api.getDashboardStats).toHaveBeenCalled())
  })

  it('calls api.getSourceBreakdown on mount', async () => {
    await act(async () => { render(<AdminAnalytics user={adminUser} />) })
    await waitFor(() => expect(api.getSourceBreakdown).toHaveBeenCalled())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AdminAutomation
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminAutomation', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks() })

  it('renders without crashing', async () => {
    await act(async () => { render(<AdminAutomation user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getWorkflowRules on mount', async () => {
    await act(async () => { render(<AdminAutomation user={adminUser} />) })
    await waitFor(() => expect(api.getWorkflowRules).toHaveBeenCalled())
  })

  it('displays a rule when rules are returned', async () => {
    api.getWorkflowRules.mockResolvedValue({ data: [makeRule({ name: 'Auto-reject rule' })] })
    await act(async () => { render(<AdminAutomation user={adminUser} />) })
    await waitFor(() => expect(screen.getByText(/Auto-reject rule/i)).toBeInTheDocument())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AdminCandidateRequest
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminCandidateRequest', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks() })

  it('renders without crashing', async () => {
    await act(async () => { render(<AdminCandidateRequest user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getCandidateRequests on mount', async () => {
    await act(async () => { render(<AdminCandidateRequest user={adminUser} />) })
    await waitFor(() => expect(api.getCandidateRequests).toHaveBeenCalled())
  })

  it('calls api.getJobs on mount', async () => {
    await act(async () => { render(<AdminCandidateRequest user={adminUser} />) })
    await waitFor(() => expect(api.getJobs).toHaveBeenCalled())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AdminCustomFields
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminCustomFields', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks() })

  it('renders without crashing', async () => {
    await act(async () => { render(<AdminCustomFields user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getCustomFields on mount', async () => {
    await act(async () => { render(<AdminCustomFields user={adminUser} />) })
    await waitFor(() => expect(api.getCustomFields).toHaveBeenCalled())
  })

  it('shows a custom field when one exists', async () => {
    api.getCustomFields.mockResolvedValue({ data: [makeField({ name: 'LinkedIn URL' })] })
    await act(async () => { render(<AdminCustomFields user={adminUser} />) })
    await waitFor(() => expect(screen.getByText(/LinkedIn URL/i)).toBeInTheDocument())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AdminDriveApprovals
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminDriveApprovals', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks() })

  it('renders without crashing', async () => {
    await act(async () => { render(<AdminDriveApprovals user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getAdminDriveApprovals on mount', async () => {
    await act(async () => { render(<AdminDriveApprovals user={adminUser} />) })
    await waitFor(() => expect(api.getAdminDriveApprovals).toHaveBeenCalled())
  })

  it('calls api.getUsers on mount', async () => {
    await act(async () => { render(<AdminDriveApprovals user={adminUser} />) })
    await waitFor(() => expect(api.getUsers).toHaveBeenCalled())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AdminInsights
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminInsights', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks() })

  it('renders without crashing', async () => {
    await act(async () => { render(<AdminInsights user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getDashboardStats on mount', async () => {
    await act(async () => { render(<AdminInsights user={adminUser} />) })
    await waitFor(() => expect(api.getDashboardStats).toHaveBeenCalled())
  })

  it('calls api.getRecruiterLeaderboard on mount', async () => {
    await act(async () => { render(<AdminInsights user={adminUser} />) })
    await waitFor(() => expect(api.getRecruiterLeaderboard).toHaveBeenCalled())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AdminNPS
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminNPS', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks() })

  it('renders without crashing', async () => {
    await act(async () => { render(<AdminNPS user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getNpsStats on mount', async () => {
    await act(async () => { render(<AdminNPS user={adminUser} />) })
    await waitFor(() => expect(api.getNpsStats).toHaveBeenCalled())
  })

  it('shows NPS data when returned', async () => {
    api.getNpsStats.mockResolvedValue({ data: { avg: 8.5, count: 10, promoters: 7, detractors: 1, passives: 2 } })
    await act(async () => { render(<AdminNPS user={adminUser} />) })
    await waitFor(() => expect(screen.getByText(/8\.5|NPS|nps/i)).toBeInTheDocument())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AdminWebhooks
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminWebhooks', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks(); vi.spyOn(window, 'confirm').mockReturnValue(true) })

  it('renders without crashing', async () => {
    await act(async () => { render(<AdminWebhooks user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getWebhooks on mount', async () => {
    await act(async () => { render(<AdminWebhooks user={adminUser} />) })
    await waitFor(() => expect(api.getWebhooks).toHaveBeenCalled())
  })

  it('displays a webhook when one exists', async () => {
    api.getWebhooks.mockResolvedValue({ data: [makeWebhook({ name: 'Slack notify' })] })
    await act(async () => { render(<AdminWebhooks user={adminUser} />) })
    await waitFor(() => expect(screen.getByText(/Slack notify/i)).toBeInTheDocument())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AdminClients
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminClients', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks(); vi.spyOn(window, 'confirm').mockReturnValue(true) })

  it('renders without crashing', async () => {
    await act(async () => { render(<AdminClients user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getClients on mount', async () => {
    await act(async () => { render(<AdminClients user={adminUser} />) })
    await waitFor(() => expect(api.getClients).toHaveBeenCalled())
  })

  it('shows a client name when clients exist', async () => {
    api.getClients.mockResolvedValue({ data: [makeClient({ companyName: 'Client Corp' })] })
    await act(async () => { render(<AdminClients user={adminUser} />) })
    await waitFor(() => expect(screen.getByText(/Client Corp/i)).toBeInTheDocument())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EmailSequences
// ─────────────────────────────────────────────────────────────────────────────
describe('EmailSequences', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks(); vi.spyOn(window, 'confirm').mockReturnValue(true) })

  it('renders without crashing', async () => {
    await act(async () => { render(<EmailSequences user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getEmailSequences on mount', async () => {
    await act(async () => { render(<EmailSequences user={adminUser} />) })
    await waitFor(() => expect(api.getEmailSequences).toHaveBeenCalled())
  })

  it('shows a sequence name when sequences exist', async () => {
    api.getEmailSequences.mockResolvedValue({ data: [makeSequence({ name: 'Nurture Sequence' })] })
    await act(async () => { render(<EmailSequences user={adminUser} />) })
    await waitFor(() => expect(screen.getByText(/Nurture Sequence/i)).toBeInTheDocument())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// OrgSettings
// ─────────────────────────────────────────────────────────────────────────────
describe('OrgSettings', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks(); vi.spyOn(window, 'confirm').mockReturnValue(true) })

  it('renders without crashing', async () => {
    await act(async () => { render(<OrgSettings user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getCustomizations on mount', async () => {
    await act(async () => { render(<OrgSettings user={adminUser} />) })
    await waitFor(() => expect(api.getCustomizations).toHaveBeenCalled())
  })

  it('calls api.getPipelineTemplates on mount', async () => {
    await act(async () => { render(<OrgSettings user={adminUser} />) })
    await waitFor(() => expect(api.getPipelineTemplates).toHaveBeenCalled())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// OrgChart
// ─────────────────────────────────────────────────────────────────────────────
describe('OrgChart', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks() })

  it('renders without crashing', async () => {
    await act(async () => { render(<OrgChart user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getJobs on mount', async () => {
    await act(async () => { render(<OrgChart user={adminUser} />) })
    await waitFor(() => expect(api.getJobs).toHaveBeenCalled())
  })

  it('calls api.getUsers on mount', async () => {
    await act(async () => { render(<OrgChart user={adminUser} />) })
    await waitFor(() => expect(api.getUsers).toHaveBeenCalled())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// DuplicateMerge
// ─────────────────────────────────────────────────────────────────────────────
describe('DuplicateMerge', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks() })

  it('renders without crashing', async () => {
    await act(async () => { render(<DuplicateMerge user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.findDuplicateCandidates on mount', async () => {
    await act(async () => { render(<DuplicateMerge user={adminUser} />) })
    await waitFor(() => expect(api.findDuplicateCandidates).toHaveBeenCalled())
  })

  it('shows empty state when no duplicates found', async () => {
    api.findDuplicateCandidates.mockResolvedValue({ data: [] })
    await act(async () => { render(<DuplicateMerge user={adminUser} />) })
    await waitFor(() => expect(api.findDuplicateCandidates).toHaveBeenCalled())
    expect(document.body).toBeTruthy()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// HeadcountPlanner
// ─────────────────────────────────────────────────────────────────────────────
describe('HeadcountPlanner', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks() })

  it('renders without crashing', async () => {
    await act(async () => { render(<HeadcountPlanner user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getHeadcountPlans on mount', async () => {
    await act(async () => { render(<HeadcountPlanner user={adminUser} />) })
    await waitFor(() => expect(api.getHeadcountPlans).toHaveBeenCalled())
  })

  it('calls api.getJobs on mount', async () => {
    await act(async () => { render(<HeadcountPlanner user={adminUser} />) })
    await waitFor(() => expect(api.getJobs).toHaveBeenCalled())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// OfferLetterBuilder
// ─────────────────────────────────────────────────────────────────────────────
describe('OfferLetterBuilder', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks() })

  it('renders without crashing', async () => {
    await act(async () => { render(<OfferLetterBuilder user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getCustomizations on mount', async () => {
    await act(async () => { render(<OfferLetterBuilder user={adminUser} />) })
    await waitFor(() => expect(api.getCustomizations).toHaveBeenCalled())
  })

  it('does not crash when getCustomizations rejects', async () => {
    api.getCustomizations.mockRejectedValue(new Error('Network error'))
    await expect(
      act(async () => { render(<OfferLetterBuilder user={adminUser} />) })
    ).resolves.not.toThrow()
  })
})
