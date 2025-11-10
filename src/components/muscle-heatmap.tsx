
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
    shoulders: { top: '23%', left: '33%' },
    chest: { top: '30%', left: '50%' },
    back: { top: '30%', left: '50%' }, 
    core: { top: '42%', left: '50%' },
    arms: { top: '35%', left: '18%' },
    legs: { top: '65%', left: '44%' },
  },
  Female: { // Keeping female coords as they were, can adjust later if needed
    shoulders: { top: '23%', left: '33%' },
    chest: { top: '30%', left: '50%' },
    back: { top: '30%', left: '50%' }, 
    core: { top: '42%', left: '50%' },
    arms: { top: '35%', left: '20%' },
    legs: { top: '60%', left: '42%' },
  },
};

const HeatPoint = ({ top, left, intensity, isMirrored = false }: { top: string; left: string; intensity: number; isMirrored?: boolean; }) => {
  const finalLeft = isMirrored ? `calc(100% - ${left})` : left;
  
  const color = `hsl(0 100% 50% / ${intensity * 1})`; // Darker red
  const shadowColor = `hsl(0 100% 50% / ${intensity * 0.7})`;

  return (
    <div
      className="absolute rounded-full"
      style={{
        top,
        left: finalLeft,
        width: '20%', // Enlarged space
        height: '20%', // Enlarged space
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        transform: `translate(-50%, -50%)`,
        opacity: Math.max(0.2, intensity),
        filter: `blur(8px)`, // Slightly more blur for a softer edge on the larger size
        zIndex: 10,
      }}
    >
    </div>
  );
};


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

          if (['arms', 'shoulders', 'legs'].includes(group)) {
            return (
              <React.Fragment key={group}>
                <HeatPoint top={coords.top} left={coords.left} intensity={intensity} />
                <HeatPoint top={coords.top} left={coords.left} intensity={intensity} isMirrored />
              </React.Fragment>
            );
          }

          return <HeatPoint key={group} top={coords.top} left={coords.left} intensity={intensity} />;
        })}
      </div>

      {/* Layer 3: Body Image */}
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
