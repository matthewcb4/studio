
'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import type { UserProfile, WorkoutLog, LoggedExercise } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Exercise } from '@/lib/types';

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
    shoulders: { top: '23%', left: '50%' },
    chest: { top: '32%', left: '50%' },
    back: { top: '35%', left: '50%' },
    core: { top: '45%', left: '50%' },
    arms: { top: '38%', left: '35%' }, // Represents one arm, mirrored for the other
    legs: { top: '70%', left: '42%' }, // Represents one leg, mirrored for the other
  },
  Female: {
    shoulders: { top: '24%', left: '50%' },
    chest: { top: '33%', left: '50%' },
    back: { top: '38%', left: '50%' },
    core: { top: '48%', left: '50%' },
    arms: { top: '40%', left: '33%' },
    legs: { top: '70%', left: '42%' },
  },
};

const HeatPoint = ({ top, left, intensity, isMirrored = false }: { top: string; left: string; intensity: number; isMirrored?: boolean }) => {
  const transform = isMirrored ? 'translateX(-100%)' : 'translateX(-50%)';
  const finalLeft = isMirrored ? `calc(100% - ${left})` : left;
  
  return (
    <div
      className="absolute rounded-full"
      style={{
        top,
        left: finalLeft,
        width: '25%', // size of the heatmap circle
        height: '25%',
        background: `radial-gradient(circle, hsl(var(--primary) / ${intensity * 0.5}) 0%, hsl(var(--primary) / 0) 70%)`,
        transform: `translate(-50%, -50%)`,
        opacity: Math.max(0.2, intensity), // ensure even low intensity is visible
        zIndex: 10,
      }}
    />
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

  const muscleGroupFrequency = useMemo(() => {
    if (!thisWeeksLogs || !masterExercises) return {};

    const exerciseIdToCategory = masterExercises.reduce((acc, ex) => {
      acc[ex.id] = ex.category;
      return acc;
    }, {} as Record<string, string>);

    const frequency: Record<string, number> = {};
    
    thisWeeksLogs.forEach(log => {
      log.exercises.forEach((loggedEx: LoggedExercise) => {
        const category = exerciseIdToCategory[loggedEx.exerciseId];
        if (category) {
          const muscleGroup = categoryToMuscleGroup[category];
          if (muscleGroup) {
            frequency[muscleGroup] = (frequency[muscleGroup] || 0) + 1;
          }
        }
      });
    });

    return frequency;
  }, [thisWeeksLogs, masterExercises]);
  
  const bodyType = userProfile?.biologicalSex || 'Male';
  const bodyImageUrl = bodyType === 'Female'
    ? "https://raw.githubusercontent.com/matthewcb4/public_resources/648004cc67986bfcfe38eeb974f252ec69a2369f/Female.png"
    : "https://raw.githubusercontent.com/matthewcb4/public_resources/1401389b789ae27dd8ce133567ebae3e240c139d/Male.png";
    
  if (isLoading || isLoadingExercises) {
    return <div className="text-center p-8">Loading heatmap...</div>;
  }
  
  const maxFrequency = Math.max(...Object.values(muscleGroupFrequency), 1);

  return (
    <div className="relative w-full max-w-xs mx-auto aspect-[9/16]">
      <Image
        src={bodyImageUrl}
        alt={`${bodyType} body outline`}
        fill
        className="object-contain z-0"
      />
      <div className="absolute inset-0 z-10">
        {Object.entries(muscleGroupFrequency).map(([group, freq]) => {
          const coords = heatmapCoordinates[bodyType][group];
          if (!coords) return null;
          
          const intensity = freq / maxFrequency;

          // For arms and legs, render a mirrored point
          if (group === 'arms' || group === 'legs') {
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
    </div>
  );
}
