import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('react-router-dom', () => ({
  useParams: () => ({ skill: 'JavaScript' }),
  useNavigate: () => mockNavigate,
}))

const mockNavigate = vi.fn()

vi.mock('../../api/api.js', () => ({
  api: {
    getActiveSkillAttempt: vi.fn(),
    startSkillAttempt: vi.fn(),
    submitSkillAttempt: vi.fn(),
  },
}))

vi.mock('../../constants/styles.js', () => ({
  card: {},
  btnP: {},
  btnG: {},
}))

import { api } from '../../api/api.js'
import SkillAssessmentPage from '../../pages/candidate/SkillAssessmentPage.jsx'

function makeQuestion(overrides = {}) {
  return {
    questionId: 'q1',
    text: 'What is a closure?',
    difficulty: 'medium',
    type: 'mcq_single',
    options: [
      { id: 'a', text: 'A function with access to its outer scope', isCorrect: true },
      { id: 'b', text: 'A loop construct', isCorrect: false },
    ],
    ...overrides,
  }
}

function makeAttempt(overrides = {}) {
  return {
    attemptId: 'attempt1',
    skill: 'JavaScript',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    questions: [makeQuestion()],
    ...overrides,
  }
}

describe('SkillAssessmentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    api.getActiveSkillAttempt.mockResolvedValue(null)
    api.startSkillAttempt.mockResolvedValue(makeAttempt())
    api.submitSkillAttempt.mockResolvedValue({
      passed: true, score: 5, maxScore: 6, percentage: 83,
      correctCount: 5, hardCorrect: 2, questionReview: [],
    })
  })

  // ── Intro phase ─────────────────────────────────────────────────────────────
  it('shows intro phase with skill name on mount', async () => {
    await act(async () => { render(<SkillAssessmentPage />) })
    // Multiple elements contain "JavaScript" — check the h1 heading specifically
    expect(screen.getByText(/JavaScript Assessment/i)).toBeInTheDocument()
  })

  it('shows "Start Assessment" button in intro phase', async () => {
    await act(async () => { render(<SkillAssessmentPage />) })
    expect(screen.getByText(/Start Assessment/i)).toBeInTheDocument()
  })

  it('calls getActiveSkillAttempt on mount', async () => {
    await act(async () => { render(<SkillAssessmentPage />) })
    expect(api.getActiveSkillAttempt).toHaveBeenCalledWith('JavaScript')
  })

  it('resumes existing attempt instead of showing intro when attempt found', async () => {
    // Component checks res?.attempt (not the root object)
    api.getActiveSkillAttempt.mockResolvedValue({ attempt: makeAttempt() })
    await act(async () => { render(<SkillAssessmentPage />) })
    // Should show active phase with the question
    expect(screen.getByText('What is a closure?')).toBeInTheDocument()
  })

  // ── Active phase ─────────────────────────────────────────────────────────────
  it('calls startSkillAttempt when Start button clicked', async () => {
    await act(async () => { render(<SkillAssessmentPage />) })
    await act(async () => { fireEvent.click(screen.getByText(/Start Assessment/i)) })
    expect(api.startSkillAttempt).toHaveBeenCalledWith('JavaScript')
  })

  it('shows question text after starting assessment', async () => {
    await act(async () => { render(<SkillAssessmentPage />) })
    await act(async () => { fireEvent.click(screen.getByText(/Start Assessment/i)) })
    expect(screen.getByText('What is a closure?')).toBeInTheDocument()
  })

  it('shows answer options in active phase', async () => {
    await act(async () => { render(<SkillAssessmentPage />) })
    await act(async () => { fireEvent.click(screen.getByText(/Start Assessment/i)) })
    expect(screen.getByText('A function with access to its outer scope')).toBeInTheDocument()
  })

  it('shows Submit button in active phase', async () => {
    await act(async () => { render(<SkillAssessmentPage />) })
    await act(async () => { fireEvent.click(screen.getByText(/Start Assessment/i)) })
    expect(screen.getByText(/Submit/i)).toBeInTheDocument()
  })

  it('allows selecting an answer option', async () => {
    await act(async () => { render(<SkillAssessmentPage />) })
    await act(async () => { fireEvent.click(screen.getByText(/Start Assessment/i)) })
    const option = screen.getByText('A function with access to its outer scope')
    await act(async () => { fireEvent.click(option.closest('label') || option) })
    // No crash and option is still visible
    expect(screen.getByText('A function with access to its outer scope')).toBeInTheDocument()
  })

  // ── Submit and result phase ───────────────────────────────────────────────
  it('calls submitSkillAttempt when Submit clicked', async () => {
    await act(async () => { render(<SkillAssessmentPage />) })
    await act(async () => { fireEvent.click(screen.getByText(/Start Assessment/i)) })
    await act(async () => { fireEvent.click(screen.getByText(/Submit/i)) })
    expect(api.submitSkillAttempt).toHaveBeenCalledWith('attempt1', expect.any(Array))
  })

  it('shows pass result screen after successful submission', async () => {
    await act(async () => { render(<SkillAssessmentPage />) })
    await act(async () => { fireEvent.click(screen.getByText(/Start Assessment/i)) })
    await act(async () => { fireEvent.click(screen.getByText(/Submit/i)) })
    expect(screen.getByText(/Assessment Passed/i)).toBeInTheDocument()
  })

  it('shows fail result screen when not passed', async () => {
    api.submitSkillAttempt.mockResolvedValue({
      passed: false, score: 2, maxScore: 6, percentage: 33,
      correctCount: 2, hardCorrect: 0, questionReview: [],
    })
    await act(async () => { render(<SkillAssessmentPage />) })
    await act(async () => { fireEvent.click(screen.getByText(/Start Assessment/i)) })
    await act(async () => { fireEvent.click(screen.getByText(/Submit/i)) })
    expect(screen.getByText(/Not Passed Yet/i)).toBeInTheDocument()
  })

  // ── Error states ──────────────────────────────────────────────────────────
  it('shows cooldown message when attempt returns cooldown error', async () => {
    api.getActiveSkillAttempt.mockResolvedValue(null)
    api.startSkillAttempt.mockRejectedValue({ cooldownEndsAt: new Date(Date.now() + 3600000).toISOString() })
    await act(async () => { render(<SkillAssessmentPage />) })
    await act(async () => { fireEvent.click(screen.getByText(/Start Assessment →/)) })
    // Component shows "Cooldown Active" banner — multiple elements may contain the text
    expect(screen.getAllByText(/Cooldown Active/i).length).toBeGreaterThan(0)
  })

  // ── Navigation ────────────────────────────────────────────────────────────
  it('back button navigates away from intro', async () => {
    await act(async () => { render(<SkillAssessmentPage />) })
    // Button says "← Back to Skills"
    const backBtn = screen.getByText(/Back to Skills/i)
    fireEvent.click(backBtn)
    expect(mockNavigate).toHaveBeenCalled()
  })
})
