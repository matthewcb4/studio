
import React from 'react';

export function MaleBody() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" className="w-full h-auto max-h-[400px] mx-auto">
      <title>Male Body Outline</title>
      <g id="male-body-outline" fill="hsl(var(--muted))" stroke="hsl(var(--foreground))" strokeWidth="2">
        {/* Head */}
        <circle cx="200" cy="90" r="40" />

        {/* Neck */}
        <rect x="180" y="130" width="40" height="30" />

        {/* Shoulders */}
        <path d="M140 160 Q 200 150, 260 160" />
        
        {/* Torso */}
        <path d="M140 160 L 150 350 L 170 400 Q 200 420, 230 400 L 250 350 L 260 160" />
        
        {/* Arms */}
        <path d="M140 160 L 120 320 L 115 450" />
        <path d="M260 160 L 280 320 L 285 450" />

        {/* Legs */}
        <path d="M170 400 L 160 600 L 165 750" />
        <path d="M230 400 L 240 600 L 235 750" />

      </g>
    </svg>
  );
}
