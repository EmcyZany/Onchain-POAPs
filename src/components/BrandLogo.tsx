import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon-only' | 'horizontal';
  className?: string;
  id?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'horizontal',
  className = '',
  id = 'brand-logo',
}) => {
  // Dimensions based on size
  const iconDimensions = {
    sm: { box: 28, radius: 7, stroke: 2 },
    md: { box: 36, radius: 9, stroke: 2.5 },
    lg: { box: 48, radius: 12, stroke: 3 },
    xl: { box: 72, radius: 18, stroke: 4 },
  }[size];

  const textSizeClasses = {
    sm: { onchain: 'text-sm', poaps: 'text-[9px] tracking-[0.25em]' },
    md: { onchain: 'text-base font-bold', poaps: 'text-[10px] tracking-[0.28em] font-semibold' },
    lg: { onchain: 'text-xl font-extrabold', poaps: 'text-xs tracking-[0.3em] font-bold' },
    xl: { onchain: 'text-3xl font-black', poaps: 'text-sm tracking-[0.35em] font-bold' },
  }[size];

  const IconBadge = (
    <div
      className="relative flex items-center justify-center shrink-0 shadow-lg shadow-[#0052FF]/10 transition-transform duration-200 hover:scale-105"
      style={{
        width: iconDimensions.box,
        height: iconDimensions.box,
      }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
      >
        <defs>
          {/* Linear Gradient for Chain Links and Ring */}
          <linearGradient id="logoChainGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="45%" stopColor="#2563EB" />
            <stop offset="85%" stopColor="#00D2FF" />
            <stop offset="100%" stopColor="#2DD4BF" />
          </linearGradient>

          <linearGradient id="logoRingGrad" x1="10%" y1="90%" x2="90%" y2="10%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>

          {/* Background Card Fill and Soft Shadow */}
          <linearGradient id="whiteCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F8FAFC" />
          </linearGradient>

          <filter id="badgeShadow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* White Rounded Squircle Card matching attached image */}
        <rect
          x="3"
          y="3"
          width="94"
          height="94"
          rx="26"
          fill="url(#whiteCardGrad)"
          stroke="#E2E8F0"
          strokeWidth="1.5"
        />

        {/* Outer Orbit / Ring Arc */}
        <path
          d="M 50 16 A 34 34 0 1 0 84 50"
          stroke="url(#logoRingGrad)"
          strokeWidth="5.5"
          strokeLinecap="round"
        />

        {/* Small cyan orbit accent dot */}
        <circle cx="81.5" cy="30.5" r="3.2" fill="#00E5FF" />

        {/* Upper Chain Link (Pill shape tilted at 45 deg) */}
        <g transform="rotate(45 50 50)">
          {/* Top Ring Link */}
          <rect
            x="41"
            y="22"
            width="18"
            height="32"
            rx="9"
            stroke="url(#logoChainGrad)"
            strokeWidth="5.5"
            fill="none"
            strokeLinecap="round"
          />

          {/* Bottom Solid/Gradient Link */}
          <rect
            x="41"
            y="46"
            width="18"
            height="32"
            rx="9"
            fill="url(#logoChainGrad)"
            stroke="none"
          />

          {/* Inner Accent Dot / Hole in Bottom Link */}
          <circle cx="50" cy="56" r="4" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  );

  if (variant === 'icon-only') {
    return (
      <div id={id} className={`inline-flex items-center ${className}`}>
        {IconBadge}
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div id={id} className={`flex flex-col items-center text-center gap-2 ${className}`}>
        {IconBadge}
        <div className="flex flex-col items-center">
          <span
            className={`font-black bg-gradient-to-r from-[#A78BFA] via-[#60A5FA] to-[#38BDF8] bg-clip-text text-transparent tracking-tight leading-none ${textSizeClasses.onchain}`}
          >
            Onchain
          </span>
          <span
            className={`text-slate-400 font-bold uppercase tracking-[0.32em] mt-0.5 leading-none ${textSizeClasses.poaps}`}
          >
            POAPS
          </span>
        </div>
      </div>
    );
  }

  // Horizontal variant (default for Navbar and Headers)
  return (
    <div id={id} className={`inline-flex items-center gap-3 select-none ${className}`}>
      {IconBadge}
      <div className="flex flex-col justify-center leading-tight">
        <span
          className={`bg-gradient-to-r from-[#C084FC] via-[#60A5FA] to-[#38BDF8] bg-clip-text text-transparent font-extrabold tracking-tight ${textSizeClasses.onchain}`}
        >
          Onchain
        </span>
        <span
          className={`text-slate-400 font-semibold uppercase ${textSizeClasses.poaps}`}
        >
          POAPS
        </span>
      </div>
    </div>
  );
};
