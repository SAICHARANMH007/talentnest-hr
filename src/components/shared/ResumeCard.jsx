import React, { useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// ResumeCard — premium resume template.
// Renders all candidate fields: personal, work history, education,
// certifications, skills, projects, achievements, volunteering, languages.
// HR and Candidates can print / save as PDF via browser.
// ─────────────────────────────────────────────────────────────────────────────

const parseJ = (s, fallback = []) => { try { return typeof s === 'string' ? JSON.parse(s || '[]') : (Array.isArray(s) ? s : fallback); } catch { return fallback; } };

const PRINT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .no-print { display: none !important; }
  @page { margin: 10mm; size: A4; }
  @media print { .page { box-shadow: none !important; border-radius: 0 !important; } }
  table { border-collapse: collapse; }
  a { color: #0369a1; text-decoration: none; }
`;

function Avatar({ name, size = 68 }) {
  const initials = (name || '?').split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:'linear-gradient(135deg,#0176D3,#014486)', display:'flex', alignItems:'center', justifyContent:'center', color:'#ffffff', fontSize:size*0.32, fontWeight:800, letterSpacing:1, flexShrink:0, border:'3px solid rgba(255,255,255,0.3)', boxShadow:'0 4px 16px rgba(1,118,211,0.4)' }}>
      {initials}
    </div>
  );
}

function SideSecTitle({ title }) {
  return (
    <div style={{ fontSize:9, fontWeight:700, letterSpacing:2, color:'#93c5fd', textTransform:'uppercase', marginBottom:8, paddingBottom:5, borderBottom:'1px solid rgba(147,197,253,0.2)', display:'flex', alignItems:'center', gap:6 }}>
      <div style={{ width:12, height:2, background:'#60a5fa', borderRadius:2 }}/>{title}
    </div>
  );
}

function SideBlock({ title, children }) {
  return <div style={{ marginBottom:18 }}><SideSecTitle title={title}/>{children}</div>;
}

function SideItem({ icon, children }) {
  return (
    <div style={{ display:'flex', gap:7, alignItems:'flex-start', marginBottom:5 }}>
      <span style={{ fontSize:10, opacity:0.7, flexShrink:0, marginTop:1 }}>{icon}</span>
      <span style={{ color:'#e2e8f0', fontSize:11, lineHeight:1.5, wordBreak:'break-word' }}>{children}</span>
    </div>
  );
}

function MainSecTitle({ title }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
      <div style={{ width:3, height:16, background:'linear-gradient(180deg,#0176D3,#014486)', borderRadius:2, flexShrink:0 }}/>
      <span style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:'#014486', textTransform:'uppercase' }}>{title}</span>
      <div style={{ flex:1, height:1, background:'linear-gradient(90deg,#bfdbfe,transparent)' }}/>
    </div>
  );
}

function MainBlock({ title, children }) {
  return <div style={{ marginBottom:20 }}><MainSecTitle title={title}/>{children}</div>;
}

function SkillPill({ label }) {
  return <span style={{ display:'inline-block', margin:'2px 3px 2px 0', padding:'2px 9px', borderRadius:20, background:'rgba(1,68,134,0.18)', color:'#93c5fd', border:'1px solid rgba(1,68,134,0.25)', fontSize:10, fontWeight:500 }}>{label}</span>;
}

function WorkCard({ entry }) {
  const period = entry.current ? `${entry.from} – Present` : entry.from && entry.to ? `${entry.from} – ${entry.to}` : entry.from || '';
  return (
    <div style={{ marginBottom:14, paddingBottom:12, borderBottom:'1px solid #f1f5f9', position:'relative', paddingLeft:12 }}>
      <div style={{ position:'absolute', left:0, top:4, width:2, height:'calc(100% - 12px)', background:'linear-gradient(180deg,#0ea5e9,transparent)', borderRadius:2 }}/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:4 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>{entry.title}</div>
          <div style={{ fontSize:11.5, color:'#0369a1', fontWeight:500, marginTop:1 }}>{entry.company}{entry.location ? ` · ${entry.location}` : ''}</div>
          {entry.type && <span style={{ fontSize:10, color:'#64748b' }}>{entry.type}</span>}
        </div>
        {period && <div style={{ background:'#dbeafe', color:'#014486', borderRadius:5, padding:'2px 8px', fontSize:10, fontWeight:600, flexShrink:0 }}>{period}</div>}
      </div>
      {entry.description && (
        <div style={{ marginTop:6, color:'#374151', fontSize:11.5, lineHeight:1.65, whiteSpace:'pre-line' }}>
          {entry.description}
        </div>
      )}
    </div>
  );
}

function EduCard({ entry }) {
  return (
    <div style={{ marginBottom:12, paddingBottom:10, borderBottom:'1px solid #f1f5f9' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:4 }}>
        <div>
          <div style={{ fontSize:12.5, fontWeight:700, color:'#0f172a' }}>{entry.degree}</div>
          <div style={{ fontSize:11.5, color:'#0369a1', fontWeight:500, marginTop:1 }}>{entry.institution}{entry.university && entry.university !== entry.institution ? ` · ${entry.university}` : ''}</div>
          {entry.location && <div style={{ fontSize:10.5, color:'#64748b' }}>{entry.location}</div>}
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          {entry.year && <div style={{ background:'#dbeafe', color:'#014486', borderRadius:5, padding:'2px 8px', fontSize:10, fontWeight:600 }}>{entry.year}</div>}
          {entry.grade && <div style={{ fontSize:10, color:'#64748b', marginTop:3 }}>{entry.grade}</div>}
        </div>
      </div>
    </div>
  );
}

function CertCard({ entry }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8, padding:'6px 10px', background:'#f8fafc', borderRadius:6, border:'1px solid #181818' }}>
      <div>
        <div style={{ fontSize:12, fontWeight:600, color:'#0f172a' }}>{entry.name}</div>
        {entry.issuer && <div style={{ fontSize:11, color:'#64748b' }}>{entry.issuer}</div>}
        {entry.url && <a href={entry.url} target="_blank" rel="noreferrer" style={{ fontSize:10, color:'#0369a1' }}>View Certificate ↗</a>}
      </div>
      {entry.year && <span style={{ background:'#dbeafe', color:'#014486', borderRadius:5, padding:'2px 7px', fontSize:10, fontWeight:600, flexShrink:0 }}>{entry.year}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ResumeCard({ candidate: c }) {
  const ref = useRef();
  if (!c) return null;

  const skills     = Array.isArray(c.skills) ? c.skills : (c.skills || '').split(',').map(s=>s.trim()).filter(Boolean);
  const languages  = Array.isArray(c.languages) ? c.languages : (c.languages || '').split(',').map(s=>s.trim()).filter(Boolean);
  const culture    = Array.isArray(c.culture) ? c.culture : (c.culture || '').split(',').map(s=>s.trim()).filter(Boolean);
  const workList   = parseJ(c.workHistory);
  const eduList    = parseJ(c.educationList);
  const certList   = parseJ(c.certifications);

  // Fallback: if no structured work history but has currentCompany, synthesize one entry
  const workItems = workList.length ? workList : (c.currentCompany ? [{id:'_', title:c.title||'Professional', company:c.currentCompany, location:c.location, from:'', to:'', current:true, description:''}] : []);
  // Fallback: if no structured edu but has education string
  const eduItems  = eduList.length ? eduList : (c.education ? [{id:'_', degree:c.education, institution:'', year:'', grade:''}] : []);

  const hasContent = c.name || c.email || c.title || skills.length || workItems.length;

  const handlePrint = () => {
    const content = ref.current.innerHTML;
    const win = window.open('', '_blank', 'width=960,height=760,scrollbars=yes');
    win.document.write(`<!DOCTYPE html><html><head><title>${c.name||'Resume'} — TalentNest HR</title><meta charset="utf-8"/><style>${PRINT_CSS}</style></head><body>${content}</body></html>`);
    win.document.close(); win.focus();
    setTimeout(()=>win.print(), 600);
  };

  return (
    <div ref={ref} className="page" style={{ fontFamily:"'Segoe UI',Inter,Arial,sans-serif", background:'#fff', color:'#1e293b', maxWidth:860, margin:'0 auto', position:'relative', fontSize:13 }}>

      {/* Print button */}
      <button className="no-print" onClick={handlePrint} style={{ position:'absolute', top:12, right:12, zIndex:20, background:'#EAF5FE', backdropFilter:'blur(8px)', color:'#181818', border:'1px solid #C9C7C5', borderRadius:8, padding:'6px 14px', fontSize:11.5, cursor:'pointer', fontWeight:600 }}>
        🖨 Print / Save PDF
      </button>

      {/* ── HEADER ── */}
      <div style={{ background:'linear-gradient(135deg, #032D60 0%, #014486 100%)', padding:'28px 36px 22px', display:'flex', alignItems:'center', gap:22, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-30, right:-30, width:180, height:180, borderRadius:'50%', background:'rgba(1,118,211,0.06)', pointerEvents:'none' }}/>
        <Avatar name={c.name} size={66}/>
        <div style={{ flex:1, minWidth:0 }}>
          <h1 style={{ color:'#f8fafc', fontSize:24, fontWeight:800, letterSpacing:0.3, margin:0 }}>{c.name || 'Your Name'}</h1>
          {c.title && <p style={{ color:'#38bdf8', fontSize:13, fontWeight:500, margin:'3px 0 0' }}>{c.title}{c.currentCompany ? ` · ${c.currentCompany}` : ''}</p>}
          <div style={{ display:'flex', gap:14, marginTop:8, flexWrap:'wrap' }}>
            {c.email    && <span style={{ color:'rgba(255,255,255,0.85)', fontSize:10.5 }}>✉ {c.email}</span>}
            {c.phone    && <span style={{ color:'rgba(255,255,255,0.85)', fontSize:10.5 }}>☎ {c.phone}</span>}
            {c.location && <span style={{ color:'rgba(255,255,255,0.85)', fontSize:10.5 }}>⊙ {c.location}</span>}
            {c.linkedin && <span style={{ color:'#93c5fd', fontSize:10.5 }}>↗ {c.linkedin.replace(/https?:\/\/(www\.)?/,'').replace(/\/$/,'')}</span>}
            {c.github   && <span style={{ color:'rgba(255,255,255,0.85)', fontSize:10.5 }}>⎇ {c.github.replace(/https?:\/\/(www\.)?/,'').replace(/\/$/,'')}</span>}
            {c.portfolio && <span style={{ color:'#93c5fd', fontSize:10.5 }}>🌐 {c.portfolio.replace(/https?:\/\/(www\.)?/,'').replace(/\/$/,'')}</span>}
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end', flexShrink:0 }}>
          {(parseInt(c.experience)||0) > 0 && (
            <div style={{ textAlign:'center', background:'rgba(14,165,233,0.15)', border:'1px solid rgba(14,165,233,0.3)', borderRadius:10, padding:'6px 14px' }}>
              <div style={{ color:'#38bdf8', fontSize:20, fontWeight:800, lineHeight:1 }}>{c.experience}</div>
              <div style={{ color:'#706E6B', fontSize:9, marginTop:2 }}>YRS EXP</div>
            </div>
          )}
          {c.availability && <div style={{ background:'rgba(1,118,211,0.12)', border:'1px solid rgba(1,118,211,0.25)', borderRadius:8, padding:'3px 10px', color:'#0176D3', fontSize:10, fontWeight:600 }}>⚡ {c.availability}</div>}
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ display:'grid', gridTemplateColumns:'230px 1fr' }}>

        {/* ── SIDEBAR ── */}
        <div style={{ background:'#1a3a5c', padding:'22px 16px', borderRight:'1px solid rgba(1,118,211,0.15)' }}>

          <SideBlock title="Contact">
            {c.email    && <SideItem icon="✉">{c.email}</SideItem>}
            {c.phone    && <SideItem icon="☎">{c.phone}</SideItem>}
            {c.location && <SideItem icon="⊙">{c.location}</SideItem>}
            {c.linkedin && <SideItem icon="↗"><a href={c.linkedin} target="_blank" rel="noreferrer" style={{ color:'#38bdf8' }}>{c.linkedin.replace(/https?:\/\/(www\.)?/,'').replace(/\/$/,'')}</a></SideItem>}
            {c.github   && <SideItem icon="⎇"><a href={c.github} target="_blank" rel="noreferrer" style={{ color:'#38bdf8' }}>{c.github.replace(/https?:\/\/(www\.)?/,'').replace(/\/$/,'')}</a></SideItem>}
            {c.portfolio && <SideItem icon="🌐"><a href={c.portfolio} target="_blank" rel="noreferrer" style={{ color:'#38bdf8' }}>{c.portfolio.replace(/https?:\/\/(www\.)?/,'').replace(/\/$/,'')}</a></SideItem>}
          </SideBlock>

          {(parseInt(c.experience)||0) > 0 && (
            <SideBlock title="Experience">
              <div style={{ fontSize:22, fontWeight:800, color:'#60a5fa', lineHeight:1 }}>{c.experience}</div>
              <div style={{ fontSize:10, color:'#93c5fd', marginTop:2 }}>years total</div>
              {c.currentCompany && <div style={{ fontSize:11.5, color:'#e2e8f0', marginTop:6 }}>Currently at<br/><span style={{ color:'#93c5fd', fontWeight:600 }}>{c.currentCompany}</span></div>}
            </SideBlock>
          )}

          {skills.length > 0 && (
            <SideBlock title="Technical Skills">
              <div style={{ lineHeight:1.9 }}>
                {skills.slice(0,28).map((sk,i) => <SkillPill key={sk} label={sk} i={i}/>)}
              </div>
            </SideBlock>
          )}

          {languages.length > 0 && (
            <SideBlock title="Languages">
              {languages.map(l => <div key={l} style={{ color:'#e2e8f0', fontSize:11, marginBottom:3 }}>• {l}</div>)}
            </SideBlock>
          )}

          {c.industry && (
            <SideBlock title="Industry">
              <div style={{ color:'#e2e8f0', fontSize:11.5 }}>{c.industry}</div>
            </SideBlock>
          )}

          {culture.length > 0 && (
            <SideBlock title="Work Style">
              <div style={{ lineHeight:1.9 }}>
                {culture.map(t => <span key={t} style={{ display:'inline-block', margin:'2px 3px 2px 0', padding:'2px 9px', borderRadius:20, background:'rgba(96,165,250,0.12)', color:'#93c5fd', border:'1px solid rgba(96,165,250,0.2)', fontSize:10, fontWeight:500 }}>{t}</span>)}
              </div>
            </SideBlock>
          )}
        </div>

        {/* ── MAIN ── */}
        <div style={{ padding:'24px 28px', background:'#fff' }}>

          {/* Summary */}
          {c.summary && (
            <MainBlock title="Professional Summary">
              <p style={{ color:'#374151', fontSize:12.5, lineHeight:1.75, borderLeft:'3px solid #bae6fd', paddingLeft:12, fontStyle:'italic', margin:0 }}>{c.summary}</p>
            </MainBlock>
          )}

          {/* Work Experience */}
          {workItems.length > 0 && (
            <MainBlock title="Work Experience">
              {workItems.map(e => <WorkCard key={e.id} entry={e}/>)}
            </MainBlock>
          )}

          {/* Education */}
          {eduItems.length > 0 && (
            <MainBlock title="Education">
              {eduItems.map(e => <EduCard key={e.id||e.degree} entry={e}/>)}
            </MainBlock>
          )}

          {/* Certifications */}
          {certList.length > 0 && (
            <MainBlock title="Certifications">
              {certList.map(e => <CertCard key={e.id||e.name} entry={e}/>)}
            </MainBlock>
          )}

          {/* Skills overview (if many) */}
          {skills.length > 8 && (
            <MainBlock title="Core Competencies">
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {skills.slice(0,24).map((sk,i) => {
                  const colors = [['#dbeafe','#014486'],['#cffafe','#0e7490'],['#fef9c3','#854d0e']];
                  const [bg,col] = colors[i%3];
                  return <span key={sk} style={{ background:bg, color:col, border:`1px solid ${bg}`, borderRadius:20, padding:'3px 10px', fontSize:10.5, fontWeight:500 }}>{sk}</span>;
                })}
              </div>
            </MainBlock>
          )}

          {/* Projects */}
          {c.projects && (
            <MainBlock title="Key Projects">
              <div style={{ color:'#374151', fontSize:12, lineHeight:1.75, whiteSpace:'pre-line', background:'#fafafa', borderRadius:7, padding:'10px 14px', border:'1px solid #f1f5f9' }}>{c.projects}</div>
            </MainBlock>
          )}

          {/* Achievements */}
          {c.achievements && (
            <MainBlock title="Achievements & Awards">
              <div style={{ color:'#374151', fontSize:12, lineHeight:1.75, whiteSpace:'pre-line' }}>{c.achievements}</div>
            </MainBlock>
          )}

          {/* Volunteering */}
          {c.volunteering && (
            <MainBlock title="Volunteering & Activities">
              <div style={{ color:'#374151', fontSize:12, lineHeight:1.75, whiteSpace:'pre-line' }}>{c.volunteering}</div>
            </MainBlock>
          )}

          {!hasContent && (
            <div style={{ textAlign:'center', padding:'40px 20px', color:'#706E6B' }}>
              <div style={{ fontSize:32, marginBottom:10 }}>📋</div>
              <p>Fill in your profile details to generate your resume.</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background:'#032D60', padding:'7px 28px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ color:'rgba(255,255,255,0.65)', fontSize:10 }}>Generated by TalentNest HR · talentnesthr.com</span>
        <span style={{ color:'rgba(255,255,255,0.65)', fontSize:10 }}>hr@talentnesthr.com · +91 79955 35539</span>
      </div>
    </div>
  );
}
