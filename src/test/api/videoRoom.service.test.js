import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('../../api/client.js', () => ({ req: vi.fn() }))
import { videoRoomService } from '../../api/services/videoRoom.service.js'
import { req } from '../../api/client.js'

describe('videoRoomService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('createRoom', () => {
    it('calls POST /video-rooms with interviewId', async () => {
      req.mockResolvedValue({ roomToken: 'tok123' })
      await videoRoomService.createRoom('interview-abc')
      expect(req).toHaveBeenCalledWith('POST', '/video-rooms', { interviewId: 'interview-abc' })
    })

    it('returns the response from req', async () => {
      const mockResponse = { roomToken: 'tok123', roomId: 'room-1' }
      req.mockResolvedValue(mockResponse)
      const result = await videoRoomService.createRoom('interview-abc')
      expect(result).toEqual(mockResponse)
    })

    it('propagates errors thrown by req', async () => {
      req.mockRejectedValue(new Error('Network error'))
      await expect(videoRoomService.createRoom('interview-abc')).rejects.toThrow('Network error')
    })
  })

  describe('getRoom', () => {
    it('calls GET /video-rooms/join/:roomToken with auth disabled', async () => {
      req.mockResolvedValue({ room: {} })
      await videoRoomService.getRoom('tok-xyz')
      expect(req).toHaveBeenCalledWith('GET', '/video-rooms/join/tok-xyz', null, false)
    })

    it('returns the response from req', async () => {
      const mockResponse = { room: { id: 'room-1' } }
      req.mockResolvedValue(mockResponse)
      const result = await videoRoomService.getRoom('tok-xyz')
      expect(result).toEqual(mockResponse)
    })

    it('propagates errors thrown by req', async () => {
      req.mockRejectedValue(new Error('Not found'))
      await expect(videoRoomService.getRoom('bad-token')).rejects.toThrow('Not found')
    })
  })

  describe('getRoomByInterview', () => {
    it('calls GET /video-rooms/by-interview/:id', async () => {
      req.mockResolvedValue({ room: {} })
      await videoRoomService.getRoomByInterview('interview-42')
      expect(req).toHaveBeenCalledWith('GET', '/video-rooms/by-interview/interview-42')
    })

    it('returns the response from req', async () => {
      const mockResponse = { room: { id: 'room-2', interviewId: 'interview-42' } }
      req.mockResolvedValue(mockResponse)
      const result = await videoRoomService.getRoomByInterview('interview-42')
      expect(result).toEqual(mockResponse)
    })

    it('propagates errors thrown by req', async () => {
      req.mockRejectedValue(new Error('Forbidden'))
      await expect(videoRoomService.getRoomByInterview('interview-42')).rejects.toThrow('Forbidden')
    })
  })

  describe('getTranscript', () => {
    it('calls GET /video-rooms/:roomToken/transcript', async () => {
      req.mockResolvedValue({ transcript: [] })
      await videoRoomService.getTranscript('tok-abc')
      expect(req).toHaveBeenCalledWith('GET', '/video-rooms/tok-abc/transcript')
    })

    it('returns the response from req', async () => {
      const mockResponse = { transcript: [{ speaker: 'Alice', text: 'Hello' }] }
      req.mockResolvedValue(mockResponse)
      const result = await videoRoomService.getTranscript('tok-abc')
      expect(result).toEqual(mockResponse)
    })

    it('propagates errors thrown by req', async () => {
      req.mockRejectedValue(new Error('Unauthorized'))
      await expect(videoRoomService.getTranscript('tok-abc')).rejects.toThrow('Unauthorized')
    })
  })

  describe('getTurnCredentials', () => {
    it('calls GET /video-rooms/turn-credentials with auth disabled', async () => {
      req.mockResolvedValue({ username: 'user', credential: 'cred' })
      await videoRoomService.getTurnCredentials()
      expect(req).toHaveBeenCalledWith('GET', '/video-rooms/turn-credentials', null, false)
    })

    it('returns the response from req', async () => {
      const mockResponse = { username: 'turn-user', credential: 'secret', ttl: 86400 }
      req.mockResolvedValue(mockResponse)
      const result = await videoRoomService.getTurnCredentials()
      expect(result).toEqual(mockResponse)
    })

    it('propagates errors thrown by req', async () => {
      req.mockRejectedValue(new Error('Service unavailable'))
      await expect(videoRoomService.getTurnCredentials()).rejects.toThrow('Service unavailable')
    })
  })
})
