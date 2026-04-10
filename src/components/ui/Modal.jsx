import React from 'react';
import { glass } from '../../constants/styles.js';

export default function Modal({ title, onClose, children, wide, footer }) {
  return (
    <div
      className="tn-overlay"
      role="dialog"
      aria-modal="true"
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.78)", zIndex:10001, display:"flex", alignItems:"center", justifyContent:"center", padding:'20px 16px',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
        paddingLeft:   'max(16px, env(safe-area-inset-left,   16px))',
        paddingRight:  'max(16px, env(safe-area-inset-right,  16px))',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`tn-modal ${wide ? 'tn-modal-wide' : 'tn-modal-regular'}`}
        style={{ ...glass, width:"min(100%, 1000px)", maxWidth:wide?'840px':'620px', display:"flex", flexDirection:"column",
          maxHeight:'min(calc(100dvh - 40px), calc(100vh - 40px))',
          backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
          position:"relative", overflow:"hidden", borderRadius:18 }}
      >
        {/* Sticky header */}
        <div className="tn-modal-header" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap: 16, padding:"18px 24px 14px", borderBottom:"1px solid rgba(0,0,0,0.06)", flexShrink:0, background:"#fff", borderRadius:"18px 18px 0 0" }}>
          <h3 style={{ color:"#181818", fontWeight:800, fontSize:16, margin:0, lineHeight: 1.3 }}>{title}</h3>
          <button onClick={onClose} aria-label="Close" style={{ background:"none", border:"none", color:"#706E6B", fontSize:22, cursor:"pointer", lineHeight:1, padding:"4px 6px", minHeight:36, minWidth:36, flexShrink: 0 }}>✕</button>
        </div>
        {/* Scrollable content */}
        <div className="tn-modal-body" style={{ padding:"22px 24px 24px", overflowY:"auto", flex:1, WebkitOverflowScrolling:"touch" }}>
          {children}
        </div>
        {/* Sticky footer */}
        {footer && (
          <div className="tn-modal-footer tn-form-actions" style={{ flexShrink:0, padding:"14px 24px", borderTop:"1px solid rgba(0,0,0,0.06)", background:"#fff", borderRadius:"0 0 18px 18px", display:"flex", gap:10, alignItems:"center", justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
