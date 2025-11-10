
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
    arms: { top: '35%', left: '20%' },
    legs: { top: '65%', left: '42%' },
  },
  Female: {
    shoulders: { top: '23%', left: '33%' },
    chest: { top: '30%', left: '50%' },
    back: { top: '30%', left: '50%' }, 
    core: { top: '42%', left: '50%' },
    arms: { top: '35%', left: '20%' },
    legs: { top: '65%', left: '42%' },
  },
};

const HeatPoint = ({ top, left, intensity, isMirrored = false }: { top: string; left: string; intensity: number; isMirrored?: boolean }) => {
  const finalLeft = isMirrored ? `calc(100% - ${left})` : left;
  
  const color = `hsl(0 100% 50% / ${intensity * 0.9})`;
  const shadowColor = `hsl(0 100% 50% / ${intensity * 0.5})`;

  return (
    <div
      className="absolute rounded-full flex items-center justify-center"
      style={{
        top,
        left: finalLeft,
        width: '25%',
        height: '25%',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        transform: `translate(-50%, -50%)`,
        opacity: Math.max(0.2, intensity),
        zIndex: 10,
        filter: `blur(5px) drop-shadow(0 0 10px ${shadowColor})`,
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
  
  const { muscleGroupFrequency, maxFrequency } = useMemo(() => {
     if (isLoadingExercises || !masterExercises || !thisWeeksLogs) {
      return { muscleGroupFrequency: {}, maxFrequency: 0 };
    }

    const exerciseIdToCategory = masterExercises.reduce((acc, ex) => {
        if (ex.category) {
            acc[ex.id] = ex.category;
        }
        return acc;
    }, {} as Record<string, string>);

    const frequencies: Record<string, number> = {};
    let max = 0;

    thisWeeksLogs.forEach(log => {
      log.exercises.forEach(loggedEx => {
        const category = exerciseIdToCategory[loggedEx.exerciseId];
        if(category) {
          const muscleGroup = categoryToMuscleGroup[category];
          if (muscleGroup) {
            frequencies[muscleGroup] = (frequencies[muscleGroup] || 0) + 1;
            if (frequencies[muscleGroup] > max) {
              max = frequencies[muscleGroup];
            }
          }
        }
      })
    });

    return { muscleGroupFrequency: frequencies, maxFrequency: max };
  }, [isLoadingExercises, masterExercises, thisWeeksLogs]);
  
  const bodyType = userProfile?.biologicalSex || 'Male';
  const bodyImageUrl = bodyType === 'Female'
    ? "https://raw.githubusercontent.com/matthewcb4/public_resources/main/Female.png"
    : "https://raw.githubusercontent.com/matthewcb4/public_resources/main/Male.png";
    
  if (isLoading || isLoadingExercises) {
    return <div className="text-center p-8">Loading heatmap...</div>;
  }
  
  if (Object.keys(muscleGroupFrequency).length === 0) {
     return (
        <div className="relative w-full max-w-xs mx-auto aspect-[9/16] flex items-center justify-center">
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
    <div className="relative w-full max-w-xs mx-auto aspect-[9/16]">
      <Image
        src={bodyImageUrl}
        alt={`${bodyType} body outline`}
        fill
        className="object-contain z-0"
      />
      <div className="absolute inset-0 z-10">
        {Object.entries(muscleGroupFrequency).map(([group, freq]) => {
          const coords = heatmapCoordinates[bodyType]?.[group];
          if (!coords) return null;
          
          const intensity = maxFrequency > 0 ? freq / maxFrequency : 0;

          // For arms, shoulders and legs, render a mirrored point
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
    </div>
  );
}
