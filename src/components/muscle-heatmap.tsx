
'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import type { UserProfile, WorkoutLog, Exercise } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';


// Mapping from exercise category to a simpler muscle group
const categoryToMuscleGroup: Record<string, string> = {
  'Chest': 'chest',
  'Back': 'back',
  'Shoulders': 'shoulders',
  'Legs': 'legs',
  'Arms': 'arms',
  'Biceps': 'arms',
  'Triceps': 'arms',
  'Core': 'core',
};

// Simplified coordinate system for heatmap points on the body outline
// Values are percentages for top and left positioning.
const heatmapCoordinates: Record<'Male' | 'Female', Record<string, { top: string; left: string }>> = {
  Male: {
    shoulders: { top: '23%', left: '35%' },
    chest: { top: '28%', left: '48%' },
    back: { top: '32%', left: '48%' }, 
    core: { top: '42%', left: '48%' },
    arms: { top: '28%', left: '28%' },
    legs: { top: '70%', left: '42%' },
  },
  Female: { // Keeping female coords as they were, can be adjusted if needed
    shoulders: { top: '23%', left: '35%' },
    chest: { top: '28%', left: '48%' },
    back: { top: '32%', left: '48%' }, 
    core: { top: '42%', left: '48%' },
    arms: { top: '28%', left: '28%' },
    legs: { top: '70%', left: '42%' },
  },
};

const HeatPoint = ({ top, left, intensity, size, isMirrored = false }: { top: string; left: string; intensity: number; size: string; isMirrored?: boolean; }) => {
  const finalLeft = isMirrored ? `calc(100% - ${left})` : left;
  
  const color = `hsl(0 100% 50% / ${intensity * 1})`;

  return (
    <div
      className="absolute rounded-full"
      style={{
        top,
        left: finalLeft,
        width: size, 
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        transform: `translate(-50%, -50%)`,
        opacity: Math.max(0.2, intensity),
        filter: `blur(12px)`,
        zIndex: 10,
      }}
    >
    </div>
  );
};

const HeatmapLabels = ({ muscleGroups }: { muscleGroups: { group: string, coords: { top: string, left: string } }[] }) => (
    <div className="absolute inset-0 z-10">
      {muscleGroups.map(({ group, coords }) => {
        const mirroredGroups = ['arms', 'shoulders', 'legs'];
        const isMirrored = mirroredGroups.includes(group);

        const Label = ({ mirrored }: { mirrored?: boolean }) => (
             <div
                className="absolute -translate-x-1/2 -translate-y-1/2 text-white text-xs font-bold pointer-events-none"
                style={{
                  top: coords.top,
                  left: mirrored ? `calc(100% - ${coords.left})` : coords.left,
                }}
              >
                {group.charAt(0).toUpperCase() + group.slice(1)}
              </div>
        );

        return (
          <React.Fragment key={group}>
            <Label />
            {isMirrored && <Label mirrored />}
          </React.Fragment>
        );
      })}
    </div>
);


interface MuscleHeatmapProps {
  userProfile?: UserProfile | null;
  thisWeeksLogs: WorkoutLog[];
  isLoading: boolean;
}

export function MuscleHeatmap({ userProfile, thisWeeksLogs, isLoading }: MuscleHeatmapProps) {
  const firestore = useFirestore();

  const exercisesQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'exercises')) : null,
    [firestore]
  );
  const { data: masterExercises, isLoading: isLoadingExercises } = useCollection<Exercise>(exercisesQuery);
  
  const { muscleGroupFrequency, maxFrequency } = useMemo(() => {
     const testFrequencies: Record<string, number> = {
      'shoulders': 1,
      'chest': 1,
      'back': 1,
      'core': 1,
      'arms': 1,
      'legs': 1,
    };
    return { muscleGroupFrequency: testFrequencies, maxFrequency: 1 };
  }, [isLoadingExercises, masterExercises, thisWeeksLogs]);
  
  const bodyType = userProfile?.biologicalSex || 'Male';
  const bodyImageUrl = bodyType === 'Female'
    ? "https://raw.githubusercontent.com/matthewcb4/public_resources/main/Female.png"
    : "https://raw.githubusercontent.com/matthewcb4/public_resources/main/Male_black.png";
    
  if (isLoading || isLoadingExercises) {
    return <div className="text-center p-8">Loading heatmap...</div>;
  }
  
  const muscleGroupsForLabels = Object.keys(muscleGroupFrequency).map(group => ({
    group,
    coords: heatmapCoordinates[bodyType]?.[group],
  })).filter(item => item.coords);
  
  if (Object.keys(muscleGroupFrequency).length === 0) {
     return (
        <div className="relative w-full max-w-sm mx-auto">
            <Image
                src={bodyImageUrl}
                alt={`${bodyType} body outline`}
                width={400}
                height={711}
                className="relative z-0 w-full h-auto"
                unoptimized
            />
            <p className="absolute inset-0 flex items-center justify-center z-10 text-xs text-muted-foreground text-center p-4 bg-background/50 rounded-md">Log a workout to see your heatmap.</p>
        </div>
     )
  }

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Layer 1: White Background */}
      <div className="absolute inset-0 bg-white z-0"></div>

      {/* Layer 2: Heatmap Points */}
      <div className="absolute inset-0 z-10">
        {Object.entries(muscleGroupFrequency).map(([group, freq]) => {
          const coords = heatmapCoordinates[bodyType]?.[group];
          if (!coords) return null;
          
          const intensity = maxFrequency > 0 ? freq / maxFrequency : 0;
          const isLegs = group === 'legs';
          const size = isLegs ? '35%' : '25%';

          if (['arms', 'shoulders', 'legs'].includes(group)) {
            return (
              <React.Fragment key={group}>
                <HeatPoint top={coords.top} left={coords.left} intensity={intensity} size={size} />
                <HeatPoint top={coords.top} left={coords.left} intensity={intensity} size={size} isMirrored />
              </React.Fragment>
            );
          }

          return <HeatPoint key={group} top={coords.top} left={coords.left} intensity={intensity} size={size} />;
        })}
      </div>
      
      {/* Layer 3: Labels */}
      <HeatmapLabels muscleGroups={muscleGroupsForLabels} />


      {/* Layer 4: Body Image */}
      <Image
        src={bodyImageUrl}
        alt={`${bodyType} body outline`}
        width={400}
        height={711}
        className="relative object-contain z-20 mix-blend-multiply w-full h-auto"
        unoptimized
      />
    </div>
  );
}
