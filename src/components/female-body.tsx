
'use client';

import React from 'react';
import type { MuscleData } from './muscle-heatmap';

interface BodyProps {
  muscleData: MuscleData;
}

const getMuscleColor = (intensity: number = 0) => {
    if (intensity === 0) return 'transparent';
    const hue = (1 - intensity) * 240; // 240 (blue) to 0 (red)
    return `hsl(${hue}, 90%, 55%)`;
};


export function FemaleBody({ muscleData }: BodyProps) {
  return (
    <svg 
        width="100%" 
        height="auto"
        viewBox="0 0 300 500" 
        preserveAspectRatio="xMidYMin meet"
        xmlns="http://www.w3.org/2000/svg" 
        className="w-full h-auto max-h-[350px] mx-auto"
        >
        <g id="body-outline">
            <path fill="hsl(var(--muted-foreground) / 0.5)" d="m162.2,60.8c0,8.1-7,14.7-15.6,14.7s-15.6-6.6-15.6-14.7c0-8.1,7-14.7,15.6-14.7s15.6,6.6,15.6,14.7zm4.3,16.5c-1.9,1-4,1.5-6.2,1.5-8.4,0-15.2-6.8-15.2-15.2,0-1.5,0.2-2.9,0.7-4.3-12.3,3.3-21.4,14.5-21.4,27.5v2.3h-0.2c-10.5,0-19.6,6-24.8,14.8-2-0.4-4-0.7-6.1-0.7-9.9,0-19.1,3.9-25.6,10.8-2-0.8-4.1-1.2-6.3-1.2-12.3,0-22.2,9.9-22.2,22.2,0,1.7,0.2,3.4,0.5,5-1.8,4.9-2.8,10.1-2.8,15.5,0,18,4.9,35.1,14.3,50.4,10.1,16.4,24.6,29.3,42.5,38.2v142.2h13c4.3,0,7.8-3.5,7.8-7.8v-112.2h7.8v112.2c0,4.3,3.5,7.8,7.8,7.8h13V302.2c17.9-8.9,32.4-21.8,42.5-38.2,9.4-15.3,14.3-32.4,14.3-50.4,0-5.4-1-10.6-2.8-15.5,0.4-1.6,0.5-3.3,0.5-5,0-12.3-9.9-22.2-22.2-22.2-2.2,0-4.3,0.4-6.3,1.2-6.5-6.8-15.7-10.8-25.6-10.8-2.1,0-4.1,0.2-6.1,0.7-5.2-8.8-14.4-14.8-24.8-14.8h-0.2v-2.3c0-13-9.1-24.2-21.4-27.5z"/>
        </g>
        <g id="muscles">
            {/* Chest */}
            <path id="muscle-chest-l" fill={getMuscleColor(muscleData.Chest?.intensity)} d="M125,140c-10,5-15,15-20,25-5,10,0,20,5,25l20-10v-40z" />
            <path id="muscle-chest-r" fill={getMuscleColor(muscleData.Chest?.intensity)} d="M175,140c10,5,15,15,20,25,5,10,0,20-5,25l-20-10v-40z" />
            {/* Abs */}
            <path id="muscle-core-upper" fill={getMuscleColor(muscleData.Core?.intensity)} d="M140,190h20v15h-20z M140,210h20v15h-20z M140,230h20v15h-20z" />
            {/* Shoulders */}
            <path id="muscle-shoulders-l" fill={getMuscleColor(muscleData.Shoulders?.intensity)} d="M105,120c-15,0-25,15-25,30s10,30,25,30h15v-60h-15z" />
            <path id="muscle-shoulders-r" fill={getMuscleColor(muscleData.Shoulders?.intensity)} d="M195,120c15,0,25,15,25,30s-10,30-25,30h-15v-60h15z" />
            {/* Biceps */}
            <path id="muscle-biceps-l" fill={getMuscleColor(muscleData.Biceps?.intensity)} d="M80,180 c0,20,10,30,20,30h5v-30h-5c-5,0-10-10-10-30z" />
            <path id="muscle-biceps-r" fill={getMuscleColor(muscleData.Biceps?.intensity)} d="M220,180 c0,20-10,30-20,30h-5v-30h5c5,0,10-10,10-30z" />
             {/* Triceps - part of arms */}
            <path id="muscle-triceps-l" fill={getMuscleColor(muscleData.Triceps?.intensity)} d="M85,180 l-5,30h15l-5-30h-5z" />
            <path id="muscle-triceps-r" fill={getMuscleColor(muscleData.Triceps?.intensity)} d="M215,180 l5,30h-15l5-30h5z" />
            {/* Legs */}
            <path id="muscle-quads-l" fill={getMuscleColor(muscleData.Legs?.intensity)} d="M125,255v120h-25c-10,0-15-5-15-15V270c0-10,5-15,15-15h25z" />
            <path id="muscle-quads-r" fill={getMuscleColor(muscleData.Legs?.intensity)} d="M175,255v120h25c10,0,15-5,15-15V270c0-10-5-15-15-15h-25z" />
        </g>
    </svg>
  );
}
