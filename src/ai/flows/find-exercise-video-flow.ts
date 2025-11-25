
'use server';
/**
 * @fileoverview A utility for finding exercise tutorial videos on YouTube.
 *
 * - findExerciseVideo - A function that searches YouTube for relevant exercise videos.
 * - FindExerciseVideoInput - The input type for the findExerciseVideo function.
 * - FindExerciseVideoOutput - The return type for the findExerciseVideo function.
 */

import type { z } from 'zod';
import type {YouTubeSearchListResponse, YouTubeSearchResult} from '@/lib/youtube-types';

const FindExerciseVideoInputSchema = {
  exerciseName: ""
};
export type FindExerciseVideoInput = typeof FindExerciseVideoInputSchema;


const VideoSchema = {
    videoId: "",
    title: "",
    thumbnailUrl: "",
};

const FindExerciseVideoOutputSchema = {
  videos: [VideoSchema],
};
export type FindExerciseVideoOutput = typeof FindExerciseVideoOutputSchema;


export async function findExerciseVideo(input: FindExerciseVideoInput): Promise<FindExerciseVideoOutput> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        throw new Error("YOUTUBE_API_KEY environment variable not set.");
    }
    
    const query = `how to do ${input.exerciseName} tutorial`;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoDuration=short&maxResults=10&key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data: YouTubeSearchListResponse = await response.json();

        if (data.items) {
            const videos = data.items.map((item: YouTubeSearchResult) => ({
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
