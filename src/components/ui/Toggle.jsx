import React from 'react';

/**
 * TalentNest Premium Toggle Component
 * A high-fidelity, Salesforce-inspired toggle switch for administrative controls.
 */
const Toggle = ({ checked, onChange, label, disabled, size = 'md' }) => {
  const isMd = size === 'md';
  const width = isMd ? 36 : 30;
  const height = isMd ? 18 : 16;
  const knobSize = isMd ? 14 : 12;

  return (
    <label style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: 10, 
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      userSelect: 'none'
    }}>
      <div style={{ position: 'relative', width, height }}>
        <input 
          type="checkbox" 
          checked={checked} 
          onChange={(e) => !disabled && onChange(e.target.checked)} 
          style={{ 
            opacity: 0, 
            width: 0, 
            height: 0, 
            position: 'absolute' 
          }} 
        />
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: checked ? '#10B981' : '#CBD5E1',
          borderRadius: 20,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          border: '1px solid ' + (checked ? '#059669' : '#94A3B8'),
          boxSizing: 'border-box'
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            left: checked ? (width - knobSize - 2) : 2,
            width: knobSize,
            height: knobSize,
            backgroundColor: '#fff',
            borderRadius: '50%',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }} />
        </div>
      </div>
      {label && <span style={{ fontSize: 13, fontWeight: 500, color: '#3E3E3C' }}>{label}</span>}
    </label>
  );
};

export default Toggle;
