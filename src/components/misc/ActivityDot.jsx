import React from 'react';
import { SM } from '../../constants/stages.js';

export default function ActivityDot({ stage }) {
  const s = SM[stage] || { color:"#0176D3", icon:"•" };
  return <div style={{ width:24, height:24, borderRadius:"50%", background:`${s.color}22`, border:`1px solid ${s.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, flexShrink:0 }}>{s.icon}</div>;
}
