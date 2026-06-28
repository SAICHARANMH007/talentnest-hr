import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/client.js', () => ({
  req: vi.fn(),
}))

import { skillAssessmentService } from '../../api/services/skillAssessment.service.js'
import { req } from '../../api/client.js'

describe('skillAssessmentService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // ── getAvailableSkills ────────────────────────────────────────────────────────
  describe('getAvailableSkills', () => {
    it('calls GET /skill-assessments/skills', async () => {
      req.mockResolvedValue([])
      await skillAssessmentService.getAvailableSkills()
      expect(req).toHaveBeenCalledWith('GET', '/skill-assessments/skills')
    })

    it('returns the response value', async () => {
      const skills = ['JavaScript', 'Python', 'SQL']
      req.mockResolvedValue(skills)
      const result = await skillAssessmentService.getAvailableSkills()
      expect(result).toEqual(skills)
    })
  })

  // ── startSkillAttempt ─────────────────────────────────────────────────────────
  describe('startSkillAttempt', () => {
    it('calls POST /skill-assessments/attempt/start with skill in body', async () => {
      req.mockResolvedValue({ attemptId: 'a1' })
      await skillAssessmentService.startSkillAttempt('JavaScript')
      expect(req).toHaveBeenCalledWith('POST', '/skill-assessments/attempt/start', { skill: 'JavaScript' })
    })

    it('returns the response', async () => {
      const response = { attemptId: 'a1', questions: [] }
      req.mockResolvedValue(response)
      const result = await skillAssessmentService.startSkillAttempt('Python')
      expect(result).toEqual(response)
    })

    it('passes the exact skill string received', async () => {
      req.mockResolvedValue({})
      await skillAssessmentService.startSkillAttempt('Node.js')
      expect(req.mock.calls[0][2]).toEqual({ skill: 'Node.js' })
    })
  })

  // ── submitSkillAttempt ────────────────────────────────────────────────────────
  describe('submitSkillAttempt', () => {
    it('calls POST /skill-assessments/attempt/:attemptId/submit with answers', async () => {
      req.mockResolvedValue({ score: 85 })
      const answers = [{ questionId: 'q1', answer: 'A' }, { questionId: 'q2', answer: 'B' }]
      await skillAssessmentService.submitSkillAttempt('attempt123', answers)
      expect(req).toHaveBeenCalledWith(
        'POST',
        '/skill-assessments/attempt/attempt123/submit',
        { answers }
      )
    })

    it('interpolates the attemptId into the URL', async () => {
      req.mockResolvedValue({})
      await skillAssessmentService.submitSkillAttempt('abc-xyz', [])
      const url = req.mock.calls[0][1]
      expect(url).toBe('/skill-assessments/attempt/abc-xyz/submit')
    })

    it('returns the score response', async () => {
      const response = { score: 90, passed: true }
      req.mockResolvedValue(response)
      const result = await skillAssessmentService.submitSkillAttempt('a1', [])
      expect(result).toEqual(response)
    })

    it('wraps answers array in an object body', async () => {
      req.mockResolvedValue({})
      const answers = [{ questionId: 'q1', answer: 'C' }]
      await skillAssessmentService.submitSkillAttempt('a1', answers)
      expect(req.mock.calls[0][2]).toEqual({ answers })
    })
  })

  // ── getActiveSkillAttempt ─────────────────────────────────────────────────────
  describe('getActiveSkillAttempt', () => {
    it('calls GET /skill-assessments/attempt/active/:skill with encoded skill', async () => {
      req.mockResolvedValue(null)
      await skillAssessmentService.getActiveSkillAttempt('JavaScript')
      expect(req).toHaveBeenCalledWith('GET', '/skill-assessments/attempt/active/JavaScript')
    })

    it('URL-encodes the skill name', async () => {
      req.mockResolvedValue(null)
      await skillAssessmentService.getActiveSkillAttempt('Node.js & TypeScript')
      const url = req.mock.calls[0][1]
      expect(url).toBe('/skill-assessments/attempt/active/Node.js%20%26%20TypeScript')
    })

    it('returns the active attempt data', async () => {
      const attempt = { _id: 'a1', skill: 'SQL', status: 'in-progress' }
      req.mockResolvedValue(attempt)
      const result = await skillAssessmentService.getActiveSkillAttempt('SQL')
      expect(result).toEqual(attempt)
    })

    it('returns null when no active attempt', async () => {
      req.mockResolvedValue(null)
      const result = await skillAssessmentService.getActiveSkillAttempt('Python')
      expect(result).toBeNull()
    })
  })

  // ── getMySkillResults ─────────────────────────────────────────────────────────
  describe('getMySkillResults', () => {
    it('calls GET /skill-assessments/my-results', async () => {
      req.mockResolvedValue([])
      await skillAssessmentService.getMySkillResults()
      expect(req).toHaveBeenCalledWith('GET', '/skill-assessments/my-results')
    })

    it('returns the results list', async () => {
      const results = [{ skill: 'JS', score: 80 }, { skill: 'Python', score: 70 }]
      req.mockResolvedValue(results)
      const result = await skillAssessmentService.getMySkillResults()
      expect(result).toEqual(results)
    })
  })

  // ── getSkillQuestions ─────────────────────────────────────────────────────────
  describe('getSkillQuestions', () => {
    it('calls GET /skill-assessments/admin/questions without qs when no params', async () => {
      req.mockResolvedValue([])
      await skillAssessmentService.getSkillQuestions()
      expect(req).toHaveBeenCalledWith('GET', '/skill-assessments/admin/questions')
    })

    it('appends query string when params are provided', async () => {
      req.mockResolvedValue([])
      await skillAssessmentService.getSkillQuestions({ skill: 'JavaScript', difficulty: 'hard' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('skill=JavaScript')
      expect(url).toContain('difficulty=hard')
    })

    it('omits undefined and empty-string values from query string', async () => {
      req.mockResolvedValue([])
      await skillAssessmentService.getSkillQuestions({ skill: 'Python', difficulty: undefined, page: '' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('skill=Python')
      expect(url).not.toContain('difficulty=')
      expect(url).not.toContain('page=')
    })

    it('returns questions list', async () => {
      const questions = [{ _id: 'q1', text: 'What is a closure?' }]
      req.mockResolvedValue(questions)
      const result = await skillAssessmentService.getSkillQuestions({ skill: 'JavaScript' })
      expect(result).toEqual(questions)
    })
  })

  // ── createSkillQuestion ───────────────────────────────────────────────────────
  describe('createSkillQuestion', () => {
    it('calls POST /skill-assessments/admin/questions with data', async () => {
      req.mockResolvedValue({ _id: 'q1' })
      const data = { skill: 'Python', text: 'What is a list comprehension?', options: ['A', 'B'], correct: 0 }
      await skillAssessmentService.createSkillQuestion(data)
      expect(req).toHaveBeenCalledWith('POST', '/skill-assessments/admin/questions', data)
    })

    it('returns the created question', async () => {
      const question = { _id: 'q1', text: 'Test question' }
      req.mockResolvedValue(question)
      const result = await skillAssessmentService.createSkillQuestion({ text: 'Test question' })
      expect(result).toEqual(question)
    })
  })

  // ── updateSkillQuestion ───────────────────────────────────────────────────────
  describe('updateSkillQuestion', () => {
    it('calls PATCH /skill-assessments/admin/questions/:id with data', async () => {
      req.mockResolvedValue({})
      const data = { text: 'Updated text' }
      await skillAssessmentService.updateSkillQuestion('q1', data)
      expect(req).toHaveBeenCalledWith('PATCH', '/skill-assessments/admin/questions/q1', data)
    })

    it('interpolates id into the URL', async () => {
      req.mockResolvedValue({})
      await skillAssessmentService.updateSkillQuestion('q-abc-123', { text: 'X' })
      const url = req.mock.calls[0][1]
      expect(url).toBe('/skill-assessments/admin/questions/q-abc-123')
    })
  })

  // ── deleteSkillQuestion ───────────────────────────────────────────────────────
  describe('deleteSkillQuestion', () => {
    it('calls DELETE /skill-assessments/admin/questions/:id', async () => {
      req.mockResolvedValue({})
      await skillAssessmentService.deleteSkillQuestion('q1')
      expect(req).toHaveBeenCalledWith('DELETE', '/skill-assessments/admin/questions/q1')
    })

    it('uses the correct method (DELETE)', async () => {
      req.mockResolvedValue({})
      await skillAssessmentService.deleteSkillQuestion('q2')
      expect(req.mock.calls[0][0]).toBe('DELETE')
    })
  })

  // ── bulkImportSkillQuestions ──────────────────────────────────────────────────
  describe('bulkImportSkillQuestions', () => {
    it('calls POST /skill-assessments/admin/questions/bulk with questions wrapped in object', async () => {
      req.mockResolvedValue({})
      const questions = [
        { skill: 'JS', text: 'Q1', options: ['A', 'B'], correct: 0 },
        { skill: 'JS', text: 'Q2', options: ['C', 'D'], correct: 1 },
      ]
      await skillAssessmentService.bulkImportSkillQuestions(questions)
      expect(req).toHaveBeenCalledWith('POST', '/skill-assessments/admin/questions/bulk', { questions })
    })

    it('wraps array in a questions property', async () => {
      req.mockResolvedValue({})
      const questions = [{ skill: 'Python' }]
      await skillAssessmentService.bulkImportSkillQuestions(questions)
      expect(req.mock.calls[0][2]).toEqual({ questions })
    })

    it('returns the import result', async () => {
      const result = { imported: 5, skipped: 1 }
      req.mockResolvedValue(result)
      const res = await skillAssessmentService.bulkImportSkillQuestions([])
      expect(res).toEqual(result)
    })
  })

  // ── seedSkillQuestions ────────────────────────────────────────────────────────
  describe('seedSkillQuestions', () => {
    it('calls POST /skill-assessments/admin/seed', async () => {
      req.mockResolvedValue({})
      await skillAssessmentService.seedSkillQuestions()
      expect(req).toHaveBeenCalledWith('POST', '/skill-assessments/admin/seed')
    })
  })

  // ── seedBuiltInSkillQuestions ─────────────────────────────────────────────────
  describe('seedBuiltInSkillQuestions', () => {
    it('calls POST /skill-assessments/admin/questions/seed-built-in with empty body', async () => {
      req.mockResolvedValue({})
      await skillAssessmentService.seedBuiltInSkillQuestions()
      expect(req).toHaveBeenCalledWith('POST', '/skill-assessments/admin/questions/seed-built-in', {})
    })
  })

  // ── getSkillAttempts ──────────────────────────────────────────────────────────
  describe('getSkillAttempts', () => {
    it('calls GET /skill-assessments/admin/attempts without qs when no params', async () => {
      req.mockResolvedValue([])
      await skillAssessmentService.getSkillAttempts()
      expect(req).toHaveBeenCalledWith('GET', '/skill-assessments/admin/attempts')
    })

    it('appends query string for provided params', async () => {
      req.mockResolvedValue([])
      await skillAssessmentService.getSkillAttempts({ skill: 'SQL', status: 'completed' })
      const url = req.mock.calls[0][1]
      expect(url).toContain('skill=SQL')
      expect(url).toContain('status=completed')
    })

    it('omits undefined values from query string', async () => {
      req.mockResolvedValue([])
      await skillAssessmentService.getSkillAttempts({ skill: 'Python', status: undefined })
      const url = req.mock.calls[0][1]
      expect(url).toContain('skill=Python')
      expect(url).not.toContain('status=')
    })

    it('returns the attempts list', async () => {
      const attempts = [{ _id: 'a1', skill: 'JS' }]
      req.mockResolvedValue(attempts)
      const result = await skillAssessmentService.getSkillAttempts()
      expect(result).toEqual(attempts)
    })
  })

  // ── getUserSkillBadges ────────────────────────────────────────────────────────
  describe('getUserSkillBadges', () => {
    it('calls GET /skill-assessments/badges/:userId', async () => {
      req.mockResolvedValue([])
      await skillAssessmentService.getUserSkillBadges('u1')
      expect(req).toHaveBeenCalledWith('GET', '/skill-assessments/badges/u1')
    })

    it('returns the badges array', async () => {
      const badges = [{ skill: 'JavaScript', level: 'advanced' }]
      req.mockResolvedValue(badges)
      const result = await skillAssessmentService.getUserSkillBadges('u1')
      expect(result).toEqual(badges)
    })

    it('interpolates userId correctly into the path', async () => {
      req.mockResolvedValue([])
      await skillAssessmentService.getUserSkillBadges('user-abc-999')
      expect(req.mock.calls[0][1]).toBe('/skill-assessments/badges/user-abc-999')
    })
  })

  // ── getSkillLeaderboard ───────────────────────────────────────────────────────
  describe('getSkillLeaderboard', () => {
    it('calls GET /skill-assessments/leaderboard/:skill with encoded skill', async () => {
      req.mockResolvedValue([])
      await skillAssessmentService.getSkillLeaderboard('JavaScript')
      expect(req).toHaveBeenCalledWith('GET', '/skill-assessments/leaderboard/JavaScript')
    })

    it('URL-encodes skill with special characters', async () => {
      req.mockResolvedValue([])
      await skillAssessmentService.getSkillLeaderboard('C++ & Algorithms')
      const url = req.mock.calls[0][1]
      expect(url).toBe('/skill-assessments/leaderboard/C%2B%2B%20%26%20Algorithms')
    })

    it('returns the leaderboard entries', async () => {
      const leaderboard = [
        { rank: 1, userId: 'u1', score: 98 },
        { rank: 2, userId: 'u2', score: 95 },
      ]
      req.mockResolvedValue(leaderboard)
      const result = await skillAssessmentService.getSkillLeaderboard('Python')
      expect(result).toEqual(leaderboard)
    })

    it('passes GET as method', async () => {
      req.mockResolvedValue([])
      await skillAssessmentService.getSkillLeaderboard('SQL')
      expect(req.mock.calls[0][0]).toBe('GET')
    })
  })
})
