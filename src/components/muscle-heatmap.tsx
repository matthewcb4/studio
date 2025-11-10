
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
    chest: { top: '23%', left: '50%' },
    back: { top: '30%', left: '50%' }, 
    core: { top: '42%', left: '50%' },
    arms: { top: '23%', left: '18%' },
    legs: { top: '60%', left: '42%' },
  },
  Female: {
    shoulders: { top: '23%', left: '33%' },
    chest: { top: '30%', left: '50%' },
    back: { top: '30%', left: '50%' }, 
    core: { top: '42%', left: '50%' },
    arms: { top: '35%', left: '20%' },
    legs: { top: '60%', left: '42%' },
  },
};

const HeatPoint = ({ top, left, intensity, isMirrored = false, label }: { top: string; left: string; intensity: number; isMirrored?: boolean; label: string }) => {
  const finalLeft = isMirrored ? `calc(100% - ${left})` : left;
  
  const color = `hsl(0 100% 50% / ${intensity * 0.9})`;
  const shadowColor = `hsl(0 100% 50% / ${intensity * 0.5})`;

  return (
    <div
      className="absolute rounded-full flex items-center justify-center"
      style={{
        top,
        left: finalLeft,
        width: '15%',
        height: '15%',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        transform: `translate(-50%, -50%)`,
        opacity: Math.max(0.2, intensity),
        filter: `blur(5px)`,
        zIndex: 10,
      }}
    >
        <span className="text-white text-xs font-bold" style={{ textShadow: '0 0 3px black' }}>{label}</span>
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
    : "https://raw.githubusercontent.com/matthewcb4/public_resources/829df0894db95489d34b409e6b79e707c126755b/Male_black.png";
    
  if (isLoading || isLoadingExercises) {
    return <div className="text-center p-8">Loading heatmap...</div>;
  }
  
  if (Object.keys(muscleGroupFrequency).length === 0) {
     return (
        <div className="relative w-full max-w-sm mx-auto aspect-[9/16] flex items-center justify-center">
            <Image
                src={bodyImageUrl}
                alt={`${bodyType} body outline`}
                fill
                className="object-contain z-0"
            />
            <p className="z-10 text-xs text-muted-foreground text-center p-4 bg-background/50 rounded-md">Log a workout to see your heatmap.</p>
        </div>
     )
  }

  return (
    <div className="relative w-full max-w-sm mx-auto aspect-[9/16]">
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
                <HeatPoint top={coords.top} left={coords.left} intensity={intensity} label={group} />
                <HeatPoint top={coords.top} left={coords.left} intensity={intensity} isMirrored label={group} />
              </React.Fragment>
            );
          }

          return <HeatPoint key={group} top={coords.top} left={coords.left} intensity={intensity} label={group} />;
        })}
      </div>

      {/* Layer 3: Body Image */}
      <Image
        src={bodyImageUrl}
        alt={`${bodyType} body outline`}
        fill
        className="object-contain z-20 mix-blend-multiply"
      />
    </div>
  );
}
