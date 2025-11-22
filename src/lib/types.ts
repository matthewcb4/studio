
export type Exercise = {
  id: string;
  name: string;
  category?: string;
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
  reps: string; // e.g., "8-12"
  unit: 'reps' | 'seconds' | 'bodyweight'; // The unit for the 'reps' field value
  supersetId: string; // Used to group exercises into supersets
};

export type CustomWorkout = {
  id: string;
  userId: string;
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
};

export type LoggedSet = {
  reps?: number;
  weight?: number;
  duration?: number; // Duration in seconds
};

export type LoggedExercise = {
  exerciseId: string;
  exerciseName: string;
  sets: LoggedSet[];
};

export type WorkoutLog = {
  id: string;
  userId: string;
  workoutName: string;
  date: string; // ISO string
  duration: string; // e.g. "45 min"
  exercises: LoggedExercise[];
  volume: number;
  rating?: number;
};

export type UserEquipment = {
  id: string;
  userId: string;
  name: string;
};

export type UserProfile = {
    id: string;
    targetWeight?: number;
    strengthGoal?: string;
    muscleGoal?: string;
    fatLossGoal?: string;
    biologicalSex?: 'Male' | 'Female';
    lastAiWorkoutDate?: string; // ISO string
    hasCompletedOnboarding?: boolean;
    todaysAiWorkout?: object;
}

export type ProgressLog = {
  id: string;
  userId: string;
  date: string; // ISO string
  weight: number;
};

    