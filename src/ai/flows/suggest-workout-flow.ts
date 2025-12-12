
'use server';
/**
 * @fileOverview An AI agent that suggests a workout setup based on recent history and goals.
 *
 * - suggestWorkoutSetup - A function that suggests a workout plan.
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
  weeklyWorkoutGoal: z.number().describe("The user's target number of workouts per week (1-7)."),
  workoutsThisWeek: z.number().describe("The number of workouts the user has already completed this week (Monday to today)."),
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

  **User's Weekly Workout Goal:** {{weeklyWorkoutGoal}} workouts per week
  **Workouts Completed This Week (Mon-Sun):** {{workoutsThisWeek}}
  **Today's Workout Would Be:** Day (workoutsThisWeek + 1) of {{weeklyWorkoutGoal}}

  **User's Workout History (Last 7 Days):**
  {{#if workoutHistory.length}}
    {{#each workoutHistory}}
    - On {{date}}, they performed "{{name}}", focusing on {{#each muscleGroups}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}} with a total volume of {{volume}} lbs.
    {{/each}}
  {{else}}
    The user has no workouts logged in the last 7 days.
  {{/if}}

  **SPLIT PROGRAMMING GUIDELINES (CRITICAL):**
  Based on the user's weekly workout goal, you MUST follow these standard split patterns to suggest the appropriate focus for today:

  - **2 days/week:** Full Body both days. Always suggest "Full Body".
  
  - **3 days/week (Push/Pull/Legs):**
    - Day 1: Upper Body (Push focus - Chest, Shoulders, Triceps)
    - Day 2: Upper Body (Pull focus - Back, Biceps) 
    - Day 3: Lower Body (Legs, Glutes)
  
  - **4 days/week (Upper/Lower):**
    - Day 1: Upper Body
    - Day 2: Lower Body
    - Day 3: Upper Body
    - Day 4: Lower Body
  
  - **5 days/week:**
    - Day 1: Upper Body (Push)
    - Day 2: Lower Body
    - Day 3: Upper Body (Pull)
    - Day 4: Lower Body
    - Day 5: Upper Body or Full Body
  
  - **6+ days/week (Bro Split):**
    - Rotate through: Chest, Back, Shoulders, Arms, Legs, Core
    - Be more granular with focus areas

  **Your Task:**

  1.  **Determine Today's Day Number:** Calculate which day of the split this is based on workoutsThisWeek + 1.
  2.  **Apply the Split Pattern:** Based on the weekly goal and today's day number, determine what the focus should be according to the split patterns above.
  3.  **Cross-check with History:** Verify the suggestion makes sense given recent workouts. If they just did that muscle group yesterday, adjust if needed.
  4.  **Create a Suggestion:**
      *   **Focus Area:** Suggest the focus area that matches the split pattern for today's day number. CRITICAL: Only use top-level groups like 'Upper Body', 'Lower Body', 'Full Body', or 'Core'. Do not use specific muscles like 'Legs' or 'Chest'.
      *   **Duration:** Suggest a 'workoutDuration'. A standard duration is 45-60 minutes. Suggest longer for mass goals, maybe shorter and more intense for fat loss.
      *   **Superset Strategy:** Use 'mixed' for full-body or Upper Body days. Use 'focused' for Lower Body days.
      *   **Summary:** Write a 2-3 sentence 'summary'. Mention the split context (e.g., "This is Day 2 of your 4-day split, so we're focusing on Lower Body."). Be encouraging about their progress.

  **IMPORTANT:**
  - Follow the split pattern based on weekly goal. Do NOT just default to "Full Body" or "Lower Body" to balance things out.
  - Be concise and encouraging.
  - The output MUST be a valid JSON object matching the output schema.
  - The 'focusArea' must be an array of strings (e.g., ["Lower Body"], ["Upper Body"]).
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
