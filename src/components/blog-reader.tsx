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

export function BlogReader({ content, title }: BlogReaderProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [rate, setRate] = useState(1);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        setIsReady(true);

        const loadVoices = () => {
            const vs = window.speechSynthesis.getVoices();
            setVoices(vs);

            // Smart select default
            if (vs.length > 0) {
                const preferred =
                    vs.find(v => v.name.includes("Google US English")) ||
                    vs.find(v => v.name.includes("Natural") && v.lang.startsWith("en")) ||
                    vs.find(v => v.lang === "en-US" && !v.name.includes("Microsoft")) || // Microsoft's default web voices are often robotic 'Mark'/'David'
                    vs.find(v => v.lang.startsWith("en"));

                if (preferred) setSelectedVoiceName(preferred.name);
            }
        };

        loadVoices();

        // Chrome loads voices asynchronously
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            window.speechSynthesis.cancel();
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    const cleanText = (markdown: string) => {
        return markdown
            .replace(/#{1,6} /g, '')
            .replace(/(\*\*|__)(.*?)\1/g, '$2')
            .replace(/(\*|_)(.*?)\1/g, '$2')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
            .replace(/> /g, '')
            .replace(/\n\n/g, '. ')
            .replace(/\n/g, ' ');
    };

    const handlePlay = () => {
        if (!isReady) return;

        if (isPaused) {
            window.speechSynthesis.resume();
            setIsPlaying(true);
            setIsPaused(false);
            return;
        }

        if (isPlaying) {
            window.speechSynthesis.pause();
            setIsPlaying(false);
            setIsPaused(true);
            return;
        }

        const textToRead = `${title}. ${cleanText(content)}`;
        const utterance = new SpeechSynthesisUtterance(textToRead);

        // Apply selected voice
        const voice = voices.find(v => v.name === selectedVoiceName);
        if (voice) utterance.voice = voice;

        utterance.rate = rate;
        utterance.pitch = 1;

        utterance.onend = () => {
            setIsPlaying(false);
            setIsPaused(false);
        };

        utterance.onerror = (e) => {
            console.error('TTS Error:', e);
            setIsPlaying(false);
            setIsPaused(false);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
    };

    const handleStop = () => {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        setIsPaused(false);
    };

    return (
        <div className="flex flex-col gap-2 p-3 bg-secondary/30 rounded-lg border border-border/50 mb-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={cn("p-2 rounded-full transition-colors", isPlaying ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                        <Volume2 className={cn("h-4 w-4", isPlaying && "animate-pulse")} />
                    </div>
                    <span className="text-sm font-medium">Read Aloud</span>
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePlay}
                        className={cn("h-8 w-8 rounded-full", isPlaying && "text-primary")}
                    >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                    </Button>

                    {(isPlaying || isPaused) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleStop}
                            className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                        >
                            <Square className="h-3 w-3 fill-current" />
                        </Button>
                    )}
                </div>
            </div>

            {(isPlaying || isPaused || voices.length > 0) && (
                <div className="flex flex-col gap-2 px-1 pt-2">
                    {/* Voice Selection */}
                    {voices.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-12 flex-shrink-0">Voice</span>
                            <select
                                className="flex-1 h-7 text-xs rounded-md border border-input bg-background px-2 py-1"
                                value={selectedVoiceName}
                                onChange={(e) => {
                                    setSelectedVoiceName(e.target.value);
                                    // If playing, restart with new voice? ideally yes, but keeping it simple for now.
                                    // Usually users pick voice then play.
                                    if (isPlaying) {
                                        window.speechSynthesis.cancel();
                                        setTimeout(handlePlay, 100);
                                    }
                                }}
                            >
                                {voices
                                    .filter(v => v.lang.startsWith('en')) // Filter to English for UI cleanliness
                                    .map(v => (
                                        <option key={v.name} value={v.name}>
                                            {v.name.replace(/Google |Microsoft /, '')}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    )}

                    {/* Speed Control */}
                    {(isPlaying || isPaused) && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-12 flex-shrink-0">Speed</span>
                            <Slider
                                value={[rate]}
                                min={0.5}
                                max={2}
                                step={0.1}
                                onValueChange={(vals) => setRate(vals[0])}
                                className="flex-1"
                            />
                            <span className="text-xs font-mono w-8 text-right">{rate}x</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
