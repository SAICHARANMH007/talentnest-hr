import React from 'react';

// Pure SVG multi-segment donut chart — no external dependency
// Props: segments=[{label, value, color}], size, title, centerLabel, centerValue, onItemClick
export default function DonutChart({ segments = [], size = 130, title, centerLabel, centerValue, onItemClick }) {
  const total = segments.reduce((s, d) => s + (d.value || 0), 0);
  if (!total) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {title && <div style={{ color: '#0176D3', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{title}</div>}
      <div style={{ color: '#9E9D9B', fontSize: 13, padding: '20px 0' }}>No data</div>
    </div>
  );

  const cx = size / 2, cy = size / 2;
  const R = size * 0.38, r = size * 0.23; // outer and inner radius
  const gap = total === 1 ? 0 : 0.03; // gap in radians between segments

  let current = -Math.PI / 2;
  const arcs = segments.filter(s => s.value > 0).map(s => {
    const frac = s.value / total;
    const sweep = frac * 2 * Math.PI - gap;
    const start = current + gap / 2;
    const end = start + sweep;
    current += frac * 2 * Math.PI;

    const x1 = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start);
    const x2 = cx + R * Math.cos(end),   y2 = cy + R * Math.sin(end);
    const x3 = cx + r * Math.cos(end),   y3 = cy + r * Math.sin(end);
    const x4 = cx + r * Math.cos(start), y4 = cy + r * Math.sin(start);
    const large = sweep > Math.PI ? 1 : 0;
    const d = `M${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} L${x3.toFixed(2)},${y3.toFixed(2)} A${r},${r} 0 ${large},0 ${x4.toFixed(2)},${y4.toFixed(2)} Z`;
    return { ...s, d, frac };
  });

  return (
    <div>
      {title && <div style={{ color: '#0176D3', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, flexShrink: 0, overflow: 'visible' }}>
          {arcs.map((a, i) => (
            <path
              key={i}
              d={a.d}
              fill={a.color}
              opacity="0.9"
              style={{ cursor: onItemClick ? 'pointer' : 'default', transition: 'all 0.2s' }}
              onClick={() => onItemClick && onItemClick(a, i)}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.9'}
            >
              <title>{`${a.label}: ${a.value} (${Math.round(a.frac * 100)}%)`}</title>
            </path>
          ))}
          {centerValue !== undefined && (
            <g pointerEvents="none">
              <text x={cx} y={cy - 2} textAnchor="middle" fontSize={size * 0.15} fontWeight="800" fill="#181818">{centerValue}</text>
              {centerLabel && <text x={cx} y={cy + size * 0.08} textAnchor="middle" fontSize={size * 0.07} fontWeight="600" fill="#9E9D9B" textTransform="uppercase" letterSpacing="0.5px">{centerLabel}</text>}
            </g>
          )}
        </svg>
        {!hideLegend && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {segments.filter(s => s.value > 0).map((s, i) => (
              <div key={i} onClick={() => onItemClick && onItemClick(s, i)} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: onItemClick ? 'pointer' : 'default', padding: '2px 4px', borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                <div style={{ flex: 1, color: '#444', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
                <div style={{ color: '#181818', fontSize: 11, fontWeight: 700, marginLeft: 4 }}>{s.value}</div>
                <div style={{ color: '#9E9D9B', fontSize: 10, minWidth: 28, textAlign: 'right' }}>{Math.round((s.value / total) * 100)}%</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
