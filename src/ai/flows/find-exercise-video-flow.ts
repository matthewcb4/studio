'use server';
/**
 * @fileOverview An AI flow to generate a plausible YouTube Short video ID for a given exercise.
 *
 * - findExerciseVideo - A function that takes an exercise name and returns a YouTube Short video ID.
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
  videoId: z
    .string()
    .length(11)
    .nullable()
    .describe('The 11-character YouTube video ID, or null if a plausible ID cannot be determined.'),
});
export type FindExerciseVideoOutput = z.infer<typeof FindExerciseVideoOutputSchema>;


export async function findExerciseVideo(input: FindExerciseVideoInput): Promise<FindExerciseVideoOutput> {
    return findExerciseVideoFlow(input);
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
    name: 'exerciseVideoPrompt',
    input: { schema: FindExerciseVideoInputSchema },
    output: { schema: FindExerciseVideoOutputSchema },
    prompt: `Based on the provided exercise name, determine a plausible YouTube Short video ID that demonstrates the proper form for the exercise. The search query would likely be "how to do a {{{exerciseName}}} #shorts".

    Use the examples provided to guide your response. Only return the 11-character video ID. If you cannot determine a valid ID, return null.`,
    examples
});

const findExerciseVideoFlow = ai.defineFlow(
    {
      name: 'findExerciseVideoFlow',
      inputSchema: FindExerciseVideoInputSchema,
      outputSchema: FindExerciseVideoOutputSchema,
    },
    async (input) => {
        const { output } = await prompt(input);
        return output!;
    }
);
