export type Exercise = {
  id: string;
  name: string;
  category: string;
};

export type WorkoutExercise = {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: string; // e.g., "8-10"
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
