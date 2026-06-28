import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import useWebRTC from '../../hooks/useWebRTC.js'

// Mock RTCPeerConnection and navigator.mediaDevices globally
const mockStream = {
  getTracks: vi.fn(() => [
    { kind: 'audio', enabled: true, stop: vi.fn() },
    { kind: 'video', enabled: true, stop: vi.fn() },
  ]),
  getAudioTracks: vi.fn(() => [{ enabled: true }]),
  getVideoTracks: vi.fn(() => [{ enabled: true }]),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockStream.getTracks.mockReturnValue([
    { kind: 'audio', enabled: true, stop: vi.fn() },
    { kind: 'video', enabled: true, stop: vi.fn() },
  ])
  mockStream.getAudioTracks.mockReturnValue([{ enabled: true }])
  mockStream.getVideoTracks.mockReturnValue([{ enabled: true }])

  global.navigator.mediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue(mockStream),
  }

  global.RTCPeerConnection = vi.fn().mockImplementation(() => ({
    addTrack: vi.fn(),
    createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'sdp' }),
    createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'sdp' }),
    setLocalDescription: vi.fn().mockResolvedValue(),
    setRemoteDescription: vi.fn().mockResolvedValue(),
    addIceCandidate: vi.fn().mockResolvedValue(),
    close: vi.fn(),
    iceConnectionState: 'new',
    onicecandidate: null,
    ontrack: null,
    onconnectionstatechange: null,
  }))
})

afterEach(() => {
  delete global.RTCPeerConnection
})

describe('useWebRTC', () => {
  it('returns expected shape', () => {
    const { result } = renderHook(() => useWebRTC())
    expect(result.current).toHaveProperty('localStream')
    expect(result.current).toHaveProperty('micOn')
    expect(result.current).toHaveProperty('camOn')
    expect(result.current).toHaveProperty('permError')
    expect(typeof result.current.startLocalMedia).toBe('function')
    expect(typeof result.current.toggleMic).toBe('function')
    expect(typeof result.current.toggleCam).toBe('function')
    expect(typeof result.current.stopAll).toBe('function')
    expect(typeof result.current.initiateCall).toBe('function')
    expect(typeof result.current.handleOffer).toBe('function')
    expect(typeof result.current.handleAnswer).toBe('function')
    expect(typeof result.current.handleIce).toBe('function')
    expect(typeof result.current.closePeer).toBe('function')
  })

  it('initial state: localStream null, micOn true, camOn true, permError empty', () => {
    const { result } = renderHook(() => useWebRTC())
    expect(result.current.localStream).toBeNull()
    expect(result.current.micOn).toBe(true)
    expect(result.current.camOn).toBe(true)
    expect(result.current.permError).toBe('')
  })

  it('camOn defaults to false when video option is false', () => {
    const { result } = renderHook(() => useWebRTC({ video: false }))
    expect(result.current.camOn).toBe(false)
  })

  it('startLocalMedia calls getUserMedia and sets localStream', async () => {
    const { result } = renderHook(() => useWebRTC())
    await act(async () => { await result.current.startLocalMedia(true) })
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled()
    expect(result.current.localStream).toBe(mockStream)
  })

  it('startLocalMedia with wantVideo=false does not request video', async () => {
    const { result } = renderHook(() => useWebRTC())
    await act(async () => { await result.current.startLocalMedia(false) })
    const callArgs = navigator.mediaDevices.getUserMedia.mock.calls[0][0]
    expect(callArgs.video).toBeFalsy()
  })

  it('sets permError when getUserMedia is denied', async () => {
    navigator.mediaDevices.getUserMedia = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('denied'), { name: 'NotAllowedError' }))
      .mockRejectedValueOnce(Object.assign(new Error('denied'), { name: 'NotAllowedError' }))
      .mockRejectedValueOnce(Object.assign(new Error('denied'), { name: 'NotAllowedError' }))
    const { result } = renderHook(() => useWebRTC())
    await act(async () => { await result.current.startLocalMedia(true) })
    expect(result.current.permError).toBeTruthy()
  })

  it('toggleMic does not throw when no stream', () => {
    const { result } = renderHook(() => useWebRTC())
    expect(() => { act(() => { result.current.toggleMic() }) }).not.toThrow()
  })

  it('toggleCam does not throw when no stream', () => {
    const { result } = renderHook(() => useWebRTC())
    expect(() => { act(() => { result.current.toggleCam() }) }).not.toThrow()
  })

  it('stopAll does not throw when called without any active connections', () => {
    const { result } = renderHook(() => useWebRTC())
    expect(() => { act(() => { result.current.stopAll() }) }).not.toThrow()
  })

  it('closePeer does not throw for non-existent socket id', () => {
    const { result } = renderHook(() => useWebRTC())
    expect(() => { act(() => { result.current.closePeer('nonexistent') }) }).not.toThrow()
  })

  it('unmounts without crash', async () => {
    const { result, unmount } = renderHook(() => useWebRTC())
    await act(async () => { await result.current.startLocalMedia(true) })
    expect(() => unmount()).not.toThrow()
  })

  it('stopAll stops all tracks', async () => {
    const mockTrack = { stop: vi.fn(), kind: 'audio', enabled: true }
    mockStream.getTracks.mockReturnValue([mockTrack])
    const { result } = renderHook(() => useWebRTC())
    await act(async () => { await result.current.startLocalMedia(true) })
    act(() => { result.current.stopAll() })
    expect(mockTrack.stop).toHaveBeenCalled()
  })
})
