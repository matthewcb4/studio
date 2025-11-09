export type Exercise = {
  id: string;
  name: string;
  category: string;
  videoId?: string | null;
};

export type WorkoutExercise = {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: string; // e.g., "8-10"
  videoId?: string | null;
};

export type ExerciseGroup = WorkoutExercise[];

export type CustomWorkout = {
  id: string;
  name: string;
  // Each inner array represents a group of exercises (a single exercise or a superset)
  exerciseGroups: ExerciseGroup[];
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
