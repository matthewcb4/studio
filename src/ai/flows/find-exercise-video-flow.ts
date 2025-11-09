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
      if (queryLower.includes('bench press')) return { videoId: '0Fzshb9T38A' };
      if (queryLower.includes('lat pulldown')) return { videoId: 'u_i-3tC4J_o' };
      if (queryLower.includes('goblet squat')) return { videoId: '5b-yC8aD_9Q' };
      if (queryLower.includes('overhead press')) return { videoId: 'M2-iA6S7-DA' };
      if (queryLower.includes('bicep curl')) return { videoId: '1n_n3G-Y7eM' };
      if (queryLower.includes('tricep extension')) return { videoId: 'JcwjC4_i3-k' };
      if (queryLower.includes('deadlift')) return { videoId: '_FkbD0FhgVE' };
      if (queryLower.includes('leg press')) return { videoId: 's1pYtS6sN-8' };
      if (queryLower.includes('lateral raise')) return { videoId: '3fiHn2fT-i0' };
      if (queryLower.includes('chest fly')) return { videoId: '2z0o2v1i-vM' };
      if (queryLower.includes('romanian deadlift')) return { videoId: 'kdbidvT-I8s' };
      if (queryLower.includes('pull up')) return { videoId: 'poyr8KenUFc' }; // This one seems to be a regular video, but good.
      return { videoId: null };
    }
  );

const prompt = ai.definePrompt({
  name: 'findExerciseVideoPrompt',
  input: { schema: FindExerciseVideoInputSchema },
  output: { schema: FindExerciseVideoOutputSchema },
  prompt: `Find a YouTube Short for the exercise: {{{exerciseName}}}. The search query for the tool should be "how to do a {{{exerciseName}}} #shorts". Only use the provided tools.`,
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
