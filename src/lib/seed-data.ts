
import type { Exercise } from './types';

// Omit 'id' because Firestore will generate it automatically
export const seedExercises: Omit<Exercise, 'id'>[] = [
  // Chest
  { name: 'Barbell Bench Press', category: 'Chest', targetMuscles: ['Chest'] },
  { name: 'Dumbbell Bench Press', category: 'Chest', targetMuscles: ['Chest'] },
  { name: 'Incline Dumbbell Press', category: 'Chest', targetMuscles: ['Chest', 'Front Delts'] },
  { name: 'Chest Fly', category: 'Chest', targetMuscles: ['Chest'] },
  { name: 'Push-up', category: 'Chest', defaultUnit: 'bodyweight', targetMuscles: ['Chest', 'Triceps', 'Front Delts'] },
  { name: 'Dip', category: 'Chest', defaultUnit: 'bodyweight', targetMuscles: ['Chest', 'Triceps', 'Front Delts'] },

  // Back - Lats (vertical pulling)
  { name: 'Pull-up', category: 'Lats', defaultUnit: 'bodyweight', targetMuscles: ['Lats', 'Biceps', 'Rhomboids'] },
  { name: 'Lat Pulldown', category: 'Lats', targetMuscles: ['Lats', 'Biceps', 'Rhomboids'] },

  // Back - Upper Back (horizontal pulling)
  { name: 'Bent-over Row', category: 'Upper Back', targetMuscles: ['Lats', 'Rhomboids', 'Traps'] },
  { name: 'Seated Cable Row', category: 'Upper Back', targetMuscles: ['Lats', 'Rhomboids', 'Traps'] },
  { name: 'T-Bar Row', category: 'Upper Back', targetMuscles: ['Lats', 'Rhomboids', 'Traps'] },

  // Back - Lower Back (hip hinge)
  { name: 'Deadlift', category: 'Lower Back', targetMuscles: ['Lower Back', 'Glutes', 'Hamstrings'] },
  { name: 'Romanian Deadlift', category: 'Lower Back', targetMuscles: ['Hamstrings', 'Glutes', 'Lower Back'] },
  { name: 'Good Morning', category: 'Lower Back', targetMuscles: ['Lower Back', 'Hamstrings', 'Glutes'] },
  { name: 'Back Extension', category: 'Lower Back', targetMuscles: ['Lower Back', 'Glutes'] },

  // Legs - Quads
  { name: 'Barbell Squat', category: 'Legs', targetMuscles: ['Quads', 'Glutes', 'Hamstrings'] },
  { name: 'Goblet Squat', category: 'Legs', targetMuscles: ['Quads', 'Glutes'] },
  { name: 'Lunge', category: 'Legs', targetMuscles: ['Quads', 'Glutes', 'Hamstrings'] },
  { name: 'Leg Press', category: 'Legs', targetMuscles: ['Quads', 'Glutes'] },
  { name: 'Leg Extension', category: 'Legs', targetMuscles: ['Quads'] },
  { name: 'Hamstring Curl', category: 'Legs', targetMuscles: ['Hamstrings'] },
  { name: 'Calf Raise', category: 'Legs', targetMuscles: ['Calves'] },

  // Shoulders
  { name: 'Overhead Press', category: 'Shoulders', targetMuscles: ['Front Delts', 'Side Delts', 'Triceps'] },
  { name: 'Arnold Press', category: 'Shoulders', targetMuscles: ['Front Delts', 'Side Delts'] },
  { name: 'Lateral Raise', category: 'Shoulders', targetMuscles: ['Side Delts'] },
  { name: 'Front Raise', category: 'Shoulders', targetMuscles: ['Front Delts'] },
  { name: 'Face Pull', category: 'Shoulders', targetMuscles: ['Rear Delts', 'Rhomboids', 'Traps'] },
  { name: 'Shrug', category: 'Shoulders', targetMuscles: ['Traps'] },

  // Arms - Biceps
  { name: 'Bicep Curl', category: 'Arms', targetMuscles: ['Biceps'] },
  { name: 'Hammer Curl', category: 'Arms', targetMuscles: ['Biceps', 'Forearms'] },
  { name: 'Preacher Curl', category: 'Arms', targetMuscles: ['Biceps'] },

  // Arms - Triceps
  { name: 'Triceps Pushdown', category: 'Arms', targetMuscles: ['Triceps'] },
  { name: 'Skull Crusher', category: 'Arms', targetMuscles: ['Triceps'] },
  { name: 'Overhead Triceps Extension', category: 'Arms', targetMuscles: ['Triceps'] },

  // Core
  { name: 'Crunch', category: 'Core', targetMuscles: ['Abs'] },
  { name: 'Plank', category: 'Core', defaultUnit: 'seconds', targetMuscles: ['Abs', 'Obliques'] },
  { name: 'Leg Raise', category: 'Core', targetMuscles: ['Abs'] },
  { name: 'Russian Twist', category: 'Core', targetMuscles: ['Obliques', 'Abs'] },
  { name: 'Ab Rollout', category: 'Core', targetMuscles: ['Abs'] },

  // Calisthenics - Chest
  { name: 'Diamond Push-up', category: 'Chest', defaultUnit: 'bodyweight', targetMuscles: ['Chest', 'Triceps'] },
  { name: 'Archer Push-up', category: 'Chest', defaultUnit: 'bodyweight', targetMuscles: ['Chest', 'Triceps'] },
  { name: 'Decline Push-up', category: 'Chest', defaultUnit: 'bodyweight', targetMuscles: ['Chest', 'Front Delts'] },
  { name: 'Wide Push-up', category: 'Chest', defaultUnit: 'bodyweight', targetMuscles: ['Chest'] },

  // Calisthenics - Back (Lats)
  { name: 'Chin-up', category: 'Lats', defaultUnit: 'bodyweight', targetMuscles: ['Lats', 'Biceps'] },
  { name: 'Inverted Row', category: 'Upper Back', defaultUnit: 'bodyweight', targetMuscles: ['Lats', 'Rhomboids', 'Rear Delts'] },
  { name: 'Australian Pull-up', category: 'Upper Back', defaultUnit: 'bodyweight', targetMuscles: ['Lats', 'Rhomboids'] },
  { name: 'Negative Pull-up', category: 'Lats', defaultUnit: 'bodyweight', targetMuscles: ['Lats', 'Biceps'] },

  // Calisthenics - Legs
  { name: 'Pistol Squat', category: 'Legs', defaultUnit: 'bodyweight', targetMuscles: ['Quads', 'Glutes'] },
  { name: 'Bulgarian Split Squat', category: 'Legs', defaultUnit: 'bodyweight', targetMuscles: ['Quads', 'Glutes', 'Hamstrings'] },
  { name: 'Nordic Curl', category: 'Legs', defaultUnit: 'bodyweight', targetMuscles: ['Hamstrings'] },
  { name: 'Box Jump', category: 'Legs', defaultUnit: 'reps-only', targetMuscles: ['Quads', 'Glutes', 'Calves'] },
  { name: 'Jump Squat', category: 'Legs', defaultUnit: 'reps-only', targetMuscles: ['Quads', 'Glutes'] },
  { name: 'Wall Sit', category: 'Legs', defaultUnit: 'seconds', targetMuscles: ['Quads'] },

  // Calisthenics - Core
  { name: 'L-Sit', category: 'Core', defaultUnit: 'seconds', targetMuscles: ['Abs', 'Hip Flexors'] },
  { name: 'Hollow Body Hold', category: 'Core', defaultUnit: 'seconds', targetMuscles: ['Abs'] },
  { name: 'Dragon Flag', category: 'Core', defaultUnit: 'reps-only', targetMuscles: ['Abs', 'Obliques'] },
  { name: 'Hanging Leg Raise', category: 'Core', defaultUnit: 'reps-only', targetMuscles: ['Abs', 'Hip Flexors'] },
  { name: 'Dead Bug', category: 'Core', defaultUnit: 'reps-only', targetMuscles: ['Abs'] },
  { name: 'Bird Dog', category: 'Core', defaultUnit: 'reps-only', targetMuscles: ['Abs', 'Lower Back'] },

  // Calisthenics - Upper Body Skills
  { name: 'Muscle-up', category: 'Full Body', defaultUnit: 'bodyweight', targetMuscles: ['Lats', 'Chest', 'Triceps'] },
  { name: 'Handstand Push-up', category: 'Shoulders', defaultUnit: 'bodyweight', targetMuscles: ['Front Delts', 'Triceps'] },
  { name: 'Handstand Hold', category: 'Shoulders', defaultUnit: 'seconds', targetMuscles: ['Front Delts', 'Traps'] },
  { name: 'Pike Push-up', category: 'Shoulders', defaultUnit: 'bodyweight', targetMuscles: ['Front Delts', 'Triceps'] },
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
