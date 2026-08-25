import React from 'react';

interface FireflyLogoProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

export const FireflyLogo: React.FC<FireflyLogoProps> = ({
  size = 32,
  className = '',
  glow = true,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      id="firefly-logo-container"
    >
      {glow && (
        <div
          className="absolute inset-0 rounded-full blur-md opacity-70 animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(234, 255, 100, 0.9) 0%, rgba(132, 204, 22, 0.4) 70%, transparent 100%)',
          }}
        />
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 transition-transform hover:scale-105 duration-200"
        id="firefly-svg"
      >
        <defs>
          {/* Bioluminescent glow gradient */}
          <radialGradient id="lanternGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="60%" stopColor="#A3E635" />
            <stop offset="100%" stopColor="#4D7C0F" />
          </radialGradient>
          
          {/* Wing gradient */}
          <linearGradient id="wingGradLeft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ECFDF5" stopOpacity="0.35" />
          </linearGradient>

          <linearGradient id="wingGradRight" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ECFDF5" stopOpacity="0.35" />
          </linearGradient>

          {/* Body gradient */}
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
        </defs>

        {/* Antennae */}
        <path
          d="M21 15C19 10 14 8 11 9"
          stroke="#1E293B"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="10" cy="9" r="1.5" fill="#1E293B" />
        
        <path
          d="M27 15C29 10 34 8 37 9"
          stroke="#1E293B"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="38" cy="9" r="1.5" fill="#1E293B" />

        {/* Glowing Lantern Abdomen (Tail) */}
        <ellipse
          cx="24"
          cy="34"
          rx="6.5"
          ry="8"
          fill="url(#lanternGlow)"
          className="animate-pulse"
        />
        {/* Lantern Core Light */}
        <ellipse
          cx="24"
          cy="34"
          rx="3.5"
          ry="4.5"
          fill="#FEF9C3"
          opacity="0.9"
        />

        {/* Left Translucent Wing */}
        <path
          d="M22 21C13 14 7 21 11 30C14 36 21 28 22 23Z"
          fill="url(#wingGradLeft)"
          stroke="#0F172A"
          strokeWidth="1.2"
          strokeOpacity="0.6"
        />
        {/* Wing internal vein */}
        <path
          d="M20 22C16 19 12 24 14 28"
          stroke="#0F172A"
          strokeWidth="0.8"
          strokeOpacity="0.3"
          strokeLinecap="round"
        />

        {/* Right Translucent Wing */}
        <path
          d="M26 21C35 14 41 21 37 30C34 36 27 28 26 23Z"
          fill="url(#wingGradRight)"
          stroke="#0F172A"
          strokeWidth="1.2"
          strokeOpacity="0.6"
        />
        {/* Wing internal vein */}
        <path
          d="M28 22C32 19 36 24 34 28"
          stroke="#0F172A"
          strokeWidth="0.8"
          strokeOpacity="0.3"
          strokeLinecap="round"
        />

        {/* Thorax (Middle Body) */}
        <ellipse
          cx="24"
          cy="23"
          rx="4.5"
          ry="5"
          fill="url(#bodyGrad)"
        />

        {/* Head */}
        <circle
          cx="24"
          cy="15.5"
          rx="3.5"
          fill="url(#bodyGrad)"
        />

        {/* Friendly eyes */}
        <circle cx="22.5" cy="14.5" r="0.8" fill="#F8FAFC" />
        <circle cx="25.5" cy="14.5" r="0.8" fill="#F8FAFC" />
      </svg>
    </div>
  );
};
