
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
  Female: {
    shoulders: { top: '23%', left: '33%' },
    chest: { top: '28%', left: '49.5%' },
    back: { top: '32%', left: '49.5%' },
    core: { top: '42%', left: '49.5%' },
    arms: { top: '28%', left: '23%' },
    legs: { top: '70%', left: '42%' },
  },
};

const HeatPoint = ({ intensity, size, coords }: { intensity: number; size: string; coords: { top: string, left: string } }) => {
  const isMirrored = ['arms', 'shoulders', 'legs'].includes(Object.keys(heatmapCoordinates.Male).find(key => heatmapCoordinates.Male[key] === coords) || '');

  // Gradient: Blue (0%, hue 240) -> Green (50%, hue 120) -> Red (100%, hue 0)
  const hue = 240 - (intensity * 240);
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
          opacity: Math.max(0.3, intensity * 0.9),
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
            opacity: Math.max(0.3, intensity * 0.9),
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
    const BASE_REP_GOAL = 150;
    let repGoalMultiplier = 1.0;

    if (userProfile?.fatLossGoal) repGoalMultiplier = 1.25;
    if (userProfile?.strengthGoal === 'increase_max_lift' || userProfile?.muscleGoal === 'gain_overall_mass') {
        repGoalMultiplier = 0.8;
    }

    const weeklyRepGoal = BASE_REP_GOAL * repGoalMultiplier;
    
    const repCounts: Record<string, number> = {};
    
    if (thisWeeksLogs && masterExercises) {
        thisWeeksLogs.forEach(log => {
            log.exercises.forEach(loggedEx => {
                const masterEx = masterExercises.find(me => me.id === loggedEx.exerciseId);
                if (masterEx?.category) {
                    const muscleGroup = categoryToMuscleGroup[masterEx.category];
                    if (muscleGroup) {
                        const totalReps = loggedEx.sets.reduce((sum, set) => sum + set.reps, 0);
                        repCounts[muscleGroup] = (repCounts[muscleGroup] || 0) + totalReps;
                    }
                }
            });
        });
    }

    const intensities: Record<string, number> = {};
    Object.keys(heatmapCoordinates.Male).forEach(group => {
        const reps = repCounts[group] || 0;
        intensities[group] = Math.min(1, reps / weeklyRepGoal);
    });

    return intensities;

  }, [thisWeeksLogs, masterExercises, userProfile]);

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
      <div className="absolute inset-0 bg-white z-0"></div>

      <div className="absolute inset-0 z-10">
        {allPossibleMuscleGroups.map((group) => {
          const coords = heatmapCoordinates[bodyType]?.[group];
          if (!coords) return null;
          
          const intensity = muscleGroupIntensities[group] || 0;
          const isLegs = group === 'legs';
          const size = isLegs ? '35%' : '25%';

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
