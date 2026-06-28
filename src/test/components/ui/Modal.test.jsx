import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Modal from '../../../components/ui/Modal.jsx'

describe('Modal', () => {
  it('renders the title text', () => {
    render(<Modal title="Confirm Action" onClose={vi.fn()}><p>Content</p></Modal>)
    expect(screen.getByText('Confirm Action')).toBeInTheDocument()
  })

  it('renders children inside the body', () => {
    render(<Modal title="Test" onClose={vi.fn()}><span data-testid="child">Hello</span></Modal>)
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('renders a close button with aria-label "Close"', () => {
    render(<Modal title="Test" onClose={vi.fn()}><p /></Modal>)
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('calls onClose when the × button is clicked', () => {
    const onClose = vi.fn()
    render(<Modal title="Test" onClose={onClose}><p /></Modal>)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('has role="dialog" and aria-modal="true"', () => {
    render(<Modal title="Test" onClose={vi.fn()}><p /></Modal>)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('renders a footer when the footer prop is provided', () => {
    render(
      <Modal title="Test" onClose={vi.fn()} footer={<button>Save</button>}>
        <p />
      </Modal>
    )
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('does not render footer section when footer prop is absent', () => {
    const { container } = render(<Modal title="Test" onClose={vi.fn()}><p /></Modal>)
    expect(container.querySelector('.tn-modal-footer')).toBeNull()
  })

  it('sets document body overflow to hidden while mounted', () => {
    render(<Modal title="Test" onClose={vi.fn()}><p /></Modal>)
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restores body overflow on unmount', () => {
    const { unmount } = render(<Modal title="Test" onClose={vi.fn()}><p /></Modal>)
    unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('renders via a portal (not inside the test container div)', () => {
    const wrapper = document.createElement('div')
    document.body.appendChild(wrapper)
    const { container } = render(
      <Modal title="Portal Check" onClose={vi.fn()}><p /></Modal>,
      { container: wrapper }
    )
    // The modal content should be in document.body directly, not inside wrapper
    expect(wrapper.querySelector('.tn-overlay')).toBeNull()
    expect(document.querySelector('.tn-overlay')).not.toBeNull()
    document.body.removeChild(wrapper)
  })
})
