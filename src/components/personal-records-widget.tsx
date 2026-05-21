'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Dumbbell, Calendar, Zap, Award } from 'lucide-react';
import type { WorkoutLog } from '@/lib/types';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { calculate1RM } from '@/lib/analytics';
import { format } from 'date-fns';

type ExercisePR = {
  exerciseName: string;
  maxWeight: number;
  maxWeightDate: Date;
  max1RM: number;
  max1RMDate: Date;
};

export function PersonalRecordsWidget() {
  const { user } = useUser();
  const firestore = useFirestore();

  // Fetch all workout logs ordered by date desc
  const allLogsQuery = useMemoFirebase(() =>
    user ? query(collection(firestore, `users/${user.uid}/workoutLogs`), orderBy("date", "desc")) : null
    , [firestore, user]);
  const { data: allLogs, isLoading } = useCollection<WorkoutLog>(allLogsQuery);

  const prList = useMemo(() => {
    if (!allLogs || allLogs.length === 0) return [];

    const prMap = new Map<string, ExercisePR>();

    allLogs.forEach(log => {
      const logDate = new Date(log.date);
      (log.exercises || []).forEach(ex => {
        const name = ex.exerciseName;
        ex.sets.forEach(set => {
          if (set.type === 'warmup') return;
          const weight = set.weight || 0;
          const reps = set.reps || 0;
          if (weight === 0 || reps === 0) return;

          const est1RM = calculate1RM(weight, reps);
          const existing = prMap.get(name);

          if (!existing) {
            prMap.set(name, {
              exerciseName: name,
              maxWeight: weight,
              maxWeightDate: logDate,
              max1RM: est1RM,
              max1RMDate: logDate,
            });
          } else {
            let updated = false;
            const updates: Partial<ExercisePR> = {};

            if (weight > existing.maxWeight) {
              updates.maxWeight = weight;
              updates.maxWeightDate = logDate;
              updated = true;
            }
            if (est1RM > existing.max1RM) {
              updates.max1RM = est1RM;
              updates.max1RMDate = logDate;
              updated = true;
            }

            if (updated) {
              prMap.set(name, {
                ...existing,
                ...updates,
              });
            }
          }
        });
      });
    });

    // Sort by heaviest max weight or highest 1RM, let's select top 4 major lifts or most popular ones
    // Or just sort by most recent PR date to keep it highly dynamic and interactive!
    return Array.from(prMap.values())
      .sort((a, b) => b.maxWeightDate.getTime() - a.maxWeightDate.getTime())
      .slice(0, 4); // Show top 4 most recently updated PRs
  }, [allLogs]);

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-card to-amber-500/5 border-amber-500/10">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500 animate-pulse" /> All-Time PRs
          </CardTitle>
          <CardDescription>Loading achievements...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (prList.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-card to-amber-500/5 border-amber-500/10">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> All-Time PRs
          </CardTitle>
          <CardDescription>No personal records recorded yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Complete high-intensity exercises during your workouts to log all-time personal records!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card to-amber-500/5 border-amber-500/20 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500 animate-bounce" /> 
            <span>All-Time PRs</span>
          </span>
          <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold px-2 py-0.5 rounded-full border border-amber-500/20">
            Gold Achievements
          </span>
        </CardTitle>
        <CardDescription>Your recently smashed lift milestones.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        <div className="flex flex-col gap-3">
          {prList.map((pr) => (
            <div 
              key={pr.exerciseName}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-all border border-border/50 shadow-sm gap-3 sm:gap-2"
            >
              {/* Left Side: Icon & Exercise Details */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 shrink-0">
                  <Award className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold truncate leading-snug">{pr.exerciseName}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3 shrink-0" />
                    {format(pr.maxWeightDate, 'MMM d, yyyy')}
                  </span>
                </div>
              </div>

              {/* Right Side: PR Stats */}
              <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/30 shrink-0">
                <div className="flex flex-col sm:text-right">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider sm:hidden">
                    Max Weight
                  </span>
                  <span className="text-sm font-bold text-foreground mt-0.5 sm:mt-0">
                    {pr.maxWeight} <span className="text-xs font-normal text-muted-foreground">lbs</span>
                  </span>
                  <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider hidden sm:block">
                    Max Weight
                  </span>
                </div>
                <div className="flex flex-col sm:text-right">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider sm:hidden">
                    Best 1RM
                  </span>
                  <span className="text-sm font-bold text-primary mt-0.5 sm:mt-0">
                    {pr.max1RM} <span className="text-xs font-normal text-muted-foreground">lbs</span>
                  </span>
                  <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider hidden sm:block">
                    Best 1RM
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
