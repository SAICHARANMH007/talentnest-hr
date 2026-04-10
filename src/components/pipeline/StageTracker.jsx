import React from 'react';
import { STAGES } from '../../constants/stages.js';
import Badge from '../ui/Badge.jsx';

export default function StageTracker({ stage }) {
  const main = STAGES.filter(s => s.id !== "rejected");
  const isRejected = stage === "rejected";
  const curIdx = main.findIndex(s => s.id === stage);
  return (
    <div style={{ display:"flex", alignItems:"center", overflowX:"auto", paddingBottom:4 }}>
      {main.map((s, i) => {
        const done = i < curIdx, active = s.id === stage;
        const c = active ? s.color : done ? "#3BA755" : "#EAF5FE";
        return (
          <div key={s.id} style={{ display:"flex", alignItems:"center", flexShrink:0 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:active?s.color:done?"rgba(74,222,128,0.2)":"#F3F2F2", border:`2px solid ${c}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:active?"#fff":done?"#3BA755":"#9E9D9B" }}>
                {done ? "✓" : s.icon}
              </div>
              <span style={{ fontSize:9, color:active?s.color:done?"#3BA755":"#9E9D9B", fontWeight:active?700:400, whiteSpace:"nowrap" }}>{s.label}</span>
            </div>
            {i < main.length-1 && <div style={{ width:20, height:2, background:done?"rgba(74,222,128,0.4)":"#FAFAF9", marginBottom:14, flexShrink:0 }} />}
          </div>
        );
      })}
      {isRejected && <div style={{ marginLeft:8, display:"flex", alignItems:"center", gap:4 }}><div style={{ width:2, height:20, background:"rgba(186,5,23,0.4)" }} /><Badge label="✕ Rejected" color="#BA0517" /></div>}
    </div>
  );
}
