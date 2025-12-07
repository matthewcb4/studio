
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
