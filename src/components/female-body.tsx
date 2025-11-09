
import React from 'react';

export function FemaleBody() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" className="w-full h-auto max-h-[400px] mx-auto">
      <title>Female Body Outline</title>
      <g id="female-body-outline" fill="hsl(var(--muted))" stroke="hsl(var(--foreground))" strokeWidth="2">
        {/* Head */}
        <circle cx="200" cy="90" r="40" />

        {/* Neck */}
        <rect x="185" y="130" width="30" height="20" />

        {/* Shoulders */}
        <path d="M160 150 Q 200 140, 240 150" />
        
        {/* Upper Body */}
        <path d="M160 150 L 150 250 Q 155 260, 160 270" />
        <path d="M240 150 L 250 250 Q 245 260, 240 270" />

        {/* Arms */}
        <path d="M150 155 L 130 300 L 125 400" />
        <path d="M250 155 L 270 300 L 275 400" />
        
        {/* Torso */}
        <path d="M160 270 C 170 350, 230 350, 240 270" />
        <path d="M180 150 C 180 200, 220 200, 220 150" fill="none" />
        
        {/* Breasts */}
        <path d="M175 190 a 25 25 0 0 1 50 0" fill="hsl(var(--muted))" />

        {/* Waist and Hips */}
        <path d="M160 270 C 150 320, 140 370, 150 420" />
        <path d="M240 270 C 250 320, 260 370, 250 420" />

        {/* Legs */}
        <path d="M150 420 L 170 600 L 175 750" />
        <path d="M250 420 L 230 600 L 225 750" />
        
        {/* Crotch */}
        <path d="M175 420 Q 200 440, 225 420" />
      </g>
    </svg>
  );
}
