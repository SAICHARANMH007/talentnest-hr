import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Toggle from '../../../components/ui/Toggle.jsx'

describe('Toggle', () => {
  it('renders a hidden checkbox', () => {
    const { container } = render(<Toggle checked={false} onChange={vi.fn()} />)
    const cb = container.querySelector('input[type="checkbox"]')
    expect(cb).not.toBeNull()
  })

  it('reflects checked=true on the underlying checkbox', () => {
    const { container } = render(<Toggle checked={true} onChange={vi.fn()} />)
    const cb = container.querySelector('input[type="checkbox"]')
    expect(cb.checked).toBe(true)
  })

  it('reflects checked=false on the underlying checkbox', () => {
    const { container } = render(<Toggle checked={false} onChange={vi.fn()} />)
    const cb = container.querySelector('input[type="checkbox"]')
    expect(cb.checked).toBe(false)
  })

  it('calls onChange with true when toggled from off to on', () => {
    const onChange = vi.fn()
    const { container } = render(<Toggle checked={false} onChange={onChange} />)
    const cb = container.querySelector('input[type="checkbox"]')
    fireEvent.click(cb)
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('calls onChange with false when toggled from on to off', () => {
    const onChange = vi.fn()
    const { container } = render(<Toggle checked={true} onChange={onChange} />)
    const cb = container.querySelector('input[type="checkbox"]')
    fireEvent.click(cb)
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('does NOT call onChange when disabled', () => {
    const onChange = vi.fn()
    const { container } = render(<Toggle checked={false} onChange={onChange} disabled />)
    const cb = container.querySelector('input[type="checkbox"]')
    fireEvent.click(cb)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('applies not-allowed cursor when disabled', () => {
    const { container } = render(<Toggle checked={false} onChange={vi.fn()} disabled />)
    const label = container.querySelector('label')
    expect(label.style.cursor).toBe('not-allowed')
  })

  it('renders a label text when the label prop is provided', () => {
    render(<Toggle checked={false} onChange={vi.fn()} label="Enable feature" />)
    expect(screen.getByText('Enable feature')).toBeInTheDocument()
  })

  it('renders without label text when label prop is omitted', () => {
    const { container } = render(<Toggle checked={false} onChange={vi.fn()} />)
    expect(container.querySelector('span')).toBeNull()
  })

  it('uses green background when checked', () => {
    const { container } = render(<Toggle checked={true} onChange={vi.fn()} />)
    // jsdom normalises #10B981 → rgb(16, 185, 129)
    const track = container.querySelector('div > div')
    expect(track.style.backgroundColor).toMatch(/10B981|rgb\(16,\s*185,\s*129\)/i)
  })

  it('uses grey background when unchecked', () => {
    const { container } = render(<Toggle checked={false} onChange={vi.fn()} />)
    // jsdom normalises #CBD5E1 → rgb(203, 213, 225)
    const track = container.querySelector('div > div')
    expect(track.style.backgroundColor).toMatch(/CBD5E1|rgb\(203,\s*213,\s*225\)/i)
  })
})
