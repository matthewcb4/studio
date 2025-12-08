
'use server';
/**
 * @fileoverview A utility for finding exercise tutorial videos on YouTube.
 *
 * - findExerciseVideo - A function that searches YouTube for relevant exercise videos.
 * - FindExerciseVideoInput - The input type for the findExerciseVideo function.
 * - FindExerciseVideoOutput - The return type for the findExerciseVideo function.
 */

import type { YouTubeSearchListResponse, YouTubeSearchResult } from '@/lib/youtube-types';

export type FindExerciseVideoInput = {
    exerciseName: string;
};

type Video = {
    videoId: string;
    title: string;
    thumbnailUrl: string;
};

export type FindExerciseVideoOutput = {
    videos: Video[];
};


export async function findExerciseVideo(input: FindExerciseVideoInput): Promise<FindExerciseVideoOutput & { error?: string }> {
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
        console.error("YOUTUBE_API_KEY environment variable not set.");
        return { videos: [], error: "YouTube API not configured (Missing Key)" };
    }

    const query = `how to do ${input.exerciseName} tutorial`;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoDuration=short&maxResults=10&key=${apiKey}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            const text = await response.text();
            console.error(`YouTube API error: ${response.status} ${response.statusText}`, text);
            return { videos: [], error: `YouTube API Error: ${response.status}` };
        }

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
        return { videos: [], error: "Internal Server Error during Video Lookup" };
    }
}
