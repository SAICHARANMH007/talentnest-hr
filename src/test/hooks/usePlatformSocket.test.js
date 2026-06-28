import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted runs before module imports — the only way to reference a variable
// inside a vi.mock() factory without a "before initialization" error.
const { mockSocket, mockIo } = vi.hoisted(() => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
  }
  const mockIo = vi.fn(() => mockSocket)
  return { mockSocket, mockIo }
})

vi.mock('socket.io-client', () => ({ io: mockIo }))
vi.mock('../../api/config.js', () => ({ SOCKET_BASE_URL: 'http://localhost:5000' }))
vi.mock('../../api/client.js', () => ({
  getToken: vi.fn(() => 'test-token'),
  req: vi.fn(),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  initAuth: vi.fn(),
  tokenIsValid: vi.fn(() => true),
}))

import { getToken } from '../../api/client.js'
import { usePlatformSocket } from '../../hooks/usePlatformSocket.js'

describe('usePlatformSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSocket.on.mockClear()
    mockSocket.off.mockClear()
    mockSocket.disconnect.mockClear()
    mockIo.mockClear()
    getToken.mockReturnValue('test-token')
    mockIo.mockReturnValue(mockSocket)
  })

  it('creates a socket connection to /platform namespace when token present', () => {
    renderHook(() => usePlatformSocket(vi.fn()))
    expect(mockIo).toHaveBeenCalledWith(
      'http://localhost:5000/platform',
      expect.objectContaining({ auth: { token: 'test-token' } })
    )
  })

  it('registers connect, disconnect, and application:stageChanged listeners', () => {
    renderHook(() => usePlatformSocket(vi.fn()))
    const events = mockSocket.on.mock.calls.map(c => c[0])
    expect(events).toContain('connect')
    expect(events).toContain('disconnect')
    expect(events).toContain('application:stageChanged')
  })

  it('calls onStageChanged callback when application:stageChanged fires', () => {
    const cb = vi.fn()
    renderHook(() => usePlatformSocket(cb))
    const stageCall = mockSocket.on.mock.calls.find(c => c[0] === 'application:stageChanged')
    expect(stageCall).toBeDefined()
    stageCall[1]({ appId: 'a1', stage: 'Interview' })
    expect(cb).toHaveBeenCalledWith({ appId: 'a1', stage: 'Interview' })
  })

  it('sets window.__tnPlatformWsConnected = true on connect event', () => {
    renderHook(() => usePlatformSocket(vi.fn()))
    const connectCall = mockSocket.on.mock.calls.find(c => c[0] === 'connect')
    connectCall[1]()
    expect(window.__tnPlatformWsConnected).toBe(true)
  })

  it('sets window.__tnPlatformWsConnected = false on disconnect event', () => {
    window.__tnPlatformWsConnected = true
    renderHook(() => usePlatformSocket(vi.fn()))
    const disconnectCall = mockSocket.on.mock.calls.find(c => c[0] === 'disconnect')
    disconnectCall[1]()
    expect(window.__tnPlatformWsConnected).toBe(false)
  })

  it('does NOT create socket when no token present', () => {
    getToken.mockReturnValue(null)
    renderHook(() => usePlatformSocket(vi.fn()))
    expect(mockIo).not.toHaveBeenCalled()
  })

  it('disconnects socket and removes stageChanged listener on unmount', () => {
    const { unmount } = renderHook(() => usePlatformSocket(vi.fn()))
    unmount()
    expect(mockSocket.off).toHaveBeenCalledWith('application:stageChanged')
    expect(mockSocket.disconnect).toHaveBeenCalled()
  })

  it('sets window.__tnPlatformWsConnected = false on unmount', () => {
    window.__tnPlatformWsConnected = true
    const { unmount } = renderHook(() => usePlatformSocket(vi.fn()))
    unmount()
    expect(window.__tnPlatformWsConnected).toBe(false)
  })

  it('uses websocket and polling transports', () => {
    renderHook(() => usePlatformSocket(vi.fn()))
    expect(mockIo).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ transports: ['websocket', 'polling'] })
    )
  })

  it('always uses the latest callback via cbRef — no extra socket connections on rerender', () => {
    const cb1 = vi.fn()
    const cb2 = vi.fn()
    const { rerender } = renderHook(({ cb }) => usePlatformSocket(cb), { initialProps: { cb: cb1 } })
    expect(mockIo).toHaveBeenCalledTimes(1)
    rerender({ cb: cb2 })
    expect(mockIo).toHaveBeenCalledTimes(1)  // still only one connection
    const stageCall = mockSocket.on.mock.calls.find(c => c[0] === 'application:stageChanged')
    stageCall[1]({ appId: 'a2' })
    expect(cb1).not.toHaveBeenCalled()
    expect(cb2).toHaveBeenCalledWith({ appId: 'a2' })
  })
})
