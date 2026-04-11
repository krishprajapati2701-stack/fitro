import React from "react";

export function FitroLogoIcon({ size = 28, color = "#e8c547" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      {/* T-shirt shape */}
      <path
        d="M3 8 L8 5 Q10 3 14 3 Q18 3 20 5 L25 8 L22 13 L19 11 L19 24 L9 24 L9 11 L6 13 Z"
        fill={color}
        stroke={color}
        strokeWidth="0.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Collar curve */}
      <path
        d="M10 5 Q14 8 18 5"
        fill="none"
        stroke="#1a1a1a"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FitroLogotype({ size = 24, color = "#f5f4f0" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <FitroLogoIcon size={Math.round(size * 1.15)} />
      <span style={{
        fontFamily: "'Bebas Neue', Impact, sans-serif",
        fontSize: size,
        letterSpacing: 4,
        color,
        lineHeight: 1,
        fontWeight: 700,
      }}>FITRO</span>
    </div>
  );
}
