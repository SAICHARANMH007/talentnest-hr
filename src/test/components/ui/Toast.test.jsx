import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Toast from '../../../components/ui/Toast.jsx'

describe('Toast', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('renders nothing when msg is empty/null', () => {
    const { container } = render(<Toast msg="" onClose={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the message text', () => {
    render(<Toast msg="Operation successful" onClose={vi.fn()} />)
    expect(screen.getByText('Operation successful')).toBeInTheDocument()
  })

  it('calls onClose after 3500 ms', () => {
    const onClose = vi.fn()
    render(<Toast msg="Hello" onClose={onClose} />)
    expect(onClose).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(3500) })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when the × button is clicked', () => {
    const onClose = vi.fn()
    render(<Toast msg="Press X" onClose={onClose} />)
    fireEvent.click(screen.getByText('✕'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('uses error background for ❌-prefixed messages', () => {
    const { container } = render(<Toast msg="❌ Something went wrong" onClose={vi.fn()} />)
    const toastEl = container.querySelector('.tn-toast-wrap')
    // jsdom may add spaces: "rgba(186, 5, 23, 0.95)"
    expect(toastEl.style.background).toMatch(/186,?\s*5,?\s*23/)
  })

  it('uses success background for ✅-prefixed messages', () => {
    const { container } = render(<Toast msg="✅ Saved successfully" onClose={vi.fn()} />)
    const toastEl = container.querySelector('.tn-toast-wrap')
    expect(toastEl.style.background).toMatch(/46,?\s*132,?\s*74/)
  })

  it('uses info (blue) background for plain messages', () => {
    const { container } = render(<Toast msg="FYI: something happened" onClose={vi.fn()} />)
    const toastEl = container.querySelector('.tn-toast-wrap')
    expect(toastEl.style.background).toMatch(/1,?\s*118,?\s*211/)
  })

  it('does not call onClose when msg changes from non-empty to empty', () => {
    const onClose = vi.fn()
    const { rerender } = render(<Toast msg="Hello" onClose={onClose} />)
    rerender(<Toast msg="" onClose={onClose} />)
    act(() => { vi.advanceTimersByTime(5000) })
    // timer was cleared because msg became falsy — onClose should NOT have been called by the timer
    // (it may or may not be called from the explicit "" rerender; the component returns null early)
    // The key invariant: no timer-based onClose fires after msg becomes empty
    expect(onClose).not.toHaveBeenCalled()
  })
})
