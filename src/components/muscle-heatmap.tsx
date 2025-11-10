
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
    shoulders: { top: '23%', left: '37%' },
    chest: { top: '28%', left: '49.5%' },
    back: { top: '35%', left: '49.5%' },
    core: { top: '42%', left: '49.5%' },
    arms: { top: '26%', left: '26%' },
    legs: { top: '70%', left: '41%' },
  },
  Female: {
    shoulders: { top: '23%', left: '39%' },
    chest: { top: '28%', left: '50%' },
    back: { top: '35%', left: '50%' },
    core: { top: '42%', left: '50%' },
    arms: { top: '26%', left: '28%' },
    legs: { top: '70%', left: '42%' },
  },
};

const HeatPoint = ({ intensity, size, coords }: { intensity: number; size: string; coords: { top: string, left: string } }) => {
  const isMirrored = ['arms', 'shoulders', 'legs'].includes(Object.keys(heatmapCoordinates.Male).find(key => heatmapCoordinates.Male[key] === coords) || '');

  // Gradient: Blue (0%, hue 240) -> Green (50%, hue 100) -> Red (100%, hue 0)
  const hue = intensity <= 0.5
    ? 240 - (intensity * 2 * 140) // Transition from Blue (240) to deeper Green (100)
    : 100 - ((intensity - 0.5) * 2 * 100); // Transition from Green (100) to Red (0)
  const color = `hsl(${hue}, 100%, 40%)`;

  const renderPoints = () => {
    const points = [
      <div
        key="main"
        className="absolute rounded-full"
        style={{
          top: coords.top,
          left: coords.left,
          width: size,
          height: size,
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          transform: 'translate(-50%, -50%)',
          opacity: Math.max(0.8, intensity * 0.9),
          filter: `blur(14px)`,
          zIndex: 10,
        }}
      />
    ];
    if (isMirrored) {
      points.push(
        <div
          key="mirrored"
          className="absolute rounded-full"
          style={{
            top: coords.top,
            left: `calc(100% - ${coords.left})`,
            width: size,
            height: size,
            background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
            transform: 'translate(-50%, -50%)',
            opacity: Math.max(0.8, intensity * 0.9),
            filter: `blur(14px)`,
            zIndex: 10,
          }}
        />
      );
    }
    return points;
  };

  return <>{renderPoints()}</>;
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
  
  const muscleGroupIntensities = useMemo(() => {
    const muscleGroupReps: Record<string, number> = {
      chest: 0, back: 0, shoulders: 0, legs: 0, arms: 0, core: 0,
    };

    if (!thisWeeksLogs || !masterExercises) return muscleGroupReps;

    thisWeeksLogs.forEach(log => {
      log.exercises.forEach(loggedEx => {
        const masterEx = masterExercises.find(me => me.id === loggedEx.exerciseId);
        if (masterEx?.category) {
          const muscleGroup = categoryToMuscleGroup[masterEx.category];
          if (muscleGroup) {
            const totalReps = loggedEx.sets.reduce((sum, set) => sum + set.reps, 0);
            muscleGroupReps[muscleGroup] = (muscleGroupReps[muscleGroup] || 0) + totalReps;
          }
        }
      });
    });
    
    // Define baseline and goal-adjusted rep targets
    const baselineWeeklyReps = 150;
    let weeklyRepTarget = baselineWeeklyReps;

    if (userProfile?.fatLossGoal === 'reduce_body_fat' || userProfile?.strengthGoal === 'improve_endurance') {
      weeklyRepTarget *= 1.5; // Increase target for endurance/fat loss
    } else if (userProfile?.muscleGoal === 'gain_overall_mass' || userProfile?.strengthGoal === 'increase_max_lift') {
      weeklyRepTarget *= 0.75; // Decrease target for mass/strength
    }

    const intensities: Record<string, number> = {};
    for (const group in muscleGroupReps) {
        intensities[group] = weeklyRepTarget > 0 
            ? Math.min(muscleGroupReps[group] / weeklyRepTarget, 1) // Cap at 100%
            : 0;
    }
    
    return intensities;
  }, [thisWeeksLogs, masterExercises, userProfile]);

  const bodyType = userProfile?.biologicalSex || 'Male';
  const bodyImageUrl = bodyType === 'Female'
    ? "https://raw.githubusercontent.com/matthewcb4/public_resources/e31c3cf4a26809aa1c026e3ed500ee7241a91bde/Female.png"
    : "https://raw.githubusercontent.com/matthewcb4/public_resources/main/Male_black.png";
    
  if (isLoading || isLoadingExercises) {
    return <div className="text-center p-8">Loading heatmap...</div>;
  }
  
  const allPossibleMuscleGroups = ['shoulders', 'chest', 'back', 'core', 'arms', 'legs'];

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div className="absolute inset-0 bg-white z-0"></div>

      <div className="absolute inset-0 z-10">
        {allPossibleMuscleGroups.map((group) => {
          const coords = heatmapCoordinates[bodyType]?.[group];
          if (!coords) return null;
          
          const intensity = muscleGroupIntensities[group as keyof typeof muscleGroupIntensities] || 0;
          const isLegs = group === 'legs';
          const size = isLegs ? '55%' : '35%';

          return <HeatPoint key={group} intensity={intensity} size={size} coords={coords} />;
        })}
      </div>
      
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
