import React from 'react';

interface BeeLogoProps {
  size?: number;
  className?: string;
}

export default function BeeLogo({ size = 36, className = '' }: BeeLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
      aria-label="Tạp Hóa Của Ong"
    >
      <defs>
        {/* Honey Gold Gradient for Body */}
        <linearGradient id="beeGold" x1="16" y1="18" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="45%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>

        {/* Soft Amber Glow */}
        <linearGradient id="beeHead" x1="32" y1="10" x2="52" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="70%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>

        {/* Dark Velvet Stripe */}
        <linearGradient id="beeStripe" x1="20" y1="20" x2="40" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#374151" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>

        {/* Iridescent Translucent Wings */}
        <linearGradient id="beeWingLeft" x1="10" y1="6" x2="30" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#BAE6FD" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#7DD3FC" stopOpacity="0.4" />
        </linearGradient>

        <linearGradient id="beeWingRight" x1="34" y1="4" x2="52" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F0F9FF" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#BAE6FD" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.35" />
        </linearGradient>

        {/* Honey Drop Accent */}
        <linearGradient id="honeyDrop" x1="48" y1="42" x2="56" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>

        {/* Glow Filter */}
        <filter id="beeGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#F59E0B" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Group with lively friendly floating animation */}
      <g className="bee-animated-body">
        {/* Pollen sparkle particles floating behind bee */}
        <circle cx="8" cy="40" r="1.5" fill="#FDE047" className="bee-sparkle-p1" opacity="0.8" />
        <circle cx="5" cy="33" r="1.2" fill="#F59E0B" className="bee-sparkle-p2" opacity="0.7" />
        <circle cx="12" cy="45" r="1" fill="#FEF08A" className="bee-sparkle-p3" opacity="0.9" />

        {/* Left Wing (Back layer) */}
        <g className="bee-wing-left">
          <path
            d="M 28 26 C 20 12, 10 10, 12 20 C 14 26, 22 28, 28 28 Z"
            fill="url(#beeWingLeft)"
            stroke="#7DD3FC"
            strokeWidth="1.2"
          />
          <path
            d="M 18 17 C 22 22, 25 24, 28 26"
            stroke="#38BDF8"
            strokeWidth="0.8"
            strokeLinecap="round"
            opacity="0.6"
          />
        </g>

        {/* Right Wing (Front Wing - Majestic & Ethereal) */}
        <g className="bee-wing-right">
          <path
            d="M 36 24 C 36 8, 48 4, 52 14 C 55 22, 44 28, 36 27 Z"
            fill="url(#beeWingRight)"
            stroke="#38BDF8"
            strokeWidth="1.2"
          />
          <path
            d="M 44 11 C 42 18, 39 22, 36 25"
            stroke="#0284C7"
            strokeWidth="0.8"
            strokeLinecap="round"
            opacity="0.6"
          />
        </g>

        {/* Cute Stinger */}
        <path d="M 14 36 L 9 37.5 L 14 39 Z" fill="#1F2937" />

        {/* Chubby Bee Body */}
        <ellipse
          cx="29"
          cy="37"
          rx="17"
          ry="13"
          fill="url(#beeGold)"
          filter="url(#beeGlow)"
        />

        {/* Body Stripes (Crisp & Curved for 3D Chubby Feel) */}
        <clipPath id="beeBodyClip">
          <ellipse cx="29" cy="37" rx="17" ry="13" />
        </clipPath>

        <g clipPath="url(#beeBodyClip)">
          {/* Stripe 1 */}
          <path
            d="M 21 22 Q 24 37 21 52 L 26 52 Q 29 37 26 22 Z"
            fill="url(#beeStripe)"
          />
          {/* Stripe 2 */}
          <path
            d="M 31 22 Q 34 37 31 52 L 36 52 Q 39 37 36 22 Z"
            fill="url(#beeStripe)"
          />
          {/* Soft Bottom Shadow */}
          <ellipse cx="29" cy="48" rx="16" ry="4" fill="#B45309" opacity="0.35" />
          {/* Top Gloss Highlight */}
          <ellipse cx="27" cy="27" rx="12" ry="3" fill="#FFFFFF" opacity="0.45" />
        </g>

        {/* Cute Bee Head */}
        <circle cx="43" cy="34" r="11" fill="url(#beeHead)" />

        {/* Rosy Cheek */}
        <ellipse cx="45" cy="38" rx="2.5" ry="1.5" fill="#F43F5E" opacity="0.6" />

        {/* Antennae with wiggle */}
        <g className="bee-antenna-group">
          <path
            d="M 46 25 Q 49 18 53 16"
            stroke="#1F2937"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="53.5" cy="15.5" r="2.2" fill="#F59E0B" stroke="#1F2937" strokeWidth="0.8" />

          <path
            d="M 42 24 Q 41 16 38 13"
            stroke="#1F2937"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="37.5" cy="12.5" r="2.2" fill="#F59E0B" stroke="#1F2937" strokeWidth="0.8" />
        </g>

        {/* Big Adorable Sparkly Eye */}
        <ellipse cx="46.5" cy="32" rx="3.2" ry="4" fill="#111827" />
        {/* Eye Shine Highlights */}
        <circle cx="45.5" cy="30.5" r="1.3" fill="#FFFFFF" />
        <circle cx="47.8" cy="33.8" r="0.6" fill="#FFFFFF" />

        {/* Cheerful Smile */}
        <path
          d="M 49 37 Q 51.5 39 53 36.5"
          stroke="#78350F"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />

        {/* Small Golden Honey Drop Accent */}
        <path
          d="M 54 44 C 54 44 57 48 57 50.5 C 57 52.5 55.5 54 53.5 54 C 51.5 54 50 52.5 50 50.5 C 50 48 54 44 54 44 Z"
          fill="url(#honeyDrop)"
          filter="url(#beeGlow)"
        />
        <circle cx="52.5" cy="50" r="0.8" fill="#FFFFFF" opacity="0.75" />
      </g>
    </svg>
  );
}
