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
