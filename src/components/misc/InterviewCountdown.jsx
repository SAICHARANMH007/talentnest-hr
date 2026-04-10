import React, { useState, useEffect } from 'react';

export default function InterviewCountdown({ date, time }) {
  const target = new Date(`${date}T${time}`).getTime();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(()=>setNow(Date.now()),60000); return ()=>clearInterval(t); }, []);
  const diff = target - now;
  if (diff < 0) return <span style={{ color:"#3BA755", fontSize:11 }}>Interview passed</span>;
  const days = Math.floor(diff/86400000), hrs = Math.floor((diff%86400000)/3600000), mins = Math.floor((diff%3600000)/60000);
  return (
    <div style={{ display:"flex", gap:6 }}>
      {days > 0 && <div style={{ textAlign:"center" }}><div style={{ color:"#181818", fontWeight:700, fontSize:16 }}>{days}</div><div style={{ color:"#706E6B", fontSize:9 }}>days</div></div>}
      <div style={{ textAlign:"center" }}><div style={{ color:"#181818", fontWeight:700, fontSize:16 }}>{hrs}</div><div style={{ color:"#706E6B", fontSize:9 }}>hrs</div></div>
      <div style={{ textAlign:"center" }}><div style={{ color:"#181818", fontWeight:700, fontSize:16 }}>{mins}</div><div style={{ color:"#706E6B", fontSize:9 }}>min</div></div>
    </div>
  );
}
