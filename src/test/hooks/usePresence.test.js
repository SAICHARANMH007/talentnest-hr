import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../api/api.js', () => ({
  default: { getOnlineUsers: vi.fn() },
}))

import api from '../../api/api.js'
import { usePresence } from '../../hooks/usePresence.js'

describe('usePresence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getOnlineUsers.mockResolvedValue({ data: [] })
  })

  it('returns onlineUsers array and isUserOnline function', () => {
    const { result } = renderHook(() => usePresence())
    expect(Array.isArray(result.current.onlineUsers)).toBe(true)
    expect(typeof result.current.isUserOnline).toBe('function')
  })

  it('isUserOnline returns false when userId is null', () => {
    const { result } = renderHook(() => usePresence())
    expect(result.current.isUserOnline(null)).toBe(false)
  })

  it('isUserOnline returns false when userId is undefined', () => {
    const { result } = renderHook(() => usePresence())
    expect(result.current.isUserOnline(undefined)).toBe(false)
  })

  it('isUserOnline returns false for an ID not in the online list', () => {
    const { result } = renderHook(() => usePresence())
    expect(result.current.isUserOnline('non-existent-id')).toBe(false)
  })

  it('starts with empty or pre-cached onlineUsers (no crash on initial render)', () => {
    const { result } = renderHook(() => usePresence())
    expect(result.current.onlineUsers).toBeDefined()
  })

  it('calls api.getOnlineUsers on mount', async () => {
    renderHook(() => usePresence())
    // Let async polling settle
    await act(async () => {})
    // The hook starts polling — may have been called already by the shared interval
    expect(api.getOnlineUsers).toHaveBeenCalled()
  })

  it('does not throw when getOnlineUsers rejects', async () => {
    api.getOnlineUsers.mockRejectedValue(new Error('network failure'))
    expect(() => renderHook(() => usePresence())).not.toThrow()
    await act(async () => {})
  })

  it('unmounts without crash even if polling interval is active', () => {
    const { unmount } = renderHook(() => usePresence())
    expect(() => unmount()).not.toThrow()
  })
})
