import React from 'react';

export default function HorizBar({ value, max, color, height=6 }) {
  const pct = max > 0 ? Math.min(100, (value/max)*100) : 0;
  return (
    <div style={{ height, background:"#F3F2F2", borderRadius:height/2, overflow:"hidden", flex:1 }}>
      <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:height/2, transition:"width 0.6s ease" }} />
    </div>
  );
}
