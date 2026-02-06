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
    const [hasError, setHasError] = useState(false);
    const [rate, setRate] = useState(1);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");

    // Queue state
    const [sentences, setSentences] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // 1. Voice Loading & Polling (Fixes Android empty list)
    useEffect(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        setIsReady(true);

        const loadVoices = () => {
            const vs = window.speechSynthesis.getVoices();
            setVoices(vs);

            // Smart select default ONLY if user hasn't picked one
            if (vs.length > 0 && !selectedVoiceName) {
                const preferred =
                    vs.find(v => v.name.includes("Google US English")) ||
                    vs.find(v => v.name.includes("Natural") && v.lang.startsWith("en")) ||
                    vs.find(v => v.lang === "en-US" && !v.name.includes("Microsoft")) ||
                    vs.find(v => v.lang.startsWith("en"));

                // Don't force set if we want "System Default" to be an option, 
                // but setting a 'good' default is usually better than a robotic system default.
                // We'll leave it empty to start (System Default) unless we find a really good one?
                // Actually, user complained about robotic voice. Let's try to pick a good one.
                if (preferred) setSelectedVoiceName(preferred.name);
            }
        };

        loadVoices();

        // Listener
        window.speechSynthesis.onvoiceschanged = loadVoices;

        // Aggressive polling for Android/Mobile (sometimes onvoiceschanged doesn't fire)
        const intervalId = setInterval(() => {
            const vs = window.speechSynthesis.getVoices();
            if (vs.length > 0) {
                // If we found voices and existing list was empty, update!
                setVoices(prev => {
                    if (prev.length === 0) {
                        loadVoices();
                        return vs;
                    }
                    return prev;
                });
            }
        }, 500);

        // Stop polling after 5 seconds to save resources
        const timeoutId = setTimeout(() => {
            clearInterval(intervalId);
        }, 5000);

        return () => {
            window.speechSynthesis.cancel();
            window.speechSynthesis.onvoiceschanged = null;
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };
    }, []); // Run once on mount

    // 2. Prepare Text Chunks (Fixes text-too-long crashes)
    useEffect(() => {
        if (!content) return;

        const clean = content
            .replace(/#{1,6} /g, '')
            .replace(/(\*\*|__)(.*?)\1/g, '$2')
            .replace(/(\*|_)(.*?)\1/g, '$2')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
            .replace(/> /g, '')
            .replace(/\n\n/g, '. ')
            .replace(/\n/g, ' ');

        // Split by simple sentence delimiters. 
        // This isn't perfect NLP but good enough to keep chunks small.
        const chunkRaw = clean.match(/[^.!?]+[.!?]+["']?|[^.!?]+$/g);

        if (chunkRaw) {
            const chunks = [title, ...chunkRaw]
                .map(s => s.trim())
                .filter(s => s.length > 0);
            setSentences(chunks);
        } else {
            // Fallback if regex fails
            setSentences([title, clean]);
        }
    }, [content, title]);

    // 3. Playback Logic
    const speakSentence = (index: number) => {
        if (index >= sentences.length) {
            setIsPlaying(false);
            setIsPaused(false);
            setCurrentIndex(0);
            return;
        }

        // Cancel previous
        window.speechSynthesis.cancel();

        const text = sentences[index];
        const utterance = new SpeechSynthesisUtterance(text);

        // Voice selection
        if (selectedVoiceName) {
            const v = voices.find(val => val.name === selectedVoiceName);
            if (v) utterance.voice = v;
        }

        utterance.rate = rate;

        utterance.onend = () => {
            // Move to next
            const next = index + 1;
            setCurrentIndex(next);
            // Small delay between sentences sounds more natural
            setTimeout(() => {
                if (window.speechSynthesis.paused) return; // Don't continue if paused
                // Check if still playing logic holds (we can't easily check state in timeout closure effectively without ref, but play loop handles it)
                speakSentence(next);
            }, 50); // 50ms pause
        };

        utterance.onerror = (e) => {
            console.error("TTS Error", e);
            setHasError(true);
            // Try to skip to next even on error?
            // Often 'interrupted' error happens on specific cancel, which is fine.
            if (e.error !== 'interrupted') {
                // skip
                const next = index + 1;
                setCurrentIndex(next);
                speakSentence(next);
            }
        };

        utteranceRef.current = utterance;

        try {
            window.speechSynthesis.speak(utterance);
        } catch (err) {
            console.error("Speak Exception", err);
            setHasError(true);
        }
    };

    const handlePlay = () => {
        if (!isReady) return;
        setHasError(false);

        // 1. Resume
        if (isPaused) {
            window.speechSynthesis.resume();
            setIsPlaying(true);
            setIsPaused(false);
            return;
        }

        // 2. Pause
        if (isPlaying) {
            window.speechSynthesis.pause();
            setIsPlaying(false);
            setIsPaused(true);
            return;
        }

        // 3. Start New
        setIsPlaying(true);

        // Refresh voices just in case (Android fix)
        if (voices.length === 0) {
            const vs = window.speechSynthesis.getVoices();
            if (vs.length > 0) setVoices(vs);
        }

        speakSentence(currentIndex);
    };

    const handleStop = () => {
        window.speechSynthesis.cancel(); // Effectively stops the onend chain too (mostly)
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentIndex(0);
    };

    return (
        <div className="flex flex-col gap-2 p-3 bg-secondary/30 rounded-lg border border-border/50 mb-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={cn("p-2 rounded-full transition-colors", isPlaying ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                        <Volume2 className={cn("h-4 w-4", isPlaying && "animate-pulse")} />
                    </div>
                    <div>
                        <span className="text-sm font-medium block">Read Aloud</span>
                        {hasError && <span className="text-[10px] text-destructive leading-tight">Playback Error - Try System Default force</span>}
                    </div>
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
                                className="flex-1 h-7 text-xs rounded-md border border-input bg-background px-2 py-1 max-w-[200px]"
                                value={selectedVoiceName}
                                onChange={(e) => {
                                    setSelectedVoiceName(e.target.value);
                                    // If playing, we should restart current sentence to apply effective change
                                    if (isPlaying) {
                                        window.speechSynthesis.cancel();
                                        setTimeout(() => speakSentence(currentIndex), 100);
                                    }
                                }}
                            >
                                <option value="">System Default</option>
                                {voices
                                    .filter(v => v.lang.startsWith('en'))
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

            {/* Progress Bar (Optional but nice for debugging/visuals) */}
            {isPlaying && sentences.length > 0 && (
                <div className="h-1 w-full bg-secondary mt-2 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary/50 transition-all duration-300"
                        style={{ width: `${(currentIndex / sentences.length) * 100}%` }}
                    />
                </div>
            )}
        </div>
    );
}
