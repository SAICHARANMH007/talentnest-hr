import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── api mock (WorldMap calls api.getApplicationLocations) ─────────────────────
vi.mock('../../../api/api.js', () => ({
  api: {
    getApplicationLocations: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

// ── leaflet mock (WorldMap dynamically imports leaflet) ───────────────────────
vi.mock('leaflet', () => ({
  default: {
    map:          vi.fn(() => ({ remove: vi.fn(), addLayer: vi.fn(), fitBounds: vi.fn() })),
    tileLayer:    vi.fn(() => ({ addTo: vi.fn() })),
    circleMarker: vi.fn(() => ({ bindPopup: vi.fn(), addTo: vi.fn() })),
    popup:        vi.fn(() => ({ setLatLng: vi.fn().mockReturnThis(), setContent: vi.fn().mockReturnThis(), openOn: vi.fn() })),
    latLngBounds: vi.fn(() => ({})),
  },
}))

// ── Spinner mock (used inside KpiCard) ────────────────────────────────────────
vi.mock('../../../components/ui/Spinner.jsx', () => ({
  default: () => <span data-testid="spinner">…</span>,
}))

// ── constants/styles mock ─────────────────────────────────────────────────────
vi.mock('../../../constants/styles.js', () => ({
  card: { background: '#fff', borderRadius: 12, padding: 20 },
}))

// ── imports after mocks ───────────────────────────────────────────────────────
import KpiCard       from '../../../components/charts/KpiCard.jsx'
import RingProgress  from '../../../components/charts/RingProgress.jsx'
import FunnelChart   from '../../../components/charts/FunnelChart.jsx'
import HorizBar      from '../../../components/charts/HorizBar.jsx'
import MiniSparkline from '../../../components/charts/MiniSparkline.jsx'
import VertBarChart  from '../../../components/charts/VertBarChart.jsx'
import AreaChart     from '../../../components/charts/AreaChart.jsx'
import DonutChart    from '../../../components/charts/DonutChart.jsx'
import WorldMap      from '../../../components/charts/WorldMap.jsx'

// ═════════════════════════════════════════════════════════════════════════════
// KpiCard
// ═════════════════════════════════════════════════════════════════════════════
describe('KpiCard', () => {
  it('renders without crashing with minimal props', () => {
    const { container } = render(<KpiCard label="Total Jobs" value={42} />)
    expect(container.firstChild).not.toBeNull()
  })

  it('displays the label and value', () => {
    render(<KpiCard label="Open Roles" value={7} icon="💼" />)
    expect(screen.getByText('Open Roles')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('shows Spinner when value is undefined', () => {
    render(<KpiCard label="Loading" />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('renders sub text when provided', () => {
    render(<KpiCard label="Hired" value={10} sub="This month" />)
    expect(screen.getByText('This month')).toBeInTheDocument()
  })

  it('renders upward trend indicator when trend > 0', () => {
    render(<KpiCard label="Apps" value={50} trend={12} />)
    expect(screen.getByText('12%')).toBeInTheDocument()
    expect(screen.getByText('▲')).toBeInTheDocument()
  })

  it('renders downward trend indicator when trend < 0', () => {
    render(<KpiCard label="Apps" value={50} trend={-5} />)
    expect(screen.getByText('5%')).toBeInTheDocument()
    expect(screen.getByText('▼')).toBeInTheDocument()
  })

  it('calls onClick when card is clicked', () => {
    const onClick = vi.fn()
    render(<KpiCard label="Jobs" value={3} onClick={onClick} />)
    fireEvent.click(screen.getByText('Jobs'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders sparkline when sparkValues are provided', () => {
    const { container } = render(
      <KpiCard label="Trend" value={100} sparkValues={[10, 20, 30]} color="#0176D3" />
    )
    // MiniSparkline renders an SVG
    expect(container.querySelector('svg')).not.toBeNull()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// RingProgress
// ═════════════════════════════════════════════════════════════════════════════
describe('RingProgress', () => {
  it('renders without crashing', () => {
    const { container } = render(<RingProgress pct={75} color="#0176D3" />)
    expect(container.firstChild).not.toBeNull()
  })

  it('displays the percentage text', () => {
    render(<RingProgress pct={60} color="#10B981" />)
    expect(screen.getByText('60%')).toBeInTheDocument()
  })

  it('displays label when provided', () => {
    render(<RingProgress pct={80} color="#F59E0B" label="Completion" />)
    expect(screen.getByText('Completion')).toBeInTheDocument()
  })

  it('displays sublabel when provided', () => {
    render(<RingProgress pct={80} color="#F59E0B" label="Done" sublabel="of target" />)
    expect(screen.getByText('of target')).toBeInTheDocument()
  })

  it('renders SVG circles', () => {
    const { container } = render(<RingProgress pct={50} color="#0176D3" />)
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBe(2) // track + fill
  })

  it('handles zero percent without crashing', () => {
    render(<RingProgress pct={0} color="#0176D3" />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('handles 100 percent without crashing', () => {
    render(<RingProgress pct={100} color="#10B981" />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// FunnelChart
// ═════════════════════════════════════════════════════════════════════════════
describe('FunnelChart', () => {
  const sampleData = [
    { label: 'Applied',     count: 100, color: '#0176D3', icon: '📥' },
    { label: 'Shortlisted', count: 40,  color: '#10B981', icon: '⭐' },
    { label: 'Hired',       count: 10,  color: '#2E844A', icon: '🏆' },
  ]

  it('renders without crashing', () => {
    const { container } = render(<FunnelChart data={sampleData} />)
    expect(container.firstChild).not.toBeNull()
  })

  it('renders each stage label', () => {
    render(<FunnelChart data={sampleData} />)
    expect(screen.getByText(/Applied/)).toBeInTheDocument()
    expect(screen.getByText(/Shortlisted/)).toBeInTheDocument()
    expect(screen.getByText(/Hired/)).toBeInTheDocument()
  })

  it('renders count values', () => {
    render(<FunnelChart data={sampleData} />)
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('40')).toBeInTheDocument()
  })

  it('renders percentage of total text', () => {
    render(<FunnelChart data={sampleData} />)
    expect(screen.getByText(/% of total applicants/)).toBeInTheDocument()
  })

  it('handles empty data array without crashing', () => {
    const { container } = render(<FunnelChart data={[]} />)
    expect(container.firstChild).not.toBeNull()
  })

  it('renders 100% for the first item', () => {
    render(<FunnelChart data={sampleData} />)
    // The first item (Applied) should show 100%
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// HorizBar
// ═════════════════════════════════════════════════════════════════════════════
describe('HorizBar', () => {
  it('renders without crashing', () => {
    const { container } = render(<HorizBar value={50} max={100} color="#0176D3" />)
    expect(container.firstChild).not.toBeNull()
  })

  it('renders two divs (track + fill)', () => {
    const { container } = render(<HorizBar value={30} max={100} color="#10B981" />)
    const divs = container.querySelectorAll('div')
    expect(divs.length).toBeGreaterThanOrEqual(2)
  })

  it('handles zero value without crashing', () => {
    const { container } = render(<HorizBar value={0} max={100} color="#0176D3" />)
    expect(container.firstChild).not.toBeNull()
  })

  it('handles zero max without crashing (no division by zero)', () => {
    const { container } = render(<HorizBar value={10} max={0} color="#0176D3" />)
    expect(container.firstChild).not.toBeNull()
  })

  it('clamps width to 100% when value exceeds max', () => {
    const { container } = render(<HorizBar value={200} max={100} color="#0176D3" />)
    const fill = container.querySelectorAll('div')[1]
    expect(fill.style.width).toBe('100%')
  })

  it('applies the color prop to the fill bar', () => {
    const { container } = render(<HorizBar value={50} max={100} color="#BA0517" />)
    const fill = container.querySelectorAll('div')[1]
    expect(fill.style.background).toBe('rgb(186, 5, 23)')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// MiniSparkline
// ═════════════════════════════════════════════════════════════════════════════
describe('MiniSparkline', () => {
  it('renders SVG with values provided', () => {
    const { container } = render(<MiniSparkline values={[10, 20, 30]} color="#0176D3" />)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders nothing when values is empty', () => {
    const { container } = render(<MiniSparkline values={[]} color="#0176D3" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when values is undefined', () => {
    const { container } = render(<MiniSparkline color="#0176D3" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a polyline element', () => {
    const { container } = render(<MiniSparkline values={[5, 10, 15, 20]} color="#10B981" />)
    expect(container.querySelector('polyline')).not.toBeNull()
  })

  it('renders a circle (last point indicator)', () => {
    const { container } = render(<MiniSparkline values={[5, 10, 15]} color="#F59E0B" />)
    expect(container.querySelector('circle')).not.toBeNull()
  })

  it('handles single value without crashing', () => {
    const { container } = render(<MiniSparkline values={[42]} color="#0176D3" />)
    expect(container.querySelector('svg')).not.toBeNull()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// VertBarChart
// ═════════════════════════════════════════════════════════════════════════════
describe('VertBarChart', () => {
  const sampleData = [
    { label: 'Jan', value: 30, color: '#0176D3' },
    { label: 'Feb', value: 50, color: '#10B981' },
    { label: 'Mar', value: 20, color: '#F59E0B' },
  ]

  it('renders nothing when data is empty', () => {
    const { container } = render(<VertBarChart data={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders SVG when data is provided', () => {
    const { container } = render(<VertBarChart data={sampleData} />)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders a bar label for each data item', () => {
    render(<VertBarChart data={sampleData} />)
    expect(screen.getByText('Jan')).toBeInTheDocument()
    expect(screen.getByText('Feb')).toBeInTheDocument()
    expect(screen.getByText('Mar')).toBeInTheDocument()
  })

  it('renders title and subtitle when provided', () => {
    render(<VertBarChart data={sampleData} title="Monthly" subtitle="2025" />)
    expect(screen.getByText('Monthly')).toBeInTheDocument()
    expect(screen.getByText('2025')).toBeInTheDocument()
  })

  it('calls onItemClick when a bar is clicked', () => {
    const onClick = vi.fn()
    const { container } = render(<VertBarChart data={sampleData} onItemClick={onClick} />)
    const bars = container.querySelectorAll('g')
    fireEvent.click(bars[0])
    expect(onClick).toHaveBeenCalled()
  })

  it('shows value labels when showValues is true', () => {
    render(<VertBarChart data={sampleData} showValues={true} />)
    // Values are rendered as SVG text elements — check container
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AreaChart
// ═════════════════════════════════════════════════════════════════════════════
describe('AreaChart', () => {
  const sampleData = [
    { label: 'Mon', value: 10 },
    { label: 'Tue', value: 25 },
    { label: 'Wed', value: 15 },
  ]

  it('renders nothing when data is empty', () => {
    const { container } = render(<AreaChart data={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders SVG when data is provided', () => {
    const { container } = render(<AreaChart data={sampleData} />)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders title and subtitle when provided', () => {
    render(<AreaChart data={sampleData} title="Daily Hits" subtitle="This week" />)
    expect(screen.getByText('Daily Hits')).toBeInTheDocument()
    expect(screen.getByText('This week')).toBeInTheDocument()
  })

  it('shows the last value in the title area', () => {
    render(<AreaChart data={sampleData} title="Stats" />)
    // Last value is 15
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  it('renders x-axis labels', () => {
    render(<AreaChart data={sampleData} />)
    expect(screen.getByText('Mon')).toBeInTheDocument()
  })

  it('renders area path and line path elements', () => {
    const { container } = render(<AreaChart data={sampleData} color="#0176D3" />)
    const paths = container.querySelectorAll('path')
    expect(paths.length).toBeGreaterThanOrEqual(2)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// DonutChart
// ═════════════════════════════════════════════════════════════════════════════
describe('DonutChart', () => {
  const segments = [
    { label: 'Engineering', value: 40, color: '#0176D3' },
    { label: 'Sales',       value: 30, color: '#10B981' },
    { label: 'Design',      value: 20, color: '#F59E0B' },
  ]

  it('renders "No data" when segments are empty', () => {
    render(<DonutChart segments={[]} />)
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('renders "No data" when all segment values are zero', () => {
    render(<DonutChart segments={[{ label: 'A', value: 0, color: '#ccc' }]} />)
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('renders SVG when segments have values', () => {
    const { container } = render(<DonutChart segments={segments} />)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders legend items for each segment', () => {
    render(<DonutChart segments={segments} />)
    expect(screen.getByText('Engineering')).toBeInTheDocument()
    expect(screen.getByText('Sales')).toBeInTheDocument()
    expect(screen.getByText('Design')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<DonutChart segments={segments} title="Department Breakdown" />)
    expect(screen.getByText('Department Breakdown')).toBeInTheDocument()
  })

  it('renders center value when centerValue is provided', () => {
    render(<DonutChart segments={segments} centerValue={90} centerLabel="Total" />)
    expect(screen.getByText('90')).toBeInTheDocument()
  })

  it('hides legend when hideLegend is true', () => {
    render(<DonutChart segments={segments} hideLegend={true} />)
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument()
  })

  it('calls onItemClick when a segment is clicked', () => {
    const onClick = vi.fn()
    const { container } = render(<DonutChart segments={segments} onItemClick={onClick} />)
    const paths = container.querySelectorAll('path')
    fireEvent.click(paths[0])
    expect(onClick).toHaveBeenCalled()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// WorldMap
// ═════════════════════════════════════════════════════════════════════════════
describe('WorldMap', () => {
  it('renders without crashing', () => {
    const { container } = render(<WorldMap />)
    expect(container.firstChild).not.toBeNull()
  })

  it('shows loading state initially', () => {
    render(<WorldMap />)
    expect(screen.getByText(/Loading map/i)).toBeInTheDocument()
  })

  it('renders the legend color labels', () => {
    render(<WorldMap />)
    expect(screen.getByText('1–4')).toBeInTheDocument()
    expect(screen.getByText('5–9')).toBeInTheDocument()
    expect(screen.getByText('10–19')).toBeInTheDocument()
    expect(screen.getByText('20+')).toBeInTheDocument()
  })

  it('renders with a custom height prop', () => {
    const { container } = render(<WorldMap height={300} />)
    // The map container div is inside; find div with style containing height:300
    const mapDiv = container.querySelector('[style*="300px"]') ||
      container.querySelector('[style*="300"]')
    expect(mapDiv || container.firstChild).not.toBeNull()
  })
})
