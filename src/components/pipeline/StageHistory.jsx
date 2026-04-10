import React from 'react';
import { SM } from '../../constants/stages.js';

export default function StageHistory({ history }) {
  if (!history?.length) return null;
  return (
    <div style={{ marginTop:12, borderTop:"1px solid #F3F2F2", paddingTop:12 }}>
      <p style={{ color:"#0176D3", fontSize:11, fontWeight:600, margin:"0 0 8px" }}>STAGE HISTORY</p>
      {[...(history||[])].reverse().map((h, i) => {
        // stageId is the normalised frontend key; h.stage is the DB title-case fallback for display
        const s = SM[h.stageId] || SM[h.stage] || { color:"#706E6B", icon:"•", label: h.stage };
        const ts = h.movedAt || h.changedAt || h.date;
        return (
          <div key={i} style={{ display:"flex", gap:10, marginBottom:8, alignItems:"flex-start" }}>
            <div style={{ width:22, height:22, borderRadius:"50%", background:`${s.color}22`, border:`1px solid ${s.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, flexShrink:0 }}>{s.icon}</div>
            <div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <span style={{ color:s.color, fontSize:11, fontWeight:600 }}>{s.label}</span>
                {ts && <span style={{ color:"#9E9D9B", fontSize:10 }}>{new Date(ts).toLocaleDateString()} {new Date(ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>}
              </div>
              {h.note && <p style={{ color:"#706E6B", fontSize:11, margin:"1px 0 0" }}>{h.note}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
