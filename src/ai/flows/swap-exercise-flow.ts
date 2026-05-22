'use server';

/**
 * @fileoverview An AI agent that suggests high-compatibility exercise swaps based on targets, equipment, and biomechanics.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SwapExerciseInputSchema = z.object({
  activeExercise: z.string().describe("The name of the exercise currently in the workout that the user wants to swap."),
  targetMuscleGroup: z.string().describe("The primary muscle group targeted by this exercise (e.g. Chest, Quads, Biceps, Lats, Shoulders, etc.)."),
  availableEquipment: z.array(z.string()).describe("A list of equipment the user has access to (e.g., Dumbbell, Barbell, Cable, Bodyweight, Machine, Kettlebell, Band)."),
  fitnessGoals: z.array(z.string()).optional().describe("A list of the user's fitness goals to personalize the recommendation."),
});

const ExerciseSwapRecommendationSchema = z.object({
  exerciseName: z.string().describe("The name of the suggested alternative exercise."),
  muscleLoadComparison: z.string().describe("How the loading pattern compares to the original exercise (e.g., 'Shifts more load to the upper chest' or 'Increases tension at peak contraction')."),
  biomechanicalRationale: z.string().describe("A concise 1-sentence biomechanical explanation for why this is an ideal replacement."),
  necessaryEquipment: z.string().describe("The primary equipment needed for this exercise (e.g. 'Dumbbell', 'Cable', 'Bodyweight')."),
});

const SwapExerciseOutputSchema = z.object({
  recommendations: z.array(ExerciseSwapRecommendationSchema).describe("Exactly 3 highly compatible exercise recommendations."),
});

const prompt = ai.definePrompt({
  name: 'swapExercisePrompt',
  input: { schema: SwapExerciseInputSchema },
  output: { schema: SwapExerciseOutputSchema },
  prompt: `You are an elite exercise scientist and biomechanics expert. The user wants to swap an exercise in their workout.
  
  **Original Exercise:** {{{activeExercise}}}
  **Target Muscle Group:** {{{targetMuscleGroup}}}
  **Available Equipment:** 
  {{#if availableEquipment.length}}
    {{#each availableEquipment}}
    - {{{this}}}
    {{/each}}
  {{else}}
    - Barbell, Dumbbell, Cable, Bodyweight
  {{/if}}
  
  **User Goals:**
  {{#if fitnessGoals.length}}
    {{#each fitnessGoals}}
    - {{{this}}}
    {{/each}}
  {{else}}
    - General strength and muscle growth
  {{/if}}

  Provide exactly 3 premium, highly effective replacement exercises that target the same muscle group ({Target Muscle Group}) and utilize ONLY the available equipment.
  For each recommendation:
  1. Give the exact common exercise name.
  2. Compare the muscle loading pattern with the original exercise (e.g. stretch-mediated hypertrophy vs peak contraction tension).
  3. Provide a clear, 1-sentence biomechanical reason why this is a stellar alternative.
  4. Specify the equipment required.
  `,
});

const swapExerciseFlow = ai.defineFlow(
  {
    name: 'swapExerciseFlow',
    inputSchema: SwapExerciseInputSchema,
    outputSchema: SwapExerciseOutputSchema,
  },
  async (input) => {
    const response = await prompt(input);
    if (!response.output) {
      throw new Error("Failed to generate exercise swap recommendations.");
    }
    return response.output;
  }
);

export async function suggestExerciseSwaps(input: z.infer<typeof SwapExerciseInputSchema>): Promise<{
  success: boolean;
  recommendations?: z.infer<typeof ExerciseSwapRecommendationSchema>[];
  error?: string;
}> {
  try {
    const result = await swapExerciseFlow(input);
    return {
      success: true,
      recommendations: result.recommendations,
    };
  } catch (err: any) {
    console.error("suggestExerciseSwaps Action error:", err);
    return {
      success: false,
      error: err.message || err.toString(),
    };
  }
}
