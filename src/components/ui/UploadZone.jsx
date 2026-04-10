import React, { useRef } from 'react';
import Spinner from './Spinner.jsx';

export default function UploadZone({ label, onFile, loading, fileName }) {
  const ref = useRef();
  return (
    <div onClick={() => !loading && ref.current.click()} style={{ border:`2px dashed ${loading?"#014486":"rgba(1,118,211,0.4)"}`, borderRadius:16, padding:"24px 20px", textAlign:"center", cursor:"pointer", background:loading?"rgba(1,118,211,0.12)":"rgba(1,118,211,0.05)" }}>
      <input ref={ref} type="file" accept=".pdf,image/*" style={{ display:"none" }} onChange={e=>e.target.files[0]&&onFile(e.target.files[0])} />
      {loading
        ? <><div style={{ fontSize:26 }}><Spinner /></div><p style={{ color:"#0176D3", fontSize:12, marginTop:8 }}>AI Extracting…</p></>
        : fileName
          ? <><div style={{ fontSize:26 }}>✅</div><p style={{ color:"#181818", fontSize:13, marginTop:6 }}>{fileName}</p><p style={{ color:"#0176D3", fontSize:11 }}>Click to replace</p></>
          : <><div style={{ fontSize:26 }}>📄</div><p style={{ color:"#181818", fontSize:13, fontWeight:600, marginTop:6 }}>{label}</p><p style={{ color:"#706E6B", fontSize:11 }}>PDF or Image · AI auto-extracts</p></>}
    </div>
  );
}
