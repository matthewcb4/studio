/**
 * Workout Program Definitions
 * 
 * These are the starter programs available in the app.
 * Programs are stored as static data here, but could be moved to Firestore
 * for dynamic updates in the future.
 */

import type { WorkoutProgram } from './types';

// Helper to generate a unique ID for programs
const generateProgramId = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

/**
 * 4-Week Strength Starter (FREE)
 * A balanced full-body foundation program for beginners
 */
const strengthStarter: WorkoutProgram = {
    id: 'strength-starter-4week',
    name: '4-Week Strength Starter',
    description: 'Build a solid foundation with this beginner-friendly program. Perfect for those new to strength training or returning after a break. Focus on compound movements, proper form, and progressive overload basics.',
    shortDescription: 'Build your foundation with balanced full-body training',
    durationWeeks: 4,
    daysPerWeek: 3,
    price: 0, // FREE
    productId: 'program_strength_starter_free',
    icon: '🏋️',
    difficulty: 'beginner',
    primaryMuscles: ['chest', 'lats', 'quads', 'glutes'],
    secondaryMuscles: ['shoulders_front', 'biceps', 'triceps', 'hamstrings', 'abs'],
    muscleEmphasis: {
        chest: 0.2,
        lats: 0.2,
        quads: 0.2,
        glutes: 0.15,
        shoulders_front: 0.1,
        biceps: 0.05,
        triceps: 0.05,
        abs: 0.05,
    },
    weeklyProgression: [
        {
            week: 1,
            phase: 'Foundation',
            intensityModifier: 'standard',
            volumeMultiplier: 1.0,
            focusNotes: 'Focus on learning proper form. Keep weights moderate. Master the basic movement patterns.',
        },
        {
            week: 2,
            phase: 'Foundation',
            intensityModifier: 'standard',
            volumeMultiplier: 1.0,
            focusNotes: 'Continue perfecting form. Start to increase weights slightly where comfortable.',
        },
        {
            week: 3,
            phase: 'Building',
            intensityModifier: 'high',
            volumeMultiplier: 1.1,
            focusNotes: 'Push a little harder. Add weight or reps. Time to challenge yourself.',
        },
        {
            week: 4,
            phase: 'Testing',
            intensityModifier: 'high',
            volumeMultiplier: 1.15,
            focusNotes: 'Final week push! Test your new strength. See how far you\'ve come.',
        },
    ],
    tags: ['beginner', 'full-body', 'foundation', 'free'],
    isActive: true,
    createdAt: new Date().toISOString(),
};

/**
 * 6-Week Superman Chest
 * Chest-focused program for building an impressive chest
 */
const supermanChest: WorkoutProgram = {
    id: 'superman-chest-6week',
    name: '6-Week Superman Chest',
    description: 'Transform your chest with this intensive 6-week program. Emphasizes chest development from all angles with strategic shoulder and tricep work to support your pressing power. Includes progressive overload and varied rep ranges for maximum growth.',
    shortDescription: 'Build an impressive chest with focused intensity',
    durationWeeks: 6,
    daysPerWeek: 4,
    price: 99, // $0.99
    productId: 'program_superman_chest',
    icon: '🦸',
    difficulty: 'intermediate',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['shoulders_front', 'triceps', 'shoulders_side'],
    muscleEmphasis: {
        chest: 0.60,
        shoulders_front: 0.15,
        triceps: 0.15,
        shoulders_side: 0.10,
    },
    weeklyProgression: [
        {
            week: 1,
            phase: 'Foundation',
            intensityModifier: 'standard',
            volumeMultiplier: 1.0,
            focusNotes: 'Establish your baseline. Focus on mind-muscle connection with the chest. Perfect your pressing form.',
        },
        {
            week: 2,
            phase: 'Foundation',
            intensityModifier: 'standard',
            volumeMultiplier: 1.05,
            focusNotes: 'Slight volume increase. Start incorporating pause reps at the bottom of presses.',
        },
        {
            week: 3,
            phase: 'Volume',
            intensityModifier: 'high',
            volumeMultiplier: 1.15,
            focusNotes: 'Volume phase begins. More sets, controlled tempo. Feel the chest working on every rep.',
        },
        {
            week: 4,
            phase: 'Volume',
            intensityModifier: 'high',
            volumeMultiplier: 1.2,
            focusNotes: 'Peak volume week. Push through. Include drop sets on isolation movements.',
        },
        {
            week: 5,
            phase: 'Intensity',
            intensityModifier: 'brutal',
            volumeMultiplier: 1.1,
            focusNotes: 'Intensity phase. Heavier weights, lower reps on compounds. Giant sets on accessories.',
        },
        {
            week: 6,
            phase: 'Peak',
            intensityModifier: 'brutal',
            volumeMultiplier: 1.0,
            focusNotes: 'Final week! Test your new chest strength. Go for PRs on bench press.',
        },
    ],
    tags: ['chest', 'muscle-gain', 'intermediate', 'upper-body'],
    isActive: true,
    createdAt: new Date().toISOString(),
};

/**
 * 6-Week Six-Pack Shredder
 * Core-focused program with fat loss elements
 */
const sixPackShredder: WorkoutProgram = {
    id: 'sixpack-shredder-6week',
    name: '6-Week Six-Pack Shredder',
    description: 'Sculpt your core and reveal those abs with this comprehensive 6-week program. Combines targeted core work with full-body training and cardio recommendations for maximum fat burning. Includes HIIT integration for accelerated results.',
    shortDescription: 'Sculpt your core and burn fat for visible abs',
    durationWeeks: 6,
    daysPerWeek: 5,
    price: 99, // $0.99
    productId: 'program_sixpack_shredder',
    icon: '🔥',
    difficulty: 'intermediate',
    primaryMuscles: ['abs', 'obliques'],
    secondaryMuscles: ['lower_back', 'quads', 'glutes', 'chest', 'lats'],
    muscleEmphasis: {
        abs: 0.40,
        obliques: 0.15,
        lower_back: 0.10,
        quads: 0.10,
        glutes: 0.10,
        chest: 0.075,
        lats: 0.075,
    },
    weeklyProgression: [
        {
            week: 1,
            phase: 'Activation',
            intensityModifier: 'standard',
            volumeMultiplier: 1.0,
            focusNotes: 'Wake up the core. Focus on proper bracing and breathing. Add 2 cardio sessions this week.',
        },
        {
            week: 2,
            phase: 'Building',
            intensityModifier: 'standard',
            volumeMultiplier: 1.1,
            focusNotes: 'Increase core volume. Add weighted exercises. Include HIIT after lifting sessions.',
        },
        {
            week: 3,
            phase: 'Intensify',
            intensityModifier: 'high',
            volumeMultiplier: 1.2,
            focusNotes: 'Ramp up intensity. Supersets for abs. 3 cardio sessions minimum.',
        },
        {
            week: 4,
            phase: 'Shred',
            intensityModifier: 'high',
            volumeMultiplier: 1.25,
            focusNotes: 'Peak training phase. Giant sets for core. Daily movement goal: 10k steps.',
        },
        {
            week: 5,
            phase: 'Shred',
            intensityModifier: 'brutal',
            volumeMultiplier: 1.2,
            focusNotes: 'Maintain intensity. Focus on muscle definition. Increase cardio frequency.',
        },
        {
            week: 6,
            phase: 'Reveal',
            intensityModifier: 'high',
            volumeMultiplier: 1.0,
            focusNotes: 'Final reveal week. Slightly reduced volume, maintained intensity. Show off your work!',
        },
    ],
    tags: ['core', 'abs', 'fat-loss', 'hiit', 'cardio'],
    isActive: true,
    createdAt: new Date().toISOString(),
};

/**
 * 6-Week Arm Blaster
 * Biceps and triceps focused program
 */
const armBlaster: WorkoutProgram = {
    id: 'arm-blaster-6week',
    name: '6-Week Arm Blaster',
    description: 'Add serious size to your arms with this dedicated 6-week program. Strategic focus on biceps and triceps with proper recovery and compound support work. Includes specialized techniques like 21s, drop sets, and blood flow restriction training concepts.',
    shortDescription: 'Build bigger, stronger arms with focused training',
    durationWeeks: 6,
    daysPerWeek: 4,
    price: 99, // $0.99
    productId: 'program_arm_blaster',
    icon: '💪',
    difficulty: 'intermediate',
    primaryMuscles: ['biceps', 'triceps'],
    secondaryMuscles: ['forearms', 'shoulders_front', 'chest', 'lats'],
    muscleEmphasis: {
        biceps: 0.35,
        triceps: 0.35,
        forearms: 0.10,
        shoulders_front: 0.07,
        chest: 0.065,
        lats: 0.065,
    },
    weeklyProgression: [
        {
            week: 1,
            phase: 'Prep',
            intensityModifier: 'standard',
            volumeMultiplier: 1.0,
            focusNotes: 'Prepare the arms for growth. Focus on full range of motion and controlled negatives.',
        },
        {
            week: 2,
            phase: 'Volume',
            intensityModifier: 'standard',
            volumeMultiplier: 1.1,
            focusNotes: 'Increase volume. Add arm-specific supersets. Biceps + triceps paired work.',
        },
        {
            week: 3,
            phase: 'Volume',
            intensityModifier: 'high',
            volumeMultiplier: 1.2,
            focusNotes: 'Peak volume phase. Include 21s on curls. Tricep pushdowns to failure.',
        },
        {
            week: 4,
            phase: 'Intensity',
            intensityModifier: 'high',
            volumeMultiplier: 1.15,
            focusNotes: 'Shift to intensity. Heavier weights, drop sets on final exercises.',
        },
        {
            week: 5,
            phase: 'Pump',
            intensityModifier: 'brutal',
            volumeMultiplier: 1.1,
            focusNotes: 'Blood flow focus. Higher reps, constant tension. Chase the pump!',
        },
        {
            week: 6,
            phase: 'Peak',
            intensityModifier: 'brutal',
            volumeMultiplier: 1.0,
            focusNotes: 'Final week. Test your arm strength. Measure your progress!',
        },
    ],
    tags: ['arms', 'biceps', 'triceps', 'muscle-gain', 'upper-body'],
    isActive: true,
    createdAt: new Date().toISOString(),
};

/**
 * 4-Week Pull-Up Domination
 * Increase your pull-up count with progressive training
 */
const pullUpDomination: WorkoutProgram = {
    id: 'pullup-domination-4week',
    name: '4-Week Pull-Up Domination',
    description: 'Master the pull-up and dramatically increase your rep count. This progressive program builds the strength, endurance, and technique needed for impressive pull-up performance. Includes assisted variations, negatives, and accessory work.',
    shortDescription: 'Increase your pull-up count with progressive training',
    durationWeeks: 4,
    daysPerWeek: 4,
    price: 99, // $0.99
    productId: 'program_pullup_domination',
    icon: '🏆',
    difficulty: 'intermediate',
    primaryMuscles: ['lats', 'biceps'],
    secondaryMuscles: ['traps', 'forearms', 'shoulders_back', 'abs'],
    muscleEmphasis: {
        lats: 0.40,
        biceps: 0.25,
        traps: 0.10,
        forearms: 0.10,
        shoulders_back: 0.10,
        abs: 0.05,
    },
    weeklyProgression: [
        {
            week: 1,
            phase: 'Foundation',
            intensityModifier: 'standard',
            volumeMultiplier: 1.0,
            focusNotes: 'Establish baseline pull-up count. Focus on proper form and controlled negatives.',
        },
        {
            week: 2,
            phase: 'Frequency',
            intensityModifier: 'standard',
            volumeMultiplier: 1.1,
            focusNotes: 'Greasing the groove - multiple smaller sets throughout workout. Build volume.',
        },
        {
            week: 3,
            phase: 'Strength',
            intensityModifier: 'high',
            volumeMultiplier: 1.2,
            focusNotes: 'Add weight or resistance. Focus on strength. Include pause reps at top.',
        },
        {
            week: 4,
            phase: 'Max Test',
            intensityModifier: 'high',
            volumeMultiplier: 1.0,
            focusNotes: 'Test your new max! Reduced volume, fresh for testing. Go for your PR!',
        },
    ],
    tags: ['pull-ups', 'back', 'bodyweight', 'strength', 'upper-body'],
    isActive: true,
    createdAt: new Date().toISOString(),
};

/**
 * 4-Week Booty Builder
 * Glute-focused program for a stronger, rounder posterior
 */
const bootyBuilder: WorkoutProgram = {
    id: 'booty-builder-4week',
    name: '4-Week Booty Builder',
    description: 'Sculpt and strengthen your glutes with this targeted 4-week program. Combines hip thrusts, squats, and isolation work with progressive overload for maximum glute development. Perfect for building that peach!',
    shortDescription: 'Sculpt and strengthen your glutes for maximum growth',
    durationWeeks: 4,
    daysPerWeek: 4,
    price: 99, // $0.99
    productId: 'program_booty_builder',
    icon: '🍑',
    difficulty: 'intermediate',
    primaryMuscles: ['glutes'],
    secondaryMuscles: ['hamstrings', 'quads', 'abs', 'lower_back'],
    muscleEmphasis: {
        glutes: 0.55,
        hamstrings: 0.20,
        quads: 0.10,
        abs: 0.08,
        lower_back: 0.07,
    },
    weeklyProgression: [
        {
            week: 1,
            phase: 'Activation',
            intensityModifier: 'standard',
            volumeMultiplier: 1.0,
            focusNotes: 'Wake up the glutes! Focus on mind-muscle connection. Activation drills before each session.',
        },
        {
            week: 2,
            phase: 'Volume',
            intensityModifier: 'standard',
            volumeMultiplier: 1.15,
            focusNotes: 'Build volume with hip thrusts and Romanian deadlifts. Feel the burn!',
        },
        {
            week: 3,
            phase: 'Overload',
            intensityModifier: 'high',
            volumeMultiplier: 1.2,
            focusNotes: 'Progressive overload phase. Increase weight on compound movements.',
        },
        {
            week: 4,
            phase: 'Peak Growth',
            intensityModifier: 'high',
            volumeMultiplier: 1.1,
            focusNotes: 'Peak stimulation. Include pause reps and squeeze at the top. Build that booty!',
        },
    ],
    tags: ['glutes', 'booty', 'lower-body', 'muscle-gain', 'women'],
    isActive: true,
    createdAt: new Date().toISOString(),
};

/**
 * 4-Week Athletic Power
 * Full-body functional training for explosive performance
 */
const athleticPower: WorkoutProgram = {
    id: 'athletic-power-4week',
    name: '4-Week Athletic Power',
    description: 'Build explosive power and athletic performance with this full-body functional training program. Combines compound movements, plyometrics, and power exercises to make you stronger, faster, and more explosive.',
    shortDescription: 'Build explosive power with functional training',
    durationWeeks: 4,
    daysPerWeek: 4,
    price: 99, // $0.99
    productId: 'program_athletic_power',
    icon: '⚡',
    difficulty: 'intermediate',
    primaryMuscles: ['quads', 'glutes', 'chest', 'lats'],
    secondaryMuscles: ['shoulders_front', 'hamstrings', 'abs', 'calves', 'triceps'],
    muscleEmphasis: {
        quads: 0.20,
        glutes: 0.18,
        chest: 0.15,
        lats: 0.15,
        shoulders_front: 0.10,
        hamstrings: 0.08,
        abs: 0.07,
        calves: 0.04,
        triceps: 0.03,
    },
    weeklyProgression: [
        {
            week: 1,
            phase: 'Foundation',
            intensityModifier: 'standard',
            volumeMultiplier: 1.0,
            focusNotes: 'Build movement foundation. Focus on form with compound lifts. Introduce light plyos.',
        },
        {
            week: 2,
            phase: 'Power',
            intensityModifier: 'standard',
            volumeMultiplier: 1.1,
            focusNotes: 'Add explosive movements. Power cleans, jump squats. Focus on speed and power.',
        },
        {
            week: 3,
            phase: 'Intensity',
            intensityModifier: 'high',
            volumeMultiplier: 1.15,
            focusNotes: 'Increase intensity. Heavier compound lifts. Explosive finishers each session.',
        },
        {
            week: 4,
            phase: 'Peak Performance',
            intensityModifier: 'brutal',
            volumeMultiplier: 1.0,
            focusNotes: 'Test your athletic gains! Combine strength and power. Feel the difference!',
        },
    ],
    tags: ['athletic', 'power', 'full-body', 'functional', 'plyometrics', 'explosive'],
    isActive: true,
    createdAt: new Date().toISOString(),
};

/**
 * 21-Day New Year Challenge (FREE)
 * A beginner-friendly full-body program to kickstart 2026
 */
const newYearChallenge: WorkoutProgram = {
    id: 'new-year-challenge-21day',
    name: '21-Day New Year Challenge',
    description: 'Start 2026 strong with this beginner-friendly 3-week challenge! Build lasting fitness habits with progressive full-body workouts designed to get you moving consistently. Perfect for New Year\'s resolutions - no gym required, just commitment!',
    shortDescription: 'Kickstart 2026 with a 21-day fitness transformation',
    durationWeeks: 3,
    daysPerWeek: 4,
    price: 0, // FREE
    productId: 'program_new_year_challenge_free',
    icon: '🎆',
    difficulty: 'beginner',
    primaryMuscles: ['chest', 'lats', 'quads', 'glutes'],
    secondaryMuscles: ['shoulders_front', 'biceps', 'triceps', 'hamstrings', 'abs', 'calves'],
    muscleEmphasis: {
        chest: 0.15,
        lats: 0.15,
        quads: 0.18,
        glutes: 0.15,
        shoulders_front: 0.08,
        biceps: 0.06,
        triceps: 0.06,
        hamstrings: 0.07,
        abs: 0.08,
        calves: 0.02,
    },
    weeklyProgression: [
        {
            week: 1,
            phase: 'Ignition',
            intensityModifier: 'standard',
            volumeMultiplier: 0.9,
            focusNotes: 'Week 1: Build the habit! Focus on showing up consistently. Light weights, learn the movements. You\'re laying the foundation for an amazing year.',
        },
        {
            week: 2,
            phase: 'Momentum',
            intensityModifier: 'standard',
            volumeMultiplier: 1.0,
            focusNotes: 'Week 2: You\'re building momentum! Add a bit more weight where comfortable. Challenge yourself while maintaining good form. You\'re halfway there!',
        },
        {
            week: 3,
            phase: 'New You',
            intensityModifier: 'high',
            volumeMultiplier: 1.1,
            focusNotes: 'Week 3: The final push! This is where transformation happens. Push a little harder each session. Finish strong and celebrate your achievement!',
        },
    ],
    tags: ['beginner', 'full-body', 'new-year', 'challenge', 'free', 'habit-building', '2026'],
    isActive: true,
    createdAt: new Date().toISOString(),
};

/**
 * All available programs
 */
export const WORKOUT_PROGRAMS: WorkoutProgram[] = [
    newYearChallenge, // Featured at top for New Year's campaign
    strengthStarter,
    supermanChest,
    sixPackShredder,
    armBlaster,
    pullUpDomination,
    bootyBuilder,
    athleticPower,
];

/**
 * Get all available programs
 */
export function getPrograms(): WorkoutProgram[] {
    return WORKOUT_PROGRAMS.filter(p => p.isActive);
}

/**
 * Get a program by ID
 */
export function getProgramById(id: string): WorkoutProgram | undefined {
    return WORKOUT_PROGRAMS.find(p => p.id === id);
}

/**
 * Get free programs
 */
export function getFreePrograms(): WorkoutProgram[] {
    return WORKOUT_PROGRAMS.filter(p => p.isActive && p.price === 0);
}

/**
 * Get paid programs
 */
export function getPaidPrograms(): WorkoutProgram[] {
    return WORKOUT_PROGRAMS.filter(p => p.isActive && p.price > 0);
}

/**
 * Get the current week's progression info for a program
 */
export function getWeekProgression(programId: string, week: number) {
    const program = getProgramById(programId);
    if (!program) return null;
    return program.weeklyProgression.find(w => w.week === week) || null;
}
