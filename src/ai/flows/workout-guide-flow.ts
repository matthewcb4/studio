
'use server';
/**
 * @fileoverview A workout generation AI agent.
 *
 * - generateWorkout - A function that handles the workout generation process.
 * - GenerateWorkoutInput - The input type for the generateWorkout function.
 * - GenerateWorkoutOutput - The return type for the generateWorkout function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const WorkoutHistoryItemSchema = z.object({
  date: z.string().describe("The date of the past workout."),
  name: z.string().describe("The name of the past workout."),
  exercises: z.string().describe("A comma-separated list of exercises from the past workout."),
});

// Schema for available exercises from user's database
const AvailableExerciseSchema = z.object({
  name: z.string().describe("Name of the exercise."),
  category: z.string().describe("Broad category (e.g., Back, Chest, Legs)."),
  targetMuscles: z.array(z.string()).optional().describe("Specific muscles targeted (e.g., Lats, Traps, Quads)."),
  equipment: z.array(z.string()).optional().describe("Equipment required for this exercise (e.g., ['Dumbbells'])."),
});

// Active program context schema
const ActiveProgramSchema = z.object({
  name: z.string().describe("The name of the active program."),
  currentWeek: z.number().describe("The current week number (1-indexed)."),
  totalWeeks: z.number().describe("Total weeks in the program."),
  phase: z.string().describe("The current phase name (e.g., 'Foundation', 'Volume', 'Intensity')."),
  primaryMuscles: z.array(z.string()).describe("Primary muscles targeted by this program (e.g., Lats, Traps, Chest)."),
  intensityModifier: z.enum(['standard', 'high', 'brutal']).describe("The intensity level for this week."),
  focusNotes: z.string().describe("Coaching notes for the current week."),
}).optional();

const GenerateWorkoutInputSchema = z.object({
  availableEquipment: z.array(z.string()).describe("A list of available fitness equipment."),
  fitnessGoals: z.array(z.string()).describe("A list of the user's fitness goals (e.g., increase_max_lift, gain_overall_mass, reduce_body_fat)."),
  fitnessLevel: z.string().describe("The user's current fitness level (e.g., beginner, intermediate, advanced)."),
  workoutDuration: z.number().describe("The desired workout duration in minutes."),
  focusArea: z.array(z.string()).describe("A list of primary muscle groups or areas to focus on (e.g., Full Body, Upper Body, Lower Body, Core, Arms, Legs, Chest, Back, Shoulders, or specific muscles like Lats, Traps, Quads)."),
  supersetStrategy: z.string().describe("The user's preferred superset strategy. 'focused' means supersets should contain exercises for the SAME muscle group. 'mixed' means supersets can combine exercises for DIFFERENT muscle groups (e.g., antagonist or non-competing groups)."),
  workoutHistory: z.array(WorkoutHistoryItemSchema).optional().describe("A list of the user's recent workouts to avoid repetition."),
  intensityLevel: z.enum(['standard', 'high', 'brutal']).optional().describe("The intensity level for the workout. 'standard' is normal training. 'high' includes some advanced techniques. 'brutal' uses drop sets, giant sets, and other intense methods."),
  workoutType: z.enum(['resistance', 'calisthenics']).optional().describe("The type of workout to generate. 'resistance' uses weighted exercises (default). 'calisthenics' generates a pure bodyweight workout."),
  allowSupersets: z.boolean().optional().describe("Whether to allow grouping exercises into supersets, tri-sets, or giant sets. If false, each exercise is standalone."),
  availableExercises: z.array(AvailableExerciseSchema).optional().describe("A list of exercises from the user's database with their specific target muscles. PREFER these exercises when creating the workout."),
  activeProgram: ActiveProgramSchema.describe("Optional: The user's currently active workout program context."),
});
export type GenerateWorkoutInput = z.infer<typeof GenerateWorkoutInputSchema>;

const ExerciseSchema = z.object({
  name: z.string().describe("Name of the exercise."),
  category: z.string().describe("The primary muscle group targeted by this exercise (e.g., Chest, Back, Legs, Shoulders, Arms, Core)."),
  targetMuscles: z.array(z.string()).optional().describe("Specific muscles targeted by this exercise (e.g., Lats, Traps, Quads, Hamstrings). Be granular!"),
  sets: z.string().describe("Number of sets to perform, can be a range like '3-4'."),
  reps: z.string().describe("Number of repetitions per set (e.g., '8-12'), or duration in seconds for timed exercises (e.g., '30-60s')."),
  rest: z.string().describe("Rest time in seconds between sets."),
  supersetId: z.string().describe("Identifier to group exercises. Exercises with the same supersetId are performed back-to-back. Use 'superset_X', 'triset_X', or 'giant_X' for multi-exercise groups."),
  technique: z.string().optional().describe("Optional advanced technique like 'drop_set', 'pyramid', 'rest_pause', 'tempo_3-1-2', 'amrap', or 'mechanical_drop'."),
  notes: z.string().optional().describe("Optional coaching notes for the exercise, especially for advanced techniques."),
  equipment: z.array(z.string()).optional().describe("The equipment required for this exercise (e.g., ['Dumbbells']). Must be from the user's available equipment list."),
});

const GenerateWorkoutOutputSchema = z.object({
  workoutName: z.string().describe("A creative and fitting name for the generated workout routine."),
  description: z.string().describe("A brief description of the workout, its focus, and who it's for."),
  exercises: z.array(ExerciseSchema).describe("An array of exercises for the workout routine."),
  workoutStyle: z.string().optional().describe("The overall style of this workout (e.g., 'Strength Focus', 'Hypertrophy', 'Intensity Techniques', 'Conditioning')."),
});
export type GenerateWorkoutOutput = z.infer<typeof GenerateWorkoutOutputSchema>;

export async function generateWorkout(input: GenerateWorkoutInput): Promise<GenerateWorkoutOutput> {
  return workoutGuideFlow(input);
}

const prompt = ai.definePrompt({
  name: 'workoutGuidePrompt',
  input: { schema: GenerateWorkoutInputSchema },
  output: { schema: GenerateWorkoutOutputSchema },
  prompt: `You are an expert fitness coach with a creative personality. Your task is to create a personalized workout routine that keeps training fresh, challenging, and engaging. You're known for creating workouts that break plateaus and keep athletes motivated.

  **USER'S AVAILABLE EQUIPMENT (MANDATORY CONSTRAINT):**
  The user has access to ONLY these pieces of equipment:
  {{#each availableEquipment}}
  - {{{this}}}
  {{/each}}
  
  **CRITICAL EQUIPMENT CONSTRAINT:**
  Every exercise you include in the workout MUST be performable using only the equipment listed above.
  - If the user does not have access to "Barbell", you MUST NOT include any barbell exercises.
  - If the user does not have access to "Dumbbells", you MUST NOT include any dumbbell exercises.
  - If the user does not have access to "Cable Machine", you MUST NOT include any cable exercises.
  - If the user only has access to "Bodyweight", you MUST generate a pure bodyweight/calisthenics workout.

  **USER'S EXERCISE DATABASE (PREFER BUT CAN DYNAMICALLY EXTEND):**
  Here are the exercises currently in the user's database that match their selected focus area and equipment:
  {{#if availableExercises}}
    {{#each availableExercises}}
    - **{{name}}** ({{category}}){{#if targetMuscles}} → Targets: {{#each targetMuscles}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
    {{/each}}
  {{else}}
    The user has no matching exercises stored in their database.
  {{/if}}
  
  **EXERCISE SELECTION RULES:**
  1. PREFER selecting exercises from the database list above when they match your target muscles and training strategy.
  2. You are FREE to dynamically generate new, biomechanically correct exercises not on the list if needed to add variety, keep the workout fresh, or target muscles in a unique way.
  3. Any dynamically generated exercise MUST strictly utilize ONLY the available equipment (e.g., if "Dumbbells" are available, you can generate "Dumbbell Incline Fly" or "Dumbbell Row" even if they are not in the database).
  4. For every exercise (whether from the database or dynamically generated), you must return the required equipment in the output \`equipment\` array.

  **WORKOUT SPECIFICATION:**
  - User's fitness goals: {{#each fitnessGoals}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  - User's fitness level: {{{fitnessLevel}}}
  - Desired workout duration: {{{workoutDuration}}} minutes
  - Focus area(s): {{#each focusArea}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  - Superset Strategy: {{{supersetStrategy}}}
  - {{#if intensityLevel}}Intensity Level: {{{intensityLevel}}}{{/if}}
  - Workout Type: {{#if workoutType}}{{{workoutType}}}{{else}}resistance{{/if}}
  - Allow Supersets: {{#if allowSupersets}}true{{else}}{{#unless allowSupersets}}false{{else}}true{{/unless}}{{/if}}

  {{#if workoutHistory}}
  **RECENT WORKOUT HISTORY (AVOID REPETITION):**
  Analyze this history to avoid repeating the same exercises or workout structures. Create something fresh and different:
  {{#each workoutHistory}}
  - On {{date}}, they did "{{name}}" which included: {{exercises}}
  {{/each}}
  
  **VARIETY AND ANTI-REPETITION (CRITICAL):**
  - Do NOT select exercises that the user performed in their recent workout history unless there are no other viable options for that muscle group and equipment setup.
  - If they did "Dumbbell Bench Press" recently, choose "Incline Dumbbell Press", "Dumbbell Floor Press", "Chest Fly", or "Push-up" instead.
  - Vary the structure (straight sets vs supersets vs tri-sets) to make the routine feel brand new.
  {{/if}}
  
  {{#if activeProgram}}
  **🎯 ACTIVE PROGRAM CONTEXT:**
  The user is enrolled in a structured program. Use this context to enhance the workout while RESPECTING their selected focus area!
  
  - **Program:** {{activeProgram.name}}
  - **Current Week:** {{activeProgram.currentWeek}} of {{activeProgram.totalWeeks}}
  - **Phase:** {{activeProgram.phase}}
  - **Week's Intensity:** {{activeProgram.intensityModifier}}
  - **Program's Target Muscles:** {{#each activeProgram.primaryMuscles}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  - **Coach Notes for This Week:** {{activeProgram.focusNotes}}
  
  **PROGRAM CONTEXT RULES:**
  1. RESPECT THE USER'S SELECTED FOCUS AREA: Generate a workout for the selected focus!
  2. Use the program's intensity modifier ({{activeProgram.intensityModifier}}).
  3. Reference the program in the workout name.
  {{/if}}

  Generate a complete workout routine including a workout name, a short description, and a list of exercises.
  
  **GRANULAR MUSCLE TARGETING (CRITICAL):**
  For EVERY exercise, you MUST include a 'targetMuscles' array with SPECIFIC muscles:
  - Back: ['Lats'], ['Traps'], ['Lower Back'], ['Rhomboids']
  - Legs: ['Quads'], ['Hamstrings'], ['Glutes'], ['Calves']
  - Shoulders: ['Front Delts'], ['Side Delts'], ['Rear Delts']
  - Arms: ['Biceps'], ['Triceps'], ['Forearms']
  - Core: ['Abs'], ['Obliques']
  - Chest: ['Chest']

  **ADVANCED TRAINING TECHNIQUES (USE FOR VARIETY):**
  - 🔥 **TRIPLE SETS (Tri-Sets):** 3 exercises targeting ONE muscle group, back-to-back (supersetId: "triset_X").
  - 💧 **DROP SETS:** Set technique to 'drop_set'. Add notes explaining drop.
  - 🏔️ **PYRAMID SETS:** Set technique to 'pyramid'. E.g. reps "15-12-10-8".
  - ⚡ **GIANT SETS:** 4+ exercises for the same muscle group (supersetId: "giant_X").
  - ⏱️ **REST-PAUSE SETS:** Set technique to 'rest_pause'.
  - 🎯 **TEMPO TRAINING:** Set technique to 'tempo_3-1-2' (3s eccentric, 1s pause, 2s concentric).
  - 💪 **AMRAP FINISHERS:** Set technique to 'amrap' as finisher.
  
  **INTENSITY LEVEL GUIDELINES:**
  - **standard**: Mostly straight sets and basic supersets.
  - **high**: 2-3 advanced techniques, at least one tri-set or giant set, drop set finisher.
  - **brutal**: Every major muscle group has an advanced technique (giant sets, drop sets, AMRAP).

  For timed exercises (e.g. Planks), 'reps' should represent duration (e.g. "45s" or "30-60s"). For others, a rep range (e.g. "8-12").
  Every exercise MUST have a unique \`supersetId\` (e.g. "superset_1" to group 2 exercises, "triset_1" for 3, or "group_1" for individual).

  **WORKOUTSTYLE OPTIONS:** 'Strength Focus', 'Hypertrophy Pump', 'Intensity Techniques', 'Endurance Circuit', 'Power Building', 'Metabolic Conditioning', 'Classic Volume'.
  Give the workout a CREATIVE, MEMORABLE name.
  `,
});

const workoutGuideFlow = ai.defineFlow(
  {
    name: 'workoutGuideFlow',
    inputSchema: GenerateWorkoutInputSchema,
    outputSchema: GenerateWorkoutOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    // Ensure superset IDs are strings, not numbers, to be safe.
    if (output?.exercises) {
      output.exercises.forEach(ex => {
        ex.supersetId = String(ex.supersetId);
      });
    }
    return output!;
  }
);
