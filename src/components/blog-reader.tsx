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
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        // Check browser support
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            setIsReady(true);

            // Cleanup on unmount
            return () => {
                window.speechSynthesis.cancel();
            };
        }
    }, []);

    const cleanText = (markdown: string) => {
        return markdown
            .replace(/#{1,6} /g, '') // Remove headers
            .replace(/(\*\*|__)(.*?)\1/g, '$2') // Remove bold
            .replace(/(\*|_)(.*?)\1/g, '$2') // Remove italic
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
            .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // Remove code
            .replace(/> /g, '') // Remove blockquotes
            .replace(/\n\n/g, '. ') // Replace double newlines with pauses
            .replace(/\n/g, ' '); // Replace single newlines with spaces
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

        // Attempt to pick a good voice
        const voices = window.speechSynthesis.getVoices();
        // Prefer "Google US English" or standard "Samantha" (iOS)
        const preferredVoice = voices.find(v => v.name.includes('Google US English')) ||
            voices.find(v => v.lang === 'en-US' && !v.name.includes('Microsoft')) ||
            voices.find(v => v.lang === 'en-US');

        if (preferredVoice) utterance.voice = preferredVoice;
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

    if (!isReady) return null;

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

            {(isPlaying || isPaused) && (
                <div className="flex items-center gap-3 px-1 pt-1">
                    <span className="text-xs text-muted-foreground w-8">Speed</span>
                    <Slider
                        value={[rate]}
                        min={0.5}
                        max={2}
                        step={0.1}
                        onValueChange={(vals) => {
                            const newRate = vals[0];
                            setRate(newRate);
                            // Live update rate if supported (Chrome buggy, usually requires restart)
                            if (window.speechSynthesis.speaking && !isPaused) {
                                // For broad compatibility, we might just set state. 
                                // Cancelling and restarting loses position without complex logic.
                                // We'll trust the user to pause/play to reset play rate if needed 
                                // or just accept it applies to next utterance for simple web speech.
                                // HOWEVER, some browsers allow dynamic updates.
                            }
                        }}
                        className="flex-1"
                    />
                    <span className="text-xs font-mono w-8 text-right">{rate}x</span>
                </div>
            )}
        </div>
    );
}
