import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Badge from '../../../components/ui/Badge.jsx'

describe('Badge', () => {
  it('renders the provided label text', () => {
    render(<Badge label="Active" />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('uses the default blue (#0176D3) color', () => {
    const { container } = render(<Badge label="Default" />)
    const span = container.querySelector('span')
    // jsdom normalises #0176D3 → rgb(1, 118, 211)
    expect(span.style.color).toMatch(/0176D3|rgb\(1,\s*118,\s*211\)/i)
  })

  it('applies a custom color when provided', () => {
    const { container } = render(<Badge label="Success" color="#10B981" />)
    const span = container.querySelector('span')
    // jsdom normalises #10B981 → rgb(16, 185, 129)
    expect(span.style.color).toMatch(/10B981|rgb\(16,\s*185,\s*129\)/i)
  })

  it('renders as an inline span with nowrap', () => {
    const { container } = render(<Badge label="Tag" />)
    const span = container.querySelector('span')
    expect(span.style.whiteSpace).toBe('nowrap')
  })

  it('renders empty label without crashing', () => {
    expect(() => render(<Badge label="" />)).not.toThrow()
  })
})
