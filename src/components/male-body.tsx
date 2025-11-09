
import React from 'react';

export function MaleBody() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800">
      <title>Male Body Outline</title>
      {/* Add SVG paths for male body outline here */}
      <g id="male-body">
        <path d="M200 80 Q 180 90, 160 100 L 150 120 L 140 200 Q 140 250, 130 300 L 120 400 L 110 500 Q 110 600, 120 700 L 130 750 L 180 780 L 220 780 L 270 750 L 280 700 Q 290 600, 290 500 L 280 400 L 270 300 Q 260 250, 260 200 L 250 120 L 240 100 Q 220 90, 200 80 Z" fill="hsl(var(--muted))" stroke="hsl(var(--foreground))" strokeWidth="2" />
      </g>
    </svg>
  );
}
