
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
  volume: z.number().describe("The total volume in lbs for the workout (0 for cardio)."),
  muscleGroups: z.array(z.string()).describe("A list of primary muscle groups hit in this workout."),
  activityType: z.enum(['resistance', 'calisthenics', 'run', 'walk', 'cycle', 'hiit']).optional().describe("The type of activity. Defaults to 'resistance' if not specified."),
  duration: z.string().optional().describe("The duration of the workout (e.g., '30 min')."),
});

const SuggestWorkoutSetupInputSchema = z.object({
  fitnessGoals: z.array(z.string()).describe("A list of the user's fitness goals."),
  workoutHistory: z.array(PastWorkoutSchema).describe("The user's workout history for the last 7 days, including cardio sessions."),
  weeklyWorkoutGoal: z.number().describe("The user's target number of workouts per week (1-7)."),
  workoutsThisWeek: z.number().describe("The number of workouts the user has already completed this week (Monday to today)."),
});


const SuggestWorkoutSetupOutputSchema = z.object({
  summary: z.string().describe("A short (2-3 sentences), encouraging summary of the user's recent performance and a recommendation for today's focus. Mention cardio if relevant."),
  focusArea: z.array(z.string()).describe("The suggested primary muscle group(s) to focus on for the next workout. Use top-level groups like 'Upper Body', 'Lower Body', 'Full Body', or 'Core'."),
  supersetStrategy: z.enum(['focused', 'mixed']).describe("The suggested superset strategy."),
  workoutDuration: z.number().describe("The suggested workout duration in minutes."),
  cardioRecommendation: z.string().optional().describe("An optional suggestion for cardio (e.g., 'Consider a light 20-min walk for recovery' or 'Your last cardio was 3 days ago - good time for a run')."),
});


export async function suggestWorkoutSetup(input: SuggestWorkoutSetupInput): Promise<SuggestWorkoutSetupOutput> {
  return suggestWorkoutFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestWorkoutPrompt',
  input: { schema: SuggestWorkoutSetupInputSchema },
  output: { schema: SuggestWorkoutSetupOutputSchema },
  prompt: `You are an expert fitness coach AI named 'fRepo Coach'. Your task is to analyze a user's recent workout history (including cardio sessions) and their goals to provide a smart, encouraging recommendation for their next workout.

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
    - On {{date}}: [{{activityType}}] "{{name}}" ({{duration}}). Volume: {{volume}} lbs. Muscles: {{#each muscleGroups}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.
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

  **CROSS-TRAINING AWARENESS (CARDIO):**
  - Check if the user has done any cardio (run, walk, cycle, hiit) recently.
  - If they did heavy lower body resistance yesterday and cardio today focuses on legs too, acknowledge the muscle overlap.
  - If a user's goal includes "fat loss" or "endurance", encourage cardio more often.
  - Provide a 'cardioRecommendation' field if relevant:
    - If they haven't done cardio in 3+ days, suggest a light cardio session.
    - If they just did intense lower body, suggest upper body cardio alternatives or rest.
    - If they're on track with cardio, leave this field empty or give encouragement.

  **Your Task:**

  1.  **Determine Today's Day Number:** Calculate which day of the split this is based on workoutsThisWeek + 1.
  2.  **Apply the Split Pattern:** Based on the weekly goal and today's day number, determine what the focus should be according to the split patterns above.
  3.  **Cross-check with History:** Verify the suggestion makes sense given recent workouts. If they just did that muscle group yesterday, adjust if needed.
  4.  **Consider Cardio:** Look at recent cardio sessions and provide a cardioRecommendation if appropriate.
  5.  **Create a Suggestion:**
      *   **Focus Area:** Suggest the focus area that matches the split pattern for today's day number. CRITICAL: Only use top-level groups like 'Upper Body', 'Lower Body', 'Full Body', or 'Core'. Do not use specific muscles like 'Legs' or 'Chest'.
      *   **Duration:** Suggest a 'workoutDuration'. A standard duration is 45-60 minutes. Suggest longer for mass goals, maybe shorter and more intense for fat loss.
      *   **Superset Strategy:** Use 'mixed' for full-body or Upper Body days. Use 'focused' for Lower Body days.
      *   **Summary:** Write a 2-3 sentence 'summary'. Mention the split context (e.g., "This is Day 2 of your 4-day split, so we're focusing on Lower Body."). Acknowledge any recent cardio. Be encouraging about their progress.
      *   **Cardio Recommendation:** If relevant, provide a brief suggestion like "Consider a 20-minute walk for active recovery" or "Great job on your run yesterday - your legs might be tired today."

  **IMPORTANT:**
  - Follow the split pattern based on weekly goal. Do NOT just default to "Full Body" or "Lower Body" to balance things out.
  - Be concise and encouraging.
  - The output MUST be a valid JSON object matching the output schema.
  - The 'focusArea' must be an array of strings (e.g., ["Lower Body"], ["Upper Body"]).
  - The 'cardioRecommendation' is optional - only include it if you have a meaningful suggestion.
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
