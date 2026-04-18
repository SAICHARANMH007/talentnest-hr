import React, { useEffect } from 'react';

export default function Toast({ msg, onClose }) {
  useEffect(() => { if(msg){ const t=setTimeout(onClose,3500); return ()=>clearTimeout(t); } }, [msg]);
  if (!msg) return null;
  const isError = msg.startsWith("❌");
  const isSuccess = msg.startsWith("✅");
  const bg = isError ? "rgba(186,5,23,0.95)" : isSuccess ? "rgba(46,132,74,0.95)" : "rgba(1,118,211,0.95)";
  return (
    <div className="tn-toast-wrap" style={{ position:"fixed", top:20, right:20, zIndex:9999, background:bg, color:"#fff", padding:"13px 20px", borderRadius:12, fontSize:13, fontWeight:600, boxShadow:"0 8px 32px rgba(0,0,0,0.25)", maxWidth:360, display:'flex', alignItems:'center', gap:10 }}>
      <span style={{ flex:1 }}>{msg}</span>
      <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.7)', cursor:'pointer', fontSize:16, padding:0, lineHeight:1 }}>✕</button>
    </div>
  );
}
