import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { text, voiceName, languageCode } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        // Use the existing GENAI key (common practice in this repo) 
        // or fallback to others if needed.
        const apiKey = process.env.GOOGLE_GENAI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'Server configuration error: Missing API Key' }, { status: 500 });
        }

        const endpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

        // DEBUG: Log key prefix to help identify which key is being used
        const keyPrefix = apiKey.substring(0, 10);
        console.log(`TTS: Using API Key starting with: ${keyPrefix}...`);

        const requestBody = {
            input: { text },
            voice: {
                languageCode: languageCode || 'en-US',
                // Default to a nice Neural2 voice if not specified
                name: voiceName || 'en-US-Neural2-J', // 'en-US-Neural2-J' is a popular male voice, 'en-US-Neural2-C' is female
            },
            audioConfig: {
                audioEncoding: 'MP3',
                effectsProfileId: ['small-bluetooth-speaker-class-device'], // Optimizes for mobile speakers
                pitch: 0,
                speakingRate: 1.0,
            },
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("TTS API Error - Full Details:", JSON.stringify(errorData, null, 2));
            console.error(`TTS: Failed with key prefix: ${keyPrefix}...`);
            return NextResponse.json({ error: errorData.error?.message || 'TTS API Failed', details: errorData }, { status: response.status });
        }

        const data = await response.json();

        // Google API returns { audioContent: "base64String" }
        return NextResponse.json({ audioContent: data.audioContent });

    } catch (error) {
        console.error("TTS Route Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
