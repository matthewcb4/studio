import type { Exercise, CustomWorkout, WorkoutLog } from './types';

// The master list of exercises can be pre-populated in Firestore.
// For this example, we'll keep it here but in a real app,
// this would likely be managed in a CMS or an admin interface.
export const exercises: Exercise[] = [
  { id: '1', name: 'Barbell Bench Press', category: 'Chest' },
  { id: '2', name: 'Seated Lat Pulldown', category: 'Back' },
  { id: '3', name: 'Goblet Squat', category: 'Legs' },
  { id: '4', name: 'Overhead Press', category: 'Shoulders' },
  { id: '5', name: 'Bicep Curl', category: 'Arms' },
  { id: '6', name: 'Tricep Extension', category: 'Arms' },
  { id: '7', name: 'Deadlift', category: 'Back' },
  { id: '8', name: 'Leg Press', category: 'Legs' },
  { id: '9', name: 'Lateral Raise', category: 'Shoulders' },
  { id: '10', name: 'Chest Fly', category: 'Chest' },
  { id: '11', name: 'Romanian Deadlift', category: 'Legs' },
  { id: '12', name: 'Pull Up', category: 'Back' },
];

// The following are now empty as they will be fetched from Firestore
export const customWorkouts: CustomWorkout[] = [];

export const workoutLogs: WorkoutLog[] = [];
