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


export async function findExerciseVideo(input: FindExerciseVideoInput): Promise<FindExerciseVideoOutput> {
    return findExerciseVideoFlow(input);
}

const prompt = ai.definePrompt({
    name: 'exerciseVideoPrompt',
    input: { schema: FindExerciseVideoInputSchema },
    output: { schema: FindExerciseVideoOutputSchema },
    prompt: `You are a YouTube search expert specializing in fitness content.
    
    Find 8 relevant YouTube Shorts that demonstrate the proper form for the exercise: "{{{exerciseName}}}".

    For each video, provide the video ID, a concise title, and the URL for a standard quality thumbnail.
    The search query would likely be "how to do a {{{exerciseName}}} #shorts".
    
    Only return YouTube Short videos. Ensure the video IDs are exactly 11 characters long.
    An example thumbnail URL is "https://i.ytimg.com/vi/<VIDEO_ID>/sddefault.jpg".
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
        return output!;
    }
);
