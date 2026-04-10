import React from 'react';

// Pure SVG vertical bar chart — no external dependency
// Props: data=[{label, value, color, id}], defaultColor, height, title, subtitle, showValues, onItemClick
export default function VertBarChart({ data = [], defaultColor = '#0176D3', height = 140, title, subtitle, showValues = true, onItemClick }) {
  if (!data.length) return null;
  const W = 400, H = height;
  const pad = { top: 20, right: 8, bottom: 28, left: 28 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;

  const max = Math.max(...data.map(d => d.value), 1);
  const barW = Math.min(36, (iW / data.length) * 0.6);
  const gap   = iW / data.length;

  return (
    <div style={{ position: 'relative' }}>
      {title && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ color: defaultColor, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{title}</div>
          {subtitle && <div style={{ color: '#9E9D9B', fontSize: 10, marginTop: 1 }}>{subtitle}</div>}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, overflow: 'visible' }}>
        <defs>
          {data.map((d, i) => (
            <linearGradient key={i} id={`vb-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={d.color || defaultColor} stopOpacity="1" />
              <stop offset="100%" stopColor={d.color || defaultColor} stopOpacity="0.55" />
            </linearGradient>
          ))}
        </defs>
        {/* Baseline */}
        <line x1={pad.left} y1={pad.top + iH} x2={pad.left + iW} y2={pad.top + iH} stroke="#E8E8E8" strokeWidth="1" />
        {/* Bars */}
        {data.map((d, i) => {
          const bH = Math.max(2, (d.value / max) * iH);
          const x = pad.left + i * gap + gap / 2 - barW / 2;
          const y = pad.top + iH - bH;
          return (
            <g
              key={i}
              style={{ cursor: onItemClick ? 'pointer' : 'default' }}
              onClick={() => onItemClick && onItemClick(d, i)}
              onMouseEnter={e => e.currentTarget.querySelector('rect').style.opacity = '0.8'}
              onMouseLeave={e => e.currentTarget.querySelector('rect').style.opacity = '1'}
            >
              <rect x={x} y={y} width={barW} height={bH} rx="4" ry="4" fill={`url(#vb-${i})`} style={{ transition: 'opacity 0.2s' }} />
              {showValues && d.value > 0 && (
                <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="9" fontWeight="700" fill={d.color || defaultColor}>{d.value}</text>
              )}
              <text x={x + barW / 2} y={pad.top + iH + 14} textAnchor="middle" fontSize="9" fill="#9E9D9B"
                style={{ maxWidth: gap }}>
                {d.label.length > 8 ? d.label.slice(0, 7) + '…' : d.label}
              </text>
              <title>{`${d.label}: ${d.value}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
