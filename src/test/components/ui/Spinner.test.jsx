import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Spinner from '../../../components/ui/Spinner.jsx'

describe('Spinner', () => {
  it('renders without crashing', () => {
    render(<Spinner />)
  })

  it('renders the rotating symbol', () => {
    const { container } = render(<Spinner />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('applies a spin animation style', () => {
    const { container } = render(<Spinner />)
    const span = container.querySelector('span')
    expect(span).not.toBeNull()
    expect(span.style.animation).toContain('spin')
  })
})
