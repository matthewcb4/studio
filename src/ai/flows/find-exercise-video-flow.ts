'use server';
/**
 * @fileOverview An AI flow to generate a YouTube search URL for a given exercise.
 *
 * - findExerciseVideo - A function that takes an exercise name and returns a YouTube search URL.
 * - FindExerciseVideoInput - The input type for the findExerciseVideo function.
 * - FindExerciseVideoOutput - The return type for the findExerciseVideo function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FindExerciseVideoInputSchema = z.object({
  exerciseName: z.string().describe("The name of the exercise."),
});
export type FindExerciseVideoInput = z.infer<typeof FindExerciseVideoInputSchema>;


const FindExerciseVideoOutputSchema = z.object({
  searchUrl: z.string().url().describe("A YouTube search URL for the exercise."),
});
export type FindExerciseVideoOutput = z.infer<typeof FindExerciseVideoOutputSchema>;


const PromptOutputSchema = z.object({
  searchQuery: z.string().describe("A YouTube search query string for the exercise.")
});


export async function findExerciseVideo(input: FindExerciseVideoInput): Promise<FindExerciseVideoOutput> {
    return findExerciseVideoFlow(input);
}

const prompt = ai.definePrompt({
    name: 'exerciseVideoSearchQueryPrompt',
    input: { schema: FindExerciseVideoInputSchema },
    output: { schema: PromptOutputSchema },
    prompt: `You are a YouTube search expert specializing in fitness content.
    
    Your task is to generate an optimal YouTube search query to find short video demonstrations for the following exercise: "{{{exerciseName}}}".

    The query should include terms like "how to", the exercise name, and "#shorts" to get the best results.
    
    Example: For "Goblet Squat", a good query would be "how to do a goblet squat #shorts".

    Return ONLY the search query string.
    `,
});

const findExerciseVideoFlow = ai.defineFlow(
    {
      name: 'findExerciseVideoFlow',
      inputSchema: FindExerciseVideoInputSchema,
      outputSchema: FindExerciseVideoOutputSchema,
    },
    async (input) => {
        const { output } = await prompt(input);
        if (!output) {
          throw new Error("Could not generate a search query.");
        }

        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(output.searchQuery)}`;

        return { searchUrl };
    }
);
