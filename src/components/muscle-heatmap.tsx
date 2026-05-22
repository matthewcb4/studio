'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { UserProfile, WorkoutLog, Exercise } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { differenceInDays } from 'date-fns';
import { categoryToMuscleGroup } from '@/lib/muscle-mapping';
import { SVGBody, muscleDisplayNames } from './svg-body';

// Keep standard definitions for type-safety and backward compatibility
export type HeatmapColorScheme = 'classic' | 'sunset' | 'ocean' | 'monochrome' | 'neon';

export const colorSchemes: Record<HeatmapColorScheme, { low: string; mid: string; high: string; label: string }> = {
  classic: {
    low: 'hsl(240, 100%, 40%)',
    mid: 'hsl(100, 100%, 40%)',
    high: 'hsl(0, 100%, 40%)',
    label: '🔵 Classic (Blue → Green → Red)',
  },
  sunset: {
    low: 'hsl(280, 80%, 45%)',
    mid: 'hsl(35, 100%, 50%)',
    high: 'hsl(350, 100%, 50%)',
    label: '🌅 Sunset (Purple → Orange → Red)',
  },
  ocean: {
    low: 'hsl(200, 80%, 35%)',
    mid: 'hsl(180, 70%, 45%)',
    high: 'hsl(160, 80%, 50%)',
    label: '🌊 Ocean (Deep Blue → Teal → Aqua)',
  },
  monochrome: {
    low: 'hsl(0, 0%, 40%)',
    mid: 'hsl(0, 0%, 55%)',
    high: 'hsl(0, 0%, 95%)',
    label: '⚪ Monochrome (Gray Scale)',
  },
  neon: {
    low: 'hsl(180, 100%, 50%)',
    mid: 'hsl(280, 100%, 60%)',
    high: 'hsl(60, 100%, 50%)',
    label: '💜 Neon (Cyan → Magenta → Yellow)',
  },
};

// HeatPoint is kept as a legacy export to satisfy imports, but rendered as empty / no-op
export const HeatPoint = () => null;

// Kept for backward compatibility imports
export const heatmapCoordinates: any = { Male: {}, Female: {} };

export type MuscleGroupIntensities = Record<string, number>;

export interface ExerciseContribution {
  name: string;
  volume: number;
}

interface MuscleHeatmapProps {
  userProfile?: UserProfile | null;
  thisWeeksLogs: WorkoutLog[];
  isLoading: boolean;
  dateRangeLabel: string;
  isCard?: boolean;
  isSingleWorkout?: boolean;
  onIntensitiesChange?: (intensities: MuscleGroupIntensities) => void;
  onViewClick?: (view: 'front' | 'back') => void;
  preCalculatedIntensities?: MuscleGroupIntensities;
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
  preCalculatedIntensities,
}: MuscleHeatmapProps) {
  const firestore = useFirestore();

  const exercisesQuery = useMemoFirebase(() =>
    firestore ? query(collection(firestore, 'exercises')) : null,
    [firestore]
  );
  const { data: masterExercises, isLoading: isLoadingExercises } = useCollection<Exercise>(exercisesQuery);

  // Tooltip tracking states
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);
  const [tooltipCoords, setTooltipCoords] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute intensities and exercise contributions
  const heatmapData = useMemo(() => {
    const muscleGroupEffort: Record<string, number> = {
      chest: 0, back: 0, shoulders: 0, legs: 0, arms: 0, core: 0,
      quads: 0, hamstrings: 0, glutes: 0, calves: 0,
      lats: 0, traps: 0, back_lower: 0,
      biceps: 0, triceps: 0, abs: 0, shoulders_front: 0, shoulders_back: 0,
    };

    const contributionsMap: Record<string, Record<string, number>> = {};

    if (!thisWeeksLogs || !masterExercises) {
      return { intensities: {}, contributions: {} };
    }

    const now = new Date();

    thisWeeksLogs.forEach(log => {
      const logDate = new Date(log.date);
      const daysSince = differenceInDays(now, logDate);
      const decayFactor = isSingleWorkout ? 1 : 1 / (daysSince + 1);

      // 1. Process Cardio Workouts
      if (log.musclesWorked) {
        let minutes = 0;
        if (log.duration) {
          const durationStr = log.duration;
          if (durationStr.includes('min')) {
            minutes = parseInt(durationStr) || 0;
          } else if (durationStr.includes(':')) {
            const [mins, secs] = durationStr.split(':').map(Number);
            minutes = mins + (secs || 0) / 60;
          }
        }

        const cardioBaseEffort = (minutes / 30) * 5000;

        for (const [muscle, multiplier] of Object.entries(log.musclesWorked)) {
          const effort = cardioBaseEffort * (multiplier as number) * decayFactor;
          muscleGroupEffort[muscle] = (muscleGroupEffort[muscle] || 0) + effort;

          if (!contributionsMap[muscle]) contributionsMap[muscle] = {};
          const cardioName = log.workoutName || 'Cardio Workout';
          contributionsMap[muscle][cardioName] = (contributionsMap[muscle][cardioName] || 0) + effort;
        }
      }

      // 2. Process Resistance Exercises
      (log.exercises || []).forEach(loggedEx => {
        const masterEx = masterExercises.find(me => me.id === loggedEx.exerciseId);
        if (!masterEx) return;

        let muscleGroups: string[] = [];

        if (masterEx.targetMuscles && masterEx.targetMuscles.length > 0) {
          const targetToHeatmap: Record<string, string[]> = {
            'Chest': ['chest'],
            'Upper Chest': ['chest'],
            'Middle Chest': ['chest'],
            'Lower Chest': ['chest'],
            'Back': ['lats', 'traps', 'back_lower'],
            'Lats': ['lats'],
            'Traps': ['traps'],
            'Lower Back': ['back_lower'],
            'Rhomboids': ['back_lower', 'traps'],
            'Shoulders': ['shoulders_front', 'shoulders_back'],
            'Front Delts': ['shoulders_front'],
            'Side Delts': ['shoulders_front', 'shoulders_back'],
            'Rear Delts': ['shoulders_back'],
            'Arms': ['biceps', 'triceps'],
            'Biceps': ['biceps'],
            'Triceps': ['triceps'],
            'Forearms': ['biceps'],
            'Legs': ['quads', 'hamstrings', 'glutes', 'calves'],
            'Quads': ['quads'],
            'Hamstrings': ['hamstrings'],
            'Glutes': ['glutes'],
            'Calves': ['calves'],
            'Hip Flexors': ['quads'],
            'Core': ['abs'],
            'Abs': ['abs'],
            'Obliques': ['abs'],
          };

          masterEx.targetMuscles.forEach(muscle => {
            const mapped = targetToHeatmap[muscle];
            if (mapped) muscleGroups.push(...mapped);
          });
          muscleGroups = [...new Set(muscleGroups)];
        } else if (masterEx.category) {
          muscleGroups = categoryToMuscleGroup[masterEx.category] || [];
        }

        if (muscleGroups.length > 0) {
          const totalEffort = loggedEx.sets.reduce((sum, set) => {
            if (set.weight && set.weight > 0) {
              return sum + (set.weight * (set.reps || 0));
            }
            if (set.duration) {
              return sum + (Math.floor(set.duration / 10) * 30);
            }
            return sum + ((set.reps || 0) * 40);
          }, 0);

          const decayedEffort = totalEffort * decayFactor;

          muscleGroups.forEach(group => {
            muscleGroupEffort[group] = (muscleGroupEffort[group] || 0) + decayedEffort;

            if (!contributionsMap[group]) contributionsMap[group] = {};
            contributionsMap[group][masterEx.name] = (contributionsMap[group][masterEx.name] || 0) + decayedEffort;
          });
        }
      });
    });

    let target = 0;
    if (isSingleWorkout) {
      target = Math.max(...Object.values(muscleGroupEffort), 1);
    } else {
      const baselineWeeklyVolume = 10000;
      target = baselineWeeklyVolume;
      if (userProfile?.fatLossGoal === 'reduce_body_fat' || userProfile?.strengthGoal === 'improve_endurance') {
        target *= 1.5;
      } else if (userProfile?.muscleGoal === 'gain_overall_mass' || userProfile?.strengthGoal === 'increase_max_lift') {
        target *= 0.75;
      }
    }

    const intensities: MuscleGroupIntensities = {};
    for (const group in muscleGroupEffort) {
      intensities[group] = target > 0 ? Math.min(muscleGroupEffort[group] / target, 1) : 0;
    }

    // Map contributions to a sorted list
    const contributions: Record<string, ExerciseContribution[]> = {};
    for (const group in contributionsMap) {
      contributions[group] = Object.entries(contributionsMap[group])
        .map(([name, volume]) => ({ name, volume: Math.round(volume) }))
        .sort((a, b) => b.volume - a.volume);
    }

    return { intensities, contributions };
  }, [thisWeeksLogs, masterExercises, userProfile, isSingleWorkout]);

  // Merge pre-calculated values if applicable
  const activeIntensities = preCalculatedIntensities || heatmapData.intensities;

  useEffect(() => {
    if (onIntensitiesChange) {
      onIntensitiesChange(activeIntensities);
    }
  }, [activeIntensities, onIntensitiesChange]);

  const bodyType = userProfile?.biologicalSex || 'Male';
  const colorScheme = userProfile?.heatmapColorScheme || 'classic';

  // Handle SVG muscle hovering to trigger tooltips
  const handleMuscleHover = (muscleKey: string | null, e?: React.MouseEvent) => {
    if (!muscleKey || !e || !containerRef.current) {
      setHoveredMuscle(null);
      setTooltipCoords(null);
      return;
    }

    const bounds = containerRef.current.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const y = e.clientY - bounds.top;

    setHoveredMuscle(muscleKey);
    setTooltipCoords({ x, y });
  };

  const handleMuscleClick = (muscleKey: string) => {
    // If onViewClick is available, propagate to open the modal
    if (onViewClick) {
      const isFront = ['chest', 'abs', 'biceps', 'quads', 'shoulders_front'].includes(muscleKey);
      onViewClick(isFront ? 'front' : 'back');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
        <p className="text-sm">Generating vector heatmap...</p>
      </div>
    );
  }

  // Render front/back silhouettes
  const renderBodyView = (view: 'front' | 'back') => {
    return (
      <div className="w-1/2 max-w-[170px] relative transition-transform duration-300 hover:scale-[1.02]">
        <h4 className="text-xs font-semibold text-center text-muted-foreground uppercase tracking-wider mb-2">
          {view}
        </h4>
        <SVGBody
          view={view}
          biologicalSex={bodyType}
          intensities={activeIntensities}
          colorScheme={colorScheme}
          onMuscleHover={handleMuscleHover}
          onMuscleClick={handleMuscleClick}
          selectedMuscle={hoveredMuscle}
        />
      </div>
    );
  };

  const content = (
    <div className="flex justify-center items-start gap-8 relative py-4">
      {renderBodyView('front')}
      {renderBodyView('back')}

      {/* Floating Glassmorphic Tooltip */}
      {hoveredMuscle && tooltipCoords && (
        <div
          className="absolute z-50 pointer-events-none p-3 bg-card/85 backdrop-blur-md border border-border/60 rounded-lg shadow-xl max-w-[200px] transition-all duration-150 animate-in fade-in zoom-in-95"
          style={{
            left: `${tooltipCoords.x + 15}px`,
            top: `${tooltipCoords.y - 40}px`,
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-xs text-foreground">
              {muscleDisplayNames[hoveredMuscle] || hoveredMuscle}
            </span>
            <span className="font-semibold text-2xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {((activeIntensities[hoveredMuscle] || 0) * 100).toFixed(0)}%
            </span>
          </div>

          {/* List of exercises contributing */}
          <div className="space-y-1 mt-2 pt-1.5 border-t border-border/40">
            <p className="text-3xs font-semibold text-muted-foreground uppercase tracking-wide">
              Top Exercises
            </p>
            {heatmapData.contributions[hoveredMuscle] && heatmapData.contributions[hoveredMuscle].length > 0 ? (
              heatmapData.contributions[hoveredMuscle].slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center gap-2">
                  <span className="text-2xs text-muted-foreground truncate max-w-[110px]">
                    {item.name}
                  </span>
                  <span className="text-3xs font-mono text-foreground/80 font-medium">
                    {item.volume.toLocaleString()} lb
                  </span>
                </div>
              ))
            ) : (
              <span className="text-2xs text-muted-foreground italic">No sets logged</span>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (!isCard) {
    return <div ref={containerRef} className="relative">{content}</div>;
  }

  return (
    <Card className="overflow-hidden border border-border/50 bg-gradient-to-br from-card to-background shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-md sm:text-lg font-bold tracking-tight">Anatomical Fatigue Heatmap</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Interactive vector-shaded volume fatigue for the {dateRangeLabel.toLowerCase()}
            </CardDescription>
          </div>
          <div className="text-2xs font-bold font-mono px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
            {bodyType}
          </div>
        </div>
      </CardHeader>
      <CardContent ref={containerRef} className="relative pt-0 pb-4">
        {content}
      </CardContent>
    </Card>
  );
}
