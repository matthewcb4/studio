'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// Check if Web Speech API is supported
export const isSpeechRecognitionSupported = (): boolean => {
    if (typeof window === 'undefined') return false;
    return !!(
        (window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
            .SpeechRecognition ||
        (window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
            .webkitSpeechRecognition
    );
};

// Word-to-number mapping for common spoken numbers
const wordToNumber: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
    sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};

// Extract a number from spoken text
export const extractNumber = (transcript: string): number | null => {
    if (!transcript) return null;

    const cleaned = transcript.toLowerCase().trim();

    // Try direct numeric parsing first (e.g., "185", "8")
    const directMatch = cleaned.match(/[\d.]+/);
    if (directMatch) {
        const parsed = parseFloat(directMatch[0]);
        if (!isNaN(parsed)) return parsed;
    }

    // Handle spoken numbers like "one eighty five" or "twenty five"
    const words = cleaned.split(/\s+/);
    let result = 0;
    let currentNumber = 0;

    for (const word of words) {
        if (wordToNumber[word] !== undefined) {
            const num = wordToNumber[word];
            if (num === 100) {
                // "one hundred" = 1 * 100 = 100
                currentNumber = (currentNumber || 1) * 100;
            } else if (num >= 20) {
                // "twenty", "thirty", etc.
                currentNumber += num;
            } else {
                // Single digits or teens
                currentNumber += num;
            }
        }
    }

    result = currentNumber;

    // Special case: "one eighty five" should be 185
    // Pattern: single digit + two-digit number
    const splitPattern = cleaned.match(/^(one|two|three|four|five|six|seven|eight|nine)\s+(eighty|ninety|seventy|sixty|fifty|forty|thirty|twenty)?(\s*(one|two|three|four|five|six|seven|eight|nine))?/);
    if (splitPattern) {
        const hundreds = wordToNumber[splitPattern[1]] || 0;
        const tens = splitPattern[2] ? wordToNumber[splitPattern[2]] || 0 : 0;
        const ones = splitPattern[4] ? wordToNumber[splitPattern[4]] || 0 : 0;
        if (tens > 0) {
            result = hundreds * 100 + tens + ones;
        }
    }

    return result > 0 ? result : null;
};

interface UseVoiceInputOptions {
    onResult?: (transcript: string, number: number | null) => void;
    onError?: (error: string) => void;
    timeoutMs?: number; // Auto-stop after this many ms of silence
}

interface UseVoiceInputReturn {
    isListening: boolean;
    isSupported: boolean;
    transcript: string;
    extractedNumber: number | null;
    error: string | null;
    startListening: () => void;
    stopListening: () => void;
    reset: () => void;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
    const { onResult, onError, timeoutMs = 5000 } = options;

    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [extractedNumber, setExtractedNumber] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isSupported = isSpeechRecognitionSupported();

    const clearTimeout = useCallback(() => {
        if (timeoutRef.current) {
            globalThis.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const stopListening = useCallback(() => {
        clearTimeout();
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsListening(false);
    }, [clearTimeout]);

    const startListening = useCallback(() => {
        if (!isSupported) {
            const errorMsg = 'Speech recognition is not supported in this browser.';
            setError(errorMsg);
            onError?.(errorMsg);
            return;
        }

        // Reset state
        setTranscript('');
        setExtractedNumber(null);
        setError(null);

        // Create recognition instance
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SpeechRecognitionClass =
            (window as any).SpeechRecognition ||
            (window as any).webkitSpeechRecognition;

        if (!SpeechRecognitionClass) {
            setError('Speech recognition not available.');
            return;
        }

        const recognition = new SpeechRecognitionClass();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            // Start timeout
            timeoutRef.current = globalThis.setTimeout(() => {
                stopListening();
            }, timeoutMs);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
            const result = event.results[event.results.length - 1];
            const currentTranscript = result[0].transcript;
            setTranscript(currentTranscript);

            const number = extractNumber(currentTranscript);
            setExtractedNumber(number);

            // If we got a final result with a number, auto-stop
            if (result.isFinal && number !== null) {
                clearTimeout();
                onResult?.(currentTranscript, number);
                stopListening();
            }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
            const errorMsg = event.error === 'no-speech'
                ? 'No speech detected. Try again.'
                : `Speech error: ${event.error}`;
            setError(errorMsg);
            onError?.(errorMsg);
            stopListening();
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        try {
            recognition.start();
        } catch (err) {
            const errorMsg = 'Failed to start speech recognition.';
            setError(errorMsg);
            onError?.(errorMsg);
        }
    }, [isSupported, onResult, onError, timeoutMs, stopListening, clearTimeout]);

    const reset = useCallback(() => {
        stopListening();
        setTranscript('');
        setExtractedNumber(null);
        setError(null);
    }, [stopListening]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearTimeout();
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [clearTimeout]);

    return {
        isListening,
        isSupported,
        transcript,
        extractedNumber,
        error,
        startListening,
        stopListening,
        reset,
    };
}
