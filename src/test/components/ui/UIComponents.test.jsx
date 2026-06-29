import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── react-router-dom mock (QuickActionMenu uses useNavigate) ──────────────────
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to }) => React.createElement('a', { href: to }, children),
}))

// ── api mock (not strictly required but guards against leaking calls) ─────────
vi.mock('../../../api/api.js', () => ({
  api: {},
}))

// ── constants/styles mock ─────────────────────────────────────────────────────
vi.mock('../../../constants/styles.js', () => ({
  card:  { background: '#fff', borderRadius: 12, padding: 20 },
  btnP:  { background: '#0176D3', color: '#fff' },
  btnG:  { background: '#f1f5f9' },
  inp:   { border: '1px solid #E2E8F0', borderRadius: 8 },
}))

// ── sub-component mocks ───────────────────────────────────────────────────────
vi.mock('../../../components/ui/Field.jsx', () => ({
  default: ({ label, value, onChange, options, placeholder }) => {
    if (options) {
      return (
        <div data-testid="field-select">
          <label>{label}</label>
          <select aria-label={label} value={value ?? ''} onChange={e => onChange?.(e.target.value)}>
            {options.map(o => {
              const v = typeof o === 'string' ? o : o.value
              const l = typeof o === 'string' ? o : o.label
              return <option key={v} value={v}>{l}</option>
            })}
          </select>
        </div>
      )
    }
    return (
      <div data-testid="field">
        <label>{label}</label>
        <input aria-label={label} value={value ?? ''} onChange={e => onChange?.(e.target.value)} placeholder={placeholder || ''} />
      </div>
    )
  },
}))

vi.mock('../../../components/ui/Spinner.jsx', () => ({
  default: () => <span data-testid="spinner">…</span>,
}))

vi.mock('../../../components/ui/Toast.jsx', () => ({
  default: ({ msg, onClose }) =>
    msg ? <div data-testid="toast" onClick={onClose}>{msg}</div> : null,
}))

// ── imports after mocks ───────────────────────────────────────────────────────
import Dropdown        from '../../../components/ui/Dropdown.jsx'
import FormRow         from '../../../components/ui/FormRow.jsx'
import PageHeader      from '../../../components/ui/PageHeader.jsx'
import QuickActionMenu from '../../../components/ui/QuickActionMenu.jsx'
import Skeleton        from '../../../components/ui/Skeleton.jsx'
import UploadZone      from '../../../components/ui/UploadZone.jsx'
import OnlineDot       from '../../../components/ui/OnlineDot.jsx'
import CapLimitBanner  from '../../../components/ui/CapLimitBanner.jsx'

// ═════════════════════════════════════════════════════════════════════════════
// Dropdown
// ═════════════════════════════════════════════════════════════════════════════
describe('Dropdown', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ]

  it('renders without crashing with minimal props', () => {
    const { container } = render(
      <Dropdown label="Test" value="" onChange={vi.fn()} options={options} />
    )
    expect(container.firstChild).not.toBeNull()
  })

  it('renders the label text', () => {
    render(<Dropdown label="Department" value="" onChange={vi.fn()} options={options} />)
    expect(screen.getByText('Department')).toBeInTheDocument()
  })

  it('calls onChange when an option is selected', () => {
    const onChange = vi.fn()
    render(<Dropdown label="Role" value="a" onChange={onChange} options={options} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } })
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('renders all options', () => {
    render(<Dropdown label="Pick" value="" onChange={vi.fn()} options={options} />)
    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.getByText('Option B')).toBeInTheDocument()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// FormRow
// ═════════════════════════════════════════════════════════════════════════════
describe('FormRow', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <FormRow><div>Field 1</div><div>Field 2</div></FormRow>
    )
    expect(container.firstChild).not.toBeNull()
  })

  it('renders children', () => {
    render(
      <FormRow>
        <div>First Name</div>
        <div>Last Name</div>
      </FormRow>
    )
    expect(screen.getByText('First Name')).toBeInTheDocument()
    expect(screen.getByText('Last Name')).toBeInTheDocument()
  })

  it('applies the tn-form-row class', () => {
    const { container } = render(<FormRow><div>A</div></FormRow>)
    expect(container.firstChild.className).toContain('tn-form-row')
  })

  it('applies grid display style', () => {
    const { container } = render(<FormRow><div>A</div></FormRow>)
    expect(container.firstChild.style.display).toBe('grid')
  })

  it('accepts custom cols and gap', () => {
    const { container } = render(<FormRow cols={3} gap={20}><div>A</div></FormRow>)
    expect(container.firstChild.className).toContain('tn-form-row-3')
    expect(container.firstChild.style.gap).toBe('20px')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// PageHeader
// ═════════════════════════════════════════════════════════════════════════════
describe('PageHeader', () => {
  it('renders without crashing', () => {
    const { container } = render(<PageHeader title="Dashboard" />)
    expect(container.firstChild).not.toBeNull()
  })

  it('renders the title', () => {
    render(<PageHeader title="Recruitment Pipeline" />)
    expect(screen.getByText('Recruitment Pipeline')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(<PageHeader title="Jobs" subtitle="Manage all open positions" />)
    expect(screen.getByText('Manage all open positions')).toBeInTheDocument()
  })

  it('does not render subtitle element when subtitle is omitted', () => {
    render(<PageHeader title="Jobs" />)
    expect(screen.queryByText(/Manage/)).not.toBeInTheDocument()
  })

  it('renders action element when provided', () => {
    render(<PageHeader title="Jobs" action={<button>Add Job</button>} />)
    expect(screen.getByText('Add Job')).toBeInTheDocument()
  })

  it('renders title in an h2 element', () => {
    render(<PageHeader title="My Page" />)
    const h2 = document.querySelector('h2')
    expect(h2).not.toBeNull()
    expect(h2.textContent).toBe('My Page')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// QuickActionMenu
// ═════════════════════════════════════════════════════════════════════════════
describe('QuickActionMenu', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('renders nothing when user is null', () => {
    const { container } = render(<QuickActionMenu user={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when user role is candidate', () => {
    const { container } = render(<QuickActionMenu user={{ role: 'candidate' }} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the FAB button for recruiter role', () => {
    render(<QuickActionMenu user={{ role: 'recruiter' }} />)
    const fabBtn = screen.getByTitle('Quick Actions')
    expect(fabBtn).toBeInTheDocument()
  })

  it('renders the FAB button for admin role', () => {
    render(<QuickActionMenu user={{ role: 'admin' }} />)
    expect(screen.getByTitle('Quick Actions')).toBeInTheDocument()
  })

  it('opens menu when FAB is clicked', () => {
    render(<QuickActionMenu user={{ role: 'recruiter' }} />)
    fireEvent.click(screen.getByTitle('Quick Actions'))
    expect(screen.getByText(/Add Candidate/i)).toBeInTheDocument()
  })

  it('shows Post Job button for recruiter when menu is open', () => {
    render(<QuickActionMenu user={{ role: 'recruiter' }} />)
    fireEvent.click(screen.getByTitle('Quick Actions'))
    expect(screen.getByText(/Post Job/i)).toBeInTheDocument()
  })

  it('navigates to add-candidate when Add Candidate is clicked', () => {
    render(<QuickActionMenu user={{ role: 'recruiter' }} />)
    fireEvent.click(screen.getByTitle('Quick Actions'))
    fireEvent.click(screen.getByText(/Add Candidate/i))
    expect(mockNavigate).toHaveBeenCalledWith('/app/add-candidate')
  })

  it('navigates to jobs/create when Post Job is clicked', () => {
    render(<QuickActionMenu user={{ role: 'admin' }} />)
    fireEvent.click(screen.getByTitle('Quick Actions'))
    fireEvent.click(screen.getByText(/Post Job/i))
    expect(mockNavigate).toHaveBeenCalledWith('/app/jobs/create')
  })

  it('closes menu after clicking Add Candidate', () => {
    render(<QuickActionMenu user={{ role: 'recruiter' }} />)
    fireEvent.click(screen.getByTitle('Quick Actions'))
    fireEvent.click(screen.getByText(/Add Candidate/i))
    expect(screen.queryByText(/Post Job/i)).not.toBeInTheDocument()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// Skeleton
// ═════════════════════════════════════════════════════════════════════════════
describe('Skeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).not.toBeNull()
  })

  it('renders with tn-shimmer class', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild.className).toContain('tn-shimmer')
  })

  it('has aria-hidden="true" for accessibility', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild.getAttribute('aria-hidden')).toBe('true')
  })

  it('applies circle border-radius for circle variant', () => {
    const { container } = render(<Skeleton variant="circle" width="40px" height="40px" />)
    expect(container.firstChild.style.borderRadius).toBe('50%')
  })

  it('applies width and height props', () => {
    const { container } = render(<Skeleton width="200px" height="20px" />)
    expect(container.firstChild.style.width).toBe('200px')
    expect(container.firstChild.style.height).toBe('20px')
  })

  it('defaults to 100% width when width is not specified', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild.style.width).toBe('100%')
  })

  it('applies text height for text variant', () => {
    const { container } = render(<Skeleton variant="text" />)
    expect(container.firstChild.style.height).toBe('12px')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// UploadZone
// ═════════════════════════════════════════════════════════════════════════════
describe('UploadZone', () => {
  it('renders without crashing', () => {
    const { container } = render(<UploadZone label="Upload Resume" onFile={vi.fn()} />)
    expect(container.firstChild).not.toBeNull()
  })

  it('shows the label text in idle state', () => {
    render(<UploadZone label="Upload Resume" onFile={vi.fn()} />)
    expect(screen.getByText('Upload Resume')).toBeInTheDocument()
  })

  it('shows PDF or Image hint in idle state', () => {
    render(<UploadZone label="Upload File" onFile={vi.fn()} />)
    expect(screen.getByText(/PDF or Image/i)).toBeInTheDocument()
  })

  it('shows Extracting text in loading state', () => {
    render(<UploadZone label="Upload" onFile={vi.fn()} loading={true} />)
    expect(screen.getByText(/Extracting/i)).toBeInTheDocument()
  })

  it('shows fileName and Click to replace when a file is already selected', () => {
    render(<UploadZone label="Upload" onFile={vi.fn()} fileName="resume.pdf" />)
    expect(screen.getByText('resume.pdf')).toBeInTheDocument()
    expect(screen.getByText(/Click to replace/i)).toBeInTheDocument()
  })

  it('calls onFile when a file is selected via input', () => {
    const onFile = vi.fn()
    const { container } = render(<UploadZone label="Upload" onFile={onFile} />)
    const input = container.querySelector('input[type="file"]')
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    Object.defineProperty(input, 'files', { value: [file] })
    fireEvent.change(input)
    expect(onFile).toHaveBeenCalledWith(file)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// OnlineDot
// ═════════════════════════════════════════════════════════════════════════════
describe('OnlineDot', () => {
  it('renders without crashing', () => {
    const { container } = render(<OnlineDot online={true} />)
    expect(container.firstChild).not.toBeNull()
  })

  it('has title "Online" when online is true', () => {
    const { container } = render(<OnlineDot online={true} />)
    expect(container.firstChild.title).toBe('Online')
  })

  it('has title "Offline" when online is false', () => {
    const { container } = render(<OnlineDot online={false} />)
    expect(container.firstChild.title).toBe('Offline')
  })

  it('applies green background when online', () => {
    const { container } = render(<OnlineDot online={true} />)
    expect(container.firstChild.style.background).toBe('rgb(34, 197, 94)')
  })

  it('applies grey background when offline', () => {
    const { container } = render(<OnlineDot online={false} />)
    expect(container.firstChild.style.background).toBe('rgb(209, 213, 219)')
  })

  it('respects the size prop', () => {
    const { container } = render(<OnlineDot online={true} size={14} />)
    expect(container.firstChild.style.width).toBe('14px')
    expect(container.firstChild.style.height).toBe('14px')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// CapLimitBanner
// ═════════════════════════════════════════════════════════════════════════════
describe('CapLimitBanner', () => {
  it('renders nothing when fetched is 0', () => {
    const { container } = render(
      <CapLimitBanner total={1000} fetched={0} entity="jobs" role="admin" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when total is 0', () => {
    const { container } = render(
      <CapLimitBanner total={0} fetched={500} entity="jobs" role="admin" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing for non-admin roles', () => {
    const { container } = render(
      <CapLimitBanner total={1000} fetched={1000} entity="jobs" role="recruiter" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing for candidate role', () => {
    const { container } = render(
      <CapLimitBanner total={1000} fetched={1000} entity="jobs" role="candidate" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows "Data limit reached" when fetched equals total', () => {
    render(<CapLimitBanner total={500} fetched={500} entity="jobs" role="admin" />)
    expect(screen.getByText(/Data limit reached/i)).toBeInTheDocument()
  })

  it('shows "Approaching data limit" when fetched >= 80% of total', () => {
    render(<CapLimitBanner total={1000} fetched={850} entity="candidates" role="admin" />)
    expect(screen.getByText(/Approaching data limit/i)).toBeInTheDocument()
  })

  it('shows entity name in the banner', () => {
    render(<CapLimitBanner total={500} fetched={500} entity="records" role="admin" />)
    expect(screen.getByText(/records/i)).toBeInTheDocument()
  })

  it('renders nothing when pct < 80%', () => {
    const { container } = render(
      <CapLimitBanner total={1000} fetched={500} entity="jobs" role="admin" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('dismisses banner when the ✕ button is clicked', () => {
    render(<CapLimitBanner total={500} fetched={500} entity="jobs" role="admin" />)
    expect(screen.getByText(/Data limit reached/i)).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Dismiss'))
    expect(screen.queryByText(/Data limit reached/i)).not.toBeInTheDocument()
  })

  it('shows super_admin specific URL hint for super_admin role', () => {
    render(<CapLimitBanner total={500} fetched={500} entity="jobs" role="super_admin" />)
    expect(screen.getByText(/\?limit=5000/)).toBeInTheDocument()
  })
})
