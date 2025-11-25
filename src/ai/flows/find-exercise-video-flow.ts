
'use server';
/**
 * @fileoverview A utility for finding exercise tutorial videos on YouTube.
 *
 * - findExerciseVideo - A function that searches YouTube for relevant exercise videos.
 * - FindExerciseVideoInput - The input type for the findExerciseVideo function.
 * - FindExerciseVideoOutput - The return type for the findExerciseVideo function.
 */

import { z } from 'zod';

const FindExerciseVideoInputSchema = z.object({
  exerciseName: z.string().describe("The name of the exercise to search for."),
});
export type FindExerciseVideoInput = z.infer<typeof FindExerciseVideoInputSchema>;


const VideoSchema = z.object({
    videoId: z.string().describe("The 11-character YouTube video ID."),
    title: z.string().describe("The title of the YouTube video."),
    thumbnailUrl: z.string().describe("The URL of the video's thumbnail image."),
});

const FindExerciseVideoOutputSchema = z.object({
  videos: z.array(VideoSchema).describe("An array of relevant YouTube videos."),
});
export type FindExerciseVideoOutput = z.infer<typeof FindExerciseVideoOutputSchema>;


export async function findExerciseVideo(input: FindExerciseVideoInput): Promise<FindExerciseVideoOutput> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        throw new Error("YOUTUBE_API_KEY environment variable not set.");
    }
    
    const query = `how to do ${input.exerciseName} tutorial`;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoDuration=short&maxResults=10&key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.items) {
            const videos = data.items.map((item: any) => ({
                videoId: item.id.videoId,
                title: item.snippet.title,
                thumbnailUrl: item.snippet.thumbnails.high.url,
            }));
            return { videos };
        } else {
            return { videos: [] };
        }
    } catch (error) {
        console.error('YouTube API search failed:', error);
        return { videos: [] };
    }
}
