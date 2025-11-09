export type Exercise = {
  id: string;
  name: string;
  category: string;
  videoId?: string | null;
};

export type WorkoutExercise = {
  id: string; // Unique ID for this specific instance of an exercise in a workout
  exerciseId: string; // Refers to the master Exercise ID
  exerciseName: string;
  sets: number;
  reps: string; // e.g., "8-10"
  videoId?: string | null;
  supersetId: string; // Used to group exercises into supersets
};

export type CustomWorkout = {
  id: string;
  name: string;
  exercises: WorkoutExercise[];
};

export type LoggedSet = {
  reps: number;
  weight: number;
};

export type LoggedExercise = {
  exerciseId: string;
  exerciseName: string;
  sets: LoggedSet[];
};

export type WorkoutLog = {
  id: string;
  workoutName: string;
  date: string; // ISO string
  duration: string; // e.g. "45 min"
  exercises: LoggedExercise[];
  volume: number;
};

export type UserEquipment = {
  id: string;
  name: string;
};
