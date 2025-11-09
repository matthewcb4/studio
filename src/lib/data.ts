import type { Exercise, CustomWorkout, WorkoutLog } from './types';

// This file is now deprecated for master exercises, which are fetched from Firestore.
// It is kept for type reference and potential future use with other static data.
export const exercises: Exercise[] = [];

// The following are now empty as they will be fetched from Firestore
export const customWorkouts: CustomWorkout[] = [];

export const workoutLogs: WorkoutLog[] = [];
