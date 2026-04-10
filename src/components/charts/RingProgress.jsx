import React from 'react';

export default function RingProgress({ pct, color, size=56, label, sublabel }) {
  const r = (size-8)/2, circ = 2*Math.PI*r, dash = (pct/100)*circ;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      <div style={{ position:"relative", width:size, height:size }}>
        <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F3F2F2" strokeWidth={6} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition:"stroke-dasharray 0.8s ease" }} />
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ color:"#181818", fontSize:size>50?13:11, fontWeight:700 }}>{pct}%</span>
        </div>
      </div>
      {label    && <span style={{ color:"#181818", fontSize:11, fontWeight:600, textAlign:"center" }}>{label}</span>}
      {sublabel && <span style={{ color:"#706E6B", fontSize:10, textAlign:"center" }}>{sublabel}</span>}
    </div>
  );
}
