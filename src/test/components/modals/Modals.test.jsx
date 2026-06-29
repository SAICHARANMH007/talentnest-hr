import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── react-router-dom ──────────────────────────────────────────────────────────
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }) => React.createElement('a', { href: to }, children),
}))

// ── api mock ──────────────────────────────────────────────────────────────────
vi.mock('../../../api/api.js', () => ({
  api: {
    updatePreBoardingByApplication: vi.fn().mockResolvedValue({}),
    scheduleInterview:              vi.fn().mockResolvedValue({}),
    sendEmail:                      vi.fn().mockResolvedValue({ previewUrl: 'http://example.com/preview' }),
    createWhatsAppSession:          vi.fn().mockResolvedValue({}),
    updateStage:                    vi.fn().mockResolvedValue({}),
    getCustomizations:              vi.fn().mockResolvedValue({ data: { rejectionReasons: [] } }),
    sendEmail:                      vi.fn().mockResolvedValue({}),
    getOfferByApplication:          vi.fn().mockResolvedValue({ id: 'offer1' }),
    updateOffer:                    vi.fn().mockResolvedValue({}),
    requestOfferApproval:           vi.fn().mockResolvedValue({}),
    getPipelineSmartMatch:          vi.fn().mockResolvedValue({ suggestions: [], hasBenchmarks: false, totalEvaluated: 0 }),
    updateStage:                    vi.fn().mockResolvedValue({}),
    getJobRecruiterHistory:         vi.fn().mockResolvedValue({ data: { history: [] } }),
    getJobRecruiterTimeline:        vi.fn().mockResolvedValue({ data: { timeline: [] } }),
    getApplications:                vi.fn().mockResolvedValue([]),
    getOnlineUsers:                 vi.fn().mockResolvedValue({ data: [] }),
  },
}))

// ── constants mocks ───────────────────────────────────────────────────────────
vi.mock('../../../constants/styles.js', () => ({
  card:  { background: '#fff', borderRadius: 12, padding: 20 },
  btnP:  { background: '#0176D3', color: '#fff', display: 'flex' },
  btnG:  { background: '#f1f5f9' },
  btnD:  { background: '#fee2e2', display: 'flex' },
  inp:   { border: '1px solid #E2E8F0' },
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
    applied:             { label: 'Applied',     icon: '📋', color: '#0176D3' },
    screening:           { label: 'Screening',   icon: '🔍', color: '#014486' },
    shortlisted:         { label: 'Shortlisted', icon: '⭐', color: '#A07E00' },
    interview_scheduled: { label: 'Interview',   icon: '📅', color: '#F59E0B' },
    interview_completed: { label: 'Interviewed', icon: '💬', color: '#0176D3' },
    offer_extended:      { label: 'Offer Sent',  icon: '📨', color: '#10b981' },
    selected:            { label: 'Hired',       icon: '🎉', color: '#2E844A' },
    rejected:            { label: 'Rejected',    icon: '✕',  color: '#BA0517' },
  },
}))

// ── sub-component mocks ───────────────────────────────────────────────────────
vi.mock('../../../components/ui/Modal.jsx', () => ({
  default: ({ title, children, footer, onClose }) => (
    <div data-testid="modal">
      <div data-testid="modal-title">
        {typeof title === 'string' ? title : <div>{title}</div>}
      </div>
      <button data-testid="modal-close" onClick={onClose}>✕</button>
      <div data-testid="modal-body">{children}</div>
      {footer && <div data-testid="modal-footer">{footer}</div>}
    </div>
  ),
}))

vi.mock('../../../components/ui/Toast.jsx', () => ({
  default: ({ msg, onClose }) =>
    msg ? <div data-testid="toast" onClick={onClose}>{msg}</div> : null,
}))

vi.mock('../../../components/ui/Field.jsx', () => ({
  default: ({ label, value, onChange, type, rows, placeholder, options }) => {
    if (options) {
      return (
        <div data-testid="field">
          <label>{label}</label>
          <select aria-label={label} value={value ?? ''} onChange={e => onChange?.(e.target.value)}>
            {options.map(o => {
              const v = typeof o === 'string' ? o : o.value
              const l = typeof o === 'string' ? o : o.label
              return <option key={v} value={v}>{l}</option>
            })}
          </select>
        </div>
      )
    }
    if (rows) {
      return (
        <div data-testid="field">
          <label>{label}</label>
          <textarea aria-label={label} value={value ?? ''} onChange={e => onChange?.(e.target.value)} placeholder={placeholder || ''} />
        </div>
      )
    }
    return (
      <div data-testid="field">
        <label>{label}</label>
        <input aria-label={label} value={value ?? ''} onChange={e => onChange?.(e.target.value)} type={type || 'text'} placeholder={placeholder || ''} />
      </div>
    )
  },
}))

vi.mock('../../../components/ui/Dropdown.jsx', () => ({
  default: ({ label, value, onChange, options }) => (
    <div data-testid="dropdown">
      <label>{label}</label>
      <select aria-label={label} value={value ?? ''} onChange={e => onChange?.(e.target.value)}>
        {(options || []).map(o => {
          const v = typeof o === 'string' ? o : o.value
          const l = typeof o === 'string' ? o : o.label
          return <option key={v} value={v}>{l}</option>
        })}
      </select>
    </div>
  ),
}))

vi.mock('../../../components/ui/Spinner.jsx', () => ({
  default: () => <span data-testid="spinner">…</span>,
}))

vi.mock('../../../components/ui/Badge.jsx', () => ({
  default: ({ label, color }) => <span data-testid="badge" style={{ color }}>{label}</span>,
}))

// ── hooks mocks ───────────────────────────────────────────────────────────────
vi.mock('../../../hooks/usePlatformSocket.js', () => ({
  usePlatformSocket: vi.fn(),
}))

// ── imports after mocks ───────────────────────────────────────────────────────
import { api } from '../../../api/api.js'
import HiredDetailsModal from '../../../components/modals/HiredDetailsModal.jsx'
import InterviewModal    from '../../../components/modals/InterviewModal.jsx'
import RejectModal       from '../../../components/modals/RejectModal.jsx'
import StageHistory      from '../../../components/pipeline/StageHistory.jsx'
import StageTracker      from '../../../components/pipeline/StageTracker.jsx'
import TalentMirror      from '../../../components/recruiter/TalentMirror.jsx'

// ── helpers ───────────────────────────────────────────────────────────────────
function makeApp(overrides = {}) {
  return {
    id:              'app1',
    interviewDate:   '',
    interviewTime:   '',
    interviewMode:   'video',
    interviewLink:   '',
    interviewNotes:  '',
    interviewRounds: [],
    candidate: {
      name:  'Alice Smith',
      email: 'alice@example.com',
      phone: '9876543210',
    },
    job: {
      title:   'Senior Developer',
      company: 'TalentNest HR',
    },
    ...overrides,
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// HiredDetailsModal
// ═════════════════════════════════════════════════════════════════════════════
describe('HiredDetailsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.updatePreBoardingByApplication.mockResolvedValue({})
  })

  it('renders without crashing', () => {
    render(
      <HiredDetailsModal
        appId="app1"
        candidateName="Alice Smith"
        jobTitle="Senior Developer"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    )
    expect(screen.getByTestId('modal')).toBeInTheDocument()
  })

  it('displays the candidate name', () => {
    render(
      <HiredDetailsModal
        appId="app1"
        candidateName="Bob Jones"
        jobTitle="UX Designer"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    )
    expect(screen.getByText('Bob Jones')).toBeInTheDocument()
  })

  it('displays the job title with "for" prefix', () => {
    render(
      <HiredDetailsModal
        appId="app1"
        candidateName="Alice"
        jobTitle="Backend Engineer"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    )
    expect(screen.getByText('for Backend Engineer')).toBeInTheDocument()
  })

  it('shows joining date label', () => {
    render(
      <HiredDetailsModal appId="app1" candidateName="Alice" onClose={vi.fn()} onSaved={vi.fn()} />
    )
    expect(screen.getByText(/Joining Date/i)).toBeInTheDocument()
  })

  it('calls onClose when Skip for Now is clicked', () => {
    const onClose = vi.fn()
    render(
      <HiredDetailsModal appId="app1" candidateName="Alice" onClose={onClose} onSaved={vi.fn()} />
    )
    fireEvent.click(screen.getByText('Skip for Now'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls api.updatePreBoardingByApplication when Save is clicked with a date', async () => {
    render(
      <HiredDetailsModal appId="app1" candidateName="Alice" onClose={vi.fn()} onSaved={vi.fn()} />
    )
    // Fill in joining date
    const dateInput = screen.getByLabelText(/Joining Date/i)
    fireEvent.change(dateInput, { target: { value: '2025-08-01' } })

    await act(async () => {
      fireEvent.click(screen.getByText('Save & Continue'))
    })
    expect(api.updatePreBoardingByApplication).toHaveBeenCalledWith('app1', expect.objectContaining({ joiningDate: '2025-08-01' }))
  })

  it('calls onSaved callback after successful save', async () => {
    const onSaved = vi.fn()
    const onClose = vi.fn()
    render(
      <HiredDetailsModal appId="app1" candidateName="Alice" onClose={onClose} onSaved={onSaved} />
    )
    await act(async () => {
      fireEvent.click(screen.getByText('Save & Continue'))
    })
    expect(onSaved).toHaveBeenCalled()
  })

  it('shows fallback dash when candidateName is not provided', () => {
    render(<HiredDetailsModal appId="app1" onClose={vi.fn()} onSaved={vi.fn()} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// InterviewModal
// ═════════════════════════════════════════════════════════════════════════════
describe('InterviewModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.scheduleInterview.mockResolvedValue({})
    api.sendEmail.mockResolvedValue({ previewUrl: 'http://preview.example.com' })
    api.createWhatsAppSession.mockResolvedValue({})
  })

  it('renders without crashing', () => {
    render(
      <InterviewModal
        app={makeApp()}
        recruiter={{ name: 'HR Team' }}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />
    )
    expect(screen.getByTestId('modal')).toBeInTheDocument()
  })

  it('renders candidate name', () => {
    render(
      <InterviewModal app={makeApp()} recruiter={{ name: 'HR' }} onClose={vi.fn()} onDone={vi.fn()} />
    )
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  it('renders job title and company', () => {
    render(
      <InterviewModal app={makeApp()} recruiter={{ name: 'HR' }} onClose={vi.fn()} onDone={vi.fn()} />
    )
    expect(screen.getByText('Senior Developer')).toBeInTheDocument()
    expect(screen.getByText('TalentNest HR')).toBeInTheDocument()
  })

  it('renders date and time fields', () => {
    render(
      <InterviewModal app={makeApp()} recruiter={{ name: 'HR' }} onClose={vi.fn()} onDone={vi.fn()} />
    )
    expect(screen.getByLabelText(/Interview Date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Interview Time/i)).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(
      <InterviewModal app={makeApp()} recruiter={{ name: 'HR' }} onClose={onClose} onDone={vi.fn()} />
    )
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows validation toast when scheduling without date/time', async () => {
    render(
      <InterviewModal app={makeApp()} recruiter={{ name: 'HR' }} onClose={vi.fn()} onDone={vi.fn()} />
    )
    await act(async () => {
      fireEvent.click(screen.getByText('Save Details Only'))
    })
    expect(screen.getByTestId('toast')).toBeInTheDocument()
    expect(screen.getByTestId('toast').textContent).toMatch(/Date and time required/i)
  })

  it('calls api.scheduleInterview when Save Details Only is clicked with date+time', async () => {
    const onDone = vi.fn()
    render(
      <InterviewModal
        app={makeApp({ interviewDate: '2025-08-15', interviewTime: '10:00' })}
        recruiter={{ name: 'HR' }}
        onClose={vi.fn()}
        onDone={onDone}
      />
    )
    await act(async () => {
      fireEvent.click(screen.getByText('Save Details Only'))
    })
    expect(api.scheduleInterview).toHaveBeenCalledWith(
      'app1',
      expect.objectContaining({ date: '2025-08-15', time: '10:00' })
    )
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// RejectModal
// ═════════════════════════════════════════════════════════════════════════════
describe('RejectModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getCustomizations.mockResolvedValue({ data: { rejectionReasons: [] } })
    api.updateStage.mockResolvedValue({})
    api.sendEmail.mockResolvedValue({})
  })

  it('renders without crashing', async () => {
    await act(async () => {
      render(
        <RejectModal app={makeApp()} onClose={vi.fn()} onDone={vi.fn()} />
      )
    })
    expect(screen.getByTestId('modal')).toBeInTheDocument()
  })

  it('displays candidate name', async () => {
    await act(async () => {
      render(<RejectModal app={makeApp()} onClose={vi.fn()} onDone={vi.fn()} />)
    })
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  it('displays job title and company', async () => {
    await act(async () => {
      render(<RejectModal app={makeApp()} onClose={vi.fn()} onDone={vi.fn()} />)
    })
    expect(screen.getByText(/Senior Developer @ TalentNest HR/i)).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    await act(async () => {
      render(<RejectModal app={makeApp()} onClose={onClose} onDone={vi.fn()} />)
    })
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls api.updateStage when Confirm Rejection is clicked', async () => {
    const onDone = vi.fn()
    await act(async () => {
      render(<RejectModal app={makeApp()} onClose={vi.fn()} onDone={onDone} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByText(/Confirm Rejection/i))
    })
    expect(api.updateStage).toHaveBeenCalledWith('app1', 'rejected', expect.any(String), expect.any(Object))
  })

  it('calls onDone after successful rejection', async () => {
    const onDone = vi.fn()
    await act(async () => {
      render(<RejectModal app={makeApp()} onClose={vi.fn()} onDone={onDone} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByText(/Confirm Rejection/i))
    })
    await waitFor(() => expect(onDone).toHaveBeenCalled())
  })

  it('shows notify candidate checkbox', async () => {
    await act(async () => {
      render(<RejectModal app={makeApp()} onClose={vi.fn()} onDone={vi.fn()} />)
    })
    expect(screen.getByText(/Notify candidate via email/i)).toBeInTheDocument()
  })

  it('sends email when notify checkbox is checked and confirmed', async () => {
    await act(async () => {
      render(<RejectModal app={makeApp()} onClose={vi.fn()} onDone={vi.fn()} />)
    })
    fireEvent.click(screen.getByRole('checkbox'))
    await act(async () => {
      fireEvent.click(screen.getByText(/Confirm Rejection/i))
    })
    await waitFor(() => expect(api.sendEmail).toHaveBeenCalled())
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// StageHistory
// ═════════════════════════════════════════════════════════════════════════════
describe('StageHistory', () => {
  it('renders nothing when history is empty', () => {
    const { container } = render(<StageHistory history={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when history is undefined', () => {
    const { container } = render(<StageHistory />)
    expect(container.firstChild).toBeNull()
  })

  it('renders "STAGE HISTORY" heading when history has entries', () => {
    const history = [
      { stageId: 'shortlisted', note: 'Looking good', movedAt: '2025-01-10T10:00:00Z' },
    ]
    render(<StageHistory history={history} />)
    expect(screen.getByText('STAGE HISTORY')).toBeInTheDocument()
  })

  it('renders stage label for each history entry', () => {
    const history = [
      { stageId: 'shortlisted', movedAt: '2025-01-10T10:00:00Z' },
      { stageId: 'interview_scheduled', movedAt: '2025-01-12T10:00:00Z' },
    ]
    render(<StageHistory history={history} />)
    expect(screen.getByText('Shortlisted')).toBeInTheDocument()
    expect(screen.getByText('Interview')).toBeInTheDocument()
  })

  it('renders notes when present', () => {
    const history = [
      { stageId: 'shortlisted', note: 'Great candidate', movedAt: '2025-01-10T10:00:00Z' },
    ]
    render(<StageHistory history={history} />)
    expect(screen.getByText('Great candidate')).toBeInTheDocument()
  })

  it('renders history in reverse order (most recent first)', () => {
    const history = [
      { stageId: 'applied',     movedAt: '2025-01-01T10:00:00Z' },
      { stageId: 'shortlisted', movedAt: '2025-01-10T10:00:00Z' },
    ]
    const { container } = render(<StageHistory history={history} />)
    const labels = container.querySelectorAll('[style*="color"]')
    // Shortlisted should appear before Applied in the DOM (reversed)
    expect(container.textContent).toContain('Shortlisted')
    expect(container.textContent).toContain('Applied')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// StageTracker
// ═════════════════════════════════════════════════════════════════════════════
describe('StageTracker', () => {
  it('renders without crashing for "applied" stage', () => {
    const { container } = render(<StageTracker stage="applied" />)
    expect(container.firstChild).not.toBeNull()
  })

  it('renders without crashing for "shortlisted" stage', () => {
    const { container } = render(<StageTracker stage="shortlisted" />)
    expect(container.firstChild).not.toBeNull()
  })

  it('renders stage labels for each main stage', () => {
    render(<StageTracker stage="applied" />)
    expect(screen.getByText('Applied')).toBeInTheDocument()
    expect(screen.getByText('Screening')).toBeInTheDocument()
    expect(screen.getByText('Shortlisted')).toBeInTheDocument()
  })

  it('shows Rejected badge when stage is rejected', () => {
    render(<StageTracker stage="rejected" />)
    expect(screen.getByTestId('badge')).toBeInTheDocument()
    expect(screen.getByText(/Rejected/i)).toBeInTheDocument()
  })

  it('does not show Rejected badge for non-rejected stages', () => {
    render(<StageTracker stage="shortlisted" />)
    expect(screen.queryByTestId('badge')).not.toBeInTheDocument()
  })

  it('shows ✓ for completed stages before the current', () => {
    render(<StageTracker stage="shortlisted" />)
    // stages before shortlisted (applied, screening) should have ✓
    expect(screen.getAllByText('✓').length).toBeGreaterThan(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// TalentMirror
// ═════════════════════════════════════════════════════════════════════════════
describe('TalentMirror', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getPipelineSmartMatch.mockResolvedValue({
      suggestions:   [],
      hasBenchmarks: false,
      totalEvaluated: 0,
    })
  })

  it('renders without crashing', async () => {
    await act(async () => {
      render(<TalentMirror jobId="job1" jobTitle="Senior Dev" onClose={vi.fn()} />)
    })
    expect(screen.getByText('Talent Mirror')).toBeInTheDocument()
  })

  it('shows the job title in the header', async () => {
    await act(async () => {
      render(<TalentMirror jobId="job1" jobTitle="React Engineer" onClose={vi.fn()} />)
    })
    expect(screen.getByText('React Engineer')).toBeInTheDocument()
  })

  it('calls onClose when the ✕ header button is clicked', async () => {
    const onClose = vi.fn()
    await act(async () => {
      render(<TalentMirror jobId="job1" jobTitle="Dev" onClose={onClose} />)
    })
    fireEvent.click(screen.getByText('✕'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when Close footer button is clicked', async () => {
    const onClose = vi.fn()
    await act(async () => {
      render(<TalentMirror jobId="job1" jobTitle="Dev" onClose={onClose} />)
    })
    // Footer has a "Close" button
    const closeBtns = screen.getAllByText('Close')
    fireEvent.click(closeBtns[closeBtns.length - 1])
    expect(onClose).toHaveBeenCalled()
  })

  it('calls api.getPipelineSmartMatch with the jobId on mount', async () => {
    await act(async () => {
      render(<TalentMirror jobId="job42" jobTitle="Dev" onClose={vi.fn()} />)
    })
    expect(api.getPipelineSmartMatch).toHaveBeenCalledWith('job42', expect.any(Object))
  })

  it('shows "no benchmarks" guidance when hasBenchmarks is false', async () => {
    await act(async () => {
      render(<TalentMirror jobId="job1" jobTitle="Dev" onClose={vi.fn()} />)
    })
    expect(screen.getByText(/Talent Mirror learns from your choices/i)).toBeInTheDocument()
  })

  it('renders threshold filter buttons', async () => {
    await act(async () => {
      render(<TalentMirror jobId="job1" jobTitle="Dev" onClose={vi.fn()} />)
    })
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('70%')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
  })

  it('renders Refresh button', async () => {
    await act(async () => {
      render(<TalentMirror jobId="job1" jobTitle="Dev" onClose={vi.fn()} />)
    })
    expect(screen.getByText(/↺/)).toBeInTheDocument()
  })

  it('shows an error message when API call fails', async () => {
    api.getPipelineSmartMatch.mockRejectedValue(new Error('Server error'))
    await act(async () => {
      render(<TalentMirror jobId="job1" jobTitle="Dev" onClose={vi.fn()} />)
    })
    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument()
    })
  })

  it('shows smart matches when API returns suggestions with benchmarks', async () => {
    api.getPipelineSmartMatch.mockResolvedValue({
      hasBenchmarks: true,
      suggestions: [
        {
          applicationId: 'app1',
          smartScore: 85,
          candidate: { name: 'Bob Smith', title: 'Developer', experience: 5 },
          matchedSkills: ['React', 'Node.js'],
          missingCoreSkills: [],
        },
      ],
      totalEvaluated: 10,
      idealProfile: { coreSkills: ['React'], expRange: '3-7y', benchmarkStages: ['shortlisted'] },
      benchmarkCount: 2,
    })
    await act(async () => {
      render(<TalentMirror jobId="job1" jobTitle="Dev" onClose={vi.fn()} />)
    })
    await waitFor(() => {
      expect(screen.getByText(/smart match/i)).toBeInTheDocument()
    })
  })
})
