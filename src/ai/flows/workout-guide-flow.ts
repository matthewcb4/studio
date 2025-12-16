
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
  intensityLevel: z.enum(['standard', 'high', 'brutal']).optional().describe("The intensity level for the workout. 'standard' is normal training. 'high' includes some advanced techniques. 'brutal' uses drop sets, giant sets, and other intense methods."),
});
export type GenerateWorkoutInput = z.infer<typeof GenerateWorkoutInputSchema>;

const ExerciseSchema = z.object({
  name: z.string().describe("Name of the exercise."),
  category: z.string().describe("The primary muscle group targeted by this exercise (e.g., Chest, Back, Legs, Shoulders, Arms, Core)."),
  sets: z.string().describe("Number of sets to perform, can be a range like '3-4'."),
  reps: z.string().describe("Number of repetitions per set (e.g., '8-12'), or duration in seconds for timed exercises (e.g., '30-60s')."),
  rest: z.string().describe("Rest time in seconds between sets."),
  supersetId: z.string().describe("Identifier to group exercises. Exercises with the same supersetId are performed back-to-back. Use 'superset_X', 'triset_X', or 'giant_X' for multi-exercise groups."),
  technique: z.string().optional().describe("Optional advanced technique like 'drop_set', 'pyramid', 'rest_pause', 'tempo_3-1-2', 'amrap', or 'mechanical_drop'."),
  notes: z.string().optional().describe("Optional coaching notes for the exercise, especially for advanced techniques."),
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

  User's available equipment: {{#each availableEquipment}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  User's fitness goals: {{#each fitnessGoals}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  User's fitness level: {{{fitnessLevel}}}
  Desired workout duration: {{{workoutDuration}}} minutes
  Focus area(s): {{#each focusArea}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  Superset Strategy: {{{supersetStrategy}}}
  {{#if intensityLevel}}Intensity Level: {{{intensityLevel}}}{{/if}}

  {{#if workoutHistory}}
  Here is the user's recent workout history. CRITICALLY analyze this to avoid repeating the same exercises or workout styles. Create something FRESH and DIFFERENT:
  {{#each workoutHistory}}
  - On {{date}}, they did "{{name}}" which included: {{exercises}}
  {{/each}}
  {{/if}}
  
  Generate a complete workout routine including a workout name, a short description, and a list of exercises.
  
  **WORKOUT VARIETY & PERSONALITY:**
  To keep workouts engaging and prevent staleness, YOU MUST:
  1. Vary the workout structure between sessions (don't always use the same superset patterns)
  2. Give workouts creative, memorable names that reflect their character
  3. Include different training styles across workouts

  **ADVANCED TRAINING TECHNIQUES (USE THESE TO ADD VARIETY!):**
  
  🔥 **TRIPLE SETS (Tri-Sets):**
  - Group 3 exercises targeting ONE muscle group, performed back-to-back
  - Use supersetId like "triset_1" to group them
  - Example: Incline Press → Flat Fly → Push-ups (all chest)
  - Great for hypertrophy and pump
  
  💧 **DROP SETS:**
  - Set 'technique' to 'drop_set'
  - Add notes like "Drop weight 20-30% after failure, continue for 8-10 more reps"
  - Best used on isolation or machine exercises
  - Example: Lateral Raise with drop_set technique
  
  🏔️ **PYRAMID SETS:**
  - Set 'technique' to 'pyramid'
  - Reps should indicate the pattern like "15-12-10-8" or "8-10-12-10-8"
  - Add notes explaining weight progression
  
  ⚡ **GIANT SETS:**
  - Group 4+ exercises for the same muscle group
  - Use supersetId like "giant_1"
  - Maximum muscle fatigue and time efficiency
  
  ⏱️ **REST-PAUSE SETS:**
  - Set 'technique' to 'rest_pause'
  - Add notes like "After failure, rest 15s, continue for 3-4 more reps, repeat"
  
  🎯 **TEMPO TRAINING:**
  - Set 'technique' to 'tempo_3-1-2' (3s eccentric, 1s pause, 2s concentric)
  - Great for building mind-muscle connection and hypertrophy
  
  💪 **AMRAP FINISHERS:**
  - Set 'technique' to 'amrap'
  - Use as workout finishers with notes like "As many reps as possible in 60 seconds"
  
  🔄 **MECHANICAL DROP SETS:**
  - Set 'technique' to 'mechanical_drop'
  - Same weight, change angle/grip when fatigued
  - Example: Close-grip bench → wide grip bench → push-ups (all same weight or bodyweight)

  **INTENSITY LEVEL GUIDELINES:**
  {{#if intensityLevel}}
  {{#ifEquals intensityLevel "standard"}}
  - Use mostly straight sets and basic supersets
  - Include 1-2 exercises with advanced techniques for variety
  {{/ifEquals}}
  {{#ifEquals intensityLevel "high"}}
  - Include 2-3 advanced techniques throughout
  - Use at least one tri-set or giant set
  - Add a drop set finisher for the primary muscle group
  {{/ifEquals}}
  {{#ifEquals intensityLevel "brutal"}}
  - EVERY major muscle group should have an advanced technique
  - Use multiple drop sets, giant sets, and rest-pause sets
  - Include tempo work and AMRAP finishers
  - This should feel like a true challenge
  {{/ifEquals}}
  {{else}}
  - Default to mixing 30% advanced techniques with 70% standard training
  - Always include at least ONE tri-set or drop set to keep things interesting
  {{/if}}

  IMPORTANT: Do NOT generate duplicate exercises. For example, do not include both "Pull-up" and "Pull ups" in the same workout. Ensure every exercise name is unique.

  For each exercise, you MUST provide a 'category' from this specific list: Chest, Back, Shoulders, Legs, Arms, Core, Biceps, Triceps, Obliques.
  
  For timed exercises like Planks or Holds, the 'reps' field should represent the duration in seconds (e.g., "45s" or "30-60s"). For all other exercises, it should be a rep range (e.g., "8-12").

  **GROUPING EXERCISES:**
  - **Superset (2 exercises):** Use supersetId like "superset_1"
  - **Tri-set (3 exercises):** Use supersetId like "triset_1"
  - **Giant set (4+ exercises):** Use supersetId like "giant_1"
  - **Individual exercises:** Use unique IDs like "group_1", "group_2"
  - EVERY exercise MUST have a supersetId
  
  SUPERSET STRATEGY GUIDELINES:
  - If Superset Strategy is 'focused': Create supersets/trisets where exercises target the SAME muscle group. This is great for pump and hypertrophy.
  - If Superset Strategy is 'mixed': Pair exercises from DIFFERENT muscle groups (antagonist pairing). This is great for efficiency and active recovery.
  
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

  **CRITICAL - EXERCISE NAMING RULES:**
  You MUST use EXACTLY these exercise names (case-sensitive, exact spelling). Do NOT create variations or add extra words:
  
  CHEST: Barbell Bench Press, Dumbbell Bench Press, Incline Dumbbell Press, Chest Fly, Push-up, Dip, Diamond Push-up, Archer Push-up, Decline Push-up, Wide Push-up
  BACK: Pull-up, Lat Pulldown, Bent-over Row, Seated Cable Row, Deadlift, T-Bar Row, Chin-up, Inverted Row, Australian Pull-up, Negative Pull-up
  LEGS: Barbell Squat, Goblet Squat, Lunge, Leg Press, Leg Extension, Hamstring Curl, Calf Raise, Pistol Squat, Bulgarian Split Squat, Nordic Curl, Box Jump, Jump Squat, Wall Sit
  SHOULDERS: Overhead Press, Arnold Press, Lateral Raise, Front Raise, Face Pull, Shrug, Handstand Push-up, Handstand Hold, Pike Push-up
  ARMS: Bicep Curl, Hammer Curl, Triceps Pushdown, Skull Crusher, Overhead Triceps Extension, Preacher Curl
  CORE: Crunch, Plank, Leg Raise, Russian Twist, Ab Rollout, L-Sit, Hollow Body Hold, Dragon Flag, Hanging Leg Raise, Dead Bug, Bird Dog
  FULL BODY: Muscle-up, Burpee, Mountain Climber
  
  If you need an exercise not on this list, use the closest match. NEVER create variations like "Close Grip Push-up" when "Diamond Push-up" exists.

  The workout should be effective and safe. Only use the equipment specified by the user. The total workout time should be close to the desired duration.
  
  **WORKOUTSTYLE OPTIONS:** Choose one that best describes this workout: 'Strength Focus', 'Hypertrophy Pump', 'Intensity Techniques', 'Endurance Circuit', 'Power Building', 'Metabolic Conditioning', 'Classic Volume'.
  
  Give the workout a CREATIVE, MEMORABLE name that reflects its personality and style. Avoid generic names like "Upper Body Workout". Examples of good names:
  - "The Shoulder Shredder"
  - "Back Attack: Drop Set Devastation"
  - "Chest Day Chaos"
  - "Leg Day: Pyramid of Pain"
  - "Arms Annihilation"
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
