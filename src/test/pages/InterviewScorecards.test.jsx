import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/api.js', () => ({
  api: {
    getJobs: vi.fn(),
    getScorecards: vi.fn(),
  },
}))

vi.mock('../../constants/styles.js', () => ({
  card: {},
  btnP: {},
  btnG: {},
}))

import { api } from '../../api/api.js'
import InterviewScorecards from '../../pages/admin/InterviewScorecards.jsx'

function makeJob(overrides = {}) {
  return { _id: 'j1', title: 'Engineer', company: 'Acme', ...overrides }
}

function makeScorecard(overrides = {}) {
  return {
    applicationId: 'app1',
    candidate: 'John Doe',
    currentStage: 'interview_completed',
    rounds: [
      {
        hasFeedback: true,
        format: 'video',
        interviewerName: 'Alice',
        feedback: {
          technicalScore: 8,
          communicationScore: 7,
          problemSolvingScore: 9,
          cultureFitScore: 8,
          recommendation: 'hire',
          rating: 4,
          strengths: 'Strong technical skills',
          weaknesses: 'Communication can improve',
        },
      },
    ],
    ...overrides,
  }
}

describe('InterviewScorecards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getJobs.mockResolvedValue({ data: [] })
    api.getScorecards.mockResolvedValue([])
  })

  it('calls getJobs on mount', async () => {
    await act(async () => { render(<InterviewScorecards />) })
    expect(api.getJobs).toHaveBeenCalledWith({ limit: 100, status: 'active' })
  })

  it('shows "Select a job" option initially', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    await act(async () => { render(<InterviewScorecards />) })
    expect(screen.getByText('— Select a job —')).toBeInTheDocument()
  })

  it('renders job titles in the dropdown', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob({ title: 'Senior Dev', company: 'Corp' })] })
    await act(async () => { render(<InterviewScorecards />) })
    expect(screen.getByText(/Senior Dev/)).toBeInTheDocument()
  })

  it('handles flat array response from getJobs', async () => {
    api.getJobs.mockResolvedValue([makeJob({ title: 'Designer' })])
    await act(async () => { render(<InterviewScorecards />) })
    expect(screen.getByText(/Designer/)).toBeInTheDocument()
  })

  it('calls getScorecards when job is selected', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    await act(async () => { render(<InterviewScorecards />) })
    const select = screen.getByRole('combobox')
    await act(async () => { fireEvent.change(select, { target: { value: 'j1' } }) })
    expect(api.getScorecards).toHaveBeenCalledWith('j1')
  })

  it('shows "No interviews found" when job selected but no scorecards', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getScorecards.mockResolvedValue([])
    await act(async () => { render(<InterviewScorecards />) })
    const select = screen.getByRole('combobox')
    await act(async () => { fireEvent.change(select, { target: { value: 'j1' } }) })
    expect(screen.getByText(/No interviews found/i)).toBeInTheDocument()
  })

  it('renders candidate name from scorecard', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getScorecards.mockResolvedValue([makeScorecard()])
    await act(async () => { render(<InterviewScorecards />) })
    const select = screen.getByRole('combobox')
    await act(async () => { fireEvent.change(select, { target: { value: 'j1' } }) })
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('renders interviewer name in feedback round', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getScorecards.mockResolvedValue([makeScorecard()])
    await act(async () => { render(<InterviewScorecards />) })
    const select = screen.getByRole('combobox')
    await act(async () => { fireEvent.change(select, { target: { value: 'j1' } }) })
    expect(screen.getByText(/Alice/i)).toBeInTheDocument()
  })

  it('shows strengths text from feedback', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    api.getScorecards.mockResolvedValue([makeScorecard()])
    await act(async () => { render(<InterviewScorecards />) })
    const select = screen.getByRole('combobox')
    await act(async () => { fireEvent.change(select, { target: { value: 'j1' } }) })
    expect(screen.getByText(/Strong technical skills/)).toBeInTheDocument()
  })

  it('does not call getScorecards when empty string selected', async () => {
    api.getJobs.mockResolvedValue({ data: [makeJob()] })
    await act(async () => { render(<InterviewScorecards />) })
    const select = screen.getByRole('combobox')
    await act(async () => { fireEvent.change(select, { target: { value: '' } }) })
    expect(api.getScorecards).not.toHaveBeenCalled()
  })

  it('does not crash when getJobs rejects', async () => {
    api.getJobs.mockRejectedValue(new Error('network error'))
    await act(async () => { render(<InterviewScorecards />) })
    // Should still render the page header
    expect(screen.getByText('Interview Scorecards')).toBeInTheDocument()
  })
})
