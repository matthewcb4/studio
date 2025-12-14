'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Check, X, Loader2 } from 'lucide-react';
import { useVoiceInput, isSpeechRecognitionSupported } from '@/hooks/use-voice-input';
import { cn } from '@/lib/utils';

type VoiceLogStep = 'weight' | 'reps' | 'confirm';

interface VoiceLogModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    exerciseName: string;
    unit?: 'reps' | 'reps-only' | 'bodyweight' | 'seconds';
    currentSet: number;
    totalSets: number;
    onComplete: (data: { weight: number; reps: number }) => void;
}

export function VoiceLogModal({
    open,
    onOpenChange,
    exerciseName,
    unit = 'reps',
    currentSet,
    totalSets,
    onComplete,
}: VoiceLogModalProps) {
    const [step, setStep] = useState<VoiceLogStep>('weight');
    const [weight, setWeight] = useState<number | null>(null);
    const [reps, setReps] = useState<number | null>(null);

    const isSupported = isSpeechRecognitionSupported();

    // Determine if we need weight input
    const needsWeight = unit === 'reps';

    const voice = useVoiceInput({
        onResult: (transcript, number) => {
            if (number !== null) {
                if (step === 'weight') {
                    setWeight(number);
                    // Auto-advance to reps after a short delay
                    setTimeout(() => {
                        setStep('reps');
                    }, 500);
                } else if (step === 'reps') {
                    setReps(number);
                    // Auto-advance to confirm
                    setTimeout(() => {
                        setStep('confirm');
                    }, 500);
                }
            }
        },
        timeoutMs: 6000,
    });

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            // For bodyweight/reps-only, skip weight step
            if (!needsWeight) {
                setStep('reps');
                setWeight(0);
            } else {
                setStep('weight');
                setWeight(null);
            }
            setReps(null);
            voice.reset();
        }
    }, [open, needsWeight]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleStartListening = useCallback(() => {
        voice.startListening();
    }, [voice]);

    const handleConfirm = useCallback(() => {
        if (weight !== null && reps !== null) {
            onComplete({ weight, reps });
            onOpenChange(false);
        }
    }, [weight, reps, onComplete, onOpenChange]);

    const handleCancel = useCallback(() => {
        voice.stopListening();
        onOpenChange(false);
    }, [voice, onOpenChange]);

    const handleBack = useCallback(() => {
        if (step === 'reps') {
            setStep('weight');
            setReps(null);
        } else if (step === 'confirm') {
            setStep('reps');
        }
        voice.reset();
    }, [step, voice]);

    const getPromptText = () => {
        switch (step) {
            case 'weight':
                return 'What weight?';
            case 'reps':
                return 'How many reps?';
            case 'confirm':
                return 'Confirm?';
        }
    };

    const getCurrentValue = () => {
        if (step === 'weight') {
            return voice.extractedNumber ?? weight;
        }
        if (step === 'reps') {
            return voice.extractedNumber ?? reps;
        }
        return null;
    };

    if (!isSupported) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Voice Input Unavailable</DialogTitle>
                        <DialogDescription>
                            Voice input is not supported in this browser. Please use Chrome, Edge, or Safari for voice logging.
                        </DialogDescription>
                    </DialogHeader>
                    <Button onClick={() => onOpenChange(false)}>Close</Button>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-center">{exerciseName}</DialogTitle>
                    <DialogDescription className="text-center">
                        Set {currentSet} of {totalSets}
                    </DialogDescription>
                </DialogHeader>

                {step === 'confirm' ? (
                    <div className="py-6 space-y-6">
                        <div className="text-center space-y-2">
                            <div className="text-lg text-muted-foreground">Log this set?</div>
                            <div className="flex items-center justify-center gap-4">
                                {needsWeight && (
                                    <div className="text-center">
                                        <div className="text-3xl font-bold">{weight}</div>
                                        <div className="text-sm text-muted-foreground">lbs</div>
                                    </div>
                                )}
                                <div className="text-2xl text-muted-foreground">×</div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold">{reps}</div>
                                    <div className="text-sm text-muted-foreground">reps</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={handleBack}>
                                <X className="w-4 h-4 mr-2" />
                                Redo
                            </Button>
                            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleConfirm}>
                                <Check className="w-4 h-4 mr-2" />
                                Log Set
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="py-6 space-y-6">
                        {/* Prompt */}
                        <div className="text-center">
                            <div className="text-2xl font-semibold mb-2">{getPromptText()}</div>

                            {/* Current value display */}
                            <div className="h-20 flex items-center justify-center">
                                {voice.isListening ? (
                                    <div className="text-center">
                                        {getCurrentValue() !== null ? (
                                            <div className="text-5xl font-bold text-green-500 animate-pulse">
                                                {getCurrentValue()}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span>Listening...</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-5xl font-bold text-muted-foreground/30">
                                        {getCurrentValue() ?? '—'}
                                    </div>
                                )}
                            </div>

                            {/* Previous values */}
                            {step === 'reps' && weight !== null && needsWeight && (
                                <div className="text-sm text-muted-foreground">
                                    Weight: {weight} lbs
                                </div>
                            )}
                        </div>

                        {/* Microphone button */}
                        <div className="flex justify-center">
                            <Button
                                size="lg"
                                variant={voice.isListening ? 'destructive' : 'default'}
                                className={cn(
                                    "w-20 h-20 rounded-full",
                                    voice.isListening && "animate-pulse"
                                )}
                                onClick={voice.isListening ? voice.stopListening : handleStartListening}
                            >
                                {voice.isListening ? (
                                    <MicOff className="w-8 h-8" />
                                ) : (
                                    <Mic className="w-8 h-8" />
                                )}
                            </Button>
                        </div>

                        {/* Error message */}
                        {voice.error && (
                            <div className="text-center text-sm text-destructive">
                                {voice.error}
                            </div>
                        )}

                        {/* Transcript (for debugging/feedback) */}
                        {voice.transcript && (
                            <div className="text-center text-sm text-muted-foreground">
                                Heard: "{voice.transcript}"
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2">
                            {step === 'reps' && (
                                <Button variant="ghost" onClick={handleBack}>
                                    Back
                                </Button>
                            )}
                            <Button variant="outline" className="flex-1" onClick={handleCancel}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
