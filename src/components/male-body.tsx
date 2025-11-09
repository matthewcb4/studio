
'use client';

import React from 'react';
import type { MuscleData } from './muscle-heatmap';

interface BodyProps {
  muscleData: MuscleData;
}

const getMuscleColor = (intensity: number = 0) => {
    if (intensity === 0) return 'hsl(var(--muted))';
    // Simple gradient from blue (low) to red (high)
    const hue = (1 - intensity) * 240; 
    return `hsl(${hue}, 100%, 50%)`;
};

export function MaleBody({ muscleData }: BodyProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" className="w-full h-auto max-h-[400px] mx-auto">
      <title>Male Body Muscle Map</title>
      <g id="male-body-outline" stroke="hsl(var(--foreground))" strokeWidth="1">
        {/* Head */}
        <circle cx="200" cy="90" r="40" fill="hsl(var(--muted))"/>
        <path d="M180 130 h 40 v 30 h -40 z" fill="hsl(var(--muted))" />

        {/* Chest */}
        <path id="chest" d="M160,165 C 160,220 190,240 200,240 C 210,240 240,220 240,165 Z" fill={getMuscleColor(muscleData['Chest']?.intensity)} />
        
        {/* Shoulders */}
        <path id="shoulders-left" d="M155,160 a 40,40 0 0 0 -35,20 l 10,20 a 30,30 0 0 1 30,-20" fill={getMuscleColor(muscleData['Shoulders']?.intensity)} />
        <path id="shoulders-right" d="M245,160 a 40,40 0 0 1 35,20 l -10,20 a 30,30 0 0 0 -30,-20" fill={getMuscleColor(muscleData['Shoulders']?.intensity)} />
        
        {/* Biceps */}
        <path id="biceps-left" d="M120,200 C 110,240 115,280 130,310 L 145,300 C 135,275 130,245 135,210 Z" fill={getMuscleColor(muscleData['Biceps']?.intensity || muscleData['Arms']?.intensity)} />
        <path id="biceps-right" d="M280,200 C 290,240 285,280 270,310 L 255,300 C 265,275 270,245 265,210 Z" fill={getMuscleColor(muscleData['Biceps']?.intensity || muscleData['Arms']?.intensity)} />

        {/* Triceps (partially visible) */}
        <path id="triceps-left" d="M120,200 L 105,310 L 130,310 L 135,200 Z" fill={getMuscleColor(muscleData['Triceps']?.intensity || muscleData['Arms']?.intensity)} opacity="0.6" />
        <path id="triceps-right" d="M280,200 L 295,310 L 270,310 L 265,200 Z" fill={getMuscleColor(muscleData['Triceps']?.intensity || muscleData['Arms']?.intensity)} opacity="0.6" />

        {/* Back (Lats) */}
        <path id="back-lats" d="M150,240 C 140,300 150,340 165,350 L 235,350 C 250,340 260,300 250,240 Z" fill={getMuscleColor(muscleData['Back']?.intensity)} />

        {/* Core (Abs) */}
        <path id="core-abs" d="M180,245 C 180,300 220,300 220,245 L 220,340 C 220,345 180,345 180,340 Z" fill={getMuscleColor(muscleData['Core']?.intensity)} />
        
        {/* Legs (Quads) */}
        <path id="legs-quads-left" d="M170,360 C 150,480 150,580 170,620 L 190,620 C 170,580 170,480 190,360 Z" fill={getMuscleColor(muscleData['Legs']?.intensity)} />
        <path id="legs-quads-right" d="M230,360 C 250,480 250,580 230,620 L 210,620 C 230,580 230,480 210,360 Z" fill={getMuscleColor(muscleData['Legs']?.intensity)} />

        {/* Full body outline */}
        <path d="M200,130 L 180,160 L 120,190 L 100,320 L 120,450 L 150,600 L 160,750 L 190,750 L 190,630 L 210,630 L 210,750 L 240,750 L 250,600 L 280,450 L 300,320 L 280,190 L 220,160 Z" fill="none" />
      </g>
    </svg>
  );
}
