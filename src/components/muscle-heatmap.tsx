
'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import type { UserProfile, WorkoutLog, Exercise } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';


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
    shoulders: { top: '23%', left: '37%' },
    chest: { top: '28%', left: '49.5%' },
    abs: { top: '42%', left: '49.5%' },
    biceps: { top: '28%', left: '30%' },
    quads: { top: '58%', left: '43%' },
    // Back
    traps: { top: '24%', left: '50%' },
    lats: { top: '35%', left: '50%' },
    triceps: { top: '28%', left: '65%' },
    glutes: { top: '50%', left: '50%' },
    hamstrings: { top: '65%', left: '50%' },
    calves: { top: '80%', left: '50%' },
    back_lower: { top: '42%', left: '50%'},
  },
  Female: {
    // Front
    shoulders: { top: '23%', left: '39%' },
    chest: { top: '28%', left: '50%' },
    abs: { top: '42%', left: '50%' },
    biceps: { top: '28%', left: '30%' },
    quads: { top: '60%', left: '44%' },
    // Back
    traps: { top: '24%', left: '50%' },
    lats: { top: '35%', left: '50%' },
    triceps: { top: '28%', left: '65%' },
    glutes: { top: '52%', left: '50%' },
    hamstrings: { top: '68%', left: '50%' },
    calves: { top: '82%', left: '50%' },
    back_lower: { top: '42%', left: '50%'},
  },
};

const HeatPoint = ({ intensity, size, coords }: { intensity: number; size: string; coords: { top: string, left: string } }) => {
  // Mirrored for shoulders, arms (biceps/triceps), and legs (quads/calves/hamstrings on front view)
  const isMirrored = ['shoulders', 'biceps', 'triceps', 'quads', 'calves', 'hamstrings'].includes(Object.keys(heatmapCoordinates.Male).find(key => heatmapCoordinates.Male[key] === coords) || '');

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
            filter: `blur(10px)`,
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

    thisWeeksLogs.forEach(log => {
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

            muscleGroups.forEach(group => {
                muscleGroupEffort[group] = (muscleGroupEffort[group] || 0) + totalEffort;
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
    Male: "https://raw.githubusercontent.com/matthewcb4/public_resources/main/Male_black.png",
    Female: "https://raw.githubusercontent.com/matthewcb4/public_resources/e31c3cf4a26809aa1c026e3ed500ee7241a91bde/Female.png"
  };
  const backViewImages = {
    Male: "https://raw.githubusercontent.com/matthewcb4/public_resources/aee947f98314b7824d7d4f92e3b6a9e3b6391acd/Male_Back.png",
    Female: "https://raw.githubusercontent.com/matthewcb4/public_resources/e9bc4742a2b0e68196f4e3573c3a06f022416b24/Female_Back.png"
  };
  
  const bodyImageUrl = view === 'front' ? frontViewImages[bodyType] : backViewImages[bodyType];
    
  if (isLoading || isLoadingExercises) {
    return <div className="text-center p-8">Loading heatmap...</div>;
  }
  
  const frontMuscleGroups = ['shoulders', 'chest', 'abs', 'biceps', 'quads'];
  const backMuscleGroups = ['traps', 'shoulders', 'lats', 'back_lower', 'triceps', 'glutes', 'hamstrings', 'calves'];

  const muscleGroupsToShow = view === 'front' ? frontMuscleGroups : backMuscleGroups;

  return (
    <Card>
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>Muscle Heatmap</CardTitle>
                    <CardDescription>Muscles worked in the {dateRangeLabel.toLowerCase()}.</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant={view === 'front' ? 'default' : 'outline'} onClick={() => setView('front')}>Front</Button>
                    <Button variant={view === 'back' ? 'default' : 'outline'} onClick={() => setView('back')}>Back</Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <div className="relative w-full max-w-xs mx-auto">
              {/* This div is a temporary fix for the image background issue */}
              <div className="absolute inset-0 bg-white z-0"></div>

              <div className="absolute inset-0 z-10">
                {muscleGroupsToShow.map((group) => {
                  const coords = heatmapCoordinates[bodyType]?.[group];
                  if (!coords) return null;
                  
                  const intensity = muscleGroupIntensities[group] || 0;
                  const size = (group === 'glutes' || group === 'quads') ? '25%' : '18%';

                  return <HeatPoint key={`${view}-${group}`} intensity={intensity} size={size} coords={coords} />;
                })}
              </div>
              
              {/* Layer for labels */}
              <div className="absolute inset-0 z-30 pointer-events-none">
                {muscleGroupsToShow.map((group) => {
                  const coords = heatmapCoordinates[bodyType]?.[group];
                  if (!coords) return null;
                  const isMirrored = ['shoulders', 'biceps', 'triceps', 'quads', 'calves', 'hamstrings'].includes(group);

                  return (
                    <React.Fragment key={`label-${group}`}>
                      <div
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white text-[10px] px-1 py-0.5 rounded"
                        style={{ top: coords.top, left: coords.left }}
                      >
                        {group}
                      </div>
                      {isMirrored && (
                         <div
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white text-[10px] px-1 py-0.5 rounded"
                            style={{ top: coords.top, left: `calc(100% - ${coords.left})` }}
                        >
                            {group}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              <Image
                src={bodyImageUrl}
                alt={`${bodyType} body ${view} view`}
                width={400}
                height={711}
                className="relative object-contain z-20 mix-blend-multiply w-full h-auto"
                unoptimized
              />
            </div>
        </CardContent>
    </Card>
  );
}
