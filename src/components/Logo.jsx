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
      <svg width={s} height={s} viewBox="0 0 100 100" fill="none" style={{ borderRadius: '24%', overflow: 'hidden' }}>
        {/* Rounded Square Background */}
        <rect width="100" height="100" rx="24" fill="#031026" />
        
        {/* Hexagon Shell */}
        <path 
          d="M50 20 L76 35 V65 L50 80 L24 65 V35 Z" 
          stroke={hrColor} 
          strokeWidth="4" 
          fill="rgba(0, 194, 203, 0.1)" 
        />
        
        {/* Nodes */}
        {[
          [50, 20], [76, 35], [76, 65], [50, 80], [24, 65], [24, 35]
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill={hrColor} />
        ))}

        {/* Center Circle */}
        <circle cx="50" cy="53" r="14" fill={accentColor} />
        
        {/* Arrow */}
        <path 
          d="M50 60 V46 M44 52 L50 45 L56 52" 
          stroke="white" 
          strokeWidth="5" 
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
