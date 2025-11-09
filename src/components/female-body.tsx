
'use client';

import React from 'react';
import type { MuscleData } from './muscle-heatmap';

interface BodyProps {
  muscleData: MuscleData;
}

const getMuscleColor = (intensity: number = 0) => {
    if (intensity === 0) return 'hsl(var(--muted))';
    const hue = (1 - intensity) * 240; // 240 (blue) to 0 (red)
    return `hsl(${hue}, 100%, 50%)`;
};


export function FemaleBody({ muscleData }: BodyProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" className="w-full h-auto max-h-[400px] mx-auto">
      <title>Female Body Muscle Map</title>
      <g id="female-body-outline" stroke="hsl(var(--foreground))" strokeWidth="1">
        {/* Head */}
        <circle cx="200" cy="90" r="40" fill="hsl(var(--muted))" />
        <path d="M185 130 h 30 v 20 h -30 z" fill="hsl(var(--muted))" />

        {/* Chest */}
        <path id="chest" d="M180,155 C 170,180 170,205 180,230 L 200,230 L 200,155 Z M220,155 C 230,180 230,205 220,230 L 200,230 L 200,155 Z" fill={getMuscleColor(muscleData['Chest']?.intensity)} />
        
        {/* Shoulders */}
        <path id="shoulders-left" d="M175,150 a 35,35 0 0 0 -35,15 l 5,20 a 30,30 0 0 1 30,-15" fill={getMuscleColor(muscleData['Shoulders']?.intensity)} />
        <path id="shoulders-right" d="M225,150 a 35,35 0 0 1 35,15 l -5,20 a 30,30 0 0 0 -30,-15" fill={getMuscleColor(muscleData['Shoulders']?.intensity)} />
        
        {/* Biceps */}
        <path id="biceps-left" d="M142,190 C 135,220 135,250 145,280 L 155,275 C 150,250 150,220 152,195 Z" fill={getMuscleColor(muscleData['Biceps']?.intensity || muscleData['Arms']?.intensity)} />
        <path id="biceps-right" d="M258,190 C 265,220 265,250 255,280 L 245,275 C 250,250 250,220 248,195 Z" fill={getMuscleColor(muscleData['Biceps']?.intensity || muscleData['Arms']?.intensity)} />

        {/* Triceps - less visible from front */}
        <path id="triceps-left" d="M140,190 L 135,280 L 145,280 L 150,190 Z" fill={getMuscleColor(muscleData['Triceps']?.intensity || muscleData['Arms']?.intensity)} opacity="0.6" />
        <path id="triceps-right" d="M260,190 L 265,280 L 255,280 L 250,190 Z" fill={getMuscleColor(muscleData['Triceps']?.intensity || muscleData['Arms']?.intensity)} opacity="0.6" />
        
        {/* Back (Lats) */}
        <path id="back-lats" d="M160,230 C 150,300 160,320 170,330 L 230,330 C 240,320 250,300 240,230 Z" fill={getMuscleColor(muscleData['Back']?.intensity)} />

        {/* Core (Abs) */}
        <path id="core-abs" d="M180,235 C 180,280 220,280 220,235 L 220,320 C 220,325 180,325 180,320 Z" fill={getMuscleColor(muscleData['Core']?.intensity)} />
        
        {/* Legs (Quads) */}
        <path id="legs-quads-left" d="M175,340 C 150,450 150,550 170,600 L 190,600 C 170,550 170,450 195,340 Z" fill={getMuscleColor(muscleData['Legs']?.intensity)} />
        <path id="legs-quads-right" d="M225,340 C 250,450 250,550 230,600 L 210,600 C 230,550 230,450 205,340 Z" fill={getMuscleColor(muscleData['Legs']?.intensity)} />
        
        {/* Full body outline */}
        <path d="M200,130 L 180,150 L 140,180 L 130,300 L 140,420 L 160,580 L 165,750 L 190,750 L 190,600 L 210,600 L 210,750 L 235,750 L 240,580 L 260,420 L 270,300 L 260,180 L 220,150 Z" fill="none" />
      </g>
    </svg>
  );
}
