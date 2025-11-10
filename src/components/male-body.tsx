
'use client';

import React from 'react';

export function MaleBody() {
  return (
    <svg 
        width="auto" 
        height="100%"
        viewBox="0 0 300 400" 
        preserveAspectRatio="xMidYMin meet"
        xmlns="http://www.w3.org/2000/svg" 
        >
        <rect width="300" height="400" fill="hsl(var(--card))"/>
        <path fill="hsl(var(--foreground))" d="M150 20 C160 20 170 30 170 40 C170 55 160 70 150 70 C140 70 130 55 130 40 C130 30 140 20 150 20 Z M180 75 L195 140 C205 160 210 180 205 200 C200 220 185 240 170 250 L160 290 L160 380 L140 380 L140 290 L130 250 C115 240 100 220 95 200 C90 180 95 160 105 140 L120 75 Z M185 100 L205 110 L210 130 L200 125 L185 115 Z M115 100 L95 110 L90 130 L100 125 L115 115 Z"/>
    </svg>
  );
}
