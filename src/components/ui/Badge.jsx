import React from 'react';

export default function Badge({ label, color="#0176D3" }) {
  return <span style={{ background:`${color}22`, color, border:`1px solid ${color}44`, borderRadius:20, padding:"2px 9px", fontSize:11, fontWeight:600, whiteSpace:"nowrap" }}>{label}</span>;
}
