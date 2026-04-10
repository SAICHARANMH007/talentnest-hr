import React from 'react';
import { card } from '../../constants/styles.js';
import Spinner from '../ui/Spinner.jsx';
import MiniSparkline from './MiniSparkline.jsx';

export default function KpiCard({ icon, label, value, sub, color="#0176D3", trend, sparkValues, onClick }) {
  const trendUp = trend > 0;
  return (
    <div onClick={onClick} style={{ ...card, position:"relative", overflow:"hidden", cursor: onClick ? "pointer" : "default" }}>
      <div style={{ position:"absolute", top:0, right:0, width:80, height:80, borderRadius:"50%", background:`${color}0d`, transform:"translate(20px,-20px)" }} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <div style={{ width:38, height:38, borderRadius:12, background:`${color}22`, border:`1px solid ${color}33`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{icon}</div>
        {trend !== undefined && (
          <div style={{ display:"flex", alignItems:"center", gap:3, background:trendUp?"rgba(34,197,94,0.12)":"rgba(186,5,23,0.12)", borderRadius:8, padding:"3px 8px" }}>
            <span style={{ color:trendUp?"#3BA755":"#FE5C4C", fontSize:10 }}>{trendUp?"▲":"▼"}</span>
            <span style={{ color:trendUp?"#3BA755":"#FE5C4C", fontSize:10, fontWeight:600 }}>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div style={{ color, fontSize:28, fontWeight:800, lineHeight:1 }}>{value ?? <Spinner />}</div>
      <div style={{ color:"#706E6B", fontSize:12, marginTop:4, fontWeight:500 }}>{label}</div>
      {sub && <div style={{ color:"#9E9D9B", fontSize:11, marginTop:2 }}>{sub}</div>}
      {sparkValues && <div style={{ marginTop:8 }}><MiniSparkline values={sparkValues} color={color} /></div>}
    </div>
  );
}
