
'use client';

import React from 'react';
import type { MuscleData } from './muscle-heatmap';

interface BodyProps {
  muscleData: MuscleData;
}

const getMuscleColor = (intensity: number = 0) => {
    if (intensity === 0) return 'hsl(var(--muted-foreground) / 0.3)';
    const hue = (1 - intensity) * 240; 
    return `hsl(${hue}, 90%, 55%)`;
};

export function MaleBody({ muscleData }: BodyProps) {
  return (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 300 500" 
        className="w-full h-auto max-h-[500px] mx-auto"
        preserveAspectRatio="xMidYMin meet">
    <g id="body-outline">
        <path fill="hsl(var(--muted-foreground) / 0.5)" d="M166.3,64.3c0,9.9-8.4,18-18.7,18s-18.7-8.1-18.7-18c0-9.9,8.4-18,18.7-18S166.3,54.4,166.3,64.3z M170.8,85.1 c-2.3,1.2-4.8,1.9-7.5,1.9c-10.2,0-18.5-8.3-18.5-18.5c0-1.8,0.3-3.6,0.8-5.3c-14.9,4-26,17.7-26,33.5v2.8h-0.2 c-12.7,0-23.9,7.3-30.2,18.1c-2.3-0.5-4.7-0.8-7.1-0.8c-12,0-23.2,4.8-31.1,13.1c-2.4-0.9-5-1.5-7.7-1.5c-14.9,0-27,12.1-27,27 c0,2.1,0.2,4.1,0.7,6.1c-2.2,6-3.4,12.3-3.4,18.9c0,21.9,6,42.8,17.4,61.4c12.2,20,29.9,35.7,51.7,46.5v120.3h15.9 c5.2,0,9.5-4.3,9.5-9.5v-97.8h9.5v97.8c0,5.2,4.3,9.5,9.5,9.5h15.9V318.5c21.8-10.7,39.5-26.5,51.7-46.5 c11.4-18.6,17.4-39.5,17.4-61.4c0-6.6-1.2-12.9-3.4-18.9c0.5-2,0.7-4,0.7-6.1c0-14.9-12.1-27-27-27c-2.7,0-5.3,0.5-7.7,1.5 c-7.9-8.3-19.1-13.1-31.1-13.1c-2.4,0-4.8,0.3-7.1,0.8c-6.3-10.8-17.5-18.1-30.2-18.1h-0.2v-2.8 C196.8,102.7,185.7,89.1,170.8,85.1z" />
    </g>
    <g id="muscles">
        {/* Chest */}
        <path id="muscle-chest-l" fill={getMuscleColor(muscleData.Chest?.intensity)} d="M125,145c-10,5-20,15-25,25c-5,10-5,20,0,30l25-10V145z" />
        <path id="muscle-chest-r" fill={getMuscleColor(muscleData.Chest?.intensity)} d="M175,145c10,5,20,15,25,25c5,10,5,20,0,30l-25-10V145z" />
        {/* Abs */}
        <path id="muscle-core-upper" fill={getMuscleColor(muscleData.Core?.intensity)} d="M140,195h20v15h-20z M140,215h20v15h-20z M140,235h20v15h-20z" />
        {/* Shoulders */}
        <path id="muscle-shoulders-l" fill={getMuscleColor(muscleData.Shoulders?.intensity)} d="M100,120c-15,0-25,15-25,30s10,30,25,30h20v-60H100z" />
        <path id="muscle-shoulders-r" fill={getMuscleColor(muscleData.Shoulders?.intensity)} d="M200,120c15,0,25,15,25,30s-10,30-25,30h-20v-60H200z" />
        {/* Biceps */}
        <path id="muscle-biceps-l" fill={getMuscleColor(muscleData.Biceps?.intensity)} d="M70,180 c0,20,10,30,20,30h5v-30h-5 C75,210,70,200,70,180z" />
        <path id="muscle-biceps-r" fill={getMuscleColor(muscleData.Biceps?.intensity)} d="M230,180 c0,20-10,30-20,30h-5v-30h5 C225,210,230,200,230,180z" />
        {/* Triceps - part of arms */}
        <path id="muscle-triceps-l" fill={getMuscleColor(muscleData.Triceps?.intensity)} d="M75,180 l-5,30h15l-5-30h-5z" />
        <path id="muscle-triceps-r" fill={getMuscleColor(muscleData.Triceps?.intensity)} d="M225,180 l5,30h-15l5-30h5z" />
        {/* Legs */}
        <path id="muscle-quads-l" fill={getMuscleColor(muscleData.Legs?.intensity)} d="M125,260v100h-30c-10,0-15-5-15-15V270c0-10,5-10,15-10H125z" />
        <path id="muscle-quads-r" fill={getMuscleColor(muscleData.Legs?.intensity)} d="M175,260v100h30c10,0,15-5,15-15V270c0-10-5-10-15-10H175z" />
        {/* Back and Glutes can be added for a back view */}
    </g>
</svg>
  );
}
