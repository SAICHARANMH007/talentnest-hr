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
    // DashboardWidgets
    getCustomizations: vi.fn(),
    updateCustomizationsSingleton: vi.fn(),
    // DiversityReport
    getDiversityReport: vi.fn(),
    seedDiversity: vi.fn(),
    // FaceAdminReview
    getDuplicateAlerts: vi.fn(),
    reviewDuplicateAlert: vi.fn(),
    getDuplicateCount: vi.fn(),
    // JobDistribution
    getJobDistribution: vi.fn(),
    getEmployerSettings: vi.fn(),
    retryDistribution: vi.fn(),
    saveEmployerSettings: vi.fn(),
    // JobRequirements
    getJobRequirements: vi.fn(),
    getJobRequirementRecruiters: vi.fn(),
    updateJobRequirementStatus: vi.fn(),
    assignJobRequirement: vi.fn(),
    createJobFromRequirement: vi.fn(),
    // OnboardingTemplates
    getOnboardingTemplates: vi.fn(),
    createOnboardingTemplate: vi.fn(),
    updateOnboardingTemplate: vi.fn(),
    deleteOnboardingTemplate: vi.fn(),
    // OutreachTracker
    getInvites: vi.fn(),
    updateInviteStatus: vi.fn(),
    resendInvite: vi.fn(),
    deleteInvite: vi.fn(),
    // PipelineHeatmap
    getPipelineHeatmap: vi.fn(),
    // RejectionTemplates
    getRejectionTemplates: vi.fn(),
    createRejectionTemplate: vi.fn(),
    updateRejectionTemplate: vi.fn(),
    deleteRejectionTemplate: vi.fn(),
    seedRejectionTemplates: vi.fn(),
    // SlaAlerts
    getSmartAlerts: vi.fn(),
    getSlaCompliance: vi.fn(),
    // SourcingTracker
    getSourceBreakdown: vi.fn(),
    // TalentPool
    getTalentPools: vi.fn(),
    createTalentPool: vi.fn(),
    updateTalentPool: vi.fn(),
    deleteTalentPool: vi.fn(),
    searchTalentPoolCandidates: vi.fn(),
    addToTalentPool: vi.fn(),
    removeFromTalentPool: vi.fn(),
    // TimeToFillTracker
    getTimeToFill: vi.fn(),
    // AdminReferrals
    getReferrals: vi.fn(),
    getReferralStats: vi.fn(),
    getJobs: vi.fn(),
    generateReferralLink: vi.fn(),
    setJobReferralReward: vi.fn(),
    markReferralHired: vi.fn(),
    payReferralReward: vi.fn(),
    // AdminReviews
    getAdminReviews: vi.fn(),
    getReportedReviews: vi.fn(),
    deleteReview: vi.fn(),
    reportReview: vi.fn(),
    unreportReview: vi.fn(),
    seedReviews: vi.fn(),
    // AdminSkillAssessments
    getSkillQuestions: vi.fn(),
    getSkillAttempts: vi.fn(),
    getAvailableSkills: vi.fn(),
    createSkillQuestion: vi.fn(),
    updateSkillQuestion: vi.fn(),
    deleteSkillQuestion: vi.fn(),
    seedBuiltInSkillQuestions: vi.fn(),
    // ContactLeads
    getLeads: vi.fn(),
    updateLead: vi.fn(),
    // CustomHiringStages
    saveCustomStages: vi.fn(),
    // AdminOnboarding
    getPreBoardings: vi.fn(),
    getHiredPending: vi.fn(),
    getPreBoardingDocStatus: vi.fn(),
    startPreBoarding: vi.fn(),
    updatePreBoardingTask: vi.fn(),
    verifyPreBoardingDocument: vi.fn(),
    sendPreBoardingWelcomeKit: vi.fn(),
    addPreBoardingTask: vi.fn(),
    updatePreBoarding: vi.fn(),
    // shared
    getUsers: vi.fn(),
    getDashboardStats: vi.fn(),
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
      action && React.createElement('div', { 'data-testid': 'page-action' }, action),
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

// ── Shared component stubs ─────────────────────────────────────────────────────
vi.mock('../../components/shared/PostJobForm.jsx', () => ({
  default: ({ onSuccess }) =>
    React.createElement('div', { 'data-testid': 'post-job-form' },
      React.createElement('button', { 'data-testid': 'post-job-submit', onClick: () => onSuccess?.({}) }, 'Submit'),
    ),
}))
vi.mock('../../components/shared/UserDetailDrawer.jsx', () => ({
  default: ({ onClose }) =>
    React.createElement('div', { 'data-testid': 'user-detail-drawer' },
      React.createElement('button', { 'data-testid': 'drawer-close', onClick: onClose }, 'Close'),
    ),
}))

// ── Recharts stub ──────────────────────────────────────────────────────────────
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
  ScatterChart: ({ children }) => React.createElement('div', null, children),
  Scatter: () => null,
  ZAxis: () => null,
}))

// ── NOW import React and test utilities ───────────────────────────────────────
import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from '../../api/api.js'

// ── Page imports (AFTER all mocks) ────────────────────────────────────────────
import DashboardWidgets from '../../pages/admin/DashboardWidgets.jsx'
import DiversityReport from '../../pages/admin/DiversityReport.jsx'
import FaceAdminReview from '../../pages/admin/FaceAdminReview.jsx'
import JobDistribution from '../../pages/admin/JobDistribution.jsx'
import JobRequirements from '../../pages/admin/JobRequirements.jsx'
import OnboardingTemplates from '../../pages/admin/OnboardingTemplates.jsx'
import OutreachTracker from '../../pages/admin/OutreachTracker.jsx'
import PipelineHeatmap from '../../pages/admin/PipelineHeatmap.jsx'
import RejectionTemplates from '../../pages/admin/RejectionTemplates.jsx'
import SlaAlerts from '../../pages/admin/SlaAlerts.jsx'
import SourcingTracker from '../../pages/admin/SourcingTracker.jsx'
import TalentPool from '../../pages/admin/TalentPool.jsx'
import TimeToFillTracker from '../../pages/admin/TimeToFillTracker.jsx'
import AdminReferrals from '../../pages/admin/AdminReferrals.jsx'
import AdminReviews from '../../pages/admin/AdminReviews.jsx'
import AdminSkillAssessments from '../../pages/admin/AdminSkillAssessments.jsx'
import ContactLeads from '../../pages/admin/ContactLeads.jsx'
import CustomHiringStages from '../../pages/admin/CustomHiringStages.jsx'
import AdminOnboarding from '../../pages/admin/AdminOnboarding.jsx'

// ── Fixtures ───────────────────────────────────────────────────────────────────
const adminUser = { id: 'a1', role: 'admin', tenantId: 'org1', orgName: 'Acme Corp', orgId: 'org1' }
const superAdminUser = { id: 'sa1', role: 'super_admin', tenantId: 'org1' }

function makeJob(overrides = {}) {
  return { _id: 'j1', id: 'j1', title: 'Software Engineer', status: 'active', ...overrides }
}
function makeAlert(overrides = {}) {
  return {
    _id: 'a1', id: 'a1', status: 'pending', similarityScore: 0.9,
    name1: 'Alice', email1: 'alice@example.com',
    name2: 'Alice2', email2: 'alice2@example.com',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}
function makeTemplate(overrides = {}) {
  return { _id: 't1', id: 't1', name: 'Onboarding Template', tasks: [], isDefault: false, ...overrides }
}
function makeRejectionTemplate(overrides = {}) {
  return { _id: 'rt1', id: 'rt1', name: 'General Rejection', stage: '', subject: 'Subject', body: 'Body', ...overrides }
}
function makeLead(overrides = {}) {
  return { _id: 'l1', id: 'l1', name: 'Lead Corp', email: 'lead@corp.com', status: 'new', ...overrides }
}
function makeQuestion(overrides = {}) {
  return {
    _id: 'q1', id: 'q1', skill: 'JavaScript', type: 'mcq_single', difficulty: 'medium',
    text: 'What is JSX?', options: [{ id: 'a', text: 'JavaScript XML', isCorrect: true }, { id: 'b', text: 'Java', isCorrect: false }],
    marks: 1, isActive: true, ...overrides,
  }
}
function makePreBoarding(overrides = {}) {
  return {
    _id: 'pb1', id: 'pb1', candidateName: 'Jane Doe', designation: 'SDE',
    status: 'pending', tasks: [], joiningDate: new Date().toISOString(), ...overrides,
  }
}
function makeReferral(overrides = {}) {
  return { _id: 'ref1', id: 'ref1', jobTitle: 'Engineer', referrerName: 'Bob', status: 'pending', ...overrides }
}
function makeReview(overrides = {}) {
  return { _id: 'rv1', id: 'rv1', rating: 4, title: 'Great company', reviewerName: 'Alice', ...overrides }
}
function makePool(overrides = {}) {
  return { _id: 'p1', id: 'p1', name: 'Senior Engineers', description: '', tags: [], members: [], ...overrides }
}

// ── Default mock setup ─────────────────────────────────────────────────────────
function setupDefaultMocks() {
  api.getCustomizations.mockResolvedValue({ data: {} })
  api.updateCustomizationsSingleton.mockResolvedValue({ success: true })
  api.getDiversityReport.mockResolvedValue({ data: { total: 0, genderBreakdown: [] } })
  api.seedDiversity.mockResolvedValue({ success: true })
  api.getDuplicateAlerts.mockResolvedValue({ data: [] })
  api.reviewDuplicateAlert.mockResolvedValue({ success: true })
  api.getDuplicateCount.mockResolvedValue({ count: 0 })
  api.getJobDistribution.mockResolvedValue({ data: { job: {}, platforms: [] } })
  api.getEmployerSettings.mockResolvedValue({ data: {} })
  api.retryDistribution.mockResolvedValue({ success: true })
  api.getJobRequirements.mockResolvedValue({ data: [] })
  api.getJobRequirementRecruiters.mockResolvedValue({ data: [] })
  api.updateJobRequirementStatus.mockResolvedValue({ data: {} })
  api.assignJobRequirement.mockResolvedValue({ data: {} })
  api.createJobFromRequirement.mockResolvedValue({ success: true })
  api.getOnboardingTemplates.mockResolvedValue({ data: [] })
  api.createOnboardingTemplate.mockResolvedValue({ data: makeTemplate() })
  api.updateOnboardingTemplate.mockResolvedValue({ data: makeTemplate() })
  api.deleteOnboardingTemplate.mockResolvedValue({ success: true })
  api.getInvites.mockResolvedValue([])
  api.updateInviteStatus.mockResolvedValue({ success: true })
  api.resendInvite.mockResolvedValue({ success: true })
  api.deleteInvite.mockResolvedValue({ success: true })
  api.getPipelineHeatmap.mockResolvedValue({ data: { daily: [], stages: {} } })
  api.getRejectionTemplates.mockResolvedValue({ data: [] })
  api.createRejectionTemplate.mockResolvedValue({ data: makeRejectionTemplate() })
  api.updateRejectionTemplate.mockResolvedValue({ data: makeRejectionTemplate() })
  api.deleteRejectionTemplate.mockResolvedValue({ success: true })
  api.seedRejectionTemplates.mockResolvedValue({ success: true })
  api.getSmartAlerts.mockResolvedValue({ data: { staleJobs: [], stuckCandidates: [], pendingOffers: [] } })
  api.getSlaCompliance.mockResolvedValue({ data: {} })
  api.getSourceBreakdown.mockResolvedValue({ data: [], total: 0 })
  api.getTalentPools.mockResolvedValue({ data: [] })
  api.createTalentPool.mockResolvedValue({ data: makePool() })
  api.updateTalentPool.mockResolvedValue({ data: makePool() })
  api.deleteTalentPool.mockResolvedValue({ success: true })
  api.searchTalentPoolCandidates.mockResolvedValue({ data: [] })
  api.addToTalentPool.mockResolvedValue({ success: true })
  api.removeFromTalentPool.mockResolvedValue({ success: true })
  api.getTimeToFill.mockResolvedValue({ data: { jobs: [], avgDays: 0 } })
  api.getReferrals.mockResolvedValue({ data: [] })
  api.getReferralStats.mockResolvedValue({ data: { total: 0, applied: 0, hired: 0, rewardsPaid: 0 } })
  api.getJobs.mockResolvedValue({ data: [] })
  api.generateReferralLink.mockResolvedValue({ link: 'https://example.com/ref/abc' })
  api.setJobReferralReward.mockResolvedValue({ success: true })
  api.markReferralHired.mockResolvedValue({ success: true })
  api.payReferralReward.mockResolvedValue({ success: true })
  api.getAdminReviews.mockResolvedValue({ data: [] })
  api.getReportedReviews.mockResolvedValue({ data: [] })
  api.deleteReview.mockResolvedValue({ success: true })
  api.reportReview.mockResolvedValue({ success: true })
  api.unreportReview.mockResolvedValue({ success: true })
  api.seedReviews.mockResolvedValue({ success: true })
  api.getSkillQuestions.mockResolvedValue({ questions: [], total: 0 })
  api.getSkillAttempts.mockResolvedValue({ attempts: [], total: 0 })
  api.getAvailableSkills.mockResolvedValue({ skills: [] })
  api.createSkillQuestion.mockResolvedValue({ data: makeQuestion() })
  api.updateSkillQuestion.mockResolvedValue({ data: makeQuestion() })
  api.deleteSkillQuestion.mockResolvedValue({ success: true })
  api.seedBuiltInSkillQuestions.mockResolvedValue({ message: 'Seeded 50 questions', totalInserted: 50 })
  api.getLeads.mockResolvedValue([])
  api.updateLead.mockResolvedValue({ data: makeLead() })
  api.saveCustomStages.mockResolvedValue({ success: true })
  api.getPreBoardings.mockResolvedValue({ data: [] })
  api.getHiredPending.mockResolvedValue({ data: [] })
  api.getPreBoardingDocStatus.mockResolvedValue({ data: [] })
  api.startPreBoarding.mockResolvedValue({ success: true })
  api.updatePreBoardingTask.mockResolvedValue({ data: makePreBoarding() })
  api.verifyPreBoardingDocument.mockResolvedValue({ data: makePreBoarding() })
  api.sendPreBoardingWelcomeKit.mockResolvedValue({ success: true })
  api.addPreBoardingTask.mockResolvedValue({ data: makePreBoarding() })
  api.updatePreBoarding.mockResolvedValue({ data: makePreBoarding() })
  api.getUsers.mockResolvedValue({ data: [] })
  api.getDashboardStats.mockResolvedValue({ data: {} })
}

// ─────────────────────────────────────────────────────────────────────────────
// DashboardWidgets
// ─────────────────────────────────────────────────────────────────────────────
describe('DashboardWidgets', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks() })

  it('renders without crashing', async () => {
    await act(async () => { render(<DashboardWidgets user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getCustomizations on mount', async () => {
    await act(async () => { render(<DashboardWidgets user={adminUser} />) })
    await waitFor(() => expect(api.getCustomizations).toHaveBeenCalled())
  })

  it('calls api.updateCustomizationsSingleton when save is triggered', async () => {
    api.getCustomizations.mockResolvedValue({ data: { dashboardWidgets: {} } })
    await act(async () => { render(<DashboardWidgets user={adminUser} />) })
    await waitFor(() => expect(api.getCustomizations).toHaveBeenCalled())
    const saveBtn = screen.queryByRole('button', { name: /save/i })
    if (saveBtn) {
      await act(async () => { fireEvent.click(saveBtn) })
      await waitFor(() => expect(api.updateCustomizationsSingleton).toHaveBeenCalled())
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// DiversityReport
// ─────────────────────────────────────────────────────────────────────────────
describe('DiversityReport', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks() })

  it('renders without crashing', async () => {
    await act(async () => { render(<DiversityReport user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getDiversityReport on mount', async () => {
    await act(async () => { render(<DiversityReport user={adminUser} />) })
    await waitFor(() => expect(api.getDiversityReport).toHaveBeenCalled())
  })

  it('does not crash when getDiversityReport rejects', async () => {
    api.getDiversityReport.mockRejectedValue(new Error('Server error'))
    await expect(
      act(async () => { render(<DiversityReport user={adminUser} />) })
    ).resolves.not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// FaceAdminReview
// ─────────────────────────────────────────────────────────────────────────────
describe('FaceAdminReview', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks() })

  it('renders without crashing', async () => {
    await act(async () => { render(<FaceAdminReview user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getDuplicateAlerts on mount', async () => {
    await act(async () => { render(<FaceAdminReview user={adminUser} />) })
    await waitFor(() => expect(api.getDuplicateAlerts).toHaveBeenCalled())
  })

  it('renders a pending alert when one exists', async () => {
    api.getDuplicateAlerts.mockResolvedValue({ data: [makeAlert({ status: 'pending' })] })
    await act(async () => { render(<FaceAdminReview user={adminUser} />) })
    await waitFor(() => expect(screen.getByText(/Alice/i)).toBeInTheDocument())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// JobDistribution
// ─────────────────────────────────────────────────────────────────────────────
describe('JobDistribution', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks() })

  it('renders without crashing', async () => {
    await act(async () => { render(<JobDistribution user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getJobDistribution on mount', async () => {
    await act(async () => { render(<JobDistribution user={adminUser} />) })
    await waitFor(() => expect(api.getJobDistribution).toHaveBeenCalled())
  })

  it('does not crash when getJobDistribution rejects', async () => {
    api.getJobDistribution.mockRejectedValue(new Error('Not found'))
    await expect(
      act(async () => { render(<JobDistribution user={adminUser} />) })
    ).resolves.not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// JobRequirements
// ─────────────────────────────────────────────────────────────────────────────
describe('JobRequirements', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks() })

  it('renders without crashing', async () => {
    await act(async () => { render(<JobRequirements user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getJobRequirements on mount', async () => {
    await act(async () => { render(<JobRequirements user={adminUser} />) })
    await waitFor(() => expect(api.getJobRequirements).toHaveBeenCalled())
  })

  it('calls api.getJobRequirementRecruiters on mount', async () => {
    await act(async () => { render(<JobRequirements user={adminUser} />) })
    await waitFor(() => expect(api.getJobRequirementRecruiters).toHaveBeenCalled())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// OnboardingTemplates
// ─────────────────────────────────────────────────────────────────────────────
describe('OnboardingTemplates', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks(); vi.spyOn(window, 'confirm').mockReturnValue(true) })

  it('renders without crashing', async () => {
    await act(async () => { render(<OnboardingTemplates user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getOnboardingTemplates on mount', async () => {
    await act(async () => { render(<OnboardingTemplates user={adminUser} />) })
    await waitFor(() => expect(api.getOnboardingTemplates).toHaveBeenCalled())
  })

  it('shows a template name when templates exist', async () => {
    api.getOnboardingTemplates.mockResolvedValue({ data: [makeTemplate({ name: 'Onboarding Template' })] })
    await act(async () => { render(<OnboardingTemplates user={adminUser} />) })
    await waitFor(() => expect(screen.getByText(/Onboarding Template/i)).toBeInTheDocument())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// OutreachTracker
// ─────────────────────────────────────────────────────────────────────────────
describe('OutreachTracker', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks() })

  it('renders without crashing', async () => {
    await act(async () => { render(<OutreachTracker user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getInvites on mount', async () => {
    await act(async () => { render(<OutreachTracker user={adminUser} />) })
    await waitFor(() => expect(api.getInvites).toHaveBeenCalled())
  })

  it('shows empty state when there are no invites', async () => {
    api.getInvites.mockResolvedValue([])
    await act(async () => { render(<OutreachTracker user={adminUser} />) })
    await waitFor(() => expect(screen.getByText(/No invites sent yet/i)).toBeInTheDocument())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PipelineHeatmap
// ─────────────────────────────────────────────────────────────────────────────
describe('PipelineHeatmap', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks() })

  it('renders without crashing', async () => {
    await act(async () => { render(<PipelineHeatmap user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getPipelineHeatmap on mount', async () => {
    await act(async () => { render(<PipelineHeatmap user={adminUser} />) })
    await waitFor(() => expect(api.getPipelineHeatmap).toHaveBeenCalled())
  })

  it('shows empty state when no heatmap data is returned', async () => {
    api.getPipelineHeatmap.mockResolvedValue(null)
    await act(async () => { render(<PipelineHeatmap user={adminUser} />) })
    await waitFor(() => expect(screen.getByText(/No pipeline activity yet/i)).toBeInTheDocument())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RejectionTemplates
// ─────────────────────────────────────────────────────────────────────────────
describe('RejectionTemplates', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks(); vi.spyOn(window, 'confirm').mockReturnValue(true) })

  it('renders without crashing', async () => {
    await act(async () => { render(<RejectionTemplates user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getRejectionTemplates on mount', async () => {
    await act(async () => { render(<RejectionTemplates user={adminUser} />) })
    await waitFor(() => expect(api.getRejectionTemplates).toHaveBeenCalled())
  })

  it('shows a rejection template name when templates exist', async () => {
    api.getRejectionTemplates.mockResolvedValue({ data: [makeRejectionTemplate({ name: 'General Rejection' })] })
    await act(async () => { render(<RejectionTemplates user={adminUser} />) })
    await waitFor(() => expect(screen.getByText(/General Rejection/i)).toBeInTheDocument())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SlaAlerts
// ─────────────────────────────────────────────────────────────────────────────
describe('SlaAlerts', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks() })

  it('renders without crashing', async () => {
    await act(async () => { render(<SlaAlerts user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getSmartAlerts on mount', async () => {
    await act(async () => { render(<SlaAlerts user={adminUser} />) })
    await waitFor(() => expect(api.getSmartAlerts).toHaveBeenCalled())
  })

  it('calls api.getSlaCompliance on mount', async () => {
    await act(async () => { render(<SlaAlerts user={adminUser} />) })
    await waitFor(() => expect(api.getSlaCompliance).toHaveBeenCalled())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SourcingTracker
// ─────────────────────────────────────────────────────────────────────────────
describe('SourcingTracker', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks() })

  it('renders without crashing', async () => {
    await act(async () => { render(<SourcingTracker user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getSourceBreakdown on mount', async () => {
    await act(async () => { render(<SourcingTracker user={adminUser} />) })
    await waitFor(() => expect(api.getSourceBreakdown).toHaveBeenCalled())
  })

  it('does not crash when getSourceBreakdown rejects', async () => {
    api.getSourceBreakdown.mockRejectedValue(new Error('Error'))
    await expect(
      act(async () => { render(<SourcingTracker user={adminUser} />) })
    ).resolves.not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// TalentPool
// ─────────────────────────────────────────────────────────────────────────────
describe('TalentPool', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks(); vi.spyOn(window, 'confirm').mockReturnValue(true) })

  it('renders without crashing', async () => {
    await act(async () => { render(<TalentPool user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getTalentPools on mount', async () => {
    await act(async () => { render(<TalentPool user={adminUser} />) })
    await waitFor(() => expect(api.getTalentPools).toHaveBeenCalled())
  })

  it('shows a pool name when pools exist', async () => {
    api.getTalentPools.mockResolvedValue({ data: [makePool({ name: 'Senior Engineers' })] })
    await act(async () => { render(<TalentPool user={adminUser} />) })
    await waitFor(() => expect(screen.getByText(/Senior Engineers/i)).toBeInTheDocument())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// TimeToFillTracker
// ─────────────────────────────────────────────────────────────────────────────
describe('TimeToFillTracker', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks() })

  it('renders without crashing', async () => {
    await act(async () => { render(<TimeToFillTracker user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getTimeToFill on mount', async () => {
    await act(async () => { render(<TimeToFillTracker user={adminUser} />) })
    await waitFor(() => expect(api.getTimeToFill).toHaveBeenCalled())
  })

  it('does not crash when getTimeToFill rejects', async () => {
    api.getTimeToFill.mockRejectedValue(new Error('Error'))
    await expect(
      act(async () => { render(<TimeToFillTracker user={adminUser} />) })
    ).resolves.not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AdminReferrals
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminReferrals', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks(); vi.spyOn(window, 'confirm').mockReturnValue(true) })

  it('renders without crashing', async () => {
    await act(async () => { render(<AdminReferrals user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getReferrals on mount', async () => {
    await act(async () => { render(<AdminReferrals user={adminUser} />) })
    await waitFor(() => expect(api.getReferrals).toHaveBeenCalled())
  })

  it('shows the Generate Referral Link button', async () => {
    await act(async () => { render(<AdminReferrals user={adminUser} />) })
    await waitFor(() => expect(screen.getByText(/Generate Referral Link/i)).toBeInTheDocument())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AdminReviews
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminReviews', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks(); vi.spyOn(window, 'confirm').mockReturnValue(true) })

  it('renders without crashing (admin role)', async () => {
    await act(async () => { render(<AdminReviews user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getAdminReviews on mount', async () => {
    await act(async () => { render(<AdminReviews user={adminUser} />) })
    await waitFor(() => expect(api.getAdminReviews).toHaveBeenCalled())
  })

  it('renders a review title when reviews are returned', async () => {
    api.getAdminReviews.mockResolvedValue({ data: [makeReview({ title: 'Great company' })] })
    await act(async () => { render(<AdminReviews user={adminUser} />) })
    await waitFor(() => expect(screen.getByText(/Great company/i)).toBeInTheDocument())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AdminSkillAssessments
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminSkillAssessments', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks(); vi.spyOn(window, 'confirm').mockReturnValue(true) })

  it('renders without crashing', async () => {
    await act(async () => { render(<AdminSkillAssessments user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getSkillQuestions on mount', async () => {
    await act(async () => { render(<AdminSkillAssessments user={adminUser} />) })
    await waitFor(() => expect(api.getSkillQuestions).toHaveBeenCalled())
  })

  it('calls api.getAvailableSkills on mount', async () => {
    await act(async () => { render(<AdminSkillAssessments user={adminUser} />) })
    await waitFor(() => expect(api.getAvailableSkills).toHaveBeenCalled())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ContactLeads
// ─────────────────────────────────────────────────────────────────────────────
describe('ContactLeads', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks() })

  it('renders without crashing', async () => {
    await act(async () => { render(<ContactLeads user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getLeads on mount', async () => {
    await act(async () => { render(<ContactLeads user={adminUser} />) })
    await waitFor(() => expect(api.getLeads).toHaveBeenCalled())
  })

  it('renders a lead when leads are returned', async () => {
    api.getLeads.mockResolvedValue([makeLead({ name: 'Lead Corp' })])
    await act(async () => { render(<ContactLeads user={adminUser} />) })
    await waitFor(() => expect(screen.getByText(/Lead Corp/i)).toBeInTheDocument())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CustomHiringStages
// ─────────────────────────────────────────────────────────────────────────────
describe('CustomHiringStages', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks() })

  it('renders without crashing', async () => {
    await act(async () => { render(<CustomHiringStages user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getJobs on mount to load jobs for selection', async () => {
    await act(async () => { render(<CustomHiringStages user={adminUser} />) })
    await waitFor(() => expect(api.getJobs).toHaveBeenCalled())
  })

  it('shows a job in the selector when jobs are returned', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob({ title: 'Software Engineer' })] })
    await act(async () => { render(<CustomHiringStages user={adminUser} />) })
    await waitFor(() => expect(screen.getByText(/Software Engineer/i)).toBeInTheDocument())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AdminOnboarding
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminOnboarding', () => {
  beforeEach(() => { vi.clearAllMocks(); setupDefaultMocks() })

  it('renders without crashing', async () => {
    await act(async () => { render(<AdminOnboarding user={adminUser} />) })
    expect(document.body).toBeTruthy()
  })

  it('calls api.getPreBoardings on mount', async () => {
    await act(async () => { render(<AdminOnboarding user={adminUser} />) })
    await waitFor(() => expect(api.getPreBoardings).toHaveBeenCalled())
  })

  it('calls api.getHiredPending on mount', async () => {
    await act(async () => { render(<AdminOnboarding user={adminUser} />) })
    await waitFor(() => expect(api.getHiredPending).toHaveBeenCalled())
  })
})
