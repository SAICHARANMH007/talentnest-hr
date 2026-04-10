import React from 'react';
import MiniSparkline from '../charts/MiniSparkline.jsx';

/**
 * TrendCard - A "Trendy" KPI card for Super Admin Dashboard
 * High density, vibrant gradients, and glassmorphism.
 */
export default function TrendCard({ 
  label, value, sub, icon, color = '#0176D3', 
  trend, sparkValues, variant = 'glass', onClick 
}) {
  const trendUp = trend > 0;
  const isDark  = variant === 'dark';
  
  const cardStyle = {
    background: isDark ? '#0F1F35' : '#FFFFFF',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(1,118,211,0.12)'}`,
    borderRadius: 20,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'transform 0.22s ease, box-shadow 0.22s ease',
    boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.04)'
  };

  const hoverEffect = (e) => {
    if (onClick) {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = isDark ? '0 12px 48px rgba(0,0,0,0.3)' : '0 8px 32px rgba(1,118,211,0.12)';
    }
  };

  const leaveEffect = (e) => {
    if (onClick) {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = isDark ? '0 8px 32px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.04)';
    }
  };

  return (
    <div onClick={onClick} onMouseEnter={hoverEffect} onMouseLeave={leaveEffect} style={cardStyle}>
      {/* Decorative Blob */}
      <div style={{ 
        position: 'absolute', top: -20, right: -20, width: 100, height: 100, 
        borderRadius: '50%', background: `${color}15`, filter: 'blur(30px)' 
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ 
          width: 44, height: 44, borderRadius: 12, 
          background: isDark ? 'rgba(255,255,255,0.04)' : `${color}15`, 
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : `${color}25`}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
        }}>
          {icon}
        </div>
        {trend !== undefined && (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: 4, 
            background: trendUp ? 'rgba(16,185,129,0.1)' : 'rgba(186,5,23,0.1)', 
            borderRadius: 8, padding: '4px 10px' 
          }}>
            <span style={{ color: trendUp ? '#10B981' : '#FE5C4C', fontSize: 10 }}>{trendUp ? '▲' : '▼'}</span>
            <span style={{ color: trendUp ? '#10B981' : '#FE5C4C', fontSize: 11, fontWeight: 700 }}>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      <div style={{ color: isDark ? '#fff' : color, fontSize: 32, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
      </div>
      
      <div style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#706E6B', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 8 }}>
        {label}
      </div>

      {sub && <div style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#9E9D9B', fontSize: 11, marginTop: 4 }}>{sub}</div>}

      {sparkValues && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}` }}>
          <MiniSparkline values={sparkValues} color={color} height={30} />
        </div>
      )}
    </div>
  );
}
