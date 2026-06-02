import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { glassCard, Z } from '../../constants/styles.js';

export default function Modal({ title, onClose, children, wide, width, footer, headerExtra }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const content = (
    <div
      className="tn-overlay"
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: isMobile ? '#fff' : 'rgba(5,13,26,0.75)',
        backdropFilter: isMobile ? 'none' : 'blur(8px)',
        WebkitBackdropFilter: isMobile ? 'none' : 'blur(8px)',
        zIndex: Z.MODAL,
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'center',
        overflowY: isMobile ? 'hidden' : 'auto',
        padding: isMobile ? '0' : 'max(20px, env(safe-area-inset-top,20px)) 16px max(20px, env(safe-area-inset-bottom,20px))',
      }}
      onClick={e => { if (!isMobile && e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`tn-modal ${wide ? 'tn-modal-wide' : 'tn-modal-regular'}`}
        style={{
          ...glassCard,
          width: '100%',
          maxWidth: isMobile ? '100%' : (width || (wide ? '940px' : '640px')),
          display: 'flex',
          flexDirection: 'column',
          height: isMobile ? '100dvh' : 'auto',
          maxHeight: isMobile ? '100dvh' : 'calc(100dvh - 40px)',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: isMobile ? 0 : 24,
          boxShadow: isMobile ? 'none' : '0 32px 64px rgba(0,0,0,0.35)',
          background: '#fff',
          margin: isMobile ? '0' : 'auto',
        }}
      >
        {/* ── Header ── */}
        <div
          className="tn-modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: isMobile
              ? 'calc(env(safe-area-inset-top,0px) + 16px) 16px 16px'
              : '20px 28px',
            borderBottom: '1.5px solid #E2E8F0',
            flexShrink: 0,
            background: '#fff',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              color: '#0A1628',
              fontWeight: 800,
              fontSize: isMobile ? 15 : 18,
              margin: 0,
              lineHeight: 1.3,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              whiteSpace: 'normal',
            }}>{title}</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {headerExtra}
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: '#F1F5F9',
                border: 'none',
                color: '#374151',
                fontSize: 18,
                cursor: 'pointer',
                minHeight: 40,
                minWidth: 40,
                flexShrink: 0,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                WebkitTapHighlightColor: 'transparent',
              }}
            >✕</button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div
          className="tn-modal-body"
          style={{
            padding: isMobile ? '20px 16px 32px' : '24px 28px 40px',
            overflowY: 'auto',
            flex: 1,
            minHeight: 0,
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            background: '#fff',
          }}
        >
          {children}
        </div>

        {/* ── Sticky footer ── */}
        {footer && (
          <div
            className="tn-modal-footer tn-form-actions"
            style={{
              flexShrink: 0,
              padding: isMobile
                ? 'calc(12px) 16px calc(12px + env(safe-area-inset-bottom,0px))'
                : '16px 28px',
              paddingBottom: isMobile
                ? 'calc(12px + env(safe-area-inset-bottom,0px))'
                : '16px',
              borderTop: '1.5px solid #E2E8F0',
              background: '#fff',
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
