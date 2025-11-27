
'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import type { UserProfile, WorkoutLog, Exercise } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { differenceInDays } from 'date-fns';

// Mapping from exercise category to a simpler muscle group
const categoryToMuscleGroup: Record<string, string[]> = {
  'Chest': ['chest', 'shoulders', 'triceps'],
  'Back': ['lats', 'traps', 'biceps', 'back_lower'],
  'Shoulders': ['shoulders', 'triceps'],
  'Legs': ['quads', 'glutes', 'hamstrings', 'calves'],
  'Arms': ['biceps', 'triceps', 'shoulders'],
  'Biceps': ['biceps'],
  'Triceps': ['triceps'],
  'Core': ['abs'],
  'Full Body': ['chest', 'lats', 'traps', 'shoulders', 'quads', 'glutes', 'hamstrings', 'biceps', 'triceps', 'abs'],
  'Upper Body': ['chest', 'lats', 'traps', 'shoulders', 'biceps', 'triceps'],
  'Lower Body': ['quads', 'glutes', 'hamstrings', 'calves', 'abs'],
};

// Simplified coordinate system for heatmap points on the body outline
// Values are percentages for top and left positioning.
const heatmapCoordinates: Record<'Male' | 'Female', Record<string, { top: string; left: string }>> = {
  Male: {
    // Front
    shoulders: { top: '25.5%', left: '40%' },
    chest: { top: '28%', left: '49.5%' },
    abs: { top: '42%', left: '49.5%' },
    biceps: { top: '25%', left: '33%' },
    quads: { top: '58%', left: '44%' },
    // Back
    traps: { top: '24%', left: '50%' },
    lats: { top: '35%', left: '45%' },
    triceps: { top: '28%', left: '30%' },
    glutes: { top: '50%', left: '50%' },
    hamstrings: { top: '60%', left: '49%' },
    calves: { top: '76%', left: '48%' },
    back_lower: { top: '42%', left: '50%'},
  },
  Female: {
    // Front - Refined coordinates
    shoulders: { top: '25.5%', left: '41%' },
    chest: { top: '29%', left: '50%' },
    abs: { top: '41%', left: '50%' },
    biceps: { top: '27%', left: '31%' },
    quads: { top: '60%', left: '46%' },
    // Back
    traps: { top: '25%', left: '50%' },
    lats: { top: '34%', left: '50%' },
    triceps: { top: '30%', left: '66%' },
    glutes: { top: '51%', left: '50%' },
    hamstrings: { top: '68%', left: '50%' },
    calves: { top: '78%', left: '45%' },
    back_lower: { top: '42%', left: '50%'},
  },
};

const HeatPoint = ({ intensity, size, coords, zIndex = 10, bodyType }: { intensity: number; size: string; coords: { top: string, left: string }, zIndex?: number, bodyType: 'Male' | 'Female' }) => {
  // Mirrored for shoulders, arms (biceps/triceps), and legs (quads/calves/hamstrings on front view)
  const isMirrored = ['shoulders', 'biceps', 'triceps', 'quads', 'calves', 'hamstrings'].includes(Object.keys(heatmapCoordinates[bodyType]).find(key => heatmapCoordinates[bodyType][key] === coords) || '');

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
          filter: `blur(10px)`,
          zIndex: zIndex,
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
            filter: `blur(10px)`,
            zIndex: zIndex,
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
  dateRangeLabel: string;
}

export function MuscleHeatmap({ userProfile, thisWeeksLogs, isLoading, dateRangeLabel }: MuscleHeatmapProps) {
  const firestore = useFirestore();
  const [view, setView] = useState<'front' | 'back'>('front');

  const exercisesQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'exercises')) : null,
    [firestore]
  );
  const { data: masterExercises, isLoading: isLoadingExercises } = useCollection<Exercise>(exercisesQuery);
  
  const muscleGroupIntensities = useMemo(() => {
    const muscleGroupEffort: Record<string, number> = {
      chest: 0, back: 0, shoulders: 0, legs: 0, arms: 0, core: 0,
      quads: 0, hamstrings: 0, glutes: 0, calves: 0,
      lats: 0, traps: 0, back_lower: 0,
      biceps: 0, triceps: 0, abs: 0
    };

    if (!thisWeeksLogs || !masterExercises) return muscleGroupEffort;
    
    const now = new Date();

    thisWeeksLogs.forEach(log => {
      const logDate = new Date(log.date);
      const daysSince = differenceInDays(now, logDate);
      // Decay factor: fresher workouts have higher impact. 1 for today, 0.5 for yesterday, etc.
      const decayFactor = 1 / (daysSince + 1);

      log.exercises.forEach(loggedEx => {
        const masterEx = masterExercises.find(me => me.id === loggedEx.exerciseId);
        if (masterEx?.category) {
          const muscleGroups = categoryToMuscleGroup[masterEx.category];
          if (muscleGroups) {
            // Equivalent reps calculation
            const totalEffort = loggedEx.sets.reduce((sum, set) => {
              if (set.duration) {
                // Count every 10 seconds as one "rep" of effort
                return sum + Math.floor(set.duration / 10);
              }
              return sum + (set.reps || 0);
            }, 0);
            
            const decayedEffort = totalEffort * decayFactor;

            muscleGroups.forEach(group => {
                muscleGroupEffort[group] = (muscleGroupEffort[group] || 0) + decayedEffort;
            });
          }
        }
      });
    });
    
    const baselineWeeklyReps = 150;
    let weeklyRepTarget = baselineWeeklyReps;

    if (userProfile?.fatLossGoal === 'reduce_body_fat' || userProfile?.strengthGoal === 'improve_endurance') {
      weeklyRepTarget *= 1.5;
    } else if (userProfile?.muscleGoal === 'gain_overall_mass' || userProfile?.strengthGoal === 'increase_max_lift') {
      weeklyRepTarget *= 0.75;
    }

    const intensities: Record<string, number> = {};
    for (const group in muscleGroupEffort) {
        intensities[group] = weeklyRepTarget > 0 
            ? Math.min(muscleGroupEffort[group] / weeklyRepTarget, 1)
            : 0;
    }
    
    return intensities;
  }, [thisWeeksLogs, masterExercises, userProfile]);

  const bodyType = userProfile?.biologicalSex || 'Male';
  const frontViewImages = {
    Male: "/Male_Front.png",
    Female: "/Female_Front.png"
  };
  const backViewImages = {
    Male: "/Male_Back.png",
    Female: "/Female_Back.png"
  };
  
  const bodyImageUrl = view === 'front' ? frontViewImages[bodyType] : backViewImages[bodyType];
    
  if (isLoading || isLoadingExercises) {
    return <div className="text-center p-8">Loading heatmap...</div>;
  }
  
  const frontMuscleGroups = ['shoulders', 'chest', 'abs', 'biceps', 'quads', 'calves'];
  const backMuscleGroups = ['traps', 'shoulders', 'lats', 'back_lower', 'triceps', 'glutes', 'hamstrings', 'calves'];

  const muscleGroupsToShow = view === 'front' ? frontMuscleGroups : backMuscleGroups;
  
  return (
    <Card>
        <CardHeader>
            <CardTitle>Muscle Heatmap</CardTitle>
            <CardDescription>Muscles worked in the {dateRangeLabel.toLowerCase()}.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                  <Button variant={view === 'front' ? 'default' : 'outline'} size="sm" onClick={() => setView('front')}>Front</Button>
                  <Button variant={view === 'back' ? 'default' : 'outline'} size="sm" onClick={() => setView('back')}>Back</Button>
              </div>
            </div>

            <div className="relative w-full max-w-xs mx-auto">
              {/* This image is invisible but sets the container's aspect ratio */}
              <Image
                src={bodyImageUrl}
                alt=""
                width={400}
                height={711}
                className="relative object-contain w-full h-auto invisible"
                unoptimized
                aria-hidden="true"
              />

              {/* Layer 1: White Background */}
              <div className="absolute inset-0 bg-white z-0"></div>

               {/* Layer 2: Heatmap Glows */}
              <div className="absolute inset-0 z-10">
                {muscleGroupsToShow.map((group) => {
                  const coords = heatmapCoordinates[bodyType]?.[group];
                  if (!coords) return null;
                  
                  const intensity = muscleGroupIntensities[group] || 0;
                  if (intensity === 0) return null;
                  
                  let size = '18%';
                  if (group === 'glutes' || group === 'quads') {
                      size = '25%';
                  } else if (group === 'lats' || group === 'abs') {
                      size = '45%';
                  } else if (group === 'shoulders') {
                      size = '10%'; 
                  }
                  
                  const zIndex = group === 'chest' ? 11 : 10;

                  return <HeatPoint key={`${view}-${group}`} intensity={intensity} size={size} coords={coords} zIndex={zIndex} bodyType={bodyType} />;
                })}
              </div>
              {/* Layer 3: Main body outline PNG */}
              <Image
                src={bodyImageUrl}
                alt={`${bodyType} body ${view} view`}
                width={400}
                height={711}
                className="absolute inset-0 object-contain z-20 w-full h-auto"
                unoptimized
              />
            </div>
        </CardContent>
    </Card>
  );
}
