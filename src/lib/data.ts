import type { Exercise, CustomWorkout, WorkoutLog } from './types';

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

export const customWorkouts: CustomWorkout[] = [
  {
    id: '1',
    name: 'Push Day',
    exercises: [
      { exerciseId: '1', exerciseName: 'Barbell Bench Press', sets: 3, reps: '8-10' },
      { exerciseId: '4', exerciseName: 'Overhead Press', sets: 4, reps: '6-8' },
      { exerciseId: '6', exerciseName: 'Tricep Extension', sets: 3, reps: '10-12' },
      { exerciseId: '10', exerciseName: 'Chest Fly', sets: 3, reps: '12-15' },
    ],
  },
  {
    id: '2',
    name: 'Leg Day',
    exercises: [
      { exerciseId: '3', exerciseName: 'Goblet Squat', sets: 4, reps: '8-10' },
      { exerciseId: '8', exerciseName: 'Leg Press', sets: 3, reps: '10-12' },
      { exerciseId: '11', exerciseName: 'Romanian Deadlift', sets: 3, reps: '8-10' },
    ],
  },
  {
    id: '3',
    name: 'Pull Day',
    exercises: [
        { exerciseId: '2', exerciseName: 'Seated Lat Pulldown', sets: 3, reps: '8-12' },
        { exerciseId: '7', exerciseName: 'Deadlift', sets: 1, reps: '5' },
        { exerciseId: '5', exerciseName: 'Bicep Curl', sets: 3, reps: '10-12' },
        { exerciseId: '12', exerciseName: 'Pull Up', sets: 4, reps: 'AMRAP' },
    ]
  }
];

export const workoutLogs: WorkoutLog[] = [
  {
    id: 'log1',
    workoutName: 'Push Day',
    date: '2024-07-20T10:00:00Z',
    duration: '55 min',
    volume: 8500,
    exercises: [
      { exerciseId: '1', exerciseName: 'Barbell Bench Press', sets: [{ weight: 135, reps: 10 }, { weight: 135, reps: 9 }, { weight: 135, reps: 8 }] },
      { exerciseId: '4', exerciseName: 'Overhead Press', sets: [{ weight: 75, reps: 8 }, { weight: 75, reps: 8 }, { weight: 75, reps: 7 }, { weight: 75, reps: 6 }] },
    ],
  },
  {
    id: 'log2',
    workoutName: 'Leg Day',
    date: '2024-07-18T18:30:00Z',
    duration: '65 min',
    volume: 12000,
    exercises: [
      { exerciseId: '3', exerciseName: 'Goblet Squat', sets: [{ weight: 50, reps: 10 }, { weight: 50, reps: 10 }, { weight: 50, reps: 10 }, { weight: 50, reps: 10 }] },
      { exerciseId: '8', exerciseName: 'Leg Press', sets: [{ weight: 250, reps: 12 }, { weight: 250, reps: 11 }, { weight: 250, reps: 10 }] },
    ],
  },
   {
    id: 'log3',
    workoutName: 'Push Day',
    date: '2024-07-13T10:00:00Z',
    duration: '50 min',
    volume: 7950,
    exercises: [
      { exerciseId: '1', exerciseName: 'Barbell Bench Press', sets: [{ weight: 135, reps: 9 }, { weight: 135, reps: 8 }, { weight: 135, reps: 8 }] },
      { exerciseId: '4', exerciseName: 'Overhead Press', sets: [{ weight: 70, reps: 8 }, { weight: 70, reps: 8 }, { weight: 70, reps: 7 }, { weight: 70, reps: 6 }] },
    ],
  },
];
