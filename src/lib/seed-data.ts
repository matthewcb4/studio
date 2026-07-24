
import type { Exercise } from './types';

// Omit 'id' because Firestore will generate it automatically
export const seedExercises: Omit<Exercise, 'id'>[] = [
  // Chest
  { name: 'Barbell Bench Press', category: 'Chest', targetMuscles: ['Chest'], equipment: ['Barbell', 'Bench Press'] },
  { name: 'Dumbbell Bench Press', category: 'Chest', targetMuscles: ['Chest'], equipment: ['Dumbbells'] },
  { name: 'Incline Dumbbell Press', category: 'Chest', targetMuscles: ['Chest', 'Front Delts'], equipment: ['Dumbbells', 'Adjustable Bench'] },
  { name: 'Chest Fly', category: 'Chest', targetMuscles: ['Chest'], equipment: ['Dumbbells'] },
  { name: 'Push-up', category: 'Chest', defaultUnit: 'bodyweight', targetMuscles: ['Chest', 'Triceps', 'Front Delts'], equipment: ['Bodyweight'] },
  { name: 'Dip', category: 'Chest', defaultUnit: 'bodyweight', targetMuscles: ['Chest', 'Triceps', 'Front Delts'], equipment: ['Bodyweight'] },

  // Back - Lats (vertical pulling)
  { name: 'Pull-up', category: 'Lats', defaultUnit: 'bodyweight', targetMuscles: ['Lats', 'Biceps', 'Rhomboids'], equipment: ['Pull-up Bar'] },
  { name: 'Lat Pulldown', category: 'Lats', targetMuscles: ['Lats', 'Biceps', 'Rhomboids'], equipment: ['Lat Pulldown'] },

  // Back - Upper Back (horizontal pulling)
  { name: 'Bent-over Row', category: 'Upper Back', targetMuscles: ['Lats', 'Rhomboids', 'Traps'], equipment: ['Barbell'] },
  { name: 'Seated Cable Row', category: 'Upper Back', targetMuscles: ['Lats', 'Rhomboids', 'Traps'], equipment: ['Cable Machine'] },
  { name: 'T-Bar Row', category: 'Upper Back', targetMuscles: ['Lats', 'Rhomboids', 'Traps'], equipment: ['Barbell'] },

  // Back - Lower Back (hip hinge)
  { name: 'Deadlift', category: 'Lower Back', targetMuscles: ['Lower Back', 'Glutes', 'Hamstrings'], equipment: ['Barbell'] },
  { name: 'Romanian Deadlift', category: 'Lower Back', targetMuscles: ['Hamstrings', 'Glutes', 'Lower Back'], equipment: ['Barbell'] },
  { name: 'Good Morning', category: 'Lower Back', targetMuscles: ['Lower Back', 'Hamstrings', 'Glutes'], equipment: ['Barbell'] },
  { name: 'Back Extension', category: 'Lower Back', targetMuscles: ['Lower Back', 'Glutes'], equipment: ['Bodyweight'] },

  // Legs - Quads
  { name: 'Barbell Squat', category: 'Legs', targetMuscles: ['Quads', 'Glutes', 'Hamstrings'], equipment: ['Barbell', 'Squat Rack'] },
  { name: 'Goblet Squat', category: 'Legs', targetMuscles: ['Quads', 'Glutes'], equipment: ['Dumbbells'] },
  { name: 'Lunge', category: 'Legs', targetMuscles: ['Quads', 'Glutes', 'Hamstrings'], equipment: ['Bodyweight'] },
  { name: 'Leg Press', category: 'Legs', targetMuscles: ['Quads', 'Glutes'], equipment: ['Leg Press'] },
  { name: 'Leg Extension', category: 'Legs', targetMuscles: ['Quads'], equipment: ['Cable Machine'] },
  { name: 'Hamstring Curl', category: 'Legs', targetMuscles: ['Hamstrings'], equipment: ['Cable Machine'] },
  { name: 'Calf Raise', category: 'Legs', targetMuscles: ['Calves'], equipment: ['Bodyweight'] },

  // Shoulders
  { name: 'Overhead Press', category: 'Shoulders', targetMuscles: ['Front Delts', 'Side Delts', 'Triceps'], equipment: ['Barbell'] },
  { name: 'Arnold Press', category: 'Shoulders', targetMuscles: ['Front Delts', 'Side Delts'], equipment: ['Dumbbells'] },
  { name: 'Lateral Raise', category: 'Shoulders', targetMuscles: ['Side Delts'], equipment: ['Dumbbells'] },
  { name: 'Front Raise', category: 'Shoulders', targetMuscles: ['Front Delts'], equipment: ['Dumbbells'] },
  { name: 'Face Pull', category: 'Shoulders', targetMuscles: ['Rear Delts', 'Rhomboids', 'Traps'], equipment: ['Cable Machine'] },
  { name: 'Shrug', category: 'Shoulders', targetMuscles: ['Traps'], equipment: ['Dumbbells'] },

  // Arms - Biceps
  { name: 'Bicep Curl', category: 'Arms', targetMuscles: ['Biceps'], equipment: ['Dumbbells'] },
  { name: 'Hammer Curl', category: 'Arms', targetMuscles: ['Biceps', 'Forearms'], equipment: ['Dumbbells'] },
  { name: 'Preacher Curl', category: 'Arms', targetMuscles: ['Biceps'], equipment: ['Dumbbells'] },

  // Arms - Triceps
  { name: 'Triceps Pushdown', category: 'Arms', targetMuscles: ['Triceps'], equipment: ['Cable Machine'] },
  { name: 'Skull Crusher', category: 'Arms', targetMuscles: ['Triceps'], equipment: ['Barbell'] },
  { name: 'Overhead Triceps Extension', category: 'Arms', targetMuscles: ['Triceps'], equipment: ['Dumbbells'] },

  // Core
  { name: 'Crunch', category: 'Core', targetMuscles: ['Abs'], equipment: ['Bodyweight'] },
  { name: 'Plank', category: 'Core', defaultUnit: 'seconds', targetMuscles: ['Abs', 'Obliques'], equipment: ['Bodyweight'] },
  { name: 'Leg Raise', category: 'Core', targetMuscles: ['Abs'], equipment: ['Bodyweight'] },
  { name: 'Russian Twist', category: 'Core', targetMuscles: ['Obliques', 'Abs'], equipment: ['Bodyweight'] },
  { name: 'Ab Rollout', category: 'Core', targetMuscles: ['Abs'], equipment: ['Bodyweight'] },

  // Calisthenics - Chest
  { name: 'Diamond Push-up', category: 'Chest', defaultUnit: 'bodyweight', targetMuscles: ['Chest', 'Triceps'], equipment: ['Bodyweight'] },
  { name: 'Archer Push-up', category: 'Chest', defaultUnit: 'bodyweight', targetMuscles: ['Chest', 'Triceps'], equipment: ['Bodyweight'] },
  { name: 'Decline Push-up', category: 'Chest', defaultUnit: 'bodyweight', targetMuscles: ['Chest', 'Front Delts'], equipment: ['Bodyweight'] },
  { name: 'Wide Push-up', category: 'Chest', defaultUnit: 'bodyweight', targetMuscles: ['Chest'], equipment: ['Bodyweight'] },

  // Calisthenics - Back (Lats)
  { name: 'Chin-up', category: 'Lats', defaultUnit: 'bodyweight', targetMuscles: ['Lats', 'Biceps'], equipment: ['Pull-up Bar'] },
  { name: 'Inverted Row', category: 'Upper Back', defaultUnit: 'bodyweight', targetMuscles: ['Lats', 'Rhomboids', 'Rear Delts'], equipment: ['Bodyweight'] },
  { name: 'Australian Pull-up', category: 'Upper Back', defaultUnit: 'bodyweight', targetMuscles: ['Lats', 'Rhomboids'], equipment: ['Bodyweight'] },
  { name: 'Negative Pull-up', category: 'Lats', defaultUnit: 'bodyweight', targetMuscles: ['Lats', 'Biceps'], equipment: ['Pull-up Bar'] },

  // Calisthenics - Legs
  { name: 'Pistol Squat', category: 'Legs', defaultUnit: 'bodyweight', targetMuscles: ['Quads', 'Glutes'], equipment: ['Bodyweight'] },
  { name: 'Bulgarian Split Squat', category: 'Legs', defaultUnit: 'bodyweight', targetMuscles: ['Quads', 'Glutes', 'Hamstrings'], equipment: ['Bodyweight'] },
  { name: 'Nordic Curl', category: 'Legs', defaultUnit: 'bodyweight', targetMuscles: ['Hamstrings'], equipment: ['Bodyweight'] },
  { name: 'Box Jump', category: 'Legs', defaultUnit: 'reps-only', targetMuscles: ['Quads', 'Glutes', 'Calves'], equipment: ['Bodyweight'] },
  { name: 'Jump Squat', category: 'Legs', defaultUnit: 'reps-only', targetMuscles: ['Quads', 'Glutes'], equipment: ['Bodyweight'] },
  { name: 'Wall Sit', category: 'Legs', defaultUnit: 'seconds', targetMuscles: ['Quads'], equipment: ['Bodyweight'] },

  // Calisthenics - Core
  { name: 'L-Sit', category: 'Core', defaultUnit: 'seconds', targetMuscles: ['Abs', 'Hip Flexors'], equipment: ['Bodyweight'] },
  { name: 'Hollow Body Hold', category: 'Core', defaultUnit: 'seconds', targetMuscles: ['Abs'], equipment: ['Bodyweight'] },
  { name: 'Dragon Flag', category: 'Core', defaultUnit: 'reps-only', targetMuscles: ['Abs', 'Obliques'], equipment: ['Bodyweight'] },
  { name: 'Hanging Leg Raise', category: 'Core', defaultUnit: 'reps-only', targetMuscles: ['Abs', 'Hip Flexors'], equipment: ['Pull-up Bar'] },
  { name: 'Dead Bug', category: 'Core', defaultUnit: 'reps-only', targetMuscles: ['Abs'], equipment: ['Bodyweight'] },
  { name: 'Bird Dog', category: 'Core', defaultUnit: 'reps-only', targetMuscles: ['Abs', 'Lower Back'], equipment: ['Bodyweight'] },

  // Calisthenics - Upper Body Skills
  { name: 'Muscle-up', category: 'Full Body', defaultUnit: 'bodyweight', targetMuscles: ['Lats', 'Chest', 'Triceps'], equipment: ['Pull-up Bar'] },
  { name: 'Handstand Push-up', category: 'Shoulders', defaultUnit: 'bodyweight', targetMuscles: ['Front Delts', 'Triceps'], equipment: ['Bodyweight'] },
  { name: 'Handstand Hold', category: 'Shoulders', defaultUnit: 'seconds', targetMuscles: ['Front Delts', 'Traps'], equipment: ['Bodyweight'] },
  { name: 'Pike Push-up', category: 'Shoulders', defaultUnit: 'bodyweight', targetMuscles: ['Front Delts', 'Triceps'], equipment: ['Bodyweight'] },
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
