import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('../../api/api.js', () => ({
  api: {
    getMatchedJobs: vi.fn(),
    getMyApplications: vi.fn(),
    getUser: vi.fn(),
    getAvailableSkills: vi.fn(),
    getMySkillResults: vi.fn(),
    applyToJob: vi.fn(),
    updateMyLoginLocation: vi.fn(),
  },
}))

vi.mock('../../components/ui/Toast.jsx', () => ({
  default: ({ msg }) => msg ? <div data-testid="toast">{msg}</div> : null,
}))
vi.mock('../../components/ui/Badge.jsx', () => ({
  default: ({ label }) => <span data-testid="badge">{label}</span>,
}))
vi.mock('../../components/ui/Spinner.jsx', () => ({
  default: () => <div data-testid="spinner">Loading...</div>,
}))
vi.mock('../../components/ui/PageHeader.jsx', () => ({
  default: ({ title }) => <div data-testid="page-header">{title}</div>,
}))
vi.mock('../../components/charts/KpiCard.jsx', () => ({
  default: ({ label, value }) => <div data-testid="kpi-card">{label}: {value}</div>,
}))
vi.mock('../../components/charts/HorizBar.jsx', () => ({
  default: ({ label }) => <div data-testid="horiz-bar">{label}</div>,
}))
vi.mock('../../components/misc/InterviewCountdown.jsx', () => ({
  default: () => <div data-testid="interview-countdown" />,
}))
vi.mock('../../components/candidate/ReferralHub.jsx', () => ({
  default: () => <div data-testid="referral-hub" />,
}))
vi.mock('../../constants/stages.js', () => ({ STAGES: [] }))
vi.mock('../../constants/styles.js', () => ({ btnP: {}, btnG: {}, card: {} }))

import { api } from '../../api/api.js'
import CandidateDashboard from '../../pages/candidate/CandidateDashboard.jsx'

const mockUser = { id: 'u1', name: 'Alice', skills: ['JavaScript', 'React'], experience: 3 }

function makeJob(overrides = {}) {
  return {
    _id: 'j1', id: 'j1', title: 'Frontend Engineer', companyName: 'Acme',
    location: 'Remote', skills: ['JavaScript', 'React'], matchScore: 85,
    ...overrides,
  }
}

function makeApp(overrides = {}) {
  return {
    id: 'a1', _id: 'a1',
    jobId: { id: 'j1', title: 'Frontend Engineer', company: 'Acme' },
    stage: 'applied', createdAt: '2025-01-01T00:00:00Z', interviewRounds: [],
    ...overrides,
  }
}

describe('CandidateDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    api.getMatchedJobs.mockResolvedValue({ data: [] })
    api.getMyApplications.mockResolvedValue({ data: [] })
    api.getUser.mockResolvedValue({ data: { name: 'Alice', experience: 3, skills: ['JavaScript'], profileCompletion: 80 } })
    api.getAvailableSkills.mockResolvedValue({ skills: [] })
    api.getMySkillResults.mockResolvedValue({ results: [] })
    api.applyToJob.mockResolvedValue({ success: true })
    api.updateMyLoginLocation.mockResolvedValue({})
  })

  // ── Loading & mount ──────────────────────────────────────────────────────
  it('calls the 3 primary data APIs on mount', async () => {
    await act(async () => { render(<CandidateDashboard user={mockUser} />) })
    expect(api.getMatchedJobs).toHaveBeenCalledWith('u1')
    expect(api.getMyApplications).toHaveBeenCalled()
    expect(api.getUser).toHaveBeenCalledWith('u1')
  })

  it('shows spinner initially while loading', () => {
    // Use a never-resolving promise to freeze loading state
    api.getMatchedJobs.mockReturnValue(new Promise(() => {}))
    api.getMyApplications.mockReturnValue(new Promise(() => {}))
    api.getUser.mockReturnValue(new Promise(() => {}))
    render(<CandidateDashboard user={mockUser} />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  // ── KPI cards ────────────────────────────────────────────────────────────
  it('renders KPI cards after loading', async () => {
    await act(async () => { render(<CandidateDashboard user={mockUser} />) })
    const kpiCards = screen.getAllByTestId('kpi-card')
    expect(kpiCards.length).toBeGreaterThan(0)
  })

  it('shows applications count in KPI cards', async () => {
    api.getMyApplications.mockResolvedValue({ data: [makeApp(), makeApp({ id: 'a2', _id: 'a2' })] })
    await act(async () => { render(<CandidateDashboard user={mockUser} />) })
    const kpiCards = screen.getAllByTestId('kpi-card')
    const texts = kpiCards.map(c => c.textContent)
    expect(texts.some(t => t.includes('2'))).toBe(true)
  })

  // ── Matched jobs ─────────────────────────────────────────────────────────
  it('renders matched job title', async () => {
    api.getMatchedJobs.mockResolvedValue({ data: [makeJob()] })
    await act(async () => { render(<CandidateDashboard user={mockUser} />) })
    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument()
  })

  it('renders company name for matched job', async () => {
    api.getMatchedJobs.mockResolvedValue({ data: [makeJob()] })
    await act(async () => { render(<CandidateDashboard user={mockUser} />) })
    // Company is rendered as "Acme · Remote" in a single text node
    expect(screen.getByText(/Acme/i)).toBeInTheDocument()
  })

  it('shows "Find matching jobs" link when no matched jobs', async () => {
    await act(async () => { render(<CandidateDashboard user={mockUser} />) })
    expect(screen.getByText(/Find matching jobs/i)).toBeInTheDocument()
  })

  it('handles flat array response from getMatchedJobs', async () => {
    api.getMatchedJobs.mockResolvedValue([makeJob({ title: 'Backend Dev' })])
    await act(async () => { render(<CandidateDashboard user={mockUser} />) })
    expect(screen.getByText('Backend Dev')).toBeInTheDocument()
  })

  // ── Apply flow ────────────────────────────────────────────────────────────
  it('apply button calls api.applyToJob with jobId and userId', async () => {
    api.getMatchedJobs.mockResolvedValue({ data: [makeJob()] })
    await act(async () => { render(<CandidateDashboard user={mockUser} />) })
    const applyBtn = screen.getByText(/Apply/i)
    await act(async () => { fireEvent.click(applyBtn) })
    expect(api.applyToJob).toHaveBeenCalledWith('j1', 'u1')
  })

  it('shows success toast after successful apply', async () => {
    api.getMatchedJobs.mockResolvedValue({ data: [makeJob()] })
    await act(async () => { render(<CandidateDashboard user={mockUser} />) })
    await act(async () => { fireEvent.click(screen.getByText(/Apply/i)) })
    expect(screen.getByTestId('toast')).toHaveTextContent(/Applied|success/i)
  })

  // ── Errors ────────────────────────────────────────────────────────────────
  it('does not crash when APIs reject', async () => {
    api.getMatchedJobs.mockRejectedValue(new Error('network'))
    api.getMyApplications.mockRejectedValue(new Error('network'))
    api.getUser.mockRejectedValue(new Error('network'))
    // Should not throw — just render empty state
    await expect(
      act(async () => { render(<CandidateDashboard user={mockUser} />) })
    ).resolves.not.toThrow()
  })

  // ── Skills to verify ─────────────────────────────────────────────────────
  it('shows skills verify section when unverified skills available', async () => {
    api.getAvailableSkills.mockResolvedValue({ skills: ['JavaScript', 'React'] })
    api.getMySkillResults.mockResolvedValue({ results: [] }) // no passed results
    await act(async () => { render(<CandidateDashboard user={mockUser} />) })
    // The skills-to-verify section should appear (multiple elements ok with getAllByText)
    const els = screen.getAllByText(/JavaScript/i)
    expect(els.length).toBeGreaterThan(0)
  })
})
