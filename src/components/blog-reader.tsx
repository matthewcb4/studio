'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, Volume2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

interface BlogReaderProps {
    content: string;
    title: string;
}

const AI_VOICES = [
    { name: 'AI Male (J)', id: 'en-US-Neural2-J' },
    { name: 'AI Female (C)', id: 'en-US-Neural2-C' },
    { name: 'AI Female (H)', id: 'en-US-Neural2-H' },
    { name: 'AI Male (I)', id: 'en-US-Neural2-I' },
    { name: 'Studio Male (D)', id: 'en-US-Studio-M' },
    { name: 'Studio Female (O)', id: 'en-US-Studio-O' },
];

export function BlogReader({ content, title }: BlogReaderProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [rate, setRate] = useState(1);
    const rateRef = useRef(1);

    // Default to the first high-quality voice
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>(AI_VOICES[0].id);
    const selectedVoiceRef = useRef<string>(AI_VOICES[0].id);

    // Queue state
    const [sentences, setSentences] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Audio Element Ref
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Sync state to refs
    useEffect(() => {
        selectedVoiceRef.current = selectedVoiceId;
    }, [selectedVoiceId]);

    // 1. Prepare Text Chunks (Paragraph-based)
    useEffect(() => {
        if (!content) return;

        const clean = content
            .replace(/#{1,6} /g, '')
            .replace(/(\*\*|__)(.*?)\1/g, '$2')
            .replace(/(\*|_)(.*?)\1/g, '$2')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
            .replace(/> /g, '');

        // Split by double newlines (paragraphs) instead of sentences
        const paragraphs = clean.split(/\n\n+/);

        const chunks = [title, ...paragraphs]
            .map(s => s.trim().replace(/\n/g, ' ')) // Remove single newlines within paragraphs
            .filter(s => s.length > 0);

        setSentences(chunks);

        // Initialize Audio Element
        if (!audioRef.current) {
            audioRef.current = new Audio();
        }
    }, [content, title]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
            }
        };
    }, []);

    // 2. Playback Logic (Buffer & Play)
    const playSentence = async (index: number) => {
        if (index >= sentences.length) {
            setIsPlaying(false);
            setIsPaused(false);
            setCurrentIndex(0);
            return;
        }

        // Ensure audio ref exists
        if (!audioRef.current) audioRef.current = new Audio();
        const audio = audioRef.current;

        try {
            setIsLoadingAudio(true);
            setHasError(false);

            const text = sentences[index];

            // Call our filtered API
            const res = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    voiceName: selectedVoiceRef.current,
                    languageCode: 'en-US'
                })
            });

            if (!res.ok) throw new Error('TTS API Failed');

            const data = await res.json();
            if (!data.audioContent) throw new Error('No audio content');

            // Decode Base64
            const audioSrc = `data:audio/mp3;base64,${data.audioContent}`;
            audio.src = audioSrc;

            // CRITICAL FIX: Use ref for rate to ensure latest value is used during recursion
            audio.playbackRate = rateRef.current;

            // Setup Listeners BEFORE playing
            audio.onended = () => {
                const next = index + 1;
                setCurrentIndex(next);
                // Tiny delay to prevent blocking
                setTimeout(() => playSentence(next), 50);
            };

            audio.onerror = (e) => {
                console.error("Audio Playback Error", e);
                setHasError(true);
                // Try skip?
                const next = index + 1;
                setCurrentIndex(next);
                playSentence(next);
            };

            await audio.play();
            setIsLoadingAudio(false);

        } catch (err) {
            console.error("TTS Fetch Error", err);
            setHasError(true);
            setIsLoadingAudio(false);
            setIsPlaying(false);
        }
    };

    const handlePlay = () => {
        // Resume if paused
        if (isPaused && audioRef.current) {
            audioRef.current.play();
            // Ensure rate is reapplied on resume
            audioRef.current.playbackRate = rateRef.current;
            setIsPlaying(true);
            setIsPaused(false);
            return;
        }

        // Pause if playing
        if (isPlaying && audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
            setIsPaused(true);
            return;
        }

        // New Play
        setIsPlaying(true);
        playSentence(currentIndex);
    };

    const handleStop = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentIndex(0);
    };

    const handleRateChange = (newRate: number) => {
        setRate(newRate);
        rateRef.current = newRate; // Update ref!
        if (audioRef.current) {
            audioRef.current.playbackRate = newRate;
        }
    };

    const handleVoiceChange = (newVoice: string) => {
        setSelectedVoiceId(newVoice);
        // Restart current sentence with new voice if playing
        if (isPlaying) {
            if (audioRef.current) audioRef.current.pause();
            setTimeout(() => playSentence(currentIndex), 200);
        }
    };

    return (
        <div className="flex flex-col gap-3 p-4 bg-secondary/30 rounded-lg border border-border/50 mb-6 transition-all hover:bg-secondary/40">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2.5 rounded-full transition-all duration-300",
                        isPlaying ? "bg-primary text-primary-foreground shadow-lg scale-105" : "bg-muted text-muted-foreground"
                    )}>
                        {isLoadingAudio ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Volume2 className={cn("h-5 w-5", isPlaying && "animate-pulse")} />
                        )}
                    </div>
                    <div>
                        <span className="text-sm font-semibold block text-foreground">
                            {isLoadingAudio ? "Generating Audio..." : "Read Aloud"}
                        </span>
                        {hasError && <span className="text-[10px] text-destructive font-medium">Network Error - Check connection</span>}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant={isPlaying ? "default" : "secondary"}
                        size="sm"
                        onClick={handlePlay}
                        disabled={isLoadingAudio}
                        className={cn("h-10 w-10 rounded-full shadow-sm transition-all", isPlaying && "ring-2 ring-primary/20")}
                    >
                        {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 ml-0.5 fill-current" />}
                    </Button>

                    {(isPlaying || isPaused) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleStop}
                            className="h-10 w-10 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                            <Square className="h-4 w-4 fill-current" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Controls (Voice & Speed) */}
            <div className={cn(
                "grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 transition-all duration-500 ease-in-out",
                (isPlaying || isPaused || isLoadingAudio) ? "opacity-100 max-h-[200px]" : "opacity-100 max-h-[200px]" // Always show controls now for discovery
            )}>
                {/* Voice Selector */}
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold ml-1">AI Voice</label>
                    <select
                        className="w-full h-9 text-sm rounded-md border border-input bg-background/50 hover:bg-background transition-colors px-3 py-1 shadow-sm focus:ring-1 focus:ring-primary"
                        value={selectedVoiceId}
                        onChange={(e) => handleVoiceChange(e.target.value)}
                    >
                        {AI_VOICES.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                    </select>
                </div>

                {/* Speed Control */}
                {(isPlaying || isPaused) && (
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Speed</label>
                            <span className="text-[10px] font-mono text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded">{rate}x</span>
                        </div>
                        <Slider
                            value={[rate]}
                            min={0.5}
                            max={2}
                            step={0.1}
                            onValueChange={(vals) => handleRateChange(vals[0])}
                            className="py-1"
                        />
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            {isPlaying && sentences.length > 0 && (
                <div className="h-1.5 w-full bg-secondary mt-1 rounded-full overflow-hidden shadow-inner">
                    <div
                        className="h-full bg-primary transition-all duration-300 ease-linear shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                        style={{ width: `${(currentIndex / sentences.length) * 100}%` }}
                    />
                </div>
            )}
        </div>
    );
}
