
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

const GenerateWorkoutInputSchema = z.object({
  availableEquipment: z.array(z.string()).describe("A list of available fitness equipment."),
  fitnessGoals: z.array(z.string()).describe("A list of the user's fitness goals (e.g., increase_max_lift, gain_overall_mass, reduce_body_fat)."),
  fitnessLevel: z.string().describe("The user's current fitness level (e.g., beginner, intermediate, advanced)."),
  workoutDuration: z.number().describe("The desired workout duration in minutes."),
  focusArea: z.array(z.string()).describe("A list of primary muscle groups or areas to focus on (e.g., Full Body, Upper Body, Lower Body, Core, Arms, Legs, Chest, Back, Shoulders)."),
  supersetStrategy: z.string().describe("The user's preferred superset strategy. 'focused' means supersets should contain exercises for the SAME muscle group. 'mixed' means supersets can combine exercises for DIFFERENT muscle groups (e.g., antagonist or non-competing groups)."),
  workoutHistory: z.array(WorkoutHistoryItemSchema).optional().describe("A list of the user's recent workouts to avoid repetition."),
});
export type GenerateWorkoutInput = z.infer<typeof GenerateWorkoutInputSchema>;

const ExerciseSchema = z.object({
  name: z.string().describe("Name of the exercise."),
  category: z.string().describe("The primary muscle group targeted by this exercise (e.g., Chest, Back, Legs, Shoulders, Arms, Core)."),
  sets: z.string().describe("Number of sets to perform, can be a range like '3-4'."),
  reps: z.string().describe("Number of repetitions per set (e.g., '8-12'), or duration in seconds for timed exercises (e.g., '30-60s')."),
  rest: z.string().describe("Rest time in seconds between sets."),
  supersetId: z.string().describe("Identifier to group exercises into a superset. Exercises with the same supersetId are performed back-to-back with no rest."),
});

const GenerateWorkoutOutputSchema = z.object({
  workoutName: z.string().describe("A creative and fitting name for the generated workout routine."),
  description: z.string().describe("A brief description of the workout, its focus, and who it's for."),
  exercises: z.array(ExerciseSchema).describe("An array of exercises for the workout routine."),
});
export type GenerateWorkoutOutput = z.infer<typeof GenerateWorkoutOutputSchema>;

export async function generateWorkout(input: GenerateWorkoutInput): Promise<GenerateWorkoutOutput> {
  return workoutGuideFlow(input);
}

const prompt = ai.definePrompt({
  name: 'workoutGuidePrompt',
  input: { schema: GenerateWorkoutInputSchema },
  output: { schema: GenerateWorkoutOutputSchema },
  prompt: `You are an expert fitness coach. Your task is to create a personalized workout routine based on the user's available equipment, goals, and preferences.

  User's available equipment: {{#each availableEquipment}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  User's fitness goals: {{#each fitnessGoals}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  User's fitness level: {{{fitnessLevel}}}
  Desired workout duration: {{{workoutDuration}}} minutes
  Focus area(s): {{#each focusArea}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  Superset Strategy: {{{supersetStrategy}}}

  {{#if workoutHistory}}
  Here is the user's recent workout history. Take this into account to create a new workout that is varied and avoids repeating the same exercises or workout styles too frequently.
  {{#each workoutHistory}}
  - On {{date}}, they did "{{name}}" which included: {{exercises}}
  {{/each}}
  {{/if}}
  
  Generate a complete workout routine including a workout name, a short description, and a list of exercises.
  
  IMPORTANT: Do NOT generate duplicate exercises. For example, do not include both "Pull-up" and "Pull ups" in the same workout. Ensure every exercise name is unique.

  For each exercise, you MUST provide a 'category' from this specific list: Chest, Back, Shoulders, Legs, Arms, Core, Biceps, Triceps, Obliques.
  
  For timed exercises like Planks or Holds, the 'reps' field should represent the duration in seconds (e.g., "45s" or "30-60s"). For all other exercises, it should be a rep range (e.g., "8-12").

  You MUST group exercises into supersets or individual groups. A superset consists of two exercises performed back-to-back with no rest in between. 
  To create a superset, assign the same 'supersetId' (e.g., "superset_1") to two exercises. 
  For exercises that are not in a superset, assign a unique 'supersetId' that is not shared with any other exercise (e.g., "group_1", "group_2"). 
  Ensure EVERY exercise has a 'supersetId' field.

  SUPERSET STRATEGY GUIDELINES:
  - If Superset Strategy is 'focused': Create supersets where both exercises target the SAME muscle group from the user's focus areas. For example, if focus is "Chest", superset Bench Press with Chest Fly.
  - If Superset Strategy is 'mixed': Create supersets by pairing exercises from DIFFERENT muscle groups from the user's focus areas. For example, if focus is "Chest" and "Back", superset Bench Press (Chest) with Bent-over Row (Back). This is great for antagonist muscle pairing.
  
  EQUIPMENT-BASED EXERCISE SELECTION:
  - If "Bodyweight" or "Calisthenics" is listed as available equipment, STRONGLY PREFER calisthenics exercises:
    * Push-ups (standard, diamond, archer, decline, wide)
    * Pull-ups, Chin-ups, Inverted Rows
    * Dips (parallel bars or bench)
    * Squats (bodyweight, pistol, Bulgarian split squat)
    * Lunges (forward, reverse, walking)
    * Planks, L-Sits, Hollow Body Holds
    * Burpees, Mountain Climbers
    * Handstand Push-ups, Pike Push-ups
    * Muscle-ups (for advanced)
  - If only "Bodyweight" is available with no other equipment, generate a 100% calisthenics workout.
  - You can mix weighted exercises with calisthenics when both equipment types are available.

  The workout should be effective and safe. Only use the equipment specified by the user. The total workout time should be close to the desired duration.
  Provide a creative name for the workout.
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
