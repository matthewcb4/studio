'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Timer, MapPin, Heart } from 'lucide-react';
import type { WorkoutLog } from '@/lib/types';
import { startOfWeek, isWithinInterval } from 'date-fns';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

const activityIcons: Record<string, string> = {
    run: '🏃',
    walk: '🚶',
    cycle: '🚴',
    hiit: '💪',
};

export function CardioStatsCard() {
    const { user } = useUser();
    const firestore = useFirestore();

    // Fetch all workout logs
    const allLogsQuery = useMemoFirebase(() =>
        user ? query(collection(firestore, `users/${user.uid}/workoutLogs`), orderBy("date", "desc")) : null
        , [firestore, user]);
    const { data: allLogs, isLoading } = useCollection<WorkoutLog>(allLogsQuery);

    const cardioStats = useMemo(() => {
        if (!allLogs) return null;

        const now = new Date();
        // Get the start of the current week (Monday)
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // 1 = Monday

        // Filter logs to only include workouts from the current calendar week
        const thisWeeksLogs = allLogs.filter(log => {
            const logDate = new Date(log.date);
            return isWithinInterval(logDate, { start: weekStart, end: now });
        });

        // Filter only cardio workouts (those with activityType)
        const cardioLogs = thisWeeksLogs.filter(log => log.activityType);

        if (cardioLogs.length === 0) return null;

        let totalMinutes = 0;
        let totalDistance = 0;
        let heartRateSum = 0;
        let heartRateCount = 0;
        const activityCounts: Record<string, number> = {};

        cardioLogs.forEach(log => {
            // Parse duration (format: "30 min" or "45:00")
            const durationStr = log.duration || '';
            let minutes = 0;
            if (durationStr.includes('min')) {
                minutes = parseInt(durationStr) || 0;
            } else if (durationStr.includes(':')) {
                const [mins, secs] = durationStr.split(':').map(Number);
                minutes = mins + (secs || 0) / 60;
            }
            totalMinutes += minutes;

            // Sum distance
            if (log.cardioMetrics?.distance) {
                // Convert km to miles if needed for consistent display
                const dist = log.cardioMetrics.distanceUnit === 'km'
                    ? log.cardioMetrics.distance * 0.621371
                    : log.cardioMetrics.distance;
                totalDistance += dist;
            }

            // Average heart rate
            if (log.cardioMetrics?.avgHeartRate) {
                heartRateSum += log.cardioMetrics.avgHeartRate;
                heartRateCount++;
            }

            // Count by activity type
            const activity = log.activityType || 'other';
            activityCounts[activity] = (activityCounts[activity] || 0) + 1;
        });

        // Find most common activity
        const topActivity = Object.entries(activityCounts).sort((a, b) => b[1] - a[1])[0];

        return {
            sessionCount: cardioLogs.length,
            totalMinutes: Math.round(totalMinutes),
            totalDistance: Math.round(totalDistance * 10) / 10,
            avgHeartRate: heartRateCount > 0 ? Math.round(heartRateSum / heartRateCount) : null,
            topActivity: topActivity ? topActivity[0] : null,
            activityCounts,
        };
    }, [allLogs]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle>Cardio Summary</CardTitle>
                    <CardDescription>Loading...</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    // Show empty state if no cardio workouts
    if (!cardioStats) {
        return (
            <Card className="bg-gradient-to-br from-card to-orange-500/10">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                        <span>🏃</span> Cardio Summary
                    </CardTitle>
                    <CardDescription>This week</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        No cardio sessions logged. Use the Quick Cardio buttons to log a run, walk, bike, or HIIT session!
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-gradient-to-br from-card to-orange-500/10">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                    <span>{cardioStats.topActivity ? activityIcons[cardioStats.topActivity] : '🏃'}</span>
                    Cardio Summary
                </CardTitle>
                <CardDescription>This week</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    {/* Sessions */}
                    <div className="flex flex-col items-center p-3 bg-background/50 rounded-lg">
                        <span className="text-2xl font-bold">{cardioStats.sessionCount}</span>
                        <span className="text-xs text-muted-foreground">Sessions</span>
                    </div>

                    {/* Total Time */}
                    <div className="flex flex-col items-center p-3 bg-background/50 rounded-lg">
                        <div className="flex items-center gap-1">
                            <Timer className="w-4 h-4 text-orange-500" />
                            <span className="text-2xl font-bold">{cardioStats.totalMinutes}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Minutes</span>
                    </div>

                    {/* Distance */}
                    {cardioStats.totalDistance > 0 && (
                        <div className="flex flex-col items-center p-3 bg-background/50 rounded-lg">
                            <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4 text-blue-500" />
                                <span className="text-2xl font-bold">{cardioStats.totalDistance}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">Miles</span>
                        </div>
                    )}

                    {/* Avg Heart Rate */}
                    {cardioStats.avgHeartRate && (
                        <div className="flex flex-col items-center p-3 bg-background/50 rounded-lg">
                            <div className="flex items-center gap-1">
                                <Heart className="w-4 h-4 text-red-500" />
                                <span className="text-2xl font-bold">{cardioStats.avgHeartRate}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">Avg BPM</span>
                        </div>
                    )}
                </div>

                {/* Activity breakdown */}
                {Object.keys(cardioStats.activityCounts).length > 1 && (
                    <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Activity Breakdown</p>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(cardioStats.activityCounts).map(([activity, count]) => (
                                <div key={activity} className="flex items-center gap-1 text-sm bg-background/50 px-2 py-1 rounded">
                                    <span>{activityIcons[activity] || '🏋️'}</span>
                                    <span className="capitalize">{activity}</span>
                                    <span className="text-muted-foreground">×{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
