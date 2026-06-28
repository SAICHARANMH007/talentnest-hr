/**
 * Behavioral tests for the AuthScreen component.
 *
 * We render AuthScreen inside a MemoryRouter and mock the api module so no
 * real network requests are made.  Tests cover:
 *  - Entry screen shown by default
 *  - Candidate login form renders when initialScreen='candidate'
 *  - OtpScreen shown when backend responds with requires2FA
 *  - Error message shown on failed login
 *  - onAuth callback called with user + token on success
 */
import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AuthScreen from '../../pages/auth/AuthScreen.jsx'

// ── Mock the entire api module ────────────────────────────────────────────────
vi.mock('../../api/api.js', () => ({
  api: {
    login: vi.fn(),
    register: vi.fn(),
    verifyOtp: vi.fn(),
    resendOtp: vi.fn(),
    sendLoginOtp: vi.fn(),
    verifyLoginOtp: vi.fn(),
    sendResetOtp: vi.fn(),
    verifyResetOtp: vi.fn(),
    forgotPassword: vi.fn(),
    getCollegeDirectory: vi.fn().mockResolvedValue({ data: [] }),
    verifyDomain: vi.fn(),
  },
}))

// Grab the mocked api for per-test configuration
import { api } from '../../api/api.js'

function renderAuthScreen(props = {}) {
  return render(
    <MemoryRouter>
      <AuthScreen {...props} />
    </MemoryRouter>
  )
}

// ── Entry screen ──────────────────────────────────────────────────────────────

describe('AuthScreen — entry screen', () => {
  it('renders the entry/role-picker screen by default', () => {
    renderAuthScreen()
    // EntryScreen renders two prominent cards for Job Seeker and Employer
    expect(screen.getByText(/Job Seeker|Candidate|Find Jobs/i)).toBeInTheDocument()
  })

  it('switches to the candidate login form when initialScreen="candidate"', () => {
    renderAuthScreen({ initialScreen: 'candidate' })
    // CandidateForm has an email and password input
    expect(screen.getByPlaceholderText(/you@example\.com/i)).toBeInTheDocument()
  })
})

// ── Candidate login form ──────────────────────────────────────────────────────

describe('AuthScreen — candidate login form (initialScreen="candidate")', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders email and password fields', () => {
    renderAuthScreen({ initialScreen: 'candidate' })
    expect(screen.getByPlaceholderText(/you@example\.com/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument()
  })

  // The CandidateForm has two "Sign In" labels: the mode-tab button and the
  // submit button (which reads "→ Sign In"). We target the submit button via text.
  function getSubmitBtn() {
    // The submit button's text includes an arrow: "→ Sign In"
    return screen.getAllByRole('button').find(b => b.textContent.includes('→ Sign In'))
  }

  it('renders a Sign In submit button', () => {
    renderAuthScreen({ initialScreen: 'candidate' })
    expect(getSubmitBtn()).toBeInTheDocument()
  })

  it('shows an error toast when email or password is empty', async () => {
    renderAuthScreen({ initialScreen: 'candidate' })
    await act(async () => { fireEvent.click(getSubmitBtn()) })
    // Toast with ❌ prefix for missing fields
    expect(await screen.findByText(/Email and password required/i)).toBeInTheDocument()
  })

  it('calls api.login with email and password on submit', async () => {
    const user = userEvent.setup()
    api.login.mockResolvedValueOnce({ token: 'tok123', user: { name: 'Alice', role: 'candidate' } })
    const onAuth = vi.fn()
    renderAuthScreen({ initialScreen: 'candidate', onAuth })

    await user.type(screen.getByPlaceholderText(/you@example\.com/i), 'alice@example.com')
    await user.type(screen.getByPlaceholderText(/••••••••/i), 'password123')
    await user.click(getSubmitBtn())

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith('alice@example.com', 'password123')
    })
  })

  it('calls onAuth with user and token on successful login', async () => {
    const user = userEvent.setup()
    const fakeUser = { name: 'Alice', role: 'candidate' }
    api.login.mockResolvedValueOnce({ token: 'tok123', user: fakeUser })
    const onAuth = vi.fn()
    renderAuthScreen({ initialScreen: 'candidate', onAuth })

    await user.type(screen.getByPlaceholderText(/you@example\.com/i), 'alice@example.com')
    await user.type(screen.getByPlaceholderText(/••••••••/i), 'password123')
    await user.click(getSubmitBtn())

    await waitFor(() => expect(onAuth).toHaveBeenCalledWith(fakeUser, 'tok123'))
  })

  it('shows an error toast when login fails', async () => {
    const user = userEvent.setup()
    api.login.mockRejectedValueOnce(new Error('Invalid email or password'))
    renderAuthScreen({ initialScreen: 'candidate' })

    await user.type(screen.getByPlaceholderText(/you@example\.com/i), 'bad@example.com')
    await user.type(screen.getByPlaceholderText(/••••••••/i), 'wrongpw')
    await user.click(getSubmitBtn())

    // submit()'s catch sets toast: '❌ ' + e.message
    expect(await screen.findByText(/❌ Invalid email or password/)).toBeInTheDocument()
  })

  it('shows the OTP screen when backend responds with requires2FA', async () => {
    const user = userEvent.setup()
    api.login.mockResolvedValueOnce({ requires2FA: true, email: 'alice@example.com' })
    renderAuthScreen({ initialScreen: 'candidate' })

    await user.type(screen.getByPlaceholderText(/you@example\.com/i), 'alice@example.com')
    await user.type(screen.getByPlaceholderText(/••••••••/i), 'password123')
    await user.click(getSubmitBtn())

    expect(await screen.findByText(/Security Verification/i)).toBeInTheDocument()
  })
})

// ── OTP verify screen ─────────────────────────────────────────────────────────

describe('AuthScreen — OTP screen', () => {
  it('renders OTP input after requires2FA response', async () => {
    const user = userEvent.setup()
    api.login.mockResolvedValueOnce({ requires2FA: true, email: 'a@b.com' })
    renderAuthScreen({ initialScreen: 'candidate' })

    // Find and click the submit button (contains arrow →)
    const submitBtn = screen.getAllByRole('button').find(b => b.textContent.includes('→ Sign In'))
    await user.type(screen.getByPlaceholderText(/you@example\.com/i), 'a@b.com')
    await user.type(screen.getByPlaceholderText(/••••••••/i), 'pw')
    await user.click(submitBtn)

    await waitFor(() => expect(screen.getByText(/Security Verification/i)).toBeInTheDocument())
    // The OTP input has placeholder "• • • • • •" and maxLength 6
    const otpInput = screen.getByPlaceholderText(/•/)
    expect(otpInput).toBeInTheDocument()
  })

  it('calls api.verifyOtp and then onAuth on correct OTP', async () => {
    const user = userEvent.setup()
    const fakeUser = { name: 'Alice', role: 'candidate' }
    api.login.mockResolvedValueOnce({ requires2FA: true, email: 'a@b.com' })
    api.verifyOtp.mockResolvedValueOnce({ token: 'otp-tok', user: fakeUser })
    const onAuth = vi.fn()
    renderAuthScreen({ initialScreen: 'candidate', onAuth })

    const submitBtn = screen.getAllByRole('button').find(b => b.textContent.includes('→ Sign In'))
    await user.type(screen.getByPlaceholderText(/you@example\.com/i), 'a@b.com')
    await user.type(screen.getByPlaceholderText(/••••••••/i), 'pw')
    await user.click(submitBtn)

    await waitFor(() => screen.getByText(/Security Verification/i))
    const otpInput = screen.getByPlaceholderText(/•/)
    await user.type(otpInput, '123456')
    await user.click(screen.getByRole('button', { name: /Verify/i }))

    await waitFor(() => expect(api.verifyOtp).toHaveBeenCalledWith('a@b.com', '123456'))
    await waitFor(() => expect(onAuth).toHaveBeenCalledWith(fakeUser, 'otp-tok'))
  })
})
