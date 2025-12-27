export const categoryToMuscleGroup: Record<string, string[]> = {
    'Chest': ['chest', 'shoulders_front', 'triceps'],
    'Back': ['lats', 'traps', 'biceps', 'back_lower'],  // Legacy fallback
    'Lats': ['lats', 'biceps'],                         // Vertical pulling movements
    'Upper Back': ['traps', 'shoulders_back', 'lats'],  // Horizontal pulling, shrugs
    'Traps': ['traps', 'shoulders_back'],               // Shrugs, upright rows
    'Lower Back': ['back_lower', 'glutes', 'hamstrings'], // Hip hinge movements
    'Shoulders': ['shoulders_front', 'shoulders_back', 'triceps'],
    'Front Delts': ['shoulders_front', 'triceps'],      // Front raises, overhead press
    'Rear Delts': ['shoulders_back', 'traps'],          // Face pulls, reverse fly
    'Legs': ['quads', 'glutes', 'hamstrings', 'calves'],
    'Quads': ['quads'],                                 // Leg extensions, squats
    'Hamstrings': ['hamstrings', 'glutes'],             // Leg curls, RDLs
    'Glutes': ['glutes', 'hamstrings'],                 // Hip thrusts, glute bridges
    'Calves': ['calves'],                               // Calf raises
    'Arms': ['biceps', 'triceps'],
    'Biceps': ['biceps'],
    'Triceps': ['triceps'],
    'Core': ['abs'],
    'Abs': ['abs'],                                     // Crunches, leg raises
    'Obliques': ['abs'],                                // Russian twists, side planks
    'Full Body': ['chest', 'lats', 'traps', 'shoulders_front', 'shoulders_back', 'quads', 'glutes', 'hamstrings', 'biceps', 'triceps', 'abs'],
    'Upper Body': ['chest', 'lats', 'traps', 'shoulders_front', 'shoulders_back', 'biceps', 'triceps'],
    'Lower Body': ['quads', 'glutes', 'hamstrings', 'calves', 'abs'],


    // Cardio Activities
    'Run': ['quads', 'hamstrings', 'glutes', 'calves', 'abs'],
    'Walk': ['glutes', 'calves', 'abs'],
    'Cycle': ['quads', 'glutes', 'calves'],
    'HIIT': ['quads', 'glutes', 'hamstrings', 'abs', 'chest', 'shoulders_front'],
};

// Simplified mapping for the chart (groups sub-muscles into main categories)
export const muscleToChartGroup: Record<string, string> = {
    'chest': 'Chest',
    'lats': 'Back',
    'traps': 'Back',
    'back_lower': 'Back',
    'shoulders_front': 'Shoulders',
    'shoulders_back': 'Shoulders',
    'quads': 'Legs',
    'glutes': 'Legs',
    'hamstrings': 'Legs',
    'calves': 'Legs',
    'biceps': 'Arms',
    'triceps': 'Arms',
    'abs': 'Core',
};

// Intensity multipliers for cardio activities (relative to duration)
// These determine how much each muscle contributes to the heatmap for cardio sessions
export const cardioIntensityMultipliers: Record<string, Record<string, number>> = {
    'Run': { quads: 0.30, hamstrings: 0.25, glutes: 0.25, calves: 0.15, abs: 0.05 },
    'Walk': { glutes: 0.40, calves: 0.40, abs: 0.20 },
    'Cycle': { quads: 0.50, glutes: 0.30, calves: 0.20 },
    'HIIT': { quads: 0.20, glutes: 0.20, hamstrings: 0.15, abs: 0.15, chest: 0.15, shoulders_front: 0.15 },
};
