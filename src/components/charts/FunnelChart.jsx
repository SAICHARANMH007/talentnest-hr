import React from 'react';

export default function FunnelChart({ data }) {
  // max = total applicants (first stage — Applied). Every row shows % of that total.
  const max = data[0]?.count || 1;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {data.map((d) => {
        const barPct  = max > 0 ? (d.count / max) * 100 : 0;
        // % of total (Applied count) — never exceeds 100%, never shows misleading >100% values
        const ofTotal = max > 0 ? Math.round((d.count / max) * 100) : 0;
        return (
          <div key={d.label}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:3 }}>
              <span style={{ color:d.color, fontSize:11, minWidth:100, fontWeight:500 }}>{d.icon} {d.label}</span>
              <div style={{ flex:1, height:22, background:"#F3F2F2", borderRadius:6, overflow:"hidden", position:"relative" }}>
                <div style={{ height:"100%", width:`${barPct}%`, background:`linear-gradient(90deg,${d.color}66,${d.color}44)`, borderRadius:6, transition:"width 0.7s ease", border:`1px solid ${d.color}44` }} />
                <span style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", color:"#181818", fontSize:11, fontWeight:700 }}>{d.count}</span>
              </div>
              <span style={{ color:"#9E9D9B", fontSize:10, minWidth:32, textAlign:"right" }}>{ofTotal}%</span>
            </div>
          </div>
        );
      })}
      <p style={{ color:"#9E9D9B", fontSize:10, margin:"4px 0 0", textAlign:"right" }}>% of total applicants</p>
    </div>
  );
}
