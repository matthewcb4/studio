'use server';
/**
 * @fileOverview A flow to find an exercise video on YouTube.
 *
 * - findExerciseVideo - A function that finds a YouTube video for a given exercise.
 * - FindExerciseVideoInput - The input type for the findExerciseVideo function.
 * - FindExerciseVideoOutput - The return type for the findExerciseVideo function.
 */

import { ai } from '@/ai/genkit';
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
      description: 'Finds a YouTube video for a given search query.',
      inputSchema: z.object({ query: z.string() }),
      outputSchema: z.object({ videoId: z.string().nullable() }),
    },
    async ({ query }) => {
      // In a real scenario, this would call the YouTube Data API
      // For this example, we'll return a placeholder based on a simple lookup
      const queryLower = query.toLowerCase();
      if (queryLower.includes('bench press')) return { videoId: 'SCV_mIe3A-4' };
      if (queryLower.includes('lat pulldown')) return { videoId: '02_jM0h524A'};
      if (queryLower.includes('goblet squat')) return { videoId: 'v-m_Bq1a-5E' };
      if (queryLower.includes('overhead press')) return { videoId: '2yjwXTZQDDI' };
      if (queryLower.includes('bicep curl')) return { videoId: 'in7_gE_133I' };
      if (queryLower.includes('tricep extension')) return { videoId: 'n_163p4iKoc' };
      if (queryLower.includes('deadlift')) return { videoId: 'wjsU10G1_iU' };
      if (queryLower.includes('leg press')) return { videoId: 's1pYtS6sN-8' };
      if (queryLower.includes('lateral raise')) return { videoId: '34E9_a4z9bA' };
      if (queryLower.includes('chest fly')) return { videoId: 'eozbU_aX6vI' };
      if (queryLower.includes('romanian deadlift')) return { videoId: '2z8JmcrW-3E' };
      if (queryLower.includes('pull up')) return { videoId: 'poyr8KenUFc' };
      return { videoId: null };
    }
  );

const prompt = ai.definePrompt({
  name: 'findExerciseVideoPrompt',
  input: { schema: FindExerciseVideoInputSchema },
  output: { schema: FindExerciseVideoOutputSchema },
  prompt: `Find a YouTube video for the exercise: {{{exerciseName}}}. Only use the provided tools.`,
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
