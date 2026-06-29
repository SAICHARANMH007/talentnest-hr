import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/client.js', () => ({ req: vi.fn(), getToken: vi.fn() }))
vi.mock('../../api/config.js', () => ({ API_BASE_URL: 'http://localhost:5000/api' }))

import { feedPostService } from '../../api/services/feedPost.service.js'
import { req, getToken } from '../../api/client.js'

describe('feedPostService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  // ── getPosts ────────────────────────────────────────────────────────────────
  describe('getPosts', () => {
    it('calls GET /social-posts with no params when called with empty object', async () => {
      req.mockResolvedValue([])
      await feedPostService.getPosts({})
      expect(req).toHaveBeenCalledWith('GET', '/social-posts')
    })

    it('calls GET /social-posts with no params when called with no arguments', async () => {
      req.mockResolvedValue([])
      await feedPostService.getPosts()
      expect(req).toHaveBeenCalledWith('GET', '/social-posts')
    })

    it('appends page param when provided', async () => {
      req.mockResolvedValue([])
      await feedPostService.getPosts({ page: 2 })
      expect(req).toHaveBeenCalledWith('GET', '/social-posts?page=2')
    })

    it('appends limit param when provided', async () => {
      req.mockResolvedValue([])
      await feedPostService.getPosts({ limit: 10 })
      expect(req).toHaveBeenCalledWith('GET', '/social-posts?limit=10')
    })

    it('appends type param when provided', async () => {
      req.mockResolvedValue([])
      await feedPostService.getPosts({ type: 'image' })
      expect(req).toHaveBeenCalledWith('GET', '/social-posts?type=image')
    })

    it('appends all params when all are provided', async () => {
      req.mockResolvedValue([])
      await feedPostService.getPosts({ page: 3, limit: 20, type: 'video' })
      expect(req).toHaveBeenCalledWith('GET', '/social-posts?page=3&limit=20&type=video')
    })

    it('omits falsy page and limit', async () => {
      req.mockResolvedValue([])
      await feedPostService.getPosts({ page: 0, limit: null, type: '' })
      expect(req).toHaveBeenCalledWith('GET', '/social-posts')
    })

    it('returns the resolved value', async () => {
      const posts = [{ id: 'p1', content: 'Hello world' }]
      req.mockResolvedValue(posts)
      const result = await feedPostService.getPosts()
      expect(result).toEqual(posts)
    })

    it('propagates rejection', async () => {
      req.mockRejectedValue(new Error('Network error'))
      await expect(feedPostService.getPosts()).rejects.toThrow('Network error')
    })
  })

  // ── getUserPosts ────────────────────────────────────────────────────────────
  describe('getUserPosts', () => {
    it('calls GET /social-posts/user/:userId', async () => {
      req.mockResolvedValue([])
      await feedPostService.getUserPosts('user123')
      expect(req).toHaveBeenCalledWith('GET', '/social-posts/user/user123')
    })

    it('uses the correct userId in the URL', async () => {
      req.mockResolvedValue([])
      await feedPostService.getUserPosts('abc-456')
      expect(req).toHaveBeenCalledWith('GET', '/social-posts/user/abc-456')
    })

    it('returns the resolved value', async () => {
      const posts = [{ id: 'p2', content: 'User post' }]
      req.mockResolvedValue(posts)
      const result = await feedPostService.getUserPosts('user123')
      expect(result).toEqual(posts)
    })

    it('propagates rejection', async () => {
      req.mockRejectedValue(new Error('Not found'))
      await expect(feedPostService.getUserPosts('ghost')).rejects.toThrow('Not found')
    })
  })

  // ── createPost ──────────────────────────────────────────────────────────────
  describe('createPost', () => {
    it('calls POST /social-posts with the provided data', async () => {
      req.mockResolvedValue({ id: 'new1' })
      const payload = { content: 'New post', type: 'text' }
      await feedPostService.createPost(payload)
      expect(req).toHaveBeenCalledWith('POST', '/social-posts', payload)
    })

    it('returns the resolved value', async () => {
      const created = { id: 'new1', content: 'New post' }
      req.mockResolvedValue(created)
      const result = await feedPostService.createPost({ content: 'New post' })
      expect(result).toEqual(created)
    })

    it('propagates rejection', async () => {
      req.mockRejectedValue(new Error('Validation failed'))
      await expect(feedPostService.createPost({})).rejects.toThrow('Validation failed')
    })
  })

  // ── deletePost ──────────────────────────────────────────────────────────────
  describe('deletePost', () => {
    it('calls DELETE /social-posts/:id', async () => {
      req.mockResolvedValue({ success: true })
      await feedPostService.deletePost('post99')
      expect(req).toHaveBeenCalledWith('DELETE', '/social-posts/post99')
    })

    it('returns the resolved value', async () => {
      const response = { success: true }
      req.mockResolvedValue(response)
      const result = await feedPostService.deletePost('post99')
      expect(result).toEqual(response)
    })

    it('propagates rejection', async () => {
      req.mockRejectedValue(new Error('Forbidden'))
      await expect(feedPostService.deletePost('post99')).rejects.toThrow('Forbidden')
    })
  })

  // ── reactToPost ─────────────────────────────────────────────────────────────
  describe('reactToPost', () => {
    it('calls POST /social-posts/:id/react with the reaction type', async () => {
      req.mockResolvedValue({ reactions: { like: 1 } })
      await feedPostService.reactToPost('post1', 'like')
      expect(req).toHaveBeenCalledWith('POST', '/social-posts/post1/react', { type: 'like' })
    })

    it('passes the correct type in the body', async () => {
      req.mockResolvedValue({})
      await feedPostService.reactToPost('post2', 'celebrate')
      expect(req).toHaveBeenCalledWith('POST', '/social-posts/post2/react', { type: 'celebrate' })
    })

    it('returns the resolved value', async () => {
      const response = { reactions: { like: 5 } }
      req.mockResolvedValue(response)
      const result = await feedPostService.reactToPost('post1', 'like')
      expect(result).toEqual(response)
    })

    it('propagates rejection', async () => {
      req.mockRejectedValue(new Error('Unauthorized'))
      await expect(feedPostService.reactToPost('post1', 'like')).rejects.toThrow('Unauthorized')
    })
  })

  // ── votePoll ────────────────────────────────────────────────────────────────
  describe('votePoll', () => {
    it('calls POST /social-posts/:id/vote with the option index', async () => {
      req.mockResolvedValue({ votes: [3, 7] })
      await feedPostService.votePoll('poll1', 0)
      expect(req).toHaveBeenCalledWith('POST', '/social-posts/poll1/vote', { optionIndex: 0 })
    })

    it('passes the correct optionIndex in the body', async () => {
      req.mockResolvedValue({})
      await feedPostService.votePoll('poll2', 2)
      expect(req).toHaveBeenCalledWith('POST', '/social-posts/poll2/vote', { optionIndex: 2 })
    })

    it('returns the resolved value', async () => {
      const response = { votes: [10, 4, 1] }
      req.mockResolvedValue(response)
      const result = await feedPostService.votePoll('poll1', 1)
      expect(result).toEqual(response)
    })

    it('propagates rejection', async () => {
      req.mockRejectedValue(new Error('Already voted'))
      await expect(feedPostService.votePoll('poll1', 0)).rejects.toThrow('Already voted')
    })
  })

  // ── toggleSavePost ──────────────────────────────────────────────────────────
  describe('toggleSavePost', () => {
    it('calls POST /social-posts/:id/save with empty body', async () => {
      req.mockResolvedValue({ saved: true })
      await feedPostService.toggleSavePost('post5')
      expect(req).toHaveBeenCalledWith('POST', '/social-posts/post5/save', {})
    })

    it('returns the resolved value', async () => {
      const response = { saved: false }
      req.mockResolvedValue(response)
      const result = await feedPostService.toggleSavePost('post5')
      expect(result).toEqual(response)
    })

    it('propagates rejection', async () => {
      req.mockRejectedValue(new Error('Server error'))
      await expect(feedPostService.toggleSavePost('post5')).rejects.toThrow('Server error')
    })
  })

  // ── getSavedPosts ───────────────────────────────────────────────────────────
  describe('getSavedPosts', () => {
    it('calls GET /social-posts/saved/list', async () => {
      req.mockResolvedValue([])
      await feedPostService.getSavedPosts()
      expect(req).toHaveBeenCalledWith('GET', '/social-posts/saved/list')
    })

    it('returns the resolved value', async () => {
      const posts = [{ id: 'saved1', content: 'Saved post' }]
      req.mockResolvedValue(posts)
      const result = await feedPostService.getSavedPosts()
      expect(result).toEqual(posts)
    })

    it('propagates rejection', async () => {
      req.mockRejectedValue(new Error('Unauthorized'))
      await expect(feedPostService.getSavedPosts()).rejects.toThrow('Unauthorized')
    })
  })

  // ── addComment ──────────────────────────────────────────────────────────────
  describe('addComment', () => {
    it('calls POST /social-posts/:id/comment with content and empty mentions by default', async () => {
      req.mockResolvedValue({ id: 'c1' })
      await feedPostService.addComment('post1', 'Great post!')
      expect(req).toHaveBeenCalledWith('POST', '/social-posts/post1/comment', {
        content: 'Great post!',
        mentions: [],
      })
    })

    it('calls POST /social-posts/:id/comment with content and provided mentions', async () => {
      req.mockResolvedValue({ id: 'c2' })
      await feedPostService.addComment('post1', 'Hey @user!', ['user123'])
      expect(req).toHaveBeenCalledWith('POST', '/social-posts/post1/comment', {
        content: 'Hey @user!',
        mentions: ['user123'],
      })
    })

    it('returns the resolved value', async () => {
      const comment = { id: 'c1', content: 'Great post!' }
      req.mockResolvedValue(comment)
      const result = await feedPostService.addComment('post1', 'Great post!')
      expect(result).toEqual(comment)
    })

    it('propagates rejection', async () => {
      req.mockRejectedValue(new Error('Content required'))
      await expect(feedPostService.addComment('post1', '')).rejects.toThrow('Content required')
    })
  })

  // ── deleteComment ───────────────────────────────────────────────────────────
  describe('deleteComment', () => {
    it('calls DELETE /social-posts/:postId/comment/:commentId', async () => {
      req.mockResolvedValue({ success: true })
      await feedPostService.deleteComment('post1', 'comment42')
      expect(req).toHaveBeenCalledWith('DELETE', '/social-posts/post1/comment/comment42')
    })

    it('returns the resolved value', async () => {
      const response = { success: true }
      req.mockResolvedValue(response)
      const result = await feedPostService.deleteComment('post1', 'comment42')
      expect(result).toEqual(response)
    })

    it('propagates rejection', async () => {
      req.mockRejectedValue(new Error('Comment not found'))
      await expect(feedPostService.deleteComment('post1', 'bad-id')).rejects.toThrow('Comment not found')
    })
  })

  // ── seedTestData ────────────────────────────────────────────────────────────
  describe('seedTestData', () => {
    it('calls POST /social-posts/seed with empty body', async () => {
      req.mockResolvedValue({ seeded: 10 })
      await feedPostService.seedTestData()
      expect(req).toHaveBeenCalledWith('POST', '/social-posts/seed', {})
    })

    it('returns the resolved value', async () => {
      const response = { seeded: 10 }
      req.mockResolvedValue(response)
      const result = await feedPostService.seedTestData()
      expect(result).toEqual(response)
    })

    it('propagates rejection', async () => {
      req.mockRejectedValue(new Error('Internal server error'))
      await expect(feedPostService.seedTestData()).rejects.toThrow('Internal server error')
    })
  })

  // ── uploadFeedImage ─────────────────────────────────────────────────────────
  describe('uploadFeedImage', () => {
    it('sends a POST fetch to /social-posts/upload-image with formData', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ url: 'https://cdn.example.com/image.jpg' }),
      })
      vi.stubGlobal('fetch', fetchMock)
      getToken.mockReturnValue(null)

      const formData = new FormData()
      await feedPostService.uploadFeedImage(formData)

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:5000/api/social-posts/upload-image',
        expect.objectContaining({
          method: 'POST',
          body: formData,
          credentials: 'include',
        })
      )
    })

    it('sets Authorization header when token exists', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ url: 'https://cdn.example.com/image.jpg' }),
      })
      vi.stubGlobal('fetch', fetchMock)
      getToken.mockReturnValue('my-jwt-token')

      const formData = new FormData()
      await feedPostService.uploadFeedImage(formData)

      const [, options] = fetchMock.mock.calls[0]
      expect(options.headers['Authorization']).toBe('Bearer my-jwt-token')
    })

    it('does not set Authorization header when token is null', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ url: 'https://cdn.example.com/image.jpg' }),
      })
      vi.stubGlobal('fetch', fetchMock)
      getToken.mockReturnValue(null)

      const formData = new FormData()
      await feedPostService.uploadFeedImage(formData)

      const [, options] = fetchMock.mock.calls[0]
      expect(options.headers['Authorization']).toBeUndefined()
    })

    it('sets X-Requested-With header', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ url: 'https://cdn.example.com/image.jpg' }),
      })
      vi.stubGlobal('fetch', fetchMock)
      getToken.mockReturnValue(null)

      const formData = new FormData()
      await feedPostService.uploadFeedImage(formData)

      const [, options] = fetchMock.mock.calls[0]
      expect(options.headers['X-Requested-With']).toBe('TalentNest')
    })

    it('returns the parsed JSON on success', async () => {
      const responseData = { url: 'https://cdn.example.com/image.jpg' }
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(responseData),
      })
      vi.stubGlobal('fetch', fetchMock)
      getToken.mockReturnValue(null)

      const result = await feedPostService.uploadFeedImage(new FormData())
      expect(result).toEqual(responseData)
    })

    it('throws an error with server error message when response is not ok', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ error: 'File too large' }),
      })
      vi.stubGlobal('fetch', fetchMock)
      getToken.mockReturnValue(null)

      await expect(feedPostService.uploadFeedImage(new FormData())).rejects.toThrow('File too large')
    })

    it('throws with server message field when error field is absent', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ message: 'Internal error' }),
      })
      vi.stubGlobal('fetch', fetchMock)
      getToken.mockReturnValue(null)

      await expect(feedPostService.uploadFeedImage(new FormData())).rejects.toThrow('Internal error')
    })

    it('throws fallback message when response JSON cannot be parsed', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 413,
        json: vi.fn().mockRejectedValue(new SyntaxError('bad json')),
      })
      vi.stubGlobal('fetch', fetchMock)
      getToken.mockReturnValue(null)

      await expect(feedPostService.uploadFeedImage(new FormData())).rejects.toThrow('Upload failed (413)')
    })
  })

  // ── uploadFeedVideo ─────────────────────────────────────────────────────────
  describe('uploadFeedVideo', () => {
    it('sends a POST fetch to /social-posts/upload-video with formData', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ url: 'https://cdn.example.com/video.mp4' }),
      })
      vi.stubGlobal('fetch', fetchMock)
      getToken.mockReturnValue(null)

      const formData = new FormData()
      await feedPostService.uploadFeedVideo(formData)

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:5000/api/social-posts/upload-video',
        expect.objectContaining({
          method: 'POST',
          body: formData,
          credentials: 'include',
        })
      )
    })

    it('sets Authorization header when token exists', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ url: 'https://cdn.example.com/video.mp4' }),
      })
      vi.stubGlobal('fetch', fetchMock)
      getToken.mockReturnValue('video-token')

      await feedPostService.uploadFeedVideo(new FormData())

      const [, options] = fetchMock.mock.calls[0]
      expect(options.headers['Authorization']).toBe('Bearer video-token')
    })

    it('returns the parsed JSON on success', async () => {
      const responseData = { url: 'https://cdn.example.com/video.mp4' }
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(responseData),
      })
      vi.stubGlobal('fetch', fetchMock)
      getToken.mockReturnValue(null)

      const result = await feedPostService.uploadFeedVideo(new FormData())
      expect(result).toEqual(responseData)
    })

    it('throws an error with server error message when response is not ok', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ error: 'Invalid video format' }),
      })
      vi.stubGlobal('fetch', fetchMock)
      getToken.mockReturnValue(null)

      await expect(feedPostService.uploadFeedVideo(new FormData())).rejects.toThrow('Invalid video format')
    })

    it('throws fallback message when response JSON cannot be parsed', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: vi.fn().mockRejectedValue(new SyntaxError('bad json')),
      })
      vi.stubGlobal('fetch', fetchMock)
      getToken.mockReturnValue(null)

      await expect(feedPostService.uploadFeedVideo(new FormData())).rejects.toThrow('Upload failed (503)')
    })
  })

  // ── uploadFeedAudio ─────────────────────────────────────────────────────────
  describe('uploadFeedAudio', () => {
    it('sends a POST fetch to /social-posts/upload-audio with formData', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ url: 'https://cdn.example.com/audio.mp3' }),
      })
      vi.stubGlobal('fetch', fetchMock)
      getToken.mockReturnValue(null)

      const formData = new FormData()
      await feedPostService.uploadFeedAudio(formData)

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:5000/api/social-posts/upload-audio',
        expect.objectContaining({
          method: 'POST',
          body: formData,
          credentials: 'include',
        })
      )
    })

    it('sets Authorization header when token exists', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ url: 'https://cdn.example.com/audio.mp3' }),
      })
      vi.stubGlobal('fetch', fetchMock)
      getToken.mockReturnValue('audio-token')

      await feedPostService.uploadFeedAudio(new FormData())

      const [, options] = fetchMock.mock.calls[0]
      expect(options.headers['Authorization']).toBe('Bearer audio-token')
    })

    it('sets X-Requested-With header', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ url: 'https://cdn.example.com/audio.mp3' }),
      })
      vi.stubGlobal('fetch', fetchMock)
      getToken.mockReturnValue(null)

      await feedPostService.uploadFeedAudio(new FormData())

      const [, options] = fetchMock.mock.calls[0]
      expect(options.headers['X-Requested-With']).toBe('TalentNest')
    })

    it('returns the parsed JSON on success', async () => {
      const responseData = { url: 'https://cdn.example.com/audio.mp3' }
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(responseData),
      })
      vi.stubGlobal('fetch', fetchMock)
      getToken.mockReturnValue(null)

      const result = await feedPostService.uploadFeedAudio(new FormData())
      expect(result).toEqual(responseData)
    })

    it('throws an error with server error message when response is not ok', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: vi.fn().mockResolvedValue({ error: 'Unsupported audio type' }),
      })
      vi.stubGlobal('fetch', fetchMock)
      getToken.mockReturnValue(null)

      await expect(feedPostService.uploadFeedAudio(new FormData())).rejects.toThrow('Unsupported audio type')
    })

    it('throws fallback message when response JSON cannot be parsed', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new SyntaxError('bad json')),
      })
      vi.stubGlobal('fetch', fetchMock)
      getToken.mockReturnValue(null)

      await expect(feedPostService.uploadFeedAudio(new FormData())).rejects.toThrow('Upload failed (500)')
    })

    it('throws with message field when error field is absent', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ message: 'File too large' }),
      })
      vi.stubGlobal('fetch', fetchMock)
      getToken.mockReturnValue(null)

      await expect(feedPostService.uploadFeedAudio(new FormData())).rejects.toThrow('File too large')
    })
  })

  // ── getPublicPost ───────────────────────────────────────────────────────────
  describe('getPublicPost', () => {
    it('sends a GET fetch to /social-posts/public/:id', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({ id: 'pub1', content: 'Public post' }),
      })
      vi.stubGlobal('fetch', fetchMock)

      await feedPostService.getPublicPost('pub1')

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:5000/api/social-posts/public/pub1')
    })

    it('returns the parsed JSON', async () => {
      const post = { id: 'pub1', content: 'Public post' }
      const fetchMock = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue(post),
      })
      vi.stubGlobal('fetch', fetchMock)

      const result = await feedPostService.getPublicPost('pub1')
      expect(result).toEqual(post)
    })

    it('uses the correct post id in the URL', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({}),
      })
      vi.stubGlobal('fetch', fetchMock)

      await feedPostService.getPublicPost('xyz-789')
      expect(fetchMock).toHaveBeenCalledWith('http://localhost:5000/api/social-posts/public/xyz-789')
    })
  })

  // ── reportPost ──────────────────────────────────────────────────────────────
  describe('reportPost', () => {
    it('calls POST /social-posts/:id/report with reason and empty details by default', async () => {
      req.mockResolvedValue({ success: true })
      await feedPostService.reportPost('post1', 'spam')
      expect(req).toHaveBeenCalledWith('POST', '/social-posts/post1/report', {
        reason: 'spam',
        details: '',
      })
    })

    it('calls POST /social-posts/:id/report with reason and provided details', async () => {
      req.mockResolvedValue({ success: true })
      await feedPostService.reportPost('post1', 'harassment', 'This post is abusive')
      expect(req).toHaveBeenCalledWith('POST', '/social-posts/post1/report', {
        reason: 'harassment',
        details: 'This post is abusive',
      })
    })

    it('returns the resolved value', async () => {
      const response = { success: true, reportId: 'r1' }
      req.mockResolvedValue(response)
      const result = await feedPostService.reportPost('post1', 'spam')
      expect(result).toEqual(response)
    })

    it('propagates rejection', async () => {
      req.mockRejectedValue(new Error('Already reported'))
      await expect(feedPostService.reportPost('post1', 'spam')).rejects.toThrow('Already reported')
    })
  })

  // ── getReportedPosts ────────────────────────────────────────────────────────
  describe('getReportedPosts', () => {
    it('calls GET /social-posts/reported', async () => {
      req.mockResolvedValue([])
      await feedPostService.getReportedPosts()
      expect(req).toHaveBeenCalledWith('GET', '/social-posts/reported')
    })

    it('returns the resolved value', async () => {
      const reports = [{ reportId: 'r1', postId: 'p1', reason: 'spam' }]
      req.mockResolvedValue(reports)
      const result = await feedPostService.getReportedPosts()
      expect(result).toEqual(reports)
    })

    it('propagates rejection', async () => {
      req.mockRejectedValue(new Error('Admin only'))
      await expect(feedPostService.getReportedPosts()).rejects.toThrow('Admin only')
    })
  })

  // ── dismissReport ───────────────────────────────────────────────────────────
  describe('dismissReport', () => {
    it('calls PATCH /social-posts/reports/:reportId/dismiss with empty body', async () => {
      req.mockResolvedValue({ dismissed: true })
      await feedPostService.dismissReport('report42')
      expect(req).toHaveBeenCalledWith('PATCH', '/social-posts/reports/report42/dismiss', {})
    })

    it('returns the resolved value', async () => {
      const response = { dismissed: true }
      req.mockResolvedValue(response)
      const result = await feedPostService.dismissReport('report42')
      expect(result).toEqual(response)
    })

    it('propagates rejection', async () => {
      req.mockRejectedValue(new Error('Report not found'))
      await expect(feedPostService.dismissReport('bad-id')).rejects.toThrow('Report not found')
    })
  })

  // ── deleteReportedPost ──────────────────────────────────────────────────────
  describe('deleteReportedPost', () => {
    it('calls DELETE /social-posts/reports/:reportId/delete-post', async () => {
      req.mockResolvedValue({ deleted: true })
      await feedPostService.deleteReportedPost('report99')
      expect(req).toHaveBeenCalledWith('DELETE', '/social-posts/reports/report99/delete-post')
    })

    it('returns the resolved value', async () => {
      const response = { deleted: true }
      req.mockResolvedValue(response)
      const result = await feedPostService.deleteReportedPost('report99')
      expect(result).toEqual(response)
    })

    it('propagates rejection', async () => {
      req.mockRejectedValue(new Error('Report not found'))
      await expect(feedPostService.deleteReportedPost('bad-id')).rejects.toThrow('Report not found')
    })
  })
})
