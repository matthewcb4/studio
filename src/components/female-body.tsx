
'use client';

import React from 'react';
import type { MuscleData } from './muscle-heatmap';

interface BodyProps {
  muscleData: MuscleData;
}

const getMuscleColor = (intensity: number = 0) => {
    if (intensity === 0) return 'hsl(var(--muted) / 0.5)';
    const hue = (1 - intensity) * 240; // 240 (blue) to 0 (red)
    return `hsl(${hue}, 100%, 50%)`;
};


export function FemaleBody({ muscleData }: BodyProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" className="w-full h-auto max-h-[400px] mx-auto">
      <title>Female Body Muscle Map</title>
      <g id="female-body-base" fill="hsl(var(--muted) / 0.2)" stroke="hsl(var(--foreground) / 0.5)" strokeWidth="1">
          {/* Head */}
          <circle cx="200" cy="90" r="35" />
          {/* Neck */}
          <path d="M190 125 h 20 v 15 h -20 z" />
          {/* Body */}
          <path d="M165,140 
                   c -15,5 -30,25 -35,40 
                   l -15,80 
                   c 0,20 5,40 10,60 
                   l 15,80 
                   c 5,30 25,50 30,55 
                   l 20,0 
                   c 10,0 20,-5 20,-15 
                   l 0,-295 
                   c 0,10 10,15 20,15 
                   l 20,0 
                   c 5,-5 25,-25 30,-55
                   l 15,-80 
                   c 5,-20 10,-40 10,-60 
                   l -15,-80 
                   c -5,-15 -20,-35 -35,-40 
                   z" />
            {/* Legs */}
            <path d="M180,450 
                     c -10,80 -10,160 0,240 
                     l -15,5 
                     c -10,10 -15,30 -5,50 
                     l 30,20 15,0 5,-310 
                     z" />
            <path d="M220,450 
                     c 10,80 10,160 0,240 
                     l 15,5 
                     c 10,10 15,30 5,50 
                     l -30,20 -15,0 -5,-310 
                     z" />
      </g>
      <g id="female-muscles" stroke="hsl(var(--primary))" strokeWidth="0.5">
          {/* Chest */}
          <path d="M180,160 c-5,20 -5,40 0,60 l20,0 0,-60 z" fill={getMuscleColor(muscleData['Chest']?.intensity)} />
          <path d="M220,160 c5,20 5,40 0,60 l-20,0 0,-60 z" fill={getMuscleColor(muscleData['Chest']?.intensity)} />
          
          {/* Shoulders */}
          <path d="M165,145 a 45,45 0 0 0 -30,15 l -5,20 a 35,35 0 0 1 35,-15" fill={getMuscleColor(muscleData['Shoulders']?.intensity)} />
          <path d="M235,145 a 45,45 0 0 1 30,15 l 5,-20 a 35,35 0 0 0 -35,-15" fill={getMuscleColor(muscleData['Shoulders']?.intensity)} />
          
          {/* Biceps */}
          <path d="M145,210 c-5,20 -5,40 0,60 l10,-5 c-5,-20 -5,-40 0,-60 z" fill={getMuscleColor(muscleData['Biceps']?.intensity || muscleData['Arms']?.intensity)} />
          <path d="M255,210 c5,20 5,40 0,60 l-10,-5 c5,-20 5,-40 0,-60 z" fill={getMuscleColor(muscleData['Biceps']?.intensity || muscleData['Arms']?.intensity)} />
          
          {/* Triceps */}
          <path d="M132,200 l-5,80 10,-5 5,-75 z" fill={getMuscleColor(muscleData['Triceps']?.intensity || muscleData['Arms']?.intensity)} />
          <path d="M268,200 l5,80 -10,-5 -5,-75 z" fill={getMuscleColor(muscleData['Triceps']?.intensity || muscleData['Arms']?.intensity)} />
          
          {/* Back (Lats) */}
          <path d="M170,230 l-5,80 35,0 0,-80 z" fill={getMuscleColor(muscleData['Back']?.intensity)} />
          <path d="M230,230 l5,80 -35,0 0,-80 z" fill={getMuscleColor(muscleData['Back']?.intensity)} />
          
          {/* Core (Abs) */}
          <path d="M185,225 c0,30 30,30 30,0 v 90 c0,5 -30,5 -30,0 z" fill={getMuscleColor(muscleData['Core']?.intensity)} />
          
          {/* Legs (Quads) */}
          <path d="M180,330 c-10,80 -10,160 0,240 l15,0 c-10,-80 -10,-160 0,-240 z" fill={getMuscleColor(muscleData['Legs']?.intensity)} />
          <path d="M220,330 c10,80 10,160 0,240 l-15,0 c10,-80 10,-160 0,-240 z" fill={getMuscleColor(muscleData['Legs']?.intensity)} />
      </g>
    </svg>
  );
}
