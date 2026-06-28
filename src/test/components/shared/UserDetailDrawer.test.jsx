import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── react-router-dom ──────────────────────────────────────────────────────────
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

// ── api ───────────────────────────────────────────────────────────────────────
vi.mock('../../../api/api.js', () => ({
  api: {
    getCandidate:            vi.fn(),
    getUser:                 vi.fn(),
    getOrgs:                 vi.fn(),
    getCustomFields:         vi.fn(),
    getCustomFieldValues:    vi.fn(),
    getUserSkillBadges:      vi.fn(),
    getApplications:         vi.fn(),
    getJobRecruiterHistory:  vi.fn(),
    getApplication:          vi.fn(),
    updateCandidate:         vi.fn(),
    updateUser:              vi.fn(),
    saveCustomFieldValues:   vi.fn(),
    updateStage:             vi.fn(),
  },
}))

// ── UI sub-components ─────────────────────────────────────────────────────────
vi.mock('../../../components/ui/Field.jsx', () => ({
  default: ({ label, value, onChange, type, placeholder }) => (
    <div data-testid="field">
      <label>{label}</label>
      <input
        aria-label={label}
        value={value ?? ''}
        onChange={e => onChange?.(e.target.value)}
        type={type || 'text'}
        placeholder={placeholder || ''}
      />
    </div>
  ),
}))

vi.mock('../../../components/ui/Badge.jsx', () => ({
  default: ({ label, color }) => <span data-testid="badge" style={{ color }}>{label}</span>,
}))

vi.mock('../../../components/ui/Toast.jsx', () => ({
  default: ({ msg, onClose }) =>
    msg ? <div data-testid="toast" onClick={onClose}>{msg}</div> : null,
}))

vi.mock('../../../components/ui/Spinner.jsx', () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}))

vi.mock('../../../components/shared/CandidateActivityTimeline.jsx', () => ({
  default: ({ app }) => <div data-testid="candidate-activity-timeline">{app?.job?.title || ''}</div>,
}))

vi.mock('../../../components/shared/CandidateCRMTimeline.jsx', () => ({
  default: ({ candidateId }) => <div data-testid="candidate-crm-timeline">{candidateId}</div>,
}))

vi.mock('../../../components/shared/ErrorReportBoundary.jsx', () => ({
  default: ({ children }) => <div data-testid="error-boundary">{children}</div>,
}))

vi.mock('../../../components/shared/ResumeCard.jsx', () => ({
  default: ({ candidate }) => <div data-testid="resume-card">{candidate?.name || ''}</div>,
}))

vi.mock('../../../components/modals/HiredDetailsModal.jsx', () => ({
  default: ({ candidateName, jobTitle, onClose, onSaved }) => (
    <div data-testid="hired-modal">
      <span>{candidateName}</span>
      <span>{jobTitle}</span>
      <button onClick={onClose}>Close Modal</button>
      <button onClick={onSaved}>Save Modal</button>
    </div>
  ),
}))

// ── constants ─────────────────────────────────────────────────────────────────
vi.mock('../../../constants/styles.js', () => ({
  Z:    { DRAWER: 9999 },
  btnP: { background: '#0176D3', color: '#fff' },
  btnG: { background: '#f1f5f9' },
  btnD: { background: '#fee2e2' },
  card: { background: '#fff', borderRadius: 12 },
}))

vi.mock('../../../constants/stages.js', () => ({
  STAGES: [
    { id: 'applied',             label: 'Applied',     icon: '📋', color: '#0176D3' },
    { id: 'screening',           label: 'Screening',   icon: '🔍', color: '#014486' },
    { id: 'shortlisted',         label: 'Shortlisted', icon: '⭐', color: '#A07E00' },
    { id: 'interview_scheduled', label: 'Interview',   icon: '📅', color: '#F59E0B' },
    { id: 'interview_completed', label: 'Interviewed', icon: '💬', color: '#0176D3' },
    { id: 'offer_extended',      label: 'Offer Sent',  icon: '📨', color: '#10b981' },
    { id: 'selected',            label: 'Hired',       icon: '🎉', color: '#2E844A' },
    { id: 'rejected',            label: 'Rejected',    icon: '✕',  color: '#BA0517' },
  ],
  SM: {
    applied:             { id: 'applied',             label: 'Applied',     icon: '📋', color: '#0176D3' },
    screening:           { id: 'screening',           label: 'Screening',   icon: '🔍', color: '#014486' },
    shortlisted:         { id: 'shortlisted',         label: 'Shortlisted', icon: '⭐', color: '#A07E00' },
    interview_scheduled: { id: 'interview_scheduled', label: 'Interview',   icon: '📅', color: '#F59E0B' },
    interview_completed: { id: 'interview_completed', label: 'Interviewed', icon: '💬', color: '#0176D3' },
    offer_extended:      { id: 'offer_extended',      label: 'Offer Sent',  icon: '📨', color: '#10b981' },
    selected:            { id: 'selected',            label: 'Hired',       icon: '🎉', color: '#2E844A' },
    rejected:            { id: 'rejected',            label: 'Rejected',    icon: '✕',  color: '#BA0517' },
  },
}))

// ── import after mocks ────────────────────────────────────────────────────────
import { api } from '../../../api/api.js'
import UserDetailDrawer from '../../../components/shared/UserDetailDrawer.jsx'

// ── helpers ───────────────────────────────────────────────────────────────────
function makeUser(overrides = {}) {
  return {
    id:             'u1',
    name:           'Alice Smith',
    email:          'alice@example.com',
    phone:          '9876543210',
    role:           'candidate',
    title:          'Senior Developer',
    location:       'Hyderabad',
    experience:     5,
    skills:         ['JavaScript', 'React'],
    summary:        'Experienced developer',
    availability:   'immediate',
    linkedinUrl:    'https://linkedin.com/in/alice',
    currentCompany: 'TCS',
    orgName:        'TalentNest HR',
    ...overrides,
  }
}

function makeApp(overrides = {}) {
  return {
    id:       'app1',
    _id:      'app1',
    stage:    'applied',
    jobId:    'job1',
    job:      { _id: 'job1', title: 'Senior Dev Role' },
    jobTitle: 'Senior Dev Role',
    createdAt: '2025-01-15T00:00:00Z',
    stageHistory: [],
    ...overrides,
  }
}

function defaultMocks() {
  api.getCandidate.mockResolvedValue({ name: 'Alice Smith', email: 'alice@example.com', role: 'candidate', id: 'u1' })
  api.getUser.mockRejectedValue(new Error('not a user'))
  api.getOrgs.mockResolvedValue([])
  api.getCustomFields.mockResolvedValue([])
  api.getUserSkillBadges.mockResolvedValue([])
  api.getApplications.mockResolvedValue([])
  api.getJobRecruiterHistory.mockResolvedValue([])
  api.getApplication.mockResolvedValue(null)
  api.updateCandidate.mockResolvedValue({ data: { id: 'u1', name: 'Alice Smith' } })
  api.updateUser.mockResolvedValue({ data: { id: 'u1' } })
  api.saveCustomFieldValues.mockResolvedValue({})
  api.updateStage.mockResolvedValue({})
}

// ── tests ─────────────────────────────────────────────────────────────────────
describe('UserDetailDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    defaultMocks()
  })

  // ── Guard: returns null when no user ───────────────────────────────────────
  it('renders nothing when user prop is null', () => {
    const { container } = render(
      <UserDetailDrawer user={null} onClose={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  // ── Mount & initial API calls ──────────────────────────────────────────────
  it('fetches candidate data on mount using user id', async () => {
    const user = makeUser()
    await act(async () => {
      render(<UserDetailDrawer user={user} onClose={vi.fn()} />)
    })
    expect(api.getCandidate).toHaveBeenCalledWith('u1')
  })

  it('falls back to getUser when getCandidate returns empty', async () => {
    api.getCandidate.mockResolvedValue({}) // empty — triggers fallback
    api.getUser.mockResolvedValue({ id: 'u1', name: 'Alice', role: 'admin' })
    const user = makeUser({ role: 'admin' })
    await act(async () => {
      render(<UserDetailDrawer user={user} onClose={vi.fn()} />)
    })
    expect(api.getUser).toHaveBeenCalledWith('u1')
  })

  it('falls back to getUser when getCandidate rejects', async () => {
    api.getCandidate.mockRejectedValue(new Error('not found'))
    api.getUser.mockResolvedValue({ id: 'u1', name: 'Alice', role: 'recruiter' })
    const user = makeUser({ role: 'recruiter' })
    await act(async () => {
      render(<UserDetailDrawer user={user} onClose={vi.fn()} />)
    })
    expect(api.getUser).toHaveBeenCalledWith('u1')
  })

  it('fetches custom fields on mount', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    expect(api.getCustomFields).toHaveBeenCalledWith('candidate')
  })

  it('fetches skill badges on mount', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    expect(api.getUserSkillBadges).toHaveBeenCalledWith('u1')
  })

  it('fetches orgs when isSuperAdmin is true', async () => {
    api.getOrgs.mockResolvedValue([{ id: 'org1', name: 'Acme Corp' }])
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} isSuperAdmin={true} />)
    })
    expect(api.getOrgs).toHaveBeenCalled()
  })

  it('does NOT fetch orgs when isSuperAdmin is false', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} isSuperAdmin={false} />)
    })
    expect(api.getOrgs).not.toHaveBeenCalled()
  })

  // ── Rendered header ────────────────────────────────────────────────────────
  it('renders the candidate name in the header', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  it('renders the role badge', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    const badges = screen.getAllByTestId('badge')
    expect(badges.some(b => b.textContent.toLowerCase().includes('candidate'))).toBe(true)
  })

  it('shows BGV Verified badge when bgvVerified is true', async () => {
    const user = makeUser({ bgvVerified: true })
    api.getCandidate.mockResolvedValue({ ...user, bgvVerified: true })
    await act(async () => {
      render(<UserDetailDrawer user={user} onClose={vi.fn()} />)
    })
    expect(screen.getByText(/BGV Verified/i)).toBeInTheDocument()
  })

  it('does not show BGV Verified badge when bgvVerified is false', async () => {
    const user = makeUser({ bgvVerified: false })
    await act(async () => {
      render(<UserDetailDrawer user={user} onClose={vi.fn()} />)
    })
    expect(screen.queryByText(/BGV Verified/i)).not.toBeInTheDocument()
  })

  it('renders org name in the header', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser({ orgName: 'TalentNest HR' })} onClose={vi.fn()} />)
    })
    expect(screen.getByText(/TalentNest HR/i)).toBeInTheDocument()
  })

  // ── Profile tab (default) ──────────────────────────────────────────────────
  it('shows Profile Information tab as active by default', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    const profileTab = screen.getByText(/Profile Information/i)
    expect(profileTab).toBeInTheDocument()
  })

  it('renders form fields on the profile tab', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    const fields = screen.getAllByTestId('field')
    expect(fields.length).toBeGreaterThan(0)
  })

  it('pre-populates Full Name field from user prop', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    const nameInput = screen.getByLabelText(/Full Name/i)
    expect(nameInput.value).toBe('Alice Smith')
  })

  it('pre-populates Email Address field from user prop', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    const emailInput = screen.getByLabelText(/Email Address/i)
    expect(emailInput.value).toBe('alice@example.com')
  })

  it('handles skills as an array by joining with comma', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser({ skills: ['React', 'Node.js'] })} onClose={vi.fn()} />)
    })
    const skillsInput = screen.getByLabelText(/Skills/i)
    expect(skillsInput.value).toBe('React, Node.js')
  })

  // ── Candidate-specific tabs visibility ────────────────────────────────────
  it('shows Career Tracking tab for candidate role', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser({ role: 'candidate' })} onClose={vi.fn()} />)
    })
    expect(screen.getByText(/Career Tracking/i)).toBeInTheDocument()
  })

  it('shows Full Timeline tab for candidate role', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser({ role: 'candidate' })} onClose={vi.fn()} />)
    })
    expect(screen.getByText(/Full Timeline/i)).toBeInTheDocument()
  })

  it('does not show Career Tracking tab for non-candidate role', async () => {
    api.getCandidate.mockResolvedValue({})  // triggers fallback to getUser
    api.getUser.mockResolvedValue({ id: 'u1', name: 'Bob', role: 'recruiter' })
    await act(async () => {
      render(<UserDetailDrawer user={makeUser({ role: 'recruiter' })} onClose={vi.fn()} />)
    })
    expect(screen.queryByText(/Career Tracking/i)).not.toBeInTheDocument()
  })

  it('always shows Documents tab regardless of role', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    expect(screen.getByText(/Documents/i)).toBeInTheDocument()
  })

  // ── Tab switching ──────────────────────────────────────────────────────────
  it('switches to Documents tab when clicked', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByText(/Documents/i))
    })
    expect(screen.getByTestId('resume-card')).toBeInTheDocument()
  })

  it('switches to Full Timeline (CRM) tab when clicked', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByText(/Full Timeline/i))
    })
    expect(screen.getByTestId('candidate-crm-timeline')).toBeInTheDocument()
  })

  it('fetches applications when Career Tracking tab is clicked', async () => {
    api.getApplications.mockResolvedValue([])
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByText(/Career Tracking/i))
    })
    expect(api.getApplications).toHaveBeenCalled()
  })

  it('shows CandidateActivityTimeline when Career Tracking tab has applications', async () => {
    const app = makeApp()
    api.getApplications.mockResolvedValue([app])
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} app={app} onClose={vi.fn()} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByText(/Career Tracking/i))
    })
    await waitFor(() => {
      expect(screen.getByTestId('candidate-activity-timeline')).toBeInTheDocument()
    })
  })

  it('navigate to resume page when View Full-Page Resume is clicked', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByText(/Documents/i))
    })
    fireEvent.click(screen.getByText(/View Full-Page Resume/i))
    expect(mockNavigate).toHaveBeenCalledWith('/app/resume/u1')
  })

  // ── Badges section ─────────────────────────────────────────────────────────
  it('renders skill badges section when API returns passed badges', async () => {
    api.getUserSkillBadges.mockResolvedValue([
      { skill: 'JavaScript', passed: true, badgeLevel: 'gold',   percentage: 95 },
      { skill: 'React',      passed: true, badgeLevel: 'silver', percentage: 75 },
    ])
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    expect(screen.getByText(/SKILL ASSESSMENTS/i)).toBeInTheDocument()
    expect(screen.getByText(/JavaScript/i)).toBeInTheDocument()
    expect(screen.getByText(/React/i)).toBeInTheDocument()
  })

  it('does NOT render badge section when no badges are returned', async () => {
    api.getUserSkillBadges.mockResolvedValue([])
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    expect(screen.queryByText(/SKILL ASSESSMENTS/i)).not.toBeInTheDocument()
  })

  it('filters out badges where passed is false', async () => {
    api.getUserSkillBadges.mockResolvedValue([
      { skill: 'Python',     passed: false, badgeLevel: 'bronze', percentage: 40 },
      { skill: 'JavaScript', passed: true,  badgeLevel: 'gold',   percentage: 90 },
    ])
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    expect(screen.getByText(/SKILL ASSESSMENTS/i)).toBeInTheDocument()
    expect(screen.queryByText('Python')).not.toBeInTheDocument()
    expect(screen.getByText(/JavaScript/i)).toBeInTheDocument()
  })

  it('renders badge section from array inside res.badges wrapper', async () => {
    api.getUserSkillBadges.mockResolvedValue({
      badges: [{ skill: 'Go', passed: true, badgeLevel: 'silver', percentage: 80 }],
    })
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    expect(screen.getByText(/SKILL ASSESSMENTS/i)).toBeInTheDocument()
    expect(screen.getByText(/Go/i)).toBeInTheDocument()
  })

  // ── Active Pipeline card ───────────────────────────────────────────────────
  it('renders ACTIVE PIPELINE card when app prop is provided', async () => {
    const app = makeApp()
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} app={app} onClose={vi.fn()} />)
    })
    expect(screen.getByText(/ACTIVE PIPELINE/i)).toBeInTheDocument()
    expect(screen.getByText('Senior Dev Role')).toBeInTheDocument()
  })

  it('does not show ACTIVE PIPELINE card when no app prop is provided', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    expect(screen.queryByText(/ACTIVE PIPELINE/i)).not.toBeInTheDocument()
  })

  // ── Save profile ───────────────────────────────────────────────────────────
  it('calls updateCandidate when Save Changes is clicked for a candidate', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByText(/Save Changes/i))
    })
    expect(api.updateCandidate).toHaveBeenCalledWith('u1', expect.any(Object))
  })

  it('calls updateUser when Save Changes is clicked for a non-candidate', async () => {
    api.getCandidate.mockResolvedValue({})
    api.getUser.mockResolvedValue({ id: 'u1', name: 'Bob', role: 'recruiter' })
    await act(async () => {
      render(<UserDetailDrawer user={makeUser({ role: 'recruiter' })} onClose={vi.fn()} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByText(/Save Changes/i))
    })
    expect(api.updateUser).toHaveBeenCalledWith('u1', expect.any(Object))
  })

  it('shows success toast after successful save', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByText(/Save Changes/i))
    })
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toBeInTheDocument()
    })
    expect(screen.getByTestId('toast').textContent).toMatch(/Profile updated/i)
  })

  it('shows error toast when save fails', async () => {
    api.updateCandidate.mockRejectedValue(new Error('Server error'))
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByText(/Save Changes/i))
    })
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toBeInTheDocument()
    })
    expect(screen.getByTestId('toast').textContent).toMatch(/Server error/i)
  })

  it('calls onUpdated callback with the updated result after save', async () => {
    const onUpdated = vi.fn()
    api.updateCandidate.mockResolvedValue({ data: { id: 'u1', name: 'Alice Updated' } })
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} onUpdated={onUpdated} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByText(/Save Changes/i))
    })
    await waitFor(() => {
      expect(onUpdated).toHaveBeenCalledWith({ id: 'u1', name: 'Alice Updated' })
    })
  })

  it('splits skills string by comma when saving as candidate', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser({ skills: 'React, Node.js, TypeScript' })} onClose={vi.fn()} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByText(/Save Changes/i))
    })
    const savedPayload = api.updateCandidate.mock.calls[0][1]
    expect(Array.isArray(savedPayload.skills)).toBe(true)
    expect(savedPayload.skills).toContain('React')
    expect(savedPayload.skills).toContain('Node.js')
    expect(savedPayload.skills).toContain('TypeScript')
  })

  it('saves custom field values when custom fields exist', async () => {
    api.getCustomFields.mockResolvedValue([
      { _id: 'cf1', label: 'Notice Period', type: 'text' },
    ])
    api.getCustomFieldValues.mockResolvedValue({ data: { values: { cf1: '30 days' } } })
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByText(/Save Changes/i))
    })
    await waitFor(() => {
      expect(api.saveCustomFieldValues).toHaveBeenCalledWith('candidate', 'u1', expect.any(Object))
    })
  })

  // ── Stage change ───────────────────────────────────────────────────────────
  it('calls updateStage and getApplication when stage select changes', async () => {
    const app = makeApp({ stage: 'applied' })
    api.getApplications.mockResolvedValue([app])
    api.getApplication.mockResolvedValue({ stageHistory: [] })
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} app={app} onClose={vi.fn()} />)
    })
    // Change stage via the profile tab dropdown
    const selects = screen.getAllByRole('combobox')
    await act(async () => {
      fireEvent.change(selects[0], { target: { value: 'screening' } })
    })
    await waitFor(() => {
      expect(api.updateStage).toHaveBeenCalledWith('app1', 'screening')
    })
  })

  it('shows stage update success toast after stage change', async () => {
    const app = makeApp({ stage: 'applied' })
    api.getApplication.mockResolvedValue({ stageHistory: [] })
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} app={app} onClose={vi.fn()} />)
    })
    const selects = screen.getAllByRole('combobox')
    await act(async () => {
      fireEvent.change(selects[0], { target: { value: 'screening' } })
    })
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toBeInTheDocument()
    })
    expect(screen.getByTestId('toast').textContent).toMatch(/Stage updated/i)
  })

  it('opens HiredDetailsModal when stage is changed to "selected"', async () => {
    const app = makeApp({ stage: 'applied' })
    api.getApplication.mockResolvedValue({ stageHistory: [] })
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} app={app} onClose={vi.fn()} />)
    })
    const selects = screen.getAllByRole('combobox')
    await act(async () => {
      fireEvent.change(selects[0], { target: { value: 'selected' } })
    })
    await waitFor(() => {
      expect(screen.getByTestId('hired-modal')).toBeInTheDocument()
    })
  })

  it('shows error toast when stage change fails', async () => {
    const app = makeApp({ stage: 'applied' })
    api.updateStage.mockRejectedValue(new Error('Update failed'))
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} app={app} onClose={vi.fn()} />)
    })
    const selects = screen.getAllByRole('combobox')
    await act(async () => {
      fireEvent.change(selects[0], { target: { value: 'screening' } })
    })
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toBeInTheDocument()
    })
    expect(screen.getByTestId('toast').textContent).toMatch(/Update failed/i)
  })

  // ── Close behaviour ────────────────────────────────────────────────────────
  it('calls onClose when the ✕ button is clicked', async () => {
    const onClose = vi.fn()
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={onClose} />)
    })
    fireEvent.click(screen.getByText('✕'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when the Cancel button is clicked', async () => {
    const onClose = vi.fn()
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={onClose} />)
    })
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when the backdrop overlay is clicked', async () => {
    const onClose = vi.fn()
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={onClose} />)
    })
    // The backdrop is the first sibling div with the flex:1 overlay style
    const backdrop = document.querySelector('[style*="rgba(5, 13, 26"]')
    if (backdrop) fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })

  // ── Delete ─────────────────────────────────────────────────────────────────
  it('renders delete button when onDelete prop is provided', async () => {
    const onDelete = vi.fn()
    const onClose = vi.fn()
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={onClose} onDelete={onDelete} />)
    })
    expect(screen.getByText('🗑')).toBeInTheDocument()
  })

  it('does not render delete button when onDelete prop is absent', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    expect(screen.queryByText('🗑')).not.toBeInTheDocument()
  })

  it('calls onDelete and onClose when delete is confirmed', async () => {
    const onDelete = vi.fn()
    const onClose = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={onClose} onDelete={onDelete} />)
    })
    fireEvent.click(screen.getByText('🗑'))
    expect(onDelete).toHaveBeenCalledWith('u1')
    expect(onClose).toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('does not call onDelete when delete is cancelled via confirm dialog', async () => {
    const onDelete = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} onDelete={onDelete} />)
    })
    fireEvent.click(screen.getByText('🗑'))
    expect(onDelete).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  // ── Admin settings ─────────────────────────────────────────────────────────
  it('shows administrative settings section for isSuperAdmin', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} isSuperAdmin={true} />)
    })
    expect(screen.getByText(/ADMINISTRATIVE SETTINGS/i)).toBeInTheDocument()
  })

  it('shows administrative settings section for admin role', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} currentUserRole="admin" />)
    })
    expect(screen.getByText(/ADMINISTRATIVE SETTINGS/i)).toBeInTheDocument()
  })

  it('hides administrative settings section for non-admin role', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} currentUserRole="recruiter" />)
    })
    expect(screen.queryByText(/ADMINISTRATIVE SETTINGS/i)).not.toBeInTheDocument()
  })

  it('shows super_admin role option only for isSuperAdmin', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} isSuperAdmin={true} />)
    })
    expect(screen.getByRole('option', { name: /Super Admin/i })).toBeInTheDocument()
  })

  it('does not show super_admin option for non-superadmin admin', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} currentUserRole="admin" />)
    })
    expect(screen.queryByRole('option', { name: /Super Admin/i })).not.toBeInTheDocument()
  })

  // ── Custom fields ──────────────────────────────────────────────────────────
  it('renders custom field text inputs', async () => {
    api.getCustomFields.mockResolvedValue([
      { _id: 'cf1', label: 'Notice Period', type: 'text' },
    ])
    api.getCustomFieldValues.mockResolvedValue({ data: { values: { cf1: '30 days' } } })
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    expect(screen.getByText(/CUSTOM FIELDS/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Notice Period/i)).toBeInTheDocument()
  })

  it('renders custom field select/dropdown', async () => {
    api.getCustomFields.mockResolvedValue([
      { _id: 'cf2', label: 'Work Mode', type: 'select', options: ['Remote', 'Hybrid', 'On-site'] },
    ])
    api.getCustomFieldValues.mockResolvedValue({ data: { values: {} } })
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    expect(screen.getByText(/CUSTOM FIELDS/i)).toBeInTheDocument()
  })

  it('renders custom field checkbox for boolean type', async () => {
    api.getCustomFields.mockResolvedValue([
      { _id: 'cf3', label: 'Willing to Relocate', type: 'boolean' },
    ])
    api.getCustomFieldValues.mockResolvedValue({ data: { values: {} } })
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    expect(screen.getByText(/CUSTOM FIELDS/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Willing to Relocate/i)).toBeInTheDocument()
  })

  // ── Placement details ──────────────────────────────────────────────────────
  it('renders PLACEMENT DETAILS section for candidate role', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser({ role: 'candidate' })} onClose={vi.fn()} />)
    })
    expect(screen.getByText(/PLACEMENT DETAILS/i)).toBeInTheDocument()
  })

  // ── Toast dismiss ──────────────────────────────────────────────────────────
  it('dismisses toast when toast element is clicked (onClose callback)', async () => {
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByText(/Save Changes/i))
    })
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toBeInTheDocument()
    })
    // Click the toast to dismiss it
    await act(async () => {
      fireEvent.click(screen.getByTestId('toast'))
    })
    expect(screen.queryByTestId('toast')).not.toBeInTheDocument()
  })

  // ── Edge cases ─────────────────────────────────────────────────────────────
  it('handles user with _id instead of id', async () => {
    const user = { _id: 'u2', name: 'Bob Jones', email: 'bob@example.com', role: 'candidate' }
    api.getCandidate.mockResolvedValue({ name: 'Bob Jones', email: 'bob@example.com', id: 'u2' })
    await act(async () => {
      render(<UserDetailDrawer user={user} onClose={vi.fn()} />)
    })
    expect(api.getCandidate).toHaveBeenCalledWith('u2')
  })

  it('handles getCustomFieldValues returning values directly (no data wrapper)', async () => {
    api.getCustomFields.mockResolvedValue([
      { _id: 'cf1', label: 'Notice Period', type: 'text' },
    ])
    api.getCustomFieldValues.mockResolvedValue({ values: { cf1: '60 days' } })
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    expect(screen.getByText(/CUSTOM FIELDS/i)).toBeInTheDocument()
  })

  it('does not crash when both getCandidate and getUser reject', async () => {
    api.getCandidate.mockRejectedValue(new Error('not found'))
    api.getUser.mockRejectedValue(new Error('also not found'))
    await expect(
      act(async () => {
        render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
      })
    ).resolves.not.toThrow()
  })

  it('does not crash when getUserSkillBadges rejects', async () => {
    api.getUserSkillBadges.mockRejectedValue(new Error('badge service down'))
    await expect(
      act(async () => {
        render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
      })
    ).resolves.not.toThrow()
  })

  it('handles badges returned as res.data array', async () => {
    api.getUserSkillBadges.mockResolvedValue({
      data: [{ skill: 'Docker', passed: true, badgeLevel: 'bronze', percentage: 60 }],
    })
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} onClose={vi.fn()} />)
    })
    expect(screen.getByText(/SKILL ASSESSMENTS/i)).toBeInTheDocument()
    expect(screen.getByText(/Docker/i)).toBeInTheDocument()
  })

  it('HiredDetailsModal can be closed via its Close button', async () => {
    const app = makeApp({ stage: 'applied' })
    api.getApplication.mockResolvedValue({ stageHistory: [] })
    await act(async () => {
      render(<UserDetailDrawer user={makeUser()} app={app} onClose={vi.fn()} />)
    })
    const selects = screen.getAllByRole('combobox')
    await act(async () => {
      fireEvent.change(selects[0], { target: { value: 'selected' } })
    })
    await waitFor(() => expect(screen.getByTestId('hired-modal')).toBeInTheDocument())
    await act(async () => {
      fireEvent.click(screen.getByText('Close Modal'))
    })
    expect(screen.queryByTestId('hired-modal')).not.toBeInTheDocument()
  })
})
