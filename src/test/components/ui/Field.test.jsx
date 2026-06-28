import React, { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import Field from '../../../components/ui/Field.jsx'

// Helper: controlled wrapper so onChange wires up
function Controlled({ initialValue = '', ...props }) {
  const [v, setV] = useState(initialValue)
  return <Field {...props} value={v} onChange={setV} />
}

describe('Field — label and required', () => {
  it('renders a label when the label prop is given', () => {
    render(<Field label="Full Name" value="" onChange={vi.fn()} />)
    expect(screen.getByText('Full Name')).toBeInTheDocument()
  })

  it('renders a required asterisk when required=true', () => {
    const { container } = render(<Field label="Email" value="" onChange={vi.fn()} required />)
    const asterisk = container.querySelector('label span')
    expect(asterisk).toBeInTheDocument()
    expect(asterisk.textContent).toBe('*')
  })

  it('does not render an asterisk without the required prop', () => {
    const { container } = render(<Field label="Email" value="" onChange={vi.fn()} />)
    const label = container.querySelector('label')
    expect(label.textContent).toBe('Email')
  })
})

describe('Field — text input', () => {
  it('renders an <input> by default', () => {
    const { container } = render(<Field value="" onChange={vi.fn()} />)
    expect(container.querySelector('input')).not.toBeNull()
  })

  it('displays the provided value', () => {
    render(<Field label="Name" value="Alice" onChange={vi.fn()} />)
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument()
  })

  it('calls onChange when the user types', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Field label="Name" value="" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    await user.type(input, 'A')
    expect(onChange).toHaveBeenCalledWith('A', expect.any(Object))
  })

  it('renders an input of type=email when type="email"', () => {
    const { container } = render(<Field type="email" value="" onChange={vi.fn()} />)
    expect(container.querySelector('input[type="email"]')).not.toBeNull()
  })

  it('renders an input of type=password when type="password"', () => {
    const { container } = render(<Field type="password" value="" onChange={vi.fn()} />)
    expect(container.querySelector('input[type="password"]')).not.toBeNull()
  })

  it('applies disabled styles when disabled=true', () => {
    const { container } = render(<Field value="" onChange={vi.fn()} disabled />)
    const input = container.querySelector('input')
    expect(input).toBeDisabled()
  })
})

describe('Field — textarea', () => {
  it('renders a <textarea> when rows prop is given', () => {
    const { container } = render(<Field label="Bio" value="" onChange={vi.fn()} rows={4} />)
    expect(container.querySelector('textarea')).not.toBeNull()
  })

  it('user can type into textarea', async () => {
    const user = userEvent.setup()
    render(<Controlled label="Bio" rows={3} />)
    const ta = screen.getByRole('textbox')
    await user.type(ta, 'Hello world')
    expect(ta.value).toBe('Hello world')
  })
})

describe('Field — select', () => {
  const options = [
    { value: 'admin', label: 'Admin' },
    { value: 'recruiter', label: 'Recruiter' },
  ]

  it('renders a <select> when options prop is given', () => {
    const { container } = render(<Field label="Role" value="" onChange={vi.fn()} options={options} />)
    expect(container.querySelector('select')).not.toBeNull()
  })

  it('renders all provided options', () => {
    render(<Field label="Role" value="" onChange={vi.fn()} options={options} />)
    expect(screen.getByRole('option', { name: 'Admin' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Recruiter' })).toBeInTheDocument()
  })

  it('renders a placeholder option when placeholder is given', () => {
    render(
      <Field label="Role" value="" onChange={vi.fn()} options={options} placeholder="Select role" />
    )
    expect(screen.getByRole('option', { name: 'Select role' })).toBeInTheDocument()
  })

  it('calls onChange with the selected value', () => {
    const onChange = vi.fn()
    render(<Field label="Role" value="" onChange={onChange} options={options} />)
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'recruiter' } })
    expect(onChange).toHaveBeenCalledWith('recruiter', expect.any(Object))
  })
})

describe('Field — error and hint', () => {
  it('shows an error message when error prop is set', () => {
    render(<Field label="Email" value="" onChange={vi.fn()} error="Invalid email" />)
    expect(screen.getByText(/Invalid email/)).toBeInTheDocument()
  })

  it('shows a hint when hint prop is set (no error)', () => {
    render(<Field label="Email" value="" onChange={vi.fn()} hint="Use your work email" />)
    expect(screen.getByText('Use your work email')).toBeInTheDocument()
  })

  it('does not show hint when error is also present', () => {
    render(
      <Field label="Email" value="" onChange={vi.fn()} error="Required" hint="Use work email" />
    )
    expect(screen.queryByText('Use work email')).toBeNull()
    expect(screen.getByText(/Required/)).toBeInTheDocument()
  })
})

describe('Field — focus styles', () => {
  it('focuses and blurs without throwing', () => {
    render(<Field label="Name" value="" onChange={vi.fn()} />)
    const input = screen.getByRole('textbox')
    expect(() => { fireEvent.focus(input); fireEvent.blur(input) }).not.toThrow()
  })
})
