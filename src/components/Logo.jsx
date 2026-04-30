import React from 'react';

export default function Logo({
  size = 'md',        // xs | sm | md | lg | xl
  variant = 'full',   // full | icon | wordmark
  theme = 'dark',     // dark | light
  customLogoUrl = null,
  className = '',
  style = {},
}) {
  if (customLogoUrl) {
    const heights = { xs: 20, sm: 24, md: 32, lg: 40, xl: 56 };
    return (
      <img
        src={customLogoUrl}
        alt="TalentNest HR"
        style={{ height: heights[size], width: 'auto', objectFit: 'contain', ...style }}
        className={className}
      />
    );
  }

  const iconSizes = { xs: 16, sm: 20, md: 28, lg: 36, xl: 52 };
  const textSizes = { xs: 10, sm: 12, md: 15, lg: 19, xl: 28 };
  const tagSizes  = { xs: 7,  sm: 8,  md: 9,  lg: 11, xl: 16 };
  const gaps      = { xs: 4,  sm: 5,  md: 7,  lg: 9,  xl: 14 };

  const iconSize    = iconSizes[size];
  const mainColor   = theme === 'light' ? '#0F2B6B' : '#FFFFFF';
  const accentColor = theme === 'light' ? '#1B4FD8' : '#3B7FE8';
  const tagColor    = theme === 'light' ? '#1B4FD8' : '#06B6D4';

  const IconMark = () => {
    const s  = iconSize;
    const cx = s / 2;
    const cy = s / 2;
    const r  = s * 0.42;
    const hex = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });
    const hexPoints = hex.map(p => `${p.x},${p.y}`).join(' ');
    const nodeR   = s * 0.07;
    const centerR = s * 0.13;
    const arrowLen = s * 0.13;

    return (
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
        <polygon points={hexPoints} fill={accentColor} opacity={theme === 'light' ? 0.12 : 0.2} />
        <polygon points={hexPoints} stroke={accentColor} strokeWidth={s * 0.045} fill="none" />
        {hex.map((p, i) => (
          <line key={i} x1={cx} y1={cy}
            x2={cx + (p.x - cx) * 0.6} y2={cy + (p.y - cy) * 0.6}
            stroke={accentColor} strokeWidth={s * 0.025} opacity={0.5}
          />
        ))}
        {hex.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={nodeR} fill={accentColor} opacity={0.88} />
        ))}
        <circle cx={cx} cy={cy} r={centerR} fill={accentColor} />
        <line x1={cx} y1={cy + arrowLen * 0.4} x2={cx} y2={cy - arrowLen}
          stroke="#fff" strokeWidth={s * 0.045} strokeLinecap="round" />
        <path
          d={`M${cx - arrowLen * 0.55} ${cy - arrowLen * 0.5} L${cx} ${cy - arrowLen * 1.1} L${cx + arrowLen * 0.55} ${cy - arrowLen * 0.5}`}
          stroke="#fff" strokeWidth={s * 0.045} fill="none"
          strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    );
  };

  if (variant === 'icon') return <IconMark />;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: gaps[size], minWidth: 0, ...style }} className={className}>
      {variant !== 'wordmark' && <IconMark />}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, minWidth: 0, overflow: 'hidden' }}>
        <span style={{ fontSize: textSizes[size], fontWeight: 800, color: mainColor, letterSpacing: '-0.03em', fontFamily: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          TalentNest
        </span>
        <span style={{ fontSize: tagSizes[size], fontWeight: 700, color: tagColor, letterSpacing: '0.3em', marginTop: size === 'xs' ? 0 : 1, fontFamily: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          HR
        </span>
      </div>
    </div>
  );
}
