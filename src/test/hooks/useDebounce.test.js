import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useDebounce } from '../../hooks/useDebounce.js'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('useDebounce', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300))
    expect(result.current).toBe('hello')
  })

  it('does not update the value before the delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    )
    rerender({ value: 'updated' })
    // No time has passed — still old value
    expect(result.current).toBe('initial')
  })

  it('updates the value after the delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    )
    rerender({ value: 'updated' })
    act(() => { vi.advanceTimersByTime(300) })
    expect(result.current).toBe('updated')
  })

  it('resets the timer on each value change (leading-edge suppression)', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    )
    // Type fast: a → b → c within the window
    rerender({ value: 'b' })
    act(() => { vi.advanceTimersByTime(200) })
    rerender({ value: 'c' })
    act(() => { vi.advanceTimersByTime(200) })
    // 400ms total but c was entered at 200ms, so delay hasn't elapsed for c yet
    expect(result.current).toBe('a')
    act(() => { vi.advanceTimersByTime(100) })
    // Now 300ms after last change (c) → c should appear
    expect(result.current).toBe('c')
  })

  it('uses the default delay of 300 ms when no delay is given', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'x' } }
    )
    rerender({ value: 'y' })
    act(() => { vi.advanceTimersByTime(299) })
    expect(result.current).toBe('x')
    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current).toBe('y')
  })

  it('handles numeric values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 0 } }
    )
    rerender({ value: 42 })
    act(() => { vi.advanceTimersByTime(100) })
    expect(result.current).toBe(42)
  })

  it('handles object values by reference', () => {
    const obj1 = { id: 1 }
    const obj2 = { id: 2 }
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: obj1 } }
    )
    rerender({ value: obj2 })
    act(() => { vi.advanceTimersByTime(200) })
    expect(result.current).toBe(obj2)
  })

  it('cleans up the timer on unmount (no state-update warning)', () => {
    const { rerender, unmount } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    )
    rerender({ value: 'new' })
    unmount()
    // Timer fires after unmount — should not throw
    expect(() => { act(() => { vi.advanceTimersByTime(300) }) }).not.toThrow()
  })
})
