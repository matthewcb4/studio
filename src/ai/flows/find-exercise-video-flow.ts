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

const VideoSchema = z.object({
    videoId: z.string().length(11).describe("The 11-character YouTube video ID."),
    title: z.string().describe("The title of the YouTube video."),
    thumbnailUrl: z.string().url().describe("The URL of the video thumbnail image."),
});

const FindExerciseVideoOutputSchema = z.object({
  videos: z.array(VideoSchema).describe("A list of plausible YouTube short videos for the exercise."),
});
export type FindExerciseVideoOutput = z.infer<typeof FindExerciseVideoOutputSchema>;


const PromptOutputSchema = z.object({
  videos: z.array(z.object({
    videoId: z.string().length(11).describe("The 11-character YouTube video ID."),
    title: z.string().describe("The title of the YouTube video."),
  })).describe("A list of plausible YouTube short videos for the exercise."),
});


export async function findExerciseVideo(input: FindExerciseVideoInput): Promise<FindExerciseVideoOutput> {
    return findExerciseVideoFlow(input);
}

const prompt = ai.definePrompt({
    name: 'exerciseVideoPrompt',
    input: { schema: FindExerciseVideoInputSchema },
    output: { schema: PromptOutputSchema },
    prompt: `You are a YouTube search expert specializing in fitness content.
    
    Find 8 relevant YouTube Shorts that demonstrate the proper form for the exercise: "{{{exerciseName}}}".

    For each video, provide only the video ID and a concise title.
    The search query would likely be "how to do a {{{exerciseName}}} #shorts".
    
    Only return YouTube Short videos. Ensure the video IDs are exactly 11 characters long.
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
          return { videos: [] };
        }

        const videosWithThumbnails = output.videos.map(video => ({
          ...video,
          thumbnailUrl: `https://i.ytimg.com/vi/${video.videoId}/sddefault.jpg`,
        }));

        return { videos: videosWithThumbnails };
    }
);
