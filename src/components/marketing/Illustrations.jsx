// Lightweight inline SVG illustrations for marketing/landing pages.
// Pure SVG (no external assets/network calls) so pages never break or show
// broken-image/white-screen states. Colors follow the brand palette
// (#0176D3 / #00C2CB / #032D60) and adapt via currentColor where useful.

export function RecruiterIllustration({ style }) {
  return (
    <svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Recruiter reviewing candidate profiles on a laptop">
      <ellipse cx="200" cy="290" rx="150" ry="18" fill="#0176D3" opacity="0.08" />
      {/* Laptop */}
      <rect x="90" y="120" width="220" height="140" rx="14" fill="#032D60" />
      <rect x="106" y="136" width="188" height="108" rx="6" fill="#E6F4FF" />
      <rect x="60" y="252" width="280" height="20" rx="10" fill="#0176D3" />
      {/* Screen content - candidate cards */}
      <rect x="122" y="150" width="76" height="76" rx="8" fill="#0176D3" opacity="0.18" />
      <circle cx="160" cy="176" r="16" fill="#0176D3" />
      <rect x="138" y="200" width="44" height="8" rx="4" fill="#0176D3" opacity="0.5" />
      <rect x="212" y="150" width="68" height="14" rx="7" fill="#00C2CB" opacity="0.6" />
      <rect x="212" y="172" width="68" height="14" rx="7" fill="#00C2CB" opacity="0.4" />
      <rect x="212" y="194" width="48" height="14" rx="7" fill="#00C2CB" opacity="0.4" />
      {/* Person */}
      <circle cx="200" cy="60" r="34" fill="#FDB897" />
      <path d="M166 60a34 34 0 0 1 68 0v6h-68z" fill="#032D60" />
      <path d="M120 200c4-46 36-78 80-78s76 32 80 78z" fill="#0176D3" />
      <path d="M120 200c4-46 36-78 80-78v78z" fill="#00C2CB" opacity="0.55" />
      {/* Floating accents */}
      <circle cx="60" cy="70" r="10" fill="#00C2CB" opacity="0.5" />
      <circle cx="350" cy="100" r="14" fill="#F59E0B" opacity="0.4" />
      <rect x="320" y="40" width="36" height="36" rx="8" fill="#0176D3" opacity="0.15" transform="rotate(15 338 58)" />
    </svg>
  );
}

export function CollegePlacementIllustration({ style }) {
  return (
    <svg viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Graduate students celebrating placement success">
      <ellipse cx="200" cy="295" rx="160" ry="16" fill="#0176D3" opacity="0.08" />
      {/* Podium / building */}
      <rect x="150" y="180" width="100" height="100" rx="6" fill="#032D60" />
      <rect x="170" y="200" width="20" height="24" rx="3" fill="#00C2CB" opacity="0.5" />
      <rect x="210" y="200" width="20" height="24" rx="3" fill="#00C2CB" opacity="0.5" />
      <rect x="170" y="236" width="60" height="44" rx="3" fill="#0176D3" opacity="0.5" />
      {/* Student 1 */}
      <circle cx="100" cy="150" r="26" fill="#FDB897" />
      <path d="M74 150a26 26 0 0 1 52 0v4H74z" fill="#1F2937" />
      <path d="M58 240c2-40 24-66 50-66s48 26 50 66z" fill="#0176D3" />
      {/* Graduation cap on student 1 */}
      <path d="M74 142l26-12 26 12-26 12z" fill="#032D60" />
      <path d="M124 144v14l-2 8-2-8v-14z" fill="#032D60" />
      {/* Student 2 */}
      <circle cx="300" cy="150" r="26" fill="#F4A988" />
      <path d="M274 150a26 26 0 0 1 52 0v4H274z" fill="#3B2415" />
      <path d="M258 240c2-40 24-66 50-66s48 26 50 66z" fill="#00C2CB" />
      <path d="M274 142l26-12 26 12-26 12z" fill="#032D60" />
      <path d="M324 144v14l-2 8-2-8v-14z" fill="#032D60" />
      {/* Center graduate raising diploma */}
      <circle cx="200" cy="120" r="30" fill="#FDC8A0" />
      <path d="M170 120a30 30 0 0 1 60 0v4h-60z" fill="#111827" />
      <path d="M150 230c2-46 24-78 50-78s48 32 50 78z" fill="#F59E0B" />
      <rect x="216" y="56" width="10" height="46" rx="5" fill="#0176D3" transform="rotate(20 221 79)" />
      <rect x="226" y="48" width="34" height="22" rx="3" fill="#FFFFFF" stroke="#0176D3" strokeWidth="2" transform="rotate(20 243 59)" />
      <path d="M170 112l30-14 30 14-30 14z" fill="#032D60" />
      <path d="M230 114v16l-2 9-2-9v-16z" fill="#032D60" />
      {/* Confetti */}
      <circle cx="60" cy="60" r="6" fill="#00C2CB" />
      <rect x="320" y="50" width="12" height="12" rx="2" fill="#F59E0B" transform="rotate(20 326 56)" />
      <circle cx="340" cy="120" r="5" fill="#0176D3" opacity="0.6" />
      <rect x="40" y="120" width="10" height="10" rx="2" fill="#10B981" transform="rotate(-15 45 125)" />
    </svg>
  );
}

export function UnifiedPlatformIllustration({ style }) {
  return (
    <svg viewBox="0 0 360 260" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="One unified dashboard bringing jobs, pipeline, chat and analytics together">
      {/* Connector lines from satellite tools into central dashboard */}
      <path d="M70 60 L150 95" stroke="#00C2CB" strokeWidth="2.5" strokeDasharray="4 6" strokeLinecap="round" />
      <path d="M290 60 L210 95" stroke="#0176D3" strokeWidth="2.5" strokeDasharray="4 6" strokeLinecap="round" />
      <path d="M60 200 L150 165" stroke="#7C3AED" strokeWidth="2.5" strokeDasharray="4 6" strokeLinecap="round" />
      <path d="M300 200 L210 165" stroke="#10B981" strokeWidth="2.5" strokeDasharray="4 6" strokeLinecap="round" />

      {/* Central dashboard screen */}
      <rect x="110" y="55" width="140" height="150" rx="14" fill="#032D60" />
      <rect x="110" y="55" width="140" height="28" rx="14" fill="#0176D3" />
      <circle cx="124" cy="69" r="4" fill="#fff" opacity="0.7" />
      <circle cx="138" cy="69" r="4" fill="#00C2CB" />
      <circle cx="152" cy="69" r="4" fill="#fff" opacity="0.4" />
      {/* dashboard content: mini kanban + chart */}
      <rect x="122" y="95" width="34" height="48" rx="6" fill="#0176D3" opacity="0.25" />
      <rect x="122" y="95" width="34" height="10" rx="5" fill="#00C2CB" />
      <rect x="163" y="95" width="34" height="68" rx="6" fill="#0176D3" opacity="0.25" />
      <rect x="163" y="95" width="34" height="10" rx="5" fill="#0176D3" />
      <rect x="204" y="95" width="34" height="32" rx="6" fill="#0176D3" opacity="0.25" />
      <rect x="204" y="95" width="34" height="10" rx="5" fill="#10B981" />
      <rect x="122" y="178" width="116" height="14" rx="7" fill="#00C2CB" opacity="0.5" />

      {/* Satellite: Jobs */}
      <g>
        <circle cx="48" cy="48" r="26" fill="#00C2CB" opacity="0.14" />
        <rect x="35" y="38" width="26" height="20" rx="4" fill="#00C2CB" />
        <rect x="35" y="38" width="26" height="6" rx="3" fill="#032D60" opacity="0.5" />
      </g>
      {/* Satellite: Analytics */}
      <g>
        <circle cx="312" cy="48" r="26" fill="#0176D3" opacity="0.14" />
        <rect x="298" y="44" width="6" height="14" rx="2" fill="#0176D3" />
        <rect x="308" y="38" width="6" height="20" rx="2" fill="#0176D3" />
        <rect x="318" y="48" width="6" height="10" rx="2" fill="#00C2CB" />
      </g>
      {/* Satellite: Chat */}
      <g>
        <circle cx="40" cy="212" r="26" fill="#7C3AED" opacity="0.14" />
        <path d="M26 202h28v16a4 4 0 0 1-4 4H34l-8 6v-6h0a4 4 0 0 1-4-4v-12a4 4 0 0 1 4-4z" fill="#7C3AED" />
      </g>
      {/* Satellite: Offers/Docs */}
      <g>
        <circle cx="320" cy="212" r="26" fill="#10B981" opacity="0.14" />
        <rect x="306" y="198" width="22" height="28" rx="3" fill="#10B981" />
        <path d="M311 212l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    </svg>
  );
}

export function TalentMatchIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 280" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Matching candidate skills to job requirements">
      <rect x="20" y="40" width="120" height="160" rx="16" fill="#032D60" />
      <rect x="40" y="64" width="80" height="10" rx="5" fill="#00C2CB" />
      <rect x="40" y="86" width="60" height="8" rx="4" fill="#FFFFFF" opacity="0.5" />
      <rect x="40" y="104" width="70" height="8" rx="4" fill="#FFFFFF" opacity="0.35" />
      <circle cx="80" cy="150" r="22" fill="#0176D3" />
      <path d="M70 150l7 7 13-15" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="180" y="60" width="120" height="160" rx="16" fill="#0176D3" opacity="0.12" stroke="#0176D3" strokeWidth="2" strokeDasharray="6 6" />
      <rect x="200" y="84" width="80" height="10" rx="5" fill="#0176D3" />
      <rect x="200" y="106" width="60" height="8" rx="4" fill="#0176D3" opacity="0.4" />
      <rect x="200" y="124" width="70" height="8" rx="4" fill="#0176D3" opacity="0.25" />
      <circle cx="240" cy="172" r="22" fill="#00C2CB" />
      <path d="M230 172l7 7 13-15" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Connector */}
      <path d="M142 130h36" stroke="#F59E0B" strokeWidth="4" strokeDasharray="2 8" strokeLinecap="round" />
      <circle cx="160" cy="130" r="14" fill="#F59E0B" opacity="0.18" />
      <path d="M154 130l4 4 8-8" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function TeamGrowthIllustration({ style }) {
  return (
    <svg viewBox="0 0 380 280" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Team collaborating around hiring growth analytics">
      <ellipse cx="190" cy="265" rx="160" ry="14" fill="#0176D3" opacity="0.08" />
      {/* Laptop / chart */}
      <rect x="220" y="120" width="120" height="90" rx="10" fill="#032D60" />
      <rect x="232" y="132" width="96" height="56" rx="4" fill="#E6F4FF" />
      <polyline points="240,176 258,158 274,168 296,140 318,150" fill="none" stroke="#0176D3" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="318" cy="150" r="5" fill="#00C2CB" />
      <rect x="200" y="210" width="160" height="14" rx="7" fill="#0176D3" />
      {/* Person 1 */}
      <circle cx="90" cy="110" r="28" fill="#FDB897" />
      <path d="M62 110a28 28 0 0 1 56 0v4H62z" fill="#1F2937" />
      <path d="M44 210c2-44 22-72 46-72s44 28 46 72z" fill="#0176D3" />
      {/* Person 2 */}
      <circle cx="170" cy="100" r="30" fill="#F4A988" />
      <path d="M140 100a30 30 0 0 1 60 0v6h-60z" fill="#3B2415" />
      <path d="M120 210c2-48 24-80 50-80s48 32 50 80z" fill="#00C2CB" />
      {/* Phone in hand */}
      <rect x="156" y="150" width="22" height="36" rx="4" fill="#032D60" />
      <rect x="160" y="156" width="14" height="20" rx="2" fill="#00C2CB" />
      {/* Floating bars */}
      <rect x="40" y="40" width="14" height="36" rx="4" fill="#F59E0B" opacity="0.5" />
      <rect x="60" y="24" width="14" height="52" rx="4" fill="#10B981" opacity="0.5" />
      <rect x="80" y="48" width="14" height="28" rx="4" fill="#0176D3" opacity="0.5" />
    </svg>
  );
}

export function CareerJourneyIllustration({ style }) {
  return (
    <svg viewBox="0 0 360 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Candidate progressing along their career journey">
      <path d="M20 200C90 200 90 140 160 140S230 80 300 80" stroke="#0176D3" strokeWidth="4" strokeDasharray="8 10" strokeLinecap="round" fill="none" opacity="0.5" />
      {/* Flag / offer at end */}
      <circle cx="320" cy="60" r="28" fill="#0176D3" opacity="0.12" />
      <rect x="312" y="34" width="6" height="44" rx="3" fill="#032D60" />
      <path d="M318 36l28 10-28 10z" fill="#00C2CB" />
      {/* Walking person */}
      <circle cx="60" cy="150" r="24" fill="#FDC8A0" />
      <path d="M36 150a24 24 0 0 1 48 0v4H36z" fill="#111827" />
      <path d="M30 230c2-38 16-62 30-62s28 24 30 62z" fill="#F59E0B" />
      <rect x="84" y="180" width="22" height="30" rx="4" fill="#032D60" transform="rotate(15 95 195)" />
      {/* Checkpoints */}
      <circle cx="160" cy="140" r="9" fill="#10B981" />
      <circle cx="230" cy="100" r="9" fill="#00C2CB" />
    </svg>
  );
}

export function VerifiedShieldIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 280" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Shield with verified checkmark representing trusted identity">
      <ellipse cx="160" cy="255" rx="120" ry="14" fill="#0176D3" opacity="0.08" />
      <path d="M160 30l90 32v62c0 64-38 110-90 130-52-20-90-66-90-130V62z" fill="#032D60" />
      <path d="M160 30l90 32v62c0 64-38 110-90 130z" fill="#0176D3" opacity="0.35" />
      <circle cx="160" cy="124" r="44" fill="#00C2CB" opacity="0.18" />
      <path d="M138 124l16 16 30-32" stroke="#00C2CB" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* floating ID chips */}
      <rect x="30" y="60" width="56" height="36" rx="6" fill="#FFFFFF" stroke="#0176D3" strokeWidth="2" transform="rotate(-12 58 78)" />
      <circle cx="46" cy="76" r="7" fill="#0176D3" transform="rotate(-12 58 78)" />
      <rect x="58" y="72" width="20" height="5" rx="2" fill="#0176D3" opacity="0.5" transform="rotate(-12 58 78)" />
      <rect x="234" y="180" width="56" height="36" rx="6" fill="#FFFFFF" stroke="#00C2CB" strokeWidth="2" transform="rotate(10 262 198)" />
      <circle cx="250" cy="198" r="7" fill="#00C2CB" transform="rotate(10 262 198)" />
      <rect x="262" y="194" width="20" height="5" rx="2" fill="#00C2CB" opacity="0.5" transform="rotate(10 262 198)" />
    </svg>
  );
}

export function PipelineBoardIllustration({ style }) {
  return (
    <svg viewBox="0 0 360 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Recruiting pipeline kanban board with candidate cards">
      <rect x="10" y="20" width="100" height="200" rx="12" fill="#F1F5F9" />
      <rect x="125" y="20" width="100" height="200" rx="12" fill="#E6F4FF" />
      <rect x="240" y="20" width="110" height="200" rx="12" fill="#E8FBF6" />
      <rect x="22" y="36" width="76" height="10" rx="5" fill="#94A3B8" />
      <rect x="137" y="36" width="76" height="10" rx="5" fill="#0176D3" />
      <rect x="252" y="36" width="86" height="10" rx="5" fill="#10B981" />
      {/* cards col 1 */}
      <rect x="22" y="58" width="76" height="46" rx="8" fill="#FFFFFF" stroke="#E2E8F0" />
      <circle cx="38" cy="74" r="9" fill="#94A3B8" />
      <rect x="52" y="68" width="36" height="6" rx="3" fill="#94A3B8" opacity="0.6" />
      <rect x="52" y="80" width="28" height="6" rx="3" fill="#94A3B8" opacity="0.4" />
      <rect x="22" y="112" width="76" height="46" rx="8" fill="#FFFFFF" stroke="#E2E8F0" />
      <circle cx="38" cy="128" r="9" fill="#94A3B8" />
      <rect x="52" y="122" width="36" height="6" rx="3" fill="#94A3B8" opacity="0.6" />
      <rect x="52" y="134" width="28" height="6" rx="3" fill="#94A3B8" opacity="0.4" />
      {/* cards col 2 */}
      <rect x="137" y="58" width="76" height="46" rx="8" fill="#FFFFFF" stroke="#0176D3" strokeWidth="1.5" />
      <circle cx="153" cy="74" r="9" fill="#0176D3" />
      <rect x="167" y="68" width="36" height="6" rx="3" fill="#0176D3" opacity="0.6" />
      <rect x="167" y="80" width="28" height="6" rx="3" fill="#0176D3" opacity="0.4" />
      <rect x="137" y="112" width="76" height="46" rx="8" fill="#FFFFFF" stroke="#0176D3" strokeWidth="1.5" />
      <circle cx="153" cy="128" r="9" fill="#0176D3" />
      <rect x="167" y="122" width="36" height="6" rx="3" fill="#0176D3" opacity="0.6" />
      <rect x="167" y="134" width="28" height="6" rx="3" fill="#0176D3" opacity="0.4" />
      {/* cards col 3 — selected */}
      <rect x="252" y="58" width="86" height="56" rx="8" fill="#FFFFFF" stroke="#10B981" strokeWidth="2" />
      <circle cx="270" cy="76" r="11" fill="#10B981" />
      <path d="M264 76l4 4 8-9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="288" y="70" width="40" height="6" rx="3" fill="#10B981" opacity="0.7" />
      <rect x="288" y="82" width="32" height="6" rx="3" fill="#10B981" opacity="0.4" />
      <rect x="262" y="98" width="64" height="8" rx="4" fill="#10B981" opacity="0.18" />
    </svg>
  );
}

export function AnalyticsChartIllustration({ style }) {
  return (
    <svg viewBox="0 0 360 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Hiring analytics dashboard with charts and metrics">
      <rect x="10" y="10" width="340" height="220" rx="16" fill="#032D60" />
      <rect x="30" y="32" width="120" height="14" rx="7" fill="#FFFFFF" opacity="0.85" />
      <rect x="30" y="56" width="80" height="10" rx="5" fill="#00C2CB" opacity="0.6" />
      {/* bar chart */}
      <rect x="30" y="160" width="28" height="50" rx="4" fill="#0176D3" />
      <rect x="68" y="130" width="28" height="80" rx="4" fill="#00C2CB" />
      <rect x="106" y="100" width="28" height="110" rx="4" fill="#0176D3" opacity="0.6" />
      <rect x="144" y="142" width="28" height="68" rx="4" fill="#10B981" />
      {/* line chart */}
      <polyline points="200,170 230,140 260,155 290,110 320,95" fill="none" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="200" cy="170" r="5" fill="#F59E0B" />
      <circle cx="230" cy="140" r="5" fill="#F59E0B" />
      <circle cx="260" cy="155" r="5" fill="#F59E0B" />
      <circle cx="290" cy="110" r="5" fill="#F59E0B" />
      <circle cx="320" cy="95" r="5" fill="#F59E0B" />
      {/* KPI chip */}
      <rect x="200" y="32" width="120" height="46" rx="10" fill="#FFFFFF" opacity="0.06" />
      <rect x="212" y="42" width="40" height="8" rx="4" fill="#FFFFFF" opacity="0.5" />
      <rect x="212" y="56" width="60" height="12" rx="6" fill="#00C2CB" />
    </svg>
  );
}

export function OnboardingChecklistIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 260" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Digital onboarding checklist with completed tasks">
      <ellipse cx="160" cy="245" rx="120" ry="13" fill="#0176D3" opacity="0.08" />
      <rect x="60" y="20" width="200" height="220" rx="14" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
      <rect x="84" y="44" width="120" height="14" rx="7" fill="#032D60" />
      <rect x="84" y="68" width="80" height="8" rx="4" fill="#94A3B8" opacity="0.6" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <circle cx="98" cy={108 + i * 32} r="12" fill={i < 3 ? '#10B981' : '#F1F5F9'} stroke={i < 3 ? '#10B981' : '#CBD5E1'} strokeWidth="2" />
          {i < 3 && <path d={`M92 ${108 + i * 32}l4 4 8-9`} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
          <rect x="120" y={100 + i * 32} width={i === 3 ? 90 : 110} height="16" rx="8" fill={i < 3 ? '#0176D3' : '#CBD5E1'} opacity={i < 3 ? 0.18 : 0.5} />
          <rect x="130" y={104 + i * 32} width={i === 3 ? 60 : 80} height="8" rx="4" fill={i < 3 ? '#0176D3' : '#94A3B8'} opacity="0.7" />
        </g>
      ))}
      {/* floating doc */}
      <rect x="220" y="0" width="64" height="80" rx="8" fill="#00C2CB" opacity="0.15" transform="rotate(8 252 40)" />
      <path d="M236 18h32M236 30h32M236 42h20" stroke="#00C2CB" strokeWidth="3" strokeLinecap="round" transform="rotate(8 252 40)" />
    </svg>
  );
}

export function PayrollCardIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Payroll and compliance card with payslip and currency">
      <ellipse cx="160" cy="225" rx="120" ry="13" fill="#0176D3" opacity="0.08" />
      <rect x="40" y="40" width="180" height="120" rx="14" fill="#0176D3" />
      <rect x="40" y="40" width="180" height="120" rx="14" fill="url(#payrollGrad)" opacity="0.001" />
      <circle cx="190" cy="70" r="26" fill="#00C2CB" opacity="0.35" />
      <rect x="58" y="100" width="100" height="10" rx="5" fill="#FFFFFF" opacity="0.85" />
      <rect x="58" y="120" width="70" height="8" rx="4" fill="#FFFFFF" opacity="0.5" />
      <rect x="58" y="64" width="40" height="14" rx="4" fill="#FFFFFF" opacity="0.9" />
      {/* payslip card */}
      <rect x="140" y="120" width="150" height="100" rx="12" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
      <rect x="158" y="138" width="80" height="10" rx="5" fill="#032D60" />
      <rect x="158" y="158" width="60" height="8" rx="4" fill="#94A3B8" opacity="0.6" />
      <rect x="158" y="174" width="100" height="2" fill="#E2E8F0" />
      <rect x="158" y="186" width="50" height="10" rx="5" fill="#10B981" />
      <text x="158" y="208" fontFamily="Arial, sans-serif" fontSize="20" fontWeight="900" fill="#10B981">₹</text>
      <rect x="180" y="198" width="60" height="10" rx="5" fill="#10B981" opacity="0.7" />
    </svg>
  );
}

export function VideoInterviewIllustration({ style }) {
  return (
    <svg viewBox="0 0 360 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Video interview call between recruiter and candidate">
      <ellipse cx="180" cy="225" rx="150" ry="13" fill="#0176D3" opacity="0.08" />
      <rect x="20" y="30" width="320" height="180" rx="16" fill="#032D60" />
      <rect x="40" y="50" width="150" height="100" rx="10" fill="#0176D3" opacity="0.25" />
      <circle cx="115" cy="90" r="22" fill="#FDB897" />
      <path d="M93 90a22 22 0 0 1 44 0v4H93z" fill="#1F2937" />
      <path d="M80 150c2-26 16-44 35-44s33 18 35 44z" fill="#0176D3" />
      <rect x="200" y="50" width="140" height="100" rx="10" fill="#00C2CB" opacity="0.18" />
      <circle cx="270" cy="90" r="22" fill="#F4A988" />
      <path d="M248 90a22 22 0 0 1 44 0v6h-44z" fill="#3B2415" />
      <path d="M236 150c2-26 16-44 34-44s32 18 34 44z" fill="#00C2CB" />
      {/* control bar */}
      <rect x="120" y="172" width="120" height="28" rx="14" fill="#FFFFFF" opacity="0.08" />
      <circle cx="150" cy="186" r="9" fill="#10B981" />
      <circle cx="180" cy="186" r="9" fill="#FFFFFF" opacity="0.7" />
      <circle cx="210" cy="186" r="9" fill="#BA0517" />
    </svg>
  );
}

export function HandshakeDealIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Two professionals shaking hands on a hiring deal">
      <ellipse cx="160" cy="225" rx="130" ry="13" fill="#0176D3" opacity="0.08" />
      <path d="M40 220c0-50 30-90 60-90s44 16 60 16 30-16 60-16 60 40 60 90z" fill="#E6F4FF" />
      {/* left person */}
      <circle cx="110" cy="110" r="28" fill="#FDC8A0" />
      <path d="M82 110a28 28 0 0 1 56 0v6H82z" fill="#111827" />
      <path d="M70 200c2-44 22-72 40-72s38 28 40 72z" fill="#0176D3" />
      {/* right person */}
      <circle cx="210" cy="110" r="28" fill="#F4A988" />
      <path d="M182 110a28 28 0 0 1 56 0v6h-56z" fill="#3B2415" />
      <path d="M170 200c2-44 22-72 40-72s38 28 40 72z" fill="#00C2CB" />
      {/* handshake */}
      <rect x="138" y="150" width="44" height="20" rx="10" fill="#FDB897" transform="rotate(-6 160 160)" />
      <rect x="138" y="150" width="44" height="20" rx="10" fill="#F4A988" opacity="0.7" transform="rotate(6 160 160)" />
      {/* sparkle */}
      <circle cx="160" cy="130" r="6" fill="#F59E0B" />
      <circle cx="240" cy="60" r="8" fill="#10B981" opacity="0.5" />
      <circle cx="80" cy="60" r="6" fill="#00C2CB" opacity="0.5" />
    </svg>
  );
}

export function SearchTalentIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 260" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Magnifying glass highlighting a top candidate profile">
      <ellipse cx="160" cy="245" rx="120" ry="13" fill="#0176D3" opacity="0.08" />
      <rect x="60" y="30" width="200" height="170" rx="14" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
      {[0, 1, 2].map(i => (
        <g key={i}>
          <circle cx="92" cy={66 + i * 44} r="16" fill="#0176D3" opacity={i === 1 ? 1 : 0.18} />
          <rect x="118" y={58 + i * 44} width="110" height="10" rx="5" fill="#0176D3" opacity={i === 1 ? 0.7 : 0.25} />
          <rect x="118" y={74 + i * 44} width="80" height="8" rx="4" fill="#94A3B8" opacity={i === 1 ? 0.6 : 0.25} />
        </g>
      ))}
      {/* magnifier */}
      <circle cx="190" cy="110" r="50" fill="none" stroke="#F59E0B" strokeWidth="8" opacity="0.85" />
      <rect x="225" y="148" width="20" height="60" rx="10" fill="#F59E0B" transform="rotate(-40 235 178)" />
      <circle cx="190" cy="110" r="50" fill="#FDF6E3" opacity="0.25" />
      <path d="M178 110l8 8 16-18" stroke="#10B981" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function GlobalNetworkIllustration({ style }) {
  return (
    <svg viewBox="0 0 360 260" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Global network of connected hiring nodes across regions">
      <circle cx="180" cy="130" r="100" fill="#E6F4FF" />
      <ellipse cx="180" cy="130" rx="100" ry="40" fill="none" stroke="#0176D3" strokeWidth="1.5" opacity="0.4" />
      <ellipse cx="180" cy="130" rx="40" ry="100" fill="none" stroke="#0176D3" strokeWidth="1.5" opacity="0.4" />
      <circle cx="180" cy="130" r="100" fill="none" stroke="#0176D3" strokeWidth="1.5" opacity="0.4" />
      {/* nodes + connectors */}
      <path d="M90 90L180 130L270 80M180 130L120 200M180 130L260 200" stroke="#00C2CB" strokeWidth="2.5" opacity="0.7" />
      <circle cx="180" cy="130" r="14" fill="#0176D3" />
      <circle cx="90" cy="90" r="10" fill="#10B981" />
      <circle cx="270" cy="80" r="10" fill="#F59E0B" />
      <circle cx="120" cy="200" r="10" fill="#00C2CB" />
      <circle cx="260" cy="200" r="10" fill="#7C3AED" />
    </svg>
  );
}

export function ChatSupportIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Support chat conversation bubbles">
      <ellipse cx="160" cy="225" rx="120" ry="13" fill="#0176D3" opacity="0.08" />
      <rect x="40" y="30" width="180" height="80" rx="16" fill="#0176D3" />
      <path d="M70 110l0 24 28-24z" fill="#0176D3" />
      <rect x="60" y="50" width="120" height="10" rx="5" fill="#FFFFFF" opacity="0.85" />
      <rect x="60" y="70" width="90" height="10" rx="5" fill="#FFFFFF" opacity="0.55" />
      <rect x="100" y="120" width="180" height="80" rx="16" fill="#00C2CB" opacity="0.18" stroke="#00C2CB" strokeWidth="1.5" />
      <path d="M250 200l0 24-28-24z" fill="#00C2CB" opacity="0.18" />
      <rect x="120" y="140" width="100" height="10" rx="5" fill="#032D60" opacity="0.7" />
      <rect x="120" y="160" width="130" height="10" rx="5" fill="#032D60" opacity="0.4" />
      {/* headset icon */}
      <circle cx="280" cy="50" r="24" fill="#F59E0B" opacity="0.18" />
      <path d="M268 50a12 12 0 0 1 24 0v10" stroke="#F59E0B" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="262" y="48" width="8" height="14" rx="3" fill="#F59E0B" />
      <rect x="286" y="48" width="8" height="14" rx="3" fill="#F59E0B" />
    </svg>
  );
}

export function ValuesHeartIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="People connected around shared company values">
      <ellipse cx="160" cy="225" rx="120" ry="13" fill="#0176D3" opacity="0.08" />
      <circle cx="160" cy="120" r="86" fill="#E8FBF6" />
      <path d="M160 156c-30-22-50-40-50-62a28 28 0 0 1 50-16 28 28 0 0 1 50 16c0 22-20 40-50 62z" fill="#00C2CB" />
      {/* people around */}
      <circle cx="80" cy="70" r="18" fill="#FDB897" />
      <path d="M62 70a18 18 0 0 1 36 0v4H62z" fill="#1F2937" />
      <circle cx="240" cy="70" r="18" fill="#F4A988" />
      <path d="M222 70a18 18 0 0 1 36 0v4h-36z" fill="#3B2415" />
      <circle cx="160" cy="40" r="18" fill="#FDC8A0" />
      <path d="M142 40a18 18 0 0 1 36 0v4h-36z" fill="#111827" />
      <circle cx="60" cy="180" r="6" fill="#F59E0B" opacity="0.6" />
      <circle cx="270" cy="190" r="8" fill="#0176D3" opacity="0.4" />
    </svg>
  );
}

export function GrowthRocketIllustration({ style }) {
  return (
    <svg viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Rocket launching upward representing career and business growth">
      <ellipse cx="140" cy="260" rx="100" ry="12" fill="#0176D3" opacity="0.08" />
      <path d="M140 30c30 30 40 80 30 140h-60c-10-60 0-110 30-140z" fill="#FFFFFF" stroke="#0176D3" strokeWidth="3" />
      <circle cx="140" cy="100" r="18" fill="#00C2CB" />
      <path d="M110 170l-30 50 40-15z" fill="#F59E0B" />
      <path d="M170 170l30 50-40-15z" fill="#F59E0B" />
      <path d="M120 170h40l-12 40h-16z" fill="#BA0517" opacity="0.6" />
      {/* stars */}
      <circle cx="60" cy="60" r="4" fill="#10B981" />
      <circle cx="220" cy="90" r="6" fill="#7C3AED" opacity="0.6" />
      <circle cx="200" cy="40" r="4" fill="#0176D3" opacity="0.6" />
      <circle cx="50" cy="150" r="5" fill="#00C2CB" opacity="0.6" />
    </svg>
  );
}

export function IdentityCardIllustration({ style }) {
  return (
    <svg viewBox="0 0 360 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Digital professional identity card with verification badges">
      <ellipse cx="180" cy="225" rx="150" ry="13" fill="#0176D3" opacity="0.08" />
      <rect x="40" y="40" width="280" height="160" rx="18" fill="#032D60" />
      <rect x="40" y="40" width="280" height="44" rx="18" fill="#0176D3" />
      <circle cx="80" cy="62" r="14" fill="#FFFFFF" opacity="0.9" />
      <rect x="104" y="54" width="100" height="8" rx="4" fill="#FFFFFF" opacity="0.85" />
      <rect x="104" y="68" width="70" height="6" rx="3" fill="#FFFFFF" opacity="0.55" />
      <circle cx="290" cy="62" r="14" fill="#10B981" />
      <path d="M283 62l5 5 9-10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* body rows */}
      {['Education', 'Employment', 'Skills', 'Background'].map((_, i) => (
        <g key={i}>
          <rect x="64" y={102 + i * 24} width="140" height="8" rx="4" fill="#FFFFFF" opacity="0.25" />
          <circle cx="280" cy={106 + i * 24} r="9" fill="#00C2CB" opacity="0.85" />
          <path d={`M275 ${106 + i * 24}l3 3 6-7`} stroke="#032D60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      ))}
    </svg>
  );
}

export function TrustGraphIllustration({ style }) {
  return (
    <svg viewBox="0 0 360 280" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Trust graph connecting candidates, employers, colleges and skills">
      <circle cx="180" cy="140" r="34" fill="#0176D3" />
      <path d="M180 140L80 90M180 140L80 190M180 140L280 90M180 140L280 190M180 140L180 50M180 140L180 230" stroke="#94A3B8" strokeWidth="2" opacity="0.5" />
      <circle cx="80" cy="90" r="22" fill="#00C2CB" />
      <circle cx="80" cy="190" r="22" fill="#10B981" />
      <circle cx="280" cy="90" r="22" fill="#F59E0B" />
      <circle cx="280" cy="190" r="22" fill="#7C3AED" />
      <circle cx="180" cy="50" r="18" fill="#BA0517" opacity="0.7" />
      <circle cx="180" cy="230" r="18" fill="#0891B2" />
      <text x="180" y="146" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="900" fill="#fff">YOU</text>
    </svg>
  );
}

export function ServiceSolutionsIllustration({ style }) {
  return (
    <svg viewBox="0 0 360 260" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Central hub connecting multiple staffing and HR service categories">
      <ellipse cx="180" cy="245" rx="150" ry="13" fill="#0176D3" opacity="0.08" />
      {/* central hub */}
      <rect x="140" y="98" width="80" height="64" rx="14" fill="#032D60" />
      <rect x="156" y="90" width="48" height="16" rx="6" fill="#0176D3" />
      <rect x="156" y="122" width="48" height="8" rx="4" fill="#00C2CB" />
      <rect x="156" y="138" width="32" height="8" rx="4" fill="#FFFFFF" opacity="0.4" />
      {/* connectors */}
      <path d="M180 98V60M180 162v40M140 130H70M220 130h70" stroke="#94A3B8" strokeWidth="2.5" strokeDasharray="4 6" opacity="0.6" />
      {/* IT staffing */}
      <circle cx="180" cy="36" r="26" fill="#0176D3" />
      <path d="M168 36h24M180 24v24" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      {/* cybersecurity */}
      <circle cx="60" cy="130" r="26" fill="#00C2CB" />
      <path d="M60 114l16 6v14c0 10-7 17-16 20-9-3-16-10-16-20v-14z" fill="#fff" />
      {/* non-IT staffing */}
      <circle cx="300" cy="130" r="26" fill="#F59E0B" />
      <circle cx="300" cy="122" r="7" fill="#fff" />
      <path d="M288 144c0-8 5-14 12-14s12 6 12 14" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* HRMS */}
      <circle cx="180" cy="226" r="26" fill="#10B981" />
      <rect x="168" y="216" width="24" height="20" rx="3" fill="#fff" opacity="0.9" />
      <circle cx="180" cy="222" r="3" fill="#10B981" />
      <path d="M174 232c0-4 3-6 6-6s6 2 6 6" stroke="#10B981" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function CampusHubIllustration({ style }) {
  return (
    <svg viewBox="0 0 360 260" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Placement officer dashboard publishing a drive to the college community feed">
      <ellipse cx="180" cy="245" rx="150" ry="13" fill="#0176D3" opacity="0.08" />
      {/* dashboard panel */}
      <rect x="20" y="40" width="170" height="170" rx="14" fill="#032D60" />
      <rect x="36" y="56" width="60" height="14" rx="7" fill="#F59E0B" />
      <rect x="36" y="84" width="138" height="34" rx="8" fill="#0176D3" opacity="0.25" stroke="#0176D3" strokeWidth="1.5" />
      <rect x="48" y="94" width="80" height="8" rx="4" fill="#FFFFFF" opacity="0.8" />
      <rect x="48" y="106" width="50" height="6" rx="3" fill="#FFFFFF" opacity="0.4" />
      <rect x="36" y="128" width="138" height="34" rx="8" fill="#00C2CB" opacity="0.15" stroke="#00C2CB" strokeWidth="1.5" />
      <rect x="48" y="138" width="90" height="8" rx="4" fill="#FFFFFF" opacity="0.7" />
      <rect x="48" y="150" width="60" height="6" rx="3" fill="#FFFFFF" opacity="0.35" />
      <rect x="36" y="172" width="60" height="22" rx="8" fill="#F59E0B" />
      <path d="M52 183l24-9 24 9-24 9z" fill="#FFFFFF" opacity="0.9" />
      {/* arrow to community feed */}
      <path d="M196 110h36" stroke="#94A3B8" strokeWidth="3" strokeDasharray="3 6" strokeLinecap="round" />
      <path d="M222 100l14 10-14 10z" fill="#94A3B8" />
      {/* community feed card */}
      <rect x="240" y="50" width="100" height="160" rx="14" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
      <circle cx="262" cy="74" r="12" fill="#0176D3" />
      <rect x="280" y="68" width="48" height="7" rx="3.5" fill="#032D60" opacity="0.7" />
      <rect x="280" y="80" width="34" height="6" rx="3" fill="#94A3B8" opacity="0.6" />
      <rect x="252" y="100" width="76" height="36" rx="8" fill="#0176D3" opacity="0.1" />
      <path d="M270 112l16-6 16 6-16 6z" fill="#F59E0B" />
      <rect x="252" y="148" width="76" height="7" rx="3.5" fill="#94A3B8" opacity="0.4" />
      <rect x="252" y="162" width="56" height="7" rx="3.5" fill="#94A3B8" opacity="0.4" />
      <circle cx="262" cy="188" r="10" fill="#10B981" />
      <path d="M257 188l3 3 6-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="280" y="184" width="42" height="7" rx="3.5" fill="#94A3B8" opacity="0.5" />
    </svg>
  );
}

export function ConnectIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Multiple channels — email, phone and location — connecting to the TalentNest team">
      <ellipse cx="160" cy="225" rx="130" ry="13" fill="#0176D3" opacity="0.08" />
      {/* connectors */}
      <path d="M112 70L142 100M208 80L182 102M178 162L162 164M198 178L224 160" stroke="#94A3B8" strokeWidth="2" strokeDasharray="3 6" opacity="0.6" />
      {/* envelope */}
      <rect x="30" y="40" width="80" height="56" rx="8" fill="#FFFFFF" stroke="#0176D3" strokeWidth="2" />
      <path d="M30 46l40 32 40-32" stroke="#0176D3" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* location pin */}
      <path d="M252 70a26 26 0 1 0-52 0c0 18 26 40 26 40s26-22 26-40z" fill="#F59E0B" />
      <circle cx="226" cy="70" r="10" fill="#FFFFFF" />
      {/* phone */}
      <rect x="226" y="150" width="50" height="80" rx="10" fill="#032D60" />
      <rect x="234" y="160" width="34" height="52" rx="3" fill="#00C2CB" opacity="0.3" />
      <circle cx="251" cy="218" r="4" fill="#FFFFFF" opacity="0.6" />
      {/* center bubble */}
      <circle cx="160" cy="135" r="44" fill="#0176D3" />
      <path d="M142 127h36M142 141h24" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function ProcessFlowIllustration({ style }) {
  return (
    <svg viewBox="0 0 360 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Step-by-step process flow with connected milestone markers">
      <ellipse cx="180" cy="225" rx="150" ry="13" fill="#0176D3" opacity="0.08" />
      <path d="M40 180C90 60 270 60 320 180" stroke="#94A3B8" strokeWidth="3" strokeDasharray="4 8" fill="none" opacity="0.5" />
      {[
        { x: 40, y: 180, c: '#0176D3', n: '1' },
        { x: 127, y: 96, c: '#00C2CB', n: '2' },
        { x: 233, y: 96, c: '#F59E0B', n: '3' },
        { x: 320, y: 180, c: '#10B981', n: '4' },
      ].map((s) => (
        <g key={s.n}>
          <circle cx={s.x} cy={s.y} r="22" fill={s.c} />
          <text x={s.x} y={s.y + 6} textAnchor="middle" fontSize="16" fontWeight="800" fill="#fff" fontFamily="sans-serif">{s.n}</text>
        </g>
      ))}
      <rect x="100" y="30" width="160" height="40" rx="10" fill="#032D60" />
      <rect x="116" y="42" width="90" height="8" rx="4" fill="#FFFFFF" opacity="0.85" />
      <rect x="116" y="54" width="60" height="6" rx="3" fill="#00C2CB" opacity="0.6" />
    </svg>
  );
}

export function ComplianceBadgeIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Job approval workflow with permission badges and access control">
      <ellipse cx="160" cy="225" rx="120" ry="13" fill="#0176D3" opacity="0.08" />
      <rect x="40" y="30" width="240" height="180" rx="14" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
      <rect x="60" y="50" width="120" height="14" rx="7" fill="#032D60" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="60" y={84 + i * 38} width="200" height="28" rx="8" fill={i === 1 ? '#0176D3' : '#F1F5F9'} opacity={i === 1 ? 0.12 : 1} />
          <circle cx="76" cy={98 + i * 38} r="9" fill={i === 0 ? '#10B981' : i === 1 ? '#F59E0B' : '#94A3B8'} />
          <rect x="94" y={93 + i * 38} width="100" height="10" rx="5" fill="#94A3B8" opacity="0.6" />
          <rect x="216" y={91 + i * 38} width="36" height="14" rx="7" fill={i === 0 ? '#10B981' : i === 1 ? '#F59E0B' : '#CBD5E1'} opacity="0.25" />
        </g>
      ))}
      {/* lock badge */}
      <circle cx="270" cy="40" r="26" fill="#0176D3" />
      <rect x="258" y="38" width="24" height="18" rx="3" fill="#fff" />
      <path d="M262 38v-4a8 8 0 0116 0v4" stroke="#fff" strokeWidth="3" fill="none" />
    </svg>
  );
}

export function ApplicationTrackerIllustration({ style }) {
  return (
    <svg viewBox="0 0 360 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Candidate application status tracker with stage progress">
      <ellipse cx="180" cy="225" rx="150" ry="13" fill="#0176D3" opacity="0.08" />
      <rect x="20" y="20" width="320" height="200" rx="16" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
      <rect x="44" y="44" width="140" height="14" rx="7" fill="#032D60" />
      <rect x="44" y="68" width="90" height="8" rx="4" fill="#94A3B8" opacity="0.5" />
      {['Applied', 'Interview', 'Offer', 'Hired'].map((label, i) => (
        <g key={label}>
          <circle cx={64 + i * 80} cy="130" r="16" fill={i < 3 ? '#10B981' : '#0176D3'} />
          {i < 3
            ? <path d={`M${57 + i * 80} 130l4 4 8-9`} stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            : <circle cx={64 + i * 80} cy="130" r="6" fill="#fff" />}
          {i < 3 && <rect x={80 + i * 80} y="126" width="44" height="8" rx="4" fill="#10B981" opacity="0.35" />}
          <text x={64 + i * 80} y="166" textAnchor="middle" fontSize="11" fontWeight="700" fill="#032D60" fontFamily="sans-serif">{label}</text>
        </g>
      ))}
      <rect x="44" y="190" width="272" height="10" rx="5" fill="#F1F5F9" />
      <rect x="44" y="190" width="200" height="10" rx="5" fill="#00C2CB" />
    </svg>
  );
}

export function JobAnalyticsIllustration({ style }) {
  return (
    <svg viewBox="0 0 360 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Job postings with assessment scores and performance metrics">
      <ellipse cx="180" cy="225" rx="150" ry="13" fill="#0176D3" opacity="0.08" />
      <rect x="20" y="20" width="160" height="200" rx="14" fill="#032D60" />
      <rect x="40" y="40" width="100" height="12" rx="6" fill="#FFFFFF" opacity="0.85" />
      <rect x="40" y="62" width="70" height="8" rx="4" fill="#00C2CB" opacity="0.6" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x="40" y={92 + i * 38} width="120" height="28" rx="8" fill="#FFFFFF" opacity="0.06" />
      ))}
      {[0, 1, 2].map((i) => (
        <rect key={i} x="50" y={101 + i * 38} width={70 - i * 14} height="10" rx="5" fill="#0176D3" opacity="0.7" />
      ))}
      {/* assessment score donut */}
      <circle cx="270" cy="90" r="50" fill="none" stroke="#F1F5F9" strokeWidth="14" />
      <circle cx="270" cy="90" r="50" fill="none" stroke="#10B981" strokeWidth="14" strokeDasharray="220 314" strokeLinecap="round" transform="rotate(-90 270 90)" />
      <text x="270" y="98" textAnchor="middle" fontSize="26" fontWeight="900" fill="#032D60" fontFamily="sans-serif">82%</text>
      <rect x="220" y="170" width="100" height="14" rx="7" fill="#94A3B8" opacity="0.3" />
      <rect x="220" y="192" width="70" height="10" rx="5" fill="#94A3B8" opacity="0.3" />
    </svg>
  );
}

export function FaceRecognitionIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Facial recognition attendance scan with check-in confirmation">
      <ellipse cx="160" cy="225" rx="120" ry="13" fill="#059669" opacity="0.08" />
      <rect x="80" y="20" width="160" height="180" rx="16" fill="#032D60" />
      {/* scan corners */}
      <path d="M104 50v-10a6 6 0 016-6h10M216 34h10a6 6 0 016 6v10M232 156v10a6 6 0 01-6 6h-10M104 172v-10" stroke="#10B981" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* face */}
      <circle cx="160" cy="100" r="34" fill="#00C2CB" opacity="0.25" />
      <circle cx="160" cy="92" r="18" fill="#FFFFFF" opacity="0.9" />
      <path d="M132 140c0-18 13-28 28-28s28 10 28 28" fill="#FFFFFF" opacity="0.9" />
      {/* scan line */}
      <rect x="92" y="108" width="136" height="3" fill="#10B981" opacity="0.8" />
      <rect x="104" y="166" width="112" height="14" rx="7" fill="#FFFFFF" opacity="0.08" />
      {/* check badge */}
      <circle cx="240" cy="190" r="28" fill="#10B981" />
      <path d="M228 190l8 8 16-18" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function TeamAutomationIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Org chart with team members connected to automated workflow triggers">
      <ellipse cx="160" cy="225" rx="120" ry="13" fill="#059669" opacity="0.08" />
      {/* org chart connectors */}
      <path d="M160 64v30M160 94H80v26M160 94h80v26" stroke="#94A3B8" strokeWidth="3" fill="none" />
      {/* top node */}
      <rect x="116" y="28" width="88" height="36" rx="10" fill="#032D60" />
      <circle cx="138" cy="46" r="10" fill="#00C2CB" />
      <rect x="156" y="40" width="36" height="12" rx="6" fill="#FFFFFF" opacity="0.6" />
      {/* child nodes */}
      <rect x="36" y="120" width="88" height="36" rx="10" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
      <circle cx="58" cy="138" r="10" fill="#0176D3" />
      <rect x="76" y="132" width="36" height="12" rx="6" fill="#94A3B8" opacity="0.4" />
      <rect x="196" y="120" width="88" height="36" rx="10" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
      <circle cx="218" cy="138" r="10" fill="#F59E0B" />
      <rect x="236" y="132" width="36" height="12" rx="6" fill="#94A3B8" opacity="0.4" />
      {/* automation gear */}
      <g transform="translate(160 200)">
        <circle r="22" fill="#10B981" />
        <path d="M-10 0a10 10 0 0120 0 10 10 0 01-20 0z" fill="none" stroke="#fff" strokeWidth="3" />
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <rect key={deg} x="-2" y="-18" width="4" height="6" rx="2" fill="#fff" transform={`rotate(${deg})`} />
        ))}
      </g>
    </svg>
  );
}

export function MultiTenantIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Multiple organization workspaces stacked behind a shared enterprise dashboard">
      <ellipse cx="160" cy="225" rx="120" ry="13" fill="#059669" opacity="0.08" />
      {/* stacked org cards behind */}
      <rect x="60" y="40" width="200" height="130" rx="14" fill="#E6F4FF" transform="rotate(-4 160 105)" />
      <rect x="56" y="48" width="200" height="130" rx="14" fill="#E8FBF6" transform="rotate(3 156 113)" />
      {/* front dashboard */}
      <rect x="48" y="56" width="224" height="150" rx="14" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
      <rect x="68" y="76" width="100" height="12" rx="6" fill="#032D60" />
      <rect x="68" y="98" width="64" height="8" rx="4" fill="#94A3B8" opacity="0.5" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={68 + i * 64} y="124" width="52" height="56" rx="8" fill="#0176D3" opacity={0.08 + i * 0.06} />
          <circle cx={94 + i * 64} cy="146" r="10" fill="#10B981" />
          <rect x={78 + i * 64} y="162" width="32" height="6" rx="3" fill="#94A3B8" opacity="0.5" />
        </g>
      ))}
    </svg>
  );
}

export function RecruiterChatIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Candidate chat conversation thread with a recruiter">
      <ellipse cx="160" cy="225" rx="120" ry="13" fill="#7c3aed" opacity="0.08" />
      <rect x="40" y="24" width="240" height="180" rx="16" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
      {/* recruiter bubble */}
      <rect x="60" y="48" width="160" height="40" rx="14" fill="#F1F5F9" />
      <circle cx="78" cy="68" r="12" fill="#0176D3" />
      <rect x="98" y="58" width="100" height="8" rx="4" fill="#94A3B8" opacity="0.6" />
      <rect x="98" y="72" width="70" height="8" rx="4" fill="#94A3B8" opacity="0.4" />
      {/* candidate bubble */}
      <rect x="100" y="104" width="160" height="40" rx="14" fill="#7c3aed" opacity="0.12" />
      <rect x="120" y="114" width="90" height="8" rx="4" fill="#7c3aed" opacity="0.7" />
      <rect x="120" y="128" width="120" height="8" rx="4" fill="#7c3aed" opacity="0.4" />
      <circle cx="246" cy="124" r="12" fill="#7c3aed" />
      {/* recruiter bubble 2 */}
      <rect x="60" y="156" width="120" height="30" rx="14" fill="#F1F5F9" />
      <circle cx="78" cy="171" r="10" fill="#0176D3" />
      <rect x="96" y="166" width="70" height="10" rx="5" fill="#94A3B8" opacity="0.6" />
      {/* call icon */}
      <circle cx="280" cy="190" r="22" fill="#10B981" />
      <path d="M271 181c4-3 7-1 9 2l2 4c1 2 0 4-2 5l-2 1c2 5 5 8 10 10l1-2c1-2 3-3 5-2l4 2c3 2 5 5 2 9-4 5-12 4-19-2-6-6-11-15-10-22z" fill="#fff" />
    </svg>
  );
}

export function CareerToolsIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Candidate profile builder with skill tags and resume tools">
      <ellipse cx="160" cy="225" rx="120" ry="13" fill="#7c3aed" opacity="0.08" />
      <rect x="60" y="20" width="200" height="200" rx="16" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
      <circle cx="120" cy="64" r="26" fill="#7c3aed" opacity="0.15" />
      <circle cx="120" cy="56" r="12" fill="#7c3aed" />
      <path d="M98 86c0-12 10-18 22-18s22 6 22 18" fill="#7c3aed" opacity="0.5" />
      <rect x="160" y="48" width="80" height="10" rx="5" fill="#032D60" />
      <rect x="160" y="64" width="56" height="8" rx="4" fill="#94A3B8" opacity="0.5" />
      {/* skill tags */}
      {['React', 'SQL', 'Figma'].map((s, i) => (
        <g key={s}>
          <rect x={78 + i * 58} y="110" width="52" height="26" rx="13" fill={['#0176D3', '#00C2CB', '#F59E0B'][i]} opacity="0.15" />
          <text x={104 + i * 58} y="127" textAnchor="middle" fontSize="11" fontWeight="700" fill={['#0176D3', '#00C2CB', '#F59E0B'][i]} fontFamily="sans-serif">{s}</text>
        </g>
      ))}
      <rect x="78" y="156" width="164" height="10" rx="5" fill="#94A3B8" opacity="0.3" />
      <rect x="78" y="174" width="120" height="10" rx="5" fill="#94A3B8" opacity="0.3" />
      <rect x="78" y="192" width="80" height="14" rx="7" fill="#10B981" opacity="0.2" />
      <text x="118" y="203" textAnchor="middle" fontSize="11" fontWeight="800" fill="#10B981" fontFamily="sans-serif">Profile 92%</text>
    </svg>
  );
}

export function EnterpriseControlIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Enterprise admin control panel with security toggles and audit log">
      <ellipse cx="160" cy="225" rx="120" ry="13" fill="#0176D3" opacity="0.08" />
      <rect x="50" y="24" width="220" height="190" rx="14" fill="#032D60" />
      <rect x="70" y="44" width="110" height="14" rx="7" fill="#FFFFFF" opacity="0.85" />
      {/* toggle rows */}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="70" y={78 + i * 38} width="180" height="26" rx="13" fill="#FFFFFF" opacity="0.06" />
          <rect x="84" y={87 + i * 38} width="90" height="8" rx="4" fill="#FFFFFF" opacity="0.5" />
          <rect x="206" y={84 + i * 38} width="32" height="14" rx="7" fill={i === 1 ? '#94A3B8' : '#10B981'} opacity={i === 1 ? 0.4 : 0.9} />
          <circle cx={i === 1 ? 213 : 230} cy={91 + i * 38} r="5" fill="#fff" />
        </g>
      ))}
      {/* audit log badge */}
      <circle cx="270" cy="40" r="24" fill="#00C2CB" />
      <path d="M260 40h20M270 30v20" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function OfferSignatureIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Digital offer letter document being signed with e-signature">
      <ellipse cx="160" cy="225" rx="120" ry="13" fill="#7c3aed" opacity="0.08" />
      <rect x="70" y="20" width="180" height="200" rx="14" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
      <rect x="94" y="44" width="100" height="14" rx="7" fill="#032D60" />
      <rect x="94" y="68" width="132" height="8" rx="4" fill="#94A3B8" opacity="0.5" />
      <rect x="94" y="84" width="110" height="8" rx="4" fill="#94A3B8" opacity="0.5" />
      <rect x="94" y="100" width="120" height="8" rx="4" fill="#94A3B8" opacity="0.5" />
      {/* signature line */}
      <path d="M94 156c10-14 20 14 30 0s20 14 30 0 20 14 30 0 20 14 30 0" stroke="#7c3aed" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="94" y="172" width="80" height="8" rx="4" fill="#94A3B8" opacity="0.4" />
      {/* approved stamp */}
      <g transform="rotate(-18 230 190)">
        <rect x="195" y="172" width="70" height="36" rx="8" fill="none" stroke="#10B981" strokeWidth="3" />
        <text x="230" y="195" textAnchor="middle" fontSize="13" fontWeight="900" fill="#10B981" fontFamily="sans-serif">SIGNED</text>
      </g>
    </svg>
  );
}

export function VerifiedCandidateIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 280" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Verified candidate profile card with identity confirmation badge and skill tags">
      <ellipse cx="160" cy="265" rx="130" ry="13" fill="#0176D3" opacity="0.08" />
      {/* profile card */}
      <rect x="30" y="40" width="260" height="200" rx="20" fill="#E6F4FF" />
      {/* person */}
      <circle cx="150" cy="100" r="38" fill="#FDC8A0" />
      <path d="M112 100a38 38 0 0 1 76 0v8h-76z" fill="#1F2937" />
      <path d="M86 230c4-58 30-98 64-98s60 40 64 98z" fill="#0176D3" />
      <path d="M86 230c4-58 30-98 64-98v98z" fill="#00C2CB" opacity="0.5" />
      {/* verification badge */}
      <circle cx="226" cy="172" r="32" fill="#10B981" />
      <circle cx="226" cy="172" r="32" fill="none" stroke="#FFFFFF" strokeWidth="4" />
      <path d="M212 172l9 9 19-20" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* skill tags */}
      <rect x="50" y="220" width="58" height="22" rx="11" fill="#0176D3" opacity="0.15" />
      <rect x="116" y="220" width="58" height="22" rx="11" fill="#00C2CB" opacity="0.18" />
      <rect x="182" y="220" width="58" height="22" rx="11" fill="#F59E0B" opacity="0.18" />
      {/* sparkles */}
      <circle cx="60" cy="60" r="8" fill="#F59E0B" opacity="0.5" />
      <circle cx="284" cy="80" r="6" fill="#7C3AED" opacity="0.5" />
    </svg>
  );
}

export function DevTalentIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Software developer writing code on a laptop for IT staffing">
      <ellipse cx="160" cy="225" rx="130" ry="13" fill="#0176D3" opacity="0.08" />
      {/* laptop */}
      <rect x="90" y="120" width="140" height="90" rx="10" fill="#032D60" />
      <rect x="102" y="130" width="116" height="64" rx="4" fill="#0D1B2A" />
      <rect x="112" y="140" width="50" height="6" rx="3" fill="#00C2CB" opacity="0.8" />
      <rect x="112" y="152" width="80" height="6" rx="3" fill="#10B981" opacity="0.7" />
      <rect x="124" y="164" width="60" height="6" rx="3" fill="#F59E0B" opacity="0.7" />
      <rect x="112" y="176" width="40" height="6" rx="3" fill="#7C3AED" opacity="0.7" />
      {/* person */}
      <circle cx="160" cy="60" r="30" fill="#FDB897" />
      <path d="M130 60a30 30 0 0 1 60 0v6h-60z" fill="#111827" />
      <path d="M108 150c4-46 28-78 52-78s48 32 52 78z" fill="#0176D3" />
      {/* code brackets accent */}
      <text x="240" y="64" fontSize="40" fontWeight="900" fill="#00C2CB" opacity="0.5" fontFamily="monospace">{'</>'}</text>
      <circle cx="50" cy="90" r="10" fill="#F59E0B" opacity="0.4" />
    </svg>
  );
}

export function CyberShieldIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Digital security shield with lock representing cybersecurity staffing">
      <ellipse cx="160" cy="225" rx="130" ry="13" fill="#032D60" opacity="0.08" />
      <path d="M160 20l78 28v58c0 56-36 98-78 114-42-16-78-58-78-114V48z" fill="#032D60" />
      <path d="M160 20l78 28v58c0 56-36 98-78 114z" fill="#0176D3" opacity="0.45" />
      {/* lock */}
      <rect x="132" y="106" width="56" height="44" rx="6" fill="#FFFFFF" />
      <path d="M140 106v-13a20 20 0 0140 0v13" stroke="#FFFFFF" strokeWidth="6" fill="none" />
      <circle cx="160" cy="128" r="7" fill="#032D60" />
      {/* network nodes */}
      <path d="M48 70L96 50M272 70L224 50M48 170L96 190M272 170L224 190" stroke="#94A3B8" strokeWidth="2" opacity="0.4" />
      <circle cx="48" cy="70" r="9" fill="#10B981" opacity="0.7" />
      <circle cx="272" cy="70" r="9" fill="#00C2CB" opacity="0.7" />
      <circle cx="48" cy="170" r="9" fill="#F59E0B" opacity="0.7" />
      <circle cx="272" cy="170" r="9" fill="#7C3AED" opacity="0.7" />
    </svg>
  );
}

export function DiverseTeamIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Diverse team of non-IT professionals from finance, operations and admin functions">
      <ellipse cx="160" cy="225" rx="130" ry="13" fill="#0176D3" opacity="0.08" />
      {/* person 1 */}
      <circle cx="100" cy="110" r="26" fill="#FDC8A0" />
      <path d="M74 110a26 26 0 0 1 52 0v4H74z" fill="#1F2937" />
      <path d="M64 200c2-44 18-72 36-72s34 28 36 72z" fill="#F59E0B" />
      {/* person 2 (center, taller) */}
      <circle cx="160" cy="90" r="30" fill="#F4A988" />
      <path d="M130 90a30 30 0 0 1 60 0v6h-60z" fill="#3B2415" />
      <path d="M118 200c2-50 22-84 42-84s40 34 42 84z" fill="#0176D3" />
      {/* person 3 */}
      <circle cx="222" cy="110" r="26" fill="#FDB897" />
      <path d="M196 110a26 26 0 0 1 52 0v4h-52z" fill="#111827" />
      <path d="M186 200c2-44 18-72 36-72s34 28 36 72z" fill="#00C2CB" />
      {/* shared briefcase */}
      <rect x="142" y="160" width="36" height="26" rx="4" fill="#032D60" />
      <rect x="154" y="152" width="12" height="10" rx="2" fill="#032D60" />
      {/* sparkles */}
      <circle cx="50" cy="60" r="8" fill="#10B981" opacity="0.4" />
      <circle cx="270" cy="60" r="10" fill="#7C3AED" opacity="0.4" />
    </svg>
  );
}

export function ContractToHireIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Path from a temporary contract to a permanent hire badge">
      <ellipse cx="160" cy="225" rx="130" ry="13" fill="#0176D3" opacity="0.08" />
      {/* contract document left */}
      <rect x="30" y="60" width="100" height="130" rx="10" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
      <rect x="48" y="80" width="64" height="10" rx="5" fill="#94A3B8" opacity="0.6" />
      <rect x="48" y="100" width="64" height="8" rx="4" fill="#94A3B8" opacity="0.4" />
      <rect x="48" y="116" width="44" height="8" rx="4" fill="#94A3B8" opacity="0.4" />
      <rect x="48" y="158" width="44" height="16" rx="8" fill="#F59E0B" opacity="0.25" />
      <text x="70" y="170" textAnchor="middle" fontSize="9" fontWeight="800" fill="#F59E0B" fontFamily="sans-serif">TEMP</text>
      {/* arrow */}
      <path d="M138 120c30-10 60-10 88 0" stroke="#00C2CB" strokeWidth="4" strokeDasharray="6 8" fill="none" />
      <path d="M220 112l16 8-16 8z" fill="#00C2CB" />
      {/* permanent badge right */}
      <rect x="190" y="50" width="100" height="130" rx="10" fill="#032D60" />
      <circle cx="240" cy="90" r="24" fill="#10B981" />
      <path d="M230 90l7 7 14-15" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="210" y="130" width="60" height="10" rx="5" fill="#FFFFFF" opacity="0.85" />
      <rect x="210" y="148" width="44" height="16" rx="8" fill="#10B981" opacity="0.3" />
      <text x="232" y="160" textAnchor="middle" fontSize="9" fontWeight="800" fill="#10B981" fontFamily="sans-serif">PERM</text>
    </svg>
  );
}

export function CompanyBridgeIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Two company buildings connected through a corp-to-corp partnership">
      <ellipse cx="160" cy="225" rx="130" ry="13" fill="#0176D3" opacity="0.08" />
      {/* left building */}
      <rect x="30" y="80" width="90" height="130" rx="8" fill="#0176D3" />
      <rect x="48" y="100" width="20" height="20" rx="3" fill="#E6F4FF" opacity="0.7" />
      <rect x="84" y="100" width="20" height="20" rx="3" fill="#E6F4FF" opacity="0.7" />
      <rect x="48" y="136" width="20" height="20" rx="3" fill="#E6F4FF" opacity="0.7" />
      <rect x="84" y="136" width="20" height="20" rx="3" fill="#E6F4FF" opacity="0.7" />
      <rect x="48" y="172" width="20" height="20" rx="3" fill="#E6F4FF" opacity="0.7" />
      <rect x="84" y="172" width="20" height="20" rx="3" fill="#E6F4FF" opacity="0.7" />
      {/* right building */}
      <rect x="200" y="50" width="90" height="160" rx="8" fill="#032D60" />
      <rect x="218" y="70" width="20" height="20" rx="3" fill="#00C2CB" opacity="0.5" />
      <rect x="254" y="70" width="20" height="20" rx="3" fill="#00C2CB" opacity="0.5" />
      <rect x="218" y="106" width="20" height="20" rx="3" fill="#00C2CB" opacity="0.5" />
      <rect x="254" y="106" width="20" height="20" rx="3" fill="#00C2CB" opacity="0.5" />
      <rect x="218" y="142" width="20" height="20" rx="3" fill="#00C2CB" opacity="0.5" />
      <rect x="254" y="142" width="20" height="20" rx="3" fill="#00C2CB" opacity="0.5" />
      <rect x="218" y="178" width="20" height="20" rx="3" fill="#00C2CB" opacity="0.5" />
      <rect x="254" y="178" width="20" height="20" rx="3" fill="#00C2CB" opacity="0.5" />
      {/* connection */}
      <path d="M120 180c30-20 70-20 80-30" stroke="#F59E0B" strokeWidth="6" fill="none" strokeLinecap="round" />
      <circle cx="160" cy="170" r="16" fill="#F59E0B" />
      <path d="M152 170h16M160 162v16" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function HRDashboardIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="HRMS platform dashboard with employee management modules">
      <ellipse cx="160" cy="225" rx="130" ry="13" fill="#0176D3" opacity="0.08" />
      <rect x="30" y="30" width="260" height="170" rx="14" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
      <rect x="30" y="30" width="260" height="34" rx="14" fill="#032D60" />
      <circle cx="50" cy="47" r="6" fill="#10B981" />
      <circle cx="68" cy="47" r="6" fill="#F59E0B" />
      <circle cx="86" cy="47" r="6" fill="#00C2CB" />
      {[
        { x: 46, y: 80, c: '#0176D3' },
        { x: 130, y: 80, c: '#00C2CB' },
        { x: 214, y: 80, c: '#F59E0B' },
        { x: 46, y: 140, c: '#10B981' },
        { x: 130, y: 140, c: '#7C3AED' },
        { x: 214, y: 140, c: '#0176D3' },
      ].map((m, i) => (
        <g key={i}>
          <rect x={m.x} y={m.y} width="60" height="44" rx="8" fill={m.c} opacity="0.12" />
          <circle cx={m.x + 16} cy={m.y + 16} r="8" fill={m.c} />
          <rect x={m.x + 30} y={m.y + 12} width="22" height="6" rx="3" fill={m.c} opacity="0.6" />
          <rect x={m.x + 12} y={m.y + 30} width="36" height="6" rx="3" fill="#94A3B8" opacity="0.4" />
        </g>
      ))}
    </svg>
  );
}

export function LongTermTeamIllustration({ style }) {
  return (
    <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={style} role="img" aria-label="Growing team tree representing long-term permanent staffing">
      <ellipse cx="160" cy="225" rx="130" ry="13" fill="#10B981" opacity="0.08" />
      {/* trunk */}
      <rect x="148" y="120" width="24" height="90" rx="6" fill="#032D60" />
      {/* canopy made of people */}
      <circle cx="160" cy="80" r="50" fill="#10B981" opacity="0.15" />
      <circle cx="120" cy="80" r="22" fill="#0176D3" />
      <circle cx="160" cy="55" r="22" fill="#00C2CB" />
      <circle cx="200" cy="80" r="22" fill="#F59E0B" />
      <circle cx="160" cy="100" r="22" fill="#10B981" />
      <circle cx="120" cy="80" r="8" fill="#FFFFFF" opacity="0.85" />
      <circle cx="160" cy="55" r="8" fill="#FFFFFF" opacity="0.85" />
      <circle cx="200" cy="80" r="8" fill="#FFFFFF" opacity="0.85" />
      <circle cx="160" cy="100" r="8" fill="#FFFFFF" opacity="0.85" />
      {/* growth rings */}
      <rect x="148" y="150" width="24" height="6" rx="3" fill="#00C2CB" opacity="0.4" />
      <rect x="148" y="170" width="24" height="6" rx="3" fill="#F59E0B" opacity="0.4" />
    </svg>
  );
}
