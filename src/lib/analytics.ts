
import { WorkoutLog, LoggedSet } from "./types";

/**
 * Calculates the Estimated One Rep Max (1RM) using the Epley Formula.
 * 1RM = Weight * (1 + Reps/30)
 */
export const calculate1RM = (weight: number, reps: number): number => {
    if (reps === 1) return weight;
    if (reps === 0 || weight === 0) return 0;
    return Math.round(weight * (1 + reps / 30));
};

export type PRType = 'max_weight' | 'max_volume' | 'best_1rm';

export type PRResult = {
    isPR: boolean;
    type: PRType;
    oldValue: number;
    newValue: number;
};

/**
 * Checks if a newly logged set is a Personal Record compared to history.
 */
export const checkPersonalRecord = (
    exerciseId: string,
    currentSet: LoggedSet,
    history: WorkoutLog[]
): PRResult[] | null => {
    if (!currentSet.weight || !currentSet.reps) return null;

    const currentWeight = currentSet.weight;
    const current1RM = calculate1RM(currentSet.weight, currentSet.reps);

    let maxWeight = 0;
    let max1RM = 0;

    // Iterate through all historical logs
    history.forEach(log => {
        log.exercises.forEach(ex => {
            if (ex.exerciseId === exerciseId) {
                ex.sets.forEach(set => {
                    const w = set.weight || 0;
                    const r = set.reps || 0;
                    if (w > maxWeight) maxWeight = w;

                    const est1RM = calculate1RM(w, r);
                    if (est1RM > max1RM) max1RM = est1RM;
                });
            }
        });
    });

    const results: PRResult[] = [];

    if (currentWeight > maxWeight) {
        results.push({
            isPR: true,
            type: 'max_weight',
            oldValue: maxWeight,
            newValue: currentWeight
        });
    }

    if (current1RM > max1RM) {
        results.push({
            isPR: true,
            type: 'best_1rm',
            oldValue: max1RM,
            newValue: current1RM
        });
    }

    return results.length > 0 ? results : null;
};

export type UserStats = {
    lifetimeVolume: number;
    xp: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
};

/**
 * Calculates user statistics from the entire workout history.
 */
export const calculateUserStats = (history: WorkoutLog[]): UserStats => {
    let lifetimeVolume = 0;
    let xp = 0;

    // Sort history by date descending for accurate streak calc, 
    // though for volume/xp order doesn't matter.
    // We create a copy to avoid mutating the input.
    const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 1. Calculate Volume and XP
    sortedHistory.forEach(log => {
        const logVolume = log.volume || 0;
        lifetimeVolume += logVolume;

        // XP Rule: 100 base + 1 per 100 lbs
        const logXp = 100 + Math.floor(logVolume / 100);
        xp += logXp;
    });

    const level = Math.floor(xp / 1000) + 1;

    // 2. Calculate Streaks
    // We need unique dates (ignoring time)
    const uniqueDates = new Set<string>();
    sortedHistory.forEach(log => {
        const dateStr = new Date(log.date).toLocaleDateString('en-CA');
        uniqueDates.add(dateStr);
    });

    const sortedDates = Array.from(uniqueDates).sort().reverse(); // Newest first: ['2023-12-07', '2023-12-06', ...]

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    if (sortedDates.length > 0) {
        const today = new Date().toLocaleDateString('en-CA');
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');

        // Check if the most recent workout was today or yesterday to start the current streak
        const lastWorkoutDate = sortedDates[0];
        if (lastWorkoutDate === today || lastWorkoutDate === yesterday) {
            currentStreak = 1;
            tempStreak = 1;
        } else {
            // Streak is broken
            currentStreak = 0;
            tempStreak = 1; // Start counting for longest streak check
        }

        // Iterate to find streaks
        for (let i = 0; i < sortedDates.length - 1; i++) {
            const current = new Date(sortedDates[i]);
            const next = new Date(sortedDates[i + 1]);

            // Check diff in days
            const diffTime = current.getTime() - next.getTime();
            const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

            if (diffDays === 1) {
                tempStreak++;
            } else {
                // Streak broken
                if (tempStreak > longestStreak) longestStreak = tempStreak;

                // If this was the start of the array, finalize currentStreak
                if (i === currentStreak - 1 && currentStreak > 0) {
                    // currentStreak is valid, keep it.
                }

                tempStreak = 1;
            }
        }
        if (tempStreak > longestStreak) longestStreak = tempStreak;

        // Special case: if we are building the 'currentStreak' from index 0
        // (i.e., we are in the first continuous block), update currentStreak.

        // Let's redo streak calc simply:

        // Recalculate Longest Streak properly
        let currentRun = 0;
        let maxRun = 0;
        for (let i = 0; i < sortedDates.length; i++) {
            if (i === 0) {
                currentRun = 1;
            } else {
                const prev = new Date(sortedDates[i - 1]);
                const curr = new Date(sortedDates[i]);
                const diff = (prev.getTime() - curr.getTime()) / (1000 * 3600 * 24); // approx days

                if (Math.round(diff) === 1) {
                    currentRun++;
                } else {
                    if (currentRun > maxRun) maxRun = currentRun;
                    currentRun = 1;
                }
            }
        }
        if (currentRun > maxRun) maxRun = currentRun;
        longestStreak = maxRun;

        // Recalculate Current Streak
        currentStreak = 0;
        if (sortedDates.includes(today) || sortedDates.includes(yesterday)) {
            // It's active, count back from most recent
            let run = 1;
            for (let i = 0; i < sortedDates.length - 1; i++) {
                const curr = new Date(sortedDates[i]);
                const next = new Date(sortedDates[i + 1]);
                const diff = (curr.getTime() - next.getTime()) / (1000 * 3600 * 24);
                if (Math.round(diff) === 1) {
                    run++;
                } else {
                    break;
                }
            }
            currentStreak = run;
        }
    }

    return {
        lifetimeVolume,
        xp,
        level,
        currentStreak,
        longestStreak
    };
};
