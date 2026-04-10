import React from 'react';

// Pure SVG area + line chart — no external dependency
// Props: data=[{label, value}], color, height, title, subtitle, onItemClick
export default function AreaChart({ data = [], color = '#0176D3', height = 120, title, subtitle, onItemClick }) {
  if (!data.length) return null;
  const W = 400, H = height;
  const pad = { top: 10, right: 10, bottom: 28, left: 32 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;

  const max = Math.max(...data.map(d => d.value), 1);
  const min = 0;

  const xs = data.map((_, i) => pad.left + (i / (data.length - 1 || 1)) * iW);
  const ys = data.map(d => pad.top + iH - ((d.value - min) / (max - min || 1)) * iH);

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xs[i].toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${xs[xs.length - 1].toFixed(1)},${(pad.top + iH).toFixed(1)} L${xs[0].toFixed(1)},${(pad.top + iH).toFixed(1)} Z`;

  // Y-axis ticks (3 levels)
  const ticks = [0, Math.round(max / 2), max];

  return (
    <div style={{ position: 'relative' }}>
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ color: color, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{title}</div>
            {subtitle && <div style={{ color: '#9E9D9B', fontSize: 10, marginTop: 1 }}>{subtitle}</div>}
          </div>
          <div style={{ color: color, fontWeight: 800, fontSize: 20 }}>{data[data.length - 1]?.value ?? 0}</div>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, overflow: 'visible' }}>
        <defs>
          <linearGradient id={`ag-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {ticks.map((t, i) => {
          const y = pad.top + iH - ((t - min) / (max - min || 1)) * iH;
          return (
            <g key={i}>
              <line x1={pad.left} y1={y} x2={pad.left + iW} y2={y} stroke="#F3F2F2" strokeWidth="1" />
              <text x={pad.left - 4} y={y + 3.5} textAnchor="end" fontSize="9" fill="#9E9D9B">{t}</text>
            </g>
          );
        })}
        {/* X-axis labels — show every N-th */}
        {data.map((d, i) => {
          const step = Math.max(1, Math.floor(data.length / 6));
          if (i % step !== 0 && i !== data.length - 1) return null;
          return (
            <text key={i} x={xs[i]} y={pad.top + iH + 16} textAnchor="middle" fontSize="9" fill="#9E9D9B">{d.label}</text>
          );
        })}
        {/* Area fill */}
        <path d={areaPath} fill={`url(#ag-${color.replace('#', '')})`} pointerEvents="none" />
        {/* Line */}
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" pointerEvents="none" />
        {/* Dots */}
        {data.map((d, i) => (
          <circle key={i} cx={xs[i]} cy={ys[i]} r="3" fill={color} stroke="#fff" strokeWidth="1.5" opacity={i === data.length - 1 ? 1 : 0.4} pointerEvents="none" />
        ))}
        {/* Invisible Click Targets */}
        {onItemClick && data.map((d, i) => (
          <rect
            key={`click-${i}`}
            x={i === 0 ? pad.left : xs[i] - (xs[i] - xs[i-1])/2}
            y={pad.top}
            width={i === data.length - 1 ? (W - xs[i]) + (xs[i] - xs[i-1])/2 : (xs[i+1] - xs[i])}
            height={iH}
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onClick={() => onItemClick(d, i)}
          >
            <title>{`${d.label}: ${d.value}`}</title>
          </rect>
        ))}
      </svg>
    </div>
  );
}
