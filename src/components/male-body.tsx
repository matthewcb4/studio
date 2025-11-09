
'use client';

import React from 'react';
import type { MuscleData } from './muscle-heatmap';

interface BodyProps {
  muscleData: MuscleData;
}

const getMuscleColor = (intensity: number = 0) => {
    if (intensity === 0) return 'hsl(var(--muted) / 0.5)';
    // Simple gradient from blue (low) to red (high)
    const hue = (1 - intensity) * 240; 
    return `hsl(${hue}, 100%, 50%)`;
};

export function MaleBody({ muscleData }: BodyProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" className="w-full h-auto max-h-[400px] mx-auto">
      <title>Male Body Muscle Map</title>
      <g id="male-body-base" fill="hsl(var(--muted) / 0.2)" stroke="hsl(var(--foreground) / 0.5)" strokeWidth="1">
          {/* Head */}
          <circle cx="200" cy="90" r="40" />
          {/* Neck */}
          <path d="M180 130 h 40 v 20 h -40 z" />
          {/* Body */}
          <path d="M150,150 
                   c -20,10 -40,30 -40,50 
                   l 0,100 
                   c 0,20 10,40 15,50 
                   l 25,60
                   c 10,20 30,30 50,30 
                   l 0,0
                   c 20,0 40,-10 50,-30 
                   l 25,-60 
                   c 5,-10 15,-30 15,-50 
                   l 0,-100
                   c 0,-20 -20,-40 -40,-50
                   z" />
          {/* Legs */}
          <path d="M170,440
                   c -20,80 -20,160 0,240
                   l -20,10
                   c -10,20 0,40 10,50
                   l 40,20 10,0 0,-320
                   z" />
          <path d="M230,440
                   c 20,80 20,160 0,240
                   l 20,10
                   c 10,20 0,40 -10,50
                   l -40,20 -10,0 0,-320
                   z" />
      </g>
      <g id="male-muscles" stroke="hsl(var(--primary))" strokeWidth="0.5">
        {/* Chest */}
        <path d="M165,160 c -5,30 -5,60 0,90 l 35,0 0,-90 z" fill={getMuscleColor(muscleData['Chest']?.intensity)} />
        <path d="M235,160 c 5,30 5,60 0,90 l -35,0 0,-90 z" fill={getMuscleColor(muscleData['Chest']?.intensity)} />
        
        {/* Shoulders */}
        <path d="M150,155 a 50,50 0 0 0 -30,25 l 0,20 a 40,40 0 0 1 35,-20" fill={getMuscleColor(muscleData['Shoulders']?.intensity)} />
        <path d="M250,155 a 50,50 0 0 1 30,25 l 0,-20 a 40,40 0 0 0 -35,-20" fill={getMuscleColor(muscleData['Shoulders']?.intensity)} />
        
        {/* Biceps */}
        <path d="M135,210 c-10,30 -10,60 0,90 l 15,-10 c-10,-25 -10,-55 0,-80 z" fill={getMuscleColor(muscleData['Biceps']?.intensity || muscleData['Arms']?.intensity)} />
        <path d="M265,210 c10,30 10,60 0,90 l-15,-10 c10,-25 10,-55 0,-80 z" fill={getMuscleColor(muscleData['Biceps']?.intensity || muscleData['Arms']?.intensity)} />

        {/* Triceps */}
        <path d="M120,210 l-5,90 15,-10 5,-80 z" fill={getMuscleColor(muscleData['Triceps']?.intensity || muscleData['Arms']?.intensity)} />
        <path d="M280,210 l5,90 -15,-10 -5,-80 z" fill={getMuscleColor(muscleData['Triceps']?.intensity || muscleData['Arms']?.intensity)} />

        {/* Back (Lats) */}
        <path d="M150,250 c-10,40 -5,80 5,100 l 45,0 c-10,-20 -15,-60 -5,-100 z" fill={getMuscleColor(muscleData['Back']?.intensity)} />
        <path d="M250,250 c10,40 5,80 -5,100 l-45,0 c10,-20 15,-60 5,-100 z" fill={getMuscleColor(muscleData['Back']?.intensity)} />
        
        {/* Core (Abs) */}
        <path d="M180,255 c0,40 40,40 40,0 v 90 c0,5 -40,5 -40,0 z" fill={getMuscleColor(muscleData['Core']?.intensity)} />
        
        {/* Legs (Quads) */}
        <path d="M175,360 c -15,80 -15,160 0,240 l 20,0 c-15,-80 -15,-160 0,-240 z" fill={getMuscleColor(muscleData['Legs']?.intensity)} />
        <path d="M225,360 c 15,80 15,160 0,240 l -20,0 c 15,-80 15,-160 0,-240 z" fill={getMuscleColor(muscleData['Legs']?.intensity)} />
      </g>
    </svg>
  );
}
