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

  const iconSizes = { xs: 20, sm: 28, md: 36, lg: 48, xl: 64 };
  const textSizes = { xs: 12, sm: 16, md: 20, lg: 24, xl: 32 };
  const tagSizes  = { xs: 8,  sm: 10, md: 12, lg: 14, xl: 18 };
  const subSizes  = { xs: 6,  sm: 7,  md: 8,  lg: 10, xl: 12 };
  const gaps      = { xs: 6,  sm: 8,  md: 10, lg: 12, xl: 16 };

  const iconSize    = iconSizes[size];
  const mainColor   = theme === 'light' ? '#0F172A' : '#FFFFFF';
  const accentColor = '#0176D3'; // Deep Blue
  const hrColor     = '#00C2CB'; // Cyan
  const subColor    = theme === 'light' ? '#64748B' : 'rgba(255,255,255,0.5)';

  const IconMark = () => {
    const s = iconSize;
    return (
      <svg width={s} height={s} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ borderRadius: '22%', overflow: 'hidden' }}>
        {/* Rounded Square Background - Matches original dark navy */}
        <rect width="100" height="100" rx="22" fill="#041634" />
        
        {/* Main Hexagon - Solid fill matching background */}
        <path 
          d="M50 12 L84 31 V69 L50 88 L16 69 V31 Z" 
          stroke="#3170F3" 
          strokeWidth="7" 
          strokeLinejoin="round"
          fill="#041634" 
        />
        
        {/* Midpoint Side Nodes - Exactly 6 nodes on side centers */}
        {[
          [67, 21], [84, 50], [67, 79], [33, 79], [16, 50], [33, 21]
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="7" fill="#3170F3" />
        ))}

        {/* Center Primary Circle */}
        <circle cx="50" cy="51" r="18" fill="#3170F3" />
        
        {/* Bold White Upward Arrow */}
        <path 
          d="M50 65 V39 M40 49 L50 38 L60 49" 
          stroke="white" 
          strokeWidth="8" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
      </svg>
    );
  };

  if (variant === 'icon') return <IconMark />;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: gaps[size], minWidth: 0, ...style }} className={className}>
      {variant !== 'wordmark' && <IconMark />}
      {variant !== 'icon' && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: size === 'xs' ? 2 : 4 }}>
            <span style={{ fontSize: textSizes[size], fontWeight: 900, color: mainColor, letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              TalentNest
            </span>
            <span style={{ fontSize: textSizes[size], fontWeight: 900, color: hrColor, letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              HR
            </span>
          </div>
          {variant === 'full' && (
            <span style={{ fontSize: subSizes[size], fontWeight: 800, color: subColor, letterSpacing: '0.25em', marginTop: 4, textTransform: 'uppercase' }}>
              FIND · HIRE · GROW
            </span>
          )}
        </div>
      )}
    </div>
  );
}
