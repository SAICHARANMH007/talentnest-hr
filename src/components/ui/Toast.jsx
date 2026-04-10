import React, { useEffect } from 'react';

export default function Toast({ msg, onClose }) {
  useEffect(() => { if(msg){ const t=setTimeout(onClose,3500); return ()=>clearTimeout(t); } }, [msg]);
  if (!msg) return null;
  return <div style={{ position:"fixed", top:20, right:20, zIndex:9999, background:msg.startsWith("❌")?"rgba(220,38,38,0.95)":"rgba(79,70,229,0.95)", color:"#181818", padding:"12px 20px", borderRadius:12, fontSize:13, fontWeight:600, boxShadow:"0 8px 32px rgba(0,0,0,0.5)", maxWidth:340 }}>{msg}</div>;
}
