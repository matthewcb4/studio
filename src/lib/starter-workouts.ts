// Starter workouts for new users
// These are created when the user completes onboarding

import type { CustomWorkout, WorkoutExercise } from '@/lib/types';

const generateId = () => `_${Math.random().toString(36).substr(2, 9)}`;

// Helper to create exercise entries
const createExercise = (
    exerciseId: string,
    exerciseName: string,
    sets: number,
    reps: string,
    unit: WorkoutExercise['unit'] = 'reps',
    supersetId?: string
): WorkoutExercise => ({
    id: generateId(),
    exerciseId,
    exerciseName,
    sets,
    reps,
    unit,
    supersetId: supersetId || generateId(),
});

export const getStarterWorkouts = (userId: string): Omit<CustomWorkout, 'id'>[] => {
    const now = new Date().toISOString();

    return [
        {
            userId,
            name: 'Full Body Starter',
            description: 'A beginner-friendly full body workout using only bodyweight. Perfect for getting started!',
            exercises: [
                createExercise('push-up', 'Push-up', 3, '8-12', 'reps'),
                createExercise('bodyweight-squat', 'Bodyweight Squat', 3, '12-15', 'reps'),
                createExercise('plank', 'Plank', 3, '30-45', 'seconds'),
                createExercise('superman', 'Superman', 3, '10-12', 'reps'),
                createExercise('glute-bridge', 'Glute Bridge', 3, '12-15', 'reps'),
            ],
            createdAt: now,
            updatedAt: now,
        },
        {
            userId,
            name: 'Upper Body Basics',
            description: 'Build upper body strength with these foundational exercises.',
            exercises: [
                createExercise('push-up', 'Push-up', 3, '10-12', 'reps'),
                createExercise('diamond-push-up', 'Diamond Push-up', 3, '6-10', 'reps'),
                createExercise('pike-push-up', 'Pike Push-up', 3, '8-10', 'reps'),
                createExercise('plank', 'Plank', 3, '45-60', 'seconds'),
            ],
            createdAt: now,
            updatedAt: now,
        },
        {
            userId,
            name: 'Lower Body Basics',
            description: 'Strengthen your legs and glutes with bodyweight exercises.',
            exercises: [
                createExercise('bodyweight-squat', 'Bodyweight Squat', 4, '15-20', 'reps'),
                createExercise('forward-lunge', 'Forward Lunge', 3, '12', 'reps'),
                createExercise('glute-bridge', 'Glute Bridge', 3, '15', 'reps'),
                createExercise('calf-raise', 'Calf Raise', 3, '20', 'reps'),
                createExercise('wall-sit', 'Wall Sit', 3, '30-45', 'seconds'),
            ],
            createdAt: now,
            updatedAt: now,
        },
        {
            userId,
            name: 'Quick Core',
            description: 'A focused core workout to build abdominal strength and stability.',
            exercises: [
                createExercise('plank', 'Plank', 3, '45-60', 'seconds'),
                createExercise('dead-bug', 'Dead Bug', 3, '10', 'reps'),
                createExercise('bicycle-crunch', 'Bicycle Crunch', 3, '20', 'reps'),
                createExercise('mountain-climber', 'Mountain Climber', 3, '30', 'seconds'),
            ],
            createdAt: now,
            updatedAt: now,
        },
    ];
};
