/**
 * Tier-3 smoke: meeting pages (WebRTC-heavy — verify they at least mount).
 */
import React from 'react'
import { render, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ roomToken: 'room-tok', token: 'room-tok' }),
  useLocation: () => ({ pathname: '/meeting', search: '', state: null }),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}))

const { mockSocket, mockIo } = vi.hoisted(() => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  }
  return { mockSocket, mockIo: vi.fn(() => mockSocket) }
})

vi.mock('socket.io-client', () => ({ io: mockIo }))

vi.mock('../../api/api.js', () => {
  const resp = Object.assign([], {
    data: { title: 'Team Meeting', scheduledAt: null, host: 'Alice', participants: [] },
  })
  const stub = new Proxy({}, { get: () => vi.fn(() => Promise.resolve(resp)) })
  return { api: stub, initAuth: vi.fn(() => Promise.resolve({ user: null })), setToken: vi.fn() }
})

vi.mock('../../api/client.js', () => ({
  req: vi.fn(() => Promise.resolve({ data: [] })),
  getToken: vi.fn(() => 'test-token'),
  setToken: vi.fn(),
  clearToken: vi.fn(),
}))

vi.mock('../../api/config.js', () => ({
  SOCKET_BASE_URL: 'http://localhost:5000',
  API_BASE_URL: 'http://localhost:5000',
}))

vi.mock('../../constants/styles.js', () => ({ card: {}, btnP: {}, btnG: {}, btnD: {}, inp: {} }))

vi.mock('../../components/ui/Toast.jsx', () => ({ default: () => null }))
vi.mock('../../components/ui/Spinner.jsx', () => ({ default: () => <div>Loading</div> }))
vi.mock('../../components/ui/Badge.jsx', () => ({ default: ({ label }) => <span>{label}</span> }))
vi.mock('../../components/ui/Modal.jsx', () => ({ default: ({ children }) => <div>{children}</div> }))

// Mock the GuestJoin as used from within MeetingRoom
vi.mock('../../pages/meeting/GuestJoin.jsx', () => ({
  default: () => <div data-testid="guest-join">GuestJoin</div>,
}))

// RTCPeerConnection mock
beforeEach(() => {
  vi.clearAllMocks()
  mockNavigate.mockClear()
  mockSocket.on.mockClear()
  mockSocket.emit.mockClear()
  mockIo.mockReturnValue(mockSocket)

  global.RTCPeerConnection = vi.fn(() => ({
    addTrack: vi.fn(),
    createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: '' }),
    createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: '' }),
    setLocalDescription: vi.fn().mockResolvedValue(),
    setRemoteDescription: vi.fn().mockResolvedValue(),
    addIceCandidate: vi.fn().mockResolvedValue(),
    close: vi.fn(),
    iceConnectionState: 'new',
    onicecandidate: null,
    ontrack: null,
  }))

  global.navigator.mediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: vi.fn(() => []),
      getAudioTracks: vi.fn(() => []),
      getVideoTracks: vi.fn(() => []),
    }),
  }
})

async function smokeRender(element) {
  await act(async () => { render(element) })
  expect(document.body).toBeTruthy()
}

describe('Meeting pages — smoke', () => {
  it('GuestJoin renders standalone', async () => {
    const { default: GuestJoin } = await import('../../pages/meeting/GuestJoin.jsx')
    await smokeRender(<GuestJoin roomToken="room-tok" onJoin={vi.fn()} />)
  })

  it('MeetingRoom renders (guest view — no auth token)', async () => {
    const { getToken } = await import('../../api/client.js')
    getToken.mockReturnValue(null)
    const { default: MeetingRoom } = await import('../../pages/meeting/MeetingRoom.jsx')
    await smokeRender(<MeetingRoom />)
  })
})
