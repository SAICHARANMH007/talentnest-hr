import React from 'react';

export default function FunnelChart({ data }) {
  const max = data[0]?.count || 1;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {data.map((d, i) => {
        const pct = max > 0 ? (d.count/max)*100 : 0;
        const conv = i > 0 && data[i-1].count > 0 ? Math.round((d.count/data[i-1].count)*100) : null;
        return (
          <div key={d.label}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:3 }}>
              <span style={{ color:d.color, fontSize:11, minWidth:100, fontWeight:500 }}>{d.icon} {d.label}</span>
              <div style={{ flex:1, height:22, background:"#FFFFFF", borderRadius:6, overflow:"hidden", position:"relative" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${d.color}55,${d.color}33)`, borderRadius:6, transition:"width 0.7s ease", border:`1px solid ${d.color}44` }} />
                <span style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", color:"#181818", fontSize:11, fontWeight:700 }}>{d.count}</span>
              </div>
              {conv !== null && <span style={{ color:"#9E9D9B", fontSize:10, minWidth:36, textAlign:"right" }}>{conv}%</span>}
            </div>
          </div>
        );
      })}
      <p style={{ color:"#9E9D9B", fontSize:10, margin:"4px 0 0", textAlign:"right" }}>↑ conversion from previous stage</p>
    </div>
  );
}
