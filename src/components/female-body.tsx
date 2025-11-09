
import React from 'react';

export function FemaleBody() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800">
      <title>Female Body Outline</title>
      {/* Add SVG paths for female body outline here */}
      <g id="female-body">
         <path d="M200 80 Q 185 90, 170 100 L 160 120 L 155 200 Q 150 250, 140 300 L 135 350 Q 125 450, 135 500 L 140 600 L 150 700 L 180 760 L 220 760 L 250 700 L 260 600 L 265 500 Q 275 450, 265 350 L 260 300 Q 250 250, 245 200 L 240 120 L 230 100 Q 215 90, 200 80 Z" fill="hsl(var(--muted))" stroke="hsl(var(--foreground))" strokeWidth="2" />
      </g>
    </svg>
  );
}
