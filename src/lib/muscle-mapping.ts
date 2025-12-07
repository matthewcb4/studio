export const categoryToMuscleGroup: Record<string, string[]> = {
    'Chest': ['chest', 'shoulders_front', 'triceps'],
    'Back': ['lats', 'traps', 'biceps', 'back_lower'],
    'Shoulders': ['shoulders_front', 'shoulders_back', 'triceps'],
    'Legs': ['quads', 'glutes', 'hamstrings', 'calves'],
    'Arms': ['biceps', 'triceps'],
    'Biceps': ['biceps'],
    'Triceps': ['triceps'],
    'Core': ['abs'],
    'Full Body': ['chest', 'lats', 'traps', 'shoulders_front', 'shoulders_back', 'quads', 'glutes', 'hamstrings', 'biceps', 'triceps', 'abs'],
    'Upper Body': ['chest', 'lats', 'traps', 'shoulders_front', 'shoulders_back', 'biceps', 'triceps'],
    'Lower Body': ['quads', 'glutes', 'hamstrings', 'calves', 'abs'],
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
