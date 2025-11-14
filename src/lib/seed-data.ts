
import type { Exercise } from './types';

// Omit 'id' because Firestore will generate it automatically
export const seedExercises: Omit<Exercise, 'id'>[] = [
  // Chest
  { name: 'Barbell Bench Press', category: 'Chest' },
  { name: 'Dumbbell Bench Press', category: 'Chest' },
  { name: 'Incline Dumbbell Press', category: 'Chest' },
  { name: 'Chest Fly', category: 'Chest' },
  { name: 'Push-up', category: 'Chest' },
  { name: 'Dip', category: 'Chest' },

  // Back
  { name: 'Pull-up', category: 'Back' },
  { name: 'Lat Pulldown', category: 'Back' },
  { name: 'Bent-over Row', category: 'Back' },
  { name: 'Seated Cable Row', category: 'Back' },
  { name: 'Deadlift', category: 'Back' },
  { name: 'T-Bar Row', category: 'Back' },

  // Legs
  { name: 'Barbell Squat', category: 'Legs' },
  { name: 'Goblet Squat', category: 'Legs' },
  { name: 'Lunge', category: 'Legs' },
  { name: 'Leg Press', category: 'Legs' },
  { name: 'Leg Extension', category: 'Legs' },
  { name: 'Hamstring Curl', category: 'Legs' },
  { name: 'Calf Raise', category: 'Legs' },

  // Shoulders
  { name: 'Overhead Press', category: 'Shoulders' },
  { name: 'Arnold Press', category: 'Shoulders' },
  { name: 'Lateral Raise', category: 'Shoulders' },
  { name: 'Front Raise', category: 'Shoulders' },
  { name: 'Face Pull', category: 'Shoulders' },
  { name: 'Shrug', category: 'Shoulders' },

  // Arms
  { name: 'Bicep Curl', category: 'Arms' },
  { name: 'Hammer Curl', category: 'Arms' },
  { name: 'Triceps Pushdown', category: 'Arms' },
  { name: 'Skull Crusher', category: 'Arms' },
  { name: 'Overhead Triceps Extension', category: 'Arms' },
  { name: 'Preacher Curl', category: 'Arms' },

  // Core
  { name: 'Crunch', category: 'Core' },
  { name: 'Plank', category: 'Core' },
  { name: 'Leg Raise', category: 'Core' },
  { name: 'Russian Twist', category: 'Core' },
  { name: 'Ab Rollout', category: 'Core' },
];
