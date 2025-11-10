
'use client';

import React from 'react';
import type { MuscleData } from './muscle-heatmap';

interface BodyProps {
  muscleData: MuscleData;
}

// This function remains for future heatmap integration but is not currently used by the new SVG.
const getMuscleColor = (intensity: number = 0) => {
    if (intensity === 0) return 'hsl(var(--muted) / 0.5)';
    const hue = (1 - intensity) * 240; 
    return `hsl(${hue}, 100%, 50%)`;
};

export function MaleBody({ muscleData }: BodyProps) {
  return (
    <svg width="300" height="400" viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto max-h-[400px] mx-auto">
        <rect width="300" height="400" fill="hsl(var(--card))"/>
        <path fill="hsl(var(--muted-foreground))" d="M150 20 C160 20 170 30 170 40 C170 55 160 70 150 70 C140 70 130 55 130 40 C130 30 140 20 150 20 Z M180 75 L195 140 C205 160 210 180 205 200 C200 220 185 240 170 250 L160 290 L160 380 L140 380 L140 290 L130 250 C115 240 100 220 95 200 C90 180 95 160 105 140 L120 75 Z M185 100 L205 110 L210 130 L200 125 L185 115 Z M115 100 L95 110 L90 130 L100 125 L115 115 Z"/>
    </svg>
  );
}
