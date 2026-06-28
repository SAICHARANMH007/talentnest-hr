import { describe, it, expect, vi, beforeEach } from 'vitest'
import { blogService } from '../../api/services/blog.service.js'

vi.mock('../../api/client.js', () => ({
  req: vi.fn(),
}))

import { req } from '../../api/client.js'

describe('blogService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── getPublicBlogs ──────────────────────────────────────────────────────────
  describe('getPublicBlogs', () => {
    it('calls GET /blogs/public without auth (false as 4th arg)', async () => {
      req.mockResolvedValue([])
      await blogService.getPublicBlogs()
      expect(req).toHaveBeenCalledWith('GET', '/blogs/public', null, false)
    })

    it('returns the req response directly (no data unwrapping)', async () => {
      const data = [{ _id: 'b1', title: 'Hello World', slug: 'hello-world' }]
      req.mockResolvedValue(data)
      const result = await blogService.getPublicBlogs()
      expect(result).toEqual(data)
    })

    it('propagates rejection from req', async () => {
      req.mockRejectedValue(new Error('network error'))
      await expect(blogService.getPublicBlogs()).rejects.toThrow('network error')
    })

    it('calls with exactly 4 arguments: method, path, null, false', async () => {
      req.mockResolvedValue([])
      await blogService.getPublicBlogs()
      expect(req.mock.calls[0]).toEqual(['GET', '/blogs/public', null, false])
    })
  })

  // ── getPublicBlog ───────────────────────────────────────────────────────────
  describe('getPublicBlog', () => {
    it('calls GET /blogs/public/:slug without auth', async () => {
      req.mockResolvedValue({ _id: 'b1', slug: 'my-post' })
      await blogService.getPublicBlog('my-post')
      expect(req).toHaveBeenCalledWith('GET', '/blogs/public/my-post', null, false)
    })

    it('uses the slug exactly as provided in the URL', async () => {
      req.mockResolvedValue({})
      await blogService.getPublicBlog('some-special-slug-123')
      expect(req).toHaveBeenCalledWith('GET', '/blogs/public/some-special-slug-123', null, false)
    })

    it('returns the req response directly', async () => {
      const post = { _id: 'b2', title: 'Test Post', slug: 'test-post', content: 'Hello' }
      req.mockResolvedValue(post)
      const result = await blogService.getPublicBlog('test-post')
      expect(result).toEqual(post)
    })

    it('calls with exactly 4 arguments: method, interpolated path, null, false', async () => {
      req.mockResolvedValue(null)
      await blogService.getPublicBlog('slug-abc')
      expect(req.mock.calls[0]).toEqual(['GET', '/blogs/public/slug-abc', null, false])
    })

    it('propagates rejection from req', async () => {
      req.mockRejectedValue(new Error('not found'))
      await expect(blogService.getPublicBlog('missing')).rejects.toThrow('not found')
    })
  })

  // ── adminGetBlogs ───────────────────────────────────────────────────────────
  describe('adminGetBlogs', () => {
    it('calls GET /blogs with auth (no 4th arg)', async () => {
      req.mockResolvedValue([])
      await blogService.adminGetBlogs()
      expect(req).toHaveBeenCalledWith('GET', '/blogs')
    })

    it('does NOT pass false as 4th arg (requires auth)', async () => {
      req.mockResolvedValue([])
      await blogService.adminGetBlogs()
      // The 4th arg should not be false — auth is required
      expect(req.mock.calls[0][3]).not.toBe(false)
    })

    it('returns the req response directly', async () => {
      const list = [{ _id: 'b1', title: 'Admin Post' }, { _id: 'b2', title: 'Draft' }]
      req.mockResolvedValue(list)
      const result = await blogService.adminGetBlogs()
      expect(result).toEqual(list)
    })

    it('propagates rejection from req', async () => {
      req.mockRejectedValue(new Error('unauthorized'))
      await expect(blogService.adminGetBlogs()).rejects.toThrow('unauthorized')
    })
  })

  // ── adminGetBlog ────────────────────────────────────────────────────────────
  describe('adminGetBlog', () => {
    it('calls GET /blogs/:id', async () => {
      req.mockResolvedValue({ _id: 'b1', title: 'Post' })
      await blogService.adminGetBlog('b1')
      expect(req).toHaveBeenCalledWith('GET', '/blogs/b1')
    })

    it('uses the id exactly as provided in the URL', async () => {
      req.mockResolvedValue({})
      await blogService.adminGetBlog('blog-id-xyz')
      expect(req).toHaveBeenCalledWith('GET', '/blogs/blog-id-xyz')
    })

    it('returns the req response directly', async () => {
      const post = { _id: 'b1', title: 'Detailed Post', content: 'Long content...' }
      req.mockResolvedValue(post)
      const result = await blogService.adminGetBlog('b1')
      expect(result).toEqual(post)
    })

    it('propagates rejection from req', async () => {
      req.mockRejectedValue(new Error('not found'))
      await expect(blogService.adminGetBlog('bad-id')).rejects.toThrow('not found')
    })
  })

  // ── adminCreateBlog ─────────────────────────────────────────────────────────
  describe('adminCreateBlog', () => {
    it('calls POST /blogs with the provided data', async () => {
      req.mockResolvedValue({ _id: 'new-b1' })
      const data = { title: 'New Post', content: 'Body text', slug: 'new-post', published: false }
      await blogService.adminCreateBlog(data)
      expect(req).toHaveBeenCalledWith('POST', '/blogs', data)
    })

    it('passes data object through to req unchanged', async () => {
      req.mockResolvedValue({})
      const data = { title: 'T', content: 'C', tags: ['hr', 'hiring'], author: 'admin' }
      await blogService.adminCreateBlog(data)
      expect(req.mock.calls[0][2]).toEqual(data)
    })

    it('returns the req response directly', async () => {
      const created = { _id: 'new-b1', title: 'New Post', slug: 'new-post' }
      req.mockResolvedValue(created)
      const result = await blogService.adminCreateBlog({ title: 'New Post' })
      expect(result).toEqual(created)
    })

    it('propagates rejection from req', async () => {
      req.mockRejectedValue(new Error('validation error'))
      await expect(blogService.adminCreateBlog({ title: '' })).rejects.toThrow('validation error')
    })
  })

  // ── adminUpdateBlog ─────────────────────────────────────────────────────────
  describe('adminUpdateBlog', () => {
    it('calls PUT /blogs/:id with the provided data', async () => {
      req.mockResolvedValue({ _id: 'b1', title: 'Updated' })
      const data = { title: 'Updated Title', content: 'Updated body' }
      await blogService.adminUpdateBlog('b1', data)
      expect(req).toHaveBeenCalledWith('PUT', '/blogs/b1', data)
    })

    it('uses the id exactly as provided in the URL path', async () => {
      req.mockResolvedValue({})
      await blogService.adminUpdateBlog('specific-id-999', { title: 'X' })
      expect(req).toHaveBeenCalledWith('PUT', '/blogs/specific-id-999', { title: 'X' })
    })

    it('passes data object through to req unchanged', async () => {
      req.mockResolvedValue({})
      const data = { title: 'T', slug: 's', content: 'c', tags: ['a'] }
      await blogService.adminUpdateBlog('b1', data)
      expect(req.mock.calls[0][2]).toEqual(data)
    })

    it('returns the req response directly', async () => {
      const updated = { _id: 'b1', title: 'Updated Title' }
      req.mockResolvedValue(updated)
      const result = await blogService.adminUpdateBlog('b1', { title: 'Updated Title' })
      expect(result).toEqual(updated)
    })

    it('propagates rejection from req', async () => {
      req.mockRejectedValue(new Error('conflict'))
      await expect(blogService.adminUpdateBlog('b1', { slug: 'taken' })).rejects.toThrow('conflict')
    })
  })

  // ── adminTogglePublish ──────────────────────────────────────────────────────
  describe('adminTogglePublish', () => {
    it('calls PATCH /blogs/:id/publish with an empty object body', async () => {
      req.mockResolvedValue({ _id: 'b1', published: true })
      await blogService.adminTogglePublish('b1')
      expect(req).toHaveBeenCalledWith('PATCH', '/blogs/b1/publish', {})
    })

    it('uses the id exactly as provided in the URL path', async () => {
      req.mockResolvedValue({})
      await blogService.adminTogglePublish('blog-toggle-abc')
      expect(req).toHaveBeenCalledWith('PATCH', '/blogs/blog-toggle-abc/publish', {})
    })

    it('sends an empty object as the body (not null or undefined)', async () => {
      req.mockResolvedValue({})
      await blogService.adminTogglePublish('b2')
      expect(req.mock.calls[0][2]).toEqual({})
    })

    it('returns the req response directly', async () => {
      const toggled = { _id: 'b1', published: true }
      req.mockResolvedValue(toggled)
      const result = await blogService.adminTogglePublish('b1')
      expect(result).toEqual(toggled)
    })

    it('propagates rejection from req', async () => {
      req.mockRejectedValue(new Error('not found'))
      await expect(blogService.adminTogglePublish('missing')).rejects.toThrow('not found')
    })
  })

  // ── adminDeleteBlog ─────────────────────────────────────────────────────────
  describe('adminDeleteBlog', () => {
    it('calls DELETE /blogs/:id', async () => {
      req.mockResolvedValue({ deleted: true })
      await blogService.adminDeleteBlog('b1')
      expect(req).toHaveBeenCalledWith('DELETE', '/blogs/b1')
    })

    it('uses the id exactly as provided in the URL path', async () => {
      req.mockResolvedValue({})
      await blogService.adminDeleteBlog('delete-target-xyz')
      expect(req).toHaveBeenCalledWith('DELETE', '/blogs/delete-target-xyz')
    })

    it('returns the req response directly', async () => {
      const res = { deleted: true, id: 'b1' }
      req.mockResolvedValue(res)
      const result = await blogService.adminDeleteBlog('b1')
      expect(result).toEqual(res)
    })

    it('calls with exactly 2 arguments: method and path (no body)', async () => {
      req.mockResolvedValue({})
      await blogService.adminDeleteBlog('b1')
      expect(req.mock.calls[0]).toHaveLength(2)
    })

    it('propagates rejection from req', async () => {
      req.mockRejectedValue(new Error('forbidden'))
      await expect(blogService.adminDeleteBlog('b1')).rejects.toThrow('forbidden')
    })
  })

  // ── Public vs Admin auth differentiation ───────────────────────────────────
  describe('auth differentiation', () => {
    it('public endpoints pass false as 4th arg, admin endpoints do not', async () => {
      req.mockResolvedValue([])

      await blogService.getPublicBlogs()
      expect(req.mock.calls[0][3]).toBe(false)

      req.mockClear()
      await blogService.adminGetBlogs()
      expect(req.mock.calls[0][3]).not.toBe(false)
    })

    it('getPublicBlog passes false as 4th arg', async () => {
      req.mockResolvedValue({})
      await blogService.getPublicBlog('slug')
      expect(req.mock.calls[0][3]).toBe(false)
    })
  })
})
