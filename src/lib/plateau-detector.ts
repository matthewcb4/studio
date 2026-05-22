import { WorkoutLog } from './types';
import { calculate1RM } from './analytics';

export interface PlateauInfo {
  exerciseName: string;
  recent1RMs: number[]; // chronological [r1, r2, r3] (oldest to newest)
}

/**
 * Robustly parses and extracts strength plateau details from completed workout logs.
 * A plateau is defined as a peak estimated 1RM (Epley formula) that has remained flat 
 * or declined over 3 consecutive logged sessions for a primary compound lift.
 */
export function detectPlateaus(logs: WorkoutLog[]): PlateauInfo[] {
  if (!logs || logs.length === 0) return [];

  // Date parsing helper aligning with analytics.ts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getDate = (d: any): Date => {
    if (!d) return new Date();
    if (typeof d.toDate === 'function') {
      return d.toDate();
    }
    return new Date(d);
  };

  // Sort completed logs chronologically (earliest to latest)
  const sortedLogs = [...logs].sort((a, b) => getDate(a.date).getTime() - getDate(b.date).getTime());

  // Matches compound primary exercises
  const isPrimaryLift = (name: string): string | null => {
    const lower = name.toLowerCase();
    if (lower.includes('bench press')) return 'Bench Press';
    if (lower.includes('squat') && !lower.includes('jump')) return 'Squat';
    if (lower.includes('deadlift')) return 'Deadlift';
    if (lower.includes('overhead press') || lower.includes('military press')) return 'Overhead Press';
    return null;
  };

  // map: category name -> array of historical peak 1RM values
  const liftHistory: Record<string, { originalName: string; oneRepMax: number; date: Date }[]> = {};

  sortedLogs.forEach(log => {
    const logDate = getDate(log.date);
    if (!log.exercises) return;

    log.exercises.forEach(loggedEx => {
      const category = isPrimaryLift(loggedEx.exerciseName);
      if (!category) return;

      let peak1RM = 0;
      loggedEx.sets.forEach(set => {
        const weight = set.weight || 0;
        const reps = set.reps || 0;
        if (set.type === 'warmup') return;

        const est1RM = calculate1RM(weight, reps);
        if (est1RM > peak1RM) {
          peak1RM = est1RM;
        }
      });

      if (peak1RM > 0) {
        if (!liftHistory[category]) {
          liftHistory[category] = [];
        }
        liftHistory[category].push({
          originalName: loggedEx.exerciseName,
          oneRepMax: peak1RM,
          date: logDate,
        });
      }
    });
  });

  const plateaus: PlateauInfo[] = [];

  for (const [category, history] of Object.entries(liftHistory)) {
    if (history.length < 3) continue;

    // Grab the last three sessions logged for this lift
    const last3 = history.slice(-3);
    const [r1, r2, r3] = last3.map(h => h.oneRepMax);

    // If 1RM stayed the same or declined chronologically
    if (r3 <= r2 && r2 <= r1) {
      const exerciseName = last3[2].originalName;
      plateaus.push({
        exerciseName,
        recent1RMs: [r1, r2, r3],
      });
    }
  }

  return plateaus;
}
