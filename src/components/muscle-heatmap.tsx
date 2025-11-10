
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
    chest: { top: '28%', left: '49.5%' },
    back: { top: '32%', left: '49.5%' }, 
    core: { top: '42%', left: '49.5%' },
    arms: { top: '28%', left: '23%' },
    legs: { top: '70%', left: '42%' },
  },
  Female: { // Keeping female coords as they were, can be adjusted if needed
    shoulders: { top: '23%', left: '33%' },
    chest: { top: '28%', left: '49.5%' },
    back: { top: '32%', left: '49.5%' },
    core: { top: '42%', left: '49.5%' },
    arms: { top: '28%', left: '23%' },
    legs: { top: '70%', left: '42%' },
  },
};

const HeatPoint = ({ top, left, intensity, size, isMirrored = false }: { top: string; left: string; intensity: number; size: string; isMirrored?: boolean; }) => {
  const finalLeft = isMirrored ? `calc(100% - ${left})` : left;
  
  // Hue ranges from blue (240) to red (0).
  // As intensity goes from 0 to 1, hue goes from 240 to 0.
  const hue = 240 - (intensity * 240);
  const color = `hsl(${hue} 100% 50% / ${intensity * 1})`;

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
    if (!thisWeeksLogs || !masterExercises) {
      return { muscleGroupFrequency: {}, maxFrequency: 0 };
    }

    const frequencies: Record<string, number> = {};
    thisWeeksLogs.forEach(log => {
      log.exercises.forEach(loggedEx => {
        const masterEx = masterExercises.find(me => me.id === loggedEx.exerciseId);
        if (masterEx?.category) {
          const muscleGroup = categoryToMuscleGroup[masterEx.category];
          if (muscleGroup) {
            frequencies[muscleGroup] = (frequencies[muscleGroup] || 0) + 1;
          }
        }
      });
    });

    const maxFreq = Object.values(frequencies).reduce((max, count) => Math.max(max, count), 0);

    return { muscleGroupFrequency: frequencies, maxFrequency: maxFreq };
  }, [thisWeeksLogs, masterExercises]);
  
  const bodyType = userProfile?.biologicalSex || 'Male';
  const bodyImageUrl = bodyType === 'Female'
    ? "https://raw.githubusercontent.com/matthewcb4/public_resources/main/Female.png"
    : "https://raw.githubusercontent.com/matthewcb4/public_resources/main/Male_black.png";
    
  if (isLoading || isLoadingExercises) {
    return <div className="text-center p-8">Loading heatmap...</div>;
  }
  
  const allPossibleMuscleGroups = ['shoulders', 'chest', 'back', 'core', 'arms', 'legs'];

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Layer 1: White Background */}
      <div className="absolute inset-0 bg-white z-0"></div>

      {/* Layer 2: Heatmap Points */}
      <div className="absolute inset-0 z-10">
        {allPossibleMuscleGroups.map((group) => {
          const coords = heatmapCoordinates[bodyType]?.[group];
          if (!coords) return null;
          
          const freq = muscleGroupFrequency[group] || 0;
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

      {/* Layer 3: Body Image */}
      <Image
        src={bodyImageUrl}
        alt={`${bodyType} body outline`}
        width={400}
        height={711}
        className="relative object-contain z-20 mix-blend-multiply w-full h-auto"
        unoptimized
      />

       {thisWeeksLogs.length === 0 && !isLoading && (
         <div className="absolute inset-0 flex items-center justify-center z-30">
            <p className="text-center text-xs bg-black/50 text-white p-2 rounded-md">Log a workout this week to see your heatmap.</p>
        </div>
      )}
    </div>
  );
}
