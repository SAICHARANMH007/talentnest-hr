import '@testing-library/jest-dom'
import { vi } from 'vitest'

// jsdom does not implement matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// jsdom does not implement ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Suppress known noisy React act() warnings
const _origError = console.error
beforeEach(() => {
  console.error = (...args) => {
    const msg = String(args[0] ?? '')
    if (
      msg.includes('Warning: An update to') ||
      msg.includes('Warning: ReactDOM.render') ||
      msg.includes('act(...)')
    ) return
    _origError(...args)
  }
})
afterEach(() => {
  console.error = _origError
})
