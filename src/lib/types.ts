
export type Exercise = {
  id: string;
  name: string;
  category?: string;
  activityType?: ActivityType;        // Defaults to 'resistance'
  isCardioActivity?: boolean;         // For run, walk, cycle pseudo-exercises
  defaultUnit?: 'reps' | 'seconds' | 'bodyweight' | 'reps-only';
};

export type UserExercisePreference = {
  id: string; // Corresponds to the master Exercise ID
  userId: string;
  videoId?: string | null;
}

export type WorkoutExercise = {
  id: string; // Unique ID for this specific instance of an exercise in a workout
  exerciseId: string; // Refers to the master Exercise ID
  exerciseName: string;
  sets: number;
  reps: string; // e.g., "8-12" or "30"
  unit: 'reps' | 'seconds' | 'bodyweight' | 'reps-only'; // The unit for the 'reps' field value
  supersetId: string; // Used to group exercises into supersets
};

export type CustomWorkout = {
  id: string;
  userId: string;
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
  createdAt?: string; // ISO string for creation date
  updatedAt?: string; // ISO string for last update date
  locationId?: string; // ID of the location this workout was created for
  locationName?: string; // Name of the location (denormalized for display)
};

export type LoggedSet = {
  reps?: number;
  weight?: number;
  duration?: number; // Duration in seconds
  type?: 'normal' | 'warmup' | 'drop' | 'failure';
};

export type LoggedExercise = {
  exerciseId: string;
  exerciseName: string;
  sets: LoggedSet[];
};

// Activity types supported by the app
export type ActivityType = 'resistance' | 'calisthenics' | 'run' | 'walk' | 'cycle' | 'hiit';

// Cardio-specific metrics
export type CardioMetrics = {
  distance?: number;           // in user's preferred unit
  distanceUnit?: 'mi' | 'km';  // miles or kilometers
  avgPace?: string;            // e.g., "9:45 /mi"
  avgHeartRate?: number;       // bpm
  incline?: number;            // percentage (for treadmill)
  elevation?: number;          // feet or meters (for outdoor/GPS)
  calories?: number;           // estimated calories burned
};

export type WorkoutLog = {
  id: string;
  userId: string;
  workoutName: string;
  date: string; // ISO string
  duration: string; // e.g. "45 min"
  activityType?: ActivityType;              // Defaults to 'resistance' if undefined
  exercises?: LoggedExercise[];             // Optional (not used for pure cardio)
  volume?: number;                          // Optional (not used for pure cardio)
  cardioMetrics?: CardioMetrics;            // Optional (only for cardio types)
  musclesWorked?: Record<string, number>;   // Pre-calculated muscle intensities
  rating?: number;
};

export type UserEquipment = {
  id: string;
  userId: string;
  name: string;
};

export type WorkoutLocation = {
  id: string;
  userId: string;
  name: string;                    // "Home", "YMCA Downtown", etc.
  equipment: string[];             // List of equipment names
  icon?: string;                   // Optional emoji: 🏠, 🏋️, etc.
  type: 'home' | 'gym' | 'other';  // Determines equipment input mode
  isDefault?: boolean;             // One location should be marked as default
  createdAt?: string;              // ISO string
};

export type UserProfile = {
  id: string;
  targetWeight?: number;
  weeklyWorkoutGoal?: number;
  weeklyCardioGoal?: number; // Weekly cardio goal in minutes
  weeklyDistanceGoal?: number; // Weekly distance goal in miles
  strengthGoal?: string;
  muscleGoal?: string;
  fatLossGoal?: string;
  availableEquipment?: string[];
  biologicalSex?: 'Male' | 'Female';
  lastAiWorkoutDate?: string; // YYYY-MM-DD string
  lastAiSuggestionDate?: string; // YYYY-MM-DD string
  hasCompletedOnboarding?: boolean;
  todaysAiWorkout?: object;
  todaysSuggestion?: object;

  // Gamification
  currentStreak?: number;
  longestStreak?: number;
  lastWorkoutDate?: string; // ISO string of last completed workout (any type)
  lifetimeVolume?: number;
  xp?: number;
  level?: number;

  // Workout Locations
  activeLocationId?: string; // ID of the currently selected workout location

  // Media preferences
  preferredMusicApp?: 'spotify' | 'apple-music' | 'youtube-music' | 'amazon-music' | 'pandora' | 'none';
}

export type ProgressLog = {
  id: string;
  userId: string;
  date: string; // ISO string
  weight: number;
};


export type PRType = 'max_weight' | 'max_volume' | 'best_1rm';

export type PRResult = {
  isPR: boolean;
  type: PRType;
  oldValue: number;
  newValue: number;
};
