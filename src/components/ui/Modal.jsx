import React from 'react';
import { createPortal } from 'react-dom';
import { glassCard, Z } from '../../constants/styles.js';

/**
 * Modal — standard portal-based dialog.
 * Uses createPortal to escape parent transform/filter contexts.
 */
export default function Modal({ title, onClose, children, wide, width, footer, headerExtra }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const content = (
    <div
      className="tn-overlay"
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5, 13, 26, 0.75)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: Z.MODAL,
        display: "flex",
        alignItems: isMobile ? "flex-end" : "flex-start",
        justifyContent: "center",
        overflowY: isMobile ? "hidden" : "auto",
        padding: isMobile ? '0' : 'max(20px, env(safe-area-inset-top, 20px)) 16px max(20px, env(safe-area-inset-bottom, 20px))',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`tn-modal ${wide ? 'tn-modal-wide' : 'tn-modal-regular'}`}
        style={{
          ...glassCard,
          width: "100%",
          maxWidth: width || (wide ? '940px' : '640px'),
          display: "flex",
          flexDirection: "column",
          maxHeight: isMobile ? '92dvh' : 'calc(100dvh - 40px)',
          position: "relative",
          overflow: "hidden",
          borderRadius: isMobile ? '20px 20px 0 0' : 24,
          boxShadow: '0 32px 64px rgba(0,0,0,0.35)',
          background: '#fff',
          height: 'auto',
          margin: isMobile ? '0' : 'auto',
        }}
      >
        {/* Sticky header */}
        <div className="tn-modal-header" style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          gap: 16, 
          padding: "20px 28px", 
          borderBottom: "1px solid rgba(0,0,0,0.06)", 
          flexShrink: 0, 
          background: "#fff", 
          borderRadius: "24px 24px 0 0" 
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ color: "#181818", fontWeight: 800, fontSize: 18, margin: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {headerExtra}
            <button 
              onClick={onClose} 
              aria-label="Close" 
              style={{ 
                background: "rgba(0,0,0,0.05)", 
                border: "none", 
                color: "#706E6B", 
                fontSize: 20, 
                cursor: "pointer", 
                lineHeight: 1, 
                padding: "6px 8px", 
                minHeight: 36, 
                minWidth: 36, 
                flexShrink: 0, 
                borderRadius: 10, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
            >✕</button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="tn-modal-body" style={{
          padding: isMobile ? "16px 14px 40px" : "24px 20px 40px",
          overflowY: "auto",
          flex: 1,
          minHeight: 0,
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: 'contain',
          background: '#F8FAFF',
        }}>
          {children}
        </div>

        {/* Sticky footer */}
        {footer && (
          <div className="tn-modal-footer tn-form-actions" style={{ 
            flexShrink: 0, 
            padding: "16px 20px", 
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            borderTop: "1px solid rgba(0,0,0,0.06)", 
            background: "#fff", 
            borderRadius: "0 0 24px 24px", 
            display: "flex", 
            gap: 12, 
            alignItems: "center", 
            justifyContent: 'flex-end', 
            flexWrap: 'wrap' 
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
  return createPortal(content, document.body);
}
