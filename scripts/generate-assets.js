import fs from 'fs';
import { Resvg } from '@resvg/resvg-js';

// 1. Generate 512x512 App Icon (Safe-area centered for circular & squircle cropping in Farcaster)
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">
  <defs>
    <!-- Background Gradient -->
    <radialGradient id="iconBgGrad" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#282A30" />
      <stop offset="100%" stop-color="#141518" />
    </radialGradient>

    <!-- Linear Gradient for Chain Links -->
    <linearGradient id="iconChainGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7C3AED" />
      <stop offset="35%" stop-color="#3B82F6" />
      <stop offset="75%" stop-color="#00D2FF" />
      <stop offset="100%" stop-color="#2DD4BF" />
    </linearGradient>

    <!-- Linear Gradient for Orbit Ring -->
    <linearGradient id="iconRingGrad" x1="10%" y1="90%" x2="90%" y2="10%">
      <stop offset="0%" stop-color="#8B5CF6" />
      <stop offset="45%" stop-color="#3B82F6" />
      <stop offset="100%" stop-color="#06B6D4" />
    </linearGradient>

    <!-- White Card Subtle Gradient -->
    <linearGradient id="iconWhiteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#F3F4F6" />
    </linearGradient>

    <!-- Soft Drop Shadow on Card -->
    <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.5" />
    </filter>
  </defs>

  <!-- Dark Canvas -->
  <rect width="512" height="512" rx="112" fill="url(#iconBgGrad)" />

  <!-- Centered White Squircle Card (Size 340x340 placed at 86, 86) -->
  <g filter="url(#cardShadow)">
    <rect x="86" y="86" width="340" height="340" rx="96" fill="url(#iconWhiteGrad)" stroke="#E5E7EB" stroke-width="3" />
    
    <!-- Outer Circular Orbit Ring (Center: 256, 256, Radius: 116) -->
    <path
      d="M 256 140 A 116 116 0 1 0 372 256"
      stroke="url(#iconRingGrad)"
      stroke-width="19"
      stroke-linecap="round"
    />
    
    <!-- Orbit Accent Cyan Dot -->
    <circle cx="363.5" cy="189.5" r="11" fill="#00E5FF" />

    <!-- 45-degree Rotated Chain Link Group -->
    <g transform="rotate(45 256 256)">
      <!-- Top Open Loop Link -->
      <rect
        x="226"
        y="158"
        width="60"
        height="110"
        rx="30"
        stroke="url(#iconChainGrad)"
        stroke-width="19"
        fill="none"
        stroke-linecap="round"
      />
      <!-- Bottom Solid Gradient Link -->
      <rect
        x="226"
        y="244"
        width="60"
        height="110"
        rx="30"
        fill="url(#iconChainGrad)"
      />
      <!-- Center White Hole / Dot inside Bottom Link -->
      <circle cx="256" cy="278" r="14" fill="#FFFFFF" />
    </g>
  </g>
</svg>`;

// 2. Generate 1200x800 (3:2 Aspect Ratio) Hero Display Image for Farcaster Mini App Embed & Frame
const heroSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" fill="none">
  <defs>
    <!-- Dark Atmospheric Background Gradients -->
    <radialGradient id="heroGlowCenter" cx="50%" cy="42%" r="55%">
      <stop offset="0%" stop-color="#1E293B" stop-opacity="0.9" />
      <stop offset="40%" stop-color="#0F172A" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#090A0D" stop-opacity="1" />
    </radialGradient>

    <radialGradient id="ambientCyanBlue" cx="25%" cy="30%" r="45%">
      <stop offset="0%" stop-color="#0052FF" stop-opacity="0.22" />
      <stop offset="100%" stop-color="#0052FF" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="ambientPurple" cx="75%" cy="35%" r="45%">
      <stop offset="0%" stop-color="#8B5CF6" stop-opacity="0.22" />
      <stop offset="100%" stop-color="#8B5CF6" stop-opacity="0" />
    </radialGradient>

    <!-- Linear Gradients for Logo Components -->
    <linearGradient id="heroChainGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7C3AED" />
      <stop offset="35%" stop-color="#3B82F6" />
      <stop offset="75%" stop-color="#00D2FF" />
      <stop offset="100%" stop-color="#2DD4BF" />
    </linearGradient>

    <linearGradient id="heroRingGrad" x1="10%" y1="90%" x2="90%" y2="10%">
      <stop offset="0%" stop-color="#8B5CF6" />
      <stop offset="45%" stop-color="#3B82F6" />
      <stop offset="100%" stop-color="#06B6D4" />
    </linearGradient>

    <linearGradient id="heroWhiteCard" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#F3F4F6" />
    </linearGradient>

    <!-- Gradient for 'Onchain' Typography -->
    <linearGradient id="textOnchainGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#C084FC" />
      <stop offset="45%" stop-color="#818CF8" />
      <stop offset="80%" stop-color="#60A5FA" />
      <stop offset="100%" stop-color="#38BDF8" />
    </linearGradient>

    <!-- Drop Shadows -->
    <filter id="heroBadgeShadow" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#000000" flood-opacity="0.65" />
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0052FF" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Deep Dark Background -->
  <rect width="1200" height="800" fill="url(#heroGlowCenter)" />
  <rect width="1200" height="800" fill="url(#ambientCyanBlue)" />
  <rect width="1200" height="800" fill="url(#ambientPurple)" />

  <!-- Subtle Ambient Grid Lines -->
  <g opacity="0.04" stroke="#FFFFFF" stroke-width="1.5">
    <line x1="0" y1="200" x2="1200" y2="200" />
    <line x1="0" y1="400" x2="1200" y2="400" />
    <line x1="0" y1="600" x2="1200" y2="600" />
    <line x1="300" y1="0" x2="300" y2="800" />
    <line x1="600" y1="0" x2="600" y2="800" />
    <line x1="900" y1="0" x2="900" y2="800" />
  </g>

  <!-- Centered Logo Lockup -->
  <!-- 1. White Squircle Badge (360x360 centered horizontally at X: 420, Y: 110) -->
  <g transform="translate(420, 110)" filter="url(#heroBadgeShadow)">
    <rect x="0" y="0" width="360" height="360" rx="100" fill="url(#heroWhiteCard)" stroke="#E5E7EB" stroke-width="3" />
    
    <!-- Outer Orbit Ring (Center: 180, 180, Radius: 122) -->
    <path
      d="M 180 58 A 122 122 0 1 0 302 180"
      stroke="url(#heroRingGrad)"
      stroke-width="20"
      stroke-linecap="round"
    />
    
    <!-- Orbit Accent Cyan Dot -->
    <circle cx="293.5" cy="110" r="11.5" fill="#00E5FF" />

    <!-- 45-degree Rotated Chain Link -->
    <g transform="rotate(45 180 180)">
      <!-- Top Open Loop -->
      <rect
        x="148"
        y="76"
        width="64"
        height="116"
        rx="32"
        stroke="url(#heroChainGrad)"
        stroke-width="20"
        fill="none"
        stroke-linecap="round"
      />
      <!-- Bottom Solid Link -->
      <rect
        x="148"
        y="168"
        width="64"
        height="116"
        rx="32"
        fill="url(#heroChainGrad)"
      />
      <!-- Center White Dot -->
      <circle cx="180" cy="204" r="15" fill="#FFFFFF" />
    </g>
  </g>

  <!-- 2. Typography Lockup Below Badge -->
  <!-- "Onchain" -->
  <text
    x="600"
    y="565"
    text-anchor="middle"
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
    font-size="68"
    font-weight="900"
    fill="url(#textOnchainGrad)"
    letter-spacing="-1.5"
  >Onchain</text>

  <!-- "POAPS" -->
  <text
    x="600"
    y="628"
    text-anchor="middle"
    font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
    font-size="28"
    font-weight="800"
    fill="#94A3B8"
    letter-spacing="14"
  >POAPS</text>

  <!-- 3. Bottom Protocol Badge / Pill -->
  <g transform="translate(460, 680)">
    <rect width="280" height="38" rx="19" fill="#1E2230" stroke="#334155" stroke-width="1.5" />
    <circle cx="24" cy="19" r="5" fill="#0052FF" />
    <text
      x="40"
      y="24"
      fill="#94A3B8"
      font-family="system-ui, -apple-system, sans-serif"
      font-size="13"
      font-weight="700"
      letter-spacing="1"
    >FARCASTER MINI APP • BASE</text>
  </g>
</svg>`;

// 3. Generate 512x512 Logo with Text (for square embeds, splash screens, and avatars)
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">
  <defs>
    <radialGradient id="logoBgGrad" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#23252B" />
      <stop offset="100%" stop-color="#111215" />
    </radialGradient>

    <linearGradient id="logoChainGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7C3AED" />
      <stop offset="35%" stop-color="#3B82F6" />
      <stop offset="75%" stop-color="#00D2FF" />
      <stop offset="100%" stop-color="#2DD4BF" />
    </linearGradient>

    <linearGradient id="logoRingGrad" x1="10%" y1="90%" x2="90%" y2="10%">
      <stop offset="0%" stop-color="#8B5CF6" />
      <stop offset="45%" stop-color="#3B82F6" />
      <stop offset="100%" stop-color="#06B6D4" />
    </linearGradient>

    <linearGradient id="logoWhiteCard" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#F3F4F6" />
    </linearGradient>

    <linearGradient id="logoTextGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#C084FC" />
      <stop offset="50%" stop-color="#60A5FA" />
      <stop offset="100%" stop-color="#38BDF8" />
    </linearGradient>

    <filter id="logoShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.6" />
    </filter>
  </defs>

  <rect width="512" height="512" rx="112" fill="url(#logoBgGrad)" />

  <!-- Badge at X: 146, Y: 46, Size: 220x220 -->
  <g transform="translate(146, 46)" filter="url(#logoShadow)">
    <rect x="0" y="0" width="220" height="220" rx="64" fill="url(#logoWhiteCard)" stroke="#E5E7EB" stroke-width="2" />
    
    <path
      d="M 110 35 A 75 75 0 1 0 185 110"
      stroke="url(#logoRingGrad)"
      stroke-width="12.5"
      stroke-linecap="round"
    />
    
    <circle cx="180" cy="67" r="7" fill="#00E5FF" />

    <g transform="rotate(45 110 110)">
      <rect
        x="90"
        y="46"
        width="40"
        height="72"
        rx="20"
        stroke="url(#logoChainGrad)"
        stroke-width="12.5"
        fill="none"
        stroke-linecap="round"
      />
      <rect
        x="90"
        y="104"
        width="40"
        height="72"
        rx="20"
        fill="url(#logoChainGrad)"
      />
      <circle cx="110" cy="126" r="9" fill="#FFFFFF" />
    </g>
  </g>

  <!-- Typography -->
  <text
    x="256"
    y="360"
    text-anchor="middle"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="52"
    font-weight="900"
    fill="url(#logoTextGrad)"
    letter-spacing="-1"
  >Onchain</text>

  <text
    x="256"
    y="410"
    text-anchor="middle"
    font-family="system-ui, -apple-system, sans-serif"
    font-size="22"
    font-weight="800"
    fill="#94A3B8"
    letter-spacing="12"
  >POAPS</text>
</svg>`;

function renderPng(svgString) {
  const resvg = new Resvg(svgString, {
    fitTo: { mode: 'original' },
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

// Write SVGs
fs.writeFileSync('public/icon.svg', iconSvg);
fs.writeFileSync('public/hero-preview.svg', heroSvg);
fs.writeFileSync('public/logo.svg', logoSvg);

// Write High-Res PNGs
fs.writeFileSync('public/icon.png', renderPng(iconSvg));
fs.writeFileSync('public/hero-preview.png', renderPng(heroSvg));
fs.writeFileSync('public/logo.png', renderPng(logoSvg));

// Also render screenshots from public SVG files if they exist
['screenshot-explore', 'screenshot-mint', 'screenshot-create'].forEach((name) => {
  if (fs.existsSync(`public/${name}.svg`)) {
    const content = fs.readFileSync(`public/${name}.svg`, 'utf-8');
    fs.writeFileSync(`public/${name}.png`, renderPng(content));
  }
});

console.log('High quality Icon, Hero, Logo, and Screenshots rendered successfully!');
