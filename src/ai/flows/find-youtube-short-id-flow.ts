'use server';
/**
 * @fileOverview An AI flow to generate a plausible YouTube Short video ID for a given exercise.
 *
 * - findYoutubeShortId - A function that takes an exercise name and returns a YouTube Short video ID.
 * - FindYoutubeShortIdInput - The input type for the findYoutubeShortId function.
 * - FindYoutubeShortIdOutput - The return type for the findYoutubeShortId function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FindYoutubeShortIdInputSchema = z.object({
  exerciseName: z.string().describe("The name of the exercise."),
});
export type FindYoutubeShortIdInput = z.infer<typeof FindYoutubeShortIdInputSchema>;

const FindYoutubeShortIdOutputSchema = z.object({
  videoId: z
    .string()
    .length(11)
    .nullable()
    .describe('The 11-character YouTube video ID, or null if a plausible ID cannot be determined.'),
});
export type FindYoutubeShortIdOutput = z.infer<typeof FindYoutubeShortIdOutputSchema>;


export async function findYoutubeShortId(input: FindYoutubeShortIdInput): Promise<FindYoutubeShortIdOutput> {
    return findYoutubeShortIdFlow(input);
}

const examples = [
    { input: { exerciseName: 'Barbell Bench Press' }, output: { videoId: '0Fzshb9T38A' } },
    { input: { exerciseName: 'Seated Lat Pulldown' }, output: { videoId: 'u_i-3tC4J_o' } },
    { input: { exerciseName: 'Goblet Squat' }, output: { videoId: '5b-yC8aD_9Q' } },
    { input: { exerciseName: 'Overhead Press' }, output: { videoId: 'M2-iA6S7-DA' } },
    { input: { exerciseName: 'Bicep Curl' }, output: { videoId: '1n_n3G-Y7eM' } },
    { input: { exerciseName: 'Tricep Extension' }, output: { videoId: 'b_r_LW4HEcM' } },
    { input: { exerciseName: 'Deadlift' }, output: { videoId: '_FkbD0FhgVE' } },
    { input: { exerciseName: 'Leg Press' }, output: { videoId: 's1pYtS6sN-8' } },
    { input: { exerciseName: 'Lateral Raise' }, output: { videoId: '3fiHn2fT-i0' } },
    { input: { exerciseName: 'Chest Fly' }, output: { videoId: '2z0o2v1i-vM' } },
    { input: { exerciseName: 'Romanian Deadlift' }, output: { videoId: 'jey_CzI_nUA' } },
    { input: { exerciseName: 'Pull Up' }, output: { videoId: 'poyr8KenUFc' } },
];


const prompt = ai.definePrompt({
    name: 'youtubeShortIdPrompt',
    input: { schema: FindYoutubeShortIdInputSchema },
    output: { schema: FindYoutubeShortIdOutputSchema },
    prompt: `Based on the provided exercise name, determine a plausible YouTube Short video ID that demonstrates the proper form for the exercise. The search query would likely be "how to do a {{{exerciseName}}} #shorts".

    Use the examples provided to guide your response. Only return the 11-character video ID. If you cannot determine a valid ID, return null.`,
    examples
});

const findYoutubeShortIdFlow = ai.defineFlow(
    {
      name: 'findYoutubeShortIdFlow',
      inputSchema: FindYoutubeShortIdInputSchema,
      outputSchema: FindYoutubeShortIdOutputSchema,
    },
    async (input) => {
        const { output } = await prompt(input);
        return output!;
    }
);
