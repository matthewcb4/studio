"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";

interface NumberStepperProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    suffix?: string;
    className?: string;
    size?: 'default' | 'large';
}

export function NumberStepper({
    value,
    onChange,
    min = 0,
    max = 500,
    step = 1,
    label,
    suffix,
    className,
    size = 'default',
}: NumberStepperProps) {
    const [isHolding, setIsHolding] = useState<'inc' | 'dec' | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const increment = useCallback(() => {
        onChange(Math.min(max, value + step));
    }, [onChange, max, value, step]);

    const decrement = useCallback(() => {
        onChange(Math.max(min, value - step));
    }, [onChange, min, value, step]);

    // Handle hold-to-repeat
    useEffect(() => {
        if (isHolding) {
            timeoutRef.current = setTimeout(() => {
                intervalRef.current = setInterval(() => {
                    if (isHolding === 'inc') increment();
                    else decrement();
                }, 80);
            }, 300);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [isHolding, increment, decrement]);

    const handleStart = (direction: 'inc' | 'dec') => {
        setIsHolding(direction);
        if (direction === 'inc') increment();
        else decrement();
    };

    const handleEnd = () => {
        setIsHolding(null);
    };

    const buttonSize = size === 'large' ? "w-14 h-14" : "w-10 h-10";
    const iconSize = size === 'large' ? "w-8 h-8" : "w-5 h-5";
    const textSize = size === 'large' ? "text-4xl" : "text-2xl";

    return (
        <div className={cn("flex flex-col items-center gap-1", className)}>
            {label && (
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
            )}
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    className={cn(
                        "flex items-center justify-center rounded-full",
                        "bg-secondary hover:bg-secondary/80 active:bg-secondary/60",
                        "transition-all touch-none select-none active:scale-95",
                        value <= min && "opacity-30 pointer-events-none",
                        buttonSize
                    )}
                    onPointerDown={(e) => { e.preventDefault(); handleStart('dec'); }}
                    onPointerUp={handleEnd}
                    onPointerLeave={handleEnd}
                    onPointerCancel={handleEnd}
                    disabled={value <= min}
                    aria-label="Decrease"
                >
                    <Minus className={iconSize} />
                </button>

                <div className="flex items-baseline justify-center min-w-[100px]">
                    <span className={cn("font-bold tabular-nums tracking-tight", textSize)}>{value}</span>
                    {suffix && (
                        <span className="text-sm font-medium text-muted-foreground ml-1">{suffix}</span>
                    )}
                </div>

                <button
                    type="button"
                    className={cn(
                        "flex items-center justify-center rounded-full",
                        "bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground",
                        "transition-all touch-none select-none active:scale-95 shadow-lg shadow-primary/20",
                        value >= max && "opacity-30 pointer-events-none",
                        buttonSize
                    )}
                    onPointerDown={(e) => { e.preventDefault(); handleStart('inc'); }}
                    onPointerUp={handleEnd}
                    onPointerLeave={handleEnd}
                    onPointerCancel={handleEnd}
                    disabled={value >= max}
                    aria-label="Increase"
                >
                    <Plus className={iconSize} />
                </button>
            </div>
        </div>
    );
}

// Keep the HorizontalDial component as is, or remove if truly unused.
// For now, minimal compatibility or keep it if we want to fallback.
// (Omitting full HorizontalDial code here to rely on existing if I utilize replace_file correctly,
//  but I am replacing the END of the file so I need to preserve what I'm not deleting,
//  OR if I am replacing the export functions at the bottom.
//  Wait, the prompt says "EndLine: 414", which is the end of the file.
//  I need to be careful not to delete HorizontalDial if I don't intend to.
//  Actually, I will just export the Steppers and keep HorizontalDial above this block if I target correctly.
//  The Previous ViewFile showed HorizontalDial ends around line 400.
//  I will target lines 7-414 to replace the main component and the exports,
//  BUT HorizontalDial is in the middle (lines 118-400).
//  I should use MultiReplace to surgically edit NumberStepper and the exports,
//  OR just Replace the top and bottom.
//  Let's actually just replace the presets at the bottom and the NumberStepper component at the top,
//  leaving HorizontalDial alone in the middle? No, `replace_file_content` is a single contiguous block.
//
//  Let's use `multi_replace_file_content` to be safe and clean.)

// Actually, looking at `number-stepper.tsx`, `HorizontalDial` is defined there.
// If I use `replace_file_content` on the whole file, I have to provide the whole file.
// If I use it on a range, I must match exact content.

// Let's use `multi_replace_file_content`.
// 1. Update `NumberStepper` definition (lines 7-116).
// 2. Update `WeightStepper` and `DurationStepper` exports (lines 403-413).

