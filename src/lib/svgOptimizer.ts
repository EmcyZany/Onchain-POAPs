/**
 * Client-side SVG sanitizer, minifier, size validator, and badge generator
 */

export interface SVGOptimizeResult {
  optimizedSvg: string;
  originalSize: number;
  optimizedSize: number;
  savingsPercentage: number;
  isValid: boolean;
  errorMessage?: string;
  dataUri: string;
}

export function sanitizeAndOptimizeSvg(rawSvg: string): SVGOptimizeResult {
  if (!rawSvg || typeof rawSvg !== 'string') {
    return {
      optimizedSvg: '',
      originalSize: 0,
      optimizedSize: 0,
      savingsPercentage: 0,
      isValid: false,
      errorMessage: 'Empty SVG content provided.',
      dataUri: '',
    };
  }

  const originalSize = new Blob([rawSvg]).size;

  // Basic check for <svg> tag
  if (!/<svg[\s\S]*?>[\s\S]*?<\/svg>/i.test(rawSvg)) {
    return {
      optimizedSvg: rawSvg,
      originalSize,
      optimizedSize: originalSize,
      savingsPercentage: 0,
      isValid: false,
      errorMessage: 'Invalid SVG: Missing valid <svg> and </svg> tags.',
      dataUri: '',
    };
  }

  // Sanitize: remove <script>, javascript:, onload, onerror, etc.
  let cleaned = rawSvg
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Ensure xmlns is present
  if (!cleaned.includes('xmlns="http://www.w3.org/2000/svg"')) {
    cleaned = cleaned.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  // Minify whitespace
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();

  const optimizedSize = new Blob([cleaned]).size;
  const savings = originalSize > 0 ? Math.round(((originalSize - optimizedSize) / originalSize) * 100) : 0;
  
  const encoded = encodeURIComponent(cleaned);
  const dataUri = `data:image/svg+xml;utf8,${encoded}`;

  return {
    optimizedSvg: cleaned,
    originalSize,
    optimizedSize,
    savingsPercentage: Math.max(0, savings),
    isValid: true,
    dataUri,
  };
}

export interface BadgeTemplate {
  id: string;
  name: string;
  category: string;
  generateSvg: (title: string, date: string, color: string) => string;
}

export const POAP_BADGE_TEMPLATES: BadgeTemplate[] = [
  {
    id: 'base-blue',
    name: 'Base Builder Shield',
    category: 'Ecosystem',
    generateSvg: (title, date, color = '#0052FF') => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0a192f"/>
      <stop offset="100%" stop-color="#020817"/>
    </radialGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${color}"/>
      <stop offset="100%" stop-color="#00C2FF"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="500" height="500" rx="250" fill="url(#bgGrad)"/>
  <circle cx="250" cy="250" r="235" fill="none" stroke="url(#accentGrad)" stroke-width="4" stroke-dasharray="12 8" opacity="0.6"/>
  <circle cx="250" cy="250" r="215" fill="none" stroke="#1e293b" stroke-width="2"/>
  
  <!-- Base Emblem Hexagon -->
  <polygon points="250,85 385,163 385,318 250,395 115,318 115,163" fill="#0f172a" stroke="url(#accentGrad)" stroke-width="6" filter="url(#glow)"/>
  
  <!-- Center Core Icon -->
  <circle cx="250" cy="220" r="60" fill="url(#accentGrad)"/>
  <path d="M225,220 L245,240 L278,200" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  
  <!-- Badge Header -->
  <text x="250" y="145" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="14" font-weight="700" letter-spacing="4">ONCHAIN POAP</text>
  
  <!-- Title -->
  <text x="250" y="325" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="20" font-weight="800">${escapeXml(title || 'BASE EVENT')}</text>
  
  <!-- Subtitle / Date -->
  <text x="250" y="355" text-anchor="middle" fill="#38bdf8" font-family="sans-serif" font-size="13" font-weight="600" letter-spacing="2">${escapeXml(date || 'BASE SEPOLIA')}</text>
</svg>`.trim(),
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon Pass',
    category: 'Gaming & Web3',
    generateSvg: (title, date, color = '#F43F5E') => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
  <defs>
    <linearGradient id="neonBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18002a"/>
      <stop offset="100%" stop-color="#050014"/>
    </linearGradient>
    <linearGradient id="neonLine" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${color}"/>
      <stop offset="50%" stop-color="#A855F7"/>
      <stop offset="100%" stop-color="#06B6D4"/>
    </linearGradient>
  </defs>
  <circle cx="250" cy="250" r="240" fill="url(#neonBg)" stroke="url(#neonLine)" stroke-width="6"/>
  <circle cx="250" cy="250" r="210" fill="none" stroke="#3b0764" stroke-width="3"/>
  <circle cx="250" cy="250" r="190" fill="#0d0415" stroke="${color}" stroke-width="2" stroke-dasharray="4 6"/>
  
  <!-- Cyber Star / Diamond -->
  <polygon points="250,110 330,220 250,330 170,220" fill="none" stroke="url(#neonLine)" stroke-width="4"/>
  <circle cx="250" cy="220" r="28" fill="${color}"/>
  
  <!-- Text -->
  <text x="250" y="375" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="22" font-weight="900" letter-spacing="1">${escapeXml(title || 'CYBERPASS 2026')}</text>
  <text x="250" y="405" text-anchor="middle" fill="#f472b6" font-family="sans-serif" font-size="14" font-weight="700" letter-spacing="3">${escapeXml(date || 'VERIFIED ONCHAIN')}</text>
</svg>`.trim(),
  },
  {
    id: 'golden-laurel',
    name: 'Gold Achievement Coin',
    category: 'Prestige',
    generateSvg: (title, date, color = '#EAB308') => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
  <defs>
    <radialGradient id="goldCoin" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="50%" stop-color="${color}"/>
      <stop offset="100%" stop-color="#854D0E"/>
    </radialGradient>
    <radialGradient id="innerDark" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1c1917"/>
      <stop offset="100%" stop-color="#0c0a09"/>
    </radialGradient>
  </defs>
  <circle cx="250" cy="250" r="240" fill="url(#goldCoin)"/>
  <circle cx="250" cy="250" r="225" fill="none" stroke="#ca8a04" stroke-width="3"/>
  <circle cx="250" cy="250" r="210" fill="url(#innerDark)"/>
  
  <!-- Star Medallion -->
  <path d="M250 130 L275 190 L340 195 L290 235 L305 300 L250 265 L195 300 L210 235 L160 195 L225 190 Z" fill="url(#goldCoin)"/>
  
  <text x="250" y="350" text-anchor="middle" fill="#fef08a" font-family="sans-serif" font-size="20" font-weight="800">${escapeXml(title || 'MASTER ATTENDEE')}</text>
  <text x="250" y="380" text-anchor="middle" fill="#a8a29e" font-family="sans-serif" font-size="13" font-weight="600" letter-spacing="2">${escapeXml(date || 'PROTOCOL PROOF')}</text>
</svg>`.trim(),
  },
  {
    id: 'emerald-summit',
    name: 'Emerald Hacker Summit',
    category: 'Hackathon',
    generateSvg: (title, date, color = '#10B981') => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
  <defs>
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${color}"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
  </defs>
  <circle cx="250" cy="250" r="240" fill="#022c22" stroke="url(#emeraldGrad)" stroke-width="6"/>
  <polygon points="250,90 390,250 250,410 110,250" fill="none" stroke="${color}" stroke-width="3" opacity="0.5"/>
  <circle cx="250" cy="220" r="55" fill="url(#emeraldGrad)"/>
  <path d="M230 205 L215 220 L230 235 M270 205 L285 220 L270 235 M255 198 L245 242" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
  <text x="250" y="325" text-anchor="middle" fill="#ecfdf5" font-family="sans-serif" font-size="20" font-weight="800">${escapeXml(title || 'ETH GLOBAL')}</text>
  <text x="250" y="355" text-anchor="middle" fill="#6ee7b7" font-family="sans-serif" font-size="13" font-weight="600" letter-spacing="2">${escapeXml(date || 'BUILDER ATTENDANCE')}</text>
</svg>`.trim(),
  },
];

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
