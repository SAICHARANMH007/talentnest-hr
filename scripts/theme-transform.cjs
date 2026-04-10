/**
 * Transform marketing pages to use theme variables instead of hardcoded colors.
 * Run: node scripts/theme-transform.cjs
 */
const fs = require('fs');
const path = require('path');

const IMPORT = `import { useMarketingTheme } from '../../context/MarketingThemeContext.jsx';`;
const HOOK   = `  const { theme } = useMarketingTheme();`;

// Files relative to project root
const FILES = [
  'src/pages/marketing/LandingPage.jsx',
  'src/pages/marketing/AboutPage.jsx',
  'src/pages/marketing/ServicesPage.jsx',
  'src/pages/marketing/ServiceDetailPage.jsx',
  'src/pages/marketing/HRMSPage.jsx',
  'src/pages/marketing/ContactPage.jsx',
  'src/pages/marketing/BlogPage.jsx',
  'src/pages/marketing/BlogPostPage.jsx',
  'src/pages/marketing/PrivacyPage.jsx',
  'src/pages/marketing/TermsPage.jsx',
  'src/pages/careers/CareersPage.jsx',
];

function transform(src) {
  let out = src;

  // ── 1. Add import if missing ──────────────────────────────────────────────
  if (!out.includes('useMarketingTheme')) {
    // Insert after first import block
    out = out.replace(
      /^(import .+;\n)(import .+;\n)*/m,
      (match) => match + IMPORT + '\n'
    );
  }

  // ── 2. Add hook inside first export default function / const ──────────────
  if (!out.includes('const { theme } = useMarketingTheme()')) {
    // Find first function/const component body opening brace
    out = out.replace(
      /(export default function \w+[^{]*\{|export default function\([^)]*\)\s*\{)/,
      (match) => match + '\n' + HOOK
    );
    // If arrow component: export default function Foo() { or const Foo = () => {
    if (!out.includes('const { theme } = useMarketingTheme()')) {
      out = out.replace(
        /\n(\s*)(const \w+ = \([^)]*\) => \{|const \w+ = \(\) => \{)/,
        (match, indent, fn) => `\n${indent}${fn}\n${HOOK}`
      );
    }
  }

  // ── 3. Replace hex color string literals ─────────────────────────────────
  // Order matters: longer/more specific first
  const hexMap = [
    ["'#014486'", 'theme.primaryDark'],
    ['"#014486"', 'theme.primaryDark'],
    ["'#0176D3'", 'theme.primary'],
    ['"#0176D3"', 'theme.primary'],
    ["'#009AA3'", 'theme.accentDark'],
    ['"#009AA3"', 'theme.accentDark'],
    ["'#00C2CB'", 'theme.accent'],
    ['"#00C2CB"', 'theme.accent'],
    ["'#032D60'", 'theme.dark'],
    ['"#032D60"', 'theme.dark'],
    ["'#050D1A'", 'theme.darker'],
    ['"#050D1A"', 'theme.darker'],
    ["'#070F1E'", 'theme.darker'],
    ['"#070F1E"', 'theme.darker'],
  ];
  for (const [from, to] of hexMap) {
    out = out.split(from).join(to);
  }

  // ── 4. Replace hex inside template literals / strings ────────────────────
  // e.g. `linear-gradient(135deg, #0176D3, #014486)` → template literal
  out = out.replace(
    /(['"`])([^'"`]*#0176D3[^'"`]*)(['"`])/g,
    (match, q1, inner, q2) => {
      const replaced = inner
        .replace(/#0176D3/g, '${theme.primary}')
        .replace(/#014486/g, '${theme.primaryDark}')
        .replace(/#00C2CB/g, '${theme.accent}')
        .replace(/#009AA3/g, '${theme.accentDark}')
        .replace(/#032D60/g, '${theme.dark}')
        .replace(/#050D1A/g, '${theme.darker}')
        .replace(/#070F1E/g, '${theme.darker}');
      return '`' + replaced + '`';
    }
  );
  out = out.replace(
    /(['"`])([^'"`]*#00C2CB[^'"`]*)(['"`])/g,
    (match, q1, inner, q2) => {
      const replaced = inner
        .replace(/#0176D3/g, '${theme.primary}')
        .replace(/#014486/g, '${theme.primaryDark}')
        .replace(/#00C2CB/g, '${theme.accent}')
        .replace(/#009AA3/g, '${theme.accentDark}')
        .replace(/#032D60/g, '${theme.dark}')
        .replace(/#050D1A/g, '${theme.darker}')
        .replace(/#070F1E/g, '${theme.darker}');
      return '`' + replaced + '`';
    }
  );
  out = out.replace(
    /(['"`])([^'"`]*#032D60[^'"`]*)(['"`])/g,
    (match, q1, inner, q2) => {
      const replaced = inner
        .replace(/#0176D3/g, '${theme.primary}')
        .replace(/#014486/g, '${theme.primaryDark}')
        .replace(/#00C2CB/g, '${theme.accent}')
        .replace(/#032D60/g, '${theme.dark}')
        .replace(/#050D1A/g, '${theme.darker}')
        .replace(/#070F1E/g, '${theme.darker}');
      return '`' + replaced + '`';
    }
  );

  // ── 5. Replace rgba hardcoded versions ───────────────────────────────────
  // rgba(1,118,211,...) = #0176D3 → rgba(${theme.primaryRgb},...)
  out = out.replace(/rgba\(\s*1\s*,\s*118\s*,\s*211\s*,/g, 'rgba(${theme.primaryRgb},');
  out = out.replace(/rgba\(\s*0\s*,\s*194\s*,\s*203\s*,/g, 'rgba(${theme.accentRgb},');
  out = out.replace(/rgba\(\s*3\s*,\s*45\s*,\s*96\s*,/g,   'rgba(${theme.darkRgb},');
  // Fix: wrap any plain string containing these rgba patterns in template literals
  out = out.replace(/'([^']*rgba\(\$\{theme\.[^']*)'(?!\s*\+)/g, '`$1`');
  out = out.replace(/"([^"]*rgba\(\$\{theme\.[^"]*)"(?!\s*\+)/g, '`$1`');

  return out;
}

const root = path.join(__dirname, '..');
let totalChanged = 0;

for (const rel of FILES) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) { console.log(`SKIP (not found): ${rel}`); continue; }
  const original = fs.readFileSync(file, 'utf8');
  const transformed = transform(original);
  if (transformed !== original) {
    fs.writeFileSync(file, transformed, 'utf8');
    const count = (original.match(/#0176D3|#00C2CB|#032D60|#014486|#050D1A|#070F1E/g) || []).length;
    console.log(`✅ ${rel} — ${count} colors replaced`);
    totalChanged++;
  } else {
    console.log(`⚪ ${rel} — no changes needed`);
  }
}

console.log(`\nDone. ${totalChanged} files updated.`);
