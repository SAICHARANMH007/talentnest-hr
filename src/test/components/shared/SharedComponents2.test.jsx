// vi.mock() calls must come before any imports
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
  useLocation: () => ({ pathname: '/' }),
  Link: ({ children, to }) => React.createElement('a', { href: to }, children),
}))

vi.mock('../../../api/api.js', () => ({
  api: {
    // BulkWhatsAppModal
    sendBulkWhatsApp: vi.fn(),
    // ChangePasswordModal
    changePassword: vi.fn(),
    adminResetPassword: vi.fn(),
    // CollegeAutocomplete
    getCollegeDirectory: vi.fn(),
    // CompanyAutocomplete
    getCompanyDirectory: vi.fn(),
    // EmailSettingsModal
    getUser: vi.fn(),
    updateUser: vi.fn(),
    testSmtp: vi.fn(),
    // MessageModal / MessageInbox / ChatPanel
    sendMessage: vi.fn(),
    getMessageInbox: vi.fn(),
    getMessageContacts: vi.fn(),
    getConnections: vi.fn(),
    getMessageThread: vi.fn(),
    getOnlineUsers: vi.fn(),
    getUsers: vi.fn(),
    // ShareJobModal
    logJobShare: vi.fn(),
    sendEmail: vi.fn(),
    // InviteModal
    getJobs: vi.fn(),
    sendInvites: vi.fn(),
    // AddCandidateForm
    getOrgs: vi.fn(),
    parseResume: vi.fn(),
    checkDuplicate: vi.fn(),
    createUser: vi.fn(),
    // SecuritySettings
    getSessions: vi.fn(),
    toggle2FA: vi.fn(),
    terminateSession: vi.fn(),
    terminateOtherSessions: vi.fn(),
    terminateAllSessions: vi.fn(),
    deleteMyAccount: vi.fn(),
    // PostJobForm
    // CandidateCRMTimeline
    getCandidateTimeline: vi.fn(),
    // JobDetailDrawer
    getCandidates: vi.fn(),
    updateJob: vi.fn(),
    addCandidateToJob: vi.fn(),
  },
  clearToken: vi.fn(),
}))

vi.mock('../../../api/config.js', () => ({
  API_BASE_URL: 'http://localhost:5000/api',
  SOCKET_BASE_URL: 'http://localhost:5000',
}))

vi.mock('../../../api/matching.js', () => ({
  parseJD: vi.fn(() => ({})),
}))

// Heavy sub-component stubs
vi.mock('../../../components/ui/Modal.jsx', () => ({
  default: ({ title, children, footer, onClose }) =>
    React.createElement('div', { 'data-testid': 'modal' },
      React.createElement('div', { 'data-testid': 'modal-title', onClick: onClose }, typeof title === 'string' ? title : 'modal'),
      React.createElement('div', { 'data-testid': 'modal-body' }, children),
      footer ? React.createElement('div', { 'data-testid': 'modal-footer' }, footer) : null
    ),
}))

vi.mock('../../../components/ui/Field.jsx', () => ({
  default: ({ label, value, onChange, type, placeholder }) =>
    React.createElement('div', { 'data-testid': 'field' },
      label ? React.createElement('label', null, label) : null,
      React.createElement('input', {
        'aria-label': label || placeholder,
        value: value ?? '',
        onChange: e => onChange?.(e.target.value),
        type: type || 'text',
        placeholder: placeholder || '',
      })
    ),
}))

vi.mock('../../../components/ui/Badge.jsx', () => ({
  default: ({ label }) => React.createElement('span', { 'data-testid': 'badge' }, label),
}))

vi.mock('../../../components/ui/Spinner.jsx', () => ({
  default: () => React.createElement('div', { 'data-testid': 'spinner' }, 'Loading...'),
}))

vi.mock('../../../components/ui/Toast.jsx', () => ({
  default: ({ msg, onClose }) =>
    msg ? React.createElement('div', { 'data-testid': 'toast', onClick: onClose }, msg) : null,
}))

vi.mock('../../../components/ui/Dropdown.jsx', () => ({
  default: ({ label, value, onChange, options }) =>
    React.createElement('div', { 'data-testid': 'dropdown' },
      label ? React.createElement('label', null, label) : null,
      React.createElement('select', {
        'aria-label': label,
        value: value ?? '',
        onChange: e => onChange?.(e.target.value),
      },
        (options || []).map((o, i) =>
          React.createElement('option', { key: i, value: o.value ?? o }, o.label ?? o)
        )
      )
    ),
}))

vi.mock('../../../components/ui/UploadZone.jsx', () => ({
  default: ({ label, onFile }) =>
    React.createElement('div', { 'data-testid': 'upload-zone' },
      React.createElement('button', {
        onClick: () => onFile && onFile(new File(['x'], 'resume.pdf', { type: 'application/pdf' })),
      }, label || 'Upload'),
    ),
}))

vi.mock('../../../components/shared/ResumeCard.jsx', () => ({
  default: () => React.createElement('div', { 'data-testid': 'resume-card' }),
}))

// CompanyAutocomplete is tested directly below — do not mock it here

vi.mock('../../../components/shared/UserDetailDrawer.jsx', () => ({
  default: ({ onClose }) =>
    React.createElement('div', { 'data-testid': 'user-detail-drawer' },
      React.createElement('button', { onClick: onClose }, 'Close')
    ),
}))

vi.mock('../../../components/shared/CandidateActivityTimeline.jsx', () => ({
  default: () => React.createElement('div', { 'data-testid': 'candidate-activity-timeline' }),
}))

vi.mock('../../../constants/styles.js', () => ({
  btnP: {},
  btnG: {},
  btnD: {},
  card: {},
  inp: {},
}))

vi.mock('../../../constants/picklists.js', () => ({
  INDUSTRIES: [{ value: 'tech', label: 'Technology' }],
}))

vi.mock('../../../constants/stages.js', () => ({
  SM: {},
  STAGES: ['applied', 'shortlisted', 'interviewed', 'offered', 'hired'],
}))

vi.mock('../../../constants/sources.js', () => ({
  SOURCE_LABELS: { linkedin: 'LinkedIn', referral: 'Referral' },
}))

vi.mock('../../../hooks/useOrgOptions.js', () => ({
  useOrgOptions: () => ({
    departments: [{ value: 'engineering', label: 'Engineering' }],
    locations: [{ value: 'remote', label: 'Remote' }],
    branches: [],
    sources: ['linkedin', 'referral'],
  }),
}))

vi.mock('socket.io-client', () => ({
  io: () => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  }),
}))

import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api } from '../../../api/api.js'

import BulkWhatsAppModal from '../../../components/shared/BulkWhatsAppModal.jsx'
import ChangePasswordModal from '../../../components/shared/ChangePasswordModal.jsx'
import CollegeAutocomplete from '../../../components/shared/CollegeAutocomplete.jsx'
import CompanyAutocomplete from '../../../components/shared/CompanyAutocomplete.jsx'
import EmailSettingsModal from '../../../components/shared/EmailSettingsModal.jsx'
import MessageModal from '../../../components/shared/MessageModal.jsx'
import ShareJobModal from '../../../components/shared/ShareJobModal.jsx'
import StudentSearchPicker from '../../../components/shared/StudentSearchPicker.jsx'
import InviteModal from '../../../components/shared/InviteModal.jsx'
import AddCandidateForm from '../../../components/shared/AddCandidateForm.jsx'
import CommandPalette from '../../../components/shared/CommandPalette.jsx'
import MessageInbox from '../../../components/shared/MessageInbox.jsx'
import SecuritySettings from '../../../components/shared/SecuritySettings.jsx'

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const mockOnClose = vi.fn()

const mockJob = {
  id: 'job1',
  _id: 'job1',
  title: 'Senior Engineer',
  company: 'TalentNest',
  location: 'Remote',
  status: 'active',
  skills: ['React', 'Node.js'],
  description: 'A great role.',
}

const mockUser = {
  id: 'u1',
  _id: 'u1',
  name: 'Jane Recruiter',
  email: 'jane@talentnesthr.com',
  role: 'recruiter',
}

const mockCandidate = {
  id: 'c1',
  _id: 'c1',
  name: 'Bob Candidate',
  email: 'bob@example.com',
  phone: '9876543210',
  role: 'candidate',
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── BulkWhatsAppModal ────────────────────────────────────────────────────────

describe('BulkWhatsAppModal', () => {
  const defaultProps = {
    candidates: [mockCandidate],
    jobTitle: 'Senior Engineer',
    companyName: 'TalentNest',
    recruiterName: 'Jane Recruiter',
    onClose: mockOnClose,
    onComplete: vi.fn(),
  }

  it('renders without crashing', () => {
    render(<BulkWhatsAppModal {...defaultProps} />)
    expect(screen.getByTestId('modal')).toBeInTheDocument()
  })

  it('shows candidate count in the send button', () => {
    render(<BulkWhatsAppModal {...defaultProps} />)
    expect(screen.getByText(/Send to 1 Candidate/i)).toBeInTheDocument()
  })

  it('calls sendBulkWhatsApp when send button is clicked', async () => {
    api.sendBulkWhatsApp.mockResolvedValue({ data: { sent: 1, failed: 0 } })
    render(<BulkWhatsAppModal {...defaultProps} />)
    const sendBtn = screen.getByText(/Send to 1 Candidate/i)
    await act(async () => { fireEvent.click(sendBtn) })
    await waitFor(() => {
      expect(api.sendBulkWhatsApp).toHaveBeenCalledTimes(1)
    })
  })
})

// ─── ChangePasswordModal ──────────────────────────────────────────────────────

describe('ChangePasswordModal', () => {
  const defaultProps = {
    user: mockUser,
    onClose: mockOnClose,
  }

  it('renders without crashing', () => {
    render(<ChangePasswordModal {...defaultProps} />)
    expect(screen.getByTestId('modal')).toBeInTheDocument()
  })

  it('shows current password field for normal user', () => {
    render(<ChangePasswordModal {...defaultProps} />)
    expect(screen.getByPlaceholderText(/Enter your current password/i)).toBeInTheDocument()
  })

  it('calls changePassword when form is submitted', async () => {
    api.changePassword.mockResolvedValue({})
    render(<ChangePasswordModal {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText(/Enter your current password/i), { target: { value: 'OldPass123' } })
    fireEvent.change(screen.getByPlaceholderText(/Minimum 8 characters/i), { target: { value: 'NewPass123' } })
    fireEvent.change(screen.getByPlaceholderText(/Repeat new password/i), { target: { value: 'NewPass123' } })
    const saveBtn = screen.getByText(/Change Password/i)
    await act(async () => { fireEvent.click(saveBtn) })
    await waitFor(() => {
      expect(api.changePassword).toHaveBeenCalledWith('OldPass123', 'NewPass123')
    })
  })
})

// ─── CollegeAutocomplete ──────────────────────────────────────────────────────

describe('CollegeAutocomplete', () => {
  it('renders without crashing', () => {
    api.getCollegeDirectory.mockResolvedValue({ data: [] })
    render(<CollegeAutocomplete value="" onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText(/e.g. ABC Institute/i)).toBeInTheDocument()
  })

  it('calls onChange when user types', () => {
    api.getCollegeDirectory.mockResolvedValue({ data: [] })
    const onChange = vi.fn()
    render(<CollegeAutocomplete value="" onChange={onChange} />)
    const input = screen.getByPlaceholderText(/e.g. ABC Institute/i)
    fireEvent.change(input, { target: { value: 'MIT' } })
    expect(onChange).toHaveBeenCalledWith('MIT')
  })

  it('calls getCollegeDirectory on value change', async () => {
    api.getCollegeDirectory.mockResolvedValue({ data: ['MIT', 'IIT Delhi'] })
    render(<CollegeAutocomplete value="MIT" onChange={vi.fn()} />)
    await waitFor(() => {
      expect(api.getCollegeDirectory).toHaveBeenCalled()
    })
  })
})

// ─── CompanyAutocomplete ──────────────────────────────────────────────────────

describe('CompanyAutocomplete', () => {
  it('renders without crashing', () => {
    api.getCompanyDirectory.mockResolvedValue({ data: [] })
    render(<CompanyAutocomplete value="" onChange={vi.fn()} />)
    expect(screen.getByPlaceholderText(/e.g. Acme Corp/i)).toBeInTheDocument()
  })

  it('calls onChange when user types', () => {
    api.getCompanyDirectory.mockResolvedValue({ data: [] })
    const onChange = vi.fn()
    render(<CompanyAutocomplete value="" onChange={onChange} />)
    const input = screen.getByPlaceholderText(/e.g. Acme Corp/i)
    fireEvent.change(input, { target: { value: 'Google' } })
    expect(onChange).toHaveBeenCalledWith('Google')
  })

  it('calls getCompanyDirectory when value changes', async () => {
    api.getCompanyDirectory.mockResolvedValue({ data: ['Google', 'Amazon'] })
    render(<CompanyAutocomplete value="Goo" onChange={vi.fn()} />)
    await waitFor(() => {
      expect(api.getCompanyDirectory).toHaveBeenCalled()
    })
  })
})

// ─── EmailSettingsModal ───────────────────────────────────────────────────────

describe('EmailSettingsModal', () => {
  beforeEach(() => {
    api.getUser.mockResolvedValue({ emailConfig: null })
  })

  it('renders without crashing', async () => {
    await act(async () => {
      render(<EmailSettingsModal user={mockUser} onClose={mockOnClose} />)
    })
    expect(screen.getByTestId('modal')).toBeInTheDocument()
  })

  it('shows Resend tab by default', async () => {
    await act(async () => {
      render(<EmailSettingsModal user={mockUser} onClose={mockOnClose} />)
    })
    expect(screen.getAllByText(/Resend/i)[0]).toBeInTheDocument()
  })

  it('switches to SMTP tab when clicked', async () => {
    await act(async () => {
      render(<EmailSettingsModal user={mockUser} onClose={mockOnClose} />)
    })
    const smtpTab = screen.getByText(/Zoho \/ SMTP/i)
    await act(async () => { fireEvent.click(smtpTab) })
    expect(screen.getByText(/SMTP HOST/i)).toBeInTheDocument()
  })
})

// ─── MessageModal ─────────────────────────────────────────────────────────────

describe('MessageModal', () => {
  const recipient = { id: 'r1', name: 'Alice', role: 'recruiter' }

  it('renders without crashing', () => {
    render(<MessageModal recipient={recipient} onClose={mockOnClose} />)
    expect(screen.getByTestId('modal')).toBeInTheDocument()
  })

  it('shows message textarea with recipient name in placeholder', () => {
    render(<MessageModal recipient={recipient} onClose={mockOnClose} />)
    expect(screen.getByPlaceholderText(/Write a message to Alice/i)).toBeInTheDocument()
  })

  it('calls sendMessage when Send button is clicked', async () => {
    api.sendMessage.mockResolvedValue({})
    render(<MessageModal recipient={recipient} onClose={mockOnClose} />)
    const textarea = screen.getByPlaceholderText(/Write a message to Alice/i)
    fireEvent.change(textarea, { target: { value: 'Hello!' } })
    const sendBtn = screen.getByText('Send Message')
    await act(async () => { fireEvent.click(sendBtn) })
    await waitFor(() => {
      expect(api.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ toUserId: 'r1', message: 'Hello!' })
      )
    })
  })
})

// ─── ShareJobModal ────────────────────────────────────────────────────────────

describe('ShareJobModal', () => {
  beforeEach(() => {
    api.logJobShare.mockResolvedValue({ data: { token: 'tok123' } })
    api.sendEmail.mockResolvedValue({})
  })

  it('renders without crashing', () => {
    render(<ShareJobModal job={mockJob} onClose={mockOnClose} user={mockUser} />)
    expect(screen.getByTestId('modal')).toBeInTheDocument()
  })

  it('shows job title in the modal', () => {
    render(<ShareJobModal job={mockJob} onClose={mockOnClose} user={mockUser} />)
    expect(screen.getAllByText(/Senior Engineer/i)[0]).toBeInTheDocument()
  })

  it('shows Email tab by default and renders email TO field', () => {
    render(<ShareJobModal job={mockJob} onClose={mockOnClose} user={mockUser} />)
    expect(screen.getByPlaceholderText(/john@example.com/i)).toBeInTheDocument()
  })
})

// ─── StudentSearchPicker ──────────────────────────────────────────────────────

describe('StudentSearchPicker', () => {
  beforeEach(() => {
    api.getCollegeStudents = vi.fn().mockResolvedValue({ data: [] })
  })

  it('renders without crashing', () => {
    render(<StudentSearchPicker selected={new Set()} setSelected={vi.fn()} />)
    expect(screen.getByPlaceholderText(/Search by name/i)).toBeInTheDocument()
  })

  it('shows selected student count when items are selected', () => {
    render(<StudentSearchPicker selected={new Set(['s1', 's2'])} setSelected={vi.fn()} />)
    expect(screen.getByText(/2 students selected/i)).toBeInTheDocument()
  })

  it('calls Clear all when button clicked', () => {
    const setSelected = vi.fn()
    render(<StudentSearchPicker selected={new Set(['s1'])} setSelected={setSelected} />)
    const clearBtn = screen.getByText(/Clear all/i)
    fireEvent.click(clearBtn)
    expect(setSelected).toHaveBeenCalledWith(new Set())
  })
})

// ─── InviteModal ──────────────────────────────────────────────────────────────

describe('InviteModal', () => {
  const candidates = [
    { id: 'c1', name: 'Bob', email: 'bob@example.com' },
    { id: 'c2', name: 'Alice', email: 'alice@example.com' },
  ]

  beforeEach(() => {
    api.getJobs.mockResolvedValue({ data: [{ id: 'j1', title: 'Engineer', company: 'TN', status: 'active' }] })
  })

  it('renders without crashing', async () => {
    await act(async () => {
      render(<InviteModal candidates={candidates} onClose={mockOnClose} onSent={vi.fn()} />)
    })
    expect(screen.getByTestId('modal')).toBeInTheDocument()
  })

  it('shows candidate names in the invite modal', async () => {
    await act(async () => {
      render(<InviteModal candidates={candidates} onClose={mockOnClose} onSent={vi.fn()} />)
    })
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('shows job selector after jobs load', async () => {
    await act(async () => {
      render(<InviteModal candidates={candidates} onClose={mockOnClose} onSent={vi.fn()} />)
    })
    await waitFor(() => {
      expect(screen.getAllByText(/Engineer/i)[0]).toBeInTheDocument()
    })
  })
})

// ─── AddCandidateForm ─────────────────────────────────────────────────────────

describe('AddCandidateForm', () => {
  const addedBy = { id: 'rec1', role: 'recruiter', tenantId: 'org1' }

  beforeEach(() => {
    api.getOrgs.mockResolvedValue([])
    api.checkDuplicate.mockResolvedValue({ duplicates: [] })
    api.createUser.mockResolvedValue({ _upserted: false })
  })

  it('renders without crashing', () => {
    render(<AddCandidateForm addedBy={addedBy} onSuccess={vi.fn()} />)
    expect(screen.getByText(/Full Name/i)).toBeInTheDocument()
  })

  it('shows required fields', () => {
    render(<AddCandidateForm addedBy={addedBy} onSuccess={vi.fn()} />)
    expect(screen.getByText(/Email/i)).toBeInTheDocument()
    expect(screen.getByText(/Phone/i)).toBeInTheDocument()
  })

  it('shows validation toast when saving with empty required fields', async () => {
    render(<AddCandidateForm addedBy={addedBy} onSuccess={vi.fn()} />)
    const saveBtn = screen.getByText(/Save Candidate Record/i)
    await act(async () => { fireEvent.click(saveBtn) })
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toBeInTheDocument()
    })
  })
})

// ─── CommandPalette ───────────────────────────────────────────────────────────

describe('CommandPalette', () => {
  const nav = [
    { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { id: 'pipeline',  icon: '📋', label: 'Pipeline' },
  ]

  it('renders nothing when open=false', () => {
    const { container } = render(
      <CommandPalette open={false} onClose={mockOnClose} nav={nav} onLogout={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders search input when open=true', () => {
    render(<CommandPalette open={true} onClose={mockOnClose} nav={nav} onLogout={vi.fn()} />)
    expect(screen.getByPlaceholderText(/Search pages and actions/i)).toBeInTheDocument()
  })

  it('filters items by search query', () => {
    render(<CommandPalette open={true} onClose={mockOnClose} nav={nav} onLogout={vi.fn()} />)
    const input = screen.getByPlaceholderText(/Search pages and actions/i)
    fireEvent.change(input, { target: { value: 'Pipeline' } })
    expect(screen.getByText('Pipeline')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })
})

// ─── MessageInbox ─────────────────────────────────────────────────────────────

describe('MessageInbox', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(<MessageInbox open={false} onClose={mockOnClose} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders inbox when open=true', async () => {
    api.getMessageInbox.mockResolvedValue({ data: [] })
    await act(async () => {
      render(<MessageInbox open={true} onClose={mockOnClose} />)
    })
    expect(screen.getAllByText(/Messages/i)[0]).toBeInTheDocument()
  })

  it('shows empty state when no messages', async () => {
    api.getMessageInbox.mockResolvedValue({ data: [] })
    await act(async () => {
      render(<MessageInbox open={true} onClose={mockOnClose} />)
    })
    await waitFor(() => {
      expect(screen.getByText(/No messages yet/i)).toBeInTheDocument()
    })
  })
})

// ─── SecuritySettings ─────────────────────────────────────────────────────────

describe('SecuritySettings', () => {
  beforeEach(() => {
    api.getSessions.mockResolvedValue({ data: [] })
  })

  it('renders without crashing', async () => {
    await act(async () => {
      render(<SecuritySettings user={mockUser} />)
    })
    expect(screen.getByText(/Two-Factor Authentication/i)).toBeInTheDocument()
  })

  it('shows 2FA toggle', async () => {
    await act(async () => {
      render(<SecuritySettings user={{ ...mockUser, twoFactorEnabled: false }} />)
    })
    expect(screen.getByText(/2FA is disabled/i)).toBeInTheDocument()
  })

  it('calls toggle2FA when toggle is clicked', async () => {
    api.toggle2FA.mockResolvedValue({ twoFactorEnabled: true, message: '2FA enabled!' })
    await act(async () => {
      render(<SecuritySettings user={{ ...mockUser, twoFactorEnabled: false }} />)
    })
    const toggle = screen.getByRole('button', { name: 'Toggle' })
    await act(async () => { fireEvent.click(toggle) })
    await waitFor(() => {
      expect(api.toggle2FA).toHaveBeenCalledTimes(1)
    })
  })
})
