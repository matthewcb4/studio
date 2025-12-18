'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import type { WorkoutExercise, Exercise } from '@/lib/types';
import { categoryToMuscleGroup, muscleToChartGroup } from '@/lib/muscle-mapping';

const muscleColors: Record<string, string> = {
    Chest: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
    Back: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
    Shoulders: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30',
    Legs: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
    Arms: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
    Core: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
};

interface WorkoutMusclePillsProps {
    exercises: WorkoutExercise[];
    masterExercises: Exercise[];
}

export function WorkoutMusclePills({ exercises, masterExercises }: WorkoutMusclePillsProps) {
    const muscleGroups = useMemo(() => {
        const groups = new Set<string>();

        exercises.forEach(ex => {
            // Find the master exercise to get its category
            const masterEx = masterExercises.find(m => m.id === ex.exerciseId || m.name === ex.exerciseName);
            if (masterEx?.category) {
                // Get the muscle groups for this category
                const muscleGroupsForCategory = categoryToMuscleGroup[masterEx.category];
                if (muscleGroupsForCategory && muscleGroupsForCategory.length > 0) {
                    // Map the first muscle to its chart group (simplified category)
                    const chartGroup = muscleToChartGroup[muscleGroupsForCategory[0]];
                    if (chartGroup) {
                        groups.add(chartGroup);
                    }
                }
            }
        });

        return Array.from(groups).sort();
    }, [exercises, masterExercises]);

    if (muscleGroups.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1 mt-2">
            {muscleGroups.map(group => (
                <Badge
                    key={group}
                    variant="outline"
                    className={`text-xs font-medium ${muscleColors[group] || 'bg-muted'}`}
                >
                    {group}
                </Badge>
            ))}
        </div>
    );
}
