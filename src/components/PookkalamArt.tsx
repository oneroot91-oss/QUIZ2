import React from "react";

interface PookkalamArtProps {
  size?: number;
  className?: string;
}

export const PookkalamArt: React.FC<PookkalamArtProps> = ({ size = 64, className = "" }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`animate-spin-slow select-none ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" r="48" fill="#FEF3C7" stroke="#D97706" strokeWidth="2" />
      {/* Petal layer 1 - Orange/Red */}
      <g opacity="0.9">
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => (
          <ellipse
            key={`p1-${i}`}
            cx="50"
            cy="18"
            rx="8"
            ry="14"
            fill={i % 2 === 0 ? "#DC2626" : "#EA580C"}
            transform={`rotate(${angle} 50 50)`}
          />
        ))}
      </g>
      {/* Petal layer 2 - Yellow/Gold */}
      <g opacity="0.95">
        {[15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345].map((angle, i) => (
          <ellipse
            key={`p2-${i}`}
            cx="50"
            cy="26"
            rx="6"
            ry="11"
            fill={i % 2 === 0 ? "#FBBF24" : "#F59E0B"}
            transform={`rotate(${angle} 50 50)`}
          />
        ))}
      </g>
      {/* Inner Petal layer - Green & White (Thumba Poovu motif) */}
      <g>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <ellipse
            key={`p3-${i}`}
            cx="50"
            cy="34"
            rx="4.5"
            ry="7.5"
            fill={i % 2 === 0 ? "#059669" : "#FFFFFF"}
            stroke="#D97706"
            strokeWidth="0.75"
            transform={`rotate(${angle} 50 50)`}
          />
        ))}
      </g>
      {/* Center Kasavu Gold Core */}
      <circle cx="50" cy="50" r="11" fill="#B45309" stroke="#FDE68A" strokeWidth="2" />
      <circle cx="50" cy="50" r="6" fill="#F59E0B" />
      <circle cx="50" cy="50" r="2.5" fill="#FFFFFF" />
    </svg>
  );
};
