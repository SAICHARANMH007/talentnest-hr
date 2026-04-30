import React from 'react';
import { usePresence } from '../../hooks/usePresence.js';

export default function PresenceBadge({ userId, style = {}, showLabel = false }) {
  const { isUserOnline } = usePresence();
  
  if (!userId) return null;

  const isOnline = isUserOnline(userId);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...style }} title={isOnline ? 'Online' : 'Offline'}>
      <div 
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: isOnline ? '#10B981' : '#94A3B8',
          boxShadow: isOnline ? '0 0 0 2px rgba(16, 185, 129, 0.2)' : 'none',
          transition: 'all 0.3s ease',
          flexShrink: 0
        }}
      />
      {showLabel && (
        <span style={{ fontSize: 12, color: isOnline ? '#10B981' : '#94A3B8', fontWeight: 500 }}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  );
}
