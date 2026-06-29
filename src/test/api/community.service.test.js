import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('../../api/client.js', () => ({ req: vi.fn() }))
import { communityService } from '../../api/services/community.service.js'
import { req } from '../../api/client.js'

describe('communityService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('getCommunities', () => {
    it('calls GET /communities', async () => {
      req.mockResolvedValue([])
      await communityService.getCommunities()
      expect(req).toHaveBeenCalledWith('GET', '/communities')
    })

    it('returns the resolved value', async () => {
      const data = [{ id: 1, name: 'Tech' }]
      req.mockResolvedValue(data)
      const result = await communityService.getCommunities()
      expect(result).toEqual(data)
    })
  })

  describe('createCommunity', () => {
    it('calls POST /communities with data', async () => {
      req.mockResolvedValue({ id: 42 })
      const payload = { name: 'New Community', description: 'desc' }
      await communityService.createCommunity(payload)
      expect(req).toHaveBeenCalledWith('POST', '/communities', payload)
    })

    it('returns the resolved value', async () => {
      const created = { id: 42, name: 'New Community' }
      req.mockResolvedValue(created)
      const result = await communityService.createCommunity({ name: 'New Community' })
      expect(result).toEqual(created)
    })
  })

  describe('getCommunity', () => {
    it('calls GET /communities/:slug', async () => {
      req.mockResolvedValue({ slug: 'tech-hub' })
      await communityService.getCommunity('tech-hub')
      expect(req).toHaveBeenCalledWith('GET', '/communities/tech-hub')
    })

    it('returns the resolved value', async () => {
      const community = { slug: 'tech-hub', name: 'Tech Hub' }
      req.mockResolvedValue(community)
      const result = await communityService.getCommunity('tech-hub')
      expect(result).toEqual(community)
    })
  })

  describe('joinCommunity', () => {
    it('calls POST /communities/:slug/join', async () => {
      req.mockResolvedValue({ success: true })
      await communityService.joinCommunity('tech-hub')
      expect(req).toHaveBeenCalledWith('POST', '/communities/tech-hub/join')
    })

    it('returns the resolved value', async () => {
      const response = { success: true, memberCount: 101 }
      req.mockResolvedValue(response)
      const result = await communityService.joinCommunity('tech-hub')
      expect(result).toEqual(response)
    })
  })

  describe('leaveCommunity', () => {
    it('calls POST /communities/:slug/leave', async () => {
      req.mockResolvedValue({ success: true })
      await communityService.leaveCommunity('tech-hub')
      expect(req).toHaveBeenCalledWith('POST', '/communities/tech-hub/leave')
    })

    it('returns the resolved value', async () => {
      const response = { success: true, memberCount: 99 }
      req.mockResolvedValue(response)
      const result = await communityService.leaveCommunity('tech-hub')
      expect(result).toEqual(response)
    })
  })

  describe('getCommunityFeed', () => {
    it('calls GET /communities/:slug/feed with no params', async () => {
      req.mockResolvedValue([])
      await communityService.getCommunityFeed('tech-hub')
      expect(req).toHaveBeenCalledWith('GET', '/communities/tech-hub/feed')
    })

    it('calls GET /communities/:slug/feed with page param', async () => {
      req.mockResolvedValue([])
      await communityService.getCommunityFeed('tech-hub', { page: 2 })
      expect(req).toHaveBeenCalledWith('GET', '/communities/tech-hub/feed?page=2')
    })

    it('calls GET /communities/:slug/feed with limit param', async () => {
      req.mockResolvedValue([])
      await communityService.getCommunityFeed('tech-hub', { limit: 10 })
      expect(req).toHaveBeenCalledWith('GET', '/communities/tech-hub/feed?limit=10')
    })

    it('calls GET /communities/:slug/feed with both page and limit params', async () => {
      req.mockResolvedValue([])
      await communityService.getCommunityFeed('tech-hub', { page: 3, limit: 20 })
      expect(req).toHaveBeenCalledWith('GET', '/communities/tech-hub/feed?page=3&limit=20')
    })

    it('omits params when they are falsy', async () => {
      req.mockResolvedValue([])
      await communityService.getCommunityFeed('tech-hub', { page: 0, limit: null })
      expect(req).toHaveBeenCalledWith('GET', '/communities/tech-hub/feed')
    })

    it('returns the resolved value', async () => {
      const feed = [{ id: 1, content: 'Hello' }]
      req.mockResolvedValue(feed)
      const result = await communityService.getCommunityFeed('tech-hub')
      expect(result).toEqual(feed)
    })
  })

  describe('getCommunityMembers', () => {
    it('calls GET /communities/:slug/members with no params', async () => {
      req.mockResolvedValue([])
      await communityService.getCommunityMembers('tech-hub')
      expect(req).toHaveBeenCalledWith('GET', '/communities/tech-hub/members')
    })

    it('calls GET /communities/:slug/members with page param', async () => {
      req.mockResolvedValue([])
      await communityService.getCommunityMembers('tech-hub', { page: 1 })
      expect(req).toHaveBeenCalledWith('GET', '/communities/tech-hub/members?page=1')
    })

    it('calls GET /communities/:slug/members with limit param', async () => {
      req.mockResolvedValue([])
      await communityService.getCommunityMembers('tech-hub', { limit: 50 })
      expect(req).toHaveBeenCalledWith('GET', '/communities/tech-hub/members?limit=50')
    })

    it('calls GET /communities/:slug/members with both page and limit params', async () => {
      req.mockResolvedValue([])
      await communityService.getCommunityMembers('tech-hub', { page: 2, limit: 25 })
      expect(req).toHaveBeenCalledWith('GET', '/communities/tech-hub/members?page=2&limit=25')
    })

    it('omits params when they are falsy', async () => {
      req.mockResolvedValue([])
      await communityService.getCommunityMembers('tech-hub', { page: 0, limit: undefined })
      expect(req).toHaveBeenCalledWith('GET', '/communities/tech-hub/members')
    })

    it('returns the resolved value', async () => {
      const members = [{ id: 'u1', name: 'Alice' }]
      req.mockResolvedValue(members)
      const result = await communityService.getCommunityMembers('tech-hub')
      expect(result).toEqual(members)
    })
  })

  describe('getCommunityJobs', () => {
    it('calls GET /communities/:slug/jobs', async () => {
      req.mockResolvedValue([])
      await communityService.getCommunityJobs('tech-hub')
      expect(req).toHaveBeenCalledWith('GET', '/communities/tech-hub/jobs')
    })

    it('returns the resolved value', async () => {
      const jobs = [{ id: 'j1', title: 'Engineer' }]
      req.mockResolvedValue(jobs)
      const result = await communityService.getCommunityJobs('tech-hub')
      expect(result).toEqual(jobs)
    })
  })

  describe('getCommunityDrives', () => {
    it('calls GET /communities/:slug/drives', async () => {
      req.mockResolvedValue([])
      await communityService.getCommunityDrives('tech-hub')
      expect(req).toHaveBeenCalledWith('GET', '/communities/tech-hub/drives')
    })

    it('returns the resolved value', async () => {
      const drives = [{ id: 'd1', name: 'Campus Drive 2026' }]
      req.mockResolvedValue(drives)
      const result = await communityService.getCommunityDrives('tech-hub')
      expect(result).toEqual(drives)
    })
  })

  describe('seedCommunityPosts', () => {
    it('calls POST /communities/:slug/seed-posts with empty body', async () => {
      req.mockResolvedValue({ seeded: 5 })
      await communityService.seedCommunityPosts('tech-hub')
      expect(req).toHaveBeenCalledWith('POST', '/communities/tech-hub/seed-posts', {})
    })

    it('returns the resolved value', async () => {
      const response = { seeded: 10 }
      req.mockResolvedValue(response)
      const result = await communityService.seedCommunityPosts('tech-hub')
      expect(result).toEqual(response)
    })
  })

  describe('updateCommunity', () => {
    it('calls PATCH /communities/:slug with data', async () => {
      req.mockResolvedValue({ slug: 'tech-hub', name: 'Updated Name' })
      const patch = { name: 'Updated Name' }
      await communityService.updateCommunity('tech-hub', patch)
      expect(req).toHaveBeenCalledWith('PATCH', '/communities/tech-hub', patch)
    })

    it('returns the resolved value', async () => {
      const updated = { slug: 'tech-hub', name: 'Updated Name', description: 'new desc' }
      req.mockResolvedValue(updated)
      const result = await communityService.updateCommunity('tech-hub', { name: 'Updated Name' })
      expect(result).toEqual(updated)
    })
  })

  describe('mergeDuplicateCommunities', () => {
    it('calls POST /communities/merge-duplicates', async () => {
      req.mockResolvedValue({ merged: 3 })
      await communityService.mergeDuplicateCommunities()
      expect(req).toHaveBeenCalledWith('POST', '/communities/merge-duplicates')
    })

    it('returns the resolved value', async () => {
      const response = { merged: 3, affected: ['a', 'b', 'c'] }
      req.mockResolvedValue(response)
      const result = await communityService.mergeDuplicateCommunities()
      expect(result).toEqual(response)
    })
  })

  describe('error handling', () => {
    it('propagates rejection from getCommunities', async () => {
      req.mockRejectedValue(new Error('Network error'))
      await expect(communityService.getCommunities()).rejects.toThrow('Network error')
    })

    it('propagates rejection from createCommunity', async () => {
      req.mockRejectedValue(new Error('Validation failed'))
      await expect(communityService.createCommunity({ name: '' })).rejects.toThrow('Validation failed')
    })

    it('propagates rejection from getCommunity', async () => {
      req.mockRejectedValue(new Error('Not found'))
      await expect(communityService.getCommunity('nonexistent')).rejects.toThrow('Not found')
    })

    it('propagates rejection from joinCommunity', async () => {
      req.mockRejectedValue(new Error('Already a member'))
      await expect(communityService.joinCommunity('tech-hub')).rejects.toThrow('Already a member')
    })

    it('propagates rejection from leaveCommunity', async () => {
      req.mockRejectedValue(new Error('Not a member'))
      await expect(communityService.leaveCommunity('tech-hub')).rejects.toThrow('Not a member')
    })

    it('propagates rejection from getCommunityFeed', async () => {
      req.mockRejectedValue(new Error('Forbidden'))
      await expect(communityService.getCommunityFeed('tech-hub')).rejects.toThrow('Forbidden')
    })

    it('propagates rejection from getCommunityMembers', async () => {
      req.mockRejectedValue(new Error('Unauthorized'))
      await expect(communityService.getCommunityMembers('tech-hub')).rejects.toThrow('Unauthorized')
    })

    it('propagates rejection from getCommunityJobs', async () => {
      req.mockRejectedValue(new Error('Server error'))
      await expect(communityService.getCommunityJobs('tech-hub')).rejects.toThrow('Server error')
    })

    it('propagates rejection from getCommunityDrives', async () => {
      req.mockRejectedValue(new Error('Timeout'))
      await expect(communityService.getCommunityDrives('tech-hub')).rejects.toThrow('Timeout')
    })

    it('propagates rejection from seedCommunityPosts', async () => {
      req.mockRejectedValue(new Error('Internal server error'))
      await expect(communityService.seedCommunityPosts('tech-hub')).rejects.toThrow('Internal server error')
    })

    it('propagates rejection from updateCommunity', async () => {
      req.mockRejectedValue(new Error('Conflict'))
      await expect(communityService.updateCommunity('tech-hub', {})).rejects.toThrow('Conflict')
    })

    it('propagates rejection from mergeDuplicateCommunities', async () => {
      req.mockRejectedValue(new Error('Service unavailable'))
      await expect(communityService.mergeDuplicateCommunities()).rejects.toThrow('Service unavailable')
    })
  })
})
