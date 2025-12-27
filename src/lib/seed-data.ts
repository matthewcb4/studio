
import type { Exercise } from './types';

// Omit 'id' because Firestore will generate it automatically
export const seedExercises: Omit<Exercise, 'id'>[] = [
  // Chest
  { name: 'Barbell Bench Press', category: 'Chest' },
  { name: 'Dumbbell Bench Press', category: 'Chest' },
  { name: 'Incline Dumbbell Press', category: 'Chest' },
  { name: 'Chest Fly', category: 'Chest' },
  { name: 'Push-up', category: 'Chest', defaultUnit: 'bodyweight' },
  { name: 'Dip', category: 'Chest', defaultUnit: 'bodyweight' },

  // Back - Lats (vertical pulling)
  { name: 'Pull-up', category: 'Lats', defaultUnit: 'bodyweight' },
  { name: 'Lat Pulldown', category: 'Lats' },

  // Back - Upper Back (horizontal pulling)
  { name: 'Bent-over Row', category: 'Upper Back' },
  { name: 'Seated Cable Row', category: 'Upper Back' },
  { name: 'T-Bar Row', category: 'Upper Back' },

  // Back - Lower Back (hip hinge)
  { name: 'Deadlift', category: 'Lower Back' },
  { name: 'Romanian Deadlift', category: 'Lower Back' },
  { name: 'Good Morning', category: 'Lower Back' },
  { name: 'Back Extension', category: 'Lower Back' },

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
  { name: 'Plank', category: 'Core', defaultUnit: 'seconds' },
  { name: 'Leg Raise', category: 'Core' },
  { name: 'Russian Twist', category: 'Core' },
  { name: 'Ab Rollout', category: 'Core' },

  // Calisthenics - Chest
  { name: 'Diamond Push-up', category: 'Chest', defaultUnit: 'bodyweight' },
  { name: 'Archer Push-up', category: 'Chest', defaultUnit: 'bodyweight' },
  { name: 'Decline Push-up', category: 'Chest', defaultUnit: 'bodyweight' },
  { name: 'Wide Push-up', category: 'Chest', defaultUnit: 'bodyweight' },

  // Calisthenics - Back (Lats)
  { name: 'Chin-up', category: 'Lats', defaultUnit: 'bodyweight' },
  { name: 'Inverted Row', category: 'Upper Back', defaultUnit: 'bodyweight' },
  { name: 'Australian Pull-up', category: 'Upper Back', defaultUnit: 'bodyweight' },
  { name: 'Negative Pull-up', category: 'Lats', defaultUnit: 'bodyweight' },

  // Calisthenics - Legs
  { name: 'Pistol Squat', category: 'Legs', defaultUnit: 'bodyweight' },
  { name: 'Bulgarian Split Squat', category: 'Legs', defaultUnit: 'bodyweight' },
  { name: 'Nordic Curl', category: 'Legs', defaultUnit: 'bodyweight' },
  { name: 'Box Jump', category: 'Legs', defaultUnit: 'reps-only' },
  { name: 'Jump Squat', category: 'Legs', defaultUnit: 'reps-only' },
  { name: 'Wall Sit', category: 'Legs', defaultUnit: 'seconds' },

  // Calisthenics - Core
  { name: 'L-Sit', category: 'Core', defaultUnit: 'seconds' },
  { name: 'Hollow Body Hold', category: 'Core', defaultUnit: 'seconds' },
  { name: 'Dragon Flag', category: 'Core', defaultUnit: 'reps-only' },
  { name: 'Hanging Leg Raise', category: 'Core', defaultUnit: 'reps-only' },
  { name: 'Dead Bug', category: 'Core', defaultUnit: 'reps-only' },
  { name: 'Bird Dog', category: 'Core', defaultUnit: 'reps-only' },

  // Calisthenics - Upper Body Skills
  { name: 'Muscle-up', category: 'Full Body', defaultUnit: 'bodyweight' },
  { name: 'Handstand Push-up', category: 'Shoulders', defaultUnit: 'bodyweight' },
  { name: 'Handstand Hold', category: 'Shoulders', defaultUnit: 'seconds' },
  { name: 'Pike Push-up', category: 'Shoulders', defaultUnit: 'bodyweight' },
];

// Cardio activities (for quick logging)
export const cardioActivities: Omit<Exercise, 'id'>[] = [
  { name: 'Run', category: 'Run', isCardioActivity: true },
  { name: 'Walk', category: 'Walk', isCardioActivity: true },
  { name: 'Cycle', category: 'Cycle', isCardioActivity: true },
  { name: 'HIIT Session', category: 'HIIT', isCardioActivity: true },
  { name: 'Treadmill Run', category: 'Run', isCardioActivity: true },
  { name: 'Outdoor Run', category: 'Run', isCardioActivity: true },
  { name: 'Stationary Bike', category: 'Cycle', isCardioActivity: true },
];
