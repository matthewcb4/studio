
'use client';

import React, { useMemo, useEffect } from 'react';
import Image from 'next/image';
import type { UserProfile, WorkoutLog, Exercise } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { differenceInDays } from 'date-fns';

// Mapping from exercise category to a simpler muscle group
const categoryToMuscleGroup: Record<string, string[]> = {
  'Chest': ['chest', 'shoulders_front', 'triceps'],
  'Back': ['lats', 'traps', 'biceps', 'back_lower'],
  'Shoulders': ['shoulders_front', 'shoulders_back', 'triceps'],
  'Legs': ['quads', 'glutes', 'hamstrings', 'calves'],
  'Arms': ['biceps', 'triceps'],
  'Biceps': ['biceps'],
  'Triceps': ['triceps'],
  'Core': ['abs'],
  'Full Body': ['chest', 'lats', 'traps', 'shoulders_front', 'shoulders_back', 'quads', 'glutes', 'hamstrings', 'biceps', 'triceps', 'abs'],
  'Upper Body': ['chest', 'lats', 'traps', 'shoulders_front', 'shoulders_back', 'biceps', 'triceps'],
  'Lower Body': ['quads', 'glutes', 'hamstrings', 'calves', 'abs'],
};

// Simplified coordinate system for heatmap points on the body outline
// Values are percentages for top and left positioning.
export const heatmapCoordinates: Record<'Male' | 'Female', Record<string, { top: string; left: string }>> = {
  Male: {
    // Front
    shoulders_front: { top: '25.5%', left: '40%' },
    chest: { top: '28%', left: '48%' },
    abs: { top: '42%', left: '50%' },
    biceps: { top: '25%', left: '33%' },
    quads: { top: '58%', left: '43%' },
    // Back
    traps: { top: '24%', left: '48%' },
    shoulders_back: { top: '25.5%', left: '40%' },
    lats: { top: '35%', left: '45%' },
    triceps: { top: '26%', left: '33%' },
    glutes: { top: '50%', left: '50%' },
    hamstrings: { top: '60%', left: '45%' },
    calves: { top: '76%', left: '45%' },
    back_lower: { top: '42%', left: '50%'},
  },
  Female: {
    // Front - Refined coordinates
    shoulders_front: { top: '25.5%', left: '41%' },
    chest: { top: '29%', left: '50%' },
    abs: { top: '41%', left: '50%' },
    biceps: { top: '27%', left: '31%' },
    quads: { top: '60%', left: '46%' },
    // Back
    traps: { top: '25%', left: '50%' },
    shoulders_back: { top: '25.5%', left: '40%' },
    lats: { top: '34%', left: '50%' },
    triceps: { top: '30%', left: '35%' },
    glutes: { top: '51%', left: '50%' },
    hamstrings: { top: '68%', left: '50%' },
    calves: { top: '78%', left: '45%' },
    back_lower: { top: '42%', left: '50%'},
  },
};

export const HeatPoint = ({ intensity, size, coords, bodyType, view }: { intensity: number; size: string; coords: { top: string, left: string }, bodyType: 'Male' | 'Female', view: 'front' | 'back' }) => {
  const muscle = Object.keys(heatmapCoordinates[bodyType]).find(key => heatmapCoordinates[bodyType][key] === coords);
  
  const frontMirrored = ['shoulders_front', 'biceps', 'quads', 'chest'];
  const backMirrored = ['traps', 'shoulders_back', 'lats', 'triceps', 'glutes', 'hamstrings', 'calves'];

  let isMirrored = false;
  if (view === 'front' && muscle && frontMirrored.includes(muscle)) {
      isMirrored = true;
  } else if (view === 'back' && muscle && backMirrored.includes(muscle)) {
      isMirrored = true;
  }
  
  // Gradient: Blue (0%, hue 240) -> Green (50%, hue 100) -> Red (100%, hue 0)
  const hue = intensity <= 0.5
    ? 240 - (intensity * 2 * 140) // Transition from Blue (240) to deeper Green (100)
    : 100 - ((intensity - 0.5) * 2 * 100); // Transition from Green (100) to Red (0)
  const color = `hsl(${hue}, 100%, 50%)`;

  const renderPoints = () => {
    const mainPoint = (
        <div
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
            }}
        />
    );

    const mirroredPoint = isMirrored ? (
        <div
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
            }}
        />
    ) : null;

    if (view === 'front') {
        // Double the layer for the front view to increase vibrancy
        return (
            <>
                {mainPoint}
                {mirroredPoint}
                <div
                    className="absolute rounded-full"
                    style={{
                        top: coords.top,
                        left: coords.left,
                        width: `calc(${size} * 1.2)`, // Larger ambient glow
                        height: `calc(${size} * 1.2)`,
                        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
                        transform: 'translate(-50%, -50%)',
                        opacity: Math.max(0.6, intensity * 0.7),
                        filter: `blur(15px)`,
                    }}
                />
                 {isMirrored && (
                    <div
                        className="absolute rounded-full"
                        style={{
                            top: coords.top,
                            left: `calc(100% - ${coords.left})`,
                            width: `calc(${size} * 1.2)`,
                            height: `calc(${size} * 1.2)`,
                            background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
                            transform: 'translate(-50%, -50%)',
                            opacity: Math.max(0.6, intensity * 0.7),
                            filter: `blur(15px)`,
                        }}
                    />
                )}
            </>
        );
    }
    
    return <>{mainPoint}{mirroredPoint}</>;
  };

  return <>{renderPoints()}</>;
};

export type MuscleGroupIntensities = Record<string, number>;

interface MuscleHeatmapProps {
  userProfile?: UserProfile | null;
  thisWeeksLogs: WorkoutLog[];
  isLoading: boolean;
  dateRangeLabel: string;
  isCard?: boolean;
  isSingleWorkout?: boolean;
  onIntensitiesChange?: (intensities: MuscleGroupIntensities) => void;
  onViewClick?: (view: 'front' | 'back') => void;
}

export function MuscleHeatmap({ 
  userProfile, 
  thisWeeksLogs, 
  isLoading, 
  dateRangeLabel, 
  isCard = true, 
  isSingleWorkout = false,
  onIntensitiesChange,
  onViewClick,
}: MuscleHeatmapProps) {
  const firestore = useFirestore();

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
      biceps: 0, triceps: 0, abs: 0, shoulders_front: 0, shoulders_back: 0,
    };

    if (!thisWeeksLogs || !masterExercises) return muscleGroupEffort;
    
    const now = new Date();

    thisWeeksLogs.forEach(log => {
      const logDate = new Date(log.date);
      const daysSince = differenceInDays(now, logDate);
      // Decay factor: fresher workouts have higher impact. 1 for today, 0.5 for yesterday, etc.
      const decayFactor = isSingleWorkout ? 1 : 1 / (daysSince + 1);

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
    
    let target = 0;
    if (isSingleWorkout) {
        // For a single workout, the target is the max effort of any single muscle group in that workout.
        target = Math.max(...Object.values(muscleGroupEffort));
    } else {
        // For multiple workouts (dashboard), use the weekly rep target.
        const baselineWeeklyReps = 150;
        target = baselineWeeklyReps;
        if (userProfile?.fatLossGoal === 'reduce_body_fat' || userProfile?.strengthGoal === 'improve_endurance') {
            target *= 1.5;
        } else if (userProfile?.muscleGoal === 'gain_overall_mass' || userProfile?.strengthGoal === 'increase_max_lift') {
            target *= 0.75;
        }
    }


    const intensities: MuscleGroupIntensities = {};
    for (const group in muscleGroupEffort) {
        intensities[group] = target > 0 
            ? Math.min(muscleGroupEffort[group] / target, 1)
            : 0;
    }
    
    return intensities;
  }, [thisWeeksLogs, masterExercises, userProfile, isSingleWorkout]);

  useEffect(() => {
    if (onIntensitiesChange) {
      onIntensitiesChange(muscleGroupIntensities);
    }
  }, [muscleGroupIntensities, onIntensitiesChange]);

  const bodyType = userProfile?.biologicalSex || 'Male';
  const frontViewImages = {
    Male: "/Male_Front.png",
    Female: "/Female_Front.png"
  };
  const backViewImages = {
    Male: "/Male_Back.png",
    Female: "/Female_Back.png"
  };
    
  if (isLoading || isLoadingExercises) {
    return <div className="text-center p-8">Loading heatmap...</div>;
  }
  
  const frontMuscleGroups = ['shoulders_front', 'chest', 'abs', 'biceps', 'quads'];
  const backMuscleGroups = ['traps', 'shoulders_back', 'lats', 'back_lower', 'triceps', 'glutes', 'hamstrings', 'calves'];

  const renderBodyView = (view: 'front' | 'back') => {
    const bodyImageUrl = view === 'front' ? frontViewImages[bodyType] : backViewImages[bodyType];
    const muscleGroupsToShow = view === 'front' ? frontMuscleGroups : backMuscleGroups;
    const isClickable = !!onViewClick;
    const viewContainer = (
        <div className="relative w-full mx-auto">
            {/* Layer 1: Background Color */}
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
                } else if (group === 'chest') {
                    size = '20%';
                } else if (group === 'shoulders_front' || group === 'shoulders_back') {
                    size = '10%'; 
                }
                
                return <HeatPoint key={`${view}-${group}`} intensity={intensity} size={size} coords={coords} bodyType={bodyType} view={view} />;
            })}
            </div>
            {/* Layer 3: Main body outline PNG */}
            <Image
            src={bodyImageUrl}
            alt={`${bodyType} body ${view} view`}
            width={200}
            height={355}
            className="relative object-contain z-20 w-full h-auto"
            unoptimized
            />
        </div>
    );
     if (isClickable) {
      return (
        <button
          onClick={() => onViewClick(view)}
          className="transition-transform hover:scale-105"
        >
          {viewContainer}
        </button>
      );
    }
    return viewContainer;
  }

  const content = (
    <div className="flex justify-center items-start gap-2">
        {renderBodyView('front')}
        {renderBodyView('back')}
    </div>
  );

  if (!isCard) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Muscle Heatmap</CardTitle>
        <CardDescription>Muscles worked in the {dateRangeLabel.toLowerCase()}. Click a view for details.</CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
