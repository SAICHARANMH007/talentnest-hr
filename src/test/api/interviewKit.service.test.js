import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('../../api/client.js', () => ({ req: vi.fn() }))
import { interviewKitService } from '../../api/services/interviewKit.service.js'
import { req } from '../../api/client.js'

describe('interviewKitService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('getInterviewKits', () => {
    it('calls GET /interview-kits', async () => {
      req.mockResolvedValue({ data: [] })
      await interviewKitService.getInterviewKits()
      expect(req).toHaveBeenCalledWith('GET', '/interview-kits')
    })

    it('returns r.data when present', async () => {
      const kits = [{ id: '1', name: 'Kit A' }]
      req.mockResolvedValue({ data: kits })
      const result = await interviewKitService.getInterviewKits()
      expect(result).toEqual(kits)
    })

    it('returns r directly when data property is absent', async () => {
      const kits = [{ id: '2', name: 'Kit B' }]
      req.mockResolvedValue(kits)
      const result = await interviewKitService.getInterviewKits()
      expect(result).toEqual(kits)
    })

    it('returns undefined when req resolves to null', async () => {
      req.mockResolvedValue(null)
      const result = await interviewKitService.getInterviewKits()
      expect(result).toBeUndefined()
    })
  })

  describe('getInterviewKit', () => {
    it('calls GET /interview-kits/:id with correct id', async () => {
      req.mockResolvedValue({ data: {} })
      await interviewKitService.getInterviewKit('abc123')
      expect(req).toHaveBeenCalledWith('GET', '/interview-kits/abc123')
    })

    it('returns r.data when present', async () => {
      const kit = { id: 'abc123', name: 'Technical Round' }
      req.mockResolvedValue({ data: kit })
      const result = await interviewKitService.getInterviewKit('abc123')
      expect(result).toEqual(kit)
    })

    it('returns r directly when data property is absent', async () => {
      const kit = { id: 'abc123', name: 'Technical Round' }
      req.mockResolvedValue(kit)
      const result = await interviewKitService.getInterviewKit('abc123')
      expect(result).toEqual(kit)
    })

    it('propagates rejection from req', async () => {
      req.mockRejectedValue(new Error('Not found'))
      await expect(interviewKitService.getInterviewKit('missing')).rejects.toThrow('Not found')
    })
  })

  describe('createInterviewKit', () => {
    it('calls POST /interview-kits with payload', async () => {
      const payload = { name: 'New Kit', questions: [] }
      req.mockResolvedValue({ data: { id: 'new1', ...payload } })
      await interviewKitService.createInterviewKit(payload)
      expect(req).toHaveBeenCalledWith('POST', '/interview-kits', payload)
    })

    it('returns r.data when present', async () => {
      const payload = { name: 'New Kit', questions: [] }
      const created = { id: 'new1', ...payload }
      req.mockResolvedValue({ data: created })
      const result = await interviewKitService.createInterviewKit(payload)
      expect(result).toEqual(created)
    })

    it('returns r directly when data property is absent', async () => {
      const created = { id: 'new1', name: 'New Kit' }
      req.mockResolvedValue(created)
      const result = await interviewKitService.createInterviewKit({ name: 'New Kit' })
      expect(result).toEqual(created)
    })

    it('propagates rejection from req', async () => {
      req.mockRejectedValue(new Error('Validation error'))
      await expect(interviewKitService.createInterviewKit({})).rejects.toThrow('Validation error')
    })
  })

  describe('updateInterviewKit', () => {
    it('calls PUT /interview-kits/:id with correct id and payload', async () => {
      const payload = { name: 'Updated Kit' }
      req.mockResolvedValue({ data: { id: 'kit1', ...payload } })
      await interviewKitService.updateInterviewKit('kit1', payload)
      expect(req).toHaveBeenCalledWith('PUT', '/interview-kits/kit1', payload)
    })

    it('returns r.data when present', async () => {
      const updated = { id: 'kit1', name: 'Updated Kit' }
      req.mockResolvedValue({ data: updated })
      const result = await interviewKitService.updateInterviewKit('kit1', { name: 'Updated Kit' })
      expect(result).toEqual(updated)
    })

    it('returns r directly when data property is absent', async () => {
      const updated = { id: 'kit1', name: 'Updated Kit' }
      req.mockResolvedValue(updated)
      const result = await interviewKitService.updateInterviewKit('kit1', { name: 'Updated Kit' })
      expect(result).toEqual(updated)
    })

    it('propagates rejection from req', async () => {
      req.mockRejectedValue(new Error('Update failed'))
      await expect(interviewKitService.updateInterviewKit('kit1', {})).rejects.toThrow('Update failed')
    })
  })

  describe('deleteInterviewKit', () => {
    it('calls DELETE /interview-kits/:id with correct id', async () => {
      req.mockResolvedValue({ data: { success: true } })
      await interviewKitService.deleteInterviewKit('kit99')
      expect(req).toHaveBeenCalledWith('DELETE', '/interview-kits/kit99')
    })

    it('returns r.data when present', async () => {
      const response = { success: true }
      req.mockResolvedValue({ data: response })
      const result = await interviewKitService.deleteInterviewKit('kit99')
      expect(result).toEqual(response)
    })

    it('returns r directly when data property is absent', async () => {
      const response = { success: true }
      req.mockResolvedValue(response)
      const result = await interviewKitService.deleteInterviewKit('kit99')
      expect(result).toEqual(response)
    })

    it('propagates rejection from req', async () => {
      req.mockRejectedValue(new Error('Delete failed'))
      await expect(interviewKitService.deleteInterviewKit('kit99')).rejects.toThrow('Delete failed')
    })
  })

  describe('saveKitScores', () => {
    it('calls POST with correct URL including appId and roundIndex', async () => {
      const kitScores = [{ questionId: 'q1', score: 4 }]
      req.mockResolvedValue({ data: { saved: true } })
      await interviewKitService.saveKitScores('app42', 2, kitScores)
      expect(req).toHaveBeenCalledWith(
        'POST',
        '/applications/app42/interview/2/kit-scores',
        { kitScores }
      )
    })

    it('wraps kitScores in an object before sending', async () => {
      const kitScores = [{ questionId: 'q1', score: 3 }, { questionId: 'q2', score: 5 }]
      req.mockResolvedValue({ data: {} })
      await interviewKitService.saveKitScores('app1', 0, kitScores)
      expect(req).toHaveBeenCalledWith(
        'POST',
        '/applications/app1/interview/0/kit-scores',
        { kitScores }
      )
    })

    it('returns r.data when present', async () => {
      const saved = { saved: true, roundIndex: 2 }
      req.mockResolvedValue({ data: saved })
      const result = await interviewKitService.saveKitScores('app42', 2, [])
      expect(result).toEqual(saved)
    })

    it('returns r directly when data property is absent', async () => {
      const saved = { saved: true }
      req.mockResolvedValue(saved)
      const result = await interviewKitService.saveKitScores('app42', 1, [])
      expect(result).toEqual(saved)
    })

    it('returns undefined when req resolves to null', async () => {
      req.mockResolvedValue(null)
      const result = await interviewKitService.saveKitScores('app42', 1, [])
      expect(result).toBeUndefined()
    })

    it('propagates rejection from req', async () => {
      req.mockRejectedValue(new Error('Save failed'))
      await expect(interviewKitService.saveKitScores('app42', 0, [])).rejects.toThrow('Save failed')
    })

    it('handles roundIndex of 0 correctly in URL', async () => {
      req.mockResolvedValue({ data: {} })
      await interviewKitService.saveKitScores('appX', 0, [])
      expect(req).toHaveBeenCalledWith(
        'POST',
        '/applications/appX/interview/0/kit-scores',
        { kitScores: [] }
      )
    })
  })
})
