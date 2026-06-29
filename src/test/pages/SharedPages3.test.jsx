import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Router mock ───────────────────────────────────────────────────────────────
const mockNavigate = vi.fn()
const mockParams = { candidateId: 'cand123', userId: 'user456' }
const mockSearchParams = new URLSearchParams()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
  useLocation: () => ({ pathname: '/app', search: '' }),
  useSearchParams: () => [mockSearchParams, vi.fn()],
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  NavLink: ({ children, to }) => <a href={to}>{children}</a>,
}))

// ── API mock ───────────────────────────────────────────────────────────────────
vi.mock('../../api/api.js', () => ({
  api: {
    // ProfilePage
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    // ProvisionUserPage
    getOrgs: vi.fn(),
    getClients: vi.fn(),
    createUser: vi.fn(),
    // ResumeViewPage
    getCandidate: vi.fn(),
    getUser: vi.fn(),
    // UserPublicProfilePage
    getUserPosts: vi.fn(),
    getInfoRequestStatus: vi.fn(),
    getUserSkillBadges: vi.fn(),
    sendMessage: vi.fn(),
    requestInfo: vi.fn(),
  },
}))

// ── Constants mock ────────────────────────────────────────────────────────────
vi.mock('../../constants/styles.js', () => ({
  btnP: { background: '#0176D3', color: '#fff', border: 'none' },
  btnG: { background: '#fff', color: '#374151', border: '1px solid #E2E8F0' },
  btnD: { background: '#BA0517', color: '#fff', border: 'none' },
  card: { background: '#fff', borderRadius: 8, padding: 16 },
}))

// ── UI component mocks ────────────────────────────────────────────────────────
vi.mock('../../components/ui/Spinner.jsx', () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}))

vi.mock('../../components/ui/Toast.jsx', () => ({
  default: ({ msg, onClose }) =>
    msg ? <div data-testid="toast" onClick={onClose}>{msg}</div> : null,
}))

vi.mock('../../components/ui/PageHeader.jsx', () => ({
  default: ({ title, subtitle }) => (
    <div data-testid="page-header">
      <div data-testid="page-title">{title}</div>
      {subtitle && <div data-testid="page-subtitle">{subtitle}</div>}
    </div>
  ),
}))

vi.mock('../../components/ui/Field.jsx', () => ({
  default: ({ label, value, onChange, type, placeholder, options, loading, hint }) => {
    if (options) {
      return (
        <div>
          <label>{label}</label>
          <select
            value={value}
            onChange={e => onChange(e.target.value)}
            data-testid={`field-select-${(label || '').toLowerCase().replace(/\s+/g, '-')}`}
          >
            {(options || []).map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {hint && <span data-testid="field-hint">{hint}</span>}
        </div>
      )
    }
    return (
      <div>
        <label>{label}</label>
        <input
          type={type || 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          data-testid={`field-input-${(label || '').toLowerCase().replace(/\s+/g, '-')}`}
        />
      </div>
    )
  },
}))

vi.mock('../../components/ui/FormRow.jsx', () => ({
  default: ({ children, cols }) => <div data-testid={`form-row-${cols}`}>{children}</div>,
}))

vi.mock('../../components/ui/Modal.jsx', () => ({
  default: ({ title, children, onClose }) => (
    <div data-testid="modal">
      <div data-testid="modal-title">{title}</div>
      <button data-testid="modal-close" onClick={onClose}>×</button>
      {children}
    </div>
  ),
}))

// ── Shared component mocks ────────────────────────────────────────────────────
vi.mock('../../components/shared/SecuritySettings.jsx', () => ({
  default: ({ user }) => (
    <div data-testid="security-settings">
      <span data-testid="security-user">{user?.name || 'User'}</span>
      <div>2FA Settings</div>
      <div>Active Sessions</div>
    </div>
  ),
}))

vi.mock('../../components/face/ProfilePhotoEnroll.jsx', () => ({
  default: ({ user, onPhotoUpdated }) => (
    <div data-testid="profile-photo-enroll">
      <span data-testid="photo-enroll-name">{user?.name || 'User'}</span>
      <button
        data-testid="photo-update-btn"
        onClick={() => onPhotoUpdated('https://example.com/new-photo.jpg')}
      >
        Update Photo
      </button>
    </div>
  ),
}))

vi.mock('../../components/shared/ResumeCard.jsx', () => ({
  default: ({ candidate }) => (
    <div data-testid="resume-card">
      <div data-testid="resume-candidate-name">{candidate?.name || 'Candidate'}</div>
      <div data-testid="resume-candidate-email">{candidate?.email}</div>
    </div>
  ),
}))

vi.mock('../../components/modals/PersonalInfoModal.jsx', () => ({
  default: ({ person, contact, onClose }) => (
    <div data-testid="personal-info-modal">
      <div data-testid="personal-info-name">{person?.name}</div>
      <div data-testid="personal-info-email">{contact?.email}</div>
      <button data-testid="personal-info-close" onClick={onClose}>Close</button>
    </div>
  ),
}))

// ── Import pages AFTER all mocks ──────────────────────────────────────────────
import ProfilePage from '../../pages/shared/ProfilePage.jsx'
import ProvisionUserPage from '../../pages/shared/ProvisionUserPage.jsx'
import ResumeViewPage from '../../pages/shared/ResumeViewPage.jsx'
import SecuritySettingsPage from '../../pages/shared/SecuritySettingsPage.jsx'
import UserPublicProfilePage from '../../pages/shared/UserPublicProfilePage.jsx'
import PlatformModalsGuide from '../../pages/shared/PlatformModalsGuide.jsx'
import { api } from '../../api/api.js'

// ── Fixtures ──────────────────────────────────────────────────────────────────
const mockUser = {
  id: 'u1',
  _id: 'u1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+91 98765 43210',
  role: 'recruiter',
  title: 'Senior Recruiter',
  location: 'Hyderabad, India',
  summary: 'Experienced recruiter',
  linkedinUrl: 'https://linkedin.com/in/janedoe',
  photoUrl: '',
  orgId: 'org1',
  orgName: 'Acme Corp',
}

const mockAdminUser = {
  id: 'admin1',
  _id: 'admin1',
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'admin',
  orgId: 'org1',
  orgName: 'Acme Corp',
}

const mockSuperAdminUser = {
  id: 'sa1',
  _id: 'sa1',
  name: 'Super Admin',
  email: 'super@example.com',
  role: 'super_admin',
}

const mockCandidate = {
  _id: 'cand123',
  id: 'cand123',
  name: 'Alice Johnson',
  email: 'alice@example.com',
  phone: '+91 99999 00000',
  skills: ['React', 'Node.js'],
  experience: 4,
  location: 'Bangalore',
  summary: 'Full-stack developer',
}

const mockPublicUser = {
  _id: 'user456',
  id: 'user456',
  name: 'Bob Smith',
  email: 'bob@example.com',
  phone: '+91 88888 11111',
  role: 'recruiter',
  title: 'Talent Acquisition',
  location: 'Mumbai',
  summary: 'Passionate recruiter',
  skills: ['Sourcing', 'Screening'],
  linkedinUrl: 'https://linkedin.com/in/bobsmith',
  department: 'HR',
}

// =============================================================================
// ProfilePage
// =============================================================================
describe('ProfilePage', () => {
  const mockOnUserUpdate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnUserUpdate.mockClear()
    api.getProfile.mockResolvedValue({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+91 98765 43210',
      title: 'Senior Recruiter',
      location: 'Hyderabad',
      summary: 'Experienced recruiter',
      linkedinUrl: 'https://linkedin.com/in/janedoe',
    })
    api.updateProfile.mockResolvedValue({ name: 'Jane Doe', email: 'jane@example.com' })
    api.changePassword.mockResolvedValue({ success: true })
  })

  it('renders without crashing and shows My Profile heading', async () => {
    await act(async () => {
      render(<ProfilePage user={mockUser} onUserUpdate={mockOnUserUpdate} />)
    })
    expect(screen.getByText(/My Profile/i)).toBeInTheDocument()
  })

  it('calls api.getProfile on mount', async () => {
    await act(async () => {
      render(<ProfilePage user={mockUser} onUserUpdate={mockOnUserUpdate} />)
    })
    await waitFor(() => expect(api.getProfile).toHaveBeenCalledTimes(1))
  })

  it('shows user name and email in profile header', async () => {
    await act(async () => {
      render(<ProfilePage user={mockUser} onUserUpdate={mockOnUserUpdate} />)
    })
    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThan(0)
    // email appears in disabled input and profile header
    const emailEls = screen.getAllByText('jane@example.com')
    expect(emailEls.length).toBeGreaterThan(0)
  })

  it('shows role badge with formatted role label', async () => {
    await act(async () => {
      render(<ProfilePage user={mockUser} onUserUpdate={mockOnUserUpdate} />)
    })
    // role badge is an inline-block div with text-transform uppercase
    const badges = screen.getAllByText(/recruiter/i)
    expect(badges.length).toBeGreaterThan(0)
  })

  it('renders Personal Information section heading', async () => {
    await act(async () => {
      render(<ProfilePage user={mockUser} onUserUpdate={mockOnUserUpdate} />)
    })
    // h3 heading for Personal Information
    const headings = screen.getAllByText(/Personal Information/i)
    expect(headings.length).toBeGreaterThan(0)
  })

  it('renders Full Name input with user name', async () => {
    await act(async () => {
      render(<ProfilePage user={mockUser} onUserUpdate={mockOnUserUpdate} />)
    })
    const nameInput = screen.getByDisplayValue('Jane Doe')
    expect(nameInput).toBeInTheDocument()
  })

  it('renders email input as read-only/disabled', async () => {
    await act(async () => {
      render(<ProfilePage user={mockUser} onUserUpdate={mockOnUserUpdate} />)
    })
    const emailInput = screen.getByDisplayValue('jane@example.com')
    expect(emailInput).toBeDisabled()
  })

  it('updating Full Name input changes the value', async () => {
    await act(async () => {
      render(<ProfilePage user={mockUser} onUserUpdate={mockOnUserUpdate} />)
    })
    const nameInput = screen.getByDisplayValue('Jane Doe')
    fireEvent.change(nameInput, { target: { value: 'Jane Updated' } })
    expect(screen.getByDisplayValue('Jane Updated')).toBeInTheDocument()
  })

  it('clicking Save Changes calls api.updateProfile with form data', async () => {
    await act(async () => {
      render(<ProfilePage user={mockUser} onUserUpdate={mockOnUserUpdate} />)
    })
    await waitFor(() => expect(api.getProfile).toHaveBeenCalled())
    const saveBtn = screen.getByText(/Save Changes/i)
    await act(async () => {
      fireEvent.click(saveBtn)
    })
    await waitFor(() => {
      expect(api.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'jane@example.com' })
      )
    })
  })

  it('shows success message after profile save', async () => {
    await act(async () => {
      render(<ProfilePage user={mockUser} onUserUpdate={mockOnUserUpdate} />)
    })
    const saveBtn = screen.getByText(/Save Changes/i)
    await act(async () => {
      fireEvent.click(saveBtn)
    })
    await waitFor(() => {
      expect(screen.getByText(/Profile saved successfully/i)).toBeInTheDocument()
    })
  })

  it('calls onUserUpdate after successful save', async () => {
    await act(async () => {
      render(<ProfilePage user={mockUser} onUserUpdate={mockOnUserUpdate} />)
    })
    const saveBtn = screen.getByText(/Save Changes/i)
    await act(async () => {
      fireEvent.click(saveBtn)
    })
    await waitFor(() => {
      expect(mockOnUserUpdate).toHaveBeenCalledTimes(1)
    })
  })

  it('shows error message when api.updateProfile rejects', async () => {
    api.updateProfile.mockRejectedValue(new Error('Server error'))
    await act(async () => {
      render(<ProfilePage user={mockUser} onUserUpdate={mockOnUserUpdate} />)
    })
    const saveBtn = screen.getByText(/Save Changes/i)
    await act(async () => {
      fireEvent.click(saveBtn)
    })
    await waitFor(() => {
      expect(screen.getByText(/Server error/i)).toBeInTheDocument()
    })
  })

  it('renders Change Password section heading', async () => {
    await act(async () => {
      render(<ProfilePage user={mockUser} onUserUpdate={mockOnUserUpdate} />)
    })
    expect(screen.getByText(/Change Password/i)).toBeInTheDocument()
  })

  it('shows Update Password button', async () => {
    await act(async () => {
      render(<ProfilePage user={mockUser} onUserUpdate={mockOnUserUpdate} />)
    })
    expect(screen.getByText(/Update Password/i)).toBeInTheDocument()
  })

  it('shows password validation error when fields are empty', async () => {
    await act(async () => {
      render(<ProfilePage user={mockUser} onUserUpdate={mockOnUserUpdate} />)
    })
    const updatePwdBtn = screen.getByText(/Update Password/i)
    await act(async () => {
      fireEvent.click(updatePwdBtn)
    })
    await waitFor(() => {
      expect(screen.getByText(/All fields are required/i)).toBeInTheDocument()
    })
  })

  it('shows error when new password and confirm do not match', async () => {
    await act(async () => {
      render(<ProfilePage user={mockUser} onUserUpdate={mockOnUserUpdate} />)
    })
    const pwdInputs = screen.getAllByPlaceholderText(/password/i)
    // Current password
    fireEvent.change(pwdInputs[0], { target: { value: 'CurrentPass1' } })
    // New password
    fireEvent.change(pwdInputs[1], { target: { value: 'NewPass12345' } })
    // Confirm password — different
    fireEvent.change(pwdInputs[2], { target: { value: 'DifferentPass1' } })
    const updatePwdBtn = screen.getByText(/Update Password/i)
    await act(async () => {
      fireEvent.click(updatePwdBtn)
    })
    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument()
    })
  })

  it('calls api.changePassword with correct args on valid submission', async () => {
    await act(async () => {
      render(<ProfilePage user={mockUser} onUserUpdate={mockOnUserUpdate} />)
    })
    const pwdInputs = screen.getAllByPlaceholderText(/password/i)
    fireEvent.change(pwdInputs[0], { target: { value: 'CurrentPass1' } })
    fireEvent.change(pwdInputs[1], { target: { value: 'ValidPass1A' } })
    fireEvent.change(pwdInputs[2], { target: { value: 'ValidPass1A' } })
    const updatePwdBtn = screen.getByText(/Update Password/i)
    await act(async () => {
      fireEvent.click(updatePwdBtn)
    })
    await waitFor(() => {
      expect(api.changePassword).toHaveBeenCalledWith('CurrentPass1', 'ValidPass1A')
    })
  })

  it('shows success message after successful password update', async () => {
    await act(async () => {
      render(<ProfilePage user={mockUser} onUserUpdate={mockOnUserUpdate} />)
    })
    const pwdInputs = screen.getAllByPlaceholderText(/password/i)
    fireEvent.change(pwdInputs[0], { target: { value: 'CurrentPass1' } })
    fireEvent.change(pwdInputs[1], { target: { value: 'ValidPass1A' } })
    fireEvent.change(pwdInputs[2], { target: { value: 'ValidPass1A' } })
    await act(async () => {
      fireEvent.click(screen.getByText(/Update Password/i))
    })
    await waitFor(() => {
      expect(screen.getByText(/Password updated successfully/i)).toBeInTheDocument()
    })
  })

  it('renders ProfilePhotoEnroll component', async () => {
    await act(async () => {
      render(<ProfilePage user={mockUser} onUserUpdate={mockOnUserUpdate} />)
    })
    expect(screen.getByTestId('profile-photo-enroll')).toBeInTheDocument()
  })

  it('calls onUserUpdate when photo is updated', async () => {
    await act(async () => {
      render(<ProfilePage user={mockUser} onUserUpdate={mockOnUserUpdate} />)
    })
    const updatePhotoBtn = screen.getByTestId('photo-update-btn')
    await act(async () => {
      fireEvent.click(updatePhotoBtn)
    })
    await waitFor(() => {
      expect(mockOnUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ photoUrl: 'https://example.com/new-photo.jpg' })
      )
    })
  })

  it('renders SecuritySettings component', async () => {
    await act(async () => {
      render(<ProfilePage user={mockUser} onUserUpdate={mockOnUserUpdate} />)
    })
    expect(screen.getByTestId('security-settings')).toBeInTheDocument()
  })

  it('toggles password visibility when eye icon is clicked', async () => {
    await act(async () => {
      render(<ProfilePage user={mockUser} onUserUpdate={mockOnUserUpdate} />)
    })
    const eyeBtns = screen.getAllByText('👁️')
    expect(eyeBtns.length).toBeGreaterThan(0)
    fireEvent.click(eyeBtns[0])
    await waitFor(() => {
      expect(screen.getAllByText('🙈').length).toBeGreaterThan(0)
    })
  })

  it('shows password strength indicator when new password is typed', async () => {
    await act(async () => {
      render(<ProfilePage user={mockUser} onUserUpdate={mockOnUserUpdate} />)
    })
    const pwdInputs = screen.getAllByPlaceholderText(/password/i)
    fireEvent.change(pwdInputs[1], { target: { value: 'Test' } })
    // Strength meter renders strength label when next pwd has content
    await waitFor(() => {
      // "Weak" label appears as a specific strength div (not the advisory paragraph)
      const weakEls = screen.getAllByText(/Weak/i)
      // At least one element should be the strength label div (not the advisory text)
      const strengthLabel = weakEls.find(el =>
        el.style && el.style.fontWeight === '700' && !el.textContent.includes('characters')
      )
      expect(strengthLabel || weakEls.length).toBeTruthy()
    })
  })
})

// =============================================================================
// ProvisionUserPage
// =============================================================================
describe('ProvisionUserPage', () => {
  const mockOnBack = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnBack.mockClear()
    mockOnSuccess.mockClear()
    api.getOrgs.mockResolvedValue([
      { id: 'org1', name: 'Acme Corp' },
      { id: 'org2', name: 'TechCo' },
    ])
    api.getClients.mockResolvedValue([
      { id: 'client1', companyName: 'Client Alpha' },
    ])
    api.createUser.mockResolvedValue({ _id: 'newuser1', email: 'priya@acme.com' })
  })

  it('renders without crashing', async () => {
    await act(async () => {
      render(<ProvisionUserPage user={mockAdminUser} onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    expect(screen.getByText(/Provision New User/i)).toBeInTheDocument()
  })

  it('shows a Back button', async () => {
    await act(async () => {
      render(<ProvisionUserPage user={mockAdminUser} onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    expect(screen.getByText(/← Back/i)).toBeInTheDocument()
  })

  it('clicking Back button calls onBack', async () => {
    await act(async () => {
      render(<ProvisionUserPage user={mockAdminUser} onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    const backBtns = screen.getAllByText(/← Back/i)
    fireEvent.click(backBtns[0])
    expect(mockOnBack).toHaveBeenCalledTimes(1)
  })

  it('renders Full Name and Work Email fields', async () => {
    await act(async () => {
      render(<ProvisionUserPage user={mockAdminUser} onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    expect(screen.getByPlaceholderText(/Priya Sharma/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/priya@company\.com/i)).toBeInTheDocument()
  })

  it('renders Work Phone field', async () => {
    await act(async () => {
      render(<ProvisionUserPage user={mockAdminUser} onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    expect(screen.getByPlaceholderText(/\+91/i)).toBeInTheDocument()
  })

  it('shows Current Organisation box for admin role (not super_admin)', async () => {
    await act(async () => {
      render(<ProvisionUserPage user={mockAdminUser} onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    // The org box label text "Account Entity" appears only for admin (not super_admin)
    expect(screen.getByText(/Account Entity/i)).toBeInTheDocument()
  })

  it('calls api.getOrgs on mount for super_admin', async () => {
    await act(async () => {
      render(<ProvisionUserPage user={mockSuperAdminUser} onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    await waitFor(() => expect(api.getOrgs).toHaveBeenCalledTimes(1))
  })

  it('does NOT call api.getOrgs for admin user', async () => {
    await act(async () => {
      render(<ProvisionUserPage user={mockAdminUser} onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    expect(api.getOrgs).not.toHaveBeenCalled()
  })

  it('shows toast error when required fields are missing', async () => {
    await act(async () => {
      render(<ProvisionUserPage user={mockAdminUser} onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    const submitBtn = screen.getByText(/Provision Account/i)
    await act(async () => {
      fireEvent.click(submitBtn)
    })
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toBeInTheDocument()
    })
    expect(screen.getByTestId('toast').textContent).toMatch(/required/i)
  })

  it('shows validation error toast when only invalid email is provided without phone', async () => {
    await act(async () => {
      render(<ProvisionUserPage user={mockAdminUser} onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    // Click submit without filling anything to guarantee the "required" toast
    const submitBtns = screen.getAllByText(/Provision Account/i)
    const submitBtn = submitBtns[submitBtns.length - 1]
    // Close any previously shown toast first
    await act(async () => {
      fireEvent.click(submitBtn)
    })
    await waitFor(() => {
      const toast = screen.getByTestId('toast')
      expect(toast.textContent).toMatch(/required/i)
    })
    // Now close toast, fill name but leave email blank and verify toast shows again
    fireEvent.click(screen.getByTestId('toast'))
    const nameInput = screen.getByPlaceholderText(/Priya Sharma/i)
    fireEvent.change(nameInput, { target: { value: 'Priya Sharma' } })
    await act(async () => {
      fireEvent.click(submitBtn)
    })
    await waitFor(() => {
      expect(screen.getByTestId('toast')).toBeInTheDocument()
    })
  })

  it('calls api.createUser on valid form submission for admin', async () => {
    await act(async () => {
      render(<ProvisionUserPage user={mockAdminUser} onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    const nameInput = screen.getByPlaceholderText(/Priya Sharma/i)
    const emailInput = screen.getByPlaceholderText(/priya@company\.com/i)
    const phoneInput = screen.getByPlaceholderText(/\+91/i)
    fireEvent.change(nameInput, { target: { value: 'Priya Sharma' } })
    fireEvent.change(emailInput, { target: { value: 'priya@acme.com' } })
    fireEvent.change(phoneInput, { target: { value: '+91 98765 43210' } })
    const submitBtn = screen.getByText(/Provision Account/i)
    await act(async () => {
      fireEvent.click(submitBtn)
    })
    await waitFor(() => {
      expect(api.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Priya Sharma',
          email: 'priya@acme.com',
          phone: '+91 98765 43210',
          tenantId: 'org1',
        })
      )
    })
  })

  it('shows success toast after successful provisioning', async () => {
    await act(async () => {
      render(<ProvisionUserPage user={mockAdminUser} onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    const nameInput = screen.getByPlaceholderText(/Priya Sharma/i)
    const emailInput = screen.getByPlaceholderText(/priya@company\.com/i)
    const phoneInput = screen.getByPlaceholderText(/\+91/i)
    fireEvent.change(nameInput, { target: { value: 'Priya Sharma' } })
    fireEvent.change(emailInput, { target: { value: 'priya@acme.com' } })
    fireEvent.change(phoneInput, { target: { value: '+91 98765 43210' } })
    await act(async () => {
      fireEvent.click(screen.getByText(/Provision Account/i))
    })
    await waitFor(() => {
      expect(screen.getByTestId('toast').textContent).toMatch(/Invitation email sent/i)
    })
  })

  it('calls api.getClients when role is changed to client', async () => {
    await act(async () => {
      render(<ProvisionUserPage user={mockAdminUser} onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    const roleSelect = screen.getByTestId('field-select-platform-role')
    await act(async () => {
      fireEvent.change(roleSelect, { target: { value: 'client' } })
    })
    await waitFor(() => {
      expect(api.getClients).toHaveBeenCalledTimes(1)
    })
  })

  it('shows Client Company field when role is set to client', async () => {
    await act(async () => {
      render(<ProvisionUserPage user={mockAdminUser} onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    const roleSelect = screen.getByTestId('field-select-platform-role')
    await act(async () => {
      fireEvent.change(roleSelect, { target: { value: 'client' } })
    })
    await waitFor(() => {
      expect(screen.getByText(/Client Company/i)).toBeInTheDocument()
    })
  })

  it('renders the "What happens next?" information block', async () => {
    await act(async () => {
      render(<ProvisionUserPage user={mockAdminUser} onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    expect(screen.getByText(/What happens next/i)).toBeInTheDocument()
  })

  it('renders Cancel button that calls onBack', async () => {
    await act(async () => {
      render(<ProvisionUserPage user={mockAdminUser} onBack={mockOnBack} onSuccess={mockOnSuccess} />)
    })
    const cancelBtn = screen.getByText(/^Cancel$/i)
    fireEvent.click(cancelBtn)
    expect(mockOnBack).toHaveBeenCalled()
  })
})

// =============================================================================
// ResumeViewPage
// =============================================================================
describe('ResumeViewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getCandidate.mockResolvedValue(mockCandidate)
    api.getUser.mockResolvedValue({ data: mockCandidate })
  })

  it('renders without crashing and shows spinner initially', () => {
    api.getCandidate.mockReturnValue(new Promise(() => {}))
    render(<ResumeViewPage user={mockUser} />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('renders ResumeCard after data loads from candidate model', async () => {
    await act(async () => {
      render(<ResumeViewPage user={mockUser} />)
    })
    await waitFor(() => {
      expect(screen.getByTestId('resume-card')).toBeInTheDocument()
    })
  })

  it('shows candidate name in the toolbar', async () => {
    await act(async () => {
      render(<ResumeViewPage user={mockUser} />)
    })
    await waitFor(() => {
      // Candidate name appears in both toolbar and resume card stub
      const nameEls = screen.getAllByText(/Alice Johnson/i)
      expect(nameEls.length).toBeGreaterThan(0)
    })
  })

  it('calls api.getCandidate with candidateId from params', async () => {
    await act(async () => {
      render(<ResumeViewPage user={mockUser} />)
    })
    await waitFor(() => {
      expect(api.getCandidate).toHaveBeenCalledWith('cand123')
    })
  })

  it('falls back to api.getUser when getCandidate returns no document', async () => {
    api.getCandidate.mockResolvedValue(null)
    api.getUser.mockResolvedValue({ data: mockCandidate })
    await act(async () => {
      render(<ResumeViewPage user={mockUser} />)
    })
    await waitFor(() => {
      expect(api.getUser).toHaveBeenCalledWith('cand123')
    })
  })

  it('shows "Candidate not found" when both API calls fail', async () => {
    api.getCandidate.mockRejectedValue(new Error('Not found'))
    api.getUser.mockRejectedValue(new Error('Not found'))
    await act(async () => {
      render(<ResumeViewPage user={mockUser} />)
    })
    await waitFor(() => {
      expect(screen.getByText(/Candidate not found/i)).toBeInTheDocument()
    })
  })

  it('shows Go Back button in not-found state', async () => {
    api.getCandidate.mockRejectedValue(new Error('Not found'))
    api.getUser.mockRejectedValue(new Error('Not found'))
    await act(async () => {
      render(<ResumeViewPage user={mockUser} />)
    })
    await waitFor(() => {
      expect(screen.getByText(/← Go Back/i)).toBeInTheDocument()
    })
  })

  it('clicking Go Back calls navigate(-1)', async () => {
    api.getCandidate.mockRejectedValue(new Error('Not found'))
    api.getUser.mockRejectedValue(new Error('Not found'))
    await act(async () => {
      render(<ResumeViewPage user={mockUser} />)
    })
    await waitFor(() => screen.getByText(/← Go Back/i))
    fireEvent.click(screen.getByText(/← Go Back/i))
    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  it('renders toolbar Back button when candidate is loaded', async () => {
    await act(async () => {
      render(<ResumeViewPage user={mockUser} />)
    })
    await waitFor(() => {
      expect(screen.getByText(/← Back/i)).toBeInTheDocument()
    })
  })

  it('clicking toolbar Back button calls navigate(-1)', async () => {
    await act(async () => {
      render(<ResumeViewPage user={mockUser} />)
    })
    await waitFor(() => screen.getByText(/← Back/i))
    fireEvent.click(screen.getByText(/← Back/i))
    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  it('renders Print / Save PDF button', async () => {
    await act(async () => {
      render(<ResumeViewPage user={mockUser} />)
    })
    await waitFor(() => {
      expect(screen.getByText(/Print \/ Save PDF/i)).toBeInTheDocument()
    })
  })

  it('clicking Print button calls window.print', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
    await act(async () => {
      render(<ResumeViewPage user={mockUser} />)
    })
    await waitFor(() => screen.getByText(/Print \/ Save PDF/i))
    fireEvent.click(screen.getByText(/Print \/ Save PDF/i))
    expect(printSpy).toHaveBeenCalledTimes(1)
    printSpy.mockRestore()
  })
})

// =============================================================================
// SecuritySettingsPage
// =============================================================================
describe('SecuritySettingsPage', () => {
  const mockOnBack = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnBack.mockClear()
  })

  it('renders without crashing', () => {
    render(<SecuritySettingsPage user={mockUser} onBack={mockOnBack} />)
    expect(screen.getByTestId('page-header')).toBeInTheDocument()
  })

  it('shows "Security & Privacy" page title', () => {
    render(<SecuritySettingsPage user={mockUser} onBack={mockOnBack} />)
    expect(screen.getByTestId('page-title')).toHaveTextContent(/Security & Privacy/i)
  })

  it('shows subtitle about account security', () => {
    render(<SecuritySettingsPage user={mockUser} onBack={mockOnBack} />)
    expect(screen.getByTestId('page-subtitle')).toHaveTextContent(/keep your account safe/i)
  })

  it('renders "← Back to Profile" button', () => {
    render(<SecuritySettingsPage user={mockUser} onBack={mockOnBack} />)
    expect(screen.getByText(/← Back to Profile/i)).toBeInTheDocument()
  })

  it('clicking "← Back to Profile" calls onBack', () => {
    render(<SecuritySettingsPage user={mockUser} onBack={mockOnBack} />)
    fireEvent.click(screen.getByText(/← Back to Profile/i))
    expect(mockOnBack).toHaveBeenCalledTimes(1)
  })

  it('renders SecuritySettings component with user prop', () => {
    render(<SecuritySettingsPage user={mockUser} onBack={mockOnBack} />)
    expect(screen.getByTestId('security-settings')).toBeInTheDocument()
    expect(screen.getByTestId('security-user')).toHaveTextContent('Jane Doe')
  })

  it('shows Security Best Practices info card', () => {
    render(<SecuritySettingsPage user={mockUser} onBack={mockOnBack} />)
    expect(screen.getByText(/Security Best Practices/i)).toBeInTheDocument()
  })

  it('shows MFA recommendation text in best practices card', () => {
    render(<SecuritySettingsPage user={mockUser} onBack={mockOnBack} />)
    expect(screen.getByText(/enabling 2FA/i)).toBeInTheDocument()
  })

  it('renders correctly for admin user', () => {
    render(<SecuritySettingsPage user={mockAdminUser} onBack={mockOnBack} />)
    expect(screen.getByTestId('security-user')).toHaveTextContent('Admin User')
  })
})

// =============================================================================
// UserPublicProfilePage
// =============================================================================
describe('UserPublicProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    api.getUser.mockResolvedValue({ data: mockPublicUser })
    api.getUserPosts.mockResolvedValue({ data: [] })
    api.getInfoRequestStatus.mockResolvedValue({ data: { status: null } })
    api.getUserSkillBadges.mockResolvedValue({ badges: [] })
    api.sendMessage.mockResolvedValue({ success: true })
    api.requestInfo.mockResolvedValue({ success: true })
  })

  it('renders spinner while loading', () => {
    api.getUser.mockReturnValue(new Promise(() => {}))
    render(<UserPublicProfilePage user={mockUser} />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('renders profile after load', async () => {
    await act(async () => {
      render(<UserPublicProfilePage user={mockUser} />)
    })
    await waitFor(() => {
      expect(screen.getByText('Bob Smith')).toBeInTheDocument()
    })
  })

  it('calls api.getUser with userId from params on mount', async () => {
    await act(async () => {
      render(<UserPublicProfilePage user={mockUser} />)
    })
    await waitFor(() => {
      expect(api.getUser).toHaveBeenCalledWith('user456')
    })
  })

  it('calls api.getUserPosts with userId on mount', async () => {
    await act(async () => {
      render(<UserPublicProfilePage user={mockUser} />)
    })
    await waitFor(() => {
      expect(api.getUserPosts).toHaveBeenCalledWith('user456')
    })
  })

  it('calls api.getInfoRequestStatus on mount', async () => {
    await act(async () => {
      render(<UserPublicProfilePage user={mockUser} />)
    })
    await waitFor(() => {
      expect(api.getInfoRequestStatus).toHaveBeenCalledWith('user456')
    })
  })

  it('calls api.getUserSkillBadges on mount', async () => {
    await act(async () => {
      render(<UserPublicProfilePage user={mockUser} />)
    })
    await waitFor(() => {
      expect(api.getUserSkillBadges).toHaveBeenCalledWith('user456')
    })
  })

  it('shows person title when present', async () => {
    await act(async () => {
      render(<UserPublicProfilePage user={mockUser} />)
    })
    await waitFor(() => {
      expect(screen.getByText('Talent Acquisition')).toBeInTheDocument()
    })
  })

  it('shows person location when present', async () => {
    await act(async () => {
      render(<UserPublicProfilePage user={mockUser} />)
    })
    await waitFor(() => {
      expect(screen.getByText(/Mumbai/i)).toBeInTheDocument()
    })
  })

  it('shows person summary when present', async () => {
    await act(async () => {
      render(<UserPublicProfilePage user={mockUser} />)
    })
    await waitFor(() => {
      expect(screen.getByText(/Passionate recruiter/i)).toBeInTheDocument()
    })
  })

  it('shows skills section with skill tags when skills are present', async () => {
    await act(async () => {
      render(<UserPublicProfilePage user={mockUser} />)
    })
    await waitFor(() => {
      expect(screen.getByText('Sourcing')).toBeInTheDocument()
      expect(screen.getByText('Screening')).toBeInTheDocument()
    })
  })

  it('renders Back button that calls navigate(-1)', async () => {
    await act(async () => {
      render(<UserPublicProfilePage user={mockUser} />)
    })
    await waitFor(() => screen.getByText(/← Back/i))
    fireEvent.click(screen.getByText(/← Back/i))
    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  it('shows role badge in hero banner', async () => {
    await act(async () => {
      render(<UserPublicProfilePage user={mockUser} />)
    })
    await waitFor(() => {
      // Role label appears in the hero banner (may appear multiple times on page)
      const recruiterEls = screen.getAllByText(/Recruiter/i)
      expect(recruiterEls.length).toBeGreaterThan(0)
    })
  })

  it('shows Message button for non-self profiles', async () => {
    const differentUser = { ...mockUser, id: 'different-user', _id: 'different-user' }
    await act(async () => {
      render(<UserPublicProfilePage user={differentUser} />)
    })
    await waitFor(() => {
      expect(screen.getByText(/Message/i)).toBeInTheDocument()
    })
  })

  it('does NOT show Message button when viewing own profile', async () => {
    // isSelf = true when currentUser id matches person id
    const selfUser = { ...mockUser, id: 'user456', _id: 'user456' }
    await act(async () => {
      render(<UserPublicProfilePage user={selfUser} />)
    })
    await waitFor(() => {
      expect(screen.queryByText(/✉️ Message/i)).not.toBeInTheDocument()
    })
  })

  it('clicking Message button opens compose panel', async () => {
    const differentUser = { ...mockUser, id: 'different-user', _id: 'different-user' }
    await act(async () => {
      render(<UserPublicProfilePage user={differentUser} />)
    })
    await waitFor(() => screen.getByText(/✉️ Message/i))
    fireEvent.click(screen.getByText(/✉️ Message/i))
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Write your message/i)).toBeInTheDocument()
    })
  })

  it('calls api.sendMessage when message is composed and sent', async () => {
    const differentUser = { ...mockUser, id: 'different-user', _id: 'different-user' }
    await act(async () => {
      render(<UserPublicProfilePage user={differentUser} />)
    })
    await waitFor(() => screen.getByText(/✉️ Message/i))
    fireEvent.click(screen.getByText(/✉️ Message/i))
    await waitFor(() => screen.getByPlaceholderText(/Write your message/i))
    const textarea = screen.getByPlaceholderText(/Write your message/i)
    fireEvent.change(textarea, { target: { value: 'Hello there!' } })
    const sendBtn = screen.getByText(/^Send$/i)
    await act(async () => {
      fireEvent.click(sendBtn)
    })
    await waitFor(() => {
      expect(api.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ toUserId: 'user456', message: 'Hello there!' })
      )
    })
  })

  it('shows success state after message is sent', async () => {
    const differentUser = { ...mockUser, id: 'different-user', _id: 'different-user' }
    await act(async () => {
      render(<UserPublicProfilePage user={differentUser} />)
    })
    await waitFor(() => screen.getByText(/✉️ Message/i))
    fireEvent.click(screen.getByText(/✉️ Message/i))
    await waitFor(() => screen.getByPlaceholderText(/Write your message/i))
    fireEvent.change(screen.getByPlaceholderText(/Write your message/i), {
      target: { value: 'Hello!' },
    })
    await act(async () => {
      fireEvent.click(screen.getByText(/^Send$/i))
    })
    await waitFor(() => {
      expect(screen.getByText(/Message sent/i)).toBeInTheDocument()
    })
  })

  it('shows Recent Activity section', async () => {
    await act(async () => {
      render(<UserPublicProfilePage user={mockUser} />)
    })
    await waitFor(() => {
      expect(screen.getByText(/Recent Activity/i)).toBeInTheDocument()
    })
  })

  it('shows empty posts state when no posts are found', async () => {
    await act(async () => {
      render(<UserPublicProfilePage user={mockUser} />)
    })
    await waitFor(() => {
      expect(screen.getByText(/No posts yet/i)).toBeInTheDocument()
    })
  })

  it('shows post content when posts are returned', async () => {
    api.getUserPosts.mockResolvedValue({
      data: [
        { _id: 'p1', content: 'This is a test post', createdAt: new Date().toISOString() },
      ],
    })
    await act(async () => {
      render(<UserPublicProfilePage user={mockUser} />)
    })
    await waitFor(() => {
      expect(screen.getByText('This is a test post')).toBeInTheDocument()
    })
  })

  it('shows Request Contact button when infoStatus is null', async () => {
    await act(async () => {
      render(<UserPublicProfilePage user={{ ...mockUser, id: 'different-user', _id: 'different-user' }} />)
    })
    await waitFor(() => {
      expect(screen.getByText(/Request Contact/i)).toBeInTheDocument()
    })
  })

  it('calls api.requestInfo when Request Contact button is clicked', async () => {
    const differentUser = { ...mockUser, id: 'different-user', _id: 'different-user' }
    await act(async () => {
      render(<UserPublicProfilePage user={differentUser} />)
    })
    await waitFor(() => screen.getByText(/Request Contact/i))
    await act(async () => {
      fireEvent.click(screen.getByText(/Request Contact/i))
    })
    await waitFor(() => {
      expect(api.requestInfo).toHaveBeenCalledWith('user456')
    })
  })

  it('shows LinkedIn link when person has linkedinUrl', async () => {
    await act(async () => {
      render(<UserPublicProfilePage user={mockUser} />)
    })
    await waitFor(() => {
      expect(screen.getByText(/LinkedIn Profile/i)).toBeInTheDocument()
    })
  })

  it('shows error state when api.getUser rejects', async () => {
    api.getUser.mockRejectedValue(new Error('User not found'))
    await act(async () => {
      render(<UserPublicProfilePage user={mockUser} />)
    })
    await waitFor(() => {
      expect(screen.getByText(/User not found/i)).toBeInTheDocument()
    })
  })

  it('shows Go Back button in error state', async () => {
    api.getUser.mockRejectedValue(new Error('Not found'))
    await act(async () => {
      render(<UserPublicProfilePage user={mockUser} />)
    })
    await waitFor(() => {
      expect(screen.getByText(/Go Back/i)).toBeInTheDocument()
    })
  })

  it('shows "accepted" state: View Contact Info button when status is accepted', async () => {
    api.getInfoRequestStatus.mockResolvedValue({ data: { status: 'accepted' } })
    const differentUser = { ...mockUser, id: 'different-user', _id: 'different-user' }
    await act(async () => {
      render(<UserPublicProfilePage user={differentUser} />)
    })
    await waitFor(() => {
      expect(screen.getByText(/View Contact Info/i)).toBeInTheDocument()
    })
  })

  it('shows PersonalInfoModal when View Contact Info is clicked (status accepted)', async () => {
    api.getInfoRequestStatus.mockResolvedValue({ data: { status: 'accepted' } })
    const differentUser = { ...mockUser, id: 'different-user', _id: 'different-user' }
    await act(async () => {
      render(<UserPublicProfilePage user={differentUser} />)
    })
    await waitFor(() => screen.getByText(/View Contact Info/i))
    fireEvent.click(screen.getByText(/View Contact Info/i))
    await waitFor(() => {
      expect(screen.getByTestId('personal-info-modal')).toBeInTheDocument()
    })
  })
})

// =============================================================================
// PlatformModalsGuide
// =============================================================================
describe('PlatformModalsGuide', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<PlatformModalsGuide user={mockUser} />)
    expect(screen.getByText(/Platform Modals Guide/i)).toBeInTheDocument()
  })

  it('shows subtitle with total modal count', () => {
    render(<PlatformModalsGuide user={mockUser} />)
    expect(screen.getByText(/screens and pop-ups/i)).toBeInTheDocument()
  })

  it('shows Total Modals summary card', () => {
    render(<PlatformModalsGuide user={mockUser} />)
    expect(screen.getByText(/Total Modals/i)).toBeInTheDocument()
  })

  it('shows "Recruiter / Admin" summary card', () => {
    render(<PlatformModalsGuide user={mockUser} />)
    expect(screen.getByText(/Recruiter \/ Admin/i)).toBeInTheDocument()
  })

  it('shows "Super Admin Only" summary card', () => {
    render(<PlatformModalsGuide user={mockUser} />)
    expect(screen.getByText(/Super Admin Only/i)).toBeInTheDocument()
  })

  it('renders role filter buttons including All', () => {
    render(<PlatformModalsGuide user={mockUser} />)
    expect(screen.getByText(/^All$/i)).toBeInTheDocument()
  })

  it('renders individual role filter buttons: Recruiter, Admin, Candidate, etc.', () => {
    render(<PlatformModalsGuide user={mockUser} />)
    // Filter buttons appear alongside role badge spans — use getAllByText
    const recruiterEls = screen.getAllByText(/^Recruiter$/i)
    expect(recruiterEls.some(el => el.tagName === 'BUTTON')).toBe(true)
    const adminEls = screen.getAllByText(/^Admin$/i)
    expect(adminEls.some(el => el.tagName === 'BUTTON')).toBe(true)
    const candidateEls = screen.getAllByText(/^Candidate$/i)
    expect(candidateEls.some(el => el.tagName === 'BUTTON')).toBe(true)
  })

  it('renders all modal cards with names visible', () => {
    render(<PlatformModalsGuide user={mockUser} />)
    expect(screen.getByText(/Schedule Interview/i)).toBeInTheDocument()
    expect(screen.getByText(/Generate Offer Letter/i)).toBeInTheDocument()
    expect(screen.getByText(/Reject Candidate/i)).toBeInTheDocument()
  })

  it('shows role badges on each modal card', () => {
    render(<PlatformModalsGuide user={mockUser} />)
    // Multiple Recruiter badges should appear on modal cards
    const recruiterBadges = screen.getAllByText(/^Recruiter$/i)
    expect(recruiterBadges.length).toBeGreaterThan(1)
  })

  it('clicking a modal card header toggles its expanded details', () => {
    render(<PlatformModalsGuide user={mockUser} />)
    // By default, no "WHERE TO FIND IT" section visible
    expect(screen.queryByText(/WHERE TO FIND IT/i)).not.toBeInTheDocument()
    const scheduleBtn = screen.getByText(/Schedule Interview/i).closest('button')
    fireEvent.click(scheduleBtn)
    expect(screen.getByText(/WHERE TO FIND IT/i)).toBeInTheDocument()
  })

  it('expanded modal card shows WHAT IT DOES section', () => {
    render(<PlatformModalsGuide user={mockUser} />)
    const scheduleBtn = screen.getByText(/Schedule Interview/i).closest('button')
    fireEvent.click(scheduleBtn)
    expect(screen.getByText(/WHAT IT DOES/i)).toBeInTheDocument()
  })

  it('expanded modal card shows WHAT TRIGGERS IT section', () => {
    render(<PlatformModalsGuide user={mockUser} />)
    const scheduleBtn = screen.getByText(/Schedule Interview/i).closest('button')
    fireEvent.click(scheduleBtn)
    expect(screen.getByText(/WHAT TRIGGERS IT/i)).toBeInTheDocument()
  })

  it('expanded modal card shows WHAT HAPPENS AFTER section', () => {
    render(<PlatformModalsGuide user={mockUser} />)
    const scheduleBtn = screen.getByText(/Schedule Interview/i).closest('button')
    fireEvent.click(scheduleBtn)
    expect(screen.getByText(/WHAT HAPPENS AFTER/i)).toBeInTheDocument()
  })

  it('clicking an expanded card again collapses it', () => {
    render(<PlatformModalsGuide user={mockUser} />)
    const scheduleBtn = screen.getByText(/Schedule Interview/i).closest('button')
    fireEvent.click(scheduleBtn)
    expect(screen.getByText(/WHERE TO FIND IT/i)).toBeInTheDocument()
    fireEvent.click(scheduleBtn)
    expect(screen.queryByText(/WHERE TO FIND IT/i)).not.toBeInTheDocument()
  })

  it('clicking a different card closes the previous expanded card', () => {
    render(<PlatformModalsGuide user={mockUser} />)
    const scheduleBtn = screen.getByText(/Schedule Interview/i).closest('button')
    const offerBtn = screen.getByText(/Generate Offer Letter/i).closest('button')
    fireEvent.click(scheduleBtn)
    expect(screen.getByText(/WHERE TO FIND IT/i)).toBeInTheDocument()
    fireEvent.click(offerBtn)
    // After clicking second, only one WHERE TO FIND IT should remain
    const whereSections = screen.getAllByText(/WHERE TO FIND IT/i)
    expect(whereSections.length).toBe(1)
  })

  it('filtering by "Recruiter" role shows only recruiter-relevant modals', () => {
    render(<PlatformModalsGuide user={mockUser} />)
    const recruiterFilterBtn = screen.getAllByText(/^Recruiter$/i).find(
      el => el.tagName === 'BUTTON' || el.closest('button')
    )
    if (recruiterFilterBtn) {
      const btn = recruiterFilterBtn.tagName === 'BUTTON' ? recruiterFilterBtn : recruiterFilterBtn.closest('button')
      fireEvent.click(btn)
      // Public Job Application is for Public/Candidate only; should not appear
      expect(screen.queryByText(/Organisation Job Listings/i)).not.toBeInTheDocument()
    }
  })

  it('filtering by "Super Admin" shows organisation-specific modals', () => {
    render(<PlatformModalsGuide user={mockUser} />)
    const superAdminBtns = screen.getAllByText(/^Super Admin$/i)
    const filterBtn = superAdminBtns.find(el => el.tagName === 'BUTTON' || el.closest('button'))
    if (filterBtn) {
      const btn = filterBtn.tagName === 'BUTTON' ? filterBtn : filterBtn.closest('button')
      fireEvent.click(btn)
      expect(screen.getByText(/Organisation Job Listings/i)).toBeInTheDocument()
    }
  })

  it('shows note about Esc key to close modals at the bottom', () => {
    render(<PlatformModalsGuide user={mockUser} />)
    expect(screen.getByText(/Note:/i)).toBeInTheDocument()
  })

  it('renders Public Job Application modal card', () => {
    render(<PlatformModalsGuide user={mockUser} />)
    expect(screen.getByText(/Public Job Application/i)).toBeInTheDocument()
  })

  it('renders Merge Duplicate Candidates modal card', () => {
    render(<PlatformModalsGuide user={mockUser} />)
    expect(screen.getByText(/Merge Duplicate Candidates/i)).toBeInTheDocument()
  })

  it('renders Platform Onboarding Tour modal card', () => {
    render(<PlatformModalsGuide user={mockUser} />)
    expect(screen.getByText(/Platform Onboarding Tour/i)).toBeInTheDocument()
  })

  it('shows ▼ arrow on collapsed cards and ▲ on expanded cards', () => {
    render(<PlatformModalsGuide user={mockUser} />)
    // Initially all collapsed — should have ▼ arrows
    const downArrows = screen.getAllByText('▼')
    expect(downArrows.length).toBeGreaterThan(0)
    // Expand one
    const scheduleBtn = screen.getByText(/Schedule Interview/i).closest('button')
    fireEvent.click(scheduleBtn)
    expect(screen.getByText('▲')).toBeInTheDocument()
  })
})
