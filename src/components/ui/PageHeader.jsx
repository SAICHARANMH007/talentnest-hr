import React from 'react';

export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="tn-page-header" style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24, gap: 12 }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h2 style={{ color:"#181818", fontSize:"clamp(18px, 4vw, 22px)", fontWeight:700, margin:0, lineHeight:1.2 }}>{title}</h2>
        {subtitle && <p style={{ color:"#706E6B", fontSize:13, margin:"4px 0 0", lineHeight:1.4 }}>{subtitle}</p>}
      </div>
      {action && <div className="tn-page-header-actions" style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
