'use server';
/**
 * @fileOverview A flow to find an exercise video on YouTube.
 *
 * - findExerciseVideo - A function that finds a YouTube video for a given exercise.
 * - FindExerciseVideoInput - The input type for the findExerciseVideo function.
 * - FindExerciseVideoOutput - The return type for the findExerciseVideo function.
 */

import { ai } from '@/ai/genkit';
import { findYoutubeShortId } from '@/ai/flows/find-youtube-short-id-flow';
import { z } from 'genkit';

const FindExerciseVideoInputSchema = z.object({
  exerciseName: z.string().describe("The name of the exercise to find a video for."),
});
export type FindExerciseVideoInput = z.infer<typeof FindExerciseVideoInputSchema>;

const FindExerciseVideoOutputSchema = z.object({
  videoId: z.string().nullable().describe("The YouTube video ID, or null if no video was found."),
});
export type FindExerciseVideoOutput = z.infer<typeof FindExerciseVideoOutputSchema>;

export async function findExerciseVideo(input: FindExerciseVideoInput): Promise<FindExerciseVideoOutput> {
  return findExerciseVideoFlow(input);
}

const findVideoTool = ai.defineTool(
  {
    name: 'findYouTubeVideo',
    description: 'Finds a YouTube video ID for a given exercise name.',
    inputSchema: z.object({ exercise: z.string() }),
    outputSchema: z.object({ videoId: z.string().nullable() }),
  },
  async ({ exercise }) => {
    // This tool now calls another AI flow to dynamically find a video ID.
    try {
      const result = await findYoutubeShortId({ exerciseName: exercise });
      return { videoId: result.videoId };
    } catch (error) {
      console.error(`Error finding video for ${exercise}:`, error);
      return { videoId: null };
    }
  }
);

const prompt = ai.definePrompt({
  name: 'findExerciseVideoPrompt',
  input: { schema: FindExerciseVideoInputSchema },
  output: { schema: FindExerciseVideoOutputSchema },
  prompt: `Find a YouTube Short for the exercise: {{{exerciseName}}}. You must use the provided tool to get the video ID.`,
  tools: [findVideoTool]
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
