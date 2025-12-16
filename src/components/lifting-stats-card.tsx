'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, TrendingUp, Target, Zap } from 'lucide-react';
import type { WorkoutLog } from '@/lib/types';
import { startOfWeek, isWithinInterval } from 'date-fns';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

export function LiftingStatsCard() {
    const { user } = useUser();
    const firestore = useFirestore();

    // Fetch all workout logs
    const allLogsQuery = useMemoFirebase(() =>
        user ? query(collection(firestore, `users/${user.uid}/workoutLogs`), orderBy("date", "desc")) : null
        , [firestore, user]);
    const { data: allLogs, isLoading } = useCollection<WorkoutLog>(allLogsQuery);

    const liftingStats = useMemo(() => {
        if (!allLogs) return null;

        const now = new Date();
        // Get the start of the current week (Monday)
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // 1 = Monday

        // Filter logs to only include workouts from the current calendar week
        const thisWeeksLogs = allLogs.filter(log => {
            const logDate = new Date(log.date);
            return isWithinInterval(logDate, { start: weekStart, end: now });
        });

        // Filter only lifting workouts (those WITHOUT activityType = cardio)
        const liftingLogs = thisWeeksLogs.filter(log => !log.activityType);

        if (liftingLogs.length === 0) return null;

        let totalVolume = 0;
        let totalSets = 0;
        let totalReps = 0;
        let maxWeight = 0;
        const exerciseSet = new Set<string>();

        liftingLogs.forEach(log => {
            // Sum volume
            totalVolume += log.volume || 0;

            // Count sets and reps from exercises
            if (log.exercises) {
                log.exercises.forEach(exercise => {
                    exerciseSet.add(exercise.exerciseName || exercise.exerciseId);
                    exercise.sets.forEach(set => {
                        if (set.type !== 'warmup') {
                            totalSets++;
                            totalReps += set.reps || 0;
                            if ((set.weight || 0) > maxWeight) {
                                maxWeight = set.weight || 0;
                            }
                        }
                    });
                });
            }
        });

        return {
            sessionCount: liftingLogs.length,
            totalVolume: Math.round(totalVolume),
            totalSets,
            totalReps,
            maxWeight,
            uniqueExercises: exerciseSet.size,
        };
    }, [allLogs]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle>Lifting Summary</CardTitle>
                    <CardDescription>Loading...</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    // Show empty state if no lifting workouts
    if (!liftingStats) {
        return (
            <Card className="bg-gradient-to-br from-card to-blue-500/10">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                        <Dumbbell className="w-5 h-5" /> Lifting Summary
                    </CardTitle>
                    <CardDescription>This week</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        No lifting sessions logged. Start a workout to see your stats!
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-gradient-to-br from-card to-blue-500/10">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                    <Dumbbell className="w-5 h-5" /> Lifting Summary
                </CardTitle>
                <CardDescription>This week</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    {/* Sessions */}
                    <div className="flex flex-col items-center p-3 bg-background/50 rounded-lg">
                        <span className="text-2xl font-bold">{liftingStats.sessionCount}</span>
                        <span className="text-xs text-muted-foreground">Sessions</span>
                    </div>

                    {/* Total Volume */}
                    <div className="flex flex-col items-center p-3 bg-background/50 rounded-lg">
                        <div className="flex items-center gap-1">
                            <Zap className="w-4 h-4 text-blue-500" />
                            <span className="text-xl font-bold">{liftingStats.totalVolume >= 1000 ? `${(liftingStats.totalVolume / 1000).toFixed(1)}k` : liftingStats.totalVolume}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Volume (lbs)</span>
                    </div>

                    {/* Total Sets */}
                    <div className="flex flex-col items-center p-3 bg-background/50 rounded-lg">
                        <div className="flex items-center gap-1">
                            <Target className="w-4 h-4 text-green-500" />
                            <span className="text-2xl font-bold">{liftingStats.totalSets}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Sets</span>
                    </div>

                    {/* Max Weight */}
                    {liftingStats.maxWeight > 0 && (
                        <div className="flex flex-col items-center p-3 bg-background/50 rounded-lg">
                            <div className="flex items-center gap-1">
                                <TrendingUp className="w-4 h-4 text-yellow-500" />
                                <span className="text-2xl font-bold">{liftingStats.maxWeight}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">Max (lbs)</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
