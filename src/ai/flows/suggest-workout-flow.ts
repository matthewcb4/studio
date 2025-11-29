
'use server';
/**
 * @fileOverview An AI agent that suggests a workout setup based on recent history and goals.
 *
 * - suggestWorkoutSetup - A function that suggests a workout plan.
 * - SuggestWorkoutSetupInput - The input type for the suggestWorkoutSetup function.
 * - SuggestWorkoutSetupOutput - The return type for the suggestWorkoutSetup function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { SuggestWorkoutSetupInput, SuggestWorkoutSetupOutput } from '@/app/(app)/guide/page';

const PastWorkoutSchema = z.object({
  date: z.string().describe("The date of the workout."),
  name: z.string().describe("The name of the workout."),
  volume: z.number().describe("The total volume in lbs for the workout."),
  muscleGroups: z.array(z.string()).describe("A list of primary muscle groups hit in this workout."),
});

const SuggestWorkoutSetupInputSchema = z.object({
  fitnessGoals: z.array(z.string()).describe("A list of the user's fitness goals."),
  workoutHistory: z.array(PastWorkoutSchema).describe("The user's workout history for the last 7 days."),
});


const SuggestWorkoutSetupOutputSchema = z.object({
  summary: z.string().describe("A short (2-3 sentences), encouraging summary of the user's recent performance and a recommendation for today's focus."),
  focusArea: z.array(z.string()).describe("The suggested primary muscle group(s) to focus on for the next workout. Use top-level groups like 'Upper Body', 'Lower Body', 'Full Body', or 'Core'."),
  supersetStrategy: z.enum(['focused', 'mixed']).describe("The suggested superset strategy."),
  workoutDuration: z.number().describe("The suggested workout duration in minutes."),
});


export async function suggestWorkoutSetup(input: SuggestWorkoutSetupInput): Promise<SuggestWorkoutSetupOutput> {
  return suggestWorkoutFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestWorkoutPrompt',
  input: { schema: SuggestWorkoutSetupInputSchema },
  output: { schema: SuggestWorkoutSetupOutputSchema },
  prompt: `You are an expert fitness coach AI named 'fRepo Coach'. Your task is to analyze a user's recent workout history and their goals to provide a smart, encouraging recommendation for their next workout.

  **User's Fitness Goals:**
  {{#each fitnessGoals}}
  - {{{this}}}
  {{/each}}

  **User's Workout History (Last 7 Days):**
  {{#if workoutHistory.length}}
    {{#each workoutHistory}}
    - On {{date}}, they performed "{{name}}", focusing on {{#each muscleGroups}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}} with a total volume of {{volume}} lbs.
    {{/each}}
  {{else}}
    The user has no workouts logged in the last 7 days.
  {{/if}}

  **Your Task:**

  1.  **Analyze the History:** Look at the muscle groups worked and the volume. Identify which muscle groups are well-rested and which have been heavily trained. Notice trends in volume.
  2.  **Consider Goals:** Align your suggestion with the user's goals (e.g., if the goal is 'gain_overall_mass', suggest higher volume workouts; if 'reduce_body_fat', maybe suggest a full-body workout or higher intensity).
  3.  **Create a Suggestion:**
      *   **Focus Area:** Based on your analysis, suggest a primary 'focusArea' for today. This is the most important part. If they've hit 'Upper Body' hard, suggest 'Lower Body' or 'Full Body'. If they've been inconsistent, suggest 'Full Body' to get back on track. CRITICAL: Only use top-level groups like 'Upper Body', 'Lower Body', 'Full Body', or 'Core'. Do not use specific muscles like 'Legs' or 'Chest'.
      *   **Duration:** Suggest a 'workoutDuration'. A standard duration is 45-60 minutes. Suggest longer for mass goals, maybe shorter and more intense for fat loss.
      *   **Superset Strategy:** Suggest a 'supersetStrategy'. Use 'mixed' for full-body or antagonist muscle days (like Chest/Back). Use 'focused' for days dedicated to a single muscle group (like Legs).
      *   **Summary:** Write a 2-3 sentence 'summary'. Start with a positive, encouraging observation about their recent work (e.g., "Great work on the consistent volume this week!"). Then, state your recommendation and the reason for it (e.g., "Your upper body has been working hard, so let's give it a rest and focus on Lower Body today to ensure balanced development."). If they have no history, welcome them and suggest a 'Full Body' workout to start.

  **IMPORTANT:**
  - Be concise and encouraging.
  - The output MUST be a valid JSON object matching the output schema.
  - The 'focusArea' must be an array of strings (e.g., ["Lower Body"], ["Full Body"]).
`,
});

const suggestWorkoutFlow = ai.defineFlow(
  {
    name: 'suggestWorkoutFlow',
    inputSchema: SuggestWorkoutSetupInputSchema,
    outputSchema: SuggestWorkoutSetupOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

