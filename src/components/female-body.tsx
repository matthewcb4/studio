
'use client';

import React from 'react';
import type { MuscleData } from './muscle-heatmap';

interface BodyProps {
  muscleData: MuscleData;
}

// This function remains for future heatmap integration but is not currently used by the new SVG.
const getMuscleColor = (intensity: number = 0) => {
    if (intensity === 0) return 'hsl(var(--muted) / 0.5)';
    const hue = (1 - intensity) * 240; // 240 (blue) to 0 (red)
    return `hsl(${hue}, 100%, 50%)`;
};


export function FemaleBody({ muscleData }: BodyProps) {
  return (
    <svg width="300" height="400" viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto max-h-[400px] mx-auto">
        <rect width="300" height="400" fill="hsl(var(--card))"/>
        <path fill="hsl(var(--muted-foreground))" d="M150 20 C160 20 170 30 170 40 C170 50 160 60 150 60 C140 60 130 50 130 40 C130 30 140 20 150 20 Z M180 65 L190 130 C195 150 190 170 180 190 C170 210 155 225 145 235 L145 380 L125 380 L125 235 C115 225 100 210 90 190 C80 170 75 150 80 130 L90 65 Z M175 90 L190 100 L195 120 L180 115 L175 105 Z M125 90 L110 100 L105 120 L120 115 L125 105 Z"/>
    </svg>
  );
}
