import React from 'react';

/**
 * Premium Skeleton Placeholder
 * @param {string} width - Width of the skeleton (e.g. '100%', '200px')
 * @param {string} height - Height of the skeleton (e.g. '20px', '1rem')
 * @param {string} variant - 'rect', 'circle', or 'text'
 * @param {object} style - Additional inline styles
 */
export default function Skeleton({ width, height, variant = 'rect', style = {} }) {
  const baseStyle = {
    width: width || '100%',
    height: height || (variant === 'text' ? '12px' : 'auto'),
    borderRadius: variant === 'circle' ? '50%' : (variant === 'text' ? '4px' : '12px'),
    display: 'block',
    ...style,
  };

  return (
    <div 
      className="tn-shimmer" 
      style={baseStyle} 
      aria-hidden="true"
    />
  );
}
